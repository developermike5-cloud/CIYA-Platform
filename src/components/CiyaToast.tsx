import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface ToastItem {
  id: number;
  message: string;
  variant: 'success' | 'info' | 'error';
}

const EVENT_NAME = 'ciya-toast';

/**
 * Branded CIYA toast for simple notifications ("Account details copied!",
 * "Profile updated successfully!"). Confirmation popups stay for actions
 * that need double confirmation (deletes, destructive changes); everything
 * that merely notifies the user goes through here.
 */
export function showCiyaToast(message: string) {
  const lower = String(message).toLowerCase();
  const isError = /error|failed|failure|❌|⚠️|could not|couldn't|try again|invalid|not found/.test(lower);
  const isSuccess = /success|successfully|✅|🎉|copied|welcome|saved|submitted|sent|updated|created|registered/.test(lower);
  const variant: ToastItem['variant'] = isError ? 'error' : isSuccess ? 'success' : 'info';
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { message, variant } }));
}

export default function CiyaToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev.slice(-2), { id, message: detail.message, variant: detail.variant || 'info' }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex flex-col items-center gap-2 pointer-events-none px-4 w-full max-w-sm">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: 'spring', damping: 26, stiffness: 420 }}
            className="w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 border border-teal-500/30 shadow-xl text-left"
          >
            <span className="shrink-0">
              {t.variant === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : t.variant === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              ) : (
                <Info className="w-4 h-4 text-teal-300" />
              )}
            </span>
            <p className="text-white text-xs font-bold leading-snug whitespace-pre-wrap">{t.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
