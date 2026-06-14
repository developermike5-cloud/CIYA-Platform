import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Link, useNavigate } from 'react-router';
import { 
  Lightbulb, Gift, Bot, Wallet, Check, Smartphone, Briefcase, Zap, TrendingUp, Globe, Film, Palette, Sparkles
} from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

function Typewriter({ texts }: { texts: string[] }) {
  const [textIndex, setTextIndex] = useState(0);
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: any;
    const currentFullText = texts[textIndex];

    if (!isDeleting && text === currentFullText) {
      timer = setTimeout(() => setIsDeleting(true), 3000);
    } else if (isDeleting && text === '') {
      setIsDeleting(false);
      setTextIndex((prev) => (prev + 1) % texts.length);
    } else {
      const nextText = isDeleting 
        ? currentFullText.substring(0, text.length - 1)
        : currentFullText.substring(0, text.length + 1);

      timer = setTimeout(() => setText(nextText), isDeleting ? 40 : 100);
    }

    return () => clearTimeout(timer);
  }, [text, isDeleting, textIndex, texts]);

  return (
    <span className="inline-block min-h-[1.2em]">
      {text}
      <span className="animate-pulse font-normal">|</span>
    </span>
  );
}

function Counter({ from = 0, to, duration = 2, suffix = "" }: { from?: number, to: number, duration?: number, suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  
  useEffect(() => {
    if (!inView) return;
    let start = performance.now();
    let frameId: number;
    const update = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const p = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(from + (to - from) * p);
      if (ref.current) {
        ref.current.textContent = current.toLocaleString() + suffix;
      }
      if (progress < 1) {
        frameId = requestAnimationFrame(update);
      }
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [inView, from, to, duration, suffix]);

  return <span ref={ref}>{from.toLocaleString()}{suffix}</span>;
}

function MissionCard({ item, index }: { item: any, index: number, key?: React.Key }) {
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 100%", "center center"]
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.85, 1.05]);
  const subOpacity = useTransform(scrollYProgress, [0.5, 1], [0, 1]);
  const subY = useTransform(scrollYProgress, [0.5, 1], [20, 0]);
  const lineOpacity = useTransform(scrollYProgress, [0.8, 1], [0, 1]);
  const titleY = useTransform(scrollYProgress, [0.5, 1], [20, -15]);

  return (
    <motion.div 
      ref={ref}
      style={{ scale }}
      className="relative rounded-2xl h-64 shadow-xl overflow-hidden group bg-teal-950"
    >
      <motion.div 
        style={{ opacity: lineOpacity }}
        className="absolute inset-0 z-0 pointer-events-none"
      >
        <div className="absolute inset-[-150%] animate-[spin_3s_linear_infinite]" style={{ background: 'conic-gradient(from 0deg, transparent 75%, #fbbf24 100%)' }} />
      </motion.div>
      <div className="absolute inset-[2px] bg-teal-900/95 backdrop-blur-3xl rounded-[14px] z-10 pointer-events-none" />

      <div className="relative z-20 flex flex-col items-center h-full p-8 justify-center">
        <motion.div style={{ y: titleY }} className="flex flex-col items-center">
          <item.icon className="w-10 h-10 text-amber-400 mb-4" />
          <h4 className="text-base font-bold tracking-wider uppercase text-teal-100">{item.title}</h4>
        </motion.div>
        
        <motion.div 
          style={{ opacity: subOpacity, y: subY }}
          className="absolute bottom-8 left-0 right-0 px-6"
        >
          <p className="text-sm text-teal-300 leading-relaxed font-medium">{item.desc}</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

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
        if (auth.currentUser.email === 'developermike5@gmail.com') {
          navigate('/admin');
        } else {
          const docSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (docSnap.exists()) {
            navigate('/dashboard');
          } else {
            await signOut(auth);
            alert("Your account is not registered. If you are an invited student, please complete the registration using the private onboarding link sent by your administrator.");
          }
        }
        return;
      }
      globalLoginActive = true;
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
          await signOut(auth);
          alert("Your account is not registered. If you are an invited student, please complete the registration using the private onboarding link sent by your administrator.");
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

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const navAnimation = {
  hidden: { y: -100, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

function Navbar() {
  const login = useLogin();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav 
      initial="hidden" animate="visible" variants={navAnimation}
      className={`fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 md:px-12 lg:px-24 h-24 shrink-0 transition-all duration-300 ${
        scrolled ? 'bg-teal-950/80 backdrop-blur-md border-b border-teal-900' : 'bg-transparent'
      }`}
    >
      <a href="#" className="flex flex-col gap-1 items-start">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-lg shadow-lg shadow-orange-500/20 shrink-0"></div>
          <span className="font-bold text-xl tracking-tight uppercase text-teal-50">CIYA</span>
        </div>
        <span className="text-[10px] font-semibold tracking-[0.2em] text-teal-300/90 uppercase leading-none mt-0.5">
          Create It Yourself Academy
        </span>
      </a>
      
      <div className="hidden md:flex items-center gap-10 text-sm font-medium text-teal-200">
        <a href="#mission" className="hover:text-amber-400 transition-colors">Mission</a>
        <a href="#courses" className="hover:text-amber-400 transition-colors">Courses</a>
        <a href="#how" className="hover:text-amber-400 transition-colors">How it works</a>
        <a href="#why" className="hover:text-amber-400 transition-colors">Why CIYA</a>
      </div>
    </motion.nav>
  );
}

function Hero() {
  const login = useLogin();
  return (
    <section className="relative min-h-[100svh] flex flex-col justify-center items-center px-6 md:px-12 pb-16 pt-32 lg:px-24 overflow-hidden text-center" id="home">
      <div className="absolute top-1/4 w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-teal-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
      
      <motion.div 
        className="flex flex-col items-center mt-4 z-10 w-full max-w-4xl"
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-900/80 border border-teal-800 text-xs font-semibold text-amber-400 mb-8 backdrop-blur-sm shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          Bridging Nigeria's Skill Gap
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-8 text-teal-50 min-h-[2.5em] md:min-h-[2.3em]">
          Build Skills.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 mt-2 block">
            <Typewriter texts={["Create It Yourself", "Elevate your skills", "Build Your Freedom"]} />
          </span>
        </h1>

        <p className="text-teal-200 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
          Create It Yourself Academy (CIYA) empowers Nigerian youths with powerful AI-driven website creation skills — from high-impact landing pages to fully functional e-commerce websites. Free to start. Real results. No excuses.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16 w-full justify-center">
          <Link to="/get-started" className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-teal-950 rounded-full text-sm font-bold shadow-lg shadow-amber-500/30 transition-all text-center cursor-pointer">
            Start for Free
          </Link>
          <a href="#courses" className="px-8 py-3.5 bg-teal-900 border border-teal-800 hover:bg-teal-800 hover:border-teal-700 text-teal-50 font-bold rounded-full text-sm transition-all text-center flex items-center justify-center">
             Explore Courses
          </a>
        </div>

        <motion.div className="flex flex-wrap gap-10 md:gap-16 justify-center w-full" variants={staggerContainer} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="flex flex-col items-center">
            <span className="text-3xl lg:text-4xl font-extrabold text-teal-50 tracking-tight leading-none mb-2"><Counter to={10000} suffix="+" /></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">Youths to Empower</span>
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-col items-center">
            <span className="text-3xl lg:text-4xl font-extrabold text-teal-50 tracking-tight leading-none mb-2"><Counter to={12} /></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">In-Demand Skills</span>
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-col items-center">
            <span className="text-3xl lg:text-4xl font-extrabold text-teal-50 tracking-tight leading-none mb-2"><Counter to={5} suffix=" Days" /></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">Per Course Package</span>
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-col items-center">
            <span className="text-3xl lg:text-4xl font-extrabold text-teal-50 tracking-tight leading-none mb-2">FREE</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">Beginner Entry</span>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function Mission() {
  return (
    <section className="bg-teal-900/30 py-24 px-6 md:px-12 lg:px-24 border-y border-teal-900 relative" id="mission">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/5 blur-[100px] -z-10 rounded-full" />
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-16 items-center">
        
        <motion.div className="flex-1" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
          <span className="text-sm font-semibold uppercase tracking-wider text-teal-400 mb-4 block">Our Mission</span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-teal-50 leading-[1.1] mb-6 tracking-tight">
            Unemployment is a problem. <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 inline-block mt-2">Skills are the solution.</span>
          </h2>
          <p className="text-teal-200 mb-5 text-lg leading-relaxed match-blend-plus-lighter">
            In Nigeria and across Africa, millions of talented youths struggle to find employment — not because they lack potential, but because they lack the right digital skills to compete in today's economy.
          </p>
          <p className="text-teal-200 text-lg leading-relaxed match-blend-plus-lighter">
            CIYA was built to change that. We use AI to make world-class digital skills accessible, affordable, and practical. Whether you want to save money by doing things yourself or earn money by offering services — CIYA gives you everything you need.
          </p>
        </motion.div>

        <motion.div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
          {[
            { icon: Lightbulb, title: "Learn by Doing", desc: "Practical, hands-on training that gets you results within 5 days." },
            { icon: Gift, title: "Free to Begin", desc: "Beginner courses are completely free — no barriers to entry." },
            { icon: Bot, title: "AI-Powered", desc: "Forget difficult coding. Let AI do the heavy lifting while you create." },
            { icon: Wallet, title: "Earn or Save", desc: "Use your skills to save money or charge clients for services." },
          ].map((item, i) => (
            <MissionCard key={i} item={item} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const COURSES_DATA = {
  landing: {
    icon: Lightbulb,
    title: "AI Landing Page Creation",
    desc: "Building a landing page in 2026 is the easiest it has ever been — thanks to AI. Whether you need a landing page to sell your service, capture emails for your lead magnet, build personal branding, or create an interactive sales funnel, CIYA teaches you exactly how to do it without writing a single line of code.",
    tiers: [
      {
        level: "Beginner",
        title: "Landing Page Foundations",
        price: "100% Free",
        isFree: true,
        desc: "Build your first landing page in 5 days using AI generators. No coding needed. Enough to launch your online presence right away.",
        features: ["Landing page creation", "AI copywriting assistant", "Lead capture forms", "Publish & go live"]
      },
      {
        level: "Advanced",
        title: "Professional Conversion Page Builder",
        price: "₦15,000",
        subPrice: "/ 5-day course",
        featured: true,
        badge: "Most Popular",
        desc: "Offer professional landing page design services. Learn the full workflow to structure conversion heroes, perform speed audits, and deliver client projects confidently.",
        features: ["Commercial landing pages", "Speed & responsiveness", "Analytics setup & tracking", "Client delivery workflow"]
      },
      {
        level: "Masterclass",
        title: "Conversion Funnel Agency",
        price: "₦30,000",
        subPrice: "/ 5-day course",
        desc: "Scale into a high-ticket landing page agency. Master multivariate layout testing, advanced copywriting frameworks, client acquisition, and team pricing.",
        features: ["Complex marketing systems", "Client acquisition strategy", "High-ticket pricing & packaging", "Agency team operations"]
      }
    ],
    pillsTitle: "Landing Page formats You'll Learn to Build",
    pills: [
      "SaaS Landing Pages (Product walkthroughs)",
      "Local Business Pages (Leads capture)",
      "Course & Webinar Registrations (Funnels)",
      "App Launch Showcase Pages (Waitlist capture)",
      "Personal Branding Pages (Speaker, coach bio)",
      "Event Promotion Landing Pages"
    ]
  },
  ecommerce: {
    icon: Globe,
    title: "AI E-commerce Website Creation",
    desc: "Transform standard catalogs into highly profitable automated web stores. Learn to design high-converting visual stores using interactive AI layouts, build responsive shopping carts, configure inventory sync, and integrate WhatsApp checkout flows that receive and organize orders seamlessly.",
    tiers: [
      {
        level: "Beginner",
        title: "E-commerce Essentials",
        price: "100% Free",
        isFree: true,
        desc: "Launch your personal online store in 5 days with AI. Hook up a basic catalog, add product cards, set up images, and integrate simple WhatsApp checkouts for instant sales.",
        features: ["Product listing setups", "Interactive shop catalogs", "WhatsApp routing checkouts", "Inventory publishing"]
      },
      {
        level: "Advanced",
        title: "Professional Store Builder",
        price: "₦15,000",
        subPrice: "/ 5-day course",
        featured: true,
        badge: "Most Popular",
        desc: "Build highly robust commercial stores for retail brands and direct-to-consumer businesses. Include filters, order search, tax setups, and localized delivery configurations.",
        features: ["Advanced shopping carts", "Promo codes & discounts", "Product search & indexing", "Payment gateway plugins"]
      },
      {
        level: "Masterclass",
        title: "E-Commerce Agency Growth",
        price: "₦30,000",
        subPrice: "/ 5-day course",
        desc: "Create and scale a dedicated e-commerce agency. Gain high-value store blueprints, master wholesale setup strategies, and access lead lists of retail merchants ready to pay for dynamic stores.",
        features: ["Multi-vendor marketplaces", "Automated email notifications", "Merchant sales reporting", "Agency client acquisition"]
      }
    ],
    pillsTitle: "Store Structures You'll Build",
    pills: [
      "WhatsApp Automated Stores (Instant orders)",
      "Digital Product Stores (E-books, downloads)",
      "Fashion & Boutique Showcase Stores (Retail)",
      "Dropshipping Hubs (AI product import)",
      "Subscription & Box Stores (Weekly/Monthly)",
      "Local Grocery & Delivery Catalogs"
    ]
  }
};

const MEDIA_URLS = {
  landing: [
    'https://res.cloudinary.com/di4dlnd5x/video/upload/v1/a79c48c3e64b87dd05785e11a7bbfd24_xtpnvp.mp4',
    'https://res.cloudinary.com/di4dlnd5x/video/upload/v1/e354a38f14d9cf824f2b4a73a11ad45c_t4_qvqj5r.mp4',
    'https://res.cloudinary.com/di4dlnd5x/video/upload/v1/704f7970e09360476c34e5b8dd6a1239_720w_hkdauz.mp4',
    'https://res.cloudinary.com/di4dlnd5x/video/upload/v1/e354a38f14d9cf824f2b4a73a11ad45c_t4_qvqj5r.mp4'
  ],
  ecommerce: [
    'https://res.cloudinary.com/di4dlnd5x/video/upload/v1/5b233e180530fcf94134bfed78e2c49d_720w_gqclim.mp4',
    'https://res.cloudinary.com/di4dlnd5x/video/upload/v1/5b233e180530fcf94134bfed78e2c49d_720w_gqclim.mp4',
    'https://res.cloudinary.com/di4dlnd5x/video/upload/v1/5b233e180530fcf94134bfed78e2c49d_720w_gqclim.mp4',
    'https://res.cloudinary.com/di4dlnd5x/video/upload/v1/5b233e180530fcf94134bfed78e2c49d_720w_gqclim.mp4'
  ]
};

function CourseSkillSection({ skillId }: { skillId: 'landing' | 'ecommerce' }) {
  const d = COURSES_DATA[skillId];
  const Icon = d.icon;
  const mUrls = MEDIA_URLS[skillId];

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });

  const op1 = useTransform(scrollYProgress, [0, 0.25, 0.35], [1, 1, 0]);
  const op2 = useTransform(scrollYProgress, [0.25, 0.35, 0.55, 0.65], [0, 1, 1, 0]);
  const op3 = useTransform(scrollYProgress, [0.55, 0.65, 0.85, 0.95], [0, 1, 1, 0]);
  const op4 = useTransform(scrollYProgress, [0.85, 0.95, 1], [0, 1, 1]);
  const ops = [op1, op2, op3, op4];

  const subskillNames = {
    landing: [
      "Copywriting",
      "Structure hero",
      "Leads capture",
      "Email integrations"
    ],
    ecommerce: [
      "WhatsApp checkouts",
      "Digital catalogs",
      "Shopping flows",
      "Cart management"
    ]
  }[skillId];

  return (
    <>
    <section className="bg-teal-950 px-6 md:px-12 lg:px-24 py-16 lg:py-24 border-b border-teal-900 border-t border-t-teal-700/30">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex flex-col justify-center">
          <div className="bg-teal-800/40 border border-teal-700/50 rounded-2xl md:rounded-3xl p-6 md:p-10 mb-8 md:mb-12 flex flex-col md:flex-row gap-6 items-center justify-between shadow-xl shrink-0">
            <div className="w-full">
              <h3 className="text-xl md:text-3xl font-extrabold text-teal-50 mb-3 md:mb-4 tracking-tight">{d.title}</h3>
              <p className="text-teal-100/90 leading-relaxed text-sm md:text-lg">{d.desc}</p>
            </div>
            <div className="hidden md:flex flex-shrink-0 w-20 h-20 bg-teal-900/60 rounded-full items-center justify-center border border-teal-600/50 shadow-inner">
              <Icon className="w-10 h-10 text-amber-400 drop-shadow-md" />
            </div>
          </div>

          {/* Single Tier Display (Beginner) */}
          <div className="flex justify-center shrink-0">
            {d.tiers.slice(0, 1).map((tier, i) => (
              <div key={i} className="max-w-xl w-full relative rounded-2xl md:rounded-3xl p-6 md:p-10 border bg-teal-900/60 border-teal-700/50 shadow-2xl flex flex-col">
                <div className="flex justify-between items-start mb-4 md:mb-6">
                  <div>
                    <div className="text-[11px] md:text-xs font-semibold tracking-widest uppercase text-amber-400 mb-1">{tier.level}</div>
                    <h4 className="text-lg md:text-2xl font-bold text-teal-50">{tier.title}</h4>
                  </div>
                  <div className="inline-block bg-amber-500 text-teal-950 px-4 py-1.5 md:px-5 md:py-2 rounded-full text-sm md:text-base font-black shadow-md shrink-0 border border-amber-400">
                    {tier.price}
                  </div>
                </div>
                
                <p className="text-sm md:text-base text-teal-100 mb-6 md:mb-8 leading-relaxed flex-grow">{tier.desc}</p>
                
                <ul className="grid sm:grid-cols-2 gap-3 md:gap-4 mb-8 md:mb-10">
                  {tier.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-xs md:text-sm text-teal-50 font-medium">
                      <Check className="w-4 h-4 md:w-5 md:h-5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to="/get-started" className="w-full text-center block rounded-full py-3.5 md:py-4 text-sm md:text-base font-bold transition-all border cursor-pointer bg-teal-50 text-teal-950 border-transparent hover:bg-amber-400 shadow-xl shadow-teal-950/50">
                  Join Free
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section ref={containerRef} className="h-[350vh] md:h-[400vh] relative bg-teal-950">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden flex flex-col justify-center py-6 md:py-20">
        
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0 pointer-events-none bg-teal-950">
          {mUrls.map((url, idx) => (
            <motion.div 
              key={url + idx}
              className="absolute inset-0 flex items-center justify-center overflow-hidden bg-teal-950"
              style={{ opacity: ops[idx] }}
            >
              <video src={url} autoPlay loop muted playsInline className="w-full h-full object-cover object-center pointer-events-none" />
            </motion.div>
          ))}
          <div className="absolute inset-0 bg-teal-950/10 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-teal-950/80 via-teal-950/20 to-transparent pointer-events-none" />
        </div>

        {/* Dynamic Navigation Progress Indicator (On the Right Edge) */}
        <div className="absolute right-4 md:right-8 lg:right-12 top-1/2 -translate-y-1/2 z-20 flex items-center gap-4 bg-teal-950/85 backdrop-blur-md px-4 py-6 rounded-2xl border border-teal-800/60 shadow-2xl">
          <div className="flex flex-col gap-5 text-right hidden lg:flex font-sans select-none">
            {subskillNames.map((name, idx) => {
              const textOpacity = useTransform(ops[idx], [0, 0.5, 1], [0.4, 0.7, 1]);
              const textColor = useTransform(ops[idx], [0, 1], ["#5eead4", "#fbbf24"]);
              const scale = useTransform(ops[idx], [0, 1], [0.9, 1.1]);
              return (
                <motion.div 
                  key={name}
                  style={{ opacity: textOpacity, color: textColor, scale }}
                  className="text-xs font-black tracking-wide h-6 flex items-center justify-end"
                >
                  {name}
                </motion.div>
              );
            })}
          </div>

          {/* Visual Vertical Progress Bar Tracker */}
          <div className="relative flex flex-col items-center justify-between h-56 w-8 pb-3 pt-3 select-none">
            {/* Background Line Track */}
            <div className="absolute top-4 bottom-4 left-1/2 -translate-x-1/2 w-1 bg-teal-900 border border-teal-800/40 rounded-full" />
            
            {/* Active Moving Progress Line */}
            <motion.div 
              style={{ 
                height: useTransform(scrollYProgress, [0, 1], ["0%", "100%"]),
                top: "16px"
              }} 
              className="absolute left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full shadow-[0_0_12px_#f59e0b] origin-top" 
            />

            {/* 4 Steps Bullet Indicators */}
            {subskillNames.map((name, idx) => {
              const ringColor = useTransform(ops[idx], [0, 1], ["rgba(20, 184, 166, 0.2)", "rgba(245, 158, 11, 1)"]);
              const activeBg = useTransform(ops[idx], [0, 1], ["#042f2e", "#fbbf24"]);
              const scale = useTransform(ops[idx], [0, 1], [1, 1.25]);

              return (
                <div key={idx} className="relative group/bullet flex items-center justify-center w-8 h-8 shrink-0">
                  <motion.div 
                    style={{ 
                      borderColor: ringColor, 
                      backgroundColor: activeBg, 
                      scale
                    }}
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 transition-colors duration-300 shadow-md"
                  >
                    <span className="text-[9px] font-black leading-none text-teal-950">
                      {idx + 1}
                    </span>
                  </motion.div>

                  {/* Tooltip for mobile or non-desktop */}
                  <span className="absolute right-10 whitespace-nowrap bg-teal-950 border border-teal-800 text-[10px] md:text-xs font-black text-amber-400 px-2.5 py-1 rounded-lg opacity-0 pointer-events-none group-hover/bullet:opacity-100 transition-opacity lg:hidden z-30 shadow-lg">
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto w-full px-4 md:px-12 lg:px-24 h-full flex flex-col pt-6 md:pt-10 pb-4">
          <div className="mt-4 md:mt-12 flex-1 flex flex-col items-center justify-center min-h-0">
            <div className="text-[11px] md:text-sm font-bold tracking-widest text-teal-200 uppercase mb-6 md:mb-10 drop-shadow-md text-center shrink-0 mix-blend-plus-lighter">{d.pillsTitle}</div>
            
            <motion.div 
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true, margin: "-100px" }}
              variants={{
                visible: { transition: { staggerChildren: 0.1 } },
                hidden: {}
              }}
              className="flex flex-wrap gap-3 md:gap-4 lg:gap-5 items-center justify-center w-full px-2 max-w-4xl mx-auto overflow-y-auto no-scrollbar pb-10"
            >
              {d.pills.map((pill) => (
                <motion.div
                  key={pill}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                  }}
                  className="flex items-center gap-2 md:gap-3 lg:gap-4 bg-teal-900/40 border border-teal-700/40 text-teal-50 px-5 py-2.5 md:px-6 md:py-3 lg:px-7 lg:py-3.5 rounded-full text-sm md:text-base lg:text-lg backdrop-blur-sm shadow-md font-bold shrink-0"
                >
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)] shrink-0" />
                  <span>{pill}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}

function Courses() {
  const handleScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <section className="py-24 px-6 md:px-12 lg:px-24 bg-teal-950 flex flex-col items-center text-center pb-12" id="courses">
        <div className="max-w-4xl mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.5 }}>
            <span className="text-xs md:text-sm font-semibold uppercase tracking-wider text-amber-400 mb-2 block">Our Courses</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-teal-50 mb-4 tracking-tight drop-shadow-md">AI Website Creation Tracks</h2>
            <p className="text-teal-100 text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed drop-shadow">Master premium layout builders & automated checkouts in just 5 days, from zero to your first host.</p>
            
            <div className="flex flex-wrap gap-3 justify-center mb-10">
              {[
                { id: 'landing-section', label: '🌐 AI Landing Page Creation' },
                { id: 'ecommerce-section', label: '🛍️ AI E-commerce Website Creation' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleScroll(tab.id)}
                  className="px-5 py-2.5 rounded-full text-sm font-bold transition-all border backdrop-blur-md bg-teal-900/60 border-teal-700/50 text-teal-200 hover:text-teal-50 hover:bg-teal-800/80"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <div id="landing-section"><CourseSkillSection skillId="landing" /></div>
      <div id="ecommerce-section"><CourseSkillSection skillId="ecommerce" /></div>
    </>
  );
}

function HowItWorks() {
  const steps = [
    { title: "Pick Your Creator Track", desc: "Choose between AI Landing Pages and AI E-commerce Websites. Start with the free beginner course — no commitment needed." },
    { title: "Join the 5-Day Training", desc: "Attend daily live/recorded sessions with practical exercises. Each day builds on the last — by day 5 you'll have a real website live to show." },
    { title: "Build Real Sites", desc: "Every class ends with a live project you build during training — a landing page or an e-commerce storefront — that you own and can use." },
    { title: "Apply or Advance", desc: "Use the beginner skills to save money or start-up. When ready, upgrade to advanced or masterclass to unlock professional-grade client contract potential." },
  ];

  return (
    <section className="py-24 px-6 md:px-12 lg:px-24 bg-teal-900/20 border-t border-teal-900 relative" id="how">
      <div className="absolute right-0 top-1/4 w-96 h-96 bg-orange-500/5 blur-[120px] -z-10 rounded-full" />
      <div className="max-w-6xl mx-auto relative z-10 w-full">
        <motion.div className="mb-14 text-center md:text-left" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
          <span className="text-sm font-semibold uppercase tracking-wider text-teal-400 mb-4 block">How It Works</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-teal-50 mb-6 tracking-tight">From Zero to Skilled in 5 Days</h2>
          <p className="text-teal-200 text-lg max-w-2xl md:mx-0 mx-auto leading-relaxed">Every CIYA course is structured as an intensive 5-day programme designed to get you skilled, confident, and ready to apply what you've learned immediately.</p>
        </motion.div>
        
        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
        >
          {steps.map((step, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-teal-900/50 border border-teal-800 p-8 rounded-3xl text-center hover:border-teal-700 hover:bg-teal-800/50 transition-all backdrop-blur-sm group">
              <div className="w-14 h-14 mx-auto bg-teal-950 border border-teal-800 rounded-full flex items-center justify-center font-bold text-xl text-amber-400 mb-6 shadow-inner group-hover:scale-110 transition-transform">
                {i + 1}
              </div>
              <h4 className="text-lg font-bold text-teal-50 mb-3">{step.title}</h4>
              <p className="text-sm text-teal-200 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function WhyCiya() {
  const points = [
    { icon: Gift, title: "Free Entry, Zero Barriers", desc: "The beginner course is completely free. You shouldn't have to pay to start learning skills that can change your life." },
    { icon: Bot, title: "AI Makes it Easy", desc: "No need to learn complicated code. AI tools handle the technical complexity so you can focus on creating and delivering results." },
    { icon: Smartphone, title: "No More WhatsApp Hustle", desc: "Move your business beyond your contacts list. A proper website or branded content puts your business in front of the right audience." },
    { icon: Briefcase, title: "Create Your Own Job", desc: "Don't wait for employment. Build a freelance career or business around skills that companies and clients genuinely pay for." },
    { icon: Zap, title: "5 Days. Real Results.", desc: "We don't waste your time. In 5 focused days, you'll complete a real project and have a skill you can use immediately." },
    { icon: TrendingUp, title: "Grow at Your Own Pace", desc: "Start free, advance when you're ready. CIYA grows with you from beginner to professional to masterclass agency-level." },
  ];

  return (
    <section className="py-24 px-6 md:px-12 lg:px-24 bg-teal-950 border-t border-teal-900" id="why">
      <div className="max-w-6xl mx-auto w-full">
        <motion.div className="mb-14" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
          <span className="text-sm font-semibold uppercase tracking-wider text-teal-400 mb-4 block">Why CIYA?</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-teal-50 mb-6 tracking-tight">Made for Nigerians. Built for the Future.</h2>
          <p className="text-teal-200 text-lg max-w-2xl leading-relaxed">CIYA was designed specifically around the challenges and realities facing Nigerian youths today.</p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
        >
          {points.map((pt, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-teal-900/40 border border-teal-800 p-8 rounded-3xl flex flex-col gap-5 items-start hover:border-teal-700 hover:bg-teal-900/80 backdrop-blur-sm transition-all group">
              <div className="flex-shrink-0 bg-teal-950 p-3.5 rounded-2xl border border-teal-800 shadow-inner group-hover:bg-teal-900 transition-colors">
                <pt.icon className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h4 className="text-base font-bold tracking-wider uppercase text-teal-100 mb-3">{pt.title}</h4>
                <p className="text-sm text-teal-300 leading-relaxed">{pt.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CTA() {
  const login = useLogin();
  return (
    <section className="py-32 px-6 bg-teal-900/30 border-t border-teal-900 text-center relative overflow-hidden flex flex-col justify-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div className="max-w-3xl mx-auto relative z-10 w-full" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-900 border border-teal-800 text-xs font-semibold text-orange-400 mb-8 backdrop-blur-sm shadow-sm uppercase tracking-widest">
          Get Started Today
        </span>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-teal-50 mb-8 leading-[1.15] tracking-tight">
          Your Skills.<br className="hidden md:block"/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 block md:inline">Your Future.</span>
        </h2>
        <p className="text-teal-200 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
          Join thousands of Nigerian youths who are choosing to build their future with AI-powered digital skills. Start your free beginner course today — no payment, no excuses.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
          <Link to="/get-started" className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-teal-950 font-bold rounded-full text-base shadow-lg shadow-amber-500/30 transition-all text-center cursor-pointer">
            Start for Free
          </Link>
          <a href="#courses" className="px-8 py-3.5 bg-teal-900 border border-teal-800 hover:bg-teal-800 hover:border-teal-700 text-teal-50 font-bold rounded-full text-base transition-all text-center flex items-center justify-center">
             View All Courses
          </a>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-teal-950 pt-20 pb-8 px-6 md:px-12 lg:px-24 border-t border-teal-900 shrink-0 mt-auto">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-12 mb-16 w-full">
        <div className="md:col-span-5 lg:col-span-4">
          <a href="#" className="flex flex-col gap-1 items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gradient-to-tr from-amber-400 to-orange-500 rounded shadow-lg shadow-orange-500/20 shrink-0"></div>
              <span className="font-bold text-lg tracking-tight uppercase text-teal-50 border-none inline outline-none">CIYA</span>
            </div>
            <span className="text-[10px] font-semibold tracking-[0.2em] text-teal-400/80 uppercase leading-none mt-0.5">
              Create It Yourself Academy
            </span>
          </a>
          <p className="text-sm text-teal-300 leading-relaxed max-w-xs mb-6">
            Create It Yourself Academy — bridging the digital skill gap in Nigeria and Africa, one youth at a time.
          </p>
        </div>
        
        <div className="md:col-span-3 lg:col-span-2">
          <h5 className="font-semibold uppercase tracking-wider text-teal-500 text-xs mb-5">Courses</h5>
          <ul className="space-y-4">
            <li><a href="#landing-section" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">AI Landing Pages</a></li>
            <li><a href="#ecommerce-section" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">AI E-commerce Creator</a></li>
            <li><a href="#courses" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">All Tracks</a></li>
          </ul>
        </div>
        
        <div className="md:col-span-2 lg:col-span-2">
          <h5 className="font-semibold uppercase tracking-wider text-teal-500 text-xs mb-5">Academy</h5>
          <ul className="space-y-4">
            <li><a href="#" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">About CIYA</a></li>
            <li><a href="#mission" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">Our Mission</a></li>
            <li><a href="#" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">Community</a></li>
            <li><a href="#" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">Blog</a></li>
          </ul>
        </div>
        
        <div className="md:col-span-2 lg:col-span-2">
          <h5 className="font-semibold uppercase tracking-wider text-teal-500 text-xs mb-5">Connect</h5>
          <ul className="space-y-4">
            <li><a href="#" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">Instagram</a></li>
            <li><a href="https://chat.whatsapp.com/BzyYP0DyV2TFRqzfrrCXYi?s=cl&p=a&mlu=3" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">WhatsApp</a></li>
            <li><a href="#" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">YouTube</a></li>
            <li><a href="#" className="text-sm text-teal-400 hover:text-teal-200 transition-colors">Contact Us</a></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto border-t border-teal-900 pt-8 flex flex-col sm:flex-row justify-between items-center gap-6 w-full">
        <p className="text-xs text-teal-500 text-center sm:text-left order-2 sm:order-1">
          &copy; 2026 Create It Yourself Academy (CIYA). All rights reserved.
        </p>
        <div className="flex gap-6 text-xs text-teal-500 order-1 sm:order-2">
          <a href="#" className="hover:text-teal-400 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-teal-400 transition-colors">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [showPopupBlocked, setShowPopupBlocked] = useState(false);

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
    <div className="bg-teal-950 font-sans text-teal-50 min-h-screen selection:bg-amber-500/30 selection:text-amber-200 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Mission />
        <Courses />
        <HowItWorks />
        <WhyCiya />
        <CTA />
      </main>
      <Footer />

      {/* POPUP BLOCKED ALERT MODAL */}
      {showPopupBlocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md text-slate-800">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
              <Sparkles className="w-8 h-8 fill-amber-500" />
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
                onClick={() => {
                  setShowPopupBlocked(false);
                }}
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
