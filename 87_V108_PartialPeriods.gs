/**
 * V7.67 — حصص المدرسة الفرعية للمنتدب (أساسي ومعلم حصة) تظهر عند المدرسة الأصلية فور إدخالها.
 *  للعرض والمعاينة فقط: كل مدرسة تحفظ حصصها هي، والإجمالي يُجمع في الحساب الشهري كما هو.
 *  مدرسة الندب لا يلزمها إرسال شهري لاعتماد الأصلية؛ يكفي جدول أسبوعي مطابق للمطلوب وفيه حصص.
 */
function v108Map_(kind, year, month){
  var rd = kind === 'H' ? v40HrpMonthlyRead_() : v36MonthlyRead_(), ix = rd.ix, idK = kind === 'H' ? 'hrpId' : 'employeeId', pK = kind === 'H' ? 'الحصص_الفعلية' : 'الحصص_الفعلية_المنفذة', out = {};
  rd.vals.forEach(function(r){
    if (Number(r[ix['السنة']]) !== Number(year) || Number(r[ix['الشهر']]) !== Number(month)) return;
    var id = String(r[ix[idK]] || ''), sid = String(r[ix.schoolId] || ''); if (!id || !sid) return;
    var st = String(r[ix['حالة_الإدخال']] || ''), ap = String(r[ix['حالة_الاعتماد']] || '');
    (out[id] = out[id] || {})[sid] = {schoolId: sid, periods: String(r[ix[pK]] == null ? '' : r[ix[pK]]).trim(), approved: st === 'مرسل' || ap === 'معتمد'};
  });
  return out;
}
/** المدارس الفرعية لكل شخص: الأساسي = علاقات «منتدب إلينا جزئي» في مدارس أخرى؛ معلم الحصة = علاقاته النشطة الأخرى (والمدرسة الحالية هي الأصلية). */
function v108Subs_(kind, sid){
  var out = {}, names = v42SchoolNames_();
  if (kind === 'H') {
    var info = v52HrpRelInfo_(), rd = v56Read_(V40_HRP_REL_SHEET), ix = rd.ix;
    rd.vals.forEach(function(r){
      if (!v36ActiveRel_(r[ix['الحالة']])) return; var id = String(r[ix.hrpId] || ''), s2 = String(r[ix.schoolId] || ''), x = info[id];
      if (!x || x.count < 2 || String(x.absSchoolId) !== String(sid) || s2 === String(sid)) return;
      var l = out[id] = out[id] || [],existing=l.filter(function(q){return q.schoolId===s2;})[0];if(existing)existing.required+=Number(r[ix['عدد_الحصص_المطلوب']])||0;else l.push({schoolId:s2,school:names[s2]||s2,required:Number(r[ix['عدد_الحصص_المطلوب']])||0});
    });
    return out;
  }
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), hostHere = {};
  rel.rows.forEach(function(r){ if (v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة')) && String(schoolV31Val_(r, ri, 'schoolId')) === String(sid) && /منتدب إلينا جزئي/.test(String(schoolV31Val_(r, ri, 'نوع_العلاقة') || ''))) hostHere[String(schoolV31Val_(r, ri, 'employeeId'))] = 1; });
  rel.rows.forEach(function(r){
    if (!v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة'))) return;
    var eid = String(schoolV31Val_(r, ri, 'employeeId')), s2 = String(schoolV31Val_(r, ri, 'schoolId'));
    if (s2 === String(sid) || hostHere[eid] || !/منتدب إلينا جزئي/.test(String(schoolV31Val_(r, ri, 'نوع_العلاقة') || ''))) return;
    (out[eid] = out[eid] || []).push({schoolId: s2, school: names[s2] || s2});
  });
  return out;
}
/** شاشة الشهر في المدرسة الأصلية: w.subP = [{school, periods, approved, entered}]. */
function v108AttachMonth_(workers, kind, sid, year, month){
  if (!workers || !workers.length) return workers;
  var subs = v108Subs_(kind, sid), mp = v108Map_(kind, year, month),scheduleMaps=kind==='H'?v96Maps_(year,month):null,scheduleDays=kind==='H'?v96PeriodDays_(year,month):null,countHolidays=kind==='H'?v98HrpHol_():false;
  workers.forEach(function(w){
    var id = String(kind === 'H' ? w.hrpId : w.employeeId), l = subs[id]; if (!l || !l.length) return;
    w.subP = l.map(function(q){ var m = (mp[id] || {})[q.schoolId]; if(kind==='H'&&(!m||m.periods==='')){var plan=v40HrpScheduleMonth_(id,q.schoolId,q.required,scheduleMaps,scheduleDays,countHolidays);if(plan)return {school:q.school,periods:String(plan.periods),approved:false,entered:true,scheduleOnly:true};}return {school:q.school,periods:m?m.periods:'',approved:!!(m&&m.approved),entered:!!(m&&m.periods!=='')}; });
  });
  return workers;
}
/** الاستمارات (أساسي): حصص الفرعية من الإدخال الشهري إن لم يُحسب الشهر بعد + حالة الاعتماد + الإجمالي. */
function v108FormsBasic_(rows, year, month){
  if (!rows || !rows.length) return rows;
  var mp = v108Map_('E', year, month);
  rows.forEach(function(x){
    var m = mp[String(x.employeeId)] || {};
    // V7.70: قبل اعتماد الإدارة، عدد الحصص في التقارير = آخر إدخال محفوظ (كل مدارسه)، لا رقم محسوب قديم.
    if ((!x.secs || !x.secs.length) && x.complete !== true) { var any = false, t = 0; Object.keys(m).forEach(function(k){ if (m[k].periods !== '') { any = true; t += Number(m[k].periods) || 0; } }); if (any) x.periods = t; }
    if (!x.secs || !x.secs.length) return;
    var own = m[String(x.schoolId)], sum = 0;
    x.secs.forEach(function(q){ var h = m[String(q.schoolId)]; if ((q.done === '' || q.done == null) && h) q.done = h.periods; q.approved = x.complete === true || !!(h && h.approved); sum += Number(q.done) || 0; });
    if (x.periods === '' || x.periods == null || x.complete !== true) x.periods = (own ? (Number(own.periods) || 0) : 0) + sum;   // الإجمالي
  });
  return rows;
}
/** الاستمارات (معلم الحصة): حالة اعتماد كل مدرسة في schoolsDetail. */
function v108FormsHrp_(rows, year, month){
  if (!rows || !rows.length) return rows;
  var mp = v108Map_('H', year, month);
  rows.forEach(function(x){ var m = mp[String(x.hrpId)] || {}; (x.schoolsDetail || []).forEach(function(d){ if(d.scheduleOnly)return;var h = m[String(d.schoolId)]; d.approved = !!(h && h.approved); }); });
  return rows;
}

/** V7.70: جدول المدرسة الفرعية (أيام الندب فقط) وغيابها للاستمارة الأساسية: x.subTt = [{school, tt, absDates}]. */
function v108AttachSubTt_(rows, mp){
  var names = v42SchoolNames_();
  rows.forEach(function(x){
    var k = v96Key_('E', x.employeeId) + '|', own = String(x.schoolId || ''), out = [];
    Object.keys(mp.tt).forEach(function(key){ if (key.indexOf(k) !== 0) return; var sid = key.slice(k.length); if (!sid || sid === own) return; out.push({schoolId: sid, school: names[sid] || sid, tt: mp.tt[key], absDates: mp.ab[key] || {}}); });
    if (out.length) x.subTt = out;
  });
  return rows;
}
