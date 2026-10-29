"""Snapshots (json) -> one shared stylesheet + body fragments that live inside a wrapper
instead of <html>/<body>. Also writes test pages to render with Playwright.
Usage: python3 convert.py <snapdir> <outdir> name1 name2 ..."""
import json, re, sys, os

snapdir, outdir, names = sys.argv[1], sys.argv[2], sys.argv[3:]
os.makedirs(outdir, exist_ok=True)


def split_rules(css):
    """Top-level rules of a cssText list joined by newlines (each rule is one cssText)."""
    out, depth, start = [], 0, 0
    for i, ch in enumerate(css):
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                out.append(css[start:i + 1].strip())
                start = i + 1
    return [r for r in out if r]


def merge(lists):
    res = []
    seen = set()
    for lst in lists:
        pos = 0
        for r in lst:
            if r in seen:
                pos = res.index(r) + 1
            else:
                res.insert(pos, r)
                seen.add(r)
                pos += 1
    return res


TYPE = re.compile(r'(?<![\w.#\-\[="])(html|body)(?![\w\-])')


def fix_selector(sel):
    sel = sel.replace(':root', '.lp-html')
    sel = TYPE.sub(lambda m: '.lp-html' if m.group(1) == 'html' else '.lp-body', sel)
    return sel


def fix_rule(rule):
    if rule.startswith('@keyframes') or rule.startswith('@font-face') or rule.startswith('@-webkit-keyframes'):
        return rule
    if rule.startswith('@media') or rule.startswith('@supports'):
        head, body = rule.split('{', 1)
        inner = split_rules(body[:-1])
        return head + '{' + '\n'.join(fix_rule(r) for r in inner) + '}'
    sel, decl = rule.split('{', 1)
    return fix_selector(sel) + '{' + decl


def fix_units(css):
    css = re.sub(r'\b100d?vh\b', 'var(--lp-h)', css)
    css = re.sub(r'\b(\d+(?:\.\d+)?)d?vh\b', lambda m: 'calc(var(--lp-h) * %s)' % (float(m.group(1)) / 100), css)
    return css


snaps = {n: json.load(open(os.path.join(snapdir, n + '.json'))) for n in names}
rules = merge([split_rules(s['css']) for s in snaps.values()])
css = fix_units('\n'.join(fix_rule(r) for r in rules))
css += '\n.lp-html{--lp-h:852px;position:relative;width:393px;height:var(--lp-h);overflow:hidden;transform:translateZ(0)}' \
       '\n.lp-body{margin:0;width:100%;height:100%}'
open(os.path.join(outdir, 'lp_beta.css'), 'w').write(css)
print('css bytes', len(css), 'rules', len(rules))


def attrs(pairs, cls):
    d = dict(pairs)
    d['class'] = (cls + ' ' + d.get('class', '')).strip()
    return ''.join(' %s="%s"' % (k, v.replace('"', '&quot;')) for k, v in d.items())


for n, s in snaps.items():
    html = re.sub(r'<!--.*?-->', '', s['html'], flags=re.S)
    html = re.sub(r'\n\s*\n+', '\n', html)
    frag = '<div%s><div%s>%s</div></div>' % (attrs(s['htmlAttrs'], 'lp-html'), attrs(s['bodyAttrs'], 'lp-body'), html)
    open(os.path.join(outdir, n + '.frag.html'), 'w').write(frag)
    page = '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="lp_beta.css">' \
           '<style>body{margin:0;background:#222}</style></head><body>%s</body></html>' % frag
    open(os.path.join(outdir, n + '.test.html'), 'w').write(page)
    print(n, 'frag bytes', len(frag))
