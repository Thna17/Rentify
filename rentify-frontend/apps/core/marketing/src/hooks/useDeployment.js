import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useCheckDeploymentStatusQuery,
  useCreateWebsiteMutation,
  useDeployProjectMutation,
  useUpdateWebsiteStatusMutation,
  useUploadImageMutation,
} from '@rentify/apis';
import { DASHBOARD_URL } from '@rentify/shared/config/urls';

export const DEPLOYMENT_STATES = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  CREATING_WEBSITE: 'creating_website',
  DEPLOYING: 'deploying',
  BUILDING: 'building',
  FINALIZING: 'finalizing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

const STATUS_POLL_INTERVAL = 3000;
const PROGRESS_UPDATE_INTERVAL = 800;
const MAX_RETRY_ATTEMPTS = 3;
// Publishing assigns the store's Rentify subdomain and answers READY at once;
// the status endpoint (keyed by website) is only consulted if it does not.
const getDeploymentUrl = (deployment) =>
  deployment?.deploymentUrl || deployment?.url || '';

const getSafeErrorMessage = (error) => {
  const message = error?.data?.message || error?.data?.error || error?.message;
  if (!message || message.length > 180)
    return 'We could not complete this deployment. Please try again.';
  return message;
};

export default function useDeployment(data) {
  const [state, setState] = useState(DEPLOYMENT_STATES.IDLE);
  const [progress, setProgress] = useState(0);
  const [siteUrl, setSiteUrl] = useState('');
  const [details, setDetails] = useState([]);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [pendingWebsiteId, setPendingWebsiteId] = useState(null);
  const progressIntervalRef = useRef(null);
  const websiteIdRef = useRef(null);
  const completedRef = useRef(false);
  const isMountedRef = useRef(true);

  const [createWebsite, { isLoading: creatingWebsite }] =
    useCreateWebsiteMutation();
  const [deployProject, { isLoading: deploying }] = useDeployProjectMutation();
  const [updateWebsiteStatus] = useUpdateWebsiteStatusMutation();
  const [uploadImage] = useUploadImageMutation();
  const {
    data: deploymentStatus,
    error: deploymentStatusError,
    isError: isDeploymentStatusError,
  } = useCheckDeploymentStatusQuery(
    { websiteId: pendingWebsiteId },
    { pollingInterval: STATUS_POLL_INTERVAL, skip: !pendingWebsiteId }
  );

  const clearProgressSimulation = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = null;
  }, []);

  const addDetail = useCallback((message, type = 'info') => {
    if (!isMountedRef.current) return;
    setDetails((previous) => [
      ...previous,
      {
        id: `${Date.now()}-${Math.random()}`,
        message,
        type,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);

  const updateProgress = useCallback((nextProgress, immediate = false) => {
    if (!isMountedRef.current) return;
    setProgress((previous) =>
      immediate ? nextProgress : Math.max(previous, nextProgress)
    );
  }, []);

  const startProgressSimulation = useCallback(
    (nextState) => {
      clearProgressSimulation();
      const baseProgress =
        {
          [DEPLOYMENT_STATES.CREATING_WEBSITE]: 15,
          [DEPLOYMENT_STATES.DEPLOYING]: 35,
          [DEPLOYMENT_STATES.BUILDING]: 55,
          [DEPLOYMENT_STATES.FINALIZING]: 85,
        }[nextState] || 5;
      updateProgress(baseProgress, true);
      progressIntervalRef.current = setInterval(() => {
        if (isMountedRef.current)
          setProgress((current) =>
            Math.min(current + (current < 90 ? 1 : 0.2), 95)
          );
      }, PROGRESS_UPDATE_INTERVAL);
    },
    [clearProgressSimulation, updateProgress]
  );

  const resetState = useCallback(
    ({ preserveWebsite = false } = {}) => {
      clearProgressSimulation();
      completedRef.current = false;
      setProgress(0);
      setDetails([]);
      setError('');
      setPendingWebsiteId(null);
      if (!preserveWebsite) {
        websiteIdRef.current = null;
        setSiteUrl('');
        setRetryCount(0);
      }
    },
    [clearProgressSimulation]
  );

  const handleDeploymentError = useCallback(
    async (caughtError, step) => {
      clearProgressSimulation();
      setError(getSafeErrorMessage(caughtError));
      setState(DEPLOYMENT_STATES.FAILED);
      setProgress(0);
      setPendingWebsiteId(null);
      addDetail(`Deployment stopped during ${step}.`, 'error');
      if (websiteIdRef.current) {
        try {
          await updateWebsiteStatus({
            websiteId: websiteIdRef.current,
            status: 'failed',
          }).unwrap();
        } catch {
          // The primary error is already visible; never mask it with a status update failure.
        }
      }
    },
    [addDetail, clearProgressSimulation, updateWebsiteStatus]
  );

  const createWebsiteForDeployment = useCallback(async () => {
    setState(DEPLOYMENT_STATES.CREATING_WEBSITE);
    addDetail('Creating your storefront…');
    startProgressSimulation(DEPLOYMENT_STATES.CREATING_WEBSITE);
    const response = await createWebsite({
      templateId: data.template?.id,
      businessData: data.businessDetails,
      packageId: data.package?.id,
      pricing: { totalPrice: 0 },
      payment: null,
    }).unwrap();
    const website = response?.data || response;
    if (!website?.id)
      throw new Error('The website could not be created. Please try again.');
    websiteIdRef.current = website.id;

    if (data.businessDetails?.file) {
      try {
        addDetail('Uploading store logo…');
        await uploadImage({
          websiteId: website.id,
          file: data.businessDetails.file,
          isLogo: true,
        }).unwrap();
        addDetail('Store logo uploaded.', 'success');
      } catch (uploadErr) {
        console.warn('Logo upload during deployment could not complete:', uploadErr);
      }
    }

    addDetail('Storefront created. Publishing it on its own web address.', 'success');
    updateProgress(30, true);
    return website;
  }, [
    addDetail,
    createWebsite,
    data.businessDetails,
    data.package?.id,
    data.template?.id,
    startProgressSimulation,
    updateProgress,
    uploadImage,
  ]);

  const completeDeployment = useCallback(async () => {
    // Core marks the website live as part of publishing; nothing to confirm here.
    clearProgressSimulation();
    setPendingWebsiteId(null);
    updateProgress(100, true);
    addDetail('Your storefront is live.', 'success');
    setState(DEPLOYMENT_STATES.COMPLETED);
  }, [addDetail, clearProgressSimulation, updateProgress]);

  const deployWebsite = useCallback(
    async (websiteId) => {
      setState(DEPLOYMENT_STATES.DEPLOYING);
      addDetail('Publishing your storefront…');
      startProgressSimulation(DEPLOYMENT_STATES.DEPLOYING);
      const deployment = await deployProject(websiteId).unwrap();
      const url = getDeploymentUrl(deployment);
      if (!url) throw new Error('Your store address could not be reserved. Please try again.');
      setSiteUrl(url);
      addDetail(`Your address is ${url.replace(/^https?:\/\//, '')}.`, 'success');
      if (deployment?.status === 'READY') {
        completedRef.current = true;
        await completeDeployment();
        return;
      }
      setPendingWebsiteId(websiteId);
      setState(DEPLOYMENT_STATES.FINALIZING);
      startProgressSimulation(DEPLOYMENT_STATES.FINALIZING);
    },
    [addDetail, completeDeployment, deployProject, startProgressSimulation]
  );

  useEffect(() => {
    const status = deploymentStatus?.status;
    if (completedRef.current) return;
    if (isDeploymentStatusError) {
      completedRef.current = true;
      void handleDeploymentError(
        deploymentStatusError,
        'deployment status check'
      );
      return;
    }
    if (!status) return;
    if (status === 'READY') {
      completedRef.current = true;
      void completeDeployment().catch((caughtError) =>
        handleDeploymentError(caughtError, 'finalization')
      );
    } else if (['FAILED', 'SUSPENDED', 'EXPIRED', 'ARCHIVED', 'DELETED'].includes(status)) {
      completedRef.current = true;
      void handleDeploymentError(
        new Error('Your storefront could not be published.'),
        'publishing'
      );
    }
  }, [
    completeDeployment,
    deploymentStatus?.status,
    deploymentStatusError,
    handleDeploymentError,
    isDeploymentStatusError,
  ]);

  const startDeployment = useCallback(async () => {
    if (creatingWebsite || deploying) return;
    try {
      resetState();
      setState(DEPLOYMENT_STATES.INITIALIZING);
      addDetail('Starting a secure storefront deployment…');
      updateProgress(5, true);
      const website = await createWebsiteForDeployment();
      await deployWebsite(website.id);
    } catch (caughtError) {
      await handleDeploymentError(caughtError, 'setup');
    }
  }, [
    addDetail,
    createWebsiteForDeployment,
    creatingWebsite,
    deployWebsite,
    deploying,
    handleDeploymentError,
    resetState,
    updateProgress,
  ]);

  const retryDeployment = useCallback(async () => {
    if (creatingWebsite || deploying) return;
    setRetryCount((previous) => Math.min(previous + 1, MAX_RETRY_ATTEMPTS));
    try {
      if (websiteIdRef.current) {
        resetState({ preserveWebsite: true });
        setState(DEPLOYMENT_STATES.INITIALIZING);
        addDetail('Retrying the existing storefront deployment…');
        await deployWebsite(websiteIdRef.current);
      } else {
        await startDeployment();
      }
    } catch (caughtError) {
      await handleDeploymentError(caughtError, 'retry');
    }
  }, [
    addDetail,
    creatingWebsite,
    deployWebsite,
    deploying,
    handleDeploymentError,
    resetState,
    startDeployment,
  ]);

  const copyToClipboard = useCallback(
    async (text) => {
      if (!text || !navigator.clipboard?.writeText) {
        addDetail('Copy is not available in this browser.', 'warning');
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        addDetail('Storefront URL copied.', 'success');
      } catch {
        addDetail('Could not copy the storefront URL.', 'warning');
      }
    },
    [addDetail]
  );

  useEffect(
    () => () => {
      isMountedRef.current = false;
      clearProgressSimulation();
    },
    [clearProgressSimulation]
  );

  return {
    state,
    progress,
    siteUrl,
    dashboardUrl: DASHBOARD_URL,
    details,
    error,
    retryCount,
    maxRetries: MAX_RETRY_ATTEMPTS,
    isCreating: creatingWebsite,
    isDeploying: deploying,
    startDeployment,
    retryDeployment,
    copyToClipboard,
  };
}
