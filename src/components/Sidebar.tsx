import React from 'react';
import { useApp } from '../context/AppContext';
import { INSTITUTION_NAME } from '../constants';
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  History,
  CalendarClock,
  FileBarChart,
  Settings,
  LogOut,
  Activity,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, mobileOpen, onClose }: SidebarProps) {
  const { currentUser, logout } = useApp();

  const navigationItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['engineer', 'head', 'admin'] },
    { id: 'registry', name: 'Equipment Registry', icon: ClipboardList, roles: ['engineer', 'head', 'admin'] },
    { id: 'logbook', name: 'Work Done Book', icon: BookOpen, roles: ['engineer', 'head', 'admin'] },
    { id: 'history', name: 'Equipment History', icon: History, roles: ['engineer', 'head', 'admin'] },
    { id: 'scheduler', name: 'PM Scheduler', icon: CalendarClock, roles: ['engineer', 'head', 'admin'] },
    { id: 'reports', name: 'Reports Generator', icon: FileBarChart, roles: ['engineer', 'head', 'admin'] },
    { id: 'users', name: 'User Management', icon: UserCheck, roles: ['admin', 'head'] },
    { id: 'settings', name: 'Administration', icon: Settings, roles: ['admin', 'head'] }
  ];

  const filteredNav = navigationItems.filter(item => 
    !currentUser || item.roles.includes(currentUser.role)
  );

  return (
    <>
      {/* Backdrop overlay for mobile screens */}
      {mobileOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden cursor-pointer"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-screen overflow-y-auto z-50 transition-transform duration-300 transform lg:static lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Title logo and hospital tag */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 bg-teal-500/10 rounded-xl border border-teal-500/30 text-teal-400 shrink-0">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-lg text-white leading-tight">BEMMS</h2>
              <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider truncate">{INSTITUTION_NAME}</p>
            </div>
          </div>

          {/* Close button on mobile view */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 px-2.5 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-800 transition text-[11px] font-mono font-bold cursor-pointer"
              aria-label="Close menu"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose?.();
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20 text-teal-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

      {/* Logged in User Section */}
      {currentUser && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-start space-x-3 p-2 bg-slate-950/60 rounded-xl border border-slate-800 mb-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold shrink-0 mt-0.5">
              {currentUser.name ? currentUser.name.charAt(0) : 'E'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-xs text-white truncate">{currentUser.name}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate leading-none">
                {currentUser.designation}
              </div>
              <div className="mt-1.5 inline-flex items-center space-x-1 px-1.5 py-0.5 bg-teal-500/10 border border-teal-500/20 text-[9px] font-mono text-teal-400 uppercase rounded font-bold">
                <UserCheck className="w-2.5 h-2.5 mr-0.5" />
                <span>{currentUser.role}</span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-xs font-semibold font-mono text-rose-400 hover:text-rose-300 bg-rose-500/5 border border-rose-500/15 hover:bg-rose-500/10 rounded-xl transition mb-4"
          >
            <LogOut className="w-4 h-4" />
            <span>Authorized Log Out</span>
          </button>

          {/* V-Tech Creator Sign-off */}
          <div className="pt-3 border-t border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 font-mono">
              Product of{' '}
              <a 
                href="https://www.linkedin.com/in/kuteyi-oluwaloye-vincent/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-teal-400 hover:text-teal-300 font-bold hover:underline transition"
              >
                V-Tech
              </a>
            </p>
            <p className="text-[9px] text-slate-600 font-mono mt-0.5">
              App created and developed by V-Tech
            </p>
          </div>
        </div>
      )}
      </aside>
    </>
  );
}
