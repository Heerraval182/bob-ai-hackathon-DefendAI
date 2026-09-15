"""
Database engine and session factory.

DATABASE_URL is read from the environment (see docs/setup-guide.md).
Uses SQLAlchemy 2.x with a synchronous engine for simplicity.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL: str = os.environ.get(
    "DATABASE_URL",
    "postgresql://defendai:defendai@localhost:5432/defendai",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency — yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables if they do not already exist."""
    from app.models import Base  # noqa: F401  (imports all models)
    Base.metadata.create_all(bind=engine)
