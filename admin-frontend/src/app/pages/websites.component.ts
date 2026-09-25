import { Component, computed, inject, signal } from '@angular/core';
import { AdminService, PlatformWebsite } from '../services/admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { IconComponent } from '../ui/icon.component';
import { MenuComponent, MenuItem } from '../ui/menu.component';
import { dstr, initials } from '../ui/format';

@Component({
  standalone: true,
  imports: [BadgeComponent, ConfirmComponent, IconComponent, MenuComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head">
      <div>
        <h1 class="page-title">Storefront Websites</h1>
        <p class="page-sub">Manage deployed merchant storefronts, domains, quotas and hosting status</p>
      </div>
    </div>

    <div class="toolbar">
      <div class="tabs">
        @for (t of ['all', 'active', 'suspended']; track t) {
          <button class="tab" [class.active]="tab() === t" (click)="tab.set(t)">
            {{t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)}}
          </button>
        }
      </div>
      <input class="input input-search" placeholder="Search website or merchant…" [value]="q()" (input)="q.set($any($event.target).value)"/>
    </div>

    <div class="card">
      <table class="tbl">
        <thead>
          <tr>
            <th>Storefront Website</th>
            <th>Domain</th>
            <th>Template</th>
            <th>Merchant Owner</th>
            <th class="right">Storage Used</th>
            <th class="right">Products</th>
            <th>Status</th>
            <th class="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (w of rows(); track w.id) {
            <tr>
              <td>
                <div class="cell-flex">
                  <span class="thumb">{{initials(w.name)}}</span>
                  <div>
                    <div class="cell-main">{{w.name}}</div>
                    <div class="cell-sub">Created {{dstr(w.createdAt)}}</div>
                  </div>
                </div>
              </td>
              <td>
                <a [href]="'https://' + w.domain" target="_blank" class="link cell-flex" style="gap:4px">
                  {{w.domain}} <kc-icon name="external" [size]="12"></kc-icon>
                </a>
              </td>
              <td>{{w.templateName}}</td>
              <td>
                <div class="cell-main">{{w.ownerName}}</div>
                <div class="cell-sub">{{w.ownerId}}</div>
              </td>
              <td class="num">
                {{w.currentUsage.storage}} / {{w.limits.storage}} MB
              </td>
              <td class="num">
                {{w.currentUsage.products}} / {{w.limits.products}}
              </td>
              <td><kc-badge [value]="w.status"></kc-badge></td>
              <td class="right">
                <div class="cell-actions">
                  <button class="icon-btn" aria-label="View Details" data-tip="View Details" (click)="sel.set(w)">
                    <kc-icon name="eye" [size]="14"></kc-icon>
                  </button>
                  <kc-menu [items]="menuFor(w)" (pick)="act($event, w)"></kc-menu>
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="8"><div class="empty">No storefront websites found.</div></td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (sel(); as w) {
      <div class="drawer-back" (click)="sel.set(null)"></div>
      <div class="drawer">
        <div class="drawer-head">
          <div><b>{{w.name}}</b> <kc-badge [value]="w.status"></kc-badge></div>
          <button class="icon-btn" aria-label="Close" (click)="sel.set(null)">
            <kc-icon name="x" [size]="14"></kc-icon>
          </button>
        </div>
        <div class="drawer-body">
          <div class="kv"><span class="k">Website ID</span>{{w.id}}</div>
          <div class="kv"><span class="k">Domain</span>{{w.domain}}</div>
          <div class="kv"><span class="k">Subdomain</span>{{w.subdomain}}</div>
          <div class="kv"><span class="k">Template</span>{{w.templateName}}</div>
          <div class="kv"><span class="k">Owner</span>{{w.ownerName}}</div>
          <div class="kv"><span class="k">Created</span>{{dstr(w.createdAt)}}</div>

          <div class="sect">Resource Limits & Quotas</div>
          <div class="kv"><span class="k">Staff Seats</span>{{w.currentUsage.staff}} of {{w.limits.staff}} active</div>
          <div class="kv"><span class="k">Storage</span>{{w.currentUsage.storage}} of {{w.limits.storage}} MB</div>
          <div class="kv"><span class="k">Products</span>{{w.currentUsage.products}} of {{w.limits.products}} listed</div>

          <div class="sect" style="margin-top:20px">Actions</div>
          <div class="cell-flex" style="gap:8px;margin-top:10px">
            @if (w.status === 'active') {
              <button class="btn btn-danger" (click)="act('suspend', w); sel.set(null)">Suspend Storefront</button>
            } @else {
              <button class="btn btn-primary" (click)="act('reactivate', w); sel.set(null)">Reactivate Storefront</button>
            }
          </div>
        </div>
      </div>
    }

    @if (confirm(); as c) {
      <kc-confirm title="Are you sure?" [message]="c.msg" (confirm)="c.fn(); confirm.set(null)" (cancel)="confirm.set(null)"></kc-confirm>
    }
  } @else {
    <div class="skel" style="height:360px"></div>
  }`,
})
export class WebsitesComponent {
  d = inject(AdminService);
  q = signal('');
  tab = signal('all');
  sel = signal<PlatformWebsite | null>(null);
  confirm = signal<{ fn: () => void; msg: string } | null>(null);
  dstr = dstr;
  initials = initials;

  rows = computed(() =>
    this.d.websites().filter(
      (w) =>
        (this.tab() === 'all' || w.status === this.tab()) &&
        (!this.q() ||
          w.name.toLowerCase().includes(this.q().toLowerCase()) ||
          w.domain.toLowerCase().includes(this.q().toLowerCase()) ||
          w.ownerName.toLowerCase().includes(this.q().toLowerCase())),
    ),
  );

  menuFor(w: PlatformWebsite): MenuItem[] {
    const m: MenuItem[] = [];
    if (w.status === 'active') {
      m.push({ label: 'Suspend Website', icon: 'ban', danger: true, action: 'suspend' });
    } else {
      m.push({ label: 'Reactivate Website', icon: 'refresh', action: 'reactivate' });
    }
    return m;
  }

  act(action: string, w: PlatformWebsite) {
    if (action === 'reactivate') {
      this.d.setWebsiteStatus(w.id, 'active');
    }
    if (action === 'suspend') {
      this.confirm.set({
        fn: () => this.d.setWebsiteStatus(w.id, 'suspended'),
        msg: `Suspend storefront website "${w.name}" (${w.domain})? Shoppers will receive a temporary offline page.`,
      });
    }
  }
}
