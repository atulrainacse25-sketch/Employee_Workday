// React import not required with the new JSX transform
import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Context providers
import {
  AuthProvider,
  TaskProvider,
  AttendanceProvider,
  ProjectProvider,
} from './contexts';

// Critical components (loaded immediately)
import {
  Layout,
  Login,
  Register,
  ForgotPassword,
  ProtectedRoute,
} from './components';

// Lazy loaded components (loaded on demand)
const Dashboard = lazy(() => import('./components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const Reports = lazy(() => import('./components/dashboard/Reports').then(m => ({ default: m.Reports })));
const Projects = lazy(() => import('./components/projects/Projects'));
const TaskList = lazy(() => import('./components/tasks/TaskList').then(m => ({ default: m.TaskList })));
const TaskDetails = lazy(() => import('./components/tasks/TaskDetails'));
const Attendance = lazy(() => import('./components/attendance/Attendance').then(m => ({ default: m.Attendance })));
const Settings = lazy(() => import('./components/settings/Settings'));
const SmartPlanner = lazy(() => import('./pages/SmartPlanner.jsx'));

// Loading component for suspense fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <TaskProvider>
        <ProjectProvider>
          <AttendanceProvider>
          <Router>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Protected Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="tasks" element={<TaskList />} />
                  <Route path="tasks/:id" element={<TaskDetails />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="projects" element={<Projects />} />
                  <Route path="calendar" element={<div className="p-6 text-center text-gray-600">Calendar module coming soon...</div>} />
                  <Route path="reports" element={
                    <ProtectedRoute adminOnly>
                      <Reports />
                    </ProtectedRoute>
                  } />
                  <Route path="smart-planner" element={
                    <ProtectedRoute adminOnly>
                      <SmartPlanner />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="settings" element={<Settings />} />
                  <Route path="profile" element={<div className="p-6 text-center text-gray-600">Profile module coming soon...</div>} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </AttendanceProvider>
        </ProjectProvider>
      </TaskProvider>
    </AuthProvider>
  );
}

export default App;