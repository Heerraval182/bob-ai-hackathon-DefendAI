/**
 * Copilot Intelligence Engine
 * Processes natural-language queries against live mock data and returns
 * structured, explainable responses per the architecture spec.
 */

import {
  mockEquipment,
  mockHealthMap,
  mockAlerts,
  mockMaintenanceTasks,
  mockReport,
} from "./mockData";
import type { Equipment, Alert, MaintenanceTask } from "./api";
import type { MockEquipmentHealth } from "./mockData";

// ─── Response types ──────────────────────────────────────────────────────────

export type ResponseKind =
  | "fleet_summary"
  | "not_ready"
  | "ready"
  | "equipment_detail"
  | "high_risk"
  | "vibration"
  | "temperature"
  | "pressure"
  | "sensor_anomaly"
  | "service_priority"
  | "maintenance_plan"
  | "failure_risk"
  | "remaining_life"
  | "alert_list"
  | "readiness_score"
  | "component_health"
  | "unknown";

export interface EquipmentCard {
  equipment_id: string;
  model: string;
  equipment_type: string;
  unit: string;
  readiness_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  mission_status: Equipment["mission_status"];
  failure_probability: number;
  remaining_useful_life_days: number | null;
  key_finding: string;
}

export interface MaintenanceRow {
  task_id: string;
  equipment_id: string;
  model: string;
  task_type: string;
  priority: MaintenanceTask["priority"];
  recommended_action: string;
  estimated_downtime: number;
  status: MaintenanceTask["status"];
}

export interface AlertRow {
  alert_id: string;
  equipment_id: string;
  model: string;
  severity: Alert["severity"];
  message: string;
  component: string;
  timestamp: string;
}

export interface SensorSnapshot {
  equipment_id: string;
  model: string;
  sensor_type: string;
  component: string;
  latest_value: number;
  baseline: number;
  deviation_pct: number;
  status: "NORMAL" | "ELEVATED" | "CRITICAL";
}

export interface CopilotResponse {
  kind: ResponseKind;
  answer: string;
  explanation: string;
  confidence: number;
  sources: string[];
  equipment_cards?: EquipmentCard[];
  maintenance_rows?: MaintenanceRow[];
  alert_rows?: AlertRow[];
  sensor_snapshots?: SensorSnapshot[];
  readiness_breakdown?: {
    mission_ready: number;
    ready_with_warning: number;
    maintenance_required: number;
    not_mission_ready: number;
    total: number;
    critical_alerts: number;
  };
  followup_suggestions?: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toCard(eqId: string): EquipmentCard | null {
  const eq = mockEquipment.find((e) => e.equipment_id === eqId);
  const h: MockEquipmentHealth | undefined = mockHealthMap[eqId];
  if (!eq || !h) return null;
  return {
    equipment_id: eq.equipment_id,
    model: eq.model,
    equipment_type: eq.equipment_type,
    unit: eq.unit,
    readiness_score: h.readiness_score,
    risk_level: h.risk_level.toUpperCase() as EquipmentCard["risk_level"],
    mission_status: eq.mission_status,
    failure_probability: h.failure_probability,
    remaining_useful_life_days: h.remaining_useful_life_days,
    key_finding: h.prediction?.explanation ?? "",
  };
}

function toMaintenanceRow(t: MaintenanceTask): MaintenanceRow {
  const model =
    mockEquipment.find((e) => e.equipment_id === t.equipment_id)?.model ?? t.equipment_id;
  return { ...t, model };
}

function latestSensorValue(eqId: string, sensorType: string): number | null {
  const h: MockEquipmentHealth | undefined = mockHealthMap[eqId];
  if (!h) return null;
  const reading = h.sensor_readings[h.sensor_readings.length - 1];
  if (!reading) return null;
  if (sensorType === "temperature") return reading.temperature;
  if (sensorType === "vibration")   return reading.vibration;
  if (sensorType === "pressure")    return reading.pressure;
  return null;
}

function sensorStatus(
  value: number,
  baseline: number
): "NORMAL" | "ELEVATED" | "CRITICAL" {
  const dev = Math.abs((value - baseline) / baseline);
  if (dev > 0.25) return "CRITICAL";
  if (dev > 0.1) return "ELEVATED";
  return "NORMAL";
}

const SENSOR_BASELINES: Record<string, Record<string, number>> = {
  temperature: { "EQ-001": 85, "EQ-002": 92, "EQ-003": 95, "EQ-004": 98, "EQ-005": 80, "EQ-006": 90 },
  vibration:   { "EQ-001": 0.4, "EQ-002": 0.5, "EQ-003": 0.6, "EQ-004": 0.5, "EQ-005": 0.3, "EQ-006": 0.6 },
  pressure:    { "EQ-001": 210, "EQ-002": 210, "EQ-003": 210, "EQ-004": 210, "EQ-005": 215, "EQ-006": 210 },
};

// ─── Intent detection ─────────────────────────────────────────────────────────

function detect(q: string): ResponseKind {
  const lq = q.toLowerCase();

  if (lq.match(/fleet|overview|summary|all equipment|how many/)) return "fleet_summary";
  if (lq.match(/not ready|grounded|cannot deploy|can'?t deploy|undeployable/)) return "not_ready";
  if (lq.match(/\bready\b|mission.?ready|can deploy|deployable/) && !lq.includes("not")) return "ready";
  if (lq.match(/high.?risk|most.?dangerous|highest.?risk|critical.?risk/)) return "high_risk";
  if (lq.match(/vibrat/)) return "vibration";
  if (lq.match(/temper|overheat|hot/)) return "temperature";
  if (lq.match(/pressure|hydraulic/)) return "pressure";
  if (lq.match(/anomal|sensor|abnormal/)) return "sensor_anomaly";
  if (lq.match(/service.?first|which.?component|first.?service|priorit/)) return "service_priority";
  if (lq.match(/maintenance|repair|fix|task/)) return "maintenance_plan";
  if (lq.match(/fail|probabilit|chance|risk|breakdown/)) return "failure_risk";
  if (lq.match(/remaining|useful.?life|how.?long|rul|days.?left/)) return "remaining_life";
  if (lq.match(/alert|warning|notification/)) return "alert_list";
  if (lq.match(/readiness.?score|health.?score|score/)) return "readiness_score";
  if (lq.match(/component|part|system|engine|rotor|axle|hydro/)) return "component_health";

  // Equipment-specific mention
  const match = lq.match(/eq-0?(\d+)/i);
  if (match) return "equipment_detail";

  return "unknown";
}

// ─── Response builders ────────────────────────────────────────────────────────

function fleetSummary(): CopilotResponse {
  const r = mockReport;
  const readyPct = Math.round((r.mission_ready / r.total_equipment) * 100);
  const criticalEq = Object.entries(mockHealthMap)
    .filter(([, h]) => (h as MockEquipmentHealth).risk_level === "Critical")
    .map(([id]) => id);

  return {
    kind: "fleet_summary",
    answer: `Fleet is at **${readyPct}% readiness** across ${r.total_equipment} tracked assets. ${r.mission_ready} are fully mission-ready, ${r.ready_with_warning} are operational with active warnings, and ${r.not_mission_ready} asset${r.not_mission_ready !== 1 ? "s" : ""} cannot be deployed. There are currently **${r.critical_alerts} critical alerts** requiring immediate attention.`,
    explanation:
      "Readiness score is calculated from sensor health indices, predicted failure probability, maintenance history recency, component age, and mission requirements. Critical assets are flagged when any component exceeds its anomaly threshold or failure probability crosses 60%.",
    confidence: 0.97,
    sources: ["Fleet Readiness Report RPT-2024-1120", "Live sensor feed", "Maintenance records"],
    readiness_breakdown: {
      mission_ready: r.mission_ready,
      ready_with_warning: r.ready_with_warning,
      maintenance_required: r.maintenance_required,
      not_mission_ready: r.not_mission_ready,
      total: r.total_equipment,
      critical_alerts: r.critical_alerts,
    },
    equipment_cards: mockEquipment.map((e) => toCard(e.equipment_id)).filter(Boolean) as EquipmentCard[],
    followup_suggestions: [
      "Which equipment is not mission ready?",
      "Show all critical alerts",
      "Which component should be serviced first?",
    ],
  };
}

function notReady(): CopilotResponse {
  const notReadyEq = mockEquipment.filter(
    (e) => e.mission_status === "NOT MISSION READY" || e.mission_status === "MAINTENANCE REQUIRED"
  );
  const cards = notReadyEq.map((e) => toCard(e.equipment_id)).filter(Boolean) as EquipmentCard[];

  return {
    kind: "not_ready",
    answer:
      `**${notReadyEq.length} asset${notReadyEq.length !== 1 ? "s" : ""} cannot be deployed** for the next mission:\n\n` +
      notReadyEq
        .map((e) => {
          const h = mockHealthMap[e.equipment_id];
          return `• **${e.equipment_id} — ${e.model}**: ${e.mission_status} (${(h.failure_probability * 100).toFixed(0)}% failure risk, ${h.remaining_useful_life_days}d remaining life)`;
        })
        .join("\n"),
    explanation:
      "Not-ready status is triggered when: (a) failure probability exceeds 60%, (b) a critical sensor anomaly is active, or (c) the readiness score falls below 50. These thresholds are derived from historical mission-failure correlation data.",
    confidence: 0.95,
    sources: ["Mission readiness engine", "Sensor anomaly model", "Failure prediction model"],
    equipment_cards: cards,
    alert_rows: mockAlerts
      .filter((a) => notReadyEq.some((e) => e.equipment_id === a.equipment_id) && !a.acknowledged)
      .map((a) => ({
        alert_id: a.alert_id,
        equipment_id: a.equipment_id,
        model: mockEquipment.find((e) => e.equipment_id === a.equipment_id)?.model ?? a.equipment_id,
        severity: a.severity,
        message: a.message,
        component: a.alert_type,
        timestamp: a.created_at,
      })),
    followup_suggestions: [
      "Show maintenance plan for EQ-004",
      "What is the failure probability of EQ-003?",
      "Which component should be serviced first?",
    ],
  };
}

function ready(): CopilotResponse {
  const readyEq = mockEquipment.filter(
    (e) => e.mission_status === "MISSION READY" || e.mission_status === "READY WITH WARNING"
  );
  const cards = readyEq.map((e) => toCard(e.equipment_id)).filter(Boolean) as EquipmentCard[];

  return {
    kind: "ready",
    answer:
      `**${readyEq.length} asset${readyEq.length !== 1 ? "s" : ""} are available for deployment:**\n\n` +
      readyEq
        .map((e) => {
          const h = mockHealthMap[e.equipment_id];
          return `• **${e.equipment_id} — ${e.model}**: ${e.mission_status} (readiness ${h.readiness_score}%)`;
        })
        .join("\n"),
    explanation:
      "MISSION READY assets have readiness scores ≥ 85% with no critical anomalies. READY WITH WARNING assets are deployable but have at least one elevated sensor reading or elevated failure probability (10–40%) requiring close monitoring.",
    confidence: 0.96,
    sources: ["Readiness scoring engine", "Sensor health index", "Maintenance history"],
    equipment_cards: cards,
    followup_suggestions: [
      "Show fleet overview",
      "Which vehicles have warnings?",
      "Show active alerts",
    ],
  };
}

function equipmentDetail(q: string): CopilotResponse {
  const match = q.toUpperCase().match(/EQ-0*(\d+)/);
  const eqId = match ? `EQ-00${match[1]}`.replace("EQ-000", "EQ-00").replace("EQ-001", "EQ-001") : null;
  // Normalise to 3-digit
  const normalised = q.toUpperCase().match(/(EQ-\d+)/)?.[1];
  const eq = normalised ? mockEquipment.find((e) => e.equipment_id === normalised) : null;
  const h = normalised ? mockHealthMap[normalised] : null;

  if (!eq || !h) {
    return {
      kind: "equipment_detail",
      answer: "I couldn't find that equipment ID in the current fleet records. Please check the ID and try again.",
      explanation: "",
      confidence: 0.5,
      sources: [],
    };
  }

  const tasks = mockMaintenanceTasks.filter((t) => t.equipment_id === eq.equipment_id);

  return {
    kind: "equipment_detail",
    answer:
      `**${eq.equipment_id} — ${eq.model}** (${eq.equipment_type}, ${eq.unit})\n\n` +
      `Status: **${eq.mission_status}** | Readiness: **${h.readiness_score}%** | Failure Risk: **${(h.failure_probability * 100).toFixed(0)}%**\n\n` +
      `${h.prediction?.explanation ?? "No prediction available."}` +
      (h.predicted_failure_date
        ? `\n\n⚠️ Predicted failure date: **${h.predicted_failure_date}** (${h.remaining_useful_life_days} days remaining)`
        : "\n\n✅ No failure predicted within the monitoring window."),
    explanation:
      "This assessment combines sensor trend analysis, historical maintenance data, and component age. The confidence score reflects model certainty based on data completeness and consistency.",
    confidence: h.prediction?.confidence_score ?? 0.8,
    sources: [
      `Prediction model PRED-${eq.equipment_id}`,
      "Sensor readings (last 24h)",
      "Maintenance log",
    ],
    equipment_cards: [toCard(eq.equipment_id)].filter(Boolean) as EquipmentCard[],
    maintenance_rows: tasks.map(toMaintenanceRow),
    followup_suggestions: [
      `What sensors are abnormal on ${eq.equipment_id}?`,
      `Show maintenance tasks for ${eq.equipment_id}`,
      "Show all high-risk equipment",
    ],
  };
}

function highRisk(): CopilotResponse {
  const risky = mockEquipment
    .filter((e) => {
      const h: MockEquipmentHealth | undefined = mockHealthMap[e.equipment_id];
      return h?.risk_level === "High" || h?.risk_level === "Critical";
    })
    .sort((a, b) => mockHealthMap[b.equipment_id].failure_probability - mockHealthMap[a.equipment_id].failure_probability);

  const cards = risky.map((e) => toCard(e.equipment_id)).filter(Boolean) as EquipmentCard[];

  return {
    kind: "high_risk",
    answer:
      `**${risky.length} high-risk asset${risky.length !== 1 ? "s" : ""} detected** (ranked by failure probability):\n\n` +
      risky
        .map((e) => {
          const h = mockHealthMap[e.equipment_id];
          return `• **${e.equipment_id} — ${e.model}**: ${(h.failure_probability * 100).toFixed(0)}% failure risk, ${h.remaining_useful_life_days}d remaining — *${h.prediction?.explanation?.split(".")[0]}*`;
        })
        .join("\n"),
    explanation:
      "Risk level is classified as HIGH when failure probability is 20–59% or when two or more sensor readings are in the elevated range. CRITICAL is assigned when failure probability exceeds 60% or a sensor value crosses the safety threshold.",
    confidence: 0.93,
    sources: ["XGBoost failure prediction model", "Anomaly detection (Isolation Forest)", "Sensor trend analysis"],
    equipment_cards: cards,
    followup_suggestions: [
      "Show maintenance recommendations for high-risk equipment",
      "Which component should be serviced first?",
      "Show all active alerts",
    ],
  };
}

function vibrationAnalysis(): CopilotResponse {
  const snapshots: SensorSnapshot[] = mockEquipment
    .map((eq) => {
      const val = latestSensorValue(eq.equipment_id, "vibration");
      const baseline = SENSOR_BASELINES.vibration[eq.equipment_id] ?? 0.5;
      if (val === null) return null;
      const comp = mockHealthMap[eq.equipment_id]?.sensor_readings[0]?.component_id ?? "COMP-UNKNOWN";
      const deviationPct = ((val - baseline) / baseline) * 100;
      return {
        equipment_id: eq.equipment_id,
        model: eq.model,
        sensor_type: "vibration",
        component: comp,
        latest_value: val,
        baseline,
        deviation_pct: Math.round(deviationPct),
        status: sensorStatus(val, baseline),
      } as SensorSnapshot;
    })
    .filter(Boolean) as SensorSnapshot[];

  const abnormal = snapshots.filter((s) => s.status !== "NORMAL").sort((a, b) => b.deviation_pct - a.deviation_pct);

  return {
    kind: "vibration",
    answer:
      abnormal.length === 0
        ? "All vibration sensors are within normal operating ranges."
        : `**${abnormal.length} asset${abnormal.length !== 1 ? "s" : ""} showing abnormal vibration:**\n\n` +
          abnormal
            .map(
              (s) =>
                `• **${s.equipment_id} — ${s.model}** [${s.component}]: ${s.latest_value.toFixed(2)} g (${s.deviation_pct > 0 ? "+" : ""}${s.deviation_pct}% vs baseline) — **${s.status}**`
            )
            .join("\n"),
    explanation:
      "Vibration is measured in gravitational units (g). ELEVATED is flagged when readings exceed baseline by >10%; CRITICAL when >25%. Elevated vibration commonly indicates bearing wear, imbalance, or structural fatigue. Trends are tracked over 24-hour windows.",
    confidence: 0.91,
    sources: ["HUMS vibration sensors", "Anomaly detection model", "24h sensor history"],
    sensor_snapshots: snapshots,
    equipment_cards: abnormal.map((s) => toCard(s.equipment_id)).filter(Boolean) as EquipmentCard[],
    followup_suggestions: [
      "Which component should be serviced first?",
      "Show maintenance tasks for high-vibration equipment",
      "Show temperature readings",
    ],
  };
}

function temperatureAnalysis(): CopilotResponse {
  const snapshots: SensorSnapshot[] = mockEquipment
    .map((eq) => {
      const val = latestSensorValue(eq.equipment_id, "temperature");
      const baseline = SENSOR_BASELINES.temperature[eq.equipment_id] ?? 90;
      if (val === null) return null;
      const comp = mockHealthMap[eq.equipment_id]?.sensor_readings[0]?.component_id ?? "COMP-UNKNOWN";
      const deviationPct = ((val - baseline) / baseline) * 100;
      return {
        equipment_id: eq.equipment_id,
        model: eq.model,
        sensor_type: "temperature",
        component: comp,
        latest_value: val,
        baseline,
        deviation_pct: Math.round(deviationPct),
        status: sensorStatus(val, baseline),
      } as SensorSnapshot;
    })
    .filter(Boolean) as SensorSnapshot[];

  const abnormal = snapshots.filter((s) => s.status !== "NORMAL").sort((a, b) => b.deviation_pct - a.deviation_pct);

  return {
    kind: "temperature",
    answer:
      abnormal.length === 0
        ? "All engine temperatures are within normal operating limits."
        : `**${abnormal.length} asset${abnormal.length !== 1 ? "s" : ""} with elevated temperature:**\n\n` +
          abnormal
            .map(
              (s) =>
                `• **${s.equipment_id} — ${s.model}**: ${s.latest_value.toFixed(0)}°C (${s.deviation_pct > 0 ? "+" : ""}${s.deviation_pct}% vs normal ${s.baseline}°C) — **${s.status}**`
            )
            .join("\n"),
    explanation:
      "Engine temperature thresholds: ELEVATED >10% above baseline; CRITICAL >25% above baseline or absolute value >120°C. Overheating indicates coolant degradation, blocked airflow, or oil system failure. Continuous monitoring is critical for mission safety.",
    confidence: 0.92,
    sources: ["HUMS thermal sensors", "Engine monitoring system", "24h sensor history"],
    sensor_snapshots: snapshots,
    followup_suggestions: [
      "Show pressure readings",
      "Show equipment with vibration anomalies",
      "Which equipment needs immediate maintenance?",
    ],
  };
}

function pressureAnalysis(): CopilotResponse {
  const snapshots: SensorSnapshot[] = mockEquipment
    .map((eq) => {
      const val = latestSensorValue(eq.equipment_id, "pressure");
      const baseline = SENSOR_BASELINES.pressure[eq.equipment_id] ?? 210;
      if (val === null) return null;
      const comp = "COMP-HYDRO";
      // For pressure, below baseline is dangerous
      const deviationPct = ((val - baseline) / baseline) * 100;
      return {
        equipment_id: eq.equipment_id,
        model: eq.model,
        sensor_type: "pressure",
        component: comp,
        latest_value: val,
        baseline,
        deviation_pct: Math.round(deviationPct),
        status: sensorStatus(val, baseline),
      } as SensorSnapshot;
    })
    .filter(Boolean) as SensorSnapshot[];

  const abnormal = snapshots.filter((s) => s.status !== "NORMAL").sort((a, b) => a.latest_value - b.latest_value);

  return {
    kind: "pressure",
    answer:
      abnormal.length === 0
        ? "Hydraulic pressure is nominal across all systems."
        : `**${abnormal.length} asset${abnormal.length !== 1 ? "s" : ""} with hydraulic pressure anomalies:**\n\n` +
          abnormal
            .map(
              (s) =>
                `• **${s.equipment_id} — ${s.model}**: ${s.latest_value.toFixed(0)} PSI (${s.deviation_pct}% vs normal ${s.baseline} PSI) — **${s.status}**`
            )
            .join("\n"),
    explanation:
      "Hydraulic systems require minimum 180 PSI for safe operation. Readings below this threshold indicate potential fluid leaks, pump failure, or line damage. Pressure drops trending >5 PSI/hour require immediate grounding.",
    confidence: 0.9,
    sources: ["HUMS hydraulic pressure sensors", "Hydraulic system model", "24h sensor history"],
    sensor_snapshots: snapshots,
    followup_suggestions: [
      "Show active alerts for hydraulic systems",
      "Show maintenance tasks for hydraulic issues",
      "Which equipment is not mission ready?",
    ],
  };
}

function sensorAnomalies(): CopilotResponse {
  const all: SensorSnapshot[] = [];

  for (const sensorType of ["temperature", "vibration", "pressure"]) {
    for (const eq of mockEquipment) {
      const val = latestSensorValue(eq.equipment_id, sensorType);
      const baseline = SENSOR_BASELINES[sensorType]?.[eq.equipment_id];
      if (val === null || baseline === undefined) continue;
      const comp = mockHealthMap[eq.equipment_id]?.sensor_readings[0]?.component_id ?? "COMP-UNKNOWN";
      const deviationPct = ((val - baseline) / baseline) * 100;
      const status = sensorStatus(val, baseline);
      if (status !== "NORMAL") {
        all.push({
          equipment_id: eq.equipment_id,
          model: eq.model,
          sensor_type: sensorType,
          component: comp,
          latest_value: val,
          baseline,
          deviation_pct: Math.round(deviationPct),
          status,
        });
      }
    }
  }

  all.sort((a, b) => (b.status === "CRITICAL" ? 1 : -1) - (a.status === "CRITICAL" ? 1 : -1));

  return {
    kind: "sensor_anomaly",
    answer:
      all.length === 0
        ? "No sensor anomalies detected. All readings are within normal ranges."
        : `**${all.length} active sensor anomal${all.length !== 1 ? "ies" : "y"} detected** across the fleet:\n\n` +
          all
            .map(
              (s) =>
                `• **${s.equipment_id} ${s.sensor_type.toUpperCase()}** [${s.component}]: ${s.latest_value.toFixed(2)} (${s.deviation_pct > 0 ? "+" : ""}${s.deviation_pct}% deviation) — **${s.status}**`
            )
            .join("\n"),
    explanation:
      "Anomaly detection uses an Isolation Forest algorithm trained on 24-hour baseline windows. Deviations >10% from rolling baseline trigger ELEVATED status; >25% trigger CRITICAL. Each anomaly is cross-referenced with failure prediction models.",
    confidence: 0.89,
    sources: ["Isolation Forest anomaly model", "HUMS sensor array", "Rolling 24h baseline"],
    sensor_snapshots: all,
    equipment_cards: Array.from(new Set(all.map((s) => s.equipment_id)))
      .map((id) => toCard(id))
      .filter(Boolean) as EquipmentCard[],
    followup_suggestions: [
      "Show vibration analysis",
      "Show temperature readings",
      "Which equipment is high risk?",
    ],
  };
}

function servicePriority(): CopilotResponse {
  const pending = mockMaintenanceTasks
    .filter((t) => t.status !== "Completed")
    .sort((a, b) => {
      const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
    });

  const top = pending[0];
  const topModel = mockEquipment.find((e) => e.equipment_id === top?.equipment_id)?.model ?? top?.equipment_id;

  return {
    kind: "service_priority",
    answer:
      `**Highest priority: ${top?.equipment_id} — ${topModel}** (${top?.task_type}, ${top?.priority} priority)\n\n` +
      `${top?.recommended_action}\n\n` +
      `Full prioritised queue (${pending.length} open tasks):\n\n` +
      pending
        .map(
          (t, i) =>
            `${i + 1}. **${t.task_id}** — ${t.equipment_id} [${t.priority}]: ${t.task_type} (est. ${t.estimated_downtime}h downtime)`
        )
        .join("\n"),
    explanation:
      "Maintenance tasks are ranked by priority class (CRITICAL → HIGH → MEDIUM → LOW), then within each class by failure probability and mission-schedule impact. CRITICAL tasks must be resolved before the next mission deployment.",
    confidence: 0.94,
    sources: ["Recommendation engine", "Task prioritisation model", "Mission schedule"],
    maintenance_rows: pending.map(toMaintenanceRow),
    followup_suggestions: [
      "Show all maintenance tasks",
      "Which equipment is grounded?",
      "What is the estimated total downtime?",
    ],
  };
}

function maintenancePlan(): CopilotResponse {
  const tasks = mockMaintenanceTasks
    .filter((t) => t.status !== "Completed")
    .sort((a, b) => {
      const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
    });

  const totalDT = tasks.reduce((s, t) => s + t.estimated_downtime, 0);
  const critical = tasks.filter((t) => t.priority === "Critical").length;
  const high = tasks.filter((t) => t.priority === "High").length;

  return {
    kind: "maintenance_plan",
    answer:
      `**Maintenance plan: ${tasks.length} open tasks** (${critical} critical, ${high} high priority)\n\nTotal estimated downtime: **${totalDT} hours** across all assets.\n\n` +
      tasks
        .map(
          (t) =>
            `• **${t.task_id}** [${t.priority}] ${t.equipment_id} — ${t.task_type}: ${t.recommended_action.split(".")[0]}.`
        )
        .join("\n"),
    explanation:
      "The maintenance plan is auto-generated from AI prediction outputs. Each task includes the affected component, recommended action, estimated downtime, and priority. Tasks are updated as sensor data changes and feedback is recorded.",
    confidence: 0.92,
    sources: ["Recommendation engine", "Failure prediction model", "Component replacement history"],
    maintenance_rows: tasks.map(toMaintenanceRow),
    followup_suggestions: [
      "Which component should be serviced first?",
      "Show high-risk equipment",
      "Show active alerts",
    ],
  };
}

function failureRisk(): CopilotResponse {
  const sorted = mockEquipment
    .map((e) => ({ e, h: mockHealthMap[e.equipment_id] }))
    .sort((a, b) => b.h.failure_probability - a.h.failure_probability);

  return {
    kind: "failure_risk",
    answer:
      `**Fleet failure risk summary** (ranked by probability):\n\n` +
      sorted
        .map(
          ({ e, h }) =>
            `• **${e.equipment_id} — ${e.model}**: ${(h.failure_probability * 100).toFixed(0)}% [${h.risk_level}] — ${h.prediction?.explanation?.split(".")[0] ?? "No detail"}`
        )
        .join("\n"),
    explanation:
      "Failure probability is computed by an XGBoost classifier trained on historical HUMS data from similar equipment fleets. Features include sensor trend slopes, component age, usage hours, and maintenance gap. Confidence intervals are provided for each prediction.",
    confidence: 0.91,
    sources: ["XGBoost failure model", "Component lifecycle database", "Usage hour tracking"],
    equipment_cards: sorted.map(({ e }) => toCard(e.equipment_id)).filter(Boolean) as EquipmentCard[],
    followup_suggestions: [
      "Show remaining useful life for all equipment",
      "Show maintenance plan",
      "Which equipment is not ready?",
    ],
  };
}

function remainingLife(): CopilotResponse {
  const sorted = mockEquipment
    .map((e) => ({ e, h: mockHealthMap[e.equipment_id] }))
    .filter(({ h }) => h.remaining_useful_life_days !== null)
    .sort((a, b) => (a.h.remaining_useful_life_days ?? 999) - (b.h.remaining_useful_life_days ?? 999));

  return {
    kind: "remaining_life",
    answer:
      `**Remaining useful life (RUL) — ranked shortest first:**\n\n` +
      sorted
        .map(({ e, h }) => {
          const rul = h.remaining_useful_life_days;
          const urgency = rul !== null && rul <= 10 ? "🔴" : rul !== null && rul <= 30 ? "🟡" : "🟢";
          return `• ${urgency} **${e.equipment_id} — ${e.model}**: ${rul === null ? "—" : `${rul} days`}${h.predicted_failure_date ? ` (predicted failure: ${h.predicted_failure_date})` : ""}`;
        })
        .join("\n"),
    explanation:
      "Remaining Useful Life (RUL) is estimated using a regression model on sensor degradation curves and historical failure timelines. It represents the expected time before the primary failure-risk component requires replacement or major overhaul.",
    confidence: 0.88,
    sources: ["RUL regression model", "Sensor degradation curves", "Component lifecycle database"],
    equipment_cards: sorted.map(({ e }) => toCard(e.equipment_id)).filter(Boolean) as EquipmentCard[],
    followup_suggestions: [
      "Show failure probability for all equipment",
      "Which equipment needs immediate service?",
      "Show fleet overview",
    ],
  };
}

function alertList(): CopilotResponse {
  const active = mockAlerts.filter((a) => !a.acknowledged);
  const rows: AlertRow[] = mockAlerts.map((a) => ({
    alert_id: a.alert_id,
    equipment_id: a.equipment_id,
    model: mockEquipment.find((e) => e.equipment_id === a.equipment_id)?.model ?? a.equipment_id,
    severity: a.severity,
    message: a.message,
    component: a.alert_type,
    timestamp: a.created_at,
  }));

  return {
    kind: "alert_list",
    answer:
      `**${active.length} active alert${active.length !== 1 ? "s" : ""}** (${mockAlerts.filter((a) => a.severity === "Critical" && !a.acknowledged).length} critical):\n\n` +
      active
        .map(
          (a) =>
            `• [${a.severity}] **${a.equipment_id}** — ${a.alert_type}: ${a.message}`
        )
        .join("\n"),
    explanation:
      "Alerts are generated automatically when sensor readings cross predefined thresholds or when the anomaly detection model flags a pattern change. Critical alerts are escalated immediately and require acknowledgment before they are cleared.",
    confidence: 0.98,
    sources: ["Real-time alert engine", "HUMS sensor thresholds", "Anomaly detection model"],
    alert_rows: rows,
    followup_suggestions: [
      "Show equipment not ready for mission",
      "Show maintenance recommendations",
      "Which equipment is highest risk?",
    ],
  };
}

function readinessScores(): CopilotResponse {
  const sorted = mockEquipment
    .map((e) => ({ e, h: mockHealthMap[e.equipment_id] }))
    .sort((a, b) => a.h.readiness_score - b.h.readiness_score);

  return {
    kind: "readiness_score",
    answer:
      `**Readiness scores across the fleet:**\n\n` +
      sorted
        .map(({ e, h }) => {
          const bar = "█".repeat(Math.round(h.readiness_score / 10)) + "░".repeat(10 - Math.round(h.readiness_score / 10));
          return `• **${e.equipment_id} — ${e.model}**: ${h.readiness_score}% [${bar}] — ${e.mission_status}`;
        })
        .join("\n"),
    explanation:
      "The readiness score is a composite index: Sensor Health (30%) + Inverse Failure Probability (30%) + Maintenance Recency (20%) + Component Age Index (10%) + Mission Profile Compatibility (10%). Scores ≥ 85 = MISSION READY; 65–84 = READY WITH WARNING; 40–64 = MAINTENANCE REQUIRED; < 40 = NOT MISSION READY.",
    confidence: 0.95,
    sources: ["Readiness scoring engine", "Sensor health index", "Maintenance history", "Failure prediction model"],
    equipment_cards: sorted.map(({ e }) => toCard(e.equipment_id)).filter(Boolean) as EquipmentCard[],
    readiness_breakdown: {
      mission_ready:        mockReport.mission_ready,
      ready_with_warning:   mockReport.ready_with_warning,
      maintenance_required: mockReport.maintenance_required,
      not_mission_ready:    mockReport.not_mission_ready,
      total:                mockReport.total_equipment,
      critical_alerts:      mockReport.critical_alerts,
    },
    followup_suggestions: [
      "Show fleet overview",
      "Which equipment has the lowest readiness?",
      "Show failure risk breakdown",
    ],
  };
}

function componentHealth(): CopilotResponse {
  const tasks = [...mockMaintenanceTasks].sort((a, b) => {
    const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
  });

  return {
    kind: "component_health",
    answer:
      `**Component health summary** — ${tasks.length} components flagged for attention:\n\n` +
      tasks
        .map(
          (t) =>
            `• **${t.component_id}** on ${t.equipment_id}: ${t.task_type} [${t.priority}] — ${t.recommended_action.split(".")[0]}`
        )
        .join("\n"),
    explanation:
      "Component-level health is derived from component-specific sensor readings (temperature, vibration, pressure) matched to the component's historical failure signatures. Each component has an independent risk score contributing to the overall equipment readiness.",
    confidence: 0.87,
    sources: ["Component prediction models", "Sensor-to-component mapping", "Maintenance records"],
    maintenance_rows: tasks.map(toMaintenanceRow),
    followup_suggestions: [
      "Show service priority queue",
      "Show vibration anomalies",
      "Show temperature readings",
    ],
  };
}

function unknown(): CopilotResponse {
  return {
    kind: "unknown",
    answer:
      "I can help you analyse fleet readiness, sensor anomalies, failure risks, maintenance priorities, and remaining useful life. Try asking:\n\n\u2022 \"Which vehicles are not ready for tomorrow's mission?\"\n\u2022 \"Show equipment with abnormal vibration\"\n\u2022 \"What is the failure probability for EQ-003?\"\n\u2022 \"Which component should be serviced first?\"\n\u2022 \"Show all active alerts\"",
    explanation: "",
    confidence: 1.0,
    sources: [],
    followup_suggestions: [
      "Show fleet summary",
      "Which equipment is not mission ready?",
      "Show all active alerts",
      "Show maintenance plan",
    ],
  };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function processQuery(question: string): CopilotResponse {
  const kind = detect(question);

  switch (kind) {
    case "fleet_summary":     return fleetSummary();
    case "not_ready":         return notReady();
    case "ready":             return ready();
    case "equipment_detail":  return equipmentDetail(question);
    case "high_risk":         return highRisk();
    case "vibration":         return vibrationAnalysis();
    case "temperature":       return temperatureAnalysis();
    case "pressure":          return pressureAnalysis();
    case "sensor_anomaly":    return sensorAnomalies();
    case "service_priority":  return servicePriority();
    case "maintenance_plan":  return maintenancePlan();
    case "failure_risk":      return failureRisk();
    case "remaining_life":    return remainingLife();
    case "alert_list":        return alertList();
    case "readiness_score":   return readinessScores();
    case "component_health":  return componentHealth();
    default:                  return unknown();
  }
}
