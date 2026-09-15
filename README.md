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
- **Predictive Failure Detection**: Analyses HUMS sensor data and historical maintenance records to identify components that are likely to fail before the next mission window.
- **Maintenance Prioritisation**: Ranks maintenance requirements based on asset condition, predicted failure risk, mission importance, and urgency.
- **Copilot Assistance**: Provides a conversational interface for querying asset health, understanding failure risks, and obtaining maintenance recommendations.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | Python, TypeScript |
| **Frameworks** | FastAPI (backend), React / Next.js (frontend) |
| **IBM Technologies** | IBM Bob (natural-language Copilot interface) |
| **Databases** | PostgreSQL (structured data), TimescaleDB (sensor time-series) |
| **AI / ML** | Scikit-learn, XGBoost, Pandas, NumPy |
| **Other** | Docker, Tailwind CSS, Chart.js |

---

## 📁 Repository Structure

```
├── src/                  # All source code
│   ├── backend/          # FastAPI backend, ML models, recommendation engine
│   ├── frontend/         # Next.js dashboard + Copilot chat interface
│   └── .env.example      # Environment variable template
├── docs/                 # Written documentation
│   ├── problem-statement.md
│   ├── solution-overview.md
│   ├── architecture.md
│   └── setup-guide.md
├── demo/                 # Demo artifacts
│   ├── screenshots/      # App screenshots
│   └── demo-video-link.txt
├── presentation/         # Slide deck
└── submission.yaml       # Structured submission metadata
```

---

## ⚡ How to Run

```bash
# 1. Clone the repo
git clone https://github.com/DefendAI/bob-ai-hackathon-DefendAI.git
cd bob-ai-hackathon-DefendAI

# 2. Start database services
docker compose up -d db

# 3. Install backend dependencies and migrate
cd src/backend
pip install -r requirements.txt
python manage.py migrate

# 4. Seed demo data
python demo/seed_demo_data.py

# 5. Start the backend
uvicorn app.main:app --reload --port 8000

# 6. Install and start the frontend (separate terminal)
cd ../frontend
npm install
npm run dev
```

Full instructions with environment variables and troubleshooting: [`docs/setup-guide.md`](docs/setup-guide.md)

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

- Uses simulated HUMS sensor data — not connected to real classified sensor feeds.
- Authentication is implemented with JWT but not production-hardened for operational deployment.
- ML models are trained on synthetic data; accuracy on real fleet data will require retraining with actual records.
- Only tested on Chrome and Firefox.

---

## 🏅 What We're Most Proud Of

Our strongest feature is the combination of mission-readiness assessment and predictive maintenance in a single Copilot. Instead of only showing raw sensor values, the system converts sensor and service data into understandable readiness insights, identifies potential component failures before the next mission window, and helps maintenance teams prioritise the actions that matter most for operational readiness.
