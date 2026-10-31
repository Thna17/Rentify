import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthLanguageProvider } from '../feature/auth/context/AuthLanguageContext';
import LoginPage from '../feature/auth/pages/LoginPage';
import SignupPage from '../feature/auth/pages/SignupPage';
import VerifyEmailPage from '../feature/auth/pages/VerifyEmailPage';
import ForgotPasswordPage from '../feature/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../feature/auth/pages/ResetPasswordPage';
import TelegramCallbackPage from '../feature/auth/pages/TelegramCallbackPage';

const App: React.FC = () => {
  return (
    <AuthLanguageProvider>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signin" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/register" element={<SignupPage />} />
        <Route path="/auth/telegram/callback" element={<TelegramCallbackPage />} />
        <Route path="/login/telegram/callback" element={<TelegramCallbackPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route
          path="/reset-password/:storeId/:token"
          element={<ResetPasswordPage />}
        />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </AuthLanguageProvider>
  );
};

export default App;
