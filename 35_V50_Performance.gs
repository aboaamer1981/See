/** V5.0 — طبقة الأداء
 *
 * 1) ذاكرة مؤقتة مشتركة بين التنفيذات للأوراق الكبيرة (01_الأساسي، 04_علاقات_المدارس، ...):
 *    القراءة الكاملة لـ 01_الأساسي وحدها ~120 ألف خلية في كل طلب. الآن تُقرأ مرة وتُحفظ مضغوطة (gzip)
 *    في CacheService وتُستخدم في الطلبات التالية حتى يحدث أي تعديل.
 * 2) صحة البيانات: كل عملية كتابة على الشيت تمر بـ v50A_(...) فتُغيّر «رقم نسخة البيانات» فورًا،
 *    فتصبح كل النسخ المخزنة قديمة ولا تُستخدم. أي تنفيذ كتب بنفسه يقرأ من الشيت مباشرة حتى نهايته.
 *    ومع الكتابة تُوضع علامة «كتابة جارية» 30 ثانية تمنع حفظ نسخة جديدة أثناء الحفظ.
 * 3) التعديل اليدوي في الشيت: مشغّل onEdit/onChange (يُثبّت مرة من المحرر: v50InstallTriggers)
 *    يغيّر رقم النسخة؛ وإن لم يُثبّت فكل نسخة تنتهي تلقائيًا بعد V50_TTL ثانية.
 * 4) v50WriteRow_: كتابة عدة خلايا في صف واحد بأقل عدد من النداءات (خلايا متجاورة = نداء واحد).
 */
var V50_CACHED_SHEETS = {'07_البيانات_الشهرية':1,'08_الماليات':1,'16_استحقاقات_الماليات':1,'07_بيانات_معلمي_الحصة_الشهرية':1,'08_ماليات_معلمي_الحصة':1,'R_الإعدادات':1,'R_المستخدمون':1,'19_صلاحيات_الأدوار':1,'R_الصلاحيات':1,'R_النصاب_القانوني':1,'R_فئات_الاستحقاق':1,'توحيد_المدارس':1,'09_طلبات_متبادلة':1,'01_الأساسي':1,'04_علاقات_المدارس':1,'03_المدارس':1,'18_بيانات_المدارس':1,'13_شؤون_الطلاب':1,'05_معلمو_الحصة_والمعاش':1,'06_علاقات_معلمي_الحصة':1,'11_سجل_التعارضات':1,'05_المؤهلات':1};
var V50_TTL = 1800;            // عمر النسخة المخزنة (ثانية) كحد أقصى
var V50_BUSY_SEC = 8;          // مدة علامة «كتابة جارية»
var V50_CHUNK = 90000;         // حجم الجزء (حد CacheService 100KB للمفتاح)
var V50_DIRTY_ = false;        // هذا التنفيذ كتب على الشيت
var V50_VER_ = null, V50_LAST_MARK_ = 0, V50_FROM_CACHE_ = {};

function v50Cache_(){ return CacheService.getScriptCache(); }
function v50NewVer_(){ return String(Date.now()) + Math.floor(Math.random() * 1e6); }
/** V5.6: رقم نسخة لكل ورقة على حدة (+ رقم عام يُبطل الكل). الكتابة في 07 مثلًا لا تُبطل 01/04/18 المخزنة،
 *  فتبقى الذاكرة المؤقتة دافئة مع عمل المدارس في نفس الوقت. المفتاح = عام|ورقة. */
function v50Ver_(name){
  var c = v50Cache_(), keys = ['V50_VER'], sk = name ? 'V50_SV|' + name : null; if (sk) keys.push(sk);
  var got = c.getAll(keys), g = got['V50_VER'], sv = sk ? got[sk] : '0';
  if (!g) { g = v50NewVer_(); c.put('V50_VER', g, 21600); }
  if (sk && !sv) { sv = '1'; c.put(sk, sv, 21600); }
  return g + '.' + (sv || '0');
}
function v50SheetOf_(x){
  try {
    if (x && typeof x.getSheet === 'function') return x.getSheet().getName();          // Range
    if (x && typeof x.getSheetId === 'function' && typeof x.getName === 'function') return x.getName();   // Sheet
  } catch (e) {}
  return '';
}
var V50_MARKS_ = {};
/** يُستدعى بعد كل كتابة: يعلّم التنفيذ ويغيّر رقم نسخة الورقة المكتوب فيها فقط (أو الكل إن لم تُعرف الورقة). */
function v50A_(x){
  V50_DIRTY_ = true;
  var n = v50SheetOf_(x), k = n || '*', now = Date.now();
  try { if (n) delete V24_CACHE_[n]; else V24_CACHE_ = {}; } catch (e) {}
  if (!V50_MARKS_[k] || now - V50_MARKS_[k] > 1000) {
    V50_MARKS_[k] = now; V50_VER_ = null;
    try {
      var c = v50Cache_();
      if (n) { var m = {}; m['V50_SV|' + n] = v50NewVer_(); m['V50_BUSY|' + n] = '1'; c.putAll(m, 21600); c.put('V50_BUSY|' + n, '1', V50_BUSY_SEC); }
      else { c.put('V50_BUSY', '1', V50_BUSY_SEC); c.put('V50_VER', v50NewVer_(), 21600); }
    } catch (e) {}
  }
  return x;
}
/** «وضع الحفظ»: يُستدعى بعد أخذ القفل في دوال الحفظ. كل قراءة بعده تأتي من الشيت مباشرة. */
function v50Fresh_(){ V50_DIRTY_ = true; V24_CACHE_ = {}; V50_FROM_CACHE_ = {}; }
/** إبطال كل النسخ المخزنة فورًا (زر الإدارة + مشغلات التعديل اليدوي). */
function v50Invalidate_(name){ V50_VER_ = null; V50_MARKS_ = {}; try { if (name) v50Cache_().put('V50_SV|' + name, v50NewVer_(), 21600); else v50Cache_().put('V50_VER', v50NewVer_(), 21600); } catch (e) { console.error('v50Invalidate_ ' + name + ': ' + e.message); } }   // V7.35: كان صامتًا ⇒ بيانات قديمة بلا أثر

function v50Get_(name){
  if (V50_DIRTY_ || !V50_CACHED_SHEETS[name]) return null;
  try {
    var c = v50Cache_(), base = 'V50D|' + v50Ver_(name) + '|' + name, n = Number(c.get(base + '|n') || 0);
    if (!n) return null;
    var keys = []; for (var k = 0; k < n; k++) keys.push(base + '|' + k);
    var got = c.getAll(keys), parts = [];
    for (k = 0; k < n; k++) { if (got[keys[k]] == null) return null; parts.push(got[keys[k]]); }
    var bytes = Utilities.base64Decode(parts.join(''));
    var json = Utilities.ungzip(Utilities.newBlob(bytes, 'application/x-gzip')).getDataAsString('UTF-8');
    V50_FROM_CACHE_[name] = 1;
    return JSON.parse(json);
  } catch (e) { return null; }
}
function v50Put_(name, ver, out){
  if (V50_DIRTY_ || !V50_CACHED_SHEETS[name]) return;
  try {
    var c = v50Cache_(), st = c.getAll(['V50_BUSY', 'V50_BUSY|' + name]);
    if (st['V50_BUSY'] || st['V50_BUSY|' + name] || v50Ver_(name) !== ver) return;   // كتابة جارية أو تغيّرت النسخة أثناء القراءة
    var b64 = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(JSON.stringify(out), 'application/json')).getBytes());
    var base = 'V50D|' + ver + '|' + name, map = {}, n = 0;
    for (var p = 0; p < b64.length; p += V50_CHUNK) map[base + '|' + (n++)] = b64.slice(p, p + V50_CHUNK);
    if (n > 60) return;
    c.putAll(map, V50_TTL); c.put(base + '|n', String(n), V50_TTL);
  } catch (e) {}
}

/** كتابة قيم متعددة في صف واحد: cols = {رقم العمود (1-based): القيمة}. كل مجموعة أعمدة متجاورة = نداء واحد. */
function v50WriteRow_(sh, row, cols){
  var ks = Object.keys(cols || {}).map(Number).filter(function(x){ return x >= 1; }).sort(function(a, b){ return a - b; });
  var i = 0, calls = 0;
  while (i < ks.length) {
    var j = i; while (j + 1 < ks.length && ks[j + 1] === ks[j] + 1) j++;
    var vals = []; for (var k = i; k <= j; k++) vals.push(v93SafeCell_(cols[ks[k]]));   // V7.35: منع حقن معادلات
    v50A_(sh.getRange(row, ks[i], 1, vals.length).setValues([vals])); calls++;
    i = j + 1;
  }
  return calls;
}

/* ===== الإدارة والصيانة ===== */
function adminClearDataCacheV50(token){ v35Admin_(token); v50Invalidate_(); return {success: true, message: 'تم تحديث الذاكرة المؤقتة — الشاشات التالية ستقرأ من الشيت مباشرة.'}; }
/** يُشغَّل مرة واحدة من المحرر بحساب المالك: أي تعديل يدوي في الشيت يُبطل الذاكرة المؤقتة فورًا. */
function v50InstallTriggers(){
  v36OwnerOnly_();   // V7.35: كانت قابلة للاستدعاء من المتصفح بلا حماية
  var id = PERSONNEL_SPREADSHEET_ID;
  ScriptApp.getProjectTriggers().forEach(function(t){ var f = t.getHandlerFunction(); if (f === 'v50OnSheetEdit' || f === 'v50OnSheetChange') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('v50OnSheetEdit').forSpreadsheet(id).onEdit().create();
  ScriptApp.newTrigger('v50OnSheetChange').forSpreadsheet(id).onChange().create();
  ScriptApp.getProjectTriggers().forEach(function(t){ if (t.getHandlerFunction() === 'v56WarmCache') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('v56WarmCache').timeBased().everyMinutes(10).create();
  v56WarmCache();
  return 'تم تثبيت مشغلات تحديث الذاكرة المؤقتة + التسخين كل 10 دقائق.';
}
/** V5.6: يُبقي الأوراق الكبيرة جاهزة في الذاكرة المؤقتة (كل 10 دقائق) حتى لا يدفع أول مستخدم ثمن القراءة الباردة. */
function v56WarmCache(e){ if (!(e && e.triggerUid)) v36OwnerOnly_();   // V7.35: من المشغل أو المالك فقط
  ['01_الأساسي', '04_علاقات_المدارس', '18_بيانات_المدارس', '13_شؤون_الطلاب', '05_معلمو_الحصة_والمعاش', '06_علاقات_معلمي_الحصة', 'R_الإعدادات', '07_البيانات_الشهرية', '08_الماليات'].forEach(function(n){ try { V24_CACHE_ = {}; v24Data_(n); } catch (e) {} }); }
function v50OnSheetEdit(e){ if (!(e && (e.triggerUid || e.range))) v36OwnerOnly_();   /* V7.35 */ var n = ''; try { n = e && e.range ? e.range.getSheet().getName() : ''; } catch (x) {} v50Invalidate_(n); }
function v50OnSheetChange(e){ if (!(e && (e.triggerUid || e.changeType))) v36OwnerOnly_();   /* V7.35 */ v50Invalidate_(); }

/** يحذف الصفوف الوهمية في آخر الأوراق: صفوف بلا مفتاح (العمود الأول) ولا قيمة ذات معنى،
 *  كانت تجعل getLastRow يقرأ آلاف الصفوف الفارغة (03_المدارس: 924 صفًا فيها قيمة افتراضية فقط). لا يمس أي صف له مفتاح. */
var V50_PHANTOM_SHEETS = {'03_المدارس': ['التصنيف_التشغيلي'], '18_بيانات_المدارس': ['التصنيف_التشغيلي'], 'توحيد_المدارس': []};
function adminCleanPhantomRowsV50(token){
  v35Admin_(token);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var ss = personnelSS_(), rep = [];
    Object.keys(V50_PHANTOM_SHEETS).forEach(function(name){
      var sh = ss.getSheetByName(name); if (!sh || sh.getLastRow() < 3) return;
      var lr = sh.getLastRow(), lc = sh.getLastColumn(), v = sh.getRange(1, 1, lr, lc).getDisplayValues(), h = v[0];
      var ignore = {}; V50_PHANTOM_SHEETS[name].forEach(function(k){ var c = h.indexOf(k); if (c >= 0) ignore[c] = 1; });
      var last = 1;
      for (var r = 1; r < v.length; r++) {
        var real = v[r].some(function(x, c){ return !ignore[c] && String(x).trim() !== ''; });
        if (real) last = r + 1;
      }
      if (last < lr) { v50A_(sh.deleteRows(last + 1, lr - last)); rep.push(name + ': حُذف ' + (lr - last) + ' صف وهمي'); }
      if (name === 'توحيد_المدارس' && last > 2) {   // صفوف فارغة في المنتصف (قائمة مرجعية — ترتيبها لا يهم)
        var body = sh.getRange(2, 1, last - 1, lc).getValues().filter(function(x){ return x.some(function(y){ return String(y).trim() !== ''; }); });
        if (body.length < last - 1) { v50A_(sh.getRange(2, 1, last - 1, lc).clearContent()); if (body.length) v50A_(sh.getRange(2, 1, body.length, lc).setValues(body)); v50A_(sh.deleteRows(body.length + 2, last - 1 - body.length)); rep.push(name + ': ضُغطت ' + (last - 1 - body.length) + ' صفوف فارغة'); }
      }
    });
    v50Invalidate_();
    return {success: true, message: rep.length ? rep.join(' — ') : 'لا توجد صفوف وهمية.'};
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

/** V5.6: قراءة ورقة كاملة بصيغة {sh,h,ix,vals} — من الذاكرة المؤقتة في مسارات العرض، ومن الشيت مباشرة بعد أي كتابة/قفل. */
function v56Read_(name){
  var sh = personnelSS_().getSheetByName(name); if (!sh) throw new Error('الورقة غير موجودة: ' + name);
  if (!V50_DIRTY_) { var d = v24Data_(name), h = d.headers.map(function(x){ return String(x == null ? '' : x).trim(); }); return {sh: sh, h: h, ix: schoolV31Idx_(h), vals: d.rows}; }
  var h2 = v36Headers_(sh), lr = sh.getLastRow(); return {sh: sh, h: h2, ix: schoolV31Idx_(h2), vals: lr > 1 ? sh.getRange(2, 1, lr - 1, h2.length).getDisplayValues() : []};
}
