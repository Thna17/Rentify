import React, { useState, useRef, useEffect } from 'react';
import { Mail, Phone, X, Check, ChevronDown, Search } from 'lucide-react';
import { useAuthLanguage } from '../context/AuthLanguageContext';
import {
  SUPPORTED_COUNTRIES,
  CountryCode,
  detectCambodianOperator,
  validateCambodianPhone,
} from '../utils/phoneUtils';
import { cn } from '@rentify/utils';

export interface ContactInputProps {
  mode: 'email' | 'phone';
  onModeChange: (mode: 'email' | 'phone') => void;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
}

const COMMON_EMAIL_DOMAINS = ['@gmail.com', '@icloud.com', '@outlook.com', '@yahoo.com'];

export const ContactInput: React.FC<ContactInputProps> = ({
  mode,
  onModeChange,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  autoFocus = false,
  id = 'contact-input',
  name = 'contact',
  required = true,
}) => {
  const { t, isKhmer } = useAuthLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(SUPPORTED_COUNTRIES[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  // Close country dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter countries for dropdown search
  const filteredCountries = SUPPORTED_COUNTRIES.filter((c) => {
    const q = countrySearchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.nameKh.includes(q) ||
      c.callingCode.includes(q) ||
      c.iso.toLowerCase().includes(q)
    );
  });

  // Cambodian operator detection & validation
  const isCambodia = selectedCountry.iso === 'KH';
  const operator = (mode === 'phone' && isCambodia) ? detectCambodianOperator(value) : null;
  const isPhoneValid = mode === 'phone' && (isCambodia ? validateCambodianPhone(value) : value.replace(/\D/g, '').length >= 7);
  const isEmailValid = mode === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  // Format raw digits for Cambodian numbers (supports 8 and 9 digit subscriber numbers)
  const formatCambodianInputDigits = (digits: string) => {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.substring(0, 2)} ${digits.substring(2)}`;
    if (digits.length <= 8) {
      return `${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5)}`;
    }
    // 9-digit national subscriber number (e.g. 96 984 9988)
    return `${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5, 9)}`;
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Auto-detect if user typed an email accidentally in phone mode
    if (raw.includes('@')) {
      onModeChange('email');
      onChange(raw);
      return;
    }

    // Handle Cambodian phone formatting
    if (isCambodia) {
      const cleanDigits = raw.replace(/\D/g, '');

      let nationalDigits = '';
      if (cleanDigits.startsWith('855')) {
        nationalDigits = cleanDigits.substring(3);
      } else if (cleanDigits.startsWith('0')) {
        nationalDigits = cleanDigits.substring(1);
      } else {
        nationalDigits = cleanDigits;
      }

      onChange(formatCambodianInputDigits(nationalDigits));
    } else {
      onChange(raw);
    }
  };

  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // If user starts typing a local Cambodian phone number in email mode (e.g. '012' or '096')
    if (/^0[1-9]\d{2,}/.test(raw.trim()) && !raw.includes('@')) {
      onModeChange('phone');
      const national = raw.replace(/\D/g, '').substring(1);
      onChange(formatCambodianInputDigits(national));
      return;
    }

    onChange(raw);
  };

  const handleDomainChipClick = (domain: string) => {
    const current = (value || '').trim();
    if (!current) {
      onChange(domain);
    } else if (current.includes('@')) {
      const parts = current.split('@');
      onChange(`${parts[0]}${domain}`);
    } else {
      onChange(`${current}${domain}`);
    }
    inputRef.current?.focus();
  };

  const handleModeSwitch = (newMode: 'email' | 'phone') => {
    onModeChange(newMode);
    // Maintain input focus after switching modes
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      {/* Mode Selector Pill Buttons */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className={cn(
            'text-xs font-semibold uppercase tracking-wider text-slate-700 select-none',
            isKhmer && 'text-sm font-medium tracking-normal font-khmer'
          )}
        >
          {mode === 'email' ? t('auth.email') : t('auth.phone')}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>

        {/* Segmented Pill Switcher */}
        <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 text-xs font-medium text-slate-600 shadow-inner">
          <button
            type="button"
            onClick={() => handleModeSwitch('phone')}
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all duration-200 select-none',
              mode === 'phone'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <Phone className="h-3.5 w-3.5" />
            <span className={isKhmer ? 'font-khmer text-sm' : ''}>
              {isKhmer ? 'លេខទូរស័ព្ទ' : 'Phone'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleModeSwitch('email')}
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all duration-200 select-none',
              mode === 'email'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <Mail className="h-3.5 w-3.5" />
            <span className={isKhmer ? 'font-khmer text-sm' : ''}>
              {isKhmer ? 'អ៊ីមែល' : 'Email'}
            </span>
          </button>
        </div>
      </div>

      {/* Input Container */}
      <div
        className={cn(
          'relative flex h-12 w-full items-center rounded-xl border bg-white transition-all duration-200',
          error
            ? 'border-red-400 ring-2 ring-red-100'
            : 'border-slate-300 hover:border-slate-400 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10',
          disabled && 'cursor-not-allowed bg-slate-50 opacity-60'
        )}
      >
        {/* Left Addon: Country Selector for Phone or Mail Icon for Email */}
        {mode === 'phone' ? (
          <div className="relative h-full" ref={dropdownRef}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
              className="flex h-full items-center gap-1.5 border-r border-slate-200 bg-slate-50/80 px-3 hover:bg-slate-100 transition-colors rounded-l-xl select-none"
              aria-label="Select Country Code"
            >
              <span className="text-base leading-none" role="img" aria-label={selectedCountry.name}>
                {selectedCountry.flag}
              </span>
              <span className="text-sm font-semibold font-mono tracking-tight text-slate-800">
                {selectedCountry.callingCode}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* Country Dropdown Popover */}
            {isCountryDropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in-50 zoom-in-95">
                {/* Search country input */}
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={countrySearchQuery}
                    onChange={(e) => setCountrySearchQuery(e.target.value)}
                    placeholder={isKhmer ? 'ស្វែងរកប្រទេស...' : 'Search country...'}
                    className={cn(
                      'w-full rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none',
                      isKhmer && 'font-khmer'
                    )}
                    autoFocus
                  />
                </div>

                {/* Country List */}
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {filteredCountries.map((c) => (
                    <button
                      key={c.iso}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(c);
                        setIsCountryDropdownOpen(false);
                        setCountrySearchQuery('');
                        inputRef.current?.focus();
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors',
                        selectedCountry.iso === c.iso
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{c.flag}</span>
                        <span className={isKhmer ? 'font-khmer' : ''}>
                          {isKhmer ? c.nameKh : c.name}
                        </span>
                      </div>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {c.callingCode}
                      </span>
                    </button>
                  ))}
                  {filteredCountries.length === 0 && (
                    <p className="p-2 text-center text-xs text-slate-400">
                      {isKhmer ? 'រកមិនឃើញប្រទេស' : 'No country found'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center pl-3.5 pr-2 text-slate-400">
            <Mail className="h-5 w-5" />
          </div>
        )}

        {/* Main Input Field */}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={mode === 'email' ? 'email' : 'tel'}
          inputMode={mode === 'email' ? 'email' : 'numeric'}
          autoComplete={mode === 'email' ? 'email' : 'tel'}
          autoFocus={autoFocus}
          disabled={disabled}
          value={value}
          onChange={mode === 'email' ? handleEmailInputChange : handlePhoneInputChange}
          onBlur={onBlur}
          placeholder={
            mode === 'email'
              ? t('auth.emailPlaceholder')
              : (selectedCountry.placeholder || t('auth.phonePlaceholder'))
          }
          className={cn(
            'h-full flex-1 bg-transparent px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none',
            mode === 'phone' && 'font-mono text-base tracking-wide',
            isKhmer && mode === 'email' && 'font-khmer'
          )}
        />

        {/* Right side items: Operator Badge, Valid Check, Clear Button */}
        <div className="flex items-center gap-1.5 pr-3">
          {/* Operator Badge (e.g. Smart, Cellcard, Metfone) */}
          {operator && (
            <span
              className={cn(
                'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase shadow-xs',
                operator.badgeBg,
                operator.badgeText
              )}
            >
              {operator.name}
            </span>
          )}

          {/* Valid indicator check */}
          {(isPhoneValid || isEmailValid) && !operator && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="h-3 w-3 stroke-[2.5]" />
            </span>
          )}

          {/* Clear button */}
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Clear input"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Domain Suggestion Chips (Email Mode) */}
      {mode === 'email' && !value.includes('@') && value.trim().length > 0 && (
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-0.5 animate-in fade-in-50">
          <span className={cn('text-[11px] text-slate-600 mr-1 flex-shrink-0', isKhmer && 'font-khmer text-slate-600')}>
            {isKhmer ? 'ជ្រើសរើសដែន៖' : 'Suggestions:'}
          </span>
          {COMMON_EMAIL_DOMAINS.map((domain) => (
            <button
              key={domain}
              type="button"
              onClick={() => handleDomainChipClick(domain)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all flex-shrink-0"
            >
              {domain}
            </button>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className={cn('text-xs text-red-600 font-medium animate-in fade-in-50', isKhmer && 'font-khmer')}>
          {error}
        </p>
      )}

      {/* Local hint for phone numbers */}
      {mode === 'phone' && isCambodia && !error && (
        <p className={cn('text-[11px] text-slate-600', isKhmer && 'font-khmer text-slate-600')}>
          {isKhmer
            ? 'បញ្ចូលលេខក្នុងស្រុក (ឧ. 012 345 678 ឬ 096 984 9988)'
            : 'Enter local number (e.g. 012 345 678 or 096 984 9988)'}
        </p>
      )}
    </div>
  );
};

export default ContactInput;
