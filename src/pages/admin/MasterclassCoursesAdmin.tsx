import React from 'react';
import { Sparkles } from 'lucide-react';

// Masterclass has no courses yet: this page announces what is coming.
export default function MasterclassCoursesAdmin() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-amber-600" />
        </div>
        <span className="mt-4 inline-block text-[10px] bg-amber-100 text-amber-800 font-black px-3 py-1 rounded-full uppercase tracking-wider">
          Masterclass · Upcoming
        </span>
        <h2 className="mt-4 text-2xl font-black text-slate-900">Masterclass courses are coming soon</h2>
        <p className="mt-3 text-slate-500 leading-relaxed">
          No Masterclass courses have been published yet. As soon as the first one goes live, it will show up here, ready to manage.
        </p>
      </div>
    </div>
  );
}
