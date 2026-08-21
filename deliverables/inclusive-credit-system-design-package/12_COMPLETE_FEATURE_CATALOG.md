# 12. Complete Feature and Product Capability Catalog

## 12.1 Catalog scope

The word “feature” is used in two ways in this project. A model feature is a numerical input to the credit model. A product feature is a user-visible or operator-facing capability such as scoring, explanation, portfolio analysis, or audit review. This section documents both. The model-feature dictionary covers the nine fields in the principal `src/ice` contract. The product catalog covers every principal API and React workflow visible in the reviewed repository.

The current feature contract is compact:

```python
DEFAULT_CONTRACT = FeatureContract(
    required=(
        "rent_on_time_rate_12m",
        "utility_on_time_rate_12m",
        "avg_monthly_income_6m",
        "cashflow_volatility_6m",
        "avg_daily_balance_6m",
        "nsf_events_12m",
        "overdraft_events_12m",
    ),
    optional=(
        "months_at_current_job",
        "months_at_current_address",
    ),
)
```

The contract hash is calculated from required and optional names. It does not include descriptions, units, bounds, lookback definitions, defaults, group labels, or transformations. Any change to those properties can therefore leave the current hash unchanged. A production hash must cover the full canonical definition.

## 12.2 Feature groups

| Group | Principal fields | Intended behavioral concept | Principal review risk |
|---|---|---|---|
| Payment history | Rent and utility on-time rates | Repeated payment performance outside a traditional credit file | Coverage, dispute rights, reporting errors, provider differences |
| Cash flow | Average income, volatility, average balance | Capacity, consistency, and liquidity buffer | Income definition, account coverage, seasonality, benefits, volatility construction |
| Risk events | NSF and overdraft counts | Recent liquidity stress events | Fee policy, duplicate events, reversals, institution practices |
| Stability | Job and address tenure | Optional continuity indicators | Proxy discrimination, housing mobility, gig work, necessity and explainability |

Sensitive monitoring attributes are not model features. `age_band`, `race_ethnicity`, `sex`, and any additional string-valued entries are carried in a separate object. The principal vectorizer never reads that object.

## 12.3 Rent on-time rate over the twelve-month window

**Canonical name:** `rent_on_time_rate_12m`
**Status:** required
**Group:** payment history
**Type:** numeric, represented as a float
**Published range:** 0.0 to 1.0
**Published step:** 0.01
**Demo default:** 0.94
**Directional hint:** higher is better

The value is intended to represent the share of observed rent obligations paid on time during the defined twelve-month lookback. The repository does not implement raw rental-record ingestion or the aggregation formula. The synthetic generator samples a high-on-time-rate beta distribution. The frontend and API metadata describe the concept; production source reconciliation remains future work.

Recommended production definition:

```text
eligible_obligation = scheduled rent obligation
                      with verified due value
                      and an observable settlement window

on_time_obligation = eligible obligation
                     settled in full on or before
                     the governed grace boundary

rent_on_time_rate_12m =
  count(on_time_obligation in lookback)
  / count(eligible_obligation in lookback)
```

The definition must state how it treats partial payments, split payments, grace periods, late fees, landlord corrections, rent assistance, disputed obligations, leases shorter than the lookback, and months with no eligible observation. A value of zero must not be used to mean “no rental file.” Missing coverage should remain missing with a separate coverage field.

Current processing:

- `FeatureContract.validate` requires the field and checks that the value is numeric.
- `sanitize_features` clamps it to `[0, 1]` rather than rejecting an out-of-range value.
- `to_model_vector` places it first.
- Synthetic label generation increases risk when the value is below `0.92`.
- The heuristic reason map emits `RC_LOW_RENT_ON_TIME` when the value is below `0.92`.
- The API publishes a range slider and numerical field.
- The explanation proxy may return a coefficient contribution under the same field name.

Reason logic:

```python
if rent < 0.92:
    scored.append((
        "RC_LOW_RENT_ON_TIME",
        0.92 - rent,
    ))
```

Validation requirements include numerator/denominator reconciliation, minimum observed obligations, provider-level distribution review, late-report correction handling, duplicate lease detection, and comparison of included versus excluded applicants. Fairness review should examine rental-market coverage, household structure, subsidized housing, geographic proxy risk, and differential reporting access.

## 12.4 Utility on-time rate over the twelve-month window

**Canonical name:** `utility_on_time_rate_12m`
**Status:** required
**Group:** payment history
**Type:** numeric float
**Published range:** 0.0 to 1.0
**Published step:** 0.01
**Demo default:** 0.91
**Directional hint:** higher is better

This feature is intended to summarize payment performance for eligible utility obligations. The repository does not specify which utilities qualify, how joint accounts are attributed, or how variable billing and assistance programs are handled.

Recommended production calculation:

```text
utility_on_time_rate_12m =
  sum(on_time_eligible_utility_obligation)
  / sum(eligible_utility_obligation)
```

Eligibility should be defined by source, account ownership or authorization, service category, payment-verification quality, observation coverage, and dispute state. The system should not mix telecommunications, energy, water, and subscription services without documenting whether their reporting and consumer-protection characteristics are comparable.

Current processing mirrors the rent feature:

- Required and numeric under the main contract.
- Clamped to `[0, 1]`.
- Second in the principal vector.
- Synthetic risk rises below `0.92`.
- `RC_LOW_UTIL_ON_TIME` is generated below `0.92`.
- UI metadata publishes the description, bounds, step, default, group, and direction.

The alternate FLG and MIE families use `utilities_on_time_rate_12m` and `utilities_on_time_ratio_12m`. The pluralization and `rate`/`ratio` difference illustrate why one canonical dictionary and migration alias table are required.

Production tests should cover multi-provider households, closed accounts, account transfers, estimated bills, deferred payment plans, outage credits, assistance payments, disputes, and months with no bill. Group analysis should measure data availability as well as model outcomes; a feature cannot expand inclusion if access to the underlying data is uneven.

## 12.5 Average verified monthly income over six months

**Canonical name:** `avg_monthly_income_6m`
**Status:** required
**Group:** cash flow
**Type:** numeric float
**Published range:** 0 to 15,000
**Published step:** 50
**Demo default:** 4,200
**Directional hint:** higher is better

The field is intended to represent average verified inflow classified as income. The repository uses a synthetic lognormal distribution and does not implement transaction classification, account linking, source verification, or currency normalization.

Recommended calculation design:

```text
monthly_verified_income[m] =
  sum(eligible positive inflows
      classified as income
      and not internal transfers
      for complete month m)

avg_monthly_income_6m =
  mean(monthly_verified_income[m]
       for eligible complete months)
```

The definition must handle payroll, self-employment, public benefits, retirement income, alimony or support where lawful and elected, cash deposits, refunds, transfers, reversals, reimbursements, multi-account duplication, and partial-month coverage. “Verified” should identify the verification source and confidence rather than implying that classification is error-free.

Current processing:

- Required and numeric.
- No current main-path backend range rejection or clamping.
- Third in the model vector.
- Synthetic risk rises below 3,000.
- `RC_LOW_INCOME` is generated below 3,000 and ranked using the raw currency-unit difference.

```python
if income < 3000:
    scored.append(("RC_LOW_INCOME", 3000 - income))
```

Because the reason ranking compares raw magnitudes across different units, a currency gap can dominate rate or count gaps even when the model contribution is smaller. Production reason selection should normalize severity or use validated model contributions and policy mapping.

Data-quality controls should reconcile daily totals to source statements, detect internal transfers, retain classifier version, quantify unclassified inflows, and require coverage thresholds. Fairness analysis should consider employment structure, benefits, income volatility, tipped work, gig work, seasonal work, language access, and unequal account-linking rates.

## 12.6 Cash-flow volatility over six months

**Canonical name:** `cashflow_volatility_6m`
**Status:** required
**Group:** cash flow
**Type:** numeric float
**Published range:** 0.0 to 1.5
**Published step:** 0.01
**Demo default:** 0.24
**Directional hint:** lower is better

This field is described as normalized recent cash-flow volatility. The exact formula is not implemented in the principal repository. The synthetic generator samples a beta distribution and the risk formula penalizes values above `0.25`.

One defensible normalized design is:

```text
net_cashflow[m] = eligible inflows[m] - eligible outflows[m]

cashflow_volatility_6m =
  robust_scale(net_cashflow across eligible months)
  / max(robust_location(abs(net_cashflow)), floor)
```

The design must choose daily versus monthly observations, standard deviation versus median absolute deviation, handling of near-zero denominators, treatment of transfers, winsorization, seasonal adjustment, and minimum coverage. It must also state whether negative cash flow and volatility are separate signals.

Current behavior:

- Required and numeric.
- Not clamped or fully range-validated by the main path.
- Fourth in the vector.
- Synthetic risk rises above `0.25`.
- `RC_HIGH_CASHFLOW_VOL` is emitted above `0.25`.
- The demo reason description states that higher volatility increases repayment uncertainty.

```python
if vol > 0.25:
    scored.append((
        "RC_HIGH_CASHFLOW_VOL",
        vol - 0.25,
    ))
```

Volatility can penalize irregular but adequate income. Testing should separate harmful insufficiency from harmless timing variation and compare salaried, hourly, seasonal, self-employed, benefit, and gig-income cohorts. Stress tests should cover missing accounts, delayed data, one-time inflows, refunds, reversals, and sudden source changes.

## 12.7 Average daily balance over six months

**Canonical name:** `avg_daily_balance_6m`
**Status:** required
**Group:** cash flow
**Type:** numeric float
**Published range:** -1,000 to 15,000
**Published step:** 25
**Demo default:** 1,800
**Directional hint:** higher is better

The field is intended to describe a liquidity buffer. The synthetic generator uses a positive lognormal distribution, although the UI metadata permits negative balances. The production formula should average end-of-day available balance across eligible linked accounts after removing double-counted transfers.

```text
avg_daily_balance_6m =
  sum(consolidated end_of_day_available_balance[d])
  / count(eligible observed days)
```

The definition should identify ledger versus available balance, pending transactions, overdraft facilities, multi-currency conversion, linked-account coverage, joint ownership, business accounts, and days with missing records. A consumer with multiple accounts should not receive different results merely because the provider returns one consolidated account and another returns separate accounts.

Current behavior:

- Required and numeric.
- No main-path range rejection.
- Fifth in the model vector.
- Synthetic risk rises below 500.
- `RC_LOW_BALANCE` is emitted below 500.

Balance is scale-sensitive in an unstandardized logistic regression. The principal baseline trains directly on raw values, so its coefficient magnitude will reflect the unit. Contribution values computed as coefficient times raw balance should not be compared with other features without validating the scale and model behavior.

Fairness and necessity review should examine whether average balance adds information beyond income and payment behavior, whether it disproportionately penalizes low-income applicants, and whether the lender can justify its use for the specific product.

## 12.8 NSF-event count over twelve months

**Canonical name:** `nsf_events_12m`
**Status:** required
**Group:** risk events
**Type:** numeric in the main dictionary, conceptually an integer count
**Published range:** 0 to 12
**Published step:** 1
**Demo default:** 0
**Directional hint:** lower is better

The value counts non-sufficient-funds events. The repository does not implement source-event normalization. A production definition must specify whether a declined payment attempt, returned item, assessed fee, reversed fee, repeated retry, and same-day duplicate represent one event or multiple events.

Current behavior:

- Required and numeric; the main contract accepts floats.
- Negative values are clamped to zero.
- Values above the published maximum are not rejected.
- Sixth in the model vector.
- Synthetic risk increases by `0.6` per event.
- Any positive value can produce `RC_NSF_EVENTS`.

```python
if nsf > 0:
    scored.append(("RC_NSF_EVENTS", nsf))
```

The production schema should use a nonnegative integer, validate the source-event taxonomy, cap or transform extreme counts consistently, and document whether count or recent-event indicator is more stable. Lender and provider fee policies can create measurement differences unrelated to applicant behavior, so provider-level and institution-level analysis is required.

## 12.9 Overdraft-event count over twelve months

**Canonical name:** `overdraft_events_12m`
**Status:** required
**Group:** risk events
**Type:** numeric in the main dictionary, conceptually an integer count
**Published range:** 0 to 12
**Published step:** 1
**Demo default:** 0
**Directional hint:** lower is better

This count is distinct from NSF events in the principal contract. An overdraft may be paid by the institution, while an NSF transaction may be returned. Provider definitions and consumer opt-in rules differ. The feature pipeline must prevent one underlying transaction from being counted in both fields unless the policy explicitly intends that representation.

Current behavior:

- Required and numeric.
- Negative values clamped to zero.
- Seventh in the vector.
- Synthetic risk increases by `0.5` per event.
- Any positive value can produce `RC_OVERDRAFT_EVENTS`.

Production tests should cover fee reversals, repeated presentment, authorized overdraft protection transfers, account-provider policy changes, reporting gaps, and extreme event counts. Review should compare the feature's incremental value with its potential to encode unequal access to account products and fee structures.

## 12.10 Months at current job

**Canonical name:** `months_at_current_job`
**Status:** optional
**Group:** stability
**Type:** numeric in the main contract, conceptually a nonnegative integer
**Published range:** 0 to 240
**Published step:** 1
**Demo default:** 18
**Directional hint:** higher is better

This feature is available to the model contract but is not used by the synthetic label formula and has no heuristic reason code. It is included in the training matrix because `DEFAULT_CONTRACT.columns()` contains required and optional fields. The synthetic generator supplies a value, so the trained estimator can still learn an incidental relationship with the random label sample.

When the field is absent online, `to_model_vector` inserts `0.0`:

```python
return np.array(
    [float(features.get(column, 0.0))
     for column in contract.columns()],
    dtype=float,
)
```

This conflates absence with zero tenure. A production design should either require a value, include an explicit missingness indicator, impute under a fitted and versioned policy, or remove the feature. Job tenure can disadvantage gig workers, caregivers returning to work, younger applicants, people affected by layoffs, and applicants changing jobs for higher pay. The necessity, proxy, stability, and explanation case should be independently reviewed.

## 12.11 Months at current address

**Canonical name:** `months_at_current_address`
**Status:** optional
**Group:** stability
**Type:** numeric in the main contract, conceptually a nonnegative integer
**Published range:** 0 to 240
**Published step:** 1
**Demo default:** 24
**Directional hint:** higher is better

Address tenure has the same missing-value behavior and synthetic-label limitation as job tenure. It has no heuristic reason code. It may reflect housing instability, but it can also penalize normal mobility, renters, military households, students, displaced people, people leaving unsafe housing, and communities facing structural housing pressure.

The production design should question whether the field is necessary at all. If retained, it needs source and verification rules, treatment of temporary addresses, range and integer validation, missingness semantics, proxy analysis, and a borrower-readable reason mapping. Geographic address content should never be reconstructed from the numerical tenure field or stored in the model event.

## 12.12 Full canonical feature-definition schema

The current API publishes the following properties per field:

```typescript
type FeatureDefinition = {
  name: string;
  label: string;
  description: string;
  required: boolean;
  minimum: number | null;
  maximum: number | null;
  step: number | null;
  default_value: number | null;
  higher_is_better: boolean;
  group: string;
};
```

A production definition should extend it:

```yaml
name: rent_on_time_rate_12m
version: feature-v1
type: float
unit: proportion
required: true
valid_range: [0.0, 1.0]
lookback: twelve_complete_months
source_types: [verified_rent_provider]
population_scope: applicants_with_eligible_rent_history
formula_reference: feature-spec/rent-on-time-v1
missingness_policy: explicit_missing_with_coverage
coverage_fields:
  - observed_obligation_count
  - eligible_month_count
transform: identity
monotonic_expectation: nondecreasing
reason_mapping: RC_LOW_RENT_ON_TIME
privacy_class: permissioned_financial_aggregate
proxy_review_reference: review/rent-feature-v1
owner: feature_governance
```

The schema hash should be calculated from a canonical serialization of all decision-relevant properties, including missingness and transformation references.

## 12.13 Feature-contract publication capability

**User purpose:** show the exact model input contract at the point of use.
**API:** `GET /v1/features/contract`
**UI:** status cards and `ScoreForm`
**Core modules:** `describe_contract`, model metadata, feature contract
**Current status:** implemented for the principal model.

The endpoint returns model name, model version, schema hash, active API threshold, and the ordered definitions. The threshold comes from runtime settings, while the bundle and registry also carry thresholds. The response therefore presents runtime policy, not necessarily the threshold recorded in the registry entry. Production code must compare them and reject an unauthorized mismatch.

## 12.14 Applicant scoring capability

**User purpose:** submit a pseudonymous application and alternative-data aggregates for a decision-support result.
**API:** `POST /v1/score`
**UI:** `ScoreForm` and `MetricsGrid`
**Evidence:** end-to-end test and product captures
**Current status:** implemented for the local baseline.

Request example:

```json
{
  "application_id": "app_example_001",
  "request_id": "optional_caller_reference",
  "features": {
    "rent_on_time_rate_12m": 0.96,
    "utility_on_time_rate_12m": 0.93,
    "avg_monthly_income_6m": 4500,
    "cashflow_volatility_6m": 0.12,
    "avg_daily_balance_6m": 1800,
    "nsf_events_12m": 0,
    "overdraft_events_12m": 0,
    "months_at_current_address": 24
  },
  "sensitive_attributes": {
    "age_band": "25-34"
  }
}
```

Response fields bind the result to request, model, schema, threshold, reasons, and service-generated creation value. The decision is model-assisted output; lender policy, eligibility rules, manual review, notices, and final action remain outside the endpoint.

## 12.15 Explanation capability

**User purpose:** view the direction and magnitude of model feature contributions.
**API:** `POST /v1/explain`
**UI:** `ExplainabilityPanel`
**Method:** coefficient multiplied by ordered feature value
**Current status:** implemented for the logistic baseline, not validated as a formal local explanation.

The UI sorts contributions by absolute magnitude and renders positive and negative bars. It shows the explanation request ID and the score request ID separately. The API does not bind them. The method name is `linear_proxy`; the FLG alternate implementation uses `linear_coefficient_proxy` and returns reason objects rather than a contribution dictionary.

Production explanation tests should verify additivity where claimed, baseline handling, preprocessing alignment, sign, rank stability, repeated-call stability, monotonic expectations, near-threshold behavior, missingness behavior, and mapping to specific reason language.

## 12.16 Reason-code and borrower-transparency capability

**User purpose:** present understandable factors and a reconsideration path.
**API source:** score reason-code list
**UI:** `MetricsGrid` and `BorrowerTransparency`
**Current status:** heuristic reason codes and static borrower copy implemented for the demonstration.

Current reason dictionary:

| Code | Trigger | Plain-language concept |
|---|---|---|
| `RC_LOW_RENT_ON_TIME` | rent rate below 0.92 | lower rent-payment consistency |
| `RC_LOW_UTIL_ON_TIME` | utility rate below 0.92 | lower utility-payment consistency |
| `RC_HIGH_CASHFLOW_VOL` | volatility above 0.25 | higher cash-flow instability |
| `RC_LOW_INCOME` | average income below 3,000 | limited verified income indicator |
| `RC_LOW_BALANCE` | balance below 500 | limited repayment buffer |
| `RC_NSF_EVENTS` | one or more NSF events | recent insufficient-funds events |
| `RC_OVERDRAFT_EVENTS` | one or more overdrafts | recent overdraft events |

The borrower panel maps codes to factor titles, descriptions, and suggested actions. It also exposes statements about data access, dispute, specific reasons, and human review. Those statements are product-design evidence, not a completed legal notice, dispute case system, or human-review queue.

## 12.17 Fairness batch capability

**User purpose:** compare selection and true-positive rates across monitoring groups.
**API:** `POST /v1/audit/fairness`
**UI:** `FairnessPanel` and `MetricsGrid`
**Current status:** implemented for caller-supplied binary rows.

The frontend builds a synthetic batch for three age bands and can regenerate it. In live mode, the batch is transmitted. In mock mode, the adapter returns a fixed report regardless of regenerated rows. Reviewers must not interpret mock button changes as recalculated evidence.

## 12.18 Portfolio analysis capability

**User purpose:** exercise the model against a cohort and inspect aggregate decisions, score bands, reason concentration, and optional group metrics.
**API:** `POST /v1/portfolio/analyze`
**UI:** `PortfolioWorkbench`
**Current status:** implemented in live mode and fixture-backed in mock mode.

The workbench offers cohort sizes, generates synthetic feature rows, chooses a group key, and renders summary cards, decision distribution, score bands, top reasons, fairness metrics, and row previews. It is a demonstration analysis surface, not a governed batch-decision engine. It lacks file ingestion, schema-preview rejection, job tracking, partial-failure semantics, small-cell suppression, downloadable governed reports, and reviewer sign-off.

## 12.19 Observed-outcome capability

**User purpose:** attach a later binary repayment result to a scored application.
**API:** `POST /v1/audit/events`
**UI:** `OutcomeTracker`
**Current status:** live append implemented; mock mode returns success without persistence.

The UI exposes four observation windows and two outcomes. A successful live submission triggers audit and governance refetch. The system does not automatically retrain, update a model report, or recalculate a fairness cohort. It merely adds an outcome event and lets coverage calculations observe the link.

## 12.20 Audit explorer capability

**User purpose:** inspect normalized evidence records and filter by event type or application reference.
**API:** `GET /v1/audit/events`
**UI:** `AuditTable`
**Current status:** implemented over principal JSONL events; fixture-backed in mock mode.

Event options are decision, explain, fairness report, portfolio analysis, and outcome. The table shows a localized display value, type, request reference, tokenized application reference, model version, and JSON payload. It does not offer role-based field masking, export authorization, event verification, chain-of-custody proof, or cross-tenant isolation.

## 12.21 Governance summary capability

**User purpose:** determine whether basic evidence coverage and the latest fairness snapshot require review.
**API:** `GET /v1/governance/summary`
**UI:** `GovernanceCenter`
**Current status:** four calculated controls implemented; other control, lineage, and monitoring views are static design fixtures.

The readiness percentage is the share of passing calculated controls. It is not a production-readiness score. The control-register rows `GV-01` through `GV-06`, the five lineage nodes, and four monitoring signals are static frontend data. They state intended governance design and should not be read as queried operating evidence.

## 12.22 Program roadmap capability

**User purpose:** explain how the two project objectives progress from data foundation through community deployment.
**UI:** `ProgramRoadmap`
**Current status:** implemented as static product narrative.

The view contains two objectives and nine phases: data infrastructure, interpretable indicators, responsible model development, validation, pilot, open-source release, real-time infrastructure, continuous governance, and community deployment. Duration, target outcome, and deliverables are plan content. They do not update from repository milestones.

## 12.23 Mock/live mode capability

The adapter boundary is a functional feature because it permits interface review without transmitting applicant data.

```typescript
export const USE_API =
  typeof import.meta.env.VITE_API_BASE_URL !== "undefined" &&
  import.meta.env.VITE_API_BASE_URL !== "" &&
  import.meta.env.VITE_API_BASE_URL !== "mock";
```

Live mode uses `fetch` and optional `X-API-Key`. Mock mode uses typed fixtures. In mock scoring only, the adapter generates a request ID, creation value, score, and decision at runtime. The reason codes remain fixed. This mixture demonstrates loading and state transitions but cannot validate score/reason consistency.

## 12.24 Feature ownership matrix

| Capability | Primary code owner | Principal evidence | Completion boundary |
|---|---|---|---|
| Feature contract | Core feature engineering | Contract endpoint and end-to-end test | Full metadata and server range enforcement incomplete |
| Scoring | Model serving | Live principal handler and test | Production policy, approval, idempotency, and validation incomplete |
| Explanation | Model development and responsible AI | Linear proxy and UI panel | Fidelity and notice mapping not independently validated |
| Fairness | Responsible AI | Metrics functions, tests, endpoint, UI | Statistical protocol and real cohort evidence incomplete |
| Portfolio | Analytics | Cohort handler and UI | Governed batch processing incomplete |
| Outcomes | Monitoring operations | Outcome event and coverage calculation | Provenance, correction, maturity, and idempotency incomplete |
| Audit | Evidence platform | JSONL/SQLite primitives and explorer | Immutability, tenant isolation, retention, and sealing incomplete |
| Governance summary | Responsible AI operations | Four calculated controls | Product/model/cohort scoping and approval workflow incomplete |
| Borrower transparency | Product and compliance | Demonstration rights panel | Approved language, delivery, dispute, and human-review systems incomplete |
| Program roadmap | Program leadership | Static UI view and dossier roadmap | Not an execution tracker |

## 12.25 Feature acceptance checklist

For each scored feature, a production review should require:

1. A named business and technical owner.
2. A lawful purpose and approved source class.
3. A complete formula with units, lookback, eligibility, exclusions, and corrections.
4. A versioned implementation and test fixtures.
5. Coverage, missingness, freshness, anomaly, and reconciliation thresholds.
6. Training-serving parity and a full-definition schema hash.
7. Stability and predictive-value evidence on representative data.
8. Proxy and subgroup-availability review.
9. Monotonicity or directional-behavior review where claimed.
10. A missingness and imputation policy.
11. A validated explanation and reason mapping.
12. A dispute and source-correction path.
13. Monitoring metrics, alert bands, owner, and runbook.
14. Retention, access, deletion, and audit requirements.
15. Independent approval and a documented removal condition.
