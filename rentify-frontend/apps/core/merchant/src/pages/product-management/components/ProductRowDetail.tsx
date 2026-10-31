import { useTranslation } from '@rentify/utils';
import { useNavigate } from 'react-router-dom';
import {
  IconPackage,
  IconEye,
  IconEdit,
  IconTrendingUp,
  IconBox,
  IconTag,
  IconFileDescription,
} from '@tabler/icons-react';
import { Button } from '@rentify/shared/ui/button';
import { Card } from '@rentify/shared/ui/card';
import { Badge } from '@rentify/shared/ui/badge';
import { Progress } from '@rentify/shared/ui/progress';

// Product category interface
interface ProductCategory {
  name: string;
}

// Main product interface defining the data structure
interface Product {
  id: string | number;
  stockQuantity: number;
  price: number;
  sku?: string;
  Category?: ProductCategory;
  description?: string;
  costPrice?: number;
}

// Component props interface
interface ProductRowDetailProps {
  product: Product;
  onShowMessage?: () => void;
  onActionComplete?: (action: string, product: Product) => void;
  isMobile?: boolean;
}

/**
 * ProductRowDetail Component
 * 
 * Displays detailed product information in a card-based layout with:
 * - Stock overview and progress indicators
 * - Pricing and inventory details
 * - Quick action buttons for product management
 * 
 * @param product - The product data to display
 * @param onActionComplete - Callback for action completion events
 * @param isMobile - Responsive layout flag
 */
export function ProductRowDetail({ 
  product, 
  onActionComplete, 
  isMobile = false 
}: ProductRowDetailProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Calculate stock percentage for progress bar (capped at 100%)
  const stockPercentage = Math.min((product.stockQuantity / 100) * 100, 100);
  
  // Stock status flags for conditional styling
  const isLowStock = product.stockQuantity < 10;
  const isOutOfStock = product.stockQuantity === 0;

  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-muted to-white border-t border-border">
      {/* Stats Overview Section - Key metrics at a glance */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Price Card */}
        <div className="text-center p-3 bg-card rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-center w-8 h-8 bg-accent rounded-lg mx-auto mb-2">
            <IconTrendingUp className="h-4 w-4 text-primary-strong" />
          </div>
          <p className="text-2xl font-bold text-foreground">${product.price}</p>
          <p className="text-xs text-muted-foreground">Price</p>
        </div>
        
        {/* Stock Quantity Card with status-based coloring */}
        <div className="text-center p-3 bg-card rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-center w-8 h-8 bg-[var(--rentify-color-success-subtle)] rounded-lg mx-auto mb-2">
            <IconBox className="h-4 w-4 text-[var(--rentify-color-success-text)]" />
          </div>
          <p className={`text-2xl font-bold ${
            isOutOfStock ? 'text-[var(--rentify-color-danger-text)]' : 
            isLowStock ? 'text-[var(--rentify-color-warning-text)]' : 
            'text-foreground'
          }`}>
            {product.stockQuantity}
          </p>
          <p className="text-xs text-muted-foreground">Stock</p>
        </div>
        
        {/* SKU Card */}
        <div className="text-center p-3 bg-card rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-lg mx-auto mb-2">
            <IconTag className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground truncate">
            {product.sku || 'N/A'}
          </p>
          <p className="text-xs text-muted-foreground">SKU</p>
        </div>
      </div>

      {/* Stock Progress Bar - Visual indicator of stock levels */}
      {!isOutOfStock && (
        <Card className="p-3 bg-white/80 backdrop-blur-sm border border-border rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">Stock Level</span>
            <span className="text-xs text-muted-foreground">{stockPercentage}%</span>
          </div>
          <Progress 
            value={stockPercentage} 
            className={`h-2 ${
              isLowStock ? 'bg-[var(--rentify-color-warning-subtle)]' : 'bg-[var(--rentify-color-success-subtle)]'
            }`}
          />
        </Card>
      )}

      {/* Detailed Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Product Details Card */}
        <Card className="p-4 bg-white/80 backdrop-blur-sm border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-primary rounded-full"></div>
            <h4 className="font-semibold text-sm text-foreground">
              {t('dashboard.product.product_details')}
            </h4>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* SKU Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <IconTag className="h-3 w-3 text-muted-foreground" />
                  <label className="text-xs text-muted-foreground font-medium">
                    {t('dashboard.product.sku')}
                  </label>
                </div>
                <p className="font-medium text-sm text-foreground">{product.sku || 'N/A'}</p>
              </div>
              
              {/* Category Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <IconPackage className="h-3 w-3 text-muted-foreground" />
                  <label className="text-xs text-muted-foreground font-medium">
                    {t('dashboard.product.category')}
                  </label>
                </div>
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {product.Category?.name || t('dashboard.product.uncategorized')}
                </Badge>
              </div>
            </div>
            
            {/* Optional Description */}
            {product.description && (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <IconFileDescription className="h-3 w-3 text-muted-foreground" />
                  <label className="text-xs text-muted-foreground font-medium">
                    {t('dashboard.product.description')}
                  </label>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Inventory & Pricing Card */}
        <Card className="p-4 bg-white/80 backdrop-blur-sm border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-[var(--rentify-color-success-base)] rounded-full"></div>
            <h4 className="font-semibold text-sm text-foreground">
              {t('dashboard.product.inventory_pricing')}
            </h4>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Stock Quantity with status colors */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">
                  Current Stock
                </label>
                <div className={`px-2 py-1 rounded-lg text-sm font-semibold text-center ${
                  isOutOfStock ? 'bg-[var(--rentify-color-danger-subtle)] text-[var(--rentify-color-danger-text)]' :
                  isLowStock ? 'bg-[var(--rentify-color-warning-subtle)] text-[var(--rentify-color-warning-text)]' :
                  'bg-[var(--rentify-color-success-subtle)] text-[var(--rentify-color-success-text)]'
                }`}>
                  {product.stockQuantity}
                </div>
              </div>
              
              {/* Selling Price */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">
                  Selling Price
                </label>
                <div className="px-2 py-1 rounded-lg bg-accent text-primary-strong text-sm font-semibold text-center">
                  ${product.price}
                </div>
              </div>
            </div>
            
            {/* Optional Cost Price and Margin Calculation */}
            {product.costPrice && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">
                  Cost Price
                </label>
                <p className="font-medium text-sm text-foreground">${product.costPrice}</p>
                <div className="text-xs text-[var(--rentify-color-success-text)] font-medium">
                  Margin: ${(product.price - product.costPrice).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions Card */}
      <Card className="p-4 bg-white/80 backdrop-blur-sm border border-border rounded-xl shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 bg-muted-foreground rounded-full"></div>
          <h4 className="font-semibold text-sm text-foreground">
            {t('dashboard.product.quick_actions')}
          </h4>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* View Details Button */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-w-[120px] gap-2 border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
            onClick={() => navigate(`/products/${product.id}`)}
          >
            <IconEye className="h-4 w-4" />
            {t('dashboard.product.view_details')}
          </Button>
          
          {/* Edit Product Button */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-w-[120px] gap-2 border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
            onClick={() => onActionComplete?.('edit', product)}
          >
            <IconEdit className="h-4 w-4" />
            {t('dashboard.product.edit')}
          </Button>
          
          {/* Manage Inventory Button */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-w-[120px] gap-2 border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
            onClick={() => onActionComplete?.('inventory', product)}
          >
            <IconPackage className="h-4 w-4" />
            {t('dashboard.product.manage_inventory')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
