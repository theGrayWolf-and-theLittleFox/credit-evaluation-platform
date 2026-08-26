from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Dict, Optional, Sequence

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression

from ice.features.contract import DEFAULT_CONTRACT, FeatureContract
from ice.models.base import CreditModel, ModelMetadata


@dataclass(frozen=True)
class SklearnLogRegBundle:
    model: LogisticRegression
    contract: FeatureContract
    name: str
    version: str
    decision_threshold: float


class SklearnLogRegCreditModel(CreditModel):
    def __init__(self, bundle: SklearnLogRegBundle) -> None:
        self._bundle = bundle
        self._meta = ModelMetadata(
            name=bundle.name,
            version=bundle.version,
            feature_schema_hash=bundle.contract.schema_hash(),
            decision_threshold=bundle.decision_threshold,
        )

    @property
    def contract(self) -> FeatureContract:
        return self._bundle.contract

    @property
    def metadata(self) -> ModelMetadata:
        return self._meta

    def predict_proba(self, x: np.ndarray) -> float:
        proba = self._bundle.model.predict_proba(x.reshape(1, -1))[0, 1]
        return float(proba)

    def explain_linear(
        self,
        x: np.ndarray,
        feature_names: list[str],
        reference: Optional[Sequence[float]] = None,
    ) -> Optional[Dict[str, float]]:
        """
        Per-feature contribution for a linear model.

        With a reference profile, each contribution is coef * (value - reference), so
        the values sum exactly to the difference in log-odds between this applicant and
        the reference applicant. Reporting coef * value instead makes every explanation
        look the same: an unscaled feature such as monthly income dominates purely
        because of its magnitude, and a feature whose value is zero contributes nothing
        no matter how heavily it is weighted.

        Without a reference the raw coef * value proxy is returned, which is kept only
        for backwards compatibility with callers that predate the reference profile.
        """
        coef = self._bundle.model.coef_.reshape(-1)
        if reference is None:
            return {fn: float(coef[i] * x[i]) for i, fn in enumerate(feature_names)}
        return {fn: float(coef[i] * (x[i] - reference[i])) for i, fn in enumerate(feature_names)}


def save_bundle(path: str, bundle: SklearnLogRegBundle) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(bundle, path)


def load_bundle(path: str) -> SklearnLogRegBundle:
    bundle = joblib.load(path)
    if not isinstance(bundle, SklearnLogRegBundle):
        raise TypeError(f"Expected SklearnLogRegBundle at {path}, got {type(bundle)}")
    return bundle


def new_untrained_bundle(version: str = "0.0.1", decision_threshold: float = 0.5) -> SklearnLogRegBundle:
    model = LogisticRegression(max_iter=200)
    return SklearnLogRegBundle(
        model=model,
        contract=DEFAULT_CONTRACT,
        name="sklearn_logreg_baseline",
        version=version,
        decision_threshold=decision_threshold,
    )

