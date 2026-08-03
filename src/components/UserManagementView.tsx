import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as secondarySignOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppUser, UserRole } from '../types';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  Trash2,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Edit,
  Eye,
  X,
  RefreshCw,
  MoreVertical,
  Activity
} from 'lucide-react';

// Initialize a sandboxed secondary app to securely create email/password logins in Auth without signing out the Admin.
const getSecondaryAuth = () => {
  const secondaryAppName = 'bemms-secondary-creation';
  const existingApp = getApps().find(app => app.name === secondaryAppName);
  const app = existingApp || initializeApp(firebaseConfig, secondaryAppName);
  return getAuth(app);
};

export default function UserManagementView() {
  const { currentUser } = useApp();
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Modals & Action States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  // Form inputs for creation
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('engineer');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Biomedical Engineering Dept');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Form inputs for edits
  const [editFullName, setEditFullName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('engineer');
  const [editActive, setEditActive] = useState(true);

  // Logging & feedback states
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Unique departments for filter
  const departments = Array.from(new Set(usersList.map(u => u.department).filter(Boolean)));

  // Listen to Staff Directory in Firestore (real-time stream)
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list: AppUser[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data();
        list.push({
          ...item,
          email: item.email || docSnap.id,
          name: item.name || item.fullName || 'Registered Engineer'
        } as AppUser);
      });
      setUsersList(list);
      setLoading(false);
    }, (err) => {
      console.error("Failed to fetch users list", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Validation before user registration
  const validateCreateForm = (): string | null => {
    if (!fullName.trim()) return 'Staff Full Name is required';
    if (!email.trim()) return 'Email Address is required';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return 'Please enter a valid email address';
    
    if (!designation.trim()) return 'Clinical Designation is required';
    if (!department.trim()) return 'Hospital Department is required';
    
    if (!password) return 'Password is required for Email/Password credential creation';
    if (password.length < 8) return 'Password must be at least 8 characters long for HIPAA & ISO compliance';
    if (password !== confirmPassword) return 'Password confirmation and password values must match';
    
    return null;
  };

  // Submit User Registration
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    const validationAlert = validateCreateForm();
    if (validationAlert) {
      setActionError(validationAlert);
      return;
    }

    setSubmitting(true);
    const targetEmail = email.trim().toLowerCase();

    try {
      // 1. Verify Caller Authority
      const currentRole = currentUser?.role || 'engineer';
      if (currentRole !== 'admin' && currentRole !== 'head') {
        throw new Error('Unauthorized operational level. Only Admin and HOD can access User Management.');
      }
      
      // HOD restrictions
      if (currentRole === 'head' && role === 'admin') {
        throw new Error('Forbidden: Department Heads (HOD) cannot provision Admin accounts.');
      }

      // Check if user already exists
      const existingUser = usersList.find(u => u.email.toLowerCase() === targetEmail);
      if (existingUser) {
        throw new Error(`Account email (${targetEmail}) is already registered in BEMMS.`);
      }

      // 2. Provision in Firebase Auth via sandbox secondary app
      let targetUid = '';
      try {
        const secAuth = getSecondaryAuth();
        const credentials = await createUserWithEmailAndPassword(secAuth, targetEmail, password);
        targetUid = credentials.user.uid;
        await secondarySignOut(secAuth);
      } catch (authErr: any) {
        console.warn('Secondary-app credential provisioning failed:', authErr);

        if (authErr.code === 'auth/email-already-in-use') {
          // A sign-in credential already exists for this address. The real UID
          // is only obtainable server-side, so the profile is created without
          // one; AppContext backfills it when the staff member first signs in.
          targetUid = '';
        } else {
          throw new Error(`Authentication Provisioning Failed: ${authErr.message || authErr}`);
        }
      }

      // 3. Save Firestore catalog entry
      const userDocRef = doc(db, 'users', targetEmail);
      const newStaffRecord: AppUser = {
        uid: targetUid,
        email: targetEmail,
        name: fullName.trim(),
        fullName: fullName.trim(),
        role: role,
        designation: designation.trim(),
        department: department.trim(),
        active: isActive,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.uid || 'System Auto-Bootstrap',
        updatedAt: new Date().toISOString()
      };

      await setDoc(userDocRef, newStaffRecord);

      setActionSuccess(`BEMMS Access successfully authorized and configured for ${fullName} (${targetEmail})`);
      setShowCreateModal(false);
      resetCreateForm();
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to complete user registration.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit User Edits
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setActionError(null);
    setActionSuccess(null);
    
    if (!editFullName.trim() || !editDesignation.trim() || !editDepartment.trim()) {
      setActionError('All registration fields are required.');
      return;
    }

    setSubmitting(true);
    try {
      const currentRole = currentUser?.role || 'engineer';
      
      // HOD cannot update Admin users
      if (currentRole === 'head' && selectedUser.role === 'admin') {
        throw new Error('Forbidden: Department Heads (HOD) cannot modify System Administrators.');
      }

      // HOD cannot escalate user to Admin
      if (currentRole === 'head' && editRole === 'admin') {
        throw new Error('Forbidden: Department Heads (HOD) cannot assign Admin roles.');
      }

      const userDocRef = doc(db, 'users', selectedUser.email);
      const updatedFields = {
        name: editFullName.trim(),
        fullName: editFullName.trim(),
        designation: editDesignation.trim(),
        department: editDepartment.trim(),
        role: editRole,
        active: editActive,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userDocRef, updatedFields);
      setActionSuccess(`Updated staff record for ${editFullName} successfully.`);
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to update user parameters.');
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger User Password Reset
  const handleResetPassword = async (user: AppUser) => {
    setActionError(null);
    setActionSuccess(null);

    const currentRole = currentUser?.role || 'engineer';
    if (currentRole === 'head' && user.role === 'admin') {
      setActionError('Forbidden: HOD cannot initiate password resets for System Administrators.');
      return;
    }

    if (!window.confirm(`Send a password reset email to ${user.name} at ${user.email}?`)) {
      return;
    }

    setSubmitting(true);
    try {
      // Firebase Auth sends the reset email and owns the reset link, so no
      // server-side function is required for this to work.
      await sendPasswordResetEmail(auth, user.email);

      await updateDoc(doc(db, 'users', user.email), {
        updatedAt: new Date().toISOString()
      });

      setActionSuccess(`Password reset email sent to ${user.email}.`);
    } catch (err: any) {
      console.error(err);
      setActionError(
        err.code === 'auth/user-not-found'
          ? `${user.email} has a directory profile but no sign-in credential yet, so there is no password to reset.`
          : err.message || 'Failed to dispatch password reset invitation.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle user activation status
  const handleToggleActive = async (user: AppUser) => {
    setActionError(null);
    setActionSuccess(null);

    const currentRole = currentUser?.role || 'engineer';
    if (currentRole === 'head' && user.role === 'admin') {
      setActionError('Forbidden: HOD cannot toggle access for System Administrators.');
      return;
    }

    if (user.email === currentUser?.email) {
      setActionError('Operation Blocked: You cannot deactivate your own administrative session.');
      return;
    }

    try {
      const nextActiveState = !user.active;
      const userDocRef = doc(db, 'users', user.email);
      await updateDoc(userDocRef, {
        active: nextActiveState,
        updatedAt: new Date().toISOString()
      });

      setActionSuccess(`Access ${nextActiveState ? 'activated' : 'deactivated'} for ${user.name}.`);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to shift access status.');
    }
  };

  // Delete User from catalog
  const handleDeleteUser = async (user: AppUser) => {
    setActionError(null);
    setActionSuccess(null);

    const currentRole = currentUser?.role || 'engineer';

    if (user.email === currentUser?.email) {
      setActionError('Forbidden: You cannot delete your own administrative account.');
      return;
    }

    if (currentRole === 'head' && user.role === 'admin') {
      setActionError('Forbidden: Department Heads (HOD) cannot delete System Administrators.');
      return;
    }

    const verificationWord = 'DELETE';
    const confirmPrompt = window.prompt(`CRITICAL DE-AUTHORIZATION INITIATED!\n\nTo delete all asset histories, roles, and credential configurations for ${user.name} (${user.email}) permanently, type "${verificationWord}" below:`);

    if (confirmPrompt !== verificationWord) {
      setActionError('De-authorization abandoned. Input verification mismatched.');
      return;
    }

    setSubmitting(true);
    try {
      await deleteDoc(doc(db, 'users', user.email));
      setActionSuccess(`Permanently de-authorized and deleted directory access for ${user.name}.`);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to delete user directory.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setFullName('');
    setEmail('');
    setRole('engineer');
    setDesignation('');
    setDepartment('Biomedical Engineering Dept');
    setPassword('');
    setConfirmPassword('');
    setIsActive(true);
  };

  const openEditModal = (user: AppUser) => {
    setSelectedUser(user);
    setEditFullName(user.name || user.fullName || '');
    setEditDesignation(user.designation || '');
    setEditDepartment(user.department || 'Biomedical Engineering Dept');
    setEditRole(user.role || 'engineer');
    setEditActive(user.active !== false); // default to true if undefined
    setShowEditModal(true);
  };

  const openViewModal = (user: AppUser) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  // Filter application user list
  const filteredUsers = usersList.filter(user => {
    const nameMatch = (user.name || user.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const designationMatch = (user.designation || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSearch = nameMatch || emailMatch || designationMatch;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesDept = deptFilter === 'all' || user.department === deptFilter;
    
    const userIsActive = user.active !== false;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && userIsActive) || 
      (statusFilter === 'inactive' && !userIsActive);

    return matchesSearch && matchesRole && matchesStatus && matchesDept;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            <span>Biomedical Department Staff Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Securely register engineering staff, configure access structures, toggle status, and govern HIPAA audit keys.
          </p>
        </div>
        
        <button
          onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
          className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-slate-950 font-bold font-mono text-[11px] uppercase tracking-wider rounded-xl transition duration-150 flex items-center justify-center space-x-1.5 shadow-lg shadow-teal-950/20 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Authorize New Staff</span>
        </button>
      </div>

      {/* Success/Error Alerts */}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center space-x-3 text-left">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          <span className="font-medium">{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center space-x-3 text-left">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{actionSuccess}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 gap-4 flex flex-col md:flex-row items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-3.5 text-slate-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, email, designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full md:w-auto shrink-0">
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl p-3 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="all">Roles (All)</option>
            <option value="admin">System Admin</option>
            <option value="head">HOD / Chief</option>
            <option value="engineer">Bio-Engineer</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl p-3 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="all">Status (All)</option>
            <option value="active">Active Staff</option>
            <option value="inactive">Deactivated</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl p-3 focus:outline-none focus:border-teal-500 cursor-pointer col-span-2 sm:col-span-1"
          >
            <option value="all">Departments (All)</option>
            {departments.map((dept, idx) => (
              <option key={idx} value={dept}>{dept}</option>
            ))}
          </select>

        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-500 font-mono flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
            <span>Synchronizing secure BEMMS staff directories...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-500 font-mono italic">
            No matching registered hospital staff found.
          </div>
        ) : (
          <div>
            {/* Desktop-only view table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 font-mono uppercase text-slate-400 text-[10px] tracking-wider border-b border-slate-800">
                    <th className="p-4 lg:p-5">Staff Identity</th>
                    <th className="p-4 lg:p-5">Contact Email</th>
                    <th className="p-4 lg:p-5">Department Info</th>
                    <th className="p-4 lg:p-5">System Role</th>
                    <th className="p-4 lg:p-5 text-center">Status</th>
                    <th className="p-4 lg:p-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/10">
                  {filteredUsers.map((user) => {
                    const isActiveState = user.active !== false;
                    const isChiefAdmin = user.email === 'kuteyioluwaloyevincent291@gmail.com';
                    const currentRole = currentUser?.role || 'engineer';
                    const isSelf = user.email === currentUser?.email;
                    const disabledForHOD = currentRole === 'head' && user.role === 'admin';

                    return (
                      <tr key={user.email} className={`hover:bg-slate-900/50 transition duration-150 ${!isActiveState ? 'opacity-60 bg-slate-950/20' : ''}`}>
                        
                        {/* Name / Avatar / Designation */}
                        <td className="p-4 lg:p-5">
                          <div className="flex items-center space-x-3">
                            <div className={`w-9 h-9 rounded-lg bg-slate-950 border text-xs font-bold font-mono flex items-center justify-center shrink-0 uppercase ${
                              user.role === 'admin' 
                                ? 'text-amber-400 border-amber-500/20' 
                                : user.role === 'head' 
                                ? 'text-teal-400 border-teal-500/20' 
                                : 'text-indigo-400 border-indigo-500/20'
                            }`}>
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isSelf && (
                                  <span className="bg-teal-500/10 border border-teal-500/20 rounded px-1 text-[9px] font-mono text-teal-400">YOU</span>
                                )}
                              </div>
                              <div className="text-slate-400 font-mono text-[10px] mt-0.5">{user.designation}</div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="p-4 lg:p-5 font-mono text-slate-300 select-all">
                          {user.email}
                        </td>

                        {/* Department */}
                        <td className="p-4 lg:p-5 text-slate-300">
                          {user.department || 'Biomedical Dept'}
                        </td>

                        {/* Role Card */}
                        <td className="p-4 lg:p-5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-mono uppercase font-bold tracking-wider ${
                            user.role === 'admin'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : user.role === 'head'
                              ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          }`}>
                            {user.role}
                          </span>
                        </td>

                        {/* Active Status Badge */}
                        <td className="p-4 lg:p-5 text-center">
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={isSelf || disabledForHOD}
                            title={isSelf ? "Self deactivation disabled" : "Toggle active state"}
                            className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-semibold transition ${
                              isActiveState
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-950 text-slate-500 border border-slate-800'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <Activity className={`w-3 h-3 ${isActiveState ? 'animate-pulse text-emerald-400' : 'text-slate-600'}`} />
                            <span>{isActiveState ? 'Active' : 'Locked'}</span>
                          </button>
                        </td>

                        {/* Actions Column */}
                        <td className="p-4 lg:p-5 text-right space-x-1.5 shrink-0 whitespace-nowrap">
                          <button
                            onClick={() => openViewModal(user)}
                            className="p-1 px-1.5 hover:bg-slate-800 border border-transparent rounded transition text-slate-400 hover:text-white"
                            title="View clinical metadata"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => openEditModal(user)}
                            disabled={disabledForHOD}
                            className="p-1 px-1.5 hover:bg-slate-800 border border-transparent rounded transition text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Edit directory card"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleResetPassword(user)}
                            disabled={disabledForHOD}
                            className="p-1 px-1.5 hover:bg-slate-800 border border-transparent rounded transition text-slate-400 hover:text-teal-400 disabled:opacity-30"
                            title="Reset security passphrase"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={isSelf || disabledForHOD || isChiefAdmin}
                            className="p-1 px-1.5 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded transition text-slate-500 hover:text-rose-400 disabled:opacity-30"
                            title="Permanently remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile-only view card roster (shown on smaller responsive sizes) */}
            <div className="block lg:hidden divide-y divide-slate-800 bg-slate-900/5">
              {filteredUsers.map((user) => {
                const isActiveState = user.active !== false;
                const isChiefAdmin = user.email === 'kuteyioluwaloyevincent291@gmail.com';
                const currentRole = currentUser?.role || 'engineer';
                const isSelf = user.email === currentUser?.email;
                const disabledForHOD = currentRole === 'head' && user.role === 'admin';

                return (
                  <div 
                    key={user.email} 
                    className={`p-4 space-y-3 transition duration-150 ${
                      !isActiveState ? 'opacity-65 bg-slate-950/20' : 'bg-slate-900/10'
                    }`}
                  >
                    {/* Header: Identity, Avatar & Role */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg bg-slate-950 border text-xs font-bold font-mono flex items-center justify-center shrink-0 uppercase ${
                          user.role === 'admin' 
                            ? 'text-amber-400 border-amber-500/20' 
                            : user.role === 'head' 
                            ? 'text-teal-400 border-teal-500/20' 
                            : 'text-indigo-400 border-indigo-500/20'
                        }`}>
                          {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-white leading-tight truncate flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {isSelf && (
                              <span className="bg-teal-500/10 border border-teal-500/20 rounded px-1 text-[9px] font-mono text-teal-400 shrink-0">YOU</span>
                            )}
                          </h4>
                          <p className="text-slate-400 font-mono text-[10px] mt-0.5 truncate">{user.designation}</p>
                        </div>
                      </div>

                      {/* Role representation and Status */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-mono uppercase font-bold tracking-wider shrink-0 ${
                        user.role === 'admin'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : user.role === 'head'
                          ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      }`}>
                        {user.role}
                      </span>
                    </div>

                    {/* Meta: Email & Department */}
                    <div className="space-y-1 block leading-tight pt-1">
                      <div className="text-[11px] text-slate-300 font-mono flex items-center gap-1.5 select-all">
                        <span className="text-slate-500 font-bold">EMAIL:</span>
                        <span className="truncate">{user.email}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                        <span className="text-slate-500 font-bold">DEPT:</span>
                        <span className="truncate">{user.department || 'Biomedical Dept'}</span>
                      </div>
                    </div>

                    {/* Operational Footer Actions with Large Touch Targets */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/60 font-mono text-[11px]">
                      {/* Active Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user)}
                        disabled={isSelf || disabledForHOD}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
                          isActiveState
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-950 text-slate-500 border border-slate-800'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        style={{ minHeight: '38px' }}
                      >
                        <Activity className={`w-3 h-3 ${isActiveState ? 'animate-pulse text-emerald-400' : 'text-slate-600'}`} />
                        <span>{isActiveState ? 'Active ✓' : 'Locked ✕'}</span>
                      </button>

                      {/* Icon actions block with generous spacing */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openViewModal(user)}
                          className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800/80 rounded-xl transition text-slate-300 hover:text-white flex items-center justify-center"
                          style={{ minHeight: '40px', minWidth: '40px' }}
                          title="View clinical metadata"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => openEditModal(user)}
                          disabled={disabledForHOD}
                          className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800/80 rounded-xl transition text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center"
                          style={{ minHeight: '40px', minWidth: '40px' }}
                          title="Edit directory card"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleResetPassword(user)}
                          disabled={disabledForHOD}
                          className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800/80 rounded-xl transition text-slate-400 hover:text-teal-400 disabled:opacity-30 flex items-center justify-center"
                          style={{ minHeight: '40px', minWidth: '40px' }}
                          title="Reset security passphrase"
                        >
                          <Lock className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={isSelf || disabledForHOD || isChiefAdmin}
                          className="p-2.5 bg-rose-950/20 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 rounded-xl transition text-rose-400 disabled:opacity-30 flex items-center justify-center"
                          style={{ minHeight: '40px', minWidth: '40px' }}
                          title="Permanently remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-teal-500/10 rounded-xl text-teal-400 border border-teal-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Authorize Clinical Staff</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">CREATES SECURE ENCRYPTED KEY &amp; REGISTRY PATH</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRegisterUser} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Staff Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engr. Joseph Peters"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Email address */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Hospital Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. engineer@hospital.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Designation */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Clinical Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Clinical Engineer II"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Department */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Hospital Department *</label>
                  <input
                    type="text"
                    required
                    placeholder="Biomedical Engineering Dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Password field */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Security Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 8 compliant digits"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Confirm Password field */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Match password above"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Role Switcher */}
                <div className="sm:col-span-2 space-y-1.5 pt-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Access Authority Role</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRole('engineer')}
                      className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                        role === 'engineer' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Engineer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('head')}
                      className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                        role === 'head' ? 'bg-teal-500/10 text-teal-400 border-teal-500/25' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      HOD / Head
                    </button>
                    {currentUser?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => setRole('admin')}
                        className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                          role === 'admin' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        Super Admin
                      </button>
                    )}
                  </div>
                </div>

                {/* Active Switcher */}
                <div className="sm:col-span-2 py-2 flex items-center justify-between border-t border-slate-800/80 mt-2">
                  <div>
                    <h5 className="font-bold text-xs text-white">Active Operational Status</h5>
                    <p className="text-[10px] text-slate-400 font-mono">ENFORCE ACTIVE VERIFICATION TRIGGERS</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 rounded bg-slate-950 border-slate-800 text-teal-400 accent-teal-500 focus:outline-none"
                  />
                </div>

              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800/80 bg-slate-900 sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-3 border border-slate-800 rounded-xl text-slate-400 text-xs font-semibold hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:from-slate-800 disabled:to-slate-800 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider rounded-xl transition"
                >
                  {submitting ? 'Generating credentials...' : 'Register Directory Profile'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-teal-500/10 rounded-xl text-teal-400 border border-teal-500/20">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Modulate Access Card</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Staff Full Name</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Designation */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Clinical Designation</label>
                  <input
                    type="text"
                    required
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Department */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Hospital Department</label>
                  <input
                    type="text"
                    required
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Role Switcher */}
                <div className="sm:col-span-2 space-y-1.5 pt-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Access Authority Role</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditRole('engineer')}
                      className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                        editRole === 'engineer' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Engineer
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditRole('head')}
                      className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                        editRole === 'head' ? 'bg-teal-500/10 text-teal-400 border-teal-500/25' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      HOD / Head
                    </button>
                    {currentUser?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => setEditRole('admin')}
                        className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                          editRole === 'admin' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        Super Admin
                      </button>
                    )}
                  </div>
                </div>

                {/* Active Switcher */}
                <div className="sm:col-span-2 py-2 flex items-center justify-between border-t border-slate-800/85 mt-2">
                  <div>
                    <h5 className="font-bold text-xs text-white">Active Operational Status</h5>
                    <p className="text-[10px] text-slate-400 font-mono">DENY SESSIONS INSTANTLY IF DISABLED</p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={selectedUser.email === currentUser?.email}
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="w-5 h-5 rounded bg-slate-950 border-slate-800 text-teal-400 accent-teal-500 focus:outline-none disabled:opacity-40"
                  />
                </div>

              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800/80 bg-slate-900 sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-3 border border-slate-800 rounded-xl text-slate-400 text-xs font-semibold hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:from-slate-800 disabled:to-slate-800 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider rounded-xl transition"
                >
                  {submitting ? 'Applying parameters...' : 'Update Staff Profile'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-teal-500/10 rounded-xl text-teal-400 border border-teal-500/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Staff Audit Ledger Card</h3>
                  <p className="text-[9px] text-slate-550 font-mono">BEMMS INTEGRITY VERIFY DOCUMENT</p>
                </div>
              </div>
              <button onClick={() => setShowViewModal(false)} className="p-1.5 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content info mapping */}
            <div className="p-6 space-y-4 font-mono text-[11px]">
              
              <div className="space-y-1 pb-2 border-b border-slate-850">
                <span className="text-slate-500 uppercase font-bold">Full Staff Name:</span>
                <p className="text-white font-sans font-bold text-sm">{selectedUser.name || selectedUser.fullName}</p>
              </div>

              <div className="space-y-1 pb-2 border-b border-slate-850">
                <span className="text-slate-500 uppercase font-bold">HIPAA Auth Email:</span>
                <p className="text-teal-300 font-sans tracking-wide">{selectedUser.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-850">
                <div className="space-y-1">
                  <span className="text-slate-500 uppercase font-bold">Access Role:</span>
                  <div>
                    <span className="text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20 uppercase font-bold text-[9px]">{selectedUser.role}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 uppercase font-bold">Registry Status:</span>
                  <div>
                    <span className={`inline-flex px-1.5 py-0.5 rounded border uppercase font-bold text-[9px] ${
                      selectedUser.active !== false ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-950 border-slate-850 text-slate-650'
                    }`}>
                      {selectedUser.active !== false ? 'Active Staff' : 'Locked Access'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 pb-2 border-b border-slate-850">
                <span className="text-slate-500 uppercase font-bold block">Hospital Department:</span>
                <span className="text-white font-sans text-xs">{selectedUser.department || 'Biomedical Engineering'}</span>
              </div>

              <div className="space-y-1 pb-2 border-b border-slate-850">
                <span className="text-slate-500 uppercase font-bold block">Clinical Designation:</span>
                <span className="text-white font-sans text-xs">{selectedUser.designation}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-slate-500 uppercase font-bold block">Record ID:</span>
                  <span className="text-[9px] text-slate-400 font-mono block truncate select-all">{selectedUser.uid || 'unlinked'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 uppercase font-bold block">Created At:</span>
                  <p className="text-slate-350">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>

            </div>

            {/* Footer action Close */}
            <div className="p-4 bg-slate-950/40 border-t border-slate-850 text-right">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-755 text-xs font-bold rounded-xl transition"
              >
                Close Ledger
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
