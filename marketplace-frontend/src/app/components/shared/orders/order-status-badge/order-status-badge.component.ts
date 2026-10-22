import { Component, computed, input } from '@angular/core';
import { OrderStatus, PaymentStatus } from '../../../../core/api/api.models';

/** Shared status pill, so buyer and seller views cannot drift apart. */
@Component({
  selector: 'app-order-status',
  template: `<span class="pill" [class]="'pill ' + tone()">{{ label() }}</span>`,
  styles: [
    `
      .pill {
        display: inline-flex;
        align-items: center;
        padding: 4px 11px;
        border-radius: var(--rentify-radius-full, var(--radius-full, 9999px));
        font-size: var(--rentify-font-size-xs, 11.5px);
        font-weight: var(--rentify-font-weight-bold, 700);
        letter-spacing: 0.02em;
        border: 1px solid transparent;
      }
      .neutral {
        background: var(--rentify-color-surface-subtle, var(--color-bg-alt));
        color: var(--rentify-color-text-secondary, var(--color-text-secondary));
        border-color: var(--rentify-color-border-subtle, var(--color-border));
      }
      .info {
        background: var(--rentify-color-info-subtle, var(--color-accent-soft));
        color: var(--rentify-color-info-text, var(--color-accent));
        border-color: var(--rentify-color-info-border, transparent);
      }
      .warn {
        background: var(--rentify-color-warning-subtle, rgba(184, 134, 42, 0.12));
        color: var(--rentify-color-warning-text, var(--color-gold));
        border-color: var(--rentify-color-warning-border, transparent);
      }
      .good {
        background: var(--rentify-color-success-subtle, var(--color-success-soft));
        color: var(--rentify-color-success-text, var(--color-success));
        border-color: var(--rentify-color-success-border, transparent);
      }
      .bad {
        background: var(--rentify-color-danger-subtle, var(--color-danger-soft));
        color: var(--rentify-color-danger-text, var(--color-danger));
        border-color: var(--rentify-color-danger-border, transparent);
      }
    `,
  ],
})
export class OrderStatusBadgeComponent {
  readonly status = input.required<OrderStatus | PaymentStatus>();

  protected readonly label = computed(() => {
    const raw = this.status();
    return raw.charAt(0) + raw.slice(1).toLowerCase();
  });

  protected readonly tone = computed(() => {
    switch (this.status()) {
      case 'PENDING':
        return 'warn';
      case 'CONFIRMED':
      case 'SHIPPED':
        return 'info';
      case 'DELIVERED':
      case 'PAID':
        return 'good';
      case 'CANCELLED':
      case 'FAILED':
        return 'bad';
      default:
        return 'neutral';
    }
  });
}
