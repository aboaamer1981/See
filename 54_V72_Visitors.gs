/** V7.2 — الزائرون:
 *  - «شخص آخر»: قائمة بمن لهم حق زيارة المدارس (سجل التوجيه: حالة_التوجيه نشط) + «آخر» باسم وصفة ورقم قومي اختياري.
 *  - إعداد للإدارة ROUTE_HIDE_FUTURE: المدرسة لا ترى إلا الأيام السابقة، وزوار اليوم بعد الساعة 8 صباحًا، ولا ترى الأيام التالية.
 */
function v72HideFuture_(){ return String(v36GetSetting_('ROUTE_HIDE_FUTURE', 'لا') || 'لا').trim() === 'نعم'; }
function adminRouteVisibilityV72(token, on){
  var a = v35Admin_(token);
  if (on !== undefined && on !== null) { v36SetSetting_('ROUTE_HIDE_FUTURE', on ? 'نعم' : 'لا', 'الزائرون: المدرسة لا ترى إلا الأيام السابقة وزوار اليوم بعد 8 صباحًا'); try { V56_SET_MEMO_ = null; } catch (e) {} schoolV31Log_(v36Actor_(a), 'إعداد ظهور الزائرين للمدارس', 'ROUTE_HIDE_FUTURE', [['القيمة', '', on ? 'نعم' : 'لا']]); }
  return {success: true, on: v72HideFuture_()};
}
/** يلف schoolRouteVisitorsV41 بقيد الظهور. */
function schoolRouteVisitorsV72(token, date){
  var s = schoolV31Session_(token), iso = routeV41Iso_(routeV41Date_(date)), today = v40Today_();
  if (v72HideFuture_()) {
    if (iso > today) return {success: true, date: iso, visitors: [], hidden: 'لا تظهر زيارات الأيام التالية.'};
    if (iso === today) { var hr = Number(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'H')); if (hr < 8) return {success: true, date: iso, visitors: [], hidden: 'تظهر زيارات اليوم بعد الساعة 8 صباحًا.'}; }
  }
  return schoolRouteVisitorsV41(token, date);
}
/** من لهم حق زيارة المدارس (سجل التوجيه النشط). */
function schoolVisitorEligibleV72(token){
  schoolV31Session_(token);
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), out = [];
  emp.rows.forEach(function(r){
    var st = schoolV31Val_(r, ei, 'حالة_التوجيه'); if (!st || /موقوف|غير/.test(st)) return;
    if (schoolV31Val_(r, ei, 'حالة_السجل') === 'غير قائم') return;
    out.push({employeeId: schoolV31Val_(r, ei, 'employeeId'), name: schoolV31Val_(r, ei, 'الاسم'), job: schoolV31Val_(r, ei, 'الوظيفة_الإشرافية') || schoolV31Val_(r, ei, 'المسمى_الوظيفي'), subject: schoolV31Val_(r, ei, 'مادة_التدريس') || schoolV31Val_(r, ei, 'القسم')});
  });
  return {success: true, rows: out.sort(function(a, b){ return String(a.job).localeCompare(String(b.job), 'ar') || a.name.localeCompare(b.name, 'ar'); })};
}
/** زائر من خارج القائمة: اسم + صفة + رقم قومي (اختياري). */
function schoolSaveVisitorOtherV72(token, date, p){
  p = p || {}; var name = String(p.name || '').trim(), title = String(p.title || '').trim(), nid = v24DigitsLocalV31_(p.nid || '');
  if (name.split(/\s+/).filter(Boolean).length < 2) throw new Error('اكتب اسم الزائر (اسمين على الأقل).');
  if (!title) throw new Error('اكتب صفة الزائر.');
  if (nid && !/^\d{14}$/.test(nid)) throw new Error('الرقم القومي 14 رقمًا (أو اتركه فارغًا).');
  var r = schoolSaveVisitorV41(token, date, {name: name, job: title, subject: '', source: 'زائر آخر' + (nid ? ' — ' + nid : '')});
  return r;
}
