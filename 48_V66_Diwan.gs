/** V6.6 — ديوان الإدارة طرف في النقل والندب (من/إلى):
 *  - في الحصر: اختيار «ديوان الإدارة» كجهة؛ ولأن الديوان لا يجري حصرًا، يُطبَّق الطرف المقابل مباشرة (الإدارة هي الديوان).
 *  - في طلبات النقل/الندب بين المدارس: الديوان يظهر في القائمة، والطلبات التي موافقتها على الديوان تقررها الإدارة من «حركة العاملين». */
function v66DiwanId_(){
  var n = v42SchoolNames_(), id = '';
  Object.keys(n).forEach(function(k){ if (!id && /ديوان/.test(n[k] || '')) id = k; });
  return id;
}
/** قرار الإدارة نيابة عن الديوان في طلب نقل/ندب. */
function adminDecideDiwanMoveV66(token, requestId, decision, note){   // V7.35: النواة الموحدة v93Decide_
  var a = v35Admin_(token), dw = v66DiwanId_();
  return v93Decide_(requestId, decision, note, {actor: v36Actor_(a), user: (a.username || 'admin') + ' (ديوان الإدارة)', check: function(v, ix){ if (!dw) throw new Error('هذا الطلب ليس بانتظار ديوان الإدارة.'); v93SchoolApproverCheck_(dw)(v, ix); }, source: 'حركة متبادلة', logPrefix: 'ديوان الإدارة'});
}
