import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RentifyPOSProvider } from './hooks/useRentifyPOSContext.jsx';
import POSLayout from './components/layout/POSLayout.jsx';
import POSEntry from './pages/pos/POSEntry.jsx';
import POS from './pages/pos/POS.jsx';

export default function App() {
  return (
    <RentifyPOSProvider>
      <BrowserRouter>
        <POSLayout>
          <Routes>
            <Route path="/" element={<POSEntry />} />
            <Route path="/entry" element={<POSEntry />} />
            <Route path="/sell" element={<POS />} />
            <Route path="/tickets" element={<POS />} />
            <Route path="/returns" element={<POS />} />
            <Route path="/register" element={<POS />} />
            <Route path="/recovery" element={<POS />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </POSLayout>
      </BrowserRouter>
    </RentifyPOSProvider>
  );
}
