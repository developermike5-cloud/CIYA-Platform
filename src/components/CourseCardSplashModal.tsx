import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, BookOpen, Play, CheckCircle2, Clock, Award, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { Course, UserProfile } from '../types';

interface CourseCardSplashModalProps {
  isOpen: boolean;
  course: Course | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  onClose: () => void;
  onViewDescription: (courseId: string) => void;
}

export default function CourseCardSplashModal({
  isOpen,
  course,
  userProfile,
  isAdmin,
  onClose,
  onViewDescription,
}: CourseCardSplashModalProps) {
  if (!isOpen || !course) return null;

  const progressObj = userProfile?.progress?.[course.id];
  const completedVideosCount = progressObj?.completedVideos ? Object.keys(progressObj.completedVideos).length : 0;
  const totalVideos = (course.days || []).reduce((acc, d) => acc + (d.videos?.length || 0), 0) || 1;
  const progressPercent = Math.min(100, Math.round((completedVideosCount / totalVideos) * 100));

  const isEnrolled = isAdmin || (!!(userProfile?.progress && userProfile.progress[course.id] && userProfile.progress[course.id].accessStatus !== 'revoked'));
  const isAdvanced = course.tier === 'advanced' || course.tier === 'masterclass' || course.level === 'Advanced' || course.level === 'Masterclass';

  const totalAssignments = (course.days || []).filter(d => !!d.assignment).length;

  return (
    <AnimatePresence>
      {/* Frosted Backdrop below mobile bottom nav bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Slide-Up Bottom Splash Sheet (Sits strictly ABOVE mobile bottom navigation bar) */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed inset-x-0 bottom-[62px] sm:bottom-[68px] z-40 max-w-lg mx-auto bg-white rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.25)] border-t border-slate-200/90 flex flex-col max-h-[calc(85dvh-64px)] overflow-hidden font-sans select-none text-left"
      >
        {/* Grab Handle & Sheet Header */}
        <div className="p-4 pb-2.5 border-b border-slate-100 shrink-0 bg-white">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3" />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Course Spotlight
              </span>
              {isEnrolled && (
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Registered
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center border-0 cursor-pointer transition-colors"
              aria-label="Close course preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content: The Full Card */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Visual Artwork Banner */}
          <div className="relative w-full aspect-[16/9] rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden shadow-md">
            {(course.thumbnail || (course as any).thumbnailUrl) ? (
              <img
                src={course.thumbnail || (course as any).thumbnailUrl}
                alt={course.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-800 to-indigo-950 text-white">
                <span className="text-4xl mb-2">🎓</span>
                <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                  {course.category || 'CIYA Academy'}
                </span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent pointer-events-none" />

            {/* Badges on artwork */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm backdrop-blur-md ${
                isAdvanced ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
              }`}>
                {course.tier || course.level || 'Standard'}
              </span>

              <span className="text-[10px] font-extrabold text-white bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-300" />
                {course.days?.length || 5} Modules
              </span>
            </div>

            {/* Play preview icon */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-lg">
                <Play className="w-4 h-4 fill-slate-900 ml-0.5" />
              </div>
              <span className="text-xs font-black drop-shadow-sm">Interactive Syllabus & Video Course</span>
            </div>
          </div>

          {/* Title & Tagline */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                {course.category || 'AI Mastery Track'}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Cohort Accredited
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
              {course.title}
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {course.tagline || course.subtitle || "Step-by-step masterclass syllabus curated by certified CIYA coaches."}
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
            <div className="space-y-0.5">
              <div className="flex items-center justify-center text-indigo-600">
                <Play className="w-4 h-4" />
              </div>
              <div className="text-xs font-black text-slate-900">{totalVideos}</div>
              <div className="text-[10px] font-bold text-slate-500">Video Lessons</div>
            </div>

            <div className="space-y-0.5 border-x border-slate-200">
              <div className="flex items-center justify-center text-amber-500">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-xs font-black text-slate-900">{totalAssignments}</div>
              <div className="text-[10px] font-bold text-slate-500">Assignments</div>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center justify-center text-emerald-600">
                <Award className="w-4 h-4" />
              </div>
              <div className="text-xs font-black text-slate-900">Certificate</div>
              <div className="text-[10px] font-bold text-slate-500">On 100% Pass</div>
            </div>
          </div>

          {/* Course Description / Overview Excerpt */}
          {course.description && (
            <div className="space-y-1 text-left bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/60">
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                Course Curriculum Overview
              </div>
              <p className="text-xs text-slate-700 font-medium leading-relaxed line-clamp-3">
                {course.description}
              </p>
            </div>
          )}

          {/* If Enrolled: Show Progress Bar */}
          {isEnrolled && (
            <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between text-xs font-black text-emerald-900">
                <span>Learning Progress</span>
                <span>{progressPercent}% Complete</span>
              </div>
              <div className="w-full h-2 bg-emerald-200/80 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-[10px] font-bold text-emerald-700">
                {completedVideosCount} of {totalVideos} video modules completed
              </div>
            </div>
          )}
        </div>

        {/* Modal Sticky Bottom Action: Leads to Course Description & Syllabus Page */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewDescription(course.id);
            }}
            className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer border-0"
          >
            <span>View Full Course Syllabus & Details</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
