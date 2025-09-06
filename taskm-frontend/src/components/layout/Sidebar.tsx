import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  Settings, 
  BarChart3,
  FileText,
  Clock
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Attendance', href: '/attendance', icon: Clock },
  { name: 'Reports', href: '/reports', icon: BarChart3, adminOnly: true },
  { name: 'Smart Planner', href: '/smart-planner', icon: Users, adminOnly: true },
  { name: 'Projects', href: '/projects', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { state } = useAuth();

  const filteredNavItems = navItems.filter(item => 
    !item.adminOnly || state.user?.role === 'admin'
  );

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 hidden lg:block overflow-y-auto">
      <div className="p-6">
        <Link to="/dashboard" className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">TaskFlow</span>
        </Link>

        <nav className="space-y-2">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};