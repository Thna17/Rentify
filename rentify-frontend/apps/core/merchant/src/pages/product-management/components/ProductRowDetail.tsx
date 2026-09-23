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
    <div className="space-y-4 p-4 bg-gradient-to-br from-gray-50/50 to-white border-t border-gray-100">
      {/* Stats Overview Section - Key metrics at a glance */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Price Card */}
        <div className="text-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mx-auto mb-2">
            <IconTrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">${product.price}</p>
          <p className="text-xs text-gray-500">Price</p>
        </div>
        
        {/* Stock Quantity Card with status-based coloring */}
        <div className="text-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg mx-auto mb-2">
            <IconBox className="h-4 w-4 text-green-600" />
          </div>
          <p className={`text-2xl font-bold ${
            isOutOfStock ? 'text-red-600' : 
            isLowStock ? 'text-amber-600' : 
            'text-gray-900'
          }`}>
            {product.stockQuantity}
          </p>
          <p className="text-xs text-gray-500">Stock</p>
        </div>
        
        {/* SKU Card */}
        <div className="text-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg mx-auto mb-2">
            <IconTag className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">
            {product.sku || 'N/A'}
          </p>
          <p className="text-xs text-gray-500">SKU</p>
        </div>
      </div>

      {/* Stock Progress Bar - Visual indicator of stock levels */}
      {!isOutOfStock && (
        <Card className="p-3 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">Stock Level</span>
            <span className="text-xs text-gray-500">{stockPercentage}%</span>
          </div>
          <Progress 
            value={stockPercentage} 
            className={`h-2 ${
              isLowStock ? 'bg-amber-100' : 'bg-green-100'
            }`}
          />
        </Card>
      )}

      {/* Detailed Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Product Details Card */}
        <Card className="p-4 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-primary rounded-full"></div>
            <h4 className="font-semibold text-sm text-gray-900">
              {t('dashboard.product.product_details')}
            </h4>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* SKU Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <IconTag className="h-3 w-3 text-gray-400" />
                  <label className="text-xs text-gray-500 font-medium">
                    {t('dashboard.product.sku')}
                  </label>
                </div>
                <p className="font-medium text-sm text-gray-900">{product.sku || 'N/A'}</p>
              </div>
              
              {/* Category Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <IconPackage className="h-3 w-3 text-gray-400" />
                  <label className="text-xs text-gray-500 font-medium">
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
                  <IconFileDescription className="h-3 w-3 text-gray-400" />
                  <label className="text-xs text-gray-500 font-medium">
                    {t('dashboard.product.description')}
                  </label>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Inventory & Pricing Card */}
        <Card className="p-4 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-green-500 rounded-full"></div>
            <h4 className="font-semibold text-sm text-gray-900">
              {t('dashboard.product.inventory_pricing')}
            </h4>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Stock Quantity with status colors */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Current Stock
                </label>
                <div className={`px-2 py-1 rounded-lg text-sm font-semibold text-center ${
                  isOutOfStock ? 'bg-red-50 text-red-700' :
                  isLowStock ? 'bg-amber-50 text-amber-700' :
                  'bg-green-50 text-green-700'
                }`}>
                  {product.stockQuantity}
                </div>
              </div>
              
              {/* Selling Price */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Selling Price
                </label>
                <div className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold text-center">
                  ${product.price}
                </div>
              </div>
            </div>
            
            {/* Optional Cost Price and Margin Calculation */}
            {product.costPrice && (
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Cost Price
                </label>
                <p className="font-medium text-sm text-gray-900">${product.costPrice}</p>
                <div className="text-xs text-green-600 font-medium">
                  Margin: ${(product.price - product.costPrice).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions Card */}
      <Card className="p-4 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
          <h4 className="font-semibold text-sm text-gray-900">
            {t('dashboard.product.quick_actions')}
          </h4>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* View Details Button */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-w-[120px] gap-2 border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
            onClick={() => navigate(`/products/${product.id}`)}
          >
            <IconEye className="h-4 w-4" />
            {t('dashboard.product.view_details')}
          </Button>
          
          {/* Edit Product Button */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-w-[120px] gap-2 border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
            onClick={() => onActionComplete?.('edit', product)}
          >
            <IconEdit className="h-4 w-4" />
            {t('dashboard.product.edit')}
          </Button>
          
          {/* Manage Inventory Button */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-w-[120px] gap-2 border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
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
