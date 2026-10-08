/** V5.7 — استيراد خط السير من نموذج جوجل (ردود النموذج) إلى 22_خط_السير.
 *  المصدر: رابط شيت الردود (أو ورقة «مصدر_خط_السير» داخل القاعدة). الأعمدة: طابع زمني، الوظيفة، التخصص، الاسم، ثم عمود لكل يوم
 *  بعنوان مثل «الخميس : 1 / 10 / 2026»، وفي الخانة مدرسة أو أكثر مفصولة بفاصلة.
 *  - آخر رد لكل اسم هو المعتمد.  - الموجه يُطابق بالاسم مع 01_الأساسي (أو برقم قومي تكتبه الإدارة لغير المطابقين).
 *  - المدارس تُطابق مع 18_بيانات_المدارس + توحيد_المدارس + أسماء النموذج المعروفة؛ غير المعروف يُحفظ «أخرى» بنصه.
 *  - «المدرسة الأصلية (في حالة الندب)» = مدرسة الموجه الأصلية.  - يستبدل أيام الشهر المستوردة للموجه فقط. */
var V57_SCHOOL_ALIASES = {"الحاج محمد فرغلي (ع) للتعليم الاساسي": "SCH_M_5FA7E5E61C234872", "صديق علي للتعليم الاساسي": "SCH_M_FE09544A0D25C60B", "كردوس (ع) للمشتركة": "SCH_M_3CD6588A34412829", "ش. محمد ع.الحفيظ للتعليم الاساسي": "SCH_M_3F1BFA540AB50B0F", "ش. المقدم / مهران عبدالرحيم (ع)": "SCH_M_2F4CCF00CFC41DE5", "ش. باهر تقوي للتعليم الاساسي": "SCH_M_A780441421DB0CED", "ش. حشمت حرب (ع) بنات": "SCH_M_C930AFEBBF6AC32A", "اللواء / جمال مهران (ع)": "SCH_M_81176E663F066365", "ش. نقيب/ محمد جمال مهران (ب)": "SCH_M_DC339C099BF7CE30", "عمر بن الخطاب (ب)": "SCH_M_3E19A98044C818D1", "عثمان بن عفان (ب)": "SCH_M_67A5C12BCFF4CC23", "الفصل الواحد الوعاضلة": "SCH_M_48A07A5B630BEAB9", "الفصل الواحد بنى فيز": "SCH_M_7AF41B8472725476", "الفصل الواحد اولادالياس": "SCH_M_224CC520E10F2CD3", "الفصل الواحد الدوير": "SCH_M_15CBE5E960608E98", "الفصل الواحد مجريس": "SCH_M_A33207C3A88AE720", "الفصل الواحد كوم اسفحت": "SCH_M_0595692021D10B9E", "الفصل الواحد البربا غرب": "SCH_M_8C635D60B57D7414", "الفصل الواحد اولادابراهيم": "SCH_M_16C43DEDB29C4A0A", "المدرسة الموازية كوم اسفحت": "SCH_M_88D10EBE55063E87", "المدرسة الموازية بنى فيز": "SCH_M_45414F6A0D912F63"};
var V57_SPECIAL = [
  [/اجاز[هة]\s*رسمي/, {type: 'إجازة رسمية'}],
  [/اجاز[هة]\s*مرضي/, {type: 'إجازة مرضي'}],
  [/اجاز[هة]/, {type: 'إجازة اعتيادي'}],
  [/ديوان|^الادار[هة]$|^اداره صدفا$|^ادارة صدفا$/, {type: 'مكتب'}],
  [/التوجي[هة] العام|بالمديري[هة]|^المديري[هة]$/, {type: 'مديرية'}],
  [/شئون قانوني|الشؤون القانوني/, {type: 'شئون قانونية'}],
  [/نياب[هة] اداري/, {type: 'نيابة إدارية'}]
];
function v57Norm_(s){ return String(s || '').replace(/[\u200e\u200f\u0640]/g, '').trim().replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s*\/\s*/g, '/').replace(/\(\s*/g, '(').replace(/\s*\)/g, ')').replace(/\s+/g, ' '); }
function v57NameKey_(s){ return v57Norm_(s).replace(/عبد\s+/g, 'عبد').replace(/ابو\s+/g, 'ابو').replace(/\s+/g, ' '); }
function v57Dice_(a, b){ a = a.replace(/\s+/g, ''); b = b.replace(/\s+/g, ''); if (a.length < 2 || b.length < 2) return 0; var m = {}, n = 0; for (var i = 0; i < a.length - 1; i++) { var k = a.substr(i, 2); m[k] = (m[k] || 0) + 1; } for (var j = 0; j < b.length - 1; j++) { var q = b.substr(j, 2); if (m[q]) { m[q]--; n++; } } return 2 * n / (a.length + b.length - 2); }
var V57_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
function v57ReadSource_(url){
  var sh;
  if (String(url || '').trim()) { var ss; try { ss = SpreadsheetApp.openByUrl(String(url).trim()); } catch (e) { throw new Error('تعذر فتح رابط شيت الردود — تأكد أن الحساب المالك للبوابة يملك صلاحية عرضه. (' + e.message + ')'); } sh = ss.getSheets()[0]; }
  else { sh = personnelSS_().getSheetByName('مصدر_خط_السير'); if (!sh) throw new Error('الصق رابط شيت ردود النموذج، أو انسخ الردود في ورقة باسم «مصدر_خط_السير».'); }
  var v = sh.getDataRange().getDisplayValues(); if (v.length < 2) throw new Error('شيت الردود فارغ.');
  return v;
}
function v57Plan_(url, overrides){
  overrides = overrides || {};
  var v = v57ReadSource_(url), h = v[0].map(function(x){ return String(x || '').trim(); });
  var nameCol = -1, jobCol = -1, subjCol = -1, dateCols = [];
  h.forEach(function(x, i){
    var m = x.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/);
    if (m) { var d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])); dateCols.push({col: i, iso: m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2), y: Number(m[3]), m: Number(m[2]), day: V57_DAYS[d.getDay()]}); return; }
    if (nameCol < 0 && /الاس/.test(x)) nameCol = i; else if (jobCol < 0 && /الوظيف/.test(x)) jobCol = i; else if (subjCol < 0 && /التخصص|الماد/.test(x)) subjCol = i;
  });
  if (nameCol < 0 || !dateCols.length) throw new Error('لم أجد عمود الاسم أو أعمدة الأيام (عنوان مثل «الخميس : 1 / 10 / 2026»).');
  // آخر رد لكل اسم
  var latest = {}, order = [];
  v.slice(1).forEach(function(r){ var n = String(r[nameCol] || '').trim(); if (!n) return; var k = v57NameKey_(n); if (!latest[k]) order.push(k); latest[k] = r; });
  // الموظفون
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), byKey = {}, byNid = {}, byId = {}, list = [];
  emp.rows.forEach(function(r){ var o = {eid: schoolV31Val_(r, ei, 'employeeId'), name: schoolV31Val_(r, ei, 'الاسم'), nid: v24DigitsLocalV31_(schoolV31Val_(r, ei, 'الرقم_القومي')), sup: schoolV31Val_(r, ei, 'الوظيفة_الإشرافية'), active: schoolV31Val_(r, ei, 'حالة_التوجيه') === 'نشط', orig: schoolV31Val_(r, ei, 'originalSchoolId'), st: schoolV31Val_(r, ei, 'حالة_السجل')}; if (!o.eid) return; o.key = v57NameKey_(o.name); (byKey[o.key] = byKey[o.key] || []).push(o); if (o.nid) byNid[o.nid] = o; byId[o.eid] = o; list.push(o); });
  function pick(c){ if (c.length === 1) return c[0]; var s = c.filter(function(x){ return x.sup || x.active; }); if (s.length === 1) return s[0]; s = c.filter(function(x){ return x.st !== 'غير قائم'; }); return s.length === 1 ? s[0] : null; }
  function findEmp(n){
    var k = v57NameKey_(n), ov = String(overrides[n] || overrides[k] || '').trim();
    if (ov) {   // V5.8: ربط يدوي / منتدب من خارج الإدارة / تجاهل
      if (ov === 'SKIP') return {skip: true};
      var isNew = ov.indexOf('NEW:') === 0, d = v24DigitsLocalV31_(isNew ? ov.slice(4) : ov);
      if (byNid[d]) return byNid[d];
      if (!isNew && byId[ov]) return byId[ov];
      if (!/^[23]\d{13}$/.test(d)) return {err: 'الرقم القومي غير صحيح (14 رقمًا تبدأ بـ2 أو 3)', ov: ov};
      if (!isNew) return {err: 'الرقم القومي غير موجود في القاعدة — لو منتدب من خارج الإدارة علّم «منتدب»', ov: ov};
      return {eid: 'NEW_' + d, name: n, nid: d, isNew: true, orig: ''};
    }
    if (byKey[k]) return pick(byKey[k]);
    var t = k.split(' '), c = list.filter(function(x){ var u = x.key.split(' '); return t.length >= 3 && u.slice(0, t.length).join(' ') === t.join(' '); });
    if (c.length) return pick(c);
    var nk = k.replace(/\s+/g, ''); c = list.filter(function(x){ return x.key.replace(/\s+/g, '').indexOf(nk) === 0; });
    return c.length ? pick(c) : null;
  }
  // المدارس
  var sch = v24Data_('18_بيانات_المدارس'), si = schoolV31Idx_(sch.headers), sName = {}, sKey = {};
  sch.rows.forEach(function(r){ var id = schoolV31Val_(r, si, 'schoolId'), n = schoolV31Val_(r, si, 'اسم_المدرسة'); if (!id) return; sName[id] = n; sKey[v57Norm_(n)] = id; });
  try { var td = v24Data_('توحيد_المدارس'), ti = schoolV31Idx_(td.headers); td.rows.forEach(function(r){ var id = schoolV31Val_(r, ti, 'schoolId_الجديد'), n = schoolV31Val_(r, ti, 'الاسم_الحالي'); if (id && n && sName[id] && !sKey[v57Norm_(n)]) sKey[v57Norm_(n)] = id; }); } catch (e) {}
  Object.keys(V57_SCHOOL_ALIASES).forEach(function(k){ if (sName[V57_SCHOOL_ALIASES[k]]) sKey[v57Norm_(k)] = V57_SCHOOL_ALIASES[k]; });
  /* V7.38: فهرس مرشحين للمطابقة التقريبية — لا نقارن كل اسم مدرسة بكل اسم وارد. */
  var fuzzyBuckets = {};
  Object.keys(sKey).forEach(function(k){
    var nk = v57Norm_(k), compact = nk.replace(/\s+/g,'');
    var keys = [];
    if(compact.length >= 2) keys.push(compact.slice(0,2));
    var first = nk.split(' ')[0]; if(first){ keys.push('w:'+first.slice(0,4)); keys.push('c:'+first.slice(0,1)); }
    keys.forEach(function(b){(fuzzyBuckets[b]=fuzzyBuckets[b]||[]).push(k);});
  });
  var unknownPlaces = {}, fuzzyPlaces = {};
  function mapToken(tok, e){
    var n = v57Norm_(tok); if (!n) return null;
    if (/المدرس[هة] الاصلي/.test(n)) { if (e && e.orig && sName[e.orig]) return {type: 'مدرسة', schoolId: e.orig, schoolName: sName[e.orig]}; return {type: 'أخرى', other: tok}; }
    if (sKey[n]) return {type: 'مدرسة', schoolId: sKey[n], schoolName: sName[sKey[n]]};
    for (var i = 0; i < V57_SPECIAL.length; i++) if (V57_SPECIAL[i][0].test(n)) { var s = V57_SPECIAL[i][1]; return {type: s.type, other: ''}; }
    var compact = n.replace(/\s+/g,''), first = n.split(' ')[0], cand = {}, arr = [];
    if(compact.length>=2 && fuzzyBuckets[compact.slice(0,2)]) fuzzyBuckets[compact.slice(0,2)].forEach(function(k){cand[k]=1;});
    if(first && fuzzyBuckets['w:'+first.slice(0,4)]) fuzzyBuckets['w:'+first.slice(0,4)].forEach(function(k){cand[k]=1;});
    arr = Object.keys(cand);
    /* في الأسماء القصيرة جدًا نترك المطابقة الدقيقة فقط لتجنب أخطاء المطابقة. */
    if(!arr.length && first){ var fb='c:'+first.slice(0,1); if(fuzzyBuckets[fb]) fuzzyBuckets[fb].forEach(function(k){cand[k]=1;}); arr=Object.keys(cand); }
    if(!arr.length || compact.length<3){ unknownPlaces[tok] = (unknownPlaces[tok] || 0) + 1; return {type: 'أخرى', other: tok}; }
    var best = '', bs = 0; arr.forEach(function(k){ var d = v57Dice_(n, k); if (d > bs) { bs = d; best = k; } });
    if (bs >= 0.86) { fuzzyPlaces[tok] = sName[sKey[best]]; return {type: 'مدرسة', schoolId: sKey[best], schoolName: sName[sKey[best]]}; }
    unknownPlaces[tok] = (unknownPlaces[tok] || 0) + 1; return {type: 'أخرى', other: tok};
  }
  var sups = [], unmatched = [], items = [], months = {}, skipped = [], newPeople = [];
  order.forEach(function(k){
    var r = latest[k], n = String(r[nameCol]).trim(), e = findEmp(n);
    var job0 = jobCol >= 0 ? String(r[jobCol] || '').trim() : '', subj0 = subjCol >= 0 ? String(r[subjCol] || '').trim() : '';
    if (e && e.skip) { skipped.push(n); return; }
    if (!e || e.err) { unmatched.push({name: n, job: job0, subject: subj0, err: e ? e.err : '', ov: e ? e.ov : '', cands: v58Cands_(n, list, sName)}); return; }
    if (e.isNew) newPeople.push({eid: e.eid, nid: e.nid, name: n, job: job0 || 'موجه', subject: subj0});
    var days = 0, trunc = 0;
    dateCols.forEach(function(dc){
      var raw = String(r[dc.col] || '').trim(); if (!raw) return;
      var seen = {}, ents = [];
      raw.split(/[,،]/).forEach(function(t){ t = t.trim(); if (!t) return; var x = mapToken(t, e); if (!x) return; if (x.type === 'مدرسة') { if (seen[x.schoolId]) return; seen[x.schoolId] = 1; } ents.push(x); });
      if (ents.length > ROUTE_V41_MAX_ITEMS) { trunc++; ents = ents.slice(0, ROUTE_V41_MAX_ITEMS); }
      if (!ents.length) return;
      months[dc.y + '-' + dc.m] = 1; days++;
      items.push({eid: e.eid, date: dc.iso, day: dc.day, y: dc.y, m: dc.m, entries: ents});
    });
    sups.push({formName: n, name: e.name, eid: e.eid, nid: e.nid, job: job0, days: days, truncated: trunc, via: e.isNew ? 'new' : (overrides[n] || overrides[k] ? 'manual' : 'auto')});
  });
  return {headersDays: dateCols.length, responses: v.length - 1, supervisors: sups, unmatched: unmatched, skipped: skipped, newPeople: newPeople, items: items, months: Object.keys(months),
    unknownPlaces: Object.keys(unknownPlaces).map(function(k){ return [k, unknownPlaces[k]]; }).sort(function(a, b){ return b[1] - a[1]; }),
    fuzzyPlaces: Object.keys(fuzzyPlaces).map(function(k){ return [k, fuzzyPlaces[k]]; })};
}
/** apply=false معاينة. overrides = {اسم في النموذج: رقم قومي} لغير المطابقين. */
function adminRouteImportV57(token, url, apply, overrides){
  var a = v35Admin_(token); routeV41Ensure_();
  var p = v57Plan_(url, overrides);
  var res = {success: true, responses: p.responses, days: p.headersDays, months: p.months, supervisors: p.supervisors, unmatched: p.unmatched, skipped: p.skipped, newPeople: p.newPeople, unknownPlaces: p.unknownPlaces, fuzzyPlaces: p.fuzzyPlaces, rows: p.items.length};
  if (!apply) { res.message = 'معاينة: ' + p.supervisors.length + ' موجه مطابق (' + p.items.length + ' يوم)، ' + p.unmatched.length + ' اسم غير مطابق' + (p.newPeople.length ? '، ' + p.newPeople.length + ' منتدب جديد سيُضاف' : '') + (p.skipped.length ? '، ' + p.skipped.length + ' متجاهَل' : '') + '.'; return res; }
  if (!p.items.length) throw new Error('لا توجد أيام للاستيراد.');
  return v35Lock_(function(){
    var sh = personnelSS_().getSheetByName(ROUTE_V41.routeSheet), h = routeV41Header_(sh), i = routeV41Idx_(h), lr = sh.getLastRow(), all = lr > 1 ? sh.getRange(2, 1, lr - 1, h.length).getValues() : [];
    var emp = personnelSS_().getSheetByName('01_الأساسي'), eh = routeV41Header_(emp), eix = routeV41Idx_(eh), elr = emp.getLastRow(), ev = elr > 1 ? emp.getRange(2, 1, elr - 1, eh.length).getDisplayValues() : [], erow = {};
    ev.forEach(function(r, n){ erow[r[eix.employeeId]] = {n: n + 2, r: r}; });
    // V5.8: إضافة المنتدبين من خارج الإدارة (توجيه فقط) — بلا مدرسة وبلا نظام مالي
    if (p.newPeople.length) {
      var map = {}, nrows = p.newPeople.map(function(x){
        var eid = 'EMP_' + Utilities.getUuid().replace(/-/g, '').slice(0, 20).toUpperCase(), row = new Array(eh.length).fill('');
        function q(k, v){ if (eix[k] != null) row[eix[k]] = v; }
        q('employeeId', eid); q('الرقم_القومي', x.nid); q('الاسم', x.name); q('النوع', Number(x.nid[12]) % 2 ? 'ذكر' : 'أنثى'); q('تاريخ_الميلاد', (x.nid[0] === '2' ? '19' : '20') + x.nid.substr(1, 2) + '-' + x.nid.substr(3, 2) + '-' + x.nid.substr(5, 2));
        q('الصفة', 'منتدب من خارج الإدارة'); q('الوظيفة_الإشرافية', x.job); q('مادة_التدريس', x.subject); q('القسم', x.subject); q('نوع التعليم', 'ديوان');
        q('الحالة_الوظيفية', 'قائم'); q('حالة_السجل', 'قائم'); q('قائم_بالعمل', 'نعم'); q('مشرف_على_المادة', 'لا'); q('حالة_التوجيه', 'نشط'); q('نظام_خط_السير', 'شهري');
        q('مصدر_تحديث_Master', 'منتدب للتوجيه من خارج الإدارة — أُضيف من استيراد خط السير');
        map[x.eid] = eid; return row;
      });
      var st0 = emp.getLastRow() + 1; if (eix['الرقم_القومي'] != null) emp.getRange(st0, eix['الرقم_القومي'] + 1, nrows.length, 1).setNumberFormat('@');
      v50A_(emp.getRange(st0, 1, nrows.length, eh.length).setValues(nrows));
      nrows.forEach(function(r, j){ erow[r[eix.employeeId]] = {n: st0 + j, r: r.map(String)}; });
      p.items.forEach(function(x){ if (map[x.eid]) x.eid = map[x.eid]; });
      p.supervisors.forEach(function(x){ if (map[x.eid]) x.eid = map[x.eid]; });
      p.newPeople.forEach(function(x){ x.eid = map[x.eid]; });
      schoolV31Log_(v36Actor_(a), 'إضافة منتدبين للتوجيه من خارج الإدارة', '01_الأساسي', p.newPeople.map(function(x){ return [x.name, '', x.nid]; }));
    }
    // نوع الخط لكل موجه (شهري افتراضيًا)
    var typeOf = {}, touched = {};
    p.items.forEach(function(x){ touched[x.eid] = 1; });
    Object.keys(touched).forEach(function(eid){ var e = erow[eid]; var t = e ? String(e.r[eix['نظام_خط_السير']] || '').trim() : ''; typeOf[eid] = t || 'شهري';
      if (e) { var upd = {}; if (!t && eix['نظام_خط_السير'] != null) upd[eix['نظام_خط_السير'] + 1] = 'شهري'; if (eix['حالة_التوجيه'] != null && String(e.r[eix['حالة_التوجيه']] || '').trim() !== 'نشط') upd[eix['حالة_التوجيه'] + 1] = 'نشط'; if (Object.keys(upd).length) v50WriteRow_(emp, e.n, upd); } });
    // V7.39: تحديث موضعي — نستبدل فقط صفوف (الموجه + التاريخ) الموجودة، ونضيف الأيام الجديدة.
    // الصفوف غير المرتبطة بالاستيراد لا تُعاد كتابتها إطلاقًا.
    var pos = {}, removed = 0;
    all.forEach(function(r, idx){ var d = v35Date_(r[i['التاريخ']]) || String(r[i['التاريخ']]); var key = String(r[i.supervisorId]) + '|' + d; if(!pos[key]) pos[key]=[]; pos[key].push(idx); });
    var now = new Date(), replacements = [], adds = [], duplicateRows = [];
    p.items.forEach(function(x){
      var row = new Array(h.length).fill(''); function put(k, v){ if (i[k] != null) row[i[k]] = v; }
      var sc = x.entries.filter(function(e){ return e.type === 'مدرسة'; }), non = x.entries.filter(function(e){ return e.type !== 'مدرسة'; })[0], oth = x.entries.filter(function(e){ return e.type === 'أخرى'; }).map(function(e){ return e.other; }).join(' | ');
      put('routeId', 'ROUTE_' + Utilities.getUuid().replace(/-/g, '').slice(0, 20)); put('supervisorId', x.eid); put('employeeId', x.eid); put('السنة', x.y); put('الشهر', x.m); put('نوع_الخط', typeOf[x.eid]); put('التاريخ', x.date); put('اليوم', x.day);
      put('نوع_الجهة', sc.length ? 'مدرسة' : (non ? non.type : 'مدرسة')); put('المدارس', sc.map(function(e){ return e.schoolId; }).join('|')); put('أسماء_المدارس', sc.map(function(e){ return e.schoolName; }).join(' | ')); put('الجهة_الأخرى', oth);
      put('الحالة', 'محفوظ'); put('الملاحظات', 'مستورد من نموذج جوجل'); put('وقت_الحفظ', now); put('عناصر_اليوم', JSON.stringify(x.entries));
      var key=String(x.eid)+'|'+String(x.date), slots=pos[key]||[];
      if(slots.length){ var rowIndex=slots.shift(); replacements.push({row:rowIndex+2, values:row}); removed++; while(slots.length) duplicateRows.push(slots.shift()+2); }
      else adds.push(row);
    });
    replacements.sort(function(a,b){return a.row-b.row;});
    var rr=0;
    while(rr<replacements.length){
      var start=rr, end=rr; while(end+1<replacements.length && replacements[end+1].row===replacements[end].row+1) end++;
      var vals=replacements.slice(start,end+1).map(function(x){return x.values;});
      v50A_(sh.getRange(replacements[start].row,1,vals.length,h.length).setValues(vals)); rr=end+1;
    }
    if(adds.length) v50A_(sh.getRange(sh.getLastRow()+1,1,adds.length,h.length).setValues(adds));
    if(duplicateRows.length){
      duplicateRows.sort(function(a,b){return a-b;});
      var dd=0;
      while(dd<duplicateRows.length){ var ds=dd,de=dd; while(de+1<duplicateRows.length&&duplicateRows[de+1]===duplicateRows[de]+1)de++; v50A_(sh.getRange(duplicateRows[ds],1,de-ds+1,h.length).clearContent()); dd=de+1; }
    }
    schoolV31Log_(v36Actor_(a), 'استيراد خط السير من نموذج جوجل', p.months.join(','), [['موجهون', '', String(p.supervisors.length)], ['أيام', '', String(add.length)], ['استُبدل', '', String(removed)]]);
    v50Invalidate_(ROUTE_V41.routeSheet);
    res.message = 'تم استيراد ' + add.length + ' يوم لـ' + p.supervisors.length + ' موجه' + (p.newPeople.length ? ' (منهم ' + p.newPeople.length + ' منتدب أُضيف للقاعدة)' : '') + (removed ? ' (استُبدل ' + removed + ' يوم كان مسجلًا لنفس التواريخ)' : '') + '.' + (p.unmatched.length ? ' لم يُستورد ' + p.unmatched.length + ' اسم غير مطابق.' : '');
    return res;
  });
}

/** V5.8: أقرب 3 موظفين لاسم غير مطابق (للاختيار السريع). */
function v58Cands_(n, list, sName){
  var k = v57NameKey_(n), t = k.split(' '), out = [];
  list.forEach(function(x){
    var u = x.key.split(' '); if (u[0] !== t[0] && v57Dice_(u[0], t[0]) < 0.7) return;
    var hit = 0; t.forEach(function(w){ if (u.indexOf(w) >= 0) hit++; else if (u.some(function(z){ return v57Dice_(z, w) >= 0.75; })) hit += 0.7; });
    var sc = 0.5 * v57Dice_(k, x.key) + 0.5 * hit / t.length + ((x.sup || x.active) ? 0.1 : 0) - (x.st === 'غير قائم' ? 0.2 : 0);
    if (sc >= 0.5) out.push({sc: sc, name: x.name, nid: x.nid, eid: x.eid, sup: x.sup, school: sName[x.orig] || ''});
  });
  return out.sort(function(a, b){ return b.sc - a.sc; }).slice(0, 3).map(function(x){ delete x.sc; return x; });
}
