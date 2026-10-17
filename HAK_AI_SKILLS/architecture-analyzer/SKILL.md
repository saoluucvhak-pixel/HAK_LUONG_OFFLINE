---
name: hak-architecture-analyzer
description: Map dependencies and change impact in HAK repositories with the inherited Architecture Analyzer before structural changes.
---

# HAK Architecture Analyzer

Read `HAK_CODE_QUALITY_TEST/docs/ARCHITECTURE_ANALYZER.md`. Use `python HAK_CODE_QUALITY_TEST/architecture_analyzer.py --root <source-dir> --changed <relative-file> --out <work-dir>/hak-architecture-results.json`; repeat `--changed` for each relevant file.

Report module count, resolved dependency graph, cycles and impacted modules with the exact source commit. Validate material edges against code before proposing a refactor. The analyzer does not resolve dynamic imports, Apps Script global calls, TypeScript aliases, or renderer globals loaded through HTML. For Electron, supplement its graph with the order in `index.html` and the `main.js` → `preload.js` → renderer IPC boundary. Never interpret an empty cycle list as proof of architectural safety.

Deliver observed dependencies, unresolved mechanisms and a bounded change plan. Keep payroll algorithms, permission checks and persistence outside a layout refactor. Use source references; do not upload business records to build a diagram.
