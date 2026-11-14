import React, { useEffect, useMemo, useRef, useState } from 'react';
import InstallGuide from '../components/InstallGuide';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { coursesStore } from '../utils/coursesStore';
import { Course } from '../types';
import { uploadToCloudinary } from '../utils/cloudinary';
import { auth, db } from '../firebase';
import { NIGERIAN_STATES } from '../utils/nigerianStates';
import CustomDropdown from '../components/CustomDropdown';
import { safeStorage } from '../utils/safeStorage';
import { usePWAInstall } from '../hooks/usePWAInstall';

/** Bank details come from the admin's Settings & Portal Locks page. */
const BANK_DEFAULTS = {
  accountName: 'CIYA Academy International Ltd',
  accountNumber: '1023948576',
  bankName: 'United Bank for Africa (UBA)',
};

type Stage = 'pick' | 'preview' | 'details' | 'payment' | 'install';
const STAGE_ORDER: Stage[] = ['preview', 'details', 'payment', 'install'];
const STAGE_LABELS: Partial<Record<Stage, string>> = { preview: 'Preview', details: 'Details', payment: 'Payment', install: 'Install App' };
const DRAFT_KEY = 'ciya_paid_enroll_draft';

/** Admin WhatsApp number students message for payment confirmation. */
const ADMIN_WHATSAPP = '2349042544355';

const isPaidLevel = (c: Course) => {
  const level = (c.level || (c as any).tier || '').toString();
  const published = c.publish_status ? c.publish_status === 'Published' : (c as any).status !== 'draft';
  return /advanced|masterclass/i.test(level) && published && Number(c.price) > 0;
};

/** Steps with a connecting line that animates as the student moves through the flow. Completed steps are clickable to go back. */
function Stepper({ stage, onBack }: { stage: Stage; onBack?: (s: Stage) => void }) {
  if (stage === 'pick') return null;
  const current = STAGE_ORDER.indexOf(stage);
  return (
    <div className="flex items-center w-full max-w-xl mx-auto pt-2 pb-4" aria-label="Enrollment progress">
      {STAGE_ORDER.map((s, i) => {
        const canGoBack = !!onBack && i < current;
        const circle = (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all duration-500 ${i < current ? 'bg-amber-500 border-amber-500 text-teal-950' : i === current ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.45)]' : 'border-teal-800 text-teal-500 bg-teal-950/60'}`}>
            {i < current ? '✓' : i + 1}
          </div>
        );
        const label = <span className={`text-[10px] font-black uppercase tracking-wider ${i <= current ? 'text-amber-300' : 'text-teal-500'}`}>{STAGE_LABELS[s]}</span>;
        return (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              {canGoBack ? (
                <button type="button" title={`Back to ${STAGE_LABELS[s]}`} onClick={() => onBack!(s)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                  {circle}
                  {label}
                </button>
              ) : (
                <>
                  {circle}
                  {label}
                </>
              )}
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 rounded-full bg-teal-900 relative overflow-hidden mb-4 min-w-[24px]">
                <div className={`ciya-step-fill ${i < current ? 'ciya-step-done' : i === current ? 'ciya-step-active' : ''}`} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function PaidEnroll() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const courseParam = params.get('course') || '';
  const [stage, setStage] = useState<Stage>(courseParam ? 'preview' : 'pick');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  };
  const [paidCourses, setPaidCourses] = useState<Course[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [bank, setBank] = useState(BANK_DEFAULTS);
  const [form, setForm] = useState({ email: '', whatsapp: '', state: '', gender: '' });
  const [account, setAccount] = useState<{ uid: string; email?: string; tempPassword?: string; ciyaCode?: string; emailQueued: boolean } | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  /** Cloudinary URL once the proof is submitted: locks the whole flow read-only. */
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { isInstallable, isInstalled, isIOS, installApp } = usePWAInstall();
  const draftLoadedRef = useRef(false);

  useEffect(() => {
    try {
      const all = coursesStore.getCourses().filter(isPaidLevel);
      setPaidCourses(all);
      // Restore saved progress so a refresh or network drop never restarts the flow.
      try {
        const raw = safeStorage.getItem(DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d?.savedAt && Date.now() - Number(d.savedAt) > 7 * 24 * 60 * 60 * 1000) {
            safeStorage.removeItem(DRAFT_KEY);
            draftLoadedRef.current = true;
            return;
          }
          const savedStage: Stage = d?.stage;
          const savedCourse = d?.courseTitle
            ? all.find((c) => (c.title || '').trim().toLowerCase() === String(d.courseTitle).trim().toLowerCase())
            : null;
          if (savedCourse) setCourse(savedCourse);
          if (d?.form && typeof d.form === 'object') {
            setForm({ email: String(d.form.email || ''), whatsapp: String(d.form.whatsapp || ''), state: String(d.form.state || ''), gender: String(d.form.gender || '') });
          }
          if (d?.proofUrl && typeof d.proofUrl === 'string') setProofUrl(String(d.proofUrl));
          if (d?.account && d.account.uid) {
            setAccount({ uid: String(d.account.uid), email: d.account.email ? String(d.account.email).toLowerCase() : (d.form?.email ? String(d.form.email).toLowerCase() : undefined), tempPassword: d.account.tempPassword ? String(d.account.tempPassword) : undefined, ciyaCode: d.account.ciyaCode ? String(d.account.ciyaCode) : undefined, emailQueued: !!d.account.emailQueued });
          }
          if (savedStage && ['preview', 'details', 'payment', 'install'].includes(savedStage) && (savedCourse || courseParam)) {
            setStage(savedCourse ? savedStage : (savedStage === 'details' || savedStage === 'payment' ? 'details' : 'preview'));
          } else if (savedCourse && !courseParam) {
            setStage('preview');
          }
        }
      } catch (e) {
        console.warn('paid enroll draft restore failed:', e);
      }
      if (courseParam) {
        const hit = all.find((c) => (c.title || '').trim().toLowerCase() === decodeURIComponent(courseParam).trim().toLowerCase());
        if (hit) setCourse(hit);
      }
    } catch (e) {
      console.warn('paid course load failed:', e);
    }
    draftLoadedRef.current = true;
  }, [courseParam]);

  useEffect(() => {
    if (!draftLoadedRef.current) return;
    try {
      safeStorage.setItem(DRAFT_KEY, JSON.stringify({ stage, courseTitle: course?.title || '', form, account, proofUrl, savedAt: Date.now() }));
    } catch (e) { /* storage unavailable */ }
  }, [stage, course, form]);

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

  // The install stage is a resting point: the draft stays so a refresh
  // (or a lost student) lands right back on the install guide. Stale
  // drafts expire after 7 days on the next visit.

  const price = useMemo(() => (course ? `₦${Number(course.price).toLocaleString()}` : ''), [course]);
  const waMsg = encodeURIComponent(`Hello CIYA Admin, I just enrolled for ${course?.title || 'a paid course'} (${price}) and uploaded my payment proof. Please confirm my payment. My email: ${account?.email || form.email}`);

  const copyAccountNumber = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(bank.accountNumber || '');
      } else {
        const ta = document.createElement('textarea');
        ta.value = bank.accountNumber || '';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch (e) { /* clipboard unavailable */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (account && (!account.email || account.email === form.email.trim().toLowerCase())) { setStage('payment'); return; }
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { setError('Enter a valid email address.'); return; }
    if (!/^\d{11}$/.test(form.whatsapp.trim())) { setError('WhatsApp number must be exactly 11 digits.'); return; }
    if (!form.state) { setError('Select your state.'); return; }
    setBusy(true);
    try {
      const derivedName = form.email.trim().split('@')[0] || 'CIYA Student';
      const res = await fetch('/.netlify/functions/onboarding-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, fullName: derivedName, paid: true, courseTitle: course?.title || "" })
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
      setAccount({ uid: data.uid, email: form.email.trim().toLowerCase(), tempPassword: data.tempPassword, ciyaCode: data.ciyaCode, emailQueued: !!data.emailQueued });
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
    let step: 'upload' | 'sign-in' | 'save' = 'upload';
    try {
      const up = await uploadToCloudinary(proof, 'ciya-payments', undefined, account.uid);
      if (!up?.url) throw new Error('upload returned no url');
      setProofUrl(up.url);
      // Sign the fresh account in (SDK session) so Firestore rules accept its own profile update.
      step = 'sign-in';
      const si = await signInWithEmailAndPassword(auth, (account.email || form.email).trim().toLowerCase(), account.tempPassword);
      if (!si?.user?.uid) throw new Error('sign-in failed');
      step = 'save';
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
      showToast('Payment proof received. It will be confirmed shortly.');
      setStage('install');
      // The student stays signed out until the admin confirms payment: login
      // happens inside the CIYA app with the details emailed after approval.
      try { await signOut(auth); } catch { /* ignore */ }
    } catch (err) {
      console.error('submitProof failed at', step, err);
      const detail = err instanceof Error ? err.message : '';
      if (step === 'upload') {
        setError(`Could not upload your payment screenshot${detail ? ` (${detail})` : ''}. Check your connection and try again.`);
      } else if (step === 'sign-in') {
        setError(`Your screenshot uploaded, but we couldn't sign the account in${detail ? ` (${detail})` : ''}. Try again in a minute.`);
      } else {
        setError(`Your screenshot uploaded, but the request didn't save${detail ? ` (${detail})` : ''}. Try again in a minute.`);
      }
    } finally {
      setBusy(false);
    }
  };

  const card = 'bg-teal-900/40 border border-teal-800/80 rounded-3xl p-6 md:p-8 shadow-2xl';
  const input = 'w-full bg-teal-950/60 border border-teal-800 text-teal-50 rounded-xl py-3 px-4 text-sm font-semibold outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-teal-500';

  return (
    <div className="min-h-screen bg-teal-950 text-teal-50 flex flex-col">
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-10 space-y-6">
        {stage === 'install' ? (
          <button type="button" onClick={() => setStage('payment')} className="self-start inline-flex items-center gap-2 text-teal-300 hover:text-teal-50 transition-colors text-sm font-semibold cursor-pointer">← Back to payment</button>
        ) : (
          <Link to="/" className="inline-flex items-center gap-2 text-teal-300 hover:text-teal-50 transition-colors text-sm font-semibold">← Back to CIYA</Link>
        )}

        <Stepper stage={stage} onBack={stage === 'install' ? undefined : (s) => setStage(s)} />

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
            <button type="button" onClick={() => setStage('preview')} className="self-start w-fit text-teal-400 hover:text-amber-300 text-xs font-black uppercase tracking-wider cursor-pointer transition-colors">← Back</button>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Your Details</h1>
            <p className="text-teal-300 text-xs font-semibold">We use these to create your student account and email your login details.</p>
            {proofUrl && <p className="text-amber-300/90 text-xs font-semibold">Your details are locked. They were already submitted with your payment proof.</p>}
            <input type="email" placeholder="Email address *" value={form.email} readOnly={!!proofUrl} disabled={!!proofUrl} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input + (proofUrl ? ' opacity-70 cursor-not-allowed' : '')} />
            <input type="tel" inputMode="numeric" maxLength={11} placeholder="WhatsApp number *" value={form.whatsapp} readOnly={!!proofUrl} disabled={!!proofUrl}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 11) })} className={input + (proofUrl ? ' opacity-70 cursor-not-allowed' : '')} />
            {proofUrl ? (
              <>
                <input type="text" value={form.state || '—'} readOnly disabled className={input + ' opacity-70 cursor-not-allowed'} />
                <input type="text" value={form.gender || '—'} readOnly disabled className={input + ' opacity-70 cursor-not-allowed'} />
              </>
            ) : (
              <>
                <CustomDropdown
                  value={form.state}
                  onChange={(val) => setForm({ ...form, state: val })}
                  options={[{ label: 'Select State *', value: '' }, ...NIGERIAN_STATES.map((s) => ({ label: s, value: s }))]}
                  className="w-full"
                  theme="dark"
                />
                <CustomDropdown
                  value={form.gender}
                  onChange={(val) => setForm({ ...form, gender: val })}
                  options={[{ label: 'Gender', value: '' }, { label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }]}
                  className="w-full"
                  theme="dark"
                />
              </>
            )}
            {error && <p className="text-xs font-bold text-rose-400">{error}</p>}
            {proofUrl ? (
              <button type="button" onClick={() => setStage('payment')} className="w-full py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-teal-950 text-sm font-black transition-all cursor-pointer">
                Continue to Payment
              </button>
            ) : (
              <button type="submit" disabled={busy} className="w-full py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-teal-950 text-sm font-black transition-all cursor-pointer">
                {busy ? 'Creating your account...' : account && (!account.email || account.email === form.email.trim().toLowerCase()) ? 'Continue to Payment' : 'Create Account & Continue to Payment'}
              </button>
            )}
          </form>
        )}

        {stage === 'payment' && course && (
          <div className={card + ' space-y-5'}>
            <button type="button" onClick={() => setStage('details')} className="self-start w-fit text-teal-400 hover:text-amber-300 text-xs font-black uppercase tracking-wider cursor-pointer transition-colors">← Back</button>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Make Your Payment</h1>
            <p className="text-teal-100 text-sm font-semibold leading-relaxed">
              Transfer <span className="text-amber-400 font-black">{price}</span> to the account below, then upload the payment confirmation screenshot. Your course unlocks as soon as the admin confirms it.
            </p>
            {account?.email && <p className="text-teal-300 text-xs font-semibold">Paying as {account.email}.</p>}
            <div className="bg-teal-950/60 border border-teal-800 rounded-2xl p-5 space-y-2">
              {[['Bank', bank.bankName], ['Account name', bank.accountName], ['Account number', bank.accountNumber], ['Amount', price]].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center gap-2 text-sm">
                  <span className="font-extrabold text-teal-400">{k}</span>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="font-black text-white">{v}</span>
                    {k === 'Account number' && (
                      <button type="button" onClick={copyAccountNumber} aria-label="Copy account number"
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-teal-950 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0">
                        {copied ? 'Copied ✓' : 'Copy'}
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {proofUrl ? (
              <>
                <span className="inline-flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  <span aria-hidden="true">✓</span> Payment proof submitted — read only
                </span>
                <div className="w-full bg-teal-950/60 border border-teal-800 rounded-2xl p-3 flex items-start gap-4">
                  <img src={proofUrl} alt="Submitted payment confirmation screenshot" className="w-28 h-28 md:w-32 md:h-32 object-cover rounded-xl border border-teal-700 shrink-0" />
                  <p className="text-teal-200 text-xs font-semibold leading-relaxed">This is the screenshot we received. It cannot be changed. If something is wrong, message the admin on WhatsApp before your payment is confirmed.</p>
                </div>
                <button type="button" onClick={() => setStage('install')} className="w-full py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-teal-950 text-sm font-black transition-all cursor-pointer">
                  Continue to Install App
                </button>
              </>
            ) : (
              <>
                <label className="block text-xs font-black text-teal-300 uppercase tracking-wide">Payment confirmation screenshot *</label>
                <input type="file" accept="image/*" onChange={(e) => setProof(e.target.files?.[0] || null)}
                  className="w-full bg-teal-950/60 border border-teal-800 text-teal-50 rounded-xl py-3 px-4 text-sm font-semibold file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-500 file:text-teal-950 file:font-black cursor-pointer" />
                {proof && <p className="text-teal-300 text-xs font-semibold">Attached: {proof.name}</p>}
                {error && <p className="text-xs font-bold text-rose-400">{error}</p>}
                <button onClick={submitProof} disabled={busy} className="w-full py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-teal-950 text-sm font-black transition-all cursor-pointer">
                  {busy ? 'Submitting...' : 'Submit Payment Proof'}
                </button>
              </>
            )}
          </div>
        )}

        {stage === 'install' && course && (
          <InstallGuide
            paid
            whatsappHref={`https://wa.me/${ADMIN_WHATSAPP}?text=${waMsg}`}
          />
        )}

        {toast && (
          <div role="status" className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-fit max-w-[92vw] px-5 py-3.5 rounded-2xl bg-teal-900 border border-amber-500/50 shadow-2xl flex items-start gap-3">
            <span aria-hidden="true" className="text-amber-400 leading-none mt-0.5">✓</span>
            <p className="text-teal-50 text-sm font-bold">{toast}</p>
          </div>
        )}

      </main>
      <footer className="border-t border-teal-900 py-6 text-center text-teal-400 text-xs shrink-0">© 2026 Create It Yourself Academy (CIYA). All rights reserved.</footer>
    </div>
  );
}
