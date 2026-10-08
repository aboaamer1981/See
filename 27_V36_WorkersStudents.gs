/** V3.9 — المؤهلات، النقل وربط العامل بمدرسة، التعطيل المنطقي، تحقق شؤون الطلاب، ملخصات الإدارة للطلاب والإعاقة. */

/* ============ أدوات مشتركة ============ */
function v36Sheet_(name) { var sh = personnelSS_().getSheetByName(name); if (!sh) throw new Error('الورقة غير موجودة: ' + name); return sh; }
function v36Headers_(sh) { return sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(function (x) { return String(x == null ? '' : x).trim(); }); }
function v36FindRow_(sh, h, keyName, keyValue) {   // يعيد رقم الصف (1-based) أو 0
  var i = h.indexOf(keyName); if (i < 0 || sh.getLastRow() < 2) return 0;
  var v = sh.getRange(2, i + 1, sh.getLastRow() - 1, 1).getDisplayValues();
  for (var r = 0; r < v.length; r++) if (String(v[r][0]).trim() === String(keyValue).trim()) return r + 2;
  return 0;
}
function v36SchoolName_(schoolId) { var x = v35SchoolRow_(schoolId); return String(x.vals[x.ix['اسم_المدرسة']] || '').trim(); }
/** العامل تابع لمدرسة الجلسة بعلاقة نشطة؟ (تُستخدم لصلاحية المدرسة) */
function v36SchoolOwnsWorker_(schoolId, employeeId) {
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers);
  return rel.rows.some(function (r) {
    if (schoolV31Val_(r, ri, 'employeeId') !== String(employeeId) || schoolV31Val_(r, ri, 'schoolId') !== String(schoolId)) return false;
    var st = schoolV31Val_(r, ri, 'الحالة'); return !st || st === 'نشطة' || st === 'فعال' || st === 'قائم';
  });
}
function v36Actor_(a) { return { username: a.username || 'admin', school: a.school || '' }; }

/* ============ المؤهلات ============ */
var V36_QUAL_FIELDS = ['نوع_المؤهل', 'المؤهل', 'التخصص', 'السنة', 'التقدير', 'النسبة', 'الدبلومة_التربوية', 'سنة_الدبلومة', 'التسوية_بالمؤهل_الأعلى', 'ملاحظات'];
var V36_QUAL_TYPES = ['عالي', 'فوق المتوسط', 'متوسط', 'اقل من المتوسط', 'يقرأ ويكتب', 'أمي', 'دبلومه', 'ماجستير', 'دكتوراه'];
function v36QualList_(employeeId) {   // قراءة مباشرة من الورقة (بدون كاش) لضمان صحة أرقام الصفوف
  var sh = v36Sheet_('05_المؤهلات'), h = v36Headers_(sh), ix = schoolV31Idx_(h), out = [], lr = sh.getLastRow();
  var v = lr > 1 ? sh.getRange(2, 1, lr - 1, h.length).getDisplayValues() : [];
  v.forEach(function (r, n) {
    if (schoolV31Val_(r, ix, 'employeeId') !== String(employeeId)) return;
    var o = { _row: n + 2 }; V36_QUAL_FIELDS.forEach(function (k) { o[k] = schoolV31Val_(r, ix, k); }); out.push(o);
  });
  return { success: true, rows: out, types: V36_QUAL_TYPES };
}
function v36ValidateQual_(p, isNew) {
  if (isNew && !String(p['نوع_المؤهل'] || '').trim()) throw new Error('اختر نوع المؤهل.');
  var y = new Date().getFullYear() + 1;
  ['السنة', 'سنة_الدبلومة'].forEach(function (k) {
    if (p[k] !== undefined && String(p[k]).trim() !== '') { var n = Number(p[k]); if (!/^\d{4}$/.test(String(p[k]).trim()) || n < 1950 || n > y) throw new Error('القيمة في ' + k.replace(/_/g, ' ') + ' غير صحيحة (سنة من 4 أرقام).'); }
  });
  if (p['النسبة'] !== undefined && String(p['النسبة']).trim() !== '') { var pc = Number(String(p['النسبة']).replace('%', '')); if (isNaN(pc) || pc < 0 || pc > 100) throw new Error('النسبة يجب أن تكون بين 0 و100.'); }
  ['الدبلومة_التربوية', 'التسوية_بالمؤهل_الأعلى'].forEach(function (k) { if (p[k] !== undefined && ['', 'نعم', 'لا'].indexOf(String(p[k]).trim()) < 0) throw new Error(k.replace(/_/g, ' ') + ': اختر نعم أو لا.'); });
}
function v36SaveQualCore_(actor, employeeId, row, payload, source) {
  var p = payload || {}; row = Number(row) || 0; v36ValidateQual_(p, !row);
  return v35Lock_(function () {
    var sh = v36Sheet_('05_المؤهلات'), h = v36Headers_(sh), ix = schoolV31Idx_(h);
    if (!row) {
      var r = new Array(h.length).fill(''); function put(k, v) { if (ix[k] != null) r[ix[k]] = schoolV31Clean_(v); }
      put('qualificationId', 'Q_' + Utilities.getUuid().replace(/-/g, '').slice(0, 16).toUpperCase()); put('employeeId', employeeId); put('مصدر_البيانات', source);
      V36_QUAL_FIELDS.forEach(function (k) { if (p[k] !== undefined) put(k, p[k]); });
      v50A_(sh.appendRow(r)); schoolV31Log_(actor, 'إضافة مؤهل', employeeId, [['المؤهل', '', p['المؤهل'] || p['نوع_المؤهل']]]);
      return { success: true, message: 'تمت إضافة المؤهل.' };
    }
    if (row < 2 || row > sh.getLastRow()) throw new Error('سجل المؤهل غير صالح.');
    if (String(sh.getRange(row, ix.employeeId + 1).getDisplayValue()).trim() !== String(employeeId)) throw new Error('هذا المؤهل لا يخص هذا العامل.');
    var ch = schoolV33Write_(sh, row, h, p, [], V36_QUAL_FIELDS);
    schoolV31Log_(actor, 'تعديل مؤهل', employeeId, ch);
    return { success: true, message: ch.length ? 'تم حفظ المؤهل.' : 'لا توجد تغييرات للحفظ.', changed: ch.length };
  });
}
function schoolQualListV36(token, employeeId) { var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_VIEW'); if (!v36SchoolOwnsWorker_(s.schoolId, employeeId)) throw new Error('العامل غير مرتبط بهذه المدرسة.'); return v36QualList_(employeeId); }
function schoolQualSaveV36(token, employeeId, row, payload) { var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT'); if (!v36SchoolOwnsWorker_(s.schoolId, employeeId)) throw new Error('العامل غير مرتبط بهذه المدرسة.'); return v36SaveQualCore_(s, employeeId, row, payload, 'بوابة المدرسة'); }
function adminQualListV36(token, employeeId) { v35Admin_(token); return v36QualList_(employeeId); }
function adminQualSaveV36(token, employeeId, row, payload) { var a = v35Admin_(token); return v36SaveQualCore_(v36Actor_(a), employeeId, row, payload, 'لوحة الإدارة'); }

/* ============ العلاقات: نقل / ربط / إنهاء ============ */
function v36ActiveRel_(st) { st = String(st || '').trim(); return !st || st === 'نشطة' || st === 'فعال' || st === 'قائم'; }
function v36CloseRelations_(employeeId, schoolId, note) {   // schoolId فارغ = كل العلاقات النشطة
  var sh = v36Sheet_('04_علاقات_المدارس'), h = v36Headers_(sh), ix = schoolV31Idx_(h), n = 0;
  var v = sh.getRange(2, 1, Math.max(0, sh.getLastRow() - 1), h.length).getDisplayValues();
  v.forEach(function (r, i) {
    if (String(r[ix.employeeId]).trim() !== String(employeeId)) return;
    if (schoolId && String(r[ix.schoolId]).trim() !== String(schoolId)) return;
    if (!v36ActiveRel_(r[ix['الحالة']])) return;
    var row = i + 2;
    var upd = {};
    if (ix['الحالة'] != null) upd[ix['الحالة'] + 1] = 'غير نشطة';
    if (ix['تاريخ_النهاية'] != null) upd[ix['تاريخ_النهاية'] + 1] = new Date();
    if (ix['ملاحظات'] != null) upd[ix['ملاحظات'] + 1] = String(note || '');
    v50WriteRow_(sh, row, upd);
    n++;
  });
  return n;
}
function v36AddRelation_(employeeId, schoolId, type, source, note) {
  var sh = v36Sheet_('04_علاقات_المدارس'), h = v36Headers_(sh), ix = schoolV31Idx_(h), r = new Array(h.length).fill('');
  function put(k, v) { if (ix[k] != null) r[ix[k]] = v; }
  put('relationId', 'REL_' + Utilities.getUuid().replace(/-/g, '').slice(0, 20).toUpperCase()); put('employeeId', employeeId); put('schoolId', schoolId);
  put('نوع_العلاقة', type); put('isOriginal', type === 'أصلي'); put('تاريخ_البداية', new Date()); put('الحالة', 'نشطة'); put('مصدر_العلاقة', source); put('ملاحظات', note || '');
  v50A_(sh.appendRow(r));
}
function v36EmployeeRow_(employeeId) {
  var sh = v36Sheet_('01_الأساسي'), h = v36Headers_(sh), row = v36FindRow_(sh, h, 'employeeId', employeeId);
  if (!row) throw new Error('العامل غير موجود.'); return { sh: sh, h: h, ix: schoolV31Idx_(h), row: row };
}
function v36SetCells_(x, map) { var upd = {}; Object.keys(map).forEach(function (k) { if (x.ix[k] != null) upd[x.ix[k] + 1] = map[k]; }); v50WriteRow_(x.sh, x.row, upd); }
function v36ActiveRelCount_(employeeId, schoolId) {
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), n = 0;
  rel.rows.forEach(function (r) { if (schoolV31Val_(r, ri, 'employeeId') === String(employeeId) && (!schoolId || schoolV31Val_(r, ri, 'schoolId') === String(schoolId)) && v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة'))) n++; });
  return n;
}
function v36TransferCore_(actor, employeeId, fromId, toId, reason, source) {
  if (!toId) throw new Error('اختر المدرسة المنقول إليها.');
  v35SchoolRow_(toId); if (fromId) v35SchoolRow_(fromId);
  if (fromId && String(fromId) === String(toId)) throw new Error('المدرسة المنقول إليها هي نفس المدرسة الحالية.');
  if (v36ActiveRelCount_(employeeId, toId)) throw new Error('العامل مرتبط بالفعل بالمدرسة المنقول إليها.');
  return v35Lock_(function () {
    var e = v36EmployeeRow_(employeeId), closed = fromId ? v36CloseRelations_(employeeId, fromId, 'نقل إلى ' + v36SchoolName_(toId) + (reason ? ' — ' + reason : '')) : 0;
    v36AddRelation_(employeeId, toId, 'أصلي', source, 'نقل' + (fromId ? ' من ' + v36SchoolName_(fromId) : '') + (reason ? ' — ' + reason : ''));
    v36SetCells_(e, { 'originalSchoolId': toId, 'الحالة_الوظيفية': 'قائم', 'حالة_السجل': 'قائم' });
    schoolV31Log_(actor, 'نقل عامل', employeeId, [['المدرسة', fromId ? v36SchoolName_(fromId) : '', v36SchoolName_(toId)]]);
    return { success: true, message: 'تم نقل العامل إلى ' + v36SchoolName_(toId) + ' وحُفظ سجله السابق.', closed: closed };
  });
}
function v36DeactivateCore_(actor, employeeId, reason) {
  return v35Lock_(function () {
    var e = v36EmployeeRow_(employeeId), closed = v36CloseRelations_(employeeId, '', 'إنهاء خدمة' + (reason ? ' — ' + reason : ''));
    v36SetCells_(e, { 'الحالة_الوظيفية': 'غير قائم', 'حالة_السجل': 'غير قائم' });
    schoolV31Log_(actor, 'تعطيل عامل', employeeId, [['الحالة', 'قائم', 'غير قائم'], ['السبب', '', reason || '']]);
    return { success: true, message: 'تم تعطيل العامل وإغلاق علاقاته مع الاحتفاظ بسجله.', closed: closed };
  });
}
function adminTransferWorkerV36(token, employeeId, fromSchoolId, toSchoolId, reason) { var a = v35Admin_(token); return v36TransferCore_(v36Actor_(a), employeeId, fromSchoolId, toSchoolId, reason, 'لوحة الإدارة'); }
function adminLinkWorkerV36(token, employeeId, schoolId, type) {
  var a = v35Admin_(token); type = String(type || 'أصلي');
  // V7.17: المصدر الموحد لقائمة العلاقة؛ التخزين الداخلي القديم يبقى كما هو حتى لا تتأثر الحسابات.
  var internalType = v81RelationToInternal_(type);
  if (!internalType) throw new Error('هذا التصنيف لا يمثل علاقة مدرسية نشطة قابلة للربط المباشر. استخدم نوع علاقة عمل مثل «أصلي» أو «منتدب إلينا».');
  v35SchoolRow_(schoolId); if (v36ActiveRelCount_(employeeId, schoolId)) throw new Error('العامل مرتبط بالفعل بهذه المدرسة.');
  return v35Lock_(function () {
    var e = v36EmployeeRow_(employeeId); v36AddRelation_(employeeId, schoolId, internalType, 'لوحة الإدارة', 'ربط من الإدارة');
    if (internalType === 'أصلي') v36SetCells_(e, { 'originalSchoolId': schoolId });
    v36SetCells_(e, { 'الحالة_الوظيفية': 'قائم', 'حالة_السجل': 'قائم' });
    schoolV31Log_(v36Actor_(a), 'ربط عامل بمدرسة', employeeId, [['المدرسة', '', v36SchoolName_(schoolId)], ['النوع', '', type]]);
    return { success: true, message: 'تم ربط العامل بالمدرسة.' };
  });
}
function adminSetWorkerActiveV36(token, employeeId, active, reason) {
  var a = v35Admin_(token);
  if (active === true || active === 'true') {
    var e = v36EmployeeRow_(employeeId); v36SetCells_(e, { 'الحالة_الوظيفية': 'قائم', 'حالة_السجل': 'قائم' });
    schoolV31Log_(v36Actor_(a), 'إعادة تفعيل عامل', employeeId, [['الحالة', 'غير قائم', 'قائم']]);
    return { success: true, message: 'أُعيد تفعيل العامل. اربطه بمدرسة من «ربط بمدرسة» ليظهر لها.' };
  }
  return v36DeactivateCore_(v36Actor_(a), employeeId, reason);
}
/** مصير العلاقات لعامل: للعرض في ملف الإدارة (تشمل المغلقة) */
function adminWorkerRelationsV36(token, employeeId) {
  v35Admin_(token); var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), out = [];
  var names = {}; try { var s = v24Data_('18_بيانات_المدارس'), si = schoolV31Idx_(s.headers); s.rows.forEach(function (r) { names[schoolV31Val_(r, si, 'schoolId')] = schoolV31Val_(r, si, 'اسم_المدرسة'); }); } catch (e) {}
  rel.rows.forEach(function (r) { if (schoolV31Val_(r, ri, 'employeeId') !== String(employeeId)) return; var sid = schoolV31Val_(r, ri, 'schoolId');
    out.push({ schoolId: sid, school: names[sid] || sid, type: schoolV31Val_(r, ri, 'نوع_العلاقة'), start: schoolV31Val_(r, ri, 'تاريخ_البداية'), end: schoolV31Val_(r, ri, 'تاريخ_النهاية'), status: schoolV31Val_(r, ri, 'الحالة') || 'نشطة', note: schoolV31Val_(r, ri, 'ملاحظات') }); });
  return { success: true, rows: out };
}

/* ============ شؤون الطلاب: تحقق واتساق ============ */
var V36_STU_NUM = ['عدد الفصول/القاعات', 'إجمالي الطلاب', 'ذكور', 'إناث', 'مسلمون', 'مسيحيون', 'مستجدون', 'باقون', 'عدد_ذوي_الإعاقة', 'إعاقة_حركية', 'إعاقة_بصرية', 'إعاقة_سمعية', 'إعاقة_ذهنية', 'توحد', 'إعاقات_أخرى'];
function v36Int_(v) { var s = String(v == null ? '' : v).trim(); return s === '' ? 0 : Number(s); }
function v36ValidateStudent_(f) {
  V36_STU_NUM.forEach(function (k) { var s = String(f[k] == null ? '' : f[k]).trim(); if (s !== '' && (!/^\d+$/.test(s))) throw new Error('«' + k.replace(/_/g, ' ') + '» يجب أن يكون رقمًا صحيحًا موجبًا.'); });
  // V6.5: الفارغ ≠ الصفر — لو أُدخل أي رقم أساسي في الصف يجب إدخال الباقي (0 مسموح).
  var MAIN65 = ['عدد الفصول/القاعات', 'إجمالي الطلاب', 'ذكور', 'إناث', 'مسلمون', 'مسيحيون', 'مستجدون', 'باقون'], filled65 = MAIN65.filter(function (k) { return String(f[k] == null ? '' : f[k]).trim() !== ''; });
  if (filled65.length && filled65.length < MAIN65.length) throw new Error('أكمل كل الخانات (اكتب 0 لما ليس له قيمة): ' + MAIN65.filter(function (k) { return filled65.indexOf(k) < 0; }).join('، '));
  var t = v36Int_(f['إجمالي الطلاب']);
  if (v36Int_(f['ذكور']) + v36Int_(f['إناث']) !== t) throw new Error('إجمالي الطلاب (' + t + ') يجب أن يساوي ذكور + إناث (' + (v36Int_(f['ذكور']) + v36Int_(f['إناث'])) + ').');
  if (v36Int_(f['مسلمون']) + v36Int_(f['مسيحيون']) !== t) throw new Error('إجمالي الطلاب (' + t + ') يجب أن يساوي مسلمون + مسيحيون (' + (v36Int_(f['مسلمون']) + v36Int_(f['مسيحيون'])) + ').');
  if (v36Int_(f['مستجدون']) + v36Int_(f['باقون']) !== t) throw new Error('إجمالي الطلاب (' + t + ') يجب أن يساوي مستجدون + باقون (' + (v36Int_(f['مستجدون']) + v36Int_(f['باقون'])) + ').');
  var dis = v36Int_(f['عدد_ذوي_الإعاقة']), types = ['إعاقة_حركية', 'إعاقة_بصرية', 'إعاقة_سمعية', 'إعاقة_ذهنية', 'توحد', 'إعاقات_أخرى'].reduce(function (a, k) { return a + v36Int_(f[k]); }, 0);
  if (dis > t) throw new Error('عدد ذوي الإعاقة لا يمكن أن يزيد عن إجمالي الطلاب.');
  if ((dis > 0 || types > 0) && dis !== types) throw new Error('مجموع أنواع الإعاقة (' + types + ') يجب أن يساوي عدد ذوي الإعاقة (' + dis + ').');
}
function v36StudentJson_(f) {
  return JSON.stringify({ classes: [v36Int_(f['عدد الفصول/القاعات'])], details: [{ new: v36Int_(f['مستجدون']), male: v36Int_(f['ذكور']), total: v36Int_(f['إجمالي الطلاب']), muslim: v36Int_(f['مسلمون']), old: v36Int_(f['باقون']), female: v36Int_(f['إناث']), christian: v36Int_(f['مسيحيون']) }] });
}

/* ============ ملخصات الإدارة: الطلاب والإعاقة ============ */
function adminStudentsSummaryV36(token) {
  v35Admin_(token); var d = v24Data_('13_شؤون_الطلاب'), ix = schoolV31Idx_(d.headers), per = {}, stage = {}, tot = { total: 0, male: 0, female: 0, classes: 0, muslim: 0, christian: 0, newS: 0, old: 0 };
  var K36 = ['total', 'male', 'female', 'classes', 'muslim', 'christian', 'newS', 'old'];   // V5.8: + الديانة والقيد
  var names = {}; var s = v24Data_('18_بيانات_المدارس'), si = schoolV31Idx_(s.headers); s.rows.forEach(function (r) { names[schoolV31Val_(r, si, 'schoolId')] = schoolV31Val_(r, si, 'اسم_المدرسة'); });
  d.rows.forEach(function (r) {
    var sid = schoolV31Val_(r, ix, 'schoolId'), st = schoolV31Val_(r, ix, 'المرحلة'), gr = schoolV31Val_(r, ix, 'الصف/المستوى'), n = { total: v36Int_(schoolV31Val_(r, ix, 'إجمالي الطلاب')), male: v36Int_(schoolV31Val_(r, ix, 'ذكور')), female: v36Int_(schoolV31Val_(r, ix, 'إناث')), classes: v36Int_(schoolV31Val_(r, ix, 'عدد الفصول/القاعات')), muslim: v36Int_(schoolV31Val_(r, ix, 'مسلمون')), christian: v36Int_(schoolV31Val_(r, ix, 'مسيحيون')), newS: v36Int_(schoolV31Val_(r, ix, 'مستجدون')), old: v36Int_(schoolV31Val_(r, ix, 'باقون')) };
    var p = per[sid] = per[sid] || { schoolId: sid, name: names[sid] || schoolV31Val_(r, ix, 'اسم المدرسة'), total: 0, male: 0, female: 0, classes: 0, muslim: 0, christian: 0, newS: 0, old: 0, rows: 0, statuses: {} };
    K36.forEach(function (k) { p[k] += n[k]; tot[k] += n[k]; }); p.rows++;
    var stt = schoolV31Val_(r, ix, 'حالة الإحصاء') || '—'; p.statuses[stt] = (p.statuses[stt] || 0) + 1;
    var key = st + '|' + gr, g = stage[key] = stage[key] || { stage: st, grade: gr, total: 0, male: 0, female: 0, classes: 0, muslim: 0, christian: 0, newS: 0, old: 0 };
    K36.forEach(function (k) { g[k] += n[k]; });
  });
  var order = { 'رياض أطفال': 0, 'ابتدائي': 1, 'إعدادي': 2, 'ثانوي': 3 }, gorder = ['KG1', 'KG2', 'المستوى الأول', 'المستوى الثاني', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
  var rows = Object.keys(stage).map(function (k) { return stage[k]; }).sort(function (a, b) { return ((order[a.stage] == null ? 9 : order[a.stage]) - (order[b.stage] == null ? 9 : order[b.stage])) || (gorder.indexOf(a.grade) - gorder.indexOf(b.grade)); });
  return { success: true, schools: Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); }), byGrade: rows, totals: tot };
}
function adminDisabilityMatrixV36(token) {
  v35Admin_(token); var order = { 'رياض أطفال': 0, 'ابتدائي': 1, 'إعدادي': 2, 'ثانوي': 3 }, gorder = ['KG1', 'KG2', 'المستوى الأول', 'المستوى الثاني', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
  var types = ['حركية', 'بصرية', 'سمعية', 'ذهنية', 'توحد', 'أخرى'];
  function build(map) { return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return ((order[a.stage] == null ? 9 : order[a.stage]) - (order[b.stage] == null ? 9 : order[b.stage])) || (gorder.indexOf(a.grade) - gorder.indexOf(b.grade)); }); }
  var m1 = {}, d = v24Data_('14_إعاقة_الطلاب'), ix = schoolV31Idx_(d.headers), integrated = 0;
  d.rows.forEach(function (r) {
    if ((schoolV31Val_(r, ix, 'حالة_السجل') || 'قائم') === 'غير قائم') return;
    var st = schoolV31Val_(r, ix, 'المرحلة') || '—', gr = schoolV31Val_(r, ix, 'الصف_المستوى') || '—', t = schoolV31Val_(r, ix, 'نوع_الإعاقة'), key = st + '|' + gr;
    var o = m1[key] = m1[key] || { stage: st, grade: gr, counts: {}, total: 0 }; var tt = types.indexOf(t) >= 0 ? t : 'أخرى';
    o.counts[tt] = (o.counts[tt] || 0) + 1; o.total++; if (schoolV31Val_(r, ix, 'هل_ضمن_الدمج') === 'نعم') integrated++;
  });
  var m2 = {}, s = v24Data_('13_شؤون_الطلاب'), si = schoolV31Idx_(s.headers), cols = { 'حركية': 'إعاقة_حركية', 'بصرية': 'إعاقة_بصرية', 'سمعية': 'إعاقة_سمعية', 'ذهنية': 'إعاقة_ذهنية', 'توحد': 'توحد', 'أخرى': 'إعاقات_أخرى' };
  s.rows.forEach(function (r) {
    var st = schoolV31Val_(r, si, 'المرحلة'), gr = schoolV31Val_(r, si, 'الصف/المستوى'), key = st + '|' + gr, o = m2[key] = m2[key] || { stage: st, grade: gr, counts: {}, total: 0 };
    types.forEach(function (t) { var n = v36Int_(schoolV31Val_(r, si, cols[t])); if (n) { o.counts[t] = (o.counts[t] || 0) + n; o.total += n; } });
  });
  var fromStats = build(m2).filter(function (x) { return x.total > 0; });
  return { success: true, types: types, fromStudents: build(m1), fromStats: fromStats, integrated: integrated };
}

/* ============ للمدرسة: قائمة المدارس المستهدفة عند طلب النقل ============ */
function schoolTargetsV36(token) {
  var s = schoolV31Session_(token), out = [], seen = {};
  // قائمة النقل/الندب تعتمد على حسابات المدارس الفعلية المهاجرة إلى R_المستخدمون، لا على مرجع المدارس الخام الذي قد يحتوي سجلات غير موحدة.
  try {
    var u=v24Data_('R_المستخدمون'),ui=schoolV31Idx_(u.headers);
    u.rows.forEach(function(r){if(schoolV31Val_(r,ui,'role')!=='مدرسة'||schoolV31Val_(r,ui,'status')==='غير فعال')return;var id=schoolV31Val_(r,ui,'schoolId'),n=schoolV31Val_(r,ui,'school');if(id&&n&&id!==s.schoolId&&!seen[id]){seen[id]=1;out.push({schoolId:id,name:n});}});
  }catch(e){}
  out.sort(function(a,b){return a.name.localeCompare(b.name,'ar');});
  try{var dw=v66DiwanId_();if(dw&&dw!==s.schoolId&&!seen[dw])out.unshift({schoolId:dw,name:'ديوان الإدارة'});}catch(e){}   // V6.6
  return {success:true,schools:out};
}

/** حفظ جماعي لصفوف شؤون الطلاب — كل الحقول (الأساسية أو ملخص الدمج) في طلب واحد. تحقق شامل أولًا (كل الصفوف)، ثم حفظ الكل معًا أو لا شيء. */
function schoolSaveStudentsQuickV40(token, updates) {
  var s = schoolV33Session_(token); schoolV31Allowed_('SCHOOL_STUDENTS_EDIT');
  updates = updates || []; if (!updates.length) throw new Error('لا توجد تعديلات لحفظها.');
  var sh = personnelSS_().getSheetByName('13_شؤون_الطلاب'), h = v36Headers_(sh), idx = schoolV33Index_(h);
  var school = schoolV33FindSchoolRow_(s.schoolId), schoolName = school.vals[school.h.indexOf('اسم_المدرسة')];
  var errs = [], plans = [];
  updates.forEach(function (u) {
    var r = Number(u.row); if (r < 2 || r > sh.getLastRow()) { errs.push('صف غير صالح: ' + u.row); return; }
    var old = sh.getRange(r, 1, 1, h.length).getDisplayValues()[0];
    var rowSid = idx.schoolId != null ? String(old[idx.schoolId] || '') : '';
    if (!(rowSid ? rowSid === String(s.schoolId) : personnelNormalizeSchoolNameV1_(old[idx['اسم المدرسة']]) === personnelNormalizeSchoolNameV1_(schoolName))) { errs.push('صف لا يخص مدرستك: ' + u.row); return; }
    var p = u.payload || {}, f = {}; h.forEach(function (k, i) { f[k] = old[i]; }); Object.keys(p).forEach(function (k) { if (SCHOOL_V33_STUDENT_FIELDS.indexOf(k) >= 0) f[k] = p[k]; });
    var label = (f['المرحلة'] || '') + ' / ' + (f['الصف/المستوى'] || '');
    try { v36ValidateStudent_(f); } catch (e) { errs.push(label + ': ' + e.message); return; }
    plans.push({ row: r, old: old, p: p, f: f });
  });
  if (errs.length) throw new Error('لم يُحفظ شيء — راجع:\n' + errs.slice(0, 15).join('\n'));
  return v35Lock_(function () {
    var n = 0;
    plans.forEach(function (pl) {
      var changes = schoolV33Write_(sh, pl.row, h, pl.p, ['schoolId', 'بيانات الصفوف JSON'], SCHOOL_V33_STUDENT_FIELDS);
      if (changes.length && idx['بيانات الصفوف JSON'] != null) v50A_(sh.getRange(pl.row, idx['بيانات الصفوف JSON'] + 1).setValue(v36StudentJson_(pl.f)));
      if (changes.length) { schoolV31Log_(s, 'تعديل شؤون الطلاب (سريع)', 'ROW_' + pl.row, changes); n++; }
    });
    return { success: true, message: 'تم حفظ ' + n + ' صف.', count: n };
  });
}

/* ============ اليومية: غياب الطلاب اليومي حسب الصف + سجل الزوار (نافذة إدخال 7ص–4م، أرشيف للعرض بعدها) ============ */
var V40_DAILY_SHEET = '19_يومية_المدرسة', V40_DAILY_START_HOUR = 7, V40_DAILY_END_HOUR = 16;
function v40DailySheet_() {
  var sh = personnelSS_().getSheetByName(V40_DAILY_SHEET);
  if (!sh) { sh = v50A_(personnelSS_().insertSheet(V40_DAILY_SHEET)); v50A_(sh.getRange(1, 1, 1, 11).setValues([['id', 'schoolId', 'التاريخ', 'النوع', 'المرحلة', 'الصف_المستوى', 'عدد_الغياب', 'اسم_الزائر', 'وقت_الوصول', 'الغرض', 'ملاحظات']])); try { sh.setRightToLeft(true); } catch (e) {} }
  return sh;
}
function v40Today_() { return Utilities.formatDate(new Date(), 'Africa/Cairo', 'yyyy-MM-dd'); }
function v40DailyWindowOpen_() {
  var h = Number(Utilities.formatDate(new Date(), 'Africa/Cairo', 'H'));
  return h >= V40_DAILY_START_HOUR && h < V40_DAILY_END_HOUR;
}
/** يعيد بيانات يوم مُحدَّد: غياب كل مرحلة/صف (مبني على صفوف شئون الطلاب الحالية) + قائمة الزوار. */
function schoolDailyGetV40(token, dateStr) {
  var s = schoolV33Session_(token); schoolV31Allowed_('SCHOOL_STUDENTS_EDIT');
  var date = String(dateStr || '').trim() || v40Today_(), today = v40Today_();
  var isToday = date === today, canEdit = isToday && v40DailyWindowOpen_();
  var stu = v24Data_('13_شؤون_الطلاب'), sti = schoolV31Idx_(stu.headers), school = schoolV33FindSchoolRow_(s.schoolId), schoolName = school.vals[school.h.indexOf('اسم_المدرسة')];
  var grades = stu.rows.filter(function (r) { var sid = sti.schoolId != null ? String(schoolV31Val_(r, sti, 'schoolId') || '') : ''; return sid ? sid === String(s.schoolId) : personnelNormalizeSchoolNameV1_(schoolV31Val_(r, sti, 'اسم المدرسة')) === personnelNormalizeSchoolNameV1_(schoolName); })
    .map(function (r) { return { stage: schoolV31Val_(r, sti, 'المرحلة'), grade: schoolV31Val_(r, sti, 'الصف/المستوى'), total: schoolV31Val_(r, sti, 'إجمالي الطلاب') }; });
  var sh = v40DailySheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), lr = sh.getLastRow();
  var rows = lr > 1 ? sh.getRange(2, 1, lr - 1, h.length).getDisplayValues() : [];
  var mine = rows.filter(function (r) { return schoolV31Val_(r, ix, 'schoolId') === s.schoolId && v35Date_(schoolV31Val_(r, ix, 'التاريخ')) === date; });
  var absenceByGrade = {}; mine.filter(function (r) { return schoolV31Val_(r, ix, 'النوع') === 'صف'; }).forEach(function (r) { absenceByGrade[schoolV31Val_(r, ix, 'المرحلة') + '|' + schoolV31Val_(r, ix, 'الصف_المستوى')] = { id: schoolV31Val_(r, ix, 'id'), count: schoolV31Val_(r, ix, 'عدد_الغياب'), notes: schoolV31Val_(r, ix, 'ملاحظات') }; });
  var visitors = mine.filter(function (r) { return schoolV31Val_(r, ix, 'النوع') === 'زائر'; }).map(function (r) { return { id: schoolV31Val_(r, ix, 'id'), name: schoolV31Val_(r, ix, 'اسم_الزائر'), time: schoolV31Val_(r, ix, 'وقت_الوصول'), purpose: schoolV31Val_(r, ix, 'الغرض') }; });
  var visitorOptions = []; try { var vr = v24Data_('R_الزوار'), vi = schoolV31Idx_(vr.headers); visitorOptions = vr.rows.map(function (r) { return schoolV31Val_(r, vi, 'اسم_الزائر'); }).filter(Boolean); } catch (e) {}
  // V6.0: إدخال مختصر — إجمالي لكل مرحلة (الصف = «الكل»)
  var stageMap = {}; grades.forEach(function (g) { var x = stageMap[g.stage] = stageMap[g.stage] || { stage: g.stage, grade: 'الكل', total: 0 }; x.total += Number(g.total) || 0; });
  var stages = Object.keys(stageMap).map(function (k) { var a = absenceByGrade[k + '|الكل']; var x = stageMap[k]; x.absent = a ? a.count : ''; x.notes = a ? a.notes : ''; return x; });
  var stageMode = Object.keys(absenceByGrade).some(function (k) { return /\|الكل$/.test(k); });
  return { success: true, date: date, isToday: isToday, canEdit: canEdit, schoolDay: v60SchoolDays_(date, date).length > 0, stageMode: stageMode, stages: stages, windowText: V40_DAILY_START_HOUR + ':00 إلى ' + V40_DAILY_END_HOUR + ':00', grades: grades.map(function (g) { var a = absenceByGrade[g.stage + '|' + g.grade]; return { stage: g.stage, grade: g.grade, total: g.total, absent: a ? a.count : '', notes: a ? a.notes : '' }; }), visitors: visitors, visitorOptions: visitorOptions };
}
function schoolDailySaveV40(token, dateStr, grades, visitors) {
  var s = schoolV33Session_(token); schoolV31Allowed_('SCHOOL_STUDENTS_EDIT');
  var date = String(dateStr || '').trim() || v40Today_();
  if (date !== v40Today_()) throw new Error('لا يمكن تسجيل أو تعديل يومية إلا ليوم اليوم فقط.');
  if (!v40DailyWindowOpen_()) throw new Error('باب تسجيل اليومية مفتوح فقط من الساعة ' + V40_DAILY_START_HOUR + ' صباحًا حتى ' + V40_DAILY_END_HOUR + ' مساءً — سجل اليوم أصبح أرشيفًا للعرض فقط.');
  // مراجعة: الغياب لا يجوز أن يتجاوز عدد المقيدين بكل صف.
  var stu = v24Data_('13_شؤون_الطلاب'), sti = schoolV31Idx_(stu.headers), school = schoolV33FindSchoolRow_(s.schoolId), schoolName = school.vals[school.h.indexOf('اسم_المدرسة')];
  var totalByGrade = {}; stu.rows.forEach(function (r) { var sid = sti.schoolId != null ? String(schoolV31Val_(r, sti, 'schoolId') || '') : ''; var ok = sid ? sid === String(s.schoolId) : personnelNormalizeSchoolNameV1_(schoolV31Val_(r, sti, 'اسم المدرسة')) === personnelNormalizeSchoolNameV1_(schoolName); if (ok) totalByGrade[schoolV31Val_(r, sti, 'المرحلة') + '|' + schoolV31Val_(r, sti, 'الصف/المستوى')] = Number(schoolV31Val_(r, sti, 'إجمالي الطلاب')) || 0; });
  (grades || []).forEach(function (g) {
    var cnt = String(g.absent == null ? '' : g.absent).trim(); if (cnt === '') return;
    var total = 0; if (g.grade === 'الكل') Object.keys(totalByGrade).forEach(function (k) { if (k.split('|')[0] === g.stage) total += totalByGrade[k]; }); else total = totalByGrade[g.stage + '|' + g.grade] || 0;
    if (Number(cnt) > total) throw new Error('غياب «' + g.stage + ' / ' + g.grade + '» (' + cnt + ') أكبر من عدد المقيدين (' + total + ').');
  });
  return v35Lock_(function () {
    var sh = v40DailySheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), lr = sh.getLastRow();
    var rows = lr > 1 ? sh.getRange(2, 1, lr - 1, h.length).getDisplayValues() : [];
    // امسح صفوف اليوم لهذه المدرسة وأعد كتابتها (أبسط وآمن من عملية تحديث جزئية معقدة)
    var toDelete = []; rows.forEach(function (r, i) { if (schoolV31Val_(r, ix, 'schoolId') === s.schoolId && v35Date_(schoolV31Val_(r, ix, 'التاريخ')) === date) toDelete.push(i + 2); });
    toDelete.sort(function (a, b) { return b - a; }).forEach(function (r) { v50A_(sh.deleteRow(r)); });
    var add = [];
    (grades || []).forEach(function (g) {
      var cnt = String(g.absent == null ? '' : g.absent).trim(); if (cnt === '') return;
      if (!/^\d+$/.test(cnt)) throw new Error('عدد الغياب في «' + g.stage + ' / ' + g.grade + '» يجب أن يكون رقمًا صحيحًا.');
      var row_ = new Array(h.length).fill(''); function p(k, v) { if (ix[k] != null) row_[ix[k]] = v; }
      p('id', 'DLY_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase()); p('schoolId', s.schoolId); p('التاريخ', date); p('النوع', 'صف'); p('المرحلة', g.stage); p('الصف_المستوى', g.grade); p('عدد_الغياب', cnt); p('ملاحظات', schoolV31Clean_(g.notes));
      add.push(row_);
    });
    (visitors || []).forEach(function (v) {
      if (!String(v.name || '').trim()) return;
      var row_ = new Array(h.length).fill(''); function p(k, val) { if (ix[k] != null) row_[ix[k]] = val; }
      p('id', 'VIS_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase()); p('schoolId', s.schoolId); p('التاريخ', date); p('النوع', 'زائر'); p('اسم_الزائر', v.name); p('وقت_الوصول', v.time || ''); p('الغرض', v.purpose || '');
      add.push(row_);
    });
    v36AppendRows_(sh, add);
    schoolV31Log_(s, 'حفظ يومية المدرسة', s.schoolId + '|' + date, [['صفوف غياب', '', String((grades || []).filter(function (g) { return String(g.absent || '').trim() !== ''; }).length)], ['زوار', '', String((visitors || []).filter(function (v) { return v.name; }).length)]]);
    return { success: true, message: 'تم حفظ يومية ' + date + '.' };
  });
}

/* ============ نوع المدرسة → مراحل → صفوف (على غرار app4): توليد تلقائي لصفوف شؤون الطلاب ============ */
var V40_SCHOOL_TYPES = ['ابتدائي', 'إعدادي', 'ثانوي عام', 'ثانوي فني', 'رياض أطفال + ابتدائي', 'رياض أطفال + ابتدائي + إعدادي', 'ابتدائي + إعدادي', 'التعليم المجتمعي'];
var V40_TYPE_STAGES_ = { 'ابتدائي': ['ابتدائي'], 'إعدادي': ['إعدادي'], 'ثانوي': ['ثانوي'], 'ثانوي عام': ['ثانوي'], 'ثانوي فني': ['ثانوي'], 'رياض أطفال + ابتدائي': ['رياض أطفال', 'ابتدائي'], 'رياض أطفال + ابتدائي + إعدادي': ['رياض أطفال', 'ابتدائي', 'إعدادي'], 'ابتدائي + إعدادي': ['ابتدائي', 'إعدادي'] };
function v40StagesForType_(type) { return V40_TYPE_STAGES_[String(type || '').trim()] || []; }
function v40GradeLabelsRef_() {
  var sh = v24Data_('22_مرجع_المراحل_والصفوف'), ix = schoolV31Idx_(sh.headers), out = {};
  sh.rows.forEach(function (r) { var st = schoolV31Val_(r, ix, 'المرحلة'); if (!out[st]) out[st] = []; out[st].push(schoolV31Val_(r, ix, 'الصف_المستوى')); });
  return out;
}
/** يبني الصفوف الناقصة في شؤون الطلاب حسب نوع المدرسة، ويحافظ على أي بيانات مُدخلة بالفعل بلا لمسها. لا يحذف صفوفًا موجودة حتى لو لم تعد ضمن النوع (تُترك للمراجعة اليدوية). */
function v40EnsureStudentScaffold_(schoolId, actor) {
  var s18 = v24Data_('18_بيانات_المدارس'), si = schoolV31Idx_(s18.headers), row18 = null;
  s18.rows.forEach(function (r) { if (schoolV31Val_(r, si, 'schoolId') === String(schoolId)) row18 = r; });
  if (!row18) throw new Error('المدرسة غير موجودة.');
  var type = schoolV31Val_(row18, si, 'نوع_المدرسة'), schoolName = schoolV31Val_(row18, si, 'اسم_المدرسة');
  if (type === 'التعليم المجتمعي') return { created: 0, note: 'مدرسة تعليم مجتمعي — لها نظامها الخاص.' };
  var stages = v40StagesForType_(type); if (!stages.length) return { created: 0, note: type ? ('نوع مدرسة غير معروف: ' + type) : 'لم يُحدَّد نوع المدرسة بعد.' };
  var labels = v40GradeLabelsRef_();
  var sh = personnelSS_().getSheetByName('13_شؤون_الطلاب'), h = v36Headers_(sh), ix = schoolV33Index_(h), lr = sh.getLastRow();
  var rows = lr > 1 ? sh.getRange(2, 1, lr - 1, h.length).getDisplayValues() : [];
  var existing = {}; rows.forEach(function (r) { var sid = ix.schoolId != null ? String(r[ix.schoolId] || '') : ''; var ok = sid ? sid === String(schoolId) : personnelNormalizeSchoolNameV1_(r[ix['اسم المدرسة']]) === personnelNormalizeSchoolNameV1_(schoolName); if (ok) existing[r[ix['المرحلة']] + '|' + r[ix['الصف/المستوى']]] = true; });
  var toAdd = [], serial = 0;
  stages.forEach(function (stage) {
    (labels[stage] || []).forEach(function (grade) {
      if (existing[stage + '|' + grade]) return;
      var r = new Array(h.length).fill(''); function p(k, v) { if (ix[k] != null) r[ix[k]] = v; }
      p('كود هيئة الأبنية', schoolV31Val_(row18, si, 'كود_هيئة_الأبنية')); p('اسم المدرسة', schoolName); p('نوع المدرسة', type); p('المرحلة', stage); p('الصف/المستوى', grade);
      p('حالة الإحصاء', 'تم الإدخال'); p('عدد الفصول/القاعات', 0); p('إجمالي الطلاب', 0); p('ذكور', 0); p('إناث', 0); p('مسلمون', 0); p('مسيحيون', 0); p('مستجدون', 0); p('باقون', 0);
      p('عدد_ذوي_الإعاقة', 0); p('إعاقة_حركية', 0); p('إعاقة_بصرية', 0); p('إعاقة_سمعية', 0); p('إعاقة_ذهنية', 0); p('توحد', 0); p('إعاقات_أخرى', 0);
      if (ix.schoolId != null) p('schoolId', schoolId);
      toAdd.push(r);
    });
  });
  if (toAdd.length) { v35Lock_(function () { v36AppendRows_(sh, toAdd); }); if (actor) schoolV31Log_(actor, 'توليد صفوف شؤون الطلاب من نوع المدرسة', schoolId, [['النوع', '', type], ['صفوف أُضيفت', '', String(toAdd.length)]]); }
  return { created: toAdd.length, type: type, stages: stages };
}
function schoolSaveSchoolTypeV40(token, type) {
  var s = schoolV33Session_(token); schoolV31Allowed_('SCHOOL_DATA_EDIT');
  if (V40_SCHOOL_TYPES.indexOf(type) < 0) throw new Error('نوع مدرسة غير صحيح.');
  var sh = personnelSS_().getSheetByName('18_بيانات_المدارس'), x = v35SchoolRow_(s.schoolId);
  var oldType = x.vals[x.h.indexOf('نوع_المدرسة')];
  v35Lock_(function () { v50A_(sh.getRange(x.row, x.h.indexOf('نوع_المدرسة') + 1).setValue(type)); });
  schoolV31Log_(s, 'تحديد نوع المدرسة', s.schoolId, [['النوع', oldType, type]]);
  var scaffold = v40EnsureStudentScaffold_(s.schoolId, s);
  return { success: true, message: 'تم حفظ نوع المدرسة' + (scaffold.created ? '، وأُضيف ' + scaffold.created + ' صف جديد لشؤون الطلاب.' : (type === 'التعليم المجتمعي' ? '.' : '، وكل الصفوف اللازمة موجودة بالفعل.')), scaffold: scaffold };
}
function adminBuildStudentScaffoldsV40(token) {
  var a = v35Admin_(token);
  var s18 = v24Data_('18_بيانات_المدارس'), si = schoolV31Idx_(s18.headers);
  var results = { schools: 0, created: 0, noType: 0, community: 0, details: [] };
  s18.rows.forEach(function (r) {
    var sid = schoolV31Val_(r, si, 'schoolId'), name = schoolV31Val_(r, si, 'اسم_المدرسة'); if (!sid || !name) return;
    var res = v40EnsureStudentScaffold_(sid, v36Actor_(a));
    results.schools++;
    if (res.type === 'التعليم المجتمعي') { results.community++; return; }
    if (!res.stages) { results.noType++; return; }
    if (res.created) { results.created += res.created; results.details.push(name + ': +' + res.created + ' صف'); }
  });
  return { success: true, message: 'فحصت ' + results.schools + ' مدرسة — أضفت ' + results.created + ' صف جديد إجمالًا. ' + results.noType + ' مدرسة بلا نوع محدَّد، ' + results.community + ' مدرسة تعليم مجتمعي (نظام مستقل).', results: results };
}

/* ============ التعليم المجتمعي: نظام مستقل (سطر واحد لكل مدرسة بأعمدة الصفوف الستة) ============ */
var V40_COMMUNITY_SHEET = '20_التعليم_المجتمعي';
function v40CommunitySheet_() {
  var sh = personnelSS_().getSheetByName(V40_COMMUNITY_SHEET);
  if (!sh) { sh = v50A_(personnelSS_().insertSheet(V40_COMMUNITY_SHEET)); v50A_(sh.getRange(1, 1, 1, 10).setValues([['schoolId', 'اسم_المدرسة', 'الصف_الأول', 'الصف_الثاني', 'الصف_الثالث', 'الصف_الرابع', 'الصف_الخامس', 'الصف_السادس', 'إجمالي_الطلاب', 'ملاحظات']])); try { sh.setRightToLeft(true); sh.setFrozenRows(1); } catch (e) {} }
  return sh;
}
function schoolCommunityGetV40(token) {
  var s = schoolV33Session_(token); schoolV31Allowed_('SCHOOL_STUDENTS_EDIT');
  var sh = v40CommunitySheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), lr = sh.getLastRow();
  var row = null; if (lr > 1) sh.getRange(2, 1, lr - 1, h.length).getDisplayValues().forEach(function (r) { if (r[ix.schoolId] === s.schoolId) row = r; });
  var f = {}; ['الصف_الأول', 'الصف_الثاني', 'الصف_الثالث', 'الصف_الرابع', 'الصف_الخامس', 'الصف_السادس', 'إجمالي_الطلاب', 'ملاحظات'].forEach(function (k) { f[k] = row ? row[ix[k]] : ''; });
  return { success: true, fields: f };
}
function schoolCommunitySaveV40(token, payload) {
  var s = schoolV33Session_(token); schoolV31Allowed_('SCHOOL_STUDENTS_EDIT');
  var sh = v40CommunitySheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), lr = sh.getLastRow(), rowNum = -1;
  if (lr > 1) { var vals = sh.getRange(2, 1, lr - 1, h.length).getDisplayValues(); for (var i = 0; i < vals.length; i++) if (vals[i][ix.schoolId] === s.schoolId) { rowNum = i + 2; break; } }
  var grades = ['الصف_الأول', 'الصف_الثاني', 'الصف_الثالث', 'الصف_الرابع', 'الصف_الخامس', 'الصف_السادس'], sum = 0;
  grades.forEach(function (k) { var v = String(payload[k] == null ? '' : payload[k]).trim(); if (v && !/^\d+$/.test(v)) throw new Error('«' + k.replace(/_/g, ' ') + '» يجب أن يكون رقمًا صحيحًا.'); sum += Number(v) || 0; });
  var total = Number(payload['إجمالي_الطلاب']) || 0;
  if (total !== sum) throw new Error('إجمالي الطلاب (' + total + ') يجب أن يساوي مجموع الصفوف الستة (' + sum + ').');
  return v35Lock_(function () {
    var arr = rowNum > 0 ? sh.getRange(rowNum, 1, 1, h.length).getDisplayValues()[0] : new Array(h.length).fill('');
    function p(k, v) { if (ix[k] != null) arr[ix[k]] = v; }
    p('schoolId', s.schoolId); p('اسم_المدرسة', s.school);
    grades.concat(['إجمالي_الطلاب', 'ملاحظات']).forEach(function (k) { if (payload[k] !== undefined) p(k, schoolV31Clean_(payload[k])); });
    if (rowNum > 0) v50A_(sh.getRange(rowNum, 1, 1, h.length).setValues([arr])); else v50A_(sh.appendRow(arr));
    schoolV31Log_(s, 'حفظ بيانات التعليم المجتمعي', s.schoolId, [['الإجمالي', '', String(total)]]);
    return { success: true, message: 'تم حفظ بيانات التعليم المجتمعي.' };
  });
}
function adminCommunityOverviewV40(token) {
  v35Admin_(token);
  var sh = v40CommunitySheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), lr = sh.getLastRow();
  var byId = {}; if (lr > 1) sh.getRange(2, 1, lr - 1, h.length).getDisplayValues().forEach(function (r) { byId[r[ix.schoolId]] = r; });
  var s18 = v24Data_('18_بيانات_المدارس'), si = schoolV31Idx_(s18.headers);
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), wc = {};
  rel.rows.forEach(function (r) { if (v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة'))) { var sid = schoolV31Val_(r, ri, 'schoolId'); wc[sid] = (wc[sid] || 0) + 1; } });
  var out = [];
  s18.rows.forEach(function (r) {
    if (schoolV31Val_(r, si, 'نوع_المدرسة') !== 'التعليم المجتمعي') return;
    var sid = schoolV31Val_(r, si, 'schoolId'), row = byId[sid];
    out.push({ schoolId: sid, name: schoolV31Val_(r, si, 'اسم_المدرسة'), total: row ? row[ix['إجمالي_الطلاب']] : '', hasData: !!row, workers: wc[sid] || 0 });
  });
  out.sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); });
  var totals = { schools: out.length, students: out.reduce(function (a, x) { return a + (Number(x.total) || 0); }, 0), workers: out.reduce(function (a, x) { return a + x.workers; }, 0) };
  return { success: true, rows: out, totals: totals };
}
