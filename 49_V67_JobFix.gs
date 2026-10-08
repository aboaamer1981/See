/**
 * V6.7 — تصحيح «الوظيفة» (المسمى_الوظيفي): القيادة الأولى/الثانية وظيفة إشرافية فقط، وليست مسمى وظيفيًا.
 * من مسماه «قيادة أولى/ثانية» (أو مدير/وكيل) يعود لمسماه الحقيقي من الدرجة المالية + المسمى الأصلي،
 * ويُنقل التكليف إلى «الوظيفة_الإشرافية» (أولى: لو المرشح الوحيد للمدرسة ولا توجد قيادة أولى محددة؛ ثانية: دائمًا).
 * أداة صيانة مؤقتة — آمنة للتكرار.
 */
var V67_FAMILIES = {
  'معلم': ['معلم', 'معلم أول', 'معلم أول (أ)', 'معلم خبير', 'كبير معلمين'],
  'اجتماعي': ['أخصائي اجتماعي', 'أخصائي اجتماعي أول', 'أخصائي اجتماعي أول (أ)', 'أخصائي اجتماعي خبير', 'كبير أخصائيين اجتماعيين'],
  'نفسي': ['أخصائي نفسي', 'أخصائي نفسي أول', 'أخصائي نفسي أول (أ)', 'أخصائي نفسي خبير', 'كبير أخصائيين نفسيين'],
  'تكنولوجيا': ['أخصائي تكنولوجيا', 'أخصائي تكنولوجيا أول', 'أخصائي تكنولوجيا أول (أ)', 'أخصائي تكنولوجيا خبير', 'كبير أخصائيي تكنولوجيا'],
  'صحافة': ['أخصائي صحافة وإعلام', 'أخصائي صحافة وإعلام أول', 'أخصائي صحافة وإعلام أول (أ)', 'أخصائي صحافة وإعلام خبير', 'كبير أخصائيي صحافة وإعلام'],
  'مكتبة': ['أمين مكتبة', 'أمين مكتبة أول', 'أمين مكتبة أول (أ)', 'أمين مكتبة خبير', 'كبير أمناء مكتبات']
};
/** هل القيمة مسمى قيادة (لا يصلح «وظيفة»)؟ يرجع 1 أو 2 أو 0. */
function v67LeadTitle_(job){
  var n = v61Norm_(job); if (!n) return 0;
  if (/^قياده (اولي|اولى)$/.test(n) || /^مدير( مدرسه| المدرسه)?$/.test(n)) return 1;
  if (/^قياده ثانيه$/.test(n) || /^وكيل( مدرسه| المدرسه)?$/.test(n)) return 2;
  return 0;
}
function v67Family_(orig){
  var n = v61Norm_(orig);
  if (/صحاف/.test(n)) return 'صحافة';
  if (/مكتب/.test(n)) return 'مكتبة';
  if (/اجتماعي/.test(n)) return 'اجتماعي';
  if (/نفسي/.test(n)) return 'نفسي';
  if (/اخصائي تكنولوجيا|تكنولوجيا/.test(n) && !/^معلم/.test(n)) return 'تكنولوجيا';
  if (/معلم|مدرس|كبير معلمين/.test(n)) return 'معلم';
  if (/اخصائي|امين/.test(n)) return '';      // أخصائي غير محدد النوع ← يحدده الأدمن
  return 'معلم';                               // مسمى أصلي فارغ/قيادة: الغالب أنه من هيئة التعليم
}
/** المستوى 0..4 (أساسي، أول، أول أ، خبير، كبير) من الدرجة المالية ثم من المسمى الأصلي. */
function v67Level_(grade, orig){
  function fromText(t){
    var n = v61Norm_(t).replace(/[._\-]/g, ' ').replace(/\s+/g, ' ');
    if (!n) return -1;
    if (/كبير/.test(n) || /^العليا$|^العاليه$/.test(n)) return 4;
    if (/خبير/.test(n) || /^مدير عام$/.test(n)) return 3;
    if (/اول ?\(?ا\)?$|اول ا\b|اول أ/.test(n) || /^الاولي$|^الاولى$/.test(n)) return 2;
    if (/اول/.test(n) || /^الثانيه$/.test(n)) return 1;
    if (/^الثالثه$/.test(n)) return 0;
    return -1;
  }
  var g = fromText(grade); if (g >= 0) return g;
  var o = fromText(orig); if (o >= 0) return o;
  if (/^(معلم|مدرس|اخصائي|امين)/.test(v61Norm_(orig))) return 0;
  return -1;
}
function v67Plan_(){
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), D = v61Data_(), byE = {};
  D.list.forEach(function(x){ byE[x.eid] = x; });
  var rows = [];
  emp.rows.forEach(function(r, i){
    var job = schoolV31Val_(r, ei, 'المسمى_الوظيفي'), L = v67LeadTitle_(job); if (!L) return;
    var eid = schoolV31Val_(r, ei, 'employeeId'), orig = schoolV31Val_(r, ei, 'المسمى_الوظيفي_الأصلي'), grade = schoolV31Val_(r, ei, 'الدرجة_المالية');
    if (v67LeadTitle_(orig)) orig = '';
    var fam = v67Family_(orig), lv = v67Level_(grade, orig), sug = fam && lv >= 0 ? V67_FAMILIES[fam][lv] : '';
    var w = byE[eid];
    rows.push({row: i + 2, eid: eid, name: schoolV31Val_(r, ei, 'الاسم'), nid: schoolV31Val_(r, ei, 'الرقم_القومي'), job: job, orig: orig, grade: grade,
      lead: L === 1 ? 'قيادة أولى' : 'قيادة ثانية', sup: schoolV31Val_(r, ei, 'الوظيفة_الإشرافية'), suggest: sug, active: !!w, sid: w ? w.sid : '', school: w ? w.school : ''});
  });
  // التكليف المقترح
  var bySid = {};
  rows.forEach(function(x){ if (x.active && x.sid) (bySid[x.sid] = bySid[x.sid] || []).push(x); });
  Object.keys(bySid).forEach(function(sid){
    var cur = v61SchoolWorkers_(sid), hasFirst = cur.some(function(w){ return V61_LEAD[String(w.sup).trim()] === 1; });
    var firsts = bySid[sid].filter(function(x){ return x.lead === 'قيادة أولى' && !V61_LEAD[String(x.sup).trim()]; });
    bySid[sid].forEach(function(x){
      if (V61_LEAD[String(x.sup).trim()]) { x.assign = ''; x.note = 'مكلَّف بالفعل: ' + x.sup; return; }
      if (x.lead === 'قيادة ثانية') { x.assign = 'قيادة ثانية'; return; }
      if (!hasFirst && firsts.length === 1) { x.assign = 'قيادة أولى'; return; }
      x.assign = ''; x.note = hasFirst ? 'المدرسة لها قيادة أولى محددة بالفعل' : 'أكثر من مرشح للقيادة الأولى — حددها من «القيادات»';
    });
  });
  rows.forEach(function(x){ if (!x.active) { x.assign = ''; x.note = 'غير قائم / بلا علاقة نشطة — يُصحَّح المسمى فقط'; } });
  return rows.sort(function(a, b){ return (a.school || 'ي').localeCompare(b.school || 'ي', 'ar') || a.name.localeCompare(b.name, 'ar'); });
}
/** الإدارة: معاينة/تطبيق. overrides = {employeeId: 'المسمى المختار'} لمن لم يُقترح له مسمى أو لتعديل المقترح. */
function adminJobFixV67(token, apply, overrides){
  var a = v35Admin_(token); overrides = overrides || {};
  var allTitles = {}; Object.keys(V67_FAMILIES).forEach(function(f){ V67_FAMILIES[f].forEach(function(t){ allTitles[t] = 1; }); });
  ['معلم مساعد', 'أخصائي اجتماعي مساعد', 'أخصائي نفسي مساعد', 'أخصائي تكنولوجيا مساعد', 'أخصائي صحافة وإعلام مساعد', 'أمين مكتبة مساعد', 'كاتب', 'إداري', 'أمين معمل', 'مشرف اجتماعي', 'مشرف نشاط', 'أخصائي تطوير'].forEach(function(t){ allTitles[t] = 1; });
  var titles = Object.keys(allTitles);
  if (!apply) {
    var p = v67Plan_();
    return {success: true, rows: p, titles: titles, noSuggest: p.filter(function(x){ return !x.suggest; }).length,
      message: 'معاينة: ' + p.length + ' موظف مسماه الوظيفي «قيادة» — سيعود لمسماه الحقيقي، والقيادة تُنقل للوظيفة الإشرافية.'};
  }
  return v35Lock_(function(){
    v50Fresh_(); V61_CACHE_ = null;
    var plan = v67Plan_(), sh = personnelSS_().getSheetByName('01_الأساسي'), h = v36Headers_(sh), ix = schoolV31Idx_(h), n = sh.getLastRow() - 1;
    var jc = ix['المسمى_الوظيفي'], sc = ix['الوظيفة_الإشرافية'];
    if (jc == null || sc == null) throw new Error('عمود المسمى الوظيفي أو الوظيفة الإشرافية غير موجود.');
    var jobs = sh.getRange(2, jc + 1, n, 1).getValues(), sups = sh.getRange(2, sc + 1, n, 1).getValues(), ch = [], skipped = [], assigned = 0;
    plan.forEach(function(x){
      var t = String(overrides[x.eid] || x.suggest || '').trim();
      if (t && !allTitles[t]) throw new Error('مسمى غير معتمد: ' + t);
      var i = x.row - 2;
      if (x.assign && !String(sups[i][0] || '').trim()) { sups[i][0] = x.assign; assigned++; }
      if (!t) { skipped.push(x.name); return; }
      jobs[i][0] = t; ch.push([x.name, x.job, t + (x.assign ? ' + إشرافية: ' + x.assign : '')]);
    });
    if (ch.length || assigned) { v50A_(sh.getRange(2, jc + 1, n, 1).setValues(jobs)); v50A_(sh.getRange(2, sc + 1, n, 1).setValues(sups)); }
    // إيقاف «قيادة أولى/ثانية» كمسمى وظيفي في المرجع
    var rs = personnelSS_().getSheetByName('R_المسميات_الوظيفية');
    if (rs && rs.getLastRow() > 1) {
      var rh = v36Headers_(rs), ri = schoolV31Idx_(rh), rv = rs.getRange(2, 1, rs.getLastRow() - 1, rh.length).getValues(), rd = false;
      if (ri['المسمى_الوظيفي'] != null && ri['الحالة'] != null) rv.forEach(function(r){ if (v67LeadTitle_(r[ri['المسمى_الوظيفي']]) && String(r[ri['الحالة']]).trim() !== 'غير فعال') { r[ri['الحالة']] = 'غير فعال'; rd = true; } });
      if (rd) v50A_(rs.getRange(2, 1, rv.length, rh.length).setValues(rv));
    }
    if (ch.length) schoolV31Log_(v36Actor_(a), 'تصحيح المسمى الوظيفي (القيادة وظيفة إشرافية فقط) V6.7', '01_الأساسي', ch);
    V61_CACHE_ = null; try { v50Invalidate_('01_الأساسي'); } catch (e) {}
    return {success: true, changed: ch.length, assigned: assigned, skipped: skipped,
      message: 'تم: تصحيح مسمى ' + ch.length + ' موظف، وتكليف ' + assigned + ' بالوظيفة الإشرافية.' + (skipped.length ? ' لم يُصحَّح ' + skipped.length + ' (بلا مسمى مختار).' : '')};
  });
}
/** فلتر قوائم «الوظيفة»: لا تظهر فيها مسميات القيادة. */
function v67JobOptions_(list){ return (list || []).filter(function(x){ return !v67LeadTitle_(x); }); }
function v67GuardJob_(job){ if (job !== undefined && v67LeadTitle_(job)) throw new Error('«' + String(job).trim() + '» ليست وظيفة — القيادة الأولى/الثانية تُحدَّد في «الوظيفة الإشرافية» فقط، والوظيفة تبقى (معلم، معلم أول، خبير، كبير معلمين…).'); }
/** V6.7: من له نظام عمل مالي؟ 'lead' (قيادة أولى/ثانية بالوظيفة الإشرافية) — 'teacher' (المسميات الستة للمعلم) — '' غير ذلك (أخصائي/أمين/إداري/كاتب…).
 *  نفس قواعد R_فئات_الاستحقاق المعمول بها؛ لا تغيير في الأهلية المالية. */
function v67FinKind_(job, sup){
  var a = String(sup || '').trim();
  if (a && V40_SCHOOL_ASSIGNMENTS[a]) return 'lead';
  if (V54_TEACHER_JOBS[String(job || '').trim()]) return 'teacher';
  return '';
}
function v67GuardSystem_(job, sup, sys, oldSys){
  var v = String(sys == null ? '' : sys).trim();
  if (!v || v === String(oldSys || '').trim() || v === 'معلم حصة' || v === 'معاش') return;
  var k = v67FinKind_(job, sup);
  if (!k) throw new Error('نظام العمل المالي للمعلمين والقيادة فقط — «' + (String(job || '').trim() || 'بدون مسمى') + '» لا ينطبق عليه نظام مالي.');
  if (k === 'lead' && v !== 'منظومة أيام') throw new Error('القيادة الأولى/الثانية نظامها «منظومة أيام» فقط.');
}
/** V6.7: مسح «نظام العمل» المسجَّل قديمًا لمن ليس له نظام مالي (أخصائي/أمين/إداري/كاتب…).
 *  لا يمس: المعلمين، القيادة (بالوظيفة الإشرافية أو مسمى «قيادة» لم يُصحَّح بعد)، «معلم حصة»/«معاش»، ومن مسماه فارغ (يُعرض للمراجعة). */
function adminClearNonFinSystemsV67(token, apply){
  var a = v35Admin_(token);
  function scan(){
    var sh = personnelSS_().getSheetByName('01_الأساسي'), h = v36Headers_(sh), ix = schoolV31Idx_(h), n = sh.getLastRow() - 1;
    var v = n > 0 ? sh.getRange(2, 1, n, h.length).getValues() : [], rows = [], blank = [];
    if (ix['نظام_العمل'] == null) throw new Error('عمود نظام العمل غير موجود.');
    v.forEach(function(r, i){
      var sys = String(r[ix['نظام_العمل']] || '').trim(); if (!sys || sys === 'معلم حصة' || sys === 'معاش') return;
      var job = String(r[ix['المسمى_الوظيفي']] || '').trim(), sup = ix['الوظيفة_الإشرافية'] != null ? r[ix['الوظيفة_الإشرافية']] : '';
      var it = {i: i, name: String(r[ix['الاسم']] || ''), job: job, sys: sys};
      if (v67LeadTitle_(job) || v67FinKind_(job, sup)) return;
      if (!job || !/اخصا|امين|امناء|كاتب|اداري|مشرف|معمل|عامل|سكرتير/.test(v61Norm_(job))) { blank.push(it); return; }   // مسمى فارغ أو غير واضح (مثل «اللغه العربيه») ← مراجعة فقط
      rows.push(it);
    });
    return {sh: sh, ix: ix, n: n, rows: rows, blank: blank};
  }
  var S = scan(), byJob = {};
  S.rows.forEach(function(x){ byJob[x.job] = (byJob[x.job] || 0) + 1; });
  var out = {success: true, count: S.rows.length, byJob: Object.keys(byJob).map(function(k){ return {job: k, n: byJob[k]}; }).sort(function(x, y){ return y.n - x.n; }),
    rows: S.rows.map(function(x){ return {name: x.name, job: x.job, sys: x.sys}; }), blank: S.blank.map(function(x){ return {name: x.name, job: x.job, sys: x.sys}; })};
  if (!apply) { out.message = 'معاينة: سيُمسح نظام العمل لـ ' + S.rows.length + ' موظف ليس له نظام مالي.' + (S.blank.length ? ' و' + S.blank.length + ' مسماهم فارغ أو غير واضح لن يُمسوا (صحح مسماهم أولًا).' : ''); return out; }
  return v35Lock_(function(){
    v50Fresh_(); var T = scan(), col = T.ix['نظام_العمل'], vals = T.n > 0 ? T.sh.getRange(2, col + 1, T.n, 1).getValues() : [], ch = [];
    T.rows.forEach(function(x){ vals[x.i][0] = ''; ch.push([x.name, x.sys, '']); });
    if (ch.length) { v50A_(T.sh.getRange(2, col + 1, T.n, 1).setValues(vals)); schoolV31Log_(v36Actor_(a), 'مسح نظام العمل لغير المستحقين ماليًا V6.7', '01_الأساسي', ch); }
    V61_CACHE_ = null; try { v50Invalidate_('01_الأساسي'); } catch (e) {}
    out.count = ch.length; out.message = 'تم: مسح نظام العمل لـ ' + ch.length + ' موظف.' + (T.blank.length ? ' بقي ' + T.blank.length + ' مسماهم فارغ أو غير واضح.' : '');
    return out;
  });
}
