import React from 'react';
import SlideOver from './SlideOver';
import CourseRoster, { tierChip } from './CourseRoster';
import { Course } from '../../types';

// The course table's "Students" button opens the roster as a slide-in panel
// from the right, instead of navigating to a separate page.
export default function CourseRosterSlideover({
  open,
  onClose,
  course,
}: {
  open: boolean;
  onClose: () => void;
  course: Course | null;
}) {
  const chip = tierChip((course?.tier || course?.level || '') as string);
  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={course?.title || 'Students'}
      subtitle={open ? `Course roster · ${chip.label}` : ''}
      maxWidth="max-w-4xl"
    >
      {open && course?.id ? (
        <CourseRoster courseId={course.id} course={course} showHeader={false} />
      ) : (
        <div className="py-10 text-center text-sm font-bold text-slate-400">Loading students…</div>
      )}
    </SlideOver>
  );
}
