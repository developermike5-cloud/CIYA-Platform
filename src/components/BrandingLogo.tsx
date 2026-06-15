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
    const syncLogo = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'app'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.logo) {
            localStorage.setItem('ciya_brand_logo', data.logo);
            setCustomLogo(data.logo);
          } else {
            localStorage.removeItem('ciya_brand_logo');
            setCustomLogo(null);
          }
        }
      } catch (err) {
        // ignore silently
      }
    };
    syncLogo();
  }, []);

  // Dimensions
  let svgSize = 100;
  let textFontSize = "10px";
  let iconSize = 52;
  let iconOffset = 24; // (100 - 52) / 2
  let pathRadius = 38; // text radius

  if (size === 'xs') {
    svgSize = 56;
    textFontSize = "5.5px";
    iconSize = 28;
    iconOffset = 14;
    pathRadius = 20;
  } else if (size === 'sm') {
    svgSize = 76;
    textFontSize = "7.5px";
    iconSize = 38;
    iconOffset = 19;
    pathRadius = 28;
  } else if (size === 'lg') {
    svgSize = 140;
    textFontSize = "13px";
    iconSize = 72;
    iconOffset = 34;
    pathRadius = 52;
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
