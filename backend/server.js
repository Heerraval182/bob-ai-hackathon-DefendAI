const express = require('express');
const cors = require('cors');
const { getPool } = require('./database');
const { loadDataset } = require('./pipeline');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Ingestion API with Validation
app.post('/api/sensors/data', async (req, res) => {
  const { equipment_id, temperature, vibration, pressure, battery } = req.body;
  
  // Basic validation (preprocessing step)
  if (!equipment_id || typeof equipment_id !== 'string') {
    return res.status(400).json({ error: 'Valid equipment_id is required' });
  }
  if (typeof temperature !== 'number' || typeof vibration !== 'number') {
    return res.status(400).json({ error: 'Temperature and vibration must be numbers' });
  }

  const pool = getPool();
  
  try {
    await pool.query(`
      INSERT INTO SensorReadings (equipment_id, temperature, vibration, pressure, battery)
      VALUES ($1, $2, $3, $4, $5)
    `, [equipment_id, temperature, vibration, pressure || 0, battery || 100]);
    
    res.status(201).json({ message: 'Sensor data ingested successfully into TimescaleDB' });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Equipment Endpoints
app.get('/api/equipment', async (req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query('SELECT * FROM Equipment');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/equipment/:id', async (req, res) => {
  const pool = getPool();
  try {
    const eqResult = await pool.query('SELECT * FROM Equipment WHERE equipment_id = $1', [req.params.id]);
    if (eqResult.rows.length === 0) return res.status(404).json({ error: 'Equipment not found' });
    
    // Leverage TimescaleDB hypertable ordering by timestamp
    const readingsResult = await pool.query('SELECT * FROM SensorReadings WHERE equipment_id = $1 ORDER BY timestamp DESC LIMIT 5', [req.params.id]);
    
    res.json({ ...eqResult.rows[0], recent_readings: readingsResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Maintenance Endpoints
app.get('/api/maintenance/tasks', async (req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query('SELECT * FROM MaintenanceTasks ORDER BY priority ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/maintenance/tasks', async (req, res) => {
  const { equipment_id, task_type, priority, recommended_action } = req.body;
  const pool = getPool();
  
  try {
    await pool.query(`
      INSERT INTO MaintenanceTasks (equipment_id, task_type, priority, recommended_action)
      VALUES ($1, $2, $3, $4)
    `, [equipment_id, task_type, priority, recommended_action]);
    
    res.status(201).json({ message: 'Maintenance task created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server and initialize pipeline
app.listen(PORT, async () => {
  console.log(`Member 1 Backend running on http://localhost:${PORT}`);
  try {
    // If DATABASE_URL is not configured properly, this will fail immediately, warning the user.
    await loadDataset(); 
  } catch(e) {
    console.error("Failed to load dataset. Please ensure PostgreSQL is running and DATABASE_URL is set:", e.message);
  }
});
