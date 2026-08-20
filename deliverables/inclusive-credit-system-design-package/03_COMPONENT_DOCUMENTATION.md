# 3. Component Documentation

## 3.1 Repository organization and implementation families

The repository contains three partially overlapping Python namespaces:

- `src/ice/`: the architecture described by the README and the main end-to-end test; includes features, models, fairness, explainability, audit, and training pipeline.
- `services/api/`: FastAPI serving layer paired with `ice` and exercised end to end.
- `src/flg/`: a second compact implementation with its own data, ML, fairness, explainability, governance, and API path; exercised by the smoke test.
- `src/mie_credit_platform/`: privacy-oriented modeling, audit, governance, API, settings, and CLI implementation; includes a richer redactor and alternative model package lifecycle.
- `frontend/`: React/Vite demonstration console.

This duplication demonstrates experimentation but creates ownership and consistency risk. A production plan should choose one canonical namespace, migrate unique controls, deprecate the others, and enforce a single feature vocabulary.

## 3.2 Component catalog

### A. Synthetic data generation

**Locations:** `scripts/generate_synth_data.py`, `src/flg/data/synthetic.py`, `src/mie_credit_platform/modeling/synthetic_data.py`  
**Responsibility:** generate privacy-safe, reproducible alternative-data records and synthetic labels for demos/tests.  
**Inputs/outputs:** sample size and seed → pandas DataFrame with feature values, group labels where applicable, and binary outcome.  
**Dependencies:** NumPy/pandas.  
**Status:** implemented and used by tests/training.  
**Limitations:** synthetic relationships do not represent actual borrowers, selection mechanisms, measurement error, macroeconomic regimes, or historical discrimination. Synthetic fairness results cannot validate real-world equity.

### B. Feature contract

**Locations:** `src/ice/features/contract.py`, `src/ice/features/transform.py`, `src/flg/features/schema.py`, `src/mie_credit_platform/modeling/schemas.py`  
**Responsibility:** define accepted feature names, required/optional status, numeric types, ordering, schema hash, and transformation into model inputs; publish richer display metadata through the API.
**Interfaces:** API request schemas; feature-contract endpoint; model pipeline.  
**Status:** name/type/order enforcement and contract publication are implemented and tested. UI range metadata is implemented, but complete server-side range enforcement is not.
**Failure modes:** naming divergence (`utility` vs `utilities`, differing lookback periods), missingness ambiguity, schema drift, unit mismatch.  
**Required hardening:** canonical data dictionary, compatibility tests, provider provenance/freshness, explicit null semantics, transform versioning, and monotonicity review.

### C. Training pipeline

**Locations:** `src/ice/pipelines/train.py`, `src/flg/ml/train.py`, `src/mie_credit_platform/modeling/train.py`, `scripts/train_baseline.py`  
**Responsibility:** split data, fit preprocessing/model pipeline, evaluate, serialize artifact, write registry metadata and report.  
**Current model:** standardized logistic regression baseline.  
**Status:** implemented and exercised.  
**Observed evidence:** model `sklearn_logreg_baseline` version `0.0.1`, schema hash `a991402390c9a9aa`, ROC-AUC `0.56588288`; convergence warning at `max_iter=200`.  
**Required hardening:** leakage-safe time/out-of-time splits, hyperparameter protocol, calibration, confidence intervals, class weighting review, reproducible environment lock, artifact digest/signature, independent validation.

### D. Model abstraction and serialization

**Locations:** `src/ice/models/base.py`, `src/ice/models/sklearn_logreg.py`, `src/mie_credit_platform/modeling/model_io.py`  
**Responsibility:** stable prediction interface, feature ordering, score generation, persistence/loading.  
**Status:** implemented.  
**Risks:** joblib/pickle artifacts execute Python during deserialization; only load signed artifacts from trusted storage. Enforce scikit-learn/runtime compatibility and smoke-test after loading.

### E. Model registry

**Locations:** `src/ice/models/registry.py`, `src/mie_credit_platform/governance/registry.py`  
**Responsibility:** model name/version, artifact location, creation time, threshold, feature hash, metrics, fairness metadata, notes, and current-version pointer.  
**Status:** basic JSON registry implemented; generated evidence included.  
**Production gap:** no immutable registry backend, signed approval, role-separated promotion, rollback attestation, or artifact digest enforcement demonstrated.

### F. Scoring and decision policy

**Locations:** `services/api/api.py`, `src/flg/api/main.py`, `src/mie_credit_platform/modeling/scoring.py`  
**Responsibility:** validate request, transform features, score model, apply threshold, return decision/recommendation.  
**Status:** implemented and tested.  
**Design note:** model score and lender policy should remain distinct. The platform should prefer `recommendation` language until lender authority and automation conditions are approved.

### G. Explainability and reason codes

**Locations:** `src/ice/explain/explainer.py`, `src/ice/explain/reason_codes.py`, `src/flg/explainability/reason_codes.py`  
**Responsibility:** compute feature contributions and translate material negative factors into human-readable reasons.  
**Status:** implemented baseline; explanation endpoint and contribution presence tested.  
**Limitations:** repository documentation describes SHAP/LIME as optional integration points; their production integration, explanation fidelity study, borrower comprehension study, and legal approval are not evidenced.

### H. Fairness metrics

**Locations:** `src/ice/fairness/metrics.py`, `src/ice/fairness/monitor.py`, `src/flg/fairness/metrics.py`, `src/mie_credit_platform/modeling/fairness.py`  
**Responsibility:** compute group counts, selection rates, TPR/FPR, demographic-parity difference, equal-opportunity difference, and related ratios.  
**Status:** implemented and unit/integration tested.  
**Limitations:** small-sample confidence intervals, intersectional analysis, calibration-by-group, statistical significance, multiple-testing control, mitigation algorithms, and lawful protected-class data governance need fuller implementation.

### I. Audit events and storage

**Locations:** `src/ice/audit/events.py`, `src/ice/audit/store.py`, `src/mie_credit_platform/audit.py`, `services/api/storage.py`  
**Responsibility:** decision/outcome event schemas, JSONL append, optional SQLite storage, querying, pagination, and export.  
**Status:** implemented reference primitives; scoring flow verifies an audit event is created.  
**Limitations:** "append-only" is a convention in local files, not cryptographic immutability. Production needs access separation, sealing/hash chains or immutable storage, retention, reconciliation, backups, and integrity monitoring.

### J. Privacy redaction

**Locations:** `src/mie_credit_platform/audit.py`, `src/mie_credit_platform/settings.py`, `docs/PRIVACY_AND_REDACTION.md`  
**Responsibility:** hash/remove applicant IDs, allowlist payload keys, hash selected fields, truncate strings, and limit list sizes before persistence.  
**Status:** implemented in the `mie_credit_platform` path; documentation indicates privacy-first defaults.  
**Integration concern:** verify the canonical `ice`/`services` scoring path consistently uses the same redaction policy; duplicated stacks can drift.

### K. API security and middleware

**Locations:** `services/api/security.py`, `src/mie_credit_platform/api/security.py`, `src/mie_credit_platform/api/middleware.py`  
**Responsibility:** API-key checks, request context, security-related service behavior.  
**Status:** scaffold/partial.  
**Production gap:** institution identity, OAuth2/mTLS, tenant-scoped authorization, key rotation, replay protection, WAF/rate limits, and formal security tests are not evidenced.

### L. Frontend demonstration console

**Locations:** `frontend/src/App.tsx` and components including `ScoreForm`, `FairnessPanel`, `ExplainabilityPanel`, `AuditTable`, `PortfolioWorkbench`, and `ProgramRoadmap`.
**Responsibility:** demonstrate alternative-data inputs, decisions, explanations, fairness summaries, portfolio exploration, and redacted audit records.
**Status:** implemented and exercised in mock mode. The mock adapter uses typed fixtures for model, contract, fairness, governance, portfolio, and audit views, while generating some score, decision, request-ID, and `created_at` values at runtime. The local Vite application was opened through the in-app browser, and twelve views covering landing status, feature input, scoring, borrower rights, explanation, fairness, portfolio analysis, outcomes, governance lineage, monitoring, and control evidence were captured in `screenshots/` and reproduced in Section 9.
**Production gap:** authenticated session, accessibility conformance, secure credential proxy, CSP/security headers, error/empty states, user research, and borrower-facing notice validation.

### M. Telemetry and logging

**Locations:** `src/mie_credit_platform/telemetry.py`, `src/ice/logging.py`, `src/flg/logging.py`  
**Responsibility:** operational logs and tracing hooks.  
**Status:** scaffold/partial.  
**Required hardening:** standardized structured fields, privacy classification, metric dashboards, trace sampling, SIEM integration, SLO alerts, and monitoring runbooks.

### N. Packaging, community, and security policy

**Locations:** `Dockerfile`, `docker-compose.yml`, `pyproject.toml`, `LICENSE`, `NOTICE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.  
**Responsibility:** repeatable build, open-source governance, contribution rules, license, and vulnerability reporting.  
**Status:** present.  
**Required hardening:** pinned dependency lock, SBOM, image signing, vulnerability scan evidence, release provenance, supported-version policy, maintainer approval rules.

## 3.3 Cross-component contracts

| Producer | Consumer | Contract | Principal risk |
|---|---|---|---|
| Data source | Feature pipeline | names, units, ranges, provenance, consent, freshness | silent semantic drift |
| Feature pipeline | Model | ordered transformed vector + schema hash | training-serving skew |
| Model registry | API | approved artifact, digest, threshold, feature hash | unauthorized promotion |
| Model | Decision policy | calibrated score definition | threshold misuse |
| Model/explainer | Reason mapper | contribution sign/magnitude, code version | inaccurate adverse reasons |
| API | Audit store | minimal decision event + integrity metadata | PII leakage or missing evidence |
| Outcome ingestion | Monitoring | outcome definition/horizon/linkage | biased or delayed labels |
| Monitoring | Governance | metrics, uncertainty, trigger status | metric-only governance without action |

## 3.4 Recommended canonicalization

1. Select `ice` + `services/api` as the canonical core because the main end-to-end test follows it.
2. Port `PIIRedactor`, query/export capabilities, and useful CLI functions from `mie_credit_platform` into canonical modules.
3. Compare and migrate any unique `flg` tests/features, then deprecate `flg` behind a documented compatibility period.
4. Publish one canonical feature dictionary and migration map for naming/lookback differences.
5. Consolidate settings, artifact layout, registry schema, audit schema, reason-code dictionary, and API schemas.
6. Add architecture decision records documenting the consolidation.
