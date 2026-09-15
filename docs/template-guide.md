# DefendAI — Hackathon Submission Guide

This document explains the repository structure, what each file contains, and how to navigate the DefendAI submission for evaluation.

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [Repository Structure](#2-repository-structure)
3. [File-by-File Reference](#3-file-by-file-reference)
   - [submission.yaml](#31-submissionyaml)
   - [README.md](#32-readmemd)
   - [docs/](#33-docs)
   - [src/](#34-src)
   - [demo/](#35-demo)
4. [How to Run the Project](#4-how-to-run-the-project)
5. [How to Evaluate the Project](#5-how-to-evaluate-the-project)
6. [Submission Checklist](#6-submission-checklist)

---

## 1. Project Summary

**DefendAI** is a Mission Readiness & Predictive Maintenance Copilot for military fleet management. It uses AI to analyse HUMS (Health and Usage Monitoring System) sensor data, predict component failures, score mission readiness, prioritise maintenance, and answer natural-language queries through an AI Copilot powered by LLaMA 3.3 70B.

| Item | Value |
|---|---|
| **Team** | Heer (Branch: Heer) |
| **Track** | AI |
| **Stack** | Next.js 14 · TypeScript · Tailwind CSS · Recharts · Groq LLaMA 3.3 70B |
| **Deployed** | https://bob-ai-hackathon-defend-ai.vercel.app |
| **Repo** | https://github.com/Heerraval182/bob-ai-hackathon-DefendAI |

---

## 2. Repository Structure

```
bob-ai-hackathon-DefendAI/
│
├── submission.yaml              ← Team metadata and project summary
├── README.md                    ← Human-readable project overview
│
├── src/
│   └── frontend/                ← Complete Next.js 14 application
│       ├── app/
│       │   ├── api/copilot/     ← Groq streaming API route + local engine
│       │   ├── login/           ← Login page
│       │   ├── signup/          ← Signup page
│       │   ├── copilot/         ← AI Copilot chat interface
│       │   ├── equipment/       ← Equipment list + [id] detail pages
│       │   ├── alerts/          ← Alerts management page
│       │   ├── maintenance/     ← Maintenance tasks page
│       │   └── page.tsx         ← Fleet Readiness Dashboard
│       ├── components/
│       │   ├── AppShell.tsx     ← Auth guard + layout
│       │   ├── Sidebar.tsx      ← Navigation + user profile + logout
│       │   └── ui.tsx           ← Reusable component library
│       ├── lib/
│       │   ├── auth.tsx         ← Auth context (login/signup/logout/roles)
│       │   ├── api.ts           ← TypeScript interfaces + fetch helpers
│       │   ├── mockData.ts      ← Simulated HUMS sensor data + fleet records
│       │   └── copilotEngine.ts ← 841-line local Copilot intelligence engine
│       ├── .env.local.example   ← Environment variable template
│       └── package.json
│
├── docs/
│   ├── problem-statement.md     ← Problem background, affected users, why it matters
│   ├── solution-overview.md     ← Architecture, design decisions, feature breakdown
│   ├── architecture.md          ← Full system architecture with Mermaid diagram
│   └── setup-guide.md           ← Step-by-step local setup instructions
│
├── demo/
│   ├── demo-video-link.txt      ← URL to demo video
│   ├── live-demo-url.txt        ← Vercel deployment URL
│   └── screenshots/             ← App screenshots
│
└── presentation/
    └── slides.pdf               ← Slide deck
```

---

## 3. File-by-File Reference

### 3.1 `submission.yaml`

Structured metadata — the first file evaluators read. Contains team details, project summary, key features, and technology list. All required fields are filled.

### 3.2 `README.md`

Human-readable project overview including:
- Problem statement summary
- Solution description
- Key features list (8 features)
- Technology stack table
- Quick-start instructions
- Demo links
- Team information
- Known limitations

No placeholder text remains.

### 3.3 `docs/`

#### `docs/problem-statement.md`
Detailed problem analysis covering:
- Why HUMS data is currently underused
- 5 specific failure modes of existing approaches
- Primary and secondary user personas
- Quantified operational, economic, and safety impact
- Comparison table of existing solutions and why they fall short

#### `docs/solution-overview.md`
Technical solution description including:
- Full data pipeline (sensor → prediction → dashboard) with ASCII flow diagram
- Mermaid architecture diagram
- Feature breakdown for each page
- Key design decisions table with rationale
- Full technology stack table
- Current data model (6 assets × 72 sensor readings each)
- Known limitations (honest)

#### `docs/architecture.md`
System architecture covering all 7 layers (Data Sources through Copilot Interface) with component responsibility table, data flow description, and technology choices.

#### `docs/setup-guide.md`
Step-by-step setup guide including:
- Prerequisites (Node.js 18+, npm 9+)
- Environment variable documentation
- Exact clone and install commands
- Built-in demo account credentials
- Verification checklist (5 pages to check)
- Troubleshooting table (7 common issues)
- Full project file structure

### 3.4 `src/`

All source code is in `src/frontend/`. Key files:

| File | Lines | What it does |
|---|---|---|
| `app/api/copilot/route.ts` | 395 | Groq streaming API + local fallback engine with 15 fleet Q&A handlers |
| `app/copilot/page.tsx` | 428 | Three-column Copilot UI with streaming, full markdown renderer |
| `lib/copilotEngine.ts` | 841 | Rule-based intelligence engine (16 intent types, rich structured responses) |
| `lib/mockData.ts` | 74 | Simulated HUMS data for 6 assets (432 sensor readings total) |
| `lib/auth.tsx` | 96 | Auth context with login/signup/logout/localStorage persistence |
| `components/Sidebar.tsx` | 96 | Navigation with Lucide icons, user profile, logout |
| `components/ui.tsx` | 155 | Card, StatCard, StatusBadge, RiskBadge, ReadinessBar, PageHeader |

### 3.5 `demo/`

| File | Content |
|---|---|
| `demo/demo-video-link.txt` | URL to the demo video |
| `demo/live-demo-url.txt` | Vercel deployment: https://bob-ai-hackathon-defend-ai.vercel.app |
| `demo/screenshots/` | Screenshots of all major pages |

---

## 4. How to Run the Project

**Quickest path (2 commands):**

```bash
cd src/frontend
npm install && npm run dev
```

Open http://localhost:3000 — login with `hayes@defendai.mil` / `demo1234`.

Full instructions: [`docs/setup-guide.md`](setup-guide.md)

**Or use the live deployment:** https://bob-ai-hackathon-defend-ai.vercel.app

---

## 5. How to Evaluate the Project

Suggested evaluation path for judges:

| Step | Where to go | What to look for |
|---|---|---|
| 1 | `/login` | Clean dark auth UI, no quick-demo shortcuts, manual credential entry |
| 2 | `/` (Dashboard) | 4 KPI cards, equipment table with readiness bars, alerts sidebar, breakdown bar |
| 3 | `/equipment/EQ-004` | Critical asset detail — 87% failure prob, CRITICAL risk, sensor charts |
| 4 | `/alerts` | 4 critical + 1 warning alert, acknowledge functionality |
| 5 | `/maintenance` | Priority-ranked task list, status transitions, downtime totals |
| 6 | `/copilot` | Ask: *"Which equipment is not ready for tomorrow's mission?"* |
| 7 | `/copilot` | Ask: *"Explain why EQ-004 is grounded"* |
| 8 | `/copilot` | Ask: *"Show me the vibration analysis across the fleet"* |
| 9 | `/copilot` | Ask any general question (e.g., *"How does Isolation Forest work?"*) |
| 10 | Source code | `src/frontend/lib/mockData.ts` — sensor series generation |
| 11 | Source code | `src/frontend/app/api/copilot/route.ts` — local engine + Groq streaming |

---

## 6. Submission Checklist

- [x] `submission.yaml` — all required fields filled
- [x] `README.md` — no placeholder text, complete content
- [x] `docs/problem-statement.md` — written, project-specific
- [x] `docs/solution-overview.md` — written, architecture diagram included
- [x] `docs/architecture.md` — full diagram and component table
- [x] `docs/setup-guide.md` — tested, exact commands, troubleshooting table
- [x] `src/frontend/` — full Next.js application committed
- [x] `.env.local.example` — environment variable template committed (no secrets)
- [x] `.env.local` — gitignored (not committed)
- [x] `demo/demo-video-link.txt` — video URL present
- [x] `demo/live-demo-url.txt` — Vercel URL present
- [x] `demo/screenshots/` — screenshots of running application
- [x] Repository is Public
- [x] No `node_modules/`, `.next/`, or build artefacts committed
- [x] No credentials committed (API key is in `.env.local` which is gitignored)
- [x] TypeScript compiles with zero errors (`npx tsc --noEmit`)
