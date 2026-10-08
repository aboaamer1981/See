/** V5.1 — لوحة الإدارة الجديدة: «صندوق المهام» + مؤشرات اليوم + البحث الموحد.
 *  كل الأرقام تُحسب من نفس الدوال التي تعرض الشاشات (لا مصدر ثانٍ)، والقراءات الكبيرة من الذاكرة المؤقتة V5.0.
 *  الإدارة حسابان admin بصلاحيات كاملة؛ «tasks» تظهر للاثنين، وما يُنجزه أحدهما يختفي من عند الآخر عند التحديث. */
function adminInboxV51(token){
  var a = v35Admin_(token), c = CacheService.getScriptCache(), ck = 'V51_INBOX_' + String(a && (a.username || a.name) || 'admin');
  try {
    var raw = c.get(ck);
    if (raw) {
      var cached = JSON.parse(raw);
      cached.user = a && (a.name || a.username) || cached.user || '';
      cached.cached = true;
      return cached;
    }
  } catch (e) {}
  var today = v40Today_(), tasks = [], kpi = {}, warn = [];
  function safe(fn, def){ try { return fn(); } catch (e) { warn.push(String(e && e.message || e)); return def; } }

  // 1) طلبات تعديل/حالة العاملين المفتوحة
  var wr = safe(function(){ return adminWorkerRequestsV32(token, 'مفتوح').rows || []; }, []);
  if (wr.length) tasks.push({kind: 'requests', level: 'r', icon: '📨', count: wr.length, title: wr.length + ' طلب من المدارس بانتظار قرار', sub: v51Uniq_(wr.map(function(x){ return x.school; })).slice(0, 3).join('، '), go: 'requests', btn: 'مراجعة'});

  // 2) النقل والندب المفتوح
  var mv = safe(function(){ return (adminMoveReportV91(token).rows || []).filter(function(x){ return x.status === 'مفتوح'; }); }, []);
  if (mv.length) tasks.push({kind: 'moves', level: 'o', icon: '🔁', count: mv.length, title: mv.length + ' طلب حركة / إضافة معلم حصة مفتوح', sub: mv.slice(0, 2).map(function(x){ return x.employeeName + ' ← ' + x.to; }).join(' · '), go: 'moves', btn: 'مراجعة'});

  // 3) الشهر المالي
  var mo = safe(function(){ return adminMonthlyOverviewV36(token, 0, 0); }, null), fin = {total: 0, notStarted: 0, draft: 0, sent: 0, dataApproved: 0, calc: 0, finApproved: 0, returned: 0};
  if (mo) {
    (mo.schools || []).forEach(function(s){
      if (!(Number(s.workers) > 0)) return; fin.total++;
      var st = v51FinState_(s); fin[st.key]++;
    });
    kpi.finance = {sent: fin.total - fin.notStarted - fin.draft, total: fin.total, month: mo.month};
    if (fin.sent) tasks.push({kind: 'finance', level: 'o', icon: '💰', count: fin.sent, title: fin.sent + ' مدرسة أرسلت ولم يكتمل احتسابها', sub: 'غالبًا بانتظار مدرسة ثانية أو نصاب قانوني — شهر ' + mo.month.month + '/' + mo.month.year, go: 'finance', filter: 'sent', btn: 'عرض'});
    var mq = mo.missingQuotas || [], mqP = mq.reduce(function(a, g){ return a + g.periods; }, 0);
    if (mq.length) tasks.push({kind: 'quota', level: mqP ? 'r' : 'o', icon: '⚖️', count: mq.length, title: mq.length + ' مسمى/مرحلة بلا نصاب قانوني' + (mqP ? ' (' + mqP + ' عامل منظومة حصص لن يُحسب)' : ''), sub: mq.slice(0, 3).map(function(g){ return g.job + ' — ' + g.stage; }).join(' · '), go: 'finance', filter: 'quota', btn: 'عرض'});
    if (fin.calc) tasks.push({kind: 'finance', level: 'bl', icon: '✔', count: fin.calc, title: fin.calc + ' كشف محسوب بانتظار الاعتماد', sub: 'اعتماد الكشوف يغلقها من التعديل', go: 'finance', filter: 'calc', btn: 'اعتماد'});
  }
  kpi.fin = fin;

  // 4) طلبات إعادة فتح شهر مالي
  var fr = safe(function(){ return (adminFinanceReopenRequestsV40(token).rows || []).filter(function(x){ return x.status === 'مفتوح'; }); }, []);
  if (fr.length) tasks.push({kind: 'reopen', level: 'bl', icon: '🔓', count: fr.length, title: fr.length + ' طلب إعادة فتح شهر مالي', sub: fr.slice(0, 3).map(function(x){ return x.school; }).join('، '), go: 'moves', btn: 'قرار'});

  // 5) مدارس بلا قيادة أولى / ثانية
  var sc = safe(function(){ return getSchoolsWithCountsV25_(); }, []), real = sc.filter(function(s){ return s.workerCount > 0; });
  var noP = real.filter(function(s){ return !s.principal; }), noV = real.filter(function(s){ return !s.vicePrincipal; });
  kpi.schools = real.length;
  if (noP.length || noV.length) tasks.push({kind: 'officials', level: 'r', icon: '🏫', count: noP.length, title: noP.length + ' مدرسة بلا قيادة أولى · ' + noV.length + ' بلا قيادة ثانية', sub: noP.slice(0, 3).map(function(s){ return s.name; }).join('، '), go: 'schools', btn: 'عرض'});

  // 6) الغياب اليوم (المدارس التي لها صفوف طلاب)
  var abs = safe(function(){ return v51AbsenceToday_(today); }, {total: 0, reported: 0, top: [], missing: []});
  kpi.absence = {reported: abs.reported, total: abs.total, date: today};

  // 7) خط السير للشهر الحالي
  var rt = safe(function(){ return v51RouteMonth_(token); }, {done: 0, total: 0, missing: []});
  kpi.route = rt;
  if (rt.total && rt.missing.length) tasks.push({kind: 'route', level: 'o', icon: '🧭', count: rt.missing.length, title: rt.missing.length + ' موجه لم يسجل خط سير هذا الشهر', sub: rt.missing.slice(0, 3).join('، '), go: 'route', btn: 'عرض'});

  // 8) معلمو حصة نشطون بلا حصص مطلوبة
  var hz = safe(function(){ return v51HrpZero_(); }, 0);
  if (hz) tasks.push({kind: 'hrp', level: 'o', icon: '⏱️', count: hz, title: hz + ' علاقة معلم حصة نشطة بدون عدد حصص', sub: 'تُحسب بصفر حتى تحددها المدرسة', go: 'reports', btn: 'عرض'});

  kpi.workers = safe(function(){ var d = v24Data_('01_الأساسي'), i = schoolV31Idx_(d.headers); return d.rows.filter(function(r){ return schoolV31Val_(r, i, 'employeeId') && schoolV31Val_(r, i, 'حالة_السجل') !== 'موقوف' && schoolV31Val_(r, i, 'حالة_السجل') !== 'غير قائم'; }).length; }, 0);

  var order = {r: 0, o: 1, bl: 2};
  tasks.sort(function(x, y){ return (order[x.level] - order[y.level]) || (y.count - x.count); });
  var badges = {};
  tasks.forEach(function(t){ badges[t.go] = (badges[t.go] || 0) + (t.kind === 'officials' || t.kind === 'hrp' || t.kind === 'route' ? 0 : t.count); });
  var out = {success: true, user: a && (a.name || a.username) || '', today: today, kpi: kpi, tasks: tasks, badges: badges, absenceTop: abs.top, absenceMissing: abs.missing, warnings: warn};
  try { c.put(ck, JSON.stringify(out), 120); } catch (e) {}
  return out;
}

/** حالة الشهر لمدرسة من adminMonthlyOverviewV36 — تُستخدم في الرئيسية وفلاتر الاستحقاقات. */
function v51FinState_(s){
  var e = s.entry || {}, c = s.calc || {};
  if (c.approved > 0) return {key: 'finApproved', label: 'كشف معتمد'};
  if (c.calc > 0) return {key: 'calc', label: 'محسوب'};
  if (e.returned > 0) return {key: 'returned', label: 'مرتجع'};
  if (e.sent > 0) return {key: 'sent', label: 'للمراجعة'};
  if (e.approved > 0) return {key: 'dataApproved', label: 'بيانات معتمدة'};
  if (e.rows > 0 || e.draft > 0) return {key: 'draft', label: 'مسودة'};
  return {key: 'notStarted', label: 'لم تبدأ'};
}
function v51Uniq_(a){ var s = {}, o = []; a.forEach(function(x){ if (x && !s[x]) { s[x] = 1; o.push(x); } }); return o; }

function v51AbsenceToday_(date){
  var names = v42SchoolNames_(), stu = v24Data_('13_شؤون_الطلاب'), sti = v42Idx_(stu.headers), by = {};
  stu.rows.forEach(function(r){ var sid = v42Val_(r, sti, 'schoolId'); if (!sid) return; if (!by[sid]) by[sid] = {name: names[sid] || v42Val_(r, sti, 'اسم المدرسة'), total: 0, absent: 0, reported: false}; by[sid].total += Number(v42Val_(r, sti, 'إجمالي الطلاب')) || 0; });
  var dsh = v40DailySheet_(), di = v42Idx_(v42Header_(dsh));
  v42Values_(dsh).forEach(function(r){ if (v42Val_(r, di, 'النوع') !== 'صف' || v35Date_(v42Val_(r, di, 'التاريخ')) !== date) return; var x = by[v42Val_(r, di, 'schoolId')]; if (!x) return; x.absent += Number(v24DigitsLocalV31_(v42Val_(r, di, 'عدد_الغياب'))) || 0; x.reported = true; });
  var list = Object.keys(by).map(function(k){ var x = by[k]; x.pct = x.total ? Math.round(x.absent * 1000 / x.total) / 10 : 0; return x; }).filter(function(x){ return x.total > 0; });
  var rep = list.filter(function(x){ return x.reported; });
  return {total: list.length, reported: rep.length, top: rep.sort(function(a, b){ return b.pct - a.pct; }).slice(0, 5).map(function(x){ return {name: x.name, absent: x.absent, pct: x.pct}; }), missing: list.filter(function(x){ return !x.reported; }).map(function(x){ return x.name; }).sort(function(a, b){ return a.localeCompare(b, 'ar'); })};
}
function v51RouteMonth_(token){
  var sup = adminRouteSupervisorsV41(token).filter(function(x){ return x.status === 'نشط'; });
  var d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1, done = {};
  var sh = personnelSS_().getSheetByName(ROUTE_V41.routeSheet);
  if (sh && sh.getLastRow() > 1) { var h = v42Header_(sh), i = v42Idx_(h); v42Values_(sh).forEach(function(r){ if (Number(v42Val_(r, i, 'السنة')) === y && Number(v42Val_(r, i, 'الشهر')) === m) done[v42Val_(r, i, 'supervisorId')] = 1; }); }
  var missing = sup.filter(function(x){ return !done[x.supervisorId]; }).map(function(x){ return x.name; });
  return {done: sup.length - missing.length, total: sup.length, missing: missing, year: y, month: m};
}
function v51HrpZero_(){
  var sh = v40HrpRelSheet_(); if (!sh || sh.getLastRow() < 2) return 0;
  var h = v36Headers_(sh), ix = schoolV31Idx_(h), n = 0;
  sh.getRange(2, 1, sh.getLastRow() - 1, h.length).getDisplayValues().forEach(function(r){ if (v36ActiveRel_(r[ix['الحالة']]) && !(Number(r[ix['عدد_الحصص_المطلوب']]) > 0)) n++; });
  return n;
}

/** البحث الموحد: اسم / رقم قومي / كود لعامل، أو اسم مدرسة. أقصى 8 عاملين و5 مدارس. */
function adminGlobalSearchV51(token, q){
  v35Admin_(token);
  q = String(q || '').trim(); if (q.length < 2) return {success: true, workers: [], schools: []};
  var digits = v24DigitsLocalV31_(q), nq = v51Norm_(q), words = nq.split(' ').filter(Boolean);
  var d = v24Data_('01_الأساسي'), i = schoolV31Idx_(d.headers), rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), names = v42SchoolNames_(), wschool = {};
  rel.rows.forEach(function(r){ var st = schoolV31Val_(r, ri, 'الحالة'); if (!st || st === 'نشطة') { var e = schoolV31Val_(r, ri, 'employeeId'); if (e && !wschool[e]) wschool[e] = names[schoolV31Val_(r, ri, 'schoolId')] || ''; } });
  var workers = [];
  for (var n = 0; n < d.rows.length && workers.length < 8; n++) {
    var r = d.rows[n], id = schoolV31Val_(r, i, 'employeeId'); if (!id) continue;
    var nid = schoolV31Val_(r, i, 'الرقم_القومي'), code = schoolV31Val_(r, i, 'كود_الموظف'), name = schoolV31Val_(r, i, 'الاسم');
    var hit = digits.length >= 4 ? (String(nid).indexOf(digits) >= 0 || String(code) === digits) : words.every(function(w){ return v51Norm_(name).indexOf(w) >= 0; });
    if (hit) workers.push({employeeId: id, name: name, nationalId: nid, job: schoolV31Val_(r, i, 'المسمى_الوظيفي'), school: wschool[id] || '', status: schoolV31Val_(r, i, 'حالة_السجل')});
  }
  var schools = digits.length >= 4 ? [] : getSchoolsWithCountsV25_().filter(function(s){ return words.every(function(w){ return v51Norm_(s.name).indexOf(w) >= 0; }); }).slice(0, 5).map(function(s){ return {schoolId: s.schoolId, name: s.name, workers: s.workerCount}; });
  return {success: true, workers: workers, schools: schools};
}
function v51Norm_(s){ return String(s || '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim(); }

/** V5.1.1: متابعة معلمي الحصة والمعاش في «الاستحقاقات» — لكل مدرسة: عدد المعلمين النشطين، ما أُدخل وأُرسل، ما حُسب واعتُمد، والمستحق.
 *  المعلم الذي يعمل في مدرستين يُعد في المدرستين، والمستحق يُنسب لمدرسته الأساسية (كما في الاحتساب). */
function adminHrpOverviewV51(token, year, month){
  v35Admin_(token);
  var mo = v36ResolveMonth_(year, month), names = v42SchoolNames_(), by = {};
  function S(sid){ return by[sid] || (by[sid] = {schoolId: sid, name: names[sid] || sid, teachers: 0, entered: 0, sent: 0, computed: 0, approved: 0, warned: 0, amount: 0, ids: {}}); }
  var rel = v40HrpRelSheet_(), ri = schoolV31Idx_(v36Headers_(rel)), rv = rel.getLastRow() > 1 ? rel.getRange(2, 1, rel.getLastRow() - 1, rel.getLastColumn()).getDisplayValues() : [];
  var schoolsOf = {};
  rv.forEach(function(r){ if (!v36ActiveRel_(r[ri['الحالة']])) return; var id = r[ri.hrpId], sid = r[ri.schoolId]; if (!id || !sid) return; var s = S(sid); if (!s.ids[id]) { s.ids[id] = 1; s.teachers++; } (schoolsOf[id] = schoolsOf[id] || {})[sid] = 1; });
  var rd = v40HrpMonthlyRead_(), seenE = {}, seenS = {};
  rd.vals.forEach(function(r){ if (Number(schoolV31Val_(r, rd.ix, 'السنة')) !== mo.year || Number(schoolV31Val_(r, rd.ix, 'الشهر')) !== mo.month) return; var sid = schoolV31Val_(r, rd.ix, 'schoolId'), id = schoolV31Val_(r, rd.ix, 'hrpId'), k = sid + '|' + id; if (!sid) return; var s = S(sid); if (!seenE[k]) { seenE[k] = 1; s.entered++; } if (schoolV31Val_(r, rd.ix, 'حالة_الإدخال') === 'مرسل' && !seenS[k]) { seenS[k] = 1; s.sent++; } });
  var fin = v36Sheet_(V40_HRP_FIN_SHEET), fh = v36Headers_(fin), fx = schoolV31Idx_(fh), fv = fin.getLastRow() > 1 ? fin.getRange(2, 1, fin.getLastRow() - 1, fh.length).getDisplayValues() : [];
  var tot = {teachers: 0, computed: 0, approved: 0, warned: 0, amount: 0, approvedAmount: 0};
  fv.forEach(function(r){ if (Number(r[fx['السنة']]) !== mo.year || Number(r[fx['الشهر']]) !== mo.month || r[fx['حالة_الحساب']] !== 'محسوب') return; var id = r[fx.hrpId], ok = r[fx['حالة_الاعتماد']] === 'معتمد', w = r[fx['تحذير_مدرسة_ثانية']] === 'نعم', val = Number(r[fx['القيمة']]) || 0;
    Object.keys(schoolsOf[id] || {}).concat(schoolsOf[id] ? [] : [r[fx.schoolId]]).forEach(function(sid){ var s = S(sid); s.computed++; if (ok) s.approved++; if (w) s.warned++; });
    var ps = S(r[fx.schoolId]); ps.amount += val; tot.computed++; if (ok) { tot.approved++; tot.approvedAmount += val; } if (w) tot.warned++; tot.amount += val; });
  var list = Object.keys(by).map(function(k){ var s = by[k]; delete s.ids; tot.teachers += s.teachers;
    s.state = s.teachers && s.approved >= s.teachers ? 'approved' : (s.computed ? 'calc' : (s.sent ? 'sent' : (s.entered ? 'draft' : 'notStarted')));
    s.amount = Math.round(s.amount * 100) / 100; return s; }).filter(function(s){ return s.teachers || s.entered || s.computed; });
  list.sort(function(a, b){ return a.name.localeCompare(b.name, 'ar'); });
  return {success: true, month: mo, schools: list, totals: tot};
}

/** V5.1.1: إنهاء خدمة جماعي من قائمة المديرية.
 *  انسخ ورقة الإكسيل (م/الجهة/الاسم/الرقم القومي/تاريخ إنهاء الخدمة/سبب انهاء الخدمة/رقم قرار.../تاريخ قرار...) إلى ورقة «مصدر_إنهاء_الخدمة».
 *  «حذف نهائي» في المنظومة = الموظف «غير قائم» + تُغلق كل علاقاته بالمدارس بعلامة إنهاء نهائي + يُوقف حسابه وصلاحياته،
 *  فيختفي من كل الشاشات والكشوف ولا تستطيع أي مدرسة إضافته، مع بقاء سجله التاريخي (مستحقات سابقة، حركة) بدون كسر.
 *  لا يمس معلمي الحصة والمعاش (كثير من أصحاب المعاش يعملون بالحصة). apply=false معاينة فقط. */
var V51_EOS_SHEET = 'مصدر_إنهاء_الخدمة';
var V51_EOS_COLS = ['تاريخ_إنهاء_الخدمة', 'سبب_إنهاء_الخدمة', 'رقم_قرار_إنهاء_الخدمة', 'تاريخ_قرار_إنهاء_الخدمة'];
var V93_EOS_WARN_ = [];
function adminEndServiceV51(token, apply){
  V93_EOS_WARN_ = [];
  var a = v35Admin_(token), ss = personnelSS_(), src = ss.getSheetByName(V51_EOS_SHEET);
  if (!src || src.getLastRow() < 2) throw new Error('انسخ قائمة إنهاء الخدمة أولًا إلى ورقة «' + V51_EOS_SHEET + '».');
  var sv = src.getRange(1, 1, src.getLastRow(), src.getLastColumn()).getValues(), sh = sv[0].map(function(x){ return String(x).trim(); });
  function col(re){ for (var i = 0; i < sh.length; i++) if (re.test(sh[i])) return i; return -1; }
  var cN = col(/القومي/), cD = col(/^تاريخ\s*إنهاء/), cR = col(/سبب/), cQ = col(/رقم\s*قرار/), cQD = col(/تاريخ\s*قرار/), cName = col(/الاسم/);
  if (cN < 0) throw new Error('لم أجد عمود «الرقم القومي» في ورقة المصدر.');
  var list = {}; sv.slice(1).forEach(function(r){ var n = v24DigitsLocalV31_(typeof r[cN] === 'number' ? r[cN].toFixed(0) : r[cN]); if (n.length === 14) list[n] = {nid: n, name: cName >= 0 ? String(r[cName]).trim() : '', date: cD >= 0 ? v51EosDate_(r[cD]) : '', reason: cR >= 0 ? String(r[cR]).trim() : '', dec: cQ >= 0 ? String(r[cQ]).trim() : '', decDate: cQD >= 0 ? v51EosDate_(r[cQD]) : ''}; });
  var lock = LockService.getScriptLock(); lock.waitLock(30000); v50Fresh_();
  try {
    if (apply) V51_EOS_COLS.forEach(function(c){ v36EnsureCol_('01_الأساسي', c); });
    var bs = ss.getSheetByName('01_الأساسي'), bh = v42Header_(bs), bi = v42Idx_(bh), bv = bs.getRange(2, 1, bs.getLastRow() - 1, bh.length).getValues();
    var rs = ss.getSheetByName('04_علاقات_المدارس'), rh = v42Header_(rs), rix = v42Idx_(rh), rv = rs.getLastRow() > 1 ? rs.getRange(2, 1, rs.getLastRow() - 1, rh.length).getDisplayValues() : [];
    var relBy = {}; rv.forEach(function(r, i){ if (v36ActiveRel_(r[rix['الحالة']])) (relBy[r[rix.employeeId]] = relBy[r[rix.employeeId]] || []).push(i + 2); });
    var found = {}, rep = {total: Object.keys(list).length, matched: 0, alreadyEnded: 0, relationsClosed: 0, notFound: [], done: []};
    bv.forEach(function(r, i){
      var n = v24DigitsLocalV31_(r[bi['الرقم_القومي']]), x = list[n]; if (!x || found[n]) return; found[n] = 1; rep.matched++;
      var eid = String(r[bi.employeeId]), was = String(r[bi['حالة_السجل']] || '').trim(), rels = relBy[eid] || [];
      if (bi['تاريخ_إنهاء_الخدمة'] != null && String(r[bi['تاريخ_إنهاء_الخدمة']] || '').trim() && !rels.length) { rep.alreadyEnded++; return; }
      rep.done.push({name: r[bi['الاسم']], nid: n, reason: x.reason, date: x.date, activeRelations: rels.length, was: was || 'قائم'});
      if (!apply) { rep.relationsClosed += rels.length; return; }
      var u = {}; function put(k, v){ if (bi[k] != null) u[bi[k] + 1] = v; }
      put('الحالة_الوظيفية', 'غير قائم'); put('حالة_السجل', 'غير قائم'); put('قائم_بالعمل', 'لا'); put('سبب_عدم_القيام', 'إنهاء خدمة: ' + x.reason);
      if (bi['حالة_التوجيه'] != null && String(r[bi['حالة_التوجيه']] || '').trim()) put('حالة_التوجيه', 'غير نشط');
      put('تاريخ_إنهاء_الخدمة', x.date); put('سبب_إنهاء_الخدمة', x.reason); put('رقم_قرار_إنهاء_الخدمة', x.dec); put('تاريخ_قرار_إنهاء_الخدمة', x.decDate);
      v50WriteRow_(bs, i + 2, u);
      rels.forEach(function(row){ var q = {}; q[rix['الحالة'] + 1] = 'غير نشطة'; if (rix['تاريخ_النهاية'] != null) q[rix['تاريخ_النهاية'] + 1] = x.date || v40Today_(); if (rix['سبب_الإنهاء'] != null) q[rix['سبب_الإنهاء'] + 1] = x.reason; if (rix['إنهاء_نهائي'] != null) q[rix['إنهاء_نهائي'] + 1] = 'نعم'; if (rix['رقم_القرار'] != null && x.dec) q[rix['رقم_القرار'] + 1] = x.dec; v50WriteRow_(rs, row, q); rep.relationsClosed++; });
      v51EosStopAccess_(eid, n);
    });
    Object.keys(list).forEach(function(n){ if (!found[n]) rep.notFound.push(list[n].name + ' (' + n + ')'); });
    if (apply) { schoolV31Log_(v36Actor_(a), 'إنهاء خدمة جماعي', V51_EOS_SHEET, [['موظفون', '', String(rep.matched)], ['علاقات أُغلقت', '', String(rep.relationsClosed)]]); v50Invalidate_(); }
    rep.success = true; rep.applied = !!apply;
    rep.message = (apply ? 'تم إنهاء خدمة ' : 'معاينة: سيتم إنهاء خدمة ') + rep.matched + ' موظف من ' + rep.total + ' في القائمة، وإغلاق ' + rep.relationsClosed + ' علاقة بالمدارس' + (rep.alreadyEnded ? ' (' + rep.alreadyEnded + ' منتهية خدمتهم من قبل — لا تغيير)' : '') + '. غير موجودين في 01_الأساسي: ' + rep.notFound.length + '.';
    if (V93_EOS_WARN_.length) rep.accessWarnings = V93_EOS_WARN_.slice();   // V7.35: من تعذّر إيقاف حسابه/صلاحياته
    return rep;
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
function v51EosDate_(v){ if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd'); var s = String(v || '').trim(), m; if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2); if ((m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/))) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2); return s; }
function v51EosStopAccess_(eid, nid){
  try { var us = personnelSS_().getSheetByName('R_المستخدمون'), h = v42Header_(us), i = v42Idx_(h), v = v42Values_(us); v.forEach(function(r, n){ if (v24DigitsLocalV31_(r[i.username]) === nid && V49_STAFF_ROLES.indexOf(String(r[i.role])) >= 0 && r[i.status] !== 'موقوف') v50A_(us.getRange(n + 2, i.status + 1).setValue('موقوف')); }); } catch (e) { console.error('v51EosStopAccess_ ' + eid + ': ' + e.message); V93_EOS_WARN_.push(eid); }   // V7.35: كان صامتًا — يُسجَّل ولا يوقف الدفعة
  try { var P = v42PermRows_(); P.v.forEach(function(r, n){ if (v42Val_(r, P.i, 'employeeId') === eid && v42Val_(r, P.i, 'الحالة') !== 'موقوف') v50A_(P.sh.getRange(n + 2, P.i['الحالة'] + 1).setValue('موقوف')); }); V42_PERM_CACHE_ = null; } catch (e) { console.error('v51EosStopAccess_ ' + eid + ': ' + e.message); V93_EOS_WARN_.push(eid); }   // V7.35: كان صامتًا — يُسجَّل ولا يوقف الدفعة
}

/** V5.1.2: دمج مدرسة ملغاة في مدرسة قائمة (مثال: النهضة بكيمان سعيد + روضة كيمان سعيد ← ش. محمد جمال تميم (ب)).
 *  ينقل كل مرجع للمدرسة القديمة في كل الأوراق (أي عمود اسمه schoolId أو ينتهي بـ SchoolId، وقوائم مدارس خط السير)
 *  إلى المدرسة الجديدة، ويغلق العلاقة المكررة لو العامل كان مرتبطًا بالمدرستين، ويسجّل الاسم القديم كاسم بديل في «توحيد_المدارس»
 *  ثم يحذف المدرسة القديمة نهائيًا من 03_المدارس و18_بيانات_المدارس ويحذف حساب دخولها. apply=false معاينة فقط. */
function adminMergeSchoolsV51(token, fromIds, toId, apply){
  var a = v35Admin_(token);
  fromIds = (fromIds || []).map(String).filter(function(x){ return x && x !== String(toId); });
  if (!toId || !fromIds.length) throw new Error('اختر المدرسة الملغاة والمدرسة التي تُدمج فيها.');
  var names = v42SchoolNames_(); if (!names[toId]) throw new Error('المدرسة المستهدفة غير موجودة.');
  var from = {}; fromIds.forEach(function(x){ from[x] = 1; });
  var lock = LockService.getScriptLock(); lock.waitLock(30000); v50Fresh_();
  try {
    var ss = personnelSS_(), rep = {refs: {}, dupClosed: 0, deleted: [], accounts: 0};
    ss.getSheets().forEach(function(sh){
      var n = sh.getName(), lr = sh.getLastRow(), lc = sh.getLastColumn(); if (lr < 2 || lc < 1) return;
      var h = sh.getRange(1, 1, 1, lc).getDisplayValues()[0], cols = [];
      h.forEach(function(k, j){ k = String(k).trim(); if (/^schoolId/i.test(k) || /SchoolId$/.test(k) || k === 'مدارس_خط_السير' || (n === ROUTE_V41.routeSheet && k === 'المدارس')) cols.push(j); });
      if (!cols.length || n === '03_المدارس' || n === '18_بيانات_المدارس') return;
      cols.forEach(function(j){
        var rg = sh.getRange(2, j + 1, lr - 1, 1), v = rg.getValues(), ch = 0;
        v.forEach(function(r){ var s = String(r[0] || ''); if (from[s]) { r[0] = toId; ch++; } else if (s.indexOf('|') >= 0 || s.indexOf(',') >= 0) { var parts = s.split(/([|,])/), hit = false; parts = parts.map(function(p){ if (from[p.trim()]) { hit = true; return toId; } return p; }); if (hit) { r[0] = parts.join(''); ch++; } } });
        if (ch) { rep.refs[n + ' › ' + h[j]] = ch; if (apply) v50A_(rg.setValues(v)); }
      });
    });
    // علاقات مكررة بعد الدمج: نفس العامل له علاقتان نشطتان بنفس المدرسة → تُغلق الأحدث
    var rs = ss.getSheetByName('04_علاقات_المدارس'), rh = v42Header_(rs), ri = v42Idx_(rh), rv = rs.getRange(2, 1, rs.getLastRow() - 1, rh.length).getDisplayValues(), seen = {};
    rv.forEach(function(r, i){ var sid = from[r[ri.schoolId]] ? String(toId) : r[ri.schoolId]; if (sid !== String(toId) || !v36ActiveRel_(r[ri['الحالة']])) return; var k = r[ri.employeeId];
      if (seen[k]) { rep.dupClosed++; if (apply) { var q = {}; q[ri['الحالة'] + 1] = 'غير نشطة'; if (ri['تاريخ_النهاية'] != null) q[ri['تاريخ_النهاية'] + 1] = v40Today_(); if (ri['ملاحظات'] != null) q[ri['ملاحظات'] + 1] = 'علاقة مكررة بعد دمج مدرسة ملغاة في ' + names[toId]; v50WriteRow_(rs, i + 2, q); } } else seen[k] = 1; });
    if (apply) {
      var al = ss.getSheetByName('توحيد_المدارس');
      if (al) { var ah = v42Header_(al), ai = v42Idx_(ah); fromIds.forEach(function(id){ var row = new Array(ah.length).fill(''); row[0] = names[id] || id; if (ai['الاسم_المعياري'] != null) row[ai['الاسم_المعياري']] = names[toId]; if (ai['schoolId_الجديد'] != null) row[ai['schoolId_الجديد']] = toId; if (ai['الحالة'] != null) row[ai['الحالة']] = 'مدمجة — المدرسة ملغاة'; if (ai['ملاحظة'] != null) row[ai['ملاحظة']] = 'أُلغيت ودُمجت في ' + names[toId] + ' بتاريخ ' + v40Today_(); v50A_(al.appendRow(row)); }); }
      ['03_المدارس', '18_بيانات_المدارس'].forEach(function(n){ var sh = ss.getSheetByName(n); if (!sh || sh.getLastRow() < 2) return; var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues(); for (var i = ids.length - 1; i >= 0; i--) if (from[String(ids[i][0]).trim()]) { v50A_(sh.deleteRow(i + 2)); rep.deleted.push(n); } });
      var us = ss.getSheetByName('R_المستخدمون'), uh = v42Header_(us), ui = v42Idx_(uh), uv = us.getRange(2, 1, us.getLastRow() - 1, uh.length).getDisplayValues();
      for (var k = uv.length - 1; k >= 0; k--) if (from[String(uv[k][ui.schoolId]).trim()] && uv[k][ui.role] === 'مدرسة') { v50A_(us.deleteRow(k + 2)); rep.accounts++; }
      schoolV31Log_(v36Actor_(a), 'دمج مدرسة ملغاة', fromIds.map(function(x){ return names[x] || x; }).join('، ') + ' ← ' + names[toId], Object.keys(rep.refs).map(function(k){ return [k, '', String(rep.refs[k])]; }));
      v50Invalidate_();
    }
    var total = Object.keys(rep.refs).reduce(function(s, k){ return s + rep.refs[k]; }, 0);
    rep.success = true; rep.applied = !!apply;
    rep.message = (apply ? 'تم الدمج: ' : 'معاينة: ') + fromIds.map(function(x){ return names[x] || x; }).join(' + ') + ' ← ' + names[toId] + ' — ' + total + ' مرجع' + (rep.dupClosed ? '، ' + rep.dupClosed + ' علاقة مكررة ستُغلق' : '') + (apply ? '، وحُذفت المدرسة القديمة وحساب دخولها.' : '.');
    return rep;
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

/** V5.1.4: فتح الشهر لأنظمة محددة فقط (مثال سبتمبر: فوق النصاب + معلمو الحصة والمعاش).
 *  الإعداد OPEN_SYSTEMS = قائمة مفصولة بفاصلة من: days, periods, over, hourly. فارغ = كل الأنظمة مفتوحة (السلوك القديم).
 *  «منظومة حصص + فوق النصاب» عند فتح فوق النصاب وحده: يظهر العامل ويُحسب له فوق النصاب فقط. */
var V51_SYS_LABELS = {days: 'منظومة أيام', periods: 'منظومة حصص', over: 'فوق النصاب', hourly: 'معلمو الحصة والمعاش (حصة جدد + معاش)'};
function v51OpenSystems_(entry){
  // V5.6: الأنظمة المفتوحة للشهر المحدد (أو الشهر الجاري معالجته في هذا التنفيذ).
  if (typeof v56OpenSystemsFor_ === 'function') return v56OpenSystemsFor_(entry || V56_CTX_ || v56Default_());
  var v = String(v36GetSetting_('OPEN_SYSTEMS', '') || '').trim(), o;
  if (!v) return {days: true, periods: true, over: true, hourly: true, all: true, list: Object.keys(V51_SYS_LABELS)};
  o = {days: false, periods: false, over: false, hourly: false};
  v.split(',').forEach(function(k){ k = k.trim(); if (o.hasOwnProperty(k)) o[k] = true; });
  o.all = o.days && o.periods && o.over && o.hourly; o.list = Object.keys(V51_SYS_LABELS).filter(function(k){ return o[k]; });
  return o;
}
/** النظام الفعّال لهذا الشهر حسب ما هو مفتوح؛ '' = العامل لا يُدخل له شيء هذا الشهر. */
function v51EffectiveSystem_(sys, os){
  os = os || v51OpenSystems_(); sys = String(sys || '').trim();
  if (os.all) return sys || '';
  if (sys === V36_SYSTEMS.DAYS) return os.days ? sys : '';
  if (sys === V36_SYSTEMS.PERIODS) return os.periods ? sys : '';
  if (sys === V36_SYSTEMS.OVER) return os.over ? sys : '';
  if (sys === V36_SYSTEMS.BOTH) { if (os.periods && os.over) return sys; if (os.over) return V36_SYSTEMS.OVER; if (os.periods) return V36_SYSTEMS.PERIODS; return ''; }
  if (/حصة|حصه/.test(sys) || /معاش/.test(sys)) return os.hourly ? sys : '';
  return '';
}
function v51BasicOpen_(os){ os = os || v51OpenSystems_(); return os.days || os.periods || os.over; }
