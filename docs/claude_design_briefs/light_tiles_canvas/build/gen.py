"""Canvas artboards for «Свет» made from the beta's own markup (frag/*.frag.html, see
extract_light.js + convert.py). Values in tiles and sheets are read from the same
snapshot, nothing typed by hand.
Usage: python3 gen.py <beta_css_url> <tiles_css_url> [--test <dir>]"""
import html as H
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.join(HERE, '..', 'project')
BETA_CSS, TILES_CSS = sys.argv[1], sys.argv[2]
TEST = sys.argv[sys.argv.index('--test') + 1] if '--test' in sys.argv else None
HEIGHTS = {}  # name -> lp-h override, filled from argv "name=h"
for a in sys.argv[3:]:
    if '=' in a:
        k, v = a.split('=')
        HEIGHTS[k] = int(v)

AT = {'eve_pro': '17:41', 'eve_light': '17:41', 'eve_simple': '17:41', 'eve_spoiler': '17:41',
      'day_pro': '13:56', 'night_pro': '22:30'}


def frag(name):
    return open(os.path.join(HERE, 'frag', name + '.frag.html'), encoding='utf-8').read()


def text(s):
    return H.unescape(re.sub(r'<[^>]+>', '', s)).replace('\xa0', ' ').strip()


def t_value(f, tid):
    m = re.search(r'<span[^>]*id="%s"[^>]*>(.*?)</span></div>' % tid, f, re.S)
    return m.group(1) if m else ''


def t_style(f, tid):
    m = re.search(r'id="%s"[^>]*style="([^"]*)"' % tid, f)
    return m.group(1) if m else ''


def p_rows(f):
    """[(group, key, value)] from the hidden «Подробно» body, in order."""
    body = f[f.find('id="proBody"'):]
    out, group = [], ''
    for m in re.finditer(r'<div class="pro-group">.*?<span>(.*?)</span></div>|<div class="p-row"><span class="k">(.*?)</span><span class="v[^"]*">(.*?)</span></div>', body, re.S):
        if m.group(1) is not None:
            group = text(m.group(1))
        else:
            out.append((group, text(m.group(2)), text(m.group(3))))
    return out


def p(rows, group, key):
    for g, k, v in rows:
        if g == group and k == key:
            return v
    return ''


def group_html(f, title):
    """The beta's own markup of one «Подробно» group: header + its rows (+ sky swatch)."""
    body = f[f.find('id="proBody"'):]
    parts = re.split(r'(?=<div class="pro-group">)', body)
    for part in parts:
        if part.startswith('<div class="pro-group">') and ('<span>%s</span>' % title) in part[:900]:
            end = part.find('<div class="sky-swatch"')
            return part[:end] if end > 0 else re.sub(r'</div></div>\s*</div>.*$', '</div></div>', part, flags=re.S)
    return ''


def swatch(f):
    m = re.search(r'<div class="sky-swatch"[^>]*>.*?</div>', f, re.S)
    return m.group(0) if m else ''


def minutes(hhmm):
    h, m = hhmm.split(':')
    return int(h) * 60 + int(m)


ICON = {
    'golden': '<path d="M3 18h18M7.5 18a4.5 4.5 0 0 1 9 0"></path><path d="M12 3.5v3.4M5.5 8l1.5 1.5M18.5 8l-1.5 1.5"></path>',
    'sun': '<circle cx="12" cy="12" r="4"></circle><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M2.5 12h2M19.5 12h2M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5"></path>',
    'day': '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5v4.7l3 1.8"></path>',
    'moon': '<path d="M19 13.5A7.5 7.5 0 1 1 10.5 5a6 6 0 0 0 8.5 8.5z"></path>',
    'cloud': '<path d="M7.5 18h8.5a3.6 3.6 0 0 0 .4-7.2 5 5 0 0 0-9.6-1.3A3.7 3.7 0 0 0 7.5 18z"></path>',
    'cond': '<path d="M5 20V11M10 20V4M15 20v-6M20 20V8"></path>',
    'shadow': '<path d="M4 20h16"></path><path d="M8 20V9l3-2v13"></path><path d="M11 20l8-4"></path>',
    'wind': '<path d="M3 9h11a3 3 0 1 0-3-3"></path><path d="M3 14h15a3 3 0 1 1-3 3"></path>',
}
GO = '<svg class="go" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4l8 8-8 8"></path></svg>'


def head(icon, label):
    return ('<span class="tile-h"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>'
            '<span>%s</span>%s</span>') % (ICON[icon], label, GO)


def tile(side, inner, href=None):
    cls = 'tile ' + side
    if href:
        return '<a class="%s" href="%s">%s</a>' % (cls, href, inner)
    return '<button type="button" class="%s">%s</button>' % (cls, inner)


def golden_bar(rng, at):
    a, b = [minutes(x) for x in re.findall(r'\d\d:\d\d', rng)[:2]]
    now = minutes(at)
    if now < a:
        return '<span class="tile-bar"></span>'
    if now > b:
        return '<span class="tile-bar"><i style="width: 100%; opacity: 0.35"></i></span>'
    pc = round(100 * (now - a) / (b - a), 1)
    return '<span class="tile-bar"><i style="width: %s%%"></i><b style="left: %s%%"></b></span>' % (pc, pc)


def tiles(f, at, link):
    rows = p_rows(f)
    golden = text(t_value(f, 'tGolden'))
    rng, _, rest = golden.partition(' · ')
    sunset_txt = text(t_value(f, 'tSunset'))
    word, _, score = sunset_txt.partition(' · ')
    num = score.split('/')[0].strip()
    sunset_color = t_style(f, 'tSunset') or 'color: var(--ink)'
    rec = t_value(f, 'tRec')
    meter = re.search(r'<span class="meter">.*?</span>', rec, re.S)
    rec_word = text(re.sub(r'<span class="meter">.*?</span>', '', rec, flags=re.S))
    rec_color = t_style(f, 'tRec')
    sky = text(t_value(f, 'tSky'))
    sky_word = sky.split(' · ')[0]
    clouds = p(rows, 'Погода', 'Облачность') or sky.split(' · ')[-1]
    wind = text(t_value(f, 'tWind'))
    w_speed, _, w_rest = wind.partition(' · ')
    w_num = w_speed.split()[0]
    shade = p(rows, 'Солнце в этот момент', 'Длина тени')
    alt = p(rows, 'Солнце в этот момент', 'Высота')
    az = p(rows, 'Солнце в этот момент', 'Азимут')
    day_len = re.sub(r'^0', '', p(rows, 'Ход дня', 'Длина дня'))
    rise = p(rows, 'Ход дня', 'Восход').split(' · ')[0]
    sset = p(rows, 'Ход дня', 'Закат').split(' · ')[0]
    blue = p(rows, 'Золотой и синий час', 'Синий час вечером')
    civil_end = p(rows, 'Сумерки', 'Гражданские').split('–')[-1].strip()
    out = [
        tile('wide', head('golden', 'Золотой час')
             + '<span class="tile-row"><span class="tile-v">%s</span><span class="tile-s">%s</span></span>' % (rng.replace(' – ', '–'), rest)
             + golden_bar(rng, at), link.get('golden')),
        tile('l', head('golden', 'Закат')
             + '<span class="tile-v" style="%s">%s<small>/ 100</small></span>' % (sunset_color, num)
             + '<span class="tile-s">%s · %s</span>' % (word, p(rows, 'Прогноз заката', 'Оценка').split(' · ')[-1]), link.get('sunset')),
        tile('r', head('cond', 'Условия')
             + '<span class="tile-w" style="%s">%s<span>%s</span></span>' % (rec_color, meter.group(0) if meter else '', rec_word)
             + '<span class="tile-s">для съёмки сейчас</span>', link.get('sky')),
        tile('l', head('sun', 'Свет')
             + '<span class="tile-w">%s</span>' % text(t_value(f, 'tLight'))
             + '<span class="tile-s">солнце %s</span>' % alt),
        tile('r', head('shadow', 'Тени')
             + '<span class="tile-w">%s</span>' % text(t_value(f, 'tShadow'))
             + '<span class="tile-s">%s</span>' % ('тень ' + shade if shade and shade != '—' else 'азимут ' + az)),
        tile('l', head('cloud', 'Небо')
             + '<span class="tile-v">%s</span>' % clouds.replace('%', '<small>%</small>')
             + '<span class="tile-s">%s · облачность</span>' % sky_word, link.get('sky')),
        tile('r', head('wind', 'Ветер')
             + '<span class="tile-v">%s<small>м/с</small></span>' % w_num
             + '<span class="tile-s">%s</span>' % w_rest),
        tile('l', head('day', 'Ход дня')
             + '<span class="tile-v">%s</span>' % day_len.replace(' ч ', '<small>ч</small> ').replace(' м', '<small>м</small>')
             + '<span class="tile-s">%s → %s</span>' % (rise, sset)),
        tile('r', head('moon', 'Синий час')
             + '<span class="tile-w">%s</span>' % blue.replace(' – ', '–')
             + '<span class="tile-s">сумерки до %s</span>' % civil_end),
    ]
    return '<div class="tiles">%s</div>' % ''.join(out)


def with_tiles(f, at, link):
    a = f.find('<div class="telemetry">')
    b = f.find('<button class="action screen-action" id="planToday"')
    if b < 0:
        b = f.find('id="planToday"')
        b = f.rfind('<button', 0, b)
    return f[:a] + tiles(f, at, link) + f[b:]


def set_h(f, h):
    return f.replace('class="lp-html"', 'class="lp-html" data-h="%d"' % h, 1).replace(
        'style="--tabh', 'style="--lp-h: %dpx; --tabh' % h, 1)


CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>'


def sheet(f, kind, back):
    rows = p_rows(f)
    if kind == 'sunset':
        txt = text(t_value(f, 'tSunset'))
        word, _, score = txt.partition(' · ')
        num = score.split('/')[0].strip()
        color = t_style(f, 'tSunset')
        sset = p(rows, 'Ход дня', 'Закат')
        body = ('<div class="dt-hero"><span class="dt-big" style="%s">%s<small>/ 100</small></span><span class="dt-word" style="%s">%s</span></div>'
                '<div class="dt-note">%s</div>' % (color, num, color, word, p(rows, 'Прогноз заката', 'Оценка').split(' · ')[-1])
                + swatch(f) + group_html(f, 'Прогноз заката'))
        title, sub = 'Закат', 'сегодня · %s' % sset.replace(' · ', ' · азимут ')
    elif kind == 'golden':
        rng = p(rows, 'Золотой и синий час', 'Золотой час вечером')
        a, b = re.findall(r'\d\d:\d\d', rng)[:2]
        body = ('<div class="dt-hero"><span class="dt-big">%s</span></div>' % rng.replace(' – ', '–')
                + golden_bar(rng, AT_NOW).replace('tile-bar', 'tile-bar') + '<div class="dt-scale"><span>%s</span><span>%s</span></div>' % (a, b)
                + group_html(f, 'Золотой и синий час') + group_html(f, 'Ход дня'))
        title, sub = 'Золотой час', text(t_value(f, 'tGolden')).partition(' · ')[2]
    else:
        clouds = p(rows, 'Погода', 'Облачность')
        body = ('<div class="dt-hero"><span class="dt-big">%s</span><span class="dt-word">%s</span></div>' % (
                    clouds.replace('%', '<small>%</small>'), p(rows, 'Погода', 'Небо'))
                + '<div class="dt-note">облачность · %s</div>' % p(rows, 'Погода', 'Источник')
                + group_html(f, 'Погода') + group_html(f, 'Прогноз заката'))
        title, sub = 'Небо', '%s · %s' % (p(rows, 'Погода', 'Температура'), p(rows, 'Погода', 'Ветер'))
    return ('<div class="dt-scrim"></div><section class="dt-sheet" aria-label="%s"><div class="dt-grip"></div>'
            '<div class="dt-top"><div><div class="dt-title">%s</div><div class="dt-sub">%s</div></div>'
            '<a class="dt-close" href="%s" aria-label="Закрыть">%s</a></div>%s</section>') % (title, title, sub, back, CLOSE, body)


def with_sheet(f, s):
    i = f.rfind('</div></div>')
    return f[:i] + s + f[i:]


def dc(title, body, w, h):
    return '''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>%s</title>
<script src="./support.js"></script>
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
class Component extends DCLogic {
  renderVals() {
    return {};
  }
}
</script>
</body>
</html>
''' % (title, BETA_CSS, TILES_CSS, body, w, h)


LINK = {'golden': 'GoldenDetail.dc.html', 'sunset': 'SunsetDetail.dc.html', 'sky': 'SkyDetail.dc.html'}
AT_NOW = '17:41'
eve = frag('eve_pro')
tiles_eve = with_tiles(eve, '17:41', LINK)
H_TALL = HEIGHTS.get('tiles_tall', 1500)
H_DET = HEIGHTS.get('details', 2200)

BOARDS = {
    'Now_Evening': ('Сейчас · вечер', eve, 852),
    'Now_Day': ('Сейчас · день', frag('day_pro'), 852),
    'Now_Night': ('Сейчас · ночь', frag('night_pro'), 852),
    'Now_Light': ('Сейчас · светлая тема', frag('eve_light'), 852),
    'Now_Simple': ('Сейчас · «Просто»', frag('eve_simple'), 852),
    'Now_Details': ('Сейчас · «Подробно» открыто', set_h(frag('eve_spoiler'), H_DET), H_DET),
    'Main': ('Плитки · вечер, вся прокрутка', set_h(tiles_eve, H_TALL), H_TALL),
    'Tiles_Evening': ('Плитки · вечер', tiles_eve, 852),
    'Tiles_Night': ('Плитки · ночь', with_tiles(frag('night_pro'), '22:30', LINK), 852),
    'Tiles_Light': ('Плитки · светлая тема', with_tiles(frag('eve_light'), '17:41', LINK), 852),
    'SunsetDetail': ('Закат — лист', with_sheet(tiles_eve, sheet(eve, 'sunset', 'Tiles_Evening.dc.html')), 852),
    'GoldenDetail': ('Золотой час — лист', with_sheet(tiles_eve, sheet(eve, 'golden', 'Tiles_Evening.dc.html')), 852),
    'SkyDetail': ('Небо — лист', with_sheet(tiles_eve, sheet(eve, 'sky', 'Tiles_Evening.dc.html')), 852),
}

for name, (title, body, h) in BOARDS.items():
    if TEST:
        page = ('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="%s"><link rel="stylesheet" href="%s">'
                '<style>body{margin:0}</style></head><body>%s</body></html>') % (BETA_CSS, TILES_CSS, body)
        open(os.path.join(TEST, name + '.test.html'), 'w', encoding='utf-8').write(page)
    else:
        open(os.path.join(PROJECT, name + '.dc.html'), 'w', encoding='utf-8').write(dc(title, body, 393, h))
    print(name, h, len(body))
