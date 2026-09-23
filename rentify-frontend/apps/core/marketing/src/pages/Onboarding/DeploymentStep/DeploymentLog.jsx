import React from 'react';
import { CheckCircle, AlertCircle, Clock, Info } from 'lucide-react';

export default function DeploymentLog({ t, language, details }) {
  const getLogIcon = (type) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      default: return 'bg-green-50 border-green-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className={`font-semibold text-gray-900 ${language === 'KH' ? 'font-khmer' : ''}`}>
            {t('deployment.log.title')}
          </h4>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className={`text-sm text-gray-600 ${language === 'KH' ? 'font-khmer' : ''}`}>
              {language === 'KH' ? 'កំណត់ហេតុផ្ទាល់ពេល' : 'Live Logs'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {details.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Info className="w-6 h-6 text-gray-400" />
            </div>
            <p className={`text-gray-500 ${language === 'KH' ? 'font-khmer' : ''}`}>
              {t('deployment.log.empty')}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {details.map((detail) => (
              <div
                key={detail.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${getLogColor(detail.type)}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getLogIcon(detail.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${language === 'KH' ? 'font-khmer' : ''} ${
                    detail.type === 'error' ? 'text-red-800' :
                    detail.type === 'warning' ? 'text-yellow-800' :
                    'text-gray-800'
                  }`}>
                    {detail.message}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500 font-mono">
                      {detail.timestamp}
                    </span>
                    {detail.type === 'error' && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        {language === 'KH' ? 'កំហុស' : 'Error'}
                      </span>
                    )}
                    {detail.type === 'warning' && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                        {language === 'KH' ? 'ការព្រមាន' : 'Warning'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {details.length > 0 && (
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
          <p className={`text-xs text-gray-600 text-center ${language === 'KH' ? 'font-khmer' : ''}`}>
            {language === 'KH' 
              ? `កំណត់ហេតុសរុប: ${details.length}`
              : `Total logs: ${details.length}`
            }
          </p>
        </div>
      )}
    </div>
  );
}