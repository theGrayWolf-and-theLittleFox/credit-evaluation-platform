from __future__ import annotations

import hashlib
import re


_EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_PHONE = re.compile(r"^\+?[\d\s().-]{10,}$")
_GOVERNMENT_ID = re.compile(r"^\d{3}[- ]?\d{2}[- ]?\d{4}$")
_SAFE_REFERENCE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{2,127}$")


def validate_pseudonymous_reference(value: str) -> str:
    """Reject identifiers that resemble common direct personal identifiers."""
    candidate = value.strip()
    if not _SAFE_REFERENCE.fullmatch(candidate):
        raise ValueError(
            "Use a 3–128 character pseudonymous reference containing only letters, numbers, '.', '_', ':', or '-'."
        )
    if _EMAIL.fullmatch(candidate) or _PHONE.fullmatch(candidate) or _GOVERNMENT_ID.fullmatch(candidate):
        raise ValueError("Direct personal identifiers are not accepted; use a pseudonymous reference.")
    return candidate


def hash_audit_identifier(value: str, salt: str | None = None) -> str:
    """Create a stable, non-reversible identifier for audit joins."""
    digest = hashlib.sha256()
    if salt:
        digest.update(salt.encode("utf-8"))
        digest.update(b"\x00")
    digest.update(value.encode("utf-8"))
    return f"ref_{digest.hexdigest()}"
