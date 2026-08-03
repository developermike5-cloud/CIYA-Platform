import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, updateDoc, setDoc, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { invalidateCache } from '../lib/supabase-shim/firestore';
import { db, auth, rtdb, handleFirestoreError, OperationType, isFirestoreNetworkEnabled, safeGetItem } from '../firebase';
import { ref as dbRef, onValue } from 'firebase/database';
import { signOut, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate, Link, useLocation } from 'react-router';
import { Course, CourseDay, CourseVideo } from '../types';
import { Compass, User as UserIcon, BookOpen, LogOut, Lock, Menu, X, CheckCircle, Edit3, Save, Clock, MessageCircle, ArrowLeft, Play, ExternalLink, Sparkles, ChevronDown, ChevronUp, Bell, FileText, Wifi, WifiOff, Award } from 'lucide-react';
import { motion } from 'motion/react';
import BrandingLogo from '../components/BrandingLogo';
import LoginModal from '../components/LoginModal';
import SecureYoutubePlayer from '../components/SecureYoutubePlayer';
import PromptGenerator from '../components/PromptGenerator';
import { StudentBlog } from '../components/StudentBlog';
import AdminKycbQuestionnaire from './admin/AdminKycbQuestionnaire';
import { safeStorage } from '../utils/safeStorage';
import { supabase, getStoragePublicUrl } from '../lib/supabase';
import { uploadToCloudinary } from '../utils/cloudinary';
import { coursesStore } from '../utils/coursesStore';
import { YearBadgePaymentFlow } from './admin/PortalLocksAdmin';
import CIYAMembershipBadge from '../components/CIYAMembershipBadge';
import { verifyTimeBasedCode, getPasscodeSecondsLeft } from '../utils/passcode';
import { FRONTEND_YEAR_BADGE_SETTINGS } from '../constants/badgeSettings';
import { staticLeaderboardData } from '../utils/leaderboardData';
import staticAnnouncements from '../data/announcements.json';

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

const CAROUSEL_BG_PALETTES = [
  "bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border-indigo-900/60",
  "bg-gradient-to-r from-teal-950 via-emerald-950 to-slate-900 border-teal-900/60",
  "bg-gradient-to-r from-purple-950 via-fuchsia-950 to-slate-900 border-purple-900/60",
  "bg-gradient-to-r from-amber-950 via-rose-950 to-slate-900 border-amber-900/60",
  "bg-gradient-to-r from-blue-950 via-cyan-950 to-slate-900 border-blue-900/60",
];

// ==========================================
// ANNOUNCEMENT CAROUSEL CARD (Larger, No Numbers, Placed under registered courses)
// ==========================================
function AnnouncementCarouselCard({ onNavigateTab }: { onNavigateTab?: (tab: string, articleId?: string) => void }) {
  const [announcements, setAnnouncements] = useState<any[]>(() => {
    try {
      const cached = safeStorage.getItem('ciya_cached_announcements');
      return cached ? JSON.parse(cached) : staticAnnouncements;
    } catch {
      return staticAnnouncements;
    }
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'announcements'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.items) && data.items.length > 0) {
          setAnnouncements(data.items);
          safeStorage.setItem('ciya_cached_announcements', JSON.stringify(data.items));
        }
      }
    }, () => {});
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isHovered || announcements.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % announcements.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isHovered, announcements.length]);

  const handleLinkClick = (e: React.MouseEvent, link: string) => {
    if (!link) return;

    const trimmed = link.trim().toLowerCase();

    // Check if link is targeting blog/article
    if (trimmed.includes('/blog') || trimmed === 'blog' || trimmed.startsWith('#blog') || trimmed.includes('blog?')) {
      e.preventDefault();

      let articleId = '';
      if (link.includes('?')) {
        const params = new URLSearchParams(link.split('?')[1]);
        articleId = params.get('id') || params.get('article') || '';
      }

      if (articleId) {
        safeStorage.setItem('ciya_selected_article_id', articleId);
        window.dispatchEvent(new CustomEvent('ciya_navigate_article', { detail: articleId }));
      }

      if (onNavigateTab) {
        onNavigateTab('blog', articleId);
      } else {
        window.dispatchEvent(new CustomEvent('ciya_switch_tab', { detail: 'blog' }));
      }
      return;
    }

    // Check if link is targeting courses
    if (trimmed.includes('/courses') || trimmed === 'courses' || trimmed.startsWith('#courses')) {
      e.preventDefault();
      if (onNavigateTab) {
        onNavigateTab('courses');
      } else {
        window.dispatchEvent(new CustomEvent('ciya_switch_tab', { detail: 'courses' }));
      }
      return;
    }

    // Check if link is targeting prompts
    if (trimmed.includes('/prompts') || trimmed === 'prompts' || trimmed.startsWith('#prompts')) {
      e.preventDefault();
      if (onNavigateTab) {
        onNavigateTab('prompts');
      } else {
        window.dispatchEvent(new CustomEvent('ciya_switch_tab', { detail: 'prompts' }));
      }
      return;
    }

    // Relative links or same host
    if (link.startsWith('/') || link.startsWith('#')) {
      e.preventDefault();
      if (link.includes('blog')) {
        if (onNavigateTab) onNavigateTab('blog');
        else window.dispatchEvent(new CustomEvent('ciya_switch_tab', { detail: 'blog' }));
      } else {
        window.location.href = link;
      }
    }
  };

  return (
    <div 
      className="relative overflow-hidden rounded-3xl border border-slate-800 shadow-2xl text-white my-6 text-left"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sliding Track for Moving Carousel */}
      <div 
        className="flex transition-transform duration-700 ease-in-out w-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {announcements.map((ann, idx) => {
          const bgClass = CAROUSEL_BG_PALETTES[idx % CAROUSEL_BG_PALETTES.length];
          return (
            <div 
              key={ann.id || idx}
              className={`w-full shrink-0 p-6 sm:p-7 md:p-8 flex flex-col justify-between ${bgClass}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
                  <span className="px-3 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider shrink-0 self-start sm:self-auto shadow-xs">
                    📢 {ann.category || 'Announcement'}
                  </span>
                  <p className="text-sm sm:text-base md:text-lg font-black text-slate-100 leading-snug">
                    {ann.title}
                  </p>
                </div>

                {ann.link && (
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                    <a
                      href={ann.link}
                      onClick={(e) => handleLinkClick(e, ann.link)}
                      className="text-xs font-black uppercase tracking-wider text-amber-300 hover:text-white flex items-center gap-1.5 transition-all bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl border border-white/20 shadow-sm cursor-pointer"
                    >
                      <span>Read Article →</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Slider Dots Indicator */}
              {announcements.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-4 mt-4 border-t border-white/10">
                  {announcements.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      type="button"
                      onClick={() => setCurrentIndex(dotIdx)}
                      className={`h-1.5 rounded-full transition-all border-0 cursor-pointer ${
                        dotIdx === currentIndex ? 'w-6 bg-amber-400' : 'w-1.5 bg-white/30 hover:bg-white/60'
                      }`}
                      title={`Slide ${dotIdx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// COURSE LEVEL FILTER BAR
// ==========================================
function CourseLevelFilterBar({
  courseLevelFilter,
  setCourseLevelFilter
}: {
  courseLevelFilter: 'beginner' | 'advanced';
  setCourseLevelFilter: (lvl: 'beginner' | 'advanced') => void;
}) {
  return (
    <div className="flex items-center justify-between bg-slate-50 p-2.5 px-4 rounded-xl border border-slate-200/70">
      <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
        <span>📚</span> Syllabus Level:
      </span>

      <select
        value={courseLevelFilter}
        onChange={(e) => {
          const val = e.target.value as 'beginner' | 'advanced';
          setCourseLevelFilter(val);
          safeStorage.setItem('ciya_course_level_filter', val);
        }}
        className="bg-white border border-slate-300 text-xs font-black text-slate-800 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer uppercase tracking-wider select-none appearance-none pr-7 shadow-xs"
        style={{
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          backgroundSize: '12px',
        }}
      >
        <option value="beginner">Beginner's Course</option>
        <option value="advanced">Advance Course</option>
      </select>
    </div>
  );
}

function CategoryBannerCarousel({
  courseLevelFilter,
  setCourseLevelFilter
}: {
  activeSkillFilter?: string;
  setActiveSkillFilter?: (skill: string) => void;
  courseLevelFilter: 'beginner' | 'advanced';
  setCourseLevelFilter: (lvl: 'beginner' | 'advanced') => void;
}) {
  return (
    <CourseLevelFilterBar
      courseLevelFilter={courseLevelFilter}
      setCourseLevelFilter={setCourseLevelFilter}
    />
  );
}

// ==========================================
// OPTION A ADVANCED CLASS PASSCODE VALIDATOR
// ==========================================
function AdvancedCoursePasscodeSection({
  secret,
  onVerifySuccess,
  whatsappNumber,
  courseTitle,
  price,
  userEmail
}: {
  secret: string;
  onVerifySuccess: () => void;
  whatsappNumber: string;
  courseTitle: string;
  price: number;
  userEmail: string;
}) {
  const [passcodeVal, setPasscodeVal] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePasscodeVerify = () => {
    setErrorMsg(null);
    if (!passcodeVal || passcodeVal.length !== 6) {
      setErrorMsg("Please enter a valid 6-digit passcode.");
      return;
    }

    const isValid = verifyTimeBasedCode(passcodeVal, secret);
    if (isValid) {
      onVerifySuccess();
    } else {
      setErrorMsg("Invalid access code or passcode and check with admin support.");
    }
  };

  const cleanWaNumber = whatsappNumber.replace(/[^0-9\+]/g, '');
  const waPreFilledText = `Hello CIYA Admin, I have completed the direct interbank payment of ₦${price.toLocaleString()} for the advanced class course: "${courseTitle}". Please send me the active 6-digit passcode. My registered email is: ${userEmail}`;
  const waLink = `https://wa.me/${cleanWaNumber.replace('+', '')}?text=${encodeURIComponent(waPreFilledText)}`;

  return (
    <div className="space-y-4 pt-3 border-t border-slate-100 text-slate-800">
      <div className="space-y-1 text-center">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
          🔑 Advanced Course Verification
        </h4>
        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
          Enter the tuition access code or passcode below to unlock your premium classroom.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-black text-slate-755 uppercase tracking-wide">
          Enter 6-Digit Verification Code
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            maxLength={6}
            value={passcodeVal}
            onChange={(e) => {
              setPasscodeVal(e.target.value.replace(/[^0-9]/g, ''));
              setErrorMsg(null);
            }}
            placeholder="e.g. 123456"
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold font-mono tracking-widest text-center rounded-xl p-3 outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button
            type="button"
            onClick={handlePasscodeVerify}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs uppercase rounded-xl border-0 cursor-pointer shadow-lg select-none"
          >
            Unlock
          </button>
        </div>
        {errorMsg && (
          <p className="text-[10px] font-bold text-rose-500 animate-pulse text-center">
            {errorMsg}
          </p>
        )}
      </div>

      <div className="pt-2">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase rounded-xl tracking-wider shadow-md text-center inline-block no-underline border-0 transition-all cursor-pointer select-none"
        >
          💬 Message Admin Receipt on WhatsApp
        </a>
        <p className="text-[9px] text-slate-400 font-medium text-center mt-2 leading-relaxed">
          Instantly message the instructor with your transfer screenshot on WhatsApp to request your 6-digit active classroom passcode.
        </p>
      </div>
    </div>
  );
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

// Helper to parse URLs in text and render them as clickable anchor tags
function renderClickableLinks(text: string) {
  if (!text) return null;
  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a 
          key={i} 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-teal-600 hover:text-teal-800 underline break-all font-bold"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

// Assignment submission Form Card
interface AssignmentProps {
  assignment?: { prompt: string; dueNote: string };
  dayIndex: number;
  submissions: Record<string, { text: string; link: string; submittedAt: string }>;
  onSubmit: (key: string, data: { text: string; link: string; submittedAt: string }) => void;
  courseId?: string;
}

function AssignmentPanel({ assignment, dayIndex, courseId }: AssignmentProps) {
  const navigate = useNavigate();
  return (
    <div className="bg-white border-2 border-dashed border-teal-600 rounded-3xl p-6 space-y-4 shadow-sm text-left">
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">📋</span>
        <div>
          <h4 className="font-black text-slate-800 text-sm">Day {dayIndex + 1} End-of-Day Assignment Question</h4>
          {assignment?.dueNote && <p className="text-[10px] uppercase font-bold text-amber-600 mt-0.5">{assignment.dueNote}</p>}
        </div>
      </div>

      <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 p-4 rounded-xl leading-relaxed font-semibold whitespace-pre-wrap">
        {renderClickableLinks(assignment?.prompt || "Execute today's syllabus lessons on your system and log your drafted link below.")}
      </div>

      {/* Direct Link to Submit */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => {
            const path = `/dashboard?view=assignments${courseId ? `&courseId=${courseId}` : ''}&dayIndex=${dayIndex}`;
            navigate(path);
          }}
          className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md transition-all border-0 cursor-pointer text-center"
        >
          Submit this Assignment on Submission Desk 📤
        </button>
      </div>

      {/* Guidance box on how to submit assignment */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-2.5 text-xs text-indigo-950">
        <div className="flex items-center gap-2">
          <span className="text-base">🚀</span>
          <span className="font-extrabold text-indigo-900 uppercase tracking-wider">How to submit your response:</span>
        </div>
        <p className="font-semibold leading-relaxed">
          Please note that assignment submission is no longer done here. To submit your answer, follow these simple steps:
        </p>
        <ol className="list-decimal list-inside space-y-1 font-semibold pl-1">
          <li>Look at the sidebar navigation on the left (on desktop) or the menu navigation (on mobile).</li>
          <li>Click on the <strong className="text-teal-800 underline">"My Assignments"</strong> menu option.</li>
          <li>Select <strong className="text-indigo-900">Day {dayIndex + 1} Assignment</strong> from the dropdown in the Assignment Workspace.</li>
          <li>Paste your live site link/answers and click <strong className="text-indigo-900">"Submit Assignment Proof"</strong>!</li>
        </ol>
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

// Helper to parse badge expiry timestamp safely across formats
export function getBadgeExpiryTimestamp(profile: any): number {
  if (!profile) return 0;
  let exp = profile.badgeExpiryDate;
  if (!exp && profile.badgePurchaseDate) {
    let pDate = profile.badgePurchaseDate;
    if (typeof pDate === 'object' && pDate !== null && typeof pDate.seconds === 'number') {
      pDate = pDate.seconds * 1000;
    } else if (typeof pDate === 'string') {
      pDate = new Date(pDate).getTime();
    }
    exp = (typeof pDate === 'number' && !isNaN(pDate)) ? pDate + 30 * 24 * 60 * 60 * 1000 : 0;
  }
  if (!exp) return 0;

  if (typeof exp === 'object' && exp !== null && typeof exp.seconds === 'number') {
    return exp.seconds * 1000;
  }
  if (typeof exp === 'string') {
    const parsed = new Date(exp).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof exp === 'number') {
    return isNaN(exp) ? 0 : exp;
  }
  return 0;
}

// Helper to determine if a user's Year Badge is active and not expired
export function isBadgeActive(profile: any): boolean {
  if (!profile || !profile.hasYearBadge) return false;
  if (profile.badgeStatus === 'revoked' || profile.badgeStatus === 'expired' || profile.badgeStatus === 'inactive') {
    return false;
  }
  const expiryTs = getBadgeExpiryTimestamp(profile);
  if (expiryTs === 0) return false;
  return Date.now() <= expiryTs;
}

// Unified day level lock validator helper function
function isDayUnlockedUnified(
  di: number,
  days: any[],
  completedKeys: string[],
  dbSubmissions: any[] = [],
  isCloned: boolean = false,
  userProfile?: any,
  courseId?: string,
  appSettings?: any
) {
  // Determine student's existing progress or organic unlocking for this day di
  const hasSubmissionsForThisDay = dbSubmissions.some((sub: any) => sub.dayIndex >= di);
  const dayVideos = days[di]?.videos || [];
  const hasCompletedVideosForThisDay = dayVideos.length > 0 && dayVideos.some((v: any) => completedKeys.includes(v.id || v.youtubeId));
  
  const progressStore = userProfile?.progress?.[courseId || ''] || {};
  const quizScores = progressStore.quizScores || {};
  const hasQuizScoresForThisDay = Object.keys(quizScores).some(key => key.startsWith(`${di}-`));

  const precedingApproved = di > 0 && dbSubmissions.some((sub: any) => sub.dayIndex === di - 1 && sub.status === 'Approved');
  const precedingVideos = di > 0 ? (days[di - 1]?.videos || []) : [];
  const precedingVideosCompleted = di > 0 && precedingVideos.length > 0 && precedingVideos.every((v: any) => completedKeys.includes(v.id || v.youtubeId));
  const precedingQuizScores = di > 0 && Object.keys(quizScores).some(key => key.startsWith(`${di-1}-`));

  const hasActivityOnThisDayOrLater = hasSubmissionsForThisDay || hasCompletedVideosForThisDay || hasQuizScoresForThisDay;
  const completedPrecedingDayOrganically = di === 0 || precedingApproved || precedingVideosCompleted || precedingQuizScores;

  // Exempt students who have active progress or have completed the preceding day's requirements organically from any locks
  const exemptFromLock = hasActivityOnThisDayOrLater || completedPrecedingDayOrganically;

  if (!exemptFromLock) {
    // Check Year Badge requirement on beginner courses
    const isBeginner = ['najnq9llx', 'psw96tm5o', 'qlpspor4hm'].includes(courseId || '');
    if (isBeginner && FRONTEND_YEAR_BADGE_SETTINGS.enabled) {
      const hasBadge = isBadgeActive(userProfile);
      if (FRONTEND_YEAR_BADGE_SETTINGS.requireForDay1 && di >= 0 && !hasBadge) {
        return false; // Day 1 locked for students without badge
      }
      if (FRONTEND_YEAR_BADGE_SETTINGS.requireForDay4 && di >= 3 && !hasBadge) {
        return false; // Day 4 & 5 locked for students without badge
      }
    }

    // Check manual administrative overrides
    if (courseId && appSettings?.courseDaysLocks) {
      const override = appSettings.courseDaysLocks[`${courseId}_day-${di}`];
      if (override === 'locked') {
        return false; // Force locked!
      }
      if (override === 'unlocked') {
        return true; // Force unlocked!
      }
    }

    // Check custom calendar unlock settings
    const dayKey = `day-${di}`;
    const scheduledUnlock = appSettings?.unlockSettings?.[dayKey];
    if (scheduledUnlock && scheduledUnlock.type === 'date_time' && scheduledUnlock.unlockDateTime) {
      const nowStr = new Date().toISOString();
      if (nowStr < scheduledUnlock.unlockDateTime) {
        return false; // Scheduled time not reached yet!
      }
    }
  } else {
    // If they are exempt from lock, but there is an explicit unlock override, respect it
    if (courseId && appSettings?.courseDaysLocks) {
      const override = appSettings.courseDaysLocks[`${courseId}_day-${di}`];
      if (override === 'unlocked') {
        return true;
      }
    }
  }

  // 2. Day index 0 is always unlocked by default
  if (di === 0) return true;

  // 3. For cloned courses, check if preceding lessons are fully completed
  if (isCloned) {
    const precedingDayLessons = days[di - 1]?.videos || [];
    if (precedingDayLessons.length === 0) return true;
    return precedingDayLessons.every((v: any) => completedKeys.includes(v.id || v.youtubeId));
  }

  // 4. Default progression rule: preceding day assignment must be approved
  const precedingApprovedVal = dbSubmissions.some((sub: any) => sub.dayIndex === di - 1 && sub.status === 'Approved');
  return precedingApprovedVal;
}

function YearBadgePaywallCard({
  di,
  unitLabel,
  price,
  currentUser,
  userProfile,
  setUserProfile,
  appSettings,
  onTriggerPurchase
}: {
  di: number;
  unitLabel: string;
  price: number;
  currentUser: any;
  userProfile: any;
  setUserProfile: any;
  appSettings?: any;
  onTriggerPurchase?: () => void;
}) {
  const isPendingApproval = userProfile?.badgePaymentRequestStatus === 'PendingApproval';

  // Handle WhatsApp composition
  const waPhone = FRONTEND_YEAR_BADGE_SETTINGS.whatsappNumber;
  const waCleanPhone = waPhone.replace(/[^0-9+]/g, '');
  const waMessage = encodeURIComponent(
    `Hello Admin! I have made the bank transfer payment for the CIYA Membership Badge. Please verify and approve my account! Registered Email: ${currentUser?.email || userProfile?.email || 'N/A'}, UID: ${currentUser?.uid || ''}`
  );
  const waLink = `https://wa.me/${waCleanPhone}?text=${waMessage}`;

  // Define locked flow - triggers pop-up modal
  return (
    <div className="rounded-3xl border-2 border-indigo-200 bg-indigo-50/5 p-6 md:p-8 text-left space-y-6 shadow-md relative overflow-hidden" id="ciya-membership-badge-locked-card">
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />
      
      <div className="space-y-4">
        <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
          🔒 CIYA Membership Badge Required
        </span>
        <h4 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
          Unlock Elite Day 4 & 5 High-Income Course Content!
        </h4>
        <p className="text-xs md:text-sm text-slate-600 font-semibold leading-relaxed">
          The remaining high-income curriculum days of this cohort are reserved exclusively for certified student members. Get your official CIYA Membership Badge to unlock these lessons immediately.
        </p>

        {/* Perks list */}
        <div className="bg-white p-4 rounded-2xl border border-slate-150 space-y-3">
          <span className="block text-[10px] font-black uppercase text-indigo-700 tracking-wider">What's Unlocked With Your Badge:</span>
          <div className="text-xs font-semibold text-slate-700 leading-relaxed space-y-2">
            {FRONTEND_YEAR_BADGE_SETTINGS.benefitText ? (
              <div className="whitespace-pre-wrap">{FRONTEND_YEAR_BADGE_SETTINGS.benefitText}</div>
            ) : (
              <>
                <p>• Unlocks Day 4 and Day 5 premium core modules</p>
                <p>• Verified Professional CIYA Student Badge</p>
                <p>• Certificate of Completion upon finishing assignments</p>
                <p>• Direct priority 1-on-1 coach assignment review</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="pt-5 border-t border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Investment</span>
          <span className="text-xl font-black text-slate-900">₦{(price || FRONTEND_YEAR_BADGE_SETTINGS.price).toLocaleString()}</span>
        </div>

        <button
          type="button"
          onClick={onTriggerPurchase}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 border-0 text-amber-955 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-2 select-none"
        >
          Get CIYA Membership Badge 🏷️
        </button>
      </div>
    </div>
  );
}

// Unified lesson lock validator helper function
function isLessonUnlockedUnified(
  di: number, 
  vi: number, 
  days: any[], 
  completedKeys: string[], 
  checkPassedKeys: string[],
  dbSubmissions: any[] = [],
  isAdmin: boolean = false,
  isCloned: boolean = false,
  userProfile?: any,
  courseId?: string,
  appSettings?: any
) {
  if (isAdmin) return true;

  // 1. Check if the day di is unlocked on a day-level
  const isDayUnlocked = isDayUnlockedUnified(di, days, completedKeys, dbSubmissions, isCloned, userProfile, courseId, appSettings);
  if (!isDayUnlocked) return false;

  // If quizzes are bypassed globally, return true immediately!
  if (appSettings?.quizzesOverrideMode === 'bypassed') {
    return true;
  }

  // 2. The first lesson of every day should remain unlocked
  if (vi === 0) return true;

  // 3. For any subsequent lesson (vi > 0), they must pass quizzes for preceding lessons on that same day
  const dayItem = days[di];
  if (!dayItem) return true;
  const videosList = dayItem.videos || [];
  
  for (let v = 0; v < vi; v++) {
    const vItem = videosList[v];
    if (!vItem) continue;

    const hasQuiz = vItem.checkType && vItem.checkType !== 'none' && vItem.check;
    if (hasQuiz) {
      const key = `${di}-${v}`;
      const isPassed = checkPassedKeys.includes(key);
      if (!isPassed) {
        return false;
      }
    }
  }

  return true;
}

// Evaluate assignment compliance checks (Character count, Links, Screenshot counts, Keywords)
function evaluateComplianceAndGetStatus(
  assignmentConfig: any,
  submittedText: string,
  fileUrl?: string,
  images: string[] = []
): { status: 'Pending' | 'Approved' | 'Disapproved'; adminReason: string } {
  if (!assignmentConfig || !assignmentConfig.autoApprove) {
    return {
      status: 'Pending',
      adminReason: ''
    };
  }

  const minChars = assignmentConfig.minChars || 0;
  const requireLink = !!assignmentConfig.requireLink;
  const minScreenshots = assignmentConfig.minScreenshots || 0;
  const requiredKeywordsStr = assignmentConfig.requiredKeywords || '';

  const text = submittedText || '';

  // 1. Min character check
  if (minChars && text.length < minChars) {
    return {
      status: 'Disapproved',
      adminReason: `Automated Compliance: Submitted text is too short (${text.length}/${minChars} characters required).`
    };
  }

  // 2. Link check
  if (requireLink) {
    const urlPattern = /https?:\/\/[^\s/$.?#].[^\s]*/i;
    const hasUrl = urlPattern.test(text) || (fileUrl && urlPattern.test(fileUrl));
    if (!hasUrl) {
      return {
        status: 'Disapproved',
        adminReason: "Automated Compliance: Missing a valid reference URL link (http:// or https://)."
      };
    }
  }

  // 3. Screenshots check
  if (minScreenshots && minScreenshots > 0) {
    const totalImages = (images || []).length;
    if (totalImages < minScreenshots) {
      return {
        status: 'Disapproved',
        adminReason: `Automated Compliance: Insufficient screenshots (${totalImages}/${minScreenshots} required).`
      };
    }
  }

  // 4. Keywords check
  if (requiredKeywordsStr && requiredKeywordsStr.trim().length > 0) {
    const keywords = requiredKeywordsStr.split(',').map((k: string) => k.trim().toLowerCase()).filter((k: string) => k.length > 0);
    const textLower = text.toLowerCase();
    const missingKeywords = keywords.filter((kw: string) => !textLower.includes(kw));
    
    if (missingKeywords.length > 0) {
      return {
        status: 'Disapproved',
        adminReason: `Automated Compliance: Missing required keywords: ${missingKeywords.join(', ')}.`
      };
    }
  }

  return {
    status: 'Approved',
    adminReason: "Automatically approved by compliance checker."
  };
}

// Filter out admin-only terms/feedback to keep student facing logs elegant and clean
function getCleanStudentFeedback(sub: any): string | null {
  if (!sub) return null;
  const reason = sub.adminReason;
  const status = sub.status;
  
  if (!reason) {
    if (status === 'Pending') {
      return "Your assignment has been submitted successfully and is currently under review by our certified coaches.";
    }
    return null;
  }
  
  const lower = reason.toLowerCase();
  
  // Hide internal admin statements completely for students
  if (
    lower.includes("timer is active") || 
    lower.includes("automatically approved") || 
    lower.includes("compliance checker") ||
    lower.includes("delay timer")
  ) {
    if (status === 'Pending') {
      return "Your assignment has been submitted successfully and is currently under review by our certified coaches.";
    }
    return null;
  }
  
  // Clean up technical prefixes like "Automated Compliance:"
  let clean = reason.replace(/^Automated Compliance:\s*/i, "");
  
  return clean;
}

// Helper to get next day unlock status description to prevent student confusion regarding scheduled locks
function getNextDayUnlockStatus(nextDayIdx: number, appSettings: any): { isScheduled: boolean; message: string; toast: string } {
  const nextDayKey = `day-${nextDayIdx}`;
  const scheduledUnlock = appSettings?.unlockSettings?.[nextDayKey];
  
  if (scheduledUnlock && scheduledUnlock.type === 'date_time' && scheduledUnlock.unlockDateTime) {
    const nowStr = new Date().toISOString();
    const unlockTime = new Date(scheduledUnlock.unlockDateTime);
    if (nowStr < scheduledUnlock.unlockDateTime) {
      const formattedDate = unlockTime.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      return {
        isScheduled: true,
        message: `Your assignment has been reviewed and approved! Day ${nextDayIdx + 1} is scheduled to unlock on ${formattedDate}.`,
        toast: `Assignment Approved! 🎉 Day ${nextDayIdx + 1} is scheduled to unlock on ${formattedDate}.`
      };
    }
  }
  
  return {
    isScheduled: false,
    message: `Your assignment has been reviewed and approved! Day ${nextDayIdx + 1} is now unlocked.`,
    toast: `Assignment Approved! Day ${nextDayIdx + 1} is now unlocked! 🎉`
  };
}

// Helper to check if student has completed a course (either 100% video progress or passed all quizzes)
function isCourseCompleted(profile: any, course: any): boolean {
  if (!profile || !course) return false;
  const progressStore = profile.progress?.[course.id || ''] || { watched: [], checkPassed: [], submissions: {}, quizScores: {} };
  
  // Durable completion check
  if (progressStore.completedAt) {
    return true;
  }

  // 1. Check video watched count progress ratio
  const completedKeys: string[] = progressStore.watched || [];
  const totalVideos = course.days?.reduce((sum: number, d: any) => sum + (d.videos?.length || 0), 0) || 0;
  const progressRatio = totalVideos > 0 ? Math.round((completedKeys.length / totalVideos) * 100) : 0;
  if (progressRatio === 100 && totalVideos > 0) {
    return true;
  }

  // 2. Check if they have passed all quizzes from Day 1 to Day 5 (which means they passed all quizzes from one to five)
  let passedAllQuizzes = true;
  let hasQuizzes = false;
  const cScores = progressStore.quizScores || {};
  const checkPassedKeys: string[] = progressStore.checkPassed || [];

  (course.days || []).forEach((day: any, di: number) => {
    (day.videos || []).forEach((v: any, vi: number) => {
      const hasQuiz = v.checkType && v.checkType !== 'none' && v.check;
      if (hasQuiz) {
        hasQuizzes = true;
        const checkKey = `${di}-${vi}`;
        const isPassed = checkPassedKeys.includes(checkKey) || !!(cScores[checkKey] && cScores[checkKey].passed);
        if (!isPassed) {
          passedAllQuizzes = false;
        }
      }
    });
  });

  if (hasQuizzes && passedAllQuizzes) {
    return true;
  }

  return false;
}

// Helper to update a course's completedAt timestamp when they first complete it
function checkAndMarkCourseCompleted(profile: any, course: any, currentUser: any, userProfileSetter: any, showToastFn?: any) {
  if (!profile || !course || !currentUser) return profile;
  const courseId = course.id;
  const progressStore = profile.progress?.[courseId];
  if (!progressStore) return profile;

  if (progressStore.completedAt) return profile;

  const isNowCompleted = (() => {
    const completedKeys: string[] = progressStore.watched || [];
    const totalVideos = course.days?.reduce((sum: number, d: any) => sum + (d.videos?.length || 0), 0) || 0;
    const progressRatio = totalVideos > 0 ? Math.round((completedKeys.length / totalVideos) * 100) : 0;
    if (progressRatio === 100 && totalVideos > 0) {
      return true;
    }

    let passedAllQuizzes = true;
    let hasQuizzes = false;
    const cScores = progressStore.quizScores || {};
    const checkPassedKeys: string[] = progressStore.checkPassed || [];

    (course.days || []).forEach((day: any, di: number) => {
      (day.videos || []).forEach((v: any, vi: number) => {
        const hasQuiz = v.checkType && v.checkType !== 'none' && v.check;
        if (hasQuiz) {
          hasQuizzes = true;
          const checkKey = `${di}-${vi}`;
          const isPassed = checkPassedKeys.includes(checkKey) || !!(cScores[checkKey] && cScores[checkKey].passed);
          if (!isPassed) {
            passedAllQuizzes = false;
          }
        }
      });
    });

    return hasQuizzes && passedAllQuizzes;
  })();

  if (isNowCompleted) {
    const completedTime = new Date().toISOString();
    const finalProfile = {
      ...profile,
      progress: {
        ...profile.progress,
        [courseId]: {
          ...progressStore,
          completedAt: completedTime
        }
      }
    };
    
    userProfileSetter(finalProfile);
    safeStorage.setItem('ciya_cached_profile', JSON.stringify(finalProfile));

    const userRef = doc(db, 'users', currentUser.uid);
    updateDoc(userRef, {
      [`progress.${courseId}.completedAt`]: completedTime,
      updatedAt: serverTimestamp()
    }).then(() => {
      if (showToastFn) {
        showToastFn("Congratulations! You have completed the course! 🎉");
      }
    }).catch(e => {
      console.warn("Error updating course completedAt in DB:", e);
    });

    return finalProfile;
  }

  return profile;
}

// Interactive Post-Video Engagement Check popup modal
interface QuizModalProps {
  check: any;
  checkType: 'none' | 'mcq' | 'tf' | 'fact';
  checkKey: string;
  courseId: string;
  currentUser: any;
  userProfile: any;
  setUserProfile?: any;
  onSuccess: () => void;
  onClose: () => void;
  showToast: (msg: string) => void;
  isExpress?: boolean;
}

function QuizModal({ check, checkType, checkKey, courseId, currentUser, userProfile, setUserProfile, onSuccess, onClose, showToast, isExpress = false }: QuizModalProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scorePercentage, setScorePercentage] = useState<number | null>(null);
  const [hasPassed, setHasPassed] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

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

    if (isExpress) {
      // Bypasses storing the score in the user profile document for express courses, but unlocks next parts locally
      if (passesQuiz) {
        showToast(`Quiz completed: ${finalPct}%! 🎉 (Progress not recorded for Express Track)`);
        onSuccess();
      }
      return;
    }

    try {
      const dbScores = userProfile?.progress?.[courseId]?.quizScores || {};
      const existingScoreRecord = dbScores[checkKey];

      // Optimistic update of local userProfile state and safeStorage cache!
      if (setUserProfile) {
        const currentProgress = userProfile?.progress?.[courseId] || {};
        const currentScores = currentProgress.quizScores || {};
        let updatedScores = { ...currentScores };
        
        if (!existingScoreRecord) {
          updatedScores[checkKey] = {
            score: finalPct,
            passed: passesQuiz,
            answeredAt: new Date().toLocaleString(),
            firstAttemptRecorded: true
          };
        } else {
          if (passesQuiz && !existingScoreRecord.passed) {
            updatedScores[checkKey] = {
              ...existingScoreRecord,
              passed: true
            };
          }
        }

        const updatedProfile = {
          ...userProfile,
          progress: {
            ...(userProfile?.progress || {}),
            [courseId]: {
              ...currentProgress,
              quizScores: updatedScores
            }
          }
        };
        setUserProfile(updatedProfile);
        safeStorage.setItem('ciya_cached_profile', JSON.stringify(updatedProfile));
      }

      // Buffer quiz score locally in the localDayProgress buffer in localStorage
      try {
        const activeDayIdx = parseInt(checkKey.split('-')[0]) || 0;
        const stored = localStorage.getItem(`ciya_local_day_progress_${courseId}`);
        const currentLocal = stored ? JSON.parse(stored) : {};
        const dayLocal = currentLocal[activeDayIdx] || { watched: [], checkPassed: [], quizScores: {} };
        
        dayLocal.quizScores = {
          ...(dayLocal.quizScores || {}),
          [checkKey]: {
            score: finalPct,
            passed: passesQuiz,
            answeredAt: new Date().toLocaleString(),
            firstAttemptRecorded: true
          }
        };
        
        currentLocal[activeDayIdx] = dayLocal;
        localStorage.setItem(`ciya_local_day_progress_${courseId}`, JSON.stringify(currentLocal));
        
        if (!existingScoreRecord) {
          showToast(`First Attempt recorded: ${finalPct}%! 🎉 (Progress buffered locally)`);
        } else if (passesQuiz && !existingScoreRecord.passed) {
          showToast(`Module updated as passed! (Progress buffered locally)`);
        }
      } catch (dbErr) {
        console.warn("Database sync deferred (buffered), progress saved to local cache:", dbErr);
        if (!existingScoreRecord) {
          showToast(`First Attempt recorded: ${finalPct}%! 🎉 (Cached Offline)`);
        } else if (passesQuiz && !existingScoreRecord.passed) {
          showToast(`Module updated as passed! (Cached Offline)`);
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

            {/* Leaderboard & First Attempt Warning Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-[11px] text-amber-900 leading-relaxed font-semibold flex items-start gap-2.5">
              <span className="text-sm select-none">⚠️</span>
              <div>
                <strong className="block text-amber-950 font-black mb-0.5">Quiz Attempt Notice:</strong>
                Please take this check seriously. <span className="underline font-black">Only your first attempt score</span> will be recorded and aggregated for the daily Live Leaderboard! High-ranking scholars win prestigious benefits, study discounts, and recruitment support backed by CIYA sponsors.
              </div>
            </div>

            <h4 className="font-black text-slate-950 text-base md:text-lg leading-relaxed">
              {checkType === 'mcq' ? activeQuestion.question : checkType === 'tf' ? activeQuestion.statement : (activeQuestion.headline || 'Read this factsheet:')}
            </h4>

            {checkType === 'mcq' && (
              <div className="space-y-2.5">
                {(activeQuestion.options || []).map((opt: string, optIdx: number) => {
                  const isSelected = selectedAnswers[currentIdx] === optIdx;
                  const isCorrect = activeQuestion.correct === optIdx;
                  
                  let optStyle = "border-slate-300 hover:border-slate-400 hover:bg-slate-50";
                  if (isSelected) {
                    if (showExplanation) {
                      optStyle = "border-rose-500 bg-rose-50 text-rose-950 font-semibold ring-2 ring-rose-400";
                    } else {
                      optStyle = "border-amber-500 bg-amber-100/90 text-slate-950 font-black ring-3 ring-amber-400 shadow-lg scale-[1.02] duration-200";
                    }
                  } else if (showExplanation && isCorrect) {
                    optStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold ring-2 ring-emerald-400";
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => {
                        if (showExplanation) return;
                        setSelectedAnswers({ ...selectedAnswers, [currentIdx]: optIdx });
                      }}
                      className={`w-full text-left p-3.5 border rounded-xl flex gap-3 items-center transition-all cursor-pointer ${optStyle}`}
                    >
                      <span className={`w-5.5 h-5.5 rounded-full border text-[10px] font-black flex items-center justify-center shrink-0 ${
                        isSelected 
                          ? showExplanation ? 'bg-rose-600 border-rose-600 text-white font-black' : 'bg-amber-600 border-amber-600 text-white font-black shadow-sm'
                          : (showExplanation && isCorrect) ? 'bg-emerald-600 border-emerald-600 text-white font-black shadow-sm' : 'bg-slate-100 text-slate-700 font-bold border-slate-300'
                      }`}>
                        {showExplanation && isCorrect ? "✓" : showExplanation && isSelected ? "✕" : ["A", "B", "C", "D"][optIdx]}
                      </span>
                      <span className={`text-xs md:text-sm font-bold ${isSelected ? 'text-slate-950 font-black' : 'text-slate-900'}`}>
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
                  const isCorrect = activeQuestion.answer === v;

                  let optStyle = "border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-900 font-extrabold";
                  if (isSelected) {
                    if (showExplanation) {
                      optStyle = "border-rose-500 bg-rose-50 text-rose-950 font-semibold ring-2 ring-rose-400";
                    } else {
                      optStyle = "border-amber-500 bg-amber-100/90 text-slate-950 font-black ring-3 ring-amber-400 shadow-lg scale-[1.02] duration-200";
                    }
                  } else if (showExplanation && isCorrect) {
                    optStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold ring-2 ring-emerald-400";
                  }

                  return (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => {
                        if (showExplanation) return;
                        setSelectedAnswers({ ...selectedAnswers, [currentIdx]: v });
                      }}
                      className={`py-4 border rounded-xl text-center font-black uppercase tracking-wider text-xs transition-all cursor-pointer ${optStyle}`}
                    >
                      {showExplanation && isCorrect ? "✓ Correct" : showExplanation && isSelected ? "✕ Incorrect" : (v ? "True" : "False")}
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

            {showExplanation && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-rose-50/55 border border-rose-200 rounded-xl space-y-1.5"
              >
                <div className="flex items-center gap-1.5 text-rose-700 font-black text-xs uppercase tracking-wider">
                  <span>💡</span> Learning Explanation
                </div>
                <p className="text-xs md:text-sm text-slate-800 font-semibold leading-relaxed">
                  {activeQuestion.explanation || "That answer selection is incorrect. Review the correct option highlighted in green to learn this concept before proceeding."}
                </p>
              </motion.div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowExplanation(false);
                  setCurrentIdx(prev => Math.max(0, prev - 1));
                }}
                disabled={currentIdx === 0 || showExplanation}
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
                    
                    const chosen = selectedAnswers[currentIdx];
                    let isWrong = false;
                    if (checkType === 'mcq') {
                      isWrong = chosen !== activeQuestion.correct;
                    } else if (checkType === 'tf') {
                      isWrong = chosen !== activeQuestion.answer;
                    }

                    if (isWrong && !showExplanation) {
                      setShowExplanation(true);
                      return;
                    }

                    setShowExplanation(false);
                    setCurrentIdx(prev => prev + 1);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wide rounded-xl cursor-pointer font-sans"
                >
                  {showExplanation ? "I Understand - Next Question →" : "Next Question →"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedAnswers[currentIdx] === undefined && checkType !== 'fact') {
                      alert("Please select your answer to complete!");
                      return;
                    }

                    const chosen = selectedAnswers[currentIdx];
                    let isWrong = false;
                    if (checkType === 'mcq') {
                      isWrong = chosen !== activeQuestion.correct;
                    } else if (checkType === 'tf') {
                      isWrong = chosen !== activeQuestion.answer;
                    }

                    if (isWrong && !showExplanation) {
                      setShowExplanation(true);
                      return;
                    }

                    setShowExplanation(false);
                    handleSubmittingQuiz();
                  }}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg"
                >
                  {showExplanation ? "I Understand - Submit & Grade ✓" : "Submit Answers & Grade ✓"}
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
  setUserProfile: any;
  currentUser: any;
  onBack: () => void;
  showToast: (msg: string) => void;
  handleResetProgress: (cId: string) => Promise<void>;
  isAdmin?: boolean;
  isEnrolled?: boolean;
  onLogin?: () => void;
  courses: Course[];
  hasCompletedFirstCourse?: boolean;
  loading?: boolean;
  allMySubmissions?: any[];
  appSettings?: any;
  onRequestUnlockAdvanced?: (course: Course) => void;
}

function renderBulletList(text: string, icon: string, textClass: string = "text-sm text-slate-800") {
  if (!text) return null;
  const items = text
    .split(/\n+/)
    .map(item => item.replace(/^[•\*\-\s\d\.\)]+/, '').trim())
    .filter(item => item.length > 0);

  return (
    <ul className="space-y-3 mt-2.5 text-left">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2.5">
          <span className="text-indigo-600 mt-1 select-none shrink-0 text-xs font-black">{icon}</span>
          <span className={`${textClass} leading-relaxed font-extrabold`}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function CourseViewer({ course, userProfile, setUserProfile, currentUser, onBack, showToast, handleResetProgress, isAdmin = false, isEnrolled = true, onLogin, courses, hasCompletedFirstCourse, loading = false, allMySubmissions = [], appSettings, onRequestUnlockAdvanced }: CourseViewerProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showBadgePaymentModal, setShowBadgePaymentModal] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  const [viewingSyllabus, setViewingSyllabus] = useState(true);
  const [showTrackSelectionModal, setShowTrackSelectionModal] = useState(false);
  const [expandedAssignments, setExpandedAssignments] = useState<Record<number, boolean>>({});

  // Auto scroll window to top when day or course changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeDayIdx, course]);

  // Smoothly scroll the active lesson details container into view when a lesson is opened
  useEffect(() => {
    if (activeVideoIdx !== undefined) {
      const timer = setTimeout(() => {
        const activeElem = document.getElementById('active-lesson-container');
        if (activeElem) {
          activeElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeVideoIdx, activeDayIdx]);

  // Sync from URL params on search changes:
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    const dayParam = params.get('day');
    const videoParam = params.get('video');
    const syllabusParam = params.get('syllabus');
    const assignmentParam = params.get('assignment');

    if (dayParam !== null) {
      setActiveDayIdx(Number(dayParam));
    } else {
      setActiveDayIdx(0);
    }

    if (videoParam !== null) {
      setActiveVideoIdx(Number(videoParam));
    } else {
      setActiveVideoIdx(0);
    }

    if (syllabusParam === 'false') {
      setViewingSyllabus(false);
    } else {
      setViewingSyllabus(true);
    }

    if (assignmentParam === 'true') {
      setShowAssignment(true);
    } else {
      setShowAssignment(false);
    }
  }, [location.search]);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    navigate(`/dashboard?${params.toString()}`);
  };

  const handleEnroll = async (courseId: string, track: 'standard' | 'express') => {
    try {
      if (!currentUser) return;

      const expressClone = courses.find(c => c.clonedFromId === courseId && c.isCloned && c.durationMode === 'express');
      
      const progressUpdates: Record<string, any> = {};
      progressUpdates[courseId] = {
        ...(userProfile?.progress?.[courseId] || {}),
        durationMode: track,
        createdAt: new Date().toISOString()
      };

      if (track === 'express' && expressClone) {
        progressUpdates[expressClone.id] = {
          ...(userProfile?.progress?.[expressClone.id] || {}),
          durationMode: 'express',
          createdAt: new Date().toISOString()
        };
      }

      // Optimistic local update to state and cache to ensure instant enrollment in the UI
      const updatedProfile = {
        ...userProfile,
        progress: {
          ...(userProfile?.progress || {}),
          ...progressUpdates
        }
      };
      setUserProfile(updatedProfile);
      safeStorage.setItem('ciya_cached_profile', JSON.stringify(updatedProfile));

      const userRef = doc(db, 'users', currentUser.uid);
      const dbUpdates: Record<string, any> = {
        [`progress.${courseId}.durationMode`]: track,
        [`progress.${courseId}.createdAt`]: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (track === 'express' && expressClone) {
        dbUpdates[`progress.${expressClone.id}.durationMode`] = 'express';
        dbUpdates[`progress.${expressClone.id}.createdAt`] = serverTimestamp();
      }

      try {
        await updateDoc(userRef, dbUpdates);
      } catch (updateErr: any) {
        console.warn("Standard enrollment updateDoc failed, checking if document exists:", updateErr);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          console.log("Document does not exist in Firestore. Creating it resiliently...");
          
          const progressMap: Record<string, any> = {
            [courseId]: {
              durationMode: track,
              createdAt: new Date().toISOString()
            }
          };
          if (track === 'express' && expressClone) {
            progressMap[expressClone.id] = {
              durationMode: 'express',
              createdAt: new Date().toISOString()
            };
          }

          const newProfileData = {
            fullName: currentUser.displayName || currentUser.email?.split('@')[0] || 'CIYA Scholar',
            email: currentUser.email,
            approvalStatus: 'Approved',
            isActivated: true,
            isDashboardUnlocked: true,
            cohort: 'Cohort 1',
            progress: progressMap,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          await setDoc(userRef, newProfileData);
        } else {
          throw updateErr;
        }
      }

      showToast(`Successfully enrolled in ${track === 'express' ? 'Express Track (3 Days)' : 'Standard Track (5 Days)'}! 🚀`);
      setShowTrackSelectionModal(false);
      updateParams({ syllabus: 'false', assignment: 'false' });
    } catch (e: any) {
      console.error("Error enrolling course:", e);
      alert(`Failed to enroll in course: ${e?.message || e || 'Unknown Error'}. Please try again.`);
    }
  };

  const courseId = course.id || 'general';

  // Local progress buffer for standard courses to prevent writing to DB until the entire day is completed
  const [localDayProgress, setLocalDayProgress] = useState<Record<string, { watched: string[]; checkPassed: string[]; quizScores: Record<string, any> }>>(() => {
    try {
      const stored = localStorage.getItem(`ciya_local_day_progress_${courseId}`);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  // Sync state if courseId changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`ciya_local_day_progress_${courseId}`);
      setLocalDayProgress(stored ? JSON.parse(stored) : {});
    } catch (e) {
      setLocalDayProgress({});
    }
  }, [courseId]);

  // Merge standard DB progress with any local day-level buffered progress
  const mergedUserProfile = useMemo(() => {
    if (!userProfile) return null;
    const originalProgressStore = userProfile.progress?.[courseId] || {};
    const tempDurationMode = originalProgressStore.durationMode || course.durationMode || 'standard';
    if (tempDurationMode === 'express' || !!course.isCloned) return userProfile;

    const progress = { ...(userProfile.progress || {}) };
    const dbStore = progress[courseId] || { watched: [], checkPassed: [], submissions: {}, quizScores: {} };

    const watchedSet = new Set<string>(dbStore.watched || []);
    const checkPassedSet = new Set<string>(dbStore.checkPassed || []);
    const mergedQuizScores = { ...(dbStore.quizScores || {}) };

    Object.keys(localDayProgress).forEach((dayIdxStr) => {
      const dayData = localDayProgress[dayIdxStr];
      if (dayData) {
        (dayData.watched || []).forEach(k => watchedSet.add(k));
        (dayData.checkPassed || []).forEach(k => checkPassedSet.add(k));
        if (dayData.quizScores) {
          Object.assign(mergedQuizScores, dayData.quizScores);
        }
      }
    });

    progress[courseId] = {
      ...dbStore,
      watched: Array.from(watchedSet),
      checkPassed: Array.from(checkPassedSet),
      quizScores: mergedQuizScores
    };

    return {
      ...userProfile,
      progress
    };
  }, [userProfile, localDayProgress, course, courseId]);

  const dbProgressStore = mergedUserProfile?.progress?.[courseId] || { watched: [], checkPassed: [], submissions: {}, quizScores: {} };
  const selectedDurationMode = dbProgressStore.durationMode || course.durationMode || 'standard';
  const isExpress = selectedDurationMode === 'express' || !!course.isCloned;

  // Local progress state for express courses to prevent writing progress to DB profile
  const [localExpressProgress, setLocalExpressProgress] = useState<{ watched: string[]; checkPassed: string[] }>(() => {
    try {
      const stored = localStorage.getItem(`ciya_express_progress_${courseId}`);
      return stored ? JSON.parse(stored) : { watched: [], checkPassed: [] };
    } catch (e) {
      return { watched: [], checkPassed: [] };
    }
  });

  // Sync state if courseId changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`ciya_express_progress_${courseId}`);
      setLocalExpressProgress(stored ? JSON.parse(stored) : { watched: [], checkPassed: [] });
    } catch (e) {
      setLocalExpressProgress({ watched: [], checkPassed: [] });
    }
  }, [courseId]);

  const progressStore = isExpress 
    ? {
        ...dbProgressStore,
        watched: localExpressProgress.watched,
        checkPassed: localExpressProgress.checkPassed,
        quizScores: {} // No quiz scores saved in Firestore profile for express courses
      }
    : dbProgressStore;
  
  const dbSubmissions = useMemo(() => {
    if (!allMySubmissions) return [];
    return allMySubmissions.filter((s: any) => s.courseId === courseId);
  }, [allMySubmissions, courseId]);

  const completedKeys: string[] = progressStore.watched || [];
  const checkPassedKeys: string[] = progressStore.checkPassed || [];
  const submissions: Record<string, any> = progressStore.submissions || {};
  const days: CourseDay[] = selectedDurationMode === 'express' 
    ? (course.days || []).slice(0, 3) 
    : (course.days || []);
  const isCourseAdvanced = course.tier === 'advanced' || course.tier === 'masterclass' || course.level === 'Advanced' || course.level === 'Masterclass';
  const unitLabel = isCourseAdvanced ? 'Module' : 'Day';
  const activeDay: any = days[activeDayIdx] || { dayNumber: activeDayIdx + 1, title: `Study ${unitLabel}`, videos: [], assignment: { prompt: '', dueNote: '' } };
  const videos: CourseVideo[] = activeDay.videos || [];
  const currentVideo = videos[activeVideoIdx] || null;

  const [showFunFactPopup, setShowFunFactPopup] = useState(false);
  const [currentFunFact, setCurrentFunFact] = useState<{ headline: string; body: string } | null>(null);
  const [showAllWalkthroughLines, setShowAllWalkthroughLines] = useState(false);
  const funFactScrollRef = useRef<HTMLDivElement>(null);
  const [isFunFactInteracted, setIsFunFactInteracted] = useState(false);

  // Reset walkthrough collapse state when active lesson changes
  useEffect(() => {
    setShowAllWalkthroughLines(false);
  }, [activeVideoIdx, activeDayIdx]);

  // Reset fun fact interactions when it is shown
  useEffect(() => {
    if (showFunFactPopup) {
      setIsFunFactInteracted(false);
      if (funFactScrollRef.current) {
        funFactScrollRef.current.scrollTop = 0;
      }
    }
  }, [showFunFactPopup, currentFunFact]);

  // Auto-scroll logic for fun fact popup description when content overflows
  useEffect(() => {
    if (!showFunFactPopup || !currentFunFact || isFunFactInteracted) return;
    const container = funFactScrollRef.current;
    if (!container) return;

    let intervalId: any;
    
    const checkAndScroll = () => {
      if (container.scrollHeight > container.clientHeight) {
        intervalId = setInterval(() => {
          if (container.scrollTop + container.clientHeight >= container.scrollHeight - 1) {
            clearInterval(intervalId);
            setTimeout(() => {
              if (showFunFactPopup && !isFunFactInteracted && container) {
                container.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(checkAndScroll, 2000);
              }
            }, 3000);
          } else {
            container.scrollTop += 1;
          }
        }, 60);
      }
    };

    const startDelayId = setTimeout(checkAndScroll, 2500);

    return () => {
      clearTimeout(startDelayId);
      clearInterval(intervalId);
    };
  }, [showFunFactPopup, currentFunFact, isFunFactInteracted]);

  useEffect(() => {
    if (!currentVideo || viewingSyllabus) {
      setShowFunFactPopup(false);
      return;
    }

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
  }, [currentVideo, activeDayIdx, activeVideoIdx, viewingSyllabus]);

  const checkKey = `${activeDayIdx}-${activeVideoIdx}`;
  const isVideoWatched = completedKeys.includes(checkKey);
  const isCheckPassed = checkPassedKeys.includes(checkKey);
  const hasCheck = !!(currentVideo && currentVideo.checkType && currentVideo.checkType !== 'none' && currentVideo.check);

  const totalVideos = days.reduce((sum, d) => sum + (d.videos?.length || 0), 0);
  const totalWatchedCount = completedKeys.length;
  const progressRatio = totalVideos > 0 ? Math.round((totalWatchedCount / totalVideos) * 100) : 0;

  const handleGoToVideo = (di: number, vi: number) => {
    updateParams({
      day: String(di),
      video: String(vi),
      syllabus: 'false',
      assignment: 'false'
    });
  };

  const handleMarkComplete = async () => {
    const isQuizBypassed = appSettings?.quizzesOverrideMode === 'bypassed';
    if (hasCheck && !isCheckPassed && !isQuizBypassed) {
      setShowQuizModal(true);
    } else {
      const updatedWatched = [...completedKeys];
      if (!updatedWatched.includes(checkKey)) {
        updatedWatched.push(checkKey);
      }
      
      if (isExpress) {
        // Save to localStorage
        const newProgress = { watched: updatedWatched, checkPassed: checkPassedKeys };
        localStorage.setItem(`ciya_express_progress_${courseId}`, JSON.stringify(newProgress));
        setLocalExpressProgress(newProgress);
        showToast("Lesson marked as completed! ✓ (Progress saved locally)");
        return;
      }

      // Check if this completes the entire day's lessons
      const dayKeys = videos.map((_, vi) => `${activeDayIdx}-${vi}`);
      const isDayFinishedWithThis = dayKeys.every(k => k === checkKey || completedKeys.includes(k));

      // Check if all checks of the day are also passed
      const allChecksPassed = appSettings?.quizzesOverrideMode === 'bypassed' || videos.every((v, vi) => {
        const k = `${activeDayIdx}-${vi}`;
        const hasQuiz = !!(v && v.checkType && v.checkType !== 'none' && v.check);
        return !hasQuiz || checkPassedKeys.includes(k);
      });

      const dayFullyCompleted = isDayFinishedWithThis && allChecksPassed;

      if (dayFullyCompleted) {
        // Retrieve buffered quiz scores for this day
        let dayQuizScores: Record<string, any> = {};
        try {
          const storedLocal = localStorage.getItem(`ciya_local_day_progress_${courseId}`);
          const localData = storedLocal ? JSON.parse(storedLocal) : {};
          const dayData = localData[activeDayIdx] || { quizScores: {} };
          dayQuizScores = dayData.quizScores || {};
        } catch (e) {
          console.warn("Error reading local day progress scores:", e);
        }

        // Synced write to Firestore!
        try {
          const finalWatched = Array.from(new Set([...(userProfile?.progress?.[courseId]?.watched || []), ...updatedWatched]));
          
          const updatedProfile = {
            ...userProfile,
            progress: {
              ...(userProfile?.progress || {}),
              [courseId]: {
                ...(userProfile?.progress?.[courseId] || {}),
                watched: finalWatched
              }
            }
          };
          setUserProfile(updatedProfile);
          safeStorage.setItem('ciya_cached_profile', JSON.stringify(updatedProfile));

          const userRef = doc(db, 'users', currentUser.uid);
          const updatePayload: any = {
            [`progress.${courseId}.watched`]: finalWatched,
            updatedAt: serverTimestamp()
          };

          // Merge buffered quiz scores into the Firestore update payload
          Object.keys(dayQuizScores).forEach((scoreKey) => {
            updatePayload[`progress.${courseId}.quizScores.${scoreKey}`] = dayQuizScores[scoreKey];
          });

          await updateDoc(userRef, updatePayload);

          // Remove day buffer
          const updatedLocalDayProgress = { ...localDayProgress };
          delete updatedLocalDayProgress[activeDayIdx];
          localStorage.setItem(`ciya_local_day_progress_${courseId}`, JSON.stringify(updatedLocalDayProgress));
          setLocalDayProgress(updatedLocalDayProgress);

          showToast(`Full Day ${activeDayIdx + 1} Completed! Progress synced to Cloud Firestore! 🎓🚀`);
          checkAndMarkCourseCompleted(updatedProfile, course, currentUser, setUserProfile, showToast);
        } catch (dbErr) {
          console.error("Database sync failed on day completion:", dbErr);
          showToast(`Full Day ${activeDayIdx + 1} Completed! (Progress saved offline)`);
        }
      } else {
        // Buffer locally!
        const currentDayLocal = localDayProgress[activeDayIdx] || { watched: [], checkPassed: [], quizScores: {} };
        const updatedLocalDayProgress = {
          ...localDayProgress,
          [activeDayIdx]: {
            ...currentDayLocal,
            watched: Array.from(new Set([...currentDayLocal.watched, checkKey]))
          }
        };
        localStorage.setItem(`ciya_local_day_progress_${courseId}`, JSON.stringify(updatedLocalDayProgress));
        setLocalDayProgress(updatedLocalDayProgress);

        // Update local profile state immediately so UI changes reactively
        const updatedProfile = {
          ...userProfile,
          progress: {
            ...(userProfile?.progress || {}),
            [courseId]: {
              ...(userProfile?.progress?.[courseId] || {}),
              watched: Array.from(new Set([...(userProfile?.progress?.[courseId]?.watched || []), checkKey]))
            }
          }
        };
        setUserProfile(updatedProfile);
        safeStorage.setItem('ciya_cached_profile', JSON.stringify(updatedProfile));

        showToast("Lesson completed! ✓ (Progress saved in browser buffer until entire Day is finished)");
      }
    }
  };

  const handleCheckCompletion = async () => {
    const updatedWatched = [...completedKeys];
    if (!updatedWatched.includes(checkKey)) {
      updatedWatched.push(checkKey);
    }

    const updatedPassed = [...checkPassedKeys];
    if (!updatedPassed.includes(checkKey)) {
      updatedPassed.push(checkKey);
    }

    if (isExpress) {
      // Save to localStorage
      const newProgress = { watched: updatedWatched, checkPassed: updatedPassed };
      localStorage.setItem(`ciya_express_progress_${courseId}`, JSON.stringify(newProgress));
      setLocalExpressProgress(newProgress);
      setShowQuizModal(false);
      showToast("Comprehension check passed! Lesson unlocked! 🎉 (Progress saved locally)");
      return;
    }

    // Check if this completes the entire day's lessons
    const dayKeys = videos.map((_, vi) => `${activeDayIdx}-${vi}`);
    const isDayFinishedWithThis = dayKeys.every(k => k === checkKey || completedKeys.includes(k));

    // Check if all checks of the day are also passed
    const allChecksPassed = videos.every((v, vi) => {
      const k = `${activeDayIdx}-${vi}`;
      const hasQuiz = !!(v && v.checkType && v.checkType !== 'none' && v.check);
      return !hasQuiz || k === checkKey || checkPassedKeys.includes(k);
    });

    const dayFullyCompleted = isDayFinishedWithThis && allChecksPassed;

    if (dayFullyCompleted) {
      // Retrieve buffered quiz scores for this day
      let dayQuizScores: Record<string, any> = {};
      try {
        const storedLocal = localStorage.getItem(`ciya_local_day_progress_${courseId}`);
        const localData = storedLocal ? JSON.parse(storedLocal) : {};
        const dayData = localData[activeDayIdx] || { quizScores: {} };
        dayQuizScores = dayData.quizScores || {};
      } catch (e) {
        console.warn("Error reading local day progress scores:", e);
      }

      // Synced write to Firestore!
      try {
        const finalWatched = Array.from(new Set([...(userProfile?.progress?.[courseId]?.watched || []), ...updatedWatched]));
        const finalPassed = Array.from(new Set([...(userProfile?.progress?.[courseId]?.checkPassed || []), ...updatedPassed]));

        const updatedProfile = {
          ...userProfile,
          progress: {
            ...(userProfile?.progress || {}),
            [courseId]: {
              ...(userProfile?.progress?.[courseId] || {}),
              watched: finalWatched,
              checkPassed: finalPassed
            }
          }
        };
        setUserProfile(updatedProfile);
        safeStorage.setItem('ciya_cached_profile', JSON.stringify(updatedProfile));

        const userRef = doc(db, 'users', currentUser.uid);
        const updatePayload: any = {
          [`progress.${courseId}.watched`]: finalWatched,
          [`progress.${courseId}.checkPassed`]: finalPassed,
          updatedAt: serverTimestamp()
        };

        // Merge buffered quiz scores into the Firestore update payload
        Object.keys(dayQuizScores).forEach((scoreKey) => {
          updatePayload[`progress.${courseId}.quizScores.${scoreKey}`] = dayQuizScores[scoreKey];
        });

        await updateDoc(userRef, updatePayload);

        // Remove day buffer
        const updatedLocalDayProgress = { ...localDayProgress };
        delete updatedLocalDayProgress[activeDayIdx];
        localStorage.setItem(`ciya_local_day_progress_${courseId}`, JSON.stringify(updatedLocalDayProgress));
        setLocalDayProgress(updatedLocalDayProgress);

        setShowQuizModal(false);
        showToast(`Full Day ${activeDayIdx + 1} Completed! Progress synced to Cloud Firestore! 🎓🚀`);
        checkAndMarkCourseCompleted(updatedProfile, course, currentUser, setUserProfile, showToast);
      } catch (dbErr) {
        console.error("Database sync failed on day completion:", dbErr);
        setShowQuizModal(false);
        showToast(`Full Day ${activeDayIdx + 1} Completed! (Progress saved offline)`);
      }
    } else {
      // Buffer locally!
      const currentDayLocal = localDayProgress[activeDayIdx] || { watched: [], checkPassed: [], quizScores: {} };
      const updatedLocalDayProgress = {
        ...localDayProgress,
        [activeDayIdx]: {
          ...currentDayLocal,
          watched: Array.from(new Set([...currentDayLocal.watched, checkKey])),
          checkPassed: Array.from(new Set([...currentDayLocal.checkPassed, checkKey]))
        }
      };
      localStorage.setItem(`ciya_local_day_progress_${courseId}`, JSON.stringify(updatedLocalDayProgress));
      setLocalDayProgress(updatedLocalDayProgress);

      // Update local profile state immediately so UI changes reactively
      const updatedProfile = {
        ...userProfile,
        progress: {
          ...(userProfile?.progress || {}),
          [courseId]: {
            ...(userProfile?.progress?.[courseId] || {}),
            watched: Array.from(new Set([...(userProfile?.progress?.[courseId]?.watched || []), checkKey])),
            checkPassed: Array.from(new Set([...(userProfile?.progress?.[courseId]?.checkPassed || []), checkKey]))
          }
        }
      };
      setUserProfile(updatedProfile);
      safeStorage.setItem('ciya_cached_profile', JSON.stringify(updatedProfile));

      setShowQuizModal(false);
      showToast("Comprehension check passed! Lesson unlocked! ✓ (Progress buffered in browser until entire Day is completed)");
    }
  };

  const handleGoNext = () => {
    let nextDayIdx = activeDayIdx;
    let nextVideoIdx = activeVideoIdx;
    let goingToNextLesson = false;

    if (activeVideoIdx < videos.length - 1) {
      nextVideoIdx = activeVideoIdx + 1;
      goingToNextLesson = true;
    } else if (course.isCloned && activeDayIdx < days.length - 1) {
      nextDayIdx = activeDayIdx + 1;
      nextVideoIdx = 0;
      goingToNextLesson = true;
    }

    if (goingToNextLesson) {
      const isNextUnlocked = isAdmin || isLessonUnlockedUnified(nextDayIdx, nextVideoIdx, days, completedKeys, checkPassedKeys, dbSubmissions, isAdmin, !!course.isCloned, userProfile, courseId, appSettings);
      if (!isNextUnlocked) {
        alert("The next lesson is locked! You must complete the watch requirement and score at least 80% on this lesson's comprehension quiz first.");
        return;
      }
    }

    if (activeVideoIdx < videos.length - 1) {
      setActiveVideoIdx(prev => prev + 1);
      setShowQuizModal(false);
    } else {
      if (course.isCloned) {
        if (activeDayIdx < days.length - 1) {
          handleGoToVideo(activeDayIdx + 1, 0);
          showToast(`Moving to Day ${activeDayIdx + 2}! 🚀`);
        } else {
          showToast("Congratulations! You've completed all lessons for this cloned course path! 🎓");
        }
      } else {
        setShowAssignment(true);
      }
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
      const dayIndex = Number(key.replace('day-', ''));
      const isBeginnerCourse = ['najnq9llx', 'psw96tm5o', 'qlpspor4hm'].includes(course?.id || '');
      let assignmentConfig = course?.days?.[dayIndex]?.assignment;
      const dayKey = `day-${dayIndex}`;
      const customConfig = appSettings?.assignmentSettings?.[dayKey];
      if (isBeginnerCourse && customConfig && customConfig.enabled) {
        assignmentConfig = {
          prompt: assignmentConfig?.prompt || '',
          dueNote: assignmentConfig?.dueNote || '',
          autoApprove: customConfig.autoApprove,
          minChars: customConfig.minChars,
          requireLink: customConfig.requireLink,
          minScreenshots: customConfig.minScreenshots,
          requiredKeywords: customConfig.requiredKeywords,
          approveComment: customConfig.approveComment,
          disapproveComment: customConfig.disapproveComment
        };
      }

      const evalRes = evaluateComplianceAndGetStatus(
        assignmentConfig,
        data.text || '',
        data.link || '',
        data.images || []
      );

      let autoApproveAt: string | null = null;
      let finalStatus: 'Pending' | 'Approved' | 'Disapproved' = evalRes.status;
      let customToastMessage = "";

      if (isBeginnerCourse && customConfig && customConfig.enabled && evalRes.status === 'Approved') {
        const delay = customConfig.approvalDelay || 'instant';
        if (delay !== 'instant') {
          let minutes = 0;
          let delayLabel = "";
          if (delay === '10m') { minutes = 10; delayLabel = "10 minutes"; }
          else if (delay === '20m') { minutes = 20; delayLabel = "20 minutes"; }
          else if (delay === '30m') { minutes = 30; delayLabel = "30 minutes"; }
          else if (delay === '1h') { minutes = 60; delayLabel = "1 hour"; }

          if (minutes > 0) {
            finalStatus = 'Pending';
            autoApproveAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
            customToastMessage = "Assignment submitted successfully! Under review by our team.";
          }
        }
      }

      const dataWithStatus = {
        ...data,
        status: finalStatus,
        adminReason: finalStatus === 'Pending' && autoApproveAt ? "Approval delay timer is active." : evalRes.adminReason,
        submittedAt: new Date().toISOString()
      };

      const updatedProfile = {
        ...userProfile,
        progress: {
          ...(userProfile?.progress || {}),
          [courseId]: {
            ...(userProfile?.progress?.[courseId] || {}),
            submissions: {
              ...(userProfile?.progress?.[courseId]?.submissions || {}),
              [key]: dataWithStatus
            }
          }
        }
      };
      setUserProfile(updatedProfile);
      safeStorage.setItem('ciya_cached_profile', JSON.stringify(updatedProfile));

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        [`progress.${courseId}.submissions.${key}`]: dataWithStatus,
        updatedAt: serverTimestamp()
      });

      const combinedText = data.images && data.images.length > 0
        ? (data.text || '') + "\n\n---IMAGES_JSON---\n" + JSON.stringify(data.images)
        : (data.text || '');

      const cohort = userProfile?.cohort || 'Cohort 1';

      // Check if there is an existing submission for this assignment (disapproved) to update or add new
      const existingSub = allMySubmissions?.find(s => s.courseId === courseId && s.dayIndex === dayIndex);

      if (existingSub) {
        const subRef = doc(db, 'assignments', existingSub.id);
        await updateDoc(subRef, {
          submittedText: combinedText,
          fileUrl: data.link || '',
          images: data.images || [],
          status: finalStatus,
          cohort: cohort,
          adminReason: finalStatus === 'Pending' && autoApproveAt ? "Approval delay timer is active." : evalRes.adminReason,
          autoApproveAt: autoApproveAt,
          createdAt: serverTimestamp()
        });
      } else {
        // Also append to global assignments collection
        await addDoc(collection(db, 'assignments'), {
          userId: currentUser.uid,
          userEmail: currentUser.email || userProfile?.email || 'student@ciya.com',
          userName: userProfile?.fullName || currentUser.displayName || 'Invited Student',
          courseId: courseId,
          dayIndex: dayIndex,
          submittedText: combinedText,
          fileUrl: data.link || '',
          fileName: data.link ? 'Live URL Link' : '',
          status: finalStatus,
          cohort: cohort,
          adminReason: finalStatus === 'Pending' && autoApproveAt ? "Approval delay timer is active." : evalRes.adminReason,
          autoApproveAt: autoApproveAt,
          createdAt: serverTimestamp()
        });
      }

      const cleanReason = (evalRes.adminReason || '').replace(/^Automated Compliance:\s*/i, '');

      if (finalStatus !== 'Pending') {
        const unlockInfo = getNextDayUnlockStatus(dayIndex + 1, appSettings);
        await addDoc(collection(db, 'notifications'), {
          userId: currentUser.uid,
          title: finalStatus === 'Approved' ? `Assignment Approved! 🎉` : `Assignment Needs Correction ❌`,
          message: finalStatus === 'Approved'
            ? unlockInfo.message
            : `Your assignment for Day ${dayIndex + 1} did not meet requirements: "${cleanReason}". Please fix and resubmit.`,
          type: 'assignment_graded',
          isRead: false,
          triggeredBy: 'Academy Coordinator',
          createdAt: serverTimestamp()
        });

        if (finalStatus === 'Approved') {
          showToast(unlockInfo.toast);
        } else {
          showToast(`Submission Needs Correction: ${cleanReason} ❌`);
        }
      } else {
        if (autoApproveAt && customToastMessage) {
          showToast(customToastMessage);
        } else {
          showToast("Assignment submitted successfully!");
        }
      }
    } catch (e) {
      console.error("Error submitting assignment:", e);
    }
  };

  const sk = SKILLS[course.skill || 'web'];

  if (!course.days || course.days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        {loading ? (
          <>
            <div className="w-12.5 h-12.5 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-600 text-xs font-black uppercase tracking-wider">Loading Syllabus & Lessons...</p>
          </>
        ) : (
          <>
            <div className="text-3xl mb-4 select-none">📚</div>
            <p className="text-slate-600 text-sm font-black uppercase tracking-wider">No lessons published for this path yet.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans pb-16">
      {/* 1. CLASSROOM TOP PORTAL SPECS CARD */}
      <div className="bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-3xl p-6 md:p-8 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 w-full">
        <div className="flex gap-4 items-center text-left min-w-0 flex-1">
          <button
            onClick={() => {
              if (!viewingSyllabus) {
                updateParams({ syllabus: 'true', assignment: 'false' });
              } else {
                onBack();
              }
            }}
            className="p-3 px-5 border border-slate-200 hover:bg-slate-50 text-slate-800 font-black text-xs rounded-xl transition-all cursor-pointer bg-white flex items-center justify-center shrink-0 shadow-sm"
            title="Back to courses"
          >
            ← Back
          </button>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100">
                CLASSROOM HUB
              </span>
              {isEnrolled && (
                <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                  isExpress 
                    ? 'bg-teal-50 text-teal-700 border-teal-200' 
                    : 'bg-indigo-50 text-indigo-750 border-indigo-200'
                }`}>
                  {isExpress ? '⚡ Express Track (3 Days)' : '📚 Standard Track (5 Days)'}
                </span>
              )}
            </div>
            <h2 className="font-extrabold text-lg md:text-2xl lg:text-3xl text-slate-900 leading-tight tracking-tight sm:whitespace-normal">
              {course.title}
            </h2>
            <p className="text-xs md:text-sm text-slate-600 font-extrabold leading-relaxed">
              {course.tagline || course.subtitle}
            </p>
          </div>
        </div>

        {/* Lesson Completion Rate Timeline Bar with Colored Animation */}
        <div className="flex flex-col gap-2 w-full md:w-64 shrink-0 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-indigo-800 uppercase tracking-wider text-[10px]">Course Progress</span>
            <span className="text-teal-700 font-extrabold text-[11px]">{progressRatio}% Complete</span>
          </div>
          
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative border border-slate-200/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressRatio}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-teal-500 via-indigo-500 to-indigo-600 rounded-full"
            />
          </div>
          
          <div className="flex justify-between text-[10px] text-slate-500 font-bold font-mono">
            <span>0% Start</span>
            <span>{totalWatchedCount} of {totalVideos} Clips</span>
          </div>
        </div>
      </div>

      {viewingSyllabus ? (
        <div className="bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-slate-100/35 border-2 border-indigo-100/65 rounded-3xl p-6 md:p-8 shadow-md space-y-6 text-left">
          <div>
            <span className="text-xs font-black uppercase text-indigo-800 bg-indigo-50 px-3.5 py-1.5 rounded-full tracking-wider">
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
            <div className="bg-white p-5 rounded-2xl border border-indigo-100/80 space-y-2.5">
              <span className="text-xs md:text-sm font-black uppercase text-indigo-700 tracking-wider block">🎯 Overview Synopsis</span>
              {renderBulletList(course.overview || course.description, "⚡", "text-sm md:text-base text-slate-800")}
            </div>
          )}

          {/* General specs layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-indigo-100/40">
              <span className="text-2xl select-none">🧑‍🏫</span>
              <div className="text-xs leading-normal">
                <span className="font-extrabold uppercase text-xs text-slate-500 block tracking-wider">Instructor Team</span>
                <span className="font-black text-slate-900 block mt-0.5">{course.instructor || "CIYA Technical Team"}</span>
              </div>
            </div>

            {course.price ? (
              <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-indigo-100/40">
                <span className="text-2xl select-none">💰</span>
                <div className="text-xs leading-normal">
                  <span className="font-extrabold uppercase text-[9px] text-slate-400 block tracking-wider">Course Price Status</span>
                  <span className="font-black text-slate-900 block mt-0.5">₦{Number(course.price).toLocaleString()}</span>
                </div>
              </div>
            ) : null}

            {course.requirements && (
              <div className="md:col-span-2 space-y-2.5 bg-amber-50/60 p-4 md:p-5 rounded-2xl border border-amber-200">
                <span className="text-xs md:text-sm font-black uppercase text-amber-850 tracking-wider block">🛠️ Required Prep Tools & Prerequisites</span>
                <div className="text-sm md:text-base text-amber-950 leading-relaxed font-extrabold">
                  {renderBulletList(course.requirements, "✦", "text-sm md:text-base text-amber-950")}
                </div>
              </div>
            )}

            {course.outcomes && (
              <div className="md:col-span-2 space-y-2.5 bg-teal-50/35 p-4 md:p-5 rounded-2xl border border-teal-200">
                <span className="text-xs md:text-sm font-black uppercase text-teal-850 tracking-wider block">🚀 Core Professional Objectives & Outcomes</span>
                <div className="text-sm md:text-base text-teal-950 leading-relaxed font-extrabold">
                  {renderBulletList(course.outcomes, "✦", "text-sm md:text-base text-teal-950")}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4">
            <button
              onClick={() => {
                if (!currentUser) {
                  alert("This premium classroom is locked. Please sign in to enter the classroom and begin your lessons.");
                  if (onLogin) {
                    onLogin();
                  }
                  return;
                }
                if (!isEnrolled) {
                  const isAdv = course.tier === 'advanced' || course.tier === 'masterclass' || course.level === 'Advanced' || course.level === 'Masterclass';
                  const isMonetized = appSettings?.advancedCourseSettings?.enabled ?? true;
                  if (isAdv && isMonetized) {
                    if (onRequestUnlockAdvanced) {
                      onRequestUnlockAdvanced(course);
                    }
                    return;
                  }

                  const runningCourseId = Object.keys(userProfile?.progress || {}).find(cId => {
                    const p = userProfile?.progress?.[cId];
                    if (!p) return false;

                    // If course was reset and there is no active re-engagement progress, skip it
                    if (p.resetAt) {
                      const hasReengaged = (p.watched && p.watched.length > 0) || (p.checkPassed && p.checkPassed.length > 0);
                      if (!hasReengaged) return false;
                    }

                    const matchingCourse = courses.find(item => item.id === cId);
                    if (!matchingCourse) return false;
                    return !isCourseCompleted(userProfile, matchingCourse);
                  });

                  if (runningCourseId) {
                    const runningCourse = courses.find(item => item.id === runningCourseId);
                    alert(`You currently have an active running course: "${runningCourse?.title || 'Active Course'}". Please finish your current running course (100% complete) first before you can enroll in a new course. Users cannot enroll in multiple courses at the same time.`);
                    return;
                  }

                  const completedFirst = hasCompletedFirstCourse ? hasCompletedFirstCourse : false;
                  if (!completedFirst) {
                    // Automatically ascribe to standard course
                    handleEnroll(course.id || '', 'standard');
                    return;
                  }

                  setShowTrackSelectionModal(true);
                  return;
                }

                updateParams({ syllabus: 'false', assignment: 'false' });
              }}
              className={`w-full py-4 text-white font-extrabold text-sm uppercase rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-[0.98] border-0 ${
                isEnrolled 
                  ? "bg-teal-600 hover:bg-teal-700 shadow-teal-600/10 hover:shadow-teal-600/20" 
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10 hover:shadow-indigo-600/20"
              }`}
            >
              {isEnrolled ? (
                <>📊 Enter Classroom & Begin Lessons →</>
              ) : (
                <>🔒 Enroll & Unlock Classroom →</>
              )}
            </button>
          </div>
        </div>
      ) : showAssignment ? (
        <AssignmentPanel
          assignment={activeDay.assignment}
          dayIndex={activeDayIdx}
          submissions={submissions}
          onSubmit={handleAssignmentSubmit}
          courseId={course.id}
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
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 text-left animate-fade-in -mx-6 md:mx-0 rounded-none md:rounded-3xl border-x-0 md:border-x">
          <div className="border-b pb-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">Course Syllabus Navigation</span>
              <h4 className="text-base md:text-lg font-black text-slate-900">🗓️ Guided Training {isCourseAdvanced ? 'Module' : 'Daily'} Schedule</h4>
            </div>
            <span className="text-sm bg-slate-100 text-slate-800 px-3 py-1 rounded-lg font-extrabold border border-slate-200">
              {totalWatchedCount} of {totalVideos} Clips Completed
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* 1. Selected Day card at the top */}
            {days.map((d, di) => {
              if (activeDayIdx !== di) return null;
              const isDayCoveredOrUnlocked = isAdmin || di === 0 || isDayUnlockedUnified(di, days, completedKeys, dbSubmissions, !!course.isCloned, userProfile, courseId, appSettings);
              
              const isPrecedingApproved = di === 0 || dbSubmissions.some((sub: any) => sub.dayIndex === di - 1 && sub.status === 'Approved');
              const isYearBadgeLocked = !isAdmin && isPrecedingApproved && !isBadgeActive(userProfile) && (
                (FRONTEND_YEAR_BADGE_SETTINGS.enabled === true) && (
                  (FRONTEND_YEAR_BADGE_SETTINGS.requireForDay1 && di >= 0) ||
                  (FRONTEND_YEAR_BADGE_SETTINGS.requireForDay4 && di >= 3)
                )
              );

              if (isYearBadgeLocked) {
                return (
                  <YearBadgePaywallCard
                    key={`badge-paywall-${di}`}
                    di={di}
                    unitLabel={unitLabel}
                    price={FRONTEND_YEAR_BADGE_SETTINGS.price}
                    currentUser={currentUser}
                    userProfile={userProfile}
                    setUserProfile={setUserProfile}
                    appSettings={appSettings}
                    onTriggerPurchase={() => setShowBadgePaymentModal(true)}
                  />
                );
              }

              if (!isDayCoveredOrUnlocked) {
                return (
                  <div key={`day-locked-view-${di}`} className="rounded-3xl border-2 border-slate-200 bg-slate-50/50 p-6 text-center space-y-4 shadow-sm text-slate-800">
                    <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-base tracking-tight">{unitLabel} {di + 1} is Progression-Locked 🔒</h4>
                      <p className="text-xs text-slate-500 font-semibold max-w-md mx-auto leading-relaxed">
                        To unlock this day's lessons, you must first complete and submit your assignment milestone for {unitLabel} {di} and wait for administrator review and approval.
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={`day-active-${di}`}
                  className="rounded-3xl border-2 border-indigo-300 bg-indigo-50/20 ring-4 ring-indigo-500/5 p-5 md:p-6 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2 mb-4 text-left">
                    <div className="flex items-center justify-between font-sans">
                      <span className="text-xs md:text-sm font-black text-indigo-700 tracking-wider uppercase flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
                        {unitLabel} {di + 1} (In View)
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
                       const isUnlocked = isAdmin || isLessonUnlockedUnified(di, vi, days, completedKeys, checkPassedKeys, dbSubmissions, isAdmin, !!course.isCloned, userProfile, courseId, appSettings);

                      return (
                        <div 
                          key={vid.id || vi} 
                          id={isVidCurrent ? 'active-lesson-container' : `lesson-card-${vi}`}
                          className="space-y-3 bg-slate-50/40 p-2 rounded-2xl border border-slate-100 shadow-sm"
                        >
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
                            className={`w-full rounded-xl p-4 md:p-5 flex items-center justify-between text-xs md:text-sm transition-all pointer-events-auto cursor-pointer border ${
                              isVidCurrent
                                ? 'bg-indigo-600 text-white border-indigo-600 font-extrabold shadow-md'
                                : isUnlocked
                                  ? 'bg-white text-slate-950 border-slate-200 hover:bg-slate-50 font-extrabold'
                                  : 'bg-slate-200 text-slate-600 border-slate-300 font-extrabold opacity-75 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-4 text-inherit min-w-0 flex-1">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black shrink-0 text-xs md:text-sm ${
                                isVidCurrent ? 'bg-white text-indigo-950 shadow-sm' : 'bg-slate-200 text-slate-800'
                              }`}>
                                {vi + 1}
                              </span>
                              <div className="flex-1 min-w-0 flex flex-col gap-1 text-left">
                                <span className="font-extrabold text-sm md:text-base leading-snug whitespace-normal break-words">
                                  {vid.title || `Lesson ${vi+1}`}
                                </span>
                                {vid.duration && (
                                  <span className={`text-[10px] md:text-xs px-2.5 py-0.5 rounded-md font-mono shrink-0 font-bold w-max ${isVidCurrent ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                                    ⏱ {vid.duration}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 select-none pl-2">
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
                                isAdvanced={isCourseAdvanced}
                              />

                              {/* 2. Walkthrough outline & resources SECOND */}
                              <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm space-y-4 text-left text-slate-900">
                                <div>
                                  <h4 className="font-extrabold text-slate-900 text-sm md:text-base uppercase tracking-wider">📖 Walkthrough Outline</h4>
                                  {vid.description ? (() => {
                                    const allDescriptionLines = vid.description.split('\n').map(l => l.trim()).filter(Boolean);
                                    const showMoreButton = allDescriptionLines.length > 2;
                                    const displayedLines = showAllWalkthroughLines ? allDescriptionLines : allDescriptionLines.slice(0, 2);
                                    return (
                                      <div className="pt-2">
                                        <div className="space-y-4 text-sm md:text-base font-semibold text-slate-800 leading-relaxed text-left">
                                          {displayedLines.map((line, idx) => {
                                            const timestampRegex = /^(\[?\d{1,2}:\d{2}\]?|Day\s+\d+\s+-\s+\d{1,2}:\d{2})\s*(?:-)?\s*(.*)$/i;
                                            const match = line.match(timestampRegex);
                                            if (match) {
                                              const stamp = match[1];
                                              const rest = match[2];
                                              return (
                                                <div key={idx} className="flex gap-3 items-start pt-1">
                                                  <span className="font-mono text-xs font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg mt-0.5 shrink-0 select-none">
                                                    ⏱ {stamp}
                                                  </span>
                                                  <p className="text-slate-900 font-extrabold leading-normal m-0">{renderClickableLinks(rest)}</p>
                                                </div>
                                              );
                                            }
                                            return (
                                              <p key={idx} className="leading-relaxed m-0 text-slate-900 font-extrabold">
                                                {renderClickableLinks(line)}
                                              </p>
                                            );
                                          })}
                                        </div>
                                        {showMoreButton && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowAllWalkthroughLines(!showAllWalkthroughLines);
                                            }}
                                            className="mt-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold rounded-lg flex items-center gap-1.5 cursor-pointer border border-indigo-200 transition-all shadow-sm shrink-0"
                                          >
                                            {showAllWalkthroughLines ? (
                                              <>Show Less ▲</>
                                            ) : (
                                              <>Show More Outline ({allDescriptionLines.length - 2} remaining) ▼</>
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })() : (
                                    <p className="text-xs text-slate-500 italic pt-1">No separate walkthrough text provided.</p>
                                  )}
                                </div>
 
                                {vid.resources && (
                                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-3.5">
                                    <span className="text-xs font-black text-teal-900 block uppercase">📎 Attached Resource Download Links</span>
                                    <p className="text-teal-950 font-mono text-[11px] md:text-xs mt-1.5 leading-relaxed font-bold whitespace-pre-wrap">
                                      {renderClickableLinks(vid.resources)}
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
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}

                    {/* End of day assignment checklist marker */}
                    {d.assignment && d.assignment.prompt && (
                      <div className="space-y-3 mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            const isDayUnlocked = di === 0 || isDayUnlockedUnified(di, days, completedKeys, dbSubmissions, !!course.isCloned, userProfile, courseId, appSettings);

                            const allVideosPassed = isDayUnlocked || (d.videos || []).every((v, vi) => {
                              const currentKey = `${di}-${vi}`;
                              const isVidWatched = completedKeys.includes(currentKey);
                              const hasQuiz = v.checkType && v.checkType !== 'none' && v.check;
                              const isQuizPassed = checkPassedKeys.includes(currentKey);
                              return isVidWatched && (!hasQuiz || isQuizPassed);
                            });

                            if (allVideosPassed) {
                              setExpandedAssignments(prev => ({
                                ...prev,
                                [di]: !prev[di]
                              }));
                            } else {
                              alert(`Complete all ${unitLabel.toLowerCase()}'s lessons and understanding checks first to unlock the end-of-${unitLabel.toLowerCase()} assignment!`);
                            }
                          }}
                          className={`w-full p-3 border rounded-xl cursor-pointer text-left flex items-center justify-between text-xs md:text-sm transition-all tracking-wide ${
                            expandedAssignments[di]
                              ? 'bg-teal-600 text-white border-teal-600 font-black shadow-md'
                              : 'text-teal-950 bg-teal-50 border-teal-200 hover:bg-teal-100 font-extrabold'
                          }`}
                        >
                          <span className="flex items-center gap-2 flex-1 font-bold">
                            <span>{dbSubmissions.find(sub => sub.dayIndex === di)?.status === 'Approved' ? "✅" : "📋"}</span>
                            <span>{unitLabel} {di+1} Live Assignment Details</span>
                          </span>
                          <span className="text-xs select-none font-black px-2 py-0.5 rounded bg-teal-700/20 text-teal-950">
                            {expandedAssignments[di] ? "▲ Hide" : "▼ Expand to View Question"}
                          </span>
                        </button>

                        {expandedAssignments[di] && (
                          <div className="bg-teal-50/30 border border-teal-100 rounded-2xl p-4.5 space-y-3.5 text-left shadow-sm animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-base select-none">📋</span>
                                <span className="text-xs uppercase font-black text-teal-900 tracking-wider">{unitLabel} {di+1} End-of-{unitLabel} Assignment Question</span>
                              </div>
                              {d.assignment.dueNote && (
                                <span className="text-[9px] uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">{d.assignment.dueNote}</span>
                              )}
                            </div>
                            <div className="text-xs md:text-sm text-slate-800 leading-relaxed font-extrabold whitespace-pre-wrap bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                              {renderClickableLinks(d.assignment.prompt || `Execute this ${unitLabel.toLowerCase()}'s syllabus lessons on your system and log your drafted link inside the Assignments tab.`)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 pl-1">
                              <span>💡 Submit this assignment inside your</span>
                              <button
                                type="button"
                                onClick={() => navigate(`/dashboard?view=assignments&courseId=${course.id}&dayIndex=${di}`)}
                                className="text-teal-700 font-black underline hover:text-teal-850 border-0 bg-transparent cursor-pointer p-0 m-0 inline"
                              >
                                "My Assignments" Workspace
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Inactive Remaining Days listing at the bottom */}
            {days.length > 1 && (
              <div className="mt-4 border-t border-slate-100 pt-5 space-y-3 animate-fade-in">
                <span className="text-xs md:text-sm font-black uppercase text-slate-500 tracking-wider block mb-1">Click to Switch Active {unitLabel} in View:</span>
                <div className="grid grid-cols-1 gap-4">
                  {days.map((d, di) => {
                    if (activeDayIdx === di) return null;
                    const isDayUnlocked = di === 0 || isDayUnlockedUnified(di, days, completedKeys, dbSubmissions, !!course.isCloned, userProfile, courseId, appSettings);
                    
                    const isPrecedingApproved = di === 0 || dbSubmissions.some((sub: any) => sub.dayIndex === di - 1 && sub.status === 'Approved');
                    const isYearBadgeLocked = !isAdmin && isPrecedingApproved && !isBadgeActive(userProfile) && (
                      (FRONTEND_YEAR_BADGE_SETTINGS.enabled === true) && (
                        (FRONTEND_YEAR_BADGE_SETTINGS.requireForDay1 && di >= 0) ||
                        (FRONTEND_YEAR_BADGE_SETTINGS.requireForDay4 && di >= 3)
                      )
                    );
                    const canViewDay = isDayUnlocked || isYearBadgeLocked;

                    return (
                      <div
                        key={`day-inactive-${di}`}
                        className={`rounded-2xl border p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer ${
                          isDayUnlocked 
                            ? 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-200' 
                            : isYearBadgeLocked
                              ? 'border-amber-200 bg-amber-50/20 hover:bg-amber-100 hover:border-amber-300 shadow-sm'
                              : 'border-slate-100 bg-slate-100/40 opacity-75'
                        }`}
                        onClick={() => {
                          if (canViewDay) {
                            handleGoToVideo(di, 0);
                          } else {
                            if (course.isCloned) {
                              alert(`⚠️ ${unitLabel} ${di + 1} lessons are locked! Please complete all ${unitLabel} ${di} lessons first.`);
                            } else {
                              alert(`⚠️ ${unitLabel} ${di + 1} lessons are locked! First submit your ${unitLabel} ${di} assignment and wait for coach approval to unlock ${unitLabel} ${di + 1} training.`);
                            }
                          }
                        }}
                      >
                        <div className="space-y-1.5 text-left flex-1">
                          <div className="flex items-center justify-between font-sans">
                            <span className="text-xs font-black text-indigo-700 tracking-wider uppercase flex items-center gap-1.5">
                              {unitLabel} {di + 1} 
                              {!isDayUnlocked && (
                                <span className="text-slate-500 text-xs font-normal">
                                  {isYearBadgeLocked ? "🏷️ CIYA Badge Required" : `🔒 Locked (${course.isCloned ? "Preceding Lessons Incomplete" : "Pending Assignment Approval"})`}
                                </span>
                              )}
                            </span>
                            <span className="text-xs bg-slate-100 text-slate-700 font-extrabold px-3 py-1 rounded-full uppercase tracking-normal">
                              {(d.videos || []).length} lessons
                            </span>
                          </div>
                          <h5 className="font-extrabold text-slate-900 text-sm leading-snug">{d.title}</h5>
                          {d.description && <p className="text-xs text-slate-700 leading-relaxed font-semibold">{d.description}</p>}
                        </div>

                        <div className="flex justify-end shrink-0">
                          {isDayUnlocked ? (
                            <span className="text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer">
                              📅 View Day {di + 1} Syllabus →
                            </span>
                          ) : isYearBadgeLocked ? (
                            <span 
                              className="text-xs font-black text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGoToVideo(di, 0);
                                setShowBadgePaymentModal(true);
                              }}
                            >
                              🏷️ Get CIYA Membership Badge
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 bg-slate-150 border px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-not-allowed">
                              🔒 Locked
                            </span>
                          )}
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
          setUserProfile={setUserProfile}
          onSuccess={handleCheckCompletion}
          onClose={() => setShowQuizModal(false)}
          showToast={showToast}
          isExpress={isExpress}
        />
      )}

      {/* Renders the CIYA Membership Badge Payment Popup Modal */}
      {showBadgePaymentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 font-sans">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 overflow-hidden shadow-2xl relative animate-scaleUp">
            <button
              onClick={() => setShowBadgePaymentModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center border-0 cursor-pointer text-sm font-black z-10"
              id="close-badge-payment-modal-btn"
            >
              ✕
            </button>
            <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  💳 Secure Payment Gateway
                </span>
                <h3 className="font-black text-slate-900 text-sm tracking-tight mt-1">CIYA Membership Badge Payment</h3>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[80vh]">
              <YearBadgePaymentFlow
                yearBadgeSettings={FRONTEND_YEAR_BADGE_SETTINGS}
                price={FRONTEND_YEAR_BADGE_SETTINGS.price}
                currentUser={currentUser}
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                isAdminSimulation={false}
                onSuccessClose={() => setShowBadgePaymentModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* SQUARE FUN FACT POPUP CARD (With increased font, auto scroll, and touch detection) */}
      {showFunFactPopup && !viewingSyllabus && currentFunFact && (
        <div id="fun-fact-popup-container" className="fixed bottom-4 right-4 z-[9999] p-1 select-none">
          <motion.div 
            id="fun-fact-card"
            initial={{ y: 30, scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            className="w-64 h-64 md:w-72 md:h-72 rounded-3xl bg-amber-50 border-2 border-amber-300 p-5 shadow-2xl flex flex-col items-center justify-between text-center relative overflow-hidden text-amber-950"
          >
            {/* Top orange gradient accent bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
            
            {/* Close button in top-right area */}
            <button
              id="fun-fact-close-btn"
              onClick={() => setShowFunFactPopup(false)}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-950 border-0 flex items-center justify-center cursor-pointer font-black text-xs transition-all focus:outline-none"
            >
              ✕
            </button>

            <span className="text-2xl mt-1 select-none animate-bounce">💡</span>
            
            <div className="space-y-1 w-full px-1">
              <span className="inline-block text-[10px] font-black uppercase text-amber-950 tracking-wider bg-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300">
                Lesson {activeVideoIdx + 1} Fact
              </span>
              <h3 className="text-sm md:text-base font-black text-amber-950 tracking-tight leading-tight max-w-[180px] md:max-w-[210px] mx-auto truncate">
                {currentFunFact?.headline || "Did you know?"}
              </h3>
            </div>

            {/* Scrollable body with increased font size and auto-scroll ability */}
            <div 
              id="fun-fact-scroll-body"
              ref={funFactScrollRef}
              onTouchStart={() => setIsFunFactInteracted(true)}
              onMouseDown={() => setIsFunFactInteracted(true)}
              onWheel={() => setIsFunFactInteracted(true)}
              className="max-h-[100px] md:max-h-[115px] overflow-y-auto px-2 mt-2 text-left w-full scrollbar-thin scrollbar-thumb-amber-200"
            >
              <p className="text-amber-950 text-xs md:text-sm leading-relaxed font-bold text-center">
                {currentFunFact?.body}
              </p>
            </div>

            <button
              id="fun-fact-ack-btn"
              onClick={() => setShowFunFactPopup(false)}
              className="mt-2.5 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-[10px] md:text-xs tracking-wider uppercase rounded-xl transition-all shadow-md cursor-pointer border-0 shrink-0 w-full"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}

      {/* Track Selection Modal */}
      {showTrackSelectionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white rounded-[32px] max-w-2xl w-full p-6 md:p-10 shadow-2xl border border-slate-100 relative overflow-hidden text-center"
          >
            {/* Top decorative badge */}
            <div className="mx-auto mb-6 w-16 h-16 bg-gradient-to-tr from-indigo-500 to-teal-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg text-white">
              ⚡
            </div>

            <h3 className="font-extrabold text-2xl md:text-3xl text-slate-900 tracking-tight leading-none mb-3">
              Choose Your Learning Pace
            </h3>
            
            <p className="text-slate-600 text-sm md:text-base font-semibold max-w-md mx-auto mb-8 leading-relaxed">
              Congratulations on completing your previous course! Please select the learning track that best fits your schedule and goals:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 text-left">
              {/* Standard option */}
              <button
                type="button"
                onClick={() => handleEnroll(course.id || '', 'standard')}
                className="group relative bg-white border-2 border-slate-200 hover:border-indigo-600 p-6 rounded-3xl transition-all shadow-sm hover:shadow-md flex flex-col justify-between text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                      Standard Track
                    </span>
                    <span className="text-xl">📚</span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-lg mb-2">5 Days Path</h4>
                  <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                    Complete, standard curriculum. Covers all daily concepts, interactive quizzes, and full step-by-step guidance over 5 scheduled days.
                  </p>
                </div>
                <div className="w-full mt-6 py-2.5 px-4 bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 text-xs font-black uppercase tracking-wide rounded-xl text-center transition-all">
                  Select 5 Days →
                </div>
              </button>

              {/* Express option */}
              <button
                type="button"
                onClick={() => handleEnroll(course.id || '', 'express')}
                className="group relative bg-white border-2 border-slate-200 hover:border-teal-600 p-6 rounded-3xl transition-all shadow-sm hover:shadow-md flex flex-col justify-between text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
                      Express Track
                    </span>
                    <span className="text-xl">⚡</span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-lg mb-2">3 Days Path</h4>
                  <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                    Accelerated curriculum. Skip extra assignment sections and move through the core instructional lessons in just 3 days!
                  </p>
                </div>
                <div className="w-full mt-6 py-2.5 px-4 bg-slate-50 group-hover:bg-teal-600 group-hover:text-white text-slate-700 text-xs font-black uppercase tracking-wide rounded-xl text-center transition-all">
                  Select 3 Days →
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowTrackSelectionModal(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold transition-all underline cursor-pointer border-0 bg-transparent animate-fade-in"
            >
              Cancel
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

function CourseCard({ course, isLocked, onSelect, userProfile, isEnrolled, currentUser, appSettings, onCourseUnlocked }: any) {
  const sk = SKILLS[course.skill || 'web'];
  const totalVideos = course.days?.reduce((sum: number, d: any) => sum + (d.videos?.length || 0), 0) || 0;
  const [expanded, setExpanded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncUnlock = async (e: React.MouseEvent, courseItem: any) => {
    e.stopPropagation();
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      if (appSettings?.lockedSections?.courses) {
        alert("The admin has locked the entire courses section. Individual course unlock verification is not available until the courses section is unlocked.");
        setIsSyncing(false);
        return;
      }

      const found = coursesStore.getCourses().find(c => c.id === courseItem.id);

      if (found) {
        if (found.isLocked === false) {
          if (onCourseUnlocked) {
            onCourseUnlocked(courseItem.id);
          }
          alert(`🎉 Success! Administrator authorization verified. "${courseItem.title}" has been successfully unlocked for you!`);
        } else {
          alert(`🔒 This course is still locked on the administrator's dashboard. Please contact your instructor to request access.`);
        }
      } else {
        alert(`🔒 This course is still locked on the administrator's dashboard. Please contact your instructor to request access.`);
      }
    } catch (err) {
      console.error("Error syncing course unlock:", err);
      alert("Error checking course lock status. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const progressStore = userProfile?.progress?.[course.id || ''] || { watched: [], checkPassed: [], submissions: {}, quizScores: {} };
  const completedKeys: string[] = progressStore.watched || [];
  const totalWatchedCount = completedKeys.length;
  const progressRatio = totalVideos > 0 ? Math.round((totalWatchedCount / totalVideos) * 100) : 0;
  const isCompleted = progressRatio === 100 && totalVideos > 0;
  
  const isAdvancedCourse = course.tier === 'advanced' || course.tier === 'masterclass' || course.level === 'Advanced' || course.level === 'Masterclass';
  let cardBorderClass = isAdvancedCourse ? "border-purple-200 hover:border-purple-350 hover:shadow-lg" : "border-slate-200 hover:border-slate-350 hover:shadow-lg";
  let cardBgClass = isAdvancedCourse ? "bg-purple-50/30" : "bg-slate-50/70";
  
  if (isEnrolled) {
    if (isCompleted) {
      if (isAdvancedCourse) {
        cardBorderClass = "border-emerald-500 ring-4 ring-emerald-500/15 shadow-xl hover:shadow-2xl shadow-emerald-500/10 hover:shadow-emerald-500/20";
        cardBgClass = "bg-gradient-to-br from-purple-50 via-emerald-50/20 to-white";
      } else {
        cardBorderClass = "border-emerald-500 ring-4 ring-emerald-500/15 shadow-xl hover:shadow-2xl shadow-emerald-500/10 hover:shadow-emerald-500/20";
        cardBgClass = "bg-gradient-to-br from-emerald-50 via-emerald-100/10 to-white";
      }
    } else {
      if (isAdvancedCourse) {
        cardBorderClass = "border-purple-500 ring-4 ring-purple-500/15 shadow-xl hover:shadow-2xl shadow-purple-100/40 hover:shadow-purple-100/60";
        cardBgClass = "bg-gradient-to-br from-purple-50/70 via-purple-100/20 to-white";
      } else {
        cardBorderClass = "border-indigo-500 ring-4 ring-indigo-500/15 shadow-xl hover:shadow-2xl shadow-indigo-100/40 hover:shadow-indigo-100/60";
        cardBgClass = "bg-gradient-to-br from-indigo-50/70 via-indigo-100/10 to-white";
      }
    }
  }

  return (
    <div 
      onClick={onSelect}
      className={`group flex flex-col ${cardBgClass} border-2 ${cardBorderClass} rounded-3xl overflow-hidden hover:-translate-y-1.5 transition-all duration-350 cursor-pointer text-left font-sans w-full`}
    >
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
        {course.thumbnail ? (
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-50 via-indigo-50/50 to-amber-50 flex items-center justify-center text-5xl select-none">
            {sk?.icon || "📕"}
          </div>
        )}
        
        {/* Top-left Registered Track Highlight */}
        {isEnrolled && (
          <div className="absolute top-4 left-4 z-10">
            <span className="bg-indigo-600 text-white font-extrabold uppercase text-[9px] tracking-wider px-3 py-1 rounded-full shadow-lg border border-indigo-400/30 flex items-center gap-1 select-none">
              🎓 Registered Path
            </span>
          </div>
        )}

        <div className="absolute top-4 right-4 flex flex-col gap-1.5 items-end">
          <TierBadge tier={course.tier || 'beginner'} />
          
          {isEnrolled && (
            isCompleted ? (
              <motion.div 
                animate={{ scale: [1, 1.06, 1], y: [0, -1, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="bg-emerald-600 text-white font-black uppercase text-[9px] tracking-widest px-2.5 py-1 rounded-full shadow-lg border border-emerald-400/40 flex items-center gap-1 select-none"
              >
                <span>⭐</span> COMPLETED ✓
              </motion.div>
            ) : (
              <motion.div 
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                className="bg-amber-500 text-slate-950 font-black uppercase text-[9px] tracking-widest px-2.5 py-1 rounded-full shadow-md border border-amber-300 flex items-center gap-1 select-none"
              >
                <span>⏳</span> RUNNING ({progressRatio}%)
              </motion.div>
            )
          )}
        </div>
      </div>
      
      <div className="p-6 md:p-7 flex-1 flex flex-col">
        {/* SKILL & SUBSKILL BADGES */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {sk && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg" style={{ backgroundColor: sk.bg, color: sk.color }}>
              <span>{sk.icon}</span> <span>{sk.label}</span>
            </span>
          )}
          {course.subskill && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/50">
              <span>🏷️</span> <span>{course.subskill}</span>
            </span>
          )}
          {isEnrolled && (
            <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${
              (progressStore.durationMode || course.durationMode || 'standard') === 'express' 
                ? 'bg-teal-50 text-teal-700 border border-teal-200/50' 
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200/50'
            }`}>
              <span>{(progressStore.durationMode || course.durationMode || 'standard') === 'express' ? '⚡ Express Track' : '📚 Standard Track'}</span>
            </span>
          )}
        </div>

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
                    <span className="font-extrabold text-slate-950">₦{Number(course.price).toLocaleString()}</span>
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
             <div className="flex items-center gap-2">
               <button className="text-[11px] font-black uppercase tracking-wide text-slate-400 bg-slate-100 flex items-center gap-1 px-3 py-1.5 rounded-full cursor-not-allowed border-0">
                 <Lock className="w-3.5 h-3.5" /> Locked
               </button>
               {currentUser && (
                 <button 
                   onClick={(e) => handleSyncUnlock(e, course)}
                   disabled={isSyncing}
                   className={`text-[10.5px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer shadow-sm select-none ${
                     isSyncing 
                       ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed animate-pulse" 
                       : "bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700 hover:shadow-md"
                   }`}
                   title="Sync Lock Status with Admin"
                 >
                   {isSyncing ? (
                     <span className="w-2.5 h-2.5 border-2 border-indigo-200 border-t-transparent rounded-full animate-spin inline-block" />
                   ) : (
                     "🔄"
                   )}
                   <span>{isSyncing ? "Verifying..." : "Sync Unlock"}</span>
                 </button>
               )}
             </div>
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
  const [isOpen, setIsOpen] = useState(false);
  if (!profile) return null;
  return (
    <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 text-left max-w-xl mx-auto mt-6 transition-all shadow-sm">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none border-b border-slate-200 pb-2.5 mb-3"
      >
        <h3 className="font-black text-slate-800 text-[11px] tracking-wider uppercase text-indigo-700 flex items-center gap-2 m-0">
          <span>📋</span> Submitted Application
        </h3>
        <button className="flex items-center gap-1 text-[11px] font-black text-indigo-650 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border-0 transition-colors uppercase tracking-wider cursor-pointer">
          {isOpen ? (
            <>
              Hide Details
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              See More
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Small Card (Summary always visible) */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Full Name</span>
          <span className="text-slate-800 font-extrabold">{profile.fullName || '-'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Recommended Program</span>
          <span className="text-indigo-700 font-extrabold">{profile.recommendedPath || '-'}</span>
        </div>
      </div>

      {/* Expanded/Dropdown Area */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 text-xs md:text-sm animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <span className="text-slate-600 block text-[10px] uppercase font-bold">Path Selections</span>
              <span className="text-slate-800 font-semibold text-xs">
                {profile.courseType || ''} {profile.pathwaySelection ? `(${profile.pathwaySelection})` : ''}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {profile.pathwayReason && (
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-bold">Reason for Selection</span>
                <p className="text-slate-600 italic mt-0.5 leading-relaxed font-semibold bg-white p-2.5 rounded-xl border border-slate-200">{profile.pathwayReason}</p>
              </div>
            )}
            <div>
              <span className="text-slate-600 block text-[10px] uppercase font-bold">Prior Experience in Course</span>
              <span className="text-slate-800 font-semibold">{profile.pathwayExperience || profile.experience || 'None'}</span>
            </div>
            {profile.intent && (
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-bold">What are you building CIYA Academy for?</span>
                <p className="text-slate-600 italic mt-0.5 leading-relaxed font-semibold bg-white p-2.5 rounded-xl border border-slate-200">{profile.intent}</p>
              </div>
            )}
            {profile.goal && (
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-bold">Target Learning Goal</span>
                <p className="text-slate-600 italic mt-0.5 leading-relaxed font-semibold bg-white p-2.5 rounded-xl border border-slate-200">{profile.goal}</p>
              </div>
            )}
            <div>
              <span className="text-slate-600 block text-[10px] uppercase font-bold">Commitment Level</span>
              <span className="text-slate-800 font-bold">{profile.availability || '-'}</span>
            </div>
          </div>
        </div>
      )}
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
  const location = useLocation();
  const [dbNetworkEnabled, setDbNetworkEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return safeGetItem('ciya_db_connection_disabled') !== 'true';
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStatusChange = (e: any) => {
      setDbNetworkEnabled(e.detail.enabled);
    };
    window.addEventListener('firestore-network-status' as any, handleStatusChange);
    return () => {
      window.removeEventListener('firestore-network-status' as any, handleStatusChange);
    };
  }, []);

  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const data = coursesStore.getCourses();
      data.sort((a, b) => {
        const getMills = (fieldVal: any) => {
          if (!fieldVal) return 0;
          return new Date(fieldVal).getTime() || 0;
        };
        return getMills(b.createdAt) - getMills(a.createdAt);
      });
      return data;
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    const unsubscribe = coursesStore.subscribe((updatedCourses) => {
      setCourses(updatedCourses);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  const [coursesViewTab, setCoursesViewTab] = useState<'courses' | 'leaderboard'>('courses');
  const [leaderboardUsers, setLeaderboardUsers] = useState<any[]>(() => {
    try {
      const cached = safeStorage.getItem('ciya_leaderboard_users');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [leaderboardLoading, setLeaderboardLoading] = useState(() => {
    try {
      const cached = safeStorage.getItem('ciya_leaderboard_users');
      return !cached;
    } catch (e) {
      return true;
    }
  });
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(() => {
    const hasCachedCourses = coursesStore.getCourses().length > 0;
    const hasCachedProfile = !!safeStorage.getItem('ciya_cached_profile');
    return !(hasCachedCourses && hasCachedProfile);
  });
  const [isRefreshingCourses, setIsRefreshingCourses] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showDashboardBadgePaymentModal, setShowDashboardBadgePaymentModal] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const cached = safeStorage.getItem('ciya_cached_user');
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
    const cachedProfile = safeStorage.getItem('ciya_cached_profile');
    if (cachedProfile) {
      try {
        return JSON.parse(cachedProfile);
      } catch (e) {}
    }
    const cachedUser = safeStorage.getItem('ciya_cached_user');
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        return {
          fullName: u.displayName || u.email?.split('@')[0] || "CIYA Scholar",
          email: u.email,
          approvalStatus: "Approved",
          isActivated: true,
          isDashboardUnlocked: true
        };
      } catch (e) {}
    }
    return null;
  });

  const [unlockedCourseIds, setUnlockedCourseIds] = useState<string[]>(() => {
    try {
      const cachedUser = safeStorage.getItem('ciya_cached_user');
      const activeUid = cachedUser ? JSON.parse(cachedUser).uid : '';
      const cached = safeStorage.getItem(`ciya_locally_unlocked_courses_${activeUid}`);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const handleCourseUnlocked = (courseId: string) => {
    setUnlockedCourseIds(prev => {
      const next = [...prev];
      if (!next.includes(courseId)) {
        next.push(courseId);
        const cachedUser = safeStorage.getItem('ciya_cached_user');
        const activeUid = cachedUser ? JSON.parse(cachedUser).uid : '';
        safeStorage.setItem(`ciya_locally_unlocked_courses_${activeUid}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const [authChecking, setAuthChecking] = useState(() => {
    return !safeStorage.getItem('ciya_cached_user');
  });

  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);

  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const cleanupPerformedRef = useRef(false);
  const dismissedCongratsCoursesRef = useRef<string[]>([]);

  // Automatically clean up screenshot images older than 3 days to keep Firestore lightweight and prevent hitting limits
  const cleanUpOldSubmissionsLocal = async (uid: string, progress: any) => {
    try {
      if (!progress) return;
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      let updated = false;
      const updatedProgress = { ...progress };

      Object.entries(updatedProgress).forEach(([cId, pVal]: [string, any]) => {
        if (pVal?.submissions) {
          Object.entries(pVal.submissions).forEach(([dayKey, subVal]: [string, any]) => {
            if (subVal?.images && subVal.images.length > 0 && subVal.submittedAt) {
              const subDate = new Date(subVal.submittedAt);
              if (subDate < threeDaysAgo) {
                updatedProgress[cId].submissions[dayKey].images = []; // delete heavy base64 images
                updated = true;
              }
            }
          });
        }
      });

      if (updated) {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
          progress: updatedProgress,
          updatedAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.warn("Soft clean up old local submissions error:", e);
    }
  };

  const cleanUpOldGlobalSubmissions = async (uid: string) => {
    try {
      // Gate behind a 24-hour cooldown keyed by uid to prevent massive redundant reads on every page visit
      const lastRunKey = `ciya_cleanup_last_run_${uid}`;
      const lastRun = safeStorage.getItem(lastRunKey);
      if (lastRun) {
        const age = Date.now() - Number(lastRun);
        if (age < 24 * 60 * 60 * 1000) {
          console.log(`[Cleanup skipped] Global assignments cleanup ran ${Math.round(age / 60000)} minutes ago (cooldown active)`);
          return;
        }
      }

      console.log(`[Cleanup starting] Querying assignments for user ${uid} to clean up heavy resources...`);
      const q = query(
        collection(db, 'assignments'),
        where('userId', '==', uid)
      );
      const snap = await getDocs(q);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      let updatedCount = 0;
      snap.forEach(async (dDoc) => {
        const data = dDoc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null);
        if (createdAt && createdAt < threeDaysAgo && data.images && data.images.length > 0) {
          updatedCount++;
          const docRef = doc(db, 'assignments', dDoc.id);
          await updateDoc(docRef, {
            images: [], // strip heavy base64 images
            imagesCleared: true,
            updatedAt: serverTimestamp()
          });
        }
      });
      
      safeStorage.setItem(lastRunKey, String(Date.now()));
      console.log(`[Cleanup complete] Checked ${snap.size} documents, cleaned up ${updatedCount} old submissions.`);
    } catch (e) {
      console.warn("Soft clean up old global submissions error:", e);
    }
  };

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

  const [currentView, setCurrentView] = useState<'courses' | 'profile' | 'prompts' | 'notifications' | 'assignments' | 'kycb' | 'blog'>(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'prompts') return 'prompts';
    if (view === 'profile') return 'profile';
    if (view === 'notifications') return 'notifications';
    if (view === 'assignments') return 'assignments';
    if (view === 'kycb') return 'kycb';
    if (view === 'blog') return 'blog';
    return 'courses';
  });

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('courseId') || null;
  });

  const [advancedPaymentCourse, setAdvancedPaymentCourse] = useState<any>(null);

  // Auto scroll window to top when selected course or view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedCourseId, currentView]);

  // Lazy-load full course details (lessons / days) when a course is selected
  useEffect(() => {
    if (!selectedCourseId) return;

    const targetCourse = courses.find(c => c.id === selectedCourseId);
    if (targetCourse && (!targetCourse.days || targetCourse.days.length === 0)) {
      const loadFullCourse = () => {
        try {
          const found = coursesStore.getCourses().find(c => c.id === selectedCourseId);
          if (found) {
            setCourses(prev => prev.map(c => c.id === selectedCourseId ? found : c));
          }
        } catch (err) {
          console.warn("Error lazy-loading course details:", err);
        }
      };
      loadFullCourse();
    }
  }, [selectedCourseId, courses]);

  const [submitDayIndex, setSubmitDayIndex] = useState<number>(0);
  const [submitLink, setSubmitLink] = useState('');
  const [submitText, setSubmitText] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [expandedAssignments, setExpandedAssignments] = useState<Record<number, boolean>>({});

  const uploadToSupabaseStorage = async (
    file: File, 
    bucket: string = 'assignments',
    projectId?: string,
    studentId?: string
  ): Promise<string> => {
    try {
      const uploadRes = await uploadToCloudinary(file, bucket, projectId, studentId);
      return uploadRes.url;
    } catch (err: any) {
      console.error("Cloudinary upload failed:", err);
      throw err;
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    if (view === 'prompts') {
      setCurrentView('prompts');
    } else if (view === 'profile') {
      setCurrentView('profile');
    } else if (view === 'courses') {
      setCurrentView('courses');
    } else if (view === 'assignments') {
      setCurrentView('assignments');
    } else if (view === 'kycb') {
      setCurrentView('kycb');
    } else if (view === 'blog') {
      setCurrentView('blog');
    } else if (view === 'notifications') {
      setCurrentView('notifications');
    } else {
      setCurrentView('courses');
    }

    const cId = params.get('courseId') || null;
    setSelectedCourseId(cId);

    if (view === 'assignments') {
      if (cId) {
        setSelectedAssignCourseId(cId);
      }
      const dayIdxParam = params.get('dayIndex');
      if (dayIdxParam !== null && dayIdxParam !== '') {
        const val = parseInt(dayIdxParam, 10);
        if (!isNaN(val)) {
          setSubmitDayIndex(val);
        }
      }
    }
  }, [location.search]);

  const [appSettings, setAppSettings] = useState<any>(() => {
    try {
      const cached = safeStorage.getItem('ciya_cached_app_settings');
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      return {};
    }
  });
  const [allMySubmissions, setAllMySubmissions] = useState<any[]>(() => {
    try {
      const cached = safeStorage.getItem('ciya_cached_student_assignments');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [selectedAssignCourseId, setSelectedAssignCourseId] = useState<string | null>(null);
  const [leaderboardConfig, setLeaderboardConfig] = useState<any>(() => {
    try {
      const cached = safeStorage.getItem('ciya_cached_leaderboard_config');
      return cached ? JSON.parse(cached) : { allowedCohorts: ['Cohort 3'] };
    } catch (e) {
      return { allowedCohorts: ['Cohort 3'] };
    }
  });
  const [selectedLeaderboardCohort, setSelectedLeaderboardCohort] = useState<string>('');

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'assignments'),
      where('userId', '==', currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => {
        const data = doc.data();
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

        return { id: doc.id, ...data, submittedText, images } as any;
      });

      // Sort list by createdAt descending so that the most recent submission is always first
      list.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });

      setAllMySubmissions(list);
      try {
        safeStorage.setItem('ciya_cached_student_assignments', JSON.stringify(list));
      } catch (e) {}
    }, (error) => {
      console.error("Error loading student assignments:", error);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Automated delay-based compliance check processor (client-side executor)
  useEffect(() => {
    if (!currentUser || !allMySubmissions || !appSettings || !courses || courses.length === 0) return;

    let isMounted = true;
    const processActiveDelays = async () => {
      const nowStr = new Date().toISOString();
      const pendingExpiredSubmissions = allMySubmissions.filter((sub: any) => {
        return (
          sub.status === 'Pending' &&
          sub.autoApproveAt &&
          nowStr >= sub.autoApproveAt
        );
      });

      if (pendingExpiredSubmissions.length === 0) return;

      for (const sub of pendingExpiredSubmissions) {
        try {
          const course = courses.find(c => c.id === sub.courseId);
          if (!course) continue;
          
          const isBeginnerCourse = ['najnq9llx', 'psw96tm5o', 'qlpspor4hm'].includes(course.id || '');
          let assignmentConfig = course.days?.[sub.dayIndex]?.assignment;
          const dayKey = `day-${sub.dayIndex}`;
          const customConfig = appSettings?.assignmentSettings?.[dayKey];
          
          if (isBeginnerCourse && customConfig && customConfig.enabled) {
            assignmentConfig = {
              prompt: assignmentConfig?.prompt || '',
              dueNote: assignmentConfig?.dueNote || '',
              autoApprove: customConfig.autoApprove,
              minChars: customConfig.minChars,
              requireLink: customConfig.requireLink,
              minScreenshots: customConfig.minScreenshots,
              requiredKeywords: customConfig.requiredKeywords,
              approveComment: customConfig.approveComment,
              disapproveComment: customConfig.disapproveComment
            };
          }

          const evalRes = evaluateComplianceAndGetStatus(
            assignmentConfig,
            sub.submittedText || '',
            sub.fileUrl || '',
            sub.images || []
          );

          const finalStatus = evalRes.status;
          const finalReason = evalRes.status === 'Approved'
            ? (customConfig?.approveComment || "Excellent submission! All compliance checks passed automatically. Next day unlocked.")
            : evalRes.adminReason;

          const dataWithStatus = {
            text: sub.submittedText || '',
            link: sub.fileUrl || '',
            images: sub.images || [],
            status: finalStatus,
            adminReason: finalReason,
            submittedAt: sub.submittedAt || new Date().toISOString()
          };

          // 1. Update the student's assignment document in the global assignments collection
          const subRef = doc(db, 'assignments', sub.id);
          await updateDoc(subRef, {
            status: finalStatus,
            adminReason: finalReason,
            gradedBy: 'Academy Coordinator',
            gradedAt: serverTimestamp()
          });

          // 2. Update the student's user doc progress
          const userRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userRef, {
            [`progress.${sub.courseId}.submissions.day-${sub.dayIndex}`]: dataWithStatus,
            updatedAt: serverTimestamp()
          });

          // 3. Trigger notification alert
          const cleanReason = (finalReason || '').replace(/^Automated Compliance:\s*/i, '');
          const unlockInfo = getNextDayUnlockStatus(sub.dayIndex + 1, appSettings);
          await addDoc(collection(db, 'notifications'), {
            userId: currentUser.uid,
            title: finalStatus === 'Approved' ? `Assignment Approved! 🎉` : `Assignment Needs Correction ❌`,
            message: finalStatus === 'Approved'
              ? unlockInfo.message
              : `Your assignment for Day ${sub.dayIndex + 1} did not meet requirements: "${cleanReason}". Please fix and resubmit.`,
            type: 'assignment_graded',
            isRead: false,
            triggeredBy: 'Academy Coordinator',
            createdAt: serverTimestamp()
          });

          if (isMounted) {
            if (finalStatus === 'Approved') {
              showToast(unlockInfo.toast);
            } else {
              showToast(`Submission Needs Correction: ${cleanReason} ❌`);
            }
          }
        } catch (err) {
          console.error("Error processing client-side auto-approval update:", err);
        }
      }
    };

    // Run check immediately on mount/update
    processActiveDelays();

    // Set up a polling check every 2 seconds to handle real-time timer expiration
    const interval = setInterval(() => {
      processActiveDelays();
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUser, allMySubmissions, appSettings, courses]);

  const handleDashboardAssignmentSubmit = async (dayIndex: number, data: any) => {
    const activeCId = selectedAssignCourseId || (registeredCoursesList && registeredCoursesList[0]?.id);
    if (!activeCId) return;
    try {
      const course = courses.find(c => c.id === activeCId);
      const isBeginnerCourse = ['najnq9llx', 'psw96tm5o', 'qlpspor4hm'].includes(course?.id || '');
      let assignmentConfig = course?.days?.[dayIndex]?.assignment;
      const dayKey = `day-${dayIndex}`;
      const customConfig = appSettings?.assignmentSettings?.[dayKey];
      if (isBeginnerCourse && customConfig && customConfig.enabled) {
        assignmentConfig = {
          prompt: assignmentConfig?.prompt || '',
          dueNote: assignmentConfig?.dueNote || '',
          autoApprove: customConfig.autoApprove,
          minChars: customConfig.minChars,
          requireLink: customConfig.requireLink,
          minScreenshots: customConfig.minScreenshots,
          requiredKeywords: customConfig.requiredKeywords,
          approveComment: customConfig.approveComment,
          disapproveComment: customConfig.disapproveComment
        };
      }

      const evalRes = evaluateComplianceAndGetStatus(
        assignmentConfig,
        data.text || '',
        data.link || '',
        data.images || []
      );

      let autoApproveAt: string | null = null;
      let finalStatus: 'Pending' | 'Approved' | 'Disapproved' = evalRes.status;
      let customToastMessage = "";

      if (isBeginnerCourse && customConfig && customConfig.enabled && evalRes.status === 'Approved') {
        const delay = customConfig.approvalDelay || 'instant';
        if (delay !== 'instant') {
          let minutes = 0;
          let delayLabel = "";
          if (delay === '10m') { minutes = 10; delayLabel = "10 minutes"; }
          else if (delay === '20m') { minutes = 20; delayLabel = "20 minutes"; }
          else if (delay === '30m') { minutes = 30; delayLabel = "30 minutes"; }
          else if (delay === '1h') { minutes = 60; delayLabel = "1 hour"; }

          if (minutes > 0) {
            finalStatus = 'Pending';
            autoApproveAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
            customToastMessage = "Assignment submitted successfully! Under review by our team.";
          }
        }
      }

      const dataWithStatus = {
        ...data,
        status: finalStatus,
        adminReason: finalStatus === 'Pending' && autoApproveAt ? "Approval delay timer is active." : evalRes.adminReason,
        submittedAt: new Date().toISOString()
      };

      const updatedProfile = {
        ...userProfile,
        progress: {
          ...(userProfile?.progress || {}),
          [activeCId]: {
            ...(userProfile?.progress?.[activeCId] || {}),
            submissions: {
              ...(userProfile?.progress?.[activeCId]?.submissions || {}),
              [`day-${dayIndex}`]: dataWithStatus
            }
          }
        }
      };
      setUserProfile(updatedProfile);
      safeStorage.setItem('ciya_cached_profile', JSON.stringify(updatedProfile));

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        [`progress.${activeCId}.submissions.day-${dayIndex}`]: dataWithStatus,
        updatedAt: serverTimestamp()
      });

      const combinedText = data.images && data.images.length > 0
        ? (data.text || '') + "\n\n---IMAGES_JSON---\n" + JSON.stringify(data.images)
        : (data.text || '');

      const cohort = userProfile?.cohort || 'Cohort 1';

      // Check if there is an existing submission (disapproved) to update or add new
      const existingSub = allMySubmissions?.find(s => s.courseId === activeCId && s.dayIndex === dayIndex);

      if (existingSub) {
        const subRef = doc(db, 'assignments', existingSub.id);
        await updateDoc(subRef, {
          submittedText: combinedText,
          fileUrl: data.link || '',
          images: data.images || [],
          status: finalStatus,
          cohort: cohort,
          adminReason: finalStatus === 'Pending' && autoApproveAt ? "Approval delay timer is active." : evalRes.adminReason,
          autoApproveAt: autoApproveAt,
          createdAt: serverTimestamp()
        });
      } else {
        // Also append to global assignments collection so it displays in Assignments Inbox
        await addDoc(collection(db, 'assignments'), {
          userId: currentUser.uid,
          userEmail: currentUser.email || userProfile?.email || 'student@ciya.com',
          userName: userProfile?.fullName || currentUser.displayName || 'Invited Student',
          courseId: activeCId,
          dayIndex: dayIndex,
          submittedText: combinedText,
          fileUrl: data.link || '',
          fileName: data.link ? 'Live URL Link' : '',
          status: finalStatus,
          cohort: cohort,
          adminReason: finalStatus === 'Pending' && autoApproveAt ? "Approval delay timer is active." : evalRes.adminReason,
          autoApproveAt: autoApproveAt,
          createdAt: serverTimestamp()
        });
      }

      const cleanReason = (evalRes.adminReason || '').replace(/^Automated Compliance:\s*/i, '');

      if (finalStatus !== 'Pending') {
        const unlockInfo = getNextDayUnlockStatus(dayIndex + 1, appSettings);
        await addDoc(collection(db, 'notifications'), {
          userId: currentUser.uid,
          title: finalStatus === 'Approved' ? `Assignment Approved! 🎉` : `Assignment Needs Correction ❌`,
          message: finalStatus === 'Approved'
            ? unlockInfo.message
            : `Your assignment for Day ${dayIndex + 1} did not meet requirements: "${cleanReason}". Please fix and resubmit.`,
          type: 'assignment_graded',
          isRead: false,
          triggeredBy: 'Academy Coordinator',
          createdAt: serverTimestamp()
        });

        if (finalStatus === 'Approved') {
          showToast(unlockInfo.toast);
        } else {
          showToast(`Submission Needs Correction: ${cleanReason} ❌`);
        }
      } else {
        if (autoApproveAt && customToastMessage) {
          showToast(customToastMessage);
        } else {
          showToast("Assignment submitted successfully!");
        }
      }
    } catch (e) {
      console.error("Error submitting assignment:", e);
    }
  };

  useEffect(() => {
    // Read from cache instantly on mount
    try {
      const cached = safeStorage.getItem('ciya_cached_app_settings');
      if (cached) {
        setAppSettings(JSON.parse(cached));
      }
    } catch (e) {
      console.warn("Error parsing cached app settings on mount", e);
    }
  }, []);

  // Custom Robust Data Synchronization and Loader
  useEffect(() => {
    // We can run this whenever a user session is active (or if cached user exists)
    const activeUid = currentUser?.uid || (() => {
      try {
        const cached = safeStorage.getItem('ciya_cached_user');
        if (cached) return JSON.parse(cached).uid;
      } catch (e) {}
      return null;
    })();

    if (!activeUid) {
      setLoading(false);
      return;
    }

    let isSubscribed = true;

    // First load from cache if available, otherwise rely on snapshot listeners to load and sync
    setLoading(false);

    // Completely deactivated system_signals observer to block all non-essential background database reads
    const unsubSignals = () => {};

    // Set up a direct real-time listener on the user's own profile doc with visibility gating!
    let unsubProfile: (() => void) | null = null;
    let unsubRtdbProfile: (() => void) | null = null;
    // Set up a direct real-time listener on the portal locks settings doc!
    let unsubSettings: (() => void) | null = null;
    let unsubLeaderboard: (() => void) | null = null;

    const startSettingsListener = () => {
      if (unsubSettings) return;
      // Always use high-performance real-time Firestore listener to ensure absolute reliability
      unsubSettings = onSnapshot(doc(db, 'settings', 'app'), (snapshot) => {
        if (!isSubscribed) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          setAppSettings(data);
          safeStorage.setItem('ciya_cached_app_settings', JSON.stringify(data));
        }
      }, (error) => {
        console.warn("Soft handling direct real-time settings app listener error:", error);
      });
    };

    const startLeaderboardConfigListener = () => {
      if (unsubLeaderboard) return;
      unsubLeaderboard = onSnapshot(doc(db, 'settings', 'leaderboard_config'), (snapshot) => {
        if (!isSubscribed) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          setLeaderboardConfig(data);
          safeStorage.setItem('ciya_cached_leaderboard_config', JSON.stringify(data));
        }
      }, (error) => {
        console.warn("Error in real-time leaderboard config listener:", error);
      });
    };

    const startProfileListener = () => {
      if (unsubProfile) return;
      unsubProfile = onSnapshot(doc(db, 'users', activeUid), (snapshot) => {
        if (!isSubscribed) return;
        if (snapshot.exists()) {
          const profileData = snapshot.data();
          setUserProfile(profileData);
          safeStorage.setItem('ciya_cached_profile', JSON.stringify(profileData));
          if (!cleanupPerformedRef.current) {
            cleanupPerformedRef.current = true;
            cleanUpOldSubmissionsLocal(activeUid, profileData.progress);
            cleanUpOldGlobalSubmissions(activeUid);
          }
        } else {
          // Auto-provision profile document if it does not exist
          if (currentUser && currentUser.uid === activeUid) {
            if (currentUser.email?.toLowerCase() === 'developermike5@gmail.com') {
              const mockProfile = {
                fullName: "Admissions Administrator (Super Admin)",
                email: currentUser.email,
                whatsapp: "+00000000000",
                state: "Admin State",
                goal: "Previewing Student Dashboard",
                approvalStatus: "Approved",
                isActivated: true,
                isDashboardUnlocked: true,
                role: "super_admin",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              };
              setDoc(doc(db, 'users', activeUid), mockProfile).catch(e => {
                console.warn("Auto-creation of admin profile document from listener failed:", e);
              });
              setUserProfile(mockProfile);
              safeStorage.setItem('ciya_cached_profile', JSON.stringify(mockProfile));
            } else {
              const newProfile = {
                fullName: currentUser.displayName || currentUser.email?.split('@')[0] || 'CIYA Scholar',
                email: currentUser.email,
                approvalStatus: 'Approved',
                isActivated: true,
                isDashboardUnlocked: true,
                cohort: 'Cohort 1',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              };
              setDoc(doc(db, 'users', activeUid), newProfile).catch(e => {
                console.warn("Auto-creation of profile document from listener failed:", e);
              });
              setUserProfile(newProfile);
              safeStorage.setItem('ciya_cached_profile', JSON.stringify(newProfile));
            }
          }
        }
        setLiveCheckComplete(true);
      }, async (error) => {
        console.warn("Soft handling direct real-time user profile listener error, falling back to direct getDoc:", error);
        try {
          const docRef = doc(db, 'users', activeUid);
          const snapshot = await getDoc(docRef);
          if (!isSubscribed) return;
          if (snapshot.exists()) {
            const profileData = snapshot.data();
            setUserProfile(profileData);
            safeStorage.setItem('ciya_cached_profile', JSON.stringify(profileData));
            if (!cleanupPerformedRef.current) {
              cleanupPerformedRef.current = true;
              cleanUpOldSubmissionsLocal(activeUid, profileData.progress);
              cleanUpOldGlobalSubmissions(activeUid);
            }
          } else {
            // Auto-provision profile document if it does not exist
            if (currentUser && currentUser.uid === activeUid) {
              if (currentUser.email?.toLowerCase() === 'developermike5@gmail.com') {
                const mockProfile = {
                  fullName: "Admissions Administrator (Super Admin)",
                  email: currentUser.email,
                  whatsapp: "+00000000000",
                  state: "Admin State",
                  goal: "Previewing Student Dashboard",
                  approvalStatus: "Approved",
                  isActivated: true,
                  isDashboardUnlocked: true,
                  role: "super_admin",
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                };
                await setDoc(doc(db, 'users', activeUid), mockProfile);
                setUserProfile(mockProfile);
                safeStorage.setItem('ciya_cached_profile', JSON.stringify(mockProfile));
              } else {
                const newProfile = {
                  fullName: currentUser.displayName || currentUser.email?.split('@')[0] || 'CIYA Scholar',
                  email: currentUser.email,
                  approvalStatus: 'Approved',
                  isActivated: true,
                  isDashboardUnlocked: true,
                  cohort: 'Cohort 1',
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                };
                await setDoc(doc(db, 'users', activeUid), newProfile);
                setUserProfile(newProfile);
                safeStorage.setItem('ciya_cached_profile', JSON.stringify(newProfile));
              }
            }
          }
        } catch (getDocErr) {
          console.error("Direct fallback getDoc for user profile failed too:", getDocErr);
        } finally {
          setLiveCheckComplete(true);
        }
      });
    };

    startProfileListener();
    startSettingsListener();
    startLeaderboardConfigListener();

    return () => {
      isSubscribed = false;
      if (unsubProfile) unsubProfile();
      if (unsubRtdbProfile) unsubRtdbProfile();
      if (unsubSettings) unsubSettings();
      if (unsubLeaderboard) unsubLeaderboard();
    };
  }, [currentUser]);

  const [timeLeft, setTimeLeft] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const cached = safeStorage.getItem('ciya_cached_user');
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

  const [dbNotifications, setDbNotifications] = useState<any[]>([]);

  // Subscriptions to notifications
  useEffect(() => {
    if (!currentUser) return;
    const targets = ['all', currentUser.uid];
    if (isAdmin) {
      targets.push('admins_group');
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', targets),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setDbNotifications(list);
    }, (error) => {
      console.warn("Soft handling error loading db notifications:", error);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, isAdmin]);

  const unreadNotificationsCount = dbNotifications.filter(x => !x.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadList = dbNotifications.filter(x => !x.isRead);
      for (const item of unreadList) {
        await updateDoc(doc(db, 'notifications', item.id), { isRead: true });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsPopupOpen, setIsNotificationsPopupOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [liveCheckComplete, setLiveCheckComplete] = useState(() => {
    const cachedProfile = safeStorage.getItem('ciya_cached_profile');
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile);
        return parsed && parsed.approvalStatus === 'Approved';
      } catch (e) {}
    }
    return false;
  });
  
  const [activeSkillFilter, setActiveSkillFilter] = useState<string>('all');
  const [courseLevelFilter, setCourseLevelFilter] = useState<'beginner' | 'advanced'>(() => {
    return (safeStorage.getItem('ciya_course_level_filter') as 'beginner' | 'advanced') || 'beginner';
  });
  const [activeDurationFilter, setActiveDurationFilter] = useState<'standard' | 'express'>('standard');
  const navigate = useNavigate();

  const handleViewChange = (view: 'courses' | 'profile' | 'prompts' | 'notifications' | 'assignments' | 'kycb' | 'blog', cId: string | null = null) => {
    setCurrentView(view);
    setSelectedCourseId(cId);
    setIsMobileMenuOpen(false);
    if (cId) {
      navigate(`/dashboard?view=${view}&courseId=${cId}`);
    } else {
      navigate(`/dashboard?view=${view}`);
    }
  };

  const handleSelectCourseId = (cId: string | null) => {
    if (cId && !isAdmin) {
      const targetCourse = courses.find(c => c.id === cId);
      if (targetCourse) {
        const isRegistered = registeredCoursesList.some(r => r.id === cId);
        const isAdv = targetCourse.tier === 'advanced' || targetCourse.tier === 'masterclass' || targetCourse.level === 'Advanced' || targetCourse.level === 'Masterclass';
        if (!isAdv) {
          if (!isRegistered && !hasCompletedFirstCourse) {
            alert("Access Restricted: You must fully complete your first assigned course path from onboarding (100% video lessons completed) before enrolling or switching to other curriculum tracks.");
            return;
          }
        }
      }
    }
    setSelectedCourseId(cId);
    if (cId) {
      navigate(`/dashboard?view=${currentView}&courseId=${cId}`);
    } else {
      navigate(`/dashboard?view=${currentView}`);
    }
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
      const resetTime = new Date().toISOString();
      const updatedProfile = {
        ...userProfile,
        progress: {
          ...(userProfile?.progress || {}),
          [cId]: {
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
            quizScores: {},
            resetAt: resetTime,
            completedAt: null
          }
        }
      };
      setUserProfile(updatedProfile);
      safeStorage.setItem('ciya_cached_profile', JSON.stringify(updatedProfile));

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
          quizScores: {},
          resetAt: resetTime,
          completedAt: null
        },
        updatedAt: serverTimestamp()
      });
      showToast("Lesson progression, quizzes, and score sheet successfully reset!");
    } catch (err) {
      console.error("Error resetting progress:", err);
      showToast("Sync fail resetting progress, please try again.");
    }
  };

  // Selected Course playing state (Managed via URL parameters sync in useEffect above)

  const handleCustomAssignmentSubmit = async () => {
    if (!currentUser) return;
    const activeAssignCourseId = selectedAssignCourseId || (registeredCoursesList && registeredCoursesList[0]?.id);
    let registeredCourse = registeredCoursesList.find(c => c.id === activeAssignCourseId) || registeredCoursesList[0];
    if (!registeredCourse) {
      alert("No active course path assigned to submit an assignment for.");
      return;
    }

    // Auto-switch to express clone if student is on express track
    if (!isAdmin && registeredCourse) {
      const enrolledExpress = courses.find(c => c.clonedFromId === registeredCourse.id && c.isCloned && c.durationMode === 'express' && (
        (userProfile?.progress && userProfile.progress[c.id]) ||
        (userProfile?.progress?.[registeredCourse.id]?.durationMode === 'express')
      ));
      if (enrolledExpress) {
        registeredCourse = enrolledExpress;
      }
    }

    // Check duplicate submissions check
    const existingSub = allMySubmissions.find(s => s.courseId === registeredCourse.id && s.dayIndex === submitDayIndex);
    if (existingSub) {
      if (existingSub.status !== 'Disapproved') {
        alert(`You have already submitted an assignment for Day ${submitDayIndex + 1} which is currently in '${existingSub.status}' status. You cannot submit multiple assignments for the same day unless disapproved.`);
        return;
      }
    }

    // Check locking constraint check
    const daysList = registeredCourse.days || [];
    const progressStore = userProfile?.progress?.[registeredCourse.id] || { watched: [], checkPassed: [], submissions: {}, quizScores: {} };
    const completedKeys = progressStore.watched || [];
    const checkPassedKeys = progressStore.checkPassed || [];

    const lastUnlockedDayIdx = (() => {
      let lastIdx = 0;
      for (let idx = 0; idx < daysList.length; idx++) {
        const isUnlocked = idx === 0 || isDayUnlockedUnified(idx, daysList, completedKeys, allMySubmissions, !!registeredCourse.isCloned, userProfile, registeredCourse.id, appSettings);
        if (isUnlocked) {
          lastIdx = idx;
        }
      }
      return lastIdx;
    })();

    if (submitDayIndex > lastUnlockedDayIdx) {
      alert(`Day ${submitDayIndex + 1} assignment is currently locked. Complete preceding days' lessons and assignments to unlock!`);
      return;
    }

    const hasImages = uploadedImages.length > 0;
    const hasLink = !!submitLink.trim();
    const hasText = !!submitText.trim();

    if (!hasImages && !hasLink && !hasText) {
      alert("Please provide at least one submission option: paste a live link, write a description, or upload a screenshot image.");
      return;
    }

    if (uploadedImages.length > 3) {
      alert("You may upload a maximum of 3 screenshot images.");
      return;
    }

    setSubmittingAssignment(true);
    try {
      const isBeginnerCourse = ['najnq9llx', 'psw96tm5o', 'qlpspor4hm'].includes(registeredCourse.id);
      let assignmentConfig = registeredCourse.days?.[submitDayIndex]?.assignment;
      
      const dayKey = `day-${submitDayIndex}`;
      const customConfig = appSettings?.assignmentSettings?.[dayKey];
      if (isBeginnerCourse && customConfig && customConfig.enabled) {
        assignmentConfig = {
          prompt: assignmentConfig?.prompt || '',
          dueNote: assignmentConfig?.dueNote || '',
          autoApprove: customConfig.autoApprove,
          minChars: customConfig.minChars,
          requireLink: customConfig.requireLink,
          minScreenshots: customConfig.minScreenshots,
          requiredKeywords: customConfig.requiredKeywords,
          approveComment: customConfig.approveComment,
          disapproveComment: customConfig.disapproveComment
        };
      }

      const evalRes = evaluateComplianceAndGetStatus(
        assignmentConfig,
        submitText,
        submitLink,
        uploadedImages
      );

      let autoApproveAt: string | null = null;
      let finalStatus: 'Pending' | 'Approved' | 'Disapproved' = evalRes.status;
      let customToastMessage = "";

      if (isBeginnerCourse && customConfig && customConfig.enabled && evalRes.status === 'Approved') {
        const delay = customConfig.approvalDelay || 'instant';
        if (delay !== 'instant') {
          let minutes = 0;
          let delayLabel = "";
          if (delay === '10m') { minutes = 10; delayLabel = "10 minutes"; }
          else if (delay === '20m') { minutes = 20; delayLabel = "20 minutes"; }
          else if (delay === '30m') { minutes = 30; delayLabel = "30 minutes"; }
          else if (delay === '1h') { minutes = 60; delayLabel = "1 hour"; }

          if (minutes > 0) {
            finalStatus = 'Pending';
            autoApproveAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
            customToastMessage = "Assignment submitted successfully! Under review by our team.";
          }
        }
      }

      const combinedSubmittedText = uploadedImages.length > 0
        ? submitText + "\n\n---IMAGES_JSON---\n" + JSON.stringify(uploadedImages)
        : submitText;

      const cohort = userProfile?.cohort || 'Cohort 1';

      if (existingSub) {
        // Update existing disapproved assignment document to calculated status
        const subRef = doc(db, 'assignments', existingSub.id);
        await updateDoc(subRef, {
          submittedText: combinedSubmittedText,
          fileUrl: submitLink,
          images: uploadedImages,
          status: finalStatus,
          cohort: cohort,
          adminReason: finalStatus === 'Pending' && autoApproveAt ? "Approval delay timer is active." : evalRes.adminReason,
          autoApproveAt: autoApproveAt,
          createdAt: serverTimestamp() // Set new timestamp so it moves to top of admin inbox
        });
      } else {
        // 1. Submit to assignments collection
        await addDoc(collection(db, 'assignments'), {
          userId: currentUser.uid,
          userEmail: currentUser.email || userProfile?.email || 'student@ciya.com',
          userName: userProfile?.fullName || currentUser.displayName || 'Invited Student',
          courseId: registeredCourse.id,
          dayIndex: submitDayIndex,
          submittedText: combinedSubmittedText,
          fileUrl: submitLink,
          images: uploadedImages,
          fileName: 'Live URL Link',
          status: finalStatus,
          cohort: cohort,
          adminReason: finalStatus === 'Pending' && autoApproveAt ? "Approval delay timer is active." : evalRes.adminReason,
          autoApproveAt: autoApproveAt,
          createdAt: serverTimestamp()
        });
      }

      const submissionData = {
        text: submitText,
        link: submitLink,
        images: uploadedImages,
        submittedAt: new Date().toISOString(),
        status: finalStatus,
        adminReason: finalStatus === 'Pending' && autoApproveAt ? "Approval delay timer is active." : evalRes.adminReason
      };

      // 2. Submit to student progress in users doc
      const updatedProfile = {
        ...userProfile,
        progress: {
          ...(userProfile?.progress || {}),
          [registeredCourse.id]: {
            ...(userProfile?.progress?.[registeredCourse.id] || {}),
            submissions: {
              ...(userProfile?.progress?.[registeredCourse.id]?.submissions || {}),
              [`day-${submitDayIndex}`]: submissionData
            }
          }
        }
      };
      setUserProfile(updatedProfile);
      safeStorage.setItem('ciya_cached_profile', JSON.stringify(updatedProfile));

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        [`progress.${registeredCourse.id}.submissions.day-${submitDayIndex}`]: submissionData,
        updatedAt: serverTimestamp()
      });

      const cleanReason = (evalRes.adminReason || '').replace(/^Automated Compliance:\s*/i, '');

      // 3. Trigger success notifications / toast
      if (finalStatus !== 'Pending') {
        const unlockInfo = getNextDayUnlockStatus(submitDayIndex + 1, appSettings);
        await addDoc(collection(db, 'notifications'), {
          userId: currentUser.uid,
          title: finalStatus === 'Approved' ? `Assignment Approved! 🎉` : `Assignment Needs Correction ❌`,
          message: finalStatus === 'Approved'
            ? unlockInfo.message
            : `Your assignment for Day ${submitDayIndex + 1} did not meet requirements: "${cleanReason}". Please fix and resubmit.`,
          type: 'assignment_graded',
          isRead: false,
          triggeredBy: 'Academy Coordinator',
          createdAt: serverTimestamp()
        });

        if (finalStatus === 'Approved') {
          showToast(unlockInfo.toast);
        } else {
          showToast(`Submission Needs Correction: ${cleanReason} ❌`);
        }
      } else {
        if (autoApproveAt && customToastMessage) {
          showToast(customToastMessage);
        } else {
          showToast("Assignment submitted successfully!");
        }
      }

      // Trigger success popup!
      setShowSuccessPopup(true);

      // Clear fields
      setSubmitLink('');
      setSubmitText('');
      setUploadedImages([]);
    } catch (e: any) {
      console.error(e);
      alert("Error submitting assignment: " + e.message);
    } finally {
      setSubmittingAssignment(false);
    }
  };

  // 5 Minutes Fun Fact popup state




    



  // Activation Gating and Popup States
  const [activationCode, setActivationCode] = useState('');
  const [activationError, setActivationError] = useState('');
  const [showCongratsPopup, setShowCongratsPopup] = useState(false);
  const [courseCompletionModal, setCourseCompletionModal] = useState<any | null>(null);
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
        const updatedProfile = {
          ...userProfile,
          isDashboardUnlocked: true
        };
        setUserProfile(updatedProfile);
        safeStorage.setItem('ciya_cached_profile', JSON.stringify(updatedProfile));

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

  const handleLogin = () => {
    setIsLoginOpen(true);
  };

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 1. Instantly set current user to unblock state
        setCurrentUser(user);
        
        // Cache-first offline profile loader
        const loadInitialProfile = () => {
          // 1. Immediately render cached profile if exists (Stale-While-Revalidate)
          const cachedProfile = safeStorage.getItem('ciya_cached_profile');
          if (cachedProfile) {
            try {
              const profileData = JSON.parse(cachedProfile);
              setUserProfile(profileData);
              if (!cleanupPerformedRef.current) {
                cleanupPerformedRef.current = true;
                cleanUpOldSubmissionsLocal(user.uid, profileData.progress);
                cleanUpOldGlobalSubmissions(user.uid);
              }
            } catch (e) {
              console.error("Error parsing cached profile on auth change:", e);
            }
          } else {
            // Setup default profile candidate to show while listener connects
            const defaultCandidate = {
              fullName: user.displayName || user.email?.split('@')[0] || "CIYA Scholar",
              email: user.email || "student@ciya.com",
              whatsapp: "+0000000000",
              state: "Global",
              goal: "Acquire high-performance development skills",
              approvalStatus: "Approved",
              isActivated: true,
              isDashboardUnlocked: true,
              cohort: 'Cohort 1'
            };
            setUserProfile(defaultCandidate);
          }
          // Always ensure authChecking is marked false and liveCheckComplete is true
          setAuthChecking(false);
          setLiveCheckComplete(true);
        };
        
        loadInitialProfile();

        // 2. Perform admin verification asynchronously in the background
        if (user.email?.toLowerCase() === 'developermike5@gmail.com') {
          setIsAdmin(true);
          // Auto-provision Super Admin records in public database
          try {
            setDoc(doc(db, 'admins', user.uid), {
              email: user.email?.toLowerCase() || 'developermike5@gmail.com',
              role: 'superadmin',
              permissions: ['all']
            }, { merge: true }).catch(e => console.warn("Auto-provision admins failed:", e));

            // Also ensure they have a user profile record so they show up in selectors/lists
            getDoc(doc(db, 'users', user.uid)).then(snap => {
              if (!snap.exists()) {
                setDoc(doc(db, 'users', user.uid), {
                  email: user.email?.toLowerCase() || 'developermike5@gmail.com',
                  fullName: 'Super Admin',
                  approvalStatus: 'Approved',
                  isDashboardUnlocked: true,
                  cohort: 'Cohort 1',
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                }).catch(e => console.warn("Auto-provision users failed:", e));
              }
            }).catch(e => console.warn("StudentDashboard getDoc users failed:", e));
          } catch (e) {
            console.warn("Could not auto-provision superadmin records:", e);
          }
        } else {
          // Check if upgraded admin
          getDoc(doc(db, 'admins', user.uid)).then((adminDocSnap) => {
            if (adminDocSnap.exists()) {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          }).catch((err) => {
            console.error("Dashboard auth check failed for admin state:", err);
            setIsAdmin(false);
          });
        }

      } else {
        // ALWAYS clear cached user/profile and reset state if Firebase says they are not authenticated!
        safeStorage.removeItem('ciya_cached_user');
        safeStorage.removeItem('ciya_cached_profile');
        setLiveCheckComplete(false);
        if (unsubSnapshot) {
          unsubSnapshot();
          unsubSnapshot = null;
        }
        setCurrentUser(null);
        setUserProfile(null);
        setAuthChecking(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubSnapshot) {
        unsubSnapshot();
      }
    };
  }, [navigate]);

  // Real-time profile synchronization is fully handled by the main visibility-gated user profile observer above

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

  useEffect(() => {
    if (!authChecking && !currentUser) {
      navigate('/?login=true', { replace: true });
    }
  }, [authChecking, currentUser, navigate]);

  // Set up real-time listener for published courses to ensure immediate synchronization with student dashboards
  useEffect(() => {
    if (authChecking) return;
    
    // Load courses instantly from cache
    const cached = coursesStore.getCourses();
    setCourses(cached || []);
    setLoading(false);
  }, [authChecking]);

  const isProfileRegisteredForCourse = (profile: any, course: any): boolean => {
    if (!profile || !course) return false;
    
    // Check if the student has explicit progress entry for this course
    if (profile.progress && profile.progress[course.id] && profile.progress[course.id].accessStatus !== 'revoked') {
      return true;
    }

    // Check if course ID or title is in registeredCourses array
    if (Array.isArray(profile.registeredCourses)) {
      if (profile.registeredCourses.includes(course.id) || profile.registeredCourses.includes(course.title)) {
        return true;
      }
    }

    // Advanced / Masterclass courses require progress or explicit registeredCourses entry
    const isAdv = course.tier === 'advanced' || course.tier === 'masterclass' || (course.level && ['advanced', 'masterclass'].includes(course.level.toLowerCase()));
    if (isAdv) {
      return false;
    }

    // Or if they have progress for its cloned express version, or selected express track on standard course
    const expressClone = courses.find(c => c.clonedFromId === course.id && c.isCloned && c.durationMode === 'express');
    if (expressClone && profile.progress && (
      (profile.progress[expressClone.id] && profile.progress[expressClone.id].accessStatus !== 'revoked') || 
      (profile.progress[course.id]?.durationMode === 'express' && profile.progress[course.id]?.accessStatus !== 'revoked')
    )) {
      return true;
    }

    // Exclude cloned courses entirely from matching onboarding selections
    if (course.isCloned) {
      return false;
    }

    // Fuzzy keyword matching based on onboarding path, course type and pathway selection
    const courseTitle = (course.title || '').toLowerCase();
    const courseSkillPath = (course.skillPath || '').toLowerCase();
    const courseCategory = (course.category || '').toLowerCase();

    const recPath = (profile.recommendedPath || '').toLowerCase();
    const courseType = (profile.courseType || profile.course || profile.registeredCourse || profile.selectedCourse || '').toLowerCase();
    const pathwaySel = (profile.pathwaySelection || '').toLowerCase();

    // Portfolio Path
    const isCoursePortfolio = courseTitle.includes('portfolio') || courseSkillPath.includes('portfolio') || courseCategory.includes('portfolio');
    const isProfilePortfolio = recPath.includes('portfolio') || courseType.includes('portfolio') || pathwaySel.includes('portfolio');
    if (isCoursePortfolio && isProfilePortfolio) {
      return true;
    }

    // Landing Page Path
    const isCourseLanding = courseTitle.includes('landing') || courseSkillPath.includes('landing') || courseCategory.includes('landing') || courseTitle.includes('conversion');
    const isProfileLanding = recPath.includes('landing') || courseType.includes('landing') || pathwaySel.includes('landing') || recPath.includes('conversion') || recPath.includes('funnel') || pathwaySel.includes('funnel');
    if (isCourseLanding && isProfileLanding) {
      return true;
    }

    // E-Commerce Path
    const isCourseEcommerce = courseTitle.includes('e-commerce') || courseTitle.includes('ecommerce') || courseSkillPath.includes('e-commerce') || courseSkillPath.includes('ecommerce') || courseTitle.includes('store') || courseCategory.includes('e-commerce') || courseCategory.includes('ecommerce');
    const isProfileEcommerce = recPath.includes('e-commerce') || recPath.includes('ecommerce') || courseType.includes('e-commerce') || courseType.includes('ecommerce') || pathwaySel.includes('e-commerce') || pathwaySel.includes('ecommerce') || recPath.includes('store') || pathwaySel.includes('store');
    if (isCourseEcommerce && isProfileEcommerce) {
      return true;
    }

    // Fallback: Direct exact or fuzzy match
    const courseTitleClean = courseTitle.trim();
    const profileRecommendedPathClean = recPath.trim();

    if (profileRecommendedPathClean && (
      courseTitleClean === profileRecommendedPathClean ||
      courseTitleClean.includes(profileRecommendedPathClean) ||
      profileRecommendedPathClean.includes(courseTitleClean)
    )) {
      return true;
    }

    return false;
  };

  // Filter courses by registration (Admins see everything, students see their matched / enrolled courses)
  const registeredCoursesList = useMemo(() => {
    if (!courses || courses.length === 0) return [];
    if (isAdmin) return courses;

    // Build a quick lookup of progress keys
    const progressKeys = userProfile?.progress 
      ? Object.keys(userProfile.progress).filter(k => userProfile.progress[k]?.accessStatus !== 'revoked') 
      : [];
    const progressSet = new Set(progressKeys);

    // Build a lookup of cloned express courses from standard course ID
    const standardToExpressCloneMap = new Map<string, string>();
    courses.forEach(c => {
      if (c.clonedFromId && c.isCloned && c.durationMode === 'express') {
        standardToExpressCloneMap.set(c.clonedFromId, c.id);
      }
    });

    // Check first matching index by title to de-duplicate efficiently
    const firstTitleIndexMap = new Map<string, number>();
    courses.forEach((c, idx) => {
      const cTitle = (c.title || '').trim().toLowerCase();
      if (!firstTitleIndexMap.has(cTitle)) {
        firstTitleIndexMap.set(cTitle, idx);
      }
    });

    return courses.filter((c, idx) => {
      if (c.isCloned || c.durationMode === 'express') return false;

      let isEnrolled = progressSet.has(c.id);

      if (!isEnrolled) {
        const expressCloneId = standardToExpressCloneMap.get(c.id);
        if (expressCloneId && progressSet.has(expressCloneId)) {
          isEnrolled = true;
        }
      }

      if (!isEnrolled && isProfileRegisteredForCourse(userProfile, c)) {
        isEnrolled = true;
      }

      if (!isEnrolled) return false;

      // De-duplicate registered courses by title
      const cTitle = (c.title || '').trim().toLowerCase();
      return firstTitleIndexMap.get(cTitle) === idx;
    });
  }, [courses, userProfile, isAdmin]);

  // Helper to check if student has completed their first course path (at least one registered course is 100% completed)
  const hasCompletedFirstCourse = useMemo((): boolean => {
    if (isAdmin) return true;
    if (!userProfile || !courses || courses.length === 0) return false;
    
    // Check if there is at least one registered course that the user has completed (progress = 100% or all quizzes passed)
    const registeredOnboarded = courses.filter(c => !c.isCloned && isProfileRegisteredForCourse(userProfile, c));
    for (const r of registeredOnboarded) {
      if (isCourseCompleted(userProfile, r)) {
        return true;
      }
    }
    return false;
  }, [courses, userProfile, isAdmin]);

  // Filter courses by standard vs. express durationMode (disabled: show all)
  const coursesToSee = courses;

  const enrolledCourses = isAdmin 
    ? coursesToSee 
    : registeredCoursesList;

  const notEnrolledCourses = useMemo(() => {
    if (isAdmin) return [];
    if (!courses || courses.length === 0) return [];

    // Build sets of registered course IDs and titles for O(1) lookup
    const registeredIds = new Set(registeredCoursesList.map(r => r.id));
    const registeredTitles = new Set(registeredCoursesList.map(r => (r.title || '').trim().toLowerCase()));

    // Precompute first matching title index map for de-duplication
    const firstTitleIndexMap = new Map<string, number>();
    courses.forEach((c, idx) => {
      const cTitle = (c.title || '').trim().toLowerCase();
      if (!firstTitleIndexMap.has(cTitle)) {
        firstTitleIndexMap.set(cTitle, idx);
      }
    });

    return courses.filter((c, idx) => {
      if (registeredIds.has(c.id)) return false;
      if (c.isCloned || c.durationMode === 'express') return false;

      const cTitle = (c.title || '').trim().toLowerCase();
      if (registeredTitles.has(cTitle)) return false;

      return firstTitleIndexMap.get(cTitle) === idx;
    });
  }, [courses, registeredCoursesList, isAdmin]);

  // Apply Skill tags sorting filters (locked courses are visible and carry padlocks)
  const filteredCourses = coursesToSee.filter(c => {
    if (activeSkillFilter !== 'all' && c.skill !== activeSkillFilter) return false;
    const isAdv = c.tier === 'advanced' || c.tier === 'masterclass' || c.level === 'Advanced' || c.level === 'Masterclass';
    if (courseLevelFilter === 'beginner' && isAdv) return false;
    if (courseLevelFilter === 'advanced' && !isAdv) return false;
    return true;
  });

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingProfilePhoto(true);
    try {
      const uploadRes = await uploadToCloudinary(file, 'profile_photos', undefined, currentUser?.uid);
      const imageUrl = uploadRes.url;
      
      setUserProfile((prev: any) => ({
        ...prev,
        photoURL: imageUrl
      }));

      // Automatically persist to Firestore in real-time so they don't have to manually click save
      if (currentUser?.uid) {
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'users', currentUser.uid), {
          photoURL: imageUrl,
          updatedAt: serverTimestamp()
        });
      }

      alert("Profile photo uploaded successfully!");
    } catch (err) {
      console.error("Failed to upload profile photo:", err);
      alert("Failed to upload profile photo. Please try again.");
    } finally {
      setUploadingProfilePhoto(false);
    }
  };

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
        photoURL: userProfile.photoURL || '',
        updatedAt: serverTimestamp()
      });
      safeStorage.setItem('ciya_cached_profile', JSON.stringify(userProfile));
      safeStorage.setItem('ciya_cached_profile_time', Date.now().toString());
      setEditingProfile(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error(error);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = async () => {
    safeStorage.removeItem('ciya_cached_user');
    safeStorage.removeItem('ciya_cached_profile');
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
    navigate('/?login=true');
  };

  const isGuest = !currentUser || !userProfile;

  const approvalStatus = userProfile?.approvalStatus || 'Pending';
  const isApproved = approvalStatus === 'Approved';
  const isPending = approvalStatus === 'Pending';
  const isDisapproved = approvalStatus === 'Disapproved';

  const filteredRegisteredCourses = enrolledCourses.filter(c => {
    if (activeSkillFilter !== 'all' && c.skill !== activeSkillFilter) return false;
    const isAdv = c.tier === 'advanced' || c.tier === 'masterclass' || c.level === 'Advanced' || c.level === 'Masterclass';
    if (courseLevelFilter === 'beginner' && isAdv) return false;
    if (courseLevelFilter === 'advanced' && !isAdv) return false;
    return true;
  });

  const filteredOtherCourses = notEnrolledCourses.filter(c => {
    if (activeSkillFilter !== 'all' && c.skill !== activeSkillFilter) return false;
    const isAdv = c.tier === 'advanced' || c.tier === 'masterclass' || c.level === 'Advanced' || c.level === 'Masterclass';
    if (courseLevelFilter === 'beginner' && isAdv) return false;
    if (courseLevelFilter === 'advanced' && !isAdv) return false;
    return true;
  });

  // Course completion congrats checker
  useEffect(() => {
    if (!currentUser || !userProfile || !courses || courses.length === 0 || isAdmin) return;

    for (const r of registeredCoursesList) {
      const progressStore = userProfile.progress?.[r.id || ''] || { watched: [], checkPassed: [], submissions: {}, quizScores: {} };
      const completedKeys: string[] = progressStore.watched || [];
      const totalVideos = r.days?.reduce((sum: number, d: any) => sum + (d.videos?.length || 0), 0) || 0;
      const progressRatio = totalVideos > 0 ? Math.round((completedKeys.length / totalVideos) * 100) : 0;
      
      const isCompleted = progressRatio === 100 && totalVideos > 0;
      const alreadyCongratulated = userProfile.congratulatedCourses?.includes(r.id);
      const isDismissedInSession = dismissedCongratsCoursesRef.current.includes(r.id);

      if (isCompleted && !alreadyCongratulated && !isDismissedInSession) {
        setCourseCompletionModal(r);
        break;
      }
    }
  }, [currentUser, userProfile, courses, registeredCoursesList, isAdmin]);

  const isNewUser = useMemo(() => {
    if (!userProfile || !userProfile.createdAt) return true;
    let creationTimeVal = new Date().getTime();
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
    const now = new Date().getTime();
    return (now - creationTimeVal) < 24 * 60 * 60 * 1000;
  }, [userProfile]);

  const timeOfDayGreeting = useMemo(() => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const nigeriaOffset = 1; // West Africa Time is UTC+1
    const nigeriaDate = new Date(utc + (3600000 * nigeriaOffset));
    const localHour = nigeriaDate.getHours();

    if (localHour >= 5 && localHour < 12) {
      return { text: "Good Morning", emoji: "🌅", desc: "Start your day by building something remarkable today!" };
    } else if (localHour >= 12 && localHour < 17) {
      return { text: "Good Afternoon", emoji: "☀️", desc: "Keep up the momentum! Consistency is the secret of tech experts." };
    } else if (localHour >= 17 && localHour < 22) {
      return { text: "Good Evening", emoji: "🌆", desc: "Perfect time to review your concepts and complete check questions." };
    } else {
      return { text: "Good Night", emoji: "🌙", desc: "Late night coding creates champions. Secure your learning progress before rest!" };
    }
  }, []);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-6">
        <div className="flex flex-col items-center justify-center max-w-sm w-full text-center animate-pulse">
          <BrandingLogo size="lg" theme="light" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-6">
        <div className="flex flex-col items-center justify-center max-w-sm w-full text-center animate-pulse">
          <BrandingLogo size="lg" theme="light" />
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-6">
        <div className="flex flex-col items-center justify-center max-w-sm w-full text-center animate-pulse">
          <BrandingLogo size="lg" theme="light" />
        </div>
      </div>
    );
  }

  const handleDismissCompletionCongrats = async (courseId: string) => {
    try {
      if (!dismissedCongratsCoursesRef.current.includes(courseId)) {
        dismissedCongratsCoursesRef.current.push(courseId);
      }

      const currentCongratulated = userProfile?.congratulatedCourses || [];
      const updatedCongratulated = [...currentCongratulated];
      if (!updatedCongratulated.includes(courseId)) {
        updatedCongratulated.push(courseId);
      }

      const updatedProfile = {
        ...userProfile,
        congratulatedCourses: updatedCongratulated
      };
      setUserProfile(updatedProfile);
      safeStorage.setItem('ciya_cached_profile', JSON.stringify(updatedProfile));

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        congratulatedCourses: updatedCongratulated,
        updatedAt: serverTimestamp()
      });
      setCourseCompletionModal(null);
    } catch (err) {
      console.error("Error updating congratulated courses:", err);
      setCourseCompletionModal(null);
    }
  };

  let selectedCourse = courses.find(c => c.id === selectedCourseId);
  if (selectedCourse && !selectedCourse.isCloned && !isAdmin) {
    // If the selected course is a standard course, check if the student is enrolled in its cloned express version instead,
    // or if they have selected the express track for the standard course!
    const enrolledExpress = courses.find(c => c.clonedFromId === selectedCourseId && c.isCloned && c.durationMode === 'express' && (
      (userProfile?.progress?.[c.id]) ||
      (userProfile?.progress?.[selectedCourseId]?.durationMode === 'express')
    ));
    if (enrolledExpress) {
      selectedCourse = enrolledExpress;
    }
  }

  // Master Full-Screen Gating Page for Unapproved or Locked Users (No dashboard UI visible)
  if (!isAdmin && !isGuest && userProfile?.isDashboardUnlocked !== true) {
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
            
            <div className="text-slate-900 text-sm leading-relaxed max-w-md mx-auto space-y-3 font-semibold">
              <p>
                Hello <strong className="text-slate-900 font-extrabold">{userProfile?.fullName || 'Student'}</strong>! Thank you for lodging your request. Your onboarding metrics are currently under active verification.
              </p>
            </div>

            {/* Urgent WhatsApp Activation Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-left space-y-3 relative overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Direct Admission Approval Link</span>
              </div>
              <h3 className="text-base font-black text-slate-950 leading-snug">⚠️ Get Approved Immediately</h3>
              <p className="text-slate-700 text-xs leading-relaxed font-semibold">
                Your student onboarding has been submitted. Contact our admissions officer on WhatsApp now to get your profile reviewed and activated instantly!
              </p>
              {(() => {
                const reqMsg = `Hello Admissions! I have successfully completed my onboarding profile on the CIYA Digital Academy. Could you please verify and unlock my student dashboard access? My name is ${userProfile?.fullName || 'Student'} (${userProfile?.email || currentUser?.email || ''}). Thank you!`;
                const whatsappUrl = `https://api.whatsapp.com/send?phone=2349042544355&text=${encodeURIComponent(reqMsg)}`;
                return (
                  <a 
                    href={whatsappUrl}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-all duration-200 hover:-translate-y-0.5 shadow-md shadow-emerald-600/10 w-full cursor-pointer border-0 text-center no-underline uppercase tracking-wider"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>Contact Admin for Approval 🚀</span>
                  </a>
                );
              })()}
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
              Hello <strong>{userProfile?.fullName || 'Student'}</strong>! After reviewing your submitted metrics, we regret to notify that you were not chosen for this specific cohort. We received a massive scale of CIYA Five days Free Website Development Training requests. We wish you rapid career velocity!
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
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-teal-400 via-emerald-500 to-indigo-600"></div>
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100 mx-auto">
              <Lock className="w-8 h-8 text-amber-500 animate-bounce" />
            </div>
            <div className="space-y-4">
              <span className="inline-block bg-amber-100 text-amber-800 text-xs font-black uppercase px-3 py-1 rounded-full">
                Dashboard Locked 🔒
              </span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Access Verification Required</h2>
              <p className="text-slate-700 text-base leading-relaxed max-w-md mx-auto font-semibold">
                Congratulations, <strong className="text-teal-800 font-bold">{userProfile?.fullName || 'Scholar'}</strong>! Your student onboarding profile has been registered successfully.
              </p>
              <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
                Your learning dashboard is currently locked. To activate your full learning access, please contact the administrator via WhatsApp below to verify and unlock your account.
              </p>
            </div>

            <div className="max-w-sm mx-auto space-y-4">
              {(() => {
                const reqMsg = `Hello Admissions! I have successfully completed my onboarding profile on the CIYA Digital Academy. Could you please verify and unlock my student dashboard access? My name is ${userProfile?.fullName || ''} (${userProfile?.email || currentUser?.email || ''}). Thank you!`;
                const whatsappUrl = `https://api.whatsapp.com/send?phone=2349042544355&text=${encodeURIComponent(reqMsg)}`;
                return (
                  <a 
                    href={whatsappUrl}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-base transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-emerald-600/30 w-full cursor-pointer border-0 text-center no-underline"
                  >
                    <MessageCircle className="w-5 h-5 fill-white" />
                    <span>Contact Admin to Unlock 🚀</span>
                  </a>
                );
              })()}
            </div>

            <div className="w-full">
              <SubmissionDetailsCard profile={userProfile} />
            </div>

            <div className="border-t border-slate-100 pt-5 text-center">
              <p className="text-slate-500 text-xs leading-relaxed">
                Once approved by the administrators, your dashboard will automatically unlock and grant you full access. You do not need any activation codes.
              </p>
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
      <aside className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed md:sticky md:top-0 md:h-screen inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
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
            onClick={() => handleViewChange('courses', null)}
            className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl transition-all border-0 cursor-pointer ${currentView === 'courses' ? 'bg-teal-600 text-white font-black shadow-sm' : 'text-slate-100 bg-transparent font-extrabold hover:bg-slate-800/60 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <Compass className="w-4 h-4" />
              <span>Explore Courses</span>
            </div>
            {!isAdmin && appSettings?.lockedSections?.courses && (
              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
          </button>

          {!isGuest && (
            <button 
              type="button"
              onClick={() => handleViewChange('assignments', null)}
              className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl transition-all border-0 cursor-pointer ${currentView === 'assignments' ? 'bg-teal-600 text-white font-black shadow-sm' : 'text-slate-100 bg-transparent font-extrabold hover:bg-slate-800/60 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>My Assignments</span>
              </div>
              {!isAdmin && appSettings?.lockedSections?.assignments && (
                <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
            </button>
          )}

          <button 
            type="button"
            onClick={() => handleViewChange('prompts', null)}
            className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl transition-all border-0 cursor-pointer ${currentView === 'prompts' ? 'bg-teal-600 text-white font-black shadow-sm' : 'text-slate-100 bg-transparent font-extrabold hover:bg-slate-800/60 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Prompt Template</span>
            </div>
            {!isAdmin && appSettings?.lockedSections?.prompts && (
              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
          </button>

          {!isGuest && (
            <button 
              type="button"
              onClick={() => handleViewChange('kycb', null)}
              className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl transition-all border-0 cursor-pointer ${currentView === 'kycb' ? 'bg-teal-600 text-white font-black shadow-sm' : 'text-slate-100 bg-transparent font-extrabold hover:bg-slate-800/60 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>KYCB Sheet & Data</span>
              </div>
              {!isAdmin && appSettings?.lockedSections?.kycb && (
                <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
            </button>
          )}

          <button 
            type="button"
            onClick={() => handleViewChange('blog', null)}
            className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl transition-all border-0 cursor-pointer ${currentView === 'blog' ? 'bg-teal-600 text-white font-black shadow-sm' : 'text-slate-100 bg-transparent font-extrabold hover:bg-slate-800/60 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 flex items-center justify-center text-rose-400 text-xs">📰</span>
              <span>CIYA Official Blog</span>
            </div>
            {!isAdmin && appSettings?.lockedSections?.blog && (
              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
          </button>

          {!isGuest && (
            <button 
              type="button"
              onClick={() => handleViewChange('notifications', null)}
              className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl transition-all border-0 cursor-pointer ${currentView === 'notifications' ? 'bg-teal-600 text-white font-black shadow-sm' : 'text-slate-100 bg-transparent font-extrabold hover:bg-slate-800/60 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Notification Desk</span>
              </div>
              <div className="flex items-center gap-2">
                {unreadNotificationsCount > 0 && (
                  <span className="bg-rose-550 text-white text-[9px] font-black px-2 py-0.5 rounded-full shrink-0">
                    {unreadNotificationsCount}
                  </span>
                )}
                {!isAdmin && appSettings?.lockedSections?.notifications && (
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
              </div>
            </button>
          )}
          {!isGuest && (
            <button 
              type="button"
              onClick={() => handleViewChange('profile', null)}
              className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl transition-all border-0 cursor-pointer ${currentView === 'profile' ? 'bg-teal-600 text-white font-black shadow-sm' : 'text-slate-100 bg-transparent font-extrabold hover:bg-slate-800/60 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <UserIcon className="w-4 h-4 text-sky-400" />
                <span>My Profile Settings</span>
              </div>
              {!isAdmin && appSettings?.lockedSections?.profile && (
                <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
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
      <main className={`flex-1 flex flex-col items-stretch h-screen overflow-hidden transition-all duration-500 ${courseLevelFilter === 'advanced' ? 'bg-gradient-to-br from-purple-100/30 via-indigo-50/40 to-fuchsia-100/20' : 'bg-slate-50/50'}`}>
        <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40 shadow-sm">
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
                  : currentView === 'notifications'
                    ? 'Notification Desk'
                    : currentView === 'assignments'
                      ? 'My Assignments Workspace'
                      : currentView === 'kycb'
                        ? 'KYCB Workspace (Know Your Client & Business)'
                        : currentView === 'blog'
                          ? 'CIYA News & Resource Desk'
                          : 'Prompt Template Lab'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {!dbNetworkEnabled && (
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-1 text-amber-700 animate-pulse" title="Database Offline (All changes are kept in local storage)">
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[9px] font-black tracking-wider uppercase hidden sm:inline">Cache Mode</span>
              </div>
            )}
            {!isGuest && (
              <div className="relative z-50">
                <button 
                  onClick={() => setIsNotificationsPopupOpen(!isNotificationsPopupOpen)}
                  className={`p-2.5 rounded-full cursor-pointer transition-all relative border-0 flex items-center justify-center outline-none ${
                    isNotificationsPopupOpen || currentView === 'notifications' 
                      ? 'bg-amber-50 text-amber-600 ring-2 ring-amber-500/20' 
                      : 'text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                  title="View Alerts & Notifications"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center ring-2 ring-white">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {isNotificationsPopupOpen && (
                  <>
                    {/* Fixed full-screen transparent click catcher */}
                    <div 
                      className="fixed inset-0 z-[100] bg-transparent cursor-default" 
                      onClick={() => setIsNotificationsPopupOpen(false)}
                    />
                    
                    {/* Pop-up dropdown */}
                    <div className="absolute right-[-70px] xs:right-[-64px] sm:right-0 mt-2.5 w-[280px] xs:w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3.5 z-[101] text-left font-sans">
                      <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                        <span className="font-extrabold text-slate-800 text-sm">Notifications</span>
                        {unreadNotificationsCount > 0 && (
                          <button 
                            type="button"
                            onClick={handleMarkAllAsRead}
                            className="text-[10px] font-black text-teal-600 hover:text-teal-700 bg-transparent border-0 cursor-pointer p-0"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100/60">
                        {dbNotifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-slate-400 text-xs font-semibold">
                            No notifications yet
                          </div>
                        ) : (
                          dbNotifications.slice(0, 5).map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => {
                                handleMarkAsRead(notif.id);
                              }}
                              className={`p-3.5 transition-colors cursor-pointer relative hover:bg-slate-50 flex gap-2.5 ${!notif.isRead ? 'bg-amber-50/20' : ''}`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${!notif.isRead ? 'bg-amber-500' : 'bg-transparent'}`} />
                              <div className="space-y-1 flex-1">
                                <p className="text-xs text-slate-800 font-bold leading-relaxed">{notif.title}</p>
                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{notif.message}</p>
                                {notif.createdAt && (
                                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                                    {new Date(notif.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="px-4 pt-2.5 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            handleViewChange('notifications');
                            setIsNotificationsPopupOpen(false);
                          }}
                          className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-teal-600 hover:text-teal-700 text-xs font-black transition-colors border-0 cursor-pointer"
                        >
                          See More
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
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
          {currentView === 'blog' ? (
            <StudentBlog isLocked={!isAdmin && appSettings?.lockedSections?.blog} />
          ) : currentView === 'kycb' ? (
            (!isAdmin && appSettings?.lockedSections?.kycb) ? (
              <div className="bg-white border text-sm border-slate-200 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm my-6 font-sans">
                <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">KYCB Portal Locked</h3>
                <p className="text-slate-500 mt-3 text-sm leading-relaxed font-semibold">
                  The KYCB (Know Your Client & Business) onboarding questions sheet is temporarily locked by administrators. Please reach out to your certified coach or coordinator to unlock this questionnaire!
                </p>
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center items-center gap-2 text-xs text-slate-400 font-bold">
                  <span>🛡️ CIYA Guarded Academy Portal</span>
                </div>
              </div>
            ) : (
              <AdminKycbQuestionnaire
                isAdminMode={false}
                userId={currentUser?.uid}
                userEmail={currentUser?.email || userProfile?.email || ''}
                defaultClientName={userProfile?.fullName || currentUser?.displayName || ''}
              />
            )
          ) : currentView === 'prompts' ? (
            <PromptGenerator 
              isLocked={!isAdmin && appSettings?.lockedSections?.prompts} 
              hasYearBadge={isBadgeActive(userProfile)}
              onTriggerBadgePurchase={() => setShowDashboardBadgePaymentModal(true)}
              userProfile={userProfile}
              setUserProfile={setUserProfile}
              currentUser={currentUser}
              appSettings={appSettings}
            />
          ) : currentView === 'profile' ? (
            (!isAdmin && appSettings?.lockedSections?.profile) ? (
              <div className="bg-white border text-sm border-slate-200 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm my-6 font-sans">
                <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Profile Settings Locked</h3>
                <p className="text-slate-500 mt-3 text-sm leading-relaxed font-semibold">
                  Student profile customization controls are temporarily locked by the administrators. Please contact your coordinator to modify your personal information!
                </p>
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center items-center gap-2 text-xs text-slate-400 font-bold">
                  <span>🛡️ CIYA Guarded Academy Portal</span>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6 text-left font-sans my-4">
                
                {/* CARD 1: PERSONAL PROFILE INFORMATION */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm text-slate-800">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Personal Profile Information</h3>
                        <p className="text-xs text-slate-500 font-medium">Manage your contact details, location, and primary learning goal.</p>
                      </div>
                    </div>
                    {!editingProfile && (
                      <button 
                        type="button"
                        onClick={() => setEditingProfile(true)}
                        className="flex items-center gap-1.5 text-xs text-indigo-700 hover:text-indigo-800 font-extrabold bg-indigo-50 hover:bg-indigo-100 px-4 py-2 border border-indigo-200/80 rounded-xl cursor-pointer transition-all shrink-0 self-start sm:self-auto"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                      </button>
                    )}
                  </div>
                  
                  {editingProfile ? (
                    <form onSubmit={handleProfileSave} className="space-y-4 text-left">
                      {/* Photo Upload Area */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-indigo-500 overflow-hidden shrink-0 flex items-center justify-center font-black text-2xl text-slate-700 shadow-sm">
                          {userProfile.photoURL ? (
                            <img src={userProfile.photoURL} alt="Profile preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span>{userProfile.fullName ? userProfile.fullName[0].toUpperCase() : 'U'}</span>
                          )}
                        </div>
                        <div className="flex-1 space-y-1 text-center sm:text-left">
                          <label className="block text-[10px] uppercase font-bold text-slate-500">Student Profile Photo</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePhotoChange}
                            disabled={uploadingProfilePhoto}
                            id="student-profile-photo-upload-input"
                            className="hidden"
                          />
                          <label
                            htmlFor="student-profile-photo-upload-input"
                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black uppercase rounded-lg border border-indigo-200 cursor-pointer text-center inline-block"
                          >
                            {uploadingProfilePhoto ? 'Uploading image...' : 'Choose Profile Photo'}
                          </label>
                          <p className="text-[9px] text-slate-400 font-semibold">Will be embedded inside your high-fidelity membership badge!</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
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
                    <div className="space-y-6 text-xs md:text-sm text-left font-sans">
                      {/* Photo & Basic details header */}
                      <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                        <div className="w-20 h-20 rounded-full border-2 border-indigo-500 bg-slate-150 shrink-0 overflow-hidden flex items-center justify-center text-slate-700 text-2xl font-black shadow-sm relative group cursor-pointer" title="Click badge template to upload custom photo">
                          {userProfile.photoURL ? (
                            <img src={userProfile.photoURL} alt="Profile photo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span>{userProfile.fullName ? userProfile.fullName[0].toUpperCase() : 'U'}</span>
                          )}
                        </div>
                        <div className="space-y-1 text-center sm:text-left">
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{userProfile.fullName || 'Anonymous Student'}</h4>
                            {isBadgeActive(userProfile) ? (
                              <span className="inline-block bg-indigo-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">CIYA Student Pro</span>
                            ) : (
                              <span className="inline-block bg-slate-100 text-slate-700 border border-slate-300 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                                Basic Student
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-mono font-bold">{userProfile.email || currentUser?.email}</p>
                        </div>
                      </div>

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
                          <p className="text-slate-400 font-bold text-[10px] uppercase mb-0.5">My Primary Learning Goal</p>
                          <p className="text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 italic mt-1 font-medium">{userProfile.goal || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* CARD 2: REGISTERED COURSES & ACTIVE LEARNING */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm text-slate-800">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Registered Courses & Active Learning</h3>
                      <p className="text-xs text-slate-500 font-medium">All course pathways you have registered for and are actively pursuing.</p>
                    </div>
                  </div>

                  {registeredCoursesList && registeredCoursesList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {registeredCoursesList.map((course, idx) => {
                        const courseId = course.id || '';
                        const isSelected = selectedCourseId === courseId || (!selectedCourseId && idx === 0);
                        const progressObj = userProfile.progress?.[courseId] || {};
                        const completedCount = progressObj.completedVideos ? Object.keys(progressObj.completedVideos).length : 0;
                        const totalLessons = course.days ? course.days.reduce((acc: number, d: any) => acc + (d.videos?.length || 0), 0) : 0;
                        const pct = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;
                        const isAdv = course.tier === 'advanced' || course.tier === 'masterclass' || course.level === 'Advanced';

                        return (
                          <div 
                            key={courseId}
                            className={`p-5 rounded-2xl border transition-all text-left flex flex-col justify-between gap-4 ${
                              isSelected 
                                ? 'border-teal-500 bg-teal-50/20 shadow-sm ring-1 ring-teal-500/30' 
                                : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                  isAdv ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {isAdv ? 'Advanced Course' : "Beginner's Course"}
                                </span>
                                
                                {isSelected && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black uppercase tracking-wider animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Actively Studying
                                  </span>
                                )}
                              </div>

                              <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{course.title}</h4>
                              <p className="text-xs text-slate-500 line-clamp-2">{course.subtitle || course.description}</p>
                            </div>

                            <div className="space-y-3 pt-2 border-t border-slate-200/60">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                <span>Progress ({pct}%)</span>
                                <span>{completedCount}/{totalLessons} Lessons</span>
                              </div>
                              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-teal-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCourseId(courseId);
                                  setCurrentView('courses');
                                }}
                                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-sm flex items-center justify-center gap-1.5"
                              >
                                Study Course →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                      <span className="text-3xl block">📚</span>
                      <h4 className="font-black text-slate-800 text-sm uppercase">No Registered Courses Found</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">You haven't registered for any course pathway yet. Explore our curriculum to get started!</p>
                      <button
                        type="button"
                        onClick={() => setCurrentView('courses')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl cursor-pointer transition-all"
                      >
                        Browse Available Courses
                      </button>
                    </div>
                  )}
                </div>

                {/* CARD 3: CIYA PRO MEMBERSHIP & OFFICIAL BADGE */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm text-slate-800">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">CIYA Pro Membership & Official Badge</h3>
                      <p className="text-xs text-slate-500 font-medium">Your verified 30-day membership badge within the CIYA Ecosystem.</p>
                    </div>
                  </div>

                  {isBadgeActive(userProfile) ? (
                    <div className="space-y-4">
                      {/* Membership status countdown alert banner */}
                      {(() => {
                        const now = Date.now();
                        const expiry = getBadgeExpiryTimestamp(userProfile);
                        const daysLeft = expiry > 0 ? Math.ceil((expiry - now) / (24 * 60 * 60 * 1000)) : 0;
                        const dateString = expiry > 0 ? new Date(expiry).toLocaleDateString() : '2026';
                        
                        if (daysLeft <= 0) {
                          return (
                            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold leading-relaxed space-y-3">
                              <p>
                                ⚠️ <strong>Membership Expired:</strong> Your CIYA Membership ended on {dateString}. Please contact your administrator or purchase a new 30-day membership badge to reactivate your credentials.
                              </p>
                              <button
                                type="button"
                                onClick={() => setShowDashboardBadgePaymentModal(true)}
                                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer border-0 shadow-sm transition-all flex items-center gap-1.5"
                              >
                                🏷️ Renew Badge Membership
                              </button>
                            </div>
                          );
                        } else if (daysLeft <= 3) {
                          return (
                            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-semibold leading-relaxed animate-pulse">
                              ⏰ <strong>Near Expiry Alert:</strong> Your premium "CIYA Student Pro" membership status is going to end soon in <strong>{daysLeft} days</strong> (on {dateString}). Please renew in advance to avoid access interruption!
                            </div>
                          );
                        } else {
                          return (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold leading-relaxed">
                              ✓ <strong>Active Pro Student Member:</strong> Your premium CIYA Student Pro membership is active. You have <strong>{daysLeft} days remaining</strong> (expires on {dateString}).
                            </div>
                          );
                        }
                      })()}

                      {/* Interactive Badge Canvas with embedded click-to-upload circular photo frame */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center shadow-inner gap-4">
                        <p className="text-xs text-slate-500 font-bold text-center">
                          💡 <em>Tip: Click the circular photo logo directly on the badge template to upload your custom photo!</em>
                        </p>
                        
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePhotoChange}
                          disabled={uploadingProfilePhoto}
                          id="student-badge-photo-upload-input"
                          className="hidden"
                        />

                        <CIYAMembershipBadge 
                          data={{
                            fullName: userProfile.fullName || 'CIYA Student',
                            email: userProfile.email || currentUser?.email || 'student@example.com',
                            courseName: 'Advanced Website Development',
                            membershipId: userProfile.membershipId || 'CIYA-PRO-2026-XXXX',
                            expiryDate: (() => {
                              const ts = getBadgeExpiryTimestamp(userProfile);
                              if (ts > 0) return new Date(ts).toISOString();
                              return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                            })(),
                            photoURL: userProfile.photoURL || ''
                          }}
                          onPhotoUpload={() => {
                            const input = document.getElementById('student-badge-photo-upload-input');
                            if (input) input.click();
                          }}
                          uploadingPhoto={uploadingProfilePhoto}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-3">
                      <span className="text-3xl block">🔒</span>
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">No Active Badge Found</h4>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-md mx-auto">
                        You do not currently have an active 30-day CIYA Membership Badge. Upgrade to "CIYA Student Pro" to unlock benefits and display your verified credentials.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowDashboardBadgePaymentModal(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl cursor-pointer transition-all"
                      >
                        🏷️ Purchase Badge Membership
                      </button>
                    </div>
                  )}
                </div>

                {/* CARD 4: COURSE QUIZ SCORESHEETS & ASSIGNMENT SUBMISSIONS */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm text-slate-800">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Course Quiz Scoresheets & Submissions</h3>
                      <p className="text-xs text-slate-500 font-medium">Your verified first-attempt quiz scores and assignment submission records.</p>
                    </div>
                  </div>

                  {/* Student Submission details card */}
                  <div className="mb-6">
                    <SubmissionDetailsCard profile={userProfile} />
                  </div>

                  {/* Quizzes and Checks Score Sheet */}
                  {registeredCoursesList.some(c => userProfile.progress?.[c.id || '']?.quizScores) ? (
                    <div className="space-y-4">
                      {registeredCoursesList.map(course => {
                        const courseId = course.id || '';
                        const cScores = userProfile.progress?.[courseId]?.quizScores || {};
                        if (Object.keys(cScores).length === 0) return null;

                        return (
                          <div key={courseId} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left">
                            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 mb-3">
                              <span className="font-extrabold text-xs text-slate-900">📚 {course.title}</span>
                            </div>

                            <div className="space-y-2.5">
                              {course.days.map((day, dIdx) => {
                                const quizzes = (day.videos || []).filter(v => v.checkType && v.checkType !== 'none');
                                if (quizzes.length === 0) return null; // Skip days with no quizzes

                                const isExpanded = !!expandedDays[`${courseId}-${dIdx}`];
                                
                                const dayScores = quizzes.map((q) => {
                                  const vIdx = (day.videos || []).findIndex(v => v.id === q.id);
                                  const scoreKey = `${dIdx}-${vIdx}`;
                                  const scoreRecord = cScores[scoreKey];
                                  return {
                                    video: q,
                                    scoreRecord,
                                    vIdx
                                  };
                                });

                                const attemptedCount = dayScores.filter(item => item.scoreRecord).length;
                                const passedCount = dayScores.filter(item => item.scoreRecord?.passed).length;
                                
                                const totalScoreSum = dayScores.reduce((sum, item) => sum + (item.scoreRecord?.score || 0), 0);
                                const avgScore = attemptedCount > 0 ? Math.round(totalScoreSum / attemptedCount) : null;

                                return (
                                  <div key={dIdx} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
                                    {/* Accordion Header */}
                                    <button
                                      type="button"
                                      onClick={() => setExpandedDays(prev => ({
                                        ...prev,
                                        [`${courseId}-${dIdx}`]: !prev[`${courseId}-${dIdx}`]
                                      }))}
                                      className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 transition-all text-left border-0 cursor-pointer outline-none"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs font-black text-slate-800">
                                          Day {dIdx + 1}: {day.title}
                                        </span>
                                        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full">
                                          {quizzes.length} {quizzes.length === 1 ? 'Quiz' : 'Quizzes'}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2.5">
                                        {attemptedCount > 0 && (
                                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                            passedCount === quizzes.length 
                                              ? 'bg-emerald-50 text-emerald-700' 
                                              : 'bg-amber-50 text-amber-700'
                                          }`}>
                                            {passedCount}/{quizzes.length} Cleared {avgScore !== null && `(Avg: ${avgScore}%)`}
                                          </span>
                                        )}
                                        <span className="text-slate-400 text-xs font-black">
                                          {isExpanded ? '▲' : '▼'}
                                        </span>
                                      </div>
                                    </button>

                                    {/* Accordion Content */}
                                    {isExpanded && (
                                      <div className="p-3 divide-y divide-slate-100 bg-white border-t border-slate-100">
                                        {dayScores.map(({ video, scoreRecord, vIdx }, idx) => {
                                          const hasRecord = !!scoreRecord;
                                          const score = scoreRecord?.score;
                                          const passed = scoreRecord?.passed;

                                          return (
                                            <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                                              <div className="flex items-start gap-2.5 max-w-sm">
                                                <span className="text-slate-400 font-black font-mono shrink-0 mt-0.5">L{vIdx + 1}</span>
                                                <div>
                                                  <p className="font-extrabold text-slate-900 leading-tight">{video.title}</p>
                                                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">First attempted: {scoreRecord?.answeredAt || 'Never'}</p>
                                                </div>
                                              </div>

                                              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                                <div className="text-right">
                                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">First Attempt Score</span>
                                                  <span className={`font-black font-mono text-sm ${hasRecord ? 'text-slate-900' : 'text-slate-400'}`}>
                                                    {hasRecord ? `${score}%` : '—'}
                                                  </span>
                                                </div>

                                                <span className={`px-2 py-1 rounded text-[9px] font-black tracking-wide border ${
                                                  !hasRecord 
                                                    ? 'bg-slate-50 text-slate-400 border-slate-200' 
                                                    : passed 
                                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                                }`}>
                                                  {!hasRecord ? 'NOT ATTEMPTED' : passed ? 'PASSED' : 'RETAKE NEEDED'}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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
            )
          ) : currentView === 'notifications' ? (
            (!isAdmin && appSettings?.lockedSections?.notifications) ? (
              <div className="bg-white border text-sm border-slate-200 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm my-6 font-sans">
                <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Notification Desk Locked</h3>
                <p className="text-slate-500 mt-3 text-sm leading-relaxed font-semibold">
                  The student broadcast notification desk is temporarily locked by administrators. Broadcasters will restore communications when live updates are issued.
                </p>
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center items-center gap-2 text-xs text-slate-400 font-bold">
                  <span>🛡️ CIYA Guarded Academy Portal</span>
                </div>
              </div>
            ) : (
              <div className="bg-white border text-sm border-slate-200 rounded-3xl p-6 md:p-8 max-w-2xl mx-auto shadow-sm space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b pb-4 mb-2">
                <div className="space-y-0.5 text-left">
                  <span className="text-[10px] uppercase tracking-wider text-teal-600 font-black block">Notification Desk</span>
                  <h3 className="text-base md:text-lg font-black text-slate-800">🔔 My Inbox & Announcements</h3>
                </div>
                {unreadNotificationsCount > 0 && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    className="text-xs font-black text-teal-600 hover:text-teal-700 bg-teal-50 px-3.5 py-1.5 rounded-full border-0 cursor-pointer transition-colors"
                  >
                    Mark all read ✓
                  </button>
                )}
              </div>

              {dbNotifications.length === 0 ? (
                <div className="text-center py-16 text-slate-400 uppercase font-black text-xs space-y-3">
                  <div className="text-3xl animate-pulse">🔔</div>
                  <p className="tracking-widest">Your Inbox is silent.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dbNotifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                      className={`p-4 border rounded-2xl text-left transition-colors relative overflow-hidden cursor-pointer ${
                        notif.isRead 
                          ? 'bg-slate-50/40 border-slate-200' 
                          : 'bg-indigo-50/10 border-indigo-200 ring-2 ring-indigo-550/40'
                      }`}
                    >
                      {!notif.isRead && (
                        <span className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
                      )}
                      <div className="flex items-center justify-between gap-3 font-sans">
                        <strong className="text-slate-900 font-extrabold text-xs md:text-sm">{notif.title}</strong>
                        <span className="text-[9px] text-slate-400 font-mono font-bold">
                          {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleDateString() : 'Just Now'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-semibold leading-relaxed mt-2 whitespace-pre-wrap bg-white/70 p-3 rounded-xl border border-slate-100">{notif.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )
          ) : currentView === 'assignments' ? (
            (!isAdmin && appSettings?.lockedSections?.assignments) ? (
              <div className="bg-white border text-sm border-slate-200 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm my-6 font-sans">
                <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Assignment Submission Desk Locked</h3>
                <p className="text-slate-500 mt-3 text-sm leading-relaxed font-semibold">
                  The dedicated assignment submission portal is temporarily locked by administrators. Please contact your certified coach or coordinator to unlock assignments review!
                </p>
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center items-center gap-2 text-xs text-slate-400 font-bold">
                  <span>🛡️ CIYA Guarded Academy Portal</span>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-6 font-sans pb-16 text-left">
                {/* Clean, descriptive Title without course selection tabs or course description/detail cards */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-2">
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200/55 font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    Academy Assignment Portal
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">📥 Assignment Submission Desk</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Submit your daily workspace checklists and live deployments below. Your registered curriculum track is automatically mapped.
                  </p>
                </div>

                {/* Active Registered Courses / Submission Channels */}
                {registeredCoursesList.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200/85 rounded-3xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        Your Active Registered {registeredCoursesList.length === 1 ? 'Course' : 'Courses'} ({registeredCoursesList.length})
                      </span>
                      <span className="text-[10px] font-black text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {registeredCoursesList.length === 1 ? '1 Active Track' : `${registeredCoursesList.length} Submission Channels`}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {registeredCoursesList.map((course) => {
                        const activeAssignCId = selectedAssignCourseId || (registeredCoursesList && registeredCoursesList[0]?.id);
                        const isActive = activeAssignCId === course.id;
                        const isClickable = registeredCoursesList.length > 1;
                        return (
                          <button
                            key={course.id}
                            type="button"
                            disabled={!isClickable}
                            onClick={() => {
                              if (isClickable) {
                                setSelectedAssignCourseId(course.id);
                                setSubmitDayIndex(0);
                              }
                            }}
                            className={`flex flex-col text-left p-4 rounded-2xl transition-all border outline-none ${
                              isActive
                                ? 'bg-white border-teal-500 shadow-md ring-2 ring-teal-500/10'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/30'
                            } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            <span className={`text-[9px] font-black uppercase tracking-wider mb-1 px-1.5 py-0.5 rounded self-start ${
                              isActive ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {course.level || course.tier || 'Active'}
                            </span>
                            <span className="text-xs font-black text-slate-950 line-clamp-2 leading-snug">{course.title}</span>
                            <span className="text-[10px] text-slate-400 font-semibold mt-1">
                              {course.days?.length || 5} Daily Modules
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Main Form Fields */}
                {(() => {
                  // Find registered course
                  const activeAssignCourseId = selectedAssignCourseId || (registeredCoursesList && registeredCoursesList[0]?.id);
                  let registeredCourse = registeredCoursesList.find(c => c.id === activeAssignCourseId) || registeredCoursesList[0];
                  if (registeredCourse && !isAdmin) {
                    const enrolledExpress = courses.find(c => c.clonedFromId === registeredCourse.id && c.isCloned && c.durationMode === 'express' && (
                      (userProfile?.progress && userProfile.progress[c.id] && userProfile.progress[c.id].accessStatus !== 'revoked') ||
                      (userProfile?.progress?.[registeredCourse.id]?.durationMode === 'express' && userProfile.progress?.[registeredCourse.id]?.accessStatus !== 'revoked')
                    ));
                    if (enrolledExpress) {
                      registeredCourse = enrolledExpress;
                    }
                  }

                  if (!registeredCourse) {
                    return (
                      <div className="bg-white border text-center p-8 rounded-3xl text-xs font-black text-slate-400 uppercase">
                        No active course path assigned to submit assignments for.
                      </div>
                    );
                  }

                  const daysList = registeredCourse.days || [];
                  const matchedSubForSelectedDay = allMySubmissions.find(s => s.courseId === registeredCourse.id && s.dayIndex === submitDayIndex);

                  const progressStore = userProfile?.progress?.[registeredCourse.id] || { watched: [], checkPassed: [], submissions: {}, quizScores: {} };
                  const completedKeys = progressStore.watched || [];
                  const checkPassedKeys = progressStore.checkPassed || [];

                  const lastUnlockedDayIdx = (() => {
                    let lastIdx = 0;
                    for (let idx = 0; idx < daysList.length; idx++) {
                      const isUnlocked = idx === 0 || isDayUnlockedUnified(idx, daysList, completedKeys, allMySubmissions, !!registeredCourse.isCloned, userProfile, registeredCourse.id, appSettings);
                      if (isUnlocked) {
                        lastIdx = idx;
                      }
                    }
                    return lastIdx;
                  })();

                  const isDaySelectedLocked = submitDayIndex > lastUnlockedDayIdx;

                  return (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                      <h4 className="text-sm font-black text-slate-900 border-b pb-3 flex items-center gap-2">
                        <span>📝 Submit Draft Form</span>
                        <span className="text-xs font-bold text-slate-400">({registeredCourse.title})</span>
                      </h4>

                      {/* Day Selection dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Select Assignment Day</label>
                        <select
                          value={submitDayIndex}
                          onChange={(e) => setSubmitDayIndex(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl py-3 px-4 font-bold text-xs focus:border-indigo-500 outline-none transition-all shadow-inner border-box cursor-pointer"
                        >
                          {Array.from({ length: daysList.length || 5 }).map((_, idx) => {
                            const isUnlocked = idx === 0 || isDayUnlockedUnified(idx, daysList, completedKeys, allMySubmissions, !!registeredCourse.isCloned, userProfile, registeredCourse.id, appSettings);
                            return (
                              <option key={idx} value={idx}>
                                {isUnlocked ? "🔓" : "🔒"} Day {idx + 1}: {daysList[idx]?.title || `Module Study Checklist`} {!isUnlocked && " (Locked)"}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {isDaySelectedLocked ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-4">
                          <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
                            <Lock className="w-5 h-5 text-indigo-600" />
                          </div>
                          <h5 className="font-extrabold text-slate-900 text-sm md:text-base">Day {submitDayIndex + 1} Assignment Locked</h5>
                          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                            You must fully complete preceding days' curriculum modules and receive coach/admin approval for all preceding assignments to unlock Day {submitDayIndex + 1} assignment details and submission desk.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Display Assignment Prompt/Question here if available */}
                          {daysList[submitDayIndex]?.assignment?.prompt && (
                            <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-4 space-y-2 text-xs text-slate-850">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">📋</span>
                                <span className="font-black text-teal-900 uppercase tracking-wider">Day {submitDayIndex + 1} Assignment Question:</span>
                              </div>
                              <div className="font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {renderClickableLinks(daysList[submitDayIndex].assignment.prompt)}
                              </div>
                            </div>
                          )}

                          {/* Day status indicator */}
                          {matchedSubForSelectedDay && (
                            <div className={`p-4 rounded-2xl border text-xs font-semibold leading-relaxed ${
                              matchedSubForSelectedDay.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-205'
                                : matchedSubForSelectedDay.status === 'Disapproved'
                                  ? 'bg-rose-50 text-rose-800 border-rose-205'
                                  : 'bg-amber-50 text-amber-850 border-amber-205'
                            }`}>
                              <div className="flex items-center justify-between font-black uppercase tracking-wider text-[10px] mb-1.5">
                                <span>Status for Day {submitDayIndex + 1} Assignment:</span>
                                <span className={
                                  matchedSubForSelectedDay.status === 'Approved' ? 'text-emerald-700' :
                                  matchedSubForSelectedDay.status === 'Disapproved' ? 'text-rose-700' :
                                  'text-amber-700'
                                }>
                                  ● {matchedSubForSelectedDay.status === 'Approved' ? 'APPROVED ✓' : matchedSubForSelectedDay.status === 'Disapproved' ? 'DISAPPROVED ✗' : 'PENDING REVIEW'}
                                </span>
                              </div>
                              {(() => {
                                let displayText = matchedSubForSelectedDay.submittedText || '';
                                let displayImages: string[] = matchedSubForSelectedDay.images || [];
                                if (displayText.includes('---IMAGES_JSON---')) {
                                  const parts = displayText.split('---IMAGES_JSON---');
                                  displayText = parts[0].trim();
                                  try {
                                    displayImages = JSON.parse(parts[1].trim());
                                  } catch (e) {}
                                }
                                return (
                                  <div className="space-y-3">
                                    {displayText && (
                                      <p className="font-bold text-xs text-slate-700 whitespace-pre-wrap">
                                        <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[9px] block">Description / Summary</span>
                                        {displayText}
                                      </p>
                                    )}
                                    {displayImages && displayImages.length > 0 && (
                                      <div className="space-y-1.5">
                                        <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[9px] block">Workspace Screenshots</span>
                                        <div className="flex gap-2 flex-wrap">
                                          {displayImages.map((src, i) => (
                                            <a href={src} target="_blank" rel="noreferrer" key={i} className="relative block w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 hover:border-indigo-400 cursor-zoom-in transition-all">
                                              <img src={src} className="w-full h-full object-cover" alt="Screenshot" referrerPolicy="no-referrer" />
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                              {matchedSubForSelectedDay.fileUrl && (
                                <p className="font-mono text-indigo-600 mt-1">
                                  🔗 Link: <a href={matchedSubForSelectedDay.fileUrl} target="_blank" rel="noreferrer" className="underline">{matchedSubForSelectedDay.fileUrl}</a>
                                </p>
                              )}
                              {(() => {
                                const cleanFeedback = getCleanStudentFeedback(matchedSubForSelectedDay);
                                if (!cleanFeedback) return null;
                                return (
                                  <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200">
                                    <strong className="text-slate-800 font-black block mb-0.5">ℹ️ Feedback:</strong>
                                    {cleanFeedback}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {(!matchedSubForSelectedDay || matchedSubForSelectedDay.status === 'Disapproved') ? (
                            <div className="space-y-5">
                              {matchedSubForSelectedDay?.status === 'Disapproved' && (
                                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-xs font-semibold text-rose-800 leading-relaxed">
                                  Your previous submission was disapproved. Please update the details and resubmit below.
                                </div>
                              )}

                              {/* Link to paste */}
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Paste Assignment Link (Optional)</label>
                                <input
                                  type="url"
                                  value={submitLink}
                                  onChange={(e) => setSubmitLink(e.target.value)}
                                  placeholder="https://your-deployment-link.com or Google Drive url"
                                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-2xl py-3 px-4 text-xs focus:border-indigo-500 outline-none transition-all shadow-inner"
                                />
                              </div>

                              {/* Copied text */}
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Copied Text / Workspace Summary (Optional)</label>
                                <textarea
                                  value={submitText}
                                  onChange={(e) => setSubmitText(e.target.value)}
                                  rows={4}
                                  placeholder="Describe your workspace, findings, or paste your completed script copy answers here..."
                                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-2xl py-3.5 px-4 text-xs focus:border-indigo-500 outline-none transition-all shadow-inner resize-none"
                                />
                              </div>

                              {/* 2 or 3 Image uploading area */}
                              <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                                  Screenshot Uploads <span className="text-indigo-600 font-extrabold">(Optional, up to 3 screenshot images)</span>
                                </label>

                                <div 
                                  onDragOver={(e) => { e.preventDefault(); }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
                                    const slots = 3 - uploadedImages.length;
                                    if (slots <= 0) {
                                      alert("Maximum limit of 3 uploaded screenshot images reached!");
                                      return;
                                    }
                                    files.slice(0, slots).forEach(async (file) => {
                                      setUploadingImage(true);
                                      showToast(`Compressing & uploading ${file.name} to Cloudinary...`);
                                      try {
                                        const res = await uploadToCloudinary(file, 'ciya_assignments', registeredCourse?.id, currentUser?.uid);
                                        if (res && res.url) {
                                          setUploadedImages(prev => [...prev, res.url]);
                                          showToast(`Successfully uploaded ${file.name} to Cloudinary!`);
                                        } else {
                                          showToast(`Failed to upload ${file.name}.`);
                                        }
                                      } catch (err: any) {
                                        console.error("Cloudinary submission image upload error:", err);
                                        showToast(`Error uploading ${file.name}: ${err?.message || 'Upload failed'}`);
                                      } finally {
                                        setUploadingImage(false);
                                      }
                                    });
                                  }}
                                  onClick={() => document.getElementById('assignment-images-upload-input')?.click()}
                                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                                    uploadingImage 
                                      ? 'border-indigo-400 bg-indigo-50/20 animate-pulse' 
                                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    id="assignment-images-upload-input"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => {
                                      if (e.target.files) {
                                        const files = Array.from(e.target.files) as File[];
                                        const slots = 3 - uploadedImages.length;
                                        if (slots <= 0) {
                                          alert("Maximum limit of 3 uploaded screenshot images reached!");
                                          return;
                                        }
                                        files.slice(0, slots).forEach(async (file) => {
                                          setUploadingImage(true);
                                          showToast(`Compressing & uploading ${file.name} to Cloudinary...`);
                                          try {
                                            const res = await uploadToCloudinary(file, 'ciya_assignments', registeredCourse?.id, currentUser?.uid);
                                            if (res && res.url) {
                                              setUploadedImages(prev => [...prev, res.url]);
                                              showToast(`Successfully uploaded ${file.name} to Cloudinary!`);
                                            } else {
                                              showToast(`Failed to upload ${file.name}.`);
                                            }
                                          } catch (err: any) {
                                            console.error("Cloudinary submission image upload error:", err);
                                            showToast(`Error uploading ${file.name}: ${err?.message || 'Upload failed'}`);
                                          } finally {
                                            setUploadingImage(false);
                                          }
                                        });
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <span className="text-2xl block mb-2 select-none">{uploadingImage ? "⏳" : "📸"}</span>
                                  <p className="text-xs font-bold text-slate-800">
                                    {uploadingImage ? "Uploading..." : "Drag & Drop images or click to browse"}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-1">Upload up to 3 screenshots confirming your active workspace outputs, or leave blank if providing text/links.</p>
                                </div>

                                {uploadedImages.length > 0 && (
                                  <div className="grid grid-cols-3 gap-3 pt-2">
                                    {uploadedImages.map((imgBase64, imgIdx) => (
                                      <div key={imgIdx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video">
                                        <img src={imgBase64} alt={`Upload preview ${imgIdx + 1}`} className="w-full h-full object-cover" />
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setUploadedImages(prev => prev.filter((_, i) => i !== imgIdx));
                                          }}
                                          className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center hover:bg-rose-700 transition-colors border-0 cursor-pointer animate-none"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Submit button */}
                              <div className="pt-4">
                                <button
                                  type="button"
                                  onClick={handleCustomAssignmentSubmit}
                                  disabled={submittingAssignment}
                                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer rounded-2xl shadow-md transform hover:-translate-y-0.5 active:translate-y-0 transition-all border-0"
                                >
                                  {submittingAssignment ? 'Disbursing to Coach & Admin...' : 'Submit Assignment Proof 🚀'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 text-center text-xs font-bold text-emerald-805">
                              🎉 Your Day {submitDayIndex + 1} Assignment has been successfully approved! Clean slate accomplished.
                            </div>
                          )}
                        </>
                      )}

                      {/* Display Submission History List */}
                      {(() => {
                        const filteredMySubs = allMySubmissions.filter(s => s.courseId === registeredCourse.id);
                        if (filteredMySubs.length === 0) return null;

                        return (
                          <div className="pt-6 border-t border-slate-100 space-y-3.5 text-left">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Your Submitted Checkpoints</h4>
                            <div className="space-y-2">
                              {filteredMySubs.sort((a,b) => b.dayIndex - a.dayIndex).map((sub, sIdx) => (
                                <div key={sub.id || sIdx} className="bg-slate-50 border p-3.5 rounded-2xl flex justify-between items-center gap-4 text-xs font-bold">
                                  <div className="space-y-0.5 min-w-0">
                                    <span className="bg-slate-205 text-slate-700 font-extrabold px-1.5 py-0.5 rounded text-[8px] uppercase">
                                      Day {sub.dayIndex + 1} Assignment
                                    </span>
                                    <p className="text-slate-800 truncate">{sub.submittedText}</p>
                                  </div>
                                  <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                    sub.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                    sub.status === 'Disapproved' ? 'bg-rose-100 text-rose-800' :
                                    'bg-amber-100 text-amber-800'
                                  }`}>
                                    {sub.status || 'Pending'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            )
          ) : (
            <>
              {(selectedCourseId && selectedCourse && (isAdmin || !appSettings?.lockedSections?.courses)) ? (
                <CourseViewer 
                  course={selectedCourse}
                  userProfile={userProfile}
                  setUserProfile={setUserProfile}
                  currentUser={currentUser}
                  onBack={() => handleSelectCourseId(null)}
                  showToast={showToast}
                  handleResetProgress={handleResetProgress}
                  isAdmin={isAdmin}
                  isEnrolled={isAdmin || !!(userProfile?.progress && userProfile.progress[selectedCourse.id] && userProfile.progress[selectedCourse.id].accessStatus !== 'revoked') || isProfileRegisteredForCourse(userProfile, selectedCourse)}
                  onLogin={handleLogin}
                  courses={courses}
                  hasCompletedFirstCourse={hasCompletedFirstCourse}
                  loading={loading}
                  allMySubmissions={allMySubmissions}
                  appSettings={appSettings}
                  onRequestUnlockAdvanced={(c) => setAdvancedPaymentCourse(c)}
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
                            You are currently exploring CIYA's training courses as a guest. General information is visible below, but training materials (quizzes, videos, submission options) are inaccessible until you are signed in.
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
                  ) : isNewUser ? (
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
                            You have unrestricted, free premium access to all active CIYA Academy daily courses below. Embark on systematic lessons, evaluate code, clear checkpoints, and hand in assignments directly to certified coaches!
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-teal-950 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-teal-850 text-left"
                    >
                      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 animate-pulse" />
                      
                      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div className="space-y-3">
                          <span className="inline-block bg-teal-500/20 border border-teal-400/35 text-teal-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                            {timeOfDayGreeting.emoji} INTEL PORTAL ACTIVE
                          </span>
                          <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight">
                            {timeOfDayGreeting.text}, <span className="text-amber-400">{userProfile?.fullName || 'Scholar'}</span>!
                          </h1>
                          <p className="text-xs text-slate-300 leading-relaxed font-medium max-w-sm">
                            {timeOfDayGreeting.desc} Your intranet terminal has synced with Nigeria's local standard time.
                          </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-2.5xl p-5 shadow-inner">
                          <h4 className="text-xs font-black tracking-widest uppercase text-teal-300 mb-3 flex items-center gap-2 select-none">
                            <span>📈</span> Learning Progress Tracker
                          </h4>
                          {registeredCoursesList.length === 0 ? (
                            <div className="text-[11px] text-slate-400 font-bold bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                              No active courses registered yet. Explore the tracks below to enroll!
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-[140px] overflow-y-auto pr-1">
                              {registeredCoursesList.map(r => {
                                const progressStore = userProfile?.progress?.[r.id || ''] || { watched: [], checkPassed: [], submissions: {}, quizScores: {} };
                                const completedKeys: string[] = progressStore.watched || [];
                                const totalVideos = r.days?.reduce((sum: number, d: any) => sum + (d.videos?.length || 0), 0) || 0;
                                const progressRatio = totalVideos > 0 ? Math.round((completedKeys.length / totalVideos) * 100) : 0;
                                return (
                                  <div key={r.id} className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-3 flex flex-col gap-1.5 transition-colors">
                                    <div className="flex justify-between items-center gap-2">
                                      <span className="font-extrabold text-[11px] text-white truncate max-w-[170px]">{r.title}</span>
                                      <span className="font-black text-[9px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full shrink-0">
                                        {progressRatio}% COMPLETE
                                      </span>
                                    </div>
                                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-gradient-to-r from-teal-400 to-amber-300 h-full rounded-full transition-all duration-500" style={{ width: `${progressRatio}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-4 text-left">
                    {/* Category Banner Carousel for AI Website, AI Video, and AI Image & Graphics */}
                    <CategoryBannerCarousel 
                      activeSkillFilter={activeSkillFilter}
                      setActiveSkillFilter={setActiveSkillFilter}
                      courseLevelFilter={courseLevelFilter}
                      setCourseLevelFilter={setCourseLevelFilter}
                    />

                    {(loading && filteredCourses.length === 0) ? (
                      <div className="flex items-center justify-center py-20 bg-white rounded-3xl border">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : filteredCourses.length === 0 ? (
                      <div className="text-center py-16 bg-slate-50 border border-slate-200/60 rounded-3xl">
                        <span className="text-3xl block mb-2 select-none">🎓</span>
                        <h4 className="text-sm font-black text-slate-800">No Premium Course Paths Assigned Yet</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-semibold">Assigned active course tracks to your student profile will reveal here shortly.</p>
                      </div>
                    ) : (
                      <div className="space-y-12">
                        {/* SECTION 1: REGISTERED/ENROLLED COURSES OR LEADERBOARD */}
                        {!isGuest ? (
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-3">
                              <h3 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2">
                                <span>🎓</span> My Registered Course
                              </h3>

                              {/* Toggle Button to Switch View Between Enrolled Courses and Leaderboard */}
                              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setCoursesViewTab('courses')}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                                    coursesViewTab === 'courses'
                                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                                      : 'text-slate-500 hover:text-slate-900'
                                  }`}
                                >
                                  📚 Enrolled Courses ({filteredRegisteredCourses.length})
                                </button>

                              {/* Cohort Leaderboard button: Completely hidden for Cohort 1 & Cohort 2, and disallowed cohorts */}
                              {(() => {
                                const studentCohort = userProfile?.cohort || 'Cohort 3';
                                const isCohort1Or2 = studentCohort === 'Cohort 1' || studentCohort === 'Cohort 2';
                                const allowedCohorts: string[] = Array.isArray(leaderboardConfig?.allowedCohorts) ? leaderboardConfig.allowedCohorts : ['Cohort 3'];
                                const isLeaderboardAllowed = !isCohort1Or2 && allowedCohorts.includes(studentCohort);

                                if (!isLeaderboardAllowed) return null;

                                return (
                                  <button
                                    type="button"
                                    onClick={() => setCoursesViewTab('leaderboard')}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                                      coursesViewTab === 'leaderboard'
                                        ? 'bg-amber-500 text-slate-950 shadow-xs border border-amber-400 font-extrabold'
                                        : 'text-slate-600 hover:text-amber-800'
                                    }`}
                                  >
                                    <span>🏆</span> Cohort Leaderboard
                                  </button>
                                );
                              })()}
                              </div>
                            </div>

                            {/* View 1: Registered Courses */}
                            {coursesViewTab === 'courses' && (
                              filteredRegisteredCourses.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 border border-slate-200/60 rounded-3xl text-xs font-bold text-slate-500">
                                  No enrolled courses in this track.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                                  {filteredRegisteredCourses.map(course => (
                                    <CourseCard 
                                      key={course.id} 
                                      course={course} 
                                      userProfile={userProfile}
                                      isEnrolled={true}
                                      isLocked={false} 
                                      onSelect={() => {
                                        handleSelectCourseId(course.id || null);
                                      }} 
                                      currentUser={currentUser}
                                      appSettings={appSettings}
                                      onCourseUnlocked={handleCourseUnlocked}
                                    />
                                  ))}
                                </div>
                              )
                            )}

                            {/* View 2: Static Cohort Leaderboard Widget (Cohort 1 & 2 destroyed/hidden, Cohort 3 loads strictly static JSON) */}
                            {coursesViewTab === 'leaderboard' && (() => {
                              const studentCohort = userProfile?.cohort || 'Cohort 3';
                              const isCohort1Or2 = studentCohort === 'Cohort 1' || studentCohort === 'Cohort 2';
                              const allowedCohorts: string[] = Array.isArray(leaderboardConfig?.allowedCohorts) ? leaderboardConfig.allowedCohorts : ['Cohort 3'];
                              const isLeaderboardAllowed = !isCohort1Or2 && allowedCohorts.includes(studentCohort);

                              if (!isLeaderboardAllowed) {
                                return (
                                  <div className="text-center py-12 bg-slate-50 border border-slate-200/60 rounded-3xl text-xs font-bold text-slate-500 max-w-xl mx-auto">
                                    The leaderboard feature is not active for your cohort.
                                  </div>
                                );
                              }

                              const activeCohort = selectedLeaderboardCohort || (studentCohort !== 'Cohort 1' && studentCohort !== 'Cohort 2' ? studentCohort : 'Cohort 3');
                              const staticCohortEntries = staticLeaderboardData[activeCohort] || staticLeaderboardData['Cohort 3'] || [];

                              return (
                                <div className="mt-2 bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm max-w-5xl mx-auto space-y-6 text-left font-sans">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100">
                                    <div className="space-y-1">
                                      <h4 className="text-base font-black uppercase text-slate-900 flex items-center gap-2">
                                        <Award className="w-5 h-5 text-amber-500" />
                                        🏆 {activeCohort} Official Leaderboard Standings
                                      </h4>
                                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                                        Official student standings updated periodically by CIYA academy admin.
                                      </p>
                                    </div>
                                  </div>

                                  {staticCohortEntries.length === 0 ? (
                                    <div className="text-center py-10 bg-slate-50 border border-slate-200/60 rounded-2xl p-6">
                                      <span className="text-3xl block mb-2 select-none">📊</span>
                                      <h5 className="text-xs font-black text-slate-700 uppercase tracking-wide">No Rankings Available for {activeCohort}</h5>
                                      <p className="text-[11px] text-slate-500 font-semibold mt-1">Official standings will be posted here as training progresses.</p>
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
                                      <table className="w-full text-left border-collapse">
                                        <thead>
                                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                            <th className="py-3 px-3 text-center w-20">Rank</th>
                                            <th className="py-3 px-4">Student</th>
                                            <th className="py-3 px-3 text-center">Lessons</th>
                                            <th className="py-3 px-3 text-center">Quizzes</th>
                                            <th className="py-3 px-4 text-right">Total Score</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {staticCohortEntries.map((entry, idx) => {
                                            const isMe = entry.email?.toLowerCase() === currentUser?.email?.toLowerCase();
                                            const rankNum = entry.rank || idx + 1;
                                            const isTop1 = rankNum === 1;
                                            const isTop2 = rankNum === 2;
                                            const isTop3 = rankNum === 3;

                                            return (
                                              <tr 
                                                key={entry.email || idx}
                                                className={`transition-colors ${
                                                  isMe 
                                                    ? 'bg-indigo-50/80 font-bold' 
                                                    : isTop1
                                                      ? 'bg-amber-50/40 hover:bg-amber-50/60'
                                                      : isTop2
                                                        ? 'bg-slate-50/60 hover:bg-slate-100/60'
                                                        : isTop3
                                                          ? 'bg-orange-50/40 hover:bg-orange-50/60'
                                                          : 'hover:bg-slate-50/50'
                                                }`}
                                              >
                                                <td className="py-3.5 px-3 text-center shrink-0">
                                                  {isTop1 && (
                                                    <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-900 font-black text-[11px] px-2.5 py-1 rounded-full uppercase shadow-xs">
                                                      🥇 1st
                                                    </span>
                                                  )}
                                                  {isTop2 && (
                                                    <span className="inline-flex items-center gap-1 bg-slate-200 border border-slate-300 text-slate-900 font-black text-[11px] px-2.5 py-1 rounded-full uppercase shadow-xs">
                                                      🥈 2nd
                                                    </span>
                                                  )}
                                                  {isTop3 && (
                                                    <span className="inline-flex items-center gap-1 bg-orange-100 border border-orange-300 text-orange-900 font-black text-[11px] px-2.5 py-1 rounded-full uppercase shadow-xs">
                                                      🥉 3rd
                                                    </span>
                                                  )}
                                                  {!isTop1 && !isTop2 && !isTop3 && (
                                                    <span className="font-mono text-xs font-bold text-slate-400">
                                                      #{rankNum}
                                                    </span>
                                                  )}
                                                </td>

                                                <td className="py-3.5 px-4">
                                                  <div>
                                                    <div className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
                                                      <span>{entry.fullName}</span>
                                                      {isMe && (
                                                        <span className="text-[9px] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded-full uppercase">
                                                          You
                                                        </span>
                                                      )}
                                                    </div>
                                                    {entry.email && (
                                                      <p className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">
                                                        {entry.email}
                                                      </p>
                                                    )}
                                                  </div>
                                                </td>

                                                <td className="py-3.5 px-3 text-center">
                                                  <span className="text-[11px] font-black text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                                                    {entry.lessonsCompleted} Lessons
                                                  </span>
                                                </td>

                                                <td className="py-3.5 px-3 text-center">
                                                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-lg">
                                                    ✓ {entry.quizzesPassed} Quizzes
                                                  </span>
                                                </td>

                                                <td className="py-3.5 px-4 text-right font-mono">
                                                  <span className="text-xs font-black text-indigo-600">
                                                    {entry.score.toLocaleString()} pts
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
                              );
                            })()}
                          </div>
                        ) : (
                          /* Guest Viewer */
                          <div className="space-y-4">
                            <h3 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2 border-b pb-2">
                              <span>🎓</span> CIYA Premium Academy Courses
                            </h3>
                            {filteredCourses.length === 0 ? (
                              <div className="text-center py-12 bg-slate-50 border border-slate-200/60 rounded-3xl text-xs font-bold text-slate-500">
                                No courses available in this track.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                                {filteredCourses.map(course => (
                                  <CourseCard 
                                    key={course.id} 
                                    course={course} 
                                    userProfile={userProfile}
                                    isEnrolled={false}
                                    isLocked={true} 
                                    onSelect={() => {
                                      alert("Please Sign In with Google to unlock full access to mini-videos, daily study materials, quizzes, live assignments and certificate tracking!");
                                      handleLogin();
                                    }} 
                                    currentUser={currentUser}
                                    appSettings={appSettings}
                                    onCourseUnlocked={handleCourseUnlocked}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* CAROUSEL ANNOUNCEMENTS BANNER CARD (Placed under registered courses before un-registered courses) */}
                        <AnnouncementCarouselCard onNavigateTab={(tab) => { if (tab === 'courses' || tab === 'leaderboard') setCoursesViewTab(tab); }} />

                        {/* SECTION 2: OTHER AVAILABLE COURSES (NOT ENROLLED) - Only show when viewing 'courses' tab */}
                        {!isAdmin && !isGuest && coursesViewTab === 'courses' && (
                          <div className="space-y-4">
                            <h3 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2 border-b pb-2">
                              <span>🌐</span> Other Courses (Not Enrolled)
                            </h3>
                            {filteredOtherCourses.length === 0 ? (
                              <div className="text-center py-12 bg-slate-50 border border-slate-200/60 rounded-3xl text-xs font-bold text-slate-500">
                                No other courses available in this track.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                                {filteredOtherCourses.map(course => (
                                  <CourseCard 
                                    key={course.id} 
                                    course={course} 
                                    userProfile={userProfile}
                                    isEnrolled={false}
                                    isLocked={false} 
                                    onSelect={() => {
                                      handleSelectCourseId(course.id || null);
                                    }} 
                                    currentUser={currentUser}
                                    appSettings={appSettings}
                                    onCourseUnlocked={handleCourseUnlocked}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>



                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* SUCCESSFUL ASSIGNMENT SUBMISSION POPUP */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full text-center relative border border-slate-100 shadow-2xl"
          >
            {/* Gradient top accent */}
            <div className="absolute top-0 left-0 w-full h-2 rounded-t-3xl bg-gradient-to-r from-teal-400 via-indigo-500 to-indigo-600" />
            
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-100 shadow-inner select-none text-2xl">
              🎉
            </div>

            <h3 className="text-lg font-black text-slate-800 tracking-tight">Assignment Submitted Successfully!</h3>
            
            <div className="text-slate-800 text-xs md:text-sm leading-relaxed mt-3 space-y-3 font-bold text-left">
              <p>
                Your daily workspace checklist checkpoint has been successfully compiled and sent to our certified tech coaches and administrators for reviews.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left font-bold text-slate-800 mt-2 space-y-1">
                <span className="text-indigo-600 font-extrabold text-[11px] block uppercase tracking-wider">🗓️ Next steps:</span>
                <p className="font-bold text-slate-700 text-xs leading-normal">
                  Our administrators and instructors are actively reviewing your live workspace and screenshot proof. Keep an eye on your <strong className="text-indigo-600 font-extrabold">Notification Desk</strong> inbox for approval outcomes or personalized feedback.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-sm rounded-xl cursor-pointer border-0 transition-all shadow-md active:scale-95"
              >
                Continue Tracking Modules 🚀
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Enrolled Course Pathway:</span>
                <p className="font-extrabold text-slate-800 text-base md:text-lg mt-1 flex items-center gap-2">
                  📚 {userProfile?.recommendedPath || userProfile?.courseType || "Custom Tech Track"}
                </p>
                <p className="text-xs text-slate-500 mt-1 italic">
                  Course access has been fully unlocked. Your course tracks, daily milestones, and training assets are ready in your portal.
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



      {/* COURSE COMPLETION CONGRATS OVERLAY MODAL */}
      {courseCompletionModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 md:p-12 max-w-lg w-full text-center relative border border-slate-100 shadow-2xl overflow-hidden"
          >
            {/* Emerald border banner */}
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-600" />
            
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-emerald-100 shadow-inner select-none text-4xl">
              🏆
            </div>

            <div className="space-y-4">
              <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] uppercase font-black tracking-wider px-3 py-1 rounded-full">
                Course 100% Complete!
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-tight">
                Congratulations, {userProfile?.fullName ? userProfile.fullName.split(' ')[0] : 'Scholar'}!
              </h2>
              
              <p className="text-slate-600 text-sm leading-relaxed font-semibold">
                You have officially completed 100% of the daily modules, lesson clips, and assessments for <strong className="text-teal-700 font-extrabold">"{courseCompletionModal.title}"</strong>! This is an incredible milestone.
              </p>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-left mt-6 space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🎓 Your Student ID</span>
                  <div className="font-mono text-xs font-black text-indigo-700 break-all select-all bg-white border border-indigo-100 px-3 py-2 rounded-xl mt-1 shadow-sm flex items-center justify-between gap-2">
                    <span>{currentUser?.uid}</span>
                    <span className="text-[9px] bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded uppercase font-black tracking-wide">Copy</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🚀 Course Completed Eligibility</span>
                  <p className="font-bold text-slate-700 text-xs leading-normal mt-1">
                    You are now fully eligible to enroll in any other available beginner's course tracks! Choose standard or express beginner's courses from your dashboard catalog to keep building.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={() => handleDismissCompletionCongrats(courseCompletionModal.id)}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-lg rounded-xl transition-all shadow-xl shadow-slate-900/15 cursor-pointer transform active:scale-95 border-0"
              >
                Awesome, Let's continue! 🚀
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

      {/* Option A Advanced Course Monetization Flow Modal */}
      {advancedPaymentCourse && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-purple-100 text-left space-y-6 my-8 font-sans relative max-h-[90vh] overflow-y-auto"
          >
            {/* Top Close Button */}
            <button
              onClick={() => setAdvancedPaymentCourse(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center space-y-2">
              <span className="bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full inline-block">
                🎓 ADVANCED CURRICULUM ACCESS GATE
              </span>
              <h3 className="text-xl font-black text-slate-900 leading-tight">
                Unlock {advancedPaymentCourse.title}
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Unlock this elite syllabus path immediately via secure direct transfer.
              </p>
            </div>

            {/* Price Alert */}
            <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest block">Class Registration Tuition Fee</span>
                <span className="text-2xl font-black text-purple-950">
                  ₦{(appSettings?.advancedCourseSettings?.price ?? 50000).toLocaleString()}
                </span>
              </div>
              <span className="text-2xl">⚡</span>
            </div>

            {/* Transfer Instructions & Details */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                🏦 Interbank Direct Transfer Details
              </h4>
              
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3 text-xs font-bold text-slate-700">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400">Bank Name</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-slate-900 font-extrabold">{appSettings?.advancedCourseSettings?.bankName ?? 'United Bank for Africa (UBA)'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(appSettings?.advancedCourseSettings?.bankName ?? 'United Bank for Africa (UBA)');
                        showToast('Copied Bank Name! 📋');
                      }}
                      className="text-[10px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-0 rounded px-1.5 py-0.5 cursor-pointer font-bold"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400">Account Name</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-slate-900 font-extrabold text-right truncate max-w-[200px]">{appSettings?.advancedCourseSettings?.accountName ?? 'CIYA Academy International Ltd'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(appSettings?.advancedCourseSettings?.accountName ?? 'CIYA Academy International Ltd');
                        showToast('Copied Account Name! 📋');
                      }}
                      className="text-[10px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-0 rounded px-1.5 py-0.5 cursor-pointer font-bold"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Account Number</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-slate-900 font-black tracking-wide">{appSettings?.advancedCourseSettings?.accountNumber ?? '1023948576'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(appSettings?.advancedCourseSettings?.accountNumber ?? '1023948576');
                        showToast('Copied Account Number! 📋');
                      }}
                      className="text-[10px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-0 rounded px-1.5 py-0.5 cursor-pointer font-bold"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Countdown / Rotating code sync status block */}
            <AdvancedCoursePasscodeSection
              secret={appSettings?.advancedCourseSettings?.secretPasscode ?? 'CIYA_ADVANCED_PASSCODE_SECRET_2026'}
              onVerifySuccess={async () => {
                try {
                  const courseId = advancedPaymentCourse.id;
                  const allAvailableCourses = coursesStore.getCourses();
                  
                  // 1. Preserve all existing course progress and add newly unlocked course
                  const nextProgress: Record<string, any> = { ...(userProfile?.progress || {}) };
                  nextProgress[courseId] = {
                    ...(nextProgress[courseId] || {}),
                    durationMode: 'standard',
                    createdAt: nextProgress[courseId]?.createdAt || new Date().toISOString()
                  };

                  const existingRegistered = Array.isArray(userProfile?.registeredCourses) ? userProfile.registeredCourses : [];
                  const updatedRegisteredCourses = Array.from(new Set([...existingRegistered, courseId, advancedPaymentCourse.title]));

                  const updatedProfile = {
                    ...userProfile,
                    progress: nextProgress,
                    registeredCourses: updatedRegisteredCourses
                  };
                  setUserProfile(updatedProfile);
                  safeStorage.setItem('ciya_cached_profile', JSON.stringify(updatedProfile));

                  const userRef = doc(db, 'users', currentUser.uid);
                  const dbUpdates: Record<string, any> = {
                    progress: nextProgress,
                    registeredCourses: updatedRegisteredCourses,
                    updatedAt: serverTimestamp()
                  };

                  try {
                    await updateDoc(userRef, dbUpdates);
                  } catch (updateErr: any) {
                    console.warn("Advanced enrollment updateDoc failed, checking if document exists:", updateErr);
                    const snap = await getDoc(userRef);
                    if (!snap.exists()) {
                      console.log("Document does not exist in Firestore. Creating it resiliently...");
                      const newProfileData = {
                        fullName: currentUser.displayName || currentUser.email?.split('@')[0] || 'CIYA Scholar',
                        email: currentUser.email,
                        approvalStatus: 'Approved',
                        isActivated: true,
                        isDashboardUnlocked: true,
                        cohort: 'Cohort 1',
                        recommendedPath: userProfile?.recommendedPath || advancedPaymentCourse.title,
                        courseType: userProfile?.courseType || advancedPaymentCourse.title,
                        pathwaySelection: userProfile?.pathwaySelection || advancedPaymentCourse.title,
                        progress: nextProgress,
                        registeredCourses: updatedRegisteredCourses,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                      };
                      await setDoc(userRef, newProfileData);
                    } else {
                      throw updateErr;
                    }
                  }

                  setAdvancedPaymentCourse(null);
                  setSelectedCourseId(courseId);
                  navigate(`/dashboard?view=courses&courseId=${courseId}`);
                  setShowCongratsPopup(true);
                  showToast(`🎉 Success! Advanced track unlocked!`);
                } catch (err: any) {
                  console.error(err);
                  alert(`Passcode correct, but failed to save enrollment in database: ${err?.message || err || 'Unknown Error'}. Please check connection and try again.`);
                }
              }}
              whatsappNumber={appSettings?.advancedCourseSettings?.whatsappNumber ?? '+2349042544355'}
              courseTitle={advancedPaymentCourse.title}
              price={appSettings?.advancedCourseSettings?.price ?? 50000}
              userEmail={currentUser?.email || ''}
            />

          </motion.div>
        </div>
      )}

      {showDashboardBadgePaymentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 font-sans">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 overflow-hidden shadow-2xl relative animate-scaleUp">
            <button
              onClick={() => setShowDashboardBadgePaymentModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center border-0 cursor-pointer text-sm font-black z-10"
              id="close-dashboard-badge-payment-modal-btn"
            >
              ✕
            </button>
            <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  💳 Secure Payment Gateway
                </span>
                <h3 className="font-black text-slate-900 text-sm tracking-tight mt-1">CIYA Membership Badge Payment</h3>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[80vh]">
              <YearBadgePaymentFlow
                yearBadgeSettings={FRONTEND_YEAR_BADGE_SETTINGS}
                price={FRONTEND_YEAR_BADGE_SETTINGS.price}
                currentUser={currentUser}
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                isAdminSimulation={false}
                onSuccessClose={() => setShowDashboardBadgePaymentModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
}
