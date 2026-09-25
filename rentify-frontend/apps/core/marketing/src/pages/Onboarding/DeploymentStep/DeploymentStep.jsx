import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import useDeployment from '../../../hooks/useDeployment';
import IdleState from './DeploymentStates/IdleState';
import ProgressState from './DeploymentStates/ProgressState';
import FailedState from './DeploymentStates/FailedState';
import CompletedState from './DeploymentStates/CompletedState';
import StepHeader from '../components/StepHeader';
import { Rocket, RefreshCw } from 'lucide-react';

const DeploymentStep = ({ data }) => {
  const { t, language } = useLanguage();
  const {
    state,
    progress,
    siteUrl,
    dashboardUrl,
    details,
    error,
    retryCount,
    maxRetries,
    isCreating,
    isDeploying,
    startDeployment,
    retryDeployment,
    copyToClipboard,
  } = useDeployment(data);

  const getStateConfig = () => {
    const baseConfig = {
      idle: {
        title: t('deployment.title.idle'),
        description: t('deployment.description.idle'),
        icon: Rocket,
        showAction: true,
      },
      initializing: {
        title: t('deployment.title.initializing'),
        description: t('deployment.description.initializing'),
        icon: RefreshCw,
        showAction: false,
      },
      creating_website: {
        title: t('deployment.title.creating_website'),
        description: t('deployment.description.creating_website'),
        icon: RefreshCw,
        showAction: false,
      },
      deploying: {
        title: t('deployment.title.deploying'),
        description: t('deployment.description.deploying'),
        icon: RefreshCw,
        showAction: false,
      },
      building: {
        title: t('deployment.title.building'),
        description: t('deployment.description.building'),
        icon: RefreshCw,
        showAction: false,
      },
      finalizing: {
        title: t('deployment.title.finalizing'),
        description: t('deployment.description.finalizing'),
        icon: RefreshCw,
        showAction: false,
      },
      completed: {
        title: t('deployment.title.completed'),
        description: t('deployment.description.completed'),
        icon: Rocket,
        showAction: false,
      },
      failed: {
        title: t('deployment.title.failed'),
        description: error || t('deployment.description.failed'),
        icon: RefreshCw,
        showAction: retryCount < maxRetries,
      },
    };

    return baseConfig[state] || baseConfig.idle;
  };

  const stateConfig = getStateConfig();

  const renderState = () => {
    switch (state) {
      case 'idle':
        return (
          <IdleState
            t={t}
            language={language}
            data={data}
            onStart={startDeployment}
            isCreating={isCreating}
            isDeploying={isDeploying}
          />
        );
      case 'failed':
        return (
          <FailedState
            t={t}
            language={language}
            error={error}
            retryCount={retryCount}
            maxRetries={maxRetries}
            onRetry={retryDeployment}
          />
        );
      case 'completed':
        return (
          <CompletedState
            t={t}
            language={language}
            siteUrl={siteUrl}
            dashboardUrl={dashboardUrl}
            onCopy={copyToClipboard}
          />
        );
      default:
        return (
          <ProgressState
            t={t}
            language={language}
            progress={progress}
            details={details}
            currentState={state}
            stateConfig={stateConfig}
          />
        );
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <StepHeader
          icon={stateConfig.icon}
          title={stateConfig.title}
          description={stateConfig.description}
        />
        {retryCount > 0 && (
          <p className="text-sm text-orange-600 md:pl-16">
            {t('onboarding.ui.retryAttempt')} {retryCount}/{maxRetries}
          </p>
        )}
      </div>

      {renderState()}
    </div>
  );
};

export default DeploymentStep;
