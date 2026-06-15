import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Course, CourseDay, CourseVideo } from '../../types';
import { ArrowLeft, Save, Sparkles, AlertCircle, Plus, Trash2, HelpCircle } from 'lucide-react';

const SKILLS: Record<string, { label: string, icon: string, color: string, bg: string, subskills: { id: string, label: string }[] }> = {
  web: {
    label: "AI Website Development",
    icon: "🌐",
    color: "#0d9488",
    bg: "#ccfbf1",
    subskills: [
      { id: "landing", label: "Landing Page" },
      { id: "ecommerce", label: "E-Commerce" },
      { id: "portfolio", label: "Portfolio" }
    ]
  },
  film: {
    label: "AI Film Studio",
    icon: "🎬",
    color: "#7c3aed",
    bg: "#ede9fe",
    subskills: [
      { id: "short", label: "Short Video" },
      { id: "commercial", label: "Commercial Video" },
      { id: "cinematic", label: "Cinematic Video" }
    ]
  },
  image: {
    label: "AI Image & Graphics",
    icon: "🎨",
    color: "#d97706",
    bg: "#fef3c7",
    subskills: [
      { id: "mockup", label: "Mockup Image" },
      { id: "graphic", label: "Graphic Design" },
      { id: "imagemockup", label: "Image Mockup" }
    ]
  },
};

const DAYS_RANGE = [1, 2, 3, 4, 5];

const emptyQuiz = () => ({ type: "mcq", question: "", options: ["", "", "", ""], correct: 0, explanation: "" });
const emptyTF = () => ({ type: "tf", statement: "", answer: true, explanation: "" });
const emptyFact = () => ({ type: "fact", headline: "Did you know?", body: "" });
const emptyVideo = (): CourseVideo => ({
  id: Math.random().toString(36).substring(2, 9),
  title: "",
  video_url: "",
  url: "",
  duration: "10 min",
  description: "",
  resources: "",
  checkType: "none",
  check: null
});
const emptyDay = (dayNum: number): CourseDay => ({
  dayNumber: dayNum,
  title: `Day ${dayNum}: Core Fundamentals`,
  description: "",
  videos: [],
  assignment: { prompt: "", dueNote: "" }
});

const defaultInitialForm = (): Course => ({
  title: "",
  subtitle: "",
  tagline: "",
  thumbnail: "",
  description: "",
  overview: "",
  skill: "web",
  subskill: "landing",
  category: "AI Website development",
  level: "Beginner",
  tier: "beginner",
  price: 0,
  instructor: "CIYA Team",
  outcomes: "",
  requirements: "",
  publish_status: "Draft",
  status: "draft",
  days: DAYS_RANGE.map(d => emptyDay(d))
});

function Badge({ text, color, bg }: { text: string, color: string, bg: string }) {
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, display: "inline-block" }}>{text}</span>;
}

function TierBadge({ tier }: { tier: string }) {
  const m: Record<string, [string, string, string]> = {
    beginner: ["#0d9488", "#ccfbf1", "Beginner · Free"],
    advanced: ["#7c3aed", "#ede9fe", "Advanced · ₦15k"],
    masterclass: ["#d97706", "#fef3c7", "Masterclass · ₦30k"]
  };
  const [c, b, t] = m[tier] || ["#64748b", "#f1f5f9", tier];
  return <Badge text={t} color={c} bg={b} />;
}

// CheckEditor Component to manage Quiz, True/False, or Fact checks for a lesson video
interface CheckEditorProps {
  checkType: 'none' | 'mcq' | 'tf' | 'fact';
  check: any;
  onChange: (c: any) => void;
  onTypeChange: (t: 'none' | 'mcq' | 'tf' | 'fact') => void;
}

function CheckEditor({ check, checkType, onChange, onTypeChange }: CheckEditorProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-3 space-y-3.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
          🧠 Lesson Engagement Check
        </span>
        <span className="text-[10px] text-slate-405 italic underline decoration-dotted cursor-help" title="These micro-quizzes keep student retention high.">
          Interactive Study Check
        </span>
      </div>

      <div>
        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Check Type</label>
        <div className="flex flex-wrap gap-2 text-xs">
          {(["none", "mcq", "tf", "fact"] as const).map(t => (
            <button
              type="button"
              key={t}
              onClick={() => onTypeChange(t)}
              className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
                checkType === t
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {{ none: "No Check", mcq: "Multiple Choice Quiz", tf: "True / False", fact: "Fun Fact Trigger" }[t]}
            </button>
          ))}
        </div>
      </div>

      {checkType === "mcq" && check && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Quiz Question *</label>
            <input
              type="text"
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
              value={check.question || ""}
              onChange={e => onChange({ ...check, question: e.target.value })}
              placeholder="e.g., What is the primary focus of a high-converting Landing Page?"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-bold text-slate-500">Form Options (Check correct radio option) *</label>
            {(check.options || ["", "", "", ""]).map((opt: string, idx: number) => (
              <div key={idx} className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => onChange({ ...check, correct: idx })}
                  className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs cursor-pointer select-none transition-all ${
                    check.correct === idx
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {check.correct === idx ? "✓" : ["A", "B", "C", "D"][idx]}
                </button>
                <input
                  type="text"
                  className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm font-semibold outline-none focus:border-indigo-500"
                  value={opt}
                  onChange={e => {
                    const updatedOptions = [...(check.options || ["", "", "", ""])];
                    updatedOptions[idx] = e.target.value;
                    onChange({ ...check, options: updatedOptions });
                  }}
                  placeholder={`Option ${["A", "B", "C", "D"][idx]}`}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Correct Explanation (Shown on submit)</label>
            <input
              type="text"
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2.5 text-sm font-medium outline-none focus:border-indigo-500"
              value={check.explanation || ""}
              onChange={e => onChange({ ...check, explanation: e.target.value })}
              placeholder="Explain why this option is correct to aid student understanding..."
            />
          </div>
        </div>
      )}

      {checkType === "tf" && check && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Statement *</label>
            <input
              type="text"
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
              value={check.statement || ""}
              onChange={e => onChange({ ...check, statement: e.target.value })}
              placeholder="e.g., AI website builders require deep professional coding experience."
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">True / False Correct Selection</label>
            <div className="flex gap-2">
              {[true, false].map(val => (
                <button
                  type="button"
                  key={String(val)}
                  onClick={() => onChange({ ...check, answer: val })}
                  className={`flex-1 py-1.5 rounded-lg border font-bold text-xs transition-all ${
                    check.answer === val
                      ? "border-teal-600 bg-teal-50 text-teal-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {val ? "TRUE" : "FALSE"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Explanation</label>
            <input
              type="text"
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2.5 text-sm font-medium outline-none focus:border-indigo-500"
              value={check.explanation || ""}
              onChange={e => onChange({ ...check, explanation: e.target.value })}
              placeholder="Provide a statement outline..."
            />
          </div>
        </div>
      )}

      {checkType === "fact" && check && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Fact Headline *</label>
            <input
              type="text"
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
              value={check.headline || ""}
              onChange={e => onChange({ ...check, headline: e.target.value })}
              placeholder="e.g., Mind-bending fact!"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Fact Content / Narrative *</label>
            <textarea
              rows={5}
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2.5 text-sm font-medium outline-none focus:border-indigo-500"
              value={check.body || ""}
              onChange={e => onChange({ ...check, body: e.target.value })}
              placeholder="The interesting piece of evidence or stat scholars will read after finishing this clip..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

// MAIN CourseEdit SCREEN
export default function CourseEdit() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const isNew = !courseId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Course>(defaultInitialForm());
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [activeSection, setActiveSection] = useState<'info' | 'curriculum' | 'settings'>('info');

  // Load and map course from Firestore
  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    const fetchCourse = async () => {
      try {
        const docRef = doc(db, 'courses', courseId as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const raw = docSnap.data();
          
          // Bidirectional mapper load
          const mapped: Course = {
            ...raw,
            id: docSnap.id,
            title: raw.title || '',
            subtitle: raw.subtitle || raw.tagline || '',
            tagline: raw.tagline || raw.subtitle || '',
            thumbnail: raw.thumbnail || '',
            description: raw.description || raw.overview || '',
            overview: raw.overview || raw.description || '',
            skill: raw.skill || (raw.category?.toLowerCase().includes('web') ? 'web' : raw.category?.toLowerCase().includes('film') ? 'film' : raw.category?.toLowerCase().includes('image') ? 'image' : 'web'),
            subskill: raw.subskill || '',
            category: raw.category || 'AI Website development',
            level: raw.level || 'Beginner',
            tier: raw.tier || (raw.level === 'Beginner' ? 'beginner' : raw.level === 'Advanced' ? 'advanced' : raw.level === 'Masterclass' ? 'masterclass' : 'beginner'),
            price: Number(raw.price) || 0,
            instructor: raw.instructor || 'CIYA Team',
            outcomes: raw.outcomes || '',
            requirements: raw.requirements || '',
            publish_status: raw.publish_status || (raw.status === 'published' ? 'Published' : 'Draft'),
            status: raw.status || (raw.publish_status === 'Published' ? 'published' : 'draft'),
            days: DAYS_RANGE.map((dayNum, idx) => {
              const existingDay = raw.days?.find((d: any) => d.dayNumber === dayNum);
              return {
                dayNumber: dayNum,
                title: existingDay?.title || `Day ${dayNum}: Continuous Study`,
                description: existingDay?.description || '',
                assignment: existingDay?.assignment || { prompt: '', dueNote: '' },
                videos: (existingDay?.videos || []).map((v: any) => ({
                  id: v.id || Math.random().toString(36).substring(2, 9),
                  title: v.title || v.name || '',
                  video_url: v.video_url || v.url || '',
                  url: v.url || v.video_url || '',
                  duration: v.duration || '10 min',
                  description: v.description || '',
                  resources: v.resources || '',
                  checkType: v.checkType || 'none',
                  check: v.check || null
                }))
              };
            })
          };

          setForm(mapped);
        } else {
          setError('The requested course does not exist in the collection.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch course details.');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId, isNew]);

  // Form field modifiers
  const setField = (key: keyof Course, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleDayFieldChange = (dayIdx: number, field: keyof CourseDay, value: any) => {
    setForm(prev => {
      const updatedDays = [...(prev.days || DAYS_RANGE.map(d => emptyDay(d)))];
      updatedDays[dayIdx] = {
        ...updatedDays[dayIdx],
        [field]: value
      };
      return { ...prev, days: updatedDays };
    });
  };

  const handleAssignmentChange = (dayIdx: number, subField: 'prompt' | 'dueNote', value: string) => {
    setForm(prev => {
      const updatedDays = [...(prev.days || DAYS_RANGE.map(d => emptyDay(d)))];
      const currentAss = updatedDays[dayIdx].assignment || { prompt: '', dueNote: '' };
      updatedDays[dayIdx] = {
        ...updatedDays[dayIdx],
        assignment: {
          ...currentAss,
          [subField]: value
        }
      };
      return { ...prev, days: updatedDays };
    });
  };

  const setVideoField = (dayIdx: number, videoIndex: number, videoKey: keyof CourseVideo, value: any) => {
    setForm(prev => {
      const updatedDays = [...(prev.days || DAYS_RANGE.map(d => emptyDay(d)))];
      const videos = [...(updatedDays[dayIdx].videos || [])];
      
      videos[videoIndex] = {
        ...videos[videoIndex],
        [videoKey]: value,
        // compatibility
        ...(videoKey === 'url' ? { video_url: value } : {}),
        ...(videoKey === 'video_url' ? { url: value } : {})
      };
      
      updatedDays[dayIdx] = {
        ...updatedDays[dayIdx],
        videos
      };
      return { ...prev, days: updatedDays };
    });
  };

  const removeVideoFromDay = (dayIdx: number, videoIndex: number) => {
    setForm(prev => {
      const updatedDays = [...(prev.days || DAYS_RANGE.map(d => emptyDay(d)))];
      updatedDays[dayIdx] = {
        ...updatedDays[dayIdx],
        videos: (updatedDays[dayIdx].videos || []).filter((_, idx) => idx !== videoIndex)
      };
      return { ...prev, days: updatedDays };
    });
  };

  const addVideoToDay = (dayIdx: number) => {
    setForm(prev => {
      const updatedDays = [...(prev.days || DAYS_RANGE.map(d => emptyDay(d)))];
      const videos = [...(updatedDays[dayIdx].videos || [])];
      if (videos.length >= 10) return prev;
      videos.push(emptyVideo());
      updatedDays[dayIdx] = {
        ...updatedDays[dayIdx],
        videos
      };
      return { ...prev, days: updatedDays };
    });
  };

  const setVideoCheckType = (dayIdx: number, videoIndex: number, type: 'none' | 'mcq' | 'tf' | 'fact') => {
    // Generate empty structure on shift
    const defaultCheck = type === "mcq" ? emptyQuiz() : type === "tf" ? emptyTF() : type === "fact" ? emptyFact() : null;
    setForm(prev => {
      const updatedDays = [...(prev.days || DAYS_RANGE.map(d => emptyDay(d)))];
      const videos = [...(updatedDays[dayIdx].videos || [])];
      videos[videoIndex] = {
        ...videos[videoIndex],
        checkType: type,
        check: defaultCheck
      };
      updatedDays[dayIdx] = {
        ...updatedDays[dayIdx],
        videos
      };
      return { ...prev, days: updatedDays };
    });
  };

  // Prepare normalized payload and persist to Firestore
  const handleSaveFirestore = async (statusVal: 'draft' | 'published') => {
    setSaving(true);
    setError(null);

    try {
      const normSkill = form.skill || 'web';
      const normCategory = normSkill === 'web' ? 'AI Website development' : normSkill === 'film' ? 'AI Film Studio' : normSkill === 'image' ? 'AI Image & Graphics' : 'AI Website development';
      const normTier = form.tier || 'beginner';
      const normLevel = normTier === 'beginner' ? 'Beginner' : normTier === 'advanced' ? 'Advanced' : normTier === 'masterclass' ? 'Masterclass' : 'Beginner';
      const normPublishStatus = statusVal === 'published' ? 'Published' : 'Draft';

      const cleanedDays = (form.days || []).map((day, idx) => ({
        dayNumber: idx + 1,
        title: day.title || `Day ${idx + 1}`,
        description: day.description || '',
        assignment: day.assignment || { prompt: '', dueNote: '' },
        videos: (day.videos || []).map((v) => ({
          id: v.id || Math.random().toString(36).substring(2, 9),
          title: v.title || '',
          video_url: v.video_url || v.url || '',
          url: v.video_url || v.url || '',
          duration: v.duration || '10 min',
          description: v.description || '',
          resources: v.resources || '',
          checkType: v.checkType || 'none',
          check: v.check || null
        }))
      }));

      const payload = {
        title: form.title || '',
        subtitle: form.tagline || form.subtitle || '',
        tagline: form.tagline || form.subtitle || '',
        thumbnail: form.thumbnail || '',
        description: form.overview || form.description || '',
        overview: form.overview || form.description || '',
        category: normCategory,
        skill: normSkill,
        subskill: form.subskill || '',
        level: normLevel,
        tier: normTier,
        price: Number(form.price) || 0,
        instructor: form.instructor || 'CIYA Team',
        outcomes: form.outcomes || '',
        requirements: form.requirements || '',
        publish_status: normPublishStatus,
        status: statusVal,
        days: cleanedDays,
        updatedAt: serverTimestamp()
      };

      // Sanitize fields to make sure no undefined properties go to Firestore
      const cleanedPayload: Record<string, any> = {};
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined) {
          cleanedPayload[k] = v;
        }
      });

      const id = isNew ? Math.random().toString(36).substring(2, 11) : (courseId as string);
      const docRef = doc(db, 'courses', id);

      if (isNew) {
        cleanedPayload.createdAt = serverTimestamp();
        await setDoc(docRef, cleanedPayload);
      } else {
        await updateDoc(docRef, cleanedPayload);
      }

      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while saving the course to Firestore.');
      try {
        handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, 'courses');
      } catch (logErr) {
        console.warn('Logging captured:', logErr);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-600">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-semibold text-sm">Loading Course Editor...</p>
      </div>
    );
  }

  const selectedSkillMeta = SKILLS[form.skill || "web"];

  return (
    <div className="max-w-4xl mx-auto pb-16 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-2 hover:bg-slate-100 rounded-full transition-colors border">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Course Builder Portal</span>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{form.title || "Untitled Course"}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveFirestore("draft")}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveFirestore("published")}
            className="px-5 py-2 text-xs font-black text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 fill-white" />
            {saving ? 'Saving...' : 'Publish Course'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 border border-red-200 mb-6">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold text-sm">{error}</span>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex gap-1.5 bg-slate-100 border p-1 rounded-xl mb-6">
        {[
          { id: "info", label: "Course Info" },
          { id: "curriculum", label: "Curriculum & Checks" },
          { id: "settings", label: "Settings & Preview" }
        ].map(s => (
          <button
            type="button"
            key={s.id}
            onClick={() => setActiveSection(s.id as any)}
            className={`flex-1 py-2.5 rounded-lg border-0 font-bold text-xs cursor-pointer transition-all ${
              activeSection === s.id
                ? "bg-white text-teal-700 shadow-sm font-black"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* TAB 1: BASIC COURSE INFO */}
      {activeSection === "info" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-base font-black text-slate-800 border-b pb-3 uppercase tracking-wider text-[11px] text-indigo-700 flex items-center gap-2">
            <span>📝</span> Primary Identity and Specs
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Course Title *</label>
              <input
                type="text"
                required
                className="w-full bg-slate-50 text-slate-950 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-bold"
                value={form.title || ""}
                onChange={e => setField("title", e.target.value)}
                placeholder="e.g., Build a Landing Page with AI in 5 Days"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Short Tagline *</label>
              <input
                type="text"
                className="w-full bg-slate-50 text-slate-950 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-semibold"
                value={form.tagline || form.subtitle || ""}
                onChange={e => {
                  setField("tagline", e.target.value);
                  setField("subtitle", e.target.value);
                }}
                placeholder="e.g., Launch your first conversion page — zero code needed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Skill Category *</label>
              <select
                className="w-full bg-slate-50 text-slate-950 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-bold cursor-pointer"
                value={form.skill || "web"}
                onChange={e => {
                  const val = e.target.value;
                  setField("skill", val);
                  setField("subskill", SKILLS[val]?.subskills[0]?.id || "");
                }}
              >
                {Object.entries(SKILLS).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Sub-Skill *</label>
              <select
                className="w-full bg-slate-50 text-slate-950 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-bold cursor-pointer"
                value={form.subskill || ""}
                onChange={e => setField("subskill", e.target.value)}
              >
                {selectedSkillMeta?.subskills.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Difficulty/Tier</label>
              <select
                className="w-full bg-slate-50 text-slate-950 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-bold cursor-pointer"
                value={form.tier || "beginner"}
                onChange={e => {
                  const val = e.target.value as any;
                  setField("tier", val);
                  setField("price", val === 'beginner' ? 0 : val === 'advanced' ? 15000 : 30000);
                }}
              >
                <option value="beginner">Beginner (Free)</option>
                <option value="advanced">Advanced (₦15,000)</option>
                <option value="masterclass">Masterclass (₦30,000)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Instructor</label>
              <input
                type="text"
                className="w-full bg-slate-50 text-slate-950 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-bold"
                value={form.instructor || "CIYA Team"}
                onChange={e => setField("instructor", e.target.value)}
                placeholder="CIYA Instructor Team"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Thumbnail Cover Photo URL</label>
              <input
                type="text"
                className="w-full bg-slate-50 text-slate-950 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-semibold"
                value={form.thumbnail || ""}
                onChange={e => setField("thumbnail", e.target.value)}
                placeholder="https://images.unsplash.com/..."
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Official Trailer Link (YouTube / Vimeo)</label>
              <input
                type="text"
                className="w-full bg-slate-50 text-slate-950 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-semibold"
                value={form.youtube_link || ""}
                onChange={e => setField("youtube_link", e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Course Overview *</label>
            <textarea
              rows={6}
              className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm leading-relaxed"
              value={form.overview || form.description || ""}
              onChange={e => {
                setField("overview", e.target.value);
                setField("description", e.target.value);
              }}
              placeholder="Provide a thorough, intriguing executive description of limits and potential targets..."
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Learning Outcomes (One outcome per line)</label>
            <textarea
              rows={6}
              className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-medium leading-relaxed font-mono"
              value={form.outcomes || ""}
              onChange={e => setField("outcomes", e.target.value)}
              placeholder="Build a commercial landing page&#10;Incorporate dynamic newsletter lead forms&#10;Host it on a free live cloud domain"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Requirements / Recommendations (One per line)</label>
            <textarea
              rows={4}
              className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-medium leading-relaxed font-mono"
              value={form.requirements || ""}
              onChange={e => setField("requirements", e.target.value)}
              placeholder="Access to a laptop or smartphone&#10;No prior coding, design or scripting background required"
            />
          </div>
        </div>
      )}

      {/* TAB 2: 5-DAY CURRICULUM & CHECKS BUILDER */}
      {activeSection === "curriculum" && (
        <div className="space-y-6">
          {/* Day Selector Accordion Buttons */}
          <div className="flex gap-2 p-1.5 border rounded-2xl bg-slate-100 overflow-x-auto">
            {DAYS_RANGE.map((dayNum, i) => {
              const currentDayObj = (form.days || [])[i] || emptyDay(dayNum);
              return (
                <button
                  type="button"
                  key={dayNum}
                  onClick={() => setActiveDayIdx(i)}
                  className={`flex-1 min-w-[100px] py-3 rounded-xl border-0 cursor-pointer transition-all ${
                    activeDayIdx === i
                      ? "bg-white text-teal-600 shadow-sm font-extrabold border"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider">Day {dayNum}</div>
                  <div className="text-[9px] text-slate-400 font-extrabold mt-0.5">
                    {(currentDayObj.videos || []).length}/10 Lessons
                  </div>
                </button>
              );
            })}
          </div>

          {/* Day Theme info block */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center justify-between pb-3 border-b">
              <span>📅 Day {activeDayIdx + 1} Theme and Topic</span>
              <span className="text-[10px] font-bold text-slate-500">Study Theme</span>
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Day Heading/Goal *</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 text-slate-950 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-bold"
                  value={(form.days || DAYS_RANGE.map(d => emptyDay(d)))[activeDayIdx]?.title || ""}
                  onChange={e => handleDayFieldChange(activeDayIdx, 'title', e.target.value)}
                  placeholder={`Day ${activeDayIdx + 1} Foundations & Setup`}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Day Description Narrative</label>
                <textarea
                  rows={5}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                  value={(form.days || DAYS_RANGE.map(d => emptyDay(d)))[activeDayIdx]?.description || ""}
                  onChange={e => handleDayFieldChange(activeDayIdx, 'description', e.target.value)}
                  placeholder="In this module, scholars will configure their local workspaces and test several AI generative models..."
                />
              </div>
            </div>
          </div>

          {/* Videos & checks list for active day */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b pb-3 block">
              <span className="text-xs font-black uppercase text-indigo-700 flex items-center gap-1.5">
                🎬 Lessons Playlist
              </span>
              <button
                type="button"
                onClick={() => addVideoToDay(activeDayIdx)}
                disabled={((form.days || [])[activeDayIdx]?.videos || []).length >= 10}
                className="text-xs font-bold px-3.5 py-1.5 border border-dashed border-teal-600 rounded-lg hover:bg-teal-50 text-teal-700 transition-all cursor-pointer bg-transparent disabled:opacity-40"
              >
                + Add Lesson Link
              </button>
            </div>

            {((form.days || [])[activeDayIdx]?.videos || []).length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="text-2xl mb-1.5">🎬</div>
                <p className="text-xs font-bold">No videos or lessons configured for Day {activeDayIdx + 1} yet.</p>
                <p className="text-[10px] text-slate-405 mt-0.5">Click "Add Lesson Link" in the top-right to register video material.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {((form.days || [])[activeDayIdx]?.videos || []).map((v, vIdx) => (
                  <div key={v.id || vIdx} className="border border-slate-200 hover:border-slate-300 rounded-2xl p-4 md:p-5 relative shadow-sm transition-all bg-white relative">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-black text-xs leading-none">
                        #{vIdx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVideoFromDay(activeDayIdx, vIdx)}
                        className="text-xs font-semibold px-2.5 py-1 border border-red-200 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer bg-transparent"
                      >
                        Delete Lesson
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Lesson Video Title *</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-slate-50 border border-slate-220 rounded-lg p-2.5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-400"
                          value={v.title || ""}
                          onChange={e => setVideoField(activeDayIdx, vIdx, 'title', e.target.value)}
                          placeholder="e.g., Working with High-converting CTA Buttons"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Duration</label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-220 rounded-lg p-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400"
                          value={v.duration || "10 min"}
                          onChange={e => setVideoField(activeDayIdx, vIdx, 'duration', e.target.value)}
                          placeholder="e.g., 12 min"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mt-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Lesson Video URL (YouTube / Drive / General URL) *</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-slate-50 border border-slate-220 rounded-lg p-2.5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-400 font-mono"
                          value={v.video_url || v.url || ""}
                          onChange={e => setVideoField(activeDayIdx, vIdx, 'url', e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Resources / Template Assets Links (Comma separated)</label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-220 rounded-lg p-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400"
                          value={v.resources || ""}
                          onChange={e => setVideoField(activeDayIdx, vIdx, 'resources', e.target.value)}
                          placeholder="e.g., Figma UI Kit link, Framer workspace code asset"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Brief Video Summary / Instructions</label>
                      <textarea
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-220 rounded-lg p-2.5 text-sm text-slate-600 outline-none focus:border-indigo-400"
                        value={v.description || ""}
                        onChange={e => setVideoField(activeDayIdx, vIdx, 'description', e.target.value)}
                        placeholder="Detail which core parameters should be experimented with after watching this walkthrough clip..."
                      />
                    </div>

                    {/* Integrated Post-Video Engagement Check */}
                    <CheckEditor
                      check={v.check}
                      checkType={v.checkType || 'none'}
                      onChange={c => setVideoField(activeDayIdx, vIdx, 'check', c)}
                      onTypeChange={t => setVideoCheckType(activeDayIdx, vIdx, t)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* End of day submissions Assignment configuration */}
          <div className="bg-white rounded-3xl p-6 border-2 border-dashed border-teal-600 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-teal-700 tracking-wider flex items-center justify-between">
              <span>📋 Day {activeDayIdx + 1} End-of-Day Assignment</span>
              <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase">Day submission</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Assignment Prompt *</label>
                <textarea
                  rows={5}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-teal-500 outline-none text-sm"
                  value={(form.days || DAYS_RANGE.map(d => emptyDay(d)))[activeDayIdx]?.assignment?.prompt || ""}
                  onChange={e => handleAssignmentChange(activeDayIdx, 'prompt', e.target.value)}
                  placeholder={`Apply today's learnings into a draft portfolio canvas and copy/pasted submission link inside the field below...`}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Deadline or submission note note</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 text-slate-950 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-teal-500 outline-none text-sm"
                  value={(form.days || DAYS_RANGE.map(d => emptyDay(d)))[activeDayIdx]?.assignment?.dueNote || ""}
                  onChange={e => handleAssignmentChange(activeDayIdx, 'dueNote', e.target.value)}
                  placeholder="e.g., Submit before midnight to stay eligible for direct coaching verification."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SETTINGS & PREVIEW */}
      {activeSection === "settings" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-800 border-b pb-3 uppercase tracking-wider text-[11px] text-indigo-700 flex items-center gap-2">
              <span>🚀</span> Preview Summary & Publishing Options
            </h3>

            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-16 h-16 bg-white border rounded-xl flex items-center justify-center text-3xl shadow-sm">
                  {selectedSkillMeta?.icon || "📘"}
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-800 text-sm leading-tight">{form.title || "Untitled course"}</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{form.tagline || form.subtitle || "No short description outlined yet"}</p>
                  
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {form.skill && <Badge text={SKILLS[form.skill]?.label} color={SKILLS[form.skill]?.color} bg={SKILLS[form.skill]?.bg} />}
                    <TierBadge tier={form.tier || "beginner"} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-dashed">
                {DAYS_RANGE.map((dayNum, i) => {
                  const dayObj = (form.days || [])[i] || emptyDay(dayNum);
                  const isChecked = (dayObj.videos || []).filter(v => v.checkType && v.checkType !== "none").length;
                  return (
                    <div key={dayNum} className="bg-white border text-[10px] rounded-xl p-3 shadow-sm border-slate-200">
                      <span className="font-bold uppercase tracking-wide block text-teal-600">Day {dayNum}</span>
                      <span className="font-black text-slate-800 block mt-1 line-clamp-1">{dayObj.title}</span>
                      <span className="text-slate-400 block mt-1">
                        {(dayObj.videos || []).length} videos · {isChecked} check{isChecked !== 1 ? 's' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <span className="text-xs font-black uppercase text-indigo-700 block border-b pb-2">Status & Deployment Target</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleSaveFirestore("draft")}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs cursor-pointer shadow-sm transition-all border-0"
              >
                💾 Save as Closed Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveFirestore("published")}
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-teal-600/10 transition-all cursor-pointer border-0"
              >
                🚀 Publish Directly to Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER ACTIONS BAR */}
      <div className="flex justify-end gap-3 mt-6 border-t pt-4">
        <Link
          to="/admin"
          className="px-6 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 rounded-xl text-xs transition-all shadow-sm"
        >
          Cancel
        </Link>
        <button
          onClick={() => handleSaveFirestore(form.status === "published" ? "published" : "draft")}
          className="px-6 py-2.5 bg-indigo-600 text-white font-black hover:bg-indigo-700 rounded-xl text-xs transition-all cursor-pointer border-0 shadow-lg shadow-indigo-500/15"
        >
          {saving ? 'Saving Course...' : 'Save Updates'}
        </button>
      </div>
    </div>
  );
}
