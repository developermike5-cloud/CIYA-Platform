import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, ChevronRight, Play, CheckCircle, Award, Compass, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { Course, UserProfile } from '../types';

interface RegisteredCoursesSplashModalProps {
  isOpen: boolean;
  onClose: () => void;
  registeredCourses: Course[];
  userProfile: UserProfile | null;
  onSelectCourse: (courseId: string) => void;
  onExploreClick?: () => void;
  onBrowseCatalog?: () => void;
  isGuest?: boolean;
  onLoginClick?: () => void;
  onViewAssignments?: () => void;
  assignments?: any[];
}

export default function RegisteredCoursesSplashModal({
  isOpen,
  onClose,
  registeredCourses,
  userProfile,
  onSelectCourse,
  onExploreClick,
  onBrowseCatalog,
  isGuest = false,
  onLoginClick,
  onViewAssignments,
  assignments = []
}: RegisteredCoursesSplashModalProps) {
  const [showAll, setShowAll] = useState(false);

  if (!isOpen) return null;

  const handleBrowse = () => {
    onClose();
    if (onBrowseCatalog) onBrowseCatalog();
    else if (onExploreClick) onExploreClick();
  };

  // Sort courses by registration time (unlockedAt or createdAt in userProfile.progress)
  const sortedCourses = [...registeredCourses].sort((a, b) => {
    const progA = userProfile?.progress?.[a.id || ''] || {};
    const progB = userProfile?.progress?.[b.id || ''] || {};
    const timeA = new Date(progA.unlockedAt || progA.createdAt || 0).getTime();
    const timeB = new Date(progB.unlockedAt || progB.createdAt || 0).getTime();
    return timeB - timeA; // Latest first
  });

  const latestCourse = sortedCourses[0] || null;
  const otherCourses = sortedCourses.slice(1);

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
        className="fixed inset-x-0 bottom-[62px] sm:bottom-[68px] z-40 max-w-3xl mx-auto bg-white rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.25)] border-t border-slate-200/90 flex flex-col max-h-[calc(90dvh-64px)] overflow-hidden text-left font-sans select-none"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-white">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3" />
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-black">
                <BookOpen className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                  My Learning Path
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold">
                  {registeredCourses.length} active course{registeredCourses.length === 1 ? '' : 's'} enrolled
                </p>
              </div>
            </div>

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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {isGuest ? (
              <div className="text-center py-10 px-4 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl">
                  🔒
                </div>
                <h4 className="text-sm font-black text-slate-900">Sign in to view registered courses</h4>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                  Sign in with your Google student account to access your personal course registrations and assignment records.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLoginClick?.();
                  }}
                  className="py-2.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs border-0 cursor-pointer shadow-xs transition-colors"
                >
                  Sign In with Google
                </button>
              </div>
            ) : registeredCourses.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl">
                  📚
                </div>
                <h4 className="text-sm font-black text-slate-900">No registered courses yet</h4>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                  Browse the CIYA Academy explore catalog to start learning and enroll in your first course track.
                </p>
                <button
                  type="button"
                  onClick={handleBrowse}
                  className="py-2.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs border-0 cursor-pointer shadow-xs transition-colors inline-flex items-center gap-2"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Courses</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* LATEST COURSE SECTION */}
                {!showAll && latestCourse && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                        Latest Enrolled Course
                      </span>
                    </div>

                    <div
                      onClick={() => {
                        // User specifically requested: "It is after a user click on the latest course that the rest of the registered course the student has should show up"
                        if (otherCourses.length > 0) {
                          setShowAll(true);
                        } else {
                          // If no other courses, just navigate
                          onClose();
                          onSelectCourse(latestCourse.id || '');
                        }
                      }}
                      className="p-5 rounded-[28px] border-2 border-emerald-500/20 bg-gradient-to-br from-white to-emerald-50/20 shadow-sm cursor-pointer group active:scale-[0.98] transition-all relative overflow-hidden"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="relative w-full aspect-video rounded-2xl bg-slate-100 overflow-hidden shadow-md">
                          {latestCourse.thumbnail || (latestCourse as any).thumbnailUrl ? (
                            <img 
                              src={latestCourse.thumbnail || (latestCourse as any).thumbnailUrl} 
                              alt={latestCourse.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50">
                              <BookOpen className="w-8 h-8 text-emerald-200" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-[10px] font-black text-emerald-700 uppercase shadow-sm">
                              {latestCourse.category || 'AI Training'}
                            </span>
                            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-base font-black text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors">
                            {latestCourse.title}
                          </h4>
                          
                          {(() => {
                            const courseId = latestCourse.id || '';
                            const progressObj = userProfile?.progress?.[courseId] || {};
                            const completedCount = progressObj.completedVideos ? Object.keys(progressObj.completedVideos).length : 0;
                            const totalLessons = latestCourse.days ? latestCourse.days.reduce((acc: number, d: any) => acc + (d.videos?.length || 0), 0) : 0;
                            const pct = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;

                            return (
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                    <span>Course Progress</span>
                                    <span className="text-emerald-700 font-black">{pct}% Complete</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50 p-0.5">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      className="bg-emerald-500 h-full rounded-full"
                                    />
                                  </div>
                                </div>

                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent expansion when clicking the button
                                    onClose();
                                    onSelectCourse(latestCourse.id || '');
                                  }}
                                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md border-0 cursor-pointer flex items-center justify-center gap-2 transition-transform active:scale-95"
                                >
                                  <Play className="w-4 h-4 fill-current" />
                                  <span>Enter Classroom</span>
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* ASSIGNMENTS SECTION UNDER LATEST COURSE */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                          My Assignment Workspace
                        </span>
                      </div>

                      <div 
                        className="bg-white border-2 border-dashed border-indigo-200 rounded-[28px] p-5 space-y-4 hover:border-indigo-400 transition-colors cursor-pointer"
                        onClick={() => {
                          onClose();
                          if (onViewAssignments) onViewAssignments();
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <FileText className="w-5 h-5 stroke-[2.5]" />
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-slate-900 uppercase tracking-tight">Recent Submissions</h5>
                            <p className="text-[10px] text-slate-500 font-semibold">Track your homework & feedback</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {assignments.length > 0 ? (
                            assignments.slice(0, 2).map((sub: any) => (
                              <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs">📝</span>
                                  <span className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">Day {sub.dayIndex + 1} Assignment</span>
                                </div>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  sub.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                                  sub.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {sub.status}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-[11px] text-slate-400 font-bold italic">
                              No assignments submitted yet.
                            </div>
                          )}
                        </div>

                        <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-sm border-0 cursor-pointer flex items-center justify-center gap-2">
                          <span>Enter Submission Desk</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Button to show other courses */}
                    {otherCourses.length > 0 && (
                      <button
                        onClick={() => setShowAll(true)}
                        className="w-full py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-800 transition-colors border-0 bg-transparent cursor-pointer flex items-center justify-center gap-2"
                      >
                        <ChevronRight className="w-4 h-4 rotate-90" />
                        <span>View {otherCourses.length} Other Registered Course{otherCourses.length === 1 ? '' : 's'}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* ALL COURSES VIEW (Expanded or if latestCourse is missing) */}
                {(showAll || !latestCourse) && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <button 
                        onClick={() => setShowAll(false)}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 cursor-pointer transition-colors"
                      >
                        ← Back to Latest
                      </button>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        All Enrolled Courses
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {registeredCourses.map((course) => {
                        const courseId = course.id || '';
                        const progressObj = userProfile?.progress?.[courseId] || {};
                        const completedCount = progressObj.completedVideos ? Object.keys(progressObj.completedVideos).length : 0;
                        const totalLessons = course.days ? course.days.reduce((acc: number, d: any) => acc + (d.videos?.length || 0), 0) : 0;
                        const pct = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;

                        return (
                          <div
                            key={courseId}
                            onClick={() => {
                              onClose();
                              onSelectCourse(courseId);
                            }}
                            className="p-4 rounded-3xl border border-slate-200/90 hover:border-emerald-500 bg-white hover:bg-emerald-50/10 transition-all cursor-pointer shadow-xs flex flex-col justify-between gap-3 group overflow-hidden"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  Enrolled
                                </span>
                                <span className="text-[10px] font-mono font-bold text-slate-400">
                                  {completedCount}/{totalLessons} lessons
                                </span>
                              </div>

                              <div className="relative w-full aspect-video rounded-2xl bg-slate-100 overflow-hidden shadow-inner">
                                {course.thumbnail || (course as any).thumbnailUrl ? (
                                  <img 
                                    src={course.thumbnail || (course as any).thumbnailUrl} 
                                    alt={course.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-slate-100 to-slate-200">
                                    <BookOpen className="w-6 h-6 text-slate-300 mb-1" />
                                  </div>
                                )}
                              </div>

                              <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                                {course.title}
                              </h4>

                              <div className="space-y-1.5">
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                              <span>Open Classroom</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
    </AnimatePresence>
  );
}

