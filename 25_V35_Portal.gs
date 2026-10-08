/** V3.5 — طبقة موحّدة للمدرسة والإدارة (تعديل العاملين، بيانات المدارس والمسؤولين، الصور، الجلسات، التنظيف الآمن).
 *  لا يعتمد على app4 أثناء التشغيل. كل الدوال العامة هنا تتحقق من الجلسة قبل أي قراءة أو كتابة.
 */
var V35_WORKER_FIELDS = ['الرقم_القومي', 'كود_الموظف', 'الاسم', 'النوع', 'تاريخ_الميلاد', 'الهاتف', 'البريد', 'العنوان', 'الصفة', 'الحالة_الوظيفية', 'تاريخ_التعيين', 'الدرجة_المالية', 'تاريخ_الحصول_على_الدرجة', 'المجموعة_الوظيفية', 'المسمى_الوظيفي', 'مادة_التدريس', 'المرحلة_التعليمية_الأصلية', 'نظام_العمل', 'الوظيفة_الإشرافية', 'مشرف_على_المادة', 'نوع التعليم', 'تاريخ_بدء_العمل'];   // V7.2: + الإشرافية ومشرف المادة (كانت لا تُحمَّل ولا تُحفظ من الإدارة)
var V35_HEADER_ALIASES = {};

/* ============ أدوات عامة ============ */
/** يحوّل dd/mm/yyyy أو d/m/yyyy أو yyyy-mm-dd إلى yyyy-mm-dd، ويعيد '' إن لم يكن تاريخًا صالحًا. */
function v35Date_(v) {
  var s = String(v == null ? '' : v).trim(), m;
  if (!s) return '';
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}
/** فهرس أعمدة متسامح: يقبل الشرطة السفلية أو المسافة، ويدعم الأسماء البديلة. */
function v35TolIdx_(headers) {
  var m = {};
  (headers || []).forEach(function (h, i) {
    var k = String(h == null ? '' : h).trim(); if (!k) return;
    [k, k.replace(/ /g, '_'), k.replace(/_/g, ' ')].forEach(function (x) { if (m[x] == null) m[x] = i; });
  });
  Object.keys(V35_HEADER_ALIASES).forEach(function (a) { var t = m[V35_HEADER_ALIASES[a]]; if (t != null) m[a] = t; });
  return m;
}
function v35Admin_(token) { return requireAdminSessionV29_(token); }
function v35Lock_(fn) {
  var lock = LockService.getScriptLock(); lock.waitLock(15000);v50Fresh_();
  try { return fn(); } finally { try { lock.releaseLock(); } catch (e) {} }
}
var V93_SCH_MEMO_ = null;
function v35SchoolRow_(schoolId) {   // سجل المدرسة من 18 مع رؤوسه
  var sh = personnelSS_().getSheetByName('18_بيانات_المدارس');
  if (!sh) throw new Error('ورقة 18_بيانات_المدارس غير موجودة.');
  /* V7.35: قراءة واحدة لكل تنفيذ (كانت تُقرأ الورقة كاملة عند كل استدعاء). في وضع الحفظ (V50_DIRTY_) نقرأ من الشيت مباشرة. */
  var M = (!V50_DIRTY_ && V93_SCH_MEMO_) ? V93_SCH_MEMO_ : null;
  if (!M) { var lc = sh.getLastColumn(), h0 = sh.getRange(1, 1, 1, lc).getDisplayValues()[0]; M = { sh: sh, h: h0, ix: schoolV31Idx_(h0), v: sh.getRange(2, 1, Math.max(0, sh.getLastRow() - 1), lc).getDisplayValues() }; if (!V50_DIRTY_) V93_SCH_MEMO_ = M; }
  var h = M.h, ix = M.ix, v = M.v;
  for (var r = 0; r < v.length; r++) if (String(v[r][ix.schoolId]) === String(schoolId)) return { sh: sh, h: h, ix: ix, row: r + 2, vals: v[r].slice() };
  throw new Error('سجل المدرسة غير موجود.');
}
/** ملء بيانات المسؤولين الفارغة من مصدر_حصة_المدارس دون الكتابة فوق أي قيمة موجودة. */
function v35FillOfficials_(vals, ix, schoolName) {
  try {
    var map = { 'اسم_المدير': 'اسم المدير', 'هاتف_المدير': 'هاتف المدير', 'اسم_الوكيل': 'اسم الوكيل', 'هاتف_الوكيل': 'هاتف الوكيل', 'مسؤول_الأمن': 'مسؤول الأمن', 'هاتف_الأمن': 'هاتف الأمن', 'مسؤول_القاعدة': 'مسؤول القاعدة', 'هاتف_القاعدة': 'هاتف مسؤول القاعدة' };
    var hasMissing = Object.keys(map).some(function (k) { return ix[k] != null && !String(vals[ix[k]] || '').trim(); });
    if (!hasMissing) return; // جميع بيانات القيادة موجودة بالفعل ولا حاجة لقراءة الشيت
    var src = personnelSS_().getSheetByName('مصدر_حصة_المدارس'); if (!src || src.getLastRow() < 2) return;
    var d = src.getDataRange().getDisplayValues(), si = schoolV31Idx_(d[0]);
    var target = personnelNormalizeSchoolNameV1_(schoolName);
    for (var r = 1; r < d.length; r++) {
      if (personnelNormalizeSchoolNameV1_(d[r][si['اسم المدرسة']]) !== target) continue;
      Object.keys(map).forEach(function (k) { if (ix[k] != null && !String(vals[ix[k]] || '').trim() && si[map[k]] != null) vals[ix[k]] = d[r][si[map[k]]] || ''; });
      break;
    }
  } catch (e) {}
}
function v35SchoolProfile_(schoolId) {
  var x = v35SchoolRow_(schoolId), vals = x.vals.slice();
  v35FillOfficials_(vals, x.ix, vals[x.ix['اسم_المدرسة']]);
  var f = {}; x.h.forEach(function (k, i) { if (k && SCHOOL_V33_TECH_FIELDS.school.indexOf(k) < 0) f[k] = vals[i] || ''; });
  return f;
}
function v35Options_() {
  function uniq(sheet, col) { try { var d = v24Data_(sheet), i = d.headers.indexOf(col), m = {}; if (i < 0) return []; d.rows.forEach(function (r) { var x = String(r[i] || '').trim(); if (x) m[x] = 1; }); return Object.keys(m).sort(function (a, b) { return a.localeCompare(b, 'ar'); }); } catch (e) { return []; } }
  var o = {};
  o.job = v67JobOptions_(uniq('R_المسميات_الوظيفية', 'المسمى_الوظيفي')); o.stage = uniq('R_المراحل', 'اسم_المرحلة'); o.workSystem = uniq('R_أنظمة_العمل', 'نظام_العمل'); ['معلم حصة','معاش'].forEach(function(x){ if(o.workSystem.indexOf(x)<0) o.workSystem.push(x); });
  o.type = ['ذكر', 'أنثى']; o.employment = ['قائم', 'غير قائم']; o.staffStatus=['مسكن علي الكادر','غير مخاطب']; o.jobGroup=['التخصصية','المكتبية','الفنية','وظائف التعليم','وظائف القانون','وظائف التمويل والمحاسبة','وظائف التنمية الإدارية','الخدمات المعاونة']; o.degree = uniq('R_الدرجات_المالية', 'الدرجة_المالية');
  o.subject = v72SubjectOptions_(uniq('R_المواد', 'اسم_المادة')); o.relation = v81RelationLabels_(); o.moveTypes = v81MovementLabels_();
  o.stats = ['تم الإدخال', 'مراجعة', 'مكتمل']; o.disability = ['حركية', 'بصرية', 'سمعية', 'ذهنية', 'توحد', 'أخرى']; o.disabilityDegree = ['بسيطة', 'متوسطة', 'شديدة'];
  o.yesno = ['نعم', 'لا'];
  o.supervisoryJob = schoolSupervisoryOptionsV40_(true);
  o.schools = []; try { var nm=v93SchoolNameMap_(); o.schools=Object.keys(nm).map(function(id){return {id:id,name:nm[id]};}).sort(function(a,b){return String(a.name).localeCompare(String(b.name),'ar');}); } catch(e) {}
  return o;
}

/* ============ الجلسة ============ */
/** استعادة الجلسة بعد تحديث الصفحة (يعيد بيانات المستخدم دون كلمة المرور). */
function sessionInfoV35(token) {
  var s = getSchoolSessionV271(token); if (!s) return { success: false };
  var out = { success: true, role: s.role, user: { role: s.role, school: s.school || '', schoolId: s.schoolId || '', username: s.username || '', name: s.name || '', stages: [] } };
  if (s.role === 'مدرسة') { var m = v271BuildLocalSchoolMap_()[v271Norm_(s.school)] || {}; out.user.stages = m.stages || []; out.user.viaAdmin = s.viaAdmin || ''; }
  if (s.role === 'موجه') { out.user.employeeId = s.employeeId || ''; out.user.supervisorId = s.supervisorId || ''; out.user.nationalId = s.username || ''; }
  return out;
}
/** دخول الإدارة كمدرسة (كما في app4) — جلسة مدرسة جديدة، وتبقى جلسة الإدارة محفوظة عند المتصفح للعودة. */
function adminEnterSchoolV35(token, schoolId) {
  var a = v35Admin_(token), x = v35SchoolRow_(schoolId), name = String(x.vals[x.ix['اسم_المدرسة']] || '').trim();
  var u = v271UserForSchool_(name), t = Utilities.getUuid().replace(/-/g, '');
  var ses = { role: 'مدرسة', school: name, schoolId: String(schoolId), username: (u && u.username) || ('admin:' + a.username), name: 'عرض الإدارة', stage: (u && u.stage) || '', viaAdmin: a.username };
  CacheService.getScriptCache().put('V271_SES_' + t, JSON.stringify(ses), 21600);
  var m = v271BuildLocalSchoolMap_()[v271Norm_(name)] || {};
  return { success: true, token: t, user: { role: 'مدرسة', school: name, schoolId: String(schoolId), username: ses.username, name: ses.name, stages: m.stages || [], viaAdmin: a.username } };
}
function schoolChangePasswordV35(token, oldPw, newPw) {
  var s = schoolV31Session_(token); oldPw = String(oldPw == null ? '' : oldPw).trim(); newPw = String(newPw == null ? '' : newPw).trim();
  if (s.viaAdmin) throw new Error('تغيير كلمة المرور غير متاح أثناء عرض الإدارة للمدرسة.');
  if (newPw.length < 4) throw new Error('كلمة المرور الجديدة يجب ألا تقل عن 4 خانات.');
  if (newPw === oldPw) throw new Error('كلمة المرور الجديدة مطابقة للحالية.');
  return v35Lock_(function () {
    var sh = personnelSS_().getSheetByName('R_المستخدمون'), lc = sh.getLastColumn(), h = sh.getRange(1, 1, 1, lc).getDisplayValues()[0], ix = schoolV31Idx_(h);
    var v = sh.getRange(2, 1, Math.max(0, sh.getLastRow() - 1), lc).getDisplayValues();
    for (var i = 0; i < v.length; i++) {
      if (String(v[i][ix.role]).trim() === 'مدرسة' && String(v[i][ix.username]).trim() === String(s.username).trim()) {
        if (String(v[i][ix.password]).trim() !== oldPw) throw new Error('كلمة المرور الحالية غير صحيحة.');
        v50A_(sh.getRange(i + 2, ix.password + 1).setValue(newPw)); schoolV31Log_(s, 'تغيير كلمة مرور المدرسة', s.schoolId, []);
        return { success: true, message: 'تم تغيير كلمة المرور.' };
      }
    }
    throw new Error('حساب المدرسة غير موجود.');
  });
}

/* ============ بيانات المدرسة (مدرسة + إدارة) ============ */
function schoolHomeV35(token) {
  var s = schoolV31Session_(token), p = v35SchoolProfile_(s.schoolId), rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), n = 0;
  var emp68 = v24Data_('01_الأساسي'), ei68 = schoolV31Idx_(emp68.headers), ok68 = {}, seen68 = {};   // V6.8: نفس عدّ جدول العاملين واللوحة
  emp68.rows.forEach(function (r) { if (schoolV31Val_(r, ei68, 'حالة_السجل') !== 'غير قائم') ok68[schoolV31Val_(r, ei68, 'employeeId')] = 1; });
  rel.rows.forEach(function (r) { if (schoolV31Val_(r, ri, 'schoolId') === s.schoolId) { var st = schoolV31Val_(r, ri, 'الحالة'), e = schoolV31Val_(r, ri, 'employeeId'); if ((!st || st === 'نشطة' || st === 'فعال' || st === 'قائم') && ok68[e] && !seen68[e]) { seen68[e] = 1; n++; } } });
  var stu = 0; try { var d = v24Data_('13_شؤون_الطلاب'), i = schoolV31Idx_(d.headers); d.rows.forEach(function (r) { if (schoolV31Val_(r, i, 'schoolId') === s.schoolId) stu += Number(schoolV31Val_(r, i, 'إجمالي الطلاب')) || 0; }); } catch (e) {}
  return { success: true, workers: n, students: stu, school: p };
}
function adminSchoolProfileV35(token, schoolId) { v35Admin_(token); var p = v35SchoolProfile_(schoolId); return { success: true, fields: p }; }
function v35SaveSchoolCore_(schoolId, payload, actor, allowIdentity) {
  if (payload && payload['رابط_اللوكيشن'] !== undefined) {
    var loc = String(payload['رابط_اللوكيشن'] || '').trim();
    if (loc && !/^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)/i.test(loc)) {
      var mLoc = loc.replace(/[٠-٩]/g, function (c) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(c); }).match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,،]\s*(-?\d{1,3}(?:\.\d+)?)$/);
      if (mLoc) { var la = Number(mLoc[1]), lo = Number(mLoc[2]); if (Math.abs(la) > 90 || Math.abs(lo) > 180) throw new Error('إحداثيات اللوكيشن خارج النطاق الصحيح.'); payload['رابط_اللوكيشن'] = 'https://www.google.com/maps?q=' + la + ',' + lo; }
      else throw new Error('رابط اللوكيشن يجب أن يكون رابط خرائط جوجل أو إحداثيات (مثل 27.18, 31.18).');
    }
    v36EnsureCol_('18_بيانات_المدارس', 'رابط_اللوكيشن');
  }
  var x = v35SchoolRow_(schoolId), p = payload || {}, h = x.h;
  ['كود_هيئة_الأبنية', 'هاتف', 'هاتف_المدير', 'هاتف_الوكيل', 'هاتف_الأمن', 'هاتف_القاعدة'].forEach(function (k) { if (p[k] !== undefined && p[k] !== '' && v24DigitsLocalV31_(p[k]).length < 5) throw new Error('القيمة في ' + k.replace(/_/g, ' ') + ' غير صحيحة.'); });
  if (p['اسم_المدرسة'] !== undefined && !allowIdentity) delete p['اسم_المدرسة'];
  var allowed = h.filter(function (k) { return k && SCHOOL_V33_TECH_FIELDS.school.indexOf(k) < 0; });
  return v35Lock_(function () {
    var changes = schoolV33Write_(x.sh, x.row, h, p, SCHOOL_V33_TECH_FIELDS.school, allowed);
    var now = new Date(), i = h.indexOf('آخر_تحديث'), u = h.indexOf('آخر_مستخدم');
    if (i >= 0) v50A_(x.sh.getRange(x.row, i + 1).setValue(now)); if (u >= 0) v50A_(x.sh.getRange(x.row, u + 1).setValue(actor.username || 'admin'));
    // مزامنة الحقول المشتركة إلى 03_المدارس مع بقاء schoolId ثابتًا
    try {
      var core = personnelSS_().getSheetByName('03_المدارس');
      if (core) {
        var ch = core.getRange(1, 1, 1, core.getLastColumn()).getDisplayValues()[0], ci = ch.indexOf('schoolId'), cr = core.getRange(2, 1, Math.max(0, core.getLastRow() - 1), core.getLastColumn()).getDisplayValues(), cm = schoolV31Idx_(ch);
        for (var rr = 0; rr < cr.length; rr++) if (String(cr[rr][ci]) === String(schoolId)) {
          ['كود_المدرسة', 'نوع_المدرسة', 'المرحلة_1', 'المرحلة_2', 'المرحلة_3', 'الوحدة_المحلية', 'العنوان', 'الهاتف', 'اسم_المدير', 'هاتف_المدير', 'اسم_الوكيل', 'هاتف_الوكيل', 'مسؤول_الأمن', 'هاتف_الأمن', 'مسؤول_القاعدة', 'هاتف_القاعدة'].forEach(function (k) {
            var src = (k === 'كود_المدرسة') ? 'كود_هيئة_الأبنية' : k;
            if (p[src] !== undefined && cm[k] != null) v50A_(core.getRange(rr + 2, cm[k] + 1).setValue(schoolV31Clean_(p[src])));
          }); break;
        }
      }
    } catch (e) {}
    schoolV31Log_(actor, 'تعديل بيانات المدرسة', schoolId, changes);
    return { success: true, message: changes.length ? 'تم حفظ بيانات المدرسة (' + changes.length + ' حقل).' : 'لا توجد تغييرات للحفظ.', changed: changes.length };
  });
}
function adminSaveSchoolV35(token, schoolId, payload) { var a = v35Admin_(token); return v35SaveSchoolCore_(schoolId, payload, { username: a.username, school: '' }, true); }

/* ============ العاملون (نواة مشتركة) ============ */
function v35AddWorkerCore_(schoolId, payload, actor, source) {
  var p = payload || {}, nid = v24DigitsLocalV31_(p['الرقم_القومي']), nv=v24ValidateNationalIdV40_(nid);
  if (!nv.valid) throw new Error(nv.message); p['الرقم_القومي']=nid; p['النوع']=nv.type;
  var name = String(p['الاسم'] || '').trim(); if (name.split(/\s+/).filter(Boolean).length < 3) throw new Error('الاسم يجب ألا يقل عن ثلاثة أجزاء.');
  if (!schoolId) throw new Error('حدد المدرسة.');
  v67GuardJob_(p['المسمى_الوظيفي']); v72GuardSubject_(p['مادة_التدريس']); v67GuardSystem_(p['المسمى_الوظيفي'], p['الوظيفة_الإشرافية'], p['نظام_العمل'], '');
  if (p['نظام_العمل'] !== undefined) v40EnforceLeadershipSystem_(p['المسمى_الوظيفي'], p['نظام_العمل']);
  v35SchoolRow_(schoolId);
  return v35Lock_(function () {
    var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers);
    if (emp.rows.some(function (r) { return v24DigitsLocalV31_(schoolV31Val_(r, ei, 'الرقم_القومي')) === nid; })) throw new Error('الرقم القومي موجود بالفعل في قاعدة العاملين.');
    var code = String(p['كود_الموظف'] || '').trim();
    if (code && emp.rows.some(function (r) { return schoolV31Val_(r, ei, 'كود_الموظف') === code; })) throw new Error('كود الموظف مستخدم لعامل آخر.');
    var sh = personnelSS_().getSheetByName('01_الأساسي'), row = new Array(sh.getLastColumn()).fill(''), eid = 'EMP_' + Utilities.getUuid().replace(/-/g, '').slice(0, 20).toUpperCase();
    function put(k, v) { if (ei[k] != null) row[ei[k]] = schoolV31Clean_(v); }
    put('employeeId', eid);
    V35_WORKER_FIELDS.forEach(function (k) {
      if (p[k] === undefined) return;
      put(k, k === 'الرقم_القومي' ? nid : (/^تاريخ/.test(k) ? v35Date_(p[k]) : p[k]));
    });
    put('originalSchoolId', schoolId); put('تاريخ_بدء_العمل', new Date()); put('حالة_السجل', 'قائم');
    v50A_(sh.appendRow(row));
    var rs = personnelSS_().getSheetByName('04_علاقات_المدارس'), rh = rs.getRange(1, 1, 1, rs.getLastColumn()).getDisplayValues()[0], ri = schoolV31Idx_(rh), rr = new Array(rh.length).fill('');
    function rp(k, v) { if (ri[k] != null) rr[ri[k]] = schoolV31Clean_(v); }
    rp('relationId', 'REL_' + Utilities.getUuid().replace(/-/g, '').slice(0, 20).toUpperCase()); rp('employeeId', eid); rp('schoolId', schoolId); rp('نوع_العلاقة', 'أصلي'); rp('isOriginal', true); rp('الحالة', 'نشطة'); rp('مصدر_العلاقة', source); rp('ملاحظات', 'إضافة من ' + source);
    v50A_(rs.appendRow(rr));
    schoolV31Log_(actor, 'إضافة عامل', eid, []);
    return { success: true, message: 'تمت إضافة العامل وربطه بالمدرسة.', employeeId: eid };
  });
}
function adminAddWorkerV35(token, schoolId, payload) { var a = v35Admin_(token); return v35AddWorkerCore_(schoolId, payload, { username: a.username, school: '' }, 'لوحة الإدارة'); }
function adminGetWorkerV35(token, employeeId) {
  v35Admin_(token); var id = String(employeeId || '').trim(), emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), row = null;
  for (var i = 0; i < emp.rows.length; i++) if (schoolV31Val_(emp.rows[i], ei, 'employeeId') === id) { row = emp.rows[i]; break; }
  if (!row) throw new Error('العامل غير موجود.');
  var f = {}; V35_WORKER_FIELDS.forEach(function (k) { f[k] = schoolV31Val_(row, ei, k); }); var nv=v24ValidateNationalIdV40_(f['الرقم_القومي']); if(nv.valid)f['النوع']=nv.type;
  return { success: true, employeeId: id, fields: f };
}
function adminSaveWorkerV35(token, employeeId, payload) {
  var a = v35Admin_(token), id = String(employeeId || '').trim(), p = payload || {};
  if (p['الاسم'] !== undefined && String(p['الاسم']).trim().split(/\s+/).filter(Boolean).length < 3) throw new Error('الاسم يجب ألا يقل عن ثلاثة أجزاء.');
  if (p['الرقم_القومي'] !== undefined) { p['الرقم_القومي'] = v24DigitsLocalV31_(p['الرقم_القومي']); var nv=v24ValidateNationalIdV40_(p['الرقم_القومي']); if (!nv.valid) throw new Error(nv.message); p['النوع']=nv.type; }
  return v35Lock_(function () {
    var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), rowIndex = -1;
    for (var i = 0; i < emp.rows.length; i++) if (schoolV31Val_(emp.rows[i], ei, 'employeeId') === id) { rowIndex = i + 2; break; }
    if (rowIndex < 2) throw new Error('العامل غير موجود.'); /* V5.6: رقم قومي قديم غير صحيح لا يمنع تعديل باقي البيانات؛ يُتحقق منه فقط عند تعديله */ var cnv56 = v24ValidateNationalIdV40_(v24DigitsLocalV31_(schoolV31Val_(emp.rows[rowIndex - 2], ei, 'الرقم_القومي'))); if (cnv56.valid && p['النوع'] === undefined) p['النوع'] = cnv56.type;
    v67GuardJob_(p['المسمى_الوظيفي']); v72GuardSubject_(p['مادة_التدريس']);
    if (p['نظام_العمل'] !== undefined) { var o67 = emp.rows[rowIndex - 2]; v67GuardSystem_(p['المسمى_الوظيفي'] !== undefined ? p['المسمى_الوظيفي'] : schoolV31Val_(o67, ei, 'المسمى_الوظيفي'), p['الوظيفة_الإشرافية'] !== undefined ? p['الوظيفة_الإشرافية'] : schoolV31Val_(o67, ei, 'الوظيفة_الإشرافية'), p['نظام_العمل'], schoolV31Val_(o67, ei, 'نظام_العمل')); }
    if (p['نظام_العمل'] !== undefined) v40EnforceLeadershipSystem_(p['المسمى_الوظيفي'] !== undefined ? p['المسمى_الوظيفي'] : schoolV31Val_(emp.rows[rowIndex - 2], ei, 'المسمى_الوظيفي'), p['نظام_العمل']);
    if (p['الرقم_القومي'] !== undefined && emp.rows.some(function (r) { return schoolV31Val_(r, ei, 'employeeId') !== id && v24DigitsLocalV31_(schoolV31Val_(r, ei, 'الرقم_القومي')) === p['الرقم_القومي']; })) throw new Error('الرقم القومي مسجّل لعامل آخر.');
    var sh = personnelSS_().getSheetByName('01_الأساسي'), changes = schoolV33Write_(sh, rowIndex, emp.headers, p, ['employeeId', 'originalSchoolId'], V35_WORKER_FIELDS);
    schoolV31Log_({ username: a.username, school: '' }, 'تعديل بيانات عامل (إدارة)', id, changes);
    return { success: true, message: changes.length ? 'تم حفظ بيانات العامل (' + changes.length + ' حقل).' : 'لا توجد تغييرات للحفظ.', changed: changes.length };
  });
}
/** تنفيذ طلب تعديل وافقت عليه الإدارة (كان يُسجَّل «موافقة» دون أن يتغير شيء). */
function v35ApplyEditRequest_(field, newValue, employeeId, admin) {
  var editable = SCHOOL_V32_SENSITIVE_FIELDS.concat(SCHOOL_V32_DIRECT_FIELDS).filter(function(x,i,a){ return a.indexOf(x)===i && x!=='employeeId' && x!=='originalSchoolId'; }); if (editable.indexOf(field) < 0) return '';
  v50Fresh_();   // V5.0: رقم الصف يُحسب من بيانات حديثة لا من الذاكرة المؤقتة
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), rowIndex = -1;
  for (var i = 0; i < emp.rows.length; i++) if (schoolV31Val_(emp.rows[i], ei, 'employeeId') === employeeId) { rowIndex = i + 2; break; }
  if (rowIndex < 2) return '';
  var sh = personnelSS_().getSheetByName('01_الأساسي'), p = {}; p[field] = newValue;
  var cur = {}; emp.headers.forEach(function(hh,jj){ cur[hh] = emp.rows[rowIndex - 2][jj] || ''; });
  if (typeof schoolValidateWorkerPayloadV94_ === 'function') schoolValidateWorkerPayloadV94_(p, cur, employeeId);
  var ch = schoolV33Write_(sh, rowIndex, emp.headers, p, ['employeeId', 'originalSchoolId', 'الاسم', 'الرقم_القومي'], V35_WORKER_FIELDS.concat(['كود_الموظف']).filter(function(x,i,a){return a.indexOf(x)===i;}));
  schoolV31Log_({ username: (admin && admin.username) || 'admin', school: '' }, 'تنفيذ طلب تعديل بعد الموافقة', employeeId, ch);
  return ch.length ? field.replace(/_/g, ' ') + ' ← ' + ch[0][2] : '';
}

/* ============ فحص وتنظيف آمن للبيانات ============ */
/** apply=false: فحص فقط. apply=true: إصلاح ما هو واضح فقط (لا حذف ولا كتابة فوق قيمة صحيحة). */
function adminCleanupV35(token, apply) {
  v35Admin_(token); apply = apply === true || apply === 'true';
  if (apply) { LockService.getScriptLock().waitLock(20000); v50Fresh_(); }
  var fixes = [], report = {};
  var sh = personnelSS_().getSheetByName('18_بيانات_المدارس'), lc = sh.getLastColumn(), h = sh.getRange(1, 1, 1, lc).getDisplayValues()[0], ix = schoolV31Idx_(h);
  var v = sh.getRange(2, 1, Math.max(0, sh.getLastRow() - 1), lc).getDisplayValues();
  v.forEach(function (r, i) {
    var row = i + 2, name = String(r[ix['اسم_المدرسة']] || '').trim(), orig = String(r[ix['اسم_المدرسة_الأصلي']] || '').trim(), code = String(r[ix['كود_هيئة_الأبنية']] || '').trim(), std = String(r[ix['اسم_المدرسة_المعياري']] || '').trim();
    if (/^\d{5,9}$/.test(orig)) {   // كود مبنى موضوع بالخطأ في خانة الاسم الأصلي
      if (!code) { fixes.push({ school: name, fix: 'نقل الكود ' + orig + ' إلى كود هيئة الأبنية' }); if (apply) v50A_(sh.getRange(row, ix['كود_هيئة_الأبنية'] + 1).setValue(orig)); }
      fixes.push({ school: name, fix: 'ضبط الاسم الأصلي' }); if (apply) v50A_(sh.getRange(row, ix['اسم_المدرسة_الأصلي'] + 1).setValue(name));
    }
    if (!std && name) { fixes.push({ school: name, fix: 'تعبئة الاسم المعياري' }); if (apply) v50A_(sh.getRange(row, ix['اسم_المدرسة_المعياري'] + 1).setValue(personnelNormalizeSchoolNameV1_(name))); }
  });
  var schoolIds = {}; v.forEach(function (r) { schoolIds[r[ix.schoolId]] = String(r[ix['اسم_المدرسة']] || ''); });
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), en = {};
  emp.rows.forEach(function (r) { en[schoolV31Val_(r, ei, 'employeeId')] = schoolV31Val_(r, ei, 'الاسم'); });
  // V5.5.1: الصفوف الفارغة تمامًا في 04 تُحذف (ليست علاقات)، والعلاقات غير النشطة لمدرسة لم تعد موجودة = تاريخ فقط (تُعدّ ولا تُعرض).
  var blankRel = rel.rows.filter(function (r) { return !r.some(function (x) { return String(x).trim() !== ''; }); }).length;
  var orphanAll = rel.rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }) && !schoolIds[schoolV31Val_(r, ri, 'schoolId')]; });
  var orphanActive = orphanAll.filter(function (r) { return v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة')); });
  report.blankRelationRows = blankRel; report.inactiveOrphanRelations = orphanAll.length - orphanActive.length;
  // مدرسة مفقودة من 18 لكنها معروفة في توحيد_المدارس (مثل مدارس التعليم المجتمعي «لم يُدمج») ولها علاقات نشطة ← تُعاد إضافتها بنفس المفتاح.
  var alias = {}; try { var td = v24Data_('توحيد_المدارس'), ti = schoolV31Idx_(td.headers); td.rows.forEach(function (r) { var id = schoolV31Val_(r, ti, 'schoolId_الجديد') || schoolV31Val_(r, ti, 'schoolId'), nm = schoolV31Val_(r, ti, 'الاسم_الحالي') || String(r[0] || '').trim(); if (id && nm && !alias[id]) alias[id] = nm; }); } catch (e) { }
  var restore = {}; orphanActive.forEach(function (r) { var id = schoolV31Val_(r, ri, 'schoolId'); if (id && alias[id]) restore[id] = alias[id]; });
  Object.keys(restore).forEach(function (id) {
    fixes.push({ school: restore[id], fix: 'إعادة إضافة المدرسة إلى 18_بيانات_المدارس بنفس المفتاح (لها علاقات نشطة)' });
    if (apply) { var row = new Array(h.length).fill(''); function p(k, v) { if (ix[k] != null) row[ix[k]] = v; } var cm = /موازي|فصل الواحد|مجتمع/.test(restore[id]);
      p('schoolId', id); p('اسم_المدرسة', restore[id]); p('الاسم_المعياري', personnelNormalizeSchoolNameV1_(restore[id])); p('اسم_المدرسة_المعياري', personnelNormalizeSchoolNameV1_(restore[id])); p('نوع_المدرسة', cm ? 'التعليم المجتمعي' : ''); p('التصنيف_التشغيلي', cm ? 'التعليم المجتمعي' : 'مرجعي — يحتاج مطابقة'); p('الإدارة', 'إدارة صدفا'); p('المحافظة', 'أسيوط'); p('حالة_البيانات', 'مُعادة من توحيد_المدارس'); p('آخر_تحديث', new Date()); p('آخر_مستخدم', 'admin');
      v50A_(sh.getRange(sh.getLastRow() + 1, 1, 1, h.length).setValues([row])); schoolIds[id] = restore[id]; }
  });
  if (blankRel) {
    fixes.push({ school: '04_علاقات_المدارس', fix: 'حذف ' + blankRel + ' صف فارغ تمامًا' });
    if (apply) { var rsh = personnelSS_().getSheetByName('04_علاقات_المدارس'), rv = rsh.getRange(2, 1, rsh.getLastRow() - 1, rsh.getLastColumn()).getValues(), keep = rv.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
      if (keep.length < rv.length) {   // V7.35: حذف الصفوف الفارغة فقط من الأسفل للأعلى (بدل مسح الورقة كلها وإعادة كتابتها — خطر فقد العلاقات لو انقطع التنفيذ)
        for (var b = rv.length - 1; b >= 0; b--) { if (rv[b].some(function (x) { return String(x).trim() !== ''; })) continue; var e = b; while (b - 1 >= 0 && !rv[b - 1].some(function (x) { return String(x).trim() !== ''; })) b--; v50A_(rsh.deleteRows(b + 2, e - b + 1)); }
      } }
  }
  report.orphanRelations = orphanActive.filter(function (r) { return !schoolIds[schoolV31Val_(r, ri, 'schoolId')]; }).map(function (r) { return { employee: en[schoolV31Val_(r, ri, 'employeeId')] || '', schoolId: schoolV31Val_(r, ri, 'schoolId') }; });
  var q = v24Data_('05_المؤهلات'), qi = schoolV31Idx_(q.headers), hasQ = {}; q.rows.forEach(function (r) { hasQ[schoolV31Val_(r, qi, 'employeeId')] = 1; });
  report.workersWithoutQualification = emp.rows.filter(function (r) { return !hasQ[schoolV31Val_(r, ei, 'employeeId')]; }).length;
  ['الهاتف', 'المسمى_الوظيفي', 'المرحلة_التعليمية_الأصلية', 'مادة_التدريس', 'نظام_العمل'].forEach(function (k) { report['empty_' + k] = emp.rows.filter(function (r) { return !schoolV31Val_(r, ei, k); }).length; });
  report.schoolsWithoutPrincipal = v.filter(function (r) { return !String(r[ix['اسم_المدير']] || '').trim(); }).map(function (r) { return r[ix['اسم_المدرسة']]; });
  report.schoolsWithoutDeputy = v.filter(function (r) { return !String(r[ix['اسم_الوكيل']] || '').trim(); }).length;
  report.schoolsWithoutBuildingCode = v.filter(function (r) { return !String(r[ix['كود_هيئة_الأبنية']] || '').trim(); }).length;
  var us = v24Data_('R_المستخدمون'), ui = schoolV31Idx_(us.headers);
  report.weakPasswords = us.rows.filter(function (r) { return String(schoolV31Val_(r, ui, 'password')).length < 4; }).length;
  if (apply) v50Invalidate_();
  return { success: true, applied: !!apply, fixes: fixes, report: report, message: apply ? ('تم تطبيق ' + fixes.length + ' إصلاح.') : ('فحص فقط: ' + fixes.length + ' إصلاح مقترح — لم يتغير شيء.') };
}

/* ============ قوائم مرجعية للإدارة ============ */
function adminReferenceV35(token) { v35Admin_(token); var o=v35Options_(); o.localUnit=['صدفا','الدوير','اولادالياس','مجريس','البربا']; return { success: true, options: v85ApplyReferenceLists_(o) }; }
