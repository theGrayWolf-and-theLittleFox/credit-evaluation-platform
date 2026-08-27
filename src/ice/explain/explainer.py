from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone
from typing import Dict, Optional

import numpy as np

from ice.features.contract import REFERENCE_PROFILE
from ice.models.base import CreditModel
from ice.types import ExplanationResult


def explain(model: CreditModel, x: np.ndarray) -> Optional[ExplanationResult]:
    """
    Return per-feature contributions if the model supports a lightweight explanation.

    Contributions are measured against the published reference profile, so they read as
    "how far this applicant's inputs move the log-odds relative to a typical applicant"
    and sum to exactly that difference. See ice.features.contract.REFERENCE_PROFILE.

    This avoids heavy dependencies by default; SHAP/LIME can be integrated as optional extras.
    """
    feature_names = list(model.contract.columns())
    reference = model.contract.reference_vector(REFERENCE_PROFILE)
    contrib = model.explain_linear(x, feature_names, reference=reference)
    if contrib is None:
        return None
    return ExplanationResult(
        application_id="",
        model_version=model.metadata.version,
        contributions=contrib,
        base_value=None,
        method="linear_proxy",
        created_at=datetime.now(timezone.utc),
    )


def explanation_to_dict(expl: ExplanationResult) -> Dict[str, object]:
    d = asdict(expl)
    d["created_at"] = expl.created_at.isoformat()
    return d


