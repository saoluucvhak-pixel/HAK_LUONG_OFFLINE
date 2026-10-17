---
name: hak-code-quality
description: Review HAK source changes with the inherited Code Quality scanner, executable quality gates and evidence-backed findings.
---

# HAK Code Quality

Use the existing implementation in `HAK_CODE_QUALITY_TEST/`; do not replace it with a new scanner.

Identify the repository, branch, base and target commit before reviewing a change. Read `HAK_CODE_QUALITY_TEST/skill/SKILL.md` and the project config. Run `python HAK_CODE_QUALITY_TEST/quality_gate.py --config HAK_CODE_QUALITY_TEST/config/luong-hak.json --root . --out <work-dir>/hak-quality-results.json`. Run `audit.py <source-dir>` and `security_audit.py --root <source-dir> --out <work-dir>/hak-security-results.json` when static review is requested.

The scanners are heuristics. Distinguish a suspected issue from a reproduced defect; a high-severity match is not automatically a confirmed vulnerability. Check test fixtures and vendor code before assigning product severity. Do not suppress a finding merely to obtain a green run.

Deliver the command, environment, commit, executed/passed/failed counts and unresolved checks. Findings need file, line, trigger, impact and validation. Payroll calculations and stored values must remain unchanged in a UI-only release; exercise existing regression suites. Keep reports, real data and credentials outside source commits.
