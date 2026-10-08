/** V2.9 — حماية نداءات لوحة الإدارة
 *
 * سبب الملف:
 * التطبيق منشور بوصول ANYONE_ANONYMOUS، وكانت دوال لوحة الإدارة
 * (getAdminDashboardV26_ / listBasicWorkersV25_ / getBasicWorkerFullV25_ ...)
 * قابلة للاستدعاء مباشرة عبر google.script.run من أي زائر بدون تسجيل دخول،
 * أي أن بيانات 3734 عاملًا كانت مكشوفة فعليًا.
 * هذه الطبقة تفرض وجود جلسة إدارة صالحة قبل تنفيذ أي استعلام.
 */

function requireAdminSessionV29_(token){
  var s = getSchoolSessionV271(token);
  if (!s || s.role !== 'admin') throw new Error('جلسة الإدارة غير صالحة أو منتهية. سجّل الدخول من جديد.');
  return s;
}


function adminDashboardV29(token){ requireAdminSessionV29_(token); return getAdminDashboardV26_(); }
function adminSchoolsWithCountsV29(token){ requireAdminSessionV29_(token); return getSchoolsWithCountsV25_(); }
function adminBasicWorkersV29(token, q, schoolId){ requireAdminSessionV29_(token); return listBasicWorkersV25_(q, schoolId); }
function adminWorkerCardV29(token, employeeId){ requireAdminSessionV29_(token); return getBasicWorkerFullV25_(employeeId); }
function adminSchoolBundleV29(token, schoolId){ requireAdminSessionV29_(token); return getAdminSchoolBundleV26_(schoolId); }

function adminSyncSchoolOfficialsV34(token){requireAdminSessionV29_(token);return syncSchoolOfficialsV34_();}
