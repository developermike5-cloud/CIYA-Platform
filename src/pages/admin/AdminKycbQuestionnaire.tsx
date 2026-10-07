import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, query, orderBy, where, limit, onSnapshot } from 'firebase/firestore';
import { CreditCard, Globe, Plus, Trash2, Check, ArrowRight, Printer, Save, Smartphone, Sparkles, FolderLock, Copy, Download, Link2, Lock, X, ClipboardList, Archive, ChevronDown, RefreshCw, FileText } from 'lucide-react';
import { safeStorage } from '../../utils/safeStorage';
import LpQuestionnaireForm from '../../components/LpQuestionnaireForm';
import EcQuestionnaireForm from '../../components/EcQuestionnaireForm';
import PortfolioQuestionnaireForm from '../../components/PortfolioQuestionnaireForm';
import CustomDropdown from '../../components/CustomDropdown';

interface SavedForm {
  id: string;
  clientName: string;
  dateCompleted: string;
  type: 'lp' | 'ec' | 'portfolio';
  businessName: string;
  createdAt: any;
  data: any;
  userId?: string;
  userEmail?: string;
}

interface AdminKycbQuestionnaireProps {
  isAdminMode?: boolean;
  userId?: string;
  userEmail?: string;
  defaultClientName?: string;
  activeSubView?: 'form' | 'saved';
}

export default function AdminKycbQuestionnaire({
  isAdminMode = true,
  userId = '',
  userEmail = '',
  defaultClientName = '',
  activeSubView
}: AdminKycbQuestionnaireProps = {}) {
  const [activeTab, setActiveTab] = useState<'lp' | 'ec' | 'portfolio'>('lp');
  const [appSettings, setAppSettings] = useState<any>(null);
  const [savedForms, setSavedForms] = useState<SavedForm[]>(() => {
    try {
      const cached = localStorage.getItem('ciya_cached_kycb_forms');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  // Share link generator states
  const [userProfile] = useState<any>(() => {
    try {
      const cached = safeStorage.getItem('ciya_cached_profile');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  const isPro = (() => {
    if (!userProfile || !userProfile.hasYearBadge) return false;
    if (userProfile.badgeStatus === 'revoked' || userProfile.badgeStatus === 'expired' || userProfile.badgeStatus === 'inactive') return false;
    let expiry = userProfile.badgeExpiryDate;
    if (typeof expiry === 'object' && expiry !== null && typeof expiry.seconds === 'number') {
      expiry = expiry.seconds * 1000;
    }
    if (!expiry && userProfile.badgePurchaseDate) {
      let pDate = userProfile.badgePurchaseDate;
      if (typeof pDate === 'object' && pDate !== null && typeof pDate.seconds === 'number') {
        pDate = pDate.seconds * 1000;
      }
      expiry = typeof pDate === 'number' ? pDate + 30 * 24 * 60 * 60 * 1000 : 0;
    }
    if (!expiry) return false;
    return Date.now() <= expiry;
  })();

  const currentLimit = isPro ? (appSettings?.kycbProLimit ?? 10) : (appSettings?.kycbFreeLimit ?? 0);
  const hasExceededLimit = savedForms.length >= currentLimit;

  const [shareType, setShareType] = useState<'lp' | 'ec' | 'portfolio'>('lp');
  const [shareTitle, setShareTitle] = useState(
    isPro ? 'Website Requirements Questionnaire' : 'CIYA Academy Website Requirements Form'
  );
  const [shareStudent, setShareStudent] = useState(
    userProfile?.fullName || defaultClientName || ''
  );
  const [linkCopied, setLinkCopied] = useState(false);

  // Perspective helper function
  const qL = (clientText: string, freelancerText: string) => {
    return viewPerspective === 'client' ? clientText : freelancerText;
  };
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('ciya_cached_kycb_forms');
      return !cached;
    } catch (e) {
      return true;
    }
  });
  const [saving, setSaving] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);

  // Local states for global settings to prevent instant Firestore writes on every keystroke
  const [localKycbFreeLimit, setLocalKycbFreeLimit] = useState(0);
  const [localKycbProLimit, setLocalKycbProLimit] = useState(10);
  const [localPromptsFreeLimit, setLocalPromptsFreeLimit] = useState(3);
  const [localPromptsProLimit, setLocalPromptsProLimit] = useState(100);
  const [globalSettingsSaved, setGlobalSettingsSaved] = useState(false);

  // Gemini state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [activeButtonView, setActiveButtonView] = useState<'manual' | 'auto'>('manual');
  const [manualDropdownOpen, setManualDropdownOpen] = useState(false);

  // Settings listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'app'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAppSettings(data);
        setLocalKycbFreeLimit(data.kycbFreeLimit ?? 0);
        setLocalKycbProLimit(data.kycbProLimit ?? 10);
        setLocalPromptsFreeLimit(data.promptsFreeLimit ?? 3);
        setLocalPromptsProLimit(data.promptsProLimit ?? 100);
      }
    });
    return () => unsub();
  }, []);

  // Form Metadata
  const [clientName, setClientName] = useState(defaultClientName || '');
  const [dateCompleted, setDateCompleted] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Conditional flags & arrays
  const [hasSite, setHasSite] = useState<string>('no');
  const [siteUrl, setSiteUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState<string[]>(['']);
  
  // Dynamic Option selections
  const [visitorActions, setVisitorActions] = useState<string[]>([]);
  const [otherAction, setOtherAction] = useState('');
  const [idealAge, setIdealAge] = useState<string[]>(['All ages']);
  const [locations, setLocations] = useState<string[]>(['']);
  const [occupation, setOccupation] = useState<string[] | string>([]);
  const [problemsSolved, setProblemsSolved] = useState<string[]>([]);
  const [problemsSolvedDetail, setProblemsSolvedDetail] = useState('');

  // Branding flags
  const [hasLogo, setHasLogo] = useState<string>('no');
  const [logoDesign, setLogoDesign] = useState<string>('no');
  const [hasBrandColors, setHasBrandColors] = useState<string>('no');
  const [colorsCount, setColorsCount] = useState<number>(1);
  const [brandColors, setBrandColors] = useState<string[]>(['#1A3C6E', '#D4A017', '#FFFFFF']);
  const [brandTones, setBrandTones] = useState<string[]>([]);

  // Page sections & Pricing
  const [hasImages, setHasImages] = useState<string>('no');
  const [hasVideos, setHasVideos] = useState<string>('no');
  const [hasTestimonials, setHasTestimonials] = useState<string>('no');
  const [sectionsToInclude, setSectionsToInclude] = useState<string[]>([]);
  const [displayPricing, setDisplayPricing] = useState<string>('no');
  const [pricingRanges, setPricingRanges] = useState<string[]>([]);
  const [pricingDetail, setPricingDetail] = useState('');
  const [functionalFeatures, setFunctionalFeatures] = useState<string[]>([]);
  const [otherRequirements, setOtherRequirements] = useState('');

  // Traffic
  const [runPaidAds, setRunPaidAds] = useState<string>('no');
  const [adPlatforms, setAdPlatforms] = useState<string[]>([]);
  const [otherTraffic, setOtherTraffic] = useState<string[]>([]);

  // Legal
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [privacyPolicyPrep, setPrivacyPolicyPrep] = useState('no');
  const [termsPolicy, setTermsPolicy] = useState('');
  const [termsPolicyPrep, setTermsPolicyPrep] = useState('no');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [refundPolicyPrep, setRefundPolicyPrep] = useState('no');

  // Deadline & Budget
  const [deadline, setDeadline] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // eCommerce Specifics
  const [ecommerceType, setEcommerceType] = useState<string[]>([]);
  const [hasInventory, setHasInventory] = useState('no');
  const [inventoryLocation, setInventoryLocation] = useState('');
  const [genderFocus, setGenderFocus] = useState<string[]>([]);
  const [incomeLevel, setIncomeLevel] = useState('Middle income');
  const [productInterests, setProductInterests] = useState<string[]>([]);
  const [mainProducts, setMainProducts] = useState<string[]>(['']);
  const [productCards, setProductCards] = useState<Array<{ name: string; desc: string; price: string; quantity: string; variants: string }>>([
    { name: '', desc: '', price: '', quantity: '', variants: '' }
  ]);
  const [paymentOptions, setPaymentOptions] = useState<string[]>([]);
  const [deliveryScope, setDeliveryScope] = useState<string[]>([]);
  const [deliveryStates, setDeliveryStates] = useState<string[]>(['']);
  const [deliveryOptions, setDeliveryOptions] = useState<string[]>([]);
  const [chargeDelivery, setChargeDelivery] = useState('no');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [logisticsPartner, setLogisticsPartner] = useState('');
  const [notificationMethods, setNotificationMethods] = useState<string[]>([]);
  const [autoConf, setAutoConf] = useState('no');

  // New States for Onboarding Requirements
  const [hasSocialMediaAsked, setHasSocialMediaAsked] = useState<string>('');
  const [hasCustomIndustryOption, setHasCustomIndustryOption] = useState<boolean>(false);

  // Perspective Toggle
  const [viewPerspective, setViewPerspective] = useState<'client' | 'freelancer'>('client');
  const [localActiveSubView, setLocalActiveSubView] = useState<'form' | 'saved'>(activeSubView || 'form');

  useEffect(() => {
    if (activeSubView) setLocalActiveSubView(activeSubView);
  }, [activeSubView]);

  // Landing Page specific states for the 12 sections
  const [lpOfferType, setLpOfferType] = useState<string[]>([]);
  const [lpOfferMain, setLpOfferMain] = useState('');
  const [lpOfferServices, setLpOfferServices] = useState<string[]>([]);
  const [lpOfferServicesDetail, setLpOfferServicesDetail] = useState('');
  const [lpOfferPromo, setLpOfferPromo] = useState<string[]>([]);
  const [lpOfferPromoDetail, setLpOfferPromoDetail] = useState('');
  const [lpWhyChoose, setLpWhyChoose] = useState<string[]>([]);
  const [lpWhatMakesSpecial, setLpWhatMakesSpecial] = useState<string[]>([]);
  const [lpWhatMakesSpecialDetail, setLpWhatMakesSpecialDetail] = useState('');

  // eCommerce new states for 17 sections
  const [ecSpecialOffers, setEcSpecialOffers] = useState<string[]>([]);
  const [ecSpecialOffersDetail, setEcSpecialOffersDetail] = useState('');
  const [ecWhyBuy, setEcWhyBuy] = useState<string[]>([]);
  const [ecProductDiff, setEcProductDiff] = useState<string[]>([]);
  const [ecProductDiffDetail, setEcProductDiffDetail] = useState('');
  const [ecWebsiteStyle, setEcWebsiteStyle] = useState<string[]>([]);
  const [ecPages, setEcPages] = useState<string[]>([]);
  const [ecMarketingHelp, setEcMarketingHelp] = useState('no');

  // Local drafts states
  const [lpDraft, setLpDraft] = useState<any>(null);
  const [ecDraft, setEcDraft] = useState<any>(null);
  const [portfolioDraft, setPortfolioDraft] = useState<any>(null);

  // Portfolio Specific States
  const [portfolioProfession, setPortfolioProfession] = useState<string>('');
  const [portfolioProfessionOther, setPortfolioProfessionOther] = useState<string>('');
  const [portfolioTools, setPortfolioTools] = useState<string[]>([]);
  const [portfolioToolsOther, setPortfolioToolsOther] = useState<string>('');
  const [portfolioYearsExperience, setPortfolioYearsExperience] = useState<string>('');
  const [portfolioStrengths, setPortfolioStrengths] = useState<string>('');

  const [portfolioPurposes, setPortfolioPurposes] = useState<string[]>([]);
  const [portfolioVisitorActions, setPortfolioVisitorActions] = useState<string[]>([]);
  const [portfolioTargetVisitors, setPortfolioTargetVisitors] = useState<string[]>([]);
  const [portfolioTargetIndustries, setPortfolioTargetIndustries] = useState<string[]>([]);

  const [portfolioFeaturedCount, setPortfolioFeaturedCount] = useState<string>('3-4');
  const [portfolioPresentationStyles, setPortfolioPresentationStyles] = useState<string[]>([]);
  const [portfolioProjects, setPortfolioProjects] = useState<Array<{ title: string; company: string; desc: string; year: string; category: string; link: string; tools: string }>>([
    { title: '', company: '', desc: '', year: '', category: '', link: '', tools: '' }
  ]);
  const [portfolioHasImages, setPortfolioHasImages] = useState<string>('no');

  const [portfolioBio, setPortfolioBio] = useState<string>('');
  const [portfolioDifferentiators, setPortfolioDifferentiators] = useState<string[]>([]);
  const [portfolioDifferentiatorDetail, setPortfolioDifferentiatorDetail] = useState<string>('');
  const [portfolioHasPhoto, setPortfolioHasPhoto] = useState<string>('no');
  const [portfolioShowEducation, setPortfolioShowEducation] = useState<string>('no');
  const [portfolioEducationDetails, setPortfolioEducationDetails] = useState<string>('');
  const [portfolioShowExperience, setPortfolioShowExperience] = useState<string>('no');
  const [portfolioExperienceDetails, setPortfolioExperienceDetails] = useState<string>('');

  const [portfolioShowServices, setPortfolioShowServices] = useState<string>('no');
  const [portfolioServicesOffered, setPortfolioServicesOffered] = useState<string[]>([]);
  const [portfolioServicesOther, setPortfolioServicesOther] = useState<string>('');
  const [portfolioShowPricing, setPortfolioShowPricing] = useState<string>('no');
  const [portfolioPricingDetails, setPortfolioPricingDetails] = useState<string>('');
  const [portfolioTypicalProcess, setPortfolioTypicalProcess] = useState<string[]>([]);

  const [portfolioHasTestimonials, setPortfolioHasTestimonials] = useState<string>('no');
  const [portfolioTestimonialsList, setPortfolioTestimonialsList] = useState<Array<{ quote: string; name: string; titleCompany: string }>>([
    { quote: '', name: '', titleCompany: '' }
  ]);
  const [portfolioNotableBrands, setPortfolioNotableBrands] = useState<string>('');
  const [portfolioHasAwards, setPortfolioHasAwards] = useState<string>('no');
  const [portfolioAwardsDetails, setPortfolioAwardsDetails] = useState<string>('');

  const [portfolioHasLogo, setPortfolioHasLogo] = useState<string>('no');
  const [portfolioLogoDesign, setPortfolioLogoDesign] = useState<string>('no');
  const [portfolioHasBrandColors, setPortfolioHasBrandColors] = useState<string>('no');
  const [portfolioColorsCount, setPortfolioColorsCount] = useState<number>(1);
  const [portfolioBrandColors, setPortfolioBrandColors] = useState<string[]>(['#1A3C6E', '#D4A017', '#FFFFFF']);
  const [portfolioVisualPersonalities, setPortfolioVisualPersonalities] = useState<string[]>([]);
  const [portfolioInspirations, setPortfolioInspirations] = useState<string[]>(['']);
  const [portfolioInspirationDetail, setPortfolioInspirationDetail] = useState<string>('');

  const [portfolioPagesNeeded, setPortfolioPagesNeeded] = useState<string[]>([]);
  const [portfolioPreferredStructure, setPortfolioPreferredStructure] = useState<string>('hybrid');
  const [portfolioHasBlog, setPortfolioHasBlog] = useState<string>('no');
  const [portfolioBlogTopics, setPortfolioBlogTopics] = useState<string>('');
  const [portfolioHasCV, setPortfolioHasCV] = useState<string>('no');

  const [portfolioFeaturesNeeded, setPortfolioFeaturesNeeded] = useState<string[]>([]);
  const [portfolioContactPreferences, setPortfolioContactPreferences] = useState<string[]>([]);
  const [portfolioAnimationLevel, setPortfolioAnimationLevel] = useState<string>('moderate');
  const [portfolioHasNDA, setPortfolioHasNDA] = useState<string>('no');

  const [portfolioTrafficSources, setPortfolioTrafficSources] = useState<string[]>([]);
  const [portfolioWantsSEO, setPortfolioWantsSEO] = useState<string>('no');
  const [portfolioCustomDomain, setPortfolioCustomDomain] = useState<string>('');

  const [portfolioDeadline, setPortfolioDeadline] = useState<string>('');
  const [portfolioBudget, setPortfolioBudget] = useState<string>('');
  const [portfolioDrivingEvent, setPortfolioDrivingEvent] = useState<string[]>([]);
  const [portfolioAdditionalNotes, setPortfolioAdditionalNotes] = useState<string>('');

  // Take a full form state snapshot
  const getFormSnapshot = () => ({
    clientName, dateCompleted, businessName, industry, phone, email, address,
    hasSite, siteUrl, socialLinks, visitorActions, otherAction, idealAge, locations,
    occupation, problemsSolved, problemsSolvedDetail, hasLogo, logoDesign,
    hasBrandColors, colorsCount, brandColors, brandTones, hasImages, hasVideos,
    hasTestimonials, sectionsToInclude, displayPricing, pricingRanges, pricingDetail,
    functionalFeatures, otherRequirements, runPaidAds, adPlatforms, otherTraffic,
    privacyPolicy, privacyPolicyPrep, termsPolicy, termsPolicyPrep, refundPolicy,
    refundPolicyPrep, deadline, budgetRange, additionalNotes,
    // eCommerce specific
    ecommerceType, hasInventory, inventoryLocation, genderFocus, incomeLevel,
    productInterests, mainProducts, productCards, paymentOptions, deliveryScope,
    deliveryStates, deliveryOptions, chargeDelivery, deliveryFee, logisticsPartner,
    notificationMethods, autoConf,
    // new fields
    hasSocialMediaAsked, hasCustomIndustryOption,
    // perspective and ecommerce new 17 sections states
    viewPerspective, ecSpecialOffers, ecSpecialOffersDetail, ecWhyBuy,
    ecProductDiff, ecProductDiffDetail, ecWebsiteStyle, ecPages, ecMarketingHelp,
    // Landing Page specific 12 sections states
    lpOfferType, lpOfferMain, lpOfferServices, lpOfferServicesDetail,
    lpOfferPromo, lpOfferPromoDetail, lpWhyChoose, lpWhatMakesSpecial, lpWhatMakesSpecialDetail,
    // Portfolio specific states
    portfolioProfession, portfolioProfessionOther, portfolioTools, portfolioToolsOther,
    portfolioYearsExperience, portfolioStrengths, portfolioPurposes, portfolioVisitorActions,
    portfolioTargetVisitors, portfolioTargetIndustries, portfolioFeaturedCount,
    portfolioPresentationStyles, portfolioProjects, portfolioHasImages, portfolioBio,
    portfolioDifferentiators, portfolioDifferentiatorDetail, portfolioHasPhoto,
    portfolioShowEducation, portfolioEducationDetails, portfolioShowExperience,
    portfolioExperienceDetails, portfolioShowServices, portfolioServicesOffered,
    portfolioServicesOther, portfolioShowPricing, portfolioPricingDetails,
    portfolioTypicalProcess, portfolioHasTestimonials, portfolioTestimonialsList,
    portfolioNotableBrands, portfolioHasAwards, portfolioAwardsDetails, portfolioHasLogo,
    portfolioLogoDesign, portfolioHasBrandColors, portfolioColorsCount, portfolioBrandColors,
    portfolioVisualPersonalities, portfolioInspirations, portfolioInspirationDetail,
    portfolioPagesNeeded, portfolioPreferredStructure, portfolioHasBlog, portfolioBlogTopics,
    portfolioHasCV, portfolioFeaturesNeeded, portfolioContactPreferences, portfolioAnimationLevel,
    portfolioHasNDA, portfolioTrafficSources, portfolioWantsSEO, portfolioCustomDomain,
    portfolioDeadline, portfolioBudget, portfolioDrivingEvent, portfolioAdditionalNotes
  });

  // Load snapshot back into active state
  const loadFormSnapshot = (snap: any) => {
    if (!snap) return;
    setClientName(snap.clientName ?? '');
    setDateCompleted(snap.dateCompleted ?? '');
    setBusinessName(snap.businessName ?? '');
    setIndustry(snap.industry ?? '');
    setPhone(snap.phone ?? '');
    setEmail(snap.email ?? '');
    setAddress(snap.address ?? '');
    setHasSite(snap.hasSite ?? 'no');
    setSiteUrl(snap.siteUrl ?? '');
    setSocialLinks(snap.socialLinks ?? ['']);
    setVisitorActions(snap.visitorActions ?? []);
    setOtherAction(snap.otherAction ?? '');
    
    // Convert idealAge to array if primitive
    const ageVal = snap.idealAge ?? ['All ages'];
    setIdealAge(Array.isArray(ageVal) ? ageVal : [ageVal]);
    
    setLocations(snap.locations ?? ['']);
    
    // Convert occupation to array if primitive
    const occVal = snap.occupation ?? [];
    setOccupation(Array.isArray(occVal) ? occVal : (occVal ? [occVal] : []));
    
    setProblemsSolved(snap.problemsSolved ?? []);
    setProblemsSolvedDetail(snap.problemsSolvedDetail ?? '');
    setHasLogo(snap.hasLogo ?? 'no');
    setLogoDesign(snap.logoDesign ?? 'no');
    setHasBrandColors(snap.hasBrandColors ?? 'no');
    setColorsCount(snap.colorsCount ?? 1);
    setBrandColors(snap.brandColors ?? ['#1A3C6E', '#D4A017', '#FFFFFF']);
    setBrandTones(snap.brandTones ?? []);
    setHasImages(snap.hasImages ?? 'no');
    setHasVideos(snap.hasVideos ?? 'no');
    setHasTestimonials(snap.hasTestimonials ?? 'no');
    setSectionsToInclude(snap.sectionsToInclude ?? []);
    setDisplayPricing(snap.displayPricing ?? 'no');
    setPricingRanges(snap.pricingRanges ?? []);
    setPricingDetail(snap.pricingDetail ?? '');
    setFunctionalFeatures(snap.functionalFeatures ?? []);
    setOtherRequirements(snap.otherRequirements ?? '');
    setRunPaidAds(snap.runPaidAds ?? 'no');
    setAdPlatforms(snap.adPlatforms ?? []);
    setOtherTraffic(snap.otherTraffic ?? []);
    
    setPrivacyPolicy(snap.privacyPolicy ?? '');
    setPrivacyPolicyPrep(snap.privacyPolicyPrep ?? 'no');
    setTermsPolicy(snap.termsPolicy ?? '');
    setTermsPolicyPrep(snap.termsPolicyPrep ?? 'no');
    setRefundPolicy(snap.refundPolicy ?? '');
    setRefundPolicyPrep(snap.refundPolicyPrep ?? 'no');
    
    setDeadline(snap.deadline ?? '');
    setBudgetRange(snap.budgetRange ?? '');
    setAdditionalNotes(snap.additionalNotes ?? '');

    // eCommerce specific
    setEcommerceType(snap.ecommerceType ?? []);
    setHasInventory(snap.hasInventory ?? 'no');
    setInventoryLocation(snap.inventoryLocation ?? '');
    setGenderFocus(snap.genderFocus ?? []);
    setIncomeLevel(snap.incomeLevel ?? 'Middle income');
    setProductInterests(snap.productInterests ?? []);
    setMainProducts(snap.mainProducts ?? ['']);
    setProductCards(snap.productCards ?? [{ name: '', desc: '', price: '', quantity: '', variants: '' }]);
    setPaymentOptions(snap.paymentOptions ?? []);
    setDeliveryScope(snap.deliveryScope ?? []);
    setDeliveryStates(snap.deliveryStates ?? ['']);
    setDeliveryOptions(snap.deliveryOptions ?? []);
    setChargeDelivery(snap.chargeDelivery ?? 'no');
    setDeliveryFee(snap.deliveryFee ?? '');
    setLogisticsPartner(snap.logisticsPartner ?? '');
    setNotificationMethods(snap.notificationMethods ?? []);
    setAutoConf(snap.autoConf ?? 'no');

    // custom state fields
    setHasSocialMediaAsked(snap.hasSocialMediaAsked ?? '');
    setHasCustomIndustryOption(snap.hasCustomIndustryOption ?? false);

    // load new eCommerce 17 sections states
    setViewPerspective(snap.viewPerspective ?? 'client');
    setEcSpecialOffers(snap.ecSpecialOffers ?? []);
    setEcSpecialOffersDetail(snap.ecSpecialOffersDetail ?? '');
    setEcWhyBuy(snap.ecWhyBuy ?? []);
    setEcProductDiff(snap.ecProductDiff ?? []);
    setEcProductDiffDetail(snap.ecProductDiffDetail ?? '');
    setEcWebsiteStyle(snap.ecWebsiteStyle ?? []);
    setEcPages(snap.ecPages ?? []);
    setEcMarketingHelp(snap.ecMarketingHelp ?? 'no');

    // restore Landing page 12 sections states
    setLpOfferType(snap.lpOfferType ?? []);
    setLpOfferMain(snap.lpOfferMain ?? '');
    setLpOfferServices(snap.lpOfferServices ?? []);
    setLpOfferServicesDetail(snap.lpOfferServicesDetail ?? '');
    setLpOfferPromo(snap.lpOfferPromo ?? []);
    setLpOfferPromoDetail(snap.lpOfferPromoDetail ?? '');
    setLpWhyChoose(snap.lpWhyChoose ?? []);
    setLpWhatMakesSpecial(snap.lpWhatMakesSpecial ?? []);
    setLpWhatMakesSpecialDetail(snap.lpWhatMakesSpecialDetail ?? '');

    // restore Portfolio specific states
    setPortfolioProfession(snap.portfolioProfession ?? '');
    setPortfolioProfessionOther(snap.portfolioProfessionOther ?? '');
    setPortfolioTools(snap.portfolioTools ?? []);
    setPortfolioToolsOther(snap.portfolioToolsOther ?? '');
    setPortfolioYearsExperience(snap.portfolioYearsExperience ?? '');
    setPortfolioStrengths(snap.portfolioStrengths ?? '');
    setPortfolioPurposes(snap.portfolioPurposes ?? []);
    setPortfolioVisitorActions(snap.portfolioVisitorActions ?? []);
    setPortfolioTargetVisitors(snap.portfolioTargetVisitors ?? []);
    setPortfolioTargetIndustries(snap.portfolioTargetIndustries ?? []);
    setPortfolioFeaturedCount(snap.portfolioFeaturedCount ?? '3-4');
    setPortfolioPresentationStyles(snap.portfolioPresentationStyles ?? []);
    setPortfolioProjects(snap.portfolioProjects ?? [{ title: '', company: '', desc: '', year: '', category: '', link: '', tools: '' }]);
    setPortfolioHasImages(snap.portfolioHasImages ?? 'no');
    setPortfolioBio(snap.portfolioBio ?? '');
    setPortfolioDifferentiators(snap.portfolioDifferentiators ?? []);
    setPortfolioDifferentiatorDetail(snap.portfolioDifferentiatorDetail ?? '');
    setPortfolioHasPhoto(snap.portfolioHasPhoto ?? 'no');
    setPortfolioShowEducation(snap.portfolioShowEducation ?? 'no');
    setPortfolioEducationDetails(snap.portfolioEducationDetails ?? '');
    setPortfolioShowExperience(snap.portfolioShowExperience ?? 'no');
    setPortfolioExperienceDetails(snap.portfolioExperienceDetails ?? '');
    setPortfolioShowServices(snap.portfolioShowServices ?? 'no');
    setPortfolioServicesOffered(snap.portfolioServicesOffered ?? []);
    setPortfolioServicesOther(snap.portfolioServicesOther ?? '');
    setPortfolioShowPricing(snap.portfolioShowPricing ?? 'no');
    setPortfolioPricingDetails(snap.portfolioPricingDetails ?? '');
    setPortfolioTypicalProcess(snap.portfolioTypicalProcess ?? []);
    setPortfolioHasTestimonials(snap.portfolioHasTestimonials ?? 'no');
    setPortfolioTestimonialsList(snap.portfolioTestimonialsList ?? [{ quote: '', name: '', titleCompany: '' }]);
    setPortfolioNotableBrands(snap.portfolioNotableBrands ?? '');
    setPortfolioHasAwards(snap.portfolioHasAwards ?? 'no');
    setPortfolioAwardsDetails(snap.portfolioAwardsDetails ?? '');
    setPortfolioHasLogo(snap.portfolioHasLogo ?? 'no');
    setPortfolioLogoDesign(snap.portfolioLogoDesign ?? 'no');
    setPortfolioHasBrandColors(snap.portfolioHasBrandColors ?? 'no');
    setPortfolioColorsCount(snap.portfolioColorsCount ?? 1);
    setPortfolioBrandColors(snap.portfolioBrandColors ?? ['#1A3C6E', '#D4A017', '#FFFFFF']);
    setPortfolioVisualPersonalities(snap.portfolioVisualPersonalities ?? []);
    setPortfolioInspirations(snap.portfolioInspirations ?? ['']);
    setPortfolioInspirationDetail(snap.portfolioInspirationDetail ?? '');
    setPortfolioPagesNeeded(snap.portfolioPagesNeeded ?? []);
    setPortfolioPreferredStructure(snap.portfolioPreferredStructure ?? 'hybrid');
    setPortfolioHasBlog(snap.portfolioHasBlog ?? 'no');
    setPortfolioBlogTopics(snap.portfolioBlogTopics ?? '');
    setPortfolioHasCV(snap.portfolioHasCV ?? 'no');
    setPortfolioFeaturesNeeded(snap.portfolioFeaturesNeeded ?? []);
    setPortfolioContactPreferences(snap.portfolioContactPreferences ?? []);
    setPortfolioAnimationLevel(snap.portfolioAnimationLevel ?? 'moderate');
    setPortfolioHasNDA(snap.portfolioHasNDA ?? 'no');
    setPortfolioTrafficSources(snap.portfolioTrafficSources ?? []);
    setPortfolioWantsSEO(snap.portfolioWantsSEO ?? 'no');
    setPortfolioCustomDomain(snap.portfolioCustomDomain ?? '');
    setPortfolioDeadline(snap.portfolioDeadline ?? '');
    setPortfolioBudget(snap.portfolioBudget ?? '');
    setPortfolioDrivingEvent(snap.portfolioDrivingEvent ?? []);
    setPortfolioAdditionalNotes(snap.portfolioAdditionalNotes ?? '');
  };

  const [copied, setCopied] = useState(false);
  const [showInstructionalModal, setShowInstructionalModal] = useState(false);
  const [instructionalCopied, setInstructionalCopied] = useState(false);

  const INSTRUCTIONAL_PROMPT_TEXT = `Act as a Senior AI Web Development Specialist and Master Prompt Engineer.

I am providing you with TWO inputs below:
1. MY BUSINESS KYC & BRAND SPECIFICATIONS (Contains my actual business details, target audience, brand colors, logo preferences, service descriptions, address, phone number, pricing, testimonials, and unique selling points).
2. A WEBSITE PROMPT TEMPLATE (Contains structural layout guidelines, HTML/CSS rules, section frameworks, animations, and technical requirements).

YOUR GOAL:
Combine the two inputs above by replacing every single placeholder, business name, brand color, logo instruction, service description, contact detail, tagline, and custom requirement in the WEBSITE PROMPT TEMPLATE with my actual data from MY BUSINESS KYC & BRAND SPECIFICATIONS.

STRICT INSTRUCTIONAL RULES:
1. Maintain 100% of the original structure, section hierarchy, layout rules, interactive features, CSS styling guidelines, and technical code directives from the WEBSITE PROMPT TEMPLATE.
2. Replace all placeholder business names, logos, primary/secondary colors, service lists, phone numbers, email addresses, physical locations, target demographics, and brand tones with my exact KYC values.
3. If the template requests specific visual sections (e.g., hero video/image, services grid, testimonials slider, contact form, pricing tables), adapt those sections to directly display my KYC business offerings and media preferences.
4. Output the complete, fully merged, customized master prompt ready to generate my specific business website or application.

==================================================
INPUT 1: MY BUSINESS KYC & BRAND SPECIFICATIONS
==================================================
[PASTE YOUR COPIED BUSINESS KYC DETAILS HERE]

==================================================
INPUT 2: WEBSITE PROMPT TEMPLATE
==================================================
[PASTE YOUR COPIED WEBSITE PROMPT TEMPLATE HERE]`;

  const handleCopyInstructionalPrompt = () => {
    navigator.clipboard.writeText(INSTRUCTIONAL_PROMPT_TEXT);
    setInstructionalCopied(true);
    setTimeout(() => setInstructionalCopied(false), 2000);
  };

  const generatePromptText = () => {
    let text = `========================================================================\n`;
    text += `       CIYA - KNOW YOUR CLIENT & BUSINESS (KYCB) CONFIGURATION\n`;
    text += `========================================================================\n\n`;

    text += `[METADATA]\n`;
    text += `- Client Name: ${clientName || 'Not specified'}\n`;
    text += `- Date Completed: ${dateCompleted || 'Not specified'}\n`;
    text += `- Target Profile: ${activeTab === 'lp' ? 'LANDING PAGE' : (activeTab === 'ec' ? 'ECOMMERCE WEBSITE' : 'PORTFOLIO WEBSITE')}\n`;
    text += `- Business Name: ${businessName || 'Not specified'}\n`;
    text += `- Industry / Niche: ${industry || 'Not specified'}\n`;
    text += `- Phone Number: ${phone || 'Not specified'}\n`;
    text += `- Email Address: ${email || 'Not specified'}\n`;
    text += `- Business Address: ${address || 'Not specified'}\n`;
    text += `- Existing Website: ${hasSite === 'yes' ? siteUrl : 'None'}\n`;
    text += `- Social Media links: ${hasSocialMediaAsked === 'yes' ? socialLinks.filter(Boolean).join(', ') : 'None'}\n\n`;

    if (activeTab === 'lp') {
      text += `[SECTION 2: PROJECT GOAL & VISITOR ACTIONS]\n`;
      text += `- Actions Desired: ${visitorActions.join(', ') || 'None'}\n`;
      text += `- Custom Action Notes: ${otherAction || 'None'}\n\n`;

      text += `[SECTION 3: TARGET AUDIENCE]\n`;
      text += `- Age Demographics: ${idealAge.join(', ') || 'None'}\n`;
      text += `- Target Geographical Locales: ${locations.filter(Boolean).join(', ') || 'None'}\n`;
      text += `- Target Customer Occupations: ${Array.isArray(occupation) ? occupation.join(', ') : (occupation || 'None')}\n`;
      text += `- Pain Points Resolved: ${problemsSolved.join(', ') || 'None'}\n`;
      text += `- Resolution Details: ${problemsSolvedDetail || 'None'}\n\n`;

      text += `[SECTION 4: OFFER DETAILS]\n`;
      text += `- Type of Offer: ${lpOfferType.join(', ') || 'None'}\n`;
      text += `- Main Offer Highlight: ${lpOfferMain || 'None'}\n`;
      text += `- Featured Services: ${lpOfferServices.join(', ') || 'None'}\n`;
      text += `- Services Detail Info: ${lpOfferServicesDetail || 'None'}\n`;
      text += `- Specials / Promotions: ${lpOfferPromo.join(', ') || 'None'}\n`;
      text += `- Specials Detail Info: ${lpOfferPromoDetail || 'None'}\n\n`;

      text += `[SECTION 5: UNIQUE SELLING POINT (USP)]\n`;
      text += `- Primary Motivators for Selection: ${lpWhyChoose.join(', ') || 'None'}\n`;
      text += `- Brand Differentiation Factors: ${lpWhatMakesSpecial.join(', ') || 'None'}\n`;
      text += `- USP Custom Notes: ${lpWhatMakesSpecialDetail || 'None'}\n\n`;

      text += `[SECTION 6: BRANDING & COLORS]\n`;
      text += `- Logo Status: ${hasLogo === 'yes' ? 'Has Logo' : 'Needs logo designed'}\n`;
      text += `- Colors Definition: ${hasBrandColors === 'yes' ? `Custom colors registered: ${brandColors.slice(0, colorsCount).join(', ')}` : 'Let freelancer select'}\n`;
      text += `- Brand Tones & Moods: ${brandTones.join(', ') || 'None'}\n\n`;

      text += `[SECTION 7: CONTENT & MEDIA]\n`;
      text += `- Images Provided: ${hasImages === 'yes' ? 'Client will provide' : 'Let freelancer source'}\n`;
      text += `- Videos Provided: ${hasVideos === 'yes' ? 'Client will provide' : 'Not needed / Freelancer style'}\n`;
      text += `- Testimonials Provided: ${hasTestimonials === 'yes' ? 'Client will provide' : 'None / Use placeholder cards'}\n\n`;

      text += `[SECTION 8: SKELETON LAYOUT SECTIONS]\n`;
      text += `- Layout Modules to Construct: ${sectionsToInclude.join(', ') || 'None'}\n`;
      text += `- Display Pricing Packages: ${displayPricing === 'yes' ? `Yes, within ranges: ${pricingRanges.join(', ')}; Specifics: ${pricingDetail}` : 'No'}\n\n`;

      text += `[SECTION 9: FUNCTIONAL REQUIREMENTS]\n`;
      text += `- Features Required: ${functionalFeatures.join(', ') || 'None'}\n`;
      text += `- Other Tech Requirements: ${otherRequirements || 'None'}\n\n`;

      text += `[SECTION 10: TRAFFIC STRATEGY]\n`;
      text += `- Running Paid Campaigns: ${runPaidAds === 'yes' ? `Yes, on channels: ${adPlatforms.join(', ')}` : 'No (organic channel setup only)'}\n`;
      text += `- Other Traffic Channels Considered: ${otherTraffic.join(', ') || 'None'}\n\n`;

      text += `[SECTION 11: LEGAL CONTRACT SHEETS]\n`;
      text += `- Privacy Policy Status: ${privacyPolicy === 'yes' ? 'Already exists' : (privacyPolicyPrep === 'yes' ? 'Needs freelancer creation' : 'Not required')}\n`;
      text += `- Terms & Conditions Status: ${termsPolicy === 'yes' ? 'Already exists' : (termsPolicyPrep === 'yes' ? 'Needs freelancer creation' : 'Not required')}\n`;
      text += `- Refund & Return Rules Status: ${refundPolicy === 'yes' ? 'Already exists' : (refundPolicyPrep === 'yes' ? 'Needs freelancer creation' : 'Not required')}\n\n`;

      text += `[SECTION 12: DELIVERY TIMESCALES & FINANCE]\n`;
      text += `- Target Launch Deadline: ${deadline || 'Not specified'}\n`;
      text += `- Stated Budget Limit Range: ${budgetRange || 'Not specified'}\n`;
      text += `- Consulting General Notes: ${additionalNotes || 'None'}\n`;
    } else if (activeTab === 'ec') {
      text += `[SECTION 2: ECOMMERCE STORE BUSINESS MODEL]\n`;
      text += `- E-commerce Sub-Type: ${ecommerceType.join(', ') || 'None'}\n`;
      text += `- On-hand Inventory Details: ${hasInventory === 'yes' ? `Yes, stored at: ${inventoryLocation}` : 'No'}\n\n`;

      text += `[SECTION 3: CONVERSION ATTAINMENT GOALS]\n`;
      text += `- Visitor Action Paths: ${visitorActions.join(', ') || 'None'}\n`;
      text += `- Custom Action Goals: ${otherAction || 'None'}\n\n`;

      text += `[SECTION 4: CUSTOMER DEMOGRAPHICS]\n`;
      text += `- Core Age Group: ${idealAge.join(', ') || 'None'}\n`;
      text += `- Target Gender focus: ${genderFocus.join(', ') || 'None'}\n`;
      text += `- Target Income bracket: ${incomeLevel}\n`;
      text += `- Demographics Interests: ${productInterests.join(', ') || 'None'}\n`;
      text += `- Target Geographical Locales: ${locations.filter(Boolean).join(', ') || 'None'}\n`;
      text += `- Common Pain Points Handled: ${problemsSolved.join(', ') || 'None'}\n`;
      text += `- Action Plan details: ${problemsSolvedDetail || 'None'}\n\n`;

      text += `[SECTION 5: PRODUCT INVENTORIES]\n`;
      text += `- Defined Categories / Core Lines: ${mainProducts.filter(Boolean).join(', ') || 'None'}\n`;
      text += `- Active Showcase Sample Cards details:\n`;
      productCards.forEach((card, idx) => {
        text += `  * Product ${idx + 1}: ${card.name || '(unnamed)'}\n`;
        text += `    - Price: ${card.price || 'Free'}\n`;
        text += `    - Description: ${card.desc || 'No description'}\n`;
        text += `    - Quantity: ${card.quantity || 'N/A'}\n`;
        text += `    - Variants: ${card.variants || 'None'}\n`;
      });
      text += `\n`;

      text += `[SECTION 6: DISCOUNTS & CAMPAIGNS]\n`;
      text += `- Promotions Strategy Checked: ${ecSpecialOffers.join(', ') || 'None'}\n`;
      text += `- Campaign Detail guidelines: ${ecSpecialOffersDetail || 'None'}\n\n`;

      text += `[SECTION 7: UNIQUE SELLING POINT (USP)]\n`;
      text += `- Motivating Drivers: ${ecWhyBuy.join(', ') || 'None'}\n`;
      text += `- Brand Differentiation Vectors: ${ecProductDiff.join(', ') || 'None'}\n`;
      text += `- Detailed USP Notes: ${ecProductDiffDetail || 'None'}\n\n`;

      text += `[SECTION 8: BRAND GUIDELINES & PREFERRED STYLE]\n`;
      text += `- Logo Status: ${hasLogo === 'yes' ? 'Already exists' : (logoDesign === 'yes' ? 'Needs logo designed' : 'Let freelancer style placeholder')}\n`;
      text += `- Custom Color Codes: ${hasBrandColors === 'yes' ? brandColors.slice(0, colorsCount).join(', ') : 'Let Freelancer select'}\n`;
      text += `- Preference Theme Styles: ${ecWebsiteStyle.join(', ') || 'None'}\n`;
      text += `- Brand Mood Vibe: ${brandTones.join(', ') || 'None'}\n\n`;

      text += `[SECTION 9: MEDIA ASSETS STATUS]\n`;
      text += `- Quality Product Images Provided: ${hasImages === 'yes' ? 'Yes, Client will provide' : 'Let freelancer source'}\n`;
      text += `- Descriptive Product Videos Provided: ${hasVideos === 'yes' ? 'Yes, Client will provide' : 'Not required'}\n`;
      text += `- Customer Testimonial Reviews: ${hasTestimonials === 'yes' ? 'Yes, Client will provide' : 'Let freelancer use placeholders'}\n\n`;

      text += `[SECTION 10: DESIGNATED STORE SPEC PAGES]\n`;
      text += `- Pages Required: ${ecPages.join(', ') || 'None'}\n\n`;

      text += `[SECTION 11: INTEGRATED PAYMENT OPTIONS]\n`;
      text += `- Payment Options Selected: ${paymentOptions.join(', ') || 'None'}\n\n`;

      text += `[SECTION 12: SHIPPING & LOGISTICS SPECS]\n`;
      text += `- Delivery Scope Focus: ${deliveryScope.join(', ') || 'None'}\n`;
      text += `- Specific States bounds: ${deliveryStates.filter(Boolean).join(', ') || 'None'}\n`;
      text += `- Standard Shipping Options: ${deliveryOptions.join(', ') || 'None'}\n`;
      text += `- Delivery Fees Plan: ${chargeDelivery === 'yes' ? `Yes, fees: ${deliveryFee}` : 'Free Delivery'}\n`;
      text += `- Target logistics partner company: ${logisticsPartner || 'None specified'}\n\n`;

      text += `[SECTION 13: NOTIFICATIONS & FULFILLMENT]\n`;
      text += `- Notification Channels Checked: ${notificationMethods.join(', ') || 'None'}\n`;
      text += `- Automatic Order Confirmation Receipts: ${autoConf === 'yes' ? 'Yes' : 'No'}\n\n`;

      text += `[SECTION 14: FUNCTIONAL STORE INTEGRATIONS]\n`;
      text += `- Features Selected: ${functionalFeatures.join(', ') || 'None'}\n`;
      text += `- Other Requirements: ${otherRequirements || 'None'}\n\n`;

      text += `[SECTION 15: ADVERTISING & TRAFFIC CHANNELS]\n`;
      text += `- Running Paid Campaigns: ${runPaidAds === 'yes' ? `Yes, on channels: ${adPlatforms.join(', ')}` : 'No (organic channel setups only)'}\n`;
      text += `- Other Traffic Channels Checked: ${otherTraffic.join(', ') || 'None'}\n`;
      text += `- Needs helper setting up marketing campaigns: ${ecMarketingHelp === 'yes' ? 'Yes' : 'No'}\n\n`;

      text += `[SECTION 16: POLICIES & LEGAL PAGES]\n`;
      text += `- Privacy Policy Status: ${privacyPolicy === 'yes' ? 'Already exists' : (privacyPolicyPrep === 'yes' ? 'Needs freelancer creation' : 'Not required')}\n`;
      text += `- Terms & Conditions Status: ${termsPolicy === 'yes' ? 'Already exists' : (termsPolicyPrep === 'yes' ? 'Needs freelancer creation' : 'Not required')}\n`;
      text += `- Refund & Return Rules Status: ${refundPolicy === 'yes' ? 'Already exists' : (refundPolicyPrep === 'yes' ? 'Needs freelancer creation' : 'Not required')}\n\n`;

      text += `[SECTION 17: LAUNCH TIMELINE & FINANCE LIMITS]\n`;
      text += `- Target Launch Deadline: ${deadline || 'Not specified'}\n`;
      text += `- Target Budget Limits: ${budgetRange || 'Not specified'}\n`;
      text += `- Consultative General Notes: ${additionalNotes || 'None'}\n`;
    } else if (activeTab === 'portfolio') {
      text += `[SECTION 1: PERSONAL & PROFESSION DETAILS]\n`;
      text += `- Professional Job Title: ${portfolioProfession === 'Other' ? portfolioProfessionOther : (portfolioProfession || 'Not specified')}\n`;
      text += `- Tools & Technologies: ${portfolioTools.join(', ') || 'None'}\n`;
      if (portfolioTools.includes('Other')) {
        text += `  * Other Tools: ${portfolioToolsOther}\n`;
      }
      text += `- Years of Experience: ${portfolioYearsExperience || 'Not specified'}\n`;
      text += `- Core Strengths: ${portfolioStrengths || 'None'}\n\n`;

      text += `[SECTION 2: PORTFOLIO PURPOSE & ACTIONS]\n`;
      text += `- Primary Purpose: ${portfolioPurposes.join(', ') || 'None'}\n`;
      text += `- Desired Visitor Actions: ${portfolioVisitorActions.join(', ') || 'None'}\n`;
      text += `- Target Audience & Demographics: ${portfolioTargetVisitors.join(', ') || 'None'}\n`;
      text += `- Industries of Interest: ${portfolioTargetIndustries.join(', ') || 'None'}\n\n`;

      text += `[SECTION 3: WORK SAMPLES & PROJECT ARCHIVE]\n`;
      text += `- Curator Projected Count: ${portfolioFeaturedCount}\n`;
      text += `- Presentation Styles Selected: ${portfolioPresentationStyles.join(', ') || 'None'}\n`;
      text += `- Curated Project Cards:\n`;
      portfolioProjects.forEach((proj, idx) => {
        text += `  * Project #${idx + 1}: ${proj.title || '(unnamed)'}\n`;
        text += `    - Client/Company: ${proj.company || 'N/A'}\n`;
        text += `    - Summary Work Done: ${proj.desc || 'N/A'}\n`;
        text += `    - Completed Year: ${proj.year || 'N/A'}\n`;
        text += `    - Category: ${proj.category || 'N/A'}\n`;
        text += `    - Tools Used: ${proj.tools || 'N/A'}\n`;
        text += `    - Target Link: ${proj.link || 'N/A'}\n`;
      });
      text += `- Project Images Provided: ${portfolioHasImages === 'yes' ? 'Yes' : (portfolioHasImages === 'some' ? 'Some' : 'No (use placeholders)')}\n\n`;

      text += `[SECTION 4: BIO & DIFFERENTIATORS]\n`;
      text += `- Professional Bio Narrative: ${portfolioBio || 'None'}\n`;
      text += `- Key Differentiator Elements: ${portfolioDifferentiators.join(', ') || 'None'}\n`;
      text += `- Differentiator Custom Statement: ${portfolioDifferentiatorDetail || 'None'}\n`;
      text += `- Include Professional Photo: ${portfolioHasPhoto === 'yes' ? 'Yes' : 'No'}\n`;
      text += `- Education Timeline: ${portfolioShowEducation === 'yes' ? `Yes; Details: ${portfolioEducationDetails}` : 'No'}\n`;
      text += `- Experience Timeline: ${portfolioShowExperience === 'yes' ? `Yes; Details: ${portfolioExperienceDetails}` : 'No'}\n\n`;

      text += `[SECTION 5: SERVICES & OFFERINGS]\n`;
      text += `- Show Services Offered: ${portfolioShowServices === 'yes' ? 'Yes' : 'No'}\n`;
      if (portfolioShowServices === 'yes') {
        text += `  * Services: ${portfolioServicesOffered.join(', ') || 'None'}\n`;
        if (portfolioServicesOffered.includes('Other')) {
          text += `  * Other Services Detail: ${portfolioServicesOther}\n`;
        }
      }
      text += `- Show Pricing Rates: ${portfolioShowPricing === 'yes' ? `Yes; Details: ${portfolioPricingDetails}` : 'No (Enquiry only)'}\n`;
      text += `- Standard Milestone Process: ${portfolioTypicalProcess.join(', ') || 'None'}\n\n`;

      text += `[SECTION 6: TESTIMONIALS & RECOGNITIONS]\n`;
      text += `- Has Client Testimonials: ${portfolioHasTestimonials === 'yes' ? 'Yes' : 'No (use placeholders)'}\n`;
      if (portfolioHasTestimonials === 'yes') {
        portfolioTestimonialsList.forEach((test, idx) => {
          text += `  * Testimonial #${idx + 1}:\n`;
          text += `    - Quote: ${test.quote || 'N/A'}\n`;
          text += `    - Author: ${test.name || 'Anonymous'}\n`;
          text += `    - Role/Company: ${test.titleCompany || 'N/A'}\n`;
        });
      }
      text += `- Brands Worked With: ${portfolioNotableBrands || 'None'}\n`;
      text += `- Awards & Recognitions: ${portfolioHasAwards === 'yes' ? `Yes; Details: ${portfolioAwardsDetails}` : 'No'}\n\n`;

      text += `[SECTION 7: BRANDING & VISUAL STYLE]\n`;
      text += `- Logo Status: ${portfolioHasLogo === 'yes' ? 'Client will provide' : (portfolioLogoDesign === 'yes' ? 'Needs logo designed' : 'No logo needed')}\n`;
      text += `- Color Scheme Preference: ${portfolioHasBrandColors === 'yes' ? `Custom colours: ${portfolioBrandColors.slice(0, portfolioColorsCount).join(', ')}` : 'Let freelancer decide'}\n`;
      text += `- Visual Personalities Selected: ${portfolioVisualPersonalities.join(', ') || 'None'}\n`;
      text += `- Admiration Inspirations: ${portfolioInspirations.filter(Boolean).join(', ') || 'None'}\n`;
      text += `- Inspiration Custom Details: ${portfolioInspirationDetail || 'None'}\n\n`;

      text += `[SECTION 8: PAGES & ARCHITECTURE]\n`;
      text += `- Pages/Sections Needed: ${portfolioPagesNeeded.join(', ') || 'None'}\n`;
      text += `- Preferred Layout Structure: ${portfolioPreferredStructure}\n`;
      text += `- Has Blog / Articles: ${portfolioHasBlog === 'yes' ? `Yes; Topics: ${portfolioBlogTopics}` : 'No'}\n`;
      text += `- Include CV/Resume Button: ${portfolioHasCV === 'yes' ? 'Yes (will provide file)' : (portfolioHasCV === 'placeholder' ? 'Yes (use placeholder)' : 'No')}\n\n`;

      text += `[SECTION 9: FUNCTIONAL SPECIFICATIONS]\n`;
      text += `- Features Required: ${portfolioFeaturesNeeded.join(', ') || 'None'}\n`;
      text += `- Contact Preference Channels: ${portfolioContactPreferences.join(', ') || 'None'}\n`;
      text += `- Animation Level Preference: ${portfolioAnimationLevel}\n`;
      text += `- NDA Password-Locked Work Required: ${portfolioHasNDA === 'yes' ? 'Yes' : 'No'}\n\n`;

      text += `[SECTION 10: TRAFFIC STRATEGY]\n`;
      text += `- Project Discovery Sources: ${portfolioTrafficSources.join(', ') || 'None'}\n`;
      text += `- Optimize Search Visibility (SEO): ${portfolioWantsSEO === 'yes' ? 'Yes' : 'No'}\n`;
      text += `- Custom Domain Preference: ${portfolioCustomDomain || 'None (or not specified)'}\n\n`;

      text += `[SECTION 11: LAUNCH TIMELINE & FINANCE]\n`;
      text += `- Launch Target Deadline: ${portfolioDeadline || 'Not specified'}\n`;
      text += `- Financial Budget Limits: ${portfolioBudget || 'Not specified'}\n`;
      text += `- Motivating Driver Events: ${portfolioDrivingEvent.join(', ') || 'None'}\n`;
      text += `- Special Instructions & Notes: ${portfolioAdditionalNotes || 'None'}\n`;
    }

    text += `\n========================================================================\n`;
    text += `    END OF SPECIFICATION. USE THIS LOG AS A BASIS FOR THE PROMPT BUILDER.\n`;
    text += `========================================================================\n`;
    return text;
  };

  const handleCopy = () => {
    const text = generatePromptText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = generatePromptText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kycb_${activeTab}_prompt_config_${clientName ? clientName.toLowerCase().replace(/\s+/g, '_') : 'client'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetFormDetails = () => {
    setClientName('');
    setDateCompleted('');
    setBusinessName('');
    setIndustry('');
    setPhone('');
    setEmail('');
    setAddress('');
    setHasSite('no');
    setSiteUrl('');
    setSocialLinks(['']);
    setVisitorActions([]);
    setOtherAction('');
    setIdealAge(['All ages']);
    setLocations(['']);
    setOccupation([]);
    setProblemsSolved([]);
    setProblemsSolvedDetail('');
    setHasLogo('no');
    setLogoDesign('no');
    setHasBrandColors('no');
    setColorsCount(1);
    setBrandColors(['#1A3C6E', '#D4A017', '#FFFFFF']);
    setBrandTones([]);
    setHasImages('no');
    setHasVideos('no');
    setHasTestimonials('no');
    setSectionsToInclude([]);
    setDisplayPricing('no');
    setPricingRanges([]);
    setPricingDetail('');
    setFunctionalFeatures([]);
    setOtherRequirements('');
    setRunPaidAds('no');
    setAdPlatforms([]);
    setOtherTraffic([]);
    
    setPrivacyPolicy('');
    setPrivacyPolicyPrep('no');
    setTermsPolicy('');
    setTermsPolicyPrep('no');
    setRefundPolicy('');
    setRefundPolicyPrep('no');
    
    setDeadline('');
    setBudgetRange('');
    setAdditionalNotes('');
    
    setEcommerceType([]);
    setHasInventory('no');
    setInventoryLocation('');
    setGenderFocus([]);
    setIncomeLevel('Middle income');
    setProductInterests([]);
    setMainProducts(['']);
    setProductCards([{ name: '', desc: '', price: '', quantity: '', variants: '' }]);
    setPaymentOptions([]);
    setDeliveryScope([]);
    setDeliveryStates(['']);
    setDeliveryOptions([]);
    setChargeDelivery('no');
    setDeliveryFee('');
    setLogisticsPartner('');
    setNotificationMethods([]);
    setAutoConf('no');
    
    setHasSocialMediaAsked('');
    setHasCustomIndustryOption(false);

    // reset perspective and ecommerce 17 sections states
    setViewPerspective('client');
    setEcSpecialOffers([]);
    setEcSpecialOffersDetail('');
    setEcWhyBuy([]);
    setEcProductDiff([]);
    setEcProductDiffDetail('');
    setEcWebsiteStyle([]);
    setEcPages([]);
    setEcMarketingHelp('no');

    // reset Landing page 12 sections states
    setLpOfferType([]);
    setLpOfferMain('');
    setLpOfferServices([]);
    setLpOfferServicesDetail('');
    setLpOfferPromo([]);
    setLpOfferPromoDetail('');
    setLpWhyChoose([]);
    setLpWhatMakesSpecial([]);
    setLpWhatMakesSpecialDetail('');

    // reset Portfolio specific states
    setPortfolioProfession('');
    setPortfolioProfessionOther('');
    setPortfolioTools([]);
    setPortfolioToolsOther('');
    setPortfolioYearsExperience('');
    setPortfolioStrengths('');
    setPortfolioPurposes([]);
    setPortfolioVisitorActions([]);
    setPortfolioTargetVisitors([]);
    setPortfolioTargetIndustries([]);
    setPortfolioFeaturedCount('3-4');
    setPortfolioPresentationStyles([]);
    setPortfolioProjects([{ title: '', company: '', desc: '', year: '', category: '', link: '', tools: '' }]);
    setPortfolioHasImages('no');
    setPortfolioBio('');
    setPortfolioDifferentiators([]);
    setPortfolioDifferentiatorDetail('');
    setPortfolioHasPhoto('no');
    setPortfolioShowEducation('no');
    setPortfolioEducationDetails('');
    setPortfolioShowExperience('no');
    setPortfolioExperienceDetails('');
    setPortfolioShowServices('no');
    setPortfolioServicesOffered([]);
    setPortfolioServicesOther('');
    setPortfolioShowPricing('no');
    setPortfolioPricingDetails('');
    setPortfolioTypicalProcess([]);
    setPortfolioHasTestimonials('no');
    setPortfolioTestimonialsList([{ quote: '', name: '', titleCompany: '' }]);
    setPortfolioNotableBrands('');
    setPortfolioHasAwards('no');
    setPortfolioAwardsDetails('');
    setPortfolioHasLogo('no');
    setPortfolioLogoDesign('no');
    setPortfolioHasBrandColors('no');
    setPortfolioColorsCount(1);
    setPortfolioBrandColors(['#1A3C6E', '#D4A017', '#FFFFFF']);
    setPortfolioVisualPersonalities([]);
    setPortfolioInspirations(['']);
    setPortfolioInspirationDetail('');
    setPortfolioPagesNeeded([]);
    setPortfolioPreferredStructure('hybrid');
    setPortfolioHasBlog('no');
    setPortfolioBlogTopics('');
    setPortfolioHasCV('no');
    setPortfolioFeaturesNeeded([]);
    setPortfolioContactPreferences([]);
    setPortfolioAnimationLevel('moderate');
    setPortfolioHasNDA('no');
    setPortfolioTrafficSources([]);
    setPortfolioWantsSEO('no');
    setPortfolioCustomDomain('');
    setPortfolioDeadline('');
    setPortfolioBudget('');
    setPortfolioDrivingEvent([]);
    setPortfolioAdditionalNotes('');
  };

  useEffect(() => {
    if (!clientName && defaultClientName) {
      setClientName(defaultClientName);
    }
  }, [defaultClientName]);

  useEffect(() => {
    fetchForms();

    // Load drafts from localStorage on first mount
    const lpRaw = localStorage.getItem('kycb_draft_lp');
    const ecRaw = localStorage.getItem('kycb_draft_ec');
    if (lpRaw) {
      try {
        const lpParsed = JSON.parse(lpRaw);
        setLpDraft(lpParsed);
        if (activeTab === 'lp') {
          loadFormSnapshot(lpParsed);
        }
      } catch (e) {
        console.error("Failed loading LP draft", e);
      }
    }
    if (ecRaw) {
      try {
        const ecParsed = JSON.parse(ecRaw);
        setEcDraft(ecParsed);
        if (activeTab === 'ec') {
          loadFormSnapshot(ecParsed);
        }
      } catch (e) {
        console.error("Failed loading EC draft", e);
      }
    }
    const portfolioRaw = localStorage.getItem('kycb_draft_portfolio');
    if (portfolioRaw) {
      try {
        const portfolioParsed = JSON.parse(portfolioRaw);
        setPortfolioDraft(portfolioParsed);
        if (activeTab === 'portfolio') {
          loadFormSnapshot(portfolioParsed);
        }
      } catch (e) {
        console.error("Failed loading Portfolio draft", e);
      }
    }
  }, [isAdminMode, userId]);

  // Autosave current draft whenever typing (with currentId === null)
  useEffect(() => {
    if (currentId) return; // do not overwrite draft when editing an existing questionnaire from db
    
    const snapshot = getFormSnapshot();
    if (activeTab === 'lp') {
      localStorage.setItem('kycb_draft_lp', JSON.stringify(snapshot));
    } else if (activeTab === 'ec') {
      localStorage.setItem('kycb_draft_ec', JSON.stringify(snapshot));
    } else if (activeTab === 'portfolio') {
      localStorage.setItem('kycb_draft_portfolio', JSON.stringify(snapshot));
    }
  }, [
    clientName, dateCompleted, businessName, industry, phone, email, address,
    hasSite, siteUrl, socialLinks, visitorActions, otherAction, idealAge, locations,
    occupation, problemsSolved, problemsSolvedDetail, hasLogo, logoDesign,
    hasBrandColors, colorsCount, brandColors, brandTones, hasImages, hasVideos,
    hasTestimonials, sectionsToInclude, displayPricing, pricingRanges, pricingDetail,
    functionalFeatures, otherRequirements, runPaidAds, adPlatforms, otherTraffic,
    privacyPolicy, privacyPolicyPrep, termsPolicy, termsPolicyPrep, refundPolicy,
    refundPolicyPrep, deadline, budgetRange, additionalNotes,
    ecommerceType, hasInventory, inventoryLocation, genderFocus, incomeLevel,
    productInterests, mainProducts, productCards, paymentOptions, deliveryScope,
    deliveryStates, deliveryOptions, chargeDelivery, deliveryFee, logisticsPartner,
    notificationMethods, autoConf, activeTab, hasSocialMediaAsked, hasCustomIndustryOption,
    viewPerspective, ecSpecialOffers, ecSpecialOffersDetail, ecWhyBuy,
    ecProductDiff, ecProductDiffDetail, ecWebsiteStyle, ecPages, ecMarketingHelp,
    
    // portfolio dependency triggers
    portfolioProfession, portfolioProfessionOther, portfolioTools, portfolioToolsOther,
    portfolioYearsExperience, portfolioStrengths, portfolioPurposes, portfolioVisitorActions,
    portfolioTargetVisitors, portfolioTargetIndustries, portfolioFeaturedCount,
    portfolioPresentationStyles, portfolioProjects, portfolioHasImages, portfolioBio,
    portfolioDifferentiators, portfolioDifferentiatorDetail, portfolioHasPhoto,
    portfolioShowEducation, portfolioEducationDetails, portfolioShowExperience,
    portfolioExperienceDetails, portfolioShowServices, portfolioServicesOffered,
    portfolioServicesOther, portfolioShowPricing, portfolioPricingDetails,
    portfolioTypicalProcess, portfolioHasTestimonials, portfolioTestimonialsList,
    portfolioNotableBrands, portfolioHasAwards, portfolioAwardsDetails, portfolioHasLogo,
    portfolioLogoDesign, portfolioHasBrandColors, portfolioColorsCount, portfolioBrandColors,
    portfolioVisualPersonalities, portfolioInspirations, portfolioInspirationDetail,
    portfolioPagesNeeded, portfolioPreferredStructure, portfolioHasBlog, portfolioBlogTopics,
    portfolioHasCV, portfolioFeaturesNeeded, portfolioContactPreferences, portfolioAnimationLevel,
    portfolioHasNDA, portfolioTrafficSources, portfolioWantsSEO, portfolioCustomDomain,
    portfolioDeadline, portfolioBudget, portfolioDrivingEvent, portfolioAdditionalNotes
  ]);

  const fetchForms = async () => {
    const cached = localStorage.getItem('ciya_cached_kycb_forms');
    if (!cached) {
      setLoading(true);
    }
    try {
      let qSnap;
      if (isAdminMode) {
        qSnap = await getDocs(query(collection(db, 'kycb_questionnaires'), limit(200)));
      } else if (userId) {
        qSnap = await getDocs(query(collection(db, 'kycb_questionnaires'), where('userId', '==', userId), limit(50)));
      } else {
        setSavedForms([]);
        setLoading(false);
        return;
      }

      let list = qSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedForm[];

      // Sort in-memory to avoid requiring composite indexes on Firestore
      list.sort((a, b) => {
        const getMills = (fieldVal: any) => {
          if (!fieldVal) return 0;
          if (typeof fieldVal.toDate === 'function') {
            return fieldVal.toDate().getTime();
          }
          return new Date(fieldVal).getTime() || 0;
        };
        return getMills(b.createdAt) - getMills(a.createdAt);
      });
      
      if (!isAdminMode) {
        list = list.filter(form => form.userId === userId || form.id === currentId);
      }
      
      setSavedForms(list);
      try {
        localStorage.setItem('ciya_cached_kycb_forms', JSON.stringify(list));
      } catch (e) {}
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'kycb_questionnaires');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!clientName || !businessName) {
      alert("Please fill in Client Name and Business Name before saving.");
      return;
    }

    if (!currentId && hasExceededLimit) {
      alert(`⚠️ You have reached your archive limit of ${currentLimit} forms. Please delete an old form to save a new one.`);
      return;
    }

    setSaving(true);
    const docData: any = {
      clientName,
      dateCompleted,
      type: activeTab,
      businessName,
      createdAt: serverTimestamp(),
      userId: userId || null,
      userEmail: userEmail || null,
      data: {
        industry, phone, email, address, hasSite, siteUrl, socialLinks,
        visitorActions, otherAction, idealAge, locations, occupation,
        problemsSolved, problemsSolvedDetail, hasLogo, logoDesign,
        hasBrandColors, colorsCount, brandColors, brandTones,
        hasImages, hasVideos, hasTestimonials, sectionsToInclude,
        displayPricing, pricingRanges, pricingDetail, functionalFeatures,
        otherRequirements, runPaidAds, adPlatforms, otherTraffic,
        privacyPolicy, privacyPolicyPrep, termsPolicy, termsPolicyPrep,
        refundPolicy, refundPolicyPrep, deadline, budgetRange, additionalNotes,
        // ecommerce
        ecommerceType, hasInventory, inventoryLocation, genderFocus,
        incomeLevel, productInterests, mainProducts, productCards,
        paymentOptions, deliveryScope, deliveryStates, deliveryOptions,
        chargeDelivery, deliveryFee, logisticsPartner, notificationMethods,
        autoConf,
        // new elements
        hasSocialMediaAsked,
        hasCustomIndustryOption,
        viewPerspective,
        ecSpecialOffers,
        ecSpecialOffersDetail,
        ecWhyBuy,
        ecProductDiff,
        ecProductDiffDetail,
        ecWebsiteStyle,
        ecPages,
        ecMarketingHelp,
        // Landing Page specific 12 sections states
        lpOfferType,
        lpOfferMain,
        lpOfferServices,
        lpOfferServicesDetail,
        lpOfferPromo,
        lpOfferPromoDetail,
        lpWhyChoose,
        lpWhatMakesSpecial,
        lpWhatMakesSpecialDetail,
        // Portfolio specific states
        portfolioProfession,
        portfolioProfessionOther,
        portfolioTools,
        portfolioToolsOther,
        portfolioYearsExperience,
        portfolioStrengths,
        portfolioPurposes,
        portfolioVisitorActions,
        portfolioTargetVisitors,
        portfolioTargetIndustries,
        portfolioFeaturedCount,
        portfolioPresentationStyles,
        portfolioProjects,
        portfolioHasImages,
        portfolioBio,
        portfolioDifferentiators,
        portfolioDifferentiatorDetail,
        portfolioHasPhoto,
        portfolioShowEducation,
        portfolioEducationDetails,
        portfolioShowExperience,
        portfolioExperienceDetails,
        portfolioShowServices,
        portfolioServicesOffered,
        portfolioServicesOther,
        portfolioShowPricing,
        portfolioPricingDetails,
        portfolioTypicalProcess,
        portfolioHasTestimonials,
        portfolioTestimonialsList,
        portfolioNotableBrands,
        portfolioHasAwards,
        portfolioAwardsDetails,
        portfolioHasLogo,
        portfolioLogoDesign,
        portfolioHasBrandColors,
        portfolioColorsCount,
        portfolioBrandColors,
        portfolioVisualPersonalities,
        portfolioInspirations,
        portfolioInspirationDetail,
        portfolioPagesNeeded,
        portfolioPreferredStructure,
        portfolioHasBlog,
        portfolioBlogTopics,
        portfolioHasCV,
        portfolioFeaturesNeeded,
        portfolioContactPreferences,
        portfolioAnimationLevel,
        portfolioHasNDA,
        portfolioTrafficSources,
        portfolioWantsSEO,
        portfolioCustomDomain,
        portfolioDeadline,
        portfolioBudget,
        portfolioDrivingEvent,
        portfolioAdditionalNotes
      }
    };

    try {
      if (currentId) {
        await updateDoc(doc(db, 'kycb_questionnaires', currentId), docData);
      } else {
        await addDoc(collection(db, 'kycb_questionnaires'), docData);
        // Clear active draft upon successful submission so they can start fresh
        if (activeTab === 'lp') {
          localStorage.removeItem('kycb_draft_lp');
          setLpDraft(null);
        } else if (activeTab === 'ec') {
          localStorage.removeItem('kycb_draft_ec');
          setEcDraft(null);
        } else if (activeTab === 'portfolio') {
          localStorage.removeItem('kycb_draft_portfolio');
          setPortfolioDraft(null);
        }
      }
      alert("Questionnaire saved successfully!");
      setCurrentId(null);
      resetForm();
      fetchForms();
    } catch (err) {
      handleFirestoreError(err, currentId ? OperationType.UPDATE : OperationType.CREATE, currentId ? `kycb_questionnaires/${currentId}` : 'kycb_questionnaires');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGlobalSettings = async (updates?: any) => {
    setSavingGlobal(true);
    try {
      const payload = updates || {
        kycbFreeLimit: localKycbFreeLimit,
        kycbProLimit: localKycbProLimit,
        promptsFreeLimit: localPromptsFreeLimit,
        promptsProLimit: localPromptsProLimit
      };
      await updateDoc(doc(db, 'settings', 'app'), payload);
      setGlobalSettingsSaved(true);
      setTimeout(() => setGlobalSettingsSaved(false), 3000);
    } catch (err) {
      console.error("Failed to update global settings:", err);
      alert("Failed to save settings. Please check your permissions.");
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleAiGenerate = async () => {
    if (aiGenerating) return;
    setAiGenerating(true);
    try {
      const businessInfo = generatePromptText();
      const websiteType = activeTab === 'lp' ? 'landing' : (activeTab === 'ec' ? 'ecommerce' : 'portfolio');
      
      const response = await fetch('/api/ai/compile-smart-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          businessInfo, 
          websiteType,
          // We don't send a specific reference template here, 
          // let the server use its internal logic or we could pick one from full_prompts if needed.
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.message || result.error);

      if (result.prompt) {
        // Copy to clipboard and notify
        navigator.clipboard.writeText(result.prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 5000);
        alert("AI Master Prompt Generated & Copied to Clipboard! ⚡\n\nYou can now paste this directly into your preferred AI (ChatGPT, Gemini, Claude, Cursor, v0) to build your website.");
      }
    } catch (err: any) {
      console.error("AI Generation failed:", err);
      let errorMsg = err.message || "Failed to generate master prompt via Gemini.";
      
      // Specifically handle the 402 / Resource Exhausted / Credits Depleted error
      if (errorMsg.includes("credits are depleted") || errorMsg.includes("402") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = "AI Credit Limit Reached: The platform's AI quota is temporarily full or credits are depleted. Please use the 'Manual Mode' below to copy your KYC and Instructions manually.";
      }
      
      // Specifically handle Vertex AI API not enabled error
      if (errorMsg.includes("aiplatform.googleapis.com") || errorMsg.includes("403") || errorMsg.includes("Forbidden")) {
        if (errorMsg.includes("Permission") || errorMsg.includes("predict")) {
          errorMsg = "AI Access Denied: The app needs permission to use your Google Cloud project. Please ensure you have linked your API Key to the correct Billing Project in AI Studio Settings.";
        } else {
          errorMsg = "AI Service Not Activated: The Vertex AI API needs to be enabled in your Google Cloud Console for this project. Please visit the API dashboard to enable 'Vertex AI API' and retry in 2 minutes.";
        }
      }
      
      alert(errorMsg);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleEdit = (form: SavedForm) => {
    setCurrentId(form.id);
    setActiveTab(form.type);
    setClientName(form.clientName || '');
    setDateCompleted(form.dateCompleted || '');
    setBusinessName(form.businessName || '');

    const d = form.data || {};
    setIndustry(d.industry || '');
    setPhone(d.phone || '');
    setEmail(d.email || '');
    setAddress(d.address || '');
    setHasSite(d.hasSite || 'no');
    setSiteUrl(d.siteUrl || '');
    setSocialLinks(d.socialLinks || ['']);
    setVisitorActions(d.visitorActions || []);
    setOtherAction(d.otherAction || '');
    
    // Safety convert arrays
    const ageVal = d.idealAge || ['All ages'];
    setIdealAge(Array.isArray(ageVal) ? ageVal : [ageVal]);
    
    setLocations(d.locations || ['']);
    
    const occVal = d.occupation || [];
    setOccupation(Array.isArray(occVal) ? occVal : (occVal ? [occVal] : []));
    
    setProblemsSolved(d.problemsSolved || []);
    setProblemsSolvedDetail(d.problemsSolvedDetail || '');
    setHasLogo(d.hasLogo || 'no');
    setLogoDesign(d.logoDesign || 'no');
    setHasBrandColors(d.hasBrandColors || 'no');
    setColorsCount(d.colorsCount || 1);
    setBrandColors(d.brandColors || ['#1A3C6E', '#D4A017', '#FFFFFF']);
    setBrandTones(d.brandTones || []);
    setHasImages(d.hasImages || 'no');
    setHasVideos(d.hasVideos || 'no');
    setHasTestimonials(d.hasTestimonials || 'no');
    setSectionsToInclude(d.sectionsToInclude || []);
    setDisplayPricing(d.displayPricing || 'no');
    setPricingRanges(d.pricingRanges || []);
    setPricingDetail(d.pricingDetail || '');
    setFunctionalFeatures(d.functionalFeatures || []);
    setOtherRequirements(d.otherRequirements || '');
    setRunPaidAds(d.runPaidAds || 'no');
    setAdPlatforms(d.adPlatforms || []);
    setOtherTraffic(d.otherTraffic || []);
    setPrivacyPolicy(d.privacyPolicy || '');
    setPrivacyPolicyPrep(d.privacyPolicyPrep || 'no');
    setTermsPolicy(d.termsPolicy || '');
    setTermsPolicyPrep(d.termsPolicyPrep || 'no');
    setRefundPolicy(d.refundPolicy || '');
    setRefundPolicyPrep(d.refundPolicyPrep || 'no');
    setDeadline(d.deadline || '');
    setBudgetRange(d.budgetRange || '');
    setAdditionalNotes(d.additionalNotes || '');

    // ecommerce keys
    setEcommerceType(d.ecommerceType || []);
    setHasInventory(d.hasInventory || 'no');
    setInventoryLocation(d.inventoryLocation || '');
    setGenderFocus(d.genderFocus || []);
    setIncomeLevel(d.incomeLevel || 'Middle income');
    setProductInterests(d.productInterests || []);
    setMainProducts(d.mainProducts || ['']);
    setProductCards(d.productCards || [{ name: '', desc: '', price: '', quantity: '', variants: '' }]);
    setPaymentOptions(d.paymentOptions || []);
    setDeliveryScope(d.deliveryScope || []);
    setDeliveryStates(d.deliveryStates || ['']);
    setDeliveryOptions(d.deliveryOptions || []);
    setChargeDelivery(d.chargeDelivery || 'no');
    setDeliveryFee(d.deliveryFee || '');
    setLogisticsPartner(d.logisticsPartner || '');
    setNotificationMethods(d.notificationMethods || []);
    setAutoConf(d.autoConf || 'no');

    // custom state fields
    setHasSocialMediaAsked(d.hasSocialMediaAsked || '');
    setHasCustomIndustryOption(d.hasCustomIndustryOption || false);
    setViewPerspective(d.viewPerspective || 'client');
    setEcSpecialOffers(d.ecSpecialOffers || []);
    setEcSpecialOffersDetail(d.ecSpecialOffersDetail || '');
    setEcWhyBuy(d.ecWhyBuy || []);
    setEcProductDiff(d.ecProductDiff || []);
    setEcProductDiffDetail(d.ecProductDiffDetail || '');
    setEcWebsiteStyle(d.ecWebsiteStyle || []);
    setEcPages(d.ecPages || []);
    setEcMarketingHelp(d.ecMarketingHelp || 'no');

    // LP specific 12 sections states hydration
    setLpOfferType(d.lpOfferType || []);
    setLpOfferMain(d.lpOfferMain || '');
    setLpOfferServices(d.lpOfferServices || []);
    setLpOfferServicesDetail(d.lpOfferServicesDetail || '');
    setLpOfferPromo(d.lpOfferPromo || []);
    setLpOfferPromoDetail(d.lpOfferPromoDetail || '');
    setLpWhyChoose(d.lpWhyChoose || []);
    setLpWhatMakesSpecial(d.lpWhatMakesSpecial || []);
    setLpWhatMakesSpecialDetail(d.lpWhatMakesSpecialDetail || '');

    // Portfolio specific states hydration
    setPortfolioProfession(d.portfolioProfession ?? '');
    setPortfolioProfessionOther(d.portfolioProfessionOther ?? '');
    setPortfolioTools(d.portfolioTools ?? []);
    setPortfolioToolsOther(d.portfolioToolsOther ?? '');
    setPortfolioYearsExperience(d.portfolioYearsExperience ?? '');
    setPortfolioStrengths(d.portfolioStrengths ?? '');
    setPortfolioPurposes(d.portfolioPurposes ?? []);
    setPortfolioVisitorActions(d.portfolioVisitorActions ?? []);
    setPortfolioTargetVisitors(d.portfolioTargetVisitors ?? []);
    setPortfolioTargetIndustries(d.portfolioTargetIndustries ?? []);
    setPortfolioFeaturedCount(d.portfolioFeaturedCount ?? '3-4');
    setPortfolioPresentationStyles(d.portfolioPresentationStyles ?? []);
    setPortfolioProjects(d.portfolioProjects ?? [{ title: '', company: '', desc: '', year: '', category: '', link: '', tools: '' }]);
    setPortfolioHasImages(d.portfolioHasImages ?? 'no');
    setPortfolioBio(d.portfolioBio ?? '');
    setPortfolioDifferentiators(d.portfolioDifferentiators ?? []);
    setPortfolioDifferentiatorDetail(d.portfolioDifferentiatorDetail ?? '');
    setPortfolioHasPhoto(d.portfolioHasPhoto ?? 'no');
    setPortfolioShowEducation(d.portfolioShowEducation ?? 'no');
    setPortfolioEducationDetails(d.portfolioEducationDetails ?? '');
    setPortfolioShowExperience(d.portfolioShowExperience ?? 'no');
    setPortfolioExperienceDetails(d.portfolioExperienceDetails ?? '');
    setPortfolioShowServices(d.portfolioShowServices ?? 'no');
    setPortfolioServicesOffered(d.portfolioServicesOffered ?? []);
    setPortfolioServicesOther(d.portfolioServicesOther ?? '');
    setPortfolioShowPricing(d.portfolioShowPricing ?? 'no');
    setPortfolioPricingDetails(d.portfolioPricingDetails ?? '');
    setPortfolioTypicalProcess(d.portfolioTypicalProcess ?? []);
    setPortfolioHasTestimonials(d.portfolioHasTestimonials ?? 'no');
    setPortfolioTestimonialsList(d.portfolioTestimonialsList ?? [{ quote: '', name: '', titleCompany: '' }]);
    setPortfolioNotableBrands(d.portfolioNotableBrands ?? '');
    setPortfolioHasAwards(d.portfolioHasAwards ?? 'no');
    setPortfolioAwardsDetails(d.portfolioAwardsDetails ?? '');
    setPortfolioHasLogo(d.portfolioHasLogo ?? 'no');
    setPortfolioLogoDesign(d.portfolioLogoDesign ?? 'no');
    setPortfolioHasBrandColors(d.portfolioHasBrandColors ?? 'no');
    setPortfolioColorsCount(d.portfolioColorsCount ?? 1);
    setPortfolioBrandColors(d.portfolioBrandColors ?? ['#1A3C6E', '#D4A017', '#FFFFFF']);
    setPortfolioVisualPersonalities(d.portfolioVisualPersonalities ?? []);
    setPortfolioInspirations(d.portfolioInspirations ?? ['']);
    setPortfolioInspirationDetail(d.portfolioInspirationDetail ?? '');
    setPortfolioPagesNeeded(d.portfolioPagesNeeded ?? []);
    setPortfolioPreferredStructure(d.portfolioPreferredStructure ?? 'hybrid');
    setPortfolioHasBlog(d.portfolioHasBlog ?? 'no');
    setPortfolioBlogTopics(d.portfolioBlogTopics ?? '');
    setPortfolioHasCV(d.portfolioHasCV ?? 'no');
    setPortfolioFeaturesNeeded(d.portfolioFeaturesNeeded ?? []);
    setPortfolioContactPreferences(d.portfolioContactPreferences ?? []);
    setPortfolioAnimationLevel(d.portfolioAnimationLevel ?? 'moderate');
    setPortfolioHasNDA(d.portfolioHasNDA ?? 'no');
    setPortfolioTrafficSources(d.portfolioTrafficSources ?? []);
    setPortfolioWantsSEO(d.portfolioWantsSEO ?? 'no');
    setPortfolioCustomDomain(d.portfolioCustomDomain ?? '');
    setPortfolioDeadline(d.portfolioDeadline ?? '');
    setPortfolioBudget(d.portfolioBudget ?? '');
    setPortfolioDrivingEvent(d.portfolioDrivingEvent ?? []);
    setPortfolioAdditionalNotes(d.portfolioAdditionalNotes ?? '');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this questionnaire?")) return;
    try {
      await deleteDoc(doc(db, 'kycb_questionnaires', id));
      if (currentId === id) {
        setCurrentId(null);
        resetForm();
      }
      fetchForms();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `kycb_questionnaires/${id}`);
    }
  };

  const handleTabToggle = (nextTab: 'lp' | 'ec' | 'portfolio') => {
    if (currentId) {
      setActiveTab(nextTab);
      return;
    }

    // Backup current state before switching
    const currentSnapshot = getFormSnapshot();
    if (activeTab === 'lp') {
      setLpDraft(currentSnapshot);
      localStorage.setItem('kycb_draft_lp', JSON.stringify(currentSnapshot));
    } else if (activeTab === 'ec') {
      setEcDraft(currentSnapshot);
      localStorage.setItem('kycb_draft_ec', JSON.stringify(currentSnapshot));
    } else if (activeTab === 'portfolio') {
      setPortfolioDraft(currentSnapshot);
      localStorage.setItem('kycb_draft_portfolio', JSON.stringify(currentSnapshot));
    }

    // Switch tab
    setActiveTab(nextTab);

    // Restore next tab's draft
    let targetDraft = nextTab === 'lp' ? lpDraft : (nextTab === 'ec' ? ecDraft : portfolioDraft);
    if (!targetDraft) {
      const raw = localStorage.getItem(`kycb_draft_${nextTab}`);
      if (raw) {
        try {
          targetDraft = JSON.parse(raw);
        } catch (e) {}
      }
    }

    if (targetDraft) {
      loadFormSnapshot(targetDraft);
    } else {
      resetFormDetails();
    }
  };

  const resetForm = () => {
    setCurrentId(null);
    resetFormDetails();
  };

  const toggleMultiSelect = (item: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(x => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Helper additions
  const addArrayItem = (list: string[], setList: (v: string[]) => void) => setList([...list, '']);
  const updateArrayItem = (idx: number, val: string, list: string[], setList: (v: string[]) => void) => {
    const next = [...list];
    next[idx] = val;
    setList(next);
  };
  const removeArrayItem = (idx: number, list: string[], setList: (v: string[]) => void) => {
    if (list.length > 1) {
      setList(list.filter((_, i) => i !== idx));
    }
  };

  return (
    <div className="flex flex-col gap-6 p-1 md:p-4 text-slate-800">
      {/* Branded Section Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1A3C6E] flex items-center justify-center text-[#D4A017] shadow-lg shadow-indigo-900/20">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-[#1A3C6E] tracking-tight">
              {isAdminMode ? 'KYCB Settings & Config' : 'KYCB Section'}
            </h2>
          </div>
        </div>

        {/* View Toggle - ONLY SHOW IN STUDENT MODE */}
        {!isAdminMode && (
          <div className="flex bg-slate-100 p-1 rounded-2xl self-start md:self-center border border-slate-200 shadow-inner">
            <button
              onClick={() => setLocalActiveSubView('form')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 border-0 cursor-pointer ${localActiveSubView === 'form' ? 'bg-[#1A3C6E] text-[#D4A017] shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
            >
              <ClipboardList className="w-4 h-4" />
              KYCB Form
            </button>
            <button
              onClick={() => setLocalActiveSubView('saved')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 border-0 cursor-pointer ${localActiveSubView === 'saved' ? 'bg-[#1A3C6E] text-[#D4A017] shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
            >
              <Archive className="w-4 h-4" />
              Saved Forms
            </button>
          </div>
        )}
      </div>

      {isAdminMode ? (
        /* ADMIN SETTINGS VIEW */
        <div className="max-w-4xl space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-8">
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Saved Forms Limits</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Control how many KYCB questionnaires students can securely save to their archive before requiring a badge upgrade or hitting the platform ceiling.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free Member Limit */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Student Tier</span>
                    <span className="text-sm font-black text-slate-900">Free Members</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">Max Saved Forms</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      min="0"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={localKycbFreeLimit}
                      onChange={(e) => setLocalKycbFreeLimit(parseInt(e.target.value) || 0)}
                    />
                    <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Forms Allowed</span>
                  </div>
                </div>
              </div>

              {/* Pro Member Limit */}
              <div className="p-5 bg-indigo-50/30 rounded-2xl border border-indigo-100 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-amber-500 shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block">Student Tier</span>
                    <span className="text-sm font-black text-[#1A3C6E]">CIYA Student Pro</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-indigo-700 mb-2 uppercase tracking-wide">Max Saved Forms</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      min="1"
                      className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={localKycbProLimit}
                      onChange={(e) => setLocalKycbProLimit(parseInt(e.target.value) || 0)}
                    />
                    <span className="text-xs font-bold text-indigo-400 whitespace-nowrap">Forms Allowed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3 text-emerald-600 bg-emerald-50/50 -mx-6 -mb-6 p-6 rounded-b-3xl">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-wider">Settings are synced automatically across all student dashboards.</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateGlobalSettings()}
                disabled={savingGlobal}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {savingGlobal ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {globalSettingsSaved ? 'Settings Saved! ✓' : 'Save All Settings'}
              </button>
            </div>
          </div>

          {/* Daily Prompt Copies Limits */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-8">
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Daily Prompt Copies</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Define the maximum number of prompt blueprints students can copy every 24 hours. These limits help manage platform usage and distinguish the Pro experience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free Member Prompt Limit */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Student Tier</span>
                    <span className="text-sm font-black text-slate-900">Free Members</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">Daily Copy Limit</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      min="0"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={localPromptsFreeLimit}
                      onChange={(e) => setLocalPromptsFreeLimit(parseInt(e.target.value) || 0)}
                    />
                    <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Copies Allowed</span>
                  </div>
                </div>
              </div>

              {/* Pro Member Prompt Limit */}
              <div className="p-5 bg-amber-50/30 rounded-2xl border border-amber-100 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-amber-100 flex items-center justify-center text-amber-500 shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">Student Tier</span>
                    <span className="text-sm font-black text-[#1A3C6E]">CIYA Student Pro</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-700 mb-2 uppercase tracking-wide">Daily Copy Limit</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      min="1"
                      className="w-full bg-white border border-amber-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-800 focus:ring-2 focus:ring-amber-500/20 outline-none"
                      value={localPromptsProLimit}
                      onChange={(e) => setLocalPromptsProLimit(parseInt(e.target.value) || 0)}
                    />
                    <span className="text-xs font-bold text-amber-400 whitespace-nowrap">Copies Allowed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3 text-emerald-600 bg-emerald-50/50 -mx-6 -mb-6 p-6 rounded-b-3xl">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-wider">Prompt usage limits are synced in real-time.</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateGlobalSettings()}
                disabled={savingGlobal}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {savingGlobal ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {globalSettingsSaved ? 'Settings Saved! ✓' : 'Save All Settings'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* STUDENT VIEW (Questionnaire + Saved Forms) */
        <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar List of questionnaires */}
        {(localActiveSubView === 'saved') && (
        <div className="w-full lg:w-72 bg-white rounded-2xl border border-slate-200 p-4 shrink-0 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b">
            <span className="font-extrabold text-sm text-slate-900 tracking-wider">SAVED FORMS</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${hasExceededLimit ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
              {savedForms.length} / {currentLimit}
            </span>
          </div>

          <button
            onClick={resetForm}
            disabled={hasExceededLimit}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer ${
              hasExceededLimit 
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none' 
                : 'bg-[#1A3C6E] text-white shadow-indigo-950/20 hover:bg-[#15325C]'
            }`}
          >
            <Plus className={`w-4 h-4 ${hasExceededLimit ? 'text-slate-300' : 'text-amber-400'}`} />
            {hasExceededLimit ? 'Limit Reached' : 'Create New Sheet'}
          </button>

          <div className="flex-1 overflow-y-auto max-h-[350px] lg:max-h-[600px] space-y-2 pr-1">
            {loading ? (
              <div className="py-4 text-center text-xs text-slate-400 font-bold">Syncing archives...</div>
            ) : savedForms.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-semibold italic">No saved questionnaires securely stored.</div>
            ) : (
              savedForms.map(form => (
                <div
                  key={form.id}
                  onClick={() => handleEdit(form)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex justify-between items-start gap-2 relative group overflow-hidden ${
                    currentId === form.id 
                      ? 'border-[#1A3C6E] bg-slate-50 ring-1 ring-[#1A3C6E]' 
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-[#D4A017] flex items-center gap-1">
                      {form.type === 'lp' ? '✏️ LANDING PAGE' : (form.type === 'ec' ? '🛒 ECOMMERCE' : '💼 PORTFOLIO')}
                    </span>
                    <div className="font-extrabold text-[#1A3C6E] text-xs truncate max-w-[150px]">{form.clientName}</div>
                    <div className="text-[10px] text-slate-400 font-bold truncate max-w-[150px]">{form.businessName}</div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(form.id, e)}
                    aria-label="Delete questionnaire"
                    className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* CLIENT LINK GENERATOR */}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 relative">
            {hasExceededLimit && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-4 rounded-2xl border border-dashed border-rose-200">
                <div className="p-3 bg-rose-50 rounded-full mb-3 text-rose-500 border border-rose-200 shadow-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">KYCB Archive Full</h5>
                <p className="text-[10px] text-slate-500 font-bold max-w-[200px] leading-relaxed mt-2">
                  {isPro 
                    ? `You have reached your maximum limit of ${currentLimit} saved forms. Please delete an old form to generate a new client link.`
                    : `Free members can save up to ${currentLimit} forms. Upgrade to CIYA Student Pro to increase your archive capacity!`}
                </p>
                {!isPro && (
                  <div className="mt-4 text-[9px] font-black uppercase text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-150">
                    UPGRADE TO PRO
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Link2 className="w-4 h-4 text-[#1A3C6E]" /> Client Share Link
              </h4>
              <p className="text-[10px] text-slate-400 font-bold leading-normal">
                Generate a secure link for clients to fill out their design brief.
              </p>
            </div>

            <div className="space-y-2 text-left">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Target Form Profile</label>
                <CustomDropdown
                  disabled={hasExceededLimit}
                  value={shareType}
                  options={[
                    { label: '✏️ Landing Page', value: 'lp' },
                    { label: '🛒 eCommerce Store', value: 'ec' },
                    { label: '💼 Portfolio Website', value: 'portfolio' }
                  ]}
                  onChange={(val) => setShareType(val as any)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Custom Form Title {isPro ? '✨' : '📝'}
                </label>
                <input
                  type="text"
                  value={shareTitle}
                  disabled={hasExceededLimit}
                  onChange={(e) => setShareTitle(e.target.value)}
                  placeholder="e.g. Website Requirements Form"
                  className={`w-full text-xs font-semibold border rounded-xl px-2.5 py-2 focus:outline-none ${
                    !hasExceededLimit 
                      ? 'border-slate-200 bg-white text-slate-800' 
                      : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Developer Name</label>
                <input
                  type="text"
                  disabled={hasExceededLimit}
                  value={shareStudent}
                  onChange={(e) => setShareStudent(e.target.value)}
                  placeholder="Your Name / Agency"
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none bg-white text-slate-800 disabled:opacity-50"
                />
              </div>
            </div>

            {linkCopied && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-center text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider animate-fadeIn">
                Copied to Clipboard! ⚡ Send it to your Client!
              </div>
            )}

            <button
              type="button"
              disabled={hasExceededLimit}
              onClick={() => {
                if (hasExceededLimit) return;
                const origin = window.location.origin;
                const params = new URLSearchParams();
                params.set('type', shareType);
                params.set('title', shareTitle || 'CIYA Academy Website Requirements Form');
                if (shareStudent) {
                  params.set('student', shareStudent);
                }
                const fullUrl = `${origin}/client-form?${params.toString()}`;
                navigator.clipboard.writeText(fullUrl);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 3000);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 hover:scale-[1.01] transition-all text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-teal-700/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Link2 className="w-4 h-4" />
              Generate & Copy Link
            </button>
          </div>
        </div>
      )}

      {/* Main Questionnaire Canvas */}
      {(localActiveSubView === 'form') && (
        <div className={`flex-1 rounded-3xl border p-4 md:p-8 shadow-sm transition-all duration-300 ${
          activeTab === 'lp' 
            ? 'bg-[#FCFDFF] border-slate-200' 
            : activeTab === 'ec'
              ? 'bg-[#FCFAF3] border-amber-200/50 shadow-amber-900/[0.01]'
              : 'bg-[#FAFDFD] border-teal-200/40 shadow-teal-950/[0.01]'
        }`}>
          <div className="text-center md:text-left border-b border-slate-100 pb-5 mb-6">
            <h1 className="text-xl md:text-2xl font-black text-[#1A3C6E] tracking-tight flex items-center justify-center md:justify-start gap-2">
              <span className="p-1 px-2.5 bg-[#1A3C6E] text-[#D4A017] rounded-xl text-sm font-black">KYCB</span>
              {qL("Know Your Client & Business", "Portfolio Consulting Spec")}
            </h1>
          </div>

          {/* Global Metadata Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-left">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Client Full Name *</label>
              <input 
                type="text" 
                value={clientName} 
                onChange={e => setClientName(e.target.value)} 
                placeholder="e.g. Sandra Johnson" 
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-[#1A3C6E] outline-none bg-white font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Date Completed</label>
              <input 
                type="date" 
                value={dateCompleted} 
                onChange={e => setDateCompleted(e.target.value)} 
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-[#1A3C6E] outline-none bg-white font-medium"
              />
            </div>
          </div>

          {/* Toggle Mode Perspective Selector */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border border-slate-200/60 bg-slate-50/60 rounded-2xl p-4 mb-6 shadow-sm">
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-[#1A3C6E] tracking-tight uppercase">View Mode Perspective</span>
              <span className="text-[10px] text-slate-400 font-bold">Swap questions framing for clients or freelancers</span>
            </div>
            <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-inner shrink-0">
              <button
                type="button"
                onClick={() => setViewPerspective('client')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewPerspective === 'client' 
                    ? 'bg-[#1A3C6E] text-[#D4A017] shadow-sm font-black' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                👤 Client View
              </button>
              <button
                type="button"
                onClick={() => setViewPerspective('freelancer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewPerspective === 'freelancer' 
                    ? 'bg-[#1A3C6E] text-[#D4A017] shadow-sm font-black' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                💼 Freelancer View
              </button>
            </div>
          </div>

          {/* Triple Tab Controls */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => handleTabToggle('lp')}
              className={`flex-1 py-3 px-3 text-center rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === 'lp' ? 'bg-[#1A3C6E] text-[#D4A017] shadow' : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              ✏️ Landing Page
            </button>
            <button
              type="button"
              onClick={() => handleTabToggle('ec')}
              className={`flex-1 py-3 px-3 text-center rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === 'ec' ? 'bg-[#1A3C6E] text-[#D4A017] shadow' : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              🛒 eCommerce Specifics
            </button>
            <button
              type="button"
              onClick={() => handleTabToggle('portfolio')}
              className={`flex-1 py-3 px-3 text-center rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === 'portfolio' ? 'bg-[#1A3C6E] text-[#D4A017] shadow' : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              💼 Portfolio Questionnaire
            </button>
          </div>

          {/* Form Sections */}
          <div className="space-y-6">
            {activeTab === 'lp' ? (
              <LpQuestionnaireForm
                viewPerspective={viewPerspective || 'client'}
                hasSite={hasSite}
                setHasSite={setHasSite}
                siteUrl={siteUrl}
                setSiteUrl={setSiteUrl}
                businessName={businessName}
                setBusinessName={setBusinessName}
                industry={industry}
                setIndustry={setIndustry}
                hasCustomIndustryOption={hasCustomIndustryOption}
                setHasCustomIndustryOption={setHasCustomIndustryOption}
                phone={phone}
                setPhone={setPhone}
                email={email}
                setEmail={setEmail}
                address={address}
                setAddress={setAddress}
                hasSocialMediaAsked={hasSocialMediaAsked}
                setHasSocialMediaAsked={setHasSocialMediaAsked}
                socialLinks={socialLinks}
                setSocialLinks={setSocialLinks}
                visitorActions={visitorActions}
                setVisitorActions={setVisitorActions}
                otherAction={otherAction}
                setOtherAction={setOtherAction}
                idealAge={idealAge}
                setIdealAge={setIdealAge}
                locations={locations}
                setLocations={setLocations}
                occupation={occupation}
                setOccupation={setOccupation}
                problemsSolved={problemsSolved}
                setProblemsSolved={setProblemsSolved}
                problemsSolvedDetail={problemsSolvedDetail}
                setProblemsSolvedDetail={setProblemsSolvedDetail}
                hasLogo={hasLogo}
                setHasLogo={setHasLogo}
                logoDesign={logoDesign}
                setLogoDesign={setLogoDesign}
                hasBrandColors={hasBrandColors}
                setHasBrandColors={setHasBrandColors}
                colorsCount={colorsCount}
                setColorsCount={setColorsCount}
                brandColors={brandColors}
                setBrandColors={setBrandColors}
                brandTones={brandTones}
                setBrandTones={setBrandTones}
                sectionsToInclude={sectionsToInclude}
                setSectionsToInclude={setSectionsToInclude}
                displayPricing={displayPricing}
                setDisplayPricing={setDisplayPricing}
                pricingRanges={pricingRanges}
                setPricingRanges={setPricingRanges}
                pricingDetail={pricingDetail}
                setPricingDetail={setPricingDetail}
                privacyPolicy={privacyPolicy}
                setPrivacyPolicy={setPrivacyPolicy}
                privacyPolicyPrep={privacyPolicyPrep}
                setPrivacyPolicyPrep={setPrivacyPolicyPrep}
                termsPolicy={termsPolicy}
                setTermsPolicy={setTermsPolicy}
                termsPolicyPrep={termsPolicyPrep}
                setTermsPolicyPrep={setTermsPolicyPrep}
                refundPolicy={refundPolicy}
                setRefundPolicy={setRefundPolicy}
                refundPolicyPrep={refundPolicyPrep}
                setRefundPolicyPrep={setRefundPolicyPrep}
                deadline={deadline}
                setDeadline={setDeadline}
                budgetRange={budgetRange}
                setBudgetRange={setBudgetRange}
                additionalNotes={additionalNotes}
                setAdditionalNotes={setAdditionalNotes}
                hasImages={hasImages}
                setHasImages={setHasImages}
                hasVideos={hasVideos}
                setHasVideos={setHasVideos}
                hasTestimonials={hasTestimonials}
                setHasTestimonials={setHasTestimonials}
                functionalFeatures={functionalFeatures}
                setFunctionalFeatures={setFunctionalFeatures}
                otherRequirements={otherRequirements}
                setOtherRequirements={setOtherRequirements}
                runPaidAds={runPaidAds}
                setRunPaidAds={setRunPaidAds}
                adPlatforms={adPlatforms}
                setAdPlatforms={setAdPlatforms}
                otherTraffic={otherTraffic}
                setOtherTraffic={setOtherTraffic}
                lpOfferType={lpOfferType}
                setLpOfferType={setLpOfferType}
                lpOfferMain={lpOfferMain}
                setLpOfferMain={setLpOfferMain}
                lpOfferServices={lpOfferServices}
                setLpOfferServices={setLpOfferServices}
                lpOfferServicesDetail={lpOfferServicesDetail}
                setLpOfferServicesDetail={setLpOfferServicesDetail}
                lpOfferPromo={lpOfferPromo}
                setLpOfferPromo={setLpOfferPromo}
                lpOfferPromoDetail={lpOfferPromoDetail}
                setLpOfferPromoDetail={setLpOfferPromoDetail}
                lpWhyChoose={lpWhyChoose}
                setLpWhyChoose={setLpWhyChoose}
                lpWhatMakesSpecial={lpWhatMakesSpecial}
                setLpWhatMakesSpecial={setLpWhatMakesSpecial}
                lpWhatMakesSpecialDetail={lpWhatMakesSpecialDetail}
                setLpWhatMakesSpecialDetail={setLpWhatMakesSpecialDetail}
                toggleMultiSelect={toggleMultiSelect}
                updateArrayItem={updateArrayItem}
                removeArrayItem={removeArrayItem}
                addArrayItem={addArrayItem}
              />
            ) : activeTab === 'ec' ? (
              <EcQuestionnaireForm
                viewPerspective={viewPerspective || 'client'}
                hasSite={hasSite}
                setHasSite={setHasSite}
                siteUrl={siteUrl}
                setSiteUrl={setSiteUrl}
                businessName={businessName}
                setBusinessName={setBusinessName}
                industry={industry}
                setIndustry={setIndustry}
                hasCustomIndustryOption={hasCustomIndustryOption}
                setHasCustomIndustryOption={setHasCustomIndustryOption}
                phone={phone}
                setPhone={setPhone}
                email={email}
                setEmail={setEmail}
                address={address}
                setAddress={setAddress}
                hasSocialMediaAsked={hasSocialMediaAsked}
                setHasSocialMediaAsked={setHasSocialMediaAsked}
                socialLinks={socialLinks}
                setSocialLinks={setSocialLinks}
                ecommerceType={ecommerceType}
                setEcommerceType={setEcommerceType}
                hasInventory={hasInventory}
                setHasInventory={setHasInventory}
                inventoryLocation={inventoryLocation}
                setInventoryLocation={setInventoryLocation}
                visitorActions={visitorActions}
                setVisitorActions={setVisitorActions}
                otherAction={otherAction}
                setOtherAction={setOtherAction}
                idealAge={idealAge}
                setIdealAge={setIdealAge}
                genderFocus={genderFocus}
                setGenderFocus={setGenderFocus}
                incomeLevel={incomeLevel}
                setIncomeLevel={setIncomeLevel}
                productInterests={productInterests}
                setProductInterests={setProductInterests}
                locations={locations}
                setLocations={setLocations}
                problemsSolved={problemsSolved}
                setProblemsSolved={setProblemsSolved}
                problemsSolvedDetail={problemsSolvedDetail}
                setProblemsSolvedDetail={setProblemsSolvedDetail}
                mainProducts={mainProducts}
                setMainProducts={setMainProducts}
                productCards={productCards}
                setProductCards={setProductCards}
                ecSpecialOffers={ecSpecialOffers}
                setEcSpecialOffers={setEcSpecialOffers}
                ecSpecialOffersDetail={ecSpecialOffersDetail}
                setEcSpecialOffersDetail={setEcSpecialOffersDetail}
                ecWhyBuy={ecWhyBuy}
                setEcWhyBuy={setEcWhyBuy}
                ecProductDiff={ecProductDiff}
                setEcProductDiff={setEcProductDiff}
                ecProductDiffDetail={ecProductDiffDetail}
                setEcProductDiffDetail={setEcProductDiffDetail}
                hasLogo={hasLogo}
                setHasLogo={setHasLogo}
                logoDesign={logoDesign}
                setLogoDesign={setLogoDesign}
                hasBrandColors={hasBrandColors}
                setHasBrandColors={setHasBrandColors}
                colorsCount={colorsCount}
                setColorsCount={setColorsCount}
                brandColors={brandColors}
                setBrandColors={setBrandColors}
                ecWebsiteStyle={ecWebsiteStyle}
                setEcWebsiteStyle={setEcWebsiteStyle}
                brandTones={brandTones}
                setBrandTones={setBrandTones}
                hasImages={hasImages}
                setHasImages={setHasImages}
                hasVideos={hasVideos}
                setHasVideos={setHasVideos}
                hasTestimonials={hasTestimonials}
                setHasTestimonials={setHasTestimonials}
                ecPages={ecPages}
                setEcPages={setEcPages}
                paymentOptions={paymentOptions}
                setPaymentOptions={setPaymentOptions}
                deliveryScope={deliveryScope}
                setDeliveryScope={setDeliveryScope}
                deliveryStates={deliveryStates}
                setDeliveryStates={setDeliveryStates}
                deliveryOptions={deliveryOptions}
                setDeliveryOptions={setDeliveryOptions}
                chargeDelivery={chargeDelivery}
                setChargeDelivery={setChargeDelivery}
                deliveryFee={deliveryFee}
                setDeliveryFee={setDeliveryFee}
                logisticsPartner={logisticsPartner}
                setLogisticsPartner={setLogisticsPartner}
                notificationMethods={notificationMethods}
                setNotificationMethods={setNotificationMethods}
                autoConf={autoConf}
                setAutoConf={setAutoConf}
                functionalFeatures={functionalFeatures}
                setFunctionalFeatures={setFunctionalFeatures}
                otherRequirements={otherRequirements}
                setOtherRequirements={setOtherRequirements}
                runPaidAds={runPaidAds}
                setRunPaidAds={setRunPaidAds}
                adPlatforms={adPlatforms}
                setAdPlatforms={setAdPlatforms}
                otherTraffic={otherTraffic}
                setOtherTraffic={setOtherTraffic}
                ecMarketingHelp={ecMarketingHelp}
                setEcMarketingHelp={setEcMarketingHelp}
                privacyPolicy={privacyPolicy}
                setPrivacyPolicy={setPrivacyPolicy}
                privacyPolicyPrep={privacyPolicyPrep}
                setPrivacyPolicyPrep={setPrivacyPolicyPrep}
                termsPolicy={termsPolicy}
                setTermsPolicy={setTermsPolicy}
                termsPolicyPrep={termsPolicyPrep}
                setTermsPolicyPrep={setTermsPolicyPrep}
                refundPolicy={refundPolicy}
                setRefundPolicy={setRefundPolicy}
                refundPolicyPrep={refundPolicyPrep}
                setRefundPolicyPrep={setRefundPolicyPrep}
                deadline={deadline}
                setDeadline={setDeadline}
                budgetRange={budgetRange}
                setBudgetRange={setBudgetRange}
                additionalNotes={additionalNotes}
                setAdditionalNotes={setAdditionalNotes}
                toggleMultiSelect={toggleMultiSelect}
                updateArrayItem={updateArrayItem}
                removeArrayItem={removeArrayItem}
                addArrayItem={addArrayItem}
              />
            ) : (
              <PortfolioQuestionnaireForm
                viewPerspective={viewPerspective || 'client'}
                hasSite={hasSite}
                setHasSite={setHasSite}
                siteUrl={siteUrl}
                setSiteUrl={setSiteUrl}
                businessName={businessName}
                setBusinessName={setBusinessName}
                phone={phone}
                setPhone={setPhone}
                email={email}
                setEmail={setEmail}
                address={address}
                setAddress={setAddress}
                hasSocialMediaAsked={hasSocialMediaAsked}
                setHasSocialMediaAsked={setHasSocialMediaAsked}
                socialLinks={socialLinks}
                setSocialLinks={setSocialLinks}
                portfolioProfession={portfolioProfession}
                setPortfolioProfession={setPortfolioProfession}
                portfolioProfessionOther={portfolioProfessionOther}
                setPortfolioProfessionOther={setPortfolioProfessionOther}
                portfolioTools={portfolioTools}
                setPortfolioTools={setPortfolioTools}
                portfolioToolsOther={portfolioToolsOther}
                setPortfolioToolsOther={setPortfolioToolsOther}
                portfolioYearsExperience={portfolioYearsExperience}
                setPortfolioYearsExperience={setPortfolioYearsExperience}
                portfolioStrengths={portfolioStrengths}
                setPortfolioStrengths={setPortfolioStrengths}
                portfolioPurposes={portfolioPurposes}
                setPortfolioPurposes={setPortfolioPurposes}
                portfolioVisitorActions={portfolioVisitorActions}
                setPortfolioVisitorActions={setPortfolioVisitorActions}
                portfolioTargetVisitors={portfolioTargetVisitors}
                setPortfolioTargetVisitors={setPortfolioTargetVisitors}
                portfolioTargetIndustries={portfolioTargetIndustries}
                setPortfolioTargetIndustries={setPortfolioTargetIndustries}
                portfolioFeaturedCount={portfolioFeaturedCount}
                setPortfolioFeaturedCount={setPortfolioFeaturedCount}
                portfolioPresentationStyles={portfolioPresentationStyles}
                setPortfolioPresentationStyles={setPortfolioPresentationStyles}
                portfolioProjects={portfolioProjects}
                setPortfolioProjects={setPortfolioProjects}
                portfolioHasImages={portfolioHasImages}
                setPortfolioHasImages={setPortfolioHasImages}
                portfolioBio={portfolioBio}
                setPortfolioBio={setPortfolioBio}
                portfolioDifferentiators={portfolioDifferentiators}
                setPortfolioDifferentiators={setPortfolioDifferentiators}
                portfolioDifferentiatorDetail={portfolioDifferentiatorDetail}
                setPortfolioDifferentiatorDetail={setPortfolioDifferentiatorDetail}
                portfolioHasPhoto={portfolioHasPhoto}
                setPortfolioHasPhoto={setPortfolioHasPhoto}
                portfolioShowEducation={portfolioShowEducation}
                setPortfolioShowEducation={setPortfolioShowEducation}
                portfolioEducationDetails={portfolioEducationDetails}
                setPortfolioEducationDetails={setPortfolioEducationDetails}
                portfolioShowExperience={portfolioShowExperience}
                setPortfolioShowExperience={setPortfolioShowExperience}
                portfolioExperienceDetails={portfolioExperienceDetails}
                setPortfolioExperienceDetails={setPortfolioExperienceDetails}
                portfolioShowServices={portfolioShowServices}
                setPortfolioShowServices={setPortfolioShowServices}
                portfolioServicesOffered={portfolioServicesOffered}
                setPortfolioServicesOffered={setPortfolioServicesOffered}
                portfolioServicesOther={portfolioServicesOther}
                setPortfolioServicesOther={setPortfolioServicesOther}
                portfolioShowPricing={portfolioShowPricing}
                setPortfolioShowPricing={setPortfolioShowPricing}
                portfolioPricingDetails={portfolioPricingDetails}
                setPortfolioPricingDetails={setPortfolioPricingDetails}
                portfolioTypicalProcess={portfolioTypicalProcess}
                setPortfolioTypicalProcess={setPortfolioTypicalProcess}
                portfolioHasTestimonials={portfolioHasTestimonials}
                setPortfolioHasTestimonials={setPortfolioHasTestimonials}
                portfolioTestimonialsList={portfolioTestimonialsList}
                setPortfolioTestimonialsList={setPortfolioTestimonialsList}
                portfolioNotableBrands={portfolioNotableBrands}
                setPortfolioNotableBrands={setPortfolioNotableBrands}
                portfolioHasAwards={portfolioHasAwards}
                setPortfolioHasAwards={setPortfolioHasAwards}
                portfolioAwardsDetails={portfolioAwardsDetails}
                setPortfolioAwardsDetails={setPortfolioAwardsDetails}
                portfolioHasLogo={portfolioHasLogo}
                setPortfolioHasLogo={setPortfolioHasLogo}
                portfolioLogoDesign={portfolioLogoDesign}
                setPortfolioLogoDesign={setPortfolioLogoDesign}
                portfolioHasBrandColors={portfolioHasBrandColors}
                setPortfolioHasBrandColors={setPortfolioHasBrandColors}
                portfolioColorsCount={portfolioColorsCount}
                setPortfolioColorsCount={setPortfolioColorsCount}
                portfolioBrandColors={portfolioBrandColors}
                setPortfolioBrandColors={setPortfolioBrandColors}
                portfolioVisualPersonalities={portfolioVisualPersonalities}
                setPortfolioVisualPersonalities={setPortfolioVisualPersonalities}
                portfolioInspirations={portfolioInspirations}
                setPortfolioInspirations={setPortfolioInspirations}
                portfolioInspirationDetail={portfolioInspirationDetail}
                setPortfolioInspirationDetail={setPortfolioInspirationDetail}
                portfolioPagesNeeded={portfolioPagesNeeded}
                setPortfolioPagesNeeded={setPortfolioPagesNeeded}
                portfolioPreferredStructure={portfolioPreferredStructure}
                setPortfolioPreferredStructure={setPortfolioPreferredStructure}
                portfolioHasBlog={portfolioHasBlog}
                setPortfolioHasBlog={setPortfolioHasBlog}
                portfolioBlogTopics={portfolioBlogTopics}
                setPortfolioBlogTopics={setPortfolioBlogTopics}
                portfolioHasCV={portfolioHasCV}
                setPortfolioHasCV={setPortfolioHasCV}
                portfolioFeaturesNeeded={portfolioFeaturesNeeded}
                setPortfolioFeaturesNeeded={setPortfolioFeaturesNeeded}
                portfolioContactPreferences={portfolioContactPreferences}
                setPortfolioContactPreferences={setPortfolioContactPreferences}
                portfolioAnimationLevel={portfolioAnimationLevel}
                setPortfolioAnimationLevel={setPortfolioAnimationLevel}
                portfolioHasNDA={portfolioHasNDA}
                setPortfolioHasNDA={setPortfolioHasNDA}
                portfolioTrafficSources={portfolioTrafficSources}
                setPortfolioTrafficSources={setPortfolioTrafficSources}
                portfolioWantsSEO={portfolioWantsSEO}
                setPortfolioWantsSEO={setPortfolioWantsSEO}
                portfolioCustomDomain={portfolioCustomDomain}
                setPortfolioCustomDomain={setPortfolioCustomDomain}
                portfolioDeadline={portfolioDeadline}
                setPortfolioDeadline={setPortfolioDeadline}
                portfolioBudget={portfolioBudget}
                setPortfolioBudget={setPortfolioBudget}
                portfolioDrivingEvent={portfolioDrivingEvent}
                setPortfolioDrivingEvent={setPortfolioDrivingEvent}
                portfolioAdditionalNotes={portfolioAdditionalNotes}
                setPortfolioAdditionalNotes={setPortfolioAdditionalNotes}
                toggleMultiSelect={toggleMultiSelect}
                updateArrayItem={updateArrayItem}
                removeArrayItem={removeArrayItem}
                addArrayItem={addArrayItem}
              />
            )}
          </div>

          {/* Global form controls */}
          <div className="mt-8 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row gap-6 items-center justify-between">
              {/* Auto vs Manual Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveButtonView('manual')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    activeButtonView === 'manual' 
                      ? 'bg-white text-[#1A3C6E] shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  Manual Mode
                </button>
                <button
                  type="button"
                  onClick={() => setActiveButtonView('auto')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    activeButtonView === 'auto' 
                      ? 'bg-[#1A3C6E] text-[#D4A017] shadow-md' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  AI Auto Mode
                </button>
              </div>

              {activeButtonView === 'manual' ? (
                <div className="relative w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setManualDropdownOpen(!manualDropdownOpen)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black cursor-pointer shadow-lg transition-all active:scale-95"
                  >
                    Manage KYC Draft
                    <ChevronDown className={`w-4 h-4 transition-transform ${manualDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {manualDropdownOpen && (
                    <div className="absolute bottom-full right-0 mb-3 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-30 animate-in slide-in-from-bottom-2 duration-200">
                      <div className="p-2 space-y-1">
                        <button
                          type="button"
                          onClick={() => { handleCopy(); setManualDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left rounded-xl transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Copy className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-800">{copied ? 'Copied!' : 'Copy KYC Text'}</span>
                            <span className="text-[10px] text-slate-400 font-bold">Raw data for AI chatbots</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setShowInstructionalModal(true); setManualDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left rounded-xl transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-800">Copy AI Instructions</span>
                            <span className="text-[10px] text-slate-400 font-bold">Merge KYC with templates</span>
                          </div>
                        </button>

                        <div className="h-px bg-slate-100 my-1 mx-2" />

                        <button
                          type="button"
                          onClick={() => { handleSave(); setManualDropdownOpen(false); }}
                          disabled={saving}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left rounded-xl transition-all group disabled:opacity-50"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <Save className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-800">{saving ? 'Saving...' : 'Save Current Work'}</span>
                            <span className="text-[10px] text-slate-400 font-bold">Store securely in archives</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { resetFormDetails(); setManualDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-50 text-left rounded-xl transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-rose-800">Clear Draft Inputs</span>
                            <span className="text-[10px] text-rose-400 font-bold">Reset this entire form</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={aiGenerating}
                    className="w-full flex items-center justify-center gap-3 px-8 py-3 bg-gradient-to-r from-[#1A3C6E] to-indigo-600 hover:from-[#15325C] hover:to-indigo-700 text-white rounded-xl text-sm font-black cursor-pointer shadow-xl shadow-indigo-900/20 transition-all active:scale-95 disabled:opacity-50 group"
                  >
                    {aiGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        AI is compiling your Master Prompt...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-[#D4A017] group-hover:animate-pulse" />
                        Generate Master Prompt with Gemini
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            
            {activeButtonView === 'auto' && !aiGenerating && (
              <p className="text-[10px] text-center text-slate-400 font-bold mt-4 uppercase tracking-widest animate-fadeIn">
                Gemini will scan your KYC data and compile it into a high-fidelity Master prompt automatically.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )}

    {/* Instructional Prompt Modal */}
    {showInstructionalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-5 md:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div>
                  <h3 className="font-black text-sm md:text-base text-white tracking-tight flex items-center gap-2">
                    Instructional Prompt
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                      KYC + Template Converter
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Instructions for AI chatbots (ChatGPT, Gemini, Claude, Cursor, v0) to merge your KYC with any Website Prompt Template.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInstructionalModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 md:p-6 overflow-y-auto space-y-5 flex-1 text-slate-700 min-h-0">
                {/* How To Steps */}
                <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-4 space-y-2.5">
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-indigo-600" /> Workflow Steps
                  </h4>
                  <ol className="text-xs text-indigo-900 font-medium space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>
                      <strong>1. Copy your KYC:</strong> Click <span className="px-2 py-0.5 rounded bg-white text-indigo-900 font-bold border border-indigo-200">Copy Prompt Text</span> at the bottom of the KYCB page.
                    </li>
                    <li>
                      <strong>2. Copy a Prompt Template:</strong> Go to the <strong>Prompt Generator</strong>, pick any template, and copy its prompt text.
                    </li>
                    <li>
                      <strong>3. Copy & Combine:</strong> Click <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold">Copy Instructional Prompt</span> below, paste all 3 parts into your AI chatbot, and run it!
                    </li>
                  </ol>
                </div>

                {/* Prompt Preview Box */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Instructional Blueprint Text
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Auto-swaps all brand & business details into your template
                    </span>
                  </div>
                  <pre className="p-4 bg-slate-950 text-slate-200 rounded-2xl text-xs font-mono leading-relaxed whitespace-pre-wrap border border-slate-800 select-all max-h-64 overflow-y-auto">
{INSTRUCTIONAL_PROMPT_TEXT}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowInstructionalModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCopyInstructionalPrompt}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-950/20 transition-all cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-amber-300" />
                  {instructionalCopied ? 'Instructional Prompt Copied! ✓' : 'Copy Instructional Prompt'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
}