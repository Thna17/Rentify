import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'khmercraft.searches';
const MAX_ENTRIES = 8;

/**
 * Recent searches, kept on the device.
 *
 * Deliberately local: what someone searched for is their business, and there
 * is no server endpoint for it. Capped so the panel never grows unbounded.
 */
@Injectable({ providedIn: 'root' })
export class SearchHistoryService {
  private readonly entries = signal<string[]>(this.restore());

  readonly recent = this.entries.asReadonly();

  record(term: string): void {
    const cleaned = term.trim();
    if (!cleaned) {
      return;
    }

    this.entries.update((existing) => {
      // Case-insensitive de-dupe, most recent first.
      const withoutDuplicate = existing.filter(
        (entry) => entry.toLowerCase() !== cleaned.toLowerCase(),
      );
      return [cleaned, ...withoutDuplicate].slice(0, MAX_ENTRIES);
    });
    this.persist();
  }

  remove(term: string): void {
    this.entries.update((existing) =>
      existing.filter((entry) => entry !== term),
    );
    this.persist();
  }

  clear(): void {
    this.entries.set([]);
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries()));
    } catch {
      // A full or blocked storage quota should never break search itself.
    }
  }

  private restore(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === 'string')
        : [];
    } catch {
      return [];
    }
  }
}
