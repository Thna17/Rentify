import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { CatalogModerationComponent } from './catalog-moderation.component';
import { SupportOperationsService } from '../../services/support-operations.service';
import { AuthService } from '../../core/auth/auth.service';
import { TranslateService } from '../../core/i18n/translate.service';

describe('CatalogModerationComponent', () => {
  let fixture: ComponentFixture<CatalogModerationComponent>;
  let component: CatalogModerationComponent;
  let opsService: any;
  let authService: any;
  let userSignal: any;

  const mockItem = {
    id: 'mod-001',
    productId: 'prod-ivory-replica',
    productName: 'Raw Elephant Tusk Carving Ornament',
    storeId: 'store-wood-craft',
    storeName: 'Mekong Artifacts',
    category: 'Home Decor',
    price: '280.00',
    images: ['https://example.com/ivory.jpg'],
    status: 'flagged',
    violationCode: 'PROHIBITED_WILDLIFE_FLORA',
    flagReason: 'Listing matches prohibited keyword pattern and endangered wildlife regulations.',
    remediationGuidance: 'Products made from ivory or wildlife tusks are prohibited under Cambodian Forestry Law.',
    history: [
      {
        id: 'h-1',
        action: 'flagged',
        actorId: 'system',
        actorName: 'Taxonomy Scanner v1.0.0',
        reason: 'Automated policy rule hit: PROHIBITED_WILDLIFE_FLORA',
        timestamp: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockAppealItem = {
    id: 'mod-002',
    productId: 'prod-herbal-capsules',
    productName: 'Special Botanical Pain Relief Capsules 500mg',
    storeId: 'store-herbal-cure',
    storeName: 'Traditional Remedies Asia',
    category: 'Health & Wellness',
    price: '19.50',
    images: ['https://example.com/capsules.jpg'],
    status: 'rejected',
    violationCode: 'PROHIBITED_UNLICENSED_MEDICINE',
    flagReason: 'Pharmaceutical therapeutic claims without Ministry of Health patent license.',
    appeal: {
      id: 'apl-002',
      reason: 'Our traditional herbal mixture is certified by artisan cooperative, not an industrial drug.',
      evidenceUrls: ['https://cdn.example.com/cert.pdf'],
      submittedAt: new Date().toISOString(),
      status: 'pending',
    },
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    userSignal = signal({ id: 'adm-mod', name: 'Chann Vathana', claims: ['catalog:moderate'] });

    opsService = {
      listModerationItems: vi.fn().mockReturnValue(of({ items: [mockItem, mockAppealItem], total: 2 })),
      getModerationItem: vi.fn().mockReturnValue(of(mockItem)),
      decideModeration: vi.fn().mockReturnValue(of({ ...mockItem, status: 'rejected' })),
      reviewAppeal: vi.fn().mockReturnValue(of({ ...mockAppealItem, appeal: { ...mockAppealItem.appeal, status: 'approved' } })),
    };

    authService = {
      user: userSignal,
      canModerateCatalog: vi.fn().mockReturnValue(true),
    };

    TestBed.configureTestingModule({
      imports: [CatalogModerationComponent],
      providers: [
        { provide: SupportOperationsService, useValue: opsService },
        { provide: AuthService, useValue: authService },
        TranslateService,
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of({ get: (key: string) => (key === 'queue' ? 'flagged' : null) }),
            snapshot: { queryParamMap: { get: () => null } },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(CatalogModerationComponent);
    component = fixture.componentInstance;
    await component.fetchItems();
    fixture.detectChanges();
  });

  it('renders moderation queue with product listings', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Catalog Moderation');
    expect(text).toContain('Raw Elephant Tusk Carving Ornament');
  });

  it('filters queue by tabs (flagged, appeals, delisted)', () => {
    component.switchQueue('appeals');
    expect(component.activeQueue()).toBe('appeals');
  });

  it('selects product and displays violation details and remediation policy', () => {
    component.selectItem(mockItem as any);
    fixture.detectChanges();

    expect(component.selectedItem()?.id).toBe('mod-001');
    expect(fixture.nativeElement.textContent).toContain('PROHIBITED_WILDLIFE_FLORA');
    expect(fixture.nativeElement.textContent).toContain('Cambodian Forestry Law');
  });

  it('prompts confirmation modal for delisting/takedown decision', () => {
    component.selectItem(mockItem as any);
    component.decisionReason = 'Item is confirmed prohibited under Cambodian wildlife protection statute.';

    component.promptTakedownConfirm('takedown');
    expect(component.showTakedownConfirm()).toBe(true);

    component.executeConfirmedTakedown();
    expect(opsService.decideModeration).toHaveBeenCalledWith(
      'mod-001',
      'takedown',
      'Item is confirmed prohibited under Cambodian wildlife protection statute.',
      'PROHIBITED_WILDLIFE_FLORA',
      undefined,
    );
  });

  it('processes merchant appeal acceptance and reinstates listing', () => {
    component.selectItem(mockAppealItem as any);
    component.appealDecisionReason = 'Artisan cooperative exemption documents verified authentic.';

    component.executeAppealDecision('approved');
    expect(opsService.reviewAppeal).toHaveBeenCalledWith(
      'mod-002',
      'approved',
      'Artisan cooperative exemption documents verified authentic.',
    );
  });
});
