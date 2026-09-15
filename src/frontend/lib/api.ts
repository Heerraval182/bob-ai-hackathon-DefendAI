const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Types matching the real Node.js backend schema ────────────────────────────

export interface Equipment {
  equipment_id: string;
  equipment_type: string;
  model: string;
  unit: string;
  mission_status: "MISSION READY" | "READY WITH WARNING" | "MAINTENANCE REQUIRED" | "NOT MISSION READY";
  last_service_date: string;
  total_usage_hours: number;
}

export interface SensorReading {
  reading_id: string;
  equipment_id: string;
  component_id: string | null;
  sensor_type: string;
  temperature: number;
  vibration: number;
  pressure: number;
  battery: number;
  timestamp: string;
}

export interface Prediction {
  prediction_id: string;
  equipment_id: string;
  component_id: string;
  failure_probability: number;
  predicted_failure_date: string | null;
  remaining_useful_life: number | null;
  confidence_score: number;
  risk_level: "Low" | "Medium" | "High" | "Critical";
  explanation: string;
}

export interface EquipmentHealth {
  equipment_id: string;
  equipment_type: string;
  model: string;
  unit: string;
  latest_reading: SensorReading;
  sensor_health: { readiness_score: number; readiness_status: string; issues: string[] };
  prediction: Prediction | null;
  active_alerts: Alert[];
}

export interface EquipmentReadiness {
  equipment_id: string;
  readiness_score: number;
  readiness_status: string;
  issues: string[];
  ai_risk_level: string;
  failure_probability: number | null;
  remaining_useful_life: number | null;
  explanation: string;
}

export interface Alert {
  alert_id: string;
  equipment_id: string;
  equipment_type: string;
  model: string;
  unit: string;
  alert_type: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  message: string;
  acknowledged: boolean;
  created_at: string;
}

export interface MaintenanceTask {
  task_id: string;
  equipment_id: string;
  component_id: string;
  task_type: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  recommended_action: string;
  estimated_downtime: number;
  status: "Pending" | "In Progress" | "Completed";
  failure_probability?: number;
  risk_level?: string;
  remaining_useful_life?: number;
  model?: string;
  unit?: string;
}

export interface CopilotResponse {
  question: string;
  answer: string;
  data: unknown;
}

export interface ReadinessReport {
  generated_at: string;
  summary: {
    total: number;
    mission_ready: number;
    ready_with_warning: number;
    maintenance_required: number;
    not_mission_ready: number;
  };
  equipment: Array<Equipment & {
    readiness_score: number;
    readiness_status: string;
    issues: string[];
    ai_risk_level: string;
    failure_probability: number | null;
    remaining_useful_life: number | null;
    pending_tasks: number;
  }>;
}

export const api = {
  getEquipment:                  ()                 => get<Equipment[]>("/api/equipment"),
  getEquipmentById:              (id: string)       => get<Equipment>(`/api/equipment/${id}`),
  getEquipmentHealth:            (id: string)       => get<EquipmentHealth>(`/api/equipment/${id}/health`),
  getEquipmentReadiness:         (id: string)       => get<EquipmentReadiness>(`/api/equipment/${id}/readiness`),
  getAlerts:                     ()                 => get<Alert[]>("/api/alerts"),
  getMaintenanceRecommendations: ()                 => get<MaintenanceTask[]>("/api/maintenance/recommendations"),
  getMaintenanceTasks:           ()                 => get<MaintenanceTask[]>("/api/maintenance/tasks"),
  postMaintenanceFeedback:       (body: object)     => post<{ message: string }>("/api/maintenance/feedback", body),
  postCopilotQuery:              (question: string) => post<CopilotResponse>("/api/copilot/query", { question }),
  getReadinessReport:            ()                 => get<ReadinessReport>("/api/reports/readiness"),
  postSensorData:                (data: object)     => post<{ message: string }>("/api/sensors/data", data),
  runPredictions:                (equipment_id: string) => post<unknown>("/api/predictions/run", { equipment_id }),
  runFleetPredictions:           ()                 => post<unknown>("/api/predictions/run/fleet", {}),
  generateMaintenancePlan:       ()                 => post<unknown>("/api/maintenance/plan", {}),
};
