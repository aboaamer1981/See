/** V7.33 — طلبات إضافة معلمي الحصة الجدد.
 * المدرسة تسجل البيانات فقط؛ العلاقة لا تصبح نشطة إلا بعد موافقة الإدارة.
 */
var V92_HRP_ADD_REQUEST = 'إضافة معلم حصة';

function v92HrpAddRequest_(requestId){
  var rq=v40ReqFind_(requestId), ix=rq.ix, v=rq.vals;
  if(String(v[ix['نوع_الطلب']]||'')!==V92_HRP_ADD_REQUEST) throw new Error('هذا الطلب ليس طلب إضافة معلم حصة.');
  return {rq:rq,ix:ix,v:v,id:requestId,hrpId:String(v[ix.employeeId]||''),to:String(v[ix.toSchoolId]||''),status:String(v[ix['الحالة']]||'')};
}


function adminDecideHrpAddV92(token,requestId,decision,note){
  var a=v35Admin_(token), m=v92HrpAddRequest_(requestId);
  if(m.status!=='مفتوح') throw new Error('هذا الطلب سبق البت فيه.');
  if(['موافقة','رفض'].indexOf(decision)<0) throw new Error('اختر موافقة أو رفض.');
  return v35Lock_(function(){
    m=v92HrpAddRequest_(requestId); if(m.status!=='مفتوح') throw new Error('هذا الطلب سبق البت فيه.');
    var actor=v36Actor_(a), row=v40HrpRow_(m.hrpId), ri=schoolV31Idx_(v36Headers_(v40HrpRelSheet_()));
    if(decision==='رفض'){
      if(row.ix['حالة_السجل']!=null) v50A_(row.sh.getRange(row.row,row.ix['حالة_السجل']+1).setValue('مرفوض — بقرار الإدارة'));
      if(row.ix['قائم_بالعمل']!=null) v50A_(row.sh.getRange(row.row,row.ix['قائم_بالعمل']+1).setValue('لا'));
      if(m.ix['الحالة']!=null) v50A_(m.rq.sh.getRange(m.rq.row,m.ix['الحالة']+1).setValue('مرفوض — بقرار الإدارة'));
    }else{
      var schoolId=m.to, req=Number(m.ix['حصص_الندب_الجزئي']!=null?m.v[m.ix['حصص_الندب_الجزئي']]:0)||0;
      var mx107=v107HrpW_(m.hrpId); if(req<0||req>mx107) throw new Error('عدد الحصص المطلوبة يجب أن يكون من 0 إلى '+mx107+'.');
      if(v40HrpActiveRels_(m.hrpId).length) throw new Error('المعلم أصبح مرتبطًا بمدرسة بالفعل قبل اعتماد الطلب.');
      if(row.ix.originalSchoolId!=null) v50A_(row.sh.getRange(row.row,row.ix.originalSchoolId+1).setValue(schoolId));
      if(row.ix['حالة_السجل']!=null) v50A_(row.sh.getRange(row.row,row.ix['حالة_السجل']+1).setValue('قائم'));
      if(row.ix['قائم_بالعمل']!=null) v50A_(row.sh.getRange(row.row,row.ix['قائم_بالعمل']+1).setValue('نعم'));
      v40HrpAddRelation_(m.hrpId,schoolId,'أصلي',req,'اعتماد الإدارة','إضافة معلم حصة بعد موافقة الإدارة',true);
      v50A_(m.rq.sh.getRange(m.rq.row,m.ix['الحالة']+1).setValue('تمت الموافقة — اعتماد الإدارة'));
    }
    if(m.ix['تاريخ_الرد']!=null) v50A_(m.rq.sh.getRange(m.rq.row,m.ix['تاريخ_الرد']+1).setValue(new Date()));
    if(m.ix['المستخدم_الراد']!=null) v50A_(m.rq.sh.getRange(m.rq.row,m.ix['المستخدم_الراد']+1).setValue(actor.username||'الإدارة'));
    if(m.ix['ملاحظات_الرد']!=null) v50A_(m.rq.sh.getRange(m.rq.row,m.ix['ملاحظات_الرد']+1).setValue(note||''));
    v50Invalidate_(V40_REQ_SHEET); v50Invalidate_(V40_HRP_SHEET); v50Invalidate_(V40_HRP_REL_SHEET);
    schoolV31Log_(actor,decision==='موافقة'?'اعتماد إضافة معلم حصة':'رفض إضافة معلم حصة',m.hrpId,[['المدرسة',v40Names_(m.to),''],['ملاحظة','',note||'']]);
    return {success:true,message:decision==='موافقة'?'تم اعتماد المعلم وإنشاء علاقته بالمدرسة.':'تم رفض طلب إضافة المعلم، ولم تُنشأ له علاقة.'};
  });
}
