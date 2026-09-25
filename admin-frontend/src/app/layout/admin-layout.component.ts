import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { IconComponent } from '../ui/icon.component';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="admin">
      <aside class="sidebar">
        <div class="brand"><span class="logo" style="background:transparent"><img src="/assets/rentify-logo.webp" alt="" width="26" height="26"></span><span>Rentify</span><small>ADMIN</small></div>
        @for (group of nav; track group.label) {
          <div class="nav-group"><div class="nav-label">{{group.label}}</div><nav class="nav">
            @for (item of group.items; track item.path) {
              <a [routerLink]="item.path" routerLinkActive="active"><kc-icon [name]="item.icon" [size]="15"></kc-icon><span>{{item.label}}</span></a>
            }
          </nav></div>
        }
        <div class="sidebar-foot"><div class="foot-user"><span class="avatar">AD</span><div style="flex:1;min-width:0"><b>{{userName()}}</b><div class="cell-sub">Platform admin</div></div><button class="icon-btn" aria-label="Sign out" (click)="logout()"><kc-icon name="logout" [size]="15"></kc-icon></button></div></div>
      </aside>
      <div class="main"><header class="topbar"><div><strong>Platform operations</strong><div class="cell-sub">Core identity and stores · Commerce catalog and orders</div></div><span class="spacer"></span><button class="btn btn-default btn-sm" (click)="refresh()">Refresh data</button></header>
        <div class="content"><router-outlet></router-outlet></div>
      </div>
    </div>`,
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);
  readonly userName = computed(() => this.auth.user()?.name || 'Administrator');
  readonly nav = [
    { label: 'Overview', items: [{ path: '/dashboard', icon: 'grid', label: 'Dashboard' }] },
    { label: 'Merchants & access', items: [
      { path: '/stores', icon: 'store', label: 'Stores & seller review' },
      { path: '/users', icon: 'users', label: 'Users' },
      { path: '/websites', icon: 'globe', label: 'Storefront websites' },
      { path: '/templates', icon: 'layout', label: 'Templates' },
    ] },
    { label: 'Commerce', items: [
      { path: '/products', icon: 'box', label: 'Shared catalog' },
      { path: '/orders', icon: 'cart', label: 'Orders' },
      { path: '/reviews', icon: 'star', label: 'Reviews' },
      { path: '/reports', icon: 'flag', label: 'Buyer reports' },
    ] },
    { label: 'Billing & payments', items: [
      { path: '/subscriptions', icon: 'package', label: 'Subscriptions' },
      { path: '/packages', icon: 'tag', label: 'Plans' },
      { path: '/plan-payments', icon: 'card', label: 'Plan payments' },
      { path: '/billing', icon: 'wallet', label: 'Usage statements' },
      { path: '/payments', icon: 'swap', label: 'Customer payments' },
    ] },
  ];
  refresh() { window.location.reload(); }
  logout() { this.auth.logout().subscribe(); }
}
