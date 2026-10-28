import { useCallback } from 'react';
import { useTranslation } from '@rentify/utils';
import { Button } from '@rentify/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';
import {
  IconDotsVertical,
  IconEye,
  IconEdit,
  IconTrash,
  IconPackage,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

// Define the product type (adjust fields as needed)
interface Product {
  id: string;
  name: string;
  [key: string]: any; // For any additional product properties
}

// Props interface for the component
interface ProductQuickActionsProps {
  product: Product;                              // The product to perform actions on
  onAction?: (action: string, product: Product) => void; // Callback for custom actions
  onViewDetails: (product: Product) => void;    // Callback to view product details
  isMobile?: boolean;                            // Optional flag for mobile view
}

/**
 * ProductQuickActions component
 * Displays quick action buttons for a product, including view, edit, inventory, and delete.
 */
export function ProductQuickActions({
  product,
  onAction,
  onViewDetails,
  isMobile = false,
}: ProductQuickActionsProps) {
  const { t } = useTranslation();

  const navigate = useNavigate()
  // Helper to handle an action and stop event propagation
  const handleAction = useCallback(
    (action: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      onAction?.(action, product);
    },
    [onAction, product]
  );

  // Define the main actions with labels and icons
  const actions = [
    { value: 'view', label: t('dashboard.product.view'), icon: IconEye },
    { value: 'edit', label: t('dashboard.product.edit'), icon: IconEdit },
    { value: 'inventory', label: t('dashboard.product.inventory'), icon: IconPackage },
  ];

  // If only one action, render a single button instead of dropdown
  if (actions.length === 1) {
    const action = actions[0];
    const IconComponent = action.icon;
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={(e) => handleAction(action.value, e)}
      >
        <IconComponent className="h-3 w-3 mr-1" />
        {action.label}
      </Button>
    );
  }

  // Render dropdown menu for multiple actions
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 data-[state=open]:bg-muted">
          <IconDotsVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        {/* View details action */}
        <DropdownMenuItem onClick={() => onViewDetails(product)}>
          <IconEye className="mr-2 h-4 w-4" />
          {t('dashboard.product.view')}
        </DropdownMenuItem>

        {/* Edit action */}
   <DropdownMenuItem onClick={() => navigate(`/products/edit/${product.id}`)}>
          <IconEdit className="mr-2 h-4 w-4" />
          {t('dashboard.product.edit')}
        </DropdownMenuItem>

        {/* Inventory action */}
        <DropdownMenuItem onClick={(e) => handleAction('inventory', e)}>
          <IconPackage className="mr-2 h-4 w-4" />
          {t('dashboard.product.inventory')}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Delete action */}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={(e) => handleAction('delete', e)}
        >
          <IconTrash className="mr-2 h-4 w-4" />
          {t('dashboard.product.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
