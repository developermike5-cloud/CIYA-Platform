import React, { useState, useEffect, useRef } from 'react';
import { supabase, getStoragePublicUrl } from '../../lib/supabase';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { promptsStore, FullPromptTemplate, ModularPromptTemplate } from '../../utils/promptsStore';
import { 
  Plus, 
  Trash, 
  Edit, 
  Save, 
  Globe, 
  ShoppingBag, 
  Sparkles, 
  AlertCircle, 
  Check, 
  Info, 
  FileText, 
  ChevronRight, 
  X, 
  RefreshCw, 
  ExternalLink, 
  Briefcase,
  Tag,
  Download,
  Upload
} from 'lucide-react';

const DEFAULT_FULL_TEMPLATES: FullPromptTemplate[] = [
  {
    id: 'lp_default_1',
    name: 'Dynamic High-Converting AIDA Framework',
    category: 'Landing Page',
    industry: 'SaaS / Marketing',
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
- Provide direct programming commands to compile this landing page using beautiful standard React functional patterns. Use React hooks for states, standard Tailwind CSS classes directly, and lucide-react icons. Include micro-behavior interactions on buttons and cards using scaling and sliding classes (e.g., 'hover:-translate-y-1 hover:shadow-lg transition-all duration-300').`,
    imageUrl: '',
    videoUrl: '',
    link1: '',
    link2: ''
  },
  {
    id: 'ec_default_1',
    name: 'Interactive Retail Catalog & persistent Cart System',
    category: 'eCommerce',
    industry: 'Fashion / Retail',
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
- Outline clean React functional templates incorporating lucide-react icons and standard Tailwind UI utilities.`,
    imageUrl: '',
    videoUrl: '',
    link1: '',
    link2: ''
  },
  {
    id: 'portfolio_default_1',
    name: 'Creative Agency & Design Portfolio Blueprint',
    category: 'Portfolio Website',
    industry: 'Design / Creative',
    template: `System Instruction:
You are an expert senior design director and front-end developer specializing in High-Fidelity Creative Portfolios. Your job is to draft a gorgeous layout blueprint for a stunning custom portfolio based on the following brand profile:

=== CUSTOM BRAND PROFILE ===
Name / Anchor: {name}
Location / Area: {location}
General Stylization Vibe: {vibe}

RAW DATA SUBMITTED:
"{details}"
==============================

Objective: Design a custom portfolio with asymmetrical galleries, fluid hover states, a bold display header, and project details modal overlays.

Please structure your response into the following clear phases of work:
1. Brand Narrative & Visual Aesthetic
2. Asymmetrical Gallery Layout Architecture
3. Interactive Hover Scaling & Detail Overlay Modals`,
    imageUrl: '',
    videoUrl: '',
    link1: '',
    link2: ''
  }
];

const DEFAULT_MODULAR_TEMPLATES: ModularPromptTemplate[] = [
  {
    id: 'mod_default_1',
    name: 'Hero Section Finetuner',
    category: 'Landing Page',
    industry: 'SaaS / Marketing',
    description: 'Generates sub-prompts focused on building a gorgeous, engaging landing or storefront hero segment.',
    template: 'Act as a production-grade React & Tailwind designer. Draft a stunning, high-converting premium Hero component tailored for {name} based in {location}. Use a modern bold display font, ambient background gradients with blur backdrops, standard responsive layout paddings, and dual call-to-action buttons styled with elegant scaling hover transforms (hover:-translate-y-0.5 hover:shadow-lg transition-all).'
  },
  {
    id: 'mod_default_2',
    name: 'Interactive Glassmorphism Bento Grid',
    category: 'Landing Page',
    industry: 'Agency / Modern Tech',
    description: 'Perfect for listing services, features, or benefits in a trendy modern asymmetrical matrix.',
    template: 'Optimize the features showcase for {name} by designing a high-fidelity asymmetrical 3-column Bento Grid layout. Style each grid block with slate-900 border frames, 5% opacity white glassmorphism fillings, custom glowing focus gradients in the corners, and descriptive lucide icons paired with short, impactful bold titles and subtexts showing off the business advantages.'
  },
  {
    id: 'mod_default_3',
    name: 'eCommerce Product Card Grid & Hover Effects',
    category: 'eCommerce',
    industry: 'Retail / Fashion',
    description: 'Upgrades product displaying cards with slide-in cart modifiers and zoom triggers.',
    template: 'Construct an premium catalog grid segment for {name}. Make each card feature zoom-on-hover image framing, clean bold price tags, quick category labeling pills, and an elegant "Add to Cart" block that unlocks interactive count modifiers once triggered. Ensure robust responsive scaling for mobile, tablet, and desktop screens.'
  },
  {
    id: 'mod_default_4',
    name: 'Modern Interactive FAQ Accordion',
    category: 'Landing Page',
    industry: 'Universal',
    description: 'Renders smooth expandable accordion panels for frequently asked customer questions.',
    template: 'Write a self-contained interactive FAQ Accordion panel for {name}. Include 4 relevant, professionally worded questions about the service based on the profile context. Implement smooth height expands using React hooks, rotating chevron triggers, and hover highlight border responses styled entirely with native Tailwind utility classes.'
  },
  {
    id: 'mod_default_5',
    name: 'High-Impact Testimonials Grid',
    category: 'eCommerce',
    industry: 'Universal',
    description: 'Styled client review card layouts with customized rating metrics.',
    template: 'Formulate an elegant client testimonial showcase section for {name}. Organize 3 distinct high-fidelity customer quotes in a masonry or row layout. Each review card should feature beautiful circular placeholders, bold metadata for reviewer details, gold ratings stars, and quotes written using elegant, italic typography.'
  }
];

// Helper to compress images client-side before sending to Firestore
const compressAndResizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize so maximum side is 250px (JPEG format)
        const MAX_SIDE = 250;
        if (width > height) {
          if (width > MAX_SIDE) {
            height = Math.round((height * MAX_SIDE) / width);
            width = MAX_SIDE;
          }
        } else {
          if (height > MAX_SIDE) {
            width = Math.round((width * MAX_SIDE) / height);
            height = MAX_SIDE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error("Failed to load image for compression"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
};

export default function PromptsAdmin() {
  const [activeTab, setActiveTab] = useState<'full' | 'modular'>('full');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // States for Full Prompt Templates
  const [fullTemplates, setFullTemplates] = useState<FullPromptTemplate[]>([]);

  // States for Modular Prompt Templates
  const [modularTemplates, setModularTemplates] = useState<ModularPromptTemplate[]>([]);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'full' | 'modular'; index: number } | null>(null);

  // Active category filter on the admin list
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');

  // Editing state for Full Template modal
  const [editingFullTemplate, setEditingFullTemplate] = useState<{
    index: number; // -1 if brand new
    id: string;
    name: string;
    category: string;
    industry: string;
    template: string;
    imageUrl?: string;
    videoUrl?: string;
    link1?: string;
    link2?: string;
    isCustomCategory?: boolean;
    customCategoryText?: string;
  } | null>(null);

  // Editing state for Modular Template modal
  const [editingModTemplate, setEditingModTemplate] = useState<{
    index: number | null; // null if brand new
    id: string;
    name: string;
    category: string;
    industry: string;
    description: string;
    template: string;
    imageUrl?: string;
    videoUrl?: string;
    link1?: string;
    link2?: string;
    isCustomCategory?: boolean;
    customCategoryText?: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Scrolling Refs for Add/Edit Template Modals to guarantee they scroll to the top fully when opened
  const fullModalOverlayRef = useRef<HTMLDivElement>(null);
  const modModalOverlayRef = useRef<HTMLDivElement>(null);
  const prevFullOpenRef = useRef(false);
  const prevModOpenRef = useRef(false);

  useEffect(() => {
    const isFullOpen = !!editingFullTemplate;
    const isModOpen = !!editingModTemplate;

    const fullOpened = isFullOpen && !prevFullOpenRef.current;
    const modOpened = isModOpen && !prevModOpenRef.current;

    prevFullOpenRef.current = isFullOpen;
    prevModOpenRef.current = isModOpen;

    if (fullOpened || modOpened) {
      // Smoothly scroll the window to the top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Reset scroll of any outer containers that might have scroll state
      const containers = document.querySelectorAll('.overflow-auto, .overflow-y-auto');
      containers.forEach(el => {
        el.scrollTop = 0;
      });

      // Reset scroll on our modal overlays
      setTimeout(() => {
        if (fullModalOverlayRef.current) {
          fullModalOverlayRef.current.scrollTop = 0;
        }
        if (modModalOverlayRef.current) {
          modModalOverlayRef.current.scrollTop = 0;
        }
      }, 50);
    }
  }, [editingFullTemplate, editingModTemplate]);

  // 1. Fetch templates on load
  useEffect(() => {
    async function loadTemplates() {
      setLoading(true);
      try {
        const migrated = await promptsStore.migrateFromFirestoreIfNeeded();
        if (migrated) {
          showToast("Successfully recovered your custom templates from database backup!");
        }

        // Fetch latest templates directly from the server disk storage
        try {
          await promptsStore.loadFromServer();
        } catch (err) {
          console.warn("Failed to load prompts from server:", err);
        }

        const fulls = promptsStore.getFullTemplates();
        const mods = promptsStore.getModularTemplates();
        
        if (fulls.length === 0) {
          setFullTemplates(DEFAULT_FULL_TEMPLATES);
          await promptsStore.saveFullTemplates(DEFAULT_FULL_TEMPLATES);
        } else {
          setFullTemplates(fulls);
        }

        if (mods.length === 0) {
          setModularTemplates(DEFAULT_MODULAR_TEMPLATES);
          await promptsStore.saveModularTemplates(DEFAULT_MODULAR_TEMPLATES);
        } else {
          setModularTemplates(mods);
        }
      } catch (err) {
        console.error("Error loading prompt templates:", err);
        showToast("Error retrieving templates.");
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();

    const unsubscribe = promptsStore.subscribe((data) => {
      setFullTemplates(data.fullTemplates);
      setModularTemplates(data.modularTemplates);
    });
    return () => unsubscribe();
  }, []);

  // 2. Save full prompts
  const handleSaveFullPrompts = async (list: FullPromptTemplate[]) => {
    setSaving(true);
    try {
      await promptsStore.saveFullTemplates(list);
      showToast("Full blueprint templates updated successfully!");
    } catch (error: any) {
      showToast(`Error: ${error?.message || String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  // 3. Save modular prompts
  const handleSaveModularPrompts = async (mods: ModularPromptTemplate[]) => {
    setSaving(true);
    try {
      await promptsStore.saveModularTemplates(mods);
      showToast("Modular prompt templates saved successfully!");
    } catch (error: any) {
      showToast(`Error: ${error?.message || String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  // Export all templates to a single JSON backup file
  const handleExportAll = () => {
    try {
      const payload = {
        fullTemplates,
        modularTemplates,
        exportedAt: new Date().toISOString()
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "prompt_templates_all.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("Successfully exported prompt_templates_all.json backup file!");
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`);
    }
  };

  // Import templates from a single JSON backup file
  const handleImportAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed) throw new Error("Invalid or empty file.");

        let importedFull = parsed.fullTemplates || parsed.templates;
        let importedModular = parsed.modularTemplates || parsed.modular;

        if (!importedFull && Array.isArray(parsed)) {
          importedFull = parsed;
        }

        if (!Array.isArray(importedFull)) {
          throw new Error("Missing 'fullTemplates' array in JSON backup.");
        }

        const fullList = importedFull as FullPromptTemplate[];
        const modularList = Array.isArray(importedModular) ? (importedModular as ModularPromptTemplate[]) : [];

        setFullTemplates(fullList);
        setModularTemplates(modularList);

        await promptsStore.saveAll(fullList, modularList);
        showToast("Successfully imported templates backup from JSON file!");
      } catch (err: any) {
        showToast(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Extract all active categories currently present in both collections
  const getActiveCategories = () => {
    const list = new Set<string>(['Landing Page', 'eCommerce', 'Portfolio Website']);
    fullTemplates.forEach(t => { if (t.category) list.add(t.category); });
    modularTemplates.forEach(t => { if (t.category) list.add(t.category); });
    return Array.from(list);
  };

  // Full templates utilities
  const openEditFull = (index: number) => {
    const item = fullTemplates[index];
    setEditingFullTemplate({
      index,
      id: item.id,
      name: item.name,
      category: item.category || 'Landing Page',
      industry: item.industry || '',
      template: item.template,
      imageUrl: item.imageUrl || '',
      videoUrl: item.videoUrl || '',
      link1: item.link1 || '',
      link2: item.link2 || '',
      isCustomCategory: false,
      customCategoryText: ''
    });
  };

  const openNewFull = () => {
    setEditingFullTemplate({
      index: -1, // -1 means new
      id: `full_custom_${Date.now()}`,
      name: '',
      category: 'Landing Page',
      industry: '',
      template: '',
      imageUrl: '',
      videoUrl: '',
      link1: '',
      link2: '',
      isCustomCategory: false,
      customCategoryText: ''
    });
  };

  const saveFullDialog = () => {
    if (!editingFullTemplate) return;
    
    const finalCategory = editingFullTemplate.isCustomCategory 
      ? editingFullTemplate.customCategoryText?.trim() 
      : editingFullTemplate.category.trim();

    if (!editingFullTemplate.name.trim() || !finalCategory || !editingFullTemplate.template.trim()) {
      showToast("Error: The 'Blueprint Template Name', 'Category', and 'Full Prompt Body' fields are required.");
      return;
    }

    const { index, id, name, industry, template, imageUrl, videoUrl, link1, link2 } = editingFullTemplate;
    let nextList = [...fullTemplates];

    const newItem: FullPromptTemplate = { 
      id, 
      name: name.trim(), 
      category: finalCategory,
      industry: industry.trim() || 'General',
      template,
      imageUrl: imageUrl || '',
      videoUrl: videoUrl || '',
      link1: link1 || '',
      link2: link2 || ''
    };

    if (index === -1) {
      nextList.push(newItem);
    } else {
      nextList[index] = newItem;
    }

    setFullTemplates(nextList);
    handleSaveFullPrompts(nextList);
    setEditingFullTemplate(null);
  };

  const deleteFullItem = (index: number) => {
    setDeleteConfirm({ type: 'full', index });
  };

  // Modular templates utilities
  const openEditMod = (index: number) => {
    const item = modularTemplates[index];
    setEditingModTemplate({
      index,
      id: item.id,
      name: item.name,
      category: item.category || 'Landing Page',
      industry: item.industry || '',
      description: item.description,
      template: item.template,
      imageUrl: item.imageUrl || '',
      videoUrl: item.videoUrl || '',
      link1: item.link1 || '',
      link2: item.link2 || '',
      isCustomCategory: false,
      customCategoryText: ''
    });
  };

  const openNewMod = () => {
    setEditingModTemplate({
      index: null,
      id: `mod_custom_${Date.now()}`,
      name: '',
      category: 'Landing Page',
      industry: '',
      description: '',
      template: '',
      imageUrl: '',
      videoUrl: '',
      link1: '',
      link2: '',
      isCustomCategory: false,
      customCategoryText: ''
    });
  };

  const saveModDialog = () => {
    if (!editingModTemplate) return;

    const finalCategory = editingModTemplate.isCustomCategory 
      ? editingModTemplate.customCategoryText?.trim() 
      : editingModTemplate.category.trim();

    if (!editingModTemplate.name.trim() || !finalCategory || !editingModTemplate.template.trim()) {
      showToast("Error: The 'Suggestion Title', 'Category', and 'Modular Prompt Content Template' fields are required.");
      return;
    }

    let nextMods = [...modularTemplates];
    const { index, id, name, industry, description, template, imageUrl, videoUrl, link1, link2 } = editingModTemplate;
    const newItem: ModularPromptTemplate = { 
      id, 
      name: name.trim(), 
      category: finalCategory,
      industry: industry.trim() || 'Universal',
      description: description.trim(), 
      template,
      imageUrl: imageUrl || '',
      videoUrl: videoUrl || '',
      link1: link1 || '',
      link2: link2 || ''
    };

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
    setDeleteConfirm({ type: 'modular', index });
  };

  const executeDelete = () => {
    if (!deleteConfirm) return;
    const { type, index } = deleteConfirm;
    if (type === 'full') {
      let nextList = [...fullTemplates];
      if (index >= 0 && index < nextList.length) {
        nextList.splice(index, 1);
        setFullTemplates(nextList);
        handleSaveFullPrompts(nextList);
      }
    } else {
      let nextMods = [...modularTemplates];
      if (index >= 0 && index < nextMods.length) {
        nextMods.splice(index, 1);
        setModularTemplates(nextMods);
        handleSaveModularPrompts(nextMods);
      }
    }
    setDeleteConfirm(null);
  };

  // Helper to upload media file to Cloudinary
  const uploadToSupabaseStorage = async (file: File, bucket: string = 'prompts'): Promise<string> => {
    try {
      const uploadRes = await uploadToCloudinary(file, bucket);
      return uploadRes.url;
    } catch (err: any) {
      console.error("Cloudinary upload failed in PromptsAdmin:", err);
      throw err;
    }
  };

  // Optimized file compression before conversion to Base64 (saves document size space)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isFull: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast("Uploading image to Supabase Cloud Storage...");
      const publicUrl = await uploadToSupabaseStorage(file, 'prompts');
      
      if (isFull) {
        if (editingFullTemplate) {
          setEditingFullTemplate({ ...editingFullTemplate, imageUrl: publicUrl });
        }
      } else {
        if (editingModTemplate) {
          setEditingModTemplate({ ...editingModTemplate, imageUrl: publicUrl });
        }
      }
      showToast("Image uploaded to Supabase Storage successfully!");
    } catch (err) {
      console.warn("Supabase storage upload failed, falling back to compressed base64:", err);
      try {
        showToast("Storage bucket not initialized, converting and compressing to local document...");
        const compressedBase64 = await compressAndResizeImage(file);
        if (isFull) {
          if (editingFullTemplate) {
            setEditingFullTemplate({ ...editingFullTemplate, imageUrl: compressedBase64 });
          }
        } else {
          if (editingModTemplate) {
            setEditingModTemplate({ ...editingModTemplate, imageUrl: compressedBase64 });
          }
        }
        showToast("Image optimized and embedded successfully!");
      } catch (compressErr) {
        console.error(compressErr);
        alert("Error processing image file. Please use a standard JPG/PNG file.");
      }
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isFull: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.webm') && !file.type.includes('webm')) {
      alert("Notice: The phone preview simulator player works best with webm files. Standard webm video format is highly recommended.");
    }

    try {
      showToast("Compressing & uploading media to Cloudinary...");
      const cloudRes = await uploadToCloudinary(file, 'ciya_prompts');
      const publicUrl = cloudRes.url;
      
      if (isFull) {
        if (editingFullTemplate) {
          setEditingFullTemplate({ ...editingFullTemplate, videoUrl: publicUrl });
        }
      } else {
        if (editingModTemplate) {
          setEditingModTemplate({ ...editingModTemplate, videoUrl: publicUrl });
        }
      }
      showToast("Media uploaded to Cloudinary successfully!");
    } catch (err: any) {
      console.error("Cloudinary upload failed:", err);
      showToast(`Media upload failed: ${err?.message || 'Error uploading'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-12">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-500">Retrieving Prompt Templates configuration...</p>
      </div>
    );
  }

  // Categories list for filtering full templates
  const allAvailableCategories = getActiveCategories();
  const filteredFullTemplates = selectedCategoryFilter === 'All' 
    ? fullTemplates 
    : fullTemplates.filter(t => t.category === selectedCategoryFilter);

  return (
    <div className="flex-1 overflow-auto bg-slate-50 text-slate-800 p-6 md:p-8 space-y-6 text-left max-w-7xl mx-auto">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed top-20 right-8 z-[100] border text-white rounded-2xl shadow-xl px-5 py-3.5 flex items-center gap-3 transition-all duration-300 transform translate-y-0 text-xs font-bold font-sans ${
          toastMessage.toLowerCase().includes('error') || toastMessage.toLowerCase().includes('failed')
            ? 'bg-rose-950 border-rose-800'
            : 'bg-slate-900 border-slate-700'
        }`}>
          {toastMessage.toLowerCase().includes('error') || toastMessage.toLowerCase().includes('failed') ? (
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shadow-xl border border-slate-800 font-sans">
        <div className="space-y-1 flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-black text-amber-400">
            <Sparkles className="w-3.5 h-3.5" /> Dynamic Prompt Console
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Academy Prompts & Templates Manager
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl font-semibold">
            Manage your prompts in complete isolation from the backend. Since everything here is loaded statically from the frontend files, students will access templates directly with <strong>zero database queries</strong>.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
          <button
            type="button"
            onClick={handleExportAll}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl border-0 cursor-pointer shadow-lg transition-all"
          >
            <Download className="w-4 h-4" /> Export All Templates JSON
          </button>
          
          <label className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 font-black text-xs rounded-2xl border border-slate-750 cursor-pointer transition-all">
            <Upload className="w-4 h-4" /> Import Backup JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportAll}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Informational Box about Frontend JSON Backups */}
      <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-4 text-xs font-medium text-emerald-900 leading-relaxed space-y-1.5">
        <div className="flex items-center gap-2 font-black uppercase text-[10px] text-emerald-805 tracking-wider">
          <Info className="w-4 h-4 shrink-0 text-emerald-600" /> 📁 Frontend Storage & Offline-First Mode Active
        </div>
        <p>
          <strong>Excellent!</strong> Your prompt templates are now served completely from the frontend, meaning they are lightning-fast with <strong>zero database queries</strong> and <strong>no 1MB Firestore limit warnings</strong>.
        </p>
        <p className="text-[11px] text-emerald-800">
          👉 <strong>How to save permanently:</strong> Any changes you save here are automatically synced to your browser and written immediately to local code files in development. After making your edits, click <strong>"Export All Templates JSON"</strong> above to download your backup. Simply upload that file to the AI in our chat, and the changes will be built permanently into your live code!
        </p>
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
          🌐 Full Prompt Templates Blueprints
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
          ✨ Modular Section Suggestions
        </button>
      </div>

      {/* CONTENT AREA */}
      {activeTab === 'full' ? (
        <div className="space-y-6 font-sans animate-in fade-in duration-200">
          
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Prompt Blueprint Templates ({filteredFullTemplates.length})</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Define master prompts grouped by project categories.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Category filter pills */}
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="bg-slate-100 border-0 outline-none text-xs font-bold text-slate-700 px-3.5 py-2.5 rounded-full cursor-pointer hover:bg-slate-200 transition-all"
                >
                  <option value="All">All Categories ({fullTemplates.length})</option>
                  {allAvailableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={openNewFull}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-full border-0 cursor-pointer shadow-sm transition-all whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Blueprint
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredFullTemplates.length > 0 ? (
                filteredFullTemplates.map((tpl) => {
                  // Find index in original master array for correct editing pointer
                  const originalIndex = fullTemplates.findIndex(item => item.id === tpl.id);
                  return (
                    <div key={tpl.id} className="p-5 rounded-2xl border border-slate-150 hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between gap-4 bg-slate-50/40">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-700">
                              {tpl.category}
                            </span>
                            {tpl.industry && (
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-650">
                                <Briefcase className="w-2.5 h-2.5" /> {tpl.industry}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditFull(originalIndex)}
                              className="p-1 px-2 border-0 bg-transparent text-slate-400 hover:text-slate-700 cursor-pointer transition-colors text-xs font-bold"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteFullItem(originalIndex)}
                              className="p-1 px-2 border-0 bg-transparent text-slate-400 hover:text-red-500 cursor-pointer transition-colors text-xs font-bold"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <h4 className="font-extrabold text-slate-800 text-sm leading-snug">{tpl.name}</h4>
                        <p className="text-[11px] text-slate-500 font-mono font-medium line-clamp-3 mt-1 leading-relaxed bg-white/50 border border-slate-100 p-2.5 rounded-xl">
                          {tpl.template.slice(0, 180)}...
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span className="flex items-center gap-1">
                          {tpl.imageUrl ? '✓ Image' : 'No Image'} • {tpl.videoUrl ? '✓ Video' : 'No Video'}
                        </span>
                        <span>
                          {(tpl.link1 || tpl.link2) ? '✓ Attached Resources' : 'No Resources'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center p-12 text-slate-400 text-xs font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  No template blueprints found matching this category. Click 'Add New Blueprint' to create one!
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm font-sans animate-in fade-in duration-200">
          
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Section Refinement Modular Templates ({modularTemplates.length})</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Define quick sub-prompts which focus on parts of the page (Hero, FAQ, Bento, etc.).</p>
              </div>
            </div>
            <button
              type="button"
              onClick={openNewMod}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-full border-0 cursor-pointer shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Modular Suggestion
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modularTemplates.map((mod, index) => (
              <div key={mod.id} className="p-5 rounded-2xl border border-slate-150 hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between gap-4 bg-slate-50/30">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-700">
                        {mod.category || 'Universal'}
                      </span>
                      {mod.industry && (
                        <span className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-650">
                          {mod.industry}
                        </span>
                      )}
                    </div>
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
        <div ref={fullModalOverlayRef} className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white border rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl relative animate-in fade-in zoom-in duration-200 my-8">
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
                  {editingFullTemplate.index === -1 ? 'Structured New' : 'Edit'} Prompt Blueprint Template
                </h3>
                <p className="text-[11px] text-slate-500 font-bold">Inject wildcards like <code className="font-mono bg-slate-100 px-1 text-slate-600 rounded">{"{name}"}</code>, <code className="font-mono bg-slate-100 px-1 text-slate-600 rounded">{"{location}"}</code>, <code className="font-mono bg-slate-100 px-1 text-slate-600 rounded">{"{vibe}"}</code>, and <code className="font-mono bg-slate-100 px-1 text-slate-600 rounded">{"{details}"}</code>.</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-sans">
              
              {/* PRIMARY PROPERTIES AT THE TOP (NAME, CATEGORY, INDUSTRY) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-450 mb-1">Blueprint Template Name</label>
                  <input
                    type="text"
                    value={editingFullTemplate.name}
                    onChange={e => setEditingFullTemplate({...editingFullTemplate, name: e.target.value})}
                    className="w-full bg-white text-slate-900 border border-slate-350 shadow-sm rounded-xl p-3 outline-none text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                    placeholder="e.g. Modern Minimalist Multi-Grid Architecture"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-450 mb-1">Website Category</label>
                  <select
                    value={editingFullTemplate.isCustomCategory ? '__custom__' : editingFullTemplate.category}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setEditingFullTemplate({
                          ...editingFullTemplate,
                          isCustomCategory: true,
                          category: 'Custom Category'
                        });
                      } else {
                        setEditingFullTemplate({
                          ...editingFullTemplate,
                          isCustomCategory: false,
                          category: val
                        });
                      }
                    }}
                    className="w-full bg-white text-slate-900 border border-slate-350 shadow-sm rounded-xl p-3 outline-none text-xs font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans cursor-pointer"
                  >
                    <option value="Landing Page">Landing Page</option>
                    <option value="eCommerce">eCommerce</option>
                    <option value="Portfolio Website">Portfolio Website</option>
                    {allAvailableCategories.filter(cat => cat !== 'Landing Page' && cat !== 'eCommerce' && cat !== 'Portfolio Website').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__custom__">+ Add Custom Category...</option>
                  </select>

                  {/* CUSTOM CATEGORY INPUT */}
                  {editingFullTemplate.isCustomCategory && (
                    <input
                      type="text"
                      value={editingFullTemplate.customCategoryText || ''}
                      onChange={e => setEditingFullTemplate({...editingFullTemplate, customCategoryText: e.target.value})}
                      className="w-full mt-2 bg-indigo-50 border border-indigo-250 text-indigo-950 placeholder-indigo-400 shadow-sm rounded-xl p-2.5 outline-none text-xs font-semibold focus:border-indigo-500 transition-all font-sans"
                      placeholder="Type custom category name..."
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-450 mb-1">Target Industry / Niche</label>
                  <input
                    type="text"
                    value={editingFullTemplate.industry}
                    onChange={e => setEditingFullTemplate({...editingFullTemplate, industry: e.target.value})}
                    className="w-full bg-white text-slate-900 border border-slate-355 shadow-sm rounded-xl p-3 outline-none text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                    placeholder="e.g. Real Estate, SaaS, Creative, Medical"
                  />
                </div>
              </div>

              {/* MEDIA ATTACHMENTS (IMAGE, VIDEO) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] uppercase font-black text-slate-450">Attached Image Preview</label>
                    <span className="text-[9px] text-slate-400 font-bold">Auto-compresses uploaded photos</span>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, true)}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Or paste direct image link (URL)"
                        value={editingFullTemplate.imageUrl || ''}
                        onChange={(e) => setEditingFullTemplate({ ...editingFullTemplate, imageUrl: e.target.value })}
                        className="flex-1 bg-white text-slate-900 border border-slate-300 shadow-sm rounded-xl p-2.5 outline-none text-xs font-semibold focus:border-indigo-500 transition-all"
                      />
                      {editingFullTemplate.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setEditingFullTemplate({ ...editingFullTemplate, imageUrl: '' })}
                          className="px-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border-0 cursor-pointer text-[10px] font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {editingFullTemplate.imageUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                          <img src={editingFullTemplate.imageUrl} alt="Attached Preview" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold truncate max-w-[200px]">✓ Loaded preview asset</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] uppercase font-black text-slate-455">Live Showcase / Website Preview URL</label>
                    <span className="text-[9px] text-indigo-600 font-bold">Upload Video walkthrough / Paste Link</span>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="video/*,image/*"
                      onChange={(e) => handleVideoUpload(e, true)}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Or paste direct preview link (URL)"
                        value={editingFullTemplate.videoUrl || ''}
                        onChange={(e) => setEditingFullTemplate({ ...editingFullTemplate, videoUrl: e.target.value })}
                        className="flex-1 bg-white text-slate-900 border border-slate-300 shadow-sm rounded-xl p-2.5 outline-none text-xs font-semibold focus:border-indigo-500 transition-all"
                      />
                      {editingFullTemplate.videoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditingFullTemplate({ ...editingFullTemplate, videoUrl: '' })}
                          className="px-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border-0 cursor-pointer text-[10px] font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {editingFullTemplate.videoUrl && (
                      <div className="mt-2 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <span>✓ Live Preview URL Attached</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* REFERENCE RESOURCES (LINK 1 & LINK 2) */}
              <div className="border border-indigo-100 bg-indigo-50/20 p-4 rounded-2xl space-y-3 mt-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-indigo-500" />
                  <div>
                    <h5 className="font-extrabold text-slate-800 text-xs">Attached Reference Resource Links</h5>
                    <p className="text-[10px] text-slate-450 font-semibold">What are these links? These let you pin design specs, interactive wireframes, Figma workspaces, or boilerplate codes that students can directly launch in new tabs to guide their work!</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase font-black text-indigo-600 mb-1">Resource Link 1 (e.g. Figma, Live Showcase)</label>
                    <input
                      type="url"
                      value={editingFullTemplate.link1 || ''}
                      onChange={(e) => setEditingFullTemplate({ ...editingFullTemplate, link1: e.target.value })}
                      className="w-full bg-white text-slate-900 border border-slate-300 shadow-sm rounded-xl p-3 outline-none text-xs font-semibold focus:border-indigo-500 transition-all"
                      placeholder="e.g. https://figma.com/file/inspiration"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-indigo-600 mb-1">Resource Link 2 (e.g. Reference Code, Instructions)</label>
                    <input
                      type="url"
                      value={editingFullTemplate.link2 || ''}
                      onChange={(e) => setEditingFullTemplate({ ...editingFullTemplate, link2: e.target.value })}
                      className="w-full bg-white text-slate-900 border border-slate-300 shadow-sm rounded-xl p-3 outline-none text-xs font-semibold focus:border-indigo-500 transition-all"
                      placeholder="e.g. https://github.com/repository/boilerplate"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-slate-450 mb-1">Full Prompt Body</label>
                <textarea
                  value={editingFullTemplate.template}
                  onChange={e => setEditingFullTemplate({...editingFullTemplate, template: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 shadow-sm rounded-xl p-4 outline-none font-mono text-xs leading-relaxed min-h-[250px] h-[250px] max-h-[300px] focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-850"
                  placeholder="Insert systemic instructional steps here..."
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6 shrink-0 border-t border-slate-150 mt-6 md:justify-end">
              <button
                type="button"
                onClick={() => setEditingFullTemplate(null)}
                className="px-5 py-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl cursor-pointer text-xs border-0"
              >
                Close / Cancel
              </button>
              <button
                type="button"
                onClick={saveFullDialog}
                disabled={saving}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl border-0 cursor-pointer text-xs flex items-center gap-1.5 shadow-md"
              >
                <Save className="w-4 h-4" /> Save blueprint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODULAR TEMPLATE ADD/EDIT DIALOG MODAL */}
      {editingModTemplate && (
        <div ref={modModalOverlayRef} className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white border rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl relative animate-in fade-in zoom-in duration-200 my-8">
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
              
              {/* PRIMARY FIELDS AT TOP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-450 mb-1">Suggestion Title</label>
                  <input
                    type="text"
                    value={editingModTemplate.name}
                    onChange={e => setEditingModTemplate({...editingModTemplate, name: e.target.value})}
                    className="w-full bg-white text-slate-900 border border-slate-350 shadow-sm rounded-xl p-3 outline-none text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                    placeholder="e.g. Testimonial Staggered Grid"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-455 mb-1">Target Category</label>
                  <select
                    value={editingModTemplate.isCustomCategory ? '__custom__' : editingModTemplate.category}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setEditingModTemplate({
                          ...editingModTemplate,
                          isCustomCategory: true,
                          category: 'Custom Category'
                        });
                      } else {
                        setEditingModTemplate({
                          ...editingModTemplate,
                          isCustomCategory: false,
                          category: val
                        });
                      }
                    }}
                    className="w-full bg-white text-slate-900 border border-slate-350 shadow-sm rounded-xl p-3 outline-none text-xs font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans cursor-pointer"
                  >
                    <option value="Landing Page">Landing Page</option>
                    <option value="eCommerce">eCommerce</option>
                    <option value="Portfolio Website">Portfolio Website</option>
                    {allAvailableCategories.filter(cat => cat !== 'Landing Page' && cat !== 'eCommerce' && cat !== 'Portfolio Website').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__custom__">+ Add Custom Category...</option>
                  </select>

                  {/* CUSTOM CATEGORY INPUT */}
                  {editingModTemplate.isCustomCategory && (
                    <input
                      type="text"
                      value={editingModTemplate.customCategoryText || ''}
                      onChange={e => setEditingModTemplate({...editingModTemplate, customCategoryText: e.target.value})}
                      className="w-full mt-2 bg-indigo-50 border border-indigo-250 text-indigo-950 placeholder-indigo-400 shadow-sm rounded-xl p-2.5 outline-none text-xs font-semibold focus:border-indigo-500 transition-all font-sans"
                      placeholder="Type custom category name..."
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-450 mb-1">Industry (Optional)</label>
                  <input
                    type="text"
                    value={editingModTemplate.industry}
                    onChange={e => setEditingModTemplate({...editingModTemplate, industry: e.target.value})}
                    className="w-full bg-white text-slate-900 border border-slate-350 shadow-sm rounded-xl p-3 outline-none text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                    placeholder="e.g. Fashion, SaaS, Universal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-slate-450 mb-1">Summary Description</label>
                <input
                  type="text"
                  value={editingModTemplate.description}
                  onChange={e => setEditingModTemplate({...editingModTemplate, description: e.target.value})}
                  className="w-full bg-white text-slate-900 border border-slate-350 shadow-sm rounded-xl p-3 outline-none text-xs font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                  placeholder="e.g. Beautiful reviews blocks with profile pictures and quote bubbles."
                />
              </div>

              {/* MEDIA ATTACHMENTS (IMAGE, VIDEO) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] uppercase font-black text-slate-450">Attached Image Preview</label>
                    <span className="text-[9px] text-slate-400 font-bold">Auto-compresses uploaded photos</span>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, false)}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Or paste direct image URL"
                        value={editingModTemplate.imageUrl || ''}
                        onChange={(e) => setEditingModTemplate({ ...editingModTemplate, imageUrl: e.target.value })}
                        className="flex-1 bg-white text-slate-900 border border-slate-300 shadow-sm rounded-xl p-2.5 outline-none text-xs font-semibold focus:border-indigo-500 transition-all"
                      />
                      {editingModTemplate.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setEditingModTemplate({ ...editingModTemplate, imageUrl: '' })}
                          className="px-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border-0 cursor-pointer text-[10px] font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {editingModTemplate.imageUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                          <img src={editingModTemplate.imageUrl} alt="Attached Preview" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] uppercase font-black text-slate-455">Live Showcase / Website Preview URL</label>
                    <span className="text-[9px] text-indigo-600 font-bold">Upload Video walkthrough / Paste Link</span>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="video/*,image/*"
                      onChange={(e) => handleVideoUpload(e, false)}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Or paste direct preview link (URL)"
                        value={editingModTemplate.videoUrl || ''}
                        onChange={(e) => setEditingModTemplate({ ...editingModTemplate, videoUrl: e.target.value })}
                        className="flex-1 bg-white text-slate-900 border border-slate-300 shadow-sm rounded-xl p-2.5 outline-none text-xs font-semibold focus:border-indigo-500 transition-all"
                      />
                      {editingModTemplate.videoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditingModTemplate({ ...editingModTemplate, videoUrl: '' })}
                          className="px-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border-0 cursor-pointer text-[10px] font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {editingModTemplate.videoUrl && (
                      <div className="mt-2 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <span>✓ Live Preview URL Attached</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* REFERENCE RESOURCES (LINK 1 & LINK 2) */}
              <div className="border border-indigo-100 bg-indigo-50/20 p-4 rounded-2xl space-y-3 mt-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-indigo-500" />
                  <div>
                    <h5 className="font-extrabold text-slate-800 text-xs">Attached Reference Resource Links</h5>
                    <p className="text-[10px] text-slate-450 font-semibold font-sans">Pins interactive tools, code templates, or mockups for this modular segment.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase font-black text-indigo-600 mb-1">Resource Link 1</label>
                    <input
                      type="url"
                      value={editingModTemplate.link1 || ''}
                      onChange={(e) => setEditingModTemplate({ ...editingModTemplate, link1: e.target.value })}
                      className="w-full bg-white text-slate-900 border border-slate-300 shadow-sm rounded-xl p-3 outline-none text-xs font-semibold focus:border-indigo-500 transition-all"
                      placeholder="e.g. https://figma.com/file/inspiration"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-indigo-600 mb-1">Resource Link 2</label>
                    <input
                      type="url"
                      value={editingModTemplate.link2 || ''}
                      onChange={(e) => setEditingModTemplate({ ...editingModTemplate, link2: e.target.value })}
                      className="w-full bg-white text-slate-900 border border-slate-300 shadow-sm rounded-xl p-3 outline-none text-xs font-semibold focus:border-indigo-500 transition-all"
                      placeholder="e.g. https://example.com/demo"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-slate-450 mb-1">Modular Prompt Content Template</label>
                <textarea
                  value={editingModTemplate.template}
                  onChange={e => setEditingModTemplate({...editingModTemplate, template: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 shadow-sm rounded-xl p-4 outline-none font-mono text-xs leading-relaxed min-h-[160px] focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. Build an executive reviews segment for {name} with high-class testimonials."
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6 shrink-0 border-t border-slate-150 mt-6 sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingModTemplate(null)}
                className="px-5 py-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl cursor-pointer text-xs border-0"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveModDialog}
                disabled={saving}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl border-0 cursor-pointer text-xs flex items-center gap-1.5 shadow-md"
              >
                <Save className="w-4 h-4" /> Save modular prompt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[1100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h3 className="font-extrabold text-slate-900 text-base mb-2">Delete Template Blueprint?</h3>
            <p className="text-xs text-slate-500 font-semibold mb-6 leading-relaxed">
              Are you sure you want to permanently delete this {deleteConfirm.type === 'full' ? 'blueprint template' : 'modular suggestion template'}? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl cursor-pointer text-xs border-0"
              >
                Cancel / Keep
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl border-0 cursor-pointer text-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
