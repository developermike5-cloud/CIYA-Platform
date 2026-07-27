import { safeStorage } from './safeStorage';
import staticFullPrompts from '../data/full_prompts.json';
import staticModularPrompts from '../data/modular_prompts.json';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface FullPromptTemplate {
  id: string;
  name: string;
  category: string;
  industry?: string;
  template: string;
  imageUrl?: string;
  videoUrl?: string;
  link1?: string;
  link2?: string;
  description?: string;
}

export interface ModularPromptTemplate {
  id: string;
  name: string;
  category: string;
  industry?: string;
  description: string;
  template: string;
  imageUrl?: string;
  videoUrl?: string;
  link1?: string;
  link2?: string;
}

const BROADCAST_EVENT = 'ciya_prompts_updated';

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

const checkIsAdmin = (): boolean => {
  if (typeof window === 'undefined') return false;
  const cached = safeStorage.getItem('ciya_cached_user');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && (parsed.role === 'admin' || parsed.role === 'super_admin')) {
        return true;
      }
    } catch (e) {}
  }
  return false;
};

let adminFullTemplatesMemory: FullPromptTemplate[] | null = null;
let adminModularTemplatesMemory: ModularPromptTemplate[] | null = null;

export const promptsStore = {
  getStaticFullTemplates(): FullPromptTemplate[] {
    const fullData = staticFullPrompts as any;
    const list: FullPromptTemplate[] = [];
    if (fullData) {
      if (Array.isArray(fullData.templates)) {
        fullData.templates.forEach((t: any) => list.push(t));
      } else {
        // Fallback or legacy migration
        if (Array.isArray(fullData.landing)) {
          fullData.landing.forEach((t: any) => {
            list.push({
              id: t.id || `landing_${Date.now()}_${Math.random()}`,
              name: t.name,
              category: (t.category || 'Landing Page').trim(),
              industry: t.industry || 'General',
              template: t.template,
              imageUrl: t.imageUrl,
              videoUrl: t.videoUrl,
              link1: t.link1,
              link2: t.link2,
              description: t.description || `Full prompt blueprint.`
            });
          });
        }
        if (Array.isArray(fullData.ecommerce)) {
          fullData.ecommerce.forEach((t: any) => {
            list.push({
              id: t.id || `ecom_${Date.now()}_${Math.random()}`,
              name: t.name,
              category: (t.category || 'eCommerce').trim(),
              industry: t.industry || 'General',
              template: t.template,
              imageUrl: t.imageUrl,
              videoUrl: t.videoUrl,
              link1: t.link1,
              link2: t.link2,
              description: t.description || `Full prompt blueprint.`
            });
          });
        }
      }
    }
    return list;
  },

  getStaticModularTemplates(): ModularPromptTemplate[] {
    const modData = staticModularPrompts as any;
    if (modData && Array.isArray(modData.templates) && modData.templates.length > 0) {
      return modData.templates;
    }
    return DEFAULT_MODULAR_TEMPLATES;
  },

  getFullTemplates(): FullPromptTemplate[] {
    if (!checkIsAdmin()) {
      // Students and all other users: Load EXCLUSIVELY from static frontend files
      return this.getStaticFullTemplates();
    }

    // Admin: Live version from backend
    if (adminFullTemplatesMemory) {
      return adminFullTemplatesMemory;
    }

    const cached = safeStorage.getItem('ciya_admin_full_prompts');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          adminFullTemplatesMemory = parsed;
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing admin full prompts from storage:", e);
      }
    }

    // Fallback if cache is empty
    return this.getStaticFullTemplates();
  },

  getModularTemplates(): ModularPromptTemplate[] {
    if (!checkIsAdmin()) {
      // Students and all other users: Load EXCLUSIVELY from static frontend files
      return this.getStaticModularTemplates();
    }

    // Admin: Live version from backend
    if (adminModularTemplatesMemory) {
      return adminModularTemplatesMemory;
    }

    const cached = safeStorage.getItem('ciya_admin_modular_prompts');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          adminModularTemplatesMemory = parsed;
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing admin modular prompts from storage:", e);
      }
    }

    // Fallback if cache is empty
    return this.getStaticModularTemplates();
  },

  async saveFullTemplates(list: FullPromptTemplate[]): Promise<void> {
    try {
      adminFullTemplatesMemory = list;
      safeStorage.setItem('ciya_admin_full_prompts', JSON.stringify(list));
      this.broadcast();
      await this.persistToDisk(list, this.getModularTemplates());
    } catch (e) {
      console.error("Failed to save full templates:", e);
      return Promise.reject(e);
    }
  },

  async saveModularTemplates(list: ModularPromptTemplate[]): Promise<void> {
    try {
      adminModularTemplatesMemory = list;
      safeStorage.setItem('ciya_admin_modular_prompts', JSON.stringify(list));
      this.broadcast();
      await this.persistToDisk(this.getFullTemplates(), list);
    } catch (e) {
      console.error("Failed to save modular templates:", e);
      return Promise.reject(e);
    }
  },

  async saveAll(fullList: FullPromptTemplate[], modularList: ModularPromptTemplate[]): Promise<void> {
    try {
      adminFullTemplatesMemory = fullList;
      adminModularTemplatesMemory = modularList;
      safeStorage.setItem('ciya_admin_full_prompts', JSON.stringify(fullList));
      safeStorage.setItem('ciya_admin_modular_prompts', JSON.stringify(modularList));
      this.broadcast();
      await this.persistToDisk(fullList, modularList);
    } catch (e) {
      console.error("Failed to save all templates:", e);
      return Promise.reject(e);
    }
  },

  broadcast() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BROADCAST_EVENT, {
        detail: {
          fullTemplates: this.getFullTemplates(),
          modularTemplates: this.getModularTemplates()
        }
      }));
    }
  },

  subscribe(callback: (data: { fullTemplates: FullPromptTemplate[], modularTemplates: ModularPromptTemplate[] }) => void) {
    const handler = (e: any) => {
      callback(e.detail);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(BROADCAST_EVENT, handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(BROADCAST_EVENT, handler);
      }
    };
  },

  async migrateFromFirestoreIfNeeded(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!checkIsAdmin()) return false;

    const flag = safeStorage.getItem('ciya_frontend_prompts_migrated_from_cloud');
    if (flag === 'true') {
      return false; // already migrated
    }

    try {
      console.log("Checking Firestore for legacy prompt templates migration...");
      const fullDocRef = doc(db, 'settings', 'full_prompts');
      const modDocRef = doc(db, 'settings', 'modular_prompts');

      const [fullSnap, modSnap] = await Promise.all([
        getDoc(fullDocRef),
        getDoc(modDocRef)
      ]);

      let fullList: FullPromptTemplate[] = [];
      let modList: ModularPromptTemplate[] = [];
      let foundSomething = false;

      if (fullSnap.exists()) {
        const data = fullSnap.data();
        if (Array.isArray(data.templates) && data.templates.length > 0) {
          fullList = data.templates;
          foundSomething = true;
        } else {
          // Legacy migration
          const legacyList: FullPromptTemplate[] = [];
          if (Array.isArray(data.landing)) {
            data.landing.forEach((t: any) => {
              legacyList.push({
                id: t.id || `landing_${Date.now()}_${Math.random()}`,
                name: t.name,
                category: (t.category || 'Landing Page').trim(),
                industry: t.industry || 'General',
                template: t.template,
                imageUrl: t.imageUrl,
                videoUrl: t.videoUrl,
                link1: t.link1,
                link2: t.link2,
                description: t.description || `Full prompt blueprint.`
              });
            });
          }
          if (Array.isArray(data.ecommerce)) {
            data.ecommerce.forEach((t: any) => {
              legacyList.push({
                id: t.id || `ecom_${Date.now()}_${Math.random()}`,
                name: t.name,
                category: (t.category || 'eCommerce').trim(),
                industry: t.industry || 'General',
                template: t.template,
                imageUrl: t.imageUrl,
                videoUrl: t.videoUrl,
                link1: t.link1,
                link2: t.link2,
                description: t.description || `Full prompt blueprint.`
              });
            });
          }
          if (legacyList.length > 0) {
            fullList = legacyList;
            foundSomething = true;
          }
        }
      }

      if (modSnap.exists()) {
        const data = modSnap.data();
        if (Array.isArray(data.templates) && data.templates.length > 0) {
          modList = data.templates;
          foundSomething = true;
        }
      }

      if (foundSomething) {
        console.log("Found legacy templates in Firestore! Migrating...", { fullCount: fullList.length, modCount: modList.length });
        if (fullList.length > 0) {
          adminFullTemplatesMemory = fullList;
          safeStorage.setItem('ciya_admin_full_prompts', JSON.stringify(fullList));
        }
        if (modList.length > 0) {
          adminModularTemplatesMemory = modList;
          safeStorage.setItem('ciya_admin_modular_prompts', JSON.stringify(modList));
        }
        
        // Save to disk file as well
        await this.persistToDisk(
          fullList.length > 0 ? fullList : this.getFullTemplates(),
          modList.length > 0 ? modList : this.getModularTemplates()
        );
        
        this.broadcast();
      }

      safeStorage.setItem('ciya_frontend_prompts_migrated_from_cloud', 'true');
      return foundSomething;
    } catch (err) {
      console.error("Migration from Firestore failed:", err);
      return false;
    }
  },

  async loadFromServer(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!checkIsAdmin()) {
      // Students and all other users: do not load from backend
      return;
    }
    try {
      // Add a timestamp cache-buster to prevent the browser from serving cached GET responses
      const res = await fetch(`/api/prompts?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        const serverFull = data.fullTemplates;
        const serverMod = data.modularTemplates;

        let hasUpdates = false;

        if (Array.isArray(serverFull)) {
          const cachedFullStr = safeStorage.getItem('ciya_admin_full_prompts');
          const serverFullStr = JSON.stringify(serverFull);
          if (cachedFullStr !== serverFullStr) {
            adminFullTemplatesMemory = serverFull;
            safeStorage.setItem('ciya_admin_full_prompts', serverFullStr);
            if (data.fullUpdatedAt) {
              safeStorage.setItem('ciya_last_static_updated_at', data.fullUpdatedAt);
            }
            hasUpdates = true;
          }
        }

        if (Array.isArray(serverMod)) {
          const cachedModStr = safeStorage.getItem('ciya_admin_modular_prompts');
          const serverModStr = JSON.stringify(serverMod);
          if (cachedModStr !== serverModStr) {
            adminModularTemplatesMemory = serverMod;
            safeStorage.setItem('ciya_admin_modular_prompts', serverModStr);
            if (data.modularUpdatedAt) {
              safeStorage.setItem('ciya_last_static_modular_updated_at', data.modularUpdatedAt);
            }
            hasUpdates = true;
          }
        }

        if (hasUpdates) {
          this.broadcast();
          console.log("Successfully synchronized templates from server (detected difference).");
        }
      }
    } catch (err) {
      console.warn("Unable to load templates from server:", err);
    }
  },

  async persistToDisk(fullList: FullPromptTemplate[], modularList: ModularPromptTemplate[]): Promise<any> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/prompts/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fullTemplates: fullList,
            modularTemplates: modularList
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.fullUpdatedAt) {
            safeStorage.setItem('ciya_last_static_updated_at', data.fullUpdatedAt);
          }
          if (data.modularUpdatedAt) {
            safeStorage.setItem('ciya_last_static_modular_updated_at', data.modularUpdatedAt);
          }
          console.log("Successfully sent prompts update to server disk API and synchronized timestamps.");
          return data;
        }
      } catch (err) {
        console.warn("Unable to save prompts on disk:", err);
      }
    }
    return null;
  }
};
