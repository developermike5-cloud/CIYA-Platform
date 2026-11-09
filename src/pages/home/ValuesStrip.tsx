import React, { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Lightbulb, Gift, Compass, Wallet } from 'lucide-react';
import { VALUES_CARDS } from './data';

const ICONS = { bulb: Lightbulb, gift: Gift, compass: Compass, wallet: Wallet };

/**
 * Values strip: pinned while the 4 mission cards slide left to right on scroll
 * down (right to left on scroll up). Plain edges, amber arrow between cards.
 */
export default function ValuesStrip({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const maxRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      const strip = stripRef.current;
      if (track && strip) {
        maxRef.current = Math.max(track.scrollWidth - strip.clientWidth, 0);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const x = useTransform(scrollYProgress, (v) => -((1 - v) * maxRef.current));

  const cards = VALUES_CARDS.map((m) => {
    const Icon = ICONS[m.icon];
    return (
      <div
        key={m.title}
        className="relative shrink-0 w-[340px] h-[240px] max-md:w-[262px] max-md:h-[226px] rounded-[18px] overflow-hidden bg-teal-950 shadow-[0_20px_40px_-20px_rgba(0,0,0,.7)]"
      >
        <div
          className="absolute inset-[-150%] animate-[spin_3s_linear_infinite]"
          style={{ background: 'conic-gradient(from 0deg, transparent 75%, #fbbf24 100%)' }}
          aria-hidden="true"
        />
        <div className="absolute inset-[2px] rounded-[16px] bg-teal-900/[.96]" aria-hidden="true" />
        <div className="relative z-[2] h-full flex flex-col items-center justify-center gap-2.5 p-[22px] text-center">
          <Icon className="w-[38px] h-[38px] text-amber-400" aria-hidden="true" />
          <h4 className="text-sm font-bold uppercase tracking-[0.09em] text-teal-100">{m.title}</h4>
          <p className="text-[13.5px] leading-[1.5] font-medium text-teal-300 m-0">{m.text}</p>
        </div>
      </div>
    );
  });

  const arrow = (
    <div className="shrink-0 self-center grid place-items-center text-amber-400" aria-hidden="true">
      <svg
        viewBox="0 0 48 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[52px] h-[26px] marrow-nudge motion-safe:animate-[nudge_1.6s_ease-in-out_infinite]"
      >
        <path d="M4 12h38M32 3l10 9-10 9" />
      </svg>
    </div>
  );

  // Interleave cards with the amber arrows (arrow between each pair).
  const interleaved: React.ReactNode[] = [];
  cards.forEach((c, i) => {
    interleaved.push(c);
    if (i < cards.length - 1) interleaved.push(React.cloneElement(arrow as React.ReactElement, { key: `arrow-${i}` }));
  });

  if (reduced) {
    return (
      <section id="values" className="bg-teal-900/30 border-y border-teal-900 py-14 px-6" aria-label="What CIYA stands for">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-5">{cards}</div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="values"
      aria-label="What CIYA stands for"
      className="relative bg-teal-900/30 border-y border-teal-900"
      style={{ height: 'calc(100svh + 130svh)', padding: 0 }}
    >
      <div className="sticky top-0 h-[100svh] flex items-center overflow-hidden">
        <div ref={stripRef} className="overflow-hidden py-2.5 w-full" aria-label="What CIYA stands for. These cards slide as you scroll.">
          <motion.div
            ref={trackRef}
            className="flex items-stretch gap-5 w-max will-change-transform pl-[max(24px,env(safe-area-inset-left,0px))]"
            style={{ x }}
          >
            {interleaved}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
