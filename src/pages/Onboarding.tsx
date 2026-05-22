import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { Check, ArrowRight, ChevronLeft, Globe, Film, Palette, Zap, Briefcase, TrendingUp, Sparkles, User, MessageCircle, MapPin, Gift, Clock } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';

type Pathway = 'A' | 'B' | 'C' | null;

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [pathway, setPathway] = useState<Pathway>(null);
  
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
    fullName: '',
    gender: '',
    whatsapp: '',
    state: '',
    referralCode: '',
    myReferralCode: '',
    isActivated: false
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [creationTime, setCreationTime] = useState<number | null>(null);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const handleDirectLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      if (result.user.email === 'developermike5@gmail.com') {
        navigate('/admin');
      } else {
        const docSnap = await getDoc(doc(db, 'users', result.user.uid));
        if (docSnap.exists()) {
           navigate('/dashboard');
        } else {
           await auth.signOut();
           alert("No registered account found under this email. Let's guide you through the registration setup questions to create your student profile!");
           setStep(2);
        }
      }
    } catch (e: any) {
      if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error(e);
      if (e.message?.includes('offline') || e.code === 'unavailable') {
        alert("Network error: Please check your internet connection and try again.");
      } else {
        alert("An error occurred: " + e.message);
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
    { val: 'A' as Pathway, label: 'AI Website Development', icon: <Globe className="w-6 h-6 text-blue-500" /> },
    { val: 'B' as Pathway, label: 'AI Film Studio', icon: <Film className="w-6 h-6 text-purple-500" /> },
    { val: 'C' as Pathway, label: 'AI Image & Graphics Engineering', icon: <Palette className="w-6 h-6 text-pink-500" /> }
  ];

  const experiences = [
    'Complete Beginner',
    'I’ve tried a few things before',
    'Intermediate',
    'I want to become an expert/master'
  ];

  const validateForm = () => {
    if (!data.fullName || !data.gender || !data.whatsapp || !data.state) {
      setFormError('Please fill in all required fields.');
      return false;
    }
    setFormError('');
    return true;
  };

  const doAuthAndSave = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      if (user) {
        if (user.email === 'developermike5@gmail.com') {
          navigate('/admin');
          return;
        }

        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
           navigate('/dashboard');
           return;
        }

        // Generate unique code if not has one
        const userCode = data.myReferralCode || user.uid.slice(0, 6).toUpperCase();
        
        let recommendedPath = '';
        if (data.experience.includes('Intermediate')) recommendedPath = 'Advanced ' + (pathway === 'A' ? 'Website' : pathway === 'B' ? 'Film' : 'Image') + ' Program';
        else if (data.experience.includes('expert')) recommendedPath = 'Masterclass ' + (pathway === 'A' ? 'Website' : pathway === 'B' ? 'Film' : 'Image') + ' Program';
        else recommendedPath = pathway === 'A' ? 'AI Website Builder Beginner Bootcamp' : pathway === 'B' ? 'AI Film Studio Beginner Program' : 'AI Image Engineering Foundation Class';

        let isActivated = false;

        setCreationTime(new Date().getTime());
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
          fullName: data.fullName,
          gender: data.gender,
          whatsapp: data.whatsapp,
          state: data.state,
          referralCode: data.referralCode,
          myReferralCode: userCode,
          isActivated: false,
          referralsCount: 0,
          approvalStatus: 'Pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        setData(d => ({ ...d, recommendedPath, myReferralCode: userCode, isActivated }));

        // Handle referral activation for the referrer if entered
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
      }
    } catch (e: any) {
      if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error(e);
      if (e.message?.includes('offline') || e.code === 'unavailable') {
        alert("Network error: Please check your internet connection and try again.");
      } else {
        alert('Error during sign up: ' + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 9 && !data.isActivated && creationTime) {
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
  }, [step, data.isActivated]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col items-center">
      <div className="w-full max-w-3xl p-6 flex items-center justify-between z-10">
        <div className="w-24">
          {step > 1 && step < 9 && (
            <button onClick={prevStep} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-semibold">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>
        <div className="flex-1 flex justify-center">
          {step > 1 && step < 9 && (
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6, 7, 8].map(s => (
                <div key={s} className={`h-1.5 w-6 rounded-full transition-colors ${step >= s ? 'bg-amber-500' : 'bg-slate-200'}`} />
              ))}
            </div>
          )}
        </div>
        <div className="w-24 flex justify-end">
          {step > 1 && step < 8 && (
            <button onClick={nextStep} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-semibold">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 w-full flex items-center justify-center p-6 pb-20 relative">
        <AnimatePresence mode="wait">
          
          {step === 1 && (
            <motion.div key="1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl text-center space-y-8">
              <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-2xl shadow-lg shadow-orange-500/20 mx-auto flex items-center justify-center mb-8">
                <span className="text-white font-black tracking-tight text-3xl uppercase">Ciya</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-slate-800 leading-tight tracking-tight">
                Empowering 10,000 African Youths With AI & Digital Skills
              </h1>
              <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium max-w-xl mx-auto">
                Learn practical AI-powered skills that help you:
              </p>
              <ul className="text-left bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-md mx-auto space-y-4 font-medium text-slate-700">
                <li className="flex items-center gap-3"><Check className="text-green-500 w-5 h-5 flex-shrink-0" /> Build for yourself</li>
                <li className="flex items-center gap-3"><Check className="text-green-500 w-5 h-5 flex-shrink-0" /> Grow your business</li>
                <li className="flex items-center gap-3"><Check className="text-green-500 w-5 h-5 flex-shrink-0" /> Earn income online</li>
                <li className="flex items-center gap-3"><Check className="text-green-500 w-5 h-5 flex-shrink-0" /> Stop depending on expensive outsourcing</li>
              </ul>
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                <button onClick={nextStep} className="px-8 py-4 bg-amber-500 text-amber-950 font-bold rounded-full shadow-lg hover:-translate-y-1 hover:shadow-amber-500/30 transition-all text-lg flex items-center justify-center gap-2">
                  Start My Journey <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={handleDirectLogin} className="px-8 py-4 bg-white text-slate-700 font-bold border-2 border-slate-200 rounded-full shadow-sm hover:-translate-y-1 hover:shadow-md transition-all text-lg">
                  Sign In (Already Registered)
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl w-full">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-8 text-center">What do you want to achieve with AI skills?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {intents.map((opt, i) => (
                  <button key={i} onClick={() => handleIntent(opt.label)} className={`p-5 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${data.intent === opt.label ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300 bg-white shadow-sm hover:shadow'}`}>
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      {opt.icon}
                    </div>
                    <span className="font-semibold text-slate-800 text-lg">{opt.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl w-full">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-8 text-center">Which of these AI pathways excites you the most?</h2>
              <div className="flex flex-col gap-4">
                {pathwaysOpt.map((opt, i) => (
                  <button key={i} onClick={() => handlePathwaySelect(opt.val, opt.label)} className="p-6 rounded-2xl border-2 text-left flex items-center gap-6 transition-all border-slate-200 hover:border-amber-500 bg-white shadow-sm hover:shadow-md hover:bg-amber-50">
                    <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                      {opt.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-xl">{opt.label}</h3>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-xl w-full">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-8 text-center">What best describes your current level?</h2>
              <div className="space-y-4">
                {experiences.map((opt, i) => (
                  <button key={i} onClick={() => handleExperience(opt)} className={`w-full p-5 rounded-2xl border-2 text-center transition-all font-semibold text-lg ${data.experience === opt ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 shadow-sm hover:shadow'}`}>
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
            <motion.div key="6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-xl w-full">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-8 text-center">What outcome would make this training successful for you?</h2>
              <div className="space-y-4">
                {[
                  'Start earning online',
                  'Build my own business tools',
                  'Learn a profitable skill',
                ].map((opt, i) => (
                  <button key={i} onClick={() => { selectData('goal', opt); nextStep(); }} className="w-full p-5 rounded-2xl border-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50 bg-white text-slate-700 hover:text-amber-900 transition-all font-semibold text-lg shadow-sm">
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 7 && (
            <motion.div key="7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-xl w-full">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-8 text-center">Can you commit to 5 consecutive days of learning?</h2>
              <div className="space-y-4">
                {[
                  'Yes, fully committed',
                  'Mostly available',
                  'I’ll need recordings',
                  'Not sure yet'
                ].map((opt, i) => (
                  <button key={i} onClick={() => { selectData('availability', opt); nextStep(); }} className="w-full p-5 rounded-2xl border-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50 bg-white text-slate-700 hover:text-amber-900 transition-all font-semibold text-lg shadow-sm">
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 8 && (
            <motion.div key="8" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-md w-full">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Final Step</h2>
                <p className="text-slate-600">Please provide your details below to save your profile.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-lg">{formError}</div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={data.fullName} onChange={e => selectData('fullName', e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900 focus:bg-slate-900 hover:bg-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none transition-all text-slate-50 placeholder:text-slate-500" placeholder="John Doe" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Gender *</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                    <select value={data.gender} onChange={e => selectData('gender', e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900 focus:bg-slate-900 hover:bg-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none transition-all appearance-none text-slate-50">
                      <option value="" disabled>Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">WhatsApp Number *</label>
                  <div className="relative">
                    <MessageCircle className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="tel" value={data.whatsapp} onChange={e => selectData('whatsapp', e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900 focus:bg-slate-900 hover:bg-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none transition-all text-slate-50 placeholder:text-slate-500" placeholder="+234..." />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">State *</label>
                  <div className="relative">
                    <MapPin className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                    <select value={data.state} onChange={e => selectData('state', e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900 focus:bg-slate-900 hover:bg-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none transition-all appearance-none text-slate-50">
                      <option value="" disabled>Select State</option>
                      {NIGERIAN_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button onClick={doAuthAndSave} disabled={loading} className="w-full py-4 text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-full font-bold text-lg shadow-lg flex items-center justify-center gap-3 disabled:opacity-70 transition-all">
                  {loading ? 'Processing...' : (
                    <>
                      <svg className="w-5 h-5 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a5.95 5.95 0 1 1 0-11.9 5.869 5.869 0 0 1 4.12 1.594l2.846-2.845A9.689 9.689 0 0 0 12.545 2.1c-5.466 0-9.897 4.431-9.897 9.897s4.431 9.897 9.897 9.897c5.444 0 9.896-4.524 9.896-9.897 0-.649-.074-1.282-.196-1.897h-9.7z"/>
                      </svg>
                      Sign Up
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 9 && (
            <motion.div key="9" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl w-full">
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-100 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                <div className="w-20 h-20 bg-indigo-50 rounded-full mx-auto flex items-center justify-center mb-6">
                  <MessageCircle className="w-10 h-10 text-indigo-600 stroke-[2.5]" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800 mb-4">Application Received! 📋</h2>
                           <div className="text-slate-600 text-base md:text-lg mb-8 leading-relaxed max-w-lg mx-auto space-y-4">
                  <p>
                    Thank you for applying, <strong className="text-slate-800">{data.fullName ? data.fullName.split(' ')[0] : 'Student'}</strong>! Your application is currently under processing review.
                  </p>
                  <p>
                    Please watch out for your email, as you will receive an email confirmation once you have been selected for the program. Make sure to check both your inbox and your spam/junk folder.
                  </p>
                </div>

                <div className="w-full mb-8 max-h-[300px] overflow-y-auto rounded-2xl">
                  <OnboardingSubmissionDetails data={data} />
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-8 text-left border border-indigo-100/50">
                  <h3 className="font-bold text-indigo-900 mb-2 text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" /> Join Our Community!
                  </h3>
                  <p className="text-slate-655 text-sm leading-relaxed mb-4">
                    While we process your application, join our thriving community to stay updated, access vital digital builder resources, and connect with other students.
                  </p>
                  
                  <a href="https://chat.whatsapp.com/BzyYP0DyV2TFRqzfrrCXYi?s=cl&p=a&mlu=3" target="_blank" rel="noopener noreferrer" className="block w-full py-4 bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold rounded-xl text-center shadow-lg shadow-green-500/20 hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2.5 text-lg">
                     <svg className="w-6 h-6 fill-white shrink-0" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.729-1.458L0 24zm6.59-4.846c1.6.95 3.1 1.45 4.8 1.45 5.5 0 10-4.5 10-10s-4.5-10-10-10C6.9 1 2.3 5.5 2.3 11c0 1.9.5 3.7 1.5 5.3l-.98 3.56 3.65-.96zm12.33-7.53c-.34-.17-2.03-1-2.34-1.1-.3-.1-.53-.17-.76.17-.23.34-.88 1.1-.1.82a.85.85 0 0 0-.25-.6c-.2-.17-.8-.42-1.5-.7-2.65-1.15-4.42-3.8-4.55-4-.14-.17-1.18-1.57-1.18-3a3 3 0 0 1 1-2.2c.23-.23.5-.3.67-.3H10c.17 0 .42.06.64.3c.25.26 1 2.37 1.1 2.55.1.18.1.36-.02.6-.1.2-.24.44-.36.58l-.4.43c-.15.15-.3.32-.1.66.2.34.88 1.44 1.88 2.33.63.56 1.16.8 1.5.94.33.14.53.1.72-.1l1.1-1.3c.25-.3.5-.25.85-.12s2.2 1 2.6 1.2c.38.18.63.26.7.38.1.18.1 1-.25 2.1z"/>
                     </svg>
                     <span>Join Our WhatsApp Community</span>
                  </a>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                  <button onClick={() => navigate('/dashboard')} className="flex-1 py-4 bg-slate-900 text-amber-400 font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 text-lg">
                    Explore My Dashboard
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

function OnboardingSubmissionDetails({ data }: { data: any }) {
  return (
    <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left max-w-xl mx-auto my-6 text-sm">
      <h3 className="font-extrabold text-slate-800 mb-4 text-xs tracking-tight border-b border-slate-200 pb-2 uppercase text-[11px] tracking-wider text-indigo-700 flex items-center gap-2">
        <span>📋</span> Submitted Application Details
      </h3>
      <div className="space-y-4 text-xs md:text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Name</span>
            <span className="text-slate-800 font-semibold">{data.fullName || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Gender</span>
            <span className="text-slate-800 font-semibold">{data.gender || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">WhatsApp Number</span>
            <span className="text-slate-800 font-mono font-semibold">{data.whatsapp || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">State of Residence</span>
            <span className="text-slate-800 font-semibold">{data.state || '-'}</span>
          </div>
        </div>

        <div className="border-t border-slate-150 pt-3 space-y-3">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Recommended Study Program</span>
            <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded text-xs inline-block mt-0.5">
              {data.recommendedPath || '-'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Path Selections</span>
            <span className="text-slate-800 font-bold text-xs">
              {data.courseType || ''} {data.pathwaySelection ? `(${data.pathwaySelection})` : ''}
            </span>
          </div>
          {data.pathwayReason && (
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Reason for Selection</span>
              <p className="text-slate-650 italic mt-0.5 leading-relaxed bg-white p-2 border border-slate-150 rounded">{data.pathwayReason}</p>
            </div>
          )}
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Prior Experience in Course</span>
            <span className="text-slate-800 font-semibold">{data.pathwayExperience || data.experience || 'None'}</span>
          </div>
          {data.intent && (
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">What are you building CIYA Academy for?</span>
              <p className="text-slate-650 italic mt-0.5 leading-relaxed bg-white p-2 border border-slate-150 rounded">{data.intent}</p>
            </div>
          )}
          {data.goal && (
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Learning Goal</span>
              <p className="text-slate-650 italic mt-0.5 leading-relaxed bg-white p-2 border border-slate-150 rounded">{data.goal}</p>
            </div>
          )}
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Commitment Level</span>
            <span className="text-slate-850 font-bold">{data.availability || '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PathwayA({ data, setData, onNext }: { data: any, setData: any, onNext: () => void }) {
  const [subStep, setSubStep] = useState(1);
  const q1 = [
    { title: 'Landing Pages', meaning: 'A standalone web page created specifically for a marketing or advertising campaign.', uses: 'Lead generation, sales funnels, webinar registrations, product launches.', businesses: 'Course creators, marketers, event organizers, startups.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=a79c48c3e64b87dd05785e11a7bbfd24_xtpnvp' },
    { title: 'E-commerce Stores', meaning: 'A virtual storefront where businesses can sell products or services online.', uses: 'Online retail, dropshipping, subscription services, digital products.', businesses: 'Fashion brands, retailers, creators, direct-to-consumer startups.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=5b233e180530fcf94134bfed78e2c49d_720w_gqclim' },
    { title: 'Portfolio Websites', meaning: 'A personal website showcasing an individual\'s work, skills, and experience.', uses: 'Displaying projects, sharing case studies, personal branding.', businesses: 'Freelancers, consultants, artists, photographers, developers.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=704f7970e09360476c34e5b8dd6a1239_720w_hkdauz' },
    { title: 'Business Websites', meaning: 'A comprehensive site representing a company\'s brand, services, and contact info.', uses: 'Establishing credibility, providing info, client inquiries.', businesses: 'Consultants, agencies, corporate firms, local service businesses.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=e354a38f14d9cf824f2b4a73a11ad45c_t4_qvqj5r' }
  ];
  const q2 = ['To build for my own business', 'To get clients and make money', 'To stop paying developers'];
  const q3 = ['Never', 'Only with Canva/Wix', 'I tried coding before', 'I already build websites manually'];

  const clickQ1 = (val: string) => { setData((p:any) => ({...p, pathwaySelection: val})); setSubStep(2); };
  const clickQ2 = (val: string) => { setData((p:any) => ({...p, pathwayReason: val})); setSubStep(3); };
  const clickQ3 = (val: string) => { setData((p:any) => ({...p, pathwayExperience: val})); onNext(); };

  return <PathwayFlow step={subStep} mediaType="video"
    title1="What type of website would you love to create?" opts1={q1} click1={clickQ1}
    title2="Why do you want to learn website creation?" opts2={q2} click2={clickQ2}
    title3="Have you ever built a website before?" opts3={q3} click3={clickQ3}
  />;
}

function PathwayB({ data, setData, onNext }: { data: any, setData: any, onNext: () => void }) {
  const [subStep, setSubStep] = useState(1);
  const q1 = [
    { title: 'Social media videos', meaning: 'Short-form content optimized for platforms like TikTok, Instagram, and Shorts.', uses: 'Viral marketing, brand awareness, engagement, trends.', businesses: 'Content creators, influencers, consumer brands, agencies.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=7bee2ea0eabdda3d8b25f88bb5cac243_720w_igzzgc' },
    { title: 'Commercial/product ads', meaning: 'Promotional videos designed to sell a specific product or service.', uses: 'Paid advertising, social media campaigns, product launches.', businesses: 'E-commerce stores, SaaS companies, real estate, physical product brands.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=5a34fc982d2847355b768f97774966a7_720w_kd1iw5' },
    { title: 'YouTube content', meaning: 'Long-form educational, entertaining, or documentary-style videos.', uses: 'Community building, deep-dive tutorials, vlogging, monetization.', businesses: 'Educators, entertainers, thought leaders, media companies.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=c5495e4e04d349539fe97a193db66b92_720w_ntvzus' },
    { title: 'Cinematic storytelling', meaning: 'High-quality, narrative-driven videos with movie-like aesthetics.', uses: 'Brand films, short films, music videos, emotional storytelling.', businesses: 'Luxury brands, filmmakers, travel agencies, musicians.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=d8e7b4c4d2c6d301fe8368f0d083c8e4_720w_ls2fk3' }
  ];
  const q2 = ['Grow my brand', 'Become a content creator', 'Start a faceless YouTube channel', 'Offer video services to clients', 'Learn AI filmmaking for fun'];
  const q3 = ['None', 'CapCut', 'Canva', 'Premiere Pro', 'AI tools already'];

  const clickQ1 = (val: string) => { setData((p:any) => ({...p, pathwaySelection: val})); setSubStep(2); };
  const clickQ2 = (val: string) => { setData((p:any) => ({...p, pathwayReason: val})); setSubStep(3); };
  const clickQ3 = (val: string) => { setData((p:any) => ({...p, pathwayExperience: val})); onNext(); };

  return <PathwayFlow step={subStep} mediaType="video"
    title1="What kind of videos do you want to create?" opts1={q1} click1={clickQ1}
    title2="What is your main goal?" opts2={q2} click2={clickQ2}
    title3="What tools have you used before?" opts3={q3} click3={clickQ3}
  />;
}

function PathwayC({ data, setData, onNext }: { data: any, setData: any, onNext: () => void }) {
  const [subStep, setSubStep] = useState(1);
  const q1 = [
    { title: 'Flyers & ads', meaning: 'Single-page promotional graphics for events, sales, or campaigns.', uses: 'Digital marketing, printed promotions, event awareness.', businesses: 'Event organizers, restaurants, retail stores, local businesses.', src: 'https://res.cloudinary.com/di4dlnd5x/image/upload/v1779199753/Clothing_Ad_Flyer_Design_d7wwr7.jpg' },
    { title: 'Logos & branding', meaning: 'The foundational visual identity and marks that represent a company.', uses: 'Establishing brand recognition, trust, and professional appearance.', businesses: 'Startups, rebranding companies, freelancers, agencies.', src: 'https://res.cloudinary.com/di4dlnd5x/image/upload/v1779199775/Brand_Identity_-_Marketing_Agency_q3fhwf.jpg' },
    { title: 'Social media graphics', meaning: 'Visual content like carousels, posts, and banners tailored for social platforms.', uses: 'Audience engagement, sharing tips, announcements, community building.', businesses: 'Coaches, influencers, B2B companies, non-profits.', src: 'https://res.cloudinary.com/di4dlnd5x/image/upload/v1779199790/New_Month_Flyer_November_iypfck.jpg' },
    { title: 'Product mockups', meaning: 'The user interface design outlining how digital products look and feel.', uses: 'Prototyping apps, redesigning websites, improving user experience.', businesses: 'Tech startups, software companies, digital agencies, entrepreneurs.', src: 'https://res.cloudinary.com/di4dlnd5x/image/upload/v1779199740/Clear_Ledger_jvkytv.jpg' }
  ];
  const q2 = ['Personal branding', 'Business promotion', 'Freelancing', 'Social media growth', 'To stop outsourcing designs'];
  const q3 = ['Complete beginner', 'Canva user', 'Photoshop user', 'Professional designer'];

  const clickQ1 = (val: string) => { setData((p:any) => ({...p, pathwaySelection: val})); setSubStep(2); };
  const clickQ2 = (val: string) => { setData((p:any) => ({...p, pathwayReason: val})); setSubStep(3); };
  const clickQ3 = (val: string) => { setData((p:any) => ({...p, pathwayExperience: val})); onNext(); };

  return <PathwayFlow step={subStep} mediaType="image"
    title1="What type of designs interest you most?" opts1={q1} click1={clickQ1}
    title2="Why do you want to learn design?" opts2={q2} click2={clickQ2}
    title3="What’s your current design experience?" opts3={q3} click3={clickQ3}
  />;
}

function PathwayFlow({ step, mediaType, title1, opts1, click1, title2, opts2, click2, title3, opts3, click3 }: any) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="max-w-2xl w-full">
      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full">
           <h2 className="text-3xl font-extrabold text-slate-800 mb-8 text-center">{title1}</h2>
           <div className="flex flex-col gap-4">
             {opts1.map((opt: any, i: number) => {
                const isExpanded = expandedIndex === i;
                return (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all hover:shadow">
                    <button 
                      onClick={() => setExpandedIndex(isExpanded ? null : i)} 
                      className="w-full p-6 text-left flex items-center justify-between focus:outline-none"
                    >
                      <span className="font-bold text-slate-800 text-lg">{opt.title}</span>
                      <div className={`p-2 rounded-full border border-slate-200 text-slate-500 transition-transform ${isExpanded ? 'rotate-180 bg-slate-50' : ''}`}>
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50">
                        <div className="flex flex-col md:flex-row gap-6 mb-6">
                           <div className="flex-1 space-y-4">
                             <div><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Meaning</span><p className="text-slate-700 font-medium text-sm mt-1">{opt.meaning}</p></div>
                             <div><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Uses</span><p className="text-slate-700 font-medium text-sm mt-1">{opt.uses}</p></div>
                             <div><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Businesses that need it</span><p className="text-slate-700 font-medium text-sm mt-1">{opt.businesses}</p></div>
                           </div>
                           <div className="w-full md:w-72 h-72 md:h-64 bg-slate-200 rounded-xl flex items-center justify-center shrink-0 border border-slate-300 relative overflow-hidden">
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
                                 <img src={opt.src} alt={opt.title} className="w-full h-full object-cover" />
                               )
                             ) : mediaType === 'video' ? (
                               <div className="flex flex-col items-center text-slate-400">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                                 <span className="text-xs font-bold mt-2">Video Example</span>
                               </div>
                             ) : (
                               <div className="flex flex-col items-center text-slate-400">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                 <span className="text-xs font-bold mt-2">Design Example</span>
                               </div>
                             )}
                           </div>
                        </div>
                        <button onClick={() => click1(opt.title)} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold rounded-xl transition-colors">
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
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-xl mx-auto">
           <h2 className="text-3xl font-extrabold text-slate-800 mb-8 text-center">{title2}</h2>
           <div className="space-y-3">
             {opts2.map((opt: string, i: number) => (
               <button key={i} onClick={() => click2(opt)} className="w-full p-5 text-left rounded-2xl border-2 border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50 text-slate-700 font-semibold transition-all">
                 {opt}
               </button>
             ))}
           </div>
        </motion.div>
      )}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-xl mx-auto">
           <h2 className="text-3xl font-extrabold text-slate-800 mb-8 text-center">{title3}</h2>
           <div className="space-y-3">
             {opts3.map((opt: string, i: number) => (
               <button key={i} onClick={() => click3(opt)} className="w-full p-5 text-left rounded-2xl border-2 border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50 text-slate-700 font-semibold transition-all">
                 {opt}
               </button>
             ))}
           </div>
        </motion.div>
      )}
    </div>
  );
}
