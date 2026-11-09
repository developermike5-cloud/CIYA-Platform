import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useReducedMotion } from 'motion/react';
import BrandingLogo from '../components/BrandingLogo';
import LoginModal from '../components/LoginModal';
import InteractiveTemplatesSphere from '../components/InteractiveTemplatesSphere';
import { Star, Menu, X } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import './home/landing.css';
import HeroSection from './home/HeroSection';
import MissionSection from './home/MissionSection';
import StudentResults from './home/StudentResults';
import ValuesStrip from './home/ValuesStrip';
import CoursesSection from './home/CoursesSection';
import PaidCourses from './home/PaidCourses';
import EarningsCalculator from './home/EarningsCalculator';
import HowItWorks from './home/HowItWorks';
import WhyCiya from './home/WhyCiya';
import FaqSection from './home/FaqSection';
import ClosingCta from './home/ClosingCta';
import { WHATSAPP_URL } from './home/data';

let globalLoginActive = false;

const useLogin = () => {
  const navigate = useNavigate();
  return async () => {
    if (globalLoginActive) {
      console.warn("Sign-in already in progress, ignoring duplicate action.");
      return;
    }
    try {
      if (auth.currentUser) {
        if (auth.currentUser.email?.toLowerCase() === 'developermike5@gmail.com') {
          navigate('/admin');
        } else {
          const docSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (docSnap.exists()) {
            navigate('/dashboard');
          } else {
            navigate('/onboarding');
          }
        }
        return;
      }
      globalLoginActive = true;
      const provider = new (await import('firebase/auth')).GoogleAuthProvider();
      if (provider && typeof (provider as any).setCustomParameters === 'function') {
        (provider as any).setCustomParameters({ prompt: 'select_account' });
      }
      const { signInWithPopup } = await import('firebase/auth');
      const result = await signInWithPopup(auth, provider);
      if (result.user.email?.toLowerCase() === 'developermike5@gmail.com') {
        navigate('/admin');
      } else {
        const docSnap = await getDoc(doc(db, 'users', result.user.uid));
        if (docSnap.exists()) {
          navigate('/dashboard');
        } else {
          navigate('/onboarding');
        }
      }
    } catch (e: any) {
      if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
        // user just closed it
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
        window.dispatchEvent(new CustomEvent('ciya-auth-popup-blocked'));
        return;
      }
      if (e.message?.includes('offline') || e.code === 'unavailable') {
        alert("Network error: Please check your internet connection and try again.");
      } else {
        alert("An error occurred: " + e.message);
      }
    } finally {
      globalLoginActive = false;
    }
  };
};

function Navbar({ onOpenLogin }: { onOpenLogin: () => void }) {
  const [user, setUser] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = (
    <>
      <a href="#mission" className="hover:text-amber-400 transition-colors">Mission</a>
      <a href="#courses" className="hover:text-amber-400 transition-colors">Courses</a>
      <Link to="/past-cohort-projects" className="hover:text-amber-400 transition-colors">Projects</Link>
      <Link to="/dashboard?view=prompts" className="hover:text-amber-400 transition-colors flex items-center gap-1">
        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        <span>Prompt Generator</span>
      </Link>
      <a href="#how" className="hover:text-amber-400 transition-colors">How it works</a>
      <a href="#why" className="hover:text-amber-400 transition-colors">Why CIYA</a>
    </>
  );

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled ? 'bg-teal-950/85 backdrop-blur-md border-b border-teal-900' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-[1152px] mx-auto px-6 flex items-center justify-between gap-4 md:h-24 h-[76px]">
        <a href="#home" aria-label="CIYA Academy home" className="hover:opacity-85 transition-opacity">
          <BrandingLogo size="sm" />
        </a>

        <nav aria-label="Main" className="hidden md:flex items-center gap-[34px] text-sm font-medium text-teal-200">
          {navLinks}
          {user ? (
            <Link to="/dashboard" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-teal-950 font-black rounded-full text-xs shadow-lg shadow-amber-500/10 transition-all cursor-pointer">
              My Dashboard
            </Link>
          ) : (
            <button onClick={onOpenLogin} className="px-5 py-2.5 bg-teal-900 border border-teal-800 hover:bg-teal-800 text-teal-50 font-bold rounded-full text-xs transition-all cursor-pointer">
              Student Login
            </button>
          )}
        </nav>

        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl bg-teal-900 border border-teal-800 text-teal-50"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((v) => !v)}
        >
          {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden flex flex-col gap-1 px-6 pb-[18px] bg-teal-950/[.97] border-b border-teal-900"
          >
            {navLinks}
            {user ? (
              <Link to="/dashboard" className="py-3 border-b border-teal-900 text-amber-400 font-bold">
                My Dashboard
              </Link>
            ) : (
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenLogin();
                }}
                className="py-3 border-b border-teal-900 text-left text-amber-400 font-bold"
              >
                Student Login
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-teal-950 border-t border-teal-900 pt-20 pb-8 px-6 md:px-12 lg:px-24">
      <div className="max-w-[1152px] mx-auto grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-11 mb-14 w-full max-md:text-center">
        <div>
          <a href="#home" aria-label="CIYA Academy home" className="inline-flex hover:opacity-85 transition-opacity">
            <BrandingLogo size="sm" />
          </a>
          <p className="text-sm text-teal-300 leading-[1.7] max-w-[20rem] mt-3">
            Create It Yourself Academy: bridging the digital skill gap in Nigeria and Africa, one youth at a time.
          </p>
        </div>
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-[0.09em] text-teal-500 mb-5">Courses</h5>
          <ul className="list-none m-0 p-0 flex flex-col gap-3.5">
            <li><a href="#courses" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">Landing Pages</a></li>
            <li><a href="#courses" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">E-commerce Creator</a></li>
            <li><a href="#courses" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">Portfolio Creator</a></li>
            <li><a href="#courses" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">All Tracks</a></li>
            <li><Link to="/past-cohort-projects" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">Past Cohort Projects</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-[0.09em] text-teal-500 mb-5">Academy</h5>
          <ul className="list-none m-0 p-0 flex flex-col gap-3.5">
            <li><a href="#home" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">About CIYA</a></li>
            <li><a href="#mission" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">Our Mission</a></li>
            <li><Link to="/dashboard?view=prompts" className="text-sm text-amber-400 hover:text-amber-200 font-bold transition-colors">✨ Prompt Generator Track</Link></li>
            <li><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">Community</a></li>
            <li><a href="#" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">Blog</a></li>
          </ul>
        </div>
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-[0.09em] text-teal-500 mb-5">Connect</h5>
          <ul className="list-none m-0 p-0 flex flex-col gap-3.5">
            <li><a href="#" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">Instagram</a></li>
            <li><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">WhatsApp</a></li>
            <li><a href="#" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">YouTube</a></li>
            <li><a href="#" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">Contact Us</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-[1152px] mx-auto border-t border-teal-900 pt-7 flex flex-wrap justify-between items-center gap-4 w-full text-xs text-teal-500">
        <span>© 2026 Create It Yourself Academy (CIYA). All rights reserved.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-teal-400 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-teal-400 transition-colors">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showPopupBlocked, setShowPopupBlocked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('login') === 'true') {
      setIsLoginOpen(true);
    }
  }, [location.search]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Prevent redirecting if we just logged out (safety check)
        const isLoggingOut = sessionStorage.getItem('ciya_logout_in_progress') === 'true';
        if (isLoggingOut) return;

        if (user.email?.toLowerCase() === 'developermike5@gmail.com') {
          navigate('/admin');
        } else {
          try {
            const docSnap = await getDoc(doc(db, 'users', user.uid));
            if (docSnap.exists()) {
              navigate('/dashboard');
            }
          } catch (err) {
            console.warn("Home component user profile lookup failed gracefully:", err);
          }
        }
      }
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    const handlePopupBlocked = () => {
      setShowPopupBlocked(true);
    };
    window.addEventListener('ciya-auth-popup-blocked', handlePopupBlocked);
    return () => {
      window.removeEventListener('ciya-auth-popup-blocked', handlePopupBlocked);
    };
  }, []);

  return (
    <div className="bg-teal-950 font-sans text-teal-50 min-h-screen selection:bg-amber-500/30 selection:text-amber-200 flex flex-col overflow-x-clip">
      <Navbar onOpenLogin={() => setIsLoginOpen(true)} />
      <main className="flex-1">
        <HeroSection reduced={reduced} />
        <InteractiveTemplatesSphere />
        <MissionSection reduced={reduced} />
        <StudentResults reduced={reduced} />
        <ValuesStrip reduced={reduced} />
        <CoursesSection reduced={reduced} />
        <PaidCourses />
        <EarningsCalculator />
        <HowItWorks />
        <WhyCiya />
        <FaqSection />
        <ClosingCta />
      </main>
      <Footer />

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {/* POPUP BLOCKED ALERT MODAL */}
      {showPopupBlocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md text-slate-800">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
              <Star className="w-8 h-8 fill-amber-500 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Login Popup Blocked</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Because this virtual Academy program is running inside an AI Studio preview frame, modern web browsers block standard login popups by default to protect your privacy.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-3.5 text-xs text-slate-600">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">1</span>
                <p className="leading-relaxed">
                  Look for a <strong>Popups Blocked</strong> icon in your browser's address bar, click it, and select <strong>"Always allow popups"</strong>.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">2</span>
                <p className="leading-relaxed">
                  Or, click the <strong>"Open App"</strong> / <strong>"Open in New Tab"</strong> button in the top-right corner of AI Studio to run the app directly, where log-in popups are never blocked!
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setShowPopupBlocked(false)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-sm font-bold transition-all cursor-pointer"
              >
                Close Window
              </button>
              <button
                onClick={() => setShowPopupBlocked(false)}
                className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-teal-950 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Retry Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
