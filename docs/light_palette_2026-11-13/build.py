#!/usr/bin/env python3
"""Лист палитр светлой темы (28к.4): квадратики «фон → блок → кнопка → шрифт на фоне», небо днём и ночью.
Запуск: python3 build.py  → palettes.html рядом. Контраст считается здесь же (WCAG 2), в лист попадают числа."""
import html, pathlib

def lum(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def cr(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)

# Каждая палитра: имя, мысль, цвета. «now» — что стоит в сборке 222cff6 (Palette.swift, DomeSky.swift, DomeView.swift).
P = [
 dict(id='now', name='Сейчас', idea='Сборка 222cff6. Ночью небо растворяется в цвет страницы; «Звёздная ночь» написана цветом луны из тёмной темы; оранжевый стоит на чёрном.',
      bg='#EDEDF0', block='#FFFFFF', edge='#E0E0E4', ink='#141416', ink2='#626267',
      btn='#141416', btnInk='#E4570B', dark='#141416', darkInk='#E4570B',
      accent='#E4570B', accentInk='#B83C00', star='#A8BDD8', burst='#E4570B',
      dayTop='#CFE1EB', dayBot='#EBF1F0', nightTop='#EDEDF0', nightBot='#EDEDF0',
      arcDay='#E2A44C', arcNight='#E2A44C', sun='#E4570B', nightInk='#141416', nightStar='#C9C9CE'),
 dict(id='a', name='А · Латунь', idea='Акцент — латунь тёмной темы, только глубже. Оранжевого нет вовсе, на тёмном стоит золото. Самая «семейная» с тёмной темой.',
      bg='#EDEDF0', block='#FFFFFF', edge='#E0E0E4', ink='#141416', ink2='#5C5C61',
      btn='#E0A23A', btnInk='#1A1408', dark='#1D1D21', darkInk='#EDBE6A',
      accent='#D9962E', accentInk='#855408', star='#3F5F96', burst='#141416',
      dayTop='#8FC0EE', dayBot='#DDEDFA', nightTop='#0B1634', nightBot='#1D3059',
      arcDay='#B87A14', arcNight='#E8B45A', sun='#B87A14', nightInk='#EEF2FA', nightStar='#FFFFFF'),
 dict(id='b', name='Б · Мандарин', idea='Оранжевый остаётся, но желтее и только на светлом. Тёмные элементы — графит с белым знаком, оранжевого на тёмном нет.',
      bg='#EDEDF0', block='#FFFFFF', edge='#E0E0E4', ink='#141416', ink2='#5C5C61',
      btn='#F08A1C', btnInk='#1B1206', dark='#2B2B30', darkInk='#FFFFFF',
      accent='#F08A1C', accentInk='#A04A00', star='#2F5AA8', burst='#141416',
      dayTop='#7DB7EA', dayBot='#D7EAF8', nightTop='#0D1B3E', nightBot='#22386A',
      arcDay='#C2670A', arcNight='#F4A23E', sun='#C2670A', nightInk='#EEF2FA', nightStar='#FFFFFF'),
 # В «Тёплая бумага» и Г «Синий час» сняты 13.11 по слову Алексея «оставь А Б и Д»; их цвета — в истории git (коммит 31bd7fd).
 # Образец Алексея 13.11 (карточка приложения с оранжевым графиком). Цвета сняты с картинки по пикселям; сама картинка в репозиторий не кладётся.
 dict(id='e', name='Д · Образец как есть', idea='Цвета сняты с присланной картинки по пикселям. Оранжевый только на светлом, на чёрной кнопке знак белый. Неба на образце нет, оно подобрано отдельно.',
      bg='#E6E6E7', block='#F3F3F5', edge='#FFFFFF', ink='#000000', ink2='#5C5C62',
      btn='#010101', btnInk='#FFFFFF', dark='#010101', darkInk='#FFFFFF', chipInk='#000000',
      accent='#F29230', accentInk='#F09329', star='#5C5C62', burst='#000000',
      dayTop='#86BAEC', dayBot='#DCEBF9', nightTop='#0E1A3A', nightBot='#1E2B4A',
      arcDay='#F09329', arcNight='#F09329', sun='#F09329', nightInk='#EEF2FA', nightStar='#FFFFFF'),
 dict(id='f', name='Д+ · Образец, доведённый', idea='Тот же фон, блок, чёрная кнопка с белым знаком и тот же оранжевый в заливках. Для мелкого текста и дуги днём оранжевый затемнён, «Звёздная ночь» синяя.',
      bg='#E6E6E7', block='#F3F3F5', edge='#FFFFFF', ink='#000000', ink2='#5C5C62',
      btn='#010101', btnInk='#FFFFFF', dark='#010101', darkInk='#FFFFFF', chipInk='#000000',
      accent='#F29230', accentInk='#9C4F00', star='#2F5596', burst='#000000',
      dayTop='#86BAEC', dayBot='#DCEBF9', nightTop='#0E1A3A', nightBot='#1E2B4A',
      arcDay='#B8640A', arcNight='#F4A244', sun='#B8640A', nightInk='#EEF2FA', nightStar='#FFFFFF'),
]

# Алексей 13.11: «оставь А и Д». На листе только эти две; «Сейчас», Б и Д+ остаются в данных выше (Д+ понадобится шагу 28к.4
# для мелкого текста и дуги), на лист не выводятся.
SHOW = ('a', 'e')
P = [p for p in P if p['id'] in SHOW]

def chk(v, need):
    cls = 'ok' if v >= need else 'low'
    word = '' if v >= need else f' · надо {str(need).replace(".", ",")}'
    return f'<span class="num {cls}">{v:.1f}'.replace('.', ',') + f' : 1{word}</span>'

def sq(color, label):
    return (f'<div class="sq"><i style="background:{color}"></i><b>{html.escape(label)}</b>'
            f'<code>{color.upper()}</code></div>')

def sky(p, night):
    top, bot = (p['nightTop'], p['nightBot']) if night else (p['dayTop'], p['dayBot'])
    arc = p['arcNight'] if night else p['arcDay']
    ink = p['nightInk'] if night else p['ink']
    stars = ''
    if night:
        pts = [(22, 18, 1.1), (61, 30, .8), (97, 14, 1.3), (140, 34, .9), (178, 20, 1.1), (214, 40, .8), (246, 16, 1.2), (120, 52, .7), (40, 50, .7), (200, 58, .7)]
        stars = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{p["nightStar"]}"/>' for x, y, r in pts)
    title = 'Небо ночью' if night else 'Небо днём'
    return (f'<figure class="sky"><svg viewBox="0 0 270 130" preserveAspectRatio="none" role="img" aria-label="{title}">'
            f'<defs><linearGradient id="g{p["id"]}{int(night)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/>'
            f'<stop offset="1" stop-color="{bot}"/></linearGradient></defs>'
            f'<rect width="270" height="130" fill="url(#g{p["id"]}{int(night)})"/>{stars}'
            f'<path d="M35 130 A100 92 0 0 1 235 130" fill="none" stroke="{arc}" stroke-width="3"/>'
            f'<circle cx="64" cy="76" r="7" fill="{arc}"/>'
            f'<text x="135" y="104" text-anchor="middle" font-size="22" font-weight="300" fill="{ink}">{"0:40" if night else "13:05"}</text>'
            f'</svg><figcaption><b>{title}</b><code>{top.upper()} → {bot.upper()}</code></figcaption></figure>')

def card(p):
    e = html.escape
    rows = [
        ('Чернила на блоке', cr(p['ink'], p['block']), 4.5),
        ('Вторые чернила на блоке', cr(p['ink2'], p['block']), 4.5),
        ('Текст акцента на блоке', cr(p['accentInk'], p['block']), 4.5),
        ('«Звёздная ночь» на блоке', cr(p['star'], p['block']), 4.5),
        ('Акцент как знак на блоке', cr(p['accent'], p['block']), 3.0),
        ('Блок на фоне (без канта и тени)', cr(p['block'], p['bg']), 1.0),
        ('Надпись на кнопке', cr(p['btnInk'], p['btn']), 4.5),
        ('Знак на тёмном', cr(p['darkInk'], p['dark']), 3.0),
        ('Дуга на дневном небе (у горизонта)', cr(p['arcDay'], p['dayBot']), 3.0),
        ('Дуга на дневном небе (вверху)', cr(p['arcDay'], p['dayTop']), 3.0),
        ('Дуга на ночном небе', cr(p['arcNight'], p['nightBot']), 3.0),
        ('Звёзды на ночном небе', cr(p['nightStar'], p['nightTop']), 3.0),
    ]
    table = ''.join(f'<tr><td>{e(n)}</td><td>{chk(v, need)}</td></tr>' for n, v, need in rows)
    squares = ''.join([sq(p['bg'], 'Фон'), sq(p['block'], 'Блок'), sq(p['btn'], 'Кнопка'), sq(p['accent'], 'Акцент'),
                       sq(p['accentInk'], 'Текст акцента'), sq(p['ink'], 'Чернила'), sq(p['ink2'], 'Вторые'), sq(p['star'], 'Ночь в тексте')])
    return f'''<section class="card" id="p-{p['id']}">
<header><h2>{e(p['name'])}</h2><p>{e(p['idea'])}</p></header>
<div class="stage" style="background:{p['bg']}">
  <div class="block" style="background:{p['block']};border-color:{p['edge']}">
    <div class="row" style="border-color:{p['edge']}"><span style="color:{p['ink2']}">Условия</span><span style="color:{p['star']};font-weight:600">☆ Звёздная ночь</span></div>
    <div class="row" style="border-color:{p['edge']}"><span style="color:{p['ink2']}">Золотой час</span><span style="color:{p['ink']}">16:36–17:56</span></div>
    <div class="row last"><span style="color:{p['ink2']}">Закат</span><span style="color:{p['accentInk']};font-weight:600">через 4 ч 12 м</span></div>
  </div>
  <p class="onbg" style="color:{p['ink']}">Шрифт на фоне <span style="color:{p['ink2']}">· вторые чернила</span> <span style="color:{p['accentInk']}">· акцент</span></p>
  <div class="btns">
    <span class="btn" style="background:{p['btn']};color:{p['btnInk']}">Запланировать съёмку</span>
    <span class="round" style="background:{p['dark']};color:{p['darkInk']}" title="Кнопка новой съёмки">+</span>
    <span class="chip" style="background:{p['accent']};color:{p.get('chipInk', p['btnInk'] if p['id'] != 'now' else '#141416')}">Про</span>
    <span class="burst" style="color:{p['burst']}" title="Звёзды при выборе «Астро»">✦ ✦ ✦</span>
  </div>
</div>
<div class="squares">{squares}</div>
<div class="skies">{sky(p, False)}{sky(p, True)}</div>
<table class="nums"><caption>Контраст, посчитан по формуле WCAG</caption>{table}</table>
</section>'''

CSS = '''
:root{--page:#DCDDE0;--panel:#F7F7F8;--fg:#17181B;--fg2:#55585F;--line:#C9CBD0;--ok:#1E6B3A;--low:#A12B1B;
 --sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--page:#1B1C1F;--panel:#26272B;--fg:#ECEDEF;--fg2:#A3A6AD;--line:#3A3C42;--ok:#7BD49B;--low:#FF9A86;color-scheme:dark}}
:root[data-theme="dark"]{--page:#1B1C1F;--panel:#26272B;--fg:#ECEDEF;--fg2:#A3A6AD;--line:#3A3C42;--ok:#7BD49B;--low:#FF9A86;color-scheme:dark}
body{background:var(--page);color:var(--fg);font-family:var(--sans);font-size:15px;line-height:1.45;
 padding-block:24px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.wrap{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
h1{font-size:26px;font-weight:650;letter-spacing:-.01em;margin:0;text-wrap:balance}
.lead{margin:0;color:var(--fg2);max-width:68ch}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:16px;align-items:start}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:12px;min-width:0}
.card header{display:flex;flex-direction:column;gap:4px}
.card h2{font-size:18px;font-weight:650;margin:0}
.card header p{margin:0;color:var(--fg2);font-size:13.5px}
.stage{border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:12px;border:1px solid var(--line)}
.block{border-radius:18px;border:1px solid;padding:2px 14px}
.row{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid;font-size:15px}
.row.last{border-bottom:0}
.onbg{margin:0;font-size:15px}
.btns{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.btn{border-radius:999px;padding:10px 16px;font-weight:600;font-size:15px}
.round{width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:400;line-height:1}
.chip{border-radius:999px;padding:6px 12px;font-weight:600;font-size:13px}
.burst{font-size:17px;letter-spacing:2px}
.squares{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.sq{display:flex;flex-direction:column;gap:3px;min-width:0}
.sq i{display:block;aspect-ratio:1;border-radius:8px;border:1px solid var(--line)}
.sq b{font-size:12px;font-weight:600;overflow-wrap:anywhere}
.sq code,.sky code{font-family:var(--mono);font-size:10.5px;color:var(--fg2)}
.skies{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.sky{margin:0;display:flex;flex-direction:column;gap:4px;min-width:0}
.sky svg{width:100%;height:auto;aspect-ratio:270/130;border-radius:10px;border:1px solid var(--line);display:block}
.sky figcaption{display:flex;flex-direction:column;gap:1px}
.sky b{font-size:12px}
.nums{width:100%;border-collapse:collapse;font-size:13px}
.nums caption{text-align:left;color:var(--fg2);font-size:12px;padding-bottom:4px}
.nums td{padding:4px 0;border-top:1px solid var(--line);vertical-align:top}
.nums td:last-child{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.num.ok{color:var(--ok)}.num.low{color:var(--low);font-weight:600}
.notes{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.notes h2{font-size:16px;margin:0 0 6px}.notes ul{margin:0;padding-left:18px;color:var(--fg2);max-width:80ch}.notes li{margin:3px 0}
'''

page = f'''<meta name="claude:viewport-fit-sides" content="cover">
<title>Палитры светлой темы</title>
<style>{CSS}</style>
<div class="wrap">
<h1>Палитры светлой темы Light Plan</h1>
<p class="lead">Квадратики до кода: фон, блок на фоне, кнопка, шрифт на фоне, небо днём и ночью с дугой. Два варианта, которые остались после отбора: А «Латунь» и Д по присланному образцу. Смотреть лучше на телефоне: цвета на экране Mac и iPhone расходятся.</p>
<div class="grid">{''.join(card(p) for p in P)}</div>
<div class="notes"><h2>Как читать</h2><ul>
<li>В каждой карточке сверху сцена: блок на фоне, строка шрифта на фоне, кнопка, круглая кнопка новой съёмки, выбранный чип и звёзды «Астро».</li>
<li>Ночное небо во всех вариантах тёмно-синее, не чёрное и не белое. Звёзды на нём белые.</li>
<li>Дуга и кружок солнца одного цвета, как ты просил. Днём дуга темнее, ночью светлее: один цвет на голубом и на тёмно-синем сразу не читается.</li>
<li>Красное число контраста значит «текст такого размера читается плохо»: для текста нужно 4,5 : 1, для знаков и линий 3 : 1.</li>
<li>Варианты можно смешивать: фон из одного, кнопка из другого, небо из третьего.</li>
<li>В образце блок почти того же тона, что фон. Его отделяют белый кант и тень, а не цвет, поэтому строка «блок на фоне» дана без нормы, просто числом.</li>
<li>Светлый оранжевый и золото как знак на светлом блоке ниже 3 : 1 в обоих вариантах. Это цена ухода от красноватого оранжевого: мелкие знаки рисуем тёмным тоном акцента, светлый оставляем заливкам.</li>
<li>В Д красные числа у текста акцента и у дуги днём: на образце оранжевым написано только крупное. Для мелкого текста и дневной дуги понадобится тон темнее.</li>
</ul></div>
</div>'''

out = pathlib.Path(__file__).with_name('palettes.html')
out.write_text(page, encoding='utf-8')
print('written', out, len(page))
for p in P:
    print(p['id'], 'star/block %.1f' % cr(p['star'], p['block']), 'accentInk/block %.1f' % cr(p['accentInk'], p['block']),
          'btn %.1f' % cr(p['btnInk'], p['btn']), 'dark %.1f' % cr(p['darkInk'], p['dark']),
          'arcDay %.1f' % cr(p['arcDay'], p['dayBot']), 'arcDayTop %.1f' % cr(p['arcDay'], p['dayTop']), 'arcNight %.1f' % cr(p['arcNight'], p['nightBot']),
          'ink2 %.1f' % cr(p['ink2'], p['block']), 'ink2/bg %.1f' % cr(p['ink2'], p['bg']), 'accentInk/bg %.1f' % cr(p['accentInk'], p['bg']))
