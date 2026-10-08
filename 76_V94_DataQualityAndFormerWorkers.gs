/** V7.40 — تدخل الإدارة في جودة البيانات + العاملون الأصليون الخارجون من المدرسة. */

function v94OriginalSchoolId_(row, idx){
  return String(schoolV31Val_(row, idx, 'originalSchoolId') || '').trim();
}

/** المدرسة: من كان أصله بهذه المدرسة لكنه لا يظهر في كشف العاملين الحالي. */
function schoolFormerOriginalWorkersV94(token){
  var s=schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_VIEW');
  var emp=v24Data_('01_الأساسي'), rel=v24Data_('04_علاقات_المدارس'), ei=schoolV31Idx_(emp.headers), ri=schoolV31Idx_(rel.headers);
  var rels={};
  rel.rows.forEach(function(r){
    var id=schoolV31Val_(r,ri,'employeeId'); if(!id)return;
    (rels[id]=rels[id]||[]).push({schoolId:schoolV31Val_(r,ri,'schoolId'),type:schoolV31Val_(r,ri,'نوع_العلاقة'),status:schoolV31Val_(r,ri,'الحالة'),start:schoolV31Val_(r,ri,'تاريخ_البداية'),end:schoolV31Val_(r,ri,'تاريخ_النهاية'),reason:schoolV31Val_(r,ri,'سبب_الإنهاء'),note:schoolV31Val_(r,ri,'ملاحظات')});
  });
  var names=v93SchoolNameMap_(), out=[];
  emp.rows.forEach(function(r){
    var id=schoolV31Val_(r,ei,'employeeId'); if(!id||v94OriginalSchoolId_(r,ei)!==String(s.schoolId))return;
    var rs=rels[id]||[], active=rs.filter(function(x){return v36ActiveRel_(x.status);});
    var activeOrig=active.some(function(x){return String(x.schoolId)===String(s.schoolId);});   // V7.62: أي علاقة نشطة بالمدرسة = ضمن العاملين الحاليين (لا يظهر هنا)
    if(activeOrig)return;
    var full=active.filter(function(x){return x.type==='منتدب إلينا كلي';})[0], partial=active.filter(function(x){return x.type==='منتدب إلينا جزئي';})[0];
    /*
     * الندب الكلي خارج الإدارة علاقة/حالة واحدة في نفس سجل المدرسة الأصلية.
     * في الحصر تُحفظ العلاقة غالبًا كـ «أصلي» لكن حالتها تصبح «منتدب كليًا لجهة أخرى»،
     * لذلك لا يجوز اعتبار العامل «خارج الكشف» لمجرد أن v36ActiveRel_ لا يعتبر هذه
     * الحالة علاقة نشطة.
     */
    var externalFull=rs.filter(function(x){
      if(String(x.schoolId)!==String(s.schoolId))return false;
      return /^منتدب كليًا لجهة أخرى/.test(String(x.status||'')) || /منتدب كليًا خارج الإدارة/.test(String(x.note||''));
    })[0];
    var externalPartial=rs.filter(function(x){
      if(String(x.schoolId)!==String(s.schoolId))return false;
      return /منتدب جزئيًا خارج الإدارة/.test(String(x.note||''));
    })[0];
    var workStatus=schoolV31Val_(r,ei,'الحالة_الوظيفية'), recordStatus=schoolV31Val_(r,ei,'حالة_السجل'), present=schoolV31Val_(r,ei,'قائم_بالعمل'), reason=schoolV31Val_(r,ei,'سبب_عدم_القيام');
    var state=externalFull?'أصلي — منتدب كلي خارج الإدارة':externalPartial?'أصلي — منتدب جزئي خارج الإدارة':full?'منتدب كلي':partial?'منتدب جزئي':/إجاز/.test(workStatus)?'إجازة':(recordStatus==='غير قائم'?'غير قائم':'خارج الكشف');
    var externalPlace='';
    if(externalFull){
      var mn=String(externalFull.note||'');
      externalPlace=(mn.split(':').slice(1).join(':')||'').replace(/^\s+|\s+$/g,'');
      if(!externalPlace)externalPlace=String(reason||'').replace(/^منتدب كليًا خارج الإدارة:?\s*/,'').trim();
    }else if(externalPartial){
      var mp=String(externalPartial.note||'');
      externalPlace=(mp.split(':').slice(1).join(':')||'').replace(/^\s+|\s+$/g,'');
    }
    var current=externalFull?(externalPlace||'جهة خارج الإدارة'):externalPartial?(externalPlace||'جهة خارج الإدارة'):active.map(function(x){return names[x.schoolId]||x.schoolId;}).join('، ');
    var workerFields={};(typeof V35_WORKER_FIELDS!=='undefined'?V35_WORKER_FIELDS:[]).forEach(function(k){workerFields[k]=schoolV31Val_(r,ei,k);});
    var currentRelation=null;
    var loanRel=rs.filter(function(x){return String(x.schoolId)===String(s.schoolId)&&/^معار/.test(String(x.status||''));})[0];   // V7.58
    var leaveRel=rs.filter(function(x){return String(x.schoolId)===String(s.schoolId)&&/^إجازة/.test(String(x.status||''));})[0];   // V7.58
    if(recordStatus!=='غير قائم'&&loanRel) currentRelation={type:'أصلي',status:loanRel.status,note:loanRel.note,label:'إعارة'};
    else if(recordStatus!=='غير قائم'&&leaveRel&&!externalFull) currentRelation={type:'',status:leaveRel.status,note:leaveRel.note,label:'إجازة'};
    else if(externalFull) currentRelation={type:'أصلي',status:externalFull.status,note:externalFull.note,label:'أصلي ومنتدب من عندنا كليًا خارج الإدارة'};
    else if(externalPartial) currentRelation={type:'أصلي',status:externalPartial.status,note:externalPartial.note,label:'أصلي ومنتدب جزئيًا خارج الإدارة'};
    else if(full) currentRelation={type:full.type,status:full.status,note:full.note,label:'أصلي ومنتدب من عندنا كليًا داخل الإدارة'};
    else if(partial) currentRelation={type:partial.type,status:partial.status,note:partial.note,label:'أصلي ومنتدب من عندنا جزئيًا داخل الإدارة'};
    else {
      var suspended=rs.filter(function(x){return /^معلقة/.test(String(x.status||''));})[0];
      if(/^إجاز/.test(workStatus)) currentRelation={type:'',status:'',note:'',label:'إجازة'};
      else if(recordStatus==='غير قائم'){
        var whyEnd=String(schoolV31Val_(r,ei,'سبب_إنهاء_الخدمة')||reason||'');
        if(/وفا/.test(whyEnd)) currentRelation={type:'',status:'',note:whyEnd,label:'وفاة'};
        else if(/معاش/.test(whyEnd)) currentRelation={type:'',status:'',note:whyEnd,label:'معاش'};
        else if(/نقل/.test(whyEnd)) currentRelation={type:'',status:'',note:whyEnd,label:'نقل خارج الإدارة'};
        else currentRelation={type:'',status:'',note:whyEnd,label:'إنهاء خدمة'};
      } else if(suspended) currentRelation={type:suspended.type,status:suspended.status,note:suspended.note,label:'غير معروف للمدرسة'};
      else currentRelation={type:'',status:'',note:'',label:'غير معروف للمدرسة'};
    }
    out.push({employeeId:id,fields:workerFields,name:schoolV31Val_(r,ei,'الاسم'),nationalId:schoolV31Val_(r,ei,'الرقم_القومي'),job:schoolV31Val_(r,ei,'المسمى_الوظيفي'),subject:schoolV31Val_(r,ei,'مادة_التدريس'),code:schoolV31Val_(r,ei,'كود_الموظف'),phone:schoolV31Val_(r,ei,'الهاتف'),email:schoolV31Val_(r,ei,'البريد'),address:schoolV31Val_(r,ei,'العنوان'),degree:schoolV31Val_(r,ei,'الدرجة_المالية'),stage:schoolV31Val_(r,ei,'المرحلة_التعليمية_الأصلية'),workSystem:schoolV31Val_(r,ei,'نظام_العمل'),supervisoryJob:schoolV31Val_(r,ei,'الوظيفة_الإشرافية'),employmentStatus:(recordStatus==='غير قائم'||/^(متوفى|منتهى الخدمة|مستقيل|معاش|نقل خارج الإدارة|غير قائم)/.test(String(workStatus||'')))?'غير قائم':'قائم',recordStatus:recordStatus,present:present,reason:reason,state:currentRelation.label,currentSchools:current,secondmentSchoolId:full?full.schoolId:(partial?partial.schoolId:''),secondmentType:full?full.type:(partial?partial.type:''),relationHistory:rs,currentRelation:currentRelation});
  });
  out.sort(function(a,b){return a.name.localeCompare(b.name,'ar');});
  return {success:true,schoolId:s.schoolId,schoolName:s.school,total:out.length,rows:out};
}

function schoolValidateWorkerPayloadV94_(payload,current,employeeId){
  var p=payload||{}, cur=current||{};
  if(p['الاسم']!==undefined)throw new Error('الاسم ثابت ولا يمكن للمدرسة تعديله.');
  if(p['الرقم_القومي']!==undefined)throw new Error('الرقم القومي ثابت ولا يمكن للمدرسة تعديله.');
  if(p['النوع']!==undefined)throw new Error('النوع لا يُعدّل يدويًا؛ يُستخرج من الرقم القومي.');
  if(p['تاريخ_الميلاد']!==undefined)throw new Error('تاريخ الميلاد لا يُعدّل يدويًا؛ يُستخرج من الرقم القومي.');
  if(p['كود_الموظف']!==undefined){var code=String(p['كود_الموظف']||'').trim();if(!code)throw new Error('كود الموظف لا يمكن أن يكون فارغًا.');if(code.length>60)throw new Error('كود الموظف طويل بصورة غير صحيحة.');try{var ed=v24Data_('01_الأساسي'),ei0=schoolV31Idx_(ed.headers);if(ed.rows.some(function(rr){return String(schoolV31Val_(rr,ei0,'employeeId'))!==String(employeeId||'')&&String(schoolV31Val_(rr,ei0,'كود_الموظف')).trim()===code;}))throw new Error('كود الموظف مسجل بالفعل لعامل آخر.');}catch(eCode){if(String(eCode.message||eCode).indexOf('مسجل بالفعل')>=0)throw eCode;}}
  if(p['النوع']!==undefined&&String(p['النوع']).trim()&&['ذكر','أنثى'].indexOf(String(p['النوع']).trim())<0)throw new Error('النوع يجب أن يكون ذكر أو أنثى.');
  if(p['الهاتف']!==undefined&&String(p['الهاتف']).trim()&&!/^[0-9٠-٩۰-۹+()\-\s]{7,20}$/.test(String(p['الهاتف']).trim()))throw new Error('رقم الهاتف غير صحيح.');
  if(p['البريد']!==undefined&&String(p['البريد']).trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(p['البريد']).trim()))throw new Error('البريد الإلكتروني غير صحيح.');
  ['تاريخ_الميلاد','تاريخ_التعيين','تاريخ_بدء_العمل','تاريخ_الحصول_على_الدرجة'].forEach(function(k){if(p[k]!==undefined&&String(p[k]).trim()&&!v35Date_(p[k]))throw new Error('التاريخ غير صحيح في: '+k);});
  if(p['تاريخ_الميلاد']!==undefined&&String(p['تاريخ_الميلاد']).trim()){var nid=v24DigitsLocalV31_(cur['الرقم_القومي']||'');var nv=v24ValidateNationalIdV40_(nid);if(nv.valid&&v35Date_(p['تاريخ_الميلاد'])!==nv.birthDate)throw new Error('تاريخ الميلاد لا يطابق الرقم القومي المسجل.');}
  if(p['مشرف_على_المادة']!==undefined&&['نعم','لا'].indexOf(String(p['مشرف_على_المادة']).trim())<0)throw new Error('مشرف على المادة يجب أن يكون نعم أو لا.');
  if(p['المسمى_الوظيفي']!==undefined)v67GuardJob_(p['المسمى_الوظيفي']);
  if(p['مادة_التدريس']!==undefined)v72GuardSubject_(p['مادة_التدريس']);
  var finalJob=p['المسمى_الوظيفي']!==undefined?String(p['المسمى_الوظيفي']||'').trim():String(cur['المسمى_الوظيفي']||'').trim();
  var finalSup=p['الوظيفة_الإشرافية']!==undefined?String(p['الوظيفة_الإشرافية']||'').trim():String(cur['الوظيفة_الإشرافية']||'').trim();
  if(p['الوظيفة_الإشرافية']!==undefined&&finalSup&&schoolSupervisoryOptionsV40_(false).indexOf(finalSup)<0)throw new Error('الوظيفة الإشرافية غير موجودة في القائمة المعتمدة.');
  if(p['نظام_العمل']!==undefined)v67GuardSystem_(finalJob,finalSup,p['نظام_العمل'],cur['نظام_العمل']);
  if(p['نظام_العمل']!==undefined)v40EnforceLeadershipSystem_(finalJob,p['نظام_العمل']);
  return true;
}

function v95FormerRelationMeta_(label){
  var m=typeof v81RelationMeta_==='function'?v81RelationMeta_(label):null;
  if(!m)throw new Error('الحالة / العلاقة غير موجودة في القائمة الموحدة.');
  return m;
}
function v95OtherActiveSchools_(employeeId, currentSchoolId){
  var rel=v24Data_('04_علاقات_المدارس'),ri=schoolV31Idx_(rel.headers),out=[];
  rel.rows.forEach(function(r){
    if(String(schoolV31Val_(r,ri,'employeeId'))!==String(employeeId))return;
    if(String(schoolV31Val_(r,ri,'schoolId'))===String(currentSchoolId))return;
    if(!v36ActiveRel_(schoolV31Val_(r,ri,'الحالة')))return;
    out.push({schoolId:schoolV31Val_(r,ri,'schoolId'),type:schoolV31Val_(r,ri,'نوع_العلاقة'),status:schoolV31Val_(r,ri,'الحالة')});
  });
  return out;
}
function v95SetRelationStatus_(employeeId,schoolId,status,note){
  var sh=v36Sheet_('04_علاقات_المدارس'),h=v36Headers_(sh),ix=schoolV31Idx_(h),v=sh.getDataRange().getDisplayValues(),found=false;
  for(var i=1;i<v.length;i++){
    if(String(v[i][ix.employeeId]).trim()!==String(employeeId)||String(v[i][ix.schoolId]).trim()!==String(schoolId))continue;
    var row=i+1;
    if(ix['الحالة']!=null)v50A_(sh.getRange(row,ix['الحالة']+1).setValue(status));
    if(ix['ملاحظات']!=null&&note!==undefined)v50A_(sh.getRange(row,ix['ملاحظات']+1).setValue(note||''));
    found=true;break;
  }
  return found;
}
function v95ApplyFormerRelation_(actor,employeeId,schoolId,label,targetSchoolName,external,date,note){
  var meta=v95FormerRelationMeta_(label),targetId='';
  if(meta.detail==='school'){
    var td=v24Data_('18_بيانات_المدارس'),ti=schoolV31Idx_(td.headers);
    for(var i=0;i<td.rows.length;i++)if(String(schoolV31Val_(td.rows[i],ti,'اسم_المدرسة'))===String(targetSchoolName).trim()){targetId=schoolV31Val_(td.rows[i],ti,'schoolId');break;}
    if(!targetId)throw new Error('المدرسة المطلوبة غير موجودة.');
    if(String(targetId)===String(schoolId))throw new Error('المدرسة المطلوبة هي نفس المدرسة الحالية.');
  }
  var e=v36EmployeeRow_(employeeId), reasonText=String(external||note||'').trim();
  if(meta.code==='ORIG'){
    v36CloseRelations_(employeeId,'','تغيير الحالة إلى أصلي'+(note?' — '+note:''));
    v36AddRelation_(employeeId,schoolId,'أصلي','بوابة المدرسة','إعادة الحالة إلى أصلي'+(note?' — '+note:''));
    v36SetCells_(e,{originalSchoolId:schoolId,'الحالة_الوظيفية':'قائم','حالة_السجل':'قائم','قائم_بالعمل':'نعم','سبب_عدم_القيام':''});
  }else if(meta.code==='IN_FULL_IN'){
    v36CloseRelations_(employeeId,'','ندب كلي إلى '+v36SchoolName_(targetId));
    v36AddRelation_(employeeId,targetId,'منتدب إلينا كلي','بوابة المدرسة','ندب كلي من '+v36SchoolName_(schoolId)+(note?' — '+note:''));
    v36SetCells_(e,{'الحالة_الوظيفية':'قائم','حالة_السجل':'قائم','قائم_بالعمل':'نعم','سبب_عدم_القيام':''});
  }else if(meta.code==='IN_PART'){
    v36AddRelation_(employeeId,targetId,'منتدب إلينا جزئي','بوابة المدرسة','ندب جزئي من '+v36SchoolName_(schoolId)+(note?' — '+note:''));
    v36SetCells_(e,{'الحالة_الوظيفية':'قائم','حالة_السجل':'قائم','قائم_بالعمل':'نعم','سبب_عدم_القيام':''});
  }else if(meta.code==='OUT_FULL_IN'){
    v36CloseRelations_(employeeId,'','ندب كلي داخل الإدارة إلى '+v36SchoolName_(targetId));
    v36AddRelation_(employeeId,targetId,'منتدب إلينا كلي','بوابة المدرسة','أصلي بالمدرسة وندب كلي داخل الإدارة من '+v36SchoolName_(schoolId)+(note?' — '+note:''));
    v36AddRelation_(employeeId,schoolId,'أصلي','بوابة المدرسة','العلاقة الأصلية مع ندب كلي داخل الإدارة');
    v36SetCells_(e,{originalSchoolId:schoolId,'الحالة_الوظيفية':'قائم','حالة_السجل':'قائم','قائم_بالعمل':'نعم','سبب_عدم_القيام':''});
  }else if(meta.code==='OUT_FULL_OUT'){
    v95SetRelationStatus_(employeeId,schoolId,'منتدب كليًا لجهة أخرى','منتدب كليًا خارج الإدارة: '+reasonText);
    v36SetCells_(e,{originalSchoolId:schoolId,'الحالة_الوظيفية':'قائم','حالة_السجل':'قائم','قائم_بالعمل':'لا','سبب_عدم_القيام':'منتدب كليًا خارج الإدارة: '+reasonText});
  }else if(meta.code==='OUT_PART'){
    v36AddRelation_(employeeId,targetId,'منتدب إلينا جزئي','بوابة المدرسة','أصلي بالمدرسة وندب جزئي داخل الإدارة من '+v36SchoolName_(schoolId)+(note?' — '+note:''));
    v36AddRelation_(employeeId,schoolId,'أصلي','بوابة المدرسة','العلاقة الأصلية مع ندب جزئي داخل الإدارة');
    v36SetCells_(e,{originalSchoolId:schoolId,'الحالة_الوظيفية':'قائم','حالة_السجل':'قائم','قائم_بالعمل':'نعم','سبب_عدم_القيام':''});
  }else if(meta.code==='OUT_PART_OUT'){
    // V7.58: مثل الحصر — يظل أصليًا وقائمًا بالعمل عندنا، ويُسجَّل الندب الجزئي الخارجي في ملاحظات علاقته الأصلية.
    v102SetRel_(employeeId,schoolId,'نشطة','أصلي ومنتدب جزئيًا خارج الإدارة: '+reasonText,true);
    v36SetCells_(e,{originalSchoolId:schoolId,'الحالة_الوظيفية':'قائم','حالة_السجل':'قائم','قائم_بالعمل':'نعم','سبب_عدم_القيام':''});
  }else if(meta.code==='LEAVE'){
    // V7.58: الإجازة تُسجَّل في العلاقة فقط (مثل الحصر)؛ الحالة الوظيفية تبقى «قائم».
    v102SetRel_(employeeId,schoolId,'إجازة','إجازة'+(note?' — '+note:''),false);
    v36SetCells_(e,{'الحالة_الوظيفية':'قائم','حالة_السجل':'قائم','قائم_بالعمل':'لا','سبب_عدم_القيام':note||'إجازة'});
  }else if(meta.code==='TR_IN'){
    v36AddRelation_(employeeId,targetId,'أصلي','بوابة المدرسة','نقل داخل الإدارة من '+v36SchoolName_(schoolId)+(note?' — '+note:''));
    v36CloseRelations_(employeeId,schoolId,'نقل إلى '+v36SchoolName_(targetId));
    v36SetCells_(e,{originalSchoolId:targetId,'الحالة_الوظيفية':'قائم','حالة_السجل':'قائم','قائم_بالعمل':'نعم','سبب_عدم_القيام':''});
  }else if(meta.code==='TR_OUT'||meta.code==='PENSION'||meta.code==='DEATH'||meta.code==='END'){
    // V7.58: كل من خرج من الإدارة أو توفي أو أُحيل للمعاش أو انتهت خدمته = «غير قائم» (مثل الحصر)، والسبب في «سبب_إنهاء_الخدمة».
    var why=v102EndWhy_(meta.code,reasonText,note);
    v36CloseRelations_(employeeId,'',why);
    v36SetCells_(e,{'الحالة_الوظيفية':'غير قائم','حالة_السجل':'غير قائم','قائم_بالعمل':'لا','سبب_عدم_القيام':why,'تاريخ_إنهاء_الخدمة':date||new Date(),'سبب_إنهاء_الخدمة':why});
  }else if(meta.code==='LOAN'){
    // V7.58: إعارة — تابع لمدرسته الأصلية وقائم في السجل، وغير قائم بالعمل لدينا.
    v102SetRel_(employeeId,schoolId,'معار','إعارة: '+reasonText,false);
    v36SetCells_(e,{originalSchoolId:schoolId,'الحالة_الوظيفية':'قائم','حالة_السجل':'قائم','قائم_بالعمل':'لا','سبب_عدم_القيام':'إعارة: '+reasonText});
  }else if(meta.code==='ABSENT'||meta.code==='SUSP'){
    // V7.58: منقطع / موقوف عن العمل — يبقى في كشف مدرسته، وغير قائم بالعمل (لا يدخل الاستحقاقات).
    v102EnsureActive_(employeeId,schoolId);
    v36SetCells_(e,{'الحالة_الوظيفية':'قائم','حالة_السجل':'قائم','قائم_بالعمل':'لا','سبب_عدم_القيام':meta.label+(note?' — '+note:'')});
  }else if(meta.code==='UNKNOWN'){
    v95SetRelationStatus_(employeeId,schoolId,'معلقة','غير معروف للمدرسة'+(note?' — '+note:''));
    v36SetCells_(e,{'قائم_بالعمل':'لا','سبب_عدم_القيام':note||'غير معروف للمدرسة'});
  }else throw new Error('لا يوجد تنفيذ معتمد للحالة: '+label);
  schoolV31Log_(actor,'تغيير حالة/علاقة عامل',employeeId,[['الحالة الجديدة','',label],['المدرسة','',targetSchoolName||''],['الجهة الخارجية','',external||''],['التاريخ','',date||''],['ملاحظة','',note||'']]);
  v50Invalidate_('04_علاقات_المدارس');v50Invalidate_('01_الأساسي');
  return 'تم تنفيذ «'+label+'» مباشرة.';
}

function schoolRequestFormerWorkerStatusV94(token,employeeId,relationLabel,targetSchool,external,date,note){
  var s=schoolV31Session_(token);schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  var id=String(employeeId||'').trim(),label=String(relationLabel||'').trim(),target=String(targetSchool||'').trim(),ext=String(external||'').trim(),dt=String(date||'').trim(),rs=String(note||'').trim();
  var meta=v95FormerRelationMeta_(label); if(!id)throw new Error('العامل غير محدد.');
  if(meta.detail==='school'&&!target)throw new Error('اختر المدرسة المطلوبة.');
  if((meta.detail==='text'||meta.detail==='textpart')&&!ext)throw new Error('اكتب اسم الجهة خارج الإدارة.');
  if(meta.code==='LEAVE'){
    var lt='';
    var mlt=rs.match(/(?:^|[—|])\s*نوع الإجازة\s*:\s*([^—|]+)/);
    if(mlt)lt=String(mlt[1]||'').trim();
    var leaveList=(typeof V65_LEAVES!=='undefined'&&V65_LEAVES)?V65_LEAVES:[];
    if(!lt||leaveList.indexOf(lt)<0)throw new Error('اختر نوع إجازة صحيحًا مثل الحصر.');
  }
  if(meta.code==='END'&&!v102EndType_(rs))throw new Error('اختر نوع إنهاء الخدمة من القائمة.');   // V7.58
  // جميع التواريخ اختيارية: تُحفظ عند إدخالها فقط ولا تمنع تنفيذ تغيير الحالة عند تركها فارغة.
  var emp=v24Data_('01_الأساسي'),ei=schoolV31Idx_(emp.headers),er=null;for(var i=0;i<emp.rows.length;i++)if(schoolV31Val_(emp.rows[i],ei,'employeeId')===id){er=emp.rows[i];break;}
  if(!er||v94OriginalSchoolId_(er,ei)!==String(s.schoolId))throw new Error('هذا العامل ليس أصليًا بهذه المدرسة.');
  var others=v95OtherActiveSchools_(id,s.schoolId);
  if(others.length){
    var sh=v36Sheet_('09_طلبات_متبادلة');['statusRelation','targetSchool','targetText','statusDate'].forEach(function(k){if(v36Headers_(sh).indexOf(k)<0)schoolEnsureWorkerColumnV40_(sh,k);});var h=v36Headers_(sh),ix=schoolV31Idx_(h),rowFields={نوع_الطلب:'تغيير علاقة',نوع_الموظف:'أساسي',employeeId:id,fromSchoolId:others[0].schoolId,toSchoolId:s.schoolId,'مُبادر':s.schoolId,السبب:rs||label,المستخدم_الطالب:s.username||s.school,'الحالة':'مفتوح',statusRelation:label,targetSchool:target,targetText:ext,statusDate:dt};
    var rid=v40ReqAdd_(rowFields); schoolV31Log_(s,'طلب تغيير علاقة — بانتظار المدرسة المرتبطة',id,[['الحالة الجديدة','',label],['المدرسة المطلوب موافقتها','',v40Names_(others[0].schoolId)]]);
    return{success:true,pending:true,message:'العامل مرتبط بمدرسة أخرى «'+v40Names_(others[0].schoolId)+'»؛ تم إرسال طلب التغيير إليها، ولن يتغير السجل قبل موافقتها.',requestId:rid};
  }
  return v35Lock_(function(){v50Fresh_();var msg=v95ApplyFormerRelation_(v36Actor_(s),id,s.schoolId,label,target,ext,dt,rs);return{success:true,pending:false,message:msg};});
}

function schoolRelationChangeRequestsV95(token){
  var s=schoolV31Session_(token);schoolV31Allowed_('SCHOOL_BASIC_VIEW');
  var mine=v40ReqList_(function(x){return String(x['نوع_الطلب']||'')==='تغيير علاقة'&&(String(x.fromSchoolId)===String(s.schoolId)||String(x.toSchoolId)===String(s.schoolId));});
  var names={};try{var ed=v24Data_('01_الأساسي'),ei=schoolV31Idx_(ed.headers);ed.rows.forEach(function(r){names[schoolV31Val_(r,ei,'employeeId')]=schoolV31Val_(r,ei,'الاسم');});}catch(e){}
  return{success:true,rows:mine.map(function(x){return{requestId:x.requestId,employeeId:x.employeeId,employeeName:names[x.employeeId]||x.employeeId,type:x.statusRelation||'تغيير علاقة',from:v40Names_(x.fromSchoolId),to:v40Names_(x.toSchoolId),initiator:v40Names_(x['مُبادر']),reason:x['السبب']||'',status:x['الحالة']||'',canDecide:x['الحالة']==='مفتوح'&&String(x['مُبادر'])!==String(s.schoolId),canCancel:x['الحالة']==='مفتوح'&&String(x['مُبادر'])===String(s.schoolId)};}).sort(function(a,b){return String(b.requestId).localeCompare(String(a.requestId));})};
}
function schoolDecideRelationChangeV95(token,requestId,decision,note){
  var s=schoolV31Session_(token);schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  if(['موافقة','رفض'].indexOf(decision)<0)throw new Error('القرار غير صالح.');
  return v35Lock_(function(){v50Fresh_();var rq=v40ReqFind_(requestId),v=rq.vals,ix=rq.ix;if(String(v[ix['نوع_الطلب']])!=='تغيير علاقة')throw new Error('هذا الطلب ليس تغيير علاقة.');if(v[ix['الحالة']]!=='مفتوح')throw new Error('الطلب سبق البت فيه.');var from=v[ix.fromSchoolId],to=v[ix.toSchoolId],approver=(String(v[ix['مُبادر']])===String(from)?to:from);if(String(approver)!==String(s.schoolId))throw new Error('هذا الطلب ليس بانتظار موافقة مدرستك.');if(decision==='موافقة'){var actor=v36Actor_(s);v95ApplyFormerRelation_(actor,v[ix.employeeId],to,v[ix.statusRelation],v[ix.targetSchool],v[ix.targetText],v[ix.statusDate],v[ix['السبب']]||note||'');}v93Stamp_(rq,ix,decision==='موافقة'?'تمت الموافقة':'مرفوض',s.username||s.school,note||'');v50Invalidate_(V40_REQ_SHEET);return{success:true,message:decision==='موافقة'?'تمت الموافقة وتنفيذ تغيير العلاقة.':'تم رفض طلب تغيير العلاقة.'};});
}

/** طلب تعديل بيانات للعامل الأصلي السابق — لا يشترط وجود علاقة نشطة. */
function schoolRequestFormerWorkerEditV94(token,employeeId,field,newValue,reason){
  var s=schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  var id=String(employeeId||'').trim(), k=String(field||'').trim(), nv=schoolV31Clean_(newValue), why=String(reason||'').trim();
  if(!id||!k)throw new Error('بيانات طلب التعديل غير مكتملة.');
  var formerEditable=SCHOOL_V32_SENSITIVE_FIELDS.concat(SCHOOL_V32_DIRECT_FIELDS).filter(function(x,i,a){return a.indexOf(x)===i&&['employeeId','originalSchoolId','الاسم','الرقم_القومي','النوع','تاريخ_الميلاد'].indexOf(x)<0;});
  if(formerEditable.indexOf(k)<0)throw new Error('هذا الحقل لا يُعدّل من هذا المسار.');
  var emp=v24Data_('01_الأساسي'),ei=schoolV31Idx_(emp.headers),er=null;
  for(var i=0;i<emp.rows.length;i++)if(schoolV31Val_(emp.rows[i],ei,'employeeId')===id){er=emp.rows[i];break;}
  if(!er||v94OriginalSchoolId_(er,ei)!==String(s.schoolId))throw new Error('هذا العامل ليس أصليًا بهذه المدرسة.');
  // V7.62: لو العامل له علاقة نشطة بالمدرسة فهو من العاملين الحاليين — يُحفظ التعديل مباشرة (بدون طلب للإدارة).
  var rl=v24Data_('04_علاقات_المدارس'),rli=schoolV31Idx_(rl.headers);
  if(rl.rows.some(function(r){return schoolV31Val_(r,rli,'employeeId')===id&&schoolV31Val_(r,rli,'schoolId')===String(s.schoolId)&&v36ActiveRel_(schoolV31Val_(r,rli,'الحالة'));})){var pd={};pd[k]=newValue;var rd=schoolSaveWorkerV33(token,id,pd);rd.direct=true;rd.message='تم حفظ التعديل مباشرة (العامل على قوة المدرسة).';return rd;}
  var current={};emp.headers.forEach(function(hh,jj){current[hh]=er[jj]||'';});var pp={};pp[k]=nv;schoolValidateWorkerPayloadV94_(pp,current,id);var old=schoolV31Val_(er,ei,k); if(old===nv)throw new Error('القيمة الجديدة مطابقة للقيمة الحالية.');
  var sh=personnelSS_().getSheetByName(SCHOOL_V31_REQUESTS_SHEET); if(!sh)throw new Error('ورقة طلبات العاملين غير موجودة.');
  var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],x=schoolV31Idx_(h),row=new Array(h.length).fill('');
  function put(k2,v){if(x[k2]!=null)row[x[k2]]=schoolV31Clean_(v);}
  put('requestId','REQ_'+Utilities.getUuid().replace(/-/g,'').slice(0,20));put('employeeId',id);put('الرقم_القومي',schoolV31Val_(er,ei,'الرقم_القومي'));put('schoolId',s.schoolId);put('اسم_المدرسة',s.school);put('نوع_الطلب','طلب تعديل بيانات عامل');put('الحقل_المطلوب_تعديله',k);put('القيمة_القديمة',old);put('القيمة_الجديدة',nv);put('سبب_الطلب',why||'عامل أصلي خارج المدرسة');put('الحالة','مفتوح');put('المستخدم_الطالب',s.username);put('تاريخ_الطلب',new Date());
  v50A_(sh.appendRow(row)); schoolV31Log_(s,'طلب تعديل بيانات عامل أصلي خارج المدرسة',id,[[k,old,nv]]);
  return {success:true,message:'تم إرسال طلب تعديل البيانات إلى الإدارة.',requestId:row[x.requestId]||''};
}

/** طلب عودة العامل الأصلي إلى العمل. القرار النهائي للإدارة. */
function schoolRequestFormerWorkerReturnV94(token,employeeId,note){
  var s=schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  var id=String(employeeId||'').trim(), emp=v24Data_('01_الأساسي'), rel=v24Data_('04_علاقات_المدارس'), ei=schoolV31Idx_(emp.headers),ri=schoolV31Idx_(rel.headers),er=null;
  for(var i=0;i<emp.rows.length;i++)if(schoolV31Val_(emp.rows[i],ei,'employeeId')===id){er=emp.rows[i];break;}
  if(!er||v94OriginalSchoolId_(er,ei)!==String(s.schoolId))throw new Error('هذا العامل ليس أصليًا بهذه المدرسة.');
  var active=rel.rows.filter(function(r){return schoolV31Val_(r,ri,'employeeId')===id&&v36ActiveRel_(schoolV31Val_(r,ri,'الحالة'));});
  var full=active.filter(function(r){return schoolV31Val_(r,ri,'نوع_العلاقة')==='منتدب إلينا كلي';})[0];
  if(full){
    return schoolRequestSecondmentCancelV82(token,id,schoolV31Val_(full,ri,'schoolId'),note||'طلب عودة العامل الأصلي إلى مدرسته.');
  }
  var open=v40ReqList_(function(x){return String(x.employeeId)===id&&x['الحالة']==='مفتوح'&&x['نوع_الطلب']==='طلب عودة للعمل';});
  if(open.length)throw new Error('يوجد بالفعل طلب عودة مفتوح لهذا العامل.');
  var rid=v40ReqAdd_({نوع_الطلب:'طلب عودة للعمل',نوع_الموظف:'أساسي',employeeId:id,fromSchoolId:s.schoolId,toSchoolId:s.schoolId,مُبادر:s.schoolId,السبب:note||'طلب عودة العامل الأصلي إلى العمل',المستخدم_الطالب:s.username||s.school});
  schoolV31Log_(s,'طلب عودة عامل أصلي للعمل',id,[['المدرسة',s.school,s.school]]);
  return {success:true,pending:true,message:'تم إرسال طلب العودة إلى الإدارة للمراجعة.',requestId:rid};
}

function v94ApplyFormerReturn_(admin,employeeId,schoolId,reason){
  return v35Lock_(function(){
    v50Fresh_();
    var emp=v24Data_('01_الأساسي'),rel=v24Data_('04_علاقات_المدارس'),ei=schoolV31Idx_(emp.headers),ri=schoolV31Idx_(rel.headers),er=null;
    for(var i=0;i<emp.rows.length;i++)if(schoolV31Val_(emp.rows[i],ei,'employeeId')===String(employeeId)){er=emp.rows[i];break;}
    if(!er)throw new Error('العامل غير موجود.');
    var original=String(schoolV31Val_(er,ei,'originalSchoolId')||'');if(original!==String(schoolId))throw new Error('المدرسة الأصلية المسجلة لا تطابق الطلب.');
    if(schoolV31Val_(er,ei,'تاريخ_إنهاء_الخدمة'))throw new Error('لا يمكن إرجاع عامل انتهت خدمته.');
    var active=rel.rows.filter(function(r){return schoolV31Val_(r,ri,'employeeId')===String(employeeId)&&v36ActiveRel_(schoolV31Val_(r,ri,'الحالة'));});
    if(active.some(function(r){return schoolV31Val_(r,ri,'نوع_العلاقة')==='منتدب إلينا كلي';}))throw new Error('العامل منتدب كليًا حاليًا؛ استخدم مسار إلغاء الندب.');
    if(!active.some(function(r){return String(schoolV31Val_(r,ri,'schoolId'))===String(schoolId)&&schoolV31Val_(r,ri,'نوع_العلاقة')==='أصلي';}))v36AddRelation_(employeeId,schoolId,'أصلي','عودة للعمل','عودة بعد '+(reason||'مراجعة الإدارة'));
    v36SetCells_(v36EmployeeRow_(employeeId),{'originalSchoolId':schoolId,'الحالة_الوظيفية':'قائم','حالة_السجل':'قائم','قائم_بالعمل':'نعم','سبب_عدم_القيام':''});
    schoolV31Log_(v36Actor_(admin),'إعادة عامل أصلي إلى العمل',employeeId,[['المدرسة', '', v40Names_(schoolId)],['السبب','',reason||'']]);
    v50Invalidate_('04_علاقات_المدارس');v50Invalidate_('01_الأساسي');
    return {success:true,message:'تمت إعادة العامل إلى العمل بمدرسته الأصلية.'};
  });
}

/** تدخل الإدارة في مشكلة جودة واحدة، مع إجراءات محددة ومراجعة سجلية. */
function adminDataQualityFixV94(token,payload){
  var a=v35Admin_(token), p=payload||{}, kind=String(p.kind||''), eid=String(p.employeeId||'').trim(), sid=String(p.schoolId||'').trim(), value=p.value;
  if(!eid&&kind!=='SCHOOL_NO_STAGE')throw new Error('العامل غير محدد.');
  if(kind==='NO_SUBJECT')return adminSaveWorkerV35(token,eid,{'مادة_التدريس':String(value||'').trim()});
  if(kind==='NONSTD_JOB')return adminSaveWorkerV35(token,eid,{'المسمى_الوظيفي':String(value||'').trim()});
  if(kind==='NO_FIN_SYSTEM')return adminSaveWorkerV35(token,eid,{'نظام_العمل':String(value||'').trim()});
  if(kind==='FIN_NOT_ELIGIBLE')return adminSaveWorkerV35(token,eid,{'نظام_العمل':''});
  if(kind==='BAD_NID')return adminSaveWorkerV35(token,eid,{'الرقم_القومي':String(value||'').trim()});
  if(kind==='LEAD_AS_JOB'){var lv=(value&&typeof value==='object')?value:{sup:value},lp={'الوظيفة_الإشرافية':String(lv.sup||'').trim()};if(String(lv.job||'').trim())lp['المسمى_الوظيفي']=String(lv.job).trim();return adminSaveWorkerV35(token,eid,lp);}   // V7.62: الوظيفة الإشرافية + المسمى الحقيقي معًا
  if(kind==='NO_RELATION'){
    if(!sid)throw new Error('اختر المدرسة الأصلية.');
    return v35Lock_(function(){v50Fresh_();var e=v36EmployeeRow_(eid),rels=v24Data_('04_علاقات_المدارس'),ri=schoolV31Idx_(rels.headers);if(rels.rows.some(function(r){return schoolV31Val_(r,ri,'employeeId')===eid&&schoolV31Val_(r,ri,'schoolId')===sid&&v36ActiveRel_(schoolV31Val_(r,ri,'الحالة'));}))throw new Error('العلاقة موجودة بالفعل.');v36AddRelation_(eid,sid,'أصلي','تصحيح جودة البيانات','إضافة علاقة أصلية بواسطة الإدارة');v36SetCells_(e,{originalSchoolId:sid,'حالة_السجل':'قائم'});schoolV31Log_(v36Actor_(a),'تصحيح جودة البيانات — إضافة علاقة أصلية',eid,[['المدرسة','',v40Names_(sid)]]);v50Invalidate_('04_علاقات_المدارس');v50Invalidate_('01_الأساسي');return{success:true,message:'تمت إضافة العلاقة الأصلية وتحديث المدرسة الأصلية.'};});
  }
  if(kind==='MULTI_ORIGINAL'){
    if(!sid)throw new Error('اختر المدرسة الأصلية التي ستبقى.');
    return v35Lock_(function(){var rel=v24Data_('04_علاقات_المدارس'),ri=schoolV31Idx_(rel.headers),n=0;rel.rows.forEach(function(r,i){if(schoolV31Val_(r,ri,'employeeId')!==eid||schoolV31Val_(r,ri,'نوع_العلاقة')!=='أصلي'||!v36ActiveRel_(schoolV31Val_(r,ri,'الحالة')))return;var rs=schoolV31Val_(r,ri,'schoolId');if(String(rs)!==String(sid)){var sh=v36Sheet_('04_علاقات_المدارس'),ix=schoolV31Idx_(v36Headers_(sh)),up={};if(ix['الحالة']!=null)up[ix['الحالة']+1]='غير نشطة';if(ix['تاريخ_النهاية']!=null)up[ix['تاريخ_النهاية']+1]=new Date();if(ix['سبب_الإنهاء']!=null)up[ix['سبب_الإنهاء']+1]='تصحيح تعدد العلاقات الأصلية';v50WriteRow_(sh,i+2,up);n++;}});v36SetCells_(v36EmployeeRow_(eid),{originalSchoolId:sid});v50Invalidate_('04_علاقات_المدارس');v50Invalidate_('01_الأساسي');return{success:true,message:'تم الإبقاء على العلاقة الأصلية المحددة وإغلاق '+n+' علاقة زائدة.'};});
  }
  if(kind==='HOST_AT_ORIGIN'){   // V7.62: تحويل علاقة «منتدب إلينا» في المدرسة الأصلية نفسها إلى «أصلي»
    return v35Lock_(function(){v50Fresh_();var e=v36EmployeeRow_(eid),os=String(e.sh.getRange(e.row,e.ix.originalSchoolId+1).getDisplayValue()||'').trim();if(!os)throw new Error('لا توجد مدرسة أصلية مسجلة.');
      var sh=v36Sheet_('04_علاقات_المدارس'),h=v36Headers_(sh),ix=schoolV31Idx_(h),n=sh.getLastRow()-1,v=n>0?sh.getRange(2,1,n,h.length).getValues():[],c=0;
      v.forEach(function(r,i){if(String(r[ix.employeeId]).trim()!==eid||String(r[ix.schoolId]).trim()!==os||!v36ActiveRel_(r[ix['الحالة']])||!/منتدب إلينا/.test(String(r[ix['نوع_العلاقة']]||'')))return;if(c){return;}r[ix['نوع_العلاقة']]='أصلي';if(ix.isOriginal!=null)r[ix.isOriginal]=true;v50A_(sh.getRange(i+2,1,1,h.length).setValues([r]));c++;});
      if(!c)throw new Error('لا توجد علاقة «منتدب إلينا» نشطة في مدرسته الأصلية.');
      schoolV31Log_(v36Actor_(a),'تصحيح جودة البيانات — منتدب إلينا في مدرسته الأصلية ← أصلي',eid,[['المدرسة','',v40Names_(os)]]);v50Invalidate_('04_علاقات_المدارس');
      return{success:true,message:'تم تحويل علاقته في مدرسته الأصلية إلى «أصلي».'};});
  }
  if(kind==='OFF_BUT_ACTIVE'){
    var mode=String(value||'');
    if(mode==='restore')return adminSaveWorkerV35(token,eid,{'حالة_السجل':'قائم','الحالة_الوظيفية':'قائم','قائم_بالعمل':'نعم','سبب_عدم_القيام':''});
    if(mode==='close')return v35Lock_(function(){var n=v36CloseRelations_(eid,'','تصحيح جودة البيانات — العامل غير قائم');v50Invalidate_('04_علاقات_المدارس');return{success:true,message:'تم إغلاق '+n+' علاقة نشطة للعامل.'};});
  }
  throw new Error('لا يوجد إجراء تصحيح آمن لهذه المشكلة حتى الآن.');
}
