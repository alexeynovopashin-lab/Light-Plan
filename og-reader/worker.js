/* Читалка og:image — единственная задача: по присланной ссылке (Pinterest,
   Instagram, что угодно) прочитать метатег og:image и отдать байты картинки.
   Разбор — в docs/15_MOODBOARD.md, «Pinterest и Instagram → Про посредника —
   и почему он временный».

   Не хранит ничего и не пишет логов: страница и картинка проходят транзитом,
   от запроса до ответа, и не остаются нигде — ни в KV, ни в файле, ни в
   консоли. Это костыль веб-прототипа: в нативе `URLSession` делает то же
   самое с телефона напрямую, без посредника — CORS там нет.

   GET /?url=<ссылка, закодированная encodeURIComponent>
   → 200, байты картинки, Content-Type как у оригинала
   → 404, если og:image не нашёлся или сама картинка не отдалась
   → 400, если url отсутствует или не http(s)

   Разворачивается как есть: `wrangler deploy` из этой папки, либо через
   мастер настройки Cloudflare — код самодостаточен, секретов и привязок
   (KV, D1, Durable Objects) не требует. */

/* Ходим представившись честно, а не чужим именем: сервисы вроде Pinterest
   отдают og:image куда угодно нарочно — ради превью в мессенджерах, — и
   боты вроде facebookexternalhit тут не нужны, только запутывают лог того,
   к кому мы стучимся. */
const UA = "LightPlanLinkPreview/1.0 (+https://alexeynovopashin-lab.github.io/Light-Plan/)";

/* Страницы бывают огромными, а og:image почти всегда в первых строках
   <head>. Читаем потоково через HTMLRewriter и обрываем ответ, как только
   тег найден, — не ждём и не буферим тело целиком. */
function findOgImage(pageUrl) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };

    fetch(pageUrl, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      cf: { cacheTtl: 0 },
    }).then((res) => {
      if (!res.ok || !res.body) return finish(null);

      const rewriter = new HTMLRewriter().on(
        'meta[property="og:image"], meta[property="og:image:secure_url"], meta[name="twitter:image"]',
        {
          element(el) {
            if (done) return;
            const v = el.getAttribute("content");
            if (v) finish(v);
          },
        }
      );
      const rewritten = rewriter.transform(res);
      // Тянем поток сами: HTMLRewriter парсит по мере чтения, никто иначе не потребляет тело
      const reader = rewritten.body.getReader();
      const pump = () =>
        reader.read().then(({ done: d }) => {
          if (d) return finish(null);
          if (done) { try { reader.cancel(); } catch (e) {} return; }
          return pump();
        });
      pump().catch(() => finish(null));
    }).catch(() => finish(null));

    // Проценная разметка бывает без og:image вовсе — не ждём вечно
    setTimeout(() => finish(null), 8000);
  });
}

async function handleRequest(request) {
  const reqUrl = new URL(request.url);
  const target = reqUrl.searchParams.get("url");
  if (!target) return new Response("missing url", { status: 400 });

  let pageUrl;
  try {
    pageUrl = new URL(target);
    if (pageUrl.protocol !== "http:" && pageUrl.protocol !== "https:") throw new Error("scheme");
  } catch (e) {
    return new Response("bad url", { status: 400 });
  }

  const ogRaw = await findOgImage(pageUrl.href);
  if (!ogRaw) return new Response("no og:image", { status: 404 });

  let imgUrl;
  try {
    imgUrl = new URL(ogRaw, pageUrl).href;
  } catch (e) {
    return new Response("bad og:image", { status: 404 });
  }

  let imgRes;
  try {
    imgRes = await fetch(imgUrl, { headers: { "user-agent": UA }, redirect: "follow" });
  } catch (e) {
    return new Response("image fetch failed", { status: 404 });
  }
  if (!imgRes.ok || !imgRes.body) return new Response("image fetch failed", { status: 404 });

  const type = imgRes.headers.get("content-type") || "image/jpeg";
  if (!/^image\//.test(type)) return new Response("not an image", { status: 404 });

  return new Response(imgRes.body, {
    status: 200,
    headers: {
      "content-type": type,
      "access-control-allow-origin": "*",
      /* Сутки: превью Pinterest/Instagram меняются редко, а тянуть их
         заново на каждое открытие подборки — тратить чужой трафик впустую */
      "cache-control": "public, max-age=86400",
    },
  });
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS",
        },
      });
    }
    if (request.method !== "GET") return new Response("method not allowed", { status: 405 });
    try {
      return await handleRequest(request);
    } catch (e) {
      return new Response("error", { status: 500 });
    }
  },
};
