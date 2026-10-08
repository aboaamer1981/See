/**
 * V7.63b — بوابة الموظف: تبويبات العرض (قراءة فقط) + استثناء فتح الملفات من الإدارة.
 *  - وضعي الوظيفي / جهات عملي: العلاقات الحالية والسابقة + الحركات (بدون قائم/غير قائم).
 *  - النصاب والحصص / حصصي: الجدول الفعلي (الجدول 1) + فوق النصاب (الجدول 2 فقط) بنفس قواعد V7.61.
 *  - بطاقتي: بيانات بطاقة الموظف للطباعة.
 * لا يكتب أي شيء إلا adminSetFilesOverrideV105 (عمود في ورقة المتابعة، تحت قفل).
 */
var V105_CUR_REL = /^(إجازة|معار|منتدب)/;

function v105Names_(){ return v42SchoolNames_(); }
function v105IsCurrent_(st){ st = String(st || '').trim(); return v36ActiveRel_(st) || V105_CUR_REL.test(st); }

/** V7.65: هل للشخص جدول أسبوعي (أو بيانات حصص شهرية لمعلم الحصة)؟ — لإظهار تبويب النصاب/حصصي فقط عند وجود محتوى. */
function v105HasTt_(s){
  var hrp = s.role === 'معلم حصة', key = v96Key_(hrp ? 'H' : 'E', s.employeeId);
  try { if (v96Has_(V96_TT)) { var t = v56Read_(V96_TT), ix = t.ix; for (var i = 0; i < t.vals.length; i++) if (String(t.vals[i][ix.personKey]) === key) return true; } } catch (e) { console.error('v105HasTt_: ' + e.message); }
  if (hrp) { try { var md = v24Data_('07_بيانات_معلمي_الحصة_الشهرية'), mi = v42Idx_(md.headers); return md.rows.some(function(x){ return v42Val_(x, mi, 'hrpId') === s.employeeId; }); } catch (e2) {} }
  return false;
}
/** وضعي الوظيفي (أساسي) / جهات عملي (معلم حصة). */
function staffJobV105(token){
  var s = v104AnySession_(token), names = v105Names_(), cur = [], old = [];
  if (s.role === 'معلم حصة') {
    var h = v104FindHrpByNid_(s.username); if (!h) throw new Error('بيانات معلم الحصة غير موجودة.');
    var rd = v24Data_('06_علاقات_معلمي_الحصة'), ri = v42Idx_(rd.headers);
    rd.rows.forEach(function(x){
      if (v42Val_(x, ri, 'hrpId') !== s.employeeId) return;
      var st = v42Val_(x, ri, 'الحالة'), o = {school: names[v42Val_(x, ri, 'schoolId')] || v42Val_(x, ri, 'schoolId'), type: v42Val_(x, ri, 'نوع_العلاقة') || 'معلم حصة', periods: v42Val_(x, ri, 'عدد_الحصص_المطلوب'), days: v42Val_(x, ri, 'أيام_الندب_الجزئي'), start: v42Val_(x, ri, 'تاريخ_البداية'), end: v42Val_(x, ri, 'تاريخ_النهاية')};
      if (v105IsCurrent_(st)) cur.push(o); else if (!/^معلقة/.test(st)) old.push(o);
    });
    return {success: true, kind: 'hrp', info: {'الفئة': v42Val_(h.row, h.idx, 'نوع_الفئة'), 'مادة التدريس': v42Val_(h.row, h.idx, 'مادة_التدريس'), 'المدرسة الأصلية': names[v42Val_(h.row, h.idx, 'originalSchoolId')] || ''}, current: cur, history: old, moves: []};
  }
  var b = v42FindBasicByNid_(s.username); if (!b) throw new Error('بيانات الموظف غير موجودة.');
  var r = b.row, i = b.idx, eid = v42Val_(r, i, 'employeeId');
  var rel = v24Data_('04_علاقات_المدارس'), qi = v42Idx_(rel.headers);
  rel.rows.forEach(function(x){
    if (v42Val_(x, qi, 'employeeId') !== eid) return;
    var st = v42Val_(x, qi, 'الحالة'), o = {school: names[v42Val_(x, qi, 'schoolId')] || v42Val_(x, qi, 'schoolId'), type: v102RelLabel_(v42Val_(x, qi, 'نوع_العلاقة'), st, v42Val_(x, qi, 'ملاحظات')), days: v42Val_(x, qi, 'أيام_الندب_الجزئي'), periods: v42Val_(x, qi, 'حصص_الندب_الجزئي'), start: v42Val_(x, qi, 'تاريخ_البداية'), end: v42Val_(x, qi, 'تاريخ_النهاية')};
    if (v105IsCurrent_(st)) cur.push(o); else if (!/^معلقة/.test(st)) old.push(o);
  });
  var moves = [];
  try { var mv = v24Data_('06_حركة_العامل'), mi = v42Idx_(mv.headers);
    mv.rows.forEach(function(x){ if (v42Val_(x, mi, 'employeeId') !== eid) return; moves.push({type: v42Val_(x, mi, 'نوع_الحركة'), from: names[v42Val_(x, mi, 'من_مدرسة')] || v42Val_(x, mi, 'من_مدرسة'), to: names[v42Val_(x, mi, 'إلى_مدرسة')] || v42Val_(x, mi, 'إلى_مدرسة') || v42Val_(x, mi, 'الجهة'), start: v42Val_(x, mi, 'تاريخ_البداية'), end: v42Val_(x, mi, 'تاريخ_النهاية'), decision: v42Val_(x, mi, 'رقم_القرار'), decisionDate: v42Val_(x, mi, 'تاريخ_القرار')}); });
  } catch (e) { console.error('staffJobV105 moves: ' + e.message); }
  var info = {};
  [['المسمى الوظيفي', 'المسمى_الوظيفي'], ['الوظيفة الإشرافية', 'الوظيفة_الإشرافية'], ['مادة التدريس', 'مادة_التدريس'], ['نوع التعليم', 'نوع التعليم'], ['الدرجة المالية', 'الدرجة_المالية'], ['نظام العمل', 'نظام_العمل'], ['تاريخ التعيين', 'تاريخ_التعيين'], ['تاريخ بدء العمل', 'تاريخ_بدء_العمل']].forEach(function(p){ info[p[0]] = v42Val_(r, i, p[1]); });
  info['جهة العمل الأصلية'] = names[v42Val_(r, i, 'originalSchoolId')] || '';
  return {success: true, kind: 'basic', info: info, current: cur, history: old, moves: moves};
}

/** النصاب والحصص (أساسي) / حصصي (معلم حصة) — قراءة فقط من 25_الجدول_الأسبوعي. */
function staffTimetableV105(token){
  var s = v104AnySession_(token), hrp = s.role === 'معلم حصة', names = v105Names_(), key = v96Key_(hrp ? 'H' : 'E', s.employeeId), per = v42OpenPeriod_(), out = [];
  var q = 0; if (!hrp) { try { var qa = v99AttachQuota_([{employeeId: s.employeeId}]); q = Number(qa[0].quotaWeekly) || 0; } catch (e) { console.error('staffTimetableV105 quota: ' + e.message); } }
  var ab = {}; try { ab = v96Maps_(per.year, per.month).ab; } catch (e) {}
  var lim = hrp ? v107Hrp_(s.employeeId) : v107Emp_(s.employeeId);   // V7.65
  if (v96Has_(V96_TT)) {
    var t = v56Read_(V96_TT), ix = t.ix;
    t.vals.forEach(function(r){
      if (String(r[ix.personKey]) !== key) return;
      var sid = String(r[ix.schoolId]), days = {}, T = 0;
      V96_DAYS.forEach(function(d){ var v = Number(r[ix[d]]) || 0; days[d] = v; T += v; });
      var ot = hrp ? null : v96Ot_(ix['حصص_فوق_النصاب'] != null ? r[ix['حصص_فوق_النصاب']] : ''), otSum = 0;
      if (ot) V96_DAYS.forEach(function(d){ otSum += Number(ot[d]) || 0; });
      var nd = {}; try { nd = JSON.parse(String(ix['أيام_الندب'] != null ? r[ix['أيام_الندب']] : '') || '{}') || {}; } catch (e) { nd = {}; }
      var month = 0; if (ot) { try { month = Number(v96OverMonth_(ot, ab[key + '|' + sid] || ab[key] || {}, per.year, per.month, lim.om)) || 0; } catch (e) { month = 0; } }
      out.push({school: names[sid] || sid, days: days, total: T, ot: ot || {}, otWeek: Math.min(lim.ow, otSum), excess: hrp ? 0 : v96Excess_(T, q, lim.ow), otMonth: month, lim: hrp ? {hw: lim.hw, hm: lim.hm} : {ow: lim.ow, om: lim.om}, nd: nd, savedAt: ix['وقت_الحفظ'] != null ? String(r[ix['وقت_الحفظ']] || '') : ''});
    });
  }
  var monthly = [];
  if (hrp) {
    try { var md = v24Data_('07_بيانات_معلمي_الحصة_الشهرية'), mi = v42Idx_(md.headers);
      md.rows.forEach(function(x){ if (v42Val_(x, mi, 'hrpId') !== s.employeeId) return; monthly.push({year: Number(v42Val_(x, mi, 'السنة')) || 0, month: Number(v42Val_(x, mi, 'الشهر')) || 0, school: names[v42Val_(x, mi, 'schoolId')] || v42Val_(x, mi, 'schoolId'), periods: v42Val_(x, mi, 'الحصص_الفعلية'), absent: ['عارضة', 'اعتيادي', 'مرضي'].reduce(function(a, k){ return a + (Number(v42Val_(x, mi, k)) || 0); }, 0), mission: Number(v42Val_(x, mi, 'مأمورية')) || 0, status: v42Val_(x, mi, 'حالة_الاعتماد') || v42Val_(x, mi, 'حالة_الإدخال')}); });
      monthly.sort(function(a, b){ return (b.year * 100 + b.month) - (a.year * 100 + a.month); });
    } catch (e) { console.error('staffTimetableV105 monthly: ' + e.message); }
  }
  return {success: true, kind: hrp ? 'hrp' : 'basic', days: V96_DAYS, quotaWeekly: q, period: per, rows: out, monthly: monthly.slice(0, 12)};
}

/** بطاقتي — بيانات البطاقة فقط. */
function staffCardV105(token){
  var s = v104AnySession_(token), names = v105Names_(), schools = [];
  if (s.role === 'معلم حصة') {
    var h = v104FindHrpByNid_(s.username); if (!h) throw new Error('بيانات معلم الحصة غير موجودة.');
    try { var rd = v24Data_('06_علاقات_معلمي_الحصة'), ri = v42Idx_(rd.headers); rd.rows.forEach(function(x){ if (v42Val_(x, ri, 'hrpId') === s.employeeId && v36ActiveRel_(v42Val_(x, ri, 'الحالة'))) { var n = names[v42Val_(x, ri, 'schoolId')] || ''; if (n && schools.indexOf(n) < 0) schools.push(n); } }); } catch (e) {}
    return {success: true, card: {name: v42Val_(h.row, h.idx, 'الاسم'), nationalId: v42Val_(h.row, h.idx, 'الرقم_القومي'), code: '', job: v42Val_(h.row, h.idx, 'نوع_الفئة') || 'معلم حصة', supervisoryJob: '', subject: v42Val_(h.row, h.idx, 'مادة_التدريس'), school: names[v42Val_(h.row, h.idx, 'originalSchoolId')] || '', schools: schools, kind: 'معلم حصة'}};
  }
  var b = v42FindBasicByNid_(s.username); if (!b) throw new Error('بيانات الموظف غير موجودة.');
  var r = b.row, i = b.idx, eid = v42Val_(r, i, 'employeeId');
  try { var rel = v24Data_('04_علاقات_المدارس'), qi = v42Idx_(rel.headers); rel.rows.forEach(function(x){ if (v42Val_(x, qi, 'employeeId') === eid && v36ActiveRel_(v42Val_(x, qi, 'الحالة'))) { var n = names[v42Val_(x, qi, 'schoolId')] || ''; if (n && schools.indexOf(n) < 0) schools.push(n); } }); } catch (e) {}
  return {success: true, card: {name: v42Val_(r, i, 'الاسم'), nationalId: v42Val_(r, i, 'الرقم_القومي'), code: v42Val_(r, i, 'كود_الموظف'), job: v42Val_(r, i, 'المسمى_الوظيفي'), supervisoryJob: v42Val_(r, i, 'الوظيفة_الإشرافية'), subject: v42Val_(r, i, 'مادة_التدريس'), school: names[v42Val_(r, i, 'originalSchoolId')] || '', schools: schools, kind: v42Val_(r, i, 'نوع التعليم')}};
}

/** استثناء من الإدارة: فتح «ملفاتي» لموظف قبل «تحديث بياناتي» (أو إلغاؤه). */
function adminSetFilesOverrideV105(token, nid, on){
  v104Admin_(token);
  var n = v104Nid_(nid), b = v42FindBasicByNid_(n), h = b ? null : v104FindHrpByNid_(n);
  if (!b && !h) throw new Error('الموظف غير موجود.');
  var s = b ? {employeeId: v42Val_(b.row, b.idx, 'employeeId'), username: n, name: v42Val_(b.row, b.idx, 'الاسم')} : {employeeId: v42Val_(h.row, h.idx, 'hrpId'), username: n, name: v42Val_(h.row, h.idx, 'الاسم')};
  var val = on ? 'نعم' : '';
  return v35Lock_(function(){
    var x = v104Find_(s.employeeId), sh = x.sh, hd = x.h, i = x.i, row;
    if (x.row < 2) { row = new Array(hd.length).fill(''); row[i.trackingId] = v42Id_('TRK_'); row[i.employeeId] = s.employeeId; row[i['الرقم_القومي']] = n; row[i['الاسم']] = s.name; row[i['فتح_الملفات_استثناء']] = val; v50A_(sh.appendRow(row)); }
    else v50A_(sh.getRange(x.row, i['فتح_الملفات_استثناء'] + 1).setValue(val));
    v42Audit_(s.employeeId, on ? 'فتح ملفات الموظف استثناءً' : 'إلغاء استثناء فتح الملفات', on ? '' : 'نعم', val, 'admin');
    return {success: true, message: on ? 'تم فتح «ملفاتي» لهذا الموظف استثناءً.' : 'تم إلغاء الاستثناء.'};
  });
}
