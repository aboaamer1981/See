/**
 * V10.4 — تطوير بوابة الموظف
 * الهدف: إثبات دخول الموظف وإتمام «تحديث بياناتي»، قفل الملفات حتى التحديث،
 * متابعة الإدارة، وملفات الموظف الأربعة: مفردات المرتب، الملف الوظيفي،
 * نسخة الملف الورقي، تقرير المستحقات الشهرية.
 *
 * لا يغيّر منطق النقل/الحركات/المالية القائم؛ يعتمد على طبقات V42/V64 الحالية.
 */
var V104_TRACKING = {
  name:'R_متابعة_تحديث_الموظفين',
  headers:['trackingId','employeeId','الرقم_القومي','الاسم','دخول_الصفحة','أول_دخول','تم_التحديث','آخر_تحديث','آخر_تحديث_بواسطة','عدد_التحديثات','آخر_دخول','ملاحظات','فتح_الملفات_استثناء']
};

/* V7.63 — حقول العرض للموظف: قائمة بيضاء (لا قائم/غير قائم ولا أعمدة داخلية). */
var V104_NA='غير متوفر حاليًا';
var V104_HIDDEN_FIELDS=['الحالة_الوظيفية','حالة_السجل','قائم_بالعمل','سبب_عدم_القيام'];
var V104_PDF_FIELDS=['الرقم_القومي','كود_الموظف','الاسم','النوع','تاريخ_الميلاد','الهاتف','البريد','العنوان','الصفة','تاريخ_التعيين','الدرجة_المالية','تاريخ_الحصول_على_الدرجة','المجموعة_النوعية','المجموعة_الوظيفية','المسمى_الوظيفي','الوظيفة_الإشرافية','مادة_التدريس','المرحلة_التعليمية_الأصلية','نوع التعليم','القسم','نظام_العمل','originalSchoolId','تاريخ_بدء_العمل'];
var V104_MOVE_FIELDS=['نوع_الحركة','من_مدرسة','إلى_مدرسة','الجهة','تاريخ_البداية','تاريخ_النهاية','رقم_القرار','تاريخ_القرار'];
var V104_HRP_PDF_FIELDS=['الرقم_القومي','الاسم','النوع','تاريخ_الميلاد','الهاتف','العنوان','نوع_الفئة','مادة_التدريس','originalSchoolId','تاريخ_الإضافة'];

function v104Sheet_(){return v42EnsureSheet_(V104_TRACKING);}
function v104Idx_(){return v42Idx_(v42Header_(v104Sheet_()));}
function v104Nid_(s){return v24DigitsLocalV31_(String(s||''));}
function v104Find_(eid){
  var sh=v104Sheet_(),h=v42Header_(sh),i=v42Idx_(h),v=v42Values_(sh),x=null,row=-1;
  for(var n=0;n<v.length;n++) if(v42Val_(v[n],i,'employeeId')===String(eid)){x=v[n];row=n+2;break;}
  return {sh:sh,h:h,i:i,row:row,data:x};
}
function v104TouchEntry_(s){return v35Lock_(function(){return v104TouchEntryCore_(s);});}
function v104TouchEntryCore_(s){
  var sh=v104Sheet_(),h=v42Header_(sh),i=v42Idx_(h),x=v104Find_(s.employeeId),now=new Date(),row;
  if(x.row<2){
    row=new Array(h.length).fill('');
    row[i.trackingId]=v42Id_('TRK_'); row[i.employeeId]=s.employeeId; row[i['الرقم_القومي']]=v104Nid_(s.username);
    row[i['الاسم']]=s.name||''; row[i['دخول_الصفحة']]='نعم'; row[i['أول_دخول']]=now; row[i['آخر_دخول']]=now;
    v50A_(sh.appendRow(row));
  }else{
    row=x.data.slice(); row[i['دخول_الصفحة']]='نعم'; row[i['آخر_دخول']]=now; row[i['الاسم']]=s.name||row[i['الاسم']]; row[i['الرقم_القومي']]=v104Nid_(s.username);
    v50A_(sh.getRange(x.row,1,1,h.length).setValues([row]));
  }
}
function v104MarkUpdated_(s){return v35Lock_(function(){return v104MarkUpdatedCore_(s);});}
function v104MarkUpdatedCore_(s){
  var sh=v104Sheet_(),h=v42Header_(sh),i=v42Idx_(h),x=v104Find_(s.employeeId),now=new Date(),row,count=0;
  if(x.row<2){row=new Array(h.length).fill('');row[i.trackingId]=v42Id_('TRK_');row[i.employeeId]=s.employeeId;row[i['الرقم_القومي']]=v104Nid_(s.username);row[i['الاسم']]=s.name||'';row[i['دخول_الصفحة']]='نعم';row[i['أول_دخول']]=now;row[i['تم_التحديث']]='نعم';row[i['آخر_تحديث']]=now;row[i['آخر_تحديث_بواسطة']]=s.username;row[i['عدد_التحديثات']]=1;row[i['آخر_دخول']]=now;v50A_(sh.appendRow(row));count=1;
  }else{row=x.data.slice();count=Number(row[i['عدد_التحديثات']])||0;row[i['تم_التحديث']]='نعم';row[i['آخر_تحديث']]=now;row[i['آخر_تحديث_بواسطة']]=s.username;row[i['عدد_التحديثات']]=count+1;row[i['آخر_دخول']]=now;row[i['الاسم']]=s.name||row[i['الاسم']];v50A_(sh.getRange(x.row,1,1,h.length).setValues([row]));count++;
  }
  v42Audit_(s.employeeId,'إتمام تحديث بيانات الموظف','لم يتم التحديث','تم التحديث',s.username);
  return {updated:true,updatedAt:now,count:count};
}
function v104Status_(eid){
  var x=v104Find_(eid),i=x.i;
  if(x.row<2)return {entered:false,updated:false,override:false,filesOpen:false,firstEntry:'',lastEntry:'',lastUpdate:'',updateCount:0};
  var up=v42Val_(x.data,i,'تم_التحديث')==='نعم',ov=v42Val_(x.data,i,'فتح_الملفات_استثناء')==='نعم';
  return {entered:v42Val_(x.data,i,'دخول_الصفحة')==='نعم',updated:up,override:ov,filesOpen:up||ov,firstEntry:v42Val_(x.data,i,'أول_دخول'),lastEntry:v42Val_(x.data,i,'آخر_دخول'),lastUpdate:v42Val_(x.data,i,'آخر_تحديث'),updateCount:Number(v42Val_(x.data,i,'عدد_التحديثات'))||0};
}

function v104FindHrpByNid_(nid){
  var d=v24Data_('05_معلمو_الحصة_والمعاش'),i=v42Idx_(d.headers),row=null,rowIndex=-1,n=v104Nid_(nid);
  for(var k=0;k<d.rows.length;k++)if(v104Nid_(v42Val_(d.rows[k],i,'الرقم_القومي'))===n){row=d.rows[k];rowIndex=k+2;break;}
  return row?{row:row,rowIndex:rowIndex,headers:d.headers,idx:i}:null;
}
function v104HrpSession_(token){
  var x=v42Session_(token);if(x.role!=='معلم حصة')throw new Error('جلسة معلم الحصة غير صالحة.');return x;
}
function v104AnySession_(token){var x=v42Session_(token);if(x.role!=='موظف'&&x.role!=='معلم حصة')throw new Error('جلسة الموظف غير صالحة.');return x;}
function loginStaffV50(nationalId,password){return v93GuardLogin_('st50',nationalId,function(){return loginStaffV50Core_(nationalId,password);});}
function loginStaffV50Core_(nationalId,password){
  var basic=loginStaffV42Core_(nationalId,password);if(basic&&basic.success)return basic;
  var nid=v104Nid_(nationalId),pw=String(password||'');if(!/^\d{14}$/.test(nid))return basic||{success:false,message:'أدخل الرقم القومي المكون من 14 رقمًا.'};
  var h=v104FindHrpByNid_(nid);if(!h||v42Val_(h.row,h.idx,'حالة_السجل')==='غير قائم')return basic||{success:false,message:'الرقم القومي أو كلمة المرور غير صحيحة.'};
  var us=personnelSS_().getSheetByName('R_المستخدمون'),uh=v42Header_(us),ui=v42Idx_(uh),v=v42Values_(us),u=null;
  var otherRole=false;for(var r=0;r<v.length;r++)if(v104Nid_(v42Val_(v[r],ui,'username'))===nid){if(v42Val_(v[r],ui,'role')==='معلم حصة'){u=v[r];break;}otherRole=true;}
  if(!u&&otherRole)return basic||{success:false,message:'الرقم القومي أو كلمة المرور غير صحيحة.'};
  if(!u&&pw===V42_DEFAULT_PASSWORD){var row=new Array(uh.length).fill('');row[ui.userId]=v42Id_('USR_');row[ui.username]=nid;row[ui.password]=V42_DEFAULT_PASSWORD;row[ui.name]=v42Val_(h.row,h.idx,'الاسم');row[ui.role]='معلم حصة';row[ui.status]='فعال';v50A_(us.appendRow(row));u=row;}
  if(!u||String(u[ui.password])!==pw)return{success:false,message:'الرقم القومي أو كلمة المرور غير صحيحة.'};
  if(v42Val_(u,ui,'status')==='موقوف')return{success:false,message:'الحساب موقوف من الإدارة.'};
  var token=Utilities.getUuid().replace(/-/g,'');var eid=v42Val_(h.row,h.idx,'hrpId');var sess={role:'معلم حصة',username:nid,employeeId:eid,supervisorId:eid,name:v42Val_(h.row,h.idx,'الاسم'),permissions:[]};v42PutSession_(token,sess);return{success:true,token:token,user:sess};
}
function v104HrpHome_(s){
  var h=v104FindHrpByNid_(s.username);if(!h)throw new Error('بيانات معلم الحصة غير موجودة.');v104TouchEntry_(s);var st=v104Status_(s.employeeId),r=h.row,i=h.idx,names=v42SchoolNames_(),tabs={profile:1,htt:v105HasTt_(s)?1:0,files:st.filesOpen?1:0,card:1,permissions:1,myfin:1};   // V7.65: جهات العمل داخل «بياناتي»
  var rel=[];try{var rd=v24Data_('06_علاقات_معلمي_الحصة'),ri=v42Idx_(rd.headers);rel=rd.rows.filter(function(x){return v42Val_(x,ri,'hrpId')===s.employeeId&&v36ActiveRel_(v42Val_(x,ri,'الحالة'));}).map(function(x){return{school:names[v42Val_(x,ri,'schoolId')]||v42Val_(x,ri,'schoolId'),type:v42Val_(x,ri,'نوع_العلاقة'),periods:v42Val_(x,ri,'عدد_الحصص_المطلوب'),status:v42Val_(x,ri,'الحالة')};});}catch(e){}
  return{success:true,tabs:tabs,user:{employeeId:s.employeeId,name:v42Val_(r,i,'الاسم'),nationalId:v42Val_(r,i,'الرقم_القومي'),type:'معلم حصة',job:v42Val_(r,i,'نوع_الفئة'),supervisoryJob:'',subject:v42Val_(r,i,'مادة_التدريس'),department:'',school:names[v42Val_(r,i,'originalSchoolId')]||''},permissions:[],tracking:st,hrp:{relations:rel}};
}
function staffHomeV50(token){
  var s=v104AnySession_(token);if(s.role==='معلم حصة')return v104HrpHome_(s);
  var b=v42FindBasicByNid_(s.username);if(!b)throw new Error('بيانات الموظف غير موجودة.');
  var base=staffHomeV42(token);v104TouchEntry_(s);   // V7.63: القراءة أولًا ثم تسجيل الدخول تحت قفل
  var st=v104Status_(s.employeeId),tabs=base.tabs||{};tabs.files=st.filesOpen?1:0;tabs.profile=1;delete tabs.job;tabs.tt=v105HasTt_(s)?1:0;tabs.card=1;   // V7.65: وضعي الوظيفي داخل «بياناتي»؛ النصاب يظهر لمن له جدول
  tabs.permissions=1;tabs.myfin=1;return{success:true,tabs:tabs,user:base.user,permissions:base.permissions,tracking:st};
}
function staffProfileV50(token){
  var s=v104AnySession_(token);if(s.role==='معلم حصة'){
    var b=v104FindHrpByNid_(s.username),r=b.row,i=b.idx,st=v104Status_(s.employeeId);return{success:true,readonly:{'الاسم':v42Val_(r,i,'الاسم'),'الرقم القومي':v42Val_(r,i,'الرقم_القومي'),'النوع':v42Val_(r,i,'النوع'),'تاريخ الميلاد':v42Val_(r,i,'تاريخ_الميلاد'),'نوع الفئة':v42Val_(r,i,'نوع_الفئة'),'مادة التدريس':v42Val_(r,i,'مادة_التدريس')},sections:[{name:'بيانات التواصل',open:true,fields:['الهاتف','العنوان'].filter(function(k){return i[k]!=null;}).map(function(k){return{key:k,value:v42Val_(r,i,k)};})}],tracking:st};
  }
  var r=staffProfileV42(token),st=v104Status_(s.employeeId);
  if(r.readonly)V104_HIDDEN_FIELDS.forEach(function(k){delete r.readonly[k];});   // V7.63: لا يظهر للموظف قائم/غير قائم
  try{var q=v24Data_('05_المؤهلات'),qi=v42Idx_(q.headers);r.qualifications=q.rows.filter(function(x){return v42Val_(x,qi,'employeeId')===s.employeeId;}).map(function(x){var o={};q.headers.forEach(function(k,n){if(k)o[k]=x[n]||'';});return o;});}catch(e){r.qualifications=[];}r.tracking=st;return r;
}
function staffUpdateProfileV50(token,payload){
  var s=v104AnySession_(token),p=payload||{};
  return v35Lock_(function(){
    if(s.role==='معلم حصة'){
      var b=v104FindHrpByNid_(s.username);if(!b)throw new Error('بيانات معلم الحصة غير موجودة.');
      var sh=personnelSS_().getSheetByName('05_معلمو_الحصة_والمعاش'),i=b.idx,changes=[],upd={};
      ['الهاتف','العنوان'].forEach(function(k){if(i[k]==null||p[k]===undefined)return;var nv=String(p[k]||'').trim(),ov=v42Val_(b.row,i,k);
        if(k==='الهاتف'){var raw=nv;nv=v24DigitsLocalV31_(nv);if(raw&&!nv)throw new Error('رقم الهاتف غير صحيح.');if(nv&&!/^\d{8,15}$/.test(nv))throw new Error('رقم الهاتف غير صحيح.');}   // V7.63
        if(nv.length>200)throw new Error('قيمة طويلة جدًا في '+k);if(nv!==ov){upd[i[k]+1]=nv;changes.push([k,ov,nv]);}});
      v50WriteRow_(sh,b.rowIndex,upd);if(changes.length)v42Audit_(s.employeeId,'تعديل بياناتي (معلم حصة)',changes.map(function(c){return c[0]+': '+c[1];}).join(' | '),changes.map(function(c){return c[0]+': '+c[2];}).join(' | '),s.username);
      var m1=v104MarkUpdatedCore_(s);return{success:true,message:'تم تحديث بياناتك بنجاح، وتم تسجيل عملية التحديث.',changed:changes.length,updatedAt:m1.updatedAt,updateCount:m1.count};
    }
    var saved=staffSaveProfileV42(token,p);var mark=v104MarkUpdatedCore_(s);return{success:true,message:'تم تحديث بياناتك بنجاح، وتم تسجيل عملية التحديث.',changed:saved.changed||0,updatedAt:mark.updatedAt,updateCount:mark.count};
  });
}
function v104Admin_(token){return v35Admin_(token);}
function adminStaffUpdateStatusV50(token,q,status,kind){
  v104Admin_(token);var sh=v104Sheet_(),ti=v42Idx_(v42Header_(sh)),tv=v42Values_(sh),track={};tv.forEach(function(x){var eid=v42Val_(x,ti,'employeeId');if(eid)track[eid]=x;});
  q=String(q||'').trim();status=String(status||'');kind=String(kind||'');var qd=v104Nid_(q),all=[],LIMIT=500;
  function st(eid){var x=track[eid];if(!x)return{entered:false,updated:false,override:false,firstEntry:'',lastEntry:'',lastUpdate:'',updateCount:0};return{override:v42Val_(x,ti,'فتح_الملفات_استثناء')==='نعم',entered:v42Val_(x,ti,'دخول_الصفحة')==='نعم',updated:v42Val_(x,ti,'تم_التحديث')==='نعم',firstEntry:v42Val_(x,ti,'أول_دخول'),lastEntry:v42Val_(x,ti,'آخر_دخول'),lastUpdate:v42Val_(x,ti,'آخر_تحديث'),updateCount:Number(v42Val_(x,ti,'عدد_التحديثات'))||0};}
  function add(eid,nid,name,job,k){if(q&&!(name.indexOf(q)>=0||(qd&&nid.indexOf(qd)>=0)))return;var x=st(eid);all.push({employeeId:eid,nationalId:nid,name:name,job:job,kind:k,override:x.override,entered:x.entered,updated:x.updated,firstEntry:x.firstEntry,lastEntry:x.lastEntry,lastUpdate:x.lastUpdate,updateCount:x.updateCount});}
  // V7.63: الحساب على الكل (القائمون فقط) ثم العرض بحد أقصى — لا تتأثر الإحصائية بالحد.
  if(kind!=='hrp'){var d=v24Data_('01_الأساسي'),i=v42Idx_(d.headers);d.rows.forEach(function(r){if(v42Val_(r,i,'حالة_السجل')==='غير قائم')return;var eid=v42Val_(r,i,'employeeId');if(!eid)return;add(eid,v104Nid_(v42Val_(r,i,'الرقم_القومي')),v42Val_(r,i,'الاسم'),v42Val_(r,i,'المسمى_الوظيفي'),'أساسي');});}
  if(kind!=='basic'){try{var h=v24Data_('05_معلمو_الحصة_والمعاش'),hi=v42Idx_(h.headers);h.rows.forEach(function(r){if(v42Val_(r,hi,'حالة_السجل')==='غير قائم')return;var eid=v42Val_(r,hi,'hrpId');if(!eid)return;add(eid,v104Nid_(v42Val_(r,hi,'الرقم_القومي')),v42Val_(r,hi,'الاسم'),v42Val_(r,hi,'نوع_الفئة')||'معلم حصة','معلم حصة');});}catch(e){}}
  var stat={total:all.length,entered:0,updated:0,notUpdated:0,notEntered:0};all.forEach(function(x){if(x.entered)stat.entered++;if(x.updated)stat.updated++;if(x.entered&&!x.updated)stat.notUpdated++;if(!x.entered)stat.notEntered++;});
  var rows=all.filter(function(x){return !status||(status==='updated'&&x.updated)||(status==='notUpdated'&&x.entered&&!x.updated)||(status==='notEntered'&&!x.entered);});
  return{success:true,rows:rows.slice(0,LIMIT),matched:rows.length,limit:LIMIT,stats:stat};
}
function adminOpenStaffFilesV50(token,nid){
  v104Admin_(token);var n=v104Nid_(nid),b=v42FindBasicByNid_(n),h=b?null:v104FindHrpByNid_(n);if(!b&&!h)throw new Error('الموظف غير موجود.');
  var s=b?{employeeId:v42Val_(b.row,b.idx,'employeeId'),username:n,name:v42Val_(b.row,b.idx,'الاسم')}:{employeeId:v42Val_(h.row,h.idx,'hrpId'),username:n,name:v42Val_(h.row,h.idx,'الاسم')};return{success:true,override:true,employee:{employeeId:s.employeeId,nationalId:n,name:s.name},files:v104FileList_(s,true)};
}

function v104EnsureRequiredFileTypes_(){
  var sh=v42Sheet_(V42_TABLES.files),h=v42Header_(sh),i=v42Idx_(h),v=v42Values_(sh),by={};
  v.forEach(function(r,n){by[v42Val_(r,i,'نوع_الملف')]={row:n+2,data:r};});
  if(by['أوراق الإدارة']&&!by['نسخة الملف الورقي']){
    var old=by['أوراق الإدارة'],row=old.data.slice();row[i['نوع_الملف']]='نسخة الملف الورقي';
    v50A_(sh.getRange(old.row,1,1,h.length).setValues([row]));by['نسخة الملف الورقي']={row:old.row,data:row};delete by['أوراق الإدارة'];
  }
  // V7.63: لو النوعان موجودان معًا: انقل مجلد «أوراق الإدارة» إن لم يكن للورقي مجلد، ثم أوقف القديم (لا حذف).
  if(by['أوراق الإدارة']&&by['نسخة الملف الورقي']&&v42Val_(by['أوراق الإدارة'].data,i,'الحالة')!=='موقوف'){
    var o=by['أوراق الإدارة'],pp=by['نسخة الملف الورقي'],of=v42Val_(o.data,i,'FolderId');
    if(of&&!v42Val_(pp.data,i,'FolderId'))v50A_(sh.getRange(pp.row,i.FolderId+1).setValue(of));
    v50A_(sh.getRange(o.row,i['الحالة']+1).setValue('موقوف'));
  }
  [['FT_SALARY','مفردات المرتب'],['FT_PAPER','نسخة الملف الورقي'],['FT_PROFILE','الملف الوظيفي'],['FT_FINANCE','تقرير المستحقات الشهرية']].forEach(function(x){
    if(by[x[1]])return;var row=new Array(h.length).fill('');row[i.fileTypeId]=x[0];row[i['نوع_الملف']]=x[1];row[i['الحالة']]='فعال';row[i['ترتيب']]=v.length+1;row[i['ملاحظات']]=x[1]==='الملف الوظيفي'||x[1]==='تقرير المستحقات الشهرية'?'ملف مولد من النظام':'PDF خارجي باسم الرقم القومي.pdf';v50A_(sh.appendRow(row));v.push(row);
  });
}
function v104FileList_(s,adminOverride){
  v104EnsureRequiredFileTypes_();
  var st=v104Status_(s.employeeId);if(!adminOverride&&!st.filesOpen)throw new Error('تبويب الملفات مغلق حتى يتم الضغط على «تحديث بياناتي» بنجاح.');
  var out=[];
  /* 1) مفردات المرتب و 3) نسخة الملف الورقي: ملفات Drive باسم الرقم القومي.pdf */
  v42FileTypes_().forEach(function(t){
    if(t.name!=='مفردات المرتب'&&t.name!=='نسخة الملف الورقي')return;
    if(!t.folderId){out.push({type:t.name,name:'',fileId:'',date:'',missing:adminOverride?'لم يُحدد مجلد لهذا النوع بعد':V104_NA});return;}
    try{
      var it=DriveApp.getFolderById(t.folderId).getFilesByName(v104Nid_(s.username)+'.pdf'),found=false;
      while(it.hasNext()){var f=it.next();if(f.isTrashed())continue;found=true;out.push({type:t.name,name:f.getName(),fileId:f.getId(),date:Utilities.formatDate(f.getLastUpdated(),'Africa/Cairo','yyyy-MM-dd'),size:f.getSize()});break;}
      if(!found)out.push({type:t.name,name:'',fileId:'',date:'',missing:adminOverride?'لا يوجد ملف لهذا الموظف في المجلد المحدد':V104_NA});
    }catch(e){out.push({type:t.name,name:'',fileId:'',date:'',missing:adminOverride?'تعذر فتح المجلد المحدد':V104_NA});}
  });
  out.push({type:'الملف الوظيفي',name:'الملف الوظيفي — '+v104Nid_(s.username)+'.pdf',fileId:'GEN:PROFILE',date:Utilities.formatDate(new Date(),'Africa/Cairo','yyyy-MM-dd')});
  out.push({type:'تقرير المستحقات الشهرية',name:'تقرير المستحقات الشهرية — '+v104Nid_(s.username)+'.pdf',fileId:'GEN:FINANCE',date:Utilities.formatDate(new Date(),'Africa/Cairo','yyyy-MM-dd')});
  return out;
}
function staffFilesV50(token){var s=v104AnySession_(token);return{success:true,files:v104FileList_(s,false)};}

function v104Html_(title,body){
  return '<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;direction:rtl;color:#111;padding:28px;font-size:13px}h1{font-size:22px;margin:0 0 10px}h2{font-size:17px;border-bottom:1px solid #999;padding-bottom:5px;margin-top:22px}.head{border:1px solid #777;padding:12px;margin-bottom:16px}.kv{width:100%;border-collapse:collapse;margin:8px 0}.kv td,.kv th{border:1px solid #aaa;padding:6px}.kv th{width:30%;background:#eee;text-align:right}.muted{color:#555}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:5px}th{background:#eee}</style></head><body><h1>'+title+'</h1>'+body+'</body></html>';
}
function v104Esc_(x){return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function v104ProfilePdf_(s){
  var b=v42FindBasicByNid_(s.username);if(!b)throw new Error('بيانات الموظف غير موجودة.');var r=b.row,i=b.idx,names=v42SchoolNames_();
  var body='<div class="head"><b>الاسم:</b> '+v104Esc_(v42Val_(r,i,'الاسم'))+'<br><b>الرقم القومي:</b> '+v104Esc_(v42Val_(r,i,'الرقم_القومي'))+'<br><b>كود الموظف:</b> '+v104Esc_(v42Val_(r,i,'كود_الموظف'))+'</div>';
  body+='<h2>البيانات الوظيفية</h2><table class="kv">';
  V104_PDF_FIELDS.forEach(function(k){var lbl=k,val;if(k==='originalSchoolId'){lbl='جهة العمل الأصلية';val=v42Val_(r,i,k);val=names[val]||val;}else{if(i[k]==null)return;val=v42Val_(r,i,k);}if(val)body+='<tr><th>'+v104Esc_(lbl.replace(/_/g,' '))+'</th><td>'+v104Esc_(val)+'</td></tr>';});
  body+='</table>';
  try{var rel=v24Data_('04_علاقات_المدارس'),ri=v42Idx_(rel.headers),rs=rel.rows.filter(function(x){return v42Val_(x,ri,'employeeId')===v42Val_(r,i,'employeeId');});if(rs.length){body+='<h2>علاقات العمل بالمدارس</h2><table><tr><th>المدرسة</th><th>نوع العلاقة</th><th>الحالة</th><th>البداية</th><th>النهاية</th></tr>';rs.forEach(function(x){body+='<tr><td>'+v104Esc_(names[v42Val_(x,ri,'schoolId')]||v42Val_(x,ri,'schoolId'))+'</td><td>'+v104Esc_(v42Val_(x,ri,'نوع_العلاقة'))+'</td><td>'+v104Esc_(v42Val_(x,ri,'الحالة'))+'</td><td>'+v104Esc_(v42Val_(x,ri,'تاريخ_البداية'))+'</td><td>'+v104Esc_(v42Val_(x,ri,'تاريخ_النهاية'))+'</td></tr>';});body+='</table>';}}catch(e){}
  try{var qd=v24Data_('05_المؤهلات'),qi=v42Idx_(qd.headers),qs=qd.rows.filter(function(x){return v42Val_(x,qi,'employeeId')===v42Val_(r,i,'employeeId');});if(qs.length){body+='<h2>المؤهلات</h2><table><tr><th>المؤهل</th><th>الدرجة</th><th>التخصص</th><th>السنة</th><th>التقدير</th><th>النسبة</th><th>الدبلومة التربوية</th></tr>';qs.forEach(function(x){body+='<tr><td>'+v104Esc_(v42Val_(x,qi,'المؤهل'))+'</td><td>'+v104Esc_(v42Val_(x,qi,'درجة_المؤهل'))+'</td><td>'+v104Esc_(v42Val_(x,qi,'التخصص'))+'</td><td>'+v104Esc_(v42Val_(x,qi,'السنة'))+'</td><td>'+v104Esc_(v42Val_(x,qi,'التقدير'))+'</td><td>'+v104Esc_(v42Val_(x,qi,'النسبة'))+'</td><td>'+v104Esc_(v42Val_(x,qi,'الدبلومة_التربوية'))+'</td></tr>';});body+='</table>';}}catch(e){}
  try{var mv=v24Data_('06_حركة_العامل'),mi=v42Idx_(mv.headers),ms=mv.rows.filter(function(x){return v42Val_(x,mi,'employeeId')===v42Val_(r,i,'employeeId');});var mc=V104_MOVE_FIELDS.filter(function(k){return mi[k]!=null;});if(ms.length){body+='<h2>سجل الحركات الوظيفية</h2><table><tr>'+mc.map(function(k){return '<th>'+v104Esc_(k.replace(/_/g,' '))+'</th>';}).join('')+'</tr>';ms.forEach(function(x){body+='<tr>'+mc.map(function(k){var val=v42Val_(x,mi,k);if(k==='من_مدرسة'||k==='إلى_مدرسة')val=names[val]||val;return '<td>'+v104Esc_(val)+'</td>';}).join('')+'</tr>';});body+='</table>';}}catch(e){}
  return Utilities.newBlob(v104Html_('الملف الوظيفي — '+v42Val_(r,i,'الاسم'),body),'text/html','profile.html').getAs(MimeType.PDF).setName(v104Nid_(s.username)+'.pdf');
}
function staffPermissionsV50(token){var s=v104AnySession_(token);if(s.role==='معلم حصة')return{success:true,permissions:[]};return staffPermissionsV42(token);}
function v104HrpFinanceRows_(s){var out=[],names=v42SchoolNames_();try{var d=v24Data_('08_ماليات_معلمي_الحصة'),i=v42Idx_(d.headers);d.rows.forEach(function(r){if(v42Val_(r,i,'hrpId')!==s.employeeId)return;out.push({year:Number(v42Val_(r,i,'السنة'))||0,month:Number(v42Val_(r,i,'الشهر'))||0,label:(v42Val_(r,i,'الشهر')||'')+'/'+(v42Val_(r,i,'السنة')||''),school:names[v42Val_(r,i,'schoolId')]||v42Val_(r,i,'schoolId'),periods:v42Val_(r,i,'إجمالي_الحصص_الفعلية'),total:v42Val_(r,i,'القيمة'),calc:v42Val_(r,i,'حالة_الاعتماد')||v42Val_(r,i,'حالة_الحساب'),notes:v42Val_(r,i,'ملاحظات')});});}catch(e){}return out;}
function staffMyFinanceV50(token){var s=v104AnySession_(token);if(s.role==='معلم حصة')return{success:true,name:s.name,system:'معلم حصة',rows:v104HrpFinanceRows_(s)};return staffMyFinanceV64(token);}
function v104HrpProfilePdf_(s){var b=v104FindHrpByNid_(s.username),r=b.row,i=b.idx,body='<div class="head"><b>الاسم:</b> '+v104Esc_(v42Val_(r,i,'الاسم'))+'<br><b>الرقم القومي:</b> '+v104Esc_(v42Val_(r,i,'الرقم_القومي'))+'<br><b>الفئة:</b> '+v104Esc_(v42Val_(r,i,'نوع_الفئة'))+'</div><h2>بيانات معلم الحصة</h2><table class="kv">';var names=v42SchoolNames_();V104_HRP_PDF_FIELDS.forEach(function(k){if(i[k]==null)return;var lbl=k,val=v42Val_(r,i,k);if(k==='originalSchoolId'){lbl='المدرسة الأصلية';val=names[val]||val;}if(val)body+='<tr><th>'+v104Esc_(lbl.replace(/_/g,' '))+'</th><td>'+v104Esc_(val)+'</td></tr>';});body+='</table>';try{var rd=v24Data_('06_علاقات_معلمي_الحصة'),ri=v42Idx_(rd.headers),rs=rd.rows.filter(function(x){return v42Val_(x,ri,'hrpId')===s.employeeId;});if(rs.length){body+='<h2>جهات العمل</h2><table><tr><th>المدرسة</th><th>العلاقة</th><th>الحصص</th><th>الحالة</th></tr>';rs.forEach(function(x){body+='<tr><td>'+v104Esc_(names[v42Val_(x,ri,'schoolId')]||v42Val_(x,ri,'schoolId'))+'</td><td>'+v104Esc_(v42Val_(x,ri,'نوع_العلاقة'))+'</td><td>'+v104Esc_(v42Val_(x,ri,'عدد_الحصص_المطلوب'))+'</td><td>'+v104Esc_(v42Val_(x,ri,'الحالة'))+'</td></tr>';});body+='</table>';}}catch(e){}return Utilities.newBlob(v104Html_('الملف الوظيفي — '+v42Val_(r,i,'الاسم'),body),'text/html','profile.html').getAs(MimeType.PDF).setName(v104Nid_(s.username)+'.pdf');}
function v104FinancePdf_(s){
  var rows=s.role==='معلم حصة'?v104HrpFinanceRows_(s):(function(){try{return v64History_(String(s.employeeId||''),v104Nid_(s.username)).filter(function(x){return x.calc==='محسوب'||x.calc==='مراجعة';});}catch(e){return[];}})(),now=v42OpenPeriod_(),selected=rows.filter(function(x){return Number(x.year||0)===now.year&&Number(x.month||0)===now.month;});if(!selected.length&&rows.length)selected=[rows[rows.length-1]];var body='<div class="head"><b>الموظف:</b> '+v104Esc_(s.name||'')+'<br><b>الرقم القومي:</b> '+v104Esc_(s.username)+'<br><b>الفترة:</b> '+v104Esc_(selected.length?selected[0].label:(now.month+'/'+now.year))+'</div>';if(selected.length){body+='<table><tr><th>الشهر</th><th>المدرسة</th><th>النظام</th><th>أيام</th><th>حصص</th><th>فوق النصاب</th><th>المبلغ</th><th>الحالة</th><th>ملاحظات</th></tr>';selected.forEach(function(x){body+='<tr><td>'+v104Esc_(x.label)+'</td><td>'+v104Esc_(x.school)+'</td><td>'+v104Esc_(x.system||x.kind||'معلم حصة')+'</td><td>'+v104Esc_(x.days||'—')+'</td><td>'+v104Esc_(x.periods||'—')+'</td><td>'+v104Esc_(x.over||'—')+'</td><td>'+v104Esc_(x.total)+'</td><td>'+v104Esc_(x.calc)+'</td><td>'+v104Esc_(x.notes)+'</td></tr>';});body+='</table>';}else body+='<p>لا توجد استحقاقات محتسبة لهذه الفترة.</p>';return Utilities.newBlob(v104Html_('تقرير المستحقات الشهرية — '+s.name,body),'text/html','finance.html').getAs(MimeType.PDF).setName(v104Nid_(s.username)+'.pdf');}
function staffFileDownloadV50(token,fileId){
  var s=v104AnySession_(token),st=v104Status_(s.employeeId);if(!st.filesOpen)throw new Error('الملفات متاحة بعد تحديث البيانات فقط.');
  if(String(fileId).indexOf('GEN:')===0){var blob=String(fileId)==='GEN:PROFILE'?(s.role==='معلم حصة'?v104HrpProfilePdf_(s):v104ProfilePdf_(s)):v104FinancePdf_(s);if(blob.getBytes().length>15*1024*1024)throw new Error('حجم التقرير كبير جدًا.');return{success:true,name:blob.getName(),mime:'application/pdf',data:Utilities.base64Encode(blob.getBytes())};}
  var ok=v104FileList_(s,false).some(function(f){return f.fileId===String(fileId);});if(!ok)throw new Error('الملف غير متاح لك.');var f=DriveApp.getFileById(fileId),bl=f.getBlob();if(f.getSize()>15*1024*1024)throw new Error('حجم الملف كبير جدًا للعرض.');return{success:true,name:f.getName(),mime:bl.getContentType()||'application/pdf',data:Utilities.base64Encode(bl.getBytes())};
}
function adminStaffFileDownloadV50(token,nid,fileId){
  v104Admin_(token);var n=v104Nid_(nid),b=v42FindBasicByNid_(n),h=b?null:v104FindHrpByNid_(n);if(!b&&!h)throw new Error('الموظف غير موجود.');var s=b?{employeeId:v42Val_(b.row,b.idx,'employeeId'),username:n,name:v42Val_(b.row,b.idx,'الاسم'),role:'موظف'}:{employeeId:v42Val_(h.row,h.idx,'hrpId'),username:n,name:v42Val_(h.row,h.idx,'الاسم'),role:'معلم حصة'};
  if(String(fileId).indexOf('GEN:')===0){var blob=String(fileId)==='GEN:PROFILE'?(s.role==='معلم حصة'?v104HrpProfilePdf_(s):v104ProfilePdf_(s)):v104FinancePdf_(s);return{success:true,name:blob.getName(),mime:'application/pdf',data:Utilities.base64Encode(blob.getBytes())};}
  var ok=v104FileList_(s,true).some(function(f){return f.fileId===String(fileId);});if(!ok)throw new Error('الملف غير متاح.');var f=DriveApp.getFileById(fileId),bl=f.getBlob();return{success:true,name:f.getName(),mime:bl.getContentType()||'application/pdf',data:Utilities.base64Encode(bl.getBytes())};
}
