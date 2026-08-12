import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Equipment, Job, MaintenanceType } from '../types';
import {
  History,
  Search,
  Sliders,
  Calendar,
  Layers,
  Wrench,
  User,
  MapPin,
  CheckCircle,
  Clock,
  AlertOctagon,
  ArrowRight
} from 'lucide-react';

interface EquipmentHistoryViewProps {
  /** Device to open, set by a QR scan or a deep link. */
  focusEquipmentId?: string | null;
  onFocusHandled?: () => void;
}

export default function EquipmentHistoryView({
  focusEquipmentId,
  onFocusHandled,
}: EquipmentHistoryViewProps = {}) {
  const { equipment, jobs } = useApp();

  // Selected Equipment filter
  const [selectedId, setSelectedId] = useState<string>('');
  const [notFoundId, setNotFoundId] = useState<string | null>(null);

  // Filters for the logs
  const [maintType, setMaintType] = useState<string>('all');
  const [engineerFilter, setEngineerFilter] = useState<string>('all');
  const [wardFilter, setWardFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Initialize selectedId if registry has values
  React.useEffect(() => {
    if (equipment.length > 0 && !selectedId) {
      setSelectedId(equipment[0].id);
    }
  }, [equipment, selectedId]);

  // Honour a scanned label or deep link once the registry has loaded. Matching
  // on asset number as well means a label reprinted with either identifier works.
  React.useEffect(() => {
    if (!focusEquipmentId) return;

    const wanted = focusEquipmentId.trim().toLowerCase();
    const match = equipment.find(
      (e) => e.id.toLowerCase() === wanted || e.assetNumber?.toLowerCase() === wanted
    );

    if (match) {
      setSelectedId(match.id);
      setNotFoundId(null);
      onFocusHandled?.();
    } else if (equipment.length > 0) {
      // The registry is loaded and still has no such device.
      setNotFoundId(focusEquipmentId);
      onFocusHandled?.();
    }
  }, [focusEquipmentId, equipment, onFocusHandled]);

  // Derive active equipment details
  const activeDevice = equipment.find(e => e.id === selectedId);

  // Derive unique engineering staff names in records for filters
  const uniqueEngineers = Array.from(new Set(jobs.map(j => j.engineerDetails.name as string))) as string[];
  // Derive unique wards
  const uniqueWards = Array.from(new Set(jobs.map(j => j.ward as string))) as string[];

  // Derive jobs matching activeDevice AND matching search filters
  const relatedJobs = jobs.filter(j => j.equipmentId === selectedId);

  const filteredJobs = relatedJobs.filter(j => {
    const matchesMaint = maintType === 'all' || j.maintenanceType === maintType;
    const matchesEng = engineerFilter === 'all' || j.engineerDetails.name === engineerFilter;
    const matchesWard = wardFilter === 'all' || j.ward === wardFilter;
    
    // Date range
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && j.date >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && j.date <= endDate;
    }

    return matchesMaint && matchesEng && matchesWard && matchesDate;
  });

  return (
    <div className="space-y-6">
      
      {/* Header index */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold text-white tracking-tight">Timeline &amp; Maintenance Archival History</h1>
        <p className="text-xs text-slate-400 mt-1">
          Trace previous servicing, downtime analysis, calibration compliance indicators, and clinical signoff history.
        </p>
      </div>

      {/* A scanned label pointed at a device that is not in the registry */}
      {notFoundId && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-start gap-2.5 leading-relaxed">
          <AlertOctagon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            No device matching <span className="font-mono font-bold">{notFoundId}</span> is in the
            registry. The label may belong to equipment that has not been registered yet, or that has
            since been removed.
          </span>
          <button
            type="button"
            onClick={() => setNotFoundId(null)}
            className="ml-auto text-amber-400 hover:text-amber-200 transition shrink-0 cursor-pointer font-mono text-[10px] uppercase"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Side: Select Equipment list selector */}
        <div className="lg:col-span-4 bg-slate-900/30 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-mono text-teal-400 uppercase tracking-wider font-semibold">
            <Layers className="w-4 h-4" />
            <span>Select Hospital Asset</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {equipment.map((eq) => {
              const isActive = eq.id === selectedId;
              return (
                <button
                  key={eq.id}
                  onClick={() => setSelectedId(eq.id)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-teal-500/30 text-teal-400'
                      : 'bg-slate-950/40 border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block text-[10px] font-mono uppercase tracking-widest">{eq.id}</span>
                  <span className="block font-bold mt-0.5 text-xs truncate">{eq.name}</span>
                  <span className="block text-[10px] text-slate-500 font-mono mt-0.5">{eq.ward.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Selected Equipment full History & timelines */}
        <div className="lg:col-span-8 space-y-6">
          
          {activeDevice ? (
            <div className="space-y-6 animate-fade-in">
              
              {/* Device overview banner */}
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="flex items-center space-x-3 sm:col-span-2">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-white">{activeDevice.name}</h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Model: {activeDevice.modelNumber} • Serial: {activeDevice.serialNumber}</p>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-slate-800 sm:pl-4">
                  <span className="block text-[10px] font-mono text-slate-500 uppercase">Current Status</span>
                  <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase mt-1 bg-teal-500/15 text-teal-400 border border-teal-500/25">
                    {activeDevice.status}
                  </span>
                </div>
              </div>

              {/* Advanced Multi-Filter controls */}
              <div className="bg-slate-950/50 rounded-2xl border border-slate-850 p-4 space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold block">History Filter Console</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Maintenance dropdown */}
                  <div>
                    <select
                      id="history-filter-maint"
                      value={maintType}
                      onChange={(e) => setMaintType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
                    >
                      <option value="all">All Services</option>
                      <option value="Corrective Maintenance">Corrective</option>
                      <option value="Preventive Maintenance">Preventive</option>
                      <option value="Calibration">Calibration</option>
                      <option value="Inspection">Inspection</option>
                    </select>
                  </div>

                  {/* Engineer selection */}
                  <div>
                    <select
                      id="history-filter-engineer"
                      value={engineerFilter}
                      onChange={(e) => setEngineerFilter(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
                    >
                      <option value="all">All Engineers</option>
                      {uniqueEngineers.map(eng => (
                        <option key={eng} value={eng}>{eng}</option>
                      ))}
                    </select>
                  </div>

                  {/* Wards selector */}
                  <div>
                    <select
                      id="history-filter-ward"
                      value={wardFilter}
                      onChange={(e) => setWardFilter(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
                    >
                      <option value="all">All Locations</option>
                      {uniqueWards.map(wd => (
                        <option key={wd} value={wd}>{wd.split(' ')[0]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dates picking */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-900/80 pt-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500 font-mono text-[10px] shrink-0 uppercase">Serviced From</span>
                    <input
                      id="history-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded p-1.5 text-[10px] font-mono text-slate-300 focus:outline-none w-full"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500 font-mono text-[10px] shrink-0 uppercase">Serviced To</span>
                    <input
                      id="history-end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded p-1.5 text-[10px] font-mono text-slate-300 focus:outline-none w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Maintenance Timeline Component */}
              <div className="space-y-4">
                <span className="text-xs font-semibold text-slate-100 uppercase tracking-widest font-mono">Service Timeline Progression</span>

                <div className="space-y-6 relative border-l-2 border-slate-800 pl-6 ml-3">
                  {filteredJobs.length > 0 ? (
                    filteredJobs.map((j) => (
                      <div key={j.id} className="relative group">
                        
                        {/* Timeline pip */}
                        <div className="absolute -left-10 top-0.5 w-8 h-8 rounded-full bg-slate-950 border-2 border-teal-500 flex items-center justify-center text-teal-400 shrink-0">
                          <Wrench className="w-3.5 h-3.5" />
                        </div>

                        {/* Content Card */}
                        <div className="bg-slate-900/20 border border-slate-850 hover:bg-slate-900/40 p-5 rounded-2xl space-y-3 transition">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                            <div>
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-teal-500/10 text-teal-400 border border-teal-500/15">
                                {j.maintenanceType}
                              </span>
                              <span className="text-xs text-slate-400 font-mono ml-2">{j.date} • {j.time}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                              {j.id}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                            <p><strong className="text-slate-400 font-mono uppercase text-[10px] block mb-0.5">Fault Logged:</strong> {j.faultReported}</p>
                            <p><strong className="text-slate-400 font-mono uppercase text-[10px] block mb-0.5">Work Completed:</strong> {j.technicalWorkDone}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-[10.5px] font-mono border-t border-slate-800/50 pt-3 text-slate-500">
                            <div>
                              <span>RESPONSIBLE ENGINEER</span>
                              <span className="block text-slate-300 font-bold mt-0.5">{j.engineerDetails.name}</span>
                            </div>
                            <div>
                              <span>SPARE PARTS</span>
                              <span className="block text-slate-300 truncate mt-0.5">{j.sparePartsUsed}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 text-xs py-8">No maintenance event records match active filter filters.</div>
                  )}
                </div>
              </div>

              {/* Maintenance History Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/20">
                <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">Service Log Table</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 select-none">
                    <thead className="bg-slate-950 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Fault Reported</th>
                        <th className="p-3">Work Done</th>
                        <th className="p-3">Spare Parts</th>
                        <th className="p-3">Engineer</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {filteredJobs.map((j) => (
                        <tr key={j.id} className="hover:bg-slate-900/30">
                          <td className="p-3 font-mono text-[10.5px] whitespace-nowrap">{j.date}</td>
                          <td className="p-3 max-w-[150px] truncate">{j.faultReported}</td>
                          <td className="p-3 max-w-[150px] truncate">{j.technicalWorkDone}</td>
                          <td className="p-3 font-mono truncate max-w-[100px]">{j.sparePartsUsed}</td>
                          <td className="p-3 whitespace-nowrap">{j.engineerDetails.name.split(' ').slice(1).join(' ') || j.engineerDetails.name}</td>
                          <td className="p-3 text-right">
                            <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 border border-emerald-500/20 rounded font-bold">
                              {j.jobStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-20 bg-slate-900/10 border border-slate-800 rounded-2xl">
              <History className="w-10 h-10 text-slate-500 mx-auto mb-3 animate-pulse" />
              <p className="text-xs font-mono text-slate-400">Please select analytical equipment on the left panel to trace its historic service timelines.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
