# Solution Overview

## What We Built

The Mission Readiness & Predictive Maintenance Copilot is an AI-powered platform that analyses HUMS sensor data and historical maintenance records to tell maintenance teams whether each asset is mission-ready, why it is or is not ready, which components are likely to fail before the next mission window, and what the highest-priority maintenance actions are. It replaces fixed-interval decisions with evidence-based, condition-driven maintenance planning.

## How It Works

1. **Data ingestion** — Sensor readings (temperature, vibration, pressure, usage hours) and maintenance service records are uploaded via REST API, CSV file, or simulated stream. Each record is validated, timestamped, and stored.
2. **Feature extraction** — The processing layer cleans and normalises raw readings and computes predictive features: average temperature, vibration trend, pressure deviation, usage hours, failure frequency, time since last service.
3. **Anomaly detection** — An Isolation Forest (or Autoencoder) model flags equipment whose current sensor profile deviates significantly from its historical baseline.
4. **Failure prediction** — A Random Forest / XGBoost classifier estimates the probability that each component will fail before the next mission window, together with a predicted failure date and remaining useful life.
5. **Readiness scoring** — Sensor health, predicted failure risk, maintenance history, component age, and mission requirements are combined into one of four readiness levels: `MISSION READY`, `READY WITH WARNING`, `MAINTENANCE REQUIRED`, or `NOT MISSION READY`.
6. **Maintenance prioritisation** — The recommendation engine ranks all outstanding maintenance tasks by urgency (Critical / High / Medium / Low) and generates a concrete action plan with estimated downtime.
7. **Dashboard & Copilot** — Maintenance personnel view fleet-wide readiness, drill into individual asset health, review active alerts, and ask natural-language questions such as "Which vehicles are not ready for tomorrow's mission?" or "Why is Aircraft A-102 marked high risk?"
8. **Feedback loop** — Completed maintenance records are stored and fed back into model retraining, continuously improving prediction accuracy.

## Architecture Diagram

See [`architecture.md`](architecture.md) for the full Mermaid diagram and component table.

```
[HUMS Sensors] → [Ingestion Layer] → [Processing & Feature Extraction]
                                              ↓
                                   [AI Prediction Engine]
                                    ↙             ↘
                      [Readiness Scoring]   [Recommendation Engine]
                                    ↘             ↙
                              [Copilot Dashboard]
                                        ↓
                              [PostgreSQL / TimescaleDB]
```

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Condition-based readiness scoring over simple threshold alerts | A single readiness level aggregates multiple signals and is more actionable for a mission planner than a list of raw thresholds |
| Isolation Forest for anomaly detection | Unsupervised; works well when labelled failure data is scarce, which is typical for military fleets |
| XGBoost for failure prediction | High accuracy on tabular sensor and maintenance data with minimal feature engineering; fast inference suitable for near-real-time scoring |
| Remaining Useful Life as a first-class output | Gives maintenance teams a time estimate to plan around, not just a binary "at risk" flag |
| Plain-language explanations alongside every prediction | Ensures operators understand and can trust (or override) AI recommendations — critical in safety-sensitive domains |
| Fallback rule-based logic | If AI inference is unavailable, deterministic threshold rules still produce a readiness assessment so the system never goes dark |
| Simulated HUMS data for MVP | Allows the system to be demonstrated and evaluated without requiring access to real classified sensor feeds |

## IBM Technologies Used

- **IBM Bob (AI assistant)**: Used as the natural-language Copilot interface. Operators ask maintenance and readiness questions in plain English; Bob routes queries to the backend prediction and recommendation APIs and returns structured, explainable answers. Bob is load-bearing — the conversational query layer is built entirely on top of the IBM Bob integration rather than being a separate chatbot.
