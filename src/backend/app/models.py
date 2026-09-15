"""
SQLAlchemy ORM models.

Data model sourced from docs/architecture.md § Data Model.
Tables: Equipment, SensorReading, Prediction, MaintenanceTask.
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Enums (sourced from architecture.md § Readiness Scoring Engine and
#        § Recommendation Engine)
# ---------------------------------------------------------------------------

class ReadinessStatus(str, enum.Enum):
    MISSION_READY = "MISSION_READY"
    READY_WITH_WARNING = "READY_WITH_WARNING"
    MAINTENANCE_REQUIRED = "MAINTENANCE_REQUIRED"
    NOT_MISSION_READY = "NOT_MISSION_READY"


class RiskLevel(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


# ---------------------------------------------------------------------------
# Equipment
# ---------------------------------------------------------------------------

class Equipment(Base):
    """
    Represents an aircraft, vehicle, or other monitored asset.
    Fields from docs/architecture.md § Data Model › Equipment.
    """

    __tablename__ = "equipment"

    equipment_id = Column(String(64), primary_key=True)
    equipment_type = Column(String(64), nullable=False)          # e.g. "aircraft", "vehicle"
    model = Column(String(128), nullable=False)
    unit = Column(String(128), nullable=True)
    mission_status = Column(
        Enum(ReadinessStatus),
        nullable=False,
        default=ReadinessStatus.MISSION_READY,
    )
    last_service_date = Column(DateTime, nullable=True)
    total_usage_hours = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    sensor_readings = relationship(
        "SensorReading", back_populates="equipment", cascade="all, delete-orphan"
    )
    predictions = relationship(
        "Prediction", back_populates="equipment", cascade="all, delete-orphan"
    )
    maintenance_tasks = relationship(
        "MaintenanceTask", back_populates="equipment", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# SensorReading
# ---------------------------------------------------------------------------

class SensorReading(Base):
    """
    A single time-stamped sensor measurement for one component of an asset.
    Fields from docs/architecture.md § Data Model › Sensor Reading.
    """

    __tablename__ = "sensor_readings"

    reading_id = Column(Integer, primary_key=True, autoincrement=True)
    equipment_id = Column(
        String(64), ForeignKey("equipment.equipment_id", ondelete="CASCADE"), nullable=False
    )
    component_id = Column(String(64), nullable=False)   # e.g. "engine_1", "rotor_main"
    sensor_type = Column(String(64), nullable=False)    # "temperature"|"vibration"|"pressure"|"usage_hours"
    value = Column(Float, nullable=False)
    unit_of_measure = Column(String(32), nullable=True) # e.g. "°C", "g", "bar", "h"
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    raw_payload = Column(Text, nullable=True)           # original JSON blob for audit

    equipment = relationship("Equipment", back_populates="sensor_readings")


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------

class Prediction(Base):
    """
    AI prediction output for one equipment–component pair.
    Fields from docs/architecture.md § Data Model › Prediction.
    """

    __tablename__ = "predictions"

    prediction_id = Column(Integer, primary_key=True, autoincrement=True)
    equipment_id = Column(
        String(64), ForeignKey("equipment.equipment_id", ondelete="CASCADE"), nullable=False
    )
    component_id = Column(String(64), nullable=False)
    failure_probability = Column(Float, nullable=False)         # 0.0 – 1.0
    predicted_failure_date = Column(DateTime, nullable=True)
    remaining_useful_life = Column(Float, nullable=True)        # days
    confidence_score = Column(Float, nullable=False, default=0.0)
    risk_level = Column(Enum(RiskLevel), nullable=False, default=RiskLevel.LOW)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    equipment = relationship("Equipment", back_populates="predictions")


# ---------------------------------------------------------------------------
# MaintenanceTask
# ---------------------------------------------------------------------------

class MaintenanceTask(Base):
    """
    A recommended or completed maintenance action for an asset.
    Fields from docs/architecture.md § Data Model › Maintenance Task.
    """

    __tablename__ = "maintenance_tasks"

    task_id = Column(Integer, primary_key=True, autoincrement=True)
    equipment_id = Column(
        String(64), ForeignKey("equipment.equipment_id", ondelete="CASCADE"), nullable=False
    )
    component_id = Column(String(64), nullable=False)
    task_type = Column(String(128), nullable=False)             # "inspection"|"replacement"|"service"
    priority = Column(Enum(RiskLevel), nullable=False, default=RiskLevel.MEDIUM)
    recommended_action = Column(Text, nullable=False)
    estimated_downtime = Column(Float, nullable=True)           # hours
    status = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.PENDING)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    equipment = relationship("Equipment", back_populates="maintenance_tasks")
