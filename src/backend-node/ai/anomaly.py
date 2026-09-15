"""
Member 2 — Anomaly Detection
==============================
Isolation Forest for unsupervised anomaly detection on sensor features.

Falls back to threshold-based rules when fewer than 10 readings exist
(cold-start, per docs/solution-overview.md § Key Design Decisions:
 "Fallback rule-based logic").

Sourced from docs/architecture.md § 4.4 AI Prediction Engine:
  "Isolation Forest or Autoencoder for anomaly detection"
  "Compare current readings with historical patterns"
  "Generate confidence scores"
"""

from __future__ import annotations

from typing import Any

import numpy as np

# sklearn is optional — graceful fallback if not installed
try:
    from sklearn.ensemble import IsolationForest
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

# Threshold rules mirror server.js computeReadiness so the two layers agree
_TEMP_WARN     = 85.0
_TEMP_CRIT     = 100.0
_VIB_WARN      = 0.6
_VIB_CRIT      = 1.0
_PRES_WARN     = 35.0   # low pressure threshold
_BATT_WARN     = 25.0
_BATT_CRIT     = 10.0
_USAGE_WARN    = 1500
_USAGE_CRIT    = 2500
_SVC_WARN_DAYS = 30
_SVC_CRIT_DAYS = 90


def _rule_based_anomaly(features: dict[str, Any]) -> tuple[bool, float]:
    """
    Returns (is_anomaly, anomaly_score_0_to_1).
    Score = fraction of warning/critical thresholds breached, weighted.
    """
    score = 0.0
    max_score = 0.0

    def check(val, warn, crit, weight, invert=False):
        nonlocal score, max_score
        max_score += weight
        if invert:
            # Lower is worse (pressure, battery)
            if val <= crit:
                score += weight
            elif val <= warn:
                score += weight * 0.5
        else:
            if val >= crit:
                score += weight
            elif val >= warn:
                score += weight * 0.5

    check(features["max_temperature"],        _TEMP_WARN,  _TEMP_CRIT,  0.30)
    check(features["max_vibration"],           _VIB_WARN,   _VIB_CRIT,   0.30)
    check(features["min_pressure"],            _PRES_WARN,  _PRES_WARN,  0.15, invert=True)
    check(features["min_battery"],             _BATT_WARN,  _BATT_CRIT,  0.10, invert=True)
    check(features["total_usage_hours"],       _USAGE_WARN, _USAGE_CRIT, 0.10)
    check(features["days_since_last_service"], _SVC_WARN_DAYS, _SVC_CRIT_DAYS, 0.05)

    # Vibration rising trend adds to score
    if features["vibration_trend"] > 0.15:
        score += 0.05 * max_score

    normalised = min(1.0, score / max_score) if max_score else 0.0
    return normalised >= 0.4, round(normalised, 4)


def detect_anomaly(
    features: dict[str, Any],
    historical_features: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """
    Returns:
        {
          "is_anomaly": bool,
          "anomaly_score": float,   # 0.0 (normal) – 1.0 (highly anomalous)
          "method": "isolation_forest" | "rule_based",
        }

    Uses Isolation Forest when sklearn is available and ≥10 historical samples
    are provided; otherwise falls back to rule-based scoring.
    """
    FEATURE_COLS = [
        "avg_temperature", "max_temperature",
        "avg_vibration",   "max_vibration", "vibration_trend",
        "avg_pressure",    "min_pressure",
        "avg_battery",     "min_battery",
        "total_usage_hours", "days_since_last_service",
    ]

    use_ml = (
        SKLEARN_AVAILABLE
        and historical_features is not None
        and len(historical_features) >= 10
    )

    if use_ml:
        all_rows = historical_features + [features]
        X = np.array([[r.get(c, 0.0) for c in FEATURE_COLS] for r in all_rows])
        X_current = X[-1:].reshape(1, -1)
        X_history = X[:-1]

        clf = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)
        clf.fit(X_history)

        # score_samples returns negative; more negative = more anomalous
        raw_score = clf.score_samples(X_current)[0]
        # Normalise: raw range is roughly [-0.5, 0]; map to [0, 1]
        anomaly_score = float(np.clip(1.0 + raw_score * 2, 0.0, 1.0))
        is_anomaly = clf.predict(X_current)[0] == -1

        return {
            "is_anomaly":    is_anomaly,
            "anomaly_score": round(anomaly_score, 4),
            "method":        "isolation_forest",
        }

    # Fallback
    is_anomaly, anomaly_score = _rule_based_anomaly(features)
    return {
        "is_anomaly":    is_anomaly,
        "anomaly_score": anomaly_score,
        "method":        "rule_based",
    }
