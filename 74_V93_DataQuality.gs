/**
 * V7.35 — تقرير جودة البيانات (قراءة فقط — لا يعدّل أي بيانات).
 * يجمع المشكلات التي تُفسد العدّ أو العجز أو الاستحقاقات، لكل مدرسة، لتصححها المدارس/الإدارة من الشاشات المعتادة.
 * الإدارة: كل المدارس. المدرسة: مدرستها فقط.
 */
var V93_DQ_KINDS = [
  ['NO_SUBJECT', 'معلم بلا مادة تدريس', 'لا يدخل في حساب العجز والزيادة', 'bad'],
  ['OFF_BUT_ACTIVE', '«غير قائم» وله علاقة نشطة', 'يُعد في بعض الشاشات وهو خارج الخدمة', 'bad'],
  ['NO_RELATION', 'قائم بلا أي علاقة بمدرسة', 'لا يظهر في أي مدرسة', 'bad'],
  ['MULTI_ORIGINAL', 'أكثر من علاقة «أصلي» نشطة', 'يُحسب في مدرستين', 'bad'],
  ['HOST_AT_ORIGIN', 'منتدب إلينا في مدرسته الأصلية نفسها', 'يظهر في «الأصليون خارج المدرسة» وتعديلاته تحتاج موافقة — الصحيح «أصلي»', 'bad'],   // V7.62
  ['FIN_NOT_ELIGIBLE', 'نظام مالي لغير مستحق', 'المسمى ليس من مسميات المعلمين ولا قيادة', 'bad'],
  ['LEAD_AS_JOB', 'القيادة مكتوبة كمسمى وظيفي', 'القيادة وظيفة إشرافية — المسمى يبقى الحقيقي', 'warn'],
  ['NO_FIN_SYSTEM', 'معلم بلا نظام مالي', 'لن يُحتسب له استحقاق', 'warn'],
  ['NONSTD_JOB', 'مسمى وظيفي غير موجود في المرجع', 'اختلاف كتابة يمنع التصنيف والنصاب', 'warn'],
  ['BAD_NID', 'رقم قومي غير صالح', 'تاريخ أو قرن غير صحيح', 'warn'],
  ['HRP_NO_REL', 'معلم حصة «قائم» بلا علاقة نشطة', 'لا يظهر في أي مدرسة', 'warn'],
  ['HRP_ZERO', 'معلم حصة بعلاقة نشطة بلا حصص مطلوبة', 'لا يغطي أي عجز', 'warn'],
  ['SCHOOL_NO_STAGE', 'مدرسة بلا مرحلة', 'تؤثر على النصاب وخطة الدراسة', 'warn']
];

function v93DataQuality_(onlySchoolId){
  var names = v42SchoolNames_(), emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers);
  var jobs = {}; try { var jd = v24Data_('R_المسميات_الوظيفية'), ji = schoolV31Idx_(jd.headers); jd.rows.forEach(function(r){ var j = String(schoolV31Val_(r, ji, 'المسمى_الوظيفي') || '').trim(); if (j) jobs[j] = 1; }); } catch (e) { console.error('v93DataQuality_ jobs: ' + e.message); }
  var act = {}, anyRel = {}; rel.rows.forEach(function(r){ var eid = String(schoolV31Val_(r, ri, 'employeeId') || '').trim(), st = String(schoolV31Val_(r, ri, 'الحالة') || '').trim(); if (eid && !/^(غير نشطة|منتهية)$/.test(st)) anyRel[eid] = st || 'نشطة'; if (!eid || !v36ActiveRel_(st)) return; (act[eid] = act[eid] || []).push({sid: String(schoolV31Val_(r, ri, 'schoolId')), type: String(schoolV31Val_(r, ri, 'نوع_العلاقة') || '').trim()}); });
  var out = [], CUR = '';   // V7.62: CUR = employeeId للصف الجاري (كان لا يُرسل فيفشل «تصحيح» بخطأ «العامل غير محدد»)
  function add(kind, sid, name, nid, detail){ if (onlySchoolId && String(sid) !== String(onlySchoolId)) return; out.push({employeeId: CUR, kind: kind, schoolId: sid || '', school: names[sid] || (sid ? sid : '— بلا مدرسة —'), name: name, nid: nid, detail: detail || ''}); }
  emp.rows.forEach(function(r){
    var g = function(k){ return String(schoolV31Val_(r, ei, k) || '').trim(); };
    var eid = g('employeeId'); if (!eid) return; CUR = eid;
    var live = g('حالة_السجل') !== 'غير قائم', a = act[eid] || [], job = g('المسمى_الوظيفي'), sup = g('الوظيفة_الإشرافية'), sys = g('نظام_العمل'), name = g('الاسم'), nid = g('الرقم_القومي');
    var home = (a.filter(function(x){ return x.type === 'أصلي'; })[0] || a[0] || {}).sid || g('originalSchoolId');
    var lead = !!(sup && V40_SCHOOL_ASSIGNMENTS[sup]), teacher = !!V54_TEACHER_JOBS[job];
    if (!live) { if (a.length) add('OFF_BUT_ACTIVE', home, name, nid, a.length + ' علاقة نشطة'); return; }
    if (!a.length && !anyRel[eid]) add('NO_RELATION', home, name, nid, g('حالة_السجل') || '');   // علاقة بحالة «إجازة/منتدب كليًا لجهة أخرى» ليست مشكلة
    var orig = a.filter(function(x){ return x.type === 'أصلي'; });
    if (orig.length > 1) add('MULTI_ORIGINAL', home, name, nid, orig.map(function(x){ return names[x.sid] || x.sid; }).join(' + '));
    var os = g('originalSchoolId'); if (os && !orig.some(function(x){ return String(x.sid) === os; })) { var hx = a.filter(function(x){ return String(x.sid) === os && /منتدب إلينا/.test(x.type); })[0]; if (hx) add('HOST_AT_ORIGIN', os, name, nid, hx.type + ' — ' + (names[os] || os)); }   // V7.62
    if (teacher && !lead && !g('مادة_التدريس')) add('NO_SUBJECT', home, name, nid, job);
    if (sys && !teacher && !lead) add('FIN_NOT_ELIGIBLE', home, name, nid, (job || 'بلا مسمى') + ' — ' + sys);
    if (teacher && !sys && a.length) add('NO_FIN_SYSTEM', home, name, nid, job);
    if (/قياد[ةه]|وكيل|مدير/.test(job) && !teacher) add('LEAD_AS_JOB', home, name, nid, job);
    if (job && Object.keys(jobs).length && !jobs[job]) add('NONSTD_JOB', home, name, nid, job);
    if (!job) add('NONSTD_JOB', home, name, nid, 'المسمى فارغ');
    if (nid) { try { var nv = v24ValidateNationalIdV40_(nid); if (!nv.valid) add('BAD_NID', home, name, nid, nv.message); } catch (e2) { add('BAD_NID', home, name, nid, e2.message); } }
  });
  CUR = '';
  try {
    var hd = v56Read_(V40_HRP_SHEET), hx = hd.ix, hr = v56Read_(V40_HRP_REL_SHEET), rx = hr.ix, hact = {};
    hr.vals.forEach(function(r){ if (!v36ActiveRel_(r[rx['الحالة']])) return; (hact[r[rx.hrpId]] = hact[r[rx.hrpId]] || []).push({sid: String(r[rx.schoolId]), req: String(r[rx['عدد_الحصص_المطلوب']] || '').trim()}); });
    hd.vals.forEach(function(r){
      var id = r[hx.hrpId]; if (!id) return; var st = String(r[hx['حالة_السجل']] || '').trim(), a = hact[id] || [], sid = (a[0] || {}).sid || String(r[hx.originalSchoolId] || '');
      if (st === 'قائم' && !a.length) add('HRP_NO_REL', sid, r[hx['الاسم']], r[hx['الرقم_القومي']], 'معلم حصة/معاش');
      a.forEach(function(x){ if (!(Number(x.req) > 0)) add('HRP_ZERO', x.sid, r[hx['الاسم']], r[hx['الرقم_القومي']], 'الحصص المطلوبة: ' + (x.req || 'فارغ')); });
    });
  } catch (e3) { console.error('v93DataQuality_ hrp: ' + e3.message); }
  if (!onlySchoolId) {
    var sd = v24Data_('18_بيانات_المدارس'), si = schoolV31Idx_(sd.headers);
    sd.rows.forEach(function(r){ var sid = String(schoolV31Val_(r, si, 'schoolId') || '').trim(); if (sid && !String(schoolV31Val_(r, si, 'المرحلة_1') || '').trim() && !String(schoolV31Val_(r, si, 'نوع_المدرسة') || '').trim()) add('SCHOOL_NO_STAGE', sid, String(schoolV31Val_(r, si, 'اسم_المدرسة') || ''), '', String(schoolV31Val_(r, si, 'نوع_المدرسة') || '')); });
  }
  var counts = {}; out.forEach(function(x){ counts[x.kind] = (counts[x.kind] || 0) + 1; });
  out.sort(function(a, b){ return String(a.school).localeCompare(String(b.school), 'ar') || String(a.name).localeCompare(String(b.name), 'ar'); });
  return {success: true, kinds: V93_DQ_KINDS.map(function(k){ return {key: k[0], title: k[1], why: k[2], level: k[3], count: counts[k[0]] || 0}; }), rows: out, generatedAt: new Date().toISOString()};
}
function adminDataQualityV93(token){ v35Admin_(token); return v93DataQuality_(''); }
function schoolDataQualityV93(token){ var s = schoolV31Session_(token); return v93DataQuality_(s.schoolId); }
