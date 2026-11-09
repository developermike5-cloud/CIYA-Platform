import React, { useState } from 'react';
import { FAQS } from './data';

/** FAQ: one answer open at a time, first open by default. */
export default function FaqSection() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="bg-teal-900/30 border-y border-teal-900 px-6 md:px-12 lg:px-24 py-[clamp(64px,9vw,104px)] scroll-mt-24">
      <div className="max-w-[1152px] mx-auto text-center">
        <span className="block text-[15px] font-bold uppercase tracking-[0.09em] text-amber-400 mb-3.5">Questions</span>
        <h2 className="text-[clamp(2.4rem,6.4vw,4.4rem)] font-black leading-[1.05] tracking-tight text-teal-50">Before you join</h2>
        <div className="mt-10 flex flex-col gap-3 max-w-[820px] mx-auto text-left">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={f.q}
                className={`border rounded-[20px] bg-teal-900/40 transition-colors ${isOpen ? 'border-amber-500 bg-teal-900/70' : 'border-teal-800'}`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full cursor-pointer list-none px-6 py-5 text-left flex justify-between gap-4 items-center font-bold text-[1.05rem] leading-[1.35] text-teal-50 hover:text-amber-300 transition-colors"
                >
                  {f.q}
                  <span
                    aria-hidden="true"
                    className={`shrink-0 font-mono text-[26px] leading-none text-amber-400 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}
                  >
                    +
                  </span>
                </button>
                {isOpen ? (
                  <p id={`faq-a-${i}`} className="faq-in px-6 pb-[22px] text-teal-200 max-w-[62ch] leading-[1.7]">
                    {f.a}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
