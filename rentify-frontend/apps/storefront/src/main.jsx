import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '@rentify/storefront/api';
import { StorefrontShell } from './StorefrontShell';
import './shell.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <StorefrontShell />
    </Provider>
  </React.StrictMode>
);
