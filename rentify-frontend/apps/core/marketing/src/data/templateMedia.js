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
    domain: 'aura-botanicals.rentify.com.kh',
  },
  2: {
    desktop: techDesktop,
    mobile: techMobile,
    storeName: 'NexTech Electronics',
    domain: 'nextech.rentify.com.kh',
  },
};

export const SHOWCASE = {
  beauty: TEMPLATE_MEDIA[1],
  tech: TEMPLATE_MEDIA[2],
};

export const getTemplateMedia = (template) =>
  TEMPLATE_MEDIA[template?.websiteTemplateId] || null;
