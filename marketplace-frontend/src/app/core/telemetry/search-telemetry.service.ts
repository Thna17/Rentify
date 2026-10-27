import { Injectable, signal } from '@angular/core';

export interface SearchTelemetryEvent {
  queryLength: number;
  filterCount: number;
  durationMs: number;
  resultCount: number;
  hasResults: boolean;
  timestamp: number;
}

const MAX_BUFFER_SIZE = 100;

@Injectable({ providedIn: 'root' })
export class SearchTelemetryService {
  private readonly events = signal<SearchTelemetryEvent[]>([]);

  recordSearch(event: Omit<SearchTelemetryEvent, 'hasResults' | 'timestamp'>): SearchTelemetryEvent {
    const fullEvent: SearchTelemetryEvent = {
      ...event,
      durationMs: Math.max(0, Math.round(event.durationMs * 10) / 10),
      hasResults: event.resultCount > 0,
      timestamp: Date.now(),
    };

    this.events.update((current) => {
      const next = [...current, fullEvent];
      return next.length > MAX_BUFFER_SIZE ? next.slice(-MAX_BUFFER_SIZE) : next;
    });

    return fullEvent;
  }

  startSearchTimer(): (meta: { queryLength: number; filterCount: number; resultCount: number }) => SearchTelemetryEvent {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return (meta) => {
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const durationMs = endTime - startTime;
      return this.recordSearch({
        durationMs,
        queryLength: meta.queryLength,
        filterCount: meta.filterCount,
        resultCount: meta.resultCount,
      });
    };
  }

  getRecentEvents(): SearchTelemetryEvent[] {
    return this.events();
  }

  clearEvents(): void {
    this.events.set([]);
  }

  get totalSearches(): number {
    return this.events().length;
  }

  get zeroResultCount(): number {
    return this.events().filter((e) => !e.hasResults).length;
  }

  get zeroResultRate(): number {
    const total = this.totalSearches;
    if (total === 0) return 0;
    return Math.round((this.zeroResultCount / total) * 100) / 100;
  }

  get averageLatencyMs(): number {
    const list = this.events();
    if (list.length === 0) return 0;
    const total = list.reduce((sum, e) => sum + e.durationMs, 0);
    return Math.round((total / list.length) * 10) / 10;
  }
}
