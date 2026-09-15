# Problem Statement

## Background

Military and defence organisations operate large, diverse fleets of aircraft, armoured vehicles, and support equipment. These assets are mission-critical — their availability directly determines operational capability. Traditional maintenance programmes rely on fixed calendar schedules: service every N hours or every N days, regardless of actual asset condition. This approach was designed for an era before real-time sensor data was available at scale.

Today, modern military platforms are equipped with **Health and Usage Monitoring Systems (HUMS)** — onboard sensor arrays that continuously measure engine temperature, rotor/track vibration, hydraulic pressure, usage hours, and dozens of other parameters. Despite this rich data stream, the vast majority of maintenance decisions are still made on time-based schedules, leaving the data largely unused for predictive purposes.

---

## The Problem

**Maintenance teams have access to live sensor data but no intelligent system to turn that data into actionable readiness decisions.**

Specifically:

1. **Reactive failure detection** — Faults are typically discovered during scheduled inspections or after a breakdown occurs in the field, not before. A CH-47 Chinook rotor system showing a 320% vibration increase over 24 hours has no automated mechanism to escalate that anomaly into a grounding decision before it becomes a catastrophic failure.

2. **Manual sensor analysis** — Maintenance technicians must manually review sensor logs across multiple systems to identify anomalies. With 6–60+ assets per unit, each generating hundreds of readings per day, this is cognitively impossible to do reliably at scale.

3. **No mission-readiness scoring** — There is no single number that answers the question: *"Is this asset deployable right now?"* Commanders must synthesise information from disparate maintenance logs, sensor printouts, and inspection reports — a process that can take hours.

4. **Fixed-interval waste** — Assets in good condition are serviced unnecessarily (wasted downtime, parts, and labour), while assets with accelerating degradation are left in service until failure. The US Army estimates that condition-based maintenance can reduce maintenance costs by 20–40% compared to time-based schedules.

5. **No explainable AI reasoning** — Even where algorithmic monitoring exists, technicians lack confidence in automated decisions because there is no explanation of *why* a system was flagged — which sensor, which trend, what threshold.

---

## Who is Affected

**Primary users:**
- **Military maintenance technicians** (e.g., Tech Sgt. Rivera) who inspect, service, and repair fleet assets daily and must prioritise their limited time across multiple work orders
- **Fleet commanders** (e.g., Commander Hayes) who need a reliable, instant answer to "which assets can I deploy for tomorrow's mission?" before an operational briefing

**Secondary stakeholders:**
- Brigade-level logistics officers managing maintenance budgets and parts inventory
- Mission planners who need readiness data to assign assets to taskings
- Safety officers responsible for airworthiness and vehicle certification

---

## Why It Matters

The consequences of this problem operate at two levels:

**Operational:** An asset that fails during a mission creates a force-protection gap at the worst possible moment. EQ-004 (CH-47 Chinook) in the current fleet has an **87% failure probability within 3 days** — a fact that was invisible to commanders before DefendAI. Without early detection, this aircraft could have been assigned to a live mission and failed in the field.

**Economic:** Unnecessary preventive maintenance consumes technician hours, spare parts, and aircraft downtime. Across a fleet of 6 assets, the current open maintenance backlog totals **176 hours of estimated downtime**. Prioritising these correctly — servicing the 87% failure-risk asset before the 4% one — directly compresses total downtime.

**Safety:** A rotor imbalance that goes undetected can lead to catastrophic structural failure. Hydraulic pressure below 180 PSI on a rotary-wing aircraft is a grounding condition. These thresholds exist in technical manuals but are not enforced automatically — they depend entirely on human vigilance.

---

## Why Existing Solutions Fall Short

| Existing Approach | Why It Falls Short |
|---|---|
| **Time-based maintenance schedules** | Services assets by the calendar, not by condition. Cannot detect accelerating degradation between service intervals. |
| **Manual HUMS data review** | Technicians check sensor printouts manually — impractical at scale, prone to human error, and produces no predictive output. |
| **Threshold-only alerting** | Simple high/low alerts fire too late (after a threshold is crossed) and have no predictive capability. Generate alert fatigue. |
| **Standalone fleet management software** | Records maintenance history but provides no AI-driven prediction, anomaly detection, or readiness scoring. |
| **Generic AI platforms** | Require significant customisation, lack domain-specific models for HUMS data, and do not integrate mission-readiness context. |

What is missing is a **unified, intelligent platform** that ingests HUMS sensor data, detects anomalies automatically, predicts component failures before they occur, calculates a real-time mission-readiness score for each asset, and presents all of this through a natural-language Copilot that any commander or technician can query — without needing to understand the underlying models.

That is what DefendAI builds.
