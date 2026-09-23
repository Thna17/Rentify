import React, { useState } from 'react';
import { Button } from '@rentify/shared/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@rentify/shared/ui/tooltip';
import { Badge } from '@rentify/shared/ui/badge';
import { Progress } from '@rentify/shared/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@rentify/shared/ui/dropdown-menu';
import {
  Maximize,
  Minimize,
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  Rocket,
  ArrowLeft,
  Copy,
  Link,
  CheckCircle2,
  ExternalLink,
  MoreVertical,
  Settings,
  QrCode,
} from 'lucide-react';
import QRCode from 'react-qr-code';

const HeaderControls = ({
  onBack,
  completionPercentage,
  refreshPreview,
  handleFullscreen,
}) => {
  return (
    <div className="absolute bottom-4 right-4 z-50">
      <TooltipProvider>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-accent hover:scale-110 transition-all duration-300"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Quick Actions</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenuContent
            align="end"
            className="w-48 rounded-xl shadow-2xl backdrop-blur-sm bg-background/95 border"
          >
            <DropdownMenuItem
              onClick={onBack}
              className="flex items-center gap-3 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={refreshPreview}
              className="flex items-center gap-3 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Preview</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleFullscreen}
              className="flex items-center gap-3 cursor-pointer"
            >
              <Maximize className="h-4 w-4" />
              <span>Fullscreen</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>
    </div>
  );
};

const CircularProgress = ({ value, size = 24 }) => {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold">{Math.round(value)}%</span>
      </div>
    </div>
  );
};

const BuildingProgress = () => (
  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
);

const PreviewPanel = ({
  refreshPreview,
  handlePublish,
  isPublishing,
  isFullscreen,
  previewMode,
  setPreviewMode,
  setIsFullscreen,
  device,
  children,
  onBack,
  completionPercentage,
  liveUrl,
  deploymentStatus,
  isStatusLoading,
  isStatusFetching,
}) => {
  const [isMdScreen, setIsMdScreen] = useState(false);
  const liveUrlWebsite = liveUrl
    ? liveUrl.startsWith('http://') || liveUrl.startsWith('https://')
      ? liveUrl
      : `https://${liveUrl}`
    : null;

  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsMdScreen(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleCopyUrl = () => {
    if (liveUrlWebsite) {
      navigator.clipboard.writeText(liveUrlWebsite);
      // You can add a toast notification here
    }
  };

  const handleFullscreen = () => setIsFullscreen(!isFullscreen);

  const getStatusContent = () => {
    if (!liveUrl) return null;

    const statusConfig = {
      building: {
        icon: <BuildingProgress />,
        text: 'Launching your vision...',
        chip: {
          label: 'Building',
          variant: 'default',
        },
        progress: true,
      },
      active: {
        icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
        text: 'Congrats! Your website is live!',
        chip: { label: 'Active', variant: 'default' },
        button: false,
      },
      failed: {
        icon: (
          <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center">
            !
          </div>
        ),
        text: 'Deployment Failed',
        chip: { label: 'Failed', variant: 'destructive' },
        button: true,
      },
    };

    const status = deploymentStatus?.status || 'building';
    const { icon, text, chip, button, progress } =
      statusConfig[status] || statusConfig.building;

    return (
      <Card className="mb-6 rounded-2xl shadow-xl border-0 bg-gradient-to-br from-background to-muted/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <CardContent className="p-6 relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Status Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                {icon}
                <span className="font-semibold text-lg">{text}</span>
                <Badge
                  variant={chip.variant}
                  className="border-2 font-semibold tracking-wide animate-pulse"
                >
                  {chip.label}
                </Badge>
              </div>

              {progress && (
                <div className="space-y-2">
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary via-primary/70 to-primary animate-shimmer bg-[length:200%_100%]" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This usually takes 20-40 seconds. We're optimizing every
                    pixel!
                  </p>
                </div>
              )}

              {status === 'active' && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Link className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm font-medium truncate">
                    {liveUrlWebsite}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCopyUrl}
                          className="h-8 w-8"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy URL</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {status === 'active' && (
                <>
                  <div className="hidden sm:block">
                    <QRCode
                      value={liveUrlWebsite}
                      size={80}
                      level="H"
                      className="rounded-lg border shadow-sm"
                    />
                  </div>
                  <Button
                    onClick={() => window.open(liveUrlWebsite, '_blank')}
                    className="rounded-full gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Visit Site
                  </Button>
                </>
              )}
              {status === 'failed' && (
                <Button
                  variant="destructive"
                  onClick={handlePublish}
                  className="rounded-full"
                >
                  Retry Deployment
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div
      className={`
      flex-1 p-3 bg-background overflow-auto h-screen min-w-0 w-full
      flex flex-col relative
      ${isFullscreen ? 'fixed inset-0 z-50 p-0' : ''}
    `}
    >
      {/* Header */}
      <Card className="w-full mb-6 rounded-2xl shadow-sm border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Left Section */}
            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onBack}
                      className="h-10 w-10 rounded-xl"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Go Back</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {!isMdScreen && <h2 className="text-xl font-bold">Preview</h2>}

              {/* Progress Indicator */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <CircularProgress value={completionPercentage} />
                      {!isMdScreen && (
                        <span className="text-sm text-muted-foreground">
                          {Math.round(completionPercentage)}% Complete
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{completionPercentage}% Complete - Keep going!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Publish Button */}
              <Button
                onClick={handlePublish}
                disabled={isPublishing}
                className={`
                  rounded-full gap-2 shadow-lg hover:shadow-xl transition-all
                  ${isPublishing ? 'opacity-70' : ''}
                `}
                variant={isPublishing ? 'secondary' : 'default'}
              >
                {isPublishing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {!isMdScreen && 'Publishing...'}
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    {!isMdScreen && 'Publish'}
                  </>
                )}
              </Button>

              {/* Control Buttons */}
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={refreshPreview}
                        className="h-10 w-10 rounded-xl"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh Preview</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleFullscreen}
                        className="h-10 w-10 rounded-xl"
                      >
                        {isFullscreen ? (
                          <Minimize className="h-4 w-4" />
                        ) : (
                          <Maximize className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Device Controls */}
                {!isMdScreen && (
                  <div className="flex bg-muted rounded-xl p-1 ml-1">
                    {[
                      { type: 'desktop', icon: Monitor },
                      { type: 'tablet', icon: Tablet },
                      { type: 'mobile', icon: Smartphone },
                    ].map(({ type, icon: Icon }) => (
                      <TooltipProvider key={type}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={
                                previewMode === type ? 'default' : 'ghost'
                              }
                              size="icon"
                              onClick={() => setPreviewMode(type)}
                              className="h-8 w-8 rounded-lg"
                            >
                              <Icon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {type.charAt(0).toUpperCase() + type.slice(1)}{' '}
                              View
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header Controls */}
      <HeaderControls
        onBack={onBack}
        completionPercentage={completionPercentage}
        refreshPreview={refreshPreview}
        handleFullscreen={handleFullscreen}
      />

      {/* Live Website Status */}
      {liveUrl && getStatusContent()}

      {/* Preview Frame */}
      <div
        className={`
          flex-1 relative overflow-auto
          ${liveUrl ? 'h-[calc(100%-240px)]' : 'h-[calc(100%-120px)]'}
        `}
      >
        <div
          className={`
            mx-auto relative transition-all duration-300
            ${
              isFullscreen
                ? 'fixed inset-0 z-50 w-screen h-screen rounded-none p-0 bg-background shadow-none'
                : device.frame
            }
            ${
              previewMode === 'mobile'
                ? 'scale-90'
                : previewMode === 'tablet'
                ? 'scale-95'
                : 'scale-100'
            }
          `}
          style={isFullscreen ? {} : device.frame}
        >
          <div className="w-full h-full overflow-hidden" style={device.screen}>
            {children}
          </div>
        </div>
      </div>

      {/* Custom styles for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 2s linear infinite;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          background-size: 200% 100%;
        }
      `}</style>
    </div>
  );
};

export default PreviewPanel;
