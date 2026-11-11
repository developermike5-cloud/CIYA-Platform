import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Lightbulb, Globe, Briefcase, Check } from 'lucide-react';
import MediaSlot from './MediaSlot';
import {
  COURSE_BG_SRC,
  COURSE_DEMO_VIDEO,
  TRACK_LABELS,
  TrackId,
} from './data';
import './landing.css';

/** Per-track accent, using only existing brand colours (amber / orange-400 / teal-300). */
const ACCENT: Record<
  TrackId,
  { text: string; bg: string; border: string; borderAccent: string; gradient: string }
> = {
  landing: {
    text: 'text-amber-400',
    bg: 'bg-amber-400',
    border: 'border-amber-400',
    borderAccent: 'border-amber-400/55',
    gradient: 'from-amber-400/30 via-transparent to-transparent',
  },
  ecommerce: {
    text: 'text-orange-400',
    bg: 'bg-orange-400',
    border: 'border-orange-400',
    borderAccent: 'border-orange-400/55',
    gradient: 'from-orange-400/30 via-transparent to-transparent',
  },
  portfolio: {
    text: 'text-teal-300',
    bg: 'bg-teal-300',
    border: 'border-teal-300',
    borderAccent: 'border-teal-300/55',
    gradient: 'from-teal-300/30 via-transparent to-transparent',
  },
};

const TRACK_ICON: Record<TrackId, React.ElementType> = {
  landing: Lightbulb,
  ecommerce: Globe,
  portfolio: Briefcase,
};

interface Tier {
  level: string;
  title: string;
  price: string;
  subPrice?: string;
  featured?: boolean;
  badge?: string;
  desc: string;
  features: string[];
}

/** COURSES_DATA copy, per the brief with the "AI" prefix removed from course names. */
const TRACKS: Record<
  TrackId,
  {
    title: string;
    desc: string;
    sub: string[];
    tiers: Tier[];
    pillsTitle: string;
    pills: string[];
  }
> = {
  landing: {
    title: 'Landing Page Creation',
    desc: 'Building a landing page in 2026 is the easiest it has ever been, thanks to AI. Whether you need a landing page to sell your service, capture emails for your lead magnet, build personal branding, or create an interactive sales funnel, CIYA teaches you exactly how to do it without writing a single line of code.',
    sub: ['Copywriting', 'Structure hero', 'Leads capture', 'Email integrations'],
    tiers: [
      {
        level: 'Beginner',
        title: 'Landing Page Foundations',
        price: '100% Free',
        desc: 'Build your first landing page in 5 days using AI generators. No coding needed. Enough to launch your online presence right away.',
        features: ['Landing page creation', 'AI copywriting assistant', 'Lead capture forms', 'Publish & go live'],
      },
      {
        level: 'Advanced',
        title: 'Professional Conversion Page Builder',
        price: '₦15,000',
        subPrice: '/ 5-day course',
        featured: true,
        badge: 'Most Popular',
        desc: 'Offer professional landing page design services. Learn the full workflow to structure conversion heroes, perform speed audits, and deliver client projects confidently.',
        features: ['Commercial landing pages', 'Speed & responsiveness', 'Analytics setup & tracking', 'Client delivery workflow'],
      },
    ],
    pillsTitle: "Landing Page formats You'll Learn to Build",
    pills: [
      'SaaS Landing Pages (Product walkthroughs)',
      'Local Business Pages (Leads capture)',
      'Course & Webinar Registrations (Funnels)',
      'App Launch Showcase Pages (Waitlist capture)',
      'Personal Branding Pages (Speaker, coach bio)',
      'Event Promotion Landing Pages',
    ],
  },
  ecommerce: {
    title: 'E-commerce Website Creation',
    desc: 'Transform standard catalogs into highly profitable automated web stores. Learn to design high-converting visual stores using interactive AI layouts, build responsive shopping carts, configure inventory sync, and integrate WhatsApp checkout flows that receive and organize orders seamlessly.',
    sub: ['WhatsApp checkouts', 'Digital catalogs', 'Shopping flows', 'Cart management'],
    tiers: [
      {
        level: 'Beginner',
        title: 'E-commerce Essentials',
        price: '100% Free',
        desc: 'Launch your personal online store in 5 days with AI. Hook up a basic catalog, add product cards, set up images, and integrate simple WhatsApp checkouts for instant sales.',
        features: ['Product listing setups', 'Interactive shop catalogs', 'WhatsApp routing checkouts', 'Inventory publishing'],
      },
      {
        level: 'Advanced',
        title: 'Professional Store Builder',
        price: '₦15,000',
        subPrice: '/ 5-day course',
        featured: true,
        badge: 'Most Popular',
        desc: 'Build highly robust commercial stores for retail brands and direct-to-consumer businesses. Include filters, order search, tax setups, and localized delivery configurations.',
        features: ['Advanced shopping carts', 'Promo codes & discounts', 'Product search & indexing', 'Payment gateway plugins'],
      },
    ],
    pillsTitle: "Store Structures You'll Build",
    pills: [
      'WhatsApp Automated Stores (Instant orders)',
      'Digital Product Stores (E-books, downloads)',
      'Fashion & Boutique Showcase Stores (Retail)',
      'Dropshipping Hubs (AI product import)',
      'Subscription & Box Stores (Weekly/Monthly)',
      'Local Grocery & Delivery Catalogs',
    ],
  },
  portfolio: {
    title: 'Portfolio Website Creation',
    desc: 'Build a stunning professional portfolio or service showcase website to present your skills, experience, and past projects beautifully. Learn how to craft responsive case studies, feature dynamic contact forms, embed real work mockups, and build an online CV that commands respect and wins high-ticket clients without needing a coder.',
    sub: ['Case studies', 'Design systems', 'Services setup', 'Inquiry filters'],
    tiers: [
      {
        level: 'Beginner',
        title: 'Portfolio Foundations',
        price: '100% Free',
        desc: 'Design and launch your professional personal portfolio website in 5 days using AI. Show off your biography, skills checklist, career aspirations, and simple contact forms to jumpstart your career.',
        features: ['Personal biography setup', 'Interactive skills checklist', 'Contact form submission', 'Online CV publishing'],
      },
      {
        level: 'Advanced',
        title: 'Professional Agency Showcase',
        price: '₦15,000',
        subPrice: '/ 5-day course',
        featured: true,
        badge: 'Most Popular',
        desc: 'Upgrade your portfolio into a world-class client acquisition machine. Create interactive multi-step case studies, integrate customized inquiry filters, host video testimonials, and link your custom domains.',
        features: ['Rich case study pages', 'Custom domain connections', 'Inquiry filter forms', 'Interactive client reviews'],
      },
    ],
    pillsTitle: "Portfolio Structures You'll Build",
    pills: [
      'Freelance Designer & Developer Portfolios',
      'Consultant & Coach Showcases',
      'Creative Art & Photography Galleries',
      'Agency Capability Statements',
      'Digital Marketer Case Study Centers',
      'Online Resumes & Interactive CVs',
    ],
  },
};

const TRACK_IDS: TrackId[] = ['landing', 'ecommerce', 'portfolio'];

/** Faded website sample behind the section (skeleton until a real screenshot is wired in). */
function CourseBg({ track }: { track: TrackId }) {
  const src = COURSE_BG_SRC[track];
  const tint = ACCENT[track];
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-700 ${tint.gradient}`}
      style={{
        background:
          track === 'landing'
            ? 'radial-gradient(900px 520px at 12% 8%, rgba(251,191,36,.14), transparent 70%)'
            : track === 'ecommerce'
            ? 'radial-gradient(900px 560px at 92% 88%, rgba(251,146,60,.16), transparent 70%)'
            : 'radial-gradient(1000px 600px at 50% 40%, rgba(94,234,212,.12), transparent 70%)',
      }}
      aria-hidden="true"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden opacity-20 scale-[1.04]">
        {src ? (
          <img src={src} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="sk-window" aria-hidden="true">
            <div className="sk-bar" />
            <div className="sk-side" />
            <div className="sk-hero" />
            <div className="sk-row" />
            <div className="sk-row" />
            <div className="sk-row" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function CoursesSection({ reduced }: { reduced: boolean }) {
  const [track, setTrack] = useState<TrackId>('landing');
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const acc = ACCENT[track];
  const d = TRACKS[track];

  // Floating switcher shows only while the Courses section is on screen.
  useEffect(() => {
    const update = () => {
      const r = sectionRef.current?.getBoundingClientRect();
      if (!r) return;
      const vh = window.innerHeight;
      const show = r.top < vh * 0.6 && r.bottom > vh * 0.4;
      setSwitcherVisible(show);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const tgrid = useMemo(
    () => (
      <div className="grid md:grid-cols-[1.2fr_.8fr] gap-6 items-stretch">
        <MediaSlot
          kind="video"
          ratio="16/9"
          label={`Course demo video: ${d.title}`}
          spec="Looping muted MP4 · 16:9 · 15-30s screen recording of the finished site"
          src={COURSE_DEMO_VIDEO[track]}
          className="rounded-3xl border border-teal-800"
        />
        <div className="bg-teal-900/45 border border-teal-800 rounded-3xl p-6 flex flex-col gap-3.5">
          <h4 className={`text-xs font-extrabold uppercase tracking-[0.1em] ${acc.text}`}>What you'll practise</h4>
          <ol className="m-0 p-0 list-none flex flex-col gap-3">
            {d.sub.map((s, i) => (
              <li key={s} className="flex gap-3 items-center font-bold text-teal-50">
                <i className={`shrink-0 w-7 h-7 rounded-full ${acc.bg} text-teal-950 grid place-items-center text-xs font-black not-italic`}>
                  {i + 1}
                </i>
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>
    ),
    [d, acc, track],
  );

  return (
    <>
      <section ref={sectionRef} id="courses" className="relative isolate overflow-x-clip px-6 md:px-12 lg:px-24 py-[clamp(64px,9vw,104px)] scroll-mt-24" data-track={track}>
        {/* faded website sample behind the section, fixed in view while scrolling, crossfading on switch */}
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
          <div className={`absolute inset-0 transition-opacity duration-700 ${track === 'landing' ? 'opacity-100' : 'opacity-0'}`}>
            <CourseBg track="landing" />
          </div>
          <div className={`absolute inset-0 transition-opacity duration-700 ${track === 'ecommerce' ? 'opacity-100' : 'opacity-0'}`}>
            <CourseBg track="ecommerce" />
          </div>
          <div className={`absolute inset-0 transition-opacity duration-700 ${track === 'portfolio' ? 'opacity-100' : 'opacity-0'}`}>
            <CourseBg track="portfolio" />
          </div>
        </div>

        {/* light sweep on switch */}
        <AnimatePresence>
          <motion.div
            key={`sweep-${track}`}
            className={`absolute top-0 bottom-0 left-0 w-[30%] z-0 pointer-events-none bg-gradient-to-r ${acc.gradient}`}
            initial={{ x: '-120%', opacity: reduced ? 0 : 1 }}
            animate={{ x: '420%', opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            aria-hidden="true"
          />
        </AnimatePresence>

        <div className="relative z-10 max-w-[1152px] mx-auto">
          <div className="text-center">
            <h2 className="text-[clamp(2.4rem,6.4vw,4.4rem)] font-black leading-[1.05] tracking-tight text-teal-50">
              Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">Courses</span>
            </h2>
          </div>

          {/* staggered entrance on switch */}
          <motion.div
            key={track}
            className="mt-9 flex flex-col gap-6"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            variants={reduced ? undefined : { visible: {} }}
            transition={{ duration: 0.01 }}
          >
            <motion.div
              className="bg-teal-800/40 border rounded-[28px] p-[clamp(22px,4vw,40px)] flex flex-col md:flex-row gap-7 items-center justify-between shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] border-teal-700/50 border-l-4"
              style={{ borderLeftColor: track === 'landing' ? '#fbbf24' : track === 'ecommerce' ? '#fb923c' : '#5eead4' }}
              initial={reduced ? false : { opacity: 0, y: 22, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div>
                <h3 className="text-[clamp(1.4rem,3vw,1.9rem)] font-extrabold mb-3 text-teal-50">{d.title}</h3>
                <p className="text-teal-100 leading-[1.7]">{d.desc}</p>
              </div>
              <div className={`shrink-0 hidden md:grid w-20 h-20 rounded-full bg-teal-900/60 border place-items-center ${acc.border} ${acc.text}`}>
                {React.createElement(TRACK_ICON[track], { className: 'w-10 h-10' })}
              </div>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 22, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {tgrid}
            </motion.div>

            <div className="grid md:grid-cols-3 gap-5">
              {d.tiers.map((t, i) => (
                <motion.div
                  key={t.level}
                  className={`relative bg-teal-900/60 border rounded-[28px] p-[30px] flex flex-col gap-[18px] shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] ${acc.border} border-x-0 border-b-0 border-t-[3px] ${t.featured ? 'border-2 ' + acc.border : ''}`}
                  initial={reduced ? false : { opacity: 0, y: 22, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.55, delay: 0.16 + i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  {t.featured ? (
                    <span className={`absolute -top-3 left-[30px] ${acc.bg} text-teal-950 text-[11px] font-black uppercase tracking-[0.08em] px-3 py-1.5 rounded-full`}>
                      Most Popular
                    </span>
                  ) : null}
                  <div>
                    <div className={`text-xs font-semibold uppercase tracking-[0.14em] ${acc.text}`}>{t.level}</div>
                    <h4 className="text-xl font-bold mt-1.5 text-teal-50">{t.title}</h4>
                  </div>
                  <span className={`inline-block self-start ${acc.bg} text-teal-950 px-[18px] py-[7px] rounded-full text-[15px] font-black`}>
                    {t.price}
                    {t.subPrice ? <small className="text-xs font-bold ml-1 opacity-80">{t.subPrice}</small> : null}
                  </span>
                  <p className="text-sm text-teal-100 leading-[1.65] flex-1">{t.desc}</p>
                  <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
                    {t.features.map((f) => (
                      <li key={f} className="flex gap-2.5 items-start text-[13.5px] font-medium text-teal-50">
                        <Check className={`w-[18px] h-[18px] shrink-0 ${acc.text}`} aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = t.price.includes('Free') ? '/get-started' : '/paid-enroll';
                    }}
                    className={`w-full text-center rounded-full py-3.5 text-sm font-bold transition-all ${
                      t.price.includes('Free')
                        ? 'bg-teal-50 text-teal-950 hover:bg-amber-400'
                        : 'bg-teal-900 border border-teal-800 text-teal-50 hover:bg-teal-800'
                    }`}
                  >
                    {t.price.includes('Free') ? 'Join Free' : `Choose ${t.level}`}
                  </a>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="flex flex-col gap-4"
              initial={reduced ? false : { opacity: 0, y: 22, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <h4 className={`text-xs font-extrabold uppercase tracking-[0.1em] ${acc.text}`}>{d.pillsTitle}</h4>
              <div className="flex flex-wrap gap-3">
                {d.pills.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-2 bg-teal-900/40 border border-teal-700/40 text-teal-50 px-5 py-2.5 rounded-full text-sm font-bold backdrop-blur-sm"
                  >
                    <span className={`w-2 h-2 rounded-full ${acc.bg}`} aria-hidden="true" />
                    {p}
                  </span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* floating track switcher, fixed to the vertical middle of the right edge, no container */}
      <div
        role="tablist"
        aria-label="Course tracks"
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-end gap-2 transition-opacity duration-300 ${
          switcherVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        {...(!switcherVisible ? { inert: true } : {})}
      >
        {TRACK_IDS.map((t, i) => {
          const active = t === track;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={TRACK_LABELS[t]}
              onClick={() => setTrack(t)}
              className={`flex items-center gap-2 rounded-l-full py-2 pl-3 pr-3 text-sm font-black transition-all duration-300 ${
                active
                  ? `${ACCENT[t].bg} text-teal-950`
                  : 'bg-teal-900/85 text-teal-200 hover:text-teal-50'
              }`}
            >
              <span>{i + 1}</span>
              <span
                className={`overflow-hidden whitespace-nowrap text-left transition-all duration-300 ${
                  active ? 'max-w-[230px] opacity-100' : 'max-w-0 opacity-0'
                }`}
              >
                {TRACK_LABELS[t]}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
