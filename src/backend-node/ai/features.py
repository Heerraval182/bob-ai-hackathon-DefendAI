"""
Member 2 — AI Prediction Engine
================================
Feature extraction from the SensorReadings + Equipment tables.

Sourced from docs/architecture.md § 4.3 Data Processing Layer:
  "Generate features such as: average temperature, vibration trend,
   pressure deviation, usage hours, failure frequency, time since last service"
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import psycopg2


# ---------------------------------------------------------------------------
# Sensor safe-range thresholds (from server.js computeReadiness + docs)
# ---------------------------------------------------------------------------
THRESHOLDS = {
    "temperature": {"warn": 85.0, "critical": 100.0},
    "vibration":   {"warn": 0.6,  "critical": 1.0},
    "pressure":    {"warn": 35.0, "critical": 30.0},   # low pressure is bad
    "battery":     {"warn": 25.0, "critical": 10.0},   # low battery is bad
}

USAGE_HOURS_WARN     = 1500
USAGE_HOURS_CRITICAL = 2500
SERVICE_DAYS_WARN    = 30
SERVICE_DAYS_CRITICAL = 90


def extract_features(conn, equipment_id: str) -> dict[str, Any]:
    """
    Query the database and return a flat feature dict for one asset.

    Features produced (per docs/architecture.md § 4.3):
      avg_temperature, max_temperature
      avg_vibration,   max_vibration,  vibration_trend
      avg_pressure,    min_pressure
      avg_battery,     min_battery
      total_usage_hours
      days_since_last_service
      reading_count
    """
    cur = conn.cursor()

    # Equipment record
    cur.execute(
        "SELECT total_usage_hours, last_service_date FROM Equipment WHERE equipment_id = %s",
        (equipment_id,),
    )
    eq_row = cur.fetchone()
    if eq_row is None:
        raise ValueError(f"Equipment '{equipment_id}' not found")

    usage_hours, last_service_date = eq_row

    days_since_service = 0.0
    if last_service_date:
        now = datetime.now(timezone.utc).date()
        svc = last_service_date if isinstance(last_service_date, type(now)) else last_service_date.date()
        days_since_service = (now - svc).days

    # Aggregate sensor stats from last 30 days
    cur.execute(
        """
        SELECT
            AVG(temperature)  AS avg_temp,
            MAX(temperature)  AS max_temp,
            AVG(vibration)    AS avg_vib,
            MAX(vibration)    AS max_vib,
            AVG(pressure)     AS avg_pres,
            MIN(pressure)     AS min_pres,
            AVG(battery)      AS avg_batt,
            MIN(battery)      AS min_batt,
            COUNT(*)          AS cnt
        FROM SensorReadings
        WHERE equipment_id = %s
          AND timestamp > NOW() - INTERVAL '30 days'
        """,
        (equipment_id,),
    )
    row = cur.fetchone()
    (avg_temp, max_temp, avg_vib, max_vib,
     avg_pres, min_pres, avg_batt, min_batt, cnt) = row

    # Vibration trend: avg of most-recent 5 readings vs overall avg
    cur.execute(
        """
        SELECT AVG(vibration)
        FROM (
            SELECT vibration FROM SensorReadings
            WHERE equipment_id = %s
            ORDER BY timestamp DESC
            LIMIT 5
        ) recent
        """,
        (equipment_id,),
    )
    recent_vib_avg = cur.fetchone()[0] or 0.0
    vibration_trend = float(recent_vib_avg) - float(avg_vib or 0.0)

    cur.close()

    return {
        "equipment_id":           equipment_id,
        "avg_temperature":        float(avg_temp  or 0.0),
        "max_temperature":        float(max_temp  or 0.0),
        "avg_vibration":          float(avg_vib   or 0.0),
        "max_vibration":          float(max_vib   or 0.0),
        "vibration_trend":        float(vibration_trend),
        "avg_pressure":           float(avg_pres  or 0.0),
        "min_pressure":           float(min_pres  or 0.0),
        "avg_battery":            float(avg_batt  or 100.0),
        "min_battery":            float(min_batt  or 100.0),
        "total_usage_hours":      float(usage_hours or 0.0),
        "days_since_last_service":float(days_since_service),
        "reading_count":          int(cnt or 0),
    }
