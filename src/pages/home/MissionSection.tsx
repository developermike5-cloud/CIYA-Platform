import React, { useEffect, useRef, useState } from 'react';

interface Segment {
  text: string;
  kind: 'h2' | 'grad' | 'p';
}

const SEGMENTS: Segment[] = [
  { text: 'Unemployment is a problem. ', kind: 'h2' },
  { text: 'Skills are the solution.', kind: 'grad' },
  {
    text: "In Nigeria and across Africa, millions of talented youths struggle to find employment, not because they lack potential, but because they lack the right digital skills to compete in today's economy.",
    kind: 'p',
  },
  {
    text: 'CIYA was built to change that. We use AI to make world-class digital skills accessible, affordable, and practical. Whether you want to save money by doing things yourself or earn money by offering services, CIYA gives you everything you need.',
    kind: 'p',
  },
];

const CPS = 60; // characters per second, per the brief

/** Mission statement, typed out line by line when the section scrolls into view. */
export default function MissionSection({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(reduced); // reduced motion: everything shown at once
  const [counts, setCounts] = useState<number[]>(() =>
    SEGMENTS.map((s) => (reduced ? s.text.length : 0)),
  );

  useEffect(() => {
    if (reduced || started) return;
    const el = sectionRef.current;
    if (!el || !('IntersectionObserver' in window)) {
      setStarted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, started]);

  useEffect(() => {
    if (!started || reduced) return;
    let frameId = 0;
    const total = SEGMENTS.reduce((a, s) => a + s.text.length, 0);
    const start = performance.now();
    const tick = (now: number) => {
      const typed = Math.min(Math.floor(((now - start) / 1000) * CPS), total);
      let left = typed;
      const next = SEGMENTS.map((s) => {
        const k = Math.max(0, Math.min(left, s.text.length));
        left -= k;
        return k;
      });
      setCounts(next);
      if (typed < total) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [started, reduced]);

  // The segment currently mid-typing gets the amber caret.
  const activeIndex = counts.findIndex((k, i) => k > 0 && k < SEGMENTS[i].text.length);

  return (
    <section
      ref={sectionRef}
      id="mission"
      className="relative bg-teal-900/30 border-y border-teal-900 px-6 md:px-12 lg:px-24 py-[clamp(56px,8vw,88px)] scroll-mt-24"
    >
      <div className="absolute left-0 top-1/2 -mt-[130px] w-[260px] h-[260px] rounded-full bg-amber-500/[0.06] blur-[110px] pointer-events-none" aria-hidden="true" />
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-14 items-end">
        <div>
          <span className="block text-[15px] font-bold uppercase tracking-[0.09em] text-teal-400 mb-3.5">Our Mission</span>
          <h2 className="text-[clamp(2.4rem,6.4vw,4.4rem)] font-black leading-[1.05] tracking-tight text-teal-50">
            <span className="tv">{SEGMENTS[0].text.slice(0, counts[0])}</span>
            <span className="th" aria-hidden="true">{SEGMENTS[0].text.slice(counts[0])}</span>
            <span
              className={`block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 ${activeIndex === 1 ? 'tcur' : ''}`}
            >
              <span className="tv">{SEGMENTS[1].text.slice(0, counts[1])}</span>
              <span className="th" aria-hidden="true">{SEGMENTS[1].text.slice(counts[1])}</span>
            </span>
          </h2>
        </div>
        <div>
          {SEGMENTS.slice(2).map((s, i) => {
            const idx = i + 2;
            return (
              <p key={idx} className={`text-lg leading-[1.7] text-teal-200 ${i > 0 ? 'mt-[18px]' : ''}`}>
                <span className={activeIndex === idx ? 'tcur' : ''}>
                  <span className="tv">{s.text.slice(0, counts[idx])}</span>
                  <span className="th" aria-hidden="true">{s.text.slice(counts[idx])}</span>
                </span>
              </p>
            );
          })}
        </div>
      </div>
    </section>
  );
}
