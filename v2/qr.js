/* ============================================================
   QR — свой кодировщик, версии 1–10, режим байтов, уровень M
   ============================================================
   Зачем свой. Опросник показывают невесте прямо на встрече: она наводит
   телефон и открывает анкету у себя. Значит знак должен рисоваться в
   приложении, а приложение обязано работать без сети — оно PWA и живёт в
   самолётах и подвалах загсов. Готовый генератор либо просит сервер (тогда
   адрес утекает наружу и без сети не работает), либо тянется библиотекой с
   чужого узла (тогда не работает офлайн). Оба пути противоречат тому, ради
   чего опросник и сделан без сервера.

   Почему хватает версий 1–10 и уровня M. Кодируем не ответы, а исходящую
   ссылку на опросник — она короткая и постоянная по длине (около 70–80
   знаков). Версия 10 на уровне M держит 213 байт: запас четырёхкратный.
   Уровень M (≈15% восстановления) выбран против L намеренно — знак читают с
   чужого экрана под углом и бликом, и лишняя избыточность здесь дешевле
   повторной попытки.

   Числа, которые нельзя вывести: таблица блоков и точки совмещения взяты из
   стандарта (ISO/IEC 18004). Всё остальное — маски, формат, Рид-Соломон —
   считается, а не переписывается: списки констант, набранные руками, врут
   молча, и проверить их глазом нельзя.
   ============================================================ */
var QR = (function () {
  "use strict";

  /* ---------- Поле Галуа GF(256), примитивный полином 0x11D ---------- */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function mul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  /* Порождающий многочлен степени n — считаем, а не храним таблицей */
  function genPoly(n) {
    var p = [1];
    for (var i = 0; i < n; i++) {
      var q = p.slice(); q.push(0);
      for (var j = 0; j < p.length; j++) q[j + 1] ^= mul(p[j], EXP[i]);
      p = q;
    }
    return p;
  }
  function ecBytes(data, n) {
    var g = genPoly(n), res = new Array(n).fill(0);
    for (var i = 0; i < data.length; i++) {
      var f = data[i] ^ res[0];
      res.shift(); res.push(0);
      for (var j = 0; j < n; j++) res[j] ^= mul(g[j + 1], f);
    }
    return res;
  }

  /* ---------- Из стандарта: строение блоков для уровня M ----------
     [ЕС-байт на блок, блоков в группе 1, данных в блоке группы 1,
      блоков в группе 2, данных в блоке группы 2] */
  var BLOCKS_M = {
    1:  [10, 1, 16, 0, 0],
    2:  [16, 1, 28, 0, 0],
    3:  [26, 1, 44, 0, 0],
    4:  [18, 2, 32, 0, 0],
    5:  [24, 2, 43, 0, 0],
    6:  [16, 4, 27, 0, 0],
    7:  [18, 4, 31, 0, 0],
    8:  [22, 2, 38, 2, 39],
    9:  [22, 3, 36, 2, 37],
    10: [26, 4, 43, 1, 44]
  };
  /* Центры точек совмещения — тоже из стандарта */
  var ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };
  function dataCapacity(v) {
    var b = BLOCKS_M[v];
    return b[1] * b[2] + b[3] * b[4];
  }

  /* ---------- Служебные поля: считаем по BCH, не переписываем ---------- */
  function formatBits(mask) {          // уровень M = 0b00
    var data = (0 << 3) | mask, rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
  }
  function versionBits(v) {
    var rem = v;
    for (var i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    return (v << 12) | rem;
  }

  /* ---------- Сборка потока данных ---------- */
  function bitStream(bytes, v) {
    var cap = dataCapacity(v), bits = [];
    function push(val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    push(4, 4);                                   // режим: байты
    push(bytes.length, v <= 9 ? 8 : 16);          // длина: до версии 9 — байт
    for (var i = 0; i < bytes.length; i++) push(bytes[i], 8);
    /* Хвост: до четырёх нулей, добивка до целого байта, затем чередование
       236/17 — так предписывает стандарт, и без него читалки спотыкаются */
    for (var t = 0; t < 4 && bits.length < cap * 8; t++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    var pad = [236, 17], k = 0;
    while (bits.length < cap * 8) { push(pad[k++ % 2], 8); }
    var out = new Array(cap);
    for (var b = 0; b < cap; b++) {
      var val = 0;
      for (var j = 0; j < 8; j++) val = (val << 1) | bits[b * 8 + j];
      out[b] = val;
    }
    return out;
  }

  /* Данные и ЕС раскладываются с чередованием по блокам */
  function interleave(data, v) {
    var s = BLOCKS_M[v], ecLen = s[0];
    var blocks = [], ecs = [], at = 0, i, j;
    for (i = 0; i < s[1]; i++) { blocks.push(data.slice(at, at + s[2])); at += s[2]; }
    for (i = 0; i < s[3]; i++) { blocks.push(data.slice(at, at + s[4])); at += s[4]; }
    for (i = 0; i < blocks.length; i++) ecs.push(ecBytes(blocks[i], ecLen));
    var out = [], max = Math.max(s[2], s[4]);
    for (j = 0; j < max; j++) {
      for (i = 0; i < blocks.length; i++) if (j < blocks[i].length) out.push(blocks[i][j]);
    }
    for (j = 0; j < ecLen; j++) {
      for (i = 0; i < ecs.length; i++) out.push(ecs[i][j]);
    }
    return out;
  }

  /* ---------- Полотно ---------- */
  function build(v, codewords, mask) {
    var n = v * 4 + 17;
    var m = [], reserved = [];
    for (var i = 0; i < n; i++) {
      m.push(new Array(n).fill(0));
      reserved.push(new Array(n).fill(false));
    }
    function set(r, c, val) { m[r][c] = val ? 1 : 0; reserved[r][c] = true; }

    function finder(r, c) {
      for (var dr = -1; dr <= 7; dr++) for (var dc = -1; dc <= 7; dc++) {
        var rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        var inRing = (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6);
        var on = inRing && (dr === 0 || dr === 6 || dc === 0 || dc === 6
                 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        set(rr, cc, on);
      }
    }
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);

    for (var t = 8; t < n - 8; t++) {          // дорожки синхронизации
      set(6, t, t % 2 === 0);
      set(t, 6, t % 2 === 0);
    }
    var ac = ALIGN[v];                          // точки совмещения
    for (var a = 0; a < ac.length; a++) for (var b = 0; b < ac.length; b++) {
      var ar = ac[a], bc = ac[b];
      if ((ar <= 8 && bc <= 8) || (ar <= 8 && bc >= n - 9) || (ar >= n - 9 && bc <= 8)) continue;
      for (var dr2 = -2; dr2 <= 2; dr2++) for (var dc2 = -2; dc2 <= 2; dc2++) {
        set(ar + dr2, bc + dc2,
            Math.abs(dr2) === 2 || Math.abs(dc2) === 2 || (dr2 === 0 && dc2 === 0));
      }
    }
    set(n - 8, 8, 1);                           // тёмный модуль

    /* Служебные поля занимаем до раскладки данных. Формат пишется дважды —
       у левого верхнего угла и разорванным по двум другим, чтобы знак читался
       даже когда один угол закрыт пальцем или бликом.

       Вторая копия идёт семью модулями вверх по столбцу и восемью вправо по
       строке — не восемью и семью: восьмой снизу занят тёмным модулем, он
       стоит там всегда и формату не принадлежит. */
    /* Старший бит идёт первым — это и есть то место, где кодировщик проще
       всего написать зеркально: биты лягут «красиво», знак соберётся, метки
       и дорожки сойдутся, а читалка промолчит. Ловится только сверкой с
       чужим генератором, глазом — никак. */
    var fm = formatBits(mask), k, bit;
    for (k = 0; k < 15; k++) {
      bit = (fm >>> (14 - k)) & 1;
      if (k < 6) set(8, k, bit);
      else if (k === 6) set(8, 7, bit);
      else if (k === 7) set(8, 8, bit);
      else if (k === 8) set(7, 8, bit);
      else set(14 - k, 8, bit);
    }
    for (k = 0; k < 15; k++) {
      bit = (fm >>> (14 - k)) & 1;
      if (k < 7) set(n - 1 - k, 8, bit);
      else set(8, n - 15 + k, bit);
    }
    if (v >= 7) {                               // сведения о версии
      var vb = versionBits(v);
      for (var p = 0; p < 18; p++) {
        var bitv = (vb >>> p) & 1;
        set(Math.floor(p / 3), n - 11 + (p % 3), bitv);
        set(n - 11 + (p % 3), Math.floor(p / 3), bitv);
      }
    }

    /* Данные змейкой снизу справа, по две колонки, столбец 6 пропускаем */
    var bitIdx = 0, total = codewords.length * 8;
    for (var col = n - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (var row = 0; row < n; row++) {
        var r2 = ((n - 1 - col) & 2) === 0 ? n - 1 - row : row;
        for (var s2 = 0; s2 < 2; s2++) {
          var c2 = col - s2;
          if (reserved[r2][c2]) continue;
          var val2 = 0;
          if (bitIdx < total) val2 = (codewords[bitIdx >> 3] >>> (7 - (bitIdx & 7))) & 1;
          bitIdx++;
          m[r2][c2] = val2 ^ (maskAt(mask, r2, c2) ? 1 : 0);
        }
      }
    }
    return m;
  }
  function maskAt(mask, r, c) {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return (r * c) % 2 + (r * c) % 3 === 0;
      case 6: return ((r * c) % 2 + (r * c) % 3) % 2 === 0;
      default: return ((r + c) % 2 + (r * c) % 3) % 2 === 0;
    }
  }

  /* Штрафы — четыре правила стандарта. Нужны, чтобы выбрать маску, при
     которой знак меньше похож на собственные метки поиска */
  function penalty(m) {
    var n = m.length, p = 0, i, j, run, dark = 0;
    for (i = 0; i < n; i++) {
      run = 1;
      for (j = 1; j < n; j++) {
        if (m[i][j] === m[i][j - 1]) { run++; } else { if (run >= 5) p += run - 2; run = 1; }
      }
      if (run >= 5) p += run - 2;
      run = 1;
      for (j = 1; j < n; j++) {
        if (m[j][i] === m[j - 1][i]) { run++; } else { if (run >= 5) p += run - 2; run = 1; }
      }
      if (run >= 5) p += run - 2;
    }
    for (i = 0; i < n - 1; i++) for (j = 0; j < n - 1; j++) {
      var s = m[i][j] + m[i][j + 1] + m[i + 1][j] + m[i + 1][j + 1];
      if (s === 0 || s === 4) p += 3;
    }
    var pat = [1, 0, 1, 1, 1, 0, 1];
    function hit(get, at) {
      for (var k = 0; k < 7; k++) if (get(at + k) !== pat[k]) return false;
      return true;
    }
    for (i = 0; i < n; i++) for (j = 0; j + 7 <= n; j++) {
      var rowGet = (function (r) { return function (x) { return m[r][x]; }; })(i);
      var colGet = (function (c) { return function (x) { return m[x][c]; }; })(i);
      if (hit(rowGet, j)) p += 40;
      if (hit(colGet, j)) p += 40;
    }
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) if (m[i][j]) dark++;
    p += Math.floor(Math.abs(dark * 100 / (n * n) - 50) / 5) * 10;
    return p;
  }

  /* ---------- Открытая часть ---------- */
  /* Возвращает матрицу 0/1 или null, если текст не влезает в версию 10 */
  function matrix(text) {
    var bytes = [], enc = new TextEncoder().encode(text);
    for (var i = 0; i < enc.length; i++) bytes.push(enc[i]);
    var v = 0;
    for (var t = 1; t <= 10; t++) {
      /* Счётчик длины до версии 9 занимает байт, дальше два — запас на это
         уже учтён в проверке */
      var head = 4 + (t <= 9 ? 8 : 16);
      if (dataCapacity(t) * 8 >= head + bytes.length * 8) { v = t; break; }
    }
    if (!v) return null;
    var words = interleave(bitStream(bytes, v), v);
    var best = null, bestP = Infinity;
    for (var mk = 0; mk < 8; mk++) {
      var m = build(v, words, mk), p = penalty(m);
      if (p < bestP) { bestP = p; best = m; }
    }
    return best;
  }

  /* Рисуем в SVG: он масштабируется без мыла и вставляется строкой, без
     канвы и без внешних файлов */
  function svg(text, px) {
    var m = matrix(text);
    if (!m) return "";
    var n = m.length, quiet = 4, size = n + quiet * 2, d = "";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (m[r][c]) d += "M" + (c + quiet) + " " + (r + quiet) + "h1v1h-1z";
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + " " + size + '"'
      + ' width="' + px + '" height="' + px + '" shape-rendering="crispEdges">'
      + '<rect width="' + size + '" height="' + size + '" fill="#FFFFFF"/>'
      + '<path d="' + d + '" fill="#000000"/></svg>';
  }

  return { matrix: matrix, svg: svg };
})();
if (typeof module !== "undefined" && module.exports) module.exports = QR;
