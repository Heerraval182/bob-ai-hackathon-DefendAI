# Source Code

All source code for the Mission Readiness & Predictive Maintenance Copilot lives in this folder.

## Structure

```
src/
├── backend/            ← Python FastAPI backend
│   ├── app/
│   │   ├── main.py           ← Application entry point
│   │   ├── routers/          ← API route handlers (sensors, equipment, alerts, maintenance, copilot)
│   │   ├── models/           ← SQLAlchemy data models
│   │   ├── schemas/          ← Pydantic request/response schemas
│   │   ├── services/         ← Business logic (ingestion, prediction, recommendation)
│   │   └── ml/               ← ML model training and inference
│   │       ├── anomaly.py         ← Isolation Forest anomaly detection
│   │       ├── failure_pred.py    ← XGBoost failure prediction
│   │       ├── rul.py             ← Remaining Useful Life estimation
│   │       └── readiness.py       ← Readiness scoring engine
│   ├── demo/
│   │   └── seed_demo_data.py ← Populates the DB with simulated fleet data
│   ├── tests/            ← Pytest test suite
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/           ← Next.js / React dashboard
│   ├── pages/
│   │   ├── index.tsx         ← Fleet readiness overview
│   │   ├── equipment/        ← Individual asset health pages
│   │   ├── alerts.tsx        ← Active alerts
│   │   ├── maintenance.tsx   ← Maintenance recommendations
│   │   └── copilot.tsx       ← Natural-language Copilot chat
│   ├── components/       ← Reusable UI components
│   ├── public/
│   ├── package.json
│   └── .env.example
│
└── .env.example        ← Top-level environment variable template
```

## Key Files

- `backend/requirements.txt` — Python dependency manifest
- `backend/.env.example` — Backend environment variable template
- `frontend/package.json` — Node.js dependency manifest
- `frontend/.env.example` — Frontend environment variable template

## What NOT to Commit

- `.env` files with real secrets
- `node_modules/` or `.venv/` directories
- Build artefacts (`dist/`, `build/`, `__pycache__/`)
- Large binary or model weight files (use Git LFS or link externally)
