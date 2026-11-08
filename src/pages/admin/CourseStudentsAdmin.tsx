import React from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import CourseRoster from '../../components/admin/CourseRoster';

export default function CourseStudentsAdmin() {
  const { courseId } = useParams<{ courseId: string }>();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Courses
        </Link>
        {courseId ? (
          <CourseRoster courseId={courseId} />
        ) : (
          <p className="text-sm font-bold text-slate-400">Course not found.</p>
        )}
      </div>
    </div>
  );
}
