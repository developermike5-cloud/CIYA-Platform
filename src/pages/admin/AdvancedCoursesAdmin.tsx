import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { Course } from '../../types';
import { Plus, Trash2, Edit3, Eye, Calendar, Sparkles, Download, Upload, ArrowRight, CheckCircle, Copy, Info, RefreshCw, AlertCircle, EyeOff, ShieldCheck } from 'lucide-react';
import { coursesStore } from '../../utils/coursesStore';

const SKILLS: Record<string, { label: string, icon: string, color: string, bg: string }> = {
  web: { label: "AI Website Class", icon: "🌐", color: "#0d9488", bg: "#ccfbf1" },
  film: { label: "AI Film Studio Class", icon: "🎬", color: "#7c3aed", bg: "#ede9fe" },
  image: { label: "AI Graphics & Image Class", icon: "🎨", color: "#d97706", bg: "#fef3c7" },
};

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
  const [c, b, t] = m[tier] || ["#7c3aed", "#ede9fe", "Advanced"];
  return <Badge text={t} color={c} bg={b} />;
}

export default function AdvancedCoursesAdmin() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filterSkill, setFilterSkill] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Non-blocking modal states
  const [deleteDialogCourse, setDeleteDialogCourse] = useState<Course | null>(null);
  const [cloneDialogCourse, setCloneDialogCourse] = useState<Course | null>(null);
  const [cloneDialogName, setCloneDialogName] = useState<string>('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load and subscribe to advanced courses only
  useEffect(() => {
    const updateAdvancedList = () => {
      const all = coursesStore.getAdvancedCourses();
      setCourses(all);
    };

    updateAdvancedList();
    const unsubscribe = coursesStore.subscribe(() => {
      updateAdvancedList();
    });

    return () => unsubscribe();
  }, []);

  const filteredCourses = courses.filter(c => {
    const matchSkill = filterSkill === 'all' || c.skill === filterSkill;
    const isPublished = c.status === 'published' || c.publish_status === 'Published';
    const matchStatus = filterStatus === 'all' || 
      (filterStatus === 'published' && isPublished) || 
      (filterStatus === 'draft' && !isPublished);
    return matchSkill && matchStatus;
  });

  // Export as JSON file download
  const handleExport = () => {
    try {
      const advancedList = coursesStore.getAdvancedCourses();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(advancedList, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "advanced_courses.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setImportStatus({
        type: 'success',
        message: 'Successfully exported advanced_courses.json file! You can keep this as a safe backup.'
      });
      setTimeout(() => setImportStatus(null), 6000);
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: `Failed to export courses: ${err.message}`
      });
    }
  };

  // Export a SINGLE course as a JSON file download
  const handleExportSingle = (c: Course) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify([c], null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const slug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      downloadAnchor.setAttribute("download", `advanced_course_${slug || 'syllabus'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setImportStatus({
        type: 'success',
        message: `Successfully exported individual course: "${c.title}" as "advanced_course_${slug || 'syllabus'}.json"! You can keep this as a separate backup.`
      });
      setTimeout(() => setImportStatus(null), 6000);
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: `Failed to export individual course: ${err.message}`
      });
    }
  };

  // Import JSON file (Supports both full arrays and single course backups with Smart Merge)
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Standardize single object to array of 1 item
        const coursesToImport = Array.isArray(parsed) ? parsed : [parsed];

        // Validate each item roughly has a title and structure
        const validated = coursesToImport.map((c: any) => {
          if (!c.title) {
            throw new Error("Each course in the imported array must have a title.");
          }
          return {
            ...c,
            id: c.id || 'adv-course_' + Math.random().toString(36).substring(2, 11),
            tier: c.tier || 'advanced',
            level: c.level || 'Advanced',
            publish_status: c.publish_status || 'Published',
            status: c.status || 'published'
          };
        });

        setIsPerformingAction(true);
        
        // Smart Merge: pull existing, merge imported, and save
        const existingAdvanced = coursesStore.getAdvancedCourses();
        const mergedMap = new Map<string, Course>();
        
        // Put existing ones first
        existingAdvanced.forEach(c => mergedMap.set(c.id!, c));
        
        // Add or overwrite with imported ones (using ID as key)
        validated.forEach((c: Course) => {
          mergedMap.set(c.id!, c);
        });
        
        const mergedList = Array.from(mergedMap.values());
        await coursesStore.saveAllAdvanced(mergedList);
        setIsPerformingAction(false);

        setImportStatus({
          type: 'success',
          message: `Successfully imported and merged ${validated.length} course(s)! Your syllabus registry now has ${mergedList.length} total active advanced courses, safely synced to code disk.`
        });

        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => setImportStatus(null), 6000);
      } catch (err: any) {
        setIsPerformingAction(false);
        setImportStatus({
          type: 'error',
          message: `Failed to import file: ${err.message}`
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Trigger file upload
  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  // Create a new advanced course
  const handleCreateNewAdvanced = () => {
    const newId = 'adv-course_' + Math.random().toString(36).substring(2, 11);
    const newCourse: Course = {
      id: newId,
      title: "New Advanced Mastery Course",
      subtitle: "Tagline detailing advanced techniques and tools",
      category: "AI Website Class",
      skill: "web",
      level: "Advanced",
      tier: "advanced",
      price: 15000,
      instructor: "CIYA Team",
      durationMode: "standard",
      outcomes: "Build high-level integrations; Optimize systems.",
      requirements: "Basic frontend and AI knowledge.",
      publish_status: "Draft",
      status: "draft",
      isLocked: false,
      days: Array.from({ length: 5 }, (_, i) => ({
        dayNumber: i + 1,
        title: `DAY ${i + 1}: LESSON HEADING`,
        description: "Focus objectives for this day.",
        videos: []
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setIsPerformingAction(true);
    coursesStore.saveCourse(newCourse)
      .then(() => {
        setIsPerformingAction(false);
        navigate(`/admin/courses/${newId}`);
      })
      .catch((err) => {
        setIsPerformingAction(false);
        alert("Failed to create advanced course: " + err.message);
      });
  };

  // Handle clone action
  const handleConfirmClone = () => {
    if (!cloneDialogCourse) return;
    setIsPerformingAction(true);
    coursesStore.cloneCourse(cloneDialogCourse, cloneDialogName || `${cloneDialogCourse.title} (Copy)`)
      .then(() => {
        setIsPerformingAction(false);
        setCloneDialogCourse(null);
        setCloneDialogName('');
      })
      .catch((err) => {
        setIsPerformingAction(false);
        alert("Clone failed: " + err.message);
      });
  };

  // Handle delete action
  const handleConfirmDelete = () => {
    if (!deleteDialogCourse) return;
    setIsPerformingAction(true);
    coursesStore.deleteCourse(deleteDialogCourse.id!)
      .then(() => {
        setIsPerformingAction(false);
        setDeleteDialogCourse(null);
      })
      .catch((err) => {
        setIsPerformingAction(false);
        alert("Delete failed: " + err.message);
      });
  };

  const handleTogglePublish = (courseId: string, isCurrentlyPublished: boolean) => {
    const nextStatus = isCurrentlyPublished ? 'draft' : 'published';
    const nextPublishStatus = nextStatus === 'published' ? 'Published' : 'Draft';
    
    const target = courses.find(c => c.id === courseId);
    if (target) {
      const updated = {
        ...target,
        status: nextStatus as any,
        publish_status: nextPublishStatus as any
      };
      coursesStore.saveCourse(updated);
    }
  };

  const handleToggleLock = (courseId: string, currentLocked: boolean) => {
    const nextLocked = !currentLocked;
    
    const target = courses.find(c => c.id === courseId);
    if (target) {
      const updated = {
        ...target,
        isLocked: nextLocked
      };
      coursesStore.saveCourse(updated);
    }
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-indigo-900/40">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none select-none flex items-center pr-6">
          <ShieldCheck className="w-64 h-64 text-indigo-400" />
        </div>
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-xs font-bold text-indigo-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% Frontend Hardcoded Track
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">Advanced Course Control Hub</h1>
          <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed">
            Manage your high-tier advanced curriculum in complete isolation from the backend. Since everything here is loaded statically from the frontend file <code className="text-indigo-200 bg-indigo-950/60 px-1.5 py-0.5 rounded font-mono">advanced_courses.json</code>, students will download it directly as static code—resulting in <strong>zero database queries</strong> and <strong>zero Firestore limit warnings</strong>.
          </p>
        </div>
      </div>

      {/* Quick Stats & Actions Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stat Card */}
        <div className="p-5 rounded-2xl border bg-white flex items-center justify-between shadow-sm border-slate-200">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Advanced Modules</span>
            <span className="text-3xl font-black text-slate-800 leading-none">{courses.length}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border-indigo-100 border text-indigo-600 flex items-center justify-center text-2xl shadow-inner select-none font-bold">
            ⚡
          </div>
        </div>

        {/* Export Card */}
        <button
          onClick={handleExport}
          className="p-5 rounded-2xl border bg-white hover:bg-slate-50 text-left transition-all shadow-sm border-slate-200 flex items-center justify-between group cursor-pointer"
        >
          <div className="space-y-1">
            <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider block">Local File Backup</span>
            <span className="text-base font-black text-slate-800 flex items-center gap-1">
              Export Course File <Download className="w-4 h-4 text-slate-400 group-hover:translate-y-0.5 transition-transform" />
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">Download advanced_courses.json instantly</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-indigo-50 text-slate-600 group-hover:text-indigo-600 flex items-center justify-center text-xl transition-colors">
            📥
          </div>
        </button>

        {/* Import Card */}
        <button
          onClick={triggerImport}
          className="p-5 rounded-2xl border bg-white hover:bg-slate-50 text-left transition-all shadow-sm border-slate-200 flex items-center justify-between group cursor-pointer relative"
        >
          <div className="space-y-1">
            <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider block">Restore / Import Code</span>
            <span className="text-base font-black text-slate-800 flex items-center gap-1">
              Import Course File <Upload className="w-4 h-4 text-slate-400 group-hover:-translate-y-0.5 transition-transform" />
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">Upload backup advanced_courses.json</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-emerald-50 text-slate-600 group-hover:text-emerald-600 flex items-center justify-center text-xl transition-colors">
            📤
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />
        </button>
      </div>

      {/* Notifications/Alerts */}
      {importStatus && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-md animate-fade-in ${
          importStatus.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {importStatus.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />}
          <div className="text-xs font-semibold leading-relaxed">
            {importStatus.message}
          </div>
        </div>
      )}

      {/* Action Filters and Creator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div>
            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Filter by Skill</label>
            <select
              value={filterSkill}
              onChange={e => setFilterSkill(e.target.value)}
              className="bg-white border-2 border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer transition-all"
            >
              <option value="all">All Skills</option>
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
              <option value="published">Published Only</option>
              <option value="draft">Drafts Only</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleCreateNewAdvanced}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg shadow-md hover:-translate-y-0.5 transition-all cursor-pointer text-xs flex items-center gap-1.5 self-start sm:self-auto border-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          Create Advanced Track
        </button>
      </div>

      {/* Course List Grid / Table */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border shadow-sm border-slate-200">
          <div className="text-4xl mb-3">🎓</div>
          <h4 className="text-base font-black text-slate-700">No Advanced Courses Added Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed font-medium">
            Click "Create Advanced Track" above or upload an existing course JSON file to get started designing!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Advanced Course Module</th>
                  <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Metadata Tags</th>
                  <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Syllabus Scope</th>
                  <th className="px-5 py-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
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
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/30 flex items-center justify-center text-xl shrink-0 shadow-inner">
                            {sk?.icon || "📘"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-sm text-slate-800 leading-tight truncate max-w-xs">{c.title}</div>
                            <div className="text-[10px] text-slate-400 font-medium mt-1 truncate max-w-xs">{c.subtitle || "No subtitle outlined"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          {sk?.label && (
                            <Badge text={sk.label} color={sk.color} bg={sk.bg} />
                          )}
                          <div className="flex gap-1 flex-wrap">
                            <TierBadge tier={c.tier || 'advanced'} />
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
                      <td className="px-5 py-4 whitespace-nowrap text-right text-xs font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleLock(c.id!, !!c.isLocked)}
                            className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] cursor-pointer transition-all ${
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
                            className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] cursor-pointer transition-all ${
                              isPublished
                                ? 'border-amber-200 bg-amber-55 text-amber-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 font-extrabold'
                            }`}
                          >
                            {isPublished ? 'Unpublish' : 'Publish'}
                          </button>
                          <Link
                            to={`/admin/courses/${c.id}`}
                            title="Edit syllabus curriculum"
                            className="p-1.5 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-indigo-100 inline-block"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setCloneDialogCourse(c);
                              setCloneDialogName(`${c.title} (Copy)`);
                            }}
                            title="Clone syllabus module"
                            className="p-1.5 hover:bg-teal-50 text-teal-600 hover:text-teal-700 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-teal-100"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleExportSingle(c)}
                            title="Download/Export this course individually"
                            className="p-1.5 hover:bg-amber-50 text-amber-600 hover:text-amber-700 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-amber-100"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteDialogCourse(c)}
                            title="Delete syllabus"
                            className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-100"
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

      {/* Tutorial: How to upload the file to netlify/github */}
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-4">
        <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
          <Info className="w-5 h-5 text-indigo-600 shrink-0" />
          Student Dashboard Update workflow (Netlify / GitHub)
        </h3>
        <p className="text-xs text-slate-600 font-medium leading-relaxed">
          Because this course is fully hardcoded inside the code to run offline and not use databases, follow this simple, stress-free workflow whenever you update lessons or course descriptions:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium mt-3">
          <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-2 shadow-sm">
            <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700">1</div>
            <h4 className="font-extrabold text-slate-800">Edit / Update</h4>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Use the builder actions above to edit lessons, add day scopes, questions, and click Save.
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-2 shadow-sm">
            <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700">2</div>
            <h4 className="font-extrabold text-slate-800">Export course</h4>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Click the **"Export Course File"** button above to download the <code className="bg-slate-100 text-slate-700 px-1 font-mono text-[10px] rounded">advanced_courses.json</code> backup.
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-2 shadow-sm">
            <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-700">3</div>
            <h4 className="font-extrabold text-slate-800">Publish Static</h4>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Drag & Drop or upload that downloaded file to me in this chat! I will put it into the code folder and rebuild instantly—making the change permanently live!
            </p>
          </div>
        </div>
      </div>

      {/* Clone Confirmation Dialog Modal */}
      {cloneDialogCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h4 className="text-base font-black text-slate-800">Clone Course Tracking Module</h4>
            <p className="text-xs text-slate-500">Provide a descriptive title for this cloned syllabus variation:</p>
            <input
              type="text"
              value={cloneDialogName}
              onChange={e => setCloneDialogName(e.target.value)}
              placeholder="e.g. Cloned Advanced Course Module"
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600 transition-colors"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={isPerformingAction}
                onClick={() => setCloneDialogCourse(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs cursor-pointer transition-all border-0"
              >
                Cancel
              </button>
              <button
                disabled={isPerformingAction}
                onClick={handleConfirmClone}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer transition-all border-0 shadow-md flex items-center gap-1.5"
              >
                {isPerformingAction ? 'Cloning...' : 'Confirm Clone'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog Modal */}
      {deleteDialogCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 text-xl mx-auto">
              ⚠️
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-800">Delete Advanced Syllabus?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you absolutely sure you want to completely erase <strong className="text-slate-700 font-extrabold">"{deleteDialogCourse.title}"</strong>? This will permanently erase it from local cache storage.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={isPerformingAction}
                onClick={() => setDeleteDialogCourse(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs cursor-pointer transition-all border-0"
              >
                Cancel
              </button>
              <button
                disabled={isPerformingAction}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs cursor-pointer transition-all border-0 shadow-md"
              >
                {isPerformingAction ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
