import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminService } from '../services/admin-data.service';
import { AuthService } from '../core/auth/auth.service';
import { IconComponent } from '../ui/icon.component';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
  <div class="admin">
    <aside class="sidebar">
      <div class="brand">
        <span class="logo" style="background:transparent">
          <img src="/assets/rentify-logo.webp" alt="Rentify Admin" style="width:26px;height:26px;border-radius:6px;object-fit:contain;display:block" />
        </span>
        <span class="brand-txt" style="font-size:13.5px;letter-spacing:-0.01em">Rentify Platform</span>
        <small>ADMIN</small>
      </div>

      @for (g of nav; track g.label) {
        <div class="nav-group">
          <div class="nav-label">{{g.label}}</div>
          <nav class="nav">
            @for (i of g.items; track i.path) {
              <a [routerLink]="i.path" routerLinkActive="active">
                <kc-icon [name]="i.icon" [size]="15"></kc-icon>
                <span class="txt">{{i.label}}</span>
                @if (count(i.path); as c) { <span class="nav-count">{{c}}</span> }
              </a>
            }
          </nav>
        </div>
      }

      <div class="sidebar-foot">
        <div class="foot-user">
          <span class="avatar">AD</span>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:12.5px">{{userName()}}</div>
            <div class="cell-sub">Platform Admin</div>
          </div>
          <button class="icon-btn" aria-label="Sign out" data-tip="Sign out" (click)="logout()">
            <kc-icon name="logout" [size]="14"></kc-icon>
          </button>
        </div>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="search-wrap">
          <div class="search-box">
            <kc-icon name="search" [size]="14"></kc-icon>
            <input placeholder="Search users, sellers, products, websites…"
              (input)="q.set($any($event.target).value)" (blur)="clearSoon()" />
          </div>
          @if (results().length) {
            <div class="results">
              @for (r of results(); track r.label) {
                <div class="result" (mousedown)="go(r)">
                  <span class="thumb">{{r.label[0]}}</span>
                  {{r.label}}
                  <span class="kind">{{r.kind}}</span>
                </div>
              }
            </div>
          }
        </div>
        <span class="spacer"></span>
        <a class="icon-btn" aria-label="Notifications" routerLink="/notifications">
          <kc-icon name="bell" [size]="15"></kc-icon>
          @if (data.notices().length) { <span class="dot"></span> }
        </a>
        <div class="who">
          <span class="avatar">AD</span>
          {{userName()}}
        </div>
      </header>

      <div class="content">
        <router-outlet></router-outlet>
      </div>
    </div>

    @if (data.toastMsg(); as t) {
      <div class="toast">{{t}}</div>
    }
  </div>`,
})
export class AdminLayoutComponent {
  data = inject(AdminService);
  auth = inject(AuthService);
  router = inject(Router);
  q = signal('');

  userName = computed(() => this.auth.user()?.name || 'Rentify Admin');

  nav = [
    {
      label: 'Overview',
      items: [
        { path: '/dashboard', icon: 'grid', label: 'Dashboard' },
      ],
    },
    {
      label: 'Platform & Storefronts',
      items: [
        { path: '/websites', icon: 'globe', label: 'Websites' },
        { path: '/templates', icon: 'layout', label: 'Templates' },
        { path: '/subscriptions', icon: 'package', label: 'Subscriptions' },
        { path: '/users', icon: 'user', label: 'Platform Users' },
      ],
    },
    {
      label: 'Marketplace',
      items: [
        { path: '/sellers', icon: 'store', label: 'Sellers' },
        { path: '/buyers', icon: 'users', label: 'Buyers' },
        { path: '/products', icon: 'box', label: 'Products' },
        { path: '/categories', icon: 'tag', label: 'Categories' },
        { path: '/orders', icon: 'cart', label: 'Orders' },
        { path: '/reviews', icon: 'star', label: 'Reviews' },
      ],
    },
    {
      label: 'Finance',
      items: [
        { path: '/payments', icon: 'card', label: 'Payments' },
        { path: '/transactions', icon: 'swap', label: 'Transactions' },
        { path: '/payouts', icon: 'wallet', label: 'Seller Payouts' },
      ],
    },
    {
      label: 'Monitoring & Disputes',
      items: [
        { path: '/complaints', icon: 'message', label: 'Disputes & Issues' },
        { path: '/reports', icon: 'flag', label: 'Reports' },
        { path: '/activity-logs', icon: 'pulse', label: 'Activity Logs' },
      ],
    },
    {
      label: 'System',
      items: [
        { path: '/notifications', icon: 'bell', label: 'Notifications' },
        { path: '/settings', icon: 'sliders', label: 'Settings' },
      ],
    },
  ];

  count(path: string): number | null {
    const d = this.data;
    const m: Record<string, number> = {
      '/sellers': d.sellers().filter((s) => s.status === 'pending').length,
      '/products': d.products().filter((p) => p.status === 'pending').length,
      '/reports': d.reports().filter((r) => r.status === 'open').length,
      '/complaints': d.complaints().filter((c) => c.status === 'open').length,
    };
    return m[path] || null;
  }

  results = computed(() => {
    const s = this.q().toLowerCase();
    if (s.length < 2) return [];
    const d = this.data;
    const out: { kind: string; label: string; path: string }[] = [];
    d.websites().forEach(
      (w) => w.name.toLowerCase().includes(s) && out.push({ kind: 'Website', label: w.name, path: '/websites' }),
    );
    d.templates().forEach(
      (t) => t.name.toLowerCase().includes(s) && out.push({ kind: 'Template', label: t.name, path: '/templates' }),
    );
    d.users().forEach(
      (u) => u.name.toLowerCase().includes(s) && out.push({ kind: 'User', label: u.name, path: '/users' }),
    );
    d.sellers().forEach(
      (x) => x.store.toLowerCase().includes(s) && out.push({ kind: 'Seller', label: x.store, path: '/sellers' }),
    );
    d.products().forEach(
      (p) => p.name.toLowerCase().includes(s) && out.push({ kind: 'Product', label: p.name, path: '/products' }),
    );
    d.orders().forEach(
      (o) => o.id.toLowerCase().includes(s) && out.push({ kind: 'Order', label: o.id, path: '/orders' }),
    );
    return out.slice(0, 7);
  });

  go(r: { label: string; path: string }) {
    this.router.navigate([r.path], { queryParams: { q: r.label } });
    this.q.set('');
  }

  clearSoon() {
    setTimeout(() => this.q.set(''), 150);
  }

  logout() {
    this.data.log('Admin signed out', 'active');
    this.auth.logout().subscribe();
  }
}
