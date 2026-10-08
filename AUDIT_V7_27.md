# Audit V7.27

1. Added only new feature file 69_V89_AdminMoveControl.gs; core 00–21 unchanged.
2. Admin decision path is separate from school decision path and does not depend on CENSUS_DONE.
3. Admin approval validates the source relation is still active and target has no active relation.
4. Full secondment closes source relation and creates target relation as منتدب إلينا كلي.
5. Partial secondment validates days/periods and applies request values; zero periods remain allowed by the existing partial rules.
6. Transfer closes source, creates أصلـي at target, and updates originalSchoolId.
7. Admin rejection changes only request decision fields; historical census is untouched.
8. Census issue detection recognizes matching open movement requests and labels them as waiting for the original school's decision, not as a conflict.
9. Admin census UI exposes direct approve/execute or reject actions for such open movement requests.
10. All 56 GS files pass Node syntax check; HTML script block passes Node syntax check; no unsafe <? remains after scriptlet stripping.
11. Core numbered files 00–21 are byte-identical to V7.26.
12. ZIP integrity verified after packaging.

Live Google Sheets execution still requires deployment/live verification.
