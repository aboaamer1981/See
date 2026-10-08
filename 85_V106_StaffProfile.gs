/**
 * V7.64 — صفحة «بياناتي» الجديدة لبوابة الموظف.
 *  ثابت (لا يعدله الموظف): الاسم، الرقم القومي، النوع وتاريخ الميلاد (مستخرجان من الرقم القومي)،
 *    الوظيفة الإشرافية (مدرسة/إدارة)، والبيانات المؤثرة في المالية والنصاب، وكود الموظف (تعدله المدرسة).
 *  قابل للتعديل: بيانات التواصل، بيانات العمل، المؤهلات — بقوائم منسدلة وتحقق كامل في الخادم والواجهة.
 *  الحفظ = «تحديث بياناتي» (يحفظ ثم يسجل التحديث في ورقة المتابعة V104).
 *  يحترم فتح/غلق الأقسام من الإدارة (R_أقسام_البيانات_القابلة_للتعديل).
 */
var V106_SIFA = ['مسكن علي الكادر', 'غير مسكن علي الكادر', 'غير مخاطب'];
var V106_GRADES = ['امتياز', 'جيد جدا', 'جيد', 'مقبول'];
var V106_SCHOOL_SUP = ['قيادة أولى', 'قيادة ثانية'];
var V106_FIELDS = [
  {key: 'الهاتف', label: 'رقم الموبايل', section: 'بيانات التواصل', type: 'tel', required: true, hint: '11 رقمًا يبدأ بـ 010 أو 011 أو 012 أو 015'},
  {key: 'البريد', label: 'البريد الإلكتروني', section: 'بيانات التواصل', type: 'email', hint: 'اختياري'},
  {key: 'العنوان', label: 'العنوان', section: 'بيانات التواصل', type: 'text', required: true, wide: true, hint: 'القرية/المدينة — الشارع'},
  {key: 'الصفة', label: 'الصفة', section: 'بيانات العمل', type: 'select', required: true},
  {key: 'المجموعة_النوعية', label: 'المجموعة النوعية', section: 'بيانات العمل', type: 'select', required: true},
  {key: 'المجموعة_الوظيفية', label: 'المجموعة الوظيفية', section: 'بيانات العمل', type: 'select', required: true, dep: 'المجموعة_النوعية'},
  {key: 'تاريخ_التعيين', label: 'تاريخ التعيين', section: 'بيانات العمل', type: 'date', required: true},
  {key: 'تاريخ_الحصول_على_الدرجة', label: 'تاريخ الحصول على الدرجة', section: 'بيانات العمل', type: 'date'},
  {key: 'تاريخ_بدء_العمل', label: 'تاريخ بدء العمل بالجهة الحالية', section: 'بيانات العمل', type: 'date'}
];
var V106_HRP_FIELDS = [
  {key: 'الهاتف', label: 'رقم الموبايل', section: 'بيانات التواصل', type: 'tel', required: true, hint: '11 رقمًا يبدأ بـ 010 أو 011 أو 012 أو 015'},
  {key: 'العنوان', label: 'العنوان', section: 'بيانات التواصل', type: 'text', required: true, wide: true, hint: 'القرية/المدينة — الشارع'}
];

/** النوع وتاريخ الميلاد من الرقم القومي المصري. */
function v106FromNid_(nid){
  var n = v24DigitsLocalV31_(String(nid || ''));
  if (!/^[23]\d{13}$/.test(n)) return null;
  var y = (n[0] === '2' ? 1900 : 2000) + Number(n.substr(1, 2)), m = Number(n.substr(3, 2)), d = Number(n.substr(5, 2)), dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return {birth: y + '-' + ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2), gender: Number(n[12]) % 2 ? 'ذكر' : 'أنثى', year: y};
}
function v106Age_(iso){ if (!iso) return ''; var b = new Date(iso + 'T00:00:00'), t = new Date(), a = t.getFullYear() - b.getFullYear(); if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--; return a; }
function v106Today_(){ return Utilities.formatDate(new Date(), 'Africa/Cairo', 'yyyy-MM-dd'); }

/** قوائم المجموعات من بيانات 01_الأساسي نفسها (القيم المستخدمة فعلًا مرتين أو أكثر). */
function v106GroupLists_(){
  var d = v24Data_('01_الأساسي'), i = v42Idx_(d.headers), cnt = {}, map = {};
  d.rows.forEach(function(r){ var a = v42Val_(r, i, 'المجموعة_النوعية'), b = v42Val_(r, i, 'المجموعة_الوظيفية'); if (!a || !b) return; var k = a + '\u0001' + b; cnt[k] = (cnt[k] || 0) + 1; });
  Object.keys(cnt).forEach(function(k){ if (cnt[k] < 2) return; var p = k.split('\u0001'); (map[p[0]] = map[p[0]] || []).push(p[1]); });
  Object.keys(map).forEach(function(k){ map[k].sort(); });
  return {types: Object.keys(map).sort(), map: map};
}
function v106QualNames_(){
  var d = v24Data_('05_المؤهلات'), i = v42Idx_(d.headers), c = {};
  d.rows.forEach(function(r){ var q = v42Val_(r, i, 'المؤهل'); if (q) c[q] = (c[q] || 0) + 1; });
  return Object.keys(c).filter(function(k){ return c[k] >= 3; }).sort(function(a, b){ return c[b] - c[a]; }).slice(0, 80);
}

function staffProfileV106(token){ var r = staffProfileCoreV106_(token); try { var j = staffJobV105(token); r.job = {current: j.current || [], history: j.history || [], moves: j.moves || []}; } catch (e) { console.error('staffProfileV106 job: ' + e.message); r.job = null; } return r; }   // V7.65: وضعي الوظيفي داخل «بياناتي»
function staffProfileCoreV106_(token){
  var s = v104AnySession_(token), closed = v42ClosedSections_(), names = v42SchoolNames_(), st = v104Status_(s.employeeId);
  var open = {'بيانات التواصل': !closed['بيانات التواصل'], 'بيانات العمل': !closed['بيانات العمل'], 'المؤهلات': !closed['المؤهلات']};
  if (s.role === 'معلم حصة') {
    var h = v104FindHrpByNid_(s.username); if (!h) throw new Error('بيانات معلم الحصة غير موجودة.');
    var hr = h.row, hi = h.idx, hn = v106FromNid_(v42Val_(hr, hi, 'الرقم_القومي'));
    return {success: true, kind: 'hrp', tracking: st, open: open,
      fixed: {name: v42Val_(hr, hi, 'الاسم'), nationalId: v42Val_(hr, hi, 'الرقم_القومي'), gender: hn ? hn.gender : v42Val_(hr, hi, 'النوع'), birth: hn ? hn.birth : v35Date_(v42Val_(hr, hi, 'تاريخ_الميلاد')), age: v106Age_(hn ? hn.birth : v35Date_(v42Val_(hr, hi, 'تاريخ_الميلاد'))), fromNid: !!hn},
      sup: null,
      locked: [['الفئة', v42Val_(hr, hi, 'نوع_الفئة')], ['مادة التدريس', v42Val_(hr, hi, 'مادة_التدريس')], ['المدرسة الأصلية', names[v42Val_(hr, hi, 'originalSchoolId')] || '']],
      fields: V106_HRP_FIELDS.filter(function(f){ return hi[f.key] != null; }).map(function(f){ return v106Field_(f, v42Val_(hr, hi, f.key)); }),
      lists: {}, quals: null};
  }
  var b = v42FindBasicByNid_(s.username); if (!b) throw new Error('بيانات الموظف غير موجودة.');
  var r = b.row, i = b.idx, fn = v106FromNid_(v42Val_(r, i, 'الرقم_القومي')), sup = v42Val_(r, i, 'الوظيفة_الإشرافية'), dept = v42Val_(r, i, 'القسم');
  var birth = fn ? fn.birth : v35Date_(v42Val_(r, i, 'تاريخ_الميلاد'));
  var supInfo = null;
  if (sup) supInfo = {job: sup, level: V106_SCHOOL_SUP.indexOf(sup) >= 0 ? 'مدرسة' : 'إدارة', place: V106_SCHOOL_SUP.indexOf(sup) >= 0 ? (names[v42Val_(r, i, 'originalSchoolId')] || '') : (dept || 'الإدارة التعليمية')};
  var subjSup = v42Val_(r, i, 'مشرف_على_المادة') === 'نعم';
  var groups = v106GroupLists_(), q = v36QualList_(s.employeeId);
  return {success: true, kind: 'basic', tracking: st, open: open,
    fixed: {name: v42Val_(r, i, 'الاسم'), nationalId: v42Val_(r, i, 'الرقم_القومي'), gender: fn ? fn.gender : v42Val_(r, i, 'النوع'), birth: birth, age: v106Age_(birth), fromNid: !!fn},
    sup: {main: supInfo, subjectSupervisor: subjSup ? (v42Val_(r, i, 'مادة_التدريس') || 'نعم') : ''},
    locked: [['كود الموظف', v42Val_(r, i, 'كود_الموظف')], ['المسمى الوظيفي', v42Val_(r, i, 'المسمى_الوظيفي')], ['الدرجة المالية', v42Val_(r, i, 'الدرجة_المالية')], ['نظام العمل', v42Val_(r, i, 'نظام_العمل')], ['مادة التدريس', v42Val_(r, i, 'مادة_التدريس')], ['المرحلة التعليمية', v42Val_(r, i, 'المرحلة_التعليمية_الأصلية')], ['نوع التعليم', v42Val_(r, i, 'نوع التعليم')], ['جهة العمل الأصلية', names[v42Val_(r, i, 'originalSchoolId')] || '']],
    fields: V106_FIELDS.filter(function(f){ return i[f.key] != null; }).map(function(f){ return v106Field_(f, v42Val_(r, i, f.key)); }),
    lists: {'الصفة': V106_SIFA, 'المجموعة_النوعية': groups.types, groupMap: groups.map},
    quals: {rows: q.rows.map(function(x){ return {row: x._row, 'نوع_المؤهل': x['نوع_المؤهل'], 'المؤهل': x['المؤهل'], 'التخصص': x['التخصص'], 'السنة': x['السنة'], 'التقدير': x['التقدير'], 'النسبة': x['النسبة'], 'الدبلومة_التربوية': x['الدبلومة_التربوية'], 'سنة_الدبلومة': x['سنة_الدبلومة'], 'التسوية_بالمؤهل_الأعلى': x['التسوية_بالمؤهل_الأعلى']}; }), types: V36_QUAL_TYPES, grades: V106_GRADES, names: v106QualNames_()}};
}
function v106Field_(f, v){ var o = {}; for (var k in f) o[k] = f[k]; o.value = f.type === 'date' ? v35Date_(v) : (f.type === 'tel' ? v24DigitsLocalV31_(v) : v); return o; }

/** التحقق — نفس القواعد في الواجهة. يرجع رسالة الخطأ الأولى أو ''. */
function v106CheckField_(f, v, ctx){
  v = String(v == null ? '' : v).trim();
  if (!v) return f.required ? 'هذا الحقل مطلوب.' : '';
  if (v.length > 200) return 'القيمة طويلة جدًا.';
  if (f.type === 'tel' && !/^01[0125]\d{8}$/.test(v)) return 'رقم موبايل غير صحيح — 11 رقمًا يبدأ بـ 010/011/012/015.';
  if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'بريد إلكتروني غير صحيح.';
  if (f.key === 'العنوان' && v.length < 5) return 'اكتب العنوان بشكل أوضح.';
  if (f.key === 'الصفة' && V106_SIFA.indexOf(v) < 0) return 'اختر من القائمة.';
  if (f.key === 'المجموعة_النوعية' && ctx.groups.types.indexOf(v) < 0) return 'اختر من القائمة.';
  if (f.key === 'المجموعة_الوظيفية' && (ctx.groups.map[ctx.val['المجموعة_النوعية']] || []).indexOf(v) < 0) return 'اختر مجموعة وظيفية تابعة للمجموعة النوعية المختارة.';
  if (f.type === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(new Date(v + 'T00:00:00').getTime())) return 'تاريخ غير صحيح.';
    if (v > ctx.today) return 'لا يمكن أن يكون التاريخ في المستقبل.';
    if (ctx.birth && v < ctx.birthPlus18) return 'التاريخ قبل بلوغ 18 سنة من تاريخ الميلاد.';
    var app = ctx.val['تاريخ_التعيين'];
    if (f.key !== 'تاريخ_التعيين' && app && /^\d{4}-\d{2}-\d{2}$/.test(app) && v < app) return 'لا يمكن أن يسبق تاريخ التعيين.';
  }
  return '';
}
function v106CheckQual_(q, birthYear){
  var y = new Date().getFullYear(), e = {};
  if (!String(q['نوع_المؤهل'] || '').trim()) e['نوع_المؤهل'] = 'اختر نوع المؤهل.';
  else if (V36_QUAL_TYPES.indexOf(String(q['نوع_المؤهل']).trim()) < 0) e['نوع_المؤهل'] = 'اختر من القائمة.';
  if (!String(q['المؤهل'] || '').trim()) e['المؤهل'] = 'اكتب اسم المؤهل.';
  ['السنة', 'سنة_الدبلومة'].forEach(function(k){ var v = String(q[k] == null ? '' : q[k]).trim(); if (!v) return; var n = Number(v); if (!/^\d{4}$/.test(v) || n < 1950 || n > y) e[k] = 'سنة من 4 أرقام بين 1950 و' + y + '.'; else if (birthYear && n < birthYear + 14) e[k] = 'السنة لا تتفق مع تاريخ الميلاد.'; });
  var pc = String(q['النسبة'] == null ? '' : q['النسبة']).replace('%', '').trim(); if (pc && (isNaN(Number(pc)) || Number(pc) < 0 || Number(pc) > 100)) e['النسبة'] = 'النسبة بين 0 و100.';
  var g = String(q['التقدير'] || '').trim(); if (g && V106_GRADES.indexOf(g) < 0) e['التقدير'] = 'اختر من القائمة.';
  var dp = String(q['الدبلومة_التربوية'] || '').trim(); if (['', 'نعم', 'لا'].indexOf(dp) < 0) e['الدبلومة_التربوية'] = 'اختر نعم أو لا.';
  if (dp === 'نعم' && !String(q['سنة_الدبلومة'] || '').trim()) e['سنة_الدبلومة'] = 'اكتب سنة الدبلومة.';
  return e;
}

/** «تحديث بياناتي»: payload = {fields:{key:value}, quals:[{row?, ...}]}. يتحقق من الكل أولًا ثم يكتب. */
function staffSaveProfileV106(token, payload){
  var s = v104AnySession_(token), p = payload || {}, pf = p.fields || {}, closed = v42ClosedSections_(), hrp = s.role === 'معلم حصة';
  var spec = hrp ? V106_HRP_FIELDS : V106_FIELDS, rec, sheetName;
  if (hrp) { rec = v104FindHrpByNid_(s.username); sheetName = '05_معلمو_الحصة_والمعاش'; if (!rec) throw new Error('بيانات معلم الحصة غير موجودة.'); }
  else { rec = v42FindBasicByNid_(s.username); sheetName = '01_الأساسي'; if (!rec || rec.rowIndex < 2) throw new Error('بيانات الموظف غير موجودة.'); }
  var i = rec.idx, r = rec.row, fn = v106FromNid_(v42Val_(r, i, 'الرقم_القومي'));
  var birth = fn ? fn.birth : v35Date_(v42Val_(r, i, 'تاريخ_الميلاد'));
  var b18 = birth ? (Number(birth.slice(0, 4)) + 18) + birth.slice(4) : '';
  var groups = hrp ? {types: [], map: {}} : v106GroupLists_();
  var val = {}, active = spec.filter(function(f){ return i[f.key] != null && !closed[f.section]; });
  spec.forEach(function(f){ if (i[f.key] == null) return; var nv = (!closed[f.section] && pf[f.key] !== undefined) ? pf[f.key] : v42Val_(r, i, f.key); nv = String(nv == null ? '' : nv).trim(); if (f.type === 'tel') nv = v24DigitsLocalV31_(nv); if (f.type === 'date') nv = v35Date_(nv) || nv; val[f.key] = nv; });
  var ctx = {groups: groups, val: val, today: v106Today_(), birth: birth, birthPlus18: b18};
  active.forEach(function(f){ var e = v106CheckField_(f, val[f.key], ctx); if (e) throw new Error((f.label || f.key) + ': ' + e); });
  var quals = (!hrp && !closed['المؤهلات'] && Array.isArray(p.quals)) ? p.quals : [];
  var mine = {}; if (quals.length) v36QualList_(s.employeeId).rows.forEach(function(x){ mine[x._row] = x; });
  quals.forEach(function(q, n){ var e = v106CheckQual_(q, fn ? fn.year : 0), k = Object.keys(e)[0]; if (k) throw new Error('المؤهل رقم ' + (n + 1) + ' — ' + k.replace(/_/g, ' ') + ': ' + e[k]); if (q.row && !mine[q.row]) throw new Error('المؤهل رقم ' + (n + 1) + ' لا يخصك أو تم تغييره — حدّث الصفحة.'); });

  // الكتابة: صف الموظف (تحت قفل) ثم المؤهلات (كل مؤهل بقفله في v36SaveQualCore_) ثم تسجيل التحديث.
  var changes = v35Lock_(function(){
    var cur = hrp ? v104FindHrpByNid_(s.username) : v42FindBasicByNid_(s.username), ci = cur.idx, cr = cur.row, upd = {}, ch = [];
    active.forEach(function(f){ var ov = String(v42Val_(cr, ci, f.key) || '').trim(), nv = val[f.key]; if (f.type === 'date' && v35Date_(ov) === nv) return; if (nv !== ov) { upd[ci[f.key] + 1] = nv; ch.push([f.key, ov, nv]); } });
    if (fn) { // ثوابت مستخرجة من الرقم القومي
      if (ci['النوع'] != null && v42Val_(cr, ci, 'النوع') !== fn.gender) { upd[ci['النوع'] + 1] = fn.gender; ch.push(['النوع', v42Val_(cr, ci, 'النوع'), fn.gender]); }
      if (ci['تاريخ_الميلاد'] != null && v35Date_(v42Val_(cr, ci, 'تاريخ_الميلاد')) !== fn.birth) { upd[ci['تاريخ_الميلاد'] + 1] = fn.birth; ch.push(['تاريخ_الميلاد', v42Val_(cr, ci, 'تاريخ_الميلاد'), fn.birth]); }
    }
    if (ch.length) { v50WriteRow_(personnelSS_().getSheetByName(sheetName), cur.rowIndex, upd); v42Audit_(s.employeeId, 'تحديث بياناتي', ch.map(function(c){ return c[0] + ': ' + c[1]; }).join(' | '), ch.map(function(c){ return c[0] + ': ' + c[2]; }).join(' | '), s.username); }
    return ch.length;
  });
  var qn = 0;
  quals.forEach(function(q){
    var data = {}; ['نوع_المؤهل', 'المؤهل', 'التخصص', 'السنة', 'التقدير', 'النسبة', 'الدبلومة_التربوية', 'سنة_الدبلومة'].forEach(function(k){ if (q[k] !== undefined) data[k] = String(q[k] == null ? '' : q[k]).trim(); });
    if (data['الدبلومة_التربوية'] !== 'نعم') data['سنة_الدبلومة'] = '';
    if (q.row) { var o = mine[q.row], same = Object.keys(data).every(function(k){ return String(o[k] || '').trim() === data[k]; }); if (same) return; }
    var res = v36SaveQualCore_({username: s.username, school: 'بوابة الموظف'}, s.employeeId, q.row || 0, data, 'بوابة الموظف'); if (!q.row || (res && res.changed)) qn++;
  });
  var mark = v104MarkUpdated_(s);
  var total = changes + qn;
  return {success: true, message: total ? 'تم تحديث بياناتك (' + total + ' تعديل) وتسجيل عملية التحديث.' : 'تم تأكيد بياناتك وتسجيل عملية التحديث.', changed: total, updatedAt: mark.updatedAt, updateCount: mark.count};
}
