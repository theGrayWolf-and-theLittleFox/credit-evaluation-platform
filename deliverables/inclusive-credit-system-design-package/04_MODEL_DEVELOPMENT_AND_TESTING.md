# 4. Model Development and Testing Documentation

## 4.1 Current model-development evidence

The demonstrated training pipeline generates synthetic alternative-data records, separates features and a binary good-outcome label, fits a scikit-learn logistic-regression baseline, computes ROC-AUC, serializes the model, records a feature-schema hash, writes a JSON report, and updates the current model registry. The evidence run produced:

- Model: `sklearn_logreg_baseline`
- Version: `0.0.1`
- Feature-schema hash: `a991402390c9a9aa`
- Decision threshold: `0.5`
- ROC-AUC: `0.56588288`
- Data: synthetic/demo only
- Warning: `lbfgs` reached the 200-iteration maximum without convergence

This is valid demonstration evidence, not evidence of production model fitness. An AUC only modestly above random and an unresolved optimization warning require investigation before further claims.

## 4.2 Required development protocol

### Problem formulation

Document the decision being supported, target population, credit product, outcome definition, performance horizon, unit of analysis, observation window, exclusion rules, policy decision, and costs of false approval/false denial. Confirm the model supports rather than silently replaces lender policy.

### Data acquisition and governance

For every source record data owner, provider, consent/authorization, permissible purpose, collection method, coverage, time range, refresh cadence, retention, known errors, dispute mechanism, and protected/proxy relationships. Freeze immutable development snapshots and produce row/feature reconciliation counts.

### Data-quality tests

- Schema/type, allowed range, uniqueness, and required-field checks.
- Missingness overall and by subgroup/time/provider.
- Duplicate, stale, conflicting, and future-dated records.
- Distribution shift and provider-specific anomalies.
- Label completeness, censoring, maturation, and correction.
- Leakage checks, including post-decision information and target-derived fields.
- Outlier handling and transform stability.

### Sampling and splits

Use borrower-level separation to prevent entity leakage. Prefer time-based development, validation, and out-of-time test sets; reserve a locked test set. Where lender/provider/geography generalization matters, conduct leave-one-context-out tests. Record seed and split hashes.

### Feature development

Each feature requires business rationale, formula, units, lookback, missing policy, expected direction, stability analysis, correlation/redundancy review, proxy-risk assessment, reason-code mapping, and version. Fit preprocessing only on training data. Review monotonic constraints for features where a direction is economically and legally expected.

### Candidate models

At minimum compare:

- Policy-only or simple statistical benchmark.
- Regularized logistic regression baseline.
- Monotonic generalized additive model where appropriate.
- Tree ensemble candidate with constraints and explainability review.
- Fairness-constrained candidate if justified.

Complex models must deliver material, stable benefit after calibration and fairness/explanation costs. Neural networks should not be introduced merely for novelty.

## 4.3 Evaluation metrics

### Predictive performance

- ROC-AUC and precision-recall AUC with confidence intervals.
- Brier score and log loss.
- Calibration intercept/slope and reliability curves.
- Sensitivity/specificity, false-positive/false-negative rates at operating thresholds.
- Approval rate, bad rate, expected loss, and error cost by policy band.
- Lift/gain by score decile.

### Stability and robustness

- Metrics by time, lender, data provider, geography, product, score band, thin-file depth, and missingness pattern.
- Population/feature drift using PSI, Jensen-Shannon divergence, KS or approved alternatives.
- Sensitivity to plausible perturbations, rounding, missing feeds, provider outage, and threshold shifts.
- Macroeconomic scenarios: unemployment/income shocks, payment deterioration, volatility increase, and label delays.
- Bootstrap confidence intervals and small-sample warnings.

### Explainability quality

- Local fidelity to the scored model.
- Sign correctness and stability under small perturbations.
- Top-reason completeness and duplication rate.
- Consistency across equivalent inputs.
- Human readability and borrower comprehension.
- Reason-code coverage and mapping approval.

## 4.4 Automated test evidence

The review executed `.venv/bin/python -m pytest -q` across eleven collected tests. Result: **10 passed and 1 failed**. The failure is a test-expectation mismatch in `tests/test_end_to_end.py`: the test expects `overall_status == "passing"`, but the governance service returns `review` because the supplied fairness rows exceed the configured 0.10 parity and opportunity thresholds. The implementation and the test must be brought into agreement before the suite can be described as passing. The same flow emitted a scikit-learn convergence warning after reaching `max_iter=200`.

Covered behaviors include:

- `flg` model training, artifact save/load, API score response, decision state, and audit ID.
- `ice` synthetic data generation and training.
- Model registry/report/artifact creation.
- API health, scoring, explanation, published feature contract.
- Fairness endpoint group metrics and counts.
- Portfolio analysis over multiple applications.
- Direct fairness metric calculations.
- Privacy redaction and governance-summary control behavior.

Not demonstrated by the current suite:

- Authentication failure/success, role/tenant isolation, replay/rate limiting.
- Malformed fields, all feature range boundaries, NaN/infinity, oversized payloads.
- Audit-store failure and recovery, concurrency, corruption, integrity sealing.
- Explanation correctness/stability and legal reason-code semantics.
- Calibration, subgroup confidence intervals, intersectional fairness, mitigation.
- Model artifact signature/digest verification or malicious artifact handling.
- Load, soak, failover, backup/restore, penetration, dependency, and accessibility testing.

## 4.5 Test pyramid and required suites

### Unit tests

Feature definitions and transforms; decision thresholds; reason-code ordering; fairness equations and zero denominators; redaction recursion; audit serialization; configuration validation; registry promotion; error mapping.

### Contract tests

OpenAPI snapshot compatibility; JSON request/response golden cases; feature-schema hash compatibility; model artifact/runtime compatibility; audit-event schema evolution; reason-code dictionary versioning.

### Integration tests

Train → register → approve → load → score → explain → audit → ingest outcome → monitor. Exercise real database/object-store substitutes, authentication middleware, retries, and failure injection.

### Model tests

Reproducibility; convergence; leakage; performance/calibration; subgroup metrics; uncertainty; stability; stress scenarios; explainability fidelity; challenger comparison; threshold trade-offs.

### Security and privacy tests

SAST/SCA/secret scanning; API fuzzing; authn/authz/tenant tests; request-size and rate-limit tests; injection/schema abuse; log/trace PII scans; artifact tampering; dependency/image scans; penetration test.

### Operational tests

Load/soak, autoscaling, audit back-pressure, model hot/cold load, zone failure, rollback, backup restore, monitoring alert delivery, on-call runbooks.

### User and accessibility tests

Underwriter task completion; compliance review reconstruction; borrower comprehension; keyboard navigation; screen-reader semantics; contrast; responsive layouts; multilingual content review.

## 4.6 Release gates

| Gate | Required evidence | Approver |
|---|---|---|
| Data readiness | lineage, consent, quality, leakage, representativeness | Data owner + compliance |
| Development complete | reproducible artifact, code review, metrics, model card | Model development lead |
| Fairness review | subgroup results, uncertainty, mitigation analysis | Fair-lending / responsible-AI lead |
| Independent validation | challenge report and closed critical findings | Independent validator |
| Security readiness | threat model, pen test, scans, remediation | Security lead |
| Compliance readiness | intended use, feature/reason review, notices | Compliance/legal |
| Pilot readiness | controls, training, monitoring, rollback, support | Product/risk committee |
| Production promotion | signed approvals and immutable artifact reference | Authorized governance committee |

## 4.7 Convergence-warning remediation plan

1. Reproduce with fixed data/split and capture iteration count, gradient/solver status, coefficients, and scale.
2. Confirm preprocessing actually standardizes all continuous features and handles constant/near-constant columns.
3. Increase `max_iter` only after diagnosing; compare solvers and regularization strengths.
4. Check multicollinearity, separation, class balance, extreme values, and numerical precision.
5. Require successful convergence as a training gate; fail the pipeline instead of publishing a warning artifact.
6. Re-run performance, calibration, coefficient stability, explanation, and fairness tests after correction.

## 4.8 Model-card minimum content

Model identity/version; owner; intended users/use; prohibited uses; population/product/geographies; training/validation data; features; target/horizon; algorithms/hyperparameters; performance/calibration; subgroup/fairness results; explanation method; thresholds; limitations; security/privacy considerations; monitoring triggers; retraining criteria; validation findings; approval signatures; change history.
