"""Authentication endpoints: register, login, current user."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
from app.core.security import hash_password, verify_password
from app.db.models.user import User
from app.db.session import get_db

router = APIRouter()


class RegisterRequest(BaseModel):
    """Registration payload."""

    email: EmailStr
    display_name: str
    password: str


class LoginRequest(BaseModel):
    """Login payload."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Public user representation."""

    id: str
    email: str
    display_name: str
    role: str
    is_active: bool


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> User:
    """Register a new user account."""
    # Check for existing user
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    # Hash password with native bcrypt
    hashed = hash_password(body.password)

    user = User(
        email=body.email,
        display_name=body.display_name,
        hashed_password=hashed,
    )
    db.add(user)
    await db.flush()
    return user


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Authenticate and return a JWT token."""
    from jose import jwt

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    token_data = {"sub": user.id, "exp": expire, "role": user.role}
    access_token = jwt.encode(token_data, settings.secret_key, algorithm=settings.algorithm)

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    """Get the currently authenticated user."""
    return current_user
