/* голова капли против конца следа: в моменты t ставим оба анимации на одно время и сравниваем */
const path=require('path');const {chromium}=require(path.join(process.env.LP_WEB,'node_modules','playwright'));
(async()=>{const b=await chromium.launch();
for (const [file,sel] of [['Glass_Evening','.wxt'],['Glass_Weather','.gx:nth-child(5) .wxt']]){
const p=await (await b.newContext({viewport:{width:900,height:900}})).newPage();await p.goto('file://'+path.join(process.argv[2],file+'.test.html'));await p.waitForTimeout(500);
const out=await p.evaluate((sel)=>{
 const tile=document.querySelector(sel); const tr=tile.getBoundingClientRect();
 const head=tile.querySelector('.wxa-head'); const rp=tile.querySelector('.wxa-rivp:not(.hi)'); const svg=tile.querySelector('.wxa-riv');
 const sr=svg.getBoundingClientRect();
 const res=[]; const L=rp.getTotalLength();
 for (const k of [0.15,0.35,0.55,0.75]){
   const dur=parseFloat(getComputedStyle(head).animationDuration)*1000;
   [head,rp].forEach(e=>e.getAnimations().forEach(a=>{a.pause();a.currentTime=dur*k+ (parseFloat(getComputedStyle(e).animationDelay)*-1000||0)*0;}));
   // у обоих отрицательная задержка одна и та же: ставим currentTime = задержка + k*dur
   const dl=-parseFloat(getComputedStyle(head).animationDelay)*1000*-1;
   [head,rp].forEach(e=>e.getAnimations().forEach(a=>{a.currentTime=(-parseFloat(getComputedStyle(e).animationDelay)*1000*-1)+0; a.currentTime=dur*k - parseFloat(getComputedStyle(e).animationDelay)*1000;}));
   const hr=head.getBoundingClientRect(); const hy=hr.top+hr.height/2-sr.top, hx=hr.left+hr.width/2-sr.left;
   const d=parseFloat(getComputedStyle(rp).strokeDashoffset); // 100→0
   const prog=(100-d)/100; const pt=rp.getPointAtLength(L*prog);
   res.push({k, head:[+hx.toFixed(1),+hy.toFixed(1)], trailEnd:[+pt.x.toFixed(1),+pt.y.toFixed(1)], dy:+(pt.y-hy).toFixed(1), tileH:Math.round(tr.height)});
 }
 return res;},sel);
console.log(file, JSON.stringify(out));}
await b.close();})();
