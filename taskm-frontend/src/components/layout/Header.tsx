import React, { useEffect, useState, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { useAttendance } from '../../contexts/useAttendance';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Clock,
  UserCog,
} from 'lucide-react';
import axios from 'axios';
import Logo from './Logo';

const MobileNavItem: React.FC<{ to: string, icon: React.ElementType, children: React.ReactNode, onClick?: () => void }> = ({ to, icon: Icon, children, onClick }) => (
    <NavLink to={to} onClick={onClick} className={({ isActive }) => `flex items-center gap-4 px-4 py-3 rounded-lg text-base font-medium transition-colors ${isActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>
        <Icon className="w-5 h-5" />
        {children}
    </NavLink>
);

export const Header: React.FC = () => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState<Array<{ id: number; message: string; read: boolean; createdAt: string; data?: any }>>([]);

  const { state: authState, logout } = useAuth();
  const { state: attendanceState } = useAttendance() as any;

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadNotifs = async () => {
      if (!authState.user) return;
      try {
        const res = await axios.get('/api/notifications', { withCredentials: true });
        setNotifs(Array.isArray(res.data) ? res.data : []);
      } catch (_) {}
    };
    loadNotifs();
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [authState.user]);

  const unreadCount = notifs.filter(n => !n.read).length;
  const markAllRead = async () => { try { await axios.post('/api/notifications/read-all', {}, { withCredentials: true }); setNotifs(p => p.map(n => ({ ...n, read: true }))); } catch (_) {} };

  const getStatusInfo = () => {
    switch (attendanceState?.currentStatus) {
      case 'checked-in': return { text: 'Checked In', color: 'bg-green-500/20 text-green-300 border-green-500/30' };
      case 'on-break': return { text: 'On Break', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
      default: return { text: 'Checked Out', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
    }
  };
  const status = getStatusInfo();

  const navLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tasks', icon: CheckSquare, label: 'My Tasks' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/attendance', icon: Clock, label: 'Attendance' },
    { to: '/smart-planner', icon: UserCog, label: 'Smart Planner' },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 w-full h-20 bg-slate-800/80 backdrop-blur-lg border-b border-slate-700/50 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3 lg:hidden">
          <button onClick={() => setShowMobileMenu(true)} className="p-2 text-slate-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1">
          {/* Future search bar can go here */}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className={`hidden sm:flex items-center gap-3 text-sm font-medium p-2 pr-4 rounded-full border ${status.color}`}>
            <div className={`w-2 h-2 rounded-full ${status.color.replace('/20', '').replace('text-green-300', 'bg-green-400').replace('text-orange-300', 'bg-orange-400').replace('text-slate-400', 'bg-slate-500')}`}></div>
            <span>{status.text}</span>
          </div>

          <div ref={notifRef} className="relative">
            <button onClick={() => setShowNotif(s => !s)} className="p-3 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-full relative transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 text-xs flex items-center justify-center bg-red-600 text-white rounded-full border-2 border-slate-800">{unreadCount}</span>}
            </button>
            <AnimatePresence>
              {showNotif && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                  className="absolute top-16 right-0 w-80 bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700"><span className="text-sm font-semibold text-white">Notifications</span><button onClick={markAllRead} className="text-xs text-indigo-400 hover:underline">Mark all read</button></div>
                  <div className="max-h-96 overflow-auto custom-scrollbar">{notifs.length === 0 ? <div className="p-4 text-sm text-slate-400 text-center">No new notifications</div> : notifs.map(n => <div key={n.id} className={`px-4 py-3 text-sm border-b border-slate-700/50 ${!n.read ? 'bg-indigo-500/10' : ''}`}><div className="flex items-start justify-between gap-3"><p className="text-slate-300">{n.message}</p>{!n.read && <span className="shrink-0 w-2.5 h-2.5 mt-1 rounded-full bg-indigo-400"></span>}</div><div className="text-[11px] text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div></div>)}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div ref={userMenuRef} className="relative">
            <button onClick={() => setShowUserMenu(s => !s)} className="flex items-center rounded-full bg-slate-700/50 p-1">
              <img src={authState.user?.avatar || `https://ui-avatars.com/api/?name=${authState.user?.name}&background=475569&color=fff`} alt={authState.user?.name || 'User'} className="w-9 h-9 rounded-full object-cover" />
            </button>
            <AnimatePresence>
              {showUserMenu && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute right-0 mt-3 w-56 bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl">
                  <div className="p-3 border-b border-slate-700"><p className="text-sm font-medium text-white truncate">{authState.user?.name}</p><p className="text-xs text-slate-400 truncate">{authState.user?.email}</p></div>
                  <div className="py-2"><Link to="/profile" className="flex items-center px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50"><User className="w-4 h-4 mr-3 text-indigo-400" /> Profile</Link><Link to="/settings" className="flex items-center px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50"><Settings className="w-4 h-4 mr-3 text-indigo-400" /> Settings</Link><button onClick={logout} className="flex w-full items-center px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50"><LogOut className="w-4 h-4 mr-3 text-indigo-400" /> Sign Out</button></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showMobileMenu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] lg:hidden" onClick={() => setShowMobileMenu(false)}>
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="w-72 h-full bg-slate-900 border-r border-slate-700 p-6 flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <Link to="/dashboard" className="flex items-center gap-3"><Logo size={20} text="Workday Suite" /></Link>
                <button onClick={() => setShowMobileMenu(false)} className="p-2 text-slate-400 hover:text-white"><X /></button>
              </div>
              <nav className="flex flex-col gap-2">
                {navLinks.map(link => <MobileNavItem key={link.to} to={link.to} icon={link.icon} onClick={() => setShowMobileMenu(false)}>{link.label}</MobileNavItem>)}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
