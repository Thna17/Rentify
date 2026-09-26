import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@rentify/utils';
import { EASE } from '../../../components/site/motion';

// Shared field styles for the store setup steps (KhmerCraft-style layout)
export const inputClass =
  'h-[52px] w-full rounded-xl border border-black/[0.1] bg-white px-4 text-[15px] sm:h-[54px] text-[#1d1d1f] outline-none transition placeholder:text-[#aeaeb2] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10';

export const Field = ({ label, htmlFor, required, hint, error, full, children }) => (
  <div className={cn('grid min-w-0 gap-2', full && 'sm:col-span-2')}>
    <label htmlFor={htmlFor} className="text-[13px] font-semibold text-[#1d1d1f]">
      {label}
      {required && <b className="ml-0.5 text-[#0071e3]">*</b>}
    </label>
    {children}
    {hint && !error && <small className="text-[12px] text-[#86868b]">{hint}</small>}
    {error && <small className="text-[12px] font-medium text-[#d70015]">{error}</small>}
  </div>
);

export const NoteCard = ({ icon: Icon, title, body, tone = 'blue', className }) => (
  <div
    className={cn(
      'flex items-start gap-3 rounded-2xl p-4',
      tone === 'blue' ? 'bg-[#0071e3]/[0.06] text-[#0b3d77]' : 'bg-white text-[#1d1d1f] ring-1 ring-black/[0.05]',
      className
    )}
  >
    <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#0071e3]" />
    <p className="text-[13px] leading-relaxed">
      <strong className="block font-semibold">{title}</strong>
      <span className="text-[#6e6e73]">{body}</span>
    </p>
  </div>
);

export const SectionHeading = ({ title, description }) => (
  <div className="mb-8">
    <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#1d1d1f] md:text-[42px]">
      {title}
    </h1>
    {description && (
      <p className="mt-3 max-w-[620px] text-[16px] leading-relaxed text-[#6e6e73]">{description}</p>
    )}
  </div>
);

// Styled dropdown: options are [{ value, label }]
export const SelectField = ({ id, value, options, placeholder, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => !ref.current?.contains(event.target) && setOpen(false);
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          inputClass,
          'flex items-center justify-between gap-3 text-left',
          open && 'border-[#0071e3] ring-4 ring-[#0071e3]/10'
        )}
      >
        <span className={cn('truncate', !selected && 'text-[#aeaeb2]')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-[#86868b] transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-labelledby={id}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-72 origin-top overflow-auto rounded-2xl bg-white/95 p-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/[0.06] backdrop-blur-xl"
          >
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-[15px] transition-colors hover:bg-[#f5f5f7]',
                    option.value === value ? 'font-medium text-[#0071e3]' : 'text-[#1d1d1f]'
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <Check className="h-4 w-4 shrink-0" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};
