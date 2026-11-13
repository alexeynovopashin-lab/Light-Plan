#!/usr/bin/env python3
"""Лист вариантов дуги «Света» на светлой теме (палитра Д): как заставить дугу светиться на дневном небе.
Запуск: python3 build.py → arcs.html рядом. Геометрия одна на все варианты, меняется только способ рисования."""
import html, math, pathlib

ORANGE = '#F09329'
DAY = ('#86BAEC', '#DCEBF9')
NIGHT = ('#0E1A3A', '#1E2B4A')
PLATE = '#F3F3F5'
CX, CY, R = 150.0, 150.0, 118.0          # центр и радиус дуги в единицах рисунка (300 × 176)
ARC = f'M{CX - R:.1f} {CY:.1f} A{R:.1f} {R:.1f} 0 0 1 {CX + R:.1f} {CY:.1f}'
SUN_T = math.radians(142)                 # где стоит солнце на дуге

def lum(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def cr(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)

def taper(apex, base, power=1.6):
    """Замкнутый контур дуги переменной толщины: apex у вершины, base у оснований."""
    out, inn = [], []
    for i in range(0, 181, 3):
        t = math.radians(180 - i)
        w = apex + (base - apex) * abs(math.cos(t)) ** power
        out.append((CX + (R + w / 2) * math.cos(t), CY - (R + w / 2) * math.sin(t)))
        inn.append((CX + (R - w / 2) * math.cos(t), CY - (R - w / 2) * math.sin(t)))
    pts = out + inn[::-1]
    return 'M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in pts) + ' Z'

def sun(kind, night):
    x, y = CX + R * math.cos(SUN_T), CY - R * math.sin(SUN_T)
    if kind == 'flat':
        return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="7" fill="{ORANGE}"/>'
    halo = f'<circle cx="{x:.1f}" cy="{y:.1f}" r="13" fill="{ORANGE}" opacity=".5" filter="url(#blur6)"/>' if kind in ('glow', 'light') else ''
    rim = f'<circle cx="{x:.1f}" cy="{y:.1f}" r="10" fill="#FFFFFF"/>' if kind == 'rim' else ''
    return halo + rim + f'<circle cx="{x:.1f}" cy="{y:.1f}" r="7.5" fill="{ORANGE}"/><circle cx="{x:.1f}" cy="{y:.1f}" r="4.6" fill="#FFFFFF"/>'

def draw(v, night):
    s = lambda color, w, extra='': f'<path d="{ARC}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="butt" {extra}/>'
    k = v['id']
    if k == 'flat':
        body = s(ORANGE, 3)
    elif k == 'core':
        body = s(ORANGE, 5) + s('#FFFFFF', 1.8)
    elif k == 'glow':
        body = s(ORANGE, 13, 'opacity=".55" filter="url(#blur5)"') + s(ORANGE, 5) + s('#FFFFFF', 1.8)
    elif k == 'rim':
        body = s('#FFFFFF', 7) + s(ORANGE, 3)
    elif k == 'light':
        body = (s('url(#along)', 13, 'opacity=".6" filter="url(#blur5)"') + s('url(#along)', 5) + s('#FFFFFF', 1.8))
    elif k == 'taper':
        body = (f'<path d="{taper(9, 20)}" fill="{ORANGE}" opacity=".5" filter="url(#blur5)"/>'
                f'<path d="{taper(3.6, 7.2)}" fill="{ORANGE}"/><path d="{taper(1.4, 2.6)}" fill="#FFFFFF"/>')
    elif k == 'glass':
        body = (s('#FFFFFF', 10, 'opacity=".34"') + s('#0B2A55', 10.8, 'opacity=".10" fill="none" transform="translate(0 1.2)"')
                + f'<path d="M{CX - R - 3.6:.1f} {CY:.1f} A{R + 3.6:.1f} {R + 3.6:.1f} 0 0 1 {CX + R + 3.6:.1f} {CY:.1f}" fill="none" stroke="#FFFFFF" stroke-width="1.1" opacity=".9"/>'
                + s(ORANGE, 2.6))
    kind = {'flat': 'flat', 'core': 'core', 'glow': 'glow', 'rim': 'rim', 'light': 'light', 'taper': 'glow', 'glass': 'rim'}[k]
    top, bot = NIGHT if night else DAY
    gid = f'sky{int(night)}'
    stars = ''
    if night:
        pts = [(24, 20, 1.1), (66, 34, .8), (104, 14, 1.2), (150, 26, .8), (196, 18, 1.1), (236, 40, .8), (272, 22, 1.1), (130, 60, .7), (46, 62, .7), (220, 70, .7)]
        stars = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFFFFF"/>' for x, y, r in pts)
    ink = '#EEF2FA' if night else '#000000'
    return (f'<svg viewBox="0 0 300 176" role="img" aria-label="{html.escape(v["name"])}, {"ночь" if night else "день"}">'
            f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/><stop offset=".85" stop-color="{bot}"/></linearGradient>'
            f'<linearGradient id="along" gradientUnits="userSpaceOnUse" x1="{CX - R}" y1="0" x2="{CX + R}" y2="0">'
            f'<stop offset="0" stop-color="{ORANGE}"/><stop offset=".14" stop-color="{ORANGE}"/><stop offset=".36" stop-color="#FFFFFF"/>'
            f'<stop offset=".64" stop-color="#FFFFFF"/><stop offset=".86" stop-color="{ORANGE}"/><stop offset="1" stop-color="{ORANGE}"/></linearGradient>'
            f'<filter id="blur5" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4.5"/></filter>'
            f'<filter id="blur6" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5"/></filter>'
            f'<clipPath id="above"><rect x="0" y="0" width="300" height="{CY}"/></clipPath></defs>'
            f'<rect width="300" height="176" fill="url(#{gid})"/>{stars}'
            f'<g clip-path="url(#above)">{body}{sun(kind, night)}</g>'
            f'<text x="{CX}" y="112" text-anchor="middle" font-size="26" font-weight="300" fill="{ink}">{"0:40" if night else "13:05"}</text>'
            f'<rect x="8" y="{CY}" width="284" height="40" rx="12" fill="{PLATE if not night else "#F3F3F5"}" stroke="#FFFFFF" stroke-width="1.5"/>'
            f'</svg>')

V = [
 dict(id='flat', name='0 · Как в карточке Д', what='Ровная оранжевая линия 3 pt. На ночном небе светится, на дневном читается как нарисованная.',
      nums='толщина 3 по всей дуге'),
 dict(id='core', name='1 · Белый центр', what='Твой приём с лазерным мечом: оранжевая оболочка и белая жила внутри. Белый ярче неба, глаз читает его как источник.',
      nums='оболочка 5, жила 1,8'),
 dict(id='glow', name='2 · Белый центр и ореол', what='То же плюс размытый оранжевый ореол вокруг. На светлом небе ореол не светлее фона, он подкрашивает небо тёплым, как дымка у солнца.',
      nums='оболочка 5, жила 1,8, ореол 13 с размытием'),
 dict(id='rim', name='3 · Белый кант', what='Оранжевая линия на белой подложке. Дугу от неба отделяет белый край, свечения нет: это знак, а не свет.',
      nums='кант 7, линия 3'),
 dict(id='light', name='4 · Цвет света', what='Моя альтернатива: дуга окрашена светом этого часа. У оснований оранжевая, к полудню белая, жила белая по всей длине.',
      nums='оболочка 5 с переходом, жила 1,8, ореол 13'),
 dict(id='taper', name='5 · Основания шире', what='Вариант 2 с оптической компенсацией: у оснований дуга вдвое толще, чем у вершины.',
      nums='у вершины 3,6, у оснований 7,2 (в 2 раза); жила 1,4 → 2,6'),
 dict(id='glass', name='6 · Стекло', what='Стеклянная трубка с оранжевой нитью внутри: полупрозрачное белое тело, блик по верхнему краю, тень снизу.',
      nums='трубка 10, нить 2,6, блик 1,1'),
]

CSS = '''
:root{--page:#DCDDE0;--panel:#F7F7F8;--fg:#17181B;--fg2:#55585F;--line:#C9CBD0;
 --sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--page:#1B1C1F;--panel:#26272B;--fg:#ECEDEF;--fg2:#A3A6AD;--line:#3A3C42;color-scheme:dark}}
:root[data-theme="dark"]{--page:#1B1C1F;--panel:#26272B;--fg:#ECEDEF;--fg2:#A3A6AD;--line:#3A3C42;color-scheme:dark}
body{background:var(--page);color:var(--fg);font-family:var(--sans);font-size:15px;line-height:1.45;
 padding-block:24px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.wrap{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
h1{font-size:26px;font-weight:650;letter-spacing:-.01em;margin:0;text-wrap:balance}
.lead{margin:0;color:var(--fg2);max-width:68ch}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px;align-items:start}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;min-width:0}
.card h2{font-size:17px;font-weight:650;margin:0}
.card p{margin:0;color:var(--fg2);font-size:13.5px}
.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.pair figure{margin:0;display:flex;flex-direction:column;gap:4px;min-width:0}
.pair svg{width:100%;height:auto;aspect-ratio:300/176;border-radius:10px;border:1px solid var(--line);display:block}
.pair figcaption{font-size:12px;font-weight:600}
.nums{font-family:var(--mono);font-size:11.5px;color:var(--fg2)}
.big svg{width:100%;height:auto;aspect-ratio:300/176;border-radius:12px;border:1px solid var(--line);display:block}
'''

def card(v):
    e = html.escape
    return (f'<section class="card" id="v-{v["id"]}"><h2>{e(v["name"])}</h2><p>{e(v["what"])}</p>'
            f'<div class="big">{draw(v, False)}</div>'
            f'<div class="pair"><figure>{draw(v, False)}<figcaption>Небо днём</figcaption></figure>'
            f'<figure>{draw(v, True)}<figcaption>Небо ночью</figcaption></figure></div>'
            f'<div class="nums">{e(v["nums"])}</div></section>')

page = f'''<meta name="claude:viewport-fit-sides" content="cover">
<title>Дуга на дневном небе</title>
<style>{CSS}</style>
<div class="wrap">
<h1>Дуга на дневном небе</h1>
<p class="lead">Семь способов нарисовать одну и ту же дугу на палитре Д. Сверху крупно день, ниже пара день и ночь: приём должен работать на голубом и не сломать тёмно-синее. Геометрия, небо и оранжевый #F09329 везде одни.</p>
<div class="grid">{''.join(card(v) for v in V)}</div>
</div>'''

out = pathlib.Path(__file__).with_name('arcs.html')
out.write_text(page, encoding='utf-8')
print('written', out, len(page))
print('белый на верхе дневного неба %.1f' % cr('#FFFFFF', DAY[0]), '· у горизонта %.1f' % cr('#FFFFFF', DAY[1]),
      '· оранжевый на верхе %.1f' % cr(ORANGE, DAY[0]), '· у горизонта %.1f' % cr(ORANGE, DAY[1]),
      '· белый на оранжевом %.1f' % cr('#FFFFFF', ORANGE))
