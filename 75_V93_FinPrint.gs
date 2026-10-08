/**
 * V7.35 (طباعة V7.4) — تفصيل الغياب (عارضة/اعتيادي/مرضي/مأمورية) وأيام العمل لكل عامل في كشف الاستحقاق،
 * لتظهر في كشف كل نظام مالي مستقل (الاسم، الرقم القومي، النصاب الشهري، الغياب مفصل، عدد التوقيعات، الحصص، المبلغ).
 */
function v74AbsMap_(year, month){
  var rd = v36MonthlyRead_(), ix = rd.ix, out = {};
  rd.vals.forEach(function(r){
    if (Number(r[ix['السنة']]) !== Number(year) || Number(r[ix['الشهر']]) !== Number(month)) return;
    var id = String(r[ix.employeeId]), o = out[id] || (out[id] = {a1: 0, a2: 0, a3: 0, a4: 0, wd: 0});
    o.a1 += Number(r[ix['عارضة']]) || 0; o.a2 += Number(r[ix['اعتيادي']]) || 0; o.a3 += Number(r[ix['مرضي']]) || 0; o.a4 += Number(r[ix['مأمورية']]) || 0;
    if (ix['أيام_العمل_الفعلية'] != null) o.wd = Math.max(o.wd, Number(r[ix['أيام_العمل_الفعلية']]) || 0);
  });
  return out;
}
/** V7.52: تجهيز بيانات التقرير الرسمية حتى لا تعتمد الطباعة على خانات 08_الماليات القديمة/الفارغة. */
function v74AttachReportCalc_(rows, year, month){
  if (!rows || !rows.length) return rows;
  var quotas = v36QuotaTable_(), mo = v36ResolveMonth_(year, month), periodWorkdays = Number(mo.periodWorkdays) || 0;
  rows.forEach(function(x){
    var q = quotas[String(x.job || '') + '|' + String(x.stage || '')];
    if (!q) return;
    var weekly = Number(q.weekly) || 0;
    if (x.supervisor && /^(معلم مساعد|معلم|معلم أول|معلم أول \(أ\)|معلم خبير|كبير معلمين)$/.test(String(x.job || '').trim())) weekly = Math.max(0, weekly - (Number(q.supervisorDeduction) || 0));
    if (x.weekly === '' || x.weekly == null || !Number(x.weekly)) x.weekly = weekly;
    if (x.monthly === '' || x.monthly == null || !Number(x.monthly)) x.monthly = Math.round(weekly * (Number(q.factor) || 4) * 100) / 100;
    x.periodWorkdays = periodWorkdays;
    x.periodWeeks = Math.min(4, Math.max(0, periodWorkdays / 5));
    x.periodQuota = Math.round(weekly * x.periodWeeks * 100) / 100;
  });
  return rows;
}
function v74AttachAbs_(rows, year, month){
  if (!rows || !rows.length) return rows;
  var m = v74AbsMap_(year, month), wd = 0, ms = false;
  try { var e = v56Find_(Number(year), Number(month)); wd = e ? Number(e.workdays) || 0 : 0; } catch (e1) { console.error('v74AttachAbs_ month: ' + e1.message); }
  try { ms = v36GetSetting_('MISSION_COUNTS_AS_ABSENCE', 'لا') === 'نعم'; } catch (e2) { console.error('v74AttachAbs_ setting: ' + e2.message); }
  rows.forEach(function(x){
    var a = m[String(x.employeeId)] || {a1: 0, a2: 0, a3: 0, a4: 0, wd: 0};
    x.abs = {'عارضة': a.a1, 'اعتيادي': a.a2, 'مرضي': a.a3, 'مأمورية': a.a4, total: a.a1 + a.a2 + a.a3 + (ms ? a.a4 : 0)};
    x.workdays = a.wd || wd;
  });
  try { v95AttachInfo_(rows, year, month); } catch (e3) { console.error('v74AttachAbs_ info: ' + e3.message); }   // V7.45: الدرجة والمادة للاستمارات الرسمية
  return rows;
}
