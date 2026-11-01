import { EDITORIAL_STYLES } from '@rentify/storefront/editorialStyles';
import beautyDesktop from '../assets/site/storefront-beauty-desktop.jpg';
import beautyMobile from '../assets/site/storefront-beauty-mobile.jpg';
import techDesktop from '../assets/site/storefront-tech-desktop.jpg';
import techMobile from '../assets/site/storefront-tech-mobile.jpg';
import cafeDesktop from '../assets/site/storefront-cafe-desktop.jpg';
import cafeMobile from '../assets/site/storefront-cafe-mobile.jpg';
import atelierPreview from '../assets/site/storefront-atelier.svg';

// Screenshots of the live storefront templates, keyed by websiteTemplateId.
// Templates without screenshots fall back to a live preview of their demo.
export const TEMPLATE_MEDIA = {
  1: {
    desktop: beautyDesktop,
    mobile: beautyMobile,
    storeName: 'Aura Botanicals',
    domain: 'aura-botanicals.mekhla.digital',
    previewUrl: 'https://aura-botanicals.mekhla.digital',
  },
  2: {
    desktop: techDesktop,
    mobile: techMobile,
    storeName: 'NexTech Electronics',
    domain: 'nextech-electronics.mekhla.digital',
    previewUrl: 'https://nextech-electronics.mekhla.digital',
  },
  3: {
    desktop: cafeDesktop,
    mobile: cafeMobile,
    storeName: 'Mekong Brew',
    domain: 'mekong-brew.mekhla.digital',
    previewUrl: 'https://mekong-brew.mekhla.digital',
  },
  4: {
    desktop: atelierPreview,
    storeName: 'Atelier',
    domain: 'Your storefront',
  },
};

export const SHOWCASE = {
  beauty: TEMPLATE_MEDIA[1],
  tech: TEMPLATE_MEDIA[2],
  cafe: TEMPLATE_MEDIA[3],
};

export const getTemplateMedia = (template) => {
  if (!template) return null;

  const editorial = EDITORIAL_STYLES[template.websiteTemplateId];
  if (editorial) return { desktop: editorial.preview || editorial.image, mobile: editorial.mobilePreview || editorial.image, storeName: editorial.name };

  // Check websiteTemplateId first
  if (template.websiteTemplateId && TEMPLATE_MEDIA[template.websiteTemplateId]) {
    return TEMPLATE_MEDIA[template.websiteTemplateId];
  }

  // Check template id or name for Template 1 (Skin Care / Beauty)
  if (
    template.id === '044c94e2-a47c-47d5-895b-33bc00eb5abb' ||
    template.id === '1' ||
    template.websiteTemplateId === 1 ||
    /skin|beauty|aura/i.test(template.name || '')
  ) {
    return TEMPLATE_MEDIA[1];
  }

  // Check template id or name for Template 2 (Technology / Electronics)
  if (
    template.id === 'af3e0202-6327-45b1-bece-02ab3aba4a05' ||
    template.id === '1a1f5801-c180-447d-b2dd-8fbf3f45b84f' ||
    template.id === '2' ||
    template.websiteTemplateId === 2 ||
    /tech|electro|gadget/i.test(template.name || '')
  ) {
    return TEMPLATE_MEDIA[2];
  }

  // Template 3 (Café / Coffee shop)
  if (
    template.id === '56245606-c064-4507-85cb-05a611cb3d8f' ||
    template.id === '3' ||
    template.websiteTemplateId === 3 ||
    /caf[eé]|coffee/i.test(template.name || '')
  ) {
    return TEMPLATE_MEDIA[3];
  }

  return null;
};
