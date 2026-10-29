"""«Свет» стеклом: артборды холста из разметки беты (frag/*.frag.html) и данных беты.
Небо над дугой считается формулой беты `skyPalette` (зенит → розовые облака → алый → горизонт),
перенесённой сюда; перенос сверяется с плашкой неба в снимке (--check).
Usage: python3 gen_glass.py <beta_css_url> <glass_css_url> [--test <dir>] [--check]"""
import html as H
import json
import math
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.join(HERE, '..', 'project')
BETA_CSS, GLASS_CSS = sys.argv[1], sys.argv[2]
TEST = sys.argv[sys.argv.index('--test') + 1] if '--test' in sys.argv else None
MOON_IMG = sys.argv[sys.argv.index('--moon') + 1] if '--moon' in sys.argv else None
MOON = json.load(open(os.path.join(HERE, 'data', 'moon.json'), encoding='utf-8'))


# ---------- разбор снимка беты ----------
def frag(name):
    return open(os.path.join(HERE, 'frag', name + '.frag.html'), encoding='utf-8').read()


def text(s):
    return H.unescape(re.sub(r'<[^>]+>', '', s)).replace('\xa0', ' ').strip()


def by_id(f, i):
    m = re.search(r'id="%s"[^>]*>(.*?)</(?:span|div|button)>' % i, f, re.S)
    return text(m.group(1)) if m else ''


def t_value(f, tid):
    m = re.search(r'<span[^>]*id="%s"[^>]*>(.*?)</span></div>' % tid, f, re.S)
    return text(m.group(1)) if m else ''


def p_rows(f):
    body = f[f.find('id="proBody"'):]
    out, group = [], ''
    for m in re.finditer(r'<div class="pro-group">.*?<span>(.*?)</span></div>|<div class="p-row"><span class="k">(.*?)</span><span class="v[^"]*">(.*?)</span></div>', body, re.S):
        if m.group(1) is not None:
            group = text(m.group(1))
        else:
            out.append((group, text(m.group(2)), text(m.group(3))))
    return out


def row(rows, group, key):
    for g, k, v in rows:
        if g == group and k == key:
            return v
    return ''


def mins(hhmm):
    h, m = hhmm.split(':')
    return int(h) * 60 + int(m)


def hm(total):
    return '%d ч %02d м' % (total // 60, total % 60)


# ---------- небо: формула беты ----------
STOPS = {'zenith': (56, 62, 82), 'high': (214, 124, 148), 'mid': (226, 116, 74), 'horizon': (247, 196, 118)}
DEAD = (92, 92, 96)


def clamp(x, a, b):
    return max(a, min(b, x))


def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def rgb(c):
    return 'rgb(%d,%d,%d)' % tuple(int(math.floor(v + .5)) for v in c)


def sky_palette(score, low, mid, high, hum):
    """Порт skyPalette (beta/index.html, «Палитра предсказанного неба»)."""
    s = score / 100.0
    wash = clamp((hum - 65) / 45.0, 0, .45)
    life = clamp(s * 1.15, 0, 1) * (1 - wash * .6)
    mix = lambda c, k: lerp(DEAD, c, clamp(k, 0, 1))
    gap = clamp(1 - low / 70.0, 0, 1)
    return {'zenith': mix(STOPS['zenith'], .35 + life * .4),
            'high': mix(STOPS['high'], life * clamp(high / 55.0, .25, 1) * gap),
            'mid': mix(STOPS['mid'], life * clamp(mid / 55.0, .3, 1) * gap),
            'horizon': mix(STOPS['horizon'], life * gap), 'life': life * gap}


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mixpal(over, clear, t):
    return {k: lerp(hexc(over[i]), hexc(clear[i]), t) for i, k in enumerate(('zenith', 'high', 'mid', 'horizon'))} | {'life': t}


def day_palette(clouds):
    return mixpal(('#586070', '#687080', '#7f8794', '#a1a8b3'), ('#3f78c4', '#5f98d6', '#86b4e2', '#b9d7f0'), 1 - clouds / 100.0)


def night_palette(clouds):
    return mixpal(('#0c0f18', '#10131c', '#171a24', '#22262f'), ('#070b1f', '#0c1438', '#141f52', '#2a3270'), 1 - clouds / 100.0)


def rgba(c, a):
    return 'rgba(%d,%d,%d,%.2f)' % (round(c[0]), round(c[1]), round(c[2]), a)


# ---------- значки ----------
GO = '<svg class="go" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4l8 8-8 8"></path></svg>'
ICON = {
    'sunset': '<path d="M3 18h18M7.5 18a4.5 4.5 0 0 1 9 0"></path><path d="M12 3.5v3.4M5.5 8l1.5 1.5M18.5 8l-1.5 1.5"></path>',
    'sun': '<circle cx="12" cy="12" r="4"></circle><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M2.5 12h2M19.5 12h2M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5"></path>',
    'moon': '<path d="M19 13.5A7.5 7.5 0 1 1 10.5 5a6 6 0 0 0 8.5 8.5z"></path>',
    'cloud': '<path d="M7.5 18h8.5a3.6 3.6 0 0 0 .4-7.2 5 5 0 0 0-9.6-1.3A3.7 3.7 0 0 0 7.5 18z"></path>',
    'wind': '<path d="M3 9h11a3 3 0 1 0-3-3"></path><path d="M3 14h15a3 3 0 1 1-3 3"></path>',
    'drop': '<path d="M12 3.5c3.6 4.4 5.5 7.3 5.5 10a5.5 5.5 0 0 1-11 0c0-2.7 1.9-5.6 5.5-10z"></path>',
    'pin': '<path d="M20 10c0 6-8 11-8 11s-8-5-8-11a8 8 0 0 1 16 0z"></path><circle cx="12" cy="10" r="2.6"></circle>',
}


def ic(name, cls='ic'):
    return '<svg class="%s" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % (cls, ICON[name])


# ---------- кадр ----------
class Frame:
    def __init__(self, snap, moon, at, phase, theme, example=None):
        self.f = frag(snap)
        self.rows = p_rows(self.f)
        self.moon = MOON[moon]
        self.mk = moon
        self.at, self.phase, self.theme = at, phase, theme
        r = self.rows
        self.example = example
        tx = t_value(self.f, 'tSunset')
        self.score = int(re.search(r'(\d+)\s*/\s*100', tx).group(1))
        self.layers = [int(re.match(r'(\d+)', row(r, 'Прогноз заката', k)).group(1)) for k in ('Нижний ярус', 'Средний ярус', 'Верхний ярус')]
        self.hum = int(row(r, 'Прогноз заката', 'Влажность').strip('%'))
        self.clouds = int(row(r, 'Погода', 'Облачность').strip('%'))
        self.sky_word = row(r, 'Погода', 'Небо')
        if example:
            self.score, self.layers, self.hum, self.clouds, self.sky_word = example['score'], example['layers'], example['hum'], example['clouds'], example['sky']
        low, mid, high = self.layers
        self.sunset_pal = sky_palette(self.score, low, mid, high, self.hum)
        self.pal = self.sunset_pal if phase == 'evening' else day_palette(self.clouds) if phase == 'day' else night_palette(self.clouds)
        # светлая тема: тёмные чернила должны читаться на небе, поэтому небо светлеет к белому на 55 %
        self.view = self.pal if theme == 'dark' else {k: (lerp(v, (255, 255, 255), .55) if k != 'life' else v) for k, v in self.pal.items()}
        self.rise = row(r, 'Ход дня', 'Восход').split(' · ')[0]
        self.set = row(r, 'Ход дня', 'Закат').split(' · ')[0]
        self.gold = row(r, 'Золотой и синий час', 'Золотой час вечером')
        self.gold_a, self.gold_b = re.findall(r'\d\d:\d\d', self.gold)[:2]

    def hero_bg(self, p):
        dark = self.theme == 'dark'
        base = '#0b0908' if dark else '#eee8de'
        k = .55 if dark else .82
        return ('linear-gradient(180deg, %s 0%%, %s 38%%, %s 72%%, %s 100%%), %s') % (
            rgba(p['zenith'], k), rgba(p['high'], k - .05), rgba(p['mid'], k - .08), rgba(p['horizon'], k), base)

    def tokens(self):
        p, dark = self.view, self.theme == 'dark'
        base = '#0b0908' if dark else '#eee8de'
        a1, a2 = (.55, .22) if dark else (.62, .30)
        page = ('radial-gradient(130%% 52%% at 50%% -6%%, %s, %s 46%%, transparent 78%%), '
                'radial-gradient(70%% 28%% at 105%% 24%%, %s, transparent 70%%), %s') % (
            rgba(p['mid'], a1), rgba(p['high'], a2), rgba(p['horizon'], .30 if dark else .38), base)
        k = .55 if dark else .82
        hero = ('linear-gradient(180deg, %s 0%%, %s 38%%, %s 72%%, %s 100%%), %s') % (
            rgba(p['zenith'], k), rgba(p['high'], k - .05), rgba(p['mid'], k - .08), rgba(p['horizon'], k), base)
        detail = ('linear-gradient(180deg, %s 0px, %s 110px, %s 230px, %s 346px, %s 560px, %s 100%%)') % (
            rgb(p['zenith']), rgb(p['high']), rgb(p['mid']), rgb(p['horizon']), base, base)
        glow = rgba(p['horizon'], .16 + .22 * p['life'])
        land = 'rgba(10,8,8,.78)' if dark else 'rgba(130,108,92,.30)'
        return ('--g-page:%s;--g-hero:%s;--g-detail:%s;--g-tile-glow:%s;--g-base:%s;--g-land:%s;') % (page, hero, detail, glow, base, land)


# ---------- купол ----------
DOME_PATH = 'M 32 196 A 163 148 0 0 1 358 196 Z'


def dome(fr, uid, raw=None, view=None):
    f = fr.f
    if raw is None:
        a, b = f.find('<div class="dome">'), f.find('<div class="next-light">')
        d = f[a:b].rstrip()
    else:
        d = raw
    d = re.sub(r'<button class="sky-swap".*?</button>', '', d, flags=re.S)
    d = d.replace('<svg viewBox="0 0 390 240">', '<svg viewBox="0 30 390 190">', 1)
    p = view or fr.view
    tone, a_top, a_mid = ('#000', .60, .55) if fr.theme == 'dark' else ('#fff', .45, .40)
    gx = re.search(r'id="glow" cx="([\d.]+)"', d)
    gx = float(gx.group(1)) if gx else 330.0
    defs = ('<linearGradient id="sk%s" x1="0" y1="48" x2="0" y2="196" gradientUnits="userSpaceOnUse">'
            '<stop offset="0" stop-color="%s"></stop><stop offset=".38" stop-color="%s"></stop>'
            '<stop offset=".72" stop-color="%s"></stop><stop offset="1" stop-color="%s"></stop></linearGradient>'
            '<radialGradient id="sg%s" cx="50%%" cy="100%%" r="70%%"><stop offset="0" stop-color="%s" stop-opacity="%.2f"></stop>'
            '<stop offset="1" stop-color="%s" stop-opacity="0"></stop></radialGradient>'
            '<linearGradient id="dk%s" x1="0" y1="48" x2="0" y2="196" gradientUnits="userSpaceOnUse">'
            '<stop offset="0" stop-color="%s" stop-opacity="%.2f"></stop><stop offset=".62" stop-color="%s" stop-opacity="%.2f"></stop>'
            '<stop offset="1" stop-color="%s" stop-opacity="0"></stop></linearGradient>'
            '<clipPath id="dc%s"><path d="%s"></path></clipPath>') % (
        uid, rgb(p['zenith']), rgb(p['high']), rgb(p['mid']), rgb(p['horizon']),
        uid, rgb(p['horizon']), .15 + .55 * p['life'], rgb(p['horizon']),
        uid, tone, a_top, tone, a_mid, tone, uid, DOME_PATH)
    fill = ('<g clip-path="url(#dc%s)"><rect x="0" y="40" width="390" height="160" fill="url(#sk%s)"></rect>'
            '<ellipse cx="%.1f" cy="196" rx="170" ry="96" fill="url(#sg%s)"></ellipse>'
            '<rect x="0" y="40" width="390" height="160" fill="url(#dk%s)"></rect></g>') % (uid, uid, gx, uid, uid)
    d = d.replace('</defs>', defs + '</defs>' + fill, 1)
    return d


MOONDOME = {k: open(os.path.join(HERE, 'data', 'dome_moon_%s.html' % k), encoding='utf-8').read() for k in ('eve', 'day', 'night')}
HERO_MODE = 'sun' if TEST else 'both'


def _sw(icon, label):
    return ('<button type="button" class="gh-sw" aria-label="%s" onClick="{{toggle}}"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg></button>') % (label, ICON[icon])


def _add():
    # та же иконка, что была у строки «Запланировать съёмку» в беты: календарь с плюсом
    return ('<button type="button" class="gh-add" aria-label="Запланировать съёмку"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            '<rect x="3" y="4.5" width="18" height="17" rx="2.5"></rect><path d="M3 9.5h18M8 2.5v4M16 2.5v4M12 12.5v5M9.5 15h5"></path></svg></button>')


def moon_view(fr):
    p = night_palette(fr.clouds)
    return p if fr.theme == 'dark' else {k: (lerp(v, (255, 255, 255), .55) if k != 'life' else v) for k, v in p.items()}


def hero(fr, uid, href=None, mode=None):
    """Карточка с куполом. Без mode — просто купол (сравнения). С mode — переключатель в правом верхнем углу:
    значок луны открывает лунный купол (его разметка из беты), значок солнца возвращает солнечный."""
    if mode is None:
        return '<div class="gl-glass gh"><div class="gh-dome">%s</div></div>' % dome(fr, uid)
    sun = '<div class="gl-glass gh top">%s<div class="gh-dome">%s</div></div>' % (_sw('moon', 'Показать луну'), dome(fr, uid))
    mv = moon_view(fr)
    moon = '<div class="gl-glass gh top" style="background: %s">%s<div class="gh-dome">%s</div></div>' % (
        fr.hero_bg(mv), _sw('sun', 'Показать солнце'), dome(fr, uid + 'm', MOONDOME[fr.mk], mv))
    if mode == 'sun':
        return sun
    if mode == 'moon':
        return moon
    return '<sc-if value="{{sun}}" hint-placeholder-val="{{ true }}">%s</sc-if><sc-if value="{{moon}}" hint-placeholder-val="{{ false }}">%s</sc-if>' % (sun, moon)



# ---------- купол-кольцо: день сверху, ночь снизу, матовое стекло по горизонту ----------
RS, RC, RR = 340, 170, 155   # размер, центр и радиус кольца в пикселях


def ring_pos_sun(now, rise, set_):
    """Верхняя половина кольца — светлая часть суток от восхода до заката, нижняя — ночь от заката до восхода; горизонт ровно по диаметру."""
    if rise <= now <= set_:
        return ('up', (now - rise) / float(set_ - rise))
    return ('down', clamp(((now - set_) % 1440) / float(1440 - (set_ - rise)), 0, 1))


def ring_pos_moon(now, rise, set_):
    """Луна над горизонтом от восхода до захода следующих суток (по времени беты), под горизонтом — от захода до восхода."""
    up_len = float((1440 - rise) + set_)
    if now >= rise:
        return ('up', (now - rise) / up_len)
    if now < set_:
        return ('up', ((1440 - rise) + now) / up_len)
    return ('down', (now - set_) / float(rise - set_))


def sky_bg(fr, pal):
    """Небо на весь верх экрана, не только внутри кольца: зенит → розовые облака → алый → горизонт ровно на линии стекла (y = 215),
    ниже горизонта цвет уходит в фон страницы."""
    base = hexc('#0b0908') if fr.theme == 'dark' else hexc('#eee8de')
    hz = 50 + RC   # верх кольца стоит на 50 px от края кадра, горизонт — на уровне его центра
    stops = [(0, pal['zenith']), (90, pal['high']), (hz - 45, pal['mid']), (hz, pal['horizon']), (hz + 85, lerp(pal['mid'], base, .62)), (hz + 215, base)]
    return 'linear-gradient(180deg, %s)' % ', '.join('%s %dpx' % (rgb(c), y) for y, c in stops)


def ring_svg(uid, pal, pos, knob, warm=True):
    """Кольцо с градиентом дуги беты: у горизонта янтарь и краснее, к зениту светлеет до цвета дуги; ночная половина уходит в холодный тон.
    Градиент вертикальный, поэтому обе стороны теплеют у горизонта одинаково. Луна — тот же ход, но серебристо-голубой."""
    th = math.pi * (1 - pos[1]) if pos[0] == 'up' else -math.pi * pos[1]
    kx, ky = RC + RR * math.cos(th), RC - RR * math.sin(th)
    hz = (232, 104, 58) if warm else (150, 176, 226)
    mid = (226, 164, 76) if warm else (190, 206, 240)
    x0, x1 = RC - RR, RC + RR
    up = 'M %d %d A %d %d 0 0 1 %d %d' % (x0, RC, RR, RR, x1, RC)
    dn = 'M %d %d A %d %d 0 0 0 %d %d' % (x0, RC, RR, RR, x1, RC)
    return ('<svg class="ring" viewBox="0 0 %d %d" width="%d" height="%d" aria-hidden="true"><defs>'
            '<linearGradient id="rgu%s" x1="0" y1="%d" x2="0" y2="%d" gradientUnits="userSpaceOnUse">'
            '<stop offset="0" style="stop-color: var(--arc-mid); stop-opacity: .78"></stop><stop offset=".45" style="stop-color: var(--arc-mid); stop-opacity: .5"></stop>'
            '<stop offset=".76" stop-color="%s" stop-opacity=".95"></stop><stop offset="1" stop-color="%s"></stop></linearGradient>'
            '<linearGradient id="rgd%s" x1="0" y1="%d" x2="0" y2="%d" gradientUnits="userSpaceOnUse">'
            '<stop offset="0" stop-color="%s" stop-opacity=".9"></stop><stop offset=".3" stop-color="%s" stop-opacity=".45"></stop><stop offset="1" stop-color="rgb(110,126,162)" stop-opacity=".4"></stop></linearGradient>'
            '<linearGradient id="rk%s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0bd"></stop><stop offset="1" stop-color="#d8b36c"></stop></linearGradient>'
            '<filter id="rb%s" x="-80%%" y="-80%%" width="260%%" height="260%%"><feGaussianBlur stdDeviation="9"></feGaussianBlur></filter>'
            '<filter id="rs%s" x="-80%%" y="-80%%" width="260%%" height="260%%"><feGaussianBlur stdDeviation="2.6"></feGaussianBlur></filter>'
            '<filter id="rl%s" x="-20%%" y="-20%%" width="140%%" height="140%%"><feGaussianBlur stdDeviation="5"></feGaussianBlur></filter></defs>'
            '<path d="%s" fill="none" stroke="url(#rgd%s)" stroke-width="14" opacity=".34" filter="url(#rl%s)"></path>'
            '<path d="%s" fill="none" stroke="url(#rgu%s)" stroke-width="3"></path><path d="%s" fill="none" stroke="url(#rgd%s)" stroke-width="3"></path>%s</svg>') % (
        RS, RS, RS, RS, uid, RC - RR, RC, rgb(mid), rgb(hz), uid, RC, RC + RR, rgb(hz), rgb(mid), uid, uid, uid, uid,
        dn, uid, uid, up, uid, dn, uid, knob(kx, ky, uid, pal, pos[0] == 'down'))


def knob_sun(x, y, uid, e, theme):
    """Солнце как у купола беты: цвет по лестнице неба от высоты e, плоский диск с кромкой, гаснет за 3° под горизонтом;
    ниже — пятно-призрак (на глубине берёт цвет «чужого неба»), оно видно сквозь матовое стекло всю ночь."""
    c = sky_color(e)
    v = 1.0 if e >= 0 else max(0.0, 1 + e / 3.0)
    ink = c if theme == 'dark' else lerp(c, (0, 0, 0), .22)
    deep_c, below = c, -e - 18
    if below > 0:
        other = sky_color(-e)
        if theme == 'light':
            other = tuple(int(round(v_ * .55)) for v_ in other)
        deep_c = lerp(c, other, clamp(below / 6.0, 0, 1))
    deep = clamp(-e / 3.0, 0, 1) * max(2.0 / 3, clamp((12 + e) / 9.0, 0, 1))
    k = 2.6   # на кольце пятно крупнее и плотнее, чем на куполе, иначе его не видно сквозь матовое стекло плиток
    return ('<defs><radialGradient id="rg%s" cx="50%%" cy="50%%" r="50%%"><stop offset="0" stop-color="%s" stop-opacity="%.3f"></stop>'
            '<stop offset=".42" stop-color="%s" stop-opacity="%.3f"></stop><stop offset="1" stop-color="%s" stop-opacity="0"></stop></radialGradient></defs>'
            '<circle cx="%.1f" cy="%.1f" r="58" fill="url(#rg%s)" opacity="%.3f"></circle>'
            '<circle cx="%.1f" cy="%.1f" r="19" fill="%s" fill-opacity="%.3f" stroke="%s" stroke-opacity="%.3f" stroke-width="1.2"></circle>'
            '<circle cx="%.1f" cy="%.1f" r="8.5" fill="%s" opacity="%.2f" stroke="var(--surface)" stroke-width="2.5"></circle>') % (
        uid, rgb(deep_c), min(.34 * k, .9), rgb(deep_c), min(.13 * k, .55), rgb(deep_c), x, y, uid, deep,
        x, y, rgb(c), .18 * v, rgb(c), .34 * v, x, y, rgb(ink), v)


def _panel(time_, phase, sense, uid):
    return ('<div class="gl-glass hp"><svg class="hp-grain" aria-hidden="true"><filter id="gr%s"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"></feTurbulence>'
            '<feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0"></feColorMatrix></filter><rect width="100%%" height="100%%" filter="url(#gr%s)" opacity=".08"></rect></svg>'
            '<div class="hp-t">%s</div><div class="hp-p">%s</div><div class="hp-s">%s</div></div>') % (uid, uid, time_, phase, sense)


def ring_hero(fr, uid, mode='sun'):
    """Кольцо с солнцем или луной и матовое стекло ровно по горизонту: на стекле время, фаза и подпись света. Переключатель — справа сверху."""
    f = fr.f
    now = mins(fr.at)
    sun_pos = ring_pos_sun(now, mins(fr.rise), mins(fr.set))
    sun_e = sun_model(fr)[0](now)
    sun = ('<div class="hero2"><i class="sky" style="background: %s"></i>%s%s%s%s</div>') % (
        sky_bg(fr, fr.view), ring_svg(uid, fr.view, sun_pos, lambda x, y, u_, pal, down: knob_sun(x, y, u_, sun_e, fr.theme)), _panel(by_id(f, 'drTime'), by_id(f, 'drPhase'), by_id(f, 'drSense'), uid), _add(), _sw('moon', 'Показать луну'))
    mo, mv, md = fr.moon, moon_view(fr), MOONDOME[fr.mk]
    mpos = ring_pos_moon(now, mins(mo['rise']), mins(mo['set']))
    waxing = mo['phase'].startswith('Раст')

    def knob_moon(x, y, u_, pal, down=False):
        inner = moon_glyph(mo['pct'], waxing, 'mk' + u_, 30).replace('<svg ', '<svg x="%.1f" y="%.1f" ' % (x - 15, y - 15), 1) if MOON_IMG else moon_svg(mo['pct'], waxing).replace('<svg ', '<svg x="%.1f" y="%.1f" width="30" height="30" ' % (x - 15, y - 15), 1)
        body = '<circle cx=\"%.1f\" cy=\"%.1f\" r=\"17\" fill=\"none\" stroke=\"#fff\" stroke-width=\"3\"></circle>%s' % (x, y, inner)
        if not down:
            return body
        return ('<circle cx=\"%.1f\" cy=\"%.1f\" r=\"34\" fill=\"rgb(168,189,216)\" opacity=\".35\" filter=\"url(#rb%s)\"></circle><g opacity=\".85\">%s</g>') % (x, y, u_, body)

    moon = ('<div class="hero2"><i class="sky" style="background: %s"></i>%s%s%s%s</div>') % (
        sky_bg(fr, mv), ring_svg(uid + 'm', mv, mpos, knob_moon, False), _panel(by_id(md, 'drTime'), by_id(md, 'drPhase'), by_id(md, 'drSense'), uid + 'm'), _add(), _sw('sun', 'Показать солнце'))
    if mode == 'sun':
        return sun
    if mode == 'moon':
        return moon
    return '<sc-if value="{{sun}}" hint-placeholder-val="{{ true }}">%s</sc-if><sc-if value="{{moon}}" hint-placeholder-val="{{ false }}">%s</sc-if>' % (sun, moon)


def block(f, marker):
    """Целиком элемент <div …> от marker до парного </div>."""
    a = f.find(marker)
    depth = 0
    for m in re.finditer(r'<div\b|</div>', f[a:]):
        depth += 1 if m.group(0) != '</div>' else -1
        if depth == 0:
            return f[a:a + m.end()]
    return ''


def flat_dates(timebar):
    """Барабан дат беты (тёмная линза, рамка, блик) → плоский ряд из пяти дней: подпись и значок погоды, выбранный день — плашка."""
    cells = re.findall(r'<div class="drum-cell( center)?"[^>]*><span class="dc-num">(.*?)</span><span class="dc-ic">(.*?)</span></div>', timebar, re.S)
    ci = [i for i, c in enumerate(cells) if c[0]][0]
    row5 = cells[ci - 2:ci + 3]
    dd = '<div class="dd">%s</div>' % ''.join(
        '<button type="button" class="d%s"><span class="n">%s</span><span class="ic">%s</span></button>' % (' on' if c[0] else '', text(c[1]), c[2]) for c in row5)
    if not TEST:
        dd = '<sc-if value="{{datesOpen}}" hint-placeholder-val="{{ true }}">%s</sc-if>' % dd
    old = block(timebar, '<div class="ribbon-wrap drum">')
    assert old
    out = timebar.replace(old, dd, 1)
    chev = ('<button type="button" class="dd-chev" aria-label="Свернуть или развернуть даты" aria-expanded="%s"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="transform: rotate(%s)"><path d="M6 9l6 6 6-6"></path></svg></button>') % (
        '{{datesOpen}}' if not TEST else 'true', '{{chevRot}}deg' if not TEST else '0deg')
    if not TEST:
        chev = chev.replace('<button type="button"', '<button type="button" onClick="{{toggleDates}}"', 1)
    marker = '<span class="edge" id="edgeSet">'
    assert out.count(marker) == 1
    return out.replace(marker, chev + marker, 1)


def nl_tile(fr):
    """Блок «до заката / до рассвета» беты как плитка: подпись, время, тренд со спарклайном. Тап — лист «Золотой час»."""
    f = fr.f
    st = re.search(r'id="nlValue"[^>]*style="([^"]*)"', f)
    spark = re.search(r'<span id="nlSpark">(<svg.*?</svg>)</span>', f, re.S).group(1)
    body = '<span class="gt-v" style="%s">%s</span><span class="gt-s gt-tr">%s<span>%s</span></span>' % (
        st.group(1) if st else '', by_id(f, 'nlValue'), spark, by_id(f, 'nlWord'))
    return tile('', ic('sunset'), by_id(f, 'nlLabel'), body, LINK_GOLD)


def next_light(fr):
    f = fr.f
    a, b = f.find('<div class="next-light">'), f.find('<div class="telemetry">')
    return f[a:b].rstrip()


# ---------- плитки ----------
def tile(cls, icon, label, body, href=None, art='', style=''):
    head = '<span class="gt-h">%s<span>%s</span>%s</span>' % (icon, label, GO)
    st = ' style="%s"' % style if style else ''
    if href:
        return '<a class="gl-glass gl-tile %s" href="%s"%s>%s%s%s</a>' % (cls, href, st, art, head, body)
    return '<button type="button" class="gl-glass gl-tile %s"%s>%s%s%s</button>' % (cls, st, art, head, body)


def moon_svg(pct, waxing):
    r, cx, cy = 22, 26, 26
    k = abs(1 - 2 * pct / 100.0) * r
    gib = pct > 50
    # убывающая — освещён левый край; растущая зеркалится
    lit = 'M %d %d A %d %d 0 0 0 %d %d A %.1f %d 0 0 %d %d %d Z' % (cx, cy - r, r, r, cx, cy + r, k, r, 0 if gib else 1, cx, cy - r)
    mirror = ' transform="translate(52 0) scale(-1 1)"' if waxing else ''
    return ('<svg viewBox="0 0 52 52" aria-hidden="true"><defs><radialGradient id="mg" cx="35%%" cy="35%%" r="80%%"><stop offset="0" stop-color="#eef0f4"></stop>'
            '<stop offset="1" stop-color="#b9c0cc"></stop></radialGradient></defs>'
            '<circle cx="26" cy="26" r="22" fill="var(--ink-a12)"></circle><path d="%s" fill="url(#mg)"%s></path>'
            '<circle cx="26" cy="26" r="22" fill="none" stroke="var(--ink-a20)"></circle></svg>') % (lit, mirror)


def moon_photo(pct, waxing, uid, px=96, attrs=''):
    """Снимок полной луны + тень по фазе: терминатор — эллипс с полуосью r·|1−2f|, растущая зеркалится."""
    r, c = 50, 50
    k = abs(1 - 2 * pct / 100.0) * r
    sweep = 0 if pct > 50 else 1
    dark = 'M %d %d A %d %d 0 0 1 %d %d A %.1f %d 0 0 %d %d %d Z' % (c, c - r, r, r, c, c + r, k, r, sweep, c, c - r)
    mirror = ' transform="translate(100 0) scale(-1 1)"' if waxing else ''
    return ('<svg %sviewBox="-8 -8 116 116" width="%d" height="%d" aria-hidden="true"><defs><clipPath id="mc%s"><circle cx="50" cy="50" r="50"></circle></clipPath>'
            '<filter id="mf%s" x="-10%%" y="-10%%" width="120%%" height="120%%"><feGaussianBlur stdDeviation="1.6"></feGaussianBlur></filter>'
            '<radialGradient id="mh%s" cx="50%%" cy="50%%" r="50%%"><stop offset=".78" stop-color="#cfd9f2" stop-opacity=".28"></stop><stop offset="1" stop-color="#cfd9f2" stop-opacity="0"></stop></radialGradient></defs>'
            '<circle cx="50" cy="50" r="58" fill="url(#mh%s)"></circle>'
            '<g clip-path="url(#mc%s)"><image href="%s" x="0" y="0" width="100" height="100"></image>'
            '<path d="%s" fill="rgba(3,5,12,.9)" filter="url(#mf%s)"%s></path></g></svg>') % (
        attrs + ' ' if attrs else '', px, px, uid, uid, uid, uid, uid, MOON_IMG, dark, uid, mirror)


def moon_glyph(pct, waxing, uid, px):
    return moon_photo(pct, waxing, uid, px) if MOON_IMG else moon_svg(pct, waxing)


import random


def wx_kind(word, clouds):
    """Состояние плитки по тому, что знает бета: слово погоды (код Open-Meteo) и облачность."""
    w = word.lower()
    if 'снег' in w or 'метел' in w:
        return 'snow'
    if 'гроз' in w:
        return 'storm'
    if 'дожд' in w or 'ливен' in w or 'морос' in w:
        return 'rain'
    if 'туман' in w:
        return 'fog'
    if 'ясно' in w:
        return 'clear'
    if clouds >= 55 or 'пасм' in w or 'облач' in w:
        return 'cloud'
    if clouds >= 25 or 'перемен' in w:
        return 'part'
    return 'clear'


WX_GLOW = {'clear': 'rgba(255,190,80,.34)', 'clear_n': 'rgba(90,120,230,.32)', 'part': 'rgba(215,195,160,.26)', 'cloud': 'rgba(170,182,205,.24)',
           'rain': 'rgba(100,145,200,.32)', 'storm': 'rgba(125,110,180,.34)', 'snow': 'rgba(200,225,255,.32)', 'fog': 'rgba(190,196,208,.24)', 'frost': 'rgba(170,215,255,.32)'}


def _blob(R, tear=False):
    """Неправильная форма капли: у стекающей — яйцо, шире снизу; у сидящей — овал с лёгким перекосом."""
    h1, h3 = R.randint(42, 58), R.randint(42, 58)
    # большой вертикальный радиус у верхних углов = сужение кверху, у нижних поменьше = толстый низ (стекает, тяжелеет внизу)
    v1, v2 = (R.randint(56, 68), R.randint(56, 68)) if tear else (R.randint(46, 58), R.randint(46, 58))
    return '%d%% %d%% %d%% %d%% / %d%% %d%% %d%% %d%%' % (h1, 100 - h1, h3, 100 - h3, v1, v2, 100 - v2, 100 - v1)


def _rivulet(R, x0, y1=172):
    """Извилистая дорожка вниз: S-образные отрезки с вертикальными касательными."""
    pts, x, y = [], x0, -6.0
    while y < y1 + 6:
        pts.append((x, y))
        x += R.uniform(-6, 6)
        y += R.uniform(18, 30)
    d = 'M %.1f %.1f' % pts[0]
    for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
        d += ' C %.1f %.1f, %.1f %.1f, %.1f %.1f' % (xa, ya + (yb - ya) / 2, xb, yb - (yb - ya) / 2, xb, yb)
    return d


def wx_art(kind, u, night=False, frost=False, heavy=False, seed=1):
    """Слои картинки за текстом плитки: солнце, звёзды, облака, запотевшее стекло с каплями, снег, изморозь. Только CSS и SVG, без скриптов."""
    R = random.Random(seed)
    L = []
    cl = lambda l, t, w, h, op, dur, dl, col='235,240,250': L.append(
        '<i class="wxa-cl" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx;opacity:%.2f;background:radial-gradient(closest-side, rgba(%s,.8), rgba(%s,0));animation-duration:%ds;animation-delay:-%ds"></i>' % (l, t, w, h, op, col, col, dur, dl))
    if kind in ('clear', 'part') and not night:
        L.append('<i class="wxa-rays"></i><i class="wxa-sun"></i>')
    if kind in ('clear', 'part') and night:
        L.append('<i class="wxa-moon"></i>')
        for _ in range(11):
            L.append('<i class="wxa-star" style="left:%dpx;top:%dpx;width:%.1fpx;height:%.1fpx;animation-delay:-%.1fs;animation-duration:%.1fs"></i>' % (
                R.randint(6, 172), R.randint(6, 100), 1 + R.random() * 1.6, 1 + R.random() * 1.6, R.random() * 5, 3 + R.random() * 3))
    if kind == 'part':
        cl(70, 34, 86, 40, .85, 15, 3)
        cl(104, 8, 70, 34, .7, 19, 9)
        cl(40, 60, 70, 30, .5, 17, 5)
    wisp = lambda l, t, w, h, op, dur, dl, col: L.append(
        '<i class="wxa-wisp" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx;opacity:%.2f;background:linear-gradient(90deg, rgba(%s,0), rgba(%s,.6) 28%%, rgba(%s,.5) 72%%, rgba(%s,0));animation-duration:%ds;animation-delay:-%ds"></i>' % (
            l, t, w, h, op, col, col, col, col, dur, dl))
    if kind == 'cloud':
        for (l, t, w, h, op, dur, dl) in ((-50, -8, 210, 30, .7, 38, 4), (0, 20, 230, 26, .6, 44, 13), (-30, 46, 200, 22, .45, 33, 21), (50, -16, 180, 28, .55, 40, 9)):
            wisp(l, t, w, h, op, dur, dl, '176,186,206')
        L.append('<i class="wxa-shade"></i>')
    if kind == 'fog':
        for i, (t, op) in enumerate(((10, .5), (44, .42), (80, .36))):
            L.append('<i class="wxa-band" style="top:%dpx;opacity:%.2f;animation-delay:-%ds"></i>' % (t, op, i * 6))
    if kind in ('rain', 'storm'):
        for (l, t, w, h, op, dur, dl) in ((-40, -6, 200, 26, .55, 34, 4), (10, 18, 220, 22, .45, 40, 12), (-20, 40, 190, 20, .35, 30, 20), (40, -14, 170, 24, .4, 36, 8)):
            wisp(l, t, w, h, op, dur, dl, '112,126,160')
        L.append('<i class="wxa-fog"></i>')
        # дождь в воздухе: тонкие штрихи разной длины и чёткости
        for _ in range(26 if heavy else 15):
            ln = 8 + R.random() * 20
            L.append('<i class="wxa-rs" style="left:%d%%;top:%dpx;height:%dpx;opacity:%.2f;animation-duration:%.2fs;animation-delay:-%.2fs"></i>' % (
                R.randint(2, 98), R.randint(-30, 20), ln, .25 + R.random() * .45, 0.9 + R.random() * 0.8, R.random() * 2))
        # на самом стекле: мелкие неровные бусинки (овалы, повёрнутые по-разному), чуть крупнее — яйцевидные капли
        for _ in range(38):
            s = 1 + R.random() * 1.8
            L.append('<i class="wxa-bead" style="left:%.1f%%;top:%.1f%%;width:%.1fpx;height:%.1fpx;border-radius:%s;transform:rotate(%ddeg);opacity:%.2f"></i>' % (
                R.random() * 98, R.random() * 94, s, s * R.uniform(.75, 1.5), _blob(R), R.randint(-35, 35), .3 + R.random() * .4))
        for _ in range(6 if heavy else 4):
            s = 2.6 + R.random() * 1.8
            L.append('<i class="wxa-bead" style="left:%.1f%%;top:%.1f%%;width:%.1fpx;height:%.1fpx;border-radius:%s;transform:rotate(%ddeg);opacity:.55"></i>' % (
                R.random() * 96, 8 + R.random() * 84, s, s * R.uniform(1.15, 1.6), _blob(R, True), R.randint(-14, 14)))
        # стекающие капли оставляют извилистый след; голова едет по тому же пути, след дорисовывается за ней
        for i in range(3 if heavy else 2):
            x0 = R.randint(22, 160)
            dur, dl = 9 + R.random() * 6, R.random() * 10
            d = _rivulet(R, x0)
            L.append('<svg class="wxa-riv" viewBox="0 0 180 180" width="180" height="180"><path class="wxa-rivp" pathLength="100" d="%s" style="animation-duration:%.1fs;animation-delay:-%.1fs"></path>'
                     '<path class="wxa-rivp hi" pathLength="100" d="%s" style="animation-duration:%.1fs;animation-delay:-%.1fs"></path></svg>' % (d, dur, dl, d, dur, dl))
            L.append('<i class="wxa-bead wxa-head" style="offset-path:path(\'%s\');border-radius:%s;animation-duration:%.1fs;animation-delay:-%.1fs"></i>' % (d, _blob(R, True), dur, dl))
        if kind == 'storm':
            L.append('<i class="wxa-flash"></i>')
    if kind == 'snow':
        for _ in range(26 if heavy else 17):
            s = 1.6 + R.random() * 2.4
            L.append('<i class="wxa-fl" style="left:%dpx;width:%.1fpx;height:%.1fpx;--sw:%dpx;animation-duration:%.1fs;animation-delay:-%.1fs"></i>' % (
                R.randint(0, 176), s, s, R.randint(-12, 12), 6 + R.random() * 6, R.random() * 10))
    if frost:
        L.append(('<svg class="wxa-frost" viewBox="0 0 180 130" preserveAspectRatio="none"><defs>'
                  '<filter id="fF%s" x="0" y="0" width="100%%" height="100%%"><feTurbulence type="fractalNoise" baseFrequency=".5 .95" numOctaves="3" seed="7" result="n"></feTurbulence>'
                  '<feColorMatrix in="n" type="matrix" values="0 0 0 0 .93  0 0 0 0 .97  0 0 0 0 1  0 0 0 1.7 -.95"></feColorMatrix></filter>'
                  '<radialGradient id="fG%s" cx="50%%" cy="50%%" r="78%%"><stop offset=".5" stop-color="#000"></stop><stop offset="1" stop-color="#fff"></stop></radialGradient>'
                  '<mask id="fM%s"><rect width="180" height="130" fill="url(#fG%s)"></rect></mask></defs>'
                  '<rect width="180" height="130" filter="url(#fF%s)" mask="url(#fM%s)"></rect></svg><i class="wxa-rime"></i>') % (u, u, u, u, u, u))
        if kind in ('clear',):
            for _ in range(3):
                L.append('<i class="wxa-glint" style="left:%dpx;top:%dpx;animation-delay:-%.1fs"></i>' % (R.randint(14, 160), R.randint(10, 108), R.random() * 4))
    return '<span class="wxa" aria-hidden="true">%s</span>' % ''.join(L)


GOLD_, AMBER_, SILVER_, SCARLET_ = (226, 164, 76), (217, 172, 107), (239, 234, 224), (216, 80, 47)
PINK_, BLUE_, DEEP_, NIGHT_ = (201, 105, 143), (91, 119, 160), (61, 88, 120), (104, 126, 168)


def sky_color(e):
    """Цвет светила по его высоте — лестница беты `skyColor`: золото над горизонтом, алый сразу под ним, розовый, синий, ночная синева."""
    if e >= -0.833:
        if e > 40:
            return SILVER_
        if e > 20:
            return lerp(AMBER_, SILVER_, .6)
        if e > 6.05:
            return AMBER_
        return GOLD_
    d = -e
    if d < 1.8:
        return lerp(GOLD_, SCARLET_, d / 1.8)
    if d < 4:
        return lerp(SCARLET_, PINK_, (d - 1.8) / 2.2)
    if d < 6:
        return lerp(PINK_, BLUE_, (d - 4) / 2)
    if d < 12:
        return lerp(BLUE_, DEEP_, (d - 6) / 6)
    if d < 18:
        return lerp(DEEP_, NIGHT_, (d - 12) / 6)
    return NIGHT_


def sun_mini(fr):
    t = mins(fr.at)
    a, b = mins(fr.rise), mins(fr.set)
    fnow = (t - a) / float(b - a)
    cx, cy, rx, ry = 75, 56, 63, 50
    if 0 <= fnow <= 1:
        th = math.pi * (1 - fnow)
        x, y, o = cx + rx * math.cos(th), cy - ry * math.sin(th), 1
    else:
        x, y, o = (cx - rx if fnow < 0 else cx + rx), 62, .5
    return ('<svg class="gt-sun" viewBox="0 0 150 64" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">'
            '<path class="arc" d="M 12 56 A 63 50 0 0 1 138 56"></path><line class="hz" x1="4" y1="56" x2="146" y2="56"></line>'
            '<circle cx="%.1f" cy="%.1f" r="9" fill="var(--brass)" opacity="%.2f"></circle>'
            '<circle cx="%.1f" cy="%.1f" r="4.5" fill="var(--brass)" opacity="%.2f"></circle></svg>') % (x, y, .22 * o, x, y, o)


def ribbon(fr):
    r = fr.rows
    def rng(group, key):
        a, b = re.findall(r'\d\d:\d\d', row(r, group, key))[:2]
        return mins(a), mins(b)
    gA, gP = rng('Золотой и синий час', 'Золотой час утром'), rng('Золотой и синий час', 'Золотой час вечером')
    bA, bP = rng('Золотой и синий час', 'Синий час утром'), rng('Золотой и синий час', 'Синий час вечером')
    nA = rng('Сумерки', 'Астрономическая ночь')
    night, blue, purple, gold, day = '#141c3c', '#405c8c', '#9670aa', '#e2a44c', 'rgba(239,234,224,.5)'
    if fr.theme == 'light':
        day = 'rgba(23,21,15,.18)'
    pts = [(0, night), (nA[1], night), (bA[0], blue), (bA[1], purple), (gA[0] + 12, gold), (gA[1], day), (gP[0], day), (gP[0] + 10, gold), (gP[1], gold), (bP[1], purple),
           (nA[0], night), (1440, night)]
    stops = ', '.join('%s %.1f%%' % (c, m * 100.0 / 1440) for m, c in pts)
    now = mins(fr.at) * 100.0 / 1440
    return ('<span class="gt-rib"><span class="rb" style="background: linear-gradient(90deg, %s)"></span><b class="kn" style="left: %.1f%%"></b>'
            '<em style="left: %.1f%%">%s</em><em style="left: %.1f%%">%s</em></span>') % (
        stops, now, mins(fr.rise) * 100.0 / 1440, fr.rise, mins(fr.set) * 100.0 / 1440, fr.set)


CAP_GRAD = 'linear-gradient(90deg, rgb(64,92,140), rgb(150,110,170), rgb(226,164,76), rgb(244,180,0))'


CAP_STOPS = [(64, 92, 140), (150, 110, 170), (226, 164, 76), (244, 180, 0)]
MOON_GRAD = 'linear-gradient(90deg, rgb(34,46,86), rgb(120,142,196), rgb(226,232,246))'


def cap_color(s):
    x = clamp(s, 0, 1) * 3
    i = min(int(x), 2)
    return lerp(CAP_STOPS[i], CAP_STOPS[i + 1], x - i)


def cap_fill(score, extra='', grad=None, glow=None):
    """Заливка капсулы: цвет зависит от места на шкале (градиент растянут на всю капсулу), на конце — свечение."""
    if score <= 0:
        return ''
    c = glow or cap_color(score / 100.0)
    return ('<i%s style="width: %d%%; background: linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,0) 58%%), %s; background-size: 100%% 100%%, %d%% 100%%; '
            'box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 0 20px %s"></i>') % (extra, score, grad or CAP_GRAD, round(10000.0 / score), rgba(c, .5))


def sunset_word(s):
    return 'красивый' if s >= 75 else 'с цветом' if s >= 50 else 'спокойный' if s >= 28 else 'серый'


def sunset_long(s):
    return ('закат обещает быть красивым' if s >= 75 else 'закат с цветом' if s >= 50 else 'спокойный закат' if s >= 28 else 'цвета почти не будет')


def home(fr, uid, h, scroll, link_to):
    f = fr.f
    temp, cond = by_id(f, 'hwTemp'), by_id(f, 'hwCond')
    lo, hi = by_id(f, 'hwLo'), by_id(f, 'hwHi')
    wx = re.search(r'<span id="hwIcon">(<svg.*?</svg>)</span>', f, re.S).group(1).replace('class="wx"', 'class="ic"')
    wind = t_value(f, 'tWind')
    w_speed, _, w_rest = wind.partition(' · ')
    w_rest_a, _, w_gust = w_rest.rpartition(' · ')
    alt = row(fr.rows, 'Солнце в этот момент', 'Высота')
    place = '%s · %s' % (by_id(f, 'hLocName'), '56.5°N 85.0°E')
    mo = fr.moon
    if mo['alt'].startswith('+'):
        mo_line = 'над горизонтом · заход %s' % mo['set']
    else:
        mo_line = 'восход %s' % mo['rise']
    score_col = 'var(--blue)' if fr.score < 28 else 'var(--brass)'
    sunset_tile = tile('', ic('sunset'), 'Закат',
                       '<span class="gt-v" style="color: %s">%d<small>/ 100</small></span><span class="gt-s">%s</span><span class="gt-cap">%s</span>' % (
                           score_col, fr.score, sunset_word(fr.score), cap_fill(fr.score)), link_to)
    t_c = int(temp.replace('−', '-').replace('°', '') or 0)
    kind = wx_kind(fr.sky_word, fr.clouds)
    frost = t_c <= -5 and kind not in ('rain', 'storm')
    glow = WX_GLOW['frost' if frost else ('clear_n' if kind in ('clear', 'part') and fr.phase == 'night' else kind)]
    weather_tile = tile('wxt', wx, 'Погода', '<span class="gt-v">%s</span><span class="gt-s">%s</span><span class="gt-s">%s &nbsp; %s</span>' % (temp, fr.sky_word, lo, hi),
                        art=wx_art(kind, 'h' + uid, fr.phase == 'night', frost, False, 3), style='--g-tile-glow: %s' % glow)
    city_tile = tile('', ic('pin'), 'Город', '<span class="gt-v gt-name">%s</span><span class="gt-s">%s</span><span class="gt-s gt-date">%s<br>%s</span>' % (
        by_id(f, 'hLocName'), by_id(f, 'hLocSub'), by_id(f, 'hDate'), by_id(f, 'hNote')))
    header = '<div class="gl-top">%s%s</div>' % (city_tile, weather_tile)
    tiles = [
        nl_tile(fr),
        tile('', ic('cloud'), 'Небо', '<span class="gt-v">%d<small>%%</small></span><span class="gt-s">%s</span><span class="gt-bar"><i style="width: %d%%"></i></span>' % (
            fr.clouds, fr.sky_word, fr.clouds), LINK_SKY),
        tile('', ic('wind'), 'Ветер', '<span class="gt-v">%s<small>м/с</small></span><span class="gt-s">%s</span><span class="gt-s">%s</span>' % (
            w_speed.split()[0], w_rest_a, w_gust)),
        sunset_tile,
        tile('', ic('drop'), 'Влажность', '<span class="gt-v">%d<small>%%</small></span><span class="gt-bar"><i style="width: %d%%"></i></span>' % (fr.hum, fr.hum)),
        tile('', ic('sun'), 'Солнце', '<span class="gt-v">%s</span><span class="gt-s">высота</span>%s' % (alt, sun_mini(fr)), LINK_SUN),
        tile('wide', ic('moon'), 'Луна', '<span class="gt-moon">%s<span class="tx"><span class="gt-v">%d<small>%%</small></span><span class="gt-s">%s · %s</span></span></span>' % (
            moon_glyph(mo['pct'], mo['phase'].startswith('Раст'), 'mt', 52), mo['pct'], mo['phase'], mo_line), LINK_MOON),
    ]
    plan_sub = text(re.search(r'id="actionSub">(.*?)</span>', f, re.S).group(1))
    plan_ic = re.search(r'id="planToday".*?(<svg class="ic".*?</svg>)', f, re.S).group(1)
    tabs = ''.join(re.findall(r'<button class="tab[^"]*" data-go="[^"]*">.*?</button>', f, re.S)[:4])
    body = ('%s%s<div class="gl-grid">%s</div>') % (ring_hero(fr, uid, HERO_MODE), header, ''.join(tiles))
    body = '<div class="gl-main">%s</div>' % body
    timebar = flat_dates(block(f, '<div class="timebar" id="timebar">'))
    body += ('<div class="gl-fade"></div><div class="gl-glass gl-dock">%s</div>'
             '<nav class="gl-glass gl-tabs">%s</nav>') % (timebar, tabs)
    return wrap(body, fr, h)


def wrap(inner, fr, h, cls='gl'):
    return ('<div class="lp-html" data-theme="%s" style="--lp-h: %dpx"><div class="lp-body pro-mode" data-drum="paper" data-tab="s-today"><div class="%s" style="%s">%s</div></div></div>') % (
        fr.theme, h, cls, fr.tokens(), inner)


# ---------- лист «Закат» ----------
def bezier(u, p0, p1, p2, p3):
    f = lambda i: ((1 - u) ** 3) * p0[i] + 3 * ((1 - u) ** 2) * u * p1[i] + 3 * (1 - u) * (u ** 2) * p2[i] + (u ** 3) * p3[i]
    return f(0), f(1)


def detail(fr, back, example_note=None):
    r, f = fr.rows, fr.f
    low, mid, high = fr.layers
    gold_min = mins(fr.gold_b) - mins(fr.gold_a)
    sky = sky_back(fr, back)
    back_html = ''
    date = by_id(f, 'hDate').split('·')[1].strip() if '·' in by_id(f, 'hDate') else ''
    stats = ('<div class="gd-stats">'
             '<div><div class="k">Золотой час</div><div class="v">%s<small>%s</small></div></div>'
             '<div><div class="k">Закат</div><div class="v" style="color: %s">%s</div></div>'
             '<div><div class="k">Облачность</div><div class="v">%d%%</div><div class="gt-bar"><i style="width: %d%%"></i></div></div>'
             '<div><div class="k">Влажность</div><div class="v">%d%%</div><div class="gt-bar"><i style="width: %d%%"></i></div></div></div>') % (
        hm(gold_min).replace(' 0', ' '), '', 'var(--blue)' if fr.score < 28 else 'var(--brass)', sunset_word(fr.score),
        fr.clouds, fr.clouds, fr.hum, fr.hum)
    cap = ('<div class="gd-ch">Оценка заката</div><div class="gd-cap">%s<span class="lens" style="left: clamp(4px, calc(%d%% - 22px), calc(100%% - 48px))">%d</span></div>'
           '<div class="gd-scale"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></div>') % (
        cap_fill(fr.score, ' class="fill"').replace('<i class="fill"', '<i class="fill"'), fr.score, fr.score)
    cap = cap.replace('<i class="fill"', '<i class="fill"')
    card1 = ('<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Закат сегодня</b><i>%s</i></div><span class="gd-date">%s</span></div>'
             '<div class="gd-time">%s</div>%s%s</section>') % (sunset_long(fr.score), date, fr.set, stats, cap)
    notes = (('Нижний ярус', 'экран горизонта', low), ('Средний ярус', 'текстура', mid), ('Верхний ярус', 'догорание зари', high))
    tiers = ''.join('<div class="gd-tier"><b>%s</b><span>%d%%</span><i>%s</i><span class="gt-bar"><i style="width: %d%%"></i></span></div>' % (n, v, note, v) for n, note, v in notes)
    tiers = tiers.replace('<span class="gt-bar">', '<div class="gt-bar">').replace('</i></span></div>', '</i></div></div>')
    card2 = '<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Облака по ярусам</b><i>что каждый ярус делает с закатом</i></div></div>%s</section>' % tiers
    time_rows = [('Золотой час', fr.gold.replace(' – ', '–'), False), ('Закат', fr.set, True),
                 ('Синий час', row(r, 'Золотой и синий час', 'Синий час вечером').replace(' – ', '–'), False),
                 ('Гражданские до', row(r, 'Сумерки', 'Гражданские').split('–')[-1].strip(), False),
                 ('Навигационные до', row(r, 'Сумерки', 'Навигационные').split('–')[-1].strip(), False),
                 ('Астрономические до', row(r, 'Сумерки', 'Астрономические').split('–')[-1].strip(), False)]
    rows_html = ''.join('<div class="r%s"><span class="k">%s</span><span class="v">%s</span></div>' % (' hl' if hl else '', k, v) for k, v, hl in time_rows)
    card3 = '<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Время</b></div></div><div class="gd-rows">%s</div></section>' % rows_html
    loc = '<div class="gl-glass gd-loc">%s%s</div>' % (ic('pin', ''), by_id(f, 'hLocName'))
    note = '<div class="gx-cap" style="text-align:center">%s</div>' % example_note if example_note else ''
    inner = '%s%s<div class="gd-body">%s%s%s%s%s</div>' % (sky, back_html, card1, card2, card3, loc, note)
    return inner


# ---------- листы: золотой час и небо ----------

LINK_SKY, LINK_GOLD = 'Glass_Sky.dc.html', 'Glass_Golden.dc.html'
LINK_SUN, LINK_MOON = 'Glass_Sun.dc.html', 'Glass_Moon.dc.html'
LAT = 56.476   # Томск, как в шапке беты
GOLD_GRAD = 'linear-gradient(90deg, rgb(226,164,76), rgb(244,180,0))'


def sun_model(fr):
    """Высота солнца в любой момент суток: sin h = sinφ·sinδ + cosφ·cosδ·cos H; склонение — из полуденной высоты беты."""
    noon_t, noon_a = row(fr.rows, 'Ход дня', 'Солнечный полдень').split(' · ')
    noon, hmax = mins(noon_t), float(noon_a.strip('°'))
    phi, decl = math.radians(LAT), math.radians(hmax - 90 + LAT)
    alt = lambda t: math.degrees(math.asin(math.sin(phi) * math.sin(decl) + math.cos(phi) * math.cos(decl) * math.cos(math.radians(15.0 * (t - noon) / 60.0))))
    return alt, hmax


def sky_back(fr, back, moon=None):
    """Шапка листов: небо, траектория светила пунктиром, под ней светящийся «холм» цветом заката; стеклянная «назад».
    moon = (u, lens_fn): дуга луны по доле пути u и функция, рисующая диск в точке (x, y); без неё — солнце по настоящей кривой высоты."""
    p = fr.view
    if moon:
        u, lens_fn = moon
        pts = [(24 + 345 * s / 60.0, 330 - 135 * math.sin(math.pi * s / 60.0)) for s in range(0, 61)]
        lx, ly = 24 + 345 * u, 330 - 135 * math.sin(math.pi * u)
        c1, c2, a1, a2 = (205, 218, 245), (120, 146, 205), .55, .32
        lens = lens_fn(lx, ly)
    else:
        alt, hmax = sun_model(fr)
        ra, st, now = mins(fr.rise), mins(fr.set), mins(fr.at)
        k = 150.0 / hmax
        X = lambda t: 24 + (t - ra) / float(st - ra) * 345
        Y = lambda t: 330 - max(alt(t), 0) * k
        pts = [(X(t), Y(t)) for t in list(range(ra, st, 5)) + [st]]
        tn = clamp(now, ra, st)
        lx, ly = X(tn), Y(tn)
        # холм светлее неба вокруг: тот же цвет, осветлённый, и режим screen — иначе он тонет в цвете заката
        warm1, warm2 = lerp((255, 255, 255), (255, 238, 195), p['life']), lerp((255, 255, 255), (255, 190, 120), p['life'])
        c1, c2 = lerp(p['horizon'], warm1, .45), lerp(p['mid'], warm2, .40)
        a1, a2 = .26 + .42 * p['life'], .16 + .34 * p['life']
        lens = ('<circle cx="%.1f" cy="%.1f" r="28" fill="%s" opacity="%.2f" filter="url(#mb)"></circle>'
                '<circle cx="%.1f" cy="%.1f" r="15" fill="url(#ln)" stroke="rgba(255,255,255,.75)" stroke-width="1"></circle>') % (lx, ly, rgb(p['horizon']), .35 + .4 * p['life'], lx, ly)
    d_line = 'M ' + ' L '.join('%.1f %.1f' % q for q in pts)
    d_fill = d_line + ' L %.1f 330 L %.1f 330 Z' % (pts[-1][0], pts[0][0])
    sky = ('<div class="gd-sky"><svg viewBox="0 0 393 400" aria-hidden="true"><defs>'
           '<radialGradient id="mg" cx="50%%" cy="62%%" r="64%%"><stop offset="0" stop-color="%s" stop-opacity="%.2f"></stop><stop offset=".5" stop-color="%s" stop-opacity="%.2f"></stop><stop offset="1" stop-color="%s" stop-opacity="0"></stop></radialGradient>'
           '<filter id="mb" x="-30%%" y="-40%%" width="160%%" height="180%%"><feGaussianBlur stdDeviation="12"></feGaussianBlur></filter>'
           '<radialGradient id="ln" cx="35%%" cy="30%%" r="80%%"><stop offset="0" stop-color="#fff" stop-opacity=".55"></stop><stop offset="1" stop-color="#fff" stop-opacity=".12"></stop></radialGradient></defs>'
           '<path d="%s" fill="url(#mg)" filter="url(#mb)" style="mix-blend-mode: plus-lighter"></path><path d="%s" fill="url(#mg)" opacity="1" style="mix-blend-mode: plus-lighter"></path>'
           '<path class="path" d="%s"></path>'
           '<line x1="0" y1="330" x2="16" y2="330" stroke="rgba(255,255,255,.5)"></line><line x1="377" y1="330" x2="393" y2="330" stroke="rgba(255,255,255,.5)"></line>'
           '%s</svg></div>') % (rgb(c1), a1, rgb(c2), a2, rgb(c2), d_fill, d_fill, d_line, lens)
    back_html = '<a class="gl-glass gd-back" href="%s"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4l8 8-8 8"></path></svg>Свет</a>' % back
    return sky + back_html


def compass_pts(az_now, az_rise, az_set, now_txt, now_col='var(--brass)'):
    cx, cy, R = 80, 80, 58
    pt = lambda a, rr: (cx + rr * math.sin(math.radians(a)), cy - rr * math.cos(math.radians(a)))
    ticks = ''
    for a in range(0, 360, 10):
        long_ = a % 90 == 0
        x1, y1 = pt(a, R - (7 if long_ else 4))
        x2, y2 = pt(a, R)
        ticks += '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="var(--ink-a24)" stroke-width="%s"></line>' % (x1, y1, x2, y2, 1.4 if long_ else 1)
    labels = ''.join('<text x="%.1f" y="%.1f" text-anchor="middle" dominant-baseline="central">%s</text>' % (pt(a, R + 13) + (n,)) for a, n in ((0, 'С'), (90, 'В'), (180, 'Ю'), (270, 'З')))
    dots = ''
    for a in (az_rise, az_set):
        x, y = pt(a, R)
        dots += '<circle cx="%.1f" cy="%.1f" r="3.5" fill="var(--ink-3)"></circle>' % (x, y)
    x, y = pt(az_now, R)
    dots += '<circle cx="%.1f" cy="%.1f" r="11" fill="%s" opacity=".25"></circle><circle cx="%.1f" cy="%.1f" r="5.5" fill="%s"></circle>' % (x, y, now_col, x, y, now_col)
    svg = ('<svg viewBox="0 0 160 160" width="150" height="150" aria-hidden="true"><circle cx="80" cy="80" r="%d" fill="none" stroke="var(--ink-a20)"></circle>%s%s%s</svg>') % (R, ticks, labels, dots)
    rows = ('<div class="gd-rows" style="flex:1"><div class="r"><span class="k">Сейчас</span><span class="v">%s</span></div>'
            '<div class="r"><span class="k">Восход</span><span class="v">%d°</span></div>'
            '<div class="r"><span class="k">Закат</span><span class="v">%d°</span></div></div>') % (now_txt, az_rise, az_set)
    return '<div class="gd-compass">%s%s</div>' % (svg, rows)


def compass(fr):
    r = fr.rows
    az_now = float(re.match(r'([\d.]+)', row(r, 'Солнце в этот момент', 'Азимут')).group(1))
    az_rise = float(re.search(r'·\s*(\d+)°', row(r, 'Ход дня', 'Восход')).group(1))
    az_set = float(re.search(r'·\s*(\d+)°', row(r, 'Ход дня', 'Закат')).group(1))
    return compass_pts(az_now, az_rise, az_set, row(r, 'Солнце в этот момент', 'Азимут'))


def golden_detail(fr, back):
    r, f = fr.rows, fr.f
    a, b, now = mins(fr.gold_a), mins(fr.gold_b), mins(fr.at)
    until = '%s %s' % (by_id(f, 'nlLabel').lower(), by_id(f, 'nlValue'))
    state = 'идёт · ' + until if a <= now <= b else ('начнётся в %s' % fr.gold_a if now < a else 'закончился в %s' % fr.gold_b)
    prog = int(round(100 * clamp((now - a) / float(b - a), 0, 1)))
    date = by_id(f, 'hDate').split('·')[1].strip()
    cap = ('<div class="gd-ch">Прошло</div><div class="gd-cap"><i class="fill" style="width: %d%%; background: %s"></i>'
           '<span class="lens" style="left: clamp(4px, calc(%d%% - 22px), calc(100%% - 48px)); font-size: 14px">%d%%</span></div>'
           '<div class="gd-scale"><span>%s</span><span>%s</span></div>') % (prog, GOLD_GRAD, prog, prog, fr.gold_a, fr.gold_b)
    stats = ('<div class="gd-stats"><div><div class="k">Длится</div><div class="v">%s</div></div>'
             '<div><div class="k">Закат</div><div class="v">%s</div></div></div>') % (hm(b - a).replace(' 0', ' '), fr.set)
    card1 = ('<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Золотой час сегодня</b><i>%s</i></div><span class="gd-date">%s</span></div>'
             '<div class="gd-time" style="font-size: 52px">%s</div>%s%s</section>') % (state, date, fr.gold.replace(' – ', '–'), stats, cap)
    rec = t_value(f, 'tRec')
    frame_rows = [('Условия', rec), ('Свет', t_value(f, 'tLight')), ('Тени', t_value(f, 'tShadow'))]
    card2 = ('<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Каким будет кадр</b><i>свет и тени в это время</i></div></div><div class="gd-rows">%s</div></section>') % ''.join(
        '<div class="r"><span class="k">%s</span><span class="v">%s</span></div>' % (k, v) for k, v in frame_rows)
    day_rows = [('Золотой час утром', row(r, 'Золотой и синий час', 'Золотой час утром')), ('Золотой час вечером', row(r, 'Золотой и синий час', 'Золотой час вечером')),
                ('Синий час утром', row(r, 'Золотой и синий час', 'Синий час утром')), ('Синий час вечером', row(r, 'Золотой и синий час', 'Синий час вечером')),
                ('Длина дня', row(r, 'Ход дня', 'Длина дня').lstrip('0'))]
    card3 = ('<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Весь день</b><i>восход, закат и свет между ними</i></div></div>%s'
             '<div class="gd-scale"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div><div class="gd-rows" style="margin-top:8px">%s</div></section>') % (
        ribbon(fr), ''.join('<div class="r"><span class="k">%s</span><span class="v">%s</span></div>' % (k, v.replace(' – ', '–')) for k, v in day_rows))
    card4 = '<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Куда светит</b><i>азимут солнца, градусы от севера</i></div></div>%s</section>' % compass(fr)
    loc = '<div class="gl-glass gd-loc">%s%s</div>' % (ic('pin', ''), by_id(f, 'hLocName'))
    return '%s<div class="gd-body">%s%s%s%s%s</div>' % (sky_back(fr, back), card1, card2, card3, card4, loc)


def sky_detail(fr, back):
    r, f = fr.rows, fr.f
    low, mid, high = fr.layers
    date = by_id(f, 'hDate').split('·')[1].strip()
    trend = by_id(f, 'nlWord')
    card1 = ('<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Небо</b><i>%s · %s</i></div><span class="gd-date">%s</span></div>'
             '<div class="gd-time">%d<span style="font-size:28px;font-weight:300">%%</span></div>'
             '<div class="gd-stats"><div><div class="k">Облачность</div><div class="gt-bar"><i style="width: %d%%"></i></div></div>'
             '<div><div class="k">Тренд</div><div class="v" style="font-size:17px">%s</div></div></div></section>') % (
        fr.sky_word, row(r, 'Погода', 'Температура'), date, fr.clouds, fr.clouds, trend)
    bands = ''
    for name, alt, note, pct, hh in (('Верхний ярус', 'выше 6 км', 'догорание зари', high, 60), ('Средний ярус', '2–6 км', 'текстура', mid, 52), ('Нижний ярус', 'до 2 км', 'экран горизонта', low, 44)):
        bands += ('<div class="sk-row"><div class="sk-l"><b>%s</b><i>%s · %s</i></div><div class="sk-band" style="height: %dpx"><span style="background: color-mix(in srgb, var(--ink) %d%%, transparent)"></span></div>'
                  '<span class="sk-v">%d%%</span></div>') % (name, alt, note, hh, int(round(pct * .55)), pct)
    card2 = ('<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Облака по ярусам</b><i>разрез неба: чем плотнее, тем больше закрыто</i></div></div>'
             '<div class="sk-stack">%s</div></section>') % bands
    wrows = [('Небо', row(r, 'Погода', 'Небо')), ('Облачность', row(r, 'Погода', 'Облачность')), ('Температура', row(r, 'Погода', 'Температура')),
             ('Ветер', row(r, 'Погода', 'Ветер')), ('Влажность', '%d%%' % fr.hum), ('Источник', row(r, 'Погода', 'Источник'))]
    card3 = ('<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Погода</b></div></div><div class="gd-rows">%s</div></section>') % ''.join(
        '<div class="r"><span class="k">%s</span><span class="v">%s</span></div>' % (k, v) for k, v in wrows)
    loc = '<div class="gl-glass gd-loc">%s%s</div>' % (ic('pin', ''), by_id(f, 'hLocName'))
    return '%s<div class="gd-body">%s%s%s%s</div>' % (sky_back(fr, back), card1, card2, card3, loc)


def sun_curve(fr):
    """Высота солнца за сутки по восходу, полудню и широте: sin h = sinφ·sinδ + cosφ·cosδ·cos H.
    Склонение берётся из высоты солнца в полдень, которую считает бета; в «сейчас» кривая обязана сойтись с её числом."""
    r = fr.rows
    noon_t, noon_a = row(r, 'Ход дня', 'Солнечный полдень').split(' · ')
    noon, hmax = mins(noon_t), float(noon_a.strip('°'))
    phi, decl = math.radians(LAT), math.radians(hmax - 90 + LAT)
    alt = lambda t: math.degrees(math.asin(math.sin(phi) * math.sin(decl) + math.cos(phi) * math.cos(decl) * math.cos(math.radians(15.0 * (t - noon) / 60.0))))
    now = mins(fr.at)
    beta_alt = float(row(r, 'Солнце в этот момент', 'Высота').replace('−', '-').strip('°'))
    assert abs(alt(now) - beta_alt) < 0.35, (alt(now), beta_alt)
    W, Hh, top, bot = 330, 150, 26, -50
    sc = Hh / float(top - bot)
    X, Y = (lambda t: t / 1440.0 * W), (lambda a: (top - a) * sc)
    pts = ' L '.join('%.1f %.1f' % (X(t), Y(alt(t))) for t in range(0, 1441, 10))
    h0 = Y(0)
    rx, sx_ = X(mins(fr.rise)), X(mins(fr.set))
    nx, ny = X(now), Y(alt(now))
    t_lo = min(range(0, 1441, 10), key=alt)
    lo = alt(t_lo)
    svg = ('<svg class="gd-curve" viewBox="0 0 %d %d" aria-hidden="true"><defs><clipPath id="sc"><rect x="0" y="0" width="%d" height="%.1f"></rect></clipPath></defs>'
           '<rect x="0" y="%.1f" width="%d" height="%.1f" fill="var(--ink-a08)"></rect>'
           '<line x1="0" y1="%.1f" x2="%d" y2="%.1f" stroke="var(--ink-a24)"></line>'
           '<path d="M %s" fill="none" stroke="var(--ink-4)" stroke-width="1.6" stroke-linejoin="round"></path>'
           '<path d="M %s" fill="none" stroke="var(--brass)" stroke-width="2" stroke-linejoin="round" clip-path="url(#sc)"></path>'
           '<circle cx="%.1f" cy="%.1f" r="3.5" fill="var(--ink-3)"></circle><circle cx="%.1f" cy="%.1f" r="3.5" fill="var(--ink-3)"></circle>'
           '<circle cx="%.1f" cy="%.1f" r="11" fill="var(--brass)" opacity=".25"></circle><circle cx="%.1f" cy="%.1f" r="5.5" fill="var(--brass)"></circle>'
           '<text x="%.1f" y="%.1f" text-anchor="middle">+%.1f°</text><text x="%.1f" y="%.1f" text-anchor="middle">−%.1f°</text></svg>') % (
        W, Hh, W, h0, h0, W, Hh - h0, h0, W, h0, pts, pts, rx, h0, sx_, h0, nx, ny, nx, ny,
        X(noon), Y(hmax) - 7, hmax, min(max(X(t_lo), 28), W - 28), Y(lo) - 6, abs(lo))
    return svg + '<div class="gd-scale"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>'


def sun_detail(fr, back):
    r, f = fr.rows, fr.f
    g_ = lambda k: row(r, 'Солнце в этот момент', k)
    date = by_id(f, 'hDate').split('·')[1].strip()
    card1 = ('<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Солнце</b><i>сейчас · %s</i></div><span class="gd-date">%s</span></div>'
             '<div class="gd-time">%s</div>'
             '<div class="gd-stats"><div><div class="k">Азимут</div><div class="v" style="font-size:17px">%s</div></div>'
             '<div><div class="k">Длина тени</div><div class="v" style="font-size:17px">%s</div></div></div>%s</section>') % (
        fr.at, date, g_('Высота'), g_('Азимут'), g_('Длина тени'), sun_curve(fr))
    day = [(k, row(r, 'Ход дня', k).lstrip('0') if k == 'Длина дня' else row(r, 'Ход дня', k)) for k in ('Восход', 'Солнечный полдень', 'Закат', 'Длина дня')]
    card2 = '<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Ход дня</b><i>время и азимут или высота</i></div></div><div class="gd-rows">%s</div></section>' % ''.join(
        '<div class="r"><span class="k">%s</span><span class="v">%s</span></div>' % (k, v) for k, v in day)
    tw = [(k, row(r, 'Сумерки', k).replace(' – ', '–')) for k in ('Гражданские', 'Навигационные', 'Астрономические', 'Астрономическая ночь')]
    card3 = '<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Сумерки</b><i>пока небо не станет совсем тёмным</i></div></div><div class="gd-rows">%s</div></section>' % ''.join(
        '<div class="r"><span class="k">%s</span><span class="v">%s</span></div>' % (k, v) for k, v in tw)
    card4 = '<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Куда светит</b><i>азимут, градусы от севера</i></div></div>%s</section>' % compass(fr)
    loc = '<div class="gl-glass gd-loc">%s%s</div>' % (ic('pin', ''), by_id(f, 'hLocName'))
    return '%s<div class="gd-body">%s%s%s%s%s</div>' % (sky_back(fr, back), card1, card2, card3, card4, loc)


def moon_detail(fr, back):
    mo, f = fr.moon, fr.f
    waxing = mo['phase'].startswith('Раст')
    rise_m, set_m, now = mins(mo['rise']), mins(mo['set']), mins(fr.at)
    u = clamp((now - rise_m) / float((1440 - rise_m) + set_m), 0, 1)
    up = not mo['alt'].startswith('−')
    state = 'над горизонтом' if up else ('ниже горизонта · до восхода %d мин' % (rise_m - now) if now < rise_m else 'ниже горизонта')
    date = by_id(f, 'hDate').split('·')[1].strip()
    lens_fn = lambda x, y: moon_glyph(mo['pct'], waxing, 'ms', 40).replace('<svg ', '<svg x="%.1f" y="%.1f" opacity=".85" ' % (x - 20, y - 20), 1) if MOON_IMG else moon_svg(mo['pct'], waxing).replace('<svg ', '<svg x="%.1f" y="%.1f" width="40" height="40" ' % (x - 20, y - 20), 1)
    cap = ('<div class="gd-ch">Освещённость</div><div class="gd-cap">%s<span class="lens" style="left: clamp(4px, calc(%d%% - 22px), calc(100%% - 48px))">%d</span></div>'
           '<div class="gd-scale"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></div>') % (
        cap_fill(mo['pct'], ' class="fill"', MOON_GRAD, (200, 215, 255)), mo['pct'], mo['pct'])
    card1 = ('<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Луна</b><i>%s</i></div><span class="gd-date">%s</span></div>'
             '<div class="md-hero"><span class="md-glyph">%s</span><span><div class="md-pct">%d<small style="font-size:26px">%%</small></div><div class="md-w">%s · освещена</div></span></div>'
             '<div class="gd-stats" style="margin-top:16px"><div><div class="k">Восход</div><div class="v">%s<small>%d°</small></div></div>'
             '<div><div class="k">Заход</div><div class="v">%s<small>%d°</small></div></div></div>%s</section>') % (
        state, date, moon_glyph(mo['pct'], waxing, 'mh', 112), mo['pct'], mo['phase'], mo['rise'], mo['rise_az'], mo['set'], mo['set_az'], cap)
    now_rows = [('Азимут', mo['az']), ('Высота', mo['alt']), ('Расстояние', mo['dist'])]
    card2 = '<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Сейчас</b><i>%s</i></div></div><div class="gd-rows">%s</div></section>' % (fr.at, ''.join(
        '<div class="r"><span class="k">%s</span><span class="v">%s</span></div>' % (k, v) for k, v in now_rows))
    card3 = '<section class="gl-glass gd-card"><div class="gd-hd"><div><b>Куда светит</b><i>азимут, градусы от севера</i></div></div>%s</section>' % compass_pts(mo['az_val'], mo['rise_az'], mo['set_az'], mo['az'], 'var(--ink)')
    loc = '<div class="gl-glass gd-loc">%s%s</div>' % (ic('pin', ''), by_id(f, 'hLocName'))
    return '%s<div class="gd-body">%s%s%s%s</div>' % (sky_back(fr, back, (u, lens_fn)), card1, card2, card3, loc)


# ---------- сборка ----------
EXAMPLE = {'score': 78, 'layers': [8, 40, 35], 'hum': 55, 'clouds': 28, 'sky': 'Переменно'}
EVE = lambda **k: Frame('eve_pro', 'eve', '17:41', 'evening', 'dark', **k)

BOARDS = {}


def add(name, title, body, w, h, inter=False):
    BOARDS[name] = (title, body, w, h, inter)


fe = EVE()
fx = EVE(example=EXAMPLE)
fd = Frame('day_pro', 'day', '13:56', 'day', 'dark')
fn = Frame('night_pro', 'night', '22:30', 'night', 'dark')
fl = Frame('eve_light', 'eve', '17:41', 'evening', 'light')
LINK = 'Glass_Sunset.dc.html'
add('Glass_Evening', 'Стекло · вечер, золотой час', home(fe, 'a', 852, False, LINK), 393, 852, True)
add('Glass_Example', 'Стекло · закат с цветом (пример: оценка 78)', home(fx, 'b', 852, False, LINK), 393, 852, True)
add('Glass_Day', 'Стекло · день', home(fd, 'c', 852, False, LINK), 393, 852, True)
add('Glass_Night', 'Стекло · ночь', home(fn, 'd', 852, False, LINK), 393, 852, True)
add('Glass_Light', 'Стекло · светлая тема', home(fl, 'e', 852, False, LINK), 393, 852, True)
add('Glass_Scroll', 'Стекло · вечер, вся прокрутка', home(fe, 'f', 1292, True, LINK), 393, 1292, True)
add('Glass_Sunset', 'Закат — лист подробностей, сегодня (0 / 100)', wrap(detail(fe, 'Glass_Evening.dc.html'), fe, 1445, 'gl gd'), 393, 1445)
add('Glass_Golden', 'Золотой час — лист на небе', wrap(golden_detail(fe, 'Glass_Evening.dc.html'), fe, 1560, 'gl gd'), 393, 1560)
add('Glass_Sky', 'Небо — лист на небе', wrap(sky_detail(fe, 'Glass_Evening.dc.html'), fe, 1230, 'gl gd'), 393, 1230)
fm = EVE()
fm.pal = night_palette(fm.clouds)
fm.view = fm.pal
add('Glass_Sun', 'Солнце — лист на небе', wrap(sun_detail(fe, 'Glass_Evening.dc.html'), fe, 1570, 'gl gd'), 393, 1570)
add('Glass_Moon', 'Луна — лист на небе', wrap(moon_detail(fm, 'Glass_Evening.dc.html'), fm, 1260, 'gl gd'), 393, 1260)
add('Glass_SunsetExample', 'Закат — лист подробностей, пример (78)', wrap(detail(fx, 'Glass_Example.dc.html', 'пример: цифры придуманы, чтобы показать цвет'), fx, 1475, 'gl gd'), 393, 1475)

# сравнение неба над дугой
cases = [('сегодня · 0 / 100', fe.score, fe.layers, fe.hum, 'реальный прогноз беты: нижний ярус закрыл горизонт, цвет «свинец»'),
         ('пример · 34', 34, [45, 50, 40], 70, 'нижний ярус наполовину: цвет пробивается'),
         ('пример · 62', 62, [15, 45, 40], 60, 'горизонт открыт, средний и верхний ярус горят'),
         ('пример · 90', 90, [0, 55, 55], 45, 'ясный горизонт, полная заря')]
cards = ''
for i, (cap, sc, lay, hum, note) in enumerate(cases):
    fz = EVE(example={'score': sc, 'layers': lay, 'hum': hum, 'clouds': fe.clouds, 'sky': fe.sky_word}) if i else fe
    cards += '<div class="gx">%s<div class="gx-cap"><b>%s</b><br>%s</div></div>' % (hero(fz, 'g%d' % i, None), cap, note)
dome_board = ('<div class="lp-html" data-theme="dark" style="--lp-h: 580px; width: 858px"><div class="lp-body"><div class="gl" style="%s; width: 858px; background: %s">'
              '<div style="display: grid; grid-template-columns: 393px 393px; gap: 8px 24px; padding: 24px 24px 0">%s</div></div></div></div>') % (
    fe.tokens(), '#0b0908', cards.replace('class="gl-glass gh"', 'class="gl-glass gh" style="margin-top:0"'))
add('Glass_Domes', 'Небо над дугой · от «свинца» до полной зари', dome_board, 858, 580)


def weather_board():
    cases = [('Ясно · день', 'clear', False, False, False, '18°', 'Ясно', '↓ 9° ↑ 19°', 'солнце, лучи медленно вращаются'),
             ('Ясно · ночь', 'clear', True, False, False, '4°', 'Ясно', '↓ 1° ↑ 8°', 'луна и мерцающие звёзды'),
             ('Переменная облачность', 'part', False, False, False, '12°', 'Переменно', '↓ 6° ↑ 13°', 'солнце за плывущими облаками'),
             ('Пасмурно', 'cloud', False, False, False, '9°', 'Пасмурно', '↓ 6° ↑ 10°', 'длинные размытые полосы облаков'),
             ('Дождь', 'rain', False, False, False, '7°', 'Дождь', '↓ −3° ↑ 7°', 'полосы облаков, тонкий дождь, мелкие бусинки на стекле и пара стекающих капель (по образцу Apple)'),
             ('Ливень и гроза', 'storm', False, False, True, '15°', 'Гроза', '↓ 12° ↑ 17°', 'то же гуще, редкая вспышка'),
             ('Снег', 'snow', False, True, False, '−3°', 'Снег', '↓ −7° ↑ −2°', 'хлопья и лёгкая изморозь по краям'),
             ('Мороз, ясно', 'clear', False, True, False, '−18°', 'Ясно', '↓ −24° ↑ −15°', 'изморозь по краям, искры на стекле')]
    cells = ''
    for i, (title, kind, night, frost, heavy, temp, word, hilo, note) in enumerate(cases):
        lo, _, hi = hilo.partition(' ')
        key = 'frost' if frost else ('clear_n' if night and kind in ('clear', 'part') else kind)
        icon = ('<svg class="ic" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">%s</svg>') % ICON['cloud']
        t = tile('wxt', icon, 'Погода', '<span class="gt-v">%s</span><span class="gt-s">%s</span><span class="gt-s">%s</span>' % (temp, word, hilo),
                 art=wx_art(kind, 'd%d' % i, night, frost, heavy, 3 + i), style='--g-tile-glow: %s' % WX_GLOW[key])
        cells += '<div class="gx">%s<div class="gx-cap"><b>%s</b><br>%s</div></div>' % (t, title, note)
    return ('<div class="lp-html" data-theme="dark" style="--lp-h: 460px; width: 820px"><div class="lp-body"><div class="gl" style="%s; width: 820px; background: #0b0908">'
            '<div style="display: grid; grid-template-columns: repeat(4, 179px); gap: 18px 16px; padding: 24px">%s</div></div></div></div>') % (fe.tokens(), cells)


add('Glass_Weather', 'Плитка «Погода» в состояниях (примеры)', weather_board(), 820, 460)


PLAIN_JS = '''class Component extends DCLogic {
  renderVals() {
    return {};
  }
}'''
STATE_JS = '''class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { moon: false, dates: true };
  }
  renderVals() {
    return {
      sun: !this.state.moon,
      moon: this.state.moon,
      toggle: () => this.setState({ moon: !this.state.moon }),
      datesOpen: this.state.dates,
      toggleDates: () => this.setState({ dates: !this.state.dates }),
      chevRot: this.state.dates ? 0 : 180
    };
  }
}'''


def dc(title, body, w, h, inter=False):
    script = STATE_JS if inter else PLAIN_JS
    return '''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>%s</title>
<script src="./support.js"></script>
<link rel="stylesheet" href="%s">
<link rel="stylesheet" href="%s">
<link rel="stylesheet" href="%s">
</head>
<body>
<x-dc>
<helmet>
<style>
body{margin:0}
</style>
</helmet>
%s
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":%d,"height":%d}}'>
%s
</script>
</body>
</html>
''' % (title, BETA_CSS, os.environ.get('TILES_CSS', BETA_CSS), GLASS_CSS, body, w, h, script)


if '--check' in sys.argv:
    sw = re.search(r'<div class="sky-swatch" style="background:([^"]*)"', fe.f).group(1)
    p = fe.sunset_pal
    mine = 'linear-gradient(180deg,%s 0%%,%s 38%%,%s 72%%,%s 100%%)' % (rgb(p['zenith']), rgb(p['high']), rgb(p['mid']), rgb(p['horizon']))
    print('beta swatch :', sw)
    print('port        :', mine)
    print('SAME' if sw.replace(' ', '') == mine.replace(' ', '') else 'DIFFERENT')
    print('example     :', {k: rgb(v) for k, v in fx.sunset_pal.items() if k != 'life'}, 'life %.2f' % fx.sunset_pal['life'])

for name, (title, body, w, h, inter) in BOARDS.items():
    if TEST:
        page = ('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="%s"><link rel="stylesheet" href="%s">'
                '<style>body{margin:0}</style></head><body>%s</body></html>') % (BETA_CSS, GLASS_CSS, body)
        open(os.path.join(TEST, name + '.test.html'), 'w', encoding='utf-8').write(page)
    else:
        open(os.path.join(PROJECT, name + '.dc.html'), 'w', encoding='utf-8').write(dc(title, body, w, h, inter))
    print(name, w, h, len(body))

if TEST:
    HERO_MODE = 'moon'
    for nm, fr_, uid_ in (('Glass_Evening', fe, 'a'), ('Glass_Day', fd, 'c'), ('Glass_Night', fn, 'd'), ('Glass_Light', fl, 'e')):
        body = home(fr_, uid_, 852, False, LINK)
        open(os.path.join(TEST, nm + '_moon.test.html'), 'w', encoding='utf-8').write(
            ('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="%s"><link rel="stylesheet" href="%s">'
             '<style>body{margin:0}</style></head><body>%s</body></html>') % (BETA_CSS, GLASS_CSS, body))
    HERO_MODE = 'sun'
