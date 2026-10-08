/** V7.9 — التقرير الرسمي المستقل لإحصائية الطلاب.
 * نفس شكل التقرير الورقي: عدد الفصول، مقيد، بنين، بنات، مسلم، مسيحي، مستجد، باقي، الدمج، نوع الإعاقة، دمج مسلم، دمج مسيحي.
 * قيمة «مستجد» تُقرأ مباشرة من حقل «مستجدون» في 13_شؤون_الطلاب.
 * نطاق الإدارة ورئيس القسم يحترم صلاحياتهما، وكل مدرسة تظهر في صفحة مستقلة عند الطباعة.
 */
function v76OfficialStudentReport_(filter){
  var d=v24Data_('13_شؤون_الطلاب'),ix=schoolV31Idx_(d.headers),names=v42SchoolNames_(),by={};
  d.rows.forEach(function(r){
    var sid=String(schoolV31Val_(r,ix,'schoolId')||''),st=String(schoolV31Val_(r,ix,'المرحلة')||''),gr=String(schoolV31Val_(r,ix,'الصف/المستوى')||'');
    if(!sid||!filter(sid,st))return;
    var sk=sid+'|'+st,sc=by[sk]||(by[sk]={schoolId:sid,name:names[sid]||schoolV31Val_(r,ix,'اسم المدرسة')||sid,stage:st,rows:[]}),p={};
    p.classes=v36Int_(schoolV31Val_(r,ix,'عدد الفصول/القاعات'));p.total=v36Int_(schoolV31Val_(r,ix,'إجمالي الطلاب'));p.male=v36Int_(schoolV31Val_(r,ix,'ذكور'));p.female=v36Int_(schoolV31Val_(r,ix,'إناث'));p.muslim=v36Int_(schoolV31Val_(r,ix,'مسلمون'));p.christian=v36Int_(schoolV31Val_(r,ix,'مسيحيون'));p.newS=v36Int_(schoolV31Val_(r,ix,'مستجدون'));p.old=v36Int_(schoolV31Val_(r,ix,'باقون'));p.stage=st;p.grade=gr;
    var z=v79DisSummaryFromRow_(r,ix).summary;   // V7.35: نفس مصدر إحصاء الدمج (V80) — يشمل الأعمدة القديمة كاحتياطي
    p.dis=z.total;p.disMuslim=z.muslim;p.disChristian=z.christian;p.disabilityType=V79_DIS_TYPES.filter(function(t){return v79DisNumSafe_(z.types[t])>0;}).map(function(t){return t+': '+v79DisNumSafe_(z.types[t]);}).join('، ');
    sc.rows.push(p);
  });
  var schools=Object.keys(by).map(function(k){var sc=by[k];sc.rows.sort(function(a,b){return v60SortGrade_(a,b);});return sc;}).sort(function(a,b){return a.name.localeCompare(b.name,'ar')||((V60_STAGE_ORDER[a.stage]||9)-(V60_STAGE_ORDER[b.stage]||9));});
  return {success:true,schools:schools,generatedAt:new Date().toISOString()};
}
function adminOfficialStudentReportV76(token){v35Admin_(token);return v76OfficialStudentReport_(v60Filter_(null));}
function deptOfficialStudentReportV76(token){var sc=v60DeptScope_(token);if(sc.noStage&&!sc.schools)throw new Error('قسمك غير مرتبط بمرحلة دراسية معروفة، فلا يتوفر التقرير الرسمي له.');return v76OfficialStudentReport_(v60Filter_(sc));}
