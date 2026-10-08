/**
 * V7.0 — حركة العاملين:
 * - إلغاء طلب نقل/ندب من المدرسة المُبادِرة طالما لم تبت فيه المدرسة الأخرى (الحالة «ملغي»).
 * - طلبات معلمي الحصة/المعاش تظهر في «طلبات النقل/الندب» للمدرستين، وتُنفَّذ عند الموافقة على علاقات الحصة.
 * - تفاصيل معلم الحصة/المعاش (قراءة).
 */
function schoolCancelMoveV70(token, requestId){
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  return v35Lock_(function(){
    var rq = v40ReqFind_(requestId), v = rq.vals, ix = rq.ix;
    if (v[ix['الحالة']] !== 'مفتوح') throw new Error('لا يمكن الإلغاء — الطلب «' + v[ix['الحالة']] + '».');
    if (String(v[ix['مُبادر']]) !== String(s.schoolId)) throw new Error('الإلغاء للمدرسة التي أرسلت الطلب فقط.');
    v50A_(rq.sh.getRange(rq.row, ix['الحالة'] + 1).setValue('ملغي'));
    if (String(v[ix['نوع_الطلب']]) === V92_HRP_ADD_REQUEST) {   // V7.35: سحب طلب إضافة معلم حصة ⇒ السجل «ملغي» (يمكن إعادة طلبه لاحقًا)
      var hr = v40HrpRow_(v[ix.employeeId]);
      if (hr.ix['حالة_السجل'] != null) v50A_(hr.sh.getRange(hr.row, hr.ix['حالة_السجل'] + 1).setValue('ملغي — سحبت المدرسة طلب الإضافة'));
      v50Invalidate_(V40_HRP_SHEET);
    }
    try { v50A_(rq.sh.getRange(rq.row, ix['تاريخ_الرد'] + 1).setValue(new Date())); v50A_(rq.sh.getRange(rq.row, ix['المستخدم_الراد'] + 1).setValue((s.username || s.school) + ' (إلغاء المبادر)')); } catch (e) {}
    v50Invalidate_(V40_REQ_SHEET);
    schoolV31Log_(s, 'إلغاء طلب ' + v[ix['نوع_الطلب']], v[ix.employeeId], [['الطلب', '', requestId]]);
    return {success: true, message: 'تم إلغاء الطلب.'};
  });
}

/** تنفيذ طلب حركة معلم حصة/معاش بعد الموافقة. */
function v70ApplyHrpMove_(v, ix){
  var hrpId = v[ix.employeeId], from = v[ix.fromSchoolId], to = v[ix.toSchoolId], type = v[ix['نوع_الطلب']];
  var sh = v40HrpRelSheet_(), rri = schoolV31Idx_(v36Headers_(sh));
  // يضمن وجود أعمدة الندب الجزئي في علاقة معلمي الحصة.
  if (rri[V68_DAYS] == null) { schoolEnsureWorkerColumnV40_(sh, V68_DAYS); schoolEnsureWorkerColumnV40_(sh, V68_PER); rri = schoolV31Idx_(v36Headers_(sh)); }
  var act = v40HrpActiveRels_(hrpId), atFrom = act.filter(function(x){ return String(x.r[rri.schoolId]) === String(from); })[0];
  if (!atFrom) throw new Error('العلاقة الأصلية لم تعد نشطة؛ لا يمكن تنفيذ الحركة.');
  var current = Number(atFrom.r[rri['عدد_الحصص_المطلوب']]) || 0;
  var per = ix[V68_PER] != null ? (Number(v[ix[V68_PER]]) || 0) : 0;
  var days = ix[V68_DAYS] != null ? (Number(v[ix[V68_DAYS]]) || 0) : 0;
  if (type === 'نقل' || type === 'ندب كلي') {
    // الكلي: تنتقل كل الحصص إلى المدرسة الجديدة، ولا يبقى للمدرسة الأصلية علاقة نشطة.
    v50A_(sh.getRange(atFrom.n, rri['الحالة'] + 1).setValue('غير نشطة'));
    v50A_(sh.getRange(atFrom.n, rri['تاريخ_النهاية'] + 1).setValue(new Date()));
    v40HrpAddRelation_(hrpId, to, type === 'نقل' ? 'أصلي' : 'منتدب إلينا كلي', current, 'حركة متبادلة', (type === 'نقل' ? 'نقل' : 'ندب كلي') + ' من ' + v40Names_(from));
    try { var row = v40HrpRow_(hrpId); if (type === 'نقل' && row.ix.originalSchoolId != null) v50A_(row.sh.getRange(row.row, row.ix.originalSchoolId + 1).setValue(to)); } catch (e) {}
  } else {
    var other = act.filter(function(x){ return String(x.r[rri.schoolId]) !== String(from); }).reduce(function(a,x){ return a + (Number(x.r[rri['عدد_الحصص_المطلوب']]) || 0); },0);
    var mx107 = v107HrpW_(hrpId); if (current + other + per > mx107) throw new Error('إجمالي حصص المعلم في المدرستين لا يجوز أن يتجاوز ' + mx107 + ' حصة أسبوعيًا.');
    var rid = v40HrpAddRelation_(hrpId, to, 'منتدب إلينا جزئي', per, 'حركة متبادلة', 'ندب جزئي من ' + v40Names_(from));
    var rr = v40HrpActiveRels_(hrpId).filter(function(x){ return String(x.r[rri.schoolId]) === String(to); })[0];
    if (rr) { if (rri[V68_DAYS] != null) v50A_(sh.getRange(rr.n, rri[V68_DAYS] + 1).setValue(days)); if (rri[V68_PER] != null) v50A_(sh.getRange(rr.n, rri[V68_PER] + 1).setValue(per)); }
  }
  v50Invalidate_(V40_HRP_REL_SHEET);
}

/** تفاصيل معلم حصة/معاش لمدرسة مرتبط بها. */
function schoolHrpDetailsV70(token, hrpId){
  var s = schoolV31Session_(token), sid = String(s.schoolId);
  var hd = v56Read_(V40_HRP_SHEET), h = hd.h, ix = hd.ix, p = null;
  hd.vals.forEach(function(r){ if (String(r[ix.hrpId]) === String(hrpId)) p = r; }); if (!p) throw new Error('السجل غير موجود.');
  var names = v42SchoolNames_(), rd = v56Read_(V40_HRP_REL_SHEET), ri = rd.ix, rels = [], mine = false;
  rd.vals.forEach(function(r){ if (String(r[ri.hrpId]) !== String(hrpId)) return; var act = v36ActiveRel_(r[ri['الحالة']]); if (act && String(r[ri.schoolId]) === sid) mine = true;
    var l = ri[V69_COL] != null ? v69Parse_(r[ri[V69_COL]]) : [];
    rels.push({school: names[r[ri.schoolId]] || r[ri.schoolId], type: r[ri['نوع_العلاقة']], required: r[ri['عدد_الحصص_المطلوب']], status: r[ri['الحالة']] || 'نشطة', active: act, start: r[ri['تاريخ_البداية']], end: r[ri['تاريخ_النهاية']], split: l.length ? v69Text_(l, p[ix['مادة_التدريس']], Number(r[ri['عدد_الحصص_المطلوب']]) || 0) : ''}); });
  if (!mine) throw new Error('هذا المعلم غير مرتبط بمدرستك.');
  var f = {}; ['الاسم', 'الرقم_القومي', 'النوع', 'تاريخ_الميلاد', 'الهاتف', 'العنوان', 'نوع_الفئة', 'مادة_التدريس', 'حالة_السجل', 'قائم_بالعمل', 'تاريخ_الإضافة', 'ملاحظات'].forEach(function(k){ if (ix[k] != null) f[k] = p[ix[k]]; });
  var reqs = v40ReqList_(function(x){ return x['نوع_الموظف'] === 'موسمي' && String(x.employeeId) === String(hrpId); }).map(function(x){ return {type: x['نوع_الطلب'], from: v40Names_(x.fromSchoolId), to: v40Names_(x.toSchoolId), status: x['الحالة'], date: x['تاريخ_الطلب'], reason: x['السبب']}; });
  return {success: true, fields: f, relations: rels.sort(function(a, b){ return (b.active ? 1 : 0) - (a.active ? 1 : 0); }), requests: reqs};
}

/** مدرسة تطلب معلم حصة/معاش مرتبطًا بمدرسة أخرى (يذهب الطلب لمدرسته لتوافق). */
function schoolRequestHrpPullV70(token, hrpId, fromSchoolId, moveType, reason, days, periods){
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  moveType = v81RelationOrMovementToLegacy_(moveType) || String(moveType || '').trim();
  if (['نقل','ندب كلي','ندب جزئي'].indexOf(moveType) < 0) throw new Error('نوع الحركة غير صالح لمعلمي الحصة/المعاش.');
  if (!String(reason || '').trim()) throw new Error('اكتب السبب.');
  var nums = moveType === 'ندب جزئي' ? v68Nums_(days, periods, true) : null;
  var rri = schoolV31Idx_(v36Headers_(v40HrpRelSheet_())), active = v40HrpActiveRels_(hrpId);
  var fromRel = active.filter(function(x){ return String(x.r[rri.schoolId]) === String(fromSchoolId); })[0];
  if (!fromRel) throw new Error('المعلم غير مرتبط بالمدرسة الأخرى حاليًا.');
  if (active.some(function(x){ return String(x.r[rri.schoolId]) === String(s.schoolId); })) throw new Error('مرتبط بمدرستك بالفعل.');
  var current = Number(fromRel.r[rri['عدد_الحصص_المطلوب']]) || 0;
  if (moveType === 'ندب جزئي') {
    var other = active.filter(function(x){ return String(x.r[rri.schoolId]) !== String(fromSchoolId); }).reduce(function(a,x){ return a + (Number(x.r[rri['عدد_الحصص_المطلوب']]) || 0); },0);
    var mx107 = v107HrpW_(hrpId); if (current + other + nums.p > mx107) throw new Error('إجمالي حصص المعلم في المدرستين لا يجوز أن يتجاوز ' + mx107 + ' حصة أسبوعيًا.');
  }
  if (v40ReqList_(function(x){ return String(x.employeeId) === String(hrpId) && x['الحالة'] === 'مفتوح'; }).length) throw new Error('يوجد طلب مفتوح لهذا المعلم — انتظر البت فيه أو ألغِه.');
  var id = v40ReqAdd_({نوع_الطلب:moveType, نوع_الموظف:'موسمي', employeeId:hrpId, fromSchoolId:fromSchoolId, toSchoolId:s.schoolId, مُبادر:s.schoolId, السبب:reason, المستخدم_الطالب:s.username || s.school, أيام_الندب_الجزئي:nums ? nums.d : '', حصص_الندب_الجزئي:nums ? nums.p : ''});
  schoolV31Log_(s, 'طلب استقدام معلم حصة/معاش (' + moveType + ')', hrpId, [['من', '', v40Names_(fromSchoolId)], ['الحصص', '', nums ? nums.p : current]]);
  return {success:true, message:'أُرسل الطلب إلى «'+v40Names_(fromSchoolId)+'» بانتظار موافقتها.', requestId:id};
}

/** V7.2: تعديل بيانات معلم الحصة/المعاش من مدرسة مرتبط بها. */
var V72_HRP_EDIT = ['الاسم', 'الهاتف', 'العنوان', 'مادة_التدريس', 'ملاحظات'];
function schoolHrpSaveV72(token, hrpId, payload){
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT'); payload = payload || {};
  var rri = schoolV31Idx_(v36Headers_(v40HrpRelSheet_()));
  if (!v40HrpActiveRels_(hrpId).some(function(x){ return String(x.r[rri.schoolId]) === String(s.schoolId); })) throw new Error('هذا المعلم غير مرتبط بمدرستك.');
  if (payload['الاسم'] !== undefined && String(payload['الاسم']).trim().split(/\s+/).filter(Boolean).length < 3) throw new Error('الاسم يجب ألا يقل عن ثلاثة أجزاء.');
  if (payload['الهاتف'] !== undefined) { var ph = v24DigitsLocalV31_(payload['الهاتف']); if (ph && !/^01\d{9}$/.test(ph)) throw new Error('رقم الهاتف غير صحيح (11 رقمًا يبدأ بـ 01).'); payload['الهاتف'] = ph; }
  if (payload['مادة_التدريس'] !== undefined) { v72GuardSubject_(payload['مادة_التدريس']); payload['مادة_التدريس'] = v100HrpSubject_(payload['مادة_التدريس']); }   // V7.55
  return v35Lock_(function(){
    var row = v40HrpRow_(hrpId), ch = [];
    V72_HRP_EDIT.forEach(function(k){ if (payload[k] === undefined || row.ix[k] == null) return; var old = String(row.sh.getRange(row.row, row.ix[k] + 1).getDisplayValue()), nv = schoolV31Clean_(payload[k]); if (String(nv) === old) return; v50A_(row.sh.getRange(row.row, row.ix[k] + 1).setValue(nv)); ch.push([k, old, String(nv)]); });
    if (ch.length) { v50Invalidate_(V40_HRP_SHEET); schoolV31Log_(s, 'تعديل بيانات معلم حصة/معاش', hrpId, ch); }
    return {success: true, message: ch.length ? 'تم حفظ ' + ch.length + ' حقل.' : 'لا توجد تغييرات.'};
  });
}
