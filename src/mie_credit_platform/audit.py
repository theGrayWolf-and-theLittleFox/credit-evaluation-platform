from __future__ import annotations

import hashlib
import json
import logging
import os
import sqlite3
import time
from dataclasses import asdict, dataclass, replace
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

logger = logging.getLogger("mie.audit")


@dataclass(frozen=True)
class AuditEvent:
    ts: float
    request_id: str
    event_type: str
    model_version: str | None
    applicant_id: str | None
    payload: dict[str, Any]


@dataclass(frozen=True)
class StoredAuditEvent(AuditEvent):
    """
    An `AuditEvent` persisted in SQLite, with a stable integer primary key.
    """

    id: int


def _default_allow_payload_keys() -> set[str]:
    """
    Allowlist for audit payload keys that are expected to be non-sensitive.

    This keeps structured values related to model outcomes and fairness reports
    while filtering out request bodies or applicant metadata that could contain
    personal information.
    """

    return {
        "score",
        "decision",
        "reason_codes",
        "base_value",
        "score_from_explanation",
        "positive_label",
        "demographic_parity_difference",
        "equal_opportunity_difference",
        "selection_rate_by_group",
        "tpr_by_group",
        "n_rows",
        "audit_context",
    }


@dataclass(frozen=True)
class PIIRedactor:
    """
    Removes or hashes personal data before persisting audit events.

    This is intentionally conservative: unrecognized payload keys are dropped
    when `allow_payload_keys` is set, applicant identifiers are hashed by
    default, and long strings are truncated to avoid accidental storage of
    sensitive content.
    """

    allow_payload_keys: set[str] | None = None
    hash_payload_keys: set[str] | None = None
    drop_disallowed_payload_keys: bool = True
    remove_applicant_id: bool = False
    hash_applicant_id: bool = True
    hash_salt: str | None = None
    truncate_strings_at: int = 256
    max_list_items: int = 50

    def redact_event(self, event: AuditEvent) -> AuditEvent:
        """
        Return a sanitized copy of the given event.
        """

        safe_payload = self._redact_payload(event.payload)
        applicant_id = None if self.remove_applicant_id else event.applicant_id
        if applicant_id is not None and self.hash_applicant_id:
            applicant_id = self._hash_value(applicant_id)

        return replace(event, applicant_id=applicant_id, payload=safe_payload)

    def _redact_payload(self, payload: Mapping[str, Any] | None) -> dict[str, Any]:
        if not isinstance(payload, Mapping):
            return {}

        cleaned: dict[str, Any] = {}
        allowed = self.allow_payload_keys
        hashed = self.hash_payload_keys or set()

        for key, value in payload.items():
            key = str(key)
            if allowed is not None and key not in allowed:
                if self.drop_disallowed_payload_keys:
                    logger.debug("audit_redaction_dropped_key", extra={"key": key})
                    continue
            sanitized = self._sanitize_value(value, hash_value=key in hashed)
            cleaned[key] = sanitized
        return cleaned

    def _sanitize_value(self, value: Any, *, hash_value: bool = False) -> Any:
        if hash_value:
            return self._hash_value(value)

        if value is None or isinstance(value, (int, float, bool)):
            return value
        if isinstance(value, str):
            return value[: self.truncate_strings_at]
        if isinstance(value, Mapping):
            return {str(k): self._sanitize_value(v) for k, v in value.items()}
        if isinstance(value, (list, tuple, set)):
            limited = list(value)[: self.max_list_items]
            return [self._sanitize_value(v) for v in limited]
        return str(value)[: self.truncate_strings_at]

    def _hash_value(self, value: Any) -> str:
        h = hashlib.sha256()
        if self.hash_salt:
            h.update(str(self.hash_salt).encode("utf-8"))
        h.update(str(value).encode("utf-8"))
        return h.hexdigest()


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts REAL NOT NULL,
  request_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  model_version TEXT,
  applicant_id TEXT,
  payload_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_events_request_id ON audit_events(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_ts ON audit_events(ts);
"""


class AuditLogger:
    def __init__(self, db_path: str, jsonl_path: str | None = None, *, redactor: PIIRedactor | None = None) -> None:
        self.db_path = db_path
        self.jsonl_path = jsonl_path
        self.redactor = redactor
        self._init_storage()

    def _init_storage(self) -> None:
        Path(os.path.dirname(self.db_path) or ".").mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript(SCHEMA_SQL)
            conn.commit()
        if self.jsonl_path:
            Path(os.path.dirname(self.jsonl_path) or ".").mkdir(parents=True, exist_ok=True)
            Path(self.jsonl_path).touch(exist_ok=True)

    def write(self, event: AuditEvent) -> None:
        safe_event = self.redactor.redact_event(event) if self.redactor else event
        payload_json = json.dumps(safe_event.payload, default=str)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO audit_events (ts, request_id, event_type, model_version, applicant_id, payload_json) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (
                    safe_event.ts,
                    safe_event.request_id,
                    safe_event.event_type,
                    safe_event.model_version,
                    safe_event.applicant_id,
                    payload_json,
                ),
            )
            conn.commit()

        if self.jsonl_path:
            with open(self.jsonl_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(asdict(safe_event), default=str) + "\n")

    def write_many(self, events: Iterable[AuditEvent]) -> None:
        for e in events:
            self.write(e)

    def get(self, event_id: int) -> StoredAuditEvent | None:
        """
        Fetch a single audit event by SQLite primary key.
        """
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT id, ts, request_id, event_type, model_version, applicant_id, payload_json "
                "FROM audit_events WHERE id = ?",
                (int(event_id),),
            ).fetchone()
        if not row:
            return None
        return _row_to_stored_event(row)

    def query(
        self,
        *,
        limit: int = 100,
        offset: int = 0,
        since_ts: float | None = None,
        until_ts: float | None = None,
        request_id: str | None = None,
        event_type: str | None = None,
        applicant_id: str | None = None,
        model_version: str | None = None,
    ) -> list[StoredAuditEvent]:
        """
        Query audit events with simple filters and pagination.

        Filters are AND-ed together. Results are returned in reverse chronological order.
        """
        limit = max(1, min(int(limit), 1000))
        offset = max(0, int(offset))

        where: list[str] = []
        params: list[Any] = []

        if since_ts is not None:
            where.append("ts >= ?")
            params.append(float(since_ts))
        if until_ts is not None:
            where.append("ts <= ?")
            params.append(float(until_ts))
        if request_id:
            where.append("request_id = ?")
            params.append(str(request_id))
        if event_type:
            where.append("event_type = ?")
            params.append(str(event_type))
        if applicant_id:
            where.append("applicant_id = ?")
            params.append(str(applicant_id))
        if model_version:
            where.append("model_version = ?")
            params.append(str(model_version))

        sql = (
            "SELECT id, ts, request_id, event_type, model_version, applicant_id, payload_json "
            "FROM audit_events "
        )
        if where:
            sql += "WHERE " + " AND ".join(where) + " "
        sql += "ORDER BY ts DESC, id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(sql, tuple(params)).fetchall()
        return [_row_to_stored_event(r) for r in rows]

    def count(
        self,
        *,
        since_ts: float | None = None,
        until_ts: float | None = None,
        request_id: str | None = None,
        event_type: str | None = None,
        applicant_id: str | None = None,
        model_version: str | None = None,
    ) -> int:
        """
        Count audit events matching the same filters as `query`.
        """
        where: list[str] = []
        params: list[Any] = []

        if since_ts is not None:
            where.append("ts >= ?")
            params.append(float(since_ts))
        if until_ts is not None:
            where.append("ts <= ?")
            params.append(float(until_ts))
        if request_id:
            where.append("request_id = ?")
            params.append(str(request_id))
        if event_type:
            where.append("event_type = ?")
            params.append(str(event_type))
        if applicant_id:
            where.append("applicant_id = ?")
            params.append(str(applicant_id))
        if model_version:
            where.append("model_version = ?")
            params.append(str(model_version))

        sql = "SELECT COUNT(1) FROM audit_events "
        if where:
            sql += "WHERE " + " AND ".join(where)

        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(sql, tuple(params)).fetchone()
        return int(row[0] if row else 0)

    def export_jsonl(
        self,
        out_path: str,
        *,
        since_ts: float | None = None,
        until_ts: float | None = None,
        request_id: str | None = None,
        event_type: str | None = None,
        applicant_id: str | None = None,
        model_version: str | None = None,
        batch_size: int = 500,
    ) -> int:
        """
        Export matching audit events to a JSONL file. Returns number of rows written.
        """
        Path(os.path.dirname(out_path) or ".").mkdir(parents=True, exist_ok=True)
        written = 0
        offset = 0
        batch_size = max(1, min(int(batch_size), 5000))
        with open(out_path, "w", encoding="utf-8") as f:
            while True:
                batch = self.query(
                    limit=batch_size,
                    offset=offset,
                    since_ts=since_ts,
                    until_ts=until_ts,
                    request_id=request_id,
                    event_type=event_type,
                    applicant_id=applicant_id,
                    model_version=model_version,
                )
                if not batch:
                    break
                for e in batch:
                    f.write(json.dumps(asdict(e), default=str) + "\n")
                    written += 1
                offset += len(batch)
        return written


def now_ts() -> float:
    return time.time()


def _row_to_stored_event(row: Sequence[Any]) -> StoredAuditEvent:
    # row: (id, ts, request_id, event_type, model_version, applicant_id, payload_json)
    payload_raw = row[6]
    payload: dict[str, Any]
    try:
        payload = json.loads(payload_raw) if isinstance(payload_raw, str) else {}
        if not isinstance(payload, dict):
            payload = {"_payload": payload}
    except Exception:
        payload = {"_payload_parse_error": True, "_payload_raw": str(payload_raw)}
    return StoredAuditEvent(
        id=int(row[0]),
        ts=float(row[1]),
        request_id=str(row[2]),
        event_type=str(row[3]),
        model_version=str(row[4]) if row[4] is not None else None,
        applicant_id=str(row[5]) if row[5] is not None else None,
        payload=payload,
    )


def build_redactor_from_settings(settings: Any) -> PIIRedactor:
    """
    Build a PIIRedactor using Settings values when present.

    The function is defensive and falls back to conservative defaults to avoid
    storing personal data even if the settings object is missing fields.
    """

    allow_keys = getattr(settings, "audit_allow_payload_keys", None)
    hash_keys = getattr(settings, "audit_hash_payload_keys", None)
    drop_unknown = getattr(settings, "audit_drop_unknown_payload_keys", True)
    remove_applicant_id = getattr(settings, "audit_remove_applicant_id", False)
    hash_applicant_id = getattr(settings, "audit_hash_applicant_id", True)
    hash_salt = getattr(settings, "audit_hash_salt", None)
    truncate_at = getattr(settings, "audit_truncate_payload_strings", 256)
    max_list_items = getattr(settings, "audit_max_list_items", 50)

    allow_set = set(allow_keys) if allow_keys is not None else _default_allow_payload_keys()
    hash_set = set(hash_keys) if hash_keys is not None else set()

    return PIIRedactor(
        allow_payload_keys=allow_set,
        hash_payload_keys=hash_set,
        drop_disallowed_payload_keys=bool(drop_unknown),
        remove_applicant_id=bool(remove_applicant_id),
        hash_applicant_id=bool(hash_applicant_id),
        hash_salt=hash_salt,
        truncate_strings_at=int(truncate_at),
        max_list_items=int(max_list_items),
    )


