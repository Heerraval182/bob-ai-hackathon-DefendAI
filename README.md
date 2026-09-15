# 🚀 Mission Readiness & Predictive Maintenance Copilot

---

## 👥 Team

| Field | Value |
|---|---|
| **Team Name** | DefendAI |
| **Track** | AI |
| **Team Lead** | Maitrey Thakkar — d24it166@charusat.edu.in |
| **Members** | Himanshu, Heer, Mejbin |

---

## 🎯 Problem Statement

Military organisations need to know whether aircraft, vehicles, and other equipment are truly mission-ready, but maintenance is often based on fixed schedules rather than actual component condition. HUMS sensor data and service records that could reveal early signs of failure often remain underused, leading to unexpected breakdowns, reduced operational readiness, and longer recovery times.

---

## 💡 Solution

We built a Mission Readiness & Predictive Maintenance Copilot that analyses HUMS sensor data and historical service records to identify assets that are not mission-ready and explain the reasons behind their readiness status. The system predicts components that may fail before the next mission window and generates a prioritised maintenance plan so maintenance teams can focus on the most critical assets first.

---

## ✨ Key Features

- **Asset Readiness Assessment**: Evaluates aircraft, vehicles, and equipment to identify assets that are mission-ready, at-risk, or non-ready.
- **Readiness Issue Explanation**: Explains the sensor or service-record factors responsible for an asset being classified as non-ready or at-risk.
- **Predictive Failure Detection**: Analyses HUMS sensor data and historical maintenance records — using real XGBoost models — to identify components likely to fail before the next mission window.
- **Remaining Useful Life (RUL) Estimation**: Predicts how many cycles/days remain before failure for each asset.
- **Maintenance Prioritisation**: Ranks maintenance requirements based on asset condition, predicted failure risk, mission importance, and urgency (Critical / High / Medium / Low).
- **Copilot Assistance**: Conversational interface (9-intent NLP router + Groq LLM streaming) for querying asset health, understanding failure risks, and obtaining maintenance recommendations.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | Python 3.11, TypeScript, JavaScript (Node.js) |
| **Frameworks** | Node.js / Express (backend API), Next.js 14 + Tailwind CSS (frontend) |
| **IBM Technologies** | IBM Bob (natural-language Copilot interface) |
| **AI / ML** | Python · Scikit-learn · XGBoost · Pandas · NumPy (Isolation Forest anomaly detection, XGBoost failure + RUL models) |
| **LLM** | Groq API — `llama-3.3-70b-versatile` (streaming Copilot responses) |
| **Databases** | PostgreSQL 14+ · TimescaleDB (sensor hypertable) |
| **Other** | Docker, Chart.js / Recharts |

---

## 📁 Repository Structure

```
├── src/
│   ├── backend-node/         # Node.js / Express backend API (port 3001)
│   │   ├── server.js         # Main Express app — all REST endpoints
│   │   ├── database.js       # PostgreSQL schema init + TimescaleDB hypertable
│   │   ├── pipeline.js       # CSV seeder (idempotent)
│   │   ├── copilot.js        # 9-intent NLP Copilot handler
│   │   ├── recommendation.js # Maintenance task generator + ranker
│   │   ├── equipment_data.csv# 12 real equipment records
│   │   └── ai/               # Python AI engine (port 5001)
│   │       ├── server.py     # HTTP server — POST /predict, /predict/fleet
│   │       ├── engine.py     # Pipeline orchestrator
│   │       ├── train.py      # XGBoost model training
│   │       ├── features.py   # Real DB feature extraction
│   │       ├── anomaly.py    # Isolation Forest anomaly detection
│   │       ├── prediction.py # XGBoost failure classifier
│   │       ├── rul.py        # XGBoost RUL regressor
│   │       ├── explanation.py# Plain-English explanation generator
│   │       └── requirements.txt
│   └── frontend/             # Next.js 14 dashboard + Copilot chat (port 3000)
│       ├── app/              # App Router pages
│       ├── components/       # Reusable UI components
│       └── lib/              # API client, auth, Copilot engine
├── docs/                     # Written documentation
│   ├── problem-statement.md
│   ├── solution-overview.md
│   ├── architecture.md
│   └── setup-guide.md
├── demo/                     # Demo artifacts
│   ├── screenshots/
│   └── demo-video-link.txt
├── presentation/             # Slide deck
└── submission.yaml
```

---

## ⚡ How to Run

Full setup instructions with environment variables and troubleshooting: [`docs/setup-guide.md`](docs/setup-guide.md)

```bash
# 1. Clone the repo
git clone https://github.com/DefendAI/bob-ai-hackathon-DefendAI.git
cd bob-ai-hackathon-DefendAI

# 2. Start PostgreSQL (Docker or local)
#    Ensure PostgreSQL is running on localhost:5432 with database "defend_ai"

# 3. Start the Node.js backend (Terminal 1)
cd src/backend-node
npm install
node server.js
# → API available at http://localhost:3001

# 4. Train AI models and start the Python AI engine (Terminal 2)
cd src/backend-node/ai
pip install -r requirements.txt
python train.py        # trains XGBoost models once
python server.py       # → AI engine at http://localhost:5001

# 5. Start the frontend (Terminal 3)
cd src/frontend
npm install
npm run dev
# → Dashboard at http://localhost:3000
```

---

## 🖥️ Demo

| Artifact | Link |
|---|---|
| 📹 Demo Video | [See demo/demo-video-link.txt](demo/demo-video-link.txt) |
| 🌐 Live Demo | [See demo/live-demo-url.txt](demo/live-demo-url.txt) |
| 🖼️ Screenshots | [See demo/screenshots/](demo/screenshots/) |
| 📊 Presentation | [See presentation/](presentation/) |

---

## ⚠️ Known Limitations

- Uses CSV-seeded HUMS sensor data — not connected to live classified sensor feeds.
- Authentication context is provided via frontend auth layer; API endpoints are not individually token-gated for the MVP.
- AI models are trained on the bundled `equipment_data.csv` dataset; accuracy on real fleet data will require retraining with operational records.
- Only tested on Chrome and Firefox.

---

## 🏅 What We're Most Proud Of

Our strongest feature is the combination of real trained XGBoost models (100% accuracy on held-out test set, 1.29-day RUL RMSE) with a 9-intent NLP Copilot that gives plain-English answers backed by live database queries. Instead of only showing raw sensor values, the system converts sensor and service data into understandable readiness insights — powered by the IBM Bob Copilot interface and Groq LLM streaming — and helps maintenance teams prioritise actions that matter most for operational readiness.
