import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Home, Compass, User as UserIcon, BookOpen, LogOut, Lock, Menu, X, CheckCircle, Edit3, Save, Clock, MessageCircle } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { useNavigate, Link } from 'react-router';
import { Course } from '../types';
import { motion } from 'motion/react';

export default function StudentDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [currentView, setCurrentView] = useState<'courses' | 'profile'>('courses');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email === 'developermike5@gmail.com') {
          navigate('/admin');
          return;
        }
        setCurrentUser(user);
        try {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          } else {
            alert('No profile found. Please complete the registration process.');
            navigate('/onboarding');
          }
        } catch (e: any) {
          console.error(e);
          if (e.message?.includes('offline') || e.code === 'unavailable') {
            alert('Network error: It seems you are offline. Please check your internet connection.');
          } else {
            alert('Error loading profile: ' + e.message);
          }
        }
        setAuthChecking(false);
      } else {
        navigate('/');
      }
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (userProfile && !userProfile.isActivated) {
      const creationTime = userProfile.createdAt?.toDate ? userProfile.createdAt.toDate().getTime() : (userProfile.createdAt ? new Date(userProfile.createdAt).getTime() : new Date().getTime());
      const targetTime = creationTime + 24 * 60 * 60 * 1000;
      
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetTime - now;
        
        if (distance < 0) {
          clearInterval(interval);
          setTimeLeft('EXPIRED');
          return;
        }
        
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [userProfile]);

  useEffect(() => {
    if (authChecking) return;
    const fetchCourses = async () => {
      try {
        const q = query(
          collection(db, 'courses'), 
          where('publish_status', '==', 'Published')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
        data.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        setCourses(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'courses');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [authChecking]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;
    setProfileSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        fullName: userProfile.fullName,
        whatsapp: userProfile.whatsapp,
        state: userProfile.state,
        goal: userProfile.goal,
      });
      setEditingProfile(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error(error);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (authChecking) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">Loading...</div>;
  if (!userProfile) return null;

  const categories = Array.from(new Set(courses.map(c => c.category).filter(Boolean)));
  const approvalStatus = userProfile?.approvalStatus || 'Pending';
  const isApproved = approvalStatus === 'Approved';
  const isPending = approvalStatus === 'Pending';
  const isDisapproved = approvalStatus === 'Disapproved';
  const isLockedOut = false;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar background overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`w-64 bg-blue-900 border-r border-blue-800 flex flex-col fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex flex-col gap-1 relative">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-lg shadow-lg shadow-orange-500/20 shrink-0"></div>
            <span className="font-bold text-xl md:text-2xl tracking-tight uppercase text-white">CIYA</span>
          </Link>
          <span className="text-[10px] font-semibold tracking-[0.2em] text-blue-300 uppercase leading-none mt-0.5">
            Academy
          </span>
          <button 
            className="absolute top-6 right-6 md:hidden text-blue-300 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4 text-sm font-medium">
          <button 
            onClick={() => { setCurrentView('courses'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${currentView === 'courses' ? 'bg-blue-800 text-white font-semibold' : 'text-blue-200 hover:bg-blue-800/50 hover:text-white'}`}
          >
            <Compass className="w-5 h-5" />
            Explore Courses
          </button>
          <button 
            onClick={() => { setCurrentView('profile'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${currentView === 'profile' ? 'bg-blue-800 text-white font-semibold' : 'text-blue-200 hover:bg-blue-800/50 hover:text-white'}`}
          >
            <UserIcon className="w-5 h-5" />
            Profile
          </button>
        </nav>

        <div className="p-4 border-t border-blue-800 mb-2">
          <p className="text-xs font-medium text-blue-300 px-4 mb-2 truncate">
            {currentUser?.email}
          </p>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-sm font-medium text-blue-200 hover:bg-red-500 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-stretch h-screen overflow-hidden">
        <header className="h-16 md:h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 md:px-10 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden text-slate-500 hover:text-slate-700" 
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">
              {currentView === 'courses' ? 'Dashboard' : 'My Profile'}
            </h2>
          </div>
          {/* Mobile nav placeholder */}
          <div className="flex items-center gap-4">
             <button onClick={handleLogout} className="text-sm font-medium text-slate-600">Sign out</button>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-6 md:p-10">
          {currentView === 'profile' ? (
            <div className="bg-white border text-sm border-slate-200 rounded-2xl p-6 md:p-10 max-w-2xl mx-auto shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800">Profile Settings</h3>
                {!editingProfile && (
                  <button onClick={() => setEditingProfile(true)} className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-bold bg-teal-50 px-4 py-2 rounded-full">
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </button>
                )}
              </div>
              
              {editingProfile ? (
                 <form onSubmit={handleProfileSave} className="space-y-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                      <input type="text" value={userProfile.fullName || ''} onChange={e => setUserProfile({...userProfile, fullName: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-slate-900 outline-none transition-all" required />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                      <input type="tel" value={userProfile.whatsapp || ''} onChange={e => setUserProfile({...userProfile, whatsapp: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-slate-900 outline-none transition-all" required />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">State</label>
                      <input type="text" value={userProfile.state || ''} onChange={e => setUserProfile({...userProfile, state: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-slate-900 outline-none transition-all" required />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Your Primary Goal</label>
                      <textarea value={userProfile.goal || ''} onChange={e => setUserProfile({...userProfile, goal: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-slate-900 outline-none transition-all min-h-[100px]" required />
                    </div>
                    <div className="flex gap-4 mt-6">
                      <button type="submit" disabled={profileSaving} className="flex-1 bg-teal-600 text-white font-bold py-3 rounded-lg hover:bg-teal-700 flex items-center justify-center gap-2">
                        {profileSaving ? 'Saving...' : <><Save className="w-4 h-4"/> Save Changes</>}
                      </button>
                      <button type="button" onClick={() => setEditingProfile(false)} disabled={profileSaving} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-lg hover:bg-slate-200">
                        Cancel
                      </button>
                    </div>
                 </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-slate-500 font-medium mb-1">Full Name</p>
                      <p className="text-slate-900 font-bold text-lg">{userProfile.fullName || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium mb-1">WhatsApp</p>
                      <p className="text-slate-900 font-bold text-lg">{userProfile.whatsapp || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium mb-1">State</p>
                      <p className="text-slate-900 font-bold text-lg">{userProfile.state || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium mb-1">Email</p>
                      <p className="text-slate-900 font-bold text-lg">{userProfile.email || currentUser?.email}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-slate-500 font-medium mb-1">My Goal</p>
                      <p className="text-slate-900 leading-relaxed bg-slate-50 p-4 rounded-lg mt-1">{userProfile.goal || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="sm:col-span-2 pt-6 border-t border-slate-100">
                    <SubmissionDetailsCard profile={userProfile} />
                  </div>
                </div>
              )}
            </div>
          ) : isPending ? (
            <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 border border-amber-100">
                  <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800 mb-4">Application Pending Review 📋</h2>
                
                <div className="text-slate-600 text-base md:text-lg mb-8 leading-relaxed max-w-xl space-y-4">
                  <p>
                    Hi <strong className="text-slate-800">{userProfile.fullName || 'Student'}</strong>! Thank you for applying. Your application is currently under processing review.
                  </p>
                  <p>
                    Please watch out for your email, as you will receive an email confirmation once you have been selected for the program. Make sure to check both your inbox and your spam/junk folder.
                  </p>
                </div>

                <div className="w-full mb-8">
                  <SubmissionDetailsCard profile={userProfile} />
                </div>

                <a href="https://chat.whatsapp.com/BzyYP0DyV2TFRqzfrrCXYi?s=cl&p=a&mlu=3" target="_blank" rel="noopener noreferrer" className="inline-flex px-8 py-4 bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold rounded-xl text-center shadow-lg shadow-green-500/20 hover:-translate-y-0.5 transition-all justify-center items-center gap-2.5 text-lg w-full sm:w-auto">
                   <MessageCircle className="w-6 h-6 fill-white stroke-none" /> Join Our WhatsApp Community
                </a>
              </div>
            </div>
          ) : isDisapproved ? (
            <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-150">
                  <X className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800 mb-4">Application Reviewed ❌</h2>
                
                <div className="text-slate-650 text-base md:text-lg mb-8 leading-relaxed max-w-lg space-y-4">
                  <p>
                    Hi <strong className="text-slate-850">{userProfile.fullName || 'Student'}</strong>!
                  </p>
                  <p>
                    We appreciate your interest in CIYA Academy. After careful consideration of your application profile, we regret to inform you that you have not been selected for this cohort.
                  </p>
                  <p className="text-sm text-slate-500">
                    We received a massive volume of entries and had to make challenging selections. We wish you the absolute best in your digital and tech journey.
                  </p>
                </div>

                <div className="w-full border-t border-slate-100 pt-6 mt-6">
                  <SubmissionDetailsCard profile={userProfile} />
                </div>
              </div>
            </div>
          ) : (
            <>
              {loading ? (
                <div className="flex items-center justify-center p-20">
                  <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                    <BookOpen className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Training begins on the 1st of June, 2026</h3>
                  <p className="text-slate-500">check back later.</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {categories.length > 0 ? categories.map(category => (
                    <div key={category || 'Uncategorized'}>
                      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        {category || 'Other Courses'}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {courses.filter(c => c.category === category).map(course => (
                          <CourseCard key={course.id} course={course} isLocked={isLockedOut} />
                        ))}
                      </div>
                    </div>
                  )) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {courses.map(course => (
                        <CourseCard key={course.id} course={course} isLocked={isLockedOut} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Hardcoded Informational Blocks */}
              <div className="mt-20 space-y-16">
                
                <section className="bg-white rounded-3xl p-8 md:p-10 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="p-3 bg-red-100 rounded-2xl">
                        <span className="text-2xl">🎬</span>
                     </div>
                     <h2 className="text-2xl font-bold text-slate-800">Types of Videos (By Use, Style & Industry Purpose)</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div>
                      <h3 className="font-extrabold text-slate-800 mb-4 text-emerald-700 tracking-tight">📢 Commercial & Business</h3>
                      <ul className="space-y-2 text-sm text-slate-600">
                        <li>Advertising & Marketing: Commercial Video, TV Commercial, Digital Ad, Social Media Ad, UGC Ad, Product Promo Video, Brand Film, Brand Story, Launch Video</li>
                        <li>Product & E-commerce: Product Demo, Product Showcase, Unboxing Video, Product Review, Tutorial, Amazon/Shopify Product Video</li>
                        <li>Corporate & Business: Corporate Video, Company Profile, Recruitment, Investor Pitch, Internal Comm., Training, Onboarding, Testimonial</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 mb-4 text-indigo-700 tracking-tight">📱 Social Media & Creators</h3>
                      <ul className="space-y-2 text-sm text-slate-600">
                        <li>Short-Form: TikTok Video, Instagram Reel, YouTube Short, Viral Edit, Meme Video, Trend Video, POV, Storytime, Reaction</li>
                        <li>Creator Economy: Faceless Video, Talking Head, AI Avatar Video, Podcast Clip, Motivational Video, Educational Reel, Vlog</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 mb-4 text-rose-700 tracking-tight">🎞️ Film & Cinematic</h3>
                      <ul className="space-y-2 text-sm text-slate-600">
                        <li>Narrative: Short/Feature/AI Film, Drama, Thriller, Sci-Fi, Romance, Comedy, Experimental</li>
                        <li>Cinematic Formats: Trailer, Teaser, Montage, Mood Film, Opening Sequence</li>
                        <li>Music & Ent: Music Video, Lyric Video, Concert Visual</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 mb-4 text-amber-700 tracking-tight">🧠 AI & Emerging Media</h3>
                      <ul className="space-y-2 text-sm text-slate-600">
                        <li>AI Generated Video, AI Avatar Video, Text-to-Video Film, Virtual Influencer, Synthetic Media, AI Cinematic Sequence</li>
                      </ul>
                    </div>
                    <div className="md:col-span-2">
                       <h3 className="font-extrabold text-slate-800 mb-4 text-sky-700 tracking-tight">🎨 Design & Animation</h3>
                       <ul className="space-y-2 text-sm text-slate-600 columns-1 sm:columns-2">
                         <li>2D/3D Animation</li>
                         <li>CGI Video</li>
                         <li>Motion Graphics</li>
                         <li>Kinetic Typography</li>
                         <li>Stop Motion</li>
                         <li>Anime/Cartoon Animation</li>
                         <li>Cinemagraph & Loop</li>
                       </ul>
                    </div>
                  </div>
                </section>

                <section className="bg-white rounded-3xl p-8 md:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-4 mb-8 relative z-10">
                     <div className="p-3 bg-purple-100 rounded-2xl">
                        <span className="text-2xl">🎨</span>
                     </div>
                     <h2 className="text-2xl font-bold text-slate-800">Types of Graphic Design</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                    <div className="bg-slate-50 p-5 rounded-2xl">
                       <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-widest text-pink-600">Marketing & Ads</h3>
                       <p className="text-xs text-slate-600 leading-relaxed">Ad Design, Social Media, Banner, Flyer, Poster, Billboard, Brochure, Email Marketing, Print Ad.</p>
                       <div className="mt-3 text-xs font-semibold text-slate-400">Outputs: IG Posts, FB Ads, Flyers</div>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl">
                       <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-widest text-orange-600">Branding</h3>
                       <p className="text-xs text-slate-600 leading-relaxed">Logo Design, Brand Identity, Corporate Identity, Brand Guidelines, Rebranding Design.</p>
                       <div className="mt-3 text-xs font-semibold text-slate-400">Outputs: Logos, Palettes, Typography</div>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl">
                       <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-widest text-teal-600">Digital & UI/UX</h3>
                       <p className="text-xs text-slate-600 leading-relaxed">UI Design, UX Design, Web Design, App Design, Dashboard, SaaS Interface, Wireframe Design.</p>
                       <div className="mt-3 text-xs font-semibold text-slate-400">Outputs: Web Layouts, Apps, UI Kits</div>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl">
                       <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-widest text-blue-600">Social & Creator</h3>
                       <p className="text-xs text-slate-600 leading-relaxed">Thumbnail Design, YT Banner, Stream Overlay, Podcast Cover, Carousel, Meme, Influencer Kit.</p>
                       <div className="mt-3 text-xs font-semibold text-slate-400">Outputs: Thumbnails, Carousels</div>
                    </div>
                  </div>
                </section>

                <section className="bg-slate-900 rounded-3xl p-8 md:p-10 text-white shadow-xl">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
                        <span className="text-2xl">🌐</span>
                     </div>
                     <h2 className="text-2xl font-bold text-white">Types of Websites</h2>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-8">
                     <div>
                       <div className="flex items-center gap-2 mb-2 font-bold text-amber-400">
                         <span>🛒</span> E-Commerce Websites
                       </div>
                       <p className="text-sm text-slate-300 leading-relaxed mb-3">Used for selling products or services online.</p>
                       <p className="text-xs text-slate-400 leading-relaxed">Types: Online Store, Shopify Store, Marketplace, Dropshipping, Subscription, Digital Product Store.</p>
                     </div>
                     <div>
                       <div className="flex items-center gap-2 mb-2 font-bold text-teal-400">
                         <span>📢</span> Business & Corporate
                       </div>
                       <p className="text-sm text-slate-300 leading-relaxed mb-3">Represent businesses and organizations online.</p>
                       <p className="text-xs text-slate-400 leading-relaxed">Types: Company Profile, Agency Website, Startup Website, SaaS Website, Consulting, Service-Based.</p>
                     </div>
                     <div>
                       <div className="flex items-center gap-2 mb-2 font-bold text-rose-400">
                         <span>🎯</span> Landing Pages
                       </div>
                       <p className="text-sm text-slate-300 leading-relaxed mb-3">Focused marketing and conversion.</p>
                       <p className="text-xs text-slate-400 leading-relaxed">Types: Sales Page, Funnel Page, Product Launch, Lead Capture, Webinar Reg, Waitlist Page.</p>
                     </div>
                     <div>
                       <div className="flex items-center gap-2 mb-2 font-bold text-yellow-400">
                         <span>👨‍🎨</span> Portfolio & Personal Brand
                       </div>
                       <p className="text-sm text-slate-300 leading-relaxed mb-3">Showcase skills, projects, or identity.</p>
                       <p className="text-xs text-slate-400 leading-relaxed">Types: Resume Website, Creative Portfolio, Photo/Art Portfolio, Personal Brand Website.</p>
                     </div>
                     <div>
                       <div className="flex items-center gap-2 mb-2 font-bold text-blue-400">
                         <span>📚</span> Educational & Learning
                       </div>
                       <p className="text-sm text-slate-300 leading-relaxed mb-3">Teaching, training, and learning platforms.</p>
                       <p className="text-xs text-slate-400 leading-relaxed">Types: E-learning, Online Course Platform, LMS, Tutorial Website, School/University Website.</p>
                     </div>
                     <div>
                       <div className="flex items-center gap-2 mb-2 font-bold text-indigo-400">
                         <span>👥</span> Community & Social
                       </div>
                       <p className="text-sm text-slate-300 leading-relaxed mb-3">Connect people and build communities.</p>
                       <p className="text-xs text-slate-400 leading-relaxed">Types: Social Media, Forum, Membership, Community Platform, Discussion Board.</p>
                     </div>
                  </div>
                </section>
                
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function CourseCard({ course, isLocked }: { course: Course, isLocked: boolean, key?: React.Key }) {
  return (
    <div className="group flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-teal-900/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
      <div className="relative aspect-video bg-slate-100 overflow-hidden">
        {course.thumbnail ? (
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-50 to-amber-50 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-teal-200" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="bg-white/90 backdrop-blur border border-slate-200 text-xs font-semibold px-2.5 py-1 rounded-full text-slate-700 shadow-sm">
            {course.level || 'Beginner'}
          </span>
        </div>
        {isLocked && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all opacity-0 group-hover:opacity-100">
            <Lock className="w-10 h-10 text-white drop-shadow-md" />
          </div>
        )}
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
        <h4 className="font-bold text-lg text-slate-800 mb-1 line-clamp-2 leading-tight group-hover:text-teal-700 transition-colors">
          {course.title}
        </h4>
        {course.subtitle && (
          <p className="text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed">
            {course.subtitle}
          </p>
        )}
        
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100">
          <span className="font-bold text-slate-900">
            {course.price ? `₦${course.price.toLocaleString()}` : 'Free'}
          </span>
          {isLocked ? (
             <button className="text-sm font-bold text-slate-400 bg-slate-100 flex items-center gap-1 px-4 py-1.5 rounded-full cursor-not-allowed">
               <Lock className="w-4 h-4" /> Locked
             </button>
           ) : (
             <button className="text-sm font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-4 py-1.5 rounded-full transition-colors">
               View
             </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmissionDetailsCard({ profile }: { profile: any }) {
  if (!profile) return null;
  return (
    <div className="w-full bg-slate-50/85 border border-slate-200 rounded-2xl p-6 text-left max-w-xl mx-auto mt-6">
      <h3 className="font-extrabold text-slate-800 mb-4 text-sm tracking-tight border-b border-slate-200 pb-2 uppercase text-[11px] tracking-wider text-indigo-750 flex items-center gap-2">
        <span>📋</span> Submitted Application Details
      </h3>
      <div className="space-y-4 text-xs md:text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Name</span>
            <span className="text-slate-800 font-semibold">{profile.fullName || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Gender</span>
            <span className="text-slate-800 font-semibold">{profile.gender || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">WhatsApp Number</span>
            <span className="text-slate-800 font-mono font-semibold">{profile.whatsapp || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">State of Residence</span>
            <span className="text-slate-800 font-semibold">{profile.state || '-'}</span>
          </div>
        </div>

        <div className="border-t border-slate-150 pt-3 space-y-3">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Recommended Study Program</span>
            <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded text-xs inline-block mt-0.5">
              {profile.recommendedPath || '-'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Path Selections</span>
            <span className="text-slate-800 font-semibold text-xs">
              {profile.courseType || ''} {profile.pathwaySelection ? `(${profile.pathwaySelection})` : ''}
            </span>
          </div>
          {profile.pathwayReason && (
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Reason for Selection</span>
              <p className="text-slate-650 italic mt-0.5 leading-relaxed font-semibold bg-white p-2 rounded border border-slate-150">{profile.pathwayReason}</p>
            </div>
          )}
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Prior Experience in Course</span>
            <span className="text-slate-800 font-semibold">{profile.pathwayExperience || profile.experience || 'None'}</span>
          </div>
          {profile.intent && (
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">What are you building CIYA Academy for?</span>
              <p className="text-slate-650 italic mt-0.5 leading-relaxed font-semibold bg-white p-2 rounded border border-slate-150">{profile.intent}</p>
            </div>
          )}
          {profile.goal && (
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Learning Goal</span>
              <p className="text-slate-650 italic mt-0.5 leading-relaxed font-semibold bg-white p-2 rounded border border-slate-150">{profile.goal}</p>
            </div>
          )}
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Commitment Level</span>
            <span className="text-slate-850 font-bold">{profile.availability || '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
