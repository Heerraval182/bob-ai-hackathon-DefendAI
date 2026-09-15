"""
FastAPI application entry point.

Start with:
    uvicorn app.main:app --reload --port 8000

Swagger UI: http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_tables
from app.routers import equipment, maintenance, sensors

app = FastAPI(
    title="Mission Readiness & Predictive Maintenance Copilot — API",
    description=(
        "Backend API for the DefendAI Mission Readiness Copilot. "
        "See docs/architecture.md for the full system overview."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — allow the Next.js frontend (localhost:3000) during development
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers (Member 1 deliverables)
# ---------------------------------------------------------------------------
app.include_router(sensors.router)
app.include_router(equipment.router)
app.include_router(maintenance.router)


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    create_tables()


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
