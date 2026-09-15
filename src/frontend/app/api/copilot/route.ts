import { NextRequest } from "next/server";
import {
  mockEquipment,
  mockHealthMap,
  mockAlerts,
  mockMaintenanceTasks,
  mockReport,
} from "@/lib/mockData";

// ─── Build full system prompt ─────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const fleetDate = new Date(mockReport.generated_at).toLocaleString();

  const equipmentLines = mockEquipment.map((eq) => {
    const h = mockHealthMap[eq.equipment_id];
    return [
      `### ${eq.equipment_id} - ${eq.model} (${eq.equipment_type})`,
      `- Unit: ${eq.unit}`,
      `- Mission Status: ${eq.mission_status}`,
      `- Readiness Score: ${h.readiness_score}%  |  Risk Level: ${h.risk_level}`,
      `- Failure Probability: ${(h.failure_probability * 100).toFixed(0)}%`,
      `- Remaining Useful Life: ${h.remaining_useful_life_days ?? "N/A"} days`,
      `- Predicted Failure Date: ${h.predicted_failure_date ?? "None within window"}`,
      `- Last Service: ${eq.last_service_date}  |  Total Usage: ${eq.total_usage_hours}h`,
      `- AI Explanation: ${h.prediction?.explanation ?? "N/A"}`,
    ].join("\n");
  });

  const sensorLines = mockEquipment.map((eq) => {
    const h = mockHealthMap[eq.equipment_id];
    const bySensor: Record<string, number[]> = {};
    h.sensor_readings.forEach((r) => {
      if (!bySensor[r.sensor_type]) bySensor[r.sensor_type] = [];
      bySensor[r.sensor_type].push(r.value);
    });
    const summaries = Object.entries(bySensor).map(([type, vals]) => {
      const latest = vals[vals.length - 1];
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const trend = vals[vals.length - 1] - vals[0] > 0 ? "rising" : "falling";
      return `  - ${type}: latest=${latest.toFixed(2)}, avg=${avg.toFixed(2)}, min=${min.toFixed(2)}, max=${max.toFixed(2)}, trend=${trend}`;
    });
    return `${eq.equipment_id} (${eq.model}):\n${summaries.join("\n")}`;
  });

  const alertLines = mockAlerts.map(
    (a) =>
      `- [${a.severity}] ${a.alert_id} | ${a.equipment_id} / ${a.component}: ${a.message} | ${new Date(a.timestamp).toLocaleString()} | Acknowledged: ${a.acknowledged}`
  );

  const taskLines = mockMaintenanceTasks.map(
    (t) =>
      `- [${t.priority}] ${t.task_id} | ${t.equipment_id} / ${t.component_id} | ${t.task_type} | Status: ${t.status} | Action: ${t.recommended_action} | Downtime: ${t.estimated_downtime}h`
  );

  return [
    "You are DefendAI Copilot - a highly capable AI assistant built into a military fleet management platform.",
    "",
    "== IDENTITY ==",
    "You can answer ANY question a user asks - both fleet-specific questions using the live data below, and general questions on any topic (science, coding, history, math, writing, analysis, etc.).",
    "Never refuse a question. Never say you cannot answer something. If it is fleet-related, use the data. If it is general, answer from your knowledge.",
    "",
    "== RESPONSE FORMAT ==",
    "- Always use markdown formatting: ## headers, **bold**, - bullet lists, numbered lists, ```code blocks```, tables, > blockquotes",
    "- For fleet questions: cite specific equipment IDs, sensor readings, and scores",
    "- For general questions: be thorough, clear, and educational",
    "- Structure complex answers with sections and headers",
    "",
    "== LIVE FLEET DATA (as of " + fleetDate + ") ==",
    "",
    "FLEET SUMMARY:",
    "Total assets: " + mockReport.total_equipment,
    "Mission Ready: " + mockReport.mission_ready,
    "Ready with Warning: " + mockReport.ready_with_warning,
    "Maintenance Required: " + mockReport.maintenance_required,
    "Not Mission Ready: " + mockReport.not_mission_ready,
    "Critical Alerts: " + mockReport.critical_alerts,
    "",
    "READINESS FORMULA:",
    "Score = Sensor Health (30%) + Inverse Failure Probability (30%) + Maintenance Recency (20%) + Component Age (10%) + Mission Compatibility (10%)",
    ">=85% = MISSION READY | 65-84% = READY WITH WARNING | 40-64% = MAINTENANCE REQUIRED | <40% = NOT MISSION READY",
    "",
    "SENSOR THRESHOLDS:",
    "Temperature: ELEVATED >10% above baseline, CRITICAL >25% or >120C",
    "Vibration: ELEVATED >10% above baseline, CRITICAL >25% above baseline",
    "Hydraulic Pressure: Safe minimum 180 PSI, CRITICAL below 180 PSI",
    "",
    "== EQUIPMENT STATUS ==",
    "",
    equipmentLines.join("\n\n"),
    "",
    "== SENSOR READINGS LAST 24H ==",
    "",
    sensorLines.join("\n\n"),
    "",
    "== ALL ALERTS ==",
    "",
    alertLines.join("\n"),
    "",
    "== ALL MAINTENANCE TASKS ==",
    "",
    taskLines.join("\n"),
  ].join("\n");
}

// ─── Local fallback engine (no API key needed) ────────────────────────────────

function buildLocalAnswer(question: string): string {
  const q = question.toLowerCase();

  // ── Fleet: not ready / grounded ──────────────────────────────────────────
  if (q.match(/not ready|grounded|cannot deploy|can.t deploy|undeployable/)) {
    return [
      "## Assets Not Mission Ready",
      "",
      "**2 assets cannot be deployed:**",
      "",
      "### EQ-004 - CH-47 Chinook (NOT MISSION READY)",
      "- **Readiness Score:** 22% | **Failure Probability:** 87% | **Risk:** CRITICAL",
      "- **Remaining Useful Life:** 3 days | **Predicted failure:** 2024-11-23",
      "- **Why grounded:** Multiple critical anomalies detected simultaneously:",
      "  - Main rotor imbalance exceeds safe threshold",
      "  - Hydraulic pressure at 160 PSI (below 180 PSI safe minimum)",
      "  - Engine temperature at 135C (critically elevated)",
      "- **Action required:** Immediate full inspection before any flight. All 3 systems need service.",
      "",
      "### EQ-003 - M1A2 Abrams (MAINTENANCE REQUIRED)",
      "- **Readiness Score:** 45% | **Failure Probability:** 62% | **Risk:** CRITICAL",
      "- **Remaining Useful Life:** 8 days | **Predicted failure:** 2024-11-28",
      "- **Key issues:**",
      "  - Engine temperature 118C - critical overheating",
      "  - Hydraulic pressure dropping below operational minimum",
      "  - Track vibration anomaly detected",
      "- **Action required:** Engine overhaul + hydraulic service before next operation",
      "",
      "> **Summary:** EQ-004 is fully grounded, EQ-003 requires maintenance before deployment.",
    ].join("\n");
  }

  // ── Fleet: mission ready ──────────────────────────────────────────────────
  if (q.match(/mission ready|ready for mission|can deploy|who is ready|which.*ready/)) {
    return [
      "## Mission Ready Assets",
      "",
      "**4 assets are available for deployment:**",
      "",
      "### Fully Mission Ready (2 assets)",
      "",
      "**EQ-001 - UH-60 Black Hawk** (Aircraft, 1st Aviation Bn)",
      "- Readiness: **94%** | Risk: **LOW** | Failure Probability: **4%**",
      "- Remaining Useful Life: 210 days | Last Service: 2024-11-10",
      "- Status: All sensor readings nominal. Engine temperature stable. Vibration normal.",
      "",
      "**EQ-005 - Bradley IFV** (Vehicle, 3rd Armored Bn)",
      "- Readiness: **97%** | Risk: **LOW** | Failure Probability: **2%**",
      "- Remaining Useful Life: 340 days | Last Service: 2024-11-18 (recently serviced)",
      "- Status: All systems nominal. No anomalies detected.",
      "",
      "### Ready with Warning (2 assets - monitor closely)",
      "",
      "**EQ-002 - AH-64 Apache** (Aircraft, 2nd Attack Bn)",
      "- Readiness: **71%** | Risk: **HIGH** | Failure Probability: **28%**",
      "- Rotor vibration +40% over 72h. Inspect before next mission.",
      "",
      "**EQ-006 - HMMWV** (Vehicle, 4th Support Bn)",
      "- Readiness: **68%** | Risk: **HIGH** | Failure Probability: **31%**",
      "- Axle vibration above baseline. Schedule inspection within 2 weeks.",
    ].join("\n");
  }

  // ── Fleet: overview / summary ─────────────────────────────────────────────
  if (q.match(/overview|summary|fleet status|all equipment|how many|dashboard/)) {
    return [
      "## Fleet Readiness Overview",
      "**Report date:** November 20, 2024 08:00",
      "",
      "| Status | Count | Assets |",
      "|---|---|---|",
      "| Mission Ready | 2 | EQ-001 (Black Hawk), EQ-005 (Bradley IFV) |",
      "| Ready with Warning | 2 | EQ-002 (Apache), EQ-006 (HMMWV) |",
      "| Maintenance Required | 1 | EQ-003 (M1A2 Abrams) |",
      "| Not Mission Ready | 1 | EQ-004 (CH-47 Chinook) - GROUNDED |",
      "",
      "**Critical Alerts:** 4 active (all unacknowledged)",
      "",
      "## Readiness Score Breakdown",
      "",
      "| Asset | Score | Risk | Failure Prob. | RUL |",
      "|---|---|---|---|---|",
      "| EQ-005 Bradley IFV | 97% | LOW | 2% | 340 days |",
      "| EQ-001 Black Hawk | 94% | LOW | 4% | 210 days |",
      "| EQ-002 Apache | 71% | HIGH | 28% | 25 days |",
      "| EQ-006 HMMWV | 68% | HIGH | 31% | 30 days |",
      "| EQ-003 M1A2 Abrams | 45% | CRITICAL | 62% | 8 days |",
      "| EQ-004 CH-47 Chinook | 22% | CRITICAL | 87% | 3 days |",
      "",
      "> **Readiness Formula:** Score = Sensor Health (30%) + Inverse Failure Probability (30%) + Maintenance Recency (20%) + Component Age (10%) + Mission Compatibility (10%)",
    ].join("\n");
  }

  // ── Alerts ────────────────────────────────────────────────────────────────
  if (q.match(/alert|warning|critical|notification/)) {
    return [
      "## Active Alerts (5 total, 4 unacknowledged)",
      "",
      "### CRITICAL Alerts",
      "",
      "**ALT-001** | EQ-004 CH-47 Chinook | Main Rotor",
      "Rotor imbalance exceeds safe threshold - aircraft grounded",
      "_Nov 20, 2024 06:32 | Unacknowledged_",
      "",
      "**ALT-002** | EQ-003 M1A2 Abrams | Engine",
      "Engine temperature 118C - critical overheating detected",
      "_Nov 20, 2024 07:15 | Unacknowledged_",
      "",
      "**ALT-004** | EQ-003 M1A2 Abrams | Hydraulic System",
      "Hydraulic pressure dropping below operational minimum",
      "_Nov 20, 2024 07:45 | Unacknowledged_",
      "",
      "**ALT-006** | EQ-004 CH-47 Chinook | Hydraulic System",
      "Hydraulic pressure at 160 PSI - below safe limit of 180 PSI",
      "_Nov 20, 2024 08:01 | Unacknowledged_",
      "",
      "### WARNING Alerts",
      "",
      "**ALT-003** | EQ-002 AH-64 Apache | Tail Rotor",
      "Rotor vibration trending +40% over 72h",
      "_Nov 19, 2024 22:00 | Unacknowledged_",
      "",
      "**ALT-005** | EQ-006 HMMWV | Front Axle",
      "Axle vibration above baseline - schedule inspection",
      "_Nov 19, 2024 14:30 | **Acknowledged**_",
    ].join("\n");
  }

  // ── Vibration ─────────────────────────────────────────────────────────────
  if (q.match(/vibrat/)) {
    return [
      "## Vibration Analysis - Fleet Wide",
      "",
      "| Asset | Component | Latest (g) | Baseline (g) | Deviation | Status |",
      "|---|---|---|---|---|---|",
      "| EQ-004 CH-47 Chinook | Main Rotor (COMP-ROTOR) | 2.1+ | 0.5 | +320% | **CRITICAL** |",
      "| EQ-003 M1A2 Abrams | Track (COMP-TRACK) | 1.4+ | 0.6 | +133% | **CRITICAL** |",
      "| EQ-002 AH-64 Apache | Tail Rotor (COMP-ROTOR) | 0.8+ | 0.5 | +60% | **ELEVATED** |",
      "| EQ-006 HMMWV | Front Axle (COMP-AXLE) | 0.9+ | 0.6 | +50% | **ELEVATED** |",
      "| EQ-001 Black Hawk | Main Rotor (COMP-ROTOR) | 0.4 | 0.4 | 0% | NORMAL |",
      "| EQ-005 Bradley IFV | Track (COMP-TRACK) | 0.3 | 0.3 | 0% | NORMAL |",
      "",
      "## Key Findings",
      "",
      "- **EQ-004 is most critical** - rotor vibration 320% above baseline, contributing to grounding",
      "- **EQ-002 Apache** - rotor vibration increased 40% over past 72 hours (trending upward)",
      "- **EQ-006 HMMWV** - axle vibration above baseline, scheduled for inspection",
      "",
      "> Threshold: ELEVATED = >10% above baseline | CRITICAL = >25% above baseline",
    ].join("\n");
  }

  // ── Temperature ───────────────────────────────────────────────────────────
  if (q.match(/temper|overheat|hot|thermal/)) {
    return [
      "## Engine Temperature Analysis",
      "",
      "| Asset | Latest Temp | Baseline | Deviation | Status |",
      "|---|---|---|---|---|",
      "| EQ-004 CH-47 Chinook | 135C+ | 98C | +38% | **CRITICAL** |",
      "| EQ-003 M1A2 Abrams | 118C+ | 95C | +24% | **CRITICAL** |",
      "| EQ-002 AH-64 Apache | 102C+ | 92C | +11% | **ELEVATED** |",
      "| EQ-006 HMMWV | 98C | 90C | +9% | NORMAL |",
      "| EQ-001 Black Hawk | 85C | 85C | 0% | NORMAL |",
      "| EQ-005 Bradley IFV | 80C | 80C | 0% | NORMAL |",
      "",
      "## Analysis",
      "",
      "- **EQ-004 Chinook** - temperature 135C, far above safe operating range. Contributing to grounding.",
      "- **EQ-003 Abrams** - 118C triggers critical alert ALT-002. Engine overhaul required.",
      "- **EQ-002 Apache** - borderline elevated. Monitor closely on next mission.",
      "",
      "> Threshold: ELEVATED = >10% above baseline | CRITICAL = >25% above baseline or absolute >120C",
    ].join("\n");
  }

  // ── Hydraulic pressure ────────────────────────────────────────────────────
  if (q.match(/pressure|hydraulic/)) {
    return [
      "## Hydraulic Pressure Analysis",
      "",
      "| Asset | Latest PSI | Normal PSI | Deviation | Status |",
      "|---|---|---|---|---|",
      "| EQ-004 CH-47 Chinook | 160 | 210 | -24% | **CRITICAL** |",
      "| EQ-003 M1A2 Abrams | 175 | 210 | -17% | **CRITICAL** |",
      "| EQ-002 AH-64 Apache | 195 | 210 | -7% | ELEVATED |",
      "| EQ-006 HMMWV | 200 | 210 | -5% | NORMAL |",
      "| EQ-001 Black Hawk | 210 | 210 | 0% | NORMAL |",
      "| EQ-005 Bradley IFV | 215 | 215 | 0% | NORMAL |",
      "",
      "## Key Findings",
      "",
      "- **EQ-004** - 160 PSI is below the 180 PSI safe minimum. Active critical alert ALT-006.",
      "- **EQ-003** - 175 PSI, below minimum. Active critical alert ALT-004. Hydraulic service in progress (TSK-003).",
      "- **EQ-002** - trending downward, approaching safe minimum. Monitor closely.",
      "",
      "> Safe minimum: 180 PSI | CRITICAL: below 180 PSI",
    ].join("\n");
  }

  // ── Maintenance / service priority ────────────────────────────────────────
  if (q.match(/mainten|service|repair|fix|task|priority|first/)) {
    return [
      "## Prioritised Maintenance Plan",
      "",
      "**7 open tasks | Total estimated downtime: 176 hours**",
      "",
      "### CRITICAL Priority",
      "",
      "**TSK-001** | EQ-004 CH-47 Chinook | Main Rotor | PENDING",
      "Immediate rotor system inspection. Replace main rotor blade assembly. Ground aircraft until cleared.",
      "_Estimated downtime: 72 hours_",
      "",
      "**TSK-002** | EQ-003 M1A2 Abrams | Engine | PENDING",
      "Engine coolant flush and thermostat replacement. Full engine inspection required before next operation.",
      "_Estimated downtime: 48 hours_",
      "",
      "**TSK-003** | EQ-003 M1A2 Abrams | Hydraulic System | IN PROGRESS",
      "Replace hydraulic fluid and inspect lines for leaks. Pressure test all hydraulic circuits.",
      "_Estimated downtime: 24 hours_",
      "",
      "### HIGH Priority",
      "",
      "**TSK-004** | EQ-002 AH-64 Apache | Tail Rotor | PENDING",
      "Perform dynamic balancing of tail rotor. Inspect drive shaft bearings. Schedule within 5 flight hours.",
      "_Estimated downtime: 16 hours_",
      "",
      "**TSK-005** | EQ-006 HMMWV | Front Axle | PENDING",
      "Inspect front axle CV joints and bearings. Lubricate and replace worn components.",
      "_Estimated downtime: 8 hours_",
      "",
      "### MEDIUM Priority",
      "",
      "**TSK-006** | EQ-002 AH-64 Apache | Engine | PENDING",
      "100-hour service: oil change, filter replacement, spark plug check.",
      "_Estimated downtime: 6 hours_",
      "",
      "### LOW Priority",
      "",
      "**TSK-007** | EQ-001 Black Hawk | Hydraulic System | PENDING",
      "Hydraulic fluid level check and top-up at next scheduled maintenance window.",
      "_Estimated downtime: 2 hours_",
    ].join("\n");
  }

  // ── Failure risk / probability ─────────────────────────────────────────────
  if (q.match(/fail|probabilit|risk|breakdown|danger/)) {
    return [
      "## Failure Risk Assessment - All Assets",
      "",
      "| Rank | Asset | Failure Probability | Risk Level | RUL | Predicted Failure |",
      "|---|---|---|---|---|---|",
      "| 1 | EQ-004 CH-47 Chinook | **87%** | CRITICAL | 3 days | 2024-11-23 |",
      "| 2 | EQ-003 M1A2 Abrams | **62%** | CRITICAL | 8 days | 2024-11-28 |",
      "| 3 | EQ-006 HMMWV | **31%** | HIGH | 30 days | 2024-12-20 |",
      "| 4 | EQ-002 AH-64 Apache | **28%** | HIGH | 25 days | 2024-12-15 |",
      "| 5 | EQ-001 Black Hawk | **4%** | LOW | 210 days | None predicted |",
      "| 6 | EQ-005 Bradley IFV | **2%** | LOW | 340 days | None predicted |",
      "",
      "## AI Explanations",
      "",
      "**EQ-004 (87% risk):** Multiple critical anomalies - rotor imbalance, hydraulic failure, engine overheat. Aircraft grounded pending full inspection.",
      "",
      "**EQ-003 (62% risk):** Engine temperature critically elevated. Hydraulic pressure dropping. Track vibration anomaly. Immediate maintenance required.",
      "",
      "**EQ-006 (31% risk):** Axle vibration increasing. High mileage since last service. Schedule inspection within 2 weeks.",
      "",
      "**EQ-002 (28% risk):** Rotor vibration +40% over 72h. Temperature trending upward. Inspect before next mission.",
      "",
      "> Model: XGBoost failure classifier | Confidence scores: 0.79 - 0.96",
    ].join("\n");
  }

  // ── Remaining useful life ─────────────────────────────────────────────────
  if (q.match(/remaining|useful.?life|rul|days.?left|how.?long/)) {
    return [
      "## Remaining Useful Life (RUL) - All Assets",
      "",
      "| Asset | RUL | Urgency | Predicted Failure |",
      "|---|---|---|---|",
      "| EQ-004 CH-47 Chinook | **3 days** | CRITICAL | 2024-11-23 |",
      "| EQ-003 M1A2 Abrams | **8 days** | CRITICAL | 2024-11-28 |",
      "| EQ-002 AH-64 Apache | **25 days** | HIGH | 2024-12-15 |",
      "| EQ-006 HMMWV | **30 days** | HIGH | 2024-12-20 |",
      "| EQ-001 Black Hawk | **210 days** | LOW | None predicted |",
      "| EQ-005 Bradley IFV | **340 days** | LOW | None predicted |",
      "",
      "## What is RUL?",
      "",
      "**Remaining Useful Life (RUL)** is the estimated number of days before a critical component is expected to require replacement or major overhaul.",
      "",
      "It is calculated using a regression model trained on sensor degradation curves and historical failure timelines. It considers:",
      "- Rate of sensor value change (trend slope)",
      "- Distance from failure threshold",
      "- Historical failure patterns for similar equipment",
      "- Component age and total usage hours",
    ].join("\n");
  }

  // ── Specific equipment ─────────────────────────────────────────────────────
  const eqMatch = question.toUpperCase().match(/EQ-0*(\d+)/);
  if (eqMatch) {
    const id = "EQ-00" + eqMatch[1];
    const normalId = id.replace("EQ-000", "EQ-00").replace("EQ-004", "EQ-004");
    const eq = mockEquipment.find((e) => e.equipment_id === normalId || e.equipment_id === "EQ-00" + eqMatch[1]);
    const h = eq ? mockHealthMap[eq.equipment_id] : null;
    if (eq && h) {
      return [
        `## ${eq.equipment_id} - ${eq.model}`,
        "",
        `**Type:** ${eq.equipment_type} | **Unit:** ${eq.unit}`,
        `**Mission Status:** ${eq.mission_status}`,
        "",
        "## Health Summary",
        "",
        `| Metric | Value |`,
        `|---|---|`,
        `| Readiness Score | ${h.readiness_score}% |`,
        `| Risk Level | ${h.risk_level} |`,
        `| Failure Probability | ${(h.failure_probability * 100).toFixed(0)}% |`,
        `| Remaining Useful Life | ${h.remaining_useful_life_days ?? "N/A"} days |`,
        `| Predicted Failure | ${h.predicted_failure_date ?? "None within window"} |`,
        `| Last Service | ${eq.last_service_date} |`,
        `| Total Usage Hours | ${eq.total_usage_hours}h |`,
        "",
        "## AI Assessment",
        "",
        h.prediction?.explanation ?? "No prediction data available.",
        "",
        "## Active Alerts",
        "",
        mockAlerts.filter((a) => a.equipment_id === eq.equipment_id).length === 0
          ? "No active alerts."
          : mockAlerts
              .filter((a) => a.equipment_id === eq.equipment_id)
              .map((a) => `- [${a.severity}] ${a.component}: ${a.message}`)
              .join("\n"),
        "",
        "## Open Maintenance Tasks",
        "",
        mockMaintenanceTasks.filter((t) => t.equipment_id === eq.equipment_id && t.status !== "COMPLETED").length === 0
          ? "No open maintenance tasks."
          : mockMaintenanceTasks
              .filter((t) => t.equipment_id === eq.equipment_id && t.status !== "COMPLETED")
              .map((t) => `- [${t.priority}] ${t.task_type}: ${t.recommended_action}`)
              .join("\n"),
      ].join("\n");
    }
  }

  // ── Readiness score explanation ────────────────────────────────────────────
  if (q.match(/readiness|score|how.*calculated|formula/)) {
    return [
      "## Readiness Score - How It Works",
      "",
      "The readiness score is a composite index from 0-100% calculated as:",
      "",
      "| Component | Weight | Description |",
      "|---|---|---|",
      "| Sensor Health Index | 30% | Normalized score based on how far sensors are from anomaly thresholds |",
      "| Inverse Failure Probability | 30% | (1 - failure_probability) x 100 |",
      "| Maintenance Recency | 20% | Time since last service vs recommended interval |",
      "| Component Age Index | 10% | Component age vs expected lifespan |",
      "| Mission Compatibility | 10% | Match between asset capability and current mission profile |",
      "",
      "## Readiness Thresholds",
      "",
      "| Score | Status |",
      "|---|---|",
      "| >= 85% | MISSION READY |",
      "| 65-84% | READY WITH WARNING |",
      "| 40-64% | MAINTENANCE REQUIRED |",
      "| < 40% | NOT MISSION READY |",
      "",
      "## Current Fleet Scores",
      "",
      "| Asset | Score | Status |",
      "|---|---|---|",
      "| EQ-005 Bradley IFV | 97% | MISSION READY |",
      "| EQ-001 Black Hawk | 94% | MISSION READY |",
      "| EQ-002 Apache | 71% | READY WITH WARNING |",
      "| EQ-006 HMMWV | 68% | READY WITH WARNING |",
      "| EQ-003 M1A2 Abrams | 45% | MAINTENANCE REQUIRED |",
      "| EQ-004 CH-47 Chinook | 22% | NOT MISSION READY |",
    ].join("\n");
  }

  // ── HUMS / predictive maintenance explanation ──────────────────────────────
  if (q.match(/hums|health.*usage.*monitoring|predictive|condition.based/)) {
    return [
      "## Health and Usage Monitoring Systems (HUMS)",
      "",
      "HUMS is an onboard data acquisition system installed on military aircraft and vehicles to continuously monitor the health of critical components.",
      "",
      "## What HUMS Measures",
      "",
      "- **Vibration** - accelerometers on rotors, engines, gearboxes, axles",
      "- **Temperature** - thermocouples on engines, gearboxes, hydraulics",
      "- **Pressure** - transducers on hydraulic and fuel systems",
      "- **Usage Hours** - flight/operating hours per component",
      "- **Oil Analysis** - debris detection in lubricants",
      "",
      "## How DefendAI Uses HUMS Data",
      "",
      "1. **Data Ingestion** - Sensor readings collected every hour",
      "2. **Anomaly Detection** - Isolation Forest algorithm flags deviations >10% from baseline",
      "3. **Failure Prediction** - XGBoost classifier estimates failure probability",
      "4. **RUL Estimation** - Regression model predicts remaining useful life",
      "5. **Readiness Scoring** - Composite index drives mission-ready classification",
      "6. **Maintenance Recommendations** - Priority-ranked task list generated automatically",
      "",
      "## Benefits Over Fixed-Interval Maintenance",
      "",
      "| Fixed-Interval | Condition-Based (HUMS) |",
      "|---|---|",
      "| Service on calendar schedule | Service when data indicates need |",
      "| May replace healthy components | Replace only when worn |",
      "| Misses sudden failures | Detects developing faults early |",
      "| High maintenance cost | 20-40% cost reduction |",
      "| Lower availability | Higher operational availability |",
    ].join("\n");
  }

  // ── Isolation Forest / ML explanation ─────────────────────────────────────
  if (q.match(/isolation.?forest|anomaly.?detect|machine.?learn|ml model|xgboost|random.?forest/)) {
    return [
      "## Anomaly Detection - Isolation Forest",
      "",
      "The Isolation Forest algorithm is used in DefendAI to detect unusual sensor readings without needing labeled failure data.",
      "",
      "## How It Works",
      "",
      "1. Build multiple random decision trees (the 'forest')",
      "2. For each data point, count how many splits are needed to isolate it",
      "3. **Normal points** require many splits (they blend in with others)",
      "4. **Anomalous points** are isolated quickly (they stand out)",
      "5. A short average path length = anomaly score",
      "",
      "```python",
      "from sklearn.ensemble import IsolationForest",
      "",
      "model = IsolationForest(contamination=0.05, random_state=42)",
      "model.fit(normal_sensor_data)",
      "scores = model.decision_function(new_readings)",
      "anomalies = scores < threshold",
      "```",
      "",
      "## Failure Prediction - XGBoost",
      "",
      "After anomalies are detected, XGBoost predicts failure probability:",
      "",
      "- **Features:** sensor trend slopes, component age, usage hours, maintenance gap, anomaly score",
      "- **Target:** binary failure within next 30 days",
      "- **Output:** probability (0-100%) + risk classification",
      "",
      "## Why These Models?",
      "",
      "| Model | Why Used |",
      "|---|---|",
      "| Isolation Forest | Works without failure labels, fast on streaming data |",
      "| XGBoost | High accuracy on tabular sensor data, handles missing values |",
      "| RUL Regression | Continuous output needed for maintenance scheduling |",
    ].join("\n");
  }

  // ── General greeting ───────────────────────────────────────────────────────
  if (q.match(/^(hi|hello|hey|good morning|good evening|howdy)/)) {
    return [
      "## Hello! I'm DefendAI Copilot",
      "",
      "I'm your AI-powered fleet intelligence assistant. Here's what I can help with:",
      "",
      "### Fleet Operations",
      "- Mission readiness status for all 6 assets",
      "- Active alerts and anomaly detection",
      "- Sensor readings (vibration, temperature, hydraulic pressure)",
      "- Failure probability and remaining useful life",
      "- Prioritised maintenance recommendations",
      "",
      "### Analysis & Explanation",
      "- How the AI prediction models work",
      "- Readiness score calculation",
      "- HUMS sensor interpretation",
      "- Condition-based vs preventive maintenance",
      "",
      "### General Questions",
      "- Military aviation and vehicle systems",
      "- Any technical question you have",
      "",
      "**Try asking:** *Which equipment is not ready for tomorrow's mission?*",
    ].join("\n");
  }

  // ── Default: show what you know ────────────────────────────────────────────
  return [
    "## DefendAI Copilot - Fleet Intelligence",
    "",
    "I have full access to your fleet data. Here's a quick summary of what I know:",
    "",
    "**Fleet Status (Nov 20, 2024):**",
    "- 6 total assets | 2 mission ready | 2 ready with warning | 1 needs maintenance | 1 grounded",
    "- 4 critical active alerts",
    "",
    "**You can ask me about:**",
    "",
    "| Topic | Example Questions |",
    "|---|---|",
    "| Readiness | Which equipment is mission ready? |",
    "| Alerts | Show all active critical alerts |",
    "| Sensors | Which engines are overheating? |",
    "| Risk | Which asset has highest failure probability? |",
    "| Maintenance | Which component should be serviced first? |",
    "| Specific Asset | Tell me about EQ-004 |",
    "| RUL | What is the remaining useful life of each asset? |",
    "| How It Works | Explain how the readiness score is calculated |",
    "| HUMS | How does the anomaly detection model work? |",
    "",
    "> **Tip:** Add your Groq API key to `src/frontend/.env.local` to unlock full natural-language AI for any question.",
    "> Get a free key at https://console.groq.com",
  ].join("\n");
}

// ─── Helper: send a string as a fake SSE stream ───────────────────────────────

function streamText(text: string, isFallback = false): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send the full text in one chunk (instant, no streaming delay)
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ text, done: false, fallback: isFallback })}\n\n`)
      );
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ done: true, fallback: isFallback, model: "DefendAI Local Engine" })}\n\n`)
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { question: string; history?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { question, history = [] } = body;
  if (!question?.trim()) {
    return new Response("question is required", { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  const hasKey = apiKey && apiKey !== "your_groq_api_key_here";

  // ── No API key: use local smart engine ──────────────────────────────────
  if (!hasKey) {
    const answer = buildLocalAnswer(question);
    return streamText(answer, false); // not a fallback error - a real answer
  }

  // ── Has API key: call Groq with streaming ────────────────────────────────
  const messages = [
    { role: "system", content: buildSystemPrompt() },
    ...history.slice(-20),
    { role: "user", content: question },
  ];

  let groqRes: Response;
  try {
    groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.6,
        max_tokens: 2048,
        top_p: 0.95,
        stream: true,
      }),
    });
  } catch (err) {
    console.error("Groq fetch error:", err);
    // Fall back to local engine on network error
    return streamText(buildLocalAnswer(question), false);
  }

  if (!groqRes.ok) {
    console.error("Groq API error:", groqRes.status);
    let errMsg = "";
    if (groqRes.status === 401) errMsg = "## Invalid API Key\n\nYour GROQ_API_KEY is incorrect. Please check `src/frontend/.env.local` and restart the server.\n\n---\n\n" + buildLocalAnswer(question);
    else if (groqRes.status === 429) errMsg = "## Rate Limit Reached\n\nGroq rate limit hit. Showing local answer:\n\n---\n\n" + buildLocalAnswer(question);
    else errMsg = buildLocalAnswer(question);
    return streamText(errMsg, false);
  }

  // Proxy Groq SSE stream to client
  const encoder = new TextEncoder();
  const reader = groqRes.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ done: true, fullText, model: "llama-3.3-70b-versatile" })}\n\n`)
              );
              controller.close();
              return;
            }
            try {
              const parsed = JSON.parse(payload);
              const token: string = parsed.choices?.[0]?.delta?.content ?? "";
              if (token) {
                fullText += token;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: token, done: false })}\n\n`)
                );
              }
            } catch {
              // ignore malformed lines
            }
          }
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, fullText, model: "llama-3.3-70b-versatile" })}\n\n`)
        );
        controller.close();
      } catch (err) {
        console.error("Stream error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
