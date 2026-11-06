import React from 'react';
import { useLocation } from 'react-router';
import CoursesAdmin from './CoursesAdmin';
import AdvancedCoursesAdmin from './AdvancedCoursesAdmin';

// Beginner and Advanced have their own dedicated course lists.
// Masterclass has no courses yet, so it lives on its own upcoming page.
export default function CoursesHub() {
  const { pathname } = useLocation();
  return pathname.startsWith('/admin/advanced-courses') ? (
    <AdvancedCoursesAdmin tier="advanced" />
  ) : (
    <CoursesAdmin />
  );
}
