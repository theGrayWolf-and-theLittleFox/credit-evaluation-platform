# 14. Security, Privacy, Deployment, and Operations Design

## 14.1 Operating premise

An alternative-data credit platform processes linkable financial behavior and can influence consequential decisions. Security, privacy, and operations are therefore part of model correctness. A numerically correct score is not a valid result if it uses an unauthorized source, crosses a tenant boundary, cannot be reconstructed, leaks into telemetry, or is returned without the required audit evidence.

This section separates current safeguards from the production control design. The repository provides privacy-oriented defaults, a pseudonymous-reference validator, optional API-key protection, identifier hashing, feature hashing, JSONL/SQLite audit primitives, and bounded audit reads. It does not provide a production cloud deployment, identity plane, tenant authorization, encryption-key configuration, immutable evidence store, penetration-test result, or incident-management integration.

## 14.2 Data classification

| Data class | Examples | Default handling | Production restriction |
|---|---|---|---|
| Direct identifiers | name, email, telephone, government ID, account number | Not accepted by principal application reference; not part of feature schema | Remain in lender/provider systems; separate tokenization boundary |
| Pseudonymous transaction references | application ID, request ID | Returned to caller; application ID hashed for audit by default | Tenant-scoped tokens, controlled re-identification, retention policy |
| Scored alternative-data aggregates | payment rates, income, volatility, balance, events, tenure | Used for inference; hashed in audit; raw values off by default | Purpose-bound access, encryption, strict telemetry exclusion |
| Sensitive monitoring context | age band, race/ethnicity, sex, additional group strings | Separate request object; storage off by default | Restricted enclave, lawful basis, aggregate release, small-cell rules |
| Model and policy evidence | artifact, registry, feature hash, threshold, reasons | Local files and response fields | Signed artifacts, immutable registry, role-separated promotion |
| Outcomes | repayment window and binary result | Tokenized application join in audit stream | Verified source, corrections, maturity, retention, label governance |
| Operational metadata | health, errors, latency, request correlation | Minimal implementation | Structured telemetry with allowlist and no raw request body |

## 14.3 Threat actors and misuse cases

The security design should account for:

- An unauthenticated external caller attempting to score arbitrary data.
- A valid lender credential used outside its institution, product, or environment scope.
- A compromised browser or build containing a long-lived API key.
- An insider attempting to access another tenant's decision or monitoring records.
- A caller placing direct identifiers into nominally pseudonymous fields.
- A malicious or defective provider sending poisoned, duplicate, stale, or misattributed data.
- A developer promoting an unvalidated artifact or modifying a threshold without approval.
- An operator using sensitive monitoring attributes as prediction inputs.
- A retry storm creating duplicate decisions or outcome records.
- An attacker replacing a local joblib file or exploiting unsafe deserialization.
- A logging or APM agent capturing request bodies, response payloads, or environment secrets.
- A user inferring protected or financial characteristics from a low-count monitoring view.
- A repository contributor inserting secrets, personal data, or deceptive fixture values.

## 14.4 Trust boundaries

The production topology should enforce the following boundaries:

1. Lender boundary: the lender owns applicant identity, eligibility, credit policy, final action, notice delivery, and human review.
2. API edge: authenticates client identity, establishes tenant and product scope, limits traffic, validates protocol, and maps safe errors.
3. Online service: receives aggregates, loads approved artifacts, performs inference, and emits bounded evidence.
4. Evidence boundary: stores append-only decision, explanation, outcome, and control records under separate access roles.
5. Monitoring enclave: receives authorized protected-group data and tokenized outcomes; releases approved aggregates.
6. Offline development: trains and validates on governed snapshots without write access to serving or the production current pointer.
7. Promotion boundary: requires role-separated approval and signed artifacts before serving activation.

No direct route should connect an external client to artifact storage, raw training data, or the monitoring enclave.

## 14.5 Authentication and authorization

Current demonstration authentication is one optional shared API key:

```http
X-API-Key: <configured value>
```

Production design should use short-lived credentials or mutually authenticated service identity. Authorization must be evaluated per request:

```python
def authorize(identity, operation, resource):
    require(identity.tenant_id == resource.tenant_id)
    require(operation in identity.allowed_operations)
    require(resource.product in identity.allowed_products)
    require(identity.environment == resource.environment)
    require(not identity.revoked)
```

Roles should separate lender integration, lending operations, model development, independent validation, responsible AI review, compliance, audit, security, and platform administration. Access to protected-group data and re-identification services should be narrower than access to aggregate decision evidence.

Required access evidence:

- Credential issuance, rotation, revocation, and expiration.
- Successful and denied authorization decisions.
- Privileged access approval and review.
- Registry promotion and rollback actions.
- Audit export, monitoring query, and re-identification events.
- Emergency access and post-event review.

## 14.6 Pseudonymization design

The principal code creates a stable audit token:

```python
digest = hashlib.sha256()
digest.update(salt.encode("utf-8"))
digest.update(b"\x00")
digest.update(value.encode("utf-8"))
token = f"ref_{digest.hexdigest()}"
```

When no salt is configured, only the source value is hashed. Production must use a secret-managed, nonempty, environment-specific key or keyed-hash construction. Tokens should be tenant-scoped to prevent cross-tenant joins:

```text
token = HMAC(
  tenant-specific secret,
  canonical tenant id || application reference
)
```

Salt or key rotation requires a version field. Outcome linkage during rotation needs either a controlled mapping service or dual-token transition. The token itself remains personal or linkable data under many governance frameworks; pseudonymization reduces exposure but does not remove obligations.

## 14.7 Request and response minimization

The current score request can carry monitoring attributes. The production API should avoid that combination unless a documented operational need outweighs separation risk. Recommended pattern:

```text
scoring channel:
  application token + approved feature aggregates

monitoring channel:
  monitoring token + authorized group attributes
  access limited to fairness pipeline

outcome channel:
  application token + verified outcome event
```

The response should contain only data needed by the lender workflow. Raw feature echoes, sensitive attributes, artifact paths, internal errors, and full explanation internals should be omitted. Borrower-facing language should be generated or selected in a controlled notice layer rather than exposing technical contributions directly.

## 14.8 Audit minimization and integrity

Default principal decision storage is privacy-aware:

- Application reference is hashed.
- Feature dictionary is reduced to a SHA-256 digest.
- Raw features are omitted unless explicitly enabled.
- Sensitive attributes are omitted unless explicitly enabled.

Integrity is not yet protected. Production evidence should use an immutable event identifier and one of these patterns:

- Managed append-only stream with write acknowledgement and immutable archive.
- Transactional evidence database plus periodic signed manifest.
- Hash chain in which each event includes the previous event hash.
- Object-lock archive with digest and signed batch index.

Hash-chain example:

```python
event_hash = sha256(
    canonical_json(event_without_hashes)
    + previous_event_hash
)
signed_batch_root = sign(merkle_root(event_hashes))
```

An integrity mechanism must define canonical serialization, key custody, verification schedule, broken-chain response, archive transfer, and correction behavior. A corrected business fact should be a new linked event, not a mutation of the original record.

## 14.9 Safe serialization and artifact loading

The reference model is loaded with joblib, which uses Python object serialization. Such artifacts must be treated as executable content and loaded only from an authenticated, approved source. Production controls include:

- Store artifact digest and signature in the registry.
- Verify both before deserialization.
- Restrict the artifact bucket to the promotion identity and serving read identity.
- Pin dependency image and serializer versions.
- Scan artifacts and dependencies.
- Use an isolated loading process where practical.
- Prefer safer portable formats when compatible with required behavior.
- Reject artifacts with unexpected types, feature hashes, or metadata.

The current loader checks only filesystem existence and post-load bundle type.

## 14.10 Input security

Input controls should cover:

- Body byte limit.
- JSON depth and collection limits.
- Exact top-level schema with unknown-field rejection.
- Feature-name allowlist.
- Finite-number checks rejecting NaN and infinity.
- Per-field type, range, precision, and integer checks.
- Application, request, and idempotency-key length and character rules.
- Maximum portfolio rows and fairness rows.
- Authorized group-key vocabulary.
- Safe handling of unstructured `extra` objects.

The principal feature validator checks names and numeric Python types but does not explicitly reject booleans, which are subclasses of integers in Python. It also does not check finiteness. Production tests should include:

```json
{
  "rent_on_time_rate_12m": true,
  "avg_monthly_income_6m": 1e309
}
```

Both should be rejected under a strict numerical contract.

## 14.11 Network and platform security

Production controls include:

- TLS for all ingress and service calls; mTLS for institutional integrations where appropriate.
- Private subnets for online service and data stores.
- No public model registry or audit database endpoint.
- Egress allowlists for required dependencies only.
- Web application firewall and protocol limits at the edge.
- Container image signing, vulnerability scanning, and admission policy.
- Read-only filesystem for serving containers except bounded temporary storage.
- Non-root runtime and minimal base image.
- Secrets from a managed secret store, never image layers or frontend bundles.
- Environment and tenant isolation.
- Centralized patch and dependency-management process.
- Infrastructure configuration under reviewed version control.

The reference repository does not include a deployable infrastructure definition, so these remain design requirements.

## 14.12 Browser security

The React console should be treated as a demonstration client. A production operator UI requires:

- Authenticated session with role and tenant context.
- Backend-for-frontend pattern so service credentials do not ship to the browser.
- Content Security Policy.
- Strict transport security and secure cookie policy.
- Clickjacking, referrer, MIME, and permissions headers.
- Dependency and supply-chain review.
- No applicant or feature data in analytics, error trackers, browser storage, URLs, or clipboard without a controlled action.
- Automatic session timeout and explicit logout.
- Accessible error and loading states.
- Protection against cross-site request forgery when cookie sessions are used.

The current UI keeps most state in React memory and does not intentionally write applicant data to local storage. That is a helpful default but not a complete browser privacy review.

## 14.13 Logging and telemetry

Operational telemetry should use an allowlist:

```json
{
  "event": "score_completed",
  "correlation_id": "opaque-reference",
  "tenant_id": "opaque-tenant-reference",
  "model_version": "0.0.1",
  "feature_schema_hash": "a991402390c9a9aa",
  "decision_policy_version": "policy-v1",
  "result_class": "approve",
  "latency_bucket": "bounded-category",
  "status": "success"
}
```

Do not log:

- Raw request or response body.
- Raw feature values.
- Sensitive monitoring attributes.
- Direct identifiers.
- Authentication credentials.
- Full application or request references if a shorter one-way operational token is sufficient.
- Stack traces in client-facing responses.

Metrics should cover request count, status code, latency, validation failures by safe code, model-load failures, audit-write failures, idempotency conflicts, dependency saturation, queue lag, artifact activation, and governance trigger state. Labels must be bounded to avoid high-cardinality identifiers.

## 14.14 Availability design

The serving service should be stateless and horizontally scalable. Model artifacts should be loaded into a verified local cache during startup or controlled refresh, not downloaded on every request. A registry change should activate through a bounded rollout.

Suggested activation sequence:

```text
registry publishes approved candidate
  -> controller verifies evidence and artifact
  -> canary replicas load candidate
  -> synthetic contract probes run
  -> shadow or bounded traffic evaluation
  -> rollout continues or automatically stops
  -> last-known-good pointer retained
```

Availability must not weaken governance. Returning a decision from an unverified artifact to improve uptime is not acceptable. A lender-approved review response may be the safe degraded behavior.

## 14.15 Service objectives and measurement

The dossier does not claim measured production service levels. The following are design categories that require negotiated values:

- Successful score-request availability.
- End-to-end response latency percentile.
- Model-artifact activation success.
- Audit evidence acknowledgement.
- Outcome-ingestion durability.
- Governance summary freshness.
- Monitoring cohort completion.
- Recovery-point and recovery-duration objectives for registry and evidence stores.

Each objective must define population, excluded maintenance, measurement source, error budget, alert threshold, owner, and customer impact. Averages are not sufficient; tail latency and failure-class distributions matter.

## 14.16 Rate limiting and workload isolation

The principal API has no rate limiting. Production limits should exist at tenant, credential, route, and resource levels. Portfolio and fairness workloads should not starve single-application scoring. Recommended isolation:

- Separate synchronous score pool.
- Separate asynchronous analysis workers.
- Per-tenant queues and concurrency quotas.
- Request byte and row limits.
- Back-pressure and retry-after guidance.
- Circuit breakers for registry, audit, and monitoring dependencies.

Denial-of-service controls must not cause silent partial work. A rejected portfolio job should return a clear job status without writing a misleading completed-analysis event.

## 14.17 Idempotency and duplicate control

Current decision, portfolio, fairness, explanation, and outcome writes can be duplicated by retries. Production operations should define duplicate identity:

| Operation | Recommended duplicate key |
|---|---|
| Score | tenant + idempotency key + request digest |
| Explain stored decision | tenant + decision event ID + method version |
| Portfolio analysis | tenant + cohort manifest digest + model/policy versions |
| Fairness report | cohort manifest digest + metric package version |
| Outcome | tenant + application token + outcome definition + source event ID |

Duplicate handling must return the original result or a conflict; it must not append a second logically identical record.

## 14.18 Backup, recovery, and reconciliation

The local JSONL and SQLite stores have no documented backup process. Production recovery must cover:

- Registry and approval state.
- Model and policy artifacts.
- Audit events and integrity manifests.
- Outcome and monitoring records.
- Configuration and access policy.
- Incident and change records.

Reconciliation should compare accepted score responses with durable decision events, outcome acknowledgements with stored outcomes, registry current pointers with serving-replica versions, and monitoring reports with source cohort manifests.

Example reconciliation query logic:

```text
for each accepted score response:
  assert exactly one decision event exists
  assert request, model, schema and policy versions match
  assert event integrity verifies
  assert tenant and application tokens are consistent
```

## 14.19 Model and policy rollback

Rollback is not simply copying an older file. The rollback record should establish:

- Trigger and affected population.
- Authorized decision maker.
- Previous artifact, feature contract, threshold, reason dictionary, and notice compatibility.
- Whether queued or cached requests may complete.
- Treatment of decisions already returned.
- Monitoring and borrower-remediation plan.
- Verification probes and completion evidence.

If a feature contract changed incompatibly, the previous model may not be able to consume current requests. Last-known-good compatibility must be tested before deployment.

## 14.20 Incident response

Incident categories include unauthorized access, direct-identifier ingestion, feature-data corruption, wrong model activation, threshold misconfiguration, explanation mismatch, fairness trigger, audit loss, duplicate decisions, outcome corruption, and borrower-notice defect.

Incident workflow:

1. Detect and create a correlation-scoped incident record.
2. Preserve logs, registry state, artifact digests, configuration, and evidence manifests.
3. Contain access or stop affected decision paths.
4. Determine affected tenants, applications, model/policy versions, and intervals.
5. Decide rollback, review-only mode, or service stop under named authority.
6. Reconstruct affected decisions and assess borrower or lender harm.
7. Correct data or code through governed change control.
8. Verify remediation and reconcile evidence.
9. Complete required notifications and borrower remediation under approved policy.
10. Record root cause, control failure, corrective action, owner, and closure approval.

The repository has no incident automation; this is operating design.

## 14.21 Data retention, correction, and deletion

Retention should be defined by record class, purpose, product, institution, legal requirement, contractual requirement, dispute state, and investigation hold. “Keep everything for audit” is not a sufficient policy.

Correction patterns:

- Source correction produces a new source event and invalidates or supersedes affected derived features.
- Feature correction produces a new versioned feature snapshot.
- Decision records remain immutable but can link to reconsideration or correction events.
- Outcome correction produces a new outcome event referencing the superseded event.
- Monitoring reports preserve original results and link to corrected reruns.

Deletion must account for replicas, backups, caches, derived datasets, monitoring stores, and exported evidence. Tokenized audit evidence may need to be retained while re-identification mappings are deleted under policy; that decision requires legal and governance review.

## 14.22 Monitoring operations

Operational monitoring and model monitoring are separate:

**Operational monitoring** covers availability, latency, error categories, saturation, dependency state, deployment, and security.

**Data monitoring** covers coverage, missingness, range, source mix, freshness, duplicates, reconciliation, and feature distributions.

**Model monitoring** covers score and decision distributions, calibration when outcomes mature, discrimination, threshold sensitivity, and explanation stability.

**Fairness monitoring** covers group coverage, selection, error, calibration, explanation, override, reconsideration, and outcome differences with uncertainty.

**Process monitoring** covers human-review rate, override rate and direction, notice delivery, dispute, correction, and complaint outcomes.

Every signal needs a definition, baseline, population, window, threshold, severity, owner, runbook, evidence record, and closure rule.

## 14.23 Deployment environments

Recommended separation:

| Environment | Data | Artifact policy | External access |
|---|---|---|---|
| Development | synthetic or approved de-identified fixtures | unapproved development artifacts allowed | developer only |
| Test | deterministic fixtures and generated data | test registry and contract compatibility | CI and test clients |
| Validation | governed representative evaluation data | frozen candidate artifacts | independent validation roles |
| Pilot | permissioned limited population | approved pilot artifact and policy | named pilot institutions |
| Production | authorized operational data | signed and approved artifacts only | authenticated tenant clients |

Environment names, credentials, registries, audit stores, salts, and telemetry must not be shared.

## 14.24 Build and release controls

Minimum software release evidence:

- Reviewed source commit.
- Reproducible dependency lock and build image.
- Unit, integration, contract, security, privacy, accessibility, and model tests.
- Static analysis, dependency scan, secret scan, and public-content scan.
- Artifact digest and signature.
- Migration plan and rollback evidence.
- Change record with owner and approvals.
- Deployment manifest and post-deployment verification.

Model release adds dataset, feature, training, evaluation, fairness, explanation, validation, policy, and registry evidence.

## 14.25 Operational runbooks

Required runbooks include:

- Model artifact unavailable.
- Registry current pointer missing or inconsistent.
- Feature-schema mismatch.
- Audit sink unavailable or reconciliation gap.
- Sudden validation-error increase.
- Score or approval-rate shift.
- Outcome coverage below threshold.
- Fairness threshold breach.
- Explanation coverage or stability breach.
- Suspected direct-identifier ingestion.
- Credential compromise.
- Duplicate decision or outcome event.
- Wrong tenant or product scope.
- Rollback and review-only activation.

Each runbook should state trigger, severity, immediate action, decision authority, evidence to preserve, customer communication, recovery test, and closure criteria.

## 14.26 Production security acceptance criteria

The system should not be described as production-secure until independent evidence shows:

1. Strong client identity and tenant/resource authorization.
2. No long-lived service credentials in the browser.
3. Encryption in transit and at rest with managed keys and rotation.
4. Verified signed model and policy artifacts.
5. Strict request size, schema, range, and finiteness validation.
6. Pseudonymous, tenant-scoped audit joins with secret-managed keying.
7. Raw financial features and monitoring attributes absent from general logs and telemetry.
8. Durable, immutable, reconciled audit evidence.
9. Rate limiting, isolation, back-pressure, and safe retry behavior.
10. Tested backup, recovery, rollback, and incident response.
11. Dependency, container, infrastructure, and application security review.
12. Penetration testing and remediation of material findings.
13. Documented retention, correction, deletion, export, and legal-hold behavior.
14. Independent review of monitoring-enclave access and small-group protection.
15. Production change and access evidence available for examination.
