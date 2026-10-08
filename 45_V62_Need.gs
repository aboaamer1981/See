/** V6.2 — خطة الدراسة (نصاب المواد الأسبوعي) + العجز والزيادة.
 *  R_خطة_الدراسة هي المصدر الوحيد لنصاب المادة: المرحلة + الصف + المادة معًا (لا استعارة من صف أو مرحلة أخرى).
 *  النصاب "0" = المادة غير مطلوبة لهذا الصف. الخانة الفارغة = غير محدد (لا تتحول إلى صفر، وتظهر كتنبيه).
 *  «مادة_التدريس_المقابلة» = مادة المعلم التي تغطي هذا السطر (يمكن أكثر من مادة مفصولة بـ |). تعدّلها الإدارة.
 *  المطلوب (حصة/أسبوع) = Σ فصول الصف × نصاب المادة للصف. الموجود أساسي = Σ النصاب الأسبوعي القانوني لمعلمي المادة (بعد خصم الإشراف).
 *  سد بالحصة = حصص معلمي الحصة/المعاش النشطة في المدرسة لنفس المادة (عدد_الحصص_المطلوب أسبوعيًا). */
var V62_PLAN_SHEET = 'R_خطة_الدراسة';
var V62_PLAN_HEAD = ['planId', 'المرحلة', 'الصف_المستوى', 'المادة', 'النصاب_الأسبوعي', 'مادة_التدريس_المقابلة', 'مفعلة', 'ملاحظات'];
/** البيانات المرجعية كما أعطاها المستخدم (لا تُعدَّل إلا بتعليمات صريحة). null = غير محدد. */
var V62_SEED = (function(){
  var P = [], g13 = ['الأول', 'الثاني', 'الثالث'], g46 = ['الرابع', 'الخامس', 'السادس'];
  function add(stage, grade, subj, n, map){ P.push([stage, grade, subj, n, map || subj]); }
  g13.forEach(function(g){
    add('ابتدائي', g, 'اللغة العربية', 14, 'الصفوف الأولى'); add('ابتدائي', g, 'اللغة الإنجليزية', 5); add('ابتدائي', g, 'الرياضيات', 7, 'الصفوف الأولى');
    add('ابتدائي', g, 'التربية الدينية', 5, 'الصفوف الأولى'); add('ابتدائي', g, 'التربية البدنية والصحية', 2);
  });
  g46.forEach(function(g){
    add('ابتدائي', g, 'اللغة العربية', 13); add('ابتدائي', g, 'اللغة الإنجليزية', 4); add('ابتدائي', g, 'الرياضيات', 6); add('ابتدائي', g, 'العلوم', 3);
    add('ابتدائي', g, 'الدراسات الاجتماعية', 3); add('ابتدائي', g, 'التربية الدينية', 4, 'اللغة العربية'); add('ابتدائي', g, 'التربية الفنية', 2);
    add('ابتدائي', g, 'تكنولوجيا الاتصالات والمعلومات', 1, 'الحاسب الآلي وتكنولوجيا المعلومات'); add('ابتدائي', g, 'المجالات', 1, 'المجال الصناعي|التربية الزراعية|الاقتصاد المنزلي');
    add('ابتدائي', g, 'التربية الموسيقية', 1); add('ابتدائي', g, 'التربية البدنية والصحية', 2);
  });
  var prepEn = {'الأول': 5, 'الثاني': 6, 'الثالث': 6};
  g13.forEach(function(g){
    add('إعدادي', g, 'اللغة العربية', 11); add('إعدادي', g, 'اللغة الإنجليزية', prepEn[g]); add('إعدادي', g, 'الرياضيات', 6);
    add('إعدادي', g, 'العلوم', 4); add('إعدادي', g, 'الدراسات الاجتماعية', 4);
  });
  var S = {
    'الأول': [['اللغة العربية', 8], ['اللغة الإنجليزية', 4], ['الرياضيات', 5], ['التاريخ', 4], ['الجغرافيا', 0], ['الكيمياء', null], ['الأحياء', 0], ['الفيزياء', null], ['العلوم المتكاملة', 5]],
    'الثاني': [['اللغة العربية', 6], ['اللغة الإنجليزية', 6], ['الرياضيات', 6], ['التاريخ', 6], ['الجغرافيا', 0], ['الكيمياء', 6], ['الأحياء', 0], ['الفيزياء', 6]],
    'الثالث': [['اللغة العربية', 0], ['اللغة الإنجليزية', 0], ['الرياضيات', 5], ['التاريخ', 5], ['الجغرافيا', 6], ['الكيمياء', 5], ['الأحياء', 5], ['الفيزياء', 5]]
  };
  var smap = {'التاريخ': 'التاريخ|الدراسات الاجتماعية', 'الجغرافيا': 'الجغرافيا|الدراسات الاجتماعية', 'العلوم المتكاملة': 'العلوم|الكيمياء|الفيزياء|الأحياء'};
  g13.forEach(function(g){ S[g].forEach(function(x){ add('ثانوي', g, x[0], x[1], smap[x[0]]); }); });
  return P;
})();

function v62PlanSheet_(){
  var ss = personnelSS_(), sh = ss.getSheetByName(V62_PLAN_SHEET);
  if (!sh) {
    sh = v50A_(ss.insertSheet(V62_PLAN_SHEET));
    var rows = [V62_PLAN_HEAD].concat(V62_SEED.map(function(x, i){ return ['PLAN_' + ('00' + (i + 1)).slice(-3), x[0], x[1], x[2], x[3] == null ? '' : x[3], x[4], 'نعم', x[3] == null ? 'غير محدد في المرجع' : '']; }));
    v50A_(sh.getRange(1, 1, rows.length, V62_PLAN_HEAD.length).setValues(rows));
    try { sh.setRightToLeft(true); sh.setFrozenRows(1); } catch (e) {}
  }
  return sh;
}
/** [{id,stage,grade,subject,periods(null=غير محدد),map:[...],active,row}] */
function v62Plan_(){
  v62PlanSheet_();
  var d = v56Read_(V62_PLAN_SHEET), ix = d.ix;
  return d.vals.map(function(r, i){
    var p = String(schoolV31Val_(r, ix, 'النصاب_الأسبوعي') || '').trim(), m = String(schoolV31Val_(r, ix, 'مادة_التدريس_المقابلة') || '').trim(), subj = schoolV31Val_(r, ix, 'المادة');
    return {id: schoolV31Val_(r, ix, 'planId'), stage: schoolV31Val_(r, ix, 'المرحلة'), grade: schoolV31Val_(r, ix, 'الصف_المستوى'), subject: subj,
      periods: p === '' ? null : Number(v24DigitsLocalV31_(p)), map: (m || subj).split('|').map(function(x){ return x.trim(); }).filter(Boolean),
      active: String(schoolV31Val_(r, ix, 'مفعلة') || 'نعم').trim() !== 'لا', notes: schoolV31Val_(r, ix, 'ملاحظات'), row: i + 2};
  }).filter(function(x){ return x.stage && x.grade && x.subject; });
}

/* ---------- الحساب ---------- */
function v62Calc_(schoolFilter, groupFilter){
  var plan = v62Plan_().filter(function(p){ return p.active; }), names = v42SchoolNames_();
  var quotas = v36QuotaTable_(), D = v61Data_();
  // الفصول لكل مدرسة/مرحلة/صف
  var st = v24Data_('13_شؤون_الطلاب'), si = schoolV31Idx_(st.headers), cls = {}, schStage = {};
  st.rows.forEach(function(r){
    var sid = schoolV31Val_(r, si, 'schoolId'); if (!sid || !schoolFilter(sid)) return;
    var c = v36Int_(schoolV31Val_(r, si, 'عدد الفصول/القاعات')) || 0; if (!c) return;
    var s = schoolV31Val_(r, si, 'المرحلة'), g = schoolV31Val_(r, si, 'الصف/المستوى');
    cls[sid + '|' + s + '|' + g] = (cls[sid + '|' + s + '|' + g] || 0) + c; (schStage[sid] = schStage[sid] || {})[s] = 1;
  });
  // المجموعات (المادة المقابلة) بترتيب الخطة
  var groupOrder = [], groupOf = {}, keyOf = function(p){ return p.map.join(' | '); };
  plan.forEach(function(p){ var k = keyOf(p); if (!groupOf[k]) { groupOf[k] = {key: k, subjects: p.map, planSubjects: {}}; groupOrder.push(k); } groupOf[k].planSubjects[p.subject] = 1; });
  // V6.9: التربية الدينية المسيحية — مجموعة مستقلة (المطلوب = مجموعات المدرسة × نصاب «التربية الدينية» للصف)
  if (!groupOf[V69_CHR]) { groupOf[V69_CHR] = {key: V69_CHR, subjects: [V69_CHR], planSubjects: {}}; groupOf[V69_CHR].planSubjects[V69_CHR] = 1; groupOrder.push(V69_CHR); }
  var out = {}, warnings = {};
  function cell(sid, k){ var o = out[sid] = out[sid] || {}; return o[k] = o[k] || {group: k, need: 0, supply: 0, hrp: 0, teachers: [], hrpList: [], detail: [], undefinedRows: [], noQuota: 0}; }
  // المطلوب
  Object.keys(cls).forEach(function(key){
    var p3 = key.split('|'), sid = p3[0], s = p3[1], g = p3[2], c = cls[key];
    plan.forEach(function(p){
      if (p.stage !== s || p.grade !== g || p.subject === V69_CHR) return;   // V6.9: الدين المسيحي بالمجموعات لا بالفصول
      var k = keyOf(p); if (groupFilter && !groupFilter(k, p)) return;
      var x = cell(sid, k);
      if (p.periods === null || isNaN(p.periods)) { x.undefinedRows.push(s + ' / ' + g + ' / ' + p.subject); return; }
      if (!p.periods) return;
      x.need += c * p.periods; x.detail.push({stage: s, grade: g, subject: p.subject, classes: c, periods: p.periods, total: c * p.periods});
    });
  });
  // V6.9: مطلوب الدين المسيحي
  if (!groupFilter || groupFilter(V69_CHR, {subject: V69_CHR})) {
    var relP = {}; var relC = {}; v62Plan_().forEach(function(p){ if (!p.active) return; if (p.subject === V69_REL_PLAN) relP[p.stage + '|' + p.grade] = p.periods; if (p.subject === V69_CHR) relC[p.stage + '|' + p.grade] = p.periods; }); 
    st.rows.forEach(function(r){
      var sid = schoolV31Val_(r, si, 'schoolId'); if (!sid || !schoolFilter(sid)) return;
      var s = schoolV31Val_(r, si, 'المرحلة'), g = schoolV31Val_(r, si, 'الصف/المستوى'); if (!s || !g || /رياض/.test(s)) return;
      var chr = v36Int_(schoolV31Val_(r, si, 'مسيحيون')) || 0, gs = si[V69_GRP] != null ? String(schoolV31Val_(r, si, V69_GRP) || '').trim() : '';
      if (gs === '') { if (chr > 0) cell(sid, V69_CHR).undefinedRows.push(s + ' / ' + g + ': ' + chr + ' طالب مسيحي — عدد المجموعات غير محدد'); return; }
      var ng = Number(gs) || 0; if (!ng) return;
      var per = relC[s + '|' + g] != null ? relC[s + '|' + g] : (/ابتدائي/.test(s) ? relP[s + '|' + g] : 3);   // V7.1: الابتدائي = نصاب التربية الدينية للصف؛ الإعدادي والثانوي = 3 لكل مجموعة if (per === undefined || per === null || isNaN(per)) { cell(sid, V69_CHR).undefinedRows.push(s + ' / ' + g + ': نصاب الدين المسيحي للصف غير محدد في «أنصبة المواد»'); return; }
      var x = cell(sid, V69_CHR); x.need += ng * per; x.detail.push({stage: s, grade: g, subject: V69_CHR, classes: ng, periods: per, total: ng * per, unit: 'مجموعة'});
    });
  }
  // الموجود أساسي: كل معلم يُحسب مرة واحدة في أول مجموعة تقبل مادته (بترتيب الخطة) ولها احتياج في مدرسته
  function stageOfSchool(sid, t){ if (t.stage) return t.stage; var ss = Object.keys(schStage[sid] || {}); return ss.length === 1 ? ss[0] : (ss.indexOf('ابتدائي') >= 0 ? 'ابتدائي' : ss[0] || ''); }
  function pickGroup(sid, subj){
    var cand = groupOrder.filter(function(k){ return groupOf[k].subjects.indexOf(subj) >= 0 && (!groupFilter || groupFilter(k)); });
    if (!cand.length) return null;
    var withNeed = cand.filter(function(k){ return out[sid] && out[sid][k] && out[sid][k].need > 0; });
    return (withNeed[0] || cand[0]);
  }
  // V6.8: توزيع النصاب حسب العلاقات النشطة + إقرارات الحصر: الأصلية = النصاب − حصص الندب الجزئي، والمستقبِلة = حصص الندب.
  var AL = v68Alloc_(), SP = v69Splits_();
  function warn(sid, k){ var w = warnings[sid] = warnings[sid] || {noSubject: 0}; w[k] = (w[k] || 0) + 1; }
  D.list.forEach(function(t){
    if (!t.teacher || t.working === false || (t.away && !AL[t.eid])) return;
    if (V40_SCHOOL_ASSIGNMENTS[String(t.sup || '').trim()]) return;   // V7.1: القيادة الأولى/الثانية ليس لها تدريس
    var al = AL[t.eid] || {home: '', parts: {}}, home = al.home || t.sid;
    if (al.out && al.out[home]) return;   // V6.8: المدرسة أقرت في الحصر أنه لا يعمل بها (ندب كلي خارج الإدارة/إجازة/…)
    var parts = Object.keys(al.parts).map(function(k){ return al.parts[k]; }).filter(function(p){ return String(p.sid) !== String(home); });
    var touches = (home && schoolFilter(home)) || parts.some(function(p){ return schoolFilter(p.sid); });
    if (!touches) return;
    if (!t.subject) { if (home && schoolFilter(home)) warn(home, 'noSubject'); return; }
    var stg = stageOfSchool(home, t), q = quotas[t.job + '|' + stg] || quotas['معلم|' + stg], wk = 0;
    if (q) wk = q.weekly - (t.supSubject ? (q.supervisorDeduction || 0) : 0);
    var used = 0; parts.forEach(function(p){ used += p.known ? p.p : 0; }); if (al.externalPart && al.externalPart.known) used += al.externalPart.p;
    function put1(sid, subj, n, note){ var k = pickGroup(sid, subj); if (!k) return; var x = cell(sid, k); if (!q && String(sid) === String(home) && subj === t.subject) x.noQuota++; x.supply += n; x.teachers.push({name: t.name, job: t.job, quota: n, note: note || ''}); }
    function put(sid, n, note){   // V6.9: توزيع حصص هذه المدرسة على المواد؛ الباقي لمادته
      if (!sid || !schoolFilter(sid)) return;
      var l = SP.basic[t.eid + '|' + sid] || [], rest = n;
      l.forEach(function(it){ var m = Math.min(it.n, Math.max(0, rest)); if (!m) return; rest -= m; put1(sid, it.subject, m, (note ? note + ' · ' : '') + 'من نصاب ' + t.subject); });
      put1(sid, t.subject, rest, note + (l.length ? (note ? ' · ' : '') + 'وله: ' + l.map(function(it){ return it.subject + ' ' + it.n; }).join('، ') : ''));
    }
    var hn = parts.length ? 'منتدب جزئيًا إلى: ' + parts.map(function(p){ return (names[p.sid] || p.sid) + ' (' + (p.known ? p.p + ' حصة' + (p.d ? '، ' + p.d + ' يوم' : '') : 'الحصص غير محددة') + (p.pending ? ' — إقرار الحصر' : '') + ')'; }).join('، ') : '';
    if (al.externalPart) hn = (hn ? hn + ' · ' : '') + 'منتدب جزئيًا خارج الإدارة إلى: ' + (al.externalPart.place || 'جهة خارج الإدارة') + (al.externalPart.known ? ' (' + al.externalPart.p + ' حصة' + (al.externalPart.d ? '، ' + al.externalPart.d + ' يوم' : '') + ')' : ' — الحصص غير محددة');
    if (al.pending) hn = (hn ? hn + ' · ' : '') + ({OUT_FULL_IN: 'منتدب إلينا كليًا', TR_IN: 'منقول إلينا', IN_FULL_IN: 'منتدب إلينا كليًا'}[al.pending] || '') + ' — إقرار الحصر بانتظار المدرسة الأخرى';
    if (home) put(home, Math.max(0, wk - used), hn);
    parts.forEach(function(p){
      put(p.sid, p.known ? p.p : 0, 'منتدب إلينا جزئيًا من ' + (names[home] || home || '—') + (p.known ? ' (' + p.p + ' حصة' + (p.d ? '، ' + p.d + ' يوم' : '') + ')' : ' — الحصص غير محددة') + (p.pending ? ' — إقرار الحصر' : ''));
      if (!p.known) { if (schoolFilter(p.sid)) warn(p.sid, 'partNoPeriods'); if (home && schoolFilter(home)) warn(home, 'partNoPeriods'); }
    });
  });
  // سد بالحصة
  try {
    var hp = v24Data_('05_معلمو_الحصة_والمعاش'), hi = schoolV31Idx_(hp.headers), hs = {};
    hp.rows.forEach(function(r){ if (schoolV31Val_(r, hi, 'حالة_السجل') === 'غير قائم') return; hs[schoolV31Val_(r, hi, 'hrpId')] = {name: schoolV31Val_(r, hi, 'الاسم'), subject: schoolV31Val_(r, hi, 'مادة_التدريس'), cat: schoolV31Val_(r, hi, 'نوع_الفئة')}; });
    var hr = v24Data_('06_علاقات_معلمي_الحصة'), hri = schoolV31Idx_(hr.headers); var spDone = {};
    hr.rows.forEach(function(r){
      if (!v36ActiveRel_(schoolV31Val_(r, hri, 'الحالة'))) return;
      var hid = schoolV31Val_(r, hri, 'hrpId'), sid = schoolV31Val_(r, hri, 'schoolId'), h = hs[hid]; if (!h || !sid || !schoolFilter(sid)) return;
      var n = v36Int_(schoolV31Val_(r, hri, 'عدد_الحصص_المطلوب')) || 0, l = spDone[hid + '|' + sid] ? [] : (SP.hrp[hid + '|' + sid] || []), rest = n; spDone[hid + '|' + sid] = 1;   // V6.9: التوزيع على المواد
      if (!h.subject && !l.length) return;
      l.forEach(function(it){ var m = Math.min(it.n, Math.max(0, rest)); if (!m) return; rest -= m; var k2 = pickGroup(sid, it.subject); if (!k2) return; var x2 = cell(sid, k2); x2.hrp += m; x2.hrpList.push({name: h.name, cat: h.cat, periods: m, note: 'من حصص ' + (h.subject || '—')}); });
      if (!h.subject || rest <= 0) return;
      var k = pickGroup(sid, h.subject); if (!k) return;
      var x = cell(sid, k); x.hrp += rest; x.hrpList.push({name: h.name, cat: h.cat, periods: rest, note: l.length ? 'وله: ' + l.map(function(it){ return it.subject + ' ' + it.n; }).join('، ') : ''});
    });
  } catch (e) {}
  // النتائج
  var rows = [];
  Object.keys(out).forEach(function(sid){
    Object.keys(out[sid]).forEach(function(k){
      var x = out[sid][k]; if (!x.need && !x.supply && !x.hrp && !x.undefinedRows.length) return;
      x.sid = sid; x.school = names[sid] || sid; x.subjects = Object.keys(groupOf[k].planSubjects).join('، ');
      x.deficit = Math.max(0, x.need - x.supply); x.hrpUsed = Math.min(x.hrp, x.deficit); x.remain = Math.max(0, x.need - x.supply - x.hrp); x.surplus = Math.max(0, x.supply + x.hrp - x.need);
      var q = quotas['معلم|' + (stageOfSchool(sid, {}) || 'ابتدائي')]; x.ref = q ? q.weekly : 24;
      rows.push(x);
    });
  });
  return {rows: rows, groups: groupOrder.map(function(k){ return {key: k, subjects: Object.keys(groupOf[k].planSubjects)}; }), warnings: warnings};
}
function v62Totals_(rows){
  var g = {};
  rows.forEach(function(x){ var o = g[x.group] = g[x.group] || {group: x.group, subjects: x.subjects, need: 0, supply: 0, hrp: 0, deficit: 0, remain: 0, surplus: 0, schoolsDef: 0, schoolsSur: 0, ref: x.ref, undef: 0};
    ['need', 'supply', 'hrp', 'deficit', 'remain', 'surplus'].forEach(function(k){ o[k] += x[k]; }); if (x.remain > 0) o.schoolsDef++; if (x.surplus > 0) o.schoolsSur++; o.undef += x.undefinedRows.length; });
  return Object.keys(g).map(function(k){ return g[k]; }).sort(function(a, b){ return b.remain - a.remain || b.need - a.need; });
}
function v62Out_(c, full){
  var rows = c.rows.map(function(x){ var o = {sid: x.sid, school: x.school, group: x.group, subjects: x.subjects, need: x.need, supply: x.supply, deficit: x.deficit, hrp: x.hrp, remain: x.remain, surplus: x.surplus, ref: x.ref, teachersN: x.teachers.length, hrpN: x.hrpList.length, undef: x.undefinedRows, noQuota: x.noQuota};
    if (full) { o.detail = x.detail; o.teachers = x.teachers; o.hrpList = x.hrpList; } return o; });
  var noSub = 0, partNo = 0; Object.keys(c.warnings).forEach(function(k){ noSub += c.warnings[k].noSubject || 0; partNo += c.warnings[k].partNoPeriods || 0; });
  return {success: true, rows: rows, totals: v62Totals_(c.rows), noSubjectTeachers: noSub, partNoPeriods: partNo, warnings: c.warnings};
}

/* ---------- نقاط الدخول ---------- */
function adminNeedV62(token){ v35Admin_(token); return v62Out_(v62Calc_(function(){ return true; }), false); }
function adminNeedSchoolV62(token, sid){ v35Admin_(token); var r = v62Out_(v62Calc_(function(x){ return String(x) === String(sid); }), true); r.school = v42SchoolNames_()[sid] || sid; return r; }
function schoolNeedV62(token){ var s = schoolV33Session_(token), sid = String(s.schoolId); var r = v62Out_(v62Calc_(function(x){ return String(x) === sid; }), true); r.school = s.school || ''; return r; }
function deptNeedV62(token){
  var sc = v61Scope_(token), T = sc.stage ? v42SchoolTypes_() : null, ns = v61Norm_(sc.subject);
  var sf = function(sid){ if (sc.schools && !sc.schools[sid]) return false; if (T) { var t = (T[sid] || {}).type || ''; if (t.indexOf(sc.stage) < 0) return false; } return true; };
  var gf = ns ? function(k){ return k.split(' | ').some(function(x){ return v61Norm_(x) === ns; }); } : null;
  var r = v62Out_(v62Calc_(sf, gf), false); r.label = sc.label; if (gf) r.noSubjectTeachers = 0; return r;
}

/* ---------- إدارة خطة الدراسة ---------- */
function adminPlanGetV62(token){
  v35Admin_(token); var subs = [];
  try { var s = v24Data_('R_المواد'), si = schoolV31Idx_(s.headers); subs = s.rows.map(function(r){ return schoolV31Val_(r, si, 'اسم_المادة'); }).filter(Boolean); } catch (e) {}
  if (subs.indexOf(V69_CHR) < 0) subs.push(V69_CHR);
  return {success: true, rows: v62Plan_(), subjects: subs, stages: ['ابتدائي', 'إعدادي', 'ثانوي'], grades: {'ابتدائي': ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'], 'إعدادي': ['الأول', 'الثاني', 'الثالث'], 'ثانوي': ['الأول', 'الثاني', 'الثالث']}};
}
/** row = {id?, stage, grade, subject, periods ('' = غير محدد), map, active, notes}. بدون id = إضافة. */
function adminPlanSaveV62(token, row){
  var a = v35Admin_(token); row = row || {};
  var stage = String(row.stage || '').trim(), grade = String(row.grade || '').trim(), subj = String(row.subject || '').trim();
  if (!stage || !grade || !subj) throw new Error('المرحلة والصف والمادة مطلوبة.');
  var p = String(row.periods == null ? '' : row.periods).trim().replace(/[٠-٩]/g, function(c){ return '٠١٢٣٤٥٦٧٨٩'.indexOf(c); });
  if (p !== '' && !/^\d{1,2}$/.test(p)) throw new Error('النصاب يجب أن يكون رقمًا صحيحًا (0 = غير مطلوبة) أو فارغًا (غير محدد).');
  var map = String(row.map || '').split('|').map(function(x){ return x.trim(); }).filter(Boolean).join('|') || subj;
  return v35Lock_(function(){
    v50Fresh_(); var sh = v62PlanSheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), n = sh.getLastRow() - 1, v = n > 0 ? sh.getRange(2, 1, n, h.length).getValues() : [];
    var at = -1; v.forEach(function(r, i){ if (row.id && String(r[ix.planId]) === String(row.id)) at = i; });
    var dup = v.some(function(r, i){ return i !== at && String(r[ix['المرحلة']]) === stage && String(r[ix['الصف_المستوى']]) === grade && String(r[ix['المادة']]).trim() === subj; });
    if (dup) throw new Error('هذه المادة مسجلة بالفعل لنفس المرحلة والصف — عدّل السطر الموجود.');
    var rec = new Array(h.length).fill(''), old = at >= 0 ? v[at].slice() : null; if (old) rec = old.slice();
    function put(k, val){ if (ix[k] != null) rec[ix[k]] = val; }
    put('planId', row.id || ('PLAN_' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase())); put('المرحلة', stage); put('الصف_المستوى', grade); put('المادة', subj);
    put('النصاب_الأسبوعي', p); put('مادة_التدريس_المقابلة', map); put('مفعلة', row.active === false || row.active === 'لا' ? 'لا' : 'نعم'); put('ملاحظات', String(row.notes || '').trim());
    if (at >= 0) v50A_(sh.getRange(at + 2, 1, 1, h.length).setValues([rec])); else v36AppendRows_(sh, [rec]);
    schoolV31Log_(v36Actor_(a), at >= 0 ? 'تعديل نصاب مادة' : 'إضافة مادة لخطة الدراسة', stage + ' / ' + grade + ' / ' + subj,
      [['النصاب', old ? String(old[ix['النصاب_الأسبوعي']]) : '', p], ['المادة المقابلة', old ? String(old[ix['مادة_التدريس_المقابلة']]) : '', map]]);
    v50Invalidate_(V62_PLAN_SHEET);
    return {success: true, message: at >= 0 ? 'تم تعديل النصاب.' : 'تمت إضافة المادة.'};
  });
}

/* ---------- V6.3: توزيع حصص معلمي الحصة/المعاش مقابل العجز (للإدارة فقط — متابعة واتخاذ قرار، بلا أي قيد على المدارس) ---------- */
function adminHrpAllocationV63(token){
  v35Admin_(token);
  var c = v62Calc_(function(){ return true; }), rows = [], bySub = {}, T = {hrp: 0, used: 0, excess: 0, excessNoDef: 0, uncovered: 0, uncoveredNoHrp: 0, deficit: 0, hrpTeachers: 0};
  c.rows.forEach(function(x){
    var used = Math.min(x.hrp, x.deficit), excess = Math.max(0, x.hrp - x.deficit);
    var o = {sid: x.sid, school: x.school, group: x.group, need: x.need, supply: x.supply, deficit: x.deficit, hrp: x.hrp, used: used, excess: excess, uncovered: x.remain,
      hrpNames: x.hrpList.map(function(h){ return h.name + ' (' + h.periods + ')'; }), basicSurplus: Math.max(0, x.supply - x.need)};
    rows.push(o);
    var s = bySub[x.group] = bySub[x.group] || {group: x.group, hrp: 0, used: 0, excess: 0, uncovered: 0, deficit: 0, schoolsExcess: 0, schoolsUncovered: 0, hrpTeachers: 0};
    s.hrp += x.hrp; s.used += used; s.excess += excess; s.uncovered += x.remain; s.deficit += x.deficit; s.hrpTeachers += x.hrpList.length;
    if (excess) s.schoolsExcess++; if (x.remain) s.schoolsUncovered++;
    T.hrp += x.hrp; T.used += used; T.excess += excess; T.uncovered += x.remain; T.deficit += x.deficit; T.hrpTeachers += x.hrpList.length;
    if (x.hrp && !x.deficit) T.excessNoDef += x.hrp; if (x.remain && !x.hrp) T.uncoveredNoHrp += x.remain;
  });
  // اقتراح إعادة توزيع داخل نفس المادة: من مدارس بها حصص زائدة إلى مدارس بها عجز غير مغطى
  var moves = [];
  Object.keys(bySub).forEach(function(g){
    var give = rows.filter(function(r){ return r.group === g && r.excess > 0; }).map(function(r){ return {school: r.school, left: r.excess}; }).sort(function(a, b){ return b.left - a.left; });
    var take = rows.filter(function(r){ return r.group === g && r.uncovered > 0; }).map(function(r){ return {school: r.school, left: r.uncovered}; }).sort(function(a, b){ return b.left - a.left; });
    var i = 0, j = 0;
    while (i < give.length && j < take.length) {
      var n = Math.min(give[i].left, take[j].left);
      moves.push({group: g, from: give[i].school, to: take[j].school, periods: n});
      give[i].left -= n; take[j].left -= n; if (!give[i].left) i++; if (!take[j].left) j++;
    }
  });
  var noSub = 0; Object.keys(c.warnings).forEach(function(k){ noSub += c.warnings[k].noSubject || 0; });
  var hrpNoSubject = 0; try { var hp = v24Data_('05_معلمو_الحصة_والمعاش'), hi = schoolV31Idx_(hp.headers); hp.rows.forEach(function(r){ if (schoolV31Val_(r, hi, 'حالة_السجل') !== 'غير قائم' && !schoolV31Val_(r, hi, 'مادة_التدريس')) hrpNoSubject++; }); } catch (e) {}
  return {success: true, totals: T, subjects: Object.keys(bySub).map(function(k){ return bySub[k]; }).sort(function(a, b){ return b.excess + b.uncovered - a.excess - a.uncovered; }),
    excessRows: rows.filter(function(r){ return r.excess > 0; }).sort(function(a, b){ return b.excess - a.excess; }),
    uncoveredRows: rows.filter(function(r){ return r.uncovered > 0; }).sort(function(a, b){ return b.uncovered - a.uncovered; }),
    moves: moves.sort(function(a, b){ return b.periods - a.periods; }), noSubjectTeachers: noSub, hrpNoSubject: hrpNoSubject};
}
