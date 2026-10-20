"""Main API router that aggregates all endpoint modules."""

from fastapi import APIRouter

from app.api.endpoints import auth, courses, health

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
