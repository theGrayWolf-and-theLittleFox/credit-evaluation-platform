export type ApplicantFeatures = Record<string, number>;

export type SensitiveAttributes = {
  age_band?: string | null;
  race_ethnicity?: string | null;
  sex?: string | null;
  [key: string]: string | null | undefined;
};

export type ScorePayload = {
  application_id: string;
  features: ApplicantFeatures;
  sensitive_attributes?: SensitiveAttributes;
  request_id?: string;
};

export type ScoreResult = {
  application_id: string;
  request_id: string;
  model_name: string;
  model_version: string;
  feature_schema_hash: string;
  score: number;
  decision: string;
  decision_threshold: number;
  reason_codes: string[];
  created_at: string;
  extra: Record<string, unknown>;
};

export type ExplainResult = {
  application_id: string;
  request_id: string;
  model_name: string;
  model_version: string;
  method: string;
  created_at: string;
  contributions: Record<string, number>;
  base_value: number | null;
};

export type FeatureDefinition = {
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

export type FeatureContract = {
  model_name: string;
  model_version: string;
  feature_schema_hash: string;
  decision_threshold: number;
  feature_definitions: FeatureDefinition[];
};

export type FairnessRow = {
  protected_group: string;
  y_true: number;
  y_pred: number;
};

export type FairnessReport = {
  groups: string[];
  counts_by_group: Record<string, number>;
  demographic_parity_difference: number;
  equal_opportunity_difference: number;
  selection_rate_by_group: Record<string, number>;
  tpr_by_group: Record<string, number>;
};

export type AuditEvent = {
  id: string;
  created_at: string;
  ts: number;
  event_type: string;
  request_id: string | null;
  application_id: string | null;
  model_name: string | null;
  model_version: string | null;
  payload: Record<string, unknown>;
};

export type AuditEventList = {
  total: number;
  limit: number;
  offset: number;
  events: AuditEvent[];
};

export type AuditFilters = {
  event_type?: string;
  application_id?: string;
};

export type ModelRegistryEntry = {
  name: string;
  version: string;
  artifact_path: string;
  created_at: string;
  feature_schema_hash: string;
  decision_threshold: number;
  metrics: Record<string, number>;
  fairness: Record<string, number>;
  notes: string;
};

export type ModelInfo = {
  current: {
    name: string;
    version: string;
  } | null;
  entry: ModelRegistryEntry | null;
};

export type HealthResponse = {
  status: string;
};

export type PortfolioApplicationInput = {
  application_id: string;
  features: ApplicantFeatures;
  sensitive_attributes?: SensitiveAttributes;
  actual_outcome?: number;
};

export type PortfolioAnalysisRequest = {
  applications: PortfolioApplicationInput[];
  group_key?: string;
  top_reason_count?: number;
};

export type PortfolioApplicationResult = {
  application_id: string;
  score: number;
  decision: string;
  reason_codes: string[];
};

export type PortfolioTopReason = {
  code: string;
  count: number;
  description: string;
};

export type PortfolioSummary = {
  total_applications: number;
  average_score: number;
  approval_rate: number;
  decision_counts: Record<string, number>;
  score_bands: Record<string, number>;
};

export type PortfolioAnalysisResult = {
  model_name: string;
  model_version: string;
  decision_threshold: number;
  summary: PortfolioSummary;
  top_reason_codes: PortfolioTopReason[];
  applications: PortfolioApplicationResult[];
  fairness: FairnessReport | null;
};

export type GovernanceControlResult = {
  id: string;
  label: string;
  value: number;
  threshold: number;
  status: "passing" | "review" | "insufficient_data";
};

export type GovernanceSummary = {
  overall_status: "passing" | "review" | "insufficient_data";
  readiness: number;
  event_count: number;
  event_counts: Record<string, number>;
  decision_count: number;
  approval_rate: number;
  explanation_coverage: number;
  outcome_coverage: number;
  latest_fairness: {
    demographic_parity_difference: number | null;
    equal_opportunity_difference: number | null;
    groups: string[];
  };
  controls: GovernanceControlResult[];
};

export type OutcomePayload = {
  application_id: string;
  outcome_type: "repayment_30d" | "repayment_90d" | "repayment_180d" | "repayment_12m";
  outcome_value: 0 | 1;
  extra?: {
    observed_at?: string;
    source?: string;
  };
};
