import React from 'react';
import { Plus, Trash2, Check } from 'lucide-react';

interface LpQuestionnaireFormProps {
  viewPerspective: string;
  hasSite: string;
  setHasSite: (val: string) => void;
  siteUrl: string;
  setSiteUrl: (val: string) => void;
  businessName: string;
  setBusinessName: (val: string) => void;
  industry: string;
  setIndustry: (val: string) => void;
  hasCustomIndustryOption: boolean;
  setHasCustomIndustryOption: (val: boolean) => void;
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
  visitorActions: string[];
  setVisitorActions: React.Dispatch<React.SetStateAction<string[]>>;
  otherAction: string;
  setOtherAction: (val: string) => void;
  idealAge: string[];
  setIdealAge: (val: string[]) => void;
  locations: string[];
  setLocations: React.Dispatch<React.SetStateAction<string[]>>;
  occupation: string[] | string;
  setOccupation: (val: any) => void;
  problemsSolved: string[];
  setProblemsSolved: React.Dispatch<React.SetStateAction<string[]>>;
  problemsSolvedDetail: string;
  setProblemsSolvedDetail: (val: string) => void;
  hasLogo: string;
  setHasLogo: (val: string) => void;
  logoDesign: string;
  setLogoDesign: (val: string) => void;
  hasBrandColors: string;
  setHasBrandColors: (val: string) => void;
  colorsCount: number;
  setColorsCount: (val: number) => void;
  brandColors: string[];
  setBrandColors: React.Dispatch<React.SetStateAction<string[]>>;
  brandTones: string[];
  setBrandTones: React.Dispatch<React.SetStateAction<string[]>>;
  sectionsToInclude: string[];
  setSectionsToInclude: React.Dispatch<React.SetStateAction<string[]>>;
  displayPricing: string;
  setDisplayPricing: (val: string) => void;
  pricingRanges: string[];
  setPricingRanges: React.Dispatch<React.SetStateAction<string[]>>;
  pricingDetail: string;
  setPricingDetail: (val: string) => void;
  privacyPolicy: string;
  setPrivacyPolicy: (val: string) => void;
  privacyPolicyPrep: string;
  setPrivacyPolicyPrep: (val: string) => void;
  termsPolicy: string;
  setTermsPolicy: (val: string) => void;
  termsPolicyPrep: string;
  setTermsPolicyPrep: (val: string) => void;
  refundPolicy: string;
  setRefundPolicy: (val: string) => void;
  refundPolicyPrep: string;
  setRefundPolicyPrep: (val: string) => void;
  deadline: string;
  setDeadline: (val: string) => void;
  budgetRange: string;
  setBudgetRange: (val: string) => void;
  additionalNotes: string;
  setAdditionalNotes: (val: string) => void;

  hasImages: string;
  setHasImages: (val: string) => void;
  hasVideos: string;
  setHasVideos: (val: string) => void;
  hasTestimonials: string;
  setHasTestimonials: (val: string) => void;
  functionalFeatures: string[];
  setFunctionalFeatures: React.Dispatch<React.SetStateAction<string[]>>;
  otherRequirements: string;
  setOtherRequirements: (val: string) => void;
  runPaidAds: string;
  setRunPaidAds: (val: string) => void;
  adPlatforms: string[];
  setAdPlatforms: React.Dispatch<React.SetStateAction<string[]>>;
  otherTraffic: string[];
  setOtherTraffic: React.Dispatch<React.SetStateAction<string[]>>;

  lpOfferType: string[];
  setLpOfferType: React.Dispatch<React.SetStateAction<string[]>>;
  lpOfferMain: string;
  setLpOfferMain: (val: string) => void;
  lpOfferServices: string[];
  setLpOfferServices: React.Dispatch<React.SetStateAction<string[]>>;
  lpOfferServicesDetail: string;
  setLpOfferServicesDetail: (val: string) => void;
  lpOfferPromo: string[];
  setLpOfferPromo: React.Dispatch<React.SetStateAction<string[]>>;
  lpOfferPromoDetail: string;
  setLpOfferPromoDetail: (val: string) => void;
  lpWhyChoose: string[];
  setLpWhyChoose: React.Dispatch<React.SetStateAction<string[]>>;
  lpWhatMakesSpecial: string[];
  setLpWhatMakesSpecial: React.Dispatch<React.SetStateAction<string[]>>;
  lpWhatMakesSpecialDetail: string;
  setLpWhatMakesSpecialDetail: (val: string) => void;

  toggleMultiSelect: (item: string, list: string[], setter: any) => void;
  updateArrayItem: (idx: number, val: string, list: string[], setter: any) => void;
  removeArrayItem: (idx: number, list: string[], setter: any) => void;
  addArrayItem: (list: string[], setter: any) => void;
}

export default function LpQuestionnaireForm({
  viewPerspective,
  hasSite,
  setHasSite,
  siteUrl,
  setSiteUrl,
  businessName,
  setBusinessName,
  industry,
  setIndustry,
  hasCustomIndustryOption,
  setHasCustomIndustryOption,
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
  visitorActions,
  setVisitorActions,
  otherAction,
  setOtherAction,
  idealAge,
  setIdealAge,
  locations,
  setLocations,
  occupation,
  setOccupation,
  problemsSolved,
  setProblemsSolved,
  problemsSolvedDetail,
  setProblemsSolvedDetail,
  hasLogo,
  setHasLogo,
  logoDesign,
  setLogoDesign,
  hasBrandColors,
  setHasBrandColors,
  colorsCount,
  setColorsCount,
  brandColors,
  setBrandColors,
  brandTones,
  setBrandTones,
  sectionsToInclude,
  setSectionsToInclude,
  displayPricing,
  setDisplayPricing,
  pricingRanges,
  setPricingRanges,
  pricingDetail,
  setPricingDetail,
  privacyPolicy,
  setPrivacyPolicy,
  privacyPolicyPrep,
  setPrivacyPolicyPrep,
  termsPolicy,
  setTermsPolicy,
  termsPolicyPrep,
  setTermsPolicyPrep,
  refundPolicy,
  setRefundPolicy,
  refundPolicyPrep,
  setRefundPolicyPrep,
  deadline,
  setDeadline,
  budgetRange,
  setBudgetRange,
  additionalNotes,
  setAdditionalNotes,

  hasImages,
  setHasImages,
  hasVideos,
  setHasVideos,
  hasTestimonials,
  setHasTestimonials,
  functionalFeatures,
  setFunctionalFeatures,
  otherRequirements,
  setOtherRequirements,
  runPaidAds,
  setRunPaidAds,
  adPlatforms,
  setAdPlatforms,
  otherTraffic,
  setOtherTraffic,

  lpOfferType,
  setLpOfferType,
  lpOfferMain,
  setLpOfferMain,
  lpOfferServices,
  setLpOfferServices,
  lpOfferServicesDetail,
  setLpOfferServicesDetail,
  lpOfferPromo,
  setLpOfferPromo,
  lpOfferPromoDetail,
  setLpOfferPromoDetail,
  lpWhyChoose,
  setLpWhyChoose,
  lpWhatMakesSpecial,
  setLpWhatMakesSpecial,
  lpWhatMakesSpecialDetail,
  setLpWhatMakesSpecialDetail,

  toggleMultiSelect,
  updateArrayItem,
  removeArrayItem,
  addArrayItem
}: LpQuestionnaireFormProps) {

  const qL = (clientText: string, freelancerText: string) => {
    return viewPerspective === 'client' ? clientText : freelancerText;
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: Business Information */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">1</span>
          {qL("Business Information", "Client Business Information")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Do you have an existing website?", "Does the client have an existing website?")}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={hasSite === 'yes'} onChange={() => setHasSite('yes')} /> Yes
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" checked={hasSite === 'no'} onChange={() => setHasSite('no')} /> No
              </label>
            </div>
            {hasSite === 'yes' && (
              <input 
                type="text" 
                value={siteUrl} 
                onChange={e => setSiteUrl(e.target.value)} 
                placeholder="Paste link here..." 
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs mt-2 focus:ring-1 focus:ring-[#1A3C6E] outline-none"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {qL("Business Name *", "Client's Business Name *")}
              </label>
              <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Apex Beauty Studio" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white font-medium" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {qL("Industry / Niche", "Business Industry / Niche")}
              </label>
              <div className="relative">
                <select
                  value={hasCustomIndustryOption ? 'Other' : (['Beauty', 'Fashion', 'Tech', 'Coaching & Consulting', 'Real Estate', 'Healthcare & Fitness', 'Creative Services', 'Agriculture', 'E-learning'].includes(industry) ? industry : (industry ? 'Other' : ''))}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      setHasCustomIndustryOption(true);
                      setIndustry('');
                    } else {
                      setHasCustomIndustryOption(false);
                      setIndustry(val);
                    }
                  }}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white font-medium cursor-pointer"
                >
                  <option value="">-- Choose an Industry --</option>
                  {['Beauty', 'Fashion', 'Tech', 'Coaching & Consulting', 'Real Estate', 'Healthcare & Fitness', 'Creative Services', 'Agriculture', 'E-learning'].map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                  <option value="Other">Custom Industry / Niche...</option>
                </select>

                {(hasCustomIndustryOption || (!['Beauty', 'Fashion', 'Tech', 'Coaching & Consulting', 'Real Estate', 'Healthcare & Fitness', 'Creative Services', 'Agriculture', 'E-learning'].includes(industry) && industry !== '')) && (
                  <input 
                    type="text" 
                    value={industry} 
                    onChange={e => setIndustry(e.target.value)} 
                    placeholder="Add custom industry niche..." 
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs mt-2 focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white"
                  />
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {qL("Phone Number", "Client's Phone Number")}
              </label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +234 81 2345" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {qL("Email Address", "Client's Email Address")}
              </label>
              <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. hello@yourbrand.com" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {qL("Business Address", "Client's Business Address")}
              </label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="City, State" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Do you have Social Media accounts?", "Does the client have Social Media accounts?")}
            </label>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" name="has_soc_med_lp_custom" checked={hasSocialMediaAsked === 'yes'} onChange={() => { setHasSocialMediaAsked('yes'); }} /> Yes
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" name="has_soc_med_lp_custom" checked={hasSocialMediaAsked === 'no'} onChange={() => { setHasSocialMediaAsked('no'); setSocialLinks(['']); }} /> No
              </label>
            </div>

            {hasSocialMediaAsked === 'no' && (
              <div className="mb-3 bg-amber-50/50 border border-amber-200 rounded-xl p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[10px] text-amber-800 font-bold block">No official handles yet? Build dynamic placeholder accounts.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setHasSocialMediaAsked('yes');
                      setSocialLinks(['https://instagram.com/your_industry_brand_placeholder', 'https://facebook.com/your_industry_brand_placeholder']);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1A3C6E] hover:bg-[#15325C] text-white rounded-lg text-[10px] font-black transition-all cursor-pointer"
                  >
                    💡 Use Placeholder Accounts
                  </button>
                </div>
              </div>
            )}

            {hasSocialMediaAsked === 'yes' && (
              <div className="space-y-2">
                {socialLinks.map((link, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      type="text" 
                      value={link} 
                      onChange={e => updateArrayItem(idx, e.target.value, socialLinks, setSocialLinks)} 
                      placeholder={`Social media link ${idx + 1}`} 
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white font-medium"
                    />
                    <button type="button" onClick={() => removeArrayItem(idx, socialLinks, setSocialLinks)} className="p-2 border rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={() => addArrayItem(socialLinks, setSocialLinks)}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 border border-dashed rounded-lg text-xs font-bold text-slate-400 hover:text-[#1A3C6E] hover:border-[#1A3C6E] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add social link
                </button>
              </div>
            )}
          </div>
        </div>
      </fieldset>

      {/* SECTION 2: Project Goal & Actions */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">2</span>
          {qL("Project Goal & Actions", "Project Goal & Customer Actions")}
        </legend>
        
        <div className="space-y-4 pt-3">
          <label className="text-xs font-semibold text-slate-700 block">
            {qL("What action do you want visitors to take? (Select multi)", "What action should visitors take on the Landing Page? (Select multi)")}
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              "Buy Now", "Sign Up / Register", "Book a Call", "Book Appointment", 
              "Download a Freebie", "Get a Quote", "Subscribe to Newsletter", 
              "Contact via WhatsApp", "Watch a Video", "Join a Waitlist", "Learn More", "Claim an Offer"
            ].map(action => (
              <button
                key={action}
                type="button"
                onClick={() => toggleMultiSelect(action, visitorActions, setVisitorActions)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  visitorActions.includes(action) 
                    ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-[#1A3C6E]'
                }`}
              >
                {action}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Any other action?", "Any other custom action required?")}
            </label>
            <input type="text" value={otherAction} onChange={e => setOtherAction(e.target.value)} placeholder="Describe here..." className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none" />
          </div>
        </div>
      </fieldset>

      {/* SECTION 3: Target Audience Definition */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">3</span>
          {qL("Target Audience Profile", "Target Audience Demographics")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              {qL("Age range of ideal customers (Select multi)", "Age range of the client's ideal customers (Select multi)")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { val: "All ages", d: "Balanced tone & layout for everyone" },
                { val: "18 – 35", d: "Modern, fast-paced, mobile-first design" },
                { val: "36 – 55", d: "Clear, professional, trust-focused layout" },
                { val: "56 and above", d: "Large text, simple nav, calm design" }
              ].map(item => {
                const isSelected = Array.isArray(idealAge) ? idealAge.includes(item.val) : idealAge === item.val;
                return (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => {
                      let nextAge: string[] = Array.isArray(idealAge) ? [...idealAge] : [idealAge];
                      if (nextAge.includes(item.val)) {
                        nextAge = nextAge.filter(x => x !== item.val);
                      } else {
                        nextAge.push(item.val);
                      }
                      if (nextAge.length === 0) nextAge = ['All ages'];
                      setIdealAge(nextAge);
                    }}
                    className={`p-3 text-left border rounded-xl transition-all cursor-pointer relative overflow-hidden flex flex-col justify-center ${
                      isSelected
                        ? 'border-[#1A3C6E] bg-[#1A3C6E]/5 text-slate-900 ring-2 ring-[#1A3C6E]/20'
                        : 'border-slate-200 hover:border-[#1A3C6E] bg-white text-slate-600'
                    }`}
                  >
                    <span className="font-bold text-xs block">{item.val}</span>
                    <span className="text-[10px] text-slate-400 mt-1">{item.d}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Locations of target audience", "Geographical locations of target audience")}
            </label>
            <div className="space-y-2">
              {locations.map((loc, idx) => (
                <div key={idx} className="flex gap-2">
                  <input 
                    type="text" 
                    value={loc} 
                    onChange={e => updateArrayItem(idx, e.target.value, locations, setLocations)} 
                    placeholder={`e.g. Lagos, Nigeria`} 
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white font-medium"
                  />
                  <button type="button" onClick={() => removeArrayItem(idx, locations, setLocations)} className="p-2 border rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button 
              type="button" 
              onClick={() => addArrayItem(locations, setLocations)}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 border border-dashed rounded-lg text-xs font-bold text-slate-400 hover:text-[#1A3C6E] hover:border-[#1A3C6E] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> {qL("Add location", "Add Target Location")}
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              {qL("Occupation of target customers (Select multi)", "Target audience occupations (Select multi)")}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {[
                "Working Professionals (9-to-5)", "Entrepreneurs & Business Owners", 
                "Students & Youth", "Stay-at-home parents", "Retirees & Seniors", 
                "Artisans, Traders & Guilds", "Freelancers & Creatives", "Corporate Executives"
              ].map(occ => {
                const isSelected = Array.isArray(occupation) ? occupation.includes(occ) : occupation === occ;
                return (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => {
                      const list = Array.isArray(occupation) ? [...occupation] : (occupation ? [occupation] : []);
                      if (list.includes(occ)) {
                        setOccupation(list.filter(x => x !== occ));
                      } else {
                        setOccupation([...list, occ]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-[#1A3C6E]'
                    }`}
                  >
                    {occ}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              {qL("What problem does your business solve?", "What problem does the client's business solve?")}
            </label>
            <div className="flex flex-wrap gap-2">
              {["Saves time", "Saves money", "Improves appearance", "Boosts confidence", "Solves a health issue", "Provides convenience", "Grows business", "Educates / informs"].map(prob => (
                <button
                  key={prob}
                  type="button"
                  onClick={() => toggleMultiSelect(prob, problemsSolved, setProblemsSolved)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    problemsSolved.includes(prob) 
                      ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-[#1A3C6E]'
                  }`}
                >
                  {prob}
                </button>
              ))}
            </div>
            <input type="text" value={problemsSolvedDetail} onChange={e => setProblemsSolvedDetail(e.target.value)} placeholder="Describe further..." className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs mt-2 focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white font-medium" />
          </div>
        </div>
      </fieldset>

      {/* SECTION 4: Offer Details */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">4</span>
          {qL("Offer Details", "Offer Structures & Categories")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              {qL("What type of offer are you showcasing? (Select all)", "Type of product/service structure (Select all)")}
            </label>
            <div className="flex flex-wrap gap-2">
              {["Service package", "Physical product", "Digital product", "Online course", "Coaching / Consulting", "Membership / Subscription", "Event / Workshop", "Free Lead Magnet", "Other"].map(off => (
                <button
                  key={off}
                  type="button"
                  onClick={() => toggleMultiSelect(off, lpOfferType, setLpOfferType)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    lpOfferType.includes(off) 
                      ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-[#1A3C6E]'
                  }`}
                >
                  {off}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Describe your main offer / premium package in one simple sentence *", "Client's main featured core offer/slogan *")}
            </label>
            <textarea 
              value={lpOfferMain} 
              onChange={e => setLpOfferMain(e.target.value)} 
              placeholder="e.g. Total Hair Rejuvenation Package which includes clarifying wash, protective treatment, trim, and standard custom style for only ₦45,000"
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs min-h-[60px] focus:ring-1 focus:ring-[#1A3C6E] outline-none" 
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              {qL("Select services / categories to list (Select multi)", "Target service categories to list (Select multi)")}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {["Hair services", "Skincare & Polish", "Fashion & Outfit", "Food & Catering", "Tech & Dev services", "Health & Wellness", "Consulting / Advise", "Logistics & Delivery", "Events / weddings", "Decoration", "Real Estate / Properties", "Finance / Accounting", "Rentals"].map(srv => (
                <button
                  key={srv}
                  type="button"
                  onClick={() => toggleMultiSelect(srv, lpOfferServices, setLpOfferServices)}
                  className={`px-3 py-1 rounded border text-xs font-semibold transition-all cursor-pointer ${
                    lpOfferServices.includes(srv) 
                      ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-[#1A3C6E]'
                  }`}
                >
                  {srv}
                </button>
              ))}
            </div>
            <input 
              type="text" 
              value={lpOfferServicesDetail} 
              onChange={e => setLpOfferServicesDetail(e.target.value)} 
              placeholder="Any specific list of custom physical services and deliverables..." 
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              {qL("Promotional tactics / Specials to showcase (Select all)", "Commercial conversion multipliers (Select all)")}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {["Percentage discount", "Free Delivery", "Buy One Get One Free (BOGO)", "Free Gift / Bonus item", "Limited Time countdown pressure", "Free Consultation call", "Early Bird reservation perks", "None"].map(prm => (
                <button
                  key={prm}
                  type="button"
                  onClick={() => toggleMultiSelect(prm, lpOfferPromo, setLpOfferPromo)}
                  className={`px-2.5 py-1 rounded border text-xs font-semibold transition-all cursor-pointer ${
                    lpOfferPromo.includes(prm) 
                      ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-[#1A3C6E]'
                  }`}
                >
                  {prm}
                </button>
              ))}
            </div>
            <input 
              type="text" 
              value={lpOfferPromoDetail} 
              onChange={e => setLpOfferPromoDetail(e.target.value)} 
              placeholder="Add specifics on discounts or specific promo terms..." 
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white font-medium"
            />
          </div>
        </div>
      </fieldset>

      {/* SECTION 5: Unique Selling Point (USP) */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">5</span>
          {qL("Unique Selling Point (USP)", "Primary Core Differentiators")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              {qL("Why should customers buy from you instead of competitors? (Select multi)", "Core reason why customers choose the client (Select multi)")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "Affordable / competitive pricing", "Premium / executive quality", 
                "Fabulous fast delivery / service times", "Generous years of experience / wisdom", 
                "Highly certified / trained experts", "Stellar 5-star customer reviews & trust", 
                "Unique patented materials / methods", "Pristine local / trusted brand values"
              ].map(choose => (
                <button
                  key={choose}
                  type="button"
                  onClick={() => toggleMultiSelect(choose, lpWhyChoose, setLpWhyChoose)}
                  className={`p-2.5 text-left border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    lpWhyChoose.includes(choose) 
                      ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-[#1A3C6E]'
                  }`}
                >
                  {choose}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              {qL("What makes your business special / unique? (Select all)", "Differentiating elements of the client's business (Select all)")}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {["Our heroic story & mission", "Certified elite team & expertise", "Amazing results & outcomes", "Our boutique custom approach", "Vibrant local community projects", "Reputable industry awards / seals", "Rock solidarity satisfaction guarantees"].map(spc => (
                <button
                  key={spc}
                  type="button"
                  onClick={() => toggleMultiSelect(spc, lpWhatMakesSpecial, setLpWhatMakesSpecial)}
                  className={`px-3 py-1 rounded border text-xs font-semibold transition-all cursor-pointer ${
                    lpWhatMakesSpecial.includes(spc) 
                      ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-[#1A3C6E]'
                  }`}
                >
                  {spc}
                </button>
              ))}
            </div>
            <input 
              type="text" 
              value={lpWhatMakesSpecialDetail} 
              onChange={e => setLpWhatMakesSpecialDetail(e.target.value)} 
              placeholder="Further clarify what sets you/your client apart..." 
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* SECTION 6: Branding Details */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">6</span>
          {qL("Branding Details", "Client Brand & Art Guidelines")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Do you have a Logo?", "Does the client have an official Logo?")}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={hasLogo === 'yes'} onChange={() => setHasLogo('yes')} /> Yes</label>
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={hasLogo === 'no'} onChange={() => setHasLogo('no')} /> No</label>
            </div>
            {hasLogo === 'yes' ? (
              <div className="mt-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" /> {qL("Great! Hand over high-res PNG or SVG to your Freelancer.", "Great! Handover the high-resolution vector assets (PNG/SVG).")}
              </div>
            ) : (
              <div className="mt-2 bg-slate-100/50 p-3 rounded-xl space-y-2 border">
                <span className="text-[11px] font-semibold text-slate-600 block">
                  {qL("Would you like your Freelancer to bundle logo construction?", "Does the client need you to provide custom Logo construction services?")}
                </span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" name="logo_design_lp" checked={logoDesign === 'yes'} onChange={() => setLogoDesign('yes')} /> Yes</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" name="logo_design_lp" checked={logoDesign === 'no'} onChange={() => setLogoDesign('no')} /> No</label>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1A3C6E] block mb-1">
              {qL("Do you have specific brand colors in mind?", "Does the client have specific brand hex/color codes locked?")}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={hasBrandColors === 'yes'} onChange={() => setHasBrandColors('yes')} /> Custom colors</label>
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={hasBrandColors === 'no'} onChange={() => setHasBrandColors('no')} /> Freelancer choice</label>
            </div>

            {hasBrandColors === 'yes' && (
              <div className="mt-3 bg-slate-100/50 p-4 border rounded-2xl space-y-3">
                <span className="text-xs font-semibold block">{qL("How many brand colors to lock?", "How many specific color nodes are being registered?")}</span>
                <div className="flex gap-2">
                  {[1, 2, 3].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setColorsCount(n)}
                      className={`px-3 py-1 border text-xs font-bold rounded-lg ${
                        colorsCount === n ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {n} Color{n > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 items-center">
                  {Array.from({ length: colorsCount }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 animate-fadeIn">
                      <span className="text-[10px] font-mono text-slate-400">Color {i + 1}</span>
                      <div className="w-10 h-10 rounded-xl overflow-hidden border shadow-sm relative shrink-0">
                        <input 
                          type="color" 
                          value={brandColors[i] || '#cccccc'} 
                          aria-label={`Color picker ${i + 1}`}
                          onChange={e => {
                            const next = [...brandColors];
                            next[i] = e.target.value;
                            setBrandColors(next);
                          }}
                          className="w-[140%] h-[140%] -translate-x-[15%] -translate-y-[15%] border-none cursor-pointer" 
                        />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-slate-600 uppercase">{brandColors[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Brand Tone / Mood (Select all that apply)", "Client Brand Tone & Design Aesthetic (Select all that apply)")}
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              {["Professional", "Friendly", "Luxury", "Playful", "Bold / Edgy", "Minimalist", "Energetic", "Elegant / Feminine"].map(tone => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => toggleMultiSelect(tone, brandTones, setBrandTones)}
                  className={`px-3 py-1 rounded border text-xs font-semibold cursor-pointer ${
                    brandTones.includes(tone) ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 7: Content & Media Assets */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">7</span>
          {qL("Content & Media Assets", "Source Assets & Gallery Media")}
        </legend>

        <div className="space-y-4 pt-3 text-xs text-slate-700">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              {qL("Do you have professional images for the page?", "What is the status of product/brand images?")}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="lp_media_img" checked={hasImages === 'yes'} onChange={() => setHasImages('yes')} /> Yes, I will provide them</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="lp_media_img" checked={hasImages === 'no'} onChange={() => setHasImages('no')} /> No, let freelancer use free stock stock images</label>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              {qL("Do you have video clips to showcase?", "What is the status of target brand video clips?")}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="lp_media_vid" checked={hasVideos === 'yes'} onChange={() => setHasVideos('yes')} /> Yes, I will provide them</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="lp_media_vid" checked={hasVideos === 'no'} onChange={() => setHasVideos('no')} /> No video needed</label>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              {qL("Do you have written customer reviews / testimonials?", "Status of verified social proof testimonials:")}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="lp_media_tst" checked={hasTestimonials === 'yes'} onChange={() => setHasTestimonials('yes')} /> Yes, I have written reviews</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="lp_media_tst" checked={hasTestimonials === 'no'} onChange={() => setHasTestimonials('no')} /> Please write placeholders reviews first</label>
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 8: Skeleton Layout Sections */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">8</span>
          {qL("Skeleton Layout Sections", "Landing Page Skeleton & Components")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              {qL("Sections to include on the page", "Layout modules to mock and build on canvas")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                "Hero section with CTA", "About the business", "Services list", "Pricing section", 
                "Testimonials", "FAQs", "Gallery / portfolio", "Team section", "Countdown timer", "Booking scheduler",
                "Contact forms & details", "Latest news / Blog posts", "Header Navigation & logo bar"
              ].map(sec => (
                <label key={sec} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-100 rounded-lg">
                  <input 
                    type="checkbox" 
                    checked={sectionsToInclude.includes(sec)} 
                    onChange={() => toggleMultiSelect(sec, sectionsToInclude, setSectionsToInclude)}
                    className="accent-indigo-600 cursor-pointer"
                  />
                  <span>{sec}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Do you want pricing displayed on the page?", "Should pricing packages be openly displayed on the page?")}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={displayPricing === 'yes'} onChange={() => setDisplayPricing('yes')} /> Yes</label>
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={displayPricing === 'no'} onChange={() => setDisplayPricing('no')} /> No</label>
            </div>
            {displayPricing === 'yes' && (
              <div className="mt-2 p-3 bg-slate-100/50 rounded-xl space-y-2 border">
                <span className="text-[11px] font-semibold text-slate-600 block">{qL("Select target pricing tier indicators:", "Provide pricing indicators:")}</span>
                <div className="flex flex-wrap gap-2">
                  {["Under ₦10,000", "₦10,000 – ₦50,000", "₦50,000 – ₦150,000", "₦150,000 – ₦500,000", "Above ₦500,000"].map(range => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => toggleMultiSelect(range, pricingRanges, setPricingRanges)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded ${
                        pricingRanges.includes(range) ? 'bg-[#1A3C6E] text-[#D4A017]' : 'bg-white border text-slate-600'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
                <input 
                  type="text" 
                  value={pricingDetail} 
                  onChange={e => setPricingDetail(e.target.value)} 
                  placeholder="Specific starting prices or pricing rules..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none" 
                />
              </div>
            )}
          </div>
        </div>
      </fieldset>

      {/* SECTION 9: Functional Requirements */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">9</span>
          {qL("Functional Requirements", "Functional Integrations & Extra Scripts")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              {qL("What functional integrations are required? (Select all)", "Interactive features and systems to setup (Select all)")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                "Instant WhatsApp chat button", "Google Maps location embedding", 
                "Live appointment scheduler (Calendly)", "Email list popup collector", 
                "Social media live feed", "Multilingual translation toggles", 
                "Dynamic custom quiz / calculators", "Google Analytics & pixel tracker"
              ].map(feat => (
                <button
                  key={feat}
                  type="button"
                  onClick={() => toggleMultiSelect(feat, functionalFeatures, setFunctionalFeatures)}
                  className={`p-2.5 text-left border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    functionalFeatures.includes(feat) 
                      ? 'bg-[#1A3C6E] text-[#D4A017] border-[#1A3C6E]' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-[#1A3C6E]'
                  }`}
                >
                  {feat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Other specific functional expectations", "Technical/functional notes for build specs")}
            </label>
            <textarea 
              value={otherRequirements} 
              onChange={e => setOtherRequirements(e.target.value)} 
              placeholder="e.g. Needs beautiful sliding FAQ triggers, floating header bars, or integration with standard Webhook..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs min-h-[70px] focus:ring-1 focus:ring-[#1A3C6E] outline-none" 
            />
          </div>
        </div>
      </fieldset>

      {/* SECTION 10: Advertising & Traffic Sources */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">10</span>
          {qL("Advertising & Traffic Sources", "Marketing Campaign Scope")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Are you planning to run paid ads to this Landing Page?", "Is the client spending on paid campaigns to drive traffic?")}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" name="lp_ads_r" checked={runPaidAds === 'yes'} onChange={() => setRunPaidAds('yes')} /> Yes</label>
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" name="lp_ads_r" checked={runPaidAds === 'no'} onChange={() => { setRunPaidAds('no'); }} /> No</label>
            </div>
            {runPaidAds === 'yes' && (
              <div className="mt-2.5 bg-slate-100/50 p-3 border rounded-xl animate-fadeIn space-y-2">
                <span className="text-[11px] font-semibold text-slate-600 block">{qL("Select target ad platform channels:", "Channels configured:")}</span>
                <div className="flex flex-wrap gap-2">
                  {["Meta Ads (FB & Insta)", "Google Search / Display Ads", "TikTok Ads Campaign", "YouTube Video Ads", "LinkedIn Business Ads", "Twitter / X Ads"].map(plat => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => toggleMultiSelect(plat, adPlatforms, setAdPlatforms)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                        adPlatforms.includes(plat) ? 'bg-[#1A3C6E] text-[#D4A017]' : 'bg-white border text-slate-600'
                      }`}
                    >
                      {plat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              {qL("Select other traffic strategies to connect (Select multi)", "Target traffic metrics sources (Select multi)")}
            </label>
            <div className="flex flex-wrap gap-2">
              {["Organic social media reels/posts", "SEO / Google search content", "Email campaign blasts", "Referrals & Word of Mouth", "Influencer marketing reviews"].map(traffic => (
                <button
                  key={traffic}
                  type="button"
                  onClick={() => toggleMultiSelect(traffic, otherTraffic, setOtherTraffic)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                    otherTraffic.includes(traffic) 
                      ? 'bg-[#1A3C6E] text-[#D4A017]' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-[#1A3C6E]'
                  }`}
                >
                  {traffic}
                </button>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 11: Legal Pages & Trust Setup */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">11</span>
          {qL("Legal Pages & Trust Setup", "Project Legals & Compliance Requirements")}
        </legend>

        <div className="space-y-4 pt-3 text-xs text-slate-700">
          <span className="font-semibold block text-slate-600">{qL("Does your business currently have legal pages?", "Select legal requirements:")}</span>
          
          <div className="space-y-3 bg-white p-4 border rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b">
              <span>{qL("Privacy Policy", "Official Privacy Policy Sheet")}</span>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={privacyPolicy === 'yes'} onChange={() => setPrivacyPolicy('yes')} /> Yes</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={privacyPolicy === 'no'} onChange={() => { setPrivacyPolicy('no'); }} /> No</label>
              </div>
            </div>
            {privacyPolicy === 'no' && (
              <div className="text-[11px] text-slate-500 pl-4 py-1 flex items-center gap-2 bg-slate-50 shadow-inner rounded p-1.5 animate-fadeIn">
                <span>{qL("Would you like your freelancer to prepare this for you?", "Does the client need you to provide custom policy templates?")}</span>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={privacyPolicyPrep === 'yes'} onChange={() => setPrivacyPolicyPrep('yes')} /> Yes</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={privacyPolicyPrep === 'no'} onChange={() => setPrivacyPolicyPrep('no')} /> No</label>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b pt-1.5">
              <span>{qL("Terms & Conditions", "Terms & Conditions Framework")}</span>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={termsPolicy === 'yes'} onChange={() => setTermsPolicy('yes')} /> Yes</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={termsPolicy === 'no'} onChange={() => { setTermsPolicy('no'); }} /> No</label>
              </div>
            </div>
            {termsPolicy === 'no' && (
              <div className="text-[11px] text-slate-500 pl-4 py-1 flex items-center gap-2 bg-slate-50 shadow-inner rounded p-1.5 animate-fadeIn">
                <span>{qL("Would you like your freelancer to prepare this for you?", "Does the client need you to provide custom terms guidelines?")}</span>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={termsPolicyPrep === 'yes'} onChange={() => setTermsPolicyPrep('yes')} /> Yes</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={termsPolicyPrep === 'no'} onChange={() => setTermsPolicyPrep('no')} /> No</label>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1.5">
              <span>{qL("Refund / Return Policy", "Refund & Return Policy Rules")}</span>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={refundPolicy === 'yes'} onChange={() => setRefundPolicy('yes')} /> Yes</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={refundPolicy === 'no'} onChange={() => { setRefundPolicy('no'); }} /> No</label>
              </div>
            </div>
            {refundPolicy === 'no' && (
              <div className="text-[11px] text-slate-500 pl-4 py-1 flex items-center gap-2 bg-slate-50 shadow-inner rounded p-1.5 mt-2 animate-fadeIn">
                <span>{qL("Would you like your freelancer to prepare this for you?", "Does the client need custom return structure generated?")}</span>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={refundPolicyPrep === 'yes'} onChange={() => setRefundPolicyPrep('yes')} /> Yes</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={refundPolicyPrep === 'no'} onChange={() => setRefundPolicyPrep('no')} /> No</label>
                </div>
              </div>
            )}
          </div>
        </div>
      </fieldset>

      {/* SECTION 12: Delivery Timescales & Financial Limits */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">12</span>
          {qL("Delivery Timescales & Financial Limits", "Project Timeline, Guidelines & Budget Bounds")}
        </legend>

        <div className="space-y-4 pt-3 text-xs text-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">{qL("Project Deadline Range", "Expected Delivery Date Indicator")}</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white font-medium" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">{qL("Target Budget Range", "Aesthetic Sourcing Budget Size")}</label>
              <input type="text" value={budgetRange} onChange={e => setBudgetRange(e.target.value)} placeholder="e.g. ₦150,000 – ₦300,000" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">{qL("Additional Consulting Notes", "Additional Freelancer Instructions")}</label>
              <textarea value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} placeholder="Any special requests or details..." className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs min-h-[80px] focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white" />
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
