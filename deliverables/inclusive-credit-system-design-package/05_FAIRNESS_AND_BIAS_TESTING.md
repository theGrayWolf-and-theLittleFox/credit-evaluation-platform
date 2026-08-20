# 5. Fairness and Bias Testing Materials

## 5.1 Fairness objective

Fairness is a governed, context-dependent property—not a single score. The platform should seek equitable access and error behavior for legally protected and operationally relevant groups while maintaining safety, credit-risk control, explanation accuracy, and lawful data handling. Sensitive attributes should normally be excluded from prediction but may be collected in a separated, access-controlled monitoring environment when lawful and appropriate.

## 5.2 Current implemented metrics

The repository contains functions/endpoints for group counts, selection rates, true-positive rates, false-positive rates, disparate-impact-style ratios, demographic-parity difference, and equal-opportunity difference. Tests verify direct calculations and an API fairness analysis over labeled group rows.

The evidence is functional implementation evidence only. It does not demonstrate favorable real-world outcomes because inputs are synthetic or test fixtures, sample sizes are tiny in endpoint tests, and no production population is analyzed.

## 5.3 Pre-test governance checklist

- Define credit product, population, outcome, horizon, favorable decision, and operating threshold.
- Obtain legal/compliance approval for protected-class data or proxy methodology.
- Establish data separation, access roles, retention, encryption, and reporting aggregation.
- Define reference groups based on lawful analytical purpose; avoid treating majority group as inherently normative.
- Pre-register primary metrics, practical thresholds, confidence methods, intersections, and escalation rules.
- Confirm label quality/maturation and selection-bias limitations.
- Ensure small cells are suppressed or flagged and results cannot re-identify applicants.

## 5.4 Required metrics

### Allocation/outcome metrics

- Selection rate by group: approved / evaluated.
- Adverse-action rate by group.
- Selection-rate ratio and difference relative to documented reference.
- Manual-review and override rates by group.
- Terms/limit/pricing distributions where the system influences them.

### Error and opportunity metrics

- TPR/sensitivity by group among borrowers with favorable realized outcomes.
- FNR by group.
- FPR by group and related loss impact.
- Equal-opportunity difference and equalized-odds gaps.
- Positive/negative predictive value by group.

### Calibration and score quality

- Calibration curves, intercept/slope, Brier score, and observed bad rate by score band and group.
- AUC/PR-AUC by group with confidence intervals.
- Score/feature/missingness distributions by group.

### Process and explanation metrics

- Data availability/provider coverage by group.
- Reason-code frequency, coverage, contradiction, and stability by group.
- Override, appeal, reconsideration, and correction outcomes by group.
- Time-to-decision and manual-review burden by group.

## 5.5 Statistical protocol

- Report numerator, denominator, point estimate, confidence interval, and observation period for each metric.
- Use stratified/bootstrap confidence intervals or justified analytical methods.
- Flag unstable estimates; do not replace missing denominators with misleading certainty.
- Define minimum cell size and privacy suppression.
- Assess practical and statistical significance.
- Control false discovery where many groups, thresholds, features, and time windows are tested.
- Analyze intersections (e.g., age band × geography) subject to lawful use and adequate sample size.
- Repeat across train, validation, locked out-of-time test, stress scenarios, and pilot monitoring.

## 5.6 Thresholds and triggers

A selection-rate ratio below 0.80 is a common screening signal, not a universal legal safe harbor or automatic finding. Governance should use multiple metrics and context. Proposed illustrative triggers:

| Trigger | Initial action |
|---|---|
| Selection-rate ratio < 0.80 with adequate sample | Freeze promotion; investigate data, policy, threshold, and alternatives |
| Absolute TPR/FPR gap > approved tolerance | Analyze harm, uncertainty, and mitigation trade-offs |
| Material calibration gap | Recalibrate or segment only with documented justification |
| New subgroup metric deteriorates beyond control band | Incident review and possible rollback |
| Small/unstable sample | Suppress public conclusion; collect more evidence or use hierarchical methods |
| Explanation distribution changes without release | Investigate data/implementation drift |
| Provider missingness differs materially by group | Review coverage bias and alternative handling |

Final tolerances must be product-, population-, risk-, and counsel-approved.

## 5.7 Bias source taxonomy

- **Historical bias:** labels reflect past access and treatment.
- **Selection bias:** only previously approved borrowers develop repayment labels.
- **Measurement bias:** rent/utility/cash-flow coverage differs by provider or group.
- **Proxy bias:** geography, stability, or cash-flow variables may correlate with protected classes.
- **Aggregation bias:** one global model may perform poorly for subpopulations.
- **Temporal bias:** economic change affects groups unequally.
- **Automation bias:** users over-trust score/reasons and underuse review.
- **Feedback loops:** approvals determine future labels and training composition.
- **Explanation bias:** reason codes may be less actionable or accurate for certain groups.

## 5.8 Mitigation evaluation

Mitigation must begin with root cause and lawful product design. Candidate approaches:

- **Data-level:** improve provider coverage, correct quality issues, reweight samples, address missingness, collect representative outcomes, reject tainted features.
- **Feature-level:** remove/refine proxies, cap unstable variables, use monotonic transforms, document missingness treatment.
- **Training-level:** regularization, sample weights, fairness constraints, robust objectives, calibrated interpretable models.
- **Post-processing:** threshold or deferral policies only after legal review; group-specific thresholds may be prohibited or inappropriate in some settings.
- **Process-level:** manual review, additional-data pathway, reconsideration, adverse-action quality review, override monitoring.

For each mitigation compare predictive performance, calibration, selection/error metrics, uncertainty, stability, explanation quality, operational complexity, and legal risk. Never optimize one fairness metric while hiding deterioration elsewhere.

## 5.9 Fairness test cases

1. **Metric arithmetic:** known confusion matrices, zero denominators, one group, missing group, nonbinary labels, and positive-label changes.
2. **Sample stability:** bootstrap intervals at small/medium/large group sizes.
3. **Threshold sweep:** plot selection, TPR/FPR, calibration, and expected loss over plausible thresholds.
4. **Missingness:** remove each data feed and compare outcome/fairness changes.
5. **Counterfactual invariance:** where legitimate, vary only monitoring attributes and confirm identical model score; recognize proxy effects require broader analysis.
6. **Provider/geographic coverage:** compare feature availability and errors across sources and contexts.
7. **Temporal stress:** recession/income shock and payment-behavior shift.
8. **Explanation parity:** compare fidelity, top-reason stability, and code frequency across groups.
9. **Human process:** compare manual-review, override, and appeal outcomes.
10. **Regression:** approved fairness baselines become automated release checks with tolerances.

## 5.10 Fairness report template

Every version should publish:

1. Executive conclusion and approval status.
2. Intended use, population, product, dates, outcome, and threshold.
3. Data sources, protected/proxy methodology, privacy controls, sample exclusions.
4. Group counts and data-quality/missingness analysis.
5. Metrics with confidence intervals and threshold sweeps.
6. Intersectional, temporal, provider, and geographic analyses.
7. Calibration and explanation results.
8. Identified bias mechanisms and root-cause findings.
9. Mitigations tested and trade-off table.
10. Residual risks, limitations, monitoring triggers, and owners.
11. Reviewer/validator sign-off and change history.

## 5.11 Monitoring cadence

- Near real time: data-quality, missingness, score/decision distribution, service anomalies.
- Weekly during pilot: subgroup selection and manual-review rates, reason-code changes, overrides.
- Monthly or when labels mature: performance, calibration, error rates, fairness with uncertainty.
- Quarterly: governance committee review, provider coverage, appeals, thresholds, policy changes.
- Event-driven: model/data/provider/policy release, macroeconomic shock, complaint spike, suspected incident.

## 5.12 Human and borrower safeguards

Provide meaningful manual review for borderline, incomplete, or anomalous cases; clear notices; specific reason statements; additional-data and reconsideration paths; dispute/correction workflow; staff training; override documentation; and monitoring of human outcomes. Fairness testing is incomplete if it stops at the model and ignores downstream policy and operations.
