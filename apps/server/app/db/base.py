"""SQLAlchemy declarative base and model imports."""

from sqlalchemy.orm import DeclarativeBase, MappedAsDataclass


class Base(DeclarativeBase, MappedAsDataclass):
    """Base class for all SQLAlchemy models."""

    pass
