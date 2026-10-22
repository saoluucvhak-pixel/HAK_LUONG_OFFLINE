# V10.4 alpha.29 — HAK_OCR_ENGINE integration

Source repository: `saoluucvhak-pixel/HAK_OCR_ENGINE`, branch `feature/attendance-validation-v1`.
Payroll integration branch: `feature/luong-v104-shared-ocr`. Neither main branch is changed.

The common repository originally contained an archive, not a usable root package. The archive's JavaScript OCR files were compared with the payroll app: the existing implementations are identical. Recopying them would not improve recognition. This integration adds a genuinely shared, dependency-free attendance-validation module to the common repository, pins it by commit and normalized SHA256 in `LuongHAK_Offline/shared-ocr.lock.json`, and checks exact upstream parity in CI.

## What changes

- Calendar month validation, duplicate/fractional/out-of-range day columns, and values outside the identified day grid are checked before preparing an attendance import. Suspect layouts cannot be learned or imported until corrected.
- Both copies of a duplicated employee/type row are held for review. Unknown employee codes, ambiguous numeric text and negative values are not silently imported.
- A blank remains blank; explicit zero remains zero. The validator never fills a missing value or changes a recognized value to make totals match.
- Total discrepancies and unusual daily work values require a separate human confirmation before opening the existing import preview. Repository permissions, closed-period validation and final import confirmation remain in place.
- UI validation uses the same shared module as the import gate. OCR learning remains based on corrected/reviewed cells, not on automatically accepted payroll results.
- Windows CI runs the four existing per-cell synthetic OCR accuracy cases and uploads their machine-readable report, in addition to full Electron and payroll tests.

## What this does not establish

This is an OCR validation and integration upgrade. It does not add handwriting model weights or claim increased real-document recognition accuracy. Python advanced engines in the common source require separately prepared local runtimes/models; they are not silently bundled into the Electron installer. Real photographs, handwriting, skew/shadows and large scanned documents still require separate private acceptance tests.

No real documents, employee data, backups or trained private samples are committed. No payroll formula, engine, persistence bridge or write policy is changed. A narrowly scoped CI exception permits only `core/ocr-learning/rules.js` within the previously protected core tree; the shared-source checksum and parity check cover that exception.
