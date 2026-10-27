// src/app/core/a11y/live-announcer.service.ts
// P4-UX-003: Programmatic live status announcer for screen readers (WCAG 4.1.3).

import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export type Politeness = 'polite' | 'assertive' | 'off';

@Injectable({ providedIn: 'root' })
export class LiveAnnouncerService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private liveElement: HTMLElement | null = null;

  /**
   * Announces a message to assistive technology screen readers.
   *
   * @param message Text to be spoken by screen reader
   * @param politeness 'polite' (waits for speaker pause) or 'assertive' (interrupts)
   */
  announce(message: string, politeness: Politeness = 'polite'): void {
    if (!isPlatformBrowser(this.platformId) || !message) return;

    const el = this.getOrCreateLiveElement();
    if (!el) return;

    el.setAttribute('aria-live', politeness);

    // Briefly clear then set to ensure screen reader triggers announcement
    el.textContent = '';
    setTimeout(() => {
      el.textContent = message;
    }, 50);
  }

  private getOrCreateLiveElement(): HTMLElement | null {
    if (this.liveElement && this.document.body.contains(this.liveElement)) {
      return this.liveElement;
    }

    const existing = this.document.getElementById('kc-live-announcer');
    if (existing) {
      this.liveElement = existing;
      return existing;
    }

    const el = this.document.createElement('div');
    el.id = 'kc-live-announcer';
    el.className = 'sr-only';
    el.setAttribute('aria-atomic', 'true');
    el.setAttribute('aria-live', 'polite');
    this.document.body.appendChild(el);
    this.liveElement = el;
    return el;
  }
}
