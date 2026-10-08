/** V7.24 — إصلاح زر الحالة وتوحيد مصدر القوائم المرجعية في الواجهة.
 * الإصلاح الأساسي: كان الكود يستخدم REFS بينما المرجع الفعلي هو REF،
 * مما أوقف فتح شاشة الحالة/الحركة قبل تنفيذ أي طلب.
 * لا يغيّر قاعدة البيانات ولا ملفات 00–21.
 */
function v86UiVersion_(){ return 'V7.24'; }
function v86UiAudit_(){
  return {version:v86UiVersion_(),referenceSource:'V81',uiReferenceObject:'REF',legacyAlias:'REFS'};
}
