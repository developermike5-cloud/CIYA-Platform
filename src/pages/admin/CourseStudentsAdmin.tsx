import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Course, UserProfile } from '../../types';
import { coursesStore } from '../../utils/coursesStore';
import { Search, ArrowLeft, Users } from 'lucide-react';

function relDate(v: any): string {
  if (!v) return '-';
  try {
    const d = typeof v.toDate === 'function' ? v.toDate() : new Date(v);
    if (isNaN(d.getTime())) return '-';
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch {
    return '-';
  }
}

function tierChip(tier: string): { label: string; cls: string } {
  const t = (tier || '').toLowerCase();
  if (t === 'masterclass') return { label: 'Masterclass', cls: 'bg-amber-100 text-amber-800' };
  if (t === 'advanced') return { label: 'Advanced', cls: 'bg-violet-100 text-violet-800' };
  return { label: 'Beginner', cls: 'bg-teal-100 text-teal-800' };
}

interface Row {
  user: UserProfile;
  watched: number;
  totalVideos: number;
  pct: number;
  position: string;
  attempted: number;
  totalAssignments: number;
  daysDone: number;
  totalDays: number;
  completedAt: any;
  lastActivity: any;
  paidCourses: string[];
}

export default function CourseStudentsAdmin() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [search, setSearch] = useState('');

  // Course comes from the shared store (already loaded inside the admin area)
  useEffect(() => {
    const pick = () => {
      const c = coursesStore.getCourses().find((x) => x.id === courseId);
      if (c) setCourse(c);
    };
    pick();
    const unsub = coursesStore.subscribe(pick);
    return unsub;
  }, [courseId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        if (!alive) return;
        const users = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as UserProfile[];
        const all = coursesStore.getCourses();

        // An express clone of this course holds the student's progress instead
        const expressClone = all.find((c) => c.clonedFromId === courseId && c.isCloned && c.durationMode === 'express');

        const out: Row[] = [];
        for (const u of users) {
          const p: any = u.progress || {};
          const reg: string[] = Array.isArray(u.registeredCourses) ? u.registeredCourses : [];
          const inMain = !!p[courseId!];
          const inClone = !!(expressClone && p[expressClone.id]);
          const inReg = reg.includes(courseId!) || !!(expressClone && reg.includes(expressClone.id));
          if (!inMain && !inClone && !inReg) continue;

          const cid = inMain ? courseId! : (expressClone ? expressClone.id : courseId!);
          const pr = p[cid] || {};
          const watchedSet: Set<string> = new Set(Array.isArray(pr.watched) ? pr.watched : []);

          const days = ((course?.days || []) as any[]).slice().sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0));
          const videos = days.flatMap((d) => d.videos || []);
          const totalVideos = videos.length;
          let watched = videos.filter((v) => v.id && watchedSet.has(v.id)).length;
          if (watched === 0 && watchedSet.size > 0) watched = Math.min(watchedSet.size, totalVideos);

          let position = 'Completed';
          for (const d of days) {
            const notWatched = (d.videos || []).find((v) => v.id && !watchedSet.has(v.id));
            if (notWatched) { position = `Day ${d.dayNumber} · ${notWatched.title || 'lesson'}`; break; }
          }
          const daysDone = days.filter((d) => (d.videos || []).length > 0 && (d.videos || []).every((v) => v.id && watchedSet.has(v.id))).length;

          const attempted = Object.keys(pr.submissions || {}).length;
          const totalAssignments = days.filter((d) => d.assignment).length;

          // Has this student also bought a paid tier (any Advanced / Masterclass enrolment)?
          const paidCourses = all
            .filter((c) => {
              const t = ((c.tier || c.level || '') as string).toLowerCase();
              return t === 'advanced' || t === 'masterclass';
            })
            .filter((c) => !!p[c.id!] || reg.includes(c.id!))
            .map((c) => `${c.level || c.tier}: ${c.title}`)
            .slice(0, 3);

          out.push({
            user: u,
            watched,
            totalVideos,
            pct: totalVideos ? Math.round((watched / totalVideos) * 100) : 0,
            position,
            attempted,
            totalAssignments,
            daysDone,
            totalDays: days.length,
            completedAt: pr.completedAt,
            lastActivity: pr.updatedAt || pr.createdAt,
            paidCourses
          });
        }
        setRows(out);
      } catch (e) {
        console.error(e);
        setRows([]);
      }
    })();
    return () => { alive = false; };
  }, [courseId, course?.id]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const u: any = r.user;
      return (u.fullName || '').toLowerCase().includes(q)
        || (u.email || '').toLowerCase().includes(q)
        || (u.displayName || '').toLowerCase().includes(q);
    });
  }, [rows, search]);

  const chip = tierChip((course?.tier || course?.level || '') as string);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Courses
        </Link>
        <div className="flex items-center gap-3 flex-wrap mb-5">
          <Users className="w-6 h-6 text-slate-400" />
          <h1 className="text-xl font-black text-slate-900">Students</h1>
          <span className="text-sm font-bold text-slate-500 truncate max-w-md">{course?.title || courseId}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${chip.cls}`}>{chip.label}</span>
          <span className="text-xs font-bold text-slate-400">{rows ? `${rows.length} enrolled` : 'loading…'}</span>
        </div>

        <div className="relative mb-4 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80">
                <tr>
                  {['Student', 'Progress', 'Current position', 'Assignments', 'Milestones', 'Last activity', 'Paid tier'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((r) => {
                  const u: any = r.user;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-extrabold text-sm text-slate-800">{u.fullName || u.displayName || 'Student'}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{u.email || '-'}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${r.pct}%` }} />
                          </div>
                          <span className="text-xs font-black text-slate-700">{r.pct}%</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">{r.watched}/{r.totalVideos} lessons watched</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-slate-600">{r.position}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-slate-600">
                        {r.attempted}/{r.totalAssignments}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-slate-600">
                        {r.totalDays ? `${r.daysDone}/${r.totalDays} days` : '-'}
                        {r.completedAt && <span className="block text-[10px] text-emerald-600 font-bold">Finished {relDate(r.completedAt)}</span>}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-slate-600">{relDate(r.lastActivity)}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {r.paidCourses.length > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-800" title={r.paidCourses.join(', ')}>
                            Paid · {r.paidCourses.length}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 font-bold">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rows && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm font-bold text-slate-400">
                      {rows.length === 0 ? 'No students enrolled in this course yet.' : 'No students match that search.'}
                    </td>
                  </tr>
                )}
                {!rows && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm font-bold text-slate-400">Loading students…</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
