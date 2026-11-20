import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, getDocs, serverTimestamp, limit } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { sendPushRequest } from '../../firebaseMessaging';
import { onAuthStateChanged } from 'firebase/auth';
import { Send, Zap, Bell, RefreshCw, History, FlaskConical, X } from 'lucide-react';
import { showCiyaToast } from '../../components/CiyaToast';

interface UserStudent {
  id: string;
  email: string;
  fullName?: string;
}

interface DispatchedNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: any;
  triggeredBy: string;
  triggerType: string;
}

/** What fires on its own, with no admin action, as in-app alert + push. */
const AUTOMATIC_NOTIFICATIONS = [
  { icon: '🎓', title: 'Course unlocked', detail: 'Fires the moment a course is unlocked for a student.' },
  { icon: '🎉', title: 'Assignment graded', detail: 'Fires when you approve or return a submitted assignment.' },
  { icon: '🏁', title: 'Day completed', detail: 'Fires when a student completes a course day.' },
  { icon: '🎖️', title: 'Membership approved', detail: 'Fires when a payment or badge upgrade is approved.' }
];

export default function NotificationsAdmin() {
  const [students, setStudents] = useState<UserStudent[]>([]);
  const [history, setHistory] = useState<DispatchedNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual dispatch state
  const [recipientQuery, setRecipientQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<UserStudent | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [manualMessage, setManualMessage] = useState('');
  const [spinning, setSpinning] = useState(false);

  // Test push state
  const [testQuery, setTestQuery] = useState('');
  const [testStudent, setTestStudent] = useState<UserStudent | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'refused', msg: string } | null>(null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    let unsubHistory: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (unsubHistory) {
        unsubHistory();
        unsubHistory = null;
      }

      if (user) {
        const qHistory = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
        unsubHistory = onSnapshot(qHistory, (snap) => {
          const list: DispatchedNotification[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as DispatchedNotification));
          setHistory(list);
          setLoading(false);
        });

        getDocs(query(collection(db, 'users'), limit(1000))).then(snap => {
          const list: UserStudent[] = [];
          snap.forEach(d => {
            const u = d.data();
            list.push({ id: d.id, email: u.email, fullName: u.fullName });
          });
          setStudents(list);
        }).catch(err => console.error("Error loading student select list:", err));
      } else {
        setHistory([]);
        setStudents([]);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (unsubHistory) unsubHistory();
    };
  }, []);

  const showToastMsg = (msg: string, type: 'success' | 'refused' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  /** Push delivery feedback shared by manual and test sends. */
  const reportPush = (pushRes: { ok: boolean; recipients: number }, name: string) => {
    if (!pushRes.ok) {
      showToastMsg('Push delivery failed on the server. The in-app alert was still delivered.', 'refused');
    } else if (pushRes.recipients > 0) {
      showToastMsg(`Push delivered to ${name}: ${pushRes.recipients} device${pushRes.recipients === 1 ? '' : 's'} rang.`);
    } else {
      showToastMsg(`Saved to ${name}'s inbox, but no device has push enabled yet. They must open the app and tap Enable on the notification banner.`, 'refused');
    }
  };

  /** Filter students by what the admin typed (name or email). */
  const filteredStudents = (q: string): UserStudent[] => {
    const needle = q.trim().toLowerCase();
    if (!needle) return students.slice(0, 6);
    return students.filter(s =>
      (s.fullName || '').toLowerCase().includes(needle) ||
      (s.email || '').toLowerCase().includes(needle)
    ).slice(0, 6);
  };

  const StudentPicker = ({ q, setQ, picked, setPicked }: {
    q: string; setQ: (v: string) => void;
    picked: UserStudent | null; setPicked: (s: UserStudent | null) => void;
  }) => (
    <div className="relative">
      {picked ? (
        <div className="flex items-center justify-between gap-2 bg-slate-50 border rounded-xl p-3">
          <span className="text-xs font-bold text-slate-800 truncate">
            {picked.fullName || picked.email || 'Unnamed student'}
            {picked.fullName && picked.email ? <span className="text-slate-400 font-semibold"> · {picked.email}</span> : null}
          </span>
          <button type="button" onClick={() => { setPicked(null); setQ(''); }}
            className="shrink-0 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Clear selected student">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder="Type a student's name or email..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className="w-full bg-slate-50 border outline-none p-3 rounded-xl text-slate-800 focus:border-indigo-500 focus:bg-white text-xs font-semibold"
          />
          {q.trim() !== '' && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {filteredStudents(q).length === 0 ? (
                <div className="p-3 text-xs text-slate-400 font-bold">No student matches "{q}".</div>
              ) : filteredStudents(q).map(s => (
                <button key={s.id} type="button"
                  onClick={() => { setPicked(s); setQ(''); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 text-xs font-bold text-slate-700 cursor-pointer border-b border-slate-50 last:border-0">
                  {s.fullName || 'Unnamed student'} <span className="text-slate-400 font-semibold">· {s.email}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  const handleManualDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualMessage.trim()) {
      showCiyaToast("Write a title and a message body first.");
      return;
    }
    if (!selectedRecipient) {
      showCiyaToast("Pick who should receive this notification.");
      return;
    }

    setSpinning(true);
    try {
      const isBroadcast = selectedRecipient.id === 'all';
      await addDoc(collection(db, 'notifications'), {
        userId: isBroadcast ? 'all' : selectedRecipient.id,
        title: manualTitle.trim(),
        message: manualMessage.trim(),
        type: isBroadcast ? 'system_broadcast' : 'custom',
        isRead: false,
        triggeredBy: currentUser?.email || 'Admin',
        triggerType: 'manual',
        createdAt: serverTimestamp()
      });

      const pushRes = await sendPushRequest(isBroadcast ? 'all' : selectedRecipient.id, manualTitle.trim(), manualMessage.trim(), '/dashboard');
      reportPush(pushRes, isBroadcast ? 'all students' : (selectedRecipient.fullName || selectedRecipient.email || 'student'));

      setManualTitle('');
      setManualMessage('');
      setSelectedRecipient(null);
      setRecipientQuery('');
    } catch (err: any) {
      console.error(err);
      showToastMsg(`Dispatch failure: ${err.message}`, 'refused');
    } finally {
      setSpinning(false);
    }
  };

  const handleSendTest = async () => {
    if (!testStudent) {
      showCiyaToast("Type a student's name and pick them from the list first.");
      return;
    }

    setSpinning(true);
    const studentName = testStudent.fullName || testStudent.email || 'student';
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: testStudent.id,
        title: '🔔 CIYA Test Notification',
        message: `Hi ${studentName}, this is a test alert sent from the admin desk. If you can see this, notifications are working on your account.`,
        type: 'custom',
        isRead: false,
        triggeredBy: currentUser?.email || 'Admin (test)',
        triggerType: 'manual',
        createdAt: serverTimestamp()
      });

      const pushRes = await sendPushRequest(testStudent.id, '🔔 CIYA Test Notification', `Hi ${studentName}, this is a test alert from the admin desk. If you can see this, notifications are working on your account.`, '/dashboard');
      reportPush(pushRes, studentName);
    } catch (err: any) {
      console.error(err);
      showToastMsg(`Test failed: ${err.message}`, 'refused');
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div className="space-y-6 text-left" id="notifications-admin-workspace">
      {/* Toast Alert overlay */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 transition-all ${toast.type === 'success' ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'}`}>
          <div className="font-bold flex items-center gap-2">
            <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Overview Banner */}
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl border border-slate-800 shadow-md">
        <span className="text-xs bg-teal-500/20 text-teal-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">BROADCASTING &amp; ALERT ENGINES</span>
        <h1 className="text-xl md:text-2xl font-black mt-2">Notifications</h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">CIYA alerts go out on their own when things happen. Below you can send one manually or test that push delivery works.</p>
      </div>

      {/* Automatic notifications: read-only, nothing to configure */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-black text-slate-800 text-base border-b pb-3 uppercase tracking-wide flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Automatic notifications — no setup needed
        </h3>
        <p className="text-xs text-slate-500 font-semibold">These fire on their own, as an in-app alert and a push notification. You never have to send them.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AUTOMATIC_NOTIFICATIONS.map((item) => (
            <div key={item.title} className="flex items-start gap-3 bg-slate-50 border rounded-2xl p-3.5">
              <span className="text-xl shrink-0" aria-hidden="true">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-800">{item.title}</p>
                <p className="text-[11px] text-slate-500 font-semibold leading-snug mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Manual send: the one manual control */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col">
          <h3 className="font-black text-slate-800 text-base border-b pb-3 uppercase tracking-wide flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-600" />
            Send a notification
          </h3>
          <p className="text-xs text-slate-500 font-semibold">Write anything you want students to hear about. It lands in their in-app inbox and pushes to their devices automatically.</p>
          <form onSubmit={handleManualDispatch} className="space-y-4 text-xs font-semibold flex-1 flex flex-col">
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-black text-slate-500">Send to</label>
              <StudentPicker q={recipientQuery} setQ={setRecipientQuery} picked={selectedRecipient} setPicked={setSelectedRecipient} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-black text-slate-500">Title</label>
              <input
                type="text"
                placeholder="e.g. New week, new module!"
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                className="w-full bg-slate-50 border outline-none p-3 rounded-xl text-slate-800 focus:border-indigo-500 focus:bg-white"
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="block text-[10px] uppercase font-black text-slate-500">Message</label>
              <textarea
                placeholder="What should students know?"
                value={manualMessage}
                onChange={e => setManualMessage(e.target.value)}
                rows={5}
                className="w-full bg-slate-50 border outline-none p-3 rounded-xl text-slate-800 focus:border-indigo-500 focus:bg-white resize-none h-full"
              />
            </div>
            <button
              type="submit"
              disabled={spinning}
              className="w-full py-3.5 bg-indigo-600 hover:bg-slate-800 text-white font-extrabold uppercase rounded-xl transition-all border-0 shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <Send className="w-4 h-4" />
              {spinning ? 'Sending...' : 'Send notification'}
            </button>
          </form>
        </div>

        {/* Test push delivery */}
        <div className="bg-white border border-emerald-200 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col">
          <h3 className="font-black text-slate-800 text-base border-b pb-3 uppercase tracking-wide flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-600" />
            Test push delivery
          </h3>
          <p className="text-xs text-slate-500 font-semibold">Send a test alert to one student only. It confirms push notifications reach their device. The student must first have tapped Enable on the notification banner in their app and allowed notifications.</p>
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-black text-slate-500">Test student</label>
            <StudentPicker q={testQuery} setQ={setTestQuery} picked={testStudent} setPicked={setTestStudent} />
          </div>
          <div className="mt-auto">
            <button
              type="button"
              onClick={handleSendTest}
              disabled={spinning}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold uppercase rounded-xl transition-all border-0 shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <Bell className="w-4 h-4" />
              {spinning ? 'Sending test...' : 'Send test notification'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent notifications */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2 border-b pb-3 uppercase tracking-wide">
          <History className="w-5 h-5 text-indigo-600" />
          Recent notifications
        </h3>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading notifications...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-bold text-xs uppercase border-2 border-dashed rounded-2xl">
            No notifications sent yet.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[350px] overflow-y-auto">
            {history.map((hist) => {
              const matchesStudent = students.find(s => s.id === hist.userId);
              const targetLabel = hist.userId === 'all'
                ? '📣 ALL STUDENTS'
                : matchesStudent
                  ? `👤 ${matchesStudent.fullName || 'Student'} (${matchesStudent.email})`
                  : '👤 Unknown Student';

              return (
                <div key={hist.id} className="p-3.5 border rounded-2xl bg-slate-50 hover:bg-slate-100/50 transition-colors flex flex-col sm:flex-row justify-between gap-3 text-xs text-left">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full uppercase ${
                        hist.userId === 'all' ? 'bg-amber-100 text-amber-900 border' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {targetLabel}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold">Sender: {hist.triggeredBy || 'System'}</span>
                    </div>
                    <strong className="text-slate-900 font-extrabold text-sm block">{hist.title}</strong>
                    <p className="text-slate-600 leading-relaxed font-semibold font-sans select-all bg-white p-2.5 rounded-xl border border-slate-100 whitespace-pre-wrap">{hist.message}</p>
                  </div>

                  <div className="shrink-0 text-slate-500 uppercase text-[9px] font-black flex sm:flex-col justify-between items-end gap-1 font-mono">
                    <span>{hist.triggerType}</span>
                    <span>
                      {hist.createdAt?.toDate ? hist.createdAt.toDate().toLocaleString() : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
