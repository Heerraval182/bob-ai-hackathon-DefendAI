"""
Member 2 — Remaining Useful Life (RUL) Estimation
===================================================
Converts the XGBoost-predicted RUL (in CMAPSS cycles) to calendar days
and a predicted failure date for display in the dashboard.

One CMAPSS cycle ≈ one flight mission. We use a configurable
HOURS_PER_CYCLE to convert cycles to real days based on fleet
operating tempo (default 1 cycle = 1 operational day).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

# 1 CMAPSS cycle ≈ 1 operational day (adjustable via env var)
import os
CYCLE_TO_DAYS = float(os.environ.get("CYCLE_TO_DAYS", "1.0"))


def estimate_rul(
    features: dict[str, Any],
    failure_probability: float,
    predicted_rul_cycles: int | None = None,
) -> dict[str, Any]:
    """
    Returns:
        {
          "remaining_useful_life_days": int,
          "predicted_failure_date":     str,   # ISO-8601
          "rul_confidence":             str,   # "high" | "medium" | "low"
        }

    Uses XGBoost-predicted RUL cycles when available (real model output).
    Falls back to probability-based estimate only when model is not loaded.
    """
    # --- Use real XGBoost RUL output ---
    if predicted_rul_cycles is not None:
        rul_days = max(0, int(predicted_rul_cycles * CYCLE_TO_DAYS))
        rul_days = min(rul_days, 730)    # cap at 2 years

        predicted_failure_date = (
            datetime.now(timezone.utc) + timedelta(days=rul_days)
        ).date().isoformat()

        # Confidence based on failure probability distance from boundary
        if failure_probability >= 0.65 or failure_probability <= 0.10:
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

    # --- Fallback: probability-based estimate (no model loaded) ---
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

    # Linear interpolation between 0 and 200 days
    rul_days = max(0, int((1.0 - failure_probability) * 200))
    rul_days = min(rul_days, 365)
    predicted_failure_date = (
        datetime.now(timezone.utc) + timedelta(days=rul_days)
    ).date().isoformat()

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
