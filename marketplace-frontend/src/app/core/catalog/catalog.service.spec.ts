import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CatalogService } from './catalog.service';
import { RentifyMarketplaceService } from '../rentify/rentify-marketplace.service';

describe('CatalogService', () => {
  let service: CatalogService;

  const mockRentify = {
    products: () =>
      of({
        products: [
          {
            id: 'p1',
            storeId: '00000000-0000-4000-8000-000000000001',
            name: 'Gentle Foaming Cleanser',
            description: 'A gentle face cleanser',
            price: '24.00',
            compareAtPrice: '28.00',
            category: 'Skincare',
            images: [{ url: 'https://example.com/cleanser.jpg' }],
            stockQuantity: 50,
          },
          {
            id: 'p2',
            storeId: '00000000-0000-4000-8000-000000000002',
            name: 'Apex Horizon Titanium Smartwatch',
            description: 'GPS smartwatch',
            price: '349.00',
            compareAtPrice: '399.00',
            category: 'Phones & Devices',
            images: [{ url: 'https://example.com/watch.jpg' }],
            stockQuantity: 30,
          },
          {
            id: 'p3',
            storeId: '00000000-0000-4000-8000-000000000002',
            name: 'AuraSound Wireless ANC Headphones',
            description: 'Noise cancelling headphones',
            price: '199.00',
            compareAtPrice: null,
            category: 'Electronics Accessories',
            images: [{ url: 'https://example.com/headphones.jpg' }],
            stockQuantity: 45,
          },
        ],
        total: 3,
        page: 1,
        limit: 60,
      }),
    stores: () =>
      of({
        data: [
          {
            id: '00000000-0000-4000-8000-000000000001',
            name: 'Aura Botanicals',
            slug: 'aura-botanicals',
            primaryCategory: 'Beauty & Skincare',
          },
          {
            id: '00000000-0000-4000-8000-000000000002',
            name: 'NexTech Electronics',
            slug: 'nextech-electronics',
            primaryCategory: 'Electronics',
          },
        ],
      }),
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        CatalogService,
        { provide: RentifyMarketplaceService, useValue: mockRentify },
      ],
    });
    service = TestBed.inject(CatalogService);
    await service.load();
  });

  it('maps products with taxonomy categorySlug and subcategorySlug', () => {
    const products = service.allProducts();
    expect(products.length).toBe(3);

    const cleanser = products.find((p) => p.name === 'Gentle Foaming Cleanser');
    expect(cleanser).toBeDefined();
    expect(cleanser?.categorySlug).toBe('beauty-wellness');
    expect(cleanser?.categoryName).toBe('Beauty & Wellness');
    expect(cleanser?.subcategory).toBe('Skincare');
    expect(cleanser?.subcategorySlug).toBe('skincare');
    expect(cleanser?.sellerName).toBe('Aura Botanicals');

    const smartwatch = products.find((p) => p.name === 'Apex Horizon Titanium Smartwatch');
    expect(smartwatch).toBeDefined();
    expect(smartwatch?.categorySlug).toBe('electronics');
    expect(smartwatch?.categoryName).toBe('Electronics');
    expect(smartwatch?.subcategory).toBe('Phones & Tablets');
    expect(smartwatch?.subcategorySlug).toBe('phones-tablets');

    const headphones = products.find((p) => p.name === 'AuraSound Wireless ANC Headphones');
    expect(headphones).toBeDefined();
    expect(headphones?.categorySlug).toBe('electronics');
    expect(headphones?.categoryName).toBe('Electronics');
    expect(headphones?.subcategory).toBe('Electronic Accessories');
    expect(headphones?.subcategorySlug).toBe('electronic-accessories');
  });

  it('computes accurate category and subcategory counts', () => {
    expect(service.countByCategory('beauty-wellness')).toBe(1);
    expect(service.countBySubcategory('beauty-wellness', 'skincare')).toBe(1);
    expect(service.countBySubcategory('beauty-wellness', 'makeup-cosmetics')).toBe(0);

    expect(service.countByCategory('electronics')).toBe(2);
    expect(service.countBySubcategory('electronics', 'phones-tablets')).toBe(1);
    expect(service.countBySubcategory('electronics', 'electronic-accessories')).toBe(1);
    expect(service.countByCategory('fashion')).toBe(0);
  });

  it('filters accurately via search query', () => {
    const beauty = service.search({ category: 'beauty-wellness' });
    expect(beauty.length).toBe(1);
    expect(beauty[0].name).toBe('Gentle Foaming Cleanser');

    const electronics = service.search({ category: 'electronics' });
    expect(electronics.length).toBe(2);

    const phones = service.search({ category: 'electronics', subcategory: 'phones-tablets' });
    expect(phones.length).toBe(1);
    expect(phones[0].name).toBe('Apex Horizon Titanium Smartwatch');
  });
});
