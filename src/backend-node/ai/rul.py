"""
Member 2 — Remaining Useful Life (RUL) Estimation
===================================================
Estimates the number of days until a component is predicted to fail,
based on the current failure probability and operational context.

Sourced from docs/architecture.md § 4.4 AI Prediction Engine:
  "Predict remaining useful life"
  "Regression or time-series models for remaining useful life"

Uses a degradation-rate model:
  RUL = (1 - failure_probability) / daily_degradation_rate

Daily degradation rate is estimated from:
  - Usage hours per day (proxy for wear rate)
  - Vibration trend direction (rising = faster degradation)
  - Days since last service (deferred maintenance = faster degradation)
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Baseline daily degradation rate (fraction of remaining life consumed per day)
# at nominal operating conditions.
_BASE_DAILY_RATE = 0.005          # ~200 days at 0% failure prob → 100% at nominal

_HOURS_PER_DAY_NOMINAL = 4.0      # assumed operating hours/day for the fleet

# Multipliers applied to the base rate based on sensor conditions
_VIB_TREND_MULTIPLIER   = 1.5     # rising vibration → 50% faster wear
_HIGH_USAGE_MULTIPLIER  = 1.3     # >1500 h total → faster wear
_DEFERRED_SVC_MULTIPLIER = 1.2    # >30 days since service → faster wear


def estimate_rul(
    features: dict[str, Any],
    failure_probability: float,
) -> dict[str, Any]:
    """
    Returns:
        {
          "remaining_useful_life_days": int,      # estimated days until failure
          "predicted_failure_date":     str,       # ISO-8601 date string
          "rul_confidence":             str,       # "high" | "medium" | "low"
        }

    Edge cases:
      - failure_probability >= 0.95 → RUL = 0 (effectively failed)
      - failure_probability <= 0.05 → RUL = 365 (capped, considered healthy)
    """
    if failure_probability >= 0.95:
        return {
            "remaining_useful_life_days": 0,
            "predicted_failure_date":     datetime.now(timezone.utc).date().isoformat(),
            "rul_confidence":             "high",
        }

    if failure_probability <= 0.05:
        future = datetime.now(timezone.utc) + timedelta(days=365)
        return {
            "remaining_useful_life_days": 365,
            "predicted_failure_date":     future.date().isoformat(),
            "rul_confidence":             "low",
        }

    # Compute daily degradation rate with multipliers
    rate = _BASE_DAILY_RATE

    if features.get("vibration_trend", 0.0) > 0.1:
        rate *= _VIB_TREND_MULTIPLIER

    if features.get("total_usage_hours", 0.0) >= 1500:
        rate *= _HIGH_USAGE_MULTIPLIER

    if features.get("days_since_last_service", 0.0) >= 30:
        rate *= _DEFERRED_SVC_MULTIPLIER

    # Remaining life fraction = 1 - failure_probability
    remaining_fraction = 1.0 - failure_probability

    # RUL in days
    rul_days = max(0, int(remaining_fraction / rate))

    # Cap at 365 days — predictions beyond a year are unreliable
    rul_days = min(rul_days, 365)

    predicted_failure_date = (
        datetime.now(timezone.utc) + timedelta(days=rul_days)
    ).date().isoformat()

    # Confidence: higher when failure probability is definitive (not borderline)
    if failure_probability >= 0.60 or failure_probability <= 0.15:
        rul_confidence = "high"
    elif failure_probability >= 0.35:
        rul_confidence = "medium"
    else:
        rul_confidence = "low"

    return {
        "remaining_useful_life_days": rul_days,
        "predicted_failure_date":     predicted_failure_date,
        "rul_confidence":             rul_confidence,
    }
