import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import MediaSlot from './MediaSlot';
import { RESULT_FILTERS, STUDENT_WINS, naira, TRACK_SHORT, TrackId } from './data';
import './landing.css';

const BADGE: Record<TrackId, string> = {
  landing: 'bg-amber-400 text-teal-950',
  ecommerce: 'bg-orange-400 text-teal-950',
  portfolio: 'bg-teal-300 text-teal-950',
};

/** Student results: sticky stacked cards that flip in 3D to the story. */
export default function StudentResults({ reduced }: { reduced: boolean }) {
  const [filter] = useState<'all' | TrackId>('all');
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const stackRef = useRef<HTMLDivElement>(null);
  const ticking = useRef(false);

  const wins = STUDENT_WINS.filter((w) => filter === 'all' || w.track === filter);

  // Earlier cards scale down and dim slightly as later cards slide over them.
  useEffect(() => {
    if (reduced) return;
    const update = () => {
      ticking.current = false;
      const cards = Array.from(stackRef.current?.querySelectorAll<HTMLElement>('.stk') ?? []);
      cards.forEach((card, i) => {
        const scaleEl = card.querySelector<HTMLElement>('.scale');
        if (!scaleEl) return;
        let sum = 0;
        for (let j = i + 1; j < cards.length; j++) {
          const later = cards[j];
          const inner = later.firstElementChild as HTMLElement | null;
          const h = inner?.offsetHeight || 480;
          const top = parseFloat(getComputedStyle(later).top) || 0;
          const y = later.getBoundingClientRect().top;
          sum += Math.max(0, Math.min(1, 1 - (y - top) / h));
        }
        scaleEl.style.transform = sum ? `scale(${(1 - 0.035 * sum).toFixed(4)})` : '';
        scaleEl.style.filter = sum ? `brightness(${(1 - 0.07 * sum).toFixed(3)})` : '';
      });
    };
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [reduced, filter, wins.length]);

  const toggleFlip = (i: number) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <section id="results" className="px-6 md:px-12 lg:px-24 py-[clamp(64px,9vw,104px)] scroll-mt-24">
      <div className="max-w-[1152px] mx-auto text-center">
        <span className="block text-[15px] font-bold uppercase tracking-[0.09em] text-amber-400 mb-3.5">Student results</span>
        <h2 className="text-[clamp(2.4rem,6.4vw,4.4rem)] font-black leading-[1.05] tracking-tight text-teal-50">
          Real clients. <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">Real naira.</span>
        </h2>
        <p className="text-teal-200 text-[clamp(1rem,1.7vw,1.15rem)] leading-[1.7] max-w-[62ch] mt-[18px] mx-auto">
          Scroll through four projects students delivered. Tap "Tap for the story" on a card to flip it and see the website and how it was built.
        </p>


        <div className="stack" ref={stackRef}>
          {wins.map((w, i) => {
            const isFlipped = flipped.has(i);
            return (
              <article
                key={`${w.name}-${w.title}`}
                className={`stk ${isFlipped ? 'flipped' : ''}`}
                style={{ ['--i' as string]: i }}
              >
                <div className="scale">
                  <div className="flip">
                    {/* front */}
                    <div
                      className="face front rounded-[28px] border-2 border-teal-700 bg-teal-900 p-3.5 grid md:grid-cols-[1.05fr_.95fr] gap-6 items-stretch shadow-[0_24px_50px_-18px_rgba(0,0,0,.75),0_0_0_1px_rgba(4,47,46,.6)]"
                      inert={isFlipped ? true : undefined}
                      aria-hidden={isFlipped}
                    >
                      <div className="pic min-w-0 flex flex-col gap-2.5">
                        <MediaSlot
                          ratio="4/3"
                          label={`Photo of the project: ${w.title}`}
                          spec="Photo or screenshot of the finished project · about 4:3 · at least 1000×750"
                          src={w.photo}
                          className="rounded-[18px] flex-1 min-h-[250px]"
                        />
                      </div>
                      <div className="info flex flex-col gap-3.5 py-3 pr-2.5 pl-1 min-w-0">
                        <span className={`self-start inline-block px-2 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-[0.06em] ${BADGE[w.track]}`}>
                          {TRACK_SHORT[w.track]}
                        </span>
                        <h3 className="text-[clamp(1.3rem,2.6vw,1.75rem)] font-extrabold leading-[1.15] text-teal-50 text-left">{w.title}</h3>
                        <span className="text-sm text-teal-300 text-left">
                          {w.name} · {w.city}
                        </span>
                        <div className="flex items-baseline justify-between gap-2.5 border-t border-dashed border-teal-700 pt-3.5 mt-auto">
                          <b className="text-[1.8rem] leading-none font-extrabold text-amber-400">{naira(w.amount)}</b>
                          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-teal-300 text-right leading-[1.3]">
                            first client
                            <br />
                            week {w.week}
                          </span>
                        </div>
                        <button
                          type="button"
                          aria-pressed={false}
                          onClick={() => toggleFlip(i)}
                          className="mt-1 self-start inline-flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-400 text-teal-950 px-6 py-3 text-sm font-extrabold shadow-[0_10px_24px_-8px_rgba(245,158,11,.45)] transition-all hover:-translate-y-0.5"
                        >
                          Tap for the story
                          <RefreshCw className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {/* back */}
                    <div
                      className="face back rounded-[28px] border-2 border-amber-500 bg-teal-900 p-3.5 grid md:grid-cols-[1.05fr_.95fr] gap-6 items-stretch shadow-[0_24px_50px_-18px_rgba(0,0,0,.75)]"
                      inert={!isFlipped ? true : undefined}
                      aria-hidden={!isFlipped}
                    >
                      <div className="min-w-0 flex flex-col gap-0">
                        <div className="flex gap-1.5 items-center bg-teal-950 border border-teal-800 rounded-t-xl px-3 py-2 font-mono text-[11px] font-semibold text-teal-300">
                          <i className="w-2 h-2 rounded-full bg-teal-700" />
                          <i className="w-2 h-2 rounded-full bg-teal-700" />
                          <i className="w-2 h-2 rounded-full bg-teal-700" />
                          <span className="ml-2 bg-teal-900 rounded-md px-2.5 py-0.5 flex-1 text-center overflow-hidden text-ellipsis whitespace-nowrap">
                            Live website preview
                          </span>
                        </div>
                        <MediaSlot
                          ratio="16/10"
                          label={`Website preview: ${w.title}`}
                          spec="Screenshot or short scroll recording of the live site · 16:10 · at least 1200×750"
                          src={w.sitePreview}
                          className="rounded-b-[18px] flex-1"
                        />
                      </div>
                      <div className="flex flex-col gap-3.5 py-3 pr-2.5 pl-1 min-w-0">
                        <div className="flex flex-col gap-3.5 text-sm leading-[1.6] text-teal-100 text-left">
                          <span>
                            <strong className="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-amber-400 mb-1.5">The client asked for</strong>
                            {w.ask}
                          </span>
                          <span>
                            <strong className="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-amber-400 mb-1.5">How it was done</strong>
                            {w.how}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          <span className="bg-teal-950 border border-teal-800 rounded-full px-3 py-1.5 text-xs font-extrabold text-amber-300">{naira(w.amount)}</span>
                          <span className="bg-teal-950 border border-teal-800 rounded-full px-3 py-1.5 text-xs font-extrabold text-amber-300">Week {w.week}</span>
                          <span className="bg-teal-950 border border-teal-800 rounded-full px-3 py-1.5 text-xs font-extrabold text-amber-300">{TRACK_SHORT[w.track]}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFlip(i)}
                          className="mt-auto self-start inline-flex items-center rounded-full bg-teal-800 hover:bg-teal-700 text-teal-50 px-6 py-3 text-sm font-extrabold transition-colors"
                        >
                          Flip back
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-[26px] text-[13px] text-teal-300 max-w-[70ch] mx-auto text-center">
          <span className="inline-block font-mono text-[10px] font-extrabold uppercase tracking-[0.1em] bg-amber-500/15 text-amber-300 border border-dashed border-amber-500 px-2 py-[5px] rounded-md mr-1.5">
            Sample
          </span>
          These four projects are placeholders written for this design. Replace them with real students' work, with their permission, before launch.
        </p>
      </div>
    </section>
  );
}
