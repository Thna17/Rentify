import { TestBed } from '@angular/core/testing';
import { SearchTelemetryService } from './search-telemetry.service';

describe('SearchTelemetryService', () => {
  let service: SearchTelemetryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SearchTelemetryService],
    });
    service = TestBed.inject(SearchTelemetryService);
    service.clearEvents();
  });

  it('records search events without capturing personal text', () => {
    const recorded = service.recordSearch({
      queryLength: 12,
      filterCount: 2,
      durationMs: 4.5,
      resultCount: 8,
    });

    expect(recorded.queryLength).toBe(12);
    expect(recorded.hasResults).toBe(true);
    expect(recorded.filterCount).toBe(2);
    expect(recorded.durationMs).toBe(4.5);
    expect(service.totalSearches).toBe(1);
    expect(service.zeroResultCount).toBe(0);
    expect(service.zeroResultRate).toBe(0);
  });

  it('tracks zero-result outcomes accurately', () => {
    service.recordSearch({ queryLength: 5, filterCount: 0, durationMs: 2, resultCount: 0 });
    service.recordSearch({ queryLength: 3, filterCount: 1, durationMs: 3, resultCount: 4 });

    expect(service.totalSearches).toBe(2);
    expect(service.zeroResultCount).toBe(1);
    expect(service.zeroResultRate).toBe(0.5);
  });

  it('measures search execution time with startSearchTimer', () => {
    const endTimer = service.startSearchTimer();
    const event = endTimer({ queryLength: 7, filterCount: 1, resultCount: 10 });

    expect(event.queryLength).toBe(7);
    expect(event.resultCount).toBe(10);
    expect(event.hasResults).toBe(true);
    expect(event.durationMs).toBeGreaterThanOrEqual(0);
    expect(service.averageLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('respects buffer limit of 100 events', () => {
    for (let i = 0; i < 110; i++) {
      service.recordSearch({ queryLength: i % 10, filterCount: 0, durationMs: 1, resultCount: 1 });
    }
    expect(service.getRecentEvents().length).toBe(100);
  });
});
