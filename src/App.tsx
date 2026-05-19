import { BrowserRouter, Routes, Route } from 'react-router';
import Home from './pages/Home';
import StudentDashboard from './pages/StudentDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import CoursesAdmin from './pages/admin/CoursesAdmin';
import CourseEdit from './pages/admin/CourseEdit';
import UsersAdmin from './pages/admin/UsersAdmin';
import Onboarding from './pages/Onboarding';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<CoursesAdmin />} />
          <Route path="users" element={<UsersAdmin />} />
          <Route path="courses/new" element={<CourseEdit />} />
          <Route path="courses/:courseId" element={<CourseEdit />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
