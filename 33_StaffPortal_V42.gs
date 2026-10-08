/**
 * V4.3 — بوابة الموظفين + تصنيف التعليم + التعليم المجتمعي/الخاص
 * - لا يغيّر دخول المدارس أو الإدارة الحالي.
 * - كلمات المرور تبقى نصية كما طلب صاحب المشروع.
 * - التهيئة لم تعد تُستدعى في كل دخول، ولم تعد مقصورة على المالك أثناء الاستخدام
 *   (الويب آب يعمل USER_DEPLOYING + ANYONE_ANONYMOUS، فالتحقق من المالك كان يمنع كل الزوار).
 */
var V42_DEFAULT_PASSWORD = '123456';
var V42_SESSION_PREFIX = 'V42_STAFF_';
var V42_READY_VERSION = '4.9.0';
var V42_COMMUNITY_SHEET = '20_التعليم_المجتمعي';
var V42_PRIVATE_SHEET = '24_طلاب_المدارس_الخاصة';
var V42_TABLES = {
  depts:{name:'R_الأقسام',headers:['departmentId','اسم_القسم','نوع_القسم','الحالة','ترتيب','ملاحظات']},
  perms:{name:'R_صلاحيات_الموظفين',headers:['permissionId','employeeId','الصلاحية','النطاق','التفاصيل','الحالة','منحها_بواسطة','تاريخ_المنح','ملاحظات']},
  edit:{name:'R_أقسام_البيانات_القابلة_للتعديل',headers:['sectionId','اسم_القسم','الحالة','ملاحظات']},
  files:{name:'R_ملفات_الموظفين',headers:['fileTypeId','نوع_الملف','FolderId','الحالة','ترتيب','ملاحظات']},
  audit:{name:'R_سجل_الصلاحيات',headers:['auditId','employeeId','العملية','القديمة','الجديدة','بواسطة','التاريخ','ملاحظات']},
  entities:{name:'R_حسابات_الجهات',headers:['entityId','اسم_الجهة','نوع_الجهة','username','password','schoolId','status','ملاحظات']},
  community:{name:V42_COMMUNITY_SHEET,headers:['schoolId','اسم_المدرسة','كود_المدرسة','الوحدة_المحلية','الصف_الأول','الصف_الثاني','الصف_الثالث','الصف_الرابع','الصف_الخامس','الصف_السادس','إجمالي_الطلاب','الحالة','آخر_تحديث','ملاحظات']},
  privateStudents:{name:V42_PRIVATE_SHEET,headers:['rowId','schoolId','اسم_المدرسة','المرحلة','الصف_المستوى','عدد_الفصول','ذكور','إناث','إجمالي_الطلاب','آخر_تحديث','المستخدم','ملاحظات']}
};
var V42_DEFAULT_DEPTS = [
 ["DEP_KG", "رياض أطفال", "مرحلة"],["DEP_PRI", "ابتدائي", "مرحلة"],["DEP_PREP", "إعدادي", "مرحلة"],["DEP_SEC", "ثانوي", "مرحلة"],["DEP_TECH", "ثانوي فني", "مرحلة"],["DEP_PRIVATE", "خاص", "مرحلة"],["DEP_COMM", "تعليم مجتمعي", "مرحلة"],["DEP_SPED", "التربية الخاصة والدمج", "مرحلة"],["DEP_LIT", "محو الأمية وتعليم الكبار", "مرحلة"],["DEP_HR", "شئون عاملين", "إداري"],["DEP_FIN", "ماليات", "إداري"],["DEP_ACC", "حسابات", "إداري"],["DEP_PROC", "المشتريات والمخازن", "إداري"],["DEP_LEGAL", "الشئون القانونية", "إداري"],["DEP_ADM", "الشئون الإدارية", "إداري"],["DEP_ARCH", "الصادر والوارد والأرشيف", "إداري"],["DEP_CIT", "خدمة المواطنين", "إداري"],["DEP_EXEC", "الشئون التنفيذية", "إداري"],["DEP_SEC_GUARD", "الأمن", "إداري"],["DEP_BLD", "الأبنية والصيانة", "إداري"],["DEP_PR", "العلاقات العامة والإعلام", "إداري"],["DEP_PLAN", "التخطيط والمشروعات", "فني"],["DEP_INFO", "المعلومات والإحصاء", "فني"],["DEP_QUAL", "الجودة", "فني"],["DEP_TECHDEV", "التطوير التكنولوجي", "فني"],["DEP_TRAIN", "التدريب", "فني"],["DEP_FOLLOW", "متابعة", "فني"],["DEP_SUST", "التنمية المستدامة", "فني"],["DEP_DECEN", "اللامركزية", "فني"],["DEP_EQ", "تكافؤ الفرص", "فني"],["DEP_PROD", "المدرسة المنتجة", "فني"],["DEP_STUD", "شئون طلاب", "خدمات وأنشطة"],["DEP_EXAM", "الامتحانات", "خدمات وأنشطة"],["DEP_SOC", "التربية الاجتماعية", "خدمات وأنشطة"],["DEP_ACT", "الأنشطة الطلابية", "خدمات وأنشطة"],["DEP_NUT", "التغذية المدرسية", "خدمات وأنشطة"],["DEP_HEALTH", "الصحة المدرسية", "خدمات وأنشطة"],["DEP_BOOKS", "الكتب المدرسية", "خدمات وأنشطة"]
];
var V42_EDIT_SECTIONS = ['بيانات التواصل','المؤهلات','بيانات العمل','بيانات إضافية'];
var V42_SUP_JOBS = ['مدير إدارة','وكيل إدارة','رئيس قسم','وكيل قسم','عضو قسم','موجه أول','موجه'];
var V42_DEFAULT_FILE_TYPES = [['FT_SALARY','مفردات المرتب'],['FT_PAPER','نسخة الملف الورقي'],['FT_PROFILE','الملف الوظيفي'],['FT_FINANCE','تقرير المستحقات الشهرية']];
/** الحقول التي يراها الموظف فقط (لا يعدلها) */
var V42_PROFILE_READONLY = ['الاسم','الرقم_القومي','كود_الموظف','النوع','تاريخ_الميلاد','المسمى_الوظيفي','الدرجة_المالية','الوظيفة_الإشرافية','مادة_التدريس','مشرف_على_المادة','نوع التعليم','القسم','الحالة_الوظيفية','نظام_العمل','الصفة'];
/** الحقول القابلة للتعديل مقسمة على أقسام يستطيع الأدمن غلق أي منها */
var V42_PROFILE_SECTIONS = {
  'بيانات التواصل':['الهاتف','البريد','العنوان'],
  'بيانات العمل':['تاريخ_التعيين','تاريخ_الحصول_على_الدرجة','تاريخ_بدء_العمل','المجموعة_الوظيفية']
};
var V42_FIN_TYPES = ['منظومة الأيام','منظومة الحصص','فوق النصاب','حافز التدريس','معلمي الحصة'];
var V42_PERMISSIONS = ['خط السير','شئون طلاب','متابعة','مالية','شئون عاملين','إدارة'];
var V42_EDU_TYPES = ['عام','ديوان','تعليم مجتمعي'];

/* ========================= أدوات عامة ========================= */
function v42EnsureSheet_(spec){var ss=personnelSS_(),sh=ss.getSheetByName(spec.name);if(!sh)sh=v50A_(ss.insertSheet(spec.name));var h=sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0]:[];var need=spec.headers.slice();var missing=need.filter(function(x){return h.indexOf(x)<0;});if(sh.getLastRow()===0)v50A_(sh.getRange(1,1,1,need.length).setValues([need]));else if(missing.length){var out=h.slice();missing.forEach(function(x){out.push(x);});v50A_(sh.getRange(1,1,1,out.length).setValues([out]));}if(sh.getFrozenRows()!==1)sh.setFrozenRows(1);return sh;}
function v42Sheet_(spec){var sh=personnelSS_().getSheetByName(spec.name);return sh||v42EnsureSheet_(spec);}
function v42Header_(sh){return sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(function(x){return String(x||'').trim();});}
function v42Idx_(h){var o={};h.forEach(function(x,i){if(x)o[x]=i;});return o;}
function v42Val_(r,i,k){return i[k]==null?'':String(r[i[k]]==null?'':r[i[k]]).trim();}
function v42Values_(sh){return sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getDisplayValues():[];}
function v42Id_(prefix){return prefix+Utilities.getUuid().replace(/-/g,'').slice(0,18);}
function v42Json_(s){try{var x=JSON.parse(String(s||''));return x&&typeof x==='object'?x:null;}catch(e){return null;}}
function v42Audit_(eid,op,oldV,newV,by){try{var au=v42Sheet_(V42_TABLES.audit),ah=v42Header_(au),ai=v42Idx_(ah),ar=new Array(ah.length).fill('');ar[ai.auditId]=v42Id_('AUD_');ar[ai.employeeId]=eid||'';ar[ai['العملية']]=op;ar[ai['القديمة']]=oldV==null?'':(typeof oldV==='string'?oldV:JSON.stringify(oldV));ar[ai['الجديدة']]=newV==null?'':(typeof newV==='string'?newV:JSON.stringify(newV));ar[ai['بواسطة']]=by||'';ar[ai['التاريخ']]=new Date();v50A_(au.appendRow(ar));}catch(e){console.error('v42Audit_: '+e.message);}}
function v42SchoolNames_(){var d=v24Data_('18_بيانات_المدارس'),i=v42Idx_(d.headers),m={};d.rows.forEach(function(r){var id=v42Val_(r,i,'schoolId');if(id)m[id]=v42Val_(r,i,'اسم_المدرسة');});return m;}
function v42SchoolTypes_(){var d=v24Data_('18_بيانات_المدارس'),i=v42Idx_(d.headers),m={};d.rows.forEach(function(r){m[v42Val_(r,i,'schoolId')]={name:v42Val_(r,i,'اسم_المدرسة'),type:v42Val_(r,i,'نوع_المدرسة'),cls:v42Val_(r,i,'التصنيف_التشغيلي')};});return m;}
function v42CommunitySchoolIds_(){
  var t=v42SchoolTypes_(),out={};
  Object.keys(t).forEach(function(id){
    var item=t[id];
    var nm=String(item.name||'').trim();
    if(nm==='التعليم المجتمعي') return;
    if(/مجتمعي/.test(item.type)||/مجتمعي/.test(item.cls)||/الفصل الواحد|الموازيه|الموازية|أولاد ابراهيم|اولاد ابراهيم/.test(nm)) out[id]=1;
  });
  return out;
}

/* ========================= التهيئة ========================= */
function v42EnsureBasicColumns_(){var sh=personnelSS_().getSheetByName('01_الأساسي');if(!sh)throw new Error('01_الأساسي غير موجود.');['نوع التعليم','القسم'].forEach(function(k){var h=v42Header_(sh);if(h.indexOf(k)<0)v50A_(sh.getRange(1,sh.getLastColumn()+1).setValue(k));});return sh;}
function v42SeedDepartments_(){var sh=v42EnsureSheet_(V42_TABLES.depts),h=v42Header_(sh),i=v42Idx_(h),existing={};v42Values_(sh).forEach(function(r){existing[r[i.departmentId]]=1;existing['N:'+r[i['اسم_القسم']]]=1;});var rows=V42_DEFAULT_DEPTS.filter(function(x){return !existing[x[0]]&&!existing['N:'+x[1]];}).map(function(x){var r=new Array(h.length).fill('');r[i.departmentId]=x[0];r[i['اسم_القسم']]=x[1];r[i['نوع_القسم']]=x[2];r[i['الحالة']]='فعال';r[i['ترتيب']]=V42_DEFAULT_DEPTS.indexOf(x)+1;return r;});if(rows.length)v50A_(sh.getRange(sh.getLastRow()+1,1,rows.length,h.length).setValues(rows));}
function v42SeedEditSections_(){var sh=v42EnsureSheet_(V42_TABLES.edit),h=v42Header_(sh),i=v42Idx_(h),existing={};v42Values_(sh).forEach(function(r){existing[r[i['اسم_القسم']]]=1;});var rows=V42_EDIT_SECTIONS.map(function(n,j){if(existing[n])return null;var r=new Array(h.length).fill('');r[i.sectionId]='SEC_'+(j+1);r[i['اسم_القسم']]=n;r[i['الحالة']]='فعال';return r;}).filter(Boolean);if(rows.length)v50A_(sh.getRange(sh.getLastRow()+1,1,rows.length,h.length).setValues(rows));}
function v42SeedFileTypes_(){var sh=v42EnsureSheet_(V42_TABLES.files),h=v42Header_(sh),i=v42Idx_(h),existing={};v42Values_(sh).forEach(function(r){existing[r[i['نوع_الملف']]]=1;});var rows=V42_DEFAULT_FILE_TYPES.filter(function(x){return !existing[x[1]];}).map(function(x,j){var r=new Array(h.length).fill('');r[i.fileTypeId]=x[0];r[i['نوع_الملف']]=x[1];r[i['الحالة']]='فعال';r[i['ترتيب']]=j+1;r[i['ملاحظات']]='ضع FolderId لمجلد Drive؛ كل ملف داخله اسمه الرقم القومي.pdf';return r;});if(rows.length)v50A_(sh.getRange(sh.getLastRow()+1,1,rows.length,h.length).setValues(rows));}
function v42SeedEntityAccounts_(){var sh=v42EnsureSheet_(V42_TABLES.entities),h=v42Header_(sh),i=v42Idx_(h);var vals=v42Values_(sh);if(!vals.some(function(r){return r[i['نوع_الجهة']]==='تعليم مجتمعي';})){var r=new Array(h.length).fill('');r[i.entityId]='ENT_COMM';r[i['اسم_الجهة']]='التعليم المجتمعي';r[i['نوع_الجهة']]='تعليم مجتمعي';r[i.username]='التعليم_المجتمعي';r[i.password]=V42_DEFAULT_PASSWORD;r[i.status]='فعال';v50A_(sh.appendRow(r));}vals=v42Values_(sh);if(!vals.some(function(r){return r[i['نوع_الجهة']]==='ديوان';})){var d=new Array(h.length).fill('');d[i.entityId]='ENT_DIWAN';d[i['اسم_الجهة']]='ديوان الإدارة';d[i['نوع_الجهة']]='ديوان';d[i.username]='ديوان_الإدارة';d[i.password]=V42_DEFAULT_PASSWORD;d[i.status]='فعال';d[i['ملاحظات']]='حساب مسئول الديوان: تعديل بيانات العاملين بالديوان والوظائف الإشرافية';v50A_(sh.appendRow(d));}}
/** يضيف مدارس التعليم المجتمعي من 18_بيانات_المدارس (الفصل الواحد / الموازية / التعليم المجتمعي) دون المساس بالموجود. */
function v42SyncCommunitySchools_(){
  var ss=personnelSS_(),target=v42EnsureSheet_(V42_TABLES.community),th=v42Header_(target),ti=v42Idx_(th),existing={};
  v42Values_(target).forEach(function(r){existing[r[ti.schoolId]]=1;});
  var src=ss.getSheetByName('18_بيانات_المدارس');if(!src)return{count:0};
  var h=v42Header_(src),i=v42Idx_(h),add=[];
  v42Values_(src).forEach(function(r){
    var sid=v42Val_(r,i,'schoolId'),name=v42Val_(r,i,'اسم_المدرسة');
    if(!sid||!name||existing[sid])return;
    if(name==='التعليم المجتمعي')return;
    var isComm=/مجتمعي/.test(v42Val_(r,i,'نوع_المدرسة'))||/مجتمعي/.test(v42Val_(r,i,'التصنيف_التشغيلي'))||/الفصل الواحد|الموازيه|الموازية|أولاد ابراهيم|اولاد ابراهيم/.test(name);
    if(!isComm)return;
    var x=new Array(th.length).fill('');
    x[ti.schoolId]=sid;x[ti['اسم_المدرسة']]=name;x[ti['كود_المدرسة']]=v42Val_(r,i,'كود_هيئة_الأبنية');
    x[ti['الوحدة_المحلية']]=v42Val_(r,i,'الوحدة_المحلية');x[ti['الحالة']]='فعال';
    add.push(x);existing[sid]=1;
  });
  if(add.length)v50A_(target.getRange(target.getLastRow()+1,1,add.length,th.length).setValues(add));
  return{count:target.getLastRow()-1,added:add.length};
}
function v42Setup_(){v42EnsureBasicColumns_();Object.keys(V42_TABLES).forEach(function(k){v42EnsureSheet_(V42_TABLES[k]);});v42SeedDepartments_();v42SeedEditSections_();v42SeedFileTypes_();v42SeedEntityAccounts_();v42SyncCommunitySchools_();PropertiesService.getScriptProperties().setProperty('V42_READY',V42_READY_VERSION);}
/** تجهيز خفيف: يعمل مرة واحدة فقط (علامة في Script Properties) ولا يشترط المالك. */
var V49_STAFF_ROLES=['موظف','موجه','رئيس قسم','وكيل قسم','عضو قسم','موجه أول','متابعة','مالية'];
/* V4.9: توحيد كلمة مرور حسابات الموظفين على 123456 مرة واحدة فقط (لا يمس حسابات المدارس أو الإدارة). بعدها يغيرها كل موظف بنفسه. */
/* V4.9.2: صلاحية «خط السير» التلقائية تتبع الوظيفة الإشرافية الحالية:
   لو اتشالت الوظيفة الإشرافية تتوقف الصلاحية التلقائية، ولو رجعت تتفعل. الصلاحيات اللي منحتها الإدارة يدويًا لا تُمس. */
function v49SyncAutoRoutePerm_(eid,isSup){if(!eid)return;var P=v42PermRows_(),found=false,ch=false;for(var r=0;r<P.v.length;r++){var row=P.v[r];if(v42Val_(row,P.i,'employeeId')!==eid||v42Val_(row,P.i,'الصلاحية')!=='خط السير')continue;found=true;if(!/^(تلقائي|تجهيز V4\.\d+)$/.test(v42Val_(row,P.i,'منحها_بواسطة')))continue;var st=v42Val_(row,P.i,'الحالة'),want=isSup?'فعال':'موقوف';if(st!==want){v50A_(P.sh.getRange(r+2,P.i['الحالة']+1).setValue(want));row[P.i['الحالة']]=want;ch=true;}}if(!found&&isSup){v42EnsurePermission_(eid,'خط السير','كل المدارس','');ch=true;}if(ch)V42_PERM_CACHE_=null;}
function v42Ready_(){var p=PropertiesService.getScriptProperties();if(p.getProperty('V42_READY')===V42_READY_VERSION)return;var lock=LockService.getScriptLock();lock.waitLock(20000);v50Fresh_();try{if(p.getProperty('V42_READY')!==V42_READY_VERSION)v42Setup_();}finally{lock.releaseLock();}}

/* ========================= الموظف والصلاحيات ========================= */
function v42FindBasicByNid_(nid){var d=v24Data_('01_الأساسي'),i=v42Idx_(d.headers),row=null,rowIndex=-1;for(var n=0;n<d.rows.length;n++){if(v24DigitsLocalV31_(v42Val_(d.rows[n],i,'الرقم_القومي'))===nid){row=d.rows[n];break;}}if(!row)return null;var sh=personnelSS_().getSheetByName('01_الأساسي'),ids=sh.getRange(2,i.employeeId+1,Math.max(sh.getLastRow()-1,1),1).getDisplayValues(),eid=v42Val_(row,i,'employeeId');for(var k=0;k<ids.length;k++)if(String(ids[k][0]).trim()===eid){rowIndex=k+2;break;}return{row:row,rowIndex:rowIndex,headers:d.headers,idx:i};}
var V42_PERM_CACHE_=null;
function v42PermRows_(){if(V42_PERM_CACHE_)return V42_PERM_CACHE_;var sh=v42Sheet_(V42_TABLES.perms),h=v42Header_(sh),i=v42Idx_(h);V42_PERM_CACHE_={i:i,v:v42Values_(sh),sh:sh,h:h};return V42_PERM_CACHE_;}
function v42PermOut_(r,i){var d=v42Val_(r,i,'التفاصيل');return{permissionId:v42Val_(r,i,'permissionId'),permission:v42Val_(r,i,'الصلاحية'),scope:v42Val_(r,i,'النطاق'),details:d,detailsObj:v42Json_(d),status:v42Val_(r,i,'الحالة')||'فعال'};}
function v42Permissions_(eid){var P=v42PermRows_();return P.v.filter(function(r){return v42Val_(r,P.i,'employeeId')===eid&&v42Val_(r,P.i,'الحالة')!=='موقوف';}).map(function(r){return v42PermOut_(r,P.i);});}
function v42AllPermissions_(eid){var P=v42PermRows_();return P.v.filter(function(r){return v42Val_(r,P.i,'employeeId')===eid;}).map(function(r){return v42PermOut_(r,P.i);});}
function v42AccountRole_(r,i){return v42IsSupervisorJob_(v42Val_(r,i,'الوظيفة_الإشرافية'))?'موجه':'موظف';}
function v42IsSupervisorJob_(job){return V42_SUP_JOBS.indexOf(String(job||'').trim())>=0;}
function v42EnsurePermission_(eid,perm,scope,details){var P=v42PermRows_();if(P.v.some(function(r){return v42Val_(r,P.i,'employeeId')===eid&&v42Val_(r,P.i,'الصلاحية')===perm;}))return;var row=new Array(P.h.length).fill('');row[P.i.permissionId]=v42Id_('PERM_');row[P.i.employeeId]=eid;row[P.i['الصلاحية']]=perm;row[P.i['النطاق']]=scope||'كل المدارس';row[P.i['التفاصيل']]=details||'';row[P.i['الحالة']]='فعال';row[P.i['منحها_بواسطة']]='تلقائي';row[P.i['تاريخ_المنح']]=new Date();v50A_(P.sh.appendRow(row));V42_PERM_CACHE_=null;}
/** نطاق المدارس لصلاحية: null = كل المدارس، أو خريطة schoolId */
function v42PermSchools_(p){if(!p)return{};var o=p.detailsObj||{};if(p.scope==='كل المدارس'||!p.scope)return null;if(p.scope==='كل القطاعات')return v109SchoolIdsForSectors_(v109SectorOptions_());if(p.scope==='قطاعات محددة')return v109SchoolIdsForSectors_(o.sectors||[]);if(o.schools&&o.schools.length){var m={};o.schools.forEach(function(x){m[String(x)]=1;});return m;}if(p.scope==='المرحلة'&&o.stage)return{__stage:o.stage};return null;}
function v42HasPerm_(s,name){return(s.permissions||[]).some(function(p){return p.permission===name&&p.status!=='موقوف';});}


/* ========================= جلسة الموظف ========================= */
/** الجلسة تُحفظ بمفتاحين: V42 لبوابة الموظف، وV271 حتى تعمل شاشات خط السير/المتابعة الحالية بنفس الـ token دون تعديلها. */
function v42PutSession_(token,sess){var c=CacheService.getScriptCache(),j=JSON.stringify(sess);c.put(V42_SESSION_PREFIX+token,j,21600);if(sess.role==='موظف')c.put('V271_SES_'+token,j,21600);}
function v42Session_(token){var x=CacheService.getScriptCache().get(V42_SESSION_PREFIX+String(token||''));if(!x)throw new Error('جلسة الموظف غير صالحة أو منتهية. سجّل الدخول من جديد.');return v93LiveStaff_(JSON.parse(x));}   // V7.35: الصلاحيات وحالة الحساب تُقرأ حيّة
function v42StaffSession_(token){var s=v42Session_(token);if(s.role!=='موظف')throw new Error('جلسة الموظف غير صالحة.');return s;}
function v42RefreshSessionPerms_(token,s){s.permissions=v42Permissions_(s.employeeId);v42PutSession_(token,s);return s;}
function loginStaffV42Core_(nationalId,password){v42Ready_();var nid=v24DigitsLocalV31_(nationalId),p=String(password||'');if(!/^\d{14}$/.test(nid))return{success:false,message:'أدخل الرقم القومي المكون من 14 رقمًا.'};var us=personnelSS_().getSheetByName('R_المستخدمون'),h=v42Header_(us),i=v42Idx_(h),v=v42Values_(us),u=null,ur=-1,other=false;for(var r=0;r<v.length;r++){if(v24DigitsLocalV31_(v42Val_(v[r],i,'username'))===nid){if(V49_STAFF_ROLES.indexOf(v42Val_(v[r],i,'role'))>=0){u=v[r];ur=r+2;break;}other=true;}}if(!u&&!other&&p===V42_DEFAULT_PASSWORD){var nb=v42FindBasicByNid_(nid);if(nb&&v42Val_(nb.row,nb.idx,'حالة_السجل')!=='موقوف'){var row=new Array(h.length).fill('');row[i.userId]=v42Id_('USR_');row[i.username]=nid;row[i.password]=V42_DEFAULT_PASSWORD;row[i.name]=v42Val_(nb.row,nb.idx,'الاسم');row[i.role]=v42AccountRole_(nb.row,nb.idx);row[i.status]='فعال';v50A_(us.getRange(us.getLastRow()+1,1,1,h.length).setValues([row]));u=row;}}else if(u&&String(u[i.password]||'')===''&&p===V42_DEFAULT_PASSWORD){v50A_(us.getRange(ur,i.password+1).setValue(V42_DEFAULT_PASSWORD));u[i.password]=V42_DEFAULT_PASSWORD;}if(!u||String(u[i.password])!==p)return{success:false,message:u?'كلمة المرور غير صحيحة.':'الرقم القومي أو كلمة المرور غير صحيحة.'};if(v42Val_(u,i,'status')==='موقوف')return{success:false,message:'الحساب موقوف من الإدارة.'};var b=v42FindBasicByNid_(nid);if(!b)return{success:false,message:'الموظف غير موجود في 01_الأساسي.'};if(v42Val_(b.row,b.idx,'حالة_السجل')==='موقوف')return{success:false,message:'سجل الموظف موقوف.'};if(v42Val_(b.row,b.idx,'تاريخ_إنهاء_الخدمة'))return{success:false,message:'انتهت خدمة هذا الموظف ('+v42Val_(b.row,b.idx,'سبب_إنهاء_الخدمة')+') — لا يمكن الدخول.'};var eid=v42Val_(b.row,b.idx,'employeeId'),job=v42Val_(b.row,b.idx,'الوظيفة_الإشرافية');v49SyncAutoRoutePerm_(eid,v42IsSupervisorJob_(job));if(v42IsSupervisorJob_(job)){var ri=b.idx;if(ri['حالة_التوجيه']!=null&&b.rowIndex>1&&v42Val_(b.row,ri,'حالة_التوجيه')!=='نشط')v50A_(personnelSS_().getSheetByName('01_الأساسي').getRange(b.rowIndex,ri['حالة_التوجيه']+1).setValue('نشط'));}var token=Utilities.getUuid().replace(/-/g,'');var sess={role:'موظف',username:nid,employeeId:eid,supervisorId:eid,name:v42Val_(b.row,b.idx,'الاسم'),permissions:v42Permissions_(eid)};v42PutSession_(token,sess);return{success:true,token:token,user:sess};}
function staffLogoutV42(token){if(token){var c=CacheService.getScriptCache();c.remove(V42_SESSION_PREFIX+token);c.remove('V271_SES_'+token);}return true;}
function staffChangePasswordV42(token,oldPw,newPw){var s=v42StaffSession_(token);oldPw=String(oldPw||'');newPw=String(newPw||'').trim();if(newPw.length<4)throw new Error('كلمة المرور الجديدة 4 خانات على الأقل.');var us=personnelSS_().getSheetByName('R_المستخدمون'),h=v42Header_(us),i=v42Idx_(h),v=v42Values_(us);for(var r=0;r<v.length;r++)if(v24DigitsLocalV31_(v[r][i.username])===s.username){if(String(v[r][i.password])!==oldPw)throw new Error('كلمة المرور الحالية غير صحيحة.');v50A_(us.getRange(r+2,i.password+1).setValue(newPw));return{success:true,message:'تم تغيير كلمة المرور.'};}throw new Error('الحساب غير موجود.');}
function staffHomeV42(token){var s=v42StaffSession_(token),b=v42FindBasicByNid_(s.username);if(!b)throw new Error('بيانات الموظف غير موجودة.');v49SyncAutoRoutePerm_(v42Val_(b.row,b.idx,'employeeId'),v42IsSupervisorJob_(v42Val_(b.row,b.idx,'الوظيفة_الإشرافية')));s=v42RefreshSessionPerms_(token,s);var i=b.idx,r=b.row,sup=v42Val_(r,i,'الوظيفة_الإشرافية'),dept=v42Val_(r,i,'القسم');var tabs={profile:1,files:1,permissions:1};if(v42HasPerm_(s,'خط السير'))tabs.route=1;if(v42HasPerm_(s,'شئون طلاب')||(/رئيس قسم|وكيل قسم/.test(sup)&&v42StageOfDept_(dept||v42Val_(r,i,'مادة_التدريس'))))tabs.students=1;tabs.myfin=1;if(v42HasPerm_(s,'شئون عاملين')||/رئيس قسم|وكيل قسم|موجه/.test(sup))tabs.workers=1;if(v42HasPerm_(s,'مالية'))tabs.finance=1;if(v42HasPerm_(s,'متابعة'))tabs.followup=1;return{success:true,tabs:tabs,user:{employeeId:v42Val_(r,i,'employeeId'),name:v42Val_(r,i,'الاسم'),nationalId:v42Val_(r,i,'الرقم_القومي'),type:v42Val_(r,i,'نوع التعليم'),job:v42Val_(r,i,'المسمى_الوظيفي'),supervisoryJob:sup,subject:v42Val_(r,i,'مادة_التدريس'),department:dept,isSubjectSupervisor:v42Val_(r,i,'مشرف_على_المادة'),routeType:v42Val_(r,i,'نظام_خط_السير'),routeScope:v42Val_(r,i,'نطاق_خط_السير'),routeStage:v42Val_(r,i,'مرحلة_خط_السير'),school:(v42SchoolNames_()[v42Val_(r,i,'originalSchoolId')]||'')},permissions:s.permissions};}
function staffPermissionsV42(token){var s=v42StaffSession_(token);return{success:true,permissions:v42Permissions_(s.employeeId)};}

/* ========================= بياناتي ========================= */
function v42ClosedSections_(){var sh=v42Sheet_(V42_TABLES.edit),i=v42Idx_(v42Header_(sh)),closed={};v42Values_(sh).forEach(function(x){if(v42Val_(x,i,'الحالة')!=='فعال')closed[v42Val_(x,i,'اسم_القسم')]=1;});return closed;}
function staffProfileV42(token){var s=v42StaffSession_(token),b=v42FindBasicByNid_(s.username);if(!b)throw new Error('بيانات الموظف غير موجودة.');var r=b.row,i=b.idx,closed=v42ClosedSections_(),names=v42SchoolNames_();var ro={};V42_PROFILE_READONLY.forEach(function(k){if(i[k]!=null)ro[k]=v42Val_(r,i,k);});ro['جهة العمل الأصلية']=names[v42Val_(r,i,'originalSchoolId')]||v42Val_(r,i,'originalSchoolId');var sections=Object.keys(V42_PROFILE_SECTIONS).map(function(sec){return{name:sec,open:!closed[sec],fields:V42_PROFILE_SECTIONS[sec].filter(function(k){return i[k]!=null;}).map(function(k){return{key:k,value:v42Val_(r,i,k)};})};});return{success:true,readonly:ro,sections:sections};}
function staffSaveProfileV42(token,payload){var s=v42StaffSession_(token),b=v42FindBasicByNid_(s.username);if(!b||b.rowIndex<2)throw new Error('الموظف غير موجود.');var sh=personnelSS_().getSheetByName('01_الأساسي'),i=b.idx,closed=v42ClosedSections_(),p=payload||{},changes=[],upd={};Object.keys(V42_PROFILE_SECTIONS).forEach(function(sec){if(closed[sec])return;V42_PROFILE_SECTIONS[sec].forEach(function(k){if(i[k]==null||p[k]===undefined)return;var nv=String(p[k]==null?'':p[k]).trim(),ov=v42Val_(b.row,i,k);if(k==='الهاتف'){nv=v24DigitsLocalV31_(nv);if(nv&&!/^\d{8,15}$/.test(nv))throw new Error('رقم الهاتف غير صحيح.');}if(nv.length>200)throw new Error('قيمة طويلة جدًا في '+k);if(nv!==ov){upd[i[k]+1]=nv;changes.push([k,ov,nv]);}});});v50WriteRow_(sh,b.rowIndex,upd);if(changes.length)v42Audit_(s.employeeId,'تعديل بياناتي',changes.map(function(c){return c[0]+': '+c[1];}).join(' | '),changes.map(function(c){return c[0]+': '+c[2];}).join(' | '),s.username);return{success:true,message:changes.length?'تم حفظ '+changes.length+' تعديل.':'لا توجد تعديلات.',changed:changes.length};}

/* ========================= ملفاتي ========================= */
/** كل نوع ملف = مجلد Drive، وداخله ملف لكل موظف باسم «الرقم القومي.pdf». */
function v42FileTypes_(){var sh=v42Sheet_(V42_TABLES.files),i=v42Idx_(v42Header_(sh)),out=v42Values_(sh).filter(function(r){return v42Val_(r,i,'الحالة')!=='موقوف';}).map(function(r){return{id:v42Val_(r,i,'fileTypeId'),name:v42Val_(r,i,'نوع_الملف'),folderId:v42Val_(r,i,'FolderId'),order:Number(v42Val_(r,i,'ترتيب'))||99};});try{var st=v24Data_('R_الإعدادات'),si=v42Idx_(st.headers),salary='';st.rows.forEach(function(r){if(v42Val_(r,si,'key')==='SALARY_FOLDER_ID')salary=v42Val_(r,si,'value');});if(salary){var t=out.filter(function(x){return x.name==='مفردات المرتب';})[0];if(t&&!t.folderId)t.folderId=salary;else if(!t)out.push({id:'FT_SALARY',name:'مفردات المرتب',folderId:salary,order:0});}}catch(e){}return out.sort(function(a,b){return a.order-b.order;});}
function v42StaffFileList_(s){var key='V43_FILES_'+s.employeeId,c=CacheService.getScriptCache(),x=c.get(key);if(x)return JSON.parse(x);var nid=s.username,out=[];v42FileTypes_().forEach(function(t){if(!t.folderId){out.push({type:t.name,name:'',fileId:'',date:'',missing:'لم يُحدد مجلد لهذا النوع بعد'});return;}try{var it=DriveApp.getFolderById(t.folderId).getFilesByName(nid+'.pdf'),found=false;while(it.hasNext()){var f=it.next();if(f.isTrashed())continue;found=true;out.push({type:t.name,name:f.getName(),fileId:f.getId(),date:Utilities.formatDate(f.getLastUpdated(),'Africa/Cairo','yyyy-MM-dd'),size:f.getSize()});break;}if(!found)out.push({type:t.name,name:'',fileId:'',date:'',missing:'لا يوجد ملف لك في هذا المجلد'});}catch(e){out.push({type:t.name,name:'',fileId:'',date:'',missing:'تعذر فتح المجلد'});}});try{var d=v24Data_('09_المستندات'),i=v42Idx_(d.headers);d.rows.forEach(function(r){if(v42Val_(r,i,'employeeId')===s.employeeId&&v42Val_(r,i,'حالة_المستند')!=='موقوف'&&v42Val_(r,i,'DriveFileId'))out.push({type:v42Val_(r,i,'نوع_المستند')||'مستند',name:v42Val_(r,i,'اسم_الملف'),fileId:v42Val_(r,i,'DriveFileId'),date:v42Val_(r,i,'تاريخ_المستند')});});}catch(e){}c.put(key,JSON.stringify(out),1800);return out;}
function staffFilesV42(token){return staffFilesV50(token);}   // V7.63: نفس شرط «تحديث بياناتي» — لا مسار جانبي
/** يرجع الملف نفسه (Base64) بعد التحقق أنه يخص الموظف؛ لا يحتاج مشاركة الملفات للعامة. */
function staffFileDownloadV42(token,fileId){return staffFileDownloadV50(token,fileId);}   // V7.63

/* ========================= شئون الطلاب (رئيس قسم مرحلة / صلاحية شئون طلاب) ========================= */
function v42StageOfDept_(dept){dept=String(dept||'').replace(/اطفال/,'أطفال').replace(/اعدادي|مدرس اعدادي/,'إعدادي').trim();if(/رياض/.test(dept))return'رياض أطفال';if(/ابتدائ/.test(dept))return'ابتدائي';if(/إعداد|اعداد/.test(dept))return'إعدادي';if(/ثانوي فني|فني/.test(dept))return'ثانوي فني';if(/ثانوي/.test(dept))return'ثانوي';return'';}
function staffStudentsV42(token,dateStr){var s=v42StaffSession_(token),b=v42FindBasicByNid_(s.username);if(!b)throw new Error('بيانات الموظف غير موجودة.');var stage='',perm=(s.permissions||[]).filter(function(p){return p.permission==='شئون طلاب';})[0],schoolsFilter=null;if(perm){var o=perm.detailsObj||{};stage=o.stage||v42StageOfDept_(perm.details)||'';schoolsFilter=o.schools&&o.schools.length?o.schools:null;}if(!stage)stage=v42StageOfDept_(v42Val_(b.row,b.idx,'القسم')||v42Val_(b.row,b.idx,'مادة_التدريس'));var date=v35Date_(dateStr)||v40Today_();var names=v42SchoolNames_(),types=v42SchoolTypes_(),dataStage=stage==='ثانوي فني'?'ثانوي':stage;function schoolOk(sid){if(schoolsFilter&&schoolsFilter.indexOf(sid)<0)return false;if(stage==='ثانوي فني')return /فني/.test((types[sid]||{}).type);if(stage==='ثانوي')return !/فني/.test((types[sid]||{}).type);return true;}var stu=v24Data_('13_شؤون_الطلاب'),sti=v42Idx_(stu.headers),by={},tot={classes:0,total:0,male:0,female:0,absent:0};stu.rows.forEach(function(r){if(stage&&v42Val_(r,sti,'المرحلة')!==dataStage)return;var sid=v42Val_(r,sti,'schoolId');if(!sid||!schoolOk(sid))return;if(!by[sid])by[sid]={schoolId:sid,name:names[sid]||v42Val_(r,sti,'اسم المدرسة'),classes:0,total:0,male:0,female:0,absent:0,reported:false};var x=by[sid],cl=Number(v42Val_(r,sti,'عدد الفصول/القاعات'))||0,t=Number(v42Val_(r,sti,'إجمالي الطلاب'))||0,m=Number(v42Val_(r,sti,'ذكور'))||0,f=Number(v42Val_(r,sti,'إناث'))||0;x.classes+=cl;x.total+=t;x.male+=m;x.female+=f;tot.classes+=cl;tot.total+=t;tot.male+=m;tot.female+=f;});try{var dsh=v40DailySheet_(),dh=v42Header_(dsh),di=v42Idx_(dh);v42Values_(dsh).forEach(function(r){if(v42Val_(r,di,'النوع')!=='صف'||v35Date_(v42Val_(r,di,'التاريخ'))!==date)return;if(stage&&v42Val_(r,di,'المرحلة')!==dataStage)return;var sid=v42Val_(r,di,'schoolId');if(!by[sid])return;var n=Number(v24DigitsLocalV31_(v42Val_(r,di,'عدد_الغياب')))||0;by[sid].absent+=n;by[sid].reported=true;tot.absent+=n;});}catch(e){}var schools=Object.keys(by).map(function(k){var x=by[k];x.absentPct=x.total?Math.round(x.absent*1000/x.total)/10:0;return x;}).sort(function(a,b){return a.name.localeCompare(b.name,'ar');});return{success:true,stage:stage||'كل المراحل',date:date,schools:schools,totals:tot,notReported:schools.filter(function(x){return!x.reported;}).length};}

/* ========================= المالية حسب النطاق وأنواع الاستحقاق ========================= */
function v42OpenPeriod_(){var y=0,m=0;try{var st=v24Data_('R_الإعدادات'),si=v42Idx_(st.headers);st.rows.forEach(function(r){var k=v42Val_(r,si,'key');if(k==='OPEN_YEAR')y=Number(v24DigitsLocalV31_(v42Val_(r,si,'value')));if(k==='OPEN_MONTH')m=Number(v24DigitsLocalV31_(v42Val_(r,si,'value')));});}catch(e){}var now=new Date();return{year:y||now.getFullYear(),month:m||(now.getMonth()+1)};}
function staffFinanceV42(token,year,month){var s=v42StaffSession_(token);var perms=(s.permissions||[]).filter(function(p){return p.permission==='مالية'&&p.status!=='موقوف';});if(!perms.length)throw new Error('ليست لديك صلاحية مالية.');var allSchools=false,schools={},types={};perms.forEach(function(p){var sc=v42PermSchools_(p);if(sc===null)allSchools=true;else Object.keys(sc).forEach(function(k){if(k!=='__stage')schools[k]=1;});var o=p.detailsObj||{},ts=o.types&&o.types.length?o.types:V42_FIN_TYPES.filter(function(t){return String(p.details||'').indexOf(t)>=0;});if(!ts.length)ts=V42_FIN_TYPES;ts.forEach(function(t){types[t]=1;});});var per=(function(){try{var d=v56Default_();if(d)return{year:d.year,month:d.month};}catch(e){}return v42OpenPeriod_();})();year=Number(year)||per.year;month=Number(month)||per.month;var names=v42SchoolNames_();function inScope(sid){return allSchools||!!schools[sid];}var colMap={'منظومة الأيام':'قيمة_منظومة_الأيام','منظومة الحصص':'قيمة_منظومة_الحصص','فوق النصاب':'قيمة_فوق_النصاب','حافز التدريس':'قيمة_الحافز'};var shown=V42_FIN_TYPES.filter(function(t){return types[t]&&colMap[t];});var rows=[],sum={};shown.forEach(function(t){sum[t]=0;});if(shown.length){var emp=v24Data_('01_الأساسي'),ei=v42Idx_(emp.headers),en={};emp.rows.forEach(function(r){en[v42Val_(r,ei,'employeeId')]=[v42Val_(r,ei,'الاسم'),v42Val_(r,ei,'الرقم_القومي')];});var f=v24Data_('08_الماليات'),fi=v42Idx_(f.headers);f.rows.forEach(function(r){if(Number(v42Val_(r,fi,'السنة'))!==year||Number(v42Val_(r,fi,'الشهر'))!==month)return;var sid=v42Val_(r,fi,'schoolId');if(!inScope(sid))return;var vals={},any=false;shown.forEach(function(t){var n=Number(String(v42Val_(r,fi,colMap[t])).replace(/,/g,''))||0;vals[t]=n;if(n)any=true;sum[t]+=n;});if(!any)return;var e=en[v42Val_(r,fi,'employeeId')]||['',''];rows.push({name:e[0],nationalId:e[1],school:names[sid]||sid,values:vals,status:v42Val_(r,fi,'حالة_الاعتماد')||v42Val_(r,fi,'حالة_الحساب')});});}var hourly=null;if(types['معلمي الحصة']){hourly={rows:[],total:0};try{var hp=v24Data_('05_معلمو_الحصة_والمعاش'),hi=v42Idx_(hp.headers),hn={};hp.rows.forEach(function(r){hn[v42Val_(r,hi,'hrpId')]=[v42Val_(r,hi,'الاسم'),v42Val_(r,hi,'الرقم_القومي'),v42Val_(r,hi,'نوع_الفئة')];});var hf=v24Data_('08_ماليات_معلمي_الحصة'),hfi=v42Idx_(hf.headers);hf.rows.forEach(function(r){if(Number(v42Val_(r,hfi,'السنة'))!==year||Number(v42Val_(r,hfi,'الشهر'))!==month)return;var sid=v42Val_(r,hfi,'schoolId');if(!inScope(sid))return;var e=hn[v42Val_(r,hfi,'hrpId')]||['','',''],val=Number(String(v42Val_(r,hfi,'القيمة')).replace(/,/g,''))||0;hourly.total+=val;hourly.rows.push({name:e[0],nationalId:e[1],category:e[2]||v42Val_(r,hfi,'نوع_الفئة'),school:names[sid]||sid,periods:v42Val_(r,hfi,'إجمالي_الحصص_الفعلية'),value:val,status:v42Val_(r,hfi,'حالة_الاعتماد')||v42Val_(r,hfi,'حالة_الحساب')});});}catch(e){}}return{success:true,year:year,month:month,months:(function(){try{return v56MonthsForSchool_();}catch(e){return[];}})(),scope:allSchools?'كل المدارس':Object.keys(schools).map(function(k){return names[k]||k;}).join('، '),types:Object.keys(types),columns:shown,rows:rows,sums:sum,hourly:hourly};}

/* ========================= المدارس الخاصة (شئون الطلاب فقط) ========================= */
function specialLoginV42Core_(username,password){v42Ready_();var sh=v42Sheet_(V42_TABLES.entities),h=v42Header_(sh),i=v42Idx_(h),v=v42Values_(sh);for(var r=0;r<v.length;r++)if(v42Val_(v[r],i,'username')===String(username||'').trim()&&v42Val_(v[r],i,'password')===String(password||'')&&v42Val_(v[r],i,'نوع_الجهة')==='مدارس خاص'&&v42Val_(v[r],i,'status')==='فعال'){var t=Utilities.getUuid().replace(/-/g,''),u={role:'خاص',username:v42Val_(v[r],i,'username'),name:v42Val_(v[r],i,'اسم_الجهة'),school:v42Val_(v[r],i,'اسم_الجهة'),schoolId:v42Val_(v[r],i,'schoolId')};v42PutSession_(t,u);return{success:true,token:t,user:u};}return{success:false,message:'بيانات دخول المدرسة الخاصة غير صحيحة.'};}
function specialSessionV42_(token){var s=v42Session_(token);if(s.role!=='خاص')throw new Error('جلسة المدارس الخاصة غير صالحة.');return s;}
function v42Grades_(){var d=v24Data_('22_مرجع_المراحل_والصفوف'),i=v42Idx_(d.headers);return d.rows.filter(function(r){return v42Val_(r,i,'الحالة')!=='موقوف';}).map(function(r){return{stage:v42Val_(r,i,'المرحلة'),grade:v42Val_(r,i,'الصف_المستوى')};});}
function specialStudentsV42(token){var s=specialSessionV42_(token),sh=v42Sheet_(V42_TABLES.privateStudents),i=v42Idx_(v42Header_(sh)),saved={};v42Values_(sh).forEach(function(r){if(v42Val_(r,i,'schoolId')===s.schoolId)saved[v42Val_(r,i,'المرحلة')+'|'+v42Val_(r,i,'الصف_المستوى')]={classes:v42Val_(r,i,'عدد_الفصول'),male:v42Val_(r,i,'ذكور'),female:v42Val_(r,i,'إناث'),total:v42Val_(r,i,'إجمالي_الطلاب')};});return{success:true,school:s.school,rows:v42Grades_().map(function(g){var x=saved[g.stage+'|'+g.grade]||{};return{stage:g.stage,grade:g.grade,classes:x.classes||'',male:x.male||'',female:x.female||'',total:x.total||''};})};}
function specialSaveStudentsV42(token,rows){var s=specialSessionV42_(token),sh=v42Sheet_(V42_TABLES.privateStudents),h=v42Header_(sh),i=v42Idx_(h),v=v42Values_(sh),pos={};v.forEach(function(r,n){if(v42Val_(r,i,'schoolId')===s.schoolId)pos[v42Val_(r,i,'المرحلة')+'|'+v42Val_(r,i,'الصف_المستوى')]=n+2;});var valid={};v42Grades_().forEach(function(g){valid[g.stage+'|'+g.grade]=1;});var add=[],n=0;(rows||[]).forEach(function(x){var k=String(x.stage)+'|'+String(x.grade);if(!valid[k])return;function num(z){var q=Number(v24DigitsLocalV31_(z||0))||0;if(q<0||q>100000)throw new Error('قيمة غير صحيحة في '+x.stage+' / '+x.grade);return q;}var cl=num(x.classes),m=num(x.male),f=num(x.female);if(!cl&&!m&&!f&&!pos[k])return;var row=new Array(h.length).fill('');if(pos[k])row=v[pos[k]-2].slice();row[i.rowId]=row[i.rowId]||v42Id_('PRV_');row[i.schoolId]=s.schoolId;row[i['اسم_المدرسة']]=s.school;row[i['المرحلة']]=x.stage;row[i['الصف_المستوى']]=x.grade;row[i['عدد_الفصول']]=cl;row[i['ذكور']]=m;row[i['إناث']]=f;row[i['إجمالي_الطلاب']]=m+f;row[i['آخر_تحديث']]=new Date();row[i['المستخدم']]=s.username;if(pos[k])v50A_(sh.getRange(pos[k],1,1,h.length).setValues([row]));else add.push(row);n++;});if(add.length)v50A_(sh.getRange(sh.getLastRow()+1,1,add.length,h.length).setValues(add));return{success:true,message:'تم حفظ '+n+' صف.'};}

/* ========================= التعليم المجتمعي ========================= */
function communityLoginV42Core_(username,password){v42Ready_();var sh=v42Sheet_(V42_TABLES.entities),h=v42Header_(sh),i=v42Idx_(h),v=v42Values_(sh);for(var r=0;r<v.length;r++)if(v42Val_(v[r],i,'نوع_الجهة')==='تعليم مجتمعي'&&v42Val_(v[r],i,'username')===String(username||'').trim()&&v42Val_(v[r],i,'password')===String(password||'')&&v42Val_(v[r],i,'status')==='فعال'){var t=Utilities.getUuid().replace(/-/g,''),u={role:'تعليم مجتمعي',username:v42Val_(v[r],i,'username'),name:v42Val_(v[r],i,'اسم_الجهة')};v42PutSession_(t,u);return{success:true,token:t,user:u};}return{success:false,message:'بيانات دخول التعليم المجتمعي غير صحيحة.'};}
function communitySessionV42_(token){var s=v42Session_(token);if(s.role!=='تعليم مجتمعي')throw new Error('جلسة التعليم المجتمعي غير صالحة.');return s;}
function communitySchoolsV42(token){
  communitySessionV42_(token);
  try { v42SyncCommunitySchools_(); } catch(eSync) {}
  var sh=v42Sheet_(V42_TABLES.community), h=v42Header_(sh), i=v42Idx_(h);
  var schools=v42Values_(sh).filter(function(r){return v42Val_(r,i,'schoolId')&&v42Val_(r,i,'الحالة')!=='موقوف'&&v42Val_(r,i,'اسم_المدرسة')!=='التعليم المجتمعي';}).map(function(r){
    return {schoolId:v42Val_(r,i,'schoolId'),name:v42Val_(r,i,'اسم_المدرسة'),unit:v42Val_(r,i,'الوحدة_المحلية'),
      values:{1:v42Val_(r,i,'الصف_الأول'),2:v42Val_(r,i,'الصف_الثاني'),3:v42Val_(r,i,'الصف_الثالث'),4:v42Val_(r,i,'الصف_الرابع'),5:v42Val_(r,i,'الصف_الخامس'),6:v42Val_(r,i,'الصف_السادس')},
      total:v42Val_(r,i,'إجمالي_الطلاب')};
  });
  return {success:true,schools:schools};
}
function communitySaveSchoolV42(token,schoolId,payload){var s=communitySessionV42_(token),sh=v42Sheet_(V42_TABLES.community),h=v42Header_(sh),i=v42Idx_(h),v=v42Values_(sh),row=-1;for(var r=0;r<v.length;r++)if(String(v[r][i.schoolId])===String(schoolId)){row=r+2;break;}if(row<2)throw new Error('مدرسة التعليم المجتمعي غير موجودة.');var p=payload||{},sum=0,vals=v[row-2].slice();['الأول','الثاني','الثالث','الرابع','الخامس','السادس'].forEach(function(g){var k='الصف_'+g,val=Number(v24DigitsLocalV31_(p[k]||0));if(!isFinite(val)||val<0||val>1000||Math.floor(val)!==val)throw new Error('عدد الطلاب يجب أن يكون رقمًا صحيحًا غير سالب.');vals[i[k]]=val;sum+=val;});vals[i['إجمالي_الطلاب']]=sum;if(i['آخر_تحديث']!=null)vals[i['آخر_تحديث']]=new Date();v50A_(sh.getRange(row,1,1,h.length).setValues([vals]));return{success:true,message:'تم حفظ أعداد الطلاب.',total:sum};}
function communityWorkersV42(token){
  communitySessionV42_(token);
  var ids=v42CommunitySchoolIds_(),names=v42SchoolNames_();
  var d=v24Data_('01_الأساسي'),i=v42Idx_(d.headers);
  var rel=v24Data_('04_علاقات_المدارس'),ri=schoolV31Idx_(rel.headers),relMap={};
  rel.rows.forEach(function(r){
    var eid=schoolV31Val_(r,ri,'employeeId');
    if(!relMap[eid]&&v36ActiveRel_(schoolV31Val_(r,ri,'الحالة'))){
      relMap[eid]={type:schoolV31Val_(r,ri,'نوع_العلاقة'),status:schoolV31Val_(r,ri,'الحالة'),schoolId:schoolV31Val_(r,ri,'schoolId')};
    }
  });

  var rows=d.rows.filter(function(r){
    var sid=v42Val_(r,i,'originalSchoolId'), ty=v42Val_(r,i,'نوع التعليم'), eid=v42Val_(r,i,'employeeId');
    var rm=relMap[eid]||{};
    return ty==='تعليم مجتمعي'||!!ids[sid]||(rm.schoolId&&!!ids[rm.schoolId]);
  }).map(function(r){
    var sid=v42Val_(r,i,'originalSchoolId');
    var eid=v42Val_(r,i,'employeeId');
    var rm=relMap[eid]||{};
    if(!sid&&rm.schoolId) sid=rm.schoolId;
    var job=v42Val_(r,i,'المسمى_الوظيفي');
    var supJob=v42Val_(r,i,'الوظيفة_الإشرافية');
    var stage=v42Val_(r,i,'المرحلة_التعليمية_الأصلية')||'ابتدائي';
    var isSup=(v42Val_(r,i,'مشرف_على_المادة')==='نعم');
    var quota='';
    try {
      if(typeof v40LegalQuota_==='function') quota=v40LegalQuota_(job,stage,isSup,supJob);
    } catch(eQ){}

    return {
      employeeId: eid,
      name: v42Val_(r,i,'الاسم'),
      nationalId: v42Val_(r,i,'الرقم_القومي'),
      code: v42Val_(r,i,'كود_الموظف'),
      job: job,
      supervisoryJob: supJob,
      supervisor: isSup?'نعم':'لا',
      legalQuota: quota,
      subject: v42Val_(r,i,'مادة_التدريس'),
      stage: stage,
      workSystem: v42Val_(r,i,'نظام_العمل'),
      educationType: v42Val_(r,i,'نوع التعليم')||'تعليم مجتمعي',
      degree: v42Val_(r,i,'الدرجة_المالية'),
      schoolId: sid,
      school: names[sid]||sid,
      phone: v42Val_(r,i,'الهاتف'),
      employmentStatus: v42Val_(r,i,'الحالة_الوظيفية')||'قائم',
      recordStatus: v42Val_(r,i,'حالة_السجل')||'فعال',
      relationType: rm.type||'أصلي',
      relationStatus: rm.status||'نشط'
    };
  }).sort(function(a,b){return(a.school+a.name).localeCompare(b.school+b.name,'ar');});

  return {success:true,rows:rows};
}

/** حفظ سريع جماعي لبيانات وأنظمة عمل معلمي التعليم المجتمعي */
function communitySaveWorkersQuickV42(token, rows){
  var cs=communitySessionV42_(token);
  if(!Array.isArray(rows)||!rows.length) return {success:true,message:'لا توجد تغييرات للحفظ.',changed:0};
  var lock=LockService.getScriptLock();
  lock.waitLock(30000);
  v50Fresh_();
  try {
    var sh=personnelSS_().getSheetByName('01_الأساسي');
    if(!sh) throw new Error('ورقة 01_الأساسي غير موجودة.');
    var extra=['الوظيفة_الإشرافية','مشرف_على_المادة','نظام_العمل'];
    extra.forEach(function(k){ schoolEnsureWorkerColumnV40_(sh,k); });
    var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
    var ei=schoolV33Index_(h);
    var emp=v24Data_('01_الأساسي'), byId={};
    emp.rows.forEach(function(r,n){
      var id=schoolV33Val_(r,ei,'employeeId');
      if(id) byId[id]={row:r,index:n+2};
    });

    var commIds=v42CommunitySchoolIds_();
    var allowedSup={'':1,'قيادة أولى':1,'قيادة ثانية':1};
    var changed=0, details=[];

    rows.forEach(function(item){
      var id=String(item.employeeId||'').trim();
      var rec=byId[id];
      if(!id||!rec) throw new Error('عامل غير موجود في قاعدة البيانات: '+id);
      var old=rec.row;
      var sid=schoolV33Val_(old,ei,'originalSchoolId');
      var eduType=schoolV33Val_(old,ei,'نوع التعليم');
      if(!commIds[sid]&&eduType!=='تعليم مجتمعي'){
        throw new Error('العامل ('+schoolV33Val_(old,ei,'الاسم')+') لا يتبع مدارس التعليم المجتمعي.');
      }

      var payload=item.payload||{};
      if(payload['الاسم']!==undefined||payload['الرقم_القومي']!==undefined){
        throw new Error('الاسم والرقم القومي ثابتان ولا يمكن تعديلهما من هذا الجدول.');
      }

      var oldJob=String(old[ei['المسمى_الوظيفي']]==null?'':old[ei['المسمى_الوظيفي']]).trim();
      if(payload['المسمى_الوظيفي']!==undefined&&String(payload['المسمى_الوظيفي']).trim()!==oldJob&&!schoolV32JobAllowed_(payload['المسمى_الوظيفي'])){
        throw new Error('المسمى الوظيفي غير موجود في القائمة المعتمدة.');
      }

      var oldSup=String(old[ei['مشرف_على_المادة']]==null?'':old[ei['مشرف_على_المادة']]).trim();
      if(payload['مشرف_على_المادة']!==undefined&&String(payload['مشرف_على_المادة']).trim()!==oldSup&&['نعم','لا',''].indexOf(String(payload['مشرف_على_المادة']).trim())<0){
        throw new Error('حقل مشرف يجب أن يكون نعم أو لا.');
      }

      var finalJob=String(payload['المسمى_الوظيفي']!==undefined?payload['المسمى_الوظيفي']:(old[ei['المسمى_الوظيفي']]||'')).trim();
      if(payload['مادة_التدريس']!==undefined&&typeof subjectCanonV44_==='function'){
        payload['مادة_التدريس']=subjectCanonV44_(payload['مادة_التدريس']);
      }

      if(payload['نظام_العمل']!==undefined){
        var sysVal=String(payload['نظام_العمل']||'').trim();
        if(sysVal&&v36WorkSystems_().indexOf(sysVal)<0){
          throw new Error('نظام العمل غير صالح: '+sysVal);
        }
      }

      var expectedDegree=schoolV32ExpectedDegree_(finalJob);
      if(expectedDegree) payload['الدرجة_المالية']=expectedDegree;

      var upd={};
      var validKeys=['المسمى_الوظيفي','الوظيفة_الإشرافية','مشرف_على_المادة','مادة_التدريس','الدرجة_المالية','المرحلة_التعليمية_الأصلية','نظام_العمل'];
      validKeys.forEach(function(k){
        if(payload[k]===undefined||ei[k]==null) return;
        var nv=schoolV31Clean_(payload[k]);
        var ov=String(old[ei[k]]==null?'':old[ei[k]]).trim();
        if(nv!==ov){
          upd[ei[k]+1]=nv;
          details.push([id,k,ov,nv]);
          changed++;
        }
      });

      if(Object.keys(upd).length>0){
        v50WriteRow_(sh,rec.index,upd);
      }
    });

    v42Audit_('','تعديل سريع جماعي لمعلمي التعليم المجتمعي','',changed+' تعديل في '+rows.length+' معلم',cs.username);
    return {success:true,message:'تم حفظ تعديلات معلمي التعليم المجتمعي بنجاح ('+changed+' تعديل).',changed:changed,workers:rows.length};
  } finally {
    try { lock.releaseLock(); } catch(e){}
  }
}


/** تغيير حالة أو نقل/ندب معلم في التعليم المجتمعي مع التحكم بنوع التعليم */
function communityChangeWorkerStatusV42(token, payload){
  var cs=communitySessionV42_(token);
  var p=payload||{};
  var eid=String(p.employeeId||'').trim(), moveType=String(p.moveType||'').trim(), targetSchoolId=String(p.targetSchoolId||'').trim(), note=String(p.note||'').trim();
  if(!eid) throw new Error('حدد المعلم.');
  if(!moveType) throw new Error('حدد نوع الإجراء.');

  return v35Lock_(function(){
    v50Fresh_();
    var emp=v24Data_('01_الأساسي'), ei=schoolV31Idx_(emp.headers), empRow=-1, curSid='', curEduType='';
    for(var r=0;r<emp.rows.length;r++){
      if(String(schoolV31Val_(emp.rows[r],ei,'employeeId'))===eid){
        empRow=r+2;
        curSid=schoolV31Val_(emp.rows[r],ei,'originalSchoolId');
        curEduType=schoolV31Val_(emp.rows[r],ei,'نوع التعليم');
        break;
      }
    }
    if(empRow<2) throw new Error('المعلم غير موجود في قاعدة البيانات.');

    var commIds=v42CommunitySchoolIds_();
    var names=v42SchoolNames_();

    if(moveType==='نقل'||moveType==='ندب كلي'){
      if(!targetSchoolId) throw new Error('اختر المدرسة المستقبلة.');
      if(targetSchoolId===curSid) throw new Error('لا يمكن اختيار نفس المدرسة.');
      
      var isTargetComm=!!commIds[targetSchoolId];
      // تحديث نوع التعليم: إذا نُقل/انتدب كلياً لتعليم عام يصبح عام، وإن نُقل لمجتمعي يصبح تعليم مجتمعي
      var newEduType=isTargetComm?'تعليم مجتمعي':'عام';

      // تنفيذ الحركة عبر النواة v93
      var mockV=['',moveType,'أساسي',eid,curSid,targetSchoolId,'',p.days||'',p.periods||''];
      var mockIx={نوع_الطلب:1,نوع_الموظف:2,employeeId:3,fromSchoolId:4,toSchoolId:5,أيام_الندب_الجزئي:7,حصص_الندب_الجزئي:8};
      v93ApplyMove_(mockV, mockIx, 'حركة بقرار مسؤول التعليم المجتمعي');

      // تعديل نوع التعليم في 01_الأساسي
      var shBasic=personnelSS_().getSheetByName('01_الأساسي'), bi=v42Idx_(v42Header_(shBasic));
      if(bi['نوع التعليم']!=null){
        v50A_(shBasic.getRange(empRow, bi['نوع التعليم']+1).setValue(newEduType));
      }

      v42Audit_(eid, moveType+' معلم مجتمعي', curSid+' ('+curEduType+')', targetSchoolId+' ('+newEduType+')', cs.username);
      return {success:true, message:'تم تنفيذ '+moveType+' بنجاح إلى «'+(names[targetSchoolId]||targetSchoolId)+'» وتحديث نوع التعليم إلى ('+newEduType+').'};
    }
    else if(moveType==='ندب جزئي'){
      if(!targetSchoolId) throw new Error('اختر مدرسة الندب الجزئي.');
      if(targetSchoolId===curSid) throw new Error('لا يمكن اختيار نفس المدرسة.');
      var isTargetComm=!!commIds[targetSchoolId];
      // شرط المستخدم الصارم: الندب الجزئي يظل داخل نفس نوع التعليم فقط!
      if(!isTargetComm){
        throw new Error('الندب الجزئي مسموح به فقط بين مدارس التعليم المجتمعي ويظل داخل نفس نوع التعليم.');
      }
      var dd=latinDigitsV36_(p.days||''), pp=latinDigitsV36_(p.periods||'');
      if(!dd||pp===''){
        throw new Error('اكتب عدد الأيام وعدد الحصص الأسبوعية للندب الجزئي.');
      }
      var mockV=['','ندب جزئي','أساسي',eid,curSid,targetSchoolId,'',dd,pp];
      var mockIx={نوع_الطلب:1,نوع_الموظف:2,employeeId:3,fromSchoolId:4,toSchoolId:5,أيام_الندب_الجزئي:7,حصص_الندب_الجزئي:8};
      v93ApplyMove_(mockV, mockIx, 'ندب جزئي مجتمعي');
      v42Audit_(eid, 'ندب جزئي مجتمعي', curSid, targetSchoolId, cs.username);
      return {success:true, message:'تم تنفيذ الندب الجزئي بنجاح إلى «'+(names[targetSchoolId]||targetSchoolId)+'» دون تغيير نوع التعليم.'};
    }
    else if(moveType==='إجازة'||moveType==='إنهاء خدمة'||moveType==='غير قائم'){
      var shBasic=personnelSS_().getSheetByName('01_الأساسي'), bi=v42Idx_(v42Header_(shBasic));
      if(bi['الحالة_الوظيفية']!=null) v50A_(shBasic.getRange(empRow, bi['الحالة_الوظيفية']+1).setValue(moveType==='إنهاء خدمة'?'منهي خدمته':'غير قائم'));
      if(bi['سبب_عدم_القيام']!=null) v50A_(shBasic.getRange(empRow, bi['سبب_عدم_القيام']+1).setValue(note||moveType));
      v42Audit_(eid, 'تعديل حالة وظيفة معلم مجتمعي', '', moveType, cs.username);
      return {success:true, message:'تم تحديث حالة المعلم إلى «'+moveType+'» بنجاح.'};
    }
    else if(moveType==='قائم'){
      var shBasic=personnelSS_().getSheetByName('01_الأساسي'), bi=v42Idx_(v42Header_(shBasic));
      if(bi['الحالة_الوظيفية']!=null) v50A_(shBasic.getRange(empRow, bi['الحالة_الوظيفية']+1).setValue('قائم'));
      if(bi['حالة_السجل']!=null) v50A_(shBasic.getRange(empRow, bi['حالة_السجل']+1).setValue('فعال'));
      if(bi['سبب_عدم_القيام']!=null) v50A_(shBasic.getRange(empRow, bi['سبب_عدم_القيام']+1).setValue(''));
      v42Audit_(eid, 'إعادة المعلم قائم بالعمل', '', 'قائم', cs.username);
      return {success:true, message:'تم إعادة المعلم إلى حالة «قائم بالعمل» بنجاح.'};
    }

    throw new Error('نوع الإجراء غير معروف.');
  });
}

/** لوحة المدارس المجمعة لمسؤول التعليم المجتمعي (إحصاءات المدارس العشر + الطلاب + المعلمين + الزوار) */
function communitySchoolsOverviewV42(token){
  communitySessionV42_(token);
  var commRes = communitySchoolsV42(token), schools = commRes.schools || [];
  var validIds = {}; schools.forEach(function(s){ validIds[s.schoolId] = s; });
  
  // المعلمون
  var empD = v24Data_('01_الأساسي'), ei = v42Idx_(empD.headers);
  var workerCounts = {};
  empD.rows.forEach(function(r){
    var sid = v42Val_(r, ei, 'originalSchoolId');
    if(validIds[sid] && v42Val_(r, ei, 'حالة_السجل') !== 'موقوف') {
      workerCounts[sid] = (workerCounts[sid] || 0) + 1;
    }
  });

  // الزائرون
  var visitorCounts = {};
  try {
    var vsh = personnelSS_().getSheetByName(ROUTE_V41.visitSheet);
    if(vsh && vsh.getLastRow() > 1) {
      var vh = routeV41Header_(vsh), vi = routeV41Idx_(vh);
      var vv = vsh.getRange(2, 1, vsh.getLastRow() - 1, vsh.getLastColumn()).getDisplayValues();
      vv.forEach(function(r){
        var vsid = v42Val_(r, vi, 'schoolId');
        if(validIds[vsid]) visitorCounts[vsid] = (visitorCounts[vsid] || 0) + 1;
      });
    }
  } catch(eV){}

  var totalStudents = 0, totalWorkers = 0, totalVisitors = 0;
  var rows = schools.map(function(s){
    var stu = Number(s.total) || 0;
    var w = workerCounts[s.schoolId] || 0;
    var v = visitorCounts[s.schoolId] || 0;
    totalStudents += stu; totalWorkers += w; totalVisitors += v;
    return {
      schoolId: s.schoolId,
      name: s.name,
      unit: s.unit || '—',
      students: stu,
      workers: w,
      visitors: v,
      status: 'نشطة'
    };
  });

  return {
    success: true,
    schools: rows,
    totals: {
      count: rows.length,
      students: totalStudents,
      workers: totalWorkers,
      visitors: totalVisitors
    }
  };
}

/** فتح سياق مدرسة محددة من المدارس العشر تحت مسؤول التعليم المجتمعي */
function communityOpenSchoolContextV42(token, targetSchoolId){
  var cs = communitySessionV42_(token);
  var commRes = communitySchoolsV42(token), schools = commRes.schools || [];
  var found = schools.filter(function(s){ return String(s.schoolId) === String(targetSchoolId); })[0];
  if(!found) throw new Error('المدرسة المطلوبة غير تابعة لمدارس التعليم المجتمعي المصرح بها.');

  // ننشئ جلسة مدرسة موازية بنفس الـ token حتى تعمل جميع شاشات وخدمات المدرسة العادية فورياً
  var schoolSess = {
    role: 'مدرسة',
    schoolId: found.schoolId,
    school: found.name,
    username: cs.username,
    name: 'مسؤول التعليم المجتمعي (' + found.name + ')',
    stage: 'ابتدائي',
    stages: ['ابتدائي'],
    isCommunityDelegate: true
  };
  CacheService.getScriptCache().put('V271_SES_' + token, JSON.stringify(schoolSess), 21600);

  return {
    success: true,
    schoolId: found.schoolId,
    schoolName: found.name,
    unit: found.unit || '',
    stage: 'ابتدائي',
    educationType: 'تعليم مجتمعي'
  };
}

/** استحقاقات ماليات مدارس التعليم المجتمعي لشهر محدد مجمعة ومفصلة */
function communityFinanceV42(token, year, month){
  communitySessionV42_(token);
  var commRes = communitySchoolsV42(token), schools = commRes.schools || [];
  var validIds = {}; schools.forEach(function(s){ validIds[s.schoolId] = s.name; });

  var per = (function(){
    try { var d = v56Default_(); if(d) return {year: d.year, month: d.month}; } catch(e){}
    return v42OpenPeriod_();
  })();
  year = Number(year) || per.year;
  month = Number(month) || per.month;

  var colMap = {'منظومة الأيام':'قيمة_منظومة_الأيام','منظومة الحصص':'قيمة_منظومة_الحصص','فوق النصاب':'قيمة_فوق_النصاب','حافز التدريس':'قيمة_الحافز'};
  var shown = Object.keys(colMap);
  var rows = [], sums = {}; shown.forEach(function(t){ sums[t] = 0; });

  var emp = v24Data_('01_الأساسي'), ei = v42Idx_(emp.headers), en = {};
  emp.rows.forEach(function(r){
    en[v42Val_(r, ei, 'employeeId')] = [v42Val_(r, ei, 'الاسم'), v42Val_(r, ei, 'الرقم_القومي')];
  });

  var f = v24Data_('08_الماليات'), fi = v42Idx_(f.headers);
  f.rows.forEach(function(r){
    if(Number(v42Val_(r, fi, 'السنة')) !== year || Number(v42Val_(r, fi, 'الشهر')) !== month) return;
    var sid = v42Val_(r, fi, 'schoolId');
    if(!validIds[sid]) return;
    var vals = {}, any = false;
    shown.forEach(function(t){
      var n = Number(String(v42Val_(r, fi, colMap[t])).replace(/,/g, '')) || 0;
      vals[t] = n; if(n) any = true; sums[t] += n;
    });
    if(!any) return;
    var e = en[v42Val_(r, fi, 'employeeId')] || ['—', '—'];
    rows.push({
      name: e[0],
      nationalId: e[1],
      schoolId: sid,
      school: validIds[sid] || sid,
      values: vals,
      status: v42Val_(r, fi, 'حالة_الاعتماد') || v42Val_(r, fi, 'حالة_الحساب')
    });
  });

  // معلمو الحصة والمعاش
  var hourly = {rows: [], total: 0};
  try {
    var hp = v24Data_('05_معلمو_الحصة_والمعاش'), hi = v42Idx_(hp.headers), hn = {};
    hp.rows.forEach(function(r){
      hn[v42Val_(r, hi, 'hrpId')] = [v42Val_(r, hi, 'الاسم'), v42Val_(r, hi, 'الرقم_القومي'), v42Val_(r, hi, 'نوع_الفئة')];
    });
    var hf = v24Data_('08_ماليات_معلمي_الحصة'), hfi = v42Idx_(hf.headers);
    hf.rows.forEach(function(r){
      if(Number(v42Val_(r, hfi, 'السنة')) !== year || Number(v42Val_(r, hfi, 'الشهر')) !== month) return;
      var sid = v42Val_(r, hfi, 'schoolId');
      if(!validIds[sid]) return;
      var e = hn[v42Val_(r, hfi, 'hrpId')] || ['—', '—', '—'], val = Number(String(v42Val_(r, hfi, 'القيمة')).replace(/,/g, '')) || 0;
      hourly.total += val;
      hourly.rows.push({
        name: e[0],
        nationalId: e[1],
        category: e[2] || v42Val_(r, hfi, 'نوع_الفئة'),
        schoolId: sid,
        school: validIds[sid] || sid,
        periods: v42Val_(r, hfi, 'إجمالي_الحصص_الفعلية'),
        value: val,
        status: v42Val_(r, hfi, 'حالة_الاعتماد') || v42Val_(r, hfi, 'حالة_الحساب')
      });
    });
  } catch(eH){}

  return {
    success: true,
    year: year,
    month: month,
    months: (function(){ try { return v56MonthsForSchool_(); } catch(e){ return []; } })(),
    columns: shown,
    rows: rows,
    sums: sums,
    hourly: hourly
  };
}

/** تسجيل زائر لمدرسة محددة من مدارس التعليم المجتمعي */
function communitySaveVisitorV42(token, schoolId, date, visitor){
  communitySessionV42_(token);
  var commRes = communitySchoolsV42(token), schools = commRes.schools || [];
  var found = schools.filter(function(s){ return String(s.schoolId) === String(schoolId); })[0];
  if(!found) throw new Error('المدرسة المحددة غير مصرح بها للتعليم المجتمعي.');

  var p = v93SafeObj_(visitor || {});
  if(!p.name) throw new Error('حدد اسم الزائر.');
  var iso = routeV41Iso_(routeV41Date_(date));
  routeV41Ensure_();

  return v35Lock_(function(){
    var sh = personnelSS_().getSheetByName(ROUTE_V41.visitSheet), h = routeV41Header_(sh), i = routeV41Idx_(h);
    var lr = sh.getLastRow();
    if(lr > 1){
      var v = sh.getRange(2, 1, lr - 1, h.length).getDisplayValues();
      for(var r = 0; r < v.length; r++){
        if(v[r][i.schoolId] !== found.schoolId) continue;
        if((v35Date_(v[r][i['التاريخ']]) || v[r][i['التاريخ']]) !== iso) continue;
        var same = p.supervisorId ? (String(v[r][i.supervisorId]) === String(p.supervisorId)) : (!v[r][i.supervisorId] && v[r][i['اسم_الزائر']] === p.name);
        if(same) return {success: true, message: 'الزيارة مسجلة بالفعل.', already: true};
      }
    }
    var row = new Array(h.length).fill('');
    function put(k, val){ if(i[k] != null) row[i[k]] = val || ''; }
    put('visitId', 'VIS_' + Utilities.getUuid().replace(/-/g, '').slice(0, 20));
    put('schoolId', found.schoolId);
    put('التاريخ', iso);
    put('supervisorId', p.supervisorId || '');
    put('employeeId', p.employeeId || '');
    put('اسم_الزائر', p.name);
    put('الوظيفة', p.job || '');
    put('المادة_أو_القسم', p.subject || '');
    put('مصدر_الزائر', p.source || 'تعليم مجتمعي');
    put('المستخدم', 'التعليم_المجتمعي');
    put('وقت_التسجيل', new Date());
    put('ملاحظات', p.notes || '');
    v50A_(sh.appendRow(row));
    return {success: true, message: 'تم تسجيل الزيارة بنجاح للمدرسة: ' + found.name};
  });
}

/* ========================= الأدمن ========================= */
function adminSetEmployeePermissionV42(token,payload){
  var a=v35Admin_(token);v42Ready_();var p=payload||{},eid=String(p.employeeId||'').trim(),perm=String(p.permission||'').trim();
  if(!eid||V42_PERMISSIONS.indexOf(perm)<0)throw new Error('حدد الموظف والصلاحية.');
  var scope=String(p.scope||'كل المدارس').trim(),details=p.detailsObj||null;
  if(perm==='مالية'){
    var financeScopes=['كل المدارس','مدارس محددة','المرحلة','كل القطاعات','قطاعات محددة'];
    if(financeScopes.indexOf(scope)<0)throw new Error('نطاق صلاحية مالية غير معتمد.');
    if(scope==='قطاعات محددة'){
      var selected=details&&Array.isArray(details.sectors)?details.sectors:[],valid=v109SectorOptions_();
      if(!selected.length||selected.some(function(x){return valid.indexOf(String(x))<0;}))throw new Error('اختر قطاعًا واحدًا على الأقل من قائمة القطاعات المعتمدة.');
      details.sectors=valid.filter(function(x){return selected.indexOf(x)>=0;});
    }
  }
  var det=details?JSON.stringify(details):String(p.details||''),P=v42PermRows_(),n=-1;
  for(var r=0;r<P.v.length;r++)if(v42Val_(P.v[r],P.i,'employeeId')===eid&&v42Val_(P.v[r],P.i,'الصلاحية')===perm){n=r;break;}
  var row=n>=0?P.v[n].slice():new Array(P.h.length).fill('');
  var old=n>=0?{scope:row[P.i['النطاق']],details:row[P.i['التفاصيل']],status:row[P.i['الحالة']]}:null;
  row[P.i.permissionId]=row[P.i.permissionId]||v42Id_('PERM_');row[P.i.employeeId]=eid;row[P.i['الصلاحية']]=perm;row[P.i['النطاق']]=scope;row[P.i['التفاصيل']]=det;row[P.i['الحالة']]=p.status==='موقوف'?'موقوف':'فعال';row[P.i['منحها_بواسطة']]=a.username;row[P.i['تاريخ_المنح']]=new Date();
  if(n>=0)v50A_(P.sh.getRange(n+2,1,1,P.h.length).setValues([row]));else v50A_(P.sh.appendRow(row));
  V42_PERM_CACHE_=null;v42Audit_(eid,n>=0?'تعديل صلاحية':'منح صلاحية',old,{permission:perm,scope:scope,details:det,status:row[P.i['الحالة']]},a.username);
  return{success:true,message:'تم حفظ الصلاحية.'};
}
function adminSetPermissionStatusV42(token,permissionId,status){var a=v35Admin_(token),P=v42PermRows_();for(var r=0;r<P.v.length;r++)if(v42Val_(P.v[r],P.i,'permissionId')===String(permissionId)){var st=status==='موقوف'?'موقوف':'فعال';v50A_(P.sh.getRange(r+2,P.i['الحالة']+1).setValue(st));v42Audit_(v42Val_(P.v[r],P.i,'employeeId'),'تغيير حالة صلاحية',v42Val_(P.v[r],P.i,'الحالة'),st+' — '+v42Val_(P.v[r],P.i,'الصلاحية'),a.username);V42_PERM_CACHE_=null;return{success:true,message:'تم تحديث حالة الصلاحية.'};}throw new Error('الصلاحية غير موجودة.');}
/** الأدمن يحدد: نوع التعليم / الوظيفة الإشرافية / القسم / مادة الإشراف / مشرف على المادة. */
function adminSetEmployeeClassV42(token,employeeId,payload){var a=v35Admin_(token);v42Ready_();var sh=personnelSS_().getSheetByName('01_الأساسي'),h=v42Header_(sh),i=v42Idx_(h),ids=sh.getRange(2,i.employeeId+1,sh.getLastRow()-1,1).getDisplayValues(),row=-1;for(var r=0;r<ids.length;r++)if(String(ids[r][0]).trim()===String(employeeId)){row=r+2;break;}if(row<2)throw new Error('الموظف غير موجود.');var p=payload||{},cur=sh.getRange(row,1,1,h.length).getValues()[0],old={},nw={};function set(k,v,allowed){if(v===undefined||i[k]==null)return;v=String(v==null?'':v).trim();if(allowed&&v&&allowed.indexOf(v)<0)throw new Error('قيمة غير مسموحة في '+k+': '+v);if(String(cur[i[k]]==null?'':cur[i[k]]).trim()!==v){old[k]=cur[i[k]];nw[k]=v;cur[i[k]]=v;}}set('نوع التعليم',p.educationType,V42_EDU_TYPES);set('الوظيفة_الإشرافية',p.supervisoryJob,null);set('القسم',p.department,null);set('مادة_التدريس',p.subject===undefined?undefined:subjectCanonV44_(p.subject),null);set('مشرف_على_المادة',p.isSubjectSupervisor,['نعم','لا']);if(!Object.keys(nw).length)return{success:true,message:'لا توجد تغييرات.'};v50A_(sh.getRange(row,1,1,h.length).setValues([cur]));v42Audit_(employeeId,'تعديل تصنيف الموظف',old,nw,a.username);if(v42IsSupervisorJob_(nw['الوظيفة_الإشرافية']))v42EnsurePermission_(String(employeeId),'خط السير','كل المدارس','');return{success:true,message:'تم حفظ تصنيف الموظف.'};}
function adminToggleDepartmentV42(token,departmentId,status){var a=v35Admin_(token),sh=v42Sheet_(V42_TABLES.depts),i=v42Idx_(v42Header_(sh)),v=v42Values_(sh);for(var r=0;r<v.length;r++)if(String(v[r][i.departmentId])===String(departmentId)){v50A_(sh.getRange(r+2,i['الحالة']+1).setValue(status==='موقوف'?'موقوف':'فعال'));v42Audit_('','حالة قسم',v[r][i['اسم_القسم']],status,a.username);return{success:true,message:'تم تحديث حالة القسم.'};}throw new Error('القسم غير موجود.');}
function adminAddDepartmentV42(token,name,type){var a=v35Admin_(token);v42Ready_();name=String(name||'').trim();type=['مرحلة','إداري','فني','خدمات وأنشطة'].indexOf(type)>=0?type:'إداري';if(name.length<2)throw new Error('اكتب اسم القسم.');var sh=v42Sheet_(V42_TABLES.depts),h=v42Header_(sh),i=v42Idx_(h),v=v42Values_(sh);if(v.some(function(r){return v42Val_(r,i,'اسم_القسم')===name;}))throw new Error('القسم موجود بالفعل.');var row=new Array(h.length).fill('');row[i.departmentId]=v42Id_('DEP_');row[i['اسم_القسم']]=name;row[i['نوع_القسم']]=type;row[i['الحالة']]='فعال';row[i['ترتيب']]=v.length+1;v50A_(sh.appendRow(row));v42Audit_('','إضافة قسم','',name,a.username);return{success:true,message:'تمت إضافة القسم.'};}
/** الحذف مسموح فقط لو القسم غير مستخدم؛ غير ذلك يُعطّل للحفاظ على البيانات التاريخية. */
function adminDeleteDepartmentV42(token,departmentId){var a=v35Admin_(token),sh=v42Sheet_(V42_TABLES.depts),i=v42Idx_(v42Header_(sh)),v=v42Values_(sh);for(var r=0;r<v.length;r++)if(String(v[r][i.departmentId])===String(departmentId)){var name=v42Val_(v[r],i,'اسم_القسم'),d=v24Data_('01_الأساسي'),ei=v42Idx_(d.headers),used=d.rows.filter(function(x){return v42Val_(x,ei,'القسم')===name;}).length;if(used)throw new Error('لا يمكن حذف «'+name+'» لأنه مستخدم لـ '+used+' موظف. استخدم التعطيل بدلًا من الحذف.');v50A_(sh.deleteRow(r+2));v42Audit_('','حذف قسم',name,'',a.username);return{success:true,message:'تم حذف القسم.'};}throw new Error('القسم غير موجود.');}
function adminToggleSubjectV42(token,subjectId,status){var a=v35Admin_(token),sh=personnelSS_().getSheetByName('R_المواد');if(!sh)throw new Error('R_المواد غير موجود.');var i=v42Idx_(v42Header_(sh)),v=v42Values_(sh);for(var r=0;r<v.length;r++)if(String(v[r][i.subjectId])===String(subjectId)){var col=i['الحالة']!=null?i['الحالة']:2;v50A_(sh.getRange(r+2,col+1).setValue(status==='موقوف'?'موقوف':'فعال'));v42Audit_('','حالة مادة',v[r][i['اسم_المادة']],status,a.username);return{success:true,message:'تم تحديث حالة المادة.'};}throw new Error('المادة غير موجودة.');}
function adminAddSubjectV42(token,name,stage){var a=v35Admin_(token),sh=personnelSS_().getSheetByName('R_المواد');if(!sh)throw new Error('R_المواد غير موجود.');name=String(name||'').trim();stage=String(stage||'').trim();if(name.length<2)throw new Error('اكتب اسم المادة.');var h=v42Header_(sh);if(h.indexOf('المرحلة')<0){v50A_(sh.getRange(1,h.length+1).setValue('المرحلة'));h=v42Header_(sh);}var i=v42Idx_(h),v=v42Values_(sh);var nk=subjectNormV44_(name).replace(/^ال/,'');if(v.some(function(r){return subjectNormV44_(v42Val_(r,i,'اسم_المادة')).replace(/^ال/,'')===nk;}))throw new Error('المادة «'+name+'» موجودة بالفعل في R_المواد.');var max=0;v.forEach(function(r){var n=Number(String(r[i.subjectId]).replace(/\D/g,''))||0;if(n>max)max=n;});var row=new Array(h.length).fill('');row[i.subjectId]='SUB_'+('00'+(max+1)).slice(-3);row[i['اسم_المادة']]=name;row[i['الحالة']]='فعال';row[i['المرحلة']]=stage;v50A_(sh.appendRow(row));v42Audit_('','إضافة مادة','',name+(stage?' — '+stage:''),a.username);return{success:true,message:'تمت إضافة المادة.'};}
function adminDeleteSubjectV42(token,subjectId){var a=v35Admin_(token),sh=personnelSS_().getSheetByName('R_المواد');if(!sh)throw new Error('R_المواد غير موجود.');var i=v42Idx_(v42Header_(sh)),v=v42Values_(sh);for(var r=0;r<v.length;r++)if(String(v[r][i.subjectId])===String(subjectId)){var name=v42Val_(v[r],i,'اسم_المادة'),same=v.filter(function(x){return v42Val_(x,i,'اسم_المادة')===name;}).length,d=v24Data_('01_الأساسي'),ei=v42Idx_(d.headers),used=same>1?0:d.rows.filter(function(x){return v42Val_(x,ei,'مادة_التدريس')===name;}).length;if(used)throw new Error('لا يمكن حذف «'+name+'» لأنها مسجلة لـ '+used+' موظف. استخدم التعطيل.');v50A_(sh.deleteRow(r+2));v42Audit_('','حذف مادة',name,'',a.username);return{success:true,message:'تم حذف المادة.'};}throw new Error('المادة غير موجودة.');}
function adminSetEditSectionV42(token,sectionName,status){var a=v35Admin_(token);v42Ready_();var sh=v42Sheet_(V42_TABLES.edit),i=v42Idx_(v42Header_(sh)),v=v42Values_(sh);for(var r=0;r<v.length;r++)if(String(v[r][i['اسم_القسم']])===String(sectionName)){v50A_(sh.getRange(r+2,i['الحالة']+1).setValue(status==='موقوف'?'موقوف':'فعال'));v42Audit_('','قسم تعديل البيانات',sectionName,status,a.username);return{success:true,message:'تم تحديث قسم التعديل.'};}throw new Error('قسم البيانات غير موجود.');}
function adminSaveFileTypeV42(token,payload){var a=v35Admin_(token);v42Ready_();var p=payload||{},name=String(p.name||'').trim(),folder=String(p.folderId||'').trim();var m=folder.match(/folders\/([A-Za-z0-9_-]+)/);if(m)folder=m[1];if(!name)throw new Error('اكتب نوع الملف.');if(folder){try{DriveApp.getFolderById(folder).getName();}catch(e){throw new Error('معرّف المجلد غير صحيح أو لا يمكن الوصول إليه.');}}var sh=v42Sheet_(V42_TABLES.files),h=v42Header_(sh),i=v42Idx_(h),v=v42Values_(sh),n=-1;for(var r=0;r<v.length;r++)if(v42Val_(v[r],i,'fileTypeId')===String(p.id||'')||v42Val_(v[r],i,'نوع_الملف')===name){n=r;break;}var row=n>=0?v[n].slice():new Array(h.length).fill('');row[i.fileTypeId]=row[i.fileTypeId]||v42Id_('FT_');row[i['نوع_الملف']]=name;row[i.FolderId]=folder;row[i['الحالة']]=p.status==='موقوف'?'موقوف':'فعال';if(n>=0)v50A_(sh.getRange(n+2,1,1,h.length).setValues([row]));else{row[i['ترتيب']]=v.length+1;v50A_(sh.appendRow(row));}v42Audit_('','نوع ملف',name,folder,a.username);return{success:true,message:'تم حفظ نوع الملف.'};}
function adminEmployeeSearchV42(token,q){v35Admin_(token);v42Ready_();q=String(q||'').trim();var qd=v24DigitsLocalV31_(q);var d=v24Data_('01_الأساسي'),i=v42Idx_(d.headers),out=[];for(var n=0;n<d.rows.length&&out.length<50;n++){var r=d.rows[n],nid=v24DigitsLocalV31_(v42Val_(r,i,'الرقم_القومي')),name=v42Val_(r,i,'الاسم');if(!q||(qd&&qd.length>=4&&nid.indexOf(qd)>=0)||name.indexOf(q)>=0){var eid=v42Val_(r,i,'employeeId');out.push({employeeId:eid,nationalId:nid,name:name,job:v42Val_(r,i,'المسمى_الوظيفي'),supervisoryJob:v42Val_(r,i,'الوظيفة_الإشرافية'),department:v42Val_(r,i,'القسم'),educationType:v42Val_(r,i,'نوع التعليم'),subject:v42Val_(r,i,'مادة_التدريس'),isSubjectSupervisor:v42Val_(r,i,'مشرف_على_المادة'),permissions:v42AllPermissions_(eid)});}}return{success:true,rows:out};}
function adminReferenceV42(token){v35Admin_(token);v42Ready_();var ss=personnelSS_();var ds=v42Sheet_(V42_TABLES.depts),di=v42Idx_(v42Header_(ds));var departments=v42Values_(ds).map(function(r){return{id:v42Val_(r,di,'departmentId'),name:v42Val_(r,di,'اسم_القسم'),type:v42Val_(r,di,'نوع_القسم'),status:v42Val_(r,di,'الحالة')||'فعال'};});var subjects=[];var ssh=ss.getSheetByName('R_المواد');if(ssh){var si=v42Idx_(v42Header_(ssh));subjects=v42Values_(ssh).filter(function(r){return v42Val_(r,si,'subjectId');}).map(function(r){return{id:v42Val_(r,si,'subjectId'),name:v42Val_(r,si,'اسم_المادة'),stage:v42Val_(r,si,'المرحلة'),status:v42Val_(r,si,'الحالة')||'فعال'};});}var es=v42Sheet_(V42_TABLES.edit),ei=v42Idx_(v42Header_(es));var editSections=v42Values_(es).map(function(r){return{name:v42Val_(r,ei,'اسم_القسم'),status:v42Val_(r,ei,'الحالة')||'فعال'};});var fs=v42Sheet_(V42_TABLES.files),fi=v42Idx_(v42Header_(fs));var fileTypes=v42Values_(fs).map(function(r){var nm=v42Val_(r,fi,'نوع_الملف');return{id:v42Val_(r,fi,'fileTypeId'),name:nm,folderId:v42Val_(r,fi,'FolderId'),generated:nm==='الملف الوظيفي'||nm==='تقرير المستحقات الشهرية',status:v42Val_(r,fi,'الحالة')||'فعال'};});var jobs=[];var js=ss.getSheetByName('R_الوظائف_الإشرافية');if(js){var ji=v42Idx_(v42Header_(js));jobs=v42Values_(js).filter(function(r){return v42Val_(r,ji,'الحالة')!=='موقوف';}).map(function(r){return v42Val_(r,ji,'الوظيفة_الإشرافية');}).filter(Boolean);}V42_SUP_JOBS.forEach(function(j){if(jobs.indexOf(j)<0)jobs.push(j);});var schools=[];try{schools=listPersonnelSchoolsV241_().map(function(s){return{id:s.schoolId,name:s.name||s.schoolName||s['اسم_المدرسة']||s.schoolId};});}catch(e){var nm=v42SchoolNames_();schools=Object.keys(nm).map(function(k){return{id:k,name:nm[k]};});}var ent=v42Sheet_(V42_TABLES.entities),eni=v42Idx_(v42Header_(ent));var entities=v42Values_(ent).map(function(r){return{id:v42Val_(r,eni,'entityId'),name:v42Val_(r,eni,'اسم_الجهة'),type:v42Val_(r,eni,'نوع_الجهة'),username:v42Val_(r,eni,'username'),status:v42Val_(r,eni,'status')};});return{success:true,departments:departments,subjects:subjects,jobs:jobs,permissions:V42_PERMISSIONS,finTypes:V42_FIN_TYPES,eduTypes:V42_EDU_TYPES,stages:['رياض أطفال','ابتدائي','إعدادي','ثانوي','ثانوي فني'],editSections:editSections,fileTypes:fileTypes,schools:schools,entities:entities};}
function adminSetStaffAccountStatusV42(token,nationalId,status){var a=v35Admin_(token),nid=v24DigitsLocalV31_(nationalId),sh=personnelSS_().getSheetByName('R_المستخدمون'),i=v42Idx_(v42Header_(sh)),v=v42Values_(sh);for(var r=0;r<v.length;r++)if(v24DigitsLocalV31_(v[r][i.username])===nid&&v42Val_(v[r],i,'role')!=='admin'){v50A_(sh.getRange(r+2,i.status+1).setValue(status==='موقوف'?'موقوف':'فعال'));v42Audit_('','حالة حساب',nid,status,a.username);return{success:true,message:'تم تحديث حالة الحساب.'};}throw new Error('حساب الموظف غير موجود. استخدم إنشاء الحساب أولًا.');}
/** ينشئ الحساب أو يعيد تفعيله. لا يغيّر دور الحساب لو كان موجهًا حتى لا يتعطل دخول الموجه الحالي. */
function adminProvisionStaffAccountV42(token,nationalId){var a=v35Admin_(token);v42Ready_();var nid=v24DigitsLocalV31_(nationalId),b=v42FindBasicByNid_(nid);if(!b)throw new Error('الموظف غير موجود في 01_الأساسي.');var us=personnelSS_().getSheetByName('R_المستخدمون'),h=v42Header_(us),i=v42Idx_(h),v=v42Values_(us);for(var r=0;r<v.length;r++)if(v24DigitsLocalV31_(v[r][i.username])===nid){if(v42Val_(v[r],i,'role')==='admin')throw new Error('هذا الرقم مسجل كحساب إدارة.');v50A_(us.getRange(r+2,i.password+1).setValue(V42_DEFAULT_PASSWORD));v50A_(us.getRange(r+2,i.status+1).setValue('فعال'));if(!v42Val_(v[r],i,'role'))v50A_(us.getRange(r+2,i.role+1).setValue('موظف'));v42Audit_(v42Val_(b.row,b.idx,'employeeId'),'إعادة تفعيل حساب',v42Val_(v[r],i,'status'),'فعال',a.username);return{success:true,message:'تم تفعيل الحساب وإعادة كلمة المرور إلى 123456.'};}var row=new Array(h.length).fill('');row[i.userId]=v42Id_('USR_');row[i.username]=nid;row[i.password]=V42_DEFAULT_PASSWORD;row[i.name]=v42Val_(b.row,b.idx,'الاسم');row[i.role]=v42AccountRole_(b.row,b.idx);row[i.status]='فعال';v50A_(us.appendRow(row));v42Audit_(v42Val_(b.row,b.idx,'employeeId'),'إنشاء حساب','',row[i.role],a.username);return{success:true,message:'تم إنشاء حساب الموظف بكلمة المرور 123456.'};}
function adminCreateAllStaffAccountsV42(token){v35Admin_(token);v42Ready_();var us=personnelSS_().getSheetByName('R_المستخدمون'),uh=v42Header_(us),ui=v42Idx_(uh),known={};v42Values_(us).forEach(function(r){if(r[ui.username])known[v24DigitsLocalV31_(r[ui.username])||r[ui.username]]=1;});var d=v24Data_('01_الأساسي'),ei=v42Idx_(d.headers),add=[];d.rows.forEach(function(r){var nid=v24DigitsLocalV31_(v42Val_(r,ei,'الرقم_القومي'));if(!nid||nid.length!==14||known[nid]||v42Val_(r,ei,'حالة_السجل')==='موقوف')return;var row=new Array(uh.length).fill('');row[ui.userId]=v42Id_('USR_');row[ui.username]=nid;row[ui.password]=V42_DEFAULT_PASSWORD;row[ui.name]=v42Val_(r,ei,'الاسم');row[ui.role]=v42AccountRole_(r,ei);row[ui.status]='فعال';add.push(row);known[nid]=1;});if(add.length)v50A_(us.getRange(us.getLastRow()+1,1,add.length,uh.length).setValues(add));return{success:true,created:add.length,message:'تم إنشاء '+add.length+' حساب جديد بكلمة المرور 123456.'};}
function adminSaveEntityAccountV42(token,payload){var a=v35Admin_(token);v42Ready_();var p=payload||{},name=String(p.name||'').trim(),type=p.type==='تعليم مجتمعي'?'تعليم مجتمعي':'مدارس خاص',user=String(p.username||'').trim(),pw=String(p.password||'').trim();if(!name||!user)throw new Error('اكتب اسم الجهة واسم المستخدم.');var sh=v42Sheet_(V42_TABLES.entities),h=v42Header_(sh),i=v42Idx_(h),v=v42Values_(sh),n=-1;for(var r=0;r<v.length;r++){if(v42Val_(v[r],i,'entityId')===String(p.id||'')){n=r;break;}}if(v.some(function(r,k){return k!==n&&v42Val_(r,i,'username')===user;}))throw new Error('اسم المستخدم مستخدم لجهة أخرى.');var row=n>=0?v[n].slice():new Array(h.length).fill('');if(n<0&&pw.length<4)throw new Error('كلمة المرور 4 خانات على الأقل.');row[i.entityId]=row[i.entityId]||v42Id_('ENT_');row[i['اسم_الجهة']]=name;row[i['نوع_الجهة']]=type;row[i.username]=user;if(pw)row[i.password]=pw;row[i.schoolId]=row[i.schoolId]||(type==='مدارس خاص'?v42Id_('PRV_'):'');row[i.status]=p.status==='موقوف'?'موقوف':'فعال';if(n>=0)v50A_(sh.getRange(n+2,1,1,h.length).setValues([row]));else v50A_(sh.appendRow(row));v42Audit_('','حساب جهة',name,type+' — '+row[i.status],a.username);return{success:true,message:'تم حفظ حساب الجهة.'};}


/* ===================== V4.8 — حساب ديوان الإدارة =====================
 * مسئول الديوان يدخل من «دخول المدارس والجهات» ويعدّل بيانات العاملين بالديوان (نوع التعليم = ديوان)،
 * وخاصة الوظيفة الإشرافية والقسم ومادة الإشراف. كل تعديل يُسجَّل في سجل الصلاحيات.
 */
var V48_DIWAN_FIELDS = ['الوظيفة_الإشرافية','القسم','مادة_التدريس','مشرف_على_المادة','الهاتف','العنوان','البريد'];
function diwanLoginV48Core_(username, password) {
  v42Ready_();
  var sh = v42Sheet_(V42_TABLES.entities), i = v42Idx_(v42Header_(sh)), v = v42Values_(sh);
  for (var r = 0; r < v.length; r++) if (v42Val_(v[r], i, 'نوع_الجهة') === 'ديوان' && v42Val_(v[r], i, 'username') === String(username || '').trim() && v42Val_(v[r], i, 'password') === String(password || '') && v42Val_(v[r], i, 'status') === 'فعال') {
    var t = Utilities.getUuid().replace(/-/g, ''), u = { role: 'ديوان', username: v42Val_(v[r], i, 'username'), name: v42Val_(v[r], i, 'اسم_الجهة') };
    v42PutSession_(t, u); return { success: true, token: t, user: u };
  }
  return { success: false, message: 'بيانات دخول الديوان غير صحيحة.' };
}
function diwanSessionV48_(token) { var s = v42Session_(token); if (s.role !== 'ديوان') throw new Error('جلسة الديوان غير صالحة.'); return s; }
function diwanRefsV48_() {
  var ss = personnelSS_(), jobs = [], depts = [];
  var js = ss.getSheetByName('R_الوظائف_الإشرافية'); if (js) { var ji = v42Idx_(v42Header_(js)); jobs = v42Values_(js).filter(function (r) { return v42Val_(r, ji, 'الحالة') !== 'موقوف'; }).map(function (r) { return v42Val_(r, ji, 'الوظيفة_الإشرافية'); }).filter(Boolean); }
  V42_SUP_JOBS.forEach(function (j) { if (jobs.indexOf(j) < 0) jobs.push(j); });
  jobs = jobs.filter(function (j) { return !/مدرسة/.test(j); });
  var ds = v42Sheet_(V42_TABLES.depts), di = v42Idx_(v42Header_(ds)); depts = v42Values_(ds).filter(function (r) { return v42Val_(r, di, 'الحالة') !== 'موقوف'; }).map(function (r) { return v42Val_(r, di, 'اسم_القسم'); });
  return { jobs: jobs, departments: depts, subjects: typeof subjectListV44_ === 'function' ? subjectListV44_() : [] };
}
function diwanWorkersV48(token) {
  diwanSessionV48_(token);
  var d = v24Data_('01_الأساسي'), i = v42Idx_(d.headers);
  var rows = d.rows.filter(function (r) { return v42Val_(r, i, 'نوع التعليم') === 'ديوان'; }).map(function (r) {
    var o = { employeeId: v42Val_(r, i, 'employeeId'), name: v42Val_(r, i, 'الاسم'), nationalId: v42Val_(r, i, 'الرقم_القومي'), job: v42Val_(r, i, 'المسمى_الوظيفي'), status: v42Val_(r, i, 'حالة_السجل') };
    V48_DIWAN_FIELDS.forEach(function (k) { o[k] = v42Val_(r, i, k); }); return o;
  }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); });
  var refs = diwanRefsV48_(); refs.success = true; refs.rows = rows; return refs;
}
function diwanSaveWorkerV48(token, employeeId, payload) {
  var s = diwanSessionV48_(token), p = payload || {}, refs = diwanRefsV48_();
  var sh = personnelSS_().getSheetByName('01_الأساسي'), h = v42Header_(sh), i = v42Idx_(h);
  var ids = sh.getRange(2, i.employeeId + 1, sh.getLastRow() - 1, 1).getDisplayValues(), row = -1;
  for (var r = 0; r < ids.length; r++) if (String(ids[r][0]).trim() === String(employeeId)) { row = r + 2; break; }
  if (row < 2) throw new Error('الموظف غير موجود.');
  var cur = sh.getRange(row, 1, 1, h.length).getValues()[0];
  if (String(cur[i['نوع التعليم']] || '').trim() !== 'ديوان') throw new Error('هذا الموظف ليس من العاملين بالديوان.');
  if (p['الوظيفة_الإشرافية'] && refs.jobs.indexOf(p['الوظيفة_الإشرافية']) < 0) throw new Error('وظيفة إشرافية غير مسموحة.');
  if (p['القسم'] && refs.departments.indexOf(p['القسم']) < 0) throw new Error('قسم غير موجود في قائمة الأقسام.');
  if (p['مشرف_على_المادة'] && ['نعم', 'لا'].indexOf(p['مشرف_على_المادة']) < 0) throw new Error('مشرف على المادة: نعم أو لا.');
  if (p['مادة_التدريس'] !== undefined) p['مادة_التدريس'] = subjectCanonV44_(p['مادة_التدريس']);
  if (p['الهاتف'] !== undefined) { p['الهاتف'] = v24DigitsLocalV31_(p['الهاتف']); if (p['الهاتف'] && !/^\d{8,15}$/.test(p['الهاتف'])) throw new Error('رقم الهاتف غير صحيح.'); }
  var old = {}, nw = {};
  V48_DIWAN_FIELDS.forEach(function (k) { if (p[k] === undefined || i[k] == null) return; var v = String(p[k] == null ? '' : p[k]).trim(); if (String(cur[i[k]] == null ? '' : cur[i[k]]).trim() !== v) { old[k] = cur[i[k]]; nw[k] = v; cur[i[k]] = v; } });
  if (!Object.keys(nw).length) return { success: true, message: 'لا توجد تعديلات.' };
  var job = String(cur[i['الوظيفة_الإشرافية']] || '').trim();
  if (v42IsSupervisorJob_(job) && i['حالة_التوجيه'] != null && String(cur[i['حالة_التوجيه']] || '').trim() !== 'نشط') cur[i['حالة_التوجيه']] = 'نشط';
  v50A_(sh.getRange(row, 1, 1, h.length).setValues([cur]));
  if (v42IsSupervisorJob_(job)) v42EnsurePermission_(String(employeeId), 'خط السير', 'كل المدارس', '');
  v42Audit_(String(employeeId), 'تعديل من حساب الديوان', old, nw, s.username);
  return { success: true, message: 'تم حفظ ' + Object.keys(nw).length + ' تعديل.' };
}
