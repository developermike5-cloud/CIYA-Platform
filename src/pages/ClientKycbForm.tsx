import React, { useState, useEffect } from 'react';
import { Download, Globe, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import LpQuestionnaireForm from '../components/LpQuestionnaireForm';
import EcQuestionnaireForm from '../components/EcQuestionnaireForm';
import PortfolioQuestionnaireForm from '../components/PortfolioQuestionnaireForm';

export default function ClientKycbForm() {
  const [activeTab, setActiveTab] = useState<'lp' | 'ec' | 'portfolio'>('lp');
  const [formTitle, setFormTitle] = useState('Website Requirement Questionnaire');
  const [studentName, setStudentName] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Perspective helper for forms (forcing client perspective)
  const viewPerspective = 'client';

  // Form Metadata
  const [clientName, setClientName] = useState('');
  const [dateCompleted, setDateCompleted] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
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

  // Onboarding Requirements
  const [hasSocialMediaAsked, setHasSocialMediaAsked] = useState<string>('');
  const [hasCustomIndustryOption, setHasCustomIndustryOption] = useState<boolean>(false);

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

  // Extract URL queries
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get('type');
    const titleParam = params.get('title');
    const studentParam = params.get('student');

    if (typeParam === 'lp' || typeParam === 'ec' || typeParam === 'portfolio') {
      setActiveTab(typeParam);
    }
    if (titleParam) {
      setFormTitle(titleParam);
    }
    if (studentParam) {
      setStudentName(studentParam);
    }
  }, []);

  // Props helper functions
  const toggleMultiSelect = (item: string, list: string[], setList: any) => {
    if (list.includes(item)) {
      setList(list.filter(x => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const addArrayItem = (list: string[], setList: any) => setList([...list, '']);
  
  const updateArrayItem = (idx: number, val: string, list: string[], setList: any) => {
    const next = [...list];
    next[idx] = val;
    setList(next);
  };

  const removeArrayItem = (idx: number, list: string[], setList: any) => {
    if (list.length > 1) {
      setList(list.filter((_, i) => i !== idx));
    }
  };

  const generatePromptText = () => {
    let text = `========================================================================\n`;
    text += `       ${formTitle.toUpperCase()}\n`;
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
    text += `- Social Media links: ${hasSocialMediaAsked === 'yes' ? socialLinks.filter(Boolean).join(', ') : 'None'}\n`;
    if (studentName) {
      text += `- Requested By / Developer: ${studentName}\n`;
    }
    text += `\n`;

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
    text += `    END OF SPECIFICATION. GENERATED ON ${new Date().toLocaleDateString()}\n`;
    text += `========================================================================\n`;
    return text;
  };

  const handleDownload = () => {
    const text = generatePromptText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanFileName = (businessName || clientName || 'onboarding_brief').toLowerCase().replace(/\s+/g, '_');
    link.download = `${cleanFileName}_website_requirements.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 5000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 md:px-8 font-sans antialiased text-slate-800" id="kycb-client-portal-wrapper">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* White-Label Professional Header */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 text-center space-y-4 shadow-sm relative overflow-hidden" id="kycb-client-header">
          <div className="absolute top-0 left-0 w-2 h-full bg-teal-500" />
          
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700">
              <Globe className="w-3.5 h-3.5" /> Client Onboarding Portal
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {formTitle}
            </h1>
            <p className="text-sm text-slate-500 max-w-xl mx-auto font-medium leading-relaxed">
              Please take a few moments to provide your business and design specifications below. 
              {studentName && <> This questionnaire has been requested by <strong className="text-slate-800">{studentName}</strong> to help build your perfect website.</>}
            </p>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-left max-w-2xl mx-auto">
            <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <FileText className="w-4 h-4 text-amber-600" /> Instructions for Submission
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed font-semibold">
              Fill out each section below as accurately as possible. When you are done, click the <strong>"Download Completed Answers"</strong> button at the very bottom of this page. This will download a structured text file containing all your inputs. Simply forward or email that file to your developer to initiate your website build!
            </p>
          </div>
        </div>

        {/* Dynamic Questionnaire Selection */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-8" id="kycb-client-form-body">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-2">Selected Form Profile</h3>
            <div className="inline-flex bg-slate-100 p-1 rounded-xl">
              <span className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'lp' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                Landing Page
              </span>
              <span className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'ec' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                eCommerce Store
              </span>
              <span className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'portfolio' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                Portfolio Website
              </span>
            </div>
          </div>

          {/* Form Content */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Client Name / Representative <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={clientName} 
                  onChange={e => setClientName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Date Completed</label>
                <input 
                  type="date" 
                  value={dateCompleted} 
                  onChange={e => setDateCompleted(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 font-semibold text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Business Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={businessName} 
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. Swift Route Supply Co."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Industry / Niche</label>
                <input 
                  type="text" 
                  value={industry} 
                  onChange={e => setIndustry(e.target.value)}
                  placeholder="e.g. Logistics & Delivery"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +234 812 554 8811"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. info@business.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 font-semibold"
                />
              </div>
              <div className="md:col-span-2 col-span-1">
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Business / Operational Address</label>
                <input 
                  type="text" 
                  value={address} 
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 font-semibold"
                />
              </div>
            </div>

            {/* Custom inner sections depending on type */}
            {activeTab === 'lp' && (
              <LpQuestionnaireForm
                viewPerspective={viewPerspective}
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
                hasImages={hasImages}
                setHasImages={setHasImages}
                hasVideos={hasVideos}
                setHasVideos={setHasVideos}
                hasTestimonials={hasTestimonials}
                setHasTestimonials={setHasTestimonials}
                sectionsToInclude={sectionsToInclude}
                setSectionsToInclude={setSectionsToInclude}
                displayPricing={displayPricing}
                setDisplayPricing={setDisplayPricing}
                pricingRanges={pricingRanges}
                setPricingRanges={setPricingRanges}
                pricingDetail={pricingDetail}
                setPricingDetail={setPricingDetail}
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
            )}

            {activeTab === 'ec' && (
              <EcQuestionnaireForm
                viewPerspective={viewPerspective}
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
                
                ecommerceType={ecommerceType}
                setEcommerceType={setEcommerceType}
                hasInventory={hasInventory}
                setHasInventory={setHasInventory}
                inventoryLocation={inventoryLocation}
                setInventoryLocation={setInventoryLocation}
                genderFocus={genderFocus}
                setGenderFocus={setGenderFocus}
                incomeLevel={incomeLevel}
                setIncomeLevel={setIncomeLevel}
                productInterests={productInterests}
                setProductInterests={setProductInterests}
                mainProducts={mainProducts}
                setMainProducts={setMainProducts}
                productCards={productCards}
                setProductCards={setProductCards}
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
                ecWebsiteStyle={ecWebsiteStyle}
                setEcWebsiteStyle={setEcWebsiteStyle}
                ecPages={ecPages}
                setEcPages={setEcPages}
                ecMarketingHelp={ecMarketingHelp}
                setEcMarketingHelp={setEcMarketingHelp}

                toggleMultiSelect={toggleMultiSelect}
                updateArrayItem={updateArrayItem}
                removeArrayItem={removeArrayItem}
                addArrayItem={addArrayItem}
              />
            )}

            {activeTab === 'portfolio' && (
              <PortfolioQuestionnaireForm
                viewPerspective={viewPerspective}
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

          {/* Submission and Download Panel */}
          <div className="pt-8 border-t border-slate-100 flex flex-col items-center space-y-4 text-center">
            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-900 flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" /> Done Filling Out the Form?
              </h4>
              <p className="text-xs text-slate-500 font-semibold max-w-md mx-auto">
                No database login or account required. Click below to securely download your compiled requirements as a text brief. Then, forward it directly to your developer!
              </p>
            </div>

            {downloadSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                Answers Downloaded Successfully! Send it to your Developer! 🎉
              </div>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="px-8 py-4 bg-teal-600 hover:bg-teal-700 hover:scale-[1.01] text-white text-sm font-black uppercase tracking-widest rounded-2xl cursor-pointer shadow-md shadow-teal-600/10 active:scale-95 transition-all duration-150 flex items-center gap-3 select-none"
            >
              <Download className="w-5 h-5" /> Download Completed Answers (TXT)
            </button>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="text-center text-[10px] text-slate-400 font-extrabold tracking-widest uppercase pb-10">
          🛡️ CIYA Guarded Academy Client Portal • White-Label Enabled
        </div>

      </div>
    </div>
  );
}
