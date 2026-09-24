import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { NavbarComponent } from '../../../../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../../../../components/shared/layout/footer/footer.component';
import { IconComponent } from '../../../../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, NavbarComponent, FooterComponent, IconComponent],
  template: `
    <app-navbar />

    <section class="container profile">
      <h1>My profile</h1>

      @if (user(); as currentUser) {
        <div class="grid">
          <article class="card details">
            <h2>Account details</h2>
            <dl>
              <dt>Name</dt>
              <dd>{{ currentUser.name }}</dd>
              <dt>Email</dt>
              <dd>{{ currentUser.email }}</dd>
              @if (currentUser.phone) {
                <dt>Phone</dt>
                <dd>{{ currentUser.phone }}</dd>
              }
            </dl>

            <div class="actions">
              <button class="btn btn-primary btn-sm" routerLink="/orders">
                View my orders
              </button>
              <button
                class="btn btn-outline btn-sm"
                routerLink="/account/change-password"
              >
                Change password
              </button>
              <button
                class="btn btn-ghost btn-sm"
                (click)="signOut()"
                [disabled]="signingOut()"
              >
                {{ signingOut() ? 'Signing out…' : 'Sign out' }}
              </button>
            </div>
          </article>

          <div class="account-info">
            <article class="card info-card">
              <span class="info-icon"><ui-icon name="map-pin" [size]="17" /></span>
              <div>
                <strong>Delivery location</strong>
                <span>No saved address yet</span>
                <small>Address management will appear after account sync is connected.</small>
              </div>
            </article>
            <article class="card info-card">
              <span class="info-icon"><ui-icon name="phone" [size]="17" /></span>
              <div>
                <strong>Contact for order updates</strong>
                <span>{{ currentUser.phone || 'No phone number added' }}</span>
                <small>{{ currentUser.email }}</small>
              </div>
            </article>
            <article class="card info-card security-card">
              <span class="info-icon"><ui-icon name="shield" [size]="17" /></span>
              <div>
                <strong>Account security</strong>
                <span>Password-protected buyer account</span>
                <a routerLink="/account/change-password">Manage password</a>
              </div>
            </article>
          </div>
        </div>
      }
    </section>

    <app-footer />
  `,
  styles: [
    `
      .profile {
        padding: 30px 32px 64px;
      }
      h1 {
        font-size: 27px;
        margin-bottom: 22px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1.3fr 1fr;
        gap: 20px;
        align-items: start;
      }
      .details {
        padding: 22px 24px;
      }
      .details h2 {
        font-size: 16px;
        margin-bottom: 16px;
      }
      dl {
        display: grid;
        grid-template-columns: 110px 1fr;
        gap: 10px 16px;
        margin: 0 0 20px;
        font-size: 14px;
      }
      dt {
        color: var(--color-muted);
      }
      dd {
        margin: 0;
        font-weight: 550;
      }
      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .account-info {
        display: grid;
        gap: 12px;
      }
      .info-card {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 16px 18px;
        color: var(--color-text);
      }
      .info-icon {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        flex: 0 0 auto;
        border-radius: 10px;
        background: var(--color-accent-soft);
        color: var(--color-accent);
      }
      .info-card div {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .info-card strong {
        font-size: 14px;
      }
      .info-card div > span {
        color: var(--color-muted);
        font-size: 12.5px;
      }
      .info-card small {
        color: var(--color-muted-2);
        font-size: 11px;
      }
      .info-card a {
        width: fit-content;
        margin-top: 3px;
        color: var(--color-accent);
        font-size: 11.5px;
        font-weight: 700;
      }
      .info-card a:hover {
        text-decoration: underline;
      }
      @media (max-width: 860px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class Profile {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly signingOut = signal(false);

  protected signOut(): void {
    this.signingOut.set(true);
    // Navigate on both paths: the cookie is cleared server-side either way,
    // and stranding the user on a page they can no longer load helps nobody.
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => this.router.navigateByUrl('/'),
    });
  }
}
