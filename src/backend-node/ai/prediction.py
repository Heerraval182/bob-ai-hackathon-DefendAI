"""
Member 2 — Failure Prediction, Risk Level & Confidence Score
=============================================================
Predicts the probability that a component will fail before the next
mission window, assigns a risk level, and computes a confidence score.

Sourced from docs/architecture.md § 4.4 AI Prediction Engine:
  "Random Forest, XGBoost, or Logistic Regression for failure prediction"
  "Estimate failure probability"
  "Identify affected components"
  "Generate confidence scores"

Uses XGBoost when available; falls back to a calibrated rule-based scorer
so the system always produces a result (docs/solution-overview.md:
"Fallback rule-based logic").
"""

from __future__ import annotations

from typing import Any

try:
    import xgboost as xgb
    import numpy as np
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False


# ---------------------------------------------------------------------------
# Thresholds (mirror anomaly.py and server.js for consistency)
# ---------------------------------------------------------------------------
_TEMP_WARN, _TEMP_CRIT   = 85.0, 100.0
_VIB_WARN,  _VIB_CRIT    = 0.6,  1.0
_PRES_WARN               = 35.0
_BATT_WARN, _BATT_CRIT   = 25.0, 10.0
_USAGE_WARN, _USAGE_CRIT = 1500, 2500
_SVC_WARN, _SVC_CRIT     = 30,   90


# ---------------------------------------------------------------------------
# Rule-based failure probability scorer (always available)
# ---------------------------------------------------------------------------

def _rule_based_failure_prob(features: dict[str, Any]) -> tuple[float, float]:
    """
    Returns (failure_probability 0–1, confidence 0–1).

    Weighted scoring across the key features from docs/architecture.md § 4.3.
    """
    score = 0.0

    t = features["max_temperature"]
    if   t >= _TEMP_CRIT: score += 0.30
    elif t >= _TEMP_WARN: score += 0.15

    v = features["max_vibration"]
    if   v >= _VIB_CRIT:  score += 0.30
    elif v >= _VIB_WARN:  score += 0.15

    # Rising vibration trend is an early-warning signal
    if features["vibration_trend"] > 0.2:
        score += 0.08
    elif features["vibration_trend"] > 0.1:
        score += 0.04

    p = features["min_pressure"]
    if p <= _PRES_WARN:    score += 0.10

    b = features["min_battery"]
    if   b <= _BATT_CRIT:  score += 0.10
    elif b <= _BATT_WARN:  score += 0.05

    h = features["total_usage_hours"]
    if   h >= _USAGE_CRIT: score += 0.10
    elif h >= _USAGE_WARN: score += 0.05

    d = features["days_since_last_service"]
    if   d >= _SVC_CRIT:   score += 0.07
    elif d >= _SVC_WARN:   score += 0.03

    failure_prob = min(1.0, round(score, 4))

    # Confidence is higher when more readings exist and sensors are all present
    rc = features.get("reading_count", 0)
    confidence = min(1.0, round(0.5 + min(rc, 100) / 200, 4))

    return failure_prob, confidence


# ---------------------------------------------------------------------------
# XGBoost scorer (used when model weights are available)
# ---------------------------------------------------------------------------

FEATURE_COLS = [
    "avg_temperature", "max_temperature",
    "avg_vibration",   "max_vibration", "vibration_trend",
    "avg_pressure",    "min_pressure",
    "avg_battery",     "min_battery",
    "total_usage_hours", "days_since_last_service",
    "reading_count",
]


def _xgb_failure_prob(
    features: dict[str, Any],
    model_path: str,
) -> tuple[float, float]:
    """Loads a pre-trained XGBoost model and returns (prob, confidence)."""
    import numpy as np

    model = xgb.Booster()
    model.load_model(model_path)

    X = np.array([[features.get(c, 0.0) for c in FEATURE_COLS]], dtype=np.float32)
    dmat = xgb.DMatrix(X, feature_names=FEATURE_COLS)
    prob = float(model.predict(dmat)[0])
    # XGBoost output is already a probability; confidence derived from margin
    confidence = min(1.0, abs(prob - 0.5) * 2 + 0.5)
    return round(prob, 4), round(confidence, 4)


# ---------------------------------------------------------------------------
# Risk level classification
# ---------------------------------------------------------------------------

def classify_risk(failure_probability: float) -> str:
    """
    Maps failure probability to a risk level.
    Levels from docs/architecture.md § 4.6 Recommendation Engine:
      Critical, High, Medium, Low
    """
    if   failure_probability >= 0.70: return "Critical"
    elif failure_probability >= 0.45: return "High"
    elif failure_probability >= 0.20: return "Medium"
    else:                              return "Low"


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def predict_failure(
    features: dict[str, Any],
    model_path: str | None = None,
) -> dict[str, Any]:
    """
    Returns:
        {
          "failure_probability": float,
          "risk_level":          str,   # Critical | High | Medium | Low
          "confidence_score":    float,
          "method":              str,
        }
    """
    if XGB_AVAILABLE and model_path:
        try:
            prob, conf = _xgb_failure_prob(features, model_path)
            method = "xgboost"
        except Exception:
            prob, conf = _rule_based_failure_prob(features)
            method = "rule_based_fallback"
    else:
        prob, conf = _rule_based_failure_prob(features)
        method = "rule_based"

    return {
        "failure_probability": prob,
        "risk_level":          classify_risk(prob),
        "confidence_score":    conf,
        "method":              method,
    }
