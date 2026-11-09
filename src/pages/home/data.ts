/* Landing page copy ported from design/landing/ciya-landing.html (the prototype
   is the source of truth for look and behaviour). Student result cards are the
   prototype's marked placeholders: replace with real students, with their
   permission, before launch. */

export type TrackId = 'landing' | 'ecommerce' | 'portfolio';

export const TRACK_LABELS: Record<TrackId, string> = {
  landing: 'Landing Page Creation',
  ecommerce: 'E-commerce Website Creation',
  portfolio: 'Portfolio Website Creation',
};

export const TRACK_SHORT: Record<TrackId, string> = {
  landing: 'Landing page',
  ecommerce: 'Online store',
  portfolio: 'Portfolio',
};

/** Filter chip labels for the student results section. */
export const RESULT_FILTERS: { id: 'all' | TrackId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'landing', label: 'Landing pages' },
  { id: 'ecommerce', label: 'Online stores' },
  { id: 'portfolio', label: 'Portfolios' },
];

export interface StudentWin {
  track: TrackId;
  name: string;
  city: string;
  title: string;
  amount: number;
  week: number;
  ask: string;
  how: string;
  /** Real media when available; placeholders render until then. */
  photo?: string;
  sitePreview?: string;
}

export const STUDENT_WINS: StudentWin[] = [
  {
    track: 'landing',
    name: 'Adaeze O.',
    city: 'Awka, Anambra',
    title: 'Order page for a local bakery',
    amount: 60000,
    week: 3,
    ask: 'A single page where customers see the menu and order on WhatsApp.',
    how: 'Built the page in one evening with the Day 3 prompt, then fixed the buttons for small phones before sending the link to the owner.',
  },
  {
    track: 'ecommerce',
    name: 'Musa D.',
    city: 'Kaduna',
    title: 'Online store for his own shop',
    amount: 120000,
    week: 4,
    ask: 'A catalogue site with prices and a checkout through WhatsApp.',
    how: 'Used the Advanced client-work steps to scope it, quote it and ship it in two milestones.',
  },
  {
    track: 'portfolio',
    name: 'Chinedu O.',
    city: 'Port Harcourt, Rivers',
    title: 'Portfolio for a freelance designer',
    amount: 80000,
    week: 5,
    ask: 'A portfolio with case studies and a contact form that sends inquiries.',
    how: 'Wrote each case study as a short story, then added an inquiry form and a downloadable CV.',
  },
  {
    track: 'landing',
    name: 'Halima S.',
    city: 'Kano',
    title: 'Registration page for a school open day',
    amount: 45000,
    week: 3,
    ask: 'A page that collects parent sign-ups for the open day.',
    how: 'Used a lead capture form and a clear date block, then shared the link in parent groups.',
  },
];

export const VALUES_CARDS: { icon: 'bulb' | 'gift' | 'compass' | 'wallet'; title: string; text: string }[] = [
  { icon: 'bulb', title: 'Learn by Doing', text: 'Practical, hands-on training that gets you results within 5 days.' },
  { icon: 'gift', title: 'Free to Begin', text: 'Beginner courses are completely free. No barriers to entry.' },
  { icon: 'compass', title: 'Next-Gen Tech', text: 'Forget difficult coding. Let smart tools do the heavy lifting while you create.' },
  { icon: 'wallet', title: 'Earn or Save', text: 'Use your skills to save money or charge clients for services.' },
];

export const HOW_STEPS: { title: string; text: string; mediaSpec: string; media?: string }[] = [
  {
    title: 'Pick Your Creator Track',
    text: 'Choose between Landing Pages, E-commerce Stores, and Portfolio Websites. Start with the free beginner course, no commitment needed.',
    mediaSpec: 'Image · 4:5 portrait · at least 800x1000 · Student choosing a course track on a phone',
  },
  {
    title: 'Join the 5-Day Training',
    text: "Attend daily live or recorded sessions with practical exercises. Each day builds on the last. By day 5 you'll have a real website live to show.",
    mediaSpec: 'Image · 4:5 portrait · at least 800x1000 · Live class or screen-share training session',
  },
  {
    title: 'Apply or Advance',
    text: 'Use the beginner skills to save money or start up. When ready, upgrade to Advanced or Masterclass to unlock professional-grade client potential.',
    mediaSpec: 'Image · 4:5 portrait · at least 800x1000 · Student proudly showing a finished website',
  },
];

export const WHY_CARDS: { icon: 'gift' | 'zap' | 'case'; title: string; text: string }[] = [
  { icon: 'gift', title: 'Free Entry, Zero Barriers', text: "The beginner course is completely free. You shouldn't have to pay to start learning skills that can change your life." },
  { icon: 'zap', title: '5 Days. Real Results.', text: "We don't waste your time. In 5 focused days, you'll complete a real project and have a skill you can use immediately." },
  { icon: 'case', title: 'Create Your Own Job', text: "Don't wait for employment. Build a freelance career or business around skills that companies and clients genuinely pay for." },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: 'Do I need to know how to code?',
    a: 'No. You learn to direct AI tools with clear instructions. Smart tools handle the technical work while you focus on creating and delivering results.',
  },
  {
    q: 'What does it cost?',
    a: 'Beginner courses are 100% free. Advanced is ₦15,000 and Masterclass is ₦30,000, each as a 5-day course.',
  },
  {
    q: 'Which tracks can I join?',
    a: 'Landing Page Creation, E-commerce Website Creation and Portfolio Website Creation. Each one has Beginner, Advanced and Masterclass levels.',
  },
  {
    q: 'How do I earn from what I learn?',
    a: 'Beginner skills help you launch your own site and save money. Advanced and Masterclass teach you to find, price and deliver client projects, so you can offer websites as a service.',
  },
  {
    q: 'When does the next cohort start?',
    a: 'Cohort 4 is coming. Join the WhatsApp community to get launch updates as soon as dates are announced.',
  },
];

export const WHATSAPP_URL = 'https://chat.whatsapp.com/BzyYP0DyV2TFRqzfrrCXYi?s=cl&p=a&mlu=3';

export const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');

/** Course demo clip per track, reused from the live site's existing media. */
export const COURSE_DEMO_VIDEO: Record<TrackId, string | undefined> = {
  landing: 'https://res.cloudinary.com/qgvszym1/video/upload/a79c48c3e64b87dd05785e11a7bbfd24_xtpnvp.mp4',
  ecommerce: 'https://res.cloudinary.com/qgvszym1/video/upload/5b233e180530fcf94134bfed78e2c49d_720w_gqclim.mp4',
  portfolio: 'https://res.cloudinary.com/qgvszym1/video/upload/704f7970e09360476c34e5b8dd6a1239_720w_hkdauz.mp4',
};

/** Faded website sample shown behind the Courses section per track. No real screenshots yet. */
export const COURSE_BG_SRC: Record<TrackId, string | undefined> = {
  landing: undefined,
  ecommerce: undefined,
  portfolio: undefined,
};
