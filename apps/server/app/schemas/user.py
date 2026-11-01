"""User schemas for registration, authentication, and profile management."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    """Base user fields."""

    email: EmailStr
    display_name: str = Field(min_length=1, max_length=200)


class RegisterRequest(BaseModel):
    """Payload for user registration."""

    email: EmailStr
    display_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="student", pattern="^(student|instructor|admin)$")


class LoginRequest(BaseModel):
    """Payload for user authentication."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    """JWT bearer token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int


class UserResponse(BaseModel):
    """Public user profile."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    display_name: str
    role: str
    is_active: bool
    created_at: datetime | None = None
    last_login_at: datetime | None = None


class UserUpdateRequest(BaseModel):
    """Payload for updating user profile."""

    display_name: str | None = Field(default=None, min_length=1, max_length=200)


class PasswordChangeRequest(BaseModel):
    """Payload for changing account password."""

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
