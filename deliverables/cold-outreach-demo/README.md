# Cold Outreach Demo

A self-contained, nontechnical walkthrough of the platform for community banks, credit unions,
CDFIs, small-business lenders, fintechs, and financial-inclusion practitioners — built to be
understood in about 60 seconds without opening the rest of this repository.

## Contents

- `index.html` — the interactive demo. Single file, no build step, no dependencies; open directly
  in a browser. Walks through one fictional applicant ("Maria's Bakery") end to end: traditional
  credit file, alternative financial signals, assessment, key factors, and a fairness check.
- `Inclusive-Credit-Infrastructure-Demo.pdf` — a linear, printable version of the same content,
  generated from `index.html` (the tabbed walkthrough is expanded into sequential sections since a
  PDF can't be interactive).

## What's real vs. illustrative

The applicant ("Maria's Bakery") is fictional, and the credit file / alternative-signal inputs are
illustrative. Everything downstream of them is not.

**Live output.** The screenshots in the "This is what's actually running" section were captured from
this repository's reference console (`frontend/`) running against the real scoring API
(`services/api/`) and the trained baseline model (`artifacts/models/baseline.joblib`) for that exact
applicant profile. The 53.7/100 score, the `RC_HIGH_CASHFLOW_VOL` reason code, the per-factor
contributions, the governance coverage metrics and the audit rows are genuine model and service
output. All ten screenshots come from one continuous session, so the gallery is internally
consistent rather than assembled from separate runs.

**Steps 1 and 2 are not model inputs.** The applicant profile and the traditional credit file are the
situation a loan officer walks in with. The model receives only the nine alternative-data fields in
step 3 — it has no bureau input, and no loan amount, term, or debt-to-income input either. The
walkthrough says so on both steps.

**What the model is actually driven by.** On this synthetic baseline, verified income and cash-flow
volatility do nearly all the work; rent history moves the score very little (dropping Maria's rent
from 100% to 50% on time costs about one point and does not change the decision). That is a property
of synthetic training data in which almost every simulated applicant already pays rent on time, and
it is stated plainly in step 5 rather than glossed over. Closing it is open modelling work tracked in
the design package's risk register.

**Score scale.** The score is a probability of on-time repayment expressed on a 0–100 scale, not a
credit score. An applicant sitting exactly on the published reference profile scores 51.8; the
strongest inputs the contract allows reach 81.1. The baseline's ROC-AUC is modest, which is why
scores cluster near the middle.

**The fairness batch is a fixture.** The 75% / 75% / 50% selection rates and the 25-point gap come
from the console's built-in monitoring batch (`makeSyntheticRows` in
`frontend/src/components/FairnessPanel.tsx`), whose decisions and outcomes are pre-set so the metrics
have something deterministic to measure. The model did not produce those approvals, and the gap is a
property of the fixture rather than evidence about the model. When the model does score a real
cohort — the 24-application portfolio pass in the same gallery — the selection rate is identical
across every age group. Step 6 says this.

**Reproducing the scenario.** Application id `maria_bakery_demo`, age band 35-44, and:
`rent_on_time_rate_12m` 1.00, `utility_on_time_rate_12m` 0.96, `avg_monthly_income_6m` 5400,
`cashflow_volatility_6m` 0.285, `avg_daily_balance_6m` 2150, `nsf_events_12m` 0,
`overdraft_events_12m` 0, `months_at_current_job` 36, `months_at_current_address` 24. The model is
deterministic (synthetic data, seed 7). Run the console actions in this order — score, explain,
portfolio analysis, record outcome, **fairness report last** — because the headline fairness card
shows whichever report ran most recently.

The baseline model is trained on synthetic demonstration data only (see the main
[README](../../README.md)) — treat any specific score as illustrative of the *workflow*, not as a
production-grade prediction.

## Regenerating the PDF

The PDF is a static export, not built by CI. To regenerate it after editing `index.html`, print the
page to PDF from a browser, or use a headless-Chrome script that expands `.panel` elements to
`display: block` before printing (the demo hides all but the active walkthrough step by default).
The export also hides `.tabbar` and `.panel-nav`, numbers the expanded steps with a CSS counter on
`.panel h3`, sets `break-inside: avoid` on `.proof-shot` so a screenshot is never split across two
pages, and collapses `.signal-groups` to a single column (the walkthrough is full width in print,
which leaves the paired signal tables too narrow for their labels). Letter, 0.5in margins,
background graphics on.
