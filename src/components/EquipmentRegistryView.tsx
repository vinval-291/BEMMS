import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Equipment, EquipmentCategory, EquipmentStatus } from '../types';
import { INSTITUTION_SHORT_NAME } from '../constants';
import {
  Plus,
  Search,
  Sliders,
  QrCode,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clock,
  Trash2,
  Calendar,
  Layers,
  Camera,
  Layers3
} from 'lucide-react';
import QRCode from 'qrcode';

export default function EquipmentRegistryView() {
  const { equipment, addEquipment, deleteEquipment, currentUser } = useApp();
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // UI states
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingEquipment, setViewingEquipment] = useState<Equipment | null>(null);
  const [qrBlobUrl, setQrBlobUrl] = useState<string>('');

  // Form states for register
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>('Ventilator');
  const [manufacturer, setManufacturer] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [assetNumber, setAssetNumber] = useState('');
  const [ward, setWard] = useState('Intensive Care Unit (ICU)');
  // Blank by default and required on submit. Prefilled dates would otherwise be
  // saved verbatim onto assets they do not describe.
  const [installationDate, setInstallationDate] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>('Active');
  const [photoUrl, setPhotoUrl] = useState('');

  // Simulated scan state
  const [scanInputId, setScanInputId] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  const categories: EquipmentCategory[] = [
    'Ventilator', 'Defibrillator', 'ECG Machine', 'Ultrasound Machine', 'X-Ray Machine',
    'Patient Monitor', 'Infusion Pump', 'Syringe Pump', 'Autoclave', 'Laboratory Equipment', 'Other'
  ];

  const statuses: EquipmentStatus[] = ['Active', 'Under Repair', 'Decommissioned', 'Awaiting Spare Parts'];

  const wards = [
    'Intensive Care Unit (ICU)', 'Emergency Department (ER)', 'Cardiology Ward', 'Pediatric Ward',
    'Operating Room (OR)', 'Central Sterile Services Dept (CSSD)', 'General Medicine', 'Radiology Unit'
  ];

  // Compile QR Code data URL asynchronously whenever selection changes
  useEffect(() => {
    if (viewingEquipment) {
      QRCode.toDataURL(`bemms-equip:${viewingEquipment.id}`, { 
        width: 180,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#f1f5f9'
        }
      })
        .then(url => setQrBlobUrl(url))
        .catch(err => console.error('QR Compile Error: ', err));
    } else {
      setQrBlobUrl('');
    }
  }, [viewingEquipment]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !manufacturer || !modelNumber || !serialNumber || !assetNumber) {
      alert('Please fill out all required fields to register the equipment.');
      return;
    }
    if (!installationDate || !purchaseDate || !warrantyExpiryDate) {
      alert('Installation, purchase and warranty expiry dates are required for the asset record.');
      return;
    }

    try {
      const newId = await addEquipment({
        name,
        category,
        manufacturer,
        modelNumber,
        serialNumber,
        assetNumber,
        ward,
        installationDate,
        purchaseDate,
        warrantyExpiryDate,
        status,
        // Left blank when no photo was supplied; the registry renders a
        // placeholder rather than storing an unrelated stock image.
        photoUrl: photoUrl.trim(),
      });

      // Reset Form
      setName('');
      setManufacturer('');
      setModelNumber('');
      setSerialNumber('');
      setAssetNumber('');
      setInstallationDate('');
      setPurchaseDate('');
      setWarrantyExpiryDate('');
      setPhotoUrl('');
      setShowAddForm(false);

      alert(`Device registered successfully as ${newId}.`);
    } catch (err: any) {
      console.error('Equipment registration failed:', err);
      alert(`Could not register this device: ${err?.message || err}`);
    }
  };

  const handleSimulateScan = () => {
    setScanFeedback(null);
    const target = equipment.find(e => e.id.toLowerCase() === scanInputId.trim().toLowerCase() || e.assetNumber.toLowerCase() === scanInputId.trim().toLowerCase());
    if (target) {
      setViewingEquipment(target);
      setScanFeedback(`Successfully parsed QR code for Device ID: ${target.id}. Profile loaded!`);
      setScanInputId('');
      setScanOpen(false);
    } else {
      setScanFeedback('No matching equipment ID found. Enter a valid ID like \"EQ-0980\" or \"EQ-2001\" to simulate scanning the QR.');
    }
  };

  // Filter list
  const filteredEquipment = equipment.filter((eq) => {
    const textMatch =
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.assetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.ward.toLowerCase().includes(searchTerm.toLowerCase());
    
    const categoryMatch = categoryFilter === 'all' || eq.category === categoryFilter;
    const statusMatch = statusFilter === 'all' || eq.status === statusFilter;

    return textMatch && categoryMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header operations */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Active Medical Equipment Registry</h1>
          <p className="text-xs text-slate-400 mt-1">
            Register diagnostic gear, print compliance tracking QR codes, and browse physical allocations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="qr-scanner-btn"
            onClick={() => setScanOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs font-semibold rounded-xl border border-slate-800 hover:border-teal-500/20 transition flex items-center space-x-2"
          >
            <QrCode className="w-4 h-4 text-teal-400" />
            <span>Simulate QR Scan</span>
          </button>
          
          <button
            id="add-equipment-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Register Asset</span>
          </button>
        </div>
      </div>

      {/* Instant Scan Modal Simulation */}
      {scanOpen && (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase font-mono text-teal-400">QR Scanner Simulation Terminal</span>
            <button onClick={() => setScanOpen(false)} className="text-xs font-mono text-slate-500 hover:text-white">Close</button>
          </div>
          <div className="flex gap-2">
            <input
              id="qr-scan-input"
              type="text"
              placeholder="Type Device ID or Asset Number (e.g., EQ-0980)"
              value={scanInputId}
              onChange={(e) => setScanInputId(e.target.value)}
              className="flex-1 bg-slate-950 px-3 py-2 text-xs font-mono border border-slate-800 rounded-lg text-white focus:outline-none focus:border-teal-500"
            />
            <button
              onClick={handleSimulateScan}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 text-xs font-bold rounded-lg transition"
            >
              Verify Code
            </button>
          </div>
          {scanFeedback && (
            <p className="text-[11px] font-mono text-amber-300">{scanFeedback}</p>
          )}
        </div>
      )}

      {/* Equipment Register Form */}
      {showAddForm && (
        <form onSubmit={handleRegister} className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">New Device Registration Checklist</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-white font-mono"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Asset Name */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Equipment Name *</label>
              <input
                id="form-eq-name"
                type="text"
                required
                placeholder="e.g. Philips Avalon ECG Monitor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Category *</label>
              <select
                id="form-eq-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Manufacturer */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Manufacturer *</label>
              <input
                id="form-eq-manufacturer"
                type="text"
                required
                placeholder="e.g. GE Healthcare"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            {/* Model & Serial Numbers */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Model Number *</label>
              <input
                id="form-eq-model"
                type="text"
                required
                placeholder="e.g. MX-500"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Serial Number *</label>
              <input
                id="form-eq-serial"
                type="text"
                required
                placeholder="e.g. SN-829104820"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Hospital Asset Code *</label>
              <input
                id="form-eq-asset"
                type="text"
                required
                placeholder="e.g. HOSP-MON-942"
                value={assetNumber}
                onChange={(e) => setAssetNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            {/* Ward Allocation */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Ward / Department *</label>
              <select
                id="form-eq-ward"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
              >
                {wards.map(wd => (
                  <option key={wd} value={wd}>{wd}</option>
                ))}
              </select>
            </div>

            {/* Dates: Purchase, Installation, Warranty */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Installation Date</label>
              <input
                id="form-eq-inst-date"
                type="date"
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Warranty Expiry Date</label>
              <input
                id="form-eq-warranty"
                type="date"
                value={warrantyExpiryDate}
                onChange={(e) => setWarrantyExpiryDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
              />
            </div>

            {/* Status & Photo representation */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Initial Status</label>
              <select
                id="form-eq-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
              >
                {statuses.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Device Image URL (Optional)</label>
              <input
                id="form-eq-photo"
                type="text"
                placeholder="Optional — link to a photograph of this device"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

          </div>

          <button
            id="form-eq-submit-btn"
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition"
          >
            Authorized Database Record Creation
          </button>
        </form>
      )}

      {/* Filters bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/20 p-4 border border-slate-800/80 rounded-2xl">
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          <input
            id="registry-search"
            type="text"
            placeholder="Search Equipment ID, Model, Serial, Ward..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div>
          <select
            id="registry-filter-category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            id="registry-filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Device Statuses ({statuses.length})</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Equipment list grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Device catalog (List table/grid cards) */}
        <div className="md:col-span-8 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>SHOWING {filteredEquipment.length} BIOMEDICAL RECORDS</span>
            <span className="uppercase">{INSTITUTION_SHORT_NAME} HOSPITAL STORES</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredEquipment.map((eq) => {
              const borderColors: { [key in EquipmentStatus]: string } = {
                'Active': 'hover:border-emerald-500/30',
                'Under Repair': 'hover:border-rose-500/30 border-rose-900/10',
                'Decommissioned': 'hover:border-slate-500/30',
                'Awaiting Spare Parts': 'hover:border-amber-500/30 border-amber-900/10'
              };

              const pillColors: { [key in EquipmentStatus]: string } = {
                'Active': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                'Under Repair': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                'Decommissioned': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                'Awaiting Spare Parts': 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              };

              return (
                <div
                  key={eq.id}
                  id={`equip-card-${eq.id}`}
                  onClick={() => setViewingEquipment(eq)}
                  className={`bg-slate-900/30 border border-slate-800 p-5 rounded-2xl cursor-pointer hover:bg-slate-900/60 transition ${borderColors[eq.status]} flex flex-col justify-between space-y-4`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-teal-400 font-bold uppercase tracking-wider">{eq.id}</div>
                      <h3 className="font-bold text-sm text-white truncate mt-1">{eq.name}</h3>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{eq.modelNumber} • {eq.manufacturer}</p>
                    </div>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase shrink-0 font-bold ${pillColors[eq.status]}`}>
                      {eq.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-slate-800/60 pt-3 text-slate-400">
                    <div>
                      <span className="block text-slate-500">ASSET CODE</span>
                      <span className="text-white truncate block mt-0.5">{eq.assetNumber}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500">LOCATION</span>
                      <span className="text-white truncate block mt-0.5">{eq.ward.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredEquipment.length === 0 && (
              <div className="col-span-2 text-center py-12 bg-slate-900/10 border border-slate-800 rounded-2xl">
                <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-mono">No medical devices match validation filters.</p>
              </div>
            )}
          </div>
        </div>

        {/* Selected device details inspect & dynamic QR drawer - Desktop only */}
        <div className="hidden md:block md:col-span-4 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 self-start space-y-6">
          {viewingEquipment ? (
            <div className="space-y-6">
              
              {/* Photo & Identity header */}
              <div className="text-center space-y-3">
                <img
                  src={viewingEquipment.photoUrl || '/device-placeholder.svg'}
                  alt={viewingEquipment.name}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 object-cover rounded-2xl mx-auto border border-slate-800 bg-slate-950 p-1 bg-gradient-to-r from-teal-500/10 to-blue-500/10"
                />
                <div>
                  <span className="text-[10px] font-mono bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded border border-teal-500/20 font-bold uppercase block w-max mx-auto">
                    {viewingEquipment.id}
                  </span>
                  <h3 className="font-bold text-white text-base mt-2">{viewingEquipment.name}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">{viewingEquipment.category}</p>
                </div>
              </div>

              {/* Dynamic QR code using real library */}
              <div id="compiled-qr-panel" className="bg-white p-3.5 rounded-2xl max-w-[200px] mx-auto text-center border-4 border-slate-100/50 shadow-inner flex flex-col items-center">
                {qrBlobUrl ? (
                  <>
                    <img src={qrBlobUrl} alt="Device unique compliance code" className="w-30 h-30 object-contain mx-auto" />
                    <span className="text-[9px] font-mono text-slate-500 font-bold tracking-widest uppercase mt-2">Compliance ID</span>
                    <span className="text-[10px] font-mono text-slate-900 font-extrabold">{viewingEquipment.id}</span>
                  </>
                ) : (
                  <div className="h-30 flex items-center justify-center text-xs text-slate-400 font-mono">Compiling QR...</div>
                )}
              </div>

              {/* Extended fields */}
              <div className="space-y-3 text-xs border-t border-slate-800/80 pt-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Serial No.</span>
                  <span className="text-slate-300 font-mono">{viewingEquipment.serialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Asset No.</span>
                  <span className="text-slate-300 font-mono">{viewingEquipment.assetNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ward Name</span>
                  <span className="text-slate-300">{viewingEquipment.ward}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Install Date</span>
                  <span className="text-slate-300 font-mono">{viewingEquipment.installationDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Warranty Exp</span>
                  <span className="text-slate-300 font-mono">{viewingEquipment.warrantyExpiryDate}</span>
                </div>
              </div>

              {/* Admin delete capability */}
              {currentUser?.role === 'admin' && (
                <button
                  id="delete-asset-btn"
                  onClick={async () => {
                    if (confirm(`Do you authorize the permanent removal of equipment ${viewingEquipment.id} from the ${INSTITUTION_SHORT_NAME} primary archives?`)) {
                      await deleteEquipment(viewingEquipment.id);
                      setViewingEquipment(null);
                    }
                  }}
                  className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-xl transition font-mono text-xs flex items-center justify-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Authorized Deletion</span>
                </button>
              )}

            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 space-y-3">
              <QrCode className="w-10 h-10 mx-auto text-slate-600 animate-pulse" />
              <p className="text-xs font-mono">Select {INSTITUTION_SHORT_NAME} diagnostic equipment or scan QR above to index compliance timelines.</p>
            </div>
          )}
        </div>

      </div>

      {/* Selected device details inspect drawer for Mobile */}
      {viewingEquipment && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-950/80 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto space-y-6 relative animate-in slide-in-from-bottom duration-300">
            {/* Grabber */}
            <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto" />
            <button
              type="button"
              onClick={() => setViewingEquipment(null)}
              className="absolute right-4 top-2 p-2 text-slate-400 hover:text-white bg-slate-950 rounded-full border border-slate-800 transition text-[11px] font-mono hover:bg-slate-850"
              style={{ minHeight: '38px', minWidth: '38px' }}
            >
              ✕
            </button>

            <div className="space-y-5 pt-2">
              <div className="flex items-center space-x-3.5">
                <img
                  src={viewingEquipment.photoUrl || '/device-placeholder.svg'}
                  alt={viewingEquipment.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 object-cover rounded-xl border border-slate-800 bg-slate-950 shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-[10px] font-mono bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded border border-teal-500/20 font-bold uppercase block w-max">
                    {viewingEquipment.id}
                  </span>
                  <h3 className="font-bold text-white text-sm truncate mt-1">{viewingEquipment.name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{viewingEquipment.category}</p>
                </div>
              </div>

              {/* Dynamic QR code */}
              <div className="bg-white p-3 rounded-xl max-w-[160px] mx-auto text-center border border-slate-200 flex flex-col items-center">
                {qrBlobUrl ? (
                  <>
                    <img src={qrBlobUrl} alt="Compliance QR" className="w-28 h-28 object-contain mx-auto" />
                    <span className="text-[9px] font-mono text-slate-800 font-extrabold mt-1">{viewingEquipment.id}</span>
                  </>
                ) : (
                  <div className="h-28 flex items-center justify-center text-xs text-slate-400 font-mono">Compiling QR...</div>
                )}
              </div>

              {/* Extended fields */}
              <div className="space-y-2.5 text-[11px] border-t border-slate-800/80 pt-4 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Serial No.</span>
                  <span className="text-slate-300 font-bold">{viewingEquipment.serialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Asset No.</span>
                  <span className="text-slate-300 font-bold">{viewingEquipment.assetNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ward Name</span>
                  <span className="text-slate-300">{viewingEquipment.ward}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Install Date</span>
                  <span className="text-slate-300">{viewingEquipment.installationDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Warranty Exp</span>
                  <span className="text-slate-300">{viewingEquipment.warrantyExpiryDate}</span>
                </div>
              </div>

              {/* Admin delete capability */}
              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`Do you authorize the permanent removal of equipment ${viewingEquipment.id} from the ${INSTITUTION_SHORT_NAME} primary archives?`)) {
                      await deleteEquipment(viewingEquipment.id);
                      setViewingEquipment(null);
                    }
                  }}
                  className="w-full py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-xl transition font-mono text-xs flex items-center justify-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Authorized Deletion</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
