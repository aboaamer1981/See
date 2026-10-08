/** V2.6 — لوحة إدارة شئون العاملين: واجهة تشغيلية موسعة */
function getAdminDashboardV26_(){
  var ss=personnelSS_();
  function sh(n){return ss.getSheetByName(n)}
  function count(n){var s=sh(n);return s?Math.max(0,s.getLastRow()-1):0;}
  var schools=listPersonnelSchoolsV241_();
  var rel=v24Data_('04_علاقات_المدارس').rows;
  var emp=v24Data_('01_الأساسي').rows;
  var openConf=0, resolvedConf=0, dupConf=0;
  var cs=sh('11_سجل_التعارضات');
  if(cs&&cs.getLastRow()>1){var cd=v24Data_('11_سجل_التعارضات'), si=cd.headers.indexOf('الحالة');cd.rows.forEach(function(r){if(!r.some(function(x){return String(x).trim()!=='';}))return;var st=si>=0?r[si]:''; if(st==='مفتوح')openConf++; else if(st==='مكرر')dupConf++; else resolvedConf++;});}
  var work={};rel.forEach(function(r){if(r[2])work[r[2]]=(work[r[2]]||0)+1;});
  schools.sort(function(a,b){return (work[b.schoolId]||0)-(work[a.schoolId]||0);});
  return {basic:emp.filter(function(r){return r.some(function(x){return String(x).trim()!=='';});}).length,hourly:count('02_الحصة'),schools:schools.length,relations:rel.length,qualifications:count('05_المؤهلات'),movements:count('06_حركة_العامل'),monthly:count('07_البيانات_الشهرية'),finance:count('08_الماليات'),openConflicts:openConf,resolvedConflicts:resolvedConf,duplicateConflicts:dupConf,topSchools:schools.slice(0,8).map(function(s){return {name:s.name,count:work[s.schoolId]||0,schoolId:s.schoolId};})};
}
/** V2.9: كان هذا يقرأ 18_بيانات_المدارس بترتيب أعمدة 03_المدارس،
 *  بينما ترتيب الورقتين مختلف (في 18 الاسم في العمود 3 والكود في العمود 2).
 *  النتيجة كانت بطاقة مدرسة بحقول مزاحة بالكامل. الآن القراءة بالعناوين. */
function getSchoolStagesV26_(schoolId){
  schoolId=String(schoolId||'').trim();
  if(!schoolId)return null;
  var all=listPersonnelSchoolsV241_();
  for(var i=0;i<all.length;i++) if(String(all[i].schoolId).trim()===schoolId) return all[i];
  return null; // V5.3.1: 18_بيانات_المدارس هو المصدر الوحيد للمدارس
}
function getAdminSchoolBundleV26_(schoolId){
  var info=getSchoolStagesV26_(schoolId);if(!info)throw new Error('المدرسة غير موجودة');
  return {school:info,relations:listSchoolRelationsV25_(schoolId)};
}
