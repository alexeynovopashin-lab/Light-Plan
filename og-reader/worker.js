/* Читалка — по присланной ссылке (Pinterest, Instagram, что угодно) читает
   og:image и отдаёт байты картинки; для доски Pinterest умеет забрать
   список всех пинов целиком. Разбор — в docs/15_MOODBOARD.md, «Pinterest и
   Instagram → Про посредника — и почему он временный».

   Не хранит ничего и не пишет логов: страница и картинка проходят транзитом,
   от запроса до ответа, и не остаются нигде — ни в KV, ни в файле, ни в
   консоли. Это костыль веб-прототипа: в нативе `URLSession` делает то же
   самое с телефона напрямую, без посредника — CORS там нет.

   GET /?url=<страница, encodeURIComponent> → одна og:image картинка
     → 200, байты картинки, Content-Type как у оригинала
     → 404, если og:image не нашёлся или сама картинка не отдалась
     → 400, если url отсутствует или не http(s)

   GET /?board=<ссылка на доску Pinterest, encodeURIComponent>
     → 200, JSON { name, pinCount, pins: [{ id, permalink, image }] }
       (image — ссылка на pinimg, ещё не проксированная; за байтами — ?img=)
     → 400/404, если ссылка не похожа на доску или доска не нашлась

   GET /?img=<прямая ссылка на картинку, encodeURIComponent> → байты картинки
     (тот же прокси, что и для og:image, но без чтения HTML)

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

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}

/* Проксируем байты картинки как есть — тот же шаг, что был раньше только
   внутри og:image-пути, но теперь ещё и отдельно для каждого пина доски. */
async function proxyImage(imgHref) {
  let imgRes;
  try {
    imgRes = await fetch(imgHref, { headers: { "user-agent": UA }, redirect: "follow" });
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

/* /<пользователь>/<доска>/ — путь из двух сегментов, первый не "pin".
   У Pinterest бывают и другие двухсегментные пути (например /ideas/...),
   но по ним resource-запрос ниже просто не найдёт доску и вернёт 404 —
   отдельно отсеивать их тут не нужно. */
function pinterestBoardParts(pageUrl) {
  if (!/(^|\.)pinterest\.[a-z.]+$/i.test(pageUrl.hostname)) return null;
  // `.pathname` отдаёт сегменты percent-encoded — кириллический слаг (обычное
  // дело для доски) иначе уедет в JSON как буквальные "%D0%.." вместо текста
  const segs = pageUrl.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (segs.length < 2 || segs[0] === "pin") return null;
  return { username: segs[0], slug: segs[1] };
}

/* Внутренний resource-API самого сайта Pinterest, не официальный OAuth v5 —
   тот публичную чужую доску перечислить не даёт (docs/15_MOODBOARD.md,
   «Доски»). Не документирован и не гарантирован: заголовок ниже — не секрет,
   а опознавательный штамп, которым сам сайт помечает такие запросы; без
   него сервер отвечает 403 всем подряд, включая настоящий браузер. */
const PWS_HANDLER = "www/[username]/[slug].js";
async function pinResourceGet(origin, resource, dataObj) {
  const u = origin + "/resource/" + resource + "/get/?data=" + encodeURIComponent(JSON.stringify(dataObj));
  let res;
  try {
    res = await fetch(u, {
      headers: { "user-agent": UA, accept: "application/json", "x-pinterest-pws-handler": PWS_HANDLER },
    });
  } catch (e) { return null; }
  if (!res.ok) return null;
  try { return await res.json(); } catch (e) { return null; }
}

async function handleBoard(boardHref) {
  let pageUrl;
  try {
    pageUrl = new URL(boardHref);
    if (pageUrl.protocol !== "http:" && pageUrl.protocol !== "https:") throw new Error("scheme");
  } catch (e) {
    return jsonResponse({ error: "bad url" }, 400);
  }
  const parts = pinterestBoardParts(pageUrl);
  if (!parts) return jsonResponse({ error: "not a board url" }, 400);
  const origin = pageUrl.origin;

  const boardData = await pinResourceGet(origin, "BoardResource", {
    options: { field_set_key: "detailed", username: parts.username, slug: parts.slug },
    context: {},
  });
  const board = boardData && boardData.resource_response && boardData.resource_response.data;
  if (!board || !board.id) return jsonResponse({ error: "board not found" }, 404);

  // Потолок в 50: доска — не бесконечная лента, а подборка образцов для клиента
  const pageSize = Math.max(1, Math.min(board.pin_count || 25, 50));
  const feedData = await pinResourceGet(origin, "BoardFeedResource", {
    options: { board_id: board.id, board_url: pageUrl.pathname, page_size: pageSize },
    context: {},
  });
  const pins = (feedData && feedData.resource_response && feedData.resource_response.data) || [];

  const out = [];
  for (const p of pins) {
    if (!p || !p.id || !p.images) continue;
    const img = p.images["736x"] || p.images["474x"] || p.images["236x"] || p.images.orig;
    if (!img || !img.url) continue;
    out.push({ id: String(p.id), permalink: "https://www.pinterest.com/pin/" + p.id + "/", image: img.url });
  }
  return jsonResponse({ name: board.name || "", pinCount: board.pin_count || out.length, pins: out });
}

async function handleRequest(request) {
  const reqUrl = new URL(request.url);

  const boardParam = reqUrl.searchParams.get("board");
  if (boardParam) return handleBoard(boardParam);

  const imgParam = reqUrl.searchParams.get("img");
  if (imgParam) {
    let imgUrl;
    try {
      imgUrl = new URL(imgParam);
      if (imgUrl.protocol !== "http:" && imgUrl.protocol !== "https:") throw new Error("scheme");
    } catch (e) {
      return new Response("bad url", { status: 400 });
    }
    return proxyImage(imgUrl.href);
  }

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

  return proxyImage(imgUrl);
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
