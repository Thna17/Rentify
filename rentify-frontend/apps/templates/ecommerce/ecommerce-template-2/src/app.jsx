import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { HeaderProvider, TranslationProvider } from '@rentify/storefront';

function App() {
  return (
    <BrowserRouter>
      <TranslationProvider>
        <HeaderProvider>
          <AppRoutes />
        </HeaderProvider>
      </TranslationProvider>
    </BrowserRouter>
  );
}

export default App;
