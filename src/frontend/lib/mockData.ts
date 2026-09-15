import type { Equipment, Alert, MaintenanceTask, ReadinessReport, SensorReading, Prediction } from "./api";

// Extended health shape used only by the local copilot engine (not from the real backend)
export interface MockEquipmentHealth {
  equipment_id: string;
  readiness_score: number;
  failure_probability: number;
  predicted_failure_date: string | null;
  remaining_useful_life_days: number | null;
  risk_level: "Low" | "Medium" | "High" | "Critical";
  sensor_readings: SensorReading[];
  prediction: Prediction | null;
}

function series(eqId: string, comp: string, base: number, variance: number, trend: number, hours = 24): SensorReading[] {
  const now = new Date("2024-11-20T08:00:00Z");
  return Array.from({ length: hours }, (_, i) => ({
    reading_id: `${eqId}-${comp}-${i}`,
    equipment_id: eqId,
    component_id: comp,
    sensor_type: "combined",
    temperature: parseFloat((base + trend * i + Math.sin(i * 0.4) * variance).toFixed(2)),
    vibration: parseFloat((0.5 + Math.sin(i * 0.3) * 0.05).toFixed(3)),
    pressure: parseFloat((210 + Math.cos(i * 0.2) * 5).toFixed(2)),
    battery: 85,
    timestamp: new Date(now.getTime() - (hours - i) * 3_600_000).toISOString(),
  }));
}

export const mockEquipment: Equipment[] = [
  { equipment_id:"EQ-001", equipment_type:"Aircraft", model:"UH-60 Black Hawk",  unit:"1st Aviation Bn",  mission_status:"MISSION READY",        last_service_date:"2024-11-10", total_usage_hours:1204 },
  { equipment_id:"EQ-002", equipment_type:"Aircraft", model:"AH-64 Apache",       unit:"2nd Attack Bn",    mission_status:"READY WITH WARNING",    last_service_date:"2024-10-28", total_usage_hours:2347 },
  { equipment_id:"EQ-003", equipment_type:"Vehicle",  model:"M1A2 Abrams",        unit:"3rd Armored Bn",   mission_status:"MAINTENANCE REQUIRED",  last_service_date:"2024-09-15", total_usage_hours:876  },
  { equipment_id:"EQ-004", equipment_type:"Aircraft", model:"CH-47 Chinook",      unit:"5th Aviation Bn",  mission_status:"NOT MISSION READY",     last_service_date:"2024-08-02", total_usage_hours:3120 },
  { equipment_id:"EQ-005", equipment_type:"Vehicle",  model:"Bradley IFV",        unit:"3rd Armored Bn",   mission_status:"MISSION READY",        last_service_date:"2024-11-18", total_usage_hours:432  },
  { equipment_id:"EQ-006", equipment_type:"Vehicle",  model:"HMMWV",              unit:"4th Support Bn",   mission_status:"READY WITH WARNING",    last_service_date:"2024-10-05", total_usage_hours:1890 },
];

export const mockHealthMap: Record<string, MockEquipmentHealth> = {
  "EQ-001": { equipment_id:"EQ-001", readiness_score:94, failure_probability:0.04, predicted_failure_date:null,           remaining_useful_life_days:210, risk_level:"Low",
    sensor_readings:series("EQ-001","COMP-ENGINE",85,3,0.02),
    prediction:{ prediction_id:"PRED-001", equipment_id:"EQ-001", component_id:"COMP-ENGINE", failure_probability:0.04, predicted_failure_date:null, remaining_useful_life:210, confidence_score:0.91, risk_level:"Low", explanation:"All sensor readings are within normal operating ranges. Engine temperature is stable and vibration levels are nominal." } },
  "EQ-002": { equipment_id:"EQ-002", readiness_score:71, failure_probability:0.28, predicted_failure_date:"2024-12-15",  remaining_useful_life_days:25,  risk_level:"High",
    sensor_readings:series("EQ-002","COMP-ROTOR",102,6,0.15),
    prediction:{ prediction_id:"PRED-002", equipment_id:"EQ-002", component_id:"COMP-ROTOR", failure_probability:0.28, predicted_failure_date:"2024-12-15", remaining_useful_life:25, confidence_score:0.84, risk_level:"High", explanation:"Rotor vibration has increased 40% over the past 72 hours. Temperature trending upward. Recommend inspection before next mission." } },
  "EQ-003": { equipment_id:"EQ-003", readiness_score:45, failure_probability:0.62, predicted_failure_date:"2024-11-28",  remaining_useful_life_days:8,   risk_level:"Critical",
    sensor_readings:series("EQ-003","COMP-ENGINE",118,8,0.3),
    prediction:{ prediction_id:"PRED-003", equipment_id:"EQ-003", component_id:"COMP-ENGINE", failure_probability:0.62, predicted_failure_date:"2024-11-28", remaining_useful_life:8, confidence_score:0.88, risk_level:"Critical", explanation:"Engine temperature is critically elevated. Hydraulic pressure dropping. Track vibration anomaly detected. Immediate maintenance required." } },
  "EQ-004": { equipment_id:"EQ-004", readiness_score:22, failure_probability:0.87, predicted_failure_date:"2024-11-23",  remaining_useful_life_days:3,   risk_level:"Critical",
    sensor_readings:series("EQ-004","COMP-ROTOR",135,10,0.5),
    prediction:{ prediction_id:"PRED-004", equipment_id:"EQ-004", component_id:"COMP-ROTOR", failure_probability:0.87, predicted_failure_date:"2024-11-23", remaining_useful_life:3, confidence_score:0.93, risk_level:"Critical", explanation:"Multiple critical anomalies detected: rotor imbalance, hydraulic failure risk, and engine overheat. Aircraft is grounded pending full inspection." } },
  "EQ-005": { equipment_id:"EQ-005", readiness_score:97, failure_probability:0.02, predicted_failure_date:null,           remaining_useful_life_days:340, risk_level:"Low",
    sensor_readings:series("EQ-005","COMP-ENGINE",80,2,0.01),
    prediction:{ prediction_id:"PRED-005", equipment_id:"EQ-005", component_id:"COMP-ENGINE", failure_probability:0.02, predicted_failure_date:null, remaining_useful_life:340, confidence_score:0.96, risk_level:"Low", explanation:"Recently serviced. All systems nominal. No anomalies detected." } },
  "EQ-006": { equipment_id:"EQ-006", readiness_score:68, failure_probability:0.31, predicted_failure_date:"2024-12-20",  remaining_useful_life_days:30,  risk_level:"High",
    sensor_readings:series("EQ-006","COMP-AXLE",98,7,0.1),
    prediction:{ prediction_id:"PRED-006", equipment_id:"EQ-006", component_id:"COMP-AXLE", failure_probability:0.31, predicted_failure_date:"2024-12-20", remaining_useful_life:30, confidence_score:0.79, risk_level:"High", explanation:"Axle vibration increasing. High mileage since last service. Schedule inspection within 2 weeks." } },
};

export const mockAlerts: Alert[] = [
  { alert_id:"ALT-001", equipment_id:"EQ-004", equipment_type:"Aircraft", model:"CH-47 Chinook",  unit:"5th Aviation Bn", alert_type:"Vibration",   severity:"Critical", message:"Rotor imbalance exceeds safe threshold — aircraft grounded",          acknowledged:false, created_at:"2024-11-20T06:32:00Z" },
  { alert_id:"ALT-002", equipment_id:"EQ-003", equipment_type:"Vehicle",  model:"M1A2 Abrams",    unit:"3rd Armored Bn",  alert_type:"Temperature", severity:"Critical", message:"Engine temperature 118°C — critical overheating detected",            acknowledged:false, created_at:"2024-11-20T07:15:00Z" },
  { alert_id:"ALT-003", equipment_id:"EQ-002", equipment_type:"Aircraft", model:"AH-64 Apache",   unit:"2nd Attack Bn",   alert_type:"Vibration",   severity:"Medium",   message:"Rotor vibration trending +40% over 72h",                              acknowledged:false, created_at:"2024-11-19T22:00:00Z" },
  { alert_id:"ALT-004", equipment_id:"EQ-003", equipment_type:"Vehicle",  model:"M1A2 Abrams",    unit:"3rd Armored Bn",  alert_type:"Pressure",    severity:"Critical", message:"Hydraulic pressure dropping below operational minimum",               acknowledged:false, created_at:"2024-11-20T07:45:00Z" },
  { alert_id:"ALT-005", equipment_id:"EQ-006", equipment_type:"Vehicle",  model:"HMMWV",          unit:"4th Support Bn",  alert_type:"Vibration",   severity:"Medium",   message:"Axle vibration above baseline — schedule inspection",                 acknowledged:true,  created_at:"2024-11-19T14:30:00Z" },
  { alert_id:"ALT-006", equipment_id:"EQ-004", equipment_type:"Aircraft", model:"CH-47 Chinook",  unit:"5th Aviation Bn", alert_type:"Pressure",    severity:"Critical", message:"Hydraulic pressure at 160 PSI — below safe limit of 180 PSI",        acknowledged:false, created_at:"2024-11-20T08:01:00Z" },
];

export const mockMaintenanceTasks: MaintenanceTask[] = [
  { task_id:"TSK-001", equipment_id:"EQ-004", component_id:"COMP-ROTOR",  task_type:"Inspection & Replacement", priority:"Critical", recommended_action:"Immediate rotor system inspection. Replace main rotor blade assembly. Ground aircraft until cleared.",            estimated_downtime:72, status:"Pending"      },
  { task_id:"TSK-002", equipment_id:"EQ-003", component_id:"COMP-ENGINE", task_type:"Engine Overhaul",           priority:"Critical", recommended_action:"Engine coolant flush and thermostat replacement. Full engine inspection required before next operation.",        estimated_downtime:48, status:"Pending"      },
  { task_id:"TSK-003", equipment_id:"EQ-003", component_id:"COMP-HYDRO",  task_type:"Hydraulic Service",         priority:"Critical", recommended_action:"Replace hydraulic fluid and inspect lines for leaks. Pressure test all hydraulic circuits.",                    estimated_downtime:24, status:"In Progress"  },
  { task_id:"TSK-004", equipment_id:"EQ-002", component_id:"COMP-ROTOR",  task_type:"Vibration Analysis",        priority:"High",     recommended_action:"Perform dynamic balancing of tail rotor. Inspect drive shaft bearings. Schedule within 5 flight hours.",       estimated_downtime:16, status:"Pending"      },
  { task_id:"TSK-005", equipment_id:"EQ-006", component_id:"COMP-AXLE",   task_type:"Axle Inspection",           priority:"High",     recommended_action:"Inspect front axle CV joints and bearings. Lubricate and replace worn components.",                             estimated_downtime:8,  status:"Pending"      },
  { task_id:"TSK-006", equipment_id:"EQ-002", component_id:"COMP-ENGINE", task_type:"Scheduled Service",         priority:"Medium",   recommended_action:"100-hour service: oil change, filter replacement, spark plug check.",                                          estimated_downtime:6,  status:"Pending"      },
  { task_id:"TSK-007", equipment_id:"EQ-001", component_id:"COMP-HYDRO",  task_type:"Routine Check",             priority:"Low",      recommended_action:"Hydraulic fluid level check and top-up at next scheduled maintenance window.",                                  estimated_downtime:2,  status:"Pending"      },
];

// Flat mock report with local extra fields (not tied to ReadinessReport API type)
export const mockReport = {
  generated_at: "2024-11-20T08:00:00Z",
  total_equipment: 6,
  mission_ready: 2,
  ready_with_warning: 2,
  maintenance_required: 1,
  not_mission_ready: 1,
  critical_alerts: 4,
} as const;

export const copilotSamples: Record<string, string> = {
  default:    "I've analyzed current sensor readings and maintenance records. Please ask a specific question about equipment readiness, failure risk, or maintenance priorities.",
  ready:      "Equipment EQ-001 (UH-60 Black Hawk) and EQ-005 (Bradley IFV) are MISSION READY. EQ-002 and EQ-006 can operate with close monitoring.",
  "not ready":"EQ-004 (CH-47 Chinook) is NOT MISSION READY due to critical rotor imbalance and hydraulic failure risk. EQ-003 (M1A2 Abrams) requires immediate maintenance before deployment.",
  "high risk":"Aircraft EQ-002 shows 28% failure probability driven by a 40% increase in tail rotor vibration over 72 hours. Recommend vibration analysis and dynamic balancing before next flight.",
  vibration:  "Abnormal vibration detected on: EQ-002 (tail rotor, +40%), EQ-004 (main rotor, critical — 525% above baseline), EQ-006 (front axle, +20%).",
  service:    "Highest priority component for immediate service: EQ-004 Main Rotor (Critical). Aircraft is grounded. Next: EQ-003 Engine — 62% failure probability within 8 days.",
};
