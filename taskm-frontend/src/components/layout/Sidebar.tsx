import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Briefcase,
    LayoutDashboard, 
    CheckSquare, 
    FolderKanban,
    Clock,
    UserCog,
    BarChart3,
    Settings,
    LogOut
} from 'lucide-react';
import { ElementType, ReactNode } from 'react';

interface NavItemProps {
  to: string;
  icon: ElementType;
  children: ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, children }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex items-center gap-4 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 relative ${
            isActive
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`
        }
    >
        {({ isActive }) => (
            <>
                <AnimatePresence>
                {isActive && (
                    <motion.div
                        layoutId="active-nav-indicator"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400 rounded-r-full"
                    />
                )}
                </AnimatePresence>
                <Icon className="w-5 h-5" />
                <span>{children}</span>
            </>
        )}
    </NavLink>
);

export const Sidebar: React.FC = () => {
  const { state, logout } = useAuth();

  const navLinks = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/tasks", icon: CheckSquare, label: "My Tasks" },
    { to: "/projects", icon: FolderKanban, label: "Projects" },
    { to: "/attendance", icon: Clock, label: "Attendance" },
    { to: "/smart-planner", icon: UserCog, label: "Smart Planner" },
    { to: "/reports", icon: BarChart3, label: "Reports", adminOnly: true },
  ];
  
  const filteredNavItems = navLinks.filter(item => 
    !item.adminOnly || state.user?.role === 'admin'
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/80 backdrop-blur-xl border-r border-white/20 hidden lg:flex flex-col p-6">
        <div className="flex items-center gap-3 mb-10">
            <div className="p-2 bg-white/10 rounded-lg"><Briefcase className="w-7 h-7 text-white" /></div>
            <h1 className="text-xl font-bold text-white tracking-wider">Employee Workday</h1>
        </div>
        
        <nav className="flex-1 flex flex-col gap-2">
            {filteredNavItems.map(link => (
                <NavItem key={link.to} to={link.to} icon={link.icon}>
                    {link.label}
                </NavItem>
            ))}
        </nav>

        <div className="mt-auto">
            <div className="border-t border-white/20 pt-4">
                <NavItem to="/settings" icon={Settings}>
                    Settings
                </NavItem>
                <button 
                    onClick={logout}
                    className="flex items-center gap-4 px-4 py-3 rounded-lg text-base font-medium w-full text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    </aside>
  );
};
