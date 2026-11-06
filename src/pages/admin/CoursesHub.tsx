import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import CustomDropdown from '../../components/CustomDropdown';
import CoursesAdmin from './CoursesAdmin';
import AdvancedCoursesAdmin from './AdvancedCoursesAdmin';

const TIER_OPTIONS = [
  { value: '/admin', label: 'Beginner Courses' },
  { value: '/admin/advanced-courses', label: 'Advanced Courses' },
  { value: '/admin/masterclass-courses', label: 'Masterclass Courses' },
];

// One Courses section: a tier dropdown (Beginner / Advanced / Masterclass) that
// switches the course list, instead of three separate nav entries.
export default function CoursesHub() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tier = pathname.startsWith('/admin/masterclass-courses')
    ? '/admin/masterclass-courses'
    : pathname.startsWith('/admin/advanced-courses')
      ? '/admin/advanced-courses'
      : '/admin';

  return (
    <div>
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Courses</span>
          <div className="w-60">
            <CustomDropdown
              options={TIER_OPTIONS}
              value={tier}
              onChange={(v) => navigate(v)}
              placeholder="Select tier"
              theme="light"
            />
          </div>
        </div>
      </div>
      {tier === '/admin'
        ? <CoursesAdmin />
        : <AdvancedCoursesAdmin tier={tier === '/admin/masterclass-courses' ? 'masterclass' : 'advanced'} />}
    </div>
  );
}
