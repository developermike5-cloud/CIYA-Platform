import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import CiyaBrandMark from './CiyaBrandMark';

const REFRESH_FLAG = 'ciya_branded_refresh';

/**
 * Covers the moment the app finishes reloading after a CIYA-branded
 * pull-to-refresh, so the browser's plain white flash never shows.
 */
export default function CiyaRefreshSplash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(REFRESH_FLAG) === '1') {
        sessionStorage.removeItem(REFRESH_FLAG);
        setShow(true);
        const t = setTimeout(() => setShow(false), 1400);
        return () => clearTimeout(t);
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45 } }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-950 font-sans"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="origin-center"
          >
            <CiyaBrandMark size={72} />
          </motion.div>
          <p className="mt-5 text-white font-black text-sm tracking-[0.25em] uppercase">Welcome back to CIYA</p>
          <p className="mt-1.5 text-emerald-300/80 text-xs font-semibold">Setting up your academy…</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
