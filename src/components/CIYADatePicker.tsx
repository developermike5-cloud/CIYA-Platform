import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * CIYA-branded date picker. Replaces the browser's native <input type="date">
 * calendar with the app's own branded calendar panel. The chosen date shows
 * bold and clearly on the trigger button.
 *
 * value/onChange use the same 'YYYY-MM-DD' string the native input produced,
 * so it is a drop-in replacement.
 */
interface CIYADatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parseValue(value: string): Date | null {
  if (!value) return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

export default function CIYADatePicker({ value, onChange, placeholder = 'Select a date' }: CIYADatePickerProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = parseValue(value);
  const [viewYear, setViewYear] = useState(() => (selected ? selected.getFullYear() : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (selected ? selected.getMonth() : new Date().getMonth()));

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const togglePanel = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) setOpenUp(window.innerHeight - rect.bottom < 380 && rect.top > 380);
    const current = parseValue(value);
    setViewYear(current ? current.getFullYear() : new Date().getFullYear());
    setViewMonth(current ? current.getMonth() : new Date().getMonth());
    setOpen(true);
  };

  const shiftMonth = (delta: number) => {
    const nm = viewMonth + delta;
    if (nm < 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else if (nm > 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(nm);
    }
  };

  const days = useMemo<(number | null)[]>(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const count = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= count; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const pick = (d: number) => {
    onChange(toKey(viewYear, viewMonth, d));
    setOpen(false);
  };

  const now = new Date();
  const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedKey = value || '';
  const shown = selected
    ? selected.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={togglePanel}
        className={`w-full flex items-center justify-between gap-2 bg-white rounded-xl px-4 py-2.5 text-left outline-none transition-all cursor-pointer ${
          open ? 'border-2 border-[#1A3C6E] ring-2 ring-[#1A3C6E]/25' : 'border border-slate-200 hover:border-slate-300'
        }`}
      >
        {selected ? (
          <span className="text-sm font-black text-[#1A3C6E]">{shown}</span>
        ) : (
          <span className="text-xs font-semibold text-slate-400">{placeholder}</span>
        )}
        <Calendar className={`w-4 h-4 shrink-0 ${selected ? 'text-[#1A3C6E]' : 'text-slate-400'}`} />
      </button>

      {open && (
        <div
          className={`absolute left-0 ${openUp ? 'bottom-full mb-2' : 'top-full mt-2'} w-72 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 z-40 select-none animate-in fade-in slide-in-from-bottom-2 duration-200`}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-black text-[#1A3C6E]">
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[9px] font-black text-slate-400 uppercase py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              if (d === null) return <span key={i} />;
              const key = toKey(viewYear, viewMonth, d);
              const isSelected = key === selectedKey;
              const isToday = key === todayKey && !isSelected;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(d)}
                  className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1A3C6E] text-[#D4A017]'
                      : isToday
                      ? 'bg-indigo-50 text-[#1A3C6E] ring-1 ring-[#1A3C6E]/40'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => pick(now.getDate())}
              className="text-[10px] font-black uppercase tracking-wider text-[#1A3C6E] hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
