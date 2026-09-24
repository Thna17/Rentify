import { Component, computed, inject, signal } from '@angular/core';
import { AdminService } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { money, dstr } from '../ui/format';

@Component({
  standalone: true, imports: [BadgeComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><h1 class="page-title">Transactions</h1><p class="page-sub">Commissions, boost fees, payouts and refunds</p></div>
      <b>Net: {{money(net())}}</b></div>
    <div class="toolbar">
      <select class="input" [value]="type()" (change)="type.set($any($event.target).value)">
        <option value="all">All types</option><option>Commission</option><option>Boost fee</option>
        <option>Payout</option><option>Refund</option>
      </select>
    </div>
    <div class="card"><table class="tbl">
      <thead><tr><th>Type</th><th>Description</th><th class="right">Amount</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>
        @for (t of rows(); track t.id) {
          <tr>
            <td><kc-badge [value]="t.dir === 'in' ? 'active' : 'cancelled'"></kc-badge> {{t.type}}</td>
            <td>{{t.description}}</td>
            <td class="num" [style.color]="t.dir === 'in' ? 'var(--green)' : 'var(--red)'">{{t.dir === 'in' ? '+' : '−'}}{{money(t.amount)}}</td>
            <td><kc-badge [value]="t.status"></kc-badge></td><td class="cell-sub">{{dstr(t.date)}}</td>
          </tr>
        } @empty { <tr><td colspan="5"><div class="empty">No transactions of this type.</div></td></tr> }
      </tbody>
    </table></div>
  } @else { <div class="skel" style="height:320px"></div> }`,
})
export class TransactionsComponent {
  d = inject(AdminService);
  type = signal('all');
  money = money; dstr = dstr;
  rows = computed(() => this.d.txs().filter(t => this.type() === 'all' || t.type === this.type()));
  net = computed(() => this.d.txs().filter(t => t.status === 'completed').reduce((s, t) => s + (t.dir === 'in' ? t.amount : -t.amount), 0));
}