#!/usr/bin/env python3
"""Лист дуги «Света» на светлой теме (палитра Д), второй круг (13.11): дуга как световой меч, ножки умеренно шире,
белая вершина по высоте солнца. Запуск: python3 build.py → arcs.html рядом.
Первый круг (кант, стекло, ножки 5а–5в) — в истории git, коммит a0683b1."""
import html, math, pathlib

ORANGE = '#F09329'
DAY = ('#86BAEC', '#DCEBF9')
NIGHT = ('#0E1A3A', '#1E2B4A')
CX, CY, R = 150.0, 150.0, 118.0
SUN_T = math.radians(142)
LAT = 53.35                                # Барнаул: город со снимков Алексея

def mix(a, b, t):
    a, b = a.lstrip('#'), b.lstrip('#')
    ch = [round(int(a[i:i + 2], 16) * (1 - t) + int(b[i:i + 2], 16) * t) for i in (0, 2, 4)]
    return '#%02X%02X%02X' % tuple(ch)

def legs(body, foot, k=1.0):
    """Контур дуги: толщина body у вершины, ровно растёт до foot у оснований. k — множитель (жила, свечение)."""
    out, inn = [], []
    for i in range(0, 181, 2):
        t = math.radians(180 - i)
        w = (body + (foot - body) * (1 - min(i, 180 - i) / 90)) * k
        out.append((CX + (R + w / 2) * math.cos(t), CY - (R + w / 2) * math.sin(t)))
        inn.append((CX + (R - w / 2) * math.cos(t), CY - (R - w / 2) * math.sin(t)))
    return 'M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in out + inn[::-1]) + ' Z'

# ---- Высота солнца по дуге: f = доля светового дня от восхода (0) до заката (1)
def day(decl):
    phi, d = math.radians(LAT), math.radians(decl)
    h0 = math.acos(-math.tan(phi) * math.tan(d))
    elev = lambda f: math.degrees(math.asin(math.sin(phi) * math.sin(d) + math.cos(phi) * math.cos(d) * math.cos(h0 * (2 * f - 1))))
    return dict(hours=2 * math.degrees(h0) / 15, emax=elev(0.5), elev=elev)

GOLD, HIGH = 6.0, 30.0                    # золотой час кончается на 6°; «высокое» солнце с 30°
def white(d, f):
    """0 — оранжевый, 1 — белый. Полный белый с 30°, а если солнце за день так не поднимается — с 0,8 своей высшей точки."""
    top = min(HIGH, 0.8 * d['emax'])
    x = max(0.0, min(1.0, (d['elev'](f) - GOLD) / (top - GOLD)))
    return x * x * (3 - 2 * x)

def shares(d):
    n = 2000
    ws = [white(d, i / n) for i in range(n + 1)]
    full = sum(w >= 0.99 for w in ws) / len(ws)
    none = sum(w <= 0.01 for w in ws) / len(ws)
    return full, none

SUMMER, WINTER = day(23.44), day(-23.44)

def gradient(gid, d, c0, c1, strength=1.0):
    stops = []
    for i in range(0, 41):
        f = i / 40
        off = (1 - math.cos(math.pi * f)) / 2                    # положение по x при равномерном ходе по дуге
        stops.append(f'<stop offset="{off:.4f}" stop-color="{mix(c0, c1, white(d, f) * strength)}"/>')
    return (f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{CX - R}" y1="0" x2="{CX + R}" y2="0">' + ''.join(stops) + '</linearGradient>')

def saber(uid, body, foot, d=None):
    """Дуга-меч: широкая светлая жила, тонкая оранжевая кромка, плотное свечение вплотную и мягкое широкое вокруг."""
    defs = ''
    if d:
        defs = (gradient(f'w{uid}', d, ORANGE, '#FFFFFF', 0.55) + gradient(f't{uid}', d, ORANGE, '#FFFFFF', 0.7)
                + gradient(f'b{uid}', d, ORANGE, '#FFF4E4') + gradient(f'p{uid}', d, '#FFD9A8', '#FFFFFF'))
        wide, tight, edge, peach = f'url(#w{uid})', f'url(#t{uid})', f'url(#b{uid})', f'url(#p{uid})'
    else:
        wide = tight = edge = ORANGE; peach = '#FFD9A8'
    p = lambda k: legs(body, foot, k)
    return defs, (f'<path d="{p(4.6)}" fill="{wide}" opacity=".40" filter="url(#blur7)"/>'
                  f'<path d="{p(2.1)}" fill="{tight}" opacity=".85" filter="url(#blur2)"/>'
                  f'<path d="{p(1.0)}" fill="{edge}"/><path d="{p(0.76)}" fill="{peach}" filter="url(#blur05)"/>'
                  f'<path d="{p(0.46)}" fill="#FFFFFF"/>')

def sun(flat):
    x, y = CX + R * math.cos(SUN_T), CY - R * math.sin(SUN_T)
    if flat:
        return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="7" fill="{ORANGE}"/>'
    return (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="15" fill="{ORANGE}" opacity=".45" filter="url(#blur7)"/>'
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="{ORANGE}"/><circle cx="{x:.1f}" cy="{y:.1f}" r="6.2" fill="#FFD9A8"/>'
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.6" fill="#FFFFFF"/>')

def draw(v, scene):
    night = scene == 'night'
    d = {'summer': SUMMER, 'winter': WINTER, 'night': WINTER, 'day': None}[scene] if v.get('light') else None
    uid = f'{v["id"]}{scene}'
    if v['id'] == 'flat':
        defs, body = '', f'<path d="M{CX - R} {CY} A{R} {R} 0 0 1 {CX + R} {CY}" fill="none" stroke="{ORANGE}" stroke-width="3"/>'
    else:
        defs, body = saber(uid, *v['w'], d=d)
    top, bot = NIGHT if night else DAY
    stars = ''
    if night:
        pts = [(24, 20, 1.1), (66, 34, .8), (104, 14, 1.2), (150, 26, .8), (196, 18, 1.1), (236, 40, .8), (272, 22, 1.1), (130, 60, .7), (46, 62, .7), (220, 70, .7)]
        stars = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFFFFF"/>' for x, y, r in pts)
    label = {'summer': '21 июня', 'winter': '21 декабря', 'night': '0:40', 'day': '13:05'}[scene]
    return (f'<svg viewBox="0 0 300 176" role="img" aria-label="{html.escape(v["name"])}, {label}">'
            f'<defs><linearGradient id="sky{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/><stop offset=".85" stop-color="{bot}"/></linearGradient>'
            f'{defs}<filter id="blur7" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>'
            f'<filter id="blur2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>'
            f'<filter id="blur05" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.5"/></filter>'
            f'<clipPath id="above"><rect x="0" y="0" width="300" height="{CY}"/></clipPath></defs>'
            f'<rect width="300" height="176" fill="url(#sky{uid})"/>{stars}'
            f'<g clip-path="url(#above)">{body}{sun(v["id"] == "flat")}</g>'
            f'<text x="{CX}" y="112" text-anchor="middle" font-size="26" font-weight="300" fill="{"#EEF2FA" if night else "#000000"}">{label}</text>'
            f'<rect x="8" y="{CY}" width="284" height="40" rx="12" fill="#F3F3F5" stroke="#FFFFFF" stroke-width="1.5"/></svg>')

def hm(h):
    return f'{int(h)} ч {round((h - int(h)) * 60):02d} м'

sf, sn = shares(SUMMER); wf, wn = shares(WINTER)
LIGHT_NUMS = (f'лето: белая {sf * 100:.0f} % дуги ≈ {hm(sf * SUMMER["hours"])}, оранжевые концы по {sn * 50:.0f} % · '
              f'зима: белая {wf * 100:.0f} % ≈ {hm(wf * WINTER["hours"])}, оранжевые концы по {wn * 50:.0f} %')

V = [
 dict(id='flat', name='0 · Как в карточке Д', scenes=('day', 'day', 'night'),
      what='Ровная оранжевая линия 3 pt, для сравнения.', nums='толщина 3'),
 dict(id='saber', name='А · Меч', w=(5.4, 5.4), scenes=('day', 'day', 'night'),
      what='Второй вариант, перерисованный по мечу: жила широкая и светлая, оранжевого на самой дуге только тонкая кромка, свет уходит в два слоя свечения вокруг.',
      nums='дуга 5,4: белая жила 2,5, персиковый переход 4,1, кромка оранжевая · свечение плотное 11 и мягкое 25'),
 dict(id='saberlegs', name='Б · Меч с ножками', w=(4.6, 8.0), scenes=('day', 'day', 'night'),
      what='То же, ножки шире. От 5а отличается так, как ты просил: вершина толще (было 3,4), ножки уже (было 10,2).',
      nums='вершина 4,6 → основание 8,0 (в 1,7 раза; в 5а было в 3 раза)'),
 dict(id='light', name='В · Белая вершина по солнцу', w=(5.4, 5.4), light=True, scenes=('summer', 'winter', 'night'),
      what='Оранжевая у восхода и заката, белая там, где солнце высоко. Длина белого участка считается по высоте солнца в этот день: летом он длинный, зимой короткий.',
      nums=LIGHT_NUMS),
 dict(id='lightlegs', name='Г · Всё вместе', w=(4.6, 8.0), light=True, scenes=('summer', 'winter', 'night'),
      what='Меч, ножки и белая вершина по солнцу в одной дуге.',
      nums='вершина 4,6 → основание 8,0 · ' + LIGHT_NUMS),
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
.lead{margin:0;color:var(--fg2);max-width:70ch}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px;align-items:start}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;min-width:0}
.card h2{font-size:17px;font-weight:650;margin:0}
.card p{margin:0;color:var(--fg2);font-size:13.5px}
.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
figure{margin:0;display:flex;flex-direction:column;gap:4px;min-width:0}
svg{width:100%;height:auto;aspect-ratio:300/176;border-radius:10px;border:1px solid var(--line);display:block}
figcaption{font-size:12px;font-weight:600}
.nums{font-family:var(--mono);font-size:11.5px;color:var(--fg2)}
.rule{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.rule h2{font-size:16px;margin:0 0 6px}.rule ul{margin:0;padding-left:18px;color:var(--fg2);max-width:82ch}.rule li{margin:3px 0}
'''
CAP = {'day': 'Небо днём', 'night': 'Небо ночью', 'summer': 'Лето, 21 июня', 'winter': 'Зима, 21 декабря'}

def card(v):
    e = html.escape; a, b, c = v['scenes']
    return (f'<section class="card" id="v-{v["id"]}"><h2>{e(v["name"])}</h2><p>{e(v["what"])}</p>'
            f'<figure>{draw(v, a)}<figcaption>{CAP[a]}</figcaption></figure>'
            f'<div class="pair"><figure>{draw(v, b)}<figcaption>{CAP[b]}</figcaption></figure>'
            f'<figure>{draw(v, c)}<figcaption>{CAP[c]}</figcaption></figure></div>'
            f'<div class="nums">{e(v["nums"])}</div></section>')

page = f'''<meta name="claude:viewport-fit-sides" content="cover">
<title>Дуга на дневном небе</title>
<style>{CSS}</style>
<div class="wrap">
<h1>Дуга на дневном небе, второй круг</h1>
<p class="lead">Дуга как световой меч в цветах палитры Д: светлая жила и свечение вокруг. Отдельно ножки умеренной ширины и белая вершина, длина которой считается по высоте солнца. Лето и зима посчитаны для Барнаула.</p>
<div class="grid">{''.join(card(v) for v in V)}</div>
<div class="rule"><h2>Как считается белая вершина</h2><ul>
<li>Пока солнце ниже {GOLD:.0f}° над горизонтом, дуга оранжевая: это золотой час.</li>
<li>Выше {GOLD:.0f}° дуга плавно белеет и становится полностью белой, когда солнце поднимается на {HIGH:.0f}°.</li>
<li>Зимой солнце до {HIGH:.0f}° не доходит. Тогда белой становится самая высокая часть дня: от 0,8 наибольшей высоты солнца за эти сутки.</li>
<li>Барнаул, 21 июня: день {hm(SUMMER["hours"])}, солнце до {SUMMER["emax"]:.0f}°. Белая часть {sf * 100:.0f} % дуги, около {hm(sf * SUMMER["hours"])}.</li>
<li>Барнаул, 21 декабря: день {hm(WINTER["hours"])}, солнце до {WINTER["emax"]:.0f}°. Белая часть {wf * 100:.0f} % дуги, около {hm(wf * WINTER["hours"])}.</li>
<li>Пороги {GOLD:.0f}°, {HIGH:.0f}° и 0,8 предложены оркестратором, их можно двигать.</li>
</ul></div>
</div>'''

out = pathlib.Path(__file__).with_name('arcs.html')
out.write_text(page, encoding='utf-8')
print('written', out, len(page))
print(LIGHT_NUMS)
print('лето день %.2f ч emax %.1f · зима день %.2f ч emax %.1f' % (SUMMER['hours'], SUMMER['emax'], WINTER['hours'], WINTER['emax']))
