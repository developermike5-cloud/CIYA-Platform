import React, { useState } from 'react';

/**
 * Admin-only email delivery test trigger.
 *
 * Sends the real ZeptoMail welcome/login template to a typed-in address
 * (Beginner template or Advanced/paid template) so delivery can be verified
 * without creating throwaway student accounts. Test tooling: keep out of the
 * production launch build.
 */
export default function EmailTestTrigger() {
  const [email, setEmail] = useState('');
  const [template, setTemplate] = useState<'beginner' | 'advanced'>('beginner');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>('');

  const trigger = async () => {
    if (busy) return;
    setResult('');
    setBusy(true);
    try {
      const res = await fetch('/.netlify/functions/email-test-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), template }),
      });
      const data = await res.json();
      if (data.sent) {
        setResult(`Sent! Check ${email.trim()} for the ${template === 'advanced' ? 'Advanced' : 'Beginner'} welcome email.`);
      } else if (data.reason === 'not-configured') {
        setResult('Email keys not configured.');
      } else if (data.reason === 'invalid-email') {
        setResult('That email address does not look valid.');
      } else {
        setResult(`Send failed${data.reason ? ` (${data.reason})` : ''}.`);
      }
    } catch {
      setResult('Send failed (network error).');
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-lg bg-teal-900/60 border border-teal-700 px-3 py-2 text-sm text-teal-50 placeholder:text-teal-600 focus:outline-none focus:border-amber-500';
  const labelClass = 'text-[11px] uppercase tracking-wider text-teal-400';

  return (
    <section className="bg-teal-950 px-6 md:px-12 lg:px-24 py-10">
      <div className="max-w-md mx-auto rounded-2xl border border-teal-800/70 bg-teal-900/30 p-5">
        <p className="text-sm font-semibold text-teal-200">Email Test Trigger</p>
        <p className="mt-1 text-xs text-teal-400">
          Sends the real welcome template to any address so delivery can be tested without a test account.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className={labelClass} htmlFor="email-test-address">Email address</label>
            <input
              id="email-test-address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="email-test-template">Template</label>
            <select
              id="email-test-template"
              value={template}
              onChange={(e) => setTemplate(e.target.value === 'advanced' ? 'advanced' : 'beginner')}
              className={`mt-1 ${inputClass}`}
            >
              <option value="beginner">Beginner course</option>
              <option value="advanced">Advanced course</option>
            </select>
          </div>
          <button
            type="button"
            onClick={trigger}
            disabled={busy || !email.trim()}
            className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-teal-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Test Trigger'}
          </button>
          {result && <p className="text-xs text-teal-300">{result}</p>}
        </div>
      </div>
    </section>
  );
}
