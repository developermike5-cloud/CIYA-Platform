import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router';
import { ChevronLeft, Globe, Film, Palette, Sparkles, Check, Info, ArrowRight } from 'lucide-react';

export default function GetStarted() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'web' | 'film' | 'image'>('web');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const webTypes = [
    { title: 'Landing Pages', meaning: 'A standalone web page created specifically for a marketing or advertising campaign.', uses: 'Lead generation, sales funnels, webinar registrations, product launches.', businesses: 'Course creators, marketers, event organizers, startups.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=a79c48c3e64b87dd05785e11a7bbfd24_xtpnvp' },
    { title: 'E-commerce Stores', meaning: 'A virtual storefront where businesses can sell products or services online.', uses: 'Online retail, dropshipping, subscription services, digital products.', businesses: 'Fashion brands, retailers, creators, direct-to-consumer startups.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=5b233e180530fcf94134bfed78e2c49d_720w_gqclim' },
    { title: 'Portfolio Websites', meaning: 'A personal website showcasing an individual\'s work, skills, and experience.', uses: 'Displaying projects, sharing case studies, personal branding.', businesses: 'Freelancers, consultants, artists, photographers, developers.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=704f7970e09360476c34e5b8dd6a1239_720w_hkdauz' },
    { title: 'Business Websites', meaning: 'A comprehensive site representing a company\'s brand, services, and contact info.', uses: 'Establishing credibility, providing info, client inquiries.', businesses: 'Consultants, agencies, corporate firms, local service businesses.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=e354a38f14d9cf824f2b4a73a11ad45c_t4_qvqj5r' }
  ];

  const filmTypes = [
    { title: 'Social Media Videos', meaning: 'Short-form content optimized for platforms like TikTok, Instagram, and Shorts.', uses: 'Viral marketing, brand awareness, engagement, trends.', businesses: 'Content creators, influencers, consumer brands, agencies.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=7bee2ea0eabdda3d8b25f88bb5cac243_720w_igzzgc' },
    { title: 'Commercial/Product Ads', meaning: 'Promotional videos designed to sell a specific product or service.', uses: 'Paid advertising, social media campaigns, product launches.', businesses: 'E-commerce stores, SaaS companies, real estate, physical product brands.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=5a34fc982d2847355b768f97774966a7_720w_kd1iw5' },
    { title: 'YouTube Content', meaning: 'Long-form educational, entertaining, or documentary-style videos.', uses: 'Community building, deep-dive tutorials, vlogging, monetization.', businesses: 'Educators, entertainers, thought leaders, media companies.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=c5495e4e04d349539fe97a193db66b92_720w_ntvzus' },
    { title: 'Cinematic Storytelling', meaning: 'High-quality, narrative-driven videos with movie-like aesthetics.', uses: 'Brand films, short films, music videos, emotional storytelling.', businesses: 'Luxury brands, filmmakers, travel agencies, musicians.', src: 'https://player.cloudinary.com/embed/?cloud_name=di4dlnd5x&public_id=d8e7b4c4d2c6d301fe8368f0d083c8e4_720w_ls2fk3' }
  ];

  const imageTypes = [
    { title: 'Flyers & Ads', meaning: 'Single-page promotional graphics for events, sales, or campaigns.', uses: 'Digital marketing, printed promotions, event awareness.', businesses: 'Event organizers, restaurants, retail stores, local businesses.', src: 'https://res.cloudinary.com/di4dlnd5x/image/upload/v1779199753/Clothing_Ad_Flyer_Design_d7wwr7.jpg' },
    { title: 'Logos & Branding', meaning: 'The foundational visual identity and marks that represent a company.', uses: 'Establishing brand recognition, trust, and professional appearance.', businesses: 'Startups, rebranding companies, freelancers, agencies.', src: 'https://res.cloudinary.com/di4dlnd5x/image/upload/v1779199775/Brand_Identity_-_Marketing_Agency_q3fhwf.jpg' },
    { title: 'Social Media Graphics', meaning: 'Visual content like carousels, posts, and banners tailored for social platforms.', uses: 'Audience engagement, sharing tips, announcements, community building.', businesses: 'Coaches, influencers, B2B companies, non-profits.', src: 'https://res.cloudinary.com/di4dlnd5x/image/upload/v1779199790/New_Month_Flyer_November_iypfck.jpg' },
    { title: 'Product Mockups', meaning: 'The user interface design outlining how digital products look and feel.', uses: 'Prototyping apps, redesigning websites, improving user experience.', businesses: 'Tech startups, software companies, digital agencies, entrepreneurs.', src: 'https://res.cloudinary.com/di4dlnd5x/image/upload/v1779199740/Clear_Ledger_jvkytv.jpg' }
  ];

  const getActiveArray = () => {
    if (activeTab === 'web') return webTypes;
    if (activeTab === 'film') return filmTypes;
    return imageTypes;
  };

  const handleTabChange = (tab: 'web' | 'film' | 'image') => {
    setActiveTab(tab);
    setExpandedIndex(0); // reset expanded selection
  };

  const currentItems = getActiveArray();

  return (
    <div className="min-h-screen bg-teal-950 font-sans text-teal-50 selection:bg-amber-400/30 selection:text-amber-200 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-teal-950/80 backdrop-blur-md border-b border-teal-900 px-6 py-4 flex items-center justify-between shrink-0">
        <Link to="/" className="flex items-center gap-2 text-teal-300 hover:text-teal-50 transition-colors text-sm font-semibold">
          <ChevronLeft className="w-5 h-5" /> Back to Home
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-gradient-to-tr from-amber-400 to-orange-500 rounded shadow"></div>
          <span className="font-extrabold text-sm tracking-widest text-teal-50 uppercase">CIYA ACADEMY</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col gap-10">
        {/* Intro */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-900/60 border border-teal-800 text-xs font-semibold text-amber-400 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            CIYA Digital Skill Showcase
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Explore the Digital Skills You Will Master
          </h1>
          <p className="text-teal-200/90 text-sm md:text-base leading-relaxed">
            Click through the pathways below to preview beautiful, practical deliverables including e-commerce platforms, video campaigns, and high-impact design projects.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex justify-center border-b border-teal-900 pb-2">
          <div className="bg-teal-900/40 p-1.5 rounded-full flex gap-1 border border-teal-800">
            <button
              onClick={() => handleTabChange('web')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs md:text-sm font-bold transition-all ${
                activeTab === 'web'
                  ? 'bg-amber-500 text-teal-950 shadow-md'
                  : 'text-teal-200 hover:text-white hover:bg-teal-800/35'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>AI Website Building</span>
            </button>
            <button
              onClick={() => handleTabChange('film')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs md:text-sm font-bold transition-all ${
                activeTab === 'film'
                  ? 'bg-amber-500 text-teal-950 shadow-md'
                  : 'text-teal-200 hover:text-white hover:bg-teal-800/35'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>AI Film Studio</span>
            </button>
            <button
              onClick={() => handleTabChange('image')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs md:text-sm font-bold transition-all ${
                activeTab === 'image'
                  ? 'bg-amber-500 text-teal-950 shadow-md'
                  : 'text-teal-200 hover:text-white hover:bg-teal-800/35'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>AI Image Engineering</span>
            </button>
          </div>
        </div>

        {/* Interactive Accordion + Visual Previews */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Accordion list */}
          <div className="md:col-span-5 space-y-4 flex flex-col">
            <h3 className="text-xs font-bold text-teal-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Choose a Type to Preview
            </h3>
            {currentItems.map((opt, i) => {
              const works = expandedIndex === i;
              return (
                <button
                  key={opt.title + i}
                  onClick={() => setExpandedIndex(i)}
                  className={`w-full p-5 text-left rounded-2xl border-2 transition-all flex items-center justify-between gap-4 ${
                    works
                      ? 'border-amber-500 bg-teal-900/60 text-white shadow-lg shadow-amber-550/5'
                      : 'border-teal-800 hover:border-teal-700 bg-teal-900/20 text-teal-200 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                      works ? 'bg-amber-500 text-teal-950' : 'bg-teal-900 text-teal-300'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="font-extrabold text-base md:text-lg block tracking-tight">{opt.title}</span>
                  </div>
                  <ArrowRight className={`w-4 h-4 transition-transform ${works ? 'rotate-90 md:rotate-0 text-amber-400' : 'text-teal-500'}`} />
                </button>
              );
            })}
          </div>

          {/* Expanded Card Details + Media Showcase */}
          <div className="md:col-span-7 bg-teal-900/40 border border-teal-800/80 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col min-h-[460px]">
            <AnimatePresence mode="wait">
              {expandedIndex !== null && currentItems[expandedIndex] && (
                <motion.div
                  key={currentItems[expandedIndex].title}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex-1 flex flex-col gap-6"
                >
                  {/* Title */}
                  <h4 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    {currentItems[expandedIndex].title}
                  </h4>

                  {/* Visual Asset Container */}
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-teal-800 bg-teal-950 shadow-inner flex items-center justify-center">
                    {currentItems[expandedIndex].src ? (
                      activeTab === 'image' ? (
                        <img
                          src={currentItems[expandedIndex].src}
                          alt={currentItems[expandedIndex].title}
                          className="w-full h-full object-cover object-center"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        currentItems[expandedIndex].src.includes('player.cloudinary.com/embed') ? (
                          <iframe
                            src={`${currentItems[expandedIndex].src}&autoplay=true&loop=true&muted=true&player[controls]=false&player[showLogo]=false&player[showPlayButton]=false`}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            allow="autoplay; fullscreen; encrypted-media"
                            className="absolute inset-0 w-full h-full pointer-events-none"
                          />
                        ) : (
                          <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            disablePictureInPicture
                            className="w-full h-full object-cover pointer-events-none"
                          >
                            <source src={currentItems[expandedIndex].src} />
                          </video>
                        )
                      )
                    ) : (
                      <div className="flex flex-col items-center text-teal-400 p-6">
                        <Info className="w-10 h-10 mb-2" />
                        <span className="text-xs font-bold">Showcase asset loading...</span>
                      </div>
                    )}
                  </div>

                  {/* Informational Breakdown */}
                  <div className="space-y-4 text-sm mt-2 flex-grow">
                    <div className="bg-teal-950/40 p-4 border border-teal-800/40 rounded-xl">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 block mb-1">What It Is</span>
                      <p className="text-teal-50 text-sm md:text-base font-semibold leading-relaxed">
                        {currentItems[expandedIndex].meaning}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-teal-950/40 p-4 border border-teal-800/40 rounded-xl">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 block mb-1">Ideal Uses & Intent</span>
                        <p className="text-teal-50 text-sm md:text-base font-semibold leading-relaxed">
                          {currentItems[expandedIndex].uses}
                        </p>
                      </div>
                      <div className="bg-teal-950/40 p-4 border border-teal-800/40 rounded-xl">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 block mb-1">Businesses Needing This</span>
                        <p className="text-teal-50 text-sm md:text-base font-semibold leading-relaxed">
                          {currentItems[expandedIndex].businesses}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Global WhatsApp Community Section */}
        <div className="bg-gradient-to-br from-teal-900 to-indigo-950 border border-teal-800 rounded-3xl p-8 md:p-12 text-center shadow-xl relative overflow-hidden mt-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] -z-10 rounded-full" />
          <div className="relative z-10 max-w-xl mx-auto space-y-6">
            <h2 className="text-2xl md:text-3.5xl font-extrabold text-white tracking-tight leading-tight">
              Ready to Save Money or Earn Income? 🚀
            </h2>
            <p className="text-teal-200 text-sm md:text-base leading-relaxed">
              Join thousands of other passionate students in our official offline community support community. Access exclusive starter checklists, direct help, and coordinate when cohorts are released.
            </p>
            
            <div className="pt-2">
              <a
                href="https://chat.whatsapp.com/BzyYP0DyV2TFRqzfrrCXYi?s=cl&p=a&mlu=3"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-3.5 px-8 py-4 bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-lg rounded-full shadow-lg shadow-green-500/25 transition-all hover:-translate-y-1"
              >
                {/* Official WhatsApp Logo SVG */}
                <svg className="w-6 h-6 fill-white shrink-0" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.729-1.458L0 24zm6.59-4.846c1.6.95 3.1 1.45 4.8 1.45 5.5 0 10-4.5 10-10s-4.5-10-10-10C6.9 1 2.3 5.5 2.3 11c0 1.9.5 3.7 1.5 5.3l-.98 3.56 3.65-.96zm12.33-7.53c-.34-.17-2.03-1-2.34-1.1-.3-.1-.53-.17-.76.17-.23.34-.88 1.1-.1.82a.85.85 0 0 0-.25-.6c-.2-.17-.8-.42-1.5-.7-2.65-1.15-4.42-3.8-4.55-4-.14-.17-1.18-1.57-1.18-3a3 3 0 0 1 1-2.2c.23-.23.5-.3.67-.3H10c.17 0 .42.06.64.3c.25.26 1 2.37 1.1 2.55.1.18.1.36-.02.6-.1.2-.24.44-.36.58l-.4.43c-.15.15-.3.32-.1.66.2.34.88 1.44 1.88 2.33.63.56 1.16.8 1.5.94.33.14.53.1.72-.1l1.1-1.3c.25-.3.5-.25.85-.12s2.2 1 2.6 1.2c.38.18.63.26.7.38.1.18.1 1-.25 2.1z"/>
                </svg>
                <span>Join Our WhatsApp Community</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Mini Footer */}
      <footer className="border-t border-teal-900 py-6 text-center text-teal-400 text-xs shrink-0 mt-auto">
        &copy; 2026 Create It Yourself Academy (CIYA). All rights reserved.
      </footer>
    </div>
  );
}
