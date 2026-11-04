import sys
BG='#0f0f0f'
INK='#f2efe9'; INK4='#8f8a80'; BRASS='#e8a94c'
def sl(img,src0,src1,dst,bg=''):
    h=src1-src0
    return f'<div style="position:absolute;left:0;top:{dst}px;width:440px;height:{h}px;background:url({img}) 0 -{src0}px/440px 956px no-repeat"></div>'
def glyph(img,ay,x,y,s=1):
    # знак кнопки из настоящего кадра
    return f'<div style="position:absolute;left:{x}px;top:{y}px;width:24px;height:24px;transform:scale({s});transform-origin:0 0;background:url({img}) -23px -{ay+12}px/440px 956px no-repeat"></div>'
def fill(a,b): return f'<div style="position:absolute;left:0;top:{a}px;width:440px;height:{b-a}px;background:{BG}"></div>'
def phone(body,label,sub):
    return f'''<figure><figcaption><b>{label}</b><span>{sub}</span></figcaption><div class=ph>{body}</div></figure>'''
def was(img): return sl(img,0,956,0)
def A(img,cut,act,bar):
    # cut — под линией горизонта; act — верх старой кнопки; bar — верх таймбара
    h=46; cap=f'''<div style="position:absolute;left:57px;top:{cut+3}px;width:326px;height:40px;border-radius:20px;background:rgba(255,255,255,.075);box-shadow:inset 0 .5px 0 rgba(255,255,255,.22);display:flex;align-items:center;font:600 15px 'Helvetica Neue';color:{INK}">
      <span style="width:46px"></span>Запланировать съёмку<span style="margin-left:auto;margin-right:16px;font:500 14px 'Helvetica Neue';color:{BRASS};font-variant-numeric:tabular-nums">13:00</span></div>'''
    return sl(img,0,cut,0)+fill(cut,cut+h)+cap+glyph(img,act,71,cut+11,.85)+sl(img,cut,act-1,cut+h)+fill(act-1+h,bar)+sl(img,bar,956,bar)
def B(img,hor,act,bar):
    # капсула в куполе, между строкой про свет и горизонтом
    y=hor-27
    cap=f'''<div style="position:absolute;left:120px;top:{y}px;width:200px;height:24px;border-radius:12px;background:rgba(255,255,255,.12);box-shadow:inset 0 .5px 0 rgba(255,255,255,.28);display:flex;align-items:center;justify-content:center;font:600 12px 'Helvetica Neue';color:{INK}"><span style="width:20px"></span>Запланировать съёмку</div>'''
    return sl(img,0,act-1,0)+fill(act-1,bar)+sl(img,bar,956,bar)+cap+glyph(img,act,126,y+3,.72)
simple=('sk_simple.png',335,730,776,323.5)
astro=('sk_astro.png',321,692,738,309)
def row(t,cfg):
    img,cut,act,bar,hor=cfg
    return f'''<section><h2>{t}</h2><div class=r>{phone(was(img),'Было','кнопка над ползунком, справа окно золотого часа')}{phone(A(img,cut,act,bar),'А — под куполом','строка света сразу под горизонтом, справа время с ползунка')}{phone(B(img,hor,act,bar),'Б — в куполе','маленькая капсула внутри дуги, время уже написано крупно')}</div></section>'''
html=f'''<!doctype html><meta charset=utf-8><style>
body{{margin:0;background:#1c1c1e;color:#eee;font:15px 'Helvetica Neue';padding:28px;width:1500px}}
h1{{font:600 26px 'Helvetica Neue';margin:0 0 4px}} p{{margin:0 0 22px;color:#aaa}}
h2{{font:600 18px 'Helvetica Neue';margin:0 0 10px}} section{{margin-bottom:30px}}
.r{{display:flex;gap:28px}} figure{{margin:0;width:480px}}
figcaption{{height:52px}} figcaption b{{display:block;font-size:17px}} figcaption span{{color:#aaa;font-size:13px}}
.ph{{position:relative;width:440px;height:956px;background:{BG};border-radius:44px;overflow:hidden;outline:1px solid #444}}
</style><h1>30д: кнопка «Запланировать съёмку» — куда перенести</h1>
<p>Схема, не сборка: кадр настоящего приложения (ветка от ad4f4b0, тёмная тема), кнопка дорисована поверх. Ползунок стоит на 13:00.</p>
{row(sys.argv[1],simple if sys.argv[2]=='s' else astro)}'''
print(html)
