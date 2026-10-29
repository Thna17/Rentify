import { useState } from 'react';
import { useTranslation } from '@rentify/utils';
import { Badge } from '@rentify/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select';
import { PRODUCT_STATUS } from '../../../hooks/useProductManagement';

// Define the product type (adjust fields as needed)
interface Product {
  id: string;
  status: string;
  [key: string]: any;
}

// Props interface for the component
interface ProductStatusBadgeProps {
  product: Product;                              // Product to display status for
  onStatusChange: (status: string, productId: string) => Promise<void>; // Callback when status changes
  isMobile?: boolean;                             // Optional flag to shorten label for mobile
}

/**
 * ProductStatusBadge component
 * Displays a badge for the product status with a dropdown to change it.
 * Shows a loading spinner when updating.
 */
export function ProductStatusBadge({
  product,
  onStatusChange,
  isMobile = false,
}: ProductStatusBadgeProps) {
  const { t } = useTranslation();
  const [isUpdating, setIsUpdating] = useState(false);

  // Map product statuses to labels and badge variants
  const statusConfig: Record<string, { label: string; variant: string }> = {
    [PRODUCT_STATUS.ACTIVE]: { label: t('dashboard.product.active'), variant: 'success' },
    [PRODUCT_STATUS.INACTIVE]: { label: t('dashboard.product.inactive'), variant: 'secondary' },
    [PRODUCT_STATUS.LOW_STOCK]: { label: t('dashboard.product.low_stock'), variant: 'warning' },
    [PRODUCT_STATUS.OUT_OF_STOCK]: { label: t('dashboard.product.out_of_stock'), variant: 'destructive' },
    [PRODUCT_STATUS.ARCHIVED]: { label: t('dashboard.product.archived'), variant: 'outline' },
  };

  // Handle status change with async update
  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await onStatusChange(newStatus, product.id);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentStatus = statusConfig[product.status] || { label: product.status, variant: 'outline' };

  // Show loading spinner while updating
  if (isUpdating) {
    return (
      <div className="flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Render status dropdown with badges
  return (
    <Select value={product.status} onValueChange={handleStatusChange}>
      <SelectTrigger
        className={`h-8 text-xs border-0 shadow-none hover:bg-muted/50 transition-colors ${
          currentStatus.variant === 'success' ? 'text-green-600' :
          currentStatus.variant === 'warning' ? 'text-amber-600' :
          currentStatus.variant === 'destructive' ? 'text-red-600' :
          'text-muted-foreground'
        }`}
      >
        <SelectValue>
          <Badge variant={currentStatus.variant as any} className="text-xs cursor-pointer">
            {isMobile ? currentStatus.label.substring(0, 3) : currentStatus.label}
          </Badge>
        </SelectValue>
      </SelectTrigger>

      <SelectContent className="min-w-32">
        {Object.entries(statusConfig).map(([statusKey, config]) => (
          <SelectItem key={statusKey} value={statusKey} className="text-xs">
            <Badge variant={config.variant as any} className="text-xs">
              {config.label}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
