import type { Equipment, EquipmentHealth, Alert, MaintenanceTask, ReadinessReport, SensorReading } from "./api";

function series(eqId: string, sensor: string, comp: string, base: number, variance: number, trend: number, hours = 24): SensorReading[] {
  const now = new Date("2024-11-20T08:00:00Z");
  return Array.from({ length: hours }, (_, i) => ({
    reading_id: `${eqId}-${sensor}-${i}`, equipment_id: eqId, component_id: comp,
    sensor_type: sensor, timestamp: new Date(now.getTime() - (hours - i) * 3_600_000).toISOString(),
    value: parseFloat((base + trend * i + Math.sin(i * 0.4) * variance).toFixed(2)),
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

export const mockHealthMap: Record<string, EquipmentHealth> = {
  "EQ-001": { equipment_id:"EQ-001", readiness_score:94, failure_probability:0.04, predicted_failure_date:null,           remaining_useful_life_days:210, risk_level:"LOW",
    sensor_readings:[...series("EQ-001","temperature","COMP-ENGINE",85,3,0.02),...series("EQ-001","vibration","COMP-ROTOR",0.4,0.05,0.001),...series("EQ-001","pressure","COMP-HYDRO",210,5,0)],
    prediction:{ prediction_id:"PRED-001", equipment_id:"EQ-001", component_id:"COMP-ENGINE", failure_probability:0.04, predicted_failure_date:null, remaining_useful_life:210, confidence_score:0.91, risk_level:"LOW", explanation:"All sensor readings are within normal operating ranges. Engine temperature is stable and vibration levels are nominal." } },
  "EQ-002": { equipment_id:"EQ-002", readiness_score:71, failure_probability:0.28, predicted_failure_date:"2024-12-15",  remaining_useful_life_days:25,  risk_level:"HIGH",
    sensor_readings:[...series("EQ-002","temperature","COMP-ENGINE",102,6,0.15),...series("EQ-002","vibration","COMP-ROTOR",0.8,0.12,0.008),...series("EQ-002","pressure","COMP-HYDRO",195,10,-0.3)],
    prediction:{ prediction_id:"PRED-002", equipment_id:"EQ-002", component_id:"COMP-ROTOR", failure_probability:0.28, predicted_failure_date:"2024-12-15", remaining_useful_life:25, confidence_score:0.84, risk_level:"HIGH", explanation:"Rotor vibration has increased 40% over the past 72 hours. Temperature trending upward. Recommend inspection before next mission." } },
  "EQ-003": { equipment_id:"EQ-003", readiness_score:45, failure_probability:0.62, predicted_failure_date:"2024-11-28",  remaining_useful_life_days:8,   risk_level:"CRITICAL",
    sensor_readings:[...series("EQ-003","temperature","COMP-ENGINE",118,8,0.3),...series("EQ-003","vibration","COMP-TRACK",1.4,0.2,0.02),...series("EQ-003","pressure","COMP-HYDRO",175,15,-0.6)],
    prediction:{ prediction_id:"PRED-003", equipment_id:"EQ-003", component_id:"COMP-ENGINE", failure_probability:0.62, predicted_failure_date:"2024-11-28", remaining_useful_life:8, confidence_score:0.88, risk_level:"CRITICAL", explanation:"Engine temperature is critically elevated. Hydraulic pressure dropping. Track vibration anomaly detected. Immediate maintenance required." } },
  "EQ-004": { equipment_id:"EQ-004", readiness_score:22, failure_probability:0.87, predicted_failure_date:"2024-11-23",  remaining_useful_life_days:3,   risk_level:"CRITICAL",
    sensor_readings:[...series("EQ-004","temperature","COMP-ENGINE",135,10,0.5),...series("EQ-004","vibration","COMP-ROTOR",2.1,0.3,0.04),...series("EQ-004","pressure","COMP-HYDRO",160,20,-1.0)],
    prediction:{ prediction_id:"PRED-004", equipment_id:"EQ-004", component_id:"COMP-ROTOR", failure_probability:0.87, predicted_failure_date:"2024-11-23", remaining_useful_life:3, confidence_score:0.93, risk_level:"CRITICAL", explanation:"Multiple critical anomalies detected: rotor imbalance, hydraulic failure risk, and engine overheat. Aircraft is grounded pending full inspection." } },
  "EQ-005": { equipment_id:"EQ-005", readiness_score:97, failure_probability:0.02, predicted_failure_date:null,           remaining_useful_life_days:340, risk_level:"LOW",
    sensor_readings:[...series("EQ-005","temperature","COMP-ENGINE",80,2,0.01),...series("EQ-005","vibration","COMP-TRACK",0.3,0.03,0),...series("EQ-005","pressure","COMP-HYDRO",215,3,0)],
    prediction:{ prediction_id:"PRED-005", equipment_id:"EQ-005", component_id:"COMP-ENGINE", failure_probability:0.02, predicted_failure_date:null, remaining_useful_life:340, confidence_score:0.96, risk_level:"LOW", explanation:"Recently serviced. All systems nominal. No anomalies detected." } },
  "EQ-006": { equipment_id:"EQ-006", readiness_score:68, failure_probability:0.31, predicted_failure_date:"2024-12-20",  remaining_useful_life_days:30,  risk_level:"HIGH",
    sensor_readings:[...series("EQ-006","temperature","COMP-ENGINE",98,7,0.1),...series("EQ-006","vibration","COMP-AXLE",0.9,0.1,0.005),...series("EQ-006","pressure","COMP-HYDRO",200,8,-0.2)],
    prediction:{ prediction_id:"PRED-006", equipment_id:"EQ-006", component_id:"COMP-AXLE", failure_probability:0.31, predicted_failure_date:"2024-12-20", remaining_useful_life:30, confidence_score:0.79, risk_level:"HIGH", explanation:"Axle vibration increasing. High mileage since last service. Schedule inspection within 2 weeks." } },
};

export const mockAlerts: Alert[] = [
  { alert_id:"ALT-001", equipment_id:"EQ-004", equipment_type:"Aircraft", severity:"CRITICAL", message:"Rotor imbalance exceeds safe threshold — aircraft grounded",          component:"Main Rotor",      timestamp:"2024-11-20T06:32:00Z", acknowledged:false },
  { alert_id:"ALT-002", equipment_id:"EQ-003", equipment_type:"Vehicle",  severity:"CRITICAL", message:"Engine temperature 118°C — critical overheating detected",            component:"Engine",          timestamp:"2024-11-20T07:15:00Z", acknowledged:false },
  { alert_id:"ALT-003", equipment_id:"EQ-002", equipment_type:"Aircraft", severity:"WARNING",  message:"Rotor vibration trending +40% over 72h",                              component:"Tail Rotor",      timestamp:"2024-11-19T22:00:00Z", acknowledged:false },
  { alert_id:"ALT-004", equipment_id:"EQ-003", equipment_type:"Vehicle",  severity:"CRITICAL", message:"Hydraulic pressure dropping below operational minimum",               component:"Hydraulic System",timestamp:"2024-11-20T07:45:00Z", acknowledged:false },
  { alert_id:"ALT-005", equipment_id:"EQ-006", equipment_type:"Vehicle",  severity:"WARNING",  message:"Axle vibration above baseline — schedule inspection",                 component:"Front Axle",      timestamp:"2024-11-19T14:30:00Z", acknowledged:true  },
  { alert_id:"ALT-006", equipment_id:"EQ-004", equipment_type:"Aircraft", severity:"CRITICAL", message:"Hydraulic pressure at 160 PSI — below safe limit of 180 PSI",        component:"Hydraulic System",timestamp:"2024-11-20T08:01:00Z", acknowledged:false },
];

export const mockMaintenanceTasks: MaintenanceTask[] = [
  { task_id:"TSK-001", equipment_id:"EQ-004", component_id:"COMP-ROTOR",  task_type:"Inspection & Replacement", priority:"CRITICAL", recommended_action:"Immediate rotor system inspection. Replace main rotor blade assembly. Ground aircraft until cleared.",            estimated_downtime:72, status:"PENDING"     },
  { task_id:"TSK-002", equipment_id:"EQ-003", component_id:"COMP-ENGINE", task_type:"Engine Overhaul",           priority:"CRITICAL", recommended_action:"Engine coolant flush and thermostat replacement. Full engine inspection required before next operation.",        estimated_downtime:48, status:"PENDING"     },
  { task_id:"TSK-003", equipment_id:"EQ-003", component_id:"COMP-HYDRO",  task_type:"Hydraulic Service",         priority:"CRITICAL", recommended_action:"Replace hydraulic fluid and inspect lines for leaks. Pressure test all hydraulic circuits.",                    estimated_downtime:24, status:"IN_PROGRESS" },
  { task_id:"TSK-004", equipment_id:"EQ-002", component_id:"COMP-ROTOR",  task_type:"Vibration Analysis",        priority:"HIGH",     recommended_action:"Perform dynamic balancing of tail rotor. Inspect drive shaft bearings. Schedule within 5 flight hours.",       estimated_downtime:16, status:"PENDING"     },
  { task_id:"TSK-005", equipment_id:"EQ-006", component_id:"COMP-AXLE",   task_type:"Axle Inspection",           priority:"HIGH",     recommended_action:"Inspect front axle CV joints and bearings. Lubricate and replace worn components.",                             estimated_downtime:8,  status:"PENDING"     },
  { task_id:"TSK-006", equipment_id:"EQ-002", component_id:"COMP-ENGINE", task_type:"Scheduled Service",         priority:"MEDIUM",   recommended_action:"100-hour service: oil change, filter replacement, spark plug check.",                                          estimated_downtime:6,  status:"PENDING"     },
  { task_id:"TSK-007", equipment_id:"EQ-001", component_id:"COMP-HYDRO",  task_type:"Routine Check",             priority:"LOW",      recommended_action:"Hydraulic fluid level check and top-up at next scheduled maintenance window.",                                  estimated_downtime:2,  status:"PENDING"     },
];

export const mockReport: ReadinessReport = {
  report_id:"RPT-2024-1120", generated_at:"2024-11-20T08:00:00Z",
  total_equipment:6, mission_ready:2, ready_with_warning:2, maintenance_required:1, not_mission_ready:1, critical_alerts:4,
};

export const copilotSamples: Record<string, string> = {
  default:    "I've analyzed current sensor readings and maintenance records. Please ask a specific question about equipment readiness, failure risk, or maintenance priorities.",
  ready:      "Equipment EQ-001 (UH-60 Black Hawk) and EQ-005 (Bradley IFV) are MISSION READY. EQ-002 and EQ-006 can operate with close monitoring.",
  "not ready":"EQ-004 (CH-47 Chinook) is NOT MISSION READY due to critical rotor imbalance and hydraulic failure risk. EQ-003 (M1A2 Abrams) requires immediate maintenance before deployment.",
  "high risk":"Aircraft EQ-002 shows 28% failure probability driven by a 40% increase in tail rotor vibration over 72 hours. Recommend vibration analysis and dynamic balancing before next flight.",
  vibration:  "Abnormal vibration detected on: EQ-002 (tail rotor, +40%), EQ-004 (main rotor, critical — 525% above baseline), EQ-006 (front axle, +20%).",
  service:    "Highest priority component for immediate service: EQ-004 Main Rotor (CRITICAL). Aircraft is grounded. Next: EQ-003 Engine — 62% failure probability within 8 days.",
};
