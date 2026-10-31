// src/app/core/i18n/error-sanitizer.service.ts
// P4-UX-002: Technical error sanitizer and safe localized plain-language error mapper.
// Invariant: Never leaks raw stack traces, database details, or raw translation keys to customers.

import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from './translate.service';

export interface LocalizedErrorMessages {
  network: string;
  unauthorized: string;
  forbidden: string;
  notFound: string;
  conflict: string;
  rateLimit: string;
  serverError: string;
  defaultFallback: string;
}

const ERROR_CATALOG_EN: LocalizedErrorMessages = {
  network: 'Network connection lost. Please check your internet connection and try again.',
  unauthorized: 'Please sign in to continue.',
  forbidden: 'You do not have permission to access this resource.',
  notFound: 'The requested product, store, or page could not be found.',
  conflict: 'Item availability or pricing has changed. Please review before proceeding.',
  rateLimit: 'Too many requests. Please wait a moment before trying again.',
  serverError: 'Our services are temporarily busy. Please wait a moment and try again.',
  defaultFallback: 'Something went wrong. Please try again.',
};

const ERROR_CATALOG_KM: LocalizedErrorMessages = {
  network: 'ដាច់ការតភ្ជាប់បណ្តាញ។ សូមពិនិត្យការតភ្ជាប់អ៊ីនធឺណិតរបស់អ្នក ហើយព្យាយាមម្តងទៀត។',
  unauthorized: 'សូមចូលគណនីរបស់អ្នកដើម្បីបន្ត។',
  forbidden: 'អ្នកមិនមានសិទ្ធិអនុវត្តសកម្មភាពនេះទេ។',
  notFound: 'រកមិនឃើញទំនិញ ហាង ឬទំព័រដែលបានស្នើសុំទេ។',
  conflict: 'ចំនួនស្តុកទំនិញ ឬតម្លៃបានផ្លាស់ប្តូរ។ សូមពិនិត្យឡើងវិញមុនពេលបន្ត។',
  rateLimit: 'មានការស្នើសុំច្រើនពេក។ សូមរង់ចាំមួយភ្លែតមុនពេលព្យាយាមម្តងទៀត។',
  serverError: 'ប្រព័ន្ធកំពុងមមាញឹកបណ្តោះអាសន្ន។ សូមរង់ចាំមួយភ្លែត ហើយព្យាយាមម្តងទៀត។',
  defaultFallback: 'មានបញ្ហាមួយបានកើតឡើង។ សូមព្យាយាមម្តងទៀត។',
};

const TECHNICAL_PATTERNS = [
  /sequelize/i,
  /connectionrefused/i,
  /econnrefused/i,
  /etimedout/i,
  /syntaxerror/i,
  /typeerror/i,
  /referenceerror/i,
  /sql/i,
  /select\s+.*from/i,
  /insert\s+into/i,
  /table\s+.*doesn't exist/i,
  /\bat\s+.*\(/i,
  /node_modules/i,
  /stack\s*trace/i,
  /internal\s+server\s+error/i,
];

// Raw translation key pattern like "error.SOMETHING" or "errors.code"
const RAW_KEY_PATTERN = /^[a-z0-9_-]+(\.[a-z0-9_-]+)+$/i;

@Injectable({ providedIn: 'root' })
export class ErrorSanitizerService {
  private readonly translate = inject(TranslateService);

  /**
   * Sanitizes any error (HttpErrorResponse, Error, string, object) into a safe,
   * localized, plain-language customer message.
   */
  sanitize(error: unknown, customFallback?: string): string {
    const lang = this.translate.currentLang();
    const catalog = lang === 'km' ? ERROR_CATALOG_KM : ERROR_CATALOG_EN;
    const fallback = customFallback || catalog.defaultFallback;

    if (!error) return fallback;

    // Handle HttpErrorResponse
    if (error instanceof HttpErrorResponse) {
      return this.handleHttpError(error, catalog, fallback);
    }

    // Handle standard Error instance
    if (error instanceof Error) {
      const msg = error.message;
      if (this.isTechnical(msg)) return fallback;
      if (this.isRawKey(msg)) return this.translate.t(msg) || fallback;
      return msg || fallback;
    }

    // Handle plain string error
    if (typeof error === 'string') {
      if (this.isTechnical(error)) return fallback;
      if (this.isRawKey(error)) return this.translate.t(error) || fallback;
      return error || fallback;
    }

    // Handle generic error object with message
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const msg = String((error as { message: unknown }).message || '');
      if (this.isTechnical(msg)) return fallback;
      if (this.isRawKey(msg)) return this.translate.t(msg) || fallback;
      return msg || fallback;
    }

    return fallback;
  }

  /**
   * Checks whether a message contains internal technical details, stack traces, or DB queries.
   */
  isTechnical(message: string): boolean {
    if (!message || typeof message !== 'string') return false;
    return TECHNICAL_PATTERNS.some((pattern) => pattern.test(message));
  }

  /**
   * Checks whether a message looks like an un-interpolated raw translation key (e.g. "error.NOT_FOUND").
   */
  isRawKey(message: string): boolean {
    if (!message || typeof message !== 'string') return false;
    return RAW_KEY_PATTERN.test(message.trim());
  }

  private handleHttpError(
    err: HttpErrorResponse,
    catalog: LocalizedErrorMessages,
    fallback: string,
  ): string {
    // Status 0: Offline or CORS network failure
    if (err.status === 0) {
      return catalog.network;
    }

    // Status 401: Unauthorized
    if (err.status === 401) {
      return catalog.unauthorized;
    }

    // Status 403: Forbidden
    if (err.status === 403) {
      return catalog.forbidden;
    }

    // Status 404: Not Found
    if (err.status === 404) {
      return catalog.notFound;
    }

    // Status 409: Conflict (stock depletion, race conditions)
    if (err.status === 409) {
      const backendMsg = this.extractBackendMessage(err);
      if (backendMsg && !this.isTechnical(backendMsg)) {
        // Safe domain message like "Only 2 left in stock"
        if (/stock/i.test(backendMsg)) {
          return this.translate.currentLang() === 'km'
            ? 'ចំនួនស្តុកទំនិញមិនគ្រប់គ្រាន់ទេ។ សូមពិនិត្យកន្ត្រករបស់អ្នក។'
            : backendMsg;
        }
        return this.matchesLanguage(backendMsg) ? backendMsg : catalog.conflict;
      }
      return catalog.conflict;
    }

    // Status 429: Rate Limiting
    if (err.status === 429) {
      return catalog.rateLimit;
    }

    // Status 500-504: Server / DB errors
    if (err.status >= 500) {
      return catalog.serverError;
    }

    // Check if backend returned a safe message. Backend copy is English only,
    // so Khmer shoppers get the localized fallback instead.
    const backendMsg = this.extractBackendMessage(err);
    if (backendMsg && !this.isTechnical(backendMsg) && !this.isRawKey(backendMsg) && this.matchesLanguage(backendMsg)) {
      return backendMsg;
    }

    return fallback;
  }

  private matchesLanguage(message: string): boolean {
    return this.translate.currentLang() !== 'km' || /[\u1780-\u17FF]/.test(message);
  }

  private extractBackendMessage(err: HttpErrorResponse): string | null {
    if (typeof err.error === 'string') {
      return err.error;
    }
    if (err.error && typeof err.error === 'object') {
      const errObj = err.error as Record<string, unknown>;
      if (typeof errObj['error'] === 'string') return errObj['error'];
      if (typeof errObj['error'] === 'object' && errObj['error'] !== null) {
        const nested = errObj['error'] as Record<string, unknown>;
        if (typeof nested['message'] === 'string') return nested['message'];
      }
      if (typeof errObj['message'] === 'string') return errObj['message'];
    }
    return null;
  }
}
