/** V7.29 — إصلاح أسماء العاملين بالحصة/المعاش في تقرير حركة العلاقات والحركات.
 * القاعدة: employeeId في طلبات HRP هو hrpId وليس employeeId الأساسي؛ لذلك يجب قراءة الاسم من 05_معلمو_الحصة_والمعاش.
 * لا نغيّر أي بيانات أو حالة طلب؛ هذا الملف للقراءة والعرض فقط.
 */
function v91HrpNames_(){
  var names = {};
  try {
    var hd = v56Read_(V40_HRP_SHEET), ix = hd.ix;
    hd.vals.forEach(function(r){
      var id = ix.hrpId != null ? String(r[ix.hrpId] || '').trim() : '';
      if(!id) return;
      var name = ix['الاسم'] != null ? String(r[ix['الاسم']] || '').trim() : '';
      var nid = ix['الرقم_القومي'] != null ? String(r[ix['الرقم_القومي']] || '').trim() : '';
      if(name) names[id] = name + ' (حصة/معاش)';
      else if(nid) names[id] = nid + ' (حصة/معاش)';
    });
  } catch(e) {}
  return names;
}

function adminMoveReportV91(token){
  v35Admin_(token);
  var types = V89_ADMIN_MOVE_TYPES.concat([V82_CANCEL_SECONDMENT]);
  var all = v40ReqList_(function(x){ var t=String(x['نوع_الطلب']||''); return types.indexOf(t)>=0 || t===V92_HRP_ADD_REQUEST; });
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), names = {}, hrp = v91HrpNames_();
  emp.rows.forEach(function(r){
    var id = String(schoolV31Val_(r,ei,'employeeId') || '').trim();
    if(id) names[id] = schoolV31Val_(r,ei,'الاسم');
  });
  return {success:true,rows:all.map(function(x){
    var typ = String(x['نوع_الطلب'] || ''), from = String(x.fromSchoolId || ''), to = String(x.toSchoolId || ''), init = String(x['مُبادر'] || ''), eid = String(x.employeeId || '').trim();
    var pending = String(x['الحالة'] || '') === 'مفتوح' ? (init === from ? to : from) : '';
    var kind = String(x['نوع_الموظف'] || '').trim();
    var employeeName = kind === 'موسمي' ? (hrp[eid] || eid) : (names[eid] || eid);
    var isHrpAdd = typ === V92_HRP_ADD_REQUEST;
    return {
      type:v83DisplayMoveType_(typ)+(x['حصص_الندب_الجزئي']?' ('+(x['أيام_الندب_الجزئي']?x['أيام_الندب_الجزئي']+' يوم / ':'')+x['حصص_الندب_الجزئي']+' حصة)':''),
      employeeName:employeeName,
      employeeKind:kind,
      from:v40Names_(from),
      to:v40Names_(to),
      reason:x['السبب'],
      status:x['الحالة'],
      date:x['تاريخ_الطلب'],
      requestId:x.requestId||'',
      yearRound:true,
      adminCanDecide:String(x['الحالة']||'')==='مفتوح'&&(V89_ADMIN_MOVE_TYPES.indexOf(typ)>=0||isHrpAdd),
      hrpAdd:isHrpAdd,
      pendingSchool:pending,
      pendingSchoolName:pending?v40Names_(pending):''
    };
  }).sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''));})};
}
