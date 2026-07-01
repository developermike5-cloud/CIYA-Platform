import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, getDoc, orderBy, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { db, auth, rtdb, handleFirestoreError, OperationType, getActiveDatabaseId, setActiveDatabaseId, triggerSystemSignal } from '../../firebase';
import { ref as dbRef, set as dbSet } from 'firebase/database';
import { Search, Filter, Check, X, Trash2, Eye, EyeOff, CheckCircle2, AlertCircle, Clock, Upload, RotateCcw, RefreshCw, Lock } from 'lucide-react';
import BrandingLogo from '../../components/BrandingLogo';
import { Course } from '../../types';

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
  ageRange?: string;
  educationLevel?: string;
  learningTool?: string;
  cohort?: string;
  completedCoursesOverride?: string[];
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Clipboard copy state
  const onboardingUrl = `https://ciyaacademy.netlify.app/dashboard`;
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
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCohort, setFilterCohort] = useState('All');
  const [filterAgeRange, setFilterAgeRange] = useState('');
  const [filterEducationLevel, setFilterEducationLevel] = useState('');
  const [filterLearningTool, setFilterLearningTool] = useState('');

  // Cohorts State
  const [cohortsConfig, setCohortsConfig] = useState<{ activeCohort: string; cohortsList: string[] }>({
    activeCohort: 'Cohort 1',
    cohortsList: ['Cohort 1']
  });
  const [newCohortName, setNewCohortName] = useState('');
  const [isCreatingCohort, setIsCreatingCohort] = useState(false);

  const handleCreateCohort = async () => {
    if (!newCohortName.trim()) {
      alert("Please enter a valid cohort name.");
      return;
    }
    const sanitized = newCohortName.trim();
    if (cohortsConfig.cohortsList.includes(sanitized)) {
      alert("This cohort already exists!");
      return;
    }
    setIsCreatingCohort(true);
    try {
      const updatedList = [...cohortsConfig.cohortsList, sanitized];
      const newActive = sanitized;
      
      await setDoc(doc(db, 'settings', 'cohorts'), {
        activeCohort: newActive,
        cohortsList: updatedList
      });
      setCohortsConfig({ activeCohort: newActive, cohortsList: updatedList });
      setNewCohortName('');
      alert(`Cohort "${sanitized}" created successfully! It is now the ACTIVE cohort for new registrations.`);
    } catch (err) {
      console.error("Error creating cohort:", err);
      alert("Failed to create cohort. Check administrative database permissions.");
    } finally {
      setIsCreatingCohort(false);
    }
  };

  const handleChangeActiveCohort = async (newActive: string) => {
    try {
      await setDoc(doc(db, 'settings', 'cohorts'), {
        activeCohort: newActive,
        cohortsList: cohortsConfig.cohortsList
      });
      setCohortsConfig(prev => ({ ...prev, activeCohort: newActive }));
      alert(`Active cohort updated to: ${newActive}`);
    } catch (err) {
      console.error("Error updating active cohort:", err);
      alert("Failed to update active cohort.");
    }
  };

  // Actions Toggle & States
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, 'approve' | 'disapprove' | 'delete' | null>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Local states for activation code controls
  const [editingCodes, setEditingCodes] = useState<Record<string, string>>({});
  const [codeSuccessId, setCodeSuccessId] = useState<string | null>(null);

  // Admins state & Super Admin check
  const [admins, setAdmins] = useState<string[]>([]);
  const [adminsData, setAdminsData] = useState<Record<string, { email: string, role?: string, permissions?: string[] }>>({});
  const [adminDrafts, setAdminDrafts] = useState<Record<string, { role: string, permissions: string[] }>>({});
  const [savingAdminId, setSavingAdminId] = useState<string | null>(null);
  const isSuperAdmin = auth.currentUser?.email === 'developermike5@gmail.com';

  const cachedUserStr = localStorage.getItem('ciya_cached_user');
  let userDetails: any = null;
  try {
    if (cachedUserStr) {
      userDetails = JSON.parse(cachedUserStr);
    }
  } catch (e) { }

  const isSuperAdminLocal = userDetails?.email === 'developermike5@gmail.com' || userDetails?.role === 'super_admin';
  const hasBrandingPermission = isSuperAdminLocal || userDetails?.permissions?.includes('manage_branding');

  // Logo upload state
  const [logoUploading, setLogoUploading] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<string | null>(() => {
    return localStorage.getItem('ciya_brand_logo');
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 250 * 1024) {
      alert("Please select an image smaller than 250KB to keep page loads lightning-fast.");
      return;
    }

    setLogoUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await setDoc(doc(db, 'settings', 'app'), {
          logo: base64String,
          updatedAt: serverTimestamp()
        }, { merge: true });

        localStorage.setItem('ciya_brand_logo', base64String);
        setCurrentLogo(base64String);
        alert("Website branding logo updated and synchronized successfully! 🎉");
      } catch (err) {
        console.error("Error saving brand logo to Firestore settings:", err);
        alert("Could not save branding logo to database settings. Check permission rules.");
      } finally {
        setLogoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = async () => {
    if (!window.confirm("Are you sure you want to reset to the default CIYA text logo?")) return;
    setLogoUploading(true);
    try {
      await setDoc(doc(db, 'settings', 'app'), {
        logo: null,
        updatedAt: serverTimestamp()
      }, { merge: true });
      localStorage.removeItem('ciya_brand_logo');
      setCurrentLogo(null);
      alert("Website logo reset to default.");
    } catch (err) {
      console.error("Error resetting brand logo:", err);
      alert("Error resetting logo.");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleToggleAdminStatus = async (targetUser: UserProfile) => {
    if (!isSuperAdmin) {
      alert("Only the super admin can manage administrator privileges.");
      return;
    }
    const isAdminCurrently = admins.includes(targetUser.id);
    try {
      if (isAdminCurrently) {
        if (targetUser.email === 'developermike5@gmail.com') {
          alert("Cannot demote the super admin!");
          return;
        }
        await deleteDoc(doc(db, 'admins', targetUser.id));
        setAdmins(prev => prev.filter(id => id !== targetUser.id));
        setAdminsData(prev => {
          const updated = { ...prev };
          delete updated[targetUser.id];
          return updated;
        });
        setAdminDrafts(prev => {
          const next = { ...prev };
          delete next[targetUser.id];
          return next;
        });
        alert(`${targetUser.fullName || 'User'} has been removed from CIYA admins.`);
      } else {
        const newAdmin = {
          email: targetUser.email,
          role: 'CIYA Admin',
          permissions: ['manage_courses'] // Default permission
        };
        await setDoc(doc(db, 'admins', targetUser.id), newAdmin);
        setAdmins(prev => [...prev, targetUser.id]);
        setAdminsData(prev => ({
          ...prev,
          [targetUser.id]: newAdmin
        }));
        alert(`${targetUser.fullName || 'User'} has been upgraded to a CIYA Admin! Now configure custom permissions and titles below, then click Save.`);
      }
    } catch (e) {
      console.error("Error managing admin privileges:", e);
      alert("Could not update admin privilege. Check database rules.");
    }
  };

  const getAdminRoleValue = (userId: string) => {
    if (adminDrafts[userId]?.role !== undefined) {
      return adminDrafts[userId].role;
    }
    return adminsData[userId]?.role || 'CIYA Admin';
  };

  const getAdminPermissionsValue = (userId: string) => {
    if (adminDrafts[userId]?.permissions !== undefined) {
      return adminDrafts[userId].permissions;
    }
    return adminsData[userId]?.permissions || [];
  };

  const handleDraftRoleChange = (userId: string, value: string) => {
    setAdminDrafts(prev => ({
      ...prev,
      [userId]: {
        role: value,
        permissions: getAdminPermissionsValue(userId)
      }
    }));
  };

  const handleDraftTogglePermission = (userId: string, permission: string) => {
    const currentList = getAdminPermissionsValue(userId);
    const updatedList = currentList.includes(permission)
      ? currentList.filter(p => p !== permission)
      : [...currentList, permission];
    setAdminDrafts(prev => ({
      ...prev,
      [userId]: {
        role: getAdminRoleValue(userId),
        permissions: updatedList
      }
    }));
  };

  const handleSaveAdminPrivileges = async (userId: string, email: string) => {
    const role = getAdminRoleValue(userId).trim();
    const permissions = getAdminPermissionsValue(userId);

    if (!role) {
      alert("Admin Role/Title cannot be empty.");
      return;
    }

    setSavingAdminId(userId);
    try {
      const updatedAdmin = {
        email: email,
        role: role,
        permissions: permissions
      };

      // 1. Save to admins collection in Firestore
      await setDoc(doc(db, 'admins', userId), updatedAdmin, { merge: true });

      // 2. Reflect on local state immediately
      setAdminsData(prev => ({
        ...prev,
        [userId]: updatedAdmin
      }));

      // 3. Clean up the draft state for this user
      setAdminDrafts(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });

      // 4. Update corresponding cached user session if they are the currently logged in admin user
      if (auth.currentUser?.uid === userId) {
        const currentCache = localStorage.getItem('ciya_cached_user');
        if (currentCache) {
          try {
            const parsed = JSON.parse(currentCache);
            parsed.permissions = permissions;
            parsed.adminRole = role;
            localStorage.setItem('ciya_cached_user', JSON.stringify(parsed));
          } catch (e) {}
        }
      }

      alert("Admin privileges and configuration updated and saved successfully!");
    } catch (err: any) {
      console.error("Error saving admin config:", err);
      alert("Failed to save admin privileges: " + err.message);
    } finally {
      setSavingAdminId(null);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchUsers = async (targetCohort: string, forceRefresh = false) => {
    let hasUsedCache = false;

    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      // Stale-while-revalidate: Load from cache instantly, namespaced by cohort, then fetch fresh in background
      const cacheKey = `ciya_admin_cached_users_list_${targetCohort}`;
      const cachedUsersStr = localStorage.getItem(cacheKey);
      const cachedAdminsStr = localStorage.getItem('ciya_admin_cached_admins_list');
      const cachedAdminsDataStr = localStorage.getItem('ciya_admin_cached_admins_data');

      if (cachedUsersStr && cachedAdminsStr && cachedAdminsDataStr) {
        try {
          setUsers(JSON.parse(cachedUsersStr));
          setAdmins(JSON.parse(cachedAdminsStr));
          setAdminsData(JSON.parse(cachedAdminsDataStr));
          setLoading(false);
          hasUsedCache = true;
          setIsRefreshing(true); // show subtle syncing indicator
        } catch (e) {
          console.warn("Could not parse cached users:", e);
        }
      }

      if (!hasUsedCache) {
        setLoading(true);
      }
    }

    try {
      // Fresh Firestore fetch (Restricted by targetCohort to streamline reads!)
      const q = (targetCohort && targetCohort !== 'All')
        ? query(collection(db, 'users'), where('cohort', '==', targetCohort))
        : query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
      
      // Sort in memory by createdAt descending to avoid requiring composite indexes on Firestore
      data.sort((a, b) => {
        const getMills = (fieldVal: any) => {
          if (!fieldVal) return 0;
          if (typeof fieldVal.toDate === 'function') {
            return fieldVal.toDate().getTime();
          }
          return new Date(fieldVal).getTime() || 0;
        };
        return getMills(b.createdAt) - getMills(a.createdAt);
      });
      setUsers(data);

      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const coursesData = coursesSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Course));
      setAllCourses(coursesData);

      const adminSnapshot = await getDocs(collection(db, 'admins'));
      const adminIds: string[] = [];
      const adminMap: Record<string, { email: string, role?: string, permissions?: string[] }> = {};
      adminSnapshot.docs.forEach(docSnap => {
        adminIds.push(docSnap.id);
        adminMap[docSnap.id] = (docSnap.data() || {}) as any;
      });
      setAdmins(adminIds);
      setAdminsData(adminMap);

      // Save to local cache namespaced by cohort
      const cacheKey = `ciya_admin_cached_users_list_${targetCohort}`;
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem('ciya_admin_cached_users_time', Date.now().toString());
      localStorage.setItem('ciya_admin_cached_admins_list', JSON.stringify(adminIds));
      localStorage.setItem('ciya_admin_cached_admins_data', JSON.stringify(adminMap));

    } catch (error) {
      if (!hasUsedCache || forceRefresh) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      } else {
        console.warn("Quiet background sync failed (could be Firestore quota limit):", error);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load cohorts config on mount, and set filterCohort to the active cohort as default
  useEffect(() => {
    const initCohorts = async () => {
      let active = 'Cohort 1';
      let list = ['Cohort 1'];
      try {
        const cohortsSnap = await getDoc(doc(db, 'settings', 'cohorts'));
        if (cohortsSnap.exists()) {
          const cData = cohortsSnap.data();
          active = cData.activeCohort || 'Cohort 1';
          list = cData.cohortsList || ['Cohort 1'];
        } else {
          // Initialize cohorts setting
          await setDoc(doc(db, 'settings', 'cohorts'), {
            activeCohort: 'Cohort 1',
            cohortsList: ['Cohort 1']
          });
        }
      } catch (cohortErr) {
        console.warn("Could not fetch settings/cohorts document:", cohortErr);
      }
      setCohortsConfig({ activeCohort: active, cohortsList: list });
      setFilterCohort(active); // This sets the selected active cohort as default and triggers the fetch
    };

    initCohorts();
  }, []);

  // Fetch users specifically for the selected filterCohort when it changes
  useEffect(() => {
    if (filterCohort) {
      fetchUsers(filterCohort, false);
    }
  }, [filterCohort]);

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
        adminCode: generatedCode,
        isDashboardUnlocked: true
      });
      await triggerSystemSignal('user_signals', userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, approvalStatus: 'Approved', adminCode: generatedCode, isDashboardUnlocked: true } : u));
    } catch (error) {
      console.error("Error approving user application:", error);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleDisapprove = async (userId: string) => {
    setActionLoading(prev => ({ ...prev, [userId]: 'disapprove' }));
    try {
      await updateDoc(doc(db, 'users', userId), { 
        approvalStatus: 'Disapproved',
        isDashboardUnlocked: false
      });
      await triggerSystemSignal('user_signals', userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, approvalStatus: 'Disapproved', isDashboardUnlocked: false } : u));
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
      await triggerSystemSignal('user_signals', userId);
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
      await triggerSystemSignal('user_signals', userId);
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

  const cohortFilteredUsers = useMemo(() => {
    return users.filter(u => {
      const uCohort = u.cohort || 'Cohort 1';
      return filterCohort === 'All' ? true : uCohort === filterCohort;
    });
  }, [users, filterCohort]);

  const filteredUsers = useMemo(() => {
    let result = cohortFilteredUsers.filter(u => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        (u.fullName?.toLowerCase() || '').includes(term) ||
        (u.email?.toLowerCase() || '').includes(term) ||
        (u.whatsapp?.toLowerCase() || '').includes(term) ||
        (u.state?.toLowerCase() || '').includes(term) ||
        (u.recommendedPath?.toLowerCase() || '').includes(term) ||
        (u.courseType?.toLowerCase() || '').includes(term) ||
        (u.ageRange?.toLowerCase() || '').includes(term) ||
        (u.educationLevel?.toLowerCase() || '').includes(term) ||
        (u.learningTool?.toLowerCase() || '').includes(term) ||
        (u.pathwaySelection?.toLowerCase() || '').includes(term) ||
        (u.pathwayReason?.toLowerCase() || '').includes(term) ||
        (u.pathwayExperience?.toLowerCase() || '').includes(term)
      );

      const matchesState = filterState ? u.state === filterState : true;
      const matchesCourse = filterCourse ? (u.courseType === filterCourse || u.pathwaySelection === filterCourse) : true;
      const matchesStatus = filterStatus === 'activated' ? u.isActivated : filterStatus === 'pending' ? !u.isActivated : true;
      const matchesGender = filterGender ? (u.gender?.toLowerCase() === filterGender.toLowerCase()) : true;
      
      const matchesAgeRange = filterAgeRange ? u.ageRange === filterAgeRange : true;
      const matchesEducationLevel = filterEducationLevel ? u.educationLevel === filterEducationLevel : true;
      const matchesLearningTool = filterLearningTool ? u.learningTool === filterLearningTool : true;

      const appStatus = u.approvalStatus || 'Pending';
      const matchesApproval = filterApproval ? (
        filterApproval === 'pending' ? appStatus === 'Pending' :
        filterApproval === 'approved' ? appStatus === 'Approved' :
        filterApproval === 'disapproved' ? appStatus === 'Disapproved' : true
      ) : true;

      let matchesDateRange = true;
      const timestamp = getFirestoreTime(u.createdAt);
      if (timestamp > 0) {
        // Formulate local YYYY-MM-DD string for comparison
        const itemDate = new Date(timestamp);
        const yyyy = itemDate.getFullYear();
        const mm = String(itemDate.getMonth() + 1).padStart(2, '0');
        const dd = String(itemDate.getDate()).padStart(2, '0');
        const itemDateStr = `${yyyy}-${mm}-${dd}`;

        if (filterStartDate && itemDateStr < filterStartDate) {
          matchesDateRange = false;
        }
        if (filterEndDate && itemDateStr > filterEndDate) {
          matchesDateRange = false;
        }
      } else {
        if (filterStartDate || filterEndDate) {
          matchesDateRange = false;
        }
      }

      return matchesSearch && matchesState && matchesCourse && matchesStatus && matchesApproval && matchesGender && matchesDateRange && matchesAgeRange && matchesEducationLevel && matchesLearningTool;
    });

    result.sort((a, b) => {
      const dateA = getFirestoreTime(a.createdAt);
      const dateB = getFirestoreTime(b.createdAt);
      return sortDate === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [cohortFilteredUsers, searchTerm, filterState, filterCourse, filterStatus, filterApproval, filterGender, sortDate, filterStartDate, filterEndDate, filterAgeRange, filterEducationLevel, filterLearningTool]);

  return (
    <div>
      {/* Database Instance Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">Active Firestore Database</h2>
            </div>
            <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">
              Your application is permanently connected to your dedicated, custom provisioned Firestore database (<strong className="text-indigo-400">{getActiveDatabaseId()}</strong>). All of your settings, student records, courses, and application forms are safely secured inside this instance.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-3 py-1.5 rounded-xl uppercase tracking-wider">
              Connected & Secure
            </span>
          </div>
        </div>
      </div>

      {/* Website Branding Settings */}
      {hasBrandingPermission && (
        <div className="space-y-4 mb-6 animate-fade-in">
          {/* Branding Logo Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-2xl">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">Branding Identity</h3>
              <p className="text-xs text-slate-500 font-semibold">Configure custom banner display logo across the main student workspace interface.</p>
            </div>
            <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-2xl border border-slate-700 shadow-inner shrink-0">
                <BrandingLogo size="xs" />
                {currentLogo && (
                  <button 
                    onClick={handleResetLogo}
                    title="Reset to default text logo"
                    className="p-1.5 hover:bg-slate-800 text-rose-450 hover:text-rose-355 rounded-lg transition-colors bg-transparent border-0 cursor-pointer ml-1 flex items-center justify-center"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
              <label className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wide rounded-xl shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 border-0 shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>{logoUploading ? "Uploading..." : "Upload Logo"}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoUpload} 
                  className="hidden" 
                  disabled={logoUploading}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Cohort Management Dashboard */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1 md:max-w-md">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>📦</span> Cohort Management
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Create student cohorts to group registrations and manage onboarding periods. New registrants are automatically assigned to the designated <strong className="text-indigo-600">Active Cohort</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
            {/* Create cohort input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New Cohort (e.g. Cohort 2)"
                value={newCohortName}
                onChange={(e) => setNewCohortName(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs text-slate-800 font-semibold w-full sm:w-48 bg-white"
              />
              <button
                onClick={handleCreateCohort}
                disabled={isCreatingCohort}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs uppercase tracking-wide rounded-xl shadow transition-all duration-150 disabled:opacity-50 shrink-0 border-0 cursor-pointer"
              >
                {isCreatingCohort ? "Creating..." : "Create"}
              </button>
            </div>

            {/* Change Active Cohort */}
            <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">Active Cohort:</span>
              <select
                value={cohortsConfig.activeCohort}
                onChange={(e) => handleChangeActiveCohort(e.target.value)}
                className="text-xs font-bold border border-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-700 bg-white"
              >
                {cohortsConfig.cohortsList.map(cohort => (
                  <option key={cohort} value={cohort}>{cohort}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col mb-6 gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-800">Students & Onboarding Stats</h1>
            <button
              onClick={() => fetchUsers(filterCohort, true)}
              disabled={isRefreshing}
              className={`p-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 cursor-pointer shadow-sm transition-all flex items-center gap-1.5 text-xs font-bold ${isRefreshing ? 'opacity-60 cursor-not-allowed' : ''}`}
              title="Force sync latest student data from Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-550' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
            </button>
          </div>
          
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
          
          {/* Cohort filter */}
          <select 
            value={filterCohort} 
            onChange={(e) => setFilterCohort(e.target.value)}
            className="text-sm border border-indigo-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-700 font-bold bg-white"
          >
            <option value="All" className="text-slate-800">All Cohorts (Aggregated)</option>
            {cohortsConfig.cohortsList.map(cohort => (
              <option key={cohort} value={cohort} className="text-slate-800">
                {cohort} {cohortsConfig.activeCohort === cohort ? "(Active)" : ""}
              </option>
            ))}
          </select>

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

          {/* Age range filter */}
          <select 
            value={filterAgeRange} 
            onChange={(e) => setFilterAgeRange(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
          >
            <option value="" className="text-slate-800">All Age Ranges</option>
            {['15-20', '21-25', '26-30', '31-35', '36+'].map(age => (
              <option key={age} value={age} className="text-slate-800">{age} years</option>
            ))}
          </select>

          {/* Education level filter */}
          <select 
            value={filterEducationLevel} 
            onChange={(e) => setFilterEducationLevel(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
          >
            <option value="" className="text-slate-800">All Education Levels</option>
            {['SSCE', 'Undergraduate', 'Graduate'].map(edu => (
              <option key={edu} value={edu} className="text-slate-800">{edu}</option>
            ))}
          </select>

          {/* Learning tool filter */}
          <select 
            value={filterLearningTool} 
            onChange={(e) => setFilterLearningTool(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
          >
            <option value="" className="text-slate-800">All Learning Tools</option>
            {['Mobile Phone', 'Laptop'].map(tool => (
              <option key={tool} value={tool} className="text-slate-800">{tool}</option>
            ))}
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

          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4 py-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Date range:</span>
            <input 
              type="date" 
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="text-xs border border-slate-300 rounded-md px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white outline-none"
              title="Start Registration Date"
            />
            <span className="text-xs text-slate-400">to</span>
            <input 
              type="date" 
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="text-xs border border-slate-300 rounded-md px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white outline-none"
              title="End Registration Date"
            />
          </div>
          
          {(filterState || filterCourse || filterStatus || filterApproval || filterGender || sortDate !== 'desc' || filterStartDate || filterEndDate || filterCohort !== 'All' || filterAgeRange || filterEducationLevel || filterLearningTool) && (
            <button 
              onClick={() => {
                setFilterState('');
                setFilterCourse('');
                setFilterStatus('');
                setFilterApproval('');
                setFilterGender('');
                setSortDate('desc');
                setFilterStartDate('');
                setFilterEndDate('');
                setFilterCohort('All');
                setFilterAgeRange('');
                setFilterEducationLevel('');
                setFilterLearningTool('');
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium ml-2 cursor-pointer border-0 bg-transparent outline-none"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-5 border-t-4 border-indigo-500">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Applicants</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{cohortFilteredUsers.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-5 border-t-4 border-amber-500">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pending Review</h3>
          <p className="text-3xl font-bold text-amber-600 mt-1 cursor-pointer" onClick={() => setFilterApproval('pending')}>
            {cohortFilteredUsers.filter(u => !u.approvalStatus || u.approvalStatus === 'Pending').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-5 border-t-4 border-emerald-500">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Approved Applicants</h3>
          <p className="text-3xl font-bold text-emerald-600 mt-1 cursor-pointer" onClick={() => setFilterApproval('approved')}>
            {cohortFilteredUsers.filter(u => u.approvalStatus === 'Approved').length}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-5 border-t-4 border-rose-500">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Disapproved</h3>
          <p className="text-3xl font-bold text-rose-600 mt-1 cursor-pointer" onClick={() => setFilterApproval('disapproved')}>
            {cohortFilteredUsers.filter(u => u.approvalStatus === 'Disapproved').length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">Showing {filteredUsers.length} of {cohortFilteredUsers.length} total students</span>
              {filterCohort !== 'All' && (
                <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                  Cohort: {filterCohort}
                </span>
              )}
            </div>
            {searchTerm && (
              <span className="text-xs text-slate-500 italic">
                Filtered by search: "{searchTerm}"
              </span>
            )}
          </div>
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
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
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
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
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
                                  <div>
                                    <span className="text-slate-400 block font-bold text-[9px] uppercase">Cohort Placement</span>
                                    <select
                                      value={u.cohort || 'Cohort 1'}
                                      onChange={async (e) => {
                                        const targetCohort = e.target.value;
                                        try {
                                          await updateDoc(doc(db, 'users', u.id), {
                                            cohort: targetCohort,
                                            updatedAt: serverTimestamp()
                                          });
                                          await triggerSystemSignal('user_signals', u.id);
                                          setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, cohort: targetCohort } : usr));
                                          alert(`Moved student to ${targetCohort} successfully!`);
                                        } catch (err) {
                                          console.error("Error moving student cohort:", err);
                                          alert("Failed to update cohort. Please try again.");
                                        }
                                      }}
                                      className="mt-1 bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 w-full outline-none"
                                    >
                                      {cohortsConfig.cohortsList.map(cohort => (
                                        <option key={cohort} value={cohort}>{cohort}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="col-span-full pt-3 border-t border-slate-100 mt-2">
                                    <span className="text-slate-500 block font-bold text-[9px] uppercase tracking-wider mb-2">🎓 Special Override: Course Completion</span>
                                    {allCourses.length === 0 ? (
                                      <p className="text-slate-400 text-xs italic">No courses in the system yet.</p>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {allCourses.map(course => {
                                          const isCompleted = u.completedCoursesOverride?.includes(course.id || '') || false;
                                          return (
                                            <div key={course.id} className="flex items-center justify-between bg-slate-50/50 p-2 rounded-xl border border-slate-200 text-xs">
                                              <span className="font-extrabold text-slate-800 truncate pr-2" title={course.title}>
                                                {course.title}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  try {
                                                    const currentCompleted = u.completedCoursesOverride || [];
                                                    let nextCompleted: string[];
                                                    if (isCompleted) {
                                                      nextCompleted = currentCompleted.filter(id => id !== course.id);
                                                    } else {
                                                      nextCompleted = [...currentCompleted, course.id || ''];
                                                    }
                                                    await updateDoc(doc(db, 'users', u.id), {
                                                      completedCoursesOverride: nextCompleted,
                                                      updatedAt: serverTimestamp()
                                                    });
                                                    await triggerSystemSignal('user_signals', u.id);
                                                    setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, completedCoursesOverride: nextCompleted } : usr));
                                                  } catch (err) {
                                                    console.error("Error overriding course complete:", err);
                                                    alert("Failed to update course override complete. Please try again.");
                                                  }
                                                }}
                                                className={`shrink-0 px-2 py-1 rounded text-[9px] font-black uppercase transition-all border-0 cursor-pointer ${
                                                  isCompleted 
                                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                                }`}
                                              >
                                                {isCompleted ? "✓ Completed" : "Mark Completed"}
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
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
                                      <span className="text-slate-500 font-semibold">User Role:</span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        u.email === 'developermike5@gmail.com'
                                          ? 'bg-purple-101 text-purple-800'
                                          : admins.includes(u.id)
                                            ? 'bg-indigo-101 text-indigo-805 animate-pulse'
                                            : 'bg-slate-101 text-slate-700'
                                      }`}>
                                        {u.email === 'developermike5@gmail.com'
                                          ? 'Super Admin 👑'
                                          : admins.includes(u.id)
                                            ? `${adminsData[u.id]?.role || 'CIYA Admin'} 💻`
                                            : 'Student 🎓'}
                                      </span>
                                    </div>

                                    {isSuperAdmin && u.email !== 'developermike5@gmail.com' && (
                                      <>
                                        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100/50 mt-1">
                                          <span className="text-slate-500 font-semibold">Admin Access:</span>
                                          <button
                                            onClick={() => handleToggleAdminStatus(u)}
                                            className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                              admins.includes(u.id)
                                                ? 'bg-rose-100 text-rose-800 hover:bg-rose-200' 
                                                : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                                            }`}
                                          >
                                            {admins.includes(u.id) ? '🔒 Revoke Admin Power' : '🔑 Upgrade to Admin'}
                                          </button>
                                        </div>

                                        {admins.includes(u.id) && (
                                          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 mt-2 space-y-2.5 text-left">
                                            <div className="flex flex-col gap-1">
                                              <div className="flex justify-between items-center bg-transparent border-0 select-none">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Custom Admin Role/Title</label>
                                                {adminDrafts[u.id] !== undefined && (
                                                  <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 animate-pulse">
                                                    UNSAVED EDITS ⚠️
                                                  </span>
                                                )}
                                              </div>
                                              <input
                                                type="text"
                                                className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-teal-500 w-full"
                                                placeholder="e.g. CIYA Admin, Content Editor"
                                                value={getAdminRoleValue(u.id)}
                                                onChange={(e) => handleDraftRoleChange(u.id, e.target.value)}
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Grant Specific Powers</span>
                                              <div className="space-y-1 text-xs text-slate-700">
                                                <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 select-none">
                                                  <input 
                                                    type="checkbox"
                                                    checked={getAdminPermissionsValue(u.id).includes('manage_courses')}
                                                    onChange={() => handleDraftTogglePermission(u.id, 'manage_courses')}
                                                    className="accent-indigo-600 rounded bg-white w-3.5 h-3.5"
                                                  />
                                                  Course Management
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 select-none">
                                                  <input 
                                                    type="checkbox"
                                                    checked={getAdminPermissionsValue(u.id).includes('manage_students')}
                                                    onChange={() => handleDraftTogglePermission(u.id, 'manage_students')}
                                                    className="accent-indigo-600 rounded bg-white w-3.5 h-3.5"
                                                  />
                                                  Student & Stats Management
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 select-none">
                                                  <input 
                                                    type="checkbox"
                                                    checked={getAdminPermissionsValue(u.id).includes('manage_branding')}
                                                    onChange={() => handleDraftTogglePermission(u.id, 'manage_branding')}
                                                    className="accent-indigo-600 rounded bg-white w-3.5 h-3.5"
                                                  />
                                                  Branding & Logo Management
                                                </label>
                                              </div>
                                            </div>

                                            <div className="pt-2 border-t border-slate-250 flex justify-end">
                                              <button
                                                type="button"
                                                disabled={savingAdminId === u.id}
                                                onClick={() => handleSaveAdminPrivileges(u.id, u.email)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-black transition-all border-none flex items-center gap-1 cursor-pointer outline-none ${
                                                  adminDrafts[u.id] !== undefined
                                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow shadow-emerald-600/25 ring-2 ring-emerald-450/15'
                                                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                                }`}
                                              >
                                                {savingAdminId === u.id ? (
                                                  <>
                                                    <span className="animate-spin inline-block w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full mr-1 animate-ping" />
                                                    Saving...
                                                  </>
                                                ) : adminDrafts[u.id] !== undefined ? (
                                                  "💾 Save Privileges"
                                                ) : (
                                                  "✓ Privileges Synced"
                                                )}
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100/50 mt-1">
                                      <span className="text-slate-500 font-semibold">Dashboard Access:</span>
                                      <button
                                        onClick={() => handleToggleDashboardUnlock(u.id, u.isDashboardUnlocked === true)}
                                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
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
