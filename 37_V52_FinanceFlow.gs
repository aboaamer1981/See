/** V5.2 — تبسيط دورة الاستحقاقات الشهرية للمدارس
 *
 * 1) المعلم في مدرستين: الغياب (عارضة/اعتيادي/مرضي/مأمورية) تُدخله المدرسة الأصلية فقط،
 *    والمدرسة الأخرى تُدخل الحصص/فوق النصاب فقط — فلا يُحسب نفس يوم الغياب مرتين.
 * 2) تنبيه الإدارة بالمسميات/المراحل التي ليس لها نصاب قانوني قبل فتح الشهر.
 * 3) إلغاء خطوة «اعتماد البيانات» من الإدارة — الإرسال من المدرسة اعتماد ذاتي.
 * 4) شاشة شهر موحدة للمدرسة: حفظ واحد وإرسال واحد للأساسيين ومعلمي الحصة معًا،
 *    ونسخ الحصص من الشهر السابق عند الطلب فقط (بزر).
 */

/** خريطة: employeeId → {count, primarySchoolId, absSchoolId}. absSchoolId = المدرسة التي تُدخل الغياب. */
function v52RelInfo_() {
  var rel = v24Data_('04_علاقات_المدارس'), ri = schoolV31Idx_(rel.headers), by = {}, out = {}, actual = {};
  rel.rows.forEach(function (r) {
    if (!v36ActiveRel_(schoolV31Val_(r, ri, 'الحالة'))) return;
    var eid = schoolV31Val_(r, ri, 'employeeId'), sid = schoolV31Val_(r, ri, 'schoolId'); if (!eid || !sid) return;
    var x = by[eid] = by[eid] || { ids: [], seen: {}, primary: '' };
    if (!x.seen[sid]) { x.seen[sid] = 1; x.ids.push(sid); }
    if (!x.primary && schoolV31Val_(r, ri, 'نوع_العلاقة') === 'أصلي') x.primary = sid;
  });
  function isActual(sid) { if (actual[sid] === undefined) actual[sid] = v38IsActualSchool_(sid); return actual[sid]; }
  Object.keys(by).forEach(function (eid) {
    var x = by[eid], p = x.primary || x.ids[0], abs = p;
    if (x.ids.length > 1 && !isActual(p)) { for (var i = 0; i < x.ids.length; i++) if (isActual(x.ids[i])) { abs = x.ids[i]; break; } }
    out[eid] = { count: x.ids.length, primarySchoolId: p, absSchoolId: abs };
  });
  return out;
}
/** هل هذه المدرسة هي التي تُدخل غياب العامل؟ (عامل في مدرسة واحدة = نعم دائمًا) */
function v52OwnsAbsence_(info, schoolId) { return !info || info.count < 2 || String(info.absSchoolId) === String(schoolId); }

/** النصاب الشهري للعامل (نفس منطق v36CalcRow_) — للتنبيهات أثناء الكتابة فقط. */
function v52QuotaMonthly_(w, quotas) {
  var q = quotas[w.job + '|' + w.stage]; if (!q) return 0;
  var isTeacher = /^(معلم مساعد|معلم|معلم أول|معلم أول \(أ\)|معلم خبير|كبير معلمين)$/.test(String(w.job || '').trim());
  if (isTeacher && w.supervisor) return Math.max(0, Math.max(0, q.weekly - q.supervisorDeduction) * (q.factor || 4));
  return Number(q.monthly) || 0;
}

/** المسمى|المرحلة لعاملين على «منظومة حصص» أو «فوق النصاب» بلا نصاب قانوني معرّف. */
function v52MissingQuotas_() {
  var quotas = v36QuotaTable_(), emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), info = v52RelInfo_(), groups = {};
  emp.rows.forEach(function (r) {
    var eid = schoolV31Val_(r, ei, 'employeeId'), x = info[eid]; if (!x) return;
    var sys = schoolV31Val_(r, ei, 'نظام_العمل'), needP = sys === V36_SYSTEMS.PERIODS || sys === V36_SYSTEMS.BOTH, needO = sys === V36_SYSTEMS.OVER;
    if (!needP && !needO) return;
    var job = schoolV31Val_(r, ei, 'المسمى_الوظيفي'), stage = schoolV31Val_(r, ei, 'المرحلة_التعليمية_الأصلية'), k = job + '|' + stage;
    if (quotas[k]) return;
    var elig = v38EmployeeEligibility_(r, ei, x.primarySchoolId); if (!elig.eligible || elig.systemCategory === 'hourly' || elig.systemCategory === 'pension') return;
    var g = groups[k] = groups[k] || { job: job, stage: stage || '(بدون مرحلة)', periods: 0, over: 0, total: 0, sample: [] };
    g.total++; if (needP) g.periods++; else g.over++; if (g.sample.length < 3) g.sample.push(schoolV31Val_(r, ei, 'الاسم'));
  });
  return Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) { return b.periods - a.periods || b.total - a.total; });
}

/* ===== شاشة الشهر الموحدة ===== */
/** حصص الشهر السابق لهذه المدرسة (الأساسيون: الحصص الفعلية وفوق النصاب — معلمو الحصة: الحصص الفعلية). الغياب لا يُنسخ. */
function schoolPrevMonthV52(token, year, month) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_FINANCE');
  var mo = v36ResolveMonth_(year, month), py = mo.month === 1 ? mo.year - 1 : mo.year, pm = mo.month === 1 ? 12 : mo.month - 1;
  // سبتمبر أول العام الدراسي: الشهر السابق (أغسطس) غالبًا بلا بيانات — نرجع لآخر شهر فيه بيانات خلال 3 أشهر.
  var basic = {}, hrp = {}, found = null;
  var rd = v36MonthlyRead_(), hd = v40HrpMonthlyRead_();
  for (var back = 0; back < 3 && !found; back++) {
    var y = py, m = pm - back; while (m < 1) { m += 12; y--; }
    rd.vals.forEach(function (r) { if (schoolV31Val_(r, rd.ix, 'schoolId') === String(s.schoolId) && Number(schoolV31Val_(r, rd.ix, 'السنة')) === y && Number(schoolV31Val_(r, rd.ix, 'الشهر')) === m) basic[schoolV31Val_(r, rd.ix, 'employeeId')] = { pr: schoolV31Val_(r, rd.ix, 'الحصص_الفعلية_المنفذة'), ov: schoolV31Val_(r, rd.ix, 'ساعات_فوق_النصاب') }; });
    hd.vals.forEach(function (r) { if (schoolV31Val_(r, hd.ix, 'schoolId') === String(s.schoolId) && Number(schoolV31Val_(r, hd.ix, 'السنة')) === y && Number(schoolV31Val_(r, hd.ix, 'الشهر')) === m) hrp[schoolV31Val_(r, hd.ix, 'hrpId')] = { pr: schoolV31Val_(r, hd.ix, 'الحصص_الفعلية') }; });
    if (Object.keys(basic).length || Object.keys(hrp).length) found = { year: y, month: m };
  }
  return { success: true, prev: found, basic: basic, hrp: hrp };
}

/** حفظ واحد للشاشة الموحدة: الأساسيون ثم الحصص المطلوبة ثم معلمو الحصة. */
function schoolSaveAllV52(token, year, month, basicItems, systems, hrpItems, hrpRequired, allowPartial) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_FINANCE');
  var msgs = [], os = v51OpenSystems_(), requiredSaved = true;
  if ((basicItems && basicItems.length) || (systems && Object.keys(systems).length)) {
    var r1 = schoolSaveMonthlyV36(token, year, month, basicItems || [], systems || {});
    msgs.push('الأساسيون: ' + r1.message);
  }
  if (hrpRequired && hrpRequired.length) { try { var r2 = schoolSaveHrpRequiredBatchV40(token, hrpRequired); msgs.push('الحصص المطلوبة: ' + r2.message); } catch(e2) { if (!allowPartial) throw e2; requiredSaved = false; msgs.push('لم تُحفظ تعديلات الحصص المطلوبة: ' + e2.message); } }
  if (hrpItems && hrpItems.length) {
    try { var r3 = schoolSaveHrpMonthlyV40(token, year, month, hrpItems); msgs.push('معلمو الحصة والمعاش: ' + r3.message); }
    catch (e) { if (msgs.length) throw new Error(msgs.join('\n') + '\n⚠️ لم تُحفظ بيانات معلمي الحصة: ' + e.message); throw e; }
  }
  if (!msgs.length) return { success: true, requiredSaved: true, message: 'لا توجد تغييرات للحفظ.' };
  return { success: true, partial: !requiredSaved, requiredSaved: requiredSaved, message: msgs.join(' — ') };
}

function v52SubmitIssue_(w, hourly, workdays, missionCountsAsAbsence){
  if(!w.row)return 'لا توجد بيانات محفوظة لهذا الشهر';
  var row=w.row,missing=[],values={},keys=[],sys=String(w.effectiveSystem||w.system||'');
  if(hourly){if(w.ownsAbsence!==false)keys=keys.concat(['عارضة','اعتيادي','مرضي','مأمورية']);keys.push('الحصص_الفعلية');}
  else{if(w.ownsAbsence!==false)keys=keys.concat(['عارضة','اعتيادي','مرضي','مأمورية']);if(/حصص/.test(sys))keys.push('الحصص_الفعلية_المنفذة');if(/فوق النصاب/.test(sys))keys.push('ساعات_فوق_النصاب');}
  keys.forEach(function(k){var raw=String(row[k]==null?'':row[k]).trim();if(raw===''){missing.push(k);return;}var n=v36Num_(raw);if(isNaN(n))missing.push(k+' (قيمة غير صحيحة)');else values[k]=n;});
  if(missing.length)return 'خانات ناقصة أو غير صحيحة: '+missing.join('، ');
  var absence=(values.عارضة||0)+(values.اعتيادي||0)+(values.مرضي||0)+((hourly||missionCountsAsAbsence)?(values.مأمورية||0):0);
  if(absence>workdays)return 'إجمالي الغياب أكبر من أيام العمل';
  if(values.مأمورية>workdays)return 'المأمورية أكبر من أيام العمل';
  if(hourly){if(values['الحصص_الفعلية']>v107Hrp_(w.hrpId).hm)return 'الحصص الفعلية أكبر من الحد الأقصى الشهري';}
  else{if(values['الحصص_الفعلية_المنفذة']>400)return 'عدد الحصص غير منطقي';if(values['ساعات_فوق_النصاب']!=null){var overMax=v107Emp_(w.employeeId).om;if(values['ساعات_فوق_النصاب']>overMax)return 'ساعات فوق النصاب أكبر من الحد المسموح';}}
  return '';
}
/** إرسال ذاتي جزئي: تُرسل السجلات المكتملة فقط، وتبقى السجلات التي بها مشكلات مسودات. */
function v52ApprovedIds_(sheetName, idKey, year, month, ids){
  var wanted={},approved={};ids.forEach(function(id){wanted[String(id)]=1;});
  if(!ids.length)return [];
  var rd=v56Read_(sheetName);rd.vals.forEach(function(r){var id=String(schoolV31Val_(r,rd.ix,idKey)||'');if(wanted[id]&&Number(schoolV31Val_(r,rd.ix,'السنة'))===Number(year)&&Number(schoolV31Val_(r,rd.ix,'الشهر'))===Number(month)&&schoolV31Val_(r,rd.ix,'حالة_الاعتماد')==='معتمد')approved[id]=1;});
  return ids.filter(function(id){return !!approved[String(id)];});
}
function schoolSubmitAllV52(token, year, month) {
  var s = schoolV31Session_(token); schoolV31Allowed_('SCHOOL_FINANCE');
  var mo = v36ResolveMonth_(year, month); if (!mo.isOpen) throw new Error('الشهر غير مفتوح.');
  var os=v51OpenSystems_(),basicOpen=v51BasicOpen_(os),hourlyOpen=!!os.hourly,issues=[],errors=[],basicIds=[],hourlyIds=[],sentIds={basic:[],hourly:[]};
  var b=basicOpen?v36MonthlyBuild_(s.schoolId,year,month):null,h=hourlyOpen?schoolHrpMonthlyV40(token,year,month):null;
  var mission=v36GetSetting_('MISSION_COUNTS_AS_ABSENCE','لا')==='نعم';
  if(b)b.workers.forEach(function(w){if(w.entryAllowed===false||w.state==='مرسل'||w.state==='معتمد')return;var reason=v52SubmitIssue_(w,false,Number(mo.workdays)||0,mission);if(reason)issues.push(w.name+': '+reason);else if(w.state==='مسودة'||w.state==='معاد للمدرسة')basicIds.push(w.employeeId);});
  if(h)(h.workers||[]).forEach(function(w){if(w.state==='مرسل'||w.state==='معتمد')return;var reason=v52SubmitIssue_(w,true,Number(mo.workdays)||0,mission);if(reason)issues.push(w.name+' (حصة/معاش): '+reason);else if(w.state==='مسودة')hourlyIds.push(w.hrpId);});
  if(basicIds.length)try{schoolSubmitMonthlyV36(token,year,month,basicIds);sentIds.basic=basicIds;}catch(e1){errors.push('تعذر إرسال الأساسيين: '+e1.message);}
  if(hourlyIds.length)try{schoolSubmitHrpMonthlyV40(token,year,month,hourlyIds);sentIds.hourly=hourlyIds;}catch(e2){errors.push('تعذر إرسال معلمي الحصة والمعاش: '+e2.message);}
  var approvedIds={basic:v52ApprovedIds_('08_الماليات','employeeId',year,month,sentIds.basic),hourly:v52ApprovedIds_(V40_HRP_FIN_SHEET,'hrpId',year,month,sentIds.hourly)};
  var total=sentIds.basic.length+sentIds.hourly.length,approved=approvedIds.basic.length+approvedIds.hourly.length,details=issues.slice(0,12).concat(errors);
  var msg=total?'تم إرسال '+sentIds.basic.length+' من الأساسيين و'+sentIds.hourly.length+' من معلمي الحصة والمعاش، واعتمد فعليًا '+approved+' سجلًا.':'لم يوجد سجل مكتمل جديد للإرسال.';
  if(total>approved)msg+=' بقي '+(total-approved)+' سجلًا مرسلًا دون اعتماد حتى اكتمال المراجعة أو بيانات المدارس/الأسعار.';
  if(details.length)msg+=' تم تأجيل السجلات التالية لتصحيحها: '+details.join('؛ ')+(issues.length>12?'؛ وأسماء أخرى':'')+'.';
  return {success:!errors.length,partial:!!details.length||total>approved,sentIds:sentIds,approvedIds:approvedIds,message:msg,issues:details};
}

/** معلمو الحصة والمعاش: hrpId → {count, absSchoolId} — الغياب تُدخله المدرسة «أصلي» فقط. */
function v52HrpRelInfo_() {
  var rd = v56Read_(V40_HRP_REL_SHEET), ix = rd.ix, by = {}, out = {};
  rd.vals.forEach(function (r) {
    if (!v36ActiveRel_(r[ix['الحالة']])) return; var id = String(r[ix.hrpId] || '').trim(), sid = r[ix.schoolId]; if (!id || !sid) return;
    var x = by[id] = by[id] || { ids: [], seen: {}, primary: '' };
    if (!x.seen[sid]) { x.seen[sid] = 1; x.ids.push(sid); }
    if (!x.primary && r[ix['نوع_العلاقة']] === 'أصلي') x.primary = sid;
  });
  Object.keys(by).forEach(function (id) { var x = by[id]; out[id] = { count: x.ids.length, primarySchoolId: x.primary || x.ids[0], absSchoolId: x.primary || x.ids[0] }; });
  return out;
}

/** تحميل الشاشة الموحدة في نداء واحد. */
function schoolMonthAllV52(token, year, month) {
  var b = schoolMonthlyV36(token, year, month), h = schoolHrpMonthlyV40(token, b.month.year, b.month.month);
  return { success: true, basic: b, hrp: h, month: b.month, months: v56MonthsForSchool_() };
}
/** الكشوف (للاطلاع والطباعة) في نداء واحد — الطباعة تظل منفصلة لكل نظام مالي. */
function schoolStatementsAllV52(token, year, month) {
  var b = schoolFinanceStatementV36(token, year, month), h = schoolHrpStatementV40(token, b.month.year, b.month.month);
  return { success: true, basic: b, hrp: h, month: b.month, months: v56MonthsForSchool_() };
}

/** V5.2.1 — الحدود الشهرية القصوى يتحكم فيها الأدمن من «إعدادات الشهر»:
 *  MAX_HOURLY_PERIODS: أقصى حصص فعلية لمعلم الحصة/المعاش في الشهر (مجموع مدارسه) — افتراضي 96.
 *  MAX_OVER_PERIODS: أقصى حصص فوق النصاب في الشهر — افتراضي 24. */
function v52Limits_() {
  var h = Number(v36GetSetting_('MAX_HOURLY_PERIODS', '96')), o = Number(v36GetSetting_('MAX_OVER_PERIODS', '24'));
  return { hourly: (isFinite(h) && h > 0) ? h : 96, over: (isFinite(o) && o > 0) ? o : 24 };
}

/** V5.4.1 — تعبئة «المرحلة_التعليمية_الأصلية» الفارغة للمعلمين على منظومة الحصص/فوق النصاب (بدونها لا يوجد نصاب).
 *  القاعدة 1 (قرار المستخدم): مدرسته الأصلية لها مرحلة واحدة ← مرحلة المدرسة (رياض الأطفال لا تُعد مرحلة نصاب).
 *  القاعدة 2: غير ذلك ← مرحلته في ملفات المدارس (Master.xlsm) بالرقم القومي.
 *  تملأ الخانات الفارغة فقط ولا تغيّر أي مرحلة مكتوبة. apply=false معاينة. */
var V54_MASTER_STAGE = {};
function v54MasterStage_(){
  if (V54_MASTER_STAGE.__loaded) return V54_MASTER_STAGE;
  V54_MASTER_STAGE.__loaded=true;
  var sh=personnelSS_().getSheetByName('R_Master_Stage');
  if(!sh||sh.getLastRow()<2)return V54_MASTER_STAGE;
  var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0], ni=h.indexOf('الرقم_القومي'), si=h.indexOf('المرحلة');
  if(ni<0||si<0)return V54_MASTER_STAGE;
  sh.getRange(2,1,sh.getLastRow()-1,h.length).getDisplayValues().forEach(function(r){var n=String(r[ni]||'').trim(),v=String(r[si]||'').trim();if(n&&v)V54_MASTER_STAGE[n]=v;});
  return V54_MASTER_STAGE;
}
var V54_TEACHER_JOBS = {'معلم مساعد':1,'معلم':1,'معلم أول':1,'معلم أول (أ)':1,'معلم خبير':1,'كبير معلمين':1};
function v54FillStages_(apply){
  var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), info = v52RelInfo_(), sch = v24Data_('18_بيانات_المدارس'), si = schoolV31Idx_(sch.headers), stages = {}, names = {};
  sch.rows.forEach(function(r){ var id = schoolV31Val_(r, si, 'schoolId'), seen = {}, l = []; names[id] = schoolV31Val_(r, si, 'اسم_المدرسة');
    ['المرحلة_1','المرحلة_2','المرحلة_3'].forEach(function(k){ var x = schoolV31Val_(r, si, k); if (x && x !== 'رياض أطفال' && !seen[x]) { seen[x] = 1; l.push(x); } }); stages[id] = l; });
  var sysOk = {'منظومة حصص':1,'منظومة حصص + فوق النصاب':1,'فوق النصاب':1}, out = [], left = [], bySchool = 0, byMaster = 0;
  emp.rows.forEach(function(r, n){
    if (schoolV31Val_(r, ei, 'المرحلة_التعليمية_الأصلية') || !sysOk[schoolV31Val_(r, ei, 'نظام_العمل')] || !V54_TEACHER_JOBS[schoolV31Val_(r, ei, 'المسمى_الوظيفي')]) return;
    var eid = schoolV31Val_(r, ei, 'employeeId'), x = info[eid], sid = x ? x.primarySchoolId : '', l = stages[sid] || [], v = '', src = '';
    if (l.length === 1) { v = l[0]; src = 'مرحلة المدرسة'; bySchool++; }
    else if (v54MasterStage_()[schoolV31Val_(r, ei, 'الرقم_القومي')]) { v = v54MasterStage_()[schoolV31Val_(r, ei, 'الرقم_القومي')]; src = 'ملفات المدارس (Master)'; byMaster++; }
    if (!v) { left.push(schoolV31Val_(r, ei, 'الاسم') + ' — ' + (names[sid] || sid || 'بلا مدرسة')); return; }
    out.push({n: n + 2, eid: eid, name: schoolV31Val_(r, ei, 'الاسم'), school: names[sid] || sid, stage: v, src: src});
  });
  if (apply && out.length) {
    v50Fresh_(); var sh = personnelSS_().getSheetByName('01_الأساسي'), h = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0], c = h.indexOf('المرحلة_التعليمية_الأصلية'), idc = h.indexOf('employeeId');
    if (c < 0 || idc < 0) throw new Error('عمود المرحلة_التعليمية_الأصلية أو employeeId غير موجود.');
    var ids = sh.getRange(2, idc + 1, sh.getLastRow() - 1, 1).getDisplayValues(), col = sh.getRange(2, c + 1, sh.getLastRow() - 1, 1).getDisplayValues(), pos = {};
    ids.forEach(function(x, i){ pos[x[0]] = i; });
    out.forEach(function(o){ var i = pos[o.eid]; if (i != null && !String(col[i][0]).trim()) col[i][0] = o.stage; });
    v50A_(sh.getRange(2, c + 1, col.length, 1).setValues(col));
    v50Invalidate_();
  }
  return {success: true, message: (apply ? 'تمت تعبئة ' : 'معاينة: ستُعبأ ') + out.length + ' مرحلة (' + bySchool + ' من مرحلة المدرسة، ' + byMaster + ' من ملفات المدارس)' + (left.length ? '، وبقي ' + left.length + ' بلا مصدر' : '') + '.', rows: out, left: left};
}
function adminFillStagesV54(token, apply){ v35Admin_(token); var r = v54FillStages_(!!apply); if (apply) { try { schoolV31Log_(v36Actor_(v35Admin_(token)), 'تعبئة المرحلة التعليمية', '01_الأساسي', [['عدد', '', String(r.rows.length)]]); } catch (e) {} } return r; }
