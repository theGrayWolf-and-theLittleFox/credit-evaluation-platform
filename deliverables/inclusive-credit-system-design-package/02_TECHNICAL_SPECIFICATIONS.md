# 2. Technical Specifications

## 2.1 Platform stack

| Layer | Current technology | Production expectation |
|---|---|---|
| Core language | Python 3.10+ | Supported, patched runtime; pinned lockfile/SBOM |
| API | FastAPI, Pydantic 2, Uvicorn | Gateway, OAuth2/mTLS, tenant RBAC, TLS, rate limits |
| Modeling | NumPy, pandas, scikit-learn, joblib | Reproducible environments; artifact signing and scanning |
| Optional responsible-AI tools | Fairlearn; SHAP; LIME; Great Expectations extras | Version-qualified validation and approved configurations |
| Frontend | React, TypeScript, Vite, React Query, React Hook Form | CSP, HTTPS, secure proxy for credentials, accessibility testing |
| Audit/storage | JSONL and SQLite reference implementations | Managed encrypted store, append-only integrity, retention and legal hold |
| Packaging | Docker, Docker Compose, setuptools | Image signing, vulnerability scans, SBOM, hardened base image |
| Testing | pytest, FastAPI TestClient | Unit/integration/contract/security/load/model-validation suites |

## 2.2 API contract

### Current principal endpoints

| Method and path | Purpose | Evidence status |
|---|---|---|
| `GET /health` | Runtime and model/audit health | Implemented and tested |
| `GET /v1/models/current` | Current model metadata | Implemented |
| `GET /v1/features/contract` | Published model input definitions | Implemented and tested |
| `POST /v1/score` | Score, decision/recommendation, reasons, audit event | Implemented and tested |
| `POST /v1/explain` | Feature contributions and explanation payload | Implemented and tested |
| `POST /v1/audit/events` | Ingest outcomes for monitoring | Implemented |
| `POST /v1/audit/fairness` | Compute group metrics from labeled rows | Implemented and tested |
| `POST /v1/portfolio/analyze` | Batch/portfolio outcome and explanation summary | Implemented and tested |

### Representative score request

```json
{
  "application_id": "app_123",
  "features": {
    "rent_on_time_rate_12m": 0.95,
    "utility_on_time_rate_12m": 0.90,
    "avg_monthly_income_6m": 5200,
    "cashflow_volatility_6m": 0.18,
    "avg_daily_balance_6m": 2100,
    "nsf_events_12m": 0,
    "overdraft_events_12m": 0,
    "months_at_current_address": 24
  },
  "sensitive_attributes": {
    "age_band": "25-34"
  }
}
```

### Response requirements

- Stable request/application correlation identifiers.
- Score with documented semantic meaning and bounded range.
- Recommendation or policy decision with threshold/version.
- Ordered, non-duplicative reason codes and plain-language descriptions.
- Model name and version; feature-contract version or hash.
- No raw sensitive attribute or unapproved feature echo.
- Explicit manual-review state where configured.
- Deterministic error code, safe message, and correlation ID on failure.

### Target HTTP behavior

- `200` valid result; `400/422` malformed or contract-invalid request; `401` missing/invalid authentication; `403` unauthorized tenant/action; `409` schema/model version conflict; `429` rate limit; `503` approved model or required audit dependency unavailable. The reference service implements only part of this status model; gateway, tenant-authorization, version-conflict, and rate-limit behavior are production requirements.
- Idempotency key should be supported for lender retries. Duplicate requests must not create contradictory decisions.
- OpenAPI schema should be versioned and contract-tested; breaking changes require a new API version.

## 2.3 Feature contract

Each feature definition should specify name, type, units, allowed range, missing-value policy, source, lookback window, transform, monotonic expectation, data-quality rules, consumer-consent basis, and reason-code mapping. The current core contract enforces required and optional names, numeric types, ordering, and a schema hash. Separate API metadata supplies labels and control ranges to the frontend. Those published ranges are not yet a complete backend validation contract: the scoring path performs limited clamping for payment rates and event counts but does not reject every out-of-range value.

Required production rules:

- Reject unknown features and non-finite numbers.
- Distinguish unavailable, not applicable, and zero.
- Prevent impossible ratios, negative counts, future timestamps, and inconsistent lookback windows.
- Validate freshness and data-provider provenance.
- Lock feature order and transform parameters to the approved artifact.
- Detect training-serving skew via schema/hash comparison.
- Version changes with compatibility and backfill analysis.

## 2.4 Decision policy specification

The model estimates a defined outcome probability; a separate policy converts it into approve, deny, or manual-review recommendation. The threshold is model/version metadata and must not be changed outside governance.

Production policy should define:

- Target outcome and performance horizon.
- Thresholds for approve/review/deny and economic rationale.
- Missing-data and low-confidence handling.
- Overrides, authority levels, required rationale, and monitoring.
- Maximum permissible latency and timeout behavior.
- Prohibition on sensitive attributes entering the score.
- Policy/fairness trade-off analysis for every threshold change.

## 2.5 Explainability specification

The explanation system provides deterministic reason statements and optional contribution-based explanations. A compliant implementation must ensure fidelity to the actual decision, stable ordering, absence of sensitive information, sufficient specificity, and understandable language.

Reason-code controls:

- Maintain a versioned feature-to-code dictionary.
- Specify whether a reason is adverse, positive, informational, or manual-review related.
- Test sign correctness: a cited adverse factor must genuinely reduce the score relative to the documented reference.
- Test completeness: top material factors should be represented.
- Prevent contradictory or duplicate codes.
- Record explanation method/version in the audit event.
- Require legal/compliance approval before borrower-facing use.

## 2.6 Security specifications

| Control family | Minimum production requirement |
|---|---|
| Identity | OAuth2 client credentials or mTLS; unique institution and environment identity |
| Authorization | Tenant isolation, least privilege, role separation for scoring, audit, model promotion, and admin |
| Transport | TLS 1.2+; secure headers; private connectivity where feasible |
| Secrets | Managed vault; rotation; no frontend/API keys in source or static bundle |
| Input security | Strict schemas, size/range limits, rate limiting, replay/idempotency controls |
| Artifact security | Signed immutable models, digest verification, malware/dependency scans |
| Logging | No raw payloads by default; structured security events; correlation IDs |
| Storage | Encryption at rest, backup encryption, key separation, access logging |
| Audit integrity | Append-only permissions, hash chaining or immutable/WORM storage, periodic sealing |
| SDLC | Branch protection, review, SAST/SCA/secret scanning, SBOM, patch SLAs |
| Operations | WAF, DDoS protection, monitoring, alerting, incident runbooks, recovery tests |

## 2.7 Privacy specifications

- Data inventory and purpose limitation for every field.
- Consent and authorization records linked to source transactions.
- Separate raw source, engineered features, sensitive monitoring attributes, and audit metadata.
- Hash or remove applicant identifiers in analytics/audit views.
- Allowlist persisted payload fields; truncate strings and cap arrays.
- Configurable retention and deletion workflows, including backups.
- Access reports, data-subject dispute/reconsideration routing, and breach response.
- Prohibit production request-body logging unless explicitly approved and protected.

The implemented `PIIRedactor` hashes applicant IDs by default, filters payload keys, truncates strings, and caps list sizes. Its hash salt must be unique and secret in production; unsalted hashes are vulnerable to guessing.

## 2.8 Audit record specification

Minimum decision event:

- event ID, UTC timestamp, tenant/lender identifier, request ID, tokenized application ID;
- model name/version/artifact digest, feature-contract hash, policy version, threshold;
- score, recommendation/decision, reason codes, explanation version;
- feature hash or governed minimal feature snapshot;
- manual-review/override state and actor where applicable;
- software release/commit and environment;
- write-integrity/seal information.

Outcome events should link to the tokenized application identifier and specify outcome type, observation date/horizon, value, provenance, correction status, and event version.

## 2.9 Performance and reliability objectives

These are proposed acceptance objectives, not measurements demonstrated by the repository:

- Availability: 99.9% monthly for the scoring API, excluding scheduled maintenance.
- Latency: p50 under 100 ms, p95 under 250 ms, p99 under 500 ms within the service boundary for single-record scoring.
- Error rate: under 0.1% platform-caused 5xx responses over a rolling hour.
- Recovery: RTO 60 minutes; RPO 5 minutes for decision audit events, subject to lender requirements.
- Capacity: documented sustained and burst rates per tenant; load test to at least 2x forecast peak.
- Determinism: identical approved model, policy, and canonical input produce identical result.
- Audit durability: no acknowledged decision without the configured durable audit guarantee.

## 2.10 Observability

Metrics should include request count/latency/error by endpoint and tenant; model load/version; score and decision distributions; missingness and range violations; reason-code frequency; audit-write failures; drift metrics; calibration; subgroup selection/TPR/FPR; override and appeal rates. Logs must remain privacy-minimized. Distributed traces should carry request IDs but not raw financial data.

Alert examples:

- approved-model load failure or schema mismatch;
- p95 latency or 5xx rate breach;
- abrupt decision-rate, score, or missingness shift;
- subgroup metric below approved threshold;
- explanation distribution change without model release;
- audit lag, integrity failure, or rejected writes;
- repeated authentication failure or tenant-boundary violation.

## 2.11 Configuration and environments

Use separate development, test, validation, pilot, and production environments. No production data in development. Configuration must be environment-specific, typed, centrally managed, and recorded with release evidence. Model promotion must reference an immutable artifact and be distinct from application deployment.

## 2.12 Definition of done for production readiness

- Real, lawfully sourced representative data and complete data lineage.
- Independent model validation with resolved findings.
- Performance, calibration, stability, fairness, and explanation acceptance criteria met.
- Legal/compliance approval of intended use, features, notices, and reason codes.
- Threat model, penetration test, dependency scan, and remediation complete.
- Load, failover, backup/restore, and rollback tests pass.
- Tenant identity/authorization, encryption, secrets, and audit integrity demonstrated.
- Human review, override, dispute, and incident workflows exercised.
- Pilot entry/exit criteria approved and monitored.
