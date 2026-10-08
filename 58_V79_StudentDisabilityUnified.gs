/** V7.9 — توحيد إحصائية الطلاب والدمج داخل 13_شؤون_الطلاب.
 * ملخص الدمج لا يعتمد على ورقة 14_ملخص_الدمج ولا على سجلات أسماء الطلاب.
 * ملخص الدمج يُحفظ داخل «بيانات الصفوف JSON» في نفس سجل الصف في 13_شؤون_الطلاب.
 * ورقة 14_إعاقة_الطلاب تبقى لسجلات أسماء الطلاب التفصيلية فقط، وتُستخدم لاحقًا للتحقق من ألا يتجاوز عدد الأسماء إجمالي الدمج المسجل في شؤون الطلاب.
 * مع مزامنة أعمدة الإعاقة الموجودة أصلًا في 13_شؤون_الطلاب.
 */
var V79_DIS_TYPES=['حركية','بصرية','سمعية','ذهنية','توحد','أخرى'];
function v79DisNumSafe_(v){try{return v79DisNum_(v);}catch(e){return 0;}}   // V7.35: القراءة لا تتوقف بسبب خلية تالفة (الحفظ ما زال يتحقق بـ v79DisNum_)
function v79DisNum_(v){var s=String(v==null?'':v).trim();if(s==='')return 0;if(!/^\d+$/.test(s))throw new Error('قيم الدمج يجب أن تكون أعدادًا صحيحة غير سالبة.');return Number(s);}
function v79DisParse_(raw){
  var o={};try{o=raw?JSON.parse(String(raw))||{}:{};}catch(e){o={};}
  var d=o.disabilitySummary||{};
  d.types=d.types||{};V79_DIS_TYPES.forEach(function(t){d.types[t]=v79DisNumSafe_(d.types[t]);});
  d.total=V79_DIS_TYPES.reduce(function(a,t){return a+d.types[t];},0);
  d.muslim=v79DisNumSafe_(d.muslim);d.christian=v79DisNumSafe_(d.christian);d.notes=String(d.notes||'');
  return {json:o,summary:d};
}
function v79DisSetJson_(raw,summary){
  var p=v79DisParse_(raw),d=p.json;
  d.disabilitySummary={total:summary.total,types:summary.types,muslim:summary.muslim,christian:summary.christian,notes:summary.notes||'',updatedAt:new Date().toISOString()};
  return JSON.stringify(d);
}
function v79FindStudentRows_(s){
  var d=v24Data_('13_شؤون_الطلاب'),ix=schoolV31Idx_(d.headers),name='';
  try{var sc=schoolV33FindSchoolRow_(s.schoolId);name=sc.vals[sc.h.indexOf('اسم_المدرسة')]||'';}catch(e){name=s.school||'';}
  var sid=String(s.schoolId||'').trim(),nn=personnelNormalizeSchoolNameV1_(name||s.school||'');
  return {d:d,ix:ix,name:name,rows:d.rows.map(function(r,n){
    var rsid=String(schoolV31Val_(r,ix,'schoolId')||'').trim(),rn=personnelNormalizeSchoolNameV1_(schoolV31Val_(r,ix,'اسم المدرسة')||'');
    var same=(rsid&&rsid===sid)||rn===nn;
    if(!same)return null;
    return {r:r,row:n+2,stage:String(schoolV31Val_(r,ix,'المرحلة')||'').trim(),grade:String(schoolV31Val_(r,ix,'الصف/المستوى')||'').trim()};
  }).filter(Boolean)};
}
function v79LegacyDisabilityTotal_(row,ix){
  var jsonIx=ix['بيانات الصفوف JSON'];
  if(jsonIx!=null){
    try{
      var o=JSON.parse(String(row[jsonIx]||''));
      if(o&&o.disabilitySummary&&o.disabilitySummary.updatedAt!=null){
        var t=Number(o.disabilitySummary.total||0);
        return isFinite(t)&&t>=0?t:0;
      }
    }catch(e){}
  }
  var n=Number(schoolV31Val_(row,ix,'عدد_ذوي_الإعاقة')||0);
  return isFinite(n)&&n>=0?n:0;
}

function v79DisSummaryFromRow_(row,ix){
  var raw=ix['بيانات الصفوف JSON']!=null?row[ix['بيانات الصفوف JSON']]:'';
  var parsed=v79DisParse_(raw),d=parsed.summary,hasNew=false;
  try{var o=raw?JSON.parse(String(raw))||{}:{};hasNew=!!(o.disabilitySummary&&o.disabilitySummary.updatedAt!=null);}catch(e){}
  if(hasNew)return {summary:d,source:'student-json'};
  var map={'حركية':'إعاقة_حركية','بصرية':'إعاقة_بصرية','سمعية':'إعاقة_سمعية','ذهنية':'إعاقة_ذهنية','توحد':'توحد','أخرى':'إعاقات_أخرى'};
  var types={};V79_DIS_TYPES.forEach(function(t){types[t]=v79DisNumSafe_(schoolV31Val_(row,ix,map[t])||0);});
  var total=v79LegacyDisabilityTotal_(row,ix);
  // البيانات القديمة في 13 لا تحتوي فصلًا مستقلاً لديانة طلاب الدمج، لذلك لا نخترع مسلم/مسيحي.
  return {summary:{total:total,types:types,muslim:0,christian:0,notes:String(schoolV31Val_(row,ix,'ملاحظات_الإعاقة')||'')},source:'legacy-student-row'};
}
function schoolGetStudentDisabilitySummaryV75(token){
  var s=schoolV33Session_(token);schoolV31Allowed_('SCHOOL_STUDENTS_EDIT');
  var q=v79FindStudentRows_(s);
  return {success:true,rows:q.rows.map(function(x){
    var z=v79DisSummaryFromRow_(x.r,q.ix),d=z.summary;
    return {key:String(s.schoolId)+'|'+x.stage+'|'+x.grade,row:x.row,stage:x.stage,grade:x.grade,total:d.total,types:d.types,muslim:d.muslim,christian:d.christian,notes:d.notes,source:z.source};
  })};
}
function schoolSaveStudentDisabilitySummaryV75(token,updates){
  var s=schoolV33Session_(token);schoolV31Allowed_('SCHOOL_STUDENTS_EDIT');updates=updates||[];
  if(!updates.length)throw new Error('لا توجد تعديلات للحفظ.');
  var q=v79FindStudentRows_(s),sh=personnelSS_().getSheetByName('13_شؤون_الطلاب'),h=v36Headers_(sh),ix=schoolV31Idx_(h),by={};
  q.rows.forEach(function(x){by[x.stage+'|'+x.grade]=x;});
  var errors=[],plans=[];
  updates.forEach(function(u){
    var stage=String(u.stage||'').trim(),grade=String(u.grade||'').trim(),x=by[stage+'|'+grade];
    if(!x){errors.push(stage+' / '+grade+': الصف غير موجود في شؤون الطلاب.');return;}
    var p=u.payload||{},types={};V79_DIS_TYPES.forEach(function(t){types[t]=v79DisNum_(p[t]);});
    var total=V79_DIS_TYPES.reduce(function(a,t){return a+types[t];},0),mus=v79DisNum_(p['دمج مسلم']),chr=v79DisNum_(p['دمج مسيحي']);
    var enrolled=v36Int_(schoolV31Val_(x.r,q.ix,'إجمالي الطلاب'));
    if(total>enrolled){errors.push(stage+' / '+grade+': إجمالي الدمج '+total+' أكبر من إجمالي الطلاب '+enrolled+'.');return;}
    if(mus+chr!==total){errors.push(stage+' / '+grade+': دمج مسلم + دمج مسيحي = '+(mus+chr)+' بينما إجمالي الدمج = '+total+'.');return;}
    plans.push({x:x,stage:stage,grade:grade,total:total,types:types,muslim:mus,christian:chr,notes:String(p['ملاحظات']||'').trim()});
  });
  if(errors.length)throw new Error('لم يُحفظ شيء — راجع:\n'+errors.slice(0,20).join('\n'));
  return v35Lock_(function(){
    var saved=[];
    plans.forEach(function(p){
      var r=p.x.r,row=p.x.row,oldJson=ix['بيانات الصفوف JSON']!=null?r[ix['بيانات الصفوف JSON']]:'';
      var json=v79DisSetJson_(oldJson,{total:p.total,types:p.types,muslim:p.muslim,christian:p.christian,notes:p.notes});
      var vals={};
      if(ix['بيانات الصفوف JSON']!=null)vals[ix['بيانات الصفوف JSON']+1]=json;
      if(ix['عدد_ذوي_الإعاقة']!=null)vals[ix['عدد_ذوي_الإعاقة']+1]=p.total;
      var map={'حركية':'إعاقة_حركية','بصرية':'إعاقة_بصرية','سمعية':'إعاقة_سمعية','ذهنية':'إعاقة_ذهنية','توحد':'توحد','أخرى':'إعاقات_أخرى'};
      V79_DIS_TYPES.forEach(function(t){if(ix[map[t]]!=null)vals[ix[map[t]]+1]=p.types[t];});
      if(ix['حالة_الدمج']!=null)vals[ix['حالة_الدمج']+1]=(p.total?'مدمج':'غير مدمج');
      if(ix['ملاحظات_الإعاقة']!=null)vals[ix['ملاحظات_الإعاقة']+1]=p.notes;
      v50WriteRow_(sh,row,vals);schoolV31Log_(s,'تعديل ملخص دمج الطلاب','ROW_'+row,[['إجمالي_الدمج','',p.total],['دمج مسلم','',p.muslim],['دمج مسيحي','',p.christian]]);
      saved.push({stage:p.stage,grade:p.grade,total:p.total,types:p.types,muslim:p.muslim,christian:p.christian,notes:p.notes});
    });
    SpreadsheetApp.flush();v50Invalidate_('13_شؤون_الطلاب');v50Fresh_();
    return {success:true,message:'تم حفظ بيانات الدمج داخل شؤون الطلاب.',count:saved.length,rows:saved};
  });
}
