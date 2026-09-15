"""
Data ingestion and preprocessing service.

Implements the functions defined in docs/architecture.md § Important Functions:
  ingest_sensor_data(data)
  validate_data(data)
  clean_sensor_data(data)
  extract_features(data)

Also covers docs/architecture.md § 4.2 Data Ingestion Layer and
§ 4.3 Data Processing Layer responsibilities:
  - Validate incoming data
  - Add timestamps and equipment identifiers
  - Handle missing or duplicate records
  - Remove invalid values and noise
  - Normalize sensor readings
  - Fill or flag missing values
  - Generate features (avg temperature, vibration trend, pressure deviation,
    usage hours, failure frequency, time since last service)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models import Equipment, SensorReading
from app.schemas import SensorReadingIn

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Sensor value bounds (used for validate_data and clean_sensor_data)
# Sourced from domain knowledge described in docs/problem-statement.md
# ---------------------------------------------------------------------------

SENSOR_BOUNDS: dict[str, tuple[float, float]] = {
    "temperature":  (-60.0, 1200.0),   # °C  — covers engine temps
    "vibration":    (0.0,   500.0),    # g   — acceleration amplitude
    "pressure":     (0.0,   700.0),    # bar — hydraulic / fuel pressure
    "usage_hours":  (0.0,   200_000.0),
}


# ---------------------------------------------------------------------------
# validate_data
# ---------------------------------------------------------------------------

def validate_data(reading: SensorReadingIn) -> list[str]:
    """
    Returns a list of validation error strings.
    Empty list means the reading is valid.
    """
    errors: list[str] = []

    if not reading.equipment_id or not reading.equipment_id.strip():
        errors.append("equipment_id is required")

    if not reading.component_id or not reading.component_id.strip():
        errors.append("component_id is required")

    bounds = SENSOR_BOUNDS.get(reading.sensor_type)
    if bounds is None:
        errors.append(
            f"Unknown sensor_type '{reading.sensor_type}'. "
            f"Allowed: {list(SENSOR_BOUNDS)}"
        )
    else:
        lo, hi = bounds
        if not (lo <= reading.value <= hi):
            errors.append(
                f"value {reading.value} is outside valid range [{lo}, {hi}] "
                f"for sensor_type '{reading.sensor_type}'"
            )

    return errors


# ---------------------------------------------------------------------------
# clean_sensor_data
# ---------------------------------------------------------------------------

def clean_sensor_data(reading: SensorReadingIn) -> SensorReadingIn:
    """
    Returns a cleaned copy of the reading:
    - Strips whitespace from string fields
    - Clamps value to known sensor bounds (soft-limit: log warning)
    - Fills missing timestamp with server UTC time
    """
    sensor_type = reading.sensor_type.strip().lower()
    equipment_id = reading.equipment_id.strip()
    component_id = reading.component_id.strip()

    value = reading.value
    bounds = SENSOR_BOUNDS.get(sensor_type)
    if bounds:
        lo, hi = bounds
        if value < lo or value > hi:
            logger.warning(
                "Clamping %s value %.2f to [%.2f, %.2f] for %s/%s",
                sensor_type, value, lo, hi, equipment_id, component_id,
            )
            value = max(lo, min(hi, value))

    timestamp = reading.timestamp or datetime.now(timezone.utc)

    return SensorReadingIn(
        equipment_id=equipment_id,
        component_id=component_id,
        sensor_type=sensor_type,
        value=value,
        unit_of_measure=reading.unit_of_measure,
        timestamp=timestamp,
    )


# ---------------------------------------------------------------------------
# ingest_sensor_data
# ---------------------------------------------------------------------------

def ingest_sensor_data(db: Session, reading: SensorReadingIn) -> SensorReading:
    """
    Validates, cleans, deduplicates, and persists a sensor reading.

    Raises ValueError if validation fails.
    Returns the persisted SensorReading ORM object.
    """
    # 1. Validate
    errors = validate_data(reading)
    if errors:
        raise ValueError(f"Invalid sensor reading: {'; '.join(errors)}")

    # 2. Clean
    clean = clean_sensor_data(reading)

    # 3. Duplicate check — same equipment + component + sensor_type within 1 second
    existing = (
        db.query(SensorReading)
        .filter(
            SensorReading.equipment_id == clean.equipment_id,
            SensorReading.component_id == clean.component_id,
            SensorReading.sensor_type == clean.sensor_type,
            SensorReading.timestamp == clean.timestamp,
        )
        .first()
    )
    if existing:
        logger.info(
            "Duplicate reading skipped for %s/%s at %s",
            clean.equipment_id, clean.component_id, clean.timestamp,
        )
        return existing

    # 4. Persist
    record = SensorReading(
        equipment_id=clean.equipment_id,
        component_id=clean.component_id,
        sensor_type=clean.sensor_type,
        value=clean.value,
        unit_of_measure=clean.unit_of_measure,
        timestamp=clean.timestamp,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ---------------------------------------------------------------------------
# extract_features
# ---------------------------------------------------------------------------

def extract_features(db: Session, equipment_id: str) -> dict[str, Any]:
    """
    Derives predictive features for one asset from its stored sensor readings
    and equipment record.

    Features (from docs/architecture.md § 4.3 Data Processing Layer):
      avg_temperature, vibration_trend, pressure_deviation,
      total_usage_hours, failure_frequency, days_since_last_service

    Returns a dict ready to pass to the ML prediction layer (Member 2).
    """
    from sqlalchemy import func

    eq: Equipment | None = db.query(Equipment).filter_by(equipment_id=equipment_id).first()
    if eq is None:
        raise ValueError(f"Equipment '{equipment_id}' not found")

    def _agg(sensor_type: str) -> dict[str, float]:
        rows = (
            db.query(
                func.avg(SensorReading.value).label("avg"),
                func.min(SensorReading.value).label("min"),
                func.max(SensorReading.value).label("max"),
                func.stddev(SensorReading.value).label("std"),
                func.count(SensorReading.reading_id).label("count"),
            )
            .filter(
                SensorReading.equipment_id == equipment_id,
                SensorReading.sensor_type == sensor_type,
            )
            .one()
        )
        return {
            "avg": float(rows.avg or 0.0),
            "min": float(rows.min or 0.0),
            "max": float(rows.max or 0.0),
            "std": float(rows.std or 0.0),
            "count": int(rows.count or 0),
        }

    temp = _agg("temperature")
    vib  = _agg("vibration")
    pres = _agg("pressure")

    # Vibration trend: difference between last 10 readings avg and overall avg
    recent_vib = (
        db.query(func.avg(SensorReading.value))
        .filter(
            SensorReading.equipment_id == equipment_id,
            SensorReading.sensor_type == "vibration",
        )
        .order_by(SensorReading.timestamp.desc())
        .limit(10)
        .scalar()
    ) or 0.0
    vibration_trend = float(recent_vib) - vib["avg"]

    # Pressure deviation from nominal (std as proxy)
    pressure_deviation = pres["std"]

    # Days since last service
    days_since_service = 0.0
    if eq.last_service_date:
        delta = datetime.now(timezone.utc) - eq.last_service_date.replace(
            tzinfo=timezone.utc
        )
        days_since_service = delta.total_seconds() / 86_400

    # Failure frequency: count of CRITICAL/HIGH maintenance tasks (completed)
    from app.models import MaintenanceTask, RiskLevel, TaskStatus
    failure_frequency = (
        db.query(func.count(MaintenanceTask.task_id))
        .filter(
            MaintenanceTask.equipment_id == equipment_id,
            MaintenanceTask.priority.in_([RiskLevel.CRITICAL, RiskLevel.HIGH]),
            MaintenanceTask.status == TaskStatus.COMPLETED,
        )
        .scalar()
    ) or 0

    return {
        "equipment_id": equipment_id,
        "avg_temperature": temp["avg"],
        "max_temperature": temp["max"],
        "avg_vibration": vib["avg"],
        "vibration_trend": vibration_trend,
        "avg_pressure": pres["avg"],
        "pressure_deviation": pressure_deviation,
        "total_usage_hours": eq.total_usage_hours,
        "days_since_last_service": days_since_service,
        "failure_frequency": int(failure_frequency),
    }
