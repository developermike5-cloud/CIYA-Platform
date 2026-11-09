import React, { useState } from 'react';
import { naira } from './data';

/** Earnings calculator: two sliders, per month and per year, illustration note only. */
export default function EarningsCalculator() {
  const [jobs, setJobs] = useState(2);
  const [price, setPrice] = useState(60000);
  const monthly = jobs * price;

  return (
    <section id="earn" className="px-6 md:px-12 lg:px-24 py-[clamp(64px,9vw,104px)] scroll-mt-24">
      <div className="max-w-[1152px] mx-auto">
        <span className="block text-[15px] font-bold uppercase tracking-[0.09em] text-amber-400 mb-3.5">Earnings calculator</span>
        <h2 className="text-[clamp(2.4rem,6.4vw,4.4rem)] font-black leading-[1.05] tracking-tight text-teal-50">
          What could client websites pay you?
        </h2>
        <p className="text-teal-200 text-[clamp(1rem,1.7vw,1.15rem)] leading-[1.7] max-w-[62ch] mt-[18px]">
          Move the sliders to match the website jobs you could realistically take on. The numbers update as you go.
        </p>

        <div className="grid md:grid-cols-2 gap-10 mt-11 items-stretch">
          <div className="flex flex-col gap-[30px]">
            <div>
              <label htmlFor="jobs" className="flex justify-between items-baseline gap-3 font-bold mb-3 text-teal-50">
                Websites per month
                <output htmlFor="jobs" className="text-xl font-extrabold text-amber-400 tabular-nums">{jobs}</output>
              </label>
              <input
                id="jobs"
                type="range"
                min={1}
                max={8}
                step={1}
                value={jobs}
                onChange={(e) => setJobs(Number(e.target.value))}
                className="ciya-range"
              />
            </div>
            <div>
              <label htmlFor="price" className="flex justify-between items-baseline gap-3 font-bold mb-3 text-teal-50">
                Price per website
                <output htmlFor="price" className="text-xl font-extrabold text-amber-400 tabular-nums">{naira(price)}</output>
              </label>
              <input
                id="price"
                type="range"
                min={20000}
                max={300000}
                step={5000}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="ciya-range"
              />
            </div>
          </div>

          <div aria-live="polite" className="bg-teal-900/70 border border-teal-700 rounded-[28px] p-[30px] flex flex-col gap-[18px] min-w-0 shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)]">
            <small className="text-xs font-bold uppercase tracking-[0.1em] text-teal-300">Per month</small>
            <div className="text-[clamp(2.3rem,6vw,3.6rem)] leading-none font-extrabold tracking-tight tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
              {naira(monthly)}
            </div>
            <div className="h-2.5 rounded-full bg-teal-800 overflow-hidden" aria-hidden="true">
              <i className="block h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-[width] duration-300" style={{ width: `${Math.min(100, (monthly / 1000000) * 100)}%` }} />
            </div>
            <div>
              <small className="text-xs font-bold uppercase tracking-[0.1em] text-teal-300">Per year</small>
              <b className="block text-2xl md:text-3xl font-extrabold text-teal-50 tabular-nums">{naira(monthly * 12)}</b>
            </div>
            <p className="text-sm text-teal-200 leading-relaxed">
              This is an illustration from your own inputs. It is not a promise of income. Results depend on how many clients you find and what they pay.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
