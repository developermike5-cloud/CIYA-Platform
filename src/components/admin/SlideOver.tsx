import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// A slide-in panel that opens from the right edge of the screen, used for
// viewing full details (a student, a record) without leaving the page.
export default function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-slate-900/50 fo-sl-overlay" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        className={`absolute right-0 top-0 h-full w-full ${maxWidth} bg-slate-50 shadow-2xl flex flex-col fo-sl-panel`}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 bg-white border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <div className="font-black text-slate-900 text-base leading-tight truncate">{title}</div>
            {subtitle && <div className="text-xs text-slate-500 font-semibold mt-0.5 truncate">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close panel"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>,
    document.body
  );
}
