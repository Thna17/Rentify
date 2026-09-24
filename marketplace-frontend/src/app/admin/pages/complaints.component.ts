import { Component, inject } from '@angular/core';
import { AdminService, Complaint } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { MenuComponent, MenuItem } from '../ui/menu.component';
import { dstr } from '../ui/format';

@Component({
  standalone: true, imports: [BadgeComponent, MenuComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><h1 class="page-title">Complaints</h1><p class="page-sub">Order complaints from buyers and sellers</p></div></div>
    <div class="card"><table class="tbl">
      <thead><tr><th>Order</th><th>From</th><th>Subject</th><th>Date</th><th>Status</th><th class="right">Actions</th></tr></thead>
      <tbody>
        @for (c of d.complaints(); track c.id) {
          <tr>
            <td class="cell-main">{{c.order}}</td><td>{{c.from}}</td><td>{{c.subject}}</td>
            <td class="cell-sub">{{dstr(c.date)}}</td><td><kc-badge [value]="c.status"></kc-badge></td>
            <td class="right"><div class="cell-actions">
              @if (c.status !== 'resolved') {
                                <kc-menu [items]="menuFor(c)" (pick)="act($event, c)"></kc-menu>
              }
            </div></td>
          </tr>
        }
      </tbody>
    </table></div>
  } @else { <div class="skel" style="height:280px"></div> }`,
})
export class ComplaintsComponent {
  d = inject(AdminService);
  dstr = dstr;
    act(action: string, c: Complaint) { this.d.setComplaintStatus(c.id, action as Complaint['status']); }
  menuFor(c: Complaint): MenuItem[] {
    const m: MenuItem[] = [];
    if (c.status === 'open') m.push({ label: 'Start investigating', icon: 'search', action: 'investigating' });
    m.push({ label: 'Mark resolved', icon: 'check', action: 'resolved' });
    return m;
  }
}