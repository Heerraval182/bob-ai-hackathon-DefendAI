# Source Code

All source code for the Mission Readiness & Predictive Maintenance Copilot lives in this folder.

## Structure

```
src/
├── backend-node/           ← Node.js / Express backend API (port 3001)
│   ├── server.js           ← Main Express app — all REST endpoints, readiness scoring
│   ├── database.js         ← PostgreSQL schema init, TimescaleDB hypertable setup
│   ├── pipeline.js         ← Idempotent CSV seeder (loads equipment_data.csv on startup)
│   ├── copilot.js          ← 9-intent NLP Copilot handler (DB-driven answers)
│   ├── recommendation.js   ← Maintenance task generator + priority ranker
│   ├── equipment_data.csv  ← 12 real equipment records with sensor readings
│   ├── package.json        ← express, pg, dotenv, cors
│   ├── .env                ← DATABASE_URL, PORT, AI_ENGINE_URL (not committed)
│   └── ai/                 ← Python AI engine (port 5001)
│       ├── server.py       ← HTTP server — POST /predict, POST /predict/fleet
│       ├── engine.py       ← Pipeline orchestrator — writes Predictions, updates mission_status
│       ├── train.py        ← Model training: XGBoost failure + RUL on equipment_data.csv
│       ├── features.py     ← Extracts feature vector from PostgreSQL sensor readings
│       ├── anomaly.py      ← Isolation Forest anomaly detection
│       ├── prediction.py   ← XGBoost binary classifier (failure probability)
│       ├── rul.py          ← XGBoost regressor (remaining useful life in days)
│       ├── explanation.py  ← Plain-English explanation generator
│       ├── requirements.txt← psycopg2-binary, scikit-learn, xgboost, numpy, pandas
│       └── models/         ← GITIGNORED: failure_model.json, rul_model.json, scaler.pkl
│
└── frontend/               ← Next.js 14 + Tailwind CSS dashboard (port 3000)
    ├── app/
    │   ├── page.tsx         ← Fleet readiness overview
    │   ├── equipment/       ← Equipment list + individual asset health pages
    │   ├── alerts/          ← Active alerts across the fleet
    │   ├── maintenance/     ← Maintenance recommendations + task list
    │   ├── copilot/         ← Natural-language Copilot chat interface
    │   └── api/copilot/     ← Next.js route handler → Groq LLM streaming
    ├── components/
    │   ├── AppShell.tsx     ← Layout shell
    │   ├── Sidebar.tsx      ← Navigation sidebar
    │   ├── SensorChart.tsx  ← Sensor trend charts
    │   └── ui.tsx           ← UI primitives (Card, Badge, Button, etc.)
    ├── lib/
    │   ├── api.ts           ← API client — all calls to Node.js backend on port 3001
    │   ├── auth.tsx         ← Auth context
    │   └── copilotEngine.ts ← Copilot intent routing + response helpers
    ├── package.json         ← next, react, tailwindcss, lucide-react
    └── .env.local           ← NEXT_PUBLIC_API_BASE_URL, GROQ_API_KEY (not committed)
```

## Key Files

| File | Purpose |
|---|---|
| `backend-node/server.js` | All Express routes — the primary backend entry point |
| `backend-node/ai/train.py` | Run once to train XGBoost models before starting the AI engine |
| `backend-node/ai/server.py` | Python AI HTTP server — must be running for predictions to work |
| `frontend/lib/api.ts` | Typed API client used by all frontend pages |
| `frontend/app/api/copilot/route.ts` | Groq LLM streaming route handler |

## What NOT to Commit

- `.env` / `.env.local` files with real secrets
- `node_modules/` or `.venv/` / virtual environment directories
- Build artefacts (`dist/`, `.next/`, `__pycache__/`)
- Trained model files (`ai/models/*.json`, `ai/models/*.pkl`) — regenerate with `python train.py`
