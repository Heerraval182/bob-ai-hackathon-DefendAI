"""
Member 2 — Prediction Explanation Generator
=============================================
Produces a plain-language explanation for every AI prediction.

Sourced from docs/architecture.md § Important Functions:
  generate_explanation(prediction)

And § 4.7 Copilot Interface:
  "Explainable AI reasoning"

And docs/solution-overview.md § Key Design Decisions:
  "Plain-language explanations alongside every prediction —
   Ensures operators understand and can trust (or override) AI recommendations"
"""

from __future__ import annotations

from typing import Any


# ---------------------------------------------------------------------------
# Threshold labels (plain English for maintenance teams)
# ---------------------------------------------------------------------------

def _temp_label(val: float) -> str | None:
    if val >= 100.0: return f"critical temperature ({val:.1f}°C, limit 100°C)"
    if val >= 85.0:  return f"elevated temperature ({val:.1f}°C, warning at 85°C)"
    return None

def _vib_label(val: float) -> str | None:
    if val >= 1.0: return f"critical vibration ({val:.2f}g, limit 1.0g)"
    if val >= 0.6: return f"elevated vibration ({val:.2f}g, warning at 0.6g)"
    return None

def _trend_label(trend: float) -> str | None:
    if trend > 0.2: return f"rapidly rising vibration trend (+{trend:.2f}g above average)"
    if trend > 0.1: return f"increasing vibration trend (+{trend:.2f}g above average)"
    return None

def _pressure_label(val: float) -> str | None:
    if val <= 30.0: return f"critically low pressure ({val:.1f} bar, limit 30 bar)"
    if val <= 35.0: return f"low pressure ({val:.1f} bar, warning at 35 bar)"
    return None

def _battery_label(val: float) -> str | None:
    if val <= 10.0: return f"critically low battery ({val:.0f}%, limit 10%)"
    if val <= 25.0: return f"low battery ({val:.0f}%, warning at 25%)"
    return None

def _usage_label(val: float) -> str | None:
    if val >= 2500: return f"very high usage hours ({val:.0f}h, overhaul due at 2500h)"
    if val >= 1500: return f"high usage hours ({val:.0f}h, service recommended at 1500h)"
    return None

def _service_label(days: float) -> str | None:
    if days >= 90: return f"overdue service ({days:.0f} days since last service, limit 90 days)"
    if days >= 30: return f"service approaching ({days:.0f} days since last service)"
    return None


def generate_explanation(
    features: dict[str, Any],
    failure_probability: float,
    risk_level: str,
    rul_days: int,
    anomaly_result: dict[str, Any],
) -> str:
    """
    Returns a single plain-English string explaining why this prediction
    was generated, suitable for display in the Copilot dashboard.
    """
    factors: list[str] = []

    t = _temp_label(features.get("max_temperature", 0.0))
    if t: factors.append(t)

    v = _vib_label(features.get("max_vibration", 0.0))
    if v: factors.append(v)

    tr = _trend_label(features.get("vibration_trend", 0.0))
    if tr: factors.append(tr)

    pr = _pressure_label(features.get("min_pressure", 999.0))
    if pr: factors.append(pr)

    b = _battery_label(features.get("min_battery", 100.0))
    if b: factors.append(b)

    u = _usage_label(features.get("total_usage_hours", 0.0))
    if u: factors.append(u)

    s = _service_label(features.get("days_since_last_service", 0.0))
    if s: factors.append(s)

    # Anomaly method note
    method = anomaly_result.get("method", "rule_based")
    method_note = (
        "detected by Isolation Forest model"
        if method == "isolation_forest"
        else "identified by threshold analysis"
    )

    if not factors:
        return (
            f"Sensor readings are within normal operating parameters. "
            f"Failure probability: {failure_probability * 100:.0f}%. "
            f"Estimated remaining useful life: {rul_days} days."
        )

    factor_str = "; ".join(factors)

    if risk_level == "Critical":
        intro = (
            f"CRITICAL RISK — immediate maintenance required. "
            f"This asset has been {method_note} as highly anomalous."
        )
    elif risk_level == "High":
        intro = (
            f"HIGH RISK — maintenance should be completed before the next mission. "
            f"Anomaly {method_note}."
        )
    elif risk_level == "Medium":
        intro = f"MEDIUM RISK — monitor closely and schedule maintenance soon."
    else:
        intro = f"LOW RISK — asset is within acceptable operating parameters."

    return (
        f"{intro} "
        f"Contributing factors: {factor_str}. "
        f"Failure probability: {failure_probability * 100:.0f}%. "
        f"Estimated remaining useful life: {rul_days} days."
    )
