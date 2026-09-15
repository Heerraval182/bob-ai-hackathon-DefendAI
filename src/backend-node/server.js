const express = require('express');
const cors = require('cors');
const { getPool } = require('./database');
const { loadDataset } = require('./pipeline');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validates that a value is a finite number within [min, max].
 */
function isValidNumber(v, min, max) {
  return typeof v === 'number' && isFinite(v) && v >= min && v <= max;
}

/**
 * Rule-based readiness scoring used until the AI engine (Member 2) provides
 * predictions.  Returns { score, status, issues }.
 *
 * Scoring rubric (100 points max):
 *   - Temperature  : deduct up to 30 pts
 *   - Vibration    : deduct up to 30 pts
 *   - Battery      : deduct up to 20 pts
 *   - Usage hours  : deduct up to 20 pts
 */
function computeReadiness(reading, equipment) {
  let score = 100;
  const issues = [];

  const temp  = reading.temperature  ?? 70;
  const vib   = reading.vibration    ?? 0.2;
  const batt  = reading.battery      ?? 100;
  const hours = equipment.total_usage_hours ?? 0;

  // Temperature thresholds
  if (temp >= 100) { score -= 30; issues.push(`Critical temperature: ${temp}°C`); }
  else if (temp >= 85) { score -= 15; issues.push(`Elevated temperature: ${temp}°C`); }

  // Vibration thresholds
  if (vib >= 1.0) { score -= 30; issues.push(`Critical vibration: ${vib}g`); }
  else if (vib >= 0.6) { score -= 15; issues.push(`Elevated vibration: ${vib}g`); }

  // Battery thresholds
  if (batt <= 10) { score -= 20; issues.push(`Critical battery: ${batt}%`); }
  else if (batt <= 25) { score -= 10; issues.push(`Low battery: ${batt}%`); }

  // Usage hours
  if (hours >= 2500) { score -= 20; issues.push(`Very high usage hours: ${hours}`); }
  else if (hours >= 1500) { score -= 10; issues.push(`High usage hours: ${hours}`); }

  score = Math.max(0, score);

  let status;
  if (score >= 85)       status = 'MISSION READY';
  else if (score >= 65)  status = 'READY WITH WARNING';
  else if (score >= 40)  status = 'MAINTENANCE REQUIRED';
  else                   status = 'NOT MISSION READY';

  return { score, status, issues };
}

// ---------------------------------------------------------------------------
// POST /api/sensors/data  — Ingest a sensor reading
// ---------------------------------------------------------------------------
app.post('/api/sensors/data', async (req, res) => {
  const { equipment_id, component_id, sensor_type, temperature, vibration, pressure, battery } = req.body;

  // Required field checks
  if (!equipment_id || typeof equipment_id !== 'string') {
    return res.status(400).json({ error: 'Valid equipment_id (string) is required' });
  }
  if (!isValidNumber(temperature, -50, 300)) {
    return res.status(400).json({ error: 'temperature must be a number between -50 and 300' });
  }
  if (!isValidNumber(vibration, 0, 20)) {
    return res.status(400).json({ error: 'vibration must be a number between 0 and 20' });
  }

  const pool = getPool();

  try {
    // Verify equipment exists
    const eq = await pool.query('SELECT equipment_id FROM Equipment WHERE equipment_id = $1', [equipment_id]);
    if (eq.rows.length === 0) {
      return res.status(404).json({ error: `Equipment ${equipment_id} not found` });
    }

    // Duplicate guard: reject a reading with identical values within the last 5 seconds
    const dup = await pool.query(`
      SELECT reading_id FROM SensorReadings
      WHERE equipment_id = $1
        AND temperature = $2
        AND vibration   = $3
        AND timestamp   > NOW() - INTERVAL '5 seconds'
      LIMIT 1
    `, [equipment_id, temperature, vibration]);

    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'Duplicate reading detected within the last 5 seconds' });
    }

    await pool.query(`
      INSERT INTO SensorReadings
        (equipment_id, component_id, sensor_type, temperature, vibration, pressure, battery)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      equipment_id,
      component_id  || null,
      sensor_type   || 'HUMS',
      temperature,
      vibration,
      pressure      ?? 0,
      battery       ?? 100,
    ]);

    res.status(201).json({ message: 'Sensor data ingested successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/equipment  — List all equipment
// ---------------------------------------------------------------------------
app.get('/api/equipment', async (req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query('SELECT * FROM Equipment ORDER BY equipment_id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/equipment/:id  — Equipment detail with recent sensor readings
// ---------------------------------------------------------------------------
app.get('/api/equipment/:id', async (req, res) => {
  const pool = getPool();
  try {
    const eqResult = await pool.query(
      'SELECT * FROM Equipment WHERE equipment_id = $1',
      [req.params.id]
    );
    if (eqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const readingsResult = await pool.query(`
      SELECT * FROM SensorReadings
      WHERE equipment_id = $1
      ORDER BY timestamp DESC
      LIMIT 10
    `, [req.params.id]);

    res.json({ ...eqResult.rows[0], recent_readings: readingsResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/equipment/:id/health  — Sensor health summary for one asset
// ---------------------------------------------------------------------------
app.get('/api/equipment/:id/health', async (req, res) => {
  const pool = getPool();
  try {
    const eqResult = await pool.query(
      'SELECT * FROM Equipment WHERE equipment_id = $1',
      [req.params.id]
    );
    if (eqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    const equipment = eqResult.rows[0];

    // Most-recent sensor reading
    const latestReading = await pool.query(`
      SELECT * FROM SensorReadings
      WHERE equipment_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `, [req.params.id]);

    // Latest AI prediction (populated by Member 2's engine)
    const latestPrediction = await pool.query(`
      SELECT * FROM Predictions
      WHERE equipment_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [req.params.id]);

    // Active (unacknowledged) alerts
    const activeAlerts = await pool.query(`
      SELECT * FROM Alerts
      WHERE equipment_id = $1 AND acknowledged = FALSE
      ORDER BY created_at DESC
    `, [req.params.id]);

    const reading    = latestReading.rows[0]    || {};
    const prediction = latestPrediction.rows[0] || null;
    const { score, status, issues } = computeReadiness(reading, equipment);

    res.json({
      equipment_id:    equipment.equipment_id,
      equipment_type:  equipment.equipment_type,
      model:           equipment.model,
      unit:            equipment.unit,
      latest_reading:  reading,
      sensor_health: {
        readiness_score:  score,
        readiness_status: status,
        issues,
      },
      prediction,
      active_alerts: activeAlerts.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/equipment/:id/readiness  — Mission-readiness classification
// ---------------------------------------------------------------------------
app.get('/api/equipment/:id/readiness', async (req, res) => {
  const pool = getPool();
  try {
    const eqResult = await pool.query(
      'SELECT * FROM Equipment WHERE equipment_id = $1',
      [req.params.id]
    );
    if (eqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    const equipment = eqResult.rows[0];

    const latestReading = await pool.query(`
      SELECT * FROM SensorReadings
      WHERE equipment_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `, [req.params.id]);

    const latestPrediction = await pool.query(`
      SELECT failure_probability, risk_level, remaining_useful_life, explanation
      FROM Predictions
      WHERE equipment_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [req.params.id]);

    const reading    = latestReading.rows[0]    || {};
    const prediction = latestPrediction.rows[0] || null;
    const { score, status, issues } = computeReadiness(reading, equipment);

    // If the AI engine has classified a higher-severity risk, honour it
    let finalStatus = status;
    if (prediction) {
      if (prediction.risk_level === 'Critical') finalStatus = 'NOT MISSION READY';
      else if (prediction.risk_level === 'High' && score >= 65) finalStatus = 'MAINTENANCE REQUIRED';
    }

    res.json({
      equipment_id:       equipment.equipment_id,
      readiness_score:    score,
      readiness_status:   finalStatus,
      issues,
      ai_risk_level:      prediction?.risk_level              || 'Unknown',
      failure_probability:prediction?.failure_probability     || null,
      remaining_useful_life: prediction?.remaining_useful_life || null,
      explanation:        prediction?.explanation              || 'Rule-based assessment; AI prediction pending.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/alerts  — All active (unacknowledged) alerts, newest first
// ---------------------------------------------------------------------------
app.get('/api/alerts', async (req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(`
      SELECT a.*, e.equipment_type, e.model, e.unit
      FROM Alerts a
      JOIN Equipment e ON e.equipment_id = a.equipment_id
      WHERE a.acknowledged = FALSE
      ORDER BY a.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/maintenance/tasks  — All maintenance tasks, ordered by priority
// ---------------------------------------------------------------------------
const PRIORITY_ORDER = { Critical: 1, High: 2, Medium: 3, Low: 4 };

app.get('/api/maintenance/tasks', async (req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(`
      SELECT mt.*, e.equipment_type, e.model, e.unit
      FROM MaintenanceTasks mt
      JOIN Equipment e ON e.equipment_id = mt.equipment_id
      ORDER BY created_at DESC
    `);
    // Sort by priority severity in application layer for clarity
    rows.sort((a, b) => (PRIORITY_ORDER[a.priority] || 99) - (PRIORITY_ORDER[b.priority] || 99));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/maintenance/tasks  — Create a new maintenance task
// ---------------------------------------------------------------------------
app.post('/api/maintenance/tasks', async (req, res) => {
  const { equipment_id, component_id, task_type, priority, recommended_action, estimated_downtime } = req.body;

  if (!equipment_id || typeof equipment_id !== 'string') {
    return res.status(400).json({ error: 'Valid equipment_id is required' });
  }
  if (!task_type || typeof task_type !== 'string') {
    return res.status(400).json({ error: 'task_type is required' });
  }
  const validPriorities = ['Critical', 'High', 'Medium', 'Low'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${validPriorities.join(', ')}` });
  }

  const pool = getPool();
  try {
    const { rows } = await pool.query(`
      INSERT INTO MaintenanceTasks
        (equipment_id, component_id, task_type, priority, recommended_action, estimated_downtime)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      equipment_id,
      component_id       || null,
      task_type,
      priority           || 'Medium',
      recommended_action || null,
      estimated_downtime || null,
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/maintenance/recommendations  — Prioritized recommendation list
// (populated by AI engine; falls back to rule-based pending tasks)
// ---------------------------------------------------------------------------
app.get('/api/maintenance/recommendations', async (req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(`
      SELECT mt.*, e.equipment_type, e.model, e.unit,
             p.failure_probability, p.risk_level, p.remaining_useful_life
      FROM MaintenanceTasks mt
      JOIN Equipment e ON e.equipment_id = mt.equipment_id
      LEFT JOIN LATERAL (
        SELECT failure_probability, risk_level, remaining_useful_life
        FROM Predictions
        WHERE equipment_id = mt.equipment_id
        ORDER BY created_at DESC
        LIMIT 1
      ) p ON TRUE
      WHERE mt.status = 'Pending'
    `);
    rows.sort((a, b) => (PRIORITY_ORDER[a.priority] || 99) - (PRIORITY_ORDER[b.priority] || 99));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/maintenance/feedback  — Record outcome of a completed task
// ---------------------------------------------------------------------------
app.post('/api/maintenance/feedback', async (req, res) => {
  const { task_id, equipment_id, outcome, technician, notes } = req.body;

  if (!task_id || typeof task_id !== 'number') {
    return res.status(400).json({ error: 'Valid task_id (number) is required' });
  }
  if (!outcome || typeof outcome !== 'string') {
    return res.status(400).json({ error: 'outcome is required' });
  }

  const pool = getPool();
  try {
    // Mark the task as complete
    await pool.query(
      `UPDATE MaintenanceTasks SET status = 'Completed' WHERE task_id = $1`,
      [task_id]
    );

    const { rows } = await pool.query(`
      INSERT INTO MaintenanceFeedback (task_id, equipment_id, outcome, technician, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [task_id, equipment_id || null, outcome, technician || null, notes || null]);

    res.status(201).json({ message: 'Feedback recorded', feedback: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/copilot/query  — Natural-language question stub
// (Member 3 will replace the body with the NLP/LLM handler)
// ---------------------------------------------------------------------------
app.post('/api/copilot/query', async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question (string) is required' });
  }

  const pool = getPool();

  // Simple keyword routing — Member 3 will replace with a proper NLP handler
  const q = question.toLowerCase();

  try {
    if (q.includes('not ready') || q.includes('not mission ready')) {
      const { rows } = await pool.query(`
        SELECT equipment_id, model, unit, mission_status
        FROM Equipment
        WHERE mission_status = 'NOT MISSION READY'
      `);
      return res.json({
        question,
        answer: rows.length
          ? `Equipment not mission ready: ${rows.map(r => r.equipment_id).join(', ')}`
          : 'No equipment is currently classified as NOT MISSION READY.',
        data: rows,
      });
    }

    if (q.includes('maintenance required')) {
      const { rows } = await pool.query(`
        SELECT equipment_id, model, unit, mission_status
        FROM Equipment
        WHERE mission_status IN ('MAINTENANCE REQUIRED', 'NOT MISSION READY')
      `);
      return res.json({
        question,
        answer: rows.length
          ? `Equipment requiring maintenance: ${rows.map(r => r.equipment_id).join(', ')}`
          : 'No equipment currently requires maintenance.',
        data: rows,
      });
    }

    if (q.includes('alert') || q.includes('critical')) {
      const { rows } = await pool.query(`
        SELECT equipment_id, alert_type, severity, message
        FROM Alerts
        WHERE acknowledged = FALSE AND severity IN ('Critical', 'High')
        ORDER BY created_at DESC
        LIMIT 10
      `);
      return res.json({
        question,
        answer: rows.length
          ? `Active critical/high alerts: ${rows.length}`
          : 'No critical or high-severity alerts are active.',
        data: rows,
      });
    }

    // Fallback
    return res.json({
      question,
      answer: 'I can answer questions about readiness, alerts, and maintenance. Try asking "Which vehicles are not mission ready?" or "Show active alerts".',
      data: null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/readiness  — Fleet-wide readiness summary report
// ---------------------------------------------------------------------------
app.get('/api/reports/readiness', async (req, res) => {
  const pool = getPool();
  try {
    const equipmentResult = await pool.query('SELECT * FROM Equipment ORDER BY equipment_id');
    const equipment = equipmentResult.rows;

    const report = await Promise.all(equipment.map(async (eq) => {
      const latestReading = await pool.query(`
        SELECT * FROM SensorReadings
        WHERE equipment_id = $1
        ORDER BY timestamp DESC
        LIMIT 1
      `, [eq.equipment_id]);

      const latestPrediction = await pool.query(`
        SELECT risk_level, failure_probability, remaining_useful_life
        FROM Predictions
        WHERE equipment_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [eq.equipment_id]);

      const pendingTasks = await pool.query(`
        SELECT COUNT(*) AS count FROM MaintenanceTasks
        WHERE equipment_id = $1 AND status = 'Pending'
      `, [eq.equipment_id]);

      const reading    = latestReading.rows[0]    || {};
      const prediction = latestPrediction.rows[0] || null;
      const { score, status, issues } = computeReadiness(reading, eq);

      return {
        equipment_id:         eq.equipment_id,
        equipment_type:       eq.equipment_type,
        model:                eq.model,
        unit:                 eq.unit,
        total_usage_hours:    eq.total_usage_hours,
        last_service_date:    eq.last_service_date,
        readiness_score:      score,
        readiness_status:     status,
        issues,
        ai_risk_level:        prediction?.risk_level          || 'Unknown',
        failure_probability:  prediction?.failure_probability || null,
        remaining_useful_life:prediction?.remaining_useful_life || null,
        pending_tasks:        parseInt(pendingTasks.rows[0].count, 10),
      };
    }));

    // Fleet summary
    const summary = {
      total:               report.length,
      mission_ready:       report.filter(r => r.readiness_status === 'MISSION READY').length,
      ready_with_warning:  report.filter(r => r.readiness_status === 'READY WITH WARNING').length,
      maintenance_required:report.filter(r => r.readiness_status === 'MAINTENANCE REQUIRED').length,
      not_mission_ready:   report.filter(r => r.readiness_status === 'NOT MISSION READY').length,
    };

    res.json({ generated_at: new Date().toISOString(), summary, equipment: report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/predictions/run  — trigger the Python AI engine (Member 2)
// POST /api/predictions/run/fleet  — run predictions for all equipment
// ---------------------------------------------------------------------------

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:5001';

app.post('/api/predictions/run', async (req, res) => {
  const { equipment_id } = req.body;
  if (!equipment_id || typeof equipment_id !== 'string') {
    return res.status(400).json({ error: 'Valid equipment_id (string) is required' });
  }
  try {
    const aiRes = await fetch(`${AI_ENGINE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipment_id }),
    });
    const data = await aiRes.json();
    if (!aiRes.ok) return res.status(aiRes.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(503).json({
      error: 'AI engine unavailable',
      detail: err.message,
      hint: 'Start the Python AI engine: cd src/backend-node && python ai/server.py',
    });
  }
});

app.post('/api/predictions/run/fleet', async (req, res) => {
  try {
    const aiRes = await fetch(`${AI_ENGINE_URL}/predict/fleet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const data = await aiRes.json();
    if (!aiRes.ok) return res.status(aiRes.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(503).json({
      error: 'AI engine unavailable',
      detail: err.message,
      hint: 'Start the Python AI engine: cd src/backend-node && python ai/server.py',
    });
  }
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, async () => {
  console.log(`DefendAI Backend running on http://localhost:${PORT}`);
  try {
    await loadDataset();
  } catch (e) {
    console.error('Failed to load dataset. Ensure PostgreSQL is running and DATABASE_URL is set:', e.message);
  }
});
