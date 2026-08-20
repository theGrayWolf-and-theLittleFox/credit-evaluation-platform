# 9. Product Demonstration and Operator Walkthrough

The React console in `frontend/` was run locally and reviewed screen by screen. The captures below show the implemented navigation, input, result, explanation, fairness, portfolio, borrower-rights, outcome, audit, and governance views. They are product evidence, but only for the local mock-mode interface; no real applicant record or production lending service was used.

## Demonstration environment

The console is a Vite and React application backed by a typed API client. When `VITE_API_BASE_URL` is absent, empty, or set to `mock`, the client selects the local mock adapter. That adapter reuses the frontend's production request and response types, but it is not a full simulation of the FastAPI service. Model, contract, fairness, governance, portfolio, and audit panels are fixture-backed. The scoring function also generates the score, decision, request ID, and `created_at` value at runtime. Mock mode is therefore useful for interface review, but not for reproducibility, model-fidelity, persistence, or audit claims.

One visible difference matters during review: the mock model card reports version `0.1.0`, while the reproducible training evidence in Appendices B and C reports version `0.0.1`. The former is a frontend fixture; the latter is the model produced by the documented training command.

```text
cd frontend
npm install
npm run dev
```

The navigation bar displays the active execution mode. Before interpreting a result, an operator should confirm the API status, model version, feature-contract count, and decision threshold shown in the status cards.

| Visible control | Operator check | System source |
|---|---|---|
| Mode badge | Confirm `mock` for demonstrations or `live` for an approved API environment | `USE_API` selection in `frontend/src/lib/api.ts` |
| API status | Confirm the service is available before submitting a request | Health-query result |
| Active model | Record the model version associated with the decision | Model metadata endpoint or mock adapter |
| Feature contract | Confirm the number of active scored inputs | Feature-contract response |
| Decision threshold | Confirm the approval boundary used for the session | Active feature contract |

## Demonstration screen 1 — Product entry point and runtime status

![Product dashboard showing the OpenCredit Commons navigation, alternative-data positioning, API status, active model, feature-contract count, and decision threshold.](screenshots/01-product-overview.jpg)

The landing view gives the operator a quick orientation before any scoring action. In live mode, the four cards identify the service state, model artifact, input contract, and threshold used downstream. In the captured mock session, those values come from fixtures and should be read as layout and workflow evidence. The `Open decision lab` action moves directly to the contract-driven scoring workbench.

Operator procedure:

1. Verify the mode badge in the navigation bar.
2. Confirm the API status reads `OK`.
3. Record the active model version and feature-contract count.
4. Confirm the displayed threshold matches the approved operating configuration.
5. Select `Open decision lab` to begin a demonstration request.

## Demonstration screen 2 — Contract-driven applicant input

![Decision workbench showing the model contract, application identifier, scoring actions, and the beginning of the alternative-data input groups.](screenshots/02-decision-input.jpg)

The decision workbench is generated from the feature-contract response instead of a separately maintained list of form fields. Each definition supplies the field name, label, description, minimum, maximum, step size, default value, requirement flag, and directional interpretation. This reduces the chance that the browser form drifts from the published schema. It does not by itself prove that the backend enforces every displayed bound; the current scoring path performs only limited range sanitization.

The input workflow separates three data classes:

- `application_id` identifies the request in the user workflow. In the FastAPI path, configured audit settings replace it with a pseudonymous reference before persistence. The mock adapter does not create a production audit record.
- `features` contains scored alternative-data signals such as payment history, verified cash flow, risk events, and stability indicators.
- `sensitive_attributes` is optional monitoring context. It is passed to authorized fairness-monitoring paths and is not used to calculate the applicant score.

Operator procedure:

1. Confirm the model, version, threshold, and schema chips above the form.
2. Enter a non-sensitive application reference for a demonstration.
3. Review each contract-generated feature value and its allowed range.
4. Use `Explain only` when validating contribution behavior without treating the response as a final decision.
5. Use `Score applicant` to submit the complete typed payload.
6. Use `Reset defaults` before starting a separate demonstration scenario.

## Demonstration screen 3 — Scored decision and borrower-readable output

![Completed mock decision showing an approval score, threshold, reason codes, and the borrower-transparency preview with plain-language factors.](screenshots/03-scored-decision.jpg)

The result panel places the numerical score, decision threshold, decision label, model version, and reason codes in one view. The adjoining borrower-transparency panel translates reason-code fixtures into plain-language factors and suggested next steps. The interface also states that protected characteristics are not used to generate the score and exposes a human-review path. In mock mode, the score and decision are generated at runtime while the reason codes come from a fixed fixture, so this screen does not establish explanation fidelity.

Interpretation rules:

- The numerical score is evaluated against the displayed threshold; the decision label should never be interpreted without both values.
- In the FastAPI path, reason codes are generated from submitted feature values. Their fidelity and stability still need dedicated tests across API, audit, and notice-generation layers.
- Borrower-facing language is an explanation surface, not a substitute for jurisdiction-specific adverse-action review.
- A demonstration approval is synthetic evidence of interface behavior, not an underwriting recommendation.

## Demonstration screen 4 — Explanation and subgroup fairness review

![Explainability panel with signed feature contributions beside a fairness monitor containing group sample sizes, selection rates, and outcome rates.](screenshots/04-explainability-fairness.jpg)

The explanation panel ranks feature contributions by absolute magnitude. Positive bars increase the model output relative to the local baseline; negative bars reduce it. The panel displays the application reference and its own explanation request ID. A production audit design should also carry an explicit link to the scored decision being explained; the current response contract does not expose that parent request ID.

The fairness panel displays a synthetic batch with protected-group labels, predicted outcomes, and observed labels. In live mode, `Run fairness report` sends those rows to `/v1/audit/fairness`, where the service calculates demographic-parity and equal-opportunity differences, group counts, selection rates, and true-positive rates. In mock mode, the button returns a fixed fairness fixture. The batch controls remain visible so a reviewer can see the intended workflow without mistaking the fixture for deployment evidence.

Review sequence:

1. Run `Explain only` and confirm that all expected feature contributions are returned.
2. Check the sign and relative magnitude of the leading contributions against the submitted feature values.
3. Inspect the group sample size before interpreting a rate.
4. Run the fairness report and compare the parity metrics with the documented review thresholds.
5. Investigate any group with low support, unstable rates, or a threshold breach before model promotion.

## Demonstration screen 5 — Portfolio analysis workbench

![Portfolio analysis results showing average score, approval rate, application count, threshold, leading reason codes, score-band mix, and a cohort preview.](screenshots/05-portfolio-analysis.jpg)

The portfolio workbench is designed to evaluate a cohort against one model contract and threshold. The operator can choose the demonstration cohort size and the protected attribute used only for aggregated monitoring. In live mode, the API scores the submitted applications; in mock mode, the panel slices a prepared portfolio fixture to the requested size. Results combine decision statistics, reason-code frequency, score-band distribution, and a small row-level preview.

The portfolio summary is intended for operational review rather than individual adjudication. A high-frequency reason code may indicate a cohort characteristic, a feature-quality problem, a data-source shift, or a threshold interaction. It should trigger analysis against lineage and data-quality evidence before any policy change.

## Demonstration screen 6 — Governance lineage and audit evidence

![Governance center showing the decision-lineage stages, control readiness, observed-outcome workflow, and audit explorer.](screenshots/06-governance-lineage.jpg)

The governance center presents the evidence chain a production system would use to reproduce a decision: permission, source connection, validation, versioned features, and the final scored decision. Adjacent controls show how repayment outcomes and governed model updates would be connected. In the captured session, the lineage, control coverage, and audit rows are fixtures. The audit explorer can filter those fixture rows by type and application reference; the live API path queries the append-style JSONL store.

An operator reviewing a questioned decision should follow the lineage from right to left:

1. Identify the decision event and model version.
2. Resolve the feature-schema version used by that model.
3. Confirm validation status for the submitted feature set.
4. Trace each feature to its connected source and transformation.
5. Confirm the applicable consumer permission and permissible-purpose evidence.
6. Preserve the request, explanation, outcome, and governance events as one review package.

## Demonstration screen 7 — Complete alternative-data feature contract

![Alternative-data input grid showing payment-history, cash-flow, risk-event, and stability groups with values, ranges, requirement flags, and directional interpretation.](screenshots/08-feature-contract-inputs.jpg)

The expanded input grid makes the feature contract inspectable at the point of use. Each card shows the human-readable definition, current value, permitted control range, whether the signal is required, and the expected monotonic direction. The four groups correspond to separate engineering and review concerns:

- Payment history represents observed rent and utility performance over a defined lookback period.
- Cash flow represents verified income, balance, and volatility aggregates rather than raw transaction narratives.
- Risk events represent bounded counts such as NSF and overdraft events.
- Stability represents optional tenure indicators that require separate proxy-risk and necessity review.

The monitoring attributes beneath the scored grid are visually separated from prediction inputs. A production implementation must preserve that separation in the API schema, feature transformer, model vector, logs, and access-control policy.

## Demonstration screen 8 — Borrower rights and reconsideration path

![Borrower-transparency view showing the eligibility result, ranked plain-language factors, human-review availability, data-access rights, and dispute options.](screenshots/07-borrower-rights.jpg)

Selecting `View your rights` expands the reconsideration notice without leaving the decision context. The notice states that the borrower can request the data used in the review, dispute inaccurate source information, obtain the specific reasons that most affected the decision, and request human review. The interface is intentionally explicit that this is a demonstration notice; production language requires counsel approval, lender policy integration, delivery evidence, and jurisdiction-specific testing.

## Demonstration screen 9 — Populated decision and fairness summary

![Decision summary showing the approval score and reason codes beside demographic-parity, equal-opportunity, group-count, and selection-rate results.](screenshots/12-decision-fairness-summary.jpg)

This view joins an individual model result with a separately calculated cohort-monitoring snapshot. The pairing is useful for reviewers, but the data paths must remain distinct: an applicant's protected attributes do not enter the score, while aggregated protected-group labels are required to evaluate selection and outcome differences. The interface includes group counts alongside rates because a parity value without denominator context is not reviewable evidence.

## Demonstration screen 10 — Observed-outcome feedback

![Outcome feedback panel showing the scored application reference, observation window, verified repayment result, append-only event action, and successful governance refresh.](screenshots/09-outcome-feedback.jpg)

The outcome workflow shows how a prior decision can be linked to later verified performance. The operator selects an observation window and records a binary result. The mock adapter returns `status: ok`, after which the UI refetches its governance query; it does not persist an outcome or recalculate governance metrics. The live FastAPI path appends an outcome event. A production implementation would also need source provenance, correction handling, late-arriving-event policy, access controls, retention rules, and an immutable link to the original decision event.

## Demonstration screen 11 — Continuous monitoring signals

![Governance monitoring view showing feature drift, calibration gap, parity difference, explanation stability, control state, and bounded signal bars.](screenshots/10-governance-monitoring.jpg)

The monitoring tab presents four control families instead of collapsing them into one health score. In the current frontend, the displayed values are fixtures. The intended interpretation is still useful: feature drift concerns input-distribution change, calibration gap compares predictions with observed outcomes, parity difference tracks subgroup selection behavior, and explanation stability tracks unexpected changes in contribution patterns. A connected implementation needs a population window, baseline, threshold, severity, owner, and escalation runbook for each signal.

## Demonstration screen 12 — Governance control register

![Governance control register showing displayed evidence coverage and control rows for data rights, lineage, subgroup evaluation, explanation review, and audit capture.](screenshots/11-governance-controls.jpg)

The control register shows the intended link between operating evidence and named governance controls. The header strip summarizes explanation coverage, observed-outcome coverage, fairness review, and audit capture. Control rows identify the domain, accountable function, required evidence, and readiness state. The captured values are fixtures. A production register must replace them with queryable evidence identifiers and require recorded approval before a control can move from review or planned to ready.

## End-to-end demonstration script

1. Start the frontend and confirm the `mock` mode badge.
2. Record the status-card values shown on the landing screen.
3. Open the decision lab and retain the default synthetic feature values.
4. Submit `Score applicant` and reconcile the score with the visible threshold.
5. Review the returned reason codes and borrower-readable factors.
6. Submit `Explain only` and compare contribution direction with the feature definitions.
7. Run the synthetic fairness report and inspect group counts before rate differences.
8. Run the portfolio analysis and examine leading reason-code concentration.
9. Open `Governance`, select `Decision lineage`, and trace the evidence stages.
10. Use the audit explorer to confirm that the expected fixture event categories are visible. Repeat the workflow in live mode when validating newly persisted events.

## Demonstration limitations

- The screenshots use synthetic features and fixture-backed mock views. Some scoring fields are generated at runtime, so separate mock runs are not bit-for-bit identical.
- Mock scoring does not prove that the displayed reason codes explain the generated score or decision.
- Mock fairness, governance, monitoring, portfolio, and audit values are presentation fixtures unless a section explicitly cites the live API evidence run.
- No production data source, consumer-permission service, lender identity system, or adverse-action delivery channel is connected.
- Displayed model metrics are demonstration fixtures unless independently reconciled with the evidence appendices.
- Regulatory alignment labels describe the control design intent; they do not constitute legal approval or production certification.
- The interface is evidence of implemented product behavior, while production readiness still depends on security review, independent validation, accessibility testing, and deployment-specific compliance approval.
