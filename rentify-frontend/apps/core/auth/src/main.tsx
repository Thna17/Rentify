import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@rentify/apis';
import { WebsiteProvider } from '@rentify/shared/context/WebsiteContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <WebsiteProvider>
          <App />
        </WebsiteProvider>
        </PersistGate>
      </Provider>
    </BrowserRouter>
  </StrictMode>
);
