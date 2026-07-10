import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { Check, ArrowRight, ChevronLeft, Globe, Film, Palette, Zap, Briefcase, TrendingUp, Sparkles, User, MessageCircle, MapPin, Gift, Clock, ShoppingBag, Mail, Lock } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import LoginModal from '../components/LoginModal';
import BrandingLogo from '../components/BrandingLogo';
import { safeStorage } from '../utils/safeStorage';

type Pathway = 'A' | 'B' | 'C' | null;

let globalOnboardingSignInActive = false;

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [pathway, setPathway] = useState<Pathway>(null);
  const [showCareWarningModal, setShowCareWarningModal] = useState(() => {
    try {
      return localStorage.getItem('ciya_onboarding_warning_acknowledged') !== 'true';
    } catch {
      return true;
    }
  });
  const [hasAcknowledged, setHasAcknowledged] = useState(() => {
    try {
      return localStorage.getItem('ciya_onboarding_warning_acknowledged') === 'true';
    } catch {
      return false;
    }
  });
  
  const NIGERIAN_STATES = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
    "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo",
    "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
    "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
  ];

  const [data, setData] = useState({
    intent: '',
    experience: '',
    courseType: '',
    pathwaySelection: '',
    pathwayReason: '',
    pathwayExperience: '',
    recommendedPath: '',
    goal: '',
    availability: '',
    learningTool: '',
    educationLevel: '',
    ageRange: '',
    fullName: '',
    gender: '',
    whatsapp: '',
    state: '',
    referralCode: '',
    myReferralCode: '',
    isActivated: false,
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [creationTime, setCreationTime] = useState<number | null>(null);
  const [showPopupBlocked, setShowPopupBlocked] = useState(false);

  // Auto-redirect if already registered
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email) {
          setData(d => ({ 
            ...d, 
            email: user.email || '',
            fullName: d.fullName || user.displayName || ''
          }));
        }
        try {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (docSnap.exists()) {
            navigate('/dashboard', { replace: true });
          }
        } catch (err: any) {
          console.warn("Auto-redirect check failed:", err);
          setFormError(`Connection Error: ${err.message || 'Could not verify existing account.'}`);
        }
      }
    });
    return () => unsub();
  }, [navigate]);

  const nextStep = () => {
    setFormError('');
    setStep(s => s + 1);
  };
  const prevStep = () => {
    setFormError('');
    setStep(s => Math.max(1, s - 1));
  };

  const handleDirectLogin = () => {
    setIsLoginOpen(true);
  };

  const handleGoogleOnboarding = async () => {
    setLoading(true);
    setFormError('');
    try {
      const provider = new GoogleAuthProvider();
      if (provider && typeof (provider as any).setCustomParameters === 'function') {
        (provider as any).setCustomParameters({ prompt: 'select_account' });
      }
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user) {
        setData(d => ({
          ...d,
          email: user.email || '',
          fullName: d.fullName || user.displayName || ''
        }));
      }
    } catch (e: any) {
      console.error("Google Onboarding Sign Up error:", e);
      if (e.code === 'auth/popup-blocked' || e.message?.toLowerCase().includes('popup-blocked')) {
        setShowPopupBlocked(true);
      } else {
        setFormError(e.message || 'Google authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectData = (key: keyof typeof data, value: string | boolean) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const handleIntent = (value: string) => {
    selectData('intent', value);
    nextStep();
  };

  const handleExperience = (value: string) => {
    selectData('experience', value);
    nextStep();
  };

  const handlePathwaySelect = (val: Pathway, label: string) => {
    setPathway(val);
    selectData('courseType', label);
    nextStep();
  };

  const intents = [
    { label: 'I want to build a digital career', icon: <Briefcase className="w-5 h-5" /> },
    { label: 'I want to make money online', icon: <TrendingUp className="w-5 h-5" /> },
    { label: 'I want to grow my existing business', icon: <Globe className="w-5 h-5" /> },
    { label: 'I want to pivot to a tech role', icon: <Zap className="w-5 h-5" /> },
    { label: 'I want to establish personal branding', icon: <Sparkles className="w-5 h-5" /> },
  ];

  const pathwaysOpt = [
    { val: 'A' as Pathway, label: 'AI Landing Page Creation', icon: <Globe className="w-6 h-6 text-teal-400" /> },
    { val: 'B' as Pathway, label: 'AI E-commerce Website Creation', icon: <ShoppingBag className="w-6 h-6 text-emerald-400" /> },
    { val: 'C' as Pathway, label: 'AI Portfolio Website Creation', icon: <Briefcase className="w-6 h-6 text-indigo-400" /> }
  ];

  const experiences = [
    'Complete Beginner',
    'I’ve tried a few things before',
    'Intermediate',
    'I want to become an expert/master'
  ];

  const validateForm = (isGoogle: boolean = false) => {
    setFormError('');
    if (!data.fullName.trim()) { setFormError('Full Name is required.'); return false; }
    if (!data.gender) { setFormError('Gender is required.'); return false; }
    if (!data.ageRange) { setFormError('Age Range is required.'); return false; }
    if (!data.whatsapp.trim()) { setFormError('WhatsApp Number is required.'); return false; }
    if (!data.state) { setFormError('State is required.'); return false; }
    
    if (!isGoogle) {
      if (!data.email.trim() || !data.email.includes('@')) {
        setFormError('A valid Email Address is required.');
        return false;
      }
      if (!data.password || data.password.length < 6) {
        setFormError('Password must be at least 6 characters long.');
        return false;
      }
    }
    return true;
  };

  const handleRegisterSuccess = async (user: any) => {
    if (user.email?.toLowerCase() === 'developermike5@gmail.com') {
      navigate('/admin', { replace: true });
      return;
    }

    const docRef = doc(db, 'users', user.uid);
    let docSnap: any = null;
    try {
      docSnap = await getDoc(docRef);
    } catch (err) {
      console.warn("Onboarding handleRegisterSuccess getDoc failed:", err);
    }

    if (docSnap && docSnap.exists()) {
        navigate('/dashboard', { replace: true });
        return;
    }

    const userCode = data.myReferralCode || user.uid.slice(0, 6).toUpperCase();
    
    let recommendedPath = '';
    if (pathway === 'A') {
      if (data.experience.includes('Intermediate') || data.experience.includes('tried')) {
        recommendedPath = 'Professional Conversion Page Builder';
      } else if (data.experience.includes('expert')) {
        recommendedPath = 'Conversion Funnel Agency Masterclass';
      } else {
        recommendedPath = 'Landing Page Foundations';
      }
    } else if (pathway === 'C') {
      if (data.experience.includes('Intermediate') || data.experience.includes('tried')) {
        recommendedPath = 'Professional Portfolio Builder';
      } else if (data.experience.includes('expert')) {
        recommendedPath = 'Portfolio Agency Masterclass';
      } else {
        recommendedPath = 'Portfolio Website Foundations';
      }
    } else {
      if (data.experience.includes('Intermediate') || data.experience.includes('tried')) {
        recommendedPath = 'Professional Store Builder';
      } else if (data.experience.includes('expert')) {
        recommendedPath = 'E-Commerce Agency Growth Masterclass';
      } else {
        recommendedPath = 'E-commerce Essentials';
      }
    }

    let isActivated = false;
    let activeCohort = 'Cohort 1';
    try {
      const cohortsSnap = await getDoc(doc(db, 'settings', 'cohorts'));
      if (cohortsSnap.exists()) {
        activeCohort = cohortsSnap.data().activeCohort || 'Cohort 1';
      }
    } catch (err) {
      console.warn("Could not fetch active cohort settings during registration:", err);
    }

    setCreationTime(new Date().getTime());
    const generatedAdminCode = `CIYA-${Math.floor(100000 + Math.random() * 900000)}`;

    await setDoc(docRef, {
      email: user.email,
      intent: data.intent,
      experience: data.experience,
      courseType: data.courseType,
      pathwaySelection: data.pathwaySelection,
      pathwayReason: data.pathwayReason,
      pathwayExperience: data.pathwayExperience,
      recommendedPath: recommendedPath,
      goal: data.goal,
      availability: data.availability,
      learningTool: data.learningTool || '',
      educationLevel: data.educationLevel || '',
      ageRange: data.ageRange || '',
      fullName: data.fullName,
      gender: data.gender,
      whatsapp: data.whatsapp,
      state: data.state,
      referralCode: data.referralCode || '',
      myReferralCode: userCode,
      isActivated: false,
      referralsCount: 0,
      approvalStatus: 'Pending',
      adminCode: generatedAdminCode,
      isDashboardUnlocked: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      cohort: activeCohort
    });

    // Seed local cache immediately so the dashboard review page displays instantly
    try {
      const freshProfile = {
        email: user.email,
        intent: data.intent,
        experience: data.experience,
        courseType: data.courseType,
        pathwaySelection: data.pathwaySelection,
        pathwayReason: data.pathwayReason,
        pathwayExperience: data.pathwayExperience,
        recommendedPath: recommendedPath,
        goal: data.goal,
        availability: data.availability,
        learningTool: data.learningTool || '',
        educationLevel: data.educationLevel || '',
        ageRange: data.ageRange || '',
        fullName: data.fullName,
        gender: data.gender,
        whatsapp: data.whatsapp,
        state: data.state,
        referralCode: data.referralCode || '',
        myReferralCode: userCode,
        isActivated: false,
        referralsCount: 0,
        approvalStatus: 'Pending',
        adminCode: generatedAdminCode,
        isDashboardUnlocked: false,
        cohort: activeCohort
      };

      safeStorage.setItem('ciya_cached_user', JSON.stringify({
        uid: user.uid,
        email: user.email,
        role: 'student'
      }));
      safeStorage.setItem('ciya_cached_profile', JSON.stringify(freshProfile));
      safeStorage.setItem('ciya_cached_profile_time', Date.now().toString());
    } catch (cacheErr) {
      console.warn("Could not seed safeStorage on onboarding completion:", cacheErr);
    }
    
    setData(d => ({ ...d, recommendedPath, myReferralCode: userCode, isActivated }));

    if (data.referralCode) {
      try {
        const referrersRef = collection(db, 'users');
        const q = query(referrersRef, where('myReferralCode', '==', data.referralCode.trim().toUpperCase()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const referrerDoc = querySnapshot.docs[0];
          const prevCount = referrerDoc.data().referralsCount || 0;
          await updateDoc(doc(db, 'users', referrerDoc.id), {
            isActivated: true,
            referralsCount: prevCount + 1,
            updatedAt: serverTimestamp()
          });
        }
      } catch(e) { console.error('Error activating referral:', e); }
    }

    nextStep(); 
  };

  const doAuthAndSave = async () => {
    const isAlreadyLoggedIn = !!auth.currentUser;
    if (!validateForm(isAlreadyLoggedIn)) return;
    if (globalOnboardingSignInActive) return;
    setLoading(true);
    try {
      globalOnboardingSignInActive = true;
      let user = auth.currentUser;
      if (!user) {
        const result = await createUserWithEmailAndPassword(auth, data.email, data.password);
        user = result.user;
        try {
          await updateProfile(user, { displayName: data.fullName });
        } catch (profileErr) {
          console.warn("Could not update display name:", profileErr);
        }
      }
      
      await handleRegisterSuccess(user);
    } catch (e: any) {
      console.error(e);
      let errMsg = e.message || 'An error occurred during sign up.';
      if (e.message?.toLowerCase().includes('email already in use') || e.message?.toLowerCase().includes('already registered')) {
        errMsg = 'This email is already registered. Try logging in instead!';
      } else if (e.message?.includes('offline')) {
        errMsg = 'Network error. Please check your internet connection.';
      }
      setFormError(errMsg);
      alert(`Registration Error: ${errMsg}`);
    } finally {
      globalOnboardingSignInActive = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 11 && !data.isActivated && creationTime) {
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
  }, [step, data.isActivated, creationTime]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center relative overflow-x-hidden selection:bg-teal-500/30 selection:text-teal-200">
      
      {/* Dynamic Cosmic Background Orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(99,102,241,0.12),transparent_40%),radial-gradient(circle_at_70%_75%,rgba(20,184,166,0.12),transparent_40%)] pointer-events-none z-0" />

      {/* WARNING POPUP ADVISORY MODAL */}
      <AnimatePresence>
        {showCareWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-850 rounded-3xl p-6 md:p-8 max-w-lg w-full text-center space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-600"></div>
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 tracking-tight uppercase">CRITICAL ADVISORY ⚠️</h3>
                <p className="text-slate-300 font-semibold leading-relaxed text-sm">
                  Please complete this onboarding questionnaire with extreme care.
                </p>
              </div>
              <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-5 text-left space-y-3.5 text-xs text-slate-300 leading-relaxed font-semibold">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-800 text-teal-400 flex items-center justify-center shrink-0 font-black text-[10px]">1</div>
                  <p>This is the <strong>ONLY form</strong> that configures your student profile and grants you access to your learning dashboard.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-800 text-teal-400 flex items-center justify-center shrink-0 font-black text-[10px]">2</div>
                  <p>Your details are <strong>final</strong> and <strong>CANNOT</strong> be changed once submitted.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-800 text-teal-400 flex items-center justify-center shrink-0 font-black text-[10px]">3</div>
                  <p>Your dashboard will be unlocked <strong>directly upon administrator approval</strong>. No access codes or external activation steps required!</p>
                </div>
              </div>
              <button 
                onClick={() => { 
                  try {
                    localStorage.setItem('ciya_onboarding_warning_acknowledged', 'true');
                  } catch (e) {
                    console.error("Failed to save onboarding warning acknowledgement:", e);
                  }
                  setShowCareWarningModal(false); 
                  setHasAcknowledged(true); 
                  setStep(2);
                }}
                className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black rounded-full text-sm shadow-lg hover:shadow-teal-500/20 transition-all cursor-pointer border-0 uppercase tracking-wider"
              >
                I understand, let's begin 🚀
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-3xl p-6 flex items-center justify-between z-10">
        <div className="w-24">
          {step > 1 && step < 11 && (
            <button onClick={prevStep} className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors text-sm font-semibold bg-transparent border-0 cursor-pointer">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>
        <div className="flex-1 flex justify-center">
          {step > 1 && step < 11 && (
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                <div key={s} className={`h-1.5 w-5 rounded-full transition-all ${step >= s ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.5)]' : 'bg-slate-800'}`} />
              ))}
            </div>
          )}
        </div>
        <div className="w-24 flex justify-end">
          {step > 1 && step < 10 && (
            <button onClick={nextStep} className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors text-sm font-semibold bg-transparent border-0 cursor-pointer">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* TOP warning banner for persistent warning notice */}
      {step > 1 && step < 11 && (
        <div className="w-full max-w-2xl px-4 z-10 space-y-3">
          <div className="w-full py-2.5 px-4 bg-slate-900/60 border border-teal-500/20 rounded-2xl flex items-center gap-3 shadow-md backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping shrink-0" />
            <p className="text-[11px] md:text-xs font-semibold text-slate-300 leading-normal">
              <strong className="text-teal-400 font-bold uppercase mr-1">CARE REQUIRED:</strong> Answers are final & cannot be changed later. This form sets up your direct dashboard access!
            </p>
          </div>
          {formError && (
            <div className="w-full p-4 bg-red-950/80 border border-red-800/40 text-red-200 text-sm font-semibold rounded-2xl flex items-center justify-between gap-3 shadow-lg">
              <span>{formError}</span>
              <button onClick={() => setFormError('')} className="text-red-400 hover:text-red-200 bg-transparent border-0 cursor-pointer font-bold text-base p-1 leading-none">✕</button>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 w-full flex items-center justify-center p-6 pb-20 relative z-10">
        <AnimatePresence mode="wait">
          
          {step === 1 && (
            <motion.div key="1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl text-center space-y-8 flex flex-col items-center">
              <BrandingLogo size="md" className="mb-2" />
              <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-indigo-400 to-purple-400 leading-tight tracking-tight">
                Empowering 10,000 African Youths With AI & Digital Skills
              </h1>
              <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-semibold max-w-xl mx-auto">
                Learn practical AI-powered skills that help you:
              </p>
              <ul className="text-left bg-slate-900/60 border border-slate-800 backdrop-blur-md p-6 rounded-2xl shadow-lg max-w-md mx-auto space-y-4 font-semibold text-slate-300">
                <li className="flex items-center gap-3"><Check className="text-teal-400 w-5 h-5 flex-shrink-0" /> Build for yourself</li>
                <li className="flex items-center gap-3"><Check className="text-teal-400 w-5 h-5 flex-shrink-0" /> Grow your business</li>
                <li className="flex items-center gap-3"><Check className="text-teal-400 w-5 h-5 flex-shrink-0" /> Earn income online</li>
                <li className="flex items-center gap-3"><Check className="text-teal-400 w-5 h-5 flex-shrink-0" /> Stop depending on expensive outsourcing</li>
              </ul>
              <div className="flex flex-col gap-4 justify-center items-center pt-4">
                <button 
                  onClick={() => { 
                    try {
                      if (localStorage.getItem('ciya_onboarding_warning_acknowledged') === 'true') {
                        setStep(2);
                      } else {
                        setShowCareWarningModal(true);
                      }
                    } catch {
                      setShowCareWarningModal(true);
                    }
                  }} 
                  className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black rounded-full shadow-lg hover:-translate-y-1 hover:shadow-teal-500/20 transition-all text-lg flex items-center justify-center gap-2 mx-auto cursor-pointer border-0 uppercase tracking-wide"
                >
                  Start My Journey <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={handleDirectLogin} className="text-slate-400 hover:text-teal-400 transition-colors text-xs font-bold underline bg-transparent border-0 cursor-pointer">
                  Already registered? Login directly here
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-2xl w-full">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 mb-8 text-center">What do you want to achieve with AI skills?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {intents.map((opt, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleIntent(opt.label)} 
                    className={`p-5 rounded-2xl border-2 text-left flex items-center gap-4 transition-all cursor-pointer ${data.intent === opt.label ? 'border-teal-400 bg-teal-950/20 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.15)]' : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-900/90'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-teal-400 shrink-0">
                      {opt.icon}
                    </div>
                    <span className="font-bold text-lg leading-snug">{opt.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="3" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-2xl w-full">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 mb-8 text-center">Which of these AI pathways excites you the most?</h2>
              <div className="flex flex-col gap-4">
                {pathwaysOpt.map((opt, i) => (
                  <button 
                    key={i} 
                    onClick={() => handlePathwaySelect(opt.val, opt.label)} 
                    className="p-6 rounded-2xl border-2 text-left flex items-center gap-6 transition-all border-slate-800 hover:border-teal-500/40 bg-slate-900/60 hover:bg-slate-900/90 shadow-lg cursor-pointer text-slate-200"
                  >
                    <div className="w-14 h-14 rounded-full bg-slate-850 flex items-center justify-center shrink-0 border border-slate-800">
                      {opt.icon}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-100 text-xl">{opt.label}</h3>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="4" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-xl w-full">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 mb-8 text-center">What best describes your current level?</h2>
              <div className="space-y-4">
                {experiences.map((opt, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleExperience(opt)} 
                    className={`w-full p-5 rounded-2xl border-2 text-center transition-all font-black text-lg cursor-pointer ${data.experience === opt ? 'border-teal-400 bg-teal-950/20 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.15)]' : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-300'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 5 && pathway === 'A' && <PathwayA data={data} setData={setData} onNext={nextStep} />}
          {step === 5 && pathway === 'B' && <PathwayB data={data} setData={setData} onNext={nextStep} />}
          {step === 5 && pathway === 'C' && <PathwayC data={data} setData={setData} onNext={nextStep} />}

          {step === 6 && (
            <motion.div key="6" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-xl w-full">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 mb-8 text-center">What outcome would make this training successful for you?</h2>
              <div className="space-y-4">
                {[
                  'Start earning online',
                  'Build my own business tools',
                  'Learn a profitable skill',
                ].map((opt, i) => (
                  <button 
                    key={i} 
                    onClick={() => { selectData('goal', opt); nextStep(); }} 
                    className="w-full p-5 rounded-2xl border-2 border-slate-800 hover:border-teal-400 hover:bg-teal-950/20 bg-slate-900/60 text-slate-300 hover:text-teal-200 transition-all font-black text-lg cursor-pointer"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 7 && (
            <motion.div key="7" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-xl w-full">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 mb-8 text-center">Can you commit to 5 consecutive days of learning?</h2>
              <div className="space-y-4">
                {[
                  'Yes, fully committed',
                  'Mostly available',
                  'I’ll need recordings',
                  'Not sure yet'
                ].map((opt, i) => (
                  <button 
                    key={i} 
                    onClick={() => { selectData('availability', opt); nextStep(); }} 
                    className="w-full p-5 rounded-2xl border-2 border-slate-800 hover:border-teal-400 hover:bg-teal-950/20 bg-slate-900/60 text-slate-300 hover:text-teal-200 transition-all font-black text-lg cursor-pointer"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 8 && (
            <motion.div key="8" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-xl w-full">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 mb-8 text-center">What tool will you be using for this training?</h2>
              <div className="space-y-4">
                {[
                  { label: 'Mobile Phone', desc: 'I will learn and practice using my smartphone' },
                  { label: 'Laptop', desc: 'I will learn and practice using my personal computer/laptop' }
                ].map((opt, i) => (
                  <button 
                    key={i} 
                    onClick={() => { selectData('learningTool', opt.label); nextStep(); }} 
                    className={`w-full p-5 rounded-2xl border-2 text-left flex items-center justify-between transition-all font-black text-lg cursor-pointer ${data.learningTool === opt.label ? 'border-teal-400 bg-teal-950/20 text-teal-300' : 'border-slate-800 hover:border-teal-400 bg-slate-900/60 text-slate-300'}`}
                  >
                    <div>
                      <div className="font-black text-slate-100">{opt.label}</div>
                      <div className="text-xs font-semibold text-slate-400 mt-1">{opt.desc}</div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${data.learningTool === opt.label ? 'border-teal-400 bg-teal-400 text-slate-950' : 'border-slate-800'}`}>
                      {data.learningTool === opt.label && <Check className="w-4 h-4 text-slate-950" />}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 9 && (
            <motion.div key="9" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-xl w-full">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 mb-8 text-center">What is your current level of education?</h2>
              <div className="space-y-4">
                {[
                  'SSCE',
                  'Undergraduate',
                  'Graduate'
                ].map((opt, i) => (
                  <button 
                    key={i} 
                    onClick={() => { selectData('educationLevel', opt); nextStep(); }} 
                    className={`w-full p-5 rounded-2xl border-2 text-center transition-all font-black text-lg cursor-pointer ${data.educationLevel === opt ? 'border-teal-400 bg-teal-950/20 text-teal-300' : 'border-slate-800 hover:border-teal-400 bg-slate-900/60 text-slate-300'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 10 && (
            <motion.div key="10" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-md w-full">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 mb-2">Final Step</h2>
                <p className="text-slate-400 font-semibold text-sm">Please verify details below to lock your application.</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
                {formError && (
                  <div className="p-3 bg-red-950/50 border border-red-800/40 text-red-200 text-sm font-semibold rounded-xl">{formError}</div>
                )}
                {auth.currentUser && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs font-semibold rounded-2xl flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      You are logged in as <span className="text-white font-black">{auth.currentUser.email}</span>, but your profile details are incomplete. Fill in your details below to activate your student dashboard.
                    </div>
                  </div>
                )}

                {!auth.currentUser && (
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={handleGoogleOnboarding}
                      className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-extrabold rounded-xl flex items-center justify-center gap-2.5 transition-all text-xs shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12 5.04c1.64 0 3.11.56 4.27 1.67l3.19-3.19C17.51 1.7 14.99 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.79 2.94C6.18 7.37 8.86 5.04 12 5.04z" />
                        <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.71 2.88c2.17-2 3.42-4.94 3.42-8.61z" />
                        <path fill="#FBBC05" d="M5.29 14.83a7.19 7.19 0 0 1 0-4.57L1.5 7.32a11.95 11.95 0 0 0 0 10.37l3.79-2.86z" />
                        <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.71-2.88c-1.03.69-2.35 1.1-4.25 1.1-3.14 0-5.82-2.33-6.71-5.46L1.5 16.29C3.4 20.15 7.35 23 12 23z" />
                      </svg>
                      <span>Sign Up with Google</span>
                    </button>
                    <div className="flex items-center my-4">
                      <div className="flex-grow border-t border-slate-800"></div>
                      <span className="px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">OR REGISTER WITH EMAIL</span>
                      <div className="flex-grow border-t border-slate-800"></div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">Full Name *</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" value={data.fullName} onChange={e => selectData('fullName', e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-slate-100 placeholder:text-slate-600 font-bold" placeholder="John Doe" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">Gender *</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                    <select value={data.gender} onChange={e => selectData('gender', e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all appearance-none text-slate-100 font-bold cursor-pointer">
                      <option value="" disabled>Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">Age Range *</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                    <select value={data.ageRange} onChange={e => selectData('ageRange', e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all appearance-none text-slate-100 font-bold cursor-pointer">
                      <option value="" disabled>Select Age Range</option>
                      <option value="Below 18">Below 18</option>
                      <option value="Between 18-25">Between 18-25</option>
                      <option value="Between 25-36">Between 25-36</option>
                      <option value="Above 36">Above 36</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">WhatsApp Number *</label>
                  <div className="relative">
                    <MessageCircle className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="tel" value={data.whatsapp} onChange={e => selectData('whatsapp', e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-slate-100 placeholder:text-slate-600 font-bold" placeholder="+234..." />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">State *</label>
                  <div className="relative">
                    <MapPin className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                    <select value={data.state} onChange={e => selectData('state', e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all appearance-none text-slate-100 font-bold cursor-pointer">
                      <option value="" disabled>Select State</option>
                      {NIGERIAN_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="email" 
                      value={data.email} 
                      onChange={e => selectData('email', e.target.value)} 
                      disabled={!!auth.currentUser}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-slate-100 placeholder:text-slate-600 font-bold disabled:opacity-60" 
                      placeholder="your@email.com" 
                    />
                  </div>
                </div>

                {/* Password */}
                {!auth.currentUser && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">Password *</label>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="password" value={data.password} onChange={e => selectData('password', e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-slate-100 placeholder:text-slate-600 font-bold" placeholder="Min. 6 characters" />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                <button 
                  onClick={doAuthAndSave} 
                  disabled={loading} 
                  className={`w-full py-4 text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 rounded-full font-black text-lg shadow-lg flex items-center justify-center gap-3 disabled:opacity-85 transition-all relative overflow-hidden active:scale-[0.98] ${loading ? 'cursor-not-allowed animate-pulse shadow-md shadow-teal-400/20' : 'cursor-pointer'}`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center py-0.5">
                      <svg className="animate-spin h-6 w-6 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : (
                    <>
                      Register Student Profile
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 11 && (
            <motion.div key="11" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl w-full">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-600"></div>
                
                <div className="w-24 h-24 bg-gradient-to-tr from-teal-950 to-indigo-950 rounded-full mx-auto flex items-center justify-center mb-8 ring-8 ring-teal-500/10 border border-teal-500/20 shadow-inner relative animate-pulse">
                  <div className="absolute inset-0 rounded-full bg-teal-500/5 animate-ping opacity-75" />
                  <Sparkles className="w-12 h-12 text-teal-400 relative z-10" />
                </div>

                <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-indigo-400 to-purple-400 mb-6 tracking-tight">Onboarding Complete! 🎉</h2>
                
                <div className="text-slate-300 text-lg md:text-xl font-semibold mb-8 leading-relaxed max-w-xl mx-auto">
                  <p>
                    Congratulations, <strong className="text-teal-400 font-extrabold">{data.fullName ? data.fullName.split(' ')[0] : 'Student'}</strong>! Your student profile has been successfully registered.
                  </p>
                  <p className="text-base text-slate-400 mt-4 font-normal">
                    You can now proceed to your student dashboard to view your profile status and access learning modules.
                  </p>
                </div>

                <div className="mt-8">
                  <button onClick={() => { window.location.href = '/dashboard'; }} className="px-6 py-4.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black rounded-full text-base transition-all shadow-lg hover:shadow-teal-500/20 w-full cursor-pointer border-0 uppercase tracking-wider">
                    Go to My Dashboard 🚀
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* POPUP BLOCKED ALERT MODAL */}
      {showPopupBlocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
              <Sparkles className="w-8 h-8 fill-amber-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-100 tracking-tight">Login Popup Blocked</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Admissions program requires a popup flow. Modern browsers block popup flows by default to protect privacy.
              </p>
            </div>
            
            <div className="bg-slate-950/90 border border-slate-850 rounded-2xl p-4 text-left space-y-3.5 text-xs text-slate-300">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 font-extrabold text-[10px]">1</span>
                <p className="leading-relaxed">
                  Look for a <strong>Popups Blocked</strong> icon in your browser's address bar, click it, and select <strong>"Always allow popups"</strong>.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 font-extrabold text-[10px]">2</span>
                <p className="leading-relaxed">
                  Or, click the <strong>"Open App"</strong> / <strong>"Open in New Tab"</strong> button in the top-right corner of AI Studio to run the app directly, where log-in popups are never blocked!
                </p>
              </div>
            </div>

            <button onClick={() => setShowPopupBlocked(false)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
}

function OnboardingSubmissionDetails({ data }: { data: any }) {
  return (
    <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-left max-w-xl mx-auto my-6 text-sm text-slate-200">
      <h3 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 mb-4 text-xs tracking-tight border-b border-slate-800/60 pb-2 uppercase text-[11px] tracking-wider flex items-center gap-2">
        <span>📋</span> Submitted Application Details
      </h3>
      <div className="space-y-4 text-xs md:text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-slate-450 block text-[10px] uppercase font-bold">Full Name</span>
            <span className="text-slate-100 font-semibold">{data.fullName || '-'}</span>
          </div>
          <div>
            <span className="text-slate-450 block text-[10px] uppercase font-bold">Gender</span>
            <span className="text-slate-100 font-semibold">{data.gender || '-'}</span>
          </div>
          <div>
            <span className="text-slate-450 block text-[10px] uppercase font-bold">Age Range</span>
            <span className="text-slate-100 font-semibold">{data.ageRange || '-'}</span>
          </div>
          <div>
            <span className="text-slate-450 block text-[10px] uppercase font-bold">Education Level</span>
            <span className="text-slate-100 font-semibold">{data.educationLevel || '-'}</span>
          </div>
          <div>
            <span className="text-slate-450 block text-[10px] uppercase font-bold">Learning Tool</span>
            <span className="text-slate-100 font-semibold">{data.learningTool || '-'}</span>
          </div>
          <div>
            <span className="text-slate-450 block text-[10px] uppercase font-bold">WhatsApp Number</span>
            <span className="text-slate-100 font-mono font-semibold">{data.whatsapp || '-'}</span>
          </div>
          <div>
            <span className="text-slate-450 block text-[10px] uppercase font-bold">State of Residence</span>
            <span className="text-slate-100 font-semibold">{data.state || '-'}</span>
          </div>
        </div>

        <div className="border-t border-slate-800/60 pt-3 space-y-3">
          <div>
            <span className="text-slate-450 block text-[10px] uppercase font-bold">Recommended Study Program</span>
            <span className="text-teal-300 font-bold bg-teal-950/40 border border-teal-850/40 px-2.5 py-1 rounded-xl text-xs inline-block mt-0.5">
              {data.recommendedPath || '-'}
            </span>
          </div>
          <div>
            <span className="text-slate-450 block text-[10px] uppercase font-bold">Path Selections</span>
            <span className="text-slate-200 font-bold text-xs">
              {data.courseType || ''} {data.pathwaySelection ? `(${data.pathwaySelection})` : ''}
            </span>
          </div>
          {data.pathwayReason && (
            <div>
              <span className="text-slate-450 block text-[10px] uppercase font-bold">Reason for Selection</span>
              <p className="text-slate-300 italic mt-0.5 leading-relaxed bg-slate-950/60 p-3 border border-slate-800/60 rounded-xl">{data.pathwayReason}</p>
            </div>
          )}
          <div>
            <span className="text-slate-450 block text-[10px] uppercase font-bold">Prior Experience in Course</span>
            <span className="text-slate-200 font-semibold">{data.pathwayExperience || data.experience || 'None'}</span>
          </div>
          {data.intent && (
            <div>
              <span className="text-slate-450 block text-[10px] uppercase font-bold">What are you building CIYA Academy for?</span>
              <p className="text-slate-300 italic mt-0.5 leading-relaxed bg-slate-950/60 p-3 border border-slate-800/60 rounded-xl">{data.intent}</p>
            </div>
          )}
          {data.goal && (
            <div>
              <span className="text-slate-450 block text-[10px] uppercase font-bold">Target Learning Goal</span>
              <p className="text-slate-300 italic mt-0.5 leading-relaxed bg-slate-950/60 p-3 border border-slate-800/60 rounded-xl">{data.goal}</p>
            </div>
          )}
          <div>
            <span className="text-slate-450 block text-[10px] uppercase font-bold">Commitment Level</span>
            <span className="text-slate-200 font-bold">{data.availability || '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PathwayA({ data, setData, onNext }: { data: any, setData: any, onNext: () => void }) {
  const [subStep, setSubStep] = useState(1);
  const q1 = [
    { title: 'SaaS & Tech Landing Pages', meaning: 'Clean, high-tech landing pages built specifically to launch products, software, or mobile applications.', uses: 'Product walkthroughs, app feature showcases, waitlist registrations.', businesses: 'SaaS startups, software developers, technical founders.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=a79c48c3e64b87dd05785e11a7bbfd24_xtpnvp' },
    { title: 'Local Business Funnels', meaning: 'High-converting sales funnels designed for local services, coaching, or webinar event registration.', uses: 'Lead generation, local client list building, selling services.', businesses: 'Course creators, real estate agents, consultants, consulting partners.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=e354a38f14d9cf824f2b4a73a11ad45c_t4_qvqj5r' },
  ];
  const q2 = ['To build for my own business', 'To get clients and make money', 'To stop paying developers'];
  const q3 = ['Never', 'Only with Canva/Wix', 'I tried coding before', 'I already build websites manually'];

  const clickQ1 = (val: string) => { setData((p:any) => ({...p, pathwaySelection: val})); setSubStep(2); };
  const clickQ2 = (val: string) => { setData((p:any) => ({...p, pathwayReason: val})); setSubStep(3); };
  const clickQ3 = (val: string) => { setData((p:any) => ({...p, pathwayExperience: val})); onNext(); };

  return <PathwayFlow step={subStep} mediaType="video"
    title1="What type of landing page would you love to create?" opts1={q1} click1={clickQ1}
    title2="Why do you want to learn landing page creation?" opts2={q2} click2={clickQ2}
    title3="Have you ever built a landing page before?" opts3={q3} click3={clickQ3}
  />;
}

function PathwayB({ data, setData, onNext }: { data: any, setData: any, onNext: () => void }) {
  const [subStep, setSubStep] = useState(1);
  const q1 = [
    { title: 'WhatsApp Automated Stores', meaning: 'Responsive digital storefronts integrated with instant WhatsApp order forwarding.', uses: 'Accepting local orders, listing standard item menus, instant buyer alerts.', businesses: 'Instagram clothing brands, local bakeries, dropshipping shops.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=5b233e180530fcf94134bfed78e2c49d_720w_gqclim' },
    { title: 'Full Checkout Digital Catalogs', meaning: 'Structured online catalogs displaying physical or digital downloadable products with secure card gateways.', uses: 'Credit card payments (Paystack/Flutterwave), automated file delivery, wholesale orders.', businesses: 'Ebook authors, creative designers, fashion boutiques, manufacturers.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=5b233e180530fcf94134bfed78e2c49d_720w_gqclim' },
  ];
  const q2 = ['To build for my own business', 'To get clients and make money', 'To stop paying developers'];
  const q3 = ['Never', 'Only with Canva/Wix', 'I tried coding before', 'I already build websites manually'];

  const clickQ1 = (val: string) => { setData((p:any) => ({...p, pathwaySelection: val})); setSubStep(2); };
  const clickQ2 = (val: string) => { setData((p:any) => ({...p, pathwayReason: val})); setSubStep(3); };
  const clickQ3 = (val: string) => { setData((p:any) => ({...p, pathwayExperience: val})); onNext(); };

  return <PathwayFlow step={subStep} mediaType="video"
    title1="What type of e-commerce store would you love to create?" opts1={q1} click1={clickQ1}
    title2="Why do you want to learn e-commerce creation?" opts2={q2} click2={clickQ2}
    title3="Have you ever built an e-commerce store before?" opts3={q3} click3={clickQ3}
  />;
}

function PathwayC({ data, setData, onNext }: { data: any, setData: any, onNext: () => void }) {
  const [subStep, setSubStep] = useState(1);
  const q1 = [
    { title: 'Personal Developer Portfolio', meaning: 'Clean, professional portfolios designed to showcase developer projects, coding skills, and tech stacks.', uses: 'Tech job applications, engineering networking, code repository links.', businesses: 'Software engineers, frontend developers, tech job seekers.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=a79c48c3e64b87dd05785e11a7bbfd24_xtpnvp' },
    { title: 'Creative & Freelancer Portfolio', meaning: 'Visually striking, media-rich websites designed to display creative projects, design case studies, and client reviews.', uses: 'Showcasing designer projects, copywriting samples, freelance client acquisition.', businesses: 'UI/UX designers, photographers, writers, consultants, agency freelancers.', src: 'https://res.cloudinary.com/di4dlnd5x/video/upload/v1779113179/704f7970e09360476c34e5b8dd6a1239_720w_hkdauz.webm' }
  ];
  const q2 = ['To showcase my skills to land a tech role', 'To find high-paying freelance clients', 'To establish a strong professional brand online'];
  const q3 = ['Never', 'Only with Canva/Wix', 'I tried coding before', 'I already build websites manually'];

  const clickQ1 = (val: string) => { setData((p:any) => ({...p, pathwaySelection: val})); setSubStep(2); };
  const clickQ2 = (val: string) => { setData((p:any) => ({...p, pathwayReason: val})); setSubStep(3); };
  const clickQ3 = (val: string) => { setData((p:any) => ({...p, pathwayExperience: val})); onNext(); };

  return <PathwayFlow step={subStep} mediaType="video"
    title1="What type of portfolio website would you love to create?" opts1={q1} click1={clickQ1}
    title2="Why do you want to learn portfolio creation?" opts2={q2} click2={clickQ2}
    title3="Have you ever built a website or portfolio before?" opts3={q3} click3={clickQ3}
  />;
}

function PathwayFlow({ step, mediaType, title1, opts1, click1, title2, opts2, click2, title3, opts3, click3 }: any) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="max-w-2xl w-full">
      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="w-full">
           <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 mb-8 text-center">{title1}</h2>
           <div className="flex flex-col gap-4">
             {opts1.map((opt: any, i: number) => {
                const isExpanded = expandedIndex === i;
                return (
                  <div key={i} className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-lg transition-all">
                    <button 
                      onClick={() => setExpandedIndex(isExpanded ? null : i)} 
                      className="w-full p-6 text-left flex items-center justify-between focus:outline-none bg-transparent border-0 cursor-pointer"
                    >
                      <span className="font-black text-slate-100 text-lg">{opt.title}</span>
                      <div className={`p-2 rounded-full border border-slate-800 text-slate-400 transition-transform ${isExpanded ? 'rotate-180 bg-slate-850' : ''}`}>
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-2 border-t border-slate-800/60 bg-slate-950/40">
                        <div className="flex flex-col md:flex-row gap-6 mb-6">
                           <div className="flex-1 space-y-4">
                             <div><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Meaning</span><p className="text-slate-300 font-semibold text-sm mt-1">{opt.meaning}</p></div>
                             <div><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Uses</span><p className="text-slate-300 font-semibold text-sm mt-1">{opt.uses}</p></div>
                             <div><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Businesses that need it</span><p className="text-slate-300 font-semibold text-sm mt-1">{opt.businesses}</p></div>
                           </div>
                           <div className="w-full md:w-72 h-72 md:h-64 bg-slate-950 rounded-xl flex items-center justify-center shrink-0 border border-slate-800 relative overflow-hidden">
                             {opt.src ? (
                               mediaType === 'video' ? (
                                 opt.src.includes('player.cloudinary.com/embed') ? (
                                   <iframe src={`${opt.src}&autoplay=true&loop=true&muted=true&player[controls]=false&player[showLogo]=false&player[showPlayButton]=false`} width="100%" height="100%" frameBorder="0" allow="autoplay; fullscreen; encrypted-media" className="pointer-events-none" />
                                 ) : (
                                   <video autoPlay loop muted playsInline disablePictureInPicture className="w-full h-full object-cover pointer-events-none">
                                     <source src={opt.src} />
                                   </video>
                                 )
                               ) : (
                                 <img src={opt.src} alt={opt.title} className="w-full h-full object-cover animate-pulse" referrerPolicy="no-referrer" />
                               )
                             ) : mediaType === 'video' ? (
                               <div className="flex flex-col items-center text-slate-600">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                                 <span className="text-xs font-bold mt-2">Video Example</span>
                               </div>
                             ) : (
                               <div className="flex flex-col items-center text-slate-600">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                 <span className="text-xs font-bold mt-2">Design Example</span>
                               </div>
                             )}
                           </div>
                        </div>
                        <button onClick={() => click1(opt.title)} className="w-full py-3 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-black rounded-xl cursor-pointer border-0">
                          Select this path
                        </button>
                      </div>
                    )}
                  </div>
                );
             })}
           </div>
        </motion.div>
      )}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-xl mx-auto">
           <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 mb-8 text-center">{title2}</h2>
           <div className="space-y-3">
             {opts2.map((opt: string, i: number) => (
               <button key={i} onClick={() => click2(opt)} className="w-full p-5 text-left rounded-2xl border-2 border-slate-800 hover:border-teal-400 bg-slate-900/60 hover:bg-slate-900/90 text-slate-200 font-bold transition-all cursor-pointer">
                 {opt}
               </button>
             ))}
           </div>
        </motion.div>
      )}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-xl mx-auto">
           <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 mb-8 text-center">{title3}</h2>
           <div className="space-y-3">
             {opts3.map((opt: string, i: number) => (
               <button key={i} onClick={() => click3(opt)} className="w-full p-5 text-left rounded-2xl border-2 border-slate-800 hover:border-teal-400 bg-slate-900/60 hover:bg-slate-900/90 text-slate-200 font-bold transition-all cursor-pointer">
                 {opt}
               </button>
             ))}
           </div>
        </motion.div>
      )}
    </div>
  );
}
