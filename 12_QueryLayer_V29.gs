/** V2.9 — طبقة القراءة الموحدة (v24Data_ / listPersonnelSchoolsV241_ / getPersonnelCardV24_)
 *
 * سبب الملف:
 * الحزمة السابقة V2.8.2 كانت تستدعي هذه الدوال في 17_BasicOperations_V25.gs
 * و18_AdminUI_V26.gs وIndex_V25.html، لكن الملف الذي يعرّفها لم يكن موجودًا في الحزمة.
 * النتيجة: كل شاشات لوحة الإدارة كانت تفشل بخطأ «... is not defined».
 * هذا الملف يعيد تعريفها بشكل صريح ومع تخزين مؤقت داخل نفس التنفيذ لتقليل نداءات Sheets.
 */

var V24_CACHE_ = {};


/** قراءة ورقة كاملة مرة واحدة لكل تنفيذ: {headers:[], rows:[[]]} */
function v24Data_(name){
  if (V24_CACHE_[name]) return V24_CACHE_[name];
  // V5.0: نسخة مشتركة بين الطلبات (تُبطل تلقائيًا مع أي كتابة) — انظر 35_V50_Performance.gs
  var cached = (typeof v50Get_ === 'function') ? v50Get_(name) : null;
  if (cached) { V24_CACHE_[name] = cached; return cached; }
  var ver = (typeof v50Ver_ === 'function' && !V50_DIRTY_) ? v50Ver_(name) : null;
  var sh = personnelSS_().getSheetByName(name);
  if (!sh) throw new Error('ورقة غير موجودة: ' + name);
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  var out;
  if (lr < 1 || lc < 1) {
    out = {headers: [], rows: []};
  } else {
    var v = sh.getRange(1, 1, lr, lc).getDisplayValues();
    var headers = (v[0] || []).map(function(x){ return String(x == null ? '' : x).trim(); });
    // V5.0: لا نحذف الصفوف الفارغة من المنتصف — كثير من دوال الحفظ تحسب رقم الصف في الشيت = الترتيب + 2،
    // وحذف صف فارغ في المنتصف كان يجعل الحفظ يقع على صف موظف آخر.
    out = {headers: headers, rows: v.slice(1)};
  }
  V24_CACHE_[name] = out;
  if (ver) v50Put_(name, ver, out);
  return out;
}

/** خريطة عناوين الأعمدة -> رقم العمود */
function v24HeaderIndex_(headers){
  var m = {};
  (headers || []).forEach(function(h, i){ var k = String(h || '').trim(); if (k) m[k] = i; });
  return m;
}

/** قراءة قيمة بأول عنوان متاح من قائمة أسماء محتملة (يتحمل اختلاف المسافة/الشرطة السفلية) */
function v24Pick_(row, idx, names){
  for (var i = 0; i < names.length; i++){
    var n = names[i];
    var c = idx[n];
    if (c == null) c = idx[String(n).replace(/_/g, ' ')];
    if (c == null) c = idx[String(n).replace(/ /g, '_')];
    if (c != null && String(row[c] == null ? '' : row[c]).trim() !== '') return String(row[c]).trim();
  }
  return '';
}

function v24Digits_(v){ return String(v == null ? '' : v).replace(/[^0-9]/g, ''); }

/**
 * قائمة المدارس التشغيلية.
 * المصدر التشغيلي الوحيد للمدارس هو 18_بيانات_المدارس (القاعدة النهائية).
 * تتم القراءة بالعناوين وليس بأرقام أعمدة ثابتة لأن ترتيب أعمدة الورقتين مختلف.
 */
function listPersonnelSchoolsV241_(){
  var d = null;
  try { d = v24Data_('18_بيانات_المدارس'); } catch (e) { d = null; }
  if (!d) throw new Error('ورقة 18_بيانات_المدارس غير موجودة.');
  var idx = v24HeaderIndex_(d.headers);
  var out = d.rows.map(function(r){
    var stages = ['المرحلة_1', 'المرحلة_2', 'المرحلة_3'].map(function(k){
      var c = idx[k]; return c == null ? '' : String(r[c] || '').trim();
    }).filter(Boolean);
    return {
      schoolId: v24Pick_(r, idx, ['schoolId']),
      name: v24Pick_(r, idx, ['اسم_المدرسة', 'الاسم_المعياري']),
      code: v24Pick_(r, idx, ['كود_المدرسة', 'كود_هيئة_الأبنية']),
      type: v24Pick_(r, idx, ['نوع_المدرسة']),
      stages: stages,
      unit: v24Pick_(r, idx, ['الوحدة_المحلية']),
      admin: v24Pick_(r, idx, ['الإدارة']),
      governorate: v24Pick_(r, idx, ['المحافظة']),
      address: v24Pick_(r, idx, ['العنوان']),
      phone: v24Pick_(r, idx, ['الهاتف']),
      status: v24Pick_(r, idx, ['حالة_المدرسة', 'حالة_البيانات']),
      buildingCode: v24Pick_(r, idx, ['كود_هيئة_الأبنية', 'كود_المدرسة']),
      principal: v24Pick_(r, idx, ['اسم_المدير']), principalPhone: v24Pick_(r, idx, ['هاتف_المدير']),
      vicePrincipal: v24Pick_(r, idx, ['اسم_الوكيل']), vicePrincipalPhone: v24Pick_(r, idx, ['هاتف_الوكيل']),
      security: v24Pick_(r, idx, ['مسؤول_الأمن']), securityPhone: v24Pick_(r, idx, ['هاتف_الأمن']),
      dbAdmin: v24Pick_(r, idx, ['مسؤول_القاعدة']), dbAdminPhone: v24Pick_(r, idx, ['هاتف_القاعدة'])
    };
  }).filter(function(s){ return s.schoolId && s.name; });
  out.sort(function(a, b){ return String(a.name).localeCompare(String(b.name), 'ar'); });
  return out;
}

/** بطاقة العامل الكاملة كما تتوقعها الواجهة: {employee, relations, qualifications, movements, monthly, hourly} */
function getPersonnelCardV24_(employeeId){
  employeeId = String(employeeId || '').trim();
  var empty = {employee: null, relations: [], qualifications: [], movements: [], monthly: [], hourly: []};
  if (!employeeId) return empty;

  var emp = v24Data_('01_الأساسي'), row = null;
  for (var i = 0; i < emp.rows.length; i++){
    if (String(emp.rows[i][0] || '').trim() === employeeId){ row = emp.rows[i]; break; }
  }
  if (!row) return empty;

  function sub(sheetName, col, value){
    var d;
    try { d = v24Data_(sheetName); } catch (e) { return []; }
    return d.rows.filter(function(r){ return String(r[col] || '').trim() === value; })
                 .map(function(r){ return {headers: d.headers, row: r}; });
  }

  var nat = v24Digits_(row[1]);
  var hourly = [];
  if (nat){
    var h;
    try { h = v24Data_('02_الحصة'); } catch (e) { h = null; }
    if (h){
      hourly = h.rows.filter(function(r){ return v24Digits_(r[1]) === nat; })
                     .map(function(r){ return {headers: h.headers, row: r}; });
    }
  }

  return {
    employee: {headers: emp.headers, row: row},
    relations: sub('04_علاقات_المدارس', 1, employeeId),
    qualifications: sub('05_المؤهلات', 1, employeeId),
    movements: sub('06_حركة_العامل', 1, employeeId),
    monthly: sub('07_البيانات_الشهرية', 1, employeeId),
    hourly: hourly
  };
}
