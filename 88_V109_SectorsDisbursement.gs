var V109_SECTOR_SHEET = '18_بيانات_المدارس';
var V109_SECTOR_FIELD = 'القطاع';
var V109_SECTOR_MANAGER_FIELD = 'مسؤول_القطاع_employeeId';
var V109_SECTOR_TARGET_SCHOOLS = 46;
var V109_SECTORS = [
  {name: 'قطاع أسماء', target: 14},
  {name: 'قطاع آمال', target: 11},
  {name: 'قطاع نعيمة', target: 11},
  {name: 'قطاع ليلى', target: 8},
  {name: 'قطاع وفاء', target: 7},
  {name: 'قطاع خالد', target: 6}
];

function v109Digits_(value) {
  return typeof v24DigitsLocalV31_ === 'function'
    ? v24DigitsLocalV31_(value)
    : String(value || '').replace(/\D/g, '');
}

function v109Norm_(value) {
  return String(value || '').trim().replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ');
}

function v109SectorOptions_() {
  return V109_SECTORS.map(function (x) { return x.name; });
}

function adminSectorScopeOptionsV109(token) {
  v35Admin_(token);
  return {success: true, sectors: v109SectorOptions_()};
}

function v109AllowedSectors_(permission) {
  if (!permission || permission.permission !== 'مالية' || permission.status === 'موقوف') return [];
  if (permission.scope === 'كل القطاعات') return v109SectorOptions_();
  if (permission.scope !== 'قطاعات محددة') return [];
  var details = permission.detailsObj || {};
  var requested = Array.isArray(details.sectors) ? details.sectors : [];
  return v109SectorOptions_().filter(function (sector) { return requested.indexOf(sector) >= 0; });
}

function v109SchoolIdsForSectors_(sectors) {
  var selected = {};
  (sectors || []).forEach(function (sector) {
    if (v109SectorOptions_().indexOf(String(sector)) >= 0) selected[String(sector)] = 1;
  });
  var operational = v109OperationalSchoolIds_(), data = v24Data_(V109_SECTOR_SHEET), ix = schoolV31Idx_(data.headers), ids = {};
  data.rows.forEach(function (row) {
    var sid = schoolV31Val_(row, ix, 'schoolId');
    var sector = schoolV31Val_(row, ix, V109_SECTOR_FIELD);
    if (sid && operational[sid] && selected[sector]) ids[sid] = 1;
  });
  return ids;
}

function v109SectorManagers_() {
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers);
  var users = v24Data_('R_المستخدمون'), ui = schoolV31Idx_(users.headers), accounts = {};
  users.rows.forEach(function (r) {
    var nid = v109Digits_(schoolV31Val_(r, ui, 'username'));
    var role = schoolV31Val_(r, ui, 'role');
    if (!nid || role === 'admin' || role === 'مدرسة' || role === 'خاص' || schoolV31Val_(r, ui, 'status') === 'موقوف') return;
    accounts[nid] = {name: schoolV31Val_(r, ui, 'name')};
  });
  var permData = v24Data_('R_صلاحيات_الموظفين'), pi = schoolV31Idx_(permData.headers), financePermission = {};
  permData.rows.forEach(function (r) {
    var eid = schoolV31Val_(r, pi, 'employeeId');
    if (!eid || schoolV31Val_(r, pi, 'الصلاحية') !== 'مالية' || schoolV31Val_(r, pi, 'الحالة') === 'موقوف') return;
    var permission = v42PermOut_(r, pi), allowed = v109AllowedSectors_(permission);
    if (!allowed.length) return;
    financePermission[eid] = financePermission[eid] || {};
    allowed.forEach(function (sector) { financePermission[eid][sector] = 1; });
  });
  var seen = {}, byId = {}, managersBySector = {};
  v109SectorOptions_().forEach(function (sector) { managersBySector[sector] = []; });
  emp.rows.forEach(function (r) {
    var eid = schoolV31Val_(r, ei, 'employeeId');
    if (!eid) return;
    byId[eid] = schoolV31Val_(r, ei, 'الاسم');
    var nid = v109Digits_(schoolV31Val_(r, ei, 'الرقم_القومي'));
    if (!nid || !accounts[nid] || !financePermission[eid] || seen[eid]) return;
    seen[eid] = 1;
    Object.keys(financePermission[eid]).forEach(function (sector) {
      managersBySector[sector].push({employeeId: eid, name: accounts[nid].name || schoolV31Val_(r, ei, 'الاسم')});
    });
  });
  var rows = [];
  Object.keys(managersBySector).forEach(function (sector) {
    managersBySector[sector].sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); });
    managersBySector[sector].forEach(function (manager) {
      if (!rows.some(function (x) { return x.employeeId === manager.employeeId; })) rows.push(manager);
    });
  });
  return {rows: rows, byId: byId, bySector: managersBySector, sectorsById: financePermission};
}

function v109OperationalSchoolIds_() {
  var out = {};
  v64Ops_().forEach(function (sid) { if (sid) out[String(sid)] = 1; });
  return out;
}

function adminSectorsDataV109(token) {
  v35Admin_(token);
  var d = v24Data_(V109_SECTOR_SHEET), ix = schoolV31Idx_(d.headers), op = v109OperationalSchoolIds_();
  var managers = v109SectorManagers_(), rows = [], counts = {};
  v109SectorOptions_().forEach(function (s) { counts[s] = 0; });
  d.rows.forEach(function (r) {
    var sid = schoolV31Val_(r, ix, 'schoolId');
    if (!sid || !op[String(sid)]) return;
    var sector = schoolV31Val_(r, ix, V109_SECTOR_FIELD);
    var managerId = ix[V109_SECTOR_MANAGER_FIELD] == null ? '' : schoolV31Val_(r, ix, V109_SECTOR_MANAGER_FIELD);
    if (counts[sector] != null) counts[sector]++;
    rows.push({
      schoolId: sid,
      code: schoolV31Val_(r, ix, 'كود_هيئة_الأبنية'),
      name: schoolV31Val_(r, ix, 'اسم_المدرسة'),
      sector: sector,
      managerEmployeeId: managerId,
      managerName: managers.byId[managerId] || ''
    });
  });
  rows.sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); });
  return {
    success: true,
    rows: rows,
    sectors: V109_SECTORS,
    managerOptions: managers.rows,
    managerOptionsBySector: managers.bySector,
    assignedCounts: counts,
    schoolCount: rows.length,
    expectedSchoolCount: V109_SECTOR_TARGET_SCHOOLS,
    targetCountTotal: V109_SECTORS.reduce(function (n, x) { return n + x.target; }, 0)
  };
}

function v109LogSectorChanges_(actor, changes) {
  var sh = personnelSS_().getSheetByName('12_سجل_الأحداث');
  if (!sh || sh.getLastColumn() < 1) return;
  var h = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0], ix = schoolV31Idx_(h), row = new Array(h.length).fill('');
  function put(key, value) { if (ix[key] != null) row[ix[key]] = value; }
  put('eventId', 'EV_' + Utilities.getUuid().replace(/-/g, '').slice(0, 20));
  put('نوع_العملية', 'تحديث قطاعات المدارس ومسئوليها');
  put('الكيان', 'مدرسة');
  put('entityId', changes.map(function (x) { return x.schoolId; }).join(','));
  put('القيمة_القديمة', JSON.stringify(changes.map(function (x) { return {schoolId: x.schoolId, sector: x.oldSector, managerEmployeeId: x.oldManager}; })));
  put('القيمة_الجديدة', JSON.stringify(changes.map(function (x) { return {schoolId: x.schoolId, sector: x.sector, managerEmployeeId: x.managerEmployeeId}; })));
  put('المستخدم', actor.username || 'admin');
  put('التاريخ', new Date());
  v50A_(sh.appendRow(row));
}

function adminSaveSectorAssignmentsV109(token, payload) {
  var actor = v35Admin_(token), changes = Array.isArray(payload) ? payload : [];
  if (!changes.length) return {success: true, updated: 0, message: 'لا توجد تغييرات للحفظ.'};
  if (changes.length > 200) throw new Error('احفظ 200 مدرسة كحد أقصى في الدفعة الواحدة.');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    v50Fresh_();
    v36EnsureCol_(V109_SECTOR_SHEET, V109_SECTOR_FIELD);
    v36EnsureCol_(V109_SECTOR_SHEET, V109_SECTOR_MANAGER_FIELD);
    var sh = personnelSS_().getSheetByName(V109_SECTOR_SHEET);
    var grid = sh.getDataRange().getDisplayValues(), h = grid[0].map(function (x) { return String(x || '').trim(); }), ix = schoolV31Idx_(h);
    var op = v109OperationalSchoolIds_(), managers = v109SectorManagers_(), managerSectors = managers.sectorsById;
    if (ix[V109_SECTOR_FIELD] == null || ix[V109_SECTOR_MANAGER_FIELD] == null || ix.schoolId == null) throw new Error('أعمدة القطاع أو المدرسة غير متاحة في 18_بيانات_المدارس.');
    var rowBySchool = {}, seen = {}, applied = [];
    for (var r = 1; r < grid.length; r++) {
      var rowSid = String(grid[r][ix.schoolId] || '').trim();
      if (rowSid) rowBySchool[rowSid] = r;
    }
    changes.forEach(function (item) {
      var x = item || {}, sid = String(x.schoolId || '').trim();
      if (!sid || seen[sid]) throw new Error('توجد مدرسة مفقودة أو مكررة في طلب الحفظ.');
      if (!op[sid] || rowBySchool[sid] == null) throw new Error('المدرسة غير موجودة ضمن المدارس التشغيلية: ' + sid);
      seen[sid] = 1;
      var rowIndex = rowBySchool[sid], oldSector = String(grid[rowIndex][ix[V109_SECTOR_FIELD]] || '').trim();
      var oldManager = String(grid[rowIndex][ix[V109_SECTOR_MANAGER_FIELD]] || '').trim();
      var sector = Object.prototype.hasOwnProperty.call(x, 'sector') ? String(x.sector || '').trim() : oldSector;
      var managerWasSubmitted = Object.prototype.hasOwnProperty.call(x, 'managerEmployeeId');
      var managerId = managerWasSubmitted ? String(x.managerEmployeeId || '').trim() : oldManager;
      if (sector && v109SectorOptions_().indexOf(sector) < 0) throw new Error('القطاع غير معتمد: ' + sector);
      if (managerId && (!sector || !managerSectors[managerId] || !managerSectors[managerId][sector])) {
        if (managerWasSubmitted) throw new Error('مسئول القطاع لا يملك صلاحية مالية ضمن نطاق القطاع المحدد.');
        if (sector !== oldSector) throw new Error('غيّر أو أزل مسئول القطاع؛ نطاق صلاحياته لا يشمل القطاع الجديد.');
      }
      if (sector !== oldSector) grid[rowIndex][ix[V109_SECTOR_FIELD]] = sector;
      if (managerId !== oldManager) grid[rowIndex][ix[V109_SECTOR_MANAGER_FIELD]] = managerId;
      if (sector !== oldSector || managerId !== oldManager) applied.push({schoolId: sid, oldSector: oldSector, oldManager: oldManager, sector: sector, managerEmployeeId: managerId});
    });
    if (!applied.length) return {success: true, updated: 0, message: 'لا توجد تغييرات للحفظ.'};
    var count = grid.length - 1;
    if (count > 0) {
      var sectorValues = grid.slice(1).map(function (r) { return [r[ix[V109_SECTOR_FIELD]] || '']; });
      var managerValues = grid.slice(1).map(function (r) { return [r[ix[V109_SECTOR_MANAGER_FIELD]] || '']; });
      v50A_(sh.getRange(2, ix[V109_SECTOR_FIELD] + 1, count, 1).setValues(sectorValues));
      v50A_(sh.getRange(2, ix[V109_SECTOR_MANAGER_FIELD] + 1, count, 1).setValues(managerValues));
    }
    v109LogSectorChanges_(actor, applied);
    v50Invalidate_(V109_SECTOR_SHEET);
    return {success: true, updated: applied.length, changes: applied, message: 'تم حفظ ' + applied.length + ' تعديل مدرسة.'};
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function adminDisbursementMissingV109(token) {
  v35Admin_(token);
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers);
  var systemKey = ei['نظام_العمل'] != null ? 'نظام_العمل' : (ei['النظام_المالي'] != null ? 'النظام_المالي' : '');
  var permissionKey = ei['رقم_إذن_الصرف'] != null ? 'رقم_إذن_الصرف' : '';
  if (!systemKey) throw new Error('حقل نظام_العمل غير موجود في 01_الأساسي.');
  if (!permissionKey) throw new Error('حقل رقم_إذن_الصرف غير موجود في 01_الأساسي.');
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), names = v42SchoolNames_();
  var activeSchools = {};
  rel.rows.forEach(function (r) {
    var eid = schoolV31Val_(r, ri, 'employeeId'), sid = schoolV31Val_(r, ri, 'schoolId');
    if (!eid || !sid || !v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة'))) return;
    (activeSchools[eid] = activeSchools[eid] || {} )[sid] = 1;
  });
  var rows = [], withoutSystem = 0, withoutPermission = 0;
  emp.rows.forEach(function (r) {
    var employeeId = schoolV31Val_(r, ei, 'employeeId');
    if (!employeeId) return;
    var system = schoolV31Val_(r, ei, systemKey), permissionNumber = schoolV31Val_(r, ei, permissionKey);
    if (!permissionNumber) withoutPermission++;
    if (!system) { if (!permissionNumber) withoutSystem++; return; }
    if (permissionNumber) return;
    var workSchools = Object.keys(activeSchools[employeeId] || {});
    if (!workSchools.length) {
      var originalSchool = schoolV31Val_(r, ei, 'originalSchoolId');
      if (originalSchool) workSchools.push(originalSchool);
    }
    rows.push({
      employeeId: employeeId,
      nationalId: schoolV31Val_(r, ei, 'الرقم_القومي'),
      employeeCode: schoolV31Val_(r, ei, 'كود_الموظف'),
      name: schoolV31Val_(r, ei, 'الاسم'),
      job: schoolV31Val_(r, ei, 'المسمى_الوظيفي'),
      workplace: workSchools.map(function (sid) { return names[sid] || sid; }).join('، '),
      system: system,
      permissionNumber: '',
      permissionStatus: 'بدون إذن صرف'
    });
  });
  rows.sort(function (a, b) { return a.workplace.localeCompare(b.workplace, 'ar') || a.name.localeCompare(b.name, 'ar'); });
  return {success: true, sourceSheet: '01_الأساسي', systemField: systemKey, permissionField: permissionKey, total: rows.length, withoutSystemAndPermission: withoutSystem, withoutPermission: withoutPermission, rows: rows};
}
/* =========================================================================
 * V110 — مركز القطاعات وإذن الصرف
 * View موحد للمدارس ← القطاعات ← العاملين ← الأنظمة المالية ← إذن الصرف.
 * لا ينشئ مصدر بيانات جديدًا؛ يعتمد على 01_الأساسي و04_علاقات_المدارس
 * و18_بيانات_المدارس.
 * ========================================================================= */
var V110_SYSTEM_FIELD = 'نظام_العمل';
var V110_PERMISSION_FIELD = 'رقم_إذن_الصرف';

function v110Val_(row, ix, key) {
  return ix[key] == null ? '' : String(row[ix[key]] == null ? '' : row[ix[key]]).trim();
}
function v110SchoolMap_() {
  var d = v24Data_('18_بيانات_المدارس'), ix = schoolV31Idx_(d.headers), out = {};
  d.rows.forEach(function(r) {
    var id = v110Val_(r, ix, 'schoolId');
    if (!id) return;
    out[id] = {
      schoolId: id,
      code: v110Val_(r, ix, 'كود_هيئة_الأبنية'),
      name: v110Val_(r, ix, 'اسم_المدرسة') || v110Val_(r, ix, 'الاسم_المعياري') || id,
      sector: v110Val_(r, ix, 'القطاع'),
      operational: /تشغيلي/.test(v110Val_(r, ix, 'التصنيف_التشغيلي'))
    };
  });
  return out;
}
function v110ActiveRelations_() {
  var d = v24Data_('04_علاقات_المدارس'), ix = schoolV31Idx_(d.headers), byEmp = {};
  d.rows.forEach(function(r) {
    var eid = v110Val_(r, ix, 'employeeId'), sid = v110Val_(r, ix, 'schoolId');
    if (!eid || !sid || !v36ActiveRel_(v110Val_(r, ix, 'الحالة'))) return;
    (byEmp[eid] = byEmp[eid] || []).push({
      schoolId: sid,
      relation: v110Val_(r, ix, 'نوع_العلاقة'),
      status: v110Val_(r, ix, 'الحالة')
    });
  });
  return byEmp;
}
function v110SectorName_(x) {
  var s = String(x || '').trim();
  return s || 'غير محدد';
}
function v110BuildRows_() {
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers);
  var schools = v110SchoolMap_(), rels = v110ActiveRelations_(), op = v109OperationalSchoolIds_();
  var systemKey = ei[V110_SYSTEM_FIELD] != null ? V110_SYSTEM_FIELD : (ei['النظام_المالي'] != null ? 'النظام_المالي' : '');
  var permKey = ei[V110_PERMISSION_FIELD] != null ? V110_PERMISSION_FIELD : '';
  if (!systemKey) throw new Error('حقل نظام العمل غير موجود في 01_الأساسي.');
  if (!permKey) throw new Error('حقل رقم إذن الصرف غير موجود في 01_الأساسي.');

  var rows = [];
  emp.rows.forEach(function(r) {
    var eid = v110Val_(r, ei, 'employeeId');
    if (!eid || !v110Val_(r, ei, 'الاسم')) return;
    var relations = rels[eid] || [];
    var schoolIds = relations.map(function(x) { return x.schoolId; }).filter(function(sid) {
      return schools[sid] && op[sid];
    });
    if (!schoolIds.length) {
      var original = v110Val_(r, ei, 'originalSchoolId');
      if (original && schools[original] && op[original]) schoolIds = [original];
    }

    var system = v110Val_(r, ei, systemKey);
    var permission = v110Val_(r, ei, permKey);
    var effective = ei['النظام_الفعلي_للحساب_الشهري'] != null
      ? v110Val_(r, ei, 'النظام_الفعلي_للحساب_الشهري') : '';

    /* إذا كان للموظف نظام مالي/إذن صرف لكن لا توجد له علاقة مدرسية تشغيلية،
       لا نسقطه من المركز؛ يظهر كسجل «جهة غير محددة» حتى لا تختفي حالات النقص. */
    if (!schoolIds.length && (system || permission)) schoolIds = [''];

    schoolIds.forEach(function(sid) {
      var s = sid ? schools[sid] : {schoolId:'',code:'',name:'غير محدد',sector:''};
      var rel = relations.find(function(x) { return x.schoolId === sid; }) || {};
      rows.push({
        employeeId: eid,
        nationalId: v110Val_(r, ei, 'الرقم_القومي'),
        employeeCode: v110Val_(r, ei, 'كود_الموظف'),
        name: v110Val_(r, ei, 'الاسم'),
        job: v110Val_(r, ei, 'المسمى_الوظيفي'),
        supervisoryJob: v110Val_(r, ei, 'الوظيفة_الإشرافية'),
        subject: v110Val_(r, ei, 'مادة_التدريس'),
        stage: v110Val_(r, ei, 'المرحلة_التعليمية_الأصلية'),
        schoolId: sid,
        schoolCode: s.code,
        school: s.name,
        sector: v110SectorName_(s.sector),
        managerEmployeeId: '',
        system: system,
        effectiveSystem: effective,
        permissionNumber: permission,
        permissionStatus: permission ? 'مكتمل' : (system ? 'بدون إذن صرف' : 'بدون نظام مالي'),
        relation: rel.relation || ''
      });
      rows[rows.length - 1].managerEmployeeId = '';
    });
  });
  return {rows: rows, systemField: systemKey, permissionField: permKey, schoolMap: schools};
}
function v110ManagerNames_(rows) {
  var ids = {};
  rows.forEach(function(r) {
    var sid = r.schoolId;
    if (sid) ids[sid] = 1;
  });
  var d = v24Data_(V109_SECTOR_SHEET), ix = schoolV31Idx_(d.headers), managers = v109SectorManagers_(), bySchool = {};
  d.rows.forEach(function(r) {
    var sid = v110Val_(r, ix, 'schoolId');
    if (!sid || !ids[sid]) return;
    var mid = v110Val_(r, ix, V109_SECTOR_MANAGER_FIELD);
    bySchool[sid] = {
      employeeId: mid,
      name: managers.byId[mid] || ''
    };
  });
  rows.forEach(function(r) {
    var m = bySchool[r.schoolId] || {};
    r.managerEmployeeId = m.employeeId || '';
    r.managerName = m.name || '';
  });
}
function v110FilterRows_(rows, filters) {
  filters = filters || {};
  var sector = String(filters.sector || '').trim();
  var schoolId = String(filters.schoolId || '').trim();
  var system = String(filters.system || '').trim();
  var permission = String(filters.permission || 'الكل').trim();
  var q = v109Norm_(filters.q || '').toLowerCase();

  return rows.filter(function(r) {
    if (sector && sector !== 'الكل' && v110SectorName_(r.sector) !== sector) return false;
    if (schoolId && schoolId !== 'الكل' && r.schoolId !== schoolId) return false;
    if (system && system !== 'الكل' && r.system !== system) return false;
    if (permission === 'يوجد إذن صرف' && !r.permissionNumber) return false;
    if (permission === 'بدون إذن صرف' && (r.permissionNumber || !r.system)) return false;
    if (permission === 'بدون نظام مالي' && r.system) return false;
    if (q) {
      var hay = v109Norm_([
        r.name, r.nationalId, r.employeeCode, r.job, r.school, r.sector,
        r.system, r.permissionNumber, r.subject
      ].join(' ')).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  });
}
function v110DistinctSystems_(rows) {
  var m = {};
  rows.forEach(function(r) { if (r.system) m[r.system] = 1; });
  return Object.keys(m).sort(function(a,b){ return a.localeCompare(b,'ar'); });
}
function v110SectorSummary_(rows) {
  var map = {};
  rows.forEach(function(r) {
    var s = v110SectorName_(r.sector);
    if (!map[s]) map[s] = {sector:s, employees:{}, assignments:0, withPermission:0, missingPermission:0, systems:{}};
    map[s].assignments++;
    map[s].employees[r.employeeId] = 1;
    if (r.permissionNumber) map[s].withPermission++; else if (r.system) map[s].missingPermission++;
    if (r.system) map[s].systems[r.system] = (map[s].systems[r.system] || 0) + 1;
  });
  return Object.keys(map).map(function(k) {
    var x = map[k];
    return {
      sector:k,
      employees:Object.keys(x.employees).length,
      assignments:x.assignments,
      withPermission:x.withPermission,
      missingPermission:x.missingPermission,
      systems:x.systems
    };
  }).sort(function(a,b){ return a.sector.localeCompare(b.sector,'ar'); });
}
function v110SchoolSummary_(rows) {
  var map = {};
  rows.forEach(function(r) {
    if (!r.schoolId) return;
    if (!map[r.schoolId]) map[r.schoolId] = {
      schoolId:r.schoolId, code:r.schoolCode, school:r.school, sector:v110SectorName_(r.sector),
      managerName:r.managerName || '', employees:{}, assignments:0, withPermission:0, missingPermission:0, systems:{}
    };
    var x=map[r.schoolId]; x.assignments++; x.employees[r.employeeId]=1;
    if (r.permissionNumber) x.withPermission++; else if (r.system) x.missingPermission++;
    if (r.system) x.systems[r.system]=(x.systems[r.system]||0)+1;
  });
  return Object.keys(map).map(function(k) {
    var x=map[k];
    return {
      schoolId:x.schoolId, code:x.code, school:x.school, sector:x.sector, managerName:x.managerName,
      employees:Object.keys(x.employees).length, assignments:x.assignments,
      withPermission:x.withPermission, missingPermission:x.missingPermission, systems:x.systems
    };
  }).sort(function(a,b){return a.sector.localeCompare(b.sector,'ar')||a.school.localeCompare(b.school,'ar');});
}
function adminSectorFinanceDataV110(token, filters) {
  v35Admin_(token);
  var built = v110BuildRows_(), rows = built.rows;
  v110ManagerNames_(rows);
  var filtered = v110FilterRows_(rows, filters || {});
  var sectors = v109SectorOptions_();
  var allSectorSummary = v110SectorSummary_(rows);
  var allSchoolSummary = v110SchoolSummary_(rows);
  var sectorSummary = v110SectorSummary_(filtered);
  var schoolSummary = v110SchoolSummary_(filtered);
  var totalEmployees = {};
  filtered.forEach(function(r){ totalEmployees[r.employeeId]=1; });
  var missing = filtered.filter(function(r){return r.system && !r.permissionNumber;});
  return {
    success:true,
    rows:filtered,
    total:filtered.length,
    uniqueEmployees:Object.keys(totalEmployees).length,
    missingPermission:missing.length,
    withPermission:filtered.filter(function(r){return !!r.permissionNumber;}).length,
    withoutSystem:filtered.filter(function(r){return !r.system;}).length,
    sectors:sectors,
    sectorSummary:sectorSummary,
    schoolSummary:schoolSummary,
    allSectorSummary:allSectorSummary,
    allSchoolSummary:allSchoolSummary,
    systems:v110DistinctSystems_(rows),
    schoolCount:allSchoolSummary.length,
    operationalSchoolCount:Object.keys(built.schoolMap).filter(function(id){return built.schoolMap[id].operational;}).length,
    managerNote:'مسئول القطاع مأخوذ من علاقة المدرسة بالقطاع، والمستخدمون المؤهلون يحددهم نظام الصلاحيات الحالي.'
  };
}
function adminSectorFinanceExportV110(token, filters, mode) {
  v35Admin_(token);
  var d = adminSectorFinanceDataV110(token, filters || {});
  var rows = d.rows || [], sheets = [];
  function H() { return ['م','القطاع','المدرسة','كود المدرسة','الاسم','الرقم القومي','كود الموظف','الوظيفة','الإشرافية','المادة','المرحلة','نظام العمل الأصلي','النظام الفعلي للحساب الشهري','رقم إذن الصرف','حالة إذن الصرف','مسئول القطاع']; }
  sheets.push({name:'البيانات الحالية',rows:[H()].concat(rows.map(function(r,i){return [
    i+1,r.sector,r.school,r.schoolCode,r.name,r.nationalId,r.employeeCode,r.job,r.supervisoryJob,r.subject,r.stage,
    r.system,r.effectiveSystem,r.permissionNumber,r.permissionStatus,r.managerName
  ];}))});
  sheets.push({name:'ملخص القطاعات',rows:[['القطاع','العاملون','علاقات العمل','بإذن صرف','بدون إذن صرف']].concat(d.sectorSummary.map(function(x){return [x.sector,x.employees,x.assignments,x.withPermission,x.missingPermission];}))});
  sheets.push({name:'ملخص المدارس',rows:[['القطاع','المدرسة','كود المدرسة','العاملون','علاقات العمل','بإذن صرف','بدون إذن صرف','مسئول القطاع']].concat(d.schoolSummary.map(function(x){return [x.sector,x.school,x.code,x.employees,x.assignments,x.withPermission,x.missingPermission,x.managerName];}))});
  sheets.push({name:'بدون إذن صرف',rows:[H()].concat(rows.filter(function(r){return r.system&&!r.permissionNumber;}).map(function(r,i){return [
    i+1,r.sector,r.school,r.schoolCode,r.name,r.nationalId,r.employeeCode,r.job,r.supervisoryJob,r.subject,r.stage,
    r.system,r.effectiveSystem,'',r.permissionStatus,r.managerName
  ];}))});
  return {success:true,sheets:sheets,total:rows.length,mode:mode||'current'};
}
