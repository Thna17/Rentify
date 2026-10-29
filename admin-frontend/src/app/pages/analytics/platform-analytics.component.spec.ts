import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PlatformOperationsService } from '../../services/platform-operations.service';
import { PlatformAnalyticsComponent } from './platform-analytics.component';

describe('PlatformAnalyticsComponent', () => {
  it('keeps merchant COD money separate from Rentify subscription revenue', async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformAnalyticsComponent],
      providers: [{ provide: PlatformOperationsService, useValue: {
        coreAnalytics: () => of({ data: { catalogVersion: '1.0.0', generatedAt: '2026-10-29T00:00:00Z',
          activation: {}, support: {}, notificationReliability: {}, subscriptions: { lifecycleAuthorityComplete: false },
          revenue: { subscriptionCollectedMinorByCurrency: { USD: 1500 }, providerFees: { defined: false },
            netRecognizedPlatformRevenue: { defined: false } } } }),
        commerceAnalytics: () => of({ data: { catalogVersion: '1.0.0', search: {}, checkout: {}, fulfillment: {},
          cod: { gmvMinorByCurrency: { USD: 5000 }, collectedMinorByCurrency: { USD: 4000 } },
          refunds: {}, cancellations: {}, returnsAndComplaints: {}, moderation: {} } }),
      } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PlatformAnalyticsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('$50.00');
    expect(text).toContain('$15.00');
    expect(text).toContain('Not defined');
  });
});
