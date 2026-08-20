import {
  ApplicantFeatures,
  AuditEvent,
  ExplainResult,
  FairnessReport,
  FeatureContract,
  HealthResponse,
  GovernanceSummary,
  ModelInfo,
  PortfolioAnalysisResult,
  PortfolioApplicationInput,
  ScorePayload,
  ScoreResult,
} from "../types";

export const demoHealth: HealthResponse = {
  status: "ok",
};

export const demoGovernanceSummary: GovernanceSummary = {
  overall_status: "review",
  readiness: 0.5,
  event_count: 148,
  event_counts: { decision: 64, explain: 62, fairness_report: 8, outcome: 14 },
  decision_count: 64,
  approval_rate: 0.625,
  explanation_coverage: 0.9688,
  outcome_coverage: 0.7813,
  latest_fairness: {
    demographic_parity_difference: 0.08,
    equal_opportunity_difference: 0.06,
    groups: ["18-24", "25-34", "35-44"],
  },
  controls: [
    { id: "explanation_coverage", label: "Decision explanation coverage", value: 0.9688, threshold: 0.95, status: "passing" },
    { id: "outcome_coverage", label: "Observed outcome coverage", value: 0.7813, threshold: 0.8, status: "review" },
    { id: "fairness_threshold", label: "Latest fairness threshold review", value: 0.08, threshold: 0.1, status: "passing" },
    { id: "audit_integrity", label: "Decision audit capture", value: 1, threshold: 1, status: "passing" },
  ],
};

export const demoModelInfo: ModelInfo = {
  current: {
    name: "sklearn_logreg_baseline",
    version: "0.1.0",
  },
  entry: {
    name: "sklearn_logreg_baseline",
    version: "0.1.0",
    artifact_path: "artifacts/models/baseline.joblib",
    created_at: "2026-05-22T20:00:00Z",
    feature_schema_hash: "demo_schema_v1",
    decision_threshold: 0.5,
    metrics: {
      roc_auc: 0.81,
    },
    fairness: {},
    notes: "Synthetic baseline model trained from demo alternative-data features.",
  },
};

export const demoFeatureContract: FeatureContract = {
  model_name: "sklearn_logreg_baseline",
  model_version: "0.1.0",
  feature_schema_hash: "demo_schema_v1",
  decision_threshold: 0.5,
  feature_definitions: [
    {
      name: "rent_on_time_rate_12m",
      label: "Rent on-time rate (12m)",
      description: "Share of observed rent payments made on time during the last 12 months.",
      required: true,
      minimum: 0,
      maximum: 1,
      step: 0.01,
      default_value: 0.94,
      higher_is_better: true,
      group: "payment_history",
    },
    {
      name: "utility_on_time_rate_12m",
      label: "Utility on-time rate (12m)",
      description: "Share of observed utility payments made on time during the last 12 months.",
      required: true,
      minimum: 0,
      maximum: 1,
      step: 0.01,
      default_value: 0.91,
      higher_is_better: true,
      group: "payment_history",
    },
    {
      name: "avg_monthly_income_6m",
      label: "Average monthly income (6m)",
      description: "Average verified monthly income over the last six months.",
      required: true,
      minimum: 0,
      maximum: 15000,
      step: 50,
      default_value: 4200,
      higher_is_better: true,
      group: "cash_flow",
    },
    {
      name: "cashflow_volatility_6m",
      label: "Cashflow volatility (6m)",
      description: "Normalized volatility of recent cash flow, where higher values mean less stability.",
      required: true,
      minimum: 0,
      maximum: 1.5,
      step: 0.01,
      default_value: 0.24,
      higher_is_better: false,
      group: "cash_flow",
    },
    {
      name: "avg_daily_balance_6m",
      label: "Average daily balance (6m)",
      description: "Average account balance over the last six months.",
      required: true,
      minimum: -1000,
      maximum: 15000,
      step: 25,
      default_value: 1800,
      higher_is_better: true,
      group: "cash_flow",
    },
    {
      name: "nsf_events_12m",
      label: "NSF events (12m)",
      description: "Count of non-sufficient funds events observed over the last 12 months.",
      required: true,
      minimum: 0,
      maximum: 12,
      step: 1,
      default_value: 0,
      higher_is_better: false,
      group: "risk_events",
    },
    {
      name: "overdraft_events_12m",
      label: "Overdraft events (12m)",
      description: "Count of overdraft events observed over the last 12 months.",
      required: true,
      minimum: 0,
      maximum: 12,
      step: 1,
      default_value: 0,
      higher_is_better: false,
      group: "risk_events",
    },
    {
      name: "months_at_current_job",
      label: "Months at current job",
      description: "Tenure at the current job, when available.",
      required: false,
      minimum: 0,
      maximum: 240,
      step: 1,
      default_value: 18,
      higher_is_better: true,
      group: "stability",
    },
    {
      name: "months_at_current_address",
      label: "Months at current address",
      description: "Tenure at the current address, when available.",
      required: false,
      minimum: 0,
      maximum: 240,
      step: 1,
      default_value: 24,
      higher_is_better: true,
      group: "stability",
    },
  ],
};

export function buildDefaultFeatures(contract: FeatureContract = demoFeatureContract): ApplicantFeatures {
  return Object.fromEntries(
    contract.feature_definitions.map((definition) => [definition.name, definition.default_value ?? 0]),
  );
}

export function buildDemoScorePayload(contract: FeatureContract = demoFeatureContract): ScorePayload {
  return {
    application_id: "demo_applicant",
    features: buildDefaultFeatures(contract),
    sensitive_attributes: {
      age_band: "25-34",
      race_ethnicity: "decline_to_state",
      sex: "decline_to_state",
    },
  };
}

export const demoScoreResult: ScoreResult = {
  application_id: "demo_applicant",
  request_id: "req_demo_001",
  model_name: "sklearn_logreg_baseline",
  model_version: "0.1.0",
  feature_schema_hash: "demo_schema_v1",
  score: 0.72,
  decision: "approve",
  decision_threshold: 0.5,
  reason_codes: ["RC_HIGH_CASHFLOW_VOL", "RC_OVERDRAFT_EVENTS"],
  created_at: "2026-05-22T20:01:00Z",
  extra: {},
};

export const demoExplanation: ExplainResult = {
  application_id: "demo_applicant",
  request_id: "req_demo_explain_001",
  model_name: "sklearn_logreg_baseline",
  model_version: "0.1.0",
  method: "linear_proxy",
  created_at: "2026-05-22T20:01:10Z",
  base_value: null,
  contributions: {
    rent_on_time_rate_12m: 0.19,
    utility_on_time_rate_12m: 0.08,
    avg_monthly_income_6m: 0.24,
    cashflow_volatility_6m: -0.22,
    avg_daily_balance_6m: 0.13,
    nsf_events_12m: -0.06,
    overdraft_events_12m: -0.12,
    months_at_current_job: 0.05,
    months_at_current_address: 0.03,
  },
};

export const demoFairness: FairnessReport = {
  groups: ["18-24", "25-34", "35-44"],
  counts_by_group: {
    "18-24": 40,
    "25-34": 40,
    "35-44": 40,
  },
  demographic_parity_difference: 0.08,
  equal_opportunity_difference: 0.06,
  selection_rate_by_group: {
    "18-24": 0.57,
    "25-34": 0.65,
    "35-44": 0.61,
  },
  tpr_by_group: {
    "18-24": 0.69,
    "25-34": 0.75,
    "35-44": 0.72,
  },
};

export const demoAuditEvents: AuditEvent[] = [
  {
    id: "audit-1004",
    created_at: "2026-05-22T20:10:00Z",
    ts: Date.now() / 1000 - 1800,
    request_id: "req_demo_portfolio",
    event_type: "portfolio_analysis",
    model_name: "sklearn_logreg_baseline",
    model_version: "0.1.0",
    application_id: null,
    payload: {
      approval_rate: 0.63,
      average_score: 0.61,
      decision_counts: { approve: 19, deny: 11 },
      fairness_available: true,
      group_key: "age_band",
      n_applications: 30,
    },
  },
  {
    id: "audit-1003",
    created_at: "2026-05-22T20:08:00Z",
    ts: Date.now() / 1000 - 2100,
    request_id: "req_demo_explain",
    event_type: "explain",
    model_name: "sklearn_logreg_baseline",
    model_version: "0.1.0",
    application_id: "demo_applicant",
    payload: {
      contribution_count: 9,
      reason_codes: demoScoreResult.reason_codes,
      score: demoScoreResult.score,
    },
  },
  {
    id: "audit-1002",
    created_at: "2026-05-22T20:05:00Z",
    ts: Date.now() / 1000 - 2400,
    request_id: "req_demo_001",
    event_type: "decision",
    model_name: "sklearn_logreg_baseline",
    model_version: "0.1.0",
    application_id: "demo_applicant",
    payload: {
      decision: "approve",
      decision_threshold: 0.5,
      features_hash: "5cf413...",
      reason_codes: demoScoreResult.reason_codes,
      score: demoScoreResult.score,
    },
  },
  {
    id: "audit-1001",
    created_at: "2026-05-22T20:03:00Z",
    ts: Date.now() / 1000 - 3000,
    request_id: "req_demo_fairness",
    event_type: "fairness_report",
    model_name: null,
    model_version: null,
    application_id: null,
    payload: {
      demographic_parity_difference: demoFairness.demographic_parity_difference,
      equal_opportunity_difference: demoFairness.equal_opportunity_difference,
      groups: demoFairness.groups,
      n_rows: 120,
      positive_label: 1,
    },
  },
];

export function buildDemoPortfolioApplications(
  count = 24,
  contract: FeatureContract = demoFeatureContract,
): PortfolioApplicationInput[] {
  const groups = ["18-24", "25-34", "35-44", "45-54"];
  return Array.from({ length: count }, (_, index) => {
    const ratio = count === 1 ? 0.5 : index / (count - 1);
    const oscillation = ((index % 5) - 2) * 0.015;
    const features = buildDefaultFeatures(contract);

    features.rent_on_time_rate_12m = clamp(0.985 - ratio * 0.22 + oscillation, 0.55, 0.99);
    features.utility_on_time_rate_12m = clamp(0.97 - ratio * 0.18 + oscillation / 2, 0.55, 0.99);
    features.avg_monthly_income_6m = Math.round(6200 - ratio * 3400 + index * 22);
    features.cashflow_volatility_6m = clamp(0.12 + ratio * 0.35 + Math.abs(oscillation), 0.05, 1.2);
    features.avg_daily_balance_6m = Math.round(2800 - ratio * 1800 + index * 12);
    features.nsf_events_12m = Math.round(ratio * 2);
    features.overdraft_events_12m = Math.round(ratio * 3);
    features.months_at_current_job = Math.round(42 - ratio * 24 + (index % 4) * 3);
    features.months_at_current_address = Math.round(54 - ratio * 30 + (index % 6) * 2);

    const expectedGoodOutcome =
      features.rent_on_time_rate_12m * 0.28 +
      features.utility_on_time_rate_12m * 0.14 +
      Math.min(features.avg_monthly_income_6m / 8000, 1) * 0.18 +
      Math.min(features.avg_daily_balance_6m / 3000, 1) * 0.12 -
      features.cashflow_volatility_6m * 0.21 -
      features.overdraft_events_12m * 0.04 -
      features.nsf_events_12m * 0.03;

    return {
      application_id: `portfolio_${String(index + 1).padStart(3, "0")}`,
      features,
      sensitive_attributes: {
        age_band: groups[index % groups.length],
      },
      actual_outcome: expectedGoodOutcome > 0.38 ? 1 : 0,
    };
  });
}

export const demoPortfolioAnalysis: PortfolioAnalysisResult = {
  model_name: "sklearn_logreg_baseline",
  model_version: "0.1.0",
  decision_threshold: 0.5,
  summary: {
    total_applications: 24,
    average_score: 0.61,
    approval_rate: 0.63,
    decision_counts: {
      approve: 15,
      deny: 9,
    },
    score_bands: {
      near_prime: 11,
      prime: 8,
      subprime_watch: 5,
    },
  },
  top_reason_codes: [
    {
      code: "RC_HIGH_CASHFLOW_VOL",
      count: 11,
      description: "Cash-flow patterns show higher volatility, increasing repayment uncertainty.",
    },
    {
      code: "RC_LOW_BALANCE",
      count: 9,
      description: "Average account balance indicates limited buffer for repayment shocks.",
    },
    {
      code: "RC_OVERDRAFT_EVENTS",
      count: 7,
      description: "Overdraft events were observed in recent history.",
    },
  ],
  applications: buildDemoPortfolioApplications(10).map((application, index) => ({
    application_id: application.application_id,
    score: clamp(0.78 - index * 0.05, 0.28, 0.92),
    decision: index < 6 ? "approve" : "deny",
    reason_codes: index < 6 ? ["RC_HIGH_CASHFLOW_VOL"] : ["RC_LOW_BALANCE", "RC_OVERDRAFT_EVENTS"],
  })),
  fairness: demoFairness,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
