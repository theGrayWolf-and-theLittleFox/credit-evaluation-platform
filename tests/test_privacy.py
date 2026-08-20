from __future__ import annotations

import pytest

from services.api.privacy import hash_audit_identifier, validate_pseudonymous_reference


@pytest.mark.parametrize(
    "value",
    [
        "person" + "@" + "example.com",
        "212" + "-555-0199",
        "123" + "-45-6789",
        "First" + " Last",
    ],
)
def test_direct_personal_identifiers_are_rejected(value: str):
    with pytest.raises(ValueError, match="pseudonymous|personal"):
        validate_pseudonymous_reference(value)


def test_pseudonymous_application_reference_is_accepted():
    assert validate_pseudonymous_reference("app_01HX9Z7Y") == "app_01HX9Z7Y"


def test_audit_identifier_is_stable_and_does_not_contain_source_value():
    first = hash_audit_identifier("app_01HX9Z7Y", "deployment-secret")
    second = hash_audit_identifier("app_01HX9Z7Y", "deployment-secret")

    assert first == second
    assert first.startswith("ref_")
    assert "app_01HX9Z7Y" not in first
