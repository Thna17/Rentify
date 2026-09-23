// SavingIndicator.jsx (Enhanced)
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@rentify/utils";
import { Button } from "@rentify/shared/ui/button";
import React from "react";

interface SavingIndicatorProps {
  t?: (key: string) => string | any;
  isVisible?: boolean;
  status?: 'saving' | 'saved' | 'error' | 'pending' | string;
  onRetry?: () => void;
  progress?: number;
  duration?: number;
  onHide?: () => void;
  className?: string;
}

export const SavingIndicator: React.FC<SavingIndicatorProps> = ({ 
  t = (key: string) => key, 
  isVisible = true,
  status = "saving", // 'saving', 'saved', 'error', 'pending'
  onRetry,
  progress, // Optional progress value (0-100)
  duration = 3000, // Auto-hide duration for success/error states
  onHide,
  className 
}) => {
  // Auto-hide for success and error states
  React.useEffect(() => {
    if ((status === 'saved' || status === 'error') && duration > 0) {
      const timer = setTimeout(() => {
        onHide?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [status, duration, onHide]);

  const statusConfig = {
    saving: {
      icon: Loader2,
      bg: "bg-amber-50/90 border-amber-200 text-amber-800",
      iconClass: "animate-spin"
    },
    saved: {
      icon: CheckCircle2,
      bg: "bg-emerald-50/90 border-emerald-200 text-emerald-800",
      iconClass: ""
    },
    error: {
      icon: AlertCircle,
      bg: "bg-red-50/90 border-red-200 text-red-800",
      iconClass: ""
    },
    pending: {
      icon: Clock,
      bg: "bg-blue-50/90 border-blue-200 text-blue-800",
      iconClass: ""
    }
  };

  const config = (statusConfig as any)[status] || statusConfig.saving;
  const IconComponent = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "fixed bottom-6 right-6 z-50 min-w-[280px]",
            className
          )}
        >
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm",
            config.bg
          )}>
            <div className="flex-shrink-0">
              <IconComponent className={cn("h-5 w-5", config.iconClass)} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">
                  {t(`dashboard.store_management.${status}_changes`)}
                </span>
                {progress !== undefined && (
                  <span className="text-xs font-medium ml-2">
                    {progress}%
                  </span>
                )}
              </div>
              
              {/* Progress bar */}
              {progress !== undefined && (
                <div className="mt-2 w-full h-1 bg-current/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-current rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>

            {/* Retry button for error state */}
            {status === 'error' && onRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="h-7 px-2 text-xs hover:bg-red-100"
              >
                Retry
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SavingIndicator;