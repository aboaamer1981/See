/** V5.5 — تطبيق كشوف Master 2025/2026 (أحدث بيانات — قرار المستخدم):
 *  1) نقل كامل لـ311 موظفًا من «مراجعة_جهة_العمل» لمدرسة Master (مثل الـ144 السابقين).
 *  2) إضافة 234 موظفًا موجودين في Master وليسوا في 01_الأساسي (بدون المنتهية خدمتهم).
 *  المسميات المختلفة (297) تُركت كما هي بقرار المستخدم.
 *  آمن للتكرار: يتخطى من نُقل أو أُضيف بالفعل. apply=false معاينة. ملف مؤقت — يُحذف بعد التطبيق. */
/** V5.5-SAFE — تم حذف بيانات الموظفين الشخصية المضمّنة من المصدر البرمجي.
 * بيانات الهجرة لا تُحفظ داخل ملفات .gs. تُقرأ فقط من ورقة بيانات مؤقتة مؤمّنة عند الحاجة.
 */
var V55_DATA = null;
function v55MigrationSource_(){
  var name='R_Migration_V55';
  var sh=personnelSS_().getSheetByName(name);
  if(!sh||sh.getLastRow()<2) throw new Error('مصدر هجرة V55 غير متاح. ضع بيانات الهجرة في ورقة '+name+' قبل تشغيل هذه العملية.');
  var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(function(x){return String(x||'').trim();});
  var v=sh.getRange(2,1,sh.getLastRow()-1,h.length).getDisplayValues();
  var ix={}; h.forEach(function(x,i){if(x)ix[x]=i;});
  function g(r,k){return ix[k]==null?'':String(r[ix[k]]||'').trim();}
  var tr=[],nw=[]; v.forEach(function(r){
    var nid=g(r,'الرقم_القومي'), action=g(r,'الإجراء')||g(r,'action');
    if(!nid)return;
    if(action==='نقل' || g(r,'إلى_مدرسة') || g(r,'toSchoolId')) tr.push([nid,g(r,'إلى_مدرسة')||g(r,'toSchoolId'),g(r,'اسم_المدرسة')]);
    else nw.push({nid:nid,name:g(r,'الاسم'),title:g(r,'المسمى_الوظيفي'),system:g(r,'نظام_العمل'),schoolId:g(r,'schoolId')||g(r,'إلى_مدرسة'),stage:g(r,'المرحلة_التعليمية_الأصلية'),subject:g(r,'مادة_التدريس'),phone:g(r,'الهاتف'),grade:g(r,'الدرجة_المالية'),g1:'',g2:'',g3:'',g4:''});
  });
  return {tr:tr,new:nw};
}
function v55Apply_(apply, actor){
  V55_DATA = v55MigrationSource_();
  var ss = personnelSS_(), today = Utilities.formatDate(new Date(), 'Africa/Cairo', 'yyyy-MM-dd');
  var eSh = ss.getSheetByName('01_الأساسي'), rSh = ss.getSheetByName('04_علاقات_المدارس'), mSh = ss.getSheetByName('06_حركة_العامل');
  var eH = eSh.getRange(1, 1, 1, eSh.getLastColumn()).getDisplayValues()[0], eI = {}; eH.forEach(function(h, i){ if (h) eI[h] = i; });
  var rH = rSh.getRange(1, 1, 1, rSh.getLastColumn()).getDisplayValues()[0], rI = {}; rH.forEach(function(h, i){ if (h) rI[h] = i; });
  var mH = mSh.getRange(1, 1, 1, mSh.getLastColumn()).getDisplayValues()[0], mI = {}; mH.forEach(function(h, i){ if (h) mI[h] = i; });
  var eN = eSh.getLastRow() - 1, eV = eN > 0 ? eSh.getRange(2, 1, eN, eH.length).getDisplayValues() : [];
  var rN = rSh.getLastRow() - 1, rV = rN > 0 ? rSh.getRange(2, 1, rN, rH.length).getValues() : [];
  var names = v42SchoolNames_(), byNid = {};
  eV.forEach(function(r, i){ var n = String(r[eI['الرقم_القومي']] || '').trim(); if (n) byNid[n] = {i: i, eid: r[eI.employeeId], orig: r[eI.originalSchoolId]}; });
  var origCol = eV.map(function(r){ return [r[eI.originalSchoolId]]; }), origChanged = false, relChanged = false, newRels = [], moves = [], newEmp = [];
  function relRow(eid, sid, note){ var x = new Array(rH.length).fill(''); function p(k, v){ if (rI[k] != null) x[rI[k]] = v; } p('relationId', 'REL_M26_' + v55Hex_(16)); p('employeeId', eid); p('schoolId', sid); p('نوع_العلاقة', 'أصلي'); p('isOriginal', true); p('تاريخ_البداية', today); p('الحالة', 'نشطة'); p('مصدر_العلاقة', 'Master 2025/2026'); p('ملاحظات', note); return x; }
  function moveRow(eid, type, from, to, why){ var x = new Array(mH.length).fill(''); function p(k, v){ if (mI[k] != null) x[mI[k]] = v; } p('movementId', 'MOV_M26_' + v55Hex_(16)); p('employeeId', eid); p('نوع_الحركة', type); p('من_مدرسة', from); p('إلى_مدرسة', to); p('تاريخ_البداية', today); p('سبب_الحركة', why); p('مصدر_الحركة', 'Master'); p('المستخدم', actor || 'admin'); p('تاريخ_التسجيل', today); return x; }
  var tr = {done: 0, already: 0, missing: [], list: []};
  V55_DATA.tr.forEach(function(t){
    var nid = t[0], to = t[1], e = byNid[nid];
    if (!e) { tr.missing.push(nid); return; }
    if (String(e.orig) === String(to)) { tr.already++; return; }
    var hasTo = false;
    rV.forEach(function(r){
      if (String(r[rI.employeeId]) !== String(e.eid) || !v36ActiveRel_(r[rI['الحالة']])) return;
      if (String(r[rI.schoolId]) === String(to)) { hasTo = true; r[rI['نوع_العلاقة']] = 'أصلي'; if (rI.isOriginal != null) r[rI.isOriginal] = true; relChanged = true; return; }
      if (String(r[rI['نوع_العلاقة']]) === 'أصلي') { r[rI['الحالة']] = 'غير نشطة'; r[rI['تاريخ_النهاية']] = today; if (rI['سبب_الإنهاء'] != null) r[rI['سبب_الإنهاء']] = 'نقل — تصحيح من كشوف Master 2025/2026'; if (rI['إنهاء_نهائي'] != null) r[rI['إنهاء_نهائي']] = 'لا'; relChanged = true; }
    });
    if (!hasTo) newRels.push(relRow(e.eid, to, 'نقل كامل بقرار الإدارة من ' + (names[e.orig] || t[2])));
    origCol[e.i][0] = to; origChanged = true;
    moves.push(moveRow(e.eid, 'نقل', names[e.orig] || t[2], names[to] || to, 'تصحيح جهة العمل من كشوف Master 2025/2026'));
    tr.done++; tr.list.push(nid);
  });
  var ad = {done: 0, exists: 0, noSchool: [], list: []};
  V55_DATA.new.forEach(function(x){
    if (byNid[x.nid]) { ad.exists++; return; }
    var eid = 'EMP_' + v55Hex_(20), row = new Array(eH.length).fill('');
    function p(k, v){ if (eI[k] != null) row[eI[k]] = v; }
    p('employeeId', eid); p('الرقم_القومي', x.nid); p('الاسم', x.name); p('النوع', v55Sex_(x.nid)); p('تاريخ_الميلاد', v55Birth_(x.nid)); p('الهاتف', x.phone);
    p('المسمى_الوظيفي', x.title); p('المسمى_الوظيفي_الأصلي', x.title); p('الدرجة_المالية', x.grade); p('المجموعة_النوعية', x.g1); p('المجموعة_الوظيفية', x.g2); p('المجموعة_المعيارية', x.g3); p('مستوى_المسمى_المعياري', x.g4);
    p('مادة_التدريس', x.subject); p('المرحلة_التعليمية_الأصلية', x.stage); p('نظام_العمل', x.system); p('originalSchoolId', x.schoolId);
    p('الحالة_الوظيفية', 'قائم'); p('حالة_السجل', 'قائم'); p('قائم_بالعمل', 'نعم'); p('مشرف_على_المادة', 'لا'); p('نوع التعليم', 'عام'); p('مصدر_تحديث_Master', 'Master 2025/2026: إضافة');
    newEmp.push(row); byNid[x.nid] = {eid: eid};
    if (x.schoolId) { newRels.push(relRow(eid, x.schoolId, 'إضافة من كشوف Master 2025/2026')); moves.push(moveRow(eid, 'إضافة', '', names[x.schoolId] || x.schoolId, 'موظف في كشوف Master 2025/2026 وغير مسجل بالقاعدة')); }
    else ad.noSchool.push(x.name);
    ad.done++; ad.list.push(x.nid);
  });
  if (apply) {
    if (origChanged && eN > 0) v50A_(eSh.getRange(2, eI.originalSchoolId + 1, eN, 1).setValues(origCol));
    if (newEmp.length) { var st = eSh.getLastRow() + 1; ['الرقم_القومي', 'الهاتف'].forEach(function(k){ if (eI[k] != null) eSh.getRange(st, eI[k] + 1, newEmp.length, 1).setNumberFormat('@'); }); v50A_(eSh.getRange(st, 1, newEmp.length, eH.length).setValues(newEmp)); }
    if (relChanged && rN > 0) v50A_(rSh.getRange(2, 1, rN, rH.length).setValues(rV));
    if (newRels.length) v50A_(rSh.getRange(rSh.getLastRow() + 1, 1, newRels.length, rH.length).setValues(newRels));
    if (moves.length) v50A_(mSh.getRange(mSh.getLastRow() + 1, 1, moves.length, mH.length).setValues(moves));
    v55MarkReview_('مراجعة_جهة_العمل', 'الرقم القومي', 'القرار', tr.list, 'طُبّق: نقل كامل (' + today + ')');
    v55MarkReview_('مراجعة_Master_2026', 'الرقم القومي', 'الإجراء', ad.list, 'أُضيف (' + today + ')', 'موجود في Master');
    v50Invalidate_();
  }
  return {success: true, message: (apply ? 'تم: ' : 'معاينة: ') + 'نقل ' + tr.done + ' موظف (' + tr.already + ' منقول بالفعل' + (tr.missing.length ? '، ' + tr.missing.length + ' غير موجود' : '') + ')، وإضافة ' + ad.done + ' موظف (' + ad.exists + ' موجود بالفعل، ' + ad.noSchool.length + ' بلا مدرسة في Master).', transfers: tr.done, added: ad.done, noSchool: ad.noSchool, missing: tr.missing};
}
function v55MarkReview_(sheet, nidCol, decCol, nids, text, onlyItem){
  var sh = personnelSS_().getSheetByName(sheet); if (!sh || !nids.length || sh.getLastRow() < 2) return;
  var h = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0], ni = h.indexOf(nidCol), di = h.indexOf(decCol), bi = h.indexOf('البند'); if (ni < 0 || di < 0) return;
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, h.length).getDisplayValues(), set = {}; nids.forEach(function(n){ set[n] = 1; });
  var col = v.map(function(r){ return [r[di]]; }), ch = false;
  v.forEach(function(r, i){ if (set[String(r[ni]).trim()] && (!onlyItem || String(r[bi] || '').indexOf(onlyItem) === 0)) { col[i][0] = text; ch = true; } });
  if (ch) v50A_(sh.getRange(2, di + 1, col.length, 1).setValues(col));
}
function adminApplyMasterV55(token, apply){
  var a = v35Admin_(token);
  if (!apply) return v55Apply_(false, a.username);
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try { v50Fresh_(); var r = v55Apply_(true, a.username); schoolV31Log_(v36Actor_(a), 'تطبيق كشوف Master 2025/2026', '01/04/06', [['نقل', '', String(r.transfers)], ['إضافة', '', String(r.added)]]); return r; }
  finally { try { lock.releaseLock(); } catch (e) {} }
}
