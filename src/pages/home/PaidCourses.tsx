import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import MediaSlot from './MediaSlot';
import { coursesStore } from '../../utils/coursesStore';
import { Course } from '../../types';
import { naira } from './data';

const TRACK_NAME: Record<string, string> = {
  landing: 'Landing Page Creation',
  ecommerce: 'E-commerce Website Creation',
  portfolio: 'Portfolio Website Creation',
  web: 'Landing Page Creation',
};

const LEVEL_TAG: Record<string, string> = {
  Advanced: 'bg-teal-900/80 border border-teal-700 text-teal-200',
  Masterclass: 'bg-amber-500 border border-amber-400 text-teal-950',
};

/** Newest published Advanced / Masterclass courses, straight from the admin dashboard. */
export default function PaidCourses() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    try {
      const all = coursesStore.getCourses();
      const paid = all
        .filter((c) => {
          const level = (c.level || (c as any).tier || '').toString();
          const paidLevel = /advanced|masterclass/i.test(level);
          const published = c.publish_status ? c.publish_status === 'Published' : (c as any).status !== 'draft';
          const hasPrice = Number(c.price) > 0;
          return paidLevel && published && hasPrice;
        })
        .sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
          return tb - ta;
        })
        .slice(0, 6);
      setCourses(paid);
    } catch (e) {
      console.warn('Paid courses load failed gracefully:', e);
      setCourses([]);
    }
  }, []);

  if (courses.length === 0) return null; // hide the section when nothing is published

  const isNew = (c: Course) => {
    if (!c.createdAt) return false;
    const t = new Date(c.createdAt as any).getTime();
    if (Number.isNaN(t)) return false;
    return Date.now() - t < 30 * 24 * 60 * 60 * 1000;
  };

  const lessons = (c: Course) => (c.days || []).reduce((sum, d) => sum + (d.videos?.length || 0), 0);
  const duration = (c: Course) => `${(c.days || []).length || 5} days`;

  return (
    <section id="paid" className="px-6 md:px-12 lg:px-24 py-[clamp(56px,8vw,96px)] scroll-mt-24">
      <div className="max-w-[1152px] mx-auto">
        <span className="block text-[15px] font-bold uppercase tracking-[0.09em] text-amber-400 mb-3.5">Advanced &amp; Masterclass</span>
        <h2 className="text-[clamp(2.4rem,6.4vw,4.4rem)] font-black leading-[1.05] tracking-tight text-teal-50">
          Fresh from the <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">CIYA studio.</span>
        </h2>
        <p className="text-teal-200 text-[clamp(1rem,1.7vw,1.15rem)] leading-[1.7] max-w-[62ch] mt-[18px]">
          The newest paid courses, published straight from the CIYA admin dashboard. Go deeper than the free beginner course and start charging clients with confidence.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {courses.map((c) => (
            <article
              key={c.id || c.title}
              className="bg-teal-900/45 border border-teal-800 rounded-[28px] overflow-hidden flex flex-col transition-all hover:-translate-y-1 hover:border-amber-400"
            >
              <div className="border-b border-teal-800">
                <MediaSlot
                  ratio="16/9"
                  label={`Course cover: ${c.title}`}
                  spec="Course thumbnail from admin dashboard · 16:9 · at least 1200x675"
                  src={c.thumbnail}
                  className="w-full h-auto"
                  noBorder
                />
              </div>
              <div className="p-[22px] flex flex-col gap-3 flex-1">
                <div className="flex flex-wrap gap-2">
                  {isNew(c) ? (
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] px-2.5 py-1.5 rounded-full bg-amber-500 border border-amber-400 text-teal-950">New</span>
                  ) : null}
                  <span className={`text-[10px] font-extrabold uppercase tracking-[0.1em] px-2.5 py-1.5 rounded-full ${LEVEL_TAG[(c.level || '').toString()] || 'bg-teal-900/80 border border-teal-700 text-teal-200'}`}>
                    {c.level || 'Advanced'}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold leading-[1.25] text-teal-50">{c.title}</h3>
                <p className="text-sm text-teal-200 leading-[1.6] flex-1">{c.description || c.overview || c.subtitle || ''}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-semibold text-teal-300">
                  <span>{TRACK_NAME[c.skillPath || ''] || c.category || 'CIYA Course'}</span>
                  <span>{duration(c)}</span>
                  <span>{lessons(c)} lessons</span>
                </div>
                <div className="flex items-center justify-between gap-3 mt-1.5">
                  <span className="text-2xl font-black text-amber-400">{naira(Number(c.price))}</span>
                  <Link
                    to={`/paid-enroll?course=${encodeURIComponent(c.title)}`}
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-teal-950 text-xs font-extrabold shadow-[0_10px_24px_-8px_rgba(245,158,11,.45)] transition-all"
                  >
                    Enrol now
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-7 text-sm text-teal-300 text-center">
          New courses appear here automatically the moment they are published. Beginner courses stay free in the section above.
        </p>
      </div>
    </section>
  );
}
