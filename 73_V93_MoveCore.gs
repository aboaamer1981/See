/**
 * V7.35 — نواة موحدة لتنفيذ طلبات الحركة (نقل / ندب كلي / ندب جزئي) للعاملين ومعلمي الحصة.
 * قبلها كان نفس المنطق منسوخًا في 4 أماكن (V40 / V66 الديوان / V83 المدرسة / V89 الإدارة) واختلفت النسخ:
 *  - V83 و V89 فقدا فرع معلمي الحصة ⇒ اعتماد حركة معلم الحصة كان يفشل دائمًا.
 *  - مدرسة مستضيفة لمنتدب جزئي كانت تستطيع نقله نقلًا كاملًا ⇒ علاقتان «أصلي».
 *  - النقل كان يغلق علاقة مدرسة الإرسال فقط ⇒ تبقى «أصلي» قديمة نشطة.
 * كل مسارات القرار الآن تستدعي v93Decide_ ، وكل التنفيذ في v93ApplyMove_ .
 */

/** هل مدرسة الإرسال هي المدرسة الأصلية للعامل؟ (شرط النقل والندب الكلي). */
function v93FromIsOriginal_(eid, from){
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), t = '', anyOrig = false;
  rel.rows.forEach(function(r){
    if (String(schoolV31Val_(r, ri, 'employeeId')) !== String(eid) || !v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة'))) return;
    var ty = String(schoolV31Val_(r, ri, 'نوع_العلاقة') || '').trim();
    if (ty === 'أصلي') anyOrig = true;
    if (String(schoolV31Val_(r, ri, 'schoolId')) === String(from)) t = t || ty;
  });
  /* الأصلية، أو جهة الندب الكلي لمن ليست له علاقة «أصلي» نشطة (المنتدب كليًا تُغلق أصليته عند الندب). */
  return t === 'أصلي' || (t === 'منتدب إلينا كلي' && !anyOrig);
}

/** يُستدعى عند إنشاء الطلب: النقل/الندب الكلي يبدأ من المدرسة الأصلية فقط (لا من مدرسة مستضيفة). */
function v93GuardMoveSource_(eid, from, type){
  if ((type === 'نقل' || type === 'ندب كلي') && !v93FromIsOriginal_(eid, from))
    throw new Error('النقل أو الندب الكلي يكون من المدرسة الأصلية للعامل (أو جهة ندبه الكلي). المدرسة المستضيفة لمنتدب جزئيًا تطلب «إلغاء ندب» بدلًا من ذلك.');
}

/** تنفيذ طلب حركة معتمد. v/ix = صف الطلب. يُستدعى داخل v35Lock_ فقط. */
function v93ApplyMove_(v, ix, sourceLabel){
  var type = String(v[ix['نوع_الطلب']] || ''), eid = String(v[ix.employeeId] || ''), from = String(v[ix.fromSchoolId] || ''), to = String(v[ix.toSchoolId] || '');
  if (V40_MOVE_TYPES.indexOf(type) < 0) throw new Error('نوع الحركة غير مدعوم: ' + type);
  if (String(v[ix['نوع_الموظف']] || '') === 'موسمي') { v70ApplyHrpMove_(v, ix); return; }
  var live = v24Data_('04_علاقات_المدارس'), li = schoolV31Idx_(live.headers), atFrom = false, otherOriginal = [];
  live.rows.forEach(function(r){
    if (String(schoolV31Val_(r, li, 'employeeId')) !== eid || !v36ActiveRel_(schoolV31Val_(r, li, 'الحالة'))) return;
    var sid = String(schoolV31Val_(r, li, 'schoolId'));
    if (sid === from) atFrom = true;
    else if (String(schoolV31Val_(r, li, 'نوع_العلاقة') || '').trim() === 'أصلي' && sid !== to) otherOriginal.push(sid);
  });
  if (!atFrom) throw new Error('لا يمكن تنفيذ الطلب: العلاقة في المدرسة المرسلة لم تعد نشطة. راجع حركة العامل أولًا.');
  if (v36ActiveRelCount_(eid, to)) throw new Error('لا يمكن تنفيذ الطلب: توجد علاقة نشطة بالفعل في المدرسة المستقبلة.');
  v93GuardMoveSource_(eid, from, type);
  var src = sourceLabel || 'حركة متبادلة';
  /* الترتيب: العلاقة الجديدة أولًا ثم إغلاق القديمة — لو انقطع التنفيذ لا يضيع العامل بلا مدرسة. */
  if (type === 'نقل') {
    v36AddRelation_(eid, to, 'أصلي', src, 'نقل من ' + v40Names_(from));
    v36CloseRelations_(eid, from, 'نقل إلى ' + v40Names_(to));
    otherOriginal.forEach(function(sid){ v36CloseRelations_(eid, sid, 'إغلاق أصلي قديم عند النقل إلى ' + v40Names_(to)); });
    v36SetCells_(v36EmployeeRow_(eid), {originalSchoolId: to, 'الحالة_الوظيفية': 'قائم', 'حالة_السجل': 'قائم'});
  } else if (type === 'ندب كلي') {
    v36AddRelation_(eid, to, 'منتدب إلينا كلي', src, 'ندب من ' + v40Names_(from));
    v36CloseRelations_(eid, from, 'ندب كلي إلى ' + v40Names_(to));
  } else {
    v68Nums_(ix['أيام_الندب_الجزئي'] != null ? v[ix['أيام_الندب_الجزئي']] : '', ix['حصص_الندب_الجزئي'] != null ? v[ix['حصص_الندب_الجزئي']] : '', true);   // الندب الجزئي يتطلب أيامًا وحصصًا صحيحة
    v36AddRelation_(eid, to, 'منتدب إلينا جزئي', src, 'ندب جزئي من ' + v40Names_(from));
    v68FromRequest_(eid, to, v, ix);
  }
}

/** كتابة نتيجة القرار على صف الطلب. */
function v93Stamp_(rq, ix, status, user, note){
  v50A_(rq.sh.getRange(rq.row, ix['الحالة'] + 1).setValue(status));
  if (ix['تاريخ_الرد'] != null) v50A_(rq.sh.getRange(rq.row, ix['تاريخ_الرد'] + 1).setValue(new Date()));
  if (ix['المستخدم_الراد'] != null) v50A_(rq.sh.getRange(rq.row, ix['المستخدم_الراد'] + 1).setValue(user || ''));
  if (ix['ملاحظات_الرد'] != null) v50A_(rq.sh.getRange(rq.row, ix['ملاحظات_الرد'] + 1).setValue(schoolV31Clean_(note || '')));
}

/**
 * قرار موحد. opt = {actor, user, check(v,ix) → يرمي خطأ لو صاحب القرار غير مخوَّل, okStatus, rejectStatus, source, logPrefix}
 * يعيد قراءة الطلب داخل القفل (يمنع قرارين متعارضين على نفس الطلب).
 */
function v93Decide_(requestId, decision, note, opt){
  if (['موافقة', 'رفض'].indexOf(decision) < 0) throw new Error('القرار: موافقة أو رفض.');
  return v35Lock_(function(){
    v50Fresh_();
    var rq = v40ReqFind_(requestId), v = rq.vals, ix = rq.ix;
    if (v[ix['الحالة']] !== 'مفتوح') throw new Error('الطلب سبق البت فيه.');
    var type = String(v[ix['نوع_الطلب']] || '');
    if (V40_MOVE_TYPES.indexOf(type) < 0) throw new Error('هذا الطلب ليس نقل/ندب.');
    if (opt.check) opt.check(v, ix);
    var eid = v[ix.employeeId], from = v[ix.fromSchoolId], to = v[ix.toSchoolId];
    if (decision === 'موافقة') {
      v93ApplyMove_(v, ix, opt.source);
      v93Stamp_(rq, ix, opt.okStatus || 'تمت الموافقة', opt.user, note);
    } else {
      v93Stamp_(rq, ix, opt.rejectStatus || 'مرفوض', opt.user, note);
    }
    schoolV31Log_(opt.actor, (decision === 'موافقة' ? 'موافقة على ' : 'رفض ') + type + (opt.logPrefix ? ' — ' + opt.logPrefix : ''), eid, [['من', v40Names_(from), ''], ['إلى', '', v40Names_(to)], ['ملاحظة', '', note || '']]);
    v50Invalidate_(V40_REQ_SHEET); v50Invalidate_('04_علاقات_المدارس'); v50Invalidate_('01_الأساسي');
    if (String(v[ix['نوع_الموظف']] || '') === 'موسمي') { v50Invalidate_(V40_HRP_SHEET); v50Invalidate_(V40_HRP_REL_SHEET); }
    return {success: true, type: type, from: from, to: to, message: decision === 'موافقة' ? 'تمت الموافقة وتنفيذ ' + v83DisplayMoveType_(type) + '.' : 'تم رفض الطلب.'};
  });
}

/** شرط: المدرسة صاحبة القرار = الطرف الذي لم يبدأ الطلب. */
function v93SchoolApproverCheck_(schoolId){
  return function(v, ix){
    var from = v[ix.fromSchoolId], to = v[ix.toSchoolId], initiator = v[ix['مُبادر']], approver = String(initiator) === String(from) ? to : from;
    if (String(approver) !== String(schoolId)) throw new Error('هذا الطلب ليس بانتظار موافقة مدرستك.');
  };
}

/** معلم حصة سجله «مرفوض» أو «ملغي»: إعادة ربطه تمر بطلب جديد للإدارة (لا تُنشأ علاقة مباشرة). */
function v93HrpReRequest_(s, row, hrpId, requiredPeriods){
  var req = Number(requiredPeriods), mx107 = v107HrpW_(hrpId); if (!(req >= 0 && req <= mx107)) throw new Error('عدد الحصص المطلوب من 0 إلى ' + mx107 + '.');
  if (v40ReqList_(function(x){ return String(x.employeeId) === String(hrpId) && x['الحالة'] === 'مفتوح'; }).length) throw new Error('يوجد طلب مفتوح لهذا المعلم بالفعل.');
  return v35Lock_(function(){
    if (row.ix['حالة_السجل'] != null) v50A_(row.sh.getRange(row.row, row.ix['حالة_السجل'] + 1).setValue('طلب إضافة — بانتظار موافقة الإدارة'));
    var rid = v40ReqAdd_({نوع_الطلب: V92_HRP_ADD_REQUEST, نوع_الموظف: 'موسمي', employeeId: hrpId, fromSchoolId: '', toSchoolId: s.schoolId, مُبادر: s.schoolId, السبب: 'إعادة طلب إضافة معلم حصة/معاش', المستخدم_الطالب: s.username || s.school, حصص_الندب_الجزئي: req});
    v50Invalidate_(V40_HRP_SHEET);
    schoolV31Log_(s, 'إعادة طلب إضافة معلم حصة/معاش للإدارة', hrpId, [['الحصص المطلوبة', '', req]]);
    return {success: true, pending: true, requestId: rid, message: 'هذا المعلم سبق رفضه أو إلغاء طلبه، فأُرسل طلب جديد للإدارة للموافقة. لن تُنشأ علاقته قبل الاعتماد.'};
  });
}

/* ---------- V7.35: أمان الكتابة في الشيت ---------- */
/** نص يبدأ بـ = + @ (أو - غير متبوعة برقم) يُكتب كنص وليس معادلة. القيم غير النصية تمر كما هي. */
function v93SafeCell_(v){
  if (typeof v !== 'string') return v;
  return (/^[=+@]/.test(v) || /^-(?![\d.])/.test(v)) ? "'" + v : v;
}
function v93SafeObj_(o){ var r = {}; Object.keys(o || {}).forEach(function(k){ r[k] = v93SafeCell_(o[k]); }); return r; }

/* ---------- V7.35: الجلسات تتبع التغييرات فورًا ---------- */
/** مفتاح المستخدم: الرقم القومي (14 رقمًا) كما هو بعد توحيد الأرقام، وغير ذلك اسم المستخدم كما هو (بدون تقليصه لأرقامه فقط). */
function v93UserKey_(u){ var t = String(u == null ? '' : u).trim().replace(/\s+/g, ' '), d = v24DigitsLocalV31_(t); return /^\d{14}$/.test(d) ? d : t; }
var V93_USERS_MEMO_ = null;
/** يعيد قراءة حالة الحساب والصلاحيات لكل طلب (الأوراق صغيرة): الإيقاف/سحب الصلاحية/انتهاء الخدمة يسري فورًا بدل 6 ساعات. */
function v93LiveStaff_(s){
  if (!s || !s.username) return s;
  try {
    if (!V93_USERS_MEMO_) { var us = personnelSS_().getSheetByName('R_المستخدمون'), h = v42Header_(us), i = v42Idx_(h), m = {}; v42Values_(us).forEach(function(r){ var u = v93UserKey_(r[i.username]); if (u) m[u] = String(r[i.status] || ''); }); V93_USERS_MEMO_ = m; }
    var st = V93_USERS_MEMO_[v93UserKey_(s.username)];
    if (st === 'موقوف') throw new Error('V93_SUSPENDED');
    if (s.role === 'موظف' && s.employeeId) s.permissions = v42Permissions_(s.employeeId);
  } catch (e) {
    if (String(e.message) === 'V93_SUSPENDED') throw new Error('جلسة غير صالحة: تم إيقاف هذا الحساب — راجع الإدارة.');
    console.error('v93LiveStaff_: ' + e.message);   // تعذّر الفحص الحي ⇒ نستمر بالجلسة كما هي (لا نوقف الخدمة)
  }
  return s;
}

/* ---------- V7.35: قفل مؤقت بعد 5 محاولات فاشلة لبوابات الدخول غير المدرسية/الإدارية ----------
 * (دخول المدارس والإدارة لم يُمس.) الدالة الأصلية أصبحت <name>Core_ والاسم العام يغلفها — نفس المدخلات والمخرجات. */
function v93GuardLogin_(kind, user, fn){
  var key = kind + ':' + v93UserKey_(user);
  if (v36LoginLocked_(key)) return {success: false, message: V36_LOCK_MSG};   // نفس شكل رد دخول المدارس/الإدارة
  var r;
  try { r = fn(); } catch (e) { v36LoginFail_(key); throw e; }
  if (r && r.success === false) v36LoginFail_(key); else v36LoginOk_(key);
  return r;
}
function loginSupervisorV41(u, p){ return v93GuardLogin_('sup', u, function(){ return loginSupervisorV41Core_(u, p); }); }
function loginFieldFollowupV41(u, p){ return v93GuardLogin_('fu', u, function(){ return loginFieldFollowupV41Core_(u, p); }); }
function loginStaffV42(u, p){ return v93GuardLogin_('st', u, function(){ return loginStaffV42Core_(u, p); }); }
function specialLoginV42(u, p){ return v93GuardLogin_('sp', u, function(){ return specialLoginV42Core_(u, p); }); }
function communityLoginV42(u, p){ return v93GuardLogin_('cm', u, function(){ return communityLoginV42Core_(u, p); }); }
function diwanLoginV48(u, p){ return v93GuardLogin_('dw', u, function(){ return diwanLoginV48Core_(u, p); }); }

/* ---------- V7.35: أداء ---------- */
var V93_SCH_NAMES_ = null;
/** schoolId → اسم المدرسة (من القراءة المخزنة v24Data_). */
function v93SchoolNameMap_(){ if (!V93_SCH_NAMES_ || V50_DIRTY_) V93_SCH_NAMES_ = v42SchoolNames_(); return V93_SCH_NAMES_; }
/** نافذة العامل في الإدارة: طلب واحد بدل 3 طلبات متتالية (بيانات + علاقات + بطاقة الحركة). */
function adminWorkerBundleV93(token, employeeId){
  v35Admin_(token);
  return {success: true, g: adminGetWorkerV35(token, employeeId), rl: adminWorkerRelationsV36(token, employeeId), c: adminWorkerCardV29(token, employeeId)};
}
