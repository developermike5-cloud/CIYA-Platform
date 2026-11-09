import React from 'react';
import { ImageIcon, Video } from 'lucide-react';

type Ratio = '16/9' | '16/10' | '4/5' | '4/3' | '1/1';

interface MediaSlotProps {
  /** Real media when available. When omitted, a labelled placeholder renders instead. */
  src?: string;
  /** "video" slots render a <video>, everything else an <img>. */
  kind?: 'image' | 'video';
  /** CSS aspect-ratio, e.g. "16/9". */
  ratio?: Ratio;
  /** Human label shown on the placeholder (and used as alt text for real media). */
  label: string;
  /** Media spec shown under the label on the placeholder. */
  spec?: string;
  /** Hide the dashed border (used for full-bleed slots). */
  noBorder?: boolean;
  className?: string;
  objectFit?: 'cover' | 'contain';
}

/**
 * Every media slot on the landing page. Accepts a src prop and renders a
 * labelled placeholder when no src is given, so no media is ever invented.
 */
export default function MediaSlot({
  src,
  kind = 'image',
  ratio = '16/9',
  label,
  spec,
  noBorder,
  className = '',
  objectFit = 'cover',
}: MediaSlotProps) {
  const style = ratio ? { aspectRatio: ratio } : undefined;
  if (src) {
    return kind === 'video' ? (
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        aria-label={label}
        className={`w-full h-full object-${objectFit} ${className}`}
        style={style}
      />
    ) : (
      <img
        src={src}
        alt={label}
        loading="lazy"
        className={`w-full h-full object-${objectFit} ${className}`}
        style={style}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={label}
      className={`ph-slot ${noBorder ? 'no-border' : ''} ${className}`}
      style={style}
    >
      {kind === 'video' ? (
        <Video className="w-8 h-8 text-amber-400" aria-hidden="true" />
      ) : (
        <ImageIcon className="w-8 h-8 text-amber-400" aria-hidden="true" />
      )}
      <b className="font-mono text-[11px] font-extrabold uppercase tracking-[0.1em] text-amber-300 leading-tight">
        {kind === 'video' ? 'Video' : 'Image'} placeholder
      </b>
      {spec ? (
        <span className="text-xs font-medium text-teal-200 max-w-[30ch] leading-snug">{spec}</span>
      ) : null}
    </div>
  );
}
