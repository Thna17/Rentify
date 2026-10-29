import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { TranslateService } from '../core/i18n/translate.service';
import { IconComponent } from '../ui/icon.component';

@Component({
  selector: 'kc-admin-layout',
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
      <div class="main"><header class="topbar"><div><strong>Platform operations</strong><div class="cell-sub">Core identity and stores · Commerce catalog and orders</div></div><span class="spacer"></span>
        <button class="btn btn-default btn-sm lang-btn" (click)="toggleLanguage()" [title]="'Switch language'">
          <kc-icon name="globe" [size]="14"></kc-icon>
          <span>{{ currentLang() === 'en' ? 'ភាសាខ្មែរ (KM)' : 'English (EN)' }}</span>
        </button>
        <button class="btn btn-default btn-sm" (click)="refresh()">Refresh data</button>
      </header>
        <div class="content"><router-outlet></router-outlet></div>
      </div>
    </div>`,
  styles: [`
    .lang-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-right: 8px;
    }
  `]
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);

  readonly userName = computed(() => this.auth.user()?.name || 'Administrator');
  readonly currentLang = this.translate.currentLang;

  readonly nav = [
    { label: 'Overview', items: [
      { path: '/dashboard', icon: 'grid', label: 'Dashboard' },
      { path: '/analytics', icon: 'pulse', label: 'Analytics' },
    ] },
    { label: 'Trust & Operations', items: [
      { path: '/support/cases', icon: 'flag', label: 'Support & disputes' },
      { path: '/operations/catalog', icon: 'shield', label: 'Catalog moderation' },
      { path: '/operations/maker-checker', icon: 'swap', label: 'Maker-Checker approval' },
    ] },
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
    ] },
    { label: 'Billing & payments', items: [
      { path: '/subscriptions', icon: 'package', label: 'Subscriptions' },
      { path: '/packages', icon: 'tag', label: 'Plans' },
      { path: '/plan-payments', icon: 'card', label: 'Plan payments' },
      { path: '/billing', icon: 'wallet', label: 'Usage statements' },
      { path: '/payments', icon: 'swap', label: 'Customer payments' },
    ] },
    { label: 'Security & access', items: [
      { path: '/security', icon: 'shield', label: 'MFA & Recovery' },
      { path: '/sessions', icon: 'monitor', label: 'Active sessions' },
    ] },
  ];

  toggleLanguage(): void {
    this.translate.setLanguage(this.currentLang() === 'en' ? 'km' : 'en');
  }

  refresh(): void { window.location.reload(); }
  logout(): void { this.auth.logout().subscribe(); }
}
