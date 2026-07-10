import React from 'react';
import { Plus, Trash2, Check } from 'lucide-react';

interface PortfolioQuestionnaireFormProps {
  viewPerspective: string;
  hasSite: string;
  setHasSite: (val: string) => void;
  siteUrl: string;
  setSiteUrl: (val: string) => void;
  businessName: string;
  setBusinessName: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
  hasSocialMediaAsked: string;
  setHasSocialMediaAsked: (val: string) => void;
  socialLinks: string[];
  setSocialLinks: (val: string[]) => void;
  
  // Portfolio Specific
  portfolioProfession: string;
  setPortfolioProfession: (val: string) => void;
  portfolioProfessionOther: string;
  setPortfolioProfessionOther: (val: string) => void;
  portfolioTools: string[];
  setPortfolioTools: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioToolsOther: string;
  setPortfolioToolsOther: (val: string) => void;
  portfolioYearsExperience: string;
  setPortfolioYearsExperience: (val: string) => void;
  portfolioStrengths: string;
  setPortfolioStrengths: (val: string) => void;

  portfolioPurposes: string[];
  setPortfolioPurposes: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioVisitorActions: string[];
  setPortfolioVisitorActions: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioTargetVisitors: string[];
  setPortfolioTargetVisitors: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioTargetIndustries: string[];
  setPortfolioTargetIndustries: React.Dispatch<React.SetStateAction<string[]>>;

  portfolioFeaturedCount: string;
  setPortfolioFeaturedCount: (val: string) => void;
  portfolioPresentationStyles: string[];
  setPortfolioPresentationStyles: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioProjects: Array<{ title: string; company: string; desc: string; year: string; category: string; link: string; tools: string }>;
  setPortfolioProjects: React.Dispatch<React.SetStateAction<Array<{ title: string; company: string; desc: string; year: string; category: string; link: string; tools: string }>>>;
  portfolioHasImages: string;
  setPortfolioHasImages: (val: string) => void;

  portfolioBio: string;
  setPortfolioBio: (val: string) => void;
  portfolioDifferentiators: string[];
  setPortfolioDifferentiators: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioDifferentiatorDetail: string;
  setPortfolioDifferentiatorDetail: (val: string) => void;
  portfolioHasPhoto: string;
  setPortfolioHasPhoto: (val: string) => void;
  portfolioShowEducation: string;
  setPortfolioShowEducation: (val: string) => void;
  portfolioEducationDetails: string;
  setPortfolioEducationDetails: (val: string) => void;
  portfolioShowExperience: string;
  setPortfolioShowExperience: (val: string) => void;
  portfolioExperienceDetails: string;
  setPortfolioExperienceDetails: (val: string) => void;

  portfolioShowServices: string;
  setPortfolioShowServices: (val: string) => void;
  portfolioServicesOffered: string[];
  setPortfolioServicesOffered: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioServicesOther: string;
  setPortfolioServicesOther: (val: string) => void;
  portfolioShowPricing: string;
  setPortfolioShowPricing: (val: string) => void;
  portfolioPricingDetails: string;
  setPortfolioPricingDetails: (val: string) => void;
  portfolioTypicalProcess: string[];
  setPortfolioTypicalProcess: React.Dispatch<React.SetStateAction<string[]>>;

  portfolioHasTestimonials: string;
  setPortfolioHasTestimonials: (val: string) => void;
  portfolioTestimonialsList: Array<{ quote: string; name: string; titleCompany: string }>;
  setPortfolioTestimonialsList: React.Dispatch<React.SetStateAction<Array<{ quote: string; name: string; titleCompany: string }>>>;
  portfolioNotableBrands: string;
  setPortfolioNotableBrands: (val: string) => void;
  portfolioHasAwards: string;
  setPortfolioHasAwards: (val: string) => void;
  portfolioAwardsDetails: string;
  setPortfolioAwardsDetails: (val: string) => void;

  portfolioHasLogo: string;
  setPortfolioHasLogo: (val: string) => void;
  portfolioLogoDesign: string;
  setPortfolioLogoDesign: (val: string) => void;
  portfolioHasBrandColors: string;
  setPortfolioHasBrandColors: (val: string) => void;
  portfolioColorsCount: number;
  setPortfolioColorsCount: (val: number) => void;
  portfolioBrandColors: string[];
  setPortfolioBrandColors: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioVisualPersonalities: string[];
  setPortfolioVisualPersonalities: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioInspirations: string[];
  setPortfolioInspirations: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioInspirationDetail: string;
  setPortfolioInspirationDetail: (val: string) => void;

  portfolioPagesNeeded: string[];
  setPortfolioPagesNeeded: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioPreferredStructure: string;
  setPortfolioPreferredStructure: (val: string) => void;
  portfolioHasBlog: string;
  setPortfolioHasBlog: (val: string) => void;
  portfolioBlogTopics: string;
  setPortfolioBlogTopics: (val: string) => void;
  portfolioHasCV: string;
  setPortfolioHasCV: (val: string) => void;

  portfolioFeaturesNeeded: string[];
  setPortfolioFeaturesNeeded: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioContactPreferences: string[];
  setPortfolioContactPreferences: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioAnimationLevel: string;
  setPortfolioAnimationLevel: (val: string) => void;
  portfolioHasNDA: string;
  setPortfolioHasNDA: (val: string) => void;

  portfolioTrafficSources: string[];
  setPortfolioTrafficSources: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioWantsSEO: string;
  setPortfolioWantsSEO: (val: string) => void;
  portfolioCustomDomain: string;
  setPortfolioCustomDomain: (val: string) => void;

  portfolioDeadline: string;
  setPortfolioDeadline: (val: string) => void;
  portfolioBudget: string;
  setPortfolioBudget: (val: string) => void;
  portfolioDrivingEvent: string[];
  setPortfolioDrivingEvent: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioAdditionalNotes: string;
  setPortfolioAdditionalNotes: (val: string) => void;

  toggleMultiSelect: (item: string, list: string[], setter: any) => void;
  updateArrayItem: (idx: number, val: string, list: string[], setter: any) => void;
  removeArrayItem: (idx: number, list: string[], setter: any) => void;
  addArrayItem: (list: string[], setter: any) => void;
}

export default function PortfolioQuestionnaireForm({
  viewPerspective,
  hasSite,
  setHasSite,
  siteUrl,
  setSiteUrl,
  businessName,
  setBusinessName,
  phone,
  setPhone,
  email,
  setEmail,
  address,
  setAddress,
  hasSocialMediaAsked,
  setHasSocialMediaAsked,
  socialLinks,
  setSocialLinks,
  
  portfolioProfession,
  setPortfolioProfession,
  portfolioProfessionOther,
  setPortfolioProfessionOther,
  portfolioTools,
  setPortfolioTools,
  portfolioToolsOther,
  setPortfolioToolsOther,
  portfolioYearsExperience,
  setPortfolioYearsExperience,
  portfolioStrengths,
  setPortfolioStrengths,

  portfolioPurposes,
  setPortfolioPurposes,
  portfolioVisitorActions,
  setPortfolioVisitorActions,
  portfolioTargetVisitors,
  setPortfolioTargetVisitors,
  portfolioTargetIndustries,
  setPortfolioTargetIndustries,

  portfolioFeaturedCount,
  setPortfolioFeaturedCount,
  portfolioPresentationStyles,
  setPortfolioPresentationStyles,
  portfolioProjects,
  setPortfolioProjects,
  portfolioHasImages,
  setPortfolioHasImages,

  portfolioBio,
  setPortfolioBio,
  portfolioDifferentiators,
  setPortfolioDifferentiators,
  portfolioDifferentiatorDetail,
  setPortfolioDifferentiatorDetail,
  portfolioHasPhoto,
  setPortfolioHasPhoto,
  portfolioShowEducation,
  setPortfolioShowEducation,
  portfolioEducationDetails,
  setPortfolioEducationDetails,
  portfolioShowExperience,
  setPortfolioShowExperience,
  portfolioExperienceDetails,
  setPortfolioExperienceDetails,

  portfolioShowServices,
  setPortfolioShowServices,
  portfolioServicesOffered,
  setPortfolioServicesOffered,
  portfolioServicesOther,
  setPortfolioServicesOther,
  portfolioShowPricing,
  setPortfolioShowPricing,
  portfolioPricingDetails,
  setPortfolioPricingDetails,
  portfolioTypicalProcess,
  setPortfolioTypicalProcess,

  portfolioHasTestimonials,
  setPortfolioHasTestimonials,
  portfolioTestimonialsList,
  setPortfolioTestimonialsList,
  portfolioNotableBrands,
  setPortfolioNotableBrands,
  portfolioHasAwards,
  setPortfolioHasAwards,
  portfolioAwardsDetails,
  setPortfolioAwardsDetails,

  portfolioHasLogo,
  setPortfolioHasLogo,
  portfolioLogoDesign,
  setPortfolioLogoDesign,
  portfolioHasBrandColors,
  setPortfolioHasBrandColors,
  portfolioColorsCount,
  setPortfolioColorsCount,
  portfolioBrandColors,
  setPortfolioBrandColors,
  portfolioVisualPersonalities,
  setPortfolioVisualPersonalities,
  portfolioInspirations,
  setPortfolioInspirations,
  portfolioInspirationDetail,
  setPortfolioInspirationDetail,

  portfolioPagesNeeded,
  setPortfolioPagesNeeded,
  portfolioPreferredStructure,
  setPortfolioPreferredStructure,
  portfolioHasBlog,
  setPortfolioHasBlog,
  portfolioBlogTopics,
  setPortfolioBlogTopics,
  portfolioHasCV,
  setPortfolioHasCV,

  portfolioFeaturesNeeded,
  setPortfolioFeaturesNeeded,
  portfolioContactPreferences,
  setPortfolioContactPreferences,
  portfolioAnimationLevel,
  setPortfolioAnimationLevel,
  portfolioHasNDA,
  setPortfolioHasNDA,

  portfolioTrafficSources,
  setPortfolioTrafficSources,
  portfolioWantsSEO,
  setPortfolioWantsSEO,
  portfolioCustomDomain,
  setPortfolioCustomDomain,

  portfolioDeadline,
  setPortfolioDeadline,
  portfolioBudget,
  setPortfolioBudget,
  portfolioDrivingEvent,
  setPortfolioDrivingEvent,
  portfolioAdditionalNotes,
  setPortfolioAdditionalNotes,

  toggleMultiSelect,
  updateArrayItem,
  removeArrayItem,
  addArrayItem
}: PortfolioQuestionnaireFormProps) {

  const qL = (clientText: string, freelancerText: string) => {
    return viewPerspective === 'client' ? clientText : freelancerText;
  };

  const professions = [
    'UI/UX Designer', 'Graphic Designer', 'Web Developer', 'Full-Stack Developer',
    'Frontend Developer', 'Motion Designer / Animator', 'Photographer',
    'Videographer / Editor', 'Copywriter / Content Writer', 'Social Media Manager',
    'Brand Strategist', 'Illustrator', '3D Artist / CGI', 'Data Analyst',
    'Product Manager', 'Other'
  ];

  const techTools = [
    'Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'After Effects', 'Premiere Pro',
    'HTML / CSS / JS', 'React / Next.js', 'Python', 'Node.js', 'WordPress', 'Webflow',
    'Framer', 'Blender / Cinema 4D', 'Excel / Power BI', 'Canva', 'AI Tools (Claude, GPT, Midjourney)', 'Other'
  ];

  const experienceRanges = [
    'Just starting out (0–1 yr)', '1–2 years', '3–5 years', '6–10 years', '10+ years'
  ];

  const purposesList = [
    'Get freelance clients', 'Land a full-time job', 'Attract agency work',
    'Build my personal brand', 'Showcase student work', 'Sell my services directly',
    'Win speaking opportunities', 'Attract media / press coverage', 'Other'
  ];

  const actionsList = [
    'Send me an enquiry / email', 'Book a discovery call', 'Download my CV / résumé',
    'View my work / case studies', 'Follow me on social media', 'Hire me directly',
    'Subscribe to my newsletter'
  ];

  const visitorsList = [
    'Potential clients (businesses)', 'Recruiters / HR managers', 'Hiring managers / CTOs',
    'Other designers / creatives', 'Startup founders', 'Agency creative directors',
    'General public / community'
  ];

  const industriesList = [
    'Tech & startups', 'Finance & fintech', 'Fashion & beauty', 'Health & wellness',
    'Media & entertainment', 'Education & NGOs', 'Real estate & construction',
    'Hospitality & food', 'Government & public sector', 'Any / open to all'
  ];

  const presentationList = [
    'Project cards (image + title grid)', 'Full case studies (detailed breakdowns)',
    'Photo / video gallery', 'Before & after comparisons', 'Interactive demos / prototypes',
    'GitHub repo links', 'Live website links', 'Downloadable PDFs'
  ];

  const differentiatorsList = [
    'Niche specialisation', 'Industry experience (specific sector)', 'Measurable results / data',
    'Speed / fast turnaround', 'Unique process / methodology', 'Bilingual / multicultural background',
    'Award-winning or recognised work', 'Years of experience', 'Combination of skills (e.g. design + code)',
    'Deep understanding of African markets'
  ];

  const servicesList = [
    'UI/UX Design', 'Web Design', 'Mobile App Design', 'Brand Identity & Logo',
    'Web Development', 'Frontend Development', 'WordPress / Webflow Dev',
    'Photography', 'Video Production', 'Social Media Management', 'Copywriting / Content',
    'Motion Design / Animation', 'Illustration', 'SEO & Digital Marketing', 'Consulting / Strategy', 'Other'
  ];

  const processesList = [
    'Discovery / briefing call', 'Research & strategy', 'Wireframing / sketching',
    'Design / development', 'Review & revisions', 'Delivery & handover', 'Ongoing support / retainer'
  ];

  const personalitiesList = [
    'Minimal & clean', 'Bold & expressive', 'Dark & dramatic', 'Light & airy',
    'Luxury & premium', 'Playful & colourful', 'Technical & structured', 'Warm & human',
    'Futuristic / cutting-edge', 'Editorial / magazine-like'
  ];

  const pagesList = [
    'Hero / Home section', 'About me section', 'Work / Portfolio gallery',
    'Individual case study pages', 'Services section', 'Skills & tools section',
    'Experience / CV timeline', 'Testimonials section', 'Achievements / awards',
    'Blog / articles', 'Contact form', 'CV download button'
  ];

  const featuresList = [
    'Contact / enquiry form', 'WhatsApp contact button', 'Email mailto link',
    'CV / résumé download button', 'Work filter by category', 'Project lightbox / modal viewer',
    'Dark mode toggle', 'Booking / calendar link (Calendly etc.)', 'Newsletter sign-up',
    'Live chat widget', 'Password-protected work (for NDA projects)', 'Animation / scroll effects',
    'Multi-language support'
  ];

  const contactList = [
    'Contact form on site', 'Direct email link', 'WhatsApp', 'LinkedIn DM', 'Calendly / booking link', 'Instagram DM'
  ];

  const trafficList = [
    'LinkedIn profile link', 'Email signature', 'Job applications', 'Instagram / TikTok bio',
    'Behance / Dribbble / GitHub', 'Google search (SEO)', 'Word of mouth / referrals',
    'Networking events', 'Twitter / X community'
  ];

  const drivingEventsList = [
    'Upcoming job interview', 'Job application deadline', 'Graduation / end of programme',
    'Pitching for a contract', 'Launching my freelance business', 'No specific deadline'
  ];

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: Personal Information */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">1</span>
          {qL("Personal Information", "Client Personal Information")}
        </legend>

        <div className="space-y-4 pt-3 font-sans">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Do you already have a portfolio website?", "Does the client have an existing portfolio website?")}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={hasSite === 'yes'} onChange={() => setHasSite('yes')} className="accent-[#1A3C6E]" /> Yes
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={hasSite === 'no'} onChange={() => setHasSite('no')} className="accent-[#1A3C6E]" /> No — this is my first one
              </label>
            </div>
            {hasSite === 'yes' && (
              <input 
                type="text" 
                value={siteUrl} 
                onChange={e => setSiteUrl(e.target.value)} 
                placeholder="Paste your current portfolio URL here..." 
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs mt-2 focus:ring-1 focus:ring-[#1A3C6E] outline-none"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {qL("Full Name / Professional Name *", "Client Full Name / Professional Name *")}
              </label>
              <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Ada Okonkwo Design" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white font-medium" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {qL("Job Title / Discipline *", "Client Job Title / Discipline *")}
              </label>
              <div className="flex flex-wrap gap-2 mt-1">
                {professions.map(prof => (
                  <button
                    key={prof}
                    type="button"
                    onClick={() => setPortfolioProfession(prof)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                      portfolioProfession === prof
                        ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {prof}
                  </button>
                ))}
              </div>
              {portfolioProfession === 'Other' && (
                <input
                  type="text"
                  value={portfolioProfessionOther}
                  onChange={e => setPortfolioProfessionOther(e.target.value)}
                  placeholder="Specify other job title..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs mt-2 focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234 ..." className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white font-medium" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@yourname.com" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white font-medium" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Location / Based In</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Lagos, Nigeria" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white font-medium" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Do you have active social media or professional profiles?", "Does the client have professional profiles?")}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={hasSocialMediaAsked === 'yes'} onChange={() => setHasSocialMediaAsked('yes')} className="accent-[#1A3C6E]" /> Yes
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={hasSocialMediaAsked === 'no'} onChange={() => setHasSocialMediaAsked('no')} className="accent-[#1A3C6E]" /> No
              </label>
            </div>
            {hasSocialMediaAsked === 'yes' && (
              <div className="space-y-2 mt-2">
                {socialLinks.map((link, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={link}
                      onChange={e => updateArrayItem(idx, e.target.value, socialLinks, setSocialLinks)}
                      placeholder={`e.g. LinkedIn, Behance, GitHub, Instagram URL`}
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
                    />
                    {socialLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem(idx, socialLinks, setSocialLinks)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100"
                        title="Remove link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem(socialLinks, setSocialLinks)}
                  className="flex items-center gap-1 text-[11px] font-extrabold text-[#1A3C6E] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border-0 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Profile Link
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Your Key Tools & Technologies", "Client's Key Tools & Technologies")}
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {techTools.map(tool => {
                const isSelected = portfolioTools.includes(tool);
                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => toggleMultiSelect(tool, portfolioTools, setPortfolioTools)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#D4A017]" />}
                    {tool}
                  </button>
                );
              })}
            </div>
            {portfolioTools.includes('Other') && (
              <input
                type="text"
                value={portfolioToolsOther}
                onChange={e => setPortfolioToolsOther(e.target.value)}
                placeholder="Specify other tools..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs mt-2 focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Years of Experience</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {experienceRanges.map(exp => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => setPortfolioYearsExperience(exp)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                      portfolioYearsExperience === exp
                        ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {qL("Top 3-5 Strengths / Core Skills", "Top 3-5 Client Strengths")}
              </label>
              <textarea
                value={portfolioStrengths}
                onChange={e => setPortfolioStrengths(e.target.value)}
                placeholder="e.g. Mobile-first design, interactive prototypes, fast turnaround..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 2: Portfolio Purpose & Goal */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">2</span>
          {qL("Portfolio Purpose & Goal", "Client Portfolio Purpose & Goal")}
        </legend>

        <div className="space-y-4 pt-3 font-sans">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Primary Purpose (Select all that apply)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {purposesList.map(purpose => {
                const isSelected = portfolioPurposes.includes(purpose);
                return (
                  <button
                    key={purpose}
                    type="button"
                    onClick={() => toggleMultiSelect(purpose, portfolioPurposes, setPortfolioPurposes)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#D4A017]" />}
                    {purpose}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">What action should visitors take?</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {actionsList.map(act => {
                const isSelected = portfolioVisitorActions.includes(act);
                return (
                  <button
                    key={act}
                    type="button"
                    onClick={() => toggleMultiSelect(act, portfolioVisitorActions, setPortfolioVisitorActions)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#D4A017]" />}
                    {act}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Target Visitors</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {visitorsList.map(vis => {
                  const isSelected = portfolioTargetVisitors.includes(vis);
                  return (
                    <button
                      key={vis}
                      type="button"
                      onClick={() => toggleMultiSelect(vis, portfolioTargetVisitors, setPortfolioTargetVisitors)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-[#D4A017]" />}
                      {vis}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Industries or Niches to Attract</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {industriesList.map(ind => {
                  const isSelected = portfolioTargetIndustries.includes(ind);
                  return (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => toggleMultiSelect(ind, portfolioTargetIndustries, setPortfolioTargetIndustries)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-[#D4A017]" />}
                      {ind}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 3: Work Samples & Case Studies */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">3</span>
          {qL("Work Samples & Case Studies", "Client Work Samples")}
        </legend>

        <div className="space-y-4 pt-3 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Number of featured projects</label>
              <select
                value={portfolioFeaturedCount}
                onChange={e => setPortfolioFeaturedCount(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white cursor-pointer"
              >
                <option value="3-4">3–4 (focused, curated)</option>
                <option value="5-6">5–6 (standard)</option>
                <option value="7-10">7–10 (comprehensive)</option>
                <option value="10+">10+ (full archive)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Presentation Style</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {presentationList.map(pres => {
                  const isSelected = portfolioPresentationStyles.includes(pres);
                  return (
                    <button
                      key={pres}
                      type="button"
                      onClick={() => toggleMultiSelect(pres, portfolioPresentationStyles, setPortfolioPresentationStyles)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-[#D4A017]" />}
                      {pres}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-800 block mb-2 uppercase tracking-wide">Featured Projects</label>
            <div className="space-y-4">
              {portfolioProjects.map((proj, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 relative">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-extrabold text-[#1A3C6E]">Project #{idx + 1}</span>
                    {portfolioProjects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...portfolioProjects];
                          updated.splice(idx, 1);
                          setPortfolioProjects(updated);
                        }}
                        className="text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg border-0 cursor-pointer"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Project Title</label>
                      <input
                        type="text"
                        value={proj.title}
                        onChange={e => {
                          const updated = [...portfolioProjects];
                          updated[idx].title = e.target.value;
                          setPortfolioProjects(updated);
                        }}
                        placeholder="e.g. FinTech App Redesign"
                        className="w-full border border-slate-100 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Client / Company (or 'Personal')</label>
                      <input
                        type="text"
                        value={proj.company}
                        onChange={e => {
                          const updated = [...portfolioProjects];
                          updated[idx].company = e.target.value;
                          setPortfolioProjects(updated);
                        }}
                        placeholder="e.g. StashPay, Personal Project"
                        className="w-full border border-slate-100 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Brief Description (What you did & metrics achieved)</label>
                    <textarea
                      value={proj.desc}
                      onChange={e => {
                        const updated = [...portfolioProjects];
                        updated[idx].desc = e.target.value;
                        setPortfolioProjects(updated);
                      }}
                      placeholder="Led UX research and designed onboarding flow, decreasing bounce rate by 34%..."
                      rows={2}
                      className="w-full border border-slate-100 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Year Completed</label>
                      <input
                        type="text"
                        value={proj.year}
                        onChange={e => {
                          const updated = [...portfolioProjects];
                          updated[idx].year = e.target.value;
                          setPortfolioProjects(updated);
                        }}
                        placeholder="e.g. 2024"
                        className="w-full border border-slate-100 rounded-lg px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Category</label>
                      <input
                        type="text"
                        value={proj.category}
                        onChange={e => {
                          const updated = [...portfolioProjects];
                          updated[idx].category = e.target.value;
                          setPortfolioProjects(updated);
                        }}
                        placeholder="e.g. UI/UX Design, Development"
                        className="w-full border border-slate-100 rounded-lg px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Tools Used</label>
                      <input
                        type="text"
                        value={proj.tools}
                        onChange={e => {
                          const updated = [...portfolioProjects];
                          updated[idx].tools = e.target.value;
                          setPortfolioProjects(updated);
                        }}
                        placeholder="e.g. Figma, React, Tailwind"
                        className="w-full border border-slate-100 rounded-lg px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Project Link (Live / Prototype)</label>
                    <input
                      type="text"
                      value={proj.link}
                      onChange={e => {
                        const updated = [...portfolioProjects];
                        updated[idx].link = e.target.value;
                        setPortfolioProjects(updated);
                      }}
                      placeholder="e.g. https://behance.net/..."
                      className="w-full border border-slate-100 rounded-lg px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setPortfolioProjects([
                    ...portfolioProjects,
                    { title: '', company: '', desc: '', year: '', category: '', link: '', tools: '' }
                  ]);
                }}
                className="flex items-center gap-1.5 text-xs font-black text-[#1A3C6E] bg-teal-50 px-4 py-2 border-0 rounded-full cursor-pointer hover:bg-teal-100/80 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Project Card
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Do you have work images / screenshots to provide?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={portfolioHasImages === 'yes'} onChange={() => setPortfolioHasImages('yes')} className="accent-[#1A3C6E]" /> Yes, I will provide them
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={portfolioHasImages === 'no'} onChange={() => setPortfolioHasImages('no')} className="accent-[#1A3C6E]" /> No, use styled placeholders
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={portfolioHasImages === 'some'} onChange={() => setPortfolioHasImages('some')} className="accent-[#1A3C6E]" /> Some — I'll provide what I have
              </label>
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 4: About You */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">4</span>
          {qL("About You", "Client Professional Biography")}
        </legend>

        <div className="space-y-4 pt-3 font-sans">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Professional Biography (2-4 sentences)</label>
            <textarea
              value={portfolioBio}
              onChange={e => setPortfolioBio(e.target.value)}
              placeholder="e.g. I am a UI/UX designer based in Lagos with 4 years of experience crafting intuitive digital products for startups across Africa..."
              rows={4}
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">What sets you apart? (Select all that apply)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {differentiatorsList.map(diff => {
                const isSelected = portfolioDifferentiators.includes(diff);
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => toggleMultiSelect(diff, portfolioDifferentiators, setPortfolioDifferentiators)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#D4A017]" />}
                    {diff}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={portfolioDifferentiatorDetail}
              onChange={e => setPortfolioDifferentiatorDetail(e.target.value)}
              placeholder="Describe your specific differentiator in one sentence..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs mt-2 focus:ring-1 focus:ring-[#1A3C6E] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Include professional photo?</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioHasPhoto === 'yes'} onChange={() => setPortfolioHasPhoto('yes')} className="accent-[#1A3C6E]" /> Yes
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioHasPhoto === 'no'} onChange={() => setPortfolioHasPhoto('no')} className="accent-[#1A3C6E]" /> No
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Show education background?</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioShowEducation === 'yes'} onChange={() => setPortfolioShowEducation('yes')} className="accent-[#1A3C6E]" /> Yes
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioShowEducation === 'no'} onChange={() => setPortfolioShowEducation('no')} className="accent-[#1A3C6E]" /> No
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Show work experience timeline?</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioShowExperience === 'yes'} onChange={() => setPortfolioShowExperience('yes')} className="accent-[#1A3C6E]" /> Yes
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioShowExperience === 'no'} onChange={() => setPortfolioShowExperience('no')} className="accent-[#1A3C6E]" /> No
                </label>
              </div>
            </div>
          </div>

          {portfolioShowEducation === 'yes' && (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Education & Certifications details</label>
              <textarea
                value={portfolioEducationDetails}
                onChange={e => setPortfolioEducationDetails(e.target.value)}
                placeholder="e.g. B.Sc Computer Science - UniLag (2021)&#10;Google UX Design Professional Certificate (2022)"
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
              />
            </div>
          )}

          {portfolioShowExperience === 'yes' && (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Work History details</label>
              <textarea
                value={portfolioExperienceDetails}
                onChange={e => setPortfolioExperienceDetails(e.target.value)}
                placeholder="e.g. Flutterwave - UI/UX Designer (2022-2024)&#10;Zikoko Media - Design Intern (2021)"
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
              />
            </div>
          )}
        </div>
      </fieldset>

      {/* SECTION 5: Services & What You Offer */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">5</span>
          {qL("Services & Offerings", "Client Services & Rates")}
        </legend>

        <div className="space-y-4 pt-3 font-sans">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Do you want to display your services offered?</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={portfolioShowServices === 'yes'} onChange={() => setPortfolioShowServices('yes')} className="accent-[#1A3C6E]" /> Yes
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={portfolioShowServices === 'no'} onChange={() => setPortfolioShowServices('no')} className="accent-[#1A3C6E]" /> No
              </label>
            </div>
          </div>

          {portfolioShowServices === 'yes' && (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Services List (Select all that apply)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {servicesList.map(srv => {
                  const isSelected = portfolioServicesOffered.includes(srv);
                  return (
                    <button
                      key={srv}
                      type="button"
                      onClick={() => toggleMultiSelect(srv, portfolioServicesOffered, setPortfolioServicesOffered)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-[#D4A017]" />}
                      {srv}
                    </button>
                  );
                })}
              </div>
              {portfolioServicesOffered.includes('Other') && (
                <input
                  type="text"
                  value={portfolioServicesOther}
                  onChange={e => setPortfolioServicesOther(e.target.value)}
                  placeholder="Specify other services..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs mt-2 focus:ring-1 focus:ring-[#1A3C6E] outline-none"
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Display Pricing Rates?</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioShowPricing === 'yes'} onChange={() => setPortfolioShowPricing('yes')} className="accent-[#1A3C6E]" /> Yes, show starting prices
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioShowPricing === 'no'} onChange={() => setPortfolioShowPricing('no')} className="accent-[#1A3C6E]" /> No, enquire only
                </label>
              </div>
              {portfolioShowPricing === 'yes' && (
                <textarea
                  value={portfolioPricingDetails}
                  onChange={e => setPortfolioPricingDetails(e.target.value)}
                  placeholder="e.g. Website Design: from ₦150,000&#10;Logo Branding: from ₦80,000"
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs mt-2 focus:ring-1 focus:ring-[#1A3C6E] outline-none"
                />
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Typical Project Process</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {processesList.map(proc => {
                  const isSelected = portfolioTypicalProcess.includes(proc);
                  return (
                    <button
                      key={proc}
                      type="button"
                      onClick={() => toggleMultiSelect(proc, portfolioTypicalProcess, setPortfolioTypicalProcess)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-[#D4A017]" />}
                      {proc}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 6: Testimonials & Notable Brands */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">6</span>
          {qL("Testimonials & Social Proof", "Client Social Proof Assets")}
        </legend>

        <div className="space-y-4 pt-3 font-sans">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Do you have client testimonials?</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={portfolioHasTestimonials === 'yes'} onChange={() => setPortfolioHasTestimonials('yes')} className="accent-[#1A3C6E]" /> Yes, I have them
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={portfolioHasTestimonials === 'no'} onChange={() => setPortfolioHasTestimonials('no')} className="accent-[#1A3C6E]" /> No, use styled placeholders
              </label>
            </div>

            {portfolioHasTestimonials === 'yes' && (
              <div className="space-y-3 mt-3">
                {portfolioTestimonialsList.map((test, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 relative">
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-50">
                      <span className="text-[10px] font-bold text-[#1A3C6E]">Testimonial #{idx + 1}</span>
                      {portfolioTestimonialsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...portfolioTestimonialsList];
                            updated.splice(idx, 1);
                            setPortfolioTestimonialsList(updated);
                          }}
                          className="text-rose-500 hover:text-rose-600 border-0 bg-transparent cursor-pointer"
                          title="Remove quote"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <textarea
                      value={test.quote}
                      onChange={e => {
                        const updated = [...portfolioTestimonialsList];
                        updated[idx].quote = e.target.value;
                        setPortfolioTestimonialsList(updated);
                      }}
                      placeholder="What did they say about your work?"
                      rows={2}
                      className="w-full border border-slate-100 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#1A3C6E]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={test.name}
                        onChange={e => {
                          const updated = [...portfolioTestimonialsList];
                          updated[idx].name = e.target.value;
                          setPortfolioTestimonialsList(updated);
                        }}
                        placeholder="Emeka Nwosu"
                        className="w-full border border-slate-100 rounded-lg px-2.5 py-1 text-xs"
                      />
                      <input
                        type="text"
                        value={test.titleCompany}
                        onChange={e => {
                          const updated = [...portfolioTestimonialsList];
                          updated[idx].titleCompany = e.target.value;
                          setPortfolioTestimonialsList(updated);
                        }}
                        placeholder="CEO, PaidHR Nigeria"
                        className="w-full border border-slate-100 rounded-lg px-2.5 py-1 text-xs"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPortfolioTestimonialsList([
                      ...portfolioTestimonialsList,
                      { quote: '', name: '', titleCompany: '' }
                    ]);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#1A3C6E] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border-0 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Testimonial
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Notable brands / clients worked with</label>
            <textarea
              value={portfolioNotableBrands}
              onChange={e => setPortfolioNotableBrands(e.target.value)}
              placeholder="e.g. Flutterwave, MTN, Zikoko, Personal Startup..."
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Do you have awards or recognitions?</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioHasAwards === 'yes'} onChange={() => setPortfolioHasAwards('yes')} className="accent-[#1A3C6E]" /> Yes
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioHasAwards === 'no'} onChange={() => setPortfolioHasAwards('no')} className="accent-[#1A3C6E]" /> No
                </label>
              </div>
              {portfolioHasAwards === 'yes' && (
                <textarea
                  value={portfolioAwardsDetails}
                  onChange={e => setPortfolioAwardsDetails(e.target.value)}
                  placeholder="e.g. Top 30 Designers - TechCabal, Google Challenge Finalist..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs mt-2 focus:ring-1 focus:ring-[#1A3C6E] outline-none"
                />
              )}
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 7: Branding & Style */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">7</span>
          {qL("Branding & Style Guidelines", "Client Visual Branding Guidelines")}
        </legend>

        <div className="space-y-4 pt-3 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Do you have a personal logo?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioHasLogo === 'yes'} onChange={() => setPortfolioHasLogo('yes')} className="accent-[#1A3C6E]" /> Yes, I will provide it
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioHasLogo === 'no'} onChange={() => setPortfolioHasLogo('no')} className="accent-[#1A3C6E]" /> No logo
                </label>
              </div>
              {portfolioHasLogo === 'no' && (
                <div className="mt-2">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Should freelancer design one?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="radio" checked={portfolioLogoDesign === 'yes'} onChange={() => setPortfolioLogoDesign('yes')} className="accent-[#1A3C6E]" /> Yes, design wordmark
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="radio" checked={portfolioLogoDesign === 'no'} onChange={() => setPortfolioLogoDesign('no')} className="accent-[#1A3C6E]" /> No, just styled text
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Brand Colours Preference</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioHasBrandColors === 'yes'} onChange={() => setPortfolioHasBrandColors('yes')} className="accent-[#1A3C6E]" /> Yes, custom colours
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioHasBrandColors === 'no'} onChange={() => setPortfolioHasBrandColors('no')} className="accent-[#1A3C6E]" /> Let freelancer decide
                </label>
              </div>

              {portfolioHasBrandColors === 'yes' && (
                <div className="mt-2 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 block">Select number of colours</label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPortfolioColorsCount(num)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                          portfolioColorsCount === num
                            ? 'bg-[#1A3C6E] text-white'
                            : 'bg-white text-slate-600'
                        }`}
                      >
                        {num} {num === 1 ? 'Colour' : 'Colours'}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3 items-center">
                    {Array.from({ length: portfolioColorsCount }).map((_, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1">
                        <input
                          type="color"
                          value={portfolioBrandColors[idx] || '#cccccc'}
                          aria-label={`Brand colour ${idx + 1}`}
                          onChange={e => {
                            const updated = [...portfolioBrandColors];
                            updated[idx] = e.target.value;
                            setPortfolioBrandColors(updated);
                          }}
                          className="w-10 h-10 border border-slate-200 rounded-xl cursor-pointer"
                        />
                        <span className="text-[9px] font-bold font-mono uppercase text-slate-500">{portfolioBrandColors[idx]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Visual Personality & Tone (Select all that apply)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {personalitiesList.map(pers => {
                const isSelected = portfolioVisualPersonalities.includes(pers);
                return (
                  <button
                    key={pers}
                    type="button"
                    onClick={() => toggleMultiSelect(pers, portfolioVisualPersonalities, setPortfolioVisualPersonalities)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#D4A017]" />}
                    {pers}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Portfolio Inspirations (URLs of portfolios you admire)</label>
            <div className="space-y-2">
              {portfolioInspirations.map((inspo, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={inspo}
                    onChange={e => updateArrayItem(idx, e.target.value, portfolioInspirations, setPortfolioInspirations)}
                    placeholder="https://..."
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-xs"
                  />
                  {portfolioInspirations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem(idx, portfolioInspirations, setPortfolioInspirations)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem(portfolioInspirations, setPortfolioInspirations)}
                className="flex items-center gap-1 text-[11px] font-bold text-[#1A3C6E] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border-0 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Inspiration URL
              </button>
            </div>
            <textarea
              value={portfolioInspirationDetail}
              onChange={e => setPortfolioInspirationDetail(e.target.value)}
              placeholder="What specifically do you like about these layouts or features?"
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs mt-2 focus:ring-1 focus:ring-[#1A3C6E] outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* SECTION 8: Structure & Pages */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">8</span>
          {qL("Structure & Pages", "Client Portfolio Architecture")}
        </legend>

        <div className="space-y-4 pt-3 font-sans">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Pages / Sections Needed (Select all that apply)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {pagesList.map(pg => {
                const isSelected = portfolioPagesNeeded.includes(pg);
                return (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => toggleMultiSelect(pg, portfolioPagesNeeded, setPortfolioPagesNeeded)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#D4A017]" />}
                    {pg}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Preferred Structure Layout</label>
              <select
                value={portfolioPreferredStructure}
                onChange={e => setPortfolioPreferredStructure(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white cursor-pointer"
              >
                <option value="single-page">Single-page scroll (fast impressions, best for simplicity)</option>
                <option value="multi-page">Multi-page site (separate pages per section, best for large portfolios)</option>
                <option value="hybrid">Hybrid (one-page home + separate case studies, most popular)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Add a blog / articles section?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioHasBlog === 'yes'} onChange={() => setPortfolioHasBlog('yes')} className="accent-[#1A3C6E]" /> Yes
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioHasBlog === 'no'} onChange={() => setPortfolioHasBlog('no')} className="accent-[#1A3C6E]" /> No
                </label>
              </div>
              {portfolioHasBlog === 'yes' && (
                <input
                  type="text"
                  value={portfolioBlogTopics}
                  onChange={e => setPortfolioBlogTopics(e.target.value)}
                  placeholder="Topics to write about (e.g. tutorials, design trends)..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs mt-2 focus:ring-1 focus:ring-[#1A3C6E] outline-none"
                />
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Include downloadable CV / Resume?</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={portfolioHasCV === 'yes'} onChange={() => setPortfolioHasCV('yes')} className="accent-[#1A3C6E]" /> Yes, I will provide the file
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={portfolioHasCV === 'placeholder'} onChange={() => setPortfolioHasCV('placeholder')} className="accent-[#1A3C6E]" /> Yes, add placeholder button
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={portfolioHasCV === 'no'} onChange={() => setPortfolioHasCV('no')} className="accent-[#1A3C6E]" /> No
              </label>
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 9: Functional Requirements */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">9</span>
          {qL("Functional Requirements", "Client Functional Specifications")}
        </legend>

        <div className="space-y-4 pt-3 font-sans">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Features Required (Select all that apply)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {featuresList.map(feat => {
                const isSelected = portfolioFeaturesNeeded.includes(feat);
                return (
                  <button
                    key={feat}
                    type="button"
                    onClick={() => toggleMultiSelect(feat, portfolioFeaturesNeeded, setPortfolioFeaturesNeeded)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#D4A017]" />}
                    {feat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Preferred Contact Channels (Select top 2)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {contactList.map(ch => {
                  const isSelected = portfolioContactPreferences.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleMultiSelect(ch, portfolioContactPreferences, setPortfolioContactPreferences)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-[#D4A017]" />}
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Animation & Scroll Effects</label>
              <select
                value={portfolioAnimationLevel}
                onChange={e => setPortfolioAnimationLevel(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white cursor-pointer"
              >
                <option value="minimal">Minimal — subtle fades (extremely fast-loading, highly professional)</option>
                <option value="moderate">Moderate — smooth scroll reveals (standard modern look)</option>
                <option value="rich">Rich — immersive interactions (great for highly creative roles)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Do you have confidential/NDA projects to protect?</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={portfolioHasNDA === 'yes'} onChange={() => setPortfolioHasNDA('yes')} className="accent-[#1A3C6E]" /> Yes, add a password-locked section
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={portfolioHasNDA === 'no'} onChange={() => setPortfolioHasNDA('no')} className="accent-[#1A3C6E]" /> No
              </label>
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 10: Traffic & Visibility */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">10</span>
          {qL("Traffic & Visibility", "Client Traffic Strategy")}
        </legend>

        <div className="space-y-4 pt-3 font-sans">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">How will people find your portfolio?</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {trafficList.map(tr => {
                const isSelected = portfolioTrafficSources.includes(tr);
                return (
                  <button
                    key={tr}
                    type="button"
                    onClick={() => toggleMultiSelect(tr, portfolioTrafficSources, setPortfolioTrafficSources)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#D4A017]" />}
                    {tr}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Optimize for search engines (SEO)?</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioWantsSEO === 'yes'} onChange={() => setPortfolioWantsSEO('yes')} className="accent-[#1A3C6E]" /> Yes, make it Google searchable
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" checked={portfolioWantsSEO === 'no'} onChange={() => setPortfolioWantsSEO('no')} className="accent-[#1A3C6E]" /> Not a priority right now
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Website URL preference (Custom domain)</label>
              <input
                type="text"
                value={portfolioCustomDomain}
                onChange={e => setPortfolioCustomDomain(e.target.value)}
                placeholder="e.g. adaezeokonkwo.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 11: Deadline, Budget & Events */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">11</span>
          {qL("Deadline, Budget & Milestones", "Client Commercial Terms")}
        </legend>

        <div className="space-y-4 pt-3 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Target Launch Deadline</label>
              <input
                type="text"
                value={portfolioDeadline}
                onChange={e => setPortfolioDeadline(e.target.value)}
                placeholder="e.g. End of August, within 3 weeks..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Budget Range</label>
              <input
                type="text"
                value={portfolioBudget}
                onChange={e => setPortfolioBudget(e.target.value)}
                placeholder="e.g. ₦80,000 – ₦150,000..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Is there a specific driver / launch event?</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {drivingEventsList.map(ev => {
                const isSelected = portfolioDrivingEvent.includes(ev);
                return (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => toggleMultiSelect(ev, portfolioDrivingEvent, setPortfolioDrivingEvent)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#D4A017]" />}
                    {ev}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Additional notes or special requests</label>
            <textarea
              value={portfolioAdditionalNotes}
              onChange={e => setPortfolioAdditionalNotes(e.target.value)}
              placeholder="Any other specific requests or instructions for your freelancer..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
            />
          </div>
        </div>
      </fieldset>

    </div>
  );
}
