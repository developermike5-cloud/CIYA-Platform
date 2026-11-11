import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { coursesStore } from '../utils/coursesStore';
import { Course } from '../types';
import { uploadToCloudinary } from '../utils/cloudinary';
import { db } from '../firebase';
import { useIntakeRoute } from '../hooks/useIntakeRoute';

/** Bank details come from the admin's Settings & Portal Locks page. */
const BANK_DEFAULTS = {
  accountName: 'CIYA Academy International Ltd',
  accountNumber: '1023948576',
  bankName: 'United Bank for Africa (UBA)',
};

type Stage = 'pick' | 'preview' | 'details' | 'payment' | 'done';

const isPaidLevel = (c: Course) => {
  const level = (c.level || (c as any).tier || '').toString();
  const published = c.publish_status ? c.publish_status === 'Published' : (c as any).status !== 'draft';
  return /advanced|masterclass/i.test(level) && published && Number(c.price) > 0;
};

export default function PaidEnroll() {
  const navigate = useNavigate();
  const intakeRoute = useIntakeRoute();
  const [params] = useSearchParams();
  const courseParam = params.get('course') || '';
  const [stage, setStage] = useState<Stage>(courseParam ? 'preview' : 'pick');
  const [paidCourses, setPaidCourses] = useState<Course[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [bank, setBank] = useState(BANK_DEFAULTS);
  const [form, setForm] = useState({ fullName: '', email: '', whatsapp: '', state: '', ageRange: '', gender: '' });
  const [account, setAccount] = useState<{ uid: string; tempPassword?: string; ciyaCode?: string; emailQueued: boolean } | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const all = coursesStore.getCourses().filter(isPaidLevel);
      setPaidCourses(all);
      if (courseParam) {
        const hit = all.find((c) => (c.title || '').trim().toLowerCase() === decodeURIComponent(courseParam).trim().toLowerCase());
        if (hit) setCourse(hit);
      }
    } catch (e) {
      console.warn('paid course load failed:', e);
    }
  }, [courseParam]);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'app')).then((snap) => {
      const s: any = snap.exists() ? snap.data() : {};
      setBank({
        accountName: s?.advancedCourseSettings?.accountName || BANK_DEFAULTS.accountName,
        accountNumber: s?.advancedCourseSettings?.accountNumber || BANK_DEFAULTS.accountNumber,
        bankName: s?.advancedCourseSettings?.bankName || BANK_DEFAULTS.bankName,
      });
    }).catch(() => {});
  }, []);

  const price = useMemo(() => (course ? `₦${Number(course.price).toLocaleString()}` : ''), [course]);

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.fullName || !form.email || !form.whatsapp || !form.state || !form.ageRange) {
      setError('Please fill every field marked required.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/.netlify/functions/onboarding-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, paid: true })
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || !data?.ok) {
        setError(data?.error === 'email-exists'
          ? 'This email already has a CIYA account. Log in with it instead, or use another email.'
          : data?.error === 'intake-closed'
            ? 'Registration is currently closed. Please check back soon.'
            : 'Could not create your account. Please try again.');
        return;
      }
      setAccount({ uid: data.uid, tempPassword: data.tempPassword, ciyaCode: data.ciyaCode, emailQueued: !!data.emailQueued });
      setStage('payment');
    } catch (err) {
      console.error(err);
      setError('Network problem. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitProof = async () => {
    if (!account || !course) return;
    if (!proof) { setError('Attach the payment confirmation screenshot first.'); return; }
    setError(null);
    setBusy(true);
    try {
      const up = await uploadToCloudinary(proof, 'ciya-payments', undefined, account.uid);
      // Sign the fresh account in so its own profile can be updated.
      const key = (import.meta as any).env?.VITE_FIREBASE_API_KEY;
      const si = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), password: account.tempPassword, returnSecureToken: true })
      }).then((r) => r.json());
      if (!si?.idToken) throw new Error('sign-in failed');
      const userDoc = doc(db, 'users', account.uid);
      await setDoc(userDoc, {
        paidCourseRequest: {
          courseId: course.id, courseTitle: course.title, amount: Number(course.price),
          screenshotUrl: up.url, status: 'PendingApproval',
        },
        paidCourseRequestStatus: 'PendingApproval',
        paidCourseRequestDate: serverTimestamp(),
        paidCourseRequestedCourseId: course.id,
      }, { merge: true });
      setStage('done');
    } catch (err) {
      console.error(err);
      setError('Could not submit your payment proof. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const card = 'bg-teal-900/40 border border-teal-800/80 rounded-3xl p-6 md:p-8 shadow-2xl';
  const input = 'w-full bg-teal-950/60 border border-teal-800 text-teal-50 rounded-xl py-3 px-4 text-sm font-semibold outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-teal-500';

  return (
    <div className="min-h-screen bg-teal-950 text-teal-50 flex flex-col">
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-10 space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-teal-300 hover:text-teal-50 transition-colors text-sm font-semibold">← Back to CIYA</Link>

        {stage === 'pick' && (
          <div className={card + ' space-y-4'}>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Choose Your Paid Course</h1>
            {paidCourses.length === 0 && <p className="text-teal-300 text-sm font-semibold">No paid courses are open for enrollment right now. Check back soon.</p>}
            <div className="space-y-3">
              {paidCourses.map((c) => (
                <button key={c.id} onClick={() => { setCourse(c); setStage('preview'); }}
                  className="w-full text-left bg-teal-950/60 border border-teal-800 rounded-2xl p-4 hover:border-amber-500 transition-all cursor-pointer flex items-center justify-between gap-4">
                  <span>
                    <span className="font-extrabold text-white text-base md:text-lg block">{c.title}</span>
                    <span className="text-teal-300 text-xs font-bold uppercase tracking-wider">{(c as any).level || (c as any).tier}</span>
                  </span>
                  <span className="text-amber-400 font-black whitespace-nowrap">₦{Number(c.price).toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === 'preview' && course && (
          <div className={card + ' space-y-4'}>
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">Course Preview</span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{course.title}</h1>
            <p className="text-teal-100 text-sm md:text-base leading-relaxed font-semibold">{course.description}</p>
            <ul className="list-none m-0 p-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(course.days || []).slice(0, 6).map((d, i) => (
                <li key={i} className="flex gap-2 items-start text-sm font-medium text-teal-50">✅ {d.title || `Day ${i + 1}`}</li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-teal-800 pt-4">
              <span className="text-amber-400 text-xl font-black">{price}</span>
              <button onClick={() => setStage('details')} className="px-8 py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-teal-950 text-sm font-black transition-all cursor-pointer">Continue</button>
            </div>
          </div>
        )}

        {stage === 'details' && (
          <form onSubmit={submitDetails} className={card + ' space-y-4'}>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Your Details</h1>
            <p className="text-teal-300 text-xs font-semibold">We use these to create your student account and email your login details.</p>
            {([['fullName', 'Full name *'], ['email', 'Email address *'], ['whatsapp', 'WhatsApp number *'], ['state', 'State *'], ['ageRange', 'Age range *'], ['gender', 'Gender']] as const).map(([k, label]) => (
              <input key={k} type="text" placeholder={label} value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={input} />
            ))}
            {error && <p className="text-xs font-bold text-rose-400">{error}</p>}
            <button type="submit" disabled={busy} className="w-full py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-teal-950 text-sm font-black transition-all cursor-pointer">
              {busy ? 'Creating your account...' : 'Create Account & Continue to Payment'}
            </button>
          </form>
        )}

        {stage === 'payment' && course && (
          <div className={card + ' space-y-5'}>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Make Your Payment</h1>
            <p className="text-teal-100 text-sm font-semibold leading-relaxed">
              Transfer <span className="text-amber-400 font-black">{price}</span> to the account below, then upload the payment confirmation screenshot. Your course unlocks as soon as the admin confirms it.
            </p>
            <div className="bg-teal-950/60 border border-teal-800 rounded-2xl p-5 space-y-2">
              {[['Bank', bank.bankName], ['Account name', bank.accountName], ['Account number', bank.accountNumber], ['Amount', price]].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center text-sm">
                  <span className="font-extrabold text-teal-400">{k}</span>
                  <span className="font-black text-white">{v}</span>
                </div>
              ))}
            </div>
            <label className="block text-xs font-black text-teal-300 uppercase tracking-wide">Payment confirmation screenshot *</label>
            <input type="file" accept="image/*" onChange={(e) => setProof(e.target.files?.[0] || null)}
              className="w-full bg-teal-950/60 border border-teal-800 text-teal-50 rounded-xl py-3 px-4 text-sm font-semibold file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-500 file:text-teal-950 file:font-black cursor-pointer" />
            {error && <p className="text-xs font-bold text-rose-400">{error}</p>}
            <button onClick={submitProof} disabled={busy} className="w-full py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-teal-950 text-sm font-black transition-all cursor-pointer">
              {busy ? 'Submitting...' : 'Submit Payment Proof'}
            </button>
          </div>
        )}

        {stage === 'done' && course && (
          <div className={card + ' space-y-5 text-center'}>
            <div className="mx-auto w-20 h-20 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center text-4xl shadow-md border border-amber-500/20">📱</div>
            <h1 className="text-2xl font-black text-white">Payment Proof Received</h1>
            <p className="text-teal-100 text-sm font-semibold leading-relaxed">
              The admin will confirm your <span className="font-black text-white">{course.title}</span> payment shortly. Your login details are on their way to <span className="font-black text-white">{form.email}</span>.
            </p>
            <div className="bg-teal-950/60 border border-teal-800 rounded-2xl p-5 text-left space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-amber-400">How to log in through the app</p>
              <p className="text-teal-100 text-sm font-semibold leading-relaxed">Install the CIYA app: open the CIYA site in your phone browser and choose "Add to Home Screen". All your learning happens inside the app.</p>
              <p className="text-teal-100 text-sm font-semibold leading-relaxed">Log in with your email and the temporary password we emailed you, then set your own password. Your unique CIYA access code unlocks your registered course.</p>
            </div>
            {account && !account.emailQueued && account.tempPassword && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-left space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-amber-400">Email delivery is temporarily unavailable, so here are your details</p>
                <p className="text-teal-50 text-sm font-bold">Email: {form.email}</p>
                <p className="text-teal-50 text-sm font-bold">Temporary password: <span className="font-mono">{account.tempPassword}</span></p>
                <p className="text-teal-50 text-sm font-bold">CIYA access code: <span className="font-mono">{account.ciyaCode}</span></p>
              </div>
            )}
            <a href="/?login=true" className="block w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl transition-all active:scale-95">Log in to the App</a>
            <p className="text-teal-400 text-xs font-semibold">Not now? <button onClick={() => navigate('/')} className="underline cursor-pointer">You can come back anytime</button> — or continue to the free beginner track at <button onClick={() => navigate(intakeRoute)} className="underline cursor-pointer">sign up</button>.</p>
          </div>
        )}
      </main>
      <footer className="border-t border-teal-900 py-6 text-center text-teal-400 text-xs shrink-0">© 2026 Create It Yourself Academy (CIYA). All rights reserved.</footer>
    </div>
  );
}
