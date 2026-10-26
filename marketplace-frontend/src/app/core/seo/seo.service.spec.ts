import { TestBed } from '@angular/core/testing';
import { Title, Meta } from '@angular/platform-browser';
import { SeoService } from './seo.service';
import { Product, Store } from '../catalog/catalog.models';

describe('SeoService', () => {
  let service: SeoService;
  let titleService: Title;
  let metaService: Meta;

  const mockProduct: Product = {
    id: 'prod-001',
    name: 'Silk Ikat Scarf',
    slug: 'silk-ikat-scarf',
    image: 'https://example.com/scarf.jpg',
    images: ['https://example.com/scarf.jpg'],
    price: 35.0,
    categorySlug: 'handmade-crafts',
    categoryName: 'Handmade Crafts',
    subcategory: 'Scarves',
    subcategorySlug: 'scarves',
    sellerName: 'Phnom Penh Silk Co',
    storeId: 'store-111',
    rating: 4.8,
    reviewCount: 12,
    stock: 5,
    status: 'in-stock',
    description: 'Traditional Cambodian hand-woven silk scarf.',
    soldCount: 40,
    createdAt: new Date().toISOString(),
    collections: ['top-picks'],
  };

  const mockStore: Store = {
    id: 'store-111',
    name: 'Phnom Penh Silk Co',
    location: 'Phnom Penh',
    rating: 4.9,
    reviewCount: 30,
    categoryName: 'Crafts',
    description: 'Fine handmade silk weaving.',
    showContact: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SeoService, Title, Meta],
    });
    service = TestBed.inject(SeoService);
    titleService = TestBed.inject(Title);
    metaService = TestBed.inject(Meta);
  });

  afterEach(() => {
    service.clearJsonLd();
  });

  it('sets page title and meta description properly', () => {
    service.setPageTitle('Test Page');
    expect(titleService.getTitle()).toContain('Test Page');
    expect(metaService.getTag('property="og:title"')?.content).toContain('Test Page');

    service.setDescription('Custom description here');
    expect(metaService.getTag('name="description"')?.content).toBe('Custom description here');
  });

  it('generates public-safe product SEO tags and JSON-LD', () => {
    service.setProductMetadata(mockProduct);

    expect(titleService.getTitle()).toContain(mockProduct.name);
    expect(metaService.getTag('property="og:type"')?.content).toBe('product');
    expect(metaService.getTag('property="og:image"')?.content).toBe(mockProduct.image!);

    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    expect(jsonLd).toBeTruthy();
    const data = JSON.parse(jsonLd!.textContent || '{}');
    expect(data['@type']).toBe('Product');
    expect(data.name).toBe(mockProduct.name);
    expect(data.offers.price).toBe('35.00');
    expect(data.offers.seller.name).toBe(mockProduct.sellerName);
  });

  it('generates store SEO tags without leaking private contact if not public', () => {
    service.setStoreMetadata(mockStore);

    expect(titleService.getTitle()).toContain(mockStore.name);
    expect(metaService.getTag('property="og:type"')?.content).toBe('profile');

    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    expect(jsonLd).toBeTruthy();
    const data = JSON.parse(jsonLd!.textContent || '{}');
    expect(data['@type']).toBe('Store');
    expect(data.name).toBe(mockStore.name);
    expect(data.telephone).toBeUndefined();
  });
});
