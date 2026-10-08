/** V6.4 — مراجعة الاستحقاقات: جاهزية الشهر (نظام العمل/النصاب)، ملخص الإدارة ومقارنة الشهر السابق، ملف العامل المالي،
 *  تصدير، تنبيه المدرسة، المسئول المالي على قائمة الأشهر، و«استحقاقاتي» للموظف.
 *  قاعدة: إرسال المدرسة = اعتماد (ذاتي) — ما يُحتسب بعد الإرسال هو الاستحقاق المعتمد. */
var V64_PERIOD_SYS = {'منظومة حصص': 1, 'منظومة حصص + فوق النصاب': 1, 'فوق النصاب': 1};
function v64Num_(v){ return Number(String(v == null ? '' : v).replace(/,/g, '')) || 0; }
function v64Ops_(){ var T = v42SchoolTypes_(), n = v42SchoolNames_(); return Object.keys(n).filter(function(sid){ return /تشغيلي/.test((T[sid] || {}).cls || ''); }); }

/** جاهزية عامل: '' أو سبب. */
function v64Issue_(w, quotas){
  if (!String(w.system || '').trim()) return 'بلا نظام عمل';
  if (V64_PERIOD_SYS[w.system] && !v52QuotaMonthly_(w, quotas)) return 'بلا نصاب قانوني (' + (w.job || '—') + ' / ' + (w.stage || 'بدون مرحلة') + ')';
  return '';
}
function v64Readiness_(sids){
  var quotas = v36QuotaTable_(), names = v42SchoolNames_(), schools = [], people = [];
  sids.forEach(function(sid){
    var ws = v36ActiveWorkers_(sid), s = {sid: sid, name: names[sid] || sid, eligible: ws.length, noSystem: 0, noQuota: 0};
    ws.forEach(function(w){ var is = v64Issue_(w, quotas); if (!is) return; if (/نظام/.test(is)) s.noSystem++; else s.noQuota++; people.push({school: s.name, name: w.name, nid: w.nationalId, job: w.job, stage: w.stage, issue: is}); });
    s.ready = s.eligible ? Math.round((s.eligible - s.noSystem - s.noQuota) * 1000 / s.eligible) / 10 : 100;
    if (s.eligible) schools.push(s);
  });
  var T = {eligible: 0, noSystem: 0, noQuota: 0}; schools.forEach(function(s){ T.eligible += s.eligible; T.noSystem += s.noSystem; T.noQuota += s.noQuota; });
  T.ready = T.eligible ? Math.round((T.eligible - T.noSystem - T.noQuota) * 1000 / T.eligible) / 10 : 100;
  return {totals: T, schools: schools.sort(function(a, b){ return a.ready - b.ready || a.name.localeCompare(b.name, 'ar'); }), people: people.sort(function(a, b){ return a.school.localeCompare(b.school, 'ar') || a.name.localeCompare(b.name, 'ar'); })};
}
function adminFinanceReadinessV64(token){ v35Admin_(token); var r = v64Readiness_(v64Ops_()); r.success = true; return r; }

/* ---------- ملخص الشهر + مقارنة بالشهر السابق + التصدير ---------- */
function v64MonthRows_(year, month){
  var names = v42SchoolNames_(), emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), en = {};
  emp.rows.forEach(function(r){ en[schoolV31Val_(r, ei, 'employeeId')] = {name: schoolV31Val_(r, ei, 'الاسم'), nid: schoolV31Val_(r, ei, 'الرقم_القومي'), job: schoolV31Val_(r, ei, 'المسمى_الوظيفي')}; });
  var f = v24Data_('08_الماليات'), fi = schoolV31Idx_(f.headers), out = [];
  f.rows.forEach(function(r){
    if (Number(schoolV31Val_(r, fi, 'السنة')) !== Number(year) || Number(schoolV31Val_(r, fi, 'الشهر')) !== Number(month)) return;
    var e = en[schoolV31Val_(r, fi, 'employeeId')] || {}, sid = schoolV31Val_(r, fi, 'schoolId');
    out.push({kind: 'أساسي', eid: schoolV31Val_(r, fi, 'employeeId'), name: e.name || '', nid: e.nid || '', job: e.job || '', sid: sid, school: names[sid] || sid,
      system: schoolV31Val_(r, fi, 'نظام_العمل'), category: schoolV31Val_(r, fi, 'فئة_الاستحقاق') || '', days: schoolV31Val_(r, fi, 'أيام_الحضور_الفعلية'), periods: schoolV31Val_(r, fi, 'الحصص_الفعلية'), over: schoolV31Val_(r, fi, 'ساعات_فوق_النصاب'),
      vDays: v64Num_(schoolV31Val_(r, fi, 'قيمة_منظومة_الأيام')), vPeriods: v64Num_(schoolV31Val_(r, fi, 'قيمة_منظومة_الحصص')), vOver: v64Num_(schoolV31Val_(r, fi, 'قيمة_فوق_النصاب')),
      total: v64Num_(schoolV31Val_(r, fi, 'الإجمالي')), calc: schoolV31Val_(r, fi, 'حالة_الحساب'), notes: schoolV31Val_(r, fi, 'ملاحظات')});
  });
  try {
    var hp = v24Data_('05_معلمو_الحصة_والمعاش'), hi = schoolV31Idx_(hp.headers), hn = {};
    hp.rows.forEach(function(r){ hn[schoolV31Val_(r, hi, 'hrpId')] = {name: schoolV31Val_(r, hi, 'الاسم'), nid: schoolV31Val_(r, hi, 'الرقم_القومي')}; });
    var hf = v24Data_('08_ماليات_معلمي_الحصة'), hfi = schoolV31Idx_(hf.headers);
    hf.rows.forEach(function(r){
      if (Number(schoolV31Val_(r, hfi, 'السنة')) !== Number(year) || Number(schoolV31Val_(r, hfi, 'الشهر')) !== Number(month)) return;
      var e = hn[schoolV31Val_(r, hfi, 'hrpId')] || {}, sid = schoolV31Val_(r, hfi, 'schoolId'), cat = schoolV31Val_(r, hfi, 'نوع_الفئة');
      out.push({kind: cat || 'حصة/معاش', eid: schoolV31Val_(r, hfi, 'hrpId'), name: e.name || '', nid: e.nid || '', job: cat, sid: sid, school: names[sid] || sid, system: cat, category: cat,
        days: '', periods: schoolV31Val_(r, hfi, 'إجمالي_الحصص_الفعلية'), over: '', vDays: 0, vPeriods: 0, vOver: 0, vHrp: v64Num_(schoolV31Val_(r, hfi, 'القيمة')), total: v64Num_(schoolV31Val_(r, hfi, 'القيمة')), calc: schoolV31Val_(r, hfi, 'حالة_الحساب'), notes: schoolV31Val_(r, hfi, 'ملاحظات')});
    });
  } catch (e) {}
  return out;
}
function adminFinanceSummaryV64(token, year, month){
  v35Admin_(token); var mo = v36ResolveMonth_(year, month), y = mo.year, m = mo.month, py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
  var cur = v64MonthRows_(y, m), prev = v64MonthRows_(py, pm), pv = {};
  prev.forEach(function(x){ pv[x.kind + '|' + x.eid] = (pv[x.kind + '|' + x.eid] || 0) + x.total; });
  var T = {days: 0, periods: 0, over: 0, hrp: 0, pension: 0, total: 0, people: 0, review: 0}, bySys = {}, byCat = {}, bySchool = {}, review = [], changes = [], seen = {};
  cur.forEach(function(x){
    var calc = x.calc === 'محسوب';
    if (!calc) { T.review++; review.push({school: x.school, name: x.name, nid: x.nid, kind: x.kind, system: x.system, status: x.calc || '—', notes: x.notes}); return; }
    T.days += x.vDays; T.periods += x.vPeriods; T.over += x.vOver; if (x.kind === 'معلم بالمعاش') T.pension += x.total; else if (x.kind !== 'أساسي') T.hrp += x.total; T.total += x.total;
    if (!seen[x.kind + '|' + x.eid]) { seen[x.kind + '|' + x.eid] = 1; T.people++; }
    var sk = x.kind === 'أساسي' ? (x.system || '(بلا نظام)') : x.kind; bySys[sk] = bySys[sk] || {k: sk, n: 0, total: 0}; bySys[sk].n++; bySys[sk].total += x.total;
    var ck = x.kind === 'أساسي' ? (x.category || 'غير محدد') : x.kind; byCat[ck] = byCat[ck] || {k: ck, n: 0, total: 0}; byCat[ck].n++; byCat[ck].total += x.total;
    var sc = bySchool[x.sid] = bySchool[x.sid] || {school: x.school, n: 0, total: 0, prev: 0}; sc.n++; sc.total += x.total;
  });
  var curBy = {}; cur.forEach(function(x){ if (x.calc === 'محسوب') curBy[x.kind + '|' + x.eid] = {x: x, t: (curBy[x.kind + '|' + x.eid] || {t: 0}).t + x.total}; });
  Object.keys(curBy).forEach(function(k){
    var c = curBy[k], p = pv[k] || 0, d = c.t - p;
    if (p && Math.abs(d) >= Math.max(50, p * 0.25)) changes.push({school: c.x.school, name: c.x.name, nid: c.x.nid, kind: c.x.kind, prev: p, cur: c.t, diff: d});
    if (!p) changes.push({school: c.x.school, name: c.x.name, nid: c.x.nid, kind: c.x.kind, prev: 0, cur: c.t, diff: c.t, isNew: true});
  });
  var prevTotal = 0; prev.forEach(function(x){ if (x.calc === 'محسوب') { prevTotal += x.total; if (bySchool[x.sid]) bySchool[x.sid].prev += x.total; } });
  var arr = function(o){ return Object.keys(o).map(function(k){ return o[k]; }).sort(function(a, b){ return b.total - a.total; }); };
  return {success: true, month: {year: y, month: m, label: V56_MONTH_NAMES[m - 1] + ' ' + y}, prevLabel: V56_MONTH_NAMES[pm - 1] + ' ' + py, totals: T, prevTotal: prevTotal,
    bySystem: arr(bySys), byCategory: arr(byCat), bySchool: arr(bySchool), review: review,
    changes: changes.sort(function(a, b){ return Math.abs(b.diff) - Math.abs(a.diff); }).slice(0, 300), months: v56MonthsForSchool_()};
}
/** صفوف كشف الشهر للتصدير (CSV يفتح في Excel). */
function adminFinanceExportV64(token, year, month){
  v35Admin_(token); var mo = v36ResolveMonth_(year, month);
  return {success: true, label: V56_MONTH_NAMES[mo.month - 1] + ' ' + mo.year, rows: v64MonthRows_(mo.year, mo.month).sort(function(a, b){ return a.school.localeCompare(b.school, 'ar') || a.name.localeCompare(b.name, 'ar'); })};
}

/* ---------- ملف العامل المالي ---------- */
function v64History_(eid, nid){
  var names = v42SchoolNames_(), out = [];
  if (eid) { var f = v24Data_('08_الماليات'), fi = schoolV31Idx_(f.headers);
    f.rows.forEach(function(r){ if (schoolV31Val_(r, fi, 'employeeId') !== eid) return; var sid = schoolV31Val_(r, fi, 'schoolId');
      out.push({y: Number(schoolV31Val_(r, fi, 'السنة')), m: Number(schoolV31Val_(r, fi, 'الشهر')), school: names[sid] || sid, kind: 'أساسي', system: schoolV31Val_(r, fi, 'نظام_العمل'),
        days: schoolV31Val_(r, fi, 'أيام_الحضور_الفعلية'), periods: schoolV31Val_(r, fi, 'الحصص_الفعلية'), over: schoolV31Val_(r, fi, 'ساعات_فوق_النصاب'),
        vDays: v64Num_(schoolV31Val_(r, fi, 'قيمة_منظومة_الأيام')), vPeriods: v64Num_(schoolV31Val_(r, fi, 'قيمة_منظومة_الحصص')), vOver: v64Num_(schoolV31Val_(r, fi, 'قيمة_فوق_النصاب')),
        total: v64Num_(schoolV31Val_(r, fi, 'الإجمالي')), calc: schoolV31Val_(r, fi, 'حالة_الحساب'), notes: schoolV31Val_(r, fi, 'ملاحظات')}); }); }
  if (nid) { try {
    var hp = v24Data_('05_معلمو_الحصة_والمعاش'), hi = schoolV31Idx_(hp.headers), ids = {};
    hp.rows.forEach(function(r){ if (v24DigitsLocalV31_(schoolV31Val_(r, hi, 'الرقم_القومي')) === nid) ids[schoolV31Val_(r, hi, 'hrpId')] = 1; });
    var hf = v24Data_('08_ماليات_معلمي_الحصة'), hfi = schoolV31Idx_(hf.headers);
    hf.rows.forEach(function(r){ if (!ids[schoolV31Val_(r, hfi, 'hrpId')]) return; var sid = schoolV31Val_(r, hfi, 'schoolId');
      out.push({y: Number(schoolV31Val_(r, hfi, 'السنة')), m: Number(schoolV31Val_(r, hfi, 'الشهر')), school: names[sid] || sid, kind: schoolV31Val_(r, hfi, 'نوع_الفئة'), system: schoolV31Val_(r, hfi, 'نوع_الفئة'),
        days: '', periods: schoolV31Val_(r, hfi, 'إجمالي_الحصص_الفعلية'), over: '', vDays: 0, vPeriods: 0, vOver: 0, total: v64Num_(schoolV31Val_(r, hfi, 'القيمة')), calc: schoolV31Val_(r, hfi, 'حالة_الحساب'), notes: schoolV31Val_(r, hfi, 'ملاحظات')}); });
  } catch (e) {} }
  return out.sort(function(a, b){ return (b.y * 100 + b.m) - (a.y * 100 + a.m); }).map(function(x){ x.label = V56_MONTH_NAMES[x.m - 1] + ' ' + x.y; return x; });
}
function adminWorkerFinanceV64(token, q){
  v35Admin_(token); q = String(q || '').trim(); if (q.length < 3) throw new Error('اكتب الرقم القومي أو 3 أحرف من الاسم على الأقل.');
  var d = v24DigitsLocalV31_(q), found = [];
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), names = v42SchoolNames_();
  emp.rows.forEach(function(r){ var n = schoolV31Val_(r, ei, 'الاسم'), id = v24DigitsLocalV31_(schoolV31Val_(r, ei, 'الرقم_القومي'));
    if ((d.length >= 6 && id.indexOf(d) === 0) || (!/\d/.test(q) && v61Norm_(n).indexOf(v61Norm_(q)) >= 0)) found.push({eid: schoolV31Val_(r, ei, 'employeeId'), name: n, nid: id, job: schoolV31Val_(r, ei, 'المسمى_الوظيفي'), school: names[schoolV31Val_(r, ei, 'originalSchoolId')] || '', kind: 'أساسي'}); });
  try { var hp = v24Data_('05_معلمو_الحصة_والمعاش'), hi = schoolV31Idx_(hp.headers);
    hp.rows.forEach(function(r){ var n = schoolV31Val_(r, hi, 'الاسم'), id = v24DigitsLocalV31_(schoolV31Val_(r, hi, 'الرقم_القومي'));
      if ((d.length >= 6 && id.indexOf(d) === 0) || (!/\d/.test(q) && v61Norm_(n).indexOf(v61Norm_(q)) >= 0)) found.push({eid: '', name: n, nid: id, job: schoolV31Val_(r, hi, 'نوع_الفئة'), school: names[schoolV31Val_(r, hi, 'originalSchoolId')] || '', kind: 'حصة/معاش'}); }); } catch (e) {}
  if (found.length !== 1) return {success: true, matches: found.slice(0, 30), history: null};
  var p = found[0]; return {success: true, person: p, matches: found, history: v64History_(p.eid, p.nid)};
}

/* ---------- المدرسة: تنبيه الأشهر المفتوحة ---------- */
function schoolFinanceStatusV64(token){
  var s = schoolV33Session_(token), sid = String(s.schoolId), quotas = v36QuotaTable_(), out = [];
  v56Months_().filter(function(x){ return x.status === 'مفتوح'; }).forEach(function(mo){
    try {
      var b = v36MonthlyBuild_(sid, mo.year, mo.month), ws = b.workers.filter(function(w){ return w.entryAllowed !== false; });
      if (!ws.length) return;
      var sent = ws.filter(function(w){ return w.state === 'مرسل' || w.state === 'معتمد'; }).length, issues = ws.filter(function(w){ return v64Issue_(w, quotas); }).length;
      out.push({year: mo.year, month: mo.month, label: v56Label_(mo), total: ws.length, sent: sent, issues: issues, returned: b.stat['معاد للمدرسة'] || 0});
    } catch (e) {}
  });
  return {success: true, months: out};
}

/* ---------- الموظف: استحقاقاتي ---------- */
function staffMyFinanceV64(token){
  var s = v42StaffSession_(token), b = v42FindBasicByNid_(s.username); if (!b) throw new Error('بيانات الموظف غير موجودة.');
  var eid = v42Val_(b.row, b.idx, 'employeeId'), nid = v24DigitsLocalV31_(v42Val_(b.row, b.idx, 'الرقم_القومي'));
  var h = v64History_(eid, nid).filter(function(x){ return x.calc === 'محسوب' || x.calc === 'مراجعة'; });
  return {success: true, name: v42Val_(b.row, b.idx, 'الاسم'), system: v42Val_(b.row, b.idx, 'نظام_العمل'), rows: h};
}

/** V6.5: الفارغ ≠ الصفر — قائمة «الاسم: الخانات الفارغة» لعاملين لهم بيانات مسودة في الشهر (لا تشمل «بدون إدخال» ولا المرسل). */
function v65Blanks_(b, h){
  var out = [], AB = ['عارضة', 'اعتيادي', 'مرضي', 'مأمورية'];
  function blank(v){ return v === '' || v == null; }
  if (b) b.workers.forEach(function(w){
    if (w.entryAllowed === false || !w.row || w.state === 'مرسل' || w.state === 'معتمد') return;
    var sys = w.effectiveSystem || w.system || '', miss = [];
    if (w.ownsAbsence !== false) AB.forEach(function(k){ if (blank(w.row[k])) miss.push(k); });
    if (/حصص/.test(sys) && blank(w.row['الحصص_الفعلية_المنفذة'])) miss.push('الحصص الفعلية');
    if (/فوق النصاب/.test(sys) && blank(w.row['ساعات_فوق_النصاب'])) miss.push('فوق النصاب');
    if (miss.length) out.push(w.name + ': ' + miss.join('، '));
  });
  if (h) (h.workers || []).forEach(function(w){
    if (!w.row || w.state === 'مرسل' || w.state === 'معتمد') return; var miss = [];
    if (w.ownsAbsence !== false) AB.forEach(function(k){ if (blank(w.row[k])) miss.push(k); });
    if (blank(w.row['الحصص_الفعلية'])) miss.push('الحصص الفعلية');
    if (miss.length) out.push(w.name + ' (حصة/معاش): ' + miss.join('، '));
  });
  return out;
}
