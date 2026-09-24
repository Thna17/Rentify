import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, NavbarComponent, FooterComponent, IconComponent],
  template: `
    <app-navbar />

    <section class="container empty">
      <div class="empty-image img-placeholder"><ui-icon name="search" [size]="40" /></div>
      <h1>We couldn't find that page</h1>
      <p>
        The link may be out of date, or the product may no longer be listed.
        Everything else is still here.
      </p>
      <div class="actions">
        <button class="btn btn-primary btn-lg" routerLink="/">Back to home</button>
        <button class="btn btn-outline btn-lg" routerLink="/products">
          Browse products
        </button>
      </div>
    </section>

    <app-footer />
  `,
  styles: [
    `
      .empty {
        text-align: center;
        padding: 70px 32px 90px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .empty-image {
        width: 160px;
        height: 160px;
        border-radius: 50%;
        margin-bottom: 26px;
        color: var(--color-muted-2);
      }
      h1 {
        font-size: 27px;
        margin-bottom: 12px;
      }
      p {
        color: var(--color-muted);
        font-size: 14px;
        max-width: 420px;
        margin-bottom: 26px;
        line-height: 1.6;
      }
      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
      }
    `,
  ],
})
export class NotFoundComponent {}
