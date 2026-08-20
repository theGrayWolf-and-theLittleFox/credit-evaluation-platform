# Test and Training Evidence

## Automated tests

- Command: `.venv/bin/python -m pytest -q`
- Result: 10 passed and 1 failed across 11 collected tests.
- Failing assertion: `tests/test_end_to_end.py::test_train_and_monitoring_flow` expects governance `overall_status == "passing"`; the service returns `review` because the demonstration fairness cohort breaches configured disparity thresholds. This is an unresolved test-oracle/policy-expectation mismatch, not a basis for claiming a fully passing suite.
- Warning: scikit-learn `lbfgs` reached `max_iter=200` during the end-to-end training flow.

## Reproducible baseline training

- First direct invocation failed because `scripts` was not importable when the repository root was absent from `PYTHONPATH`.
- Corrected command: `PYTHONPATH=. .venv/bin/python scripts/train_baseline.py`
- Result: model `sklearn_logreg_baseline` version `0.0.1`; registry and report written.
- ROC-AUC: `0.56588288` on synthetic demonstration data.

## Frontend demonstration

- System/default Node invocation failed: Vite reported `crypto.getRandomValues is not a function`.
- Bundled Node 24 invocation started the Vite development server and completed `npm run build` successfully (93 modules transformed).
- The in-app browser opened the mock-mode frontend at `http://127.0.0.1:4173`.
- Scoring, explanation, fairness, portfolio-analysis, borrower-rights, outcome, and governance interactions were exercised before twelve interface screenshots were captured.
- Captures are stored in `screenshots/` and reproduced in Section 9 of the consolidated dossier.

## Interpretation

The results evidence working integration scaffolding. They do not evidence production readiness, real-world credit performance, legal compliance, or favorable real-world fairness outcomes.
