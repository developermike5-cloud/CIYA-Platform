import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

interface AlertEventData {
  message: string;
  title?: string;
  type?: 'warning' | 'success' | 'info';
  onClose?: () => void;
}

// Global dispatcher function
export function showBrandedAlert(
  message: string,
  title?: string,
  type: 'warning' | 'success' | 'info' = 'warning',
  onClose?: () => void
) {
  const event = new CustomEvent('ciya-branded-alert', {
    detail: { message, title, type, onClose },
  });
  window.dispatchEvent(event);
}

// Overwrite window.alert so that legacy alert calls automatically map to our branded alert
if (typeof window !== 'undefined') {
  (window as any).legacyAlert = window.alert;
  window.alert = (message: string) => {
    showBrandedAlert(message, 'System Alert', 'warning');
  };
}

export function BrandedAlertContainer() {
  const [activeAlert, setActiveAlert] = useState<AlertEventData | null>(null);

  useEffect(() => {
    const handleAlertEvent = (e: Event) => {
      const customEvent = e as CustomEvent<AlertEventData>;
      if (customEvent.detail) {
        setActiveAlert(customEvent.detail);
      }
    };

    window.addEventListener('ciya-branded-alert', handleAlertEvent);
    return () => {
      window.removeEventListener('ciya-branded-alert', handleAlertEvent);
    };
  }, []);

  const handleClose = () => {
    if (activeAlert?.onClose) {
      try {
        activeAlert.onClose();
      } catch (err) {
        console.error(err);
      }
    }
    setActiveAlert(null);
  };

  const getTheme = () => {
    switch (activeAlert?.type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-500" />,
          borderColor: 'border-emerald-500',
          bgColor: 'bg-emerald-50/90',
          textColor: 'text-emerald-950',
          badgeText: 'Success',
          badgeBg: 'bg-emerald-100 text-emerald-800',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700',
        };
      case 'info':
        return {
          icon: <Info className="w-8 h-8 text-sky-500" />,
          borderColor: 'border-sky-500',
          bgColor: 'bg-sky-50/90',
          textColor: 'text-sky-950',
          badgeText: 'Notification',
          badgeBg: 'bg-sky-100 text-sky-800',
          btnBg: 'bg-sky-600 hover:bg-sky-700',
        };
      case 'warning':
      default:
        return {
          icon: <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />,
          borderColor: 'border-amber-500',
          bgColor: 'bg-amber-50/90',
          textColor: 'text-amber-950',
          badgeText: 'Alert',
          badgeBg: 'bg-amber-100 text-amber-800',
          btnBg: 'bg-amber-600 hover:bg-amber-700',
        };
    }
  };

  const theme = getTheme();

  return (
    <AnimatePresence>
      {activeAlert && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: -15, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`relative w-full max-w-md bg-white rounded-3xl border-2 ${theme.borderColor} shadow-2xl p-6 overflow-hidden flex flex-col items-center text-center`}
          >
            {/* Subtle brand graphic accent */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-500" />

            {/* Close icon */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon Wrapper with bounce effect */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.1, 1] }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mb-4 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl shadow-inner mt-2"
            >
              {theme.icon}
            </motion.div>

            {/* Category / Type badge */}
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${theme.badgeBg} mb-2.5`}>
              {activeAlert.title || theme.badgeText}
            </span>

            {/* Title / Primary Text */}
            <h3 className="text-base font-black text-slate-800 tracking-tight leading-tight mb-2 px-1">
              CIYA academy
            </h3>

            {/* Message Body */}
            <p className="text-xs font-medium text-slate-600 leading-relaxed px-2 mb-6 max-h-[180px] overflow-y-auto">
              {activeAlert.message}
            </p>

            {/* Branded Dismiss Button */}
            <button
              onClick={handleClose}
              className={`w-full py-3 ${theme.btnBg} text-white text-xs font-extrabold rounded-2xl shadow-md transition-all active:scale-[0.98] border-0 cursor-pointer`}
            >
              Acknowledge & Continue
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
