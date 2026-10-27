import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, ProductVariantView, ProductOptionView } from '../../../../core/catalog/catalog.models';
import { TranslateService } from '../../../../core/i18n/translate.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-variant-picker',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (hasMultipleVariants()) {
      <div class="variant-groups" role="region" [attr.aria-label]="t('product.variant')">
        @for (option of options(); track option.name) {
          <div class="option-group" role="radiogroup" [attr.aria-label]="t('product.selectOption', { name: option.name })">
            <div class="option-header">
              <span class="option-title">{{ option.name }}</span>
              <span class="option-current">{{ selectedOptions()[option.name] || '' }}</span>
            </div>
            <div class="pill-list">
              @for (val of option.values; track val) {
                <button
                  type="button"
                  class="pill-btn"
                  role="radio"
                  [class.selected]="selectedOptions()[option.name] === val"
                  [class.out-of-stock]="isOptionCombinationOos(option.name, val)"
                  [attr.aria-checked]="selectedOptions()[option.name] === val"
                  [attr.aria-disabled]="isOptionCombinationOos(option.name, val)"
                  (click)="selectOption(option.name, val)"
                  [title]="isOptionCombinationOos(option.name, val) ? t('catalog.outOfStock') : val"
                >
                  <span class="pill-text">{{ val }}</span>
                  @if (isOptionCombinationOos(option.name, val)) {
                    <span class="oos-tag" aria-hidden="true">{{ t('catalog.outOfStock') }}</span>
                  }
                </button>
              }
            </div>
          </div>
        }
      </div>
    }

    <div class="sku-meta-row" aria-live="polite">
      <div class="sku-item">
        <span class="meta-label">{{ t('product.sku') }}:</span>
        <code class="sku-code">{{ currentSku() }}</code>
      </div>

      @if (activeVariant(); as v) {
        @if (v.stockQuantity > 0 && v.stockQuantity <= 5) {
          <div class="low-stock-alert">
            <ui-icon name="alert-circle" [size]="14" />
            <span>{{ t('catalog.lowStock', { count: v.stockQuantity }) }}</span>
          </div>
        } @else if (v.stockQuantity === 0) {
          <div class="oos-alert">
            <span>{{ t('catalog.outOfStock') }}</span>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .variant-groups {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin: 14px 0 10px;
      }
      .option-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .option-header {
        display: flex;
        align-items: baseline;
        gap: 8px;
        font-size: 13.5px;
      }
      .option-title {
        font-weight: 600;
        color: var(--color-text);
      }
      .option-current {
        font-size: 13px;
        color: var(--color-accent);
        font-weight: 600;
      }
      .pill-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .pill-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        min-height: 40px;
        border: 1.5px solid var(--color-border);
        border-radius: var(--radius-sm, 6px);
        background: var(--color-surface, #fff);
        color: var(--color-text);
        font-size: 13.5px;
        font-weight: 500;
        cursor: pointer;
        transition: all 140ms ease;
        outline: none;
      }
      .pill-btn:hover:not(:disabled) {
        border-color: var(--color-text);
      }
      .pill-btn:focus-visible {
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px rgba(200, 90, 40, 0.2);
      }
      .pill-btn.selected {
        border-color: var(--color-accent);
        background: var(--color-accent-soft, rgba(200, 90, 40, 0.08));
        color: var(--color-accent);
        font-weight: 700;
      }
      .pill-btn.out-of-stock {
        opacity: 0.65;
        border-style: dashed;
        color: var(--color-muted);
      }
      .oos-tag {
        font-size: 10px;
        text-transform: uppercase;
        font-weight: 700;
        color: var(--color-danger, #d6362c);
        margin-left: 4px;
      }
      .sku-meta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 8px;
        padding-top: 10px;
        border-top: 1px solid var(--color-border);
      }
      .sku-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--color-muted);
      }
      .sku-code {
        font-family: var(--font-mono, monospace);
        background: var(--color-bg-alt, #f5f5f7);
        padding: 2px 6px;
        border-radius: 4px;
        color: var(--color-text);
        font-weight: 600;
        letter-spacing: 0.02em;
      }
      .low-stock-alert {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 12.5px;
        font-weight: 600;
        color: var(--color-danger, #d6362c);
      }
      .oos-alert {
        font-size: 12px;
        font-weight: 700;
        color: var(--color-danger, #d6362c);
        text-transform: uppercase;
      }
    `,
  ],
})
export class VariantPickerComponent {
  private readonly translate = inject(TranslateService);

  readonly product = input.required<Product>();
  readonly selectedVariantId = input<string | null | undefined>(null);

  readonly variantChange = output<ProductVariantView>();
  readonly skuChange = output<string>();

  readonly selectedOptions = signal<Record<string, string>>({});

  protected readonly options = computed<ProductOptionView[]>(() => {
    const p = this.product();
    if (p.options && p.options.length > 0) return p.options;
    if (p.productVariants && p.productVariants.length > 0) {
      const map = new Map<string, Set<string>>();
      for (const v of p.productVariants) {
        for (const [k, val] of Object.entries(v.optionValues)) {
          if (!map.has(k)) map.set(k, new Set());
          map.get(k)!.add(val);
        }
      }
      return Array.from(map.entries()).map(([name, set]) => ({
        name,
        values: Array.from(set),
      }));
    }
    return [];
  });

  protected readonly hasMultipleVariants = computed(() => {
    const p = this.product();
    return Boolean(
      p.hasVariants ||
        (p.productVariants && p.productVariants.length > 1) ||
        this.options().length > 0,
    );
  });

  protected readonly activeVariant = computed<ProductVariantView | null>(() => {
    const p = this.product();
    const variants = p.productVariants || [];
    if (variants.length === 0) return null;

    const selections = this.selectedOptions();
    const optNames = Object.keys(selections);
    if (optNames.length === 0) {
      return variants.find((v) => v.isDefault) || variants[0] || null;
    }

    // Find variant matching all selections
    const matched = variants.find((v) =>
      optNames.every((name) => v.optionValues[name] === selections[name]),
    );

    return matched || variants.find((v) => v.isDefault) || variants[0] || null;
  });

  readonly currentSku = computed<string>(() => {
    const active = this.activeVariant();
    if (active) return active.sku;
    const p = this.product();
    return p.sku || `SKU-${p.id.slice(0, 8).toUpperCase()}`;
  });

  constructor() {
    // Initialize default selections when product changes
    effect(() => {
      const p = this.product();
      const variants = p.productVariants || [];
      const incomingId = this.selectedVariantId();

      let defaultVariant = variants.find((v) => v.id === incomingId);
      if (!defaultVariant) {
        defaultVariant = variants.find((v) => v.isDefault) || variants[0];
      }

      if (defaultVariant && defaultVariant.optionValues) {
        this.selectedOptions.set({ ...defaultVariant.optionValues });
      }
    });

    // Notify parent whenever resolved variant changes
    effect(() => {
      const variant = this.activeVariant();
      if (variant) {
        this.variantChange.emit(variant);
        this.skuChange.emit(variant.sku);
      } else {
        this.skuChange.emit(this.currentSku());
      }
    });
  }

  selectOption(name: string, value: string): void {
    this.selectedOptions.update((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  isOptionCombinationOos(name: string, value: string): boolean {
    const p = this.product();
    const variants = p.productVariants || [];
    if (variants.length === 0) return false;

    const hypothetic = { ...this.selectedOptions(), [name]: value };
    const matched = variants.find((v) =>
      Object.entries(hypothetic).every(([k, val]) => v.optionValues[k] === val),
    );

    if (matched) {
      return matched.stockQuantity === 0 || matched.status === 'out-of-stock';
    }
    return false;
  }

  protected t(key: string, params?: Record<string, string | number>): string {
    return this.translate.t(key, params);
  }
}
