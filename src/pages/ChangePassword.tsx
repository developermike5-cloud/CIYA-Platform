import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Eye, EyeOff, Check } from 'lucide-react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, updatePassword, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * First-login password set screen.
 * The student arrives here straight from the central login: they signed in
 * with the temporary password from their welcome email and the system
 * identified them as a new user. This screen only collects the permanent
 * password; sign-in itself always happens on the central login page.
 */

const MIN_LENGTH = 8;

function passwordChecks(pw: string) {
  return [
    { key: 'length', label: `At least ${MIN_LENGTH} characters`, met: pw.length >= MIN_LENGTH },
    { key: 'upper', label: 'An uppercase letter (A-Z)', met: /[A-Z]/.test(pw) },
    { key: 'lower', label: 'A lowercase letter (a-z)', met: /[a-z]/.test(pw) },
    { key: 'number', label: 'A number (0-9)', met: /[0-9]/.test(pw) },
    { key: 'symbol', label: 'A symbol (!@#$%&*)', met: /[^A-Za-z0-9]/.test(pw) },
  ];
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [needsRelogin, setNeedsRelogin] = useState(false);

  useEffect(() => {
    let alive = true;
    let restoreTimer: ReturnType<typeof setTimeout> | undefined;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Give Firebase a moment to restore a persisted session before
        // concluding nobody is signed in; the login page handles sign-in.
        if (restoreTimer) return;
        restoreTimer = setTimeout(() => {
          if (alive) navigate('/?login=true', { replace: true });
        }, 1600);
        return;
      }
      if (restoreTimer) {
        clearTimeout(restoreTimer);
        restoreTimer = undefined;
      }
      // The web app is admin-only: students set their password inside the CIYA app.
      const inPwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      if (!inPwa) {
        await signOut(auth);
        navigate('/', { replace: true });
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) {
          // Not a student record we know: send them back to the login page.
          await signOut(auth);
          navigate('/?login=true', { replace: true });
          return;
        }
        const data = snap.data() as any;
        if (data?.passwordChangeRequired !== true) {
          // Nothing to change; send them straight to their dashboard.
          navigate('/dashboard', { replace: true });
          return;
        }
        if (alive) setName(data?.fullName || '');
        if (alive) setReady(true);
      } catch (e) {
        console.warn('ChangePassword profile check failed:', e);
        if (alive) setReady(true);
      }
    });
    return () => {
      alive = false;
      if (restoreTimer) clearTimeout(restoreTimer);
      unsub();
    };
  }, [navigate]);

  const checks = passwordChecks(newPassword);
  const allMet = checks.every((c) => c.met);
  const match = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = allMet && match && !loading;

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!allMet) {
      setError('Your password must meet every requirement listed above.');
      return;
    }
    if (!match) {
      setError('The two passwords do not match.');
      return;
    }
    if (!auth.currentUser) {
      setNeedsRelogin(true);
      return;
    }
    setLoading(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        passwordChangeRequired: false,
        tempPasswordActive: false,
        updatedAt: serverTimestamp()
      });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setNeedsRelogin(true);
        setError('For security, your session needs a fresh sign-in. Log in again with your temporary password and set your new password.');
      } else if (err.code === 'auth/weak-password') {
        setError('That password is too weak. It must meet every requirement listed above.');
      } else if ((err.message || '').toLowerCase().includes('network')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Could not update your password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRelogin = async () => {
    try {
      await signOut(auth);
    } catch { /* ignore */ }
    navigate('/?login=true', { replace: true });
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400 font-bold text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        <div className="text-center space-y-2 mb-6">
          <div className="mx-auto w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-3xl shadow-md border border-indigo-200">
            🔐
          </div>
          <h1 className="text-2xl font-black text-slate-900">Set Your Password</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            {name ? `${name.split(' ')[0]}, w` : 'W'}elcome to CIYA! You logged in with the temporary password from your email. Choose a permanent password of your own to unlock your dashboard.
          </p>
        </div>

        <form onSubmit={handleChange} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={`At least ${MIN_LENGTH} characters`}
                className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-semibold"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                aria-label={showNew ? 'Hide password' : 'Show password'}
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-1 bg-transparent border-0 cursor-pointer transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Type it again"
                className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-semibold"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-1 bg-transparent border-0 cursor-pointer transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !match && (
              <p className="mt-1.5 text-xs font-bold text-rose-600">The two passwords do not match yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2.5">Your password must include</p>
            <ul className="space-y-2">
              {checks.map((c) => (
                <motion.li
                  key={c.key}
                  initial={false}
                  className={`flex items-center gap-2.5 text-xs font-bold transition-colors duration-300 ${c.met ? 'text-emerald-600' : 'text-slate-400'}`}
                >
                  <span
                    className={`grid place-items-center w-[18px] h-[18px] rounded-full border-2 shrink-0 transition-colors duration-300 ${c.met ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-transparent'}`}
                  >
                    {c.met && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 24 }}
                      >
                        <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                      </motion.span>
                    )}
                  </span>
                  {c.label}
                </motion.li>
              ))}
            </ul>
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {needsRelogin && (
            <button
              type="button"
              onClick={handleRelogin}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl transition-all active:scale-95 cursor-pointer border-0"
            >
              Log In Again
            </button>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black rounded-2xl transition-all active:scale-95 cursor-pointer"
          >
            {loading ? 'Saving…' : 'Save Password & Unlock Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
