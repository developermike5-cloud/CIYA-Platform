import React from 'react';

/**
 * CIYA brand mark used by the pull-to-refresh indicator and the branded
 * refresh splash: a rounded tile with the CIYA wordmark on the platform's
 * deep-green/teal gradient.
 */
export default function CiyaBrandMark({ size = 44 }: { size?: number }) {
  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-300/30 shrink-0"
      style={{ width: size, height: size }}
    >
      <span
        className="text-white font-black leading-none"
        style={{ fontSize: Math.max(9, size * 0.24), letterSpacing: '0.06em' }}
      >
        CIYA
      </span>
    </div>
  );
}
