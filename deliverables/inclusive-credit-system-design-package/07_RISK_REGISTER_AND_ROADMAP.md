# 7. Risk Register and Completion Roadmap

## 7.1 Prioritized risk register

| ID | Risk / evidence | Severity | Required response |
|---|---|---:|---|
| R1 | Synthetic-only development evidence cannot establish real-world performance or fairness | Critical | Obtain lawful representative data; document lineage/consent; independently validate |
| R2 | Baseline ROC-AUC 0.56588288 is modest | High | Diagnose signal/label quality; compare candidates; calibrate; define minimum benefit |
| R3 | Logistic regression did not converge at 200 iterations | High | Make convergence a hard gate; fix scaling/solver/regularization; rerun all evaluations |
| R4 | Three overlapping code families can drift in schema, privacy, and policy | High | Select canonical stack; migrate controls; deprecate duplicates |
| R5 | Fairness registry field is empty; no real fairness report | Critical | Implement full protocol with lawful data, uncertainty, intersections, and sign-off |
| R6 | Reason codes not shown to be legally sufficient or fidelity-tested | Critical | Build versioned dictionary; test sign/fidelity/stability; counsel and user review |
| R7 | API identity/authorization and tenant isolation are scaffolding | Critical | OAuth2/mTLS, RBAC/ABAC, tenant tests, rate/replay controls, pen test |
| R8 | Local JSONL/SQLite is not tamper-evident | High | Immutable managed store or hash-chain sealing, role separation, reconciliation |
| R9 | Joblib artifact loading is unsafe without provenance | High | Signed immutable artifacts, digest verification, trusted storage, runtime pinning |
| R10 | Sensitive-attribute governance and proxy method are incomplete | High | Legal basis, separation, access/retention, methodology validation, privacy review |
| R11 | No load/failover/backup-restore evidence | High | Performance test, chaos/failover, RTO/RPO and recovery exercise |
| R12 | No production pilot or human-process evidence | High | Controlled pilot with monitoring, training, overrides, appeals, exit criteria |
| R13 | Runtime reproducibility issue: default Node too old for Vite | Medium | Pin supported Node version; CI build; containerize frontend; document toolchain |
| R14 | Source project brief includes impact statistics without citations in repo | Medium | Add authoritative sources or remove quantitative claims from evidence materials |

## 7.2 Workstream roadmap

### Stage 0 — Repository consolidation

- Designate canonical namespace/API and feature vocabulary.
- Migrate strongest privacy/audit controls from alternate implementations.
- Add architecture decision records and deprecation notices.
- Pin Python/Node dependencies; CI build/test; SBOM and baseline scans.
- Fix convergence warning and expand unit/contract tests.

**Exit evidence:** clean canonical architecture, no uncontrolled duplicate decision paths, reproducible CI, successful convergence.

### Stage 1 — Governed data foundation

- Data-sharing/consent agreements, data inventory, lineage, retention.
- Canonical feature dictionary, provider mappings, quality rules, immutable snapshots.
- Label definition/maturation and selection-bias analysis.
- Protected-class/proxy monitoring protocol approved by counsel.

**Exit evidence:** signed data governance package, quality report, representative snapshot, lineage and leakage report.

### Stage 2 — Model development and fairness

- Baseline/challenger models, calibration, threshold/cost analysis.
- Out-of-time/provider/geography tests and stress scenarios.
- Full fairness protocol with uncertainty and intersectional analysis.
- Mitigation experiments; reason-code fidelity and stability tests.

**Exit evidence:** model card, evaluation report, fairness report, explanation report, reproducibility bundle.

### Stage 3 — Independent validation and control remediation

- Independent data/method/implementation/outcome challenge.
- Security threat model and penetration test.
- Privacy impact assessment and compliance/legal review.
- Close critical/high findings or record approved compensating controls.

**Exit evidence:** independent validation report, issue log, approvals, signed artifact and registry entry.

### Stage 4 — Production-grade platform

- OAuth2/mTLS, tenant isolation, secrets, TLS, gateway/WAF/rate limits.
- Immutable artifacts and audit integrity; monitoring dashboards and alerts.
- Load/soak/failover/backup/restore; rollback and incident exercises.
- Underwriter/compliance workflows and borrower notice/reconsideration support.

**Exit evidence:** operational-readiness review, security evidence, SLO/load report, recovery and rollback records.

### Stage 5 — Controlled community-lender pilot

- Partner selection, policy mapping, staff training, sandbox validation.
- Limited cohort, human review, heightened monitoring, complaint/appeal channel.
- Predefined pause/rollback and pilot exit criteria.
- Stakeholder and borrower-comprehension evaluation.

**Exit evidence:** pilot protocol, decision/fairness/performance report, issues/overrides/appeals analysis, partner feedback, go/no-go decision.

### Stage 6 — Open-source and broader adoption

- Publish reviewed code, model/data documentation, governance templates, deployment guide, tutorials, contribution and security processes.
- Do not publish sensitive data, partner secrets, exploitable security details, or unreviewed production artifacts.
- Maintain versions, vulnerability response, model updates, and public limitation notices.

## 7.3 Governance ownership

| Area | Accountable owner | Required independent challenge |
|---|---|---|
| Data provenance/quality | Data owner | Compliance + validation |
| Model methodology | Model owner | Independent model validation |
| Fair lending | Compliance / responsible-AI lead | Legal and independent analysis |
| Security/privacy | Security and privacy officers | Pen test / privacy review |
| Threshold/policy | Credit risk committee | Validation + fair-lending review |
| Deployment | Platform owner | Operational risk / change approval |
| Pilot | Business/risk sponsor | Compliance, monitoring, partner governance |
| Open-source release | Maintainers | Security, privacy, legal/license review |

## 7.4 Definition of credible completion evidence

Claims should be supported by immutable artifacts, reproducible commands, controlled reports, sample sizes and uncertainty, reviewer identity/role, approval status, issue disposition, and clear limitations. Screenshots are useful demonstrations but never substitute for test logs, machine-readable reports, source traceability, independent validation, or operational evidence.
