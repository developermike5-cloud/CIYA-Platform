import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Search, Filter, Check, X, Trash2, Eye, EyeOff, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

function getFirestoreTime(timestamp: any): number {
  if (!timestamp) return 0;
  try {
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().getTime();
    }
    if (timestamp.seconds !== undefined) {
      return timestamp.seconds * 1000;
    }
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
  } catch (e) {
    console.error(e);
  }
  return 0;
}

function formatFirestoreDateTime(timestamp: any): string {
  if (!timestamp) return '-';
  try {
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleString();
    }
    if (timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString();
    }
  } catch (e) {
    console.error(e);
  }
  return '-';
}

interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  gender?: string;
  whatsapp?: string;
  state?: string;
  intent: string;
  experience: string;
  courseType?: string;
  pathwaySelection?: string;
  pathwayReason?: string;
  pathwayExperience?: string;
  recommendedPath: string;
  goal: string;
  availability: string;
  referralCode?: string;
  myReferralCode?: string;
  isActivated?: boolean;
  referralsCount?: number;
  approvalStatus?: string;
  adminCode?: string;
  isDashboardUnlocked?: boolean;
  createdAt: any;
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Clipboard copy state
  const onboardingUrl = `${window.location.origin}/onboarding`;
  const [copiedLink, setCopiedLink] = useState(false);
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(onboardingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filters
  const [filterState, setFilterState] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterApproval, setFilterApproval] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [sortDate, setSortDate] = useState('desc');

  // Actions Toggle & States
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, 'approve' | 'disapprove' | 'delete' | null>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Local states for activation code controls
  const [editingCodes, setEditingCodes] = useState<Record<string, string>>({});
  const [codeSuccessId, setCodeSuccessId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
        setUsers(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const uniqueStates = Array.from(new Set(users.map(u => u.state).filter(Boolean))).sort() as string[];
  const uniqueCourses = Array.from(new Set(users.map(u => u.courseType || u.pathwaySelection).filter(Boolean))).sort() as string[];

  // Action methods
  const handleApprove = async (userId: string) => {
    setActionLoading(prev => ({ ...prev, [userId]: 'approve' }));
    try {
      const userDoc = users.find(u => u.id === userId);
      const generatedCode = userDoc?.adminCode || `CIYA-${Math.floor(100000 + Math.random() * 900000)}`;
      await updateDoc(doc(db, 'users', userId), { 
        approvalStatus: 'Approved',
        adminCode: generatedCode
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, approvalStatus: 'Approved', adminCode: generatedCode } : u));
    } catch (error) {
      console.error("Error approving user application:", error);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleDisapprove = async (userId: string) => {
    setActionLoading(prev => ({ ...prev, [userId]: 'disapprove' }));
    try {
      await updateDoc(doc(db, 'users', userId), { approvalStatus: 'Disapproved' });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, approvalStatus: 'Disapproved' } : u));
    } catch (error) {
      console.error("Error disapproving user application:", error);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleUpdateAdminCode = async (userId: string, newCode: string) => {
    try {
      const codeToSet = newCode.trim().toUpperCase();
      if (!codeToSet) return;
      await updateDoc(doc(db, 'users', userId), { adminCode: codeToSet });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, adminCode: codeToSet } : u));
      setCodeSuccessId(userId);
      setTimeout(() => setCodeSuccessId(null), 2000);
    } catch (error) {
      console.error("Error setting custom adminCode:", error);
    }
  };

  const handleToggleDashboardUnlock = async (userId: string, currentUnlocked: boolean) => {
    try {
      const newStatus = !currentUnlocked;
      await updateDoc(doc(db, 'users', userId), { isDashboardUnlocked: newStatus });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isDashboardUnlocked: newStatus } : u));
    } catch (error) {
      console.error("Error toggling dashboard lock state:", error);
    }
  };

  const handleDeleteClick = async (userId: string) => {
    if (deleteConfirmId !== userId) {
      setDeleteConfirmId(userId);
      setTimeout(() => {
        setDeleteConfirmId(prev => prev === userId ? null : prev);
      }, 4000); // 4 seconds window to confirm
      return;
    }
    setDeleteConfirmId(null);
    setActionLoading(prev => ({ ...prev, [userId]: 'delete' }));
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(prev => prev.filter(u => u.id !== userId));
      if (expandedUserId === userId) setExpandedUserId(null);
    } catch (error) {
      console.error("Error deleting user application:", error);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const filteredUsers = useMemo(() => {
    let result = users.filter(u => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        (u.fullName?.toLowerCase() || '').includes(term) ||
        (u.email?.toLowerCase() || '').includes(term) ||
        (u.whatsapp?.toLowerCase() || '').includes(term) ||
        (u.state?.toLowerCase() || '').includes(term) ||
        (u.recommendedPath?.toLowerCase() || '').includes(term) ||
        (u.courseType?.toLowerCase() || '').includes(term)
      );

      const matchesState = filterState ? u.state === filterState : true;
      const matchesCourse = filterCourse ? (u.courseType === filterCourse || u.pathwaySelection === filterCourse) : true;
      const matchesStatus = filterStatus === 'activated' ? u.isActivated : filterStatus === 'pending' ? !u.isActivated : true;
      const matchesGender = filterGender ? (u.gender?.toLowerCase() === filterGender.toLowerCase()) : true;
      
      const appStatus = u.approvalStatus || 'Pending';
      const matchesApproval = filterApproval ? (
        filterApproval === 'pending' ? appStatus === 'Pending' :
        filterApproval === 'approved' ? appStatus === 'Approved' :
        filterApproval === 'disapproved' ? appStatus === 'Disapproved' : true
      ) : true;

      return matchesSearch && matchesState && matchesCourse && matchesStatus && matchesApproval && matchesGender;
    });

    result.sort((a, b) => {
      const dateA = getFirestoreTime(a.createdAt);
      const dateB = getFirestoreTime(b.createdAt);
      return sortDate === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [users, searchTerm, filterState, filterCourse, filterStatus, filterApproval, sortDate]);

  return (
    <div>
      {/* Onboarding Registration Link panel */}
      <div className="bg-indigo-50 border border-indigo-200/60 rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-indigo-900 tracking-tight">Invite New Students (Copy Onboarding Link) 👩‍💻</h2>
          <p className="text-sm text-indigo-700/90 leading-relaxed max-w-2xl">
            To register new qualified students, copy the onboarding link below and send it directly to them. They will be guided through the profile creation wizard to request registration review.
          </p>
          <div className="pt-2">
            <span className="inline-block bg-white border border-indigo-200 font-mono text-xs text-indigo-800 px-3.5 py-1.5 rounded-lg select-all shadow-inner">
              {onboardingUrl}
            </span>
          </div>
        </div>
        <button 
          onClick={handleCopyLink}
          className={`shrink-0 px-6 py-3.5 rounded-xl text-sm font-extrabold shadow-md transition-all duration-200 ${copiedLink ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/10 hover:-translate-y-0.5'}`}
        >
          {copiedLink ? 'Copied Invitation Link ✓' : 'Copy Onboarding Link'}
        </button>
      </div>

      <div className="flex flex-col mb-6 gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800">Students & Onboarding Stats</h1>
          
          <div className="relative w-full md:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search students..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 bg-white"
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-slate-500 font-medium mr-2">
            <Filter className="w-4 h-4" /> Filters:
          </div>
          
          <select 
            value={sortDate} 
            onChange={(e) => setSortDate(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
          >
            <option value="desc" className="text-slate-800">Date Registered (Newest)</option>
            <option value="asc" className="text-slate-800">Date Registered (Oldest)</option>
          </select>

          <select 
            value={filterApproval} 
            onChange={(e) => setFilterApproval(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
          >
            <option value="" className="text-slate-800">All Approvals</option>
            <option value="pending" className="text-slate-800">Pending Review</option>
            <option value="approved" className="text-slate-800">Approved Applications</option>
            <option value="disapproved" className="text-slate-800">Disapproved Applications</option>
          </select>

           <select 
            value={filterGender} 
            onChange={(e) => setFilterGender(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
          >
            <option value="" className="text-slate-800">All Genders</option>
            <option value="male" className="text-slate-800">Male</option>
            <option value="female" className="text-slate-800">Female</option>
          </select>

          <select 
            value={filterCourse} 
            onChange={(e) => setFilterCourse(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
          >
            <option value="" className="text-slate-800">All Path Options</option>
            {uniqueCourses.map(c => (
              <option key={c} value={c} className="text-slate-800">{c}</option>
            ))}
          </select>

          <select 
            value={filterState} 
            onChange={(e) => setFilterState(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
          >
            <option value="" className="text-slate-800">All States</option>
            {uniqueStates.map(s => (
              <option key={s} value={s} className="text-slate-800">{s}</option>
            ))}
          </select>
          
          {(filterState || filterCourse || filterStatus || filterApproval || filterGender || sortDate !== 'desc') && (
            <button 
              onClick={() => {
                setFilterState('');
                setFilterCourse('');
                setFilterStatus('');
                setFilterApproval('');
                setFilterGender('');
                setSortDate('desc');
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium ml-2"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-5 border-t-4 border-indigo-500">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Applicants</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{users.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-5 border-t-4 border-amber-500">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pending Review</h3>
          <p className="text-3xl font-bold text-amber-600 mt-1 cursor-pointer" onClick={() => setFilterApproval('pending')}>
            {users.filter(u => !u.approvalStatus || u.approvalStatus === 'Pending').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-5 border-t-4 border-emerald-500">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Approved Applicants</h3>
          <p className="text-3xl font-bold text-emerald-600 mt-1 cursor-pointer" onClick={() => setFilterApproval('approved')}>
            {users.filter(u => u.approvalStatus === 'Approved').length}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-5 border-t-4 border-rose-500">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Disapproved</h3>
          <p className="text-3xl font-bold text-rose-600 mt-1 cursor-pointer" onClick={() => setFilterApproval('disapproved')}>
            {users.filter(u => u.approvalStatus === 'Disapproved').length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Path Details</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Recommended Path</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Application Review</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredUsers.map((u) => {
                  const isUserExpanded = expandedUserId === u.id;
                  const isAppPending = !u.approvalStatus || u.approvalStatus === 'Pending';
                  
                  return (
                    <React.Fragment key={u.id}>
                      <tr className={`hover:bg-slate-50/50 transition-colors ${isUserExpanded ? 'bg-indigo-50/20' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 leading-tight mb-1">{u.fullName || '-'}</div>
                          <div className="text-slate-500 text-xs">{u.gender ? `${u.gender} • ` : ''}{u.state || '-'}</div>
                          {u.adminCode && (
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/60 rounded font-mono font-black text-xs select-all shadow-sm">
                                🔑 {u.adminCode}
                              </span>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(u.adminCode || '');
                                  alert(`Copied activation code: ${u.adminCode}`);
                                }}
                                className="text-[9px] text-slate-600 hover:text-slate-900 font-extrabold bg-slate-50 border border-slate-200/80 px-1.5 py-0.5 rounded cursor-pointer transition-all hover:bg-slate-100"
                                title="Copy Core Student Code"
                              >
                                Copy
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-800">
                          <div className="font-semibold text-xs text-indigo-900">{u.email}</div>
                          <div className="text-slate-600 text-xs mt-0.5 font-mono">{u.whatsapp || '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-900 font-medium text-xs break-words max-w-[200px] line-clamp-2" title={u.intent}>
                            {u.intent}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Level: {u.experience || 'None'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded bg-slate-100 text-slate-800">
                            {u.recommendedPath || '-'}
                          </span>
                          <div className="text-slate-500 text-xs mt-1">
                            <span className="font-semibold text-slate-700">{u.courseType || ''}</span>
                            {u.courseType && u.pathwaySelection ? ' - ' : ''}
                            {u.pathwaySelection || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {u.approvalStatus === 'Approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                            </span>
                          ) : u.approvalStatus === 'Disapproved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800">
                              <AlertCircle className="w-3.5 h-3.5" /> Disapproved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 animate-pulse">
                              <Clock className="w-3.5 h-3.5" /> Pending Review
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Expand Row details */}
                            <button 
                              onClick={() => setExpandedUserId(isUserExpanded ? null : u.id)}
                              title={isUserExpanded ? "Hide Details" : "Show Full Details"}
                              className={`p-1.5 rounded transition-all ${isUserExpanded ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                              {isUserExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>

                            {/* Approve */}
                            <button 
                              disabled={u.approvalStatus === 'Approved' || (actionLoading[u.id] !== undefined && actionLoading[u.id] !== null)}
                              onClick={() => handleApprove(u.id)}
                              title="Approve User Application"
                              className={`p-1.5 rounded transition-all ${
                                u.approvalStatus === 'Approved' 
                                  ? 'bg-emerald-50 text-emerald-300 cursor-not-allowed' 
                                  : 'bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>

                            {/* Disapprove */}
                            <button 
                              disabled={u.approvalStatus === 'Disapproved' || (actionLoading[u.id] !== undefined && actionLoading[u.id] !== null)}
                              onClick={() => handleDisapprove(u.id)}
                              title="Disapprove User Application"
                              className={`p-1.5 rounded transition-all ${
                                u.approvalStatus === 'Disapproved' 
                                  ? 'bg-rose-50 text-rose-300 cursor-not-allowed' 
                                  : 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100'
                              }`}
                            >
                              <X className="w-4 h-4 stroke-[3]" />
                            </button>

                            {/* Delete Button (Double click to confirm) */}
                            <button 
                              disabled={actionLoading[u.id] !== undefined && actionLoading[u.id] !== null}
                              onClick={() => handleDeleteClick(u.id)}
                              title={deleteConfirmId === u.id ? "Click again to confirm delete" : "Delete student record"}
                              className={`px-2 py-1.5 text-xs font-bold rounded transition-all duration-200 ${
                                deleteConfirmId === u.id 
                                  ? 'bg-rose-600 text-white animate-pulse' 
                                  : 'bg-slate-100 text-rose-600 border border-slate-200 hover:bg-rose-50'
                              }`}
                            >
                              {deleteConfirmId === u.id ? "Confirm?" : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable row: Question & Answers metadata */}
                      {isUserExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={6} className="px-6 py-4 border-t border-b border-indigo-100/50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                              <div className="space-y-1.5">
                                <h4 className="font-extrabold uppercase text-[10px] text-indigo-700 tracking-wider flex items-center gap-1 mb-1 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                                  <span>🎯</span> Motivation & Intent
                                </h4>
                                <p className="text-slate-700 text-xs leading-relaxed">
                                  <strong className="text-slate-800 font-semibold">What are you building CIYA Academy for?</strong> <br/>
                                  <span className="text-slate-600 italic bg-white p-2 rounded border border-slate-200 block mt-1">{u.intent || 'Not answered'}</span>
                                </p>
                                <p className="text-slate-700 text-xs leading-relaxed mt-2">
                                  <strong className="text-slate-800 font-semibold">Primary target learning goal:</strong> <br/>
                                  <span className="text-slate-600 italic bg-white p-2 rounded border border-slate-200 block mt-1">{u.goal || 'Not answered'}</span>
                                </p>
                              </div>

                              <div className="space-y-1.5">
                                <h4 className="font-extrabold uppercase text-[10px] text-teal-700 tracking-wider flex items-center gap-1 mb-1 bg-teal-50 px-2 py-0.5 rounded-md inline-block">
                                  <span>⚙️</span> Skills & Experience
                                </h4>
                                <p className="text-slate-700 text-xs leading-relaxed">
                                  <strong className="text-slate-800 font-semibold">Knowledge or tools/code background:</strong> <br/>
                                  <span className="text-slate-600 italic bg-white p-2 rounded border border-slate-200 block mt-1">{u.pathwayExperience || u.experience || 'Not answered'}</span>
                                </p>
                                <p className="text-slate-700 text-xs leading-relaxed mt-2">
                                  <strong className="text-slate-800 font-semibold">Reason for choosing this pathway:</strong> <br/>
                                  <span className="text-slate-600 italic bg-white p-2 rounded border border-slate-200 block mt-1">{u.pathwayReason || 'Not answered'}</span>
                                </p>
                              </div>

                              <div className="space-y-1.5">
                                <h4 className="font-extrabold uppercase text-[10px] text-pink-700 tracking-wider flex items-center gap-1 mb-1 bg-pink-50 px-2 py-0.5 rounded-md inline-block">
                                  <span>📋</span> Extra Metadata
                                </h4>
                                <div className="bg-white p-3 rounded border border-slate-200 space-y-2 text-xs">
                                  <div>
                                    <span className="text-slate-400 block font-bold text-[9px] uppercase">Commitment Availability</span>
                                    <span className="font-medium text-slate-800">{u.availability || 'Not answered'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-bold text-[9px] uppercase">Joined Date & Time</span>
                                    <span className="font-medium text-slate-800">
                                      {formatFirestoreDateTime(u.createdAt)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-bold text-[9px] uppercase">Path Routing & Details</span>
                                    <span className="font-medium text-slate-800">
                                      System suggested: <strong className="text-slate-900">{u.recommendedPath || '-'}</strong> <br/>
                                      Choice selections: <strong className="text-slate-900">{u.courseType || ''} {u.pathwaySelection ? `(${u.pathwaySelection})` : ''}</strong>
                                    </span>
                                  </div>

                                  <div className="pt-2.5 border-t border-slate-100 mt-2.5 space-y-2">
                                    <span className="text-slate-500 block font-bold text-[9px] uppercase tracking-wider">🔑 Training Activation Code</span>
                                    <div className="flex gap-2 items-center text-xs">
                                      <input 
                                        type="text"
                                        placeholder="No code set"
                                        value={editingCodes[u.id] !== undefined ? editingCodes[u.id] : (u.adminCode || '')}
                                        onChange={(e) => setEditingCodes(prev => ({ ...prev, [u.id]: e.target.value.toUpperCase() }))}
                                        className="bg-white border-2 border-slate-400 rounded px-2.5 py-1 text-xs font-mono font-bold text-slate-950 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-550/20 w-36 shadow-sm transition-all"
                                      />
                                      <button 
                                        onClick={() => handleUpdateAdminCode(u.id, editingCodes[u.id] !== undefined ? editingCodes[u.id] : (u.adminCode || ''))}
                                        className="text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-750 px-2.5 py-1.5 rounded transition-colors"
                                      >
                                        Save
                                      </button>
                                      
                                      <button 
                                        onClick={() => {
                                          const code = editingCodes[u.id] !== undefined ? editingCodes[u.id] : (u.adminCode || '');
                                          if (code) {
                                            navigator.clipboard.writeText(code);
                                            alert(`Copied activation code: ${code}`);
                                          }
                                        }}
                                        className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded transition-colors"
                                        title="Copy code to send to student"
                                        disabled={!(editingCodes[u.id] !== undefined ? editingCodes[u.id] : (u.adminCode || ''))}
                                      >
                                        Copy
                                      </button>
                                    </div>
                                    {codeSuccessId === u.id && (
                                      <span className="text-[10px] font-bold text-emerald-600 block">✓ Code saved successfully!</span>
                                    )}

                                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100/50 mt-1">
                                      <span className="text-slate-500 font-semibold">Dashboard Access:</span>
                                      <button
                                        onClick={() => handleToggleDashboardUnlock(u.id, u.isDashboardUnlocked === true)}
                                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                                          u.isDashboardUnlocked 
                                            ? 'bg-emerald-100 text-emerald-805' 
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {u.isDashboardUnlocked ? '🔓 Access Active (Lock)' : '🔒 Locked (Unlock)'}
                                      </button>
                                    </div>
                                  </div>

                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <div className="text-lg font-bold">No Applications Match Filter</div>
                      <div className="text-xs text-slate-400 mt-1">Try resetting or editing your filter search criteria.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
