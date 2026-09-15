# Setup Guide

> **Read this fully before starting. The frontend is a Next.js app located at `src/frontend/` — all commands must be run from that directory.**

---

## Prerequisites

Ensure the following are installed before proceeding:

- [ ] **Node.js 18+** — download at https://nodejs.org (`node --version` to verify)
- [ ] **npm 9+** — bundled with Node.js (`npm --version` to verify)
- [ ] **Git** — to clone the repository
- [ ] **A modern browser** — Chrome, Firefox, or Edge

Optional (for AI Copilot natural-language mode):
- [ ] **Groq API key** — free at https://console.groq.com (no credit card required)

---

## Environment Variables

The frontend reads from `src/frontend/.env.local`. A template is provided:

```bash
# From the repo root
cp src/frontend/.env.local.example src/frontend/.env.local
```

Then open `src/frontend/.env.local` and fill in the values:

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL (no trailing slash). Use `http://localhost:8000` if no backend is deployed. | Yes |
| `GROQ_API_KEY` | Groq API key for LLaMA 3.3 70B natural-language Copilot. Get free at https://console.groq.com | No |

> **Note:** `GROQ_API_KEY` is optional. Without it, the Copilot uses the built-in local intelligence engine that answers all fleet questions using pre-computed data. It is fully functional without a key.

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/Heerraval182/bob-ai-hackathon-DefendAI.git
cd bob-ai-hackathon-DefendAI

# 2. Navigate to the frontend
cd src/frontend

# 3. Install dependencies
npm install

# 4. Copy environment file
cp .env.local.example .env.local
# Edit .env.local and set GROQ_API_KEY if you have one (optional)
```

---

## Running the Application

```bash
# From src/frontend/
npm run dev
```

The application will be available at: **http://localhost:3000**

You will be redirected to the login page automatically.

### Demo accounts (built-in, no signup needed)

| Email | Password | Role |
|---|---|---|
| `hayes@defendai.mil` | `demo1234` | Fleet Commander |
| `rivera@defendai.mil` | `demo1234` | Maintenance Tech |

Or click **"Create account"** on the login page to register a new account.

---

## Verifying It Works

After logging in, you should see:

1. **`/`** — Fleet Readiness Dashboard with 4 KPI cards and equipment status list
2. **`/equipment`** — Grid of 6 equipment cards (EQ-001 through EQ-006)
3. **`/alerts`** — 5 alerts (4 critical, 1 warning)
4. **`/maintenance`** — 7 prioritised maintenance tasks
5. **`/copilot`** — Three-column AI chat interface

To test the Copilot, type: *"Which equipment is not ready for tomorrow's mission?"*

---

## Production Build (optional)

```bash
# From src/frontend/
npm run build
npm run start
```

---

## Deployed Demo

The project is deployed on Vercel:

**https://bob-ai-hackathon-defend-ai.vercel.app**

No local setup is required to view the live demo.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `npm error ENOENT: package.json not found` | You are in the wrong directory. Run `cd src/frontend` first. |
| Login page shows but login fails | Enter exactly `hayes@defendai.mil` / `demo1234`. Credentials are case-sensitive. |
| Copilot shows "No API key" hint | This is informational only — the Copilot still works. Add `GROQ_API_KEY` to `.env.local` for natural-language mode. |
| Port 3000 already in use | Run `npm run dev -- -p 3001` to use port 3001 instead. |
| TypeScript errors on build | Run `npx tsc --noEmit` — should produce zero errors. If not, run `npm install` again. |
| Blank page after login | Hard-refresh the browser (`Ctrl+Shift+R`). Clear `localStorage` if the issue persists. |
| `GROQ_API_KEY` not working | Ensure the key starts with `gsk_` and that you restarted the dev server after editing `.env.local`. |

---

## Project Structure (inside `src/frontend/`)

```
src/frontend/
├── app/
│   ├── api/copilot/route.ts   ← Groq API route + local fallback engine
│   ├── login/page.tsx         ← Login page
│   ├── signup/page.tsx        ← Signup page
│   ├── copilot/page.tsx       ← AI Copilot chat interface
│   ├── equipment/             ← Equipment list + detail pages
│   ├── alerts/                ← Alerts page
│   ├── maintenance/           ← Maintenance tasks page
│   └── page.tsx               ← Fleet dashboard (home)
├── components/
│   ├── AppShell.tsx           ← Auth guard + layout wrapper
│   ├── Sidebar.tsx            ← Navigation sidebar with user profile
│   └── ui.tsx                 ← Reusable UI components
├── lib/
│   ├── auth.tsx               ← Auth context (login/signup/logout)
│   ├── api.ts                 ← API types and fetch helpers
│   ├── mockData.ts            ← Mock HUMS sensor data and fleet records
│   └── copilotEngine.ts       ← Rule-based local Copilot engine
├── .env.local                 ← Your environment variables (gitignored)
└── .env.local.example         ← Template — safe to commit
```
