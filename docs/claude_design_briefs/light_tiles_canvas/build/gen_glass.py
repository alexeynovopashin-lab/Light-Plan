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
        detail = ('linear-gradient(180deg, %s 0px, %s 80px, %s 165px, %s 255px, %s 442px, %s 100%%)') % (
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


def sky_bg(fr, pal, hz=None):
    """Небо на весь верх экрана, не только внутри кольца: зенит → розовые облака → алый → горизонт ровно на линии стекла (y = 215),
    ниже горизонта цвет уходит в фон страницы."""
    base = hexc('#0b0908') if fr.theme == 'dark' else hexc('#eee8de')
    hz = hz or 50 + RC   # верх кольца стоит на 50 px от края кадра, горизонт — на уровне его центра
    stops = [(0, pal['zenith']), (90, pal['high']), (hz - 45, pal['mid']), (hz, pal['horizon']), (hz + 85, lerp(pal['mid'], base, .62)), (hz + 215, base)]
    return 'linear-gradient(180deg, %s)' % ', '.join('%s %dpx' % (rgb(c), y) for y, c in stops)


def sky_mesh(pal, warm, hz=None, sun_x=.5):
    """Живое небо поверх ровного градиента: большие мягкие пятна цветов палитры, и небо несимметрично. Со стороны светила (sun_x: 0 — слева,
    1 — справа, по месту светила на кольце) тёплый свет: ярче и крупнее, пятна цвета горизонта и самого светила; с противоположной стороны —
    холодный тёмный зенит и сумрак. Пятна наклонены под разными углами, разного размера и силы, каждое очень медленно плывёт и дышит
    (88–140 с на ход туда и обратно), ходы и фазы не совпадают. Снизу пятна растворяются, как и сам градиент."""
    hz = hz or 50 + RC
    life = pal.get('life', 0)
    W = 417.0

    def sat(c, k):
        mean = sum(c) / 3.0
        return tuple(int(clamp(mean + (v - mean) * k, 0, 255)) for v in c)
    z, h, m, hzc = (sat(pal[k], 1.35) for k in ('zenith', 'high', 'mid', 'horizon'))
    cool = lerp(z, (40, 52, 100), .5)
    dusk = lerp(h, (46, 54, 96), .55)
    rose = lerp(h, (196, 112, 150), .35 * life)
    ember = lerp(hzc, (232, 104, 58), .4 * life)
    wa = .5 + .3 * life
    right = sun_x >= .5
    # (x от левого края стороны светила = «холодный» край, y, ширина, высота, наклон°, цвет, сила, ход 1..4, период с, фаза с)
    blobs = [
        (-150, hz - 330, 560, 400, 22, z, .95, 1, 118, 0),          # холодный зенит с дальней стороны
        (-110, hz - 200, 480, 320, -16, dusk, .85, 3, 96, 40),      # сумрак слева, на уровне облаков
        (-130, hz - 80, 460, 280, 12, cool, .70, 4, 126, 57),       # холодный низ с дальней стороны
        (60, hz - 300, 420, 300, 28, h, .78, 2, 104, 31),           # облака сверху, ближе к центру
        (120, hz - 220, 460, 320, -24, rose, .82, 1, 92, 14),       # розовая полоса наискосок к светилу
        (80, hz - 120, 520, 300, 10, m, .85, 3, 110, 70),           # середина, тёплеет к светилу
        (190, hz - 150, 560, 340, -14, ember, .95, 2, 100, 22),     # главный тёплый размыв у светила
        (150, hz - 40, 560, 260, 6, hzc, .92, 4, 88, 9),            # горизонт, ярче со стороны светила
        (250, hz - 110, 340, 260, 0, warm, wa, 1, 134, 77),         # сам свет светила
        (60, hz + 40, 560, 240, 4, lerp(m, hzc, .5), .55, 3, 120, 51)]  # отсвет под горизонтом
    out = ''
    for x, y, w, hh, rot, c, al, k, dur, dl in blobs:
        left = x if right else W - x - w
        out += ('<b class="dx-b" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx;rotate:%ddeg;background: radial-gradient(closest-side, %s, %s);'
                'animation: dx-f%d %ds ease-in-out -%ds infinite alternate"></b>') % (
            left, y, w, hh, rot if right else -rot, rgba(c, al), rgba(c, 0), k, dur, dl)
    return '<span class="sky-m">%s</span>' % out


def ring_svg(uid, pal, pos, knob, warm=True, halo=True):
    """Светящееся кольцо траектории. Сердцевина — раскалённая тонкая линия на градиентной дуге беты (у горизонта янтарь и краснее,
    к зениту светлеет, ночная половина уходит в холодный тон); вокруг — ореол: широкое размытое свечение тем же градиентом, свечение
    поуже, внутренний отсвет по краю и мелкие радиальные риски снаружи, как волосяная кромка. Луна — тот же ход, но серебристо-голубой.
    halo=False — только сердцевина и риски (копия поверх стекла плиток, чтобы кольцо просвечивало)."""
    th = math.pi * (1 - pos[1]) if pos[0] == 'up' else -math.pi * pos[1]
    kx, ky = RC + RR * math.cos(th), RC - RR * math.sin(th)
    hz = (232, 104, 58) if warm else (150, 176, 226)
    mid = (226, 164, 76) if warm else (190, 206, 240)
    hot = lerp((255, 250, 236), mid, .25)
    x0, x1 = RC - RR, RC + RR
    up = 'M %d %d A %d %d 0 0 1 %d %d' % (x0, RC, RR, RR, x1, RC)
    dn = 'M %d %d A %d %d 0 0 0 %d %d' % (x0, RC, RR, RR, x1, RC)
    tu, td = [], []
    for i in range(0, 180):
        t = math.radians(i * 2.0)
        r0, r1 = RR + 8, RR + 8 + (6.5 if i % 5 == 0 else 3.6)
        seg = 'M%.1f %.1fL%.1f %.1f' % (RC + r0 * math.cos(t), RC - r0 * math.sin(t), RC + r1 * math.cos(t), RC - r1 * math.sin(t))
        (tu if math.sin(t) > 0 else td).append(seg)

    def both(w, extra):
        return ('<path d="%s" fill="none" stroke="url(#rgu%s)" stroke-width="%s" %s></path>'
                '<path d="%s" fill="none" stroke="url(#rgd%s)" stroke-width="%s" %s></path>') % (up, uid, w, extra, dn, uid, w, extra)
    layers = ''
    if halo:
        layers += '<circle cx="%d" cy="%d" r="%d" fill="url(#rin%s)"></circle>' % (RC, RC, RR, uid)
        layers += both(34, 'opacity=".5" filter="url(#rh%s)"' % uid)
        layers += both(11, 'opacity=".85" filter="url(#rg%s)"' % uid)
    layers += ('<path d="%s" fill="none" stroke="url(#rgu%s)" stroke-width="1" opacity=".55"></path>'
               '<path d="%s" fill="none" stroke="url(#rgd%s)" stroke-width="1" opacity=".55"></path>') % (''.join(tu), uid, ''.join(td), uid)
    layers += both(3.2, '')
    layers += ('<path d="%s" fill="none" stroke="%s" stroke-width="1.2" stroke-linecap="round" opacity=".85"></path>'
               '<path d="%s" fill="none" stroke="%s" stroke-width="1.2" stroke-linecap="round" opacity=".6"></path>') % (up, rgb(hot), dn, rgb(hot))
    return ('<svg class="ring" viewBox="0 0 %d %d" width="%d" height="%d" aria-hidden="true"><defs>'
            '<linearGradient id="rgu%s" x1="0" y1="%d" x2="0" y2="%d" gradientUnits="userSpaceOnUse">'
            '<stop offset="0" style="stop-color: var(--arc-mid); stop-opacity: .78"></stop><stop offset=".45" style="stop-color: var(--arc-mid); stop-opacity: .5"></stop>'
            '<stop offset=".76" stop-color="%s" stop-opacity=".95"></stop><stop offset="1" stop-color="%s"></stop></linearGradient>'
            '<linearGradient id="rgd%s" x1="0" y1="%d" x2="0" y2="%d" gradientUnits="userSpaceOnUse">'
            '<stop offset="0" stop-color="%s" stop-opacity=".9"></stop><stop offset=".3" stop-color="%s" stop-opacity=".45"></stop><stop offset="1" stop-color="rgb(110,126,162)" stop-opacity=".4"></stop></linearGradient>'
            '<radialGradient id="rin%s" cx="50%%" cy="50%%" r="50%%"><stop offset=".6" stop-color="%s" stop-opacity="0"></stop><stop offset=".86" stop-color="%s" stop-opacity=".12"></stop>'
            '<stop offset="1" stop-color="%s" stop-opacity=".36"></stop></radialGradient>'
            '<linearGradient id="rk%s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0bd"></stop><stop offset="1" stop-color="#d8b36c"></stop></linearGradient>'
            '<filter id="rb%s" x="-80%%" y="-80%%" width="260%%" height="260%%"><feGaussianBlur stdDeviation="9"></feGaussianBlur></filter>'
            '<filter id="rs%s" x="-80%%" y="-80%%" width="260%%" height="260%%"><feGaussianBlur stdDeviation="2.6"></feGaussianBlur></filter>'
            '<filter id="rh%s" x="-30%%" y="-60%%" width="160%%" height="220%%"><feGaussianBlur stdDeviation="13"></feGaussianBlur></filter>'
            '<filter id="rg%s" x="-30%%" y="-60%%" width="160%%" height="220%%"><feGaussianBlur stdDeviation="3.6"></feGaussianBlur></filter></defs>%s%s</svg>') % (
        RS, RS, RS, RS, uid, RC - RR, RC, rgb(mid), rgb(hz), uid, RC, RC + RR, rgb(hz), rgb(mid), uid, rgb(mid), rgb(mid), rgb(hz),
        uid, uid, uid, uid, uid, layers, knob(kx, ky, uid, pal, pos[0] == 'down'))


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
            '<defs><radialGradient id="lf%s" cx="38%%" cy="32%%" r="78%%"><stop offset="0" stop-color="#fff" stop-opacity=".5"></stop><stop offset=".55" stop-color="%s" stop-opacity=".3"></stop><stop offset="1" stop-color="%s" stop-opacity=".14"></stop></radialGradient>'
            '<radialGradient id="lc%s" cx="50%%" cy="50%%" r="50%%"><stop offset="0" stop-color="#fff" stop-opacity=".95"></stop><stop offset=".35" stop-color="%s" stop-opacity=".8"></stop><stop offset="1" stop-color="%s" stop-opacity="0"></stop></radialGradient>'
            '<linearGradient id="lr%s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"></stop><stop offset=".5" stop-color="#fff" stop-opacity=".14"></stop><stop offset="1" stop-color="%s" stop-opacity=".75"></stop></linearGradient></defs>'
            '<g opacity="%.2f"><circle cx="%.1f" cy="%.1f" r="24" fill="url(#lc%s)"></circle>'
            '<circle cx="%.1f" cy="%.1f" r="13.5" fill="url(#lf%s)" stroke="url(#lr%s)" stroke-width="1.3"></circle>'
            '<ellipse cx="%.1f" cy="%.1f" rx="5.6" ry="2.7" transform="rotate(-38 %.1f %.1f)" fill="#fff" opacity=".6"></ellipse>'
            '<circle cx="%.1f" cy="%.1f" r="4.6" fill="url(#lc%s)"></circle></g>') % (
        uid, rgb(deep_c), min(.34 * k, .9), rgb(deep_c), min(.13 * k, .55), rgb(deep_c), x, y, uid, deep,
        uid, rgb(c), rgb(c), uid, rgb(c), rgb(c), uid, rgb(c), v, x, y, uid, x, y, uid, uid, x - 4.2, y - 5.2, x - 4.2, y - 5.2, x, y, uid)


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
    nokn = lambda x, y, u_, pal, down=False: ''
    sun = ('<div class="hero2"><i class="sky" style="background: %s">%s</i>%s<div class="ring-over">%s</div>%s%s%s</div>') % (
        sky_bg(fr, fr.view), sky_mesh(fr.view, sky_color(sun_e), None, sun_pos[1] if sun_pos[0] == 'up' else 1 - sun_pos[1]), ring_svg(uid, fr.view, sun_pos, lambda x, y, u_, pal, down: knob_sun(x, y, u_, sun_e, fr.theme)), ring_svg(uid + 'o', fr.view, sun_pos, nokn, True, False), _panel(by_id(f, 'drTime'), by_id(f, 'drPhase'), by_id(f, 'drSense'), uid), _add(), _sw('moon', 'Показать луну'))
    mo, mv, md = fr.moon, moon_view(fr), MOONDOME[fr.mk]
    mpos = ring_pos_moon(now, mins(mo['rise']), mins(mo['set']))
    waxing = mo['phase'].startswith('Раст')

    def knob_moon(x, y, u_, pal, down=False):
        inner = moon_glyph(mo['pct'], waxing, 'mk' + u_, 30).replace('<svg ', '<svg x="%.1f" y="%.1f" ' % (x - 15, y - 15), 1) if MOON_IMG else moon_svg(mo['pct'], waxing).replace('<svg ', '<svg x="%.1f" y="%.1f" width="30" height="30" ' % (x - 15, y - 15), 1)
        body = '<circle cx=\"%.1f\" cy=\"%.1f\" r=\"17\" fill=\"none\" stroke=\"#fff\" stroke-width=\"3\"></circle>%s' % (x, y, inner)
        if not down:
            return body
        return ('<circle cx=\"%.1f\" cy=\"%.1f\" r=\"34\" fill=\"rgb(168,189,216)\" opacity=\".35\" filter=\"url(#rb%s)\"></circle><g opacity=\".85\">%s</g>') % (x, y, u_, body)

    moon = ('<div class="hero2"><i class="sky" style="background: %s">%s</i>%s<div class="ring-over">%s</div>%s%s%s</div>') % (
        sky_bg(fr, mv), sky_mesh(mv, (150, 176, 226), None, mpos[1] if mpos[0] == 'up' else 1 - mpos[1]), ring_svg(uid + 'm', mv, mpos, knob_moon, False), ring_svg(uid + 'mo', mv, mpos, nokn, False, False), _panel(by_id(md, 'drTime'), by_id(md, 'drPhase'), by_id(md, 'drSense'), uid + 'm'), _add(), _sw('sun', 'Показать солнце'))
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


def wx_art(kind, u, night=False, frost=False, heavy=False, seed=1):
    """Картинка плитки «Погода» — только градиенты, без предметов (ни лучей, ни капель, ни облаков-силуэтов): на плитке цвет и свет состояния.
    Основа — линейный градиент, поверх него 3–4 больших мягких радиальных пятна; светлые у верхнего правого угла (солнце, луна), тёмные и
    холодные внизу слева, где текст. Пятна очень медленно плывут (54–92 с на ход). Вид — из слова погоды и облачности беты (`wx_kind`),
    ночь — по фазе, изморозь — по температуре: ледяной градиент от углов."""
    L = []
    n = [0]
    dim = (lambda c: ','.join(str(int(int(v) * .72)) for v in c.split(','))) if night else (lambda c: c)

    def base(c1, c2, ang):
        L.append('<i class="wxg-base" style="background: linear-gradient(%ddeg, %s, %s)"></i>' % (ang, c1, c2))

    def bl(x, y, w, h, col, al, dur, flash=False):
        n[0] += 1
        k = 1 + (n[0] + seed) % 4
        L.append('<i class="wxg%s" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx;background: radial-gradient(closest-side, rgba(%s,%.2f), rgba(%s,0));animation: %s"></i>' % (
            ' wxg-flash' if flash else '', x, y, w, h, col, min(al, .95), col,
            'wxg-flash 9s ease-out infinite' if flash else 'wxg-f%d %ds ease-in-out -%ds infinite alternate' % (k, dur, (n[0] * 13 + seed * 7) % dur)))
    hv = 1.25 if heavy else 1.0
    if kind == 'clear' and not night:
        base('rgba(255,184,84,.34)', 'rgba(255,120,50,.06)', 200)
        bl(105, -48, 210, 200, '255,216,128', .80, 52)
        bl(40, -10, 220, 160, '255,160,72', .36, 64)
        bl(-50, 64, 230, 130, '214,100,56', .20, 76)
    elif kind == 'clear':
        base('rgba(34,46,120,.40)', 'rgba(10,14,44,.10)', 200)
        bl(110, -50, 200, 190, '190,206,255', .34, 58)
        bl(-20, 30, 230, 150, '60,84,196', .38, 70)
        bl(70, 70, 190, 110, '118,86,186', .22, 82)
    elif kind == 'part' and not night:
        base('rgba(190,170,130,.20)', 'rgba(60,70,96,.18)', 190)
        bl(110, -40, 190, 170, '255,208,124', .50, 56)
        bl(-10, 10, 200, 110, '170,186,214', .22, 66)
        bl(60, 60, 210, 110, '92,106,140', .34, 78)
    elif kind == 'part':
        base('rgba(40,52,110,.30)', 'rgba(16,20,48,.16)', 190)
        bl(112, -40, 170, 160, '190,206,255', .28, 60)
        bl(-10, 20, 210, 120, '110,124,170', .34, 70)
        bl(70, 66, 200, 100, '62,76,128', .34, 82)
    elif kind == 'cloud':
        base('rgba(%s,.34)' % dim('120,134,168'), 'rgba(%s,.22)' % dim('44,54,82'), 170)
        bl(-30, -30, 230, 120, dim('196,208,230'), .30, 56)
        bl(60, 10, 200, 110, dim('138,152,184'), .45, 68)
        bl(-20, 70, 230, 110, dim('70,82,114'), .50, 80)
        bl(100, 56, 150, 90, dim('160,174,204'), .26, 92)
    elif kind in ('rain', 'storm'):
        base('rgba(70,88,128,.46)', 'rgba(26,36,66,.34)', 180)
        bl(-20, -30, 240, 110, '116,134,176', .42 * hv, 54)
        bl(40, 24, 200, 110, '62,80,122', .55 * hv, 66)
        bl(-30, 76, 240, 100, '32,50,92', .55 * hv, 78)
        bl(110, 60, 140, 90, '130,164,214', .26, 90)
        if kind == 'storm':
            bl(60, 0, 200, 140, '120,90,186', .40, 60)
            bl(20, -20, 200, 130, '200,210,255', .60, 9, True)
    elif kind == 'snow':
        base('rgba(170,200,240,.28)', 'rgba(70,96,150,.18)', 190)
        bl(60, -50, 220, 120, '228,240,255', .34, 56)
        bl(70, 10, 190, 120, '168,198,240', .34, 68)
        bl(-30, 70, 230, 110, '104,134,190', .26, 80)
    elif kind == 'fog':
        base('rgba(176,184,198,.26)', 'rgba(120,128,144,.18)', 180)
        bl(-40, -10, 260, 90, '208,214,226', .38, 60)
        bl(-20, 50, 260, 90, '168,176,192', .34, 72)
    if frost:
        L.append('<i class="wxg-base" style="background: radial-gradient(90% 70% at 0% 0%, rgba(200,236,255,.20), transparent 55%), radial-gradient(110% 90% at 100% 100%, rgba(170,220,255,.34), transparent 55%)"></i>')
        bl(-60, -50, 150, 120, '170,224,255', .18, 62)
        bl(80, 60, 170, 110, '190,232,255', .24, 74)
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


# ── Диск времени: два кольца вместо нижней панели слайдера ───────────────────────────────────────────────
DL_CX, DL_CY, DL_H = 196.5, 333, 330
DL_D1, DL_D0 = 311, 267          # внешнее кольцо — сутки (компактное, 44 px)
DL_H1, DL_H0 = 262, 190          # внутреннее кольцо — часы
DL_HUB = 184
DL_DEG_PER_DAY = 15.0            # на сколько градусов внешнее кольцо уходит за сутки: 24 часа внутреннего (360°) = 15° внешнего


def dl_pt(r, a):
    ar = math.radians(a)
    return DL_CX + r * math.sin(ar), DL_CY - r * math.cos(ar)


def dl_sector(r0, r1, a0, a1):
    q = lambda p: '%.1f %.1f' % p
    big = 1 if abs(a1 - a0) > 180 else 0
    return 'M %s L %s A %d %d 0 %d 1 %s L %s A %d %d 0 %d 0 %s Z' % (
        q(dl_pt(r0, a0)), q(dl_pt(r1, a0)), r1, r1, big, q(dl_pt(r1, a1)), q(dl_pt(r0, a1)), r0, r0, big, q(dl_pt(r0, a0)))


def dl_rot(a):
    return 'rotate(%.2f %.1f %d)' % (a, DL_CX, DL_CY)


def dial(fr, f, timebar):
    """Диск времени. Одно общее время T (минуты от 00:00 сегодняшнего дня): внутреннее кольцо — часы, оборот = сутки; внешнее — сутки,
    15° на день. Передача 24:1: час на внутреннем кольце сдвигает внешнее чуть-чуть, сутки на внешнем прокручивают внутреннее на целый оборот.
    Цвета часового кольца — шкала света беты (--rail-img) на сегодня; дни и значки погоды — те же пять дней, что в панели дат.
    Солнце (или луна) стоит на дуге у указателя и меняет цвет по лестнице неба беты вместе с временем."""
    now = mins(fr.at)
    e_now = sun_model(fr)[0](now)
    B = lambda name, val: str(val) if TEST else '{{%s}}' % name
    rail = re.search(r'--rail-img:\s*linear-gradient\(90deg,(.*?)\)\s*;', timebar, re.S) or re.search(r'--rail-img:\s*linear-gradient\(90deg,(.*?)\)"', timebar, re.S)
    stops = [(float(p), 'rgba(%s,%s,%s,%s)' % (r_, g_, b_, a_)) for r_, g_, b_, a_, p in re.findall(r'rgba\(([\d.]+),([\d.]+),([\d.]+),([\d.]+)\) ([\d.]+)%', rail.group(1))]

    def rail_at(m):
        pct = ((m - 64) % 1440) * 100.0 / 1440
        return min(stops, key=lambda s: abs(s[0] - pct))[1]
    wedges = ''.join('<path d="%s" fill="%s" stroke="%s" stroke-width=".5"></path>' % (
        dl_sector(DL_H1 - 17, DL_H1, m / 4.0, (m + 15) / 4.0), rail_at(m + 7), rail_at(m + 7)) for m in range(0, 1440, 15))
    # риски как на часах: каждые 5 минут, длиннее на получасе, самые длинные и толстые — на часе
    t5, t30, t60 = [], [], []
    for m in range(0, 1440, 5):
        a = m / 4.0
        r0, bucket = (DL_H1 - 34, t60) if m % 60 == 0 else (DL_H1 - 27, t30) if m % 30 == 0 else (DL_H1 - 22, t5)
        bucket.append('M%.1f %.1fL%.1f %.1f' % (*dl_pt(r0, a), *dl_pt(DL_H1 - 19, a)))
    ticks = ('<path d="%s" class="dl-tk"></path><path d="%s" class="dl-tk m"></path><path d="%s" class="dl-tk b"></path>') % (''.join(t5), ''.join(t30), ''.join(t60))
    nums = []
    for h in range(24):
        x, y = dl_pt(DL_H1 - 50, 0)
        nums.append('<text x="%.1f" y="%.1f" class="dl-num%s" transform="%s">%02d</text>' % (x, y, ' q' if h % 3 == 0 else '', dl_rot(h * 15), h))
    marks = ''.join('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" class="dl-sun"></line>' % (*dl_pt(DL_H1 - 19, m / 4.0), *dl_pt(DL_H1 + 3, m / 4.0))
                    for m in (mins(fr.rise), mins(fr.set)))
    hours_g = ('<g style="transform-box: view-box; transform-origin: %.1fpx %dpx; transform: rotate(%sdeg); transition: transform %ss cubic-bezier(.22,.8,.25,1)">%s%s%s%s</g>' % (
        DL_CX, DL_CY, B('hoursDeg', '%.2f' % (-now / 4.0)), B('hDur', '0.6'), wedges, ticks, ''.join(nums), marks))
    cells = re.findall(r'<div class="drum-cell( center)?"[^>]*><span class="dc-num">(.*?)</span><span class="dc-ic">(.*?)</span></div>', timebar, re.S)
    ci = [i for i, c in enumerate(cells) if c[0]][0]
    row5 = cells[ci - 2:ci + 3]
    dows = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
    day_parts = []
    for k in range(-8, 11):
        a = k * DL_DEG_PER_DAY
        day_parts.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" class="dl-div"></line>' % (*dl_pt(DL_D0, a), *dl_pt(DL_D1, a)))
    for i, (_, num, ic_) in enumerate(row5):
        k = i - 2
        a = k * DL_DEG_PER_DAY
        on = ('%.2f' % (.2 if k == 0 else 0)) if TEST else '{{c%d}}' % i
        day_parts.append('<path d="%s" class="dl-cell" style="fill-opacity: %s; transition: fill-opacity .4s"></path>' % (dl_sector(DL_D0, DL_D1, a, a + DL_DEG_PER_DAY), on))
        mid = a + DL_DEG_PER_DAY / 2
        x, y = dl_pt(DL_D1 - 13, 0)
        day_parts.append('<text x="%.1f" y="%.1f" class="dl-day" transform="%s">%s</text>' % (x, y, dl_rot(mid), text(num)))
        vb = re.search(r'viewBox="([^"]+)"', ic_)
        inner = re.sub(r'^<svg[^>]*>|</svg>$', '', ic_.strip())
        x, y = dl_pt(DL_D1 - 31, 0)
        day_parts.append('<g transform="%s"><svg x="%.1f" y="%.1f" width="16" height="16" viewBox="%s" class="dl-wx" stroke-linecap="round" stroke-linejoin="round">%s</svg></g>' % (
            dl_rot(mid), x - 8, y - 8, vb.group(1) if vb else '0 0 24 24', inner))
    days_g = ('<g style="transform-box: view-box; transform-origin: %.1fpx %dpx; transform: rotate(%sdeg); transition: transform %ss cubic-bezier(.22,.8,.25,1)">%s</g>' % (
        DL_CX, DL_CY, B('daysDeg', '%.2f' % (-now / 96.0)), B('dDur', '0.6'), ''.join(day_parts)))
    ring = lambda r0, r1: '<circle cx="%.1f" cy="%d" r="%.1f" class="dl-ring" style="stroke-width: %d"></circle>' % (DL_CX, DL_CY, (r0 + r1) / 2.0, r1 - r0)
    edge = lambda r: '<circle cx="%.1f" cy="%d" r="%d" class="dl-edge-c"></circle>' % (DL_CX, DL_CY, r)
    fixed_under = ring(DL_D0, DL_D1) + ring(DL_H0, DL_H1) + edge(DL_D1) + edge(DL_D0) + edge(DL_H1) + edge(DL_H0)
    window = '<path d="%s" class="dl-window"></path>' % dl_sector(DL_H0, DL_H1, -7.5, 7.5)
    hub = '<circle cx="%.1f" cy="%d" r="%d" class="dl-hubc"></circle>' % (DL_CX, DL_CY, DL_HUB)
    svg = '<svg class="dl-svg" viewBox="0 0 393 %d" width="393" height="%d" aria-hidden="true">%s%s%s%s%s</svg>' % (DL_H, DL_H, fixed_under, hours_g, days_g, window, hub)
    # светило на дуге: у указателя, на цветной полосе часов; цвет — лестница неба беты от высоты солнца, под горизонтом не исчезает
    mx, my = dl_pt(DL_H1 - 8.5, 0)
    sc = rgb(sky_color(e_now))
    sun_mk = ('<svg class="dl-mk" viewBox="0 0 393 %d" width="393" height="%d" aria-hidden="true"><defs><radialGradient id="dlg" cx="50%%" cy="50%%" r="50%%">'
              '<stop offset="0" style="stop-color: %s" stop-opacity=".7"></stop><stop offset=".45" style="stop-color: %s" stop-opacity=".28"></stop><stop offset="1" style="stop-color: %s" stop-opacity="0"></stop></radialGradient></defs>'
              '<radialGradient id="dlf" cx="38%%" cy="32%%" r="78%%"><stop offset="0" stop-color="#fff" stop-opacity=".5"></stop><stop offset=".55" style="stop-color: %s" stop-opacity=".3"></stop><stop offset="1" style="stop-color: %s" stop-opacity=".14"></stop></radialGradient>'
              '<radialGradient id="dlc" cx="50%%" cy="50%%" r="50%%"><stop offset="0" stop-color="#fff" stop-opacity=".95"></stop><stop offset=".35" style="stop-color: %s" stop-opacity=".8"></stop><stop offset="1" style="stop-color: %s" stop-opacity="0"></stop></radialGradient>'
              '<linearGradient id="dlr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"></stop><stop offset=".5" stop-color="#fff" stop-opacity=".14"></stop><stop offset="1" style="stop-color: %s" stop-opacity=".75"></stop></linearGradient>'
              '<circle cx="%.1f" cy="%.1f" r="30" fill="url(#dlg)" style="opacity: %s"></circle>'
              '<circle cx="%.1f" cy="%.1f" r="12" fill="url(#dlf)" stroke="url(#dlr)" stroke-width="1.2"></circle>'
              '<ellipse cx="%.1f" cy="%.1f" rx="4.6" ry="2.2" transform="rotate(-38 %.1f %.1f)" fill="#fff" opacity=".6"></ellipse>'
              '<circle cx="%.1f" cy="%.1f" r="4" fill="url(#dlc)"></circle></svg>') % (
        DL_H, DL_H, B('sunCol', sc), B('sunCol', sc), B('sunCol', sc), B('sunCol', sc), B('sunCol', sc), B('sunCol', sc), B('sunCol', sc), B('sunCol', sc),
        mx, my, B('sunGlow', '%.2f' % clamp(1 + e_now / 8.0, .2, 1)), mx, my, mx - 3.6, my - 4.4, mx - 3.6, my - 4.4, mx, my)
    mo = fr.moon
    waxing = mo['phase'].startswith('Раст')
    mglyph = moon_glyph(mo['pct'], waxing, 'dmk', 24).replace('<svg ', '<svg x="%.1f" y="%.1f" ' % (mx - 12, my - 12), 1)
    moon_mk = ('<svg class="dl-mk" viewBox="0 0 393 %d" width="393" height="%d" aria-hidden="true"><circle cx="%.1f" cy="%.1f" r="14" fill="none" stroke="#fff" stroke-width="2.4"></circle>%s</svg>') % (
        DL_H, DL_H, mx, my, mglyph)
    markers = sun_mk if TEST else '<sc-if value="{{sun}}" hint-placeholder-val="{{ true }}">%s</sc-if><sc-if value="{{moon}}" hint-placeholder-val="{{ false }}">%s</sc-if>' % (sun_mk, moon_mk)

    def hit(r0, r1, a0, a1, fn, label):
        path = dl_sector(r0, r1, a0, a1)
        return '<button type="button" class="dl-hit" aria-label="%s"%s style="clip-path: path(\'%s\')"></button>' % (
            label, '' if TEST else ' onClick="{{%s}}"' % fn, path)
    hits = (hit(DL_D0, DL_D1, -90, 0, 'dayMinus', 'На сутки назад') + hit(DL_D0, DL_D1, 0, 90, 'dayPlus', 'На сутки вперёд') +
            hit(DL_H0, DL_H1, -90, 0, 'hrMinus', 'На час назад') + hit(DL_H0, DL_H1, 0, 90, 'hrPlus', 'На час вперёд'))
    edges_src = re.findall(r'<span class="edge" id="(edge(?:Rise|Set))">(<svg.*?</svg>)<span>([\d:]+)</span></span>', timebar, re.S)
    edges = ''.join('<span class="dl-ed">%s<span>%s</span></span>' % (s, t) for _, s, t in edges_src)
    hubtxt = ('<div class="dl-hubtxt"><span class="dl-date">%s</span><span class="dl-time">%s</span><span class="dl-eds">%s</span></div>') % (
        B('dateText', '%s · 28 ОКТЯБРЯ' % dows[2]), B('timeText', fr.at), edges)
    chev = ('<button type="button" class="gl-glass dl-chev" aria-label="Свернуть или развернуть диск"%s><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="transform: rotate(%sdeg)"><path d="M6 9l6 6 6-6"></path></svg></button>') % (
        '' if TEST else ' onClick="{{toggleDial}}"', B('chevRot', '0'))
    return ('<div class="dl" style="transform: translateY(%spx)"><div class="dl-bg"></div>%s%s%s%s%s</div>') % (B('dialY', '0'), svg, markers, hubtxt, hits, chev)


def dial_scene(fr, uid):
    """Фон экрана с диском: то же живое небо, что у кадров с куполом; кольца траектории здесь нет (светило стоит на диске)."""
    now = mins(fr.at)
    e_now = sun_model(fr)[0](now)
    hzp = 300
    sp = ring_pos_sun(now, mins(fr.rise), mins(fr.set))
    sx = sp[1] if sp[0] == 'up' else 1 - sp[1]
    mo = fr.moon
    mp = ring_pos_moon(now, mins(mo['rise']), mins(mo['set']))
    mx = mp[1] if mp[0] == 'up' else 1 - mp[1]
    sun = '<div class="dx-scene"><i class="dx-sky" style="background: %s">%s</i>%s%s</div>' % (
        sky_bg(fr, fr.view, hzp), sky_mesh(fr.view, sky_color(e_now), hzp, sx), _add(), _sw('moon', 'Показать луну'))
    mv = moon_view(fr)
    moon = '<div class="dx-scene"><i class="dx-sky" style="background: %s">%s</i>%s%s</div>' % (
        sky_bg(fr, mv, hzp), sky_mesh(mv, (150, 176, 226), hzp, mx), _add(), _sw('sun', 'Показать солнце'))
    if HERO_MODE == 'sun':
        return sun
    if HERO_MODE == 'moon':
        return moon
    return '<sc-if value="{{sun}}" hint-placeholder-val="{{ true }}">%s</sc-if><sc-if value="{{moon}}" hint-placeholder-val="{{ false }}">%s</sc-if>' % (sun, moon)


def home(fr, uid, h, scroll, link_to, dial_mode=False):
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
    if dial_mode:
        body = '%s<div class="gl-main dx-main">%s<div class="gl-grid">%s</div></div>' % (dial_scene(fr, uid), header, ''.join(tiles))
        body += '<div class="gl-fade"></div>%s<nav class="gl-glass gl-tabs">%s</nav>' % (dial(fr, f, block(f, '<div class="timebar" id="timebar">')), tabs)
        return wrap(body, fr, h, 'gl dx')
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


HZD = 252   # горизонт на листах «на небе»: верхняя пустота сжата, карточка начинается сразу под ним


def sky_back(fr, back, moon=None):
    """Шапка листов: небо, траектория светила пунктиром с хвостами за горизонт, под ней светящийся «холм» цветом заката; стеклянная «назад».
    moon = (u, lens_fn): дуга луны по доле пути u и функция, рисующая диск в точке (x, y); без неё — солнце по настоящей кривой высоты."""
    p = fr.view
    if moon:
        u, lens_fn = moon
        pt = lambda s: (24 + 345 * s / 60.0, HZD - 128 * math.sin(math.pi * s / 60.0))
        pts = [pt(s) for s in range(0, 61)]
        tl = [pt(s / 4.0) for s in range(-20, 1)]
        tr = [pt(60 + s / 4.0) for s in range(0, 21)]
        lx, ly = pt(60 * u)
        c1, c2, a1, a2 = (205, 218, 245), (120, 146, 205), .55, .32
        lens = lens_fn(lx, ly)
    else:
        alt, hmax = sun_model(fr)
        ra, st, now = mins(fr.rise), mins(fr.set), mins(fr.at)
        # одна гладкая кривая через весь путь: высота в момент восхода (≈ −0,8° с рефракцией) ложится на линию горизонта,
        # без среза в ноль — иначе у горизонта основная дуга идёт ровно, а хвост уходит вниз, и на стыке излом
        a0 = alt(ra)
        k = 130.0 / (hmax - a0)
        X = lambda t: 24 + (t - ra) / float(st - ra) * 345
        Y = lambda t: HZD - (alt(t) - a0) * k
        pts = [(X(t), Y(t)) for t in list(range(ra, st, 5)) + [st]]
        tl = [(X(t), Y(t)) for t in range(ra - 48, ra + 1, 3)]
        tr = [(X(t), Y(t)) for t in range(st, st + 49, 3)]
        tn = clamp(now, ra, st)
        lx, ly = X(tn), Y(tn)
        # холм светлее неба вокруг: тот же цвет, осветлённый, и режим plus-lighter — иначе он тонет в цвете заката
        warm1, warm2 = lerp((255, 255, 255), (255, 238, 195), p['life']), lerp((255, 255, 255), (255, 190, 120), p['life'])
        c1, c2 = lerp(p['horizon'], warm1, .45), lerp(p['mid'], warm2, .40)
        a1, a2 = .26 + .42 * p['life'], .16 + .34 * p['life']
        lens = ('<circle cx="%.1f" cy="%.1f" r="28" fill="%s" opacity="%.2f" filter="url(#mb)"></circle>'
                '<circle cx="%.1f" cy="%.1f" r="15" fill="url(#ln)" stroke="rgba(255,255,255,.75)" stroke-width="1"></circle>') % (lx, ly, rgb(p['horizon']), .35 + .4 * p['life'], lx, ly)
    line = lambda q: 'M ' + ' L '.join('%.1f %.1f' % c for c in q)
    d_line = line(pts)
    d_fill = d_line + ' L %.1f %d L %.1f %d Z' % (pts[-1][0], HZD, pts[0][0], HZD)
    sky = ('<div class="gd-sky"><svg viewBox="0 0 393 %d" aria-hidden="true"><defs>'
           '<radialGradient id="mg" cx="50%%" cy="100%%" r="80%%"><stop offset="0" stop-color="%s" stop-opacity="%.2f"></stop><stop offset=".5" stop-color="%s" stop-opacity="%.2f"></stop><stop offset="1" stop-color="%s" stop-opacity="0"></stop></radialGradient>'
           '<filter id="mb" x="-30%%" y="-40%%" width="160%%" height="180%%"><feGaussianBlur stdDeviation="12"></feGaussianBlur></filter>'
           '<radialGradient id="ln" cx="35%%" cy="30%%" r="80%%"><stop offset="0" stop-color="#fff" stop-opacity=".55"></stop><stop offset="1" stop-color="#fff" stop-opacity=".12"></stop></radialGradient>'
           '<linearGradient id="tg" x1="0" y1="%d" x2="0" y2="%d" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".62"></stop><stop offset="1" stop-color="#fff" stop-opacity="0"></stop></linearGradient></defs>'
           '<path d="%s" fill="url(#mg)" filter="url(#mb)" style="mix-blend-mode: plus-lighter"></path><path d="%s" fill="url(#mg)" opacity="1" style="mix-blend-mode: plus-lighter"></path>'
           '<path class="path" d="%s"></path><path class="path" d="%s" style="stroke: url(#tg)"></path><path class="path" d="%s" style="stroke: url(#tg)"></path>'
           '<line x1="0" y1="%d" x2="16" y2="%d" stroke="rgba(255,255,255,.5)"></line><line x1="377" y1="%d" x2="393" y2="%d" stroke="rgba(255,255,255,.5)"></line>'
           '%s</svg></div>') % (HZD + 40, rgb(c1), a1, rgb(c2), a2, rgb(c2), HZD, HZD + 44, d_fill, d_fill, d_line, line(tl), line(tr), HZD, HZD, HZD, HZD, lens)
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
add('Glass_Sunset', 'Закат — лист подробностей, сегодня (0 / 100)', wrap(detail(fe, 'Glass_Evening.dc.html'), fe, 1363, 'gl gd'), 393, 1363)
add('Glass_Golden', 'Золотой час — лист на небе', wrap(golden_detail(fe, 'Glass_Evening.dc.html'), fe, 1478, 'gl gd'), 393, 1478)
add('Glass_Sky', 'Небо — лист на небе', wrap(sky_detail(fe, 'Glass_Evening.dc.html'), fe, 1151, 'gl gd'), 393, 1151)
fm = EVE()
fm.pal = night_palette(fm.clouds)
fm.view = fm.pal
add('Glass_Sun', 'Солнце — лист на небе', wrap(sun_detail(fe, 'Glass_Evening.dc.html'), fe, 1488, 'gl gd'), 393, 1488)
add('Glass_Moon', 'Луна — лист на небе', wrap(moon_detail(fm, 'Glass_Evening.dc.html'), fm, 1176, 'gl gd'), 393, 1176)
add('Glass_SunsetExample', 'Закат — лист подробностей, пример (78)', wrap(detail(fx, 'Glass_Example.dc.html', 'пример: цифры придуманы, чтобы показать цвет'), fx, 1393, 'gl gd'), 393, 1393)

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
    cases = [('Ясно · день', 'clear', False, False, False, '18°', 'Ясно', '↓ 9° ↑ 19°', 'тёплый градиент, яркий у солнца справа'),
             ('Ясно · ночь', 'clear', True, False, False, '4°', 'Ясно', '↓ 1° ↑ 8°', 'индиго и фиолет, лунный свет справа'),
             ('Переменная облачность', 'part', False, False, False, '12°', 'Переменно', '↓ 6° ↑ 13°', 'тёплый и серо-голубой, пятна плывут'),
             ('Пасмурно', 'cloud', False, False, False, '9°', 'Пасмурно', '↓ 6° ↑ 10°', 'серо-голубые слои, без просветов'),
             ('Дождь', 'rain', False, False, False, '7°', 'Дождь', '↓ −3° ↑ 7°', 'тёмный сине-серый, тяжелее к низу'),
             ('Ливень и гроза', 'storm', False, False, True, '15°', 'Гроза', '↓ 12° ↑ 17°', 'то же гуще, фиолетовая нота и редкая вспышка'),
             ('Снег', 'snow', False, True, False, '−3°', 'Снег', '↓ −7° ↑ −2°', 'холодный светлый, ледяной по углам'),
             ('Мороз, ясно', 'clear', False, True, False, '−18°', 'Ясно', '↓ −24° ↑ −15°', 'ледяной цвет от углов поверх тёплого')]
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


add('Glass_Dial', 'Диск времени · сегодня (оценка 0). Нажми слева/справа на кольцо: внутреннее — час, внешнее — сутки', home(fe, 'dl', 852, False, LINK, True), 393, 852, 'dial')
add('Glass_DialExample', 'Диск времени · пример (78): цвет заката придуман, чтобы показать градиент', home(fx, 'dx', 852, False, LINK, True), 393, 852, 'dial')
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


DIAL_JS = '''class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { moon: false, T: __T0__, hDur: 0.6, dDur: 0.6, open: true };
  }
  renderVals() {
    const T = this.state.T;
    const DOW = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
    const two = (n) => (n < 10 ? '0' : '') + n;
    const clampT = (v) => Math.max(-2880, Math.min(4319, v));
    const di = Math.floor(T / 1440);
    const mod = T - di * 1440;
    const on = (k) => (di === k ? 0.2 : 0);
    const RAD = Math.PI / 180, phi = __LAT__ * RAD, decl = (__HMAX__ - 90 + __LAT__) * RAD;
    const e = Math.asin(Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(15 * (mod - __NOON__) / 60 * RAD)) / RAD;
    const C = { GOLD: [226, 164, 76], AMBER: [217, 172, 107], SILVER: [239, 234, 224], SCARLET: [216, 80, 47], PINK: [201, 105, 143], BLUE: [91, 119, 160], DEEP: [61, 88, 120], NIGHT: [104, 126, 168] };
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const ladder = (h) => {
      if (h >= -0.833) { if (h > 40) return C.SILVER; if (h > 20) return mix(C.AMBER, C.SILVER, 0.6); if (h > 6.05) return C.AMBER; return C.GOLD; }
      const d = -h;
      if (d < 1.8) return mix(C.GOLD, C.SCARLET, d / 1.8);
      if (d < 4) return mix(C.SCARLET, C.PINK, (d - 1.8) / 2.2);
      if (d < 6) return mix(C.PINK, C.BLUE, (d - 4) / 2);
      if (d < 12) return mix(C.BLUE, C.DEEP, (d - 6) / 6);
      if (d < 18) return mix(C.DEEP, C.NIGHT, (d - 12) / 6);
      return C.NIGHT;
    };
    return {
      sunCol: 'rgb(' + ladder(e).join(',') + ')',
      sunGlow: Math.max(0.2, Math.min(1, 1 + e / 8)).toFixed(2),
      sun: !this.state.moon,
      moon: this.state.moon,
      toggle: () => this.setState({ moon: !this.state.moon }),
      timeText: two(Math.floor(mod / 60)) + ':' + two(mod % 60),
      dateText: DOW[(2 + di + 70) % 7] + ' · ' + (28 + di) + ' ОКТЯБРЯ',
      hoursDeg: (-T / 4).toFixed(2),
      daysDeg: (-T / 96).toFixed(2),
      hDur: this.state.hDur,
      dDur: this.state.dDur,
      c0: on(-2), c1: on(-1), c2: on(0), c3: on(1), c4: on(2),
      hrMinus: () => this.setState({ T: clampT(Math.ceil(T / 60) * 60 - 60), hDur: 0.45, dDur: 1.3 }),
      hrPlus: () => this.setState({ T: clampT(Math.floor(T / 60) * 60 + 60), hDur: 0.45, dDur: 1.3 }),
      dayMinus: () => this.setState({ T: clampT(T - 1440), hDur: 1.1, dDur: 0.9 }),
      dayPlus: () => this.setState({ T: clampT(T + 1440), hDur: 1.1, dDur: 0.9 }),
      dialY: this.state.open ? 0 : 232,
      chevRot: this.state.open ? 0 : 180,
      toggleDial: () => this.setState({ open: !this.state.open })
    };
  }
}'''


def dc(title, body, w, h, inter=False):
    script = DIAL_JS if inter == 'dial' else STATE_JS if inter else PLAIN_JS
    if inter == 'dial':
        noon_t, noon_a = row(fe.rows, 'Ход дня', 'Солнечный полдень').split(' · ')
        script = (script.replace('__T0__', str(mins(fe.at))).replace('__LAT__', str(LAT))
                  .replace('__HMAX__', str(float(noon_a.strip('°')))).replace('__NOON__', str(mins(noon_t))))
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
