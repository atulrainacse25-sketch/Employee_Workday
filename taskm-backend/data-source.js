require('dotenv').config();
const { DataSource } = require('typeorm');
const path = require('path');
const url = require('url');

// Entities
const UserSchema = require('./entities/User');
const TaskSchema = require('./entities/Task');
const AttendanceSchema = require('./entities/Attendance');
const LeaveSchema = require('./entities/Leave');
const HolidaySchema = require('./entities/Holiday');
const ProjectSchema = require('./entities/Project');
const WFHSchema = require('./entities/WFH');
const NotificationSchema = require('./entities/Notification');
const ProjectMemberSchema = require('./entities/ProjectMember');

// Detect environment
const isProduction = process.env.NODE_ENV === 'production';

// Parse DATABASE_URL if available (Render provides it)
let dbConfig = {};

if (isProduction && process.env.DATABASE_URL) {
    dbConfig = {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        synchronize: false,
        logging: true, // Enable logging temporarily for debugging
        entities: [
            UserSchema,
            TaskSchema,
            AttendanceSchema,
            LeaveSchema,
            HolidaySchema,
            ProjectSchema,
            WFHSchema,
            NotificationSchema,
            ProjectMemberSchema
        ],
        migrations: [path.join(__dirname, './migrations/*.js')],
        extra: {
            max: 20,
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            poolSize: 20
        },
        ssl: {
            rejectUnauthorized: false
        },
    };
} else {
    // Development config (local Postgres or SQLite)
    dbConfig = {
        type: process.env.DB_TYPE || 'postgres',
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5433,
        username: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'postgres',
        synchronize: true,
        logging: true,
    };
}

// Create DataSource
const AppDataSource = new DataSource({
    ...dbConfig,
    entities: [
        UserSchema,
        TaskSchema,
        AttendanceSchema,
        LeaveSchema,
        HolidaySchema,
        ProjectSchema,
        ProjectMemberSchema,
        WFHSchema,
        NotificationSchema,
    ],
    migrations: [path.join(__dirname, 'migrations/*.{ts,js}')],
    subscribers: [],
});

module.exports = AppDataSource;