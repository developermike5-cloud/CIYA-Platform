import React from 'react';
import { Plus, Trash2, Check } from 'lucide-react';

interface EcQuestionnaireFormProps {
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
  ecommerceType: string[];
  setEcommerceType: React.Dispatch<React.SetStateAction<string[]>>;
  hasInventory: string;
  setHasInventory: (val: string) => void;
  inventoryLocation: string;
  setInventoryLocation: (val: string) => void;
  visitorActions: string[];
  setVisitorActions: React.Dispatch<React.SetStateAction<string[]>>;
  otherAction: string;
  setOtherAction: (val: string) => void;
  idealAge: string[];
  setIdealAge: (val: string[]) => void;
  genderFocus: string[];
  setGenderFocus: React.Dispatch<React.SetStateAction<string[]>>;
  incomeLevel: string;
  setIncomeLevel: (val: string) => void;
  productInterests: string[];
  setProductInterests: React.Dispatch<React.SetStateAction<string[]>>;
  locations: string[];
  setLocations: React.Dispatch<React.SetStateAction<string[]>>;
  problemsSolved: string[];
  setProblemsSolved: React.Dispatch<React.SetStateAction<string[]>>;
  problemsSolvedDetail: string;
  setProblemsSolvedDetail: (val: string) => void;
  mainProducts: string[];
  setMainProducts: React.Dispatch<React.SetStateAction<string[]>>;
  productCards: Array<{name: string, desc: string, price: string, quantity: string, variants: string}>;
  setProductCards: React.Dispatch<React.SetStateAction<Array<{name: string, desc: string, price: string, quantity: string, variants: string}>>>;
  ecSpecialOffers: string[];
  setEcSpecialOffers: React.Dispatch<React.SetStateAction<string[]>>;
  ecSpecialOffersDetail: string;
  setEcSpecialOffersDetail: (val: string) => void;
  ecWhyBuy: string[];
  setEcWhyBuy: React.Dispatch<React.SetStateAction<string[]>>;
  ecProductDiff: string[];
  setEcProductDiff: React.Dispatch<React.SetStateAction<string[]>>;
  ecProductDiffDetail: string;
  setEcProductDiffDetail: (val: string) => void;
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
  ecWebsiteStyle: string[];
  setEcWebsiteStyle: React.Dispatch<React.SetStateAction<string[]>>;
  brandTones: string[];
  setBrandTones: React.Dispatch<React.SetStateAction<string[]>>;
  hasImages: string;
  setHasImages: (val: string) => void;
  hasVideos: string;
  setHasVideos: (val: string) => void;
  hasTestimonials: string;
  setHasTestimonials: (val: string) => void;
  ecPages: string[];
  setEcPages: React.Dispatch<React.SetStateAction<string[]>>;
  paymentOptions: string[];
  setPaymentOptions: React.Dispatch<React.SetStateAction<string[]>>;
  deliveryScope: string[];
  setDeliveryScope: React.Dispatch<React.SetStateAction<string[]>>;
  deliveryStates: string[];
  setDeliveryStates: React.Dispatch<React.SetStateAction<string[]>>;
  deliveryOptions: string[];
  setDeliveryOptions: React.Dispatch<React.SetStateAction<string[]>>;
  chargeDelivery: string;
  setChargeDelivery: (val: string) => void;
  deliveryFee: string;
  setDeliveryFee: (val: string) => void;
  logisticsPartner: string;
  setLogisticsPartner: (val: string) => void;
  notificationMethods: string[];
  setNotificationMethods: React.Dispatch<React.SetStateAction<string[]>>;
  autoConf: string;
  setAutoConf: (val: string) => void;
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
  ecMarketingHelp: string;
  setEcMarketingHelp: (val: string) => void;
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
  toggleMultiSelect: (val: string, arr: string[], setter: any) => void;
  updateArrayItem: (idx: number, val: string, arr: string[], setter: any) => void;
  removeArrayItem: (idx: number, arr: string[], setter: any) => void;
  addArrayItem: (arr: string[], setter: any) => void;
}

export default function EcQuestionnaireForm({
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
  ecommerceType,
  setEcommerceType,
  hasInventory,
  setHasInventory,
  inventoryLocation,
  setInventoryLocation,
  visitorActions,
  setVisitorActions,
  otherAction,
  setOtherAction,
  idealAge,
  setIdealAge,
  genderFocus,
  setGenderFocus,
  incomeLevel,
  setIncomeLevel,
  productInterests,
  setProductInterests,
  locations,
  setLocations,
  problemsSolved,
  setProblemsSolved,
  problemsSolvedDetail,
  setProblemsSolvedDetail,
  mainProducts,
  setMainProducts,
  productCards,
  setProductCards,
  ecSpecialOffers,
  setEcSpecialOffers,
  ecSpecialOffersDetail,
  setEcSpecialOffersDetail,
  ecWhyBuy,
  setEcWhyBuy,
  ecProductDiff,
  setEcProductDiff,
  ecProductDiffDetail,
  setEcProductDiffDetail,
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
  ecWebsiteStyle,
  setEcWebsiteStyle,
  brandTones,
  setBrandTones,
  hasImages,
  setHasImages,
  hasVideos,
  setHasVideos,
  hasTestimonials,
  setHasTestimonials,
  ecPages,
  setEcPages,
  paymentOptions,
  setPaymentOptions,
  deliveryScope,
  setDeliveryScope,
  deliveryStates,
  setDeliveryStates,
  deliveryOptions,
  setDeliveryOptions,
  chargeDelivery,
  setChargeDelivery,
  deliveryFee,
  setDeliveryFee,
  logisticsPartner,
  setLogisticsPartner,
  notificationMethods,
  setNotificationMethods,
  autoConf,
  setAutoConf,
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
  ecMarketingHelp,
  setEcMarketingHelp,
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
  toggleMultiSelect,
  updateArrayItem,
  removeArrayItem,
  addArrayItem
}: EcQuestionnaireFormProps) {

  const qL = (clientText: string, freelancerText: string) => {
    return viewPerspective === 'client' ? clientText : freelancerText;
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: BUSINESS INFORMATION */}
      <fieldset className="border border-amber-150/80 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">1</span>
          {qL("Business Information", "Client Business Profile")}
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
                <input type="radio" name="has_soc_med_ec" checked={hasSocialMediaAsked === 'yes'} onChange={() => { setHasSocialMediaAsked('yes'); }} /> Yes
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" name="has_soc_med_ec" checked={hasSocialMediaAsked === 'no'} onChange={() => { setHasSocialMediaAsked('no'); setSocialLinks(['']); }} /> No
              </label>
            </div>

            {hasSocialMediaAsked === 'no' && (
              <div className="mb-3 bg-amber-50/50 border border-amber-200 rounded-xl p-3 animate-fadeIn">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[10px] text-amber-800 font-bold block">No official handles yet? You can temporarily bundle placeholder accounts.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setHasSocialMediaAsked('yes');
                      setSocialLinks(['https://instagram.com/your_industry_brand_placeholder', 'https://facebook.com/your_industry_brand_placeholder']);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer"
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

      {/* SECTION 2: BUSINESS MODEL */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">2</span>
          {qL("Business Model", "eCommerce Store Business Model")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Which model describes your eCommerce business? (Select multi)", "What is the client's store type model? (Select multi)")}</label>
            <div className="flex flex-wrap gap-2 text-xs">
              {["Single product store", "Multi-product store", "Dropshipping", "Wholesale / bulk sales", "Print-on-demand", "Digital products", "Subscription-based"].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMultiSelect(m, ecommerceType, setEcommerceType)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    ecommerceType.includes(m) ? 'bg-[#1A3C6E] text-[#D4A017]' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">{qL("Do you currently have stock / inventory in hand?", "Does the client physically have inventory stocks ready?")}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={hasInventory === 'yes'} onChange={() => setHasInventory('yes')} /> Yes</label>
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={hasInventory === 'no'} onChange={() => setHasInventory('no')} /> No</label>
            </div>
            {hasInventory === 'yes' && (
              <input 
                type="text" 
                value={inventoryLocation} 
                onChange={e => setInventoryLocation(e.target.value)} 
                placeholder="Where is the inventory stored? (e.g. Lagos Warehouse)" 
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs mt-2 focus:ring-1 focus:ring-[#1A3C6E] outline-none"
              />
            )}
          </div>
        </div>
      </fieldset>

      {/* SECTION 3: PROJECT GOAL */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">3</span>
          {qL("Project Goal", "Core Action Metrics")}
        </legend>

        <div className="space-y-4 pt-3">
          <label className="text-xs font-semibold text-slate-700 block">{qL("What action should visitors take? (Select multi)", "What conversion action do we want to trigger on visitor entry? (Select multi)")}</label>
          <div className="flex flex-wrap gap-2 text-xs">
            {["Buy Now", "Add to Cart", "Subscribe", "Contact via WhatsApp", "Get a Quote", "Join Waitlist", "Create Account", "Claim Coupon", "View Catalogue", "Book an Order"].map(act => (
              <button
                key={act}
                type="button"
                onClick={() => toggleMultiSelect(act, visitorActions, setVisitorActions)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  visitorActions.includes(act) ? 'bg-[#1A3C6E] text-[#D4A017]' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {act}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">{qL("Any other action?", "Other custom action metrics:")}</label>
            <input type="text" value={otherAction} onChange={e => setOtherAction(e.target.value)} placeholder="Describe custom action..." className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none" />
          </div>
        </div>
      </fieldset>

      {/* SECTION 4: TARGET AUDIENCE */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">4</span>
          {qL("Target Audience", "Consumer Demographic Profile")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Age range of ideal customers (Select multi)", "Target Age Group demographics: (Select multi)")}</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {["All ages", "18 – 35 (Gen Z & Millennials)", "36 – 55 (Gen X)", "56 and above"].map(ageRange => (
                <button
                  key={ageRange}
                  type="button"
                  onClick={() => {
                    let next = [...idealAge];
                    if (next.includes(ageRange)) {
                      next = next.filter(x => x !== ageRange);
                    } else {
                      next.push(ageRange);
                    }
                    if (next.length === 0) next = ["All ages"];
                    setIdealAge(next);
                  }}
                  className={`p-2.5 text-left rounded-xl border font-bold transition-all cursor-pointer ${
                    idealAge.includes(ageRange) ? 'bg-[#1A3C6E]/5 border-[#1A3C6E] text-slate-800' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {ageRange}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Gender Focus", "Core Gender Segment")}</label>
              <div className="flex flex-wrap gap-2">
                {["All genders", "Primarily female", "Primarily male"].map(gf => (
                  <button
                    key={gf}
                    type="button"
                    onClick={() => toggleMultiSelect(gf, genderFocus, setGenderFocus)}
                    className={`px-3 py-1.5 border text-xs font-bold rounded-lg ${
                      genderFocus.includes(gf) ? 'bg-[#1A3C6E] text-[#D4A017]' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {gf}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Income Level", "Socioeconomic Segment")}</label>
              <select
                value={incomeLevel}
                onChange={e => setIncomeLevel(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs bg-white font-medium cursor-pointer"
              >
                <option value="Budget-conscious">Budget-conscious / Discount seekers</option>
                <option value="Middle income">Middle-income mainstream values</option>
                <option value="High income / luxury">High-income premium values</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Consumer Interests (Select multi)", "Target User lifestyle interests: (Select multi)")}</label>
            <div className="flex flex-wrap gap-2 text-xs">
              {["Fashion & style", "Beauty & skincare", "Health & fitness", "Food & lifestyle", "Tech & gadgets", "Home & decor", "Business & finance", "Travel & adventure"].map(interest => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleMultiSelect(interest, productInterests, setProductInterests)}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    productInterests.includes(interest) ? 'bg-[#1A3C6E] text-[#D4A017]' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Target Audience Locations", "Geographical user target locales")}
            </label>
            <div className="space-y-2">
              {locations.map((loc, idx) => (
                <div key={idx} className="flex gap-2">
                  <input 
                    type="text" 
                    value={loc} 
                    onChange={e => updateArrayItem(idx, e.target.value, locations, setLocations)} 
                    placeholder={`e.g. Lagos, Nigeria`} 
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
                  />
                  <button type="button" onClick={() => removeArrayItem(idx, locations, setLocations)} className="p-2 border rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors bg-white shadow-sm">
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
              <Plus className="w-3.5 h-3.5" /> Add Location
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("What core problem does your product solve?", "Core utility value resolved:")}</label>
            <div className="flex flex-wrap gap-2 text-xs">
              {["Saves time", "Saves money", "Improves appearance", "Boosts confidence", "Solves a health issue", "Provides convenience", "Grows business", "Educates / informs"].map(prob => (
                <button
                  key={prob}
                  type="button"
                  onClick={() => toggleMultiSelect(prob, problemsSolved, setProblemsSolved)}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    problemsSolved.includes(prob) ? 'bg-[#1A3C6E] text-[#D4A017]' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {prob}
                </button>
              ))}
            </div>
            <input type="text" value={problemsSolvedDetail} onChange={e => setProblemsSolvedDetail(e.target.value)} placeholder="Describe further..." className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs mt-2 focus:ring-1 focus:ring-[#1A3C6E] outline-none" />
          </div>
        </div>
      </fieldset>

      {/* SECTION 5: PRODUCT CATALOGUE */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">5</span>
          {qL("Product Details", "eCommerce Inventory Specs")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">{qL("List your main product lines", "Core physical product categories:")}</label>
            <div className="space-y-2">
              {mainProducts.map((p, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={p}
                    onChange={e => updateArrayItem(idx, e.target.value, mainProducts, setMainProducts)}
                    placeholder={`e.g. Skin Whitening Creams, Glow Toners`}
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
                  />
                  <button type="button" onClick={() => removeArrayItem(idx, mainProducts, setMainProducts)} className="p-2 border rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors bg-white">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addArrayItem(mainProducts, setMainProducts)}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 border border-dashed rounded-lg text-xs font-bold text-slate-400 hover:text-[#1A3C6E] hover:border-[#1A3C6E] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Product Line
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-3">{qL("Product Card Mock-up Details (Lock up to 3 for visual preview)", "Configure standard active showcase cards:")}</label>
            <div className="space-y-4">
              {productCards.map((card, idx) => (
                <div key={idx} className="bg-white border rounded-2xl p-4 relative space-y-3 shadow-sm animate-fadeIn">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Product Card {idx + 1}</span>
                    {productCards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = productCards.filter((_, i) => i !== idx);
                          setProductCards(next);
                        }}
                        className="text-red-500 hover:text-red-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Card
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Product Title</label>
                      <input 
                        type="text" 
                        value={card.name} 
                        onChange={e => {
                          const next = [...productCards];
                          next[idx].name = e.target.value;
                          setProductCards(next);
                        }} 
                        placeholder="e.g. Lavender Night Essential Glow Oil" 
                        className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"	
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Price Indicator</label>
                      <input 
                        type="text" 
                        value={card.price} 
                        onChange={e => {
                          const next = [...productCards];
                          next[idx].price = e.target.value;
                          setProductCards(next);
                        }} 
                        placeholder="e.g. ₦18,500"
                        className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none font-bold text-emerald-700"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Short Product Description</label>
                      <input 
                        type="text" 
                        value={card.desc} 
                        onChange={e => {
                          const next = [...productCards];
                          next[idx].desc = e.target.value;
                          setProductCards(next);
                        }} 
                        placeholder="e.g. Hydrates facial tissues with cucumber extract..." 
                        className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Initial Stock Quantity</label>
                      <input 
                        type="text" 
                        value={card.quantity} 
                        onChange={e => {
                          const next = [...productCards];
                          next[idx].quantity = e.target.value;
                          setProductCards(next);
                        }} 
                        placeholder="e.g. 100 units"
                        className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Color / Size Variants (optional)</label>
                      <input 
                        type="text" 
                        value={card.variants} 
                        onChange={e => {
                          const next = [...productCards];
                          next[idx].variants = e.target.value;
                          setProductCards(next);
                        }} 
                        placeholder="e.g. Blue, Pink, Large"
                        className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setProductCards([...productCards, { name: '', desc: '', price: '', quantity: '', variants: '' }])}
                className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl text-xs font-black text-indigo-600 hover:text-indigo-800 bg-white transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add dynamic Product Card
              </button>
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 6: PRICING & OFFERS */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">6</span>
          {qL("Pricing & Offers", "Discount Matrix & Special Offers")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Which promotional techniques do you offer to trigger quick checkouts?", "Promotional offers structure: (Select multi)")}</label>
            <div className="flex flex-wrap gap-2 text-xs">
              {["Percentage discount", "Free delivery", "Buy 1 Get 1 Free", "Free bonus gift", "Limited time offer", "Coupon codes", "Early bird pricing", "No promotions currently"].map(off => (
                <button
                  key={off}
                  type="button"
                  onClick={() => toggleMultiSelect(off, ecSpecialOffers, setEcSpecialOffers)}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    ecSpecialOffers.includes(off) ? 'bg-[#1A3C6E] text-[#D4A017]' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {off}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">{qL("Describe structural pricing or offers in detail", "Provide discount rates & custom pricing guidelines:")}</label>
            <input 
              type="text" 
              value={ecSpecialOffersDetail}
              onChange={e => setEcSpecialOffersDetail(e.target.value)}
              placeholder="e.g. Free shipping on all products above ₦25,000; 10% off using coupon NEWYEAR"
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* SECTION 7: UNIQUE SELLING POINT (USP) */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">7</span>
          {qL("Unique Selling Point", "Product Differentiation & USP Factors")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Why should customers buy from your store? (Select multi)", "Why should customers buy from the client's store? (Select multi)")}</label>
            <div className="flex flex-wrap gap-2 text-xs">
              {["Affordable pricing", "Premium quality", "Fast delivery", "Unique products", "Verified / certified", "Strong reviews", "Easy returns", "Local trusted brand"].map(factor => (
                <button
                  key={factor}
                  type="button"
                  onClick={() => toggleMultiSelect(factor, ecWhyBuy, setEcWhyBuy)}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    ecWhyBuy.includes(factor) ? 'bg-[#1A3C6E] text-[#D4A017]' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {factor}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("What elements differentiate your brand? (Select multi)", "Core differentiation vectors: (Select multi)")}</label>
            <div className="flex flex-wrap gap-2 text-xs mb-2">
              {["Price", "Quality", "Speed", "Packaging", "Brand story", "Customisation", "Exclusivity"].map(elem => (
                <button
                  key={elem}
                  type="button"
                  onClick={() => toggleMultiSelect(elem, ecProductDiff, setEcProductDiff)}
                  className={`px-3 py-1 rounded border ${
                    ecProductDiff.includes(elem) ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {elem}
                </button>
              ))}
            </div>
            <input 
              type="text" 
              value={ecProductDiffDetail}
              onChange={e => setEcProductDiffDetail(e.target.value)}
              placeholder="Describe differentiation in Detail (e.g. Our products are organic, locally sourced, and packaged in reusable wooden tins)" 
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* SECTION 8: BRANDING DETAILS */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">8</span>
          {qL("Branding Details", "Brand Guideline & Aesthetic Style")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Do you have a Logo?", "Does the client have an official Logo?")}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" name="has_logo_ec" checked={hasLogo === 'yes'} onChange={() => setHasLogo('yes')} /> Yes</label>
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" name="has_logo_ec" checked={hasLogo === 'no'} onChange={() => setHasLogo('no')} /> No</label>
            </div>
            {hasLogo === 'yes' ? (
              <div className="mt-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Great! Have the client hand over the high-resolution vector assets.
              </div>
            ) : (
              <div className="mt-2 bg-slate-100/50 p-3 rounded-xl space-y-2 border">
                <span className="text-[11px] font-semibold text-slate-600 block">Does the client need you to provide custom Logo construction services?</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={logoDesign === 'yes'} onChange={() => setLogoDesign('yes')} /> Yes</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={logoDesign === 'no'} onChange={() => setLogoDesign('no')} /> No</label>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Which aesthetic style should your website feel like? (Select multi)", "What is the client's aesthetic styling choice? (Select multi)")}</label>
            <div className="flex flex-wrap gap-2 text-xs">
              {["Minimal / Clean", "Luxury / Premium", "Bold / Vibrant", "Playful / Fun", "Corporate", "Feminine / Elegant"].map(style => (
                <button
                  key={style}
                  type="button"
                  onClick={() => toggleMultiSelect(style, ecWebsiteStyle, setEcWebsiteStyle)}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    ecWebsiteStyle.includes(style) ? 'bg-[#1A3C6E] text-[#D4A017]' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Do you have specific brand colors in mind?", "Does the client have specific brand hex/color codes locked?")}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={hasBrandColors === 'yes'} onChange={() => setHasBrandColors('yes')} /> Custom colors</label>
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={hasBrandColors === 'no'} onChange={() => setHasBrandColors('no')} /> Freelancer choice</label>
            </div>

            {hasBrandColors === 'yes' && (
              <div className="mt-3 bg-slate-100/50 p-4 border rounded-2xl space-y-3 animate-fadeIn">
                <span className="text-xs font-semibold block">How many brand colors to lock?</span>
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
                    <div key={i} className="flex flex-col items-center gap-1">
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
              {qL("Brand Tone (Select all that apply)", "Client Brand Tone & Design Aesthetic (Select all that apply)")}
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

      {/* SECTION 9: CONTENT & MEDIA */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">9</span>
          {qL("Content & Media", "Client Sourced Visual Assets")}
        </legend>

        <div className="space-y-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">{qL("Product Images", "Product Images Sourced")}</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="radio" name="has_img_ec" checked={hasImages === 'yes'} onChange={() => setHasImages('yes')} /> Yes, I have</label>
                <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="radio" name="has_img_ec" checked={hasImages === 'no'} onChange={() => setHasImages('no')} /> No, mock them</label>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">{qL("Product Videos", "Product Videos Sourced")}</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="radio" name="has_vid_ec" checked={hasVideos === 'yes'} onChange={() => setHasVideos('yes')} /> Yes, I have</label>
                <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="radio" name="has_vid_ec" checked={hasVideos === 'no'} onChange={() => setHasVideos('no')} /> No, mock them</label>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">{qL("Testimonials / Reviews", "Customer Testimonials Sourced")}</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="radio" name="has_test_ec" checked={hasTestimonials === 'yes'} onChange={() => setHasTestimonials('yes')} /> Yes, I have</label>
                <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="radio" name="has_test_ec" checked={hasTestimonials === 'no'} onChange={() => setHasTestimonials('no')} /> No, mock them</label>
              </div>
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 10: WEBSITE STRUCTURE */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">10</span>
          {qL("Website Structure", "Retail Pages & Sitemap Scheme")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Which pages / segments do you want on your website? (Select multi)", "What pages are required for building the sitemap schema? (Select multi)")}</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {["Home page", "Shop page", "Product details page", "About us", "Contact page", "FAQ page", "Blog details", "Cart / Checkout", "Privacy Policy", "Refund policy"].map(page => (
                <label key={page} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-100 rounded-lg">
                  <input
                    type="checkbox"
                    checked={ecPages.includes(page)}
                    onChange={() => toggleMultiSelect(page, ecPages, setEcPages)}
                    className="accent-indigo-600 cursor-pointer"
                  />
                  <span>{page}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 11: PAYMENT METHODS */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">11</span>
          {qL("Payment Methods", "Financial Integrations")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("How do you plan to accept customer payment payments? (Select multi)", "Which local financial gateway hooks are required? (Select multi)")}</label>
            <div className="flex flex-wrap gap-2 text-xs">
              {["Cash on Delivery (COD)", "Local Bank Transfer details", "Card payment via Paystack", "Universal Flutterwave integrations", "Monnify / Opay gateway integrations", "Manual WhatsApp checkouts"].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleMultiSelect(opt, paymentOptions, setPaymentOptions)}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    paymentOptions.includes(opt) ? 'bg-[#1A3C6E] text-[#D4A017]' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 12: SHIPPING & DELIVERY */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">12</span>
          {qL("Shipping & Delivery", "Logistics & Delivery Settings")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Where do you deliver products to?", "Target delivery scope bounds")}</label>
            <div className="flex flex-wrap gap-2">
              {["Nationwide delivery", "Specific local states", "International shipping"].map(scope => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => toggleMultiSelect(scope, deliveryScope, setDeliveryScope)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                    deliveryScope.includes(scope) ? 'bg-[#1A3C6E] text-[#D4A017]' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>

            {deliveryScope.includes("Specific local states") && (
              <div className="mt-3 bg-slate-100/50 p-4 border rounded-2xl space-y-2 animate-fadeIn">
                <span className="text-[11px] font-semibold text-slate-600 block">Deliverable State Areas:</span>
                {deliveryStates.map((st, sIdx) => (
                  <div key={sIdx} className="flex gap-2">
                    <input 
                      type="text" 
                      value={st} 
                      onChange={e => updateArrayItem(sIdx, e.target.value, deliveryStates, setDeliveryStates)} 
                      placeholder="e.g. Lagos, Abuja, Rivers" 
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
                    />
                    <button type="button" onClick={() => removeArrayItem(sIdx, deliveryStates, setDeliveryStates)} className="p-2 border rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors bg-white">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={() => addArrayItem(deliveryStates, setDeliveryStates)}
                  className="mt-1 inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-slate-400 hover:text-indigo-600"
                >
                  <Plus className="w-3.5 h-3.5" /> Add State
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Delivery Options Sourced", "Retail delivery options")}</label>
              <div className="flex flex-wrap gap-2 text-xs">
                {["Standard delivery", "Express delivery", "Local pickup centers"].map(o => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => toggleMultiSelect(o, deliveryOptions, setDeliveryOptions)}
                    className={`px-3 py-1 rounded border ${
                      deliveryOptions.includes(o) ? 'bg-[#1A3C6E] text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Do you charge shipping delivery rates?", "Enable custom shipping rates calculation?")}</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="radio" checked={chargeDelivery === 'yes'} onChange={() => setChargeDelivery('yes')} /> Yes, flat rate fee</label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="radio" checked={chargeDelivery === 'no'} onChange={() => setChargeDelivery('no')} /> No, free shipping</label>
              </div>
              {chargeDelivery === 'yes' && (
                <input
                  type="text"
                  value={deliveryFee}
                  onChange={e => setDeliveryFee(e.target.value)}
                  placeholder="e.g. ₦2,500 flat fee"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs mt-2 focus:ring-1 focus:ring-[#1A3C6E] outline-none"
                />
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">{qL("Which Logistics Partner do you use?", "Logistics Partner / Courier service:")}</label>
            <input
              type="text"
              value={logisticsPartner}
              onChange={e => setLogisticsPartner(e.target.value)}
              placeholder="e.g. GIG Logistics, DHL Express, local riders"
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* SECTION 13: ORDER MANAGEMENT */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">13</span>
          {qL("Order Management", "Order Fulfilment Notification Flow")}
        </legend>

        <div className="space-y-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Where do you want to receive order notifications?", "Fulfilment Notification triggers: (Select multi)")}</label>
              <div className="flex flex-wrap gap-2 text-xs">
                {["Email alerts", "WhatsApp chat ping", "Dashboard / admin panel alerts"].map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => toggleMultiSelect(method, notificationMethods, setNotificationMethods)}
                    className={`px-3 py-1 rounded border ${
                      notificationMethods.includes(method) ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Do you want automated email confirmation templates sent to customers?", "Do we trigger automated check-out receipts?")}</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={autoConf === 'yes'} onChange={() => setAutoConf('yes')} /> Yes</label>
                <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={autoConf === 'no'} onChange={() => setAutoConf('no')} /> No</label>
              </div>
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 14: FUNCTIONAL REQUIREMENTS */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">14</span>
          {qL("Functional Requirements", "Interactive eCommerce Store Features")}
        </legend>

        <div className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Which functional features do you need in your store? (Select multi)", "Retail interactive modular specs: (Select multi)")}</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {["Shopping cart", "Wishlist / Save item", "Customer accounts login", "Product reviews section", "Live chat / WhatsApp floating CTA", "Discount coupon box", "SEO schema markup", "Inventory tracking limits", "Search and advanced filters"].map(feat => (
                <label key={feat} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-100 rounded-lg">
                  <input
                    type="checkbox"
                    checked={functionalFeatures.includes(feat)}
                    onChange={() => toggleMultiSelect(feat, functionalFeatures, setFunctionalFeatures)}
                    className="accent-indigo-600 cursor-pointer"
                  />
                  <span>{feat}</span>
                </label>
              ))}
            </div>
            <textarea
              value={otherRequirements}
              onChange={e => setOtherRequirements(e.target.value)}
              placeholder="Describe any other complex interactive elements or functions..."
              className="w-full mt-3 border border-slate-200 rounded-xl px-4 py-2 text-xs bg-white min-h-[60px]"
            />
          </div>
        </div>
      </fieldset>

      {/* SECTION 15: TRAFFIC & MARKETING */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">15</span>
          {qL("Traffic & Marketing", "Social Traffic & Lead Acquisition Strategy")}
        </legend>

        <div className="space-y-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Will you be running paid advertisements?", "Will the client deploy paid advertising channels?")}</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="radio" checked={runPaidAds === 'yes'} onChange={() => setRunPaidAds('yes')} /> Yes</label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="radio" checked={runPaidAds === 'no'} onChange={() => setRunPaidAds('no')} /> No</label>
              </div>
              {runPaidAds === 'yes' && (
                <div className="mt-2 text-[11px] space-y-1.5">
                  <span className="font-semibold block text-slate-500">Pick Active Ad Channels:</span>
                  {["Facebook Ads", "Instagram Ads", "TikTok Ads", "Google Display network"].map(plat => (
                    <label key={plat} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adPlatforms.includes(plat)}
                        onChange={() => toggleMultiSelect(plat, adPlatforms, setAdPlatforms)}
                        className="cursor-pointer"
                      />
                      <span>{plat}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">{qL("Which organic traffic generators will you utilize? (Select multi)", "Organic social traffic engines: (Select multi)")}</label>
              <div className="flex flex-wrap gap-2 text-xs">
                {["Organic social media", "Search engine SEO", "Influencer marketing", "Customer referrals program", "Fliers & physical prints"].map(source => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => toggleMultiSelect(source, otherTraffic, setOtherTraffic)}
                    className={`px-3 py-1 rounded border ${
                      otherTraffic.includes(source) ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {qL("Do you need help setting up Facebook pixel, Google analytics, or Instagram Shop tags?", "Does the client require assistance with pixel tracking setup / tag integrations?")}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={ecMarketingHelp === 'yes'} onChange={() => setEcMarketingHelp('yes')} /> Yes</label>
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={ecMarketingHelp === 'no'} onChange={() => setEcMarketingHelp('no')} /> No</label>
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 16: LEGAL & TRUST */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">16</span>
          {qL("Legal Pages & Trust", "Official Legal Policies & Safe Checkout Badges")}
        </legend>

        <div className="space-y-4 pt-3 text-xs text-slate-700">
          <span className="font-semibold block text-slate-600">{qL("Select legal policy requirements:", "Map active policy sheets:")}</span>
          
          <div className="space-y-3 bg-white p-4 border rounded-2xl">
            {/* Privacy Policy */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b">
              <span>{qL("Privacy Policy Sheet", "Privacy Policy Statement Layout")}</span>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={privacyPolicy === 'yes'} onChange={() => setPrivacyPolicy('yes')} /> Yes</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={privacyPolicy === 'no'} onChange={() => { setPrivacyPolicy('no'); }} /> No</label>
              </div>
            </div>
            {privacyPolicy === 'no' && (
              <div className="text-[11px] text-slate-500 pl-4 py-1 flex items-center gap-2 bg-slate-50 rounded p-1.5 animate-fadeIn">
                <span>{qL("Instruct freelance developer to draft and prepare this template?", "Draft customized privacy statement for client?")}</span>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={privacyPolicyPrep === 'yes'} onChange={() => setPrivacyPolicyPrep('yes')} /> Yes</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={privacyPolicyPrep === 'no'} onChange={() => setPrivacyPolicyPrep('no')} /> No</label>
                </div>
              </div>
            )}

            {/* Terms and conditions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b pt-1.5">
              <span>{qL("Terms & Conditions Agreement", "Terms & Conditions Framework")}</span>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={termsPolicy === 'yes'} onChange={() => setTermsPolicy('yes')} /> Yes</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={termsPolicy === 'no'} onChange={() => { setTermsPolicy('no'); }} /> No</label>
              </div>
            </div>
            {termsPolicy === 'no' && (
              <div className="text-[11px] text-slate-500 pl-4 py-1 flex items-center gap-2 bg-slate-50 rounded p-1.5 animate-fadeIn">
                <span>{qL("Instruct freelance developer to draft terms agreement?", "Draft customized terms agreement for client?")}</span>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={termsPolicyPrep === 'yes'} onChange={() => setTermsPolicyPrep('yes')} /> Yes</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={termsPolicyPrep === 'no'} onChange={() => setTermsPolicyPrep('no')} /> No</label>
                </div>
              </div>
            )}

            {/* Refund policy */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1.5">
              <span>{qL("Refund & Return Policy Guidelines", "Official Refund Policy Statement")}</span>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={refundPolicy === 'yes'} onChange={() => setRefundPolicy('yes')} /> Yes</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={refundPolicy === 'no'} onChange={() => { setRefundPolicy('no'); }} /> No</label>
              </div>
            </div>
            {refundPolicy === 'no' && (
              <div className="text-[11px] text-slate-500 pl-4 py-1 flex items-center gap-2 bg-slate-50 rounded p-1.5 mt-2 animate-fadeIn">
                <span>{qL("Instruct freelance developer to draft refund policy template?", "Draft customized refund parameters?")}</span>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={refundPolicyPrep === 'yes'} onChange={() => setRefundPolicyPrep('yes')} /> Yes</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={refundPolicyPrep === 'no'} onChange={() => setRefundPolicyPrep('no')} /> No</label>
                </div>
              </div>
            )}
          </div>
        </div>
      </fieldset>

      {/* SECTION 17: TIMELINE & BUDGET */}
      <fieldset className="border border-slate-100 rounded-2xl p-4 md:p-6 bg-slate-50/30 text-left animate-fadeIn">
        <legend className="text-xs font-black text-[#1A3C6E] bg-white border px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#1A3C6E] text-[#D4A017] flex items-center justify-center text-[9px] font-black">17</span>
          {qL("Timeline & Budget", "Project Timelines & Target Sourcing Budget")}
        </legend>

        <div className="space-y-4 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">{qL("Project Deadline Range", "Expected Delivery Date Indicator")}</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white font-medium cursor-pointer" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">{qL("Target Budget Range", "Aesthetic Sourcing Budget Size")}</label>
              <input type="text" value={budgetRange} onChange={e => setBudgetRange(e.target.value)} placeholder="e.g. ₦150,000 – ₦300,000" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white font-medium" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">{qL("Additional Sourcing / Consulting Notes", "Additional Freelancer Instructions")}</label>
            <textarea value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} placeholder="Describe any special customization or technical integrations instructions..." className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs min-h-[100px] focus:ring-1 focus:ring-[#1A3C6E] outline-none bg-white" />
          </div>
        </div>
      </fieldset>
    </div>
  );
}
