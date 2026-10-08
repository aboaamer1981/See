/**
 * V7.56 — توحيد شاشة «🔄 الحالة» السريعة مع القائمة الموحدة (15 حالة) المستخدمة في الحصر والعاملين الأصليين.
 * قراءة فقط: يحدد الحالة/العلاقة الحالية للعامل بمدرستك وهل مدرستك هي الأصلية.
 * التنفيذ يتم عبر المسارات القائمة دون تغيير:
 *  - الحركة لمدرسة أخرى داخل الإدارة (نقل/ندب كلي/ندب جزئي) → schoolRequestMoveV83 (طلب متبادل بموافقة المدرسة الأخرى).
 *  - باقي الحالات → schoolRequestFormerWorkerStatusV94 (المدرسة الأصلية فقط).
 */
function schoolWorkerRelationV101(token, employeeId){
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_VIEW');
  var id = String(employeeId || '').trim(), sid = String(s.schoolId);
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), er = null;
  for (var i = 0; i < emp.rows.length; i++) if (String(schoolV31Val_(emp.rows[i], ei, 'employeeId')) === id) { er = emp.rows[i]; break; }
  if (!er) throw new Error('العامل غير موجود.');
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), names = v93SchoolNameMap_(), mine = null, others = [];
  rel.rows.forEach(function(r){
    if (String(schoolV31Val_(r, ri, 'employeeId')) !== id) return;
    var x = {schoolId: String(schoolV31Val_(r, ri, 'schoolId')), type: String(schoolV31Val_(r, ri, 'نوع_العلاقة') || '').trim(), status: String(schoolV31Val_(r, ri, 'الحالة') || '').trim(), note: String(schoolV31Val_(r, ri, 'ملاحظات') || '')};
    if (!v36ActiveRel_(x.status)) return;
    if (x.schoolId === sid) { if (!mine || x.type === 'أصلي') mine = x; }
    else others.push({schoolId: x.schoolId, name: names[x.schoolId] || x.schoolId, type: x.type, days: ri['أيام_الندب_الجزئي'] != null ? String(schoolV31Val_(r, ri, 'أيام_الندب_الجزئي') || '') : '', periods: ri['حصص_الندب_الجزئي'] != null ? String(schoolV31Val_(r, ri, 'حصص_الندب_الجزئي') || '') : ''});
  });
  var orig = v94OriginalSchoolId_(er, ei), isOriginal = orig === sid, ws = String(schoolV31Val_(er, ei, 'الحالة_الوظيفية') || ''), label = '';
  if (mine && mine.type === 'منتدب إلينا كلي') label = (orig && names[orig]) ? 'منتدب إلينا كليًا من داخل الإدارة' : 'منتدب إلينا كليًا من خارج الإدارة';
  else if (mine && mine.type === 'منتدب إلينا جزئي') label = 'منتدب إلينا جزئيًا';
  else if (/^إجاز/.test(ws)) label = 'إجازة';
  else if (/منتدب جزئيًا خارج الإدارة/.test(mine ? mine.note : '')) label = 'أصلي ومنتدب جزئيًا خارج الإدارة';
  else if (others.some(function(o){ return o.type === 'منتدب إلينا كلي'; })) label = 'أصلي ومنتدب من عندنا كليًا داخل الإدارة';
  else if (others.some(function(o){ return o.type === 'منتدب إلينا جزئي'; })) label = 'أصلي ومنتدب من عندنا جزئيًا داخل الإدارة';
  else if (isOriginal || (mine && mine.type === 'أصلي')) label = 'أصلي';
  var present = String(schoolV31Val_(er, ei, 'قائم_بالعمل') || '').trim(), why = String(schoolV31Val_(er, ei, 'سبب_عدم_القيام') || '').trim(), base = label;
  // V7.58: منقطع / موقوف عن العمل = نفس علاقته + غير قائم بالعمل بهذا السبب.
  if (present === 'لا' && /^منقطع عن العمل/.test(why)) label = 'منقطع عن العمل';
  else if (present === 'لا' && /^موقوف عن العمل/.test(why)) label = 'موقوف عن العمل';
  // V7.60: العلاقة الفرعية «منتدب جزئيًا إلى» لحالة «منتدب إلينا كليًا» فقط — مدرسة أو أكثر.
  var hostFull = !!(mine && mine.type === 'منتدب إلينا كلي');
  var subs = hostFull ? others.filter(function(o){ return o.type === 'منتدب إلينا جزئي'; }).map(function(o){ return {schoolId: o.schoolId, name: o.name, days: o.days, periods: o.periods}; }) : [];
  return {success: true, employeeId: id, isOriginal: isOriginal, hostFull: hostFull, originalSchool: orig ? (names[orig] || orig) : '', label: label, base: base, others: others, subs: subs, canSub: hostFull, present: present, absentReason: why};
}

/** الحالات التي تحددها مدرسة الندب الكلي (تُعامل كالمدرسة الأصلية) — دون الحالات التي تعيد كتابة المدرسة الأصلية. */
var V101_HOST_CODES = ['LEAVE', 'ABSENT', 'SUSP', 'TR_OUT', 'PENSION', 'DEATH', 'END', 'UNKNOWN'];   // V7.58: + منقطع / موقوف

/** حفظ تغيير الحالة (غير الحركة بين المدارس) من الشاشة السريعة.
 *  - المدرسة الأصلية → نفس مسار العاملين الأصليين schoolRequestFormerWorkerStatusV94 دون تغيير.
 *  - مدرسة الندب الكلي (منتدب إلينا كليًا) → تُعامل كالأصلية: تنفيذ مباشر، أو طلب بموافقة المدرسة المرتبطة إن وُجدت علاقة نشطة أخرى. */
function schoolRequestWorkerStatusV101(token, employeeId, relationLabel, targetSchool, external, date, note){
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  var id = String(employeeId || '').trim(), label = String(relationLabel || '').trim();
  var info = schoolWorkerRelationV101(token, id);
  // V7.58: اختيار علاقته الأساسية نفسها لعامل «غير قائم بالعمل» (منقطع/موقوف) = إعادته قائمًا بالعمل فقط دون المساس بعلاقاته.
  if (info.present === 'لا' && label && label === info.base) return schoolSetWorkPresenceV40(token, id, true, '');
  if (info.isOriginal) return schoolRequestFormerWorkerStatusV94(token, id, label, targetSchool, external, date, note);
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers);
  var full = rel.rows.some(function(r){ return String(schoolV31Val_(r, ri, 'employeeId')) === id && String(schoolV31Val_(r, ri, 'schoolId')) === String(s.schoolId) && v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة')) && String(schoolV31Val_(r, ri, 'نوع_العلاقة') || '').trim() === 'منتدب إلينا كلي'; });
  // V7.57: «غير معروف للمدرسة» من أي مدرسة مستضيفة (بديل حذف «المدرسة لا تعرفه / خطأ تسجيل»): يعلّق علاقة مدرستك فقط.
  if (!full && label === 'غير معروف للمدرسة') {
    return v35Lock_(function(){ v50Fresh_();
      if (!v95SetRelationStatus_(id, s.schoolId, 'معلقة', 'غير معروف للمدرسة' + (note ? ' — ' + note : ''))) throw new Error('لا توجد علاقة لهذا العامل بمدرستك.');
      schoolV31Log_(s, 'تغيير حالة/علاقة عامل', id, [['الحالة الجديدة', '', label], ['ملاحظة', '', note || '']]);
      v50Invalidate_('04_علاقات_المدارس');
      return {success: true, pending: false, message: 'تم تنفيذ «غير معروف للمدرسة» لمدرستك فقط.'};
    });
  }
  if (!full) throw new Error('تغيير الحالة لهذا العامل تحدده مدرسته الأصلية' + (info.originalSchool ? ' «' + info.originalSchool + '»' : '') + '. المتاح لك: «غير معروف للمدرسة»، إلغاء الندب، أو طلب حركة.');
  var meta = v95FormerRelationMeta_(label), ext = String(external || '').trim(), dt = String(date || '').trim(), rs = String(note || '').trim();
  if (V101_HOST_CODES.indexOf(meta.code) < 0) throw new Error('الحالة «' + label + '» لا تُحدد من مدرسة الندب الكلي.');
  if ((meta.detail === 'text' || meta.detail === 'textpart') && !ext) throw new Error('اكتب اسم الجهة خارج الإدارة.');
  if (meta.code === 'LEAVE') {
    var mlt = rs.match(/(?:^|[—|])\s*نوع الإجازة\s*:\s*([^—|]+)/), lt = mlt ? String(mlt[1] || '').trim() : '';
    var leaveList = (typeof V65_LEAVES !== 'undefined' && V65_LEAVES) ? V65_LEAVES : [];
    if (!lt || leaveList.indexOf(lt) < 0) throw new Error('اختر نوع إجازة صحيحًا مثل الحصر.');
  }
  if (meta.code === 'END' && !v102EndType_(rs)) throw new Error('اختر نوع إنهاء الخدمة من القائمة.');   // V7.58
  var others = v95OtherActiveSchools_(id, s.schoolId);
  if (others.length) {
    var sh = v36Sheet_('09_طلبات_متبادلة');
    ['statusRelation', 'targetSchool', 'targetText', 'statusDate'].forEach(function(k){ if (v36Headers_(sh).indexOf(k) < 0) schoolEnsureWorkerColumnV40_(sh, k); });
    var rid = v40ReqAdd_({نوع_الطلب: 'تغيير علاقة', نوع_الموظف: 'أساسي', employeeId: id, fromSchoolId: others[0].schoolId, toSchoolId: s.schoolId, 'مُبادر': s.schoolId, السبب: rs || label, المستخدم_الطالب: s.username || s.school, 'الحالة': 'مفتوح', statusRelation: label, targetSchool: '', targetText: ext, statusDate: dt});
    schoolV31Log_(s, 'طلب تغيير علاقة (مدرسة الندب الكلي) — بانتظار المدرسة المرتبطة', id, [['الحالة الجديدة', '', label], ['المدرسة المطلوب موافقتها', '', v40Names_(others[0].schoolId)]]);
    return {success: true, pending: true, message: 'العامل مرتبط بمدرسة أخرى «' + v40Names_(others[0].schoolId) + '»؛ تم إرسال طلب التغيير إليها، ولن يتغير السجل قبل موافقتها.', requestId: rid};
  }
  return v35Lock_(function(){ v50Fresh_(); var msg = v95ApplyFormerRelation_(v36Actor_(s), id, s.schoolId, label, '', ext, dt, rs); return {success: true, pending: false, message: msg}; });
}
