# Employee Management System

A comprehensive employee management system built with Node.js, Express, PostgreSQL, and React.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL 17
- npm or yarn

### Backend Setup
```bash
cd taskm-backend
npm install
npm start
```

### Frontend Setup
```bash
cd taskm-frontend
npm install
npm run dev
```

## 📁 Project Structure

```
Task-Manager_Project/
├── taskm-backend/          # Backend API (Node.js + Express + PostgreSQL)
│   ├── controllers/        # API controllers
│   ├── entities/          # TypeORM entity definitions
│   ├── routes/            # API routes
│   ├── middlewares/       # Express middlewares
│   ├── migrations/        # Database migrations
│   ├── data-source.js     # TypeORM configuration
│   ├── index.js           # Main server file
│   └── .env              # Environment variables
├── taskm-frontend/         # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   └── ...
│   └── ...
└── README.md              # This file
```

## 🗄️ Database

- **Database**: PostgreSQL 17
- **ORM**: TypeORM
- **Connection**: Local PostgreSQL installation
- **Database Name**: task_management

## 🔧 Environment Variables

Create a `.env` file in the `taskm-backend` directory:

```env
# PostgreSQL Database
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=task_management
PGPORT=5432

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Server
PORT=5000
```

## 🌐 API Endpoints

- **Health Check**: `GET /`
- **Authentication**: `POST /api/auth/login`, `POST /api/auth/register`
- **Tasks**: `GET /api/tasks`, `POST /api/tasks`, etc.
- **Attendance**: `GET /api/attendance`, `POST /api/attendance`, etc.
- **Projects**: `GET /api/projects`, `POST /api/projects`, etc.
- **Users**: `GET /api/users`, `POST /api/users`, etc.

## 🎯 Features

- ✅ User Authentication & Authorization
- ✅ Task Management
- ✅ Attendance Tracking
- ✅ Leave Management
- ✅ Project Management
- ✅ Work From Home (WFH) Requests
- ✅ Reports & Analytics
- ✅ Notifications
- ✅ User Management

## 🚀 Running the Application

1. **Start Backend**:
   ```bash
   cd taskm-backend
   npm start
   ```
   Server will run on: http://localhost:5000

2. **Start Frontend**:
   ```bash
   cd taskm-frontend
   npm run dev
   ```
   Frontend will run on: http://localhost:5173

## 🛠️ Development

### Database Migrations
```bash
cd taskm-backend
npm run migration:generate -- src/migrations/MigrationName
npm run migration:run
```

### TypeORM Commands
```bash
npm run typeorm -- migration:generate
npm run typeorm -- migration:run
npm run typeorm -- migration:revert
```

## 📊 Database Schema

The application includes the following main entities:
- **Users**: Employee information and authentication
- **Tasks**: Task management and assignment
- **Attendance**: Daily attendance tracking
- **Leave**: Leave request management
- **Projects**: Project information and management
- **WFH**: Work from home requests
- **Notifications**: System notifications
- **Holidays**: Holiday calendar

## 🎉 Status

✅ **Backend**: Running with PostgreSQL  
✅ **Database**: Connected and tables created  
✅ **API**: All endpoints available  
✅ **Frontend**: Ready to start  

Your Employee Management System is fully functional and ready to use!
