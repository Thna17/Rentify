import beautyDesktop from '../assets/site/storefront-beauty-desktop.jpg';
import beautyMobile from '../assets/site/storefront-beauty-mobile.jpg';
import techDesktop from '../assets/site/storefront-tech-desktop.jpg';
import techMobile from '../assets/site/storefront-tech-mobile.jpg';

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
};

export const SHOWCASE = {
  beauty: TEMPLATE_MEDIA[1],
  tech: TEMPLATE_MEDIA[2],
};

export const getTemplateMedia = (template) => {
  if (!template) return null;

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

  return null;
};
