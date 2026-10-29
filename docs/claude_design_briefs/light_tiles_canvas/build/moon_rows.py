"""Moon rows of the beta («Луна в этот момент») at three moments → data/moon.json.
Snapshots come from extract_light.js with the 8th argument `moon` (sun/moon toggle pressed).
Usage: python3 moon_rows.py <snapdir>   (eve_moon.json, day_moon.json, night_moon.json inside)"""
import html as H
import json
import os
import re
import sys

src = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))


def text(s):
    return H.unescape(re.sub(r'<[^>]+>', '', s)).replace('\xa0', ' ').strip()


out = {}
for key in ('eve', 'day', 'night'):
    h = json.load(open(os.path.join(src, key + '_moon.json'), encoding='utf-8'))['html']
    body = h[h.find('id="proBody"'):]
    rows, group = {}, ''
    for m in re.finditer(r'<div class="pro-group">.*?<span>(.*?)</span></div>|<div class="p-row"><span class="k">(.*?)</span><span class="v[^"]*">(.*?)</span></div>', body, re.S):
        if m.group(1) is not None:
            group = text(m.group(1))
        elif group.startswith('Луна'):
            rows[text(m.group(2))] = text(m.group(3))
    phase, _, pct = rows['Фаза'].partition(' · ')
    az = rows['Азимут']
    out[key] = {'phase': phase, 'pct': int(pct.strip('% ')), 'alt': rows['Высота'],
                'rise': rows['Восход'].split(' · ')[0], 'set': rows['Заход'].split(' · ')[0],
                'az': az, 'az_val': float(az.split('°')[0]),
                'rise_az': int(rows['Восход'].split(' · ')[1].strip('°')), 'set_az': int(rows['Заход'].split(' · ')[1].strip('°')),
                'dist': rows['Расстояние']}
os.makedirs(os.path.join(here, 'data'), exist_ok=True)
json.dump(out, open(os.path.join(here, 'data', 'moon.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False))
