/** V4.0 — حركة العاملين الأساسيين: نقل / ندب كلي / ندب جزئي / إضافة بالرقم القومي / حذف.
 *  القاعدة الذهبية: القرار بين المدرستين مباشرة، والطرف الذي لم يبدأ الطلب هو الذي يوافق أو يرفض.
 *  الإدارة لا توافق ولا ترفض — تقرير متابعة فقط (مع مفتاح إعداد لتفعيل اشتراط موافقتها لاحقًا دون تعديل الكود).
 */
var V40_REQ_SHEET = '09_طلبات_متبادلة';
var V40_PERMANENT_REASONS = ['وفاة', 'معاش', 'نقل خارج الإدارة', 'نقل خارج المحافظة', 'نقل لوزارة أخرى', 'ندب كلي خارج المنظومة'];
var V40_UNKNOWN_REASON = 'المدرسة لا تعرفه / خطأ تسجيل';
var V40_REMOVAL_REASONS = V40_PERMANENT_REASONS.concat([V40_UNKNOWN_REASON]);

function v40ReqSheet_() { return v36Sheet_(V40_REQ_SHEET); }
function v40ReqAdd_(fields) {
  if (fields && (fields['أيام_الندب_الجزئي'] !== undefined)) { var s68 = v40ReqSheet_(); schoolEnsureWorkerColumnV40_(s68, 'أيام_الندب_الجزئي'); schoolEnsureWorkerColumnV40_(s68, 'حصص_الندب_الجزئي'); }   // V6.8
  var sh = v40ReqSheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), r = new Array(h.length).fill('');
  function put(k, val) { if (ix[k] != null) r[ix[k]] = v93SafeCell_(val); }   // V7.35: منع حقن معادلات
  put('requestId', 'REQ40_' + Utilities.getUuid().replace(/-/g, '').slice(0, 18).toUpperCase());
  put('الحالة', 'مفتوح'); put('تاريخ_الطلب', new Date());
  Object.keys(fields).forEach(function (k) { put(k, fields[k]); });
  v50A_(sh.appendRow(r)); return r[ix['requestId']];
}
function v40ReqFind_(requestId) {
  var sh = v40ReqSheet_(), h = v36Headers_(sh), row = v36FindRow_(sh, h, 'requestId', requestId);
  if (!row) throw new Error('الطلب غير موجود.'); return { sh: sh, h: h, ix: schoolV31Idx_(h), row: row, vals: sh.getRange(row, 1, 1, h.length).getDisplayValues()[0] };
}
var V93_REQ_MEMO_ = null;
function v40ReqList_(filter) {   // V7.35: قراءة واحدة لكل تنفيذ (adminFinanceReadinessV64 كانت تقرأها 63 مرة)؛ وضع الحفظ يقرأ مباشرة
  var all = (!V50_DIRTY_ && V93_REQ_MEMO_) ? V93_REQ_MEMO_ : null;
  if (!all) { var sh = v40ReqSheet_(), h = v36Headers_(sh), lr = sh.getLastRow(), v = lr > 1 ? sh.getRange(2, 1, lr - 1, h.length).getDisplayValues() : [];
    all = v.map(function (r) { var o = {}; h.forEach(function (k, i) { if (k) o[k] = r[i]; }); return o; }); if (!V50_DIRTY_) V93_REQ_MEMO_ = all; }
  return all.map(function (o) { var c = {}; for (var k in o) c[k] = o[k]; return c; }).filter(filter || function () { return true; });
}
function v40Names_(schoolId) { try { var m = v93SchoolNameMap_(); if (m[schoolId]) return m[schoolId]; return v36SchoolName_(schoolId); } catch (e) { return schoolId; } }   // V7.35: خريطة مخزنة بدل قراءة شيت المدارس كاملًا لكل اسم

/* ============ فحص الرقم القومي قبل الإضافة ============ */
/** يبحث عن الرقم القومي في 01_الأساسي، ويعيد حالته: جديد / متاح / مرتبط بمدرسة أخرى. */
function schoolLookupNationalIdV40(token, nationalId) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  return v40LookupCore_(nationalId, s.schoolId);
}
function v40LookupCore_(nationalId, mySchoolId) {
  var nid = v24DigitsLocalV31_(nationalId), nv=v24ValidateNationalIdV40_(nationalId); if (!nv.valid) throw new Error(nv.message);
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), row = null, idx = -1;
  emp.rows.forEach(function (r, i) { if (v24DigitsLocalV31_(schoolV31Val_(r, ei, 'الرقم_القومي')) === nid) { row = r; idx = i; } });
  if (!row) return { success: true, state: 'جديد', message: 'رقم قومي جديد — يمكن إضافته مباشرة.' };
  var eid = schoolV31Val_(row, ei, 'employeeId'), rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers);
  var mine_rel = rel.rows.filter(function (r) { return schoolV31Val_(r, ri, 'employeeId') === eid; });
  var active = mine_rel.filter(function (r) { return v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة')); });
  var name = schoolV31Val_(row, ei, 'الاسم'), job = schoolV31Val_(row, ei, 'المسمى_الوظيفي');
  if (schoolV31Val_(row, ei, 'تاريخ_إنهاء_الخدمة')) return { success: true, state: 'غير متاح نهائيًا', employeeId: eid, name: name, job: job, message: name + ' انتهت خدمته (' + (schoolV31Val_(row, ei, 'سبب_إنهاء_الخدمة') || 'إنهاء خدمة') + ') ولا يمكن إضافته.' };
  if (!active.length) {
    var permanent = mine_rel.some(function (r) { return String(schoolV31Val_(r, ri, 'إنهاء_نهائي')).trim() === 'نعم'; });
    if (permanent) return { success: true, state: 'غير متاح نهائيًا', employeeId: eid, name: name, job: job, message: name + ' خرج نهائيًا من المنظومة (وفاة/معاش/نقل خارجي) ولا يمكن إضافته.' };
    return { success: true, state: 'متاح', employeeId: eid, name: name, job: job, message: name + ' موجود في السجلات ومتاح — سيُضاف لمدرستك مباشرة بلا حاجة لموافقة.' };
  }
  var mine = mySchoolId && active.some(function (r) { return schoolV31Val_(r, ri, 'schoolId') === String(mySchoolId); });
  if (mine) return { success: true, state: 'عندك بالفعل', employeeId: eid, name: name, job: job, message: name + ' مسجَّل عندك بالفعل.' };
  var at = active.filter(function (r) { return schoolV31Val_(r, ri, 'نوع_العلاقة') === 'أصلي'; })[0] || active[0], atSchoolId = schoolV31Val_(at, ri, 'schoolId');
  return { success: true, state: 'مرتبط', employeeId: eid, name: name, job: job, schoolId: atSchoolId, schoolName: v40Names_(atSchoolId), relationType: schoolV31Val_(at, ri, 'نوع_العلاقة'), message: name + ' مسجَّل حاليًا في «' + v40Names_(atSchoolId) + '» — أرسل طلبًا لها لتوافق على نقله أو ندبه.' };
}
/** إضافة موظف «متاح» (بلا علاقة نشطة) مباشرة لمدرسة — بلا موافقة لأن لا أحد يملكه حاليًا. */
function schoolClaimAvailableV40(token, employeeId) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  var chk = v40LookupCore_((v24Data_('01_الأساسي').rows.filter(function (r) { return r[0] === employeeId; })[0] || [])[1] || '', s.schoolId);
  if (chk.state !== 'متاح') throw new Error('هذا الموظف لم يعد متاحًا (' + chk.state + ').');
  return v35Lock_(function () {
    v36AddRelation_(employeeId, s.schoolId, 'أصلي', 'بوابة المدرسة', 'إضافة موظف متاح');
    var e = v36EmployeeRow_(employeeId); v36SetCells_(e, { originalSchoolId: s.schoolId, الحالة_الوظيفية: 'قائم', حالة_السجل: 'قائم' });
    schoolV31Log_(s, 'إضافة موظف متاح', employeeId, [['المدرسة', '', s.school]]);
    return { success: true, message: 'تمت إضافته لمدرستك.' };
  });
}

/* ============ طلبات النقل / الندب (موافقة الطرف الآخر) ============ */
var V40_MOVE_TYPES = ['نقل', 'ندب كلي', 'ندب جزئي'];   // V7.35: قيم داخلية ثابتة (= v81MovementLabels_ بعد التحويل). لا تستدعِ دوال ملفات لاحقة في كود عام — ترتيب التحميل.
/** أي مدرسة من الاتنين تقدر تبدأ: initiator = 'current' (المدرسة الحالية تطلب النقل/الندب لمدرسة أخرى) أو 'target' (مدرسة تريد استقدام موظف مرتبط بمدرسة أخرى). */
/** مدرسة تريد استقدام موظف مرتبط حاليًا بمدرسة أخرى — الطلب يذهب لمدرسته الحالية لتوافق. */
/** المدرسة التي لم تُبادر (fromSchoolId إن كان المبادر toSchoolId، أو العكس) توافق أو ترفض. */
/** طلبات مدرستي: الصادرة والواردة (بانتظار ردّي). */

/* ============ حالة «قائم بالعمل» ============ */
/** تُحدَّث من المدرسة الأصلية، أو من المنتدب إليها كليًا إن وُجدت. */
function v40CanSetActive_(schoolId, employeeId) {
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers);
  var full = rel.rows.filter(function (r) { return schoolV31Val_(r, ri, 'employeeId') === employeeId && schoolV31Val_(r, ri, 'نوع_العلاقة') === 'منتدب إلينا كلي' && v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة')); })[0];
  if (full) return schoolV31Val_(full, ri, 'schoolId') === String(schoolId);
  var e = v36EmployeeRow_(employeeId); return String(e.vals ? e.vals[e.ix.originalSchoolId] : e.sh.getRange(e.row, e.ix.originalSchoolId + 1).getDisplayValue()) === String(schoolId);
}
function schoolSetWorkPresenceV40(token, employeeId, present, reason) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  if (!v36SchoolOwnsWorker_(s.schoolId, employeeId)) throw new Error('العامل غير مرتبط بهذه المدرسة.');
  if (!v40CanSetActive_(s.schoolId, employeeId)) throw new Error('تحديث «قائم بالعمل» متاح فقط لمدرسته الأصلية، أو المنتدب إليها كليًا إن وُجدت.');
  if (!present && !String(reason || '').trim()) throw new Error('اكتب سبب عدم القيام بالعمل.');
  return v35Lock_(function () {
    var e = v36EmployeeRow_(employeeId); v36SetCells_(e, { قائم_بالعمل: present ? 'نعم' : 'لا', سبب_عدم_القيام: present ? '' : reason });
    schoolV31Log_(s, present ? 'تسجيل قائم بالعمل' : 'تسجيل غير قائم بالعمل', employeeId, [['السبب', '', reason || '']]);
    return { success: true, message: present ? 'تم تسجيله قائمًا بالعمل.' : 'تم تسجيله غير قائم بالعمل — لن يدخل حساب استحقاقات هذا الشهر.' };
  });
}

/* ============ الحذف (بدون موافقة إدارة) ============ */
function schoolRemoveWorkerV40(token, employeeId, reason, note) {
  throw new Error('هذا المسار القديم متوقف (V7.58) — غيّر حالة العامل من «🔄 الحالة» بالقائمة الموحدة.');
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_REMOVE_REQUEST');
  if (!v36SchoolOwnsWorker_(s.schoolId, employeeId)) throw new Error('العامل غير مرتبط بهذه المدرسة.');
  if (V40_REMOVAL_REASONS.indexOf(reason) < 0) throw new Error('اختر سببًا صحيحًا.');
  var permanent = reason !== V40_UNKNOWN_REASON;
  return v35Lock_(function () {
    var sh = v36Sheet_('04_علاقات_المدارس'), h = v36Headers_(sh), ix = schoolV31Idx_(h), lr = sh.getLastRow();
    var v = lr > 1 ? sh.getRange(2, 1, lr - 1, h.length).getDisplayValues() : [], n = 0;
    v.forEach(function (r, i) {
      if (String(r[ix.employeeId]).trim() !== String(employeeId) || String(r[ix.schoolId]).trim() !== String(s.schoolId) || !v36ActiveRel_(r[ix['الحالة']])) return;
      var row = i + 2;
      var upd = {}; upd[ix['الحالة'] + 1] = 'غير نشطة'; upd[ix['تاريخ_النهاية'] + 1] = new Date();
      upd[ix['سبب_الإنهاء'] + 1] = reason; upd[ix['إنهاء_نهائي'] + 1] = permanent ? 'نعم' : 'لا';
      upd[ix['ملاحظات'] + 1] = note || ''; v50WriteRow_(sh, row, upd); n++;
    });
    if (!n) throw new Error('لا توجد علاقة نشطة لهذا العامل بمدرستك.');
    // V5.6: علاقاته النشطة في مدارس أخرى
    var others = [], promoted = '';
    v.forEach(function (r, i) { if (String(r[ix.employeeId]).trim() === String(employeeId) && String(r[ix.schoolId]).trim() !== String(s.schoolId) && v36ActiveRel_(r[ix['الحالة']])) others.push({ row: i + 2, r: r }); });
    if (permanent) {
      // سبب نهائي (وفاة/معاش/نقل خارجي...) يخص الشخص نفسه ← تُغلق علاقاته في كل المدارس
      others.forEach(function (o) { var upd = {}; upd[ix['الحالة'] + 1] = 'غير نشطة'; upd[ix['تاريخ_النهاية'] + 1] = new Date(); upd[ix['سبب_الإنهاء'] + 1] = reason; upd[ix['إنهاء_نهائي'] + 1] = 'نعم'; upd[ix['ملاحظات'] + 1] = 'أُغلقت تلقائيًا: ' + reason + ' (سجّلته ' + (s.school || s.schoolId) + ')'; v50WriteRow_(sh, o.row, upd); });
      var e = v36EmployeeRow_(employeeId); v36SetCells_(e, { الحالة_الوظيفية: 'غير قائم', حالة_السجل: 'غير قائم' });
    } else if (others.length && !others.some(function (o) { return String(o.r[ix['نوع_العلاقة']]) === 'أصلي'; })) {
      // المدرسة الأخرى تصبح الأساسية تلقائيًا
      var o0 = others[0], upd0 = {}; upd0[ix['نوع_العلاقة'] + 1] = 'أصلي'; if (ix.isOriginal != null) upd0[ix.isOriginal + 1] = true;
      upd0[ix['ملاحظات'] + 1] = String(o0.r[ix['ملاحظات']] || '') + ' | أصبحت الأساسية بعد حذفه من ' + (s.school || s.schoolId); v50WriteRow_(sh, o0.row, upd0);
      var e2 = v36EmployeeRow_(employeeId); v36SetCells_(e2, { originalSchoolId: o0.r[ix.schoolId] }); promoted = v40Names_(o0.r[ix.schoolId]);
    }
    schoolV31Log_(s, 'إنهاء علاقة عامل (' + reason + ')', employeeId, [['نهائي؟', '', permanent ? 'نعم' : 'لا']]);
    return { success: true, message: permanent ? ('تم الحذف؛ هذا السبب نهائي ولن يظهر الموظف متاحًا لأي مدرسة أخرى' + (others.length ? '، وأُغلقت علاقته بـ' + others.length + ' مدرسة أخرى.' : '.')) : (promoted ? 'تم الحذف من مدرستك، وأصبحت «' + promoted + '» مدرسته الأساسية.' : (others.length ? 'تم الحذف من مدرستك، ويستمر في مدرسته الأخرى.' : 'تم الحذف من مدرستك، ويبقى متاحًا لأي مدرسة أخرى تبحث برقمه القومي.')) };
  });
}
function schoolRemovalReasonsV40() { return { permanent: V40_PERMANENT_REASONS, unknown: V40_UNKNOWN_REASON, all: V40_REMOVAL_REASONS }; }

/* ============ طلب فتح كشف مالي للتعديل بعد الإرسال (يحتاج موافقة الإدارة فعليًا) ============ */
function schoolRequestFinanceReopenV40(token, year, month, reason) {
  var s = schoolV31Session_(token); if (!String(reason || '').trim()) throw new Error('اكتب سبب طلب فتح الكشف.');
  var mo = v36ResolveMonth_(year, month);
  var open = v40ReqList_(function (x) { return x['نوع_الطلب'] === 'فتح_تعديل_مالي' && x.fromSchoolId === s.schoolId && Number(x['السنة']) === mo.year && Number(x['الشهر']) === mo.month && x['الحالة'] === 'مفتوح'; });
  if (open.length) throw new Error('يوجد بالفعل طلب مفتوح لهذا الشهر.');
  var id = v40ReqAdd_({ نوع_الطلب: 'فتح_تعديل_مالي', نوع_الموظف: '', fromSchoolId: s.schoolId, toSchoolId: '', مُبادر: s.schoolId, السبب: reason, المستخدم_الطالب: s.username || s.school, السنة: mo.year, الشهر: mo.month });
  schoolV31Log_(s, 'طلب فتح كشف مالي للتعديل', mo.year + '-' + mo.month, [['السبب', '', reason]]);
  return { success: true, message: 'أُرسل الطلب للإدارة للموافقة.', requestId: id };
}
function adminFinanceReopenRequestsV40(token) {
  v35Admin_(token);
  var rows = v40ReqList_(function (x) { return x['نوع_الطلب'] === 'فتح_تعديل_مالي'; });
  return { success: true, rows: rows.map(function (x) { return { requestId: x.requestId, school: v40Names_(x.fromSchoolId), year: x['السنة'], month: x['الشهر'], reason: x['السبب'], status: x['الحالة'], date: x['تاريخ_الطلب'] }; }).sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }) };
}
function adminDecideFinanceReopenV40(token, requestId, decision, note) {
  var admin = v35Admin_(token), rq = v40ReqFind_(requestId), v = rq.vals, ix = rq.ix;
  if (v[ix['الحالة']] !== 'مفتوح') throw new Error('الطلب سبق البت فيه.');
  if (['موافقة', 'رفض'].indexOf(decision) < 0) throw new Error('القرار: موافقة أو رفض.');
  var result = { message: 'تم الرفض.' };
  if (decision === 'موافقة') result = adminFinanceReopenV36(token, v[ix['السنة']], v[ix['الشهر']], v[ix.fromSchoolId], note || v[ix['السبب']]);
  v50A_(rq.sh.getRange(rq.row, ix['الحالة'] + 1).setValue(decision === 'موافقة' ? 'تمت الموافقة' : 'مرفوض'));
  v50A_(rq.sh.getRange(rq.row, ix['تاريخ_الرد'] + 1).setValue(new Date())); v50A_(rq.sh.getRange(rq.row, ix['المستخدم_الراد'] + 1).setValue(admin.username || 'admin')); v50A_(rq.sh.getRange(rq.row, ix['ملاحظات_الرد'] + 1).setValue(note || ''));
  return { success: true, message: decision === 'موافقة' ? 'تمت الموافقة — ' + result.message : 'تم رفض الطلب.' };
}
