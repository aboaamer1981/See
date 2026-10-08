# V7.39 — Performance / stability pass

- V57 Route Import now updates only rows whose supervisor+date are part of the import; unrelated route rows are not rewritten.
- Existing duplicate supervisor/date rows are removed in grouped ranges.
- New route days are appended in one batch.
- V57 school fuzzy matching keeps fast buckets but adds a first-character fallback for misspellings at the beginning of a school name.
- All `.gs` files were syntax-checked by converting them temporarily to `.js`; no syntax errors found.
- No Excel schema, business rules, permissions, or unrelated portal functions were changed.
