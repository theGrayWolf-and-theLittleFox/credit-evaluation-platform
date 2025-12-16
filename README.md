## Inclusive Credit Infrastructure (Open-Source) — `qir`

This repository is a **public, open-source reference implementation** of a responsible AI credit evaluation platform designed to help U.S. lenders responsibly extend credit to people who lack traditional credit histories (“credit invisible” / “thin file”).

It is intentionally structured as **non-proprietary technical infrastructure**:

- **Alternative data**: rent, utilities, and verified cash-flow indicators (consumer-permissioned).
- **Explainability**: human-readable **reason codes** and optional feature-attribution explanations.
- **Fairness**: built-in measurement hooks for disparate impact / equal opportunity style metrics.
- **Auditability**: immutable-ish decision logs, model versioning, and metadata for oversight.
- **Deployability**: a **FastAPI** scoring service and a Python training pipeline you can run locally or in the cloud.

> Important: This project provides **technical scaffolding** and references to compliance concepts; it is **not legal advice**. Any real deployment must be reviewed with qualified compliance/legal counsel and validated for your specific use case, data sources, and jurisdiction.

---

## What’s included (mapped to the proposal)

### Project 1 (Months 0–12): Alternative-Data Credit Modeling & Responsible AI

- **Data contracts & feature engineering**: `src/ice/features/`
- **Baseline model training pipeline** (synthetic data demo): `src/ice/pipelines/` + `scripts/train_baseline.py`
- **Fairness hooks** (metrics + monitoring stubs): `src/ice/fairness/`
- **Explainability** (reason codes, optional SHAP/LIME integration points): `src/ice/explain/`
- **Validation & audit trail primitives**: `src/ice/audit/`

### Project 2 (Months 13–26): Real-Time Platform, Governance, Community Adoption

- **Real-time scoring API** (FastAPI): `services/api/`
- **Model registry metadata** (versioning, provenance, reports): `src/ice/models/registry.py`
- **Audit/event store** (append-only JSONL + SQLite option): `src/ice/audit/store.py`
- **Governance docs** (risk management, monitoring, threat model): `docs/`

---

## Quickstart (local)

### 1) Create a virtualenv and install

```bash
python -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -e ".[api,dev]"
```

Optional extras (heavier dependencies):

```bash
# fairness toolkits / explainability / data validation
pip install -e ".[fairness,explain,validate]"
```

### 2) Train a demo baseline model (synthetic data)

```bash
python scripts/train_baseline.py
```

This writes:

- `artifacts/models/baseline.joblib`
- `artifacts/registry/model_registry.json`
- `artifacts/reports/latest_train_report.json`

### 3) Run the API

```bash
uvicorn services.api.app:app --reload --port 8000
```

### 4) Score an applicant

```bash
curl -s http://localhost:8000/health | jq

curl -s http://localhost:8000/v1/score \
  -H "Content-Type: application/json" \
  -d '{
    "application_id": "app_123",
    "features": {
      "rent_on_time_rate_12m": 0.95,
      "utility_on_time_rate_12m": 0.90,
      "avg_monthly_income_6m": 5200,
      "cashflow_volatility_6m": 0.18,
      "avg_daily_balance_6m": 2100,
      "nsf_events_12m": 0,
      "overdraft_events_12m": 0
    },
    "sensitive_attributes": {
      "age_band": "25-34",
      "zip3": "100"
    }
  }' | jq
```

---

## API overview

- `GET /health`: service health
- `GET /v1/models/current`: current model metadata (version/provenance)
- `POST /v1/score`: score + decision + reason codes + audit event
- `POST /v1/explain`: explanation payload (if available) for a given feature set
- `POST /v1/audit/events`: ingest outcome events (repayment, delinquency) for monitoring

See `services/api/schemas.py` for request/response schemas.

---

## Repo layout

```text
qir/
  services/api/                # Real-time scoring API (FastAPI)
  src/ice/                     # Core library: features, models, fairness, audit, explainability
  scripts/                     # Demo scripts: synthetic data + training
  docs/                        # Governance + compliance mapping + threat model
  artifacts/                   # Local outputs (models, registry, reports) — generated
  tests/                       # Minimal tests
```

---

## Governance & compliance (technical mapping)

This repo includes documentation that maps engineering controls to common expectations in:

- **FCRA / ECOA** (conceptual mapping for auditability, adverse-action style reasons, data lineage)
- **NIST AI RMF** (risk management structure, monitoring)
- **Blueprint for an AI Bill of Rights** (notice/explanation, discrimination protections)

See:

- `docs/COMPLIANCE_MAPPING.md`
- `docs/GOVERNANCE.md`
- `docs/THREAT_MODEL.md`
- `docs/FAIRNESS.md`
- `docs/PRIVACY_AND_REDACTION.md`
- `docs/PROJECT_BRIEF.md`

---

## Contributing

PRs welcome. Please read:

- `CONTRIBUTING.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`

---

## License

Apache-2.0. See `LICENSE`.