/** V7.22 compatibility shim — مصدر العلاقات والحركات هو V81 فقط.
 * لا توجد قائمة مستقلة للحركة؛ هذه الدوال القديمة تبقى للتوافق مع أي كود قديم.
 */
function v84MovementDefinitions_(){
  return v81RelationDefinitions_().filter(function(x){
    return ['TR_IN','IN_FULL_IN','IN_PART'].indexOf(x[0]) >= 0;
  }).map(function(x){
    return [x[0],x[1],v81RelationOrMovementToLegacy_(x[1])];
  });
}
function v84MovementLabels_(){ return v81MovementLabels_(); }
function v84MovementToLegacy_(label){ return v81RelationOrMovementToLegacy_(label); }
function v84MovementFromLegacy_(legacy){ return v81LegacyToRelationLabel_(legacy); }
function v84IsMovementLabel_(label){ return !!v81RelationOrMovementToLegacy_(label); }
function v84NormalizeMovement_(label){ return v81RelationOrMovementToLegacy_(label) || (String(label||'').trim()===String(V82_CANCEL_SECONDMENT||'')?V82_CANCEL_SECONDMENT:''); }
