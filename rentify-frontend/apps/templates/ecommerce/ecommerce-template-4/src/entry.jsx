import '../../ecommerce-template-1/src/styles.css';
import './styles.css';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import { StorefrontWebsiteProvider } from '@rentify/storefront/website';
import { I18nProvider } from '../../ecommerce-template-1/src/i18n';
import { CartFeedbackProvider } from '../../ecommerce-template-1/src/components/CartFeedback';
import { storeRoutes } from '../../ecommerce-template-1/src/routes/AppRoutes';
import Home from './home';

const routes = storeRoutes.map((route) => ({
  ...route,
  children: route.children.map((child) => child.path === '/' ? { ...child, element: <Home /> } : child),
}));
const theme = { colors: { primary: '#493e36', secondary: '#27231f', background: '#f8f5ef',
  text: '#27231f', textSecondary: '#6b625a', border: '#e4ddd3' },
typography: { fontFamily: { primary: 'Inter, Noto Sans Khmer, sans-serif', secondary: 'Georgia, Noto Serif Khmer, serif' } } };

function Routes() { return useRoutes(routes); }

export default function Atelier() {
  return <StorefrontWebsiteProvider fallbackTheme={theme}><I18nProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CartFeedbackProvider><div className="atelier"><Routes /></div></CartFeedbackProvider>
    </BrowserRouter>
  </I18nProvider></StorefrontWebsiteProvider>;
}
