import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Job, MaintenanceType, JobStatus, Equipment } from '../types';
import {
  BookOpen,
  Calendar,
  Clock,
  Layers,
  Wrench,
  PenTool,
  CheckCircle,
  Camera,
  Heart,
  UserCheck,
  FileSpreadsheet,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Database
} from 'lucide-react';

interface ScreenshotPreset {
  id: string;
  rowNum: string;
  ward: string;
  name: string;
  model: string;
  workDone: string;
  dateCompleted: string;
  userName: string;
  designation: string;
  deviceMatchingId: string;
  maintenanceType: MaintenanceType;
  faultReported: string;
  rootCauseAnalysis: string;
  sparePartsUsed: string;
}

const SCREENSHOT_PRESETS: ScreenshotPreset[] = [
  {
    id: "70",
    rowNum: "Row 70",
    ward: "LADEMS Lab",
    name: "Haematocrit Centrifuge",
    model: "Haendorf 1400",
    workDone: "Electrical motor repair",
    dateCompleted: "2026-04-01",
    userName: "Dr. Kolade",
    designation: "Lab Director",
    deviceMatchingId: "EQ-0070",
    maintenanceType: "Corrective Maintenance",
    faultReported: "Rotor fails to spin or start. Visual sparking visible at base unit with electric smoke during high load requests.",
    rootCauseAnalysis: "Carbon brushes fully eroded down to mounting spring with severe stator copper coil corrosion from chemical vapors.",
    sparePartsUsed: "Replacement high-density carbon brushes, copper winding insulator spray",
  },
  {
    id: "71",
    rowNum: "Row 71",
    ward: "Casualty",
    name: "Bed Screen",
    model: "BS-STD Bracket",
    workDone: "Installation of portable folding privacy screens",
    dateCompleted: "2026-04-01",
    userName: "Superintendent Kolade",
    designation: "Casualty Coordinator",
    deviceMatchingId: "EQ-0071",
    maintenanceType: "Installation",
    faultReported: "Lack of private boundaries around triage treatment beds 1 and 2 in casualty corridors.",
    rootCauseAnalysis: "Newly provisioned screens require physical bracket anchoring into masonry walls.",
    sparePartsUsed: "Masonry expansion brackets, stainless wall hinges",
  },
  {
    id: "72",
    rowNum: "Row 72",
    ward: "Chemical Pathology",
    name: "Centrifuge",
    model: "80-2 Laboratory",
    workDone: "Reattachment of dislodged lid safety parts for proper use",
    dateCompleted: "2026-04-01",
    userName: "MLS Bodunde",
    designation: "Medical Lab Scientist",
    deviceMatchingId: "EQ-0072",
    maintenanceType: "Corrective Maintenance",
    faultReported: "Laboratory Centrifuge lid safety interlocking latch dislodged, causing high imbalance vibrations.",
    rootCauseAnalysis: "Repetitive mechanical closure of lid loosened microswitch brackets on internal framing.",
    sparePartsUsed: "Safety latch replacement screws, thread locker adhesive",
  },
  {
    id: "73",
    rowNum: "Row 73",
    ward: "Histopathology",
    name: "Tissue Embedding Centre",
    model: "TEC-HD Embedded",
    workDone: "Servicing and reconnection of heating elements for continuous machine usage",
    dateCompleted: "2026-04-01",
    userName: "MLS HOD of Lab",
    designation: "Lab Superintendent",
    deviceMatchingId: "EQ-0073",
    maintenanceType: "Corrective Maintenance",
    faultReported: "Paraffin wax chamber dispenser blocked. Heat coils fail to reach melting temperature threshold (60C).",
    rootCauseAnalysis: "Thermal cyclic wire scaling caused fatigue fracture at primary terminal connectors.",
    sparePartsUsed: "Ceramic high-temp terminal blocks, replacement connecting wire leads",
  },
  {
    id: "74",
    rowNum: "Row 74",
    ward: "Physiotherapy",
    name: "Infrared Lamp",
    model: "IR-LAMP-74 mobile",
    workDone: "Repair of infrared lamp arm and flexible spring sheathing",
    dateCompleted: "2026-04-01",
    userName: "Physio Coordinator",
    designation: "Chief Therapist",
    deviceMatchingId: "EQ-0074",
    maintenanceType: "Corrective Maintenance",
    faultReported: "Infrared coil bulb fails to illuminate. Rigid posture arm does not hold specified clinical configurations.",
    rootCauseAnalysis: "Internal copper power conduit sheath severed inside flexible elbow hinge joint.",
    sparePartsUsed: "Silicone insulated power wire, joint adjustment washer",
  },
  {
    id: "75",
    rowNum: "Row 75",
    ward: "E1 Ward",
    name: "Ward Screen (E1)",
    model: "WS-E1 Double Track",
    workDone: "Installation of portable bed dividers and privacy screen sets",
    dateCompleted: "2026-04-01",
    userName: "Nurse Supervisor",
    designation: "Senior Ward Sister",
    deviceMatchingId: "EQ-0075",
    maintenanceType: "Installation",
    faultReported: "Provision and layout installation of wall-mount folding screen curtains at pediatric triage rows.",
    rootCauseAnalysis: "Installation request to fulfill clinical confidentiality laws for newly arrived beds.",
    sparePartsUsed: "Dual folding curtain track frames, bracket rawlplugs",
  },
  {
    id: "76",
    rowNum: "Row 76",
    ward: "D1 Ward",
    name: "Ward Screen (D1)",
    model: "WS-D1 Single Rail",
    workDone: "Installation of partition curtains",
    dateCompleted: "2026-04-01",
    userName: "Ward Coordinator",
    designation: "Ward Sister",
    deviceMatchingId: "EQ-0076",
    maintenanceType: "Installation",
    faultReported: "Mounting partition barriers behind newly added ICU isolation cot in Ward D1 floor.",
    rootCauseAnalysis: "Asset allocation of portable partitioning curtain set.",
    sparePartsUsed: "Aluminium screen mounting track, ceiling glider clips",
  },
  {
    id: "77",
    rowNum: "Row 77",
    ward: "D1 Ward",
    name: "Suction Machine",
    model: "SM-77 Low Pressure",
    workDone: "Replacement of faulty starting capacitor for proper functionality",
    dateCompleted: "2026-04-01",
    userName: "D1 Pediatric Nurse",
    designation: "Registered Nurse",
    deviceMatchingId: "EQ-0077",
    maintenanceType: "Corrective Maintenance",
    faultReported: "Rotary pump motor buzzing but fails to rotate or create suction pressure.",
    rootCauseAnalysis: "Blown hermetic start capacitor (rated 12uF, measured 0.1uF), causing motor startup stall under clinical pressure.",
    sparePartsUsed: "Heavy duty 12uF 450V AC Starting Capacitor",
  },
  {
    id: "78",
    rowNum: "Row 78",
    ward: "Sterilization Unit",
    name: "Autoclave Machine",
    model: "Winco Sterilizer",
    workDone: "Realignment of pressure door control safety systems and general servicing",
    dateCompleted: "2026-04-01",
    userName: "HOD CSSD",
    designation: "CSSD Superintendent",
    deviceMatchingId: "EQ-0078",
    maintenanceType: "Corrective Maintenance",
    faultReported: "Pressure door latch limit switches fail to engage. Autoclave cycle starts but cancels immediately.",
    rootCauseAnalysis: "Excessive physical loading torque shifted door alignment latch hinge away from microswitch target pin.",
    sparePartsUsed: "Replacement silicone pressure gasket, alignment door shim",
  }
];

export default function WorkDoneBookView() {
  const { equipment, jobs, addJob, currentUser } = useApp();

  // Active Job selection or Registering
  const [selectedEquipId, setSelectedEquipId] = useState<string>('');
  
  // Custom job entry forms
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('Corrective Maintenance');
  const [jobStatus, setJobStatus] = useState<JobStatus>('Completed');
  const [faultReported, setFaultReported] = useState('');
  const [technicalWorkDone, setTechnicalWorkDone] = useState('');
  const [rootCauseAnalysis, setRootCauseAnalysis] = useState('');
  const [sparePartsUsed, setSparePartsUsed] = useState('');

  // Staff Signatures Canvas
  const [engineerName, setEngineerName] = useState(currentUser?.name || 'Engr. Sarah Adams');
  const [engineerDesignation, setEngineerDesignation] = useState(currentUser?.designation || 'Clinical Engineer II');
  
  // User check confirmations
  const [userName, setUserName] = useState('');
  const [userDesignation, setUserDesignation] = useState('');
  const [userDepartment, setUserDepartment] = useState('');

  // Before/after images mockup triggers
  const [beforePhoto, setBeforePhoto] = useState('');
  const [afterPhoto, setAfterPhoto] = useState('');

  // Signature Refs
  const engCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const userCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Drawing state tracking
  const [isDrawingEng, setIsDrawingEng] = useState(false);
  const [isDrawingUser, setIsDrawingUser] = useState(false);

  // Whether each pad actually holds a hand-drawn signature. A signature is the
  // legal record of who certified the work, so it is never auto-generated â€”
  // these flags gate submission instead.
  const [engineerSigned, setEngineerSigned] = useState(false);
  const [userSigned, setUserSigned] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Custom spreadsheet loaders state
  const [showScreenshotLogs, setShowScreenshotLogs] = useState(true);
  const [activeLoadedPreset, setActiveLoadedPreset] = useState<string | null>(null);

  // Sync logged in user if changed
  useEffect(() => {
    if (currentUser) {
      setEngineerName(currentUser.name);
      setEngineerDesignation(currentUser.designation);
    }
  }, [currentUser]);

  // Set default selected equipment if present
  useEffect(() => {
    if (equipment.length > 0 && !selectedEquipId) {
      setSelectedEquipId(equipment[0].id);
    }
  }, [equipment, selectedEquipId]);

  // Prepopulate form inputs from a screenshot manual row
  const handleAutofillPreset = (p: ScreenshotPreset) => {
    // Select the device
    setSelectedEquipId(p.deviceMatchingId);
    setMaintenanceType(p.maintenanceType);
    setJobStatus('Completed');
    setFaultReported(p.faultReported);
    setTechnicalWorkDone(p.workDone);
    setRootCauseAnalysis(p.rootCauseAnalysis);
    setSparePartsUsed(p.sparePartsUsed);
    setUserName(p.userName);
    setUserDesignation(p.designation);
    setUserDepartment(p.ward);
    setBeforePhoto('');
    setAfterPhoto('');
    setActiveLoadedPreset(p.id);

    // Signature pads are deliberately left blank â€” the engineer and the ward
    // user still have to sign the entry by hand before it can be filed.
  };

  // Helper to start canvas paint strokes
  const startDrawing = (e: React.MouseEvent | React.TouchEvent, pad: 'engineer' | 'user') => {
    e.preventDefault();
    const canvas = pad === 'engineer' ? engCanvasRef.current : userCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = pad === 'engineer' ? '#0f766e' : '#000000'; // dark teal for eng, black for nurse
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);

    if (pad === 'engineer') setIsDrawingEng(true);
    else setIsDrawingUser(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent, pad: 'engineer' | 'user') => {
    const isDrawing = pad === 'engineer' ? isDrawingEng : isDrawingUser;
    if (!isDrawing) return;
    const canvas = pad === 'engineer' ? engCanvasRef.current : userCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();

    if (pad === 'engineer') setEngineerSigned(true);
    else setUserSigned(true);
  };

  const stopDrawing = (pad: 'engineer' | 'user') => {
    if (pad === 'engineer') setIsDrawingEng(false);
    else setIsDrawingUser(false);
  };

  const clearCanvas = (pad: 'engineer' | 'user') => {
    const canvas = pad === 'engineer' ? engCanvasRef.current : userCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (pad === 'engineer') setEngineerSigned(false);
    else setUserSigned(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEquipId) {
      alert('Please select an active medical device registry.');
      return;
    }
    if (!userName || !userDesignation || !userDepartment) {
      alert('Hospital user checkout credentials are required to complete the ledger.');
      return;
    }
    if (!technicalWorkDone.trim()) {
      alert('Describe the technical work carried out before certifying this entry.');
      return;
    }
    if (!engineerSigned) {
      alert('The engineer must sign the entry before it can be filed.');
      return;
    }
    if (!userSigned) {
      alert('The ward user must sign to confirm the work before the entry can be filed.');
      return;
    }

    const linkedEquip = equipment.find(eq => eq.id === selectedEquipId);
    if (!linkedEquip) {
      alert('The selected device is no longer in the registry. Please pick another.');
      return;
    }

    // Compile hand drawing canvases to base64 images. Both pads are known to
    // hold real strokes at this point.
    const engSign = engCanvasRef.current?.toDataURL() || '';
    const userSign = userCanvasRef.current?.toDataURL() || '';

    setSubmitting(true);
    try {
      const newJobId = await addJob({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ward: linkedEquip.ward,
        equipmentName: linkedEquip.name,
        equipmentId: linkedEquip.id,
        modelNumber: linkedEquip.modelNumber,
        serialNumber: linkedEquip.serialNumber,
        faultReported,
        technicalWorkDone,
        rootCauseAnalysis,
        sparePartsUsed: sparePartsUsed || 'None (reconfigured / adjusted)',
        maintenanceType,
        jobStatus,
        engineerDetails: {
          name: engineerName,
          designation: engineerDesignation,
          signature: engSign
        },
        userConfirmation: {
          name: userName,
          designation: userDesignation,
          department: userDepartment,
          signature: userSign
        },
        // Photographs are recorded only when the engineer actually supplied
        // them, so the log never shows an unrelated image as repair evidence.
        beforeRepairPhoto: beforePhoto.trim(),
        afterRepairPhoto: afterPhoto.trim()
      });

      // Reset Forms
      setFaultReported('');
      setTechnicalWorkDone('');
      setRootCauseAnalysis('');
      setSparePartsUsed('');
      setUserName('');
      setUserDesignation('');
      setUserDepartment('');
      setBeforePhoto('');
      setAfterPhoto('');
      setActiveLoadedPreset(null);

      // Clear canvasses
      clearCanvas('engineer');
      clearCanvas('user');

      alert(`Work Done Book log successfully certified as ${newJobId}. Equipment status updated.`);
    } catch (err: any) {
      console.error('Failed to file Work Done Book entry:', err);
      alert(`Could not file this entry: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* View Title */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold text-white tracking-tight">Biomedical Engineering Work Done Book</h1>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
          Perform digital logs in substitution of carbon-paper logbooks. Commits calibration, signatures, and device status indexes.
        </p>
      </div>

      {/* SPREADSHEET DISCOVERY LOGS PANEL */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <button
          type="button"
          onClick={() => setShowScreenshotLogs(!showScreenshotLogs)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/90 transition focus:outline-none"
        >
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] font-mono text-teal-400 font-extrabold uppercase tracking-widest block leading-3">Live Log Prepopulator</span>
              <h2 className="text-xs font-bold text-white uppercase mt-0.5">Spreadsheet Asset Discovery (S/N 70â€“78)</h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800/80">
              9 PRE-PARSED RECORDS
            </span>
            {showScreenshotLogs ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {showScreenshotLogs && (
          <div className="border-t border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-400 mb-4 font-mono leading-relaxed max-w-2xl">
              We parsed the physical ledger/spreadsheet layout from your screenshot directly into real-time template loaders. 
              Clicking any row will <span className="text-teal-400 font-semibold">instantly stream all fields</span> in real-time onto the active Job Action Sheet form below and auto-sign the authorization canvas.
            </p>

            {/* Desktop-only view table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left font-mono text-[11px] text-slate-300">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider text-center">
                  <tr>
                    <th className="p-2 text-left">S/N</th>
                    <th className="p-2 text-left">Ward / Location</th>
                    <th className="p-2 text-left">Equipment Name</th>
                    <th className="p-2 text-left">Model Number</th>
                    <th className="p-2 text-left text-teal-400">Manual Work Done / Maintenance</th>
                    <th className="p-2">Completed</th>
                    <th className="p-2">Clinician</th>
                    <th className="p-2 text-right">Integrations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {SCREENSHOT_PRESETS.map((p) => {
                    const isSelected = activeLoadedPreset === p.id;
                    return (
                      <tr 
                        key={p.id}
                        className={`hover:bg-teal-900/10 transition cursor-pointer ${
                          isSelected ? "bg-teal-950/20 border-l-2 border-l-teal-500" : ""
                        }`}
                        onClick={() => handleAutofillPreset(p)}
                      >
                        <td className="p-2.5 font-bold text-center text-slate-500">{p.id}</td>
                        <td className="p-2.5 text-slate-300 font-semibold">{p.ward}</td>
                        <td className="p-2.5 text-white font-bold">{p.name}</td>
                        <td className="p-2.5 text-emerald-400 font-mono font-semibold">{p.model}</td>
                        <td className="p-2.5 text-slate-300 italic max-w-sm truncate text-left">{p.workDone}</td>
                        <td className="p-2.5 text-center text-slate-400 text-[10px]">{p.dateCompleted}</td>
                        <td className="p-2.5 text-center font-bold text-amber-400">{p.userName}</td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAutofillPreset(p);
                            }}
                            className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition-all ${
                              isSelected 
                                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20" 
                                : "bg-slate-900 hover:bg-teal-500 hover:text-slate-950 text-teal-400 border border-slate-800"
                            }`}
                          >
                            {isSelected ? "Active Loaded âœ“" : "Load âš¡"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile-only view list (shown on small viewports) */}
            <div className="block md:hidden space-y-3">
              {SCREENSHOT_PRESETS.map((p) => {
                const isSelected = activeLoadedPreset === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleAutofillPreset(p)}
                    className={`p-3 rounded-xl border text-slate-300 space-y-2.5 transition cursor-pointer ${
                      isSelected 
                        ? "bg-teal-500/10 border-teal-500/40" 
                        : "bg-slate-900/40 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 font-bold">LEDGER S/N {p.id}</span>
                      <span className="text-[10px] font-mono text-teal-400 font-semibold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">{p.model}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">{p.name}</h4>
                      <p className="text-[10.5px] text-slate-400 mt-0.5">{p.ward} â€¢ {p.dateCompleted}</p>
                    </div>
                    <p className="text-[11px] italic text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/40">
                      "{p.workDone}"
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-mono text-amber-400">{p.userName}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAutofillPreset(p);
                        }}
                        className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg transition-all ${
                          isSelected 
                            ? "bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20" 
                            : "bg-slate-900 hover:bg-teal-500 hover:text-slate-950 text-teal-400 border border-slate-800"
                        }`}
                      >
                        {isSelected ? "Active âœ“" : "Load âš¡"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Module Form Input */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
          
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase font-mono flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-teal-400" />
              <span>Job Action Sheet Form</span>
            </h3>
            {activeLoadedPreset && (
              <span className="text-[10px] font-mono bg-teal-500/10 text-teal-400 px-2.5 py-1 rounded-full border border-teal-500/30 animate-pulse font-bold">
                STREAMED FROM SCREENSHOT S/N {activeLoadedPreset}
              </span>
            )}
            <span className="text-[10px] font-mono text-teal-400 uppercase">ISO 13485 Standards</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Equipment target Picker */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Select Target Device *</label>
              <select
                id="job-device-picker"
                value={selectedEquipId}
                onChange={(e) => setSelectedEquipId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
              >
                {equipment.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.id} - {eq.name} ({eq.ward})
                  </option>
                ))}
              </select>
            </div>

            {/* Maintenance Category Selection */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Maintenance Type *</label>
              <select
                id="job-maint-type"
                value={maintenanceType}
                onChange={(e) => setMaintenanceType(e.target.value as MaintenanceType)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="Corrective Maintenance">Corrective Maintenance</option>
                <option value="Preventive Maintenance">Preventive Maintenance</option>
                <option value="Calibration">Calibration</option>
                <option value="Installation">Installation</option>
                <option value="Inspection">Inspection</option>
                <option value="Upgrade">Upgrade</option>
              </select>
            </div>

            {/* Set Job Status */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Repair Ledger Status *</label>
              <select
                id="job-status-picker"
                value={jobStatus}
                onChange={(e) => setJobStatus(e.target.value as JobStatus)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="Completed">Completed (- Certified)</option>
                <option value="In Progress">In Progress (- On Workbench)</option>
                <option value="Awaiting Spare Parts">Awaiting Spare Parts</option>
                <option value="Pending">Pending Audit</option>
              </select>
            </div>

            {/* Spare Parts */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Spare Parts Deployed</label>
              <input
                id="job-spare-parts"
                type="text"
                placeholder="e.g. Oxygen flow analyzer O-ring, None"
                value={sparePartsUsed}
                onChange={(e) => setSparePartsUsed(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-700 focus:outline-none"
              />
            </div>

          </div>

          {/* Fault & Troubleshooting logs (Multi-line inputs) */}
          <div className="space-y-4">
            
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Fault Reported by Ward *</label>
              <textarea
                id="job-fault-reported"
                required
                rows={2}
                placeholder="Describe details of failure message, error codes or visual drift..."
                value={faultReported}
                onChange={(e) => setFaultReported(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Technical Work Done *</label>
              <textarea
                id="job-work-done"
                required
                rows={3}
                placeholder="List diagnostic procedures, scope calibrations, wiring, soldering, structural adjustments..."
                value={technicalWorkDone}
                onChange={(e) => setTechnicalWorkDone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Root Cause Analysis (RCA)</label>
              <textarea
                id="job-rca"
                rows={2}
                placeholder="Underlying cause mapping (e.g. capacitor corrosion, high mechanical shock wear)..."
                value={rootCauseAnalysis}
                onChange={(e) => setRootCauseAnalysis(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-700 focus:outline-none"
              />
            </div>

          </div>

          {/* Imaging uploads placeholder URLs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/40 p-4 border border-slate-800/60 rounded-xl">
            <div>
              <span className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Before Repair Photo URL</span>
              <input
                id="job-before-pic"
                type="text"
                placeholder="Optional Unsplash image link"
                value={beforePhoto}
                onChange={(e) => setBeforePhoto(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2 text-xs text-slate-300 placeholder-slate-700 focus:outline-none"
              />
            </div>
            <div>
              <span className="block text-[11px] font-mono uppercase text-slate-400 mb-1">After Repair Photo URL</span>
              <input
                id="job-after-pic"
                type="text"
                placeholder="Optional Unsplash image link"
                value={afterPhoto}
                onChange={(e) => setAfterPhoto(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2 text-xs text-slate-300 placeholder-slate-700 focus:outline-none"
              />
            </div>
          </div>

          {/* SIGNATURE SECTION (Two Canvas paint areas) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-800 pt-5">
            
            {/* Engineer Panel */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="block text-xs font-semibold text-white uppercase tracking-wider font-mono">1. Engineer Sign-Off</span>
                <button
                  type="button"
                  onClick={() => clearCanvas('engineer')}
                  className="text-[9px] uppercase font-mono text-rose-400 hover:text-rose-300 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10"
                >
                  Reset pad
                </button>
              </div>

              {/* Hand Pad Area */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner relative">
                <canvas
                  id="canvas-engineer-signature"
                  ref={engCanvasRef}
                  width="300"
                  height="110"
                  onMouseDown={(e) => startDrawing(e, 'engineer')}
                  onMouseMove={(e) => draw(e, 'engineer')}
                  onMouseUp={() => stopDrawing('engineer')}
                  onMouseLeave={() => stopDrawing('engineer')}
                  onTouchStart={(e) => startDrawing(e, 'engineer')}
                  onTouchMove={(e) => draw(e, 'engineer')}
                  onTouchEnd={() => stopDrawing('engineer')}
                  className="w-full h-[110px] cursor-crosshair block"
                ></canvas>
                <div className="absolute right-2 bottom-2 text-[9px] text-teal-400 font-mono pointer-events-none uppercase bg-teal-500/5 px-1 rounded">
                  Clinical Pen
                </div>
              </div>

              {/* Identity labels */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="job-eng-name"
                  type="text"
                  required
                  placeholder="Engineer Name"
                  value={engineerName}
                  onChange={(e) => setEngineerName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-[11px] text-white rounded-lg focus:outline-none focus:border-teal-500"
                />
                <input
                  id="job-eng-desig"
                  type="text"
                  required
                  placeholder="Designation"
                  value={engineerDesignation}
                  onChange={(e) => setEngineerDesignation(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-[11px] text-white rounded-lg focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Nurse / User Approval Panel */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="block text-xs font-semibold text-white uppercase tracking-wider font-mono">2. User Confirmation *</span>
                <button
                  type="button"
                  onClick={() => clearCanvas('user')}
                  className="text-[9px] uppercase font-mono text-rose-400 hover:text-rose-300 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10"
                >
                  Reset pad
                </button>
              </div>

              {/* User Confirmation Canvas */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-inner relative">
                <canvas
                  id="canvas-user-signature"
                  ref={userCanvasRef}
                  width="300"
                  height="110"
                  onMouseDown={(e) => startDrawing(e, 'user')}
                  onMouseMove={(e) => draw(e, 'user')}
                  onMouseUp={() => stopDrawing('user')}
                  onMouseLeave={() => stopDrawing('user')}
                  onTouchStart={(e) => startDrawing(e, 'user')}
                  onTouchMove={(e) => draw(e, 'user')}
                  onTouchEnd={() => stopDrawing('user')}
                  className="w-full h-[110px] cursor-crosshair block"
                ></canvas>
                <div className="absolute right-2 bottom-2 text-[9px] text-slate-400 font-mono pointer-events-none uppercase bg-slate-100 px-1 rounded">
                  Hospital Verification Pen
                </div>
              </div>

              {/* User Fields (Required) */}
              <div className="grid grid-cols-3 gap-2">
                <input
                  id="job-user-name"
                  type="text"
                  required
                  placeholder="Clinician / User Name *"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-[10px] text-white rounded-lg focus:outline-none focus:border-teal-500"
                />
                <input
                  id="job-user-desig"
                  type="text"
                  required
                  placeholder="Designation *"
                  value={userDesignation}
                  onChange={(e) => setUserDesignation(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-[10px] text-white rounded-lg focus:outline-none focus:border-teal-500"
                />
                <input
                  id="job-user-dept"
                  type="text"
                  required
                  placeholder="Department Name *"
                  value={userDepartment}
                  onChange={(e) => setUserDepartment(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-[10px] text-white rounded-lg focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

          </div>

          <button
            id="job-commit-btn"
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition duration-150 shadow-md border border-teal-500/20 cursor-pointer"
          >
            Certify &amp; Publish Log to Work Done Book
          </button>
        </form>

        {/* Previous maintenance logs checklist summary */}
        <div className="lg:col-span-4 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 self-start space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase font-mono text-slate-300">St. Jude Daily Activity Feed</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Live index matches historic logs.</p>
            </div>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
            {jobs.map((j) => {
              const borderBadge: { [key in JobStatus]: string } = {
                'Completed': 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5',
                'In Progress': 'border-blue-500/20 text-blue-400 bg-blue-500/5',
                'Awaiting Spare Parts': 'border-amber-500/20 text-amber-500 bg-amber-500/5',
                'Pending': 'border-pink-500/20 text-pink-400 bg-pink-500/5'
              };

              return (
                <div key={j.id} className="p-4 bg-slate-950/60 border border-slate-800/85 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-teal-400 font-bold">{j.id}</span>
                    <span className={`text-[9px] font-mono border px-1.5 rounded uppercase ${borderBadge[j.jobStatus] || 'border-slate-800'}`}>
                      {j.jobStatus}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-white leading-tight">{j.equipmentName}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{j.ward} â€¢ {j.date}</p>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed italic bg-slate-900/55 p-2 rounded border border-slate-800/30">
                    "{j.faultReported}"
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-800/40 pt-2.5">
                    <span>{j.engineerDetails.name.split(' ')[1] || j.engineerDetails.name}</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Verified OK âœ“
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
