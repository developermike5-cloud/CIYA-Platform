import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, FileText, ChevronRight, ArrowRight, LayoutTemplate } from 'lucide-react';

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
      {/* Backdrop below mobile bottom nav bar */}
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
        className="fixed inset-x-0 bottom-[62px] sm:bottom-[68px] z-40 max-w-xl mx-auto bg-white rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.25)] border-t border-slate-200/90 flex flex-col max-h-[calc(85dvh-64px)] overflow-hidden font-sans select-none text-left"
      >
        {/* Pull Handle & Header */}
        <div className="p-4 pb-3 border-b border-slate-100 shrink-0 bg-white">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3" />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-black">
                <LayoutTemplate className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                  CIYA Templates & KYCB
                </h3>
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

        {/* Standalone Section Cards Container */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5">
          {/* Card 1: AI Prompt Templates Lab */}
          <div
            onClick={() => {
              onClose();
              onSelectSection('prompts');
            }}
            className="group p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 hover:border-amber-500 bg-white hover:bg-amber-50/20 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col gap-3 text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 font-black">
                  <Sparkles className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-amber-700 transition-colors">
                    AI Prompt Templates Lab
                  </h4>
                </div>
              </div>

              <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-400 flex items-center justify-center transition-colors shrink-0">
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black text-amber-600">
              <span>Open Prompt Engineering Lab</span>
              <span className="flex items-center gap-1 text-[11px] group-hover:translate-x-1 transition-transform">
                Launch Lab <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 2: KYCB Business Sheets & Data */}
          <div
            onClick={() => {
              onClose();
              onSelectSection('kycb');
            }}
            className="group p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 hover:border-indigo-500 bg-white hover:bg-indigo-50/20 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col gap-3 text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0 font-black">
                  <FileText className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                    KYCB Business Sheets & Forms
                  </h4>
                </div>
              </div>

              <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors shrink-0">
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black text-indigo-600">
              <span>Open KYCB Forms & Data</span>
              <span className="flex items-center gap-1 text-[11px] group-hover:translate-x-1 transition-transform">
                Launch Questionnaire <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
