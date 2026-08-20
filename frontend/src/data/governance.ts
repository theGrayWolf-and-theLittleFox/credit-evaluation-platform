export type GovernanceControl = {
  id: string;
  domain: string;
  control: string;
  evidence: string;
  owner: string;
  status: "ready" | "review" | "planned";
};

export const governanceControls: GovernanceControl[] = [
  {
    id: "GV-01",
    domain: "Data rights",
    control: "Consumer permission and permissible-purpose record",
    evidence: "Consent receipt, source reference, purpose, and expiration are bound to each ingestion event.",
    owner: "Data governance",
    status: "ready",
  },
  {
    id: "GV-02",
    domain: "Data quality",
    control: "Alternative-data lineage and reproducibility",
    evidence: "Dataset versions, transformations, feature schema, and training inputs are traceable end to end.",
    owner: "ML platform",
    status: "ready",
  },
  {
    id: "GV-03",
    domain: "Fair lending",
    control: "Pre-release subgroup evaluation",
    evidence: "Selection rate, equal opportunity, calibration, and threshold sensitivity are reviewed by subgroup.",
    owner: "Responsible AI",
    status: "ready",
  },
  {
    id: "GV-04",
    domain: "Explainability",
    control: "Specific and actionable decision reasons",
    evidence: "Feature contributions map to stable reason codes and plain-language adverse-action narratives.",
    owner: "Compliance",
    status: "review",
  },
  {
    id: "GV-05",
    domain: "Model risk",
    control: "Independent validation and stress testing",
    evidence: "Performance, stability, fairness, and explanation consistency are tested under adverse scenarios.",
    owner: "Model validation",
    status: "planned",
  },
  {
    id: "GV-06",
    domain: "Change control",
    control: "Approval, rollback, and incident handling",
    evidence: "Registry promotion requires named approval; prior artifacts remain available for rapid rollback.",
    owner: "Model governance",
    status: "review",
  },
];

export const dataLineage = [
  { step: "Permission", detail: "Purpose-bound consumer authorization", state: "verified" },
  { step: "Sources", detail: "Rent, utilities, verified cash flow", state: "3 connected" },
  { step: "Validation", detail: "Completeness, range, anomaly, proxy checks", state: "passing" },
  { step: "Features", detail: "Versioned alternative-data contract", state: "v0.1.0" },
  { step: "Decision", detail: "Score, reasons, threshold, model version", state: "audited" },
];

export const monitoringSignals = [
  { label: "Feature drift", value: "0.07", level: 24, state: "Within limit" },
  { label: "Calibration gap", value: "2.4%", level: 32, state: "Within limit" },
  { label: "Parity difference", value: "0.08", level: 47, state: "Review monthly" },
  { label: "Explanation stability", value: "96.2%", level: 88, state: "Healthy" },
];
