# 15. Verification, Testing, and Acceptance Reference

## 15.1 Verification strategy

The project needs two forms of verification. Software verification asks whether the code implements its declared interfaces and controls. Model validation asks whether the model, features, explanations, thresholds, and monitoring are fit for a defined credit use. Passing software tests cannot substitute for model validation, and favorable model metrics cannot substitute for secure and correct software.

The current repository provides unit and integration evidence for selected behaviors. The executed principal suite collected eleven tests, passed ten, and failed one governance expectation. The failure is preserved because a comprehensive design record should not convert an unresolved control disagreement into a passing claim.

## 15.2 Current executed commands

Principal automated suite:

```text
.venv/bin/python -m pytest -q
```

Observed summary:

```text
F..........
1 failed, 10 passed
```

Baseline training:

```text
PYTHONPATH=. .venv/bin/python scripts/train_baseline.py
```

Frontend production bundle:

```text
cd frontend
/path/to/bundled/node npm run build
```

The evidence appendix reproduces the captured outputs and machine-readable report. The commands above explain reproduction; they do not imply that every production test category exists.

## 15.3 Current test inventory

### Main end-to-end flow

`tests/test_end_to_end.py` performs the broadest implemented flow:

1. Generate 2,000 synthetic rows.
2. Train the baseline and write artifact, registry, and report files into a temporary directory.
3. Point runtime settings to those temporary artifacts.
4. Disable the SQLite mirror for isolation.
5. Call health.
6. Score one pseudonymous application.
7. Request an explanation.
8. Read the feature contract.
9. Submit a four-row fairness batch.
10. Submit a three-application portfolio.
11. Submit one observed outcome.
12. Verify an invalid outcome type returns schema failure.
13. Read audit events and verify five event classes.
14. Read the governance summary.
15. Inspect persisted JSONL to confirm the original application reference is absent.

This test is valuable because it connects training, serving, fairness, portfolio, outcomes, audit, governance, and privacy in one temporary environment.

### Fairness metric tests

`tests/test_fairness_metrics.py` verifies:

- Per-group selection-rate calculation.
- Per-group true-positive-rate calculation.
- Maximum-minus-minimum demographic-parity difference.
- Maximum-minus-minimum equal-opportunity difference.
- A group with no true-positive success can produce a zero TPR and full opportunity gap.

### Governance tests

`tests/test_governance.py` verifies:

- An empty event stream produces `insufficient_data`, zero readiness, and no passing control.
- A demographic-parity difference of `0.14` breaches the `0.10` fairness threshold and produces `review`.

### Privacy tests

`tests/test_privacy.py` verifies:

- Email-shaped references are rejected.
- Telephone-shaped references are rejected.
- Government-ID-shaped references are rejected.
- References containing a space are rejected.
- A documented pseudonymous reference is accepted.
- Hash output is stable for the same value and salt.
- The token has the expected prefix and does not contain the source value.

### FLG smoke test

`tests/test_smoke.py` trains an in-memory FLG model, serializes it to a temporary path, calls its score route with the FLG eight-feature schema, and checks score range, three-state decision membership, and audit ID presence. It is evidence for the alternate family only.

## 15.4 Unresolved governance test

The failing end-to-end assertion is:

```python
assert governance_body["overall_status"] == "passing"
```

The submitted fairness batch produces:

```text
group_a selection rate = 1.0
group_b selection rate = 0.5
demographic parity difference = 0.5

group_a true-positive rate = 1.0
group_b true-positive rate = 0.5
equal opportunity difference = 0.5
```

The governance implementation returns review whenever either absolute difference exceeds `0.10`. `review` therefore follows the current code and test data. Resolution requires one of these intentional changes:

- Change the expected state to `review` and retain the current batch.
- Change the fairness batch to values within the approved test threshold and retain the passing expectation.
- Change the governed threshold through an approved policy decision and update unit, integration, documentation, and monitoring tests.

The first option best matches the current conservative behavior, but the dossier does not alter product tests without a separate implementation request.

## 15.5 Training verification

The principal training function:

```python
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.25,
    random_state=7,
)

bundle = new_untrained_bundle(
    version=version,
    decision_threshold=decision_threshold,
)
bundle.model.fit(X_train, y_train)
y_score = bundle.model.predict_proba(X_test)[:, 1]
auc = roc_auc_score(y_test, y_score)
```

The evidence run produced ROC-AUC `0.56588288` and a scikit-learn convergence warning at the configured 200 iterations. This result is suitable only as proof that the pipeline can train and serialize a baseline. It is not competitive-performance evidence.

Missing training checks include:

- Stratified or otherwise governed split behavior.
- Duplicate entity and temporal leakage controls.
- Explicit convergence assertion.
- Feature scaling and regularization review.
- Coefficient sign and magnitude review.
- Class-balance and label-quality report.
- Calibration and threshold metrics.
- Stable seed, input snapshot, and split hashes in the report.
- Artifact digest and dependency manifest.
- Repeated-run reproducibility tolerance.
- Comparison with simple and policy baselines.

## 15.6 Unit-test specification

### Feature contract

Required cases for every field:

```text
missing
null
string
boolean
array
object
negative boundary
exact minimum
typical value
exact maximum
above maximum
NaN
positive infinity
negative infinity
```

Required contract-wide cases:

- One unknown feature.
- Many unknown features.
- Duplicate key behavior at parser boundary.
- Required field omitted with optional fields present.
- All optional fields omitted.
- Optional field explicitly null under the selected policy.
- Vector order equal to contract order.
- Schema hash changes for every decision-relevant definition change.
- Sanitization behavior distinct from rejection behavior.

### Pseudonymous references

Add tests for Unicode, leading punctuation, colon and period placement, all-numeric values, high-entropy and low-entropy references, known account-number patterns, overlong values, empty strings, trimming, and tenant-scoped hashing.

### Reason codes

Each reason needs tests immediately below, at, and above the threshold. Ranking tests should compare mixed-unit severity and enforce a documented normalization. Tests should verify the maximum count, uniqueness, stable ordering for ties, absence behavior, and full code-to-language mapping.

### Fairness metrics

Add length-mismatch tests, empty batch, one group, zero positives, missing groups, unknown labels, nonbinary values, very small cells, more than two groups, and intersections. Compare calculations with an independent implementation.

### Audit normalization

Test decision, outcome, generic, malformed JSON, missing creation value, invalid creation value, unknown event type, pagination boundaries, filters, stable identifiers, and payload allowlisting.

## 15.7 API contract tests

API tests should be generated from the OpenAPI schema and supplemented with adversarial cases.

```python
def test_unknown_top_level_field_is_rejected(client):
    response = client.post(
        "/v1/score",
        json={
            "application_id": "app_contract_001",
            "features": valid_features(),
            "unexpected": "must not be ignored",
        },
    )
    assert response.status_code == 422
```

The example above is a target test; current Pydantic models do not explicitly forbid every unknown top-level field.

Other contract tests:

- Authentication missing, correct, incorrect, expired, and wrong scope.
- Content type absent or incorrect.
- Oversized request.
- Malformed JSON.
- Stable error schema and correlation ID.
- Score response decision enumeration and score bounds.
- Request ID format and duplicate semantics.
- Feature-contract and current-model version consistency.
- Explain result tied to a stored decision.
- Portfolio row limits and partial-failure policy.
- Fairness group allowlist and minimum count.
- Outcome idempotency and correction link.
- Audit tenant isolation and bounded pagination.

## 15.8 Integration-test specification

### Training to serving

```text
governed snapshot
  -> feature build
  -> training
  -> artifact and report
  -> registry candidate
  -> approval
  -> serving activation
  -> score probe
  -> audit verification
```

Assertions should bind snapshot, split, feature, artifact, policy, reason, and decision identifiers. The current end-to-end test covers a simpler path without approval or artifact integrity.

### Score to outcome

Test one decision followed by each permitted outcome window, duplicate outcomes, corrected outcomes, unmatched tokens, and outcomes arriving before the decision read model. Verify coverage calculations and monitoring cohort inclusion.

### Score to explanation

Store one decision, request its explanation by decision ID, and verify the exact artifact and vector. Repeating the operation should return a stable result or a clearly versioned recomputation.

### Registry rollout

Run old and candidate artifacts, verify compatibility, activate canary, simulate a failing probe, and confirm rollback pointer and evidence. Verify that no replica serves an unapproved or mixed schema.

### Audit reconciliation

Generate successful and failed transactions, then prove each successful operation has exactly one required event and each failed operation has the documented failure evidence without a false completed event.

## 15.9 Model-validation test specification

### Conceptual soundness

Review target definition, prediction horizon, unit of analysis, exclusions, missingness, intended use, prohibited use, decision mapping, and cost assumptions. Challenge whether each feature is necessary and whether the good-outcome label aligns with the lender decision.

### Data integrity

Verify source authority, permission, coverage, freshness, duplicates, reconciliation, corrections, label maturity, and representation. Measure rejected and unavailable records by relevant group.

### Performance

At minimum report:

- ROC-AUC and precision-recall behavior.
- Calibration curve, calibration intercept and slope, and proper scoring rule.
- Sensitivity, specificity, positive predictive value, and negative predictive value at governed thresholds.
- Approval, review, and denial rates under the full decision policy.
- Error costs and threshold sensitivity.
- Confidence intervals and bootstrap stability.
- Comparison with policy and simple statistical baselines.

### Robustness

Test source missingness, delayed records, noisy values, provider shift, macroeconomic scenarios, threshold shift, seasonal change, population shift, extreme but valid values, and adversarial perturbations. Review monotonic behavior and local discontinuities.

### Out-of-sample and external validation

Use a genuinely held-out population or institution. The current random synthetic split is not external validation. Document all differences in source, product, population, policy, and outcome definition.

## 15.10 Explanation-validation tests

The current contribution formula is:

```python
contribution[feature] = coefficient * raw_feature_value
```

Tests should determine what claim this supports. For an unstandardized logistic model it describes a term in log-odds before adding the intercept. It is not a probability contribution. Required checks:

- Coefficient and vector order match.
- Sum of contributions plus intercept reconstructs the linear predictor.
- Documented link transforms the predictor to probability.
- Values are computed after the exact same preprocessing as inference.
- Positive/negative sign is interpreted relative to the positive class.
- Baseline and units are explained.
- Rankings are stable for small perturbations where expected.
- Reason codes reflect actual leading adverse contributions or a separately approved policy.
- Borrower language is specific, accurate, nontechnical, and actionable where appropriate.
- Explanations remain correct around threshold changes and model updates.

For more complex models, SHAP or LIME integration would require method-specific background data, sampling, randomness, stability, and approximation validation. Merely adding the library does not satisfy explainability requirements.

## 15.11 Fairness-validation tests

### Data sufficiency

Before calculating a disparity, verify group definitions, missingness, sample size, outcome maturity, provider coverage, and suppression rules. Report excluded rows and unknown group values.

### Metrics

Calculate selection, TPR, FPR, PPV, NPV, calibration, AUC, score distribution, reason frequency, review rate, override rate, reconsideration rate, and outcome differences where appropriate. Do not select one metric solely because it is favorable.

### Uncertainty

Use confidence intervals or bootstrap distributions, practical effect thresholds, repeated-window stability, and multiple-testing controls. A point estimate should not trigger an automatic mitigation without context.

### Intersectional analysis

Evaluate meaningful intersections only when data sufficiency and lawful use permit. Apply small-cell protection. Track whether aggregate parity conceals a material intersectional difference.

### Threshold sensitivity

Recalculate all relevant performance and fairness metrics across candidate thresholds. Show the trade-off surface and identify who is moved into approve, review, or deny states.

### Mitigation

For reweighting, constraints, feature changes, calibration, threshold adjustment, or deferral, compare:

```text
predictive performance
calibration
fairness metrics
uncertainty
approval and review rates
explanation fidelity
operational burden
stability under stress
residual legal and governance risk
```

## 15.12 Privacy and security tests

### Static checks

- Secret scanning.
- Dependency and license inventory.
- Known-vulnerability scan.
- Static application security analysis.
- Infrastructure-policy analysis when deployment code exists.
- Public-content scan for personal data, secrets, or restricted phrases.

### Dynamic checks

- Authentication and authorization bypass attempts.
- Tenant-isolation tests.
- Rate-limit and request-size enforcement.
- Injection and malformed serialization cases.
- Direct-identifier patterns in every string field.
- Sensitive values in application logs, reverse-proxy logs, browser console, APM, traces, and error trackers.
- Artifact replacement and digest mismatch.
- Credential rotation and revocation.
- Audit tampering and integrity verification.
- Backup restore and deleted-access validation.

### Browser tests

- Content Security Policy.
- Cross-site scripting and request-forgery protections.
- No service credential in bundled JavaScript.
- No applicant data in URL, browser storage, analytics, or referrer.
- Session expiry and logout.
- Clipboard and export controls.

## 15.13 Performance and load tests

Test dimensions:

- Single-request latency with warm and cold artifact cache.
- Sustained scoring load by tenant.
- Burst behavior and rate limiting.
- Audit sink slowdown and failure.
- Registry latency and unavailability.
- Concurrent artifact refresh.
- Large portfolio and fairness payload rejection or async handling.
- Memory growth from repeated joblib loading.
- JSONL growth and audit-read degradation.
- Governance summary behavior at the event-window bound.

The current `ModelStore` loads the model for each handler invocation through `_load_current_model`. Operating tests should measure this behavior and guide a safe verified cache.

## 15.14 Frontend functional tests

Required component and integration tests:

- Mode badge reflects adapter selection.
- Health, model, contract, threshold, and group count states.
- Contract fields render in order with correct group and required flag.
- Reset restores contract defaults and monitoring defaults.
- Score and explain buttons submit the expected payload.
- Sensitive attributes remain outside `features`.
- Loading state disables duplicate action.
- Validation errors map to the relevant field.
- Score, decision, threshold, model, schema, and reasons render together.
- Explanation signs and bars render correctly.
- Fairness sample counts and rates render with denominators.
- Portfolio size and group selection affect the request.
- Outcome requires application reference and reports success/failure accurately.
- Governance tabs preserve correct state.
- Audit filters build the expected query.
- Empty, loading, error, partial, and stale states are readable.

Mock tests must account for runtime-generated score fields and fixed reason fixtures. They should not assert semantic alignment that the adapter does not provide.

## 15.15 Accessibility tests

The document and product both need accessibility review. Product tests should cover:

- Keyboard-only navigation and visible focus.
- Logical heading structure and landmarks.
- Accessible names for inputs, buttons, tabs, status, and charts.
- Correct tab roles, selection state, and panel relationships.
- Error association and announcement.
- Color contrast and non-color status cues.
- Range and numerical input usability.
- Table headers and responsive overflow.
- Screen-reader interpretation of scores, thresholds, contribution direction, and group rates.
- Zoom and reflow.
- Reduced-motion preference.

The current UI includes several helpful labels and ARIA roles, but no completed conformance report is present.

## 15.16 Human-factors tests

Model and interface correctness depends on operator understanding. Structured tests should ask whether lending and governance users can:

- Distinguish score from final lender action.
- Identify model and threshold used.
- Recognize mock mode.
- Explain why protected attributes are separated.
- Interpret group counts before rate differences.
- Distinguish model contributions from borrower reason codes.
- Find the human-review and dispute path.
- Reconstruct a decision from audit evidence.
- Respond correctly to a fairness review state.
- Avoid treating roadmap fixtures as operating evidence.

Borrower research should test comprehension, perceived actionability, dispute discovery, language access, disability access, and whether explanations create false certainty.

## 15.17 Evidence package tests

The technical dossier itself has reproducibility checks:

```text
shasum -a 256 -c evidence/SCREENSHOT_MANIFEST.sha256
unzip -t Inclusive_Credit_Platform_Technical_Dossier.docx
```

Additional document checks should verify:

- Every source section is included once.
- Every architecture diagram has PNG, SVG, and Mermaid source.
- Every screenshot has alt text and a matching manifest entry.
- No dates or times appear when the submission requires their omission.
- No hidden document creation or modification metadata remains.
- Code blocks fit within page margins.
- Tables repeat headers and rows do not split awkwardly.
- Headings form a valid hierarchy.
- Page numbers, header, cover, and contents are consistent.
- Every evidence claim links to a repository source, test, artifact, or explicitly labeled target design.

## 15.18 Release acceptance gates

### Gate 1 — Contract integrity

Pass only when one canonical feature and API contract exists, all clients agree, all bounds and missingness rules are enforced, and full-definition schema hashes match the artifact.

### Gate 2 — Model evidence

Pass only when training converges, reproducibility is proven, predictive and calibration performance meet approved criteria, and an independent validator resolves material findings.

### Gate 3 — Fairness and explanation

Pass only when representative cohort analysis, uncertainty, threshold sensitivity, mitigation trade-offs, and explanation/notice fidelity are approved.

### Gate 4 — Security and privacy

Pass only when client identity, tenant authorization, secret handling, request validation, pseudonymization, artifact integrity, telemetry minimization, and penetration findings are approved.

### Gate 5 — Audit and operations

Pass only when required events are durable, immutable, reconciled, queryable under access control, retained under policy, and recoverable under tested procedures.

### Gate 6 — Product and borrower safeguards

Pass only when operator workflows, human review, override, notice, dispute, correction, accessibility, and support procedures work end to end.

### Gate 7 — Controlled deployment

Pass only when a limited, approved population can be monitored, stopped, rolled back, investigated, and remediated with named owners and preserved evidence.

## 15.19 Acceptance evidence matrix

| Evidence category | Current repository evidence | Still required for production |
|---|---|---|
| Build | Python package, frontend build, local artifacts | Locked reproducible images and signed release |
| Feature contract | Names, ordering, hash, UI metadata | Full definitions, enforced bounds, missingness, provenance |
| Model | Synthetic logistic baseline and ROC-AUC | Convergence, calibration, performance, external validation |
| Explanation | Linear proxy and heuristic reasons | Fidelity, stability, notice mapping, human testing |
| Fairness | Basic selection and opportunity metrics | Representative data, uncertainty, intersections, mitigation validation |
| Privacy | Pseudonymous validator, hashing, defaults | Tenant tokens, managed keys, full data-flow and retention controls |
| Security | Optional API key | Strong identity, authorization, hardening, testing |
| Audit | JSONL, optional SQLite, read API | Immutability, integrity, durable acknowledgement, reconciliation |
| Governance | Four coverage controls and review state | Scoped monitoring, approval workflow, owners and evidence links |
| Product | Twelve local screen captures | Live integration, accessibility, user research, lender workflow |
| Operations | Error handling and local startup | SLOs, scaling, runbooks, backup, recovery, incidents |

## 15.20 Definition of comprehensive project completion

The project is comprehensively evidenced when a reviewer can start from any decision and trace backward to the lender request, permissioned sources, data snapshot, feature definitions, transform version, model artifact, threshold policy, reasons, validation, approval, and audit event; then trace forward to notice, review, outcome, monitoring, fairness evaluation, complaints, corrections, and any model or policy change. Each link must be implemented, access-controlled, versioned, tested, and supported by retained evidence.

The current repository establishes a meaningful reference implementation and design foundation. The verification record also shows the boundary plainly: synthetic data, one low-performing baseline run with a convergence warning, one unresolved test expectation, multiple overlapping implementation families, local storage, optional demonstration authentication, and fixture-backed governance views. These are not reasons to discard the work. They are the specific engineering items the next controlled iteration must close.
