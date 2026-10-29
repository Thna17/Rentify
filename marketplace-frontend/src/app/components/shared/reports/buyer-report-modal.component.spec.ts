import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BuyerReportModalComponent } from './buyer-report-modal.component';
import { RentifyMarketplaceService } from '../../../core/rentify/rentify-marketplace.service';
import { TranslateService } from '../../../core/i18n/translate.service';
import { ReportEligibility, BuyerReportResult } from '../../../core/support/support.models';

describe('BuyerReportModalComponent (P5-SUP-001 Support Case Linkage Intake)', () => {
  let fixture: ComponentFixture<BuyerReportModalComponent>;
  let component: BuyerReportModalComponent;

  const mockEligibleResponse: ReportEligibility = {
    eligible: true,
    subjectType: 'order',
    subjectId: 'ord-123',
    deadline: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    reasonCodes: [],
    guidance: 'Returns accepted within 7 calendar days of delivery.',
    existingReport: null,
  };

  const mockSuccessSubmission: BuyerReportResult = {
    id: 'rpt-uuid-1',
    reportNumber: 'RPT-20261028-0001',
    subjectType: 'order',
    subjectId: 'ord-123',
    category: 'damaged_item',
    reason: 'Damaged item',
    linkageStatus: 'linked',
    coreCaseId: 'core-case-uuid-1',
    coreCaseNumber: 'CASE-20261028-0001',
    createdAt: new Date().toISOString(),
  };

  const mockRentifyService = {
    checkReportEligibility: vi.fn(),
    submitBuyerReport: vi.fn(),
  };

  beforeEach(async () => {
    mockRentifyService.checkReportEligibility.mockReset();
    mockRentifyService.submitBuyerReport.mockReset();

    mockRentifyService.checkReportEligibility.mockReturnValue(of({ data: mockEligibleResponse }));
    mockRentifyService.submitBuyerReport.mockReturnValue(of({ data: { report: mockSuccessSubmission } }));

    await TestBed.configureTestingModule({
      imports: [BuyerReportModalComponent],
      providers: [
        { provide: RentifyMarketplaceService, useValue: mockRentifyService },
        TranslateService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BuyerReportModalComponent);
    component = fixture.componentInstance;
    component.subjectType = 'order';
    component.subjectId = 'ord-123';
    component.subjectTitle = 'Order #ORD-2026-8888';
  });

  it('checks server-side eligibility on initialization and loads categories', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockRentifyService.checkReportEligibility).toHaveBeenCalledWith('order', 'ord-123');
    expect(component.loadingEligibility()).toBe(false);
    expect(component.eligibility()?.eligible).toBe(true);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Submit Report or Dispute');
    expect(el.textContent).toContain('Issue Category');
  });

  it('displays ineligible state when server-side eligibility fails', async () => {
    mockRentifyService.checkReportEligibility.mockReturnValue(
      of({
        data: {
          eligible: false,
          subjectType: 'order',
          subjectId: 'ord-123',
          deadline: null,
          reasonCodes: ['ORDER_RETURN_WINDOW_EXPIRED'],
          guidance: 'The 7-calendar-day return window from parcel delivery has expired.',
          existingReport: null,
        },
      }),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.eligibility()?.eligible).toBe(false);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Not Eligible for Submission');
    expect(el.textContent).toContain('return window from parcel delivery has expired');
  });

  it('displays conflict state when an active report already exists', async () => {
    mockRentifyService.checkReportEligibility.mockReturnValue(
      of({
        data: {
          eligible: false,
          subjectType: 'order',
          subjectId: 'ord-123',
          deadline: null,
          reasonCodes: ['DUPLICATE_REPORT_EXISTS'],
          guidance: 'An active dispute is currently pending review.',
          existingReport: {
            id: 'rpt-existing-1',
            reportNumber: 'RPT-20261028-9999',
            category: 'damaged_item',
            coreCaseNumber: 'CASE-20261028-9999',
            linkageStatus: 'linked',
            createdAt: new Date().toISOString(),
          },
        },
      }),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.eligibility()?.existingReport?.reportNumber).toBe('RPT-20261028-9999');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Active Report In Progress');
    expect(el.textContent).toContain('RPT-20261028-9999');
  });

  it('enforces safe HTTPS evidence URLs and rejects non-HTTPS links', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    // Insecure HTTP rejected
    component.newEvidenceUrl.set('http://insecure.com/photo.jpg');
    component.addEvidence();
    expect(component.evidenceList().length).toBe(0);
    expect(component.evidenceUrlError()).toContain('https://');

    // Valid HTTPS accepted
    component.newEvidenceUrl.set('https://cdn.rentifymarket.com/proof1.jpg');
    component.newEvidenceLabel.set('product_damage');
    component.addEvidence();
    expect(component.evidenceList().length).toBe(1);
    expect(component.evidenceList()[0].url).toBe('https://cdn.rentifymarket.com/proof1.jpg');
    expect(component.evidenceUrlError()).toBe('');

    // Remove evidence
    component.removeEvidence(0);
    expect(component.evidenceList().length).toBe(0);
  });

  it('submits valid report, displays linked Core Case reference, and emits event', async () => {
    const submittedSpy = vi.spyOn(component.submitted, 'emit');

    fixture.detectChanges();
    await fixture.whenStable();

    component.form.patchValue({
      category: 'damaged_item',
      reason: 'Damaged item',
      description: 'The package arrived completely torn and the craft is broken into pieces.',
    });
    component.newEvidenceUrl.set('https://images.rentifymarket.com/proof.jpg');
    component.addEvidence();

    await component.onSubmit();
    fixture.detectChanges();

    expect(mockRentifyService.submitBuyerReport).toHaveBeenCalledTimes(1);
    const payload = mockRentifyService.submitBuyerReport.mock.calls[0][0];
    expect(payload.subjectType).toBe('order');
    expect(payload.subjectId).toBe('ord-123');
    expect(payload.category).toBe('damaged_item');
    expect(payload.reason).toBe('Damaged item');
    expect(payload.evidence.length).toBe(1);

    expect(component.submitResult()).toBeTruthy();
    expect(component.submitResult()?.reportNumber).toBe('RPT-20261028-0001');
    expect(component.submitResult()?.coreCaseNumber).toBe('CASE-20261028-0001');
    expect(submittedSpy).toHaveBeenCalledWith(mockSuccessSubmission);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Report Submitted & Linked');
    expect(el.textContent).toContain('RPT-20261028-0001');
    expect(el.textContent).toContain('CASE-20261028-0001');
  });

  it('handles server timeout with clear retry prompt', async () => {
    mockRentifyService.submitBuyerReport.mockReturnValue(
      throwError(() => ({
        status: 408,
        error: { message: 'Request timeout' },
      })),
    );

    fixture.detectChanges();
    await fixture.whenStable();

    component.form.patchValue({
      category: 'damaged_item',
      reason: 'Damaged item',
      description: 'The package arrived completely torn and the craft is broken into pieces.',
    });

    await component.onSubmit();
    fixture.detectChanges();

    expect(component.submitError()).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Retry Submission');
  });

  it('meets keyboard accessibility by closing on Escape key', () => {
    const closedSpy = vi.spyOn(component.closed, 'emit');
    fixture.detectChanges();

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);

    expect(closedSpy).toHaveBeenCalled();
  });
});
