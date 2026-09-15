"""
Maintenance router.

GET  /api/maintenance/recommendations — prioritised task list
POST /api/maintenance/feedback        — mark a task as completed / in-progress
GET  /api/alerts                      — active alerts (high/critical open tasks)
GET  /api/reports/readiness           — fleet-wide readiness report

Sourced from docs/architecture.md § Suggested API Endpoints and
§ 4.6 Recommendation Engine.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Equipment,
    MaintenanceTask,
    ReadinessStatus,
    RiskLevel,
    TaskStatus,
)
from app.schemas import (
    MaintenanceFeedback,
    MaintenanceTaskOut,
    ReadinessReportOut,
)

router = APIRouter(tags=["maintenance"])


@router.get(
    "/api/maintenance/recommendations",
    response_model=list[MaintenanceTaskOut],
    summary="Prioritised maintenance task list (open tasks, Critical first)",
)
def get_recommendations(db: Session = Depends(get_db)):
    priority_order = {
        RiskLevel.CRITICAL: 0,
        RiskLevel.HIGH: 1,
        RiskLevel.MEDIUM: 2,
        RiskLevel.LOW: 3,
    }
    tasks = (
        db.query(MaintenanceTask)
        .filter(MaintenanceTask.status == TaskStatus.PENDING)
        .all()
    )
    tasks.sort(key=lambda t: priority_order.get(t.priority, 99))
    return tasks


@router.post(
    "/api/maintenance/feedback",
    response_model=MaintenanceTaskOut,
    summary="Submit maintenance feedback — update task status",
)
def post_feedback(payload: MaintenanceFeedback, db: Session = Depends(get_db)):
    task = db.query(MaintenanceTask).filter_by(task_id=payload.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {payload.task_id} not found")
    task.status = payload.status
    db.commit()
    db.refresh(task)
    return task


@router.get(
    "/api/alerts",
    response_model=list[MaintenanceTaskOut],
    summary="Active alerts — pending Critical and High priority tasks",
)
def get_alerts(db: Session = Depends(get_db)):
    return (
        db.query(MaintenanceTask)
        .filter(
            MaintenanceTask.status == TaskStatus.PENDING,
            MaintenanceTask.priority.in_([RiskLevel.CRITICAL, RiskLevel.HIGH]),
        )
        .order_by(MaintenanceTask.priority, MaintenanceTask.created_at)
        .all()
    )


@router.get(
    "/api/reports/readiness",
    response_model=ReadinessReportOut,
    summary="Fleet-wide readiness report",
)
def get_readiness_report(db: Session = Depends(get_db)):
    all_equipment = db.query(Equipment).order_by(Equipment.equipment_id).all()

    counts = {s: 0 for s in ReadinessStatus}
    for eq in all_equipment:
        counts[eq.mission_status] += 1

    return ReadinessReportOut(
        generated_at=datetime.now(timezone.utc),
        total_equipment=len(all_equipment),
        mission_ready=counts[ReadinessStatus.MISSION_READY],
        ready_with_warning=counts[ReadinessStatus.READY_WITH_WARNING],
        maintenance_required=counts[ReadinessStatus.MAINTENANCE_REQUIRED],
        not_mission_ready=counts[ReadinessStatus.NOT_MISSION_READY],
        equipment=all_equipment,
    )
