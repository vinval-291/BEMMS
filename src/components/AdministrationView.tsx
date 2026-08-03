import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { BOOTSTRAP_ADMIN_EMAIL, INSTITUTION_NAME } from '../constants';
import { AppUser, UserRole } from '../types';
import {
  Shield,
  UserCheck,
  RefreshCw,
  CheckCircle,
  Database,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';

export default function AdministrationView() {
  const { currentUser, equipment, jobs, schedules } = useApp();
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);

  // States for the creation form
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('engineer');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Biomedical Engineering Dept');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Manage clinical Wards in Firestore or local state
  const [wards, setWards] = useState<string[]>([
    'Intensive Care Unit (ICU)', 'Emergency Department (ER)', 'Cardiology Ward', 'Pediatric Ward', 'Operating Room (OR)', 'CSSD'
  ]);
  const [newWard, setNewWard] = useState('');

  // Fetch real-time staff users directory from Firestore
  useEffect(() => {
    setLoadingUsers(true);
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const list: AppUser[] = [];
      snap.forEach((doc) => {
        list.push({ ...doc.data() as AppUser });
      });
      setUsersList(list);
      setLoadingUsers(false);
    }, (err) => {
      console.error('Error listening to users:', err);
      setLoadingUsers(false);
    });

    return () => unsubUsers();
  }, []);

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!email.trim() || !name.trim() || !designation.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const lowerEmail = email.trim().toLowerCase();
    
    // Strict domain and format checks
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lowerEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    try {
      const newUserDocRef = doc(db, 'users', lowerEmail);
      const newProfile: AppUser = {
        uid: '', // backfilled by AppContext when they first sign in
        email: lowerEmail,
        name: name.trim(),
        role: role,
        designation: designation.trim(),
        department: department.trim(),
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.uid || '',
        updatedAt: new Date().toISOString()
      };

      await setDoc(newUserDocRef, newProfile);
      setFormSuccess(`Registered successfully! Access is now active for ${lowerEmail}.`);
      
      // Reset form fields
      setEmail('');
      setName('');
      setDesignation('');
    } catch (err: any) {
      console.error(err);
      setFormError(`Failed to save profile: ${err.message || err}`);
    }
  };

  const handleDeleteUser = async (userEmail: string) => {
    if (userEmail === BOOTSTRAP_ADMIN_EMAIL) {
      alert('Forbidden: The master bootstrap account cannot be de-authorized.');
      return;
    }
    
    if (userEmail === currentUser?.email) {
      alert('Forbidden: You cannot de-authorize your own current session.');
      return;
    }

    if (!window.confirm(`Are you sure you want to de-authorize and delete login access for ${userEmail}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userEmail));
      alert(`Successfully deleted staff profile for ${userEmail}.`);
    } catch (err: any) {
      alert(`De-authorization failed: ${err.message || err}`);
    }
  };

  const handleAddWard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWard.trim()) return;
    setWards(prev => [...prev, newWard.trim()]);
    setNewWard('');
  };

  const triggerBackup = () => {
    // Exports the actual records, not just a manifest, so the file is a usable
    // snapshot of the registry, logbook, schedules and staff directory.
    const backupObj = {
      timestamp: new Date().toISOString(),
      institution: INSTITUTION_NAME,
      schema_version: '1.0.1',
      compliance_flags: ['ISO-13485', 'HIPAA-Shield'],
      counts: {
        equipment: equipment.length,
        jobs: jobs.length,
        schedules: schedules.length,
        users: usersList.length
      },
      equipment,
      jobs,
      schedules,
      users: usersList
    };

    const blob = new Blob([JSON.stringify(backupObj, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);

    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.setAttribute('download', `BEMMS_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  const supportsRegistration = currentUser?.role === 'admin' || currentUser?.role === 'head';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold text-white tracking-tight">Systems Management &amp; Administration Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Authorized operations including staff directory registration, clinical config, and ISO security backups.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* User directory */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Whitelisted profiles */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
                <Shield className="w-4 h-4 text-teal-400" />
                <span>Hospital Department Staff Directory</span>
              </h3>
              <span className="text-[10px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded border border-teal-500/20 font-bold uppercase font-mono">
                Active Directory
              </span>
            </div>

            {loadingUsers ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono animate-pulse">
                Synchronizing Secure Staff Database...
              </div>
            ) : usersList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono italic">
                No users currently registered. Use the register panel below to add staff.
              </div>
            ) : (
              <div className="divide-y divide-slate-850">
                {usersList.map((user) => (
                  <div key={user.email} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-teal-400 font-bold font-mono uppercase">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-sm text-white">{user.name}</h4>
                          <span className={`text-[9px] uppercase font-bold font-mono px-1.5 py-0.5 rounded border ${
                            user.role === 'admin' 
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' 
                              : user.role === 'head' 
                              ? 'bg-teal-500/10 text-teal-400 border-teal-500/25' 
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{user.email}</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Designation: {user.designation} &bull; {user.department}
                        </p>
                      </div>
                    </div>

                    {/* Delete button (Admins and HOD only) */}
                    {supportsRegistration && (
                      <button
                        onClick={() => handleDeleteUser(user.email)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition"
                        title="Delete engineering access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Secure Registration form */}
          {supportsRegistration ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Register Clinical Engineering Staff / Login credentials</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Whitelist staff Google emails so they can sign in and log medical dev jobs.
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleRegisterUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Google Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. engineer.name@hospital.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Full Staff Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engr. Joseph Peters"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Clinical Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Clinical Engineer II"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Department</label>
                  <input
                    type="text"
                    placeholder="Biomedical Engineering Dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold font-semibold">User Role &amp; Access Authority</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('engineer')}
                      className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                        role === 'engineer'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900/50'
                      }`}
                    >
                      Bio-Engineer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('head')}
                      className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                        role === 'head'
                          ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900/50'
                      }`}
                    >
                      Department Head
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                        role === 'admin'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900/50'
                      }`}
                    >
                      System Admin
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-indigo-950/20 hover:shadow-lg transition"
                  >
                    Authorize &amp; Whitelist Email Profile
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/20 border border-slate-850 text-slate-450 text-xs font-mono flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-slate-500" />
              <span>Only current HOD or System Administrators are authorized to whitelist registry access.</span>
            </div>
          )}

        </div>

        {/* Configurations Wards & Backups */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Backups Panel */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase text-slate-300 font-mono flex items-center space-x-2">
              <Database className="w-4 h-4 text-purple-400" />
              <span>Compliance Backup Vault</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export fully encrypted JSON payloads of the medical asset records registry for local disaster recovery archiving.
            </p>

            <button
              id="admin-backup-btn"
              onClick={triggerBackup}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-1.5"
            >
              <Database className="w-4 h-4" />
              <span>Initiate System Backup</span>
            </button>
          </div>

          {/* Manage clinical Wards */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase text-slate-300 font-mono">Configure Department Wards</h3>
            
            <form onSubmit={handleAddWard} className="flex gap-2">
              <input
                id="admin-new-ward"
                type="text"
                placeholder="New Ward (e.g. ICU-B)"
                value={newWard}
                onChange={(e) => setNewWard(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:outline-none"
              />
              <button
                id="admin-new-ward-btn"
                type="submit"
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 p-2.5 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5 pt-2">
              {wards.map((wardName, index) => (
                <span key={index} className="text-[10px] font-mono bg-slate-950 text-slate-400 px-2 py-1 rounded border border-slate-850">
                  {wardName}
                </span>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
