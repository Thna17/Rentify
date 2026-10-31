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

@Component({
  selector: 'app-variant-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (hasMultipleVariants()) {
      <div class="variant-groups" role="region" [attr.aria-label]="t('product.variant')">
        @for (option of options(); track option.name) {
          <div class="option-group" role="radiogroup" [attr.aria-label]="t('product.selectOption', { name: option.name })">
            <div class="option-header">
              <span class="option-title">{{ option.name }}</span>
              @if (selectedOptions()[option.name]; as chosen) {
                <span class="option-current">{{ chosen }}</span>
              }
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
                  [disabled]="isOptionCombinationOos(option.name, val)"
                  (click)="selectOption(option.name, val)"
                  [title]="isOptionCombinationOos(option.name, val) ? t('catalog.outOfStock') : val"
                >
                  <span class="pill-text">{{ val }}</span>
                  @if (isOptionCombinationOos(option.name, val)) {
                    <span class="sr-only">{{ t('catalog.outOfStock') }}</span>
                  }
                </button>
              }
            </div>
          </div>
        }
      </div>
    }

    <!-- Stock for the chosen variant is shown once by the page; this row only
         carries the SKU, kept quiet as reference information. -->
    <p class="sku-meta" aria-live="polite">
      <span class="meta-label">{{ t('product.sku') }}</span>
      <code class="sku-code">{{ currentSku() }}</code>
    </p>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .variant-groups {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .option-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
      }
      .option-header {
        display: flex;
        align-items: baseline;
        gap: 8px;
        font-size: 13px;
        line-height: 1.3;
      }
      .option-title {
        font-weight: 600;
        color: var(--color-text-secondary);
      }
      .option-current {
        color: var(--color-text);
        font-weight: 500;
        overflow-wrap: anywhere;
      }
      .option-current::before {
        content: '·';
        margin-right: 8px;
        color: var(--color-muted-2);
      }
      .pill-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .pill-btn {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 52px;
        min-height: 44px;
        max-width: 100%;
        padding: 0 16px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-md);
        background: var(--color-surface);
        color: var(--color-text);
        font-size: 13.5px;
        font-weight: 500;
        line-height: 1.2;
        cursor: pointer;
        transition: border-color var(--dur-fast) ease, box-shadow var(--dur-fast) ease,
          background var(--dur-fast) ease, color var(--dur-fast) ease;
      }
      .pill-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .pill-btn:hover:not(:disabled):not(.selected) {
        border-color: var(--color-text-secondary);
      }
      .pill-btn:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
      }
      /* The inset ring thickens the border to 2px without nudging the layout. */
      .pill-btn.selected {
        border-color: var(--color-accent);
        box-shadow: inset 0 0 0 1px var(--color-accent);
        background: var(--color-accent-soft);
        color: var(--color-text);
        font-weight: 600;
      }
      .pill-btn.out-of-stock {
        border-style: dashed;
        border-color: var(--color-border-strong);
        background: var(--color-bg-alt);
        color: var(--color-muted-2);
        cursor: not-allowed;
      }
      .pill-btn.out-of-stock .pill-text {
        text-decoration: line-through;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
      .sku-meta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin: 0;
        font-size: 11.5px;
        color: var(--color-muted);
      }
      .meta-label {
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .sku-code {
        font-family: var(--rentify-font-family-mono, monospace);
        color: var(--color-text-secondary);
        letter-spacing: 0.02em;
        overflow-wrap: anywhere;
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
    if (this.isOptionCombinationOos(name, value)) return;
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
    return true;
  }

  protected t(key: string, params?: Record<string, string | number>): string {
    return this.translate.t(key, params);
  }
}
