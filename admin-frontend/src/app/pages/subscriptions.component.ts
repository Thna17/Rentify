import { Component, computed, inject, signal } from '@angular/core';
import { AdminService, PlatformSubscription } from '../services/admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { StatComponent } from '../ui/stat.component';
import { MenuComponent, MenuItem } from '../ui/menu.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { dstr, money } from '../ui/format';

@Component({
  standalone: true,
  imports: [BadgeComponent, StatComponent, MenuComponent, ConfirmComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head">
      <div>
        <h1 class="page-title">Subscriptions & Packages</h1>
        <p class="page-sub">Monitor platform tiers, recurring merchant subscriptions and billing cycles</p>
      </div>
    </div>

    <div class="grid stats mb">
      <kc-stat label="Monthly ARR" icon="wallet" [value]="money(monthlyTotal)" hint="active recurring plans"></kc-stat>
      <kc-stat label="Growth Tier" icon="package" [value]="growthCount" hint="$29/mo tier"></kc-stat>
      <kc-stat label="Enterprise Tier" icon="package" [value]="enterpriseCount" hint="$99/mo tier"></kc-stat>
      <kc-stat label="Trial Accounts" icon="tag" [value]="trialCount" hint="14-day free trials"></kc-stat>
    </div>

    <div class="toolbar">
      <div class="tabs">
        @for (t of ['all', 'active', 'trial', 'past_due']; track t) {
          <button class="tab" [class.active]="tab() === t" (click)="tab.set(t)">
            {{t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)}}
          </button>
        }
      </div>
      <input class="input input-search" placeholder="Search merchant or store…" [value]="q()" (input)="q.set($any($event.target).value)"/>
    </div>

    <div class="card">
      <table class="tbl">
        <thead>
          <tr>
            <th>Store & Merchant</th>
            <th>Plan Tier</th>
            <th class="right">Price</th>
            <th>Billing Cycle</th>
            <th>Valid Period</th>
            <th>Status</th>
            <th class="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (s of rows(); track s.id) {
            <tr>
              <td>
                <div class="cell-main">{{s.storeName}}</div>
                <div class="cell-sub">{{s.ownerName}}</div>
              </td>
              <td><span class="badge t-gray"><strong>{{s.plan}}</strong></span></td>
              <td class="num">{{money(s.price)}}</td>
              <td><span style="text-transform:capitalize">{{s.billingCycle}}</span></td>
              <td>
                <div class="cell-sub">{{dstr(s.startDate)}} → {{dstr(s.endDate)}}</div>
              </td>
              <td><kc-badge [value]="s.status"></kc-badge></td>
              <td class="right">
                <div class="cell-actions">
                  <kc-menu [items]="menuFor(s)" (pick)="act($event, s)"></kc-menu>
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7"><div class="empty">No subscriptions matching filter.</div></td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (confirm(); as c) {
      <kc-confirm title="Subscription update" [message]="c.msg" (confirm)="c.fn(); confirm.set(null)" (cancel)="confirm.set(null)"></kc-confirm>
    }
  } @else {
    <div class="skel" style="height:360px"></div>
  }`,
})
export class SubscriptionsComponent {
  d = inject(AdminService);
  money = money;
  dstr = dstr;
  q = signal('');
  tab = signal('all');
  confirm = signal<{ fn: () => void; msg: string } | null>(null);

  rows = computed(() =>
    this.d.subscriptions().filter(
      (s) =>
        (this.tab() === 'all' || s.status === this.tab()) &&
        (!this.q() ||
          s.storeName.toLowerCase().includes(this.q().toLowerCase()) ||
          s.ownerName.toLowerCase().includes(this.q().toLowerCase()) ||
          s.plan.toLowerCase().includes(this.q().toLowerCase())),
    ),
  );

  monthlyTotal = computed(() =>
    this.d.subscriptions().reduce((sum, s) => sum + (s.status === 'active' ? s.price : 0), 0),
  )();

  growthCount = computed(() => this.d.subscriptions().filter((s) => s.plan === 'Growth' && s.status === 'active').length)();
  enterpriseCount = computed(() => this.d.subscriptions().filter((s) => s.plan === 'Enterprise' && s.status === 'active').length)();
  trialCount = computed(() => this.d.subscriptions().filter((s) => s.status === 'trial').length)();

  menuFor(s: PlatformSubscription): MenuItem[] {
    const items: MenuItem[] = [];
    if (s.plan !== 'Enterprise') {
      items.push({ label: 'Upgrade to Enterprise ($99)', icon: 'package', action: 'enterprise' });
    }
    if (s.plan !== 'Growth') {
      items.push({ label: 'Switch to Growth ($29)', icon: 'package', action: 'growth' });
    }
    if (s.status === 'active') {
      items.push({ label: 'Cancel Subscription', icon: 'x', danger: true, action: 'cancel' });
    } else {
      items.push({ label: 'Reactivate', icon: 'refresh', action: 'reactivate' });
    }
    return items;
  }

  act(action: string, s: PlatformSubscription) {
    if (action === 'enterprise') {
      this.d.updateSubscriptionPlan(s.id, 'Enterprise', 99);
    } else if (action === 'growth') {
      this.d.updateSubscriptionPlan(s.id, 'Growth', 29);
    } else if (action === 'cancel') {
      this.confirm.set({
        fn: () => this.d.setSubscriptionStatus(s.id, 'cancelled'),
        msg: `Cancel subscription for "${s.storeName}"? The store will revert to limited free access at period end.`,
      });
    } else if (action === 'reactivate') {
      this.d.setSubscriptionStatus(s.id, 'active');
    }
  }
}
