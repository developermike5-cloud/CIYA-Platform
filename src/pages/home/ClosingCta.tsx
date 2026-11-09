import React from 'react';
import { Link } from 'react-router';
import { WHATSAPP_URL } from './data';

/** Closing CTA with the WhatsApp community block. */
export default function ClosingCta() {
  return (
    <section id="join" className="bg-teal-900/30 border-t border-teal-900 text-center overflow-hidden px-6 md:px-12 lg:px-24 py-[clamp(72px,10vw,128px)] relative">
      <div className="absolute top-1/2 left-1/2 -ml-[400px] -mt-[400px] w-[800px] h-[800px] rounded-full bg-amber-500/[0.05] blur-[110px] pointer-events-none" aria-hidden="true" />
      <div className="relative z-[1] max-w-3xl mx-auto">
        <span className="inline-flex px-3.5 py-1.5 rounded-full bg-teal-900 border border-teal-800 text-xs font-semibold uppercase tracking-[0.14em] text-orange-400">
          Get Started Today
        </span>
        <h2 className="text-[clamp(2.4rem,6.5vw,4rem)] font-black leading-[1.12] tracking-tight text-teal-50 mt-[30px]">
          Your Skills.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">Your Future.</span>
        </h2>
        <p className="text-teal-200 text-xl leading-relaxed max-w-2xl mx-auto mt-6">
          Join thousands of Nigerian youths who are choosing to build their future with AI-powered digital skills. Start your free beginner course today, no payment, no excuses.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mt-10">
          <Link
            to="/get-started"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-teal-950 text-base font-bold shadow-[0_10px_24px_-8px_rgba(245,158,11,.45)] transition-all hover:-translate-y-0.5"
          >
            Start for Free
          </Link>
          <a
            href="#courses"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-teal-900 border border-teal-800 hover:bg-teal-800 hover:border-teal-700 text-teal-50 text-base font-bold transition-all hover:-translate-y-0.5"
          >
            View All Courses
          </a>
        </div>

        <div className="bg-gradient-to-br from-teal-900 to-[#1e1b4b] border border-teal-800 rounded-[28px] p-[clamp(28px,5vw,52px)] mt-14 mx-auto max-w-[760px] shadow-[0_20px_50px_-20px_rgba(0,0,0,.6)]">
          <h3 className="text-[clamp(1.5rem,3vw,2rem)] font-extrabold text-teal-50">Ready to Save Money or Earn Income? 🚀</h3>
          <p className="text-teal-200 leading-relaxed my-4 mb-7 max-w-[34rem] mx-auto">
            Join thousands of other passionate students in our official community. Get starter checklists, direct help and updates when cohorts are released.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-[17px] px-8 py-4 shadow-[0_10px_26px_-8px_rgba(37,211,102,.4)] transition-all hover:-translate-y-0.5"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white shrink-0" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.347-.347.52-.52.174-.174.232-.298.347-.497.116-.198.058-.371-.058-.52-.116-.148-.7-1.682-.958-2.27-.24-.577-.487-.5-.67-.51-.172-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Join Our WhatsApp Community
          </a>
        </div>
      </div>
    </section>
  );
}
