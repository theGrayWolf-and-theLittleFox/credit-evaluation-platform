# Test and Training Evidence

## Automated tests

- Command: `.venv/bin/python -m pytest -q`
- Result: 3 passed.
- Warning: scikit-learn `lbfgs` reached `max_iter=200` during the end-to-end training flow.

## Reproducible baseline training

- First direct invocation failed because `scripts` was not importable when the repository root was absent from `PYTHONPATH`.
- Corrected command: `PYTHONPATH=. .venv/bin/python scripts/train_baseline.py`
- Result: model `sklearn_logreg_baseline` version `0.0.1`; registry and report written.
- ROC-AUC: `0.56588288` on synthetic demonstration data.

## Frontend demonstration

- System/default Node invocation failed: Vite reported `crypto.getRandomValues is not a function`.
- Bundled current Node invocation started the Vite development server.
- In-app browser screenshot capture was blocked for loopback URL `http://127.0.0.1:5173` with `ERR_BLOCKED_BY_CLIENT`; no screenshot is misrepresented as captured.

## Interpretation

The results evidence working integration scaffolding. They do not evidence production readiness, real-world credit performance, legal compliance, or favorable real-world fairness outcomes.
