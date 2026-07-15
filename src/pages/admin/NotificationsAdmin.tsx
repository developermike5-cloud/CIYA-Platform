import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, addDoc, getDocs, serverTimestamp, writeBatch, limit } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Mail, Settings, Plus, Trash2, Calendar, Send, Users, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface NotificationTemplate {
  id: string;
  title: string;
  message: string;
  triggerType: 'manual' | 'automatic';
  eventType: 'none' | 'user_joined' | 'assignment_submitted' | 'assignment_approved' | 'assignment_disapproved';
  createdAt: any;
  createdBy: string;
}

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

export default function NotificationsAdmin() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [students, setStudents] = useState<UserStudent[]>([]);
  const [history, setHistory] = useState<DispatchedNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State for Template Creation
  const [templateId, setTemplateId] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateMsg, setTemplateMsg] = useState('');
  const [triggerType, setTriggerType] = useState<'manual' | 'automatic'>('manual');
  const [eventType, setEventType] = useState<'none' | 'user_joined' | 'assignment_submitted' | 'assignment_approved' | 'assignment_disapproved'>('none');

  // Form State for Manual Dispatch
  const [selectedStudentId, setSelectedStudentId] = useState<'all' | string>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualMessage, setManualMessage] = useState('');
  
  const [toast, setToast] = useState<{ type: 'success' | 'refused', msg: string } | null>(null);
  const [spinning, setSpinning] = useState(false);

  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  
  // Super Admin Check
  const isSuperAdmin = currentUser?.email?.toLowerCase() === 'developermike5@gmail.com';

  useEffect(() => {
    let unsubTemplates: (() => void) | null = null;
    let unsubHistory: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (unsubTemplates) {
        unsubTemplates();
        unsubTemplates = null;
      }
      if (unsubHistory) {
        unsubHistory();
        unsubHistory = null;
      }

      if (user) {
        // 1. Fetch Notification Templates
        const qTemplates = query(collection(db, 'notification_templates'), orderBy('createdAt', 'desc'));
        unsubTemplates = onSnapshot(qTemplates, (snap) => {
          const list: NotificationTemplate[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as NotificationTemplate));
          setTemplates(list);
        });

        // 2. Fetch Dispatched Notifications History
        const qHistory = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
        unsubHistory = onSnapshot(qHistory, (snap) => {
          const list: DispatchedNotification[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as DispatchedNotification));
          setHistory(list);
          setLoading(false);
        });

        // 3. Fetch User Students list for manual picker dropdown using plain getDocs with limit 1000
        getDocs(query(collection(db, 'users'), limit(1000))).then(snap => {
          const list: UserStudent[] = [];
          snap.forEach(d => {
            const u = d.data();
            list.push({ id: d.id, email: u.email, fullName: u.fullName });
          });
          setStudents(list);
        }).catch(err => console.error("Error loading student select list:", err));
      } else {
        setTemplates([]);
        setHistory([]);
        setStudents([]);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (unsubTemplates) unsubTemplates();
      if (unsubHistory) unsubHistory();
    };
  }, []);

  const showToastMsg = (msg: string, type: 'success' | 'refused' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Super Admin Template Submission
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert("Permission denied! Only the Super Admin can set up notification templates.");
      return;
    }
    if (!templateTitle.trim() || !templateMsg.trim()) {
      alert("Please complete both template title and message body.");
      return;
    }

    setSpinning(true);
    const cleanId = templateId.trim() || `tmpl_${Date.now()}`;

    try {
      await setDoc(doc(db, 'notification_templates', cleanId), {
        id: cleanId,
        title: templateTitle.trim(),
        message: templateMsg.trim(),
        triggerType,
        eventType,
        createdBy: currentUser?.email || 'Super Admin',
        createdAt: serverTimestamp()
      });

      showToastMsg(`Template "${cleanId}" saved into repository successfully!`, 'success');
      setTemplateId('');
      setTemplateTitle('');
      setTemplateMsg('');
      setTriggerType('manual');
      setEventType('none');
    } catch (err: any) {
      console.error(err);
      showToastMsg(`Failed to save template: ${err.message}`, 'refused');
    } finally {
      setSpinning(false);
    }
  };

  // Super Admin delete template
  const handleDeleteTemplate = async (id: string) => {
    if (!isSuperAdmin) {
      alert("Permission denied!");
      return;
    }
    if (!confirm(`Are you sure you want to delete template ${id}?`)) return;

    try {
      await deleteDoc(doc(db, 'notification_templates', id));
      showToastMsg("Template erased from database.", 'success');
    } catch (err: any) {
      showToastMsg(err.message, 'refused');
    }
  };

  // Select/apply template details to manual dispatch inputs
  const handleApplyTemplate = (id: string) => {
    setSelectedTemplateId(id);
    if (!id) {
      setManualTitle('');
      setManualMessage('');
      return;
    }
    const selected = templates.find(t => t.id === id);
    if (selected) {
      setManualTitle(selected.title);
      setManualMessage(selected.message);
    }
  };

  // Manual trigger broadcast/destination dispatch
  const handleManualDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualMessage.trim()) {
      alert("Dispatch draft is empty. Please describe title and message body.");
      return;
    }

    setSpinning(true);
    try {
      if (selectedStudentId === 'all') {
        // Broadcast System Alert
        await addDoc(collection(db, 'notifications'), {
          userId: 'all',
          title: manualTitle.trim(),
          message: manualMessage.trim(),
          type: 'system_broadcast',
          isRead: false,
          triggeredBy: currentUser?.email || 'Admin',
          triggerType: 'manual',
          createdAt: serverTimestamp()
        });

        // Also push individual alerts for immediate feedback if needed, but 'all' handles global fetch
        showToastMsg("Global Broadcast alert dispatched live! 🚀", 'success');
      } else {
        // Target single cadet
        await addDoc(collection(db, 'notifications'), {
          userId: selectedStudentId,
          title: manualTitle.trim(),
          message: manualMessage.trim(),
          type: 'custom',
          isRead: false,
          triggeredBy: currentUser?.email || 'Admin',
          triggerType: 'manual',
          createdAt: serverTimestamp()
        });
        const chosenStudentName = students.find(s => s.id === selectedStudentId)?.fullName || 'Cadet';
        showToastMsg(`Target notification dispatched to ${chosenStudentName}!`, 'success');
      }

      setManualTitle('');
      setManualMessage('');
      setSelectedTemplateId('');
    } catch (err: any) {
      console.error(err);
      showToastMsg(`Dispatch failure: ${err.message}`, 'refused');
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div className="space-y-6 text-left" id="notifications-admin-workspace">
      {/* Toast Alert overlay */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 transition-all animate-bounce ${
          toast.type === 'success' ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          <div className="font-bold flex items-center gap-2">
            <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Overview Banner */}
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl border border-slate-800 shadow-md">
        <span className="text-xs bg-teal-500/20 text-teal-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">BROADCASTING & ALERT ENGINES</span>
        <h1 className="text-xl md:text-2xl font-black mt-2">Notification & Broadcast Desk</h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">Configure systemic custom notification templates (Super Admin) or manually dispatch alerts to students or lists.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Column 1: Templates Setup (Only Admin / Super Admin can access template configuration) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-black text-slate-800 text-base border-b pb-3 uppercase tracking-wide flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              Template Configurator {isSuperAdmin ? '👑 (Super Admin)' : '🔒 (Super view only)'}
            </h3>

            {isSuperAdmin ? (
              <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-black text-slate-500">Template Identifier Code</label>
                    <input
                      type="text"
                      placeholder="e.g. assignment_submitted_alert"
                      value={templateId}
                      onChange={e => setTemplateId(e.target.value)}
                      className="w-full bg-slate-50 border outline-none p-2.5 rounded-xl text-slate-800 focus:border-indigo-500 focus:bg-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-black text-slate-500">Event Cascade Trigger</label>
                    <select
                      value={eventType}
                      onChange={e => setEventType(e.target.value as any)}
                      className="w-full bg-slate-50 border outline-none p-2.5 rounded-xl text-slate-800 focus:border-indigo-500 focus:bg-white"
                    >
                      <option value="none">Manual Trigger Only</option>
                      <option value="user_joined">Automatic: New Student signup</option>
                      <option value="assignment_submitted">Automatic: Assignment submitted</option>
                      <option value="assignment_approved">Automatic: Assignment approved</option>
                      <option value="assignment_disapproved">Automatic: Assignment disapproved</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-black text-slate-500">Notification Subject / Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Your submission has been received!"
                    value={templateTitle}
                    onChange={e => setTemplateTitle(e.target.value)}
                    required
                    className="w-full bg-slate-50 border outline-none p-2.5 rounded-xl text-slate-800 focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-black text-slate-500">Compose Template message body *</label>
                  <textarea
                    rows={4}
                    value={templateMsg}
                    onChange={e => setTemplateMsg(e.target.value)}
                    required
                    placeholder="Write detailed layout. Supports dynamic placeholders like {userName}, {dayNumber}, {adminReason}."
                    className="w-full bg-slate-50 border outline-none p-3 rounded-xl text-slate-800 focus:border-indigo-500 focus:bg-white leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <span className="text-[10px] uppercase text-slate-400 font-bold">Trigger Rule:</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={triggerType === 'manual'}
                        onChange={() => setTriggerType('manual')}
                        className="text-indigo-600 focus:ring-indigo-550"
                      /> Manual Trigger
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={triggerType === 'automatic'}
                        onChange={() => setTriggerType('automatic')}
                        className="text-indigo-600 focus:ring-indigo-550"
                      /> Automatic Scheduler Trigger
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={spinning}
                  className="w-full py-3 bg-indigo-600 hover:bg-slate-800 text-white font-extrabold uppercase rounded-xl transition-all border-0 shadow-md cursor-pointer text-xs"
                >
                  {spinning ? 'Saving Template...' : 'Save Notification Template'}
                </button>
              </form>
            ) : (
              <div className="bg-slate-50 p-6 rounded-2xl border flex flex-col items-center justify-center text-center space-y-2 py-10">
                <AlertCircle className="w-8 h-8 text-amber-500" />
                <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Super Admin Restricted Access</h4>
                <p className="text-xs text-slate-500 max-w-sm">Only the primary Super Admin (Mike) can create or update automatic triggering email/in-app alert layouts.</p>
              </div>
            )}
          </div>

          {/* List of current saved templates */}
          <div className="border-t pt-5 mt-5 space-y-3.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">Repository Templates Layouts ({templates.length})</span>
            <div className="space-y-2.5 max-h-[250px] overflow-y-auto">
              {templates.length === 0 ? (
                <p className="text-xs font-bold text-slate-400">No custom templates built yet.</p>
              ) : (
                templates.map((tmpl) => (
                  <div key={tmpl.id} className="p-3 border rounded-2xl bg-slate-50 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 truncate font-extrabold block">{tmpl.title}</strong>
                        <span className={`text-[8px] font-black px-1.5 py-0.25 rounded uppercase shrink-0 ${
                          tmpl.triggerType === 'automatic' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {tmpl.triggerType}
                        </span>
                      </div>
                      <p className="text-slate-500 truncate font-medium">{tmpl.message}</p>
                      <div className="flex items-center gap-1.5 font-mono text-[9px] text-indigo-700 font-bold">
                        <span>Code: {tmpl.id}</span>
                        {tmpl.eventType !== 'none' && <span>| Cascade: [{tmpl.eventType}]</span>}
                      </div>
                    </div>

                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDeleteTemplate(tmpl.id)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer border-0 shrink-0 bg-transparent"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Live Dispatch Controller */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-black text-slate-800 text-base border-b pb-3 uppercase tracking-wide flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-600" />
            Live Dispatch Panel
          </h3>

          <form onSubmit={handleManualDispatch} className="space-y-4 text-xs font-semibold">
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-black text-slate-500">1. Select Target Recipient Studio</label>
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 border outline-none p-2.5 rounded-xl text-slate-800 focus:border-indigo-500 focus:bg-white"
              >
                <option value="all">📣 Global Broadcast Alert (All Students)</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    👤 {s.fullName || 'Anonymous'} ({s.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-black text-slate-500">2. Preload Template Template (Optional)</label>
              <select
                value={selectedTemplateId}
                onChange={e => handleApplyTemplate(e.target.value)}
                className="w-full bg-slate-50 border outline-none p-2.5 rounded-xl text-slate-800 focus:border-indigo-500 focus:bg-white"
              >
                <option value="">-- Write Custom Message from Scratch --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    📄 Apply: {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-black text-slate-500">3. Notification Subject Title *</label>
              <input
                type="text"
                placeholder="Alert Subject line..."
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                required
                className="w-full bg-slate-50 border outline-none p-2.5 rounded-xl text-slate-800 font-extrabold focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-black text-slate-500">4. Compose Dispatch Message Body *</label>
              <textarea
                rows={4}
                value={manualMessage}
                onChange={e => setManualMessage(e.target.value)}
                required
                placeholder="Write custom alert dispatch details specifically..."
                className="w-full bg-slate-50 border outline-none p-3 rounded-xl text-slate-800 font-bold focus:border-indigo-500 focus:bg-white leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={spinning}
              className="w-full py-3.5 bg-indigo-600 hover:bg-slate-800 text-white font-extrabold uppercase rounded-xl transition-all border-0 shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <Send className="w-4 h-4" />
              {spinning ? 'Dispatching Live...' : 'Dispatch Alert Notification Now'}
            </button>
          </form>
        </div>

      </div>

      {/* Dispatched logs histories */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2 border-b pb-3 uppercase tracking-wide">
          <Layers className="w-5 h-5 text-indigo-600" />
          Live Dispatched Activity Logs history
        </h3>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Syncing activity logs...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-bold text-xs uppercase border-2 border-dashed rounded-2xl">
            No notification activity logs logged yet.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[350px] overflow-y-auto">
            {history.map((hist) => {
              const matchesStudent = students.find(s => s.id === hist.userId);
              const targetLabel = hist.userId === 'all' 
                ? '📣 GLOBAL BROADCAST' 
                : matchesStudent 
                  ? `👤 ${matchesStudent.fullName || 'Cadet'} (${matchesStudent.email})` 
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
                      {hist.createdAt?.toDate ? hist.createdAt.toDate().toLocaleString() : 'Logging...'}
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
