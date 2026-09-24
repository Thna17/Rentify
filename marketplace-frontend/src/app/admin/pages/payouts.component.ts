import { Component, inject, signal } from '@angular/core';
import { AdminService, Payout } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { StatComponent } from '../ui/stat.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { money, dstr } from '../ui/format';

@Component({
  standalone: true, imports: [BadgeComponent, StatComponent, ConfirmComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><h1 class="page-title">Seller Payouts</h1><p class="page-sub">Approve and track payouts to sellers</p></div></div>
    <div class="grid stats mb">
      <kc-stat label="Pending payouts" icon="pulse" [value]="pendingCount" [hint]="money(pendingSum) + ' awaiting'"></kc-stat>
      <kc-stat label="Completed" icon="check" [value]="doneCount" [hint]="money(doneSum) + ' paid out'"></kc-stat>
      <kc-stat label="Failed" icon="alert" [value]="failCount"></kc-stat>
    </div>
    <div class="card"><table class="tbl">
      <thead><tr><th>Seller</th><th class="right">Amount</th><th>Requested</th><th>Status</th><th class="right">Actions</th></tr></thead>
      <tbody>
        @for (p of d.payouts(); track p.id) {
          <tr>
            <td class="cell-main">{{p.seller}}</td><td class="num">{{money(p.amount)}}</td>
            <td class="cell-sub">{{dstr(p.requestedAt)}}</td><td><kc-badge [value]="p.status"></kc-badge></td>
            <td class="right"><div class="cell-actions">
              @if (p.status !== 'completed') {
                <button class="btn btn-sm btn-primary" (click)="confirm.set(p)">Mark completed</button>
              }
            </div></td>
          </tr>
        }
      </tbody>
    </table></div>

    @if (confirm(); as p) {
      <kc-confirm title="Complete payout?" [message]="money(p.amount) + ' will be marked as paid to ' + p.seller + '.'"
        confirmLabel="Complete" (confirm)="d.completePayout(p.id); confirm.set(null)" (cancel)="confirm.set(null)"></kc-confirm>
    }
  } @else { <div class="skel" style="height:320px"></div> }`,
})
export class PayoutsComponent {
  d = inject(AdminService);
  confirm = signal<Payout | null>(null);
  money = money; dstr = dstr;
  pendingCount = this.d.payouts().filter(p => p.status === 'pending').length;
  pendingSum = this.d.payouts().filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  doneCount = this.d.payouts().filter(p => p.status === 'completed').length;
  doneSum = this.d.payouts().filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  failCount = this.d.payouts().filter(p => p.status === 'failed').length;
}