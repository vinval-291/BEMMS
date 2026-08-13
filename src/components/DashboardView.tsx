import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  TrendingUp,
  MapPin,
  Sliders,
  Award,
  Bell,
  BellOff,
  CheckCheck
} from 'lucide-react';

export default function DashboardView() {
  const { equipment, jobs, schedules, notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const unreadNotifications = notifications.filter(n => !n.read);

  // Dynamic calculations from context
  const totalEquipCount = equipment.length;
  const activeEquipCount = equipment.filter(e => e.status === 'Active').length;
  const underRepairCount = equipment.filter(e => e.status === 'Under Repair').length;
  const completedJobsCount = jobs.filter(j => j.jobStatus === 'Completed').length;
  const pendingJobsCount = jobs.filter(j => j.jobStatus === 'Pending' || j.jobStatus === 'In Progress').length;
  const pmDueCount = schedules.filter(s => s.status === 'pending' || s.status === 'overdue').length;

  // Repartition calculations for interactive clinical widgets
  // 1. Repairs by Ward
  const wardFrequencies = jobs.reduce((acc: { [key: string]: number }, job) => {
    acc[job.ward] = (acc[job.ward] || 0) + 1;
    return acc;
  }, {});

  const wardStatList = Object.entries(wardFrequencies)
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 2. Repairs by Equipment type
  const categoryFrequencies = jobs.reduce((acc: { [key: string]: number }, job) => {
    acc[job.equipmentName.split(' ')[0]] = (acc[job.equipmentName.split(' ')[0]] || 0) + 1;
    return acc;
  }, {});

  const typeStatList = Object.entries(categoryFrequencies)
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // 3. Month Repair activity indicators
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyMetrics = months.map((month) => {
    const matchingJobs = jobs.filter(j => {
      const parts = j.date.split('-');
      const mIdx = parts[1] ? parseInt(parts[1], 10) - 1 : -1;
      return mIdx >= 0 && months[mIdx] === month;
    });
    return { name: month, count: matchingJobs.length };
  });

  // Calculate highest monthly count for SVG scaling
  const maxRepairs = Math.max(...monthlyMetrics.map(m => m.count), 1);

  // 4. Frequent Fault Analysis keywords
  const allFaultsString = jobs.map(j => j.faultReported).join(' ');
  const keywords = ['sensor', 'power', 'calibration', 'flicker', 'battery', 'flow', 'alarm', 'pressure'];
  const faultKeywordsMatched = keywords
    .map(kw => {
      const rx = new RegExp(kw, 'gi');
      const matches = allFaultsString.match(rx);
      return { name: kw.charAt(0).toUpperCase() + kw.slice(1), count: matches ? matches.length : 0 };
    })
    // Only report terms that actually occur in the logged fault descriptions.
    .filter(k => k.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      
      {/* Banner info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Biomedical Operations Clinical Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time status indexes, preventive maintenance compliance compliance monitoring, and medical assets statistics.
          </p>
        </div>
        <div className="mt-3 md:mt-0 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center space-x-2 text-xs font-mono text-teal-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>SYSTEM CONNECTED • SECURE LOCAL TIME STORAGE</span>
        </div>
      </div>

      {/* Assignments addressed to the signed-in engineer */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            <span className="relative">
              <Bell className="w-4 h-4 text-teal-400" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </span>
            <span>My Assignments</span>
            {unreadNotifications.length > 0 && (
              <span className="text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded-full">
                {unreadNotifications.length} NEW
              </span>
            )}
          </h3>

          {unreadNotifications.length > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="text-[10px] font-mono uppercase tracking-wider text-slate-400 hover:text-teal-400 transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-800/70 max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs font-mono flex flex-col items-center gap-2">
              <BellOff className="w-5 h-5 text-slate-600" />
              <span>No assignments yet. Maintenance assigned to you appears here.</span>
            </div>
          ) : (
            notifications.slice(0, 12).map((n) => (
              <div
                key={n.id}
                className={`p-4 flex items-start gap-3 transition ${n.read ? 'opacity-60' : 'bg-teal-500/[0.04]'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-slate-700' : 'bg-teal-400'}`} />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white">{n.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                    {n.createdByName ? ` • assigned by ${n.createdByName}` : ''}
                  </p>
                </div>

                {!n.read && (
                  <button
                    type="button"
                    onClick={() => markNotificationRead(n.id)}
                    className="text-[10px] font-mono uppercase text-slate-500 hover:text-teal-400 transition shrink-0 cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Summary Score Tracker Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        
        {/* Total Assets */}
        <div id="stat-total-equip" className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Total Equipment</p>
            <p className="text-2xl font-bold text-white mt-1">{totalEquipCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
        </div>

        {/* Active Assets */}
        <div id="stat-active-equip" className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Active Device</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{activeEquipCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Under Repair */}
        <div id="stat-repair-equip" className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-rose-400 uppercase tracking-wider">In Repair</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{underRepairCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Completed Jobs */}
        <div id="stat-completed-jobs" className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Completed Jobs</p>
            <p className="text-2xl font-bold text-white mt-1">{completedJobsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Jobs */}
        <div id="stat-pending-jobs" className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-amber-400 uppercase tracking-wider">Pending Jobs</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">{pendingJobsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* PM Due Alert */}
        <div id="stat-pm-due" className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-purple-400 uppercase tracking-wider">PM Due</p>
            <p className="text-2xl font-bold text-purple-400 mt-1">{pmDueCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart Primary: Repairs by Month (12-month Trend Line graph) */}
        <div className="lg:col-span-8 bg-slate-900/50 rounded-xl border border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-white text-sm flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-teal-400" />
                  <span>Maintenance and Servicing Waveform (Monthly Volume)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Continuous activity logging across corrective &amp; calibration cycles.</p>
              </div>
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-2 py-1 rounded">
                Logged in 2026
              </span>
            </div>

            {/* Premium Interactive SVG Area Graph */}
            <div className="w-full h-56 mt-4 relative">
              <svg className="w-full h-full" viewBox="0 0 1000 220" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guide Lines */}
                <line x1="0" y1="40" x2="1000" y2="40" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="0" y1="100" x2="1000" y2="100" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="0" y1="160" x2="1000" y2="160" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="0" y1="210" x2="1000" y2="210" stroke="#475569" strokeWidth="1" />

                {/* Fill area chart */}
                <path
                  d={`
                    M 0 210
                    ${monthlyMetrics.map((m, idx) => {
                      const x = (idx / 11) * 1000;
                      // Max count maps to pixel height 40, 0 maps to 210
                      const val = maxRepairs > 0 ? m.count : 0;
                      const y = 210 - (val / maxRepairs) * 160;
                      return `L ${x} ${y}`;
                    }).join(' ')}
                    L 1000 210 Z
                  `}
                  fill="url(#glowGrad)"
                />

                {/* Draw Glowing spline curves */}
                <path
                  d={monthlyMetrics.map((m, idx) => {
                    const x = (idx / 11) * 1000;
                    const val = maxRepairs > 0 ? m.count : 0;
                    const y = 210 - (val / maxRepairs) * 160;
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Plot interactive nodes */}
                {monthlyMetrics.map((m, idx) => {
                  const x = (idx / 11) * 1000;
                  const val = maxRepairs > 0 ? m.count : 0;
                  const y = 210 - (val / maxRepairs) * 160;
                  return (
                    <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)}>
                      <circle
                        cx={x}
                        cy={y}
                        r={hoveredIndex === idx ? 8 : 5}
                        fill="#0f172a"
                        stroke={hoveredIndex === idx ? "#34d399" : "#14b8a6"}
                        strokeWidth="3.5"
                        className="transition-all duration-150"
                      />
                      {hoveredIndex === idx && (
                        <g>
                          <rect x={x - 40} y={y - 35} width="80" height="25" rx="5" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                          <text x={x} y={y - 18} fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                            {m.count} logs
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Labels under months */}
            <div className="flex justify-between px-1 text-[10px] font-mono text-slate-500 mt-2">
              {monthlyMetrics.map((m, idx) => (
                <span key={idx} className={hoveredIndex === idx ? 'text-teal-400 font-bold' : ''}>
                  {m.name}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800/60">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400">Average Turnaround Intraday</span>
              <p className="text-lg font-bold text-teal-400 font-mono mt-0.5">3.5 Hours</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400">Total System Energy calibration tests</span>
              <p className="text-lg font-bold text-white font-mono mt-0.5">146 calibration events</p>
            </div>
          </div>
        </div>

        {/* Repair stats by Ward (ICU vs ER focus) */}
        <div className="lg:col-span-4 bg-slate-900/50 rounded-xl border border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-white text-sm flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Incidents by Hospital Ward</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Busiest technical response quadrants</p>

            <div className="space-y-4 mt-6">
              {wardStatList.length > 0 ? (
                wardStatList.map((w, index) => {
                  const maxPercent = wardStatList[0].count;
                  const ratio = maxPercent > 0 ? (w.count / maxPercent) * 100 : 0;
                  return (
                    <div key={index} id={`ward-bar-${index}`} className="group">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-slate-300 group-hover:text-white truncate pr-4">{w.name}</span>
                        <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                          {w.count} repairs
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${ratio}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 text-xs text-center py-6">No jobs registered for wards.</div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/60 bg-emerald-950/10 p-4 rounded-xl border border-emerald-500/10 text-[11.5px] text-emerald-300 leading-relaxed flex items-start space-x-2">
            <span className="p-1 rounded bg-emerald-500/15 text-emerald-400 font-bold text-[10px] font-mono uppercase mt-0.5 shrink-0">ICU Focal</span>
            <span>Critical ward alert rules: Intensive Care Unit accounts for peak corrective workload logs.</span>
          </div>
        </div>

      </div>

      {/* Equipment Types and Fault Keyword cloud diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Device Categories */}
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <h3 className="font-semibold text-white text-sm flex items-center space-x-2 mb-4">
            <Activity className="w-4 h-4 text-pink-400" />
            <span>Problem Distribution by Medical Category</span>
          </h3>
          <div className="space-y-3.5">
            {typeStatList.length > 0 ? (
              typeStatList.map((t, index) => {
                const totalCountSum = typeStatList.reduce((acc, curr) => acc + curr.count, 0);
                const percent = totalCountSum > 0 ? Math.round((t.count / totalCountSum) * 100) : 0;
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-pink-500/25 transition">
                    <div className="flex items-center space-x-3">
                      <div className="font-mono text-xs text-slate-500 font-bold bg-slate-900 w-6 h-6 rounded-full flex items-center justify-center border border-slate-800">
                        {index + 1}
                      </div>
                      <span className="text-xs text-white uppercase tracking-wider font-semibold">{t.name} Hardware</span>
                    </div>
                    <div className="flex items-center space-x-3 text-right">
                      <span className="text-xs font-mono text-slate-400">{t.count} service logs</span>
                      <span className="text-xs bg-pink-500/10 text-pink-400 font-mono font-bold px-2 py-0.5 rounded border border-pink-500/20">
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-slate-500 text-xs text-center py-6">No specific category metrics logged.</div>
            )}
          </div>
        </div>

        {/* Fault Analysis Diagnostic Hotspot */}
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <h3 className="font-semibold text-white text-sm flex items-center space-x-2 mb-4">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>Frequent Diagnostic Keyword Hotspots</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Automatic text-scanning for recurring keywords flagged in the Work Done books.
          </p>

          <div className="flex flex-wrap gap-2">
            {faultKeywordsMatched.length === 0 && (
              <p className="text-xs font-mono text-slate-500">
                No recurring keywords yet — they appear once faults are logged in the Work Done Book.
              </p>
            )}
            {faultKeywordsMatched.map((k, index) => {
              const bgTones = [
                'bg-rose-500/10 text-rose-400 border-rose-500/20',
                'bg-amber-500/10 text-amber-400 border-amber-500/20',
                'bg-teal-500/10 text-teal-400 border-teal-500/20',
                'bg-violet-500/10 text-violet-400 border-violet-500/20',
                'bg-blue-500/10 text-blue-400 border-blue-500/20'
              ];
              const styleTone = bgTones[index % bgTones.length];
              return (
                <div key={index} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${styleTone}`}>
                  <span className="font-semibold">{k.name}</span>
                  <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-bold">{k.count}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/25 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 leading-none">Primary Advisory</span>
                <p className="text-xs text-white font-medium mt-0.5">Prioritize Oxygen Sensor replacements quarterly.</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-yellow-400 font-semibold uppercase shrink-0">High Priority</span>
          </div>

        </div>

      </div>

    </div>
  );
}
