## Privacy, PII Redaction, and Minimal Audit Trails

This project is an open-source, non-commercial platform to help mission-driven lenders extend credit with lawful alternative data. The codebase is built to minimize personal information (PII) retention while keeping the transparency and auditability regulators expect.

### Data-minimization principles
- Avoid collecting PII when not required for modeling or monitoring.
- Default to hashing identifiers before storage; keep raw identifiers out of logs.
- Allowlist only the outcome- and fairness-related fields that audits need.
- Truncate long strings and drop unexpected keys to prevent accidental PII capture.
- Make redaction policy configurable via environment variables for different jurisdictions.

### Redaction controls (defaults are privacy-first)
The API and CLI now construct `PIIRedactor` instances for every audit write. Defaults:
- Applicant IDs are SHA-256 hashed before persistence.
- Unknown payload keys are dropped unless explicitly allowed.
- Payload strings are truncated (default: 256 chars) and iterables are clipped to prevent leakage.
- A conservative allowlist retains only outcome and fairness metrics (`score`, `decision`, `reason_codes`, `selection_rate_by_group`, `tpr_by_group`, etc.).

### Configure via `.env`
```
MIE_AUDIT_HASH_APPLICANT_ID=true
MIE_AUDIT_REMOVE_APPLICANT_ID=false          # set true if you must drop IDs entirely
MIE_AUDIT_ALLOW_PAYLOAD_KEYS=score,decision,reason_codes,base_value,selection_rate_by_group,tpr_by_group
MIE_AUDIT_HASH_PAYLOAD_KEYS=                 # optional: comma-separated keys to hash
MIE_AUDIT_DROP_UNKNOWN_PAYLOAD_KEYS=true
MIE_AUDIT_TRUNCATE_PAYLOAD_STRINGS=256
MIE_AUDIT_MAX_LIST_ITEMS=50
MIE_AUDIT_HASH_SALT=change-me                # supply per-deployment salt
```
Environment variables map directly to `Settings` fields in `src/mie_credit_platform/settings.py`.

### Operational guidance
- **API health** (`GET /health`) now reports whether applicant IDs are hashed or removed.
- **Audit export** via CLI: `python -m mie_credit_platform.cli audit-export out.jsonl --request-id ...` (exports already-redacted rows).
- **Request bodies** are not stored by default; only enable `MIE_AUDIT_LOG_REQUEST_BODIES=true` if you have explicit consent and governance in place. The redactor will still drop unapproved keys.
- **Model explanations** include reason codes but exclude raw feature payloads from audit logs unless explicitly permitted.

### Alignment with responsible AI roadmap
- **Fairness & explainability:** retain only aggregated fairness metrics and human-readable reason codes to support ECOA/FCRA-style adverse action reasoning without exposing sensitive attributes.
- **Security:** hashed identifiers and truncation reduce blast radius if audit stores are exfiltrated.
- **Governance:** configuration is code-driven and auditable; defaults favor privacy and can be tightened for specific partners or regions.

