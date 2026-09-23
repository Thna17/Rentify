import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css'
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@rentify/apis';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
          <App />
  
      </PersistGate>
    </Provider>
  </React.StrictMode>
);