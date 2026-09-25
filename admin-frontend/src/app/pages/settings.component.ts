import { Component, inject, signal } from '@angular/core';
import { AdminService } from '../services/admin-data.service';

@Component({
  standalone: true,
  template: `
  @if (d.ready()) {
    <div class="page-head">
      <div>
        <h1 class="page-title">Platform Settings</h1>
        <p class="page-sub">Global settings, storefront runtime policies, marketplace economics and security</p>
      </div>
      <button class="btn btn-primary" (click)="save()">Save changes</button>
    </div>

    <div class="grid half">
      <div class="card card-pad">
        <h3 class="card-title" style="margin-bottom:6px">Platform & Storefronts</h3>
        <div class="set-row">
          <div>
            <div class="t">Platform name</div>
            <div class="d">Shown in administrative dashboards, headers and emails</div>
          </div>
          <input class="input" style="width:160px" [value]="s().name" (input)="set('name', $any($event.target).value)"/>
        </div>
        <div class="set-row">
          <div>
            <div class="t">Maintenance mode</div>
            <div class="d">Storefronts and marketplace become read-only</div>
          </div>
          <span class="switch" [class.on]="s().maintenance" (click)="set('maintenance', !s().maintenance)"></span>
        </div>
        <div class="set-row">
          <div>
            <div class="t">Auto-approve dev sellers</div>
            <div class="d">Automatically approve seller applications in local dev</div>
          </div>
          <span class="switch" [class.on]="s().autoApprove" (click)="set('autoApprove', !s().autoApprove)"></span>
        </div>
        <div class="set-row">
          <div>
            <div class="t">Open seller registration</div>
            <div class="d">Allow new merchants to submit seller applications</div>
          </div>
          <span class="switch" [class.on]="s().openSellers" (click)="set('openSellers', !s().openSellers)"></span>
        </div>
      </div>

      <div class="card card-pad">
        <h3 class="card-title" style="margin-bottom:6px">Marketplace Economics</h3>
        <div class="set-row">
          <div>
            <div class="t">Order commission (%)</div>
            <div class="d">Platform revenue share per completed order</div>
          </div>
          <input class="input" type="number" min="0" max="100" style="width:90px" [value]="s().commission" (input)="set('commission', +$any($event.target).value)"/>
        </div>
        <div class="set-row">
          <div>
            <div class="t">Boost fee ($)</div>
            <div class="d">Flat fee for a 7-day featured product boost</div>
          </div>
          <input class="input" type="number" min="0" style="width:90px" [value]="s().boostFee" (input)="set('boostFee', +$any($event.target).value)"/>
        </div>
        <div class="set-row">
          <div>
            <div class="t">Boost duration (days)</div>
          </div>
          <input class="input" type="number" min="1" style="width:90px" [value]="s().boostDays" (input)="set('boostDays', +$any($event.target).value)"/>
        </div>
      </div>

      <div class="card card-pad">
        <h3 class="card-title" style="margin-bottom:6px">Payments & Payouts</h3>
        <div class="set-row">
          <div><div class="t">Cash on Delivery (COD)</div></div>
          <span class="switch" [class.on]="s().cod" (click)="set('cod', !s().cod)"></span>
        </div>
        <div class="set-row">
          <div><div class="t">Cash on Pickup</div></div>
          <span class="switch" [class.on]="s().pickup" (click)="set('pickup', !s().pickup)"></span>
        </div>
        <div class="set-row">
          <div><div class="t">Minimum payout ($)</div></div>
          <input class="input" type="number" min="0" style="width:90px" [value]="s().minPayout" (input)="set('minPayout', +$any($event.target).value)"/>
        </div>
      </div>

      <div class="card card-pad">
        <h3 class="card-title" style="margin-bottom:6px">Security & Notifications</h3>
        <div class="set-row">
          <div><div class="t">Require 2FA for administrators</div></div>
          <span class="switch" [class.on]="s().twofa" (click)="set('twofa', !s().twofa)"></span>
        </div>
        <div class="set-row">
          <div>
            <div class="t">Auto-hide reported products</div>
            <div class="d">Automatically hide listings receiving ≥3 reports</div>
          </div>
          <span class="switch" [class.on]="s().autoHide" (click)="set('autoHide', !s().autoHide)"></span>
        </div>
        <div class="set-row">
          <div><div class="t">Weekly digest email</div></div>
          <span class="switch" [class.on]="s().digest" (click)="set('digest', !s().digest)"></span>
        </div>
      </div>
    </div>
  } @else {
    <div class="skel" style="height:360px"></div>
  }`,
})
export class SettingsComponent {
  d = inject(AdminService);
  s = signal({
    name: 'Rentify Platform',
    maintenance: false,
    autoApprove: true,
    openSellers: true,
    commission: 10,
    boostFee: 25,
    boostDays: 7,
    cod: true,
    pickup: true,
    minPayout: 50,
    twofa: true,
    autoHide: false,
    digest: true,
  });

  set(k: string, v: any) {
    this.s.update((x) => ({ ...x, [k]: v }));
  }

  save() {
    this.d.log('Updated platform settings', 'active');
    this.d.toast('Settings saved');
  }
}
