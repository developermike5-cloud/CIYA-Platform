import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { CreditCard, Globe, Plus, Trash2, Check, ArrowRight, Printer, Save, Smartphone, Sparkles, FolderLock, Copy, Download } from 'lucide-react';
import LpQuestionnaireForm from '../../components/LpQuestionnaireForm';
import EcQuestionnaireForm from '../../components/EcQuestionnaireForm';

interface SavedForm {
  id: string;
  clientName: string;
  dateCompleted: string;
  type: 'lp' | 'ec';
  businessName: string;
  createdAt: any;
  data: any;
}

export default function AdminKycbQuestionnaire() {
  const [activeTab, setActiveTab] = useState<'lp' | 'ec'>('lp');

  // Perspective helper function
  const qL = (clientText: string, freelancerText: string) => {
    return viewPerspective === 'client' ? clientText : freelancerText;
  };
  const [savedForms, setSavedForms] = useState<SavedForm[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form Metadata
  const [clientName, setClientName] = useState('');
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
    lpOfferPromo, lpOfferPromoDetail, lpWhyChoose, lpWhatMakesSpecial, lpWhatMakesSpecialDetail
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
  };

  const [copied, setCopied] = useState(false);

  const generatePromptText = () => {
    let text = `========================================================================\n`;
    text += `       CIYA - KNOW YOUR CLIENT & BUSINESS (KYCB) CONFIGURATION\n`;
    text += `========================================================================\n\n`;

    text += `[METADATA]\n`;
    text += `- Client Name: ${clientName || 'Not specified'}\n`;
    text += `- Date Completed: ${dateCompleted || 'Not specified'}\n`;
    text += `- Target Profile: ${activeTab === 'lp' ? 'LANDING PAGE' : 'ECOMMERCE WEBSITE'}\n`;
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
    } else {
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
  };

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
  }, []);

  // Autosave current draft whenever typing (with currentId === null)
  useEffect(() => {
    if (currentId) return; // do not overwrite draft when editing an existing questionnaire from db
    
    const snapshot = getFormSnapshot();
    if (activeTab === 'lp') {
      localStorage.setItem('kycb_draft_lp', JSON.stringify(snapshot));
    } else {
      localStorage.setItem('kycb_draft_ec', JSON.stringify(snapshot));
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
    ecProductDiff, ecProductDiffDetail, ecWebsiteStyle, ecPages, ecMarketingHelp
  ]);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const qSnap = await getDocs(query(collection(db, 'kycb_questionnaires'), orderBy('createdAt', 'desc')));
      const list = qSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedForm[];
      setSavedForms(list);
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
    setSaving(true);
    const docData = {
      clientName,
      dateCompleted,
      type: activeTab,
      businessName,
      createdAt: serverTimestamp(),
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
        lpWhatMakesSpecialDetail
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
        } else {
          localStorage.removeItem('kycb_draft_ec');
          setEcDraft(null);
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

  const handleTabToggle = (nextTab: 'lp' | 'ec') => {
    if (currentId) {
      setActiveTab(nextTab);
      return;
    }

    // Backup current state before switching
    const currentSnapshot = getFormSnapshot();
    if (activeTab === 'lp') {
      setLpDraft(currentSnapshot);
      localStorage.setItem('kycb_draft_lp', JSON.stringify(currentSnapshot));
    } else {
      setEcDraft(currentSnapshot);
      localStorage.setItem('kycb_draft_ec', JSON.stringify(currentSnapshot));
    }

    // Switch tab
    setActiveTab(nextTab);

    // Restore next tab's draft
    let targetDraft = nextTab === 'lp' ? lpDraft : ecDraft;
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
    <div className="flex flex-col lg:flex-row gap-6 p-1 md:p-4 text-slate-800">
      {/* Sidebar List of questionnaires */}
      <div className="w-full lg:w-72 bg-white rounded-2xl border border-slate-200 p-4 shrink-0 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center pb-2 border-b">
          <span className="font-extrabold text-sm text-slate-900 tracking-wider">SAVED KYCB FORMS</span>
          <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{savedForms.length}</span>
        </div>

        <button
          onClick={resetForm}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1A3C6E] text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-950/20 hover:bg-[#15325C] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          Create New Sheet
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
                    {form.type === 'lp' ? '✏️ LANDING PAGE' : '🛒 ECOMMERCE'}
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
      </div>

      {/* Main Questionnaire Canvas */}
      <div className={`flex-1 rounded-3xl border p-4 md:p-8 shadow-sm transition-all duration-300 ${
        activeTab === 'lp' 
          ? 'bg-[#FCFDFF] border-slate-200' 
          : 'bg-[#FCFAF3] border-amber-200/50 shadow-amber-900/[0.01]'
      }`}>
        <div className="text-center md:text-left border-b border-slate-100 pb-5 mb-6">
          <h1 className="text-xl md:text-2xl font-black text-[#1A3C6E] tracking-tight flex items-center justify-center md:justify-start gap-2">
            <span className="p-1 px-2.5 bg-[#1A3C6E] text-[#D4A017] rounded-xl text-sm font-black">KYCB</span>
            {qL("Know Your Client & Business", "Admin Portfolio Consulting Spec")}
          </h1>
          <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
            {qL("The ultimate design discovery & onboarding sheet", "Custom design parameters & commercial metrics tracker")}
          </p>
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

        {/* Dual Tab Controls */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => handleTabToggle('lp')}
            className={`flex-1 py-3 px-3 text-center rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'lp' ? 'bg-[#1A3C6E] text-[#D4A017] shadow' : 'text-slate-600 hover:text-slate-900 bg-transparent'
            }`}
          >
            ✏️ Landing Page Sections
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
          ) : (
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
          )}
        </div>

        {/* Global form controls */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border text-slate-700 rounded-xl text-xs font-black cursor-pointer shadow-sm transition-all"
            >
              <Copy className="w-4 h-4 text-slate-500" />
              {copied ? 'Copied to Clipboard!' : 'Copy Prompt Text'}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1A3C6E]/5 hover:bg-[#1A3C6E]/10 border border-[#1A3C6E]/20 text-[#1A3C6E] rounded-xl text-xs font-extrabold cursor-pointer shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-[#1A3C6E]" />
              Download Prompt File
            </button>
          </div>

          <div className="flex gap-2">
            {currentId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 border rounded-xl hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel Edit
              </button>
            )}

            <button
              type="button"
              onClick={resetFormDetails}
              className="px-4 py-2.5 border rounded-xl hover:bg-slate-50 text-xs font-black text-slate-600 transition-all cursor-pointer"
            >
              🧹 Clear draft inputs
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-950/10 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-emerald-300 animate-pulse" />
              {saving ? 'Saving...' : (currentId ? 'Apply Updates' : 'Sync & Save Cloud')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
