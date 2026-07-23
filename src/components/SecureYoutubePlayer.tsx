import React, { useState, useRef, useEffect } from 'react';
import { Maximize, Minimize, Play } from 'lucide-react';

interface SecureYoutubePlayerProps {
  url: string;
  title: string;
  isAdvanced?: boolean;
}

export default function SecureYoutubePlayer({ url, title, isAdvanced }: SecureYoutubePlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Maintain fullscreen state listener for native esc key or system toggles
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!document.fullscreenElement || 
        !!(document as any).webkitFullscreenElement
      );
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle customized native fullscreen on the WRAPPER instead of standard iframe zoom
  const handleFullscreenToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(err => console.log(err));
      } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.log(err));
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  // Extract clean YouTube ID or embed URL
  const getEmbedUrl = (rawUrl: string): string => {
    if (!rawUrl) return '';
    let videoId = '';
    try {
      if (rawUrl.includes('youtube.com/embed/')) {
        const urlObj = new URL(rawUrl);
        videoId = rawUrl.split('youtube.com/embed/')[1]?.split('?')[0] || '';
      } else if (rawUrl.includes('youtube.com/watch')) {
        const urlObj = new URL(rawUrl);
        videoId = urlObj.searchParams.get('v') || '';
      } else if (rawUrl.includes('youtu.be/')) {
        const parts = rawUrl.split('youtu.be/');
        if (parts[1]) {
          videoId = parts[1].split('?')[0];
        }
      } else if (rawUrl.includes('youtube.com/v/')) {
        const parts = rawUrl.split('youtube.com/v/');
        if (parts[1]) {
          videoId = parts[1].split('?')[0];
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (!videoId && rawUrl.length === 11) {
      videoId = rawUrl; // fallback if just video ID is passed
    }

    // Embed params to restrict exit routes
    // modestybranding=1: hides watch on youtube link in bottom right
    // rel=0: shows recommendations from same channel only
    // disablekb=1: disables hotkeys
    // playsinline=1: enables in-line mobile view
    // fs=0: disables native fullscreen button inside YouTube player
    // controls=1: keeps timeline and volume interface readable but secured
    // cc_load_policy=1: forces captions on for advanced courses
    // cc_load_policy=3: disables forcing captions for beginner courses
    const ccParam = isAdvanced ? 'cc_load_policy=1' : 'cc_load_policy=3';
    return videoId 
      ? `https://www.youtube.com/embed/${videoId}?controls=1&modestbranding=1&rel=0&disablekb=1&playsinline=1&fs=0&${ccParam}`
      : rawUrl;
  };

  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) {
    return (
      <div className="text-center p-8 bg-slate-900 rounded-3xl border border-slate-800 flex flex-col justify-center items-center gap-2 aspect-video">
        <Play className="w-12 h-12 text-slate-500 fill-slate-800" />
        <p className="text-xs font-bold text-slate-400">No lecture video link assigned yet.</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`mx-auto overflow-hidden bg-black relative group transition-all duration-300 w-full select-none ${
        isFullscreen 
          ? 'fixed inset-0 z-[99999] w-full h-full border-none rounded-none' 
          : 'rounded-2xl md:rounded-3xl shadow-2xl border-2 md:border-4 border-slate-200/90 aspect-[9/16] sm:aspect-video'
      }`}
    >
      {/* 1. Seamless YouTube Iframe Embed */}
      <iframe 
        className="absolute top-0 left-0 w-full h-full z-0"
        src={embedUrl}
        title={title}
        frameBorder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen={false}
      ></iframe>

      {/* 2. Custom Native Fullscreen Button */}
      <button 
        type="button"
        onClick={handleFullscreenToggle}
        className="absolute bottom-3 right-4 z-50 p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white transition-all duration-300 opacity-90 hover:opacity-100 hover:scale-105 active:scale-95 focus:outline-none border border-white/15 cursor-pointer flex items-center justify-center shadow-lg"
        title="Toggle Secure Fullscreen"
      >
        {isFullscreen ? <Minimize size={18} className="md:w-5 md:h-5" /> : <Maximize size={18} className="md:w-5 md:h-5 text-white" />}
      </button>

      {/* 3. Secure Top Overlay Layer: Prevents clicking title, share button, and exit links */}
      {/* Covers a generous 30% of height on mobile portrait and 85px/95px on broader viewports to completely mask titles and brand logos */}
      <div className="absolute top-0 left-0 right-0 h-[30%] sm:h-[85px] md:h-[95px] bg-transparent z-40 pointer-events-auto cursor-default" />

      {/* 4. Secure Bottom Overlay Layer: Blocks watermark, YouTube logo, and recommended click-out triggers */}
      {/* Shields the lower 18% of height on mobile portrait and 65px/75px on widescreen models */}
      <div className="absolute bottom-0 left-0 right-0 h-[18%] sm:h-[65px] md:h-[75px] bg-transparent z-40 pointer-events-auto cursor-default" />

      {/* 5. Secure Corner Side Overlays for extra safety (such as options panel anchors & watermark redirects) */}
      <div className="absolute top-[30%] sm:top-[85px] md:top-[95px] right-0 w-[80px] h-[120px] bg-transparent z-40 pointer-events-auto cursor-default" />
      <div className="absolute bottom-[18%] sm:bottom-[65px] md:bottom-[75px] right-0 w-[120px] h-[80px] bg-transparent z-40 pointer-events-auto cursor-default" />
    </div>
  );
}
