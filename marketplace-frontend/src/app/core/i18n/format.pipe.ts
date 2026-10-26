// src/app/core/i18n/format.pipe.ts
// P4-UX-002: Angular pipes for locale-aware currency, date, time, and numbers.

import { Pipe, PipeTransform, inject } from '@angular/core';
import { FormatService } from './format.service';

@Pipe({
  name: 'appCurrency',
  standalone: true,
  pure: false, // Re-evaluates when active language changes
})
export class AppCurrencyPipe implements PipeTransform {
  private readonly format = inject(FormatService);

  transform(
    amount: number | string | null | undefined,
    currency = 'USD',
    options?: { useKhmerDigits?: boolean; minimumFractionDigits?: number },
  ): string {
    return this.format.formatCurrency(amount, currency, options);
  }
}

@Pipe({
  name: 'appDate',
  standalone: true,
  pure: false,
})
export class AppDatePipe implements PipeTransform {
  private readonly format = inject(FormatService);

  transform(
    date: Date | string | number | null | undefined,
    options?: { format?: 'short' | 'medium' | 'long'; useKhmerDigits?: boolean },
  ): string {
    return this.format.formatDate(date, options);
  }
}

@Pipe({
  name: 'appTime',
  standalone: true,
  pure: false,
})
export class AppTimePipe implements PipeTransform {
  private readonly format = inject(FormatService);

  transform(
    date: Date | string | number | null | undefined,
    options?: { useKhmerDigits?: boolean },
  ): string {
    return this.format.formatTime(date, options);
  }
}

@Pipe({
  name: 'appNumber',
  standalone: true,
  pure: false,
})
export class AppNumberPipe implements PipeTransform {
  private readonly format = inject(FormatService);

  transform(
    value: number | string | null | undefined,
    options?: Intl.NumberFormatOptions & { useKhmerDigits?: boolean },
  ): string {
    return this.format.formatNumber(value, options);
  }
}
