/** V6.1 — شئون العاملين: لوحة الإدارة + رئيس القسم/الموجه + مؤشرات المدرسة + القيادات + بلوغ السن + العلاقات اليتيمة.
 *  بلوغ السن: 60 سنة من تاريخ الميلاد (الرقم القومي). المخاطَبون بقانون 155 (أعضاء هيئة التعليم / المسكَّنون على الكادر)
 *  يُمد لهم حتى 31 أغسطس التالي لبلوغ الستين (من يبلغها من 1 سبتمبر حتى 31 أغسطس يخرج 31 أغسطس). غيرهم يخرج يوم بلوغ الستين. */
var V61_RET_AGE = 60;
var V61_FIELDS_ALL = [['الهاتف', 'الهاتف'], ['المسمى_الوظيفي', 'المسمى'], ['تاريخ_التعيين', 'تاريخ التعيين'], ['كود_الموظف', 'كود الموظف'], ['الدرجة_المالية', 'الدرجة']];
/** V6.7: نظام العمل المالي يُطلب فقط لمن له استحقاق (المعلمون الستة + القيادة) — لا يُطلب للأخصائي/الأمين/الإداري. */
var V61_FIELDS_FIN = [['نظام_العمل', 'نظام العمل']];
var V61_FIELDS_TEACHER = [['مادة_التدريس', 'المادة'], ['المرحلة_التعليمية_الأصلية', 'المرحلة']];
var V61_LEAD = {'قيادة أولى': 1, 'قيادة ثانية': 2, 'مدير مدرسة': 1, 'مدير المدرسة': 1, 'وكيل مدرسة': 2, 'وكيل المدرسة': 2, 'قيادة اولى': 1};

function v61Norm_(s){ return String(s || '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim(); }
function v61IsTeacher_(job){ return /معلم|معلمين/.test(String(job || '')); }
function v61Law155_(sifa, group, job){
  var s = v61Norm_(sifa), g = v61Norm_(group);
  if (/غير مسكن/.test(s)) return /هيئه التعليم/.test(g);
  if (/مسكن علي الكادر/.test(s)) return true;
  if (/هيئه التعليم/.test(g)) return true;
  return !g && v61IsTeacher_(job);
}
function v61Ymd_(d){ return d.getFullYear() + '-' + v56Pad_(d.getMonth() + 1) + '-' + v56Pad_(d.getDate()); }
function v61Birth_(nid, birth){
  var n = v24DigitsLocalV31_(nid);
  if (/^[23]\d{13}$/.test(n)) { var y = (n[0] === '2' ? 1900 : 2000) + Number(n.substr(1, 2)), m = Number(n.substr(3, 2)), d = Number(n.substr(5, 2)); var dt = new Date(y, m - 1, d); if (dt.getMonth() === m - 1) return dt; }
  var b = v35Date_(birth); if (b) return new Date(Number(b.slice(0, 4)), Number(b.slice(5, 7)) - 1, Number(b.slice(8, 10)));
  return null;
}
/** {b60, eff, law155, status, days} — status: تجاوز السن | ممدود حتى 31/8 | خلال 6 أشهر | خلال سنة | خلال سنتين | '' */
function v61Retire_(birth, law155, today){
  if (!birth) return null;
  var b60 = new Date(birth.getFullYear() + V61_RET_AGE, birth.getMonth(), birth.getDate());
  var eff = law155 ? new Date(b60.getMonth() >= 8 ? b60.getFullYear() + 1 : b60.getFullYear(), 7, 31) : b60;
  var days = Math.round((eff - today) / 86400000), st = '';
  if (days < 0) st = 'تجاوز السن';
  else if (law155 && b60 <= today) st = 'ممدود حتى 31/8';
  else { var ye = new Date(today.getMonth() >= 8 ? today.getFullYear() + 1 : today.getFullYear(), 7, 31); if (eff <= ye) st = 'خلال العام الدراسي'; }   // V7.2: فقط من يخرج حتى 31/8 القادم
  return {b60: v61Ymd_(b60), eff: v61Ymd_(eff), law155: !!law155, status: st, days: days};
}

/** كل الموظفين القائمين مع مدرستهم الأصلية النشطة (أو originalSchoolId) — مرة واحدة لكل تنفيذ. */
var V61_CACHE_ = null;
function v61Data_(){
  if (V61_CACHE_) return V61_CACHE_;
  var t = v40Today_(), today = new Date(Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 1, Number(t.slice(8, 10)));
  var names = v42SchoolNames_(), emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers);
  var prim = {}, any = {}, fullAt = {};
  rel.rows.forEach(function(r){
    if (!v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة'))) return;
    var eid = schoolV31Val_(r, ri, 'employeeId'), sid = schoolV31Val_(r, ri, 'schoolId'); if (!eid || !sid) return;
    (any[eid] = any[eid] || []).push(sid);
    if (schoolV31Val_(r, ri, 'نوع_العلاقة') === 'أصلي') prim[eid] = sid; else if (schoolV31Val_(r, ri, 'نوع_العلاقة') === 'منتدب إلينا كلي') fullAt[eid] = sid;   // V6.8
  });
  var list = [];
  emp.rows.forEach(function(r){
    if (schoolV31Val_(r, ei, 'حالة_السجل') === 'غير قائم') return;
    var eid = schoolV31Val_(r, ei, 'employeeId'); if (!eid) return;
    var g = function(k){ return schoolV31Val_(r, ei, k); };
    var job = g('المسمى_الوظيفي'), teacher = v61IsTeacher_(job), sid = prim[eid] || fullAt[eid] || g('originalSchoolId') || ((any[eid] || [])[0] || '');
    var fin = !!v67FinKind_(job, g('الوظيفة_الإشرافية')); var miss = []; V61_FIELDS_ALL.concat(fin ? V61_FIELDS_FIN : [], teacher ? V61_FIELDS_TEACHER : []).forEach(function(f){ if (!String(g(f[0]) || '').trim()) miss.push(f[1]); });
    var law = v61Law155_(g('الصفة'), g('المجموعة_النوعية'), job), birth = v61Birth_(g('الرقم_القومي'), g('تاريخ_الميلاد'));
    list.push({eid: eid, name: g('الاسم'), nid: g('الرقم_القومي'), job: job, sup: g('الوظيفة_الإشرافية'), subject: g('مادة_التدريس'), stage: g('المرحلة_التعليمية_الأصلية'),
      system: g('نظام_العمل'), phone: g('الهاتف'), supSubject: g('مشرف_على_المادة') === 'نعم', type: g('نوع التعليم'), teacher: teacher, fin: fin, working: g('قائم_بالعمل') !== 'لا', away: !(any[eid] || []).length, sid: sid, school: names[sid] || '', schools: any[eid] || [], miss: miss,
      ret: v61Retire_(birth, law, today), birth: birth ? v61Ymd_(birth) : ''});
  });
  V61_CACHE_ = {list: list, names: names, today: t};
  return V61_CACHE_;
}
function v61Students_(){
  var d = v24Data_('13_شؤون_الطلاب'), ix = schoolV31Idx_(d.headers), o = {};
  d.rows.forEach(function(r){ var sid = schoolV31Val_(r, ix, 'schoolId'); if (sid) o[sid] = (o[sid] || 0) + (v36Int_(schoolV31Val_(r, ix, 'إجمالي الطلاب')) || 0); });
  return o;
}
function v61Pct_(a, b){ return b ? Math.round(a * 1000 / b) / 10 : 0; }
function v61Count_(arr, fn){ var o = {}; arr.forEach(function(x){ var k = fn(x) || '(فارغ)'; o[k] = (o[k] || 0) + 1; }); return Object.keys(o).map(function(k){ return {k: k, n: o[k]}; }).sort(function(a, b){ return b.n - a.n; }); }
function v61RetList_(arr){
  var ord = {'تجاوز السن': 0, 'ممدود حتى 31/8': 1, 'خلال العام الدراسي': 2};
  return arr.filter(function(x){ return x.ret && x.ret.status; }).sort(function(a, b){ return a.ret.days - b.ret.days; })
    .map(function(x){ return {eid: x.eid, name: x.name, nid: x.nid, school: x.school, job: x.job, birth: x.birth, b60: x.ret.b60, eff: x.ret.eff, law: x.ret.law155 ? '155' : 'عام', status: x.ret.status, ord: ord[x.ret.status]}; });
}

/** الملخص لأي نطاق: filter(x) على سجل الموظف. */
function v61Summary_(filter, opts){
  opts = opts || {};
  // V6.8: العدد = من له علاقة نشطة بالمدرسة (نفس جدول العاملين). من بلا علاقة نشطة (إجازة/ندب خارج الإدارة/ندب كلي لجهة أخرى) يُعرض منفصلًا «خارج المدرسة».
  var D = v61Data_(), all = D.list.filter(filter), arr = all.filter(function(x){ return !x.away; }), awayL = all.filter(function(x){ return x.away; }), stu = v61Students_(), schools = {}, subj = {}, stages = {};
  arr.forEach(function(x){
    var s = schools[x.sid] = schools[x.sid] || {sid: x.sid, name: x.school || (x.sid ? x.sid : '(بلا مدرسة)'), workers: 0, teachers: 0, incomplete: 0, missingCells: 0, cells: 0, first: [], second: [], titleFirst: [], titleSecond: [], retire1y: 0};
    s.workers++; if (x.teacher) s.teachers++; if (x.miss.length) s.incomplete++;
    s.missingCells += x.miss.length; s.cells += V61_FIELDS_ALL.length + (x.fin ? V61_FIELDS_FIN.length : 0) + (x.teacher ? V61_FIELDS_TEACHER.length : 0);
    var L = V61_LEAD[String(x.sup || '').trim()]; if (L === 1) s.first.push(x.name); else if (L === 2) s.second.push(x.name);
    var T = V61_LEAD[String(x.job || '').trim()]; if (T === 1 && L !== 1) s.titleFirst.push({eid: x.eid, name: x.name}); else if (T === 2 && L !== 2) s.titleSecond.push({eid: x.eid, name: x.name});
    if (x.ret && x.ret.status) s.retire1y++;
    if (x.teacher) { var k = x.subject || '(بدون مادة)', st = x.stage || '(بدون مرحلة)'; var o = subj[k] = subj[k] || {subject: k, total: 0, byStage: {}, bySchool: {}}; o.total++; o.byStage[st] = (o.byStage[st] || 0) + 1; o.bySchool[x.sid] = (o.bySchool[x.sid] || 0) + 1; stages[st] = 1; }
  });
  var sl = Object.keys(schools).map(function(k){ var s = schools[k]; s.students = stu[k] || 0; s.ratio = s.teachers ? Math.round(s.students * 10 / s.teachers) / 10 : 0; s.complete = s.cells ? Math.round((1 - s.missingCells / s.cells) * 1000) / 10 : 100; return s; })
    .sort(function(a, b){ return a.name.localeCompare(b.name, 'ar'); });
  var fields = V61_FIELDS_ALL.concat(V61_FIELDS_FIN, V61_FIELDS_TEACHER).map(function(f){ var inAll = V61_FIELDS_ALL.some(function(a){ return a[1] === f[1]; }), inFin = V61_FIELDS_FIN.some(function(a){ return a[1] === f[1]; }); var of = arr.filter(function(x){ return inAll || (inFin ? x.fin : x.teacher); }).length; var m = arr.filter(function(x){ return x.miss.indexOf(f[1]) >= 0; }).length; return {field: f[1], missing: m, of: of, pct: v61Pct_(m, of)}; });
  var ret = v61RetList_(all), cells = 0, mc = 0; sl.forEach(function(s){ cells += s.cells; mc += s.missingCells; });
  var T = v42SchoolTypes_(), realSchools = sl.filter(function(s){ var c = (T[s.sid] || {}).cls || ''; return s.sid && !/ديوان|مجهول/.test(s.name) && /تشغيلي/.test(c); });
  var out = {
    away: awayL.slice(0, 300).map(function(x){ return {name: x.name, job: x.job, school: x.school}; }),
    totals: {away: awayL.length, workers: arr.length, teachers: arr.filter(function(x){ return x.teacher; }).length, incomplete: arr.filter(function(x){ return x.miss.length; }).length, complete: cells ? Math.round((1 - mc / cells) * 1000) / 10 : 100,
      retPassed: ret.filter(function(x){ return x.status === 'تجاوز السن'; }).length, retExt: ret.filter(function(x){ return x.status === 'ممدود حتى 31/8'; }).length,
      ret6: 0, ret1y: ret.filter(function(x){ return x.status === 'خلال العام الدراسي'; }).length,
      noFirst: realSchools.filter(function(s){ return !s.first.length; }).length, noSecond: realSchools.filter(function(s){ return !s.second.length; }).length, schools: realSchools.length},
    schools: sl, fields: fields, retire: ret,
    byJob: v61Count_(arr, function(x){ return x.job; }), bySystem: v61Count_(arr, function(x){ return x.system; }),
    subjects: Object.keys(subj).map(function(k){ return subj[k]; }).sort(function(a, b){ return b.total - a.total; }),
    stages: Object.keys(stages).sort(function(a, b){ return ((V60_STAGE_ORDER[a] == null ? 9 : V60_STAGE_ORDER[a]) - (V60_STAGE_ORDER[b] == null ? 9 : V60_STAGE_ORDER[b])); }),
    leadership: realSchools.filter(function(s){ return !s.first.length || !s.second.length; }).map(function(s){ return {sid: s.sid, name: s.name, first: s.first, second: s.second, titleFirst: s.titleFirst, titleSecond: s.titleSecond}; }),
    today: D.today, success: true};
  if (opts.people) out.people = arr.slice().sort(v72Cmp_).map(function(x){ return {eid: x.eid, name: x.name, nid: x.nid, school: x.school, job: x.job, sup: x.sup, subject: x.subject, stage: x.stage, phone: x.phone, system: x.system, miss: x.miss, ret: x.ret && x.ret.status ? x.ret.status : ''}; })
    .sort(function(a, b){ return a.school.localeCompare(b.school, 'ar') || a.name.localeCompare(b.name, 'ar'); });
  return out;
}

/* ---------- الإدارة ---------- */
function adminWorkersDashV61(token){ v35Admin_(token); var r = v61Summary_(function(){ return true; }); r.label = 'كل المدارس'; r.hrp = v68Hrp_(function(){ return true; }); return r; }
function adminWorkersIncompleteV61(token, sid){
  v35Admin_(token); var D = v61Data_();
  return {success: true, rows: D.list.filter(function(x){ return String(x.sid) === String(sid) && !x.away && x.miss.length; }).map(function(x){ return {name: x.name, nid: x.nid, job: x.job, miss: x.miss}; }).sort(function(a, b){ return a.name.localeCompare(b.name, 'ar'); })};
}

/* ---------- رئيس القسم / الموجه ---------- */
function v61Scope_(token){
  var s = null; try { s = v42Session_(token); } catch (e) {}
  if (!s) s = getSchoolSessionV271(token);
  if (!s) throw new Error('الجلسة غير صالحة أو منتهية. سجّل الدخول من جديد.');
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), row = null, nid = v24DigitsLocalV31_(s.username || '');
  emp.rows.forEach(function(r){ if (row) return; if ((s.employeeId && schoolV31Val_(r, ei, 'employeeId') === s.employeeId) || (nid && v24DigitsLocalV31_(schoolV31Val_(r, ei, 'الرقم_القومي')) === nid)) row = r; });
  if (!row) throw new Error('بيانات الموظف غير موجودة.');
  var g = function(k){ return schoolV31Val_(row, ei, k); }, job = g('الوظيفة_الإشرافية'), dept = g('القسم'), subject = g('مادة_التدريس');
  var perm = (s.permissions || []).filter(function(p){ return p.permission === 'شئون عاملين' && p.status !== 'موقوف'; })[0];
  if (!perm && !/رئيس قسم|وكيل قسم|موجه/.test(job)) throw new Error('هذا التبويب لرؤساء الأقسام والموجهين فقط.');
  var stage = '', subj = '', schools = null;
  if (perm) { var o = perm.detailsObj || {}; stage = o.stage || ''; if (o.schools && o.schools.length) { schools = {}; o.schools.forEach(function(x){ schools[String(x)] = 1; }); } }
  if (!stage && !perm) {
    if (/موجه/.test(job)) { subj = subject; stage = v42StageOfDept_(g('مرحلة_خط_السير')) || ''; }
    else { stage = v42StageOfDept_(dept || subject); if (!stage) subj = dept || subject; }
  }
  if (stage === 'ثانوي فني') stage = 'ثانوي';
  var label = [subj, stage].filter(Boolean).join(' — ') || 'كل المدارس';
  return {stage: stage, subject: subj, schools: schools, label: label};
}
function v61ScopeFilter_(sc){
  var ns = v61Norm_(sc.subject), stTypes = sc.stage ? v42SchoolTypes_() : null;
  return function(x){
    if (sc.schools && !sc.schools[x.sid]) return false;
    if (ns && v61Norm_(x.subject) !== ns) return false;
    if (sc.stage) {
      if (x.stage) return x.stage === sc.stage;
      var t = ((stTypes || {})[x.sid] || {}).type || ''; return t.indexOf(sc.stage === 'ثانوي' ? 'ثانوي' : sc.stage) >= 0;
    }
    return true;
  };
}
function deptWorkersDashV61(token){
  var sc = v61Scope_(token), r = v61Summary_(v61ScopeFilter_(sc), {people: true}); r.label = sc.label; r.scope = sc;
  var ss = {}; (r.schools || []).forEach(function(x){ if (x.sid) ss[x.sid] = 1; }); r.hrp = v68Hrp_(function(sid){ return !!ss[sid]; }); return r;
}

/* ---------- المدرسة ---------- */
function schoolWorkersInsightsV61(token){
  var s = schoolV33Session_(token), sid = String(s.schoolId), D = v61Data_();
  var mine = D.list.filter(function(x){ return String(x.sid) === sid || x.schools.indexOf(sid) >= 0; });
  var per = {}; mine.forEach(function(x){ per[x.eid] = {miss: x.miss, ret: x.ret && x.ret.status ? x.ret : null}; });
  var sum = v61Summary_(function(x){ return String(x.sid) === sid || x.schools.indexOf(sid) >= 0; }), me = sum.schools[0] || {};
  return {success: true, per: per, totals: sum.totals, bySystem: sum.bySystem, retire: sum.retire, students: me.students || 0, ratio: me.ratio || 0,
    subjects: sum.subjects.map(function(x){ return {subject: x.subject, total: x.total}; }), first: me.first || [], second: me.second || [], away: sum.away, hrp: v68Hrp_(function(x){ return String(x) === sid; })};
}

/* ---------- القيادات ---------- */
function v61SchoolWorkers_(sid){ return v61Data_().list.filter(function(x){ return String(x.sid) === String(sid) || x.schools.indexOf(String(sid)) >= 0; }); }
function schoolLeadershipGetV61(token){
  var s = schoolV33Session_(token), w = v61SchoolWorkers_(s.schoolId);
  return {success: true, workers: w.map(function(x){ return {eid: x.eid, name: x.name, job: x.job, sup: x.sup, subject: x.subject}; }).sort(v72Cmp_),
    first: w.filter(function(x){ return V61_LEAD[String(x.sup).trim()] === 1; }).map(function(x){ return x.eid; }),
    second: w.filter(function(x){ return V61_LEAD[String(x.sup).trim()] === 2; }).map(function(x){ return x.eid; })};
}
function v61SetLeadership_(sid, first, seconds, actor){
  var w = v61SchoolWorkers_(sid), mine = {}; w.forEach(function(x){ mine[x.eid] = x; });
  first = String(first || ''); seconds = (seconds || []).map(String).filter(function(e){ return e && e !== first; });
  if (first && !mine[first]) throw new Error('القيادة الأولى المختارة ليست من العاملين بالمدرسة.');
  seconds.forEach(function(e){ if (!mine[e]) throw new Error('أحد المختارين للقيادة الثانية ليس من العاملين بالمدرسة.'); });
  var want = {}; if (first) want[first] = 'قيادة أولى'; seconds.forEach(function(e){ want[e] = 'قيادة ثانية'; });
  var sh = personnelSS_().getSheetByName('01_الأساسي'), h = v36Headers_(sh), ix = schoolV31Idx_(h), col = ix['الوظيفة_الإشرافية'], n = sh.getLastRow() - 1;
  if (col == null) throw new Error('عمود الوظيفة الإشرافية غير موجود.');
  var ids = sh.getRange(2, ix.employeeId + 1, n, 1).getValues(), cur = sh.getRange(2, col + 1, n, 1).getValues(), changes = [], dirty = false;
  ids.forEach(function(r, i){
    var e = String(r[0]); if (!mine[e]) return;
    var old = String(cur[i][0] || '').trim(), isLead = !!V61_LEAD[old], nv = want[e] !== undefined ? want[e] : (isLead ? '' : old);
    if (nv !== old) { cur[i][0] = nv; dirty = true; changes.push([mine[e].name, old, nv]); }
  });
  if (dirty) v50A_(sh.getRange(2, col + 1, n, 1).setValues(cur));
  if (changes.length) schoolV31Log_(actor, 'تحديد القيادة الأولى والثانية', String(sid), changes);
  V61_CACHE_ = null;
  return changes;
}
function schoolLeadershipSaveV61(token, first, seconds){
  var s = schoolV33Session_(token);
  return v35Lock_(function(){ v50Fresh_(); var ch = v61SetLeadership_(s.schoolId, first, seconds, s); return {success: true, message: ch.length ? ('تم تحديث ' + ch.length + ' موظف.') : 'لا توجد تغييرات.', changes: ch}; });
}
/** الإدارة: اعتماد المقترح للمدارس الناقصة — القيادة الأولى فقط لو يوجد صاحب مسمى «قيادة أولى» واحد، والثانية لكل أصحاب مسمى «قيادة ثانية». */
function adminLeadershipSuggestV61(token, apply){
  var a = v35Admin_(token), sum = v61Summary_(function(){ return true; }), plan = [];
  sum.leadership.forEach(function(s){
    var f = !s.first.length && s.titleFirst.length === 1 ? s.titleFirst[0] : null, sec = !s.second.length ? s.titleSecond : [];
    if (f || sec.length) plan.push({sid: s.sid, name: s.name, first: f ? f.name : '', firstEid: f ? f.eid : '', second: sec.map(function(x){ return x.name; }), secondEids: sec.map(function(x){ return x.eid; }), ambiguousFirst: !s.first.length && s.titleFirst.length > 1 ? s.titleFirst.map(function(x){ return x.name; }) : []});
  });
  if (!apply) return {success: true, plan: plan, missing: sum.leadership, message: 'معاينة: ' + plan.length + ' مدرسة يمكن استكمال قيادتها من المسمى الوظيفي.'};
  return v35Lock_(function(){
    v50Fresh_(); V61_CACHE_ = null; var n = 0, actor = v36Actor_(a);
    plan.forEach(function(p){
      var cur = v61SchoolWorkers_(p.sid), keepFirst = cur.filter(function(x){ return V61_LEAD[String(x.sup).trim()] === 1; }).map(function(x){ return x.eid; })[0] || '', keepSecond = cur.filter(function(x){ return V61_LEAD[String(x.sup).trim()] === 2; }).map(function(x){ return x.eid; });
      n += v61SetLeadership_(p.sid, p.firstEid || keepFirst, keepSecond.concat(p.secondEids), actor).length;
    });
    return {success: true, plan: plan, message: 'تم: تحديث ' + n + ' موظف في ' + plan.length + ' مدرسة.'};
  });
}

/* ---------- العلاقات اليتيمة (لموظفين غير موجودين في 01_الأساسي) ---------- */
function adminOrphanRelationsV61(token, apply){
  var a = v35Admin_(token);
  if (!apply) return v61Orphans_(a, false);
  return v35Lock_(function(){ v50Fresh_(); return v61Orphans_(a, true); });
}
function v61Orphans_(a, apply){
  var names = v42SchoolNames_(), emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), ids = {};
  emp.rows.forEach(function(r){ var e = schoolV31Val_(r, ei, 'employeeId'); if (e) ids[e] = 1; });
  var sh = personnelSS_().getSheetByName('04_علاقات_المدارس'), h = v36Headers_(sh), ix = schoolV31Idx_(h), n = sh.getLastRow() - 1, v = n > 0 ? sh.getRange(2, 1, n, h.length).getValues() : [];
  var mv = {}, q = {};
  try { var m = v24Data_('06_حركة_العامل'), mi = schoolV31Idx_(m.headers); m.rows.forEach(function(r){ var e = schoolV31Val_(r, mi, 'employeeId'); if (e) mv[e] = [schoolV31Val_(r, mi, 'نوع_الحركة'), schoolV31Val_(r, mi, 'سبب_الحركة')].filter(Boolean).join(' — '); }); } catch (e) {}
  try { var qq = v24Data_('05_المؤهلات'), qi = schoolV31Idx_(qq.headers); qq.rows.forEach(function(r){ var e = schoolV31Val_(r, qi, 'employeeId'); if (e && !q[e]) q[e] = [schoolV31Val_(r, qi, 'المؤهل'), schoolV31Val_(r, qi, 'التخصص'), schoolV31Val_(r, qi, 'السنة')].filter(Boolean).join(' — '); }); } catch (e) {}
  var list = [], bySchool = {}, today = v40Today_();
  v.forEach(function(r){
    var e = String(r[ix.employeeId] || '').trim(), st = String(r[ix['الحالة']] || '').trim();
    if (!e || ids[e] || !v36ActiveRel_(st) || !r.some(function(x){ return String(x).trim() !== ''; })) return;
    var sid = String(r[ix.schoolId] || ''); bySchool[sid] = (bySchool[sid] || 0) + 1;
    list.push({employeeId: e, school: names[sid] || sid, type: r[ix['نوع_العلاقة']], move: mv[e] || '', qual: q[e] || ''});
    if (apply) { r[ix['الحالة']] = 'غير نشطة'; if (ix['تاريخ_النهاية'] != null) r[ix['تاريخ_النهاية']] = today; if (ix['سبب_الإنهاء'] != null) r[ix['سبب_الإنهاء']] = 'موظف غير موجود في 01_الأساسي — إغلاق تنظيفي V6.1'; }
  });
  if (apply && list.length) {
    v50A_(sh.getRange(2, 1, n, h.length).setValues(v)); V61_CACHE_ = null;
    schoolV31Log_(v36Actor_(a), 'إغلاق علاقات يتيمة (موظف غير موجود)', '04_علاقات_المدارس', [['عدد', '', String(list.length)]]);
  }
  return {success: true, count: list.length, rows: list.slice(0, 600), bySchool: Object.keys(bySchool).map(function(k){ return {school: names[k] || k, n: bySchool[k]}; }).sort(function(a, b){ return b.n - a.n; }),
    withMove: list.filter(function(x){ return x.move; }).length, message: (apply ? 'تم إغلاق ' : 'معاينة: ') + list.length + ' علاقة نشطة لموظفين غير موجودين في 01_الأساسي.'};
}
