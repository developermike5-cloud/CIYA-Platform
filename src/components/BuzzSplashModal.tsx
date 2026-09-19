import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageCircle, BookOpen, Users, Sparkles, ChevronRight, Newspaper, ArrowRight } from 'lucide-react';

interface BuzzSplashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSection: (section: 'groups' | 'blog') => void;
}

export default function BuzzSplashModal({
  isOpen,
  onClose,
  onSelectSection,
}: BuzzSplashModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop below bottom nav bar */}
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
        className="fixed inset-x-0 bottom-[62px] sm:bottom-[68px] z-40 max-w-xl mx-auto bg-white rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.25)] border-t border-slate-200/90 flex flex-col max-h-[calc(85dvh-64px)] overflow-hidden font-sans select-none"
      >
        {/* Pull Handle & Header */}
        <div className="p-4 pb-3 border-b border-slate-100 shrink-0 bg-white">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3" />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-black">
                <MessageCircle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                  CIYA Buzz Hub
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold">
                  Live cohort discussions & academy articles
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

        {/* Card Options Container */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3">
          {/* Card 1: Buzz Chats */}
          <div
            id="buzz-splash-card-chats"
            onClick={() => {
              onClose();
              onSelectSection('groups');
            }}
            className="group p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/25 transition-all cursor-pointer shadow-xs hover:shadow-md flex items-center justify-between gap-4 text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                Buzz Chats
              </h4>
            </div>

            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-400 flex items-center justify-center transition-colors shrink-0">
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 2: Blog and Articles */}
          <div
            id="buzz-splash-card-blog"
            onClick={() => {
              onClose();
              onSelectSection('blog');
            }}
            className="group p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/25 transition-all cursor-pointer shadow-xs hover:shadow-md flex items-center justify-between gap-4 text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 shrink-0 group-hover:scale-105 transition-transform">
                <Newspaper className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                Blog and Articles
              </h4>
            </div>

            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors shrink-0">
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
