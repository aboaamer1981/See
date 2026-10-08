/** V7.2 — ترتيب موحّد للعاملين على الخادم (نفس ترتيب الواجهة staffCmp72_):
 *  قيادة أولى، قيادة ثانية، المعلمون حسب المادة (العربية، الإنجليزية، الدراسات، الرياضيات، العلوم، الكمبيوتر، الفنية، الرياضية، النشاط)،
 *  أخصائي اجتماعي، باقي الأخصائيين، أمين المكتبة، الإداريون — وداخل كل فئة من كبير إلى مساعد. */
var V72_ORDER = [[/عربي|الصفوف الاولي|دين|ديني/, 2], [/انجليز|فرنس|الماني|ايطالي|لغات|لغه اجنبيه/, 3], [/دراسات|تاريخ|جغرافيا|فلسف|علم النفس/, 4], [/رياضيات/, 5], [/علوم|كيمياء|فيزياء|احياء|جيولوج/, 6], [/حاسب|كمبيوتر|تكنولوجيا المعلومات/, 7], [/فني|رسم/, 8], [/رياضي|بدني/, 9], [/نشاط|مجال|زراع|صناع|منزل|موسيق|مكتب/, 10]];
function v72N_(s){ return String(s || '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه'); }
function v72Cat_(job, subject, role){
  var r = String(role || '').trim(); if (V61_LEAD[r] === 1) return 0; if (V61_LEAD[r] === 2) return 1;
  var j = v72N_(job), sb = v72N_(subject);
  if (/معلم/.test(j)) { for (var i = 0; i < V72_ORDER.length; i++) if (V72_ORDER[i][0].test(sb)) return V72_ORDER[i][1]; return 11; }
  if (/اخصائي اجتماعي|اخصائيين اجتماعيين|مشرف اجتماعي/.test(j)) return 12;
  if (/اخصائي|اخصائيي|اخصائيين/.test(j)) return 13;
  if (/امين مكتب|امناء مكتب/.test(j)) return 14;
  if (/اداري|كاتب|سكرتير|امين معمل|مشرف/.test(j)) return 15;
  return 16;
}
function v72Tier_(job){ var j = v72N_(job); if (/كبير/.test(j)) return 0; if (/خبير/.test(j)) return 1; if (/اول ?\(?ا\)?|اول ا/.test(j)) return 2; if (/اول/.test(j)) return 3; if (/مساعد/.test(j)) return 5; return 4; }
/** cmp للكائنات {job, subject, sup|role, name}. */
function v72Cmp_(a, b){
  var ra = v72Cat_(a.job, a.subject, a.sup || a.role) * 10 + v72Tier_(a.job), rb = v72Cat_(b.job, b.subject, b.sup || b.role) * 10 + v72Tier_(b.job);
  if (ra !== rb) return ra - rb;
  var sa = String(a.subject || ''), sb = String(b.subject || ''); if (sa !== sb) return sa.localeCompare(sb, 'ar');
  return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
}

/** V7.2: «التربية الدينية» ليست مادة أساسية لأي معلم — الدين الإسلامي يُسند للغة العربية، والمسيحي يُوزَّع على معلم مسيحي بمادته الأساسية («📚 توزيع المواد»). */
function v72IsReligion_(s){ return /^التربي[هة] الديني[هة]( الاسلامي[هة]| الإسلامي[هة])?$|^دين$|^الدين$/.test(String(s || '').trim()); }
function v72SubjectOptions_(list){ return (list || []).filter(function(x){ return !v72IsReligion_(x); }); }
function v72GuardSubject_(s){ if (s !== undefined && v72IsReligion_(s)) throw new Error('«التربية الدينية» ليست مادة أساسية — الدين الإسلامي يُسند لمعلم اللغة العربية، والدين المسيحي يُحدَّد من «📚 توزيع المواد» لمعلم مسيحي بمادته الأساسية.'); }
