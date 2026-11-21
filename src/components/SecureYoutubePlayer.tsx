import React, { useState, useRef, useEffect } from 'react';
import { Maximize, Minimize, Play } from 'lucide-react';

interface SecureYoutubePlayerProps {
  url: string;
  title: string;
  isAdvanced?: boolean;
}

// Official YouTube IFrame Player API loader (shared across all player instances).
// The API script is injected once per page; every player waits on this promise.
let ytApiPromise: Promise<any> | null = null;

function loadYouTubeIframeApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve, reject) => {
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve(w.YT);
    };
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('YouTube IFrame API failed to load'));
      document.head.appendChild(script);
    }
    // If the script tag is already in the page but the API never arrives, fail late.
    setTimeout(() => {
      if (!(w.YT && w.YT.Player)) reject(new Error('YouTube IFrame API timed out'));
    }, 10000);
  });
  return ytApiPromise;
}

export default function SecureYoutubePlayer({ url, title, isAdvanced }: SecureYoutubePlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

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
  const getVideoId = (rawUrl: string): string => {
    if (!rawUrl) return '';
    let videoId = '';
    try {
      if (rawUrl.includes('youtube.com/embed/')) {
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

    return videoId;
  };

  const videoId = getVideoId(url);

  // Embed params to restrict exit routes
  // modestbranding=1: hides watch on youtube link in bottom right
  // rel=0: shows recommendations from same channel only
  // disablekb=1: disables hotkeys
  // playsinline=1: enables in-line mobile view
  // fs=0: disables native fullscreen button inside YouTube player
  // controls=1: keeps timeline and volume interface readable but secured
  // cc_load_policy=1: captions available by default for advanced & masterclass
  // cc_load_policy=0: captions default-off for beginner courses, whose videos
  // already carry subtitles edited into the picture. cc_load_policy alone is
  // only the DEFAULT and YouTube still shows captions when the browser's
  // player preference has them on, so the caption track is switched off
  // programmatically through the IFrame Player API below.
  const buildEmbedUrl = (id: string): string => {
    const ccParam = isAdvanced ? 'cc_load_policy=1&cc_lang_pref=en&hl=en' : 'cc_load_policy=0';
    const originParam = typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
    return `https://www.youtube.com/embed/${id}?controls=1&modestbranding=1&rel=0&disablekb=1&playsinline=1&fs=0&enablejsapi=1${originParam}&${ccParam}`;
  };

  const embedUrl = videoId ? buildEmbedUrl(videoId) : url;

  // Beginner videos already carry their subtitles inside the picture, so switch
  // the YouTube caption track OFF once the player is ready and again when
  // playback starts. Advanced & masterclass keep captions available on purpose.
  const switchCaptionsOff = (player: any) => {
    if (isAdvanced || !player) return;
    try { player.unloadModule('captions'); } catch (e) {}
  };

  // Advanced & masterclass students rely on YouTube's caption track (their
  // videos carry no burned-in subtitles). cc_load_policy=1 is only the DEFAULT
  // and YouTube still honours a remembered "captions off" player preference,
  // so the caption module is switched ON programmatically the same way the
  // beginner track is forced off below.
  const switchCaptionsOn = (player: any) => {
    if (!isAdvanced || !player) return;
    try { player.loadModule('captions'); } catch (e) {}
    // An empty track object clears captions in today's embedded player, so
    // select a real track instead: the English track from the tracklist when
    // YouTube reports one, else an explicit English fallback.
    let track: any = null;
    try {
      const list = player.getOption('captions', 'tracklist') || [];
      track = list.find((t: any) => t && t.languageCode === 'en') || list[0] || null;
    } catch (e) {}
    try { player.setOption('captions', 'track', track || { languageCode: 'en' }); } catch (e) {}
  };

  useEffect(() => {
    if (!videoId || apiFailed) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    loadYouTubeIframeApi()
      .then((YT: any) => {
        if (cancelled || !playerHostRef.current) return;
        // A fresh host element per player: YT replaces it with the iframe.
        const host = document.createElement('div');
        host.id = `yt-player-${Math.random().toString(36).slice(2)}`;
        host.style.width = '100%';
        host.style.height = '100%';
        playerHostRef.current.appendChild(host);

        const player = new YT.Player(host, {
          videoId,
          width: '100%',
          height: '100%',
          title,
          playerVars: {
            controls: 1,
            modestbranding: 1,
            rel: 0,
            disablekb: 1,
            playsinline: 1,
            fs: 0,
            cc_load_policy: isAdvanced ? 1 : 0,
            cc_lang_pref: 'en',
            hl: 'en',
            origin: typeof window !== 'undefined' ? window.location.origin : undefined
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              const iframe = playerHostRef.current?.querySelector('iframe');
              if (iframe) {
                iframe.className = 'absolute top-0 left-0 w-full h-full z-0';
                iframe.setAttribute('title', title);
                iframe.setAttribute('frameBorder', '0');
                iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
                iframe.setAttribute('referrerPolicy', 'strict-origin-when-cross-origin');
              }
              switchCaptionsOff(player);
              switchCaptionsOn(player);
              // Mobile browsers and installed PWAs can hand the embedded player
              // back muted under their autoplay policies even when the student
              // taps play, so force the audio track on wherever we can.
              const unmutePlayer = () => {
                try { player.unMute(); player.setVolume(100); } catch (e) {}
              };
              unmutePlayer();
              containerRef.current?.addEventListener('pointerdown', unmutePlayer, { once: true });
              containerRef.current?.addEventListener('touchend', unmutePlayer, { once: true });
              // One belt-and-braces retry in case the track list lands late.
              retryTimer = setTimeout(() => { switchCaptionsOff(player); switchCaptionsOn(player); }, 3000);
            },
            onStateChange: (event: any) => {
              if (cancelled) return;
              if (event.data === YT.PlayerState.PLAYING) {
                switchCaptionsOff(player);
                switchCaptionsOn(player);
                try { player.unMute(); player.setVolume(100); } catch (e) {}
              }
            }
          }
        });
        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) setApiFailed(true);
      });

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      try { playerRef.current?.destroy?.(); } catch (e) {}
      playerRef.current = null;
    };
  }, [videoId, isAdvanced, apiFailed, title]);

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
          : 'rounded-xl sm:rounded-2xl md:rounded-3xl shadow-md sm:shadow-2xl border-0 sm:border-2 md:border-4 border-slate-200/90 aspect-[9/16] sm:aspect-video'
      }`}
    >
      {/* 1. YouTube player via the official IFrame Player API. When the API
          script cannot load (rare, offline), fall back to the plain iframe. */}
      {apiFailed ? (
        <iframe 
          className="absolute top-0 left-0 w-full h-full z-0"
          src={embedUrl}
          title={title}
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen={false}
        ></iframe>
      ) : (
        <div ref={playerHostRef} className="absolute top-0 left-0 w-full h-full z-0"></div>
      )}

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
