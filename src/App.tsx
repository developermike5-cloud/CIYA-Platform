import { BrowserRouter, Routes, Route } from 'react-router';
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
import Onboarding from './pages/Onboarding';
import WaitingOnboarding from './pages/WaitingOnboarding';
import GetStarted from './pages/GetStarted';
export default function App() {
  return (
    <BrowserRouter>
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
          <Route path="courses/new" element={<CourseEdit />} />
          <Route path="courses/:courseId" element={<CourseEdit />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
