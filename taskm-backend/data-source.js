require('dotenv').config();
const { DataSource } = require('typeorm');
const path = require('path');

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

// Configure data source
const AppDataSource = new DataSource(
  isProduction
    ? {
        // PRODUCTION: Use Render Postgres
        type: 'postgres',
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT, 10),
        username: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        synchronize: false, // Always use migrations in production
        logging: false,
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
      }
    : {
        // DEVELOPMENT: Use local Postgres (or switch to SQLite if needed)
        type: process.env.DB_TYPE || 'postgres', // 'sqlite' or 'postgres'
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5433,
        username: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'postgres',
        synchronize: true, // Can auto-sync locally
        logging: true,
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
      }
);

module.exports = AppDataSource;
