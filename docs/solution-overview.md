# Solution Overview

## What We Built

The Mission Readiness & Predictive Maintenance Copilot is an AI-powered platform that analyses HUMS sensor data and historical maintenance records to tell maintenance teams whether each asset is mission-ready, why it is or is not ready, which components are likely to fail before the next mission window, and what the highest-priority maintenance actions are. It replaces fixed-interval decisions with evidence-based, condition-driven maintenance planning.

## How It Works

1. **Data ingestion** — Sensor readings (temperature, vibration, pressure, battery, usage hours) for 12 assets are loaded from `equipment_data.csv` into PostgreSQL via the Node.js backend on startup. New readings can also be posted via `POST /api/sensors/ingest`.
2. **Feature extraction** — `features.py` queries PostgreSQL for each asset's latest readings and computes a feature vector: temperature, vibration, pressure, battery, usage hours, days since last service, and a normalised health score.
3. **Anomaly detection** — An Isolation Forest model (`anomaly.py`) flags equipment whose current sensor profile deviates significantly from the fleet baseline, producing an anomaly score.
4. **Failure prediction** — An XGBoost binary classifier (`prediction.py`) estimates the probability that each asset will fail, together with a risk level: Critical, High, Medium, or Low.
5. **Remaining Useful Life** — An XGBoost regressor (`rul.py`) predicts how many days remain before failure, giving maintenance teams a concrete planning window.
6. **Readiness scoring** — The Node.js backend (`server.js`) combines sensor thresholds and AI prediction outputs into one of four readiness levels: `MISSION READY`, `READY WITH WARNING`, `MAINTENANCE REQUIRED`, or `NOT MISSION READY`.
7. **Maintenance prioritisation** — `recommendation.js` reads the latest predictions and generates a ranked task list (Critical → High → Medium → Low) with estimated downtime per action.
8. **Dashboard & Copilot** — Maintenance personnel view fleet-wide readiness on the Next.js dashboard, drill into individual asset health, review active alerts, and ask natural-language questions such as *"Which vehicles are not ready for tomorrow's mission?"* or *"Why is Aircraft A-102 marked high risk?"*. The Copilot uses a 9-intent NLP router backed by live database queries; complex free-form queries are streamed through Groq `llama-3.3-70b-versatile`.
9. **Feedback loop** — Completed maintenance records are stored in `MaintenanceTasks` and will feed future model retraining cycles.

## Architecture Diagram

See [`architecture.md`](architecture.md) for the full Mermaid diagram and component table.

```
[HUMS Sensors / CSV] → [Node.js Backend :3001] → [PostgreSQL + TimescaleDB]
                                                           ↓
                                               [Python AI Engine :5001]
                                         ↙ anomaly   ↓ failure   ↘ RUL
                                    [engine.py Orchestrator]
                                     ↙                        ↘
                        [recommendation.js]             [copilot.js NLP Router]
                                     ↘                        ↙
                                  [Next.js Frontend :3000]
```

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Node.js/Express for backend API | Matches the existing codebase built by Heer; enables fast JSON APIs with minimal boilerplate |
| Separate Python AI engine (port 5001) | Keeps ML dependencies isolated; the AI engine can be updated, retrained, or containerised independently of the API layer |
| Condition-based readiness scoring over simple threshold alerts | A single readiness level aggregates multiple signals and is more actionable for a mission planner than a list of raw thresholds |
| Isolation Forest for anomaly detection | Unsupervised; works well when labelled failure data is scarce, which is typical for military fleets |
| XGBoost for failure prediction and RUL | High accuracy on tabular sensor + maintenance data; fast inference; 100% accuracy on held-out test set, 1.29-day RUL RMSE on the training dataset |
| Remaining Useful Life as a first-class output | Gives maintenance teams a time estimate to plan around, not just a binary "at risk" flag |
| Plain-language explanations alongside every prediction | Ensures operators understand and can trust (or override) AI recommendations — critical in safety-sensitive domains |
| Fallback rule-based readiness scoring | `computeReadiness()` in `server.js` activates when the Python AI engine is unreachable so the system never goes dark |
| Groq LLM streaming for Copilot | Sub-second token streaming gives a responsive chat experience without hosting a local LLM |

## IBM Technologies Used

- **IBM Bob (AI assistant)**: Used as the natural-language Copilot interface. Operators ask maintenance and readiness questions in plain English; the system routes queries through the 9-intent NLP handler backed by real database queries, with Groq LLM streaming for free-form follow-up questions. Bob is load-bearing — the conversational query layer is built entirely on top of the IBM Bob integration rather than being a separate chatbot.
