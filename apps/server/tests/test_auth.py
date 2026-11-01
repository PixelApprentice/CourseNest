"""Comprehensive tests for authentication, tokens, profile updates, and password changes."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.models.user import User


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient) -> None:
    """Test successful user registration."""
    res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "fresh_user@coursenest.edu",
            "password": "StrongPassword99!",
            "display_name": "Fresh User",
            "role": "student",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "fresh_user@coursenest.edu"
    assert data["display_name"] == "Fresh User"
    assert data["role"] == "student"
    assert data["is_active"] is True
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient) -> None:
    """Test that registering an existing email raises 409 Conflict."""
    payload = {
        "email": "dupe@coursenest.edu",
        "password": "StrongPassword99!",
        "display_name": "Duplicate User",
        "role": "student",
    }
    first_res = await client.post("/api/v1/auth/register", json=payload)
    assert first_res.status_code == 201

    second_res = await client.post("/api/v1/auth/register", json=payload)
    assert second_res.status_code == 409
    assert "already exists" in second_res.json()["detail"]


@pytest.mark.asyncio
async def test_register_invalid_inputs(client: AsyncClient) -> None:
    """Test input validation for invalid email and short password."""
    # Invalid email
    bad_email = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "not-an-email",
            "password": "StrongPassword99!",
            "display_name": "Bad Email",
        },
    )
    assert bad_email.status_code == 422

    # Password too short (< 8 chars)
    short_pw = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "short@coursenest.edu",
            "password": "short",
            "display_name": "Short PW",
        },
    )
    assert short_pw.status_code == 422


@pytest.mark.asyncio
async def test_login_success_and_profile_retrieval(client: AsyncClient) -> None:
    """Test login with valid credentials and fetching /me profile."""
    # Register user
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "learner@coursenest.edu",
            "password": "LearnerPassword123!",
            "display_name": "Active Learner",
            "role": "student",
        },
    )
    assert reg.status_code == 201

    # Login
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "learner@coursenest.edu", "password": "LearnerPassword123!"},
    )
    assert login.status_code == 200
    token_data = login.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # Retrieve profile
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "learner@coursenest.edu"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient) -> None:
    """Test login failure with wrong password and nonexistent user."""
    # Register user
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "victim@coursenest.edu",
            "password": "RightPassword123!",
            "display_name": "Victim",
        },
    )

    # Wrong password
    bad_pw = await client.post(
        "/api/v1/auth/login",
        json={"email": "victim@coursenest.edu", "password": "WrongPassword!"},
    )
    assert bad_pw.status_code == 401

    # Non-existent user
    non_existent = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@coursenest.edu", "password": "AnyPassword!"},
    )
    assert non_existent.status_code == 401


@pytest.mark.asyncio
async def test_login_deactivated_user(client: AsyncClient, db_session: AsyncSession) -> None:
    """Test that deactivated accounts cannot log in."""
    inactive_user = User(
        email="inactive@coursenest.edu",
        display_name="Inactive User",
        hashed_password=hash_password("InactivePass123!"),
        role="student",
        is_active=False,
    )
    db_session.add(inactive_user)
    await db_session.commit()

    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "inactive@coursenest.edu", "password": "InactivePass123!"},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_and_malformed_tokens(client: AsyncClient) -> None:
    """Test accessing protected route without token or with malformed token."""
    # No auth header
    no_token = await client.get("/api/v1/auth/me")
    assert no_token.status_code == 401 or no_token.status_code == 403

    # Malformed token
    bad_token = await client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-valid-jwt-token"}
    )
    assert bad_token.status_code == 401


@pytest.mark.asyncio
async def test_profile_update_and_password_change(client: AsyncClient) -> None:
    """Test PATCH /me and changing password."""
    # Register & Login
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "updateme@coursenest.edu",
            "password": "InitialPassword123!",
            "display_name": "Old Name",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "updateme@coursenest.edu", "password": "InitialPassword123!"},
    )
    token = login_res.json()["access_token"]
    auth_header = {"Authorization": f"Bearer {token}"}

    # Update display name
    patch_res = await client.patch(
        "/api/v1/auth/me", json={"display_name": "New Name"}, headers=auth_header
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["display_name"] == "New Name"

    # Password change with invalid current password
    bad_change = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "WrongCurrentPassword", "new_password": "BrandNewPassword123!"},
        headers=auth_header,
    )
    assert bad_change.status_code == 400

    # Password change success
    good_change = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "InitialPassword123!", "new_password": "BrandNewPassword123!"},
        headers=auth_header,
    )
    assert good_change.status_code == 200

    # Login with new password
    new_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "updateme@coursenest.edu", "password": "BrandNewPassword123!"},
    )
    assert new_login.status_code == 200
