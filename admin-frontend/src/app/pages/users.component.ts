import { Component, computed, inject, signal } from '@angular/core';
import { AdminService, PlatformUser } from '../services/admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { MenuComponent, MenuItem } from '../ui/menu.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { dstr, initials } from '../ui/format';

@Component({
  standalone: true,
  imports: [BadgeComponent, MenuComponent, ConfirmComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head">
      <div>
        <h1 class="page-title">Platform Users</h1>
        <p class="page-sub">Manage platform administrators, merchants, staff and customer accounts</p>
      </div>
    </div>

    <div class="toolbar">
      <div class="tabs">
        @for (t of ['all', 'admin', 'user', 'staff']; track t) {
          <button class="tab" [class.active]="tab() === t" (click)="tab.set(t)">
            {{t === 'all' ? 'All Roles' : t[0].toUpperCase() + t.slice(1)}}
          </button>
        }
      </div>
      <input class="input input-search" placeholder="Search user name or email…" [value]="q()" (input)="q.set($any($event.target).value)"/>
    </div>

    <div class="card">
      <table class="tbl">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Verification</th>
            <th>Status</th>
            <th>Registered</th>
            <th class="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (u of rows(); track u.id) {
            <tr>
              <td>
                <div class="cell-flex">
                  <span class="thumb">{{initials(u.name)}}</span>
                  <div class="cell-main">{{u.name}}</div>
                </div>
              </td>
              <td>{{u.email}}</td>
              <td>{{u.phone || '—'}}</td>
              <td>
                <span class="badge" [class.t-amber]="u.role === 'admin'" [class.t-green]="u.role === 'user'" [class.t-gray]="u.role === 'staff'">
                  {{u.role.toUpperCase()}}
                </span>
              </td>
              <td>
                <kc-badge [value]="u.isVerified ? 'verified' : 'pending'"></kc-badge>
              </td>
              <td><kc-badge [value]="u.status"></kc-badge></td>
              <td>{{dstr(u.registeredAt)}}</td>
              <td class="right">
                <div class="cell-actions">
                  <kc-menu [items]="menuFor(u)" (pick)="act($event, u)"></kc-menu>
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="8"><div class="empty">No users found.</div></td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (confirm(); as c) {
      <kc-confirm title="User update" [message]="c.msg" (confirm)="c.fn(); confirm.set(null)" (cancel)="confirm.set(null)"></kc-confirm>
    }
  } @else {
    <div class="skel" style="height:360px"></div>
  }`,
})
export class UsersComponent {
  d = inject(AdminService);
  dstr = dstr;
  initials = initials;
  q = signal('');
  tab = signal('all');
  confirm = signal<{ fn: () => void; msg: string } | null>(null);

  rows = computed(() =>
    this.d.users().filter(
      (u) =>
        (this.tab() === 'all' || u.role === this.tab()) &&
        (!this.q() ||
          u.name.toLowerCase().includes(this.q().toLowerCase()) ||
          u.email.toLowerCase().includes(this.q().toLowerCase())),
    ),
  );

  menuFor(u: PlatformUser): MenuItem[] {
    const items: MenuItem[] = [];
    if (u.status === 'active') {
      items.push({ label: 'Suspend User', icon: 'ban', danger: true, action: 'suspend' });
    } else {
      items.push({ label: 'Reactivate User', icon: 'refresh', action: 'reactivate' });
    }
    if (u.role !== 'admin') {
      items.push({ label: 'Grant Admin Role', icon: 'shield', action: 'make-admin' });
    } else {
      items.push({ label: 'Revoke Admin Role', icon: 'user', action: 'revoke-admin' });
    }
    return items;
  }

  act(action: string, u: PlatformUser) {
    if (action === 'suspend') {
      this.confirm.set({
        fn: () => this.d.setUserStatus(u.id, 'suspended'),
        msg: `Suspend user "${u.name}" (${u.email})? They will not be able to log in.`,
      });
    } else if (action === 'reactivate') {
      this.d.setUserStatus(u.id, 'active');
    } else if (action === 'make-admin') {
      this.confirm.set({
        fn: () => this.d.setUserRole(u.id, 'admin'),
        msg: `Grant Platform Admin permissions to "${u.name}"?`,
      });
    } else if (action === 'revoke-admin') {
      this.confirm.set({
        fn: () => this.d.setUserRole(u.id, 'user'),
        msg: `Revoke Platform Admin role from "${u.name}"?`,
      });
    }
  }
}
