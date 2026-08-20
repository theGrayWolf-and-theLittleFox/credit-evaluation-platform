from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Runtime configuration.

    Defaults are intentionally conservative for privacy/safety.
    """

    model_config = SettingsConfigDict(env_prefix="ICE_", env_file=".env", extra="ignore")

    # Paths
    artifacts_dir: str = "artifacts"
    registry_path: str = "artifacts/registry/model_registry.json"
    current_model_path: str = "artifacts/models/baseline.joblib"
    audit_log_path: str = "artifacts/audit/decisions.jsonl"
    audit_sqlite_path: str = "artifacts/audit/audit.sqlite3"

    # Serving behavior
    decision_threshold: float = 0.5
    log_raw_features: bool = False  # prefer hashing/omitting raw feature values in logs
    enable_sqlite_audit_store: bool = True

    # Sensitive attributes handling
    allow_sensitive_in_model: bool = False
    store_sensitive_for_monitoring: bool = False

    # Audit privacy
    hash_audit_identifiers: bool = True
    audit_identifier_salt: str | None = None

    # API auth (demo: API key header)
    api_key: str | None = None  # if set, require X-API-Key


def get_settings() -> Settings:
    return Settings()

