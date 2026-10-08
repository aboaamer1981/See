/**
 * V7.47 — جدول الحصص الأسبوعي (كام حصة كل يوم) + أيام الغياب بالتاريخ — لاستكمال الاستمارات الرسمية.
 * ورقتان جديدتان تُنشآن تلقائيًا عند أول حفظ (لا تُعدَّل أي ورقة قائمة):
 *   25_الجدول_الأسبوعي : personKey (E:employeeId | H:hrpId) + schoolId + الأحد..الخميس — ثابت طوال العام ويُعدَّل وقت الحاجة.
 *   26_أيام_الغياب     : personKey + schoolId + السنة + الشهر + التواريخ (JSON {تاريخ: نوع}) + أعداد كل نوع.
 * أعداد الغياب في شاشة الشهر تُملأ من التقويم في المتصفح، والحفظ الشهري المعتاد هو الذي يسجلها (لا يُلمس منطق الحفظ القديم).
 */
var V96_TT = '25_الجدول_الأسبوعي', V96_AB = '26_أيام_الغياب';
var V96_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'], V96_TYPES = ['عارضة', 'اعتيادي', 'مرضي', 'مأمورية'];
var V96_TT_H = ['personKey', 'schoolId'].concat(V96_DAYS).concat(['المجموع', 'المستخدم', 'وقت_الحفظ', 'أيام_الندب', 'حصص_فوق_النصاب']);   // V7.61: حصص_فوق_النصاب = {يوم: عدد} (الجدول الثاني)   // V7.49: أيام_الندب = {يوم: schoolId}
var V96_AB_H = ['personKey', 'schoolId', 'السنة', 'الشهر', 'التواريخ'].concat(V96_TYPES).concat(['المستخدم', 'وقت_الحفظ']);

function v96Key_(kind, id){ return (kind === 'H' ? 'H:' : 'E:') + String(id); }
function v96Sheet_(name, h){
  var ss = personnelSS_(), sh = ss.getSheetByName(name);
  if (!sh) { sh = v50A_(ss.insertSheet(name)); v50A_(sh.getRange(1, 1, 1, h.length).setValues([h])); v50Invalidate_(name); }
  return sh;
}
function v96Has_(name){ return !!personnelSS_().getSheetByName(name); }
/** أيام الشهر الدراسية (الأحد..الخميس) للغياب: من يوم 1 حتى نهاية الشهر. */
function v96MonthDays_(y, m){
  var hol = {}; v56Holidays_().forEach(function(x){ hol[x[0]] = x[1]; });
  var n = new Date(y, m, 0).getDate(), out = [];
  for (var d = 1; d <= n; d++) {
    var dw = new Date(y, m - 1, d).getDay(), k = y + '-' + v56Pad_(m) + '-' + v56Pad_(d);
    if (V56_WEEKEND.indexOf(dw) >= 0) continue;
    out.push({date: k, day: d, dow: dw, holiday: hol[k] || ''});
  }
  return out;
}
/** أيام الحصص فقط: تبدأ من بداية الدراسة داخل الشهر (مثلاً 13 سبتمبر). */
function v96PeriodDays_(y, m){
  var hol = {}; v56Holidays_().forEach(function(x){ hol[x[0]] = x[1]; });
  var n = new Date(y, m, 0).getDate(), out = [], sd = v97StartDay_(y, m);
  for (var d = sd; d <= n; d++) {
    var dw = new Date(y, m - 1, d).getDay(), k = y + '-' + v56Pad_(m) + '-' + v56Pad_(d);
    if (V56_WEEKEND.indexOf(dw) >= 0) continue;
    out.push({date: k, day: d, dow: dw, holiday: hol[k] || ''});
  }
  return out;
}
function v96Belongs_(kind, id, sid){
  if (kind === 'H') { var r = v56Read_(V40_HRP_REL_SHEET), ix = r.ix; return r.vals.some(function(x){ return String(x[ix.hrpId]) === String(id) && String(x[ix.schoolId]) === String(sid) && v36ActiveRel_(x[ix['الحالة']]); }); }
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers);
  return rel.rows.some(function(r){ return String(schoolV31Val_(r, ri, 'employeeId')) === String(id) && String(schoolV31Val_(r, ri, 'schoolId')) === String(sid) && v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة')); });
}
function v96ParseDates_(s){ try { var o = JSON.parse(String(s || '') || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { console.error('v96ParseDates_: ' + e.message); return {}; } }
/** خرائط الجدول وأيام الغياب لشهر: tt[key|sid], tt[key] (أي مدرسة) و ab بنفس الشكل. */
function v96Maps_(y, m){
  var tt = {}, ab = {}, ot = {};
  if (v96Has_(V96_TT)) { var t = v56Read_(V96_TT), ix = t.ix; t.vals.forEach(function(r){ var o = {}; V96_DAYS.forEach(function(d){ o[d] = Number(r[ix[d]]) || 0; }); var k = String(r[ix.personKey]); tt[k + '|' + r[ix.schoolId]] = o; if (!tt[k]) tt[k] = o;
    var w = v96Ot_(ix['حصص_فوق_النصاب'] != null ? r[ix['حصص_فوق_النصاب']] : ''); if (w) { ot[k + '|' + r[ix.schoolId]] = w; if (!ot[k]) ot[k] = w; } }); }
  if (v96Has_(V96_AB)) { var a = v56Read_(V96_AB), ax = a.ix; a.vals.forEach(function(r){ if (Number(r[ax['السنة']]) !== Number(y) || Number(r[ax['الشهر']]) !== Number(m)) return; var o = v96ParseDates_(r[ax['التواريخ']]), k = String(r[ax.personKey]); ab[k + '|' + r[ax.schoolId]] = o; if (!ab[k]) ab[k] = o; }); }
  return {tt: tt, ab: ab, ot: ot};
}
/** رسالة القفل لأيام الغياب (الشهر مغلق أو البيانات مرسلة/معتمدة)، أو '' لو مسموح. */
function v96AbsLock_(kind, id, sid, y, m){
  var e = v56Find_(y, m); if (!e || e.status !== 'مفتوح') return 'الشهر غير مفتوح للإدخال — أيام الغياب للاطلاع فقط.';
  var rd = kind === 'H' ? v40HrpMonthlyRead_() : v36MonthlyRead_(), ix = rd.ix, idk = kind === 'H' ? 'hrpId' : 'employeeId', msg = '';
  rd.vals.forEach(function(r){
    if (String(r[ix[idk]]) !== String(id) || String(r[ix.schoolId]) !== String(sid) || Number(r[ix['السنة']]) !== Number(y) || Number(r[ix['الشهر']]) !== Number(m)) return;
    if ((ix['حالة_الاعتماد'] != null && r[ix['حالة_الاعتماد']] === 'معتمد') || r[ix['حالة_الإدخال']] === 'مرسل') msg = 'بيانات هذا الشهر مرسلة/معتمدة — اطلب فتحها للتعديل أولًا.';
  });
  return msg;
}
/** فحص هل كشف المدرسة أو المعلم معتمد ماليًا لهذا الشهر. */
function v96IsSchoolApproved_(kind, id, sid, y, m){
  var shName = kind === 'H' ? V40_HRP_FIN_SHEET : '08_الماليات';
  if (!v96Has_(shName)) return false;
  var d = v56Read_(shName), ix = d.ix, idk = kind === 'H' ? 'hrpId' : 'employeeId';
  return d.vals.some(function(r){
    if (Number(r[ix['السنة']]) !== Number(y) || Number(r[ix['الشهر']]) !== Number(m)) return false;
    if (r[ix['حالة_الاعتماد']] !== 'معتمد') return false;
    if (String(r[ix.schoolId]) === String(sid)) return true;
    if (id && String(r[ix[idk]]) === String(id)) return true;
    return false;
  });
}
/** المدرسة: جدول المعلم وأيام غيابه في الشهر. kind: 'E' عامل أساسي | 'H' معلم حصة/معاش. */
function schoolDayPlanV96(token, kind, id, year, month){
  var s = schoolV31Session_(token), mo = v36ResolveMonth_(year, month); kind = kind === 'H' ? 'H' : 'E';
  if (!v96Belongs_(kind, id, s.schoolId)) throw new Error('هذا الشخص ليس على قوة مدرستك.');
  var mp = v96Maps_(mo.year, mo.month), k = v96Key_(kind, id), sid = String(s.schoolId);
  return {success: true, month: mo, days: v96MonthDays_(mo.year, mo.month), periodDays: v96PeriodDays_(mo.year, mo.month), timetable: mp.tt[k + '|' + sid] || null, absences: mp.ab[k + '|' + sid] || {}, absLock: v96AbsLock_(kind, id, sid, mo.year, mo.month)};
}
/** حفظ الجدول وأيام الغياب (لو الشهر غير معتمد ماليًا). absences = null لعدم تغيير الغياب. */
function schoolSaveDayPlanV96(token, kind, id, year, month, timetable, absences, ndb, overTt){
  var s = schoolV31Session_(token), mo = v36ResolveMonth_(year, month), sid = String(s.schoolId); kind = kind === 'H' ? 'H' : 'E';
  if (!v96Belongs_(kind, id, sid)) throw new Error('هذا الشخص ليس على قوة مدرستك.');
  var R = v97Role_(kind, id, sid);   // V7.49: الأصلية تحدد أيام الندب، ومدرسة الندب تدخل أيامها فقط
  var nd = {}, mine = {};
  if (R.role === 'host') { R.hostDays.forEach(function(d){ mine[d] = 1; }); }
  else {
    var okHost = {}; R.hosts.forEach(function(h){ okHost[h.sid] = 1; });
    Object.keys(ndb || {}).forEach(function(d){ var h = String(ndb[d] || ''); if (!h) return; if (V96_DAYS.indexOf(d) < 0) throw new Error('يوم غير صحيح: ' + d); if (!okHost[h]) throw new Error('المدرسة المختارة ليوم ' + d + ' ليست مدرسة ندب لهذا المعلم.'); nd[d] = h; });
    V96_DAYS.forEach(function(d){ if (!nd[d]) mine[d] = 1; });
  }
  var tt = {}, sum = 0;
  V96_DAYS.forEach(function(d){ var v = mine[d] ? (Number(String((timetable || {})[d] == null ? '' : timetable[d]).replace(/[^\d]/g, '')) || 0) : 0; if (v > 9) throw new Error('عدد حصص يوم ' + d + ' لا يزيد عن 9.'); tt[d] = v; sum += v; });
  if (timetable !== null) {
    if (v96IsSchoolApproved_(kind, id, sid, mo.year, mo.month)) throw new Error('لا يمكن تعديل جدول هذا الشهر بعد اعتماد كشف المدرسة ماليًا.');
  }
  if (kind === 'H' && timetable !== null) v96CheckHrpReq_(id, sid, sum);   // معلم الحصة: مجموع الجدول يساوي المطلوب تمامًا
  var otSave = (timetable !== null && R.role !== 'host' && overTt !== undefined) ? v96CheckOt_(kind, id, sid, tt, nd, overTt) : null;   // V7.61: الجدول الثاني — تحقق نهائي
  var ab = null, cnt = {};
  if (absences) {
    var lock = v96AbsLock_(kind, id, sid, mo.year, mo.month); if (lock) throw new Error(lock);
    var ok = {}; v96MonthDays_(mo.year, mo.month).forEach(function(d){ if (!d.holiday && mine[V96_DAYS[d.dow]]) ok[d.date] = 1; });
    ab = {}; V96_TYPES.forEach(function(t){ cnt[t] = 0; });
    Object.keys(absences).sort().forEach(function(dt){ var t = String(absences[dt] || ''); if (!t) return; if (!ok[dt]) throw new Error('التاريخ ' + dt + ' ليس من أيام الدراسة لهذا المعلم في مدرستك.'); if (V96_TYPES.indexOf(t) < 0) throw new Error('نوع غياب غير صحيح: ' + t); ab[dt] = t; cnt[t]++; });
  }
  var who = s.username || s.school || '', now = new Date(), key = v96Key_(kind, id);
  var result = v35Lock_(function(){
    v50Fresh_();
    if (timetable !== null) v96Upsert_(V96_TT, V96_TT_H, function(r, ix){ return String(r[ix.personKey]) === key && String(r[ix.schoolId]) === sid; },   // null = غياب فقط (لا جدول)
      function(o){ o.personKey = key; o.schoolId = sid; V96_DAYS.forEach(function(d){ o[d] = tt[d]; }); o['المجموع'] = sum; o['المستخدم'] = who; o['وقت_الحفظ'] = now; if (R.role !== 'host') o['أيام_الندب'] = Object.keys(nd).length ? JSON.stringify(nd) : ''; if (otSave) o['حصص_فوق_النصاب'] = otSave.json; });
    if (ab) v96Upsert_(V96_AB, V96_AB_H, function(r, ix){ return String(r[ix.personKey]) === key && String(r[ix.schoolId]) === sid && Number(r[ix['السنة']]) === mo.year && Number(r[ix['الشهر']]) === mo.month; },
      function(o){ o.personKey = key; o.schoolId = sid; o['السنة'] = mo.year; o['الشهر'] = mo.month; o['التواريخ'] = JSON.stringify(ab); V96_TYPES.forEach(function(t){ o[t] = cnt[t]; }); o['المستخدم'] = who; o['وقت_الحفظ'] = now; });
    schoolV31Log_(who, 'حفظ الجدول الأسبوعي' + (ab ? ' وأيام الغياب' : ''), key + '|' + mo.year + '-' + mo.month, [['الجدول', '', V96_DAYS.map(function(d){ return tt[d]; }).join('/')], ['فوق النصاب', '', otSave ? otSave.json || '—' : 'بدون تغيير'], ['الندب', '', JSON.stringify(nd)], ['الغياب', '', ab ? Object.keys(ab).length + ' يوم' : '—']]);
    return {success: true, message: 'تم الحفظ.', total: sum, counts: cnt, timetable: tt, ndb: nd, absences: ab, overTt: otSave ? otSave.ot : null};
  });
  if (kind === 'H' && (timetable !== null || absences)) { try { v40HrpComputeCore_(s, mo.year, mo.month, true, false); } catch (eCalc) { console.error('v96 schedule finance refresh: ' + eCalc.message); } }
  return result;
}
/** تحديث صف أو إضافته (setValues لصف واحد — لا كتابة خلية خلية). */
function v96Upsert_(name, h, match, fill){
  var sh = v96Sheet_(name, h), rd = v56Read_(name), ix = rd.ix, at = -1;
  for (var i = 0; i < rd.vals.length; i++) if (match(rd.vals[i], ix)) { at = i; break; }
  var hdr = rd.h.length ? rd.h.slice() : h.slice(), o = {};
  var miss = h.filter(function(k){ return hdr.indexOf(k) < 0; });   // V7.49: أعمدة جديدة لورقة قديمة
  if (miss.length) { v50A_(sh.getRange(1, hdr.length + 1, 1, miss.length).setValues([miss])); hdr = hdr.concat(miss); }
  if (at >= 0) hdr.forEach(function(k, j){ o[k] = j < rd.vals[at].length ? rd.vals[at][j] : ''; });
  fill(o);
  var row = hdr.map(function(k){ return o[k] == null ? '' : o[k]; });
  if (at >= 0) v50A_(sh.getRange(at + 2, 1, 1, hdr.length).setValues([row])); else v50A_(sh.appendRow(row));
  v50Invalidate_(name);
}
/** للطباعة: إضافة الجدول وأيام الغياب والإجازات الرسمية لصفوف كشف الاستحقاق (العاملون). */
function v96AttachEmp_(rows, y, m){
  if (!rows || !rows.length) return rows;
  var mp = v96Maps_(y, m), hol = v56Workdays_(y, m).holidays.map(function(x){ return x[0]; });
  try { v107Attach_(rows, 'E'); } catch (e107) { console.error('v96AttachEmp_ lim: ' + e107.message); }
  rows.forEach(function(x){ var k = v96Key_('E', x.employeeId); x.tt = mp.tt[k + '|' + x.schoolId] || mp.tt[k] || null; x.ot = mp.ot[k + '|' + x.schoolId] || mp.ot[k] || null; x.absDates = mp.ab[k + '|' + x.schoolId] || mp.ab[k] || {}; x.hol = hol; });
  try { v108AttachSubTt_(rows, mp); } catch (e108) { console.error('v96AttachEmp_ subTt: ' + e108.message); }   // V7.70
  return rows;
}
/** للطباعة: نفس الشيء لمعلمي الحصة/المعاش — لكل مدرسة في schoolsDetail. */
function v96AttachHrp_(rows, y, m){
  if (!rows || !rows.length) return rows;
  var mp = v96Maps_(y, m), hol = v56Workdays_(y, m).holidays.map(function(x){ return x[0]; });
  var hh = v98HrpHol_();
  rows.forEach(function(x){ var k = v96Key_('H', x.hrpId); x.hol = hol; x.hrpHol = hh;
    (x.schoolsDetail || []).forEach(function(d){ d.tt = mp.tt[k + '|' + d.schoolId] || mp.tt[k] || null; d.absDates = mp.ab[k + '|' + d.schoolId] || mp.ab[k] || {}; }); });
  return rows;
}

/* ===================== V7.61 — الجدول الثاني: تحديد أماكن حصص فوق النصاب ===================== */
/** قراءة {يوم: عدد} من الخلية — null لو فارغ أو كل القيم صفر. */
function v96Ot_(v){
  var o = v96ParseDates_(v), out = {}, n = 0;
  V96_DAYS.forEach(function(d){ var x = Math.max(0, Math.floor(Number(o[d]) || 0)); if (x) { out[d] = x; n += x; } });
  return n ? out : null;
}
/** الزيادة المطلوب تحديدها أسبوعيًا = إجمالي الجدول الأول (شاملًا أيام الندب الجزئي) − النصاب الأسبوعي، بحد أقصى 6. */
/** V7.66: مجموع حصص جدول معلم الحصة في المدرسة ≤ «عدد الحصص المطلوب» لعلاقته النشطة بها (لو محدد). */
function v96CheckHrpReq_(hrpId, sid, sum){
  var d = v24Data_('06_علاقات_معلمي_الحصة'), i = schoolV31Idx_(d.headers), req = 0, found = false;
  d.rows.forEach(function(r){ if (String(schoolV31Val_(r, i, 'hrpId')) !== String(hrpId) || String(schoolV31Val_(r, i, 'schoolId')) !== String(sid) || !v36ActiveRel_(schoolV31Val_(r, i, 'الحالة'))) return; found = true; req += Number(schoolV31Val_(r, i, 'عدد_الحصص_المطلوب')) || 0; });
  if (found && sum !== req) throw new Error('مجموع حصص الجدول (' + sum + ') يجب أن يساوي عدد الحصص المطلوب للمعلم (' + req + ') دون زيادة أو نقص.');
}
function v96Excess_(T, q, max){ return (T && q) ? Math.min(Number(max) || 6, Math.round(Math.max(0, T - q))) : 0; }   // V7.65: max = الحد الأسبوعي للمادة
/** التحقق النهائي عند الحفظ (نفس قواعد الشاشة). يعيد {ot, json}. */
function v96CheckOt_(kind, id, sid, tt, nd, overTt){
  var raw = overTt || {}, ot = {}, sum = 0;
  V96_DAYS.forEach(function(d){
    var s0 = raw[d] == null ? '' : String(raw[d]).trim(); if (s0 === '') return;
    if (!/^\d+$/.test(s0)) throw new Error('قيمة غير صالحة في حصص فوق النصاب يوم ' + d + '.');
    var v = Number(s0); if (!v) return;
    if (nd[d]) throw new Error('يوم ' + d + ' يوم ندب جزئي لمدرسة أخرى — لا تُحدد فيه حصص فوق النصاب.');
    if (v > (Number(tt[d]) || 0)) throw new Error('حصص فوق النصاب يوم ' + d + ' (' + v + ') أكثر من حصص الجدول في نفس اليوم (' + (Number(tt[d]) || 0) + ').');
    ot[d] = v; sum += v;
  });
  if (!sum) return {ot: {}, json: ''};
  if (kind !== 'E') throw new Error('حصص فوق النصاب للعاملين الأساسيين فقط.');
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), sys = '';
  for (var i = 0; i < emp.rows.length; i++) if (String(schoolV31Val_(emp.rows[i], ei, 'employeeId')) === String(id)) { sys = String(schoolV31Val_(emp.rows[i], ei, 'نظام_العمل') || ''); break; }
  if (!/فوق/.test(sys)) throw new Error('النظام المالي لهذا العامل لا يشمل فوق النصاب.');
  var x = {employeeId: id}; v99AttachQuota_([x]); var q = Number(x.quotaWeekly) || 0;
  var T = 0, M = Object.keys(nd).length ? v97Maps_(0, 0) : null, key = v96Key_(kind, id);
  V96_DAYS.forEach(function(d){ if (nd[d]) { var h = M && M.tt[key + '|' + nd[d]]; T += h ? (Number(h[d]) || 0) : 0; } else T += Number(tt[d]) || 0; });
  var ex = v96Excess_(T, q, v107Emp_(id).ow);   // V7.65
  if (!q) throw new Error('لا يوجد نصاب قانوني لهذا العامل — لا تُحدد حصص فوق النصاب.');
  if (!ex) throw new Error('إجمالي الجدول (' + T + ') لا يزيد عن النصاب (' + q + ') — لا توجد حصص فوق النصاب.');
  if (sum > ex) throw new Error('إجمالي حصص فوق النصاب لا يجوز أن يتجاوز ' + ex + ' حصص.');
  return {ot: ot, json: JSON.stringify(ot)};
}
/** الحساب الشهري لفوق النصاب من الجدول الثاني فقط: كل يوم دراسي فعلي في الفترة (من بداية الدراسة) × حصص فوق النصاب لذلك اليوم،
 *  مع استبعاد أيام الغياب (المأمورية يوم عمل)، والإجازات الرسمية تُحسب كأنها تمت للأساسيين. حد أقصى 24. */
function v96OverMonth_(ot, absDates, y, m, max){
  if (!ot) return 0;
  var abs = absDates || {}, n = 0;
  (v96PeriodDays_(y, m) || []).forEach(function(d){ var v = Number(ot[V96_DAYS[d.dow]]) || 0; if (!v) return; if (abs[d.date] && abs[d.date] !== 'مأمورية') return; n += v; });
  return Math.min(Number(max) || 24, n);   // V7.65: max = الحد الشهري للمادة
}
