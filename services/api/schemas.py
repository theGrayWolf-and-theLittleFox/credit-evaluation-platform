from __future__ import annotations

from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from services.api.privacy import validate_pseudonymous_reference


class PseudonymousApplicationModel(BaseModel):
    application_id: str = Field(..., min_length=3, max_length=128)

    @field_validator("application_id")
    @classmethod
    def application_reference_must_be_pseudonymous(cls, value: str) -> str:
        return validate_pseudonymous_reference(value)


class ScoreRequest(PseudonymousApplicationModel):
    features: Dict[str, float]
    sensitive_attributes: Optional[Dict[str, str]] = None
    request_id: Optional[str] = None


class ScoreResponse(BaseModel):
    application_id: str
    request_id: str
    model_name: str
    model_version: str
    feature_schema_hash: str
    score: float
    decision: str
    decision_threshold: float
    reason_codes: list[str]
    created_at: str
    extra: Dict[str, Any] = Field(default_factory=dict)


class ExplainRequest(PseudonymousApplicationModel):
    features: Dict[str, float]


class ExplainResponse(BaseModel):
    application_id: str
    request_id: str
    model_name: str
    model_version: str
    method: str
    created_at: str
    contributions: Dict[str, float]
    base_value: Optional[float] = None


class OutcomeEventIn(PseudonymousApplicationModel):
    outcome_type: Literal["repayment_30d", "repayment_90d", "repayment_180d", "repayment_12m"]
    outcome_value: int = Field(..., ge=0, le=1)
    extra: Optional[Dict[str, Any]] = None


class ModelInfo(BaseModel):
    current: Optional[Dict[str, str]]
    entry: Optional[Dict[str, Any]]


class FeatureDefinition(BaseModel):
    name: str
    label: str
    description: str
    required: bool
    minimum: Optional[float] = None
    maximum: Optional[float] = None
    step: Optional[float] = None
    default_value: Optional[float] = None
    higher_is_better: bool = True
    group: str


class FeatureContractResponse(BaseModel):
    model_name: str
    model_version: str
    feature_schema_hash: str
    decision_threshold: float
    feature_definitions: list[FeatureDefinition]


class FairnessRow(BaseModel):
    protected_group: str = Field(..., min_length=1)
    y_true: int = Field(..., ge=0, le=1)
    y_pred: int = Field(..., ge=0, le=1)


class FairnessReportRequest(BaseModel):
    rows: list[FairnessRow]
    positive_label: int = 1


class FairnessReportResponse(BaseModel):
    groups: list[str]
    counts_by_group: Dict[str, int]
    demographic_parity_difference: float
    equal_opportunity_difference: float
    selection_rate_by_group: Dict[str, float]
    tpr_by_group: Dict[str, float]


class AuditEventRecord(BaseModel):
    id: str
    created_at: str
    ts: float
    event_type: str
    request_id: Optional[str] = None
    application_id: Optional[str] = None
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class AuditEventListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    events: list[AuditEventRecord]


class PortfolioApplicationIn(PseudonymousApplicationModel):
    features: Dict[str, float]
    sensitive_attributes: Optional[Dict[str, str]] = None
    actual_outcome: Optional[int] = Field(default=None, ge=0, le=1)


class PortfolioAnalysisRequest(BaseModel):
    applications: list[PortfolioApplicationIn]
    group_key: Optional[str] = None
    top_reason_count: int = Field(default=5, ge=1, le=10)


class PortfolioApplicationResult(BaseModel):
    application_id: str
    score: float
    decision: str
    reason_codes: list[str]


class PortfolioTopReason(BaseModel):
    code: str
    count: int
    description: str


class PortfolioSummary(BaseModel):
    total_applications: int
    average_score: float
    approval_rate: float
    decision_counts: Dict[str, int]
    score_bands: Dict[str, int]


class PortfolioAnalysisResponse(BaseModel):
    model_name: str
    model_version: str
    decision_threshold: float
    summary: PortfolioSummary
    top_reason_codes: list[PortfolioTopReason]
    applications: list[PortfolioApplicationResult]
    fairness: Optional[FairnessReportResponse] = None


class GovernanceControlResult(BaseModel):
    id: str
    label: str
    value: float
    threshold: float
    status: str


class GovernanceFairnessSnapshot(BaseModel):
    demographic_parity_difference: Optional[float] = None
    equal_opportunity_difference: Optional[float] = None
    groups: list[str] = Field(default_factory=list)


class GovernanceSummaryResponse(BaseModel):
    overall_status: str
    readiness: float
    event_count: int
    event_counts: Dict[str, int]
    decision_count: int
    approval_rate: float
    explanation_coverage: float
    outcome_coverage: float
    latest_fairness: GovernanceFairnessSnapshot
    controls: list[GovernanceControlResult]
