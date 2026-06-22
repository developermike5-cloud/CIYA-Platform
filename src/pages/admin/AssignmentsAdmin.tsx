import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { CheckCircle2, XCircle, Clock, Search, FileText, Download, Check, RefreshCw } from 'lucide-react';

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
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Disapproved'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  const [reason, setReason] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'refused', msg: string } | null>(null);

  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    let qUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      if (qUnsubscribe) {
        qUnsubscribe();
        qUnsubscribe = null;
      }

      if (user) {
        const q = query(
          collection(db, 'assignments'),
          orderBy('createdAt', 'desc')
        );

        qUnsubscribe = onSnapshot(q, (snapshot) => {
          const list: Submission[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Submission);
          });
          setSubmissions(list);
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
  }, []);

  const showToastMsg = (msg: string, type: 'success' | 'refused' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleGrade = async (sub: Submission, isApproved: boolean) => {
    if (!currentUser) return;
    setSubmittingGrade(true);
    const newStatus = isApproved ? 'Approved' : 'Disapproved';

    try {
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

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesStatus = statusFilter === 'All' || sub.status === statusFilter;
    const matchesSearch = 
      sub.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.id.includes(searchQuery);
    return matchesStatus && matchesSearch;
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
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              📂 Inbound Task Submissions 
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                {filteredSubmissions.length} matches
              </span>
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

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student email, name, or submission ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 outline-none rounded-xl text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
            />
          </div>

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
                      <td className="p-3">
                        <div className="font-extrabold text-slate-900">{sub.userName || "CIYA Cadet"}</div>
                        <div className="text-slate-400 text-[10px] select-all">{sub.userEmail}</div>
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
                      <td className="p-3 text-right">
                        <button className="text-indigo-600 hover:text-indigo-900 text-xs font-black uppercase">
                          Inspect &rarr;
                        </button>
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
                  {(selectedSub.fileUrl.startsWith('data:image') || selectedSub.fileName?.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/)) && (
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
    </div>
  );
}
