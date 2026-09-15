"""
Equipment router.

GET  /api/equipment            — list all equipment
GET  /api/equipment/{id}       — get one equipment record
POST /api/equipment            — register new equipment
GET  /api/equipment/{id}/health    — health status + latest predictions + open tasks
GET  /api/equipment/{id}/readiness — readiness classification

Sourced from docs/architecture.md § Suggested API Endpoints and § Data Model.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Equipment, MaintenanceTask, Prediction, ReadinessStatus, TaskStatus
from app.schemas import (
    EquipmentCreate,
    EquipmentHealthOut,
    EquipmentOut,
    EquipmentUpdate,
    ReadinessReportOut,
)

router = APIRouter(prefix="/api/equipment", tags=["equipment"])


def _get_or_404(equipment_id: str, db: Session) -> Equipment:
    eq = db.query(Equipment).filter_by(equipment_id=equipment_id).first()
    if not eq:
        raise HTTPException(status_code=404, detail=f"Equipment '{equipment_id}' not found")
    return eq


@router.get("", response_model=list[EquipmentOut], summary="List all equipment")
def list_equipment(db: Session = Depends(get_db)):
    return db.query(Equipment).order_by(Equipment.equipment_id).all()


@router.post(
    "",
    response_model=EquipmentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register new equipment",
)
def create_equipment(payload: EquipmentCreate, db: Session = Depends(get_db)):
    if db.query(Equipment).filter_by(equipment_id=payload.equipment_id).first():
        raise HTTPException(
            status_code=409,
            detail=f"Equipment '{payload.equipment_id}' already exists",
        )
    eq = Equipment(**payload.model_dump())
    db.add(eq)
    db.commit()
    db.refresh(eq)
    return eq


@router.get("/{equipment_id}", response_model=EquipmentOut, summary="Get one equipment record")
def get_equipment(equipment_id: str, db: Session = Depends(get_db)):
    return _get_or_404(equipment_id, db)


@router.patch("/{equipment_id}", response_model=EquipmentOut, summary="Update equipment fields")
def update_equipment(
    equipment_id: str, payload: EquipmentUpdate, db: Session = Depends(get_db)
):
    eq = _get_or_404(equipment_id, db)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(eq, field, value)
    db.commit()
    db.refresh(eq)
    return eq


@router.get(
    "/{equipment_id}/health",
    response_model=EquipmentHealthOut,
    summary="Current health status, latest predictions, and open maintenance tasks",
)
def get_equipment_health(equipment_id: str, db: Session = Depends(get_db)):
    eq = _get_or_404(equipment_id, db)

    latest_predictions = (
        db.query(Prediction)
        .filter_by(equipment_id=equipment_id)
        .order_by(Prediction.created_at.desc())
        .limit(10)
        .all()
    )

    open_tasks = (
        db.query(MaintenanceTask)
        .filter(
            MaintenanceTask.equipment_id == equipment_id,
            MaintenanceTask.status == TaskStatus.PENDING,
        )
        .order_by(MaintenanceTask.priority)
        .all()
    )

    return EquipmentHealthOut(
        equipment_id=eq.equipment_id,
        mission_status=eq.mission_status,
        latest_predictions=latest_predictions,
        open_tasks=open_tasks,
    )


@router.get(
    "/{equipment_id}/readiness",
    response_model=dict,
    summary="Readiness classification for one asset",
)
def get_equipment_readiness(equipment_id: str, db: Session = Depends(get_db)):
    eq = _get_or_404(equipment_id, db)
    return {
        "equipment_id": eq.equipment_id,
        "model": eq.model,
        "unit": eq.unit,
        "mission_status": eq.mission_status,
        "total_usage_hours": eq.total_usage_hours,
        "last_service_date": eq.last_service_date,
    }
