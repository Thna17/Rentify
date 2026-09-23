import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { TranslationProvider } from '@rentify/utils';

function App() {
  return (
    <BrowserRouter>
      <TranslationProvider>
          <AppRoutes />
      </TranslationProvider>

    </BrowserRouter>
  );
}

export default App;
