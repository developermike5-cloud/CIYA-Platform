import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Lock, Unlock, ShieldAlert, Sparkles, CheckCircle, HelpCircle } from 'lucide-react';

interface LockedSections {
  courses: boolean;
  prompts: boolean;
  profile: boolean;
  notifications: boolean;
  assignments: boolean;
}

export default function PortalLocksAdmin() {
  const [lockedSections, setLockedSections] = useState<LockedSections>({
    courses: false,
    prompts: false,
    profile: false,
    notifications: false,
    assignments: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    const docRef = doc(db, 'settings', 'app');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.lockedSections) {
          setLockedSections({
            courses: !!data.lockedSections.courses,
            prompts: !!data.lockedSections.prompts,
            profile: !!data.lockedSections.profile,
            notifications: !!data.lockedSections.notifications,
            assignments: !!data.lockedSections.assignments,
          });
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Error loading portal locks state:", error);
      setLoading(false);
    });

    return () => {
      authUnsubscribe();
      unsubscribe();
    };
  }, []);

  const handleToggleLock = async (section: keyof LockedSections) => {
    setSaving(true);
    const updatedLocks = {
      ...lockedSections,
      [section]: !lockedSections[section],
    };

    setLockedSections(updatedLocks);

    try {
      await setDoc(doc(db, 'settings', 'app'), {
        lockedSections: updatedLocks,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("Error setting portal lock:", err);
      alert("Failed to update lock permission state on the server. Verify your administrator authorization!");
    } finally {
      setSaving(false);
    }
  };

  const sectionsInfo = [
    {
      key: 'courses' as keyof LockedSections,
      title: 'Explore Curriculum Arena',
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
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-500 uppercase tracking-widest text-xs font-mono">
        <div className="animate-spin text-teal-600 mr-2 text-base">⏳</div> Loading system portal controls...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-left py-2" id="portal-locks-admin-container">
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
              Instantly toggle locking parameters for individual Student Dashboard views. When locked, students will view a polished, stylized Lock screen explaining ofcohort schedules or administrator lock restrictions.
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
        {sectionsInfo.map((sec) => {
          const isLocked = lockedSections[sec.key];
          return (
            <div 
              key={sec.key} 
              className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between gap-6 ${
                isLocked 
                  ? 'bg-rose-50/10 border-rose-300 ring-2 ring-rose-500/10 shadow-md shadow-rose-950/5' 
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

                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">{sec.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
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
                  disabled={saving}
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

      {/* Auxiliary Help Notice card */}
      <div className="bg-slate-55 shadow-sm border border-slate-200 max-w-2xl mx-auto rounded-2xl p-5 flex gap-4 text-xs font-semibold leading-relaxed text-slate-600 text-left">
        <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <p>
          Need to schedule locks? Toggle values manually here anytime a training session goes live, or cohorts transition through modules. Modifications sync instantly to all connected student app instances without forcing browser refreshes.
        </p>
      </div>
    </div>
  );
}
