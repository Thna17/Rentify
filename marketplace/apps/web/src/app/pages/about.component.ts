import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, IconComponent],
  template: `
  <app-navbar></app-navbar>

  <section class="container mission-section">
    <div class="mission-grid">
      <div class="mission-card">
        <div class="mission-icon"><ui-icon name="leaf" [size]="22" color="var(--color-accent)"></ui-icon></div>
        <h3>Our mission</h3>
        <p>To create a direct, fair, and sustainable bridge between Cambodian artisans and the world — so tradition can thrive alongside modern livelihoods.</p>
      </div>
      <div class="mission-card">
        <div class="mission-icon"><ui-icon name="award" [size]="22" color="var(--color-accent)"></ui-icon></div>
        <h3>Our promise</h3>
        <p>Every product is verified for authenticity and origin. Sellers keep the majority of every sale, and buyers receive a certificate of provenance.</p>
      </div>
      <div class="mission-card">
        <div class="mission-icon"><ui-icon name="users" [size]="22" color="var(--color-accent)"></ui-icon></div>
        <h3>Our community</h3>
        <p>Over 1,200 artisans across 25 provinces — weavers, potters, farmers, and woodworkers — trust KhmerCraft to bring their work to new markets.</p>
      </div>
    </div>
  </section>

  <section class="container timeline-section">
    <div class="section-head-center">
      <h2>How we got here</h2>
      <p>A short history of building something that matters.</p>
    </div>
    <div class="timeline">
      <div class="timeline-item" *ngFor="let t of timeline">
        <div class="timeline-dot"></div>
        <div class="timeline-body">
          <span class="timeline-year">{{ t.year }}</span>
          <strong>{{ t.title }}</strong>
          <p>{{ t.desc }}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="container values-section">
    <div class="section-head-center">
      <h2>What we stand for</h2>
    </div>
    <div class="values-grid">
      <div class="value-card" *ngFor="let v of values">
        <div class="value-icon"><ui-icon [name]="v.icon" [size]="20" color="var(--color-accent)"></ui-icon></div>
        <strong>{{ v.title }}</strong>
        <small>{{ v.desc }}</small>
      </div>
    </div>
  </section>

  <section class="container cta-banner">
    <div>
      <h2>Join the movement</h2>
      <p>Whether you shop, sell, or simply share our story — you're helping keep Cambodian craft alive.</p>
    </div>
    <div class="cta-actions">
      <button class="btn btn-primary btn-lg" routerLink="/products">Shop the Collection</button>
      <a class="btn btn-outline-light btn-lg" routerLink="/become-a-seller">Become a Seller</a>
    </div>
  </section>

  <app-footer></app-footer>
  `,
  styles: [`
    .mission-section { padding: 48px 32px; }
    .mission-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .mission-card { border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 28px; background: #fff; }
    .mission-icon { width: 48px; height: 48px; border-radius: var(--radius-md); background: var(--color-accent-soft); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
    .mission-card h3 { font-size: 17px; margin-bottom: 10px; }
    .mission-card p { font-size: 13.5px; color: var(--color-muted); line-height: 1.65; }

    .section-head-center { text-align: center; margin-bottom: 36px; }
    .section-head-center h2 { font-size: 26px; margin-bottom: 8px; }
    .section-head-center p { color: var(--color-muted); font-size: 14px; }

    .timeline-section { padding: 20px 32px 56px; }
    .timeline { max-width: 640px; margin: 0 auto; position: relative; padding-left: 28px; border-left: 2px solid var(--color-border); }
    .timeline-item { position: relative; padding-bottom: 32px; }
    .timeline-item:last-child { padding-bottom: 0; }
    .timeline-dot { position: absolute; left: -34px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--color-accent); border: 3px solid var(--color-bg-alt); }
    .timeline-year { font-size: 12px; font-weight: 700; color: var(--color-accent); letter-spacing: .03em; }
    .timeline-body strong { display: block; font-size: 16px; margin: 4px 0 6px; }
    .timeline-body p { font-size: 13.5px; color: var(--color-muted); line-height: 1.6; }

    .values-section { padding: 0 32px 56px; }
    .values-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 20px; }
    .value-card { text-align: center; padding: 24px 16px; }
    .value-icon { width: 46px; height: 46px; border-radius: 50%; background: var(--color-accent-soft); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
    .value-card strong { display: block; font-size: 14px; margin-bottom: 6px; }
    .value-card small { color: var(--color-muted); font-size: 12.5px; line-height: 1.5; }

    .cta-banner {
      margin: 0 32px 56px; background: linear-gradient(135deg, #3a5a45, #1c261f); border-radius: var(--radius-lg);
      padding: 44px; display: flex; justify-content: space-between; align-items: center; gap: 28px; flex-wrap: wrap;
    }
    .cta-banner h2 { color: #fff; font-size: 24px; margin-bottom: 8px; }
    .cta-banner p { color: rgba(255,255,255,0.75); font-size: 14px; max-width: 420px; }
    .cta-actions { display: flex; gap: 12px; }
    .btn-outline-light { border: 1px solid rgba(255,255,255,0.4); color: #fff; background: transparent; }
    .btn-outline-light:hover { background: rgba(255,255,255,0.1); }

    @media (max-width: 980px) {
      .mission-grid, .timeline-section .timeline { grid-template-columns: 1fr; }
      .values-grid { grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
    }
  `]
})
export class AboutComponent {
  timeline = [
    { year: '2021', title: 'A small idea in Siem Reap', desc: 'Founded to help three weaving families sell directly to travelers, skipping unfair middlemen.' },
    { year: '2023', title: 'Opening the marketplace nationwide', desc: 'Expanded to 25 provinces, onboarding potters, farmers, and woodworkers across Cambodia.' },
    { year: '2025', title: 'Building trust at scale', desc: 'Launched escrow payments and authenticity certificates to protect both sellers and buyers.' },
    { year: '2026', title: 'Reaching global shoppers', desc: 'KhmerCraft now ships worldwide, carrying Cambodian heritage into homes far beyond its borders.' }
  ];

  values = [
    { icon: 'shield', title: 'Trust & Safety', desc: 'Escrow payments protect every order' },
    { icon: 'leaf', title: 'Sustainability', desc: 'Materials sourced responsibly' },
    { icon: 'heart', title: 'Fair Trade', desc: 'Artisans keep the majority of each sale' },
    { icon: 'globe', title: 'Global Reach', desc: 'Cambodian craft, delivered worldwide' }
  ];
}
