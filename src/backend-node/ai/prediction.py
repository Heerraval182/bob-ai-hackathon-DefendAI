"""
Member 2 — Failure Prediction using trained XGBoost models
============================================================
Loads the real trained models from ai/models/ and runs inference
on equipment features extracted from the live database.

Falls back to rule-based scoring ONLY if model files are missing
(e.g. first run before training — run ai/train.py first).

Models trained on NASA CMAPSS FD001 dataset (91% classifier accuracy,
36.5 RMSE on RUL). See ai/train.py and ai/models/eval.json.
"""

from __future__ import annotations

import json
import os
import pickle
import sys
from typing import Any

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import xgboost as xgb
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# ---------------------------------------------------------------------------
# Model loader (cached after first load)
# ---------------------------------------------------------------------------
_clf    = None
_reg    = None
_scaler = None
_feat_cols: list[str] | None = None


def _load_models():
    global _clf, _reg, _scaler, _feat_cols

    clf_path    = os.path.join(MODELS_DIR, "failure_model.json")
    reg_path    = os.path.join(MODELS_DIR, "rul_model.json")
    scaler_path = os.path.join(MODELS_DIR, "scaler.pkl")
    cols_path   = os.path.join(MODELS_DIR, "feature_cols.json")

    if not all(os.path.exists(p) for p in [clf_path, reg_path, scaler_path, cols_path]):
        return False

    if _clf is None:
        _clf = xgb.XGBClassifier()
        _clf.load_model(clf_path)

        _reg = xgb.XGBRegressor()
        _reg.load_model(reg_path)

        with open(scaler_path, "rb") as f:
            _scaler = pickle.load(f)

        with open(cols_path) as f:
            _feat_cols = json.load(f)

    return True


# ---------------------------------------------------------------------------
# Feature mapping
# Equipment DB features → CMAPSS-compatible feature vector
#
# The CMAPSS model was trained on per-sensor rolling statistics.
# We map the equipment DB aggregates to the closest CMAPSS equivalents:
#   s2  ≈ temperature (compressor inlet)
#   s3  ≈ pressure    (low-pressure turbine)
#   s4  ≈ temperature (high-pressure turbine)
#   s7  ≈ vibration   (fan speed proxy)
#   s11 ≈ battery/power (corrected fan speed)
#   s12 ≈ usage wear indicator
# ---------------------------------------------------------------------------

def _build_feature_vector(features: dict[str, Any]) -> np.ndarray:
    """
    Builds the feature vector in the exact column order the scaler expects.
    Feature names match equipment_data.csv / features.py exactly.
    """
    return np.array(
        [[features.get(col, 0.0) for col in (_feat_cols or [])]],
        dtype=np.float32,
    )


# ---------------------------------------------------------------------------
# Fallback rule-based scorer (only used if models not trained yet)
# ---------------------------------------------------------------------------

_TEMP_WARN, _TEMP_CRIT   = 85.0, 100.0
_VIB_WARN,  _VIB_CRIT    = 0.6,  1.0
_PRES_WARN               = 35.0
_BATT_WARN, _BATT_CRIT   = 25.0, 10.0
_USAGE_WARN, _USAGE_CRIT = 1500, 2500
_SVC_WARN,  _SVC_CRIT    = 30,   90


def _rule_based_failure_prob(features: dict[str, Any]) -> tuple[float, float]:
    score = 0.0
    t = features["max_temperature"]
    if   t >= _TEMP_CRIT: score += 0.30
    elif t >= _TEMP_WARN: score += 0.15
    v = features["max_vibration"]
    if   v >= _VIB_CRIT:  score += 0.30
    elif v >= _VIB_WARN:  score += 0.15
    if features["vibration_trend"] > 0.2: score += 0.08
    elif features["vibration_trend"] > 0.1: score += 0.04
    p = features["min_pressure"]
    if p <= _PRES_WARN: score += 0.10
    b = features["min_battery"]
    if   b <= _BATT_CRIT: score += 0.10
    elif b <= _BATT_WARN: score += 0.05
    h = features["total_usage_hours"]
    if   h >= _USAGE_CRIT: score += 0.10
    elif h >= _USAGE_WARN: score += 0.05
    d = features["days_since_last_service"]
    if   d >= _SVC_CRIT:   score += 0.07
    elif d >= _SVC_WARN:   score += 0.03
    prob = min(1.0, round(score, 4))
    rc   = features.get("reading_count", 0)
    conf = min(1.0, round(0.5 + min(rc, 100) / 200, 4))
    return prob, conf


# ---------------------------------------------------------------------------
# Risk level
# ---------------------------------------------------------------------------

def classify_risk(failure_probability: float) -> str:
    if   failure_probability >= 0.70: return "Critical"
    elif failure_probability >= 0.45: return "High"
    elif failure_probability >= 0.20: return "Medium"
    else:                              return "Low"


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def predict_failure(features: dict[str, Any], model_path: str | None = None) -> dict[str, Any]:
    """
    Returns:
        {
          "failure_probability": float,   # 0–1 from real XGBoost model
          "predicted_rul_cycles": int,    # remaining useful life in cycles
          "risk_level":           str,
          "confidence_score":     float,
          "method":               str,
        }
    """
    if XGB_AVAILABLE and _load_models():
        try:
            X = _build_feature_vector(features)
            X_scaled = _scaler.transform(X)

            prob = float(_clf.predict_proba(X_scaled)[0][1])
            rul_cycles = max(0, int(_reg.predict(X_scaled)[0]))

            # Confidence = distance from decision boundary (0.5)
            confidence = min(1.0, round(abs(prob - 0.5) * 2 + 0.5, 4))

            return {
                "failure_probability": round(prob, 4),
                "predicted_rul_cycles": rul_cycles,
                "risk_level":           classify_risk(prob),
                "confidence_score":     confidence,
                "method":               "xgboost_cmapss",
            }
        except Exception as exc:
            # Log and fall through to rule-based
            print(f"[AI] XGBoost inference error: {exc}. Using rule-based fallback.")

    prob, conf = _rule_based_failure_prob(features)
    return {
        "failure_probability":  prob,
        "predicted_rul_cycles": None,
        "risk_level":           classify_risk(prob),
        "confidence_score":     conf,
        "method":               "rule_based_fallback",
    }
