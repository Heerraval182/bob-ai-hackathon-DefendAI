require('dotenv').config();
const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    // Falls back to a local postgres URL if not provided in .env
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/defend_ai';
    
    pool = new Pool({
      connectionString,
    });
  }
  return pool;
}

async function initializeSchema() {
  const db = getPool();
  const client = await db.connect();

  try {
    // 1. Enable TimescaleDB Extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;`);

    // 2. Equipment Schema (Standard Relational Table)
    await client.query(`
      CREATE TABLE IF NOT EXISTS Equipment (
        equipment_id TEXT PRIMARY KEY,
        equipment_type TEXT,
        model TEXT,
        unit TEXT,
        mission_status TEXT,
        last_service_date DATE,
        total_usage_hours INTEGER
      );
    `);

    // 3. Sensor Readings Schema (Time-Series Table)
    await client.query(`
      CREATE TABLE IF NOT EXISTS SensorReadings (
        equipment_id TEXT,
        temperature REAL,
        vibration REAL,
        pressure REAL,
        battery REAL,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (equipment_id) REFERENCES Equipment(equipment_id)
      );
    `);

    // 4. Convert SensorReadings into a TimescaleDB hypertable
    // (We wrap in a block to ignore errors if it's already a hypertable)
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

    // 5. Maintenance Task Schema (Standard Relational Table)
    await client.query(`
      CREATE TABLE IF NOT EXISTS MaintenanceTasks (
        task_id SERIAL PRIMARY KEY,
        equipment_id TEXT,
        task_type TEXT,
        priority INTEGER,
        recommended_action TEXT,
        status TEXT DEFAULT 'Pending',
        FOREIGN KEY (equipment_id) REFERENCES Equipment(equipment_id)
      );
    `);
    
    console.log("Database schema initialized (PostgreSQL + TimescaleDB).");
  } catch (err) {
    console.error("Error initializing schema:", err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getPool,
  initializeSchema
};
