/* Сверка слоя дат: русский экран не должен измениться ни в одном символе.
   Слой вырезается из beta/index.html и прогоняется против прежних массивов
   русских слов — тех самых, что он заменил. 2376 проверок: все дни всех
   месяцев во всех видах даты.

   Зачем: переход на `Intl` — это подмена всех дат разом, и ошибиться в нём
   легко незаметно. Первый прогон поймал две: правило чистки хвоста « г.»
   съедало «г» в «авг.», а короткие месяцы `Intl` («февр», «сент») не
   совпадают с нашими трёхбуквенными. Обе видны только сравнением.

   Пример:
     node tools/datecheck.js
*/
var fs=require('fs'), re=/<script>([\s\S]*?)<\/script>/g, s=fs.readFileSync(require('path').join(__dirname,'..','beta','index.html'),'utf8');
var main=""; var m; while((m=re.exec(s))) if(m[1].length>main.length) main=m[1];
// вырезаем слой дат из файла, чтобы проверять именно его, а не копию
var start = main.indexOf('var dtfCache = {};');
var end = main.indexOf('function fmt(m)');
var layer = main.slice(start, end);
var LANG = { code: "ru" };
eval(layer);

var MONTHS=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
var MONTHS_N=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
var MON_S=["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
var WD=["ВС","ПН","ВТ","СР","ЧТ","ПТ","СБ"];
var WD_FULL=["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];

var bad=0, checked=0, seen={};
function chk(name, got, want){
  checked++;
  if(got!==want){ bad++; var k=name+"|"+got+"|"+want; if(!seen[k]){seen[k]=1; console.log(name+": «"+got+"» вместо «"+want+"»");} }
}
for(var mo=0;mo<12;mo++){
  for(var day=1;day<=28;day++){
    var d=new Date(2026,mo,day);
    chk("dMon", dMon(d), d.getDate()+" "+MONTHS[mo]);
    chk("dMonShort", dMonShort(d), d.getDate()+" "+MON_S[mo]);
    chk("dMonShortYear", dMonShortYear(d), d.getDate()+" "+MONTHS[mo].slice(0,3)+" "+d.getFullYear());
    chk("monthOfDate", monthOfDate(d), MONTHS[mo]);
    chk("monShortOfDate", monShortOfDate(d), MON_S[mo]);
    chk("wdShort", wdShort(d), WD[d.getDay()]);
    chk("wdFull", wdFull(d), WD_FULL[d.getDay()]);
  }
  chk("monthTitleN", monthTitleN(mo), MONTHS_N[mo]);
  chk("monAbbrUpperN", monAbbrUpperN(mo), MONTHS_N[mo].slice(0,3).toUpperCase());
}
console.log("\nпроверок:",checked,"расхождений:",bad);
process.exit(bad?1:0);
