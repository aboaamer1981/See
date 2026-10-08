/** V3.3 — بوابة المدرسة: تحرير البيانات الرئيسية وشؤون الطلاب والدمج والحصة والاستحقاقات.
 * لا يعتمد على app4 أثناء التشغيل.
 */
var SCHOOL_V33_TECH_FIELDS={school:['رابط_صورة_اللافتة','رابط_صورة_الواجهة','رابط_صورة_السور_1','رابط_صورة_السور_2','رابط_صورة_السور_3','رابط_صورة_السور_4','رابط_صورة_الفناء','رابط_صورة_دورات_المياه','schoolId','آخر_تحديث','آخر_مستخدم','اسم_المدرسة_الأصلي','اسم_المدرسة_المعياري'],staff:['employeeId','الرقم_القومي','كود_الموظف','originalSchoolId','تاريخ_بدء_العمل','حالة_السجل','المسمى_الوظيفي_الأصلي','الدرجة_المالية_الأصلية','المجموعة_المعيارية','مستوى_المسمى_المعياري'],student:['schoolId'],disability:['disabilityId','schoolId','مصدر_البيانات','تاريخ_الإدخال','المستخدم']};
var SCHOOL_V33_STUDENT_FIELDS=['كود هيئة الأبنية','اسم المدرسة','نوع المدرسة','المرحلة','الصف/المستوى','الرقم المسلسل للمرحلة','حالة الإحصاء','عدد الفصول/القاعات','إجمالي الطلاب','ذكور','إناث','مسلمون','مسيحيون','مستجدون','باقون','بيانات الصفوف JSON','ملاحظات','عدد_ذوي_الإعاقة','إعاقة_حركية','إعاقة_بصرية','إعاقة_سمعية','إعاقة_ذهنية','توحد','إعاقات_أخرى','حالة_الدمج','ملاحظات_الإعاقة'];
var SCHOOL_V33_DIS_FIELDS=['كود_هيئة_الأبنية','اسم_المدرسة','المرحلة','الصف_المستوى','الرقم_القومي_للطالب','اسم_الطالب','النوع','الديانة','دمج مسلم','دمج مسيحي','نوع_الإعاقة','درجة_الإعاقة','هل_ضمن_الدمج','حالة_السجل','ملاحظات'];
function schoolV33Session_(token){return schoolV31Session_(token);}
function schoolV33Index_(h){return schoolV31Idx_(h);}
function schoolV33Val_(r,i,k){return schoolV31Val_(r,i,k);}
function schoolV33Write_(sh,rowIndex,h,payload,blocked,allowed){if(payload&&payload['مادة_التدريس']!==undefined&&typeof subjectCanonV44_==='function')payload['مادة_التدريس']=subjectCanonV44_(payload['مادة_التدريس']);
  // V3.5: فهرس متسامح للأعمدة + حماية التواريخ (لا تُمسح بقيمة فارغة، وتُكتب بصيغة ISO)
  var idx=v35TolIdx_(h),changes=[],upd={},cur=null;
  Object.keys(payload||{}).forEach(function(k){
    if(blocked.indexOf(k)>=0||allowed.indexOf(k)<0||idx[k]==null)return;
    if(!cur)cur=sh.getRange(rowIndex,1,1,h.length).getDisplayValues()[0]; // V5.0: قراءة الصف مرة واحدة بدل خلية لكل حقل
    var nv=schoolV31Clean_(payload[k]);var ov=String(cur[idx[k]]||'').trim();
    if(/^تاريخ/.test(k)){var a=v35Date_(nv),b=v35Date_(ov);if(!a||a===b)return;nv=a;}
    else if(nv===ov)return;
    upd[idx[k]+1]=nv;changes.push([k,ov,nv]);
  });
  v50WriteRow_(sh,rowIndex,upd);
  return changes;
}
function schoolV33FindSchoolRow_(schoolId){var sh=personnelSS_().getSheetByName('18_بيانات_المدارس'),h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],i=h.indexOf('schoolId'),v=sh.getRange(2,1,Math.max(0,sh.getLastRow()-1),sh.getLastColumn()).getDisplayValues();for(var r=0;r<v.length;r++)if(String(v[r][i])===String(schoolId))return{sh:sh,h:h,row:r+2,vals:v[r]};throw new Error('سجل المدرسة غير موجود.');}
function schoolGetMasterV33(token){
  var s=schoolV33Session_(token);schoolV31Allowed_('SCHOOL_DATA_EDIT');
  var x=schoolV33FindSchoolRow_(s.schoolId),idx=schoolV33Index_(x.h),vals=x.vals.slice();
  // V3.4: لا نترك بيانات القيادة الأولى/الثانية فارغة إذا كانت موجودة في مصدر المدارس.
  try{
    var src=personnelSS_().getSheetByName('مصدر_حصة_المدارس');
    if(src&&src.getLastRow()>1){
      var sh=src.getDataRange().getDisplayValues(), shh=sh[0], si=schoolV33Index_(shh), targetName=String(vals[idx['اسم_المدرسة']]||s.school||'').trim();
      for(var r=1;r<sh.length;r++){
        if(personnelNormalizeSchoolNameV1_(sh[r][si['اسم المدرسة']])!==personnelNormalizeSchoolNameV1_(targetName))continue;
        var map={'اسم_المدير':'اسم المدير','هاتف_المدير':'هاتف المدير','اسم_الوكيل':'اسم الوكيل','هاتف_الوكيل':'هاتف الوكيل','مسؤول_الأمن':'مسؤول الأمن','هاتف_الأمن':'هاتف الأمن','مسؤول_القاعدة':'مسؤول القاعدة','هاتف_القاعدة':'هاتف مسؤول القاعدة'};
        Object.keys(map).forEach(function(k){if(idx[k]!=null&&!String(vals[idx[k]]||'').trim()&&si[map[k]]!=null)vals[idx[k]]=sh[r][si[map[k]]]||'';});
        break;
      }
    }
  }catch(e){}
  var out=[];x.h.forEach(function(k,i){if(!k||SCHOOL_V33_TECH_FIELDS.school.indexOf(k)>=0)return;out.push({key:k,value:vals[i]||''});});
  return{success:true,schoolId:s.schoolId,schoolName:s.school,fields:out};
}
function syncSchoolOfficialsV34_(){
  var ss=personnelSS_(),src=ss.getSheetByName('مصدر_حصة_المدارس'),master=ss.getSheetByName('18_بيانات_المدارس'),core=ss.getSheetByName('03_المدارس');
  if(!src||!master)throw new Error('مصدر المدارس أو 18_بيانات_المدارس غير موجود.');
  var sv=src.getDataRange().getDisplayValues(),sh=master.getDataRange().getDisplayValues(),ch=master.getRange(1,1,1,master.getLastColumn()).getDisplayValues()[0],si=schoolV33Index_(sv[0]),mi=schoolV33Index_(ch),updated=0;
  var map={};for(var i=1;i<sv.length;i++){var n=personnelNormalizeSchoolNameV1_(sv[i][si['اسم المدرسة']]);if(n)map[n]=sv[i];}
  for(var r=1;r<sh.length;r++){
    var n=personnelNormalizeSchoolNameV1_(sh[r][mi['اسم_المدرسة']]);if(!n||!map[n])continue;var a=map[n], pairs=[['اسم_المدير','اسم المدير'],['هاتف_المدير','هاتف المدير'],['اسم_الوكيل','اسم الوكيل'],['هاتف_الوكيل','هاتف الوكيل'],['مسؤول_الأمن','مسؤول الأمن'],['هاتف_الأمن','هاتف الأمن'],['مسؤول_القاعدة','مسؤول القاعدة'],['هاتف_القاعدة','هاتف مسؤول القاعدة']];
    pairs.forEach(function(z){if(mi[z[0]]!=null&&si[z[1]]!=null&&String(a[si[z[1]]]||'').trim())v50A_(master.getRange(r+1,mi[z[0]]+1).setValue(a[si[z[1]]]));});updated++;
  }
  if(core){var cv=core.getDataRange().getDisplayValues(),ci=schoolV33Index_(cv[0]),mby={};for(var r2=1;r2<sh.length;r2++){var nn=personnelNormalizeSchoolNameV1_(sh[r2][mi['اسم_المدرسة']]);if(nn)mby[nn]=sh[r2];}for(var rr=1;rr<cv.length;rr++){var cn=personnelNormalizeSchoolNameV1_(cv[rr][ci['اسم_المدرسة']]);if(!cn||!mby[cn])continue;[['اسم_المدير','اسم_المدير'],['هاتف_المدير','هاتف_المدير'],['اسم_الوكيل','اسم_الوكيل'],['هاتف_الوكيل','هاتف_الوكيل']].forEach(function(z){if(ci[z[0]]!=null&&mi[z[1]]!=null)v50A_(core.getRange(rr+1,ci[z[0]]+1).setValue(mby[cn][mi[z[1]]]));});}}
  return{success:true,updated:updated,message:'تمت مزامنة بيانات القيادة الأولى والثانية ومسؤولي المدرسة من مصدر المدارس.'};
}
function schoolSaveMasterV33(token,payload){
  var s=schoolV33Session_(token);schoolV31Allowed_('SCHOOL_DATA_EDIT');
  return v35SaveSchoolCore_(s.schoolId,payload,s,false);
}
function schoolGetStudentsV33(token){var s=schoolV33Session_(token);schoolV31Allowed_('SCHOOL_STUDENTS_EDIT');var d=v24Data_('13_شؤون_الطلاب'),i=schoolV33Index_(d.headers),sid=i.schoolId, sn=d.headers.indexOf('اسم المدرسة'), school=schoolV33FindSchoolRow_(s.schoolId), schoolName=school.vals[school.h.indexOf('اسم_المدرسة')];var rows=d.rows.map(function(r,n){var ok=sid>=0&&String(r[sid]||'')===String(s.schoolId);if(!ok&&sn>=0)ok=personnelNormalizeSchoolNameV1_(r[sn])===personnelNormalizeSchoolNameV1_(schoolName);return ok?{_row:n+2,values:r}:null;}).filter(Boolean);var schoolType=school.vals[school.h.indexOf('نوع_المدرسة')]||'';return{success:true,headers:d.headers,rows:rows,schoolType:schoolType};}
function schoolValidateStudentDisabilityV40_(s,p,currentRow){
  var name=String(p['اسم_الطالب']||'').trim();
  if(name.split(/\s+/).filter(Boolean).length<4)throw new Error('اسم الطالب يجب أن يكون رباعيًا.');
  var nid=v24DigitsLocalV31_(p['الرقم_القومي_للطالب']);
  if(!nid||nid.length!==14)throw new Error('الرقم القومي للطالب يجب أن يكون 14 رقمًا صحيحًا.');
  var v=v24ValidateNationalIdV40_(nid);if(!v.valid)throw new Error(v.message);
  p['الرقم_القومي_للطالب']=nid;p['النوع']=v.type;p['هل_ضمن_الدمج']='مدمج';
  if(!String(p['المرحلة']||'').trim()||!String(p['الصف_المستوى']||'').trim())throw new Error('اختر المرحلة والصف.');
  if(!String(p['نوع_الإعاقة']||'').trim())throw new Error('اختر نوع الدمج.');
  if(['مسلم','مسيحي'].indexOf(String(p['الديانة']||'').trim())<0)throw new Error('اختر ديانة الطالب: مسلم أو مسيحي.');
  var stu=v24Data_('13_شؤون_الطلاب'),si=schoolV31Idx_(stu.headers),ok=false;
  stu.rows.forEach(function(r){var sid=schoolV31Val_(r,si,'schoolId'),sn=schoolV31Val_(r,si,'اسم المدرسة');if((sid&&String(sid)===String(s.schoolId))||(!sid&&personnelNormalizeSchoolNameV1_(sn)===personnelNormalizeSchoolNameV1_(s.school)))if(String(schoolV31Val_(r,si,'المرحلة'))===String(p['المرحلة'])&&String(schoolV31Val_(r,si,'الصف/المستوى'))===String(p['الصف_المستوى']))ok=true;});
  if(!ok)throw new Error('الصف المختار غير موجود ضمن صفوف المدرسة لهذه المرحلة.');
  // حد أسماء الطلاب ذوي الإعاقة = إجمالي الدمج المسجل في شؤون الطلاب (13).
  var target=null;
  stu.rows.forEach(function(r,n){
    var sid=schoolV31Val_(r,si,'schoolId'),sn=schoolV31Val_(r,si,'اسم المدرسة');
    var sameSchool=(sid&&String(sid)===String(s.schoolId))||(!sid&&personnelNormalizeSchoolNameV1_(sn)===personnelNormalizeSchoolNameV1_(s.school));
    if(sameSchool&&String(schoolV31Val_(r,si,'المرحلة'))===String(p['المرحلة'])&&String(schoolV31Val_(r,si,'الصف/المستوى'))===String(p['الصف_المستوى']))target={r:r,row:n+2};
  });
  if(!target)throw new Error('تعذر تحديد سجل الصف في شؤون الطلاب للتحقق من إجمالي الدمج.');
  var limit=v79LegacyDisabilityTotal_(target.r,si);
  var dis=v24Data_('14_إعاقة_الطلاب'),di=schoolV31Idx_(dis.headers),count=0;
  dis.rows.forEach(function(r,n){
    var sid2=schoolV31Val_(r,di,'schoolId'),sn2=schoolV31Val_(r,di,'اسم_المدرسة');
    var same2=(sid2&&String(sid2)===String(s.schoolId))||(!sid2&&personnelNormalizeSchoolNameV1_(sn2)===personnelNormalizeSchoolNameV1_(s.school));
    if(!same2||String(schoolV31Val_(r,di,'المرحلة'))!==String(p['المرحلة'])||String(schoolV31Val_(r,di,'الصف_المستوى'))!==String(p['الصف_المستوى']))return;
    if(String(schoolV31Val_(r,di,'حالة_السجل')||'قائم')==='غير قائم')return;
    if(currentRow&&n+2===Number(currentRow))return;
    count++;
  });
  if(count>=limit)throw new Error('لا يمكن إضافة طالب دمج جديد: عدد الأسماء الحالية ('+count+') وصل إلى إجمالي الدمج المسجل ('+limit+') في شؤون الطلاب.');
  return p;
}
function schoolAddDisabilityV33(token,payload){var s=schoolV33Session_(token);schoolV31Allowed_('SCHOOL_DISABILITY_EDIT');var sh=personnelSS_().getSheetByName('14_إعاقة_الطلاب'),h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],idx=schoolV33Index_(h),school=schoolV33FindSchoolRow_(s.schoolId),p=schoolValidateStudentDisabilityV40_(s,payload||{},null);p['دمج مسلم']=String(p['الديانة']||'').trim()==='مسلم'?1:0;p['دمج مسيحي']=String(p['الديانة']||'').trim()==='مسيحي'?1:0;var d=v24Data_('14_إعاقة_الطلاب'),di=schoolV31Idx_(d.headers);if(d.rows.some(function(r){return v24DigitsLocalV31_(schoolV31Val_(r,di,'الرقم_القومي_للطالب'))===p['الرقم_القومي_للطالب']&&String(schoolV31Val_(r,di,'حالة_السجل')||'قائم')!=='غير قائم';}))throw new Error('الرقم القومي للطالب موجود بالفعل في سجلات الدمج.');var row=new Array(h.length).fill('');function put(k,v){if(idx[k]!=null)row[idx[k]]=schoolV31Clean_(v);}put('disabilityId','DIS_'+Utilities.getUuid().replace(/-/g,'').slice(0,20));put('schoolId',s.schoolId);put('كود_هيئة_الأبنية',school.vals[school.h.indexOf('كود_هيئة_الأبنية')]||'');put('اسم_المدرسة',school.vals[school.h.indexOf('اسم_المدرسة')]||s.school);SCHOOL_V33_DIS_FIELDS.forEach(function(k){if(p[k]!==undefined)put(k,p[k]);});put('هل_ضمن_الدمج','مدمج');put('حالة_السجل','قائم');put('مصدر_البيانات','بوابة المدرسة');put('تاريخ_الإدخال',new Date());put('المستخدم',s.username);v50A_(sh.appendRow(row));return{success:true,message:'تم حفظ بيانات الطالب ذي الإعاقة.',id:row[idx['disabilityId']]};}
function schoolGetDisabilityV33(token){var s=schoolV33Session_(token);schoolV31Allowed_('SCHOOL_DISABILITY_EDIT');var d=v24Data_('14_إعاقة_الطلاب'),i=schoolV33Index_(d.headers),sid=i.schoolId;return{success:true,headers:d.headers,rows:d.rows.map(function(r,n){return String(r[sid]||'')===String(s.schoolId)?{_row:n+2,values:r}:null;}).filter(Boolean)};}
function schoolSaveDisabilityV33(token,rowNumber,payload){var s=schoolV33Session_(token);schoolV31Allowed_('SCHOOL_DISABILITY_EDIT');var sh=personnelSS_().getSheetByName('14_إعاقة_الطلاب'),h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],idx=schoolV33Index_(h),r=Number(rowNumber);if(r<2||r>sh.getLastRow())throw new Error('السجل غير صالح.');if(String(sh.getRange(r,idx.schoolId+1).getDisplayValue())!==String(s.schoolId))throw new Error('السجل لا يخص المدرسة.');var p=schoolValidateStudentDisabilityV40_(s,payload||{},r);p['دمج مسلم']=String(p['الديانة']||'').trim()==='مسلم'?1:0;p['دمج مسيحي']=String(p['الديانة']||'').trim()==='مسيحي'?1:0;p['هل_ضمن_الدمج']='مدمج';var changes=schoolV33Write_(sh,r,h,p,SCHOOL_V33_TECH_FIELDS.disability,SCHOOL_V33_DIS_FIELDS);return{success:true,message:'تم حفظ بيانات الدمج.',changed:changes.length};}
function schoolEnsureWorkerColumnV40_(sh,header){
  var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
  var idx=h.indexOf(header);
  if(idx>=0)return idx;
  idx=h.length; v50A_(sh.getRange(1,idx+1).setValue(header)); return idx;
}
function schoolSupervisoryOptionsV40_(isAdmin){
  var fallback=['قيادة أولى','قيادة ثانية','موجه','رئيس قسم','وكيل قسم'];
  try{
    var d=v24Data_('R_الوظائف_الإشرافية'), i=d.headers.indexOf('الوظيفة_الإشرافية'), st=d.headers.indexOf('الحالة'), out=[];
    if(i>=0)d.rows.forEach(function(r){var x=String(r[i]||'').trim();x={'مدير مدرسة':'قيادة أولى','وكيل مدرسة':'قيادة ثانية'}[x]||x;var ok=st<0||!String(r[st]||'').trim()||String(r[st]).trim()==='فعال';if(x&&ok&&out.indexOf(x)<0)out.push(x);});
    if(out.length)fallback=out;
  }catch(e){}
  return isAdmin?fallback:fallback.filter(function(x){return x==='قيادة أولى'||x==='قيادة ثانية';});
}
function schoolSaveWorkersQuickV40(token,rows){
  var s=schoolV33Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  if(!Array.isArray(rows)||!rows.length)return{success:true,message:'لا توجد تغييرات للحفظ.',changed:0};
  var lock=LockService.getScriptLock();lock.waitLock(30000);v50Fresh_();
  try{
    var sh=personnelSS_().getSheetByName('01_الأساسي'); if(!sh)throw new Error('ورقة 01_الأساسي غير موجودة.');
    var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
    var extra=['الوظيفة_الإشرافية']; extra.forEach(function(k){schoolEnsureWorkerColumnV40_(sh,k);});
    h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
    var emp=v24Data_('01_الأساسي'), rel=v24Data_('04_علاقات_المدارس'), ei=schoolV33Index_(h),ri=schoolV33Index_(rel.headers),byId={};
    emp.rows.forEach(function(r,n){var id=schoolV33Val_(r,ei,'employeeId');if(id)byId[id]={row:r,index:n+2};});
    var schoolRows={}; rel.rows.forEach(function(r){var id=schoolV33Val_(r,ri,'employeeId'),sid=schoolV33Val_(r,ri,'schoolId'),st=schoolV33Val_(r,ri,'الحالة');if(id&&sid===s.schoolId&&(!st||st==='نشطة'))schoolRows[id]=1;});
    var refs=schoolReferenceV34(token).options||{}; var sup=refs.supervisoryJob||['قيادة أولى','قيادة ثانية']; var allowed={};sup.forEach(function(x){allowed[x]=1;});
    var changed=0,details=[];
    rows.forEach(function(item){
      var id=String(item.employeeId||'').trim(), rec=byId[id]; if(!id||!rec||!schoolRows[id])throw new Error('عامل غير صالح أو غير مرتبط بالمدرسة: '+id);
      var old=rec.row, payload=item.payload||{};
      v98SysGuard_(id,s.schoolId,payload['نظام_العمل']);   // V7.50: النظام المالي للمدرسة الأصلية فقط
      if(payload['الاسم']!==undefined||payload['الرقم_القومي']!==undefined)throw new Error('الاسم والرقم القومي ثابتان ولا يمكن للمدرسة تعديلهما.');
      if(payload['الرقم_القومي']!==undefined){var nid=v24DigitsLocalV31_(payload['الرقم_القومي']),nv=v24ValidateNationalIdV40_(nid);if(!nv.valid)throw new Error(nv.message);payload['الرقم_القومي']=nid;payload['النوع']=nv.type;var dup=emp.rows.some(function(r){return schoolV31Val_(r,ei,'employeeId')!==id&&v24DigitsLocalV31_(schoolV31Val_(r,ei,'الرقم_القومي'))===nid;});if(dup)throw new Error('الرقم القومي مسجل لعامل آخر.');payload['الرقم_القومي']=nid;}
      // القاعدة الحقيقية فيها مئات المسميات القديمة غير المُوحَّدة (188 مسمى مختلف عن القائمة المعتمدة). لا نمنع حفظ صف
      // لمجرد أن مسماه القديم غير موجود بالقائمة — التحقق يسري فقط عند تغيير الحقل فعليًا إلى قيمة جديدة.
      var oldJob=String(old[ei['المسمى_الوظيفي']]==null?'':old[ei['المسمى_الوظيفي']]).trim();
      if(payload['المسمى_الوظيفي']!==undefined&&String(payload['المسمى_الوظيفي']).trim()!==oldJob&&!schoolV32JobAllowed_(payload['المسمى_الوظيفي']))throw new Error('المسمى الوظيفي غير موجود في القائمة المعتمدة.');
      var oldAsg=String(ei['الوظيفة_الإشرافية']!=null?(old[ei['الوظيفة_الإشرافية']]||''):'').trim();
      if(payload['الوظيفة_الإشرافية']!==undefined&&String(payload['الوظيفة_الإشرافية']).trim()!==oldAsg&&payload['الوظيفة_الإشرافية']!==''&&!allowed[String(payload['الوظيفة_الإشرافية']).trim()])throw new Error('في شاشة المدرسة لا يسمح إلا بقيادة أولى أو قيادة ثانية كوظيفة إشرافية.');
      var oldSup=String(old[ei['مشرف_على_المادة']]==null?'':old[ei['مشرف_على_المادة']]).trim();
      if(payload['مشرف_على_المادة']!==undefined&&String(payload['مشرف_على_المادة']).trim()!==oldSup&&['نعم','لا'].indexOf(String(payload['مشرف_على_المادة']).trim())<0)throw new Error('حقل مشرف يجب أن يكون نعم أو لا.');
      var currentV94={};h.forEach(function(hh,jj){currentV94[hh]=old[jj]||'';});schoolValidateWorkerPayloadV94_(payload,currentV94,id);var finalJob=String(payload['المسمى_الوظيفي']!==undefined?payload['المسمى_الوظيفي']:old[ei['المسمى_الوظيفي']]||'').trim();
      v72GuardSubject_(payload['مادة_التدريس']);
      if(payload['نظام_العمل']!==undefined){try{v67GuardSystem_(finalJob,payload['الوظيفة_الإشرافية']!==undefined?payload['الوظيفة_الإشرافية']:(ei['الوظيفة_الإشرافية']!=null?old[ei['الوظيفة_الإشرافية']]:''),payload['نظام_العمل'],ei['نظام_العمل']!=null?old[ei['نظام_العمل']]:'');}catch(e67){throw new Error(String(old[ei['الاسم']]||'')+': '+e67.message);}}
      var expectedDegree=schoolV32ExpectedDegree_(finalJob);if(expectedDegree)payload['الدرجة_المالية']=expectedDegree;
      if(payload&&payload['مادة_التدريس']!==undefined&&typeof subjectCanonV44_==='function')payload['مادة_التدريس']=subjectCanonV44_(payload['مادة_التدريس']);
      var upd={};Object.keys(payload).forEach(function(k){if(['الاسم','الرقم_القومي','كود_الموظف','المسمى_الوظيفي','الوظيفة_الإشرافية','مشرف_على_المادة','مادة_التدريس','الدرجة_المالية','المرحلة_التعليمية_الأصلية','نظام_العمل'].indexOf(k)<0)return;if(k==='نظام_العمل'&&String(payload[k]||'').trim()&&v36WorkSystems_().indexOf(String(payload[k]).trim())<0)throw new Error('نظام العمل غير صالح: '+payload[k]);if(ei[k]==null)return;var nv=schoolV31Clean_(payload[k]),ov=String(old[ei[k]]==null?'':old[ei[k]]).trim();if(nv!==ov){upd[ei[k]+1]=nv;details.push([id,k,ov,nv]);changed++;}});v50WriteRow_(sh,rec.index,upd);
    });
    schoolV31Log_(s,'تعديل سريع جماعي للعاملين',s.schoolId,details);
    return{success:true,message:'تم حفظ تعديلات العاملين دفعة واحدة.',changed:changed,workers:rows.length};
  }finally{try{lock.releaseLock();}catch(e){}}
}
function schoolSaveWorkerV33(token,employeeId,payload){var s=schoolV33Session_(token);schoolV31Allowed_('SCHOOL_BASIC_EDIT');v98SysGuard_(employeeId,s.schoolId,(payload||{})['نظام_العمل']);/* V7.50 */var lock=LockService.getScriptLock();lock.waitLock(15000);v50Fresh_();try{var id=String(employeeId||'').trim(),p=payload||{},emp=v24Data_('01_الأساسي'),rel=v24Data_('04_علاقات_المدارس'),ei=schoolV33Index_(emp.headers),ri=schoolV33Index_(rel.headers),rowIndex=-1,row=null;for(var i=0;i<emp.rows.length;i++)if(schoolV33Val_(emp.rows[i],ei,'employeeId')===id){rowIndex=i+2;row=emp.rows[i];break;}if(rowIndex<2)throw new Error('العامل غير موجود.');if(!rel.rows.some(function(r){return schoolV33Val_(r,ri,'employeeId')===id&&schoolV33Val_(r,ri,'schoolId')===s.schoolId&&v36ActiveRel_(schoolV33Val_(r,ri,'الحالة'));}))throw new Error('هذا العامل غير مرتبط بهذه المدرسة.');if(p['الاسم']!==undefined)throw new Error('الاسم ثابت ولا يمكن للمدرسة تعديله.');if(p['الرقم_القومي']!==undefined)throw new Error('الرقم القومي ثابت ولا يمكن للمدرسة تعديله.');if(p['النوع']!==undefined)throw new Error('النوع لا يُعدّل يدويًا؛ يُستخرج من الرقم القومي.');if(p['تاريخ_الميلاد']!==undefined)throw new Error('تاريخ الميلاد لا يُعدّل يدويًا؛ يُستخرج من الرقم القومي.');var currentV94={};emp.headers.forEach(function(hh,jj){currentV94[hh]=row[jj]||'';});schoolValidateWorkerPayloadV94_(p,currentV94,id);if(p['نظام_العمل']!==undefined)v67GuardSystem_(p['المسمى_الوظيفي']!==undefined?p['المسمى_الوظيفي']:schoolV31Val_(row,ei,'المسمى_الوظيفي'),p['الوظيفة_الإشرافية']!==undefined?p['الوظيفة_الإشرافية']:schoolV31Val_(row,ei,'الوظيفة_الإشرافية'),p['نظام_العمل'],schoolV31Val_(row,ei,'نظام_العمل'));if(p['نظام_العمل']!==undefined)v40EnforceLeadershipSystem_(p['المسمى_الوظيفي']!==undefined?p['المسمى_الوظيفي']:schoolV33Val_(row,ei,'المسمى_الوظيفي'),p['نظام_العمل']);var sh=personnelSS_().getSheetByName('01_الأساسي');schoolEnsureWorkerColumnV40_(sh,'الوظيفة_الإشرافية');emp=v24Data_('01_الأساسي');ei=schoolV33Index_(emp.headers);blocked=SCHOOL_V33_TECH_FIELDS.staff.filter(function(k){return k!=='كود_الموظف';});blocked=blocked.concat(['الاسم','الرقم_القومي']).filter(function(k,i,a){return a.indexOf(k)===i;});allowed=emp.headers.filter(function(k){return k&&blocked.indexOf(k)<0;});var changes=schoolV33Write_(sh,rowIndex,emp.headers,p,blocked,allowed);schoolV31Log_(s,'تعديل كامل لبيانات عامل',id,changes);return{success:true,message:'تم حفظ جميع بيانات العامل.',changed:changes.length};}finally{try{lock.releaseLock();}catch(e){}}}
function schoolAddWorkerV33(token,payload){
  var s=schoolV33Session_(token);schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  return v35AddWorkerCore_(s.schoolId,payload,s,'بوابة المدرسة');
}
function schoolReferenceV34(token){var s=(function(){try{return schoolV33Session_(token);}catch(e){if(typeof communitySessionV42_==='function'){try{communitySessionV42_(token);return {role:'تعليم مجتمعي',schoolId:'',stages:['ابتدائي']};}catch(e2){}}throw e;}})();function uniq(sheet,col){try{var d=v24Data_(sheet),i=d.headers.indexOf(col),m={};if(i<0)return[];d.rows.forEach(function(r){var x=String(r[i]||'').trim();if(x)m[x]=1;});return Object.keys(m).sort(function(a,b){return a.localeCompare(b,'ar');});}catch(e){return[];}}var o={};o.localUnit=['صدفا','الدوير','اولادالياس','مجريس','البربا'];o.job=v67JobOptions_(uniq('R_المسميات_الوظيفية','المسمى_الوظيفي'));o.jobGroup=['التخصصية','المكتبية','الفنية','وظائف التعليم','وظائف القانون','وظائف التمويل والمحاسبة','وظائف التنمية الإدارية','الخدمات المعاونة'];o.staffStatus=['مسكن علي الكادر','غير مخاطب'];['معلم مساعد','معلم','معلم أول','معلم أول (أ)','معلم خبير','كبير معلمين','أخصائي اجتماعي مساعد','أخصائي اجتماعي','أخصائي اجتماعي أول','أخصائي اجتماعي أول (أ)','أخصائي اجتماعي خبير','كبير أخصائيين اجتماعيين','أخصائي نفسي مساعد','أخصائي نفسي','أخصائي نفسي أول','أخصائي نفسي أول (أ)','أخصائي نفسي خبير','كبير أخصائيين نفسيين','أخصائي تكنولوجيا مساعد','أخصائي تكنولوجيا','أخصائي تكنولوجيا أول','أخصائي تكنولوجيا أول (أ)','أخصائي تكنولوجيا خبير','كبير أخصائيي تكنولوجيا','أخصائي صحافة وإعلام مساعد','أخصائي صحافة وإعلام','أخصائي صحافة وإعلام أول','أخصائي صحافة وإعلام أول (أ)','أخصائي صحافة وإعلام خبير','كبير أخصائيي صحافة وإعلام','أمين مكتبة مساعد','أمين مكتبة','أمين مكتبة أول','أمين مكتبة أول (أ)','أمين مكتبة خبير','كبير أمناء مكتبات','كاتب','إداري'].forEach(function(x){if(o.job.indexOf(x)<0)o.job.push(x);});o.stage=uniq('R_المراحل','اسم_المرحلة');o.workSystem=uniq('R_أنظمة_العمل','نظام_العمل');o.type=['ذكر','أنثى'];o.employment=['قائم','غير قائم'];o.degree=uniq('R_الدرجات_المالية','الدرجة_المالية');o.subject=v72SubjectOptions_(uniq('R_المواد','اسم_المادة'));o.relation=v81RelationLabels_();o.stats=['تم الإدخال','مراجعة','مكتمل'];o.disability=['حركية','بصرية','سمعية','ذهنية','توحد','أخرى'];o.disabilityDegree=['بسيطة','متوسطة','شديدة'];o.yesno=['نعم','لا'];o.supervisoryJob=schoolSupervisoryOptionsV40_(false);o.financeStatus=['مستحق','غير مستحق','مراجعة'];o.approval=['معتمد','غير معتمد','معلق'];o.schoolStages=(s.stages||[]).filter(function(x){return String(x||'').trim();});
  o.schools=[];try{var sm=v93SchoolNameMap_();o.schools=Object.keys(sm).map(function(id){return{id:id,name:sm[id]};}).sort(function(a,b){return String(a.name).localeCompare(String(b.name),'ar');});}catch(e){}
  o.gradesByStage={};try{var gd=v24Data_('22_مرجع_المراحل_والصفوف'),gi=schoolV31Idx_(gd.headers);gd.rows.forEach(function(r){var st=schoolV31Val_(r,gi,'المرحلة'),gr=schoolV31Val_(r,gi,'الصف_المستوى');if(st&&gr){o.gradesByStage[st]=o.gradesByStage[st]||[];if(o.gradesByStage[st].indexOf(gr)<0)o.gradesByStage[st].push(gr);}});}catch(e){}return{success:true,options:v85ApplyReferenceLists_(o)};}
