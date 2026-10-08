/** V5.6 — فتح أكثر من شهر في نفس الوقت + حساب أيام العمل تلقائيًا.
 *
 * الإعداد OPEN_MONTHS في R_الإعدادات = JSON: [{year, month, workdays, systems, status}]
 *   systems: '' = كل الأنظمة، أو قائمة مفصولة بفاصلة من days,periods,over,hourly.
 *   status : 'مفتوح' | 'مغلق'.
 * لو الإعداد فارغ يُبنى شهر واحد من الإعدادات القديمة (OPEN_YEAR/OPEN_MONTH/...) — لا يتغير شيء لمن لم يستخدم الشاشة الجديدة.
 * أيام العمل = أيام الشهر − الجمعة والسبت (V7.3: الإجازات الرسمية تُحسب أيام عمل ولا تُخصم)؛ والإدارة تعدّل الرقم إن لزم.
 */
var V56_MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
var V56_WEEKEND = [5, 6];   // الجمعة والسبت
/** الإجازات الرسمية في مصر (holidaydb.com) — تُعدَّل من إعدادات الشهر. */
var V56_DEFAULT_HOLIDAYS = [
  ['2026-01-07', 'عيد الميلاد المجيد'], ['2026-01-25', 'عيد الشرطة وثورة يناير'], ['2026-01-29', 'بدل إجازة 25 يناير'],
  ['2026-03-19', 'عيد الفطر'], ['2026-03-20', 'عيد الفطر'], ['2026-03-21', 'عيد الفطر'], ['2026-03-22', 'عيد الفطر'], ['2026-03-23', 'عيد الفطر'],
  ['2026-04-13', 'شم النسيم'], ['2026-04-25', 'عيد تحرير سيناء'], ['2026-05-01', 'عيد العمال'],
  ['2026-05-26', 'وقفة عرفات'], ['2026-05-27', 'عيد الأضحى'], ['2026-05-28', 'عيد الأضحى'], ['2026-05-29', 'عيد الأضحى'], ['2026-05-30', 'عيد الأضحى'], ['2026-05-31', 'عيد الأضحى'],
  ['2026-06-18', 'رأس السنة الهجرية'], ['2026-06-30', 'ثورة 30 يونيو'], ['2026-07-02', 'بدل إجازة 30 يونيو'], ['2026-07-23', 'ثورة 23 يوليو'],
  ['2026-08-27', 'المولد النبوي'], ['2026-10-06', 'عيد القوات المسلحة'], ['2026-10-08', 'بدل إجازة 6 أكتوبر'],
  ['2027-01-07', 'عيد الميلاد المجيد'], ['2027-01-25', 'عيد الشرطة وثورة يناير'], ['2027-01-28', 'بدل إجازة 25 يناير'],
  ['2027-03-10', 'عيد الفطر'], ['2027-03-11', 'عيد الفطر'], ['2027-03-12', 'عيد الفطر'], ['2027-04-25', 'عيد تحرير سيناء'], ['2027-05-01', 'عيد العمال'], ['2027-05-03', 'شم النسيم'],
  ['2027-05-16', 'وقفة عرفات'], ['2027-05-17', 'عيد الأضحى'], ['2027-05-18', 'عيد الأضحى'], ['2027-05-19', 'عيد الأضحى'],
  ['2027-06-07', 'رأس السنة الهجرية'], ['2027-06-30', 'ثورة 30 يونيو'], ['2027-07-01', 'بدل إجازة 30 يونيو'], ['2027-07-23', 'ثورة 23 يوليو'],
  ['2027-08-15', 'المولد النبوي'], ['2027-10-06', 'عيد القوات المسلحة'], ['2027-10-07', 'بدل إجازة 6 أكتوبر']
];
var V56_CTX_ = null;   // الشهر الجاري معالجته في هذا التنفيذ (يضبطه v36ResolveMonth_)

function v56Holidays_(){
  var raw = String(v36GetSetting_('HOLIDAYS', '') || '').trim();
  if (raw) { try { var a = JSON.parse(raw); if (Array.isArray(a)) return a.filter(function(x){ return x && /^\d{4}-\d{2}-\d{2}$/.test(String(x[0])); }); } catch (e) {} }
  return V56_DEFAULT_HOLIDAYS.slice();
}
function v56Pad_(n){ return (n < 10 ? '0' : '') + n; }
/** أيام العمل الفعلية للشهر + الإجازات الواقعة في أيام عمل. */
function v56Workdays_(year, month, startDay){
  year = Number(year); month = Number(month); if (!year || !month) return {workdays: 0, holidays: []};
  var sd = Number(startDay) || 1;   // V7.49: بداية الدراسة داخل الشهر (مثلاً 13 سبتمبر)
  var hol = {}; v56Holidays_().forEach(function(x){ hol[x[0]] = x[1]; });
  var days = new Date(year, month, 0).getDate(), n = 0, used = [];
  for (var d = sd; d <= days; d++) {
    var dt = new Date(year, month - 1, d), key = year + '-' + v56Pad_(month) + '-' + v56Pad_(d);
    if (V56_WEEKEND.indexOf(dt.getDay()) >= 0) continue;
    if (hol[key]) used.push([key, hol[key]]);   // V7.3: الإجازة الرسمية تُحسب يوم عمل (لا تُخصم من أيام العمل الفعلية)
    n++;
  }
  return {workdays: n, holidays: used};
}
function v56NormSystems_(v){
  var ks = String(v || '').split(',').map(function(x){ return x.trim(); }).filter(function(k){ return ['days', 'periods', 'over', 'hourly'].indexOf(k) >= 0; });
  return ks.length === 4 ? '' : ks.join(',');
}
/** قائمة الأشهر المُعرَّفة (الأحدث أولًا). */
function v56Months_(){
  var raw = String(v36GetSetting_('OPEN_MONTHS', '') || '').trim(), list = [];
  if (raw) { try { list = JSON.parse(raw) || []; } catch (e) { list = []; } }
  if (!list.length) {
    var y = Number(v36GetSetting_('OPEN_YEAR', '')) || 0, m = Number(v36GetSetting_('OPEN_MONTH', '')) || 0;
    if (y && m) list = [{year: y, month: m, workdays: Number(v36GetSetting_('OPEN_WORKDAYS', '')) || 0, systems: String(v36GetSetting_('OPEN_SYSTEMS', '') || ''), status: v36GetSetting_('MONTH_STATUS', 'مفتوح')}];
  }
  list = list.filter(function(x){ return x && Number(x.year) && Number(x.month) >= 1 && Number(x.month) <= 12; }).map(function(x){
    return {year: Number(x.year), month: Number(x.month), startDay: Math.min(31, Math.max(1, Number(x.startDay) || 1)), workdays: Number(x.workdays) || 0, systems: v56NormSystems_(x.systems === undefined ? 'days,periods,over,hourly' : (x.systems || 'days,periods,over,hourly')), status: x.status === 'مغلق' ? 'مغلق' : 'مفتوح'};
  });
  list.sort(function(a, b){ return (b.year * 12 + b.month) - (a.year * 12 + a.month); });
  return list;
}
function v56Find_(year, month){ var l = v56Months_(); for (var i = 0; i < l.length; i++) if (l[i].year === Number(year) && l[i].month === Number(month)) return l[i]; return null; }
/** الشهر الافتراضي عند عدم التحديد: أقدم شهر مفتوح، وإلا أحدث شهر. */
function v56Default_(){ var l = v56Months_(); for (var i = l.length - 1; i >= 0; i--) if (l[i].status === 'مفتوح') return l[i]; return l[0] || null; }   // أقدم شهر مفتوح (يُستكمل أولًا)
function v56Label_(x){ return V56_MONTH_NAMES[x.month - 1] + ' ' + x.year; }

/* ===== الأنظمة المفتوحة (لكل شهر) — يحل محل الإعداد الواحد OPEN_SYSTEMS ===== */
function v56OpenSystemsFor_(entry){
  var v = entry ? String(entry.systems || '') : '', o;
  if (!v) return {days: true, periods: true, over: true, hourly: true, all: true, list: Object.keys(V51_SYS_LABELS)};
  o = {days: false, periods: false, over: false, hourly: false};
  v.split(',').forEach(function(k){ k = k.trim(); if (o.hasOwnProperty(k)) o[k] = true; });
  o.all = o.days && o.periods && o.over && o.hourly; o.list = Object.keys(V51_SYS_LABELS).filter(function(k){ return o[k]; });
  return o;
}

/* ===== واجهات الإدارة ===== */
function adminMonthsV56(token){
  v35Admin_(token);
  var months = v56Months_().map(function(x){ var w = v56Workdays_(x.year, x.month); /* V7.51: بداية الدراسة لا تغيّر أيام العمل */ x.label = v56Label_(x); x.autoWorkdays = w.workdays; x.monthHolidays = w.holidays; return x; });
  return {success: true, months: months, holidays: v56Holidays_(), monthNames: V56_MONTH_NAMES, weekend: 'الجمعة والسبت', hrpCountHolidays: (typeof v98HrpHol_ === 'function') ? v98HrpHol_() : false};
}
function adminMonthWorkdaysV56(token, year, month){ v35Admin_(token); var w = v56Workdays_(year, month); w.success = true; return w; }
/** حفظ قائمة الأشهر كاملة. كل شهر: سنة، شهر، أيام عمل (1-31)، أنظمة (واحد على الأقل)، حالة. */
function adminSaveMonthsV56(token, list){
  var a = v35Admin_(token), seen = {}, clean = [];
  (list || []).forEach(function(x){
    var y = Number(x.year), m = Number(x.month), wd = Number(String(x.workdays || '').replace(/[^\d]/g, ''));
    if (!(y >= 2020 && y <= 2100) || !(m >= 1 && m <= 12)) throw new Error('سنة أو شهر غير صحيح.');
    var k = y + '-' + m; if (seen[k]) throw new Error('الشهر ' + V56_MONTH_NAMES[m - 1] + ' ' + y + ' مكرر.'); seen[k] = 1;
    if (!(wd >= 1 && wd <= 31)) throw new Error('أيام العمل لشهر ' + V56_MONTH_NAMES[m - 1] + ' ' + y + ' يجب أن تكون من 1 إلى 31.');
    var sys = String(x.systems || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    if (!sys.length) throw new Error('اختر نظامًا واحدًا على الأقل لشهر ' + V56_MONTH_NAMES[m - 1] + ' ' + y + '، أو اجعله «مغلق».');
    var sd = Number(String(x.startDay || '1').replace(/[^\d]/g, '')) || 1; if (sd < 1 || sd > new Date(y, m, 0).getDate()) throw new Error('بداية الدراسة لشهر ' + V56_MONTH_NAMES[m - 1] + ' ' + y + ' غير صحيحة.');   // V7.49
    clean.push({year: y, month: m, startDay: sd, workdays: wd, systems: v56NormSystems_(sys.join(',')), status: x.status === 'مغلق' ? 'مغلق' : 'مفتوح'});
  });
  clean.sort(function(p, q){ return (q.year * 12 + q.month) - (p.year * 12 + p.month); });
  return v35Lock_(function(){
    var old = String(v36GetSetting_('OPEN_MONTHS', '') || '');
    v36SetSetting_('OPEN_MONTHS', JSON.stringify(clean), 'الأشهر المفتوحة/المغلقة للاستحقاقات (V5.6)');
    // توافق مع الإعدادات القديمة (بوابة الموظف وغيرها): تُضبط على الشهر الافتراضي.
    var d = null; for (var i = clean.length - 1; i >= 0; i--) if (clean[i].status === 'مفتوح') { d = clean[i]; break; } d = d || clean[0];
    if (d) { v36SetSetting_('OPEN_YEAR', String(d.year), 'السنة المفتوحة'); v36SetSetting_('OPEN_MONTH', String(d.month), 'الشهر المفتوح'); v36SetSetting_('OPEN_WORKDAYS', String(d.workdays), 'أيام العمل'); v36SetSetting_('MONTH_STATUS', d.status, 'حالة الشهر'); v36SetSetting_('OPEN_SYSTEMS', d.systems, 'الأنظمة المفتوحة'); }
    schoolV31Log_(v36Actor_(a), 'تعديل الأشهر المفتوحة', 'OPEN_MONTHS', [['الأشهر', old.slice(0, 200), JSON.stringify(clean).slice(0, 200)]]);
    return {success: true, message: 'تم حفظ ' + clean.length + ' شهر (' + clean.filter(function(x){ return x.status === 'مفتوح'; }).length + ' مفتوح).'};
  });
}
function adminSaveHolidaysV56(token, list){
  var a = v35Admin_(token), clean = (list || []).map(function(x){ return [String(x[0] || '').trim(), String(x[1] || '').trim()]; }).filter(function(x){ return /^\d{4}-\d{2}-\d{2}$/.test(x[0]); });
  clean.sort(function(p, q){ return p[0] < q[0] ? -1 : 1; });
  return v35Lock_(function(){ v36SetSetting_('HOLIDAYS', JSON.stringify(clean), 'الإجازات الرسمية (V5.6)'); schoolV31Log_(v36Actor_(a), 'تعديل الإجازات الرسمية', 'HOLIDAYS', [['العدد', '', String(clean.length)]]); return {success: true, message: 'تم حفظ ' + clean.length + ' إجازة.'}; });
}
/** قائمة الأشهر للمدرسة (للقائمة المنسدلة). */
function v56MonthsForSchool_(){ return v56Months_().map(function(x){ return {year: x.year, month: x.month, label: v56Label_(x), status: x.status}; }); }
