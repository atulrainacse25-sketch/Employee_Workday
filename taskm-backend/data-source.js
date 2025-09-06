require('dotenv').config();
const { DataSource } = require('typeorm');
const path = require('path');

const UserSchema = require('./entities/User');
const TaskSchema = require('./entities/Task');
const AttendanceSchema = require('./entities/Attendance');
const LeaveSchema = require('./entities/Leave');
const HolidaySchema = require('./entities/Holiday');
const ProjectSchema = require('./entities/Project');
const WFHSchema = require('./entities/WFH');
const NotificationSchema = require('./entities/Notification');
const ProjectMemberSchema = require('./entities/ProjectMember');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5433,
  username: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'postgres',
  synchronize: false, // safer for migrations
  logging: process.env.NODE_ENV === 'development',
  entities: [
    UserSchema,
    TaskSchema,
    AttendanceSchema,
    LeaveSchema,
    HolidaySchema,
    ProjectSchema,
    ProjectMemberSchema,
    WFHSchema,
    NotificationSchema
  ],
  migrations: [path.join(__dirname, 'migrations/*.{ts,js}')],
  subscribers: [],
});

module.exports = AppDataSource;
