// components/StatusBadge.tsx
import React from 'react';
import { Badge } from '@rentify/shared/ui/badge';
import { CheckCircle, Clock, PauseCircle, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  t: (key: string) => string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, t }) => {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'trial':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      case 'paused':
        return {
          variant: 'secondary' as const,
          icon: PauseCircle,
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'inactive':
        return {
          variant: 'destructive' as const,
          icon: AlertCircle,
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      default:
        return {
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const { variant, icon: Icon, className } = getStatusConfig(status);

  return (
    <Badge variant={variant} className={`gap-1.5 px-3 py-1.5 ${className}`}>
      <Icon className="h-3 w-3" />
      <span className="capitalize">{t(`dashboard.store_management.status_${status.toLowerCase()}`)}</span>
    </Badge>
  );
};

// Alternative simpler version without icons:
export const SimpleStatusBadge: React.FC<StatusBadgeProps> = ({ status, t }) => {
  const getVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'default';
      case 'trial': return 'secondary';
      case 'paused': return 'outline';
      case 'inactive': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Badge variant={getVariant(status)} className="capitalize">
      {t(`dashboard.store_management.status_${status.toLowerCase()}`)}
    </Badge>
  );
};