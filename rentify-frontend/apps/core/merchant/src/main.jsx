// apps/dashboard/src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@rentify/apis';
import './styles.css';
import { WebsiteProvider } from '@rentify/shared/context/WebsiteContext';
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
