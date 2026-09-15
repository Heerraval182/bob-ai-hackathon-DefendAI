"""
Sample dataset pipeline — seeds the database with simulated HUMS data.

Run from src/backend/:
    python demo/seed_demo_data.py

Populates:
  - 6 equipment records (3 aircraft, 3 vehicles) with varied readiness levels
  - ~500 sensor readings per equipment spanning the last 30 days
  - Open maintenance tasks reflecting the architecture's priority levels

Sourced from docs/architecture.md § MVP Scope:
  "Use simulated HUMS sensor data. Support aircraft or vehicle equipment records.
   Detect abnormal temperature and vibration."
"""

from __future__ import annotations

import os
import random
import sys
from datetime import datetime, timedelta, timezone

# Ensure src/backend is on the path when run directly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal, create_tables
from app.models import Equipment, MaintenanceTask, ReadinessStatus, RiskLevel, SensorReading, TaskStatus

random.seed(42)


# ---------------------------------------------------------------------------
# Fleet definition
# ---------------------------------------------------------------------------

FLEET: list[dict] = [
    {
        "equipment_id": "AC-101",
        "equipment_type": "aircraft",
        "model": "UH-60 Black Hawk",
        "unit": "1st Aviation Battalion",
        "mission_status": ReadinessStatus.MISSION_READY,
        "total_usage_hours": 1_240.5,
        "days_since_service": 10,
    },
    {
        "equipment_id": "AC-102",
        "equipment_type": "aircraft",
        "model": "AH-64 Apache",
        "unit": "2nd Attack Helicopter Battalion",
        "mission_status": ReadinessStatus.READY_WITH_WARNING,
        "total_usage_hours": 2_850.0,
        "days_since_service": 45,
    },
    {
        "equipment_id": "AC-103",
        "equipment_type": "aircraft",
        "model": "CH-47 Chinook",
        "unit": "3rd Aviation Battalion",
        "mission_status": ReadinessStatus.NOT_MISSION_READY,
        "total_usage_hours": 4_100.0,
        "days_since_service": 120,
    },
    {
        "equipment_id": "VH-201",
        "equipment_type": "vehicle",
        "model": "M1A2 Abrams",
        "unit": "1st Armored Brigade",
        "mission_status": ReadinessStatus.MISSION_READY,
        "total_usage_hours": 780.0,
        "days_since_service": 5,
    },
    {
        "equipment_id": "VH-202",
        "equipment_type": "vehicle",
        "model": "M2 Bradley",
        "unit": "2nd Mechanized Infantry",
        "mission_status": ReadinessStatus.MAINTENANCE_REQUIRED,
        "total_usage_hours": 1_560.0,
        "days_since_service": 62,
    },
    {
        "equipment_id": "VH-203",
        "equipment_type": "vehicle",
        "model": "HMMWV",
        "unit": "Support Battalion",
        "mission_status": ReadinessStatus.READY_WITH_WARNING,
        "total_usage_hours": 3_200.0,
        "days_since_service": 30,
    },
]

# Sensor profiles: (base, noise, anomaly_chance, anomaly_spike)
SENSOR_PROFILES: dict[str, dict[str, tuple]] = {
    "temperature":  {"normal": (85.0, 5.0, 0.05, 40.0)},
    "vibration":    {"normal": (12.0, 2.0, 0.05, 20.0)},
    "pressure":     {"normal": (120.0, 8.0, 0.03, 30.0)},
    "usage_hours":  {"normal": (0.5, 0.05, 0.0, 0.0)},   # incremental
}

COMPONENTS = ["engine_1", "rotor_main", "gearbox", "hydraulic_pump"]


def _reading_value(sensor_type: str, is_anomalous: bool) -> float:
    base, noise, _, spike = SENSOR_PROFILES[sensor_type]["normal"]
    val = base + random.gauss(0, noise)
    if is_anomalous:
        val += spike * random.uniform(0.8, 1.2)
    return round(max(0.0, val), 2)


def seed(db):
    now = datetime.now(timezone.utc)

    for item in FLEET:
        # --- Equipment ---
        last_service = now - timedelta(days=item["days_since_service"])
        eq = Equipment(
            equipment_id=item["equipment_id"],
            equipment_type=item["equipment_type"],
            model=item["model"],
            unit=item["unit"],
            mission_status=item["mission_status"],
            last_service_date=last_service,
            total_usage_hours=item["total_usage_hours"],
        )
        db.add(eq)

        # --- Sensor readings (30 days, ~16 readings/day per sensor per component) ---
        is_degraded = item["mission_status"] in (
            ReadinessStatus.MAINTENANCE_REQUIRED,
            ReadinessStatus.NOT_MISSION_READY,
        )
        anomaly_chance = 0.25 if is_degraded else 0.03

        for sensor_type in ["temperature", "vibration", "pressure"]:
            for component in COMPONENTS[:2]:  # keep seed size reasonable
                for i in range(480):           # ~480 readings per sensor/component
                    ts = now - timedelta(minutes=i * 90)
                    is_anomalous = random.random() < anomaly_chance
                    db.add(
                        SensorReading(
                            equipment_id=item["equipment_id"],
                            component_id=component,
                            sensor_type=sensor_type,
                            value=_reading_value(sensor_type, is_anomalous),
                            unit_of_measure={"temperature": "°C", "vibration": "g", "pressure": "bar"}[sensor_type],
                            timestamp=ts,
                        )
                    )

        # --- Maintenance tasks ---
        if item["mission_status"] == ReadinessStatus.NOT_MISSION_READY:
            db.add(MaintenanceTask(
                equipment_id=item["equipment_id"],
                component_id="engine_1",
                task_type="replacement",
                priority=RiskLevel.CRITICAL,
                recommended_action="Replace engine_1 — sustained over-temperature and vibration spike detected.",
                estimated_downtime=48.0,
                status=TaskStatus.PENDING,
            ))
        elif item["mission_status"] == ReadinessStatus.MAINTENANCE_REQUIRED:
            db.add(MaintenanceTask(
                equipment_id=item["equipment_id"],
                component_id="gearbox",
                task_type="inspection",
                priority=RiskLevel.HIGH,
                recommended_action="Inspect and service gearbox — elevated vibration trend over last 7 days.",
                estimated_downtime=8.0,
                status=TaskStatus.PENDING,
            ))
        elif item["mission_status"] == ReadinessStatus.READY_WITH_WARNING:
            db.add(MaintenanceTask(
                equipment_id=item["equipment_id"],
                component_id="hydraulic_pump",
                task_type="service",
                priority=RiskLevel.MEDIUM,
                recommended_action="Service hydraulic_pump — pressure readings nearing upper threshold.",
                estimated_downtime=4.0,
                status=TaskStatus.PENDING,
            ))

    db.commit()
    print(f"Seeded {len(FLEET)} equipment records with sensor readings and maintenance tasks.")


if __name__ == "__main__":
    create_tables()
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
