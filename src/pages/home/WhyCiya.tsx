import React from 'react';
import { Gift, Zap, Briefcase } from 'lucide-react';
import { WHY_CARDS } from './data';

const ICONS = { gift: Gift, zap: Zap, case: Briefcase };

/** Why CIYA: 3 cards. */
export default function WhyCiya() {
  return (
    <section id="why" className="px-6 md:px-12 lg:px-24 py-[clamp(64px,9vw,104px)] scroll-mt-24">
      <div className="max-w-[1152px] mx-auto w-full">
        <span className="block text-[15px] font-bold uppercase tracking-[0.09em] text-teal-400 mb-3.5">Why CIYA?</span>
        <h2 className="text-[clamp(2.4rem,6.4vw,4.4rem)] font-black leading-[1.05] tracking-tight text-teal-50">Made for Nigerians. Built for the Future.</h2>
        <p className="text-teal-200 text-[clamp(1rem,1.7vw,1.15rem)] leading-[1.7] max-w-[62ch] mt-[18px]">
          CIYA was designed specifically around the challenges and realities facing Nigerian youths today.
        </p>

        <div className="grid md:grid-cols-3 gap-[22px] mt-12">
          {WHY_CARDS.map((p) => {
            const Icon = ICONS[p.icon];
            return (
              <div
                key={p.title}
                className="bg-teal-900/40 border border-teal-800 rounded-[28px] p-[30px] flex flex-col gap-[18px] items-start transition-colors hover:border-teal-700 hover:bg-teal-900/80"
              >
                <span className="bg-teal-950 p-3.5 rounded-[18px] border border-teal-800 inline-flex">
                  <Icon className="w-7 h-7 text-amber-400" aria-hidden="true" />
                </span>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-[0.08em] text-teal-100 mb-2.5">{p.title}</h4>
                  <p className="text-sm text-teal-300 leading-[1.65]">{p.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
