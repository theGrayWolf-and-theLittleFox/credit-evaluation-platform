from __future__ import annotations

import math

import numpy as np

from ice.explain.explainer import explain
from ice.features.contract import DEFAULT_CONTRACT, REFERENCE_PROFILE
from ice.models.sklearn_logreg import SklearnLogRegBundle, SklearnLogRegCreditModel
from services.api.analytics import FEATURE_METADATA

from sklearn.linear_model import LogisticRegression


def _fitted_model() -> SklearnLogRegCreditModel:
    """
    A tiny deterministic model so the test does not depend on trained artifacts.

    Features are sampled on their real scales (income in dollars, rates in 0..1) so the
    fitted coefficients are realistic and predict_proba does not saturate at 0 or 1.
    """
    rng = np.random.default_rng(11)
    n = 400
    x = np.column_stack(
        [
            rng.beta(20, 2, n),  # rent on-time rate
            rng.beta(18, 3, n),  # utility on-time rate
            rng.lognormal(8.1, 0.35, n),  # monthly income
            rng.beta(2, 8, n),  # cashflow volatility
            rng.lognormal(7.4, 0.55, n),  # average daily balance
            rng.poisson(0.15, n).astype(float),  # nsf events
            rng.poisson(0.10, n).astype(float),  # overdraft events
            rng.integers(0, 120, n).astype(float),  # months at current job
            rng.integers(0, 180, n).astype(float),  # months at current address
        ]
    )
    y = (x[:, 0] + x[:, 1] - 2.0 * x[:, 3] + x[:, 2] / 6000.0 > 1.7).astype(int)
    estimator = LogisticRegression(solver="liblinear", max_iter=1000).fit(x, y)
    bundle = SklearnLogRegBundle(
        model=estimator,
        contract=DEFAULT_CONTRACT,
        name="test_logreg",
        version="test",
        decision_threshold=0.5,
    )
    return SklearnLogRegCreditModel(bundle)


def test_reference_profile_matches_published_feature_contract() -> None:
    """
    The reference profile must be reproducible from the public feature contract.

    A client that reads /v1/features/contract should be able to rebuild the baseline
    that explanation contributions are measured against.
    """
    for name in DEFAULT_CONTRACT.columns():
        assert name in REFERENCE_PROFILE, f"{name} missing from REFERENCE_PROFILE"
        assert REFERENCE_PROFILE[name] == FEATURE_METADATA[name]["default_value"], (
            f"REFERENCE_PROFILE[{name}] has drifted from the published default_value"
        )


def test_contributions_sum_to_log_odds_difference_from_reference() -> None:
    """Contributions must reconstruct the model output, not merely rank features."""
    model = _fitted_model()
    columns = list(DEFAULT_CONTRACT.columns())

    # Maria's Bakery, the scenario used in the cold-outreach demo.
    applicant = np.array([1.0, 0.96, 5400.0, 0.285, 2150.0, 0.0, 0.0, 36.0, 24.0])
    reference = np.array(model.contract.reference_vector(REFERENCE_PROFILE))

    result = explain(model, applicant)
    assert result is not None

    def logit(p: float) -> float:
        return math.log(p / (1.0 - p))

    expected = logit(model.predict_proba(applicant)) - logit(model.predict_proba(reference))
    assert math.isclose(sum(result.contributions.values()), expected, rel_tol=1e-6, abs_tol=1e-9)
    assert set(result.contributions) == set(columns)


def test_reference_applicant_has_zero_contributions() -> None:
    """An applicant sitting exactly on the reference profile is explained as neutral."""
    model = _fitted_model()
    reference = np.array(model.contract.reference_vector(REFERENCE_PROFILE))

    result = explain(model, reference)
    assert result is not None
    for name, value in result.contributions.items():
        assert math.isclose(value, 0.0, abs_tol=1e-12), f"{name} should be neutral at the reference"


def test_zero_valued_feature_can_still_contribute() -> None:
    """
    The regression this guards against: with coef * value, any feature at zero
    contributed exactly zero regardless of its weight, so 'no NSF events' could never
    show up as helping an applicant.
    """
    model = _fitted_model()
    columns = list(DEFAULT_CONTRACT.columns())
    idx = columns.index("months_at_current_job")

    applicant = np.array(model.contract.reference_vector(REFERENCE_PROFILE))
    applicant[idx] = 0.0  # zero tenure, well below the reference of 18 months

    result = explain(model, applicant)
    assert result is not None
    assert abs(result.contributions["months_at_current_job"]) > 0.0
