/** V3.9 — الاستحقاقات المالية.
 *  التدفق: المدرسة تُدخل البيانات الشهرية (07) ← ترسلها ← الإدارة تعتمد أو تعيد ← الإدارة تحتسب (16 + 08) ← تعتمد الكشف.
 *  قاعدة أساسية: لا توجد أسعار أو نسب داخل الكود. الأسعار من R_الإعدادات، والنصاب من R_قواعد_النصاب.
 *  إذا كان السعر المطلوب غير معتمد (فارغ) تكون النتيجة «بانتظار اعتماد السعر» ولا تُحتسب قيمة.
 */
var V36_SYSTEMS = { DAYS: 'منظومة أيام', PERIODS: 'منظومة حصص', OVER: 'فوق النصاب', BOTH: 'منظومة حصص + فوق النصاب' };
var V38_MINISTRY_HOUR_RATE=50;
var V38_MINISTRY_SYSTEM_VALUE=800;
var V38_ELIGIBILITY_SHEET='R_فئات_الاستحقاق';
var V38_LEGAL_QUOTA_SHEET='R_النصاب_القانوني';

/* ---------- الإعدادات (R_الإعدادات) ---------- */
var V56_SET_MEMO_ = null;   // V5.6: ورقة الإعدادات تُقرأ مرة واحدة لكل تنفيذ (كانت تُقرأ مع كل إعداد)
function v36SettingsRows_() { if (V56_SET_MEMO_ && !V50_DIRTY_) return V56_SET_MEMO_; var sh = v36Sheet_('R_الإعدادات'), lr = sh.getLastRow(); V56_SET_MEMO_ = { sh: sh, v: lr > 0 ? sh.getRange(1, 1, lr, Math.max(5, sh.getLastColumn())).getDisplayValues() : [] }; return V56_SET_MEMO_; }
function v36GetSetting_(key, def) { var s = v36SettingsRows_(); for (var i = 1; i < s.v.length; i++) if (String(s.v[i][0]).trim() === key) { var x = String(s.v[i][1]).trim(); return x === '' ? (def === undefined ? '' : def) : x; } return def === undefined ? '' : def; }
function v36SetSetting_(key, value, desc) {
  V56_SET_MEMO_ = null; var s = v36SettingsRows_(); V56_SET_MEMO_ = null;
  for (var i = 1; i < s.v.length; i++) if (String(s.v[i][0]).trim() === key) { v50A_(s.sh.getRange(i + 1, 2).setValue(value)); v50A_(s.sh.getRange(i + 1, 4).setValue(new Date())); return; }
  v50A_(s.sh.appendRow([key, value, desc || '', new Date(), 'system']));
}
function v36Rate_(key) { var x = Number(v36GetSetting_(key, '')); return (isFinite(x) && x > 0) ? x : null; }
/** V5.6: الشهر الافتراضي (أحدث شهر مفتوح) — التوافق مع الاستدعاءات القديمة. */
function v36OpenMonth_() {
  var d = v56Default_() || { year: 0, month: 0, workdays: 0, status: 'مغلق', systems: '' };
  return { year: d.year, month: d.month, workdays: d.workdays, status: d.status, systems: v56OpenSystemsFor_(d) };
}
/** V5.6: أي شهر من قائمة الأشهر المفتوحة (لا شهر واحد فقط). يضبط سياق الأنظمة المفتوحة لهذا الشهر. */
function v36ResolveMonth_(year, month) {
  var d = v56Default_() || {}, y = Number(year) || d.year, m = Number(month) || d.month;
  if (!y || !m || m < 1 || m > 12) throw new Error('حدد سنة وشهرًا صحيحين.');
  var e = v56Find_(y, m); V56_CTX_ = e;
  var startDay = e ? (Number(e.startDay) || 1) : 1;
  // أيام العمل للشهر كله تُستخدم للغياب/الحضور، بينما periodWorkdays هي فترة الحصص فقط.
  // مثال: سبتمبر يبدأ حصصه يوم 13 => 14 يوم عمل، أي 2.8 أسبوع من أصل 4.
  var periodWorkdays = 0;
  try { periodWorkdays = v56Workdays_(y, m, startDay).workdays || 0; } catch (e0) { periodWorkdays = 0; }
  return { year: y, month: m, startDay: startDay, isOpen: !!(e && e.status === 'مفتوح'), workdays: e ? e.workdays : 0, periodWorkdays: periodWorkdays, status: e ? e.status : 'غير مفتوح', systems: e ? e.systems : '', label: V56_MONTH_NAMES[m - 1] + ' ' + y };
}
function adminFinanceSettingsV36(token) {
  v35Admin_(token);
  return { success: true, open: v36OpenMonth_(), rates: { RATE_DAY: v36GetSetting_('RATE_DAY', ''), RATE_PERIOD: v36GetSetting_('RATE_PERIOD', ''), RATE_OVER: v36GetSetting_('RATE_OVER', '') },
    missionCountsAsAbsence: v36GetSetting_('MISSION_COUNTS_AS_ABSENCE', 'لا'), limits: v52Limits_() };
}
function adminSaveFinanceSettingsV36(token, p) {
  var a = v35Admin_(token); p = p || {}; var changes = [];
  function num(k, label) { if (p[k] === undefined) return; var x = String(p[k]).trim(); if (x !== '' && !(isFinite(Number(x)) && Number(x) > 0)) throw new Error(label + ' يجب أن يكون رقمًا أكبر من صفر (أو اتركه فارغًا).'); }
  if (p.OPEN_YEAR !== undefined && !/^(20\d\d)$/.test(String(p.OPEN_YEAR).trim())) throw new Error('السنة غير صحيحة.');
  if (p.OPEN_MONTH !== undefined && !(Number(p.OPEN_MONTH) >= 1 && Number(p.OPEN_MONTH) <= 12)) throw new Error('الشهر يجب أن يكون من 1 إلى 12.');
  if (p.OPEN_WORKDAYS !== undefined && !(/^\d+$/.test(String(p.OPEN_WORKDAYS).trim()) && Number(p.OPEN_WORKDAYS) >= 1 && Number(p.OPEN_WORKDAYS) <= 31)) throw new Error('أيام العمل من 1 إلى 31.');
  if (p.MONTH_STATUS !== undefined && ['مفتوح', 'مغلق'].indexOf(p.MONTH_STATUS) < 0) throw new Error('حالة الشهر: مفتوح أو مغلق.');
  if (p.MISSION_COUNTS_AS_ABSENCE !== undefined && ['نعم', 'لا'].indexOf(p.MISSION_COUNTS_AS_ABSENCE) < 0) throw new Error('المأمورية تُحسب غيابًا: نعم أو لا.');
  if (p.OPEN_SYSTEMS !== undefined) { var ks = String(p.OPEN_SYSTEMS).split(',').map(function (x) { return x.trim(); }).filter(Boolean); if (!ks.length) throw new Error('اختر نظامًا واحدًا على الأقل لفتحه، أو اجعل حالة الشهر «مغلق».'); ks.forEach(function (k) { if (['days', 'periods', 'over', 'hourly'].indexOf(k) < 0) throw new Error('نظام غير معروف: ' + k); }); p.OPEN_SYSTEMS = ks.length === 4 ? '' : ks.join(','); }
  ['MAX_HOURLY_PERIODS', 'MAX_OVER_PERIODS'].forEach(function (k) { if (p[k] === undefined) return; var x = String(p[k]).trim(); if (!/^\d+$/.test(x) || Number(x) < 1 || Number(x) > 500) throw new Error((k === 'MAX_OVER_PERIODS' ? 'أقصى فوق النصاب' : 'أقصى حصص معلم الحصة') + ' يجب أن يكون رقمًا صحيحًا من 1 إلى 500.'); });
  num('RATE_DAY', 'سعر اليوم'); num('RATE_PERIOD', 'سعر الحصة'); num('RATE_OVER', 'سعر ساعة فوق النصاب');
  var desc = { RATE_DAY: 'سعر يوم منظومة الأيام', RATE_PERIOD: 'سعر الحصة في منظومة الحصص', RATE_OVER: 'سعر ساعة فوق النصاب', OPEN_YEAR: 'السنة المفتوحة للشهر الحالي', OPEN_MONTH: 'الشهر المفتوح الحالي', OPEN_WORKDAYS: 'عدد أيام العمل الفعلية بدون الإجازات', MONTH_STATUS: 'حالة الشهر', MISSION_COUNTS_AS_ABSENCE: 'هل تُحسب المأمورية ضمن الغياب', OPEN_SYSTEMS: 'الأنظمة المفتوحة للشهر (فارغ = الكل): days,periods,over,hourly', MAX_HOURLY_PERIODS: 'أقصى حصص فعلية لمعلم الحصة/المعاش في الشهر (مجموع مدارسه)', MAX_OVER_PERIODS: 'أقصى حصص فوق النصاب في الشهر' };
  return v35Lock_(function () {
    Object.keys(desc).forEach(function (k) { if (p[k] === undefined) return; var nv = String(p[k]).trim(), ov = v36GetSetting_(k, ''); if (nv !== ov) { v36SetSetting_(k, nv, desc[k]); changes.push([k, ov, nv]); } });
    schoolV31Log_(v36Actor_(a), 'تعديل إعدادات الاستحقاقات', 'FINANCE_SETTINGS', changes);
    return { success: true, message: changes.length ? 'تم حفظ الإعدادات (' + changes.length + ').' : 'لا توجد تغييرات.', changed: changes.length };
  });
}


/* ---------- أهلية الاستحقاقات V3.9 ---------- */
function v38Norm_(v){return String(v==null?'':v).trim().replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').toLowerCase();}
function v38DateActive_(from,to){
  var now=new Date(), f=from?new Date(from):null, t=to?new Date(to):null;
  if(f && !isNaN(f.getTime()) && now<f)return false;
  if(t && !isNaN(t.getTime()) && now>t)return false;
  return true;
}
function v38EligibilityRules_(){
  var d=v24Data_(V38_ELIGIBILITY_SHEET), ix=schoolV31Idx_(d.headers), out=[];
  d.rows.forEach(function(r){
    if(String(schoolV31Val_(r,ix,'الحالة')).trim()!=='فعال')return;
    if(!v38DateActive_(schoolV31Val_(r,ix,'من_تاريخ'),schoolV31Val_(r,ix,'إلى_تاريخ')))return;
    out.push({id:schoolV31Val_(r,ix,'eligibilityId'),kind:schoolV31Val_(r,ix,'نوع_المطابقة'),mode:schoolV31Val_(r,ix,'نمط_المطابقة'),value:schoolV31Val_(r,ix,'قيمة_المطابقة'),category:schoolV31Val_(r,ix,'فئة_الاستحقاق'),eligible:schoolV31Val_(r,ix,'مستحق')==='نعم',schoolRequired:schoolV31Val_(r,ix,'يشترط_جهة_مدرسية')==='نعم',activeRequired:schoolV31Val_(r,ix,'يشترط_حالة_قائم')==='نعم',decision:schoolV31Val_(r,ix,'رقم_القرار'),notes:schoolV31Val_(r,ix,'ملاحظات')});
  }); return out;
}
/** V5.8: الأسماء القديمة للدور ← الجديدة. */
function v58RoleName_(x){ var t = String(x || '').trim(); return t.indexOf('مدرس') >= 0 ? v58Lead_(t) : t; }
function v38WorkerRole_(job){
  var n=v38Norm_(job);
  if(!n)return '';
  if(n.indexOf('مدير عام')>=0 || n.indexOf('مدير اداره')>=0 || n.indexOf('مدير ادارة')>=0)return '';
  if(n.indexOf('وكيل شئون')>=0 || n.indexOf('وكيل شؤون')>=0 || n.indexOf('وكيل اداره')>=0 || n.indexOf('وكيل ادارة')>=0)return '';
  // V5.8: «مدير مدرسة» = «قيادة أولى»، «وكيل مدرسة» = «قيادة ثانية» (المسمى «قيادة أولى/ثانية» في الكادر لا يُحوَّل لدور تلقائيًا — قرار سابق)
  if(n.indexOf('مدير مدرسه')>=0 || n==='مدير')return 'قيادة أولى';
  if(n.indexOf('وكيل مدرسه')>=0 || n==='وكيل' || n.indexOf('وكيل ابتدائي')>=0 || n.indexOf('وكيل اعدادي')>=0 || n.indexOf('وكيل ثانوي')>=0)return 'قيادة ثانية';
  return '';
}
/** أنواع التكليف الخاصة بديوان الإدارة — استحقاقها المالي غير محسوم بعد؛ لا تُتاح لها استحقاقات من شاشة المدرسة حاليًا. */
var V40_DIWAN_ASSIGNMENTS = { 'موجه': 1, 'موجه أول': 1, 'موجه عام': 1, 'رئيس قسم': 1, 'وكيل قسم': 1, 'عضو قسم': 1, 'مدير إدارة': 1, 'وكيل إدارة': 1 };
var V40_SCHOOL_ASSIGNMENTS = { 'قيادة أولى': 'قيادة أولى', 'قيادة ثانية': 'قيادة ثانية', 'قيادة اولى': 'قيادة أولى', 'مدير مدرسة': 'قيادة أولى', 'وكيل مدرسة': 'قيادة ثانية', 'مدير المدرسة': 'قيادة أولى', 'وكيل المدرسة': 'قيادة ثانية' };   // V5.8 (القيم القديمة مقبولة)
var V40_SCHOOL_ASSIGNMENTS_ = (function(){var m={};Object.keys(V40_SCHOOL_ASSIGNMENTS).forEach(function(k){m[v38Norm_(k)]=1;});return m;})();
/** الوظيفة الإشرافية (التكليف) تتقدّم على المسمى الأساسي: معلم خبير مكلَّف «قيادة أولى» يُعامَل كقيادة أولى، وليس كمعلم. */
function v40EffectiveRole_(job, assignment) {
  var a = String(assignment || '').trim();
  if (a && a !== 'بدون') {
    if (V40_SCHOOL_ASSIGNMENTS[a]) return { role: V40_SCHOOL_ASSIGNMENTS[a], isTeacher: false, diwanPending: false };
    if (V40_DIWAN_ASSIGNMENTS[a]) return { role: '', isTeacher: false, diwanPending: true };
  }
  var role = v38WorkerRole_(job), isTeacher = /معلم/.test(String(job || ''));
  return { role: role, isTeacher: isTeacher && !role, diwanPending: false };
}
function v38IsActualSchool_(schoolId){
  try{
    var d=v24Data_('18_بيانات_المدارس'),ix=schoolV31Idx_(d.headers);   // V5.3.1: مصدر المدارس الوحيد
    for(var i=0;i<d.rows.length;i++)if(schoolV31Val_(d.rows[i],ix,'schoolId')===String(schoolId)){
      var name=v38Norm_(schoolV31Val_(d.rows[i],ix,'اسم_المدرسة')), type=v38Norm_(schoolV31Val_(d.rows[i],ix,'نوع_المدرسة'));
      if(name.indexOf('ديوان')>=0 || type.indexOf('ديوان')>=0)return false;
      return true;
    }
  }catch(e){}
  return false;
}
function v38EmployeeEligibility_(row,ei,schoolId){
  if(!v38IsActualSchool_(schoolId))return {eligible:false,category:'',workplace:'ديوان/جهة غير مدرسية',reason:'جهة العمل ليست مدرسة فعلية'};
  if(ei['قائم_بالعمل']!=null && String(row[ei['قائم_بالعمل']]||'نعم').trim()==='لا')return {eligible:false,category:'',workplace:'مدرسة',reason:'غير قائم بالعمل هذا الشهر'};
  var status=schoolV31Val_(row,ei,'الحالة_الوظيفية'), record=schoolV31Val_(row,ei,'حالة_السجل'), sys=schoolV31Val_(row,ei,'نظام_العمل'), job=schoolV31Val_(row,ei,'المسمى_الوظيفي');
  var assignment=ei['الوظيفة_الإشرافية']!=null?schoolV31Val_(row,ei,'الوظيفة_الإشرافية'):'', eff=v40EffectiveRole_(job,assignment);
  if(eff.diwanPending)return {eligible:false,category:'',workplace:'ديوان الإدارة',reason:'تكليف «'+assignment+'» تابع لديوان الإدارة؛ استحقاقه المالي لم يُحسم بعد',role:''};
  var role=eff.role, rules=v38EligibilityRules_();
  var sn=v38Norm_(sys), stn=v38Norm_(status);
  // فئتا معلم الحصة والمعاش مستقلتان عن نصاب المعلم المعين، لكن يشترط وجود علاقة مدرسية فعالة.
  if(sn.indexOf('معلم حصه')>=0 || sn.indexOf('حصة')>=0){return {eligible:true,category:'معلم حصة',workplace:'مدرسة',reason:'نظام العمل = معلم حصة؛ الحساب بعدد الحصص الفعلية فقط',ruleId:'SYSTEM_HOURLY',decision:'قواعد الحصة',role:role,systemCategory:'hourly'};}
  if(sn.indexOf('معاش')>=0 || stn==='معاش'){return {eligible:true,category:'معاش',workplace:'مدرسة',reason:'العامل على المعاش ويعمل فعليًا بالمدرسة؛ لا يطبق عليه نصاب المعلم',ruleId:'SYSTEM_PENSION',decision:'قواعد المعاش',role:role,systemCategory:'pension'};}
  var overridden=!!(assignment && V40_SCHOOL_ASSIGNMENTS_[v38Norm_(assignment)]);
  for(var i=0;i<rules.length;i++){
    var rr=rules[i], target=v38Norm_(v58RoleName_(rr.value)), candidate=rr.kind==='دور_وظيفي'?v38Norm_(role):(overridden?'':v38Norm_(job)), ok=false;
    if(!candidate)continue;
    if(rr.mode==='مطابق')ok=candidate===target; else ok=candidate.indexOf(target)>=0;
    if(!ok)continue;
    if(rr.activeRequired && (status!=='قائم' || record && record!=='قائم'))continue;
    if(rr.schoolRequired && !v38IsActualSchool_(schoolId))continue;
    return {eligible:!!rr.eligible,category:v58RoleName_(rr.category||''),workplace:'مدرسة',reason:rr.notes||('مطابقة قاعدة '+rr.id),ruleId:rr.id,decision:rr.decision||'',role:role};
  }
  return {eligible:false,category:'',workplace:'مدرسة',reason:'الفئة الوظيفية غير مدرجة ضمن فئات الاستحقاق الحالية',role:role};
}

function adminEligibilityRulesV38(token){
  v35Admin_(token); var d=v24Data_(V38_ELIGIBILITY_SHEET); return {success:true,headers:d.headers,rows:d.rows};
}
function adminSaveEligibilityRuleV38(token,p){
  var a=v35Admin_(token); p=p||{}; var sh=v36Sheet_(V38_ELIGIBILITY_SHEET), h=v36Headers_(sh), ix=schoolV31Idx_(h), id=String(p.eligibilityId||'').trim();
  if(!id)id='ELG_'+Utilities.getUuid().replace(/-/g,'').slice(0,18).toUpperCase();
  if(!p['نوع_المطابقة']||['مسمى_وظيفي','دور_وظيفي'].indexOf(String(p['نوع_المطابقة']))<0)throw new Error('نوع المطابقة غير صالح.');
  if(!p['نمط_المطابقة']||['مطابق','يحتوي'].indexOf(String(p['نمط_المطابقة']))<0)throw new Error('نمط المطابقة غير صالح.');
  if(!String(p['قيمة_المطابقة']||'').trim())throw new Error('قيمة المطابقة مطلوبة.');
  // V7.3.1: اقرأ عمود المعرّفات مرة واحدة بدل قراءة خلية من Sheets داخل الحلقة.
  var row=0, lr=sh.getLastRow();
  if(lr>1){
    var idVals=sh.getRange(2,ix.eligibilityId+1,lr-1,1).getDisplayValues();
    for(var i=0;i<idVals.length;i++)if(String(idVals[i][0]).trim()===id){row=i+2;break;}
  }
  var arr=row?sh.getRange(row,1,1,h.length).getValues()[0]:new Array(h.length).fill(''); function put(k,v){if(ix[k]!=null)arr[ix[k]]=schoolV31Clean_(v);}
  put('eligibilityId',id);['نوع_المطابقة','نمط_المطابقة','قيمة_المطابقة','فئة_الاستحقاق','مستحق','يشترط_جهة_مدرسية','يشترط_حالة_قائم','من_تاريخ','إلى_تاريخ','رقم_القرار','الحالة','ملاحظات'].forEach(function(k){if(p[k]!==undefined)put(k,p[k]);});
  if(ix['الحالة']!=null && !String(arr[ix['الحالة']]||'').trim())arr[ix['الحالة']]='فعال';
  if(row)v50A_(sh.getRange(row,1,1,h.length).setValues([arr])); else v50A_(sh.getRange(sh.getLastRow()+1,1,1,h.length).setValues([arr]));
  schoolV31Log_(v36Actor_(a),'تعديل قاعدة أهلية استحقاق',id,[]); return {success:true,message:row?'تم تعديل قاعدة الأهلية.':'تمت إضافة قاعدة أهلية جديدة.',eligibilityId:id};
}
function adminToggleEligibilityRuleV38(token,id,active){
  var a=v35Admin_(token), sh=v36Sheet_(V38_ELIGIBILITY_SHEET), h=v36Headers_(sh), ix=schoolV31Idx_(h), lr=sh.getLastRow(), key=String(id).trim();
  if(lr>1){
    var idVals=sh.getRange(2,ix.eligibilityId+1,lr-1,1).getDisplayValues();
    for(var j=0;j<idVals.length;j++)if(String(idVals[j][0]).trim()===key){
      v50A_(sh.getRange(j+2,ix['الحالة']+1).setValue(active?'فعال':'غير فعال'));
      schoolV31Log_(v36Actor_(a),'تغيير حالة قاعدة أهلية',id,[['الحالة','',active?'فعال':'غير فعال']]);
      return {success:true};
    }
  }
  throw new Error('قاعدة الأهلية غير موجودة.');
}

/* ---------- النصاب (R_قواعد_النصاب) ---------- */
function v36QuotaTable_() {
  var sourceName = v24Data_(V38_LEGAL_QUOTA_SHEET) ? V38_LEGAL_QUOTA_SHEET : 'R_قواعد_النصاب';
  var d = v24Data_(sourceName), ix = schoolV31Idx_(d.headers), m = {};
  d.rows.forEach(function(r){
    var st=schoolV31Val_(r,ix,'الحالة'); if(st && ['فعال','معتمد','مرجع مبدئي'].indexOf(st)<0)return;
    var k=schoolV31Val_(r,ix,'المسمى_الوظيفي')+'|'+schoolV31Val_(r,ix,'المرحلة_التعليمية');
    var weekly=Number(schoolV31Val_(r,ix,'النصاب_الأسبوعي_الأساسي')||schoolV31Val_(r,ix,'النصاب_الأسبوعي_المعدل')||schoolV31Val_(r,ix,'النصاب_الأسبوعي'))||0;
    var monthly=Number(schoolV31Val_(r,ix,'النصاب_الشهري_الأساسي')||schoolV31Val_(r,ix,'النصاب_الشهري'))||0;
    var ded=Number(schoolV31Val_(r,ix,'خصم_المشرف_أسبوعي')||schoolV31Val_(r,ix,'التعديل_للمشرف'))||0;
    var factor=Number(schoolV31Val_(r,ix,'المعامل_الشهري'))||4;
    m[k]={weekly:weekly,monthly:monthly,supervisorDeduction:ded,factor:factor,status:st};
  }); return m;
}

/* ---------- قراءة/كتابة 07 ---------- */
function v36MonthlyRead_() { return v56Read_('07_البيانات_الشهرية'); }
function v36AppendRows_(sh, rows) {
  if (!rows.length) return; var lr = sh.getLastRow(), need = lr + rows.length;
  if (need > sh.getMaxRows()) v50A_(sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows()));
  v50A_(sh.getRange(lr + 1, 1, rows.length, rows[0].length).setValues(rows));
}
function v36Num_(v, allowDec) {
  var s = String(v == null ? '' : v).trim(); if (s === '') return 0;
  if (!(allowDec ? /^\d+(\.\d{1,2})?$/ : /^\d+$/).test(s)) return NaN; return Number(s);
}
/** ترتيب موحَّد لعرض العاملين في كل جدول وتقرير: مدير ← وكيل ← كبير ← خبير ← أول(أ) ← أول ← مساعد لكل فئة (معلم/أخصائي/أمين مكتبة) ← إداريون، وداخل نفس الدرجة الأكبر سنًا أولًا. */
var V40_RANK_TIERS_ = ['كبير', 'خبير', 'اول (أ)', 'أول (أ)', 'اول', 'أول', 'مساعد', ''];
function v40Age_(birthDate) {
  var d = v35Date_(birthDate); if (!d) return -1;
  var age = (new Date().getTime() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000);
  return age;
}
function v40WorkerRank_(job, assignment) {
  var eff = v40EffectiveRole_(job, assignment);
  if (eff.role === 'قيادة أولى' || eff.role === 'مدير المدرسة') return 0;
  if (eff.role === 'قيادة ثانية' || eff.role === 'وكيل المدرسة') return 1;
  var j = String(job || '');
  var fam = /معلم/.test(j) ? 2 : (/اخصائي|أخصائي/.test(j) ? 3 : (/امين مكتبه|أمين مكتبة/.test(j) ? 3.5 : 9));
  var tier = -1; for (var i = 0; i < V40_RANK_TIERS_.length; i++) { if (V40_RANK_TIERS_[i] && j.indexOf(V40_RANK_TIERS_[i]) >= 0) { tier = i; break; } }
  if (tier < 0) tier = V40_RANK_TIERS_.length - 1;
  return fam * 10 + tier;
}
function v40SortWorkers_(list) {
  return list.sort(function (a, b) {
    var c72 = v72Cmp_({job: a.job, subject: a.subject, sup: a.supervisoryJob || a.assignment || a.role, name: ''}, {job: b.job, subject: b.subject, sup: b.supervisoryJob || b.assignment || b.role, name: ''});   // V7.2: الترتيب الموحد
    if (c72) return c72;
    var aa = v40Age_(a.birthDate), ab = v40Age_(b.birthDate);
    if (aa !== ab) return ab - aa; // الأكبر سنًا أولًا
    return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
  });
}
function v36ActiveWorkers_(schoolId) {
  var emp=v24Data_('01_الأساسي'), ei=schoolV31Idx_(emp.headers), rel=v24Data_('04_علاقات_المدارس'), ri=schoolV31Idx_(rel.headers), byId={}, out=[], seen={};
  emp.rows.forEach(function(r){byId[schoolV31Val_(r,ei,'employeeId')]=r;});
  rel.rows.forEach(function(rr){
    if(schoolV31Val_(rr,ri,'schoolId')!==String(schoolId) || !v36ActiveRel_(schoolV31Val_(rr,ri,'الحالة')))return;
    var id=schoolV31Val_(rr,ri,'employeeId'), r=byId[id]; if(!r||seen[id])return; seen[id]=1;
    var elig=v38EmployeeEligibility_(r,ei,schoolId); if(!elig.eligible)return;
    var assignment=ei['الوظيفة_الإشرافية']!=null?schoolV31Val_(r,ei,'الوظيفة_الإشرافية'):'';
    out.push({employeeId:id,relationId:schoolV31Val_(rr,ri,'relationId'),relationType:schoolV31Val_(rr,ri,'نوع_العلاقة'),name:schoolV31Val_(r,ei,'الاسم'),nationalId:schoolV31Val_(r,ei,'الرقم_القومي'),birthDate:schoolV31Val_(r,ei,'تاريخ_الميلاد'),job:schoolV31Val_(r,ei,'المسمى_الوظيفي'),supervisoryJob:assignment,stage:schoolV31Val_(r,ei,'المرحلة_التعليمية_الأصلية'),subject:schoolV31Val_(r,ei,'مادة_التدريس'),system:schoolV31Val_(r,ei,'نظام_العمل'),supervisor:schoolV31Val_(r,ei,'مشرف_على_المادة')==='نعم',eligibilityCategory:elig.category,workplaceType:elig.workplace,eligibilityReason:elig.reason,role:elig.role||''});
  });
  try { var pend72 = {}, nm72 = v42SchoolNames_(); v40ReqList_(function (x) { return x['الحالة'] === 'مفتوح' && x['نوع_الموظف'] === 'أساسي' && (x['نوع_الطلب'] === 'نقل' || x['نوع_الطلب'] === 'ندب كلي') && String(x.fromSchoolId) === String(schoolId); }).forEach(function (x) { pend72[x.employeeId] = x['نوع_الطلب'] + ' إلى «' + (nm72[x.toSchoolId] || x.toSchoolId) + '» بانتظار موافقتها'; }); out.forEach(function (w) { if (pend72[w.employeeId]) w.pendingMove = pend72[w.employeeId]; }); } catch (e) {}   // V7.2
  return v40SortWorkers_(out);
}
function v36RowObj_(r, ix) {
  var o = {}; ['أيام_العمل_الفعلية', 'عارضة', 'اعتيادي', 'مرضي', 'مأمورية', 'إجمالي_الغياب', 'أيام_الحضور_الفعلية', 'الحصص_الفعلية_المنفذة', 'ساعات_فوق_النصاب', 'حالة_الإدخال', 'حالة_الاعتماد', 'ملاحظات'].forEach(function (k) { o[k] = schoolV31Val_(r, ix, k); });
  return o;
}
function v36MonthlyBuild_(schoolId, year, month) {
  var mo = v36ResolveMonth_(year, month), rd = v36MonthlyRead_(), rows = {};
  rd.vals.forEach(function (r) { if (schoolV31Val_(r, rd.ix, 'schoolId') === String(schoolId) && Number(schoolV31Val_(r, rd.ix, 'السنة')) === mo.year && Number(schoolV31Val_(r, rd.ix, 'الشهر')) === mo.month) rows[schoolV31Val_(r, rd.ix, 'employeeId')] = v36RowObj_(r, rd.ix); });
  var workers = v36ActiveWorkers_(schoolId), stat = { مسودة: 0, مرسل: 0, معتمد: 0, 'معاد للمدرسة': 0, 'بدون إدخال': 0 };
  var os = (typeof v51OpenSystems_ === 'function') ? v51OpenSystems_() : null;
  // V5.6: لا نُخفي أحدًا — كل العاملين يظهرون، ومن نظامه غير مفتوح هذا الشهر يظهر للعرض فقط (entryAllowed=false).
  workers.forEach(function (w) { w.fullSystem = w.system; var e = (os && !os.all) ? v51EffectiveSystem_(w.eligibilityCategory === 'معلم حصة' || w.eligibilityCategory === 'معاش' ? w.eligibilityCategory : w.system, os) : (w.system || ''); w.effectiveSystem = e; w.entryAllowed = !os || os.all || !!e; });
  var info52 = v52RelInfo_(), quotas52 = v36QuotaTable_();
  workers.forEach(function (w) {
    var x52 = info52[w.employeeId]; w.multi = !!(x52 && x52.count > 1); w.ownsAbsence = v52OwnsAbsence_(x52, schoolId);
    w.absSchoolName = (w.multi && !w.ownsAbsence) ? v40Names_(x52.absSchoolId) : ''; w.quotaMonthly = v52QuotaMonthly_(w, quotas52);
    w.row = rows[w.employeeId] || null;
    var e = w.row ? (w.row['حالة_الاعتماد'] === 'معتمد' ? 'معتمد' : (w.row['حالة_الإدخال'] === 'مرسل' ? 'مرسل' : (w.row['حالة_الاعتماد'] === 'معاد للمدرسة' ? 'معاد للمدرسة' : 'مسودة'))) : 'بدون إدخال';
    w.state = e; if (w.entryAllowed) stat[e]++;
  });
  stat.notOpen = workers.filter(function (w) { return !w.entryAllowed; }).length;
  return { month: mo, workers: workers, stat: stat, openSystems: os, missionCountsAsAbsence: v36GetSetting_('MISSION_COUNTS_AS_ABSENCE', 'لا') === 'نعم' };
}
function v36FinanceRows_(sheetName, schoolId, year, month) {
  var rd = v56Read_(sheetName), sh = rd.sh, h = rd.h, ix = rd.ix, v = rd.vals;
  return { sh: sh, h: h, ix: ix, rows: v.map(function (r, i) { return { n: i + 2, r: r }; }).filter(function (x) { return (!schoolId || schoolV31Val_(x.r, ix, 'schoolId') === String(schoolId)) && Number(schoolV31Val_(x.r, ix, 'السنة')) === Number(year) && Number(schoolV31Val_(x.r, ix, 'الشهر')) === Number(month); }) };
}
function v36HasApproved_(schoolId, year, month) {   // هل توجد نتيجة مالية معتمدة لهذه المدرسة/الشهر؟
  var f = v36FinanceRows_('08_الماليات', schoolId, year, month);
  return f.rows.some(function (x) { return schoolV31Val_(x.r, f.ix, 'حالة_الاعتماد') === 'معتمد'; });
}

/* ---------- الحفظ (نواة مشتركة للمدرسة والإدارة) ---------- */
function v36SaveMonthlyCore_(actor, schoolId, year, month, items, systems, asAdmin) {
  var mo = v36ResolveMonth_(year, month), missionAbs = v36GetSetting_('MISSION_COUNTS_AS_ABSENCE', 'لا') === 'نعم';
  if (!asAdmin && !mo.isOpen) throw new Error('الشهر غير مفتوح للإدخال حاليًا.');
  if (false) throw new Error('إدخال استحقاقات الأساسيين غير مفتوح لهذا الشهر (المفتوح: معلمو الحصة والمعاش فقط).');
  if (!mo.workdays) throw new Error('لم تحدد الإدارة أيام العمل الفعلية لهذا الشهر بعد.');
  if (!(items && items.length) && !(systems && Object.keys(systems).length)) throw new Error('لا توجد بيانات للحفظ.');
  var owned = {}, info52 = v52RelInfo_(); v36ActiveWorkers_(schoolId).forEach(function (w) { owned[w.employeeId] = w; });
  if (v36HasApproved_(schoolId, mo.year, mo.month)) throw new Error('كشف هذا الشهر معتمد ماليًا ولا يمكن تعديل بياناته. اطلب من الإدارة إعادة فتحه.');
  var errors = [], clean = [], lim52 = v52Limits_(); var os56 = v51OpenSystems_();
  (items || []).forEach(function (it) {
    var w = owned[it.employeeId]; if (!w) { errors.push('عامل غير تابع للمدرسة'); return; }
    if (!asAdmin && os56 && !os56.all && !v51EffectiveSystem_(w.eligibilityCategory === 'معلم حصة' || w.eligibilityCategory === 'معاش' ? w.eligibilityCategory : w.system, os56)) { errors.push(w.name + ': نظامه المالي («' + (w.system || 'غير محدد') + '») غير مفتوح لهذا الشهر'); return; }
    var c = { عارضة: v36Num_(it['عارضة']), اعتيادي: v36Num_(it['اعتيادي']), مرضي: v36Num_(it['مرضي']), مأمورية: v36Num_(it['مأمورية']), حصص: v36Num_(it['الحصص_الفعلية_المنفذة']), ساعات: v36Num_(it['ساعات_فوق_النصاب']) };
    if (!v52OwnsAbsence_(info52[it.employeeId], schoolId)) { c.عارضة = 0; c.اعتيادي = 0; c.مرضي = 0; c.مأمورية = 0; }   // V5.2: الغياب تُدخله المدرسة الأصلية فقط
    var bad = Object.keys(c).filter(function (k) { return isNaN(c[k]); });
    if (bad.length) { errors.push(w.name + ': قيمة غير صحيحة في ' + bad.join('، ')); return; }
    var absence = c.عارضة + c.اعتيادي + c.مرضي + (missionAbs ? c.مأمورية : 0);
    if (absence > mo.workdays) { errors.push(w.name + ': إجمالي الغياب (' + absence + ') أكبر من أيام العمل (' + mo.workdays + ')'); return; }
    if (c.مأمورية > mo.workdays) { errors.push(w.name + ': المأمورية أكبر من أيام العمل'); return; }
    if (c.حصص > 400) { errors.push(w.name + ': عدد الحصص غير منطقي'); return; }
    var lo107 = v107Emp_(it.employeeId).om;   // V7.65: حسب المادة
    if (c.ساعات < 0 || c.ساعات > lo107) { errors.push(w.name + ': فوق النصاب (' + c.ساعات + ') أكبر من الحد الأقصى الشهري (' + lo107 + ')'); return; }
    // V6.5: الفارغ يبقى فارغًا (لم يُدخل) والصفر صفرًا — الحساب يعامل الفارغ كصفر لكن الإرسال يشترط الإدخال.
    var rv = function (k) { var x = String(it[k] == null ? '' : it[k]).trim(); return x === '' ? '' : Number(x); }, own = v52OwnsAbsence_(info52[it.employeeId], schoolId);
    var raw = { عارضة: own ? rv('عارضة') : '', اعتيادي: own ? rv('اعتيادي') : '', مرضي: own ? rv('مرضي') : '', مأمورية: own ? rv('مأمورية') : '', حصص: rv('الحصص_الفعلية_المنفذة'), ساعات: rv('ساعات_فوق_النصاب') };
    clean.push({ w: w, c: c, raw: raw, absence: absence, attend: mo.workdays - absence, notes: schoolV31Clean_(it['ملاحظات']) });
  });
  if (errors.length) throw new Error('لم يُحفظ شيء — راجع الأخطاء:\n' + errors.slice(0, 8).join('\n') + (errors.length > 8 ? '\n... و' + (errors.length - 8) + ' أخرى' : ''));
  return v35Lock_(function () {
    var rd = v36MonthlyRead_(), pos = {}, now = new Date(), added = [], updated = 0, skipped = 0;
    rd.vals.forEach(function (r, n) { if (schoolV31Val_(r, rd.ix, 'schoolId') === String(schoolId) && Number(schoolV31Val_(r, rd.ix, 'السنة')) === mo.year && Number(schoolV31Val_(r, rd.ix, 'الشهر')) === mo.month) pos[schoolV31Val_(r, rd.ix, 'employeeId')] = { n: n + 2, r: r }; });
    clean.forEach(function (x) {
      var ex = pos[x.w.employeeId], arr = ex ? ex.r.slice() : new Array(rd.h.length).fill('');
      if (ex && !asAdmin && (schoolV31Val_(ex.r, rd.ix, 'حالة_الاعتماد') === 'معتمد' || schoolV31Val_(ex.r, rd.ix, 'حالة_الإدخال') === 'مرسل')) { skipped++; return; }
      if (ex && schoolV31Val_(ex.r, rd.ix, 'حالة_الاعتماد') === 'معتمد' && asAdmin) { skipped++; return; }
      function put(k, v) { if (rd.ix[k] != null) arr[rd.ix[k]] = v; }
      if (!ex) { put('monthlyId', 'MON_' + Utilities.getUuid().replace(/-/g, '').slice(0, 18).toUpperCase()); put('employeeId', x.w.employeeId); put('relationId', x.w.relationId); put('schoolId', schoolId); put('السنة', mo.year); put('الشهر', mo.month); put('حالة_الإدخال', 'مسودة'); put('حالة_الاعتماد', ''); }
      put('أيام_العمل_الفعلية', mo.workdays); put('عارضة', x.raw.عارضة); put('اعتيادي', x.raw.اعتيادي); put('مرضي', x.raw.مرضي); put('مأمورية', x.raw.مأمورية);
      put('إجمالي_الغياب', x.absence); put('أيام_الحضور_الفعلية', x.attend); put('الحصص_الفعلية_المنفذة', x.raw.حصص); put('ساعات_فوق_النصاب', x.raw.ساعات); put('ملاحظات', x.notes);
      put('المستخدم', actor.username || ''); put('وقت_الحفظ', now);
      if (ex) { v50A_(rd.sh.getRange(ex.n, 1, 1, rd.h.length).setValues([arr])); updated++; } else added.push(arr);
    });
    v36AppendRows_(rd.sh, added);
    // تحديث نظام العمل في 01 عند تغييره من شاشة الاستحقاقات
    var sysChanged = 0;
    Object.keys(systems || {}).forEach(function (eid) {
      var w = owned[eid]; if (!w) return; var v = String(systems[eid] || '').trim();
      if (v && v36WorkSystems_().indexOf(v) < 0) throw new Error('نظام العمل غير صالح.');
      if (v !== w.system) { var e = v36EmployeeRow_(eid); v36SetCells_(e, { 'نظام_العمل': v }); sysChanged++; schoolV31Log_(actor, 'تعديل نظام العمل', eid, [['نظام_العمل', w.system, v]]); }
    });
    schoolV31Log_(actor, 'حفظ البيانات الشهرية', schoolId + '|' + mo.year + '-' + mo.month, [['صفوف مضافة', '', String(added.length)], ['صفوف محدثة', '', String(updated)]]);
    return { success: true, message: 'تم الحفظ: ' + added.length + ' جديد، ' + updated + ' محدّث' + (sysChanged ? '، ' + sysChanged + ' تغيير في نظام العمل' : '') + (skipped ? ' (تم تخطي ' + skipped + ' صف مقفل)' : '') + '.', added: added.length, updated: updated, skipped: skipped };
  });
}

function v36WorkSystems_(){var out=[V36_SYSTEMS.DAYS,V36_SYSTEMS.PERIODS,V36_SYSTEMS.OVER,V36_SYSTEMS.BOTH,'معلم حصة','معاش'];try{var d=v24Data_('R_أنظمة_العمل'),ix=schoolV31Idx_(d.headers),seen={};out.forEach(function(x){seen[x]=1;});d.rows.forEach(function(r){var x=schoolV31Val_(r,ix,'نظام_العمل'),st=schoolV31Val_(r,ix,'الحالة');if(x&&(!st||st==='فعال')&&!seen[x]){out.push(x);seen[x]=1;}});}catch(e){}return out;}
/* ---------- واجهات المدرسة ---------- */
function schoolMonthlyV36(token, year, month) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_FINANCE');
  if (typeof v65Open_ === 'function' && v65Open_() && !v65Done_()[String(s.schoolId)]) throw new Error('لا تظهر أسماء العاملين في الاستحقاقات إلا بعد اعتماد «حصر العاملين».');   // V7.3
  var b = v36MonthlyBuild_(s.schoolId, year, month);
  b.success = true; b.systems = v36WorkSystems_(); b.limits = v52Limits_(); try { v107Attach_(b.workers, 'E'); } catch (e107) { console.error('schoolMonthlyV36 lim: ' + e107.message); } try { v108AttachMonth_(b.workers, 'E', s.schoolId, b.month.year, b.month.month); } catch (e108) { console.error('schoolMonthlyV36 sub: ' + e108.message); }
  b.calcApproved = v36HasApproved_(s.schoolId, b.month.year, b.month.month);
  var fin = v36FinanceRows_('08_الماليات', '', b.month.year, b.month.month), fx = {};
  fin.rows.forEach(function (x) { fx[schoolV31Val_(x.r, fin.ix, 'employeeId')] = { amount: schoolV31Val_(x.r, fin.ix, 'الإجمالي'), calcStatus: schoolV31Val_(x.r, fin.ix, 'حالة_الحساب'), approved: schoolV31Val_(x.r, fin.ix, 'حالة_الاعتماد') === 'معتمد' }; });
  b.workers.forEach(function (w) { w.amount = fx[w.employeeId] || null; });
  return b;
}
/** احتساب فوري بلا حفظ إطلاقًا — لعرض المبلغ المتوقع أثناء الكتابة فقط. لا يكتب أي شيء في أي شيت. */
function schoolPreviewCalcV40(token, year, month, item) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_FINANCE');
  var mo = v36ResolveMonth_(year, month), rates = { day: v36Rate_('RATE_DAY'), period: v36Rate_('RATE_PERIOD'), over: v36Rate_('RATE_OVER'), maxOver: v52Limits_().over }, quotas = v36QuotaTable_();
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), row = null;
  for (var i = 0; i < emp.rows.length; i++) if (schoolV31Val_(emp.rows[i], ei, 'employeeId') === item.employeeId) { row = emp.rows[i]; break; }
  if (!row) throw new Error('عامل غير موجود.');
  if (!v36SchoolOwnsWorker_(s.schoolId, item.employeeId)) throw new Error('العامل غير مرتبط بمدرستك.');
  var job = schoolV31Val_(row, ei, 'المسمى_الوظيفي'), stage = schoolV31Val_(row, ei, 'المرحلة_التعليمية_الأصلية'), supervisor = schoolV31Val_(row, ei, 'مشرف_على_المادة') === 'نعم';
  var w = { system: item.system, job: job, stage: stage, supervisor: supervisor };
  var m = { days: Math.max(0, mo.workdays - ((Number(item['عارضة']) || 0) + (Number(item['اعتيادي']) || 0) + (Number(item['مرضي']) || 0))), periods: Number(item['الحصص_الفعلية_المنفذة']) || 0, over: Number(item['ساعات_فوق_النصاب']) || 0, periodWorkdays: Number(mo.periodWorkdays) || 0 };
  var c = v36CalcRow_(w, m, quotas, rates);
  return { success: true, amount: c.total, status: c.status, hafiz: c.hafiz, days: m.days };
}
function schoolSaveMonthlyV36(token, year, month, items, systems) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_FINANCE');
  var r = v36SaveMonthlyCore_(s, s.schoolId, year, month, items, systems, false);
  // معاينة المبلغ فور الحفظ (بلا اعتماد ولا قفل) — الاعتماد النهائي والقفل يظلان عند «إرسال للإدارة».
  try { var mo = v36ResolveMonth_(year, month); v36ComputeCore_(s, mo.year, mo.month, s.schoolId, false, true); } catch (e) { }
  return r;
}
function schoolSubmitMonthlyV36(token, year, month, employeeIds) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_FINANCE'); var mo = v36ResolveMonth_(year, month);
  if (!mo.isOpen) throw new Error('الشهر غير مفتوح.');
  var b = v36MonthlyBuild_(s.schoolId, year, month);
  var targeted = Array.isArray(employeeIds), target = {};
  if (targeted) employeeIds.forEach(function(id){target[String(id)]=1;});
  var workers = targeted ? b.workers.filter(function(w){return !!target[String(w.employeeId)]&&w.entryAllowed!==false;}) : b.workers;
  if (targeted && !workers.length) throw new Error('لا توجد سجلات صالحة جديدة للإرسال.');
  var withoutInput = workers.filter(function(w){return w.state==='بدون إدخال';}).length;
  if (withoutInput) throw new Error('لا يمكن الإرسال: ' + withoutInput + ' عامل بدون بيانات شهرية. احفظ بيانات العامل أولًا.');
  var bl65 = v65Blanks_({workers:workers}, null); if (bl65.length) throw new Error('لا يمكن الإرسال — خانات لم تُدخل (اكتب 0 إن لم يوجد):\n' + bl65.slice(0, 10).join('\n'));
  var pending = workers.filter(function(w){return w.state==='مسودة'||w.state==='معاد للمدرسة';}).length;
  if (!pending) throw new Error('لا توجد بيانات جديدة للإرسال.');
  return v35Lock_(function () {
    var rd = v36MonthlyRead_(), n = 0, now = new Date();
    rd.vals.forEach(function (r, i) {
      if (schoolV31Val_(r, rd.ix, 'schoolId') !== String(s.schoolId) || Number(schoolV31Val_(r, rd.ix, 'السنة')) !== mo.year || Number(schoolV31Val_(r, rd.ix, 'الشهر')) !== mo.month || (targeted && !target[String(schoolV31Val_(r, rd.ix, 'employeeId'))])) return;
      if (schoolV31Val_(r, rd.ix, 'حالة_الاعتماد') === 'معتمد' || schoolV31Val_(r, rd.ix, 'حالة_الإدخال') === 'مرسل') return;
      v50A_(rd.sh.getRange(i + 2, rd.ix['حالة_الإدخال'] + 1).setValue('مرسل')); v50A_(rd.sh.getRange(i + 2, rd.ix['حالة_الاعتماد'] + 1).setValue('')); v50A_(rd.sh.getRange(i + 2, rd.ix['وقت_الحفظ'] + 1).setValue(now)); n++;
    });
    schoolV31Log_(s, 'إرسال واعتماد ذاتي للبيانات الشهرية', s.schoolId + '|' + mo.year + '-' + mo.month, [['عدد الصفوف', '', String(n)]]);
    var calc = { message: '', stat: null };
    try { calc = v36ComputeCore_(s, mo.year, mo.month, s.schoolId, true, false); } catch (e) { calc = { message: 'تعذّر الاحتساب التلقائي: ' + e.message, stat: null }; }
    var msg = 'تم إرسال ' + n + ' سجل، ولن تستطيع تعديله بعد الآن. ' + (calc.stat ? calc.message : (calc.message || ''));
    return { success: true, message: msg, sent: n, calc: calc.stat || null };
  });
}
function v36Statement_(schoolId, year, month, onlyApproved) {
  var fin = v36FinanceRows_('08_الماليات', schoolId, year, month), fi = fin.ix, emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), by = {}, sch = {};
  emp.rows.forEach(function (r) { by[schoolV31Val_(r, ei, 'employeeId')] = r; });
  try { var s = v24Data_('18_بيانات_المدارس'), si = schoolV31Idx_(s.headers); s.rows.forEach(function (r) { sch[schoolV31Val_(r, si, 'schoolId')] = schoolV31Val_(r, si, 'اسم_المدرسة'); }); } catch (e) {}
  var rows = fin.rows.map(function (x) {
    var e = by[schoolV31Val_(x.r, fi, 'employeeId')] || [], g = function (k) { return schoolV31Val_(x.r, fi, k); };
    var detail = []; try { detail = JSON.parse(g('تفصيل_المدارس') || '[]') || []; } catch (e2) { detail = []; }
    return { employeeId: g('employeeId'), schoolId: g('schoolId'), school: sch[g('schoolId')] || g('schoolId'), name: schoolV31Val_(e, ei, 'الاسم'), nationalId: schoolV31Val_(e, ei, 'الرقم_القومي'), birthDate: schoolV31Val_(e, ei, 'تاريخ_الميلاد'), job: schoolV31Val_(e, ei, 'المسمى_الوظيفي'), stage: schoolV31Val_(e, ei, 'المرحلة_التعليمية_الأصلية'), supervisor: schoolV31Val_(e, ei, 'مشرف_على_المادة') === 'نعم', supervisoryJob: (ei['الوظيفة_الإشرافية'] != null ? schoolV31Val_(e, ei, 'الوظيفة_الإشرافية') : ''), system: g('نظام_العمل'), weekly: g('النصاب_القانوني_الأسبوعي'), monthly: g('النصاب_الشهري'), days: g('أيام_الحضور_الفعلية'), periods: g('الحصص_الفعلية'), over: g('ساعات_فوق_النصاب'), vDays: g('قيمة_منظومة_الأيام'), vPeriods: g('قيمة_منظومة_الحصص'), vOver: g('قيمة_فوق_النصاب'), total: g('الإجمالي'), calcStatus: g('حالة_الحساب'), approval: g('حالة_الاعتماد'), notes: g('ملاحظات'), hafiz: g('أهلية_الحافز'), schoolsDetail: detail };
  }).filter(function (x) { return !onlyApproved || x.approval === 'معتمد'; });
  v74AttachAbs_(rows, year, month);   // V7.35: الغياب المفصل للطباعة
  v74AttachReportCalc_(rows, year, month); // V7.52: fallback للنصاب والفترة
  rows.forEach(function(x){
    if (!x.tt || !Number(x.weekly) || !/فوق النصاب|حصص \+ فوق/.test(String(x.system || ''))) return;
    // V7.61: مصدر فوق النصاب = الجدول الثاني (حصص_فوق_النصاب) فقط × الأيام الفعلية في الشهر − أيام الغياب. لا استنتاج من إجمالي الجدول ولا × 4.
    if (!x.ot) { x.reportOver = (x.over === '' || x.over == null) ? 0 : Number(x.over) || 0; return; }   // بدون جدول ثانٍ: المحفوظ كما هو
    var calcOver = v96OverMonth_(x.ot, x.absDates, year, month, v107Emp_(x.employeeId).om);   // V7.65
    if (x.over === '' || x.over == null || Number(x.over) === 0) x.over = calcOver;
    x.reportOver = calcOver;
  });
  v40SortWorkers_(rows); rows.sort(function (a, b) { return a.school.localeCompare(b.school, 'ar') || 0; });
  var tot = { days: 0, periods: 0, over: 0, total: 0 }; rows.forEach(function (x) { tot.days += Number(x.days) || 0; tot.periods += Number(x.periods) || 0; tot.over += Number(x.over) || 0; tot.total += Number(x.total) || 0; });
  return { rows: rows, totals: tot };
}
function schoolFinanceStatementV36(token, year, month) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_FINANCE'); var mo = v36ResolveMonth_(year, month), r = v36StatementFull_(s.schoolId, mo.year, mo.month);
  r.success = true; r.month = mo; return r;
}
/** كشف كامل: كل عاملي المدرسة المؤهلين للاستحقاق، بيانات من 08 لمن حُسب له، وعلامة «لم يكتمل» للباقي — تُتاح الطباعة دائمًا. */
function v36StatementFull_(schoolId, year, month) {
  var base = v36Statement_(schoolId, year, month, false), byEmp = {};
  base.rows.forEach(function (x) { byEmp[x.employeeId] = x; });
  var mo = v36ResolveMonth_(year, month), b = v36MonthlyBuild_(schoolId, mo.year, mo.month), byRow = {};
  b.workers.forEach(function (w) { byRow[w.employeeId] = w.state; });
  var workers = v36ActiveWorkers_(schoolId), out = [], allowed56 = {}; b.workers.forEach(function (w) { allowed56[w.employeeId] = w.entryAllowed !== false; });
  workers.forEach(function (w) {
    var x = byEmp[w.employeeId];
    if (!x && allowed56[w.employeeId] === false) return;   // V5.6: الطباعة لمن ينطبق عليهم الفتح فقط
    if (x) { x.complete = x.approval === 'معتمد'; if (!x.complete) x.pendingReason = 'بانتظار مدرسة أخرى ترسل بياناتها'; out.push(x); return; }
    var st = byRow[w.employeeId] || 'بدون إدخال';
    var reason = st === 'بدون إدخال' ? 'لم تُدخَل بياناته بعد هذا الشهر' : (st === 'مسودة' ? 'بياناته مسودة — لم تُرسَل بعد' : 'بانتظار الاحتساب');
    out.push({ employeeId: w.employeeId, schoolId: schoolId, school: '', name: w.name, nationalId: w.nationalId, birthDate: w.birthDate, job: w.job, stage: w.stage, supervisor: !!w.supervisor, supervisoryJob: w.supervisoryJob, system: w.system, weekly: '', monthly: '', days: '', periods: '', over: '', vDays: '', vPeriods: '', vOver: '', total: '', calcStatus: '', approval: '', notes: '', hafiz: '', schoolsDetail: [], complete: false, pendingReason: reason });
  });
  v74AttachAbs_(out.filter(function (x) { return !x.abs; }), mo.year, mo.month);   // V7.35
  v40SortWorkers_(out);
  var tot = { days: 0, periods: 0, over: 0, total: 0 }; out.forEach(function (x) { if (x.complete) { tot.days += Number(x.days) || 0; tot.periods += Number(x.periods) || 0; tot.over += Number(x.over) || 0; tot.total += Number(x.total) || 0; } });
  return { rows: out, totals: tot };
}


/* ---------- واجهات الإدارة ---------- */
function adminMonthlyOverviewV36(token, year, month) {
  v35Admin_(token); var mo = v36ResolveMonth_(year, month), rd = v36MonthlyRead_(), per = {};
  rd.vals.forEach(function (r) {
    if (Number(schoolV31Val_(r, rd.ix, 'السنة')) !== mo.year || Number(schoolV31Val_(r, rd.ix, 'الشهر')) !== mo.month) return;
    var sid = schoolV31Val_(r, rd.ix, 'schoolId'), p = per[sid] = per[sid] || { rows: 0, draft: 0, sent: 0, approved: 0, returned: 0 }; p.rows++;
    if (schoolV31Val_(r, rd.ix, 'حالة_الاعتماد') === 'معتمد') p.approved++; else if (schoolV31Val_(r, rd.ix, 'حالة_الإدخال') === 'مرسل') p.sent++; else if (schoolV31Val_(r, rd.ix, 'حالة_الاعتماد') === 'معاد للمدرسة') p.returned++; else p.draft++;
  });
  var fin = v36FinanceRows_('08_الماليات', '', mo.year, mo.month), fp = {};
  fin.rows.forEach(function (x) { var sid = schoolV31Val_(x.r, fin.ix, 'schoolId'), p = fp[sid] = fp[sid] || { calc: 0, waiting: 0, review: 0, approved: 0, total: 0 }; var st = schoolV31Val_(x.r, fin.ix, 'حالة_الحساب'); p.calc++; if (st === 'بانتظار اعتماد السعر') p.waiting++; if (st === 'مراجعة') p.review++; if (schoolV31Val_(x.r, fin.ix, 'حالة_الاعتماد') === 'معتمد') p.approved++; p.total += Number(schoolV31Val_(x.r, fin.ix, 'الإجمالي')) || 0; });
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), wc = {}, ex = {}, os = (typeof v51OpenSystems_ === 'function') ? v51OpenSystems_() : null, sysBy = {};
  if (os && !os.all) { var emp_ = v24Data_('01_الأساسي'), ei_ = schoolV31Idx_(emp_.headers); emp_.rows.forEach(function (r) { sysBy[schoolV31Val_(r, ei_, 'employeeId')] = schoolV31Val_(r, ei_, 'نظام_العمل'); }); }
  var okE = {}; (function(){ var e_ = v24Data_('01_الأساسي'), x_ = schoolV31Idx_(e_.headers); e_.rows.forEach(function (r) { if (schoolV31Val_(r, x_, 'حالة_السجل') !== 'غير قائم') okE[schoolV31Val_(r, x_, 'employeeId')] = 1; }); })();   // V6.4: لا تُعد العلاقات اليتيمة
  rel.rows.forEach(function (r) { if (v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة')) && okE[schoolV31Val_(r, ri, 'employeeId')]) { var s = schoolV31Val_(r, ri, 'schoolId'); wc[s] = (wc[s] || 0) + 1; if (os && !os.all && v51EffectiveSystem_(sysBy[schoolV31Val_(r, ri, 'employeeId')], os)) ex[s] = (ex[s] || 0) + 1; } });
  var s18 = v24Data_('18_بيانات_المدارس'), si = schoolV31Idx_(s18.headers), schools = [];
  s18.rows.forEach(function (r) { var sid = schoolV31Val_(r, si, 'schoolId'); if (!wc[sid]) return; var p = per[sid] || { rows: 0, draft: 0, sent: 0, approved: 0, returned: 0 }, f = fp[sid] || { calc: 0, waiting: 0, review: 0, approved: 0, total: 0 };
    schools.push({ schoolId: sid, name: schoolV31Val_(r, si, 'اسم_المدرسة'), workers: wc[sid], expected: (os && !os.all) ? (ex[sid] || 0) : wc[sid], entry: p, calc: f }); });
  schools.sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); });
  var mq = []; try { mq = v52MissingQuotas_(); } catch (e) { }
  return { success: true, month: mo, schools: schools, openSystems: os, settings: adminFinanceSettingsV36(token), missingQuotas: mq, months: v56MonthsForSchool_() };
}
function adminMonthlyRowsV36(token, schoolId, year, month) {
  v35Admin_(token); var b = v36MonthlyBuild_(schoolId, year, month); b.success = true; b.schoolName = v36SchoolName_(schoolId); b.systems = [V36_SYSTEMS.DAYS, V36_SYSTEMS.PERIODS, V36_SYSTEMS.OVER, V36_SYSTEMS.BOTH];
  var fin = v36FinanceRows_('08_الماليات', schoolId, b.month.year, b.month.month), fx = {}; fin.rows.forEach(function (x) { fx[schoolV31Val_(x.r, fin.ix, 'employeeId')] = { status: schoolV31Val_(x.r, fin.ix, 'حالة_الحساب'), approval: schoolV31Val_(x.r, fin.ix, 'حالة_الاعتماد'), total: schoolV31Val_(x.r, fin.ix, 'الإجمالي'), notes: schoolV31Val_(x.r, fin.ix, 'ملاحظات') }; });
  b.workers.forEach(function (w) { w.calc = fx[w.employeeId] || null; });
  return b;
}
function adminSaveMonthlyV36(token, schoolId, year, month, items, systems) { var a = v35Admin_(token); return v36SaveMonthlyCore_(v36Actor_(a), schoolId, year, month, items, systems, true); }
function adminMonthlyDecideV36(token, schoolId, year, month, decision, note) {
  var a = v35Admin_(token), mo = v36ResolveMonth_(year, month); if (decision === 'اعتماد') throw new Error('أُلغيت خطوة اعتماد البيانات من الإدارة (V5.2) — إرسال المدرسة اعتماد ذاتي.'); if (decision !== 'إعادة للمدرسة') throw new Error('القرار غير صالح.');
  if (v36HasApproved_(schoolId, mo.year, mo.month)) throw new Error('كشف هذه المدرسة معتمد ماليًا؛ أعد فتحه أولًا.');
  return v35Lock_(function () {
    var rd = v36MonthlyRead_(), n = 0, now = new Date();
    rd.vals.forEach(function (r, i) {
      if (schoolV31Val_(r, rd.ix, 'schoolId') !== String(schoolId) || Number(schoolV31Val_(r, rd.ix, 'السنة')) !== mo.year || Number(schoolV31Val_(r, rd.ix, 'الشهر')) !== mo.month) return;
      var row = i + 2, sent = schoolV31Val_(r, rd.ix, 'حالة_الإدخال') === 'مرسل', appr = schoolV31Val_(r, rd.ix, 'حالة_الاعتماد') === 'معتمد';
      if (decision === 'اعتماد') { if (!sent || appr) return; v50A_(rd.sh.getRange(row, rd.ix['حالة_الاعتماد'] + 1).setValue('معتمد')); v50A_(rd.sh.getRange(row, rd.ix['وقت_الاعتماد'] + 1).setValue(now)); n++; }
      else { v50A_(rd.sh.getRange(row, rd.ix['حالة_الإدخال'] + 1).setValue('مسودة')); v50A_(rd.sh.getRange(row, rd.ix['حالة_الاعتماد'] + 1).setValue('معاد للمدرسة')); if (note) v50A_(rd.sh.getRange(row, rd.ix['ملاحظات'] + 1).setValue(schoolV31Clean_(note))); n++; }
    });
    if (!n) throw new Error(decision === 'اعتماد' ? 'لا توجد بيانات مرسلة للاعتماد.' : 'لا توجد بيانات لإعادتها.');
    schoolV31Log_(v36Actor_(a), decision + ' البيانات الشهرية', schoolId + '|' + mo.year + '-' + mo.month, [['عدد الصفوف', '', String(n)], ['ملاحظة', '', note || '']]);
    return { success: true, message: (decision === 'اعتماد' ? 'تم اعتماد ' : 'أُعيد للمدرسة ') + n + ' سجل.', count: n };
  });
}

/* ---------- محرك الحساب ---------- */
function v38MinistryHourlyNet_(periods,kind){
  var gross=Number(periods||0)*V38_MINISTRY_HOUR_RATE;
  function rd(x,n){return Math.round((Number(x)+Number.EPSILON)*Math.pow(10,n))/Math.pow(10,n);}
  if(kind==='حصة جدد'){
    var d12=rd(gross*0.12,2),d1a=rd(gross*0.01,2),d3=rd(gross*0.03,2),d125=rd(gross*0.0125,2),d9=rd(gross*0.09,2),d1b=rd(gross*0.01,2),d1c=rd(gross*0.01,2);
    var base=gross-d125-d9-d1b-d12-d3-d1a-d1c, d75=rd(base*75/10000,1);
    return rd(gross-(d12+d1a+d3+d125+d9+d1b+d1c+d75),2);
  }
  if(kind==='معاش'){
    var p3=rd(gross*0.03,2),p125=rd(gross*0.0125,2),p1=rd(gross*0.01,2),p75=rd((gross-p125-p1)*75/10000,1);
    return rd(gross-(p3+p125+p1+p75),2);
  }
  return rd(gross,2);
}
/** القيادة الأولى/الثانية: منظومة أيام إلزاميًا ولا يجمعوا نظامًا آخر. */
function v40EnforceLeadershipSystem_(job,system,assignment){
  var eff=v40EffectiveRole_(job,assignment);
  if((eff.role==='قيادة أولى'||eff.role==='قيادة ثانية') && system && system!==V36_SYSTEMS.DAYS)
    throw new Error('«'+eff.role+'» نظامه المالي «منظومة أيام» فقط ولا يجمع نظامًا آخر.');
}
function v36CalcRow_(w,m,quotas,rates){
  var sys=String(w.system||'').trim(),needDays=sys===V36_SYSTEMS.DAYS,needP=sys===V36_SYSTEMS.PERIODS||sys===V36_SYSTEMS.BOTH,needO=sys===V36_SYSTEMS.OVER||sys===V36_SYSTEMS.BOTH;
  var out={needDays:needDays,needP:needP,needO:needO,notes:[],status:'محسوب',vDays:'',vP:'',vO:'',total:'',supervisor:!!w.supervisor,hafiz:'غير منطبق',overCalculated:0};
  var isHourly=w.eligibility&&w.eligibility.systemCategory==='hourly',isPension=w.eligibility&&w.eligibility.systemCategory==='pension';
  var q=(!isHourly&&!isPension)?(quotas[w.job+'|'+w.stage]||null):null;
  out.weekly=q?q.weekly:'';out.monthly=q?q.monthly:'';out.supervisorDeduction=q?q.supervisorDeduction:0;
  var isTeacher=/^(معلم مساعد|معلم|معلم أول|معلم أول \(أ\)|معلم خبير|كبير معلمين)$/.test(String(w.job||'').trim());
  if(q&&isTeacher&&w.supervisor){out.weekly=Math.max(0,q.weekly-q.supervisorDeduction);out.monthly=Math.max(0,out.weekly*(q.factor||4));}
  // النصاب المالي للحصص داخل شهر بدأ في منتصفه يُحسب نسبيًا على أيام فترة الحصص،
  // مع سقف 4 أسابيع للشهر الكامل. الغياب نفسه لا يغيّر النصاب؛ هو فقط يخصم من الحصص الفعلية.
  var periodWeeks = Math.min(4, Math.max(0, Number(m.periodWorkdays || 0) / 5));
  out.periodWeeks = periodWeeks;
  out.periodQuota = (q && out.weekly !== '' && periodWeeks) ? round2_(Number(out.weekly) * periodWeeks) : (q && out.weekly !== '' ? 0 : '');
  var periods=Number(m.periods)||0,days=Number(m.days)||0,overInput=Number(m.over)||0;
  // معلم الحصة والمعاش: معادلة وزارة المالية للحصص الفعلية فقط، بلا نصاب.
  if(isHourly||isPension){
    needDays=false;needP=true;needO=false;out.needDays=false;out.needP=true;out.needO=false;out.weekly='';out.monthly='';out.supervisorDeduction=0;
    out.vP=v38MinistryHourlyNet_(periods,isPension?'معاش':'حصة جدد');
    out.hafiz='غير منطبق';
    out.notes.push(isPension?'معادلة المعاش: الحصص الفعلية × 50 مع خصومات المعاش الواردة بالقاعدة.':'معادلة معلم الحصة: الحصص الفعلية × 50 مع خصومات وزارة المالية الواردة بالقاعدة.');
  }else if(!needDays&&!needP&&!needO){out.status='مراجعة';out.notes.push(sys?'نظام العمل غير معروف: '+sys:'نظام العمل غير محدد للعامل');return out;}
  else{
    // منظومة الأيام: معادلة الوزارة — 20 يومًا أساسًا، والحد الأدنى للاستحقاق 80%.
    if(needDays){var ratio=days>20?1:round2_(days/20);out.vDays=ratio<0.8?0:round2_(ratio*V38_MINISTRY_SYSTEM_VALUE);}
    // منظومة الحصص: 800 × نسبة الحصص الفعلية إلى النصاب الشهري، وبحد أقصى 100%.
    if(needP){
      var quotaForPeriod = Number(out.periodQuota);
      if(q && quotaForPeriod > 0){var pratio=Math.min(1,round2_(periods/quotaForPeriod));out.vP=round2_(pratio*V38_MINISTRY_SYSTEM_VALUE);}
      else{out.vP='';out.notes.push('لا يمكن حساب منظومة الحصص قبل تحديد النصاب القانوني/فترة الحصص.');out.status='مراجعة';return out;}
    }
    // فوق النصاب: عدد حصص فوق النصاب تُدخله المدرسة يدويًا (منفصل تمامًا عن الحصص الفعلية)، وبحد أقصى 24 حصة تُحتسب × 50.
    var maxO=(w&&w.employeeId?v107Emp_(w.employeeId).om:0)||(rates&&rates.maxOver)||24;if(needO){out.overEntered=overInput;out.overCalculated=Math.min(maxO,Math.max(0,overInput));out.vO=round2_(out.overCalculated*V38_MINISTRY_HOUR_RATE);if(overInput>maxO)out.notes.push('أُدخل '+overInput+' حصة فوق النصاب، ويُحتسب منها '+maxO+' فقط (الحد الأقصى الشهري).');}
    // الحافز مستقل: لا نحسب مبلغه؛ نسجل فقط يستحق/لا يستحق، بشرطين مختلفين حسب النظام:
    // منظومة الأيام (مدير/وكيل/معلمون على نظام الأيام): يستحق إن بلغت أيام الحضور الفعلية 18 يومًا فأكثر.
    // باقي الأنظمة (حصص/فوق النصاب/كلاهما): يستحق إن بلغت الحصص الفعلية النصاب الشهري (الأسبوعي × 4) أو زادت عنه.
    // حافز التدريس (حافز واحد فقط): منظومة الأيام تُشترط بـ18 يوم حضورًا، وباقي الأنظمة بالحصص الفعلية الشهرية >= النصاب الشهري.
    if(needDays)out.hafiz=days>=18?'يستحق':'لا يستحق';
    else if(q&&Number(out.periodQuota)>0)out.hafiz=periods>=Number(out.periodQuota)?'يستحق':'لا يستحق';
    else out.hafiz='غير متاح — لم يُحدَّد النصاب القانوني';
  }
  out.total=round2_((Number(out.vDays)||0)+(Number(out.vP)||0)+(Number(out.vO)||0));
  if(needO)out.notes.push('فوق النصاب: عدد الحصص الذي أدخلته المدرسة يدويًا، بحد أقصى '+((w&&w.employeeId?v107Emp_(w.employeeId).om:0)||(rates&&rates.maxOver)||24)+' حصة في الشهر.');
  if((needP||needO)&&!q&&!isHourly&&!isPension)out.notes.push('النصاب القانوني غير معرّف لهذا المسمى/المرحلة.');
  if(q&&isTeacher)out.notes.push('النصاب القانوني '+out.weekly+' حصة أسبوعيًا'+(w.supervisor?' بعد خصم حصتين للإشراف':'')+'.');
  return out;
}

function round2_(x) { return Math.round((Number(x) + Number.EPSILON) * 100) / 100; }
function v40PrimarySchool_(employeeId, relRows, ri) {
  var active = relRows.filter(function (r) { return schoolV31Val_(r, ri, 'employeeId') === employeeId && v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة')); });
  var primary = active.filter(function (r) { return schoolV31Val_(r, ri, 'نوع_العلاقة') === 'أصلي'; })[0] || active[0];
  // مدارس مميَّزة فقط: صفوف مكررة أو قديمة لنفس المدرسة (خطأ إدخال أو بقايا تاريخية) لا تُحتسب مدرسة إضافية.
  var seen = {}, distinctSchoolIds = []; active.forEach(function (r) { var sid = schoolV31Val_(r, ri, 'schoolId'); if (sid && !seen[sid]) { seen[sid] = 1; distinctSchoolIds.push(sid); } });
  return { schoolIds: distinctSchoolIds, primarySchoolId: primary ? schoolV31Val_(primary, ri, 'schoolId') : '', primaryRelationId: primary ? schoolV31Val_(primary, ri, 'relationId') : '', count: distinctSchoolIds.length };
}
/** الاحتساب الشهري — يجمع حصص الموظف من كل مدارسه (النقل/الندب الجزئي) عند مدرسته الأصلية، ولا يُحتسب إلا إذا اعتمدت كل مدرسة بياناتها. */
function adminComputeFinanceV36(token, year, month, schoolId) {
  var a = v35Admin_(token);
  return v36ComputeCore_(v36Actor_(a), year, month, schoolId, false, false);
}
/** المحرك المشترك للاحتساب — يستدعيه كل من: زر الإدارة اليدوي (selfCertify=false، يترك الاعتماد لخطوة adminFinanceApproveV36 لاحقًا)،
 *  وإرسال المدرسة نفسها (selfCertify=true، يعتمد النتيجة ذاتيًا فور الحساب — لا حاجة لموافقة إدارة).
 *  الجاهزية للاحتساب تعتمد على «حالة_الإدخال = مرسل» من المدرسة نفسها، وليس على اعتماد إداري منفصل للبيانات الخام.
 */
function v36EnsureCol_(sheetName, header) {
  var sh = v36Sheet_(sheetName), lc = sh.getLastColumn(), h = lc ? sh.getRange(1, 1, 1, lc).getDisplayValues()[0] : [];
  if (h.indexOf(header) >= 0) return; v50A_(sh.getRange(1, lc + 1).setValue(header));
}
function v36ComputeCore_(actor, year, month, schoolId, selfCertify, includeDrafts) {
  v36EnsureCol_('08_الماليات', 'تفصيل_المدارس');
  var mo = v36ResolveMonth_(year, month), rd = v36MonthlyRead_(), rates = { day: v36Rate_('RATE_DAY'), period: v36Rate_('RATE_PERIOD'), over: v36Rate_('RATE_OVER'), maxOver: v52Limits_().over }, quotas = v36QuotaTable_();
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), by = {}; emp.rows.forEach(function (r) { by[schoolV31Val_(r, ei, 'employeeId')] = r; });
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), info52 = v52RelInfo_();
  var submitted = rd.vals.filter(function (r) { if (Number(schoolV31Val_(r, rd.ix, 'السنة')) !== mo.year || Number(schoolV31Val_(r, rd.ix, 'الشهر')) !== mo.month) return false; var st = schoolV31Val_(r, rd.ix, 'حالة_الإدخال'); return st === 'مرسل' || schoolV31Val_(r, rd.ix, 'حالة_الاعتماد') === 'معتمد' || (includeDrafts && (st === 'مسودة' || st === 'معاد للمدرسة')); });
  if (!submitted.length) { if (!selfCertify && !includeDrafts) throw new Error('لا توجد بيانات شهرية مُرسَلة من أي مدرسة للاحتساب بعد.'); return { success: true, message: 'لا توجد بيانات كافية للاحتساب بعد.', stat: { computed: 0, waiting: 0, review: 0, frozen: 0, incomplete: 0 }, issues: [] }; }
  var byEmp = {}; submitted.forEach(function (r) { var eid = schoolV31Val_(r, rd.ix, 'employeeId'); (byEmp[eid] = byEmp[eid] || []).push(r); });
  if (schoolId) byEmp = Object.keys(byEmp).filter(function (eid) { return byEmp[eid].some(function (r) { return schoolV31Val_(r, rd.ix, 'schoolId') === String(schoolId); }); }).reduce(function (o, eid) { o[eid] = byEmp[eid]; return o; }, {});
  return v35Lock_(function () {
    var f8 = v36FinanceRows_('08_الماليات', '', mo.year, mo.month), f16 = v36FinanceRows_('16_استحقاقات_الماليات', '', mo.year, mo.month), pos8 = {}, pos16 = {}, now = new Date();
    f8.rows.forEach(function (x) { pos8[schoolV31Val_(x.r, f8.ix, 'employeeId')] = x; });
    f16.rows.forEach(function (x) { pos16[schoolV31Val_(x.r, f16.ix, 'employeeId')] = x; });
    var add8 = [], add16 = [], stat = { computed: 0, waiting: 0, review: 0, frozen: 0, incomplete: 0 }, issues = [];
    Object.keys(byEmp).forEach(function (eid) {
      var rows = byEmp[eid], e = by[eid] || [], primary = v40PrimarySchool_(eid, rel.rows, ri);
      var sid = primary.primarySchoolId || schoolV31Val_(rows[0], rd.ix, 'schoolId');
      var elig = v38EmployeeEligibility_(e, ei, sid); var w = { system: schoolV31Val_(e, ei, 'نظام_العمل'), job: schoolV31Val_(e, ei, 'المسمى_الوظيفي'), stage: schoolV31Val_(e, ei, 'المرحلة_التعليمية_الأصلية'), supervisor: schoolV31Val_(e, ei, 'مشرف_على_المادة') === 'نعم', eligibility: elig };
      if (!elig.eligible) { issues.push({ employee: schoolV31Val_(e, ei, 'الاسم'), note: 'غير مؤهل للاستحقاقات الحالية: ' + elig.reason }); return; }
      var os51 = (typeof v51OpenSystems_ === 'function') ? v51OpenSystems_() : null;
      var originalSystem = String(w.system || '').trim();
      var effectiveSystem = originalSystem;
      var partial51 = '';
      if (os51 && !os51.all && elig.systemCategory !== 'hourly' && elig.systemCategory !== 'pension') {
        var eff51 = v51EffectiveSystem_(originalSystem, os51);
        if (!eff51) return;
        if (eff51 !== originalSystem) {
          partial51 = originalSystem;
          effectiveSystem = eff51;
        }
      }
      w.fullSystem = originalSystem;
      w.effectiveSystem = effectiveSystem;
      var calcW = Object.assign({}, w, { system: effectiveSystem, effectiveSystem: effectiveSystem, fullSystem: originalSystem });
      if (rows.length < primary.count) { stat.incomplete++; issues.push({ employee: schoolV31Val_(e, ei, 'الاسم'), note: 'بانتظار إرسال مدرسة أخرى بياناتها (' + rows.length + ' من ' + primary.count + ') — سيُحتسب تلقائيًا فور اكتمالها.' }); return; }
      // الغياب يُجمَع من كل مدارسه (أيام مختلفة في كل مدرسة)، ثم الأيام الفعلية = أيام الشهر − إجمالي الغياب (المأمورية لا تُحسب غيابًا)، بحد أدنى صفر.
      var periods = 0, absTotal = 0, over = 0, schoolsUsed = [], perSchool = [], x52 = info52[eid];
      rows.forEach(function (r) {
        var p_ = Number(schoolV31Val_(r, rd.ix, 'الحصص_الفعلية_المنفذة')) || 0, o_ = Number(schoolV31Val_(r, rd.ix, 'ساعات_فوق_النصاب')) || 0;
        var a1 = Number(schoolV31Val_(r, rd.ix, 'عارضة')) || 0, a2 = Number(schoolV31Val_(r, rd.ix, 'اعتيادي')) || 0, a3 = Number(schoolV31Val_(r, rd.ix, 'مرضي')) || 0, a4 = Number(schoolV31Val_(r, rd.ix, 'مأمورية')) || 0;
        var sid_ = schoolV31Val_(r, rd.ix, 'schoolId'); schoolsUsed.push(sid_);
        if (!v52OwnsAbsence_(x52, sid_)) { a1 = 0; a2 = 0; a3 = 0; a4 = 0; }   // V5.2: غياب المدرسة الأصلية فقط
        var abs_ = a1 + a2 + a3; periods += p_; over += o_; absTotal += abs_;
        perSchool.push({ schoolId: sid_, school: v40Names_(sid_), عارضة: a1, اعتيادي: a2, مرضي: a3, مأمورية: a4, غياب: abs_, حصص: p_, فوق_النصاب: o_ });
      });
      var days = Math.max(0, mo.workdays - absTotal);
      var m = { days: days, periods: periods, over: over, periodWorkdays: Number(mo.periodWorkdays) || 0 };
      var old = pos8[eid]; if (old && schoolV31Val_(old.r, f8.ix, 'حالة_الاعتماد') === 'معتمد') { stat.frozen++; return; }
      var c = v36CalcRow_(calcW, m, quotas, rates);
      if (partial51 || (os51 && !os51.all && !os51.periods && !os51.days)) { c.hafiz = 'غير منطبق هذا الشهر'; c.notes.push('فُتح هذا الشهر: ' + (os51.list || []).map(function (k) { return V51_SYS_LABELS[k]; }).join('، ') + (partial51 ? ' — النظام الكامل للعامل «' + partial51 + '»، والمحسوب «' + effectiveSystem + '» فقط' : '')); }
      if (c.status === 'محسوب') stat.computed++; else if (c.status === 'مراجعة') { stat.review++; issues.push({ employee: schoolV31Val_(e, ei, 'الاسم'), note: c.notes.join(' — ') }); } else stat.waiting++;
      // 08
      var a8 = old ? old.r.slice() : new Array(f8.h.length).fill(''); function p8(k, v) { if (f8.ix[k] != null) a8[f8.ix[k]] = v; }
      if (!old) { p8('financialId', 'FIN_' + Utilities.getUuid().replace(/-/g, '').slice(0, 18).toUpperCase()); p8('employeeId', eid); p8('relationId', primary.primaryRelationId); p8('schoolId', sid); p8('السنة', mo.year); p8('الشهر', mo.month); }
      p8('نظام_العمل', originalSystem); p8('مؤهل_للاستحقاقات', 'نعم'); p8('فئة_الاستحقاق', w.eligibility.category); p8('نوع_جهة_العمل', w.eligibility.workplace); p8('النصاب_القانوني_الأسبوعي', c.weekly); p8('خصم_الإشراف', c.supervisorDeduction || 0); p8('النصاب_بعد_الإشراف', c.weekly); p8('أهلية_الحافز', c.hafiz); p8('قيمة_الحافز', ''); p8('النصاب_الشهري', c.monthly); p8('أيام_الحضور_الفعلية', m.days); p8('الحصص_الفعلية', m.periods); p8('ساعات_فوق_النصاب', c.overCalculated);
      p8('قيمة_منظومة_الأيام', c.vDays); p8('قيمة_منظومة_الحصص', c.vP); p8('قيمة_فوق_النصاب', c.vO); p8('الإجمالي', c.total); p8('حالة_الحساب', c.status); p8('حالة_الاعتماد', (selfCertify && c.status === 'محسوب') ? 'معتمد' : ''); p8('وقت_الحساب', now);
      p8('ملاحظات', c.notes.join(' | ') + (primary.count > 1 ? ' | مجمّع من ' + primary.count + ' مدارس (' + schoolsUsed.join('، ') + ')' : '') + ((selfCertify && c.status === 'محسوب') ? ' | اعتماد ذاتي من المدرسة عند الإرسال.' : '')); if (primary.count > 1) p8('تفصيل_المدارس', JSON.stringify(perSchool));
      if (old) v50A_(f8.sh.getRange(old.n, 1, 1, f8.h.length).setValues([a8])); else add8.push(a8);
      // 16
      var o16 = pos16[eid], a16 = o16 ? o16.r.slice() : new Array(f16.h.length).fill(''); function p16(k, v) { if (f16.ix[k] != null) a16[f16.ix[k]] = v; }
      if (!o16) { p16('eligibilityId', 'ELG_' + Utilities.getUuid().replace(/-/g, '').slice(0, 18).toUpperCase()); p16('employeeId', eid); p16('schoolId', sid); p16('السنة', mo.year); p16('الشهر', mo.month); }
      var fd = c.needDays && Number(m.days) > 0, fp = c.needP && Number(m.periods) > 0, fo = c.needO && c.overCalculated > 0;
      p16('الرقم_القومي', schoolV31Val_(e, ei, 'الرقم_القومي')); p16('مؤهل_للاستحقاقات', 'نعم'); p16('فئة_الاستحقاق', w.eligibility.category); p16('نوع_جهة_العمل', w.eligibility.workplace); p16('نظام_العمل', originalSystem); p16('أهلية_الحافز', c.hafiz); p16('قيمة_الحافز', ''); p16('مستحق_منظومة_الأيام', fd ? 'نعم' : 'لا'); p16('مستحق_منظومة_الحصص', fp ? 'نعم' : 'لا'); p16('مستحق_فوق_النصاب', fo ? 'نعم' : 'لا');
      p16('أيام_الحضور_المعتمدة', m.days); p16('الحصص_المعتمدة', m.periods); p16('ساعات_فوق_النصاب_المعتمدة', c.overCalculated);
      p16('حالة_الاستحقاق', c.status === 'مراجعة' ? 'مراجعة' : ((fd || fp || fo) ? 'مستحق' : 'غير مستحق')); p16('حالة_الاعتماد', (selfCertify && c.status === 'محسوب') ? 'معتمد' : ''); p16('المستخدم', actor.username || ''); p16('وقت_الحساب', now); p16('ملاحظات', c.notes.join(' | '));
      if (o16) v50A_(f16.sh.getRange(o16.n, 1, 1, f16.h.length).setValues([a16])); else add16.push(a16);
    });
    v36AppendRows_(f8.sh, add8); v36AppendRows_(f16.sh, add16);
    schoolV31Log_(actor, selfCertify ? 'احتساب واعتماد ذاتي عند الإرسال' : 'احتساب الاستحقاقات', mo.year + '-' + mo.month + (schoolId ? '|' + schoolId : ''), [['محسوب', '', String(stat.computed)], ['بانتظار السعر', '', String(stat.waiting)], ['مراجعة', '', String(stat.review)], ['بانتظار مدرسة أخرى', '', String(stat.incomplete)]]);
    var msg = 'تم الاحتساب: ' + stat.computed + ' محسوب' + (stat.waiting ? '، ' + stat.waiting + ' بانتظار تحديد الأسعار من الإدارة' : '') + (stat.review ? '، ' + stat.review + ' يحتاج مراجعة' : '') + (stat.incomplete ? '، ' + stat.incomplete + ' بانتظار مدرسة أخرى' : '') + (stat.frozen ? '، ' + stat.frozen + ' معتمد سابقًا (لم يُغيَّر)' : '') + '.';
    return { success: true, message: msg, stat: stat, issues: issues.slice(0, 30), ratesMissing: { RATE_DAY: !rates.day, RATE_PERIOD: !rates.period, RATE_OVER: !rates.over } };
  });
}
function v36SetApproval_(actor, year, month, schoolId, approve, reason) {
  var mo = v36ResolveMonth_(year, month), n = 0;
  return v35Lock_(function () {
    ['08_الماليات', '16_استحقاقات_الماليات'].forEach(function (name, k) {
      var f = v36FinanceRows_(name, schoolId, mo.year, mo.month), col = f.ix['حالة_الاعتماد'], stCol = k === 0 ? f.ix['حالة_الحساب'] : f.ix['حالة_الاستحقاق'];
      f.rows.forEach(function (x) {
        var st = String(x.r[stCol] || '').trim(), cur = String(x.r[col] || '').trim();
        if (approve) { if (st !== 'محسوب' && st !== 'مستحق' && st !== 'غير مستحق') return; if (cur === 'معتمد') return; v50A_(f.sh.getRange(x.n, col + 1).setValue('معتمد')); if (k === 0) n++; }
        else { if (cur !== 'معتمد') return; v50A_(f.sh.getRange(x.n, col + 1).setValue('')); if (k === 0) n++; }
      });
    });
    return n;
  });
}
function adminFinanceApproveV36(token, year, month, schoolId) {
  var a = v35Admin_(token), n = v36SetApproval_(v36Actor_(a), year, month, schoolId, true);
  if (!n) throw new Error('لا توجد نتائج محسوبة قابلة للاعتماد (تحقق من الأسعار والمراجعات).');
  schoolV31Log_(v36Actor_(a), 'اعتماد كشف الاستحقاقات', year + '-' + month + (schoolId ? '|' + schoolId : ''), [['عدد السجلات', '', String(n)]]);
  return { success: true, message: 'تم اعتماد ' + n + ' سجل مالي.', count: n };
}
function adminFinanceReopenV36(token, year, month, schoolId, reason) {
  var a = v35Admin_(token); if (!String(reason || '').trim()) throw new Error('اكتب سبب إعادة فتح الكشف.');
  var n = v36SetApproval_(v36Actor_(a), year, month, schoolId, false);
  if (!n) throw new Error('لا توجد سجلات معتمدة لإعادة فتحها.');
  // افتح أيضًا البيانات الشهرية الخام لهذه المدرسة (07) حتى تقدر المدرسة فعليًا تعدّل وترسل من جديد (الاعتماد الذاتي عند الإرسال يقفلها تلقائيًا).
  var mo = v36ResolveMonth_(year, month), rd = v36MonthlyRead_(), reopened = 0;
  v35Lock_(function () {
    rd.vals.forEach(function (r, i) {
      if (schoolId && schoolV31Val_(r, rd.ix, 'schoolId') !== String(schoolId)) return;
      if (Number(schoolV31Val_(r, rd.ix, 'السنة')) !== mo.year || Number(schoolV31Val_(r, rd.ix, 'الشهر')) !== mo.month) return;
      if (schoolV31Val_(r, rd.ix, 'حالة_الإدخال') !== 'مرسل') return;
      v50A_(rd.sh.getRange(i + 2, rd.ix['حالة_الإدخال'] + 1).setValue('معاد للمدرسة')); reopened++;
    });
  });
  schoolV31Log_(v36Actor_(a), 'إعادة فتح كشف الاستحقاقات', year + '-' + month + (schoolId ? '|' + schoolId : ''), [['السبب', '', reason], ['سجلات مالية', '', String(n)], ['صفوف بيانات مُعادة للتعديل', '', String(reopened)]]);
  return { success: true, message: 'أُعيد فتح ' + n + ' سجل مالي، و' + reopened + ' صف بيانات شهرية أصبح قابلًا للتعديل من المدرسة من جديد. عند إرسال المدرسة له مرة أخرى سيُحتسب ويُعتمد تلقائيًا.', count: n };
}
function adminFinanceStatementV36(token, year, month, schoolId) {
  v35Admin_(token); var mo = v36ResolveMonth_(year, month), r = v36Statement_(schoolId || '', mo.year, mo.month, false); r.success = true; r.month = mo; return r;
}
