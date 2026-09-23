import React from 'react';
import DeploymentStages from '../DeploymentStages';
import DeploymentLog from '../DeploymentLog';
import { Rocket, RefreshCw } from 'lucide-react';

export default function ProgressState({ t, language, progress, details, currentState, stateConfig }) {
  const getStatusColor = () => {
    switch (currentState) {
      case 'creating_website': return 'from-blue-500 to-blue-600';
      case 'deploying': return 'from-purple-500 to-purple-600';
      case 'building': return 'from-orange-500 to-orange-600';
      case 'finalizing': return 'from-green-500 to-green-600';
      default: return 'from-primary to-secondary';
    }
  };

  const getStatusIcon = () => {
    const isBuilding = ['deploying', 'building', 'finalizing'].includes(currentState);
    return isBuilding ? 
      <RefreshCw className="w-5 h-5 animate-spin" /> : 
      <Rocket className="w-5 h-5" />;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      {/* Header with Progress */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${getStatusColor()} flex items-center justify-center`}>
            {getStatusIcon()}
          </div>
          <div>
            <h3 className={`font-semibold text-gray-900 ${language === 'KH' ? 'font-khmer' : ''}`}>
              {stateConfig?.title || t('deployment.progress.title')}
            </h3>
            <p className={`text-sm text-gray-600 ${language === 'KH' ? 'font-khmer' : ''}`}>
              {stateConfig?.description || t('deployment.progress.subtitle')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{Math.round(progress)}%</div>
          <div className={`text-xs text-gray-500 ${language === 'KH' ? 'font-khmer' : ''}`}>
            {language === 'KH' ? 'បានបញ្ចប់' : 'Complete'}
          </div>
        </div>
      </div>

      {/* Enhanced Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span className={language === 'KH' ? 'font-khmer' : ''}>
            {language === 'KH' ? 'កំពុងដំណើរការ' : 'In Progress'}
          </span>
          <span className={language === 'KH' ? 'font-khmer' : ''}>
            {language === 'KH' ? 'ស្ទើរតែរួចរាល់' : 'Almost There'}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`bg-gradient-to-r ${getStatusColor()} h-3 rounded-full transition-all duration-500 ease-out shadow-sm`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <div className="w-1/5 h-1 bg-blue-500 rounded-full"></div>
          <div className="w-1/5 h-1 bg-purple-500 rounded-full"></div>
          <div className="w-1/5 h-1 bg-orange-500 rounded-full"></div>
          <div className="w-1/5 h-1 bg-green-500 rounded-full"></div>
          <div className="w-1/5 h-1 bg-gray-200 rounded-full"></div>
        </div>
      </div>

      {/* Deployment Stages */}
      <div className="mb-6">
        <DeploymentStages t={t} language={language} currentState={currentState} />
      </div>

      {/* Live Deployment Log */}
      <DeploymentLog t={t} language={language} details={details} />
    </div>
  );
}