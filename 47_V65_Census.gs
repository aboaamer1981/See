/** V6.5 — حصر العاملين (موقف كل عامل مرشَّح للمدرسة) عند بدء التشغيل وكل دورة تفتحها الإدارة.
 *  الهدف: أن تطابق القاعدة الواقع. المدرسة تحدد حالة كل اسم، ولا يُعتمد الحصر إلا بعد تحديد الجميع.
 *  بعد «اعتماد الحصر» يختفي الجدول نهائيًا عن المدرسة لهذه الدورة ويظهر جدول العاملين المعتاد.
 *  التطبيق: حالات المدرسة الواحدة تُطبَّق فورًا؛ الحالات بين مدرستين داخل الإدارة تُطبَّق عند اتفاق الطرفين، والخلاف للإدارة. */
var V65_SHEET = 'حصر_العاملين';
var V65_HEAD = ['censusId', 'الدورة', 'schoolId', 'employeeId', 'الاسم', 'الرقم_القومي', 'المسمى', 'الحالة_في_الحصر', 'وصف_الحالة', 'الجهة_schoolId', 'الجهة_نص', 'التاريخ', 'ملاحظات', 'حالة_التطبيق', 'المصدر', 'المستخدم', 'وقت_الحفظ', 'أيام_الندب', 'حصص_الندب'];
/** code, label, group (work|away|gone|unknown), detail ('' | school | text | leave | end) */
function v65Statuses_(){ return v81RelationDefinitions_(); }
var V65_STATUSES = null;

var V65_LEAVES = ['بدون مرتب', 'رعاية طفل', 'مرافقة زوج/زوجة', 'تجنيد', 'مرضية طويلة', 'دراسية', 'أخرى'];
var V65_ENDS = ['استقالة', 'فصل', 'انقطاع عن العمل', 'أخرى'];
var V65_GROUP_LABEL = {work: 'يعمل بالمدرسة', away: 'تابع للمدرسة ويعمل/غائب خارجها', gone: 'لم يعد تابعًا للمدرسة', unknown: 'غير معروف'};
/** الإقرار المقابل المطلوب من المدرسة الأخرى. */
var V65_PAIR = {OUT_FULL_IN: 'IN_FULL_IN', OUT_PART: 'IN_PART', TR_IN: 'ORIG', IN_FULL_IN: 'OUT_FULL_IN', IN_PART: 'OUT_PART'};
var V65_INCOMING_SUGGEST = {OUT_FULL_IN: 'IN_FULL_IN', OUT_PART: 'IN_PART', TR_IN: 'ORIG'};

function v65St_(code){ for (var i = 0; i < v65Statuses_().length; i++) if (v65Statuses_()[i][0] === code) return {code: code, label: v65Statuses_()[i][1], group: v65Statuses_()[i][2], detail: v65Statuses_()[i][3]}; return null; }
function v65Round_(){ return String(v36GetSetting_('CENSUS_ROUND', '2026/2027') || '2026/2027').trim(); }
function v65Open_(){ return String(v36GetSetting_('CENSUS_OPEN', 'نعم') || 'نعم').trim() !== 'لا'; }
function v65DoneAll_(){ try { var j = JSON.parse(String(v36GetSetting_('CENSUS_DONE', '{}') || '{}')); return j && typeof j === 'object' ? j : {}; } catch (e) { return {}; } }
function v65Done_(round){ return v65DoneAll_()[round || v65Round_()] || {}; }
function v65SetDone_(sid, info){ var all = v65DoneAll_(), r = v65Round_(); all[r] = all[r] || {}; if (info) all[r][sid] = info; else delete all[r][sid]; v36SetSetting_('CENSUS_DONE', JSON.stringify(all), 'حصر العاملين: المدارس التي اعتمدت حصرها لكل دورة'); try { V56_SET_MEMO_ = null; } catch (e) {} }
function v65Sheet_(){
  var ss = personnelSS_(), sh = ss.getSheetByName(V65_SHEET);
  if (!sh) { sh = v50A_(ss.insertSheet(V65_SHEET)); v50A_(sh.getRange(1, 1, 1, V65_HEAD.length).setValues([V65_HEAD])); try { sh.setRightToLeft(true); sh.setFrozenRows(1); } catch (e) {} }
  return sh;
}
function v65Read_(){ v65Sheet_(); var d = v56Read_(V65_SHEET), round = v65Round_(); return {d: d, rows: d.vals.map(function(r, i){ return {i: i, n: i + 2, r: r}; }).filter(function(x){ return schoolV31Val_(x.r, d.ix, 'الدورة') === round; })}; }
function v65Obj_(x, ix){ var g = function(k){ return schoolV31Val_(x.r, ix, k); }; return {id: g('censusId'), n: x.n, sid: g('schoolId'), eid: g('employeeId'), name: g('الاسم'), nid: g('الرقم_القومي'), job: g('المسمى'), code: g('الحالة_في_الحصر'), toSid: g('الجهة_schoolId'), text: g('الجهة_نص'), date: g('التاريخ'), notes: g('ملاحظات'), state: g('حالة_التطبيق'), source: g('المصدر'), days: g('أيام_الندب'), periods: g('حصص_الندب')}; }

/** قائمة المدرسة: علاقات نشطة + مدرستها الأصلية + القادمون من مدارس أخرى + المضافون يدويًا. */
function v65Roster_(sid){
  sid = String(sid);
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), by = {}, out = {}, names = v42SchoolNames_();
  emp.rows.forEach(function(r){ by[schoolV31Val_(r, ei, 'employeeId')] = r; });
  function add(eid, why, relType){
    var r = by[eid]; if (!r || out[eid]) { if (out[eid] && relType && !out[eid].relType) out[eid].relType = relType; return; }
    if (schoolV31Val_(r, ei, 'حالة_السجل') === 'غير قائم') return;
    out[eid] = {eid: eid, name: schoolV31Val_(r, ei, 'الاسم'), nid: schoolV31Val_(r, ei, 'الرقم_القومي'), job: schoolV31Val_(r, ei, 'المسمى_الوظيفي'), subject: schoolV31Val_(r, ei, 'مادة_التدريس'), sup: schoolV31Val_(r, ei, 'الوظيفة_الإشرافية'), relType: relType || '', why: why, orig: schoolV31Val_(r, ei, 'originalSchoolId')};
  }
  rel.rows.forEach(function(r){ if (schoolV31Val_(r, ri, 'schoolId') !== sid) return; var st = schoolV31Val_(r, ri, 'الحالة'); if (!v36ActiveRel_(st) && !/^منتدب كليًا لجهة أخرى|^إجازة|^معلقة|^معار/.test(st)) return; add(schoolV31Val_(r, ri, 'employeeId'), 'علاقة', v102RelLabel_(schoolV31Val_(r, ri, 'نوع_العلاقة'), st, schoolV31Val_(r, ri, 'ملاحظات'))); });   // V7.58: المسمى الموحد
  emp.rows.forEach(function(r){ if (schoolV31Val_(r, ei, 'originalSchoolId') === sid) add(schoolV31Val_(r, ei, 'employeeId'), 'مدرسته الأصلية', ''); });
  var C = v65Read_(), ix = C.d.ix;
  C.rows.forEach(function(x){
    var o = v65Obj_(x, ix);
    if (o.sid === sid && o.source === 'إضافة') add(o.eid, 'أضافته المدرسة', '');
    if (o.sid !== sid && o.toSid === sid && V65_INCOMING_SUGGEST[o.code]) { add(o.eid, 'قادم إليكم', ''); if (out[o.eid]) out[o.eid].incoming = {from: o.sid, fromName: names[o.sid] || o.sid, code: o.code, label: v65St_(o.code).label, suggest: V65_INCOMING_SUGGEST[o.code], days: o.days, periods: o.periods}; }
  });
  return out;
}

/* ---------- المدرسة ---------- */
function schoolCensusGetV65(token){
  var s = schoolV33Session_(token), sid = String(s.schoolId), round = v65Round_();
  if (!v65Open_() || v65Done_(round)[sid]) return {success: true, active: false, round: round};
  var ros = v65Roster_(sid), C = v65Read_(), ix = C.d.ix, saved = {};
  C.rows.forEach(function(x){ var o = v65Obj_(x, ix); if (o.sid === sid) saved[o.eid] = o; });
  var names = v42SchoolNames_(), T = v42SchoolTypes_();
  var list = Object.keys(ros).map(function(k){ var p = ros[k], sv = saved[k]; p.saved = sv ? {code: sv.code, toSid: sv.toSid, text: sv.text, date: sv.date, notes: sv.notes, days: sv.days, periods: sv.periods} : null; return p; })
    .sort(function(a, b){ return (a.incoming ? 1 : 0) - (b.incoming ? 1 : 0) || a.name.localeCompare(b.name, 'ar'); });
  var dwId = v66DiwanId_();
  return {success: true, active: true, round: round, rows: list, statuses: v65Statuses_().map(function(x){ return {code: x[0], label: x[1], group: x[2], detail: x[3]}; }), groups: V65_GROUP_LABEL,
    leaves: V65_LEAVES, ends: V65_ENDS, schools: Object.keys(names).filter(function(k){ return k !== sid && /تشغيلي|التعليم المجتمعي/.test((T[k] || {}).cls || '') || /ديوان/.test(names[k] || ''); }).map(function(k){ return {id: k, name: names[k]}; }).sort(function(a, b){ return (b.id === dwId) - (a.id === dwId) || a.name.localeCompare(b.name, 'ar'); }).map(function(x){ if (x.id === dwId) x.name = 'ديوان الإدارة'; return x; })};
}
/** إضافة موظف موجود في القاعدة (بالرقم القومي) إلى حصر المدرسة. */
function schoolCensusAddV65(token, nid){
  var s = schoolV33Session_(token), sid = String(s.schoolId); nid = v24DigitsLocalV31_(nid);
  if (v65Done_()[sid]) throw new Error('تم اعتماد الحصر بالفعل.');
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), row = null;
  emp.rows.forEach(function(r){ if (!row && v24DigitsLocalV31_(schoolV31Val_(r, ei, 'الرقم_القومي')) === nid) row = r; });
  if (!row) return {success: true, found: false, message: 'الرقم القومي غير موجود في القاعدة — أضفه من «➕ إضافة موظف (بالرقم القومي)» في شئون العاملين بعد اعتماد الحصر.'};
  var eid = schoolV31Val_(row, ei, 'employeeId'), names = v42SchoolNames_();
  if (v65Roster_(sid)[eid]) return {success: true, found: true, exists: true, message: 'موجود بالفعل في قائمتك.'};
  return v35Lock_(function(){
    v50Fresh_(); var sh = v65Sheet_(), h = v36Headers_(sh), ix = schoolV31Idx_(h), rec = new Array(h.length).fill('');
    function p(k, v){ if (ix[k] != null) rec[ix[k]] = v; }
    p('censusId', 'CEN_' + Utilities.getUuid().replace(/-/g, '').slice(0, 14).toUpperCase()); p('الدورة', v65Round_()); p('schoolId', sid); p('employeeId', eid); p('الاسم', schoolV31Val_(row, ei, 'الاسم')); p('الرقم_القومي', nid); p('المسمى', schoolV31Val_(row, ei, 'المسمى_الوظيفي'));
    p('حالة_التطبيق', 'مسودة'); p('المصدر', 'إضافة'); p('المستخدم', s.username || ''); p('وقت_الحفظ', new Date());
    v36AppendRows_(sh, [rec]);
    return {success: true, found: true, message: 'أُضيف «' + schoolV31Val_(row, ei, 'الاسم') + '» (مدرسته المسجلة: ' + (names[schoolV31Val_(row, ei, 'originalSchoolId')] || 'غير محددة') + ') — حدّد حالته.'};
  });
}
function v65Validate_(it, sid, schoolsOk){
  var st = v65St_(it.code); if (!st) return 'حالة غير صالحة';
  if (st.detail === 'school') { if (!it.toSid || !schoolsOk[it.toSid]) return 'اختر المدرسة'; if (String(it.toSid) === String(sid)) return 'لا يجوز اختيار مدرستك'; }
  if (st.detail === 'text' && !String(it.text || '').trim()) return 'اكتب اسم الجهة (الإدارة/المديرية/المحافظة)';
  if (st.detail === 'textpart' && !String(it.text || '').trim()) return 'اكتب اسم الجهة خارج الإدارة';
  if ((st.detail === 'leave' || st.detail === 'end') && !String(it.text || '').trim()) return 'اختر النوع';
  if (V68_PART_CODES[it.code]) { try { v68Nums_(it.days, it.periods, true); } catch (e) { return e.message; } }   // V6.8
  return '';
}
function schoolCensusSaveV65(token, items, final){
  var s = schoolV33Session_(token), sid = String(s.schoolId), round = v65Round_();
  if (!v65Open_()) throw new Error('الحصر غير مفتوح حاليًا.');
  if (v65Done_(round)[sid]) throw new Error('تم اعتماد الحصر بالفعل لهذه الدورة.');
  var ros = v65Roster_(sid), names = v42SchoolNames_(), ok = {}; Object.keys(names).forEach(function(k){ ok[k] = 1; });
  var map = {}, errs = [];
  (items || []).forEach(function(it){ if (!ros[it.eid] || !it.code) return; var e = v65Validate_(it, sid, ok); if (e) errs.push(ros[it.eid].name + ': ' + e); else map[it.eid] = it; });
  if (errs.length) throw new Error('راجع:\n' + errs.slice(0, 10).join('\n') + (errs.length > 10 ? '\n…' : ''));
  if (final) { var miss = Object.keys(ros).filter(function(k){ return !map[k]; }); if (miss.length) throw new Error('لا يمكن الاعتماد: لم تُحدَّد حالة ' + miss.length + ' عامل:\n' + miss.slice(0, 10).map(function(k){ return ros[k].name; }).join('، ')); }
  return v35Lock_(function(){
    v50Fresh_(); var sh = v65Sheet_(); schoolEnsureWorkerColumnV40_(sh, 'أيام_الندب'); schoolEnsureWorkerColumnV40_(sh, 'حصص_الندب');   // V6.8
    var h = v36Headers_(sh), ix = schoolV31Idx_(h), n = sh.getLastRow() - 1, v = n > 0 ? sh.getRange(2, 1, n, h.length).getValues() : [], pos = {}, now = new Date(), add = [];
    v.forEach(function(r, i){ if (String(r[ix['الدورة']]) === round && String(r[ix.schoolId]) === sid) pos[String(r[ix.employeeId])] = i; });
    Object.keys(map).forEach(function(eid){
      var it = map[eid], st = v65St_(it.code), p = ros[eid], i = pos[eid], rec = i != null ? v[i] : new Array(h.length).fill('');
      function put(k, val){ if (ix[k] != null) rec[ix[k]] = val; }
      if (i == null) { put('censusId', 'CEN_' + Utilities.getUuid().replace(/-/g, '').slice(0, 14).toUpperCase()); put('الدورة', round); put('schoolId', sid); put('employeeId', eid); put('المصدر', p.incoming ? 'قادم' : 'القائمة'); }
      put('الاسم', p.name); put('الرقم_القومي', p.nid); put('المسمى', p.job); put('الحالة_في_الحصر', it.code); put('وصف_الحالة', st.label);
      put('الجهة_schoolId', st.detail === 'school' ? it.toSid : ''); put('الجهة_نص', st.detail === 'school' ? (names[it.toSid] || '') : String(it.text || '').trim());
      put('التاريخ', v35Date_(it.date) || ''); put('ملاحظات', schoolV31Clean_(it.notes)); put('حالة_التطبيق', final ? 'معتمد' : 'مسودة'); var nm68 = V68_PART_CODES[it.code] ? v68Nums_(it.days, it.periods, true) : null; put('أيام_الندب', nm68 ? nm68.d : ''); put('حصص_الندب', nm68 ? nm68.p : ''); put('المستخدم', s.username || ''); put('وقت_الحفظ', now);
      if (i == null) add.push(rec);
    });
    if (n > 0) v50A_(sh.getRange(2, 1, n, h.length).setValues(v));
    v36AppendRows_(sh, add);
    v50Invalidate_(V65_SHEET);
    if (!final) return {success: true, message: 'تم الحفظ المؤقت: ' + Object.keys(map).length + ' من ' + Object.keys(ros).length + '.'};
    v65SetDone_(sid, {at: v40Today_(), user: s.username || '', n: Object.keys(map).length});
    schoolV31Log_(s, 'اعتماد حصر العاملين', sid + '|' + round, [['عدد', '', String(Object.keys(map).length)]]);
    var res = v65Apply_(s);
    return {success: true, message: 'تم اعتماد الحصر (' + Object.keys(map).length + ' عامل). طُبِّق: ' + res.applied + (res.waiting ? ' · بانتظار المدرسة الأخرى: ' + res.waiting : '') + (res.conflict ? ' · للإدارة: ' + res.conflict : '') + '.'};
  });
}

/* ---------- التطبيق والمطابقة ---------- */
function v65EmpSet_(eid, map){ try { v36SetCells_(v36EmployeeRow_(eid), map); } catch (e) {} }
function v65RelSet_(eid, sid, fn){
  var sh = v36Sheet_('04_علاقات_المدارس'), h = v36Headers_(sh), ix = schoolV31Idx_(h), n = sh.getLastRow() - 1; if (n < 1) return 0;
  var v = sh.getRange(2, 1, n, h.length).getValues(), c = 0;
  v.forEach(function(r, i){ if (String(r[ix.employeeId]) !== String(eid) || String(r[ix.schoolId]) !== String(sid)) return; if (fn(r, ix)) { v50A_(sh.getRange(i + 2, 1, 1, h.length).setValues([r])); c++; } });
  return c;
}
function v65HasRel_(eid, sid, type){
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers);
  return rel.rows.some(function(r){ return schoolV31Val_(r, ri, 'employeeId') === String(eid) && schoolV31Val_(r, ri, 'schoolId') === String(sid) && v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة')) && (!type || schoolV31Val_(r, ri, 'نوع_العلاقة') === type); });
}
function v65Activate_(eid, sid){ return v65RelSet_(eid, sid, function(r, ix){ var st = String(r[ix['الحالة']] || ''); if (v36ActiveRel_(st) || !/^منتدب كليًا لجهة أخرى|^إجازة|^معلقة|^معار/.test(st)) return false; r[ix['الحالة']] = 'نشطة'; return true; }); }
function v65SetRelStatus_(eid, sid, status, note){ return v65RelSet_(eid, sid, function(r, ix){ if (!v36ActiveRel_(r[ix['الحالة']])) return false; r[ix['الحالة']] = status; if (note && ix['ملاحظات'] != null) r[ix['ملاحظات']] = String(r[ix['ملاحظات']] || '') + ' | ' + note; return true; }); }
function v65ApplySingle_(o, names){
  var here = o.sid, nm = names[here] || here, d = o.date || v40Today_();
  switch (o.code) {
    case 'ORIG':
      v65Activate_(o.eid, here);
      if (!v65HasRel_(o.eid, here, 'أصلي') && !v65HasRel_(o.eid, here)) v36AddRelation_(o.eid, here, 'أصلي', 'حصر العاملين', 'حصر ' + v65Round_());
      v65EmpSet_(o.eid, {originalSchoolId: here, 'قائم_بالعمل': 'نعم', 'سبب_عدم_القيام': ''}); return true;
    case 'IN_FULL_OUT':
      v65Activate_(o.eid, here);
      if (!v65HasRel_(o.eid, here)) v36AddRelation_(o.eid, here, 'منتدب إلينا كلي', 'حصر العاملين', 'منتدب من خارج الإدارة: ' + o.text);
      v65EmpSet_(o.eid, {'قائم_بالعمل': 'نعم'}); return true;
    case 'OUT_PART_OUT':
      v65Activate_(o.eid, here);
      if (!v65HasRel_(o.eid, here, 'أصلي') && !v65HasRel_(o.eid, here)) v36AddRelation_(o.eid, here, 'أصلي', 'حصر العاملين', 'أصلي ومنتدب جزئيًا خارج الإدارة: ' + o.text);
      v65EmpSet_(o.eid, {originalSchoolId: here, 'قائم_بالعمل': 'نعم'});
      return true;
    case 'OUT_FULL_OUT': v65SetRelStatus_(o.eid, here, 'منتدب كليًا لجهة أخرى', 'منتدب كليًا خارج الإدارة: ' + o.text); v65EmpSet_(o.eid, {'قائم_بالعمل': 'لا', 'سبب_عدم_القيام': 'منتدب كليًا خارج الإدارة: ' + o.text}); return true;
    case 'LEAVE': v65SetRelStatus_(o.eid, here, 'إجازة', 'إجازة ' + o.text); v65EmpSet_(o.eid, {'قائم_بالعمل': 'لا', 'سبب_عدم_القيام': 'إجازة ' + o.text}); return true;
    case 'TR_OUT': case 'PENSION': case 'DEATH': case 'END':
      var why = o.code === 'TR_OUT' ? 'نقل خارج الإدارة: ' + o.text : (o.code === 'PENSION' ? 'معاش' : (o.code === 'DEATH' ? 'وفاة' : 'إنهاء خدمة: ' + o.text));
      v36CloseRelations_(o.eid, '', why + ' (حصر ' + nm + ')');
      v65EmpSet_(o.eid, {'حالة_السجل': 'غير قائم', 'الحالة_الوظيفية': 'غير قائم', 'قائم_بالعمل': 'لا', 'تاريخ_إنهاء_الخدمة': d, 'سبب_إنهاء_الخدمة': why}); return true;
    case 'LOAN': v65SetRelStatus_(o.eid, here, 'معار', 'إعارة: ' + o.text); v65EmpSet_(o.eid, {'قائم_بالعمل': 'لا', 'سبب_عدم_القيام': 'إعارة: ' + o.text}); return true;   // V7.58
    case 'ABSENT': case 'SUSP':   // V7.58: يبقى في كشف مدرسته وغير قائم بالعمل
      v65Activate_(o.eid, here);
      if (!v65HasRel_(o.eid, here)) v36AddRelation_(o.eid, here, 'أصلي', 'حصر العاملين', 'حصر ' + v65Round_());
      v65EmpSet_(o.eid, {'قائم_بالعمل': 'لا', 'سبب_عدم_القيام': (o.code === 'ABSENT' ? 'منقطع عن العمل' : 'موقوف عن العمل') + (o.notes ? ' — ' + o.notes : '')}); return true;
    case 'UNKNOWN': v65SetRelStatus_(o.eid, here, 'معلقة — غير معروف للمدرسة', 'حصر ' + v65Round_()); return 'admin';
  }
  return null;
}
/** يطبق المزدوج عند اتفاق الطرفين: X (الأصل) و Y (المستقبِلة). */
function v65ApplyPair_(kind, eid, X, Y, names, nums){
  if (kind === 'full') { v36CloseRelations_(eid, X, 'ندب كلي إلى ' + (names[Y] || Y) + ' (حصر)'); v65Activate_(eid, Y); if (!v65HasRel_(eid, Y)) v36AddRelation_(eid, Y, 'منتدب إلينا كلي', 'حصر العاملين', 'ندب من ' + (names[X] || X)); v65EmpSet_(eid, {originalSchoolId: X, 'قائم_بالعمل': 'نعم'}); }
  if (kind === 'part') { v65Activate_(eid, Y); if (!v65HasRel_(eid, Y)) v36AddRelation_(eid, Y, 'منتدب إلينا جزئي', 'حصر العاملين', 'ندب جزئي من ' + (names[X] || X)); v50Invalidate_('04_علاقات_المدارس'); if (nums) { var nn = null; try { nn = v68Nums_(nums.days, nums.periods, false); } catch (e) {} if (nn) v68SetOnRel_(eid, Y, nn); } }
  if (kind === 'transfer') { v36CloseRelations_(eid, X, 'نقل إلى ' + (names[Y] || Y) + ' (حصر)'); v65Activate_(eid, Y); if (!v65HasRel_(eid, Y, 'أصلي')) v36AddRelation_(eid, Y, 'أصلي', 'حصر العاملين', 'نقل من ' + (names[X] || X)); v65EmpSet_(eid, {originalSchoolId: Y, 'قائم_بالعمل': 'نعم'}); }
}
/** يمر على كل إقرارات الدورة المعتمدة غير المطبقة ويطبق ما اكتمل. */
function v65Apply_(actor){
  var C = v65Read_(), ix = C.d.ix, sh = C.d.sh, names = v42SchoolNames_(), done = v65Done_(), all = C.rows.map(function(x){ return v65Obj_(x, ix); });
  var byEmp = {}; all.forEach(function(o){ (byEmp[o.eid] = byEmp[o.eid] || []).push(o); });
  var origOf = {}; (function(){ var e = v24Data_('01_الأساسي'), ei = schoolV31Idx_(e.headers); e.rows.forEach(function(r){ origOf[schoolV31Val_(r, ei, 'employeeId')] = schoolV31Val_(r, ei, 'originalSchoolId'); }); })();
  var dw66 = v66DiwanId_(), res = {applied: 0, waiting: 0, conflict: 0}, setState = function(o, st){ if (o.state === st) return; v50A_(sh.getRange(o.n, ix['حالة_التطبيق'] + 1).setValue(st)); o.state = st; };
  all.forEach(function(o){
    if (!done[o.sid] || !/^معتمد|^بانتظار/.test(o.state)) return;
    if (o.code === 'ORIG' && origOf[o.eid] && origOf[o.eid] !== o.sid && !V65_PAIR_HAS_REL_(o)) {   // مدرسته المسجلة أخرى: نحتاج «نقل» منها
      var X = origOf[o.eid], xm = (byEmp[o.eid] || []).filter(function(z){ return z.sid === X; })[0];
      if (dw66 && String(X) === String(dw66)) { v65ApplyPair_('transfer', o.eid, X, o.sid, names); setState(o, 'مطبق'); res.applied++; return; }   // من الديوان
      if (xm && xm.code === 'TR_IN' && String(xm.toSid) === String(o.sid)) { if (!done[X]) { setState(o, 'بانتظار المدرسة الأخرى'); res.waiting++; } return; }   // يكتمل من صف المدرسة الأخرى
      if (!done[X]) { setState(o, 'بانتظار المدرسة الأخرى'); res.waiting++; return; }
      setState(o, 'تعارض — مدرسته المسجلة (' + (names[X] || X) + '): ' + (xm ? v65St_(xm.code).label : 'لم تذكره')); res.conflict++; return;
    }
    var pair = V65_PAIR[o.code];
    if (!pair) { var r = v65ApplySingle_(o, names); if (r === 'admin') { setState(o, 'للإدارة — غير معروف'); res.conflict++; } else { setState(o, 'مطبق'); res.applied++; } return; }
    var other = o.toSid, mate = (byEmp[o.eid] || []).filter(function(z){ return z.sid === other; })[0];
    if (dw66 && String(other) === String(dw66)) {   // V6.6: الطرف الآخر ديوان الإدارة — يُطبَّق مباشرة
      if (o.code === 'OUT_FULL_IN') v65ApplyPair_('full', o.eid, o.sid, other, names);
      else if (o.code === 'OUT_PART') v65ApplyPair_('part', o.eid, o.sid, other, names, o);
      else if (o.code === 'TR_IN') v65ApplyPair_('transfer', o.eid, o.sid, other, names);
      else if (o.code === 'IN_FULL_IN') v65ApplyPair_('full', o.eid, other, o.sid, names);
      else if (o.code === 'IN_PART') v65ApplyPair_('part', o.eid, other, o.sid, names, o);
      setState(o, 'مطبق'); res.applied++; return;
    }
    if (!done[other]) { setState(o, 'بانتظار المدرسة الأخرى'); res.waiting++; return; }
    var okMate = mate && mate.code === pair && (pair === 'ORIG' || String(mate.toSid) === String(o.sid));
    if (!okMate) { setState(o, 'تعارض — المدرسة الأخرى: ' + (mate ? v65St_(mate.code).label : 'لم تذكره')); res.conflict++; return; }
    if (o.code === 'OUT_FULL_IN' || o.code === 'OUT_PART' || o.code === 'TR_IN') {
      v65ApplyPair_(o.code === 'OUT_FULL_IN' ? 'full' : (o.code === 'OUT_PART' ? 'part' : 'transfer'), o.eid, o.sid, other, names, (o.periods ? o : mate));
      if (o.code === 'OUT_PART') v65EmpSet_(o.eid, {'قائم_بالعمل': 'نعم'});
      setState(o, 'مطبق'); setState(mate, 'مطبق'); res.applied++;
    } else { if (mate.state === 'مطبق') { setState(o, 'مطبق'); res.applied++; } }
  });
  // «أصلي» المقابل لنقل: يُطبَّق ضمن الزوج أعلاه؛ ولو أعلنت مدرسة «أصلي» لشخص مدرسته المسجلة غيرها ولم تذكره الأخرى، يُترك للإدارة.
  v50Invalidate_(V65_SHEET); v50Invalidate_('04_علاقات_المدارس'); v50Invalidate_('01_الأساسي');
  return res;
}

function V65_PAIR_HAS_REL_(o){ return v65HasRel_(o.eid, o.sid, 'أصلي'); }   // له علاقة «أصلي» نشطة هنا بالفعل
/* ---------- الإدارة ---------- */
function adminCensusV65(token){
  v35Admin_(token); var round = v65Round_(), done = v65Done_(round), names = v42SchoolNames_(), T = v42SchoolTypes_();
  var C = v65Read_(), ix = C.d.ix, all = C.rows.map(function(x){ return v65Obj_(x, ix); }), by = {}, codes = {}, issues = [], external = [];
  var openMoves = v40ReqList_(function(x){ return x['الحالة'] === 'مفتوح' && ['نقل','ندب كلي','ندب جزئي'].indexOf(String(x['نوع_الطلب']||'')) >= 0; });
  function pendingMoveFor_(o){
    for (var mi=0;mi<openMoves.length;mi++){ var mv=openMoves[mi], mf=String(mv.fromSchoolId||''), mt=String(mv.toSchoolId||'');
      var match = (o.code === 'IN_FULL_IN' && String(mv.employeeId)===String(o.eid) && mf===String(o.sid) && mt===String(o.toSid) && mv['نوع_الطلب']==='ندب كلي') ||
                  (o.code === 'IN_PART' && String(mv.employeeId)===String(o.eid) && mf===String(o.sid) && mt===String(o.toSid) && mv['نوع_الطلب']==='ندب جزئي') ||
                  (o.code === 'OUT_FULL_IN' && String(mv.employeeId)===String(o.eid) && mf===String(o.toSid) && mt===String(o.sid) && mv['نوع_الطلب']==='ندب كلي') ||
                  (o.code === 'OUT_PART' && String(mv.employeeId)===String(o.eid) && mf===String(o.toSid) && mt===String(o.sid) && mv['نوع_الطلب']==='ندب جزئي');
      if(match) return mv;
    } return null;
  }
  all.forEach(function(o){
    var s = by[o.sid] = by[o.sid] || {saved: 0, groups: {}};
    s.saved++; var st = v65St_(o.code); if (st) { s.groups[st.group] = (s.groups[st.group] || 0) + 1; if (done[o.sid]) codes[o.code] = (codes[o.code] || 0) + 1; }
    var pm = pendingMoveFor_(o);
    if (pm) issues.push({id: o.id, school: names[o.sid] || o.sid, name: o.name, nid: o.nid, status: st ? st.label : o.code, other: o.text || names[o.toSid] || '', state: 'بانتظار قرار المدرسة الأصلية — طلب حركة مفتوح', moveRequestId: pm.requestId || '', moveType: pm['نوع_الطلب'] || '', pendingMove: true});
    else if (/^تعارض|^للإدارة|^بانتظار/.test(o.state)) issues.push({id: o.id, school: names[o.sid] || o.sid, name: o.name, nid: o.nid, status: st ? st.label : o.code, other: o.text || names[o.toSid] || '', state: o.state, pendingMove: false});
    if (done[o.sid] && /OUT$|^IN_FULL_OUT$|^TR_OUT$/.test(o.code)) external.push({school: names[o.sid] || o.sid, name: o.name, nid: o.nid, status: st.label, place: o.text, date: o.date});
  });
  var schools = Object.keys(names).filter(function(k){ return /تشغيلي/.test((T[k] || {}).cls || '') && !/ديوان|مجهول/.test(names[k] || ''); }).map(function(k){
    var s = by[k] || {saved: 0, groups: {}}, d = done[k];
    return {sid: k, name: names[k], state: d ? 'معتمد' : (s.saved ? 'مسودة' : 'لم يبدأ'), at: d ? d.at : '', n: d ? d.n : s.saved, groups: s.groups};
  }).sort(function(a, b){ var o = {'لم يبدأ': 0, 'مسودة': 1, 'معتمد': 2}; return o[a.state] - o[b.state] || a.name.localeCompare(b.name, 'ar'); });
  return {success: true, round: round, open: v65Open_(), schools: schools, codes: v65Statuses_().map(function(x){ return {code: x[0], label: x[1], group: x[2], n: codes[x[0]] || 0}; }), groups: V65_GROUP_LABEL,
    issues: issues, external: external, totals: {schools: schools.length, done: schools.filter(function(s){ return s.state === 'معتمد'; }).length, draft: schools.filter(function(s){ return s.state === 'مسودة'; }).length}};
}
function adminCensusSettingsV65(token, open, round){
  var a = v35Admin_(token); round = String(round || '').trim();
  if (round) v36SetSetting_('CENSUS_ROUND', round, 'حصر العاملين: الدورة الحالية');
  v36SetSetting_('CENSUS_OPEN', open ? 'نعم' : 'لا', 'حصر العاملين: مفتوح للمدارس؟');
  try { V56_SET_MEMO_ = null; } catch (e) {}
  schoolV31Log_(v36Actor_(a), 'إعدادات حصر العاملين', round || v65Round_(), [['مفتوح', '', open ? 'نعم' : 'لا']]);
  return {success: true, message: 'تم الحفظ.'};
}
function adminCensusReopenV65(token, sid){
  var a = v35Admin_(token);
  return v35Lock_(function(){ v50Fresh_(); v65SetDone_(String(sid), null); schoolV31Log_(v36Actor_(a), 'إعادة فتح حصر العاملين لمدرسة', String(sid), []); return {success: true, message: 'أُعيد فتح الحصر لهذه المدرسة.'}; });
}
/** حسم الإدارة: apply = تطبيق إقرار هذه المدرسة كما هو؛ close = إنهاء علاقته بهذه المدرسة؛ keep = إعادة العلاقة نشطة. */
function adminCensusResolveV65(token, id, action){
  var a = v35Admin_(token);
  return v35Lock_(function(){
    v50Fresh_(); var C = v65Read_(), ix = C.d.ix, o = null, names = v42SchoolNames_();
    C.rows.forEach(function(x){ var z = v65Obj_(x, ix); if (z.id === id) o = z; });
    if (!o) throw new Error('السجل غير موجود.');
    if (action === 'apply') {
      if (o.code === 'OUT_FULL_IN') v65ApplyPair_('full', o.eid, o.sid, o.toSid, names);
      else if (o.code === 'OUT_PART') v65ApplyPair_('part', o.eid, o.sid, o.toSid, names, o);
      else if (o.code === 'TR_IN') v65ApplyPair_('transfer', o.eid, o.sid, o.toSid, names);
      else if (o.code === 'IN_FULL_IN') v65ApplyPair_('full', o.eid, o.toSid, o.sid, names);
      else if (o.code === 'IN_PART') v65ApplyPair_('part', o.eid, o.toSid, o.sid, names, o);
      else v65ApplySingle_(o, names);
    } else if (action === 'close') { v36CloseRelations_(o.eid, o.sid, 'إنهاء بقرار الإدارة بعد الحصر'); v65RelSet_(o.eid, o.sid, function(r, ix2){ if (/^معلقة/.test(String(r[ix2['الحالة']] || ''))) { r[ix2['الحالة']] = 'غير نشطة'; return true; } return false; }); }
    else if (action === 'keep') { v65Activate_(o.eid, o.sid); }
    else throw new Error('إجراء غير معروف.');
    v50A_(C.d.sh.getRange(o.n, ix['حالة_التطبيق'] + 1).setValue('محسوم بالإدارة (' + ({apply: 'تطبيق الإقرار', close: 'إنهاء العلاقة', keep: 'إبقاء نشطة'})[action] + ')'));
    schoolV31Log_(v36Actor_(a), 'حسم حالة حصر', o.eid, [['الإجراء', '', action], ['المدرسة', '', names[o.sid] || o.sid]]);
    v50Invalidate_(); return {success: true, message: 'تم.'};
  });
}
/** للمدرسة: هل عليها حصر لم يُعتمد؟ */
function schoolCensusStatusV65(token){ var s = schoolV33Session_(token); return {success: true, pending: v65Open_() && !v65Done_()[String(s.schoolId)], round: v65Round_()}; }
