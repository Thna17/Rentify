import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, throwError } from 'rxjs';
import { SupportOperationsService } from './support-operations.service';
import { AuthService } from '../core/auth/auth.service';

describe('SupportOperationsService', () => {
  let service: SupportOperationsService;
  let authService: any;
  const mockHttp = {
    get: vi.fn().mockReturnValue(throwError(() => new Error('offline - fallback to fixtures'))),
    post: vi.fn().mockReturnValue(throwError(() => new Error('offline - fallback to fixtures'))),
    patch: vi.fn().mockReturnValue(throwError(() => new Error('offline - fallback to fixtures'))),
  };

  beforeEach(() => {
    authService = {
      user: () => ({
        id: 'admin-123',
        name: 'Vannak Kem',
        role: 'platform_admin',
        claims: ['support:case:read', 'support:case:write', 'support:dispute:resolve', 'catalog:moderate', 'maker_checker:approve'],
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        SupportOperationsService,
        { provide: HttpClient, useValue: mockHttp },
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(SupportOperationsService);
  });

  describe('Support Cases', () => {
    it('lists support cases using contract fixtures with SLA indicators', async () => {
      const res = await firstValueFrom(service.listSupportCases());
      expect(res.cases.length).toBeGreaterThan(0);
      const breached = res.cases.find((c) => c.isOverdue || c.slaRisk === 'breached');
      expect(breached).toBeDefined();
    });

    it('filters cases by queue tabs', async () => {
      const res = await firstValueFrom(service.listSupportCases({ queue: 'breached' }));
      expect(res.cases.every((c) => c.isOverdue || c.slaRisk === 'breached')).toBe(true);
    });

    it('retrieves detailed case and authoritative Commerce facts', async () => {
      const c = await firstValueFrom(service.getSupportCase('cas-001-silk-tear'));
      expect(c.caseNumber).toBe('CAS-20261028-0001');

      const facts = await firstValueFrom(service.getCommerceFacts(c.id, c.reportReference || undefined));
      expect(facts.orderFacts).toBeDefined();
      expect(facts.orderFacts?.orderNumber).toBe('ORD-2026-8888');
      expect(facts.orderFacts?.totalAmount).toBe('93.50');
      expect(facts.orderFacts?.paymentStatus).toBe('paid');
    });

    it('assigns an agent to a support case', async () => {
      const updated = await firstValueFrom(service.assignCase('cas-001-silk-tear', 'admin-123', 'Vannak Kem'));
      expect(updated.assigneeId).toBe('admin-123');
      expect(updated.assigneeName).toBe('Vannak Kem');
      expect(updated.events.some((e) => e.type === 'case_assigned')).toBe(true);
    });

    it('escalates case to Tier 2 mediation with mandatory reason', async () => {
      const updated = await firstValueFrom(service.escalateCase('cas-001-silk-tear', 'Courier confirmed shipment lost in transit'));
      expect(updated.tier).toBe(2);
      expect(updated.priority).toBe('urgent');
      expect(updated.events.some((e) => e.type === 'escalated_to_tier2')).toBe(true);
    });

    it('resolves dispute with binding determination and immutable event recording', async () => {
      const updated = await firstValueFrom(service.resolveCase('cas-001-silk-tear', {
        outcome: 'refund_ordered',
        summary: 'Package lost in transit confirmed by J&T Express. Issued full customer refund.',
      }));
      expect(updated.status).toBe('resolved');
      expect(updated.resolution?.outcome).toBe('refund_ordered');
      expect(updated.resolvedAt).toBeDefined();
    });

    it('posts internal notes that do not appear in public customer communications', async () => {
      const note = await firstValueFrom(service.postInternalNote('cas-001-silk-tear', 'Internal courier escalation ticket JT-9921 opened'));
      expect(note.isInternal).toBe(true);
      expect(note.senderRole).toBe('agent');
    });
  });

  describe('Catalog Moderation', () => {
    it('lists flagged products for moderation review', async () => {
      const res = await firstValueFrom(service.listModerationItems({ queue: 'flagged' }));
      expect(res.items.length).toBeGreaterThan(0);
      expect(res.items[0].violationCode).toBeDefined();
    });

    it('submits moderator takedown decision with mandatory justification', async () => {
      const updated = await firstValueFrom(service.moderateProduct(
        'mod-001',
        'delisted',
        'Prohibited endangered wildlife derivative under DEC-006',
        'PROHIBITED_WILDLIFE_FLORA',
      ));
      expect(updated.status).toBe('rejected');
      expect(updated.history.some((h) => h.action === 'delisted')).toBe(true);
    });

    it('processes merchant appeal decision', async () => {
      const updated = await firstValueFrom(service.decideAppeal('mod-002', 'approved', 'Artisan certification verified compliant with local cooperative craft rules'));
      expect(updated.appeal?.status).toBe('approved');
      expect(updated.status).toBe('approved');
    });
  });

  describe('Maker-Checker Security Guard', () => {
    it('lists pending maker-checker actions', async () => {
      const res = await firstValueFrom(service.listMakerCheckerItems('pending_approval'));
      expect(res.items.length).toBeGreaterThan(0);
      expect(res.items[0].status).toBe('pending_approval');
    });

    it('blocks self-approval when current operator is the maker initiator (Maker != Checker)', async () => {
      authService.user = () => ({ id: 'adm-mod-1', name: 'Vannak Kem' });

      try {
        await firstValueFrom(service.approveMakerChecker('mc-001'));
        expect.unreachable('Should have failed maker self-approval');
      } catch (err: any) {
        expect(err.message).toContain('Maker-Checker Violation: Initiator cannot approve their own high-risk action');
      }
    });

    it('allows secondary checker operator to approve pending action', async () => {
      authService.user = () => ({ id: 'adm-checker-secondary', name: 'Sokha Meng' });

      const res = await firstValueFrom(service.approveMakerChecker('mc-001'));
      expect(res.status).toBe('approved');
      expect(res.approvedBy?.id).toBe('adm-checker-secondary');
    });

    it('allows secondary checker operator to reject action with reason', async () => {
      authService.user = () => ({ id: 'adm-checker-secondary', name: 'Sokha Meng' });

      const res = await firstValueFrom(service.rejectMakerChecker('mc-002', 'Insufficient evidence of systematic fraud; issue formal warning first'));
      expect(res.status).toBe('rejected');
      expect(res.decisionReason).toContain('Insufficient evidence');
    });
  });
});
