import React from 'react';
import MediaSlot from './MediaSlot';
import { HOW_STEPS } from './data';

/** How it works: 3 tall image cards with the number, title and text overlaid. */
export default function HowItWorks() {
  return (
    <section id="how" className="relative bg-teal-900/20 border-y border-teal-900 px-6 md:px-12 lg:px-24 py-[clamp(64px,9vw,104px)] scroll-mt-24">
      <div className="absolute right-0 top-1/4 w-[380px] h-[380px] rounded-full bg-orange-500/[0.05] blur-[110px] pointer-events-none" aria-hidden="true" />
      <div className="max-w-[1152px] mx-auto relative z-10 w-full">
        <span className="block text-[15px] font-bold uppercase tracking-[0.09em] text-teal-400 mb-3.5">How It Works</span>
        <h2 className="text-[clamp(2.4rem,6.4vw,4.4rem)] font-black leading-[1.05] tracking-tight text-teal-50">From Zero to Skilled in 5 Days</h2>
        <p className="text-teal-200 text-[clamp(1rem,1.7vw,1.15rem)] leading-[1.7] max-w-[62ch] mt-[18px]">
          Every CIYA course is structured as an intensive 5-day programme designed to get you skilled, confident, and ready to apply what you've learned immediately.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {HOW_STEPS.map((s, i) => (
            <div
              key={s.title}
              className="relative border border-teal-800 rounded-[28px] overflow-hidden min-h-[440px] max-md:min-h-[400px] flex transition-all hover:border-amber-400 hover:-translate-y-1"
            >
              <div className="absolute inset-0">
                <MediaSlot
                  ratio="4/5"
                  label={`How it works image ${i + 1}`}
                  spec={s.mediaSpec}
                  src={s.media}
                  className="absolute inset-0 w-full h-full"
                  noBorder
                />
              </div>
              <div className="relative z-[2] self-end w-full pt-[90px] px-[26px] pb-7 bg-gradient-to-b from-transparent via-teal-950/80 to-teal-950/[.97]">
                <i className="w-[46px] h-[46px] mb-3.5 rounded-full bg-amber-400 grid place-items-center text-lg font-black not-italic text-teal-950">
                  {i + 1}
                </i>
                <h4 className="text-xl font-extrabold mb-2.5 text-teal-50">{s.title}</h4>
                <p className="text-[14.5px] text-teal-100 leading-[1.65]">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
