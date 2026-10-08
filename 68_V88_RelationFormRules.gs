/** V7.26 — قواعد حقول العلاقات والحركات من مصدر V81.
 * لا يغيّر البيانات القديمة؛ يحدد فقط ما يظهر في الواجهة لكل اختيار.
 */
function v88RelationFormRules_(){
  return {
    ORIG:{target:'none',external:false,days:false,periods:false,reason:false,decision:false,date:false,note:false},
    IN_FULL_IN:{target:'school',external:false,days:false,periods:false,reason:true,decision:false,date:false,note:false},
    IN_FULL_OUT:{target:'external',external:true,days:false,periods:false,reason:true,decision:false,date:false,note:false},
    IN_PART:{target:'school',external:false,days:true,periods:true,reason:true,decision:false,date:false,note:false},
    OUT_PART:{target:'school',external:false,days:true,periods:true,reason:true,decision:false,date:false,note:false},
    OUT_PART_OUT:{target:'external',external:true,days:true,periods:true,reason:true,decision:false,date:false,note:false},
    OUT_FULL_IN:{target:'school',external:false,days:false,periods:false,reason:true,decision:false,date:false,note:false},
    OUT_FULL_OUT:{target:'external',external:true,days:false,periods:false,reason:true,decision:false,date:false,note:false},
    LEAVE:{target:'none',external:false,days:false,periods:false,reason:false,decision:false,date:true,note:false,leaveType:true},
    TR_IN:{target:'school',external:false,days:false,periods:false,reason:true,decision:false,date:false,note:false},
    TR_OUT:{target:'external',external:true,days:false,periods:false,reason:true,decision:false,date:false,note:false},
    PENSION:{target:'none',external:false,days:false,periods:false,reason:true,decision:true,date:true,note:true},
    DEATH:{target:'none',external:false,days:false,periods:false,reason:true,decision:false,date:true,note:true},
    END:{target:'none',external:false,days:false,periods:false,reason:true,decision:true,date:true,note:false,endType:true},
    LOAN:{target:'external',external:true,days:false,periods:false,reason:false,decision:true,date:true,note:false},
    ABSENT:{target:'none',external:false,days:false,periods:false,reason:true,decision:false,date:true,note:false},
    SUSP:{target:'none',external:false,days:false,periods:false,reason:true,decision:true,date:true,note:false},
    UNKNOWN:{target:'none',external:false,days:false,periods:false,reason:false,decision:false,date:false,note:true}
  };
}
function schoolRelationFormReferenceV88(token){
  var s=schoolV31Session_(token); schoolV31Allowed_('SCHOOL_BASIC_EDIT');
  return {success:true,source:'V81',relations:v81RelationDefinitions_(),rules:v88RelationFormRules_()};
}
function adminRelationFormReferenceV88(token){
  v35Admin_(token);
  return {success:true,source:'V81',relations:v81RelationDefinitions_(),rules:v88RelationFormRules_()};
}
