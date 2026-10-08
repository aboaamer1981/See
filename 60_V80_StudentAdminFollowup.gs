/** V7.12 — متابعة شؤون الطلاب للإدارة ورئيس القسم.
 * يضيف فقط طبقة متابعة وتقارير فوق البيانات الموجودة:
 * 1) إحصاء الدمج حسب المدرسة/الصف مع بيان فردي أو مجمع.
 * 2) موقف إدخال الفصول والطلاب للمدارس.
 * لا ينشئ جدول دمج جديدًا ولا يغير آلية الإدخال الحالية.
 */
function v80StudentRows_(filter){
  var d=v24Data_('13_شؤون_الطلاب'),ix=schoolV31Idx_(d.headers),names=v42SchoolNames_(),out=[];
  d.rows.forEach(function(r){
    var sid=String(schoolV31Val_(r,ix,'schoolId')||'').trim(),st=String(schoolV31Val_(r,ix,'المرحلة')||'').trim();
    if(!sid||!filter(sid,st))return;
    out.push({sid:sid,name:names[sid]||schoolV31Val_(r,ix,'اسم المدرسة')||sid,stage:st,grade:String(schoolV31Val_(r,ix,'الصف/المستوى')||''),row:r,ix:ix});
  });
  return out;
}

function v80StudentDisabilityStats_(filter){
  var rows=v80StudentRows_(filter),by={},all=[],tot={dis:0,mus:0,chr:0,types:{حركية:0,بصرية:0,سمعية:0,ذهنية:0,توحد:0,أخرى:0}};
  rows.forEach(function(x){
    var z=v79DisSummaryFromRow_(x.row,x.ix),d=z.summary||{},types=d.types||{};
    var item={schoolId:x.sid,school:x.name,stage:x.stage,grade:x.grade,total:Number(d.total)||0,muslim:Number(d.muslim)||0,christian:Number(d.christian)||0,notes:String(d.notes||''),types:{}};
    V79_DIS_TYPES.forEach(function(t){item.types[t]=Number(types[t])||0;});
    if(item.total>0){
      all.push(item);var s=by[x.sid]||(by[x.sid]={schoolId:x.sid,school:x.name,total:0,muslim:0,christian:0,types:{حركية:0,بصرية:0,سمعية:0,ذهنية:0,توحد:0,أخرى:0},rows:[]});
      s.total+=item.total;s.muslim+=item.muslim;s.christian+=item.christian;s.rows.push(item);
      tot.dis+=item.total;tot.mus+=item.muslim;tot.chr+=item.christian;
      V79_DIS_TYPES.forEach(function(t){tot.types[t]+=item.types[t];s.types[t]+=item.types[t];});
    }
  });
  var schools=Object.keys(by).map(function(k){var s=by[k];s.rows.sort(function(a,b){return v60SortGrade_(a,b);});return s;}).sort(function(a,b){return a.school.localeCompare(b.school,'ar');});
  all.sort(function(a,b){return a.school.localeCompare(b.school,'ar')||v60SortGrade_(a,b);});
  return {success:true,schools:schools,rows:all,totals:tot,schoolsWithDis:schools.length,generatedAt:new Date().toISOString()};
}

function v80StudentEntryStatus_(filter){
  var names=v42SchoolNames_(),types=v42SchoolTypes_(),d=v24Data_('13_شؤون_الطلاب'),ix=schoolV31Idx_(d.headers),by={};
  d.rows.forEach(function(r){
    var sid=String(schoolV31Val_(r,ix,'schoolId')||'').trim(),st=String(schoolV31Val_(r,ix,'المرحلة')||'').trim();
    if(!sid||!filter(sid,st))return;
    var o=by[sid]||(by[sid]={sid:sid,name:names[sid]||schoolV31Val_(r,ix,'اسم المدرسة')||sid,rows:0,classesEntered:0,studentsEntered:0,blankClasses:0,blankStudents:0});
    o.rows++;
    var cv=schoolV31Val_(r,ix,'عدد الفصول/القاعات'),sv=schoolV31Val_(r,ix,'إجمالي الطلاب');
    var hc=String(cv==null?'':cv).trim()!=='';var hs=String(sv==null?'':sv).trim()!=='';
    if(hc)o.classesEntered++;else o.blankClasses++;
    if(hs)o.studentsEntered++;else o.blankStudents++;
  });
  var schools=Object.keys(names).filter(function(sid){
    var t=types[sid]||{};return /تشغيلي/.test(String(t.cls||''))&&!/ديوان|مجهول/.test(String(names[sid]||''))&&filter(sid,'');
  }).map(function(sid){
    var o=by[sid]||{sid:sid,name:names[sid],rows:0,classesEntered:0,studentsEntered:0,blankClasses:0,blankStudents:0};
    var state=o.classesEntered===0?'لم تدخل فصول':(o.studentsEntered===0?'لم تدخل طلاب':((o.blankClasses||o.blankStudents)?'غير مكتملة':'مكتملة'));
    o.state=state;o.type=(types[sid]||{}).type||'';return o;
  }).sort(function(a,b){var order={'لم تدخل فصول':0,'لم تدخل طلاب':1,'غير مكتملة':2,'مكتملة':3};return order[a.state]-order[b.state]||a.name.localeCompare(b.name,'ar');});
  return {success:true,schools:schools,counts:{total:schools.length,noClasses:schools.filter(function(x){return x.state==='لم تدخل فصول';}).length,noStudents:schools.filter(function(x){return x.state==='لم تدخل طلاب';}).length,partial:schools.filter(function(x){return x.state==='غير مكتملة';}).length,complete:schools.filter(function(x){return x.state==='مكتملة';}).length}};
}

function adminStudentDisabilityStatsV80(token){v35Admin_(token);return v80StudentDisabilityStats_(v60Filter_(null));}
function deptStudentDisabilityStatsV80(token){var sc=v60DeptScope_(token);if(sc.noStage&&!sc.schools)throw new Error('قسمك غير مرتبط بمرحلة دراسية معروفة.');return v80StudentDisabilityStats_(v60Filter_(sc));}
function adminStudentEntryStatusV80(token){v35Admin_(token);return v80StudentEntryStatus_(v60Filter_(null));}
function deptStudentEntryStatusV80(token){var sc=v60DeptScope_(token);if(sc.noStage&&!sc.schools)throw new Error('قسمك غير مرتبط بمرحلة دراسية معروفة.');return v80StudentEntryStatus_(v60Filter_(sc));}
