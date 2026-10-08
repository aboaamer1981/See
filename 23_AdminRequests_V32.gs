/** V3.2 — مركز طلبات العاملين للإدارة */
function adminWorkerRequestsV32(token,status){
  requireAdminSessionV29_(token);
  var sh=personnelSS_().getSheetByName('15_طلبات_العاملين');
  if(!sh)return {success:true,rows:[]};
  var v=sh.getDataRange().getDisplayValues(),h=v[0]||[],idx=schoolV31Idx_(h),want=String(status||'مفتوح').trim();
  var en={};try{var ed=v24Data_('01_الأساسي'),ei=schoolV31Idx_(ed.headers);ed.rows.forEach(function(r){en[schoolV31Val_(r,ei,'employeeId')]=schoolV31Val_(r,ei,'الاسم');});}catch(e){}
  return {success:true,rows:v.slice(1).map(function(r){return {
    requestId:r[idx.requestId]||'',employeeId:r[idx.employeeId]||'',employeeName:en[String(r[idx.employeeId]||'').trim()]||'',nationalId:r[idx['الرقم_القومي']]||'',schoolId:r[idx.schoolId]||'',school:r[idx['اسم_المدرسة']]||'',
    type:r[idx['نوع_الطلب']]||'',field:r[idx['الحقل_المطلوب_تعديله']]||'',oldValue:r[idx['القيمة_القديمة']]||'',newValue:r[idx['القيمة_الجديدة']]||'',reason:r[idx['سبب_الطلب']]||'',
    deleteReason:r[idx['سبب_الحذف']]||'',target:r[idx['الجهة_المطلوب_النقل_إليها']]||'',status:r[idx['الحالة']]||'',decision:r[idx['قرار_الإدارة']]||'',user:r[idx['المستخدم_الطالب']]||'',date:r[idx['تاريخ_الطلب']]||''
  };}).filter(function(x){return !want||x.status===want;}).reverse().slice(0,500)};
}
function v38ApplyStatusRequest_(admin, type, employeeId, schoolId, targetSchoolName, reason, note){
  var m=String(type||'').match(/طلب تغيير حالة العامل\s*[—-]\s*(.+)$/), action=m?String(m[1]).trim():'';
  if(!action) return '';
  var targetId='';
  if(targetSchoolName){var td=v24Data_('18_بيانات_المدارس'),ti=schoolV31Idx_(td.headers);for(var i=0;i<td.rows.length;i++)if(schoolV31Val_(td.rows[i],ti,'اسم_المدرسة')===String(targetSchoolName).trim()){targetId=schoolV31Val_(td.rows[i],ti,'schoolId');break;}if(!targetId)throw new Error('المدرسة المطلوبة غير موجودة.');}
  var actor=v36Actor_(admin), msg='';
  // V7.58: الطلبات القديمة تُنفَّذ بنفس مسار القائمة الموحدة («غير قائم» لمن خرج/توفي/أُحيل للمعاش/انتهت خدمته).
  var uni=V102_OLD_ACTIONS[action];
  if(uni) return v35Lock_(function(){v50Fresh_();return v95ApplyFormerRelation_(actor,employeeId,schoolId,uni[0],'','','',uni[1]+(reason?(uni[1]?' — ':'')+'السبب: '+reason:''));});
  if(action==='نقل'){
    v36TransferCore_(actor,employeeId,schoolId,targetId,reason,'طلب تغيير حالة من المدرسة'); msg='تم النقل إلى '+v36SchoolName_(targetId)+'.';
  }else if(action==='ندب كلي'){
    if(!targetId)throw new Error('لا توجد مدرسة للندب الكلي.'); if(v36ActiveRelCount_(employeeId,targetId))throw new Error('العامل مرتبط بالفعل بالمدرسة المطلوبة.');
    v35Lock_(function(){v36CloseRelations_(employeeId,schoolId,'ندب كلي إلى '+v36SchoolName_(targetId)+(reason?' — '+reason:''));v36AddRelation_(employeeId,targetId,'منتدب إلينا كلي','طلب تغيير حالة من المدرسة','ندب كلي من '+v36SchoolName_(schoolId)+(reason?' — '+reason:''));schoolV31Log_(actor,'ندب كلي لعامل',employeeId,[['المدرسة',v36SchoolName_(schoolId),v36SchoolName_(targetId)]]);});msg='تم تنفيذ الندب الكلي إلى '+v36SchoolName_(targetId)+'.';
  }else if(action==='ندب جزئي'){
    if(!targetId)throw new Error('لا توجد مدرسة للندب الجزئي.'); if(v36ActiveRelCount_(employeeId,targetId))throw new Error('العامل مرتبط بالفعل بالمدرسة المطلوبة.');
    v35Lock_(function(){v36AddRelation_(employeeId,targetId,'منتدب إلينا جزئي','طلب تغيير حالة من المدرسة','ندب جزئي من '+v36SchoolName_(schoolId)+(reason?' — '+reason:''));schoolV31Log_(actor,'ندب جزئي لعامل',employeeId,[['المدرسة',v36SchoolName_(schoolId),v36SchoolName_(targetId)]]);});msg='تم تنفيذ الندب الجزئي إلى '+v36SchoolName_(targetId)+'.';
  }else if(action==='إنهاء العلاقة بالمدرسة فقط'){
    v35Lock_(function(){v36CloseRelations_(employeeId,schoolId,'إنهاء العلاقة بالمدرسة فقط'+(reason?' — '+reason:''));schoolV31Log_(actor,'إنهاء علاقة عامل بمدرسة',employeeId,[['المدرسة',v36SchoolName_(schoolId),'']]);});msg='تم إنهاء علاقة العامل بهذه المدرسة فقط مع الاحتفاظ بسجله.';
  }else throw new Error('إجراء تغيير الحالة غير مدعوم: '+action);
  return msg;
}
function adminDecideWorkerRequestV32(token,requestId,decision,note){
  var admin=requireAdminSessionV29_(token), d=String(decision||'').trim(); if(['موافقة','رفض'].indexOf(d)<0)throw new Error('قرار الإدارة يجب أن يكون موافقة أو رفض.');
  var sh=personnelSS_().getSheetByName('15_طلبات_العاملين');if(!sh)throw new Error('ورقة طلبات العاملين غير موجودة.');
  var v=sh.getDataRange().getDisplayValues(),h=v[0]||[],idx=schoolV31Idx_(h),ri=idx.requestId;if(ri==null)throw new Error('عمود requestId غير موجود.');
  var row=-1;for(var i=1;i<v.length;i++)if(String(v[i][ri]).trim()===String(requestId).trim()){row=i+1;break;}if(row<2)throw new Error('الطلب غير موجود.');
  if(idx['الحالة']!=null&&String(v[row-1][idx['الحالة']]||'').trim()!=='مفتوح')throw new Error('الطلب سبق البت فيه.');
  var type=String(v[row-1][idx['نوع_الطلب']]||'').trim(),eid=String(v[row-1][idx.employeeId]||'').trim(),sid=String(v[row-1][idx.schoolId]||'').trim(),target=String(v[row-1][idx['الجهة_المطلوب_النقل_إليها']]||'').trim(),reason=String(v[row-1][idx['سبب_الطلب']]||v[row-1][idx['سبب_الحذف']]||'').trim(),applied='';
  if(d==='موافقة'){
    if(type==='طلب إزالة عامل من المدرسة') applied=v38ApplyStatusRequest_(admin,'طلب تغيير حالة العامل — إنهاء العلاقة بالمدرسة فقط',eid,sid,'',reason,note);
    else if(/^طلب تغيير حالة العامل/.test(type)) applied=v38ApplyStatusRequest_(admin,type,eid,sid,target,reason,note);
    else if(type==='طلب تعديل بيانات عامل') applied=v35ApplyEditRequest_(String(v[row-1][idx['الحقل_المطلوب_تعديله']]||'').trim(),String(v[row-1][idx['القيمة_الجديدة']]||''),eid,admin);
    else if(type==='طلب عودة للعمل') applied=v94ApplyFormerReturn_(admin,eid,sid,reason||note);
  }
  var statusCol=idx['الحالة'],decCol=idx['قرار_الإدارة'],revCol=idx['المراجع'],dtCol=idx['تاريخ_المراجعة'],noteCol=idx['ملاحظات'];
  if(statusCol!=null)v50A_(sh.getRange(row,statusCol+1).setValue(d==='موافقة'?'تمت الموافقة':'مرفوض'));
  if(decCol!=null)v50A_(sh.getRange(row,decCol+1).setValue(d));
  if(revCol!=null)v50A_(sh.getRange(row,revCol+1).setValue(admin.username||'admin'));
  if(dtCol!=null)v50A_(sh.getRange(row,dtCol+1).setValue(new Date()));
  if(noteCol!=null)v50A_(sh.getRange(row,noteCol+1).setValue(String(note||applied||'')));
  return {success:true,message:d==='موافقة'?(applied||'تمت الموافقة على الطلب وتنفيذ أثره.'):'تم رفض الطلب.',requestId:requestId};
}


