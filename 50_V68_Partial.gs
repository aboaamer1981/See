/**
 * V6.8 — الندب الجزئي: عدد الأيام وعدد الحصص الأسبوعية، وأثر الحركة على العجز والزيادة فورًا.
 * - التخزين: على علاقة «منتدب إلينا جزئي» (عند المدرسة المستقبِلة) في عمودين: أيام_الندب_الجزئي، حصص_الندب_الجزئي.
 * - المدخل: الحصر (أصلي ومنتدب جزئيًا / منتدب إلينا جزئيًا)، طلب الندب الجزئي، وتعديل الندب الجزئي القائم (المدرستان والإدارة).
 * - العجز والزيادة: المدرسة الأصلية = النصاب − حصص الندب، والمستقبِلة = حصص الندب. وما أقرته المدرسة في الحصر (ندب/نقل)
 *   يُحتسب فورًا حتى قبل تأكيد المدرسة الأخرى.
 */
var V68_DAYS = 'أيام_الندب_الجزئي', V68_PER = 'حصص_الندب_الجزئي';
var V68_PART_CODES = {OUT_PART: 1, IN_PART: 1, OUT_PART_OUT: 1};
var V68_OUT_CODES = {OUT_FULL_OUT: 1, LEAVE: 1, TR_OUT: 1, PENSION: 1, DEATH: 1, END: 1};
var V68_IN_CODES = {OUT_PART: 1, IN_PART: 1, OUT_PART_OUT: 1, OUT_FULL_IN: 1, TR_IN: 1, IN_FULL_IN: 1, ORIG: 1};   // V7.35: OUT_PART_OUT كان ناقصًا ⇒ ندب جزئي لخارج الإدارة لا يُخصم من العجز

function v68Nums_(days, periods, required){
  var ds = String(days == null ? '' : days).trim(), ps = String(periods == null ? '' : periods).trim();
  if (!ds && !ps) { if (required) throw new Error('الندب الجزئي: اكتب عدد الأيام وعدد الحصص الأسبوعية.'); return null; }
  var d = Number(v24DigitsLocalV31_(ds) || ds), p = Number(v24DigitsLocalV31_(ps) || ps);
  if (!ds || !isFinite(d) || d !== Math.floor(d) || d < 1 || d > 6) throw new Error('عدد أيام الندب الجزئي من 1 إلى 6.');
  if (!ps || !isFinite(p) || p !== Math.floor(p) || p < 0 || p > 40) throw new Error('عدد حصص الندب الجزئي الأسبوعية من 0 إلى 40.');
  return {d: d, p: p};
}
function v68RelSheet_(){
  var sh = v36Sheet_('04_علاقات_المدارس');
  schoolEnsureWorkerColumnV40_(sh, V68_DAYS); schoolEnsureWorkerColumnV40_(sh, V68_PER);
  return sh;
}
/** يكتب الأرقام على علاقة «منتدب إلينا جزئي» النشطة للموظف في المدرسة المستقبِلة. */
function v68SetOnRel_(eid, targetSid, nums){
  if (!nums) return 0;
  var sh = v68RelSheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), n = sh.getLastRow() - 1; if (n < 1) return 0;
  var v = sh.getRange(2, 1, n, h.length).getValues(), c = 0;
  v.forEach(function(r, i){
    if (String(r[ix.employeeId]) !== String(eid) || String(r[ix.schoolId]) !== String(targetSid)) return;
    if (String(r[ix['نوع_العلاقة']]).trim() !== 'منتدب إلينا جزئي' || !v36ActiveRel_(String(r[ix['الحالة']] || '').trim())) return;
    r[ix[V68_DAYS]] = nums.d; r[ix[V68_PER]] = nums.p; v50A_(sh.getRange(i + 2, 1, 1, h.length).setValues([r])); c++;
  });
  if (c) v50Invalidate_('04_علاقات_المدارس');
  return c;
}

/** كل الندب الجزئي النشط (للمدرسة: ما يخصها صادرًا أو واردًا). */
function v68PartialList_(sid){
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), names = v42SchoolNames_(), home = {}, out = [];
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), E = {};
  emp.rows.forEach(function(r){ E[schoolV31Val_(r, ei, 'employeeId')] = {name: schoolV31Val_(r, ei, 'الاسم'), nid: schoolV31Val_(r, ei, 'الرقم_القومي'), job: schoolV31Val_(r, ei, 'المسمى_الوظيفي'), subject: schoolV31Val_(r, ei, 'مادة_التدريس'), orig: schoolV31Val_(r, ei, 'originalSchoolId'), rec: schoolV31Val_(r, ei, 'حالة_السجل')}; });
  rel.rows.forEach(function(r){ if (v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة')) && schoolV31Val_(r, ri, 'نوع_العلاقة') === 'أصلي') home[schoolV31Val_(r, ri, 'employeeId')] = schoolV31Val_(r, ri, 'schoolId'); });
  rel.rows.forEach(function(r){
    if (schoolV31Val_(r, ri, 'نوع_العلاقة') !== 'منتدب إلينا جزئي' || !v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة'))) return;
    var eid = schoolV31Val_(r, ri, 'employeeId'), to = schoolV31Val_(r, ri, 'schoolId'), e = E[eid]; if (!e || e.rec === 'غير قائم') return;
    var from = home[eid] || e.orig || '';
    if (sid && String(sid) !== String(to) && String(sid) !== String(from)) return;
    out.push({relationId: schoolV31Val_(r, ri, 'relationId'), eid: eid, name: e.name, nid: e.nid, job: e.job, subject: e.subject, fromSid: from, from: names[from] || from || '—', toSid: to, to: names[to] || to,
      days: schoolV31Val_(r, ri, V68_DAYS), periods: schoolV31Val_(r, ri, V68_PER), since: schoolV31Val_(r, ri, 'تاريخ_البداية'), dir: sid ? (String(sid) === String(to) ? 'in' : 'out') : ''});
  });
  return out.sort(function(a, b){ var am = (a.periods == null || String(a.periods).trim() === '') ? 0 : 1, bm = (b.periods == null || String(b.periods).trim() === '') ? 0 : 1; return am - bm || a.name.localeCompare(b.name, 'ar'); });
}
function schoolPartialListV68(token){ var s = schoolV33Session_(token); var l = v68PartialList_(s.schoolId); return {success: true, rows: l, missing: l.filter(function(x){ return x.periods == null || String(x.periods).trim() === ''; }).length}; }
function v68SetByRelation_(relationId, days, periods, canFn, actor){
  var nums = v68Nums_(days, periods, true);
  return v35Lock_(function(){
    v50Fresh_();
    var sh = v68RelSheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), row = v36FindRow_(sh, h, 'relationId', relationId);
    if (!row) throw new Error('العلاقة غير موجودة.');
    var r = sh.getRange(row, 1, 1, h.length).getValues()[0];
    if (String(r[ix['نوع_العلاقة']]).trim() !== 'منتدب إلينا جزئي' || !v36ActiveRel_(String(r[ix['الحالة']] || '').trim())) throw new Error('هذه ليست علاقة ندب جزئي نشطة.');
    var eid = String(r[ix.employeeId]), to = String(r[ix.schoolId]);
    if (canFn && !canFn(eid, to)) throw new Error('هذا الندب لا يخص مدرستك.');
    var old = [r[ix[V68_DAYS]], r[ix[V68_PER]]].join(' / ');
    r[ix[V68_DAYS]] = nums.d; r[ix[V68_PER]] = nums.p; v50A_(sh.getRange(row, 1, 1, h.length).setValues([r]));
    v50Invalidate_('04_علاقات_المدارس');
    schoolV31Log_(actor, 'تحديد أيام/حصص الندب الجزئي', eid, [['الأيام / الحصص', old, nums.d + ' / ' + nums.p]]);
    return {success: true, message: 'تم الحفظ: ' + nums.d + ' يوم — ' + nums.p + ' حصة أسبوعيًا.'};
  });
}
function schoolPartialSetV68(token, relationId, days, periods){
  var s = schoolV33Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  return v68SetByRelation_(relationId, days, periods, function(eid, to){
    if (String(to) === String(s.schoolId)) return true;
    return v68PartialList_(s.schoolId).some(function(x){ return x.relationId === relationId; });
  }, s);
}
function adminPartialListV68(token){ v35Admin_(token); var l = v68PartialList_(''); return {success: true, rows: l, missing: l.filter(function(x){ return x.periods == null || String(x.periods).trim() === ''; }).length}; }
function adminPartialSetV68(token, relationId, days, periods){ var a = v35Admin_(token); return v68SetByRelation_(relationId, days, periods, null, v36Actor_(a)); }

/* ---------- توزيع النصاب على المدارس (للعجز والزيادة) ---------- */
/** يرجع لكل موظف: home (المدرسة التي يُحتسب نصابه فيها) و parts [{sid, p, d}] — من العلاقات النشطة + إقرارات الحصر المعتمدة غير المطبقة بعد. */
function v68Alloc_(){
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), A = {};
  function a(eid){ return A[eid] = A[eid] || {home: '', full: '', parts: {}, notes: []}; }
  rel.rows.forEach(function(r){
    if (!v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة'))) return;
    var eid = schoolV31Val_(r, ri, 'employeeId'), sid = schoolV31Val_(r, ri, 'schoolId'), t = schoolV31Val_(r, ri, 'نوع_العلاقة'); if (!eid || !sid) return;
    if (t === 'أصلي') a(eid).home = sid;
    else if (t === 'منتدب إلينا كلي') a(eid).full = sid;
    else if (t === 'منتدب إلينا جزئي') { var p = v36Int_(schoolV31Val_(r, ri, V68_PER)), d = v36Int_(schoolV31Val_(r, ri, V68_DAYS)); a(eid).parts[sid] = {sid: sid, p: p || 0, d: d || 0, known: (p != null && String(p).trim() !== '')}; }
  });
  // إقرارات الحصر: ما حددته المدرسة يؤثر فورًا
  try {
    var C = v65Read_(), ix = C.d.ix, done = v65Done_();
    C.rows.forEach(function(row){
      var o = v65Obj_(row, ix); if (!done[o.sid]) return;
      if (/^مطبق|^محسوم/.test(o.state || '') && !V68_OUT_CODES[o.code] && o.code !== 'OUT_PART_OUT') return;   // V7.35: الندب الجزئي لخارج الإدارة ليس له علاقة في 04 — يبقى من الحصر   // المطبق موجود في العلاقات؛ وإقرار «لا يعمل هنا» يُحترم دائمًا
      var np = v36Int_(o.periods), nd = v36Int_(o.days), x;
      if (V68_OUT_CODES[o.code]) { x = a(o.eid); x.out = x.out || {}; x.out[o.sid] = o.code; return; }   // لا يعمل بهذه المدرسة (ندب كلي خارج الإدارة/إجازة/نقل خارج/معاش/وفاة/إنهاء)
      if (!V68_IN_CODES[o.code]) return;
      x = a(o.eid);
      switch (o.code) {
        case 'OUT_PART': if (o.toSid && !x.parts[o.toSid]) { x.parts[o.toSid] = {sid: o.toSid, p: np || 0, d: nd || 0, known: (o.periods != null && String(o.periods).trim() !== ''), pending: true}; } if (!x.home) x.home = o.sid; break;
        case 'OUT_PART_OUT': x.home = x.home || o.sid; x.externalPart = {p: np || 0, d: nd || 0, known: (o.periods != null && String(o.periods).trim() !== ''), place: o.text, pending: true}; break;
        case 'IN_PART': if (!x.parts[o.sid]) x.parts[o.sid] = {sid: o.sid, p: np || 0, d: nd || 0, known: !!np, pending: true}; if (!x.home && o.toSid) x.home = o.toSid; break;
        case 'OUT_FULL_IN': case 'TR_IN': if (o.toSid) { x.home = o.toSid; x.pending = o.code; } break;
        case 'IN_FULL_IN': case 'ORIG': x.home = o.sid; if (o.code !== 'ORIG') x.pending = o.code; break;
      }
    });
  } catch (e) {}
  Object.keys(A).forEach(function(k){ var x = A[k]; if (!x.home && x.full) x.home = x.full; });
  return A;
}
/** بعد الموافقة على طلب ندب جزئي: نقل الأيام/الحصص من الطلب إلى العلاقة. */
function v68FromRequest_(eid, to, vals, ix){
  try { var n = v68Nums_(ix['أيام_الندب_الجزئي'] != null ? vals[ix['أيام_الندب_الجزئي']] : '', ix['حصص_الندب_الجزئي'] != null ? vals[ix['حصص_الندب_الجزئي']] : '', false); if (n) v68SetOnRel_(eid, to, n); } catch (e) {}
}

/* ---------- مربع «الحصة» في لوحة العاملين ---------- */
/** معلمو الحصة والمعاش النشطون في النطاق: العدد (بالفئة) ومجموع الحصص الأسبوعية المطلوبة. */
function v68Hrp_(schoolFn){
  var out = {teachers: 0, hourly: 0, pension: 0, periods: 0, noPeriods: 0};
  try {
    var hp = v24Data_('05_معلمو_الحصة_والمعاش'), hi = schoolV31Idx_(hp.headers), P = {};
    hp.rows.forEach(function(r){ if (schoolV31Val_(r, hi, 'حالة_السجل') === 'غير قائم') return; P[schoolV31Val_(r, hi, 'hrpId')] = schoolV31Val_(r, hi, 'نوع_الفئة'); });
    var hr = v24Data_('06_علاقات_معلمي_الحصة'), ri = schoolV31Idx_(hr.headers), seen = {};
    hr.rows.forEach(function(r){
      if (!v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة'))) return;
      var id = schoolV31Val_(r, ri, 'hrpId'), sid = schoolV31Val_(r, ri, 'schoolId'); if (!id || P[id] === undefined || !sid || !schoolFn(sid)) return;
      var n = v36Int_(schoolV31Val_(r, ri, 'عدد_الحصص_المطلوب')) || 0; out.periods += n; if (!n) out.noPeriods++;
      if (!seen[id]) { seen[id] = 1; out.teachers++; if (/معاش/.test(P[id])) out.pension++; else out.hourly++; }
    });
  } catch (e) {}
  return out;
}
