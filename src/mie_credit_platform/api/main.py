from __future__ import annotations

import logging
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request

from mie_credit_platform.audit import AuditEvent, AuditLogger, build_redactor_from_settings, now_ts
from mie_credit_platform.api.middleware import get_or_create_request_id
from mie_credit_platform.api.security import require_api_key
from mie_credit_platform.governance.registry import list_models, load_approved_model
from mie_credit_platform.modeling.fairness import (
    demographic_parity_difference,
    equal_opportunity_difference,
    selection_rates_by_group,
    tpr_by_group,
)
from mie_credit_platform.modeling.schemas import (
    AuditEventListResponse,
    AuditEventRecord,
    ExplainRequest,
    ExplainResponse,
    FairnessReportRequest,
    FairnessReportResponse,
    FeatureContribution,
    ScoreRequest,
    ScoreResponse,
)
from mie_credit_platform.modeling.scoring import score_applicant
from mie_credit_platform.settings import Settings, get_settings
from mie_credit_platform.telemetry import configure_logging


logger = logging.getLogger("mie.api")


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(
        title="MIE Credit Evaluation Platform",
        version="0.1.0",
        description="Open-source responsible credit evaluation scaffold (alternative data, audit, explainability).",
    )

    @app.on_event("startup")
    def _startup() -> None:
        settings = get_settings()
        app.state.settings = settings
        redactor = build_redactor_from_settings(settings)
        app.state.audit = AuditLogger(settings.audit_db_path, settings.audit_jsonl_path, redactor=redactor)
        # Load model package at startup
        try:
            require_approval = settings.environment.lower() != "dev"
            app.state.model_pkg = load_approved_model(
                settings.model_registry_dir, settings.model_version, require_approval=require_approval
            )
        except Exception as e:
            # API can still start for /health and /v1/models, but scoring will fail.
            app.state.model_pkg = None
            logger.error("model_load_failed", extra={"error": str(e)})

    @app.get("/health")
    def health() -> dict[str, Any]:
        settings: Settings = app.state.settings
        redactor = getattr(getattr(app.state, "audit", None), "redactor", None)
        return {
            "status": "ok",
            "environment": settings.environment,
            "model_version": settings.model_version,
            "model_loaded": app.state.model_pkg is not None,
            "audit_redaction": {
                "allow_payload_keys": sorted(redactor.allow_payload_keys) if redactor else None,
                "hash_applicant_id": getattr(redactor, "hash_applicant_id", None),
                "remove_applicant_id": getattr(redactor, "remove_applicant_id", None),
            },
        }

    @app.get("/v1/models", dependencies=[Depends(require_api_key)])
    def models() -> dict[str, Any]:
        settings: Settings = app.state.settings
        return {
            "registry_dir": settings.model_registry_dir,
            "active_model_version": settings.model_version,
            "models": [m.__dict__ for m in list_models(settings.model_registry_dir)],
        }

    @app.post("/v1/score", response_model=ScoreResponse, dependencies=[Depends(require_api_key)])
    def score(req: ScoreRequest, request: Request) -> ScoreResponse:
        rid = get_or_create_request_id(request)
        settings: Settings = app.state.settings
        pkg = app.state.model_pkg
        if pkg is None:
            raise HTTPException(status_code=503, detail="Model not loaded")

        result, explanation = score_applicant(pkg, req.features.model_dump(), settings.approval_threshold)

        # Audit event (minimal by default)
        payload: dict[str, Any] = {
            "score": result.score,
            "decision": result.decision,
            "reason_codes": result.reason_codes,
        }
        if settings.audit_log_request_bodies:
            payload["features"] = req.features.model_dump()
            if req.audit_context is not None:
                payload["audit_context"] = req.audit_context.model_dump()
        app.state.audit.write(
            AuditEvent(
                ts=now_ts(),
                request_id=rid,
                event_type="score",
                model_version=pkg.version,
                applicant_id=req.applicant_id,
                payload=payload,
            )
        )

        return ScoreResponse(
            request_id=rid,
            model_version=pkg.version,
            score=result.score,
            decision=result.decision,
            reason_codes=result.reason_codes,
        )

    @app.post("/v1/explain", response_model=ExplainResponse, dependencies=[Depends(require_api_key)])
    def explain(req: ExplainRequest, request: Request) -> ExplainResponse:
        rid = get_or_create_request_id(request)
        settings: Settings = app.state.settings
        pkg = app.state.model_pkg
        if pkg is None:
            raise HTTPException(status_code=503, detail="Model not loaded")
        _, explanation = score_applicant(pkg, req.features.model_dump(), settings.approval_threshold)
        contrib = [
            FeatureContribution(**row) for row in explanation.get("contributions", []) if isinstance(row, dict)
        ]
        score = float(explanation.get("score_from_explanation", 0.0))
        base = float(explanation.get("base_value", 0.0))
        # Audit explain (no feature payload unless explicitly enabled)
        audit_payload: dict[str, Any] = {"score": score, "base_value": base}
        if settings.audit_log_request_bodies:
            audit_payload["features"] = req.features.model_dump()
        app.state.audit.write(
            AuditEvent(
                ts=now_ts(),
                request_id=rid,
                event_type="explain",
                model_version=pkg.version,
                applicant_id=req.applicant_id,
                payload=audit_payload,
            )
        )
        return ExplainResponse(
            request_id=rid, model_version=pkg.version, score=score, base_value=base, contributions=contrib
        )

    @app.post("/v1/audit/fairness", response_model=FairnessReportResponse, dependencies=[Depends(require_api_key)])
    def fairness(req: FairnessReportRequest, request: Request) -> FairnessReportResponse:
        rid = get_or_create_request_id(request)
        groups = [r.protected_group for r in req.rows]
        y_true = [r.y_true for r in req.rows]
        y_pred = [r.y_pred for r in req.rows]
        sel = selection_rates_by_group(groups, y_pred, positive_label=req.positive_label)
        tpr = tpr_by_group(groups, y_true, y_pred, positive_label=req.positive_label)
        out = FairnessReportResponse(
            groups=sorted(set(groups)),
            demographic_parity_difference=demographic_parity_difference(sel),
            equal_opportunity_difference=equal_opportunity_difference(tpr),
            selection_rate_by_group=sel,
            tpr_by_group=tpr,
        )
        # Audit fairness (aggregate only)
        app.state.audit.write(
            AuditEvent(
                ts=now_ts(),
                request_id=rid,
                event_type="fairness_report",
                model_version=getattr(app.state.model_pkg, "version", None) if app.state.model_pkg else None,
                applicant_id=None,
                payload={
                    "n_rows": len(req.rows),
                    "positive_label": req.positive_label,
                    "demographic_parity_difference": out.demographic_parity_difference,
                    "equal_opportunity_difference": out.equal_opportunity_difference,
                },
            )
        )
        return out

    @app.get(
        "/v1/audit/events",
        response_model=AuditEventListResponse,
        dependencies=[Depends(require_api_key)],
    )
    def list_audit_events(
        limit: int = 100,
        offset: int = 0,
        since_ts: float | None = None,
        until_ts: float | None = None,
        request_id: str | None = None,
        event_type: str | None = None,
        applicant_id: str | None = None,
        model_version: str | None = None,
    ) -> AuditEventListResponse:
        audit: AuditLogger = app.state.audit
        total = audit.count(
            since_ts=since_ts,
            until_ts=until_ts,
            request_id=request_id,
            event_type=event_type,
            applicant_id=applicant_id,
            model_version=model_version,
        )
        events = audit.query(
            limit=limit,
            offset=offset,
            since_ts=since_ts,
            until_ts=until_ts,
            request_id=request_id,
            event_type=event_type,
            applicant_id=applicant_id,
            model_version=model_version,
        )
        return AuditEventListResponse(
            total=total,
            limit=max(1, min(int(limit), 1000)),
            offset=max(0, int(offset)),
            events=[AuditEventRecord(**e.__dict__) for e in events],
        )

    return app


app = create_app()


