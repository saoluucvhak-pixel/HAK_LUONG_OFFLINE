# HAK Quality Audit — LUONG_HAK Offline V10.3

Target: `feature/luong-hak-v10-3-smart-filter-allowance-support`, Electron application under `LuongHAK_Offline/`.

## Confirmed code-level finding — P0

`main.js` registers `ipcMain.on("store-load", (e) => { e.returnValue = storage.load(); });` without checking authenticated session or read permissions. `preload.js` exposes this to renderer as `hakStore.load()`. A trusted renderer may therefore request full local payroll data without a role-specific read policy. The repository's `docs/V10_1_SECURITY_REVIEW.md` independently documents this read-access design gap.

Impact: payroll amounts, personal identifiers and bank information may be accessible to lower-privilege users with access to the app's local renderer or data file. The trusted IPC sender check does not replace per-user authorization.

Recommendation: enforce read permissions in main process; do not load full DB into renderer; use authenticated, table/row/field-filtered IPC responses and tests for anonymous and low-privilege roles. Treat backup, export and document-read IPC routes with the same least-privilege model. Migrate carefully: existing UI expects full-store responses.

## Other verified repository facts

- `package.json` provides `npm test` with Node unit, integration and regression suites.
- `package.json` builds Windows installer via Electron Builder.
- `docs/V10_3_PAYROLL_REGRESSION.json` records a claimed 17,480-cell comparison with zero differences. This is a committed report, **not independently reproduced evidence**.
- Existing documentation notes encryption-at-rest and read-isolation gaps.

## Audit status

This is an initial evidence-based static review, not a completed penetration test or payroll certification. No CI results have yet been confirmed. The workflow at `.github/workflows/luong-offline-quality-audit.yml` runs JavaScript syntax checks and the application's existing `npm test` suite on the audit branch. It does not currently install or invoke the separate HAK Code Quality Python scanner, because that scanner lives on another feature branch. The main branch is unchanged.

## Acceptance criteria before release

1. CI green on the audited commit, with retained logs.
2. Anonymous users cannot read payroll, personal identifiers, backup contents or reports.
3. Lower roles receive only permitted records and fields; direct IPC attempts are denied.
4. Payroll/tax/insurance reconciliation verified against controlled fixtures and independently reviewed.
5. Restore, backup, permissions, formula and report export regression tests pass.
6. Windows packaged EXE smoke test, offline mode and multi-user/multi-machine behavior tested.
