import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Compass, Play, CheckCircle2, ChevronRight, Sparkles, BookOpen, Layers, ExternalLink } from 'lucide-react';
import { Course, UserProfile } from '../types';

interface ExploreSplashModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  userProfile: UserProfile | null;
  onSelectCourse: (courseId: string) => void;
  onBrowseCatalogGrid: () => void;
}

export default function ExploreSplashModal({
  isOpen,
  onClose,
  courses,
  userProfile,
  onSelectCourse,
  onBrowseCatalogGrid,
}: ExploreSplashModalProps) {
  const [filter, setFilter] = useState<'all' | 'free' | 'advanced'>('all');

  if (!isOpen) return null;

  const filteredCourses = courses.filter(c => {
    if (filter === 'all') return true;
    const isAdv = c.tier === 'advanced' || c.tier === 'masterclass' || c.level === 'Advanced' || c.level === 'Masterclass';
    if (filter === 'advanced') return isAdv;
    if (filter === 'free') return !isAdv;
    return true;
  });

  return (
    <AnimatePresence>
      {/* Backdrop below bottom nav */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Slide-Up Bottom Splash Sheet (Sits strictly ABOVE bottom navigation bar) */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed inset-x-0 bottom-[62px] sm:bottom-[68px] z-40 max-w-2xl mx-auto bg-white rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.25)] border-t border-slate-200/90 flex flex-col max-h-[calc(85dvh-64px)] overflow-hidden font-sans select-none"
      >
        {/* Pull Handle & Header */}
        <div className="p-4 pb-3 border-b border-slate-100 shrink-0 bg-white">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3" />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-black">
                <Compass className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                  Explore CIYA Academy Courses
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold">
                  Practical step-by-step masterclasses & AI tracks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBrowseCatalogGrid();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[11px] border-0 cursor-pointer transition-colors flex items-center gap-1"
                title="Browse full grid catalog"
              >
                <span>Grid View</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center border-0 cursor-pointer transition-colors"
                aria-label="Close sheet"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-black transition-colors border-0 cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Tracks ({courses.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('free')}
              className={`px-3 py-1 rounded-full text-xs font-black transition-colors border-0 cursor-pointer ${
                filter === 'free'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Standard Free
            </button>
            <button
              type="button"
              onClick={() => setFilter('advanced')}
              className={`px-3 py-1 rounded-full text-xs font-black transition-colors border-0 cursor-pointer ${
                filter === 'advanced'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Advanced Masterclass
            </button>
          </div>
        </div>

        {/* Full-Form Course Cards List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {filteredCourses.map((course) => {
            const courseId = course.id || '';
            const isEnrolled = !!(
              userProfile?.registeredCourses?.includes(courseId) ||
              userProfile?.enrolledCourses?.includes(courseId) ||
              (userProfile?.progress && userProfile.progress[courseId])
            );

            const progressObj = userProfile?.progress?.[courseId] || {};
            const completedCount = progressObj?.completedVideos ? Object.keys(progressObj.completedVideos).length : 0;
            const totalVideos = (course.days || []).reduce((acc, d) => acc + (d.videos?.length || 0), 0) || 1;
            const pct = Math.min(100, Math.round((completedCount / totalVideos) * 100));

            const isAdv = course.tier === 'advanced' || course.tier === 'masterclass' || course.level === 'Advanced' || course.level === 'Masterclass';

            return (
              <div
                key={courseId}
                className="bg-white border-2 border-slate-200/90 hover:border-emerald-500 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col text-left group"
              >
                {/* Full Card Banner Header */}
                <div className="relative w-full aspect-[21/9] sm:aspect-[24/9] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden flex items-center justify-center">
                  {(course.thumbnail || (course as any).thumbnailUrl) ? (
                    <img
                      src={course.thumbnail || (course as any).thumbnailUrl}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-slate-800 to-indigo-900">
                      <span className="text-3xl mb-1">
                        {(course as any).icon || '🎓'}
                      </span>
                      <span className="text-[10px] font-black text-indigo-200 uppercase tracking-wider">
                        {course.category || 'AI Training Track'}
                      </span>
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent pointer-events-none" />

                  {/* Badges on Banner */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                    <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs ${
                      isAdv
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-500 text-slate-950'
                    }`}>
                      {isAdv ? 'Advanced Masterclass' : 'Free Academy Track'}
                    </span>

                    {isEnrolled && (
                      <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-600 text-white flex items-center gap-1 shadow-xs">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Enrolled
                      </span>
                    )}
                  </div>

                  {/* Floating Meta on Banner Bottom */}
                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] font-bold text-white/90">
                    <span>{course.days?.length || 5} Days Track</span>
                    <span>{totalVideos} Step-by-Step Lessons</span>
                  </div>
                </div>

                {/* Card Details Body */}
                <div className="p-4 sm:p-5 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                      {course.title}
                    </h4>

                    {(course.tagline || course.subtitle || course.description) && (
                      <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">
                        {course.tagline || course.subtitle || course.description}
                      </p>
                    )}
                  </div>

                  {/* Outcomes Preview */}
                  {course.outcomes && course.outcomes.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                        What you'll master:
                      </span>
                      <p className="text-xs text-slate-700 font-semibold line-clamp-1">
                        ✦ {Array.isArray(course.outcomes) ? course.outcomes.join(' · ') : course.outcomes}
                      </p>
                    </div>
                  )}

                  {/* Progress Indicator if Enrolled */}
                  {isEnrolled && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-extrabold">
                        <span className="text-slate-500">Your Progress</span>
                        <span className={pct === 100 ? 'text-emerald-600' : 'text-indigo-600'}>
                          {pct}% Complete ({completedCount}/{totalVideos} lessons)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action CTA Button */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="text-xs font-bold text-slate-500">
                      Instructor: <span className="font-extrabold text-slate-800">{course.instructor || 'CIYA Coach'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectCourse(courseId);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-0 shadow-xs flex items-center gap-1.5 ${
                        isEnrolled
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isEnrolled ? (pct > 0 ? 'Continue Lesson' : 'Start Course') : 'Explore Course Track'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
