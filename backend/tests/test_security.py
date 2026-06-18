"""Tests unitaires de la securite (bcrypt + JWT). Aucune base requise."""

import os

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.security import (
    create_access_token,
    hash_password,
    require_admin,
    verify_password,
)


def test_hash_then_verify_roundtrip():
    hashed = hash_password("secret")
    assert hashed != "secret"
    assert verify_password("secret", hashed) is True
    assert verify_password("mauvais", hashed) is False


def test_verify_password_tolerates_invalid_hash():
    assert verify_password("x", "pas-un-hash-bcrypt") is False


def test_create_and_decode_token():
    token = create_access_token("admin@example.com")
    payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    assert payload["sub"] == "admin@example.com"
    assert "exp" in payload


def test_require_admin_rejects_missing_token():
    with pytest.raises(HTTPException) as exc:
        require_admin(None)
    assert exc.value.status_code == 401


def test_require_admin_accepts_valid_token():
    token = create_access_token("admin@example.com")
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    assert require_admin(creds) == "admin@example.com"


def test_require_admin_rejects_invalid_token():
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="jeton-bidon")
    with pytest.raises(HTTPException) as exc:
        require_admin(creds)
    assert exc.value.status_code == 401
