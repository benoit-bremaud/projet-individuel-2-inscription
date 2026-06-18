"""Tests unitaires de validation des schemas Pydantic (defense en profondeur)."""

import pytest
from pydantic import ValidationError

from app.schemas import InscritCreate

VALID = {
    "nom": "Curie",
    "prenom": "Marie",
    "email": "marie.curie@ynov.com",
    "dateNaissance": "1990-01-01",
    "ville": "Paris",
    "codePostal": "75005",
}


def test_inscrit_create_accepts_valid_payload():
    inscrit = InscritCreate(**VALID)
    assert inscrit.nom == "Curie"


@pytest.mark.parametrize(
    "field,value",
    [
        ("nom", "Jean123"),
        ("prenom", "Marie@"),
        ("email", "pas-un-email"),
        ("codePostal", "123"),
        ("codePostal", "7500A"),
        ("ville", "Paris1"),
        ("dateNaissance", "pas-une-date"),
    ],
)
def test_inscrit_create_rejects_invalid_field(field, value):
    payload = {**VALID, field: value}
    with pytest.raises(ValidationError):
        InscritCreate(**payload)
