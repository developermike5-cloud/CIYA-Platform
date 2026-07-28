import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router';
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
  ChevronRight,
  RotateCw,
  Sliders,
  MousePointerClick,
  Monitor,
  ArrowRight,
  User,
  GraduationCap,
  Cpu
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

interface Point3D {
  x: number;
  y: number;
  z: number;
  template: TemplateItem;
}

// Nigerian Student Profiles to shuffle & assign to each project
const NIGERIAN_CREATORS = [
  { name: "Chidi Okafor", age: 21, education: "Undergraduate", tool: "Mobile Phone (Tecno Spark 10)" },
  { name: "Amina Yusuf", age: 19, education: "SSE Graduate", tool: "Mobile Phone (Infinix Hot 30)" },
  { name: "Oluwaseun Balogun", age: 23, education: "Graduate", tool: "Mobile Phone (Redmi Note 12)" },
  { name: "Blessing Emmanuel", age: 20, education: "Undergraduate", tool: "Mobile Phone (Samsung Galaxy A14)" },
  { name: "Tunde Olayinka", age: 22, education: "Undergraduate", tool: "Mobile Phone (Infinix Note 12)" },
  { name: "Aisha Bello", age: 18, education: "SSE Graduate", tool: "Mobile Phone (Tecno Pop 7)" },
  { name: "Chinedu Nelson", age: 24, education: "Graduate", tool: "Mobile Phone (Samsung Galaxy A24)" },
  { name: "Funmi Adebayo", age: 25, education: "Graduate", tool: "Mobile Phone (Oppo A17)" },
  { name: "Ibrahim Dahiru", age: 20, education: "Undergraduate", tool: "Mobile Phone (Xiaomi Poco M5)" },
  { name: "Joy Nwachukwu", age: 21, education: "Undergraduate", tool: "Mobile Phone (iPhone X)" },
  { name: "Abubakar Sadiq", age: 22, education: "SSE Graduate", tool: "Mobile Phone (Tecno Camon 20)" },
  { name: "Kelechi Nwigwe", age: 23, education: "Undergraduate", tool: "Mobile Phone (Infinix Hot 12i)" },
  { name: "Damilola Oke", age: 19, education: "SSE Graduate", tool: "Mobile Phone (Samsung Galaxy A04)" },
  { name: "Zainab Haruna", age: 24, education: "Graduate", tool: "Mobile Phone (Redmi 10C)" },
  { name: "Emeka Obi", age: 20, education: "Undergraduate", tool: "Mobile Phone (Infinix Smart 7)" },
];

export default function PastCohortProjects() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  // 3D rotation angles
  const [rotX, setRotX] = useState(0.15);
  const [rotY, setRotY] = useState(0.5);
  
  // Dragging states
  const isDragging = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const lastRotX = useRef(0.15);
  const lastRotY = useRef(0.5);
  const requestRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [sphereRadius, setSphereRadius] = useState(320);

  // Load templates on mount
  useEffect(() => {
    if (staticFullPrompts && Array.isArray(staticFullPrompts.templates)) {
      setTemplates(staticFullPrompts.templates);
    }
  }, []);

  // Responsive radius
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setSphereRadius(150);
      } else if (window.innerWidth < 1024) {
        setSphereRadius(240);
      } else {
        setSphereRadius(320);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto horizontal spin
  useEffect(() => {
    const animate = () => {
      if (!isDragging.current && hoveredId === null && !selectedTemplate) {
        setRotY(prev => prev + 0.007);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [hoveredId, selectedTemplate]);

  // Next/Prev handlers
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

  // Keyboard Navigation
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

  // Drag handlers
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
    
    const sensitivity = 0.004;
    setRotY(lastRotY.current + deltaX * sensitivity);
    setRotX(Math.max(-1.4, Math.min(1.4, lastRotX.current - deltaY * sensitivity)));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Touch handlers
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
    
    const sensitivity = 0.006;
    setRotY(lastRotY.current + deltaX * sensitivity);
    setRotX(Math.max(-1.4, Math.min(1.4, lastRotX.current - deltaY * sensitivity)));
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  // Fibonacci lattice projection
  const getProjectedPoints = (): Point3D[] => {
    const points: Point3D[] = [];
    const N = templates.length;
    if (N === 0) return [];

    const goldenRatio = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < N; i++) {
      const template = templates[i];
      
      const y = 1 - (i / (N - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = i * goldenRatio;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      let px = x * sphereRadius;
      let py = y * sphereRadius;
      let pz = z * sphereRadius;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const r1y = py * cosX - pz * sinX;
      const r1z = py * sinX + pz * cosX;

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

  // Helper to retrieve creator profile deterministically per template index
  const getCreatorForTemplate = (templateId: string) => {
    const index = templates.findIndex(t => t.id === templateId);
    if (index === -1) return NIGERIAN_CREATORS[0];
    return NIGERIAN_CREATORS[index % NIGERIAN_CREATORS.length];
  };

  // Find active creator
  const activeCreator = selectedTemplate ? getCreatorForTemplate(selectedTemplate.id) : null;

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-950 via-teal-950 to-slate-950 text-white flex flex-col lg:flex-row relative overflow-hidden select-none">
      
      {/* Decorative Glow Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#0f766e_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />

      {/* LEFT SIDEBAR: Highly Convincing Cohort 3 Marketing Campaign */}
      <div className="w-full lg:w-[420px] shrink-0 border-b lg:border-b-0 lg:border-r border-teal-500/20 bg-slate-950/90 backdrop-blur-xl p-8 flex flex-col justify-between relative z-20">
        
        <div className="space-y-6">
          
          {/* Sparkly Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-black uppercase text-amber-400 tracking-wider">
            <Sparkles className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            Join Cohort 3 Today
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-none uppercase">
              How to Build Like <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-teal-300 to-amber-300">Our Graduates</span>
            </h1>
            <p className="text-teal-400 text-xs font-black uppercase tracking-widest">
              From Zero Skills to Pro Creator
            </p>
          </div>

          {/* Straightforward Conversion Copy */}
          <div className="space-y-4 text-slate-300 text-sm font-semibold leading-relaxed">
            <p>
              Every single 3D rotating website you see in this live sphere was designed entirely by our graduated students in <span className="text-white font-extrabold">Cohort 1</span> and <span className="text-white font-extrabold">Cohort 2</span>.
            </p>
            
            <p className="bg-teal-950/50 border border-teal-800/40 p-3 rounded-xl text-teal-300 text-xs font-bold shadow-inner">
              💡 <span className="text-amber-400 font-extrabold uppercase">The Best Part?</span> None of them had coded before, and <span className="text-white font-extrabold">everyone built these amazing sites using ONLY their mobile phone!</span>
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-black shrink-0">1</div>
                <p className="text-xs text-slate-300">
                  <span className="text-white font-bold">5-Day Mastery:</span> They learned the core high-income framework and designed these completed projects in just 5 days!
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-black shrink-0">2</div>
                <p className="text-xs text-slate-300">
                  <span className="text-white font-bold">Mobile Powered:</span> Learn to launch functional, responsive digital products right on your smartphone.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-black shrink-0">3</div>
                <p className="text-xs text-slate-300">
                  <span className="text-white font-bold">Your Turn Next:</span> In exactly 5 days from today, you will possess these exact skills to launch your tech career.
                </p>
              </div>
            </div>
          </div>

          {/* Strong Action Button */}
          <div className="pt-4">
            <Link
              to="/get-started"
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 text-sm font-black uppercase rounded-2xl shadow-lg shadow-amber-950/40 transition-all cursor-pointer border-0"
            >
              Start My 5-Day Journey Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-teal-900/40 mt-6 text-center lg:text-left">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Cohort 3 Admissions Closing Soon • Mobile Ready
          </div>
        </div>

      </div>

      {/* RIGHT MAIN SECTION: Interactive 3D Sphere of Graduates' Work */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[500px] lg:min-h-0 py-8 px-4 z-10">
        
        {/* Dynamic Marketing Centered Top Indicator */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white text-[10px] uppercase font-black tracking-widest bg-amber-500/10 border border-amber-500/30 px-5 py-2.5 rounded-full z-10 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span>🎓 COHORT 1 & 2 GRADUATE PROJECTS — 100% MOBILE BUILT IN 5 DAYS!</span>
        </div>

        {/* 3D Sphere Stage */}
        <div 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-full max-w-[900px] h-[380px] sm:h-[500px] md:h-[620px] lg:h-[720px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none"
        >
          {/* Sphere center ambient lighting */}
          <div className="absolute w-64 h-64 rounded-full bg-teal-400/5 blur-[90px] pointer-events-none" />

          {/* Graphical Orbit Lines */}
          <div className="absolute w-[290px] h-[290px] sm:w-[430px] sm:h-[430px] md:w-[590px] md:h-[590px] lg:w-[690px] lg:h-[690px] rounded-full border border-teal-500/10 pointer-events-none rotate-12" />
          <div className="absolute w-[290px] h-[290px] sm:w-[430px] sm:h-[430px] md:w-[590px] md:h-[590px] lg:w-[690px] lg:h-[690px] rounded-full border border-amber-500/5 pointer-events-none -rotate-12" />

          {/* Render 3D Projected Nodes */}
          {projectedPoints.map((point) => {
            const { x, y, z, template } = point;
            const minScale = 0.55;
            const maxScale = 1.15;
            const pctZ = (z + sphereRadius) / (2 * sphereRadius);
            const scale = minScale + (maxScale - minScale) * pctZ;
            const opacity = 0.15 + 0.85 * pctZ;
            const zIndex = Math.round((z + sphereRadius) * 2);
            const isHovered = hoveredId === template.id;

            const creator = getCreatorForTemplate(template.id);

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
                {/* Visual Thumbnail Card */}
                <div 
                  className={`relative w-[85px] h-[48px] sm:w-[125px] sm:h-[70px] md:w-[155px] md:h-[87px] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                    isHovered 
                      ? 'ring-2 ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-105 bg-slate-900' 
                      : 'border border-teal-500/30 shadow-lg bg-slate-950/80'
                  }`}
                >
                  {template.imageUrl ? (
                    <img
                      src={template.imageUrl}
                      alt={template.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      draggable="false"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-500">
                      <Smartphone className="w-5 h-5" />
                    </div>
                  )}

                  {/* Micro label for Nigerian Creator name */}
                  <div className="absolute bottom-0 left-0 right-0 p-1 bg-slate-950/90 backdrop-blur-[2px] text-[6px] sm:text-[9px] font-black truncate text-center text-amber-300 uppercase tracking-wide">
                    {creator.name}
                  </div>
                </div>

                {/* Hover Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl text-[9px] sm:text-xs font-black whitespace-nowrap z-[1000] flex flex-col items-center gap-0.5 pointer-events-none"
                    >
                      <span className="uppercase text-white">{template.name}</span>
                      <span className="text-[8px] text-teal-400">By {creator.name} ({creator.tool.split(' ')[0]})</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Floating Instruction text */}
        <div className="absolute bottom-6 flex items-center gap-1.5 text-xs text-teal-400/60 uppercase tracking-widest font-black">
          <Info size={14} className="text-amber-400 animate-pulse" />
          <span>Tap/Click any template to inspect student and mobile tool parameters</span>
        </div>
      </div>

      {/* DETAILED STUDENT WORKCASE POPUP MODAL */}
      <AnimatePresence>
        {selectedTemplate && activeCreator && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/98 backdrop-blur-xl">
            
            {/* Viewport Nav Controls */}
            <button
              onClick={handlePrevTemplate}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-800 hover:border-amber-400 cursor-pointer flex items-center justify-center shadow-2xl transition-all z-[100000] hover:scale-110 active:scale-95 group"
              title="Previous Graduate (Left Arrow)"
            >
              <ChevronLeft size={24} className="group-hover:text-amber-400 transition-colors" />
            </button>

            <button
              onClick={handleNextTemplate}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-800 hover:border-amber-400 cursor-pointer flex items-center justify-center shadow-2xl transition-all z-[100000] hover:scale-110 active:scale-95 group"
              title="Next Graduate (Right Arrow)"
            >
              <ChevronRight size={24} className="group-hover:text-amber-400 transition-colors" />
            </button>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col h-[90vh] md:h-[84vh] relative"
            >
              
              {/* TOP HEADER: Dynamic Creator Information & Conversion Proof */}
              <div className="w-full p-6 md:p-8 border-b border-slate-800 bg-slate-900/98 overflow-y-auto h-[48%] md:h-[38%] text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full">
                  
                  {/* Creator Info Grid */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/10 border border-amber-400/30 text-amber-400">
                        Past Graduate Project
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                        {selectedTemplate.category}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                        {selectedTemplate.name}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-bold text-slate-400">
                        <span className="flex items-center gap-1.5 text-white">
                          <User size={13} className="text-amber-400" />
                          Student Creator: <span className="text-amber-300 font-extrabold">{activeCreator.name}</span>
                        </span>
                        <span>•</span>
                        <span>Age: {activeCreator.age}</span>
                      </div>
                    </div>

                    <p className="text-slate-400 text-xs font-semibold leading-relaxed">
                      Built completely within <span className="text-white font-extrabold">5 Days of intensive learning</span> during the masterclass training sessions. Proof that anyone can launch tech products!
                    </p>
                  </div>

                  {/* Verification Credentials & Mobile Tools used */}
                  <div className="flex flex-col justify-between h-full space-y-4">
                    <div className="bg-slate-950/60 rounded-xl p-4 border border-teal-500/15 space-y-2.5">
                      
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-400 uppercase flex items-center gap-1">
                          <GraduationCap size={14} className="text-teal-400" /> Education
                        </span>
                        <span className="text-teal-300 uppercase font-black">{activeCreator.education}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-400 uppercase flex items-center gap-1">
                          <Smartphone size={14} className="text-amber-400" /> Hardware Tool
                        </span>
                        <span className="text-amber-300 uppercase font-black">{activeCreator.tool}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-400 uppercase flex items-center gap-1">
                          <Cpu size={14} className="text-purple-400" /> Build Duration
                        </span>
                        <span className="text-purple-300 uppercase font-black">5 Days (From Zero Experience)</span>
                      </div>

                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
                      <button
                        onClick={() => navigate('/get-started')}
                        className="w-full sm:flex-1 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl text-xs font-black uppercase transition-all cursor-pointer border-0 shadow-lg shadow-amber-950/20"
                      >
                        I Want to Build Like This
                      </button>

                      <button
                        onClick={() => setSelectedTemplate(null)}
                        className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase transition-all cursor-pointer border-0"
                      >
                        Keep Exploring
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* BOTTOM VISUAL AREA: Real recording or high fidelity screenshot */}
              <div className="w-full bg-black relative flex items-center justify-center overflow-hidden h-[52%] md:h-[62%]">
                {selectedTemplate.videoUrl ? (
                  <video
                    key={selectedTemplate.id}
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
                    <Smartphone className="w-12 h-12 text-teal-500" />
                    <span className="text-xs">Live Mobile Capture Loaded</span>
                  </div>
                )}
              </div>

              {/* CLOSE BUTTON */}
              <button
                onClick={() => setSelectedTemplate(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-850 hover:bg-slate-750 text-slate-300 hover:text-white border-0 cursor-pointer flex items-center justify-center shadow-xl transition-colors z-[100001]"
                title="Close View (Esc)"
              >
                <X size={18} />
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
