/** V5.8 — توحيد مسميات القيادة المدرسية في كل أوراق الملف:
 *  «مدير مدرسة/المدرسة/مديرة…» ← «قيادة أولى»، «وكيل مدرسة/المدرسة/وكيلة…» ← «قيادة ثانية».
 *  يمر على كل الأوراق (عدا سجل الأحداث للحفاظ على التاريخ كما حدث)، ولا يلمس خلايا المعادلات.
 *  آمن للتكرار. apply=false معاينة فقط. */
var V58_SKIP_SHEETS = {'12_سجل_الأحداث': 1};
var V58_RX_FIRST = /(?:مدير|مديرة|مديره)\s*(?:ال)?مدرس[ةه]/g;
var V58_RX_SECOND = /(?:وكيل|وكيلة|وكيله)\s*(?:ال)?مدرس[ةه]/g;

function v58Lead_(s){
  var t = String(s == null ? '' : s);
  if (t.indexOf('مدرس') < 0) return t;
  return t.replace(V58_RX_FIRST, 'قيادة أولى').replace(V58_RX_SECOND, 'قيادة ثانية');
}

function v58RenameLeadership_(apply){
  var ss = personnelSS_(), out = {apply: !!apply, total: 0, sheets: []};
  ss.getSheets().forEach(function(sh){
    var name = sh.getName(); if (V58_SKIP_SHEETS[name]) return;
    var lr = sh.getLastRow(), lc = sh.getLastColumn(); if (lr < 1 || lc < 1) return;
    var rg = sh.getRange(1, 1, lr, lc), v = rg.getValues(), f = null, hits = [];
    for (var r = 0; r < lr; r++) for (var c = 0; c < lc; c++) {
      var x = v[r][c]; if (typeof x !== 'string' || x.indexOf('مدرس') < 0) continue;
      var nv = v58Lead_(x); if (nv !== x) hits.push([r, c, x, nv]);
    }
    if (!hits.length) return;
    f = rg.getFormulas();
    hits = hits.filter(function(h){ return !f[h[0]][h[1]]; });
    if (!hits.length) return;
    if (apply) {
      if (hits.length > 40) {
        var byCol = {};
        hits.forEach(function(h){ (byCol[h[1]] = byCol[h[1]] || []).push(h); });
        Object.keys(byCol).forEach(function(c){
          c = Number(c);
          var hasF = f.some(function(row){ return !!row[c]; });
          if (hasF) { byCol[c].forEach(function(h){ v50A_(sh.getRange(h[0] + 1, c + 1).setValue(h[3])); }); return; }
          var col = v.map(function(row){ return [row[c]]; });
          byCol[c].forEach(function(h){ col[h[0]][0] = h[3]; });
          v50A_(sh.getRange(1, c + 1, lr, 1).setValues(col));
        });
      } else {
        hits.forEach(function(h){ v50A_(sh.getRange(h[0] + 1, h[1] + 1).setValue(h[3])); });
      }
    }
    out.sheets.push({sheet: name, count: hits.length, samples: hits.slice(0, 4).map(function(h){ return 'صف ' + (h[0] + 1) + ': ' + h[2] + ' ← ' + h[3]; })});
    out.total += hits.length;
  });
  return out;
}

function adminRenameLeadershipV58(token, apply){
  var a = v35Admin_(token);
  if (!apply) return v58RenameLeadership_(false);
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    v50Fresh_(); var r = v58RenameLeadership_(true);
    try { V56_SET_MEMO_ = null; } catch (e) {}
    schoolV31Log_(v36Actor_(a), 'توحيد مسميات القيادة (أولى/ثانية)', 'كل الأوراق', [['عدد', '', String(r.total)]]);
    return r;
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
