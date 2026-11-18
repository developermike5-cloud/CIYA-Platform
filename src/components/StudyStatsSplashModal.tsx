import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface StudyStatsSplashModalProps {
  isOpen: boolean;
  onClose: () => void;
  studyTime?: Record<string, number>; // local date key (YYYY-MM-DD) -> seconds studied that day
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLICE_COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#10b981', '#0ea5e9', '#f43f5e', '#8b5cf6'];

const localDateKey = (d: Date) => {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const fmtMinutes = (mins: number) => {
  if (mins <= 0) return '0m';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

const arcPath = (cx: number, cy: number, r: number, start: number, end: number) => {
  const [sx, sy] = polar(cx, cy, r, start);
  const [ex, ey] = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
};

export const StudyStatsSplashModal: React.FC<StudyStatsSplashModalProps> = ({ isOpen, onClose, studyTime = {} }) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  if (!isOpen) return null;

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = localDateKey(d);
    return { key, date: d, minutes: Math.round((studyTime[key] || 0) / 60), label: DAY_LABELS[d.getDay()], dayNum: d.getDate() };
  });
  const last7 = days.slice(7);

  const totalMinutes = days.reduce((s, d) => s + d.minutes, 0);
  const weekMinutes = last7.reduce((s, d) => s + d.minutes, 0);
  const activeDays = days.filter((d) => d.minutes > 0).length;
  const bestDay = days.reduce((b, d) => (d.minutes > b.minutes ? d : b), days[0]);
  const todayMinutes = days[13].minutes;

  let streak = 0;
  for (let i = 13; i >= 0; i--) {
    if (days[i].minutes > 0) streak++;
    else if (i === 13) continue; // today still open: don't break the streak yet
    else break;
  }

  const STEP = 24;
  const BAR_W = 14;
  const BASE = 128;
  const CHART_TOP = 20;
  const maxMinutes = Math.max(30, ...days.map((d) => d.minutes));
  const barH = (mins: number) => (mins / maxMinutes) * (BASE - CHART_TOP);
  const px = (i: number) => i * STEP + (STEP - BAR_W) / 2;

  // Pie geometry (last 7 days with time)
  const pieDays = last7.filter((d) => d.minutes > 0);
  const pieTotal = pieDays.reduce((s, d) => s + d.minutes, 0) || 1;
  let angle = 0;
  const slices = pieDays.map((d, i) => {
    const sweep = (d.minutes / pieTotal) * 360;
    const seg = { d, start: angle, end: angle + sweep, color: SLICE_COLORS[i % SLICE_COLORS.length] };
    angle += sweep;
    return seg;
  });

  const statTiles = [
    { label: 'Today', value: fmtMinutes(todayMinutes) },
    { label: 'This week', value: fmtMinutes(weekMinutes) },
    { label: 'Active days', value: `${activeDays}/14` },
    { label: 'Streak', value: `${streak}d` },
  ];

  return (
    <AnimatePresence>
      {/* Backdrop below bottom nav */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.15 } }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        className="fixed inset-0 z-40 bg-slate-950/70"
        onClick={onClose}
      />

      {/* Slide-Up Bottom Splash Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0, transition: { type: 'spring', damping: 30, stiffness: 640, mass: 0.9 } }}
        exit={{ y: '100%', transition: { duration: 0.18, ease: 'easeIn' } }}
        className="fixed inset-x-0 bottom-[62px] sm:bottom-[68px] z-40 max-w-2xl mx-auto bg-white rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.25)] border-t border-slate-200/90 flex flex-col max-h-[calc(85dvh-64px)] overflow-hidden font-sans select-none"
      >
        {/* Pull Handle & Header */}
        <div className="p-4 pb-3 border-b border-slate-100 shrink-0 bg-white">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-600 flex items-center justify-center font-black">
                <span className="text-lg">📊</span>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 leading-tight">Study Performance</h3>
                <p className="text-[10px] text-slate-500 font-bold">Daily time spent learning · last 14 days</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center border-0 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 text-left">
          {totalMinutes === 0 ? (
            <div className="py-10 text-center">
              <span className="text-3xl block mb-2 select-none">⏱️</span>
              <h4 className="text-sm font-black text-slate-900">No study time recorded yet</h4>
              <p className="text-[11px] text-slate-500 font-semibold mt-1 max-w-xs mx-auto leading-relaxed">
                Your daily minutes start counting the moment you spend time in the classroom. Open a course and start learning!
              </p>
            </div>
          ) : (
            <>
              {/* Stat tiles */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {statTiles.map((t) => (
                  <div key={t.label} className="bg-slate-50 border border-slate-200/70 rounded-2xl p-2.5 text-center">
                    <div className="text-xs font-black text-slate-900 truncate">{t.value}</div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-0.5">{t.label}</div>
                  </div>
                ))}
              </div>

              {/* Chart switcher */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                  {(['bar', 'line', 'pie'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setChartType(t)}
                      className={`px-3 py-1 rounded-full text-xs font-black transition-colors border-0 cursor-pointer capitalize ${
                        chartType === t
                          ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {t === 'bar' ? '📊 Bar' : t === 'line' ? '📈 Line' : '🥧 Pie'}
                    </button>
                  ))}
                </div>
                {bestDay.minutes > 0 && (
                  <span className="text-[10px] font-black text-slate-500">
                    Best: <span className="text-teal-600">{fmtMinutes(bestDay.minutes)}</span> {bestDay.label}
                  </span>
                )}
              </div>

              {/* Chart area */}
              <div className="bg-slate-50/70 border border-slate-200/70 rounded-3xl p-3">
                {chartType === 'bar' && (
                  <svg viewBox="0 0 336 152" className="w-full h-auto" role="img" aria-label="Daily study time bar chart">
                    <defs>
                      <linearGradient id="studyBarGrad" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#14b8a6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    {days.map((d, i) => {
                      const h = barH(d.minutes);
                      const x = px(i);
                      if (d.minutes > 0) {
                        return (
                          <g key={d.key}>
                            <rect x={x} y={BASE - h} width={BAR_W} height={h} rx={5} fill="url(#studyBarGrad)" />
                            <text x={x + BAR_W / 2} y={BASE - h - 4} textAnchor="middle" fontSize={8.5} fontWeight={900} fill="#0f172a">
                              {d.minutes}m
                            </text>
                          </g>
                        );
                      }
                      return (
                        <g key={d.key}>
                          <rect x={x} y={BASE - 4} width={BAR_W} height={4} rx={2} fill="#e2e8f0" />
                          <circle cx={x + BAR_W / 2} cy={BASE - 10} r={1.6} fill="#cbd5e1" />
                        </g>
                      );
                    })}
                    <line x1={0} y1={BASE} x2={336} y2={BASE} stroke="#e2e8f0" strokeWidth={1} />
                    {days.map((d, i) => (
                      <text key={d.key} x={i * STEP + STEP / 2} y={144} textAnchor="middle" fontSize={9} fontWeight={800} fill={i === 13 ? '#0f766e' : '#94a3b8'}>
                        {d.label[0]}
                      </text>
                    ))}
                  </svg>
                )}

                {chartType === 'line' && (
                  <svg viewBox="0 0 336 152" className="w-full h-auto" role="img" aria-label="Daily study time line chart">
                    {(() => {
                      const pts = days.map((d, i) => [i * STEP + STEP / 2, BASE - barH(d.minutes)] as const);
                      const path = pts.map((p) => p.join(',')).join(' ');
                      return (
                        <>
                          <polyline points={path} fill="none" stroke="#14b8a6" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                          {pts.map((p, i) => (
                            <circle key={days[i].key} cx={p[0]} cy={p[1]} r={3} fill={days[i].minutes > 0 ? '#14b8a6' : '#ffffff'} stroke={days[i].minutes > 0 ? '#0f766e' : '#cbd5e1'} strokeWidth={1.5} />
                          ))}
                          <line x1={0} y1={BASE} x2={336} y2={BASE} stroke="#e2e8f0" strokeWidth={1} />
                          {days.map((d, i) => (
                            <text key={d.key} x={i * STEP + STEP / 2} y={144} textAnchor="middle" fontSize={9} fontWeight={800} fill={i === 13 ? '#0f766e' : '#94a3b8'}>
                              {d.label[0]}
                            </text>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                )}

                {chartType === 'pie' && (
                  <div className="flex items-center gap-4">
                    <svg viewBox="0 0 168 168" className="w-32 h-32 shrink-0" role="img" aria-label="Study time share by day">
                      <circle cx={84} cy={84} r={60} fill="none" stroke="#e2e8f0" strokeWidth={26} />
                      {slices.map((s) => (
                        <path key={s.d.key} d={arcPath(84, 84, 60, s.start, Math.max(s.end, s.start + 0.6))} fill="none" stroke={s.color} strokeWidth={26} strokeLinecap="butt" />
                      ))}
                      <text x={84} y={82} textAnchor="middle" fontSize={15} fontWeight={900} fill="#0f172a">{fmtMinutes(pieTotal)}</text>
                      <text x={84} y={98} textAnchor="middle" fontSize={8} fontWeight={800} fill="#94a3b8">THIS WEEK</text>
                    </svg>
                    <div className="flex-1 space-y-1 min-w-0">
                      {last7.map((d, i) => (
                        <div key={d.key} className="flex items-center justify-between gap-2 text-[11px] font-bold">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.minutes > 0 ? SLICE_COLORS[i % SLICE_COLORS.length] : '#e2e8f0' }} />
                            <span className="text-slate-700 truncate">{d.label} {d.dayNum}</span>
                          </span>
                          <span className={d.minutes > 0 ? 'text-slate-900 font-black shrink-0' : 'text-slate-400 shrink-0'}>
                            {d.minutes > 0 ? fmtMinutes(d.minutes) : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p className="mt-3 text-[10px] text-slate-400 font-bold text-center leading-relaxed">
                Time is tracked automatically while you're in the classroom. Days with no bar are days you didn't study.
              </p>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StudyStatsSplashModal;
