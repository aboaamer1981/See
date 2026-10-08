/**
 * V7.65 — الحدود القصوى للحصص (قابلة للتعديل من الإدارة) + استثناءات حسب المادة.
 *  الافتراضي (R_الإعدادات):
 *    MAX_OVER_WEEKLY   أقصى فوق النصاب أسبوعيًا (6)      MAX_OVER_PERIODS   أقصى فوق النصاب شهريًا (24)
 *    MAX_HOURLY_WEEKLY أقصى حصص معلم الحصة أسبوعيًا (24) MAX_HOURLY_PERIODS أقصى حصص معلم الحصة شهريًا (96)
 *  الاستثناءات: ورقة R_حدود_الحصص — صف لكل مادة، والخانة الفارغة = الافتراضي.
 *  المادة: مادة_التدريس للأساسي (01_الأساسي) ولمعلم الحصة (05_معلمو_الحصة_والمعاش).
 */
var V107_SHEET = {name: 'R_حدود_الحصص', headers: ['المادة', 'فوق_النصاب_أسبوعي', 'فوق_النصاب_شهري', 'الحصة_أسبوعي', 'الحصة_شهري', 'الحالة', 'ملاحظات']};
var V107_KEYS = [['ow', 'فوق_النصاب_أسبوعي', 'MAX_OVER_WEEKLY', 6, 60], ['om', 'فوق_النصاب_شهري', 'MAX_OVER_PERIODS', 24, 500], ['hw', 'الحصة_أسبوعي', 'MAX_HOURLY_WEEKLY', 24, 60], ['hm', 'الحصة_شهري', 'MAX_HOURLY_PERIODS', 96, 500]];
var V107_MEMO_ = null;

function v107Norm_(s){
  var x = String(s == null ? '' : s).trim();
  try { if (typeof subjectCanonV44_ === 'function') x = subjectCanonV44_(x) || x; } catch (e) {}
  return x.replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
}
function v107PosInt_(v){ var n = Number(String(v == null ? '' : v).trim()); return (String(v == null ? '' : v).trim() !== '' && isFinite(n) && n > 0) ? Math.floor(n) : 0; }
function v107Defaults_(){
  var d = {};
  V107_KEYS.forEach(function(k){ d[k[0]] = v107PosInt_(v36GetSetting_(k[2], String(k[3]))) || k[3]; });
  return d;
}
function v107Memo_(){
  if (V107_MEMO_) return V107_MEMO_;
  var ex = {}, rows = [];
  var sh = personnelSS_().getSheetByName(V107_SHEET.name);
  if (sh && sh.getLastRow() > 1) {
    var h = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(function(x){ return String(x).trim(); }), ix = {};
    h.forEach(function(k, n){ if (k) ix[k] = n; });
    sh.getRange(2, 1, sh.getLastRow() - 1, h.length).getDisplayValues().forEach(function(r){
      var subj = String(r[ix['المادة']] || '').trim(); if (!subj) return;
      if (ix['الحالة'] != null && String(r[ix['الحالة']] || '').trim() === 'موقوف') return;
      var o = {subject: subj}; V107_KEYS.forEach(function(k){ o[k[0]] = ix[k[1]] != null ? v107PosInt_(r[ix[k[1]]]) : 0; });
      o.note = ix['ملاحظات'] != null ? String(r[ix['ملاحظات']] || '') : '';
      rows.push(o); ex[v107Norm_(subj)] = o;
    });
  }
  V107_MEMO_ = {def: v107Defaults_(), ex: ex, rows: rows, emp: null, hrp: null};
  return V107_MEMO_;
}
/** الحدود لمادة معينة: الاستثناء إن وُجد وإلا الافتراضي (لكل بند على حدة). */
function v107ForSubject_(subject){
  var m = v107Memo_(), e = m.ex[v107Norm_(subject)] || null, out = {subject: e ? e.subject : '', exception: !!e};
  V107_KEYS.forEach(function(k){ out[k[0]] = (e && e[k[0]]) || m.def[k[0]]; });
  return out;
}
function v107SubjMaps_(){
  var m = v107Memo_();
  if (!m.emp) { m.emp = {}; try { var d = v24Data_('01_الأساسي'), i = schoolV31Idx_(d.headers); d.rows.forEach(function(r){ m.emp[String(schoolV31Val_(r, i, 'employeeId'))] = String(schoolV31Val_(r, i, 'مادة_التدريس') || ''); }); } catch (e) { console.error('v107 emp: ' + e.message); } }
  if (!m.hrp) { m.hrp = {}; try { var h = v24Data_('05_معلمو_الحصة_والمعاش'), j = schoolV31Idx_(h.headers); h.rows.forEach(function(r){ m.hrp[String(schoolV31Val_(r, j, 'hrpId'))] = String(schoolV31Val_(r, j, 'مادة_التدريس') || ''); }); } catch (e) { console.error('v107 hrp: ' + e.message); } }
  return m;
}
function v107Emp_(employeeId){ return v107ForSubject_(v107SubjMaps_().emp[String(employeeId || '')] || ''); }
function v107Hrp_(hrpId){ return v107ForSubject_(v107SubjMaps_().hrp[String(hrpId || '')] || ''); }
function v107HrpW_(hrpId){ return v107Hrp_(hrpId).hw; }
/** يضيف lim لكل صف (للواجهة): الأساسي {ow, om} ومعلم الحصة {hw, hm}. */
function v107Attach_(rows, kind){
  (rows || []).forEach(function(x){ if (!x) return; var l = kind === 'H' ? v107Hrp_(x.hrpId) : v107Emp_(x.employeeId); x.lim = kind === 'H' ? {hw: l.hw, hm: l.hm, ex: l.exception} : {ow: l.ow, om: l.om, ex: l.exception}; });
  return rows;
}

/* ============ الإدارة ============ */
function adminLimitsV107(token){
  v35Admin_(token); V107_MEMO_ = null; var m = v107Memo_(), subjects = [];
  try { var d = v24Data_('R_المواد'), i = schoolV31Idx_(d.headers); d.rows.forEach(function(r){ var n = String(schoolV31Val_(r, i, 'اسم_المادة') || '').trim(), st = String(schoolV31Val_(r, i, 'الحالة') || ''); if (n && st !== 'موقوف' && subjects.indexOf(n) < 0) subjects.push(n); }); } catch (e) {}
  return {success: true, defaults: m.def, exceptions: m.rows, subjects: subjects, keys: V107_KEYS.map(function(k){ return {key: k[0], col: k[1], max: k[4], def: k[3]}; })};
}
/** defaults = {ow,om,hw,hm}؛ rows = [{subject, ow, om, hw, hm, note}] (الفارغ = الافتراضي). يستبدل جدول الاستثناءات كله. */
function adminSaveLimitsV107(token, defaults, rows){
  var a = v35Admin_(token), dft = defaults || {}, list = Array.isArray(rows) ? rows : [], seen = {}, clean = [];
  V107_KEYS.forEach(function(k){
    var v = String(dft[k[0]] == null ? '' : dft[k[0]]).trim();
    if (!/^\d+$/.test(v) || Number(v) < 1 || Number(v) > k[4]) throw new Error('الحد الافتراضي «' + k[1].replace(/_/g, ' ') + '» يجب أن يكون رقمًا صحيحًا من 1 إلى ' + k[4] + '.');
  });
  if (Number(dft.ow) > Number(dft.om)) throw new Error('أقصى فوق النصاب أسبوعيًا لا يزيد عن الحد الشهري.');
  if (Number(dft.hw) > Number(dft.hm)) throw new Error('أقصى حصص معلم الحصة أسبوعيًا لا يزيد عن الحد الشهري.');
  list.forEach(function(r, n){
    var subj = String(r.subject || '').trim(); if (!subj) throw new Error('الاستثناء رقم ' + (n + 1) + ': اختر المادة.');
    var key = v107Norm_(subj); if (seen[key]) throw new Error('المادة «' + subj + '» مكررة في الاستثناءات.'); seen[key] = 1;
    var o = {subject: subj, note: String(r.note || '').trim().slice(0, 200)}, any = false;
    V107_KEYS.forEach(function(k){
      var v = String(r[k[0]] == null ? '' : r[k[0]]).trim();
      if (v === '') { o[k[0]] = ''; return; }
      if (!/^\d+$/.test(v) || Number(v) < 1 || Number(v) > k[4]) throw new Error('«' + subj + '» — ' + k[1].replace(/_/g, ' ') + ': رقم صحيح من 1 إلى ' + k[4] + ' (أو اتركه فارغًا = الافتراضي).');
      o[k[0]] = Number(v); any = true;
    });
    if (!any) throw new Error('«' + subj + '»: حدد حدًا واحدًا على الأقل أو احذف الاستثناء.');
    var ow = o.ow || Number(dft.ow), om = o.om || Number(dft.om), hw = o.hw || Number(dft.hw), hm = o.hm || Number(dft.hm);
    if (ow > om) throw new Error('«' + subj + '»: فوق النصاب الأسبوعي (' + ow + ') أكبر من الشهري (' + om + ').');
    if (hw > hm) throw new Error('«' + subj + '»: حصص معلم الحصة الأسبوعية (' + hw + ') أكبر من الشهرية (' + hm + ').');
    clean.push(o);
  });
  return v35Lock_(function(){
    var changes = [];
    V107_KEYS.forEach(function(k){ var nv = String(dft[k[0]]).trim(), ov = v36GetSetting_(k[2], ''); if (nv !== ov) { v36SetSetting_(k[2], nv, 'الحد الأقصى: ' + k[1].replace(/_/g, ' ')); changes.push([k[2], ov, nv]); } });
    var sh = v42EnsureSheet_(V107_SHEET), h = v42Header_(sh), ix = v42Idx_(h);
    var old = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, h.length).getDisplayValues() : [];
    var out = clean.map(function(o){ var r = new Array(h.length).fill(''); r[ix['المادة']] = o.subject; V107_KEYS.forEach(function(k){ r[ix[k[1]]] = o[k[0]] === '' ? '' : o[k[0]]; }); r[ix['الحالة']] = 'فعال'; r[ix['ملاحظات']] = o.note; return r; });
    if (old.length) v50A_(sh.getRange(2, 1, old.length, h.length).clearContent());
    if (out.length) v50A_(sh.getRange(2, 1, out.length, h.length).setValues(out));
    var oldTxt = old.filter(function(r){ return r[ix['المادة']]; }).map(function(r){ return r.join('/'); }).join(' | '), newTxt = out.map(function(r){ return r.join('/'); }).join(' | ');
    if (oldTxt !== newTxt) changes.push(['استثناءات المواد', oldTxt, newTxt]);
    v50Invalidate_(V107_SHEET.name); V107_MEMO_ = null;
    schoolV31Log_(v36Actor_(a), 'تعديل الحدود القصوى للحصص', 'LIMITS', changes);
    return {success: true, message: changes.length ? 'تم حفظ الحدود القصوى والاستثناءات.' : 'لا توجد تغييرات.', changed: changes.length};
  });
}
