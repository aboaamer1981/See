/** V7.28 — System Safety / Data Integrity
 * طبقة تدقيق لا تغيّر البيانات تلقائيًا. تكشف تعارضات العلاقات والحركات والحصر.
 */
function v90RelationAudit_(){
  var rel=v24Data_('04_علاقات_المدارس'), ri=schoolV31Idx_(rel.headers), req=v24Data_('09_طلبات_متبادلة'), qi=schoolV31Idx_(req.headers), emp=v24Data_('01_الأساسي'), ei=schoolV31Idx_(emp.headers), out=[];
  var active={}, names={}; emp.rows.forEach(function(r){names[schoolV31Val_(r,ei,'employeeId')]=schoolV31Val_(r,ei,'الاسم');});
  rel.rows.forEach(function(r){if(!v36ActiveRel_(schoolV31Val_(r,ri,'الحالة')))return;var eid=schoolV31Val_(r,ri,'employeeId');if(!String(eid||'').trim())return;var sid=schoolV31Val_(r,ri,'schoolId');(active[eid]||(active[eid]=[])).push({schoolId:sid,type:schoolV31Val_(r,ri,'نوع_العلاقة'),relationId:schoolV31Val_(r,ri,'relationId')});});
  Object.keys(active).forEach(function(eid){var a=active[eid], originals=a.filter(function(x){return x.type==='أصلي';}); var fullIn=a.some(function(x){return x.type==='منتدب إلينا كلي';}); if(originals.length>1||(!originals.length&&!fullIn))out.push({kind:'ORIGINAL_RELATION',employeeId:eid,name:names[eid]||eid,count:a.length,originals:originals.length,details:a}); if(a.length>2)out.push({kind:'ACTIVE_RELATION_OVERFLOW',employeeId:eid,name:names[eid]||eid,count:a.length,details:a});});
  var open={};
  req.rows.forEach(function(r){var st=schoolV31Val_(r,qi,'الحالة'), eid=schoolV31Val_(r,qi,'employeeId'); if(st!=='مفتوح'||!eid)return; (open[eid]||(open[eid]=[])).push({requestId:schoolV31Val_(r,qi,'requestId'),type:schoolV31Val_(r,qi,'نوع_الطلب'),from:schoolV31Val_(r,qi,'fromSchoolId'),to:schoolV31Val_(r,qi,'toSchoolId')});});
  Object.keys(open).forEach(function(eid){if(open[eid].length>1)out.push({kind:'MULTIPLE_OPEN_REQUESTS',employeeId:eid,name:names[eid]||eid,count:open[eid].length,details:open[eid]});});
  rel.rows.forEach(function(r){if(!v36ActiveRel_(schoolV31Val_(r,ri,'الحالة')))return;var eid=schoolV31Val_(r,ri,'employeeId'),type=schoolV31Val_(r,ri,'نوع_العلاقة'),ds=String(schoolV31Val_(r,ri,'أيام_الندب_الجزئي')||'').trim(),ps=String(schoolV31Val_(r,ri,'حصص_الندب_الجزئي')||'').trim(); if(eid&&type==='منتدب إلينا جزئي'&&(!ds||!ps||!(Number(ds)>0)||!(Number(ps)>=0)))out.push({kind:'PARTIAL_MISSING',employeeId:eid,name:names[eid]||eid,schoolId:schoolV31Val_(r,ri,'schoolId'),days:ds,periods:ps}); if(eid&&type==='منتدب إلينا كلي'&&(Number(ds)>0||Number(ps)>0))out.push({kind:'FULL_HAS_PARTIAL_FIELDS',employeeId:eid,name:names[eid]||eid,relationId:schoolV31Val_(r,ri,'relationId'),days:ds,periods:ps});});   // V7.35: الفارغ كان يمر لأن Number('')=0
  return {success:true,count:out.length,issues:out,checked:{employees:Object.keys(names).length,activeRelations:rel.rows.filter(function(r){return String(schoolV31Val_(r,ri,'employeeId')||'').trim()&&v36ActiveRel_(schoolV31Val_(r,ri,'الحالة'));}).length,openRequests:Object.keys(open).reduce(function(n,k){return n+open[k].length;},0)}};
}
function adminSystemSafetyAuditV90(token){v35Admin_(token);return v90RelationAudit_();}
function adminDataSourceAuditV90(token){
  v35Admin_(token); var ss=personnelSS_(), names=['R_Migration_V55','R_Master_Stage'], exists={}; names.forEach(function(n){exists[n]=!!ss.getSheetByName(n);});
  return {success:true,sourceSheets:exists,embeddedPersonalDataRemoved:true,note:'بيانات الهجرة ومرجع المرحلة لا تُحفظ داخل ملفات .gs؛ تُقرأ من أوراق المصدر عند الحاجة.'};
}
