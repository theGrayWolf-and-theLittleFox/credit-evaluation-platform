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
illustrative. The screenshots embedded in the "This is what's actually running" section are not
mockups — they were captured from this repository's reference console (`frontend/`) running live
against the real scoring API (`services/api/`) and the trained baseline model
(`artifacts/models/baseline.joblib`) for that exact applicant profile. The 53.7/100 score, the
`RC_HIGH_CASHFLOW_VOL` reason code, the per-factor contribution values, and the fairness-monitor
numbers (75% / 75% / 50% selection rate by age group, flagged for review) are genuine model output,
not staged numbers.

The baseline model is trained on synthetic demonstration data only (see the main
[README](../../README.md)) — treat any specific score as illustrative of the *workflow*, not as a
production-grade prediction.

## Regenerating the PDF

The PDF is a static export, not built by CI. To regenerate it after editing `index.html`, print the
page to PDF from a browser, or use a headless-Chrome script that expands `.panel` elements to
`display: block` before printing (the demo hides all but the active walkthrough step by default).
