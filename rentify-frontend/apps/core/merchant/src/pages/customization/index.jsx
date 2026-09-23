import React, { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  useDeployProjectMutation,
  useCheckDeploymentStatusQuery 
} from '@rentify/website/services/deploymentApi';
import {
  useCreateWebsiteMutation,
  useUpdateWebsiteMutation,
  useUploadImageMutation,
} from '@rentify/website/services/websiteApi';

// shadcn/ui components
import { Button } from "@rentify/shared/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from "@rentify/shared/ui/dialog";
import { Alert, AlertDescription } from "@rentify/shared/ui/alert";
import { Skeleton } from "@rentify/shared/ui/skeleton";
import { Progress } from "@rentify/shared/ui/progress";
import { Input } from "@rentify/shared/ui/input";
import { Card, CardContent } from "@rentify/shared/ui/card";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@rentify/shared/ui/accordion";
import { Badge } from "@rentify/shared/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@rentify/shared/ui/tooltip";

// Icons (using Lucide React - you'll need to install these)
import { 
  User, 
  CheckCircle2, 
  Hand, 
  AlertCircle, 
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  ExternalLink,
  Maximize,
  Minimize,
  LayoutTemplate,
  Settings,
  Eye,
  Rocket,
  ChevronLeft,
  Search,
  Palette,
  Image,
  FileText
} from 'lucide-react';

import { deviceFrames } from '../../config/deviceFrames';
import Iframe from 'react-iframe';
import TemplateSidebar from './components/TemplatesSidebar';
import EditorPanel from './components/EditorPanel';
import PreviewPanel from './components/PreviewPanel';

const DEBOUNCE_TYPES = ['text', 'number', 'link'];

const Customization = () => {
  const [uploadError, setUploadError] = useState(null);
  const [mobileWarning, setMobileWarning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Advanced Mobile Handling
  useEffect(() => {
    if (isMobile) {
      setMobileWarning(true);
      return () => setMobileWarning(false);
    }
  }, [isMobile]);

  if (isMobile) {
    return (
      <Dialog open={mobileWarning} onOpenChange={setMobileWarning}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center justify-center space-y-4 p-6">
            <div className="relative">
              <Hand className="h-16 w-16 text-primary animate-pulse" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Desktop-Optimized Editor
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                For the best experience, please use a device with a larger screen.
              </DialogDescription>
            </DialogHeader>
            <Button 
              onClick={() => setMobileWarning(false)}
              className="mt-4 px-8 py-2 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Got It!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const userData = localStorage.getItem('persist:auth');
  let user = null;

  if (userData) {
    try {
      const userObject = JSON.parse(userData);
      user = JSON.parse(userObject.user);
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }

  const userId = user?.id || null;
  const navigate = useNavigate();
  
  if (!userId) {
    return (
      <Dialog open={true}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-gray-50 to-white text-center shadow-2xl">
          <div className="flex flex-col items-center justify-center space-y-4 p-8">
            <User className="h-20 w-20 text-primary drop-shadow-lg" />
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                Join to Continue
              </DialogTitle>
              <DialogDescription className="text-lg text-muted-foreground">
                Create an account or sign in to start building your website
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-4 mt-6">
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                className="px-8 rounded-xl font-semibold hover:shadow-md transition-all"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate('/signup')}
                className="px-8 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Get Started
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const location = useLocation();
  const { businessData } = location.state || {};

  const { websiteId } = useParams();
  const [baseUrl, setBaseUrl] = useState(null);
  const [route, setRoute] = useState('/');
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef(null);
  const [websiteID, setWebsiteID] = useState(null);

  const [pages, setPages] = useState(null);
  const fullUrl = `${baseUrl}${route}?websiteId=${websiteID}&userId=${userId}&preview=true`;
  
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.src !== fullUrl) {
      iframeRef.current.src = fullUrl;
    }
  }, [fullUrl]);
  
  const filteredTemplates = pages?.filter((t, index) => t.id !== 0);

  const [colorPalettes, setColorPalettes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(1);
  const [content, setContent] = useState(null);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [publishStatus, setPublishStatus] = useState({
    open: false,
    success: false,
    message: '',
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [isTemplatePanelCollapsed, setIsTemplatePanelCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAccordions, setExpandedAccordions] = useState({});

  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [liveUrl, setLiveUrl] = useState(null);

  useEffect(() => {
    const totalFields = content?.length;
    const completedFields = content?.filter((item) => item.value !== '').length;
    const percentage = Math.round((completedFields / totalFields) * 100);
    setCompletionPercentage(percentage);
  }, [content]);

  const [createWebsite] = useCreateWebsiteMutation();
  const [updateWebsite] = useUpdateWebsiteMutation();
  const [uploadImage] = useUploadImageMutation();
  
  const handleImageUpload = async (id, file) => {
    try {
      setUploadError(null);

      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      const response = await uploadImage({ file, websiteId: userId }).unwrap();
      handleContentChange(id, response.url);
    } catch (error) {
      setUploadError(error.data?.error || error.message);
    }
  };

  const [pollingInterval, setPollingInterval] = useState(0);
  const [deployProject, { isLoading, isError, data, error }] = useDeployProjectMutation();
  const {
    data: deploymentStatus,
    refetch: refetchStatus,
    isLoading: isStatusLoading,
    isFetching: isStatusFetching,
  } = useCheckDeploymentStatusQuery(
    { domain: liveUrl?.replace(/https?:\/\//, '') },
    {
      skip: !liveUrl,
      pollingInterval,
    }
  );

  useEffect(() => {
    if (deploymentStatus?.shouldPoll) {
      setPollingInterval(10000);
    } else {
      setPollingInterval(0);
    }
  }, [deploymentStatus]);

  useEffect(() => {
    const initializeWebsite = async () => {
      try {
        const website = await createWebsite({
          templateId: websiteId,
          userId: userId,
          businessData: businessData,
        }).unwrap();
        console.log(website);

        if (website.dataValues.domain) {
          setLiveUrl(`${website.dataValues.domain}`);
        }
        setWebsiteID(website.dataValues.id);
        setPages(website.pages);
        setBaseUrl(website.baseUrl);
        setColorPalettes(website.colorPalettes);
        setContent(website.dataValues.content);
      } catch (error) {
        console.error('Error initializing website:', error);
      } finally {
        setLoading(false);
      }
    };
    initializeWebsite();
  }, []);

  const saveContent = useCallback(
    async (newContent) => {
      const updatedPalette =
        newContent.find((item) => item.type === 'palette')?.value ||
        colorPalettes[0];
      try {
        await updateWebsite({
          id: websiteID,
          templateId: websiteId,
          userId: userId,
          data: {
            content: newContent,
            templateId: selectedTemplate,
            colorPalette: updatedPalette,
          },
        }).unwrap();
        setIframeKey((prevKey) => prevKey + 1);
      } catch (error) {
        console.error('Error updating content:', error);
      }
    },
    [updateWebsite, websiteId, selectedTemplate, deploymentStatus]
  );

  const debouncedSave = useCallback(
    debounce((newContent) => {
      saveContent(newContent);
    }, 1500),
    [saveContent]
  );

  useEffect(() => {
    return () => debouncedSave.cancel();
  }, [debouncedSave]);

  const handleContentChange = (id, value) => {
    const item = content.find((item) => item.id === id);
    if (!item) return;

    const newContent = content.map((item) =>
      item.id === id ? { ...item, value } : item
    );

    setContent(newContent);

    if (DEBOUNCE_TYPES.includes(item.type)) {
      debouncedSave(newContent);
    } else {
      saveContent(newContent);
    }
  };

  const handleTemplateChange = async (newTemplateId) => {
    try {
      const selected = filteredTemplates.find((t) => t.id === newTemplateId);
      setRoute(selected.route);
      await updateWebsite({
        id: websiteID,
        templateId: websiteId,
        userId: userId,
        data: { templateId: newTemplateId },
      }).unwrap();
      setSelectedTemplate(newTemplateId);
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const refreshPreview = () => {
    setIframeKey((prevKey) => prevKey + 1);
  };

  const handlePublish = useCallback(async () => {
    try {
      setIsPublishing(true);
      setLiveUrl(null);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const response = await deployProject({
        templateId: websiteId,
        userId: user.id,
      }).unwrap();
      const cleanDomain = response.deploymentUrl.replace(/https?:\/\//, '');
      setLiveUrl(cleanDomain);
    } catch (error) {
      setPublishStatus({
        open: true,
        success: false,
        message: error.data?.error || error.message || String(error),
      });
    } finally {
      setIsPublishing(false);
    }
  }, [deployProject, websiteId, user?.id]);

  useEffect(() => {
    if (businessData && websiteID) {
      handlePublish();
    }
  }, [businessData, websiteID, handlePublish]);

  const filteredContent = content?.filter((item) => {
    const matchesSearch = item.label
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesTemplate =
      item.category.toLowerCase() ===
      filteredTemplates
        .find((t) => t.id === selectedTemplate)
        ?.page.toLowerCase();
    return matchesSearch && matchesTemplate;
  });
  
  const groupedContent = filteredContent?.reduce((acc, item) => {
    const type =
      item.type === 'palette'
        ? 'Theme'
        : item.type === 'image'
        ? 'Media'
        : 'Content';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const handleAccordionChange = (panel) => (isExpanded) => {
    setExpandedAccordions({ ...expandedAccordions, [panel]: isExpanded });
  };

  const device = deviceFrames[previewMode];

  if (loading) {
    return (
      <div className="flex p-6 gap-6">
        <Skeleton className="w-60 h-screen rounded-xl" />
        <Skeleton className="w-80 h-screen rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-screen rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Templates Sidebar */}
      <TemplateSidebar
        isTemplatePanelCollapsed={isTemplatePanelCollapsed}
        handleTemplateChange={handleTemplateChange}
        setIsTemplatePanelCollapsed={setIsTemplatePanelCollapsed}
        selectedTemplate={selectedTemplate}
        templates={filteredTemplates}
      />

      <EditorPanel
        groupedContent={groupedContent}
        expandedAccordions={expandedAccordions}
        handleAccordionChange={handleAccordionChange}
        handleContentChange={handleContentChange}
        searchQuery={searchQuery}
        colorPalettes={colorPalettes}
        debouncedSave={debouncedSave}
        setSearchQuery={setSearchQuery}
        uploadImage={handleImageUpload}
      />

      {/* Preview Panel */}
      <PreviewPanel
        onBack={() => navigate(`/templates/${websiteId}`)}
        completionPercentage={completionPercentage}
        liveUrl={liveUrl}
        refreshPreview={refreshPreview}
        handlePublish={handlePublish}
        isPublishing={isPublishing}
        isFullscreen={isFullscreen}
        previewMode={previewMode}
        setPreviewMode={setPreviewMode}
        setIsFullscreen={setIsFullscreen}
        device={device}
        deploymentStatus={deploymentStatus}
        isStatusLoading={isStatusLoading}
        isStatusFetching={isStatusFetching}
      >
        <div className="relative h-full transition-opacity duration-300">
          <Iframe
            key={iframeKey}
            ref={iframeRef}
            title="Persistent Iframe"
            src={fullUrl}
            width="100%"
            height="100%"
            styles={{
              border: 'none',
              transition: 'opacity 0.3s ease',
            }}
            attributes={{
              crossOrigin: 'same-site',
              allow: 'cross-origin-isolated',
            }}
          />
        </div>
      </PreviewPanel>

      {/* Toast/Snackbar for publish status */}
      {publishStatus.open && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right-full duration-300">
          <Alert className={`w-96 shadow-2xl rounded-2xl ${
            publishStatus.success 
              ? 'border-green-200 bg-green-50 text-green-900' 
              : 'border-red-200 bg-red-50 text-red-900'
          }`}>
            <div className="flex items-center gap-3">
              {publishStatus.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <AlertDescription className="font-semibold">
                {publishStatus.message}
              </AlertDescription>
            </div>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default Customization;