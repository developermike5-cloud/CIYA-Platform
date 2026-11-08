import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X, MoreHorizontal, Download, Trash2, Copy, Lock, Unlock, EyeOff, Eye, UserCheck, UserX, Pencil } from 'lucide-react';

export interface RowAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  success?: boolean;
  disabled?: boolean;
  title?: string;
}

// Icon helpers so every table can share the same look inside the menu.
export const actionIcons = {
  lock: <Lock className="w-3.5 h-3.5" />,
  unlock: <Unlock className="w-3.5 h-3.5" />,
  publish: <Eye className="w-3.5 h-3.5" />,
  unpublish: <EyeOff className="w-3.5 h-3.5" />,
  clone: <Copy className="w-3.5 h-3.5" />,
  export: <Download className="w-3.5 h-3.5" />,
  approve: <UserCheck className="w-3.5 h-3.5" />,
  disapprove: <UserX className="w-3.5 h-3.5" />,
  edit: <Pencil className="w-3.5 h-3.5" />,
  delete: <Trash2 className="w-3.5 h-3.5" />,
  more: <MoreHorizontal className="w-3.5 h-3.5" />,
  check: <Check className="w-3.5 h-3.5" />,
  close: <X className="w-3.5 h-3.5" />,
};

// A compact "Actions" dropdown that groups secondary row actions.
// The menu renders through a portal with fixed positioning so table
// overflow containers never clip it.
export default function RowActionsDropdown({ actions, label = 'Actions' }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const place = () => {
    const b = btnRef.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    const menuH = Math.min(actions.length * 34 + 12, 320);
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < menuH + 8 && r.top > menuH + 8;
    const top = openUp ? Math.max(8, r.top - menuH - 6) : r.bottom + 6;
    const left = Math.max(8, Math.min(r.right - 192, window.innerWidth - 200));
    setPos({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onDoc = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onMove = () => place();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="More actions"
        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition-all shadow-sm ${
          open ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
        }`}
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: 192 }}
            className="z-[70] bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 overflow-y-auto max-h-[320px]"
          >
            {actions.map((a, i) => (
              <button
                key={i}
                type="button"
                disabled={a.disabled}
                title={a.title}
                onClick={() => {
                  setOpen(false);
                  a.onClick();
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  a.danger
                    ? 'text-rose-600 hover:bg-rose-50'
                    : a.success
                    ? 'text-emerald-700 hover:bg-emerald-50'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className={a.danger ? 'text-rose-500' : a.success ? 'text-emerald-600' : 'text-slate-400'}>
                  {a.icon || actionIcons.more}
                </span>
                {a.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
