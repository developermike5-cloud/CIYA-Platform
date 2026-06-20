import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Plus, Trash, Edit, Save, Globe, ShoppingBag, Sparkles, AlertCircle, Check, Info, FileText, ChevronRight, X, RefreshCw } from 'lucide-react';

interface FullPromptTemplate {
  id: string;
  name: string;
  template: string;
}

interface ModularPromptTemplate {
  id: string;
  name: string;
  type: 'landing' | 'ecommerce' | 'any';
  description: string;
  template: string;
}

const DEFAULT_LP_TEMPLATES: FullPromptTemplate[] = [
  {
    id: 'lp_default_1',
    name: 'Dynamic High-Converting AIDA Framework',
    template: `System Instruction:
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
- Provide direct programming commands to compile this landing page using beautiful standard React functional patterns. Use React hooks for states, standard Tailwind CSS classes directly, and lucide-react icons. Include micro-behavior interactions on buttons and cards using scaling and sliding classes (e.g., 'hover:-translate-y-1 hover:shadow-lg transition-all duration-300').`
  }
];

const DEFAULT_EC_TEMPLATES: FullPromptTemplate[] = [
  {
    id: 'ec_default_1',
    name: 'Interactive Retail Catalog & persistent Cart System',
    template: `System Instruction:
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
  - 'removeFromCart(productId)' or 'updateQuantity(productId, newQty)': Updates subtotals and synchronizes items list.
  - 'checkoutSubmit()': Mock confirmation sequence that empties the cart and unlocks a styled order-completed banner.

PHASE 5: HIGH-QUALITY CODE GENERATION GUIDE USING REACT & TAILWIND
- Outline clean React functional templates incorporating lucide-react icons and standard Tailwind UI utilities.`
  }
];

const DEFAULT_MODULAR_TEMPLATES: ModularPromptTemplate[] = [
  {
    id: 'mod_default_1',
    name: 'Hero Section Finetuner',
    type: 'any',
    description: 'Generates sub-prompts focused on building a gorgeous, engaging landing or storefront hero segment.',
    template: 'Act as a production-grade React & Tailwind designer. Draft a stunning, high-converting premium Hero component tailored for {name} based in {location}. Use a modern bold display font, ambient background gradients with blur backdrops, standard responsive layout paddings, and dual call-to-action buttons styled with elegant scaling hover transforms (hover:-translate-y-0.5 hover:shadow-lg transition-all).'
  },
  {
    id: 'mod_default_2',
    name: 'Interactive Glassmorphism Bento Grid',
    type: 'landing',
    description: 'Perfect for listing services, features, or benefits in a trendy modern asymmetrical matrix.',
    template: 'Optimize the features showcase for {name} by designing a high-fidelity asymmetrical 3-column Bento Grid layout. Style each grid block with slate-900 border frames, 5% opacity white glassmorphism fillings, custom glowing focus gradients in the corners, and descriptive lucide icons paired with short, impactful bold titles and subtexts showing off the business advantages.'
  },
  {
    id: 'mod_default_3',
    name: 'eCommerce Product Card Grid & Hover Effects',
    type: 'ecommerce',
    description: 'Upgrades product displaying cards with slide-in cart modifiers and zoom triggers.',
    template: 'Construct an premium catalog grid segment for {name}. Make each card feature zoom-on-hover image framing, clean bold price tags, quick category labeling pills, and an elegant "Add to Cart" block that unlocks interactive count modifiers once triggered. Ensure robust responsive scaling for mobile, tablet, and desktop screens.'
  },
  {
    id: 'mod_default_4',
    name: 'Modern Interactive FAQ Accordion',
    type: 'any',
    description: 'Renders smooth expandable accordion panels for frequently asked customer questions.',
    template: 'Write a self-contained interactive FAQ Accordion panel for {name}. Include 4 relevant, professionally worded questions about the service based on the profile context. Implement smooth height expands using React hooks, rotating chevron triggers, and hover highlight border responses styled entirely with native Tailwind utility classes.'
  },
  {
    id: 'mod_default_5',
    name: 'High-Impact Testimonials Grid',
    type: 'any',
    description: 'Styled client review card layouts with customized rating metrics.',
    template: 'Formulate an elegant client testimonial showcase section for {name}. Organize 3 distinct high-fidelity customer quotes in a masonry or row layout. Each review card should feature beautiful circular placeholders, bold metadata for reviewer details, gold ratings stars, and quotes written using elegant, italic typography.'
  }
];

export default function PromptsAdmin() {
  const [activeTab, setActiveTab] = useState<'full' | 'modular'>('full');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // States for Full Prompt Templates
  const [lpTemplates, setLpTemplates] = useState<FullPromptTemplate[]>([]);
  const [ecTemplates, setEcTemplates] = useState<FullPromptTemplate[]>([]);

  // States for Modular Prompt Templates
  const [modularTemplates, setModularTemplates] = useState<ModularPromptTemplate[]>([]);

  // Editing state for Full Template modal
  const [editingFullTemplate, setEditingFullTemplate] = useState<{
    type: 'landing' | 'ecommerce';
    index: number;
    id: string;
    name: string;
    template: string;
  } | null>(null);

  // Editing state for Modular Template modal
  const [editingModTemplate, setEditingModTemplate] = useState<{
    index: number | null; // null if brand new
    id: string;
    name: string;
    type: 'landing' | 'ecommerce' | 'any';
    description: string;
    template: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Fetch templates on load
  useEffect(() => {
    async function loadTemplates() {
      setLoading(true);
      try {
        // Fetch full prompts document
        const fullDocRef = doc(db, 'settings', 'full_prompts');
        const fullSnap = await getDoc(fullDocRef);
        if (fullSnap.exists()) {
          const data = fullSnap.data();
          setLpTemplates(data.landing || DEFAULT_LP_TEMPLATES);
          setEcTemplates(data.ecommerce || DEFAULT_EC_TEMPLATES);
        } else {
          setLpTemplates(DEFAULT_LP_TEMPLATES);
          setEcTemplates(DEFAULT_EC_TEMPLATES);
        }

        // Fetch modular prompts document
        const modDocRef = doc(db, 'settings', 'modular_prompts');
        const modSnap = await getDoc(modDocRef);
        if (modSnap.exists()) {
          const data = modSnap.data();
          setModularTemplates(data.templates || DEFAULT_MODULAR_TEMPLATES);
        } else {
          setModularTemplates(DEFAULT_MODULAR_TEMPLATES);
        }
      } catch (err) {
        console.error("Error loading prompt templates:", err);
        showToast("Error retrieving templates from database.");
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();
  }, []);

  // 2. Save full prompts
  const handleSaveFullPrompts = async (lp: FullPromptTemplate[], ec: FullPromptTemplate[]) => {
    setSaving(true);
    const path = 'settings/full_prompts';
    try {
      await setDoc(doc(db, 'settings', 'full_prompts'), {
        landing: lp,
        ecommerce: ec,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showToast("Full prompt templates saved successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setSaving(false);
    }
  };

  // 3. Save modular prompts
  const handleSaveModularPrompts = async (mods: ModularPromptTemplate[]) => {
    setSaving(true);
    const path = 'settings/modular_prompts';
    try {
      await setDoc(doc(db, 'settings', 'modular_prompts'), {
        templates: mods,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showToast("Modular prompt templates saved successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setSaving(false);
    }
  };

  // Full templates utilities
  const openEditFull = (type: 'landing' | 'ecommerce', index: number) => {
    const list = type === 'landing' ? lpTemplates : ecTemplates;
    const item = list[index];
    setEditingFullTemplate({
      type,
      index,
      id: item.id,
      name: item.name,
      template: item.template
    });
  };

  const openNewFull = (type: 'landing' | 'ecommerce') => {
    setEditingFullTemplate({
      type,
      index: -1, // -1 means new
      id: `${type}_custom_${Date.now()}`,
      name: '',
      template: ''
    });
  };

  const saveFullDialog = () => {
    if (!editingFullTemplate) return;
    if (!editingFullTemplate.name.trim() || !editingFullTemplate.template.trim()) {
      alert("Name and Template strings cannot be blank.");
      return;
    }

    const { type, index, id, name, template } = editingFullTemplate;
    let nextLp = [...lpTemplates];
    let nextEc = [...ecTemplates];

    const newItem: FullPromptTemplate = { id, name, template };

    if (type === 'landing') {
      if (index === -1) {
        nextLp.push(newItem);
      } else {
        nextLp[index] = newItem;
      }
      setLpTemplates(nextLp);
      handleSaveFullPrompts(nextLp, ecTemplates);
    } else {
      if (index === -1) {
        nextEc.push(newItem);
      } else {
        nextEc[index] = newItem;
      }
      setEcTemplates(nextEc);
      handleSaveFullPrompts(lpTemplates, nextEc);
    }

    setEditingFullTemplate(null);
  };

  const deleteFullItem = (type: 'landing' | 'ecommerce', index: number) => {
    if (!confirm("Are you sure you want to delete this prompt template?")) return;
    let nextLp = [...lpTemplates];
    let nextEc = [...ecTemplates];

    if (type === 'landing') {
      nextLp.splice(index, 1);
      setLpTemplates(nextLp);
      handleSaveFullPrompts(nextLp, ecTemplates);
    } else {
      nextEc.splice(index, 1);
      setEcTemplates(nextEc);
      handleSaveFullPrompts(lpTemplates, nextEc);
    }
  };

  // Modular templates utilities
  const openEditMod = (index: number) => {
    const item = modularTemplates[index];
    setEditingModTemplate({
      index,
      id: item.id,
      name: item.name,
      type: item.type,
      description: item.description,
      template: item.template
    });
  };

  const openNewMod = () => {
    setEditingModTemplate({
      index: null,
      id: `mod_custom_${Date.now()}`,
      name: '',
      type: 'any',
      description: '',
      template: ''
    });
  };

  const saveModDialog = () => {
    if (!editingModTemplate) return;
    if (!editingModTemplate.name.trim() || !editingModTemplate.template.trim()) {
      alert("Name and sub-prompt template cannot be blank.");
      return;
    }

    let nextMods = [...modularTemplates];
    const { index, id, name, type, description, template } = editingModTemplate;
    const newItem: ModularPromptTemplate = { id, name, type, description, template };

    if (index === null) {
      nextMods.push(newItem);
    } else {
      nextMods[index] = newItem;
    }

    setModularTemplates(nextMods);
    handleSaveModularPrompts(nextMods);
    setEditingModTemplate(null);
  };

  const deleteModItem = (index: number) => {
    if (!confirm("Are you sure you want to delete this modular suggestion template?")) return;
    let nextMods = [...modularTemplates];
    nextMods.splice(index, 1);
    setModularTemplates(nextMods);
    handleSaveModularPrompts(nextMods);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-12">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-500">Retrieving Prompt Templates configuration...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50 text-slate-800 p-6 md:p-8 space-y-6 text-left max-w-7xl mx-auto">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-[100] bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-xl px-5 py-3.5 flex items-center gap-3 transition-all duration-300 transform translate-y-0 text-xs font-bold font-sans">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl border border-slate-800 font-sans">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-black text-amber-400">
            <Sparkles className="w-3.5 h-3.5" /> Prompt Architecture Console
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Academy Prompts & Templates Manager
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl font-semibold">
            Input and orchestrate templates of full prompts for the website builder categories, as well as refining suggestions. The student dashboard shuffles and tails these custom templates for every user dynamically!
          </p>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 gap-4 mt-6">
        <button
          type="button"
          onClick={() => setActiveTab('full')}
          className={`pb-3 px-4 text-sm font-black border-b-2 cursor-pointer transition-all outline-none border-0 ${
            activeTab === 'full' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🌐 Full Prompt Templates (AIDA & Shufflers)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('modular')}
          className={`pb-3 px-4 text-sm font-black border-b-2 cursor-pointer transition-all outline-none border-0 ${
            activeTab === 'modular' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          ✨ Modular Prompt Suggestions
        </button>
      </div>

      {/* CONTENT AREA */}
      {activeTab === 'full' ? (
        <div className="space-y-8 font-sans">
          
          {/* Landing page segment */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl border border-teal-100">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Landing Pages Prompt Blueprints</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Custom layout strategies that power landing projects.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openNewFull('landing')}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-full border-0 cursor-pointer shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Template
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lpTemplates.length > 0 ? (
                lpTemplates.map((tpl, i) => (
                  <div key={tpl.id} className="p-5 rounded-2xl border border-slate-150 hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between gap-4 bg-slate-50/40">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-indigo-600 uppercase tracking-wide">Template #{i+1}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditFull('landing', i)}
                            className="p-1 px-2 border-0 bg-transparent text-slate-400 hover:text-slate-700 cursor-pointer transition-colors text-xs font-bold"
                          >
                            <Edit className="w-3.5 h-3.5 inline mr-1" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFullItem('landing', i)}
                            className="p-1 px-2 border-0 bg-transparent text-slate-400 hover:text-red-500 cursor-pointer transition-colors text-xs font-bold"
                          >
                            <Trash className="w-3.5 h-3.5 inline mr-1" /> Delete
                          </button>
                        </div>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-sm">{tpl.name}</h4>
                      <p className="text-[11px] text-slate-500 font-mono font-medium truncate mt-1">
                        {tpl.template.slice(0, 150)}...
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center p-8 text-slate-400 text-xs font-bold">
                  No custom landing page templates found. Add one to begin shuffling!
                </div>
              )}
            </div>
          </div>

          {/* Commerce Page segment */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">eCommerce Hub Prompt Blueprints</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Complex shopping architectures configurations.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openNewFull('ecommerce')}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-full border-0 cursor-pointer shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Template
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ecTemplates.length > 0 ? (
                ecTemplates.map((tpl, i) => (
                  <div key={tpl.id} className="p-5 rounded-2xl border border-slate-150 hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between gap-4 bg-slate-50/40">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-amber-600 uppercase tracking-wide">Template #{i+1}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditFull('ecommerce', i)}
                            className="p-1 px-2 border-0 bg-transparent text-slate-400 hover:text-slate-700 cursor-pointer transition-colors text-xs font-bold"
                          >
                            <Edit className="w-3.5 h-3.5 inline mr-1" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFullItem('ecommerce', i)}
                            className="p-1 px-2 border-0 bg-transparent text-slate-400 hover:text-red-500 cursor-pointer transition-colors text-xs font-bold"
                          >
                            <Trash className="w-3.5 h-3.5 inline mr-1" /> Delete
                          </button>
                        </div>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-sm">{tpl.name}</h4>
                      <p className="text-[11px] text-slate-500 font-mono font-medium truncate mt-1">
                        {tpl.template.slice(0, 150)}...
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center p-8 text-slate-400 text-xs font-bold">
                  No custom eCommerce prompt templates structured yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm font-sans">
          
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Section Refinement Modular Templates</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">These will pop up as click-to-copy refinement items under student main results.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={openNewMod}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-full border-0 cursor-pointer shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Modular Suggestion
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modularTemplates.map((mod, index) => (
              <div key={mod.id} className="p-5 rounded-2xl border border-slate-150 hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between gap-4 bg-slate-50/30">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      mod.type === 'landing' 
                        ? 'bg-teal-50 border border-teal-150 text-teal-700' 
                        : mod.type === 'ecommerce' 
                        ? 'bg-amber-50 border border-amber-150 text-amber-700' 
                        : 'bg-indigo-50 border border-indigo-150 text-indigo-700'
                    }`}>
                      {mod.type === 'any' ? 'Universal' : mod.type === 'landing' ? 'Landing' : 'eCommerce'}
                    </span>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => openEditMod(index)}
                        className="p-1 px-2 border-0 bg-transparent text-slate-400 hover:text-slate-700 cursor-pointer transition-colors text-xs font-bold"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteModItem(index)}
                        className="p-1 px-2 border-0 bg-transparent text-slate-400 hover:text-red-500 cursor-pointer transition-colors text-xs font-bold"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-sm leading-snug">{mod.name}</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {mod.description || 'No description provided.'}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono italic">
                  <span className="truncate max-w-[85%]">{mod.template.slice(0, 45)}...</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* FULL TEMPLATE ADD/EDIT DIALOG MODAL */}
      {editingFullTemplate && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setEditingFullTemplate(null)}
              className="absolute top-6 right-6 p-2 rounded-full border-0 bg-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  {editingFullTemplate.index === -1 ? 'Structured New' : 'Edit'} {editingFullTemplate.type === 'landing' ? 'Landing Page' : 'eCommerce'} Prompt Blueprint
                </h3>
                <p className="text-[11px] text-slate-500 font-bold">Inject wildcards like <code className="font-mono bg-slate-100 px-1 text-slate-600 rounded">{"{name}"}</code>, <code className="font-mono bg-slate-100 px-1 text-slate-600 rounded">{"{location}"}</code>, <code className="font-mono bg-slate-100 px-1 text-slate-600 rounded">{"{vibe}"}</code>, and <code className="font-mono bg-slate-100 px-1 text-slate-600 rounded">{"{details}"}</code>. These will resolve dynamically during compiles.</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-450 mb-1">Blueprint Template Name</label>
                <input
                  type="text"
                  value={editingFullTemplate.name}
                  onChange={e => setEditingFullTemplate({...editingFullTemplate, name: e.target.value})}
                  className="w-full bg-white text-slate-900 border border-slate-300 shadow-sm rounded-xl p-3 outline-none text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                  placeholder="e.g. Modern Minimalist Multi-Grid Architecture"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-slate-450 mb-1">Full Prompt Body</label>
                <textarea
                  value={editingFullTemplate.template}
                  onChange={e => setEditingFullTemplate({...editingFullTemplate, template: e.target.value})}
                  className="w-full bg-slate-905 border border-slate-205 shadow-sm rounded-xl p-4 outline-none font-mono text-xs leading-relaxed min-h-[300px] h-[350px] max-h-[420px] focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="Insert systemic instructional steps here..."
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6 shrink-0 border-t border-slate-100 mt-6 md:justify-end">
              <button
                type="button"
                onClick={() => setEditingFullTemplate(null)}
                className="px-5 py-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl cursor-pointer text-xs"
              >
                Close / Cancel
              </button>
              <button
                type="button"
                onClick={saveFullDialog}
                disabled={saving}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl border-0 cursor-pointer text-xs flex items-center gap-1.5 shadow-md"
              >
                <Save className="w-4 h-4" /> Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODULAR TEMPLATE ADD/EDIT DIALOG MODAL */}
      {editingModTemplate && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setEditingModTemplate(null)}
              className="absolute top-6 right-6 p-2 rounded-full border-0 bg-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6 font-sans">
              <div className="p-2.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-2xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  {editingModTemplate.index === null ? 'Create New' : 'Edit'} Section Modular Suggestion
                </h3>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">Define specific refined prompts which focus on parts of the page.</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-450 mb-1">Suggestion Title</label>
                  <input
                    type="text"
                    value={editingModTemplate.name}
                    onChange={e => setEditingModTemplate({...editingModTemplate, name: e.target.value})}
                    className="w-full bg-white text-slate-900 border border-slate-300 shadow-sm rounded-xl p-3 outline-none text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                    placeholder="e.g. Testimonial Staggered Grid"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-450 mb-1">Website Target Category</label>
                  <select
                    value={editingModTemplate.type}
                    onChange={e => setEditingModTemplate({...editingModTemplate, type: e.target.value as any})}
                    className="w-full bg-white text-slate-900 border border-slate-300 shadow-sm rounded-xl p-3 outline-none text-xs font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans cursor-pointer"
                  >
                    <option value="any">Universal (Always Visible)</option>
                    <option value="landing">Landing Pages only</option>
                    <option value="ecommerce">eCommerce hubs only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-slate-450 mb-1">Summary Description</label>
                <input
                  type="text"
                  value={editingModTemplate.description}
                  onChange={e => setEditingModTemplate({...editingModTemplate, description: e.target.value})}
                  className="w-full bg-white text-slate-900 border border-slate-300 shadow-sm rounded-xl p-3 outline-none text-xs font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                  placeholder="e.g. Beautiful reviews blocks with profile pictures and quote bubbles."
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-slate-450 mb-1">Modular Prompt Content Template</label>
                <textarea
                  value={editingModTemplate.template}
                  onChange={e => setEditingModTemplate({...editingModTemplate, template: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-205 shadow-sm rounded-xl p-4 outline-none font-mono text-xs leading-relaxed min-h-[160px] focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. Build an executive reviews segment for {name} with high-class testimonials."
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6 shrink-0 border-t border-slate-100 mt-6 sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingModTemplate(null)}
                className="px-5 py-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveModDialog}
                disabled={saving}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl border-0 cursor-pointer text-xs flex items-center gap-1.5 shadow-md"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
