import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileBarChart,
  Calendar,
  Layers,
  Award,
  Download,
  Printer,
  FileSpreadsheet,
  TrendingDown,
  Wrench,
  Activity
} from 'lucide-react';

export default function ReportsView() {
  const { jobs, equipment, schedules } = useApp();

  // Default to the current reporting period rather than a fixed month.
  const today = new Date();
  const [chosenMonth, setChosenMonth] = useState<string>(String(today.getMonth() + 1).padStart(2, '0'));
  const [chosenYear, setChosenYear] = useState<string>(String(today.getFullYear()));

  // Every year that has logged jobs, plus the current one, newest first.
  const selectableYears = Array.from(
    new Set([String(today.getFullYear()), ...jobs.map(j => j.date.split('-')[0]).filter(Boolean)])
  ).sort((a, b) => Number(b) - Number(a));

  const monthsMap: { [key: string]: string } = {
    '01': 'January', '02': 'February', '03': 'March', '04': 'April',
    '05': 'May', '06': 'June', '07': 'July', '08': 'August',
    '09': 'September', '10': 'October', '11': 'November', '12': 'December'
  };

  // Filter jobs by selected month & year
  const monthlyJobs = jobs.filter(j => {
    const parts = j.date.split('-');
    const year = parts[0];
    const month = parts[1];
    return year === chosenYear && month === chosenMonth;
  });

  // Calculate metrics
  const totalRepairs = monthlyJobs.length;
  const prevMaintCount = monthlyJobs.filter(j => j.maintenanceType === 'Preventive Maintenance').length;
  const correctiveCount = monthlyJobs.filter(j => j.maintenanceType === 'Corrective Maintenance').length;
  const calibrationCount = monthlyJobs.filter(j => j.maintenanceType === 'Calibration').length;

  // Planning estimate only. The logbook records the date a job was filed but not
  // how long the device was out of service, so downtime cannot be measured from
  // the data. These are nominal per-job durations; adjust them to match the
  // department's own observed figures.
  const NOMINAL_CORRECTIVE_HOURS = 4.5;
  const NOMINAL_PREVENTIVE_HOURS = 1.5;
  const avgDowntimeHours = totalRepairs > 0
    ? (correctiveCount * NOMINAL_CORRECTIVE_HOURS + prevMaintCount * NOMINAL_PREVENTIVE_HOURS) / totalRepairs
    : 0;

  // Spare Parts lists
  const partsUsedList = monthlyJobs
    .map(j => j.sparePartsUsed)
    .filter(p => p && p.toLowerCase() !== 'none' && p.toLowerCase() !== 'none (reconnected)');

  // EXCEL / CSV Export function
  const handleExportCSV = () => {
    if (monthlyJobs.length === 0) {
      alert(`No data available to export for ${monthsMap[chosenMonth]} ${chosenYear}.`);
      return;
    }

    // Build standard CSV file blocks
    const headers = ['Job Number', 'Date', 'Time', 'WardName', 'Device', 'Model', 'Serial', 'Category', 'Fault', 'Technical WorkDone', 'PartsUsed', 'Engineer'];
    const rows = monthlyJobs.map(j => [
      `"${j.id}"`,
      `"${j.date}"`,
      `"${j.time}"`,
      `"${j.ward}"`,
      `"${j.equipmentName}"`,
      `"${j.modelNumber}"`,
      `"${j.serialNumber}"`,
      `"${j.maintenanceType}"`,
      `"${j.faultReported.replace(/"/g, '""')}"`,
      `"${j.technicalWorkDone.replace(/"/g, '""')}"`,
      `"${j.sparePartsUsed.replace(/"/g, '""')}"`,
      `"${j.engineerDetails.name}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Virtual Anchor trigger
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BEMMS_Report_${monthsMap[chosenMonth]}_${chosenYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simulated PDF Printable overlay
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* View header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold text-white tracking-tight">Biomedical Operations Reports &amp; Compliance Center</h1>
        <p className="text-xs text-slate-400 mt-1">
          Compile monthly diagnostics reports, compute downtime indicators, and export ISO 13485 compliant sheets instantly.
        </p>
      </div>

      {/* Choose Interval Selector */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Reporting Interval</span>
            <div className="flex items-center space-x-2 mt-1">
              
              <select
                id="report-chosen-month"
                value={chosenMonth}
                onChange={(e) => setChosenMonth(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5 text-xs text-white focus:outline-none"
              >
                {Object.entries(monthsMap).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              <select
                id="report-chosen-year"
                value={chosenYear}
                onChange={(e) => setChosenYear(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5 text-xs text-white focus:outline-none"
              >
                {selectableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

            </div>
          </div>
        </div>

        {/* Action downloads */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto w-full sm:w-auto">
          <button
            id="report-excel-export-btn"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-950 text-slate-200 hover:text-white border border-slate-850 hover:border-emerald-500/35 rounded-xl font-mono text-xs font-semibold flex items-center justify-center space-x-2 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>CSV Excel Export</span>
          </button>

          <button
            id="report-pdf-print-btn"
            onClick={handlePrintPDF}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Generate Printable PDF</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards aggregated from selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/50 p-5 border border-slate-800 rounded-xl space-y-2">
          <span className="text-[10px] font-mono uppercase text-slate-500 block">Total Repairs Compiled</span>
          <p className="text-3xl font-black text-white font-mono leading-none">{totalRepairs}</p>
          <span className="text-[10.5px] font-mono text-slate-400 block pt-1 border-t border-slate-800/40">Includes calibration &amp; fixes.</span>
        </div>

        <div className="bg-slate-900/50 p-5 border border-slate-800 rounded-xl space-y-2">
          <span className="text-[10px] font-mono uppercase text-teal-400 block font-bold">Preventive Maintenance</span>
          <p className="text-3xl font-black text-teal-400 font-mono leading-none">{prevMaintCount}</p>
          <span className="text-[10.5px] font-mono text-teal-500 block pt-1 border-t border-slate-100/10">Planned service audits.</span>
        </div>

        <div className="bg-slate-900/50 p-5 border border-slate-800 rounded-xl space-y-2">
          <span className="text-[10px] font-mono uppercase text-rose-400 block font-bold">Corrective Maintenance</span>
          <p className="text-3xl font-black text-rose-400 font-mono leading-none">{correctiveCount}</p>
          <span className="text-[10.5px] font-mono text-rose-500 block pt-1 border-t border-slate-100/10">Active component failures.</span>
        </div>

        <div className="bg-slate-900/50 p-5 border border-slate-800 rounded-xl space-y-2">
          <span className="text-[10px] font-mono uppercase text-indigo-400 block font-bold">Est. Downtime / Job</span>
          <p className="text-3xl font-black text-indigo-400 font-mono leading-none">
            {avgDowntimeHours.toFixed(1)} hrs
          </p>
          <span className="text-[10.5px] font-mono text-indigo-500 block pt-1 border-t border-slate-100/10">
            Estimate from nominal durations, not measured.
          </span>
        </div>

      </div>

      {/* Report Summary Data Grid list */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/20">
        
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-semibold font-mono text-white uppercase tracking-wider">
            Ledger breakdown: {monthsMap[chosenMonth]} {chosenYear}
          </h3>
          <span className="text-[10px] text-slate-400 font-mono uppercase">{totalRepairs} records mapped</span>
        </div>

        <div className="p-6 space-y-4">
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Job ID</th>
                  <th className="p-3">Device Name</th>
                  <th className="p-3">Location Ward</th>
                  <th className="p-3">Servicing Class</th>
                  <th className="p-3">Parts Replaced</th>
                  <th className="p-3">Assigned Engineer</th>
                  <th className="p-3 text-right">Job Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {monthlyJobs.map(j => (
                  <tr key={j.id} className="hover:bg-slate-900/30">
                    <td className="p-3 font-mono text-[10.5px] text-teal-400 font-bold">{j.id}</td>
                    <td className="p-3 font-semibold text-white">{j.equipmentName}</td>
                    <td className="p-3">{j.ward.split(' ')[0]}</td>
                    <td className="p-3 whitespace-nowrap">{j.maintenanceType}</td>
                    <td className="p-3 font-mono text-slate-400 truncate max-w-[124px]">{j.sparePartsUsed}</td>
                    <td className="p-3 whitespace-nowrap">{j.engineerDetails.name}</td>
                    <td className="p-3 text-right">
                      <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 border border-emerald-500/20 rounded font-bold">
                        {j.jobStatus}
                      </span>
                    </td>
                  </tr>
                ))}

                {monthlyJobs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500 font-mono text-xs">
                      No maintenance events recorded during {monthsMap[chosenMonth]} {chosenYear}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Spare parts audit block */}
          {partsUsedList.length > 0 && (
            <div className="mt-6 p-4 bg-slate-950/40 rounded-xl border border-slate-850 space-y-2">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-bold tracking-wider block">Spare Parts Deployment audit log</span>
              <ul className="text-xs text-slate-300 space-y-1 font-mono">
                {partsUsedList.map((part, index) => (
                  <li key={index} className="flex items-center space-x-2 text-slate-400">
                    <Wrench className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>{part}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
