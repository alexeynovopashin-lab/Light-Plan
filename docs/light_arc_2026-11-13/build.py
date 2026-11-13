#!/usr/bin/env python3
"""Лист дуги «Света» на светлой теме (палитра Д), третий круг (13.11): вариант Г в трёх толщинах.
Рисунок в масштабе приложения: геометрия из DomeGeometry (ширина вида 390, эллипс rx 163, ry 148, центр 195;196),
единица рисунка = 1 pt. Запуск: python3 build.py → arcs.html. Прежние круги — коммиты a0683b1 и 36f828c."""
import html, math, pathlib

ORANGE = '#F09329'
DAY = ('#86BAEC', '#DCEBF9')
NIGHT = ('#0E1A3A', '#1E2B4A')
W, H = 390, 250
CX, CY, RX, RY = 195.0, 196.0, 163.0, 148.0      # DomeGeometry.cx, cy, rx, ry
SUN_T = math.radians(142)
SUN_R = 6.5                                      # DomeGeometry.coreRadius
LAT = 53.35                                      # Барнаул

def mix(a, b, t):
    a, b = a.lstrip('#'), b.lstrip('#')
    return '#%02X%02X%02X' % tuple(round(int(a[i:i + 2], 16) * (1 - t) + int(b[i:i + 2], 16) * t) for i in (0, 2, 4))

def pt(t, off=0.0):
    x, y = CX + RX * math.cos(t), CY - RY * math.sin(t)
    nx, ny = math.cos(t) / RX, math.sin(t) / RY
    n = math.hypot(nx, ny)
    return x + nx / n * off, y - ny / n * off

def legs(body, foot, k=1.0):
    """Контур дуги: толщина body у вершины, ровно растёт до foot у оснований. k — множитель (жила, свечение)."""
    out, inn = [], []
    for i in range(0, 181, 2):
        t = math.radians(180 - i)
        w = (body + (foot - body) * (1 - min(i, 180 - i) / 90)) * k
        out.append(pt(t, w / 2)); inn.append(pt(t, -w / 2))
    return 'M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in out + inn[::-1]) + ' Z'

def day(decl):
    phi, d = math.radians(LAT), math.radians(decl)
    h0 = math.acos(-math.tan(phi) * math.tan(d))
    elev = lambda f: math.degrees(math.asin(math.sin(phi) * math.sin(d) + math.cos(phi) * math.cos(d) * math.cos(h0 * (2 * f - 1))))
    return dict(hours=2 * math.degrees(h0) / 15, emax=elev(0.5), elev=elev)

GOLD, HIGH = 6.0, 30.0
def white(d, f):
    top = min(HIGH, 0.8 * d['emax'])
    x = max(0.0, min(1.0, (d['elev'](f) - GOLD) / (top - GOLD)))
    return x * x * (3 - 2 * x)

SUMMER, WINTER = day(23.44), day(-23.44)

def gradient(gid, d, c0, c1, strength=1.0):
    stops = ''.join(f'<stop offset="{(1 - math.cos(math.pi * i / 40)) / 2:.4f}" stop-color="{mix(c0, c1, white(d, i / 40) * strength)}"/>' for i in range(41))
    return f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{CX - RX}" y1="0" x2="{CX + RX}" y2="0">{stops}</linearGradient>'

def saber(uid, body, foot, d):
    defs = (gradient(f'w{uid}', d, ORANGE, '#FFFFFF', 0.55) + gradient(f't{uid}', d, ORANGE, '#FFFFFF', 0.7)
            + gradient(f'b{uid}', d, ORANGE, '#FFF4E4') + gradient(f'p{uid}', d, '#FFD9A8', '#FFFFFF')
            + f'<filter id="fw{uid}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="{body * 1.5:.2f}"/></filter>'
            + f'<filter id="ft{uid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="{body * 0.48:.2f}"/></filter>'
            + f'<filter id="fp{uid}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="{body * 0.1:.2f}"/></filter>')
    p = lambda k: legs(body, foot, k)
    return defs, (f'<path d="{p(4.6)}" fill="url(#w{uid})" opacity=".40" filter="url(#fw{uid})"/>'
                  f'<path d="{p(2.1)}" fill="url(#t{uid})" opacity=".85" filter="url(#ft{uid})"/>'
                  f'<path d="{p(1.0)}" fill="url(#b{uid})"/><path d="{p(0.76)}" fill="url(#p{uid})" filter="url(#fp{uid})"/>'
                  f'<path d="{p(0.46)}" fill="#FFFFFF"/>')

def sun(uid, flat):
    x, y = pt(SUN_T)
    if flat:
        return '', f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{SUN_R}" fill="{ORANGE}"/>'
    return (f'<filter id="fs{uid}" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6"/></filter>',
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="14" fill="{ORANGE}" opacity=".45" filter="url(#fs{uid})"/>'
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{SUN_R + 1.2}" fill="{ORANGE}"/><circle cx="{x:.1f}" cy="{y:.1f}" r="{SUN_R - 0.4}" fill="#FFD9A8"/>'
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{SUN_R - 2}" fill="#FFFFFF"/>')

def draw(v, scene):
    night = scene == 'night'
    d = {'summer': SUMMER, 'winter': WINTER, 'night': WINTER}[scene]
    uid = f'{v["id"]}{scene}'
    if v['id'] == 'now':
        (x0, y0), (x1, y1) = pt(math.pi), pt(0)
        defs = gradient(f'n{uid}', d, ORANGE, ORANGE)
        body = f'<path d="M{x0} {y0} A{RX} {RY} 0 0 1 {x1} {y1}" fill="none" stroke="{ORANGE}" stroke-width="3" stroke-linecap="round"/>'
    else:
        defs, body = saber(uid, *v['w'], d)
    sdefs, sbody = sun(uid, v['id'] == 'now')
    top, bot = NIGHT if night else DAY
    stars = ''
    if night:
        pts = [(30, 26, 1.3), (86, 44, 1), (136, 18, 1.4), (196, 34, 1), (256, 22, 1.3), (308, 52, 1), (354, 28, 1.3), (170, 78, .9), (60, 82, .9), (288, 92, .9)]
        stars = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFFFFF"/>' for x, y, r in pts)
    label = {'summer': '21 июня', 'winter': '21 декабря', 'night': '0:40'}[scene]
    return (f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="{html.escape(v["name"])}, {label}">'
            f'<defs><linearGradient id="sky{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/><stop offset=".8" stop-color="{bot}"/></linearGradient>'
            f'{defs}{sdefs}<clipPath id="above"><rect x="0" y="0" width="{W}" height="{CY}"/></clipPath></defs>'
            f'<rect width="{W}" height="{H}" fill="url(#sky{uid})"/>{stars}'
            f'<g clip-path="url(#above)">{body}{sbody}</g>'
            f'<text x="{CX}" y="150" text-anchor="middle" font-size="40" font-weight="300" fill="{"#EEF2FA" if night else "#000000"}">{label}</text>'
            f'<rect x="8" y="{CY}" width="{W - 16}" height="{H}" rx="20" fill="#F3F3F5" stroke="#FFFFFF" stroke-width="1.5"/></svg>')

def num(x):
    return f'{x:.1f}'.replace('.', ',')

def nums(body, foot):
    return (f'вершина {num(body)} pt → основание {num(foot)} pt · белая жила {num(body * .46)} → {num(foot * .46)} · '
            f'плотное свечение {num(body * 2.1)}, мягкое {num(body * 4.6)}')

V = [
 dict(id='now', name='Сейчас в приложении', what='Ровная линия 3 pt, как в сборке. Точка отсчёта для толщины.', nums='толщина 3 pt по всей дуге'),
 dict(id='g1', name='Г1 · Тонкая', w=(2.4, 4.0), what='Вершина тоньше нынешней линии, ножки чуть шире неё.', nums=nums(2.4, 4.0)),
 dict(id='g2', name='Г2 · Средняя', w=(3.0, 5.0), what='Вершина той же толщины, что линия в приложении сейчас. Шире только ножки.', nums=nums(3.0, 5.0)),
 dict(id='g3', name='Г3 · Плотная', w=(3.6, 6.0), what='На пятую часть толще нынешней линии у вершины, ножки вдвое шире неё.', nums=nums(3.6, 6.0)),
 dict(id='g0', name='Г из прошлого листа', w=(6.4, 11.0), what='Та дуга, которую ты назвал слишком толстой, в этом же масштабе. Прошлый лист был нарисован в 1,4 раза крупнее приложения, и она вышла вдвое с лишним толще нынешней линии.', nums=nums(6.4, 11.0)),
]

CSS = '''
:root{--page:#DCDDE0;--panel:#F7F7F8;--fg:#17181B;--fg2:#55585F;--line:#C9CBD0;
 --sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--page:#1B1C1F;--panel:#26272B;--fg:#ECEDEF;--fg2:#A3A6AD;--line:#3A3C42;color-scheme:dark}}
:root[data-theme="dark"]{--page:#1B1C1F;--panel:#26272B;--fg:#ECEDEF;--fg2:#A3A6AD;--line:#3A3C42;color-scheme:dark}
body{background:var(--page);color:var(--fg);font-family:var(--sans);font-size:15px;line-height:1.45;
 padding-block:24px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.wrap{max-width:1240px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
h1{font-size:26px;font-weight:650;letter-spacing:-.01em;margin:0;text-wrap:balance}
.lead{margin:0;color:var(--fg2);max-width:72ch}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,390px),1fr));gap:16px;align-items:start}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;min-width:0}
.card h2{font-size:17px;font-weight:650;margin:0}
.card p{margin:0;color:var(--fg2);font-size:13.5px}
.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
figure{margin:0;display:flex;flex-direction:column;gap:4px;min-width:0}
svg{width:100%;height:auto;aspect-ratio:390/250;border-radius:10px;border:1px solid var(--line);display:block}
figcaption{font-size:12px;font-weight:600}
.nums{font-family:var(--mono);font-size:11.5px;color:var(--fg2)}
'''
CAP = {'night': 'Небо ночью', 'summer': 'Лето, 21 июня', 'winter': 'Зима, 21 декабря'}

def card(v):
    e = html.escape
    return (f'<section class="card" id="v-{v["id"]}"><h2>{e(v["name"])}</h2><p>{e(v["what"])}</p>'
            f'<figure>{draw(v, "summer")}<figcaption>{CAP["summer"]}</figcaption></figure>'
            f'<div class="pair"><figure>{draw(v, "winter")}<figcaption>{CAP["winter"]}</figcaption></figure>'
            f'<figure>{draw(v, "night")}<figcaption>{CAP["night"]}</figcaption></figure></div>'
            f'<div class="nums">{e(v["nums"])}</div></section>')

page = f'''<meta name="claude:viewport-fit-sides" content="cover">
<title>Дуга на дневном небе</title>
<style>{CSS}</style>
<div class="wrap">
<h1>Вариант Г в трёх толщинах</h1>
<p class="lead">Меч, ножки и белая вершина по солнцу, как ты выбрал. Меняется только толщина. Рисунок теперь в масштабе приложения: размеры дуги взяты из кода, большая картинка на телефоне шириной 390 pt выходит один к одному.</p>
<div class="grid">{''.join(card(v) for v in V)}</div>
</div>'''

out = pathlib.Path(__file__).with_name('arcs.html')
out.write_text(page, encoding='utf-8')
print('written', out, len(page))
