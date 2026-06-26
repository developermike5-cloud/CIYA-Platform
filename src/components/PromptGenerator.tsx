import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp,
  doc,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { 
  Copy, 
  Check, 
  Sparkles, 
  Globe, 
  ShoppingBag, 
  Code, 
  ArrowRight, 
  Download, 
  RefreshCw, 
  AlertCircle, 
  Layers, 
  Clipboard, 
  X, 
  FolderHeart, 
  Save, 
  Trash2, 
  BookOpen, 
  Briefcase 
} from 'lucide-react';

interface PromptGeneratorProps {
  isLocked?: boolean;
}

interface FullTemplate {
  id: string;
  name: string;
  template: string;
}

const PRESETS = [
  {
    name: 'Luxe Flora',
    type: 'ecommerce',
    industry: 'Floristry & Gifting Boutique',
    desc: 'Luxe Flora - A premium boutique flower delivery service based in Manchester. We specialize in luxury organic roses, seasonal hand-wrapped wildflower bouquets, and hand-poured aromatherapy soy candles. Target audience: Couples, event planners, and luxury gifts buyers. Brand vibe: Minimalist, clean, elegant, with soft pink, sage green, and warm cream palettes. Font pairing: Playfair Display for headings and Inter for description copy.'
  },
  {
    name: 'Apex Strength Gear',
    type: 'ecommerce',
    industry: 'Strength & Athletics Equipment',
    desc: 'Apex Strength Gear - High-performance weightlifting gear and wraps designed for powerlifters and strength athletes. Products include neoprene knee sleeves, heavy-duty lever lifting belts, wrist wraps, and industrial-strength athletic shirts. Target audience: Intense gym-goers, competitive weightlifters. Brand vibe: Aggressive, high-contrast, modern brutalist, industrial charcoal dark background, with glowing amber-yellow accents. Font pairing: Space Grotesk and Fira Code.'
  },
  {
    name: 'EcoClean Janitor Services',
    type: 'landing',
    industry: 'Eco-Friendly Cleaning Services',
    desc: 'EcoClean Solutions - A neighborhood-first commercial and residential cleaning service using 100% biodegradable, certified non-toxic green cleaning formulas. Based in Vancouver. Target audience: Health-conscious families, local boutique retail stores, and offices wanting sustainable corporate social responsibility. Brand vibe: Trustworthy, fresh, light, featuring vibrant forest green and sky blue highlights on a pure off-white canvas. Font pairing: Outfit and Inter.'
  }
];

// Fallback high-fidelity full templates
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

interface ModularPromptItem {
  sectionName: string;
  description: string;
  prompt: string;
}

const MODULAR_PROMPTS_MATRIX: Record<string, Record<string, ModularPromptItem[]>> = {
  visuals: {
    healthcare: [
      {
        sectionName: "Hero Banner Segment with Doctor Trust Indicators",
        description: "Focuses on developing a trustworthy visual hero section featuring modern patient appointment links.",
        prompt: "System Instruction:\nYou are an expert UI designer. Generate a high-converting Hero banner section for a health/medical platform. Structure a 2-column layout. Column 1: A premium typography pairing (Outfit for display, Inter for body) stating a clear patient-first value proposition, with dual-actions for 'Schedule Online' and 'Our Doctors' styled as bold pills. Column 2: A floating glassmorphic clinic details card with green ambient badges indicating '24/7 Support Available' and 'Verified Medical Partners'. Use a clean, sterile teal and pure off-white color scheme."
      },
      {
        sectionName: "Clinical Departments Grid with Hover Transitions",
        description: "Creates an interactive layout for medical departments or specialties with elegant icon overlays.",
        prompt: "System Instruction:\nDesign a beautiful, responsive 4-column clinical specialties grid. Each card must feature a micro-hover scale effect, generous padding, custom lucide-react icons (Stethoscope, Heart, Brain, Baby), a bold Department title, and a list of key treatable symptoms. Style with high-contrast slate background, border outlines, and subtle glow highlights."
      },
      {
        sectionName: "Interactive Specialist Profiles Carousel",
        description: "Layout for physician profiles with filters, rating scores, and direct booking click prompts.",
        prompt: "System Instruction:\nDraft a modular physician spotlight section. Structure responsive cards each with an circular verified profile avatar, verified medical credentials, custom experience metrics, and a direct reservation link. Animate card exits with smooth fade transitions."
      }
    ],
    realestate: [
      {
        sectionName: "Grand Residential Hero Portfolio View",
        description: "Designs a massive high-contrast slider layout for luxury properties.",
        prompt: "System Instruction:\nCraft a visually stunning luxury Real Estate Hero layout. Propose an asymmetric split banner featuring a high-definition property backdrop, glassmorphism info box outlining 'Price', 'Location', and 'Beds/Baths' metrics, and a premium sliding dark button 'Schedule Private Viewing'."
      },
      {
        sectionName: "Bento Grid Property Showcase",
        description: "Features different listings in a modern, mismatched bento grid format.",
        prompt: "System Instruction:\nBuild an asymmetric 3-column Bento Grid container showcasing premier residential properties. Ensure the center card occupies double height/width for featured listings, featuring tag badges like 'Hot Deal' or 'Newly Listed', with elegant background gradient overlays."
      },
      {
        sectionName: "Neighborhood Highlights Interactive Card",
        description: "Section to highlight nearby schools, parks, and convenience facilities.",
        prompt: "System Instruction:\nDesign a neighborhood lifestyle section. Create a 3-part layout showcasing nearby amenities (Schools, Transit, Dining) using bold metrics, custom service cards, and rich spacing."
      }
    ],
    ecommerce: [
      {
        sectionName: "Luxury Boutique Welcome Hero banner",
        description: "Premium welcome slider showcasing high-end products with minimal designs.",
        prompt: "System Instruction:\nGenerate a minimalist fashion eCommerce Hero section. Style a pure Warm Sand background, featuring large editorial serif headings, high-contrast black action buttons with immediate scale-on-hover triggers, and secondary luxury brand attributes."
      },
      {
        sectionName: "Category Spotlight Bubble Grid",
        description: "Visual entry points for browsing different shop categories.",
        prompt: "System Instruction:\nDesign a gorgeous Category Grid displaying shop highlights (e.g. Summer Collections, Accessories, Footwear). Use rounded borders, center brand labels, and zoom effects on mouse enter."
      },
      {
        sectionName: "Premium Product Detail Hero Focal Panel",
        description: "Focus layout to highlight a single flagship product with color options.",
        prompt: "System Instruction:\nFormulate an premium 2-column flagship product detail layout. Include interactive color picker dots, clear price discount indicators, verified stock labels, and a striking 'Add to Shopping Bag' button."
      }
    ],
    software: [
      {
        sectionName: "Modern SaaS Console Hero Section",
        description: "Visual mock-up of an app dashboard inside a clean browser shell.",
        prompt: "System Instruction:\nDesign a high-tech SaaS Hero container. Left side: Bold premium font 'Space Grotesk' headings emphasizing developer speed, with orange accents and verified security badges. Right side: A stunning glass-look mockup showcasing metric charts and telemetry summaries."
      },
      {
        sectionName: "Integration Partners Logo Cloud",
        description: "Smooth horizontal ticker showing logos of supported software tools.",
        prompt: "System Instruction:\nBuild a clean horizontal list of client/partner integration logo clouds. Use grayscale utility filters that transition to colored on hover, framed with subtle gradients for a fading infinite scroll feeling."
      },
      {
        sectionName: "Features Bento Grid Block",
        description: "Arranges technical feature benefits in a clean interactive grid.",
        prompt: "System Instruction:\nCreate a high-contrast developer feature Bento Grid with responsive cards. Each grid block represents a SaaS solution with custom JetBrains Mono code tags, and border glowing animations."
      }
    ],
    services: [
      {
        sectionName: "Home Services Hero with Instant Quote Input",
        description: "Hero split section with a quick ZIP-code check or cost estimator.",
        prompt: "System Instruction:\nCraft a Commercial Services Hero interface. Include an instant booking ZIP code validator form to verify service range availability, a clear rating gauge ('5-Star Rated Neighborhood Cleaner'), and a bold CTA button."
      },
      {
        sectionName: "Service Coverage Area Flex Grid",
        description: "Visual layout showing regions and neighborhoods served with maps references.",
        prompt: "System Instruction:\nBuild a multi-region service coverage area selector. Structure elegant cards indicating service availability, with checkmark indicators and customized regional guides."
      },
      {
        sectionName: "Before & After Interactive Work Card",
        description: "Showcases professional work quality using slider elements.",
        prompt: "System Instruction:\nDesign a high-fidelity 'Before & After' work gallery section. Propose clean slider controls to swap images, with descriptive results cards, metrics achieved, and a free estimate request form."
      }
    ]
  },
  interactivity: {
    healthcare: [
      {
        sectionName: "Dynamic Patient Booking System Popup",
        description: "Appointment scheduling layout with step indicators and slot selection.",
        prompt: "System Instruction:\nExplain the React state flow and render the UI code for a modern patient booking modal. Show calendar date slots, specialty departments list, physician selects, and secure submit actions."
      },
      {
        sectionName: "Interactive Diagnosis Helper Card",
        description: "Self-screening quiz layout to point patients to the right specialty.",
        prompt: "System Instruction:\nFormulate a clinical diagnostic recommendation wizard component. Create clean radio select groups, step progress bar, and final customized care recommendations with matching doctor booking triggers."
      },
      {
        sectionName: "Patient Portal Intake Form Sheet",
        description: "Secure intake forms with validation and private-data protection notices.",
        prompt: "System Instruction:\nBuild a beautiful patient registration form sheet. Create organized grid fields for profile info, medical history, and pre-arrival questionnaires, styled with clear visual validation boundaries."
      }
    ],
    realestate: [
      {
        sectionName: "Direct Property Tour Coordinator Panel",
        description: "Appointment scheduler specifically tailored for scheduling on-site visits.",
        prompt: "System Instruction:\nCreate a dynamic property showing booking panel. Allow prospects to choose 'In Person' or 'Virtual Video Tour', picker dates, preferred tour hours, and direct phone/email contact fields."
      },
      {
        sectionName: "Real Estate Financial Estimator",
        description: "An interactive calculator to estimate monthly mortgage or installment rates.",
        prompt: "System Instruction:\nDraft a mortgage installment estimator widget. Structure slider components for 'Property Valuation', 'Down Payment', and 'Interest Rate'. Provide instant calculations for monthly billing fees on change."
      },
      {
        sectionName: "Agent Consultation Chat Overlay",
        description: "Live consultation widget simulating real agent chat queues.",
        prompt: "System Instruction:\nCreate an interactive expert agent callback drawer. Features circular expert profile photos, list of active agents, custom messaging inputs, and instant callback scheduler."
      }
    ],
    ecommerce: [
      {
        sectionName: "Mini Shopping Cart Drawer with Quantity Modifiers",
        description: "A sliding side-panel list of items in cart with real-time math calculations.",
        prompt: "System Instruction:\nDesign a professional persistent shopping cart slide-drawer. Features additions and subtractions of items, automatic coupon input field, dynamic line item subtotals, and a direct Checkout button."
      },
      {
        sectionName: "Inside Checkout Order Wizard",
        description: "Fast customer checkout experience with validation and card input fields.",
        prompt: "System Instruction:\nDraft a multi-step checkout form flow. Step 1: Shipment address; Step 2: Payment options with custom security icons; Step 3: Receipt order checklist. Include responsive validation states."
      },
      {
        sectionName: "Product Grid Filter Sidebar",
        description: "Sidebar with slider for price, checkboxes for categories and colors.",
        prompt: "System Instruction:\nStructure an exhaustive Catalog Filtering sidebar. Include checkboxes for Brand Collections, range sliders for Price, color swatch bubble selectors, and clear-all filter buttons."
      }
    ],
    software: [
      {
        sectionName: "Dynamic SaaS Pricing Slider with Tier Calculator",
        description: "Slide to select active users and see pricing changes across all tiers.",
        prompt: "System Instruction:\nDesign a beautiful SaaS price level calculator sliding widget. As the range bar slides (e.g. from 10 to 1000 users), adjust dynamic prices for Hobbyist, Growth, and Unlimited tiers instantly with custom highlighted tags."
      },
      {
        sectionName: "Interactive Live API Code Snippet Switcher",
        description: "Selector to change code languages between JS, Python, Go in a styled terminal.",
        prompt: "System Instruction:\nBuild a high-fidelity code playground viewer. Include tabs for 'Node.js', 'Python', 'Go'. When users swap tabs, display custom syntax-colored blocks in a styled console with copy-code buttons."
      },
      {
        sectionName: "Interactive Feature Accordion Tabs",
        description: "Swaps active feature tabs with screenshot mockups or diagrams beautifully.",
        prompt: "System Instruction:\nCraft a modern tabbed features panel. Left side: lists 3 product characteristics. On clicking a characteristic, scale up the title and update the right-side graphic mock representation."
      }
    ],
    services: [
      {
        sectionName: "Dynamic Service Cost Calculator Flow",
        description: "Form selector to choose room count, service frequency and compute live prices.",
        prompt: "System Instruction:\nCreate a commercial cost calculator form. Let the client select 'Rooms to Clean', 'Service Frequency (weekly, biweekly)', and compute direct subtotal estimates with checkout booking buttons."
      },
      {
        sectionName: "Zip Code Serviceability Checker Form",
        description: "Instant address verification form displaying custom success or waitlist cards.",
        prompt: "System Instruction:\nDesign a Zip Code Checker container. Users type their area ZIP code. On submit, play a temporary loading state, then render either a green approved service badge or a waitlist signup form."
      },
      {
        sectionName: "Interactive Cleaning Package Selector Grid",
        description: "Sleek tab control comparing Deep Clean, Standard Clean, and Office packages.",
        prompt: "System Instruction:\nBuild a beautiful service standard package selector tab layout. Swapping tabs updates direct feature comparison checklist grids with matching price metrics and booking links."
      }
    ]
  },
  conversion: {
    healthcare: [
      {
        sectionName: "Clinic Trust Seals & Accreditation Cloud",
        description: "Showcases verified hospital partner logos, HIPAA compliance tags, and clinic awards.",
        prompt: "System Instruction:\nFormulate a trustworthy medical accreditation cloud. Render high-contrast custom badges for 'HIPAA Compliant', 'Certified Pediatric Care', and national hospital partner outlines."
      },
      {
        sectionName: "Patient Verified Testimonials Carousel",
        description: "Elegant testimonial card slider with high patient satisfaction scores.",
        prompt: "System Instruction:\nDesign a verified patient success carousel. Display high ratings, patient quote, and doctor response segments to establish strong professional credibility."
      },
      {
        sectionName: "Comprehensive FAQ Accordion with Clinic Policies",
        description: "Collapsible accordion addressing clinical payments, medical insurance, and parking details.",
        prompt: "System Instruction:\nCraft a robust medical FAQ accordion. Pre-populate 4 critical clinical queries regarding insurance support and appointment rescheduling constraints with highlight effects."
      }
    ],
    realestate: [
      {
        sectionName: "Realtor Sales Performance Stats Grid",
        description: "Sleek card showcasing total deals closed, years expert, and average buyer reviews.",
        prompt: "System Instruction:\nDesign a high-contrast Agent Performance statistics strip. Use large bold display digits (e.g. '98%', '$400M+') reporting verified sales volume, with subtle descriptors."
      },
      {
        sectionName: "Client Success Story Spotlight & Video Tour Review",
        description: "Deep testimonial layout highlighting real families purchasing homes.",
        prompt: "System Instruction:\nBuild a house-buying success spotlight section. Features family quote, custom profile tags, pictures of bought home, and direct review references."
      },
      {
        sectionName: "Real Estate Trust & Risk Reversal Guarantees",
        description: "Cards outlining professional agent fiduciary duties, free valuations, and escrow protections.",
        prompt: "System Instruction:\nFormulate a real estate trust and warranty feature row. Present 3 primary fiduciary guarantees using bold outlines, certified seals, and premium typography."
      }
    ],
    ecommerce: [
      {
        sectionName: "E-Commerce Risk Reversal Guarantees Banner",
        description: "Row of quick tags confirming free delivery, money-back guarantees, and secure gateways.",
        prompt: "System Instruction:\nConstruct a prominent eCommerce trust guarantee strip. Highlight 'Free 30-Day Returns', '100% Organic Cotton Certified', and 'SSL Encrypted Payment' badges with clean spacing."
      },
      {
        sectionName: "Dynamic Verified Buyer Review Grid with Avatars",
        description: "Visual masonry grid of customer reviews with verified purchase badges.",
        prompt: "System Instruction:\nDesign an verified buyer reviews masonry grid. Render modern feedback cards showing star ratings, profile photos, and 'Verified Buyer' green indicators."
      },
      {
        sectionName: "Dynamic Product FAQ & Guarantee Checklist",
        description: "Combines product FAQs with shipment time grids to prevent checkout drop-offs.",
        prompt: "System Instruction:\nStructure an in-context shopping checkout FAQ grid. List answers to common freight constraints, delivery times, and size exchanges to maximize conversion."
      }
    ],
    software: [
      {
        sectionName: "Interactive Enterprise Pricing Table with Sliders",
        description: "High-conversion billing cards comparing free, pro, and custom setup tiers.",
        prompt: "System Instruction:\nCraft a high-converting dual pricing card grid. Feature a dominant 'Most Popular' Pro card overlay with animated premium glowing border options and clear call-to-actions."
      },
      {
        sectionName: "GDPR, SOC2, & Security Compliance Trust Badge Strip",
        description: "Grid of technical trust indicators such as SOC2 certified, GDPR compliant, and 256-bit encryption.",
        prompt: "System Instruction:\nDesign a security-first developer trust badge strip. Feature custom layouts indicating SOC2, ISO 27001, and HIPAA compliance to build trust with technical buyers."
      },
      {
        sectionName: "Case Study Snippet Highlight & Success Metrics",
        description: "Clean bento section proving 10x developer velocity or 40% cloud cost savings.",
        prompt: "System Instruction:\nBuild a customer case study spotlight grid. Showcase a clear developer success statement, verified telemetry graphs, and client referral signatures."
      }
    ],
    services: [
      {
        sectionName: "Satisfaction Guarantee Trust Seal Area",
        description: "Highlighting bonded & insured certifications, police-checked cleaners, and money-back vows.",
        prompt: "System Instruction:\nFormulate an official home service trust and license board. Present clear seals for 'Fully Bonded & Insured', 'Background Checked Professionals', and 'Satisfaction Guarantee' outlines."
      },
      {
        sectionName: "Customer Love Gallery & Stars",
        description: "Aggregates localized Google Maps and Yelp reviews with high ranking scores.",
        prompt: "System Instruction:\nDesign a neighborhood review carousel pulling local yelp/google star reviews. Highlight client suburb location, rating stars, and exact helpfulness check tags with generous padding."
      },
      {
        sectionName: "Transparent Service Booking Policy & FAQs",
        description: "FAQ grid resolving queries about keys, pet-safety, and cleaning equipment requirements.",
        prompt: "System Instruction:\nCreate a commercial service booking FAQ panel. Address concerns about room key management, pet-friendly cleaning chemicals, and customized service rescheduling limits in a pristine accordion format."
      }
    ]
  }
};

export default function PromptGenerator({ isLocked = false }: PromptGeneratorProps) {
  // Navigation states
  const [promptMode, setPromptMode] = useState<'full' | 'modular'>('full');

  // Full Prompt states
  const [websiteType, setWebsiteType] = useState<'landing' | 'ecommerce'>('landing');
  const [businessInfo, setBusinessInfo] = useState('');
  const [fullIndustry, setFullIndustry] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  // Modular Prompt exploration states
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');

  // Firestore templates configurations
  const [customLpTemplates, setCustomLpTemplates] = useState<FullTemplate[]>([]);
  const [customEcTemplates, setCustomEcTemplates] = useState<FullTemplate[]>([]);

  // Stored Prompt lists inside Firestore Vault
  const [savedPrompts, setSavedPrompts] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Active modal popups
  const [activeModPopup, setActiveModPopup] = useState<{
    name: string;
    description: string;
    rawTemplate: string;
    compiledPrompt: string;
  } | null>(null);
  const [modCopySuccess, setModCopySuccess] = useState(false);

  // 1. Fetch any Admin templates from Firestore Settings with a 15-minute cache
  useEffect(() => {
    async function fetchAdminTemplates() {
      // Check cache first
      const cachedLp = localStorage.getItem('ciya_cached_lp_templates');
      const cachedEc = localStorage.getItem('ciya_cached_ec_templates');
      const cachedTime = localStorage.getItem('ciya_cached_templates_time');
      const CACHE_LIMIT = 15 * 60 * 1000; // 15 mins

      if (cachedLp && cachedEc && cachedTime) {
        const diff = Date.now() - parseInt(cachedTime, 10);
        if (diff < CACHE_LIMIT) {
          try {
            setCustomLpTemplates(JSON.parse(cachedLp));
            setCustomEcTemplates(JSON.parse(cachedEc));
            return; // Used cache successfully, 0 reads!
          } catch (e) {
            console.warn("Error parsing template cache:", e);
          }
        }
      }

      try {
        const fullDocRef = doc(db, 'settings', 'full_prompts');
        const configDoc = await getDoc(fullDocRef);
        if (configDoc.exists()) {
          const data = configDoc.data();
          const lpTemplates = data.landing || [];
          const ecTemplates = data.ecommerce || [];
          
          setCustomLpTemplates(lpTemplates);
          setCustomEcTemplates(ecTemplates);
          
          localStorage.setItem('ciya_cached_lp_templates', JSON.stringify(lpTemplates));
          localStorage.setItem('ciya_cached_ec_templates', JSON.stringify(ecTemplates));
          localStorage.setItem('ciya_cached_templates_time', Date.now().toString());
        }
      } catch (err) {
        console.error("Admin prompt retrieval skipped, falling back:", err);
      }
    }
    fetchAdminTemplates();
  }, []);

  // 2. Load Student's Stored Prompt Archives from own Firestore Collection
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    setLoadingSaved(true);
    // Standard Firestore query mapping to student owner uid
    const qSnapshot = query(
      collection(db, 'saved_prompts'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(qSnapshot, (snapshot) => {
      const list = snapshot.docs.map(dRef => {
        const itemData = dRef.data();
        return {
          id: dRef.id,
          ...itemData,
          createdDate: itemData.createdAt?.toDate ? itemData.createdAt.toDate() : new Date()
        };
      });
      // Sort in-memory descending by createdDate safely to avoid Firestore index configuration requirements
      list.sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime());
      setSavedPrompts(list);
      setLoadingSaved(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'saved_prompts');
      setLoadingSaved(false);
    });

    return () => unsubscribe();
  }, []);

  // Advanced KYCB parsing and compilation
  const parseKycb = (text: string) => {
    if (!text) {
      return {
        name: "My Custom Brand",
        location: "Global Region",
        theme: "Modern Minimalist and High-Conversion",
        industry: "",
        address: "",
        vibe: "",
        themeStyles: "",
        colors: "",
        usp: "",
        uspNotes: "",
        painPoints: "",
        actionPlan: "",
        categories: "",
        campaigns: "",
        payments: "",
        deliveryFees: "",
        features: "",
        actionPaths: "",
        actionGoals: "",
        notes: ""
      };
    }

    const lines = text.split('\n');
    const result: Record<string, string> = {};
    
    // Clean helper
    const extractValue = (line: string, label: string) => {
      const idx = line.toLowerCase().indexOf(label.toLowerCase());
      if (idx !== -1) {
        const afterLabel = line.substring(idx + label.length);
        const separatorIdx = afterLabel.match(/[:\-]/);
        if (separatorIdx && separatorIdx.index !== undefined) {
          return afterLabel.substring(separatorIdx.index + 1).trim();
        }
        return afterLabel.trim();
      }
      return '';
    };

    // Scan for keys
    for (const line of lines) {
      const l = line.trim();
      if (!l) continue;
      
      if (l.toLowerCase().includes('business name:')) {
        result.businessName = extractValue(l, 'business name');
      } else if (l.toLowerCase().includes('client name:')) {
        result.clientName = extractValue(l, 'client name');
      } else if (l.toLowerCase().includes('industry / niche:')) {
        result.industry = extractValue(l, 'industry / niche');
      } else if (l.toLowerCase().includes('industry:')) {
        result.industry = extractValue(l, 'industry');
      } else if (l.toLowerCase().includes('business address:')) {
        result.address = extractValue(l, 'business address');
      } else if (l.toLowerCase().includes('brand mood vibe:')) {
        result.vibe = extractValue(l, 'brand mood vibe');
      } else if (l.toLowerCase().includes('preference theme styles:')) {
        result.themeStyles = extractValue(l, 'preference theme styles');
      } else if (l.toLowerCase().includes('custom color codes:')) {
        result.colors = extractValue(l, 'custom color codes');
      } else if (l.toLowerCase().includes('brand differentiation vectors:')) {
        result.usp = extractValue(l, 'brand differentiation vectors');
      } else if (l.toLowerCase().includes('detailed usp notes:')) {
        result.uspNotes = extractValue(l, 'detailed usp notes');
      } else if (l.toLowerCase().includes('visitor action paths:')) {
        result.actionPaths = extractValue(l, 'visitor action paths');
      } else if (l.toLowerCase().includes('custom action goals:')) {
        result.actionGoals = extractValue(l, 'custom action goals');
      } else if (l.toLowerCase().includes('core age group:')) {
        result.ageGroup = extractValue(l, 'core age group');
      } else if (l.toLowerCase().includes('target gender focus:')) {
        result.gender = extractValue(l, 'target gender focus');
      } else if (l.toLowerCase().includes('target geographical locales:')) {
        result.locales = extractValue(l, 'target geographical locales');
      } else if (l.toLowerCase().includes('common pain points handled:')) {
        result.painPoints = extractValue(l, 'common pain points handled');
      } else if (l.toLowerCase().includes('action plan details:')) {
        result.actionPlan = extractValue(l, 'action plan details');
      } else if (l.toLowerCase().includes('defined categories / core lines:')) {
        result.categories = extractValue(l, 'defined categories / core lines');
      } else if (l.toLowerCase().includes('campaign detail guidelines:')) {
        result.campaigns = extractValue(l, 'campaign detail guidelines');
      } else if (l.toLowerCase().includes('payment options selected:')) {
        result.payments = extractValue(l, 'payment options selected');
      } else if (l.toLowerCase().includes('delivery fees plan:')) {
        result.deliveryFees = extractValue(l, 'delivery fees plan');
      } else if (l.toLowerCase().includes('features selected:')) {
        result.features = extractValue(l, 'features selected');
      } else if (l.toLowerCase().includes('consultative general notes:')) {
        result.notes = extractValue(l, 'consultative general notes');
      }
    }
    
    // Derived aggregates
    result.name = result.businessName || result.clientName || "My Custom Brand";
    result.location = result.address || result.locales || "Global Region";
    result.theme = result.vibe || result.themeStyles || "Modern Minimalist and High-Conversion";
    
    return result;
  };

  const currentParams = React.useMemo(() => {
    if (!businessInfo.trim()) {
      return { name: "My Custom Brand", location: "Global Region", vibe: "Modern Minimalist and High-Conversion" };
    }
    const parsed = parseKycb(businessInfo);
    return {
      name: parsed.name,
      location: parsed.location,
      vibe: parsed.theme
    };
  }, [businessInfo]);

  // Reactive auto-detection for pasted KYCB text
  useEffect(() => {
    if (!businessInfo.trim()) return;
    
    const parsed = parseKycb(businessInfo);
    if (parsed.industry && !fullIndustry) {
      setFullIndustry(parsed.industry);
    }
    
    // Auto-detect Website Category
    const lowerText = businessInfo.toLowerCase();
    if (
      lowerText.includes('target profile: ecommerce') || 
      lowerText.includes('target profile: e-commerce') || 
      lowerText.includes('ecommerce website') || 
      lowerText.includes('[section 2: ecommerce store business model]')
    ) {
      setWebsiteType('ecommerce');
    } else if (
      lowerText.includes('target profile: landing') || 
      lowerText.includes('landing page')
    ) {
      setWebsiteType('landing');
    }
  }, [businessInfo]);

  const generateTailoredSmartPrompt = (text: string, type: 'landing' | 'ecommerce') => {
    const parsed = parseKycb(text);
    
    // Parse products
    const lines = text.split('\n');
    const products: Array<{name: string, price: string, desc: string, qty: string, variants: string}> = [];
    let currentProduct: any = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      const productMatch = trimmed.match(/^\*?\s*Product\s*\d+:\s*(.+)$/i);
      if (productMatch) {
        if (currentProduct) {
          products.push(currentProduct);
        }
        currentProduct = { name: productMatch[1].trim(), price: '', desc: '', qty: '', variants: '' };
      } else if (currentProduct) {
        if (trimmed.toLowerCase().startsWith('- price:') || trimmed.toLowerCase().startsWith('price:')) {
          currentProduct.price = trimmed.split(/[:\-]/).slice(1).join(':').trim();
        } else if (trimmed.toLowerCase().startsWith('- description:') || trimmed.toLowerCase().startsWith('description:')) {
          currentProduct.desc = trimmed.split(/[:\-]/).slice(1).join(':').trim();
        } else if (trimmed.toLowerCase().startsWith('- quantity:') || trimmed.toLowerCase().startsWith('quantity:')) {
          currentProduct.qty = trimmed.split(/[:\-]/).slice(1).join(':').trim();
        } else if (trimmed.toLowerCase().startsWith('- variants:') || trimmed.toLowerCase().startsWith('variants:')) {
          currentProduct.variants = trimmed.split(/[:\-]/).slice(1).join(':').trim();
        } else if (trimmed.startsWith('**') || trimmed.startsWith('[') || trimmed.match(/^\*\s*Product/)) {
          products.push(currentProduct);
          currentProduct = null;
        }
      }
    }
    if (currentProduct) {
      products.push(currentProduct);
    }

    const bizName = parsed.name || currentParams.name || "My Custom Brand";
    const bizLocation = parsed.location || currentParams.location || "Global Region";
    const bizVibe = parsed.vibe || parsed.themeStyles || currentParams.vibe || "Modern Minimalist and High-Conversion";
    const bizIndustry = parsed.industry || fullIndustry || "Professional Services";
    
    let baseTemplate = '';
    if (type === 'landing') {
      if (customLpTemplates.length > 0) {
        baseTemplate = customLpTemplates[0].template;
      } else {
        baseTemplate = FALLBACK_LP_TEMPLATE;
      }
    } else {
      if (customEcTemplates.length > 0) {
        baseTemplate = customEcTemplates[0].template;
      } else {
        baseTemplate = FALLBACK_EC_TEMPLATE;
      }
    }

    let body = ``;

    if (type === 'landing') {
      body = `System Instruction:
You are an expert senior web designer, brand strategist, and front-end developer specializing in High-Converting modern Landing Pages. Your job is to draft a comprehensive, step-by-step production plan and compile the production-ready code for a stunning custom website based on the following business profile:

=== CUSTOM BUSINESS PROFILE ===
- Business Name / Anchor: ${bizName}
- Industry / Niche: ${bizIndustry}
- Operations Location: ${bizLocation}
- Brand Mood & Vibe: ${bizVibe}

=== HIGH-FIDELITY MERCHANT STRATEGY ===
- Custom Color Palette: ${parsed.colors || 'A balanced professional scheme (e.g., slate grays and elegant primary accents)'}
- Brand Differentiation (USP): ${parsed.usp || 'High-quality bespoke service and exceptional reliability'}
- USP Supporting Context: ${parsed.uspNotes || 'Customer trust built on transparency and direct communication'}
- Target Demographics: ${parsed.ageGroup ? `${parsed.ageGroup} age group` : 'All demographics'} ${parsed.gender ? `(${parsed.gender})` : ''} ${parsed.locales ? `located in ${parsed.locales}` : ''}
- Customer Pain Points Addressed: ${parsed.painPoints || 'Difficulty finding highly qualified specialists and fast turnaround'}
- Brand Action Plan: ${parsed.actionPlan || 'Highlight verified credentials, provide transparent communication, and offer direct quotes'}
- Interactive Core Features: ${parsed.features || 'An interactive consultation calculator or quick evaluation form'}
- Custom Conversion Goals: ${parsed.actionGoals || 'Increase visitor bookings or inquiry forms'}

Objective: Design a custom single-page landing page featuring modern aesthetics, exceptional typography, and flawless responsiveness.

Please structure your response into the following clear phases of work. Provide the precise HTML, React + Tailwind compilation, or custom copywriting copy guidelines for each:

PHASE 1: BRAND STRATEGY, VISUAL PALETTE & VIBE (TAILORED FOR ${bizIndustry.toUpperCase()})
- Establish a highly specific Color Palette matching: "${parsed.colors || 'brand specific professional colors'}".
- Define a cohesive mood/vibe representing a "${bizVibe}" and styling style ("${parsed.themeStyles || 'modern, minimalist, clean'}"). Ensure generous negative spacing and an editorial visual appeal.
- Select a clear, modern Font pairing (e.g., Space Grotesk/Outfit for Display Headings, Inter for legible copy, and Jetbrains Mono for metadata or code tags).

PHASE 2: MASTER COPYWRITING & STRUCTURE (TAILORED FOR ${bizIndustry.toUpperCase()})
- Write/format the exact text Copy for the page following the AIDA high-conversion framework:
  1. Attention: A stunning hero header celebrating ${bizName} that clearly states the unique value proposition: "${parsed.usp || 'Bespoke high-quality solutions designed around you'}".
  2. Interest: Engaging story hooks and benefit cards addressing these client pain points directly: "${parsed.painPoints || 'general industry pain points'}".
  3. Desire: Rich social proof or testimonial snippets, custom metrics/stats, and trust tags like "${parsed.uspNotes || 'certified credentials and verified client reviews'}".
  4. Action: Highly compelling Call-To-Action (CTA) message for visitors: "${parsed.actionPaths || 'Schedule your introductory session today'}".

PHASE 3: HIGH-FIDELITY UI LAYOUT ARCHITECTURE (TAILORED FOR ${bizIndustry.toUpperCase()})
Outline the precise HTML/React component sections to be implemented:
1. Header & Navigation: A sticky, semi-transparent navigation bar with custom backdrop-blur, containing the business brand name/logo ("${bizName}") and responsive quick links.
2. Hero Section: A highly engaging, visually deep introductory section with custom radial highlights, an elegant tagline, conversion buttons (with hover scaling transitions like "Get Started" or "${parsed.actionPaths || 'Book a Consultation'}"), and optional mock graphics.
3. Feature / Grid Sections: A bento-grid, 3-column, or stagger-aligned layout detailing premium offerings or specialties: "${parsed.categories || 'Key practice areas and professional services'}" using modern cards.
4. Testimonials & Social Proof: A section featuring high-quality client quotes, avatars, and trust badges reflecting their verified experiences.
5. Interactive Elements: An interactive accordion-based FAQs and smooth fade-in motion effects on scroll.
6. Custom Interactive Component: A fully working, mock interactive component for: "${parsed.features || 'interactive questionnaire or dynamic calculator'}".
7. Lead Collection/Contact Form: A beautiful, modern inputs group with validation highlights, a message text-area, and success states targeting: "${parsed.actionGoals || 'Request a free estimate/consultation'}".
8. Footer: Clean copyright text, contact indicators, and neat social media link icons from Lucide.

PHASE 4: COMPLETE PRODUCTION CODE IMPLEMENTATION GUIDELINES
- Provide direct programming commands to compile this landing page using beautiful standard React functional patterns. Use React hooks for states, standard Tailwind CSS classes directly, and lucide-react icons. Include micro-behavior interactions on buttons and cards using scaling and sliding classes (e.g., 'hover:-translate-y-1 hover:shadow-lg transition-all duration-300').`;
    } else {
      body = `System Instruction:
You are an expert full-stack developer, product listing UI/UX architect, and brand strategist specializing in High-Converting eCommerce shopping portals. Your job is to draft a comprehensive production architecture and complete code guidelines for a custom sales-optimized online store based on the following business details:

=== CUSTOM BUSINESS PROFILE ===
- Store / Product Domain: ${bizName}
- Industry / Niche: ${bizIndustry}
- Sales Operations Based In: ${bizLocation}
- Styling Theme Preference: ${bizVibe}

=== HIGH-FIDELITY MERCHANT STRATEGY ===
- Custom Color Palette: ${parsed.colors || 'A cohesive premium scheme matching the industry aesthetic'}
- Brand Differentiation (USP): ${parsed.usp || 'Bespoke product sourcing, independent quality audits, and transparent shipping'}
- USP Supporting Context: ${parsed.uspNotes || 'Direct customer trust built on certified lab results or verified material standards'}
- Target Demographics: ${parsed.ageGroup ? `${parsed.ageGroup} age group` : 'All demographics'} ${parsed.gender ? `(${parsed.gender})` : ''} ${parsed.locales ? `located in ${parsed.locales}` : ''}
- Customer Pain Points Addressed: ${parsed.painPoints || 'Difficulty finding verified clean ingredients and slow delivery'}
- Brand Action Plan: ${parsed.actionPlan || 'Highlight certifications, lab testing, transparent supply chain, and offer standard 2-day delivery'}
- Interactive Core Features: ${parsed.features || 'An interactive supplement finder or custom product quiz'}
- Custom Conversion Goals: ${parsed.actionGoals || 'Increase average order value (AOV) via post-purchase upsells or newsletter signup'}

Objective: Design a highly interactive, responsive eCommerce platform with clean item listing, fully detailed product cards, catalog filters, a persistent slide-out shopping cart, a secure mock checkout portal, and conversion states.

Please structure your response into the following implementation phases. Provide the precise configuration details, layout elements, state managers, and component layouts:

PHASE 1: STORE BRAND AESTHETIC, STYLING & THEME CONFIGURATION (TAILORED FOR ${bizIndustry.toUpperCase()})
- Establish the specific look-and-feel of the store matching: "${bizVibe}".
- Define the exact Typography Pairings and responsive padding standards. Use the custom color codes provided: ${parsed.colors || 'brand specific colors'} for a clean, editorial look.

PHASE 2: PRODUCT CATALOG & DYNAMIC FILTERING ARCHITECTURE (TAILORED FOR ${bizIndustry.toUpperCase()})
- Dynamic Catalog: You MUST pre-populate your React components state with EXACTLY the merchant's real-world product catalog detailed below:
${products.length > 0 ? JSON.stringify(products, null, 2) : `[
  {
    "name": "${bizName} Flagship Product 1",
    "price": "$29.99",
    "desc": "Premium quality flagship offering matching ${bizIndustry}.",
    "qty": "300 units",
    "variants": "Standard, Premium"
  },
  {
    "name": "${bizName} Essential Product 2",
    "price": "$19.99",
    "desc": "Everyday essential designed for durability and performance.",
    "qty": "200 units",
    "variants": "Single Pack, Double Pack"
  }
]`}
- Categories & Search: Outline robust tags and filter pills matching: "${parsed.categories || 'All Products, Best Sellers, Featured'}" and an instant search filter system.

PHASE 3: KEY UI/UX ECOMMERCE SECTIONS (TAILORED FOR ${bizIndustry.toUpperCase()})
1. Navigation Bar with Cart Hub: Sticky top navigation displaying the brand logo ("${bizName}"), category shortcuts, a search bar, and a persistent shopping cart button showing a dynamic items counter badge.
2. Promo Banner/Hero: A full-width promotional banner celebrating an introductory discount code: "${parsed.campaigns || 'WELCOME10'}".
3. Catalog Grid Section: Highly polished grid layout containing product cards. Each card must feature: hover picture scaling, clear pricing, discount badges, and a prominent 'Add to Cart' button with click ripple animations.
4. Persistent Slide-out Shopping Cart Drawer: A panel that slides in from the right edge, listing added products with item quantities (+ and - modifier controls), individual prices, dynamic subtotal calculations, and a direct checkout call to action.
5. Custom Interactive Component: A fully working, mock interactive component for: "${parsed.features || 'interactive recommendation quiz or stock indicators'}".
6. In-Context Checkout Modal: A gorgeous form that lets customers fill shipment details, email, payment card fields, and displays a summary order checklist. Include direct payment options for: ${parsed.payments || 'Credit Cards (Stripe), Apple Pay, Google Pay, PayPal'}.

PHASE 4: CLIENT-SIDE STATE MANAGEMENT SPECIFICATION
- Provide exact state variables (using standard React useState and useEffect hooks):
  - 'products': Object array of active inventory.
  - 'cart': Array of items with selected quantities.
  - 'isCartOpen': Boolean state governing the drawer.
  - 'activeCategory': Filter category state.
- Set up logic commands for:
  - 'addToCart(productId)': Safely increments or appends the item to the cart.
  - 'removeFromCart(productId)' or 'updateQuantity(productId, newQty)': Updates subtotals and sizes.
  - Coupon logic: Save 10% with coupon "${parsed.campaigns || 'WELCOME10'}".
  - Shipping fees logic: "${parsed.deliveryFees || 'Free shipping over $50, flat-rate $4.99 otherwise'}".
  - 'checkoutSubmit()': Mock confirmation sequence that empties the cart and unlocks a styled order-completed banner.

PHASE 5: COMPLETE PRODUCTION CODE IMPLEMENTATION GUIDELINES
- Provide direct programming commands to compile this eCommerce hub using beautiful standard React functional patterns. Use React hooks for states, standard Tailwind CSS classes directly, and lucide-react icons.`;
    }

    return body;
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setWebsiteType(preset.type as 'landing' | 'ecommerce');
    setBusinessInfo(preset.desc);
    setFullIndustry(preset.industry);
    setGeneratedPrompt('');
  };

  const handleClear = () => {
    setBusinessInfo('');
    setFullIndustry('');
    setGeneratedPrompt('');
  };

  // Full Prompt compiler using dynamic Gemini AI backend
  const handleCompilePrompt = async () => {
    if (!businessInfo.trim()) {
      alert("Please paste some details about your business first!");
      return;
    }

    setIsCompiling(true);

    let baseTemplate = '';
    if (websiteType === 'landing') {
      if (customLpTemplates.length > 0) {
        baseTemplate = customLpTemplates[0].template;
      } else {
        baseTemplate = FALLBACK_LP_TEMPLATE;
      }
    } else {
      if (customEcTemplates.length > 0) {
        baseTemplate = customEcTemplates[0].template;
      } else {
        baseTemplate = FALLBACK_EC_TEMPLATE;
      }
    }

    try {
      const response = await fetch('/api/ai/compile-smart-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessInfo,
          websiteType,
          referenceTemplate: baseTemplate
        })
      });

      if (!response.ok) {
        throw new Error("Server responded with an error status.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.prompt) {
        setGeneratedPrompt(data.prompt);
      } else {
        throw new Error("No prompt was returned from the server.");
      }
    } catch (err) {
      console.warn("Dynamic AI prompt generation failed, using optimized local fallback:", err);
      // Local fallback that does NOT append the raw template directly
      const fallbackPrompt = generateTailoredSmartPrompt(businessInfo, websiteType);
      setGeneratedPrompt(fallbackPrompt);
    } finally {
      setIsCompiling(false);
    }
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

  // Save full prompt to Firestore Stored Archives
  const handleSaveFullPrompt = async () => {
    if (!generatedPrompt) {
      alert("Please generate a developer prompt first!");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      alert("Authentication required. Please log in to store prompts.");
      return;
    }
    if (!fullIndustry.trim()) {
      alert("Please specify or annotate the Industry this prompt belongs to before saving!");
      return;
    }

    setIsSaving(true);
    try {
      const { name: bizName } = currentParams;
      const docData = {
        userId: user.uid,
        industry: fullIndustry.trim(),
        promptText: generatedPrompt,
        websiteType: websiteType,
        businessName: bizName || "Custom Brand Business",
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'saved_prompts'), docData);
      alert(`Prompt successfully saved under "${fullIndustry}" in your Stored Prompts Vault!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'saved_prompts');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Prompt from Firestore
  const handleDeleteSavedPrompt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this prompt from your saved collection?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'saved_prompts', id));
      alert("Prompt deleted successfully from your Vault.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `saved_prompts/${id}`);
    }
  };

  // Load Prompt into active editor
  const handleLoadSavedPrompt = (item: any) => {
    setWebsiteType(item.websiteType);
    setFullIndustry(item.industry);
    setGeneratedPrompt(item.promptText);
    alert(`Loaded saved prompt for ${item.businessName} (${item.industry})!`);
  };

  const handleCopyModPrompt = () => {
    if (!activeModPopup) return;
    navigator.clipboard.writeText(activeModPopup.compiledPrompt);
    setModCopySuccess(true);
    setTimeout(() => setModCopySuccess(false), 2000);
  };

  if (isLocked) {
    return (
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm my-6 font-sans text-left">
        <div className="w-20 h-20 bg-rose-50 border-2 border-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-rose-500" />
        </div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Website Prompt Generator Locked</h3>
        <p className="text-slate-500 mt-3 text-lg leading-relaxed font-semibold">
          This customized workshop tool is temporarily locked by the course administrators. Unlocks are periodically timed with curriculum milestones. Please reach out to your CIYA instructor for guidance.
        </p>
        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center items-center gap-2 text-sm text-slate-400 font-bold">
          <span>🛡️ CIYA Guarded Academy Portal</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-24 text-left leading-relaxed">
      
      {/* Intro Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md border-2 border-slate-800">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border-2 border-teal-500/20 text-sm font-black text-teal-400">
            <Sparkles className="w-4 h-4" /> Prompt Generator Lab
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Dynamic AI Prompt Architect</h2>
          <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-4xl font-semibold">
            Convert raw commercial configurations and target details into exhaustive, developer prompts. Choose between comprehensive workspace prompts or load selective category & industry modular codes to redesign micro-components.
          </p>
        </div>
      </div>

      {/* DROPDOWN SELECTOR FOR PROMPT MODE */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <label htmlFor="prompt-mode" className="text-lg md:text-xl font-black tracking-wider uppercase text-slate-700 block">
            Select Prompt Workspace Mode
          </label>
          <p className="text-base md:text-lg text-slate-500 font-bold">
            Choose complete full workspace prompt generation or select categorized modular refiners.
          </p>
        </div>
        <div className="w-full md:w-auto min-w-[320px]">
          <select
            id="prompt-mode"
            value={promptMode}
            onChange={(e) => setPromptMode(e.target.value as 'full' | 'modular')}
            className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-2xl px-5 py-4 font-black transition-all outline-none focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-100 text-lg md:text-xl shadow-inner cursor-pointer"
          >
            <option value="full">✨ Complete Full Prompt Mode</option>
            <option value="modular">🧱 Category & Industry Modular Refiners</option>
          </select>
        </div>
      </div>

      {/* FULL PROMPT MODE VIEW */}
      {promptMode === 'full' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Input panel */}
            <div className="lg:col-span-12 xl:col-span-5 bg-white border-2 border-slate-200 rounded-3xl p-7 shadow-sm space-y-6">
              
              <div className="space-y-2">
                <label className="text-base md:text-lg font-black text-slate-700 uppercase tracking-widest block">
                  1. Select Website Category
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWebsiteType('landing')}
                    className={`py-4 px-5 rounded-2xl text-base font-black border-2 transition-all flex items-center justify-center gap-2 cursor-pointer outline-none ${
                      websiteType === 'landing'
                        ? 'bg-teal-50 text-teal-800 border-teal-600 shadow-sm font-black'
                        : 'bg-transparent text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Globe className="w-5 h-5" />
                    Landing Page
                  </button>
                  <button
                    type="button"
                    onClick={() => setWebsiteType('ecommerce')}
                    className={`py-4 px-5 rounded-2xl text-base font-black border-2 transition-all flex items-center justify-center gap-2 cursor-pointer outline-none ${
                      websiteType === 'ecommerce'
                        ? 'bg-teal-50 text-teal-800 border-teal-600 shadow-sm font-black'
                        : 'bg-transparent text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5" />
                    eCommerce Hub
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="business-description" className="text-base md:text-lg font-black text-slate-700 uppercase tracking-widest block">
                    2. Raw Business Description / Details
                  </label>
                  <button 
                    type="button"
                    onClick={handleClear}
                    className="text-sm uppercase font-extrabold text-slate-400 hover:text-red-500 transition-colors bg-transparent border-0 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <textarea
                  id="business-description"
                  value={businessInfo}
                  onChange={(e) => setBusinessInfo(e.target.value)}
                  placeholder="Paste details about your client's business here (e.g. name, location, products, target customers, preferred colors, logo style, custom features)..."
                  rows={8}
                  className="w-full text-base md:text-lg bg-slate-50/50 hover:bg-slate-50/80 border-2 border-slate-200 rounded-2xl p-5 text-slate-800 font-semibold placeholder:text-slate-400 outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all font-sans leading-relaxed"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="full-industry" className="text-base md:text-lg font-black text-slate-700 uppercase tracking-widest block">
                  3. Indicated Industry / Niche <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="full-industry"
                  value={fullIndustry}
                  onChange={(e) => setFullIndustry(e.target.value)}
                  placeholder="e.g. Floristry Boutique, High-End Fitness, Clean Tech..."
                  className="w-full text-base md:text-lg bg-slate-50/50 hover:bg-slate-50/80 border-2 border-slate-200 rounded-2xl p-4 text-slate-800 font-bold placeholder:text-slate-400 outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all font-sans"
                />
              </div>

              {/* Quick presets list */}
              <div className="space-y-3 pt-4 border-t-2 border-slate-100">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">
                  Select a practice preset:
                </span>
                <div className="grid grid-cols-1 gap-3">
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="text-left text-base p-4 rounded-2xl border-2 border-slate-100 hover:border-teal-300 hover:bg-teal-50/20 text-slate-700 bg-white cursor-pointer transition-all flex justify-between items-center shadow-xs hover:shadow-md"
                    >
                      <div className="space-y-1 max-w-[80%]">
                        <span className="font-extrabold text-slate-900 text-base block">{p.name}</span>
                        <span className="text-sm text-slate-500 truncate block">{p.desc}</span>
                        <span className="text-xs font-bold text-teal-650 block">💼 {p.industry}</span>
                      </div>
                      <span className="text-xs font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-lg uppercase font-mono tracking-wider">
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
                className="w-full py-5 px-6 bg-teal-600 hover:bg-teal-700 hover:-translate-y-0.5 transition-all outline-none rounded-2xl text-white font-black text-base uppercase tracking-wider shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer border-0"
              >
                {isCompiling ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Compiling Developer Prompts...
                  </>
                ) : (
                  <>
                    Generate Dynamic Prompt
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            {/* Output panel */}
            <div className="lg:col-span-12 xl:col-span-7 bg-white border-2 border-slate-200 rounded-3xl p-7 shadow-sm min-h-[550px] flex flex-col items-stretch space-y-6">
              
              <div className="border-b-2 border-slate-100 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                  <span className="text-base md:text-lg font-black text-slate-800 uppercase tracking-widest block">
                    Tailored Workspace Developer Prompt
                  </span>
                  <span className="text-sm text-slate-400 font-bold mt-1 block">
                    Indestructible instruction set tailored for your compiler.
                  </span>
                </div>
                {generatedPrompt && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-2 bg-slate-100 hover:bg-teal-50 text-slate-800 hover:text-teal-800 border-2 border-slate-200 px-4 py-2.5 rounded-xl transition-all cursor-pointer font-extrabold text-base"
                    >
                      {copySuccess ? (
                        <>
                          <Check className="w-4 h-4 text-teal-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-200 px-4 py-2.5 rounded-xl transition-all cursor-pointer font-extrabold text-base"
                    >
                      <Download className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col justify-stretch">
                {generatedPrompt ? (
                  <div className="space-y-6">
                    <pre className="w-full bg-slate-950 border-2 border-slate-800 text-teal-100 text-base md:text-lg font-mono p-6 rounded-2xl overflow-auto select-all h-[380px] shadow-inner leading-relaxed whitespace-pre-wrap text-left font-semibold">
                      {generatedPrompt}
                    </pre>

                    {/* Prominent Save to Vault option */}
                    <div className="bg-teal-50 border-2 border-teal-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-teal-100 text-teal-700 rounded-2xl">
                          <FolderHeart className="w-7 h-7" />
                        </div>
                        <div className="space-y-1 text-left">
                          <h4 className="text-base md:text-lg font-black text-teal-950 uppercase tracking-tight">Store Prompt in Vault</h4>
                          <p className="text-sm md:text-base text-teal-700 font-bold">
                            Save this compiled prompt under industry "<span className="underline font-black">{fullIndustry || 'Not Specified'}</span>" for subsequent studies.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveFullPrompt}
                        disabled={isSaving}
                        className="w-full sm:w-auto px-6 py-4 bg-teal-700 hover:bg-teal-800 text-white font-black text-base uppercase rounded-2xl border-0 cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 shrink-0"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            Save Prompt
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 select-none py-24 border-2 border-dashed border-slate-200 rounded-3xl">
                    <div className="w-16 h-16 rounded-full border-2 border-slate-200 flex items-center justify-center bg-slate-50 mb-4 animate-pulse">
                      <Code className="w-8 h-8 text-slate-300" />
                    </div>
                    <h4 className="text-lg font-black text-slate-700">Awaiting Business Configuration</h4>
                    <p className="text-base text-slate-400 max-w-sm mt-2 leading-relaxed font-bold">
                      Select landing or eCommerce, state niche details, specify the Industry, and click generate to launch.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECURE STORED PROMPTS VAULT - MATCHES STYLE OF KYCB ARCHIVES */}
          <div className="bg-slate-50 rounded-3xl p-7 md:p-10 border-2 border-slate-200 text-left space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-200 pb-5 gap-4">
              <div className="flex items-center gap-3">
                <FolderHeart className="w-7 h-7 text-teal-600" />
                <div>
                  <h3 className="font-black text-slate-900 text-lg md:text-2xl uppercase tracking-tight">Stored Workspace Prompts Vault</h3>
                  <p className="text-sm md:text-base text-slate-500 font-bold mt-1">
                    Your personal library of custom-tailored developer prompts, stored secure on Firestore.
                  </p>
                </div>
              </div>
              <span className="text-base bg-teal-100 text-teal-900 font-black px-4 py-1.5 rounded-full border-2 border-teal-200 shadow-sm">
                {savedPrompts.length} Sheets Saved
              </span>
            </div>

            {loadingSaved ? (
              <div className="py-16 text-center text-lg text-slate-500 font-bold flex items-center justify-center gap-3 bg-white rounded-3xl border">
                <RefreshCw className="w-6 h-6 animate-spin text-teal-600" /> Connecting to Firestore archives...
              </div>
            ) : savedPrompts.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-16 text-center text-base md:text-lg text-slate-400 font-bold italic shadow-inner">
                No saved prompts. Generate a full workspace prompt, indicate its industry field, and click Save to build your workspace archives!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedPrompts.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-white border-2 border-slate-100 hover:border-teal-400 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 bg-amber-50 text-amber-850 border border-amber-200 rounded-lg text-xs font-black uppercase tracking-wider">
                          💼 {item.industry}
                        </span>
                        <span className="text-xs text-slate-400 font-mono font-bold">
                          {item.createdDate ? item.createdDate.toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-slate-900 text-base md:text-lg truncate">{item.businessName}</h4>
                        <span className="text-xs font-black text-slate-450 uppercase tracking-widest block font-mono">
                          {item.websiteType === 'landing' ? '🌐 Landing Page' : '🛒 eCommerce Hub'}
                        </span>
                      </div>
                      <p className="text-sm md:text-base text-slate-500 line-clamp-3 font-semibold bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                        {item.promptText}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleLoadSavedPrompt(item)}
                        className="flex-1 py-3 px-4 bg-teal-50 hover:bg-teal-100 text-teal-900 border-0 rounded-xl text-xs md:text-sm font-black cursor-pointer transition-all uppercase tracking-wider"
                      >
                        🔄 Load Prompt
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(item.promptText);
                          alert("Prompt copied to clipboard successfully!");
                        }}
                        className="py-3 px-4 bg-slate-100 hover:bg-slate-205 text-slate-800 border-0 rounded-xl text-xs md:text-sm font-black cursor-pointer transition-all uppercase"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedPrompt(item.id, e)}
                        className="p-3 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-xl border-0 cursor-pointer transition-all"
                        title="Delete Prompt"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MODULAR PROMPT MODE VIEW */
        <div className="space-y-8">
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-7 md:p-9 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-4">
              <Layers className="w-7 h-7 text-indigo-600" />
              <h3 className="font-black text-slate-900 text-xl md:text-2xl uppercase tracking-tight">
                Configure Sectional Refiner Prompts
              </h3>
            </div>
            
            <p className="text-base md:text-lg text-slate-500 font-semibold leading-relaxed">
              Modular Prompting provides code instructions specifically designed to refine individual portions of your web application (for example, header modules, bento pricing columns, trust blocks, or diagnosis widgets). Choose BOTH a Category and Target Industry below to populate the interactive database library.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Category Select Dropdown */}
              <div className="space-y-2">
                <label htmlFor="modular-category-select" className="text-base md:text-lg font-black text-slate-700 uppercase tracking-widest block">
                  1. Select Section Category
                </label>
                <select
                  id="modular-category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-2xl px-5 py-4 text-base md:text-lg font-black transition-all outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 cursor-pointer"
                >
                  <option value="">-- Choose Category --</option>
                  <option value="visuals">🎨 UI Layout & Visual Components</option>
                  <option value="interactivity">⚡ Interactive Features & User Flows</option>
                  <option value="conversion">🎯 Conversion & Trust Boosters</option>
                </select>
              </div>

              {/* Industry Select Dropdown */}
              <div className="space-y-2">
                <label htmlFor="modular-industry-select" className="text-base md:text-lg font-black text-slate-700 uppercase tracking-widest block">
                  2. Select Target Industry
                </label>
                <select
                  id="modular-industry-select"
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-2xl px-5 py-4 text-base md:text-lg font-black transition-all outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 cursor-pointer"
                >
                  <option value="">-- Choose Industry --</option>
                  <option value="healthcare">🏥 Healthcare & Medical Services</option>
                  <option value="realestate">🏠 Real Estate & Property Agencies</option>
                  <option value="ecommerce">🛍️ E-Commerce & Luxury Retail</option>
                  <option value="software">💻 SaaS & Modern Tech Platforms</option>
                  <option value="services">🛠️ Corporate Field Services</option>
                </select>
              </div>

            </div>
          </div>

          {/* Conditional Rendering based on double-selection requirement */}
          {(!selectedCategory || !selectedIndustry) ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center py-20 space-y-4">
              <div className="w-18 h-18 rounded-full border-2 border-slate-200 flex items-center justify-center bg-slate-100/60 mx-auto animate-bounce duration-1000">
                <Layers className="w-8 h-8 text-indigo-400" />
              </div>
              <h4 className="text-lg md:text-xl font-black text-slate-700 uppercase tracking-wider">Awaiting Selection Parameters</h4>
              <p className="text-base md:text-lg text-slate-500 leading-relaxed max-w-xl mx-auto font-bold">
                You must select both a Section Category and a Target Industry from the dropdown lists above to generate and load custom modular developer sub-prompts.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2.5 px-4.5 py-2 rounded-full bg-indigo-50 border-2 border-indigo-200 text-base font-black text-indigo-800">
                <BookOpen className="w-5 h-5 text-indigo-700" /> 
                Ready &bull; Showing {MODULAR_PROMPTS_MATRIX[selectedCategory]?.[selectedIndustry]?.length || 0} Segment blueprints
              </div>

              {/* Grid lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(MODULAR_PROMPTS_MATRIX[selectedCategory]?.[selectedIndustry] || []).map((section, idx) => (
                  <div 
                    key={idx}
                    className="bg-white border-2 border-slate-100 hover:border-indigo-400 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer relative"
                    onClick={() => {
                      setActiveModPopup({
                        name: section.sectionName,
                        description: section.description,
                        rawTemplate: section.prompt,
                        compiledPrompt: section.prompt
                      });
                    }}
                  >
                    <div className="space-y-4 text-left">
                      <div className="flex justify-between items-center">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-800 rounded-lg text-xs md:text-sm font-black uppercase tracking-wider border border-indigo-200">
                          Segment {idx + 1}
                        </span>
                        <span className="text-sm md:text-base text-indigo-600 font-extrabold group-hover:translate-x-1 transition-transform">
                          Refine &rarr;
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-extrabold text-slate-800 text-lg md:text-xl group-hover:text-indigo-600 transition-colors leading-snug">
                          {section.sectionName}
                        </h4>
                        <p className="text-base text-slate-500 font-semibold leading-relaxed">
                          {section.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <span className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
                        Prompt Code Sample:
                      </span>
                      <p className="text-sm md:text-base text-slate-500 font-mono truncate bg-slate-50 p-3 rounded-lg border">
                        {section.prompt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* POPUP MODAL FOR MODULAR BLUEPRINT COPY */}
      {activeModPopup && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 max-w-3xl w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-left">
            <button
              onClick={() => setActiveModPopup(null)}
              className="absolute top-6 right-6 p-2 rounded-full border-0 bg-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors outline-none"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-indigo-50 border-2 border-indigo-100 text-indigo-600 rounded-2xl">
                <Layers className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg md:text-xl font-black text-slate-900">
                  {activeModPopup.name} (Section Modular Prompt)
                </h3>
                <p className="text-base text-slate-500 font-semibold">{activeModPopup.description}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200 text-sm md:text-base font-bold text-indigo-800 leading-relaxed">
                💡 <span className="font-black">Implementation Strategy:</span> Copy and paste this focused chunk description into your development model workspace to instantly build, refine, or restyle this specific layout section.
              </div>

              <div className="space-y-2">
                <span className="block text-xs md:text-sm font-black uppercase text-slate-400 tracking-wider">
                  Targeted Modular Code Instruction Blueprint:
                </span>
                <pre className="w-full bg-slate-950 text-teal-100 text-base md:text-lg font-mono p-5 rounded-2xl overflow-auto border-2 border-slate-800 leading-relaxed h-[200px] select-all whitespace-pre-wrap font-semibold">
                  {activeModPopup.compiledPrompt}
                </pre>
              </div>
            </div>

            <div className="flex gap-4 pt-5 border-t border-slate-100 mt-6 justify-end">
              <button
                type="button"
                onClick={() => setActiveModPopup(null)}
                className="px-5 py-3 border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-base font-black rounded-xl cursor-pointer"
              >
                Close View
              </button>
              <button
                type="button"
                onClick={handleCopyModPrompt}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-black rounded-xl border-0 cursor-pointer flex items-center gap-2 shadow-sm"
              >
                {modCopySuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Clipboard className="w-4 h-4" />
                    Copy Modular Code
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
