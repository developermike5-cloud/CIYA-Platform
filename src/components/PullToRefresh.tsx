import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import CiyaBrandMark from './CiyaBrandMark';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

const PULL_THRESHOLD = 80;

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
        // Reload straight away so the platform's own academy-logo loading
        // animation covers the refresh.
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
    </div>
  );
};
