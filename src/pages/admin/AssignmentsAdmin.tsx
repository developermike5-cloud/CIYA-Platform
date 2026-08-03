import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, limit, where, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, auth, triggerSystemSignal } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { CheckCircle2, XCircle, Clock, Search, FileText, Download, Check, RefreshCw, Trash2, Trash } from 'lucide-react';
import { safeStorage } from '../../utils/safeStorage';
import { rejectSubmissionMedia } from '../../lib/cloudinaryService';

interface Submission {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  courseId: string;
  dayIndex: number;
  submittedText: string;
  fileUrl?: string;
  fileName?: string;
  images?: string[];
  status: 'Pending' | 'Approved' | 'Disapproved';
  adminReason?: string;
  gradedBy?: string;
  gradedAt?: any;
  createdAt: any;
}

export default function AssignmentsAdmin() {
  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    try {
      const cached = safeStorage.getItem('ciya_cached_admin_assignments');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = safeStorage.getItem('ciya_cached_admin_assignments');
      return !cached;
    } catch (e) {
      return true;
    }
  });
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Disapproved'>('Pending');
  const [cohortFilter, setCohortFilter] = useState<string>('All');
  const [courseTypeFilter, setCourseTypeFilter] = useState<'All' | 'Beginner' | 'Advanced'>('All');
  const [checkedSubIds, setCheckedSubIds] = useState<string[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  // Custom confirmation modal states to bypass sandboxed iframe confirm() blocks
  const [deleteConfirmSubId, setDeleteConfirmSubId] = useState<string | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  const [reason, setReason] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'refused', msg: string } | null>(null);

  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // Fetch courses list to map courseId -> beginner/advanced tier
  useEffect(() => {
    const q = query(collection(db, 'courses'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setCourses(list);
    }, (error) => {
      console.warn("Error fetching courses for admin assignments filter:", error);
    });
    return () => unsubscribe();
  }, []);

  const isSubmissionAdvanced = (sub: Submission) => {
    const course = courses.find(c => c.id === sub.courseId);
    if (!course) {
      const cIdLower = (sub.courseId || '').toLowerCase();
      return cIdLower.includes('advanced') || cIdLower.includes('masterclass') || cIdLower.includes('adv');
    }
    const isAdv = course.tier === 'advanced' || course.tier === 'masterclass' || (course.level && ['advanced', 'masterclass'].includes(course.level.toLowerCase()));
    return !!isAdv;
  };

  const handleDeleteSingle = (subId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmSubId(subId);
  };

  const executeDeleteSingle = async () => {
    if (!deleteConfirmSubId) return;
    const subId = deleteConfirmSubId;
    setDeleteConfirmSubId(null);
    try {
      const subToDelete = submissions.find(s => s.id === subId);
      if (subToDelete) {
        await rejectSubmissionMedia(subToDelete);
      }
      await deleteDoc(doc(db, 'assignments', subId));
      showToastMsg("Assignment submission deleted successfully!", "success");
      if (selectedSub?.id === subId) {
        setSelectedSub(null);
      }
      setCheckedSubIds(prev => prev.filter(id => id !== subId));
    } catch (err: any) {
      console.error("Error deleting assignment:", err);
      showToastMsg(`Failed to delete assignment: ${err.message}`, "refused");
    }
  };

  const handleBulkDelete = () => {
    if (checkedSubIds.length === 0) return;
    setIsBulkDeleteConfirmOpen(true);
  };

  const executeBulkDelete = async () => {
    setIsBulkDeleteConfirmOpen(false);
    if (checkedSubIds.length === 0) return;
    setLoading(true);
    try {
      const subsToDelete = submissions.filter(s => checkedSubIds.includes(s.id));
      await Promise.allSettled(subsToDelete.map(s => rejectSubmissionMedia(s)));

      const batch = writeBatch(db);
      checkedSubIds.forEach(id => {
        batch.delete(doc(db, 'assignments', id));
      });
      await batch.commit();
      
      showToastMsg(`Successfully wiped ${checkedSubIds.length} assignment submissions!`, "success");
      
      if (selectedSub && checkedSubIds.includes(selectedSub.id)) {
        setSelectedSub(null);
      }
      setCheckedSubIds([]);
    } catch (err: any) {
      console.error("Error in bulk deletion:", err);
      showToastMsg(`Bulk deletion failed: ${err.message}`, "refused");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let qUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      if (qUnsubscribe) {
        qUnsubscribe();
        qUnsubscribe = null;
      }

      if (user) {
        const queryConstraints: any[] = [];
        if (statusFilter !== 'All') {
          queryConstraints.push(where('status', '==', statusFilter));
        }
        queryConstraints.push(limit(500));

        const q = query(
          collection(db, 'assignments'),
          ...queryConstraints
        );

        qUnsubscribe = onSnapshot(q, (snapshot) => {
          const list: Submission[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            let submittedText = data.submittedText || '';
            let images = data.images || [];

            if (submittedText.includes("---IMAGES_JSON---")) {
              const parts = submittedText.split("---IMAGES_JSON---");
              submittedText = parts[0].trim();
              try {
                images = JSON.parse(parts[1].trim());
              } catch (e) {
                console.error("Error parsing images JSON", e);
              }
            }

            list.push({ 
              id: docSnap.id, 
              ...data,
              submittedText,
              images
            } as Submission);
          });

          // Sort submissions by createdAt descending client-side
          list.sort((a, b) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return timeB - timeA;
          });

          setSubmissions(list);
          try {
            safeStorage.setItem('ciya_cached_admin_assignments', JSON.stringify(list));
          } catch (e) {}
          setLoading(false);
        }, (error) => {
          console.error("Error fetching assignments:", error);
          setLoading(false);
        });
      } else {
        setSubmissions([]);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (qUnsubscribe) {
        qUnsubscribe();
      }
    };
  }, [statusFilter]);

  const showToastMsg = (msg: string, type: 'success' | 'refused' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleGrade = async (sub: Submission, isApproved: boolean) => {
    if (!currentUser) return;
    setSubmittingGrade(true);
    const newStatus = isApproved ? 'Approved' : 'Disapproved';

    try {
      if (!isApproved) {
        await rejectSubmissionMedia(sub);
      }

      // 1. Update assignment state
      const subRef = doc(db, 'assignments', sub.id);
      await updateDoc(subRef, {
        status: newStatus,
        adminReason: reason.trim(),
        gradedBy: currentUser.email || 'Admin',
        gradedAt: serverTimestamp()
      });

      // 2. Dispatch a user notification
      const notificationMessage = isApproved 
        ? `Congratulations! Your Day ${sub.dayIndex + 1} assignment has been approved by the administrators. The Day ${sub.dayIndex + 2} content is now unlocked for you. ${reason ? `Admin reason: "${reason}"` : ''}`
        : `Your Day ${sub.dayIndex + 1} assignment was returned/disapproved. Please review and re-submit. Reason: "${reason || 'No explanation provided'}"`;

      await addDoc(collection(db, 'notifications'), {
        userId: sub.userId,
        title: isApproved ? `Day ${sub.dayIndex + 1} Assignment Approved! 🎉` : `Day ${sub.dayIndex + 1} Assignment Disapproved ❌`,
        message: notificationMessage,
        type: 'assignment_graded',
        isRead: false,
        triggeredBy: currentUser.email || 'Admin',
        triggerType: 'automatic',
        createdAt: serverTimestamp()
      });

      // 3. Trigger notification template automatic triggers too (just in case they are set up)
      try {
        const triggerType = isApproved ? 'assignment_approved' : 'assignment_disapproved';
        await addDoc(collection(db, 'notifications'), {
          userId: sub.userId,
          title: `Assignment Update Alert`,
          message: `Your submitted milestones got inspected: Now status is [${newStatus}]. Comment: "${reason || 'N/A'}"`,
          type: 'automatic_trigger',
          isRead: false,
          triggeredBy: 'System',
          triggerType: 'automatic',
          createdAt: serverTimestamp()
        });
      } catch (templateErr) {
        console.warn("Skip automatic cascade triggers", templateErr);
      }

      await triggerSystemSignal('user_signals', sub.userId);

      showToastMsg(`Assignment labeled as ${newStatus} successfully!`, 'success');
      setSelectedSub(prev => prev ? { ...prev, status: newStatus, adminReason: reason } : null);
      setReason('');
    } catch (e: any) {
      console.error(e);
      showToastMsg(`Error processing grades: ${e.message}`, 'refused');
    } finally {
      setSubmittingGrade(false);
    }
  };

  // Extract unique cohorts from submissions list (excluding falsy values and 'All')
  const uniqueCohorts = Array.from(new Set(
    submissions
      .map(s => (s as any).cohort)
      .filter((c): c is string => typeof c === 'string' && !!c && c !== 'All')
  )).sort();

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesStatus = statusFilter === 'All' || sub.status === statusFilter;
    const matchesCohort = cohortFilter === 'All' || (sub as any).cohort === cohortFilter || (!cohortFilter && (sub as any).cohort === 'Cohort 1');
    
    const isAdv = isSubmissionAdvanced(sub);
    const matchesCourseType = courseTypeFilter === 'All' || (
      courseTypeFilter === 'Advanced' ? isAdv : !isAdv
    );

    const matchesSearch = 
      sub.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.id.includes(searchQuery);
    return matchesStatus && matchesCohort && matchesCourseType && matchesSearch;
  });

  return (
    <div className="space-y-6 text-left" id="assignments-admin-container">
      {/* Toast Overlays */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 transition-all animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          <div className="font-bold flex items-center gap-2">
            <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Intro Banner */}
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl border border-slate-800 shadow-md">
        <span className="text-xs bg-indigo-500/20 text-indigo-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">STUDENT EVALUATIONAL BENCHES</span>
        <h1 className="text-xl md:text-2xl font-black mt-2">Live Assignments Inbox</h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">Review, approve, or provide custom revision steps to students. Unlocks are bound directly to student evaluations.</p>
      </div>

      {/* Grid Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Submissions List Side */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2 flex-wrap">
              📂 Inbound Task Submissions 
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                {filteredSubmissions.length} matches
              </span>
              {submissions.length >= 500 && (
                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-extrabold px-2 py-0.5 rounded-full uppercase">
                  ⚠️ Capped at 500 items
                </span>
              )}
            </h3>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              {(['All', 'Pending', 'Approved', 'Disapproved'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === st ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar and Cohort Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student email, name, or submission ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 outline-none rounded-xl text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
              />
            </div>
            {/* Course Type Filter Dropdown */}
            <select
              value={courseTypeFilter}
              onChange={(e) => setCourseTypeFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm shrink-0"
            >
              <option value="All">All Curriculum Levels</option>
              <option value="Beginner">Beginner's Courses Only</option>
              <option value="Advanced">Advanced Courses Only</option>
            </select>
            {/* Cohort Filter Dropdown */}
            <select
              value={cohortFilter}
              onChange={(e) => setCohortFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm shrink-0"
            >
              <option value="All">All Cohorts</option>
              {uniqueCohorts.map(cohort => (
                <option key={cohort} value={cohort}>{cohort}</option>
              ))}
              {/* Ensure default cohorts exist as options */}
              {!uniqueCohorts.includes('Cohort 1') && <option value="Cohort 1">Cohort 1</option>}
              {!uniqueCohorts.includes('Cohort 2') && <option value="Cohort 2">Cohort 2</option>}
            </select>
          </div>

          {/* Bulk deletion action banner */}
          {checkedSubIds.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs font-extrabold text-rose-800 flex items-center gap-2">
                <span>⚠️</span>
                <span>Bulk Selection Active: <strong className="font-black text-rose-950">{checkedSubIds.length}</strong> task submissions selected for bulk operations.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCheckedSubIds([])}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-extrabold rounded-xl cursor-pointer"
                >
                  Deselect All
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border-0 shadow-sm active:scale-95 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Wipe/Delete Selected ({checkedSubIds.length})
                </button>
              </div>
            </div>
          )}

          {/* Table list view */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-medium flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Fetching student uploads...</span>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <span className="text-3xl block filter grayscale mb-2">📫</span>
              <p className="text-slate-500 font-extrabold text-xs uppercase">No student submissions matching active criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 uppercase font-black text-[10px]">
                    <th className="p-3 w-10 text-center">
                      <input 
                        type="checkbox"
                        checked={filteredSubmissions.length > 0 && filteredSubmissions.every(s => checkedSubIds.includes(s.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const allIds = filteredSubmissions.map(s => s.id);
                            setCheckedSubIds(prev => Array.from(new Set([...prev, ...allIds])));
                          } else {
                            const filteredIds = filteredSubmissions.map(s => s.id);
                            setCheckedSubIds(prev => prev.filter(id => !filteredIds.includes(id)));
                          }
                        }}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Student</th>
                    <th className="p-3">Day Index</th>
                    <th className="p-3">Uploaded Media</th>
                    <th className="p-3">Submitted At</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.map((sub) => (
                    <tr 
                      key={sub.id} 
                      onClick={() => { setSelectedSub(sub); setReason(sub.adminReason || ''); }}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        selectedSub?.id === sub.id ? 'bg-indigo-50/40 font-extrabold' : ''
                      }`}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          checked={checkedSubIds.includes(sub.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCheckedSubIds(prev => [...prev, sub.id]);
                            } else {
                              setCheckedSubIds(prev => prev.filter(id => id !== sub.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-extrabold text-slate-900">{sub.userName || "CIYA Cadet"}</div>
                        <div className="text-slate-400 text-[10px] select-all">{sub.userEmail}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-black px-1.5 py-0.5 rounded-full uppercase">{(sub as any).cohort || 'Cohort 1'}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${isSubmissionAdvanced(sub) ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                            {isSubmissionAdvanced(sub) ? 'Advanced' : 'Beginner'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-800 border font-mono px-2 py-0.5 rounded-md font-bold">
                          Day {sub.dayIndex + 1}
                        </span>
                      </td>
                      <td className="p-3">
                        {sub.fileName ? (
                          <div className="flex items-center gap-1.5 text-teal-700 font-semibold max-w-[150px] truncate">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{sub.fileName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-bold">Text-only Response</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 font-bold">
                        {sub.createdAt?.toDate ? sub.createdAt.toDate().toLocaleDateString() : 'Pending'}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          sub.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                          sub.status === 'Disapproved' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {sub.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                          {sub.status === 'Disapproved' && <XCircle className="w-3 h-3" />}
                          {sub.status === 'Pending' && <Clock className="w-3 h-3 animate-pulse" />}
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => { setSelectedSub(sub); setReason(sub.adminReason || ''); }}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-lg text-xs font-black uppercase border-0 cursor-pointer transition-all"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={(e) => handleDeleteSingle(sub.id, e)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 p-1.5 rounded-lg border-0 cursor-pointer transition-all"
                            title="Wipe & Delete Submission"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed Evaluation Sidebar pane */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-black text-slate-800 text-base border-b pb-3 uppercase tracking-wide">
            🔍 Evaluation Pane
          </h3>

          {selectedSub ? (
            <div className="space-y-4">
              <div className="space-y-2.5">
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Student Info</span>
                  <p className="text-sm font-black text-slate-900">{selectedSub.userName || "Academy Cadet"}</p>
                  <p className="text-xs text-slate-500 select-all font-mono">{selectedSub.userEmail}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Stage</span>
                    <span className="text-xs font-black text-slate-800">Day {selectedSub.dayIndex + 1}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Course Profile</span>
                    <span className="text-xs font-black text-indigo-700 truncate block">{selectedSub.courseId}</span>
                  </div>
                </div>
              </div>

              {/* Student text pasted or structured response */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Drafted Text / Answers</span>
                <div className="w-full bg-slate-50 border p-3.5 rounded-2xl text-xs text-slate-800 leading-relaxed font-semibold max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
                  {selectedSub.submittedText || "No text responses supplied by cadet."}
                </div>
              </div>

              {/* Uploaded File Download reference */}
              {selectedSub.fileUrl && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Attached Assignment Media</span>
                  <div className="flex items-center justify-between p-3 border border-indigo-100 bg-indigo-50/20 rounded-2xl gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                      <div className="text-xs min-w-0">
                        <p className="font-bold text-slate-900 truncate">{selectedSub.fileName || "uploaded_attachment"}</p>
                        <p className="text-[10px] text-indigo-700/60 font-medium font-bold select-none">Assignment Proof Link / Attachment</p>
                      </div>
                    </div>
                    
                    <a 
                      href={selectedSub.fileUrl} 
                      download={selectedSub.fileName || "submission"}
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wide px-3 py-2 rounded-xl shrink-0 cursor-pointer border-0"
                    >
                      <Download className="w-3 h-3" /> View Link / File
                    </a>
                  </div>

                  {/* Image render sandbox if it is an image */}
                  {(selectedSub.fileUrl.startsWith('data:image') || 
                    selectedSub.fileUrl.match(/\.(jpg|jpeg|png|webp|gif|svg|bmp|jfif|ico)/i) ||
                    selectedSub.fileUrl.includes('supabase') ||
                    selectedSub.fileUrl.includes('storage') ||
                    selectedSub.fileUrl.includes('firebasestorage') ||
                    selectedSub.fileUrl.includes('cloudinary') ||
                    selectedSub.fileName?.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|svg|bmp|jfif|ico)$/)) && (
                    <div className="mt-2 text-center border p-2 rounded-xl bg-slate-50 overflow-hidden">
                      <img 
                        src={selectedSub.fileUrl} 
                        alt="Submitted proof assignment" 
                        className="max-h-56 mx-auto rounded-lg object-contain shadow-sm bg-white cursor-zoom-in hover:opacity-90 transition-opacity"
                        referrerPolicy="no-referrer"
                        onClick={() => setZoomedImage(selectedSub.fileUrl)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Multi-screenshot uploaded images rendering */}
              {selectedSub.images && Array.isArray(selectedSub.images) && selectedSub.images.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block">
                    📸 Student Workspace Screenshots ({selectedSub.images.length})
                  </span>
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    {selectedSub.images.map((imgSrc, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setZoomedImage(imgSrc)}
                        className="relative rounded-lg overflow-hidden border border-slate-200 aspect-video bg-white hover:border-indigo-400 cursor-zoom-in group transition-all"
                      >
                        <img 
                          src={imgSrc} 
                          alt={`Student workspace screenshot ${idx + 1}`} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-205"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[8px] font-black tracking-wider text-white uppercase bg-slate-950/80 px-1.5 py-0.5 rounded">
                            Zoom 🔍
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Indicator */}
              <div className="border-t pt-4 space-y-3.5">
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1">Current Grading Status</span>
                  <div className={`p-3 rounded-2xl flex items-center justify-between font-bold text-xs border ${
                    selectedSub.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                    selectedSub.status === 'Disapproved' ? 'bg-rose-50 text-rose-800 border-rose-100' :
                    'bg-amber-50 text-amber-800 border-amber-100'
                  }`}>
                    <span>{selectedSub.status}</span>
                    <span>
                      {selectedSub.status === 'Approved' ? '✓ Videos Unlocked' :
                       selectedSub.status === 'Disapproved' ? '❌ Videos Locked' : '⏳ Action Required'}
                    </span>
                  </div>
                </div>

                {/* Grade Evaluation explanation Form */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase font-black text-slate-500">
                    ✍️ Evaluation Explanation / Reason (Notifies student) *
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Write constructive notes, details of checklist scores, or reasons for disapproval/approval..."
                    className="w-full bg-slate-50 border outline-none p-3 text-xs font-bold text-slate-800 rounded-xl focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                  />
                </div>

                {/* Submit actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => handleGrade(selectedSub, false)}
                    disabled={submittingGrade}
                    className="py-3 px-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 hover:text-rose-900 font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    Disapprove Task
                  </button>
                  <button
                    onClick={() => handleGrade(selectedSub, true)}
                    disabled={submittingGrade}
                    className="py-3 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer border-0 disabled:opacity-50"
                  >
                    Approve & Unlock
                  </button>
                </div>

                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Dangerous Action</span>
                  <button
                    onClick={() => handleDeleteSingle(selectedSub.id)}
                    className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-650 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-red-200"
                  >
                    <Trash className="w-3.5 h-3.5" /> Wipe Assignment Doc
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 font-extrabold text-xs uppercase border-2 border-dashed rounded-2xl leading-normal">
              <span className="text-2xl block mb-1">👈</span>
              Select a Cadet submission on the left table to begin inspecting answers and updating day progress lock triggers.
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Lightbox Zoom Magnifier Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-5xl w-full bg-slate-900 text-white rounded-3xl p-3 md:p-4 overflow-hidden shadow-2xl flex flex-col items-center border border-slate-700/60 transition-transform duration-200">
            <button 
              onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
              className="absolute top-4 right-4 bg-slate-800/80 hover:bg-slate-700 text-white font-bold p-2 px-4 rounded-full text-xs shadow hover:scale-105 transition-all border-0 cursor-pointer"
            >
              ✕ Close
            </button>
            <img 
              src={zoomedImage} 
              alt="Zoomed Student Screenshot Proof" 
              className="max-w-full max-h-[80vh] rounded-2xl object-contain selection:bg-transparent"
              onClick={(e) => e.stopPropagation()}
              referrerPolicy="no-referrer"
            />
            <div className="text-center pt-2 text-slate-400 text-[10px] font-semibold tracking-wide uppercase">
              Click anywhere outside or press the Close button to dismiss lightroom.
            </div>
          </div>
        </div>
      )}

      {/* Custom React-based Confirmation Modals */}
      {deleteConfirmSubId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 overflow-hidden flex flex-col items-center text-center">
            {/* Elegant top color band */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 to-red-600" />
            
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 mt-2">
              <Trash2 className="w-8 h-8" />
            </div>

            <h3 className="text-base font-black text-slate-800 tracking-tight mb-2">
              Confirm Submission Deletion
            </h3>

            <p className="text-xs font-semibold text-slate-500 leading-relaxed px-2 mb-6">
              Are you sure you want to permanently delete and wipe out this student assignment submission? This action cannot be undone and will reset the student's submission status.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => setDeleteConfirmSubId(null)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-2xl transition-all cursor-pointer border-0"
              >
                No, Keep It
              </button>
              <button
                onClick={executeDeleteSingle}
                className="py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-2xl shadow-md transition-all cursor-pointer border-0"
              >
                Yes, Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isBulkDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 overflow-hidden flex flex-col items-center text-center">
            {/* Elegant top color band */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 to-red-600" />
            
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 mt-2">
              <Trash2 className="w-8 h-8" />
            </div>

            <h3 className="text-base font-black text-slate-800 tracking-tight mb-2">
              Bulk Wipe Active Submissions
            </h3>

            <p className="text-xs font-semibold text-slate-500 leading-relaxed px-2 mb-6">
              Are you sure you want to permanently delete all <strong className="text-rose-700 font-extrabold">{checkedSubIds.length}</strong> selected assignment submissions? This will wipe these documents completely from the database.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => setIsBulkDeleteConfirmOpen(false)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-2xl transition-all cursor-pointer border-0"
              >
                Cancel Action
              </button>
              <button
                onClick={executeBulkDelete}
                className="py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-2xl shadow-md transition-all cursor-pointer border-0"
              >
                Wipe Selected Docs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
