const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export interface Equipment {
  equipment_id: string; equipment_type: string; model: string; unit: string;
  mission_status: "MISSION READY"|"READY WITH WARNING"|"MAINTENANCE REQUIRED"|"NOT MISSION READY";
  last_service_date: string; total_usage_hours: number;
}
export interface SensorReading {
  reading_id: string; equipment_id: string; component_id: string;
  sensor_type: string; value: number; timestamp: string;
}
export interface Prediction {
  prediction_id: string; equipment_id: string; component_id: string;
  failure_probability: number; predicted_failure_date: string|null;
  remaining_useful_life: number|null; confidence_score: number;
  risk_level: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL"; explanation: string;
}
export interface EquipmentHealth {
  equipment_id: string; readiness_score: number; failure_probability: number;
  predicted_failure_date: string|null; remaining_useful_life_days: number|null;
  risk_level: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
  sensor_readings: SensorReading[]; prediction: Prediction;
}
export interface Alert {
  alert_id: string; equipment_id: string; equipment_type: string;
  severity: "INFO"|"WARNING"|"CRITICAL"; message: string;
  component: string; timestamp: string; acknowledged: boolean;
}
export interface MaintenanceTask {
  task_id: string; equipment_id: string; component_id: string;
  task_type: string; priority: "CRITICAL"|"HIGH"|"MEDIUM"|"LOW";
  recommended_action: string; estimated_downtime: number;
  status: "PENDING"|"IN_PROGRESS"|"COMPLETED";
}
export interface CopilotResponse { answer: string; sources: string[]; confidence: number; }
export interface ReadinessReport {
  report_id: string; generated_at: string; total_equipment: number;
  mission_ready: number; ready_with_warning: number;
  maintenance_required: number; not_mission_ready: number; critical_alerts: number;
}

export const api = {
  getEquipment:                 ()                => get<Equipment[]>("/api/equipment"),
  getEquipmentHealth:           (id: string)      => get<EquipmentHealth>(`/api/equipment/${id}/health`),
  getEquipmentReadiness:        (id: string)      => get<{ status: Equipment["mission_status"]; score: number }>(`/api/equipment/${id}/readiness`),
  getAlerts:                    ()                => get<Alert[]>("/api/alerts"),
  getMaintenanceRecommendations:()                => get<MaintenanceTask[]>("/api/maintenance/recommendations"),
  postMaintenanceFeedback:      (body: object)    => post<{ ok: boolean }>("/api/maintenance/feedback", body),
  postCopilotQuery:             (question: string)=> post<CopilotResponse>("/api/copilot/query", { question }),
  getReadinessReport:           ()                => get<ReadinessReport>("/api/reports/readiness"),
  postSensorData:               (data: object)    => post<{ ok: boolean }>("/api/sensors/data", data),
};
