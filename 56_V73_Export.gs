/**
 * V7.3 — التصدير إلى Excel (بالأسماء لا بالأكواد) + تقرير موقف العاملين.
 * الخادم يرجع {sheets:[{name, rows:[[...]]}]} والواجهة تبني ملف xlsx حقيقيًا (متعدد الأوراق، من اليمين لليسار).
 * kind: basic | hrp | ended | status | schools
 */
function v73Names_(){ var n = v42SchoolNames_(); return function(id){ return id ? (n[id] || ('(مدرسة غير مسجلة) ' + id)) : ''; }; }
function v73Quals_(){ var q = {}; try { var d = v24Data_('05_المؤهلات'), i = schoolV31Idx_(d.headers); d.rows.forEach(function(r){ var e = schoolV31Val_(r, i, 'employeeId'); if (!e) return; (q[e] = q[e] || []).push([schoolV31Val_(r, i, 'المؤهل'), schoolV31Val_(r, i, 'التخصص'), schoolV31Val_(r, i, 'السنة')].filter(Boolean).join(' — ')); }); } catch (e) {} return q; }
function v73Rels_(){
  var r = v24Data_('04_علاقات_المدارس'), i = schoolV31Idx_(r.headers), by = {};
  r.rows.forEach(function(x){ var e = schoolV31Val_(x, i, 'employeeId'); if (!e) return; (by[e] = by[e] || []).push({sid: schoolV31Val_(x, i, 'schoolId'), type: schoolV31Val_(x, i, 'نوع_العلاقة'), st: schoolV31Val_(x, i, 'الحالة'), start: schoolV31Val_(x, i, 'تاريخ_البداية'), end: schoolV31Val_(x, i, 'تاريخ_النهاية'), note: schoolV31Val_(x, i, 'ملاحظات'), why: i['سبب_الإنهاء'] != null ? schoolV31Val_(x, i, 'سبب_الإنهاء') : '', per: i[V68_PER] != null ? schoolV31Val_(x, i, V68_PER) : '', days: i[V68_DAYS] != null ? schoolV31Val_(x, i, V68_DAYS) : ''}); });
  return by;
}
/** تصنيف موقف الموظف (نفس منطق الحصر). */
function v73Status_(e, rels, nm){   // V7.58: المسميات الموحدة فقط (v81RelationDefinitions_)
  var rec = schoolV31Val_(e.row, e.ix, 'حالة_السجل'), why = schoolV31Val_(e.row, e.ix, 'سبب_إنهاء_الخدمة'), ws = schoolV31Val_(e.row, e.ix, 'الحالة_الوظيفية');
  if (rec === 'غير قائم' || /^(متوفى|منتهى الخدمة|مستقيل|معاش|نقل خارج الإدارة)/.test(String(ws || ''))) { var w = String(why || '') + ' ' + String(ws || ''); if (/وفا|متوفى/.test(w)) return 'وفاة'; if (/معاش/.test(w)) return 'معاش'; if (/نقل/.test(w)) return 'نقل خارج الإدارة'; return 'إنهاء خدمة'; }
  var act = (rels || []).filter(function(r){ return v36ActiveRel_(r.st); });
  var has = function(re){ return (rels || []).filter(function(r){ return re.test(String(r.st || '')); })[0]; };
  if (!act.length) { if (has(/^إجازة/)) return 'إجازة'; if (has(/^معار/)) return 'إعارة'; if (has(/^منتدب كليًا لجهة أخرى/)) return 'أصلي ومنتدب من عندنا كليًا خارج الإدارة'; if (has(/^منتدب جزئيًا لجهة أخرى/)) return 'أصلي ومنتدب جزئيًا خارج الإدارة'; return 'غير معروف للمدرسة'; }
  var pres = schoolV31Val_(e.row, e.ix, 'قائم_بالعمل'), rs = String(schoolV31Val_(e.row, e.ix, 'سبب_عدم_القيام') || '');
  if (pres === 'لا' && /^منقطع عن العمل/.test(rs)) return 'منقطع عن العمل';
  if (pres === 'لا' && /^موقوف عن العمل/.test(rs)) return 'موقوف عن العمل';
  var o = schoolV31Val_(e.row, e.ix, 'originalSchoolId'), orig = act.filter(function(r){ return r.type === 'أصلي'; })[0], full = act.filter(function(r){ return r.type === 'منتدب إلينا كلي'; })[0], part = act.filter(function(r){ return r.type === 'منتدب إلينا جزئي'; })[0];
  if (full && !orig) return (/خارج/.test(full.note) || !o) ? 'منتدب إلينا كليًا من خارج الإدارة' : 'منتدب إلينا كليًا من داخل الإدارة';
  if (full && orig) return 'أصلي ومنتدب من عندنا كليًا داخل الإدارة';
  if (part && !orig) return 'منتدب إلينا جزئيًا';
  if (part) return 'أصلي ومنتدب من عندنا جزئيًا داخل الإدارة';
  if (orig && /منتدب جزئيًا خارج الإدارة/.test(String(orig.note || ''))) return 'أصلي ومنتدب جزئيًا خارج الإدارة';
  return 'أصلي';
}
function adminExportV73(token, kind, from, to){
  v35Admin_(token); var N = v73Names_(), out = {success: true, kind: kind, sheets: []};
  from = v35Date_(from) || ''; to = v35Date_(to) || '';
  if (kind === 'basic' || kind === 'status' || kind === 'ended') {
    var emp = v24Data_('01_الأساسي'), ei = schoolV31Idx_(emp.headers), R = v73Rels_(), Q = kind === 'basic' ? v73Quals_() : {};
    var g = function(r, k){ return schoolV31Val_(r, ei, k); };
    var list = emp.rows.map(function(r){ var e = {row: r, ix: ei, eid: g(r, 'employeeId')}; e.rels = R[e.eid] || []; e.status = v73Status_(e, e.rels, N); return e; }).filter(function(e){ return e.eid && g(e.row, 'الاسم'); });
    var curSchools = function(e){ return e.rels.filter(function(x){ return v36ActiveRel_(x.st); }).map(function(x){ return N(x.sid) + ' (' + v102RelLabel_(x.type || 'أصلي', x.st, x.note) + (x.per ? ' — ' + x.per + ' حصة' : '') + ')'; }).join(' | '); };
    if (kind === 'basic') {
      var H = ['م', 'الاسم', 'الرقم القومي', 'كود الموظف', 'النوع', 'تاريخ الميلاد', 'الهاتف', 'العنوان', 'الصفة', 'المسمى الوظيفي', 'الوظيفة الإشرافية', 'المادة', 'المرحلة', 'الدرجة المالية', 'تاريخ التعيين', 'نظام العمل', 'المدرسة الأصلية', 'المدارس الحالية (العلاقة)', 'الموقف', 'حالة السجل', 'قائم بالعمل', 'سبب عدم القيام', 'المؤهلات', 'تاريخ إنهاء الخدمة', 'سبب إنهاء الخدمة'];
      var rows = list.sort(function(a, b){ return v72Cmp_({job: g(a.row, 'المسمى_الوظيفي'), subject: g(a.row, 'مادة_التدريس'), sup: g(a.row, 'الوظيفة_الإشرافية'), name: N(g(a.row, 'originalSchoolId')) + g(a.row, 'الاسم')}, {job: g(b.row, 'المسمى_الوظيفي'), subject: g(b.row, 'مادة_التدريس'), sup: g(b.row, 'الوظيفة_الإشرافية'), name: N(g(b.row, 'originalSchoolId')) + g(b.row, 'الاسم')}); })
        .map(function(e, i){ var r = e.row; return [i + 1, g(r, 'الاسم'), g(r, 'الرقم_القومي'), g(r, 'كود_الموظف'), g(r, 'النوع'), g(r, 'تاريخ_الميلاد'), g(r, 'الهاتف'), g(r, 'العنوان'), g(r, 'الصفة'), g(r, 'المسمى_الوظيفي'), g(r, 'الوظيفة_الإشرافية'), g(r, 'مادة_التدريس'), g(r, 'المرحلة_التعليمية_الأصلية'), g(r, 'الدرجة_المالية'), g(r, 'تاريخ_التعيين'), g(r, 'نظام_العمل'), N(g(r, 'originalSchoolId')), curSchools(e), e.status, g(r, 'حالة_السجل'), g(r, 'قائم_بالعمل'), g(r, 'سبب_عدم_القيام'), (Q[e.eid] || []).join(' | '), g(r, 'تاريخ_إنهاء_الخدمة'), g(r, 'سبب_إنهاء_الخدمة')]; });
      out.sheets.push({name: 'الأساسي', rows: [H].concat(rows)});
      // ورقة لكل مدرسة مختصرة
      var bySch = {}; list.forEach(function(e){ e.rels.filter(function(x){ return v36ActiveRel_(x.st); }).forEach(function(x){ (bySch[x.sid] = bySch[x.sid] || []).push([g(e.row, 'الاسم'), g(e.row, 'الرقم_القومي'), g(e.row, 'المسمى_الوظيفي'), g(e.row, 'الوظيفة_الإشرافية'), g(e.row, 'مادة_التدريس'), v102RelLabel_(x.type || 'أصلي', x.st, x.note), g(e.row, 'الهاتف')]); }); });
      var srows = [['المدرسة', 'الاسم', 'الرقم القومي', 'المسمى', 'الإشرافية', 'المادة', 'العلاقة', 'الهاتف']];
      Object.keys(bySch).sort(function(a, b){ return N(a).localeCompare(N(b), 'ar'); }).forEach(function(sid){ bySch[sid].forEach(function(x){ srows.push([N(sid)].concat(x)); }); });
      out.sheets.push({name: 'حسب المدرسة', rows: srows});
    }
    if (kind === 'ended') {
      var H2 = ['م', 'الاسم', 'الرقم القومي', 'المسمى', 'المادة', 'آخر مدرسة', 'تاريخ إنهاء الخدمة', 'السبب', 'رقم القرار', 'تاريخ القرار'];
      var ended = list.filter(function(e){ var d = v35Date_(g(e.row, 'تاريخ_إنهاء_الخدمة')); if (g(e.row, 'حالة_السجل') !== 'غير قائم') return false; if (!from && !to) return true; return d && (!from || d >= from) && (!to || d <= to); });
      var last = function(e){ var r = e.rels.slice().sort(function(a, b){ return String(b.end || '').localeCompare(String(a.end || '')); })[0]; return r ? N(r.sid) : N(g(e.row, 'originalSchoolId')); };
      var rows2 = ended.sort(function(a, b){ return String(v35Date_(g(a.row, 'تاريخ_إنهاء_الخدمة'))).localeCompare(String(v35Date_(g(b.row, 'تاريخ_إنهاء_الخدمة')))); }).map(function(e, i){ var r = e.row; return [i + 1, g(r, 'الاسم'), g(r, 'الرقم_القومي'), g(r, 'المسمى_الوظيفي'), g(r, 'مادة_التدريس'), last(e), v35Date_(g(r, 'تاريخ_إنهاء_الخدمة')) || '', g(r, 'سبب_إنهاء_الخدمة'), g(r, 'رقم_قرار_إنهاء_الخدمة'), g(r, 'تاريخ_قرار_إنهاء_الخدمة')]; });
      var byWhy = {}; ended.forEach(function(e){ var w = g(e.row, 'سبب_إنهاء_الخدمة') || '(بدون سبب)'; byWhy[w] = (byWhy[w] || 0) + 1; });
      out.sheets.push({name: 'ملخص', rows: [['الفترة', (from || 'البداية') + ' → ' + (to || 'الآن')], ['الإجمالي', ended.length], [], ['السبب', 'العدد']].concat(Object.keys(byWhy).sort(function(a, b){ return byWhy[b] - byWhy[a]; }).map(function(k){ return [k, byWhy[k]]; }))});
      out.sheets.push({name: 'من انتهت خدمتهم', rows: [H2].concat(rows2)});
      out.count = ended.length;
    }
    if (kind === 'status') {
      var groups = {}, order = v81RelationLabels_();   // V7.58
      list.forEach(function(e){ var k = e.status; (groups[k] = groups[k] || []).push(e); });
      Object.keys(groups).forEach(function(k){ if (order.indexOf(k) < 0) order.push(k); });
      var sum = [['الموقف', 'العدد']]; order.forEach(function(k){ if (groups[k]) sum.push([k, groups[k].length]); }); sum.push(['الإجمالي', list.length]);
      var inService = list.filter(function(e){ return g(e.row, 'حالة_السجل') !== 'غير قائم'; }).length;
      sum.push([]); sum.push(['القائمون (حالة السجل قائم)', inService]); sum.push(['منهم يعملون فعلًا بمدارس الإدارة', list.filter(function(e){ var d = v81RelationMeta_(e.status); return d && (d.group === 'work' || d.code === 'OUT_FULL_IN'); }).length]);
      out.sheets.push({name: 'ملخص الموقف', rows: sum});
      order.forEach(function(k){ if (!groups[k]) return; out.sheets.push({name: k.slice(0, 28), rows: [['م', 'الاسم', 'الرقم القومي', 'المسمى', 'المادة', 'المدرسة الأصلية', 'المدارس الحالية', 'التفاصيل']].concat(groups[k].map(function(e, i){ var r = e.row, det = e.rels.filter(function(x){ return !v36ActiveRel_(x.st); }).slice(-1)[0]; return [i + 1, g(r, 'الاسم'), g(r, 'الرقم_القومي'), g(r, 'المسمى_الوظيفي'), g(r, 'مادة_التدريس'), N(g(r, 'originalSchoolId')), curSchools(e), (g(r, 'سبب_إنهاء_الخدمة') || g(r, 'سبب_عدم_القيام') || (det ? (det.st + (det.note ? ' — ' + det.note : '')) : '')) + (v35Date_(g(r, 'تاريخ_إنهاء_الخدمة')) ? ' (' + v35Date_(g(r, 'تاريخ_إنهاء_الخدمة')) + ')' : '')]; }))}); });
      out.summary = sum.slice(1).filter(function(x){ return x.length; });
    }
  }
  if (kind === 'hrp') {
    var hp = v24Data_('05_معلمو_الحصة_والمعاش'), hi = schoolV31Idx_(hp.headers), hr = v24Data_('06_علاقات_معلمي_الحصة'), ri = schoolV31Idx_(hr.headers), rel = {};
    hr.rows.forEach(function(x){ var id = schoolV31Val_(x, ri, 'hrpId'); if (!id) return; (rel[id] = rel[id] || []).push({sid: schoolV31Val_(x, ri, 'schoolId'), type: schoolV31Val_(x, ri, 'نوع_العلاقة'), n: schoolV31Val_(x, ri, 'عدد_الحصص_المطلوب'), st: schoolV31Val_(x, ri, 'الحالة'), split: ri[V69_COL] != null ? schoolV31Val_(x, ri, V69_COL) : ''}); });
    var H3 = ['م', 'الاسم', 'الرقم القومي', 'الفئة', 'المادة', 'الهاتف', 'المدرسة الأصلية', 'المدرسة 1', 'حصص 1', 'المدرسة 2', 'حصص 2', 'إجمالي الحصص', 'توزيع المواد', 'حالة السجل', 'مدارس سابقة'];
    var rows3 = hp.rows.filter(function(r){ return schoolV31Val_(r, hi, 'hrpId'); }).map(function(r){
      var id = schoolV31Val_(r, hi, 'hrpId'), rs = rel[id] || [], act = rs.filter(function(x){ return v36ActiveRel_(x.st); }).sort(function(a, b){ return (a.type === 'أصلي' ? 0 : 1) - (b.type === 'أصلي' ? 0 : 1); }), old = rs.filter(function(x){ return !v36ActiveRel_(x.st); });
      var tot = act.reduce(function(a, x){ return a + (Number(x.n) || 0); }, 0), sp = act.filter(function(x){ return x.split; }).map(function(x){ return N(x.sid) + ': ' + v69Text_(v69Parse_(x.split), schoolV31Val_(r, hi, 'مادة_التدريس'), Number(x.n) || 0); }).join(' | ');
      return {subj: schoolV31Val_(r, hi, 'مادة_التدريس'), name: schoolV31Val_(r, hi, 'الاسم'), row: [schoolV31Val_(r, hi, 'الاسم'), schoolV31Val_(r, hi, 'الرقم_القومي'), schoolV31Val_(r, hi, 'نوع_الفئة'), schoolV31Val_(r, hi, 'مادة_التدريس'), schoolV31Val_(r, hi, 'الهاتف'), N(schoolV31Val_(r, hi, 'originalSchoolId')), act[0] ? N(act[0].sid) : '', act[0] ? act[0].n : '', act[1] ? N(act[1].sid) : '', act[1] ? act[1].n : '', tot, sp, schoolV31Val_(r, hi, 'حالة_السجل'), old.map(function(x){ return N(x.sid); }).join(' | ')]};
    }).sort(function(a, b){ return v72Cmp_({job: 'معلم', subject: a.subj, name: a.name}, {job: 'معلم', subject: b.subj, name: b.name}); }).map(function(x, i){ return [i + 1].concat(x.row); });
    out.sheets.push({name: 'معلمو الحصة والمعاش', rows: [H3].concat(rows3)});
  }
  if (kind === 'schools') {
    var sd = v24Data_('18_بيانات_المدارس'), si = schoolV31Idx_(sd.headers), keep = sd.headers.filter(function(k){ return k && !/^رابط_صورة|^schoolId$|^آخر_|المعياري|الأصلي$/.test(k); });
    out.sheets.push({name: 'المدارس', rows: [keep.map(function(k){ return k.replace(/_/g, ' '); })].concat(sd.rows.filter(function(r){ return schoolV31Val_(r, si, 'اسم_المدرسة'); }).map(function(r){ return keep.map(function(k){ return schoolV31Val_(r, si, k); }); }))});
  }
  if (!out.sheets.length) throw new Error('نوع تصدير غير معروف.');
  return out;
}
