/** V7.17 — مصدر موحد لأنواع العلاقة في الحصر والجدول الأساسي وكل شاشات الاختيار.
 * لا يغيّر التخزين التاريخي في 04_علاقات_المدارس؛ بل يربط النصوص الموحدة بالتصنيفات الداخلية التي تعتمد عليها الحسابات.
 */
function v81RelationDefinitions_(){
  return [
    ['ORIG','أصلي','work',''],
    ['IN_FULL_IN','منتدب إلينا كليًا من داخل الإدارة','work','school'],
    ['IN_FULL_OUT','منتدب إلينا كليًا من خارج الإدارة','work','text'],
    ['IN_PART','منتدب إلينا جزئيًا','work','school'],
    ['OUT_PART','أصلي ومنتدب من عندنا جزئيًا داخل الإدارة','work','school'],
    ['OUT_PART_OUT','أصلي ومنتدب جزئيًا خارج الإدارة','work','textpart'],
    ['OUT_FULL_IN','أصلي ومنتدب من عندنا كليًا داخل الإدارة','away','school'],
    ['OUT_FULL_OUT','أصلي ومنتدب من عندنا كليًا خارج الإدارة','away','text'],
    ['LEAVE','إجازة','away','leave'],
    ['LOAN','إعارة','away','text'],   // V7.58
    ['ABSENT','منقطع عن العمل','away',''],   // V7.58
    ['SUSP','موقوف عن العمل','away',''],   // V7.58
    ['TR_IN','نقل داخل الإدارة','gone','school'],
    ['TR_OUT','نقل خارج الإدارة','gone','text'],
    ['PENSION','معاش','gone',''],
    ['DEATH','وفاة','gone',''],
    ['END','إنهاء خدمة','gone','end'],
    ['UNKNOWN','غير معروف للمدرسة','unknown','']
  ];
}
function v81RelationLabels_(){ return v81RelationDefinitions_().map(function(x){return x[1];}); }
function v81RelationToInternal_(label){
  var m={
    'أصلي':'أصلي',
    'منتدب إلينا كليًا من داخل الإدارة':'منتدب إلينا كلي',
    'منتدب إلينا كليًا من خارج الإدارة':'منتدب إلينا كلي',
    'منتدب إلينا جزئيًا':'منتدب إلينا جزئي',
    'أصلي ومنتدب من عندنا جزئيًا داخل الإدارة':'أصلي',
    'أصلي ومنتدب جزئيًا خارج الإدارة':'أصلي'
  };
  return m[String(label||'').trim()] || '';
}
function v81RelationMeta_(label){
  var a=v81RelationDefinitions_(); label=String(label||'').trim();
  for(var i=0;i<a.length;i++) if(a[i][1]===label) return {code:a[i][0],label:a[i][1],group:a[i][2],detail:a[i][3]};
  return null;
}
/** قائمة العلاقات/الحركات الموحدة.
 * نفس المصدر V81؛ لا يوجد مصدر مستقل لأنواع الحركة.
 * الخيارات المعادة هنا هي فقط العلاقات التي تمثل حركة بين مدرستين داخل الإدارة،
 * مع الاحتفاظ بباقي الـ15 حالة في القائمة العامة للعلاقات.
 */
function v81MovementLabels_(){
  return v81RelationDefinitions_().filter(function(x){
    return ['TR_IN','IN_FULL_IN','IN_PART'].indexOf(x[0]) >= 0;
  }).map(function(x){ return x[1]; });
}
function v81RelationOrMovementToLegacy_(label){
  label=String(label||'').trim();
  var map={
    'نقل داخل الإدارة':'نقل',
    'منتدب إلينا كليًا من داخل الإدارة':'ندب كلي',
    'منتدب إلينا جزئيًا':'ندب جزئي',
    'نقل':'نقل',
    'ندب كلي':'ندب كلي',
    'ندب جزئي':'ندب جزئي'
  };
  return map[label] || '';
}
function v81LegacyToRelationLabel_(legacy){
  legacy=String(legacy||'').trim();
  var map={
    'نقل':'نقل داخل الإدارة',
    'ندب كلي':'منتدب إلينا كليًا من داخل الإدارة',
    'ندب جزئي':'منتدب إلينا جزئيًا'
  };
  return map[legacy] || legacy;
}

