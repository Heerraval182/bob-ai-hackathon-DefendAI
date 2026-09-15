/**
 * Member 3 — Copilot Query Handler
 * ==================================
 * Full NLP intent routing for the /api/copilot/query endpoint.
 *
 * Replaces the simple keyword stub in server.js with structured
 * intent detection and rich, data-driven answers.
 *
 * Intents supported:
 *   readiness_status     — fleet/equipment readiness overview
 *   not_ready            — list NOT MISSION READY assets
 *   maintenance_required — list assets needing maintenance
 *   alerts               — active critical/high alerts
 *   specific_equipment   — health detail for one asset
 *   high_risk            — list high/critical risk assets
 *   recommendations      — top maintenance recommendations
 *   rul                  — remaining useful life queries
 *   report               — fleet summary report
 *   help                 — show available questions
 */

'use strict';

// ---------------------------------------------------------------------------
// Intent patterns — ordered by specificity (most specific first)
// ---------------------------------------------------------------------------
const INTENTS = [
  {
    name: 'not_ready',
    patterns: [/not (mission )?ready/i, /non[\s-]?mission/i, /cannot (fly|operate|deploy)/i, /grounded/i],
  },
  {
    name: 'maintenance_required',
    patterns: [/maintenance required/i, /needs? (maintenance|service|repair)/i, /due (for )?service/i, /overdue/i],
  },
  {
    name: 'high_risk',
    patterns: [/high.?risk/i, /critical.?risk/i, /most (dangerous|risky|at.risk)/i, /likely to fail/i, /failure risk/i],
  },
  {
    name: 'alerts',
    patterns: [/alert/i, /warning/i, /critical (issue|problem|fault)/i, /active (fault|issue)/i],
  },
  {
    name: 'rul',
    patterns: [/remaining.?useful.?life/i, /\brul\b/i, /how long (until|before)/i, /days? (left|remaining|until fail)/i, /when will.*fail/i],
  },
  {
    name: 'recommendations',
    patterns: [/recommend/i, /what.*(fix|repair|do|service|prioriti)/i, /maintenance plan/i, /action plan/i, /next step/i],
  },
  {
    name: 'report',
    patterns: [/report/i, /overview/i, /summary/i, /fleet status/i, /dashboard/i],
  },
  {
    name: 'readiness_status',
    patterns: [/ready/i, /mission (status|capable)/i, /readiness/i, /operational status/i, /can (fly|operate|deploy)/i],
  },
  {
    name: 'help',
    patterns: [/help/i, /what can you/i, /what do you know/i, /\?$/],
  },
];

// Equipment ID extractor — matches patterns like A101, V215, EQ-001
const EQ_ID_RE = /\b([A-Z]{1,3}[-_]?\d{2,4})\b/i;

/**
 * Detects the intent of a question.
 * Returns { intent, equipment_id | null }.
 */
function detectIntent(question) {
  const eqMatch = question.match(EQ_ID_RE);
  const equipment_id = eqMatch ? eqMatch[1].toUpperCase() : null;

  // Specific equipment question takes priority
  if (equipment_id) {
    return { intent: 'specific_equipment', equipment_id };
  }

  for (const { name, patterns } of INTENTS) {
    if (patterns.some(p => p.test(question))) {
      return { intent: name, equipment_id: null };
    }
  }

  return { intent: 'unknown', equipment_id: null };
}

// ---------------------------------------------------------------------------
// Answer builders — each returns { answer, data }
// ---------------------------------------------------------------------------

async function answerNotReady(pool) {
  const { rows } = await pool.query(`
    SELECT e.equipment_id, e.equipment_type, e.model, e.unit, e.mission_status,
           p.failure_probability, p.risk_level, p.explanation, p.remaining_useful_life
    FROM Equipment e
    LEFT JOIN LATERAL (
      SELECT failure_probability, risk_level, explanation, remaining_useful_life
      FROM Predictions WHERE equipment_id = e.equipment_id
      ORDER BY created_at DESC LIMIT 1
    ) p ON TRUE
    WHERE e.mission_status = 'NOT MISSION READY'
    ORDER BY e.equipment_id
  `);
  if (!rows.length) return { answer: 'No equipment is currently classified as NOT MISSION READY. All assets are operational.', data: [] };
  const list = rows.map(r =>
    `• ${r.equipment_id} (${r.model}): ${r.explanation || 'Critical sensor anomaly detected.'} RUL: ${r.remaining_useful_life ?? 'N/A'} days.`
  ).join('\n');
  return {
    answer: `${rows.length} asset(s) are NOT MISSION READY:\n\n${list}`,
    data: rows,
  };
}

async function answerMaintenanceRequired(pool) {
  const { rows } = await pool.query(`
    SELECT e.equipment_id, e.equipment_type, e.model, e.unit, e.mission_status,
           p.failure_probability, p.risk_level, p.remaining_useful_life,
           (SELECT COUNT(*) FROM MaintenanceTasks mt WHERE mt.equipment_id = e.equipment_id AND mt.status = 'Pending') AS pending_tasks
    FROM Equipment e
    LEFT JOIN LATERAL (
      SELECT failure_probability, risk_level, remaining_useful_life
      FROM Predictions WHERE equipment_id = e.equipment_id
      ORDER BY created_at DESC LIMIT 1
    ) p ON TRUE
    WHERE e.mission_status IN ('MAINTENANCE REQUIRED', 'NOT MISSION READY')
    ORDER BY p.failure_probability DESC NULLS LAST
  `);
  if (!rows.length) return { answer: 'No equipment currently requires maintenance. Fleet is in good condition.', data: [] };
  const list = rows.map(r =>
    `• ${r.equipment_id} (${r.model}) — Status: ${r.mission_status}, Risk: ${r.risk_level || 'Unknown'}, Pending tasks: ${r.pending_tasks}`
  ).join('\n');
  return {
    answer: `${rows.length} asset(s) require maintenance:\n\n${list}`,
    data: rows,
  };
}

async function answerHighRisk(pool) {
  const { rows } = await pool.query(`
    SELECT e.equipment_id, e.model, e.unit, p.risk_level,
           p.failure_probability, p.remaining_useful_life, p.explanation
    FROM Equipment e
    JOIN LATERAL (
      SELECT risk_level, failure_probability, remaining_useful_life, explanation
      FROM Predictions WHERE equipment_id = e.equipment_id
      ORDER BY created_at DESC LIMIT 1
    ) p ON TRUE
    WHERE p.risk_level IN ('Critical', 'High')
    ORDER BY p.failure_probability DESC
  `);
  if (!rows.length) return { answer: 'No assets are currently classified as High or Critical risk.', data: [] };
  const list = rows.map(r =>
    `• ${r.equipment_id} (${r.model}): ${r.risk_level} risk — ${(r.failure_probability * 100).toFixed(0)}% failure probability, ${r.remaining_useful_life ?? 'N/A'} days RUL.`
  ).join('\n');
  return {
    answer: `${rows.length} high/critical risk asset(s):\n\n${list}`,
    data: rows,
  };
}

async function answerAlerts(pool) {
  const { rows } = await pool.query(`
    SELECT a.equipment_id, a.alert_type, a.severity, a.message, a.created_at,
           e.model, e.unit
    FROM Alerts a
    JOIN Equipment e ON e.equipment_id = a.equipment_id
    WHERE a.acknowledged = FALSE
    ORDER BY CASE a.severity WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 ELSE 3 END, a.created_at DESC
    LIMIT 15
  `);
  if (!rows.length) return { answer: 'No active alerts at this time. All systems nominal.', data: [] };
  const list = rows.map(r => `• [${r.severity}] ${r.equipment_id} — ${r.alert_type}: ${r.message}`).join('\n');
  return {
    answer: `${rows.length} active alert(s):\n\n${list}`,
    data: rows,
  };
}

async function answerSpecificEquipment(pool, equipment_id) {
  const eq = await pool.query('SELECT * FROM Equipment WHERE equipment_id = $1', [equipment_id]);
  if (!eq.rows.length) return { answer: `Equipment '${equipment_id}' not found in the system.`, data: null };

  const e = eq.rows[0];
  const pred = await pool.query(`
    SELECT * FROM Predictions WHERE equipment_id = $1 ORDER BY created_at DESC LIMIT 1
  `, [equipment_id]);
  const reading = await pool.query(`
    SELECT * FROM SensorReadings WHERE equipment_id = $1 ORDER BY timestamp DESC LIMIT 1
  `, [equipment_id]);
  const tasks = await pool.query(`
    SELECT task_type, priority, recommended_action FROM MaintenanceTasks
    WHERE equipment_id = $1 AND status = 'Pending'
    ORDER BY CASE priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END
    LIMIT 3
  `, [equipment_id]);

  const p = pred.rows[0];
  const r = reading.rows[0];

  let answer = `**${equipment_id} — ${e.model}** (${e.unit})\n`;
  answer += `Status: ${e.mission_status}\n`;

  if (r) {
    answer += `\nLatest sensors: Temp ${r.temperature}°C | Vibration ${r.vibration}g | Pressure ${r.pressure} bar | Battery ${r.battery}%\n`;
  }
  if (p) {
    answer += `\nAI Assessment: ${p.risk_level} risk — ${(p.failure_probability * 100).toFixed(0)}% failure probability\n`;
    answer += `Remaining useful life: ${p.remaining_useful_life ?? 'N/A'} days | Predicted failure: ${p.predicted_failure_date ?? 'N/A'}\n`;
    if (p.explanation) answer += `\nReason: ${p.explanation}\n`;
  } else {
    answer += '\nNo AI prediction available yet. Run /api/predictions/run to generate.\n';
  }
  if (tasks.rows.length) {
    answer += `\nTop maintenance tasks:\n` + tasks.rows.map(t => `• [${t.priority}] ${t.task_type}: ${t.recommended_action}`).join('\n');
  }

  return { answer, data: { equipment: e, prediction: p, latest_reading: r, pending_tasks: tasks.rows } };
}

async function answerRUL(pool) {
  const { rows } = await pool.query(`
    SELECT e.equipment_id, e.model, p.remaining_useful_life, p.predicted_failure_date, p.risk_level
    FROM Equipment e
    JOIN LATERAL (
      SELECT remaining_useful_life, predicted_failure_date, risk_level
      FROM Predictions WHERE equipment_id = e.equipment_id
      ORDER BY created_at DESC LIMIT 1
    ) p ON TRUE
    WHERE p.remaining_useful_life IS NOT NULL
    ORDER BY p.remaining_useful_life ASC
    LIMIT 10
  `);
  if (!rows.length) return { answer: 'No RUL data available. Run fleet predictions first via POST /api/predictions/run/fleet.', data: [] };
  const list = rows.map(r =>
    `• ${r.equipment_id} (${r.model}): ${r.remaining_useful_life} days remaining (${r.risk_level} risk) — predicted failure ${r.predicted_failure_date}`
  ).join('\n');
  return { answer: `Remaining useful life — lowest first:\n\n${list}`, data: rows };
}

async function answerRecommendations(pool) {
  const { rows } = await pool.query(`
    SELECT mt.equipment_id, mt.component_id, mt.task_type, mt.priority,
           mt.recommended_action, mt.estimated_downtime,
           e.model, e.unit,
           p.failure_probability, p.risk_level, p.remaining_useful_life
    FROM MaintenanceTasks mt
    JOIN Equipment e ON e.equipment_id = mt.equipment_id
    LEFT JOIN LATERAL (
      SELECT failure_probability, risk_level, remaining_useful_life
      FROM Predictions WHERE equipment_id = mt.equipment_id
      ORDER BY created_at DESC LIMIT 1
    ) p ON TRUE
    WHERE mt.status = 'Pending'
    ORDER BY CASE mt.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
             p.failure_probability DESC NULLS LAST
    LIMIT 10
  `);
  if (!rows.length) return { answer: 'No pending maintenance tasks. All tasks are completed or no predictions have been run.', data: [] };
  const list = rows.map((r, i) =>
    `${i + 1}. [${r.priority}] ${r.equipment_id} (${r.model}) — ${r.task_type}: ${r.recommended_action} (Est. downtime: ${r.estimated_downtime}h)`
  ).join('\n');
  return { answer: `Top ${rows.length} maintenance recommendations (highest priority first):\n\n${list}`, data: rows };
}

async function answerReport(pool) {
  const totals = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE mission_status = 'MISSION READY')        AS mission_ready,
      COUNT(*) FILTER (WHERE mission_status = 'READY WITH WARNING')    AS ready_with_warning,
      COUNT(*) FILTER (WHERE mission_status = 'MAINTENANCE REQUIRED')  AS maintenance_required,
      COUNT(*) FILTER (WHERE mission_status = 'NOT MISSION READY')     AS not_mission_ready,
      COUNT(*)                                                          AS total
    FROM Equipment
  `);
  const alerts = await pool.query(`SELECT COUNT(*) AS count FROM Alerts WHERE acknowledged = FALSE`);
  const tasks  = await pool.query(`SELECT COUNT(*) AS count FROM MaintenanceTasks WHERE status = 'Pending'`);

  const t = totals.rows[0];
  const answer =
    `Fleet Readiness Report\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Total assets       : ${t.total}\n` +
    `Mission Ready      : ${t.mission_ready}\n` +
    `Ready With Warning : ${t.ready_with_warning}\n` +
    `Maintenance Req.   : ${t.maintenance_required}\n` +
    `Not Mission Ready  : ${t.not_mission_ready}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Active alerts      : ${alerts.rows[0].count}\n` +
    `Pending tasks      : ${tasks.rows[0].count}`;

  return { answer, data: { ...t, active_alerts: alerts.rows[0].count, pending_tasks: tasks.rows[0].count } };
}

function answerHelp() {
  return {
    answer:
      'I can answer the following questions:\n\n' +
      '• "Which assets are NOT MISSION READY?"\n' +
      '• "Which equipment needs maintenance?"\n' +
      '• "Show high-risk assets"\n' +
      '• "Show active alerts"\n' +
      '• "What is the RUL for the fleet?"\n' +
      '• "Show maintenance recommendations"\n' +
      '• "Give me a fleet report"\n' +
      '• "Tell me about A115" (any equipment ID)\n' +
      '• "Why is V215 not mission ready?"',
    data: null,
  };
}

// ---------------------------------------------------------------------------
// Main handler — called from server.js
// ---------------------------------------------------------------------------

async function handleCopilotQuery(pool, question) {
  const { intent, equipment_id } = detectIntent(question);

  switch (intent) {
    case 'not_ready':           return answerNotReady(pool);
    case 'maintenance_required':return answerMaintenanceRequired(pool);
    case 'high_risk':           return answerHighRisk(pool);
    case 'alerts':              return answerAlerts(pool);
    case 'specific_equipment':  return answerSpecificEquipment(pool, equipment_id);
    case 'rul':                 return answerRUL(pool);
    case 'recommendations':     return answerRecommendations(pool);
    case 'report':              return answerReport(pool);
    case 'readiness_status':    return answerReport(pool);
    case 'help':                return answerHelp();
    default:
      return {
        answer:
          'I didn\'t understand that question. Try asking:\n' +
          '"Which assets are not mission ready?", "Show active alerts",\n' +
          '"Maintenance recommendations", or "Tell me about A115".\n' +
          'Type "help" to see all available questions.',
        data: null,
      };
  }
}

module.exports = { handleCopilotQuery, detectIntent };
