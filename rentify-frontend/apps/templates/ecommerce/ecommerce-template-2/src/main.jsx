// apps/website-template-1/src/main.tsx

import './styles.css'
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@rentify/storefront/api';
import { StorefrontWebsiteProvider as WebsiteProvider } from '@rentify/storefront';


const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <WebsiteProvider>
          <App />
        </WebsiteProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
