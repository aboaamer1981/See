/** V7.31 — أمان وتشغيل تقني
 *  - قراءة قائمة العاملين بالفهرسة حسب أسماء الأعمدة بدل أرقام الأعمدة الثابتة.
 *  - لا يغيّر مخطط البيانات ولا يحذف أي سجل.
 *  - مسار إداري جديد بدل تعديل طبقة 17 الأساسية المجمدة.
 */
function listBasicWorkersV83_(q, schoolId){
  q=String(q||'').trim().toLowerCase(); schoolId=String(schoolId||'').trim();
  var emp=v24Data_('01_الأساسي'), rel=v24Data_('04_علاقات_المدارس');
  var ei=schoolV31Idx_(emp.headers), ri=schoolV31Idx_(rel.headers), allowed={};
  if(schoolId){ rel.rows.forEach(function(r){ if(String(schoolV31Val_(r,ri,'schoolId'))===schoolId && schoolV31Val_(r,ri,'employeeId')) allowed[String(schoolV31Val_(r,ri,'employeeId'))]=1; }); }
  function v(k,r){return schoolV31Val_(r,ei,k);}
  return emp.rows.filter(function(r){
    if(schoolId&&!allowed[String(v('employeeId',r))])return false;
    if(!q)return true;
    return r.join(' ').toLowerCase().indexOf(q)>=0;
  }).slice(0,200).map(function(r){return {
    employeeId:v('employeeId',r), nationalId:v('الرقم_القومي',r), name:v('الاسم',r),
    job:v('المسمى_الوظيفي',r), subject:v('مادة_التدريس',r), stage:v('المرحلة_التعليمية_الأصلية',r),
    workSystem:v('نظام_العمل',r), originalSchoolId:v('originalSchoolId',r), status:v('حالة_السجل',r)
  };});
}

function adminBasicWorkersV83(token,q,schoolId){
  requireAdminSessionV29_(token);
  return listBasicWorkersV83_(q,schoolId);
}

/** تدقيق مصدر المدارس: يعرض فقط المدارس الموجودة في 03 وغير الموجودة في 18، دون تغيير البيانات. */
function adminLegacySchoolSourceAuditV83(token){
  requireAdminSessionV29_(token);
  var ss=personnelSS_(), master=ss.getSheetByName('18_بيانات_المدارس'), legacy=ss.getSheetByName('03_المدارس');
  if(!master||!legacy) return {success:true,masterExists:!!master,legacyExists:!!legacy,onlyLegacy:[]};
  function map(sh,nameCandidates,idCandidates){
    var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0], ix=schoolV31Idx_(h), out={};
    var lr=sh.getLastRow(); if(lr<2)return out;
    sh.getRange(2,1,lr-1,sh.getLastColumn()).getDisplayValues().forEach(function(r){
      var n=''; nameCandidates.some(function(k){var x=schoolV31Val_(r,ix,k);if(x){n=x;return true;}return false;});
      if(n) out[v271Norm_(n)]={name:n,schoolId:idCandidates.map(function(k){return schoolV31Val_(r,ix,k);}).filter(Boolean)[0]||''};
    }); return out;
  }
  var m=map(master,['اسم_المدرسة','اسم المدرسة'],['schoolId']), l=map(legacy,['اسم_المدرسة','اسم المدرسة'],['schoolId']);
  var only=[];Object.keys(l).forEach(function(k){if(!m[k])only.push(l[k]);});
  return {success:true,masterCount:Object.keys(m).length,legacyCount:Object.keys(l).length,onlyLegacy:only};
}
