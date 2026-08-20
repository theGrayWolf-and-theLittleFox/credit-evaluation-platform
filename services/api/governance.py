from __future__ import annotations

from collections import Counter
from typing import Any, Iterable


def _event_payload(event: dict[str, Any]) -> dict[str, Any]:
    payload = event.get("payload")
    return payload if isinstance(payload, dict) else {}


def _bounded_rate(numerator: int, denominator: int) -> float:
    return round(numerator / denominator, 4) if denominator else 0.0


def build_governance_summary(events: Iterable[dict[str, Any]]) -> dict[str, Any]:
    """Build an operational governance snapshot from append-only audit events.

    The summary deliberately distinguishes a passing control from a control with
    insufficient evidence. A quiet system is not automatically a healthy one.
    """
    event_list = list(events)
    counts = Counter(str(event.get("event_type", "unknown")) for event in event_list)
    decisions = [event for event in event_list if event.get("event_type") == "decision"]
    explanations = [event for event in event_list if event.get("event_type") == "explain"]
    outcomes = [event for event in event_list if event.get("event_type") == "outcome"]
    fairness_reports = [event for event in event_list if event.get("event_type") == "fairness_report"]

    decision_applications = {
        str(event["application_id"]) for event in decisions if event.get("application_id")
    }
    explained_applications = {
        str(event["application_id"]) for event in explanations if event.get("application_id")
    }
    outcome_applications = {
        str(event["application_id"]) for event in outcomes if event.get("application_id")
    }

    approvals = sum(1 for event in decisions if _event_payload(event).get("decision") == "approve")
    explanation_coverage = _bounded_rate(
        len(decision_applications & explained_applications), len(decision_applications)
    )
    outcome_coverage = _bounded_rate(
        len(decision_applications & outcome_applications), len(decision_applications)
    )

    latest_fairness = _event_payload(fairness_reports[0]) if fairness_reports else {}
    parity_difference = latest_fairness.get("demographic_parity_difference")
    opportunity_difference = latest_fairness.get("equal_opportunity_difference")
    fairness_status = "insufficient_data"
    if isinstance(parity_difference, (int, float)) and isinstance(
        opportunity_difference, (int, float)
    ):
        fairness_status = (
            "passing"
            if abs(float(parity_difference)) <= 0.10
            and abs(float(opportunity_difference)) <= 0.10
            else "review"
        )

    controls = [
        {
            "id": "explanation_coverage",
            "label": "Decision explanation coverage",
            "value": explanation_coverage,
            "threshold": 0.95,
            "status": (
                "insufficient_data"
                if not decisions
                else "passing" if explanation_coverage >= 0.95 else "review"
            ),
        },
        {
            "id": "outcome_coverage",
            "label": "Observed outcome coverage",
            "value": outcome_coverage,
            "threshold": 0.80,
            "status": (
                "insufficient_data"
                if not decisions
                else "passing" if outcome_coverage >= 0.80 else "review"
            ),
        },
        {
            "id": "fairness_threshold",
            "label": "Latest fairness threshold review",
            "value": max(
                abs(float(parity_difference or 0.0)),
                abs(float(opportunity_difference or 0.0)),
            ),
            "threshold": 0.10,
            "status": fairness_status,
        },
        {
            "id": "audit_integrity",
            "label": "Decision audit capture",
            "value": 1.0 if decisions else 0.0,
            "threshold": 1.0,
            "status": "passing" if decisions else "insufficient_data",
        },
    ]

    passing = sum(1 for control in controls if control["status"] == "passing")
    readiness = round(passing / len(controls), 4)
    overall_status = (
        "review"
        if any(control["status"] == "review" for control in controls)
        else "insufficient_data"
        if any(control["status"] == "insufficient_data" for control in controls)
        else "passing"
    )

    return {
        "overall_status": overall_status,
        "readiness": readiness,
        "event_count": len(event_list),
        "event_counts": dict(sorted(counts.items())),
        "decision_count": len(decisions),
        "approval_rate": _bounded_rate(approvals, len(decisions)),
        "explanation_coverage": explanation_coverage,
        "outcome_coverage": outcome_coverage,
        "latest_fairness": {
            "demographic_parity_difference": parity_difference,
            "equal_opportunity_difference": opportunity_difference,
            "groups": latest_fairness.get("groups", []),
        },
        "controls": controls,
    }
