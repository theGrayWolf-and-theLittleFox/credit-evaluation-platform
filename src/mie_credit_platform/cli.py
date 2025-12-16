from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import typer

from mie_credit_platform.governance.registry import approve_model, list_models
from mie_credit_platform.governance.registry import load_approved_model
from mie_credit_platform.audit import AuditLogger, build_redactor_from_settings
from mie_credit_platform.modeling.scoring import score_applicant
from mie_credit_platform.modeling.train import TrainConfig, train_baseline_logreg
from mie_credit_platform.settings import get_settings


app = typer.Typer(help="MIE Credit Platform CLI (training, registry, governance).")


@app.command()
def train(
    out: str = typer.Option("models", help="Model registry output directory."),
    version: str = typer.Option("v0.1.0", help="Model version string."),
    n: int = typer.Option(8000, help="Number of synthetic rows (demo only)."),
    seed: int = typer.Option(7, help="Random seed."),
) -> None:
    """
    Train a demo baseline model on synthetic data and write a versioned model package.
    """

    res = train_baseline_logreg(TrainConfig(version=version, registry_dir=out, n_synth=n, seed=seed))
    typer.echo(json.dumps(res, indent=2))


@app.command("list-models")
def list_models_cmd(registry_dir: Optional[str] = typer.Option(None, help="Registry directory.")) -> None:
    settings = get_settings()
    d = registry_dir or settings.model_registry_dir
    models = list_models(d)
    typer.echo(json.dumps([m.__dict__ for m in models], indent=2))


@app.command("approve-model")
def approve_model_cmd(
    version: str = typer.Argument(..., help="Model version to approve."),
    registry_dir: Optional[str] = typer.Option(None, help="Registry directory."),
    approved: bool = typer.Option(True, help="Set approved true/false."),
) -> None:
    settings = get_settings()
    d = registry_dir or settings.model_registry_dir
    approve_model(d, version, approved=approved)
    typer.echo(json.dumps({"version": version, "approved": approved, "registry_dir": d}, indent=2))


@app.command("show-model-card")
def show_model_card(
    version: str = typer.Argument(..., help="Model version."),
    registry_dir: Optional[str] = typer.Option(None, help="Registry directory."),
) -> None:
    settings = get_settings()
    d = Path(registry_dir or settings.model_registry_dir) / version / "model_card.md"
    if not d.exists():
        raise typer.Exit(code=2)
    typer.echo(d.read_text(encoding="utf-8"))


@app.command()
def score(
    applicant_id: str = typer.Option(..., help="Applicant identifier."),
    features_json: Optional[str] = typer.Option(None, help="Features as a JSON string."),
    features_path: Optional[str] = typer.Option(None, help="Path to a JSON file of features."),
    threshold: Optional[float] = typer.Option(None, help="Approval threshold (overrides settings)."),
    registry_dir: Optional[str] = typer.Option(None, help="Registry directory."),
    version: Optional[str] = typer.Option(None, help="Model version (overrides settings)."),
    require_approval: Optional[bool] = typer.Option(
        None, help="Require model approval (defaults to env!=dev)."
    ),
) -> None:
    """
    Score an applicant using the active model package.
    """
    settings = get_settings()
    d = registry_dir or settings.model_registry_dir
    v = version or settings.model_version
    req_approval = (
        require_approval if require_approval is not None else settings.environment.lower() != "dev"
    )
    pkg = load_approved_model(d, v, require_approval=req_approval)

    if not features_json and not features_path:
        raise typer.BadParameter("Provide either --features-json or --features-path")
    if features_json and features_path:
        raise typer.BadParameter("Provide only one of --features-json or --features-path")

    if features_path:
        features = json.loads(Path(features_path).read_text(encoding="utf-8"))
    else:
        features = json.loads(features_json or "{}")
    if not isinstance(features, dict):
        raise typer.BadParameter("Features must be a JSON object/dict")

    th = float(threshold if threshold is not None else settings.approval_threshold)
    res, explanation = score_applicant(pkg, {str(k): float(v) for k, v in features.items()}, th)
    typer.echo(
        json.dumps(
            {
                "applicant_id": applicant_id,
                "model_version": pkg.version,
                "score": res.score,
                "decision": res.decision,
                "reason_codes": res.reason_codes,
                "explanation": explanation,
            },
            indent=2,
        )
    )


@app.command()
def explain(
    applicant_id: str = typer.Option(..., help="Applicant identifier."),
    features_json: Optional[str] = typer.Option(None, help="Features as a JSON string."),
    features_path: Optional[str] = typer.Option(None, help="Path to a JSON file of features."),
    registry_dir: Optional[str] = typer.Option(None, help="Registry directory."),
    version: Optional[str] = typer.Option(None, help="Model version (overrides settings)."),
    require_approval: Optional[bool] = typer.Option(
        None, help="Require model approval (defaults to env!=dev)."
    ),
) -> None:
    """
    Produce a best-effort explanation (linear models only).
    """
    settings = get_settings()
    d = registry_dir or settings.model_registry_dir
    v = version or settings.model_version
    req_approval = (
        require_approval if require_approval is not None else settings.environment.lower() != "dev"
    )
    pkg = load_approved_model(d, v, require_approval=req_approval)

    if not features_json and not features_path:
        raise typer.BadParameter("Provide either --features-json or --features-path")
    if features_json and features_path:
        raise typer.BadParameter("Provide only one of --features-json or --features-path")

    if features_path:
        features = json.loads(Path(features_path).read_text(encoding="utf-8"))
    else:
        features = json.loads(features_json or "{}")
    if not isinstance(features, dict):
        raise typer.BadParameter("Features must be a JSON object/dict")

    _, explanation = score_applicant(
        pkg, {str(k): float(v) for k, v in features.items()}, settings.approval_threshold
    )
    typer.echo(json.dumps({"applicant_id": applicant_id, "model_version": pkg.version, **explanation}, indent=2))


@app.command("audit-events")
def audit_events(
    limit: int = typer.Option(50, help="Max events to return (<=1000)."),
    offset: int = typer.Option(0, help="Pagination offset."),
    since_ts: Optional[float] = typer.Option(None, help="Filter: ts >= since_ts."),
    until_ts: Optional[float] = typer.Option(None, help="Filter: ts <= until_ts."),
    request_id: Optional[str] = typer.Option(None, help="Filter by request id."),
    event_type: Optional[str] = typer.Option(None, help="Filter by event type."),
    applicant_id: Optional[str] = typer.Option(None, help="Filter by applicant id."),
    model_version: Optional[str] = typer.Option(None, help="Filter by model version."),
    audit_db_path: Optional[str] = typer.Option(None, help="Override audit sqlite path."),
) -> None:
    """
    List audit events from the SQLite audit store.
    """
    settings = get_settings()
    audit = AuditLogger(
        audit_db_path or settings.audit_db_path,
        settings.audit_jsonl_path,
        redactor=build_redactor_from_settings(settings),
    )
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
    typer.echo(
        json.dumps(
            {
                "total": total,
                "limit": max(1, min(int(limit), 1000)),
                "offset": max(0, int(offset)),
                "events": [e.__dict__ for e in events],
            },
            indent=2,
        )
    )


@app.command("audit-export")
def audit_export(
    out_path: str = typer.Argument(..., help="Output JSONL path."),
    since_ts: Optional[float] = typer.Option(None, help="Filter: ts >= since_ts."),
    until_ts: Optional[float] = typer.Option(None, help="Filter: ts <= until_ts."),
    request_id: Optional[str] = typer.Option(None, help="Filter by request id."),
    event_type: Optional[str] = typer.Option(None, help="Filter by event type."),
    applicant_id: Optional[str] = typer.Option(None, help="Filter by applicant id."),
    model_version: Optional[str] = typer.Option(None, help="Filter by model version."),
    audit_db_path: Optional[str] = typer.Option(None, help="Override audit sqlite path."),
) -> None:
    """
    Export audit events to a JSONL file.
    """
    settings = get_settings()
    audit = AuditLogger(
        audit_db_path or settings.audit_db_path,
        settings.audit_jsonl_path,
        redactor=build_redactor_from_settings(settings),
    )
    n = audit.export_jsonl(
        out_path,
        since_ts=since_ts,
        until_ts=until_ts,
        request_id=request_id,
        event_type=event_type,
        applicant_id=applicant_id,
        model_version=model_version,
    )
    typer.echo(json.dumps({"out_path": out_path, "rows_written": n}, indent=2))


