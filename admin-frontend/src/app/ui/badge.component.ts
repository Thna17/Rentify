import { Component, input } from '@angular/core';

const GREEN = ['active', 'approved', 'completed', 'verified', 'resolved', 'visible', 'paid', 'live', 'published'];
const AMBER = ['pending', 'processing', 'investigating', 'refunded', 'trial', 'reviewing'];
const RED = ['suspended', 'rejected', 'failed', 'cancelled', 'hidden', 'open', 'deactivated', 'expired', 'past_due'];

@Component({
  selector: 'kc-badge',
  standalone: true,
  template: `<span [class]="'badge t-' + tone">{{value()}}</span>`,
})
export class BadgeComponent {
  value = input.required<string>();
  get tone() {
    const v = (this.value() || '').toLowerCase();
    return GREEN.includes(v) ? 'green' : AMBER.includes(v) ? 'amber' : RED.includes(v) ? 'red' : 'gray';
  }
}
