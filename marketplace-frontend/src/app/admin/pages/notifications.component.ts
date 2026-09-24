import { Component, inject, signal } from '@angular/core';
import { AdminService } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { dstr } from '../ui/format';

@Component({
  standalone: true, imports: [BadgeComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><h1 class="page-title">Notifications</h1><p class="page-sub">Announcements sent to buyers and sellers</p></div>
      <button class="btn btn-primary" (click)="open = true">Create notification</button></div>

    <div class="card">
      @for (n of d.notices(); track n.id) {
        <div class="list-item" style="padding:14px 18px">
          <div style="flex:1"><div class="cell-main">{{n.title}}</div><div class="cell-sub">{{n.body}}</div></div>
          <kc-badge [value]="n.audience === 'Sellers' ? 'pending' : n.audience === 'Buyers' ? 'active' : 'approved'"></kc-badge>
          <span class="cell-sub" style="margin-left:10px">{{dstr(n.date)}}</span>
        </div>
      } @empty { <div class="empty">No notifications sent yet.</div> }
    </div>

    @if (open) {
      <div class="modal-back"><div class="modal">
        <h3>New notification</h3><p>Sends an in-app announcement immediately.</p>
        <div class="form-row"><label>Title</label><input class="input" [value]="title()" (input)="title.set($any($event.target).value)"/></div>
        <div class="form-row"><label>Message</label><input class="input" [value]="body()" (input)="body.set($any($event.target).value)"/></div>
        <div class="form-row"><label>Audience</label><select class="input" [value]="aud()" (change)="aud.set($any($event.target).value)">
          <option>Everyone</option><option>Buyers</option><option>Sellers</option></select></div>
        <div class="modal-actions">
          <button class="btn" (click)="open = false">Cancel</button>
          <button class="btn btn-primary" [disabled]="!title().trim()" (click)="send()">Send</button>
        </div>
      </div></div>
    }
  } @else { <div class="skel" style="height:280px"></div> }`,
})
export class NotificationsComponent {
  d = inject(AdminService);
  dstr = dstr;
  open = false;
  title = signal(''); body = signal(''); aud = signal('Everyone');
  send() {
    if (!this.title().trim()) return;
    this.d.sendNotice({ title: this.title().trim(), body: this.body().trim(), audience: this.aud() });
    this.open = false; this.title.set(''); this.body.set('');
  }
}