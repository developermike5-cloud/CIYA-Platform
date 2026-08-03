import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, triggerSystemSignal } from '../../firebase';
import { 
  Award, 
  RefreshCw, 
  Download, 
  Eye, 
  EyeOff, 
  Trophy, 
  ChevronRight, 
  Users, 
  BookOpen, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save
} from 'lucide-react';
import { coursesStore } from '../../utils/coursesStore';

interface LeaderboardEntry {
  uid: string;
  rank: number;
  fullName: string;
  email: string;
  cohort: string;
  lessonsCompleted: number;
  quizzesPassed: number;
  totalScore: number;
  currentCourse: string;
}

export default function LeaderboardAdmin() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('Cohort 1');
  const [allowedCohorts, setAllowedCohorts] = useState<string[]>(['Cohort 3']);
  const [savingConfig, setSavingConfig] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Available cohorts list (aligned with standard course cohorts)
  const availableCohorts = useMemo(() => ['Cohort 1', 'Cohort 2', 'Cohort 3', 'Cohort 4', 'Cohort 5'], []);

  // Fetch users and leaderboard configurations on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch live student profiles
      const usersSnap = await getDocs(collection(db, 'users'));
      const fetchedUsers: any[] = [];
      usersSnap.forEach((d) => {
        fetchedUsers.push({ id: d.id, ...d.data() });
      });
      setUsers(fetchedUsers);

      // 2. Fetch allowed cohorts and selected target cohort config
      const configDoc = await getDoc(doc(db, 'settings', 'leaderboard_config'));
      if (configDoc.exists()) {
        const data = configDoc.data();
        if (Array.isArray(data.allowedCohorts)) {
          setAllowedCohorts(data.allowedCohorts);
        }
        if (data.selectedCohort && typeof data.selectedCohort === 'string') {
          setSelectedCohort(data.selectedCohort);
        }
      } else {
        // Bootstrapping the default configuration if not present
        await setDoc(doc(db, 'settings', 'leaderboard_config'), {
          allowedCohorts: ['Cohort 3'],
          selectedCohort: 'Cohort 1',
          updatedAt: serverTimestamp()
        });
        setAllowedCohorts(['Cohort 3']);
      }
    } catch (err: any) {
      console.error("Error fetching admin leaderboard data:", err);
      showToast("Failed to load leaderboard database records.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if course is an advanced course
  const isAdvancedCourse = (courseTitle: string): boolean => {
    if (!courseTitle) return false;
    const lower = courseTitle.toLowerCase();
    return lower.includes('advance') || lower.includes('pro') || lower.includes('expert');
  };

  // Calculate live leaderboard entries for the selected cohort
  const calculatedLeaderboard: LeaderboardEntry[] = useMemo(() => {
    // Filter to beginners students inside selected cohort
    const cohortStudents = users.filter(u => {
      const cohortMatch = (u.cohort || 'Cohort 1') === selectedCohort;
      // Exclude admin emails
      const isNotAdmin = u.email !== 'developermike5@gmail.com' && u.role !== 'admin';
      return cohortMatch && isNotAdmin;
    });

    const entries: LeaderboardEntry[] = cohortStudents.map(student => {
      // Calculate progress stats
      let lessonsCompleted = 0;
      let quizzesPassed = 0;
      let aggregateQuizScore = 0;

      const progressStore = student.progress || {};
      
      // Look through all progress entries to compile beginners points
      Object.keys(progressStore).forEach(courseId => {
        const courseData = progressStore[courseId] || {};
        
        // Count watched videos
        if (Array.isArray(courseData.watched)) {
          lessonsCompleted += courseData.watched.length;
        }

        // Count checkPassed quizzes
        if (Array.isArray(courseData.checkPassed)) {
          quizzesPassed += courseData.checkPassed.length;
        }

        // Sum quiz scores
        if (courseData.quizScores && typeof courseData.quizScores === 'object') {
          Object.values(courseData.quizScores).forEach((val: any) => {
            const scoreNum = Number(val) || 0;
            aggregateQuizScore += scoreNum;
          });
        }
      });

      // Gamified score: (lessons * 15) + (quizzesPassed * 50) + (aggregateQuizScore)
      const totalScore = (lessonsCompleted * 15) + (quizzesPassed * 50) + aggregateQuizScore;

      return {
        uid: student.id,
        rank: 0, // Assigned below after sorting
        fullName: student.fullName || student.displayName || 'Anonymous Student',
        email: student.email || 'N/A',
        cohort: student.cohort || 'Cohort 1',
        lessonsCompleted,
        quizzesPassed,
        totalScore,
        currentCourse: student.courseType || student.pathwaySelection || 'Beginners Syllabus'
      };
    });

    // Sort descending by score, then lessons, then alphabetical
    const sorted = entries.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      if (b.lessonsCompleted !== a.lessonsCompleted) {
        return b.lessonsCompleted - a.lessonsCompleted;
      }
      return a.fullName.localeCompare(b.fullName);
    });

    // Assign sequential ranking indexes
    return sorted.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }, [users, selectedCohort]);

  // Toggle cohort visibility permission locally
  const handleToggleCohortPermission = (cohort: string) => {
    const updatedAllowed = allowedCohorts.includes(cohort)
      ? allowedCohorts.filter(c => c !== cohort)
      : [...allowedCohorts, cohort];
    setAllowedCohorts(updatedAllowed);
  };

  // Explicitly save leaderboard configuration (visibility and selected target cohort) to Firestore
  const handleSaveLeaderboardConfig = async () => {
    setSavingConfig(true);
    try {
      await setDoc(doc(db, 'settings', 'leaderboard_config'), {
        allowedCohorts,
        selectedCohort,
        updatedAt: serverTimestamp()
      });
      await triggerSystemSignal('settings', 'leaderboard_visibility_updated');
      showToast(`Leaderboard config saved! Target: ${selectedCohort} | Visibility: ${allowedCohorts.join(', ') || 'None'}`, 'success');
    } catch (err: any) {
      console.error("Error saving leaderboard permission:", err);
      showToast("Failed to save settings to Firestore.", 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Triggers manual recount/fetch of all user records in firestore
  const handleRefreshLiveRecords = async () => {
    showToast("Scanning student database and calculating ranks...", "success");
    await fetchInitialData();
  };

  // Downloads the full calculated cohort data as CSV or JSON
  const handleDownloadLeaderboardData = () => {
    if (calculatedLeaderboard.length === 0) {
      showToast("No leaderboard data exists to download for " + selectedCohort, "error");
      return;
    }

    try {
      // Create comprehensive JSON export packet
      const exportPacket = {
        cohort: selectedCohort,
        calculatedAt: new Date().toISOString(),
        totalStudentsCount: calculatedLeaderboard.length,
        rankings: calculatedLeaderboard
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPacket, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `ciya_leaderboard_${selectedCohort.toLowerCase().replace(/\s+/g, '_')}_export.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast("Leaderboard export downloaded! Feed this to the front-end code.", "success");
    } catch (err: any) {
      console.error("Error downloading file:", err);
      showToast("Export download failed.", "error");
    }
  };

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto font-sans text-left">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-slate-100">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-full text-[10px] font-black uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" /> Beginners' syllabus ranking engine
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Course Leaderboard Console</h1>
          <p className="text-xs text-slate-500 font-semibold max-w-2xl leading-relaxed">
            Manage student rankings, trigger real-time recount calculations, download static frontend update files, and toggle student-facing visibility per cohort batch.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={handleRefreshLiveRecords}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer border-0 shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Recount Live Ranks
          </button>
          
          <button
            type="button"
            disabled={calculatedLeaderboard.length === 0}
            onClick={handleDownloadLeaderboardData}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer border-0 shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download JSON
          </button>
        </div>
      </div>

      {/* Cohort Displays Permission Hub */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="space-y-1">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b pb-3 border-slate-100">
            <Eye className="w-4 h-4 text-indigo-650" />
            Cohort Display visibility desk
          </h2>
          <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
            Specify which student batches are permitted to see the Leaderboard on their student dashboards. Unchecked cohorts will completely hide the leaderboard widget from their dashboards.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1">
          {availableCohorts.map((cohort) => {
            const isAllowed = allowedCohorts.includes(cohort);
            return (
              <button
                key={cohort}
                type="button"
                disabled={savingConfig}
                onClick={() => handleToggleCohortPermission(cohort)}
                className={`p-4 rounded-2xl border-2 cursor-pointer text-left transition-all relative overflow-hidden ${
                  isAllowed 
                    ? 'border-indigo-600 bg-indigo-50/20 hover:bg-indigo-50/40 text-indigo-900 shadow-sm' 
                    : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold tracking-tight uppercase">{cohort}</span>
                  {isAllowed ? (
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">✓</span>
                  ) : (
                    <span className="w-5 h-5 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center text-[10px] font-black">✕</span>
                  )}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider mt-2.5 text-slate-400">
                  {isAllowed ? 'Visible to student' : 'Hidden from student'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Save Settings Action Button */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            disabled={savingConfig}
            onClick={handleSaveLeaderboardConfig}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer border-0 shadow-md flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95"
          >
            <Save className={`w-4 h-4 ${savingConfig ? 'animate-spin' : ''}`} />
            {savingConfig ? 'Saving Settings...' : 'Save Target Cohort & Visibility Settings'}
          </button>
        </div>
      </div>

      {/* Ranks Viewer Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Cohort Selector and mini statistics */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Select Target Cohort</h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                Selected: {selectedCohort}
              </span>
            </div>
            
            <div className="space-y-2">
              {availableCohorts.map((cohort) => (
                <button
                  key={cohort}
                  type="button"
                  onClick={() => setSelectedCohort(cohort)}
                  className={`w-full p-4 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    selectedCohort === cohort
                      ? 'border-slate-800 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider">{cohort}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={savingConfig}
                onClick={handleSaveLeaderboardConfig}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer border-0 shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Save className={`w-3.5 h-3.5 ${savingConfig ? 'animate-spin' : ''}`} />
                {savingConfig ? 'Saving...' : 'Save Selected Target & Visibility'}
              </button>
            </div>
          </div>

          {/* Quick instructions widget */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Calculated Scoring system
            </h4>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
              CIYA's internal rating algorithm dynamically scales points based on student coursework actions:
            </p>
            <ul className="text-[10px] text-slate-500 font-bold space-y-2.5 pl-1.5">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                <span>Each watched lesson: <strong className="text-slate-800">+15 Points</strong></span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                <span>Each passed quiz: <strong className="text-slate-800">+50 Points</strong></span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                <span>Actual Quiz Score sums directly to core points profile</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Calculations Board */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6 text-left">
          <div className="flex items-center justify-between gap-4 border-b pb-4 border-slate-100">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-650" />
                Ranks table for {selectedCohort} ({calculatedLeaderboard.length} Students)
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Ranks generated instantly from live database telemetry. Click "Download JSON" to export.
              </p>
            </div>
          </div>

          {calculatedLeaderboard.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 border-2 border-dashed border-slate-100 rounded-3xl max-w-md mx-auto p-8">
              <span className="text-3xl block mb-2">📋</span>
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">No students found</h3>
              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed mt-1">
                There are currently no students registered or assigned to <strong className="text-slate-600">{selectedCohort}</strong> in the user registry database.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-2 text-center w-12">Rank</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-3 text-center">Lessons</th>
                    <th className="py-3 px-3 text-center">Quizzes</th>
                    <th className="py-3 px-4 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {calculatedLeaderboard.map((entry) => {
                    const isTop3 = entry.rank <= 3;
                    return (
                      <tr key={entry.uid} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-2 text-center">
                          {entry.rank === 1 && <span className="inline-block bg-amber-100 text-amber-800 font-black text-[10px] px-2 py-0.5 rounded-full uppercase">1st 🥇</span>}
                          {entry.rank === 2 && <span className="inline-block bg-slate-100 text-slate-800 font-black text-[10px] px-2 py-0.5 rounded-full uppercase">2nd 🥈</span>}
                          {entry.rank === 3 && <span className="inline-block bg-orange-100 text-orange-800 font-black text-[10px] px-2 py-0.5 rounded-full uppercase">3rd 🥉</span>}
                          {entry.rank > 3 && <span className="font-mono text-xs font-bold text-slate-400">#{entry.rank}</span>}
                        </td>
                        
                        <td className="py-3.5 px-4">
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-xs uppercase leading-snug">{entry.fullName}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold font-mono leading-none mt-0.5">{entry.email}</p>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-slate-700 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-lg">
                            <BookOpen className="w-3 h-3 text-indigo-500" />
                            {Math.min(entry.lessonsCompleted, 17)} / 17
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                            ✓ {entry.quizzesPassed}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono text-xs font-black text-indigo-600">
                            {entry.totalScore.toLocaleString()} pts
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Custom Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slideUp">
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
          </div>
        </div>
      )}
    </div>
  );
}
