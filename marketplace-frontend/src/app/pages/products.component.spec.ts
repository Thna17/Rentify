import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProductsComponent } from './products.component';
import { CatalogService } from '../core/catalog/catalog.service';
import { SearchTelemetryService } from '../core/telemetry/search-telemetry.service';
import { SeoService } from '../core/seo/seo.service';
import { TranslateService } from '../core/i18n/translate.service';
import { Product } from '../core/catalog/catalog.models';

describe('ProductsComponent', () => {
  let fixture: ComponentFixture<ProductsComponent>;
  let component: ProductsComponent;
  let telemetry: SearchTelemetryService;

  const mockProducts: Product[] = [
    {
      id: 'prod-1',
      name: 'Kampot Black Pepper',
      slug: 'kampot-black-pepper',
      price: 8.5,
      image: null,
      categorySlug: 'food-groceries',
      categoryName: 'Food & Groceries',
      subcategory: 'Spices',
      subcategorySlug: 'spices',
      sellerName: 'Pepper Farm',
      storeId: 'store-1',
      rating: 4.9,
      reviewCount: 25,
      stock: 40,
      status: 'in-stock',
      description: 'Organic Kampot pepper.',
      soldCount: 150,
      createdAt: new Date().toISOString(),
      collections: [],
    },
  ];

  const mockCatalog = {
    loaded: () => true,
    productError: () => '',
    categories: [
      { slug: 'food-groceries', name: 'Food & Groceries', icon: 'coffee', subcategories: [] },
      { slug: 'handmade-crafts', name: 'Handmade Crafts', icon: 'scissors', subcategories: [] },
    ],
    search: (query: { search?: string }) => {
      if (query.search === 'nonexistent-item-query') return [];
      return mockProducts;
    },
    category: () => null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(new Map([['search', 'pepper']])),
            snapshot: { queryParamMap: new Map([['search', 'pepper']]) },
          },
        },
        { provide: CatalogService, useValue: mockCatalog },
        SearchTelemetryService,
        SeoService,
        TranslateService,
      ],
    }).compileComponents();

    telemetry = TestBed.inject(SearchTelemetryService);
    fixture = TestBed.createComponent(ProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders products matching active search query', () => {
    expect(component.results().length).toBe(1);
    expect(component.results()[0].name).toBe('Kampot Black Pepper');
    expect(component['search']()).toBe('pepper');
  });

  it('records search latency and query telemetry anonymously', () => {
    const recent = telemetry.getRecentEvents();
    expect(recent.length).toBeGreaterThanOrEqual(1);
    const last = recent[recent.length - 1];
    expect(last.queryLength).toBe(6); // 'pepper'.length === 6
    expect(last.hasResults).toBe(true);
    expect(last.resultCount).toBe(1);
  });

  it('provides suggested search terms and categories for zero results', () => {
    expect(component.suggestedSearches.length).toBeGreaterThan(0);
    expect(component.suggestedSearches).toContain('silk scarf');
  });
});
