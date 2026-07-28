import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp, 
  collection, 
  query, 
  getDocs, 
  where, 
  updateDoc, 
  addDoc,
  deleteField
} from 'firebase/firestore';
import { db, auth, rtdb, triggerSystemSignal } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref as dbRef, set as dbSet } from 'firebase/database';
import { coursesStore } from '../../utils/coursesStore';
import { FRONTEND_YEAR_BADGE_SETTINGS } from '../../constants/badgeSettings';
import { 
  Lock, 
  Unlock, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle, 
  HelpCircle, 
  Settings, 
  Clock, 
  FileText, 
  Check, 
  RefreshCw, 
  Calendar, 
  Tag, 
  DollarSign, 
  Award, 
  CheckCircle2, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Zap,
  Activity
} from 'lucide-react';

import { uploadToCloudinary } from '../../utils/cloudinary';
import { safeStorage } from '../../utils/safeStorage';
import { generateTimeBasedCode, verifyTimeBasedCode, getPasscodeSecondsLeft } from '../../utils/passcode';
import CIYAMembershipBadge from '../../components/CIYAMembershipBadge';

interface LockedSections {
  courses: boolean;
  prompts: boolean;
  profile: boolean;
  notifications: boolean;
  assignments: boolean;
  kycb: boolean;
  blog: boolean;
}

interface AssignmentDaySetting {
  enabled: boolean;
  minChars: number;
  requireLink: boolean;
  minScreenshots: number;
  autoApprove: boolean;
  approvalDelay?: 'instant' | '10m' | '20m' | '30m' | '1h';
  approveComment: string;
  disapproveComment: string;
}

interface UnlockDaySetting {
  type: 'immediate' | 'date_time';
  unlockDateTime: string; // ISO format or datetime-local
}

interface BeginnersSettings {
  quizzesOverrideMode: 'default' | 'locked' | 'bypassed';
  timezone: string;
  triggerTime1: string;
  triggerTime2: string;
  triggerTime3: string;
  yearBadgeSettings: {
    enabled: boolean;
    requireForDay1: boolean;
    requireForDay4: boolean;
    price: number;
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    benefitText?: string;
    badgeImageUrl?: string;
    whatsappNumber?: string;
  };
  advancedCourseSettings?: {
    enabled: boolean;
    price: number;
    accountName: string;
    accountNumber: string;
    bankName: string;
    whatsappNumber: string;
    secretPasscode: string;
  };
  assignmentSettings: Record<string, AssignmentDaySetting>;
  unlockSettings?: Record<string, UnlockDaySetting>;
}

// 3 Hardcoded Beginner Courses
const BEGINNER_COURSES = [
  { id: 'najnq9llx', title: 'Building a Professional Portfolio Website', short: 'Portfolio Course' },
  { id: 'psw96tm5o', title: 'Building a Converting Landing Page', short: 'Landing Page' },
  { id: 'qlpspor4hm', title: 'Premium E-Commerce Website Development', short: 'E-Commerce' }
];

const INITIAL_ASSIGNMENT_SETTING: AssignmentDaySetting = {
  enabled: false,
  minChars: 100,
  requireLink: true,
  minScreenshots: 1,
  autoApprove: true,
  approvalDelay: 'instant',
  approveComment: "Excellent submission! All compliance checks passed automatically. Next day unlocked.",
  disapproveComment: "Submission failed compliance checks. Please ensure you have met the minimum word counts and screenshot counts."
};

export default function PortalLocksAdmin() {
  const [activeTab, setActiveTab] = useState<'locks' | 'beginners' | 'advanced' | 'approvals'>('locks');
  
  // Track all users for derived states (badge approvals and advanced enrollments)
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // Track unsaved changes to defer Firestore writes until manual Save Changes button is clicked
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = React.useRef(false);
  const dbStateRef = React.useRef<{ lockedSections: LockedSections; courseDaysLocks: Record<string, any>; beginnersSettings: BeginnersSettings } | null>(null);

  // Tab 1: Portal Locks state
  const [lockedSections, setLockedSections] = useState<LockedSections>({
    courses: false,
    prompts: false,
    profile: false,
    notifications: false,
    assignments: false,
    kycb: false,
    blog: false,
  });
  const [courseDaysLocks, setCourseDaysLocks] = useState<Record<string, 'locked' | 'unlocked' | 'default'>>({});
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  // Custom states for loading, confirmation modal, and notifications
  const [revokingKeys, setRevokingKeys] = useState<string[]>([]);
  const [confirmRevoke, setConfirmRevoke] = useState<{
    studentId: string;
    courseId: string;
    studentName: string;
    courseTitle: string;
  } | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToastMessage = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(current => current?.message === message ? null : current);
    }, 4500);
  };

  // Derived pending badge approvals
  const pendingUsers = React.useMemo(() => {
    const list = allUsers.filter(u => u.badgePaymentRequestStatus === 'PendingApproval');
    list.sort((a, b) => (b.badgePaymentRequestDate || 0) - (a.badgePaymentRequestDate || 0));
    return list;
  }, [allUsers]);

  // Derived advanced course student list
  const advancedStudents = React.useMemo(() => {
    const allStoreCourses = coursesStore.getCourses();
    const advCourseIds = new Set(
      allStoreCourses
        .filter(c => c.tier === 'advanced' || c.tier === 'masterclass' || c.level === 'Advanced' || c.level === 'Masterclass')
        .map(c => c.id)
    );
    
    const list: { studentId: string, name: string, email: string, courseId: string, courseTitle: string, unlockedAt: string }[] = [];
    
    allUsers.forEach(u => {
      if (u.progress) {
        Object.keys(u.progress).forEach(cId => {
          if (advCourseIds.has(cId)) {
            const course = allStoreCourses.find(c => c.id === cId);
            const progressData = u.progress[cId];
            list.push({
              studentId: u.id || u.uid,
              name: u.fullName || u.displayName || 'Unnamed Student',
              email: u.email || 'No email',
              courseId: cId,
              courseTitle: course?.title || 'Unknown Advanced Course',
              unlockedAt: progressData?.createdAt || progressData?.unlockedAt || ''
            });
          }
        });
      }
    });
    
    return list;
  }, [allUsers]);

  // Revoke advanced course access handler (triggers the modal)
  const handleRevokeAdvancedAccess = (studentId: string, courseId: string, studentName: string, courseTitle: string) => {
    setConfirmRevoke({ studentId, courseId, studentName, courseTitle });
  };

  // Performs the actual database write when confirmed
  const executeRevokeAdvancedAccess = async () => {
    if (!confirmRevoke) return;
    const { studentId, courseId, studentName, courseTitle } = confirmRevoke;
    const key = `${studentId}_${courseId}`;
    
    // Set loading indicator
    setRevokingKeys(prev => [...prev, key]);
    // Close confirmation modal
    setConfirmRevoke(null);
    
    try {
      const userRef = doc(db, 'users', studentId);
      await updateDoc(userRef, {
        [`progress.${courseId}`]: deleteField()
      });
      showToastMessage(`Successfully revoked ${studentName}'s access to "${courseTitle}".`, 'success');
    } catch (err) {
      console.error("Error revoking advanced access:", err);
      showToastMessage(`Failed to revoke access. Please try again.`, 'error');
    } finally {
      // Remove loading indicator
      setRevokingKeys(prev => prev.filter(k => k !== key));
    }
  };

  // Tab 2: Beginners Course Settings state
  const [beginnersSettings, setBeginnersSettings] = useState<BeginnersSettings>({
    quizzesOverrideMode: 'default',
    timezone: 'UTC+1',
    triggerTime1: '08:00',
    triggerTime2: '14:00',
    triggerTime3: '20:00',
    yearBadgeSettings: {
      enabled: true,
      requireForDay1: false,
      requireForDay4: true,
      price: 25000,
      accountName: 'CIYA Academy International Ltd',
      accountNumber: '1023948576',
      bankName: 'United Bank for Africa (UBA)',
      benefitText: '• Unlocks Day 4 and Day 5 high-income curriculum\n• Professional Certificate of Completion (PDF/Print)\n• Dedicated Masterclass Discord / WhatsApp Group\n• Direct 1-on-1 Admin Priority assignment reviews',
      badgeImageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500',
      whatsappNumber: '+2348123456789',
    },
    advancedCourseSettings: {
      enabled: true,
      price: 50000,
      accountName: 'CIYA Academy International Ltd',
      accountNumber: '1023948576',
      bankName: 'United Bank for Africa (UBA)',
      whatsappNumber: '+2349042544355',
      secretPasscode: 'CIYA_ADVANCED_PASSCODE_SECRET_2026',
    },
    assignmentSettings: {
      'day-0': { ...INITIAL_ASSIGNMENT_SETTING, minChars: 50 },
      'day-1': { ...INITIAL_ASSIGNMENT_SETTING, minChars: 100 },
      'day-2': { ...INITIAL_ASSIGNMENT_SETTING, minChars: 150 },
      'day-3': { ...INITIAL_ASSIGNMENT_SETTING, minChars: 150 },
      'day-4': { ...INITIAL_ASSIGNMENT_SETTING, minChars: 200 },
    },
    unlockSettings: {
      'day-0': { type: 'immediate', unlockDateTime: '' },
      'day-1': { type: 'immediate', unlockDateTime: '' },
      'day-2': { type: 'immediate', unlockDateTime: '' },
      'day-3': { type: 'immediate', unlockDateTime: '' },
      'day-4': { type: 'immediate', unlockDateTime: '' },
    }
  });

  // Simulated live local Nigeria time and counts for cron times
  const [nigeriaTime, setNigeriaTime] = useState<string>('');
  const [countdowns, setCountdowns] = useState<string[]>(['--', '--', '--']);
  const [gradingLogs, setGradingLogs] = useState<string[]>([]);
  const [gradingInProgress, setGradingInProgress] = useState(false);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    const docRef = doc(db, 'settings', 'app');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data?.updatedAt) {
          const t = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
          setLastSavedTime(t);
        }
        let locks: LockedSections = {
          courses: false,
          prompts: false,
          profile: false,
          notifications: false,
          assignments: false,
          kycb: false,
          blog: false,
        };
        if (data && data.lockedSections) {
          locks = {
            courses: !!data.lockedSections.courses,
            prompts: !!data.lockedSections.prompts,
            profile: !!data.lockedSections.profile,
            notifications: !!data.lockedSections.notifications,
            assignments: !!data.lockedSections.assignments,
            kycb: !!data.lockedSections.kycb,
            blog: !!data.lockedSections.blog,
          };
        }
        const courseLocks = data?.courseDaysLocks || {};
        
        const beginners: BeginnersSettings = {
          quizzesOverrideMode: data?.quizzesOverrideMode || 'default',
          timezone: data?.timezone || 'UTC+1',
          triggerTime1: data?.triggerTime1 || '08:00',
          triggerTime2: data?.triggerTime2 || '14:00',
          triggerTime3: data?.triggerTime3 || '20:00',
          yearBadgeSettings: {
            enabled: data?.yearBadgeSettings?.enabled ?? true,
            requireForDay1: data?.yearBadgeSettings?.requireForDay1 ?? false,
            requireForDay4: data?.yearBadgeSettings?.requireForDay4 ?? true,
            price: data?.yearBadgeSettings?.price ?? 25000,
            accountName: data?.yearBadgeSettings?.accountName ?? 'CIYA Academy International Ltd',
            accountNumber: data?.yearBadgeSettings?.accountNumber ?? '1023948576',
            bankName: data?.yearBadgeSettings?.bankName ?? 'United Bank for Africa (UBA)',
            benefitText: data?.yearBadgeSettings?.benefitText ?? '• Unlocks Day 4 and Day 5 high-income curriculum\n• Professional Certificate of Completion (PDF/Print)\n• Dedicated Masterclass Discord / WhatsApp Group\n• Direct 1-on-1 Admin Priority assignment reviews',
            badgeImageUrl: data?.yearBadgeSettings?.badgeImageUrl ?? 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500',
            whatsappNumber: data?.yearBadgeSettings?.whatsappNumber ?? '+2348123456789',
          },
          advancedCourseSettings: {
            enabled: data?.advancedCourseSettings?.enabled ?? true,
            price: data?.advancedCourseSettings?.price ?? 50000,
            accountName: data?.advancedCourseSettings?.accountName ?? 'CIYA Academy International Ltd',
            accountNumber: data?.advancedCourseSettings?.accountNumber ?? '1023948576',
            bankName: data?.advancedCourseSettings?.bankName ?? 'United Bank for Africa (UBA)',
            whatsappNumber: data?.advancedCourseSettings?.whatsappNumber ?? '+2349042544355',
            secretPasscode: data?.advancedCourseSettings?.secretPasscode ?? 'CIYA_ADVANCED_PASSCODE_SECRET_2026',
          },
          assignmentSettings: {
            'day-0': { ...INITIAL_ASSIGNMENT_SETTING, minChars: 50, ...(data?.assignmentSettings?.['day-0'] || {}) },
            'day-1': { ...INITIAL_ASSIGNMENT_SETTING, minChars: 100, ...(data?.assignmentSettings?.['day-1'] || {}) },
            'day-2': { ...INITIAL_ASSIGNMENT_SETTING, minChars: 150, ...(data?.assignmentSettings?.['day-2'] || {}) },
            'day-3': { ...INITIAL_ASSIGNMENT_SETTING, minChars: 150, ...(data?.assignmentSettings?.['day-3'] || {}) },
            'day-4': { ...INITIAL_ASSIGNMENT_SETTING, minChars: 200, ...(data?.assignmentSettings?.['day-4'] || {}) },
          },
          unlockSettings: {
            'day-0': { type: 'immediate', unlockDateTime: '', ...(data?.unlockSettings?.['day-0'] || {}) },
            'day-1': { type: 'immediate', unlockDateTime: '', ...(data?.unlockSettings?.['day-1'] || {}) },
            'day-2': { type: 'immediate', unlockDateTime: '', ...(data?.unlockSettings?.['day-2'] || {}) },
            'day-3': { type: 'immediate', unlockDateTime: '', ...(data?.unlockSettings?.['day-3'] || {}) },
            'day-4': { type: 'immediate', unlockDateTime: '', ...(data?.unlockSettings?.['day-4'] || {}) },
          }
        };

        dbStateRef.current = {
          lockedSections: locks,
          courseDaysLocks: courseLocks,
          beginnersSettings: beginners
        };

        if (!hasUnsavedChangesRef.current) {
          setLockedSections(locks);
          setCourseDaysLocks(courseLocks);
          setBeginnersSettings(beginners);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Error loading portal locks state:", error);
      setLoading(false);
    });

    // Fetch courses list for Day Lock selects
    const coursesQuery = query(collection(db, 'courses'));
    const coursesUnsubscribe = onSnapshot(coursesQuery, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setCourses(list);
      if (list.length > 0 && !selectedCourseId) {
        setSelectedCourseId(list[0].id);
      }
    });

    // Real-time user list listener from users collection
    setLoadingPending(true);
    const usersQuery = query(collection(db, 'users'));
    const usersUnsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAllUsers(list);
      setLoadingPending(false);
    }, (error) => {
      console.error("Error loading users list:", error);
      setLoadingPending(false);
    });

    return () => {
      authUnsubscribe();
      unsubscribe();
      coursesUnsubscribe();
      usersUnsubscribe();
    };
  }, []);

  // Timezone & Countdown loop
  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      
      // Calculate current Nigeria Time (UTC+1)
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const offset = 1; // Nigeria is UTC+1
      const ngTime = new Date(utc + (3600000 * offset));
      
      const formatTime = (d: Date) => {
        return d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      };
      setNigeriaTime(formatTime(ngTime));

      // Calculate countdowns to scheduled times
      const schedTimes = [
        beginnersSettings.triggerTime1,
        beginnersSettings.triggerTime2,
        beginnersSettings.triggerTime3
      ];

      const newCountdowns = schedTimes.map(tStr => {
        if (!tStr) return '--';
        const [hour, min] = tStr.split(':').map(Number);
        
        const targetDate = new Date(ngTime);
        targetDate.setHours(hour, min, 0, 0);

        if (targetDate.getTime() < ngTime.getTime()) {
          // If already past today, set to tomorrow
          targetDate.setDate(targetDate.getDate() + 1);
        }

        const diffMs = targetDate.getTime() - ngTime.getTime();
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);

        return `${diffHrs.toString().padStart(2, '0')}:${diffMins.toString().padStart(2, '0')}:${diffSecs.toString().padStart(2, '0')}`;
      });

      setCountdowns(newCountdowns);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, [beginnersSettings.triggerTime1, beginnersSettings.triggerTime2, beginnersSettings.triggerTime3]);

  // Local Portal Locks Draft Updates
  const handleToggleLock = (section: keyof LockedSections) => {
    setLockedSections((prev) => {
      const updated = {
        ...prev,
        [section]: !prev[section],
      };
      setHasUnsavedChanges(true);
      hasUnsavedChangesRef.current = true;
      return updated;
    });
  };

  // Day override locks (Local draft update)
  const handleUpdateDayLock = (courseId: string, dayIdx: number, mode: 'locked' | 'unlocked' | 'default') => {
    const updatedLocks = {
      ...courseDaysLocks,
      [`${courseId}_day-${dayIdx}`]: mode
    };
    setCourseDaysLocks(updatedLocks);
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
  };

  const handleGeneralBeginnerLockAll = (mode: 'locked' | 'unlocked' | 'default') => {
    const updatedLocks = { ...courseDaysLocks };
    
    BEGINNER_COURSES.forEach(c => {
      for (let dayIdx = 1; dayIdx <= 4; dayIdx++) { // Day 2 to Day 5 (index 1 to 4)
        updatedLocks[`${c.id}_day-${dayIdx}`] = mode;
      }
    });

    setCourseDaysLocks(updatedLocks);
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
    setGradingLogs(prev => [`[LOCK OVERRIDE] Draft: Set all Day 2-5 overrides across beginner courses to: "${mode.toUpperCase()}". Click "Save Changes" to sync.`, ...prev]);
  };

  // Unified Manual Save Changes to Cloud Firestore
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'app'), {
        lockedSections,
        courseDaysLocks,
        quizzesOverrideMode: beginnersSettings.quizzesOverrideMode,
        timezone: beginnersSettings.timezone,
        triggerTime1: beginnersSettings.triggerTime1,
        triggerTime2: beginnersSettings.triggerTime2,
        triggerTime3: beginnersSettings.triggerTime3,
        yearBadgeSettings: beginnersSettings.yearBadgeSettings,
        advancedCourseSettings: beginnersSettings.advancedCourseSettings || {
          enabled: true,
          price: 50000,
          accountName: 'CIYA Academy International Ltd',
          accountNumber: '1023948576',
          bankName: 'United Bank for Africa (UBA)',
          whatsappNumber: '+2349042544355',
          secretPasscode: 'CIYA_ADVANCED_PASSCODE_SECRET_2026',
        },
        assignmentSettings: beginnersSettings.assignmentSettings,
        unlockSettings: beginnersSettings.unlockSettings || {},
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (rtdb) {
        const rtdbPromise = dbSet(dbRef(rtdb, 'settings/app'), {
          lockedSections,
          updatedAt: Date.now()
        });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("RTDB Sync Timeout")), 1500)
        );
        Promise.race([rtdbPromise, timeoutPromise]).catch(err => {
          console.warn("RTDB settings synchronization timed out or failed (non-blocking):", err);
        });
      }

      await triggerSystemSignal('settings');
      setLastSavedTime(new Date());
      setHasUnsavedChanges(false);
      hasUnsavedChangesRef.current = false;
      
      // Update our stored reference of saved state
      dbStateRef.current = {
        lockedSections,
        courseDaysLocks,
        beginnersSettings
      };
      
      setGradingLogs(prev => [`[SUCCESS ✅] Admin settings successfully committed to Firestore!`, ...prev]);
    } catch (err) {
      console.error("Failed to save admin settings:", err);
      alert("Failed to save admin settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (!dbStateRef.current) return;
    if (window.confirm("Are you sure you want to discard your unsaved changes?")) {
      setLockedSections(dbStateRef.current.lockedSections);
      setCourseDaysLocks(dbStateRef.current.courseDaysLocks);
      setBeginnersSettings(dbStateRef.current.beginnersSettings);
      setHasUnsavedChanges(false);
      hasUnsavedChangesRef.current = false;
      setGradingLogs(prev => [`[DISCARDED ↩️] Restored draft settings to current cloud database state.`, ...prev]);
    }
  };

  // Helper evaluator used for automatic grading scan
  function evaluateComplianceAndGetStatus(
    config: AssignmentDaySetting,
    text: string,
    link: string,
    images: string[]
  ): { status: 'Approved' | 'Disapproved'; reason: string } {
    if (config.minChars && text.length < config.minChars) {
      return { 
        status: 'Disapproved', 
        reason: `Automated Compliance Reject: Submitted text is too short (${text.length}/${config.minChars} characters required).` 
      };
    }
    if (config.requireLink) {
      const urlPattern = /https?:\/\/[^\s/$.?#].[^\s]*/i;
      const hasUrl = urlPattern.test(text) || urlPattern.test(link || '');
      if (!hasUrl) {
        return { 
          status: 'Disapproved', 
          reason: `Automated Compliance Reject: Missing a valid reference URL link (http:// or https://).` 
        };
      }
    }
    if (config.minScreenshots && config.minScreenshots > 0) {
      if ((images || []).length < config.minScreenshots) {
        return { 
          status: 'Disapproved', 
          reason: `Automated Compliance Reject: Insufficient screenshots (${(images || []).length}/${config.minScreenshots} required).` 
        };
      }
    }
    return { 
      status: 'Approved', 
      reason: config.approveComment || "Excellent submission! All compliance checks passed automatically. Next day unlocked." 
    };
  }

  // Active client-side Cron scan implementation that executes immediately
  const triggerManualGradingScan = async () => {
    if (gradingInProgress) return;
    setGradingInProgress(true);
    setGradingLogs(prev => [`[Auto-Grade Scan] Initiating scanning of all PENDING student submissions...`, ...prev]);

    try {
      const pendingQuery = query(
        collection(db, 'assignments'),
        where('status', '==', 'Pending')
      );
      const snapshot = await getDocs(pendingQuery);
      
      if (snapshot.empty) {
        setGradingLogs(prev => [`[Auto-Grade Scan] Complete. No pending assignments found. Dashboard fully synchronized.`, ...prev]);
        setGradingInProgress(false);
        return;
      }

      let approvedCount = 0;
      let rejectedCount = 0;

      for (const docSnap of snapshot.docs) {
        const sub = docSnap.data();
        const subId = docSnap.id;
        
        // Only run auto-grading on beginner courses
        const isBeginnerCourse = BEGINNER_COURSES.some(c => c.id === sub.courseId);
        if (!isBeginnerCourse) continue;

        const dayKey = `day-${sub.dayIndex}`;
        const config = beginnersSettings.assignmentSettings[dayKey];

        // Only grade if the grading rule is enabled in settings
        if (!config || !config.enabled) {
          setGradingLogs(prev => [`[Auto-Grade Skip] Assignment ${subId} for Day ${sub.dayIndex + 1} skipped (Auto-grading toggle is off for this day).`, ...prev]);
          continue;
        }

        // If there is an auto-approval delay, check if it has elapsed
        const delayMode = config.approvalDelay || 'instant';
        if (delayMode !== 'instant' && sub.autoApproveAt) {
          const nowIso = new Date().toISOString();
          if (nowIso < sub.autoApproveAt) {
            setGradingLogs(prev => [`[Auto-Grade Delay] Assignment ${subId} for Day ${sub.dayIndex + 1} skipped (Scheduled approval delay has not expired yet).`, ...prev]);
            continue;
          }
        }

        // Unpack text & images
        let submittedText = sub.submittedText || '';
        let fileUrl = sub.fileUrl || '';
        let images = sub.images || [];

        if (submittedText.includes("---IMAGES_JSON---")) {
          const parts = submittedText.split("---IMAGES_JSON---");
          submittedText = parts[0].trim();
          try {
            images = JSON.parse(parts[1].trim());
          } catch (e) {
            // fallback
          }
        }

        const evalRes = evaluateComplianceAndGetStatus(config, submittedText, fileUrl, images);
        const finalStatus = evalRes.status;
        const finalReason = evalRes.status === 'Approved' ? (config.approveComment || "Excellent submission! All compliance checks passed and verified. Next day unlocked.") : evalRes.reason;

        // 1. Update assignment state in Firestore
        await updateDoc(doc(db, 'assignments', subId), {
          status: finalStatus,
          adminReason: finalReason,
          gradedBy: 'Academy Coordinator',
          gradedAt: serverTimestamp()
        });

        // Calculate next day unlock time message for student
        const nextDayKey = `day-${sub.dayIndex + 1}`;
        const nextUnlockSetting = beginnersSettings.unlockSettings?.[nextDayKey];
        let unlockTimeMsg = "";
        if (nextUnlockSetting && nextUnlockSetting.type === 'date_time' && nextUnlockSetting.unlockDateTime) {
          const dateObj = new Date(nextUnlockSetting.unlockDateTime);
          const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
          const formatted = dateObj.toLocaleDateString('en-US', options);
          unlockTimeMsg = ` Your next course (Day ${sub.dayIndex + 2}) will unlock on ${formatted}.`;
        } else {
          unlockTimeMsg = ` Your next course (Day ${sub.dayIndex + 2}) is now unlocked.`;
        }

        // 2. Dispatch Student Alert Notification
        await addDoc(collection(db, 'notifications'), {
          userId: sub.userId,
          title: finalStatus === 'Approved' ? `Assignment Approved! 🎉` : `Correction Required ❌`,
          message: finalStatus === 'Approved' 
            ? `Your assignment for Day ${sub.dayIndex + 1} has been reviewed and approved! Keep up the excellent work!${unlockTimeMsg}` 
            : `Your assignment for Day ${sub.dayIndex + 1} needs correction: "${finalReason}". Please address this and resubmit.`,
          type: 'assignment_graded',
          isRead: false,
          triggeredBy: 'Academy Coordinator',
          createdAt: serverTimestamp()
        });

        // 3. Update Student progress profile in users collection
        try {
          const submissionData = {
            text: submittedText,
            link: fileUrl,
            images: images,
            submittedAt: new Date().toISOString(),
            status: finalStatus,
            adminReason: finalReason
          };
          await updateDoc(doc(db, 'users', sub.userId), {
            [`progress.${sub.courseId}.submissions.${dayKey}`]: submissionData,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.warn("Soft handling error updating user progress:", err);
        }

        await triggerSystemSignal('user_signals', sub.userId);

        if (finalStatus === 'Approved') {
          approvedCount++;
          setGradingLogs(prev => [`[APPROVED ✅] Student "${sub.userName}" - Day ${sub.dayIndex + 1} (${sub.userEmail})`, ...prev]);
        } else {
          rejectedCount++;
          setGradingLogs(prev => [`[REJECTED ❌] Student "${sub.userName}" - Day ${sub.dayIndex + 1} (${sub.userEmail}) - Reason: ${finalReason}`, ...prev]);
        }
      }

      setGradingLogs(prev => [`[Auto-Grade Scan] Complete! Processed: Approved ${approvedCount}, Disapproved/Rejected ${rejectedCount}.`, ...prev]);
    } catch (e: any) {
      console.error(e);
      setGradingLogs(prev => [`[ERROR 🚨] Grading scan failed: ${e.message || String(e)}`, ...prev]);
    } finally {
      setGradingInProgress(false);
    }
  };

  const handleUpdateAssignmentSetting = (dayKey: string, field: keyof AssignmentDaySetting, value: any) => {
    const updated = {
      ...beginnersSettings,
      assignmentSettings: {
        ...beginnersSettings.assignmentSettings,
        [dayKey]: {
          ...beginnersSettings.assignmentSettings[dayKey],
          [field]: value
        }
      }
    };
    setBeginnersSettings(updated);
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
  };

  const handleUpdateUnlockSetting = (dayKey: string, field: 'type' | 'unlockDateTime', value: any) => {
    const updated = {
      ...beginnersSettings,
      unlockSettings: {
        ...(beginnersSettings.unlockSettings || {}),
        [dayKey]: {
          ...(beginnersSettings.unlockSettings?.[dayKey] || { type: 'immediate', unlockDateTime: '' }),
          [field]: value
        }
      }
    };
    setBeginnersSettings(updated);
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
  };

  const handleUpdateYearBadgeSetting = (field: keyof BeginnersSettings['yearBadgeSettings'], value: any) => {
    const updated = {
      ...beginnersSettings,
      yearBadgeSettings: {
        ...beginnersSettings.yearBadgeSettings,
        [field]: value
      }
    };
    setBeginnersSettings(updated);
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
  };

  const handleUpdateAdvancedCourseSetting = (field: string, value: any) => {
    const updated = {
      ...beginnersSettings,
      advancedCourseSettings: {
        ...(beginnersSettings.advancedCourseSettings || {
          enabled: true,
          price: 50000,
          accountName: 'CIYA Academy International Ltd',
          accountNumber: '1023948576',
          bankName: 'United Bank for Africa (UBA)',
          whatsappNumber: '+2349042544355',
          secretPasscode: 'CIYA_ADVANCED_PASSCODE_SECRET_2026',
        }),
        [field]: value
      }
    };
    setBeginnersSettings(updated);
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploadRes = await uploadToCloudinary(file, 'badges');
      const publicUrl = uploadRes.url;
      handleUpdateYearBadgeSetting('badgeImageUrl', publicUrl);
      setGradingLogs(prev => [`[CLOUDINARY ✅] Badge image uploaded successfully: ${publicUrl}`, ...prev]);
    } catch (err: any) {
      console.error(err);
      alert("Failed to upload image to Cloudinary. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-500 uppercase tracking-widest text-xs font-mono">
        <div className="animate-spin text-teal-600 mr-2 text-base">⏳</div> Loading system portal controls...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-left py-4 px-2" id="portal-locks-admin-container">
      
      {/* Upper Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center border-b border-slate-200 gap-2">
        <div className="flex">
          <button
            onClick={() => setActiveTab('locks')}
            className={`px-6 py-3.5 font-extrabold text-sm tracking-tight cursor-pointer border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'locks'
                ? 'border-indigo-650 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            General Portal Locks
          </button>
          <button
            onClick={() => setActiveTab('beginners')}
            className={`px-6 py-3.5 font-extrabold text-sm tracking-tight cursor-pointer border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'beginners'
                ? 'border-indigo-650 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4 text-indigo-650" />
            Beginners Course Settings
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`px-6 py-3.5 font-extrabold text-sm tracking-tight cursor-pointer border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'advanced'
                ? 'border-indigo-650 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            Advanced Course Settings
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-6 py-3.5 font-extrabold text-sm tracking-tight cursor-pointer border-b-2 transition-all flex items-center gap-2 relative ${
              activeTab === 'approvals'
                ? 'border-indigo-650 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            Pending Badge Approvals
            {pendingUsers.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white animate-pulse">
                {pendingUsers.length}
              </span>
            )}
          </button>
        </div>
        
        {lastSavedTime && (
          <div className="text-[11px] font-mono font-semibold text-slate-500 flex items-center gap-1.5 ml-auto sm:pr-4 py-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Last Action Saved: {lastSavedTime.toLocaleDateString()} {lastSavedTime.toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {activeTab === 'locks' ? (
        <div className="space-y-8">
          {/* Header card with glass effect */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="inline-block bg-amber-500 text-teal-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  🛡️ Operations Control
                </span>
                <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                  Student Portal Locks & Safeguards
                </h1>
                <p className="text-xs text-indigo-150 opacity-90 leading-relaxed font-semibold max-w-2xl">
                  Instantly toggle locking parameters for individual Student Dashboard views. When locked, students will view a polished, stylized Lock screen explaining of cohort schedules or administrator lock restrictions.
                </p>
              </div>
              <div className="md:text-right shrink-0">
                <div className={`inline-flex items-center gap-1 text-[10px] font-mono px-3 py-1.5 rounded-full ${saving ? 'bg-amber-500/15 text-amber-300' : 'bg-green-500/15 text-green-300 border border-green-505/20'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${saving ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`}></span>
                  {saving ? 'Syncing DB...' : 'Firestore Active'}
                </div>
              </div>
            </div>
          </div>

          {/* Main Locks Grid list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                key: 'courses' as keyof LockedSections,
                title: 'Explore Courses Arena',
                description: 'Governs access to system daily courses catalog, training sessions, mini-videos, study guides, and comprehension checks.',
                badgeText: 'Syllabus & Coursework',
              },
              {
                key: 'assignments' as keyof LockedSections,
                title: 'Assignment Submission Desk',
                description: 'Governs student access to the dedicated space where assignments across all modules can be compiled, submitted and tracked.',
                badgeText: 'Submissions Desk',
              },
              {
                key: 'prompts' as keyof LockedSections,
                title: 'Website Prompt Generator Lab',
                description: 'Governs client access to the interactive AI landing blueprints compiling assistant.',
                badgeText: 'AI Utilities Tools',
              },
              {
                key: 'notifications' as keyof LockedSections,
                title: 'Notification Desk Inbox',
                description: 'Governs student alerts dashboard. When locked, incoming admin broadcast notifications will be hidden from their view panels.',
                badgeText: 'Broadcast News UI',
              },
              {
                key: 'profile' as keyof LockedSections,
                title: 'Student Profile Settings',
                description: 'Governs Student Profile review & customization tabs. Controls modification of names, emails, states of origin, and biography metadata.',
                badgeText: 'Student Bio Settings',
              },
              {
                key: 'kycb' as keyof LockedSections,
                title: 'KYCB Sheet & Questionnaire',
                description: 'Governs student access to the KYCB (Know Your Client & Business) onboarding questions sheet.',
                badgeText: 'Client & Business KYC',
              },
              {
                key: 'blog' as keyof LockedSections,
                title: 'CIYA News & Article Blog',
                description: 'Governs student access to published coaching articles, conversion scripts, and coaching newsletters.',
                badgeText: 'News & Writing Desk',
              },
            ].map((sec) => {
              const isLocked = lockedSections[sec.key];
              return (
                <div 
                  key={sec.key} 
                  className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between gap-6 ${
                    isLocked 
                      ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-500/10 shadow-md shadow-rose-950/5' 
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`text-[9px] uppercase font-black px-2.5 py-1 rounded-full tracking-wider ${
                        isLocked 
                          ? 'bg-rose-100 text-rose-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {sec.badgeText}
                      </span>
                      
                      <div className={`p-2 rounded-xl transition-colors ${
                        isLocked ? 'bg-rose-100/50 text-rose-600' : 'bg-teal-50 text-teal-600'
                      }`}>
                        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm md:text-base font-black text-slate-950 tracking-tight leading-snug">{sec.title}</h3>
                      <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                        {sec.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                      <span className={`w-2 h-2 rounded-full ${isLocked ? 'bg-rose-500' : 'bg-teal-500'}`}></span>
                      <span className={isLocked ? 'text-rose-600 font-extrabold' : 'text-teal-600 font-extrabold'}>
                        {isLocked ? 'READ LOCKED' : 'ONLINE & ACTIVE'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleLock(sec.key)}
                      className={`px-4 py-2.5 rounded-xl font-extrabold text-[11px] uppercase tracking-wider cursor-pointer border-0 transition-all select-none shadow-sm ${
                        isLocked 
                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/10' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isLocked ? 'Unlock Section 🔓' : 'Lock Section 🔒'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Course Day-Level Lock Controls */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-4">
              <div className="space-y-1">
                <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  🗓️ Course Day / Module Lock Overrides
                </h2>
                <p className="text-xs text-slate-500 font-semibold">
                  Force-lock or force-unlock specific days/modules of any course for testing and simulation purposes.
                </p>
              </div>
              <div className="min-w-[200px]">
                <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Select Course</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-indigo-500"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.level || 'Beginner'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(() => {
              const selectedCourse = courses.find((c) => c.id === selectedCourseId);
              if (!selectedCourse) {
                return (
                  <div className="text-center py-6 text-xs text-slate-400 font-bold">
                    Please select a course to view day/module configurations.
                  </div>
                );
              }

              const days = selectedCourse.days || [];
              const isAdvanced = selectedCourse.level === 'Advanced';
              const labelNoun = isAdvanced ? 'Module' : 'Day';

              if (days.length === 0) {
                return (
                  <div className="text-center py-6 text-xs text-slate-400 font-bold">
                    No days or modules configured for this course. Add some in Course Editor!
                  </div>
                );
              }

              return (
                <div className="space-y-3.5">
                  {days.map((d: any, dayIdx: number) => {
                    const currentOverride = courseDaysLocks[`${selectedCourse.id}_day-${dayIdx}`] || 'default';

                    return (
                      <div
                        key={`day-lock-${dayIdx}`}
                        className="p-4 rounded-2xl border border-slate-150 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-slate-50"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                              {labelNoun} {dayIdx + 1}
                            </span>
                            <h4 className="text-xs font-black text-slate-800">{d.title}</h4>
                          </div>
                          <p className="text-[10px] text-slate-500 max-w-md font-semibold truncate">
                            {d.description || 'No description configured.'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 self-end md:self-auto">
                          <button
                            type="button"
                            onClick={() => handleUpdateDayLock(selectedCourse.id, dayIdx, 'default')}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all select-none cursor-pointer flex items-center gap-1 border ${
                              currentOverride === 'default'
                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500'
                            }`}
                          >
                            <Settings className="w-3.5 h-3.5" />
                            HW Rules (Default)
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateDayLock(selectedCourse.id, dayIdx, 'unlocked')}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all select-none cursor-pointer flex items-center gap-1 border ${
                              currentOverride === 'unlocked'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500'
                            }`}
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Force Open 🔓
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateDayLock(selectedCourse.id, dayIdx, 'locked')}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all select-none cursor-pointer flex items-center gap-1 border ${
                              currentOverride === 'locked'
                                ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500'
                            }`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Force Lock 🔒
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      ) : activeTab === 'beginners' ? (
        <div className="space-y-8 animate-fadeIn" id="beginners-course-settings-container">
          
          {/* Main Title Section */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="inline-block bg-teal-500 text-teal-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  ⚡ Beginner Syllabuses Settings
                </span>
                <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                  Beginners Course Assignment & Locks Console
                </h1>
                <p className="text-xs text-blue-100 opacity-90 leading-relaxed font-semibold max-w-2xl">
                  Manage lock states, customized automatic assignment grading conditions, year badge acquisitions, and automated scanning trigger timings across all hardcoded beginners courses.
                </p>
              </div>
              <div className="md:text-right shrink-0">
                <div className={`inline-flex items-center gap-1 text-[10px] font-mono px-3 py-1.5 rounded-full ${saving ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${saving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                  {saving ? 'Syncing...' : 'Real-time Linked'}
                </div>
              </div>
            </div>
          </div>

          {/* General Override Actions */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100">
              <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
              1. Global Override Actions & Quizzes Logic
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">General Day Unlock Buttons (Across All 3 Beginner Syllabuses)</label>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  Apply a blanket lock state across Day 2 to Day 5 for all Portfolio, Landing Page, and E-commerce courses instantly. Day 1 remains unlocked as default.
                </p>
                <div className="flex flex-wrap gap-2.5 pt-1.5">
                  <button
                    onClick={() => handleGeneralBeginnerLockAll('locked')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl border-0 uppercase tracking-wider cursor-pointer shadow-sm transition-all"
                  >
                    🔒 Force Lock All Lessons
                  </button>
                  <button
                    onClick={() => handleGeneralBeginnerLockAll('unlocked')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl border-0 uppercase tracking-wider cursor-pointer shadow-sm transition-all"
                  >
                    🔓 Force Unlock All Lessons
                  </button>
                  <button
                    onClick={() => handleGeneralBeginnerLockAll('default')}
                    className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl border-0 uppercase tracking-wider cursor-pointer transition-all"
                  >
                    🔄 Reset all to Default
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">Quizzes Control & Bypass Overrides</label>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  Govern how student comprehension quizzes are processed before they can access successive lesson videos.
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  {[
                    { mode: 'default', label: 'Default Quiz Flow (Required)', desc: 'Students must answer quizzes and get at least 80% to progress subsequent lessons.' },
                    { mode: 'locked', label: 'Force Locked Quizzes', desc: 'Quizzes are administrative-locked and cannot be answered.' },
                    { mode: 'bypassed', label: 'Bypass All Quizzes (Override)', desc: 'Overrides quizzes instantly. Students are not prompted to take quizzes to unlock lessons.' }
                  ].map((opt) => (
                    <label key={opt.mode} className="flex items-start gap-2.5 p-2 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="radio"
                        name="quizOverride"
                        checked={beginnersSettings.quizzesOverrideMode === opt.mode}
                        onChange={() => {
                          const updated = { ...beginnersSettings, quizzesOverrideMode: opt.mode as any };
                          setBeginnersSettings(updated);
                          setHasUnsavedChanges(true);
                          hasUnsavedChangesRef.current = true;
                        }}
                        className="mt-1 accent-indigo-600 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold text-slate-900">{opt.label}</span>
                        <p className="text-[10px] text-slate-500 leading-snug font-semibold">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Course-Specific Lesson Lock Matrix */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100">
              <Calendar className="w-4 h-4 text-indigo-600" />
              2. Course-Specific Lock Grid (Independent Control)
            </h2>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed max-w-3xl">
              Each course can be customized independently. Force individual days open or closed. The table below represents the exact active lock status in the database.
            </p>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Course Name</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Day 1</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Day 2</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Day 3</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Day 4</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Day 5</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-800">
                  {BEGINNER_COURSES.map(course => (
                    <tr key={course.id} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-955">{course.title}</span>
                          <p className="text-[10px] text-slate-450 font-mono">ID: {course.id}</p>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] rounded-full uppercase tracking-wider font-extrabold">
                          🔓 FREE OPEN
                        </span>
                      </td>
                      {[1, 2, 3, 4].map(dayIdx => {
                        const current = courseDaysLocks[`${course.id}_day-${dayIdx}`] || 'default';
                        return (
                          <td key={dayIdx} className="p-4 text-center">
                            <div className="inline-flex items-center gap-1.5 justify-center">
                              <select
                                value={current}
                                onChange={(e) => handleUpdateDayLock(course.id, dayIdx, e.target.value as any)}
                                className={`p-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border outline-none cursor-pointer ${
                                  current === 'locked' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                  current === 'unlocked' ? 'bg-emerald-50 border-emerald-200 text-emerald-850' :
                                  'bg-blue-50 border-blue-200 text-blue-700'
                                }`}
                              >
                                <option value="default">Default Rules</option>
                                <option value="unlocked">Force Open 🔓</option>
                                <option value="locked">Force Lock 🔒</option>
                              </select>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

                  {/* CIYA Membership Badge Monetization settings */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100">
              <Award className="w-4 h-4 text-amber-500" />
              3. CIYA Membership Badge Monetization & Onboarding Locks
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Enable CIYA Membership Badge Rules</span>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Require payment of the badge to pass subsequent cohort gates.</p>
                  </div>
                  <button
                    onClick={() => handleUpdateYearBadgeSetting('enabled', !beginnersSettings.yearBadgeSettings.enabled)}
                    className="p-1 border-0 bg-transparent focus:outline-none cursor-pointer"
                  >
                    {beginnersSettings.yearBadgeSettings.enabled ? (
                      <ToggleRight className="w-10 h-10 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-slate-300" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Require Badge for Day 4 & 5</span>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">After student finishes Day 3, show paywall block to proceed.</p>
                  </div>
                  <button
                    disabled={!beginnersSettings.yearBadgeSettings.enabled}
                    onClick={() => handleUpdateYearBadgeSetting('requireForDay4', !beginnersSettings.yearBadgeSettings.requireForDay4)}
                    className="p-1 border-0 bg-transparent focus:outline-none cursor-pointer disabled:opacity-40"
                  >
                    {beginnersSettings.yearBadgeSettings.requireForDay4 ? (
                      <ToggleRight className="w-10 h-10 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-slate-300" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Require Badge on Day 1 Onboarding</span>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Students cannot even access Day 1 without buying the CIYA Membership Badge.</p>
                  </div>
                  <button
                    disabled={!beginnersSettings.yearBadgeSettings.enabled}
                    onClick={() => handleUpdateYearBadgeSetting('requireForDay1', !beginnersSettings.yearBadgeSettings.requireForDay1)}
                    className="p-1 border-0 bg-transparent focus:outline-none cursor-pointer disabled:opacity-40"
                  >
                    {beginnersSettings.yearBadgeSettings.requireForDay1 ? (
                      <ToggleRight className="w-10 h-10 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-slate-300" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">CIYA Membership Badge Custom Price (₦ / $)</label>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                    Set the checkout price shown in the student's payment screen.
                  </p>
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-450 font-extrabold text-sm">
                      ₦
                    </div>
                    <input
                      type="number"
                      value={beginnersSettings.yearBadgeSettings.price}
                      onChange={(e) => handleUpdateYearBadgeSetting('price', Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm rounded-xl py-3 pl-8 pr-4 outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Enter amount (e.g., 25000)"
                    />
                  </div>
                </div>

                {/* Bank Gateway Configuration */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-250 space-y-4">
                  <h4 className="text-xs font-black uppercase text-indigo-700 tracking-wider">🏦 Bank Transfer Gateway Details</h4>
                  
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wide">Bank Name</label>
                    <input
                      type="text"
                      value={beginnersSettings.yearBadgeSettings.bankName || ''}
                      onChange={(e) => handleUpdateYearBadgeSetting('bankName', e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 font-bold text-xs rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g., United Bank for Africa (UBA)"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wide">Account Name</label>
                    <input
                      type="text"
                      value={beginnersSettings.yearBadgeSettings.accountName || ''}
                      onChange={(e) => handleUpdateYearBadgeSetting('accountName', e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 font-bold text-xs rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g., CIYA Academy International Ltd"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wide">Account Number</label>
                    <input
                      type="text"
                      value={beginnersSettings.yearBadgeSettings.accountNumber || ''}
                      onChange={(e) => handleUpdateYearBadgeSetting('accountNumber', e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 font-bold text-xs rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g., 1023948576"
                    />
                  </div>
                </div>

                {/* Support & Notification Options */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">📞 Admin WhatsApp Support Number</label>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      Used for the "Message Admin on WhatsApp" button after the payment is completed.
                    </p>
                    <input
                      type="text"
                      value={beginnersSettings.yearBadgeSettings.whatsappNumber || ''}
                      onChange={(e) => handleUpdateYearBadgeSetting('whatsappNumber', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl p-3 outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g., +2348123456789"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">🌸 Badge Benefits (What the students see)</label>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      Detailed perks displayed on the student paywall card layout (use bullet points).
                    </p>
                    <textarea
                      value={beginnersSettings.yearBadgeSettings.benefitText || ''}
                      onChange={(e) => handleUpdateYearBadgeSetting('benefitText', e.target.value)}
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl p-3 outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                      placeholder="• Perk 1&#10;• Perk 2"
                    />
                  </div>

                  {/* Badge Image Cloudinary Upload Section */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">🎨 Custom Badge Graphic (Cloudinary Storage)</label>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      Automatically upload a custom badge graphic to Cloudinary. It will instantly update on student screens.
                    </p>
                    <div className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-2xl">
                      <div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
                        {beginnersSettings.yearBadgeSettings.badgeImageUrl ? (
                          <img
                            src={beginnersSettings.yearBadgeSettings.badgeImageUrl}
                            alt="Badge preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-xl">🏅</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          id="admin-cloudinary-badge-file-input"
                          className="hidden"
                        />
                        <label
                          htmlFor="admin-cloudinary-badge-file-input"
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black uppercase rounded-lg border border-indigo-200 cursor-pointer text-center inline-block"
                        >
                          {uploadingImage ? 'Uploading Image...' : 'Choose Badge Graphic'}
                        </label>
                        <p className="text-[9px] text-slate-400 font-medium">Any image file size up to 10MB.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Playground Simulator Launcher */}
                <div className="pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowSimulator(true)}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-amber-955 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    <span>🧪</span> Launch Live Payment Simulator Widget
                  </button>
                  <p className="text-[9px] text-slate-400 font-medium text-center mt-2 leading-relaxed">
                    Instantly test the student's exact badge purchase flow, payment details pop-up, 20-minute countdown, 10s confirming state, and success trigger.
                  </p>
                </div>
              </div>

            </div>

            {/* CIYA Badge Sample Preview & Download Area */}
            <div className="border-t border-slate-150 pt-8 mt-8 text-center space-y-4">
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-center gap-1.5">
                  🏅 CIYA PRO Membership Badge Live Preview (Placeholder Template)
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  Below is a live rendering of the premium CIYA badge with sample student details. Click "Download" to verify that the canvas renderer runs correctly on this workspace container.
                </p>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 md:p-10 max-w-lg mx-auto shadow-inner flex flex-col items-center justify-center">
                <CIYAMembershipBadge 
                  data={{
                    fullName: 'STUDENT NAME',
                    email: 'student.email@example.com',
                    courseName: 'Advanced Website Development',
                    membershipId: 'CIYA-ADV-2026-0000',
                    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                  }}
                  isSample={true}
                />
              </div>
            </div>

          </div>

          {/* Custom Assignment Submission & Compliance Rules */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100">
              <FileText className="w-4 h-4 text-teal-600" />
              5. Assignment Submission Compliance & Auto-Grading Settings
            </h2>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed max-w-3xl">
              Turn auto-submission rules on or off for each of the 5 days. When active, student entries are scanned and auto-graded by compliance criteria instantly.
            </p>

            <div className="space-y-6">
              {[0, 1, 2, 3, 4].map((dayIdx) => {
                const dayKey = `day-${dayIdx}`;
                const config = beginnersSettings.assignmentSettings[dayKey] || { ...INITIAL_ASSIGNMENT_SETTING };
                
                return (
                  <div key={dayIdx} className={`p-5 rounded-2xl border transition-all ${config.enabled ? 'bg-indigo-50/20 border-indigo-200 shadow-sm' : 'bg-slate-50/50 border-slate-200'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3 mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${config.enabled ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                            DAY {dayIdx + 1} SUBMISSION
                          </span>
                          <h3 className="text-sm font-extrabold text-slate-900">
                            {dayIdx === 0 ? 'Portfolio Outline (Day 1)' : 
                             dayIdx === 1 ? 'Design Blueprint (Day 2)' : 
                             dayIdx === 2 ? 'Screenshot Uploads (Day 3)' : 
                             dayIdx === 3 ? 'Refinement Prompt (Day 4)' : 
                             'Recap & Launch (Day 5)'}
                          </h3>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold">
                          Custom conditions for auto-accepting or auto-rejecting Day {dayIdx + 1} submissions.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-650 uppercase tracking-wider">{config.enabled ? 'Rules: ON' : 'Rules: OFF'}</span>
                        <button
                          onClick={() => handleUpdateAssignmentSetting(dayKey, 'enabled', !config.enabled)}
                          className="p-1 border-0 bg-transparent focus:outline-none cursor-pointer"
                        >
                          {config.enabled ? (
                            <ToggleRight className="w-10 h-10 text-indigo-600" />
                          ) : (
                            <ToggleLeft className="w-10 h-10 text-slate-300" />
                          )}
                        </button>
                      </div>
                    </div>

                    {config.enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                        
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Minimum Character Count ({config.minChars} chars)</label>
                            <input
                              type="range"
                              min="0"
                              max="500"
                              step="20"
                              value={config.minChars}
                              onChange={(e) => handleUpdateAssignmentSetting(dayKey, 'minChars', Number(e.target.value))}
                              className="w-full accent-indigo-650 cursor-pointer"
                            />
                          </div>

                          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Require Reference URL Link</span>
                            <input
                              type="checkbox"
                              checked={config.requireLink}
                              onChange={(e) => handleUpdateAssignmentSetting(dayKey, 'requireLink', e.target.checked)}
                              className="w-4 h-4 accent-indigo-650 cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Minimum Screenshots Needed</label>
                            <select
                              value={config.minScreenshots}
                              onChange={(e) => handleUpdateAssignmentSetting(dayKey, 'minScreenshots', Number(e.target.value))}
                              className="w-full bg-white border border-slate-200 text-slate-800 font-bold text-xs rounded-lg p-2"
                            >
                              <option value="0">No screenshots required</option>
                              <option value="1">At least 1 screenshot</option>
                              <option value="2">At least 2 screenshots</option>
                              <option value="3">At least 3 screenshots</option>
                            </select>
                          </div>

                          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Instant Auto-Approval Status</span>
                            <input
                              type="checkbox"
                              checked={config.autoApprove}
                              onChange={(e) => handleUpdateAssignmentSetting(dayKey, 'autoApprove', e.target.checked)}
                              className="w-4 h-4 accent-indigo-650 cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                              <span>Approval Processing Delay</span>
                              {!config.autoApprove && <span className="text-[9px] text-rose-500 font-extrabold font-mono">Requires Auto-Approval ON</span>}
                            </label>
                            <select
                              disabled={!config.autoApprove}
                              value={config.approvalDelay || 'instant'}
                              onChange={(e) => handleUpdateUnlockSetting ? handleUpdateAssignmentSetting(dayKey, 'approvalDelay', e.target.value) : undefined}
                              className="w-full bg-white border border-slate-200 text-slate-850 font-bold text-xs rounded-lg p-2 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 cursor-pointer disabled:cursor-not-allowed"
                            >
                              <option value="instant">Instant Approval (Immediate)</option>
                              <option value="10m">10 Minutes Delay</option>
                              <option value="20m">20 Minutes Delay</option>
                              <option value="30m">30 Minutes Delay</option>
                              <option value="1h">1 Hour Delay</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Custom Approval Comment</span>
                            <textarea
                              rows={2}
                              value={config.approveComment}
                              onChange={(e) => handleUpdateAssignmentSetting(dayKey, 'approveComment', e.target.value)}
                              className="w-full bg-white border border-slate-200 font-medium text-xs rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 leading-normal"
                              placeholder="Passed compliance text..."
                            />
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Custom Reject Comment</span>
                            <textarea
                              rows={2}
                              value={config.disapproveComment}
                              onChange={(e) => handleUpdateAssignmentSetting(dayKey, 'disapproveComment', e.target.value)}
                              className="w-full bg-white border border-slate-200 font-medium text-xs rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 leading-normal"
                              placeholder="Failed compliance reason..."
                            />
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timezone & Automated Grading Schedule (UTC+1 Nigeria) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100">
              <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
              5. Timezone & Automated Grading Schedule (UTC+1 Nigeria)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Select Timezone</label>
                    <select
                      value={beginnersSettings.timezone}
                      onChange={(e) => {
                        const updated = { ...beginnersSettings, timezone: e.target.value };
                        setBeginnersSettings(updated);
                        setHasUnsavedChanges(true);
                        hasUnsavedChangesRef.current = true;
                      }}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl p-2.5 outline-none"
                    >
                      <option value="UTC+1">UTC+1 (Nigeria Time)</option>
                      <option value="UTC">UTC (Greenwich Mean Time)</option>
                      <option value="UTC+2">UTC+2 (Eastern Europe)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1 bg-slate-900 rounded-xl p-2 text-white flex flex-col justify-center items-center">
                    <span className="text-[8px] uppercase tracking-widest text-teal-300 font-bold">Nigeria Local Time</span>
                    <span className="text-sm font-black font-mono mt-0.5">{nigeriaTime || '--:--:--'}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">3 Daily Automated Scan Schedules</label>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                    Define three precise runtimes (24-hour format) when the system will scan and automatically grade all pending beginner assignments.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { num: 1, key: 'triggerTime1' as const, label: 'Run 1 (Morning)' },
                      { num: 2, key: 'triggerTime2' as const, label: 'Run 2 (Noon)' },
                      { num: 3, key: 'triggerTime3' as const, label: 'Run 3 (Night)' }
                    ].map(sched => (
                      <div key={sched.num} className="p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">{sched.label}</span>
                        <input
                          type="text"
                          value={beginnersSettings[sched.key]}
                          onChange={(e) => {
                            const updated = { ...beginnersSettings, [sched.key]: e.target.value };
                            setBeginnersSettings(updated);
                            setHasUnsavedChanges(true);
                            hasUnsavedChangesRef.current = true;
                          }}
                          className="w-full text-center bg-white border border-slate-200 text-xs font-black p-1.5 rounded-lg outline-none"
                          placeholder="e.g. 08:00"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col gap-3">
                  <div className="flex gap-2.5 text-[11px] font-semibold leading-relaxed text-indigo-900">
                    <Zap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Real-time Scheduler Active:</span> The system runs this scan natively. As an administrator, you can force the scan to happen immediately using the button on the right.
                    </div>
                  </div>
                  <button
                    onClick={triggerManualGradingScan}
                    disabled={gradingInProgress}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-2 border-0"
                  >
                    {gradingInProgress ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Scanning and Grading...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        Trigger Auto-Grade Scan Now ⚡
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Countdowns & Cron monitor logs */}
              <div className="space-y-4">
                <span className="block text-xs font-black text-slate-700 uppercase tracking-wide">Live Scheduler & Cron Countdown Watch</span>
                
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { num: 1, label: 'Run 1 Countdown', val: countdowns[0], time: beginnersSettings.triggerTime1 },
                    { num: 2, label: 'Run 2 Countdown', val: countdowns[1], time: beginnersSettings.triggerTime2 },
                    { num: 3, label: 'Run 3 Countdown', val: countdowns[2], time: beginnersSettings.triggerTime3 }
                  ].map(c => (
                    <div key={c.num} className="p-3 bg-slate-900 text-white rounded-2xl text-center space-y-1">
                      <span className="block text-[8px] uppercase text-slate-400 tracking-wider font-extrabold">{c.label} ({c.time})</span>
                      <span className="block text-xs font-black font-mono text-teal-400">{c.val}</span>
                    </div>
                  ))}
                </div>

                {/* Simulated live terminal feed */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                    Live Activity Monitor Logs & Triggers Feed
                  </span>
                  <div className="bg-slate-950 text-slate-300 font-mono text-[10px] p-4 rounded-2xl h-48 overflow-y-auto space-y-1 border border-slate-800 text-left leading-normal">
                    {gradingLogs.length === 0 ? (
                      <p className="text-slate-500 italic">No grading runs triggered in this browser session. Click "Trigger Auto-Grade Scan Now" to see logs.</p>
                    ) : (
                      gradingLogs.map((log, idx) => (
                        <p key={idx} className={log.includes('APPROVED') ? 'text-emerald-400 font-semibold' : log.includes('REJECTED') ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                          [{new Date().toLocaleTimeString()}] {log}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Section 6: Course Days Calendar Unlock Settings */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 text-left">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100">
              <Calendar className="w-4 h-4 text-emerald-600" />
              6. Course Days Calendar Unlock Settings (Date & Time Scheduler)
            </h2>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed max-w-3xl">
              Control exactly when each course day becomes unlocked for students. Choose between immediate unlock upon preceding assignment approval (default) or schedule a specific calendar date and time.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[0, 1, 2, 3, 4].map((dayIdx) => {
                const dayKey = `day-${dayIdx}`;
                const config = beginnersSettings.unlockSettings?.[dayKey] || { type: 'immediate', unlockDateTime: '' };

                return (
                  <div key={dayIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                        Day {dayIdx + 1} Unlock Rule
                      </span>
                      <span className="text-xs font-bold text-slate-850">
                        {dayIdx === 0 ? 'Portfolio Outline' : 
                         dayIdx === 1 ? 'Design Blueprint' : 
                         dayIdx === 2 ? 'Screenshot Uploads' : 
                         dayIdx === 3 ? 'Refinement Prompt' : 
                         'Recap & Launch'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-black text-slate-500">Progression Type</label>
                      <select
                        value={config.type}
                        onChange={(e) => handleUpdateUnlockSetting(dayKey, 'type', e.target.value as any)}
                        className="w-full bg-white border border-slate-200 text-slate-900 font-bold text-xs rounded-xl p-2.5 outline-none cursor-pointer"
                      >
                        <option value="immediate">{dayIdx === 0 ? "Unlock Immediately on Course Start" : "Preceding Assignment Approved (Standard)"}</option>
                        <option value="date_time">Schedule Unlock Date & Time</option>
                      </select>
                    </div>

                    {config.type === 'date_time' && (
                      <div className="space-y-1.5 animate-fadeIn">
                        <label className="block text-[10px] uppercase font-black text-slate-500">Scheduled Unlock Date & Time (UTC+1)</label>
                        <input
                          type="datetime-local"
                          value={config.unlockDateTime || ''}
                          onChange={(e) => handleUpdateUnlockSetting(dayKey, 'unlockDateTime', e.target.value)}
                          className="w-full bg-white border border-slate-200 text-slate-900 font-bold text-xs rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <p className="text-[9px] text-slate-400 font-medium">Students will not be able to access Day {dayIdx + 1} content before this calendar time.</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : activeTab === 'advanced' ? (
        <div className="space-y-8 animate-fadeIn" id="advanced-course-settings-container">
          
          {/* Main Title Section */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="inline-block bg-purple-500 text-purple-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  ⚡ Advanced Syllabuses Settings
                </span>
                <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                  Advanced Course Monetization & Enrollment Controls
                </h1>
                <p className="text-xs text-purple-100 opacity-90 leading-relaxed font-semibold max-w-2xl">
                  Configure tuition fees, bank payment information, dynamic rolling passcodes, and monitor/revoke student enrollments for advanced tracks.
                </p>
              </div>
              <div className="md:text-right shrink-0">
                <div className={`inline-flex items-center gap-1 text-[10px] font-mono px-3 py-1.5 rounded-full ${saving ? 'bg-amber-500/15 text-amber-300' : 'bg-purple-500/15 text-purple-300 border border-purple-500/20'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${saving ? 'bg-amber-400 animate-pulse' : 'bg-purple-400'}`}></span>
                  {saving ? 'Syncing...' : 'Real-time Linked'}
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Card (Moved from beginners section) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100">
              <Settings className="w-4 h-4 text-purple-600" />
              1. Advanced Course Monetization & Rolling Passcodes
            </h2>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed max-w-3xl">
              Configure monetization payment details and mathematical, time-based passcode rotation rules for students attempting to access Advanced Courses.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Enable Advanced Course Monetization</span>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Require payment checkout and valid passcode entry to unlock advanced tracks.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdateAdvancedCourseSetting('enabled', !(beginnersSettings.advancedCourseSettings?.enabled ?? true))}
                    className="p-1 border-0 bg-transparent focus:outline-none cursor-pointer"
                  >
                    {(beginnersSettings.advancedCourseSettings?.enabled ?? true) ? (
                      <ToggleRight className="w-10 h-10 text-purple-600" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-slate-300" />
                    )}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">Advanced Course Checkout Price (₦)</label>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                    Set the checkout amount displayed on the student's advanced course payment gateway.
                  </p>
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-extrabold text-sm">
                      ₦
                    </div>
                    <input
                      type="number"
                      value={beginnersSettings.advancedCourseSettings?.price ?? 50000}
                      onChange={(e) => handleUpdateAdvancedCourseSetting('price', Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm rounded-xl py-3 py-3 pl-8 pr-4 outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="Enter amount (e.g., 50000)"
                    />
                  </div>
                </div>

                {/* Bank Gateway Configuration */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-black uppercase text-purple-700 tracking-wider">🏦 Advanced Class Bank Transfer Details</h4>
                  
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wide">Bank Name</label>
                    <input
                      type="text"
                      value={beginnersSettings.advancedCourseSettings?.bankName ?? 'United Bank for Africa (UBA)'}
                      onChange={(e) => handleUpdateAdvancedCourseSetting('bankName', e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 font-bold text-xs rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="e.g., United Bank for Africa (UBA)"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wide">Account Name</label>
                    <input
                      type="text"
                      value={beginnersSettings.advancedCourseSettings?.accountName ?? 'CIYA Academy International Ltd'}
                      onChange={(e) => handleUpdateAdvancedCourseSetting('accountName', e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 font-bold text-xs rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="e.g., CIYA Academy International Ltd"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wide">Account Number</label>
                    <input
                      type="text"
                      value={beginnersSettings.advancedCourseSettings?.accountNumber ?? '1023948576'}
                      onChange={(e) => handleUpdateAdvancedCourseSetting('accountNumber', e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 font-bold text-xs rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="e.g., 1023948576"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">📞 Admin WhatsApp Support Number (Advanced Class)</label>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                    Students will message this number to request the active 6-digit passcode.
                  </p>
                  <input
                    type="text"
                    value={beginnersSettings.advancedCourseSettings?.whatsappNumber ?? '+2349042544355'}
                    onChange={(e) => handleUpdateAdvancedCourseSetting('whatsappNumber', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl p-3 outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="e.g., +2349042544355"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">🔑 Shared Secret Key</label>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                    This secret key combined with local time produces the 6-digit dynamic passcode. Changing this instantly invalidates old passcodes.
                  </p>
                  <input
                    type="text"
                    value={beginnersSettings.advancedCourseSettings?.secretPasscode ?? 'CIYA_ADVANCED_PASSCODE_SECRET_2026'}
                    onChange={(e) => handleUpdateAdvancedCourseSetting('secretPasscode', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs rounded-xl p-3 outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Shared secret key"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">🕒 Real-Time Synchronized Passcodes Console</label>
                  <AdminPasscodeConsole secret={beginnersSettings.advancedCourseSettings?.secretPasscode ?? 'CIYA_ADVANCED_PASSCODE_SECRET_2026'} />
                </div>
              </div>
            </div>
          </div>

          {/* List of active advanced course students */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 text-left">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100">
              <Sparkles className="w-4 h-4 text-purple-600" />
              2. Advanced Course Enrolled Students ({advancedStudents.length})
            </h2>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed max-w-3xl">
              This list shows all students who verified the correct passcode and unlocked access to begin the Advanced Courses. Administrators can review their details or revoke access instantly.
            </p>

            {advancedStudents.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <span className="text-2xl block mb-2">🎓</span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No student has unlocked an advanced course yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="p-4">Student Details</th>
                      <th className="p-4">Unlocked Course</th>
                      <th className="p-4">Unlock Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-xs font-semibold text-slate-700">
                    {advancedStudents.map((student, idx) => (
                      <tr key={`${student.studentId}_${student.courseId}_${idx}`} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <div className="font-extrabold text-slate-900">{student.name}</div>
                          <div className="text-[10px] text-slate-400">{student.email}</div>
                          <div className="text-[8px] font-mono text-slate-400 select-all mt-0.5">UID: {student.studentId}</div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-[10px] font-black uppercase">
                            <Sparkles className="w-3 h-3" />
                            {student.courseTitle}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-500 text-[10px]">
                          {student.unlockedAt ? new Date(student.unlockedAt).toLocaleString() : 'N/A'}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            disabled={revokingKeys.includes(`${student.studentId}_${student.courseId}`)}
                            onClick={() => handleRevokeAdvancedAccess(student.studentId, student.courseId, student.name, student.courseTitle)}
                            className={`px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer select-none border-0 inline-flex items-center gap-1.5 ${
                              revokingKeys.includes(`${student.studentId}_${student.courseId}`)
                                ? 'bg-rose-400 text-rose-100 cursor-not-allowed'
                                : 'bg-rose-600 hover:bg-rose-700 text-white'
                            }`}
                          >
                            {revokingKeys.includes(`${student.studentId}_${student.courseId}`) ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Revoking...
                              </>
                            ) : (
                              'Revoke Access'
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn font-sans text-left" id="badge-approvals-queue-container">
          
          {/* Header Card */}
          <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="inline-block bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  ⚡ CIYA Pro Student Badge Queue
                </span>
                <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                  <Award className="w-6 h-6 text-amber-400" />
                  Manual Payment Approval Portal
                </h1>
                <p className="text-slate-350 text-xs font-semibold max-w-2xl leading-relaxed">
                  Automate upgrading students to <strong className="text-amber-400">CIYA Student Pro</strong> status without searching through student statistics manually. Verify their bank transfers and trigger their instant upgrade!
                </p>
              </div>
            </div>
          </div>

          {/* Queue List Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100">
              <RefreshCw className={`w-4 h-4 text-indigo-650 ${loadingPending ? 'animate-spin' : ''}`} />
              Active Pending Requests Queue ({pendingUsers.length})
            </h2>

            {loadingPending ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Syncing queue with Cloud Firestore...</p>
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 max-w-md mx-auto">
                <span className="text-4xl block mb-2">🎉</span>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">All Clear! Queue Empty</h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed mt-1">
                  There are no pending bank transfer verifications in the ledger. Fresh student payment requests will appear here instantly in real time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {pendingUsers.map((pUser) => {
                  const reqDate = pUser.badgePaymentRequestDate
                    ? new Date(pUser.badgePaymentRequestDate).toLocaleString()
                    : 'N/A';
                  
                  return (
                    <div key={pUser.id} className="border border-slate-200 hover:border-indigo-200 p-5 rounded-2xl bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full border-2 border-amber-400 bg-slate-150 flex items-center justify-center text-slate-700 font-black text-lg shadow-sm shrink-0 overflow-hidden">
                          {pUser.photoURL ? (
                            <img src={pUser.photoURL} alt={pUser.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span>{pUser.fullName ? pUser.fullName[0].toUpperCase() : 'U'}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-slate-900 text-sm uppercase leading-none">{pUser.fullName || 'Anonymous Student'}</h4>
                            <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">PENDING VERIFICATION</span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono font-semibold">{pUser.email}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] text-slate-450 font-bold">
                            <span>📞 WhatsApp: <strong className="text-slate-700">{pUser.whatsapp || 'N/A'}</strong></span>
                            <span>⏱️ Requested: <strong className="text-slate-700">{reqDate}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Manual Action buttons */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                        <button
                          onClick={async () => {
                            if (window.confirm(`Approve ${pUser.fullName || pUser.email}'s payment and upgrade them to CIYA Student Pro member?`)) {
                              try {
                                const userRef = doc(db, 'users', pUser.id);
                                
                                // Generate custom membership ID
                                const year = new Date().getFullYear();
                                const randNum = Math.floor(1000 + Math.random() * 9000);
                                const membershipId = `CIYA-PRO-${year}-${randNum}`;
                                
                                const startDate = Date.now();
                                const expiryDate = startDate + 30 * 24 * 60 * 60 * 1000; // exactly 30 days
                                
                                await updateDoc(userRef, {
                                  hasYearBadge: true,
                                  badgePaymentRequestStatus: 'Approved',
                                  badgePurchaseDate: startDate,
                                  badgeExpiryDate: expiryDate,
                                  membershipId: membershipId,
                                  updatedAt: serverTimestamp()
                                });

                                // Trigger System Notification
                                await addDoc(collection(db, 'notifications'), {
                                  userId: pUser.id,
                                  title: 'Upgraded to CIYA Student Pro! 🎖️🚀',
                                  message: `Congratulations! Your payment has been approved and confirmed. You have been officially upgraded to "CIYA Student Pro" and are now a member of the elite CIYA ecosystem!

Your exclusive benefits include:
• 🏷️ Verified CIYA Badge: Displayed on your profile page.
• 📁 Profile Photo Upload: Customize your badge with a professional photo before download.
• 🚀 30-Day Ecosystem Membership: Valid from ${new Date(startDate).toLocaleDateString()} to ${new Date(expiryDate).toLocaleDateString()}.
• 🎓 Advanced Syllabus Access: Access to specialized courses, assignments, and practical training templates.
• 💻 Netlify Verified Link: Host and showcase your projects with premium support.

Please go to your profile now to see your "CIYA badge" reflected, upload your photo, and download your high-resolution badge PNG to celebrate your status!`,
                                  type: 'badge_upgrade',
                                  isRead: false,
                                  triggeredBy: 'Academy Admin Office',
                                  createdAt: serverTimestamp()
                                });

                                setGradingLogs(prev => [`[UPGRADE ✅] Successfully approved ${pUser.fullName || pUser.email} to CIYA Student Pro member! Generated Membership ID: ${membershipId}`, ...prev]);
                                alert(`Upgraded ${pUser.fullName || pUser.email} successfully!`);
                              } catch (err) {
                                console.error("Error approving student badge:", err);
                                alert("Failed to approve student badge. Please try again.");
                              }
                            }
                          }}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer border-0 shadow-md flex items-center gap-1.5 transition-all"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve & Upgrade
                        </button>

                        <button
                          onClick={async () => {
                            const reason = window.prompt(`Please provide a rejection reason for ${pUser.fullName || pUser.email}:`, 'Bank transfer reference not found in ledger. Please contact coordinator.');
                            if (reason !== null) {
                              try {
                                const userRef = doc(db, 'users', pUser.id);
                                await updateDoc(userRef, {
                                  hasYearBadge: false,
                                  badgePaymentRequestStatus: 'Rejected',
                                  updatedAt: serverTimestamp()
                                });

                                // Trigger System Notification
                                await addDoc(collection(db, 'notifications'), {
                                  userId: pUser.id,
                                  title: 'Payment Verification Failed ❌',
                                  message: `Your CIYA Student Pro payment verification request has been rejected by the administrator. Reason: "${reason}". Please verify your details and resubmit payment request.`,
                                  type: 'badge_upgrade_rejected',
                                  isRead: false,
                                  triggeredBy: 'Academy Admin Office',
                                  createdAt: serverTimestamp()
                                });

                                setGradingLogs(prev => [`[REJECTED ❌] Rejected ${pUser.fullName || pUser.email}'s request. Reason: ${reason}`, ...prev]);
                                alert(`Rejected request successfully.`);
                              } catch (err) {
                                console.error("Error rejecting student badge request:", err);
                                alert("Failed to reject request. Please try again.");
                              }
                            }
                          }}
                          className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer border border-rose-250 flex items-center gap-1.5 transition-all"
                        >
                          ✕ Disapprove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Persistent Bottom Save Settings Panel */}
      <div className="bg-white rounded-3xl p-6 border-2 border-indigo-500/20 shadow-md space-y-4 max-w-4xl mx-auto my-6 text-left relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10 font-sans">
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1.5">
              💾 Global System Settings Control Desk
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
              Applying changes commits both General Portal Access Control locks and Beginner Syllabus configurations to Cloud Firestore simultaneously.
            </p>
            {hasUnsavedChanges ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                ⚠️ You have unsaved configuration drafts active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                ✓ All portal configurations synchronized with Cloud Firestore
              </span>
            )}
            {lastSavedTime && (
              <p className="text-[10px] text-slate-400 font-mono font-medium flex items-center gap-1">
                ⏱️ Last action saved on: <strong>{lastSavedTime.toLocaleString()}</strong>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <button
              onClick={handleDiscardChanges}
              disabled={!hasUnsavedChanges}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-black rounded-xl border-0 uppercase tracking-wider cursor-pointer transition-all"
            >
              Discard Draft
            </button>
            
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl border-0 uppercase tracking-wider cursor-pointer transition-all shadow-md flex items-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving Portal...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Portal Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Auxiliary Help Notice card */}
      <div className="bg-slate-55 shadow-sm border border-slate-200 max-w-2xl mx-auto rounded-2xl p-5 flex gap-4 text-xs font-semibold leading-relaxed text-slate-600 text-left">
        <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <p>
          Need to schedule locks? Toggle values manually here anytime a training session goes live, or cohorts transition through modules. Modifications sync instantly to all connected student app instances without forcing browser refreshes.
        </p>
      </div>

      {/* Live Payment Simulator Widget Modal */}
      {showSimulator && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 font-sans">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 overflow-hidden shadow-2xl relative animate-scaleUp">
            <button
              onClick={() => setShowSimulator(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-755 flex items-center justify-center border-0 cursor-pointer text-sm font-black z-10"
            >
              ✕
            </button>
            <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  🛡️ Secure Payment Environment
                </span>
                <h3 className="font-black text-slate-900 text-sm tracking-tight mt-1">Live Payment Gateway Preview</h3>
              </div>
              <p className="text-[10px] text-slate-400 font-mono font-medium">Mode: Admin Preview</p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[80vh]">
              <YearBadgePaymentFlow
                yearBadgeSettings={beginnersSettings.yearBadgeSettings}
                isAdminSimulation={true}
                onSuccessClose={() => setShowSimulator(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[110] animate-slideUp">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border ${
            toast.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-xs font-extrabold tracking-tight">{toast.message}</span>
            <button 
              type="button" 
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 font-bold text-xs bg-transparent border-0 cursor-pointer ml-1.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Custom Revoke Access Confirmation Modal */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl p-6 space-y-5 animate-scaleUp text-left">
            <div className="flex items-center justify-center w-12 h-12 bg-rose-50 text-rose-600 rounded-full mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            
            <div className="space-y-2 text-center">
              <h3 className="font-black text-slate-900 text-base tracking-tight">Revoke Course Access?</h3>
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                Are you sure you want to revoke <strong className="text-slate-900">{confirmRevoke.studentName}</strong>'s access to <strong className="text-slate-900">"{confirmRevoke.courseTitle}"</strong>?
              </p>
              <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-xl font-bold">
                ⚠️ This student will be locked out of this premium classroom immediately.
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRevoke(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl border-0 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRevokeAdvancedAccess}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl border-0 cursor-pointer shadow-sm transition-colors"
              >
                Yes, Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// HIGH-FIDELITY OPTION A ADMIN PASSCODE CONSOLE
// ==========================================
export function AdminPasscodeConsole({ secret }: { secret: string }) {
  const [secondsLeft, setSecondsLeft] = useState(getPasscodeSecondsLeft());
  const [currentCode, setCurrentCode] = useState(generateTimeBasedCode(secret));
  const [testCode, setTestCode] = useState('');
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'fail'>('idle');

  useEffect(() => {
    const interval = setInterval(() => {
      const left = getPasscodeSecondsLeft();
      setSecondsLeft(left);
      setCurrentCode(generateTimeBasedCode(secret));
    }, 1000);
    return () => clearInterval(interval);
  }, [secret]);

  const handleVerify = () => {
    if (verifyTimeBasedCode(testCode, secret)) {
      setTestResult('success');
    } else {
      setTestResult('fail');
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const prevCode = generateTimeBasedCode(secret, 900000, -1);
  const nextCode = generateTimeBasedCode(secret, 900000, 1);

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4 font-mono shadow-inner text-left">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <span className="text-[10px] uppercase tracking-widest text-teal-400 font-extrabold flex items-center gap-1.5">
          <span className="w-2 h-2 bg-teal-400 rounded-full animate-ping" />
          Option A: Dynamic Math Console
        </span>
        <span className="text-[10px] text-slate-400">
          Sync Window: 15 Mins
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="space-y-1.5">
          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold block">Active 6-Digit Passcode</span>
          <p className="text-3xl font-black tracking-wider text-teal-300">{currentCode}</p>
          <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
            ⏳ Rotates in <strong className="text-white font-mono">{timeStr}</strong>
          </span>
        </div>

        <div className="space-y-2 bg-slate-850 p-3 rounded-xl border border-slate-800 font-sans">
          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-black block">Verify Student Passcode</span>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              value={testCode}
              onChange={(e) => {
                setTestCode(e.target.value.replace(/[^0-9]/g, ''));
                setTestResult('idle');
              }}
              className="w-full bg-slate-800 border border-slate-700 text-teal-300 font-mono font-bold text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-teal-500"
              placeholder="Enter 6 digits"
            />
            <button
              type="button"
              onClick={handleVerify}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg border-0 cursor-pointer transition-all select-none"
            >
              Verify
            </button>
          </div>
          {testResult === 'success' && (
            <p className="text-[10px] text-teal-400 font-bold mt-1">
              ✅ MATCH! Valid passcode for current 15-min window.
            </p>
          )}
          {testResult === 'fail' && (
            <p className="text-[10px] text-rose-400 font-bold mt-1">
              ❌ INVALID! Does not match the active current 15-minute slot.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-slate-800/80 pt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-slate-400 font-sans">
        <span>Prev Slot Code (Expired): <strong className="font-mono text-slate-500 line-through">{prevCode}</strong></span>
        <span>Active Code (Valid): <strong className="font-mono text-teal-300">{currentCode}</strong></span>
        <span>Next Slot Code (Not Active yet): <strong className="font-mono text-slate-400">{nextCode}</strong></span>
      </div>
    </div>
  );
}

// ==========================================
// HIGH-FIDELITY YEAR BADGE PAYMENT FLOW COMPONENT
// ==========================================
export function YearBadgePaymentFlow({
  yearBadgeSettings = FRONTEND_YEAR_BADGE_SETTINGS,
  price,
  onSuccessClose,
  isAdminSimulation = false,
  currentUser,
  userProfile,
  setUserProfile
}: {
  yearBadgeSettings?: any;
  price?: number;
  onSuccessClose?: () => void;
  isAdminSimulation?: boolean;
  currentUser?: any;
  userProfile?: any;
  setUserProfile?: any;
}) {
  const finalPrice = price ?? yearBadgeSettings?.price ?? FRONTEND_YEAR_BADGE_SETTINGS.price;
  const [step, setStep] = useState<'landing' | 'setup_popup' | 'countdown' | 'confirming' | 'success'>('landing');
  
  // 20 Minutes Countdown Timer State (1200 seconds)
  const [timeLeft, setTimeLeft] = useState(1200);
  const [timerActive, setTimerActive] = useState(false);

  // 10 Seconds Confirming Timer State
  const [confirmingTime, setConfirmingTime] = useState(10);
  const [confirmingProgress, setConfirmingProgress] = useState(100);

  // Countdown timer ticking effect
  useEffect(() => {
    let interval: any = null;
    if (timerActive && step === 'countdown' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, step, timeLeft]);

  // Confirming loader ticking effect
  useEffect(() => {
    let interval: any = null;
    if (step === 'confirming' && confirmingTime > 0) {
      interval = setInterval(() => {
        setConfirmingTime(prev => {
          const nextVal = prev - 1;
          setConfirmingProgress(Math.floor((nextVal / 10) * 100));
          return nextVal;
        });
      }, 1000);
    } else if (step === 'confirming' && confirmingTime === 0) {
      // Transition immediately to Success to avoid any asynchronous blocking / infinite loop triggers!
      setStep('success');

      // Execute Firestore sync in the background
      const completeVerification = async () => {
        if (!isAdminSimulation && currentUser?.uid) {
          try {
            // Update the user profile document with PendingApproval status
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
              badgePaymentRequestStatus: 'PendingApproval',
              hasYearBadge: false, // Wait for admin approval
              updatedAt: serverTimestamp()
            });

            // Update local state so it reflects immediately
            if (setUserProfile && userProfile) {
              const updated = {
                ...userProfile,
                badgePaymentRequestStatus: 'PendingApproval',
                hasYearBadge: false
              };
              setUserProfile(updated);
              safeStorage.setItem('ciya_cached_profile', JSON.stringify(updated));
            }
          } catch (err) {
            console.error("Failed to write payment request status to Firestore:", err);
          }
        }
      };
      completeVerification();
    }
    return () => clearInterval(interval);
  }, [step, confirmingTime, isAdminSimulation, currentUser, userProfile, setUserProfile]);

  // Formatter for countdown timer (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to copy account number
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`📋 Account details copied!`);
  };

  const handleStartPurchase = () => {
    setStep('setup_popup');
  };

  const handleDecline = () => {
    setStep('landing');
  };

  const handleProceedPayment = () => {
    setTimeLeft(1200); // 20 minutes reset
    setTimerActive(true);
    setStep('countdown');
  };

  const handleIHavePaid = () => {
    setConfirmingTime(10);
    setConfirmingProgress(100);
    setStep('confirming');
  };

  const handleTryAgain = () => {
    setTimerActive(false);
    setStep('landing');
  };

  // Log messages for interbank processing
  const getConfirmingMessage = () => {
    if (confirmingTime > 8) return "🔄 Contacting Central Settlement Node...";
    if (confirmingTime > 6) return "🔌 Establishing interbank secure handshake...";
    if (confirmingTime > 4) return "🔍 Scanning NIBSS transaction ledgers for deposit signature...";
    if (confirmingTime > 2) return "🏷️ Confirming transaction logs & matching session IDs...";
    return "✨ Securing and compiling your CIYA Membership Badge tokens...";
  };

  // WhatsApp Message composition
  const waPhone = yearBadgeSettings?.whatsappNumber || '+2348123456789';
  const waCleanPhone = waPhone.replace(/[^0-9+]/g, '');
  const waMessage = encodeURIComponent(
    `Hello Admin! I have successfully completed the ₦${finalPrice.toLocaleString()} bank transfer payment for my CIYA Membership Badge. Please verify and approve my badge! UID: ${currentUser?.uid || 'CIYA_Student'}`
  );
  const waLink = `https://wa.me/${waCleanPhone}?text=${waMessage}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 text-left relative overflow-hidden" id="ciya-membership-badge-gateway-container">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />

      {/* STEP 1: BENEFITS LANDING */}
      {step === 'landing' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center space-y-2">
            <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center p-1">
              {yearBadgeSettings?.badgeImageUrl ? (
                <img
                  src={yearBadgeSettings.badgeImageUrl}
                  alt="Badge Icon"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-4xl">🏅</span>
              )}
            </div>
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              🏅 CIYA Academy Membership Badge
            </span>
            <h4 className="text-base md:text-lg font-black text-slate-900 tracking-tight leading-snug">
              Unlock Elite Curriculum, Priority Reviews & Badging!
            </h4>
          </div>

          {/* Benefits Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <span className="block text-[10px] font-black uppercase text-amber-800 tracking-wider">Perks & Benefits of the badge:</span>
            <div className="text-xs font-semibold text-slate-700 leading-relaxed space-y-2 whitespace-pre-wrap">
              {yearBadgeSettings?.benefitText || (
                <>
                  • Unlocks Day 4 and Day 5 high-income curriculum<br />
                  • Professional Certificate of Completion (PDF/Print)<br />
                  • Dedicated Masterclass Discord / WhatsApp Group<br />
                  • Direct 1-on-1 Admin Priority assignment reviews
                </>
              )}
            </div>
          </div>

          {/* Price and Trigger Button */}
          <div className="pt-4 border-t border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">One-time Investment</span>
              <span className="text-lg font-black text-slate-900">₦{finalPrice.toLocaleString()}</span>
            </div>

            <button
              type="button"
              onClick={handleStartPurchase}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 border-0 text-amber-955 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-2 select-none"
            >
              Purchase Membership Badge 🏷️
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SETUP ACCOUNT POPUP */}
      {step === 'setup_popup' && (
        <div className="space-y-6 animate-scaleUp">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              💳 Secured Transfer Details
            </span>
            <h4 className="text-base font-black text-slate-900">
              Verified Beneficiary Setup Details
            </h4>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Below are the bank details allocated for your certification registration. Please verify before proceeding.
            </p>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 border border-slate-800 font-sans shadow-md">
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold block">Bank Name</span>
              <p className="text-sm font-extrabold text-white">{yearBadgeSettings?.bankName || 'United Bank for Africa (UBA)'}</p>
            </div>
            
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold block">Account Name</span>
              <p className="text-sm font-extrabold text-white">{yearBadgeSettings?.accountName || 'CIYA Academy International Ltd'}</p>
            </div>

            <div className="space-y-1 flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <div>
                <span className="text-[8px] uppercase tracking-widest text-teal-400 font-extrabold block">Account Number</span>
                <p className="text-base font-mono font-black text-white">{yearBadgeSettings?.accountNumber || '1023948576'}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText(yearBadgeSettings?.accountNumber || '1023948576')}
                className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 border-0 rounded text-[10px] text-teal-300 font-mono font-black uppercase tracking-wide cursor-pointer select-none"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="p-4 bg-amber-50 text-amber-900 border border-amber-200/50 rounded-xl text-xs font-semibold leading-relaxed">
            💡 Clicking <strong>"Proceed to Make Payment"</strong> generates a temporary secure transaction session. Make the transfer within 20 minutes to prevent the account link from expiring.
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-150">
            <button
              type="button"
              onClick={handleDecline}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase rounded-lg border-0 cursor-pointer"
            >
              Decline & Go Back
            </button>
            <button
              type="button"
              onClick={handleProceedPayment}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-lg border-0 cursor-pointer shadow-sm"
            >
              Proceed to Make Payment
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: COUNTDOWN PAGE */}
      {step === 'countdown' && (
        <div className="space-y-6 animate-fadeIn">
          {timeLeft > 0 ? (
            <>
              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full animate-pulse">
                  ⏳ Transaction Active
                </span>
                <h4 className="text-base font-black text-slate-900">CIYA Payment Gateway</h4>
                
                {/* 20-Minutes Countdown Clock */}
                <div className="text-3xl font-black font-mono text-indigo-600 tracking-widest py-3 bg-indigo-50 border border-indigo-100 rounded-2xl inline-block px-8">
                  {formatTime(timeLeft)}
                </div>
                
                <p className="text-xs text-red-500 font-extrabold max-w-sm mx-auto leading-relaxed">
                  Make your transfer of <strong>₦{finalPrice.toLocaleString()}</strong> to the account below within 20 minutes. After 20 minutes, this temporary account expires and cannot be verified automatically.
                </p>
              </div>

              {/* Account details Card for copy */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400">Bank</span>
                    <p className="font-extrabold text-slate-800">{yearBadgeSettings?.bankName || 'United Bank for Africa (UBA)'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400">Account Name</span>
                    <p className="font-extrabold text-slate-800 truncate">{yearBadgeSettings?.accountName || 'CIYA Academy'}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between bg-white p-3 border border-slate-150 rounded-xl">
                  <div>
                    <span className="text-[8px] uppercase font-black text-indigo-500">Account Number</span>
                    <p className="font-mono font-black text-slate-900 text-sm">{yearBadgeSettings?.accountNumber || '1023948576'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(yearBadgeSettings?.accountNumber || '1023948576')}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-[10px] rounded border-0 cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Confirm Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl border-0 cursor-pointer"
                >
                  I will try again
                </button>
                <button
                  type="button"
                  onClick={handleIHavePaid}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl border-0 cursor-pointer shadow-md"
                >
                  I have made the payment
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 space-y-4 animate-scaleUp">
              <div className="text-4xl">❌</div>
              <div className="space-y-1">
                <h5 className="font-black text-slate-900 text-base">Temporary Account Expired!</h5>
                <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto leading-relaxed">
                  Your 20-minute transfer session has expired. The account number has been cycled. Please restart to generate a fresh transaction session.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDecline}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs border-0 cursor-pointer"
              >
                Restart Session
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: 10 SECONDS CONFIRMING LOADER */}
      {step === 'confirming' && (
        <div className="py-12 text-center space-y-6">
          {/* Progress Circular Animation */}
          <div 
            onClick={() => {
              setConfirmingTime(0);
              setStep('success');
            }}
            className="relative w-24 h-24 mx-auto flex flex-col items-center justify-center bg-indigo-50 hover:bg-indigo-100 active:scale-95 transition-all rounded-full border-2 border-indigo-200 shadow-inner cursor-pointer"
            title="Click to force skip"
          >
            <span className="text-2xl font-black font-mono text-indigo-650">{confirmingTime}s</span>
            <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">Skip ⚡</span>
          </div>

          <div className="space-y-2">
            <h5 className="font-black text-slate-900 text-sm animate-bounce">{getConfirmingMessage()}</h5>
            <p className="text-[11px] text-slate-500 font-semibold">Processing Real-Time Interbank Settlement ({confirmingProgress}% complete)...</p>
            
            {/* Horizontal progress bar */}
            <div className="w-48 bg-slate-100 h-1.5 rounded-full mx-auto overflow-hidden border">
              <div
                className="bg-indigo-600 h-full transition-all duration-1000 ease-out"
                style={{ width: `${100 - confirmingProgress}%` }}
              />
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => {
                  setConfirmingTime(0);
                  setStep('success');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-xl border-0 cursor-pointer transition-all duration-150 active:scale-95"
              >
                Force Skip Countdown & Verify ⚡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: SUCCESS & WHATSAPP REDIRECT */}
      {step === 'success' && (
        <div className="py-8 text-center space-y-6 animate-scaleUp">
          <div className="mx-auto w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-3xl shadow-md border border-amber-200">
            ⏳
          </div>
          
          <div className="space-y-2">
            <h5 className="font-black text-slate-900 text-base">Awaiting Admin Confirmation</h5>
            <p className="text-xs text-slate-600 font-semibold max-w-md mx-auto leading-relaxed">
              Your payment verification request for <strong>₦{finalPrice.toLocaleString()}</strong> has been submitted.
            </p>
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs text-slate-700 font-semibold leading-relaxed max-w-md mx-auto space-y-2 text-left">
              <p className="font-bold text-indigo-900 uppercase">⚠️ Manual Verification Pending:</p>
              <p>Your CIYA Membership Badge is <strong>not yet active</strong>. An administrator must manually verify your bank transfer ledger entry before your account can be approved.</p>
              <p className="bg-white p-3 rounded-xl border border-indigo-100 text-[11px] font-bold text-slate-800">
                📢 <strong>Action Required:</strong> Click the WhatsApp button below to message the administrator and <strong>forward your bank transfer payment receipt</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 max-w-sm mx-auto">
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-2 no-underline border-0"
            >
              💬 Message Admin on WhatsApp
            </a>
            
            {onSuccessClose && (
              <button
                type="button"
                onClick={onSuccessClose}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase rounded-lg border-0 cursor-pointer"
              >
                Close Payment Gateway
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

