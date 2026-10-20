"""Health check endpoints."""

from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def health() -> dict[str, str]:
    """API health check."""
    return {"status": "ok", "service": "coursenest-api", "version": "0.1.0"}
