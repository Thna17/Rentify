import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

export interface CheckoutStepDef {
  label: string;
  route: string;
}

@Component({
  selector: 'app-checkout-steps',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
  <div class="steps-bar">
    <div class="container top-row">
      <a routerLink="/" class="logo">
        <span class="logo-mark"><ui-icon name="leaf" [size]="15" color="#fff"></ui-icon></span>
        KhmerCraft
      </a>
      <span class="secure-note"><ui-icon name="lock" [size]="13"></ui-icon> Secure Checkout</span>
    </div>
    <div class="container steps-inner">
      <ng-container *ngFor="let s of steps; let i = index; let last = last">
        <a
          class="step"
          [class.done]="i + 1 < current"
          [class.active]="i + 1 === current"
          [routerLink]="i + 1 < current ? s.route : null"
        >
          <span class="dot">
            <ui-icon *ngIf="i + 1 < current" name="check" [size]="13" [strokeWidth]="2.4"></ui-icon>
            <ng-container *ngIf="i + 1 >= current">{{ i + 1 }}</ng-container>
          </span>
          <span class="label">{{ s.label }}</span>
        </a>
        <div class="line" *ngIf="!last" [class.filled]="i + 1 < current"></div>
      </ng-container>
    </div>
  </div>
  `,
  styles: [`
    .steps-bar { background: var(--color-surface); border-bottom: 1px solid var(--color-border); position: sticky; top: 0; z-index: 40; }
    .top-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 32px 0; }
    .logo { font-family: var(--font-heading); font-weight: 800; font-size: 16px; color: var(--color-text); display: flex; align-items: center; gap: 8px; }
    .logo-mark { width: 24px; height: 24px; border-radius: 7px; background: var(--color-accent); display: flex; align-items: center; justify-content: center; }
    .secure-note { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-muted); font-weight: 600; }
    .steps-inner { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 18px 32px 20px; }
    .step { display: flex; align-items: center; gap: 9px; font-size: 13.5px; color: var(--color-muted); font-weight: 600; }
    .step .dot {
      width: 26px; height: 26px; border-radius: 50%; border: 1.5px solid var(--color-border-strong);
      display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--color-muted);
      transition: all var(--dur-base) var(--ease-standard); flex-shrink: 0;
    }
    .step.done .dot { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
    .step.done .label { color: var(--color-text); }
    .step.active { color: var(--color-text); }
    .step.active .dot { background: var(--color-accent); color: #fff; border-color: var(--color-accent); box-shadow: 0 0 0 4px var(--color-accent-soft); }
    .label { display: none; }
    .line { width: 44px; height: 1.5px; background: var(--color-border); transition: background var(--dur-slow) var(--ease-standard); }
    .line.filled { background: var(--color-accent); }
    @media (min-width: 620px) { .label { display: inline; } }
  `]
})
export class CheckoutStepsComponent {
  @Input() current: number = 1;
  @Input() steps: CheckoutStepDef[] = [
    { label: 'Delivery', route: '/checkout' },
    { label: 'Shipping', route: '/checkout/shipping' },
    { label: 'Payment', route: '/checkout/payment' },
    { label: 'Review', route: '/checkout/review' },
  ];
}
