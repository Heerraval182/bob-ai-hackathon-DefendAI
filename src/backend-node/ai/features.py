"""
Member 2 — Feature Extraction
================================
Queries SensorReadings + Equipment from the real DB schema
(as defined in database.js) and returns a flat feature dict.

DB columns in SensorReadings:
  reading_id, equipment_id, component_id, sensor_type,
  temperature, vibration, pressure, battery, timestamp

DB columns in Equipment:
  equipment_id, equipment_type, model, unit, mission_status,
  last_service_date, total_usage_hours
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def extract_features(conn, equipment_id: str) -> dict[str, Any]:
    """
    Returns a flat feature dict for one asset derived from real DB data.

    Features:
      avg_temperature, max_temperature,
      avg_vibration,   max_vibration,  vibration_trend,
      avg_pressure,    min_pressure,
      avg_battery,     min_battery,
      total_usage_hours,
      days_since_last_service,
      reading_count
    """
    cur = conn.cursor()

    # --- Equipment record ---
    cur.execute(
        "SELECT total_usage_hours, last_service_date FROM Equipment WHERE equipment_id = %s",
        (equipment_id,),
    )
    eq_row = cur.fetchone()
    if eq_row is None:
        cur.close()
        raise ValueError(f"Equipment '{equipment_id}' not found")

    usage_hours, last_service_date = eq_row

    days_since_service = 0.0
    if last_service_date:
        now_date = datetime.now(timezone.utc).date()
        svc_date = (
            last_service_date.date()
            if hasattr(last_service_date, "date")
            else last_service_date
        )
        days_since_service = float((now_date - svc_date).days)

    # --- Aggregate stats from all SensorReadings for this equipment ---
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
        """,
        (equipment_id,),
    )
    row = cur.fetchone()
    (avg_temp, max_temp, avg_vib, max_vib,
     avg_pres, min_pres, avg_batt, min_batt, cnt) = row

    # --- Vibration trend: avg of 5 most-recent readings vs overall avg ---
    cur.execute(
        """
        SELECT AVG(v) FROM (
            SELECT vibration AS v
            FROM SensorReadings
            WHERE equipment_id = %s
              AND vibration IS NOT NULL
            ORDER BY timestamp DESC
            LIMIT 5
        ) recent
        """,
        (equipment_id,),
    )
    recent_vib = cur.fetchone()[0] or 0.0
    vibration_trend = float(recent_vib) - float(avg_vib or 0.0)

    cur.close()

    return {
        "equipment_id":            equipment_id,
        "avg_temperature":         float(avg_temp  or 0.0),
        "max_temperature":         float(max_temp  or 0.0),
        "avg_vibration":           float(avg_vib   or 0.0),
        "max_vibration":           float(max_vib   or 0.0),
        "vibration_trend":         round(vibration_trend, 6),
        "avg_pressure":            float(avg_pres  or 0.0),
        "min_pressure":            float(min_pres  or 999.0),
        "avg_battery":             float(avg_batt  or 100.0),
        "min_battery":             float(min_batt  or 100.0),
        "total_usage_hours":       float(usage_hours or 0.0),
        "days_since_last_service": days_since_service,
        "reading_count":           int(cnt or 0),
    }
