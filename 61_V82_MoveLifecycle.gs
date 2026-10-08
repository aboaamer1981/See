/**
 * V8.2 — دورة الحركة السنوية وإلغاء الندب.
 * - الحصر لقطة زمنية ولا يمنع إنشاء حركة جديدة بعد اعتماده.
 * - «إلغاء ندب» طلب مستقل متاح طوال العام.
 * - عند الموافقة على إلغاء الندب يعود العامل إلى مدرسته الأصلية.
 * - لا يُعدّل سجل الحصر السابق ولا يُنشأ تعارض بسبب عدم وجود طلب في الحصر.
 */
var V82_CANCEL_SECONDMENT = 'إلغاء ندب';


/** بيانات الندب النشط للعامل: المدرسة الأصلية + المدرسة/المدارس المنتدب إليها. */
function v82Secondments_(employeeId){
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), er = null;
  emp.rows.forEach(function(r){ if (String(schoolV31Val_(r, ei, 'employeeId')) === String(employeeId)) er = r; });
  if (!er) throw new Error('العامل غير موجود.');
  var original = String(schoolV31Val_(er, ei, 'originalSchoolId') || '').trim();
  if (!original) throw new Error('لا توجد مدرسة أصلية مسجلة لهذا العامل.');
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), out = [];
  rel.rows.forEach(function(r){
    if (String(schoolV31Val_(r, ri, 'employeeId')) !== String(employeeId)) return;
    if (!v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة'))) return;
    var type = String(schoolV31Val_(r, ri, 'نوع_العلاقة') || '').trim();
    if (type === 'منتدب إلينا كلي' || type === 'منتدب إلينا جزئي') {
      out.push({schoolId:String(schoolV31Val_(r, ri, 'schoolId')), type:type, relationId:String(schoolV31Val_(r, ri, 'relationId') || '')});
    }
  });
  return {originalSchoolId:original, secondments:out};
}

/** المدارس التي يمكن أن ينشأ بينها طلب إلغاء ندب للعامل من المدرسة الحالية. */
function schoolSecondmentTargetsV82(token, employeeId){
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  var d = v82Secondments_(employeeId), mine = false, rows = [];
  d.secondments.forEach(function(x){
    if (String(x.schoolId) === String(s.schoolId)) mine = true;
    rows.push({schoolId:x.schoolId, type:x.type, name:v40Names_(x.schoolId), originalSchoolId:d.originalSchoolId, originalName:v40Names_(d.originalSchoolId)});
  });
  if (!mine && String(s.schoolId) !== String(d.originalSchoolId)) throw new Error('هذا العامل ليس ضمن علاقات الندب المرتبطة بمدرستك.');
  return {success:true, originalSchoolId:d.originalSchoolId, originalName:v40Names_(d.originalSchoolId), rows:rows};
}

/** إنشاء طلب إلغاء ندب. متاح طوال العام ولا يرتبط بحالة الحصر. */
function schoolRequestSecondmentCancelV82(token, employeeId, secondmentSchoolId, reason){
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  if (!String(reason || '').trim()) throw new Error('اكتب سبب إلغاء الندب / رقم القرار.');
  var d = v82Secondments_(employeeId), host = String(secondmentSchoolId || '').trim();
  if (!host || !d.secondments.some(function(x){ return String(x.schoolId) === host; })) throw new Error('الندب المحدد غير نشط حاليًا.');
  if (String(s.schoolId) !== host && String(s.schoolId) !== String(d.originalSchoolId)) throw new Error('لا يمكن لمدرستك طلب إلغاء هذا الندب.');
  var approver = String(s.schoolId) === host ? d.originalSchoolId : host;
  if (String(approver) === String(s.schoolId)) throw new Error('لا يمكن إنشاء طلب إلغاء للمدرسة نفسها.');
  var open = v40ReqList_(function(x){ return String(x.employeeId) === String(employeeId) && x['الحالة'] === 'مفتوح' && (x['نوع_الطلب'] === V82_CANCEL_SECONDMENT || V40_MOVE_TYPES.indexOf(x['نوع_الطلب']) >= 0); });
  if (open.length) throw new Error('يوجد بالفعل طلب حركة مفتوح لهذا العامل — انتظر البت فيه أو ألغِه.');
  var id = v40ReqAdd_({نوع_الطلب:V82_CANCEL_SECONDMENT, نوع_الموظف:'أساسي', employeeId:employeeId, fromSchoolId:s.schoolId, toSchoolId:approver, مُبادر:s.schoolId, السبب:reason, المستخدم_الطالب:s.username || s.school, أيام_الندب_الجزئي:'', حصص_الندب_الجزئي:''});
  schoolV31Log_(s, 'طلب إلغاء ندب', employeeId, [['المدرسة المنتدب إليها', '', v40Names_(host)], ['المدرسة الأصلية', '', v40Names_(d.originalSchoolId)]]);
  return {success:true, message:'تم إرسال طلب إلغاء الندب إلى «'+v40Names_(approver)+'» بانتظار موافقتها.', requestId:id};
}

/** تطبيق إلغاء الندب بعد موافقة المدرسة الأخرى. */
function v82ApplySecondmentCancel_(employeeId, hostSchoolId, originalSchoolId){
  var d = v82Secondments_(employeeId);
  if (String(d.originalSchoolId) !== String(originalSchoolId)) throw new Error('المدرسة الأصلية المسجلة للعامل لا تطابق الطلب.');
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), hostRows = [];
  rel.rows.forEach(function(r,i){
    if (String(schoolV31Val_(r,ri,'employeeId')) !== String(employeeId)) return;
    if (String(schoolV31Val_(r,ri,'schoolId')) !== String(hostSchoolId)) return;
    if (!v36ActiveRel_(schoolV31Val_(r,ri,'الحالة'))) return;
    var type = String(schoolV31Val_(r,ri,'نوع_العلاقة') || '').trim();
    if (type === 'منتدب إلينا كلي' || type === 'منتدب إلينا جزئي') hostRows.push({row:i+2,type:type});
  });
  if (!hostRows.length) throw new Error('لا توجد علاقة ندب نشطة في المدرسة المستقبلة.');
  var sh = v36Sheet_('04_علاقات_المدارس'), hh = v36Headers_(sh), hix = schoolV31Idx_(hh);
  hostRows.forEach(function(x){
    var upd = {};
    if (hix['الحالة'] != null) upd[hix['الحالة'] + 1] = 'غير نشطة';
    if (hix['تاريخ_النهاية'] != null) upd[hix['تاريخ_النهاية'] + 1] = new Date();
    if (hix['سبب_الإنهاء'] != null) upd[hix['سبب_الإنهاء'] + 1] = 'إلغاء الندب والعودة إلى المدرسة الأصلية';
    if (hix['ملاحظات'] != null) upd[hix['ملاحظات'] + 1] = 'أُغلقت بطلب إلغاء الندب';
    v50WriteRow_(sh, x.row, upd);
  });
  if (!v36ActiveRelCount_(employeeId, originalSchoolId)) {
    v36AddRelation_(employeeId, originalSchoolId, 'أصلي', 'إلغاء ندب', 'عودة بعد إلغاء الندب من ' + v40Names_(hostSchoolId));
  }
  var e = v36EmployeeRow_(employeeId);
  v36SetCells_(e, {originalSchoolId:originalSchoolId, 'الحالة_الوظيفية':'قائم', 'حالة_السجل':'قائم', 'قائم_بالعمل':'نعم'});
  v50Invalidate_('04_علاقات_المدارس'); v50Invalidate_('01_الأساسي');
}

/** قرار المدرسة على طلب إلغاء الندب. */
function schoolDecideSecondmentCancelV82(token, requestId, decision, note){
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  var rq = v40ReqFind_(requestId), v = rq.vals, ix = rq.ix;
  if (v[ix['الحالة']] !== 'مفتوح') throw new Error('الطلب سبق البت فيه.');
  if (v[ix['نوع_الطلب']] !== V82_CANCEL_SECONDMENT) throw new Error('هذا ليس طلب إلغاء ندب.');
  var from = v[ix.fromSchoolId], to = v[ix.toSchoolId];
  if (String(to) !== String(s.schoolId)) throw new Error('هذا الطلب ليس بانتظار موافقة مدرستك.');
  if (['موافقة','رفض'].indexOf(decision) < 0) throw new Error('القرار: موافقة أو رفض.');
  var eid = v[ix.employeeId];
  return v35Lock_(function(){
    v50Fresh_(); if (v40ReqFind_(requestId).vals[ix['الحالة']] !== 'مفتوح') throw new Error('الطلب سبق البت فيه.');   // V7.35
    if (decision === 'موافقة') {
      /* V7.35: المدرسة المستضيفة تُؤخذ من الطلب نفسه (كان يأخذ أول ندب نشط ⇒ قد يلغي ندبًا آخر). */
      var d = v82Secondments_(eid), hostId = String(from) === String(d.originalSchoolId) ? String(to) : String(from);
      if (!d.secondments.some(function(x){ return String(x.schoolId) === hostId; })) throw new Error('لم تعد هناك علاقة ندب نشطة في «' + v40Names_(hostId) + '» لتنفيذ الإلغاء.');
      v82ApplySecondmentCancel_(eid, hostId, d.originalSchoolId);
      v50A_(rq.sh.getRange(rq.row, ix['الحالة'] + 1).setValue('تمت الموافقة'));
      schoolV31Log_(s, 'الموافقة على إلغاء ندب', eid, [['من', v40Names_(from), ''], ['العودة إلى', '', v40Names_(d.originalSchoolId)]]);
    } else {
      v50A_(rq.sh.getRange(rq.row, ix['الحالة'] + 1).setValue('مرفوض'));
      schoolV31Log_(s, 'رفض إلغاء ندب', eid, [['السبب', '', note || '']]);
    }
    try { v50A_(rq.sh.getRange(rq.row, ix['تاريخ_الرد'] + 1).setValue(new Date())); v50A_(rq.sh.getRange(rq.row, ix['المستخدم_الراد'] + 1).setValue(s.username || s.school)); v50A_(rq.sh.getRange(rq.row, ix['ملاحظات_الرد'] + 1).setValue(note || '')); } catch(e){}
    v50Invalidate_(V40_REQ_SHEET);
    return {success:true, message:decision === 'موافقة' ? 'تم إلغاء الندب وعاد العامل إلى مدرسته الأصلية.' : 'تم رفض طلب إلغاء الندب.'};
  });
}

/** طلبات الحركة للمدرسة، مع إضافة إلغاء الندب دون تغيير الدالة القديمة. */

/** تقرير الإدارة للحركات، ويشمل إلغاء الندب. */
