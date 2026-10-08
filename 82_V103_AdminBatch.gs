/**
 * V7.62 — حركة العاملين: اعتماد المحدد دفعة واحدة (استدعاء واحد للخادم).
 * كل بند يُنفَّذ بنفس دالة الاعتماد الفردية القائمة (adminDecideMoveV89 / adminDecideHrpAddV92) دون أي تغيير في منطقها.
 */
function adminDecideMovesBatchV103(token, items, note){
  v35Admin_(token);
  var ok = 0, fail = [];
  (items || []).slice(0, 200).forEach(function(it){
    var id = String((it || {}).id || '').trim(); if (!id) return;
    try {
      var r = it.hrpAdd ? adminDecideHrpAddV92(token, id, 'موافقة', note || '') : adminDecideMoveV89(token, id, 'موافقة', note || '');
      if (r && r.success === false) fail.push({id: id, name: it.name || '', error: r.message || 'تعذر الاعتماد'}); else ok++;
    } catch (e) { fail.push({id: id, name: it.name || '', error: e.message}); }
  });
  return {success: true, ok: ok, failed: fail, message: 'تم اعتماد ' + ok + (fail.length ? ' — تعذر ' + fail.length : '') + '.'};
}
