/**
 * Template 3 as loaded by the single storefront app (apps/storefront): the
 * template's own stylesheet, fonts and app. The storefront provides the Redux store.
 */
import './styles.css';

export const TEMPLATE_3_FONTS =
  'https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=Kantumruy+Pro:wght@400;500;600&family=Noto+Serif+Khmer:wght@500;600&display=swap';

// The standalone index.html links these fonts; the shared storefront page does not.
if (typeof document !== 'undefined' && !document.querySelector(`link[href="${TEMPLATE_3_FONTS}"]`)) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = TEMPLATE_3_FONTS;
  document.head.appendChild(link);
}

export { default } from './app';
