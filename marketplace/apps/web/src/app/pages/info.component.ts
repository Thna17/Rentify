import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';

interface InfoSection {
  heading: string;
  body: string;
}

interface InfoPage {
  title: string;
  intro: string;
  sections: InfoSection[];
}

/**
 * Help, Contact, Shipping, Terms and Privacy differ only in copy, so they share
 * one component selected by `data.page` on the route. These are honest
 * placeholders — real policy text needs legal review before launch.
 */
const PAGES: Record<string, InfoPage> = {
  help: {
    title: 'Help centre',
    intro: 'Answers to the questions buyers ask us most often.',
    sections: [
      {
        heading: 'How long does delivery take?',
        body: 'Delivery timing depends on the seller, destination and courier. The confirmed estimate will be shown for each seller shipment before ordering.',
      },
      {
        heading: 'How do I track my order?',
        body: 'Signed-in buyers can open My Orders to see the current order status. Courier tracking will appear when a seller provides it.',
      },
      {
        heading: 'Can I return an item?',
        body: 'Eligible returns follow KhmerCraft’s marketplace return policy. Sellers handle eligible returns, while KhmerCraft support handles disputes.',
      },
      {
        heading: 'How do sellers get paid?',
        body: 'Seller payout timing and marketplace fees are shown in the applicable seller plan and dashboard once those payment operations are active.',
      },
    ],
  },
  contact: {
    title: 'Contact us',
    intro: 'We reply to most messages within one working day.',
    sections: [
      {
        heading: 'Buyer support',
        body: 'Buyer support contact is being connected. For now, use My Orders to keep the relevant order number available.',
      },
      {
        heading: 'Seller support',
        body: 'Seller support contact is being connected through the seller portal.',
      },
      {
        heading: 'Office',
        body: 'Phnom Penh, Cambodia. Visits by appointment only.',
      },
    ],
  },
  shipping: {
    title: 'Shipping information',
    intro: 'How seller-grouped delivery will work on KhmerCraft.',
    sections: [
      {
        heading: 'Delivery charges',
        body: 'Shipping is calculated separately for each seller shipment. Final fees must be confirmed during checkout.',
      },
      {
        heading: 'Delivery times',
        body: 'Delivery estimates depend on seller handling time, destination and courier. Avoid relying on an estimate until checkout confirms it.',
      },
      {
        heading: 'Multi-seller orders',
        body: 'Items from different sellers are separate shipment groups and may arrive at different times. Each group can have its own shipping fee.',
      },
    ],
  },
  terms: {
    title: 'Terms of service',
    intro:
      'Placeholder terms for the MVP. These require legal review before launch.',
    sections: [
      {
        heading: 'Using KhmerCraft',
        body: 'You agree to use the marketplace lawfully and not to misrepresent yourself when buying or selling.',
      },
      {
        heading: 'Orders and payment',
        body: 'An order is a request to buy. It is confirmed once the seller accepts and payment is authorised.',
      },
      {
        heading: 'Seller obligations',
        body: 'Sellers must describe products accurately, hold the stock they list, and dispatch within the stated handling time.',
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro:
      'Placeholder policy for the MVP. This requires legal review before launch.',
    sections: [
      {
        heading: 'What we collect',
        body: 'Your name, email, phone number and delivery address, plus the orders you place.',
      },
      {
        heading: 'How we use it',
        body: 'To process orders, arrange delivery, and contact you about those orders. We do not sell personal data.',
      },
      {
        heading: 'Your choices',
        body: 'You can update your details from your profile, or ask us to delete your account by contacting support.',
      },
    ],
  },
};

@Component({
  selector: 'app-info',
  imports: [RouterLink, NavbarComponent, FooterComponent],
  template: `
    <app-navbar />

    @if (page(); as info) {
      <section class="container info">
        <nav class="crumbs">
          <a routerLink="/">Home</a> <span>›</span> <span>{{ info.title }}</span>
        </nav>

        <h1>{{ info.title }}</h1>
        <p class="intro">{{ info.intro }}</p>

        <div class="sections">
          @for (section of info.sections; track section.heading) {
            <article class="card section">
              <h2>{{ section.heading }}</h2>
              <p>{{ section.body }}</p>
            </article>
          }
        </div>

        <p class="more">
          Still stuck? <a routerLink="/contact">Contact our team</a>.
        </p>
      </section>
    }

    <app-footer />
  `,
  styles: [
    `
      .info {
        padding: 30px 32px 64px;
        max-width: 820px;
      }
      .crumbs {
        display: flex;
        gap: 8px;
        font-size: 12.5px;
        color: var(--color-muted);
        margin-bottom: 18px;
      }
      .crumbs a:hover {
        color: var(--color-accent);
      }
      h1 {
        font-size: 30px;
        margin-bottom: 10px;
      }
      .intro {
        color: var(--color-muted);
        font-size: 15px;
        margin-bottom: 30px;
      }
      .sections {
        display: grid;
        gap: 14px;
      }
      .section {
        padding: 20px 22px;
      }
      .section h2 {
        font-size: 15.5px;
        margin-bottom: 7px;
      }
      .section p {
        color: var(--color-text-secondary);
        font-size: 14px;
        line-height: 1.65;
      }
      .more {
        margin-top: 28px;
        font-size: 14px;
        color: var(--color-muted);
      }
      .more a {
        color: var(--color-accent);
        font-weight: 600;
      }
      .more a:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class InfoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });

  protected readonly page = computed<InfoPage | undefined>(
    () => PAGES[this.data()['page'] as string],
  );
}
