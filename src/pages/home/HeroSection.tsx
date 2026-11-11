import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import MediaSlot from './MediaSlot';

const HERO_TYPE_TEXTS = ['Create It Yourself', 'Elevate your skills', 'Build Your Freedom'];

function Typewriter({ reduced }: { reduced: boolean }) {
  const [text, setText] = useState(HERO_TYPE_TEXTS[0]);
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (reduced) return; // reduced motion: static headline, no typing
    let timer: ReturnType<typeof setTimeout>;
    const currentFullText = HERO_TYPE_TEXTS[textIndex];
    if (!isDeleting && text === currentFullText) {
      timer = setTimeout(() => setIsDeleting(true), 2400);
    } else if (isDeleting && text === '') {
      setIsDeleting(false);
      setTextIndex((prev) => (prev + 1) % HERO_TYPE_TEXTS.length);
    } else {
      const nextText = isDeleting
        ? currentFullText.substring(0, text.length - 1)
        : currentFullText.substring(0, text.length + 1);
      timer = setTimeout(() => setText(nextText), isDeleting ? 40 : 100);
    }
    return () => clearTimeout(timer);
  }, [text, isDeleting, textIndex, reduced]);

  return (
    <span>
      <span className="tv">{text || ' '}</span>
      <span className="tcur align-baseline" aria-hidden="true" />
    </span>
  );
}

/** Hero stat: counts up from 0 over 6 seconds on load. Final numbers on first paint. */
function StatCounter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [value, setValue] = useState(to); // first paint shows the final number
  const reducedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mq.matches;
    if (mq.matches) return; // reduced motion: static final numbers
    let frameId = 0;
    const start = performance.now();
    const DURATION = 6000;
    const update = (now: number) => {
      const p = Math.min((now - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - p, 2);
      setValue(Math.round(to * eased));
      if (p < 1) frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [to]);

  return <>{value.toLocaleString('en-US')}{suffix}</>;
}

export default function HeroSection({ reduced }: { reduced: boolean }) {
  return (
    <section
      id="home"
      className="relative pt-[clamp(132px,16vw,170px)] pb-16 px-6 md:px-12 lg:px-24 text-center overflow-hidden"
    >
      <div className="absolute top-[18%] left-1/2 -ml-[280px] w-[560px] h-[560px] rounded-full bg-teal-500/10 blur-[110px] pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-[10%] left-[18%] w-[300px] h-[300px] rounded-full bg-amber-500/[0.07] blur-[110px] pointer-events-none" aria-hidden="true" />

      <div className="relative z-[1] max-w-6xl mx-auto flex flex-col items-center">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-900/80 border border-teal-800 text-xs font-semibold text-amber-400">
          <span className="relative inline-flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          Bridging Nigeria's Skill Gap
        </span>

        <h1 className="mt-7 text-[clamp(2.9rem,8.4vw,4.6rem)] font-extrabold leading-[1.08] max-w-[15ch] text-teal-50">
          Build Skills.
          <span className="block mt-2 min-h-[1.2em] text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
            <Typewriter reduced={reduced} />
          </span>
        </h1>

        <p className="text-teal-200 text-[clamp(1.05rem,2vw,1.25rem)] max-w-3xl mt-6 leading-relaxed">
          Create It Yourself Academy (CIYA) empowers Nigerian youths with powerful AI-driven website
          creation skills, from high-impact landing pages to fully functional e-commerce websites.
          Free to start. Real results. No excuses.
        </p>

        <div className="flex flex-wrap gap-4 justify-center mt-9">
          <Link
            to="/get-started"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-teal-950 text-sm font-bold shadow-[0_10px_24px_-8px_rgba(245,158,11,.45)] transition-all hover:-translate-y-0.5"
          >
            Start for Free
          </Link>
          <a
            href="#courses"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-teal-900 border border-teal-800 hover:bg-teal-800 hover:border-teal-700 text-teal-50 text-sm font-bold transition-all hover:-translate-y-0.5"
          >
            Explore Courses
          </a>
        </div>

        <div className="flex flex-wrap justify-center gap-y-7 gap-x-[clamp(32px,7vw,72px)] mt-14">
          {[
            { to: 10000, suffix: '+', label: 'Youths to Empower' },
            { to: 12, suffix: '', label: 'In-Demand Skills' },
            { to: 5, suffix: ' Days', label: 'Per Course Package' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2">
              <b className="text-[clamp(1.8rem,3.4vw,2.35rem)] leading-none font-extrabold tracking-tight text-teal-50 tabular-nums">
                <StatCounter to={s.to} suffix={s.suffix} />
              </b>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-teal-400 leading-tight">
                {s.label}
              </span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-2">
            <b className="text-[clamp(1.8rem,3.4vw,2.35rem)] leading-none font-extrabold tracking-tight text-teal-50">FREE</b>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-teal-400 leading-tight">Beginner Entry</span>
          </div>
        </div>

        <div className="w-full max-w-[880px] mt-16 rounded-3xl p-2.5 bg-teal-900/45 border border-teal-800 shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]">
          <MediaSlot
            kind="video"
            ratio="16/9"
            label="Hero video"
            spec="Video · 16:9 · 60-90s intro to CIYA (muted loop or click to play)"
            className="rounded-2xl"
          />
        </div>
      </div>
    </section>
  );
}
