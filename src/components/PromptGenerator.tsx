import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Copy, Check, Sparkles, Globe, ShoppingBag, Code, ArrowRight, Download, RefreshCw, AlertCircle, Layers, Clipboard, HelpCircle, X } from 'lucide-react';

interface PromptGeneratorProps {
  isLocked?: boolean;
}

interface FullTemplate {
  id: string;
  name: string;
  template: string;
}

interface ModularTemplate {
  id: string;
  name: string;
  type: 'landing' | 'ecommerce' | 'any';
  description: string;
  template: string;
}

const PRESETS = [
  {
    name: 'Luxe Flora',
    type: 'ecommerce',
    desc: 'Luxe Flora - A premium boutique flower delivery service based in Manchester. We specialize in luxury organic roses, seasonal hand-wrapped wildflower bouquets, and hand-poured aromatherapy soy candles. Target audience: Couples, event planners, and luxury gifts buyers. Brand vibe: Minimalist, clean, elegant, with soft pink, sage green, and warm cream palettes. Font pairing: Playfair Display for headings and Inter for description copy.'
  },
  {
    name: 'Apex Strength Gear',
    type: 'ecommerce',
    desc: 'Apex Strength Gear - High-performance weightlifting gear and wraps designed for powerlifters and strength athletes. Products include neoprene knee sleeves, heavy-duty lever lifting belts, wrist wraps, and industrial-strength athletic shirts. Target audience: Intense gym-goers, competitive weightlifters. Brand vibe: Aggressive, high-contrast, modern brutalist, industrial charcoal dark background, with glowing amber-yellow accents. Font pairing: Space Grotesk and Fira Code.'
  },
  {
    name: 'EcoClean Janitor Services',
    type: 'landing',
    desc: 'EcoClean Solutions - A neighborhood-first commercial and residential cleaning service using 100% biodegradable, certified non-toxic green cleaning formulas. Based in Vancouver. Target audience: Health-conscious families, local boutique retail stores, and offices wanting sustainable corporate social responsibility. Brand vibe: Trustworthy, fresh, light, featuring vibrant forest green and sky blue highlights on a pure off-white canvas. Font pairing: Outfit and Inter.'
  }
];

// High fidelity default fallback full templates if admin hasn't created any
const FALLBACK_LP_TEMPLATE = `System Instruction:
You are an expert senior web designer, brand strategist, and front-end developer specializing in High-Converting modern Landing Pages. Your job is to draft a comprehensive, step-by-step production plan and compile the production-ready code for a stunning custom website based on the following business profile:

=== CUSTOM BUSINESS PROFILE ===
Name / Anchor: {name}
Location / Area: {location}
General Stylization Vibe: {vibe}

RAW DATA SUBMITTED:
"{details}"
==============================

Objective: Design a custom single-page landing page featuring modern aesthetics, exceptional typography, and flawless responsiveness.

Please structure your response into the following clear phases of work. Provide the precise HTML, React + Tailwind compilation, or custom copywriting copy guidelines for each:

PHASE 1: BRAND STRATEGY, VISUAL PALETTE & VIBE
- Define a cohesive mood/vibe based on the business details above.
- Recommend a highly specific Color Palette (using Tailwind hex classes like slate, tea, amber or orange).
- Select a clear, modern Font pairing (e.g., Space Grotesk for Display Headings, Inter for legible copy, and Jetbrains Mono for metadata or code tags).

PHASE 2: MASTER COPYWRITING & STRUCTURE
- Write/format the exact text Copy for the page following the AIDA high-conversion framework:
  1. Attention: A stunning hero header that clearly states the unique value proposition.
  2. Interest: Engaging story hooks and feature cards highlighting direct benefits.
  3. Desire: Rich social proof or testimonial snippets, custom metrics/stats, or trust tags.
  4. Action: Highly compelling Call-To-Action (CTA) message and simple conversion-oriented fields.

PHASE 3: HIGH-FIDELITY UI LAYOUT ARCHITECTURE
Outline the precise HTML/React component sections to be implemented:
1. Header & Navigation: A sticky, semi-transparent navigation bar with custom backdrop-blur, containing the business brand name/logo and responsive quick links.
2. Hero Section: A highly engaging, visually deep introductory section with custom radial highlights, an elegant tagline, conversion buttons (with hover scaling transitions), and optional mock graphics.
3. Feature / Grid Sections: A bento-grid, 3-column, or stagger-aligned layout detailing premium features or services using modern cards.
4. Testimonials & Social Proof: A section featuring high-quality client quotes, avatars, and trust Badges.
5. Interactive Elements: Interactive accordion-based FAQs and smooth fade-in motion effects on scroll.
6. Lead Collection/Contact Form: A beautiful, modern inputs group with validation highlights, a message text-area, and success states.
7. Footer: Clean copyright text, contact indicators, and neat social media link icons from Lucide.

PHASE 4: COMPLETE PRODUCTION CODE IMPLEMENTATION GUIDELINES
- Provide direct programming commands to compile this landing page using beautiful standard React functional patterns. Use React hooks for states, standard Tailwind CSS classes directly, and lucide-react icons. Include micro-behavior interactions on buttons and cards using scaling and sliding classes (e.g., 'hover:-translate-y-1 hover:shadow-lg transition-all duration-300').`;

const FALLBACK_EC_TEMPLATE = `System Instruction:
You are an expert full-stack developer, product listing UI/UX architect, and brand strategist specializing in High-Converting eCommerce shopping portals. Your job is to draft a comprehensive production architecture and complete code guidelines for a custom sales-optimized online store based on the following business details:

=== CUSTOM BUSINESS PROFILE ===
Store/Product Domain: {name}
Sales Operations Based In: {location}
Styling Theme Preference: {vibe}

RAW DATA SUBMITTED:
"{details}"
==============================

Objective: Design a highly interactive, responsive eCommerce platform with clean item listing, fully detailed product cards, catalog filters, a persistent slide-out shopping cart, a secure mock checkout portal, and conversion states.

Please structure your response into the following implementation phases. Provide the precise configuration details, layout elements, state managers, and component layouts:

PHASE 1: STORE BRAND AESTHETIC, STYLING & THEME CONFIGURATION
- Establish the specific look-and-feel of the store (e.g., minimalist fashion palette, luxury black and gold, high-energy tech-mono, or soft natural earthy tones).
- Define the exact Typography Pairings and responsive padding standards.

PHASE 2: PRODUCT CATALOG & DYNAMIC FILTERING ARCHITECTURE
- Dynamic Catalog: Detail a minimum of 4 distinct premium products including custom titles, descriptions, pricing tables, image concepts, and inventory indicators matching the business above.
- Categories & Search: Outline robust tags and filter pills (such as 'Best Sellers', 'New Arrivals', 'Featured') and an instant search filter system.

PHASE 3: KEY UI/UX ECOMMERCE SECTIONS
1. Navigation Bar with Cart Hub: Sticky top navigation displaying the brand logo, category shortcuts, a search bar, and a persistent shopping cart button showing a dynamic items counter badge.
2. Promo Banner/Hero: A full-width promotional banner celebrating an introductory discount code, styled with vivid background gradients.
3. Catalog Grid Section: Highly polished grid layout containing product cards. Each card must feature: hover picture scaling, clear pricing, discount badges, and a prominent 'Add to Cart' button with click ripple animations.
4. Persistent Slide-out Shopping Cart Drawer: A panel that slides in from the right edge, listing added products with item quantities (+ and - modifier controls), individual prices, dynamic subtotal calculations, and a direct checkout call to action.
5. In-Context Checkout Modal: A gorgeous form that lets customers fill shipment details, email, payment card fields, and displays a summary order checklist.

PHASE 4: CLIENT-SIDE STATE MANAGEMENT SPECIFICATION
- Provide exact state variables (using standard React useState and useEffect hooks):
  - 'products': Object array of active inventory.
  - 'cart': Array of items with selected quantities.
  - 'isCartOpen': Boolean state governing the drawer.
  - 'activeCategory': Filter category state.
- Set up logic commands for:
  - 'addToCart(productId)': Safely increments or appends the item to the cart.
  - 'removeFromCart(productId)' or 'updateQuantity(productId, newQty)': Updates subtotals and sizes.
  - 'checkoutSubmit()': Mock confirmation sequence that empties the cart and unlocks a styled order-completed banner.

PHASE 5: HIGH-QUALITY CODE GENERATION GUIDE USING REACT & TAILWIND
- Outline clean React functional templates incorporating lucide-react icons and standard Tailwind UI utilities.`;

const FALLBACK_MODULAR_TEMPLATES: ModularTemplate[] = [
  {
    id: 'mod_1',
    name: 'Hero Section Refinement Card',
    type: 'any',
    description: 'Perfect for tuning the primary focus segment, custom call-to-actions, and background stylizations.',
    template: 'Optimize the Hero focal component for {name} based in {location}. Rewrite the primary headline to be highly conversational, propose a soft-focused radial glassmorphism container, and add dual response buttons that animate with custom hover translates.'
  },
  {
    id: 'mod_2',
    name: 'High-Impact Bento Grid Benefits',
    type: 'landing',
    description: 'Structure user advantages & service proofs inside an asymmetrical modern bento framework.',
    template: 'Design an premium 3-column asymmetrical Bento Grid section detailing key benefits of {name} utilizing beautiful card headers, custom icons, and individual border glow parameters. Ensure full standard responsiveness.'
  },
  {
    id: 'mod_3',
    name: 'Smart Dynamic Shopping Cart Drawer',
    type: 'ecommerce',
    description: 'Polish checkout entry points and persistent sliding panels.',
    template: 'Explain the state mechanisms and layout steps to implement a sleek persistent slide-out shopping cart for {name}. Include standard quantity modifiers, discount calculation sections, subtotal tags, and direct checkout call-to-action triggers styled with Tailwind CSS.'
  },
  {
    id: 'mod_4',
    name: 'Interactive Accordion FAQ',
    type: 'any',
    description: 'Handles customer questions with smooth micro-interaction expandable tabs.',
    template: 'Formulate an elegant accordion FAQ list containing 4 critical answers tailored to {name}. Build with clean state controllers, micro-animations on expands, and highlighted border outlines.'
  }
];

export default function PromptGenerator({ isLocked = false }: PromptGeneratorProps) {
  const [websiteType, setWebsiteType] = useState<'landing' | 'ecommerce'>('landing');
  const [businessInfo, setBusinessInfo] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  // Firestore templates states
  const [customLpTemplates, setCustomLpTemplates] = useState<FullTemplate[]>([]);
  const [customEcTemplates, setCustomEcTemplates] = useState<FullTemplate[]>([]);
  const [customModTemplates, setCustomModTemplates] = useState<ModularTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // States for active modular modal popup
  const [activeModPopup, setActiveModPopup] = useState<{
    name: string;
    description: string;
    rawTemplate: string;
    compiledPrompt: string;
  } | null>(null);
  const [modCopySuccess, setModCopySuccess] = useState(false);

  // 1. Fetch Admin templates from Firestore
  useEffect(() => {
    async function fetchTemplates() {
      setLoadingTemplates(true);
      try {
        const fullDocRef = doc(db, 'settings', 'full_prompts');
        const fullSnap = await getDoc(fullDocRef);
        if (fullSnap.exists()) {
          const data = fullSnap.data();
          setCustomLpTemplates(data.landing || []);
          setCustomEcTemplates(data.ecommerce || []);
        }

        const modDocRef = doc(db, 'settings', 'modular_prompts');
        const modSnap = await getDoc(modDocRef);
        if (modSnap.exists()) {
          const data = modSnap.data();
          setCustomModTemplates(data.templates || []);
        }
      } catch (err) {
        console.error("Error reading admin configured prompts:", err);
      } finally {
        setLoadingTemplates(false);
      }
    }
    fetchTemplates();
  }, []);

  // Parse key details for high-fidelity fallback placeholder injection
  const extractDetail = (text: string, label: string, fallback: string) => {
    if (!text) return fallback;
    const lines = text.split(/[.\n]+/);
    const matched = lines.find(line => line.toLowerCase().includes(label.toLowerCase()));
    if (matched) {
      const parts = matched.split(/[:\-]+/);
      if (parts.length > 1) {
        return parts[1].trim();
      }
      return matched.trim();
    }
    return fallback;
  };

  const currentParams = React.useMemo(() => {
    const name = extractDetail(businessInfo, "name", "My Custom Brand");
    const location = extractDetail(businessInfo, "based in", "Global Region");
    const vibe = extractDetail(businessInfo, "vibe", "Modern Minimalist and High-Conversion");
    return { name, location, vibe };
  }, [businessInfo]);

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setWebsiteType(preset.type as 'landing' | 'ecommerce');
    setBusinessInfo(preset.desc);
    setGeneratedPrompt('');
  };

  const handleClear = () => {
    setBusinessInfo('');
    setGeneratedPrompt('');
  };

  // 2. Main Shuffling compile handler
  const handleCompilePrompt = () => {
    if (!businessInfo.trim()) {
      alert("Please paste some details about your business first!");
      return;
    }

    setIsCompiling(true);

    const { name: bizName, location: bizLocation, vibe: bizVibe } = currentParams;

    setTimeout(() => {
      let selectedTemplateText = '';

      if (websiteType === 'landing') {
        // If there are admin configured templates for landing pages, shuffle and pick one.
        if (customLpTemplates.length > 0) {
          const randomIndex = Math.floor(Math.random() * customLpTemplates.length);
          selectedTemplateText = customLpTemplates[randomIndex].template;
        } else {
          // Fallback to beautiful standard template
          selectedTemplateText = FALLBACK_LP_TEMPLATE;
        }
      } else {
        // Shuffling eCommerce configurations
        if (customEcTemplates.length > 0) {
          const randomIndex = Math.floor(Math.random() * customEcTemplates.length);
          selectedTemplateText = customEcTemplates[randomIndex].template;
        } else {
          selectedTemplateText = FALLBACK_EC_TEMPLATE;
        }
      }

      // Perform Tailoring wildcard replacements
      const promptText = selectedTemplateText
        .replace(/{name}/g, bizName)
        .replace(/{location}/g, bizLocation)
        .replace(/{vibe}/g, bizVibe)
        .replace(/{details}/g, businessInfo);

      setGeneratedPrompt(promptText);
      setIsCompiling(false);
    }, 750);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedPrompt], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${websiteType}-prompt-guidelines.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Modular Suggestion card calculation
  const currentModularSuggestions = React.useMemo(() => {
    const list = customModTemplates.length > 0 ? customModTemplates : FALLBACK_MODULAR_TEMPLATES;
    return list.filter(item => item.type === 'any' || item.type === websiteType);
  }, [customModTemplates, websiteType]);

  const handleTriggerModularPopup = (mod: ModularTemplate) => {
    const { name: bizName, location: bizLocation, vibe: bizVibe } = currentParams;
    const compiled = mod.template
      .replace(/{name}/g, bizName)
      .replace(/{location}/g, bizLocation)
      .replace(/{vibe}/g, bizVibe)
      .replace(/{details}/g, businessInfo);

    setActiveModPopup({
      name: mod.name,
      description: mod.description,
      rawTemplate: mod.template,
      compiledPrompt: compiled
    });
  };

  const handleCopyModPrompt = () => {
    if (!activeModPopup) return;
    navigator.clipboard.writeText(activeModPopup.compiledPrompt);
    setModCopySuccess(true);
    setTimeout(() => setModCopySuccess(false), 2000);
  };

  if (isLocked) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm my-6 font-sans text-left">
        <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="text-xl font-black text-slate-800 tracking-tight">Website Prompt Generator Locked</h3>
        <p className="text-slate-500 mt-3 text-sm leading-relaxed font-semibold">
          This customized workshop tool is temporarily locked by the course administrators. Unlocks are periodically timed with curriculum milestones. Please reach out to your CIYA instructor for guidance.
        </p>
        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center items-center gap-2 text-xs text-slate-400 font-bold">
          <span>🛡️ CIYA Guarded Academy Portal</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans pb-20 text-left">
      {/* Intro Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-black text-teal-400">
            <Sparkles className="w-3.5 h-3.5" /> Prompt Generator Lab
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">Dynamic AI Prompt Architect</h2>
          <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-2xl font-semibold">
            Convert standard raw business details into exhaustive, industrial-strength developer prompt models. Paste your KYCB notes or ideas below to instantly assemble custom visual styling and architecture specifications.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Input panel */}
        <div className="lg:col-span-12 xl:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">1. Select Website Category</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWebsiteType('landing')}
                className={`py-3 px-4 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-2 cursor-pointer outline-none ${
                  websiteType === 'landing'
                    ? 'bg-teal-50 text-teal-700 border-teal-600 shadow-sm font-black'
                    : 'bg-transparent text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Globe className="w-4 h-4" />
                Landing Page
              </button>
              <button
                type="button"
                onClick={() => setWebsiteType('ecommerce')}
                className={`py-3 px-4 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-2 cursor-pointer outline-none ${
                  websiteType === 'ecommerce'
                    ? 'bg-teal-50 text-teal-700 border-teal-600 shadow-sm font-black'
                    : 'bg-transparent text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                eCommerce Hub
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">2. Raw Business Description or Ideas</label>
              <button 
                type="button"
                onClick={handleClear}
                className="text-[10px] uppercase font-bold text-slate-400 hover:text-red-500 transition-colors bg-transparent border-0 cursor-pointer"
              >
                Clear Field
              </button>
            </div>
            <textarea
              value={businessInfo}
              onChange={(e) => setBusinessInfo(e.target.value)}
              placeholder="Paste details about your client's business here (e.g. name, location, products, target customers, preferred colors, logo style, custom features)..."
              rows={8}
              className="w-full text-xs bg-slate-50/50 hover:bg-slate-50/80 border border-slate-200 rounded-xl p-4 text-slate-800 font-medium placeholder:text-slate-400 outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-sans leading-relaxed"
            />
          </div>

          {/* Quick presets list */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Need an idea? Try a workshop preset:</span>
            <div className="grid grid-cols-1 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="text-left text-xs p-3 rounded-xl border border-slate-150 hover:border-teal-300 hover:bg-teal-50/20 text-slate-700 bg-white cursor-pointer transition-all flex justify-between items-center shadow-sm hover:shadow-md"
                >
                  <div className="space-y-0.5 max-w-[85%]">
                    <span className="font-extrabold text-slate-800 text-xs block">{p.name}</span>
                    <span className="text-[10px] text-slate-500 truncate block">{p.desc}</span>
                  </div>
                  <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                    {p.type === 'landing' ? 'Landing' : 'eCom'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCompilePrompt}
            disabled={isCompiling}
            className="w-full py-4 px-5 bg-teal-600 hover:bg-teal-700 hover:-translate-y-0.5 transition-all outline-none rounded-xl text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer border-0"
          >
            {isCompiling ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Shuffling & tailoring templates...
              </>
            ) : (
              <>
                Generate Dynamic Prompt
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Output pane */}
        <div className="lg:col-span-12 xl:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-h-[500px] flex flex-col items-stretch space-y-6">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center shrink-0">
            <div>
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">3. Tailored AI Developer Prompt</span>
              <span className="text-[10px] text-slate-400 font-bold">Generated from expert admin presets using shuffling. Copy directly into your builder AI!</span>
            </div>
            {generatedPrompt && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 bg-slate-150 hover:bg-teal-50 text-slate-700 hover:text-teal-700 border-0 px-3 py-2 rounded-xl transition-all cursor-pointer font-extrabold text-xs"
                  title="Copy Prompt to Clipboard"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-teal-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 px-3 py-2 rounded-xl transition-all cursor-pointer font-extrabold text-xs"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-stretch">
            {generatedPrompt ? (
              <div className="space-y-4">
                <pre className="w-full bg-slate-900 border border-slate-800 text-teal-100/90 text-xs font-mono p-5 rounded-2xl overflow-auto select-all h-[360px] shadow-inner leading-relaxed whitespace-pre-wrap text-left font-semibold">
                  {generatedPrompt}
                </pre>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 select-none py-20">
                <div className="w-12 h-12 rounded-full border border-slate-150 flex items-center justify-center bg-slate-50/50 mb-4 animate-pulse">
                  <Code className="w-6 h-6 text-slate-300" />
                </div>
                <h4 className="text-sm font-black text-slate-700 font-sans">Waiting for Data Output</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mt-2 leading-relaxed font-bold font-sans">
                  Select a category, paste details about your business profile on the left, and click generate to assemble customized interactive blueprints.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODULAR SUB-PROMPT SUGGESTIONS SECTION */}
      <div className="bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-200 mt-6 text-left">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
          <Layers className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="font-extrabold text-slate-850 text-sm uppercase tracking-tight">Sectional Refinement Modular Prompts</h3>
            <p className="text-[11px] text-slate-500 font-bold leading-none mt-1">
              Select any modular suggestion card below to get tailored sub-prompts for specific segments of your {websiteType === 'landing' ? 'Landing Page' : 'eCommerce Store'}!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentModularSuggestions.map((mod) => (
            <div 
              key={mod.id} 
              onClick={() => handleTriggerModularPopup(mod)}
              className="bg-white border border-slate-200 hover:border-indigo-400 p-5 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full inline-block">
                    {mod.type === 'any' ? 'Universal Refiner' : mod.type === 'landing' ? 'Landing Section' : 'eCommerce Section'}
                  </span>
                  <span className="text-[10px] text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity font-extrabold">Generate &rarr;</span>
                </div>
                <h4 className="font-extrabold text-slate-800 text-xs transition-colors group-hover:text-indigo-600">{mod.name}</h4>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  {mod.description || 'Section refinement prompt modifier.'}
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 text-[10px] text-slate-400 font-mono truncate">
                {mod.template}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* POPUP MODAL FOR MODULAR COMPILED SUB-PROMPT */}
      {activeModPopup && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative animate-in fade-in zoom-in duration-200 text-left">
            <button
              onClick={() => setActiveModPopup(null)}
              className="absolute top-6 right-6 p-2 rounded-full border-0 bg-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors outline-none"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-4 font-sans">
              <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {activeModPopup.name} (Modular Suggestion)
                </h3>
                <p className="text-[11px] text-slate-400 font-bold">{activeModPopup.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border text-[10px] font-bold text-slate-500 leading-relaxed font-sans">
                💡 <span className="text-slate-700">How to use:</span> Copy this section-specific prompt and input it directly into your builder workspace to refine, rewrite, or redesign just that specific part of your page.
              </div>

              <div className="space-y-1.5 font-sans">
                <span className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Tailored Modular Prompt Code:</span>
                <pre className="w-full bg-slate-900 text-lime-400 text-xs font-mono p-4 rounded-xl overflow-auto border border-slate-800 leading-relaxed h-[180px] select-all whitespace-pre-wrap leading-relaxed font-semibold">
                  {activeModPopup.compiledPrompt}
                </pre>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6 justify-end font-sans">
              <button
                type="button"
                onClick={() => setActiveModPopup(null)}
                className="px-4 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-extrabold rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCopyModPrompt}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl border-0 cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {modCopySuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Clipboard className="w-3.5 h-3.5" />
                    Copy Sub-Prompt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
