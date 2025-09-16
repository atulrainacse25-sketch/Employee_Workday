import React from 'react';
import { useAuth } from '../../contexts/useAuth';
import { useTasks } from '../../contexts/useTasks';
import { useAttendance } from '../../contexts/useAttendance';
import { MetricsCards } from './MetricsCards';
import { TaskChart } from './TaskChart';
import { RecentTasks } from './RecentTasks';
import { AttendanceCard } from './AttendanceCard';
import { Reports } from './Reports';
import { ProjectContribution } from './ProjectContribution';
// ...existing code (Logo and ProfileCard were removed from this file)

export const Dashboard: React.FC = () => {
  const { state: authState } = useAuth();
  useTasks();
  useAttendance();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Main white content panel */}
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">
              {getGreeting()}, {authState.user?.name}! 👋
            </h1>
            <p className="text-blue-100 text-lg">
              Ready to tackle today's challenges? Let's make it productive!
            </p>
          </div>

          {/* Metrics Cards */}
          <MetricsCards />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Left Column - Charts */}
            <div className="lg:col-span-2 space-y-6">
              <TaskChart />
              <ProjectContribution />
            </div>

            {/* Right Column - Cards */}
            <div className="space-y-6">
              <AttendanceCard />
              <RecentTasks />
            </div>
          </div>

          {/* Admin reports panel */}
          {authState.user?.role === 'admin' && (
            <div className="bg-white rounded-lg p-4 shadow mt-6">
              <Reports />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};