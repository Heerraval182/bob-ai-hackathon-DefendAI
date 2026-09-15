"""
Member 2 — AI Prediction Engine Orchestrator
=============================================
Ties together feature extraction, anomaly detection, failure prediction,
RUL estimation, and explanation generation, then persists results to the
Predictions table and updates the Equipment mission_status.

Sourced from docs/architecture.md § Important Functions:
  detect_anomaly(features)
  predict_failure(features)
  estimate_remaining_useful_life(features)
  calculate_readiness_score(prediction, maintenance_history)
  generate_explanation(prediction)

Entry point: run_prediction_engine(conn, equipment_id)
"""

from __future__ import annotations

import os
import sys
from typing import Any

import psycopg2

# Ensure src/backend-node/ is on sys.path so sibling ai.* imports resolve
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai.anomaly import detect_anomaly
from ai.explanation import generate_explanation
from ai.features import extract_features
from ai.prediction import predict_failure
from ai.rul import estimate_rul


# Optional XGBoost model path (set via env var)
_XGB_MODEL_PATH = os.environ.get("XGB_MODEL_PATH", None)

# ---------------------------------------------------------------------------
# Readiness status mapping
# Mirrors computeReadiness() in server.js so both layers agree
# ---------------------------------------------------------------------------

def _compute_mission_status(risk_level: str, failure_probability: float) -> str:
    """
    Maps AI risk level + failure probability to an Equipment mission_status
    string (matches the values stored by the Node.js server).
    """
    if risk_level == "Critical" or failure_probability >= 0.70:
        return "NOT MISSION READY"
    if risk_level == "High"     or failure_probability >= 0.45:
        return "MAINTENANCE REQUIRED"
    if risk_level == "Medium"   or failure_probability >= 0.20:
        return "READY WITH WARNING"
    return "MISSION READY"


# ---------------------------------------------------------------------------
# Core per-equipment prediction
# ---------------------------------------------------------------------------

def run_prediction_engine(conn, equipment_id: str) -> dict[str, Any]:
    """
    Runs the full AI pipeline for one asset:
      1. Extract features from SensorReadings + Equipment
      2. Detect anomaly
      3. Predict failure probability + risk level
      4. Estimate RUL
      5. Generate explanation
      6. Persist prediction to Predictions table
      7. Update Equipment.mission_status

    Returns the prediction dict.
    """
    # 1. Features
    features = extract_features(conn, equipment_id)

    # 2. Anomaly detection
    anomaly = detect_anomaly(features)

    # 3. Failure prediction
    pred = predict_failure(features)

    # 4. RUL — pass real XGBoost RUL cycles if available
    rul = estimate_rul(
        features,
        pred["failure_probability"],
        predicted_rul_cycles=pred.get("predicted_rul_cycles"),
    )

    # 5. Explanation
    explanation = generate_explanation(
        features=features,
        failure_probability=pred["failure_probability"],
        risk_level=pred["risk_level"],
        rul_days=rul["remaining_useful_life_days"],
        anomaly_result=anomaly,
    )

    # 6. Persist to Predictions table
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO Predictions
          (equipment_id, component_id, failure_probability,
           predicted_failure_date, remaining_useful_life,
           confidence_score, risk_level, explanation)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING prediction_id
        """,
        (
            equipment_id,
            "composite",                             # fleet-level prediction
            pred["failure_probability"],
            rul["predicted_failure_date"],
            rul["remaining_useful_life_days"],
            pred["confidence_score"],
            pred["risk_level"],
            explanation,
        ),
    )
    prediction_id = cur.fetchone()[0]

    # 7. Update Equipment.mission_status
    mission_status = _compute_mission_status(
        pred["risk_level"], pred["failure_probability"]
    )
    cur.execute(
        "UPDATE Equipment SET mission_status = %s WHERE equipment_id = %s",
        (mission_status, equipment_id),
    )
    conn.commit()
    cur.close()

    return {
        "prediction_id":           prediction_id,
        "equipment_id":            equipment_id,
        "failure_probability":     pred["failure_probability"],
        "risk_level":              pred["risk_level"],
        "confidence_score":        pred["confidence_score"],
        "remaining_useful_life":   rul["remaining_useful_life_days"],
        "predicted_failure_date":  rul["predicted_failure_date"],
        "mission_status":          mission_status,
        "anomaly_detected":        anomaly["is_anomaly"],
        "anomaly_score":           anomaly["anomaly_score"],
        "method":                  pred["method"],
        "explanation":             explanation,
    }


# ---------------------------------------------------------------------------
# Run predictions for the entire fleet
# ---------------------------------------------------------------------------

def run_fleet_predictions(conn) -> list[dict[str, Any]]:
    """Runs the prediction engine for every equipment record in the DB."""
    cur = conn.cursor()
    cur.execute("SELECT equipment_id FROM Equipment ORDER BY equipment_id")
    ids = [row[0] for row in cur.fetchall()]
    cur.close()

    results = []
    for eid in ids:
        try:
            result = run_prediction_engine(conn, eid)
            results.append(result)
            print(f"  [{eid}] {result['mission_status']} — "
                  f"risk={result['risk_level']}, "
                  f"prob={result['failure_probability']:.0%}, "
                  f"RUL={result['remaining_useful_life']}d")
        except Exception as exc:
            print(f"  [{eid}] ERROR: {exc}")

    return results
