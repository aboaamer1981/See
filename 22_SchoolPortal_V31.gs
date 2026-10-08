/** V3.9 — بوابة المدرسة الفعلية: العاملون + الصلاحيات + الطلبات
 * التشغيل من قاعدة شئون العاملين المحلية فقط. app4 غير مستخدم أثناء التشغيل.
 */
var SCHOOL_V31_REQUESTS_SHEET='15_طلبات_العاملين';
var SCHOOL_V31_BASIC_SHEET='01_الأساسي';
var SCHOOL_V31_REL_SHEET='04_علاقات_المدارس';
var SCHOOL_V32_DIRECT_FIELDS=['الرقم_القومي','كود_الموظف','الاسم','النوع','تاريخ_الميلاد','الهاتف','البريد','العنوان','الصفة','الحالة_الوظيفية','تاريخ_التعيين','الدرجة_المالية','تاريخ_الحصول_على_الدرجة','المجموعة_النوعية','المجموعة_الوظيفية','المسمى_الوظيفي','الوظيفة_الإشرافية','مادة_التدريس','المرحلة_التعليمية_الأصلية','نظام_العمل','مشرف_على_المادة'];
var SCHOOL_V32_SENSITIVE_FIELDS=['الاسم','النوع','الحالة_الوظيفية','الدرجة_المالية','تاريخ_الحصول_على_الدرجة','المجموعة_النوعية','المجموعة_الوظيفية','المسمى_الوظيفي','الوظيفة_الإشرافية','مادة_التدريس','المرحلة_التعليمية_الأصلية','نظام_العمل','مشرف_على_المادة'];

function schoolV31Session_(token){
  var s=getSchoolSessionV271(token);
  if(!s||(['مدرسة','خاص'].indexOf(s.role)<0)||!s.schoolId)throw new Error('جلسة المدرسة غير صالحة أو منتهية. سجّل الدخول من جديد.');
  return s;
}
function schoolV31Idx_(headers){var m={};(headers||[]).forEach(function(h,i){if(String(h||'').trim())m[String(h).trim()]=i;});return m;}
function schoolV31Val_(row,idx,k){var c=idx[k];return c==null?'':String(row[c]==null?'':row[c]).trim();}
function v36LatinDigits_(v){return String(v==null?'':v).replace(/[٠-٩]/g,function(c){return '٠١٢٣٤٥٦٧٨٩'.indexOf(c);}).replace(/[۰-۹]/g,function(c){return '۰۱۲۳۴۵۶۷۸۹'.indexOf(c);});}
function schoolV31Clean_(v){
  var s=v36LatinDigits_(v).trim();
  if(/^[=+\-@]/.test(s))s="'"+s;
  return s;
}
function schoolV31Feature_(key){
  // الصلاحية لا تعتبر مفعلة إلا بقيمة صريحة معروفة. أي قيمة أخرى = غير مفعلة.
  function stateEnabled_(x){
    x=String(x==null?'':x).trim().toLowerCase();
    return x==='true'||x==='1'||x==='مفعل'||x==='فعال'||x==='نشط'||x==='enabled';
  }
  try{
    var d=v24Data_('19_صلاحيات_الأدوار'), h=schoolV31Idx_(d.headers), rows=d.rows, found=false, enabled=false;
    rows.forEach(function(r){
      if(schoolV31Val_(r,h,'featureKey')===key && schoolV31Val_(r,h,'الدور')==='مدرسة'){
        found=true; enabled=stateEnabled_(schoolV31Val_(r,h,'الحالة'));
      }
    });
    if(found)return enabled;
  }catch(e){}
  try{
    var d2=v24Data_('R_الصلاحيات'), h2=schoolV31Idx_(d2.headers), rows2=d2.rows, found2=false, enabled2=false;
    rows2.forEach(function(r){
      if(schoolV31Val_(r,h2,'key')===key){found2=true; enabled2=stateEnabled_(schoolV31Val_(r,h2,'enabled'));}
    });
    if(found2)return enabled2;
  }catch(e2){}
  // عرض الأساسيين يظل متاحًا تلقائيًا إذا كانت الصلاحية القديمة للتعديل موجودة ولا يوجد مرجع مستقل للعرض.
  if(key==='SCHOOL_BASIC_VIEW')return schoolV31Feature_('SCHOOL_BASIC_EDIT');
  return v271Feature_(key);
}
function schoolV31Allowed_(key){if(!schoolV31Feature_(key))throw new Error('🔒 هذه الصلاحية مغلقة حاليًا بواسطة الإدارة.');}

function schoolPortalV31(token){
  var s=schoolV31Session_(token), school=dbv2School_(s.schoolId);
  if(!school)throw new Error('سجل المدرسة غير موجود في قاعدة البيانات.');
  return {success:true,schoolId:s.schoolId,schoolName:s.school,features:{
    dataEdit:schoolV31Feature_('SCHOOL_DATA_EDIT'),studentsEdit:schoolV31Feature_('SCHOOL_STUDENTS_EDIT'),
    disabilityEdit:schoolV31Feature_('SCHOOL_DISABILITY_EDIT'),basicView:schoolV31Feature_('SCHOOL_BASIC_VIEW'),basicEdit:schoolV31Feature_('SCHOOL_BASIC_EDIT'),
    removeRequest:schoolV31Feature_('SCHOOL_BASIC_REMOVE_REQUEST'),
    finance:schoolV31Feature_('SCHOOL_FINANCE'),reports:schoolV31Feature_('SCHOOL_REPORTS')
  }};
}

function schoolListWorkersV31(token,q){
  var s=schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_VIEW');
  q=String(q||'').trim().toLowerCase();
  var emp=v24Data_(SCHOOL_V31_BASIC_SHEET), rel=v24Data_(SCHOOL_V31_REL_SHEET), ei=schoolV31Idx_(emp.headers), ri=schoolV31Idx_(rel.headers), byId={};
  emp.rows.forEach(function(r){var id=schoolV31Val_(r,ei,'employeeId');if(id)byId[id]=r;});
  // نبني الفهرس المالي مرة واحدة لكل تنفيذ، قبل المرور على العاملين.
  var financeIndex={};
  try{
    var fd=v24Data_('08_الماليات'), fi=schoolV31Idx_(fd.headers), now=new Date(), cy=now.getFullYear(), cm=now.getMonth()+1;
    fd.rows.forEach(function(fr){
      var fid=schoolV31Val_(fr,fi,'employeeId'), fsid=schoolV31Val_(fr,fi,'schoolId');
      if(!fid||fsid!==s.schoolId)return;
      var fy=Number(schoolV31Val_(fr,fi,'السنة'))||0, fm=Number(schoolV31Val_(fr,fi,'الشهر'))||0, key=fy*100+fm;
      var prev=financeIndex[fid];
      if(!prev||key>prev.key||(fy===cy&&fm===cm&&!(prev.year===cy&&prev.month===cm))) financeIndex[fid]={row:fr,key:key,year:fy,month:fm};
    });
  }catch(e){ financeIndex={}; }
  var out=[], seen68={};
  rel.rows.forEach(function(rr){
    if(schoolV31Val_(rr,ri,'schoolId')!==s.schoolId)return;
    var status=schoolV31Val_(rr,ri,'الحالة'); if(status && status!=='نشطة' && status!=='فعال' && status!=='قائم')return;
    var id=schoolV31Val_(rr,ri,'employeeId'), r=byId[id]; if(!r)return;
    if(seen68[id]||schoolV31Val_(r,ei,'حالة_السجل')==='غير قائم')return; seen68[id]=1;   // V6.8: نفس عدّ اللوحة — القائم فقط ومرة واحدة
    var name=schoolV31Val_(r,ei,'الاسم'),job=schoolV31Val_(r,ei,'المسمى_الوظيفي'),degree=schoolV31Val_(r,ei,'الدرجة_المالية'),stage=schoolV31Val_(r,ei,'المرحلة_التعليمية_الأصلية'),subject=schoolV31Val_(r,ei,'مادة_التدريس'),nid=schoolV31Val_(r,ei,'الرقم_القومي'),derivedType=v24NationalIdTypeV40_(nid);
    var hay=(name+' '+job+' '+degree+' '+stage+' '+subject).toLowerCase(); if(q && hay.indexOf(q)<0)return;
    var assignment=ei['الوظيفة_الإشرافية']!=null?schoolV31Val_(r,ei,'الوظيفة_الإشرافية'):'', effR=v40EffectiveRole_(job,assignment);
    var supervisor=schoolV31Val_(r,ei,'مشرف_على_المادة')==='نعم', quota=v40LegalQuota_(job,stage,supervisor,assignment);
    // V4.1: بيانات فوق النصاب والمبلغ المستحق للعرض في جدول التعديل السريع.
    // نقرأ آخر كشف مالي محسوب لهذا العامل في المدرسة، مع تفضيل الشهر الحالي.
    var overHours='', overAmount='', financeSystem='', financeYear='', financeMonth='', financeStatus='';
    try{
      var fi=schoolV31Idx_(v24Data_('08_الماليات').headers);
      var best=financeIndex[id]&&financeIndex[id].row;
      if(best){
        financeSystem=schoolV31Val_(best,fi,'نظام_العمل'); financeYear=schoolV31Val_(best,fi,'السنة'); financeMonth=schoolV31Val_(best,fi,'الشهر'); financeStatus=schoolV31Val_(best,fi,'حالة_الاعتماد');
        if(financeSystem===V36_SYSTEMS.OVER || financeSystem===V36_SYSTEMS.BOTH){
          overHours=schoolV31Val_(best,fi,'ساعات_فوق_النصاب'); overAmount=schoolV31Val_(best,fi,'قيمة_فوق_النصاب');
        }
      }
    }catch(e){}
    out.push({relationId:schoolV31Val_(rr,ri,'relationId'),employeeId:id,name:name,nationalId:nid,type:derivedType,birthDate:schoolV31Val_(r,ei,'تاريخ_الميلاد'),job:job,supervisoryJob:assignment,isTeacher:effR.isTeacher,effRole:effR.role,degree:degree,stage:stage,subject:subject,supervisor:supervisor?'نعم':'لا',legalQuota:quota,workSystem:schoolV31Val_(r,ei,'نظام_العمل'),financeSystem:financeSystem,financeYear:financeYear,financeMonth:financeMonth,financeStatus:financeStatus,overHours:overHours,overAmount:overAmount,relationType:schoolV31Val_(rr,ri,'نوع_العلاقة'),relationStatus:status||'نشطة'});
  });
  return {success:true,total:out.length,rows:out.slice(0,500)};
}
/** النصاب القانوني المعروض في جدول العاملين — نفس منطق محرك الاستحقاقات (بعد خصم الإشراف)، أو فارغ لغير المعلمين. */
function v40LegalQuota_(job,stage,supervisor,assignment){
  try{
    var eff=v40EffectiveRole_(job,assignment); if(!eff.isTeacher)return '';
    var quotas=v36QuotaTable_(), q=quotas[job+'|'+stage]; if(!q)return '';
    if(supervisor)return Math.max(0,q.weekly-(q.supervisorDeduction||0));
    return q.weekly;
  }catch(e){return '';}
}

function schoolGetWorkerV31(token,employeeId){
  var s=schoolV31Session_(token), id=String(employeeId||'').trim(); schoolV31Allowed_('SCHOOL_BASIC_VIEW');
  if(!id)throw new Error('معرف العامل غير صالح.');
  var emp=v24Data_(SCHOOL_V31_BASIC_SHEET),rel=v24Data_(SCHOOL_V31_REL_SHEET),ei=schoolV31Idx_(emp.headers),ri=schoolV31Idx_(rel.headers),row=null;
  for(var i=0;i<emp.rows.length;i++)if(schoolV31Val_(emp.rows[i],ei,'employeeId')===id){row=emp.rows[i];break;}
  if(!row)throw new Error('العامل غير موجود.');
  var related=rel.rows.filter(function(r){return schoolV31Val_(r,ri,'employeeId')===id&&schoolV31Val_(r,ri,'schoolId')===s.schoolId;});
  if(!related.length)throw new Error('هذا العامل غير مرتبط بهذه المدرسة.');
  var fields=['الرقم_القومي','كود_الموظف','الاسم','النوع','تاريخ_الميلاد','الهاتف','البريد','العنوان','الصفة','الحالة_الوظيفية','تاريخ_التعيين','الدرجة_المالية','تاريخ_الحصول_على_الدرجة','المجموعة_النوعية','المجموعة_الوظيفية','المسمى_الوظيفي','الوظيفة_الإشرافية','مادة_التدريس','المرحلة_التعليمية_الأصلية','نظام_العمل','مشرف_على_المادة','نوع التعليم','تاريخ_بدء_العمل','قائم_بالعمل','سبب_عدم_القيام'];
  var data={};fields.forEach(function(k){data[k]=schoolV31Val_(row,ei,k);});
  data.relationType=schoolV31Val_(related[0],ri,'نوع_العلاقة'); data.relationStatus=schoolV31Val_(related[0],ri,'الحالة'); data.relationLabel=(typeof v102RelLabel_==='function')?v102RelLabel_(data.relationType,data.relationStatus,schoolV31Val_(related[0],ri,'ملاحظات')):data.relationType;   // V7.58
  var q=[];try{var qd=v24Data_('05_المؤهلات'),qi=schoolV31Idx_(qd.headers);q=qd.rows.filter(function(r){return String(schoolV31Val_(r,qi,'employeeId'))===id;}).map(function(r){var o={};qd.headers.forEach(function(k,j){o[k]=r[j]||'';});return o;});}catch(e){}
  return {success:true,employee:{employeeId:id,name:data['الاسم'],nationalId:data['الرقم_القومي']||'',fields:data,qualifications:q}};
}


function schoolRequestWorkerEditV32(token,employeeId,field,newValue,reason){
  var s=schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  var id=String(employeeId||'').trim(), k=String(field||'').trim(), nv=schoolV31Clean_(newValue), why=String(reason||'').trim();
  if(!id||!k)throw new Error('بيانات طلب التعديل غير مكتملة.');
  if(k==='النوع'||k==='تاريخ_الميلاد')throw new Error('النوع وتاريخ الميلاد لا يُعدّلان يدويًا؛ يُستخرجان من الرقم القومي.');
  if(SCHOOL_V32_DIRECT_FIELDS.indexOf(k)>=0)throw new Error('هذا الحقل يمكن للمدرسة تعديله مباشرة.');
  if(SCHOOL_V32_SENSITIVE_FIELDS.indexOf(k)<0)throw new Error('هذا الحقل غير مسموح بطلب تعديله من المدرسة.');
  var emp=v24Data_(SCHOOL_V31_BASIC_SHEET),rel=v24Data_(SCHOOL_V31_REL_SHEET),ei=schoolV31Idx_(emp.headers),ri=schoolV31Idx_(rel.headers),er=null;
  for(var i=0;i<emp.rows.length;i++)if(schoolV31Val_(emp.rows[i],ei,'employeeId')===id){er=emp.rows[i];break;}
  if(!er)throw new Error('العامل غير موجود.');
  if(!rel.rows.some(function(r){return schoolV31Val_(r,ri,'employeeId')===id&&schoolV31Val_(r,ri,'schoolId')===s.schoolId;}))throw new Error('العامل غير مرتبط بهذه المدرسة.');
  var old=schoolV31Val_(er,ei,k); if(old===nv)throw new Error('القيمة الجديدة مطابقة للقيمة الحالية.');
  var sh=personnelSS_().getSheetByName(SCHOOL_V31_REQUESTS_SHEET); if(!sh)throw new Error('ورقة طلبات العاملين غير موجودة.');
  var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],x=schoolV31Idx_(h),row=new Array(h.length).fill('');
  function put(k2,v){if(x[k2]!=null)row[x[k2]]=schoolV31Clean_(v);}
  put('requestId','REQ_'+Utilities.getUuid().replace(/-/g,'').slice(0,20));put('employeeId',id);put('الرقم_القومي',schoolV31Val_(er,ei,'الرقم_القومي'));put('schoolId',s.schoolId);put('اسم_المدرسة',s.school);put('نوع_الطلب','طلب تعديل بيانات عامل');put('الحقل_المطلوب_تعديله',k);put('القيمة_القديمة',old);put('القيمة_الجديدة',nv);put('سبب_الطلب',why);put('الحالة','مفتوح');put('المستخدم_الطالب',s.username);put('تاريخ_الطلب',new Date());
  v50A_(sh.appendRow(row)); schoolV31Log_(s,'طلب تعديل بيانات عامل',id,[[k,old,nv]]);
  return {success:true,message:'تم إرسال طلب التعديل إلى الإدارة للمراجعة.',requestId:row[x.requestId]||''};
}


var SCHOOL_STATUS_REQUESTS_V38=['نقل','ندب كلي','ندب جزئي','إحالة للمعاش','وفاة','استقالة','إنهاء خدمة','إنهاء العلاقة بالمدرسة فقط','إجازة بدون راتب','موقف مؤقت / غير قائم'];
function schoolRequestWorkerStatusV38(token,employeeId,action,targetSchool,note){
  throw new Error('هذا المسار القديم متوقف (V7.58) — غيّر حالة العامل من «🔄 الحالة» بالقائمة الموحدة.');
  var s=schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_REMOVE_REQUEST');
  var id=String(employeeId||'').trim(), a=String(action||'').trim(), target=String(targetSchool||'').trim(), rs=String(note||'').trim();
  if(SCHOOL_STATUS_REQUESTS_V38.indexOf(a)<0)throw new Error('حالة التغيير غير صالحة.');
  if(!id)throw new Error('العامل غير محدد.');
  if((a==='نقل'||a==='ندب كلي'||a==='ندب جزئي')&&!target)throw new Error('اختر المدرسة المطلوبة.');
  var emp=v24Data_(SCHOOL_V31_BASIC_SHEET),rel=v24Data_(SCHOOL_V31_REL_SHEET),ei=schoolV31Idx_(emp.headers),ri=schoolV31Idx_(rel.headers),er=null;
  for(var i=0;i<emp.rows.length;i++)if(schoolV31Val_(emp.rows[i],ei,'employeeId')===id){er=emp.rows[i];break;}
  if(!er)throw new Error('العامل غير موجود.');
  if(!rel.rows.some(function(r){return schoolV31Val_(r,ri,'employeeId')===id&&schoolV31Val_(r,ri,'schoolId')===s.schoolId&&v36ActiveRel_(schoolV31Val_(r,ri,'الحالة'));}))throw new Error('العامل غير مرتبط بهذه المدرسة بعلاقة نشطة.');
  var targetId='';
  if(target){var td=v24Data_('18_بيانات_المدارس'),ti=schoolV31Idx_(td.headers);for(var j=0;j<td.rows.length;j++)if(schoolV31Val_(td.rows[j],ti,'اسم_المدرسة')===target){targetId=schoolV31Val_(td.rows[j],ti,'schoolId');break;}if(!targetId)throw new Error('المدرسة المطلوبة غير موجودة في القائمة.');if(targetId===s.schoolId)throw new Error('المدرسة المطلوبة هي نفس المدرسة الحالية.');}
  var sh=personnelSS_().getSheetByName(SCHOOL_V31_REQUESTS_SHEET); if(!sh)throw new Error('ورقة طلبات العاملين غير موجودة.');
  var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],x=schoolV31Idx_(h),row=new Array(h.length).fill('');
  function put(k,v){if(x[k]!=null)row[x[k]]=schoolV31Clean_(v);}
  var req='طلب تغيير حالة العامل — '+a;
  put('requestId','REQ_'+Utilities.getUuid().replace(/-/g,'').slice(0,20));put('employeeId',id);put('الرقم_القومي',schoolV31Val_(er,ei,'الرقم_القومي'));put('schoolId',s.schoolId);put('اسم_المدرسة',s.school);put('نوع_الطلب',req);put('سبب_الطلب',rs);put('سبب_الحذف',a);put('الجهة_المطلوب_النقل_إليها',target);put('الحالة','مفتوح');put('المستخدم_الطالب',s.username);put('تاريخ_الطلب',new Date());
  v50A_(sh.appendRow(row));schoolV31Log_(s,req,id,[['الحالة المطلوبة','',a],['المدرسة المطلوبة','',target]]);
  return {success:true,message:'تم إرسال طلب «'+a+'» إلى الإدارة للمراجعة. لم يتغير السجل حتى تعتمد الإدارة الطلب.',requestId:row[x.requestId]||''};
}

function v24DigitsLocalV31_(x){return String(x==null?'':x).replace(/[٠-٩]/g,function(c){return '٠١٢٣٤٥٦٧٨٩'.indexOf(c);}).replace(/[۰-۹]/g,function(c){return '۰۱۲۳۴۵۶۷۸۹'.indexOf(c);}).replace(/\D/g,'');}
function v24ValidateNationalIdV40_(nid){
  nid=v24DigitsLocalV31_(nid); if(nid.length!==14)return{valid:false,message:'الرقم القومي يجب أن يكون 14 رقمًا.'};
  var c=nid.charAt(0); if(c!=='2'&&c!=='3')return{valid:false,message:'تركيبة الرقم القومي غير صحيحة: رقم القرن يجب أن يكون 2 أو 3.'};
  var yy=Number(nid.substr(1,2)),mm=Number(nid.substr(3,2)),dd=Number(nid.substr(5,2));
  var full=(c==='2'?1900:2000)+yy,d=new Date(full,mm-1,dd); if(mm<1||mm>12||dd<1||dd>31||d.getFullYear()!==full||d.getMonth()!==mm-1||d.getDate()!==dd)return{valid:false,message:'تاريخ الميلاد داخل الرقم القومي غير صحيح.'};
  var gov=Number(nid.substr(7,2)),validGov=[1,2,3,4,11,12,13,14,15,16,17,18,19,21,22,23,24,25,26,27,28,29,31,32,33,34,35,88].indexOf(gov)>=0;if(!validGov)return{valid:false,message:'كود محافظة الميلاد داخل الرقم القومي غير صحيح.'};
  var sexDigit=Number(nid.charAt(12)); if(isNaN(sexDigit))return{valid:false,message:'الرقم القومي غير صحيح.'};
  return{valid:true,type:(sexDigit%2?'ذكر':'أنثى'),birthDate:String(full)+'-'+('0'+mm).slice(-2)+'-'+('0'+dd).slice(-2)};
}
function v24NationalIdTypeV40_(nid){var x=v24ValidateNationalIdV40_(nid);return x.valid?x.type:'';}
function schoolV32ExpectedDegree_(job){var n=String(job||'').trim().replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').toLowerCase();if(!n)return '';if(n.indexOf('كبير')>=0)return 'العليا';if(n.indexOf('خبير')>=0)return 'مدير عام';if(/اول.*\(ا\)|اول ا/.test(n))return 'الأولى';if(n.indexOf('اول')>=0)return 'الثانية';if(n.indexOf('مساعد')>=0||n.indexOf('معلم')>=0||n.indexOf('مدرس')>=0||n.indexOf('اخصائي')>=0||n.indexOf('امين مكتبه')>=0)return 'الثالثة';return '';}
function schoolV32JobAllowed_(job){
  var j=String(job||'').trim();if(!j)return true;
  var allowed=['معلم مساعد','معلم مساعد','معلم','معلم أول','معلم أول (أ)','معلم خبير','كبير معلمين','أخصائي اجتماعي مساعد','أخصائي اجتماعي','أخصائي اجتماعي أول','أخصائي اجتماعي أول (أ)','أخصائي اجتماعي خبير','كبير أخصائيين اجتماعيين','أخصائي نفسي مساعد','أخصائي نفسي','أخصائي نفسي أول','أخصائي نفسي أول (أ)','أخصائي نفسي خبير','كبير أخصائيين نفسيين','أخصائي تكنولوجيا مساعد','أخصائي تكنولوجيا','أخصائي تكنولوجيا أول','أخصائي تكنولوجيا أول (أ)','أخصائي تكنولوجيا خبير','كبير أخصائيي تكنولوجيا','أخصائي صحافة وإعلام مساعد','أخصائي صحافة وإعلام','أخصائي صحافة وإعلام أول','أخصائي صحافة وإعلام أول (أ)','أخصائي صحافة وإعلام خبير','كبير أخصائيي صحافة وإعلام','أمين مكتبة مساعد','أمين مكتبة','أمين مكتبة أول','أمين مكتبة أول (أ)','أمين مكتبة خبير','كبير أمناء مكتبات','كاتب','إداري'];
  var n=function(x){return String(x||'').trim().replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').toLowerCase();};
  var set={};allowed.forEach(function(x){set[n(x)]=1;});return !!set[n(j)];
}
function schoolV31Log_(s,op,id,changes){
  try{var sh=personnelSS_().getSheetByName('12_سجل_الأحداث');if(!sh)return;var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],i=schoolV31Idx_(h),r=new Array(h.length).fill('');function p(k,v){if(i[k]!=null)r[i[k]]=schoolV31Clean_(v);}p('eventId','EV_'+Utilities.getUuid().replace(/-/g,'').slice(0,20));p('نوع_العملية',op);p('الكيان','عامل');p('entityId',id);p('القيمة_القديمة',JSON.stringify((changes||[]).map(function(x){return{x:x[0],v:x[1]};})));p('القيمة_الجديدة',JSON.stringify((changes||[]).map(function(x){return{x:x[0],v:x[2]};})));p('المستخدم',s.username);p('المدرسة',s.school);p('التاريخ',new Date());v50A_(sh.appendRow(r));}catch(e){console.error('schoolV31Log_: '+e.message);}
}

