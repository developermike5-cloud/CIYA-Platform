import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { signOut, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate, Link } from 'react-router';
import { Course, CourseDay, CourseVideo } from '../types';
import { Compass, User as UserIcon, BookOpen, LogOut, Lock, Menu, X, CheckCircle, Edit3, Save, Clock, MessageCircle, ArrowLeft, Play, ExternalLink, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'motion/react';
import BrandingLogo from '../components/BrandingLogo';
import SecureYoutubePlayer from '../components/SecureYoutubePlayer';
import PromptGenerator from '../components/PromptGenerator';

const SKILLS: Record<string, { label: string, icon: string, color: string, bg: string }> = {
  web: { label: "AI Website Development", icon: "🌐", color: "#0d9488", bg: "#ccfbf1" },
  film: { label: "AI Film Studio", icon: "🎬", color: "#7c3aed", bg: "#ede9fe" },
  image: { label: "AI Image & Graphics", icon: "🎨", color: "#d97706", bg: "#fef3c7" },
};

const COMPLEMENTARY_FUN_FACTS = [
  { headline: "The Speed of Learning", body: "Students who complete interactive micro-checks during technical courses retain up to 43% more operational sequence logic!" },
  { headline: "AI Coding Assistant Multiplier", body: "Developers leveraging AI assistants like Gemini build production-ready full-stack layouts up to 3x faster than traditional coding!" },
  { headline: "Visual Retention Metrics", body: "Visual walk-through animations paired with dual narrative captions boost average concept absorption rates from 20% to over 68%." },
  { headline: "Continuous Incremental Upskilling", body: "Studying technical skills for just 15 minutes a day has a compounding value that dwarfs traditional quarterly cram sessions." },
  { headline: "The 2.5-Flash Efficiency", body: "Modern flash models like Gemini 2.5-Flash execute structured syllabus analysis in under 800 milliseconds, ensuring zero lag for educators." }
];

function Badge({ text, color, bg }: { text: string, color: string, bg: string }) {
  return <span style={{ background: bg, color, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, display: "inline-block" }}>{text}</span>;
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

function CheckTypeBadge({ type }: { type: string }) {
  const m: Record<string, [string, string, string]> = {
    mcq: ["#3b82f6", "#eff6ff", "Quiz"],
    tf: ["#8b5cf6", "#f5f3ff", "True/False"],
    fact: ["#f59e0b", "#fffbeb", "Fact"],
    none: ["#94a3b8", "#f1f5f9", "None"]
  };
  const [c, b, t] = m[type] || m.none;
  return <Badge text={t} color={c} bg={b} />;
}

// Interactive Post-Video Engagement Check
interface PostVideoCheckProps {
  check: any;
  checkType: 'none' | 'mcq' | 'tf' | 'fact';
  checkKey: string;
  onPass: () => void;
}

function PostVideoCheck({ check, checkType, checkKey, onPass }: PostVideoCheckProps) {
  const [selected, setSelected] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Clear selections and reset index when lesson changes
  useEffect(() => {
    setSelected(null);
    setSubmitted(false);
    setCurrentIdx(0);
  }, [checkKey]);

  if (!check) return null;

  // Standardize checks into an array
  const checkItems: any[] = Array.isArray(check) ? check : [check];
  const activeCheck = checkItems[currentIdx];
  
  if (!activeCheck) return null;

  const totalQuestions = checkItems.length;

  const handleNextQuestion = () => {
    if (currentIdx + 1 < totalQuestions) {
      setSelected(null);
      setSubmitted(false);
      setCurrentIdx(prev => prev + 1);
    } else {
      onPass();
    }
  };

  // 1. FACT CHECK CARD
  if (checkType === "fact") {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 text-center max-w-xl mx-auto shadow-sm space-y-3">
        <div className="text-3xl mb-1">💡</div>
        {totalQuestions > 1 && (
          <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Fact Check {currentIdx + 1} of {totalQuestions}
          </span>
        )}
        <h4 className="text-sm font-black text-amber-800 uppercase tracking-wider mb-2">{activeCheck.headline || 'Did you know?'}</h4>
        <p className="text-xs text-amber-900 leading-relaxed mb-4 font-semibold">{activeCheck.body}</p>
        <button
          onClick={handleNextQuestion}
          className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg shadow-md text-xs cursor-pointer border-0"
        >
          {currentIdx + 1 < totalQuestions ? "Read Next Fact →" : "Acknowledge & continue →"}
        </button>
      </div>
    );
  }

  // 2. TRUE OR FALSE
  if (checkType === "tf") {
    const isCorrect = selected === activeCheck.answer;
    return (
      <div className="bg-white border text-sm border-slate-200 rounded-2xl p-6 max-w-xl mx-auto shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 rounded-full tracking-wider">True or False?</span>
          {totalQuestions > 1 && (
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest pl-2">
              Question {currentIdx + 1} of {totalQuestions}
            </span>
          )}
        </div>
        <p className="font-extrabold text-slate-800 text-sm leading-relaxed">{activeCheck.statement}</p>

        {!submitted ? (
          <div className="space-y-3">
            <div className="flex gap-2.5">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  onClick={() => setSelected(v)}
                  className={`flex-1 py-2.5 border rounded-xl font-bold text-xs cursor-pointer transition-all ${
                    selected === v
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-extrabold'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {v ? "TRUE" : "FALSE"}
                </button>
              ))}
            </div>
            {selected !== null && (
              <div className="text-center pt-1.5">
                <button
                  type="button"
                  onClick={() => setSubmitted(true)}
                  className="px-6 py-2 bg-indigo-600 font-extrabold hover:bg-indigo-700 text-white text-xs rounded-lg cursor-pointer border-0"
                >
                  Confirm Choice
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="text-3xl">{isCorrect ? "🎉" : "😅"}</div>
            <h5 className={`font-black uppercase text-xs ${isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
              {isCorrect ? "Spot On! Correct" : `Not quite! The correct response is ${activeCheck.answer ? 'TRUE' : 'FALSE'}`}
            </h5>
            {activeCheck.explanation && (
              <p className="text-xs text-slate-500 italic bg-slate-50 border p-3 rounded-lg leading-relaxed">{activeCheck.explanation}</p>
            )}
            <button
              onClick={handleNextQuestion}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer border-0 shadow-md"
            >
              {currentIdx + 1 < totalQuestions ? "Next Question →" : "Onward & Continue →"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // 3. MULTIPLE CHOICE QUESTION (MCQ)
  if (checkType === "mcq") {
    const isCorrect = selected === activeCheck.correct;
    const options = activeCheck.options || ["", "", "", ""];
    
    return (
      <div className="bg-white border text-sm border-slate-200 rounded-2xl p-6 max-w-xl mx-auto shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-teal-700 bg-teal-50 px-2 rounded-full tracking-wider">Concept Check</span>
          {totalQuestions > 1 && (
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest pl-2">
              Question {currentIdx + 1} of {totalQuestions}
            </span>
          )}
        </div>
        <p className="font-extrabold text-slate-800 text-sm leading-relaxed">{activeCheck.question}</p>

        {!submitted ? (
          <div className="space-y-2">
            {options.map((opt: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setSelected(idx)}
                className={`w-full text-left p-3 border rounded-xl font-medium text-xs flex gap-2.5 items-center cursor-pointer transition-all ${
                  selected === idx
                    ? 'border-teal-600 bg-teal-50 text-teal-800 font-bold shadow-inner'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className={`w-5 h-5 rounded-full border flex items-center justify-center font-black text-[9px] ${
                  selected === idx ? 'bg-teal-600 border-teal-600 text-white' : 'bg-slate-50 text-slate-400'
                }`}>
                  {["A", "B", "C", "D"][idx]}
                </span>
                <span className="flex-1 truncate">{opt}</span>
              </button>
            ))}
            
            {selected !== null && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setSubmitted(true)}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-700 font-extrabold text-white text-xs rounded-lg cursor-pointer border-0"
                >
                  Verify Answer
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {options.map((opt: string, idx: number) => {
              const matchesCorrect = idx === activeCheck.correct;
              const matchesChosen = idx === selected;
              const borderCol = matchesCorrect ? 'border-emerald-500 bg-emerald-50' : matchesChosen ? 'border-red-300 bg-red-50' : 'border-slate-100 opacity-60';
              return (
                <div key={idx} className={`p-3 border rounded-xl text-xs flex gap-2.5 items-center ${borderCol}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[9px] text-white ${
                    matchesCorrect ? 'bg-emerald-600' : matchesChosen ? 'bg-red-500' : 'bg-slate-200'
                  }`}>
                    {matchesCorrect ? "✓" : matchesChosen ? "✕" : ["A", "B", "C", "D"][idx]}
                  </span>
                  <span className={`flex-1 font-semibold ${matchesCorrect ? 'text-emerald-900 font-extrabold' : 'text-slate-800'}`}>{opt}</span>
                </div>
              );
            })}

            <div className="bg-slate-50 border rounded-xl p-3 mt-3">
              <h5 className={`font-black text-xs uppercase ${isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isCorrect ? "🎉 Spot On! Excellent" : "😅 Incorrect Option"}
              </h5>
              {activeCheck.explanation && (
                <p className="text-slate-500 text-xs italic leading-relaxed mt-1">{activeCheck.explanation}</p>
              )}
            </div>

            <div className="text-center pt-3">
              <button
                type="button"
                onClick={handleNextQuestion}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer border-0 shadow-md"
              >
                {currentIdx + 1 < totalQuestions ? "Next Question →" : "Onward & Continue →"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// Assignment submission Form Card
interface AssignmentProps {
  assignment?: { prompt: string; dueNote: string };
  dayIndex: number;
  submissions: Record<string, { text: string; link: string; submittedAt: string }>;
  onSubmit: (key: string, data: { text: string; link: string; submittedAt: string }) => void;
}

function AssignmentPanel({ assignment, dayIndex, submissions, onSubmit }: AssignmentProps) {
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  
  const currentSubmission = submissions[`day-${dayIndex}`];

  if (currentSubmission) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3 shadow-inner">
        <div className="text-3xl">✅</div>
        <h4 className="font-extrabold text-sm text-emerald-800 uppercase tracking-wide">Assignment Handed In!</h4>
        <p className="text-xs text-emerald-900 font-medium">Your submission for Day {dayIndex+1} study block has been securely logged with the coach.</p>
        
        {currentSubmission.link && (
          <div className="text-xs font-bold font-mono py-1.5 px-3 bg-white border inline-block rounded-lg mt-2 shadow-sm text-teal-700">
            🔗 Link: <a href={currentSubmission.link} target="_blank" rel="noreferrer" className="underline hover:text-teal-900">{currentSubmission.link}</a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-dashed border-teal-600 rounded-3xl p-6 space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">📋</span>
        <div>
          <h4 className="font-black text-slate-800 text-sm">Day {dayIndex + 1} End-of-Day Assignment</h4>
          {assignment?.dueNote && <p className="text-[10px] uppercase font-bold text-amber-600 mt-0.5">{assignment.dueNote}</p>}
        </div>
      </div>

      <div className="text-xs text-slate-600 bg-slate-50 border p-3 rounded-xl leading-relaxed">
        {assignment?.prompt || "Execute today's syllabus lessons on your system and log your drafted link below."}
      </div>

      <div className="space-y-3 text-xs">
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Response Description *</label>
          <textarea
            rows={3}
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full bg-white border border-slate-300 shadow-sm outline-none p-3 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all"
            required
            placeholder="Describe what you built today, what obstacles you overcame, or outline your next study milestone..."
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Live Demo / Resource URL Link (Optional)</label>
          <input
            type="text"
            value={link}
            onChange={e => setLink(e.target.value)}
            className="w-full bg-white border border-slate-300 shadow-sm outline-none p-2.5 text-xs text-slate-800 font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all"
            placeholder="https://your-live-deployment.web.app"
          />
        </div>

        <button
          onClick={() => {
            if (!text.trim()) return;
            onSubmit(`day-${dayIndex}`, {
              text,
              link,
              submittedAt: new Date().toLocaleString()
            });
          }}
          disabled={!text.trim()}
          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl transition-all shadow-md cursor-pointer text-xs uppercase disabled:opacity-40 border-0"
        >
          Submit Live Assignment →
        </button>
      </div>
    </div>
  );
}

// Formatting walkthrough description with paragraphs and spacing based on timestamp
function formatWalkthroughDescription(descText: string) {
  if (!descText) return null;
  const lines = descText.split('\n');
  return (
    <div className="space-y-4 text-sm md:text-base font-semibold text-slate-800 leading-relaxed text-left">
      {lines.map((line, idx) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;
        
        // Matches setup timestamps like [00:00], 01:23, or Day 1 - 02:40
        const timestampRegex = /^(\[?\d{1,2}:\d{2}\]?|Day\s+\d+\s+-\s+\d{1,2}:\d{2})\s*(?:-)?\s*(.*)$/i;
        const match = trimmedLine.match(timestampRegex);
        
        if (match) {
          const stamp = match[1];
          const rest = match[2];
          return (
            <div key={idx} className="flex gap-3 items-start pt-1">
              <span className="font-mono text-xs font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg mt-0.5 shrink-0 select-none">
                ⏱ {stamp}
              </span>
              <p className="text-slate-900 font-extrabold leading-normal m-0">{rest}</p>
            </div>
          );
        }
        
        return (
          <p key={idx} className="leading-relaxed m-0 text-slate-900 font-extrabold">
            {trimmedLine}
          </p>
        );
      })}
    </div>
  );
}

// Unified lesson lock validator helper function
function isLessonUnlockedUnified(di: number, vi: number, days: any[], completedKeys: string[], checkPassedKeys: string[]) {
  if (di === 0 && vi === 0) return true;
  
  let predDi = di;
  let predVi = vi - 1;
  
  if (vi === 0) {
    predDi = di - 1;
    const prevDayVideos = days[predDi]?.videos || [];
    predVi = prevDayVideos.length - 1;
  }
  
  if (predDi < 0) return true;
  
  const precedingKey = `${predDi}-${predVi}`;
  const isPrecedingVideoWatched = completedKeys.includes(precedingKey);
  
  const prevDayVideos = days[predDi]?.videos || [];
  const precedingVideo = prevDayVideos[predVi];
  const hasQuiz = precedingVideo && precedingVideo.checkType && precedingVideo.checkType !== 'none';
  const isQuizPassed = checkPassedKeys.includes(precedingKey);
  
  return isPrecedingVideoWatched && (!hasQuiz || isQuizPassed);
}

// Interactive Post-Video Engagement Check popup modal
interface QuizModalProps {
  check: any;
  checkType: 'none' | 'mcq' | 'tf' | 'fact';
  checkKey: string;
  courseId: string;
  currentUser: any;
  userProfile: any;
  onSuccess: () => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

function QuizModal({ check, checkType, checkKey, courseId, currentUser, userProfile, onSuccess, onClose, showToast }: QuizModalProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scorePercentage, setScorePercentage] = useState<number | null>(null);
  const [hasPassed, setHasPassed] = useState(false);

  if (!check) return null;

  const checkItems: any[] = Array.isArray(check) ? check : [check];
  const maxQuestions = checkItems.length;

  const handleSubmittingQuiz = async () => {
    let correctCount = 0;
    checkItems.forEach((q, idx) => {
      const chosen = selectedAnswers[idx];
      if (checkType === 'mcq') {
        if (chosen === q.correct) correctCount++;
      } else if (checkType === 'tf') {
        if (chosen === q.answer) correctCount++;
      } else if (checkType === 'fact') {
        correctCount++;
      }
    });

    const finalPct = maxQuestions > 0 ? Math.round((correctCount / maxQuestions) * 100) : 100;
    const passesQuiz = finalPct >= 80;

    setScorePercentage(finalPct);
    setHasPassed(passesQuiz);
    setSubmitted(true);

    try {
      const dbScores = userProfile.progress?.[courseId]?.quizScores || {};
      const existingScoreRecord = dbScores[checkKey];

      const userRef = doc(db, 'users', currentUser.uid);

      if (!existingScoreRecord) {
        await updateDoc(userRef, {
          [`progress.${courseId}.quizScores.${checkKey}`]: {
            score: finalPct,
            passed: passesQuiz,
            answeredAt: new Date().toLocaleString(),
            firstAttemptRecorded: true
          },
          updatedAt: serverTimestamp()
        });
        showToast(`First Attempt recorded: ${finalPct}%! 🎉`);
      } else {
        if (passesQuiz && !existingScoreRecord.passed) {
          await updateDoc(userRef, {
            [`progress.${courseId}.quizScores.${checkKey}.passed`]: true,
            updatedAt: serverTimestamp()
          });
          showToast(`Module updated as passed!`);
        }
      }

      if (passesQuiz) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error saving score attempt:", err);
    }
  };

  const activeQuestion = checkItems[currentIdx];

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl relative border border-slate-100 text-left overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer font-bold text-lg select-none"
        >
          ✕
        </button>

        {!submitted ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full tracking-wider">
                🧠 Knowledge Check ({checkType.toUpperCase()})
              </span>
              <span className="text-xs text-slate-400 font-bold">
                Q {currentIdx + 1} of {maxQuestions}
              </span>
            </div>

            <h4 className="font-black text-slate-950 text-base md:text-lg leading-relaxed">
              {checkType === 'mcq' ? activeQuestion.question : checkType === 'tf' ? activeQuestion.statement : (activeQuestion.headline || 'Read this factsheet:')}
            </h4>

            {checkType === 'mcq' && (
              <div className="space-y-2.5">
                {(activeQuestion.options || []).map((opt: string, optIdx: number) => {
                  const isSelected = selectedAnswers[currentIdx] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => setSelectedAnswers({ ...selectedAnswers, [currentIdx]: optIdx })}
                      className={`w-full text-left p-3.5 border rounded-xl flex gap-3 items-center transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-extrabold shadow-sm' 
                          : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-5.5 h-5.5 rounded-full border text-[10px] font-black flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-100 text-slate-700 font-bold border-slate-300'
                      }`}>
                        {["A", "B", "C", "D"][optIdx]}
                      </span>
                      <span className={`text-xs md:text-sm font-bold ${isSelected ? 'text-indigo-950 font-black' : 'text-slate-900'}`}>
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {checkType === 'tf' && (
              <div className="grid grid-cols-2 gap-3">
                {[true, false].map((v) => {
                  const isSelected = selectedAnswers[currentIdx] === v;
                  return (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => setSelectedAnswers({ ...selectedAnswers, [currentIdx]: v })}
                      className={`py-4 border rounded-xl text-center font-black uppercase tracking-wider text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/20 text-indigo-950 font-black'
                          : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-900 font-extrabold'
                      }`}
                    >
                      {v ? "True" : "False"}
                    </button>
                  );
                })}
              </div>
            )}

            {checkType === 'fact' && (
              <div className="bg-amber-50 p-5 border border-amber-300 rounded-xl text-left">
                <p className="text-xs md:text-sm text-slate-900 font-extrabold leading-relaxed mb-3">
                  {activeQuestion.body}
                </p>
                {activeQuestion.explanation && (
                  <p className="text-xs text-amber-950 font-bold italic border-t border-amber-250 pt-2.5 leading-relaxed">
                    💡 {activeQuestion.explanation}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="px-4 py-2 text-xs font-bold text-slate-500 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-30 border"
              >
                Previous Question
              </button>

              {currentIdx + 1 < maxQuestions ? (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedAnswers[currentIdx] === undefined && checkType !== 'fact') {
                      alert("Please select your answer to advance!");
                      return;
                    }
                    setCurrentIdx(prev => prev + 1);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wide rounded-xl cursor-pointer font-sans"
                >
                  Next Question →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedAnswers[currentIdx] === undefined && checkType !== 'fact') {
                      alert("Please select your answer to complete!");
                      return;
                    }
                    handleSubmittingQuiz();
                  }}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg"
                >
                  Submit Answers & Grade ✓
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5 text-center py-4">
            <div className="text-4xl">{hasPassed ? "🎉" : "😅"}</div>
            <div>
              <h3 className={`text-xl font-black ${hasPassed ? 'text-emerald-700' : 'text-red-600'}`}>
                {hasPassed ? 'Understanding Checked passed! 🎉' : 'Retake Required! 🔄'}
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-1">
                You scored <strong className="text-slate-900 text-sm font-black font-mono">{scorePercentage}%</strong> · (Minimum passing score: 80%)
              </p>
            </div>

            {hasPassed ? (
              <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-4 text-xs font-semibold text-emerald-950 leading-relaxed max-w-sm mx-auto">
                Excellent comprehension of the course lessons! The lesson progress has been verified and registered on your student card. You are now cleared to proceed.
              </div>
            ) : (
              <div className="bg-red-50 border border-red-150 rounded-2xl p-4 text-xs font-semibold text-rose-950 leading-relaxed max-w-sm mx-auto">
                <p>
                  Comprehension check is below the 80% passing threshold. Please review the lesson walkthrough and notes with focus to pass successfully.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center pt-3">
              {hasPassed ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl cursor-pointer border-0 shadow-lg font-sans"
                >
                  Confirm & Continue Study
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAnswers({});
                    setSubmitted(false);
                    setCurrentIdx(0);
                    setScorePercentage(null);
                    setHasPassed(false);
                  }}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase rounded-xl cursor-pointer border-0 shadow-lg flex items-center gap-1.5"
                >
                  <span>🔄</span> Retake Understanding Check
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Full-width classroom viewer with responsive layout
interface CourseViewerProps {
  course: Course;
  userProfile: any;
  currentUser: any;
  onBack: () => void;
  showToast: (msg: string) => void;
  handleResetProgress: (cId: string) => Promise<void>;
  isAdmin?: boolean;
}

function CourseViewer({ course, userProfile, currentUser, onBack, showToast, handleResetProgress, isAdmin = false }: CourseViewerProps) {
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  const [viewingSyllabus, setViewingSyllabus] = useState(true);

  const courseId = course.id || 'general';
  const progressStore = userProfile.progress?.[courseId] || { watched: [], checkPassed: [], submissions: {}, quizScores: {} };
  
  const completedKeys: string[] = progressStore.watched || [];
  const checkPassedKeys: string[] = progressStore.checkPassed || [];
  const submissions: Record<string, any> = progressStore.submissions || {};

  const days: CourseDay[] = course.days || [];
  const activeDay: any = days[activeDayIdx] || { dayNumber: activeDayIdx + 1, title: 'Study Module', videos: [], assignment: { prompt: '', dueNote: '' } };
  const videos: CourseVideo[] = activeDay.videos || [];
  const currentVideo = videos[activeVideoIdx] || null;

  const [showFunFactPopup, setShowFunFactPopup] = useState(false);
  const [currentFunFact, setCurrentFunFact] = useState<{ headline: string; body: string } | null>(null);

  useEffect(() => {
    if (!currentVideo) return;

    // Immediately load the current video's funFact if exists
    if (currentVideo.funFact && currentVideo.funFact.headline?.trim() && currentVideo.funFact.body?.trim()) {
      setCurrentFunFact(currentVideo.funFact);
    } else {
      // Otherwise, pick a high-quality educational dynamic complementary fact, but never random facts from other chapters/lessons
      const fallback = COMPLEMENTARY_FUN_FACTS[(activeDayIdx + activeVideoIdx) % COMPLEMENTARY_FUN_FACTS.length];
      setCurrentFunFact(fallback);
    }

    const triggerFunFact = () => {
      if (currentVideo.funFact && currentVideo.funFact.headline?.trim() && currentVideo.funFact.body?.trim()) {
        setCurrentFunFact(currentVideo.funFact);
      } else {
        const fallback = COMPLEMENTARY_FUN_FACTS[(activeDayIdx + activeVideoIdx) % COMPLEMENTARY_FUN_FACTS.length];
        setCurrentFunFact(fallback);
      }
      setShowFunFactPopup(true);
    };

    // Trigger popup every 5 minutes (300,000 milliseconds) as requested
    const interval = setInterval(triggerFunFact, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentVideo, activeDayIdx, activeVideoIdx]);

  const checkKey = `${activeDayIdx}-${activeVideoIdx}`;
  const isVideoWatched = completedKeys.includes(checkKey);
  const isCheckPassed = checkPassedKeys.includes(checkKey);
  const hasCheck = !!(currentVideo && currentVideo.checkType && currentVideo.checkType !== 'none' && currentVideo.check);

  const totalVideos = days.reduce((sum, d) => sum + (d.videos?.length || 0), 0);
  const totalWatchedCount = completedKeys.length;
  const progressRatio = totalVideos > 0 ? Math.round((totalWatchedCount / totalVideos) * 100) : 0;

  const handleGoToVideo = (di: number, vi: number) => {
    setActiveDayIdx(di);
    setActiveVideoIdx(vi);
    setShowQuizModal(false);
    setShowAssignment(false);
    setViewingSyllabus(false);
  };

  const handleMarkComplete = async () => {
    if (hasCheck && !isCheckPassed) {
      setShowQuizModal(true);
    } else {
      try {
        const updatedWatched = [...completedKeys];
        if (!updatedWatched.includes(checkKey)) {
          updatedWatched.push(checkKey);
        }
        
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          [`progress.${courseId}.watched`]: updatedWatched,
          updatedAt: serverTimestamp()
        });
        showToast("Lesson marked as completed! ✓");
      } catch (e) {
        console.error("Error updating completed lessons list:", e);
      }
    }
  };

  const handleCheckCompletion = async () => {
    try {
      const updatedWatched = [...completedKeys];
      if (!updatedWatched.includes(checkKey)) {
        updatedWatched.push(checkKey);
      }

      const updatedPassed = [...checkPassedKeys];
      if (!updatedPassed.includes(checkKey)) {
        updatedPassed.push(checkKey);
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        [`progress.${courseId}.watched`]: updatedWatched,
        [`progress.${courseId}.checkPassed`]: updatedPassed,
        updatedAt: serverTimestamp()
      });

      setShowQuizModal(false);
      showToast("Comprehension check passed! Lesson unlocked! 🎉");
    } catch (e) {
      console.error("Error verification passing state:", e);
    }
  };

  const handleGoNext = () => {
    const isUnlocked = isAdmin || isLessonUnlockedUnified(activeDayIdx, activeVideoIdx, days, completedKeys, checkPassedKeys);
    if (!isUnlocked) {
      alert("Lesson check is locked! Clear comprehension quiz of this lesson first.");
      return;
    }

    if (activeVideoIdx < videos.length - 1) {
      setActiveVideoIdx(prev => prev + 1);
      setShowQuizModal(false);
    } else {
      setShowAssignment(true);
    }
  };

  const handleGoPrev = () => {
    setShowQuizModal(false);
    setShowAssignment(false);
    if (activeVideoIdx > 0) {
      setActiveVideoIdx(prev => prev - 1);
    } else if (activeDayIdx > 0) {
      const prevIdx = activeDayIdx - 1;
      setActiveDayIdx(prevIdx);
      const prevVideos = days[prevIdx]?.videos || [];
      setActiveVideoIdx(prevVideos.length > 0 ? prevVideos.length - 1 : 0);
    }
  };

  const handleAssignmentSubmit = async (key: string, data: any) => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        [`progress.${courseId}.submissions.${key}`]: data,
        updatedAt: serverTimestamp()
      });
      showToast("Assignment submitted successfully!");
    } catch (e) {
      console.error("Error submitting assignment:", e);
    }
  };

  const sk = SKILLS[course.skill || 'web'];

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans pb-16">
      {/* 1. CLASSROOM TOP PORTAL SPECS CARD */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 w-full">
        <div className="flex gap-3 items-center text-left min-w-0">
          <button
            onClick={onBack}
            className="p-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-800 font-black text-xs rounded-xl transition-all cursor-pointer bg-white flex items-center justify-center shrink-0"
            title="Back to curriculum"
          >
            ← Back
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-sm text-slate-900 leading-tight truncate sm:whitespace-normal sm:line-clamp-2">{course.title}</h3>
            <p className="text-[10.5px] text-slate-600 font-extrabold truncate mt-0.5">{course.tagline || course.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t border-slate-100 sm:border-0">
          <div className="text-left sm:text-right">
            <div className="text-[10px] font-black uppercase text-teal-700 tracking-wider">
              {progressRatio}% COMPLETE · {totalWatchedCount}/{totalVideos} CLIPS
            </div>
          </div>
          <button
            onClick={() => handleResetProgress(courseId)}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10.5px] font-black uppercase rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 focus:ring-2 focus:ring-red-200"
            title="Reset course progression and scores"
          >
            🔄 Reset Course Progress
          </button>
        </div>
      </div>

      {viewingSyllabus ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 text-left">
          <div>
            <span className="text-xs font-black uppercase text-teal-800 bg-teal-50 px-3.5 py-1.5 rounded-full tracking-wider">
              Full-Course Syllabus & Roadmap Info
            </span>
            <h2 className="font-extrabold text-slate-900 text-xl md:text-2xl mt-4 tracking-tight leading-snug">
              {course.title}
            </h2>
            <p className="text-sm md:text-base text-slate-700 font-extrabold leading-relaxed mt-2.5">
              {course.tagline || course.subtitle || "Step-by-step masterclass syllabus curated by professional tech coaches."}
            </p>
          </div>

          <hr className="border-slate-100" />

          {/* Course Overview / synopsis with deep high contrast text */}
          {(course.overview || course.description) && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs md:text-sm font-black uppercase text-indigo-700 tracking-wider block">🎯 Overview Synopsis</span>
              <p className="text-sm md:text-base text-slate-800 font-extrabold leading-relaxed whitespace-pre-line">
                {course.overview || course.description}
              </p>
            </div>
          )}

          {/* General specs layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-2xl select-none">🧑‍🏫</span>
              <div className="text-xs leading-normal">
                <span className="font-extrabold uppercase text-xs text-slate-500 block tracking-wider">Instructor Team</span>
                <span className="font-black text-slate-900 block mt-0.5">{course.instructor || "CIYA Technical Team"}</span>
              </div>
            </div>

            {course.price ? (
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-2xl select-none">💰</span>
                <div className="text-xs leading-normal">
                  <span className="font-extrabold uppercase text-[9px] text-slate-400 block tracking-wider">Course Price Status</span>
                  <span className="font-black text-slate-900 block mt-0.5">${course.price} USD</span>
                </div>
              </div>
            ) : null}

            {course.requirements && (
              <div className="md:col-span-2 space-y-1.5 bg-amber-50/60 p-4 md:p-5 rounded-2xl border border-amber-200">
                <span className="text-[11px] font-black uppercase text-amber-800 tracking-wider block">🛠️ Required Prep Tools & Prerequisites</span>
                <p className="text-xs md:text-sm font-extrabold text-amber-950 leading-relaxed whitespace-pre-line">
                  {course.requirements}
                </p>
              </div>
            )}

            {course.outcomes && (
              <div className="md:col-span-2 space-y-1.5 bg-teal-50/35 p-4 md:p-5 rounded-2xl border border-teal-200">
                <span className="text-[11px] font-black uppercase text-teal-800 tracking-wider block">🚀 Core Professional Objectives & Outcomes</span>
                <p className="text-xs md:text-sm font-extrabold text-teal-950 leading-relaxed whitespace-pre-line">
                  {course.outcomes}
                </p>
              </div>
            )}
          </div>

          <div className="pt-4">
            <button
              onClick={() => setViewingSyllabus(false)}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm uppercase rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-[0.98] border-0"
            >
              📊 Enter Classroom & Begin Lessons →
            </button>
          </div>
        </div>
      ) : showAssignment ? (
        <AssignmentPanel
          assignment={activeDay.assignment}
          dayIndex={activeDayIdx}
          submissions={submissions}
          onSubmit={handleAssignmentSubmit}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 text-left shadow-lg relative overflow-hidden border border-indigo-900/40">
            <div className="relative z-10 max-w-xl space-y-2">
              <span className="text-[10px] md:text-xs font-black uppercase text-indigo-300 tracking-wider bg-indigo-950/60 px-3.5 py-1.5 rounded-full border border-indigo-500/30">
                ACTIVE WORKSPACE CLASSROOM
              </span>
              <h2 className="text-xl md:text-2xl font-black tracking-tight leading-none mt-2">
                Interactive Learning Portal
              </h2>
              <p className="text-xs md:text-sm text-indigo-150 font-bold leading-relaxed max-w-lg">
                Proceed sequentially. Tap on any unlocked lesson card in the timeline below to open the walkthrough, play the video lecture, and verify your comprehension.
              </p>
            </div>
            <div className="absolute right-6 bottom-0 top-0 opacity-15 flex items-center select-none text-[150px] pointer-events-none font-sans">
              🎓
            </div>
          </div>
        </div>
      )}

      {/* 2. DAILY LESSONS TIMELINE Navigation (Moved to the bottom sequentially, only covered days showing) */}
      {!viewingSyllabus && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 text-left animate-fade-in">
          <div className="border-b pb-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">Course Syllabus Navigation</span>
              <h4 className="text-base md:text-lg font-black text-slate-900">🗓️ Guided Training Daily Schedule</h4>
            </div>
            <span className="text-sm bg-slate-100 text-slate-800 px-3 py-1 rounded-lg font-extrabold border border-slate-200">
              {totalWatchedCount} of {totalVideos} Clips Completed
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* 1. Selected Day card at the top */}
            {days.map((d, di) => {
              if (activeDayIdx !== di) return null;
              const isDayCoveredOrUnlocked = isAdmin || di === 0 || isLessonUnlockedUnified(di, 0, days, completedKeys, checkPassedKeys);
              if (!isDayCoveredOrUnlocked) return null;

              return (
                <div
                  key={`day-active-${di}`}
                  className="rounded-3xl border-2 border-indigo-300 bg-indigo-50/20 ring-4 ring-indigo-500/5 p-5 md:p-6 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2 mb-4 text-left">
                    <div className="flex items-center justify-between font-sans">
                      <span className="text-xs md:text-sm font-black text-indigo-700 tracking-wider uppercase flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
                        Day {di + 1} (In View)
                      </span>
                      <span className="text-xs bg-indigo-100 text-indigo-800 font-extrabold px-3 py-1 rounded-full uppercase tracking-normal">
                        {(d.videos || []).length} lessons
                      </span>
                    </div>
                    <h5 className="font-extrabold text-slate-900 text-sm md:text-base leading-snug">{d.title}</h5>
                    {d.description && <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-semibold">{d.description}</p>}
                  </div>

                  <div className="space-y-2 text-left">
                    {(d.videos || []).map((vid, vi) => {
                      const currentKey = `${di}-${vi}`;
                      const isVidCurrent = activeDayIdx === di && activeVideoIdx === vi && !showAssignment;
                      const isVidWatched = completedKeys.includes(currentKey);
                      const isKeyCheckPassed = checkPassedKeys.includes(currentKey);
                      const isUnlocked = isAdmin || isLessonUnlockedUnified(di, vi, days, completedKeys, checkPassedKeys);

                      return (
                        <div key={vid.id || vi} className="space-y-3 bg-slate-50/40 p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                          <button
                            type="button"
                            onClick={() => {
                              if (isUnlocked) {
                                handleGoToVideo(di, vi);
                              } else {
                                alert("This lesson is locked! Complete preceding lesson's understanding check to unlock.");
                              }
                            }}
                            disabled={!isUnlocked}
                            className={`w-full rounded-xl p-3 md:p-4 flex items-center justify-between text-xs md:text-sm transition-all pointer-events-auto cursor-pointer border ${
                              isVidCurrent
                                ? 'bg-indigo-600 text-white border-indigo-600 font-extrabold shadow-md'
                                : isUnlocked
                                  ? 'bg-white text-slate-950 border-slate-200 hover:bg-slate-50 font-extrabold'
                                  : 'bg-slate-200 text-slate-600 border-slate-300 font-extrabold opacity-75 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-3 pr-2 text-inherit min-w-0">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black shrink-0 text-xs ${
                                isVidCurrent ? 'bg-white text-indigo-950 shadow-sm' : 'bg-slate-200 text-slate-800'
                              }`}>
                                {vi + 1}
                              </span>
                              <span className="truncate font-black text-left text-xs md:text-sm">{vid.title || `Lesson ${vi+1}`}</span>
                              {vid.duration && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono shrink-0 font-bold ${isVidCurrent ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                                  ⏱ {vid.duration}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0 select-none">
                              {!isUnlocked ? (
                                <Lock className="w-4 h-4 text-slate-400" />
                              ) : (
                                <>
                                  {isKeyCheckPassed && (
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${isVidCurrent ? 'bg-white/20 border-white/40 text-white' : 'text-emerald-800 bg-emerald-100 border-emerald-200'}`}>
                                      ✓ PASSED
                                    </span>
                                  )}
                                  <span className={`w-5.5 h-5.5 rounded-full border flex items-center justify-center font-bold text-xs ${
                                    isVidWatched ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-400 text-slate-500 bg-white'
                                  }`}>
                                    {isVidWatched && "✓"}
                                  </span>
                                </>
                              )}
                            </div>
                          </button>

                          {/* Beautiful Animated Dropdown */}
                          {isVidCurrent && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden space-y-4 px-1 pb-2 pt-1.5"
                            >
                              {/* 1. Cinematic Video Frame FIRST (very tall aspect-ratio on mobile, aspect-video on desktop with secure secure masking templates) */}
                              <SecureYoutubePlayer 
                                url={vid.video_url || vid.url || ""} 
                                title={vid.title || "Lesson Video"} 
                              />

                              {/* 2. Walkthrough outline & resources SECOND */}
                              <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm space-y-4 text-left text-slate-900">
                                <div>
                                  <h4 className="font-extrabold text-slate-900 text-sm md:text-base uppercase tracking-wider">📖 Walkthrough Outline</h4>
                                  {vid.description ? (
                                    <div className="pt-2 text-xs md:text-sm text-slate-800 leading-relaxed font-semibold">
                                      {formatWalkthroughDescription(vid.description)}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-500 italic pt-1">No separate walkthrough text provided.</p>
                                  )}
                                </div>

                                {vid.resources && (
                                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-3.5">
                                    <span className="text-xs font-black text-teal-900 block uppercase">📎 Attached Resource Download Links</span>
                                    <p className="text-teal-950 font-mono text-[11px] md:text-xs mt-1.5 leading-relaxed font-bold whitespace-pre-wrap">
                                      {vid.resources}
                                    </p>
                                  </div>
                                )}

                                {/* Comprehension check action bar */}
                                {vid.checkType && vid.checkType !== 'none' && vid.check && (
                                  <div className={`rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 ${
                                    isKeyCheckPassed 
                                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-950' 
                                      : 'bg-indigo-50 border border-indigo-200 text-indigo-950'
                                  }`}>
                                    <div className="flex gap-3 items-start text-left">
                                      <span className="text-2xl pt-0.5">🧠</span>
                                      <div>
                                        <h5 className="font-black text-xs md:text-[13px] text-indigo-950 leading-none">
                                          {isKeyCheckPassed ? "Comprehension Quiz Cleared!" : "Comprehension Check Available!"}
                                        </h5>
                                        <p className="text-[11px] md:text-xs text-slate-700 leading-relaxed mt-1.5 font-bold">
                                          {isKeyCheckPassed 
                                            ? "Fantastic work! You have successfully validated this module with a passing score."
                                            : "Verify your conceptual understanding with a quick popup quiz."}
                                        </p>
                                      </div>
                                    </div>
                                    {!isKeyCheckPassed ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMarkComplete();
                                        }}
                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs md:text-sm rounded-xl shadow-md transition-all cursor-pointer border-0 w-full sm:w-auto shrink-0"
                                      >
                                        Complete Lesson & Verify ✓
                                      </button>
                                    ) : (
                                      <span className="text-xs font-black text-emerald-900 bg-emerald-100/80 px-4 py-2 rounded-xl border border-emerald-200/60 flex items-center justify-center shrink-0">
                                        ✓ Score Recorded
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Manual mark complete button if no quiz is bound */}
                                {(!vid.checkType || vid.checkType === 'none') && !isVidWatched && (
                                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkComplete();
                                      }}
                                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs md:text-sm rounded-xl shadow-md transition-all cursor-pointer border-0"
                                    >
                                      Mark Lesson Complete ✓
                                    </button>
                                  </div>
                                )}

                                {/* Inline Day Progression Controls inside active block for perfect pagination */}
                                <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleGoPrev();
                                    }}
                                    className="px-4 py-2 border border-slate-205 hover:bg-slate-50 text-slate-650 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer bg-white"
                                  >
                                    ← Previous Module
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleGoNext();
                                    }}
                                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer border-0"
                                  >
                                    {vi === (d.videos || []).length - 1 ? "End-of-Day Assignment →" : "Onward (Next) →"}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}

                    {/* End of day assignment checklist marker */}
                    {d.assignment && (
                      <button
                        type="button"
                        onClick={() => {
                          const allVideosPassed = (d.videos || []).every((v, vi) => {
                            const currentKey = `${di}-${vi}`;
                            const isVidWatched = completedKeys.includes(currentKey);
                            const hasQuiz = v.checkType && v.checkType !== 'none' && v.check;
                            const isQuizPassed = checkPassedKeys.includes(currentKey);
                            return isVidWatched && (!hasQuiz || isQuizPassed);
                          });

                          if (allVideosPassed) {
                            setActiveDayIdx(di);
                            setShowAssignment(true);
                            setShowQuizModal(false);
                            setViewingSyllabus(false);
                          } else {
                            alert("Complete all day's lessons and understanding checks first to unlock the end-of-day assignment!");
                          }
                        }}
                        className={`w-full p-3 border rounded-xl cursor-pointer text-left flex items-center justify-between text-xs md:text-sm transition-all tracking-wide ${
                          showAssignment && activeDayIdx === di
                            ? 'bg-teal-600 text-white border-teal-600 font-black shadow-md'
                            : 'text-teal-950 bg-teal-50 border-teal-200 hover:bg-teal-100 font-extrabold'
                        }`}
                      >
                        <span className="flex items-center gap-2 flex-1 font-bold">
                          <span>{submissions[`day-${di}`] ? "✅" : "📋"}</span>
                          <span>Day {di+1} Live Assignment</span>
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Inactive Remaining Days listing at the bottom */}
            {days.some((_, idx) => idx !== activeDayIdx && (isAdmin || idx === 0 || isLessonUnlockedUnified(idx, 0, days, completedKeys, checkPassedKeys))) && (
              <div className="mt-4 border-t border-slate-100 pt-5 space-y-3">
                <span className="text-xs md:text-sm font-black uppercase text-slate-500 tracking-wider block mb-1">Click to Switch Active Day in View:</span>
                <div className="grid grid-cols-1 gap-4">
                  {days.map((d, di) => {
                    if (activeDayIdx === di) return null;
                    const isDayCoveredOrUnlocked = isAdmin || di === 0 || isLessonUnlockedUnified(di, 0, days, completedKeys, checkPassedKeys);
                    if (!isDayCoveredOrUnlocked) return null;

                    return (
                      <div
                        key={`day-inactive-${di}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-200 p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                        onClick={() => handleGoToVideo(di, 0)}
                      >
                        <div className="space-y-1.5 text-left flex-1">
                          <div className="flex items-center justify-between font-sans">
                            <span className="text-xs font-black text-indigo-700 tracking-wider uppercase">Day {di + 1}</span>
                            <span className="text-xs bg-slate-100 text-slate-700 font-extrabold px-3 py-1 rounded-full uppercase tracking-normal">
                              {(d.videos || []).length} lessons
                            </span>
                          </div>
                          <h5 className="font-extrabold text-slate-900 text-sm leading-snug">{d.title}</h5>
                          {d.description && <p className="text-xs text-slate-700 leading-relaxed font-semibold">{d.description}</p>}
                        </div>

                        <div className="flex justify-end shrink-0">
                          <span className="text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer">
                            📅 View Day {di + 1} Syllabus →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Renders the quiz popup modal on demand */}
      {showQuizModal && currentVideo && currentVideo.check && (
        <QuizModal
          check={currentVideo.check}
          checkType={currentVideo.checkType || 'none'}
          checkKey={checkKey}
          courseId={courseId}
          currentUser={currentUser}
          userProfile={userProfile}
          onSuccess={handleCheckCompletion}
          onClose={() => setShowQuizModal(false)}
          showToast={showToast}
        />
      )}

      {/* CIRCULAR FUN FACT POPUP CARD (Restricted strictly to the lesson number the user is on) */}
      {showFunFactPopup && currentFunFact && (
        <div className="fixed bottom-4 right-4 z-[9999] p-1 select-none">
          <motion.div 
            initial={{ y: 30, scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            className="w-44 h-44 md:w-48 md:h-48 rounded-full bg-amber-50 border-2 border-amber-300 p-4 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden text-amber-950"
          >
            {/* Top orange gradient accent bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            
            {/* Close button in top-right area of circle */}
            <button
              onClick={() => setShowFunFactPopup(false)}
              className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-950 border-0 flex items-center justify-center cursor-pointer font-black text-[9px] transition-all focus:outline-none"
            >
              ✕
            </button>

            <span className="text-lg mb-0.5 select-none animate-bounce">💡</span>
            
            <div className="space-y-0.5">
              <span className="inline-block text-[8px] font-black uppercase text-amber-950 tracking-wider bg-amber-200 px-1.5 py-0.25 rounded-full border border-amber-300">
                Lesson {activeVideoIdx + 1} Fact
              </span>
              <h3 className="text-[10px] md:text-[11px] font-black text-amber-950 tracking-tight leading-tight max-w-[100px] md:max-w-[115px] mx-auto truncate">
                {currentFunFact?.headline || "Did you know?"}
              </h3>
            </div>

            <div className="max-h-[35px] md:max-h-[45px] overflow-y-auto px-1 mt-1 scrollbar-none text-left">
              <p className="text-amber-950 text-[8px] md:text-[9px] leading-relaxed font-bold text-center">
                {currentFunFact?.body}
              </p>
            </div>

            <button
              onClick={() => setShowFunFactPopup(false)}
              className="mt-1.5 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-[8px] tracking-wider uppercase rounded-full transition-all shadow-md cursor-pointer border-0 shrink-0"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Falling flowers animations component
function FallingFlowers() {
  const [flowers, setFlowers] = useState<any[]>([]);

  useEffect(() => {
    const emojis = ['🌸', '💮', '🌺', '🌷', '🌼', '💐'];
    const count = 35;
    const initialFlowers = Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: Math.random() * 95 + 2.5, // dynamic percentage viewport width
      size: Math.random() * 16 + 16, // random size in px
      delay: Math.random() * 8, // rotation delay
      duration: Math.random() * 8 + 6, // fall speed duration
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      sway: Math.random() * 30 - 15, // max horizontal wave
      rotation: Math.random() * 360,
    }));
    setFlowers(initialFlowers);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[9999]">
      {flowers.map((f) => (
        <motion.div
          key={f.id}
          initial={{ 
            y: -100, 
            x: `${f.x}vw`, 
            rotate: f.rotation, 
            opacity: 0 
          }}
          animate={{
            y: '105vh',
            x: [`${f.x}vw`, `${f.x + (f.sway / 10)}vw`, `${f.x - (f.sway / 5)}vw`, `${f.x + (f.sway / 10)}vw`],
            rotate: f.rotation + 720,
            opacity: [0, 1, 1, 0.8, 0],
          }}
          transition={{
            duration: f.duration,
            repeat: Infinity,
            delay: f.delay,
            ease: "linear"
          }}
          style={{
            position: 'absolute',
            fontSize: f.size,
          }}
        >
          {f.emoji}
        </motion.div>
      ))}
    </div>
  );
}

function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';
  let videoId = '';
  try {
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    if (url.includes('youtube.com/watch')) {
      const urlObj = new URL(url);
      videoId = urlObj.searchParams.get('v') || '';
    } else if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/');
      if (parts[1]) {
        videoId = parts[1].split('?')[0];
      }
    } else if (url.includes('youtube.com/v/')) {
      const parts = url.split('youtube.com/v/');
      if (parts[1]) {
        videoId = parts[1].split('?')[0];
      }
    }
  } catch (e) {
    console.error(e);
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

function CourseCard({ course, isLocked, onSelect }: any) {
  const sk = SKILLS[course.skill || 'web'];
  const totalVideos = course.days?.reduce((sum: number, d: any) => sum + (d.videos?.length || 0), 0) || 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      onClick={onSelect}
      className="group flex flex-col bg-white border-2 border-slate-200/90 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-teal-950/10 hover:-translate-y-1.5 transition-all duration-350 cursor-pointer text-left font-sans w-full"
    >
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
        {course.thumbnail ? (
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-50 via-indigo-50/50 to-amber-50 flex items-center justify-center text-5xl select-none">
            {sk?.icon || "📕"}
          </div>
        )}
        <div className="absolute top-4 right-4 flex flex-col gap-1 items-end">
          <TierBadge tier={course.tier || 'beginner'} />
        </div>
        {isLocked && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all opacity-0 group-hover:opacity-100">
            <Lock className="w-12 h-12 text-white drop-shadow-md" />
          </div>
        )}
      </div>
      
      <div className="p-6 md:p-7 flex-1 flex flex-col">
        <h4 className="font-extrabold text-base md:text-lg lg:text-xl text-slate-900 mb-2 line-clamp-2 leading-snug group-hover:text-teal-700 transition-colors">
          {course.title}
        </h4>
        <p className="text-xs md:text-sm text-slate-800 mb-5 line-clamp-2 leading-relaxed font-extrabold">
          {course.tagline || course.subtitle || "Embark on structured study paths curated by professional coaches."}
        </p>

        {/* Dropdown toggle button for general specs */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="w-full mb-5 px-4 py-3 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-[11px] font-black uppercase text-slate-700 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 bg-white"
        >
          <span>📑</span>
          <span>{expanded ? "Hide course specifications ▲" : "View course specifications ▼"}</span>
        </button>

        <div onClick={(e) => e.stopPropagation()} className="overflow-hidden">
          {expanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="mb-4 pt-3.5 border-t border-dashed border-slate-200 text-xs space-y-3"
            >
              {/* Overview / synopsis with solid legibility colors */}
              {(course.overview || course.description) && (
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-indigo-700 block tracking-wider">🎯 Overview Synopsis</span>
                  <p className="text-[11.5px] font-extrabold text-slate-950 leading-relaxed whitespace-pre-line">
                    {course.overview || course.description}
                  </p>
                </div>
              )}

              {/* Instructor */}
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-base">🧑‍🏫</span>
                <div className="text-[11px] leading-snug">
                  <span className="font-extrabold uppercase text-[8.5px] text-slate-400 block tracking-wider">Instructor Team</span>
                  <span className="font-extrabold text-slate-950">{course.instructor || "CIYA Technical Team"}</span>
                </div>
              </div>

              {/* Price/Fee if any */}
              {course.price ? (
                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-base">💰</span>
                  <div className="text-[11px] leading-snug">
                    <span className="font-extrabold uppercase text-[8.5px] text-slate-400 block tracking-wider">Course Price Status</span>
                    <span className="font-extrabold text-slate-950">${course.price} USD</span>
                  </div>
                </div>
              ) : null}

              {/* Requirements / Prerequisite Tools */}
              {course.requirements && (
                <div className="space-y-1 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-black uppercase text-amber-800 block tracking-wider">🛠️ Required Prep Tools</span>
                  <p className="text-[11px] font-extrabold text-amber-950 leading-normal leading-relaxed">
                    {course.requirements}
                  </p>
                </div>
              )}

              {/* Learning Outcomes */}
              {course.outcomes && (
                <div className="space-y-1 bg-teal-50/45 p-3 rounded-xl border border-teal-200">
                  <span className="text-[10px] font-black uppercase text-teal-800 block tracking-wider">🚀 Professional Outcomes</span>
                  <p className="text-[11px] font-extrabold text-teal-950 leading-normal leading-relaxed">
                    {course.outcomes}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
        
        <div className="mt-auto pt-3.5 flex items-center justify-between border-t border-slate-100 text-[11.5px] text-slate-700 font-extrabold font-sans">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 py-1.5 text-xs text-slate-900">
              <span>🎬</span> 
              <span><span className="font-black text-teal-700">{totalVideos}</span> lesson clips</span>
            </div>
          </div>
          {isLocked ? (
             <button className="text-[11px] font-black uppercase tracking-wide text-slate-400 bg-slate-100 flex items-center gap-1 px-3 py-1.5 rounded-full cursor-not-allowed border-0">
               <Lock className="w-3.5 h-3.5" /> Locked
             </button>
           ) : (
             <button className="text-[11px] font-black uppercase tracking-wide text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer">
               Enter →
             </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmissionDetailsCard({ profile }: { profile: any }) {
  if (!profile) return null;
  return (
    <div className="w-full bg-slate-50/85 border border-slate-200 rounded-2xl p-6 text-left max-w-xl mx-auto mt-6">
      <h3 className="font-extrabold text-slate-800 mb-4 text-sm tracking-tight border-b border-slate-200 pb-2 uppercase text-[11px] tracking-wider text-indigo-700 flex items-center gap-2">
        <span>📋</span> Submitted Application Details
      </h3>
      <div className="space-y-4 text-xs md:text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">Full Name</span>
            <span className="text-slate-800 font-semibold">{profile.fullName || '-'}</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">Gender</span>
            <span className="text-slate-800 font-semibold">{profile.gender || '-'}</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">WhatsApp Number</span>
            <span className="text-slate-800 font-mono font-semibold">{profile.whatsapp || '-'}</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">State of Residence</span>
            <span className="text-slate-800 font-semibold">{profile.state || '-'}</span>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3 space-y-3">
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">Recommended Study Program</span>
            <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded text-xs inline-block mt-0.5">
              {profile.recommendedPath || '-'}
            </span>
          </div>
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">Path Selections</span>
            <span className="text-slate-800 font-semibold text-xs">
              {profile.courseType || ''} {profile.pathwaySelection ? `(${profile.pathwaySelection})` : ''}
            </span>
          </div>
          {profile.pathwayReason && (
            <div>
              <span className="text-slate-600 block text-[10px] uppercase font-bold">Reason for Selection</span>
              <p className="text-slate-600 italic mt-0.5 leading-relaxed font-semibold bg-white p-2 rounded border border-slate-200">{profile.pathwayReason}</p>
            </div>
          )}
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">Prior Experience in Course</span>
            <span className="text-slate-800 font-semibold">{profile.pathwayExperience || profile.experience || 'None'}</span>
          </div>
          {profile.intent && (
            <div>
              <span className="text-slate-600 block text-[10px] uppercase font-bold">What are you building CIYA Academy for?</span>
              <p className="text-slate-600 italic mt-0.5 leading-relaxed font-semibold bg-white p-2 rounded border border-slate-200">{profile.intent}</p>
            </div>
          )}
          {profile.goal && (
            <div>
              <span className="text-slate-600 block text-[10px] uppercase font-bold">Target Learning Goal</span>
              <p className="text-slate-600 italic mt-0.5 leading-relaxed font-semibold bg-white p-2 rounded border border-slate-200">{profile.goal}</p>
            </div>
          )}
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">Commitment Level</span>
            <span className="text-slate-800 font-bold">{profile.availability || '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrainingCountdown({ targetDateStr }: { targetDateStr: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isReady: false });

  useEffect(() => {
    const target = new Date(targetDateStr).getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = target - now;
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isReady: true });
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds, isReady: true });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [targetDateStr]);

  if (!timeLeft.isReady) return null;

  const parts = [
    { label: "Days", value: timeLeft.days, color: "from-amber-400 to-yellow-500", glow: "shadow-amber-500/20" },
    { label: "Hours", value: timeLeft.hours, color: "from-teal-400 to-emerald-500", glow: "shadow-teal-500/20" },
    { label: "Minutes", value: timeLeft.minutes, color: "from-indigo-400 to-blue-500", glow: "shadow-indigo-500/20" },
    { label: "Seconds", value: timeLeft.seconds, color: "from-pink-500 to-rose-500", glow: "shadow-pink-500/20 animate-pulse" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2.5 sm:gap-4 md:gap-5 w-full max-w-lg mx-auto py-3">
      {parts.map((p) => (
        <div 
          key={p.label} 
          className="bg-slate-950/90 border border-indigo-500/25 rounded-2xl p-3 md:p-4 text-center shadow-lg shadow-indigo-950/50 flex flex-col justify-center items-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
          <motion.div
            key={p.value}
            initial={{ scale: 0.85, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`text-2xl md:text-3xl lg:text-4xl font-black bg-gradient-to-r ${p.color} bg-clip-text text-transparent font-mono`}
          >
            {String(p.value).padStart(2, "0")}
          </motion.div>
          <span className="text-[8px] md:text-[9px] font-black text-indigo-300 uppercase tracking-widest mt-1.5">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function StudentDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const cached = localStorage.getItem('ciya_cached_user');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed) {
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  });

  const [userProfile, setUserProfile] = useState<any>(() => {
    const cachedProfile = localStorage.getItem('ciya_cached_profile');
    if (cachedProfile) {
      try {
        return JSON.parse(cachedProfile);
      } catch (e) {}
    }
    return null;
  });

  const [authChecking, setAuthChecking] = useState(() => {
    return !(localStorage.getItem('ciya_cached_user') && localStorage.getItem('ciya_cached_profile'));
  });

  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateCountdown = () => {
      const target = new Date("2026-06-22T00:00:00");
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60)
      };
    };

    setCountdown(calculateCountdown());
    const interval = setInterval(() => {
      setCountdown(calculateCountdown());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const [currentView, setCurrentView] = useState<'courses' | 'profile' | 'prompts'>(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'prompts') return 'prompts';
    if (view === 'profile') return 'profile';
    return 'courses';
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'prompts') {
      setCurrentView('prompts');
    } else if (view === 'profile') {
      setCurrentView('profile');
    } else if (view === 'courses') {
      setCurrentView('courses');
    }
  }, [window.location.search]);

  const [appSettings, setAppSettings] = useState<{ lockedSections?: { courses?: boolean; prompts?: boolean } }>({});

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'app'), (docSnap) => {
      if (docSnap.exists()) {
        setAppSettings(docSnap.data() || {});
      }
    });
    return () => unsubSettings();
  }, []);

  const [timeLeft, setTimeLeft] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const cached = localStorage.getItem('ciya_cached_user');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.role === 'admin' || parsed.role === 'super_admin')) {
          return true;
        }
      } catch (e) {}
    }
    return false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [liveCheckComplete, setLiveCheckComplete] = useState(() => {
    const cachedProfile = localStorage.getItem('ciya_cached_profile');
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile);
        return parsed && parsed.approvalStatus === 'Approved';
      } catch (e) {}
    }
    return false;
  });
  
  const [activeSkillFilter, setActiveSkillFilter] = useState<string>('all');
  const navigate = useNavigate();

  const handleViewChange = (view: 'courses' | 'profile' | 'prompts') => {
    setCurrentView(view);
    navigate(`/dashboard?view=${view}`, { replace: true });
  };

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleResetProgress = async (cId: string) => {
    if (!currentUser) return;
    const isConfirmed = window.confirm("Are you absolutely sure you want to reset your learning progress and scores for this course? This action cannot be undone.");
    if (!isConfirmed) return;

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        [`progress.${cId}`]: {
          watched: [],
          textChecked: [],
          watchedComplete: false,
          watchedCount: 0,
          watchedPercent: 0,
          watchedRatio: 0,
          watchedRatioPercent: 0,
          checkedPassed: [],
          submissions: {},
          watchedList: [],
          checkPassed: [],
          quizScores: {}
        },
        updatedAt: serverTimestamp()
      });
      showToast("Lesson progression, quizzes, and score sheet successfully reset!");
    } catch (err) {
      console.error("Error resetting progress:", err);
      showToast("Sync fail resetting progress, please try again.");
    }
  };

  // Selected Course playing state
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // 5 Minutes Fun Fact popup state




    



  // Activation Gating and Popup States
  const [activationCode, setActivationCode] = useState('');
  const [activationError, setActivationError] = useState('');
  const [showCongratsPopup, setShowCongratsPopup] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const handleVerifyCode = async () => {
    setActivationError('');
    const codeEntered = activationCode.trim().toUpperCase();
    const targetCode = (userProfile?.adminCode || '').trim().toUpperCase();
    
    if (!codeEntered) {
      setActivationError('Please enter your activation code.');
      return;
    }
    
    if (codeEntered === targetCode) {
      setUnlocking(true);
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          isDashboardUnlocked: true,
          updatedAt: serverTimestamp()
        });
        setShowCongratsPopup(true);
      } catch (err) {
        console.error('Error unlocking dashboard:', err);
        setActivationError('Unlock sync failed, please try again.');
      } finally {
        setUnlocking(false);
      }
    } else {
      setActivationError('Invalid activation code. Please check with your Admissions administrator.');
    }
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      if (result.user.email === 'developermike5@gmail.com') {
        navigate('/admin');
        return;
      }
      const adminSnap = await getDoc(doc(db, 'admins', result.user.uid));
      const isUserAdmin = adminSnap.exists();
      if (isUserAdmin) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      const docSnap = await getDoc(doc(db, 'users', result.user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentUser(result.user);
        setUserProfile(data);
        const userData = {
          uid: result.user.uid,
          email: result.user.email,
          role: isUserAdmin ? 'admin' : 'student'
        };
        localStorage.setItem('ciya_cached_user', JSON.stringify(userData));
        localStorage.setItem('ciya_cached_profile', JSON.stringify(data));
        setLiveCheckComplete(true);
      } else {
        await signOut(auth);
        alert("Your account is not registered. If you are an invited student, please complete the registration using the private onboarding link sent by your administrator.");
      }
    } catch (e: any) {
      if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error(e);
      if (
        e.code === 'auth/popup-blocked' || 
        e.message?.toLowerCase().includes('popup-blocked') || 
        e.message?.toLowerCase().includes('popup estuvo bloqueado') ||
        e.message?.includes('Pending promise was never set') ||
        e.message?.includes('INTERNAL ASSERTION FAILED')
      ) {
        alert("Google Login popup was blocked by your browser. Please allow popups for this site or open in a new tab to complete log in.");
        return;
      }
      alert("An error occurred during log in: " + e.message);
    }
  };

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let isUserAdmin = false;
        if (user.email === 'developermike5@gmail.com') {
          isUserAdmin = true;
          setIsAdmin(true);
        } else {
          // Check if upgraded admin
          try {
            const adminDocSnap = await getDoc(doc(db, 'admins', user.uid));
            if (adminDocSnap.exists()) {
              isUserAdmin = true;
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          } catch (err) {
            console.error("Dashboard auth check failed for admin state:", err);
          }
        }

        setCurrentUser(user);
        
        // Listen to Firestore real-time profile changes
        const docRef = doc(db, 'users', user.uid);
        unsubSnapshot = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            setUserProfile(profileData);
            
            // Cache to local storage
            const userData = {
              uid: user.uid,
              email: user.email,
              role: isUserAdmin ? 'admin' : 'student'
            };
            localStorage.setItem('ciya_cached_user', JSON.stringify(userData));
            localStorage.setItem('ciya_cached_profile', JSON.stringify(profileData));
            setAuthChecking(false);
            setLiveCheckComplete(true);
          } else if (user.email === 'developermike5@gmail.com') {
            // Mock profile for super admin preview
            const mockProfile = {
              fullName: "Admissions Administrator (Super Admin)",
              email: user.email,
              whatsapp: "+00000000000",
              state: "Admin State",
              goal: "Previewing Student Dashboard",
              approvalStatus: "Approved",
              isActivated: true,
              isDashboardUnlocked: true,
              role: "super_admin",
              createdAt: serverTimestamp()
            };
            setUserProfile(mockProfile);
            const userData = {
              uid: user.uid,
              email: user.email,
              role: 'super_admin'
            };
            localStorage.setItem('ciya_cached_user', JSON.stringify(userData));
            localStorage.setItem('ciya_cached_profile', JSON.stringify(mockProfile));
            setAuthChecking(false);
            setLiveCheckComplete(true);
          } else {
            localStorage.removeItem('ciya_cached_user');
            localStorage.removeItem('ciya_cached_profile');
            alert('No profile found. Please complete the registration process.');
            setLiveCheckComplete(false);
            navigate('/onboarding');
            setAuthChecking(false);
          }
        }, (error: any) => {
          console.error("Profile listen error:", error);
          if (user.email === 'developermike5@gmail.com') {
            const mockProfile = {
              fullName: "Admissions Administrator (Super Admin)",
              email: user.email,
              whatsapp: "+00000000000",
              state: "Admin State",
              goal: "Previewing Student Dashboard",
              approvalStatus: "Approved",
              isActivated: true,
              isDashboardUnlocked: true,
              role: "super_admin",
              createdAt: serverTimestamp()
            };
            setUserProfile(mockProfile);
            setAuthChecking(false);
            setLiveCheckComplete(true);
          } else {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
            setAuthChecking(false);
            setLiveCheckComplete(true);
          }
        });

      } else {
        const cachedUser = localStorage.getItem('ciya_cached_user');
        if (!cachedUser) {
          localStorage.removeItem('ciya_cached_user');
          localStorage.removeItem('ciya_cached_profile');
          setLiveCheckComplete(false);
          if (unsubSnapshot) {
            unsubSnapshot();
            unsubSnapshot = null;
          }
          setCurrentUser(null);
          setUserProfile(null);
          setAuthChecking(false);
        } else {
          setAuthChecking(false);
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubSnapshot) {
        unsubSnapshot();
      }
    };
  }, [navigate]);

  useEffect(() => {
    if (userProfile && !userProfile.isActivated) {
      let creationTimeVal = new Date().getTime();
      if (userProfile.createdAt) {
        if (typeof userProfile.createdAt.toDate === 'function') {
          creationTimeVal = userProfile.createdAt.toDate().getTime();
        } else if (userProfile.createdAt.seconds !== undefined) {
          creationTimeVal = userProfile.createdAt.seconds * 1000;
        } else {
          const parsed = new Date(userProfile.createdAt).getTime();
          if (!isNaN(parsed)) {
            creationTimeVal = parsed;
          }
        }
      }
      const creationTime = creationTimeVal;
      const targetTime = creationTime + 24 * 60 * 60 * 1000;
      
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetTime - now;
        
        if (distance < 0) {
          clearInterval(interval);
          setTimeLeft('EXPIRED');
          return;
        }
        
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [userProfile]);

  // Load published courses list with real-time sync
  useEffect(() => {
    if (authChecking) return;
    setLoading(true);
    const q = query(
      collection(db, 'courses'), 
      where('publish_status', '==', 'Published')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d,
            // Bidirectional map compatibility
            skill: d.skill || (d.category?.toLowerCase().includes('web') ? 'web' : d.category?.toLowerCase().includes('film') ? 'film' : d.category?.toLowerCase().includes('image') ? 'image' : 'web'),
            tier: d.tier || (d.level?.toLowerCase() === 'beginner' ? 'beginner' : d.level?.toLowerCase() === 'advanced' ? 'advanced' : d.level?.toLowerCase() === 'masterclass' ? 'masterclass' : 'beginner'),
            status: d.status || (d.publish_status === 'Published' ? 'published' : 'draft'),
            days: (d.days || []).map((day: any, dIdx: number) => ({
              dayNumber: dIdx + 1,
              title: day.title || `Day ${dIdx + 1}: Study Module`,
              description: day.description || '',
              assignment: day.assignment || { prompt: '', dueNote: '' },
              videos: (day.videos || []).map((v: any) => ({
                id: v.id || `${dIdx}-${Math.random().toString(36).substring(2,6)}`,
                title: v.title || '',
                video_url: v.video_url || v.url || '',
                url: v.url || v.video_url || '',
                duration: v.duration || '10 min',
                description: v.description || '',
                resources: v.resources || '',
                checkType: v.checkType || 'none',
                check: v.check || null,
                funFact: v.funFact || null
              }))
            }))
          } as Course;
        });
        
        data.sort((a, b) => {
          // Normalize Firestore Timestamp vs JS Date strings for sorting
          const getMills = (fieldVal: any) => {
            if (!fieldVal) return 0;
            if (typeof fieldVal.toDate === 'function') {
              return fieldVal.toDate().getTime();
            }
            return new Date(fieldVal).getTime() || 0;
          };
          return getMills(b.createdAt) - getMills(a.createdAt);
        });

        setCourses(data);
      } catch (error) {
        console.error("Error formatting snapshot courses:", error);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'courses');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authChecking]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;
    setProfileSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        fullName: userProfile.fullName,
        whatsapp: userProfile.whatsapp,
        state: userProfile.state,
        goal: userProfile.goal,
        updatedAt: serverTimestamp()
      });
      setEditingProfile(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error(error);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('ciya_cached_user');
    localStorage.removeItem('ciya_cached_profile');
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
  };

  const isGuest = !currentUser || !userProfile;

  if (authChecking) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans font-semibold text-slate-500 text-sm">Validating Authorization Credentials...</div>;
  }
  if (!userProfile && currentUser) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans font-semibold text-slate-500 text-sm">Retrieving Student Profile...</div>;
  }

  const approvalStatus = userProfile?.approvalStatus || 'Pending';
  const isApproved = approvalStatus === 'Approved';
  const isPending = approvalStatus === 'Pending';
  const isDisapproved = approvalStatus === 'Disapproved';

  // Apply Skill tags sorting filters & locking courses visibility logic (locked courses only visible to admins)
  const filteredCourses = courses.filter(c => {
    if (activeSkillFilter !== 'all' && c.skill !== activeSkillFilter) return false;
    const isCourseLocked = c.isLocked || c.locked;
    if (isCourseLocked && !isAdmin) {
      return false;
    }
    return true;
  });
  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  // Master Full-Screen Gating Page for Unapproved or Locked Users (No dashboard UI visible)
  if (!isGuest && userProfile?.isDashboardUnlocked !== true) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-sans">
        {(!liveCheckComplete && !isApproved) ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-600 text-sm font-extrabold tracking-tight">Verifying credentials and parameters...</p>
          </div>
        ) : isPending ? (
          <div className="max-w-xl w-full bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-100 text-center space-y-6">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100 mx-auto">
              <Clock className="w-8 h-8 text-amber-500 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Application Selected & Pending Review 📋</h2>
            
            <div className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto space-y-3 font-medium">
              <p>
                Hello <strong className="text-slate-800 font-bold">{userProfile.fullName || 'Student'}</strong>! Thank you for lodging your request. Your onboarding metrics are currently under verification.
              </p>
              <p className="italic text-xs text-slate-500">
                Keep eye contact with your personal inbox because once checked, notification pathways automatically transmit the link. Checking junk mail ensures zero latency!
              </p>
            </div>

            <div className="w-full">
              <SubmissionDetailsCard profile={userProfile} />
            </div>

            <div className="pt-2">
              <button 
                onClick={handleLogout} 
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl text-xs transition-colors border-0 cursor-pointer"
              >
                Sign Out / Switch Account
              </button>
            </div>
          </div>
        ) : isDisapproved ? (
          <div className="max-w-xl w-full bg-white rounded-3xl p-8 md:p-12 border border-slate-100 text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center border border-red-100 mx-auto">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Application Reviewed ❌</h2>
            
            <p className="text-slate-600 text-sm leading-relaxed max-w-sm mx-auto font-medium">
              Hello <strong>{userProfile.fullName || 'Student'}</strong>! After reviewing your submitted metrics, we regret to notify that you were not chosen for this specific cohort. We received a massive scale of CIYA Five days Free Website Development Training requests. We wish you rapid career velocity!
            </p>

            <div className="w-full">
              <SubmissionDetailsCard profile={userProfile} />
            </div>

            <div className="pt-2">
              <button 
                onClick={handleLogout} 
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl text-xs transition-colors border-0 cursor-pointer"
              >
                Sign Out / Switch Account
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-xl w-full bg-white rounded-3xl p-8 md:p-12 shadow-2xl border border-slate-100 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-amber-400 via-emerald-500 to-indigo-600"></div>
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100 mx-auto">
              <Lock className="w-8 h-8 text-amber-500 animate-bounce" />
            </div>
            <div className="space-y-4">
              <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-black uppercase px-3 py-1 rounded-full">
                Training Verification Approved! 🎉
              </span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Enter Your Access Activation Code 🔑</h2>
              <p className="text-slate-950 text-base leading-relaxed max-w-md mx-auto font-black">
                Congratulations, <strong className="text-teal-800 font-black decoration-teal-600/30 underline decoration-2">{userProfile.fullName || 'Scholar'}</strong>! Your spot for CIYA Five days Free Website Development Training has been approved by the administrators. 
                Please enter your unique <strong className="text-indigo-800 font-black decoration-indigo-600/30 underline decoration-2">activation code (e.g., CIYA-854473)</strong> below to unlock your course learning dashboard.
              </p>
            </div>

            <div className="max-w-sm mx-auto space-y-4">
              <input 
                type="text"
                placeholder="CIYA-XXXXXX"
                value={activationCode}
                onChange={(e) => {
                  setActivationError('');
                  setActivationCode(e.target.value.toUpperCase());
                }}
                className="w-full text-center tracking-widest font-mono font-black text-lg border-2 border-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white placeholder:text-slate-400 text-slate-950 rounded-2xl py-3.5 px-4 outline-none transition-all shadow-md"
              />

              {activationError && (
                <p className="text-rose-600 text-xs font-semibold leading-relaxed">{activationError}</p>
              )}

              <button 
                onClick={handleVerifyCode}
                disabled={unlocking}
                className="w-full py-4 px-4 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-2xl text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
              >
                {unlocking ? 'Verifying...' : 'Unlock Dashboard 🚀'}
              </button>
            </div>

            <div className="border-t border-slate-100 pt-5 text-center">
              <p className="text-slate-800 text-sm leading-relaxed font-semibold">
                <strong>Need help finding your code?</strong><br/>
                Once approved, your admissions administrator will issue your unique training code. Click below to request it directly on WhatsApp.
              </p>
              <div className="mt-3">
                {(() => {
                  const reqMsg = `Hello Admission Team! My CIYA Free Website Development Training profile has been approved. Could you please send me my custom Dashboard Activation Code for my studies? My name is ${userProfile.fullName || ''} (${userProfile.email || currentUser?.email || ''}).`;
                  const whatsappUrl = `https://api.whatsapp.com/send?phone=2349153846786&text=${encodeURIComponent(reqMsg)}`;
                  return (
                    <a 
                      href={whatsappUrl}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all gap-2 items-center cursor-pointer border-0"
                    >
                      <MessageCircle className="w-4 h-4 fill-white stroke-[3px] text-emerald-600" />
                      <span>Request Code on WhatsApp</span>
                    </a>
                  );
                })()}
              </div>
              <div className="mt-4 pt-2 text-center">
                <button 
                  onClick={handleLogout} 
                  className="text-slate-700 hover:text-slate-900 font-bold text-xs transition-colors bg-transparent border-0 cursor-pointer"
                >
                  Sign Out / Switch Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-x-hidden">
      {showCongratsPopup && <FallingFlowers />}
      
      {/* Mobile Sidebar overlay toggle */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-45 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar navigation */}
      <aside className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex flex-col gap-1 relative">
          <Link to="/" className="hover:opacity-85 transition-opacity">
            <BrandingLogo size="sm" />
          </Link>
          <span className="text-[9px] font-black tracking-[0.25em] text-teal-400 uppercase leading-none mt-1 pl-3">
            Academy Portal
          </span>
          <button 
            className="absolute top-6 right-6 md:hidden text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 mt-5 text-xs font-bold">
          <button 
            type="button"
            onClick={() => { handleViewChange('courses'); setSelectedCourseId(null); setIsMobileMenuOpen(false); }}
            className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl transition-all border-0 cursor-pointer ${currentView === 'courses' ? 'bg-teal-600 text-white font-black shadow-sm' : 'text-slate-400 bg-transparent hover:bg-slate-800/60 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <Compass className="w-4 h-4" />
              <span>Explore Curriculum</span>
            </div>
            {!isAdmin && appSettings?.lockedSections?.courses && (
              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
          </button>

          <button 
            type="button"
            onClick={() => { handleViewChange('prompts'); setSelectedCourseId(null); setIsMobileMenuOpen(false); }}
            className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl transition-all border-0 cursor-pointer ${currentView === 'prompts' ? 'bg-teal-600 text-white font-black shadow-sm' : 'text-slate-400 bg-transparent hover:bg-slate-800/60 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Prompt Generator</span>
            </div>
            {!isAdmin && appSettings?.lockedSections?.prompts && (
              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
          </button>
          {!isGuest && (
            <button 
              type="button"
              onClick={() => { handleViewChange('profile'); setIsMobileMenuOpen(false); }}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all border-0 cursor-pointer ${currentView === 'profile' ? 'bg-teal-600 text-white font-black shadow-sm' : 'text-slate-400 bg-transparent hover:bg-slate-800/60 hover:text-white'}`}
            >
              <UserIcon className="w-4 h-4" />
              My Profile Settings
            </button>
          )}
          {isAdmin && (
            <Link 
              to="/admin" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all border border-amber-500/10 hover:border-amber-500/20 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 text-xs font-black no-underline"
            >
              <span className="w-4 h-4 flex items-center justify-center">💻</span>
              Admin Control Panel
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800 mb-2 font-bold text-xs">
          {isGuest ? (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-teal-300 bg-teal-500/10 hover:bg-teal-500/15 transition-all text-xs font-black cursor-pointer border border-teal-500/20 text-left outline-none"
            >
              <UserIcon className="w-4 h-4 text-teal-400" />
              Sign In with Google
            </button>
          ) : (
            <>
              <p className="text-[10px] font-mono font-semibold text-slate-400 px-3 py-1.5 truncate">
                {currentUser?.email}
              </p>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 bg-transparent border-0 text-left hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-stretch h-screen overflow-hidden bg-slate-50/50">
        <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden text-slate-500 hover:text-slate-700 cursor-pointer bg-transparent border-0" 
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base md:text-lg font-black text-slate-800 tracking-tight">
              {currentView === 'courses' 
                ? 'CIYA Learning Arena' 
                : currentView === 'profile' 
                  ? 'My Student Profile' 
                  : 'Prompt Generator Lab'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
             {isGuest ? (
               <button 
                 onClick={handleLogin} 
                 className="text-xs font-black text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-5 py-2.5 rounded-full border-none cursor-pointer flex items-center gap-1.5 transition-colors"
               >
                 <UserIcon className="w-3.5 h-3.5" />
                 Sign In
               </button>
             ) : (
               <button 
                 onClick={handleLogout} 
                 className="text-xs font-bold text-slate-500 hover:text-slate-800 border-0 bg-transparent cursor-pointer"
               >
                 Sign out
               </button>
             )}
          </div>
        </header>
        
        {/* Core content scroll container */}
        <div className="flex-1 overflow-auto p-6 md:p-8">
          {currentView === 'prompts' ? (
            <PromptGenerator isLocked={!isAdmin && appSettings?.lockedSections?.prompts} />
          ) : currentView === 'profile' ? (
            <div className="bg-white border text-sm border-slate-200 rounded-3xl p-6 md:p-8 max-w-2xl mx-auto shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-800">Profile Settings</h3>
                {!editingProfile && (
                  <button 
                    onClick={() => setEditingProfile(true)}
                    className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-extrabold bg-teal-50 px-4 py-2 border-0 rounded-full cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                )}
              </div>
              
              {editingProfile ? (
                 <form onSubmit={handleProfileSave} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Full Name</label>
                        <input type="text" value={userProfile.fullName || ''} onChange={e => setUserProfile({...userProfile, fullName: e.target.value})} className="w-full bg-white text-slate-950 border border-slate-300 shadow-sm rounded-lg p-3 outline-none text-xs font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans" required />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">WhatsApp Number</label>
                        <input type="tel" value={userProfile.whatsapp || ''} onChange={e => setUserProfile({...userProfile, whatsapp: e.target.value})} className="w-full bg-white text-slate-950 border border-slate-300 shadow-sm rounded-lg p-3 outline-none text-xs font-bold font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" required />
                      </div>
                    </div>
                    <div className="text-xs">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">State</label>
                      <input type="text" value={userProfile.state || ''} onChange={e => setUserProfile({...userProfile, state: e.target.value})} className="w-full bg-white text-slate-950 border border-slate-300 shadow-sm rounded-lg p-3 outline-none text-xs font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" required />
                    </div>
                    <div className="text-xs">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Your Primary Goal</label>
                      <textarea value={userProfile.goal || ''} onChange={e => setUserProfile({...userProfile, goal: e.target.value})} className="w-full bg-white text-slate-950 border border-slate-300 shadow-sm rounded-lg p-3 outline-none text-xs font-medium leading-relaxed min-h-[100px] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" required />
                    </div>
                    <div className="flex gap-3 pt-2 text-xs">
                      <button type="submit" disabled={profileSaving} className="flex-1 bg-teal-600 text-white font-extrabold py-3 border-0 rounded-xl hover:bg-teal-700 cursor-pointer flex items-center justify-center gap-1.5 shadow-md">
                        {profileSaving ? 'Saving...' : <><Save className="w-4 h-4"/> Save Changes</>}
                      </button>
                      <button type="button" onClick={() => setEditingProfile(false)} disabled={profileSaving} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 border-0 rounded-xl hover:bg-slate-200 cursor-pointer">
                        Cancel
                      </button>
                    </div>
                 </form>
              ) : (
                <div className="space-y-6 text-xs md:text-sm text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <p className="text-slate-400 font-bold text-[10px] uppercase mb-0.5">Full Name</p>
                      <p className="text-slate-800 font-extrabold text-base">{userProfile.fullName || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold text-[10px] uppercase mb-0.5">WhatsApp</p>
                      <p className="text-slate-800 font-extrabold text-base font-mono">{userProfile.whatsapp || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold text-[10px] uppercase mb-0.5">State</p>
                      <p className="text-slate-800 font-bold">{userProfile.state || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold text-[10px] uppercase mb-0.5">Email</p>
                      <p className="text-slate-800 font-mono font-semibold">{userProfile.email || currentUser?.email}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-slate-400 font-bold text-[10px] uppercase mb-0.5">My Learning Goal</p>
                      <p className="text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border italic mt-1 font-medium">{userProfile.goal || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="sm:col-span-2 pt-6 border-t border-slate-100">
                    <SubmissionDetailsCard profile={userProfile} />
                  </div>

                  {/* Quizzes and Checks Score Sheet */}
                  <div className="sm:col-span-2 pt-6 border-t border-slate-100 text-left">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg">📊</span>
                      <div>
                        <h3 className="font-extrabold text-slate-850 text-xs tracking-tight uppercase tracking-wider text-indigo-700">Course Quizzes Score Sheet</h3>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                          Your first-attempt scores are locked in your profile. Click 'Reset Progress' below to start fresh.
                        </p>
                      </div>
                    </div>

                    {courses.some(c => userProfile.progress?.[c.id || '']?.quizScores) ? (
                      <div className="space-y-4">
                        {courses.map(course => {
                          const courseId = course.id || '';
                          const cScores = userProfile.progress?.[courseId]?.quizScores || {};
                          if (Object.keys(cScores).length === 0) return null;

                          return (
                            <div key={courseId} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left">
                              <div className="flex items-center justify-between border-b pb-2 mb-3">
                                <span className="font-extrabold text-xs text-slate-900">📚 {course.title}</span>
                                <button
                                  type="button"
                                  onClick={() => handleResetProgress(courseId)}
                                  className="text-[10px] font-black text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-0.75 rounded-md border-0 uppercase cursor-pointer transition-colors"
                                >
                                  Reset Progress & Scores
                                </button>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left text-slate-500 font-semibold">
                                  <thead className="text-[9px] uppercase font-black tracking-wider text-slate-400 bg-white border border-slate-200">
                                    <tr>
                                      <th className="px-3 py-2">Day/Lesson</th>
                                      <th className="px-3 py-2 text-center">First Attempt Score</th>
                                      <th className="px-3 py-2 text-center">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white border-x border-b border-slate-200">
                                    {Object.entries(cScores).map(([key, dataVal]: [string, any]) => {
                                      const [diStr, viStr] = key.split('-');
                                      const dIdx = parseInt(diStr);
                                      const vIdx = parseInt(viStr);
                                      const dayObj = course.days?.[dIdx];
                                      const lessonVideo = dayObj?.videos?.[vIdx];
                                      const label = lessonVideo?.title ? `Day ${dIdx+1} - ${lessonVideo.title}` : `Day ${dIdx+1} - Lesson ${vIdx+1}`;
                                      const passed = dataVal.passed;
                                      
                                      return (
                                        <tr key={key} className="hover:bg-slate-50">
                                          <td className="px-3 py-2.5 font-bold text-slate-800 truncate max-w-[200px]" title={label}>{label}</td>
                                          <td className="px-3 py-2.5 text-center font-bold text-slate-900 font-mono">
                                            {dataVal.score}%
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                              passed 
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                            }`}>
                                              {passed ? 'PASSED (>=80%)' : 'RETAKE REQUIRED'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                        <span className="text-2xl block mb-1">📋</span>
                        <p className="text-xs text-slate-400 font-semibold leading-relaxed">No quiz or knowledge checks submitted on your profile yet. Answer checks inside lessons to view your reports!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : !isAdmin && appSettings?.lockedSections?.courses ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm my-6 font-sans">
              <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">CIYA Learning Arena Locked</h3>
              <p className="text-slate-500 mt-3 text-sm leading-relaxed font-semibold">
                The main curriculum and learning arena are temporarily locked by the course administrators. Unlocks are periodically timed with training syllabus parameters and live cohorts schedules. Please reach out to your instructor for detail coordinates.
              </p>
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center items-center gap-2 text-xs text-slate-400 font-bold">
                <span>🛡️ CIYA Guarded Academy Portal</span>
              </div>
            </div>
          ) : (
            <>
              {selectedCourseId && selectedCourse ? (
                <CourseViewer 
                  course={selectedCourse}
                  userProfile={userProfile}
                  currentUser={currentUser}
                  onBack={() => setSelectedCourseId(null)}
                  showToast={showToast}
                  handleResetProgress={handleResetProgress}
                  isAdmin={isAdmin}
                />
              ) : (
                <div className="space-y-8">
                  {/* Glowing Approved welcome banner or Guest view */}
                  {isGuest ? (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="relative overflow-hidden bg-gradient-to-r from-teal-900 via-teal-850 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-teal-900/10 border border-teal-500/20 text-left"
                    >
                      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 animate-pulse" />
                      
                      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2">
                          <span className="inline-block bg-amber-500 text-teal-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                            CIYA GUEST SPECTATOR MODE 👁️
                          </span>
                          <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight">
                            Explore Nigeria's Premium AI Training Catalog
                          </h1>
                          <p className="text-xs text-teal-100 opacity-90 leading-relaxed max-w-2xl font-medium">
                            You are currently exploring CIYA's training curriculum as a guest. General information is visible below, but training materials (quizzes, videos, submission options) are inaccessible until you are signed in.
                          </p>
                        </div>
                        
                        <button 
                          onClick={handleLogin}
                          className="shrink-0 flex items-center gap-2 px-6 py-3.5 bg-amber-505 hover:bg-amber-400 text-teal-950 font-extrabold rounded-2xl shadow-lg hover:-translate-y-0.5 transition-all text-xs cursor-pointer border-0"
                          style={{ backgroundColor: '#f59e0b' }}
                        >
                          <UserIcon className="w-4 h-4" />
                          Sign In with Google
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="relative overflow-hidden bg-gradient-to-r from-teal-500 via-emerald-600 to-indigo-600 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-teal-900/10 border border-teal-400/25 text-left"
                    >
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />
                      
                      <div className="relative z-10 flex flex-col md:flex-row items-center gap-5">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/25 shrink-0 select-none font-bold">
                          🎓
                        </div>
                        <div className="space-y-1">
                          <span className="inline-block bg-emerald-400/25 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1">
                            TRAINING VERIFIED & APPROVED 🎉
                          </span>
                          <h1 className="text-lg md:text-xl font-black tracking-tight">
                            Congratulations on your selection, {userProfile?.fullName || 'Scholar'}!
                          </h1>
                          <p className="text-xs text-teal-50 opacity-90 leading-relaxed max-w-2xl font-medium">
                            You have unrestricted, free premium access to all active CIYA Academy daily curriculums below. Embark on systematic lessons, evaluate code, clear checkpoints, and hand in assignments directly to certified coaches!
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-4 text-left">
                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        onClick={() => setActiveSkillFilter("all")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          activeSkillFilter === "all"
                            ? "border-teal-600 bg-teal-50 text-teal-700 font-extrabold"
                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        All Tracks in Catalog
                      </button>
                      {Object.entries(SKILLS).map(([k, v]) => (
                        <button
                          key={k}
                          onClick={() => setActiveSkillFilter(k)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            activeSkillFilter === k
                              ? "border-teal-600 bg-teal-50 text-teal-700 font-extrabold"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {v.icon} {v.label}
                        </button>
                      ))}
                    </div>

                    {loading ? (
                      <div className="flex items-center justify-center py-20 bg-white rounded-3xl border">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : filteredCourses.length === 0 ? (
                      <div className="text-center py-16 bg-slate-50 border border-slate-200/60 rounded-3xl">
                        <span className="text-3xl block mb-2 select-none">🎓</span>
                        <h4 className="text-sm font-black text-slate-800">No Premium Curriculum Paths Assigned Yet</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-semibold">Assigned active tracks to your student profile will reveal here shortly.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {filteredCourses.map(course => (
                          <CourseCard 
                            key={course.id} 
                            course={course} 
                            isLocked={isAdmin ? false : (isGuest || course.isLocked || course.locked)} 
                            onSelect={() => {
                              if (isAdmin) {
                                setSelectedCourseId(course.id || null);
                              } else if (isGuest) {
                                alert("This premium curriculum is locked! Please Sign In with Google to unlock access to mini-videos, study materials, live assignments and certificate tracking.");
                                handleLogin();
                              } else if (course.isLocked || course.locked) {
                                alert("This course is currently locked by the administrator. Please contact your instructor to unlock it.");
                              } else {
                                setSelectedCourseId(course.id || null);
                              }
                            }} 
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* BEAUTIFUL ANNOUNCEMENT / COUNTDOWN BANNER OF THE TRAINING BEGINNING SOON */}
                  <div className="space-y-8 text-left pt-6 border-t border-slate-200">
                    <motion.section 
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-3xl p-8 md:p-12 border-2 border-indigo-500/40 shadow-2xl shadow-indigo-950/50"
                    >
                      {/* Decorative glowing backdrops */}
                      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24" />
                      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -ml-24 -mb-24 animate-pulse" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
                      
                      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto space-y-6 md:space-y-8">
                        
                        {/* Info details column centered */}
                        <div className="space-y-5 text-center">
                          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-indigo-500/15 border-2 border-indigo-400/30 text-indigo-200 font-extrabold text-[10.5px] uppercase tracking-wider shadow-inner">
                            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                            Launch Sequence Active
                          </div>
                          
                          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-indigo-100 to-teal-200 bg-clip-text text-transparent font-sans">
                            System Training Beginning Soon
                          </h2>

                          <p className="font-mono text-xs md:text-sm font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 inline-flex items-center gap-1.5 shadow-sm">
                            ⏰ Countdown to June 22, 2026 
                          </p>
                          
                          <p className="text-xs md:text-sm text-slate-350 leading-relaxed font-bold max-w-2xl mx-auto text-slate-200">
                            Preparation checks are underway. Certified tech coaches are finalising and reviewing your personalized curriculum tracks, milestones checks, and interactive walkthrough modules.
                          </p>

                          {/* Beautiful Dynamic Real-Time Countdown Timer */}
                          <div className="pt-2">
                            <TrainingCountdown targetDateStr="2026-06-22T00:00:00" />
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 text-xs">
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2.5">
                              <span className="text-emerald-400 select-none font-bold text-sm">✓</span>
                              <span className="font-extrabold text-slate-200">Student Profile Verified</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2.5">
                              <span className="text-teal-300 select-none font-bold text-sm">✦</span>
                              <span className="font-extrabold text-slate-200">Track Prerequisites Loaded</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2.5">
                              <span className="text-indigo-300 select-none font-bold text-sm">📡</span>
                              <span className="font-extrabold text-slate-200">Synchronizer Active</span>
                            </div>
                          </div>
                        </div>

                        {/* Animated progress bar, with timer details unified */}
                        <div className="w-full max-w-md mx-auto pt-3">
                          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden p-[1px] border border-white/5 shadow-inner">
                            <motion.div 
                              initial={{ width: "0%" }}
                              animate={{ width: "95%" }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className="bg-gradient-to-r from-teal-400 via-indigo-400 to-pink-500 h-full rounded-full"
                            />
                          </div>
                          <div className="flex justify-between w-full text-[9.5px] font-extrabold text-slate-400 mt-2">
                            <span>Integration Phase</span>
                            <span className="text-teal-300 font-black">95% Server Ready</span>
                          </div>
                        </div>

                      </div>
                    </motion.section>
                  </div>

                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* CONGRATULATORY OVERLAY MODAL */}
      {showCongratsPopup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 md:p-12 max-w-lg w-full text-center relative border border-slate-100 shadow-2xl overflow-hidden"
          >
            {/* Confetti border banner */}
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-600" />
            
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-emerald-100 shadow-inner select-none text-4xl">
              🎉
            </div>

            <div className="space-y-4">
              <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] uppercase font-black tracking-wider px-3 py-1 rounded-full">
                Training Activated!
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                Congratulations, {userProfile?.fullName ? userProfile.fullName.split(' ')[0] : 'Scholar'}!
              </h2>
              
              <p className="text-slate-600 text-sm leading-relaxed">
                Your admission profile and CIYA Five days Free Website Development Training benefits have been fully verified and activated. We are incredibly excited to welcome you into our intensive training cohort.
              </p>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-left mt-6">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Enrolled Curriculum Pathway:</span>
                <p className="font-extrabold text-slate-800 text-base md:text-lg mt-1 flex items-center gap-2">
                  📚 {userProfile?.recommendedPath || userProfile?.courseType || "Custom Tech Track"}
                </p>
                <p className="text-xs text-slate-500 mt-1 italic">
                  Course access has been fully unlocked. Your curriculum tracks, daily milestones, and training assets are ready in your portal.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={() => setShowCongratsPopup(false)}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-lg rounded-xl transition-all shadow-xl shadow-slate-900/15 cursor-pointer transform active:scale-95 border-0"
              >
                Enter Dashboard 🚀
              </button>
            </div>
          </motion.div>
        </div>
      )}



      {/* Dynamic Toast feedback overlay */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900 border border-slate-800 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 max-w-sm truncate select-none">
          <span>🔔</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
