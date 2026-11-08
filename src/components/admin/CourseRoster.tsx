import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Course, UserProfile } from '../../types';
import { coursesStore } from '../../utils/coursesStore';
import { Search, Users, GraduationCap, Target, Trophy, BookOpen } from 'lucide-react';
import SlideOver from './SlideOver';

export function relDate(v: any): string {
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

export function tierChip(tier: string): { label: string; cls: string } {
  const t = (tier || '').toLowerCase();
  if (t === 'masterclass') return { label: 'Masterclass', cls: 'bg-amber-100 text-amber-800' };
  if (t === 'advanced') return { label: 'Advanced', cls: 'bg-violet-100 text-violet-800' };
  return { label: 'Beginner', cls: 'bg-teal-100 text-teal-800' };
}

export interface Row {
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

// The student roster for one course: loading, search, table and the
// per-student details panel. Used by both the dedicated roster page and the
// course table's Students slide-in.
export default function CourseRoster({
  courseId,
  course: courseIn,
  showHeader = true,
}: {
  courseId: string;
  course?: Course | null;
  showHeader?: boolean;
}) {
  const [course, setCourse] = useState<Course | null>(courseIn || null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [search, setSearch] = useState('');
  const [detailRow, setDetailRow] = useState<Row | null>(null);

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
          const inMain = !!p[courseId];
          const inClone = !!(expressClone && p[expressClone.id]);
          const inReg = reg.includes(courseId) || !!(expressClone && reg.includes(expressClone.id));
          if (!inMain && !inClone && !inReg) continue;

          const cid = inMain ? courseId : (expressClone ? expressClone.id : courseId);
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
    <div>
      {showHeader && (
        <div className="flex items-center gap-3 flex-wrap mb-5">
          <Users className="w-6 h-6 text-slate-400" />
          <h1 className="text-xl font-black text-slate-900">Students</h1>
          <span className="text-sm font-bold text-slate-500 truncate max-w-md">{course?.title || courseId}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${chip.cls}`}>{chip.label}</span>
          <span className="text-xs font-bold text-slate-400">{rows ? `${rows.length} enrolled` : 'loading…'}</span>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
          {rows ? `${rows.length} enrolled` : ''}
        </span>
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
                      <button
                        type="button"
                        onClick={() => setDetailRow(r)}
                        title="View full student details"
                        className="text-left font-extrabold text-sm text-indigo-700 hover:text-indigo-900 hover:underline underline-offset-2 cursor-pointer transition-colors"
                      >
                        {u.fullName || u.displayName || 'Student'}
                      </button>
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

      {detailRow && (() => {
        const du: any = detailRow.user;
        const stat = (label: string, value: React.ReactNode, icon?: React.ReactNode) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
              {icon}{label}
            </div>
            <div className="mt-1 text-sm font-bold text-slate-800">{value}</div>
          </div>
        );
        const field = (label: string, value: React.ReactNode) => (
          <div key={label} className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide shrink-0">{label}</span>
            <span className="text-xs font-bold text-slate-800 text-right break-words min-w-0">{value || '-'}</span>
          </div>
        );
        return (
          <SlideOver
            open={!!detailRow}
            onClose={() => setDetailRow(null)}
            title={du.fullName || du.displayName || 'Student'}
            subtitle={du.email || ''}
            maxWidth="max-w-md"
          >
            {/* Overview strip */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {stat('Progress', `${detailRow.pct}%`, <GraduationCap className="w-3 h-3" />)}
              {stat('Lessons watched', `${detailRow.watched}/${detailRow.totalVideos}`, <BookOpen className="w-3 h-3" />)}
              {stat('Assignments', `${detailRow.attempted}/${detailRow.totalAssignments}`, <Target className="w-3 h-3" />)}
              {stat('Days done', detailRow.totalDays ? `${detailRow.daysDone}/${detailRow.totalDays}` : '-', <Trophy className="w-3 h-3" />)}
            </div>

            {/* Progress bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Course progress</div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${detailRow.pct}%` }} />
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1 text-xs font-bold text-slate-600">
                <div>Currently on: <span className="text-slate-900">{detailRow.position}</span></div>
                {detailRow.completedAt && <div className="text-emerald-600">Course finished {relDate(detailRow.completedAt)}</div>}
                <div className="text-slate-400">Last activity: {relDate(detailRow.lastActivity)}</div>
              </div>
            </div>

            {/* Profile details */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Student details</div>
              {field('Email', du.email)}
              {field('Phone', du.phone || du.whatsapp)}
              {field('Cohort', du.cohort)}
              {field('Gender', du.gender)}
              {field('Location', du.state)}
              {field('Experience', du.experience)}
              {field('Joined', du.createdAt ? relDate(du.createdAt) : null)}
              {field('Status', du.approvalStatus || 'Pending')}
            </div>

            {/* Paid tier */}
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Paid tier</div>
              {detailRow.paidCourses.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {detailRow.paidCourses.map((pc, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-800">{pc}</span>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-300">Not enrolled in any paid course</span>
              )}
            </div>
          </SlideOver>
        );
      })()}
    </div>
  );
}
