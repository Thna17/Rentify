import { Component, computed, inject, signal } from '@angular/core';
import { AdminService, Payment } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { StatComponent } from '../ui/stat.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { MenuComponent } from '../ui/menu.component';
import { dstr, money } from '../ui/format';

@Component({
  standalone: true, imports: [BadgeComponent, StatComponent, ConfirmComponent, MenuComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><h1 class="page-title">Payments</h1><p class="page-sub">Order payments, failures and refunds</p></div></div>
    <div class="grid stats mb">
      <kc-stat label="Collected" icon="card" [value]="money(collected())"></kc-stat>
      <kc-stat label="Pending" icon="pulse" [value]="money(pending())"></kc-stat>
      <kc-stat label="Failed" icon="alert" [value]="failed()"></kc-stat>
      <kc-stat label="Refunded" icon="swap" [value]="money(refunded())"></kc-stat>
    </div>
    <div class="card"><table class="tbl">
      <thead><tr><th>Payment</th><th>Order</th><th>Buyer</th><th>Method</th><th class="right">Amount</th><th>Status</th><th>Date</th><th class="right">Actions</th></tr></thead>
      <tbody>
        @for (p of d.payments(); track p.id) {
          <tr>
            <td class="cell-main">{{p.id}}</td><td class="cell-sub">{{p.order}}</td><td>{{p.buyer}}</td>
            <td class="cell-sub">{{p.method}}</td><td class="num">{{money(p.amount)}}</td>
            <td><kc-badge [value]="p.status"></kc-badge></td><td class="cell-sub">{{dstr(p.date)}}</td>
            <td class="right"><div class="cell-actions">
              @if (p.status === 'completed') {
                <kc-menu [items]="[{label: 'Refund payment', icon: 'swap', danger: true, action: 'refund'}]" (pick)="refund.set(p)"></kc-menu>
              }
            </div></td>
          </tr>
        }
      </tbody>
    </table></div>

    @if (refund(); as p) {
      <kc-confirm title="Refund payment?" [message]="money(p.amount) + ' will be refunded to ' + p.buyer + ' for ' + p.order + '.'"
        confirmLabel="Refund" (confirm)="d.refundPayment(p.id); refund.set(null)" (cancel)="refund.set(null)"></kc-confirm>
    }
  } @else { <div class="skel" style="height:320px"></div> }`,
})
export class PaymentsComponent {
  d = inject(AdminService);
  refund = signal<Payment | null>(null);
  money = money; dstr = dstr;
  collected = computed(() => this.d.payments().filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0));
  pending = computed(() => this.d.payments().filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0));
  refunded = computed(() => this.d.payments().filter(p => p.status === 'refunded').reduce((s, p) => s + p.amount, 0));
  failed = computed(() => this.d.payments().filter(p => p.status === 'failed').length);
}