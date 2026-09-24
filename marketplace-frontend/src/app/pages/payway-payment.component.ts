import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-payway-payment',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, IconComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="page">
      <div class="card animate-scale">
        <div class="icon-circle">
          <ui-icon name="credit-card" [size]="28" color="var(--color-accent)"></ui-icon>
        </div>
        <h1>ABA PayWay Payment</h1>
        <p class="subtitle">Order Reference: <strong>{{ orderNumber }}</strong></p>
        <div class="status-box">
          <p>Please complete your payment via ABA PayWay.</p>
          <small>Once confirmed, your order status will be updated automatically.</small>
        </div>
        <div class="actions">
          <a routerLink="/buyer/orders" class="btn btn-primary">View My Orders</a>
          <a routerLink="/checkout" class="btn btn-outline">Back to Checkout</a>
        </div>
      </div>
    </main>
    <app-footer></app-footer>
  `,
  styles: [`
    .page {
      background: var(--color-bg-alt);
      min-height: calc(100vh - 140px);
      padding: 60px 20px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .card {
      background: #fff;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      max-width: 480px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    .icon-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--color-accent-soft);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    h1 {
      font-size: 22px;
      margin-bottom: 8px;
    }
    .subtitle {
      color: var(--color-muted);
      font-size: 14px;
      margin-bottom: 24px;
    }
    .status-box {
      background: var(--color-bg-alt);
      border-radius: var(--radius-md);
      padding: 16px;
      margin-bottom: 28px;
    }
    .status-box p {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    .status-box small {
      color: var(--color-muted);
      font-size: 12px;
    }
    .actions {
      display: flex;
      gap: 12px;
    }
    .actions a {
      flex: 1;
      text-align: center;
      text-decoration: none;
    }
  `],
})
export class PaywayPaymentComponent {
  private route = inject(ActivatedRoute);
  orderNumber = this.route.snapshot.paramMap.get('orderNumber') ?? '';
}
