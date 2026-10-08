/**
 * V6.9 — توزيع حصص المعلم على أكثر من مادة (أساسي أو حصة/معاش)، والتربية الدينية المسيحية.
 * - «توزيع_المواد» على علاقة المعلم بالمدرسة (04 للأساسي، 06 للحصة): «مادة:عدد|مادة:عدد». الباقي لمادته الأساسية.
 *   مثال: مارلين (حصة) — العروبة: «التربية الدينية المسيحية:4» من 8 (الباقي 4 إنجليزي)، الشناينة (ع): «التربية الدينية المسيحية:12».
 * - المطلوب من الدين المسيحي = عدد المجموعات التي تكتبها المدرسة لكل صف × نصاب «التربية الدينية» للصف في أنصبة المواد.
 * - إجمالي حصص معلم الحصة لا يتغير (المالية كما هي)؛ التوزيع للعجز/الزيادة وللاستمارة فقط.
 */
var V69_COL = 'توزيع_المواد', V69_CHR = 'التربية الدينية المسيحية', V69_GRP = 'مجموعات_الدين_المسيحي', V69_REL_PLAN = 'التربية الدينية';

function v69Parse_(s){
  return String(s || '').split('|').map(function(p){ var i = p.lastIndexOf(':'); if (i < 0) return null; var sub = p.slice(0, i).trim(), n = Number(v24DigitsLocalV31_(p.slice(i + 1)) || 0); return sub && n > 0 ? {subject: sub, n: n} : null; }).filter(Boolean);
}
function v69Fmt_(list){ return (list || []).map(function(x){ return x.subject + ':' + x.n; }).join('|'); }
function v69Text_(list, main, total){
  var used = 0; (list || []).forEach(function(x){ used += x.n; });
  var parts = (list || []).map(function(x){ return x.subject + ' ' + x.n; });
  if (main && total != null && total - used > 0) parts.unshift(main + ' ' + (total - used));
  return parts.join('، ');
}
function v69Subjects_(){
  var out = [];
  try { var s = v24Data_('R_المواد'), si = schoolV31Idx_(s.headers); s.rows.forEach(function(r){ var n = schoolV31Val_(r, si, 'اسم_المادة'), st = schoolV31Val_(r, si, 'الحالة'); if (n && st !== 'غير فعال' && out.indexOf(n) < 0) out.push(n); }); } catch (e) {}
  out = out.filter(function(x){ return !v72IsReligion_(x); });   // V7.2: الدين الإسلامي ضمن اللغة العربية
  if (out.indexOf(V69_CHR) < 0) out.unshift(V69_CHR);
  return out;
}
function v69Clean_(list, total){
  var ok = {}; v69Subjects_().forEach(function(x){ ok[x] = 1; });
  var seen = {}, out = [], used = 0;
  (list || []).forEach(function(x){
    var sub = String(x && x.subject || '').trim(), ns = String(x && x.n == null ? '' : x.n).trim(); if (!sub && !ns) return;
    if (!ok[sub]) throw new Error('مادة غير موجودة في قائمة المواد: ' + sub);
    var n = Number(v24DigitsLocalV31_(ns) || ns); if (!isFinite(n) || n !== Math.floor(n) || n < 1 || n > 40) throw new Error('عدد حصص «' + sub + '» يجب أن يكون رقمًا صحيحًا من 1 إلى 40.');
    if (seen[sub]) throw new Error('المادة مكررة: ' + sub); seen[sub] = 1; used += n; out.push({subject: sub, n: n});
  });
  if (total != null && used > total) throw new Error('مجموع الحصص الموزعة (' + used + ') أكبر من إجمالي حصصه هنا (' + total + ').');
  return out;
}

/** خريطة التوزيع: basic[eid|sid] و hrp[hrpId|sid] = [{subject,n}] من العلاقات النشطة. */
function v69Splits_(){
  var o = {basic: {}, hrp: {}};
  try { var r = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(r.headers); if (ri[V69_COL] != null) r.rows.forEach(function(x){ if (!v36ActiveRel_(schoolV31Val_(x, ri, 'الحالة'))) return; var l = v69Parse_(schoolV31Val_(x, ri, V69_COL)); if (l.length) o.basic[schoolV31Val_(x, ri, 'employeeId') + '|' + schoolV31Val_(x, ri, 'schoolId')] = l; }); } catch (e) {}
  try { var h = v24Data_('06_علاقات_معلمي_الحصة'), hi = schoolV31Idx_(h.headers); if (hi[V69_COL] != null) h.rows.forEach(function(x){ if (!v36ActiveRel_(schoolV31Val_(x, hi, 'الحالة'))) return; var l = v69Parse_(schoolV31Val_(x, hi, V69_COL)); if (l.length) o.hrp[schoolV31Val_(x, hi, 'hrpId') + '|' + schoolV31Val_(x, hi, 'schoolId')] = l; }); } catch (e) {}
  return o;
}

/** المدرسة: قراءة توزيع معلم (kind = 'basic' بالـ employeeId، أو 'hrp' بالـ hrpId). */
function schoolSplitGetV69(token, kind, id){
  var s = schoolV33Session_(token), sid = String(s.schoolId), x = v69Find_(kind, id, sid);
  return {success: true, kind: kind, id: id, name: x.name, main: x.main, total: x.total, totalNote: x.totalNote, split: v69Parse_(x.split), subjects: v69Subjects_()};
}
function schoolSplitSetV69(token, kind, id, list){
  var s = schoolV33Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT'); var sid = String(s.schoolId);
  return v35Lock_(function(){
    v50Fresh_(); var x = v69Find_(kind, id, sid), clean = v69Clean_(list, x.total);
    if (clean.some(function(c){ return c.subject === x.main; })) throw new Error('لا تكتب المادة الأساسية «' + x.main + '» — الباقي يُحسب لها تلقائيًا.');
    var sh = v36Sheet_(kind === 'hrp' ? '06_علاقات_معلمي_الحصة' : '04_علاقات_المدارس'); schoolEnsureWorkerColumnV40_(sh, V69_COL);
    var h = v36Headers_(sh), ix = schoolV31Idx_(h), c = ix[V69_COL];
    v50A_(sh.getRange(x.row, c + 1).setValue(v69Fmt_(clean)));
    v50Invalidate_(kind === 'hrp' ? '06_علاقات_معلمي_الحصة' : '04_علاقات_المدارس');
    schoolV31Log_(s, 'توزيع حصص المعلم على المواد', id, [['التوزيع', x.split, v69Fmt_(clean)]]);
    return {success: true, message: 'تم الحفظ: ' + (v69Text_(clean, x.main, x.total) || ('كل الحصص لمادته: ' + x.main)) + '.'};
  });
}
function v69Find_(kind, id, sid){
  if (kind === 'hrp') {
    var hp = v24Data_('05_معلمو_الحصة_والمعاش'), hpi = schoolV31Idx_(hp.headers), p = null;
    hp.rows.forEach(function(r){ if (schoolV31Val_(r, hpi, 'hrpId') === String(id)) p = r; }); if (!p) throw new Error('معلم الحصة غير موجود.');
    var hr = v24Data_('06_علاقات_معلمي_الحصة'), ri = schoolV31Idx_(hr.headers), best = null, tot = 0;
    hr.rows.forEach(function(r, i){ if (schoolV31Val_(r, ri, 'hrpId') !== String(id) || schoolV31Val_(r, ri, 'schoolId') !== sid || !v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة'))) return; tot += v36Int_(schoolV31Val_(r, ri, 'عدد_الحصص_المطلوب')) || 0; if (!best || schoolV31Val_(r, ri, 'نوع_العلاقة') === 'أصلي') best = {row: i + 2, split: ri[V69_COL] != null ? schoolV31Val_(r, ri, V69_COL) : ''}; });
    if (!best) throw new Error('هذا المعلم غير مرتبط بمدرستك.');
    return {row: best.row, split: best.split, name: schoolV31Val_(p, hpi, 'الاسم'), main: schoolV31Val_(p, hpi, 'مادة_التدريس'), total: tot, totalNote: 'الحصص المطلوبة بمدرستك'};
  }
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), e = null;
  emp.rows.forEach(function(r){ if (schoolV31Val_(r, ei, 'employeeId') === String(id)) e = r; }); if (!e) throw new Error('العامل غير موجود.');
  var rel = v24Data_('04_علاقات_المدارس'), rli = schoolV31Idx_(rel.headers), b = null;
  rel.rows.forEach(function(r, i){ if (schoolV31Val_(r, rli, 'employeeId') !== String(id) || schoolV31Val_(r, rli, 'schoolId') !== sid || !v36ActiveRel_(schoolV31Val_(r, rli, 'الحالة'))) return; if (!b || schoolV31Val_(r, rli, 'نوع_العلاقة') === 'أصلي') b = {row: i + 2, split: rli[V69_COL] != null ? schoolV31Val_(r, rli, V69_COL) : '', type: schoolV31Val_(r, rli, 'نوع_العلاقة'), per: rli[V68_PER] != null ? schoolV31Val_(r, rli, V68_PER) : ''}; });
  if (!b) throw new Error('هذا العامل غير مرتبط بمدرستك.');
  var job = schoolV31Val_(e, ei, 'المسمى_الوظيفي'), stage = schoolV31Val_(e, ei, 'المرحلة_التعليمية_الأصلية'), q = null;
  try { q = v40LegalQuota_(job, stage, schoolV31Val_(e, ei, 'مشرف_على_المادة') === 'نعم', schoolV31Val_(e, ei, 'الوظيفة_الإشرافية')); } catch (er) {}
  var total = b.type === 'منتدب إلينا جزئي' ? (v36Int_(b.per) || null) : (q === '' || q == null ? null : Number(q));
  return {row: b.row, split: b.split, name: schoolV31Val_(e, ei, 'الاسم'), main: schoolV31Val_(e, ei, 'مادة_التدريس'), total: total, totalNote: b.type === 'منتدب إلينا جزئي' ? 'حصص الندب الجزئي بمدرستك' : 'النصاب القانوني الأسبوعي'};
}

/* ---------- مجموعات الدين المسيحي (تكتبها المدرسة لكل صف) ---------- */
function schoolChrGroupsGetV69(token){
  var s = schoolV33Session_(token), sid = String(s.schoolId), d = v24Data_('13_شؤون_الطلاب'), ix = schoolV31Idx_(d.headers), out = [];
  d.rows.forEach(function(r){ if (schoolV31Val_(r, ix, 'schoolId') !== sid) return; var st = schoolV31Val_(r, ix, 'المرحلة'), g = schoolV31Val_(r, ix, 'الصف/المستوى'); if (!st || !g || /رياض/.test(st)) return;
    out.push({stage: st, grade: g, classes: schoolV31Val_(r, ix, 'عدد الفصول/القاعات'), christians: schoolV31Val_(r, ix, 'مسيحيون'), groups: ix[V69_GRP] != null ? schoolV31Val_(r, ix, V69_GRP) : ''}); });
  return {success: true, rows: out};
}
/** items = [{stage, grade, groups}] — فارغ = غير محدد، 0 = لا يوجد. */
function schoolChrGroupsSetV69(token, items){
  var s = schoolV33Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT'); var sid = String(s.schoolId), want = {};   // V7.1: تُعدَّل في أي وقت (لا تتقيد بقفل شئون الطلاب)
  (items || []).forEach(function(it){ var v = String(it.groups == null ? '' : it.groups).trim(); if (v !== '') { v = v24DigitsLocalV31_(v); if (!/^\d{1,2}$/.test(v)) throw new Error('عدد المجموعات رقم صحيح (0 = لا يوجد) أو فارغ.'); v = Number(v); } want[it.stage + '|' + it.grade] = v; });
  return v35Lock_(function(){
    v50Fresh_(); var sh = v36Sheet_('13_شؤون_الطلاب'); schoolEnsureWorkerColumnV40_(sh, V69_GRP);
    var h = v36Headers_(sh), ix = schoolV31Idx_(h), n = sh.getLastRow() - 1, c = ix[V69_GRP], v = sh.getRange(2, 1, n, h.length).getValues(), col = v.map(function(r){ return [r[c]]; }), ch = 0;
    v.forEach(function(r, i){ if (String(r[ix.schoolId]) !== sid) return; var k = String(r[ix['المرحلة']]) + '|' + String(r[ix['الصف/المستوى']]); if (!(k in want)) return; if (String(col[i][0]) !== String(want[k])) { col[i][0] = want[k]; ch++; } });
    if (ch) { v50A_(sh.getRange(2, c + 1, n, 1).setValues(col)); v50Invalidate_('13_شؤون_الطلاب'); schoolV31Log_(s, 'مجموعات الدين المسيحي', sid, [['صفوف', '', String(ch)]]); }
    return {success: true, message: ch ? 'تم حفظ مجموعات الدين المسيحي (' + ch + ' صف).' : 'لا توجد تغييرات.'};
  });
}
