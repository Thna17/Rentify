import { BrowserRouter } from 'react-router-dom';
import { StorefrontWebsiteProvider } from '@rentify/storefront/website';
import { I18nProvider } from './i18n';
import { template1Theme } from './theme';
import { CartFeedbackProvider } from './components/CartFeedback';
import AppRoutes from './routes/AppRoutes';

/**
 * The website (and its theme) is resolved from the current host by the shared
 * storefront provider; no website id is configured in the template.
 */
function App() {
  return (
    <StorefrontWebsiteProvider fallbackTheme={template1Theme}>
      <I18nProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <CartFeedbackProvider>
            <AppRoutes />
          </CartFeedbackProvider>
        </BrowserRouter>
      </I18nProvider>
    </StorefrontWebsiteProvider>
  );
}

export default App;
