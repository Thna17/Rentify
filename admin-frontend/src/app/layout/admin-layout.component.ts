import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { TranslateService } from '../core/i18n/translate.service';
import { IconComponent } from '../ui/icon.component';
import { TranslatePipe } from '../core/i18n/translate.pipe';

@Component({
  selector: 'kc-admin-layout',
  standalone: true,
  imports: [TranslatePipe, RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="admin">
      <aside class="sidebar">
        <div class="brand"><span class="logo" style="background:transparent"><img src="/assets/rentify-logo.webp" alt="" width="26" height="26"></span><span>Rentify</span><small>ADMIN</small></div>
        @for (group of nav; track group.label) {
          <div class="nav-group"><div class="nav-label">{{group.label | translate}}</div><nav class="nav">
            @for (item of group.items; track item.path) {
              <a [routerLink]="item.path" routerLinkActive="active"><kc-icon [name]="item.icon" [size]="15"></kc-icon><span>{{item.label | translate}}</span></a>
            }
          </nav></div>
        }
        <div class="sidebar-foot"><div class="foot-user"><span class="avatar">AD</span><div style="flex:1;min-width:0"><b>{{userName()}}</b><div class="cell-sub">{{ 'nav.platformAdmin' | translate }}</div></div><button class="icon-btn" [attr.aria-label]="'nav.signOut' | translate" (click)="logout()"><kc-icon name="logout" [size]="15"></kc-icon></button></div></div>
      </aside>
      <div class="main"><header class="topbar"><div><strong>{{ 'nav.platformOperations' | translate }}</strong><div class="cell-sub">{{ 'nav.shellSubtitle' | translate }}</div></div><span class="spacer"></span>
        <button class="btn btn-default btn-sm lang-btn" (click)="toggleLanguage()" [title]="'nav.switchLanguage' | translate">
          <kc-icon name="globe" [size]="14"></kc-icon>
          <span>{{ currentLang() === 'en' ? 'ភាសាខ្មែរ' : 'English' }}</span>
        </button>
        <button class="btn btn-default btn-sm" (click)="refresh()">{{ 'nav.refreshData' | translate }}</button>
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

  readonly userName = computed(() => this.auth.user()?.name || this.translate.t('nav.roleAdministrator'));
  readonly currentLang = this.translate.currentLang;

  readonly nav = [
    { label: 'adminNav.overview', items: [
      { path: '/dashboard', icon: 'grid', label: 'adminNav.dashboard' },
      { path: '/analytics', icon: 'pulse', label: 'adminNav.analytics' },
    ] },
    { label: 'adminNav.trustOps', items: [
      { path: '/support/cases', icon: 'flag', label: 'adminNav.support' },
      { path: '/operations/catalog', icon: 'shield', label: 'adminNav.catalogModeration' },
      { path: '/operations/maker-checker', icon: 'swap', label: 'adminNav.makerChecker' },
    ] },
    { label: 'adminNav.merchantsAccess', items: [
      { path: '/stores', icon: 'store', label: 'adminNav.stores' },
      { path: '/users', icon: 'users', label: 'adminNav.users' },
      { path: '/websites', icon: 'globe', label: 'adminNav.websites' },
      { path: '/templates', icon: 'layout', label: 'adminNav.templates' },
    ] },
    { label: 'adminNav.commerce', items: [
      { path: '/products', icon: 'box', label: 'adminNav.products' },
      { path: '/orders', icon: 'cart', label: 'adminNav.orders' },
      { path: '/reviews', icon: 'star', label: 'adminNav.reviews' },
    ] },
    { label: 'adminNav.billingPayments', items: [
      { path: '/subscriptions', icon: 'package', label: 'adminNav.subscriptions' },
      { path: '/packages', icon: 'tag', label: 'adminNav.plans' },
      { path: '/plan-payments', icon: 'card', label: 'adminNav.planPayments' },
      { path: '/billing', icon: 'wallet', label: 'adminNav.usage' },
      { path: '/payments', icon: 'swap', label: 'adminNav.customerPayments' },
    ] },
    { label: 'adminNav.securityAccess', items: [
      { path: '/security', icon: 'shield', label: 'adminNav.mfa' },
      { path: '/sessions', icon: 'monitor', label: 'adminNav.sessions' },
    ] },
  ];

  toggleLanguage(): void {
    this.translate.setLanguage(this.currentLang() === 'en' ? 'km' : 'en');
  }

  refresh(): void { window.location.reload(); }
  logout(): void { this.auth.logout().subscribe(); }
}
