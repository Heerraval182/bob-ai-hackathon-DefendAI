const express = require('express');
const cors = require('cors');
const { getDB } = require('./database');
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

  const db = await getDB();
  
  try {
    await db.run(`
      INSERT INTO SensorReadings (equipment_id, temperature, vibration, pressure, battery)
      VALUES (?, ?, ?, ?, ?)
    `, [equipment_id, temperature, vibration, pressure || 0, battery || 100]);
    
    res.status(201).json({ message: 'Sensor data ingested successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Equipment Endpoints
app.get('/api/equipment', async (req, res) => {
  const db = await getDB();
  const equipment = await db.all('SELECT * FROM Equipment');
  res.json(equipment);
});

app.get('/api/equipment/:id', async (req, res) => {
  const db = await getDB();
  const eq = await db.get('SELECT * FROM Equipment WHERE equipment_id = ?', [req.params.id]);
  if (!eq) return res.status(404).json({ error: 'Equipment not found' });
  
  const readings = await db.all('SELECT * FROM SensorReadings WHERE equipment_id = ? ORDER BY timestamp DESC LIMIT 5', [req.params.id]);
  res.json({ ...eq, recent_readings: readings });
});

// Maintenance Endpoints
app.get('/api/maintenance/tasks', async (req, res) => {
  const db = await getDB();
  const tasks = await db.all('SELECT * FROM MaintenanceTasks ORDER BY priority ASC');
  res.json(tasks);
});

app.post('/api/maintenance/tasks', async (req, res) => {
  const { equipment_id, task_type, priority, recommended_action } = req.body;
  const db = await getDB();
  
  await db.run(`
    INSERT INTO MaintenanceTasks (equipment_id, task_type, priority, recommended_action)
    VALUES (?, ?, ?, ?)
  `, [equipment_id, task_type, priority, recommended_action]);
  
  res.status(201).json({ message: 'Maintenance task created' });
});

// Start server and initialize pipeline
app.listen(PORT, async () => {
  console.log(`Member 1 Backend running on http://localhost:${PORT}`);
  await loadDataset(); // Auto-load CSV dataset on startup
});
