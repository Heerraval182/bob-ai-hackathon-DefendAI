/**
 * Member 3 — Recommendation Engine
 * ===================================
 * Generates prioritised maintenance tasks from AI prediction results
 * and ranks existing tasks by urgency.
 *
 * Sourced from docs/architecture.md § 4.6 Recommendation Engine:
 *   - Rank maintenance tasks by urgency
 *   - Identify critical components
 *   - Recommend inspection or replacement
 *   - Estimate downtime and operational impact
 *   - Generate a maintenance checklist
 */

'use strict';

const PRIORITY_ORDER = { Critical: 1, High: 2, Medium: 3, Low: 4 };

// Component-specific action templates (based on sensor that triggered the alert)
const ACTION_TEMPLATES = {
  temperature: {
    Critical: { action: 'Immediate engine shutdown and full thermal inspection. Replace cooling system components.', downtime: 48 },
    High:     { action: 'Inspect cooling system, flush coolant, check thermostat and heat exchangers.', downtime: 12 },
    Medium:   { action: 'Monitor temperature closely. Schedule cooling system service within 7 days.', downtime: 4 },
    Low:      { action: 'Log elevated temperature. Review at next scheduled maintenance.', downtime: 1 },
  },
  vibration: {
    Critical: { action: 'Ground asset immediately. Full drivetrain and bearing inspection. Do not operate until cleared.', downtime: 72 },
    High:     { action: 'Inspect drivetrain, bearings, and mounts. Check for loose components and misalignment.', downtime: 16 },
    Medium:   { action: 'Schedule vibration analysis. Inspect bearings and rotor balance within 14 days.', downtime: 6 },
    Low:      { action: 'Log vibration trend. Monitor for escalation at next service.', downtime: 1 },
  },
  pressure: {
    Critical: { action: 'Inspect hydraulic/fuel system immediately. Check for leaks, pump failure, or line blockage.', downtime: 24 },
    High:     { action: 'Service hydraulic pump and inspect pressure lines. Check seals and filters.', downtime: 8 },
    Medium:   { action: 'Schedule pressure system service. Monitor for further deviation.', downtime: 3 },
    Low:      { action: 'Log pressure reading. Check at next scheduled service.', downtime: 1 },
  },
  battery: {
    Critical: { action: 'Replace battery immediately. Do not operate on current power system.', downtime: 4 },
    High:     { action: 'Replace or recharge battery before next mission. Run full electrical diagnostic.', downtime: 2 },
    Medium:   { action: 'Schedule battery replacement within 7 days. Monitor charge levels.', downtime: 1 },
    Low:      { action: 'Log battery state. Plan replacement at next scheduled maintenance.', downtime: 0.5 },
  },
  usage: {
    Critical: { action: 'Full engine overhaul required — usage hours exceed critical threshold.', downtime: 96 },
    High:     { action: 'Schedule major service overhaul. Usage hours approaching critical limit.', downtime: 48 },
    Medium:   { action: 'Schedule intermediate service. Usage hours are elevated.', downtime: 12 },
    Low:      { action: 'Log usage hours. Schedule at next available maintenance window.', downtime: 2 },
  },
  composite: {
    Critical: { action: 'Multiple critical sensor anomalies detected. Ground asset and conduct full systems inspection.', downtime: 72 },
    High:     { action: 'Multiple high-risk indicators present. Schedule comprehensive inspection before next mission.', downtime: 24 },
    Medium:   { action: 'Elevated risk across multiple systems. Schedule preventive maintenance within 14 days.', downtime: 8 },
    Low:      { action: 'Minor anomalies detected. Review at next scheduled maintenance.', downtime: 2 },
  },
};

/**
 * Determines which sensor/component is the primary concern for a prediction.
 */
function getPrimaryComponent(features) {
  if (!features) return 'composite';
  const checks = [
    { type: 'temperature', score: features.max_temperature > 100 ? 3 : features.max_temperature > 85 ? 2 : 0 },
    { type: 'vibration',   score: features.max_vibration   > 1.0 ? 3 : features.max_vibration   > 0.6 ? 2 : 0 },
    { type: 'pressure',    score: features.min_pressure    < 30  ? 3 : features.min_pressure    < 35  ? 2 : 0 },
    { type: 'battery',     score: features.min_battery     < 10  ? 3 : features.min_battery     < 25  ? 2 : 0 },
    { type: 'usage',       score: features.total_usage_hours > 2500 ? 3 : features.total_usage_hours > 1500 ? 2 : 0 },
  ];
  checks.sort((a, b) => b.score - a.score);
  return checks[0].score > 0 ? checks[0].type : 'composite';
}

/**
 * Generates a recommended maintenance task from a prediction result.
 * Returns null if risk is Low and no existing task needed.
 */
function generateTaskFromPrediction(prediction, features) {
  const { equipment_id, risk_level, failure_probability, remaining_useful_life } = prediction;
  if (risk_level === 'Low' && failure_probability < 0.15) return null;

  const component = getPrimaryComponent(features);
  const template  = ACTION_TEMPLATES[component]?.[risk_level] || ACTION_TEMPLATES.composite[risk_level];

  return {
    equipment_id,
    component_id:       component,
    task_type:          risk_level === 'Critical' ? 'Emergency Inspection'
                      : risk_level === 'High'     ? 'Inspection'
                      : 'Preventive Maintenance',
    priority:           risk_level,
    recommended_action: template.action,
    estimated_downtime: template.downtime,
    rul_days:           remaining_useful_life,
    failure_probability,
  };
}

/**
 * Ranks an array of maintenance tasks by:
 *   1. Priority (Critical → Low)
 *   2. Failure probability (highest first)
 *   3. RUL days (lowest first — most urgent)
 */
function rankTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] || 99;
    const pb = PRIORITY_ORDER[b.priority] || 99;
    if (pa !== pb) return pa - pb;

    const fa = a.failure_probability || 0;
    const fb = b.failure_probability || 0;
    if (fa !== fb) return fb - fa;

    const ra = a.rul_days ?? 999;
    const rb = b.rul_days ?? 999;
    return ra - rb;
  });
}

/**
 * Generates a full maintenance plan for a list of predictions.
 * Returns { tasks, summary }.
 */
function generateMaintenancePlan(predictions, featuresMap = {}) {
  const tasks = [];

  for (const pred of predictions) {
    const features = featuresMap[pred.equipment_id] || null;
    const task = generateTaskFromPrediction(pred, features);
    if (task) tasks.push(task);
  }

  const ranked = rankTasks(tasks);

  const summary = {
    total_assets_assessed: predictions.length,
    tasks_generated:       ranked.length,
    critical:              ranked.filter(t => t.priority === 'Critical').length,
    high:                  ranked.filter(t => t.priority === 'High').length,
    medium:                ranked.filter(t => t.priority === 'Medium').length,
    low:                   ranked.filter(t => t.priority === 'Low').length,
    total_estimated_downtime_hours: ranked.reduce((s, t) => s + (t.estimated_downtime || 0), 0),
  };

  return { tasks: ranked, summary };
}

module.exports = { generateTaskFromPrediction, generateMaintenancePlan, rankTasks, getPrimaryComponent };
