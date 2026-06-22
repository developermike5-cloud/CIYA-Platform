import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { collection, query, getDocs, orderBy, doc, deleteDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Course } from '../../types';
import { Plus, Trash2, Edit3, Eye, Calendar, Sparkles, Film, ArrowRight, Play, CheckCircle } from 'lucide-react';

const SKILLS: Record<string, { label: string, icon: string, color: string, bg: string }> = {
  web: { label: "AI Website Development", icon: "🌐", color: "#0d9488", bg: "#ccfbf1" },
  film: { label: "AI Film Studio", icon: "🎬", color: "#7c3aed", bg: "#ede9fe" },
  image: { label: "AI Image & Graphics", icon: "🎨", color: "#d97706", bg: "#fef3c7" },
};

function formatFirestoreDate(timestamp: any): string {
  if (!timestamp) return '-';
  try {
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString();
    }
    if (timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString();
    }
  } catch (e) {
    console.error(e);
  }
  return '-';
}

function Badge({ text, color, bg }: { text: string, color: string, bg: string }) {
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, display: "inline-block" }}>{text}</span>;
}

function TierBadge({ tier }: { tier: string }) {
  const m: Record<string, [string, string, string]> = {
    beginner: ["#0d9488", "#ccfbf1", "Beginner · Free"],
    advanced: ["#7c3aed", "#ede9fe", "Advanced · ₦15k"],
    masterclass: ["#d97706", "#fef3c7", "Masterclass · ₦30k"],
    Beginner: ["#0d9488", "#ccfbf1", "Beginner · Free"],
    Advanced: ["#7c3aed", "#ede9fe", "Advanced · ₦15k"],
    Masterclass: ["#d97706", "#fef3c7", "Masterclass · ₦30k"]
  };
  const [c, b, t] = m[tier] || ["#64748b", "#f1f5f9", tier];
  return <Badge text={t} color={c} bg={b} />;
}

export default function CoursesAdmin() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [filterSkill, setFilterSkill] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const navigate = useNavigate();

  // Load courses in real-time
  useEffect(() => {
    let qUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (qUnsubscribe) {
        qUnsubscribe();
        qUnsubscribe = null;
      }

      if (user) {
        const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
        qUnsubscribe = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
              id: doc.id,
              ...d,
              // Compatibility map
              skill: d.skill || (d.category?.toLowerCase().includes('web') ? 'web' : d.category?.toLowerCase().includes('film') ? 'film' : d.category?.toLowerCase().includes('image') ? 'image' : 'web'),
              tier: d.tier || (d.level?.toLowerCase() === 'beginner' ? 'beginner' : d.level?.toLowerCase() === 'advanced' ? 'advanced' : d.level?.toLowerCase() === 'masterclass' ? 'masterclass' : 'beginner'),
              status: d.status || (d.publish_status === 'Published' ? 'published' : 'draft'),
              isLocked: d.isLocked || d.locked || false
            } as Course;
          });
          setCourses(data);
          setLoading(false);
        }, (error) => {
          console.error(error);
          handleFirestoreError(error, OperationType.LIST, 'courses');
          setLoading(false);
        });
      } else {
        setCourses([]);
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

  // Inline DB Actions
  const handleTogglePublish = async (courseId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'published' ? 'draft' : 'published';
      const docRef = doc(db, 'courses', courseId);
      await updateDoc(docRef, {
        status: nextStatus,
        publish_status: nextStatus === 'published' ? 'Published' : 'Draft',
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
      alert('Error updating course status.');
    }
  };

  const handleToggleLock = async (courseId: string, currentLocked: boolean) => {
    try {
      const nextLocked = !currentLocked;
      const docRef = doc(db, 'courses', courseId);
      await updateDoc(docRef, {
        isLocked: nextLocked,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
      alert('Error updating course lock status.');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this course from catalog? This cannot be undone.')) {
      return;
    }
    try {
      const docRef = doc(db, 'courses', courseId);
      await deleteDoc(docRef);
    } catch (e) {
      console.error(e);
      alert('Failed to delete course.');
    }
  };

  // Stats summary calculation
  const totalCourses = courses.length;
  const publishedCoursesCount = courses.filter(c => c.status === 'published' || c.publish_status === 'Published').length;
  const totalVideosCount = courses.reduce((acc, c) => acc + (c.days?.reduce((sum, d) => sum + (d.videos?.length || 0), 0) || 0), 0);
  const totalChecksCount = courses.reduce((acc, c) => acc + (c.days?.reduce((sum, d) => sum + (d.videos?.filter(v => v.checkType && v.checkType !== 'none').length || 0), 0) || 0), 0);

  // Apply selectors
  const filteredCourses = courses.filter(c => {
    const matchesSkill = filterSkill === 'all' || c.skill === filterSkill;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'published' && (c.status === 'published' || c.publish_status === 'Published')) ||
                         (filterStatus === 'draft' && (c.status === 'draft' || c.publish_status === 'Draft'));
    return matchesSkill && matchesStatus;
  });

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Real-time stats widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Courses", num: totalCourses, icon: "📚", colorBg: "bg-teal-50 border-teal-100 text-teal-700" },
          { label: "Published Tracks", num: publishedCoursesCount, icon: "🚀", colorBg: "bg-emerald-50 border-emerald-100 text-emerald-700" },
          { label: "Syllabus Lessons", num: totalVideosCount, icon: "🎬", colorBg: "bg-indigo-50 border-indigo-100 text-indigo-700" },
          { label: "Interactive Checks", num: totalChecksCount, icon: "🧠", colorBg: "bg-amber-50 border-amber-100 text-amber-700" },
        ].map((s, idx) => (
          <div key={idx} className={`p-4 rounded-2xl border bg-white flex items-center justify-between shadow-sm`}>
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">{s.label}</span>
              <span className="text-2xl font-black text-slate-800 leading-none">{s.num}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl select-none shadow-inner border font-bold ${s.colorBg}`}>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Control panel and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div>
            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Filter by Skill</label>
            <select
              value={filterSkill}
              onChange={e => setFilterSkill(e.target.value)}
              className="bg-white border-2 border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer transition-all"
            >
              <option value="all">All Skills Category</option>
              {Object.entries(SKILLS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-white border-2 border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft Only</option>
            </select>
          </div>
        </div>

        <Link
          to="/admin/courses/new"
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-lg shadow-md hover:-translate-y-0.5 transition-all cursor-pointer text-xs flex items-center gap-1.5 self-start sm:self-auto border-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          Create New Course
        </Link>
      </div>

      {/* Courses table / view card */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-semibold text-xs text-slate-500">Querying Course Library...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border shadow-sm border-slate-200">
          <div className="text-4xl mb-3">📬</div>
          <h4 className="text-base font-black text-slate-700">No matching tracks in view</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed font-medium">
            There are no courses currently uploaded that match your selection. Reset your dropdown parameters or append a fresh course tracking module!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Course Concept</th>
                <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Metadata Tags</th>
                <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Daily Syllabus / Scope</th>
                <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Added Date</th>
                <th className="px-5 py-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Management Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredCourses.map((c) => {
                const sk = SKILLS[c.skill || 'web'];
                const vids = c.days?.reduce((sum, d) => sum + (d.videos?.length || 0), 0) || 0;
                const checks = c.days?.reduce((sum, d) => sum + (d.videos?.filter(v => v.checkType && v.checkType !== 'none').length || 0), 0) || 0;
                const isPublished = c.status === 'published' || c.publish_status === 'Published';
                
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex gap-3.5 items-center">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border flex items-center justify-center text-xl shrink-0 shadow-inner">
                          {sk?.icon || "📘"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-sm text-slate-800 leading-tight truncate max-w-xs">{c.title}</div>
                          <div className="text-[10px] text-slate-400 font-medium mt-1 truncate max-w-xs">{c.tagline || c.subtitle || "Zero sub-theme tags outlined"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        {sk?.label && (
                          <Badge text={sk.label} color={sk.color} bg={sk.bg} />
                        )}
                        <div className="flex gap-1">
                          <TierBadge tier={c.tier || 'beginner'} />
                          <span className={`px-2 py-0.5 rounded text-[10px] items-center font-bold ${
                            isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isPublished ? 'Published' : 'Draft'}
                          </span>
                          {c.isLocked && (
                            <span className="px-2 py-0.5 rounded text-[10px] items-center font-bold bg-amber-50 border border-amber-200 text-amber-800">
                              🔒 Locked
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="space-y-0.5 text-xs font-semibold text-slate-600">
                        <div className="flex items-center gap-1">
                          <span>🎬</span> {vids} Lessons uploaded
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold">
                          <span>🧠</span> {checks} Study checks set
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-slate-500 font-mono">
                      {formatFirestoreDate(c.createdAt)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => handleToggleLock(c.id!, !!c.isLocked)}
                          className={`px-3 py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition-all ${
                            c.isLocked
                              ? 'border-teal-200 bg-teal-50 text-teal-800 font-extrabold'
                              : 'border-orange-200 bg-orange-50 text-orange-850 font-extrabold'
                          }`}
                          title={c.isLocked ? "Click to Unlock this Course" : "Click to Lock this Course"}
                        >
                          {c.isLocked ? '🔓 Unlock' : '🔒 Lock'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(c.id!, c.status!)}
                          className={`px-3 py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition-all ${
                            isPublished
                              ? 'border-amber-205 bg-amber-50 text-amber-700'
                              : 'border-emerald-202 bg-emerald-50 text-emerald-700 font-extrabold'
                          }`}
                        >
                          {isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                        <Link
                          to={`/admin/courses/${c.id}`}
                          className="px-3 py-1.5 bg-white border-2 border-slate-300 rounded-lg text-slate-800 font-extrabold hover:bg-slate-50 transition-all shadow-sm"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(c.id!)}
                          className="p-1.5 text-red-500 hover:bg-red-50 hover:border-red-200 border border-transparent rounded-lg transition-all cursor-pointer"
                          title="Click to delete course permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
