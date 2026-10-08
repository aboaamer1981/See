# Performance / Unified Loading Fix — V7.37

## What changed

- Added a unified page-load controller in `Index_V40.html` (`LOAD93_`).
- Multiple server reads started while a screen/tab is loading now share one `busyOverlay` instead of opening separate waits.
- `callSilent()` automatically joins the unified loading overlay when a page-load batch is active.
- The page-load batch stays open briefly after the last request so chained/short delayed reads can join the same screen.
- Removed the `lite` loading behavior for requests belonging to a full page-load batch.
- Admin tab loads, school tab loads, and staff tab loads now start one unified loading batch.
- Initial school and staff portal bootstrap calls are grouped into the same loading screen.
- Existing background calls remain silent outside a page-load batch, preserving their old behavior.
- No server-side business rules, Sheets schema, or Excel data were changed.

## Important behavior

The waiting screen represents the whole page/tab loading operation. The user should no longer see a sequence of independent loading states for the same screen.

If one operation finishes and another chained operation starts within the short batch window, the same waiting screen remains visible.

## Validation

- Extracted all JavaScript from `Index_V40.html` and passed it through `node --check` successfully.
- No `.gs` business logic was changed in this performance pass.


## V7.38 — تنفيذ بقية إصلاحات الأداء بدون القياس

- منع إجبار تبويب الإدارة `home` على حذف الكاش عند كل عودة؛ الحذف أصبح فقط عند طلب `force`.
- منع إجبار تبويب الموظف `route` على إعادة التحميل عند كل دخول؛ التحديث يتم فقط عند طلب `force`.
- إلغاء prefetch الخلفي لبيانات `schoolHomeV35` و`staffProfileV42` عند الدخول حتى لا تظهر عمليات مخفية خارج شاشة الانتظار الموحدة.
- بوابة المدرسة: جميع مؤشرات الرئيسية + بيانات المدرسة + طلبات الحركة أصبحت تدخل في نفس دفعة الانتظار، بدون `setTimeout` أو تحميل صامت بعد انتهاء الشاشة.
- دمج مراقبي `MutationObserver` الخاصين بالأرقام والمدخلات في مراقب واحد لتقليل العمل المتكرر على `document.body`.
- لوحة الإدارة: رفع مدة Cache للـ Dashboard من 45 إلى 120 ثانية لتقليل إعادة الحساب المكلف.
- V57: إنشاء فهرس مرشحين للمطابقة التقريبية لأسماء المدارس بدل مقارنة كل اسم بكل المدارس.
- V57: إزالة تكرار بناء فهرس الموظفين في الاستيراد.
- V57: استبدال `clearContent + setValues` الكاملين بكتابة الجزء المتغير فقط ومسح الذيل عند الحاجة.
- لم يتم تعديل قواعد البيانات أو ملف Excel أو منطق الصلاحيات.
