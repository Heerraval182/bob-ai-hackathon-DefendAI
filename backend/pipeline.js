const fs = require('fs');
const path = require('path');
const { getPool, initializeSchema } = require('./database');

/**
 * Parses a CSV file into an array of objects using the header row as keys.
 */
function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx]; });
    rows.push(row);
  }
  return rows;
}

/**
 * Validates a sensor row from the CSV.
 * Returns true if the row has the minimum required fields.
 */
function isValidRow(row) {
  if (!row.equipment_id || row.equipment_id === '') return false;
  if (isNaN(parseFloat(row.temperature))) return false;
  if (isNaN(parseFloat(row.vibration))) return false;
  return true;
}

/**
 * Derives a simple initial alert from sensor readings so the
 * Alerts table is populated even before the AI engine runs.
 */
function deriveAlert(row) {
  const temp = parseFloat(row.temperature);
  const vib = parseFloat(row.vibration);
  const batt = parseFloat(row.battery);

  if (temp >= 100 || vib >= 1.0) {
    return {
      alert_type: temp >= 100 ? 'High Temperature' : 'High Vibration',
      severity: 'Critical',
      message: `${row.equipment_id} — ${temp >= 100 ? `temperature ${temp}°C exceeds safe threshold` : `vibration ${vib}g exceeds safe threshold`}. Immediate inspection required.`,
    };
  }
  if (batt <= 20) {
    return {
      alert_type: 'Low Battery',
      severity: 'High',
      message: `${row.equipment_id} — battery at ${batt}%. Replace or recharge before next mission.`,
    };
  }
  if (temp >= 85 || vib >= 0.6) {
    return {
      alert_type: temp >= 85 ? 'Elevated Temperature' : 'Elevated Vibration',
      severity: 'Medium',
      message: `${row.equipment_id} — ${temp >= 85 ? `temperature ${temp}°C is elevated` : `vibration ${vib}g is elevated`}. Monitor closely.`,
    };
  }
  return null;
}

/**
 * Derives an initial maintenance task from sensor readings.
 */
function deriveMaintenanceTask(row) {
  const temp = parseFloat(row.temperature);
  const vib = parseFloat(row.vibration);
  const hours = parseInt(row.total_usage_hours, 10);

  if (temp >= 100 || vib >= 1.0) {
    return {
      component_id: vib >= 1.0 ? 'Drivetrain' : 'Cooling System',
      task_type: 'Inspection',
      priority: 'Critical',
      recommended_action: vib >= 1.0
        ? 'Perform full drivetrain inspection; check bearings and mounts.'
        : 'Inspect cooling system, flush coolant, check thermostat.',
      estimated_downtime: 8,
    };
  }
  if (hours >= 2000) {
    return {
      component_id: 'Engine',
      task_type: 'Scheduled Overhaul',
      priority: 'High',
      recommended_action: 'Schedule full engine overhaul — usage hours exceed overhaul interval.',
      estimated_downtime: 48,
    };
  }
  if (temp >= 85 || vib >= 0.6) {
    return {
      component_id: vib >= 0.6 ? 'Drivetrain' : 'Cooling System',
      task_type: 'Preventive Maintenance',
      priority: 'Medium',
      recommended_action: 'Schedule preventive maintenance before next mission deployment.',
      estimated_downtime: 4,
    };
  }
  return null;
}

/**
 * Main pipeline: initialize schema, then seed from CSV.
 * Uses ON CONFLICT DO NOTHING for Equipment rows so the pipeline
 * is idempotent — safe to call on every server start.
 */
async function loadDataset() {
  await initializeSchema();

  const pool = getPool();
  const csvPath = path.join(__dirname, 'equipment_data.csv');

  if (!fs.existsSync(csvPath)) {
    console.warn('equipment_data.csv not found — skipping dataset load.');
    return;
  }

  const rows = parseCsv(csvPath);
  const client = await pool.connect();
  let loaded = 0;
  let skipped = 0;

  try {
    for (const row of rows) {
      // Validation — skip rows that are missing critical fields
      if (!isValidRow(row)) {
        console.warn(`Skipping invalid row: ${JSON.stringify(row)}`);
        skipped++;
        continue;
      }

      const id = row.equipment_id;
      const type = row.equipment_type;
      const model = row.model;
      const unit = row.unit;
      const temp = parseFloat(row.temperature);
      const vib = parseFloat(row.vibration);
      const press = parseFloat(row.pressure);
      const batt = parseFloat(row.battery);
      const hours = parseInt(row.total_usage_hours, 10);
      const lastService = row.last_service_date;
      const missionStatus = row.mission_status;

      // Ingest Equipment Data (ON CONFLICT DO NOTHING for PostgreSQL)
      await client.query(`
        INSERT INTO Equipment (equipment_id, equipment_type, model, unit, last_service_date, total_usage_hours, mission_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (equipment_id) DO NOTHING
      `, [id, type, model, unit, lastService, hours, missionStatus]);

      // Insert sensor reading into the hypertable
      await client.query(`
        INSERT INTO SensorReadings
          (equipment_id, sensor_type, temperature, vibration, pressure, battery)
        VALUES ($1, 'HUMS', $2, $3, $4, $5)
      `, [id, temp, vib, press, batt]);

      // Seed an alert if thresholds are breached
      const alert = deriveAlert(row);
      if (alert) {
        // Avoid duplicate alerts for the same equipment + type on re-run
        const existing = await client.query(
          `SELECT alert_id FROM Alerts WHERE equipment_id = $1 AND alert_type = $2 LIMIT 1`,
          [id, alert.alert_type]
        );
        if (existing.rows.length === 0) {
          await client.query(`
            INSERT INTO Alerts (equipment_id, alert_type, severity, message)
            VALUES ($1, $2, $3, $4)
          `, [id, alert.alert_type, alert.severity, alert.message]);
        }
      }

      // Seed a maintenance task if needed
      const task = deriveMaintenanceTask(row);
      if (task) {
        const existingTask = await client.query(
          `SELECT task_id FROM MaintenanceTasks WHERE equipment_id = $1 AND task_type = $2 AND status = 'Pending' LIMIT 1`,
          [id, task.task_type]
        );
        if (existingTask.rows.length === 0) {
          await client.query(`
            INSERT INTO MaintenanceTasks
              (equipment_id, component_id, task_type, priority, recommended_action, estimated_downtime)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [id, task.component_id, task.task_type, task.priority, task.recommended_action, task.estimated_downtime]);
        }
      }

      loaded++;
    }

    console.log(`Dataset pipeline complete — ${loaded} equipment records loaded, ${skipped} skipped.`);
  } catch (err) {
    console.error('Error in dataset pipeline:', err);
  } finally {
    client.release();
  }
}

module.exports = { loadDataset };
