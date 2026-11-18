import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import CiyaBrandMark from './CiyaBrandMark';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

const PULL_THRESHOLD = 80;
const REFRESH_FLAG = 'ciya_branded_refresh';

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, disabled = false }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].pageY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isPulling.current || isRefreshing) return;

    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Apply resistance
      const distance = Math.min(diff * 0.4, PULL_THRESHOLD + 20);
      setPullDistance(distance);
    } else {
      isPulling.current = false;
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || !isPulling.current || isRefreshing) return;

    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      try {
        // Show the branded refresh screen briefly before the app reloads,
        // and flag it so the same branded screen covers the reload itself.
        try { sessionStorage.setItem(REFRESH_FLAG, '1'); } catch { /* ignore */ }
        await new Promise(resolve => setTimeout(resolve, 750));
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative h-full ${disabled ? '' : 'overflow-y-auto'}`}
      style={{ overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* CIYA-branded pull indicator */}
      {!disabled && (
        <motion.div
          style={{
            height: isRefreshing ? PULL_THRESHOLD : pullDistance,
            opacity: Math.min(pullDistance / PULL_THRESHOLD, 1)
          }}
          className="flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900"
        >
          <motion.div
            animate={isRefreshing ? { rotate: 360 } : { rotate: (pullDistance / PULL_THRESHOLD) * 200 }}
            transition={isRefreshing ? { repeat: Infinity, duration: 1.1, ease: 'linear' } : { type: 'spring' }}
            className="origin-center"
          >
            <CiyaBrandMark size={44} />
          </motion.div>
          <span className="mt-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300/90">
            {isRefreshing ? 'Refreshing' : 'Pull to refresh'}
          </span>
        </motion.div>
      )}

      <motion.div
        animate={{ y: 0 }}
        className={`relative z-10 ${disabled ? 'h-full' : ''}`}
      >
        {children}
      </motion.div>

      {/* Full-screen branded refresh screen shown while the app reloads */}
      {isRefreshing && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-950 font-sans">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="origin-center"
          >
            <CiyaBrandMark size={72} />
          </motion.div>
          <p className="mt-5 text-white font-black text-sm tracking-[0.25em] uppercase">Refreshing CIYA</p>
          <p className="mt-1.5 text-emerald-300/80 text-xs font-semibold">Hang tight, getting your academy ready…</p>
        </div>
      )}
    </div>
  );
};
