/** V7.23 — قوائم الواجهة: إزالة المجموعة النوعية من واجهة بيانات الموظف،
 * وتوحيد القوائم ذات القيم المرجعية في الواجهة دون تغيير التخزين التاريخي.
 */
function v85UiListDefinitions_(){
  return {
    relation: v81RelationLabels_(),
    moveTypes: (typeof v87UnifiedRelationMovementLabels_ === 'function' ? v87UnifiedRelationMovementLabels_() : v81RelationLabels_()),
    educationType: (typeof V42_EDU_TYPES !== 'undefined' && V42_EDU_TYPES) ? V42_EDU_TYPES.slice() : ['عام','ديوان','تعليم مجتمعي'],
    yesno: ['نعم','لا']
  };
}
/* أعلى من V7.22: نضمن أن مرجع الإدارة يرسل القوائم الجديدة للواجهة. */
function v85ApplyReferenceLists_(o){
  o=o||{}; var u=v85UiListDefinitions_();
  o.relation=u.relation.slice();
  o.relationDefs=(typeof v81RelationDefinitions_==='function'?v81RelationDefinitions_():[]);
  o.moveTypes=u.moveTypes.slice();
  o.educationType=u.educationType.slice();
  o.yesno=u.yesno.slice();
  o.relationRules=(typeof v88RelationFormRules_==='function'?v88RelationFormRules_():{});
  o.leaveTypes=(typeof V65_LEAVES!=='undefined'&&V65_LEAVES)?V65_LEAVES.slice():['بدون مرتب','رعاية طفل','مرافقة زوج/زوجة','تجنيد','مرضية طويلة','دراسية','أخرى'];
  o.endTypes=(typeof V65_ENDS!=='undefined'&&V65_ENDS)?V65_ENDS.slice():['استقالة','فصل','انقطاع عن العمل','أخرى'];   // V7.58: قائمة «إنهاء خدمة»
  return o;
}
