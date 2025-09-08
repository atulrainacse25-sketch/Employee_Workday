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
  const params = url.parse(process.env.DATABASE_URL);
  const [username, password] = params.auth.split(':');

  dbConfig = {
    type: 'postgres',
    host: params.hostname,
    port: parseInt(params.port, 10),
    username,
    password,
    database: params.path.split('/')[1],
    synchronize: false, // use migrations in production
    logging: false,
    ssl: {
      rejectUnauthorized: false, // required for Render Postgres
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
