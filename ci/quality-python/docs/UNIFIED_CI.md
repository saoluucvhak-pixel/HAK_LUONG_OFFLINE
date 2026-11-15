# HAK Unified Quality CI

This workflow runs at repository root: `.github/workflows/hak-unified-quality.yml`.

Three stages:
1. Existing quality gate (Node and Python unit tests)
2. Offline security scanner (nonzero exit for high-severity findings)
3. Static architecture graph and import-cycle report

Evidence artifacts are uploaded even if an earlier stage fails. Security scan is heuristic; manual review is still required. The architecture stage currently reports cycles but does not fail CI on them.

The workflow is enabled on pull requests, manual dispatch, and pushes to its development branch. This change does not modify the default branch.

Local equivalent:
```bash
python ci/quality-python/quality_gate.py --config ci/quality-python/config/luong-hak.json --root .
python ci/quality-python/security_audit.py --root .
python ci/quality-python/architecture_analyzer.py --root .
```

Task Observer and Project Memory are not yet connected to artifact persistence or approval workflows; do not assume they are automatically collecting results. No CI execution has been confirmed merely by creating these files.
