import { useState } from 'react';
import { auth, db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import BrandingLogo from './BrandingLogo';

interface Props {
  email: string;
  onCleared: () => void;
}

/**
 * Mandatory first-login screen for invited admins: the temporary password
 * must be replaced with a permanent one before ANY dashboard is reachable.
 */
export default function FirstLoginPasswordGate({ email, onCleared }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Your new password must be at least 8 characters long.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Your session expired. Please sign in again.');
      // 1. Replace the temporary password with the permanent one
      await updatePassword(user, password);
      // 2. Clear the first-login flag on the admin record
      await updateDoc(doc(db, 'admins', user.uid), {
        mustChangePassword: false,
        passwordChangedAt: serverTimestamp()
      });
      onCleared();
    } catch (err: any) {
      console.error('First login password change failed:', err);
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('requires-recent-login')) {
        setError('For security you need a fresh sign-in. Please sign out and sign in again, then set your password.');
      } else if (msg.toLowerCase().includes('weak-password')) {
        setError('That password is too weak. Use at least 8 characters with letters and numbers.');
      } else if (msg.toLowerCase().includes('network')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Could not update your password. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white text-slate-900 w-full max-w-md rounded-2xl shadow-2xl p-8">
        <div className="flex justify-center mb-4">
          <BrandingLogo size="md" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 text-center mt-2">Set Your Permanent Password</h1>
        <p className="text-sm text-slate-500 text-center mt-2 leading-relaxed">
          You signed in with a temporary password. Before you can access the dashboard you must replace it with a permanent password.
        </p>
        <p className="text-xs text-slate-400 text-center mt-1">{email}</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="At least 8 characters"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Type it again"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Saving...' : 'Save Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
