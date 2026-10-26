import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { Product, Store } from '../catalog/catalog.models';

const SITE_NAME = 'Rentify Marketplace';
const DEFAULT_DESCRIPTION =
  'Discover authentic Cambodian crafts, food, lifestyle goods, and local products on Rentify Marketplace.';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  private jsonLdScript: HTMLScriptElement | null = null;

  setPageTitle(pageTitle: string): void {
    const full = pageTitle ? `${pageTitle} · ${SITE_NAME}` : SITE_NAME;
    this.title.setTitle(full);
    this.meta.updateTag({ property: 'og:title', content: full });
    this.meta.updateTag({ name: 'twitter:title', content: full });
  }

  setDescription(desc: string): void {
    const clean = desc?.trim() || DEFAULT_DESCRIPTION;
    this.meta.updateTag({ name: 'description', content: clean });
    this.meta.updateTag({ property: 'og:description', content: clean });
    this.meta.updateTag({ name: 'twitter:description', content: clean });
  }

  setCanonicalUrl(urlPath: string): void {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://marketplace.rentify.local';
    const cleanPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
    const fullUrl = `${origin}${cleanPath}`;
    this.meta.updateTag({ property: 'og:url', content: fullUrl });

    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', fullUrl);
  }

  setProductMetadata(product: Product): void {
    const pageTitle = product.name;
    this.setPageTitle(pageTitle);
    this.setDescription(product.description || `${product.name} from ${product.sellerName}`);
    this.setCanonicalUrl(`/product/${product.id}`);

    this.meta.updateTag({ property: 'og:type', content: 'product' });
    if (product.image) {
      this.meta.updateTag({ property: 'og:image', content: product.image });
      this.meta.updateTag({ name: 'twitter:image', content: product.image });
      this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    }

    // Public-safe JSON-LD structured data
    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description || undefined,
      image: product.image || undefined,
      sku: product.sku || product.id,
      offers: {
        '@type': 'Offer',
        price: product.price.toFixed(2),
        priceCurrency: 'USD',
        availability:
          product.status === 'out-of-stock'
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
        seller: {
          '@type': 'Organization',
          name: product.sellerName,
        },
      },
    };
    this.setJsonLd(schemaData);
  }

  setStoreMetadata(store: Store): void {
    const pageTitle = store.name;
    this.setPageTitle(pageTitle);
    this.setDescription(store.tagline || store.description || `Browse products from ${store.name}`);
    this.setCanonicalUrl(`/stores/${store.id}`);

    this.meta.updateTag({ property: 'og:type', content: 'profile' });
    if (store.logoUrl) {
      this.meta.updateTag({ property: 'og:image', content: store.logoUrl });
      this.meta.updateTag({ name: 'twitter:image', content: store.logoUrl });
    }

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: store.name,
      description: store.description || undefined,
      url: `/stores/${store.id}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: store.location || 'Phnom Penh',
        addressCountry: 'KH',
      },
      ...(store.showContact && store.phoneNumber ? { telephone: store.phoneNumber } : {}),
    };
    this.setJsonLd(schemaData);
  }

  setDefaultMetadata(): void {
    this.setPageTitle('');
    this.setDescription(DEFAULT_DESCRIPTION);
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.clearJsonLd();
  }

  private setJsonLd(data: Record<string, unknown>): void {
    this.clearJsonLd();
    if (!this.document) return;

    this.jsonLdScript = this.document.createElement('script');
    this.jsonLdScript.type = 'application/ld+json';
    this.jsonLdScript.text = JSON.stringify(data);
    this.document.head.appendChild(this.jsonLdScript);
  }

  clearJsonLd(): void {
    if (this.jsonLdScript && this.document?.head?.contains(this.jsonLdScript)) {
      this.document.head.removeChild(this.jsonLdScript);
      this.jsonLdScript = null;
    }
  }
}
