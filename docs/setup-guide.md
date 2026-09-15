# Setup Guide

> **This file is read by the automated evaluation pipeline. Be precise and complete.**

## Prerequisites

Before you begin, ensure you have the following installed:

- [ ] Python 3.11+
- [ ] Node.js 18+
- [ ] PostgreSQL 14+ (with TimescaleDB extension, or Docker Desktop)
- [ ] Git

---

## Environment Variables

### Node.js Backend (`src/backend-node/.env`)

Create the file or copy from `.env.example`:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/defend_ai
PORT=3001
AI_ENGINE_URL=http://localhost:5001
```

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `PORT` | Backend API port (default 3001) | No |
| `AI_ENGINE_URL` | URL of the Python AI engine | No |

### Frontend (`src/frontend/.env.local`)

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
BACKEND_URL=http://localhost:3001
GROQ_API_KEY=your_groq_api_key_here
```

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Node.js backend URL (client-side) | Yes |
| `BACKEND_URL` | Node.js backend URL (server-side route handlers) | Yes |
| `GROQ_API_KEY` | Groq API key for LLM streaming in Copilot chat | Yes |

---

## Database Setup

The backend auto-creates all tables on first startup. All you need is a running PostgreSQL instance with a `defend_ai` database:

```sql
-- Run once in psql or pgAdmin
CREATE DATABASE defend_ai;

-- Optional: enable TimescaleDB extension (if installed)
\c defend_ai
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

If you prefer Docker:

```bash
docker run -d \
  --name defend_ai_db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=defend_ai \
  -p 5432:5432 \
  timescale/timescaledb:latest-pg14
```

---

## Installation & Running

### Step 1 — Node.js Backend (Terminal 1)

```bash
cd src/backend-node
npm install
node server.js
```

The backend will:
1. Connect to PostgreSQL and create all tables automatically.
2. Seed the database with 12 equipment records from `equipment_data.csv` (idempotent — safe to run multiple times).
3. Start listening on **http://localhost:3001**.

### Step 2 — Python AI Engine (Terminal 2)

```bash
cd src/backend-node/ai
pip install -r requirements.txt

# Train the XGBoost models (run once — produces models/ artefacts)
python train.py

# Start the AI HTTP server
python server.py
```

The AI engine will start on **http://localhost:5001**.

> **Note:** `python train.py` must be run before `python server.py`. The trained model files are saved to `ai/models/` (gitignored). On subsequent restarts, `server.py` loads the saved models — no retraining needed.

### Step 3 — Frontend (Terminal 3)

```bash
cd src/frontend
npm install
npm run dev
```

The dashboard will be available at **http://localhost:3000**.

---

## Running AI Predictions

Once all three services are running, trigger AI predictions for the full fleet:

```bash
curl -X POST http://localhost:3001/api/predictions/run/fleet
```

Or for a single asset:

```bash
curl -X POST http://localhost:3001/api/predictions/run \
  -H "Content-Type: application/json" \
  -d '{"equipment_id": "A115"}'
```

This calls the Python engine, writes prediction results to the `Predictions` table, and updates each asset's `mission_status`.

---

## Summary of Ports

| Service | URL |
|---|---|
| Frontend (Next.js) | http://localhost:3000 |
| Backend API (Node.js) | http://localhost:3001 |
| AI Engine (Python) | http://localhost:5001 |
| PostgreSQL | localhost:5432 |

---

## Running Tests

```bash
# Frontend type-check
cd src/frontend
npx tsc --noEmit

# Frontend lint
npm run lint

# Backend (Node.js) — manual API smoke test
curl http://localhost:3001/api/equipment
curl http://localhost:3001/api/alerts
curl http://localhost:3001/api/maintenance/recommendations
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `Error: Cannot find module` on Node.js startup | Run `npm install` inside `src/backend-node/` |
| `ModuleNotFoundError` in Python | Run `pip install -r requirements.txt` inside `src/backend-node/ai/` |
| Database connection refused | Ensure PostgreSQL is running on port 5432 and the `defend_ai` database exists |
| `FileNotFoundError: models/failure_model.json` | Run `python train.py` inside `src/backend-node/ai/` first |
| AI engine returns 503 / predictions empty | Start `python server.py` in `src/backend-node/ai/` and check it is running on port 5001 |
| Frontend shows blank page or API errors | Confirm `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001` is set in `src/frontend/.env.local` |
| Copilot chat not streaming | Check `GROQ_API_KEY` is set in `src/frontend/.env.local` |
| Port 3001 already in use | Set `PORT=3002` in `src/backend-node/.env` and update `NEXT_PUBLIC_API_BASE_URL` accordingly |
| Port 5001 already in use | Edit `PORT` at the top of `src/backend-node/ai/server.py` |
