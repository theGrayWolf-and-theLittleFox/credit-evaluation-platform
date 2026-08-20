# 6. Evidence Index

## 6.1 Review scope

The repository was inspected and exercised locally without asserting production deployment or partner-lender use.

## 6.2 Automated test evidence

Command:

```bash
.venv/bin/python -m pytest -q
```

Observed result:

```text
...                                                                      [100%]
3 passed
```

Observed warning: the end-to-end logistic-regression training reached the configured 200-iteration maximum. This is tracked as a model-development finding.

### Test-to-capability traceability

| Test | Capability evidenced |
|---|---|
| `tests/test_smoke.py` | Train/save/load `flg` model; score through API; validate score/decision; create audit ID |
| `tests/test_end_to_end.py` | Generate synthetic data; train/register model; health; score; explain; feature contract; fairness; portfolio analysis; audit flow |
| `tests/test_fairness_metrics.py` | Fairness metric arithmetic |

## 6.3 Reproducible training evidence

Command:

```bash
PYTHONPATH=. .venv/bin/python scripts/train_baseline.py
```

Observed output:

```text
Trained sklearn_logreg_baseline v0.0.1
Registry: artifacts/registry/model_registry.json
Report:   artifacts/reports/latest_train_report.json
```

Machine-readable copies in this folder:

- `evidence/model_registry.json`
- `evidence/latest_train_report.json`

Key values: schema hash `a991402390c9a9aa`; threshold `0.5`; ROC-AUC `0.56588288`; synthetic/demo note; empty fairness object in registry.

The serialized `baseline.joblib` is intentionally not duplicated into this documentation package: pickle/joblib files can execute code when loaded, and the documentation evidence is stronger when represented by the registry/report plus reproducible command. The source repository contains the generated artifact at `artifacts/models/baseline.joblib`.

## 6.4 Source implementation evidence

| Capability | Primary source evidence | Status |
|---|---|---|
| Alternative-data feature contract | `src/ice/features/contract.py`, `src/ice/features/transform.py` | Implemented/tested |
| Baseline training | `src/ice/pipelines/train.py`, `scripts/train_baseline.py` | Implemented/exercised |
| Model interface | `src/ice/models/base.py`, `src/ice/models/sklearn_logreg.py` | Implemented/exercised |
| Registry/versioning | `src/ice/models/registry.py` | Implemented/exercised |
| Real-time API | `services/api/app.py`, `services/api/api.py`, `services/api/schemas.py` | Implemented/tested |
| Reason codes/explanations | `src/ice/explain/` | Implemented/tested at endpoint level |
| Fairness metrics/monitor | `src/ice/fairness/` | Implemented/tested |
| Audit events/store | `src/ice/audit/`, `services/api/storage.py` | Implemented/tested in flow |
| Privacy redaction | `src/mie_credit_platform/audit.py`, settings/docs | Implemented in alternate stack |
| Frontend demo | `frontend/src/` components and API client | Implemented source |
| Container packaging | `Dockerfile`, `docker-compose.yml`, `docker/Dockerfile` | Present, not exercised in this review |
| Governance/compliance docs | `docs/*.md` | Present |
| Open-source governance | License, notice, contributing, code of conduct, security policy | Present |

## 6.5 Frontend/demo evidence

The React source includes dedicated views/components for scoring, explanation, fairness, redacted audit records, portfolio analysis, metrics, and the program roadmap. The Vite development server started with the bundled current Node runtime. The system-installed Node runtime failed because its crypto API was too old for the installed Vite version; this is a reproducibility/environment finding.

Live screenshot capture was attempted through the in-app browser, but its security policy blocked `http://127.0.0.1:5173` with `ERR_BLOCKED_BY_CLIENT`. Therefore, this package does **not** label any generated graphic as a live screenshot. The diagrams and source traceability are provided as “other evidence,” consistent with the request.

For a reviewer with a normal local browser:

```bash
cd frontend
/path/to/modern/node node_modules/vite/bin/vite.js --host 127.0.0.1
# open http://127.0.0.1:5173
```

Suggested screenshots to capture in a follow-on evidence run:

1. Full dashboard landing view with privacy/responsible-AI messaging.
2. Completed scoring form and returned score/decision/reason codes.
3. Explainability panel with feature contributions.
4. Fairness panel showing group counts and selection/TPR/FPR metrics.
5. Portfolio workbench summary and top reasons.
6. Redacted audit table showing hashed identifier and allowlisted payload.
7. API `/docs` OpenAPI page and `/health` response.

## 6.6 Documentation evidence

Existing source documentation includes architecture, fairness, governance, threat model, compliance mapping, privacy/redaction, project brief, and frontend notes. This package expands them into a unified system-design and validation dossier and reconciles claims against code/test evidence.

## 6.7 Current evidence limitations

- No real borrower or lender data.
- No external/independent validation report.
- No production deployment or availability/load evidence.
- No partner-lender pilot agreement, results, or stakeholder feedback.
- No complete model card/fairness report for a real model.
- No penetration test, SBOM, artifact signature, or immutable audit proof.
- No legally approved adverse-action reason-code document.
- No live-browser screenshots due to the stated loopback restriction.
- Pre-existing uncommitted frontend changes were not modified by this documentation work.

## 6.8 Reproduction checklist

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[api,dev,fairness]"
PYTHONPATH=. python scripts/train_baseline.py
python -m pytest -q
uvicorn services.api.app:app --port 8000
```

Then call `/health`, `/v1/features/contract`, `/v1/models/current`, `/v1/score`, `/v1/explain`, `/v1/audit/fairness`, and `/v1/portfolio/analyze`, saving timestamped request/response transcripts with secrets and identifiers removed.
