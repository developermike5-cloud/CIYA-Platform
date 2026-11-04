import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { ADMIN_POWERS, SUPERADMIN_WILDCARD, powerLabel } from '../../constants/adminPowers';

interface AdminRecord {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  mustChangePassword?: boolean;
  invitedBy?: string;
  invitedAt?: string;
}

const PROXY_URL = `${typeof window !== 'undefined' ? window.location.origin : ''}/.netlify/functions/firebase-proxy`;

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < 14; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export default function AdminManagement() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [myPerms, setMyPerms] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [myUid, setMyUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Add-admin form state
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('CIYA Admin');
  const [newPerms, setNewPerms] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ email: string; tempPassword: string; existed: boolean } | null>(null);
  const [inviteError, setInviteError] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setMyUid(user.uid);
      const email = user.email?.toLowerCase() || '';
      getDoc(doc(db, 'admins', user.uid)).then((snap) => {
        if (email === 'developermike5@gmail.com') {
          setIsSuperAdmin(true);
          setMyPerms([SUPERADMIN_WILDCARD]);
        } else if (snap.exists()) {
          const d = snap.data();
          const perms: string[] = d.permissions || [];
          setMyPerms(perms);
          setIsSuperAdmin(d.role === 'superadmin' || perms.includes(SUPERADMIN_WILDCARD));
        }
      }).catch((e) => handleFirestoreError(e, OperationType.GET, 'admins/self'));
    }
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'admins'), (snap) => {
      const list: AdminRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          email: data.email || '',
          role: data.role || 'CIYA Admin',
          permissions: Array.isArray(data.permissions) ? data.permissions : [],
          mustChangePassword: data.mustChangePassword === true,
          invitedBy: data.invitedBy,
          invitedAt: data.invitedAt
        };
      });
      list.sort((a, b) => (a.role === 'superadmin' ? -1 : 1) - (b.role === 'superadmin' ? -1 : 1));
      setAdmins(list);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'admins');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const canManageAdmins = isSuperAdmin || myPerms.includes(SUPERADMIN_WILDCARD) || myPerms.includes('manage_admins');

  const togglePerm = (key: string) => {
    setNewPerms((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  };
  const toggleEditPerm = (key: string) => {
    setEditPerms((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setInviteError('Enter a valid email address for the invitee.');
      return;
    }
    if (newPerms.length === 0) {
      setInviteError('Select at least one power for this admin.');
      return;
    }
    setInviting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('You need to be signed in.');
      const tempPassword = generateTempPassword();
      const res = await fetch(`${PROXY_URL}?op=invite-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-firebase-id-token': idToken },
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          role: newRole.trim() || 'CIYA Admin',
          permissions: newPerms,
          tempPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invite failed. Please try again.');
      setInviteResult({ email: newEmail.trim().toLowerCase(), tempPassword, existed: !!data.created === false });
      setShowAdd(false);
      setNewEmail('');
      setNewPerms([]);
      setNewRole('CIYA Admin');
    } catch (err: any) {
      setInviteError(err?.message || 'Invite failed.');
    } finally {
      setInviting(false);
    }
  };

  const savePerms = async (adminId: string) => {
    setSavingId(adminId);
    try {
      await updateDoc(doc(db, 'admins', adminId), {
        permissions: editPerms,
        updatedAt: new Date().toISOString()
      });
      setEditingId(null);
    } catch (err: any) {
      console.error('Failed to update permissions:', err);
      alert(err?.message || 'Could not update powers. Only super admins can edit powers.');
    } finally {
      setSavingId(null);
    }
  };

  const removeAdmin = async (adminId: string) => {
    setRemovingId(adminId);
    try {
      await deleteDoc(doc(db, 'admins', adminId));
      setConfirmRemove(null);
    } catch (err: any) {
      console.error('Failed to remove admin:', err);
      alert(err?.message || 'Could not remove this admin.');
    } finally {
      setRemovingId(null);
    }
  };

  const copyTemp = async () => {
    if (inviteResult) {
      try {
        await navigator.clipboard.writeText(inviteResult.tempPassword);
      } catch {
        // clipboard unavailable; the text is visible for manual copy
      }
    }
  };

  if (loading) {
    return <div className="text-slate-500 text-sm">Loading admin team...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Team</h1>
          <p className="text-sm text-slate-500 mt-1">Every admin account, the powers they hold, and who can sign in.</p>
        </div>
        {canManageAdmins && (
          <button
            onClick={() => { setShowAdd(true); setInviteResult(null); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            + Add Admin
          </button>
        )}
      </div>

      {/* Invite result: temporary password, shown once */}
      {inviteResult && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 mb-6">
          <h3 className="font-bold text-amber-900 text-sm uppercase tracking-wider">Invite Created, Share This Once</h3>
          <p className="text-sm text-amber-800 mt-2">
            <span className="font-bold">{inviteResult.email}</span> can now sign in with this temporary password. They will be
            required to change it to a permanent password before they can see any dashboard.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <code className="bg-white border border-amber-300 rounded-lg px-4 py-2.5 text-lg font-mono font-bold text-slate-800 tracking-wider select-all">
              {inviteResult.tempPassword}
            </code>
            <button onClick={copyTemp} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2.5 rounded-lg">
              Copy
            </button>
          </div>
          <p className="text-xs text-amber-700 mt-2">Send it to them through a private channel. It will not be shown again.</p>
          <button onClick={() => setInviteResult(null)} className="text-xs text-amber-800 underline mt-3">Dismiss</button>
        </div>
      )}

      {/* Admin list */}
      <div className="grid gap-4">
        {admins.map((a) => {
          const isSelf = a.id === myUid;
          const isSuperAdminRecord = a.role === 'superadmin' || a.permissions.includes(SUPERADMIN_WILDCARD);
          const editing = editingId === a.id;
          return (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800 truncate">{a.email}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${isSuperAdminRecord ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {isSuperAdminRecord ? 'Super Admin' : (a.role || 'Admin')}
                    </span>
                    {isSelf && <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider bg-teal-600 text-white">You</span>}
                    {a.mustChangePassword && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider bg-amber-500 text-white">
                        Temporary Password Active
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {isSuperAdminRecord ? (
                      <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-full font-semibold">
                        All powers: every admin area
                      </span>
                    ) : a.permissions.length === 0 ? (
                      <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded-full">No powers granted yet</span>
                    ) : (
                      a.permissions.map((p) => (
                        <span key={p} className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-full">
                          {powerLabel(p)}
                        </span>
                      ))
                    )}
                  </div>
                  {a.invitedBy && (
                    <p className="text-xs text-slate-400 mt-2">Invited by {a.invitedBy}{a.invitedAt ? ` on ${new Date(a.invitedAt).toLocaleDateString()}` : ''}</p>
                  )}
                </div>
                {canManageAdmins && !isSuperAdminRecord && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => { setEditingId(editing ? null : a.id); setEditPerms(a.permissions); }}
                      className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      {editing ? 'Cancel' : 'Edit Powers'}
                    </button>
                    {!isSelf && (
                      confirmRemove === a.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => removeAdmin(a.id)}
                            disabled={removingId === a.id}
                            className="text-xs font-bold px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {removingId === a.id ? 'Removing...' : 'Confirm'}
                          </button>
                          <button onClick={() => setConfirmRemove(null)} className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-300 text-slate-600">
                            Keep
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemove(a.id)}
                          className="text-xs font-bold px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
              {editing && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Granted Powers</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {ADMIN_POWERS.map((p) => (
                      <label key={p.key} className="flex items-start gap-2 text-sm cursor-pointer bg-slate-50 rounded-lg px-3 py-2">
                        <input
                          type="checkbox"
                          checked={editPerms.includes(p.key)}
                          onChange={() => toggleEditPerm(p.key)}
                          className="mt-0.5 accent-indigo-600"
                        />
                        <span>
                          <span className="font-semibold text-slate-700">{p.label}</span>
                          <span className="block text-xs text-slate-400">{p.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={() => savePerms(a.id)}
                    disabled={savingId === a.id}
                    className="mt-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-60"
                  >
                    {savingId === a.id ? 'Saving...' : 'Save Powers'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add admin modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => !inviting && setShowAdd(false)}>
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800">Add a New Admin</h2>
            <p className="text-sm text-slate-500 mt-1">
              Set up the account, grant their powers, and they get a temporary password. They must change it on first sign-in.
            </p>
            <form onSubmit={handleInvite} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Invitee Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="name@example.com"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">If they already have a CIYA account, the temporary password replaces their old one.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Role Title</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="CIYA Admin"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Powers & Permissions</label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {ADMIN_POWERS.filter((p) => p.key !== 'manage_admins' || isSuperAdmin).map((p) => (
                    <label key={p.key} className="flex items-start gap-2 text-sm cursor-pointer bg-slate-50 rounded-lg px-3 py-2">
                      <input
                        type="checkbox"
                        checked={newPerms.includes(p.key)}
                        onChange={() => togglePerm(p.key)}
                        className="mt-0.5 accent-indigo-600"
                      />
                      <span>
                        <span className="font-semibold text-slate-700">{p.label}</span>
                        <span className="block text-xs text-slate-400">{p.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {inviteError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{inviteError}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-lg text-sm"
                >
                  {inviting ? 'Creating Invite...' : 'Create Invite & Generate Temporary Password'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} disabled={inviting} className="px-4 border border-slate-300 rounded-lg text-sm font-bold text-slate-600">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-6">
        Invited admins sign in with the temporary password on the normal login screen. They are stopped at a password-change
        screen first and can only reach the admin areas their powers cover.
      </p>
      <button onClick={() => navigate('/admin')} className="mt-4 text-xs font-bold text-indigo-600 hover:underline">← Back to dashboard</button>
    </div>
  );
}
