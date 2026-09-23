import React from 'react';
import { DEPLOYMENT_STAGES, ICON_MAP } from './constants';
import { Check } from 'lucide-react';

export default function DeploymentStages({ t, language, currentState }) {
  const getStageStatus = (stageId) => {
    const stageOrder = [
      'initializing',
      'creating_website',
      'deploying',
      'building',
      'finalizing',
    ];
    const currentIndex = stageOrder.indexOf(currentState);
    const stageIndex = stageOrder.indexOf(stageId);

    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStageColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 border-green-500 text-white';
      case 'current':
        return 'bg-blue-500 border-blue-500 text-white animate-pulse';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-400';
    }
  };

  const renderStageIcon = (stage, status) => {
    if (status === 'completed') {
      return <Check className="w-4 h-4" />;
    }
    if (status === 'current') {
      return (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      );
    }
    const IconComponent = ICON_MAP[stage.icon];
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4">
      <h4
        className={`font-medium text-gray-900 mb-4 text-center ${
          language === 'KH' ? 'font-khmer' : ''
        }`}
      >
        {language === 'KH' ? 'ដំណាក់កាលការដំឡើង' : 'Deployment Stages'}
      </h4>

      <div className="grid grid-cols-5 gap-4">
        {DEPLOYMENT_STAGES.map((stage) => {
          const status = getStageStatus(stage.id);
          return (
            <div key={stage.id} className="text-center group">
              {/* Stage Indicator */}
              <div className={`relative mb-3`}>
                <div
                  className={`w-12 h-12 rounded-xl border-2 ${getStageColor(
                    status
                  )} flex items-center justify-center mx-auto transition-all duration-300 group-hover:scale-110`}
                >
                  {renderStageIcon(stage, status)}
                </div>

                {/* Connector Line */}
                {stage.id !== 'finalizing' && (
                  <div
                    className={`absolute top-6 left-full w-full h-0.5 ${
                      status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                    } transform -translate-y-1/2 z-0`}
                  />
                )}
              </div>

              {/* Stage Label */}
              <div className="px-2">
                <span
                  className={`text-xs font-medium transition-colors ${
                    status === 'completed'
                      ? 'text-green-600'
                      : status === 'current'
                      ? 'text-blue-600'
                      : 'text-gray-500'
                  } ${language === 'KH' ? 'font-khmer' : ''}`}
                >
                  {t(stage.nameKey)}
                </span>
              </div>

              {/* Status Badge */}
              <div
                className={`mt-1 text-xs px-2 py-1 rounded-full ${
                  status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : status === 'current'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {status === 'completed'
                  ? '✓'
                  : status === 'current'
                  ? '⟳'
                  : '○'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
