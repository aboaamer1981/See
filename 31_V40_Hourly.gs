/** V4.0 — معلمو الحصة والمعاش: فئة موسمية منفصلة تمامًا عن العاملين الأساسيين (`01_الأساسي`).
 *  لا درجة وظيفية ولا مالية ولا نصاب قانوني ولا منظومة أيام/حصص ولا حافز تدريس — أجر الحصة فقط بمعادلة الوزارة.
 *  مدرسة أولى (تجمع المالية والسجل) + مدرسة ثانية اختيارية (ندب جزئي)، بسقف 24 حصة "مطلوبة" بينهما مجتمعتين.
 */
var V40_HRP_SHEET = '05_معلمو_الحصة_والمعاش', V40_HRP_REL_SHEET = '06_علاقات_معلمي_الحصة', V40_HRP_MONTHLY_SHEET = '07_بيانات_معلمي_الحصة_الشهرية', V40_HRP_FIN_SHEET = '08_ماليات_معلمي_الحصة';
function v40HrpSheet_() { return v36Sheet_(V40_HRP_SHEET); }
function v40HrpRelSheet_() { return v36Sheet_(V40_HRP_REL_SHEET); }
function v40HrpRow_(hrpId) { var sh = v40HrpSheet_(), h = v36Headers_(sh), row = v36FindRow_(sh, h, 'hrpId', hrpId); if (!row) throw new Error('السجل غير موجود.'); return { sh: sh, h: h, ix: schoolV31Idx_(h), row: row, vals: sh.getRange(row, 1, 1, h.length).getDisplayValues()[0] }; }
function v40HrpActiveRels_(hrpId) {
  var sh = v40HrpRelSheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), lr = sh.getLastRow(), v = lr > 1 ? sh.getRange(2, 1, lr - 1, h.length).getDisplayValues() : [];
  return v.map(function (r, i) { return { n: i + 2, r: r }; }).filter(function (x) { return String(x.r[ix.hrpId]).trim() === String(hrpId) && v36ActiveRel_(x.r[ix['الحالة']]); });
}
function v40HrpCategory_(birthDate) {
  var d = v35Date_(birthDate); if (!d) return 'معلم بالحصة';
  var age = (new Date().getTime() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000);
  return age > 60 ? 'معلم بالمعاش' : 'معلم بالحصة';
}

/* ============ فحص الرقم القومي والإضافة ============ */
function v40HrpAnyNidExists_(nid) {
  nid = v24DigitsLocalV31_(nid);
  var sources = [
    { sheet: '01_الأساسي', label: 'العاملين الأساسيين', nidKey: 'الرقم_القومي' },
    { sheet: V40_HRP_SHEET, label: 'معلمي الحصة والمعاش', nidKey: 'الرقم_القومي' }
  ];
  for (var si = 0; si < sources.length; si++) {
    var src = sources[si];
    try {
      var d = v24Data_(src.sheet), ix = schoolV31Idx_(d.headers);
      if (ix[src.nidKey] == null) continue;
      for (var i = 0; i < d.rows.length; i++) {
        if (v24DigitsLocalV31_(d.rows[i][ix[src.nidKey]]) === nid) {
          return { exists: true, source: src.label, sheet: src.sheet, row: d.rows[i], headers: d.headers };
        }
      }
    } catch (e) {}
  }
  return { exists: false };
}
function schoolLookupHrpNidV40(token, nationalId) { var s = schoolV31Session_(token); return v40HrpLookupCore_(nationalId, s.schoolId); }
function v40HrpLookupCore_(nationalId, mySchoolId) {
  var nid = v24DigitsLocalV31_(nationalId), nv=v24ValidateNationalIdV40_(nationalId); if (!nv.valid) throw new Error(nv.message);
  var any = v40HrpAnyNidExists_(nid);
  if (any.exists) {
    if (any.sheet === V40_HRP_SHEET) {
      var sh0 = v40HrpSheet_(), h0 = v36Headers_(sh0), ix0 = schoolV31Idx_(h0), row0 = any.row;
      var hrpId0 = row0[ix0.hrpId], active0 = v40HrpActiveRels_(hrpId0), cat0 = row0[ix0['نوع_الفئة']], recordStatus0 = ix0['حالة_السجل'] != null ? String(row0[ix0['حالة_السجل']] || '').trim() : '';
      if (!active0.length) {
        if (/^طلب إضافة/.test(recordStatus0)) return { success: true, state: 'طلب_معلق', hrpId: hrpId0, name: row0[ix0['الاسم']], category: cat0, type: v24NationalIdTypeV40_(nid), message: 'بيانات المعلم مسجلة بالفعل، ويوجد طلب إضافة مفتوح لدى الإدارة. لا يمكن ربطه بالمدرسة قبل صدور قرار الإدارة.' };
        if (/^مرفوض/.test(recordStatus0)) return { success: true, state: 'طلب_مرفوض', hrpId: hrpId0, name: row0[ix0['الاسم']], category: cat0, type: v24NationalIdTypeV40_(nid), message: 'سبق رفض طلب إضافة هذا المعلم من الإدارة. راجع قرار الرفض قبل إعادة تقديم الطلب.' };
        return { success: true, state: 'متاح', hrpId: hrpId0, name: row0[ix0['الاسم']], category: cat0, type: v24NationalIdTypeV40_(nid), message: 'السجل موجود بالفعل في قاعدة معلمي الحصة/المعاش لكنه غير مرتبط حاليًا بمدرسة.' };
      }
      var rri0 = schoolV31Idx_(v36Headers_(v40HrpRelSheet_())), mine0 = mySchoolId && active0.some(function (x) { return x.r[rri0.schoolId] === String(mySchoolId); });
      if (mine0) return { success: true, state: 'عندك بالفعل', hrpId: hrpId0, name: row0[ix0['الاسم']], category: cat0, type: v24NationalIdTypeV40_(nid) };
      var at0 = active0[0], atSchoolId0 = at0.r[rri0.schoolId];
      return { success: true, state: 'مرتبط', hrpId: hrpId0, name: row0[ix0['الاسم']], category: cat0, schoolId: atSchoolId0, schoolName: v40Names_(atSchoolId0), message: row0[ix0['الاسم']] + ' مسجَّل حاليًا في «' + v40Names_(atSchoolId0) + '».' };
    }
    var ai = schoolV31Idx_(any.headers), an = any.row[ai['الاسم']] || any.row[ai['اسم المعلم']] || '';
    return { success: true, state: 'مسجل_بمصدر_آخر', source: any.source, name: an, message: 'الرقم القومي موجود بالفعل في ' + any.source + ' ولا يجوز إنشاء سجل معلم حصة جديد له.' };
  }
  return { success: true, state: 'جديد' };
}
function v40HrpAddRelation_(hrpId, schoolId, type, requiredPeriods, source, note, isNewTeacher) {
  var sh = v40HrpRelSheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), r = new Array(h.length).fill('');
  // V4.6: لا تُنشأ علاقة نشطة ثانية لنفس المعلم في نفس المدرسة — تُدمج في الموجودة (الحصص تُجمع بسقف 24، و«أصلي» يغلب).
  var same = isNewTeacher ? null : v40HrpActiveRels_(hrpId).filter(function (x) { return String(x.r[ix.schoolId]) === String(schoolId); })[0];
  if (same) {
    var cur = Number(same.r[ix['عدد_الحصص_المطلوب']]) || 0, add = Number(requiredPeriods) || 0;
    if (add) v50A_(sh.getRange(same.n, ix['عدد_الحصص_المطلوب'] + 1).setValue(Math.min(v107HrpW_(hrpId), cur + add)));
    if (type === 'أصلي' && same.r[ix['نوع_العلاقة']] !== 'أصلي') v50A_(sh.getRange(same.n, ix['نوع_العلاقة'] + 1).setValue('أصلي'));
    if (ix['ملاحظات'] != null) v50A_(sh.getRange(same.n, ix['ملاحظات'] + 1).setValue(String(same.r[ix['ملاحظات']] || '') + (same.r[ix['ملاحظات']] ? ' | ' : '') + 'دمج ' + (source || '') + ' ' + (note || '')));
    return same.r[ix.relationId];
  }
  function put(k, v) { if (ix[k] != null) r[ix[k]] = v; }
  put('relationId', 'HREL_' + Utilities.getUuid().replace(/-/g, '').slice(0, 18).toUpperCase()); put('hrpId', hrpId); put('schoolId', schoolId);
  put('نوع_العلاقة', type); put('عدد_الحصص_المطلوب', requiredPeriods || 0); put('تاريخ_البداية', new Date()); put('الحالة', 'نشطة'); put('مصدر_العلاقة', source); put('ملاحظات', note || '');
  v50A_(sh.appendRow(r));
}
/** إضافة معلم حصة/معاش جديد: تسجيل البيانات + إنشاء طلب للإدارة، ولا تُنشأ علاقة نشطة قبل الموافقة. */
function schoolAddHrpV40(token, payload) {
  if(payload&&payload['مادة_التدريس']!==undefined) payload['مادة_التدريس']=v100HrpSubject_(payload['مادة_التدريس']);   // V7.55: الدين المسيحي مادة أساسية لمعلمي الحصة/المعاش
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  var p = payload || {}, nid = v24DigitsLocalV31_(p['الرقم_القومي']), nv=v24ValidateNationalIdV40_(nid);
  if (!nv.valid) throw new Error(nv.message);
  p['الرقم_القومي']=nid; p['النوع']=nv.type;
  if (String(p['الاسم'] || '').trim().split(/\s+/).filter(Boolean).length < 3) throw new Error('أدخل الاسم ثلاثيًا على الأقل.');
  if (!String(p['مادة_التدريس'] || '').trim()) throw new Error('اختر المادة.');
  v72GuardSubject_(p['مادة_التدريس']);
  var bd = v35Date_(p['تاريخ_الميلاد']); if (!bd) throw new Error('أدخل تاريخ ميلاد صحيح.');
  var req = Number(p['عدد_الحصص_المطلوب']), mx107 = v107ForSubject_(p['مادة_التدريس']).hw; if (!(req >= 0 && req <= mx107)) throw new Error('عدد الحصص المطلوب من 0 إلى ' + mx107 + ' (الحد الأسبوعي لمادة ' + p['مادة_التدريس'] + ').');
  if (v40HrpLookupCore_(nid, '').state !== 'جديد') throw new Error('المعلم موجود بالفعل — ابحث عنه أولًا ثم استخدم طلب نقل/ندب.');
  return v35Lock_(function () {
    var finalCheck = v40HrpAnyNidExists_(nid);
    if (finalCheck.exists) throw new Error('الرقم القومي موجود بالفعل — ابحث عنه أولًا ولا تنشئ سجلًا مكررًا.');
    var sh = v40HrpSheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), r = new Array(h.length).fill(''), hrpId = 'HRP_' + Utilities.getUuid().replace(/-/g, '').slice(0, 18).toUpperCase();
    function put(k, v) { if (ix[k] != null) r[ix[k]] = schoolV31Clean_(v); }
    put('hrpId', hrpId); put('الرقم_القومي', nid); put('الاسم', p['الاسم']); put('النوع', nv.type); put('تاريخ_الميلاد', bd); put('الهاتف', p['الهاتف']); put('العنوان', p['العنوان']);
    put('نوع_الفئة', v40HrpCategory_(bd)); put('مادة_التدريس', p['مادة_التدريس']); put('originalSchoolId', ''); put('تاريخ_الإضافة', new Date());
    put('حالة_السجل', 'طلب إضافة — بانتظار موافقة الإدارة'); put('قائم_بالعمل', 'لا');
    put('ملاحظات', 'تم إنشاء البيانات من مدرسة «' + s.school + '» وتنتظر موافقة الإدارة قبل إنشاء العلاقة.');
    v50A_(sh.appendRow(r));
    var rid = v40ReqAdd_({
      نوع_الطلب: 'إضافة معلم حصة', نوع_الموظف: 'موسمي', employeeId: hrpId, fromSchoolId: '', toSchoolId: s.schoolId,
      مُبادر: s.schoolId, السبب: String(p['سبب_الطلب'] || 'طلب إضافة معلم حصة/معاش'),
      المستخدم_الطالب: s.username || s.school, حصص_الندب_الجزئي: req
    });
    v50Invalidate_(V40_HRP_SHEET);
    schoolV31Log_(s, 'طلب إضافة معلم حصة/معاش للإدارة', hrpId, [['الحصص المطلوبة', '', req], ['طلب الإدارة', '', rid]]);
    return { success: true, pending: true, requestId: rid, hrpId: hrpId, message: 'تم تسجيل بيانات المعلم وإرسال طلبه إلى الإدارة للموافقة. لن تُنشأ له علاقة بالمدرسة قبل اعتماد الطلب.' };
  });
}

function schoolClaimAvailableHrpV40(token, hrpId, requiredPeriods) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  var row = v40HrpRow_(hrpId);
  var rs = row.ix['حالة_السجل'] != null ? String(row.vals[row.ix['حالة_السجل']] || '').trim() : '';
  if (/^طلب إضافة/.test(rs)) throw new Error('هذا المعلم لديه طلب إضافة مفتوح لدى الإدارة؛ لا يمكن ربطه قبل الموافقة.');
  if (/^(مرفوض|ملغي)/.test(rs)) return v93HrpReRequest_(s, row, hrpId, requiredPeriods);   // V7.35: المرفوض/الملغي لا يُربط مباشرة — يعود طلبًا للإدارة
  if (v40HrpActiveRels_(hrpId).length) throw new Error('لم يعد متاحًا.');
  var req = Number(requiredPeriods), mx107 = v107HrpW_(hrpId); if (!(req >= 0 && req <= mx107)) throw new Error('عدد الحصص المطلوب من 0 إلى ' + mx107 + '.');
  return v35Lock_(function () {
    v40HrpAddRelation_(hrpId, s.schoolId, 'أصلي', req, 'بوابة المدرسة', 'إضافة متاح');
    v50A_(row.sh.getRange(row.row, row.ix.originalSchoolId + 1).setValue(s.schoolId)); v50A_(row.sh.getRange(row.row, row.ix['حالة_السجل'] + 1).setValue('قائم')); if (row.ix['قائم_بالعمل'] != null) v50A_(row.sh.getRange(row.row, row.ix['قائم_بالعمل'] + 1).setValue('نعم'));
    schoolV31Log_(s, 'إضافة معلم حصة/معاش متاح', hrpId, []);
    return { success: true, message: 'تمت الإضافة لمدرستك.' };
  });
}

/* ============ عدد الحصص المطلوب (سقف 24 على المطلوب فقط، مجموع المدرستين) ============ */
function schoolSaveHrpRequiredBatchV40(token, items) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  items = Array.isArray(items) ? items : [];
  if (!items.length) return { success: true, message: 'لا توجد تعديلات للحفظ.', changed: 0 };
  return v35Lock_(function () {
    var sh = v40HrpRelSheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), activeBy = {};
    var active = sh.getLastRow() > 1 ? sh.getRange(2,1,sh.getLastRow()-1,h.length).getDisplayValues() : [];
    active.forEach(function(r,i){ if (v36ActiveRel_(r[ix['الحالة']]) && r[ix.schoolId] === String(s.schoolId)) activeBy[r[ix.hrpId]] = {n:i+2,r:r}; });
    var requested = {};
    items.forEach(function(it){
      var id=String(it.hrpId||'').trim(), raw=v24DigitsLocalV31_(it.required);
      if(!id || !activeBy[id]) throw new Error('معلم حصة غير مرتبط بالمدرسة.');
      var mx107=v107HrpW_(id); if(raw === '' || !/^\d+$/.test(raw)) throw new Error('عدد الحصص يجب أن يكون رقمًا صحيحًا من 0 إلى ' + mx107 + '.');
      var req=Number(raw); if(req<0||req>mx107) throw new Error('عدد الحصص يجب أن يكون من 0 إلى ' + mx107 + ' (الحد الأسبوعي لمادته).');
      requested[id]=req;
    });
    var allRel = sh.getLastRow()>1 ? sh.getRange(2,1,sh.getLastRow()-1,h.length).getDisplayValues() : [];
    Object.keys(requested).forEach(function(id){
      var other=allRel.filter(function(r){ return v36ActiveRel_(r[ix['الحالة']]) && r[ix.hrpId]===id && r[ix.schoolId]!==String(s.schoolId); }).reduce(function(a,r){return a+(Number(r[ix['عدد_الحصص_المطلوب']])||0);},0);
      var mx107=v107HrpW_(id); if(requested[id]+other>mx107) throw new Error('إجمالي الحصص المطلوبة بين المدرستين لا يجوز أن يتجاوز ' + mx107 + ' للمعلم المحدد.');
    });
    var curMo = v36ResolveMonth_(0, 0);
    if (v96Has_(V40_HRP_FIN_SHEET)) {
      var finD = v56Read_(V40_HRP_FIN_SHEET), fix = finD.ix;
      var isAppr = finD.vals.some(function(r){
        return Number(r[fix['السنة']]) === curMo.year && Number(r[fix['الشهر']]) === curMo.month && String(r[fix.schoolId]) === String(s.schoolId) && r[fix['حالة_الاعتماد']] === 'معتمد';
      });
      if (isAppr) throw new Error('لا يمكن تعديل الحصص المطلوبة بعد اعتماد كشف المدرسة ماليًا لشهر ' + curMo.label + '.');
    }
    var ttByHrp = {};
    if (v96Has_(V96_TT)) {
      var ttData = v56Read_(V96_TT), ttIx = ttData.ix;
      ttData.vals.forEach(function(r){
        if (String(r[ttIx.schoolId]) === String(s.schoolId)) {
          var pk = String(r[ttIx.personKey] || '');
          if (pk.indexOf('H:') === 0) {
            ttByHrp[pk.slice(2)] = Number(r[ttIx['المجموع']]) || 0;
          }
        }
      });
    }
    var hp = v40HrpSheet_(), hh = v36Headers_(hp), hix = schoolV31Idx_(hh), nm = {};
    hp.getDataRange().getDisplayValues().slice(1).forEach(function(r){ nm[r[hix.hrpId]] = r[hix['الاسم']]; });
    Object.keys(requested).forEach(function(id){
      var rec = activeBy[id], old = Number(rec.r[ix['عدد_الحصص_المطلوب']]) || 0, nv = requested[id];
      if (old !== nv && ttByHrp[id] !== undefined && ttByHrp[id] > 0) {
        if (ttByHrp[id] !== nv) {
          var teacherName = nm[id] || id;
          throw new Error('المعلم «' + teacherName + '» لديه جدول أسبوعي محفوظ بإجمالي (' + ttByHrp[id] + ') حصة. لا يمكن تغيير الحصص المطلوبة إلى (' + nv + ') حتى يتم تعديل الجدول أولاً ليتطابق معه.');
        }
      }
    });
    var changed=0; Object.keys(requested).forEach(function(id){ var rec=activeBy[id], old=Number(rec.r[ix['عدد_الحصص_المطلوب']])||0, nv=requested[id]; if(old!==nv){v50A_(sh.getRange(rec.n,ix['عدد_الحصص_المطلوب']+1).setValue(nv));changed++;schoolV31Log_(s,'تعديل عدد الحصص المطلوب',id,[['العدد',String(old),String(nv)]]);} });
    return {success:true,message:'تم حفظ تعديلات عدد الحصص.',changed:changed};
  });
}

/* ============ النقل والندب الجزئي (نفس فكرة الأساسيين) ============ */
function schoolRequestHrpMoveV40(token, hrpId, otherSchoolId, moveType, reason, days, periods) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  moveType = v81RelationOrMovementToLegacy_(moveType) || String(moveType || '').trim();
  if (['نقل','ندب كلي','ندب جزئي'].indexOf(moveType) < 0) throw new Error('نوع الحركة غير صالح لمعلمي الحصة/المعاش.');
  if (!String(reason || '').trim()) throw new Error('اكتب السبب / رقم القرار.');
  var nums = moveType === 'ندب جزئي' ? v68Nums_(days, periods, true) : null;
  var rri = schoolV31Idx_(v36Headers_(v40HrpRelSheet_())), active = v40HrpActiveRels_(hrpId);
  var fromRel = active.filter(function(x){ return String(x.r[rri.schoolId]) === String(s.schoolId); })[0];
  if (!fromRel) throw new Error('المعلم غير مرتبط بمدرستك حاليًا.');
  if (active.some(function(x){ return String(x.r[rri.schoolId]) === String(otherSchoolId); })) throw new Error('المعلم مرتبط بالفعل بالمدرسة الأخرى.');
  var current = Number(fromRel.r[rri['عدد_الحصص_المطلوب']]) || 0;
  if (moveType === 'ندب جزئي') {
    var other = active.filter(function(x){ return String(x.r[rri.schoolId]) !== String(s.schoolId); }).reduce(function(a,x){ return a + (Number(x.r[rri['عدد_الحصص_المطلوب']]) || 0); },0);
    var mx107 = v107HrpW_(hrpId); if (current + other + nums.p > mx107) throw new Error('إجمالي حصص المعلم في المدرستين لا يجوز أن يتجاوز ' + mx107 + ' حصة أسبوعيًا.');
  }
  if (v40ReqList_(function(x){ return String(x.employeeId) === String(hrpId) && x['الحالة'] === 'مفتوح'; }).length) throw new Error('يوجد طلب مفتوح لهذا المعلم — انتظر البت فيه أو ألغِه.');
  var id = v40ReqAdd_({ نوع_الطلب: moveType, نوع_الموظف: 'موسمي', employeeId: hrpId, fromSchoolId: s.schoolId, toSchoolId: otherSchoolId, مُبادر: s.schoolId, السبب: reason, المستخدم_الطالب: s.username || s.school, أيام_الندب_الجزئي: nums ? nums.d : '', حصص_الندب_الجزئي: nums ? nums.p : '' });
  schoolV31Log_(s, 'طلب ' + moveType + ' (حصة/معاش)', hrpId, [['إلى', '', v40Names_(otherSchoolId)], ['الحصص', '', nums ? nums.p : current]]);
  return { success: true, message: 'أُرسل طلب ' + moveType + ' إلى «' + v40Names_(otherSchoolId) + '» بانتظار موافقتها.', requestId: id };
}
/** حذف معلم حصة/معاش — سبب نصي حر بس. */
function schoolRemoveHrpV40(token, hrpId, reason) {
  var s = schoolV31Session_(token); if (!String(reason || '').trim()) throw new Error('اكتب السبب.');
  var rri = schoolV31Idx_(v36Headers_(v40HrpRelSheet_())), mine = v40HrpActiveRels_(hrpId).filter(function (x) { return x.r[rri.schoolId] === String(s.schoolId); })[0];
  if (!mine) throw new Error('غير مرتبط بمدرستك.');
  return v35Lock_(function () {
    v50A_(v40HrpRelSheet_().getRange(mine.n, rri['الحالة'] + 1).setValue('غير نشطة')); v50A_(v40HrpRelSheet_().getRange(mine.n, rri['تاريخ_النهاية'] + 1).setValue(new Date())); v50A_(v40HrpRelSheet_().getRange(mine.n, rri['ملاحظات'] + 1).setValue(reason));
    // V5.6: لو له مدرسة أخرى نشطة ولا توجد «أصلي» متبقية ← تصبح هي الأساسية
    var rest = v40HrpActiveRels_(hrpId).filter(function (x) { return x.n !== mine.n && x.r[rri.schoolId] !== String(s.schoolId); }), promoted = '';
    if (rest.length && !rest.some(function (x) { return x.r[rri['نوع_العلاقة']] === 'أصلي'; })) { v50A_(v40HrpRelSheet_().getRange(rest[0].n, rri['نوع_العلاقة'] + 1).setValue('أصلي')); promoted = v40Names_(rest[0].r[rri.schoolId]); }
    schoolV31Log_(s, 'إنهاء علاقة معلم حصة/معاش', hrpId, [['السبب', '', reason], ['أصبحت الأساسية', '', promoted]]);
    return { success: true, message: 'تم الحذف.' + (promoted ? ' وأصبحت «' + promoted + '» مدرسته الأساسية.' : '') };
  });
}

/* ============ قائمة عاملي المدرسة من الموسميين ============ */
function schoolHrpListV40(token) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_VIEW');
  var hd = v56Read_(V40_HRP_SHEET), h = hd.h, ix = hd.ix, v = hd.vals, byId = {};
  v.forEach(function (r) { byId[r[ix.hrpId]] = r; });
  var rrd = v56Read_(V40_HRP_REL_SHEET), rri = rrd.ix;
  var out = rrd.vals.filter(function (r) { return r[rri.schoolId] === s.schoolId && v36ActiveRel_(r[rri['الحالة']]); })
    .map(function (r) { var e = byId[r[rri.hrpId]] || []; return { hrpId: r[rri.hrpId], relationId: r[rri.relationId], name: e[ix['الاسم']], nationalId: e[ix['الرقم_القومي']], category: e[ix['نوع_الفئة']], subject: e[ix['مادة_التدريس']], required: r[rri['عدد_الحصص_المطلوب']], relationType: r[rri['نوع_العلاقة']], splitRaw: rri[V69_COL] != null ? r[rri[V69_COL]] : '' }; });
  // V4.6: صف واحد لكل معلم في المدرسة حتى لو له علاقتان مكررتان (أصلي + منتدب لنفس المدرسة).
  var seen = {}; out = out.filter(function (x) { var o = seen[x.hrpId]; if (!o) { seen[x.hrpId] = x; x.duplicateRelations = 0; return true; } o.required = String(Math.min(v107HrpW_(x.hrpId), (Number(o.required) || 0) + (Number(x.required) || 0))); if (x.relationType === 'أصلي') { o.relationType = 'أصلي'; o.relationId = x.relationId; } o.duplicateRelations++; return false; });
  out.forEach(function (x) { var l = v69Parse_(x.splitRaw); x.split = l.length ? v69Text_(l, x.subject, Number(x.required) || 0) : ''; delete x.splitRaw; });   // V6.9
  return { success: true, rows: out.sort(function (a, b) { return v72Cmp_({job: 'معلم', subject: a.subject, name: a.name || ''}, {job: 'معلم', subject: b.subject, name: b.name || ''}); }), total: out.length };   // V7.2: بترتيب المواد
}

/* ============ البيانات الشهرية ============ */
function v40HrpMonthlyRead_() { return v56Read_(V40_HRP_MONTHLY_SHEET); }
function schoolPreviewHrpCalcV40(token, year, month, item) {
  var s=schoolV31Session_(token); schoolV31Allowed_('SCHOOL_FINANCE');
  var p=item||{}, periods=Math.min(p.hrpId?v107Hrp_(p.hrpId).hm:v52Limits_().hourly, Number(p['الحصص_الفعلية'])||0), kind=String(p['نوع_الفئة']||'حصة');
  if(!kind){ var row=v40HrpRow_(p.hrpId); kind=row.vals[row.ix['نوع_الفئة']]||'معلم بالحصة'; }
  var val=v38MinistryHourlyNet_(periods, /معاش/.test(kind)?'معاش':'حصة جدد');
  return {success:true, amount:val, status:'محسوب', periods:periods};
}
function schoolHrpMonthlyV40(token, year, month) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_FINANCE');
  var mo = v36ResolveMonth_(year, month), workers = schoolHrpListV40(token).rows, rd = v40HrpMonthlyRead_(), rows = {};
  rd.vals.forEach(function (r) { if (schoolV31Val_(r, rd.ix, 'schoolId') === s.schoolId && Number(schoolV31Val_(r, rd.ix, 'السنة')) === mo.year && Number(schoolV31Val_(r, rd.ix, 'الشهر')) === mo.month) rows[schoolV31Val_(r, rd.ix, 'hrpId')] = { عارضة: schoolV31Val_(r, rd.ix, 'عارضة'), اعتيادي: schoolV31Val_(r, rd.ix, 'اعتيادي'), مرضي: schoolV31Val_(r, rd.ix, 'مرضي'), مأمورية: schoolV31Val_(r, rd.ix, 'مأمورية'), الحصص_الفعلية: schoolV31Val_(r, rd.ix, 'الحصص_الفعلية'), حالة_الإدخال: schoolV31Val_(r, rd.ix, 'حالة_الإدخال'), حالة_الاعتماد: schoolV31Val_(r, rd.ix, 'حالة_الاعتماد') }; });
  var frd = v56Read_(V40_HRP_FIN_SHEET), fix = frd.ix, fx = {};
  frd.vals.forEach(function (r) { if (Number(r[fix['السنة']]) === mo.year && Number(r[fix['الشهر']]) === mo.month) fx[r[fix.hrpId]] = { amount: r[fix['القيمة']], calcStatus: r[fix['حالة_الحساب']], approved: r[fix['حالة_الاعتماد']] === 'معتمد', warn: r[fix['تحذير_مدرسة_ثانية']] === 'نعم' }; });

  // أيام الحضور لمعلم الحصة رصيد شهري مشترك بين جميع مدارسه المرتبطة.
  // أيام العمل الفعلية تحددها الإدارة (مثل 22)، ثم نطرح مجموع غياب كل المدارس مرة واحدة.
  var sharedAbsenceBy = {}, info52 = v52HrpRelInfo_();
  rd.vals.forEach(function (r) {
    if (Number(schoolV31Val_(r, rd.ix, 'السنة')) !== mo.year || Number(schoolV31Val_(r, rd.ix, 'الشهر')) !== mo.month) return;
    var id = schoolV31Val_(r, rd.ix, 'hrpId');
    if (!id || !v52OwnsAbsence_(info52[id], schoolV31Val_(r, rd.ix, 'schoolId'))) return;   // V5.2: غياب المدرسة الأصلية فقط
    var abs = (Number(schoolV31Val_(r, rd.ix, 'عارضة')) || 0) + (Number(schoolV31Val_(r, rd.ix, 'اعتيادي')) || 0) + (Number(schoolV31Val_(r, rd.ix, 'مرضي')) || 0) + (Number(schoolV31Val_(r, rd.ix, 'مأمورية')) || 0);
    sharedAbsenceBy[id] = (sharedAbsenceBy[id] || 0) + abs;
  });
  workers.forEach(function (w) {
    var x52 = info52[w.hrpId]; w.multi = !!(x52 && x52.count > 1); w.ownsAbsence = v52OwnsAbsence_(x52, s.schoolId); w.absSchoolName = (w.multi && !w.ownsAbsence) ? v40Names_(x52.absSchoolId) : '';
    w.row = rows[w.hrpId] || null;
    w.state = w.row ? (w.row['حالة_الاعتماد'] === 'معتمد' ? 'معتمد' : (w.row['حالة_الإدخال'] === 'مرسل' ? 'مرسل' : 'مسودة')) : 'بدون إدخال';
    w.amount = fx[w.hrpId] || null;
    w.monthlyWorkdays = Number(mo.workdays) || 0;
    w.totalAbsence = sharedAbsenceBy[w.hrpId] || 0;
    w.attendanceDays = Math.max(0, w.monthlyWorkdays - w.totalAbsence);
  });
  var os = (typeof v51OpenSystems_ === 'function') ? v51OpenSystems_() : null; if (os && !os.hourly) mo.isOpen = false;
  try { v107Attach_(workers, 'H'); } catch (e107) { console.error('hrp monthly lim: ' + e107.message); }
  try { v108AttachMonth_(workers, 'H', s.schoolId, mo.year, mo.month); } catch (e108) { console.error('hrp monthly sub: ' + e108.message); }
  return { success: true, month: mo, workdays: mo.workdays, workers: workers, hourlyOpen: !os || os.hourly, limits: v52Limits_() };
}
function schoolSaveHrpMonthlyV40(token, year, month, items) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_FINANCE'); var mo = v36ResolveMonth_(year, month);
  if (!mo.isOpen) throw new Error('الشهر غير مفتوح.');
  if (typeof v51OpenSystems_ === 'function' && !v51OpenSystems_().hourly) throw new Error('إدخال معلمي الحصة والمعاش غير مفتوح لهذا الشهر.');
  var mine = {}, info52 = v52HrpRelInfo_(), lim52 = v52Limits_(); schoolHrpListV40(token).rows.forEach(function (w) { mine[w.hrpId] = w; });
  return v35Lock_(function () {
    var rd = v40HrpMonthlyRead_(), pos = {}, now = new Date(), added = [], updated = 0;
    rd.vals.forEach(function (r, i) { if (schoolV31Val_(r, rd.ix, 'schoolId') === s.schoolId && Number(schoolV31Val_(r, rd.ix, 'السنة')) === mo.year && Number(schoolV31Val_(r, rd.ix, 'الشهر')) === mo.month) pos[schoolV31Val_(r, rd.ix, 'hrpId')] = i + 2; });
    (items || []).forEach(function (it) {
      var w = mine[it.hrpId]; if (!w) throw new Error('موظف غير تابع لمدرستك.');
      var existingRow = pos[it.hrpId];
      var arr = existingRow ? rd.sh.getRange(existingRow, 1, 1, rd.h.length).getDisplayValues()[0] : new Array(rd.h.length).fill('');
      if (existingRow && schoolV31Val_(arr, rd.ix, 'حالة_الاعتماد') === 'معتمد') throw new Error(w.name + ': سجله المالي معتمد ولا يمكن تعديله.');
      function put(k, v) { if (rd.ix[k] != null) arr[rd.ix[k]] = v; }
      if (!existingRow) { put('monthlyId', 'HMON_' + Utilities.getUuid().replace(/-/g, '').slice(0, 16).toUpperCase()); put('hrpId', it.hrpId); put('relationId', w.relationId); put('schoolId', s.schoolId); put('السنة', mo.year); put('الشهر', mo.month); put('حالة_الإدخال', 'مسودة'); put('حالة_الاعتماد', ''); }
      if (!v52OwnsAbsence_(info52[it.hrpId], s.schoolId)) { it['عارضة'] = 0; it['اعتيادي'] = 0; it['مرضي'] = 0; it['مأمورية'] = 0; }   // V5.2
      var ab52 = (Number(it['عارضة']) || 0) + (Number(it['اعتيادي']) || 0) + (Number(it['مرضي']) || 0) + (Number(it['مأمورية']) || 0);
      var hm107 = v107Hrp_(it.hrpId).hm, pr52 = Number(it['الحصص_الفعلية']) || 0; if (pr52 < 0 || pr52 > hm107) throw new Error(w.name + ': الحصص الفعلية (' + pr52 + ') أكبر من الحد الأقصى الشهري (' + hm107 + ').');
      if (mo.workdays && ab52 > mo.workdays) throw new Error(w.name + ': إجمالي الغياب (' + ab52 + ') أكبر من أيام العمل (' + mo.workdays + ').');
      var rv65 = function (k) { var x = String(it[k] == null ? '' : it[k]).trim(); return x === '' ? '' : v36Num_(x); }; put('عارضة', rv65('عارضة')); put('اعتيادي', rv65('اعتيادي')); put('مرضي', rv65('مرضي')); put('مأمورية', rv65('مأمورية')); put('الحصص_الفعلية', rv65('الحصص_الفعلية'));   // V6.5: الفارغ ≠ الصفر put('المستخدم', s.username || ''); put('وقت_الحفظ', now); put('ملاحظات', schoolV31Clean_(it['ملاحظات']));
      if (existingRow) { v50A_(rd.sh.getRange(existingRow, 1, 1, rd.h.length).setValues([arr])); updated++; } else added.push(arr);
    });
    v36AppendRows_(rd.sh, added);
    schoolV31Log_(s, 'حفظ بيانات معلمي الحصة الشهرية', s.schoolId + '|' + mo.year + '-' + mo.month, [['مضاف', '', String(added.length)], ['محدَّث', '', String(updated)]]);
    try { v40HrpComputeCore_(s, mo.year, mo.month, false, true); } catch (e) { }
    return { success: true, message: 'تم الحفظ: ' + added.length + ' جديد، ' + updated + ' محدَّث.', added: added.length, updated: updated };
  });
}

function schoolSubmitHrpMonthlyV40(token, year, month, hrpIds) {
  var s = schoolV31Session_(token);
  schoolV31Allowed_('SCHOOL_FINANCE');
  var mo = v36ResolveMonth_(year, month);
  if (!mo.isOpen) throw new Error('الشهر غير مفتوح.');
  if (typeof v51OpenSystems_ === 'function' && !v51OpenSystems_().hourly) throw new Error('إرسال معلمي الحصة والمعاش غير مفتوح لهذا الشهر.');
  var targeted = Array.isArray(hrpIds), target = {};
  if (targeted) hrpIds.forEach(function(id){target[String(id)]=1;});
  var n = v35Lock_(function () {
    var rd = v40HrpMonthlyRead_(), n_ = 0;
    rd.vals.forEach(function (r, i) { if (schoolV31Val_(r, rd.ix, 'schoolId') === s.schoolId && Number(schoolV31Val_(r, rd.ix, 'السنة')) === mo.year && Number(schoolV31Val_(r, rd.ix, 'الشهر')) === mo.month && (!targeted || target[String(schoolV31Val_(r, rd.ix, 'hrpId'))]) && schoolV31Val_(r, rd.ix, 'حالة_الاعتماد') !== 'معتمد') { v50A_(rd.sh.getRange(i + 2, rd.ix['حالة_الإدخال'] + 1).setValue('مرسل')); n_++; } });
    schoolV31Log_(s, 'إرسال واعتماد ذاتي (معلمو الحصة)', s.schoolId, [['عدد', '', String(n_)]]);
    return n_;
  });
  var calc = { message: '' }; try { calc = v40HrpComputeCore_(s, mo.year, mo.month, true, false); } catch (e) { calc = { message: 'تعذّر الاحتساب التلقائي: ' + e.message }; }
  return { success: true, message: 'تم إرسال ' + n + ' سجل، ولن تستطيع تعديله بعد الآن. ' + (calc.message || ''), sent: n, calc: calc.stat || null };
}

/* ============ الاحتساب المالي — تجميع من مدرستين، تحذير عدم اكتمال بدل المنع ============ */
function adminComputeHrpFinanceV40(token, year, month) {
  var a = v35Admin_(token);
  return v40HrpComputeCore_(v36Actor_(a), year, month, false, false);
}
function v40HrpScheduleMonth_(hrpId, schoolId, required, maps, periodDays, countHolidays){
  var key=v96Key_('H',hrpId),tt=maps.tt[key+'|'+schoolId];if(!tt)return null;
  var weekly=V96_DAYS.reduce(function(n,d){return n+(Number(tt[d])||0);},0),req=Number(required)||0;
  if(!weekly||weekly!==req)return null;
  var abs=maps.ab[key+'|'+schoolId]||{},periods=0;
  periodDays.forEach(function(d){var weekday=V96_DAYS[d.dow],count=Number(tt[weekday])||0;if(!count||(d.holiday&&!countHolidays)||(abs[d.date]&&abs[d.date]!=='مأمورية'))return;periods+=count;});
  return {weekly:weekly,periods:periods};
}
/** محرك مشترك لاحتساب معلمي الحصة/المعاش — يستدعيه زر الإدارة اليدوي، وحفظ/إرسال المدرسة (معاينة فورية عند الحفظ، واعتماد ذاتي عند الإرسال). */
function v40HrpComputeCore_(actor, year, month, selfCertify, includeDrafts) {
  var mo = v36ResolveMonth_(year, month), rd = v40HrpMonthlyRead_();
  var sh = v40HrpSheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), people = sh.getDataRange().getDisplayValues().slice(1);
  // فهرس العلاقات مرة واحدة (hrpId → علاقاته النشطة) بدل إعادة قراءة الشيت كاملًا لكل معلم — أهم تحسين أداء هنا.
  var relSh = v40HrpRelSheet_(), rri = schoolV31Idx_(v36Headers_(relSh)), relLr = relSh.getLastRow();
  var relVals = relLr > 1 ? relSh.getRange(2, 1, relLr - 1, relSh.getLastColumn()).getDisplayValues() : [];
  var relByHrp = {}; relVals.forEach(function (r, n) { var id = String(r[rri.hrpId] || '').trim(); if (!id || !v36ActiveRel_(r[rri['الحالة']])) return; (relByHrp[id] = relByHrp[id] || []).push({ n: n + 2, r: r }); });
  var fin = v36Sheet_(V40_HRP_FIN_SHEET), fh = v36Headers_(fin), fix = schoolV31Idx_(fh), flr = fin.getLastRow(), fvals = flr > 1 ? fin.getRange(2, 1, flr - 1, fh.length).getDisplayValues() : [], pos = {};
  fvals.forEach(function (r, i) { if (Number(r[fix['السنة']]) === mo.year && Number(r[fix['الشهر']]) === mo.month) pos[r[fix.hrpId]] = { row: i + 2, vals: r }; });
  var monthByHrp = {};
  rd.vals.forEach(function (r) {
    if (Number(schoolV31Val_(r, rd.ix, 'السنة')) !== mo.year || Number(schoolV31Val_(r, rd.ix, 'الشهر')) !== mo.month) return;
    var id = schoolV31Val_(r, rd.ix, 'hrpId'); if (!id) return;
    (monthByHrp[id] = monthByHrp[id] || []).push(r);
  });
  var scheduleMaps=v96Maps_(mo.year,mo.month),scheduleDays=v96PeriodDays_(mo.year,mo.month),countHolidays=v98HrpHol_();
  var stat = { computed: 0, warned: 0, certified: 0, capped: 0 }, add = [], maxH52 = v52Limits_().hourly;
  people.forEach(function (p) {
    var hrpId = p[ix.hrpId], active = relByHrp[hrpId] || []; if (!active.length) return;
    var primary = active.filter(function (x) { return x.r[rri['نوع_العلاقة']] === 'أصلي'; })[0] || active[0], primarySchool = primary.r[rri.schoolId];
    var monthRows = monthByHrp[hrpId] || [];
    var readyRows = monthRows.filter(function (r) { var st = schoolV31Val_(r, rd.ix, 'حالة_الإدخال'); return st === 'مرسل' || (includeDrafts && (st === 'مسودة' || st === 'معاد للمدرسة')); });
    if (!readyRows.length) return;
    var old = pos[hrpId]; if (old && old.vals[fix['حالة_الاعتماد']] === 'معتمد') return; // معتمد سابقًا: لا يُعاد حسابه
    var periods = 0, readyBySchool={},sentBySchool={}; readyRows.forEach(function (r) { var sid=String(schoolV31Val_(r,rd.ix,'schoolId'));periods+=Number(schoolV31Val_(r, rd.ix, 'الحصص_الفعلية'))||0;readyBySchool[sid]=1;if(schoolV31Val_(r,rd.ix,'حالة_الإدخال')==='مرسل')sentBySchool[sid]=1; });
    var maxH52 = v107Hrp_(hrpId).hm;   // V7.65: حسب المادة
    var rawPeriods52 = periods; if (periods > maxH52) { periods = maxH52; stat.capped++; }
    var activeSchools={},requiredBySchool={}; active.forEach(function (x) { var sid=String(x.r[rri.schoolId]);activeSchools[sid]=1;requiredBySchool[sid]=(requiredBySchool[sid]||0)+(Number(x.r[rri['عدد_الحصص_المطلوب']])||0); });
    var completeSchools={}; if(sentBySchool[String(primarySchool)]||(includeDrafts&&readyBySchool[String(primarySchool)]))completeSchools[String(primarySchool)]=1;
    Object.keys(activeSchools).forEach(function(sid){if(sid===String(primarySchool))return;var plan=v40HrpScheduleMonth_(hrpId,sid,requiredBySchool[sid],scheduleMaps,scheduleDays,countHolidays);if(!plan)return;completeSchools[sid]=1;if(!readyBySchool[sid])periods+=plan.periods;});
    var warn = Object.keys(activeSchools).some(function(sid){return !completeSchools[sid];});
    var val = v38MinistryHourlyNet_(periods, p[ix['نوع_الفئة']] === 'معلم بالمعاش' ? 'معاش' : 'حصة جدد');
    var arr = old ? old.vals.slice() : new Array(fh.length).fill('');
    function put(k, v) { if (fix[k] != null) arr[fix[k]] = v; }
    if (!old) { put('financialId', 'HFIN_' + Utilities.getUuid().replace(/-/g, '').slice(0, 16).toUpperCase()); put('hrpId', hrpId); put('السنة', mo.year); put('الشهر', mo.month); }
    var doCertify = selfCertify && !warn;
    put('schoolId', primarySchool); put('نوع_الفئة', p[ix['نوع_الفئة']]); put('إجمالي_الحصص_الفعلية', periods); put('القيمة', val); put('حالة_الحساب', 'محسوب'); put('تحذير_مدرسة_ثانية', warn ? 'نعم' : 'لا'); put('حالة_الاعتماد', doCertify ? 'معتمد' : ''); put('وقت_الحساب', new Date());
    put('ملاحظات', (rawPeriods52 > maxH52 ? 'إجمالي الحصص ' + rawPeriods52 + ' — يُحتسب منها ' + maxH52 + ' فقط (الحد الأقصى الشهري). ' : '') + (warn ? 'المدرسة الأصلية لم ترسل بياناتها أو جدول مدرسة الندب لا يحتوي عدد الحصص المطلوب.' : (doCertify ? 'اعتماد ذاتي من المدرسة عند الإرسال.' : '')));
    if (old) v50A_(fin.getRange(old.row, 1, 1, fh.length).setValues([arr])); else add.push(arr);
    stat.computed++; if (warn) stat.warned++; if (doCertify) stat.certified++;
  });
  v36AppendRows_(fin, add);
  schoolV31Log_(actor, selfCertify ? 'احتساب واعتماد ذاتي (معلمو الحصة)' : 'احتساب استحقاقات معلمي الحصة والمعاش', mo.year + '-' + mo.month, [['محسوب', '', String(stat.computed)], ['بتحذير', '', String(stat.warned)], ['معتمد', '', String(stat.certified)]]);
  return { success: true, message: 'تم احتساب ' + stat.computed + ' سجلًا' + (stat.warned ? '، منهم ' + stat.warned + ' بانتظار مدرسة ثانية' : '') + '.', stat: stat };
}
function adminApproveHrpFinanceV40(token, year, month) {
  var a = v35Admin_(token), mo = v36ResolveMonth_(year, month);
  var fin = v36Sheet_(V40_HRP_FIN_SHEET), fh = v36Headers_(fin), fix = schoolV31Idx_(fh), lr = fin.getLastRow(), v = lr > 1 ? fin.getRange(2, 1, lr - 1, fh.length).getDisplayValues() : [], n = 0;
  v.forEach(function (r, i) { if (Number(r[fix['السنة']]) === mo.year && Number(r[fix['الشهر']]) === mo.month && r[fix['حالة_الحساب']] === 'محسوب' && r[fix['حالة_الاعتماد']] !== 'معتمد') { v50A_(fin.getRange(i + 2, fix['حالة_الاعتماد'] + 1).setValue('معتمد')); n++; } });
  schoolV31Log_(v36Actor_(a), 'اعتماد استحقاقات معلمي الحصة والمعاش', mo.year + '-' + mo.month, [['عدد', '', String(n)]]);
  return { success: true, message: 'تم اعتماد ' + n + ' سجل.', count: n };
}
/** كشف معلمي الحصة/المعاش — لا يُعرض (ولا يُطبع) إلا المعتمد وغير المحمّل بتحذير مدرسة ثانية. */
function v40HrpStatement_(schoolId, year, month, requirePrintable) {
  var fin=v36Sheet_(V40_HRP_FIN_SHEET), fh=v36Headers_(fin), fix=schoolV31Idx_(fh), flr=fin.getLastRow(), v=flr>1?fin.getRange(2,1,flr-1,fh.length).getDisplayValues():[];
  var sh=v40HrpSheet_(), h=v36Headers_(sh), ix=schoolV31Idx_(h), names={};
  v56Read_(V40_HRP_SHEET).vals.forEach(function(r){names[r[ix.hrpId]]={name:r[ix['الاسم']],nid:r[ix['الرقم_القومي']],subject:r[ix['مادة_التدريس']],category:r[ix['نوع_الفئة']]};});
  var relSh=v40HrpRelSheet_(), rh=v36Headers_(relSh), rix=schoolV31Idx_(rh), rels=v56Read_(V40_HRP_REL_SHEET).vals, relBy={};
  rels.forEach(function(r){if(!v36ActiveRel_(r[rix['الحالة']]))return;var id=r[rix.hrpId],list=(relBy[id]||(relBy[id]=[])),ex=list.filter(function(q){return q.schoolId===r[rix.schoolId];})[0];if(ex){ex.required=Math.min(24,ex.required+(Number(r[rix['عدد_الحصص_المطلوب']])||0));if(!ex.split&&rix[V69_COL]!=null)ex.split=r[rix[V69_COL]];if(r[rix['نوع_العلاقة']]==='أصلي')ex.type='أصلي';return;}list.push({schoolId:r[rix.schoolId],relationId:r[rix.relationId],type:r[rix['نوع_العلاقة']],required:Number(r[rix['عدد_الحصص_المطلوب']])||0,split:rix[V69_COL]!=null?r[rix[V69_COL]]:''});});
  var mSh=v40HrpMonthlyRead_(), monthly=mSh.vals, schoolNames={};
  try{var sd=v24Data_('18_بيانات_المدارس'),si=schoolV31Idx_(sd.headers);sd.rows.forEach(function(r){schoolNames[r[si.schoolId]]=r[si['اسم_المدرسة']];});}catch(e){}
  var monthBy={}; monthly.forEach(function(r){if(Number(r[mSh.ix['السنة']])!==Number(year)||Number(r[mSh.ix['الشهر']])!==Number(month))return;var id=r[mSh.ix.hrpId],sid=r[mSh.ix.schoolId],st=String(r[mSh.ix['حالة_الإدخال']]||''),ap=String(r[mSh.ix['حالة_الاعتماد']]||'');var d={schoolId:sid,school:schoolNames[sid]||sid,relationId:r[mSh.ix.relationId],entered:st==='مرسل'||ap==='معتمد',عارضة:Number(r[mSh.ix['عارضة']])||0,اعتيادي:Number(r[mSh.ix['اعتيادي']])||0,مرضي:Number(r[mSh.ix['مرضي']])||0,مأمورية:Number(r[mSh.ix['مأمورية']])||0,غياب:(Number(r[mSh.ix['عارضة']])||0)+(Number(r[mSh.ix['اعتيادي']])||0)+(Number(r[mSh.ix['مرضي']])||0)+(Number(r[mSh.ix['مأمورية']])||0),حصص:Number(r[mSh.ix['الحصص_الفعلية']])||0};(monthBy[id]||(monthBy[id]=[])).push(d);});
  var reportWorkdays = Number(v36ResolveMonth_(year, month).workdays) || 0;
  var reportScheduleMaps=v96Maps_(year,month),reportPeriodDays=v96PeriodDays_(year,month),reportCountHolidays=v98HrpHol_();
  var rows=v.filter(function(r){var related=!schoolId||(r[fix.schoolId]===String(schoolId)||(relBy[r[fix.hrpId]]||[]).some(function(rel){return String(rel.schoolId)===String(schoolId);}));return Number(r[fix['السنة']])===Number(year)&&Number(r[fix['الشهر']])===Number(month)&&related&&r[fix['حالة_الحساب']]==='محسوب'&&(!requirePrintable||(r[fix['حالة_الاعتماد']]==='معتمد'&&r[fix['تحذير_مدرسة_ثانية']]!=='نعم'));}).map(function(r){
    var n=names[r[fix.hrpId]]||{}, details=(monthBy[r[fix.hrpId]]||[]).slice(), relations=relBy[r[fix.hrpId]]||[], primaryRel=relations.filter(function(q){return q.type==='أصلي';})[0]||relations[0], relDetails=relations.map(function(rel){var d=details.filter(function(x){return x.schoolId===rel.schoolId;})[0];if((!d||(!d.entered&&primaryRel&&rel.schoolId!==primaryRel.schoolId))&&primaryRel&&rel.schoolId!==primaryRel.schoolId){var plan=v40HrpScheduleMonth_(r[fix.hrpId],rel.schoolId,rel.required,reportScheduleMaps,reportPeriodDays,reportCountHolidays);if(plan)d={schoolId:rel.schoolId,school:schoolNames[rel.schoolId]||rel.schoolId,غياب:0,حصص:plan.periods,عارضة:0,اعتيادي:0,مرضي:0,مأمورية:0,entered:false,scheduleOnly:true,approved:true};}if(!d)d={schoolId:rel.schoolId,school:schoolNames[rel.schoolId]||rel.schoolId,غياب:0,حصص:0,عارضة:0,اعتيادي:0,مرضي:0,مأمورية:0};d.required=rel.required;d.relationType=rel.type;var l69=v69Parse_(rel.split);d.splitText=l69.length?v69Text_(l69,n.subject,rel.required):'';return d;});
    var prim52=(relBy[r[fix.hrpId]]||[]).filter(function(q){return q.type==='أصلي';})[0],multi52=(relBy[r[fix.hrpId]]||[]).length>1;
    var totalAbs=details.reduce(function(a,d){return a+((!multi52||!prim52||d.schoolId===prim52.schoolId)?d.غياب:0);},0),totalPeriods=details.reduce(function(a,d){return a+d.حصص;},0);
    var workdays = reportWorkdays;
    var ab74={عارضة:0,اعتيادي:0,مرضي:0,مأمورية:0};details.forEach(function(d){if(multi52&&prim52&&d.schoolId!==prim52.schoolId)return;Object.keys(ab74).forEach(function(k){ab74[k]+=Number(d[k])||0;});});   // V7.35: الغياب المفصل للطباعة
    return {school:schoolNames[r[fix.schoolId]]||r[fix.schoolId],required:relDetails.reduce(function(a,d){return a+(Number(d.required)||0);},0),abs:ab74,hrpId:r[fix.hrpId],name:n.name||r[fix.hrpId],nationalId:n.nid,subject:n.subject,category:r[fix['نوع_الفئة']],periods:r[fix['إجمالي_الحصص_الفعلية']],value:r[fix['القيمة']],certified:r[fix['حالة_الاعتماد']]==='معتمد',warn:r[fix['تحذير_مدرسة_ثانية']]==='نعم',schoolsDetail:relDetails,totalAbsence:totalAbs,totalPeriods:totalPeriods,monthlyWorkdays:workdays,attendanceDays:Math.max(0,workdays-totalAbs)};
  });
  try{v96AttachHrp_(rows,year,month);}catch(e96){console.error('v40HrpStatement_ dayplan: '+e96.message);}   // V7.47: الجدول وأيام الغياب للاستمارات
  var total=rows.reduce(function(a,x){return a+(x.certified?(Number(x.value)||0):0);},0);
  return {rows:rows.sort(function(a,b){return a.name.localeCompare(b.name,'ar');}),total:total};
}
function schoolHrpStatementV40(token, year, month) { var s = schoolV31Session_(token); var mo = v36ResolveMonth_(year, month); var r = v40HrpStatement_(s.schoolId, mo.year, mo.month, true); r.success = true; r.month = mo;
  var allForSchool = v40HrpStatement_(s.schoolId, mo.year, mo.month, false); r.blocked = allForSchool.rows.filter(function (x) { return x.warn; }); return r; }
function adminHrpStatementV40(token, year, month, schoolId) { v35Admin_(token); var mo = v36ResolveMonth_(year, month); var r = v40HrpStatement_(schoolId || '', mo.year, mo.month, false); r.success = true; r.month = mo; return r; }

/* ============ استيراد لمرة واحدة من الورقة القديمة 21_الحصة_المختارون ============ */
function v40NormSchoolName_(s) { return String(s || '').trim().replace(/\u0640/g, '').replace(/\s+/g, ' ').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي'); }
function adminImportHrpLegacyV40(token) {
  var a = v35Admin_(token);
  var src = v36Sheet_('21_الحصة_المختارون'), sh_ = v36Headers_(src), si = schoolV31Idx_(sh_);
  var lr = src.getLastRow(); if (lr < 2) return { success: true, message: 'لا توجد بيانات في الورقة القديمة.', imported: 0, skipped: 0, unmatched: 0 };
  var rows = src.getRange(2, 1, lr - 1, sh_.length).getDisplayValues();
  var schools = v24Data_('18_بيانات_المدارس'), schi = schoolV31Idx_(schools.headers), byName = {};
  schools.rows.forEach(function (r) { var n = schoolV31Val_(r, schi, 'اسم_المدرسة'); if (n) byName[v40NormSchoolName_(n)] = { id: schoolV31Val_(r, schi, 'schoolId'), name: n.trim() }; });
  var al = v46SchoolAliasMap_(); Object.keys(al).forEach(function (k) { if (!byName[k]) byName[k] = { id: al[k], name: k }; });
  var existing = {}; var hsh = v40HrpSheet_(), hh = v36Headers_(hsh), hix = schoolV31Idx_(hh);
  var hlr = hsh.getLastRow(); if (hlr > 1) hsh.getRange(2, 1, hlr - 1, hh.length).getDisplayValues().forEach(function (r) { var nid = v24DigitsLocalV31_(r[hix['الرقم_القومي']]); if (nid) existing[nid] = r[hix.hrpId]; });
  var byNid = {}, totalRows = rows.length, badNid = 0, noSchool1 = 0, unmatchedNames = {};
  rows.forEach(function (r) {
    var nid = v24DigitsLocalV31_(r[si['الرقم القومي']]); var nv=v24ValidateNationalIdV40_(nid); if (!nv.valid) { badNid++; return; }
    var s1raw = String(r[si['المدرسة الأولى الحالية']] || '').trim() || String(r[si['المدرسة الأساسية']] || r[si['المدرسة الطالبة']] || '').trim(); if (!s1raw) { noSchool1++; return; }
    var m1 = byName[v40NormSchoolName_(s1raw)];
    if (!m1) { unmatchedNames[s1raw] = (unmatchedNames[s1raw] || 0) + 1; return; }
    byNid[nid] = { r: r, s1: m1 };
  });
  var imported = 0, skipped = 0, notes = [];
  v35Lock_(function () {
    Object.keys(byNid).forEach(function (nid) {
      if (existing[nid]) { skipped++; return; }
      var r = byNid[nid].r, s1Id = byNid[nid].s1.id;
      var name = String(r[si['اسم المعلم']] || '').trim();
      var hasCur = !!String(r[si['المدرسة الأولى الحالية']] || '').trim();
      var s2raw = String(hasCur ? (r[si['المدرسة الثانية الحالية']] || '') : (r[si['المدرسة الفرعية']] || '')).trim(), m2 = s2raw ? byName[v40NormSchoolName_(s2raw)] : null, s2Id = m2 ? m2.id : '';
      var mxI = v107ForSubject_(String(r[si['مادة المدرسة الأولى']] || r[si['المادة']] || '')).hw;   // V7.65
      var req1 = Math.max(0, Math.min(mxI, Number(hasCur ? r[si['حصص المدرسة الأولى']] : (r[si['عدد الحصص المعتمدة']] || r[si['عدد الحصص المطلوبة هذا العام']])) || 0));
      var req2raw = Math.max(0, Number(hasCur ? r[si['حصص المدرسة الثانية']] : r[si['عدد الحصص المعتمدة للمدرسة الثانية']]) || 0);
      if (s2Id && s2Id === s1Id) { req1 = Math.min(mxI, req1 + req2raw); s2Id = ''; } // المدرسة الثانية = الأولى: علاقة واحدة
      var req2 = s2Id ? Math.max(0, Math.min(mxI - req1, req2raw)) : 0;
      var subject = String(r[si['مادة المدرسة الأولى']] || r[si['المادة']] || '').trim(); if (typeof subjectCanonV44_ === 'function') subject = subjectCanonV44_(subject) || subject;
      var hrpId = 'HRP_' + Utilities.getUuid().replace(/-/g, '').slice(0, 18).toUpperCase();
      var row_ = new Array(hh.length).fill(''); function p(k, v) { if (hix[k] != null) row_[hix[k]] = v; }
      var nvi = v24ValidateNationalIdV40_(nid);
      p('hrpId', hrpId); p('الرقم_القومي', nid); p('الاسم', name); p('النوع', nvi.type || ''); p('تاريخ_الميلاد', nvi.birthDate || ''); p('نوع_الفئة', v40HrpCategory_(nvi.birthDate)); p('مادة_التدريس', subject);
      p('originalSchoolId', s1Id); p('تاريخ_الإضافة', new Date()); p('حالة_السجل', 'قائم'); p('قائم_بالعمل', 'نعم');
      p('ملاحظات', 'مستورد تلقائيًا من الورقة القديمة (21_الحصة_المختارون) — تاريخ الميلاد والنوع والفئة من الرقم القومي.');
      v50A_(hsh.appendRow(row_));
      v40HrpAddRelation_(hrpId, s1Id, 'أصلي', req1, 'استيراد من الورقة القديمة', '', true);
      if (s2Id && req2 > 0) v40HrpAddRelation_(hrpId, s2Id, 'منتدب إلينا جزئي', req2, 'استيراد من الورقة القديمة', '', true);
      imported++;
      if (s2raw && !s2Id) notes.push(name + ': مدرسته الثانية «' + s2raw + '» غير مطابقة لاسم مدرسة معتمد — لم تُستورد له مدرسة ثانية.');
    });
  });
  var unmatchedList = Object.keys(unmatchedNames).sort(function (a, b) { return unmatchedNames[b] - unmatchedNames[a]; });
  schoolV31Log_(v36Actor_(a), 'استيراد معلمي الحصة من الورقة القديمة', '', [['مستورَد', '', String(imported)], ['متخطَّى (موجود بالفعل)', '', String(skipped)], ['أسماء مدارس غير مطابقة', '', String(unmatchedList.length)]]);
  var msg = 'فحصت ' + totalRows + ' صفًا في الورقة القديمة — استوردت ' + imported + ' معلم حصة/معاش' + (skipped ? '، وتخطيت ' + skipped + ' موجود بالفعل' : '') + '.';
  if (badNid) msg += ' (' + badNid + ' صفًا برقم قومي غير صحيح لم تُحتسب)';
  if (noSchool1) msg += ' (' + noSchool1 + ' صفًا بلا مدرسة أولى مسجَّلة)';
  if (unmatchedList.length) msg += ' — ' + unmatchedList.length + ' اسم مدرسة في الورقة القديمة غير مطابق لاسم مدرسة معتمد حاليًا، فلم تُستورد أسطرها (شوف التفاصيل تحت).';
  return { success: true, message: msg, imported: imported, skipped: skipped, unmatched: unmatchedList.length, unmatchedSamples: unmatchedList.slice(0, 15).map(function (n) { return n + ' (' + unmatchedNames[n] + ' صف)'; }), notes: notes.slice(0, 20) };
}

/** V4.6 — دمج العلاقات المكررة لنفس المعلم في نفس المدرسة (أصلي + منتدب). تبقى علاقة «أصلي» بمجموع الحصص (سقف 24) وتُنهى الأخرى — لا حذف. */
function adminMergeDuplicateHrpRelationsV46(token) {
  var a = v35Admin_(token);
  return v35Lock_(function () {
    var sh = v40HrpRelSheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), lr = sh.getLastRow(), v = lr > 1 ? sh.getRange(2, 1, lr - 1, h.length).getDisplayValues() : [], groups = {};
    v.forEach(function (r, i) { if (!v36ActiveRel_(r[ix['الحالة']]) || !r[ix.hrpId]) return; var k = r[ix.hrpId] + '|' + r[ix.schoolId]; (groups[k] = groups[k] || []).push({ n: i + 2, r: r }); });
    var merged = 0, names = [];
    var hp = v40HrpSheet_(), hh = v36Headers_(hp), hix = schoolV31Idx_(hh), nm = {}; hp.getDataRange().getDisplayValues().slice(1).forEach(function (r) { nm[r[hix.hrpId]] = r[hix['الاسم']]; });
    Object.keys(groups).forEach(function (k) {
      var g = groups[k]; if (g.length < 2) return;
      var keep = g.filter(function (x) { return x.r[ix['نوع_العلاقة']] === 'أصلي'; })[0] || g[0];
      var total = g.reduce(function (s_, x) { return s_ + (Number(x.r[ix['عدد_الحصص_المطلوب']]) || 0); }, 0);
      var mx107 = v107HrpW_(keep.r[ix.hrpId]); v50A_(sh.getRange(keep.n, ix['عدد_الحصص_المطلوب'] + 1).setValue(Math.min(mx107, total)));
      g.forEach(function (x) { if (x === keep) return; v50A_(sh.getRange(x.n, ix['الحالة'] + 1).setValue('منتهية')); if (ix['تاريخ_النهاية'] != null) v50A_(sh.getRange(x.n, ix['تاريخ_النهاية'] + 1).setValue(new Date())); if (ix['ملاحظات'] != null) v50A_(sh.getRange(x.n, ix['ملاحظات'] + 1).setValue('دُمجت في ' + keep.r[ix.relationId] + ' (علاقة مكررة لنفس المدرسة)')); merged++; });
      names.push((nm[keep.r[ix.hrpId]] || keep.r[ix.hrpId]) + ' — ' + Math.min(mx107, total) + ' حصة');
    });
    schoolV31Log_(v36Actor_(a), 'دمج علاقات معلمي الحصة المكررة', '', [['عدد', '', String(merged)]]);
    return { success: true, merged: merged, names: names, message: merged ? ('تم دمج ' + merged + ' علاقة مكررة: ' + names.join('، ')) : 'لا توجد علاقات مكررة.' };
  });
}

/* ===================== V4.8 — أدوات معلمي الحصة ===================== */
/** أسماء بديلة للمدارس من ورقة «توحيد_المدارس» (الاسم_الحالي → schoolId_الجديد) — مثل «الدوير ت /س ابتدائى» و«ناصر الابتدائية بالدوير». */
function v46SchoolAliasMap_() {
  var m = {};
  try { var d = v24Data_('توحيد_المدارس'), i = schoolV31Idx_(d.headers); d.rows.forEach(function (r) { var a = schoolV31Val_(r, i, 'الاسم_الحالي'), id = schoolV31Val_(r, i, 'schoolId_الجديد'); if (a && id) m[v40NormSchoolName_(a)] = id; }); } catch (e) {}
  return m;
}
function v46SchoolIdByName_() {
  var m = {}, names = {};
  var d = v24Data_('18_بيانات_المدارس'), i = schoolV31Idx_(d.headers);
  d.rows.forEach(function (r) { var n = schoolV31Val_(r, i, 'اسم_المدرسة'), id = schoolV31Val_(r, i, 'schoolId'); if (n && id) { m[v40NormSchoolName_(n)] = id; names[id] = n; } });
  var al = v46SchoolAliasMap_(); Object.keys(al).forEach(function (k) { if (!m[k]) m[k] = al[k]; });
  return { byName: m, names: names };
}
/** يستكمل تاريخ الميلاد والنوع من الرقم القومي لكل معلمي الحصة، ويعيد تحديد الفئة (حصة/معاش — فوق 60 سنة) للسجلات المستوردة آليًا. */
function adminFillHrpFromNidV46(token) {
  var a = v35Admin_(token);
  return v35Lock_(function () {
    var sh = v40HrpSheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), lr = sh.getLastRow(); if (lr < 2) return { success: true, message: 'لا يوجد معلمو حصة.' };
    var v = sh.getRange(2, 1, lr - 1, h.length).getValues(), filled = 0, pension = 0, bad = [];
    v.forEach(function (r) {
      var nv = v24ValidateNationalIdV40_(r[ix['الرقم_القومي']]); if (!nv.valid) { if (r[ix['الرقم_القومي']]) bad.push(r[ix['الاسم']]); return; }
      var changed = false;
      if (!String(r[ix['تاريخ_الميلاد']] || '').trim()) { r[ix['تاريخ_الميلاد']] = nv.birthDate; changed = true; }
      if (!String(r[ix['النوع']] || '').trim()) { r[ix['النوع']] = nv.type; changed = true; }
      var note = String(ix['ملاحظات'] != null ? r[ix['ملاحظات']] : '');
      if (changed || /مستورد|مضاف من تحديث/.test(note)) { var cat = v40HrpCategory_(v35Date_(r[ix['تاريخ_الميلاد']]) || nv.birthDate); if (r[ix['نوع_الفئة']] !== cat) { r[ix['نوع_الفئة']] = cat; changed = true; } }
      if (r[ix['نوع_الفئة']] === 'معلم بالمعاش') pension++;
      if (changed) filled++;
    });
    v50A_(sh.getRange(2, 1, v.length, h.length).setValues(v));
    schoolV31Log_(v36Actor_(a), 'استكمال بيانات معلمي الحصة من الرقم القومي', '', [['محدَّث', '', String(filled)]]);
    return { success: true, updated: filled, pension: pension, invalid: bad, message: 'تم تحديث ' + filled + ' سجل (تاريخ الميلاد/النوع/الفئة). معلمو المعاش: ' + pension + (bad.length ? '. أرقام قومية غير صحيحة: ' + bad.join('، ') : '') };
  });
}
/**
 * مزامنة معلمي الحصة من ورقة «مصدر_حصة_طلبات معلمي الحصة» (نسخة منظومة الحصة) حسب الرقم القومي:
 * جديد ← يُضاف بعلاقاته، تغيّرت المدرسة/الحصص ← تُحدَّث العلاقات، خرج من المعتمدين ← تُنهى علاقاته (بلا حذف).
 * لو لا توجد مدرسة حالية يُستعان بالمدرسة الأساسية/الطالبة وعدد الحصص المعتمدة. apply=false معاينة فقط.
 */
function adminSyncHrpFromSourceV46(token, apply) {
  var a = v35Admin_(token);
  var run = function () {
    var src = v36Sheet_('مصدر_حصة_طلبات معلمي الحصة'), sh_ = v36Headers_(src), si = schoolV31Idx_(sh_), lr = src.getLastRow();
    if (lr < 2) return { success: true, message: 'ورقة المصدر فارغة.', report: {} };
    var rows = src.getRange(2, 1, lr - 1, sh_.length).getDisplayValues();
    var S = v46SchoolIdByName_(), nm = function (id) { return S.names[id] || id; };
    function val(r, k) { return si[k] == null ? '' : String(r[si[k]] || '').trim(); }
    function num(x) { return Math.max(0, Number(v24DigitsLocalV31_(x)) || 0); }
    function desired(r) {
      var cur = val(r, 'المدرسة الأولى الحالية'), s1raw, p1, s2raw, p2;
      if (cur) { s1raw = cur; p1 = num(val(r, 'حصص المدرسة الأولى')); s2raw = val(r, 'المدرسة الثانية الحالية'); p2 = num(val(r, 'حصص المدرسة الثانية')); }
      else { s1raw = val(r, 'المدرسة الأساسية') || val(r, 'المدرسة الطالبة'); p1 = num(val(r, 'عدد الحصص المعتمدة')) || num(val(r, 'عدد الحصص المطلوبة هذا العام')); s2raw = val(r, 'المدرسة الفرعية'); p2 = num(val(r, 'عدد الحصص المعتمدة للمدرسة الثانية')); }
      var s1 = S.byName[v40NormSchoolName_(s1raw)] || '', s2 = s2raw ? (S.byName[v40NormSchoolName_(s2raw)] || '') : '', d = {};
      var mxI = v107ForSubject_(val(r, 'المادة') || val(r, 'مادة المدرسة الأولى')).hw;   // V7.65
      if (s1) d[s1] = Math.min(mxI, p1);
      if (s2 && p2 > 0) { if (s2 === s1) d[s1] = Math.min(mxI, p1 + p2); else d[s2] = Math.max(0, Math.min(mxI - (d[s1] || 0), p2)); }
      return { d: d, s1: s1, s1raw: s1raw, s2bad: (s2raw && !s2) ? s2raw : '', fallback: !cur };
    }
    var ap = {};
    rows.forEach(function (r) { if (val(r, 'قرار التوجيه') !== 'اعتماد') return; var nid = v24DigitsLocalV31_(val(r, 'الرقم القومي')); (ap[nid] = ap[nid] || []).push(r); });
    var hsh = v40HrpSheet_(), hh = v36Headers_(hsh), hix = schoolV31Idx_(hh), hlr = hsh.getLastRow(), hv = hlr > 1 ? hsh.getRange(2, 1, hlr - 1, hh.length).getDisplayValues() : [], tBy = {}, tRow = {};
    hv.forEach(function (r, n) { var nid = v24DigitsLocalV31_(r[hix['الرقم_القومي']]); if (nid) { tBy[nid] = r[hix.hrpId]; tRow[nid] = { n: n + 2, r: r }; } });
    var rsh = v40HrpRelSheet_(), rh = v36Headers_(rsh), rix = schoolV31Idx_(rh), rlr = rsh.getLastRow(), rv = rlr > 1 ? rsh.getRange(2, 1, rlr - 1, rh.length).getDisplayValues() : [], relBy = {};
    rv.forEach(function (r, n) { if (v36ActiveRel_(r[rix['الحالة']])) (relBy[r[rix.hrpId]] = relBy[r[rix.hrpId]] || []).push({ n: n + 2, r: r }); });
    var rep = { 'جديد': [], 'تعديل': [], 'خرج من المعتمدين': [], 'رقم قومي غير صحيح': [], 'مدرسة غير مطابقة': [], 'مدرسة ثانية غير مطابقة': [] };
    var now = new Date(), newT = [], newR = [], sets = [];
    function relRow(hid, sid, type, req) { var x = new Array(rh.length).fill(''); function p(k, v) { if (rix[k] != null) x[rix[k]] = v; } p('relationId', 'HREL_' + Utilities.getUuid().replace(/-/g, '').slice(0, 18).toUpperCase()); p('hrpId', hid); p('schoolId', sid); p('نوع_العلاقة', type); p('عدد_الحصص_المطلوب', req); p('تاريخ_البداية', now); p('الحالة', 'نشطة'); p('مصدر_العلاقة', 'مزامنة منظومة الحصة'); return x; }
    Object.keys(ap).forEach(function (nid) {
      var reqs = ap[nid], name0 = val(reqs[0], 'اسم المعلم'), nv = v24ValidateNationalIdV40_(nid);
      if (!nv.valid) { rep['رقم قومي غير صحيح'].push(name0); return; }
      var cands = reqs.map(function (r) { var d = desired(r); d.r = r; return d; }).filter(function (c) { return c.s1; });
      if (!cands.length) { rep['مدرسة غير مطابقة'].push(name0 + ' — ' + desired(reqs[0]).s1raw); return; }
      cands.sort(function (x, y) { var kx = [val(x.r, 'معرف الطلب') ? 1 : 0, x.fallback ? 0 : 1, val(x.r, 'تاريخ آخر تعديل')].join('|'), ky = [val(y.r, 'معرف الطلب') ? 1 : 0, y.fallback ? 0 : 1, val(y.r, 'تاريخ آخر تعديل')].join('|'); return kx < ky ? -1 : kx > ky ? 1 : 0; });
      var c = cands[cands.length - 1], r = c.r, name = val(r, 'اسم المعلم');
      if (c.s2bad) rep['مدرسة ثانية غير مطابقة'].push(name + ' — ' + c.s2bad);
      var desc = Object.keys(c.d).map(function (k) { return nm(k) + ' (' + c.d[k] + ')'; }).join(' + ');
      if (!tBy[nid]) {
        rep['جديد'].push(name + ' — ' + desc);
        var hid = 'HRP_' + Utilities.getUuid().replace(/-/g, '').slice(0, 18).toUpperCase(), x = new Array(hh.length).fill('');
        function p(k, v) { if (hix[k] != null) x[hix[k]] = v; }
        var subj = val(r, 'مادة المدرسة الأولى') || val(r, 'المادة'); if (typeof subjectCanonV44_ === 'function') subj = subjectCanonV44_(subj) || subj;
        p('hrpId', hid); p('الرقم_القومي', nid); p('الاسم', name); p('النوع', nv.type); p('تاريخ_الميلاد', nv.birthDate); p('نوع_الفئة', v40HrpCategory_(nv.birthDate)); p('مادة_التدريس', subj); p('originalSchoolId', c.s1); p('تاريخ_الإضافة', now); p('حالة_السجل', 'قائم'); p('قائم_بالعمل', 'نعم'); p('ملاحظات', 'مضاف من تحديث منظومة الحصة');
        newT.push(x); Object.keys(c.d).forEach(function (sid) { newR.push(relRow(hid, sid, sid === c.s1 ? 'أصلي' : 'منتدب إلينا جزئي', c.d[sid])); });
        return;
      }
      var hid2 = tBy[nid], cur = {}; (relBy[hid2] || []).forEach(function (q) { cur[q.r[rix.schoolId]] = q; });
      var ch = [];
      Object.keys(c.d).forEach(function (sid) {
        if (cur[sid]) { var old = Number(cur[sid].r[rix['عدد_الحصص_المطلوب']]) || 0; if (old !== c.d[sid]) { ch.push(nm(sid) + ': ' + c.d[sid] + ' ← ' + old); sets.push([cur[sid].n, rix['عدد_الحصص_المطلوب'], c.d[sid]]); } }
        else { ch.push('إضافة ' + nm(sid) + ' (' + c.d[sid] + ')'); newR.push(relRow(hid2, sid, sid === c.s1 ? 'أصلي' : 'منتدب إلينا جزئي', c.d[sid])); }
      });
      Object.keys(cur).forEach(function (sid) { if (c.d[sid] === undefined) { ch.push('إنهاء ' + nm(sid)); sets.push([cur[sid].n, rix['الحالة'], 'منتهية']); if (rix['تاريخ_النهاية'] != null) sets.push([cur[sid].n, rix['تاريخ_النهاية'], now]); if (rix['ملاحظات'] != null) sets.push([cur[sid].n, rix['ملاحظات'], 'أُنهيت بمزامنة منظومة الحصة']); } });
      if (cur[c.s1] && cur[c.s1].r[rix['نوع_العلاقة']] !== 'أصلي') { ch.push('المدرسة الأصلية ← ' + nm(c.s1)); sets.push([cur[c.s1].n, rix['نوع_العلاقة'], 'أصلي']); Object.keys(cur).forEach(function (sid) { if (sid !== c.s1 && cur[sid].r[rix['نوع_العلاقة']] === 'أصلي') sets.push([cur[sid].n, rix['نوع_العلاقة'], 'منتدب إلينا جزئي']); }); }
      if (ch.length) rep['تعديل'].push(name + ' — ' + ch.join('، '));
    });
    Object.keys(tBy).forEach(function (nid) { var hid = tBy[nid]; if (ap[nid] || !(relBy[hid] || []).length) return; rep['خرج من المعتمدين'].push(tRow[nid].r[hix['الاسم']]); relBy[hid].forEach(function (q) { sets.push([q.n, rix['الحالة'], 'منتهية']); if (rix['تاريخ_النهاية'] != null) sets.push([q.n, rix['تاريخ_النهاية'], now]); if (rix['ملاحظات'] != null) sets.push([q.n, rix['ملاحظات'], 'لم يعد ضمن المعتمدين في منظومة الحصة']); }); });
    if (apply) {
      sets.forEach(function (x) { v50A_(rsh.getRange(x[0], x[1] + 1).setValue(x[2])); });
      v36AppendRows_(hsh, newT); v36AppendRows_(rsh, newR);
      schoolV31Log_(v36Actor_(a), 'مزامنة معلمي الحصة من منظومة الحصة', '', [['جديد', '', String(rep['جديد'].length)], ['تعديل', '', String(rep['تعديل'].length)], ['خرج', '', String(rep['خرج من المعتمدين'].length)]]);
    }
    var msg = (apply ? 'تم التطبيق: ' : 'معاينة (لم يُكتب شيء): ') + rep['جديد'].length + ' جديد، ' + rep['تعديل'].length + ' تعديل، ' + rep['خرج من المعتمدين'].length + ' خرج من المعتمدين.';
    return { success: true, applied: !!apply, message: msg, report: rep };
  };
  return apply ? v35Lock_(run) : run();
}
