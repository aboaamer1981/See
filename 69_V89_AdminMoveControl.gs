/** V7.27 — سلطة الإدارة النهائية على طلبات العلاقات والحركات طوال العام.
 * القاعدة: الحصر لقطة تاريخية، وطلب الحركة دورة مستقلة. المدرسة الأصلية هي صاحبة القرار في طلب الندب/النقل الصادر من المدرسة الطالبة،
 * والإدارة تستطيع الحسم عند عدم اتخاذ المدرسة قرارًا.
 */
var V89_ADMIN_MOVE_TYPES = ['نقل','ندب كلي','ندب جزئي'];

function v89Request_(requestId){
  var rq=v40ReqFind_(requestId), ix=rq.ix, v=rq.vals;
  if(!v[ix['employeeId']] || !v[ix['fromSchoolId']] || !v[ix['toSchoolId']]) throw new Error('بيانات طلب الحركة غير مكتملة.');
  return {rq:rq,ix:ix,v:v,id:requestId,type:String(v[ix['نوع_الطلب']]||''),eid:String(v[ix.employeeId]||''),from:String(v[ix.fromSchoolId]||''),to:String(v[ix.toSchoolId]||''),status:String(v[ix['الحالة']]||''),initiator:String(v[ix['مُبادر']]||'')};
}
function adminDecideMoveV89(token,requestId,decision,note){   // V7.35: النواة الموحدة v93Decide_
  var a=v35Admin_(token), m=v89Request_(requestId);
  if(m.type==='تغيير علاقة'){var a=v35Admin_(token);return v35Lock_(function(){v50Fresh_();var rq=v40ReqFind_(requestId),v=rq.vals,ix=rq.ix;if(v[ix['الحالة']]!=='مفتوح')throw new Error('الطلب سبق البت فيه.');if(decision==='موافقة'){v95ApplyFormerRelation_(v36Actor_(a),v[ix.employeeId],v[ix.toSchoolId],v[ix.statusRelation],v[ix.targetSchool],v[ix.targetText],v[ix.statusDate],v[ix['السبب']]||note||'');}v93Stamp_(rq,ix,decision==='موافقة'?'تمت الموافقة — حسم الإدارة':'مرفوض — بقرار الإدارة',v36Actor_(a).username||'الإدارة',note||'');v50Invalidate_(V40_REQ_SHEET);return{success:true,message:decision==='موافقة'?'تم تنفيذ تغيير العلاقة بقرار الإدارة.':'تم رفض تغيير العلاقة بقرار الإدارة.'};});}
  if(V89_ADMIN_MOVE_TYPES.indexOf(m.type)<0) throw new Error('هذا الطلب ليس حركة نقل/ندب قابلة للحسم الإداري.');
  var r=v93Decide_(requestId, decision, note, {actor:v36Actor_(a), user:v36Actor_(a).username||'الإدارة', okStatus:'تمت الموافقة — حسم الإدارة', rejectStatus:'مرفوض — بقرار الإدارة', source:'حركة طوال العام بقرار الإدارة', logPrefix:'حسم الإدارة'});
  r.message = decision==='موافقة' ? 'تم حسم الإدارة وتنفيذ '+v83DisplayMoveType_(m.type)+' من «'+v40Names_(m.from)+'» إلى «'+v40Names_(m.to)+'» دون تعديل الحصر السابق.' : 'تم رفض طلب '+v83DisplayMoveType_(m.type)+' بقرار الإدارة دون تعديل الحصر السابق.';
  return r;
}
