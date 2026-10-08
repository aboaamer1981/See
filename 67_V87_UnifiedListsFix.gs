/** V7.25 — القائمة الموحدة للعلاقات والحركات. المصدر الوحيد للمسميات: V81.
 * V7.35: حُذفت الدوال غير المستخدمة (v87ActionMoveLabels_ / v87UiLists_ / v87ApplyReferenceLists_ / v87BackendMoveTypes_ / v87AuditUnifiedLists_)
 * والمتغير العام V87_EXECUTABLE_MOVE_TYPES (لم يكن يُقرأ، وكان كودًا عامًا يستدعي ملفًا آخر عند التحميل).
 */
function v87UnifiedRelationMovementLabels_(){
  return v81RelationLabels_().slice();
}
