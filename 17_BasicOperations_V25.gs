/** V2.5 — تشغيل الأساسي والمدارس والعلاقات */
function listBasicWorkersV25_(q, schoolId){
  q=String(q||'').trim().toLowerCase(); schoolId=String(schoolId||'').trim();
  var emp=v24Data_('01_الأساسي'), rel=v24Data_('04_علاقات_المدارس');
  var allowed={}; if(schoolId){rel.rows.forEach(function(r){if(String(r[2])===schoolId&&r[1])allowed[String(r[1])]=1;});}
  return emp.rows.filter(function(r){
    if(schoolId&&!allowed[String(r[0])])return false;
    if(!q)return true;
    return r.join(' ').toLowerCase().indexOf(q)>=0;
  }).slice(0,200).map(function(r){return {employeeId:r[0],nationalId:r[1],name:r[3],job:r[16],subject:r[18],stage:r[19],workSystem:r[20],originalSchoolId:r[22],status:r[10]};});
}
function getBasicWorkerFullV25_(employeeId){
  var c=getPersonnelCardV24_(employeeId); if(!c.employee)return c;
  var r=c.employee.row;
  c.basic={headers:c.employee.headers,row:r};
  c.schoolRelations=c.relations.map(function(x){return {headers:x.headers,row:x.row};});
  c.result={employeeId:r[0],name:r[3],nationalId:r[1],job:r[16],subject:r[18],stage:r[19],workSystem:r[20],originalSchoolId:r[22],startDate:r[23],recordStatus:r[24],employmentStatus:r[10]};
  return c;
}
function listSchoolRelationsV25_(schoolId){
  var rel=v24Data_('04_علاقات_المدارس'), emp=v24Data_('01_الأساسي');
  var em={};emp.rows.forEach(function(r){em[r[0]]=r;});
  // V6.1: العلاقات النشطة لموظفين موجودين وقائمين فقط (كان يعرض المنتهية والعلاقات اليتيمة)
  return rel.rows.filter(function(r){var e=em[r[1]];return (!schoolId||String(r[2])===String(schoolId))&&e&&v36ActiveRel_(r[7])&&String(e[23]||'').trim()!=='غير قائم';}).map(function(r){var e=em[r[1]]||[];return {relationId:r[0],employeeId:r[1],schoolId:r[2],type:r[3],isOriginal:r[4],start:r[5],end:r[6],status:r[7],name:e[3]||'',nationalId:e[1]||'',job:e[16]||'',subject:e[18]||'',stage:e[19]||''};});
}
function getSchoolsWithCountsV25_(){
  var schools=listPersonnelSchoolsV241_(), rel=v24Data_('04_علاقات_المدارس'), c={};
  // V6.1: يُعدّ الموظف القائم صاحب العلاقة النشطة فقط (كان يعدّ كل صفوف العلاقات: المنتهية واليتيمة ← أرقام أكبر بالثلث)
  var emp=v24Data_('01_الأساسي'),ei=schoolV31Idx_(emp.headers),ok={};emp.rows.forEach(function(r){if(schoolV31Val_(r,ei,'حالة_السجل')!=='غير قائم')ok[schoolV31Val_(r,ei,'employeeId')]=1;});
  var ri=schoolV31Idx_(rel.headers),seen={};
  rel.rows.forEach(function(r){var sid=schoolV31Val_(r,ri,'schoolId'),eid=schoolV31Val_(r,ri,'employeeId');if(!sid||!ok[eid]||!v36ActiveRel_(schoolV31Val_(r,ri,'الحالة'))||seen[sid+'|'+eid])return;seen[sid+'|'+eid]=1;c[sid]=(c[sid]||0)+1;});
  return schools.map(function(s){s.workerCount=c[s.schoolId]||0;return s;});
}
