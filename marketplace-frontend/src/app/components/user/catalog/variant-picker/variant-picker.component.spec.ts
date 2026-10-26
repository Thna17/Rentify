import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VariantPickerComponent } from './variant-picker.component';
import { Product } from '../../../../core/catalog/catalog.models';
import { TranslateService } from '../../../../core/i18n/translate.service';

describe('VariantPickerComponent', () => {
  let component: VariantPickerComponent;
  let fixture: ComponentFixture<VariantPickerComponent>;

  const mockProductWithVariants: Product = {
    id: 'prod-scarf',
    name: 'Silk Ikat Scarf',
    slug: 'silk-ikat-scarf',
    sku: 'SILK-SCARF-DEF',
    price: 45.0,
    hasVariants: true,
    image: null,
    categorySlug: 'clothing',
    categoryName: 'Clothing',
    subcategory: null,
    subcategorySlug: null,
    sellerName: 'Silk Workshop',
    storeId: 'store-1',
    rating: 4.8,
    reviewCount: 10,
    stock: 20,
    status: 'in-stock',
    description: 'Fine silk scarf',
    soldCount: 5,
    createdAt: new Date().toISOString(),
    collections: [],
    productVariants: [
      {
        id: 'var-red-s',
        productId: 'prod-scarf',
        sku: 'SILK-SCARF-RED-S',
        price: 45.0,
        stockQuantity: 8,
        isDefault: true,
        optionValues: { Color: 'Red', Size: 'S' },
        status: 'active',
      },
      {
        id: 'var-blue-m',
        productId: 'prod-scarf',
        sku: 'SILK-SCARF-BLU-M',
        price: 50.0,
        stockQuantity: 0, // out of stock
        isDefault: false,
        optionValues: { Color: 'Blue', Size: 'M' },
        status: 'out-of-stock',
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VariantPickerComponent],
      providers: [TranslateService],
    }).compileComponents();

    fixture = TestBed.createComponent(VariantPickerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('product', mockProductWithVariants);
    fixture.detectChanges();
  });

  it('initializes with default variant and resolves its SKU', () => {
    expect(component.currentSku()).toBe('SILK-SCARF-RED-S');
    expect(component.selectedOptions()).toEqual({ Color: 'Red', Size: 'S' });
  });

  it('updates selection and resolves matching SKU on option change', () => {
    let emittedSku = '';
    component.skuChange.subscribe((sku) => (emittedSku = sku));

    component.selectOption('Color', 'Blue');
    component.selectOption('Size', 'M');
    fixture.detectChanges();

    expect(component.currentSku()).toBe('SILK-SCARF-BLU-M');
    expect(emittedSku).toBe('SILK-SCARF-BLU-M');
  });

  it('detects out-of-stock combinations accurately', () => {
    // Red S has 8 stock
    expect(component.isOptionCombinationOos('Color', 'Red')).toBe(false);
    // Switch to Blue and M
    component.selectOption('Color', 'Blue');
    expect(component.isOptionCombinationOos('Size', 'M')).toBe(true);
  });

  it('falls back to product SKU for simple products without variants', () => {
    const simpleProduct: Product = {
      ...mockProductWithVariants,
      id: 'prod-simple',
      sku: 'SIMPLE-BASKET-001',
      hasVariants: false,
      productVariants: [],
      options: [],
    };
    fixture.componentRef.setInput('product', simpleProduct);
    fixture.detectChanges();

    expect(component.currentSku()).toBe('SIMPLE-BASKET-001');
  });
});
