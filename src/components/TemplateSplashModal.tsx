import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageCircle, Sparkles, FileText, ChevronRight, LayoutTemplate } from 'lucide-react';

interface TemplateSplashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSection: (section: 'prompts' | 'kycb') => void;
}

export default function TemplateSplashModal({
  isOpen,
  onClose,
  onSelectSection,
}: TemplateSplashModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Frosted backdrop below mobile bottom nav bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.18 } }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-[3px]"
        onClick={onClose}
      />

      {/* Slide-Up Bottom Splash Sheet (Sits strictly ABOVE bottom navigation bar) */}
      <motion.div
        initial={{ y: '110%' }}
        animate={{ y: 0, transition: { type: 'spring', stiffness: 300, damping: 27, mass: 1.05 } }}
        exit={{ y: '110%', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
        className="fixed inset-x-0 bottom-[62px] sm:bottom-[68px] z-40 max-w-xl mx-auto rounded-t-[28px] overflow-hidden bg-white flex flex-col max-h-[calc(85dvh-64px)] shadow-[0_-18px_60px_rgba(6,95,70,0.35)] font-sans select-none"
      >
        {/* Gradient hero header with sparkle glows */}
        <div className="relative shrink-0 bg-gradient-to-br from-teal-700 via-emerald-600 to-teal-800 px-5 pt-4 pb-5 overflow-hidden">
          <div aria-hidden="true" className="absolute -top-10 -right-8 w-36 h-36 rounded-full bg-emerald-400/25 blur-2xl pointer-events-none" />
          <div aria-hidden="true" className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-teal-300/20 blur-2xl pointer-events-none" />

          <div className="w-10 h-1 bg-white/35 rounded-full mx-auto mb-4" />

          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 text-white flex items-center justify-center shadow-lg shadow-emerald-950/30">
                <LayoutTemplate className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-tight leading-tight">
                  CIYA Templates &amp; KYCB
                </h3>
                <p className="text-[11px] font-semibold text-emerald-100/90">
                  AI prompt lab &amp; business data sheets
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center border-0 cursor-pointer transition-colors"
              aria-label="Close sheet"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card options */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 bg-gradient-to-b from-slate-50 to-white">
          {/* Card 1: AI Prompt Templates Lab */}
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { delay: 0.1, type: 'spring', stiffness: 420, damping: 26 } }}
            onClick={() => {
              onClose();
              onSelectSection('prompts');
            }}
            className="group relative flex items-center justify-between gap-4 p-4 sm:p-[18px] rounded-[22px] bg-white border border-slate-200/80 hover:border-emerald-400 shadow-[0_2px_10px_rgba(2,44,34,0.06)] hover:shadow-[0_10px_30px_rgba(16,185,129,0.22)] transition-all cursor-pointer text-left overflow-hidden"
          >
            <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full" />
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Prompt templates
                </h4>
                <p className="text-[11px] font-semibold text-slate-500">
                  AI prompts ready to copy and run
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </motion.div>

          {/* Card 2: KYCB Business Sheets & Data */}
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { delay: 0.18, type: 'spring', stiffness: 420, damping: 26 } }}
            onClick={() => {
              onClose();
              onSelectSection('kycb');
            }}
            className="group relative flex items-center justify-between gap-4 p-4 sm:p-[18px] rounded-[22px] bg-white border border-slate-200/80 hover:border-indigo-400 shadow-[0_2px_10px_rgba(2,44,34,0.06)] hover:shadow-[0_10px_30px_rgba(99,102,241,0.22)] transition-all cursor-pointer text-left overflow-hidden"
          >
            <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-indigo-400 to-violet-500 rounded-full" />
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0 group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                  KYCB form
                </h4>
                <p className="text-[11px] font-semibold text-slate-500">
                  Business sheets and client data
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
