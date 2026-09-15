# DefendAI — Frontend (Member 4)

Next.js dashboard for the Mission Readiness & Predictive Maintenance Copilot.

## Quick Start

```bash
cd src/frontend
npm install
cp .env.local.example .env.local
npm run dev        # http://localhost:3000
```

## Pages

| Route | Description |
|---|---|
| `/` | Fleet Dashboard — KPI cards, readiness overview, alerts |
| `/equipment` | Equipment grid with health scores |
| `/equipment/:id` | Sensor charts, AI explanation, maintenance tasks |
| `/alerts` | Severity-filtered alerts with acknowledge |
| `/maintenance` | Priority task list with start/complete workflow |
| `/copilot` | Natural-language chat interface |
