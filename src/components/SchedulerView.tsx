import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Schedule, ScheduleFrequency } from '../types';
import {
  CalendarClock,
  Plus,
  AlertOctagon,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Sliders,
  Layers
} from 'lucide-react';

export default function SchedulerView() {
  const { equipment, schedules, addSchedule, updateScheduleStatus } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);

  // Form parameters
  const [selectedEquipId, setSelectedEquipId] = useState('');
  const [nextDate, setNextDate] = useState('2026-06-15');
  const [frequency, setFrequency] = useState<ScheduleFrequency>('quarterly');
  const [assignedEngineerName, setAssignedEngineerName] = useState('Engr. Sarah Adams');

  // Hardcoded active reference date matching current container context: "2026-06-11"
  const TODAY_STR = '2026-06-11';

  // Compute alerts dynamically from active, unfinished schedules
  const activeSchedules = schedules.filter(s => s.status !== 'completed');

  // 1. Overdue: date < today
  const overdueSchedules = activeSchedules.filter(s => s.nextMaintenanceDate < TODAY_STR);

  // 2. Due Today: date === today
  const dueTodaySchedules = activeSchedules.filter(s => s.nextMaintenanceDate === TODAY_STR);

  // 3. Due This Week: date > today && date <= 7 days after today (2026-06-18)
  const dueThisWeekSchedules = activeSchedules.filter(s => 
    s.nextMaintenanceDate > TODAY_STR && s.nextMaintenanceDate <= '2026-06-18'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEquipId) {
      alert('Please select valid target equipment for PM calibration.');
      return;
    }

    const linkedEquip = equipment.find(eq => eq.id === selectedEquipId);
    if (!linkedEquip) return;

    const isOverdue = nextDate < TODAY_STR;

    try {
      const newSchId = await addSchedule({
        equipmentId: linkedEquip.id,
        equipmentName: linkedEquip.name,
        nextMaintenanceDate: nextDate,
        frequency,
        assignedEngineerId: assignedEngineerName.toLowerCase().replace(/\s/g, ''),
        assignedEngineerName,
        status: isOverdue ? 'overdue' : 'pending'
      });

      setSelectedEquipId('');
      setShowAddForm(false);
      alert(`Preventive maintenance sequence ${newSchId} cataloged in the scheduler.`);
    } catch (err: any) {
      console.error('Schedule creation failed:', err);
      alert(`Could not create this schedule: ${err?.message || err}`);
    }
  };

  const handleMarkAsComplete = async (sch: Schedule) => {
    await updateScheduleStatus(sch.id, 'completed');
    alert(`Schedule PM sequence ${sch.id} marked as COMPLETED. Service report logged.`);
  };

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Preventive Maintenance (PM) Scheduler</h1>
          <p className="text-xs text-slate-400 mt-1">
            Enforce scheduled device safety audits, calibrations, and periodic test intervals to reduce clinical downtime.
          </p>
        </div>

        <button
          id="cmd-schedule-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Plan PM Audit</span>
        </button>
      </div>

      {/* Compliance Alarm Board (Due Today, Due This Week, Overdue Widgets) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Overdue Alarms */}
        <div className="bg-rose-500/5 border border-rose-500/15 p-5 rounded-2xl space-y-3">
          <div className="flex items-center space-x-2.5 text-rose-400">
            <AlertOctagon className="w-5 h-5 shrink-0 animate-bounce" />
            <span className="text-xs font-semibold font-mono tracking-wider uppercase">OVERDUE SERVICE LIMITS</span>
          </div>
          <p className="text-2xl font-black text-rose-400 font-mono leading-none">{overdueSchedules.length}</p>
          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {overdueSchedules.map(sch => (
              <div key={sch.id} className="text-[11px] bg-rose-500/10 p-2 rounded border border-rose-500/20 text-rose-200">
                <span className="font-bold underline">{sch.equipmentId}</span>: Delayed since {sch.nextMaintenanceDate}
              </div>
            ))}
            {overdueSchedules.length === 0 && (
              <p className="text-slate-500 text-[11px] font-mono">0 safety systems running delayed intervals.</p>
            )}
          </div>
        </div>

        {/* Due Today */}
        <div className="bg-amber-500/5 border border-amber-500/15 p-5 rounded-2xl space-y-3">
          <div className="flex items-center space-x-2.5 text-amber-500">
            <Clock className="w-5 h-5 shrink-0" />
            <span className="text-xs font-semibold font-mono tracking-wider uppercase">DUE FOR CALIBRATION TODAY</span>
          </div>
          <p className="text-2xl font-black text-amber-500 font-mono leading-none">{dueTodaySchedules.length}</p>
          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {dueTodaySchedules.map(sch => (
              <div key={sch.id} className="text-[11px] bg-amber-500/10 p-2 rounded border border-amber-500/20 text-yellow-100 font-medium">
                <span className="font-bold">{sch.equipmentId}</span> - Inspect today!
              </div>
            ))}
            {dueTodaySchedules.length === 0 && (
              <p className="text-slate-500 text-[11px] font-mono">No PM actions targeted for today.</p>
            )}
          </div>
        </div>

        {/* Due This Week */}
        <div className="bg-teal-500/5 border border-teal-500/15 p-5 rounded-2xl space-y-3">
          <div className="flex items-center space-x-2.5 text-teal-400">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="text-xs font-semibold font-mono tracking-wider uppercase">DUE THIS WEEK</span>
          </div>
          <p className="text-2xl font-black text-teal-400 font-mono leading-none">{dueThisWeekSchedules.length}</p>
          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {dueThisWeekSchedules.map(sch => (
              <div key={sch.id} className="text-[11px] bg-teal-500/10 p-2 rounded border border-teal-500/20 text-teal-200">
                <span className="font-bold">{sch.equipmentId}</span>: Action on {sch.nextMaintenanceDate}
              </div>
            ))}
            {dueThisWeekSchedules.length === 0 && (
              <p className="text-slate-500 text-[11px] font-mono">0 pending weekly PM obligations.</p>
            )}
          </div>
        </div>

      </div>

      {/* Plan PM Audit form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Plan Preventive Maintenance</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-white font-mono"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Pick Target Device */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Target Equipment *</label>
              <select
                id="form-sch-device"
                value={selectedEquipId}
                onChange={(e) => setSelectedEquipId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="">-- Choose Equipment --</option>
                {equipment.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.id} - {eq.name} ({eq.ward.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>

            {/* Next date */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Date scheduled *</label>
              <input
                id="form-sch-date"
                type="date"
                required
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">PM Frequency *</label>
              <select
                id="form-sch-freq"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="monthly">Monthly Service</option>
                <option value="quarterly">Quarterly Calibration</option>
                <option value="semi-annually">Semi-Annual Audit</option>
                <option value="annually">Annual Certification</option>
              </select>
            </div>

            {/* Assigned Engineer */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Assigned Engineer Representative</label>
              <input
                id="form-sch-engineer"
                type="text"
                placeholder="Engineer Name"
                value={assignedEngineerName}
                onChange={(e) => setAssignedEngineerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
              />
            </div>

          </div>

          <button
            id="sch-submit-btn"
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition"
          >
            Authorize Schedule Setup
          </button>
        </form>
      )}

      {/* Main schedule activity index board */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/20">
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">Standard Schedule Calendar index</span>
          <span className="text-[10px] text-slate-400 font-mono">TODAY STATED: {TODAY_STR}</span>
        </div>

        <div className="divide-y divide-slate-850">
          {schedules.map((sch) => {
            const isCompleted = sch.status === 'completed';
            const itemOverdue = sch.nextMaintenanceDate < TODAY_STR && !isCompleted;
            
            return (
              <div key={sch.id} id={`sch-item-${sch.id}`} className="p-4 hover:bg-slate-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                {/* Left block info */}
                <div className="flex items-start space-x-3.5">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                    isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : itemOverdue
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : 'bg-slate-900 border-slate-800 text-teal-400'
                  }`}>
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{sch.id}</span>
                    <h4 className="font-bold text-sm text-white leading-tight mt-0.5">{sch.equipmentName} ({sch.equipmentId})</h4>
                    
                    <div className="flex flex-wrap items-center gap-3 text-slate-400 text-[11px] font-mono mt-1.5 list-none">
                      <span className="text-teal-400">F: {sch.frequency}</span>
                      <span>•</span>
                      <span>Next Date: {sch.nextMaintenanceDate}</span>
                      <span>•</span>
                      <span className="text-slate-500">Assignee: {sch.assignedEngineerName}</span>
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center space-x-2.5 self-end sm:self-auto">
                  
                  {isCompleted ? (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded border border-emerald-500/25">
                      Completed ✓
                    </span>
                  ) : itemOverdue ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-rose-500/15 text-rose-400 px-3 py-1 rounded border border-rose-500/25 animate-pulse">
                        Overdue!
                      </span>
                      <button
                        onClick={() => handleMarkAsComplete(sch)}
                        className="px-3 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded text-[10.5px] font-semibold transition"
                      >
                        Complete now
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-slate-900 text-slate-400 px-3 py-1 rounded border border-slate-800">
                        Planned
                      </span>
                      <button
                        onClick={() => handleMarkAsComplete(sch)}
                        className="px-3 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded text-[10.5px] font-semibold transition"
                      >
                        Complete
                      </button>
                    </div>
                  )}

                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
