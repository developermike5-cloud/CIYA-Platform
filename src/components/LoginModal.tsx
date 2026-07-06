import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { Mail, Lock, X, Sparkles, ArrowRight, User, Phone, MapPin, ChevronDown } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPopupBlocked, setShowPopupBlocked] = useState(false);

  // Sign In States
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up States
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpWhatsApp, setSignUpWhatsApp] = useState('');
  const [signUpGender, setSignUpGender] = useState('');
  const [signUpState, setSignUpState] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // Manage body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle direct sign in
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim() || !signInPassword) {
      setError('Please fill in both email and password.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const result = await signInWithEmailAndPassword(auth, signInEmail, signInPassword);
      const user = result.user;

      if (user) {
        if (user.email?.toLowerCase() === 'developermike5@gmail.com') {
          navigate('/admin');
        } else {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (docSnap.exists()) {
            navigate('/dashboard');
          } else {
            navigate('/onboarding');
          }
        }
        onClose();
      }
    } catch (err: any) {
      console.error('Email sign in error:', err);
      if (err.message?.toLowerCase().includes('invalid login credentials') || err.message?.toLowerCase().includes('invalid-credential')) {
        setError('Incorrect email or password. Please try again.');
      } else if (err.message?.toLowerCase().includes('user not found')) {
        setError('No account found under this email address.');
      } else if (err.message?.toLowerCase().includes('offline')) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(err.message || 'An error occurred during sign in.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle direct signup from Modal
  const handleDirectSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpFullName.trim() || !signUpEmail.trim() || !signUpWhatsApp.trim() || !signUpGender || !signUpState || !signUpPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (signUpPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const result = await createUserWithEmailAndPassword(auth, signUpEmail, signUpPassword);
      const user = result.user;

      if (user) {
        try {
          await updateProfile(user, { displayName: signUpFullName });
        } catch (profileErr) {
          console.warn("Could not update display name:", profileErr);
        }

        // Generate profile code and admin access parameters
        const userCode = user.uid.slice(0, 6).toUpperCase();
        
        let activeCohort = 'Cohort 1';
        try {
          const cohortsSnap = await getDoc(doc(db, 'settings', 'cohorts'));
          if (cohortsSnap.exists()) {
            activeCohort = cohortsSnap.data().activeCohort || 'Cohort 1';
          }
        } catch (cohortErr) {
          console.warn("Could not fetch active cohort settings during direct signup:", cohortErr);
        }

        // Save detailed profile document so they are fully registered right away
        const docRef = doc(db, 'users', user.uid);
        await setDoc(docRef, {
          email: user.email,
          fullName: signUpFullName,
          gender: signUpGender,
          whatsapp: signUpWhatsApp,
          state: signUpState,
          intent: 'Direct Sign Up',
          experience: 'Beginner',
          courseType: 'Landing Pages',
          recommendedPath: 'Landing Page Foundations',
          isActivated: false,
          referralsCount: 0,
          approvalStatus: 'Pending',
          isDashboardUnlocked: false,
          myReferralCode: userCode,
          referralCode: referralCode.trim() || '',
          adminCode: `CIYA-${Math.floor(100000 + Math.random() * 900000)}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          cohort: activeCohort
        });

        // Update referrals tracking if a code is provided
        if (referralCode.trim()) {
          try {
            const referrersRef = collection(db, 'users');
            const q = query(referrersRef, where('myReferralCode', '==', referralCode.trim().toUpperCase()));
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
          } catch (refErr) {
            console.error('Error activating referral during modal signup:', refErr);
          }
        }

        // Navigate directly to dashboard with their new account
        navigate('/dashboard');
        onClose();
      }
    } catch (err: any) {
      console.error('Direct sign up error:', err);
      if (err.message?.toLowerCase().includes('email-already-in-use') || err.message?.toLowerCase().includes('already registered')) {
        setError('This email is already registered. Try logging in instead!');
      } else if (err.message?.toLowerCase().includes('offline')) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(err.message || 'An error occurred during sign up.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Google authentication proxy
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      if (provider && typeof (provider as any).setCustomParameters === 'function') {
        (provider as any).setCustomParameters({ prompt: 'select_account' });
      }
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        if (user.email?.toLowerCase() === 'developermike5@gmail.com') {
          navigate('/admin');
        } else {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (docSnap.exists()) {
            navigate('/dashboard');
          } else {
            // New Google account gets redirected to onboarding to fill detailed profile
            navigate('/onboarding');
          }
        }
        onClose();
      }
    } catch (e: any) {
      if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
        setLoading(false);
        return;
      }
      console.error('Google login error:', e);
      if (
        e.code === 'auth/popup-blocked' || 
        e.message?.toLowerCase().includes('popup-blocked') || 
        e.message?.toLowerCase().includes('popup estuvo bloqueado') ||
        e.message?.includes('Pending promise was never set') ||
        e.message?.includes('INTERNAL ASSERTION FAILED')
      ) {
        setShowPopupBlocked(true);
        return;
      }
      setError(e.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex justify-center items-start md:items-center p-4 py-8 md:py-16">
          {/* Main Modal Card */}
          {!showPopupBlocked ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-lg bg-teal-950 border border-teal-900 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col text-teal-50 my-auto"
              id="login_modal_container"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-teal-900/60 text-teal-400 hover:text-white transition-all cursor-pointer border-0"
                id="close_login_modal_btn"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="text-center mb-6 space-y-1">
                <div className="w-12 h-12 bg-gradient-to-tr from-teal-500 to-amber-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-2">
                  <Sparkles className="w-6 h-6 text-teal-950 fill-teal-950" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">CIYA Portal</h3>
                <p className="text-xs text-teal-300 font-semibold">Join thousands of Nigerian youths learning high-income digital skills.</p>
              </div>

              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1 bg-teal-950 border border-teal-900 rounded-2xl mb-6 select-none">
                <button
                  type="button"
                  onClick={() => { setActiveTab('signin'); setError(''); }}
                  className={`py-2.5 text-xs font-extrabold rounded-xl transition-all border-0 cursor-pointer ${activeTab === 'signin' ? 'bg-amber-500 text-teal-950 shadow-md' : 'text-teal-400 hover:text-teal-200'}`}
                >
                  SIGN IN
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('signup'); setError(''); }}
                  className={`py-2.5 text-xs font-extrabold rounded-xl transition-all border-0 cursor-pointer ${activeTab === 'signup' ? 'bg-amber-500 text-teal-950 shadow-md' : 'text-teal-400 hover:text-teal-200'}`}
                >
                  CREATE ACCOUNT
                </button>
              </div>

              {/* Form Section */}
              {error && (
                <div className="p-3.5 mb-4 bg-red-950/50 border border-red-800/40 text-red-200 text-xs font-bold rounded-xl text-center">
                  {error}
                </div>
              )}

              {activeTab === 'signin' ? (
                /* SIGN IN VIEW */
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-teal-400 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-600" />
                      <input
                        type="email"
                        required
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-teal-900 bg-teal-950/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-sm text-teal-50 placeholder:text-teal-800 font-semibold"
                        placeholder="you@example.com"
                        id="login_email_input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-teal-400 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-600" />
                      <input
                        type="password"
                        required
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-teal-900 bg-teal-950/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-sm text-teal-50 placeholder:text-teal-800 font-semibold"
                        placeholder="••••••••"
                        id="login_password_input"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-teal-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer border-0 uppercase tracking-wider disabled:opacity-60"
                    id="login_submit_btn"
                  >
                    {loading ? (
                      <svg className="animate-spin h-5 w-5 text-teal-950" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      'Sign In to Dashboard'
                    )}
                  </button>
                </form>
              ) : (
                /* CREATE ACCOUNT INFO VIEW */
                <div className="space-y-6 text-center py-4">
                  <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
                    <Sparkles className="w-8 h-8 fill-amber-500 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-white tracking-tight">Guided Onboarding Application</h4>
                    <p className="text-sm text-teal-300 leading-relaxed max-w-sm mx-auto font-medium">
                      Direct account registration is disabled. To join CIYA Academy, complete our guided onboarding application, get your registration code, and join the community.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      navigate('/waitingonboarding');
                    }}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-teal-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer border-0 uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98]"
                    id="login_onboarding_btn"
                  >
                    <span>Apply for Admission & Sign Up</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Alternative Onboarding Path */}
              {activeTab === 'signin' && (
                <div className="text-center mt-5">
                  <p className="text-xs text-teal-400 font-semibold">
                    New to CIYA Academy?{' '}
                    <button
                      onClick={() => {
                        onClose();
                        navigate('/waitingonboarding');
                      }}
                      className="text-amber-400 hover:text-amber-300 font-black underline bg-transparent border-0 cursor-pointer p-0 ml-1 inline-flex items-center gap-1 hover:translate-x-0.5 transition-transform"
                      id="login_signup_redirect_btn"
                    >
                      Start Guided Onboarding <ArrowRight className="w-3 h-3" />
                    </button>
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            /* Popup Blocked Mode Helper */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-6 shadow-2xl"
              id="login_popup_blocked_container"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
                <Sparkles className="w-8 h-8 fill-amber-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-100 tracking-tight">Login Popup Blocked</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Google authentication requires a popup flow. Modern browsers block popup windows inside iframes to protect privacy.
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

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPopupBlocked(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors cursor-pointer border-0 text-sm"
                  id="close_popup_helper_btn"
                >
                  Back to Form
                </button>
                <button
                  onClick={handleGoogleLogin}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-teal-950 font-black rounded-xl transition-all cursor-pointer border-0 text-sm shadow-lg shadow-amber-500/10"
                  id="retry_google_login_btn"
                >
                  Retry Login
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
