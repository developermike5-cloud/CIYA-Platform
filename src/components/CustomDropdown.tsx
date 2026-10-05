import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Option {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface CustomDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  theme?: 'light' | 'dark' | 'indigo' | 'teal' | 'amber';
}

export default function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  className = '',
  disabled = false,
  theme = 'light'
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return {
          trigger: 'bg-slate-800 border-slate-700 text-white hover:bg-slate-750',
          menu: 'bg-slate-900 border-slate-700 shadow-2xl',
          item: 'text-slate-300 hover:bg-slate-800 hover:text-white',
          selected: 'bg-slate-800 text-white font-bold'
        };
      case 'indigo':
        return {
          trigger: 'bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100',
          menu: 'bg-white border-indigo-100 shadow-xl',
          item: 'text-indigo-800 hover:bg-indigo-50 hover:text-indigo-950',
          selected: 'bg-indigo-100 text-indigo-900 font-bold'
        };
      case 'teal':
        return {
          trigger: 'bg-teal-50 border-teal-200 text-teal-900 hover:bg-teal-100',
          menu: 'bg-white border-teal-100 shadow-xl',
          item: 'text-teal-800 hover:bg-teal-50 hover:text-teal-950',
          selected: 'bg-teal-100 text-teal-900 font-bold'
        };
      case 'amber':
        return {
          trigger: 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100',
          menu: 'bg-white border-amber-100 shadow-xl',
          item: 'text-amber-800 hover:bg-amber-50 hover:text-amber-950',
          selected: 'bg-amber-100 text-amber-900 font-bold'
        };
      default: // light
        return {
          trigger: 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50',
          menu: 'bg-white border-slate-200 shadow-xl',
          item: 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
          selected: 'bg-slate-100 text-slate-900 font-bold'
        };
    }
  };

  const themeClasses = getThemeClasses();

  return (
    <div className={`relative font-sans ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer select-none ${themeClasses.trigger} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isOpen ? 'ring-2 ring-indigo-500/20 border-indigo-400' : ''}`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute z-50 w-full mt-2 rounded-xl border overflow-hidden py-1 max-h-[300px] overflow-y-auto ${themeClasses.menu}`}
          >
            {options.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 italic text-center">No options available</div>
            ) : (
              options.map((option) => (
                <div
                  key={option.value}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors ${value === option.value ? themeClasses.selected : themeClasses.item} ${option.disabled ? 'opacity-40 cursor-not-allowed grayscale-[0.5]' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {option.icon}
                    <span className="truncate">{option.label}</span>
                  </div>
                  {value === option.value && <Check className="w-3.5 h-3.5" />}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
