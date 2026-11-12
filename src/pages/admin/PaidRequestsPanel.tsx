import React, { useEffect, useState } from 'react';
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where, arrayUnion } from 'firebase/firestore';
import { coursesStore } from '../../utils/coursesStore';
import { auth, db } from '../../firebase';
import SlideOver from '../../components/admin/SlideOver';

/** Pending paid-course payment requests, filtered to one course tier. */
export default function PaidRequestsPanel({ tier = 'all' as 'all' | 'advanced' | 'masterclass' }) {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const matchesTier = (r: any) => {
    if (tier === 'all') return true;
    const c = coursesStore.getCourses().find((x: any) => x.id === (r.paidCourseRequestedCourseId || r.paidCourseRequest?.courseId));
    const level = String((c as any)?.level || (c as any)?.tier || '');
    return tier === 'masterclass' ? /masterclass/i.test(level) : (/advanced/i.test(level) && !/masterclass/i.test(level));
  };

  const load = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('paidCourseRequestStatus', '==', 'PendingApproval')));
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(matchesTier));
    } catch (e) {
      console.error('paid requests load failed:', e);
    }
  };

  useEffect(() => { load(); }, [tier]);

  const act = async (r: any, status: 'Approved' | 'Rejected') => {
    setBusy(r.id);
    setError(null);
    const courseId = r.paidCourseRequestedCourseId || r.paidCourseRequest?.courseId;
    const patch = status === 'Approved'
      ? { 'paidCourseRequest.status': 'Approved', paidCourseRequestStatus: 'Approved', paidCourseRequestApprovedAt: serverTimestamp(), registeredCourses: arrayUnion(courseId), advancedAllAccess: true }
      : { 'paidCourseRequest.status': 'Rejected', paidCourseRequestStatus: 'Rejected', paidCourseRequestReviewedAt: serverTimestamp() };
    try {
      await updateDoc(doc(db, 'users', r.id), patch);
      setRows((prev) => prev.filter((x) => x.id !== r.id));
      if (status === 'Approved') {
        // Approval fires the login-details email (server-side, ZeptoMail).
        try {
          const idToken = await auth.currentUser?.getIdToken();
          const res = await fetch('/.netlify/functions/paid-approve-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentUid: r.id, idToken }),
          });
          const data = await res.json().catch(() => ({} as any));
          if (!data?.queued) setError(`Approved, but the login email did not send${data?.reason ? ` (${data.reason})` : ''}.`);
        } catch {
          setError('Approved, but the login email did not send.');
        }
      }
    } catch (e) {
      console.error('paid request action failed:', e);
      setError('Could not save that. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  if (rows.length === 0) return null;

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-10">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-amber-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Pending payment approvals</h2>
          <button onClick={load} className="text-xs font-black text-indigo-600 underline cursor-pointer">Refresh</button>
        </div>
        {error && <p className="text-xs font-bold text-rose-600 mb-3">{error}</p>}
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer hover:border-amber-300 hover:bg-amber-50/40 transition-all"
              onClick={() => setDetail(r)}
              title="View full registration details">
              <div className="min-w-0 flex-1">
                <div className="font-black text-slate-900 text-sm truncate">{r.fullName || r.displayName || 'Student'}</div>
                <div className="text-xs text-slate-500 font-semibold truncate">{r.email || r.id}</div>
                <div className="text-xs text-slate-700 font-bold mt-1">
                  {r.paidCourseRequest?.courseTitle || r.paidCourseRequestedCourseId}
                  {r.paidCourseRequest?.amount ? <span className="text-amber-700"> · ₦{Number(r.paidCourseRequest.amount).toLocaleString()}</span> : null}
                  {r.paidCourseRequestDate ? <span className="text-slate-400 font-semibold"> · {new Date((r.paidCourseRequestDate as any).seconds ? (r.paidCourseRequestDate as any).seconds * 1000 : Date.now()).toLocaleDateString()}</span> : null}
                </div>
              </div>
              {r.paidCourseRequest?.screenshotUrl && (
                <a href={r.paidCourseRequest.screenshotUrl} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={r.paidCourseRequest.screenshotUrl} alt="Payment screenshot" className="h-20 w-28 object-cover rounded-lg border border-slate-200" />
                </a>
              )}
              <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button disabled={busy === r.id} onClick={() => act(r, 'Approved')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black cursor-pointer">
                  Approve &amp; Unlock
                </button>
                <button disabled={busy === r.id} onClick={() => act(r, 'Rejected')}
                  className="px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 disabled:opacity-50 text-rose-700 text-xs font-black cursor-pointer">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SlideOver
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? (detail.fullName || detail.displayName || 'Student') : ''}
        subtitle={detail ? (detail.email || detail.id) : ''}
        maxWidth="max-w-xl"
      >
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Full name', detail.fullName || detail.displayName],
                ['Email', detail.email],
                ['WhatsApp', detail.whatsapp],
                ['Cohort', detail.cohort],
                ['Gender', detail.gender],
                ['Age range', detail.ageRange],
                ['Education level', detail.educationLevel || detail.education],
                ['Learning tool', detail.learningTool],
                ['State', detail.state],
                ['Country', detail.country],
                ['CIYA code', detail.ciyaCode || detail.accessCode],
                ['Registered', detail.createdAt ? new Date((detail.createdAt as any).seconds ? (detail.createdAt as any).seconds * 1000 : (detail.createdAt as any)).toLocaleDateString() : null],
              ].filter(([, v]) => v != null && v !== '').map(([label, value]) => (
                <div key={label as string} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</div>
                  <div className="text-xs font-bold text-slate-800 break-words">{String(value)}</div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
              <div className="text-[9px] font-black uppercase tracking-widest text-amber-700">Payment request</div>
              <div className="text-xs font-bold text-slate-800">
                {detail.paidCourseRequest?.courseTitle || detail.paidCourseRequestedCourseId}
                {detail.paidCourseRequest?.amount ? <span> &middot; ₦{Number(detail.paidCourseRequest.amount).toLocaleString()}</span> : null}
              </div>
              <div className="text-[11px] font-semibold text-slate-600">
                Status: {detail.paidCourseRequestStatus || detail.paidCourseRequest?.status || 'PendingApproval'}
                {detail.paidCourseRequestDate ? ` · Submitted ${new Date((detail.paidCourseRequestDate as any).seconds ? (detail.paidCourseRequestDate as any).seconds * 1000 : Date.now()).toLocaleDateString()}` : ''}
              </div>
            </div>

            {detail.paidCourseRequest?.screenshotUrl && (
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Payment screenshot</div>
                <a href={detail.paidCourseRequest.screenshotUrl} target="_blank" rel="noreferrer">
                  <img src={detail.paidCourseRequest.screenshotUrl} alt="Payment proof" className="w-full rounded-xl border border-slate-200" />
                </a>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={busy === detail.id}
                onClick={() => { act(detail, 'Approved'); setDetail(null); }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black cursor-pointer"
              >
                Approve &amp; Unlock
              </button>
              <button
                type="button"
                disabled={busy === detail.id}
                onClick={() => { act(detail, 'Rejected'); setDetail(null); }}
                className="flex-1 py-2.5 rounded-xl bg-rose-100 hover:bg-rose-200 disabled:opacity-50 text-rose-700 text-xs font-black cursor-pointer"
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
