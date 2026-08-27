from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Dict, Iterable, Tuple


@dataclass(frozen=True)
class FeatureContract:
    """
    A minimal feature contract.

    Real systems should version this contract, include units and provenance, and
    define strict null-handling policies.
    """

    required: Tuple[str, ...]
    optional: Tuple[str, ...] = ()

    def validate(self, features: Dict[str, float]) -> None:
        missing = [k for k in self.required if k not in features]
        if missing:
            raise ValueError(f"Missing required features: {missing}")

        # Reject unknown fields to avoid schema injection.
        allowed = set(self.required) | set(self.optional)
        unknown = [k for k in features.keys() if k not in allowed]
        if unknown:
            raise ValueError(f"Unknown features not in contract: {unknown}")

        # Basic type checks
        for k, v in features.items():
            if not isinstance(v, (int, float)):
                raise ValueError(f"Feature {k} must be numeric, got {type(v)}")

    def schema_hash(self) -> str:
        payload = {"required": self.required, "optional": self.optional}
        raw = json.dumps(payload, sort_keys=True).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()[:16]

    def columns(self) -> Iterable[str]:
        return list(self.required) + list(self.optional)

    def reference_vector(self, reference: Dict[str, float]) -> Tuple[float, ...]:
        """
        Order a reference profile into the contract's column order.

        Missing entries fall back to 0.0 so an incomplete reference degrades to the
        raw coef*value behaviour for that feature rather than raising.
        """
        return tuple(float(reference.get(name, 0.0)) for name in self.columns())


DEFAULT_CONTRACT = FeatureContract(
    required=(
        "rent_on_time_rate_12m",
        "utility_on_time_rate_12m",
        "avg_monthly_income_6m",
        "cashflow_volatility_6m",
        "avg_daily_balance_6m",
        "nsf_events_12m",
        "overdraft_events_12m",
    ),
    optional=(
        "months_at_current_job",
        "months_at_current_address",
    ),
)


# Reference profile used as the baseline for explanation contributions.
#
# Feature contributions are reported as coef * (value - reference), i.e. how far this
# applicant's inputs move the log-odds relative to a typical applicant, rather than
# coef * value. Without a reference, an unscaled feature such as monthly income
# dominates every explanation purely because of its magnitude, and any feature whose
# value is zero contributes exactly zero regardless of its weight.
#
# These values are the same defaults the API publishes in the feature contract
# (`default_value` in services/api/analytics.py), so a client can reproduce the
# baseline from the public contract. tests/test_reference_profile.py asserts they agree.
REFERENCE_PROFILE: Dict[str, float] = {
    "rent_on_time_rate_12m": 0.94,
    "utility_on_time_rate_12m": 0.91,
    "avg_monthly_income_6m": 4200.0,
    "cashflow_volatility_6m": 0.24,
    "avg_daily_balance_6m": 1800.0,
    "nsf_events_12m": 0.0,
    "overdraft_events_12m": 0.0,
    "months_at_current_job": 18.0,
    "months_at_current_address": 24.0,
}


