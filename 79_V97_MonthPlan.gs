/**
 * V7.49 — الحساب التلقائي من الجدول وأيام الغياب + الندب الجزئي + غير المستحقين (غياب فقط)
 *          + بداية الدراسة داخل الشهر + مسح الإدخال القديم + خطاب «من لم يستكمل التوقيعات».
 * لا يغيّر محرك الحساب المالي: الأرقام تُحسب في شاشة المدرسة وتُحفظ بالحفظ المعتاد.
 */
var V97_PART_RE = /منتدب إلينا جزئي/;

/** أول يوم دراسة في الشهر (من إعداد الأشهر)، افتراضيًا 1. */
function v97StartDay_(y, m){ var e = v56Find_(Number(y), Number(m)); var sd = e ? Number(e.startDay) || 1 : 1; return sd < 1 ? 1 : sd; }

/** كل العلاقات النشطة: key (E:/H:) → [{sid, type, days, periods}] */
function v97Rels_(){
  var out = {}, rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers);
  rel.rows.forEach(function(r){
    if (!v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة'))) return;
    var k = 'E:' + schoolV31Val_(r, ri, 'employeeId');
    (out[k] = out[k] || []).push({sid: String(schoolV31Val_(r, ri, 'schoolId')), type: String(schoolV31Val_(r, ri, 'نوع_العلاقة') || ''), days: ri['أيام_الندب_الجزئي'] != null ? String(schoolV31Val_(r, ri, 'أيام_الندب_الجزئي') || '') : '', periods: ri['حصص_الندب_الجزئي'] != null ? String(schoolV31Val_(r, ri, 'حصص_الندب_الجزئي') || '') : ''});
  });
  var h = v56Read_(V40_HRP_REL_SHEET), hx = h.ix;
  h.vals.forEach(function(r){
    if (!v36ActiveRel_(r[hx['الحالة']])) return;
    var k = 'H:' + r[hx.hrpId];
    (out[k] = out[k] || []).push({sid: String(r[hx.schoolId]), type: String(r[hx['نوع_العلاقة']] || ''), days: '', periods: String(r[hx['عدد_الحصص_المطلوب']] || '')});
  });
  return out;
}
/** خرائط الشهر: tt[key|sid] = {يوم: عدد}، nd[key|sid] = {يوم: schoolId الندب}، ab[key|sid] = {تاريخ: نوع}. */
function v97Maps_(y, m){
  var tt = {}, nd = {}, ab = {}, ot = {};
  if (v96Has_(V96_TT)) { var t = v56Read_(V96_TT), ix = t.ix; t.vals.forEach(function(r){ var o = {}, k = r[ix.personKey] + '|' + r[ix.schoolId]; V96_DAYS.forEach(function(d){ o[d] = Number(r[ix[d]]) || 0; }); tt[k] = o; nd[k] = ix['أيام_الندب'] != null ? v96ParseDates_(r[ix['أيام_الندب']]) : {}; var w = v96Ot_(ix['حصص_فوق_النصاب'] != null ? r[ix['حصص_فوق_النصاب']] : ''); if (w) ot[k] = w; }); }
  if (v96Has_(V96_AB)) { var a = v56Read_(V96_AB), ax = a.ix; a.vals.forEach(function(r){ if (Number(r[ax['السنة']]) !== Number(y) || Number(r[ax['الشهر']]) !== Number(m)) return; ab[r[ax.personKey] + '|' + r[ax.schoolId]] = v96ParseDates_(r[ax['التواريخ']]); }); }
  return {tt: tt, nd: nd, ab: ab, ot: ot};
}
/** دور المدرسة لهذا الشخص: 'host' (مدرسة ندب جزئي) أو 'orig' (الأصلية/الوحيدة). */
function v97Role_(kind, id, sid, R, M, names){
  R = R || v97Rels_(); var key = v96Key_(kind, id), rels = R[key] || [], me = rels.filter(function(r){ return r.sid === String(sid); })[0] || {type: ''};
  var orig = rels.filter(function(r){ return r.type === 'أصلي'; })[0];
  if (V97_PART_RE.test(me.type) && orig && orig.sid !== String(sid)) {
    M = M || v97Maps_(0, 0); var on = M.nd[key + '|' + orig.sid] || {};
    return {role: 'host', origSid: orig.sid, origSchool: names ? (names[orig.sid] || orig.sid) : orig.sid, hostDays: Object.keys(on).filter(function(d){ return String(on[d]) === String(sid); }), agreed: {days: me.days, periods: me.periods}};
  }
  return {role: 'orig', hosts: rels.filter(function(r){ return V97_PART_RE.test(r.type) && r.sid !== String(sid); }).map(function(r){ return {sid: r.sid, school: names ? (names[r.sid] || r.sid) : r.sid, days: r.days, periods: r.periods}; })};
}
/** غير المستحقين النشطين في المدرسة (أخصائيون/إداريون/عمال...) — يظهرون للغياب فقط. */
function v97AbsOnly_(sid){
  var elig = {}; v36ActiveWorkers_(sid).forEach(function(w){ elig[w.employeeId] = 1; });
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), by = {}, rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), out = [], seen = {};
  emp.rows.forEach(function(r){ by[schoolV31Val_(r, ei, 'employeeId')] = r; });
  rel.rows.forEach(function(r){
    if (String(schoolV31Val_(r, ri, 'schoolId')) !== String(sid) || !v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة'))) return;
    if (V97_PART_RE.test(String(schoolV31Val_(r, ri, 'نوع_العلاقة') || ''))) return;   // غياب المنتدب جزئيًا عند الأصلية
    var id = schoolV31Val_(r, ri, 'employeeId'), e = by[id]; if (!e || seen[id] || elig[id]) return; seen[id] = 1;
    if (schoolV31Val_(e, ei, 'حالة_السجل') === 'غير قائم') return;
    if (ei['قائم_بالعمل'] != null && String(schoolV31Val_(e, ei, 'قائم_بالعمل') || 'نعم').trim() === 'لا') return;
    out.push({employeeId: id, name: schoolV31Val_(e, ei, 'الاسم'), job: schoolV31Val_(e, ei, 'المسمى_الوظيفي'), supervisoryJob: ei['الوظيفة_الإشرافية'] != null ? schoolV31Val_(e, ei, 'الوظيفة_الإشرافية') : '', nationalId: schoolV31Val_(e, ei, 'الرقم_القومي')});
  });
  try { v40SortWorkers_(out); } catch (e1) { console.error('v97AbsOnly_ sort: ' + e1.message); }
  return out;
}
/** المدرسة: كل ما تحتاجه شاشة الشهر لحساب الغياب والحصص وفوق النصاب تلقائيًا (استدعاء واحد). */
function schoolDayPlansV97(token, year, month){
  var s = schoolV31Session_(token), sid = String(s.schoolId), mo = v36ResolveMonth_(year, month), R = v97Rels_(), M = v97Maps_(mo.year, mo.month), names = v42SchoolNames_(), people = {};
  var absOnly = v97AbsOnly_(sid);
  Object.keys(R).forEach(function(key){
    if (!R[key].some(function(r){ return r.sid === sid; })) return;
    var kind = key.charAt(0), id = key.slice(2), ro = v97Role_(kind, id, sid, R, M, names), k = key + '|' + sid;
    var o = {role: ro.role, tt: M.tt[k] || null, ot: M.ot[k] || null, ndb: M.nd[k] || {}, ab: M.ab[k] || {}};   // V7.61: ot = الجدول الثاني
    if (ro.role === 'host') { o.hostDays = ro.hostDays; o.origSchool = ro.origSchool; o.agreed = ro.agreed; }
    else {
      o.hosts = ro.hosts; o.hostTt = {}; o.hostAb = {};
      Object.keys(o.ndb).forEach(function(d){ var t = M.tt[key + '|' + o.ndb[d]]; o.hostTt[d] = t ? (Number(t[d]) || 0) : 0; });
      ro.hosts.forEach(function(h){ var a = M.ab[key + '|' + h.sid] || {}; Object.keys(a).forEach(function(dt){ o.hostAb[dt] = {t: a[dt], sid: h.sid}; }); });
    }
    people[key] = o;
  });
  return {success: true, month: mo, startDay: v97StartDay_(mo.year, mo.month), days: v96MonthDays_(mo.year, mo.month), periodDays: v96PeriodDays_(mo.year, mo.month), people: people, absOnly: absOnly, hrpCountHolidays: v98HrpHol_(), missionCountsAsAbsence: v36GetSetting_('MISSION_COUNTS_AS_ABSENCE', 'لا') === 'نعم'};
}

/* ===== خطاب «لم يستكمل عدد التوقيعات» — كل الأساسيين (مستحقين وغير مستحقين) ===== */
function v97LowSigs_(onlySid, year, month, threshold){
  var mo = v36ResolveMonth_(year, month), wd = Number(mo.workdays) || 0, thr = Number(threshold) || Math.min(18, wd || 18), names = v42SchoolNames_();
  var ms = v36GetSetting_('MISSION_COUNTS_AS_ABSENCE', 'لا') === 'نعم';
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), by = {}; emp.rows.forEach(function(r){ by[schoolV31Val_(r, ei, 'employeeId')] = r; });
  var mon = {}, rd = v36MonthlyRead_(), ix = rd.ix;
  rd.vals.forEach(function(r){ if (Number(r[ix['السنة']]) !== mo.year || Number(r[ix['الشهر']]) !== mo.month) return; mon[r[ix.employeeId] + '|' + r[ix.schoolId]] = [Number(r[ix['عارضة']]) || 0, Number(r[ix['اعتيادي']]) || 0, Number(r[ix['مرضي']]) || 0, Number(r[ix['مأمورية']]) || 0]; });
  var M = v97Maps_(mo.year, mo.month), sysOf = {};
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), out = [], seen = {};
  rel.rows.forEach(function(r){
    var sid = String(schoolV31Val_(r, ri, 'schoolId')); if (onlySid && sid !== String(onlySid)) return;
    if (!v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة')) || V97_PART_RE.test(String(schoolV31Val_(r, ri, 'نوع_العلاقة') || ''))) return;
    if (!v38IsActualSchool_(sid)) return;
    var id = schoolV31Val_(r, ri, 'employeeId'), e = by[id]; if (!e || seen[id + '|' + sid]) return; seen[id + '|' + sid] = 1;
    if (schoolV31Val_(e, ei, 'حالة_السجل') === 'غير قائم') return;
    if (ei['قائم_بالعمل'] != null && String(schoolV31Val_(e, ei, 'قائم_بالعمل') || 'نعم').trim() === 'لا') return;
    var c = mon[id + '|' + sid];
    if (!c) { var a = M.ab['E:' + id + '|' + sid] || {}; c = [0, 0, 0, 0]; Object.keys(a).forEach(function(dt){ var i = V96_TYPES.indexOf(a[dt]); if (i >= 0) c[i]++; }); }
    var abs = c[0] + c[1] + c[2] + (ms ? c[3] : 0), sigs = Math.max(0, wd - abs);
    if (sigs >= thr) return;
    out.push({schoolId: sid, school: names[sid] || sid, name: schoolV31Val_(e, ei, 'الاسم'), job: schoolV31Val_(e, ei, 'المسمى_الوظيفي'), supervisoryJob: ei['الوظيفة_الإشرافية'] != null ? schoolV31Val_(e, ei, 'الوظيفة_الإشرافية') : '', subject: schoolV31Val_(e, ei, 'مادة_التدريس'), nationalId: schoolV31Val_(e, ei, 'الرقم_القومي'), system: schoolV31Val_(e, ei, 'نظام_العمل'), a1: c[0], a2: c[1], a3: c[2], a4: c[3], sigs: sigs});
  });
  out.sort(function(a, b){ return a.school.localeCompare(b.school, 'ar') || String(a.name).localeCompare(String(b.name), 'ar'); });
  return {success: true, month: mo, workdays: wd, threshold: thr, rows: out};
}
function schoolLowSigsV97(token, year, month, threshold){ var s = schoolV31Session_(token); var r = v97LowSigs_(s.schoolId, year, month, threshold); r.school = s.school || ''; return r; }
function adminLowSigsV97(token, year, month, threshold, schoolId){ v35Admin_(token); return v97LowSigs_(schoolId || '', year, month, threshold); }

/* ===== مسح الإدخال القديم لشهر (الإدارة) — نهائي، مع خيار شمول المعتمد أو الحفاظ عليه ===== */
function adminPurgeMonthV97(token, year, month, schoolId, scope, confirmWord, purgeAbsence, purgeApproved){
  var a = v35Admin_(token);
  var isConfirmed = (confirmWord === true || String(confirmWord || '').trim() === 'true' || String(confirmWord || '').trim() === 'حذف');
  if (!isConfirmed) throw new Error('يرجى تأكيد الحذف للمتابعة.');
  var allowApproved = (purgeApproved === true || String(purgeApproved || '').trim() === 'true' || String(purgeApproved || '').trim() === 'نعم');
  var mo = v36ResolveMonth_(year, month), sid = String(schoolId || ''), doB = scope !== 'hrp', doH = scope !== 'basic';
  var baseMatch = function(r, ix){ return Number(r[ix['السنة']]) === mo.year && Number(r[ix['الشهر']]) === mo.month && (!sid || String(r[ix.schoolId]) === sid); };
  return v35Lock_(function(){
    v50Fresh_();
    var apprSchools = {};
    if (!allowApproved) {
      ['08_الماليات', V40_HRP_FIN_SHEET].forEach(function(shName){
        if (!v96Has_(shName)) return;
        var d = v56Read_(shName), ix = d.ix;
        d.vals.forEach(function(r){
          if (baseMatch(r, ix) && r[ix['حالة_الاعتماد']] === 'معتمد') {
            apprSchools[String(r[ix.schoolId] || '')] = true;
          }
        });
      });
    }
    var shouldDelete = function(r, ix){
      if (!baseMatch(r, ix)) return false;
      if (!allowApproved) {
        if (ix['حالة_الاعتماد'] !== undefined && r[ix['حالة_الاعتماد']] === 'معتمد') return false;
        if (ix.schoolId !== undefined && apprSchools[String(r[ix.schoolId] || '')]) return false;
      }
      return true;
    };
    var n = {};
    if (doB) {
      n.monthly = v97DeleteWhere_('07_البيانات_الشهرية', shouldDelete);
      n.fin = v97DeleteWhere_('08_الماليات', shouldDelete);
      n.eligibility = v97DeleteWhere_('16_استحقاقات_الماليات', shouldDelete);
    }
    if (doH) {
      n.hrpMonthly = v97DeleteWhere_(V40_HRP_MONTHLY_SHEET, shouldDelete);
      n.hrpFin = v97DeleteWhere_(V40_HRP_FIN_SHEET, shouldDelete);
    }
    // مسح غياب المعلمين للشهر بناءً على اختيار شمول المعتمد، مع الحفاظ التام والصارم على غياب وبيانات الطلاب
    n.teacherAbsence = v97DeleteWhere_(V96_AB, shouldDelete);
    var total = Object.keys(n).reduce(function(x, k){ return x + n[k]; }, 0);
    schoolV31Log_(v36Actor_(a), 'مسح إدخال شهر', (sid || 'كل المدارس') + '|' + mo.year + '-' + mo.month + '|' + (scope || 'all') + (allowApproved ? '|معتمد' : '|غير معتمد فقط'), Object.keys(n).map(function(k){ return [k, '', String(n[k])]; }));
    var absMsg = '. غياب وبيانات الطلاب محمية دائمًا ولا تُمس بأي مسح.';
    var apprNote = allowApproved ? ' (شمل السجلات المعتمدة وغياب المعلمين)' : ' (تم الحفاظ على الكشوف وغياب المدارس المعتمدة)';
    return {success: true, message: 'تم مسح ' + total + ' صف لشهر ' + mo.label + (sid ? '' : ' (كل المدارس)') + apprNote + absMsg, counts: n};
  });
}
/** حذف صفوف مطابقة من الأسفل للأعلى على هيئة كتل متتالية (لا يُعاد كتابة باقي الورقة). */
function v97DeleteWhere_(name, pred){
  if (!v96Has_(name)) return 0;
  var d = v56Read_(name), ix = d.ix, rows = [];
  d.vals.forEach(function(r, i){ if (pred(r, ix)) rows.push(i + 2); });
  for (var j = rows.length - 1; j >= 0;) { var end = rows[j], start = end; while (j > 0 && rows[j - 1] === start - 1) { j--; start--; } v50A_(d.sh.deleteRows(start, end - start + 1)); j--; }
  if (rows.length) v50Invalidate_(name);
  return rows.length;
}

/* ===== V7.50 ===== */
/** معاينة المبلغ لكل صفوف الشاشة في استدعاء واحد (لا يكتب شيئًا). */
function schoolPreviewCalcBatchV98(token, year, month, items){
  var out = {};
  (items || []).slice(0, 400).forEach(function(it){
    var id = String((it || {}).employeeId || ''); if (!id) return;
    try { var r = schoolPreviewCalcV40(token, year, month, it); out[id] = {amount: r.amount, status: r.status}; }
    catch (e) { out[id] = {error: e.message}; }
  });
  return {success: true, results: out};
}
/** النظام المالي تحدده المدرسة الأصلية فقط (أو مدرسة الندب الكلي عند عدم وجود أصلية). */
function v98SysGuard_(employeeId, schoolId, newSys){
  if (newSys === undefined || newSys === null) return;
  var id = String(employeeId || '').trim(), sid = String(schoolId || ''), emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), cur = null;
  for (var i = 0; i < emp.rows.length; i++) if (String(schoolV31Val_(emp.rows[i], ei, 'employeeId')) === id) { cur = String(schoolV31Val_(emp.rows[i], ei, 'نظام_العمل') || '').trim(); break; }
  if (cur === null || cur === String(newSys).trim()) return;
  var rels = (v97Rels_()['E:' + id] || []), me = rels.filter(function(r){ return r.sid === sid; })[0], hasOrig = rels.some(function(r){ return r.type === 'أصلي'; });
  var ok = me && (me.type === 'أصلي' || (!hasOrig && /كلي/.test(me.type)));
  if (!ok) throw new Error('النظام المالي لهذا العامل تحدده مدرسته الأصلية فقط.');
}

/* ===== V7.51 ===== */
/** احتساب الإجازات الرسمية لمعلمي الحصة/المعاش (الافتراضي: لا). */
function v98HrpHol_(){ return v36GetSetting_('HRP_COUNT_HOLIDAYS', 'لا') === 'نعم'; }
function adminSetHrpHolidaysV98(token, on){
  var a = v35Admin_(token), v = on ? 'نعم' : 'لا';
  return v35Lock_(function(){
    v36SetSetting_('HRP_COUNT_HOLIDAYS', v, 'احتساب الإجازات الرسمية لمعلمي الحصة والمعاش (V7.51)');
    schoolV31Log_(v36Actor_(a), 'احتساب الإجازات لمعلمي الحصة', 'HRP_COUNT_HOLIDAYS', [['القيمة', '', v]]);
    return {success: true, message: on ? 'الإجازات الرسمية تُحسب لمعلمي الحصة والمعاش.' : 'الإجازات الرسمية لا تُحسب لمعلمي الحصة والمعاش.'};
  });
}
/** تصفير كامل لفترة التجربة: يحذف بيانات الاستحقاقات المُدخلة (كل الأشهر وكل المدارس) مع خيار شمول المعتمد. لا يمس العاملين ولا إعدادات الأشهر ولا أيام الغياب. */
function adminResetFinanceV98(token, confirmWord, purgeApproved){
  var a = v35Admin_(token);
  var isConfirmed = (confirmWord === true || String(confirmWord || '').trim() === 'true' || String(confirmWord || '').trim() === 'تصفير');
  if (!isConfirmed) throw new Error('يرجى تأكيد التصفير للمتابعة.');
  var allowApproved = (purgeApproved === true || String(purgeApproved || '').trim() === 'true' || String(purgeApproved || '').trim() === 'نعم');
  var sheets = ['07_البيانات_الشهرية', '08_الماليات', '16_استحقاقات_الماليات', V40_HRP_MONTHLY_SHEET, V40_HRP_FIN_SHEET, V96_TT, V96_AB];
  return v35Lock_(function(){
    v50Fresh_(); var n = {}, total = 0;
    var apprSchools = {};
    if (!allowApproved) {
      ['08_الماليات', V40_HRP_FIN_SHEET].forEach(function(shName){
        if (!v96Has_(shName)) return;
        var d = v56Read_(shName), ix = d.ix;
        d.vals.forEach(function(r){
          if (r[ix['حالة_الاعتماد']] === 'معتمد') {
            apprSchools[String(r[ix.schoolId] || '')] = true;
          }
        });
      });
    }
    sheets.forEach(function(name){
      n[name] = v97DeleteWhere_(name, function(r, ix){
        if (allowApproved) return true;
        if (ix['حالة_الاعتماد'] !== undefined && r[ix['حالة_الاعتماد']] === 'معتمد') return false;
        if (ix.schoolId !== undefined && apprSchools[String(r[ix.schoolId] || '')]) return false;
        return true;
      });
      total += n[name];
    });
    v50Invalidate_();
    schoolV31Log_(v36Actor_(a), 'تصفير نظام الاستحقاقات بالكامل', (allowApproved ? 'شامل المعتمد وغياب المعلمين' : 'غير المعتمد فقط'), Object.keys(n).map(function(k){ return [k, '', String(n[k])]; }));
    var apprNote = allowApproved ? ' (شمل السجلات المعتمدة وغياب المعلمين)' : ' (تم الحفاظ على الكشوف وغياب المدارس المعتمدة)';
    return {success: true, message: 'تم تصفير نظام الاستحقاقات وغياب المعلمين' + apprNote + ' (مع الحفاظ الكامل على غياب وبيانات الطلاب): حُذف ' + total + ' صف (' + Object.keys(n).map(function(k){ return k + ': ' + n[k]; }).join('، ') + ').', counts: n};
  });
}

/* ===== V7.55 ===== */
/** مادة معلم الحصة/المعاش: «الدين المسيحي» مادة أساسية لهم فقط، وباقي المواد بالتوحيد المعتاد. */
function v100HrpSubject_(x){
  var t = String(x == null ? '' : x).trim();
  if (/مسيح/.test(t)) return 'الدين المسيحي';
  return (typeof subjectCanonV44_ === 'function') ? (subjectCanonV44_(t) || t) : t;
}
