import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router';
import { useEffect } from 'react';
import Home from './pages/Home';
import StudentDashboard from './pages/StudentDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import CoursesAdmin from './pages/admin/CoursesAdmin';
import CourseEdit from './pages/admin/CourseEdit';
import UsersAdmin from './pages/admin/UsersAdmin';
import AdminKycbQuestionnaire from './pages/admin/AdminKycbQuestionnaire';
import PromptsAdmin from './pages/admin/PromptsAdmin';
import AssignmentsAdmin from './pages/admin/AssignmentsAdmin';
import NotificationsAdmin from './pages/admin/NotificationsAdmin';
import PortalLocksAdmin from './pages/admin/PortalLocksAdmin';
import BlogAdmin from './pages/admin/BlogAdmin';
import Onboarding from './pages/Onboarding';
import WaitingOnboarding from './pages/WaitingOnboarding';
import GetStarted from './pages/GetStarted';
import { BrandedAlertContainer } from './components/BrandedAlert';

function NavigationTracker() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Only attempt to restore the last visited path ONCE per browser session (tab)
    const hasRestored = sessionStorage.getItem('ciya_initial_path_restored');
    if (hasRestored === 'true') {
      return;
    }
    
    // Mark as restored immediately so it never runs again during this session
    sessionStorage.setItem('ciya_initial_path_restored', 'true');

    // ONLY restore if the user initially landed on the root page '/'
    const isRootPath = window.location.pathname === '/' || window.location.pathname === '';
    if (!isRootPath) {
      return;
    }

    const savedPath = localStorage.getItem('ciya_last_visited_path');
    const currentPath = window.location.pathname + window.location.search;
    
    if (savedPath && savedPath !== currentPath) {
      // Loop protection: check if we've recently redirected to this path and got bounced back
      const lastRedirectTime = localStorage.getItem('ciya_last_redirect_time');
      const lastRedirectPath = localStorage.getItem('ciya_last_redirect_path');
      const now = Date.now();
      
      if (lastRedirectPath === savedPath && lastRedirectTime && (now - parseInt(lastRedirectTime, 10) < 3000)) {
        console.warn("Redirect loop detected for path:", savedPath, ". Clearing saved path to prevent freezing.");
        localStorage.removeItem('ciya_last_visited_path');
        localStorage.removeItem('ciya_last_redirect_path');
        localStorage.removeItem('ciya_last_redirect_time');
        return;
      }
      
      // Save redirect attempt details for loop detection
      localStorage.setItem('ciya_last_redirect_path', savedPath);
      localStorage.setItem('ciya_last_redirect_time', now.toString());
      
      // Only restore protected routes if we actually have a cached user session
      const isProtected = savedPath.startsWith('/admin') || savedPath.startsWith('/dashboard');
      const hasCachedUser = localStorage.getItem('ciya_cached_user');
      
      if (isProtected && !hasCachedUser) {
        // Do not auto-redirect guest users to protected pages
        localStorage.removeItem('ciya_last_visited_path');
        return;
      }
      
      navigate(savedPath, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (location.pathname) {
      const fullPath = location.pathname + location.search;
      localStorage.setItem('ciya_last_visited_path', fullPath);
    }
  }, [location]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <NavigationTracker />
      <BrandedAlertContainer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/waitingonboarding" element={<WaitingOnboarding />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<CoursesAdmin />} />
          <Route path="users" element={<UsersAdmin />} />
          <Route path="kycb" element={<AdminKycbQuestionnaire />} />
          <Route path="prompts" element={<PromptsAdmin />} />
          <Route path="assignments" element={<AssignmentsAdmin />} />
          <Route path="notifications" element={<NotificationsAdmin />} />
          <Route path="locks" element={<PortalLocksAdmin />} />
          <Route path="blog" element={<BlogAdmin />} />
          <Route path="courses/new" element={<CourseEdit />} />
          <Route path="courses/:courseId" element={<CourseEdit />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
