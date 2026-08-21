# 11. Detailed Implementation Design Reference

## 11.1 Purpose and reading rule

This section is the implementation-oriented companion to the architecture views. It explains how the repository is assembled, which path was exercised for the dossier, what each layer owns, and where the present code stops. It should be read with one rule in mind: a class, endpoint, or interface in the repository is evidence of implemented behavior only when the surrounding dependency path is also present and exercised. A target-state control is labeled as such.

The principal documented execution path is:

```text
React console
  -> frontend/src/lib/api.ts
  -> services/api/app.py and services/api/api.py
  -> src/ice feature, model, explanation, fairness, registry, and audit modules
  -> artifacts under the configured local paths
```

The repository also contains `src/flg` and `src/mie_credit_platform`. They are substantial alternate implementations, not internal layers called by the principal API. They are included in the design record because their presence affects public contracts, packaging, testing, migration, and maintenance.

## 11.2 Repository execution units

### Frontend unit

`frontend/` is a Vite and React TypeScript application. It renders the product demonstration and can use one of two adapters:

- Live mode sends JSON to a configured FastAPI base URL.
- Mock mode returns typed local fixtures and several runtime-generated values.

The frontend is an operator and reviewer console. It is not an identity provider, a lender system of record, a borrower notice-delivery channel, or an independent model-validation environment.

### Principal API unit

`services/api/app.py` creates the `FastAPI` application, publishes `/health`, and mounts the `/v1` router. `services/api/api.py` contains route handlers and coordinates core modules. The router-level dependency applies API-key validation to all versioned routes.

```python
router = APIRouter(
    prefix="/v1",
    dependencies=[Depends(require_api_key)],
)
```

This placement is useful because it avoids repeating the same dependency on each handler. It does not provide tenant, role, institution, product, environment, or resource-level authorization.

### Core engine unit

`src/ice` contains the model-independent interfaces and the baseline implementation used by the principal API:

- `features.contract` defines required and optional feature names and a schema hash.
- `features.transform` validates, sanitizes, orders, and vectorizes features.
- `models.base` defines the `CreditModel` interface and metadata.
- `models.sklearn_logreg` implements the serialized logistic-regression bundle.
- `models.registry` stores JSON registry entries and a current-model pointer.
- `pipelines.train` trains, evaluates, serializes, reports, and registers the baseline.
- `explain.explainer` returns linear contribution proxies.
- `explain.reason_codes` returns heuristic reason codes.
- `fairness.metrics` and `fairness.monitor` calculate basic group metrics.
- `audit.events` defines decision, outcome, and generic events.
- `audit.store` writes JSONL and optional SQLite records and supports JSONL reads.

### Artifact unit

The local reference design uses the filesystem as its artifact boundary:

```text
artifacts/
  data/synth.csv
  models/baseline.joblib
  registry/model_registry.json
  reports/latest_train_report.json
  audit/decisions.jsonl
  audit/audit.sqlite3
```

The paths are configurable through `ICE_` environment variables. They are convenient for a local reference implementation, but a production design needs immutable object storage, a transactional registry, a managed event stream or database, access evidence, encryption-key policy, backup and recovery, and artifact integrity verification.

## 11.3 Main application composition

The application constructor is intentionally small:

```python
app = FastAPI(
    title="Inclusive Credit Infrastructure API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}

app.include_router(v1_router)
```

The health response proves only that the process can execute the handler. It does not check the registry, model artifact, audit path, available storage, or inference. A production health design should separate:

- Liveness: the process and event loop can respond.
- Readiness: a compatible approved model and required dependencies are available.
- Dependency detail: authenticated operator-only diagnostics for artifact, registry, audit, and monitoring connections.
- Startup gate: the service does not join the load balancer until integrity and compatibility checks pass.

Reference readiness pseudocode:

```python
def readiness() -> ReadyState:
    registry = registry_client.read_current()
    assert registry.approved
    assert verify_digest(registry.artifact_uri, registry.sha256)
    assert verify_signature(registry.artifact_uri, registry.signature)
    model = artifact_cache.load(registry.artifact_uri)
    assert model.feature_schema_hash == registry.feature_schema_hash
    assert audit_sink.can_accept()
    return ReadyState(model_version=registry.version)
```

This block is target-state design, not current code.

## 11.4 Configuration model

`src/ice/config.py` uses Pydantic settings with the `ICE_` prefix and `.env` loading. Unknown environment entries are ignored. The current settings are:

| Setting | Default behavior | Design consequence |
|---|---|---|
| `ICE_ARTIFACTS_DIR` | `artifacts` | General local artifact root; not used as the only source of all subordinate paths |
| `ICE_REGISTRY_PATH` | JSON registry under `artifacts/registry` | Current-model lookup and model metadata |
| `ICE_CURRENT_MODEL_PATH` | baseline joblib path | Fallback when the registry has no artifact path |
| `ICE_AUDIT_LOG_PATH` | JSONL decision path | Principal audit read and append source |
| `ICE_AUDIT_SQLITE_PATH` | local SQLite path | Optional decision/outcome mirror |
| `ICE_DECISION_THRESHOLD` | `0.5` | Principal approve/deny boundary |
| `ICE_LOG_RAW_FEATURES` | false | Raw sanitized features omitted from decision events |
| `ICE_ENABLE_SQLITE_AUDIT_STORE` | true | Mirrors decision and outcome events only |
| `ICE_ALLOW_SENSITIVE_IN_MODEL` | false | Declares design intent; main scoring path already excludes the separate attribute map |
| `ICE_STORE_SENSITIVE_FOR_MONITORING` | false | Sensitive context omitted from the general decision event by default |
| `ICE_HASH_AUDIT_IDENTIFIERS` | true | Application reference transformed before persistence |
| `ICE_AUDIT_IDENTIFIER_SALT` | unset | Optional hash salt; production must use a secret-managed value |
| `ICE_API_KEY` | unset | Versioned endpoints allow unauthenticated access when absent |

Configuration validation is itself a missing control. A production profile should refuse to start if authentication is absent, identifier hashing is disabled, a salt is empty, raw-feature logging is enabled without an approved exception, an unapproved artifact is selected, or paths point to non-durable local storage.

```python
def validate_production_settings(s: Settings) -> None:
    require(s.environment == "production")
    require_secret(s.api_auth_reference)
    require_secret(s.audit_identifier_salt)
    require(s.hash_audit_identifiers)
    require(not s.log_raw_features)
    require(not s.store_sensitive_for_monitoring)
    require_uri_scheme(s.registry_uri, {"https", "s3", "gs"})
```

This is target-state configuration policy.

## 11.5 Model loading and registry resolution

`ModelStore.current_model_path` reads the current registry entry and uses its `artifact_path` when present. Otherwise it uses the configured fallback model path. `load_current_model` checks for local existence, loads the joblib bundle, and wraps it as `SklearnLogRegCreditModel`.

```python
def current_model_path(self) -> str:
    entry = get_current_entry(self.registry_path)
    if entry and entry.get("artifact_path"):
        return str(entry["artifact_path"])
    return self.fallback_model_path
```

The fallback makes local development easier. It is not a safe production rollback mechanism because it has no approval, digest, signature, compatibility, staleness, or incident-state check. A production registry record should include at least:

- Model name and immutable version.
- Artifact URI, digest, signature, serializer, and dependency image.
- Feature-contract version and schema hash.
- Decision-policy version and threshold configuration.
- Reason dictionary and explanation-method versions.
- Training snapshot, split, code, and configuration references.
- Performance, calibration, robustness, fairness, and explanation reports.
- Independent-validation report and unresolved findings.
- Approval identity, scope, restrictions, and revocation state.
- Last-known-good predecessor and rollback compatibility.

The current JSON registry records only a subset: name, version, local artifact path, creation value, feature hash, threshold, metrics, fairness object, notes, and current pointer.

## 11.6 Online score handler

The score route follows a short orchestration path:

```python
@router.post("/score", response_model=ScoreResponse)
def score(req: ScoreRequest) -> ScoreResponse:
    request_id = req.request_id or str(uuid.uuid4())
    return _score_response(
        req,
        request_id=request_id,
        created_at=utcnow(),
    )
```

`_score_response` loads the current model, invokes `score_application`, creates a decision event, writes JSONL, optionally writes SQLite, and returns the response. The route accepts a caller-supplied request ID but does not use it as an idempotency key. Reusing the ID produces another append. A production service needs an idempotency table keyed by tenant, operation, and idempotency key, with a request-payload digest and stored response.

Target idempotency behavior:

```text
if key absent:
  reserve key with request digest
  execute one decision transaction
  store response and final event ID
  return response

if key exists and digest matches:
  return stored response

if key exists and digest differs:
  return conflict
```

The main `score_application` function performs four responsibilities:

```python
sanitized = sanitize_features(features)
x = to_model_vector(model.contract, sanitized)
score_value = model.predict_proba(x)
decision = "approve" if score_value >= threshold else "deny"
reason_codes = generate_reason_codes(sanitized)
explanation = explain(model, x)
```

These operations are deterministic for a fixed artifact, threshold, and payload. The surrounding transaction is not fully reproducible unless the registry pointer, environment, serializer dependencies, reason rules, and policy are also fixed and recorded.

## 11.7 Explain handler

The explain route rescoring path validates and scores the provided features again. It does not accept the original decision request ID and does not load a stored decision vector. It creates a separate request ID and writes an `explain` event.

Current response fields:

```json
{
  "application_id": "app_example",
  "request_id": "generated-explanation-request",
  "model_name": "sklearn_logreg_baseline",
  "model_version": "0.0.1",
  "method": "linear_proxy",
  "created_at": "generated by the service",
  "contributions": {
    "rent_on_time_rate_12m": 0.0
  },
  "base_value": null
}
```

The design consequence is that the returned explanation can be linked to the application reference and model version but not directly to the original decision transaction. A production explanation endpoint should prefer a decision ID and retrieve the exact versioned vector and artifact used for that decision. If counterfactual re-explanation is allowed, it should be a separate operation with a distinct purpose.

## 11.8 Portfolio analysis handler

Portfolio analysis loops over submitted applications and reuses `score_application`. It produces:

- Total applications.
- Average score.
- Approval rate.
- Decision counts.
- Three fixed score-band counts.
- Most frequent reason codes.
- Row-level score, decision, and reasons.
- Optional fairness report when a group key and actual outcome are present.

Score bands are presentation categories, not lender policy:

```python
def score_band(score_value: float) -> str:
    if score_value < 0.40:
        return "subprime_watch"
    if score_value < 0.65:
        return "near_prime"
    return "prime"
```

The labels can be misread as industry-standard risk grades. They should be renamed or explicitly governed before any external use. Portfolio submissions also have no explicit maximum cohort size in the Pydantic schema. A production endpoint needs body limits, row limits, asynchronous-job behavior for large cohorts, per-tenant resource quotas, and suppression of small protected groups.

## 11.9 Fairness report handler

The main fairness endpoint accepts rows containing a group label, observed binary outcome, and predicted binary result. It computes group counts, selection rates, true-positive rates, maximum-minus-minimum demographic-parity difference, and maximum-minus-minimum equal-opportunity difference.

```python
selection_rate = selection_rates_by_group(
    groups,
    y_pred,
    positive_label=positive_label,
)
tpr = tpr_by_group(
    groups,
    y_true,
    y_pred,
    positive_label=positive_label,
)
```

The endpoint does not calculate confidence intervals, false-positive rates, calibration, uncertainty, suppression, intersections, missing-group analysis, or statistical significance. It accepts arbitrary group strings. The caller is responsible for lawful collection, group-definition governance, cohort construction, label maturity, and data quality.

## 11.10 Outcome ingestion

The outcome endpoint accepts one of four enumerated observation windows and a binary value. It writes an `OutcomeEvent` with the tokenized application reference.

```python
outcome_type: Literal[
    "repayment_30d",
    "repayment_90d",
    "repayment_180d",
    "repayment_12m",
]
outcome_value: int = Field(ge=0, le=1)
```

The design intentionally limits the event type, but it does not define label provenance, source confidence, event correction, supersession, maturity, multiple facilities, partial payments, restructures, charge-offs, or disputed outcomes. The `extra` object is unstructured. Production outcomes should use a versioned schema and immutable source reference, with corrections represented as new linked events rather than in-place overwrites.

## 11.11 Audit read model

JSONL is the authoritative read source for the principal API. Each line receives a synthetic read-time ID based on its line number. Reads can filter by event type, tokenized application reference, request ID, and model version. Results are sorted in reverse order by the stored creation string and sliced by offset and limit.

The normalizer prevents the frontend from receiving raw internal event structures. For decision events it exposes score, decision, threshold, reason codes, and feature hash. For outcome events it exposes outcome type and value. Generic events retain their stored payload.

Current limitations include:

- Full-file reads on each request.
- No transaction isolation between append and read.
- No tenant filter.
- No event signature, chain hash, object lock, or write-once policy.
- No deletion, correction, legal hold, or retention workflow.
- No cursor pagination or stable event ID independent of file position.
- No integrity reconciliation between JSONL and SQLite.

## 11.12 Governance summary calculation

The summary derives four operational controls:

| Control | Calculation | Current threshold |
|---|---|---|
| Explanation coverage | distinct decided applications with an explanation divided by distinct decided applications | at least 0.95 |
| Outcome coverage | distinct decided applications with an outcome divided by distinct decided applications | at least 0.80 |
| Fairness threshold | maximum absolute value of the latest two fairness differences | at most 0.10 |
| Audit capture | whether at least one decision event exists | exactly 1.0 |

Missing evidence is explicitly labeled `insufficient_data`. Any `review` control makes the overall status `review`; otherwise, any insufficient control makes the overall status `insufficient_data`; only four passing controls produce `passing`.

This is a useful control posture because silence is not treated as health. It is still a demonstration summary. It uses the first fairness event returned by the sorted JSONL read, reads only a bounded event set, and does not identify cohort, model, product, institution, monitoring window, or approval status.

## 11.13 Frontend composition details

The client composition separates read-side queries from write-side actions. Query keys are intentionally tied to relevant state:

```typescript
const governanceQuery = useQuery({
  queryKey: [
    "governance-summary",
    score?.request_id,
    fairnessSignature,
  ],
  queryFn: fetchGovernanceSummary,
});
```

After score, explanation, fairness, or portfolio state changes, the client refetches audit events. After an outcome, it refetches both audit events and governance. This creates a coherent demonstration loop. It does not guarantee read-after-write consistency in a distributed deployment; the live implementation is local and synchronous.

The frontend error boundary is component-local state. Network or schema errors are rendered in one banner. A production client should distinguish retryable service failures, validation errors mapped to fields, authorization failure, model unavailability, stale contract, and idempotency conflict.

## 11.14 Alternate FLG design

`src/flg` uses eight required features and validates declared bounds. It standardizes features in a scikit-learn pipeline, uses a logistic regression with a larger iteration limit, and produces three decisions:

```python
if score >= thresholds["approve"]:
    return "approve"
if score >= thresholds["review"]:
    return "review"
return "deny"
```

It generates reason records from coefficient magnitude and writes a separate JSONL file whose name is derived from the calendar day. The audit record includes the submitted applicant ID and optional protected attributes. This family demonstrates capabilities not present in the principal path, but it also has different privacy and contract behavior. Its three-state policy cannot be silently merged into the main two-state response.

## 11.15 Alternate MIE design

`src/mie_credit_platform` uses a fully typed eight-feature Pydantic model with ranges. It contains:

- Synthetic-data generation and baseline training.
- Versioned model-package directories.
- An approval flag and `require_approval` behavior.
- FastAPI scoring, explanation, fairness, model-list, and audit routes.
- A Typer CLI for training, listing, approving, scoring, explaining, reading audit events, and exporting JSONL.
- A general SQLite audit table with indexes.
- A configurable redactor that can allow, drop, hash, truncate, or limit payload values and hash or remove the applicant ID.

Its feature vocabulary again differs from both the main and FLG families. The implementation is valuable consolidation input, especially for approval gating and redaction, but the behavior must be migrated behind the canonical contract and re-tested.

## 11.16 Consolidation design

A defensible consolidation sequence is:

1. Freeze all public feature, API, registry, event, and CLI contracts and publish the differences.
2. Select one canonical vocabulary and define explicit aliases only for migration.
3. Implement contract-version negotiation and schema hashes over full definitions, not names alone.
4. Port the strongest controls: principal pseudonymous validation, MIE approval gating and redactor, FLG three-state policy if lender policy requires it.
5. Write characterization tests for every retained behavior before moving code.
6. Move one route at a time behind the canonical adapter.
7. Migrate artifacts and audit records with signed manifests and reconciliation counts.
8. Deprecate alternate entry points, remove them from packaging, and retain migration documentation.
9. Re-run model, privacy, fairness, audit, API, frontend, and operational acceptance suites.

Canonical package target:

```text
inclusive_credit/
  api/
  contracts/
  data/
  features/
  models/
  explanations/
  fairness/
  governance/
  audit/
  telemetry/
  cli/
```

This is a proposed organization. It is not represented as completed work.

## 11.17 Dependency and failure ownership

| Dependency | Current failure behavior | Production owner and control |
|---|---|---|
| Model registry file | Empty structure if absent | Model platform; transactional current pointer and approval gate |
| Model artifact | `503` from principal route when missing | Model platform; verified cache, last-known-good policy, alert |
| Feature validation | `400` for contract `ValueError`; Pydantic may return `422` | API and feature owners; stable error taxonomy and field mapping |
| JSONL audit append | File exception propagates | Evidence platform; durable acknowledgement, idempotency, reconciliation |
| SQLite mirror | Local insert exception propagates when enabled | Evidence platform; clarify authoritative store and recovery behavior |
| Explainability | `501` if current model has no linear explanation | Model governance; approved model-specific explanation strategy |
| Frontend live call | Error banner with response text | Product and API owners; safe error schema, retry state, correlation ID |
| Governance read | Summary over available bounded JSONL events | Responsible AI operations; scoped cohort/window and data sufficiency |

## 11.18 Implementation invariants

The detailed design depends on the following invariants. They should become executable assertions and release gates:

- Scored vectors never contain sensitive monitoring attributes.
- The vector column order matches the artifact's recorded feature contract.
- One decision response binds one model version, feature hash, threshold, and reason strategy.
- Optional-feature absence is represented consistently in training and serving.
- Every external identifier is validated before it is returned or persisted.
- Audit lookup applies the same tokenization policy as audit writes.
- A missing event stream is insufficient evidence, not a passing governance state.
- Model, threshold, feature, explanation, and reason changes are versioned independently when they can change a decision or notice.
- Mock-mode outputs are never accepted as production validation evidence.
- No alternate implementation family is assumed to protect a principal-path request unless the call graph proves that it is invoked.
