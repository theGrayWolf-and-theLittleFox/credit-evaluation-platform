from __future__ import annotations

from pydantic import BaseModel, Field, PositiveInt


class ApplicantFeatures(BaseModel):
    """
    Intentionally excludes protected-class attributes.

    These are example, interpretable alternative-data features. In a real deployment,
    feature definitions must be documented, validated, and governed.
    """

    rent_on_time_ratio_12m: float = Field(ge=0, le=1, description="Share of rent payments on time in last 12 months.")
    utilities_on_time_ratio_12m: float = Field(
        ge=0, le=1, description="Share of utility payments on time in last 12 months."
    )
    cashflow_volatility_90d: float = Field(
        ge=0, le=5, description="Normalized volatility of cash flow over last 90 days (higher = more volatile)."
    )
    income_stability_6m: float = Field(
        ge=0, le=1, description="Stability score of income over last 6 months (higher = more stable)."
    )
    avg_monthly_net_inflow_6m: float = Field(
        ge=-10000, le=100000, description="Average monthly net inflow over last 6 months."
    )
    avg_daily_balance_90d: float = Field(ge=-5000, le=100000, description="Average daily balance (90d).")
    overdraft_count_12m: int = Field(ge=0, le=50, description="Overdraft count over last 12 months.")
    months_at_address: PositiveInt = Field(le=240, description="Months at current address.")


class AuditContext(BaseModel):
    """
    Optional context for fairness auditing and monitoring.

    IMPORTANT:
    - This should NOT be used as input to the credit model itself.
    - Collect and process under appropriate legal and governance controls.
    """

    # Example buckets; keep categorical to reduce sensitivity.
    age_band: str | None = Field(default=None, description="E.g., '18-24', '25-34', ...")
    race_ethnicity: str | None = Field(default=None, description="Self-reported categories (if applicable).")
    sex: str | None = Field(default=None, description="Self-reported categories (if applicable).")


class ScoreRequest(BaseModel):
    applicant_id: str = Field(min_length=1, max_length=128)
    features: ApplicantFeatures
    audit_context: AuditContext | None = None


class ScoreResponse(BaseModel):
    request_id: str
    model_version: str
    score: float = Field(ge=0, le=1)
    decision: str = Field(description="APPROVE or REVIEW")
    reason_codes: list[str] = Field(description="Human-readable reason codes derived from model explanation.")


class ExplainRequest(BaseModel):
    applicant_id: str = Field(min_length=1, max_length=128)
    features: ApplicantFeatures


class FeatureContribution(BaseModel):
    feature: str
    value: float
    weight: float
    contribution: float


class ExplainResponse(BaseModel):
    request_id: str
    model_version: str
    score: float = Field(ge=0, le=1)
    base_value: float
    contributions: list[FeatureContribution]


class FairnessRow(BaseModel):
    protected_group: str = Field(min_length=1, max_length=128)
    y_true: int = Field(ge=0, le=1)
    y_pred: int = Field(ge=0, le=1)


class FairnessReportRequest(BaseModel):
    rows: list[FairnessRow]
    positive_label: int = 1


class FairnessReportResponse(BaseModel):
    groups: list[str]
    demographic_parity_difference: float
    equal_opportunity_difference: float
    selection_rate_by_group: dict[str, float]
    tpr_by_group: dict[str, float]


class AuditEventRecord(BaseModel):
    """
    Normalized shape for audit events returned by the API.
    """

    id: int
    ts: float
    request_id: str
    event_type: str
    model_version: str | None
    applicant_id: str | None
    payload: dict


class AuditEventListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    events: list[AuditEventRecord]


