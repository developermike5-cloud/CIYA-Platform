import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, AlertTriangle, X, CloudLightning, ShieldAlert } from 'lucide-react';

export default function DatabaseQuotaBanner() {
  const [visible, setVisible] = useState(false);
  const [errorDetails, setErrorDetails] = useState<any>(null);

  useEffect(() => {
    const handleQuota = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setErrorDetails(customEvent.detail);
      }
      setVisible(true);
    };

    window.addEventListener('firestore-quota-exceeded', handleQuota);
    return () => window.removeEventListener('firestore-quota-exceeded', handleQuota);
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed top-4 left-4 right-4 md:left-1/2 md:right-auto md:w-[600px] md:-translate-x-1/2 z-50 pointer-events-none"
      >
        <div className="bg-slate-900/95 backdrop-blur-md border-2 border-amber-500/30 text-slate-100 p-4.5 rounded-2xl shadow-2xl pointer-events-auto flex gap-4 items-start relative overflow-hidden">
          {/* Subtle warm glow background */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="p-2.5 bg-amber-500/15 border border-amber-500/25 rounded-xl shrink-0 text-amber-400">
            <Database className="w-5 h-5 animate-pulse" />
          </div>

          <div className="flex-1 space-y-1.5 pr-6 text-left">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span>Hyper-Performance Local Cache Active</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[8.5px] font-bold text-amber-300">Sandbox Guard</span>
            </h4>
            <p className="text-[11px] leading-relaxed font-semibold text-slate-200">
              The project's Firestore database is currently under high traffic and has met its daily free-tier read limits. To safeguard your curriculum progress and quiz scoreheets, we have activated the client cache engine.
            </p>
            <p className="text-[10px] text-slate-400 font-bold italic">
              ✦ You can watch clips, complete quizzes, and submit checkpoints normally using local backup persistence.
            </p>
          </div>

          <button 
            type="button"
            onClick={() => setVisible(false)}
            className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white transition-colors bg-transparent border-0 cursor-pointer p-1 rounded-lg hover:bg-white/5"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
