require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const AppDataSource = require('./data-source');
const startRetentionJob = require('./scripts/retentionJob');

// Routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const attendanceRoutes = require('./routes/attendance');
const wfhRoutes = require('./routes/wfh');
const notificationRoutes = require('./routes/notification');
const reportRoutes = require('./routes/report');
const projectRoutes = require('./routes/projects');
const userRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');
const aiRoutes = require('./routes/ai');

const app = express();
const port = process.env.PORT || 5000;

// Allowed frontend URLs (local + production)
const allowedOrigins = [
  'http://localhost:5173', // Local development
  'https://taskm3-frontend.vercel.app', // Production (your Vercel frontend)
];

// CORS setup
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow server-to-server or Postman requests

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Initialize database
async function initializeTypeORM() {
  try {
    await AppDataSource.initialize();
    console.log('Database initialized.');
    await AppDataSource.runMigrations();
    console.log('Migrations applied.');

    // Ensure optional columns exist
    await AppDataSource.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE`);
    await AppDataSource.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT`);
    await AppDataSource.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id INTEGER`);
    await AppDataSource.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER`);
    await AppDataSource.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_minutes INTEGER`);
    await AppDataSource.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS substituted_minutes INTEGER`);
    await AppDataSource.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_started_at TIMESTAMP`);

    console.log('Optional columns ensured.');
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    process.exit(1);
  }
}

// Register routes
app.use('/api', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/wfh', wfhRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('Task Manager Backend is running');
});

// Start server
initializeTypeORM().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  // Start retention job if enabled
  if (process.env.ENABLE_RETENTION_JOB === 'true') {
    const schedule = process.env.RETENTION_SCHEDULE || '0 3 * * *';
    const days = parseInt(process.env.RETENTION_DAYS, 10) || 90;
    const serverUrl = process.env.SERVER_URL || `http://localhost:${port}`;
    startRetentionJob(serverUrl, { schedule, days });
    console.log('Retention job scheduled:', schedule);
  }
});
