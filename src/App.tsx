/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import EquipmentRegistryView from './components/EquipmentRegistryView';
import WorkDoneBookView from './components/WorkDoneBookView';
import EquipmentHistoryView from './components/EquipmentHistoryView';
import SchedulerView from './components/SchedulerView';
import ReportsView from './components/ReportsView';
import AdministrationView from './components/AdministrationView';
import UserManagementView from './components/UserManagementView';
import { Activity, Shield, Clock, Download, Smartphone } from 'lucide-react';
import { INSTITUTION_NAME, INSTITUTION_SHORT_NAME } from './constants';

/** UTC clock shown in the operational ribbon, ticking once a minute. */
function useUtcTimestamp() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return `${now.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function BiomedicalAppContent() {
  const { currentUser, loading } = useApp();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const utcTimestamp = useUtcTimestamp();

  // Monitor standalone display state and register PWA install prompt handler
  useEffect(() => {
    // Check if loaded in standalone display-mode
    if (typeof window !== 'undefined') {
      const matchStandalone = window.matchMedia('(display-mode: standalone)').matches;
      setIsStandalone(matchStandalone);

      const handleBeforeInstallPrompt = (e: Event) => {
        // Prevent default browser install banner banner
        e.preventDefault();
        // Stash the event so we can trigger it on demand
        setDeferredPrompt(e);
      };

      const handleAppInstalled = () => {
        console.log('[BEMMS] Application was successfully installed on local target.');
        setDeferredPrompt(null);
        setIsStandalone(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const handleInstallAppClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Installation prompt selection outcome: ${outcome}`);
    setDeferredPrompt(null);
  };

  // Load a sleek heartbeat loader when initializing values
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <div className="text-center space-y-4">
          <div className="p-4 bg-teal-500/10 rounded-2xl border border-teal-500/30 text-teal-400 inline-block animate-pulse">
            <Activity className="w-10 h-10" />
          </div>
          <h2 className="text-sm font-mono tracking-widest text-slate-400 uppercase">
            BEMMS • VERIFYING SECURE STORAGE CHANNELS
          </h2>
          <div className="w-48 h-1 bg-slate-900 mx-auto rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full w-2/3 animate-[pulse_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  // Auth gate
  if (!currentUser) {
    return <AuthPage />;
  }

  // Render sub-views dynamically based on sidebar state
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'registry':
        return <EquipmentRegistryView />;
      case 'logbook':
        return <WorkDoneBookView />;
      case 'history':
        return <EquipmentHistoryView />;
      case 'scheduler':
        return <SchedulerView />;
      case 'reports':
        return <ReportsView />;
      case 'users':
        return <UserManagementView />;
      case 'settings':
        return <AdministrationView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden relative">
      
      {/* Sidebar Controls (Left Side) */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        mobileOpen={mobileSidebarOpen} 
        onClose={() => setMobileSidebarOpen(false)} 
      />

      {/* Main Board Viewport (Right Side) */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Top Operational Ribbon */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sm:px-8 shrink-0 relative">
          <div className="flex items-center space-x-3 text-xs font-mono min-w-0">
            {/* Hamburger Button on Mobile */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-800 text-slate-300 hover:text-white transition shrink-0 cursor-pointer flex items-center justify-center mr-1"
              style={{ minHeight: '40px', minWidth: '40px' }}
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <span className="hidden sm:inline text-slate-400">INSTITUTION:</span>
            <span className="hidden sm:inline text-white font-bold bg-slate-950 px-2 py-1 rounded border border-slate-800 truncate max-w-[170px] md:max-w-xs uppercase">
              {INSTITUTION_NAME}
            </span>

            {/* Mobile Tag */}
            <span className="sm:hidden font-mono text-[10px] font-bold text-white bg-slate-950 px-2 py-1 rounded border border-slate-800 uppercase">
              {INSTITUTION_SHORT_NAME}
            </span>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
            {/* Custom Interactive PWA download action */}
            {deferredPrompt && (
              <button
                id="pwa-header-install-btn"
                onClick={handleInstallAppClick}
                className="px-2 sm:px-3 py-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider font-mono rounded cursor-pointer shadow-md shadow-teal-950/20 flex items-center space-x-1 sm:space-x-1.5 transition-all animate-bounce shrink-0"
                title="Download BEMMS App to your home-screen"
              >
                <Download className="w-3 sm:w-3.5 h-3 sm:h-3.5 stroke-[3]" />
                <span className="hidden xs:inline">INSTALL</span>
              </button>
            )}

            {/* Standalone Display Mode active indicator badge */}
            {isStandalone && (
              <div
                id="pwa-standalone-badge"
                className="px-2 py-1 bg-teal-500/10 border border-teal-500/30 text-[9px] font-mono rounded text-teal-400 flex items-center space-x-1 shrink-0"
                title="BEMMS Desktop App Environment connected"
              >
                <Smartphone className="w-3 h-3" />
                <span className="hidden sm:inline">APP ACTIVE</span>
              </div>
            )}

            {/* Live UTC context indicators */}
            <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-slate-400">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>{utcTimestamp}</span>
            </div>

            <div className="px-2.5 py-1 bg-teal-500/10 border border-teal-500/20 text-[9px] sm:text-[10px] uppercase font-bold font-mono tracking-wider rounded text-teal-400 flex items-center space-x-1 shrink-0">
              <Shield className="w-3 h-3" />
              <span className="hidden xs:inline">ISO 13485 CERTIFIED</span>
              <span className="xs:hidden">ISO 13485</span>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Component viewport scroll container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/40">
          {renderActiveView()}
        </main>
        
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BiomedicalAppContent />
    </AppProvider>
  );
}
