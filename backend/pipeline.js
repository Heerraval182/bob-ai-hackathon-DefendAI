const fs = require('fs');
const path = require('path');
const { getPool, initializeSchema } = require('./database');

async function loadDataset() {
  await initializeSchema();
  
  const pool = getPool();
  const content = fs.readFileSync(path.join(__dirname, 'equipment_data.csv'), 'utf8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const client = await pool.connect();
  
  try {
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) continue;
      
      const id = values[0];
      const temp = parseFloat(values[1]);
      const vib = parseFloat(values[2]);
      const press = parseFloat(values[3]);
      const batt = parseFloat(values[4]);
      const hours = parseInt(values[5]);
      const lastService = values[6];

      // Ingest Equipment Data (ON CONFLICT DO NOTHING for PostgreSQL)
      await client.query(`
        INSERT INTO Equipment (equipment_id, equipment_type, model, last_service_date, total_usage_hours, mission_status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (equipment_id) DO NOTHING
      `, [id, id.startsWith('A') ? 'Aircraft' : 'Vehicle', id, lastService, hours, 'UNKNOWN']);

      // Ingest Sensor Readings into the Hypertable
      await client.query(`
        INSERT INTO SensorReadings (equipment_id, temperature, vibration, pressure, battery)
        VALUES ($1, $2, $3, $4, $5)
      `, [id, temp, vib, press, batt]);
    }
    console.log('Sample dataset pipeline completed successfully.');
  } catch (err) {
    console.error('Error in pipeline:', err);
  } finally {
    client.release();
  }
}

module.exports = {
  loadDataset
};
