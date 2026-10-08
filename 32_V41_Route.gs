/** V4.1 — التوجيه وخط السير والزيارات */
var ROUTE_V41 = {
  periodSheet:'21_فتح_خط_السير',
  routeSheet:'22_خط_السير',
  visitSheet:'23_زيارات_المشرفين',
  role:'موجه'
};

/** V4.4: أُلغيت قائمة الموجهين الثابتة داخل الكود — المصدر الوحيد هو 01_الأساسي (الوظيفة_الإشرافية + حالة_التوجيه). */
var ROUTE_V41_SEED = [];

function routeV41EnsureSheet_(name, headers){
  var ss=personnelSS_(), sh=ss.getSheetByName(name);
  if(!sh) sh=v50A_(ss.insertSheet(name));
  var lc=sh.getLastColumn();
  if(!lc || sh.getLastRow()===0){v50A_(sh.getRange(1,1,1,headers.length).setValues([headers]));}
  else {
    var cur=sh.getRange(1,1,1,lc).getDisplayValues()[0];
    headers.forEach(function(h,i){if(String(cur[i]||'').trim()!==h && i<lc)v50A_(sh.getRange(1,i+1).setValue(h));});
    if(lc<headers.length)v50A_(sh.getRange(1,lc+1,1,headers.length-lc).setValues([headers.slice(lc)]));
  }
  sh.setFrozenRows(1);sh.getRange(1,1,1,headers.length).setFontWeight('bold');
  return sh;
}
/** 01_الأساسي هو المصدر الوحيد لبيانات الموجه: الاسم/الوظيفة الإشرافية/المادة موجودة فيه أصلًا؛ نضيف له فقط أعمدة خط السير الخاصة (نظام/نطاق/مرحلة/مدارس/حالة توجيه) بدل شيت توجيه منفصل يكرر البيانات. */
var ROUTE_V41_EMP_COLS = ['نظام_خط_السير','نطاق_خط_السير','مرحلة_خط_السير','مدارس_خط_السير','حالة_التوجيه'];
function routeV41Ensure_(){
  var ready=CacheService.getScriptCache().get('ROUTE_V41_READY');if(ready==='1')return true;
  ROUTE_V41_EMP_COLS.forEach(function(c){v36EnsureCol_('01_الأساسي',c);});
  routeV41EnsureSheet_(ROUTE_V41.periodSheet,['periodId','نوع_الخط','السنة','الشهر','بداية_الفترة','نهاية_الفترة','فتح_الجمعة','فتح_السبت','أيام_الإجازات','أيام_العمل_الإضافية','حالة_الفتح','وقت_الفتح','وقت_الغلق','المستخدم','آخر_تحديث']);
  routeV41EnsureSheet_(ROUTE_V41.routeSheet,['routeId','supervisorId','employeeId','السنة','الشهر','نوع_الخط','التاريخ','اليوم','نوع_الجهة','المدارس','أسماء_المدارس','الجهة_الأخرى','الحالة','الملاحظات','وقت_الحفظ','وقت_الطباعة','عناصر_اليوم']);
  routeV41EnsureSheet_(ROUTE_V41.visitSheet,['visitId','schoolId','التاريخ','supervisorId','employeeId','اسم_الزائر','الوظيفة','المادة_أو_القسم','مصدر_الزائر','المستخدم','وقت_التسجيل','ملاحظات']);
  CacheService.getScriptCache().put('ROUTE_V41_READY','1',300);
  return true;
}
function routeV41Norm_(s){return personnelNormalizeSchoolNameV1_(String(s||''));}
function routeV41Iso_(d){return Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),'yyyy-MM-dd');}
function routeV41Date_(s){var d=routeV41ParseFlexible_(s);if(!d)throw new Error('تاريخ غير صالح.');return d;}
/** تحليل تاريخ/وقت مرن يتحمّل صيغة يوم/شهر/سنة (وبعدها وقت اختياري) التي تعيدها جوجل شيتس أحيانًا، والتي يفهمها new Date() بشكل خاطئ افتراضيًا (يعاملها كشهر/يوم/سنة). يرجع Date صالح أو null. */
function routeV41ParseFlexible_(v){
  var s=String(v||'').trim(); if(!s)return null;
  var m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if(m)return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]||0),Number(m[5]||0),Number(m[6]||0));
  var m2=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m2){var d=new Date(s.replace(' ','T'));if(!isNaN(d.getTime()))return d;return new Date(Number(m2[1]),Number(m2[2])-1,Number(m2[3]));}
  var d3=new Date(s); return isNaN(d3.getTime())?null:d3;
}
function routeV41Header_(sh){return sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];}
function routeV41Idx_(h){var m={};(h||[]).forEach(function(x,i){m[String(x||'').trim()]=i;});return m;}
function routeV41SeedSupervisors_(){
  var sh=personnelSS_().getSheetByName('01_الأساسي'), h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0], ix=routeV41Idx_(h);
  var lr=sh.getLastRow(), vals=lr>1?sh.getRange(2,1,lr-1,h.length).getDisplayValues():[];
  var byNid={}; vals.forEach(function(r,n){var nid=v24DigitsLocalV31_(r[ix['الرقم_القومي']]);if(nid)byNid[nid]=n+2;});
  var activated=0,total=0;
  ROUTE_V41_SEED.forEach(function(s){
    var nid=s[0],row=byNid[nid]; if(!row)return;
    var cur=sh.getRange(row,1,1,h.length).getDisplayValues()[0];
    if(cur[ix['حالة_التوجيه']]==='نشط'){total++;return;}
    var updates={}; updates['حالة_التوجيه']='نشط';
    if(!String(cur[ix['الوظيفة_الإشرافية']]||'').trim())updates['الوظيفة_الإشرافية']=s[2];
    if(!String(cur[ix['مادة_التدريس']]||'').trim())updates['مادة_التدريس']=s[3];
    Object.keys(updates).forEach(function(k){if(ix[k]!=null)v50A_(sh.getRange(row,ix[k]+1).setValue(updates[k]));});
    activated++; total++;
  });
  return {added:activated,total:total};
}
/** يبحث عن الموجه في 01_الأساسي مباشرة (بالرقم القومي أو employeeId) — لا شيت توجيه منفصل بعد الآن. supervisorId = employeeId دائمًا لأغراض التوافق مع سجلات خط السير/الزيارات القديمة. */
function routeV41FindSup_(key){
  routeV41Ensure_();var sh=personnelSS_().getSheetByName('01_الأساسي'),h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],i=routeV41Idx_(h),lr=sh.getLastRow(),v=lr>1?sh.getRange(2,1,lr-1,h.length).getDisplayValues():[];
  var raw=String(key||'').trim(),nidKey=v24DigitsLocalV31_(raw);
  for(var r=0;r<v.length;r++)if((nidKey&&v24DigitsLocalV31_(v[r][i['الرقم_القومي']])===nidKey)||String(v[r][i.employeeId])===raw)return {sh:sh,h:h,i:i,row:r+2,vals:v[r]};
  return null;
}
function routeV41PublicSchools_(){return listPersonnelSchoolsV241_().map(function(s){return {schoolId:s.schoolId,name:s.name,unit:s.unit||'',stages:s.stages||[]};});}
function routeV41GetPeriods_(){
  routeV41Ensure_();var sh=personnelSS_().getSheetByName(ROUTE_V41.periodSheet),h=routeV41Header_(sh),i=routeV41Idx_(h),v=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getDisplayValues():[];
  return v.map(function(r){return {periodId:r[i.periodId],type:r[i['نوع_الخط']],year:Number(r[i['السنة']])||0,month:Number(r[i['الشهر']])||0,start:v35Date_(r[i['بداية_الفترة']])||r[i['بداية_الفترة']],end:v35Date_(r[i['نهاية_الفترة']])||r[i['نهاية_الفترة']],openFriday:String(r[i['فتح_الجمعة']]).toLowerCase()==='true'||r[i['فتح_الجمعة']]==='نعم',openSaturday:String(r[i['فتح_السبت']]).toLowerCase()==='true'||r[i['فتح_السبت']]==='نعم',holidays:(r[i['أيام_الإجازات']]||'').split(',').filter(Boolean),extraWork:(r[i['أيام_العمل_الإضافية']]||'').split(',').filter(Boolean),status:r[i['حالة_الفتح']],openAt:r[i['وقت_الفتح']],closeAt:r[i['وقت_الغلق']]};});
}
function routeV41IsOpen_(p){
  if(!p||p.status!=='مفتوح')return false;var now=new Date();if(p.type==='شهري')return true;
  var st=p.openAt?routeV41ParseFlexible_(p.openAt):null, en=p.closeAt?routeV41ParseFlexible_(p.closeAt):null;return (!st||now>=st)&&(!en||now<=en);
}
function routeV41Workdays_(year,month,p){
  var names=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];var days=new Date(year,month,0).getDate(),out=[];for(var d=1;d<=days;d++){var dt=new Date(year,month-1,d),dow=dt.getDay(),iso=routeV41Iso_(dt);var weekend=((dow===5||dow===6)&&(!p.extraWork||p.extraWork.indexOf(iso)<0)&&!((dow===5&&p.openFriday)||(dow===6&&p.openSaturday)));if(!weekend&&(!p.holidays||p.holidays.indexOf(iso)<0))out.push({date:iso,day:names[dow]});}return out;
}
function routeV41FindPeriod_(type,y,m){var a=routeV41GetPeriods_();return a.find(function(p){return p.type===type&&p.year===Number(y)&&p.month===Number(m||0);})||null;}

function adminRouteInitV41(token){v35Admin_(token);return routeV41Ensure_(),{success:true,seed:routeV41SeedSupervisors_(),schools:routeV41PublicSchools_(),periods:routeV41GetPeriods_()};}
function adminRouteAddMissingBasicV41(token,payload){var a=v35Admin_(token);routeV41Ensure_();payload=payload||{};var nid=v24DigitsLocalV31_(payload.nationalId),nv=v24ValidateNationalIdV40_(nid);if(!nv.valid)throw new Error(nv.message);var name=String(payload.name||'').trim(),job=String(payload.job||'').trim();if(name.split(/\s+/).filter(Boolean).length<3)throw new Error('الاسم يجب أن يكون ثلاثيًا على الأقل.');if(!job)throw new Error('أدخل المسمى الوظيفي الأساسي.');var basic=personnelSS_().getSheetByName('01_الأساسي'),h=routeV41Header_(basic),i=routeV41Idx_(h),v=basic.getLastRow()>1?basic.getRange(2,1,basic.getLastRow()-1,basic.getLastColumn()).getDisplayValues():[];if(v.some(function(r){return v24DigitsLocalV31_(r[i['الرقم_القومي']])===nid;}))throw new Error('الرقم القومي موجود بالفعل في قاعدة العاملين.');var row=new Array(h.length).fill('');function put(k,x){if(i[k]!=null)row[i[k]]=x||'';}put('employeeId','EMP_'+Utilities.getUuid().replace(/-/g,'').slice(0,20).toUpperCase());put('الرقم_القومي',nid);put('الاسم',name);put('النوع',nv.type);put('المسمى_الوظيفي',job);put('الحالة_الوظيفية','قائم');put('حالة_السجل','قائم');put('تاريخ_بدء_العمل',new Date());v50A_(basic.appendRow(row));return adminRouteAddSupervisorV41(token,nid);}
function adminRouteAddSupervisorV41(token,nationalId){var a=v35Admin_(token);routeV41Ensure_();var sup=routeV41FindSup_(nationalId);if(!sup)throw new Error('الرقم القومي غير موجود في قاعدة العاملين.');
  if(sup.vals[sup.i['حالة_التوجيه']]==='نشط')throw new Error('هذا الموظف مضاف بالفعل إلى التوجيه.');
  v50A_(sup.sh.getRange(sup.row,sup.i['حالة_التوجيه']+1).setValue('نشط'));
  return{success:true,message:'تمت إضافة الموظف إلى التوجيه. يستكمل هو بنفسه الوظيفة الإشرافية والقسم/المادة ونظام خط السير من حسابه.'};}
/** مصدر الحقيقة الوحيد الآن: 01_الأساسي بالكامل (الاسم/الوظيفة الإشرافية/القسم/نظام خط السير/نطاق الإشراف) — يعدّلها الموجه بنفسه. هذه الدالة للعرض فقط. */
/** كل بيانات المشرف مصدرها 01_الأساسي وحده الآن — أي موظف له حالة_التوجيه (نشط أو موقوف) يُعتبر مضافًا للتوجيه. */
function adminRouteSupervisorsV41(token){v35Admin_(token);routeV41Ensure_();
  var emp=v24Data_('01_الأساسي'),ei=schoolV31Idx_(emp.headers);
  var out=[];
  emp.rows.forEach(function(r){
    var st=schoolV31Val_(r,ei,'حالة_التوجيه'); if(!st)return;
    var scopeType=schoolV31Val_(r,ei,'نطاق_خط_السير')||'', scopeStage=schoolV31Val_(r,ei,'مرحلة_خط_السير')||'';
    var scopeLabel=scopeType==='الكل'?'كل المدارس':(scopeType==='مرحلة'?('مرحلة: '+scopeStage):(scopeType?'مدارس محددة':'—'));
    var eid=schoolV31Val_(r,ei,'employeeId');
    out.push({supervisorId:eid,employeeId:eid,nationalId:schoolV31Val_(r,ei,'الرقم_القومي'),name:schoolV31Val_(r,ei,'الاسم'),job:schoolV31Val_(r,ei,'الوظيفة_الإشرافية'),subject:schoolV31Val_(r,ei,'مادة_التدريس'),scope:scopeLabel,schools:(schoolV31Val_(r,ei,'مدارس_خط_السير')||'').split('|').filter(Boolean),routeType:schoolV31Val_(r,ei,'نظام_خط_السير'),status:st,username:'',hasLogin:false});
  });
  out.sort(function(a,b){return String(a.name).localeCompare(String(b.name),'ar');});
  return out;
}
/** الأدمن يغيّر الحالة (نشط/موقوف) فقط — الوظيفة الإشرافية/القسم/نطاق الإشراف يحددها الموجه بنفسه حصرًا لتفادي ازدواج مصدر الحقيقة. */
function adminRouteSaveSupervisorV41(token,payload){var a=v35Admin_(token);routeV41Ensure_();payload=payload||{};var sup=routeV41FindSup_(payload.nationalId||payload.supervisorId);if(!sup)throw new Error('المشرف غير موجود في قائمة التوجيه.');
  if(payload.status&&['نشط','موقوف'].indexOf(payload.status)<0)throw new Error('الحالة يجب أن تكون نشط أو موقوف.');
  var vals=sup.vals.slice(),i=sup.i;function put(k,v){if(i[k]!=null)vals[i[k]]=v==null?'':v;}
  if(payload.status)put('حالة_التوجيه',payload.status);put('آخر_تحديث',new Date());put('المستخدم',a.username);
  v50A_(sup.sh.getRange(sup.row,1,1,sup.h.length).setValues([vals]));return{success:true,message:'تم حفظ حالة المشرف.'};}
function adminRouteCreateLoginV41(token,nationalId){var a=v35Admin_(token);routeV41Ensure_();var sup=routeV41FindSup_(nationalId);if(!sup)throw new Error('المشرف غير موجود.');var us=personnelSS_().getSheetByName('R_المستخدمون'),h=routeV41Header_(us),i=routeV41Idx_(h),v=us.getLastRow()>1?us.getRange(2,1,us.getLastRow()-1,us.getLastColumn()).getDisplayValues():[],username=v24DigitsLocalV31_(sup.vals[sup.i['الرقم_القومي']]);var pw=ROUTE_V41_DEFAULT_PASSWORD;var found=-1;for(var r=0;r<v.length;r++)if(String(v[r][i.username])===username){found=r+2;break;}var row=new Array(h.length).fill('');function put(k,x){if(i[k]!=null)row[i[k]]=x;}put('userId',found>0?v[found-2][i.userId]:'USR_'+Utilities.getUuid().replace(/-/g,'').slice(0,20));put('username',username);put('password',pw);put('name',sup.vals[sup.i['الاسم']]);put('role','موجه');put('subject',sup.vals[sup.i['مادة_التدريس']]);put('schoolId','');put('school','ديوان الإدارة');put('stage','');put('status','فعال');if(found>0)v50A_(us.getRange(found,1,1,h.length).setValues([row]));else v50A_(us.appendRow(row));return{success:true,username:username,password:pw,message:'تم إنشاء بيانات دخول الموجه. كلمة المرور الافتراضية '+ROUTE_V41_DEFAULT_PASSWORD+' — يغيّرها هو من حسابه.'};}

function loginSupervisorV41Core_(nationalId,password){routeV41Ensure_();var nid=v24DigitsLocalV31_(nationalId),p=String(password||'').trim(),sup=routeV41FindSup_(nid);if(!sup||sup.vals[sup.i['حالة_التوجيه']]!=='نشط')return{success:false,message:'هذا الموظف غير مضاف للتوجيه أو غير نشط.'};var us=personnelSS_().getSheetByName('R_المستخدمون'),h=routeV41Header_(us),i=routeV41Idx_(h),v=us.getLastRow()>1?us.getRange(2,1,us.getLastRow()-1,us.getLastColumn()).getDisplayValues():[];for(var r=0;r<v.length;r++)if(String(v[r][i.username])===nid&&String(v[r][i.password])===p&&String(v[r][i.role])==='موجه'&&v[r][i.status]!=='موقوف'){var t=Utilities.getUuid().replace(/-/g,''),eid=sup.vals[sup.i.employeeId];CacheService.getScriptCache().put('V271_SES_'+t,JSON.stringify({role:'موجه',username:nid,name:sup.vals[sup.i['الاسم']],employeeId:eid,supervisorId:eid}),21600);return{success:true,token:t,user:{role:'موجه',name:sup.vals[sup.i['الاسم']],nationalId:nid,employeeId:eid,supervisorId:eid}};}return{success:false,message:'الرقم القومي أو كلمة المرور غير صحيحة.'};}
function routeV41Session_(token){var s=getSchoolSessionV271(token);if(s&&(s.role==='موجه'||s.role==='موظف'))s=v93LiveStaff_(s);   // V7.35
if(s&&s.role==='موجه')return s;if(s&&s.role==='موظف'&&s.permissions&&s.permissions.some(function(p){return p.permission==='خط السير'&&p.status!=='موقوف';})){if(!s.supervisorId)s.supervisorId=s.employeeId;return s;}throw new Error('جلسة الموجه غير صالحة أو منتهية.');}

function supervisorRouteProfileV41(token){routeV41Session_(token);return{success:true,schools:routeV41PublicSchools_()};}
/** يحفظ نظام خط السير (شهري/أسبوعي) فقط. الوظيفة الإشرافية/القسم مصدرهما الوحيد 01_الأساسي (عبر supervisorBasicSaveV41)، ونطاق الإشراف مصدره الوحيد عبر supervisorScopeSaveV41 — هذه الدالة لا تلمسهما إطلاقًا لتفادي ازدواج مصدر الحقيقة. */
function supervisorRouteSaveProfileV41(token,payload){var s=routeV41Session_(token),sup=routeV41FindSup_(s.supervisorId);if(!sup)throw new Error('بيانات التوجيه غير موجودة.');var p=payload||{},vals=sup.vals.slice(),i=sup.i;function put(k,v){if(i[k]!=null)vals[i[k]]=v==null?'':v;}
  if(p.routeType!==undefined&&['شهري','أسبوعي'].indexOf(p.routeType)<0)throw new Error('نظام خط السير يجب أن يكون شهري أو أسبوعي.');
  put('جهة_العمل','ديوان الإدارة');if(p.routeType!==undefined)put('نظام_خط_السير',p.routeType);put('آخر_تحديث',new Date());put('المستخدم',s.username);v50A_(sup.sh.getRange(sup.row,1,1,sup.h.length).setValues([vals]));return{success:true,message:'تم حفظ نظام خط السير.'};}
function supervisorRouteDataV41(token,year,month){var s=routeV41Session_(token);routeV41Ensure_();var sup=routeV41FindSup_(s.supervisorId),type=String(sup.vals[sup.i['نظام_خط_السير']]||'').trim();if(!type)return{success:true,needType:true};var p=type==='أسبوعي'?routeV41GetPeriods_().filter(function(x){if(x.type!=='أسبوعي')return false;var st=x.start?new Date(x.start):null,en=x.end?new Date(x.end):null,ms=new Date(Number(year),Number(month)-1,1),me=new Date(Number(year),Number(month),0);return st&&en&&st<=me&&en>=ms;}).sort(function(a,b){return String(b.start).localeCompare(String(a.start));})[0]||null:routeV41FindPeriod_(type,year,month);if(!p)return{success:true,closed:true,message:type==='شهري'?'لم تفتح الإدارة هذا الشهر بعد.':'لا توجد فترة أسبوعية مفتوحة حاليًا.',type:type,year:Number(year),month:Number(month)};var open=routeV41IsOpen_(p),dates=[];if(type==='شهري')dates=routeV41Workdays_(Number(year),Number(month),p);else{var a=routeV41Date_(p.start),b=routeV41Date_(p.end),cur=new Date(a);while(cur<=b){var dow=cur.getDay(),iso=routeV41Iso_(cur);var wk=((dow===5||dow===6)&&(!p.extraWork||p.extraWork.indexOf(iso)<0)&&!((dow===5&&p.openFriday)||(dow===6&&p.openSaturday)));if(!wk&&(p.holidays||[]).indexOf(iso)<0)dates.push({date:iso,day:['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'][dow]});cur.setDate(cur.getDate()+1);}}
var sh=personnelSS_().getSheetByName(ROUTE_V41.routeSheet),h=routeV41Header_(sh),i=routeV41Idx_(h),v=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getDisplayValues():[],map={};v.forEach(function(r){if(String(r[i.supervisorId])===String(s.supervisorId)&&Number(r[i['السنة']])===Number(year)&&Number(r[i['الشهر']])===Number(month)&&String(r[i['نوع_الخط']])===type){var entries=[];try{entries=JSON.parse(r[i['عناصر_اليوم']]||'[]')||[];}catch(e2){entries=[];}if(!entries.length){var legacyIds=(r[i['المدارس']]||'').split('|').filter(Boolean),legacyNames=(r[i['أسماء_المدارس']]||'').split(' | ').filter(Boolean);if(legacyIds.length)entries=legacyIds.map(function(id,idx){return{type:'مدرسة',schoolId:id,schoolName:legacyNames[idx]||''};});else if(r[i['نوع_الجهة']]&&r[i['نوع_الجهة']]!=='مدرسة')entries=[{type:r[i['نوع_الجهة']],other:r[i['الجهة_الأخرى']]||''}];}map[v35Date_(r[i['التاريخ']])||r[i['التاريخ']]]={type:r[i['نوع_الجهة']]||'مدرسة',schools:(r[i['المدارس']]||'').split('|').filter(Boolean),names:(r[i['أسماء_المدارس']]||'').split(' | ').filter(Boolean),other:r[i['الجهة_الأخرى']]||'',status:r[i['الحالة']]||'محفوظ',notes:r[i['الملاحظات']]||'',entries:entries};}});return{success:true,type:type,year:Number(year),month:Number(month),period:p,open:open,readonly:!open,dates:dates,rows:map,schools:routeV41ScopeSchools_(sup),destTypes:ROUTE_V41_DEST_TYPES,maxItems:ROUTE_V41_MAX_ITEMS};}
/** يوم خط السير = حتى 4 عناصر مستقلة (مدرسة/مدرسة أخرى/مكتب/مديرية/شئون قانونية/نيابة إدارية/إجازة رسمية/إجازة مرضي/إجازة اعتيادي/أخرى بنص حر). المدارس لا تتكرر في نفس اليوم. نحافظ أيضًا على الحقول القديمة (نوع_الجهة/المدارس/أسماء_المدارس) مشتقة تلقائيًا حتى تستمر شاشات الزائرين والمتابعة الميدانية في العمل بلا تعديل. */
function routeV41ValidateEntries_(entries,allowed){
  entries=(entries||[]).slice(0,ROUTE_V41_MAX_ITEMS);
  var seenSchools={},out=[];
  entries.forEach(function(e){
    var type=String(e.type||'').trim();
    if(type==='مدرسة'){
      var sid=e.schoolId;if(!sid||!allowed[sid])throw new Error('مدرسة غير متاحة ضمن نطاق إشرافك.');
      if(seenSchools[sid])throw new Error('لا يمكن اختيار نفس المدرسة أكثر من مرة في نفس اليوم.');
      seenSchools[sid]=true; out.push({type:'مدرسة',schoolId:sid,schoolName:allowed[sid]});
    } else if(ROUTE_V41_DEST_TYPES.indexOf(type)>=0){
      if(type==='أخرى'&&!String(e.other||'').trim())throw new Error('اكتب بيان الجهة الأخرى.');
      out.push({type:type,other:type==='أخرى'?String(e.other||'').trim():''});
    } else throw new Error('نوع جهة غير معروف: '+type);
  });
  return out;
}
function supervisorRouteSaveV41(token,year,month,items){var s=routeV41Session_(token),data=supervisorRouteDataV41(token,year,month);if(data.needType)throw new Error('حدد نظام خط السير أولًا: شهري أو أسبوعي.');if(!data.open)throw new Error('خط السير مغلق حاليًا.');
  var allowed={};data.schools.forEach(function(x){allowed[x.schoolId]=x.name;});
  items=items||[];
  var validDates={};(data.dates||[]).forEach(function(d){validDates[d.date]=d.day;});
  items.forEach(function(x){if(!validDates[x.date])throw new Error('التاريخ «'+x.date+'» ليس ضمن أيام العمل المفتوحة لهذا الخط.');});
  var prepared=items.map(function(x){return {date:x.date,day:x.day||validDates[x.date],entries:routeV41ValidateEntries_(x.entries,allowed),notes:x.notes||''};});
  return v35Lock_(function(){
    var sh=personnelSS_().getSheetByName(ROUTE_V41.routeSheet),h=routeV41Header_(sh),i=routeV41Idx_(h),all=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getDisplayValues():[];
    var existing={};all.forEach(function(r,n){if(String(r[i.supervisorId])===String(s.supervisorId)&&Number(r[i['السنة']])===Number(year)&&Number(r[i['الشهر']])===Number(month)&&String(r[i['نوع_الخط']])===String(data.type))existing[v35Date_(r[i['التاريخ']])||r[i['التاريخ']]]={row:n+2,vals:r};});
    var now=new Date(),toAppend=[];
    prepared.forEach(function(x){
      var schoolEntries=x.entries.filter(function(e){return e.type==='مدرسة';});
      var ids=schoolEntries.map(function(e){return e.schoolId;}), names=schoolEntries.map(function(e){return e.schoolName;});
      var firstNonSchool=x.entries.filter(function(e){return e.type!=='مدرسة';})[0];
      var legacyType=ids.length?'مدرسة':(firstNonSchool?firstNonSchool.type:'مدرسة');
      var row=existing[x.date]?existing[x.date].vals.slice():new Array(h.length).fill('');function put(k,v){if(i[k]!=null)row[i[k]]=v==null?'':v;}
      put('routeId',existing[x.date]?row[i.routeId]:'ROUTE_'+Utilities.getUuid().replace(/-/g,'').slice(0,20));put('supervisorId',s.supervisorId);put('employeeId',s.employeeId);put('السنة',year);put('الشهر',month);put('نوع_الخط',data.type);put('التاريخ',x.date);put('اليوم',x.day||'');
      put('نوع_الجهة',legacyType);put('المدارس',ids.join('|'));put('أسماء_المدارس',names.join(' | '));put('الجهة_الأخرى',(x.entries.filter(function(e){return e.type==='أخرى';})[0]||{}).other||'');
      put('الحالة','محفوظ');put('الملاحظات',x.notes||'');put('وقت_الحفظ',now);put('عناصر_اليوم',JSON.stringify(x.entries));
      if(existing[x.date])v50A_(sh.getRange(existing[x.date].row,1,1,h.length).setValues([row]));else toAppend.push(row);
    });
    v36AppendRows_(sh,toAppend);
    return{success:true,message:'تم حفظ خط السير بنجاح.'};
  });
}
function supervisorRoutePrintMarkV41(token,year,month){var s=routeV41Session_(token),sh=personnelSS_().getSheetByName(ROUTE_V41.routeSheet),h=routeV41Header_(sh),i=routeV41Idx_(h),lr=sh.getLastRow(),v=lr>1?sh.getRange(2,1,lr-1,sh.getLastColumn()).getDisplayValues():[];
  if(i['وقت_الطباعة']==null)return{success:true};
  var now=new Date(),col=i['وقت_الطباعة']+1,rowsToStamp=[];
  v.forEach(function(r,n){if(String(r[i.supervisorId])===String(s.supervisorId)&&Number(r[i['السنة']])===Number(year)&&Number(r[i['الشهر']])===Number(month))rowsToStamp.push(n+2);});
  // كتابة دفعية واحدة بدل setValue منفصل لكل صف — لو الصفوف متتالية، تُكتب بمدى واحد؛ غير ذلك صفًا صفًا لكن بأقل استدعاءات ممكنة.
  var i2=0;while(i2<rowsToStamp.length){var start=rowsToStamp[i2],j=i2;while(j+1<rowsToStamp.length&&rowsToStamp[j+1]===rowsToStamp[j]+1)j++;var count=j-i2+1;v50A_(sh.getRange(start,col,count,1).setValues(Array(count).fill([now])));i2=j+1;}
  return{success:true};
}

function schoolRouteVisitorsV41(token,date){var ss=schoolV31Session_(token),iso=routeV41Iso_(routeV41Date_(date));routeV41Ensure_();var sh=personnelSS_().getSheetByName(ROUTE_V41.routeSheet),h=routeV41Header_(sh),i=routeV41Idx_(h),v=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getDisplayValues():[];var emp=v24Data_('01_الأساسي'),ei=schoolV31Idx_(emp.headers),supMap={};emp.rows.forEach(function(r){supMap[schoolV31Val_(r,ei,'employeeId')]=r;});var out=[];v.forEach(function(r){if((v35Date_(r[i['التاريخ']])||r[i['التاريخ']])!==iso)return;var ids=(r[i['المدارس']]||'').split('|');if(ids.indexOf(ss.schoolId)<0)return;var sr=supMap[r[i.employeeId]];if(sr)out.push({supervisorId:r[i.supervisorId],employeeId:r[i.employeeId],name:schoolV31Val_(sr,ei,'الاسم'),job:schoolV31Val_(sr,ei,'الوظيفة_الإشرافية'),subject:schoolV31Val_(sr,ei,'مادة_التدريس')});});var vs=personnelSS_().getSheetByName(ROUTE_V41.visitSheet),vh=routeV41Header_(vs),vi=routeV41Idx_(vh),vv=vs.getLastRow()>1?vs.getRange(2,1,vs.getLastRow()-1,vs.getLastColumn()).getDisplayValues():[],seen={};vv.forEach(function(r){if(r[vi.schoolId]===ss.schoolId&&(v35Date_(r[vi['التاريخ']])||r[vi['التاريخ']])===iso&&r[vi.supervisorId])seen[String(r[vi.supervisorId])]=true;});out.forEach(function(x){x.visited=!!seen[String(x.supervisorId)];});return{success:true,date:iso,visitors:out};}
function schoolSearchVisitorOtherV41(token,q){schoolV31Session_(token);q=routeV41Norm_(q);if(q.length<2)return[];var d=v24Data_('01_الأساسي'),i=routeV41Idx_(d.headers),out=[];for(var r=0;r<d.rows.length&&out.length<20;r++){var n=routeV41Norm_(d.rows[r][i['الاسم']]),nid=v24DigitsLocalV31_(d.rows[r][i['الرقم_القومي']]);if(n.indexOf(q)>=0||nid.indexOf(v24DigitsLocalV31_(q))>=0)out.push({employeeId:d.rows[r][i.employeeId],name:d.rows[r][i['الاسم']],job:d.rows[r][i['المسمى_الوظيفي']],subject:d.rows[r][i['مادة_التدريس']]});}return out;}
function schoolSaveVisitorV41(token,date,visitor){var s=schoolV31Session_(token),iso=routeV41Iso_(routeV41Date_(date)),p=v93SafeObj_(visitor||{});if(!p.name)throw new Error('حدد الزائر.');routeV41Ensure_();
  return v35Lock_(function(){
    var sh=personnelSS_().getSheetByName(ROUTE_V41.visitSheet),h=routeV41Header_(sh),i=routeV41Idx_(h);
    // منع التكرار: نفس المدرسة + نفس اليوم + نفس المشرف (أو نفس الاسم لو بلا مشرف) = زيارة واحدة فقط.
    var lr=sh.getLastRow();
    if(lr>1){var v=sh.getRange(2,1,lr-1,h.length).getDisplayValues();for(var r=0;r<v.length;r++){if(v[r][i.schoolId]!==s.schoolId)continue;if((v35Date_(v[r][i['التاريخ']])||v[r][i['التاريخ']])!==iso)continue;var same=p.supervisorId?(String(v[r][i.supervisorId])===String(p.supervisorId)):(!v[r][i.supervisorId]&&v[r][i['اسم_الزائر']]===p.name);if(same)return{success:true,message:'الزيارة مسجَّلة بالفعل.',already:true};}}
    var row=new Array(h.length).fill('');function put(k,v){if(i[k]!=null)row[i[k]]=v||'';}put('visitId','VIS_'+Utilities.getUuid().replace(/-/g,'').slice(0,20));put('schoolId',s.schoolId);put('التاريخ',iso);put('supervisorId',p.supervisorId||'');put('employeeId',p.employeeId||'');put('اسم_الزائر',p.name);put('الوظيفة',p.job||'');put('المادة_أو_القسم',p.subject||'');put('مصدر_الزائر',p.source||'قائمة أخرى');put('المستخدم',s.username);put('وقت_التسجيل',new Date());put('ملاحظات',p.notes||'');v50A_(sh.appendRow(row));return{success:true,message:'تم تسجيل الزيارة.'};
  });
}
function adminRouteOpenMonthlyV41(token,year,month,holidayDates,extraWorkDates,openFriday,openSaturday){var a=v35Admin_(token);routeV41Ensure_();year=Number(year);month=Number(month);if(!year||month<1||month>12)throw new Error('الشهر غير صحيح.');var sh=personnelSS_().getSheetByName(ROUTE_V41.periodSheet),h=routeV41Header_(sh),i=routeV41Idx_(h),p=routeV41FindPeriod_('شهري',year,month),row=p?p:null,vals=p?null:new Array(h.length).fill('');var existingRows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getDisplayValues():[];var rowNum=-1;if(p){for(var r=0;r<existingRows.length;r++)if(existingRows[r][i.periodId]===p.periodId){rowNum=r+2;vals=existingRows[r].slice();break;}}function put(k,v){if(i[k]!=null)vals[i[k]]=v==null?'':v;}put('periodId',p?p.periodId:'PER_'+Utilities.getUuid().replace(/-/g,'').slice(0,20));put('نوع_الخط','شهري');put('السنة',year);put('الشهر',month);put('بداية_الفترة',year+'-'+('0'+month).slice(-2)+'-01');put('نهاية_الفترة',routeV41Iso_(new Date(year,month,0)));put('فتح_الجمعة',!!openFriday?'نعم':'لا');put('فتح_السبت',!!openSaturday?'نعم':'لا');put('أيام_الإجازات',(holidayDates||[]).join(','));put('أيام_العمل_الإضافية',(extraWorkDates||[]).join(','));put('حالة_الفتح','مفتوح');put('وقت_الفتح',new Date());put('المستخدم',a.username);put('آخر_تحديث',new Date());if(rowNum>0)v50A_(sh.getRange(rowNum,1,1,h.length).setValues([vals]));else v50A_(sh.appendRow(vals));return{success:true,message:'تم فتح الشهر لخط السير.'};}
function adminRouteOpenWeeklyV41(token,startDate,endDate,openFriday,openSaturday,openAt,closeAt){var a=v35Admin_(token);routeV41Ensure_();var st=routeV41Date_(startDate),en=routeV41Date_(endDate);if(en<st)throw new Error('نهاية الفترة قبل بدايتها.');var sh=personnelSS_().getSheetByName(ROUTE_V41.periodSheet),h=routeV41Header_(sh),i=routeV41Idx_(h),vals=new Array(h.length).fill('');function put(k,v){if(i[k]!=null)vals[i[k]]=v||'';}put('periodId','PER_'+Utilities.getUuid().replace(/-/g,'').slice(0,20));put('نوع_الخط','أسبوعي');put('السنة',st.getFullYear());put('الشهر',st.getMonth()+1);put('بداية_الفترة',routeV41Iso_(st));put('نهاية_الفترة',routeV41Iso_(en));put('فتح_الجمعة',!!openFriday?'نعم':'لا');put('فتح_السبت',!!openSaturday?'نعم':'لا');put('حالة_الفتح','مفتوح');put('وقت_الفتح',openAt||new Date());put('وقت_الغلق',closeAt||new Date(new Date().getTime()+7*24*3600000));put('المستخدم',a.username);put('آخر_تحديث',new Date());v50A_(sh.appendRow(vals));return{success:true,message:'تم فتح الفترة الأسبوعية.'};}
function adminRouteCloseV41(token,periodId){var a=v35Admin_(token);routeV41Ensure_();var sh=personnelSS_().getSheetByName(ROUTE_V41.periodSheet),h=routeV41Header_(sh),i=routeV41Idx_(h),v=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getDisplayValues():[];for(var r=0;r<v.length;r++)if(v[r][i.periodId]===String(periodId)){v50A_(sh.getRange(r+2,i['حالة_الفتح']+1).setValue('مغلق'));v50A_(sh.getRange(r+2,i['آخر_تحديث']+1).setValue(new Date()));return{success:true,message:'تم غلق الفترة.'};}throw new Error('الفترة غير موجودة.');}

/* ============ V4.1.9 — توحيد بيانات الموجه مع 01_الأساسي + نطاق إشراف ذاتي + كلمة سر افتراضية + رئيس قسم + متابعة ميدانية ============ */
var ROUTE_V41_JOBS = ['موجه أول', 'موجه', 'رئيس قسم', 'وكيل قسم', 'عضو قسم'];
var ROUTE_V41_STAGE_NAMES = ['رياض أطفال', 'ابتدائي', 'إعدادي', 'ثانوي'];
var ROUTE_V41_DEFAULT_PASSWORD = '123456';
var ROUTE_V41_DEST_TYPES = ['مكتب','مديرية','شئون قانونية','نيابة إدارية','إجازة رسمية','إجازة مرضي','إجازة اعتيادي','أخرى'];
var ROUTE_V41_MAX_ITEMS = 4;

/** بيانات الموجه الأساسية الحقيقية من 01_الأساسي — يعدّلها هو بنفسه (هاتف/بريد/عنوان) + وظيفته الإشرافية وقسمه/مادته. */
function supervisorBasicGetV41(token) {
  var s = routeV41Session_(token);
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), row = null;
  emp.rows.forEach(function (r) { if (schoolV31Val_(r, ei, 'employeeId') === s.employeeId) row = r; });
  if (!row) throw new Error('سجلك الأساسي غير موجود.');
  var f = {};['الاسم', 'الرقم_القومي', 'النوع', 'تاريخ_الميلاد', 'الهاتف', 'البريد', 'العنوان', 'المسمى_الوظيفي', 'الوظيفة_الإشرافية', 'مادة_التدريس'].forEach(function (k) { f[k] = schoolV31Val_(row, ei, k); });
  var sup = routeV41FindSup_(s.supervisorId);
  return { success: true, fields: f, jobs: ROUTE_V41_JOBS, subjects: subjectListV44_(), routeType: sup ? sup.vals[sup.i['نظام_خط_السير']] : '', scopeType: sup ? (sup.vals[sup.i['نطاق_خط_السير']] || '') : '', scopeStage: sup ? (sup.vals[sup.i['مرحلة_خط_السير']] || '') : '', scopeSchools: sup ? (sup.vals[sup.i['مدارس_خط_السير']] || '').split('|').filter(Boolean) : [] };
}
/** حفظ بيانات الموجه الأساسية فعليًا في 01_الأساسي (هاتف/بريد/عنوان)، ووظيفته الإشرافية وقسمه/مادته. */
function supervisorBasicSaveV41(token, payload) {
  var s = routeV41Session_(token); payload = payload || {};
  var sh = personnelSS_().getSheetByName('01_الأساسي'), h = v36Headers_(sh), ix = schoolV31Idx_(h), lr = sh.getLastRow(), rowNum = -1;
  var vals = sh.getRange(2, 1, lr - 1, h.length).getDisplayValues();
  for (var i = 0; i < vals.length; i++) if (vals[i][ix.employeeId] === s.employeeId) { rowNum = i + 2; break; }
  if (rowNum < 2) throw new Error('سجلك الأساسي غير موجود.');
  if (payload['الوظيفة_الإشرافية'] !== undefined && ROUTE_V41_JOBS.indexOf(payload['الوظيفة_الإشرافية']) < 0) throw new Error('الوظيفة الإشرافية يجب أن تكون: ' + ROUTE_V41_JOBS.join('، '));
  var allowed = ['الهاتف', 'البريد', 'العنوان', 'الوظيفة_الإشرافية', 'مادة_التدريس'];
  /* V7.35: «رئيس قسم» يفتح لوحات القسم — لا يمنحه الموجه لنفسه؛ تعيينه من الإدارة فقط. */
  if (payload['الوظيفة_الإشرافية'] !== undefined) { var curJob = String(vals[rowNum - 2][ix['الوظيفة_الإشرافية']] || '').trim(), newJob = String(payload['الوظيفة_الإشرافية'] || '').trim();
    if (newJob !== curJob && (/رئيس قسم/.test(newJob) || /رئيس قسم/.test(curJob))) throw new Error('تغيير «رئيس قسم» يتم من الإدارة فقط.'); }
  return v35Lock_(function () {
    var changed = 0;
    if (payload['مادة_التدريس'] !== undefined) payload['مادة_التدريس'] = subjectCanonV44_(payload['مادة_التدريس']);
    allowed.forEach(function (k) { if (payload[k] !== undefined && ix[k] != null) { v50A_(sh.getRange(rowNum, ix[k] + 1).setValue(schoolV31Clean_(payload[k]))); changed++; } });
    schoolV31Log_(s, 'تحديث بيانات الموجه الأساسية', s.employeeId, [['حقول محدَّثة', '', String(changed)]]);
    return { success: true, message: 'تم حفظ بياناتك الأساسية.', changed: changed };
  });
}
/** نطاق الإشراف: يحدده الموجه بنفسه — الكل / مرحلة (مع اختيار كل مدارسها أو بعضها) / مدارس محددة بلا التزام بمرحلة. */
function supervisorScopeSaveV41(token, payload) {
  var s = routeV41Session_(token), sup = routeV41FindSup_(s.supervisorId); if (!sup) throw new Error('بيانات التوجيه غير موجودة.');
  var type = String(payload.scopeType || '').trim(); if (['الكل', 'مرحلة', 'مدارس'].indexOf(type) < 0) throw new Error('حدد نطاق الإشراف: الكل، مرحلة، أو مدارس محددة.');
  var stage = type === 'مرحلة' ? String(payload.stage || '').trim() : '';
  if (type === 'مرحلة' && !stage) throw new Error('حدد المرحلة أولًا.');
  var schools = (type === 'الكل') ? [] : (payload.schools || []);
  var vals = sup.vals.slice(), i = sup.i; function put(k, v) { if (i[k] != null) vals[i[k]] = v == null ? '' : v; }
  put('نطاق_خط_السير', type); put('مرحلة_خط_السير', stage); put('مدارس_خط_السير', schools.join('|')); put('آخر_تحديث', new Date());
  v50A_(sup.sh.getRange(sup.row, 1, 1, sup.h.length).setValues([vals]));
  return { success: true, message: 'تم حفظ نطاق الإشراف.' };
}
/** مدارس نطاق إشراف الموجه فعليًا — محسوبة من نوع النطاق، لا من قائمة مدارس خام. */
function routeV41ScopeSchools_(sup) {
  var all = routeV41PublicSchools_(), type = sup.vals[sup.i['نطاق_خط_السير']] || '';
  if (!type || type === 'الكل') return all;
  if (type === 'مرحلة') {
    var stage = sup.vals[sup.i['مرحلة_خط_السير']] || '', inStage = all.filter(function (x) { return (x.stages || []).indexOf(stage) >= 0; });
    var picked = (sup.vals[sup.i['مدارس_خط_السير']] || '').split('|').filter(Boolean);
    return picked.length ? inStage.filter(function (x) { return picked.indexOf(x.schoolId) >= 0; }) : inStage;
  }
  var ids = (sup.vals[sup.i['مدارس_خط_السير']] || '').split('|').filter(Boolean);
  return ids.length ? all.filter(function (x) { return ids.indexOf(x.schoolId) >= 0; }) : all;
}

/* ---------- كلمة مرور افتراضية 123456 + تغييرها ---------- */
function supervisorChangePasswordV41(token, oldPw, newPw) {
  var s = routeV41Session_(token); newPw = String(newPw || '').trim();
  if (newPw.length < 4) throw new Error('كلمة المرور الجديدة يجب ألا تقل عن 4 خانات.');
  var us = personnelSS_().getSheetByName('R_المستخدمون'), h = v36Headers_(us), i = schoolV31Idx_(h), lr = us.getLastRow(), row = -1;
  var v = lr > 1 ? us.getRange(2, 1, lr - 1, h.length).getDisplayValues() : [];
  for (var r = 0; r < v.length; r++) if (String(v[r][i.username]) === String(s.username) && v[r][i.role] === 'موجه') { row = r + 2; break; }
  if (row < 2) throw new Error('حسابك غير موجود.');
  if (String(v[row - 2][i.password]) !== String(oldPw || '')) throw new Error('كلمة المرور الحالية غير صحيحة.');
  return v35Lock_(function () { v50A_(us.getRange(row, i.password + 1).setValue(newPw)); return { success: true, message: 'تم تغيير كلمة المرور.' }; });
}

/* ---------- رئيس قسم: متابعة طلبة مرحلته عبر كل المدارس ---------- */
function supervisorDeptStudentsV41(token) {
  var s = routeV41Session_(token);
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), row = null;
  emp.rows.forEach(function (r) { if (schoolV31Val_(r, ei, 'employeeId') === s.employeeId) row = r; });
  var job = row ? schoolV31Val_(row, ei, 'الوظيفة_الإشرافية') : '', deptRaw = row ? (schoolV31Val_(row, ei, 'القسم') || schoolV31Val_(row, ei, 'مادة_التدريس')) : '', dept = (typeof v42StageOfDept_ === 'function' ? v42StageOfDept_(deptRaw) : '') || deptRaw;
  if (dept === 'ثانوي فني') dept = 'ثانوي';
  if (job !== 'رئيس قسم' && job !== 'وكيل قسم') return { success: true, isDeptHead: false };
  if (ROUTE_V41_STAGE_NAMES.indexOf(dept) < 0) return { success: true, isDeptHead: true, stage: dept, note: 'قسمك «' + dept + '» غير مرتبط بمرحلة دراسية معروفة، فلا تتوفر إحصائيات آلية له.' };
  var stu = v24Data_('13_شؤون_الطلاب'), sti = schoolV31Idx_(stu.headers);
  var s18 = v24Data_('18_بيانات_المدارس'), s18i = schoolV31Idx_(s18.headers), names = {}; s18.rows.forEach(function (r) { names[schoolV31Val_(r, s18i, 'schoolId')] = schoolV31Val_(r, s18i, 'اسم_المدرسة'); });
  var bySchool = {}, totals = { classes: 0, total: 0, male: 0, female: 0, disabled: 0 };
  stu.rows.forEach(function (r) {
    if (schoolV31Val_(r, sti, 'المرحلة') !== dept) return;
    var sid = sti.schoolId != null ? schoolV31Val_(r, sti, 'schoolId') : '';
    var name = names[sid] || schoolV31Val_(r, sti, 'اسم المدرسة');
    if (!bySchool[sid]) bySchool[sid] = { schoolId: sid, name: name, classes: 0, total: 0, male: 0, female: 0, disabled: 0 };
    var cl = Number(schoolV31Val_(r, sti, 'عدد الفصول/القاعات')) || 0, tot = Number(schoolV31Val_(r, sti, 'إجمالي الطلاب')) || 0, mal = Number(schoolV31Val_(r, sti, 'ذكور')) || 0, fem = Number(schoolV31Val_(r, sti, 'إناث')) || 0, dis = Number(schoolV31Val_(r, sti, 'عدد_ذوي_الإعاقة')) || 0;
    bySchool[sid].classes += cl; bySchool[sid].total += tot; bySchool[sid].male += mal; bySchool[sid].female += fem; bySchool[sid].disabled += dis;
    totals.classes += cl; totals.total += tot; totals.male += mal; totals.female += fem; totals.disabled += dis;
  });
  var schools = Object.keys(bySchool).map(function (k) { return bySchool[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); });
  // غياب اليوم (إن وُجد) من يومية كل مدرسة لنفس المرحلة
  var today = v40Today_(), absentToday = 0; try {
    var dsh = v40DailySheet_(), dh = v36Headers_(dsh), dix = schoolV31Idx_(dh), dlr = dsh.getLastRow();
    if (dlr > 1) dsh.getRange(2, 1, dlr - 1, dh.length).getDisplayValues().forEach(function (r) { if (schoolV31Val_(r, dix, 'النوع') === 'صف' && schoolV31Val_(r, dix, 'المرحلة') === dept && v35Date_(schoolV31Val_(r, dix, 'التاريخ')) === today) absentToday += Number(schoolV31Val_(r, dix, 'عدد_الغياب')) || 0; });
  } catch (e) { }
  return { success: true, isDeptHead: true, stage: dept, schools: schools, totals: totals, absentToday: absentToday, today: today };
}

/* ---------- متابعة ميدانية: دور مستقل يرى خطوط السير بعد حفظها + متابعة يومية للتنفيذ ---------- */
function loginFieldFollowupV41Core_(username, password) {
  var us = personnelSS_().getSheetByName('R_المستخدمون'), h = v36Headers_(us), i = schoolV31Idx_(h), lr = us.getLastRow();
  var v = lr > 1 ? us.getRange(2, 1, lr - 1, h.length).getDisplayValues() : [];
  var u = v24DigitsLocalV31_(username) || String(username || '').trim();
  for (var r = 0; r < v.length; r++) if (String(v[r][i.username]) === String(username).trim() && String(v[r][i.password]) === String(password || '') && v[r][i.role] === 'متابعة' && v[r][i.status] !== 'موقوف') {
    var t = Utilities.getUuid().replace(/-/g, '');
    CacheService.getScriptCache().put('V271_SES_' + t, JSON.stringify({ role: 'متابعة', username: v[r][i.username], name: v[r][i.name] }), 21600);
    return { success: true, token: t, user: { role: 'متابعة', name: v[r][i.name] } };
  }
  return { success: false, message: 'بيانات الدخول غير صحيحة.' };
}
function adminCreateFollowupAccountV41(token, name, username, password) {
  v35Admin_(token); name = String(name || '').trim(); username = String(username || '').trim(); password = String(password || '').trim();
  if (!name || !username || password.length < 4) throw new Error('أدخل الاسم واسم مستخدم وكلمة مرور 4 خانات على الأقل.');
  var us = personnelSS_().getSheetByName('R_المستخدمون'), h = v36Headers_(us), i = schoolV31Idx_(h);
  var row = new Array(h.length).fill(''); function put(k, x) { if (i[k] != null) row[i[k]] = x; }
  put('userId', 'USR_' + Utilities.getUuid().replace(/-/g, '').slice(0, 20)); put('username', username); put('password', password); put('name', name); put('role', 'متابعة'); put('status', 'فعال');
  v50A_(us.appendRow(row)); return { success: true, message: 'تم إنشاء حساب متابعة ميدانية.' };
}
function followupSessionV41_(token) { var s = getSchoolSessionV271(token); if (s && s.role === 'متابعة') return s; if (s && s.role === 'موظف' && (s.permissions || []).some(function (p) { return p.permission === 'متابعة' && p.status !== 'موقوف'; })) return s; throw new Error('جلسة غير صالحة أو منتهية.'); }
/** خطوط السير المحفوظة (=المعتمدة) ليوم مُحدَّد، مع حالة التنفيذ (تمت الزيارة أم لا) لكل مشرف/مدرسة. */
function followupDailyV41(token, date) {
  followupSessionV41_(token); routeV41Ensure_();
  var iso = routeV41Iso_(routeV41Date_(date));
  var sh = personnelSS_().getSheetByName(ROUTE_V41.routeSheet), h = routeV41Header_(sh), i = routeV41Idx_(h), v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getDisplayValues() : [];
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), empMap = {}; emp.rows.forEach(function (r) { empMap[schoolV31Val_(r, ei, 'employeeId')] = r; });
  var s18 = v24Data_('18_بيانات_المدارس'), s18i = schoolV31Idx_(s18.headers), names = {}; s18.rows.forEach(function (r) { names[schoolV31Val_(r, s18i, 'schoolId')] = schoolV31Val_(r, s18i, 'اسم_المدرسة'); });
  var vs = personnelSS_().getSheetByName(ROUTE_V41.visitSheet), vh = routeV41Header_(vs), vi = routeV41Idx_(vh), vv = vs.getLastRow() > 1 ? vs.getRange(2, 1, vs.getLastRow() - 1, vs.getLastColumn()).getDisplayValues() : [];
  var visited = {}; vv.forEach(function (r) { if ((v35Date_(r[vi['التاريخ']]) || r[vi['التاريخ']]) === iso && r[vi.supervisorId]) visited[String(r[vi.supervisorId]) + '|' + r[vi.schoolId]] = true; });
  var out = [];
  v.forEach(function (r) {
    if ((v35Date_(r[i['التاريخ']]) || r[i['التاريخ']]) !== iso) return;
    var er = empMap[r[i.employeeId]]; if (!er) return;
    var ids = (r[i['المدارس']] || '').split('|').filter(Boolean);
    var name = schoolV31Val_(er, ei, 'الاسم');
    var job = schoolV31Val_(er, ei, 'الوظيفة_الإشرافية');
    var subj = schoolV31Val_(er, ei, 'مادة_التدريس');
    if (r[i['نوع_الجهة']] !== 'مدرسة' || !ids.length) { out.push({ supervisorId: r[i.supervisorId], name: name, job: job, subject: subj, type: r[i['نوع_الجهة']], school: r[i['الجهة_الأخرى']] || r[i['نوع_الجهة']], done: null }); return; }
    ids.forEach(function (sid) { out.push({ supervisorId: r[i.supervisorId], name: name, job: job, subject: subj, type: 'مدرسة', schoolId: sid, school: names[sid] || sid, done: !!visited[String(r[i.supervisorId]) + '|' + sid] }); });
  });
  out.sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'ar'); });
  var stat = { total: out.filter(function (x) { return x.done !== null; }).length, done: out.filter(function (x) { return x.done === true; }).length };
  return { success: true, date: iso, rows: out, stat: stat };
}
