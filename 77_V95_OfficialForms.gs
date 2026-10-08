/**
 * V7.45 — الاستمارات الرسمية للصرف 2026 (إدارة صدفا): بيانات إضافية للطباعة فقط (قراءة — لا يكتب أي بيانات).
 * - الدرجة المالية ومادة التدريس لكل عامل في كشف الاستحقاق (تُستدعى من v74AttachAbs_).
 * - كشف معلمي الحصة/المعاش للمدرسة بكل الحالات (معتمد وغير معتمد) — للطباعة قبل الاعتماد مع ختم «غير معتمد».
 */
function v95EmpInfo_(){
  var e = v24Data_('01_الأساسي'), ei = schoolV31Idx_(e.headers), m = {};
  e.rows.forEach(function(r){
    m[String(schoolV31Val_(r, ei, 'employeeId'))] = {grade: String(schoolV31Val_(r, ei, 'الدرجة_المالية') || '').trim(), subject: String(schoolV31Val_(r, ei, 'مادة_التدريس') || '').trim()};
  });
  return m;
}
function v95AttachInfo_(rows, year, month){
  if (!rows || !rows.length) return rows;
  var m = v95EmpInfo_();
  rows.forEach(function(x){ var i = m[String(x.employeeId)] || {}; if (x.grade == null) x.grade = i.grade || ''; if (x.subject == null) x.subject = i.subject || ''; });
  try { v99AttachQuota_(rows); } catch (e9) { console.error('v95AttachInfo_ quota: ' + e9.message); }   // V7.52: النصاب الأسبوعي من جدول النصاب
  if (year && month) v96AttachEmp_(rows, year, month);   // V7.47: الجدول وأيام الغياب
  v97AttachSec_(rows);   // V7.48: الندب الجزئي — العامل يُطبع في مدرسته الأصلية فقط
  if (year && month) { try { v108FormsBasic_(rows, year, month); } catch (e108) { console.error('v95AttachInfo_ sub: ' + e108.message); } }   // V7.67: الإجمالي + غير معتمد
  return rows;
}
/** V7.48: x.partialHost = هذه المدرسة مستضيفة لندب جزئي (لا يُطبع هنا)، x.secs = مدارس الندب الجزئي (أيام/حصص الاتفاق + حصص الشهر الفعلية). */
function v97AttachSec_(rows){
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), names = v42SchoolNames_(), by = {};
  rel.rows.forEach(function(r){
    if (!v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة'))) return;
    var t = String(schoolV31Val_(r, ri, 'نوع_العلاقة') || ''); if (!/منتدب إلينا جزئي/.test(t)) return;
    var eid = String(schoolV31Val_(r, ri, 'employeeId')), sid = String(schoolV31Val_(r, ri, 'schoolId'));
    (by[eid] = by[eid] || []).push({schoolId: sid, school: names[sid] || sid, days: ri['أيام_الندب_الجزئي'] != null ? String(schoolV31Val_(r, ri, 'أيام_الندب_الجزئي') || '') : '', periods: ri['حصص_الندب_الجزئي'] != null ? String(schoolV31Val_(r, ri, 'حصص_الندب_الجزئي') || '') : ''});
  });
  rows.forEach(function(x){
    var l = by[String(x.employeeId)] || [], sid = String(x.schoolId || '');
    x.partialHost = l.some(function(q){ return q.schoolId === sid; });
    x.secs = l.filter(function(q){ return q.schoolId !== sid; }).map(function(q){ var d = (x.schoolsDetail || []).filter(function(z){ return String(z.schoolId) === q.schoolId; })[0]; return {schoolId: q.schoolId, school: q.school, days: q.days, periods: q.periods, done: d ? d['حصص'] : ''}; });
  });
  return rows;
}
/** المدرسة: كل استحقاقات معلمي الحصة/المعاش المحسوبة لهذا الشهر (معتمدة وغير معتمدة) لطباعة الاستمارات الرسمية. */
function schoolHrpFormsV95(token, year, month){
  var s = schoolV31Session_(token), mo = v36ResolveMonth_(year, month), r = v40HrpStatement_(s.schoolId, mo.year, mo.month, false);
  try { v108FormsHrp_(r.rows, mo.year, mo.month); } catch (e108) { console.error('schoolHrpFormsV95 sub: ' + e108.message); }   // V7.67
  r.success = true; r.month = mo; r.schoolId = String(s.schoolId);
  return r;
}
/** V7.52: النصاب الأسبوعي لكل عامل من جدول النصاب (نفس طريقة شاشة الإدخال) — يظهر في الاستمارة حتى قبل حساب الشهر. */
function v99AttachQuota_(rows){
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), by = {}, quotas = v36QuotaTable_();
  emp.rows.forEach(function(r){ by[String(schoolV31Val_(r, ei, 'employeeId'))] = r; });
  rows.forEach(function(x){
    var r = by[String(x.employeeId)]; if (!r) return;
    var w = {job: schoolV31Val_(r, ei, 'المسمى_الوظيفي'), stage: schoolV31Val_(r, ei, 'المرحلة_التعليمية_الأصلية'), supervisor: schoolV31Val_(r, ei, 'مشرف_على_المادة') === 'نعم'};
    var qm = Number(v52QuotaMonthly_(w, quotas)) || 0; x.quotaWeekly = qm ? qm / 4 : '';
  });
  return rows;
}
