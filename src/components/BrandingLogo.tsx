import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface BrandingLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  theme?: 'dark' | 'light';
}

export default function BrandingLogo({ className = '', size = 'md', theme = 'dark' }: BrandingLogoProps) {
  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    return localStorage.getItem('ciya_brand_logo');
  });

  useEffect(() => {
    // Rely strictly on local storage and static assets to eliminate anonymous startup Firestore reads.
  }, []);

  // Dimensions
  let svgSize = 120;
  let textFontSize = "11.5px";
  let iconSize = 62;
  let iconOffset = 29; // (120 - 62) / 2
  let pathRadius = 45; // text radius

  if (size === 'xs') {
    svgSize = 64;
    textFontSize = "6.5px";
    iconSize = 34;
    iconOffset = 15;
    pathRadius = 24;
  } else if (size === 'sm') {
    svgSize = 88;
    textFontSize = "9px";
    iconSize = 46;
    iconOffset = 21;
    pathRadius = 33;
  } else if (size === 'lg') {
    svgSize = 160;
    textFontSize = "14.5px";
    iconSize = 84;
    iconOffset = 38;
    pathRadius = 60;
  }

  const center = svgSize / 2;

  // SVG path descriptor for standard wrapping path
  const pathId = `logoCirclePath-${size}-${theme}`;
  const pathD = `M ${center}, ${center} m -${pathRadius}, 0 a ${pathRadius},${pathRadius} 0 1,1 ${pathRadius * 2},0 a ${pathRadius},${pathRadius} 0 1,1 -${pathRadius * 2},0`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative select-none shrink-0" style={{ width: svgSize, height: svgSize }}>
        <svg
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="w-full h-full animate-spin-slow origin-center"
        >
          <path
            id={pathId}
            d={pathD}
            fill="none"
            stroke="none"
          />
          <text 
            className={`font-mono tracking-widest font-extrabold uppercase ${
              theme === 'dark' ? 'fill-teal-100/90' : 'fill-slate-800'
            }`} 
            style={{ fontSize: textFontSize }}
          >
            <textPath href={`#${pathId}`} startOffset="0%">
              CREATE IT YOURSELF ACADEMY • CIYA •
            </textPath>
          </text>
        </svg>
        
        {/* Central circular logo */}
        <div 
          className={`absolute rounded-full overflow-hidden flex items-center justify-center bg-slate-950 border shadow-md ${
            theme === 'dark' ? 'border-teal-500/30' : 'border-slate-200'
          }`}
          style={{
            width: iconSize,
            height: iconSize,
            left: iconOffset,
            top: iconOffset,
          }}
        >
          {customLogo ? (
            <img 
              src={customLogo} 
              alt="CIYA Brand Logo" 
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
}
