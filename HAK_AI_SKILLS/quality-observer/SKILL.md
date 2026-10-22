---
name: hak-quality-observer
description: Compare commit-scoped HAK quality results and maintain sanitized history with the inherited Quality Observer and dashboard.
---

# HAK Quality Observer

Use `HAK_CODE_QUALITY_TEST/ci_observer.py`, `project_memory.py` and the dashboard already in this repository. Read `HAK_CODE_QUALITY_TEST/docs/CI_OBSERVER_V2.md` and `HAK_CODE_QUALITY_TEST/dashboard/AUTO_V3_2.md` for their limitations.

Consume the executed quality, security and architecture JSON reports. Run `ci_observer.py --quality <quality-json> --security <security-json> --architecture <architecture-json> --project LUONG_HAK --branch <branch> --commit <sha> --memory <work-dir>/hak-project-memory.jsonl --out <work-dir>/hak-skill-proposals.json`. Keep only the allowlisted metadata; no source snippets, credentials or payroll records belong in memory.

Across-run comparisons require an actual restored history file. The V10.4 workflow restores and saves sanitized history using a branch-specific Actions cache. If no previous cache is available, disclose that this run establishes a baseline. Cache eviction can remove history; artifacts remain the retained evidence. Count distinct commits, not repeated runs, when identifying recurring findings. Proposed skills are suggestions, never automatically executed changes.

Deliver current outcomes, newly observed or recurring findings, available historical commits and evidence links. The dashboard can load extracted artifact reports locally; it is not a live production monitor and must not be exposed publicly.
