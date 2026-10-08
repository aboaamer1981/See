/** V2.7.4 — بوابة المدرسة مستقلة عن app4 بعد الهجرة
 * app4 = مصدر هجرة مؤقت فقط.
 * بعد initializeV274FromApp4 لا توجد أي قراءة من app4 أثناء التشغيل.
 */
var V271_USERS_SHEET='R_المستخدمون';
var V271_FEATURES_SHEET='R_الصلاحيات';
var V271_SCHOOL_MASTER_SHEET='18_بيانات_المدارس';
var V271_USER_HEADERS=['userId','username','password','name','role','subject','schoolId','school','stage','status'];
function v271Ss_(){return personnelSS_();}
function v271Sheet_(n){return v271Ss_().getSheetByName(n);}
function v271Norm_(x){return String(x==null?'':x).trim().toLowerCase().replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ');}
/** V2.9 — قراءة R_المستخدمون بدون أي كتابة.
 *  المشكلة السابقة: getSchoolLoginOptionsV271 و loginSchoolV271 كانت تستدعي
 *  v271EnsureUsersSheet_ التي تمسح الورقة وتعيد كتابتها. هذا يعني عملية كتابة
 *  على قاعدة البيانات عند كل فتح لصفحة الدخول من أي زائر مجهول، وبطء واضح،
 *  واحتمال فقد بيانات إذا تغيّر ترتيب الأعمدة. الآن القراءة فقط.
 */
function v271ReadUsers_(){
  var sh=v271Sheet_(V271_USERS_SHEET);
  if(!sh) return {headers:V271_USER_HEADERS.slice(),rows:[],idx:v271UserIdx_(V271_USER_HEADERS)};
  var lr=sh.getLastRow(), lc=sh.getLastColumn();
  if(lr<1||lc<1) return {headers:V271_USER_HEADERS.slice(),rows:[],idx:v271UserIdx_(V271_USER_HEADERS)};
  var v=sh.getRange(1,1,lr,lc).getDisplayValues();
  var headers=(v[0]||[]).map(function(x){return String(x==null?'':x).trim();});
  var idx=v271UserIdx_(headers);
  return {headers:headers,rows:v.slice(1),idx:idx};
}
function v271UserIdx_(headers){
  var m={};headers.forEach(function(h,i){if(h)m[h]=i;});
  var fallback={userId:0,username:1,password:2,name:3,role:4,subject:5,schoolId:6,school:7,stage:8,status:9};
  Object.keys(fallback).forEach(function(k){if(m[k]==null)m[k]=fallback[k];});
  return m;
}
function v271Row_(r,idx){
  function g(k){var c=idx[k];return c==null?'':String(r[c]==null?'':r[c]).trim();}
  return {userId:g('userId'),username:g('username'),password:g('password'),name:g('name'),role:g('role'),
          subject:g('subject'),schoolId:g('schoolId'),school:g('school'),stage:g('stage'),status:g('status')||'فعال'};
}

var V271_MAP_CACHE_=null;


function v271BuildLocalSchoolMap_(){
  if(V271_MAP_CACHE_)return V271_MAP_CACHE_;
  var ss=v271Ss_(),out={};
  function addFrom(shName, nameCol, idCol, codeCol, stagesCols){
    var sh=ss.getSheetByName(shName);if(!sh||sh.getLastRow()<2)return;
    var last=Math.max(sh.getLastColumn(),Math.max.apply(null,[nameCol,idCol,codeCol].concat(stagesCols))+1);
    var v=sh.getRange(2,1,sh.getLastRow()-1,last).getDisplayValues();
    for(var i=0;i<v.length;i++){
      var name=String(v[i][nameCol]||'').trim();if(!name)continue;
      var k=v271Norm_(name);if(out[k]&&out[k].schoolId)continue;
      out[k]={schoolId:String(v[i][idCol]||''),name:name,code:String(v[i][codeCol]||''),stages:stagesCols.map(function(c){return v[i][c];}).filter(Boolean)};
    }
  }
  // 18_بيانات_المدارس = المصدر التشغيلي الأساسي؛ 03_المدارس = fallback legacy فقط عند غياب مدرسة من المصدر الأساسي.
  addFrom(V271_SCHOOL_MASTER_SHEET,2,0,1,[5,6,7]);
  addFrom('03_المدارس',1,0,2,[4,5,6]);
  V271_MAP_CACHE_=out;
  return out;
}


function getSchoolLoginOptionsV271(){
  var u=v271ReadUsers_();
  if(!u.rows.length) return {success:true,schools:[],source:'local',count:0,message:'لا توجد حسابات مدارس في R_المستخدمون.'};
  var seen={},out=[],map=v271BuildLocalSchoolMap_();
  for(var i=0;i<u.rows.length;i++){
    var x=v271Row_(u.rows[i],u.idx);
    if(x.role!=='مدرسة'||!x.school) continue;
    if(x.status==='موقوف') continue;
    if(String(x.school).trim()==='التعليم المجتمعي') continue;
    var k=v271Norm_(x.school); if(seen[k]) continue; seen[k]=1;
    out.push({name:x.school,schoolId:x.schoolId,stages:(map[k]&&map[k].stages)||[],status:x.status});
  }
  out.sort(function(a,b){return String(a.name).localeCompare(String(b.name),'ar');});
  return {success:true,schools:out,source:'local',count:out.length,
          unmapped:out.filter(function(z){return !z.schoolId;}).map(function(z){return z.name;})};
}

function v271UserForSchool_(school){
  var u=v271ReadUsers_(), n=v271Norm_(school);
  for(var i=0;i<u.rows.length;i++){
    var x=v271Row_(u.rows[i],u.idx);
    if(x.role==='مدرسة' && x.status!=='موقوف' && v271Norm_(x.school)===n) return x;
  }
  return null;
}
function loginSchoolV271(school,password){
  if(!v271Feature_('SCHOOL_LOGIN'))return{success:false,message:'🔒 دخول المدارس مغلق من الإدارة.'};
  school=String(school||'').trim();password=String(password==null?'':password).trim();if(!school||!password)return{success:false,message:'اختر المدرسة وأدخل كلمة المرور.'};var lk='s:'+school;if(v36LoginLocked_(lk))return{success:false,message:V36_LOCK_MSG};
  var u=v271UserForSchool_(school);if(!u||u.password!==password){v36LoginFail_(lk);return{success:false,message:'❌ بيانات الدخول غير صحيحة.'};}v36LoginOk_(lk);
  if(!u.schoolId)return{success:false,message:'المدرسة تحتاج ربطًا بسجل المدارس المحلي قبل الدخول.'};
  var token=Utilities.getUuid().replace(/-/g,'');CacheService.getScriptCache().put('V271_SES_'+token,JSON.stringify({role:'مدرسة',school:u.school,schoolId:u.schoolId,username:u.username,name:u.name,stage:u.stage}),21600);
  var map=v271BuildLocalSchoolMap_(),info=map[v271Norm_(school)]||{};
  return{success:true,user:{role:'مدرسة',school:u.school,schoolId:u.schoolId,name:u.name,username:u.username,stage:u.stage,stages:info.stages||[]},token:token};
}
function getSchoolSessionV271(token){var x=CacheService.getScriptCache().get('V271_SES_'+String(token||''));if(!x)return null;try{return JSON.parse(x);}catch(e){return null;}}
function logoutV271(token){if(token)CacheService.getScriptCache().remove('V271_SES_'+String(token));return true;}
function v271Feature_(key){
  var sh=v271Sheet_(V271_FEATURES_SHEET);if(sh&&sh.getLastRow()>1){var v=sh.getRange(2,1,sh.getLastRow()-1,4).getValues();for(var i=0;i<v.length;i++)if(String(v[i][0])===key)return v[i][3]!==false&&String(v[i][3]).toLowerCase()!=='false';}
  var p=PropertiesService.getScriptProperties().getProperty('FEATURE_'+key);return p===null?true:p!=='0';
}
function loginAdminV271(u,p){
  u=String(u||'').trim();p=String(p||'').trim();
  if(!u||!p)return{success:false,message:'أدخل اسم المستخدم وكلمة المرور.'};
  var lk='a:'+u;if(v36LoginLocked_(lk))return{success:false,message:V36_LOCK_MSG};
  var d=v271ReadUsers_();
  if(!d.rows.length)return{success:false,message:'لا توجد حسابات دخول محلية.'};
  for(var i=0;i<d.rows.length;i++){
    var x=v271Row_(d.rows[i],d.idx);
    if(x.role!=='admin'||x.status==='موقوف')continue;
    if(x.username!==u||x.password!==p)continue;
    v36LoginOk_(lk);var t=Utilities.getUuid().replace(/-/g,'');
    CacheService.getScriptCache().put('V271_SES_'+t,JSON.stringify({role:'admin',username:u,name:x.name}),21600);
    return{success:true,user:{role:'admin',username:u,name:x.name},token:t};
  }
  v36LoginFail_(lk);return{success:false,message:'بيانات دخول الإدارة غير صحيحة.'};
}
