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
        border-radius: var(--radius-full);
        font-size: 11.5px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      .neutral {
        background: var(--color-bg-alt);
        color: var(--color-text-secondary);
      }
      .info {
        background: var(--color-accent-soft);
        color: var(--color-accent);
      }
      .warn {
        background: rgba(184, 134, 42, 0.12);
        color: var(--color-gold);
      }
      .good {
        background: var(--color-success-soft);
        color: var(--color-success);
      }
      .bad {
        background: var(--color-danger-soft);
        color: var(--color-danger);
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
