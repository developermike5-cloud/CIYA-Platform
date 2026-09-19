import React from 'react';
import { Course } from '../types';
import { motion } from 'motion/react';
import { BookOpen, Sparkles, CheckCircle2, Play, Lock } from 'lucide-react';

interface TwoColumnCourseCardProps {
  course: Course;
  userProfile?: any;
  isEnrolled?: boolean;
  onSelect: () => void;
}

export const TwoColumnCourseCard: React.FC<TwoColumnCourseCardProps> = ({
  course,
  userProfile,
  isEnrolled = false,
  onSelect,
}) => {
  // Compute progress if enrolled
  const progressObj = userProfile?.progress?.[course.id];
  const completedVideosCount = progressObj?.completedVideos ? Object.keys(progressObj.completedVideos).length : 0;
  
  // Calculate total videos
  const totalVideos = (course.days || []).reduce((acc, d) => acc + (d.videos?.length || 0), 0) || 1;
  const progressPercent = Math.min(100, Math.round((completedVideosCount / totalVideos) * 100));
  const isCompleted = progressPercent === 100;

  // Tier color styling
  const isAdvanced = course.tier === 'advanced' || course.tier === 'masterclass' || course.level === 'Advanced' || course.level === 'Masterclass';

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className="text-left w-full h-full flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer overflow-hidden group select-none relative p-0"
    >
      {/* Card Header / Banner */}
      <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden flex items-center justify-center">
        {(course.thumbnail || (course as any).thumbnailUrl) ? (
          <img 
            src={course.thumbnail || (course as any).thumbnailUrl} 
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-slate-800 to-indigo-900">
            <span className="text-2xl sm:text-3xl mb-1 filter drop-shadow">
              {(course as any).icon || '🎓'}
            </span>
            <span className="text-[10px] font-black text-indigo-200 uppercase tracking-wider line-clamp-1">
              {course.category || 'AI Training'}
            </span>
          </div>
        )}

        {/* Overlay gradient for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

        {/* Badges on Top */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full backdrop-blur-md shadow-xs ${
            isAdvanced 
              ? 'bg-amber-500/90 text-slate-950' 
              : 'bg-emerald-500/90 text-slate-950'
          }`}>
            {course.tier || course.level || 'Free'}
          </span>

          {isEnrolled ? (
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-600/90 text-white backdrop-blur-md flex items-center gap-1 shadow-xs">
              <CheckCircle2 className="w-2.5 h-2.5" /> Enrolled
            </span>
          ) : (
            <span className="text-[9px] font-bold text-white/90 bg-slate-900/80 backdrop-blur-md px-1.5 py-0.5 rounded-md">
              {course.days?.length || 5} Days
            </span>
          )}
        </div>

        {/* Play Icon hover preview */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/30">
          <div className="w-8 h-8 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg">
            <Play className="w-4 h-4 fill-slate-900 ml-0.5" />
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {course.title}
          </h4>
          <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold line-clamp-1">
            {course.tagline || course.subtitle || `${course.days?.length || 5} Modules · Practical Walkthrough`}
          </p>
        </div>

        {/* Bottom meta / progress */}
        <div className="pt-1.5 border-t border-slate-100 mt-auto">
          {isEnrolled ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-extrabold">
                <span className="text-slate-500">Progress</span>
                <span className={isCompleted ? 'text-emerald-600' : 'text-indigo-600'}>
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isCompleted 
                      ? 'bg-emerald-500' 
                      : 'bg-gradient-to-r from-teal-500 to-indigo-600'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span>{totalVideos} Lessons</span>
              <span className="font-black text-indigo-600 group-hover:underline">
                View →
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
};

export default TwoColumnCourseCard;
