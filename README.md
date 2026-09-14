# 🚀 Mission Readiness & Predictive Maintenance
Copilot

> ⚠️ **Replace everything in `[ ]` brackets with your actual content before submission.**

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

> In 2–3 sentences: What problem does your project solve? Who experiences this problem?

Military organisations need to know whether aircraft, vehicles, and other equipment are truly mission-ready, but maintenance is often based on fixed schedules rather than actual component condition. HUMS sensor data and service records that could reveal early signs of failure often remain underused, leading to unexpected breakdowns, reduced operational readiness, and longer recovery times.
---

## 💡 Solution

> In 2–3 sentences: What did you build? How does it solve the problem above?

We built a Mission Readiness & Predictive Maintenance Copilot that analyses HUMS sensor data and historical service records to identify assets that are not mission-ready and explain the reasons behind their readiness status. The system predicts components that may fail before the next mission window and generates a prioritised maintenance plan so maintenance teams can focus on the most critical assets first.
---

## ✨ Key Features

Asset Readiness Assessment: Evaluates aircraft, vehicles, and equipment to identify assets that are mission-ready, at-risk, or non-ready.
Readiness Issue Explanation: Explains the sensor or service-record factors responsible for an asset being classified as non-ready or at-risk.
Predictive Failure Detection: Analyses HUMS sensor data and historical maintenance records to identify components that are likely to fail before the next mission window.
Maintenance Prioritisation: Ranks maintenance requirements based on asset condition, predicted failure risk, mission importance, and urgency.
Copilot Assistance: Provides a conversational interface for querying asset health, understanding failure risks, and obtaining maintenance recommendations.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | [e.g., Python, TypeScript] |
| **Frameworks** | [e.g., FastAPI, React] |
| **IBM Technologies** | [e.g., watsonx.ai, IBM Bob, IBM Cloud] |
| **Databases** | [e.g., PostgreSQL, Redis] |
| **Other** | [e.g., Docker, GitHub Actions] |

---

## 📁 Repository Structure

```
├── src/                  # All source code
├── docs/                 # Written documentation
│   ├── problem-statement.md
│   ├── solution-overview.md
│   ├── architecture.md
│   └── setup-guide.md
├── demo/                 # Demo artifacts
│   ├── screenshots/      # App screenshots
│   └── demo-video-link.txt  # Link to demo video
├── presentation/         # Slide deck
└── submission.yaml       # Structured submission metadata
```

---

## ⚡ How to Run

> **Copy these exact steps from your [`docs/setup-guide.md`](docs/setup-guide.md)**


```bash
# 1. Clone the repo
git clone https://github.com/[your-repo].git
cd [your-repo]

# 2. Install dependencies
[your install command here]

# 3. Configure environment
cp .env.example .env
# Edit .env with your values

# 4. Run the project
[your run command here]
```

---

## 🖥️ Demo

| Artifact | Link |
|---|---|
| 📹 Demo Video | [See demo/demo-video-link.txt](demo/demo-video-link.txt) |
| 🌐 Live Demo | [See demo/live-demo-url.txt](demo/live-demo-url.txt) |
| 🖼️ Screenshots | [See demo/screenshots/](demo/screenshots/) |
| 📊 Presentation | [See presentation/slides.pdf](presentation/) |

---

## ⚠️ Known Limitations

> Be honest — judges appreciate transparency over overclaiming.

- [Limitation 1: e.g., "Authentication is mocked — not production-ready"]
- [Limitation 2: e.g., "Only tested on Chrome"]
- [Limitation 3: e.g., "Feature X is scaffolded but not fully implemented"]

---

## 🏅 What We're Most Proud Of

Our strongest feature is the combination of mission-readiness assessment and predictive maintenance in a single Copilot. Instead of only showing raw sensor values, the system converts sensor and service data into understandable readiness insights, identifies potential component failures before the next mission window, and helps maintenance teams prioritise the actions that matter most for operational readiness.
---
