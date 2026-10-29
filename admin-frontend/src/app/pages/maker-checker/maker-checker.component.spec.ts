import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { MakerCheckerComponent } from './maker-checker.component';
import { SupportOperationsService } from '../../services/support-operations.service';
import { AuthService } from '../../core/auth/auth.service';
import { TranslateService } from '../../core/i18n/translate.service';

describe('MakerCheckerComponent', () => {
  let fixture: ComponentFixture<MakerCheckerComponent>;
  let component: MakerCheckerComponent;
  let opsService: any;
  let authService: any;
  let userSignal: any;

  const mockPendingItem = {
    id: 'mc-001',
    actionType: 'bulk_takedown',
    targetResource: 'Store Products (Store ID: store-counterfeit-hub)',
    targetId: 'store-counterfeit-hub',
    initiatedBy: {
      id: 'adm-mod-1',
      name: 'Vannak Kem',
      role: 'catalog_moderator',
    },
    reason: 'Store uploaded 38 counterfeit listings in bulk. Requires dual confirmation.',
    status: 'pending_approval',
    createdAt: new Date().toISOString(),
  };

  const mockApprovedItem = {
    id: 'mc-002',
    actionType: 'high_value_refund',
    targetResource: 'Order #ORD-9901 ($450.00)',
    targetId: 'ord-9901',
    initiatedBy: {
      id: 'adm-sup-1',
      name: 'Chann Vathana',
      role: 'support_agent',
    },
    reason: 'High-value COD lost in transit.',
    status: 'approved',
    createdAt: new Date().toISOString(),
    approvedBy: {
      id: 'adm-lead-2',
      name: 'Sokha Meng',
    },
    approvedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    userSignal = signal({
      id: 'adm-checker-secondary',
      name: 'Sokha Meng',
      claims: ['maker_checker:approve'],
    });

    opsService = {
      listMakerCheckerItems: vi.fn().mockImplementation((status: string) => {
        if (status === 'approved') {
          return of({ items: [mockApprovedItem], total: 1 });
        }
        return of({ items: [mockPendingItem], total: 1 });
      }),
      approveMakerChecker: vi.fn().mockReturnValue(of({ ...mockPendingItem, status: 'approved' })),
      rejectMakerChecker: vi.fn().mockReturnValue(of({ ...mockPendingItem, status: 'rejected' })),
    };

    authService = {
      user: userSignal,
      canApproveMakerChecker: vi.fn().mockReturnValue(true),
    };

    TestBed.configureTestingModule({
      imports: [MakerCheckerComponent],
      providers: [
        { provide: SupportOperationsService, useValue: opsService },
        { provide: AuthService, useValue: authService },
        TranslateService,
      ],
    });

    fixture = TestBed.createComponent(MakerCheckerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders pending maker-checker tasks with dual-operator instructions', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Maker-Checker Approval Console');
    expect(text).toContain('Bulk Listing Takedown');
    expect(text).toContain('Store Products (Store ID: store-counterfeit-hub)');
    expect(text).toContain('Vannak Kem');
  });

  it('switches queue tab to approved actions', () => {
    component.setQueue('approved');
    expect(opsService.listMakerCheckerItems).toHaveBeenCalledWith('approved');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('High-Value COD Refund');
  });

  it('prevents maker operator from approving their own high-risk action (Maker != Checker)', () => {
    userSignal.set({ id: 'adm-mod-1', name: 'Vannak Kem', claims: ['maker_checker:approve'] });
    fixture.detectChanges();

    expect(component.isInitiator(mockPendingItem as any)).toBe(true);

    component.promptApprove(mockPendingItem as any);
    expect(component.errorMessage()).toContain('Security Constraint: You cannot approve an action you initiated');
    expect(component.approvingItem()).toBeNull();
  });

  it('allows secondary checker operator to prompt and submit approval', () => {
    userSignal.set({ id: 'adm-checker-secondary', name: 'Sokha Meng', claims: ['maker_checker:approve'] });

    component.promptApprove(mockPendingItem as any);
    expect(component.approvingItem()).toEqual(mockPendingItem as any);

    component.submitApprove();
    expect(opsService.approveMakerChecker).toHaveBeenCalledWith('mc-001');
    expect(component.successMessage()).toContain('approved and scheduled for execution');
  });

  it('prompts decline modal and submits rejection with required explanation', () => {
    component.promptReject(mockPendingItem as any);
    expect(component.rejectingItem()).toEqual(mockPendingItem as any);

    component.rejectionReasonText = 'Target store is undergoing separate fraud investigation; hold action.';
    component.submitReject();

    expect(opsService.rejectMakerChecker).toHaveBeenCalledWith(
      'mc-001',
      'Target store is undergoing separate fraud investigation; hold action.',
    );
    expect(component.successMessage()).toContain('Operation declined and returned to maker');
  });

  it('handles backend approval error gracefully', () => {
    opsService.approveMakerChecker.mockReturnValue(throwError(() => new Error('Maker-Checker Violation: Initiator cannot approve')));

    component.promptApprove(mockPendingItem as any);
    component.submitApprove();

    expect(component.errorMessage()).toContain('Maker-Checker Violation');
  });
});
