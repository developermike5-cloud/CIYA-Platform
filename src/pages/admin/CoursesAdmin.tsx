import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { collection, query, getDocs, orderBy, doc, deleteDoc, updateDoc, onSnapshot, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, triggerSystemSignal } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Course } from '../../types';
import { Plus, Trash2, Edit3, Eye, Calendar, Sparkles, Film, ArrowRight, Play, CheckCircle, Copy } from 'lucide-react';
import staticCourses from '../../data/courses.json';

const SKILLS: Record<string, { label: string, icon: string, color: string, bg: string }> = {
  web: { label: "AI Website Class", icon: "🌐", color: "#0d9488", bg: "#ccfbf1" },
  film: { label: "AI Film Studio Class", icon: "🎬", color: "#7c3aed", bg: "#ede9fe" },
  image: { label: "AI Graphics & Image Class", icon: "🎨", color: "#d97706", bg: "#fef3c7" },
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
  const [courses, setCourses] = useState<Course[]>(() => {
    return (staticCourses as any[]).map(c => {
      return {
        id: c.id,
        ...c,
        skill: c.skill || (c.category?.toLowerCase().includes('web') ? 'web' : c.category?.toLowerCase().includes('film') ? 'film' : c.category?.toLowerCase().includes('image') ? 'image' : 'web'),
        tier: c.tier || (c.level?.toLowerCase() === 'beginner' ? 'beginner' : c.level?.toLowerCase() === 'advanced' ? 'advanced' : c.level?.toLowerCase() === 'masterclass' ? 'masterclass' : 'beginner'),
        status: c.status || (c.publish_status === 'Published' ? 'published' : 'draft'),
        isLocked: c.isLocked || c.locked || false
      } as Course;
    });
  });
  const [loading, setLoading] = useState(false);
  
  // Filters state
  const [filterSkill, setFilterSkill] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDuration, setFilterDuration] = useState<string>('all');
  
  // Custom non-blocking modal dialog states for sandboxed iframes
  const [cloneDialogCourse, setCloneDialogCourse] = useState<Course | null>(null);
  const [cloneDialogName, setCloneDialogName] = useState<string>('');
  const [deleteDialogCourse, setDeleteDialogCourse] = useState<Course | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState(false);

  const navigate = useNavigate();

  // Load courses in real-time by subscribing to Firestore overrides and merging with static data
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'courses'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      setCourses(prev => {
        const baseCourses = (staticCourses as any[]).map(c => {
          const dbMatch = dbCourses.find((dc: any) => dc.id === c.id);
          return {
            id: c.id,
            ...c,
            skill: c.skill || (c.category?.toLowerCase().includes('web') ? 'web' : c.category?.toLowerCase().includes('film') ? 'film' : c.category?.toLowerCase().includes('image') ? 'image' : 'web'),
            tier: c.tier || (c.level?.toLowerCase() === 'beginner' ? 'beginner' : c.level?.toLowerCase() === 'advanced' ? 'advanced' : c.level?.toLowerCase() === 'masterclass' ? 'masterclass' : 'beginner'),
            status: dbMatch?.status || c.status || (c.publish_status === 'Published' ? 'published' : 'draft'),
            isLocked: dbMatch?.isLocked !== undefined ? dbMatch.isLocked : (c.isLocked || c.locked || false),
            publish_status: dbMatch?.publish_status || c.publish_status || (c.publish_status === 'Published' ? 'Published' : 'Draft'),
          } as Course;
        });

        // Merging entirely custom new courses added through admin panel
        dbCourses.forEach((dbc: any) => {
          if (!baseCourses.some(bc => bc.id === dbc.id)) {
            baseCourses.push({
              ...dbc,
              skill: dbc.skill || 'web',
              tier: dbc.tier || 'beginner',
              status: dbc.status || 'draft',
              isLocked: dbc.isLocked !== undefined ? dbc.isLocked : false
            } as Course);
          }
        });

        return baseCourses;
      });
      setLoading(false);
    }, (error) => {
      console.warn("Error loading course real-time overrides from DB:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Inline DB Actions
  const handleTogglePublish = async (courseId: string, isCurrentlyPublished: boolean) => {
    const nextStatus = isCurrentlyPublished ? 'draft' : 'published';
    const nextPublishStatus = nextStatus === 'published' ? 'Published' : 'Draft';
    
    // Optimistic update
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, status: nextStatus, publish_status: nextPublishStatus } : c));

    try {
      const docRef = doc(db, 'courses', courseId);
      await updateDoc(docRef, {
        status: nextStatus,
        publish_status: nextPublishStatus,
        updatedAt: serverTimestamp()
      });
      await triggerSystemSignal('courses');
    } catch (e) {
      console.error(e);
      // Revert on failure
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, status: isCurrentlyPublished ? 'published' : 'draft', publish_status: isCurrentlyPublished ? 'Published' : 'Draft' } : c));
      alert('Error updating course status. Make sure your Admin account is correctly synchronized with the database.');
    }
  };

  const handleToggleLock = async (courseId: string, currentLocked: boolean) => {
    const nextLocked = !currentLocked;
    
    // Optimistic update
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, isLocked: nextLocked } : c));

    try {
      const docRef = doc(db, 'courses', courseId);
      await updateDoc(docRef, {
        isLocked: nextLocked,
        updatedAt: serverTimestamp()
      });
      await triggerSystemSignal('courses');
    } catch (e) {
      console.error(e);
      // Revert on failure
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, isLocked: currentLocked } : c));
      alert('Error updating course lock status.');
    }
  };

  const confirmDeleteCourse = async () => {
    if (!deleteDialogCourse?.id) return;
    setIsPerformingAction(true);
    try {
      const docRef = doc(db, 'courses', deleteDialogCourse.id);
      await deleteDoc(docRef);
      await triggerSystemSignal('courses');
      setDeleteDialogCourse(null);
    } catch (e) {
      console.error(e);
      alert('Failed to delete course.');
    } finally {
      setIsPerformingAction(false);
    }
  };

  const confirmCloneCourse = async () => {
    if (!cloneDialogCourse) return;
    const clonedTitle = cloneDialogName.trim() || `${cloneDialogCourse.title} (Clone)`;
    setIsPerformingAction(true);

    try {
      // Map and clean Days to ensure no undefined fields and full deep cloning of quizzes, videos, assignments
      const clonedDays = (cloneDialogCourse.days || []).map((day, dIdx) => ({
        dayNumber: day.dayNumber || (dIdx + 1),
        title: day.title || `Day ${dIdx + 1}`,
        description: day.description || '',
        assignment: day.assignment ? {
          prompt: day.assignment.prompt || '',
          dueNote: day.assignment.dueNote || ''
        } : { prompt: '', dueNote: '' },
        videos: (day.videos || []).map((v) => ({
          id: Math.random().toString(36).substring(2, 9),
          title: v.title || '',
          video_url: v.video_url || v.url || '',
          url: v.video_url || v.url || '',
          duration: v.duration || '10 min',
          description: v.description || '',
          resources: v.resources || '',
          checkType: v.checkType || 'none',
          check: v.check ? JSON.parse(JSON.stringify(v.check)) : null,
          funFact: v.funFact ? { ...v.funFact } : null
        }))
      }));

      // Explicitly construct cloned payload to strictly conform to firestore rules
      const payload: Record<string, any> = {
        title: clonedTitle,
        subtitle: cloneDialogCourse.tagline || cloneDialogCourse.subtitle || '',
        tagline: cloneDialogCourse.tagline || cloneDialogCourse.subtitle || '',
        thumbnail: cloneDialogCourse.thumbnail || '',
        description: cloneDialogCourse.overview || cloneDialogCourse.description || '',
        overview: cloneDialogCourse.overview || cloneDialogCourse.description || '',
        category: cloneDialogCourse.category || 'AI Website Class',
        skill: cloneDialogCourse.skill || 'web',
        subskill: cloneDialogCourse.subskill || '',
        skillPath: cloneDialogCourse.skillPath || '',
        durationMode: 'express',
        clonedFromId: cloneDialogCourse.id || '',
        level: cloneDialogCourse.level || 'Beginner',
        tier: cloneDialogCourse.tier || 'beginner',
        price: Number(cloneDialogCourse.price) || 0,
        instructor: cloneDialogCourse.instructor || 'CIYA Team',
        outcomes: cloneDialogCourse.outcomes || '',
        requirements: cloneDialogCourse.requirements || '',
        publish_status: 'Draft',
        status: 'draft',
        isLocked: !!cloneDialogCourse.isLocked,
        isCloned: true,
        days: clonedDays,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Sanitize fields to ensure absolutely NO undefined values are passed to Firestore
      const cleanedPayload: Record<string, any> = {};
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined) {
          cleanedPayload[k] = v;
        }
      });

      await addDoc(collection(db, 'courses'), cleanedPayload);
      await triggerSystemSignal('courses');
      setCloneDialogCourse(null);
      alert(`Course cloned successfully! Saved as Draft: "${clonedTitle}".`);
    } catch (err: any) {
      console.error("Error cloning course:", err);
      alert("Failed to clone course. Error: " + err.message);
    } finally {
      setIsPerformingAction(false);
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
    const matchesDuration = filterDuration === 'all' || c.durationMode === filterDuration;
    return matchesSkill && matchesStatus && matchesDuration;
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
          <div>
            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Filter by Duration</label>
            <select
              value={filterDuration}
              onChange={e => setFilterDuration(e.target.value)}
              className="bg-white border-2 border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer transition-all"
            >
              <option value="all">All Durations</option>
              <option value="standard">Standard</option>
              <option value="express">Express</option>
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
                          {c.durationMode && (
                            <span className={`px-2 py-0.5 rounded text-[10px] items-center font-bold ${
                              c.durationMode === 'express' ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-sky-100 text-sky-800 border border-sky-200'
                            }`}>
                              ⏱️ {c.durationMode === 'express' ? 'Express' : 'Standard'}
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
                          onClick={() => handleTogglePublish(c.id!, isPublished)}
                          className={`px-3 py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition-all ${
                            isPublished
                              ? 'border-amber-205 bg-amber-50 text-amber-700'
                              : 'border-emerald-202 bg-emerald-50 text-emerald-700 font-extrabold'
                          }`}
                        >
                          {isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCloneDialogCourse(c);
                            setCloneDialogName(`${c.title} (Clone)`);
                          }}
                          className="px-3 py-1.5 bg-indigo-50 border-2 border-indigo-200 rounded-lg text-indigo-700 font-extrabold hover:bg-indigo-100 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                          title="Clone/duplicate this course"
                        >
                          <Copy className="w-3.5 h-3.5 shrink-0" />
                          Clone
                        </button>
                        <Link
                          to={`/admin/courses/${c.id}`}
                          className="px-3 py-1.5 bg-white border-2 border-slate-300 rounded-lg text-slate-800 font-extrabold hover:bg-slate-50 transition-all shadow-sm"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteDialogCourse(c)}
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

      {/* Custom Delete Confirmation Modal */}
      {deleteDialogCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-left">
            <h3 className="text-lg font-black text-slate-900 mb-2">🗑️ Delete Course Permanently?</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Are you absolutely sure you want to delete <span className="font-extrabold text-slate-800">"{deleteDialogCourse.title}"</span>? All modules, days, lesson videos, resources, quizzes, and student submissions will be lost forever. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isPerformingAction}
                onClick={() => setDeleteDialogCourse(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPerformingAction}
                onClick={confirmDeleteCourse}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isPerformingAction ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Clone Prompt Modal */}
      {cloneDialogCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-left">
            <h3 className="text-lg font-black text-slate-900 mb-2">📋 Clone & Duplicate Course</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              This will create a draft duplicate of <span className="font-extrabold text-slate-800">"{cloneDialogCourse.title}"</span> including all day configurations, video playlists, and assignments. Please specify a title for the clone:
            </p>
            <div className="mb-4">
              <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">New Course Title</label>
              <input
                type="text"
                required
                value={cloneDialogName}
                onChange={(e) => setCloneDialogName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:bg-white transition-all"
                placeholder="Enter cloned course title..."
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isPerformingAction}
                onClick={() => setCloneDialogCourse(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPerformingAction || !cloneDialogName.trim()}
                onClick={confirmCloneCourse}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isPerformingAction ? 'Cloning...' : 'Clone Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
