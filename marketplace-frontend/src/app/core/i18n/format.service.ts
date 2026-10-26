// src/app/core/i18n/format.service.ts
// P4-UX-002: Locale-aware formatting service for money, numbers, dates, and times.

import { Injectable, inject } from '@angular/core';
import { TranslateService } from './translate.service';

const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'] as const;

const KHMER_MONTHS_SHORT = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ',
];

const KHMER_MONTHS_LONG = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ',
];

@Injectable({ providedIn: 'root' })
export class FormatService {
  private readonly translate = inject(TranslateService);

  /**
   * Converts Arabic digit characters (0-9) to Khmer digit characters (០-៩).
   */
  toKhmerDigits(value: string | number): string {
    return String(value).replace(/\d/g, (d) => KHMER_DIGITS[parseInt(d, 10)] ?? d);
  }

  /**
   * Formats a monetary amount according to the current active locale and currency.
   * In Cambodian commerce, USD ($) is universally used alongside KHR (៛).
   *
   * @param amount The numeric or decimal string amount
   * @param currency The 3-letter currency code, defaults to 'USD'
   * @param options Formatting options, e.g. whether to use Khmer numerals
   */
  formatCurrency(
    amount: number | string | null | undefined,
    currency = 'USD',
    options?: { useKhmerDigits?: boolean; minimumFractionDigits?: number },
  ): string {
    const num = typeof amount === 'number' ? amount : parseFloat(String(amount ?? 0));
    if (!Number.isFinite(num)) return '$0.00';

    const lang = this.translate.currentLang();
    const minFraction = options?.minimumFractionDigits ?? 2;
    const formattedNum = num.toLocaleString('en-US', {
      minimumFractionDigits: minFraction,
      maximumFractionDigits: 2,
    });

    if (currency.toUpperCase() === 'KHR') {
      const khrFormatted = Math.round(num).toLocaleString('en-US');
      if (lang === 'km') {
        const digits = options?.useKhmerDigits ? this.toKhmerDigits(khrFormatted) : khrFormatted;
        return `${digits} ៛`;
      }
      return `${khrFormatted} KHR`;
    }

    // Default USD formatting
    if (lang === 'km' && options?.useKhmerDigits) {
      return `$${this.toKhmerDigits(formattedNum)}`;
    }

    return `$${formattedNum}`;
  }

  /**
   * Formats a number using the active locale with thousands separators.
   */
  formatNumber(
    value: number | string | null | undefined,
    options?: Intl.NumberFormatOptions & { useKhmerDigits?: boolean },
  ): string {
    const num = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
    if (!Number.isFinite(num)) return '0';

    const lang = this.translate.currentLang();
    const formatted = num.toLocaleString(lang === 'km' ? 'km-KH' : 'en-US', options);

    if (lang === 'km' && options?.useKhmerDigits) {
      return this.toKhmerDigits(formatted);
    }
    return formatted;
  }

  /**
   * Formats a date string or Date object using the active locale conventions.
   * e.g. English: "Oct 26, 2026" / Khmer: "២៦ តុលា ២០២៦"
   */
  formatDate(
    dateValue: Date | string | number | null | undefined,
    options?: { format?: 'short' | 'medium' | 'long'; useKhmerDigits?: boolean },
  ): string {
    if (!dateValue) return '';
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(date.getTime())) return String(dateValue);

    const lang = this.translate.currentLang();
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    if (lang === 'km') {
      const monthName = KHMER_MONTHS_SHORT[month] || KHMER_MONTHS_LONG[month];
      const dayStr = options?.useKhmerDigits ? this.toKhmerDigits(day) : String(day);
      const yearStr = options?.useKhmerDigits ? this.toKhmerDigits(year) : String(year);

      if (options?.format === 'short') {
        const monthNum = options?.useKhmerDigits ? this.toKhmerDigits(month + 1) : String(month + 1).padStart(2, '0');
        return `${dayStr}/${monthNum}/${yearStr}`;
      }

      return `${dayStr} ${monthName} ${yearStr}`;
    }

    // English format
    if (options?.format === 'short') {
      return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    }
    if (options?.format === 'long') {
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Formats a time string or Date object into locale-aware time.
   * e.g. English: "2:30 PM" / Khmer: "២:៣០ រសៀល"
   */
  formatTime(
    dateValue: Date | string | number | null | undefined,
    options?: { useKhmerDigits?: boolean },
  ): string {
    if (!dateValue) return '';
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(date.getTime())) return '';

    const lang = this.translate.currentLang();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const isPm = hours >= 12;
    const hour12 = hours % 12 || 12;

    if (lang === 'km') {
      let period = 'ព្រឹក'; // Morning AM
      if (hours >= 12 && hours < 17) period = 'រសៀល'; // Afternoon PM
      else if (hours >= 17 && hours < 21) period = 'ល្ងាច'; // Evening PM
      else if (hours >= 21 || hours < 5) period = 'យប់'; // Night

      const hStr = options?.useKhmerDigits ? this.toKhmerDigits(hour12) : String(hour12);
      const mStr = options?.useKhmerDigits ? this.toKhmerDigits(minutes) : minutes;
      return `${hStr}:${mStr} ${period}`;
    }

    const period = isPm ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${period}`;
  }

  /**
   * Formats a timestamp into relative time ("X hours ago", "刚刚", "X ម៉ោងមុន").
   */
  formatRelativeTime(dateValue: Date | string | number | null | undefined): string {
    if (!dateValue) return '';
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(date.getTime())) return '';

    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    const lang = this.translate.currentLang();

    if (lang === 'km') {
      if (diffSec < 60) return 'ទើបតែឥឡូវនេះ';
      if (diffMin < 60) return `${diffMin} នាទីមុន`;
      if (diffHour < 24) return `${diffHour} ម៉ោងមុន`;
      if (diffDay < 7) return `${diffDay} ថ្ងៃមុន`;
      return this.formatDate(date);
    }

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
    if (diffHour < 24) return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
    if (diffDay < 7) return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
    return this.formatDate(date);
  }
}
