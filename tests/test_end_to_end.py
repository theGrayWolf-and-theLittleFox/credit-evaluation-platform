from __future__ import annotations

from fastapi.testclient import TestClient

from scripts.generate_synth_data import make_synth
from ice.pipelines.train import train_baseline_from_dataframe


def test_train_and_monitoring_flow(tmp_path, monkeypatch):
    artifacts = tmp_path / "artifacts"
    model_path = artifacts / "models" / "baseline.joblib"
    registry_path = artifacts / "registry" / "model_registry.json"
    report_path = artifacts / "reports" / "latest_train_report.json"
    audit_log_path = artifacts / "audit" / "decisions.jsonl"

    df = make_synth(n=2000, seed=3)
    train_baseline_from_dataframe(
        df=df,
        label_col="label_good",
        artifact_path=str(model_path),
        registry_path=str(registry_path),
        report_path=str(report_path),
        version="0.0.1",
        decision_threshold=0.5,
    )

    monkeypatch.setenv("ICE_REGISTRY_PATH", str(registry_path))
    monkeypatch.setenv("ICE_CURRENT_MODEL_PATH", str(model_path))
    monkeypatch.setenv("ICE_AUDIT_LOG_PATH", str(audit_log_path))
    monkeypatch.setenv("ICE_ENABLE_SQLITE_AUDIT_STORE", "false")

    from services.api.app import app

    client = TestClient(app)
    health = client.get("/health")
    assert health.status_code == 200

    applicant_payload = {
        "application_id": "app_test",
        "features": {
            "rent_on_time_rate_12m": 0.96,
            "utility_on_time_rate_12m": 0.93,
            "avg_monthly_income_6m": 4500,
            "cashflow_volatility_6m": 0.12,
            "avg_daily_balance_6m": 1800,
            "nsf_events_12m": 0,
            "overdraft_events_12m": 0,
            "months_at_current_address": 24,
        },
        "sensitive_attributes": {"age_band": "25-34"},
    }
    score_response = client.post("/v1/score", json=applicant_payload)
    assert score_response.status_code == 200, score_response.text
    score_body = score_response.json()
    assert score_body["application_id"] == "app_test"
    assert 0.0 <= score_body["score"] <= 1.0
    assert score_body["decision"] in ("approve", "deny")
    assert isinstance(score_body["reason_codes"], list)

    explain_response = client.post(
        "/v1/explain",
        json={"application_id": "app_test", "features": applicant_payload["features"]},
    )
    assert explain_response.status_code == 200, explain_response.text
    explain_body = explain_response.json()
    assert explain_body["application_id"] == "app_test"
    assert explain_body["request_id"]
    assert "rent_on_time_rate_12m" in explain_body["contributions"]

    contract_response = client.get("/v1/features/contract")
    assert contract_response.status_code == 200, contract_response.text
    contract_body = contract_response.json()
    feature_names = [item["name"] for item in contract_body["feature_definitions"]]
    assert "rent_on_time_rate_12m" in feature_names
    assert "months_at_current_address" in feature_names

    fairness_response = client.post(
        "/v1/audit/fairness",
        json={
            "rows": [
                {"protected_group": "group_a", "y_true": 1, "y_pred": 1},
                {"protected_group": "group_a", "y_true": 0, "y_pred": 1},
                {"protected_group": "group_b", "y_true": 1, "y_pred": 0},
                {"protected_group": "group_b", "y_true": 1, "y_pred": 1},
            ],
            "positive_label": 1,
        },
    )
    assert fairness_response.status_code == 200, fairness_response.text
    fairness_body = fairness_response.json()
    assert fairness_body["groups"] == ["group_a", "group_b"]
    assert fairness_body["counts_by_group"] == {"group_a": 2, "group_b": 2}

    portfolio_response = client.post(
        "/v1/portfolio/analyze",
        json={
            "group_key": "age_band",
            "top_reason_count": 3,
            "applications": [
                applicant_payload | {"actual_outcome": 1},
                {
                    "application_id": "app_2",
                    "features": {
                        "rent_on_time_rate_12m": 0.82,
                        "utility_on_time_rate_12m": 0.84,
                        "avg_monthly_income_6m": 2800,
                        "cashflow_volatility_6m": 0.33,
                        "avg_daily_balance_6m": 450,
                        "nsf_events_12m": 1,
                        "overdraft_events_12m": 1,
                        "months_at_current_address": 6,
                    },
                    "sensitive_attributes": {"age_band": "18-24"},
                    "actual_outcome": 0,
                },
                {
                    "application_id": "app_3",
                    "features": {
                        "rent_on_time_rate_12m": 0.91,
                        "utility_on_time_rate_12m": 0.88,
                        "avg_monthly_income_6m": 3600,
                        "cashflow_volatility_6m": 0.21,
                        "avg_daily_balance_6m": 1100,
                        "nsf_events_12m": 0,
                        "overdraft_events_12m": 0,
                        "months_at_current_address": 12,
                    },
                    "sensitive_attributes": {"age_band": "25-34"},
                    "actual_outcome": 1,
                },
            ],
        },
    )
    assert portfolio_response.status_code == 200, portfolio_response.text
    portfolio_body = portfolio_response.json()
    assert portfolio_body["summary"]["total_applications"] == 3
    assert portfolio_body["top_reason_codes"]
    assert portfolio_body["fairness"] is not None

    outcome_response = client.post(
        "/v1/audit/events",
        json={"application_id": "app_test", "outcome_type": "repayment_90d", "outcome_value": 1},
    )
    assert outcome_response.status_code == 200, outcome_response.text
    assert outcome_response.json() == {"status": "ok"}

    invalid_outcome_response = client.post(
        "/v1/audit/events",
        json={"application_id": "app_test", "outcome_type": "unknown_window", "outcome_value": 1},
    )
    assert invalid_outcome_response.status_code == 422

    audit_response = client.get("/v1/audit/events?limit=10")
    assert audit_response.status_code == 200, audit_response.text
    audit_body = audit_response.json()
    assert audit_body["total"] >= 5
    event_types = {event["event_type"] for event in audit_body["events"]}
    assert {"decision", "explain", "fairness_report", "portfolio_analysis", "outcome"} <= event_types

    governance_response = client.get("/v1/governance/summary")
    assert governance_response.status_code == 200, governance_response.text
    governance_body = governance_response.json()
    assert governance_body["event_count"] >= 5
    assert governance_body["decision_count"] == 1
    assert governance_body["explanation_coverage"] == 1.0
    assert governance_body["outcome_coverage"] == 1.0
    assert governance_body["overall_status"] == "passing"
    assert len(governance_body["controls"]) == 4

    persisted_audit_text = audit_log_path.read_text(encoding="utf-8")
    assert '"application_id": "app_test"' not in persisted_audit_text
    assert "ref_" in persisted_audit_text
