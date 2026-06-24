import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { Check, ArrowRight, ChevronLeft, Globe, Film, Palette, Zap, Briefcase, TrendingUp, Sparkles, User, MessageCircle, MapPin, Gift, Clock, ShoppingBag } from 'lucide-react';

type Pathway = 'A' | 'B' | 'C' | null;

export default function WaitingOnboarding() {
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
    { val: 'A' as Pathway, label: 'AI Landing Page Creation', icon: <Globe className="w-6 h-6 text-blue-500" /> },
    { val: 'B' as Pathway, label: 'AI E-commerce Website Creation', icon: <ShoppingBag className="w-6 h-6 text-emerald-500" /> }
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

  const handleWhatsAppSubmit = () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      // Generate a unique registration code
      const registrationCode = "CIYA-" + Math.floor(1000 + Math.random() * 9000);
      
      let recommendedPath = '';
      if (pathway === 'A') {
        if (data.experience.includes('Intermediate') || data.experience.includes('tried')) {
          recommendedPath = 'Professional Conversion Page Builder';
        } else if (data.experience.includes('expert')) {
          recommendedPath = 'Conversion Funnel Agency Masterclass';
        } else {
          recommendedPath = 'Landing Page Foundations';
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

      setCreationTime(new Date().getTime());
      
      // Update state
      setData(d => ({ 
        ...d, 
        recommendedPath, 
        myReferralCode: registrationCode,
        isActivated: false 
      }));
      
      // Transition to preview screen without opening WhatsApp yet
      nextStep();
    } catch (err: any) {
      console.error(err);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 9 && creationTime) {
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
  }, [step, creationTime]);

  const getWhatsAppLink = (phone: string) => {
    const msg = `*⏳ NEW CIY ACADEMY REGISTRATION*

*👤 PERSONAL DETAILS:*
• *Name:* ${data.fullName || ''}
• *WhatsApp:* ${data.whatsapp || ''}
• *Gender:* ${data.gender || ''}
• *State:* ${data.state || ''}

*📚 ACADEMIC PROFILE:*
• *Recommended:* ${data.recommendedPath || ''}
• *Pathway Selection:* ${data.courseType || ''} ${data.pathwaySelection ? `(${data.pathwaySelection})` : ''}
• *Reason:* ${data.pathwayReason || 'N/A'}
• *Experience:* ${data.pathwayExperience || data.experience || 'None'}

*🎯 COMMITMENT & GOALS:*
• *Target Goal:* ${data.goal || 'N/A'}
• *Commitment:* ${data.availability || 'N/A'}
• *Registration Code:* ${data.myReferralCode || ''}

_Action: Please review my CIY Academy application. Thank you!_`;
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
  };

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
                <span className="text-white font-black tracking-tight text-3xl uppercase">CIYA</span>
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-extrabold text-slate-800 leading-tight tracking-tight">
                  Join CIY Academy
                </h1>
                <p className="text-sm font-bold uppercase tracking-widest text-amber-600 mt-2">
                  Create It Yourself Academy
                </p>
              </div>
              <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium max-w-xl mx-auto">
                Secure your spot for our upcoming AI & digital skills program:
              </p>
              <ul className="text-left bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-md mx-auto space-y-4 font-medium text-slate-700">
                <li className="flex items-center gap-3"><Check className="text-green-500 w-5 h-5 flex-shrink-0" /> AI Landing Page & Funnel Building</li>
                <li className="flex items-center gap-3"><Check className="text-green-500 w-5 h-5 flex-shrink-0" /> AI E-commerce Store Building</li>
                <li className="flex items-center gap-3"><Check className="text-green-500 w-5 h-5 flex-shrink-0" /> Easy 1-click WhatsApp verification</li>
              </ul>
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                <button onClick={nextStep} className="px-8 py-4 bg-amber-500 text-amber-950 font-bold rounded-full shadow-lg hover:-translate-y-1 hover:shadow-amber-500/30 transition-all text-lg flex items-center justify-center gap-2 mx-auto">
                  Start My Application <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl w-full">
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
            <motion.div key="3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl w-full">
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
            <motion.div key="4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-xl w-full">
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
            <motion.div key="6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-xl w-full">
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
            <motion.div key="7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-xl w-full">
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
            <motion.div key="8" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-md w-full">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Join CIY Academy</h2>
                <p className="text-slate-600">Please provide your details below. Your details will be sent directly via WhatsApp to complete your registration.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-lg">{formError}</div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={data.fullName} onChange={e => selectData('fullName', e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none transition-all text-slate-800 placeholder:text-slate-400" placeholder="John Doe" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Gender *</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                    <select value={data.gender} onChange={e => selectData('gender', e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none transition-all appearance-none text-slate-800">
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
                    <input type="tel" value={data.whatsapp} onChange={e => selectData('whatsapp', e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none transition-all text-slate-800 placeholder:text-slate-400" placeholder="+234..." />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">State *</label>
                  <div className="relative">
                    <MapPin className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                    <select value={data.state} onChange={e => selectData('state', e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none transition-all appearance-none text-slate-800">
                      <option value="" disabled>Select State</option>
                      {NIGERIAN_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button 
                  onClick={handleWhatsAppSubmit} 
                  disabled={loading} 
                  className={`w-full py-4.5 bg-amber-500 hover:bg-amber-600 text-amber-950 rounded-full font-black text-lg shadow-lg flex items-center justify-center gap-3 disabled:opacity-85 transition-all relative overflow-hidden active:scale-[0.98] ${loading ? 'cursor-not-allowed animate-pulse shadow-md shadow-amber-500/20' : 'cursor-pointer'}`}
                >
                  <span>Process Application</span>
                  <ArrowRight className="w-5 h-5 text-amber-950" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 9 && (
            <motion.div key="9" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl w-full">
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-100 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"></div>
                
                <div className="w-24 h-24 bg-gradient-to-tr from-amber-50 to-orange-50 rounded-full mx-auto flex items-center justify-center mb-8 ring-8 ring-amber-400/10 border border-amber-200/60 shadow-inner relative animate-pulse">
                  <div className="absolute inset-0 rounded-full bg-amber-400/5 animate-ping opacity-75" />
                  <Clock className="w-12 h-12 text-amber-600 relative z-10" />
                </div>

                <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-6 tracking-tight">Application Prepared! ⏳</h2>
                
                <div className="text-slate-700 text-lg md:text-xl font-medium mb-8 leading-relaxed max-w-xl mx-auto">
                  <p>
                    Thank you for applying, <strong className="text-slate-900 font-extrabold">{data.fullName ? data.fullName.split(' ')[0] : 'Student'}</strong>! To finalize your registration, make sure you forward your details directly to the admissions team on WhatsApp.
                  </p>
                </div>

                <div className="bg-amber-500 text-amber-950 rounded-3xl p-6 md:p-8 mb-8 text-center space-y-4 shadow-xl border border-amber-400 relative overflow-hidden">
                  <div className="flex items-center justify-center gap-2.5">
                    <span className="flex h-3.5 w-3.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-80"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-950"></span>
                    </span>
                    <h3 className="font-black text-amber-950 text-base md:text-lg uppercase tracking-widest">
                      WhatsApp Dispatch Ready
                    </h3>
                  </div>

                  <p className="text-sm md:text-base text-amber-900 leading-relaxed font-bold max-w-lg mx-auto">
                    Click the button below to submit your details directly. Once verified, we will contact you directly via WhatsApp!
                  </p>
                </div>

                <div className="w-full mb-8 max-h-[250px] overflow-y-auto rounded-2xl border border-slate-100">
                  <OnboardingSubmissionDetails data={data} />
                </div>

                <div className="mb-8">
                  <a 
                    href={getWhatsAppLink("2349042544355")}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-center gap-3 px-6 py-4.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-base md:text-lg transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-emerald-600/30 w-full cursor-pointer border-0"
                  >
                    <svg className="w-6 h-6 md:w-7 md:h-7 fill-white" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.729-1.458L0 24zm6.59-4.846c1.6.95 3.1 1.45 4.8 1.45 5.5 0 10-4.5 10-10s-4.5-10-10-10C6.9 1 2.3 5.5 2.3 11c0 1.9.5 3.7 1.5 5.3l-.98 3.56 3.65-.96zm12.33-7.53c-.34-.17-2.03-1-2.34-1.1-.3-.1-.53-.17-.76.17-.23.34-.88 1.1-.1.82a.85.85 0 0 0-.25-.6c-.2-.17-.8-.42-1.5-.7-2.65-1.15-4.42-3.8-4.55-4-.14-.17-1.18-1.57-1.18-3a3 3 0 0 1 1-2.2c.23-.23.5-.3.67-.3H10c.17 0 .42.06.64.3c.25.26 1 2.37 1.1 2.55.1.18.1.36-.02.6-.1.2-.24.44-.36.58l-.4.43c-.15.15-.3.32-.1.66.2.34.88 1.44 1.88 2.33.63.56 1.16.8 1.5.94.33.14.53.1.72-.1l1.1-1.3c.25-.3.5-.25.85-.12s2.2 1 2.6 1.2c.38.18.63.26.7.38.1.18.1 1-.25 2.1z"/>
                    </svg>
                    <span>Submit/Resend via WhatsApp</span>
                  </a>
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
        <span>📋</span> Prepared Registration Details
      </h3>
      <div className="space-y-4 text-xs md:text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">Full Name</span>
            <span className="text-slate-800 font-semibold">{data.fullName || '-'}</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">Gender</span>
            <span className="text-slate-800 font-semibold">{data.gender || '-'}</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">WhatsApp Number</span>
            <span className="text-slate-800 font-mono font-semibold">{data.whatsapp || '-'}</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">State of Residence</span>
            <span className="text-slate-800 font-semibold">{data.state || '-'}</span>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3 space-y-3">
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">Recommended Study Program</span>
            <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded text-xs inline-block mt-0.5">
              {data.recommendedPath || '-'}
            </span>
          </div>
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">Path Selections</span>
            <span className="text-slate-800 font-bold text-xs">
              {data.courseType || ''} {data.pathwaySelection ? `(${data.pathwaySelection})` : ''}
            </span>
          </div>
          {data.pathwayReason && (
            <div>
              <span className="text-slate-600 block text-[10px] uppercase font-bold">Reason for Selection</span>
              <p className="text-slate-600 italic mt-0.5 leading-relaxed bg-white p-2 border border-slate-200 rounded">{data.pathwayReason}</p>
            </div>
          )}
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">Prior Experience in Course</span>
            <span className="text-slate-800 font-semibold">{data.pathwayExperience || data.experience || 'None'}</span>
          </div>
          {data.intent && (
            <div>
              <span className="text-slate-600 block text-[10px] uppercase font-bold">What are you building CIY Academy for?</span>
              <p className="text-slate-600 italic mt-0.5 leading-relaxed bg-white p-2 border border-slate-200 rounded">{data.intent}</p>
            </div>
          )}
          {data.goal && (
            <div>
              <span className="text-slate-600 block text-[10px] uppercase font-bold">Target Learning Goal</span>
              <p className="text-slate-600 italic mt-0.5 leading-relaxed bg-white p-2 border border-slate-200 rounded">{data.goal}</p>
            </div>
          )}
          <div>
            <span className="text-slate-600 block text-[10px] uppercase font-bold">Commitment Level</span>
            <span className="text-slate-800 font-bold">{data.availability || '-'}</span>
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
