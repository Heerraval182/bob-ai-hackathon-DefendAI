"""
Pydantic request / response schemas.

Shapes are derived directly from the data model in docs/architecture.md
§ Data Model and the API endpoints listed in § Suggested API Endpoints.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models import ReadinessStatus, RiskLevel, TaskStatus


# ---------------------------------------------------------------------------
# Equipment
# ---------------------------------------------------------------------------

class EquipmentBase(BaseModel):
    equipment_type: str = Field(..., examples=["aircraft"])
    model: str = Field(..., examples=["AH-64 Apache"])
    unit: Optional[str] = Field(None, examples=["1st Aviation Regiment"])
    total_usage_hours: float = Field(0.0, ge=0)


class EquipmentCreate(EquipmentBase):
    equipment_id: str = Field(..., examples=["EQ-001"])


class EquipmentUpdate(BaseModel):
    mission_status: Optional[ReadinessStatus] = None
    last_service_date: Optional[datetime] = None
    total_usage_hours: Optional[float] = Field(None, ge=0)


class EquipmentOut(EquipmentBase):
    equipment_id: str
    mission_status: ReadinessStatus
    last_service_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# SensorReading
# ---------------------------------------------------------------------------

class SensorReadingIn(BaseModel):
    """Payload for POST /api/sensors/data (single reading or batch item)."""

    equipment_id: str = Field(..., examples=["EQ-001"])
    component_id: str = Field(..., examples=["engine_1"])
    sensor_type: str = Field(
        ...,
        examples=["temperature"],
        description="One of: temperature | vibration | pressure | usage_hours",
    )
    value: float = Field(..., examples=[85.3])
    unit_of_measure: Optional[str] = Field(None, examples=["°C"])
    timestamp: Optional[datetime] = Field(
        default=None,
        description="If omitted the server timestamp is used.",
    )

    @field_validator("sensor_type")
    @classmethod
    def validate_sensor_type(cls, v: str) -> str:
        allowed = {"temperature", "vibration", "pressure", "usage_hours"}
        if v not in allowed:
            raise ValueError(f"sensor_type must be one of {allowed}")
        return v


class SensorReadingBatch(BaseModel):
    readings: list[SensorReadingIn]


class SensorReadingOut(SensorReadingIn):
    reading_id: int
    timestamp: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------

class PredictionOut(BaseModel):
    prediction_id: int
    equipment_id: str
    component_id: str
    failure_probability: float
    predicted_failure_date: Optional[datetime]
    remaining_useful_life: Optional[float]
    confidence_score: float
    risk_level: RiskLevel
    explanation: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# MaintenanceTask
# ---------------------------------------------------------------------------

class MaintenanceTaskOut(BaseModel):
    task_id: int
    equipment_id: str
    component_id: str
    task_type: str
    priority: RiskLevel
    recommended_action: str
    estimated_downtime: Optional[float]
    status: TaskStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MaintenanceFeedback(BaseModel):
    """Body for POST /api/maintenance/feedback."""

    task_id: int
    status: TaskStatus
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Health / Readiness
# ---------------------------------------------------------------------------

class EquipmentHealthOut(BaseModel):
    equipment_id: str
    mission_status: ReadinessStatus
    latest_predictions: list[PredictionOut]
    open_tasks: list[MaintenanceTaskOut]


class ReadinessReportOut(BaseModel):
    generated_at: datetime
    total_equipment: int
    mission_ready: int
    ready_with_warning: int
    maintenance_required: int
    not_mission_ready: int
    equipment: list[EquipmentOut]
