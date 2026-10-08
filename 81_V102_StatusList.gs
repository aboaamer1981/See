/**
 * V7.58 — القائمة الموحدة النهائية للحالة/العلاقة (18 حالة): أُضيفت «إعارة» و«منقطع عن العمل» و«موقوف عن العمل»،
 * و«إنهاء خدمة» بقائمة منسدلة (V65_ENDS). كل من خرج من الإدارة أو توفي أو أُحيل للمعاش أو انتهت خدمته = «غير قائم».
 * أدوات مساعدة لمسار التنفيذ الموحد v95ApplyFormerRelation_ + زر الإدارة لتوحيد البيانات القديمة.
 */
var V102_SUSPENDED_REL = /^إجازة|^معلقة|^منتدب كليًا لجهة أخرى|^منتدب جزئيًا لجهة أخرى|^معار/;

/** سبب إنهاء الخدمة الموحد (يُكتب في سبب_إنهاء_الخدمة). */
function v102EndWhy_(code, reasonText, note){
  if (code === 'TR_OUT') return 'نقل خارج الإدارة' + (reasonText ? ': ' + reasonText : '');
  if (code === 'PENSION') return 'معاش';
  if (code === 'DEATH') return 'وفاة';
  var t = v102EndType_(note);
  if (!t) throw new Error('اختر نوع إنهاء الخدمة من القائمة.');
  return 'إنهاء خدمة: ' + t;
}
function v102EndType_(note){
  var m = String(note || '').match(/(?:^|[—|])\s*نوع إنهاء الخدمة\s*:\s*([^—|]+)/), t = m ? String(m[1] || '').trim() : '';
  return (V65_ENDS.indexOf(t) >= 0) ? t : '';
}

/** يغيّر حالة علاقة العامل بهذه المدرسة: العلاقة النشطة أولًا، وإلا آخر علاقة معلّقة (إجازة/معلقة/منتدب لجهة أخرى/معار).
 *  addIfNone: إن لم توجد علاقة تُضاف علاقة «أصلي». */
function v102SetRel_(eid, sid, status, note, addIfNone){
  var sh = v36Sheet_('04_علاقات_المدارس'), h = v36Headers_(sh), ix = schoolV31Idx_(h), n = sh.getLastRow() - 1;
  var v = n > 0 ? sh.getRange(2, 1, n, h.length).getValues() : [], act = -1, sus = -1;
  v.forEach(function(r, i){
    if (String(r[ix.employeeId]).trim() !== String(eid) || String(r[ix.schoolId]).trim() !== String(sid)) return;
    var st = String(r[ix['الحالة']] || '').trim();
    if (v36ActiveRel_(st)) { if (act < 0 || String(r[ix['نوع_العلاقة']]) === 'أصلي') act = i; }
    else if (V102_SUSPENDED_REL.test(st)) sus = i;
  });
  var i = act >= 0 ? act : sus;
  if (i < 0) {
    if (!addIfNone) throw new Error('لا توجد علاقة لهذا العامل بالمدرسة.');
    v36AddRelation_(eid, sid, 'أصلي', 'بوابة المدرسة', note || '');
    return true;
  }
  var r = v[i]; r[ix['الحالة']] = status;
  if (note && ix['ملاحظات'] != null) r[ix['ملاحظات']] = String(note);
  v50A_(sh.getRange(i + 2, 1, 1, h.length).setValues([r]));
  return true;
}
/** يضمن علاقة نشطة بهذه المدرسة (منقطع/موقوف يبقى في كشف مدرسته). */
function v102EnsureActive_(eid, sid){ return v102SetRel_(eid, sid, 'نشطة', '', true); }

/** مسمى العلاقة الموحد لعرض صف علاقة مخزن (نوع داخلي + حالة الصف + ملاحظات). نسخة الواجهة: relLabel102_ في Index_V40.html. */
function v102RelLabel_(type, status, note){
  var t = String(type || '').trim(), st = String(status || '').trim(), n = String(note || '');
  if (/^إجازة/.test(st)) return 'إجازة';
  if (/^معار/.test(st)) return 'إعارة';
  if (/^معلقة/.test(st)) return 'غير معروف للمدرسة';
  if (/^منتدب كليًا لجهة أخرى/.test(st)) return 'أصلي ومنتدب من عندنا كليًا خارج الإدارة';
  if (/^منتدب جزئيًا لجهة أخرى/.test(st)) return 'أصلي ومنتدب جزئيًا خارج الإدارة';
  if (t === 'منتدب إلينا كلي') return /خارج الإدارة/.test(n) ? 'منتدب إلينا كليًا من خارج الإدارة' : 'منتدب إلينا كليًا من داخل الإدارة';
  if (t === 'منتدب إلينا جزئي') return 'منتدب إلينا جزئيًا';
  if (t === 'أصلي') return /منتدب جزئيًا خارج الإدارة/.test(n) ? 'أصلي ومنتدب جزئيًا خارج الإدارة' : 'أصلي';
  return t;
}

/** طلبات «تغيير حالة العامل» القديمة (V38) → المسمى الموحد + بيان الحالة. */
var V102_OLD_ACTIONS = {'إحالة للمعاش': ['معاش', ''], 'وفاة': ['وفاة', ''], 'استقالة': ['إنهاء خدمة', 'نوع إنهاء الخدمة: استقالة'], 'إنهاء خدمة': ['إنهاء خدمة', 'نوع إنهاء الخدمة: أخرى'], 'إجازة بدون راتب': ['إجازة', 'نوع الإجازة: بدون مرتب'], 'موقف مؤقت / غير قائم': ['موقوف عن العمل', '']};

/* ===================== زر الإدارة: توحيد الحالات في البيانات القديمة ===================== */
var V102_GONE_WS = {'متوفى': 'وفاة', 'وفاة': 'وفاة', 'معاش': 'معاش', 'منتهى الخدمة': 'إنهاء خدمة: أخرى', 'مستقيل': 'إنهاء خدمة: استقالة', 'نقل خارج الإدارة': 'نقل خارج الإدارة'};
/** apply=false: معاينة فقط (لا يكتب شيئًا). apply=true: تنفيذ داخل قفل واحد مع سجل أحداث. */
function adminNormalizeStatusesV102(token, apply){
  var a = v35Admin_(token);
  var run = function(){
    var es = v36Sheet_('01_الأساسي'), eh = v36Headers_(es), ex = schoolV31Idx_(eh), en = es.getLastRow() - 1;
    var ev = en > 0 ? es.getRange(2, 1, en, eh.length).getValues() : [];
    var rs = v36Sheet_('04_علاقات_المدارس'), rh = v36Headers_(rs), rx = schoolV31Idx_(rh), rn = rs.getLastRow() - 1;
    var rv = rn > 0 ? rs.getRange(2, 1, rn, rh.length).getValues() : [];
    var cnt = {}, samples = {}, eCols = {}, rCols = {}, other = {};
    function note(k, name){ cnt[k] = (cnt[k] || 0) + 1; (samples[k] = samples[k] || []).length < 5 && samples[k].push(name); }
    function setE(i, k, val){ if (ex[k] == null) return; if (String(ev[i][ex[k]]) === String(val)) return; ev[i][ex[k]] = val; eCols[k] = 1; }
    function setR(i, k, val){ if (rx[k] == null) return; if (String(rv[i][rx[k]]) === String(val)) return; rv[i][rx[k]] = val; rCols[k] = 1; }
    var relBy = {};
    rv.forEach(function(r, i){ var id = String(r[rx.employeeId] || '').trim(); if (id) (relBy[id] = relBy[id] || []).push(i); });
    ev.forEach(function(r, i){
      var id = String(r[ex.employeeId] || '').trim(); if (!id) return;
      var name = String(r[ex['الاسم']] || id), ws = String(r[ex['الحالة_الوظيفية']] || '').trim(), rec = String(r[ex['حالة_السجل']] || '').trim(), why = String(r[ex['سبب_إنهاء_الخدمة']] || '').trim();
      if (V102_GONE_WS[ws]) {   // خرج/توفي/معاش/انتهت خدمته → غير قائم
        setE(i, 'الحالة_الوظيفية', 'غير قائم'); setE(i, 'حالة_السجل', 'غير قائم'); setE(i, 'قائم_بالعمل', 'لا');
        if (!why) setE(i, 'سبب_إنهاء_الخدمة', V102_GONE_WS[ws]);
        if (String(r[ex['نظام_العمل']] || '') === 'معاش') setE(i, 'نظام_العمل', '');
        (relBy[id] || []).forEach(function(j){ if (v36ActiveRel_(rv[j][rx['الحالة']]) || V102_SUSPENDED_REL.test(String(rv[j][rx['الحالة']] || ''))) { setR(j, 'الحالة', 'غير نشطة'); if (rx['تاريخ_النهاية'] != null && !rv[j][rx['تاريخ_النهاية']]) setR(j, 'تاريخ_النهاية', new Date()); if (rx['سبب_الإنهاء'] != null && !rv[j][rx['سبب_الإنهاء']]) setR(j, 'سبب_الإنهاء', why || V102_GONE_WS[ws]); } });
        note('«' + ws + '» ← غير قائم', name); return;
      }
      if (rec === 'غير قائم' && ws !== 'غير قائم') { setE(i, 'الحالة_الوظيفية', 'غير قائم'); note('حالة السجل «غير قائم» والحالة الوظيفية «' + (ws || 'فارغة') + '» ← غير قائم', name); return; }
      if (/^إجازة/.test(ws)) {   // الإجازة مكانها العلاقة (مثل الحصر)
        var unpaid = /بدون/.test(ws), rels = relBy[id] || [], onLeave = rels.some(function(j){ return /^إجازة/.test(String(rv[j][rx['الحالة']] || '')); });
        if (!onLeave) { var orig = String(r[ex.originalSchoolId] || ''), j0 = -1; rels.forEach(function(j){ if (v36ActiveRel_(rv[j][rx['الحالة']]) && (j0 < 0 || String(rv[j][rx.schoolId]) === orig)) j0 = j; }); if (j0 >= 0) { setR(j0, 'الحالة', 'إجازة'); if (rx['ملاحظات'] != null) setR(j0, 'ملاحظات', 'إجازة' + (unpaid ? ' — نوع الإجازة: بدون مرتب' : '')); } }
        setE(i, 'الحالة_الوظيفية', 'قائم'); setE(i, 'قائم_بالعمل', 'لا'); if (!String(r[ex['سبب_عدم_القيام']] || '')) setE(i, 'سبب_عدم_القيام', unpaid ? 'نوع الإجازة: بدون مرتب' : 'إجازة');
        note('«' + ws + '» ← إجازة (في العلاقة) والحالة الوظيفية «قائم»', name); return;
      }
      if (ws && ws !== 'قائم' && ws !== 'غير قائم') { other[ws] = (other[ws] || 0) + 1; }
      // أصلي ومنتدب جزئيًا خارج الإدارة (صيغة V7.40 القديمة): يعود نشطًا وقائمًا بالعمل مثل الحصر
      var fixedPart = false;
      (relBy[id] || []).forEach(function(j){ if (/^منتدب جزئيًا لجهة أخرى/.test(String(rv[j][rx['الحالة']] || ''))) { setR(j, 'الحالة', 'نشطة'); var nt = rx['ملاحظات'] != null ? String(rv[j][rx['ملاحظات']] || '') : ''; if (rx['ملاحظات'] != null && !/منتدب جزئيًا خارج الإدارة/.test(nt)) setR(j, 'ملاحظات', 'أصلي ومنتدب جزئيًا خارج الإدارة' + (nt ? ' | ' + nt : '')); fixedPart = true; } });
      if (fixedPart) { if (/منتدب جزئيًا خارج الإدارة/.test(String(r[ex['سبب_عدم_القيام']] || ''))) { setE(i, 'قائم_بالعمل', 'نعم'); setE(i, 'سبب_عدم_القيام', ''); } note('أصلي ومنتدب جزئيًا خارج الإدارة ← نشط وقائم بالعمل', name); }
    });
    var changes = Object.keys(cnt).map(function(k){ return {what: k, n: cnt[k], sample: samples[k]}; });
    var otherList = Object.keys(other).map(function(k){ return {value: k, n: other[k]}; });
    if (!apply) return {success: true, preview: true, changes: changes, other: otherList, total: changes.reduce(function(s, x){ return s + x.n; }, 0)};
    Object.keys(eCols).forEach(function(k){ var c = ex[k]; v50A_(es.getRange(2, c + 1, en, 1).setValues(ev.map(function(r){ return [r[c]]; }))); });
    Object.keys(rCols).forEach(function(k){ var c = rx[k]; v50A_(rs.getRange(2, c + 1, rn, 1).setValues(rv.map(function(r){ return [r[c]]; }))); });
    v50Invalidate_('01_الأساسي'); v50Invalidate_('04_علاقات_المدارس');
    schoolV31Log_(v36Actor_(a), 'توحيد الحالات في البيانات القديمة (V7.58)', 'ALL', changes.map(function(x){ return [x.what, '', String(x.n)]; }));
    return {success: true, preview: false, changes: changes, other: otherList, total: changes.reduce(function(s, x){ return s + x.n; }, 0), message: 'تم توحيد ' + changes.reduce(function(s, x){ return s + x.n; }, 0) + ' سجل.'};
  };
  return apply ? v35Lock_(function(){ v50Fresh_(); return run(); }) : run();
}
