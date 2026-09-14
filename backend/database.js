const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let dbPromise = null;

async function getDB() {
  if (!dbPromise) {
    dbPromise = open({
      filename: path.join(__dirname, 'defend_ai.db'),
      driver: sqlite3.Database
    }).then(async (db) => {
      await initializeSchema(db);
      return db;
    });
  }
  return dbPromise;
}

async function initializeSchema(db) {
  // Equipment Schema
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Equipment (
      equipment_id TEXT PRIMARY KEY,
      equipment_type TEXT,
      model TEXT,
      unit TEXT,
      mission_status TEXT,
      last_service_date TEXT,
      total_usage_hours INTEGER
    )
  `);

  // Sensor Readings Schema
  await db.exec(`
    CREATE TABLE IF NOT EXISTS SensorReadings (
      reading_id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id TEXT,
      temperature REAL,
      vibration REAL,
      pressure REAL,
      battery REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (equipment_id) REFERENCES Equipment(equipment_id)
    )
  `);

  // Maintenance Task Schema
  await db.exec(`
    CREATE TABLE IF NOT EXISTS MaintenanceTasks (
      task_id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id TEXT,
      task_type TEXT,
      priority INTEGER,
      recommended_action TEXT,
      status TEXT DEFAULT 'Pending',
      FOREIGN KEY (equipment_id) REFERENCES Equipment(equipment_id)
    )
  `);
}

module.exports = {
  getDB
};
