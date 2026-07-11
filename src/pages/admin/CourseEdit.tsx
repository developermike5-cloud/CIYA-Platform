import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, triggerSystemSignal } from '../../firebase';
import { Course, CourseDay, CourseVideo } from '../../types';
import { ArrowLeft, Save, Sparkles, AlertCircle, Plus, Trash2, HelpCircle } from 'lucide-react';
import staticCourses from '../../data/courses.json';

const SKILLS: Record<string, { label: string, icon: string, color: string, bg: string, defaultSubskills: string[], defaultSkillPaths: string[] }> = {
  web: {
    label: "AI Website Class",
    icon: "🌐",
    color: "#0d9488",
    bg: "#ccfbf1",
    defaultSubskills: ["Frontend Development", "Backend Development", "Full-Stack Setup"],
    defaultSkillPaths: ["Landing Page", "E-Commerce", "Portfolio Website"]
  },
  film: {
    label: "AI Film Studio Class",
    icon: "🎬",
    color: "#7c3aed",
    bg: "#ede9fe",
    defaultSubskills: ["Cinematic Screenwriting", "Automated Editing", "AI Voiceover Sync"],
    defaultSkillPaths: ["Short Video", "Commercial Video", "Cinematic Video"]
  },
  image: {
    label: "AI Graphics & Image Class",
    icon: "🎨",
    color: "#d97706",
    bg: "#fef3c7",
    defaultSubskills: ["Marketing Banners", "Branding Design", "Mockup Rendering"],
    defaultSkillPaths: ["Mockup Image", "Graphic Design", "Brand Identity"]
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
  subskill: "Frontend Development",
  skillPath: "Landing Page",
  durationMode: "standard",
  category: "AI Website Class",
  level: "Beginner",
  tier: "beginner",
  price: 0,
  instructor: "CIYA Team",
  outcomes: "",
  requirements: "",
  publish_status: "Draft",
  status: "draft",
  isLocked: false,
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

// Helper parsers for copy-paste plain text importer
const parseMCQBlocks = (text: string) => {
  const blocks = text.split(/\n\s*\n+/);
  const parsedItems: any[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let question = "";
    const options: string[] = [];
    let correct = 0;
    let explanation = "";
    let questionFound = false;

    // Regex scanners
    const optionRegex = /^(?:[a-dA-D1-4]\s*[\)\.\-]|[\*\-\•])\s*(.*)/i;
    const correctRegex = /^(?:correct|answer|correct\s+answer|correct\s+index|ans):\s*([a-dA-D1-4]|\d+)/i;
    const explanationRegex = /^(?:explanation|explain|reason):\s*(.*)/i;

    for (const line of lines) {
      const matchCorrect = line.match(correctRegex);
      const matchExplanation = line.match(explanationRegex);
      const matchOption = line.match(optionRegex);

      if (matchCorrect) {
        const val = matchCorrect[1].trim().toUpperCase();
        if (val === "A" || val === "1") correct = 0;
        else if (val === "B" || val === "2") correct = 1;
        else if (val === "C" || val === "3") correct = 2;
        else if (val === "D" || val === "4") correct = 3;
        else {
          const num = parseInt(val, 10);
          if (!isNaN(num) && num >= 1 && num <= 4) {
            correct = num - 1;
          }
        }
      } else if (matchExplanation) {
        explanation = matchExplanation[1].trim();
      } else if (matchOption) {
        const optionText = matchOption[1].trim();
        const isMarkedCorrect = line.startsWith("*") || line.includes("(correct)") || line.toLowerCase().includes("[x]");
        if (options.length < 4) {
          options.push(optionText.replace(/\(correct\)/i, "").trim());
          if (isMarkedCorrect) {
            correct = options.length - 1;
          }
        }
      } else {
        if (!questionFound) {
          question = line.replace(/^(?:question|q)\s*:\s*/i, "").trim();
          questionFound = true;
        } else {
          if (explanation) {
            explanation += " " + line;
          } else {
            explanation = line;
          }
        }
      }
    }

    while (options.length < 4) {
      options.push(`Option ${["A", "B", "C", "D"][options.length]}`);
    }

    parsedItems.push({
      type: "mcq",
      question: question || "Identify the correct concept:",
      options,
      correct,
      explanation
    });
  }

  return parsedItems;
};

const parseTFBlocks = (text: string) => {
  const blocks = text.split(/\n\s*\n+/);
  const parsedItems: any[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let statement = "";
    let answer = true;
    let explanation = "";
    let statementFound = false;

    const answerRegex = /^(?:answer|correct|val|ans):\s*(true|false|t|f|yes|no)/i;
    const explanationRegex = /^(?:explanation|explain|reason):\s*(.*)/i;

    for (const line of lines) {
      const matchAnswer = line.match(answerRegex);
      const matchExplanation = line.match(explanationRegex);

      if (matchAnswer) {
        const val = matchAnswer[1].trim().toLowerCase();
        answer = ["true", "t", "yes", "1"].includes(val);
      } else if (matchExplanation) {
        explanation = matchExplanation[1].trim();
      } else {
        if (!statementFound) {
          statement = line.replace(/^(?:statement|question|q)\s*:\s*/i, "").trim();
          statementFound = true;
        } else {
          if (explanation) {
            explanation += " " + line;
          } else {
            explanation = line;
          }
        }
      }
    }

    parsedItems.push({
      type: "tf",
      statement: statement || "This statement is true.",
      answer,
      explanation
    });
  }

  return parsedItems;
};

const parseFactBlocks = (text: string) => {
  const blocks = text.split(/\n\s*\n+/);
  const parsedItems: any[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let headline = "Did you know?";
    let body = "";

    if (lines.length === 1) {
      body = lines[0].replace(/^(?:fact|body)\s*:\s*/i, "").trim();
    } else {
      const firstLineClean = lines[0].replace(/^(?:headline|title|fact|did you know\??)\s*:\s*/i, "").trim();
      headline = firstLineClean;
      body = lines.slice(1).join("\n").replace(/^(?:body|content)\s*:\s*/i, "").trim();
    }

    parsedItems.push({
      type: "fact",
      headline: headline || "Interesting Stat",
      body: body || "No details provided."
    });
  }

  return parsedItems;
};

function CheckEditor({ check, checkType, onChange, onTypeChange }: CheckEditorProps) {
  const [activeCheckIdx, setActiveCheckIdx] = useState(0);
  const [showImporter, setShowImporter] = useState(false);
  const [importerText, setImporterText] = useState("");

  // Derive structural items
  const items: any[] = Array.isArray(check) ? check : (check ? [check] : []);
  
  // Guarantee at least one valid object if checkType is selected and not none
  if (items.length === 0 && checkType !== 'none') {
    const defaultCheck = checkType === "mcq" ? emptyQuiz() : checkType === "tf" ? emptyTF() : emptyFact();
    items.push(defaultCheck);
  }

  const safeIdx = Math.min(activeCheckIdx, Math.max(0, items.length - 1));
  const activeCheck = items[safeIdx];

  const updateActiveCheck = (updatedValue: any) => {
    const newItems = [...items];
    newItems[newItems.indexOf(activeCheck) >= 0 ? newItems.indexOf(activeCheck) : safeIdx] = updatedValue;
    onChange(newItems);
  };

  const addItem = () => {
    const newItem = checkType === "mcq" ? emptyQuiz() : checkType === "tf" ? emptyTF() : emptyFact();
    const newItems = [...items, newItem];
    onChange(newItems);
    setActiveCheckIdx(newItems.length - 1);
  };

  const deleteItem = (idxToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (items.length <= 1) return;
    const newItems = items.filter((_, idx) => idx !== idxToDelete);
    onChange(newItems);
    setActiveCheckIdx(Math.max(0, safeIdx === idxToDelete ? idxToDelete - 1 : (safeIdx > idxToDelete ? safeIdx - 1 : safeIdx)));
  };

  // Perform heuristic text parsing in real-time
  const getParsedSuggestions = (): any[] => {
    if (!importerText.trim()) return [];
    if (checkType === "mcq") return parseMCQBlocks(importerText);
    if (checkType === "tf") return parseTFBlocks(importerText);
    if (checkType === "fact") return parseFactBlocks(importerText);
    return [];
  };

  const currentParsed = getParsedSuggestions();

  const handleImport = (replace: boolean) => {
    if (currentParsed.length === 0) {
      alert("No valid check questions could be parsed from the pasted text. Please verify the format guidelines!");
      return;
    }
    const updated = replace ? currentParsed : [...items.filter(it => it.question || it.statement || it.headline), ...currentParsed];
    onChange(updated);
    setActiveCheckIdx(0);
    setImporterText("");
    setShowImporter(false);
  };

  const loadExampleTemplate = () => {
    if (checkType === "mcq") {
      setImporterText(
        `Question: What primary component holds the UI state in standard React components?\n` +
        `A) Props\n` +
        `B) State\n` +
        `C) Inline Styles\n` +
        `D) Class names\n` +
        `Correct: B\n` +
        `Explanation: The 'state' object is used to store components data that can change over time.\n\n` +
        `Question: React was open-sourced in which year?\n` +
        `A) 2011\n` +
        `B) 2013\n` +
        `C) 2015\n` +
        `D) 2018\n` +
        `Correct: B\n` +
        `Explanation: Facebook released React in May 2013.`
      );
    } else if (checkType === "tf") {
      setImporterText(
        `Statement: Vite is a build tool that replaces global static refreshes with highly lightning fast ES module hot reload.\n` +
        `Answer: True\n` +
        `Explanation: Vite utilizes modern browser ES module capabilities to boot dev serves instantly.\n\n` +
        `Statement: Redux can only be integrated into React frameworks.\n` +
        `Answer: False\n` +
        `Explanation: Redux is a standalone state engine usable with any frontend framework.`
      );
    } else if (checkType === "fact") {
      setImporterText(
        `Headline: Hot Module Replacement Speed\n` +
        `Body: In Vite, HMR speeds remain relative only to compiling individual modified code structures, not bundle build volume sizes.\n\n` +
        `Headline: Fast Syllabus Retention checks\n` +
        `Body: Incorporating micro-checks during course lessons boosts average student skill retention metrics by 43%.`
      );
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-3 space-y-3.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
          🧠 Lesson Engagement Checks
        </span>
        <span className="text-[10px] text-slate-400 italic underline decoration-dotted cursor-help" title="These micro-quizzes keep student retention high.">
          Interactive Study Checks ({items.length || 0})
        </span>
      </div>

      <div>
        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Check Type</label>
        <div className="flex flex-wrap gap-2 text-xs">
          {(["none", "mcq", "tf", "fact"] as const).map(t => (
            <button
              type="button"
              key={t}
              onClick={() => {
                setActiveCheckIdx(0);
                onTypeChange(t);
              }}
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

      {checkType !== 'none' && (
        <div className="bg-white border border-slate-200/60 rounded-xl p-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">Study Questions:</span>
          {items.map((_, idx) => (
            <div key={idx} className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 pl-2 select-none">
              <span className={`text-[10px] font-extrabold pr-1.5 ${safeIdx === idx ? "text-teal-600" : "text-slate-500"}`}>
                #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => setActiveCheckIdx(idx)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                  safeIdx === idx
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                Edit
              </button>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => deleteItem(idx, e)}
                  className="text-red-400 hover:text-red-700 font-extrabold text-[10px] px-1.5 cursor-pointer ml-1 scale-110 hover:scale-125 transition-transform"
                  title="Remove this check"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-black rounded-lg text-[11px] tracking-wide cursor-pointer transition-all flex items-center justify-center"
          >
            + Add Another Question
          </button>
          <button
            type="button"
            onClick={() => {
              setShowImporter(!showImporter);
              setImporterText("");
            }}
            className={`px-2.5 py-1 border font-black rounded-lg text-[11px] tracking-wide cursor-pointer transition-all flex items-center gap-1 ${
              showImporter 
                ? "bg-slate-700 text-white border-slate-700 hover:bg-slate-800" 
                : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            📋 {showImporter ? "Close Paste Importer" : "Paste Text Importer"}
          </button>
        </div>
      )}

      {/* PASTE IMPORTER COLLAPSED/EXPANDED MODULE */}
      {checkType !== 'none' && showImporter && (
        <div className="bg-white border-2 border-dashed border-slate-300/80 rounded-xl p-4 space-y-3.5 transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h5 className="text-[11px] font-black uppercase text-emerald-700 tracking-wider">📋 Copy-Paste Plain Text Importer (No AI)</h5>
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold max-w-xl">
                Avoid internet network/quota errors from AI. Paste standard formatted plaintext questions directly to parse and organize them. Break consecutive questions with a blank line.
              </p>
            </div>
            <button
              type="button"
              onClick={loadExampleTemplate}
              className="px-2 py-1 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 text-[10px] font-extrabold rounded-md shadow-sm transition-all"
            >
              💡 Load Demo Template
            </button>
          </div>

          <div className="space-y-1 bg-slate-100/50 p-2.5 rounded-lg border border-slate-200/40">
            <span className="text-[9px] uppercase font-bold text-slate-400">Supported Format Guideline:</span>
            {checkType === "mcq" && (
              <pre className="text-[9px] font-mono text-slate-600 outline-none leading-normal">
                Question: What component holds the UI state in React?<br/>
                A) Props<br/>
                B) State (correct answer)<br/>
                C) Inline Styles<br/>
                D) Class names<br/>
                Correct: B<br/>
                Explanation: State represents the local mutable values.
              </pre>
            )}
            {checkType === "tf" && (
              <pre className="text-[9px] font-mono text-slate-600 outline-none leading-normal">
                Statement: Tailwind CSS runs completely on the server-side.<br/>
                Answer: False<br/>
                Explanation: Tailwind compiles class lists parsed directly from your frontend templates.
              </pre>
            )}
            {checkType === "fact" && (
              <pre className="text-[9px] font-mono text-slate-600 outline-none leading-normal">
                Headline: Hot Module Reload Speed Fact<br/>
                Body: Vite uses native ES modules to fetch files individually rather than bundling everything.
              </pre>
            )}
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Paste questions text here</label>
            <textarea
              rows={5}
              value={importerText}
              onChange={e => setImporterText(e.target.value)}
              placeholder="Paste your questions block here... (Separate different questions with a blank line)"
              className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-lg p-2.5 font-mono text-[11px] leading-relaxed outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
            <div className="text-[10px] font-black text-slate-500 flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${currentParsed.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}></span>
              Parsed: <span className="text-emerald-600 font-extrabold text-xs">{currentParsed.length}</span> question{currentParsed.length !== 1 ? 's' : ''} detected
            </div>
            
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleImport(false)}
                disabled={currentParsed.length === 0}
                className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-100 font-extrabold rounded-lg cursor-pointer transition-all"
              >
                Append as New ({currentParsed.length})
              </button>
              <button
                type="button"
                onClick={() => handleImport(true)}
                disabled={currentParsed.length === 0}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed font-extrabold rounded-lg cursor-pointer transition-all shadow-sm"
              >
                Clear & Replace All ({currentParsed.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {checkType === "mcq" && activeCheck && (
        <div className="space-y-3 border-t border-slate-200/50 pt-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-indigo-600 uppercase tracking-wide">Editing MCQ Question #{safeIdx + 1}</span>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Quiz Question *</label>
            <input
              type="text"
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
              value={activeCheck.question || ""}
              onChange={e => updateActiveCheck({ ...activeCheck, question: e.target.value })}
              placeholder="e.g., What is the primary focus of a high-converting Landing Page?"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-bold text-slate-500">Form Options (Check correct radio option) *</label>
            {(activeCheck.options || ["", "", "", ""]).map((opt: string, idx: number) => (
              <div key={idx} className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => updateActiveCheck({ ...activeCheck, correct: idx })}
                  className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs cursor-pointer select-none transition-all ${
                    activeCheck.correct === idx
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {activeCheck.correct === idx ? "✓" : ["A", "B", "C", "D"][idx]}
                </button>
                <input
                  type="text"
                  className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm font-semibold outline-none focus:border-indigo-500"
                  value={opt}
                  onChange={e => {
                    const updatedOptions = [...(activeCheck.options || ["", "", "", ""])];
                    updatedOptions[idx] = e.target.value;
                    updateActiveCheck({ ...activeCheck, options: updatedOptions });
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
              value={activeCheck.explanation || ""}
              onChange={e => updateActiveCheck({ ...activeCheck, explanation: e.target.value })}
              placeholder="Explain why this option is correct to aid student understanding..."
            />
          </div>
        </div>
      )}

      {checkType === "tf" && activeCheck && (
        <div className="space-y-3 border-t border-slate-200/50 pt-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-indigo-600 uppercase tracking-wide">Editing True / False #{safeIdx + 1}</span>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Statement *</label>
            <input
              type="text"
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
              value={activeCheck.statement || ""}
              onChange={e => updateActiveCheck({ ...activeCheck, statement: e.target.value })}
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
                  onClick={() => updateActiveCheck({ ...activeCheck, answer: val })}
                  className={`flex-1 py-1.5 rounded-lg border font-bold text-xs transition-all ${
                    activeCheck.answer === val
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
              value={activeCheck.explanation || ""}
              onChange={e => updateActiveCheck({ ...activeCheck, explanation: e.target.value })}
              placeholder="Provide a statement outline..."
            />
          </div>
        </div>
      )}

      {checkType === "fact" && activeCheck && (
        <div className="space-y-3 border-t border-slate-200/50 pt-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-indigo-600 uppercase tracking-wide">Editing Fun Fact Trigger #{safeIdx + 1}</span>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Fact Headline *</label>
            <input
              type="text"
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
              value={activeCheck.headline || ""}
              onChange={e => updateActiveCheck({ ...activeCheck, headline: e.target.value })}
              placeholder="e.g., Mind-bending fact!"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Fact Content / Narrative *</label>
            <textarea
              rows={5}
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2.5 text-sm font-medium outline-none focus:border-indigo-500"
              value={activeCheck.body || ""}
              onChange={e => updateActiveCheck({ ...activeCheck, body: e.target.value })}
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
  const [confirmDeleteDayIndex, setConfirmDeleteDayIndex] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<'info' | 'curriculum' | 'settings'>('info');

  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [importSelectedCourseId, setImportSelectedCourseId] = useState<Record<number, string>>({});
  const [importSelectedLessonIdx, setImportSelectedLessonIdx] = useState<Record<number, string>>({});

  useEffect(() => {
    setCoursesList(staticCourses as Course[]);
  }, []);

  const handleDoImportLesson = (targetVideoIdx: number) => {
    const srcCourseId = importSelectedCourseId[targetVideoIdx];
    const srcLessonKey = importSelectedLessonIdx[targetVideoIdx];
    if (!srcCourseId || !srcLessonKey) return;

    const srcCourse = coursesList.find(c => c.id === srcCourseId);
    if (!srcCourse) return;

    const [srcDayIdx, srcVidIdx] = srcLessonKey.split('-').map(Number);
    const srcDay = (srcCourse.days || [])[srcDayIdx];
    if (!srcDay) return;

    const srcVideo = (srcDay.videos || [])[srcVidIdx];
    if (!srcVideo) return;

    // Proceed directly with non-blocking copy so that sandboxed browser iframes never freeze or ignore clicks

    setForm(prev => {
      const updatedDays = [...(prev.days || DAYS_RANGE.map(d => emptyDay(d)))];
      const videos = [...(updatedDays[activeDayIdx].videos || [])];
      
      videos[targetVideoIdx] = {
        ...videos[targetVideoIdx],
        title: srcVideo.title || "",
        video_url: srcVideo.video_url || srcVideo.url || "",
        url: srcVideo.url || srcVideo.video_url || "",
        duration: srcVideo.duration || "10 min",
        description: srcVideo.description || "",
        resources: srcVideo.resources || "",
        checkType: srcVideo.checkType || "none",
        check: srcVideo.check ? JSON.parse(JSON.stringify(srcVideo.check)) : null,
        funFact: srcVideo.funFact ? { ...srcVideo.funFact } : null
      };

      updatedDays[activeDayIdx] = {
        ...updatedDays[activeDayIdx],
        videos
      };
      return { ...prev, days: updatedDays };
    });

    setImportSelectedCourseId(prev => {
      const copy = { ...prev };
      delete copy[targetVideoIdx];
      return copy;
    });
    setImportSelectedLessonIdx(prev => {
      const copy = { ...prev };
      delete copy[targetVideoIdx];
      return copy;
    });

    alert("🎉 Existing lesson details successfully imported! Don't forget to click 'Save & Update Lesson' to write these changes permanently.");
  };

  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [lessonSavingId, setLessonSavingId] = useState<string | null>(null);
  const [lessonSavedId, setLessonSavedId] = useState<string | null>(null);

  const generateWithAi = async (dayIdx: number, videoIndex: number, videoObj: CourseVideo) => {
    const videoUrl = videoObj.video_url || videoObj.url;
    if (!videoUrl) {
      alert("Please enter a valid Lesson Video URL first!");
      return;
    }

    const videoIdKey = videoObj.id || String(videoIndex);
    setAiLoading(prev => ({ ...prev, [videoIdKey]: true }));

    try {
      const response = await fetch("/api/ai/youtube-lesson-gen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: videoUrl,
          checkType: videoObj.checkType && videoObj.checkType !== "none" ? videoObj.checkType : "mcq"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to consult Gemini AI. Please check server logs.");
      }

      const data = await response.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }

      setForm(prev => {
        const updatedDays = [...(prev.days || DAYS_RANGE.map(d => emptyDay(d)))];
        const videos = [...(updatedDays[dayIdx].videos || [])];
        const v = videos[videoIndex];
        
        videos[videoIndex] = {
          ...v,
          title: data.title || v.title,
          duration: data.duration || v.duration,
          description: data.description || v.description,
          check: data.checks || v.check,
          checkType: v.checkType && v.checkType !== "none" ? v.checkType : "mcq"
        };

        updatedDays[dayIdx] = {
          ...updatedDays[dayIdx],
          videos
        };
        return { ...prev, days: updatedDays };
      });

    } catch (err: any) {
      console.error(err);
      alert("AI Generation failed: " + err.message);
    } finally {
      setAiLoading(prev => ({ ...prev, [videoIdKey]: false }));
    }
  };

  const handleSaveLessonSilently = async (videoIndex: number) => {
    const video = (form.days?.[activeDayIdx]?.videos || [])[videoIndex];
    if (!video) return;
    const vidId = video.id || String(videoIndex);
    
    setLessonSavingId(vidId);
    setError(null);
    setLessonSavedId(null);
    
    try {
      if (!video.title?.trim()) {
        throw new Error(`Please provide a title for Lesson #${videoIndex + 1} before saving.`);
      }
      if (!video.video_url?.trim() && !video.url?.trim()) {
        throw new Error(`Please provide a video URL for Lesson #${videoIndex + 1} before saving.`);
      }

      const statusVal = form.status || 'draft';
      const normSkill = form.skill || 'web';
      const normCategory = normSkill === 'web' ? 'AI Website Class' : normSkill === 'film' ? 'AI Film Studio Class' : normSkill === 'image' ? 'AI Graphics & Image Class' : 'AI Website Class';
      const normTier = form.tier || 'beginner';
      const normLevel = normTier === 'beginner' ? 'Beginner' : normTier === 'advanced' ? 'Advanced' : normTier === 'masterclass' ? 'Masterclass' : 'Beginner';
      const normPublishStatus = statusVal === 'published' ? 'Published' : 'Draft';

      const cleanedDays = (form.days || []).map((day, dIdx) => ({
        dayNumber: dIdx + 1,
        title: day.title || `Day ${dIdx + 1}`,
        description: day.description || '',
        assignment: day.assignment && (day.assignment.prompt || day.assignment.dueNote) ? {
          prompt: day.assignment.prompt || '',
          dueNote: day.assignment.dueNote || ''
        } : null,
        videos: (day.videos || []).map((v) => ({
          id: v.id || Math.random().toString(36).substring(2, 9),
          title: v.title || '',
          video_url: v.video_url || v.url || '',
          url: v.video_url || v.url || '',
          duration: v.duration || '10 min',
          description: v.description || '',
          resources: v.resources || '',
          checkType: v.checkType || 'none',
          check: v.check || null,
          funFact: v.funFact || null
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
        skillPath: form.skillPath || '',
        durationMode: form.durationMode || 'standard',
        level: normLevel,
        tier: normTier,
        price: Number(form.price) || 0,
        instructor: form.instructor || 'CIYA Team',
        outcomes: form.outcomes || '',
        requirements: form.requirements || '',
        publish_status: normPublishStatus,
        status: statusVal,
        isLocked: !!form.isLocked,
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

      const generatedId = Math.random().toString(36).substring(2, 11);
      const id = isNew ? (form.id || generatedId) : (courseId as string);
      const docRef = doc(db, 'courses', id);

      if (isNew) {
        cleanedPayload.createdAt = serverTimestamp();
        await setDoc(docRef, cleanedPayload);
        await triggerSystemSignal('courses');
        setForm(prev => ({ ...prev, id }));
        navigate(`/admin/courses/${id}`, { replace: true });
      } else {
        await updateDoc(docRef, cleanedPayload);
        await triggerSystemSignal('courses');
      }

      setLessonSavedId(vidId);
      setTimeout(() => {
        setLessonSavedId(null);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while saving the lesson to Firestore.');
    } finally {
      setLessonSavingId(null);
    }
  };

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
            skillPath: raw.skillPath || '',
            durationMode: raw.durationMode || 'standard',
            category: raw.category || 'AI Website Class',
            level: raw.level || 'Beginner',
            tier: raw.tier || (raw.level === 'Beginner' ? 'beginner' : raw.level === 'Advanced' ? 'advanced' : raw.level === 'Masterclass' ? 'masterclass' : 'beginner'),
            price: Number(raw.price) || 0,
            instructor: raw.instructor || 'CIYA Team',
            outcomes: raw.outcomes || '',
            requirements: raw.requirements || '',
            publish_status: raw.publish_status || (raw.status === 'published' ? 'Published' : 'Draft'),
            status: raw.status || (raw.publish_status === 'Published' ? 'published' : 'draft'),
            isLocked: !!raw.isLocked,
            days: (raw.days && Array.isArray(raw.days) && raw.days.length > 0
              ? raw.days.map((d: any, idx: number) => ({ dayNumber: d.dayNumber || (idx + 1), ...d }))
              : DAYS_RANGE.map((dayNum) => ({ dayNumber: dayNum }))
            ).map((dayObj: any, idx: number) => {
              const dayNum = dayObj.dayNumber || (idx + 1);
              const existingDay = dayObj;
              return {
                dayNumber: dayNum,
                title: existingDay?.title || `Day ${dayNum}: Continuous Study`,
                description: existingDay?.description || '',
                assignment: existingDay?.assignment && (existingDay.assignment.prompt || existingDay.assignment.dueNote) ? {
                  prompt: existingDay.assignment.prompt || '',
                  dueNote: existingDay.assignment.dueNote || ''
                } : undefined,
                videos: (existingDay?.videos || []).map((v: any) => ({
                  id: v.id || Math.random().toString(36).substring(2, 9),
                  title: v.title || v.name || '',
                  video_url: v.video_url || v.url || '',
                  url: v.url || v.video_url || '',
                  duration: v.duration || '10 min',
                  description: v.description || '',
                  resources: v.resources || '',
                  checkType: v.checkType || 'none',
                  check: v.check || null,
                  funFact: v.funFact || null
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

  const toggleAssignmentSection = (dayIdx: number) => {
    setForm(prev => {
      const updatedDays = [...(prev.days || DAYS_RANGE.map(d => emptyDay(d)))];
      const hasAss = !!updatedDays[dayIdx]?.assignment;
      if (hasAss) {
        // Remove it!
        updatedDays[dayIdx] = {
          ...updatedDays[dayIdx],
          assignment: undefined
        };
      } else {
        // Add it!
        updatedDays[dayIdx] = {
          ...updatedDays[dayIdx],
          assignment: {
            prompt: "Please write your assignment answers or paste your project demo link here...",
            dueNote: "Submit before midnight to stay eligible for direct coaching verification."
          }
        };
      }
      return { ...prev, days: updatedDays };
    });
  };

  const handleAssignmentChange = (dayIdx: number, subField: 'prompt' | 'dueNote', value: string) => {
    setForm(prev => {
      const updatedDays = [...(prev.days || DAYS_RANGE.map(d => emptyDay(d)))];
      const currentAss = updatedDays[dayIdx]?.assignment || { prompt: '', dueNote: '' };
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
      const normCategory = normSkill === 'web' ? 'AI Website Class' : normSkill === 'film' ? 'AI Film Studio Class' : normSkill === 'image' ? 'AI Graphics & Image Class' : 'AI Website Class';
      const normTier = form.tier || 'beginner';
      const normLevel = normTier === 'beginner' ? 'Beginner' : normTier === 'advanced' ? 'Advanced' : normTier === 'masterclass' ? 'Masterclass' : 'Beginner';
      const normPublishStatus = statusVal === 'published' ? 'Published' : 'Draft';

      const cleanedDays = (form.days || []).map((day, idx) => ({
        dayNumber: idx + 1,
        title: day.title || `Day ${idx + 1}`,
        description: day.description || '',
        assignment: day.assignment && (day.assignment.prompt || day.assignment.dueNote) ? {
          prompt: day.assignment.prompt || '',
          dueNote: day.assignment.dueNote || ''
        } : null,
        videos: (day.videos || []).map((v) => ({
          id: v.id || Math.random().toString(36).substring(2, 9),
          title: v.title || '',
          video_url: v.video_url || v.url || '',
          url: v.video_url || v.url || '',
          duration: v.duration || '10 min',
          description: v.description || '',
          resources: v.resources || '',
          checkType: v.checkType || 'none',
          check: v.check || null,
          funFact: v.funFact || null
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
        skillPath: form.skillPath || '',
        durationMode: form.durationMode || 'standard',
        level: normLevel,
        tier: normTier,
        price: Number(form.price) || 0,
        instructor: form.instructor || 'CIYA Team',
        outcomes: form.outcomes || '',
        requirements: form.requirements || '',
        publish_status: normPublishStatus,
        status: statusVal,
        isLocked: !!form.isLocked,
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
        await triggerSystemSignal('courses');
      } else {
        await updateDoc(docRef, cleanedPayload);
        await triggerSystemSignal('courses');
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
                  setField("subskill", SKILLS[val]?.defaultSubskills[0] || "");
                  setField("skillPath", SKILLS[val]?.defaultSkillPaths[0] || "");
                }}
              >
                {Object.entries(SKILLS).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Sub-Skill *</label>
              <div className="space-y-2">
                <select
                  className="w-full bg-slate-50 text-slate-950 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-bold cursor-pointer"
                  value={selectedSkillMeta?.defaultSubskills.includes(form.subskill || "") ? form.subskill : "custom"}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "custom") {
                      setField("subskill", "");
                    } else {
                      setField("subskill", val);
                    }
                  }}
                >
                  {selectedSkillMeta?.defaultSubskills.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                  <option value="custom">➕ Add Custom Subskill...</option>
                </select>

                {(!selectedSkillMeta?.defaultSubskills.includes(form.subskill || "") || form.subskill === "") && (
                  <input
                    type="text"
                    className="w-full bg-indigo-50 text-slate-950 border border-indigo-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-bold"
                    placeholder="Type custom subskill name..."
                    value={form.subskill || ""}
                    onChange={e => setField("subskill", e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Skill Path *</label>
              <div className="space-y-2">
                <select
                  className="w-full bg-slate-50 text-slate-950 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-bold cursor-pointer"
                  value={selectedSkillMeta?.defaultSkillPaths.includes(form.skillPath || "") ? form.skillPath : "custom"}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "custom") {
                      setField("skillPath", "");
                    } else {
                      setField("skillPath", val);
                    }
                  }}
                >
                  {selectedSkillMeta?.defaultSkillPaths.map(path => (
                    <option key={path} value={path}>{path}</option>
                  ))}
                  <option value="custom">➕ Add Custom Skill Path...</option>
                </select>

                {(!selectedSkillMeta?.defaultSkillPaths.includes(form.skillPath || "") || form.skillPath === "") && (
                  <input
                    type="text"
                    className="w-full bg-indigo-50 text-slate-950 border border-indigo-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-bold"
                    placeholder="Type custom skill path name..."
                    value={form.skillPath || ""}
                    onChange={e => setField("skillPath", e.target.value)}
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Course Duration Mode *</label>
              <select
                className="w-full bg-slate-50 text-slate-950 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-bold cursor-pointer"
                value={form.durationMode || "standard"}
                onChange={e => setField("durationMode", e.target.value)}
              >
                <option value="standard">Standard (5-Day Structured pacing)</option>
                <option value="express">Express (Self-paced, immediate access)</option>
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

      {/* TAB 2: CURRICULUM & CHECKS BUILDER */}
      {activeSection === "curriculum" && (
        <div className="space-y-6">
          {/* Day customization tools */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase text-indigo-700 block">📅 Customize Course Duration</span>
              <span className="text-xs text-slate-500 font-bold block">
                Current duration: <strong className="text-slate-800 font-extrabold">{(form.days || []).length} Days</strong>
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setForm(prev => {
                    const currentDays = prev.days || [];
                    const nextDayNum = currentDays.length + 1;
                    const newDay = emptyDay(nextDayNum);
                    return {
                      ...prev,
                      days: [...currentDays, newDay]
                    };
                  });
                  setTimeout(() => {
                    setForm(prev => {
                      const len = prev.days?.length || 1;
                      setActiveDayIdx(len - 1);
                      return prev;
                    });
                  }, 50);
                }}
                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-black px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                ➕ Add Day
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentDays = form.days || [];
                  if (currentDays.length <= 1) {
                    setError("A course must have at least 1 day.");
                    return;
                  }
                  if (confirmDeleteDayIndex === activeDayIdx) {
                    setForm(prev => {
                      const updated = (prev.days || [])
                        .filter((_, idx) => idx !== activeDayIdx)
                        .map((day, idx) => ({
                          ...day,
                          dayNumber: idx + 1
                        }));
                      return {
                        ...prev,
                        days: updated
                      };
                    });
                    setActiveDayIdx(prev => {
                      const newLen = currentDays.length - 1;
                      if (prev >= newLen) {
                        return Math.max(0, newLen - 1);
                      }
                      return prev;
                    });
                    setConfirmDeleteDayIndex(null);
                  } else {
                    setConfirmDeleteDayIndex(activeDayIdx);
                    setTimeout(() => {
                      setConfirmDeleteDayIndex(null);
                    }, 4000);
                  }
                }}
                className={`text-xs font-black px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm border ${
                  confirmDeleteDayIndex === activeDayIdx
                    ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-700 animate-pulse"
                    : "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700"
                }`}
              >
                {confirmDeleteDayIndex === activeDayIdx
                  ? `⚠️ Confirm Delete Day ${activeDayIdx + 1}!`
                  : `❌ Remove Day ${activeDayIdx + 1}`}
              </button>
            </div>
          </div>

          {/* Day Selector Accordion Buttons */}
          <div className="flex gap-2 p-1.5 border rounded-2xl bg-slate-100 overflow-x-auto">
            {(form.days || []).map((dayObj, i) => {
              const dayNum = dayObj.dayNumber || (i + 1);
              const currentDayObj = dayObj || emptyDay(dayNum);
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
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-black text-xs leading-none">
                          #{vIdx + 1}
                        </span>
                        {lessonSavingId === (v.id || String(vIdx)) && (
                          <span className="text-[10px] text-teal-600 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded font-black uppercase animate-pulse">
                            Saving...
                          </span>
                        )}
                        {lessonSavedId === (v.id || String(vIdx)) && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded font-black uppercase">
                            ✓ Saved & Sync'd
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveLessonSilently(vIdx)}
                          className="px-3 py-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1"
                        >
                          💾 Save & Update Lesson
                        </button>
                        <button
                          type="button"
                          onClick={() => removeVideoFromDay(activeDayIdx, vIdx)}
                          className="text-xs font-semibold px-2.5 py-1 border border-red-200 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer bg-transparent"
                        >
                          Delete Lesson
                        </button>
                      </div>
                    </div>

                    {/* Lesson Details Import Integration */}
                    <div className="mb-4 bg-teal-50/20 p-3.5 rounded-xl border border-dashed border-teal-200 text-left space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <span className="text-[10px] sm:text-xs font-black uppercase text-teal-850 tracking-wider flex items-center gap-1 shrink-0">
                          📥 Reuse & Import Existing Lesson Details
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold">
                          Quickly copy walkthrough text, resources, quizzes & fun facts
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        {/* Course Selector */}
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Source Track Module</label>
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              setImportSelectedCourseId(prev => ({ ...prev, [vIdx]: val }));
                              setImportSelectedLessonIdx(prev => ({ ...prev, [vIdx]: "" }));
                            }}
                            value={importSelectedCourseId[vIdx] || ""}
                            className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-teal-500 text-slate-800"
                          >
                            <option value="">-- Choose Course --</option>
                            {coursesList
                              .filter(c => !courseId || c.id !== courseId)
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.title}
                                </option>
                              ))
                            }
                          </select>
                        </div>

                        {/* Lesson Selector */}
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Source Lesson</label>
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              setImportSelectedLessonIdx(prev => ({ ...prev, [vIdx]: val }));
                            }}
                            value={importSelectedLessonIdx[vIdx] || ""}
                            disabled={!importSelectedCourseId[vIdx]}
                            className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-teal-500 text-slate-800 disabled:opacity-40"
                          >
                            <option value="">-- Select Lesson --</option>
                            {(() => {
                              const srcCourse = coursesList.find(c => c.id === importSelectedCourseId[vIdx]);
                              if (!srcCourse) return null;
                              
                              const optionsList: { dayIdx: number, videoIdx: number, video: CourseVideo }[] = [];
                              (srcCourse.days || []).forEach((day, dI) => {
                                (day.videos || []).forEach((vid, vI) => {
                                  optionsList.push({ dayIdx: dI, videoIdx: vI, video: vid });
                                });
                              });
                              
                              return optionsList.map((item, optI) => (
                                <option key={optI} value={`${item.dayIdx}-${item.videoIdx}`}>
                                  Day {item.dayIdx + 1}: {item.video.title || `Lesson ${item.videoIdx + 1}`}
                                </option>
                              ));
                            })()}
                          </select>
                        </div>

                        {/* Trigger button */}
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => handleDoImportLesson(vIdx)}
                            disabled={!importSelectedCourseId[vIdx] || !importSelectedLessonIdx[vIdx]}
                            className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white font-extrabold text-[10px] sm:text-xs uppercase tracking-wider rounded-lg border-0 transition-all cursor-pointer shadow-sm disabled:cursor-not-allowed"
                          >
                            ⚡ Copy Lesson Details
                          </button>
                        </div>
                      </div>
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
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] uppercase font-bold text-slate-500">Lesson Video URL (YouTube / Drive / General URL) *</label>
                          <button
                            type="button"
                            onClick={() => generateWithAi(activeDayIdx, vIdx, v)}
                            disabled={aiLoading[v.id || String(vIdx)]}
                            className={`bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 disabled:opacity-60 rounded-lg px-2.5 py-1 text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                              aiLoading[v.id || String(vIdx)] ? "animate-pulse" : ""
                            }`}
                          >
                            <Sparkles className={`w-3 h-3 text-indigo-600 ${aiLoading[v.id || String(vIdx)] ? "animate-spin" : ""}`} />
                            <span>{aiLoading[v.id || String(vIdx)] ? "Analyzing YouTube Link..." : "Auto-Fill with Gemini AI ✨"}</span>
                          </button>
                        </div>
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

                    {/* Separate independent Fun Fact Card section */}
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 mt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-amber-800 flex items-center gap-1.5 font-sans">
                          💡 Separate Lesson Fun Fact
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`has-fun-fact-${vIdx}`}
                            className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500 cursor-pointer"
                            checked={!!v.funFact}
                            onChange={e => {
                              if (e.target.checked) {
                                setVideoField(activeDayIdx, vIdx, 'funFact', {
                                  headline: "Did you know?",
                                  body: ""
                                });
                              } else {
                                setVideoField(activeDayIdx, vIdx, 'funFact', null);
                              }
                            }}
                          />
                          <label htmlFor={`has-fun-fact-${vIdx}`} className="text-[11px] font-black uppercase text-amber-800 cursor-pointer select-none">
                            Include Fun Fact
                          </label>
                        </div>
                      </div>

                      {v.funFact && (
                        <div className="space-y-3 pt-2.5 border-t border-amber-200/40 animate-fadeIn">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-amber-850 mb-1">Headline *</label>
                            <input
                              type="text"
                              className="w-full bg-white text-slate-950 border border-amber-200 rounded-lg p-2.5 text-sm font-semibold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                              value={v.funFact.headline || ""}
                              onChange={e => {
                                setVideoField(activeDayIdx, vIdx, 'funFact', {
                                  ...v.funFact,
                                  headline: e.target.value
                                });
                              }}
                              placeholder="e.g., Mind-blowing productivity stat!"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-amber-850 mb-1">Fun Fact Content/Stat *</label>
                            <textarea
                              rows={3}
                              className="w-full bg-white text-slate-900 border border-amber-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 leading-relaxed"
                              value={v.funFact.body || ""}
                              onChange={e => {
                                setVideoField(activeDayIdx, vIdx, 'funFact', {
                                  ...v.funFact,
                                  body: e.target.value
                                });
                              }}
                              placeholder="Describe an intriguing stat or historical snippet for this lesson point..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* End of day submissions Assignment configuration */}
          <div className="bg-white rounded-3xl p-6 border-2 border-dashed border-teal-600 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-850 tracking-wider">
                    Day {activeDayIdx + 1} End-of-Day Assignment Section
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold">
                    Decide whether students must submit an assignment response for today
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleAssignmentSection(activeDayIdx)}
                className={`text-xs font-black px-4.5 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                  (form.days || [])[activeDayIdx]?.assignment
                    ? "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700"
                    : "bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700"
                }`}
              >
                {(form.days || [])[activeDayIdx]?.assignment
                  ? "❌ Remove Assignment Section"
                  : "➕ Add Assignment Section"}
              </button>
            </div>

            {(form.days || [])[activeDayIdx]?.assignment ? (
              <div className="space-y-4 pt-2">
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start gap-2">
                  <span className="text-xs">✓</span>
                  <div>
                    <span className="text-[10px] uppercase font-black text-emerald-800">
                      Assignment section is active
                    </span>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      Students will see this prompt and be required to submit answers under the "My Assignments" workspace to unlock successive days.
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Assignment Prompt *</label>
                  <textarea
                    rows={5}
                    className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-teal-500 outline-none text-sm font-semibold"
                    value={(form.days || [])[activeDayIdx]?.assignment?.prompt || ""}
                    onChange={e => handleAssignmentChange(activeDayIdx, 'prompt', e.target.value)}
                    placeholder={`Apply today's learnings into a draft portfolio canvas and copy/pasted submission link inside the field below...`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Deadline or submission note</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 text-slate-950 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-teal-500 outline-none text-sm font-bold"
                    value={(form.days || [])[activeDayIdx]?.assignment?.dueNote || ""}
                    onChange={e => handleAssignmentChange(activeDayIdx, 'dueNote', e.target.value)}
                    placeholder="e.g., Submit before midnight to stay eligible for direct coaching verification."
                  />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/50 text-center py-8 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-500 font-bold">
                  No end-of-day assignment is set for Day {activeDayIdx + 1}.
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold max-w-sm mx-auto">
                  Students will complete today's lesson videos and proceed without submitting a project response.
                </p>
                <button
                  type="button"
                  onClick={() => toggleAssignmentSection(activeDayIdx)}
                  className="mt-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black px-4 py-2 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                >
                  ➕ Enable Assignment Section
                </button>
              </div>
            )}
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
                {(form.days || []).map((dayObj, i) => {
                  const dayNum = dayObj.dayNumber || (i + 1);
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
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-black uppercase text-indigo-700">🔒 Course Access & Locking System</span>
              <span className={`px-2.5 py-0.5 rounded text-[10px] items-center font-bold font-mono ${
                form.isLocked ? 'bg-red-50 text-red-750 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {form.isLocked ? 'LOCKED' : 'UNLOCKED'}
              </span>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-slate-40/50 bg-slate-50 border rounded-2xl">
              <input
                type="checkbox"
                id="admin-course-locked-toggle"
                className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer mt-0.5"
                checked={!!form.isLocked}
                onChange={e => setField("isLocked", e.target.checked)}
              />
              <div className="space-y-0.5">
                <label htmlFor="admin-course-locked-toggle" className="text-sm font-bold text-slate-800 cursor-pointer select-none">
                  Lock this course for students
                </label>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  When locked, students can still browse the course overview, but won't be able to enter the classroom or begin active lessons/checks until unlocked.
                </p>
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
