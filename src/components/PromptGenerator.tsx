import React, { useState, useEffect, useRef, useCallback } from 'react';
import { safeStorage } from '../utils/safeStorage';
import { promptsStore } from '../utils/promptsStore';
import staticFullPrompts from '../data/full_prompts.json';
import staticModularPrompts from '../data/modular_prompts.json';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  Play, 
  Pause,
  Eye, 
  Copy, 
  Check, 
  ExternalLink, 
  FileText, 
  Smartphone, 
  Wifi, 
  Battery, 
  ChevronRight,
  ChevronLeft,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Briefcase,
  Tag,
  Globe,
  Maximize2,
  X,
  AlertTriangle,
  RotateCw
} from 'lucide-react';

interface TemplateItem {
  id: string;
  name: string;
  template: string;
  category: string;
  industry?: string;
  imageUrl?: string;
  videoUrl?: string;
  link1?: string;
  link2?: string;
  description?: string;
  type: 'full' | 'modular';
}

interface PreviewFrameProps {
  url: string;
  title?: string;
  height?: string | number;
  onExpand?: () => void;
  expandable?: boolean;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function PreviewFrame({ url, title, height = '100%', onExpand, expandable = true }: PreviewFrameProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [viewMode, setViewMode] = useState<"portal" | "iframe">("portal");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  let iframeSrc = url;
  let isProxied = false;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== window.location.origin) {
      iframeSrc = `/api/proxy?url=${encodeURIComponent(url)}`;
      isProxied = true;
    }
  } catch (e) {
    // Relative URL or invalid url format
  }

  const handleLoad = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus("loaded");
  }, []);

  const startTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      // If it's proxied, we know framing is allowed. We auto-reveal the iframe
      // after 2.5s so slow tracking scripts don't make the user wait infinitely.
      if (isProxied) {
        setStatus("loaded");
      } else {
        setStatus((s) => (s === "loaded" ? s : "failed"));
      }
    }, isProxied ? 2500 : 8000);
  }, [isProxied]);

  const retry = () => {
    setStatus("loading");
    setReloadKey((k) => k + 1);
    startTimeout();
  };

  useEffect(() => {
    setStatus("loading");
    setViewMode(isProxied ? "portal" : "iframe");
    startTimeout();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [url, startTimeout, isProxied]);

  return (
    <div
      style={{
        border: "1px solid #1e293b",
        borderRadius: 14,
        overflow: "hidden",
        background: "#0f172a",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      {/* fake browser chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 12px",
          background: "#1e293b",
          borderBottom: "1px solid #334155",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {["#EF4444", "#F59E0B", "#10B981"].map((c) => (
            <span
              key={c}
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: c,
                opacity: 0.9,
              }}
            />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            fontSize: 11,
            color: "#94a3b8",
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 999,
            padding: "3px 10px",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6
          }}
          title={url}
        >
          {status === "loading" && <RefreshCw size={10} className="animate-spin text-indigo-400" />}
          <span>{getHostname(url)}</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#94a3b8", display: "flex", cursor: "pointer" }}
          title="Open in new tab"
        >
          <ExternalLink size={14} className="hover:text-white transition-colors" />
        </a>
        {expandable && (
          <button
            onClick={onExpand}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              display: "flex",
              padding: 0,
            }}
            title="Expand"
          >
            <Maximize2 size={14} className="hover:text-white transition-colors" />
          </button>
        )}
        
        {/* Sleek browser-style active loading line */}
        {status === "loading" && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse" />
        )}
      </div>

      {/* live embedded site */}
      <div style={{ position: "relative", flex: 1, background: "#0f172a", display: "flex", flexDirection: "column" }}>
        {isProxied && viewMode === "portal" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              textAlign: "center",
              background: "#0f172a",
              color: "#94a3b8"
            }}
          >
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-3 text-indigo-400">
              <Globe size={24} className="animate-pulse" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200 mb-1.5">Secure Workspace Application</h4>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-5">
              This app is hosted on another secure container. For complete access to database operations, sessions, and active assets, view it in a secure top-level tab.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs items-center">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all w-full shadow-lg shadow-indigo-600/10"
              >
                <span>Open in Secure Tab</span>
                <ExternalLink size={13} />
              </a>
              <button
                onClick={() => setViewMode("iframe")}
                className="text-[10px] text-slate-500 hover:text-slate-400 transition-colors underline underline-offset-4"
              >
                Force load inline anyway
              </button>
            </div>
          </div>
        ) : status === "failed" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: 16,
              textAlign: "center",
              background: "#0f172a",
              color: "#94a3b8"
            }}
          >
            <AlertTriangle size={24} className="text-amber-500 animate-pulse" />
            <div style={{ fontSize: 11.5, color: "#cbd5e1", maxWidth: 220, lineHeight: 1.4 }}>
              This site can't be shown inline — it's likely blocking embedded previews.
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button
                onClick={retry}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 10.5,
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: "1px solid #334155",
                  background: "#1e293b",
                  cursor: "pointer",
                  color: "#cbd5e1",
                }}
              >
                <RotateCw size={11} /> Retry
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 10.5,
                  padding: "5px 10px",
                  borderRadius: 999,
                  background: "#6366f1",
                  color: "#fff",
                  textDecoration: "none",
                }}
              >
                Open <ExternalLink size={11} />
              </a>
            </div>
          </div>
        ) : (
          <iframe
            key={reloadKey}
            src={iframeSrc}
            title={title || url}
            onLoad={handleLoad}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              background: "#ffffff",
              opacity: 1, // Keep the iframe visible immediately so the user can see it stream in
            }}
          />
        )}
      </div>
    </div>
  );
}

function CleanVideoPlayer({ url, title, isPlaying }: { url: string; title?: string; isPlaying: boolean }) {
  const getEmbedUrl = (rawUrl: string): string => {
    if (!rawUrl) return '';
    let videoId = '';
    try {
      if (rawUrl.includes('youtube.com/embed/')) {
        return rawUrl;
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
      // ignore
    }

    if (!videoId && rawUrl.length === 11) {
      videoId = rawUrl;
    }

    return videoId 
      ? `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0`
      : rawUrl;
  };

  const isMp4 = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().includes('.mp4?') || url.toLowerCase().endsWith('.webm');
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isMp4 && videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(err => {
          console.log("Auto-play prevented or failed", err);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, isMp4, url]);

  if (isMp4) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center p-0 m-0">
        <video 
          ref={videoRef}
          src={url} 
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-contain rounded-[1.5rem]"
        />
      </div>
    );
  }

  const embedUrl = getEmbedUrl(url);

  return (
    <div className="w-full h-full bg-black relative flex items-center justify-center p-0 m-0 rounded-[1.5rem] overflow-hidden">
      <iframe 
        className="w-full h-full absolute inset-0 border-0"
        src={embedUrl}
        title={title || "Video Preview"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}

interface LiveProjectPreviewProps {
  url: string;
  title?: string;
}

function LiveProjectPreview({ url, title }: LiveProjectPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="w-full h-full p-0 flex flex-col">
        <PreviewFrame
          url={url}
          title={title}
          onExpand={() => setExpanded(true)}
        />
      </div>

      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[999] flex items-center justify-center p-4 md:p-6 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl h-[85vh] relative animate-in zoom-in-95 duration-200 cursor-default"
          >
            <PreviewFrame url={url} title={title} expandable={false} />
            <button
              onClick={() => setExpanded(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 text-white hover:bg-slate-800 border-0 cursor-pointer flex items-center justify-center shadow-lg transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface PromptGeneratorProps {
  isLocked?: boolean;
  hasYearBadge?: boolean;
  onTriggerBadgePurchase?: () => void;
  userProfile?: any;
  setUserProfile?: any;
  currentUser?: any;
  appSettings?: any;
}

export function getPromptResetTimestamps(resetTimeStr: string = '00:00') {
  const nowMs = Date.now();
  // Nigeria is UTC+1, so add 1 hour to UTC to get Nigeria date info
  const ngDate = new Date(nowMs + 3600000); 
  const year = ngDate.getUTCFullYear();
  const month = ngDate.getUTCMonth();
  const date = ngDate.getUTCDate();

  const [hour, minute] = resetTimeStr.split(':').map(Number);
  
  // todayResetUTC is the reset time on the current Nigeria date
  const todayResetUTC = Date.UTC(year, month, date, hour, minute, 0, 0) - 3600000;

  let lastResetTimestamp: number;
  let nextResetTimestamp: number;

  if (nowMs >= todayResetUTC) {
    lastResetTimestamp = todayResetUTC;
    nextResetTimestamp = todayResetUTC + 24 * 60 * 60 * 1000;
  } else {
    lastResetTimestamp = todayResetUTC - 24 * 60 * 60 * 1000;
    nextResetTimestamp = todayResetUTC;
  }

  return {
    lastResetTimestamp,
    nextResetTimestamp,
    nowMs
  };
}

export default function PromptGenerator({ 
  isLocked = false,
  hasYearBadge = false,
  onTriggerBadgePurchase,
  userProfile,
  setUserProfile,
  currentUser,
  appSettings
}: PromptGeneratorProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>(() => {
    const fulls = promptsStore.getFullTemplates();
    const mods = promptsStore.getModularTemplates();
    
    const loaded: TemplateItem[] = [];
    fulls.forEach(t => {
      loaded.push({
        id: t.id,
        name: t.name,
        template: t.template,
        category: (t.category || 'Landing Page').trim(),
        industry: t.industry || 'General',
        imageUrl: t.imageUrl,
        videoUrl: t.videoUrl,
        link1: t.link1,
        link2: t.link2,
        description: t.description || `Full prompt blueprint targeting ${t.industry || 'General'} niches.`,
        type: 'full'
      });
    });
    
    mods.forEach(t => {
      loaded.push({
        id: t.id,
        name: t.name,
        template: t.template,
        category: (t.category || 'Landing Page').trim(),
        industry: t.industry || 'Universal',
        imageUrl: t.imageUrl,
        videoUrl: t.videoUrl,
        link1: t.link1,
        link2: t.link2,
        description: t.description || 'Focused modular segment layout blueprint.',
        type: 'modular'
      });
    });
    
    return loaded;
  });

  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(() => {
    const fulls = templates.filter(x => x.type === 'full');
    if (fulls.length > 0) return fulls[0];
    if (templates.length > 0) return templates[0];
    return null;
  });
  
  // Student dashboard active tab for full blueprints or modular suggestions
  const [activeTab, setActiveTab] = useState<'full' | 'modular'>('full');

  // Category filter state on the student portal
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Interaction states for the mock phone screen
  const [isShowingLinkPreview, setIsShowingLinkPreview] = useState(false);
  const [isShowingText, setIsShowingText] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const previewLink = selectedTemplate?.videoUrl || selectedTemplate?.link1 || selectedTemplate?.link2;

  useEffect(() => {
    const unsubscribe = promptsStore.subscribe((data) => {
      const loaded: TemplateItem[] = [];
      data.fullTemplates.forEach(t => {
        loaded.push({
          id: t.id,
          name: t.name,
          template: t.template,
          category: (t.category || 'Landing Page').trim(),
          industry: t.industry || 'General',
          imageUrl: t.imageUrl,
          videoUrl: t.videoUrl,
          link1: t.link1,
          link2: t.link2,
          description: t.description || `Full prompt blueprint targeting ${t.industry || 'General'} niches.`,
          type: 'full'
        });
      });
      
      data.modularTemplates.forEach(t => {
        loaded.push({
          id: t.id,
          name: t.name,
          template: t.template,
          category: (t.category || 'Landing Page').trim(),
          industry: t.industry || 'Universal',
          imageUrl: t.imageUrl,
          videoUrl: t.videoUrl,
          link1: t.link1,
          link2: t.link2,
          description: t.description || 'Focused modular segment layout blueprint.',
          type: 'modular'
        });
      });
      
      setTemplates(loaded);
    });

    // Fetch latest updates from the server disk storage
    promptsStore.loadFromServer().catch(err => {
      console.warn("Failed to update templates from server on mount:", err);
    });

    return () => unsubscribe();
  }, []);

  // Filter templates list based on type (activeTab)
  const currentTabTemplates = templates.filter(t => t.type === activeTab);

  // Extract list of all unique categories present dynamically across all templates to guarantee visibility
  const dynamicCategories = ['All', ...Array.from(new Set(currentTabTemplates.map(t => t.category?.trim()).filter(Boolean)))];

  // Filter templates list based on category filter
  const filteredTemplates = selectedCategory === 'All'
    ? currentTabTemplates
    : currentTabTemplates.filter(t => t.category?.trim() === selectedCategory);

  // Pro copy limit tracking
  const resetTimeStr = appSettings?.promptLimitResetTime || '00:00';
  const { lastResetTimestamp } = getPromptResetTimestamps(resetTimeStr);
  const rawCopies = Array.isArray(userProfile?.promptCopies) ? userProfile.promptCopies : [];
  const currentDayCopies = rawCopies.filter((t: number) => t >= lastResetTimestamp);
  const remainingCopies = Math.max(0, 3 - currentDayCopies.length);
  const hasExceededLimit = currentDayCopies.length >= 3;

  // Check if currently selected template is among the first 3 templates in currentTabTemplates (free for everyone)
  const selectedTemplateIndexInTab = currentTabTemplates.findIndex(t => t.id === selectedTemplate?.id);
  const isFreeTemplate = selectedTemplateIndexInTab >= 0 && selectedTemplateIndexInTab < 3;

  // Synchronize selection when tabs, category, or templates change
  useEffect(() => {
    if (filteredTemplates.length > 0) {
      const match = filteredTemplates.find(t => t.id === selectedTemplate?.id);
      if (match) {
        // Update selectedTemplate to the latest object version from filteredTemplates to show live edits!
        setSelectedTemplate(match);
      } else {
        setSelectedTemplate(filteredTemplates[0]);
      }
    } else {
      setSelectedTemplate(null);
    }
  }, [selectedCategory, activeTab, templates]);

  // Handle template selection
  const handleSelectTemplate = (tpl: TemplateItem) => {
    setSelectedTemplate(tpl);
    setIsShowingLinkPreview(false);
    setIsShowingText(false);
  };

  // Cycle navigation - Prev (Left Swipe)
  const handlePrevTemplate = () => {
    if (filteredTemplates.length <= 1) return;
    const currIdx = filteredTemplates.findIndex(t => t.id === selectedTemplate?.id);
    const prevIdx = currIdx <= 0 ? filteredTemplates.length - 1 : currIdx - 1;
    handleSelectTemplate(filteredTemplates[prevIdx]);
  };

  // Cycle navigation - Next (Right Swipe)
  const handleNextTemplate = () => {
    if (filteredTemplates.length <= 1) return;
    const currIdx = filteredTemplates.findIndex(t => t.id === selectedTemplate?.id);
    const nextIdx = currIdx === -1 || currIdx === filteredTemplates.length - 1 ? 0 : currIdx + 1;
    handleSelectTemplate(filteredTemplates[nextIdx]);
  };

  // Toggle showcase link preview
  const handleToggleLinkPreview = () => {
    if (!previewLink) {
      alert("No showcase link attached to this template blueprint.");
      return;
    }
    setIsShowingText(false);
    setIsShowingLinkPreview(!isShowingLinkPreview);
  };

  // Copy template text to clipboard
  const handleCopyText = async () => {
    if (!selectedTemplate) return;

    // Safety check: basic members can copy if it's a free template (first 3) OR if they have a year badge
    if (!hasYearBadge && !isFreeTemplate) {
      if (onTriggerBadgePurchase) {
        onTriggerBadgePurchase();
      } else {
        alert("Please request your badge to unlock copying for premium templates.");
      }
      return;
    }

    // Limit check for pro members
    if (currentDayCopies.length >= 3) {
      alert(`⚠️ You have reached your daily copy limit of 3 prompts. It will reset at ${resetTimeStr}.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedTemplate.template);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);

      // Track the copy in Parent State synchronously, then update Firestore in background
      const now = Date.now();
      const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;
      const filteredOldCopies = rawCopies.filter((t: number) => t >= fortyEightHoursAgo);
      const updatedCopies = [...filteredOldCopies, now];

      if (setUserProfile) {
        setUserProfile((prev: any) => {
          const updated = {
            ...prev,
            promptCopies: updatedCopies
          };
          safeStorage.setItem('ciya_cached_profile', JSON.stringify(updated));
          return updated;
        });
      }

      if (currentUser?.uid) {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          promptCopies: updatedCopies
        });
      }
    } catch (err) {
      console.error("Failed to copy template prompt:", err);
    }
  };

  if (isLocked) {
    return (
      <div className="p-10 border border-slate-200 rounded-3xl bg-slate-50 text-center text-slate-500 font-sans">
        <Smartphone className="w-16 h-16 text-slate-300 mx-auto mb-4 animate-pulse" />
        <h3 className="text-xl font-black text-slate-800">Prompt Templates Vault</h3>
        <p className="text-sm mt-2 max-w-md mx-auto">This terminal is currently locked until progress milestones are met.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white border border-slate-100 rounded-3xl min-h-[500px] font-sans">
        <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mb-6" />
        <p className="text-lg font-black text-slate-700">Connecting to Prompt Templates Vault...</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white border border-slate-100 rounded-3xl min-h-[500px] font-sans">
        <FolderOpen className="w-16 h-16 text-slate-300 mb-6" />
        <h3 className="text-xl font-black text-slate-800">No Custom Templates Available</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md text-center leading-relaxed">
          Coaches haven't registered any prompt templates in the workspace yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden p-8 md:p-10 font-sans">
      <div className="flex flex-col lg:flex-row gap-10 items-start">
        
        {/* Left column: Template Directory */}
        <div className="w-full lg:w-1/2 flex flex-col gap-6 text-left">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-1.5 px-3 rounded-full text-xs font-black uppercase bg-indigo-50 border border-indigo-150 text-indigo-700 tracking-wider">
                Academy Prompt Templates
              </span>
              <span className="text-sm font-bold text-slate-400">
                {currentTabTemplates.length} of {templates.length} templates available
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Prompt Templates Directory</h2>
            <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed mt-2">
              Interact with custom layout structures developed by coaches. Select a template below, cycle through them using the arrow buttons on both sides of the screen simulator, and copy the production prompt text directly!
            </p>
          </div>

          {/* TAB SELECTORS - FULL VS MODULAR */}
          <div className="flex border-b border-slate-200 gap-3 mt-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('full');
                setSelectedCategory('All');
              }}
              className={`pb-3.5 px-5 text-sm md:text-base font-black border-b-2 cursor-pointer transition-all outline-none border-0 ${
                activeTab === 'full' 
                  ? 'border-indigo-600 text-indigo-600 font-black' 
                  : 'border-transparent text-slate-400 hover:text-slate-650'
              }`}
            >
              🌐 Full Templates
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('modular');
                setSelectedCategory('All');
              }}
              className={`pb-3.5 px-5 text-sm md:text-base font-black border-b-2 cursor-pointer transition-all outline-none border-0 ${
                activeTab === 'modular' 
                  ? 'border-indigo-600 text-indigo-600 font-black' 
                  : 'border-transparent text-slate-400 hover:text-slate-650'
              }`}
            >
              ✨ Modular Templates
            </button>
          </div>

          {/* DYNAMIC CATEGORY FILTER BAR */}
          <div className="space-y-2.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-150">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">
                📁 Filter Category:
              </span>
              <span className="text-indigo-700 bg-indigo-100/80 px-3 py-1 rounded-full text-xs font-black">
                {selectedCategory}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-1.5 mt-2">
              {dynamicCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-black border-0 uppercase cursor-pointer transition-all ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-200/70 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* TEMPLATE LISTED AT THE TOP - ONLY ONE FOCUS CARD WITH SELECT DROPDOWN */}
          {filteredTemplates.length > 0 ? (
            <div className="space-y-5">
              
              {/* DROPDOWN SELECTOR BLOCK */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-3 border border-slate-800">
                {/* Dropdown Selector */}
                <div className="flex-1 min-w-0 flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-extrabold mb-1.5">
                    Select Prompt Template ({filteredTemplates.length} available)
                  </span>
                  <select
                    value={selectedTemplate?.id || ''}
                    onChange={(e) => {
                      const found = filteredTemplates.find(t => t.id === e.target.value);
                      if (found) handleSelectTemplate(found);
                    }}
                    className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-2.5 outline-none text-xs md:text-sm font-black cursor-pointer text-center truncate focus:border-indigo-500 transition-all"
                  >
                    {filteredTemplates.map((tpl) => {
                      const tabIdx = currentTabTemplates.findIndex(t => t.id === tpl.id);
                      const isFree = tabIdx >= 0 && tabIdx < 3;
                      return (
                        <option key={tpl.id} value={tpl.id} className="bg-slate-900 text-white text-xs md:text-sm font-semibold text-left">
                          {isFree ? `🌟 ${tpl.name} (Free Access)` : tpl.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* SINGLE LISTING COMPONENT DISPLAY */}
              {selectedTemplate && (
                <div className="p-6 md:p-8 rounded-2xl border-2 border-indigo-100 bg-indigo-50/10 hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between gap-5 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-indigo-50/50 pb-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-700">
                          {selectedTemplate.category}
                        </span>
                        {isFreeTemplate ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold">
                            🌟 Free Access Template
                          </span>
                        ) : (
                          !hasYearBadge && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              🔒 Badge Required
                            </span>
                          )
                        )}
                        {selectedTemplate.industry && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                            <Briefcase className="w-3.5 h-3.5" /> {selectedTemplate.industry}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-indigo-500 font-extrabold font-mono">
                        Template {filteredTemplates.findIndex(t => t.id === selectedTemplate.id) + 1} of {filteredTemplates.length}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-lg md:text-xl leading-snug tracking-tight">
                      {selectedTemplate.name}
                    </h4>

                    <p className="text-sm md:text-base text-slate-650 font-semibold leading-relaxed">
                      {selectedTemplate.description}
                    </p>
                  </div>

                  {/* COOPERATIVE RESOURCES FOR HIGHLIGHTED CARD */}
                  {(selectedTemplate.link1 || selectedTemplate.link2) && (
                    <div className="pt-4.5 border-t border-slate-200 space-y-3 text-left">
                      <h5 className="font-black text-indigo-900 flex items-center gap-1.5 uppercase text-xs tracking-wider">
                        <ExternalLink className="w-4 h-4 text-indigo-500" /> Coached Reference Resources
                      </h5>
                      <div className="flex flex-col gap-2 font-sans">
                        {selectedTemplate.link1 && (
                          <a
                            href={selectedTemplate.link1}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-3.5 bg-white hover:bg-indigo-50 border border-indigo-100 text-indigo-700 font-black rounded-xl transition-all cursor-pointer text-xs md:text-sm"
                          >
                            <span className="truncate pr-4">Reference Attachment A</span>
                            <ChevronRight className="w-4 h-4 shrink-0" />
                          </a>
                        )}
                        {selectedTemplate.link2 && (
                          <a
                            href={selectedTemplate.link2}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-3.5 bg-white hover:bg-indigo-50 border border-indigo-100 text-indigo-700 font-black rounded-xl transition-all cursor-pointer text-xs md:text-sm"
                          >
                            <span className="truncate pr-4">Reference Attachment B</span>
                            <ChevronRight className="w-4 h-4 shrink-0" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="text-center p-16 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No template prompts found matching this category.
            </div>
          )}

        </div>

        {/* Right column: Device Simulator with Left & Right navigation arrows directly on the sides */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center">
          
          {/* CONTAINER HOLDING THE SIMULATOR IMAGE AND ARROWS SIDE-BY-SIDE */}
          <div className="relative flex items-center justify-center gap-4 md:gap-6 w-full max-w-md">
            
            {/* Left swipe button next to the simulator screen */}
            <button
              type="button"
              onClick={handlePrevTemplate}
              disabled={filteredTemplates.length <= 1}
              className={`p-3 md:p-4 rounded-full border transition-all duration-200 shrink-0 ${
                filteredTemplates.length > 1
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-lg cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
              title="Previous Template"
            >
              <ChevronLeft className={`w-5 h-5 md:w-6 md:h-6 stroke-[3] ${filteredTemplates.length > 1 ? 'text-white' : 'text-slate-400'}`} />
            </button>

            {/* ANDROID DEVICE SIMULATOR CONTAINER */}
            <div className="relative rounded-[3.2rem] p-[10px] bg-slate-950 shadow-2xl border-[12px] border-slate-900 w-[290px] h-[550px] flex flex-col overflow-hidden shrink-0">
              
              {/* Top camera Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-900 rounded-b-2xl z-30 flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-800 rounded-full mb-1"></div>
              </div>

              {/* Inner screen area */}
              <div className="relative flex-1 bg-slate-900 rounded-[2.3rem] overflow-hidden flex flex-col text-left">
                
                {/* Android Mock Status Bar */}
                <div className="h-6 px-5 pt-1.5 flex items-center justify-between text-[9px] text-slate-300 font-mono z-20 select-none bg-slate-900/60 backdrop-blur-sm">
                  <span>12:45 PM</span>
                  <div className="flex items-center gap-1">
                    <Wifi className="w-2.5 h-2.5" />
                    <span className="font-sans text-[8px] font-bold">5G</span>
                    <Battery className="w-3 h-3" />
                  </div>
                </div>

                {/* Main screen views */}
                <div className="flex-1 relative w-full h-full flex flex-col">
                  
                  {/* VIEW 1: TEXT TEMPLATE MODE (Activated by Open button) */}
                  {isShowingText ? (
                    (!hasYearBadge && !isFreeTemplate) ? (
                      <div className="absolute inset-0 bg-slate-950 p-6 pt-12 flex flex-col items-center justify-center text-center text-white z-10 animate-in fade-in duration-300">
                        <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-5 text-amber-400 border border-amber-500/20">
                          <Sparkles className="w-7 h-7 animate-pulse" />
                        </div>
                        
                        <h3 className="text-sm font-black text-white uppercase tracking-wider leading-snug">
                          Membership Badge Required
                        </h3>
                        
                        <p className="text-[10px] text-slate-400 mt-2.5 leading-relaxed max-w-[190px] mx-auto font-medium">
                          The first 3 prompt templates are free for everyone! Full access to all remaining prompt blueprints requires a CIYA Pro Badge.
                        </p>

                        <div className="mt-6 w-full max-w-[200px] space-y-2">
                          <button
                            onClick={onTriggerBadgePurchase}
                            className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-[11px] uppercase rounded-xl shadow-lg shadow-amber-500/10 transition-all border-0 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                          >
                            <span>Get My Badge Now 🏷️</span>
                          </button>
                          
                          <button
                            onClick={() => setIsShowingText(false)}
                            className="w-full py-1.5 text-[10px] text-slate-500 hover:text-slate-400 transition-colors bg-transparent border-0 cursor-pointer underline underline-offset-4"
                          >
                            Go Back to Mockup Image
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-slate-950 p-4 pt-8 flex flex-col justify-between z-10 text-white animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex-1 overflow-y-auto pr-1 space-y-3 pt-2">
                          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-2">
                            <FileText className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="font-extrabold text-[10px] tracking-wider uppercase text-slate-400">Prompt Template Body</span>
                          </div>
                          <p className="font-mono text-[10px] md:text-xs leading-relaxed text-slate-300 whitespace-pre-wrap select-text selection:bg-indigo-600">
                            {selectedTemplate?.template}
                          </p>
                        </div>

                        {/* Copy Prompt triggers with tracking */}
                        <div className="pt-3 border-t border-slate-900 bg-slate-950 space-y-2">
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold px-1 uppercase tracking-wider">
                            <span>Daily Copy Tracker</span>
                            <span className={hasExceededLimit ? "text-rose-400 font-extrabold" : "text-emerald-400 font-extrabold"}>
                              {remainingCopies} / 3 left today
                            </span>
                          </div>

                          <button
                            onClick={handleCopyText}
                            disabled={hasExceededLimit && !copySuccess}
                            className={`w-full py-2.5 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all border-0 ${
                              copySuccess 
                                ? 'bg-green-600 text-white' 
                                : hasExceededLimit
                                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-900/30'
                            }`}
                          >
                            {copySuccess ? 'Copied to clipboard!' : hasExceededLimit ? 'Limit Reached' : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy Prompt Text
                              </>
                            )}
                          </button>

                          {hasExceededLimit && (
                            <p className="text-[9px] text-slate-500 text-center italic leading-relaxed mt-1">
                              Your copy limit resets today at {resetTimeStr} (Nigeria Time).
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  ) : null}

                  {/* VIEW 2: EMBEDDED LINK PREVIEW */}
                  {previewLink && selectedTemplate?.videoUrl === previewLink ? (
                    <div className={`absolute inset-0 bg-slate-950 p-0 flex flex-col z-[15] pt-8 ${isShowingLinkPreview ? 'flex' : 'hidden'}`}>
                      <CleanVideoPlayer url={previewLink} title={selectedTemplate?.name} isPlaying={isShowingLinkPreview} />
                    </div>
                  ) : (
                    isShowingLinkPreview && previewLink ? (
                      <div className="absolute inset-0 bg-slate-950 p-0 flex flex-col z-[15] pt-8 animate-in fade-in duration-300">
                        <LiveProjectPreview url={previewLink} title={selectedTemplate?.name || "Showcase Live Preview"} />
                      </div>
                    ) : null
                  )}

                  {/* VIEW 3: IMAGE ATTACHMENT VIEW */}
                  {!isShowingText && (!isShowingLinkPreview || !previewLink) && (
                    <div className="absolute inset-0 w-full h-full">
                      {selectedTemplate?.imageUrl ? (
                        <img
                          src={selectedTemplate.imageUrl}
                          alt={selectedTemplate.name}
                          className="w-full h-full object-cover animate-in fade-in duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        // Custom wireframe visual placeholder when no image is uploaded
                        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3 select-none pt-12 animate-in fade-in duration-300">
                          <div className="p-3 bg-slate-850 border border-slate-750 text-slate-300 rounded-2xl">
                            <Smartphone className="w-6 h-6 text-indigo-400" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                              Template Mockup
                            </span>
                            <h4 className="font-extrabold text-white text-xs mt-1">
                              {selectedTemplate?.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 leading-normal mt-1 max-w-[180px] mx-auto">
                              No layout mockup attached. Click "Open" to inspect prompt templates or "Live Preview" if a live site showcase is available.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
                
              </div>

              {/* Simulated Android home bar */}
              <div className="h-2 w-28 bg-slate-800 rounded-full mx-auto my-1.5 z-20"></div>

            </div>

            {/* Right swipe button next to the simulator screen */}
            <button
              type="button"
              onClick={handleNextTemplate}
              disabled={filteredTemplates.length <= 1}
              className={`p-3 md:p-4 rounded-full border transition-all duration-200 shrink-0 ${
                filteredTemplates.length > 1
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-lg cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
              title="Next Template"
            >
              <ChevronRight className={`w-5 h-5 md:w-6 md:h-6 stroke-[3] ${filteredTemplates.length > 1 ? 'text-white' : 'text-slate-400'}`} />
            </button>

          </div>

          {/* TWO BUTTONS DIRECTLY BELOW MOCK PHONE */}
          <div className="mt-6 w-[290px] grid grid-cols-2 gap-4">
            {/* Live Preview Button */}
            <button
              onClick={handleToggleLinkPreview}
              disabled={!previewLink}
              className={`py-3.5 rounded-2xl border-0 font-extrabold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                previewLink 
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer active:scale-95' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              title={previewLink ? "Toggle prompt mockup preview" : "No showcase link attached"}
            >
              {isShowingLinkPreview ? (
                <>
                  <Play className="w-4 h-4" /> Hide
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Preview
                </>
              )}
            </button>

            {/* Open Button */}
            <button
              onClick={() => {
                setIsShowingLinkPreview(false);
                setIsShowingText(!isShowingText);
              }}
              className={`py-3.5 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95 border-0 ${
                isShowingText 
                  ? 'bg-slate-900 hover:bg-slate-800 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Eye className="w-4 h-4" /> {isShowingText ? 'Show Image' : 'Open'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
