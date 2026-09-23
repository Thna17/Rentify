import { Component, inject, signal } from '@angular/core';
import { AdminService } from '../admin-data.service';

@Component({
  standalone: true,
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><h1 class="page-title">Settings</h1><p class="page-sub">Platform-wide configuration</p></div>
      <button class="btn btn-primary" (click)="save()">Save changes</button></div>

    <div class="grid half">
      <div class="card card-pad">
        <h3 class="card-title" style="margin-bottom:6px">Platform</h3>
        <div class="set-row"><div><div class="t">Marketplace name</div><div class="d">Shown in headers and emails</div></div>
          <input class="input" style="width:160px" [value]="s().name" (input)="set('name', $any($event.target).value)"/></div>
        <div class="set-row"><div><div class="t">Maintenance mode</div><div class="d">Storefront becomes read-only</div></div>
          <span class="switch" [class.on]="s().maintenance" (click)="set('maintenance', !s().maintenance)"></span></div>
        <div class="set-row"><div><div class="t">Open seller registration</div><div class="d">Allow new seller applications</div></div>
          <span class="switch" [class.on]="s().openSellers" (click)="set('openSellers', !s().openSellers)"></span></div>
      </div>
      <div class="card card-pad">
        <h3 class="card-title" style="margin-bottom:6px">Marketplace economics</h3>
        <div class="set-row"><div><div class="t">Order commission (%)</div><div class="d">Platform cut per completed order</div></div>
          <input class="input" type="number" min="0" max="100" style="width:90px" [value]="s().commission" (input)="set('commission', +$any($event.target).value)"/></div>
        <div class="set-row"><div><div class="t">Boost fee ($)</div><div class="d">Flat fee for a 7-day featured boost</div></div>
          <input class="input" type="number" min="0" style="width:90px" [value]="s().boostFee" (input)="set('boostFee', +$any($event.target).value)"/></div>
        <div class="set-row"><div><div class="t">Boost duration (days)</div></div>
          <input class="input" type="number" min="1" style="width:90px" [value]="s().boostDays" (input)="set('boostDays', +$any($event.target).value)"/></div>
      </div>
      <div class="card card-pad">
        <h3 class="card-title" style="margin-bottom:6px">Payments</h3>
        <div class="set-row"><div><div class="t">Cash on Delivery</div></div>
          <span class="switch" [class.on]="s().cod" (click)="set('cod', !s().cod)"></span></div>
        <div class="set-row"><div><div class="t">Cash on Pickup</div></div>
          <span class="switch" [class.on]="s().pickup" (click)="set('pickup', !s().pickup)"></span></div>
        <div class="set-row"><div><div class="t">Minimum payout ($)</div></div>
          <input class="input" type="number" min="0" style="width:90px" [value]="s().minPayout" (input)="set('minPayout', +$any($event.target).value)"/></div>
      </div>
      <div class="card card-pad">
        <h3 class="card-title" style="margin-bottom:6px">Security & notifications</h3>
        <div class="set-row"><div><div class="t">Require 2FA for admins</div></div>
          <span class="switch" [class.on]="s().twofa" (click)="set('twofa', !s().twofa)"></span></div>
        <div class="set-row"><div><div class="t">Auto-hide reported products</div><div class="d">Hide a listing after 3 reports</div></div>
          <span class="switch" [class.on]="s().autoHide" (click)="set('autoHide', !s().autoHide)"></span></div>
        <div class="set-row"><div><div class="t">Weekly digest email</div></div>
          <span class="switch" [class.on]="s().digest" (click)="set('digest', !s().digest)"></span></div>
      </div>
    </div>
  } @else { <div class="skel" style="height:360px"></div> }`,
})
export class SettingsComponent {
  d = inject(AdminService);
  s = signal({ name: 'KhmerCraft', maintenance: false, openSellers: true, commission: 10, boostFee: 25, boostDays: 7, cod: true, pickup: true, minPayout: 50, twofa: true, autoHide: false, digest: true });
  set(k: string, v: any) { this.s.update(x => ({ ...x, [k]: v })); }
  save() { this.d.log('Updated platform settings', 'active'); this.d.toast('Settings saved'); }
}