// React import not required with the new JSX transform
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TaskProvider } from './contexts/TaskContext';
import { AttendanceProvider } from './contexts/AttendanceContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { Layout } from './components/layout/Layout';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { Dashboard } from './components/dashboard/Dashboard';
import { Reports } from './components/dashboard/Reports';
import Projects from './components/projects/Projects';
import { TaskList } from './components/tasks/TaskList';
import TaskDetails from './components/tasks/TaskDetails.tsx';
import { Attendance } from './components/attendance/Attendance';
import { ProtectedRoute } from './components/ProtectedRoute';
import Settings from './components/settings/Settings';
import SmartPlanner from './pages/SmartPlanner.jsx';

function App() {
  return (
    <AuthProvider>
      <TaskProvider>
        <ProjectProvider>
          <AttendanceProvider>
          <Router>
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
          </Router>
        </AttendanceProvider>
        </ProjectProvider>
      </TaskProvider>
    </AuthProvider>
  );
}

export default App;