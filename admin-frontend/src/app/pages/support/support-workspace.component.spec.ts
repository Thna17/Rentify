import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { SupportWorkspaceComponent } from './support-workspace.component';
import { SupportOperationsService } from '../../services/support-operations.service';
import { AuthService } from '../../core/auth/auth.service';
import { TranslateService } from '../../core/i18n/translate.service';

describe('SupportWorkspaceComponent', () => {
  let fixture: ComponentFixture<SupportWorkspaceComponent>;
  let component: SupportWorkspaceComponent;
  let opsService: any;
  let authService: any;
  let userSignal: any;

  const mockCase = {
    id: 'cas-001',
    caseNumber: 'CAS-20261028-0001',
    title: 'Package marked delivered but not received by buyer',
    subjectType: 'order',
    subjectId: 'ord-transit-lost-01',
    orderId: 'ord-transit-lost-01',
    storeId: 'store-angkor-silks',
    storeName: 'Angkor Silk Crafts',
    buyerId: 'usr-buyer-01',
    buyerName: 'Dara Chan',
    status: 'in_progress',
    priority: 'urgent',
    tier: 1,
    assigneeId: null,
    assigneeName: null,
    serviceDeadline: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    isOverdue: true,
    slaRisk: 'breached',
    slaRemainingHours: 0,
    reportReference: 'RPT-20261028-0001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    evidence: [
      {
        id: 'ev-1',
        url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800',
        label: 'Empty doorstep proof',
        type: 'damage_proof',
        uploadedAt: new Date().toISOString(),
      },
    ],
    messages: [
      {
        id: 'msg-1',
        caseId: 'cas-001',
        senderId: 'usr-buyer-01',
        senderName: 'Dara Chan',
        senderRole: 'buyer',
        message: 'Delivery driver marked package as handed over, but nobody was home.',
        isInternal: false,
        createdAt: new Date().toISOString(),
      },
    ],
    events: [
      {
        id: 'evt-1',
        caseId: 'cas-001',
        type: 'case_created',
        actorId: 'usr-buyer-01',
        actorName: 'Dara Chan',
        actorRole: 'buyer',
        reason: 'Buyer filed non-delivery dispute',
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const mockCommerceFacts = {
    caseId: 'cas-001',
    reportReference: 'RPT-20261028-0001',
    orderFacts: {
      orderId: 'ord-transit-lost-01',
      orderNumber: 'ORD-20261028-001',
      totalAmount: '45.00',
      currency: 'USD',
      paymentStatus: 'escrow_held',
      deliveryStatus: 'delivered',
      deliveredAt: new Date().toISOString(),
      items: [
        {
          productId: 'prod-silk-scarf',
          name: 'Handwoven Golden Silk Scarf',
          quantity: 1,
          price: '45.00',
        },
      ],
    },
    storeFacts: {
      storeId: 'store-angkor-silks',
      storeName: 'Angkor Silk Crafts',
      merchantName: 'Somnang Ly',
      contactPhone: '+855 12 889 900',
    },
  };

  beforeEach(async () => {
    userSignal = signal({
      id: 'adm-1',
      name: 'Vannak Kem',
      claims: ['support:case:read', 'support:case:write', 'support:dispute:resolve'],
    });

    opsService = {
      listSupportCases: vi.fn().mockReturnValue(of({ cases: [mockCase], total: 1 })),
      getSupportCase: vi.fn().mockReturnValue(of(mockCase)),
      getCommerceFacts: vi.fn().mockReturnValue(of(mockCommerceFacts)),
      assignCase: vi.fn().mockReturnValue(of({ ...mockCase, assigneeId: 'adm-1', assigneeName: 'Vannak Kem' })),
      updatePriority: vi.fn().mockReturnValue(of({ ...mockCase, priority: 'urgent' })),
      escalateCase: vi.fn().mockReturnValue(of({ ...mockCase, tier: 2 })),
      resolveCase: vi.fn().mockReturnValue(of({
        ...mockCase,
        status: 'resolved',
        resolution: { outcome: 'refund_ordered', summary: 'Refund approved' },
      })),
      reopenCase: vi.fn().mockReturnValue(of({ ...mockCase, status: 'open' })),
      addMessage: vi.fn().mockReturnValue(of({
        id: 'msg-int-1',
        caseId: 'cas-001',
        senderName: 'Vannak Kem',
        senderRole: 'agent',
        content: 'Internal review started',
        isInternal: true,
        createdAt: new Date().toISOString(),
      })),
    };

    authService = {
      user: userSignal,
      hasPermission: vi.fn().mockReturnValue(true),
      canViewSupport: vi.fn().mockReturnValue(true),
      canWriteSupport: vi.fn().mockReturnValue(true),
      canResolveDisputes: vi.fn().mockReturnValue(true),
    };

    TestBed.configureTestingModule({
      imports: [SupportWorkspaceComponent],
      providers: [
        provideRouter([]),
        { provide: SupportOperationsService, useValue: opsService },
        { provide: AuthService, useValue: authService },
        TranslateService,
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ queue: 'all' }),
            queryParamMap: of({ get: (key: string) => (key === 'queue' ? 'all' : null) }),
            snapshot: { queryParams: {}, queryParamMap: { get: () => null } },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(SupportWorkspaceComponent);
    component = fixture.componentInstance;
    await component.fetchCases();
    fixture.detectChanges();
  });

  it('renders support operations workspace with SLA indicators', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Support Case Workspace');
    expect(text).toContain('CAS-20261028-0001');
  });

  it('filters cases when switching queue tabs', () => {
    component.setQueue('breached');
    expect(component.activeQueue()).toBe('breached');
  });

  it('selects a case and displays authoritative Commerce facts', async () => {
    const freshCase = { ...mockCase, commerceFacts: undefined };
    await component.selectCase(freshCase as any);
    fixture.detectChanges();

    expect(component.selectedCase()?.id).toBe('cas-001');
    expect(opsService.getCommerceFacts).toHaveBeenCalledWith('cas-001', 'RPT-20261028-0001');
    expect(component.selectedCase()?.commerceFacts?.orderFacts?.orderNumber).toBe('ORD-20261028-001');
    expect(component.selectedCase()?.commerceFacts?.orderFacts?.totalAmount).toBe('45.00');
  });

  it('opens and closes evidence photo in lightbox viewer', () => {
    const photoUrl = 'https://example.com/photo.jpg';
    component.openLightbox(photoUrl);
    expect(component.lightboxUrl()).toBe(photoUrl);

    component.closeLightbox();
    expect(component.lightboxUrl()).toBeNull();
  });

  it('assigns current operator to the case', async () => {
    await component.selectCase(mockCase as any);
    component.assignToMe();

    expect(opsService.assignCase).toHaveBeenCalledWith('cas-001', 'adm-1', 'Agent');
  });

  it('escalates case to Tier 2 mediation with required justification', async () => {
    await component.selectCase(mockCase as any);
    component.escalateReason = 'Courier failed delivery confirmation check';
    await component.executeEscalation();

    expect(opsService.escalateCase).toHaveBeenCalledWith('cas-001', 'Courier failed delivery confirmation check');
  });

  it('submits binding dispute resolution with required explanation', async () => {
    await component.selectCase(mockCase as any);
    component.resolveOutcome = 'refund_ordered';
    component.resolveSummary = 'Authorized full COD refund due to verified carrier transit discrepancy';

    component.promptResolveConfirm();
    expect(component.showResolveConfirm()).toBe(true);

    await component.executeResolution();
    expect(opsService.resolveCase).toHaveBeenCalledWith(
      'cas-001',
      'refund_ordered',
      'Authorized full COD refund due to verified carrier transit discrepancy',
    );
  });

  it('posts an internal note to the stream', async () => {
    await component.selectCase(mockCase as any);
    component.newMessageText = 'Investigating carrier route JT-991';
    component.newMessageIsInternal = true;
    await component.sendMessage();

    expect(opsService.addMessage).toHaveBeenCalledWith('cas-001', 'Investigating carrier route JT-991', true);
    expect(component.newMessageText).toBe('');
  });

  it('posts a public customer update message', async () => {
    await component.selectCase(mockCase as any);
    component.newMessageText = 'We have contacted the courier regarding your package.';
    component.newMessageIsInternal = false;
    await component.sendMessage();

    expect(opsService.addMessage).toHaveBeenCalledWith('cas-001', 'We have contacted the courier regarding your package.', false);
    expect(component.newMessageText).toBe('');
  });

  it('reopens a resolved case with required reason', async () => {
    const resolvedCase = { ...mockCase, status: 'resolved' };
    await component.selectCase(resolvedCase as any);
    component.reopenReason = 'Customer provided additional courier tracking receipt';
    component.promptReopenConfirm();
    expect(component.showReopenConfirm()).toBe(true);

    await component.executeReopen();
    expect(opsService.reopenCase).toHaveBeenCalledWith('cas-001', 'Customer provided additional courier tracking receipt');
  });
});
