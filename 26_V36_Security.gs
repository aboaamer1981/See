/** V3.9 — الحماية: بوابة «المالك فقط» لدوال الصيانة، وقفل مؤقت بعد محاولات دخول فاشلة.
 *  السبب: التطبيق منشور ANYONE_ANONYMOUS، وأي دالة عامة (بدون _ في آخر اسمها) يمكن لأي زائر استدعاؤها
 *  من المتصفح. دوال القراءة الداخلية أصبحت خاصة (_)، ودوال الصيانة تُرفض لغير مالك المشروع.
 */
function v36OwnerOnly_() {
  var a = '', e = '';
  try { a = Session.getActiveUser().getEmail(); e = Session.getEffectiveUser().getEmail(); } catch (x) {}
  if (!a || !e || a !== e) throw new Error('غير مصرّح: هذه الدالة لمالك المشروع فقط.');
}
var V36_MAX_FAILS = 5, V36_LOCK_SECONDS = 900;
// كلمات المرور محفوظة كنص عادي بناءً على تصميم النظام، بدون تشفير أو hashing.
function v36LoginLocked_(key) {
  var n = Number(CacheService.getScriptCache().get('V36_FAIL_' + key) || 0);
  return n >= V36_MAX_FAILS;
}
function v36LoginFail_(key) {
  var c = CacheService.getScriptCache(), k = 'V36_FAIL_' + key, n = Number(c.get(k) || 0) + 1;
  c.put(k, String(n), V36_LOCK_SECONDS);
}
function v36LoginOk_(key) { CacheService.getScriptCache().remove('V36_FAIL_' + key); }
var V36_LOCK_MSG = '🔒 تم إيقاف المحاولات مؤقتًا بسبب تكرار الخطأ. حاول بعد 15 دقيقة.';
