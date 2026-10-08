/**
 * V7.3 — خط السير: إدارة الفترات (عرض واضح لما هو مفتوح) + تقارير المتابعة (المتابع والإدارة).
 * مصادر: 21_فتح_خط_السير (الفترات)، 22_خط_السير (المخطط)، 23_زيارات_المشرفين (ما سجّلته المدارس).
 * المفتاح بين المخطط والزيارة = employeeId (أو supervisorId) + المدرسة + التاريخ.
 */
function v73Sups_(){
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), ri = routeV41Idx_(emp.headers), out = [];
  emp.rows.forEach(function(r){
    var st = schoolV31Val_(r, ei, 'حالة_التوجيه'); if (!st) return;
    var eid = schoolV31Val_(r, ei, 'employeeId'), scope = [];
    try { scope = routeV41ScopeSchools_({vals: r, i: ri}).map(function(x){ return x.schoolId; }); } catch (e) {}
    out.push({eid: eid, name: schoolV31Val_(r, ei, 'الاسم'), job: schoolV31Val_(r, ei, 'الوظيفة_الإشرافية'), subject: schoolV31Val_(r, ei, 'مادة_التدريس') || schoolV31Val_(r, ei, 'القسم'),
      system: schoolV31Val_(r, ei, 'نظام_خط_السير'), status: st, active: !/موقوف|غير/.test(st), scope: scope, scopeAll: !schoolV31Val_(r, ei, 'نطاق_خط_السير') || schoolV31Val_(r, ei, 'نطاق_خط_السير') === 'الكل'});
  });
  return out.sort(function(a, b){ return String(a.job).localeCompare(String(b.job), 'ar') || a.name.localeCompare(b.name, 'ar'); });
}
function v73Rows_(sheetName){ routeV41Ensure_(); var sh = personnelSS_().getSheetByName(sheetName), h = routeV41Header_(sh), i = routeV41Idx_(h); return {i: i, v: sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getDisplayValues() : []}; }
function v73D_(x){ return v35Date_(x) || String(x || '').slice(0, 10); }

/* ---------- الفترات ---------- */
function adminRoutePeriodsV73(token){
  v35Admin_(token);
  var P = routeV41GetPeriods_(), sups = v73Sups_().filter(function(s){ return s.active; }), R = v73Rows_(ROUTE_V41.routeSheet), today = v40Today_();
  var names = {}; sups.forEach(function(s){ names[s.eid] = s.name; });
  var out = P.map(function(p){
    var st = p.start || (p.year + '-' + v56Pad_(p.month) + '-01'), en = p.end || routeV41Iso_(new Date(p.year, p.month, 0)), saved = {};
    R.v.forEach(function(r){ var d = v73D_(r[R.i['التاريخ']]); if (d >= st && d <= en) saved[r[R.i.employeeId] || r[R.i.supervisorId]] = 1; });
    var want = sups.filter(function(s){ return !s.system || (p.type === 'شهري' ? s.system !== 'أسبوعي' : s.system === 'أسبوعي'); });
    var missing = want.filter(function(s){ return !saved[s.eid]; }).map(function(s){ return s.name + (s.job ? ' (' + s.job + ')' : ''); });
    return {periodId: p.periodId, type: p.type, year: p.year, month: p.month, start: st, end: en, status: p.status, openNow: routeV41IsOpen_(p), openAt: p.openAt || '', closeAt: p.closeAt || '',
      holidays: p.holidays || [], extraWork: p.extraWork || [], label: p.type === 'شهري' ? (V56_MONTH_NAMES[p.month - 1] + ' ' + p.year) : (st + ' → ' + en),
      want: want.length, saved: want.length - missing.length, missing: missing, past: en < today};
  }).sort(function(a, b){ return a.start < b.start ? 1 : -1; });
  return {success: true, periods: out, supervisors: sups.length, monthly: sups.filter(function(s){ return s.system !== 'أسبوعي'; }).length, weekly: sups.filter(function(s){ return s.system === 'أسبوعي'; }).length, today: today};
}
function adminRouteReopenV73(token, periodId){
  var a = v35Admin_(token); routeV41Ensure_();
  var sh = personnelSS_().getSheetByName(ROUTE_V41.periodSheet), h = routeV41Header_(sh), i = routeV41Idx_(h), v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getDisplayValues() : [];
  for (var r = 0; r < v.length; r++) if (v[r][i.periodId] === String(periodId)) {
    v50A_(sh.getRange(r + 2, i['حالة_الفتح'] + 1).setValue('مفتوح')); v50A_(sh.getRange(r + 2, i['آخر_تحديث'] + 1).setValue(new Date()));
    if (v[r][i['نوع_الخط']] === 'أسبوعي') { var cl = routeV41ParseFlexible_(v[r][i['وقت_الغلق']]); if (cl && cl < new Date()) v50A_(sh.getRange(r + 2, i['وقت_الغلق'] + 1).setValue(new Date(new Date().getTime() + 3 * 24 * 3600000))); }
    schoolV31Log_(v36Actor_(a), 'إعادة فتح فترة خط السير', periodId, []);
    return {success: true, message: 'أُعيد فتح الفترة.'};
  }
  throw new Error('الفترة غير موجودة.');
}

/* ---------- التقارير ---------- */
/** p = {from, to, eid?, days?(نافذة التغطية، افتراضي 90)} */
function v73Report_(p){
  p = p || {}; var today = v40Today_();
  var to = v35Date_(p.to) || today, from = v35Date_(p.from) || (function(){ var d = new Date(to); d.setDate(1); return routeV41Iso_(d); })();
  if (from > to) throw new Error('بداية الفترة بعد نهايتها.');
  var win = Math.max(7, Math.min(365, Number(p.days) || 90)), wFrom = (function(){ var d = new Date(to); d.setDate(d.getDate() - win + 1); return routeV41Iso_(d); })();
  var names = v42SchoolNames_(), T = v42SchoolTypes_(), sups = v73Sups_(), S = {}; sups.forEach(function(s){ S[s.eid] = s; });
  var R = v73Rows_(ROUTE_V41.routeSheet), V = v73Rows_(ROUTE_V41.visitSheet);
  // المخطط
  var plan = {}, planDay = {}, other = [];
  R.v.forEach(function(r){
    var d = v73D_(r[R.i['التاريخ']]); if (d < from || d > to) return;
    var e = r[R.i.employeeId] || r[R.i.supervisorId]; if (!e) return; if (p.eid && e !== p.eid) return;
    var type = r[R.i['نوع_الجهة']], ids = String(r[R.i['المدارس']] || '').split('|').filter(Boolean);
    var k = e + '|' + d; planDay[k] = planDay[k] || {eid: e, date: d, day: r[R.i['اليوم']], items: []};
    if (type === 'مدرسة' && ids.length) ids.forEach(function(sid){ plan[e + '|' + sid + '|' + d] = 1; planDay[k].items.push({kind: 'school', sid: sid, place: names[sid] || sid}); });
    else { planDay[k].items.push({kind: 'other', place: (r[R.i['الجهة_الأخرى']] || type || '—')}); other.push(k); }
  });
  // الزيارات المسجلة (الفترة + نافذة التغطية)
  var vis = {}, visList = [], cover = {};
  V.v.forEach(function(r){
    var d = v73D_(r[V.i['التاريخ']]), e = r[V.i.employeeId] || r[V.i.supervisorId], sid = r[V.i.schoolId];
    if (e && d >= wFrom && d <= to) { var c = cover[e] = cover[e] || {}; c[sid] = c[sid] || {n: 0, last: ''}; c[sid].n++; if (d > c[sid].last) c[sid].last = d; }
    if (d < from || d > to) return; if (p.eid && e !== p.eid) return;
    var planned = e ? !!plan[e + '|' + sid + '|' + d] : false;
    if (e) vis[e + '|' + sid + '|' + d] = 1;
    visList.push({date: d, sid: sid, school: names[sid] || sid, eid: e || '', name: r[V.i['اسم_الزائر']] || (S[e] ? S[e].name : ''), job: r[V.i['الوظيفة']] || (S[e] ? S[e].job : ''), subject: r[V.i['المادة_أو_القسم']] || '', source: r[V.i['مصدر_الزائر']] || '', planned: planned, isSup: !!S[e], time: r[V.i['وقت_التسجيل']] || ''});
  });
  // حالة كل بند مخطط
  var bySup = {};
  function bs(e){ return bySup[e] = bySup[e] || {eid: e, name: S[e] ? S[e].name : e, job: S[e] ? S[e].job : '', subject: S[e] ? S[e].subject : '', planned: 0, done: 0, missed: 0, future: 0, otherDays: 0, unplanned: 0, days: []}; }
  Object.keys(planDay).sort().forEach(function(k){
    var pd = planDay[k], o = bs(pd.eid), past = pd.date < today, isToday = pd.date === today;
    pd.items.forEach(function(it){
      if (it.kind !== 'school') { it.status = 'جهة أخرى'; o.otherDays++; return; }
      var done = !!vis[pd.eid + '|' + it.sid + '|' + pd.date];
      it.status = done ? 'تم' : (past ? 'لم يتم' : (isToday ? 'اليوم — لم يُسجَّل بعد' : 'قادم'));
      if (pd.date <= today) o.planned++; if (done) o.done++; else if (past) o.missed++; else o.future++;
    });
    o.days.push(pd);
  });
  var unplanned = visList.filter(function(x){ return x.isSup && !x.planned; }).map(function(x){
    var pd = planDay[x.eid + '|' + x.date]; x.plannedThatDay = pd ? pd.items.map(function(it){ return it.place; }).join('، ') : 'لا يوجد خط سير لهذا اليوم'; bs(x.eid).unplanned++; return x; });
  var supRows = Object.keys(bySup).map(function(k){ var o = bySup[k]; o.pct = o.planned ? Math.round(o.done * 1000 / o.planned) / 10 : null; return o; });
  if (!p.eid) sups.forEach(function(s){ if (s.active && !bySup[s.eid]) supRows.push({eid: s.eid, name: s.name, job: s.job, subject: s.subject, planned: 0, done: 0, missed: 0, future: 0, otherDays: 0, unplanned: 0, pct: null, days: [], noPlan: true}); });
  supRows.sort(function(a, b){ return (a.noPlan ? 1 : 0) - (b.noPlan ? 1 : 0) || (a.pct == null ? 101 : a.pct) - (b.pct == null ? 101 : b.pct) || a.name.localeCompare(b.name, 'ar'); });
  // التغطية: مدارس النطاق ولم تُزر خلال النافذة
  var coverage = (p.eid ? sups.filter(function(s){ return s.eid === p.eid; }) : sups.filter(function(s){ return s.active; })).map(function(s){
    var c = cover[s.eid] || {}, scope = (s.scope || []).filter(function(sid){ return /تشغيلي/.test((T[sid] || {}).cls || '') && !/ديوان|مجهول/.test(names[sid] || ''); });
    var never = scope.filter(function(sid){ return !c[sid]; }).map(function(sid){ return names[sid] || sid; }).sort(function(a, b){ return a.localeCompare(b, 'ar'); });
    var visited = Object.keys(c).map(function(sid){ return {school: names[sid] || sid, n: c[sid].n, last: c[sid].last, inScope: scope.indexOf(sid) >= 0}; }).sort(function(a, b){ return b.n - a.n; });
    return {eid: s.eid, name: s.name, job: s.job, subject: s.subject, scopeN: scope.length, visitedN: scope.length - never.length, never: never, visited: visited, totalVisits: visited.reduce(function(a, x){ return a + x.n; }, 0)};
  });
  // حسب المدرسة
  var bySchool = {};
  visList.forEach(function(x){ var o = bySchool[x.sid] = bySchool[x.sid] || {school: x.school, n: 0, sups: {}, last: ''}; o.n++; if (x.eid) o.sups[x.eid] = 1; if (x.date > o.last) o.last = x.date; });
  var schoolRows = Object.keys(names).filter(function(sid){ return /تشغيلي/.test((T[sid] || {}).cls || '') && !/ديوان|مجهول/.test(names[sid] || ''); }).map(function(sid){ var o = bySchool[sid] || {school: names[sid], n: 0, sups: {}, last: ''}; return {school: o.school, n: o.n, sups: Object.keys(o.sups).length, last: o.last}; }).sort(function(a, b){ return a.n - b.n || a.school.localeCompare(b.school, 'ar'); });
  var tot = {planned: 0, done: 0, missed: 0, future: 0, unplanned: unplanned.length, visits: visList.length, sups: supRows.filter(function(x){ return !x.noPlan; }).length, noPlan: supRows.filter(function(x){ return x.noPlan; }).length};
  supRows.forEach(function(o){ tot.planned += o.planned; tot.done += o.done; tot.missed += o.missed; tot.future += o.future; });
  tot.pct = tot.planned ? Math.round(tot.done * 1000 / tot.planned) / 10 : null;
  return {success: true, from: from, to: to, today: today, window: win, windowFrom: wFrom, totals: tot, supervisors: supRows.map(function(o){ if (!p.eid) delete o.days; return o; }), unplanned: unplanned, coverage: coverage, schools: schoolRows,
    visits: visList.sort(function(a, b){ return a.date < b.date ? -1 : a.date > b.date ? 1 : a.school.localeCompare(b.school, 'ar'); }),
    supList: sups.map(function(s){ return {eid: s.eid, name: s.name, job: s.job, subject: s.subject}; })};
}
function followupRouteReportV73(token, p){ followupSessionV41_(token); routeV41Ensure_(); return v73Report_(p); }
function adminRouteReportV73(token, p){ v35Admin_(token); routeV41Ensure_(); return v73Report_(p); }
