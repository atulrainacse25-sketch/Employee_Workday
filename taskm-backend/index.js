require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const AppDataSource = require('./data-source');
const startRetentionJob = require('./scripts/retentionJob');

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

// Allowed frontend origin from env
const allowedOrigin = process.env.FRONTEND_ORIGIN;

// CORS configuration
app.use(cors({
    origin: '*', // Temporarily allow all origins for debugging
    credentials: true
}));

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Error occurred:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: AppDataSource.isInitialized ? 'connected' : 'disconnected'
    });
});

// Database initialization
async function initializeTypeORM() {
    try {
        await AppDataSource.initialize();
        console.log('Database initialized.');
        await AppDataSource.runMigrations();

        // Optional columns
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

// Health check
app.get('/', (req, res) => {
    res.send('Task Manager Backend is running');
});

// Optional: make /api root return a message
app.get('/api', (req, res) => {
    res.send('API is running');
});

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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something broke!', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    // Serve frontend static files
    app.use(express.static(path.join(__dirname, '../taskm-frontend/dist')));

    // Handle all other routes - return index.html for client-side routing
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../taskm-frontend/dist/index.html'));
    });
}

// Function to attempt database connection with retries
async function connectWithRetry(maxRetries = 5, delay = 5000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await initializeTypeORM();
            console.log('Database connection established successfully');
            return true;
        } catch (error) {
            console.error(`Database connection attempt ${i + 1} failed:`, error.message);
            if (i < maxRetries - 1) {
                console.log(`Retrying in ${delay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    return false;
}

// Start server with connection retry logic
connectWithRetry().then((connected) => {
    if (!connected) {
        console.error('Failed to connect to database after multiple attempts');
        process.exit(1);
    }

    const server = app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });

    // Add server timeout settings
    server.keepAliveTimeout = 65000; // Slightly higher than the ALB idle timeout
    server.headersTimeout = 66000; // Slightly higher than keepAliveTimeout

    if (process.env.ENABLE_RETENTION_JOB === 'true') {
        const schedule = process.env.RETENTION_SCHEDULE || '0 3 * * *';
        const days = parseInt(process.env.RETENTION_DAYS, 10) || 90;
        const serverUrl = process.env.SERVER_URL || `http://localhost:${port}`;
        startRetentionJob(serverUrl, { schedule, days });
        console.log('Retention job scheduled:', schedule);
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('Received SIGTERM. Performing graceful shutdown...');
        server.close(() => {
            console.log('Server closed. Shutting down...');
            process.exit(0);
        });
    });
});