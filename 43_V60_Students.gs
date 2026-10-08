/** V6.0 — شئون الطلاب: لوحة موحّدة للإدارة ورئيس القسم + الكثافة + تقرير الغياب لفترة + متابعة التسجيل.
 *  الكثافة = إجمالي الطلاب ÷ عدد الفصول. الحد الأقصى القانوني 50 (MAX_CLASS_DENSITY)، والتنبيه من 45 (DENSITY_WARN).
 *  الغياب: من 19_يومية_المدرسة (النوع = صف). الصف «الكل» = إجمالي مرحلة كاملة (إدخال مختصر). */
var V60_STAGE_ORDER = {'رياض أطفال': 0, 'ابتدائي': 1, 'إعدادي': 2, 'ثانوي': 3};
var V60_GRADE_ORDER = ['KG1', 'KG2', 'المستوى الأول', 'المستوى الثاني', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'الكل'];
var V60_REPEAT_WARN = 5;   // نسبة الباقين للإعادة التي تستحق التنبيه (%)

function v60Limits_(){
  var mx = Number(v24DigitsLocalV31_(v36GetSetting_('MAX_CLASS_DENSITY', '50'))) || 50;
  var wr = Number(v24DigitsLocalV31_(v36GetSetting_('DENSITY_WARN', String(mx - 5)))) || (mx - 5);
  return {max: mx, warn: wr, repeat: V60_REPEAT_WARN};
}
function v60Dens_(total, classes){ return classes ? Math.round(total * 10 / classes) / 10 : 0; }
function v60Pct_(a, b){ return b ? Math.round(a * 1000 / b) / 10 : 0; }
function v60SortGrade_(a, b){
  return ((V60_STAGE_ORDER[a.stage] == null ? 9 : V60_STAGE_ORDER[a.stage]) - (V60_STAGE_ORDER[b.stage] == null ? 9 : V60_STAGE_ORDER[b.stage])) || (V60_GRADE_ORDER.indexOf(a.grade) - V60_GRADE_ORDER.indexOf(b.grade));
}

/* ---------- النطاق ---------- */
/** نطاق رئيس القسم / صاحب صلاحية «شئون طلاب»: {stage, tech: true|false|null, schools: {sid:1}|null, label}. */
function v60DeptScope_(token){
  var s = null; try { s = v42Session_(token); } catch (e) {}
  if (!s) s = getSchoolSessionV271(token);
  if (!s) throw new Error('الجلسة غير صالحة أو منتهية. سجّل الدخول من جديد.');
  var stage = '', schools = null, perm = (s.permissions || []).filter(function(p){ return p.permission === 'شئون طلاب' && p.status !== 'موقوف'; })[0];
  if (perm) {
    var o = perm.detailsObj || {}; stage = o.stage || v42StageOfDept_(perm.details) || '';
    if (o.schools && o.schools.length) { schools = {}; o.schools.forEach(function(x){ schools[String(x)] = 1; }); }
  }
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), row = null, nid = v24DigitsLocalV31_(s.username || '');
  emp.rows.forEach(function(r){ if ((s.employeeId && schoolV31Val_(r, ei, 'employeeId') === s.employeeId) || (nid && v24DigitsLocalV31_(schoolV31Val_(r, ei, 'الرقم_القومي')) === nid)) row = row || r; });
  var job = row ? schoolV31Val_(row, ei, 'الوظيفة_الإشرافية') : '';
  if (!perm && job !== 'رئيس قسم' && job !== 'وكيل قسم') throw new Error('هذا التبويب لرؤساء الأقسام وأصحاب صلاحية «شئون طلاب» فقط.');
  if (!stage && row) stage = v42StageOfDept_(schoolV31Val_(row, ei, 'القسم') || schoolV31Val_(row, ei, 'مادة_التدريس'));
  var tech = stage === 'ثانوي فني' ? true : (stage === 'ثانوي' ? false : null);
  var data = stage === 'ثانوي فني' ? 'ثانوي' : stage;
  if (data && V60_STAGE_ORDER[data] == null) data = '';
  return {stage: data, tech: tech, schools: schools, label: stage || 'كل المراحل', noStage: !stage};
}
function v60Filter_(scope){
  if (!scope) return function(){ return true; };
  var types = scope.tech === null ? null : v42SchoolTypes_();
  return function(sid, stage){
    if (scope.stage && stage && stage !== scope.stage && stage !== 'الكل') return false;
    if (scope.schools && !scope.schools[sid]) return false;
    if (types) { var t = (types[sid] || {}).type || ''; if (scope.tech ? !/فني/.test(t) : /فني/.test(t)) return false; }
    return true;
  };
}

/* ---------- الإحصاء ---------- */
function v60Summary_(filter){
  var L = v60Limits_(), names = v42SchoolNames_(), d = v24Data_('13_شؤون_الطلاب'), ix = schoolV31Idx_(d.headers);
  var K = ['total', 'male', 'female', 'classes', 'muslim', 'christian', 'newS', 'old', 'disabled'];
  var COL = {total: 'إجمالي الطلاب', male: 'ذكور', female: 'إناث', classes: 'عدد الفصول/القاعات', muslim: 'مسلمون', christian: 'مسيحيون', newS: 'مستجدون', old: 'باقون', disabled: 'عدد_ذوي_الإعاقة'};
  function z(){ var o = {}; K.forEach(function(k){ o[k] = 0; }); return o; }
  var per = {}, grade = {}, stage = {}, tot = z(), rows = []; var notEntered = 0, notEnteredBy = {};
  d.rows.forEach(function(r){
    var sid = schoolV31Val_(r, ix, 'schoolId'), st = schoolV31Val_(r, ix, 'المرحلة'), gr = schoolV31Val_(r, ix, 'الصف/المستوى');
    if (!sid || !filter(sid, st)) return;
    var n = {}; K.forEach(function(k){ n[k] = v36Int_(schoolV31Val_(r, ix, COL[k])) || 0; });
    if (String(schoolV31Val_(r, ix, 'إجمالي الطلاب') || '').trim() === '') { notEntered++; (notEnteredBy[sid] = (notEnteredBy[sid] || 0) + 1); }
    var p = per[sid] = per[sid] || (function(){ var o = z(); o.schoolId = sid; o.name = names[sid] || schoolV31Val_(r, ix, 'اسم المدرسة'); o.maxDens = 0; o.over = 0; o.statuses = {}; return o; })();
    var g = grade[st + '|' + gr] = grade[st + '|' + gr] || (function(){ var o = z(); o.stage = st; o.grade = gr; o.maxDens = 0; return o; })();
    var sg = stage[st] = stage[st] || (function(){ var o = z(); o.stage = st; return o; })();
    K.forEach(function(k){ p[k] += n[k]; g[k] += n[k]; sg[k] += n[k]; tot[k] += n[k]; });
    var stt = schoolV31Val_(r, ix, 'حالة الإحصاء') || '—'; p.statuses[stt] = (p.statuses[stt] || 0) + 1;
    if (n.classes && n.total) {
      var dn = v60Dens_(n.total, n.classes);
      if (dn > p.maxDens) p.maxDens = dn; if (dn > g.maxDens) g.maxDens = dn; if (dn > L.max) p.over++;
      rows.push({schoolId: sid, school: p.name, stage: st, grade: gr, total: n.total, classes: n.classes, dens: dn});
    }
  });
  function fin(o){ o.dens = v60Dens_(o.total, o.classes); o.repeatPct = v60Pct_(o.old, o.total); return o; }
  var schools = Object.keys(per).map(function(k){ return fin(per[k]); }).sort(function(a, b){ return a.name.localeCompare(b.name, 'ar'); });
  var byGrade = Object.keys(grade).map(function(k){ return fin(grade[k]); }).sort(v60SortGrade_);
  var byStage = Object.keys(stage).map(function(k){ return fin(stage[k]); }).sort(v60SortGrade_);
  rows.sort(function(a, b){ return b.dens - a.dens; });
  schools.forEach(function(x){ x.notEntered = notEnteredBy[x.schoolId] || 0; });
  return {notEntered: notEntered, limits: L, schools: schools, byGrade: byGrade, byStage: byStage, totals: fin(tot),
    dense: rows.filter(function(x){ return x.dens >= L.warn; }).slice(0, 400),
    overCount: rows.filter(function(x){ return x.dens > L.max; }).length, warnCount: rows.filter(function(x){ return x.dens >= L.warn && x.dens <= L.max; }).length, gradeRows: rows.length,
    repeaters: schools.filter(function(x){ return x.repeatPct > L.repeat; }).sort(function(a, b){ return b.repeatPct - a.repeatPct; })};
}

/* ---------- الغياب ---------- */
function v60SchoolDays_(from, to){
  var hol = {}; v56Holidays_().forEach(function(x){ hol[x[0]] = 1; });
  var a = v35Date_(from), b = v35Date_(to), out = []; if (!a || !b) return out;
  var d = new Date(Number(a.slice(0, 4)), Number(a.slice(5, 7)) - 1, Number(a.slice(8, 10))), e = new Date(Number(b.slice(0, 4)), Number(b.slice(5, 7)) - 1, Number(b.slice(8, 10)));
  for (var i = 0; d <= e && i < 400; i++) {
    var k = d.getFullYear() + '-' + v56Pad_(d.getMonth() + 1) + '-' + v56Pad_(d.getDate());
    if (V56_WEEKEND.indexOf(d.getDay()) < 0 && !hol[k]) out.push(k);
    d.setDate(d.getDate() + 1);
  }
  return out;
}
/** آخر n يوم دراسي حتى اليوم (شامل). */
function v60LastDays_(n){
  var t = v40Today_(), d = new Date(Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 1, Number(t.slice(8, 10))); d.setDate(d.getDate() - n * 2 - 10);
  var from = d.getFullYear() + '-' + v56Pad_(d.getMonth() + 1) + '-' + v56Pad_(d.getDate()), all = v60SchoolDays_(from, t);
  return all.slice(-n);
}
function v60Absence_(from, to, filter){
  from = v35Date_(from); to = v35Date_(to); if (!from || !to) throw new Error('حدد تاريخ البداية والنهاية.');
  if (from > to) { var t = from; from = to; to = t; }
  var days = v60SchoolDays_(from, to), dayOk = {}; days.forEach(function(x){ dayOk[x] = 1; });
  var names = v42SchoolNames_(), stu = v24Data_('13_شؤون_الطلاب'), sti = schoolV31Idx_(stu.headers);
  var gTot = {}, sTot = {}, stTot = {};   // مقيدون: صف / مدرسة / مرحلة‑مدرسة
  stu.rows.forEach(function(r){
    var sid = schoolV31Val_(r, sti, 'schoolId'), st = schoolV31Val_(r, sti, 'المرحلة'), gr = schoolV31Val_(r, sti, 'الصف/المستوى'); if (!sid || !filter(sid, st)) return;
    var n = v36Int_(schoolV31Val_(r, sti, 'إجمالي الطلاب')) || 0;
    gTot[sid + '|' + st + '|' + gr] = n; sTot[sid] = (sTot[sid] || 0) + n; stTot[sid + '|' + st] = (stTot[sid + '|' + st] || 0) + n;
  });
  var dl = v56Read_(V40_DAILY_SHEET), di = dl.ix;
  var bySch = {}, byGr = {}, byDay = {}, recDay = {};   // recDay[sid|date] = {absent, students}
  dl.vals.forEach(function(r){
    if (schoolV31Val_(r, di, 'النوع') !== 'صف') return;
    var date = v35Date_(schoolV31Val_(r, di, 'التاريخ')); if (!dayOk[date]) return;
    var sid = schoolV31Val_(r, di, 'schoolId'), st = schoolV31Val_(r, di, 'المرحلة'), gr = schoolV31Val_(r, di, 'الصف_المستوى');
    if (!sid || sTot[sid] == null || !filter(sid, st)) return;
    var a = Number(v24DigitsLocalV31_(schoolV31Val_(r, di, 'عدد_الغياب'))) || 0;
    var base = gr === 'الكل' ? (stTot[sid + '|' + st] || 0) : (gTot[sid + '|' + st + '|' + gr] || 0);
    var k = sid + '|' + date, x = recDay[k] = recDay[k] || {absent: 0, students: 0};
    x.absent += a; x.students += base;
    var gk = st + '|' + gr, g = byGr[gk] = byGr[gk] || {stage: st, grade: gr === 'الكل' ? 'الكل' : gr, absent: 0, studentDays: 0, days: {}};
    g.absent += a; g.studentDays += base; g.days[date] = 1;
  });
  // في المرحلة الكاملة لا نعرف المقيدين على مستوى المدرسة إلا من المسجَّل؛ نستخدم إجمالي المدرسة لو سجلت كل المراحل.
  Object.keys(recDay).forEach(function(k){
    var p = k.split('|'), sid = p[0], date = p[1], x = recDay[k];
    var s = bySch[sid] = bySch[sid] || {schoolId: sid, name: names[sid] || sid, students: sTot[sid] || 0, daysRecorded: 0, absent: 0, studentDays: 0, maxPct: 0, maxDate: ''};
    s.daysRecorded++; s.absent += x.absent; s.studentDays += x.students;
    var pc = v60Pct_(x.absent, x.students); if (pc > s.maxPct) { s.maxPct = pc; s.maxDate = date; }
    var dd = byDay[date] = byDay[date] || {date: date, schools: 0, absent: 0, students: 0}; dd.schools++; dd.absent += x.absent; dd.students += x.students;
  });
  var nSchools = Object.keys(sTot).filter(function(k){ return sTot[k] > 0; });
  var schools = nSchools.map(function(sid){
    var s = bySch[sid] || {schoolId: sid, name: names[sid] || sid, students: sTot[sid], daysRecorded: 0, absent: 0, studentDays: 0, maxPct: 0, maxDate: ''};
    s.compliance = v60Pct_(s.daysRecorded, days.length); s.avgPct = v60Pct_(s.absent, s.studentDays); s.missingDays = days.length - s.daysRecorded; return s;
  }).sort(function(a, b){ return b.avgPct - a.avgPct || a.name.localeCompare(b.name, 'ar'); });
  var grades = Object.keys(byGr).map(function(k){ var g = byGr[k]; g.daysCount = Object.keys(g.days).length; delete g.days; g.avgPct = v60Pct_(g.absent, g.studentDays); return g; }).sort(v60SortGrade_);
  var daily = days.map(function(dt){ var x = byDay[dt] || {date: dt, schools: 0, absent: 0, students: 0}; x.pct = v60Pct_(x.absent, x.students); x.compliance = v60Pct_(x.schools, nSchools.length); return x; });
  var A = 0, SD = 0, REC = 0; schools.forEach(function(s){ A += s.absent; SD += s.studentDays; REC += s.daysRecorded; });
  return {from: from, to: to, days: days.length, schoolsCount: nSchools.length, schools: schools, grades: grades, daily: daily,
    totals: {absent: A, avgPct: v60Pct_(A, SD), compliance: v60Pct_(REC, days.length * nSchools.length), avgDaily: days.length ? Math.round(A / Math.max(1, daily.filter(function(x){ return x.schools; }).length)) : 0}};
}
/** حالة تسجيل اليوم لكل مدرسة في النطاق. */
function v60Today_(filter){
  var today = v40Today_(), isDay = v60SchoolDays_(today, today).length > 0, r = v60Absence_(today, today, filter);
  var rep = r.schools.filter(function(s){ return s.daysRecorded; });
  return {date: today, schoolDay: isDay, total: r.schools.length, reported: rep.length, absent: r.totals.absent, pct: r.totals.avgPct,
    missing: isDay ? r.schools.filter(function(s){ return !s.daysRecorded; }).map(function(s){ return s.name; }).sort(function(a, b){ return a.localeCompare(b, 'ar'); }) : [],
    top: rep.sort(function(a, b){ return b.avgPct - a.avgPct; }).slice(0, 10).map(function(s){ return {name: s.name, absent: s.absent, pct: s.avgPct}; })};
}
function v60Dash_(filter, label){
  var sum = v60Summary_(filter), today = v60Today_(filter), last = v60LastDays_(7), week = last.length ? v60Absence_(last[0], last[last.length - 1], filter) : null;
  return {success: true, label: label || '', summary: sum, today: today, week: week ? {from: week.from, to: week.to, days: week.days, totals: week.totals,
    top: week.schools.filter(function(s){ return s.daysRecorded; }).slice(0, 10).map(function(s){ return {name: s.name, avgPct: s.avgPct, days: s.daysRecorded}; }),
    lowCompliance: week.schools.filter(function(s){ return s.compliance < 100; }).sort(function(a, b){ return a.compliance - b.compliance; }).slice(0, 15).map(function(s){ return {name: s.name, compliance: s.compliance, missing: s.missingDays}; })} : null};
}

/* ---------- نقاط الدخول ---------- */
function adminStudentsDashV60(token){ v35Admin_(token); return v60Dash_(v60Filter_(null), 'كل المدارس'); }
function adminAbsenceReportV60(token, from, to){ v35Admin_(token); var r = v60Absence_(from, to, v60Filter_(null)); r.success = true; return r; }
function deptStudentsDashV60(token){
  var sc = v60DeptScope_(token);
  if (sc.noStage && !sc.schools) return {success: true, note: 'قسمك غير مرتبط بمرحلة دراسية معروفة، فلا تتوفر إحصائيات آلية له. اطلب من الإدارة تحديد المرحلة في صلاحية «شئون طلاب».', label: sc.label};
  var r = v60Dash_(v60Filter_(sc), sc.label); return r;
}
function deptAbsenceReportV60(token, from, to){ var sc = v60DeptScope_(token); var r = v60Absence_(from, to, v60Filter_(sc)); r.success = true; r.label = sc.label; return r; }
function schoolAbsenceReportV60(token, from, to){
  var s = schoolV33Session_(token), sid = String(s.schoolId);
  var r = v60Absence_(from, to, function(x){ return String(x) === sid; }); r.success = true; r.school = s.school || ''; return r;
}
function schoolDailyStatusV60(token){
  var s = schoolV33Session_(token), sid = String(s.schoolId), today = v40Today_();
  if (!v60SchoolDays_(today, today).length) return {success: true, schoolDay: false, recorded: false, date: today};
  var t = v60Absence_(today, today, function(x){ return String(x) === sid; }), me = t.schools[0];
  return {success: true, schoolDay: true, date: today, recorded: !!(me && me.daysRecorded), windowOpen: v40DailyWindowOpen_(), absent: me ? me.absent : 0, pct: me ? me.avgPct : 0};
}
