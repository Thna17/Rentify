import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RentifyPreviewComponent } from './rentify-preview.component';
import { RentifyMarketplaceService } from '../core/rentify/rentify-marketplace.service';

describe('RentifyPreviewComponent', () => {
  it('renders disabled notice when marketplace is not enabled', () => {
    TestBed.configureTestingModule({
      imports: [RentifyPreviewComponent],
      providers: [
        {
          provide: RentifyMarketplaceService,
          useValue: {
            enabled: false,
            configured: true,
            merchantDashboard: '',
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(RentifyPreviewComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.notice')?.textContent).toContain('disabled');
  });

  it('renders marketplace tabs and sections when enabled', async () => {
    TestBed.configureTestingModule({
      imports: [RentifyPreviewComponent],
      providers: [
        {
          provide: RentifyMarketplaceService,
          useValue: {
            enabled: true,
            configured: true,
            cutoverEnabled: true,
            merchantDashboard: 'http://localhost:4400',
            session: () => of({ user: { id: 'user-1', name: 'Test Buyer', email: null, phoneNumber: null, isVerified: true } }),
            products: () => of({ products: [], total: 0, page: 1, limit: 24 }),
            stores: () => of({ data: [] }),
            carts: () => of({ carts: [] }),
            orders: () => of({ orders: [] }),
            authLink: (path: string) => `http://localhost:4300/${path}`,
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(RentifyPreviewComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 50));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('nav.tabs')).toBeTruthy();
    expect(compiled.textContent).toContain('Products');
    expect(compiled.textContent).toContain('Cart');
    expect(compiled.textContent).toContain('My orders');
    expect(compiled.textContent).toContain('Test Buyer');
  });
});
