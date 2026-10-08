/** V2.8 — طبقة موحدة لقاعدة البيانات النهائية
 * كل التشغيل يعتمد على Spreadsheet ID المحلي فقط.
 * app4 لا يستخدم هنا إطلاقًا.
 */
var DBV2_SHEETS={
  schools:'18_بيانات_المدارس', students:'13_شؤون_الطلاب', disability:'14_إعاقة_الطلاب',
  staff:'01_الأساسي', relations:'04_علاقات_المدارس', hourly:'02_الحصة', hourlySelected:'21_الحصة_المختارون',
  requests:'15_طلبات_العاملين', finance:'16_استحقاقات_الماليات', monthly:'07_البيانات_الشهرية',
  conflicts:'11_سجل_التعارضات', events:'12_سجل_الأحداث', users:'R_المستخدمون', permissions:'19_صلاحيات_الأدوار'
};
function dbv2Sheet_(name){var sh=personnelSS_().getSheetByName(name);if(!sh)throw new Error('ورقة غير موجودة: '+name);return sh;}
function dbv2Values_(name){var sh=dbv2Sheet_(name),lr=sh.getLastRow(),lc=sh.getLastColumn();if(lr<1||lc<1)return [[]];return sh.getRange(1,1,Math.max(1,lr),lc).getDisplayValues();}
function dbv2Rows_(name){var v=dbv2Values_(name);return {headers:v[0],rows:v.slice(1)};}
function dbv2School_(schoolId){var d=dbv2Rows_(DBV2_SHEETS.schools),i=d.headers.indexOf('schoolId');for(var r=0;r<d.rows.length;r++)if(String(d.rows[r][i])===String(schoolId))return d.rows[r];return null;}


