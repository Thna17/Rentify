import React from 'react';
import { Button } from '@rentify/shared/ui/button';
import { RefreshCw } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';

export default function FailedState({ t, language, error, onRetry }) {
  return (
    <div className="bg-white border border-red-200 rounded-xl p-6 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-8 h-8 text-red-600" />
      </div>
      <h3 className={`text-xl font-bold text-red-700 mb-2 ${language === 'KH' ? 'font-khmer' : ''}`}>
        {t('deployment.failed.title')}
      </h3>
      <p className={`text-gray-600 mb-6 ${language === 'KH' ? 'font-khmer' : ''}`}>
        {error || t('deployment.failed.description')}
      </p>
      
      <Button onClick={onRetry} className="bg-gradient-to-r from-primary to-secondary">
        <RefreshCw className="w-4 h-4 mr-2" />
        {t('deployment.failed.retry')}
      </Button>

      <div className="mt-6 text-left bg-red-50 rounded-lg p-4">
        <h4 className={`font-medium text-red-800 mb-2 ${language === 'KH' ? 'font-khmer' : ''}`}>
          {t('deployment.failed.troubleshooting')}
        </h4>
        <ul className={`text-sm text-red-700 space-y-1 ${language === 'KH' ? 'font-khmer' : ''}`}>
          <li>{t('deployment.failed.tip1')}</li>
          <li>{t('deployment.failed.tip2')}</li>
          <li>{t('deployment.failed.tip3')}</li>
        </ul>
      </div>
    </div>
  );
}