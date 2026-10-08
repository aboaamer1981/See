/**
 * V7.20 — دورة الحركة طوال العام.
 *
 * القاعدة:
 * 1) اعتماد حصر العاملين لقطة تاريخية ولا يمنع إنشاء طلب حركة جديد بعدها.
 * 2) طلب النقل/الندب مستقل عن الحصر، ويُرسل للطرف الآخر للموافقة.
 * 3) لا يُعد «عدم وجود الحركة في الحصر» تعارضًا لطلب جديد بعد اعتماد الحصر.
 * 4) الحصر السابق لا يُعدّل عند إنشاء أو اعتماد حركة لاحقة.
 * 5) القائمة الظاهرة لأنواع العلاقة مصدرها الوحيد V81.
 */
var V83_MOVE_TYPES = V40_MOVE_TYPES.slice();
function v83LegacyMoveType_(x){ var z=String(x||'').trim(); var a={'ندب كلي إلينا':'منتدب إلينا كليًا من داخل الإدارة','ندب جزئي إلينا':'منتدب إلينا جزئيًا'}; z=a[z]||z; var y=v81RelationOrMovementToLegacy_(z); return y || z; }
function v83DisplayMoveType_(x){ return v81LegacyToRelationLabel_(x); }

function v83EnsureRequestColumns_(){
  var sh = v36Sheet_(V40_REQ_SHEET), h = v36Headers_(sh);
  ['fromSchoolId','toSchoolId','أيام_الندب_الجزئي','حصص_الندب_الجزئي'].forEach(function(k){
    if (h.indexOf(k) < 0) schoolEnsureWorkerColumnV40_(sh, k);
  });
  return v36Headers_(sh);
}

function v83OpenMove_(employeeId){
  return v40ReqList_(function(x){
    return String(x.employeeId||'') === String(employeeId||'') &&
      String(x['الحالة']||'') === 'مفتوح' &&
      (V83_MOVE_TYPES.indexOf(String(x['نوع_الطلب']||'')) >= 0 || String(x['نوع_الطلب']||'') === V82_CANCEL_SECONDMENT);
  });
}

function v83ValidateMoveTarget_(s, employeeId, otherSchoolId, moveType){
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers);
  var mine = rel.rows.some(function(r){
    return String(schoolV31Val_(r,ri,'employeeId')) === String(employeeId) &&
      String(schoolV31Val_(r,ri,'schoolId')) === String(s.schoolId) &&
      v36ActiveRel_(schoolV31Val_(r,ri,'الحالة'));
  });
  if (!mine) throw new Error('هذا الموظف غير مرتبط بمدرستك حاليًا.');
  if (v36ActiveRelCount_(employeeId, otherSchoolId)) {
    throw new Error(moveType === 'ندب جزئي' ? 'الموظف منتدب بالفعل لهذه المدرسة — عدّل أيامه وحصصه من «⚖️ الندب الجزئي».' : 'الموظف مرتبط بالفعل بالمدرسة الأخرى.');
  }
  if (String(otherSchoolId) === String(s.schoolId)) throw new Error('لا يمكن اختيار نفس المدرسة.');
  v93GuardMoveSource_(employeeId, s.schoolId, v83LegacyMoveType_(moveType));   // V7.35
}

function v83AddMoveRequest_(s, employeeId, fromSchoolId, toSchoolId, moveType, reason, days, periods){
  moveType = v83LegacyMoveType_(moveType);
  if (V83_MOVE_TYPES.indexOf(String(moveType||'')) < 0) throw new Error('نوع الحركة غير صالح.');
  if (!String(reason||'').trim()) throw new Error('اكتب السبب / رقم القرار.');
  v35SchoolRow_(toSchoolId); v35SchoolRow_(fromSchoolId);
  var nm = moveType === 'ندب جزئي' ? v68Nums_(days, periods, true) : null;
  if (nm) {
    var rel0=v24Data_('04_علاقات_المدارس'), ri0=schoolV31Idx_(rel0.headers), cur0=0;
    rel0.rows.forEach(function(r0){ if(String(schoolV31Val_(r0,ri0,'employeeId'))===String(employeeId) && v36ActiveRel_(schoolV31Val_(r0,ri0,'الحالة'))) cur0 += Number(schoolV31Val_(r0,ri0,'حصص_الندب_الجزئي')) || 0; });
    var base0=cur0;
    if (base0 + Number(nm.p||0) > 24) throw new Error('إجمالي حصص المعلم في المدرستين لا يجوز أن يتجاوز 24 حصة أسبوعيًا.');
  }
  if (v83OpenMove_(employeeId).length) throw new Error('يوجد بالفعل طلب حركة مفتوح لهذا الموظف — انتظر البت فيه أو ألغِه.');
  var id = v40ReqAdd_({
    نوع_الطلب: moveType, نوع_الموظف:'أساسي', employeeId:employeeId,
    fromSchoolId:fromSchoolId, toSchoolId:toSchoolId, مُبادر:s.schoolId,
    السبب:reason, المستخدم_الطالب:s.username || s.school,
    أيام_الندب_الجزئي:nm ? nm.d : '', حصص_الندب_الجزئي:nm ? nm.p : ''
  });
  schoolV31Log_(s, 'طلب '+moveType+' (دورة حركة طوال العام)', employeeId, [['المدرسة المستهدفة','',v40Names_(toSchoolId)]]);
  return {success:true, requestId:id, message:'أُرسل طلب '+moveType+' إلى «'+v40Names_(toSchoolId)+'» بانتظار موافقتها. اعتماد الحصر السابق لا يمنع هذا الطلب.'};
}

function schoolRequestMoveV83(token, employeeId, otherSchoolId, moveType, reason, days, periods){
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  v83EnsureRequestColumns_();
  v83ValidateMoveTarget_(s, employeeId, otherSchoolId, moveType);
  return v83AddMoveRequest_(s, employeeId, s.schoolId, otherSchoolId, moveType, reason, days, periods);
}

function schoolRequestPullV83(token, employeeId, moveType, reason, days, periods){
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  v83EnsureRequestColumns_();
  moveType = v83LegacyMoveType_(moveType);   // V7.35: نفس تطبيع schoolRequestMoveV83
  if (V83_MOVE_TYPES.indexOf(String(moveType||'')) < 0) throw new Error('نوع الحركة غير صالح.');
  if (!String(reason||'').trim()) throw new Error('اكتب السبب / رقم القرار.');
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers);
  var act = rel.rows.filter(function(r){
    return String(schoolV31Val_(r,ri,'employeeId')) === String(employeeId) &&
      v36ActiveRel_(schoolV31Val_(r,ri,'الحالة')) &&
      String(schoolV31Val_(r,ri,'schoolId')) !== String(s.schoolId);
  });
  var at = act.filter(function(r){ return schoolV31Val_(r,ri,'نوع_العلاقة') === 'أصلي'; })[0] || act[0];
  if (!at) throw new Error('هذا الموظف غير مرتبط بأي مدرسة حاليًا — أضِفه مباشرة.');
  var currentSchoolId = schoolV31Val_(at,ri,'schoolId');
  if (String(currentSchoolId) === String(s.schoolId)) throw new Error('الموظف مسجَّل عندك بالفعل.');
  v93GuardMoveSource_(employeeId, currentSchoolId, moveType);   // V7.35
  if (v36ActiveRelCount_(employeeId, s.schoolId)) throw new Error(moveType === 'ندب جزئي' ? 'الموظف منتدب بالفعل لمدرستك — عدّل أيامه وحصصه من «⚖️ الندب الجزئي».' : 'الموظف مرتبط بالفعل بمدرستك.');
  return v83AddMoveRequest_(s, employeeId, currentSchoolId, s.schoolId, moveType, reason, days, periods);
}

function schoolDecideMoveV83(token, requestId, decision, note){   // V7.35: يمر عبر النواة الموحدة v93Decide_ (يشمل معلمي الحصة)
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  var r = v93Decide_(requestId, decision, note, {actor: s, user: s.username || s.school, check: v93SchoolApproverCheck_(s.schoolId), source: 'حركة متبادلة طوال العام', logPrefix: 'دورة حركة طوال العام'});
  if (decision === 'موافقة') r.message = 'تمت الموافقة وتنفيذ ' + v83DisplayMoveType_(r.type) + ' دون تغيير الحصر السابق.';
  return r;
}

function schoolMoveRequestsV83(token){
  var s = schoolV31Session_(token), types = V83_MOVE_TYPES.concat([V82_CANCEL_SECONDMENT]);
  var mine = v40ReqList_(function(x){ return (x['نوع_الموظف']==='أساسي'||x['نوع_الموظف']==='موسمي') && (x.fromSchoolId===s.schoolId||x.toSchoolId===s.schoolId) && types.indexOf(x['نوع_الطلب'])>=0; });
  if (!mine.length) return {success:true,rows:[]};
  var emp=v24Data_('01_الأساسي'),ei=schoolV31Idx_(emp.headers),names={};
  emp.rows.forEach(function(r){names[schoolV31Val_(r,ei,'employeeId')]=schoolV31Val_(r,ei,'الاسم');});
  if (mine.some(function(x){ return x['نوع_الموظف']==='موسمي'; })) { var hn=v91HrpNames_(); Object.keys(hn).forEach(function(k){ names[k]=hn[k]; }); }   // V7.35: اسم معلم الحصة بدل HRP_…
  return {success:true,rows:mine.map(function(x){return {
    requestId:x.requestId,type:v83DisplayMoveType_(x['نوع_الطلب'])+(x['حصص_الندب_الجزئي']?' ('+(x['أيام_الندب_الجزئي']?x['أيام_الندب_الجزئي']+' يوم / ':'')+x['حصص_الندب_الجزئي']+' حصة)':''),
    employeeId:x.employeeId,employeeName:names[x.employeeId]||x.employeeId,from:v40Names_(x.fromSchoolId),to:v40Names_(x.toSchoolId),initiator:v40Names_(x['مُبادر']),reason:x['السبب'],status:x['الحالة'],
    canDecide:x['الحالة']==='مفتوح'&&String(x['مُبادر'])!==String(s.schoolId),canCancel:x['الحالة']==='مفتوح'&&String(x['مُبادر'])===String(s.schoolId),kind:x['نوع_الموظف'],date:x['تاريخ_الطلب'],yearRound:true
  };}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'');})};
}

