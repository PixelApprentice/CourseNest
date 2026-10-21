"""Shared API dependencies (authentication, authorization)."""

from collections.abc import Awaitable, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models.user import User
from app.db.session import get_db

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate the current user from the JWT bearer token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError as err:
        raise credentials_exception from err

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise credentials_exception

    return user


def require_role(required_role: str) -> Callable[..., Awaitable[User]]:
    """Dependency factory that checks the user has a specific role."""

    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role != required_role and user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required_role}' required",
            )
        return user

    return role_checker
