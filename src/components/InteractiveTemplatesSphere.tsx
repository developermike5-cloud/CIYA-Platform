import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Play, 
  Maximize2, 
  ExternalLink, 
  Globe, 
  Briefcase, 
  Sparkles, 
  Laptop, 
  Smartphone,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import staticFullPrompts from '../data/full_prompts.json';

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  industry?: string;
  imageUrl?: string;
  videoUrl?: string;
  link1?: string;
  link2?: string;
  description?: string;
}

// 3D Point on Sphere
interface Point3D {
  x: number;
  y: number;
  z: number;
  template: TemplateItem;
}

export default function InteractiveTemplatesSphere() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  // 3D rotation angles (rotX and rotY are fully controllable by drag/touch, with automatic horizontal spinning)
  const [rotX, setRotX] = useState(0.15);
  const [rotY, setRotY] = useState(0.5);
  
  // Dragging states
  const isDragging = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const lastRotX = useRef(0.15);
  const lastRotY = useRef(0.5);
  const requestRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Custom sphere dimensions based on responsiveness (larger sizes)
  const [sphereRadius, setSphereRadius] = useState(280);

  // Load templates on mount
  useEffect(() => {
    if (staticFullPrompts && Array.isArray(staticFullPrompts.templates)) {
      setTemplates(staticFullPrompts.templates);
    }
  }, []);

  // Handle hiding header/navbar when modal popup is open
  useEffect(() => {
    if (selectedTemplate) {
      document.body.classList.add('template-modal-open');
    } else {
      document.body.classList.remove('template-modal-open');
    }
    return () => {
      document.body.classList.remove('template-modal-open');
    };
  }, [selectedTemplate]);

  // Update radius depending on screen width (larger size)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setSphereRadius(140);
      } else if (window.innerWidth < 1024) {
        setSphereRadius(210);
      } else {
        setSphereRadius(280);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Slowly rotate the sphere when not dragging and not hovering (increased speed, purely horizontal 360 rotation)
  useEffect(() => {
    const animate = () => {
      if (!isDragging.current && hoveredId === null && !selectedTemplate) {
        setRotY(prev => prev + 0.0095);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [hoveredId, selectedTemplate]);

  // Next and Previous handlers for swiping/clicking through
  const handlePrevTemplate = useCallback(() => {
    if (!selectedTemplate || templates.length === 0) return;
    const currentIndex = templates.findIndex(t => t.id === selectedTemplate.id);
    const prevIndex = (currentIndex - 1 + templates.length) % templates.length;
    setSelectedTemplate(templates[prevIndex]);
  }, [selectedTemplate, templates]);

  const handleNextTemplate = useCallback(() => {
    if (!selectedTemplate || templates.length === 0) return;
    const currentIndex = templates.findIndex(t => t.id === selectedTemplate.id);
    const nextIndex = (currentIndex + 1) % templates.length;
    setSelectedTemplate(templates[nextIndex]);
  }, [selectedTemplate, templates]);

  // Keyboard navigation for active modal view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedTemplate) return;
      if (e.key === 'ArrowLeft') {
        handlePrevTemplate();
      } else if (e.key === 'ArrowRight') {
        handleNextTemplate();
      } else if (e.key === 'Escape') {
        setSelectedTemplate(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTemplate, handlePrevTemplate, handleNextTemplate]);

  // Drag interaction handlers (unrestricted 360-degree rotation vertically and horizontally)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startMouse.current = { x: e.clientX, y: e.clientY };
    lastRotX.current = rotX;
    lastRotY.current = rotY;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - startMouse.current.x;
    const deltaY = e.clientY - startMouse.current.y;
    
    // Scale factor for rotation speed
    const sensitivity = 0.005;
    setRotY(lastRotY.current + deltaX * sensitivity);
    setRotX(Math.max(-1.4, Math.min(1.4, lastRotX.current - deltaY * sensitivity)));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Touch controls for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    isDragging.current = true;
    const touch = e.touches[0];
    startMouse.current = { x: touch.clientX, y: touch.clientY };
    lastRotX.current = rotX;
    lastRotY.current = rotY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || e.touches.length === 0) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    const touch = e.touches[0];
    const deltaX = touch.clientX - startMouse.current.x;
    const deltaY = touch.clientY - startMouse.current.y;
    
    const sensitivity = 0.007;
    setRotY(lastRotY.current + deltaX * sensitivity);
    setRotX(Math.max(-1.4, Math.min(1.4, lastRotX.current - deltaY * sensitivity)));
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  // Compute 3D points distributed evenly on the sphere (Fibonacci lattice)
  const getProjectedPoints = (): Point3D[] => {
    const points: Point3D[] = [];
    const N = templates.length;
    if (N === 0) return [];

    const goldenRatio = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < N; i++) {
      const template = templates[i];
      
      // Coordinate y from 1 to -1
      const y = 1 - (i / (N - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = i * goldenRatio;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      // Apply initial coordinates scaled by radius
      let px = x * sphereRadius;
      let py = y * sphereRadius;
      let pz = z * sphereRadius;

      // Apply 3D Rotation around X axis
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const r1y = py * cosX - pz * sinX;
      const r1z = py * sinX + pz * cosX;

      // Apply 3D Rotation around Y axis
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const r2x = px * cosY + r1z * sinY;
      const r2z = -px * sinY + r1z * cosY;

      points.push({
        x: r2x,
        y: r1y,
        z: r2z,
        template
      });
    }

    return points;
  };

  const projectedPoints = getProjectedPoints();

  return (
    <section className="relative z-10 py-24 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-teal-950 via-slate-950 to-teal-950 border-t border-teal-900 overflow-hidden flex flex-col items-center">
      
      {/* Decorative Glowing Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[600px] md:h-[600px] bg-teal-500/5 rounded-full blur-[140px] -z-10 pointer-events-none" />
      <div className="absolute top-12 left-12 w-[180px] h-[180px] bg-amber-500/5 rounded-full blur-[80px] -z-10 pointer-events-none" />

      {/* Grid background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#115e59_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none -z-10" />

      {/* Header text */}
      <div className="max-w-4xl text-center mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-900/50 border border-teal-800 text-xs font-semibold text-amber-400 backdrop-blur-sm shadow-sm">
          <Sparkles className="w-3.5 h-3.5 fill-amber-400" />
          Interactive 3D Workspace
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-teal-50 tracking-tight leading-tight">
          Explore Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400">Past Cohort Web Design Blueprints</span>
        </h2>
        <p className="text-teal-200/80 text-sm md:text-base max-w-2xl mx-auto leading-relaxed font-semibold">
          Join the next cohort to begin building tools that will make you cool money
        </p>
      </div>

      {/* 3D Sphere Stage (Larger sizes on desktop/tablet) */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full max-w-[850px] h-[380px] sm:h-[540px] md:h-[650px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none"
      >
        {/* Sphere Center glow */}
        <div className="absolute w-44 h-44 rounded-full bg-teal-400/10 blur-[60px] pointer-events-none" />

        {/* Outer orbital rings for aesthetics */}
        <div className="absolute w-[300px] h-[300px] sm:w-[460px] sm:h-[460px] md:w-[560px] md:h-[560px] rounded-full border border-teal-500/15 pointer-events-none rotate-12" />
        <div className="absolute w-[300px] h-[300px] sm:w-[460px] sm:h-[460px] md:w-[560px] md:h-[560px] rounded-full border border-amber-500/10 pointer-events-none -rotate-12" />

        {/* Projected 3D Faces */}
        {projectedPoints.map((point, index) => {
          const { x, y, z, template } = point;
          
          // Calculate scale & opacity based on Z coordinate (depth)
          // Z ranges from -sphereRadius to +sphereRadius
          const minScale = 0.55;
          const maxScale = 1.15;
          const pctZ = (z + sphereRadius) / (2 * sphereRadius); // 0 (back) to 1 (front)
          const scale = minScale + (maxScale - minScale) * pctZ;
          const opacity = 0.12 + 0.88 * pctZ;
          
          // Elements in the front have higher zIndex
          const zIndex = Math.round((z + sphereRadius) * 2);

          const isHovered = hoveredId === template.id;

          // Category Badge Colors
          const getCategoryColor = (cat: string) => {
            const normalized = cat.toLowerCase();
            if (normalized.includes('ecommerce')) return 'bg-pink-500/90 text-white';
            if (normalized.includes('landing')) return 'bg-cyan-500/90 text-white';
            return 'bg-amber-500/90 text-slate-950';
          };

          return (
            <div
              key={template.id}
              className="absolute transition-shadow duration-300"
              style={{
                transform: `translate3d(${x}px, ${y}px, 0px) scale(${isHovered ? scale * 1.15 : scale})`,
                opacity: isHovered ? 1 : opacity,
                zIndex: isHovered ? 9999 : zIndex,
              }}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setSelectedTemplate(template)}
            >
              {/* Thumbnail Card (Larger sized cards) */}
              <div 
                className={`relative w-[75px] h-[42px] sm:w-[110px] sm:h-[62px] md:w-[130px] md:h-[73px] rounded-[6px] sm:rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ${
                  isHovered 
                    ? 'ring-2 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-110' 
                    : 'border border-teal-500/40 shadow-md'
                }`}
              >
                {/* Image layer */}
                {template.imageUrl ? (
                  <img
                    src={template.imageUrl}
                    alt={template.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    draggable="false"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-400">
                    <Laptop className="w-4 h-4" />
                  </div>
                )}

                {/* Shimmer Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite] pointer-events-none" />

                {/* Floating Micro-Badge */}
                <div className="absolute bottom-0 left-0 right-0 p-0.5 sm:p-1 bg-slate-950/85 backdrop-blur-[2px] border-t border-white/5 text-[5px] sm:text-[8px] font-black truncate text-center text-teal-100">
                  {template.name}
                </div>
              </div>

              {/* Hover tooltip */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900/95 border border-slate-750 text-white rounded-lg shadow-xl text-[9px] sm:text-xs font-black whitespace-nowrap z-[1000] flex items-center gap-1.5 pointer-events-none"
                  >
                    <span className="truncate max-w-[120px]">{template.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[7px] uppercase font-bold ${getCategoryColor(template.category)}`}>
                      {template.category}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Swipe Instruction for mobile */}
      <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-teal-400/70 select-none">
        <Info size={13} />
        <span>Drag to rotate, click/tap to view live blueprints & swipe through</span>
      </div>

      {/* Live Preview Modal (Extremely high z-index to overlay perfectly over sphere elements) */}
      <AnimatePresence>
        {selectedTemplate && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
            
            {/* Previous Button Left edge of screen */}
            <button
              onClick={handlePrevTemplate}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-800 hover:border-teal-500 cursor-pointer flex items-center justify-center shadow-2xl transition-all z-[100000] hover:scale-110 active:scale-95 group"
              title="Previous Template (Left Arrow)"
            >
              <ChevronLeft size={24} className="group-hover:text-teal-400 transition-colors" />
            </button>

            {/* Next Button Right edge of screen */}
            <button
              onClick={handleNextTemplate}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-800 hover:border-teal-500 cursor-pointer flex items-center justify-center shadow-2xl transition-all z-[100000] hover:scale-110 active:scale-95 group"
              title="Next Template (Right Arrow)"
            >
              <ChevronRight size={24} className="group-hover:text-teal-400 transition-colors" />
            </button>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col h-[88vh] md:h-[82vh] relative"
            >
              
              {/* Top Column: Information Pane (Now on top on all screens, let description go up) */}
              <div className="w-full p-6 md:p-8 border-b border-slate-800 bg-slate-900/95 overflow-y-auto h-[40%] md:h-[30%] text-left">
                
                {/* Header and Details in a responsive side-by-side grid on desktop to maximize horizontal space */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        selectedTemplate.category.toLowerCase().includes('ecommerce') 
                          ? 'bg-pink-500/10 border border-pink-500/20 text-pink-400' 
                          : selectedTemplate.category.toLowerCase().includes('landing')
                          ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                          : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                      }`}>
                        {selectedTemplate.category}
                      </span>
                      
                      {selectedTemplate.industry && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          <Briefcase className="w-3 h-3" /> {selectedTemplate.industry}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-snug">
                      {selectedTemplate.name}
                    </h3>

                    <p className="text-slate-400 text-xs md:text-sm leading-relaxed font-medium">
                      This custom template demonstrates production-ready styling, responsive layout composition, elegant typographic scales, and optimized performance guidelines modeled from modern high-converting websites.
                    </p>
                  </div>

                  <div className="flex flex-col justify-between h-full space-y-4">
                    {/* Additional details list */}
                    <div className="border-t border-b border-slate-800/80 py-3 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-500">Responsive Ready</span>
                        <span className="font-black text-teal-400 flex items-center gap-1">
                          <Smartphone size={13} /> Mobile & Desktop
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-500">Interactive Animations</span>
                        <span className="font-black text-amber-400">Yes (Framer Motion)</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-500">Design Framework</span>
                        <span className="font-black text-white">Tailwind CSS</span>
                      </div>
                    </div>

                    {/* Controls & External Links */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
                      {(selectedTemplate.link1 || selectedTemplate.link2) && (
                        <div className="flex gap-2 flex-1 w-full">
                          {selectedTemplate.link1 && (
                            <a
                              href={selectedTemplate.link1}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-between px-3 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                            >
                              <span className="truncate">Reference URL A</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                          {selectedTemplate.link2 && (
                            <a
                              href={selectedTemplate.link2}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-between px-3 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                            >
                              <span className="truncate">Reference URL B</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => setSelectedTemplate(null)}
                        className="w-full sm:w-auto px-6 py-2 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-teal-900/25 border-0"
                      >
                        Return to Showcase
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Column: Visual Showcase (Now at the bottom on all screens, with higher length/width) */}
              <div className="w-full bg-black relative flex items-center justify-center overflow-hidden h-[60%] md:h-[70%] group">
                {selectedTemplate.videoUrl ? (
                  <video
                    key={selectedTemplate.id} // force reload video component when template changes
                    src={selectedTemplate.videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : selectedTemplate.imageUrl ? (
                  <img
                    src={selectedTemplate.imageUrl}
                    alt={selectedTemplate.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                    <Laptop className="w-12 h-12 text-teal-500" />
                    <span className="text-xs">No screenshot or recording available.</span>
                  </div>
                )}
              </div>

              {/* Close Button top corner */}
              <button
                onClick={() => setSelectedTemplate(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-0 cursor-pointer flex items-center justify-center shadow-lg transition-colors z-[100001]"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
