"""Tests d'integration des endpoints contre une base de test (via TestClient)."""

import os

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]


def _payload(**overrides):
    base = {
        "nom": "Hopper",
        "prenom": "Grace",
        "email": "grace.hopper@ynov.com",
        "dateNaissance": "1906-12-09",
        "ville": "Arlington",
        "codePostal": "22201",
    }
    base.update(overrides)
    return base


def _token(client):
    response = client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    return response.json()["access_token"]


def test_create_then_public_list_is_reduced(client):
    assert client.post("/inscrits", json=_payload()).status_code == 201

    response = client.get("/inscrits")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    # Liste publique = projection reduite, sans PII.
    assert data[0] == {"nom": "Hopper", "prenom": "Grace", "ville": "Arlington"}


def test_duplicate_email_returns_409(client):
    assert client.post("/inscrits", json=_payload()).status_code == 201
    assert client.post("/inscrits", json=_payload()).status_code == 409


def test_invalid_payload_returns_422(client):
    assert client.post("/inscrits", json=_payload(email="pas-un-email")).status_code == 422


def test_login_ok_and_invalid_credentials(client):
    ok = client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert ok.status_code == 200
    assert "access_token" in ok.json()

    bad = client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": "mauvais"}
    )
    assert bad.status_code == 401


def test_admin_list_requires_token(client):
    assert client.get("/inscrits/admin").status_code == 401


def test_admin_list_with_token_exposes_full_info(client):
    client.post("/inscrits", json=_payload())
    response = client.get(
        "/inscrits/admin", headers={"Authorization": f"Bearer {_token(client)}"}
    )
    assert response.status_code == 200
    row = response.json()[0]
    # La vue admin expose les PII.
    assert row["email"] == "grace.hopper@ynov.com"
    assert row["code_postal"] == "22201"
    assert "date_naissance" in row


def test_delete_protected_and_not_found(client):
    headers = {"Authorization": f"Bearer {_token(client)}"}
    new_id = client.post("/inscrits", json=_payload()).json()["id"]

    # Sans jeton : interdit.
    assert client.delete(f"/inscrits/{new_id}").status_code == 401
    # Avec jeton : supprime.
    assert client.delete(f"/inscrits/{new_id}", headers=headers).status_code == 204
    # Deja supprime : introuvable.
    assert client.delete(f"/inscrits/{new_id}", headers=headers).status_code == 404
