import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router';
import { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import Home from './pages/Home';
import StudentDashboard from './pages/StudentDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import CoursesAdmin from './pages/admin/CoursesAdmin';
import AdvancedCoursesAdmin from './pages/admin/AdvancedCoursesAdmin';
import CourseEdit from './pages/admin/CourseEdit';
import UsersAdmin from './pages/admin/UsersAdmin';
import AdminKycbQuestionnaire from './pages/admin/AdminKycbQuestionnaire';
import ClientKycbForm from './pages/ClientKycbForm';
import PromptsAdmin from './pages/admin/PromptsAdmin';
import AssignmentsAdmin from './pages/admin/AssignmentsAdmin';
import NotificationsAdmin from './pages/admin/NotificationsAdmin';
import PortalLocksAdmin from './pages/admin/PortalLocksAdmin';
import BlogAdmin from './pages/admin/BlogAdmin';
import LeaderboardAdmin from './pages/admin/LeaderboardAdmin';
import BuzzGroupsAdmin from './pages/admin/BuzzGroupsAdmin';
import Onboarding from './pages/Onboarding';
import WaitingOnboarding from './pages/WaitingOnboarding';
import GetStarted from './pages/GetStarted';
import PastCohortProjects from './pages/PastCohortProjects';
import { BrandedAlertContainer } from './components/BrandedAlert';
import { safeStorage } from './utils/safeStorage';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location.pathname);

  // Restore last visited path and handle deep links
  useEffect(() => {
    // Only attempt to restore the last visited path ONCE per browser session (tab)
    let hasRestored = 'false';
    try {
      hasRestored = sessionStorage.getItem('ciya_initial_path_restored') || 'false';
    } catch (e) {}

    if (hasRestored === 'true') return;
    
    // Mark as restored immediately
    try {
      sessionStorage.setItem('ciya_initial_path_restored', 'true');
    } catch (e) {}

    // ONLY restore if the user initially landed on the root page '/'
    const isRootPath = window.location.pathname === '/' || window.location.pathname === '';
    if (!isRootPath) return;

    const savedPath = safeStorage.getItem('ciya_last_visited_path');
    const currentPath = window.location.pathname + window.location.search;
    
    if (savedPath && savedPath !== currentPath) {
      const isProtected = savedPath.startsWith('/admin') || savedPath.startsWith('/dashboard');
      const hasCachedUser = safeStorage.getItem('ciya_cached_user');
      
      if (isProtected && !hasCachedUser) {
        safeStorage.removeItem('ciya_last_visited_path');
        return;
      }
      
      navigate(savedPath, { replace: true });
    }
  }, [navigate]);

  // Force login for PWA users
  useEffect(() => {
    const isRoot = location.pathname === '/';
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
    if (isRoot && isPWA) {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Sync last visited path for deep-linking support
  useEffect(() => {
    if (location.pathname) {
      const fullPath = location.pathname + location.search;
      safeStorage.setItem('ciya_last_visited_path', fullPath);
      locationRef.current = location.pathname;
    }
  }, [location]);

  // Handle system signal for settings sync
  useEffect(() => {
    let unsubSignal: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSignal) unsubSignal();
      if (user) {
        // Correct path is settings/system_signals to match the rest of the app logic
        const signalRef = doc(db, 'settings', 'system_signals');
        unsubSignal = onSnapshot(signalRef, () => {
          // System signal received - this triggers reactivity in listeners that depend on these timestamps
        }, (err) => {
          console.warn("Soft handling system signals listener error in App.tsx:", err);
        });
      }
    });
    return () => {
      unsubAuth();
      if (unsubSignal) unsubSignal();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30">
      <BrandedAlertContainer />
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/waitingonboarding" element={<WaitingOnboarding />} />
        <Route path="/projects" element={<PastCohortProjects />} />
        <Route path="/kycb" element={<ClientKycbForm />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<CoursesAdmin />} />
          <Route path="advanced-courses" element={<AdvancedCoursesAdmin />} />
          <Route path="course/:id" element={<CourseEdit />} />
          <Route path="users" element={<UsersAdmin />} />
          <Route path="kycb" element={<AdminKycbQuestionnaire />} />
          <Route path="prompts" element={<PromptsAdmin />} />
          <Route path="assignments" element={<AssignmentsAdmin />} />
          <Route path="notifications" element={<NotificationsAdmin />} />
          <Route path="locks" element={<PortalLocksAdmin />} />
          <Route path="blog" element={<BlogAdmin />} />
          <Route path="leaderboard" element={<LeaderboardAdmin />} />
          <Route path="groups" element={<BuzzGroupsAdmin />} />
          <Route path="courses/new" element={<CourseEdit />} />
          <Route path="courses/:courseId" element={<CourseEdit />} />
        </Route>
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
