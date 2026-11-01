import '../../ecommerce-template-1/src/styles.css';
import './styles.css';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import { StorefrontWebsiteProvider } from '@rentify/storefront/website';
import { I18nProvider } from '../../ecommerce-template-1/src/i18n';
import { CartFeedbackProvider } from '../../ecommerce-template-1/src/components/CartFeedback';
import { EditorialHeader } from './header';
import { StoreLayout } from '../../ecommerce-template-1/src/layout/StoreLayout';
import { storeRoutes } from '../../ecommerce-template-1/src/routes/AppRoutes';
import Home, { EditorialFooter } from './home';
import {
  EDITORIAL_STYLES,
  editorialTheme,
} from '@rentify/storefront/editorialStyles';
import { INDUSTRY_HOMES } from './compositions';
import { EditorialStyleContext } from './styleContext';

const routesFor = (HomePage) =>
  storeRoutes.map((route) => ({
    ...route,
    element: (
      <StoreLayout
        minimal
        header={<EditorialHeader />}
        footer={<EditorialFooter />}
      />
    ),
    children: route.children.map((child) =>
      child.path === '/' ? { ...child, element: <HomePage /> } : child
    ),
  }));
function Routes({ home }) {
  return useRoutes(routesFor(home));
}
export function createEditorialTemplate(id) {
  const style = EDITORIAL_STYLES[id];
  const theme = editorialTheme(id);
  return function EditorialTemplate() {
    return (
      <StorefrontWebsiteProvider fallbackTheme={theme}>
        <EditorialStyleContext.Provider value={style}>
          <I18nProvider>
            <BrowserRouter
              future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
            >
              <CartFeedbackProvider>
                <div
                  className={`editorial-minimal em-style-${style.key}`}
                  style={{
                    '--em-hero-base': style.heroBase,
                    '--em-hero-text': style.heroText,
                  }}
                >
                  <Routes home={INDUSTRY_HOMES[id] || Home} />
                </div>
              </CartFeedbackProvider>
            </BrowserRouter>
          </I18nProvider>
        </EditorialStyleContext.Provider>
      </StorefrontWebsiteProvider>
    );
  };
}
export default createEditorialTemplate(5);
