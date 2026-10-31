#!/usr/bin/env bash
# Страж натива: правка веба не должна сдвинуть ничего, что натив из веба берёт.
#
#   tools/native_guard.sh <папка натива> [база, по умолчанию origin/main]
#
# Натив читает веб в трёх видах (docs/web_unfreeze_plan.md, § «Что натив берёт»):
#   1. файлы целиком — должны совпадать с базой побайтно;
#   2. beta/index.html — вырезка по якорям: генераторы натива на базе и на
#      рабочей копии должны дать побайтно одно и то же;
#   3. живая страница беты (пары снимков, map_ref) — здесь не проверяется,
#      держится правилом: выключенный код next/ не трогает DOM и хранилище.
# Сравнение — на одной машине: с фикстурами Mac не сравниваем (другой node
# даёт другую последнюю цифру дробей, измерено 31.10).
set -u
NATIVE=${1:?папка натива (LightPlan)}
BASE=${2:-origin/main}
WEB=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
fail=0

# 1. Файлы, которые натив читает целиком
WHOLE="beta/lang.js beta/icons.js beta/sky.js beta/mapstyle.js beta/_seed_season.html
tools/shot.js tools/window_light.js tools/datecheck.js tools/langcheck.js tools/pointwords_check.js"
for f in $WHOLE; do
  if ! git -C "$WEB" diff --quiet "$BASE" -- "$f" 2>/dev/null; then
    echo "  НЕЛЬЗЯ: изменён $f (натив читает его целиком)"; fail=1
  fi
done

# 2. Генераторы натива на базе и на рабочей копии
mkdir -p "$TMP/base"
git -C "$WEB" archive "$BASE" beta tools | tar -x -C "$TMP/base"
run() {   # $1 = папка веба, $2 = куда писать
  local w=$1 o=$2; mkdir -p "$o"
  ( cd "$NATIVE" && export LIGHT_PLAN_WEB="$w" TZ=UTC
    node Tools/parity/generate.js --out "$o" --quiet >/dev/null 2>"$o/err.generate" || echo "generate exit=$?" >>"$o/exits"
    node Tools/parity/lang.js     --out "$o" --quiet >/dev/null 2>"$o/err.lang"     || echo "lang exit=$?" >>"$o/exits"
    node Tools/parity/domain.js   --out "$o" --quiet >/dev/null 2>"$o/err.domain"   || echo "domain exit=$?" >>"$o/exits"
    node Tools/parity/extract.js 2>&1 | grep -v "^эталон:" > "$o/blocks.txt" || echo "extract exit=$?" >>"$o/exits" )
}
run "$TMP/base" "$TMP/out.base"
run "$WEB" "$TMP/out.work"
for f in $(cd "$TMP/out.base" && find . -type f | sort); do
  if ! cmp -s "$TMP/out.base/$f" "$TMP/out.work/$f"; then
    echo "  РАСХОДИТСЯ: ${f#./}"; fail=1
  fi
done
for f in $(cd "$TMP/out.work" && find . -type f | sort); do
  [ -e "$TMP/out.base/$f" ] || { echo "  НОВОЕ: ${f#./}"; fail=1; }
done

n=$(cd "$TMP/out.work" && find . -name '*.json' | wc -l | tr -d ' ')
if [ $fail -eq 0 ]; then
  echo "натив не задет: $n фикстур и вырезка по якорям побайтно как на $BASE"
else
  echo "НАТИВ ЗАДЕТ — правку не пушить"; exit 1
fi
