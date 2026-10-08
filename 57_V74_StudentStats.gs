/** V7.4 — نموذج الإحصائية العامة للطلاب داخل بوابة المدرسة.
 * الحقول الأساسية تبقى في 13_شؤون_الطلاب دون إضافة «منقول» أو أي حقول دمج.
 * بيانات الدمج وملخصه داخل نفس سجل الصف في 13_شؤون_الطلاب.
 */
var V74_STUDENT_EXTRA_FIELDS = [];

function v74EnsureStudentStatsColumns_(){
  var sh=personnelSS_().getSheetByName('13_شؤون_الطلاب');
  if(!sh)throw new Error('ورقة 13_شؤون_الطلاب غير موجودة.');
  return{sheet:sh,added:[]};
}

function v74ValidateStudentStats_(f){
  v36ValidateStudent_(f);
}

function schoolGetStudentsV74(token){
  schoolV31Session_(token);schoolV31Allowed_('SCHOOL_STUDENTS_EDIT');
  v74EnsureStudentStatsColumns_();
  return schoolGetStudentsV33(token);
}

function schoolSaveStudentsQuickV74(token,updates){
  var s=schoolV33Session_(token);schoolV31Allowed_('SCHOOL_STUDENTS_EDIT');
  updates=updates||[];if(!updates.length)throw new Error('لا توجد تعديلات لحفظها.');
  var setup=v74EnsureStudentStatsColumns_(),sh=setup.sheet,h=v36Headers_(sh),idx=schoolV33Index_(h);
  var school=schoolV33FindSchoolRow_(s.schoolId),schoolName=school.vals[school.h.indexOf('اسم_المدرسة')],errs=[],plans=[];
  var allowed=SCHOOL_V33_STUDENT_FIELDS.slice();
  updates.forEach(function(u){
    var r=Number(u.row);if(r<2||r>sh.getLastRow()){errs.push('صف غير صالح: '+u.row);return;}
    var old=sh.getRange(r,1,1,h.length).getDisplayValues()[0],rowSid=idx.schoolId!=null?String(old[idx.schoolId]||''):'';
    if(!(rowSid?rowSid===String(s.schoolId):personnelNormalizeSchoolNameV1_(old[idx['اسم المدرسة']])===personnelNormalizeSchoolNameV1_(schoolName))){errs.push('صف لا يخص مدرستك: '+u.row);return;}
    var p=u.payload||{},f={};h.forEach(function(k,i){f[k]=old[i];});Object.keys(p).forEach(function(k){if(allowed.indexOf(k)>=0)f[k]=p[k];});
    var label=(f['المرحلة']||'')+' / '+(f['الصف/المستوى']||'');
    try{v74ValidateStudentStats_(f);}catch(e){errs.push(label+': '+e.message);return;}
    plans.push({row:r,old:old,p:p,f:f});
  });
  if(errs.length)throw new Error('لم يُحفظ شيء — راجع:\n'+errs.slice(0,15).join('\n'));
  return v35Lock_(function(){
    var n=0;
    plans.forEach(function(pl){
      var changes=schoolV33Write_(sh,pl.row,h,pl.p,['schoolId','بيانات الصفوف JSON'],allowed);
      if(changes.length&&idx['بيانات الصفوف JSON']!=null)v50A_(sh.getRange(pl.row,idx['بيانات الصفوف JSON']+1).setValue(v36StudentJson_(pl.f)));
      if(changes.length){schoolV31Log_(s,'تعديل البيان العام لشؤون الطلاب','ROW_'+pl.row,changes);n++;}
    });
    v50Invalidate_('13_شؤون_الطلاب');
    return{success:true,message:'تم حفظ '+n+' صف من الإحصائية العامة.',count:n};
  });
}
