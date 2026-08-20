from __future__ import annotations

from services.api.governance import build_governance_summary


def test_governance_summary_does_not_treat_missing_evidence_as_passing():
    summary = build_governance_summary([])

    assert summary["overall_status"] == "insufficient_data"
    assert summary["readiness"] == 0.0
    assert all(control["status"] == "insufficient_data" for control in summary["controls"])


def test_governance_summary_flags_fairness_threshold_breach():
    events = [
        {
            "event_type": "decision",
            "application_id": "app-1",
            "payload": {"decision": "approve"},
        },
        {"event_type": "explain", "application_id": "app-1", "payload": {}},
        {"event_type": "outcome", "application_id": "app-1", "payload": {}},
        {
            "event_type": "fairness_report",
            "payload": {
                "demographic_parity_difference": 0.14,
                "equal_opportunity_difference": 0.05,
                "groups": ["a", "b"],
            },
        },
    ]

    summary = build_governance_summary(events)
    fairness_control = next(
        control for control in summary["controls"] if control["id"] == "fairness_threshold"
    )

    assert summary["overall_status"] == "review"
    assert fairness_control["status"] == "review"
    assert fairness_control["value"] == 0.14
