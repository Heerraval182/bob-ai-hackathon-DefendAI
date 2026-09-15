# Presentation

Place your slide deck in this folder.

## Accepted Formats

```
slides.pdf      ← Preferred (universally viewable)
slides.pptx     ← Acceptable
slides.key      ← Acceptable (macOS Keynote)
```

Rename your file to `slides.pdf` (or `slides.pptx`) so the evaluation pipeline can locate it reliably.

## Recommended Slide Structure (8–9 slides)

```
Slide 1: Title — Mission Readiness & Predictive Maintenance Copilot · Team DefendAI · AI Track
Slide 2: Problem — Fixed-schedule maintenance leaves HUMS sensor data unused; unexpected failures reduce mission readiness
Slide 3: Solution — AI-powered readiness scoring + XGBoost predictive failure detection + 9-intent NLP Copilot
Slide 4: Architecture — Three-service pipeline: Node.js backend (:3001) → Python AI engine (:5001) → Next.js frontend (:3000)
Slide 5: AI Engine — Isolation Forest anomaly detection + XGBoost failure classifier + XGBoost RUL regressor (100% accuracy, 1.29-day RMSE)
Slide 6: Key Features — Readiness levels, failure probability, RUL estimation, maintenance prioritisation (Critical/High/Medium/Low)
Slide 7: IBM Bob Integration — How the Copilot chat interface is built on IBM Bob + Groq LLM streaming
Slide 8: Demo — Screenshots of fleet dashboard, active alerts, maintenance task list, and Copilot chat in action
Slide 9: Team — Maitrey (Team Lead), Himanshu (AI/ML), Heer (Frontend), Mejbin (Backend) — roles and contributions
```

## Tips

- Keep slides visual — the architecture Mermaid diagram and readiness-status screenshots beat bullet points
- One idea per slide
- Font size minimum 24pt for readability
- Reference the repo instead of pasting large code blocks into slides
- Slide 5 (AI Engine) should highlight the real trained models, not a placeholder — mention the XGBoost metrics
