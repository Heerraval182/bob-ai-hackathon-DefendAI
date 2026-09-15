require('dotenv').config();
const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    // Falls back to a local postgres URL if not provided in .env
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/defend_ai';
    pool = new Pool({ connectionString });
  }
  return pool;
}

async function initializeSchema() {
  const db = getPool();
  const client = await db.connect();

  try {
    // 1. Enable TimescaleDB Extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;`);

    // 2. Equipment Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS Equipment (
        equipment_id        TEXT PRIMARY KEY,
        equipment_type      TEXT,
        model               TEXT,
        unit                TEXT,
        mission_status      TEXT DEFAULT 'UNKNOWN',
        last_service_date   DATE,
        total_usage_hours   INTEGER DEFAULT 0
      );
    `);

    // 3. Sensor Readings (Time-Series Hypertable)
    await client.query(`
      CREATE TABLE IF NOT EXISTS SensorReadings (
        reading_id    SERIAL,
        equipment_id  TEXT REFERENCES Equipment(equipment_id),
        component_id  TEXT,
        sensor_type   TEXT,
        value         REAL,
        temperature   REAL,
        vibration     REAL,
        pressure      REAL,
        battery       REAL,
        timestamp     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Convert to TimescaleDB hypertable (idempotent)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM timescaledb_information.hypertables
          WHERE hypertable_name = 'sensorreadings'
        ) THEN
          PERFORM create_hypertable('SensorReadings', 'timestamp', if_not_exists => TRUE);
        END IF;
      END $$;
    `);

    // 4. Predictions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS Predictions (
        prediction_id          SERIAL PRIMARY KEY,
        equipment_id           TEXT REFERENCES Equipment(equipment_id),
        component_id           TEXT,
        failure_probability    REAL,
        predicted_failure_date DATE,
        remaining_useful_life  INTEGER,
        confidence_score       REAL,
        risk_level             TEXT,
        explanation            TEXT,
        created_at             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Alerts Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS Alerts (
        alert_id      SERIAL PRIMARY KEY,
        equipment_id  TEXT REFERENCES Equipment(equipment_id),
        alert_type    TEXT,
        severity      TEXT,
        message       TEXT,
        acknowledged  BOOLEAN DEFAULT FALSE,
        created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Maintenance Tasks Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS MaintenanceTasks (
        task_id              SERIAL PRIMARY KEY,
        equipment_id         TEXT REFERENCES Equipment(equipment_id),
        component_id         TEXT,
        task_type            TEXT,
        priority             TEXT DEFAULT 'Medium',
        recommended_action   TEXT,
        estimated_downtime   INTEGER,
        status               TEXT DEFAULT 'Pending',
        created_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Maintenance Feedback Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS MaintenanceFeedback (
        feedback_id    SERIAL PRIMARY KEY,
        task_id        INTEGER REFERENCES MaintenanceTasks(task_id),
        equipment_id   TEXT REFERENCES Equipment(equipment_id),
        outcome        TEXT,
        technician     TEXT,
        notes          TEXT,
        created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database schema initialized (PostgreSQL + TimescaleDB).');
  } catch (err) {
    console.error('Error initializing schema:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getPool, initializeSchema };
