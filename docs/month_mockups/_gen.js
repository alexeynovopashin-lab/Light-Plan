const fs = require('fs');
const OUT = process.argv[2];
// октябрь 2026, понедельник первым
const G = '#E2A44C', Gd = '#A8B49B', B = '#7C9CC4';
const L = {
  3: [['Интерьер', G]], 5: [['Собаки', Gd]], 8: [['Репортаж', G]], 9: [['Встреча', null]],
  12: [['Печать ал…', null]], 14: [['Москва: п…', null]], 17: [['Свадьба', G]],
  20: [['Дорога в…', null]], 22: [['Дорога в…', null], ['Встреча', null]], 24: [['Стрит', Gd]], 29: [['Фешен', B]],
};
const cells = [];
[28, 29, 30].forEach(d => cells.push({ d, out: 1 }));
for (let d = 1; d <= 31; d++) cells.push({ d });
cells.push({ d: 1, out: 1 });
const TODAY = 3, SEL = 8;
const TOK = `
:root{--bg:#070606;--surface:#0F0E0C;--sheet:#17150F;--sheet-4:#1A1712;--sheet-glass:rgba(23,21,15,.74);--press:#221F19;--hairline:#1C1913;
--ink:#EFEAE0;--ink-2:#C9C2B6;--ink-3:#A8A093;--ink-4:#8A8478;--ink-5:#6B6559;--ink-7:#55504A;--ink-10:#3A352F;--brass:#E2A44C;
--glass-shine:rgba(255,255,255,.30);--glass-cast:rgba(0,0,0,.45);--back-edge:rgba(255,255,255,.07)}
:root[data-theme="light"]{--bg:#EDE9E1;--surface:#FAF8F3;--sheet:#FFFFFF;--sheet-4:#FFFFFF;--sheet-glass:rgba(255,255,255,.78);--press:#EDE9E1;--hairline:#E2DCD1;
--ink:#17150F;--ink-2:#3A352E;--ink-3:#55504A;--ink-4:#6B6559;--ink-5:#857E70;--ink-7:#9A9385;--ink-10:#BFB8A9;--brass:#A9721F;
--glass-shine:rgba(255,255,255,.95);--glass-cast:rgba(23,21,15,.16);--back-edge:rgba(23,21,15,.05)}`;
const V = {
  A: { name: 'A — цифры semibold, подписи плотнее',
    css: `.d-n{font-size:17px;font-weight:600}.d-n.t{font-weight:700}
.zone{height:21px}.lb{font-size:9px;line-height:10.5px;font-weight:500;letter-spacing:-.1px}.lb.busy{color:var(--ink-4)!important;font-style:italic}
.d{height:58px;padding-top:5px}`, lab: 'text' },
  B: { name: 'B — цифры bold, подписи мельче и ярче',
    css: `.d-n{font-size:17.5px;font-weight:700}
.zone{height:19px}.lb{font-size:8px;line-height:9.5px;font-weight:600;letter-spacing:0}.lb.busy{color:var(--ink-2)!important;font-style:italic}
.d{height:55px;padding-top:5px}`, lab: 'text' },
  C: { name: 'C — цифры medium, подпись — полоска, матовая подложка',
    css: `.d-n{font-size:17px;font-weight:500}.d-n.t,.d.sel .d-n{font-weight:600}
.zone{height:13px;gap:2px;margin-top:2px}.bar{width:14px;height:3px;border-radius:1.5px}.bar.busy{background:var(--ink-5)}
.d{height:52px;padding-top:5px}
.back{margin:0 12px;padding:2px 8px 6px;border-radius:22px;background:var(--sheet-4);box-shadow:0 6px 20px var(--glass-cast),inset 0 1px 0 var(--back-edge),inset 0 0 0 1px var(--hairline)}
.glass .back{background:var(--sheet-glass);backdrop-filter:blur(24px) saturate(1.5);-webkit-backdrop-filter:blur(24px) saturate(1.5);box-shadow:0 6px 20px var(--glass-cast),inset 0 1px 0 var(--glass-shine),inset 0 0 0 1px var(--hairline)}
.grid{padding:0}.head{padding:10px 0 0}`, lab: 'bar' },
};
function page(k, glass) {
  const v = V[k];
  const head = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].map((x, i) => `<span${i > 4 ? ' class=we' : ''}>${x}</span>`).join('');
  const rows = cells.map(c => {
    const t = !c.out && c.d === TODAY, sel = !c.out && c.d === SEL, past = !c.out && c.d < TODAY;
    const labs = (!c.out && L[c.d]) || [];
    const shown = labs.length > 2 ? labs.slice(0, 1) : labs;
    let z = '';
    if (v.lab === 'text') z = shown.map(([s, col]) => `<span class="lb${col ? '' : ' busy'}"${col ? ` style="color:${col}"` : ''}>${s}</span>`).join('');
    else z = shown.map(([s, col]) => col ? `<i class="bar" style="background:${col}"></i>` : '<i class="bar busy"></i>').join('');
    const col = c.out ? 'var(--ink-10)' : t ? 'var(--brass)' : past ? 'var(--ink-5)' : 'var(--ink)';
    return `<div class="d${sel ? ' sel' : ''}${c.out ? ' out' : ''}"><span class="d-n${t ? ' t' : ''}" style="color:${col}">${c.d}</span><div class="zone">${z}</div></div>`;
  }).join('');
  return `<!doctype html><html lang="ru" data-theme="dark"><meta charset="utf-8"><meta name="viewport" content="width=440">
<title>Месяц, макет ${k}${glass ? ' (матовое стекло)' : ''}</title>
<style>${TOK}
*{box-sizing:border-box;margin:0}body{width:440px;background:var(--surface);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.title{padding:16px 20px 4px;font-size:22px;font-weight:600}
.head{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));padding:10px 20px 0}.head span{text-align:center;font-size:12.5px;font-weight:600;letter-spacing:.6px;color:var(--ink-7);padding-bottom:8px}.head .we{color:var(--ink-4)}
.grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px 3px;padding:0 20px}
.d{display:flex;flex-direction:column;align-items:center;min-width:0;border-radius:11px}
.d.sel{background:var(--press)}
.d-n{width:26px;height:26px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.zone{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;width:100%;overflow:hidden}
.lb{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.legend{display:flex;justify-content:center;gap:16px;padding:14px 20px 0;font-size:12px;color:var(--ink-4)}.legend span{display:flex;align-items:center;gap:7px}.legend i{width:6px;height:6px;border-radius:50%}
.panel{margin:14px 20px 0;height:38px;border-radius:16px;box-shadow:inset 0 0 0 1px var(--hairline);display:flex;align-items:center;padding-left:14px;font-size:13px;color:var(--ink-3)}
.row{margin:8px 20px 0;height:40px;border-radius:12px;background:var(--sheet-4);box-shadow:inset 0 0 0 1px var(--hairline);display:flex;align-items:center;padding:0 12px;font-size:15px;color:var(--ink)}
.row b{color:var(--brass);font-weight:400;margin-right:10px}
${v.css}
</style><body class="${glass ? 'glass' : ''}">
<div class="title">Октябрь</div>
${k === 'C' ? '<div class="back">' : ''}<div class="head">${head}</div><div class="grid">${rows}</div>${k === 'C' ? '</div>' : ''}
<div class="legend"><span><i style="background:#E2A44C"></i>Отличный свет</span><span><i style="background:#A8B49B"></i>Хороший</span><span><i style="background:#7C9CC4"></i>Плохая погода</span></div>
<div class="panel">07:11 · 19:23 · 46 мин</div><div class="row"><b>12:20</b>Интерьер</div><div style="height:20px"></div>
</body></html>`;
}
['A', 'B', 'C'].forEach(k => fs.writeFileSync(`${OUT}/month_${k}.html`, page(k, false)));
fs.writeFileSync(`${OUT}/month_C_glass.html`, page('C', true));
