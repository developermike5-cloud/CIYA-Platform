import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { auth, db } from '../firebase';
import { onAuthStateChanged, updatePassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * First-login password change screen.
 * New students log in with the temporary password from their welcome email;
 * their dashboard stays locked until they set a personal password here.
 */
export default function ChangePassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/?login=true', { replace: true });
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data?.passwordChangeRequired !== true) {
            // Nothing to change; send them straight to their dashboard.
            navigate('/dashboard', { replace: true });
            return;
          }
          setName(data?.fullName || '');
        }
        setReady(true);
      } catch (e) {
        console.warn('ChangePassword profile check failed:', e);
        setReady(true);
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }
    if (!auth.currentUser) {
      navigate('/?login=true', { replace: true });
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
        setError('For security, please log in again with your temporary password and then set your new password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else {
        setError(err.message || 'Could not update your password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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
            {name ? `${name.split(' ')[0]}, w` : 'W'}elcome to CIYA! You logged in with the temporary password from your email. Choose a new password of your own to unlock your dashboard.
          </p>
        </div>

        <form onSubmit={handleChange} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-semibold"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Type it again"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-semibold"
              autoComplete="new-password"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            {showPassword ? 'Hide passwords' : 'Show passwords'}
          </button>

          {error && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black rounded-2xl transition-all active:scale-95 cursor-pointer"
          >
            {loading ? 'Saving…' : 'Save Password & Unlock Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
