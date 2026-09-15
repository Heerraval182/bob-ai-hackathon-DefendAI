# Setup Guide

> **This file is read by the automated evaluation pipeline. Be precise and complete.**

## Prerequisites

Before you begin, ensure you have the following installed:

- [ ] Python 3.11+
- [ ] Node.js 18+
- [ ] Docker Desktop (for running PostgreSQL and TimescaleDB)
- [ ] Git

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp src/.env.example src/.env
```

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/defendai`) | Yes |
| `TIMESCALE_URL` | TimescaleDB connection string for sensor data | Yes |
| `SECRET_KEY` | Secret key for JWT auth tokens | Yes |
| `IBM_BOB_API_KEY` | IBM Bob API key for Copilot integration | Yes |
| `DEBUG` | Set to `true` for development mode | No |

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/DefendAI/bob-ai-hackathon-DefendAI.git
cd bob-ai-hackathon-DefendAI

# 2. Start the database services
docker compose up -d db

# 3. Install backend dependencies
cd src/backend
pip install -r requirements.txt

# 4. Run database migrations
python manage.py migrate

# 5. Install frontend dependencies
cd ../frontend
npm install
```

## Running the Application

```bash
# Start the backend API (from src/backend/)
uvicorn app.main:app --reload --port 8000

# Start the frontend (in a separate terminal, from src/frontend/)
npm run dev
```

The application will be available at: `http://localhost:3000`

The API will be available at: `http://localhost:8000`

API documentation (Swagger UI): `http://localhost:8000/docs`

## Seeding Demo Data

To populate the system with simulated HUMS sensor data and equipment records:

```bash
# From src/backend/
python demo/seed_demo_data.py
```

This loads a fleet of simulated aircraft and vehicle records, sensor readings, and maintenance history so the dashboard shows realistic readiness statuses and alerts immediately.

## Running Tests

```bash
# Backend tests (from src/backend/)
pytest tests/ -v

# Frontend tests (from src/frontend/)
npm run test
```

## Troubleshooting

| Issue | Solution |
|---|---|
| `ModuleNotFoundError` on startup | Run `pip install -r requirements.txt` again inside `src/backend/` |
| Database connection refused | Ensure Docker is running and the DB container is up: `docker compose up -d db` |
| Frontend shows blank page | Check that the backend is running on port 8000 and `NEXT_PUBLIC_API_URL` is set correctly |
| IBM Bob Copilot not responding | Check `IBM_BOB_API_KEY` in your `.env` file is valid |
| Port 8000 already in use | Change the port: `uvicorn app.main:app --reload --port 8001` and update the frontend env accordingly |
