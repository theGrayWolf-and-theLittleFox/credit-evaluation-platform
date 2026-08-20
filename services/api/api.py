from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ice.audit.events import DecisionEvent, GenericAuditEvent, OutcomeEvent
from ice.audit.store import (
    append_jsonl,
    hash_features,
    insert_sqlite_decision,
    insert_sqlite_outcome,
    list_jsonl_events,
    utcnow,
)
from services.api.analytics import analyze_portfolio, build_fairness_report, describe_contract, score_application
from services.api.governance import build_governance_summary
from services.api.privacy import hash_audit_identifier, validate_pseudonymous_reference
from services.api.schemas import (
    AuditEventListResponse,
    AuditEventRecord,
    ExplainRequest,
    ExplainResponse,
    FairnessReportRequest,
    FairnessReportResponse,
    FeatureContractResponse,
    GovernanceSummaryResponse,
    ModelInfo,
    OutcomeEventIn,
    PortfolioAnalysisRequest,
    PortfolioAnalysisResponse,
    ScoreRequest,
    ScoreResponse,
)
from services.api.security import require_api_key
from services.api.settings import api_settings
from services.api.storage import ModelStore


router = APIRouter(prefix="/v1", dependencies=[Depends(require_api_key)])


def _store() -> ModelStore:
    settings = api_settings()
    return ModelStore(registry_path=settings.registry_path, fallback_model_path=settings.current_model_path)


def _load_current_model():
    try:
        return _store().load_current_model()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def _audit_application_id(application_id: str) -> str:
    settings = api_settings()
    application_id = validate_pseudonymous_reference(application_id)
    if not settings.hash_audit_identifiers:
        return application_id
    return hash_audit_identifier(application_id, settings.audit_identifier_salt)


def _score_response(req: ScoreRequest, request_id: str, created_at: datetime) -> ScoreResponse:
    settings = api_settings()
    model = _load_current_model()
    try:
        result = score_application(
            model=model,
            application_id=req.application_id,
            features=req.features,
            decision_threshold=settings.decision_threshold,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    event = DecisionEvent(
        event_type="decision",
        application_id=_audit_application_id(req.application_id),
        request_id=request_id,
        model_name=model.metadata.name,
        model_version=model.metadata.version,
        decision=result.decision,
        score=result.score,
        decision_threshold=float(settings.decision_threshold),
        reason_codes=result.reason_codes,
        created_at=created_at,
        features=result.features if settings.log_raw_features else None,
        features_hash=hash_features(result.features),
        sensitive_attributes=req.sensitive_attributes if settings.store_sensitive_for_monitoring else None,
        extra={},
    )
    append_jsonl(settings.audit_log_path, event)
    if settings.enable_sqlite_audit_store:
        insert_sqlite_decision(settings.audit_sqlite_path, event)

    return ScoreResponse(
        application_id=req.application_id,
        request_id=request_id,
        model_name=model.metadata.name,
        model_version=model.metadata.version,
        feature_schema_hash=model.metadata.feature_schema_hash,
        score=result.score,
        decision=result.decision,
        decision_threshold=float(settings.decision_threshold),
        reason_codes=result.reason_codes,
        created_at=created_at.replace(tzinfo=timezone.utc).isoformat(),
        extra={},
    )


@router.get("/models/current", response_model=ModelInfo)
def get_current_model_info() -> dict:
    return _store().model_info()


@router.get("/features/contract", response_model=FeatureContractResponse)
def get_feature_contract() -> FeatureContractResponse:
    settings = api_settings()
    model = _load_current_model()
    return FeatureContractResponse(
        model_name=model.metadata.name,
        model_version=model.metadata.version,
        feature_schema_hash=model.metadata.feature_schema_hash,
        decision_threshold=float(settings.decision_threshold),
        feature_definitions=describe_contract(model),
    )


@router.post("/score", response_model=ScoreResponse)
def score(req: ScoreRequest) -> ScoreResponse:
    request_id = req.request_id or str(uuid.uuid4())
    return _score_response(req, request_id=request_id, created_at=utcnow())


@router.post("/explain", response_model=ExplainResponse)
def explain_endpoint(req: ExplainRequest) -> ExplainResponse:
    settings = api_settings()
    model = _load_current_model()
    try:
        result = score_application(
            model=model,
            application_id=req.application_id,
            features=req.features,
            decision_threshold=settings.decision_threshold,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if result.contributions is None:
        raise HTTPException(status_code=501, detail="Explanation not available for current model.")

    created_at = utcnow()
    request_id = str(uuid.uuid4())
    append_jsonl(
        settings.audit_log_path,
        GenericAuditEvent(
            event_type="explain",
            created_at=created_at,
            request_id=request_id,
            application_id=_audit_application_id(req.application_id),
            model_name=model.metadata.name,
            model_version=model.metadata.version,
            payload={
                "score": result.score,
                "reason_codes": result.reason_codes,
                "contribution_count": len(result.contributions),
            },
        ),
    )

    return ExplainResponse(
        application_id=req.application_id,
        request_id=request_id,
        model_name=model.metadata.name,
        model_version=model.metadata.version,
        method="linear_proxy",
        created_at=created_at.replace(tzinfo=timezone.utc).isoformat(),
        contributions=result.contributions,
        base_value=None,
    )


@router.post("/portfolio/analyze", response_model=PortfolioAnalysisResponse)
def analyze_portfolio_endpoint(req: PortfolioAnalysisRequest) -> PortfolioAnalysisResponse:
    settings = api_settings()
    model = _load_current_model()
    try:
        analysis = analyze_portfolio(
            model=model,
            applications=[application.model_dump() for application in req.applications],
            decision_threshold=settings.decision_threshold,
            group_key=req.group_key,
            top_reason_count=req.top_reason_count,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    append_jsonl(
        settings.audit_log_path,
        GenericAuditEvent(
            event_type="portfolio_analysis",
            created_at=utcnow(),
            request_id=str(uuid.uuid4()),
            model_name=model.metadata.name,
            model_version=model.metadata.version,
            payload={
                "n_applications": len(req.applications),
                "group_key": req.group_key,
                "average_score": analysis["summary"]["average_score"],
                "approval_rate": analysis["summary"]["approval_rate"],
                "decision_counts": analysis["summary"]["decision_counts"],
                "fairness_available": analysis["fairness"] is not None,
            },
        ),
    )

    return PortfolioAnalysisResponse(
        model_name=model.metadata.name,
        model_version=model.metadata.version,
        decision_threshold=float(settings.decision_threshold),
        summary=analysis["summary"],
        top_reason_codes=analysis["top_reason_codes"],
        applications=analysis["applications"],
        fairness=analysis["fairness"],
    )


@router.post("/audit/fairness", response_model=FairnessReportResponse)
def fairness_report(req: FairnessReportRequest) -> FairnessReportResponse:
    settings = api_settings()
    report = build_fairness_report([row.model_dump() for row in req.rows], positive_label=req.positive_label)

    append_jsonl(
        settings.audit_log_path,
        GenericAuditEvent(
            event_type="fairness_report",
            created_at=utcnow(),
            request_id=str(uuid.uuid4()),
            payload={
                "n_rows": len(req.rows),
                "positive_label": req.positive_label,
                "groups": report["groups"],
                "demographic_parity_difference": report["demographic_parity_difference"],
                "equal_opportunity_difference": report["equal_opportunity_difference"],
            },
        ),
    )

    return FairnessReportResponse(**report)


@router.get("/audit/events", response_model=AuditEventListResponse)
def audit_events(
    limit: int = 100,
    offset: int = 0,
    event_type: str | None = None,
    application_id: str | None = None,
    request_id: str | None = None,
    model_version: str | None = None,
) -> AuditEventListResponse:
    settings = api_settings()
    bounded_limit = max(1, min(int(limit), 250))
    bounded_offset = max(0, int(offset))
    result = list_jsonl_events(
        settings.audit_log_path,
        limit=bounded_limit,
        offset=bounded_offset,
        event_type=event_type,
        application_id=_audit_application_id(application_id) if application_id else None,
        request_id=request_id,
        model_version=model_version,
    )
    return AuditEventListResponse(
        total=result["total"],
        limit=bounded_limit,
        offset=bounded_offset,
        events=[AuditEventRecord(**event) for event in result["events"]],
    )


@router.get("/governance/summary", response_model=GovernanceSummaryResponse)
def governance_summary() -> GovernanceSummaryResponse:
    settings = api_settings()
    result = list_jsonl_events(settings.audit_log_path, limit=250, offset=0)
    return GovernanceSummaryResponse(**build_governance_summary(result["events"]))


@router.post("/audit/events")
def ingest_outcome(event_in: OutcomeEventIn) -> dict:
    settings = api_settings()
    event = OutcomeEvent(
        event_type="outcome",
        application_id=_audit_application_id(event_in.application_id),
        outcome_type=event_in.outcome_type,
        outcome_value=int(event_in.outcome_value),
        created_at=utcnow(),
        extra=event_in.extra,
    )
    append_jsonl(settings.audit_log_path, event)
    if settings.enable_sqlite_audit_store:
        insert_sqlite_outcome(settings.audit_sqlite_path, event)
    return {"status": "ok"}
