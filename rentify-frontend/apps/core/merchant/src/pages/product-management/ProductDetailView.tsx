import * as React from 'react';
import {
  IconX,
  IconEdit,
  IconTrash,
  IconCopy,
  IconEye,
  IconArchive,
  IconPackage,
  IconCategory,
  IconCurrencyDollar,
  IconTrendingUp,
  IconHistory,
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconUser,
  IconShoppingCart,
  IconChartBar,
  IconPlus,
  IconArrowLeft,
} from '@tabler/icons-react';
import { useTranslation } from '@rentify/utils';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@rentify/shared/ui/tabs';
import { Separator } from '@rentify/shared/ui/separator';
import { Label } from '@rentify/shared/ui/label';
import { Input } from '@rentify/shared/ui/input';
import { Textarea } from '@rentify/shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select';
import { Switch } from '@rentify/shared/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@rentify/shared/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@rentify/shared/ui/tooltip';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@rentify/shared/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@rentify/shared/ui/table';

import { useGetManagedProductQuery } from '@rentify/apis';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';

// ===== TYPE DEFINITIONS =====

/** Product image interface */
interface ProductImage {
  id: string;
  url: string;
}

/** Product category interface */
interface ProductCategory {
  id: string;
  name: string;
}

/** Product variant interface */
interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  cost?: number;
}

/** Activity log entry interface */
interface ActivityLog {
  user: string;
  timestamp: string;
  action: string;
  details?: string;
}

/** Product status type */
type ProductStatus = 'active' | 'inactive' | 'archived' | 'low_stock' | 'out_of_stock';

/** Main product interface */
interface Product {
  id: string | number;
  name: string;
  status: ProductStatus;
  updatedAt: string;
  images: ProductImage[];
  description?: string;
  sku?: string;
  category?: ProductCategory;
  isVisible?: boolean;
  stockQuantity: number;
  soldCount?: number;
  lowStockThreshold?: number;
  variants?: ProductVariant[];
  price: number;
  cost?: number;
  compareAtPrice?: number;
  views?: number;
  conversionRate?: number;
  totalSales?: number;
  aov?: number; // Average Order Value
  activityLog?: ActivityLog[];
}

/** Component props interface */
interface ProductDetailViewProps {
  onSave?: (product: Product) => void;
  onDuplicate?: (product: Product) => void;
  onArchive?: (productId: string | number, archive: boolean) => void;
  onDelete?: (productId: string | number) => void;
}

/** Status badge configuration */
interface StatusBadgeConfig {
  label: string;
  variant: 'success' | 'secondary' | 'outline' | 'warning' | 'destructive';
  className: string;
}

// ===== MAIN COMPONENT =====

/**
 * ProductDetailView Component
 * 
 * Comprehensive product management interface with:
 * - Multi-tab layout for different product aspects
 * - Edit/save functionality with real-time preview
 * - Image gallery management
 * - Inventory and pricing controls
 * - Analytics and activity tracking
 * - Mobile-responsive design
 * 
 * @param onSave - Callback for saving product changes
 * @param onDuplicate - Callback for duplicating product
 * @param onArchive - Callback for archiving/unarchiving product
 * @param onDelete - Callback for deleting product
 */
export function ProductDetailView({ 
  onSave, 
  onDuplicate, 
  onArchive, 
  onDelete 
}: ProductDetailViewProps) {
  const { t } = useTranslation();
  const { websiteData } = useThemeService();
  const websiteId = websiteData.websiteId;
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Product data fetching
  const {
    data: product,
    isLoading,
    isError,
  } = useGetManagedProductQuery({ websiteId, productId: id });

  // Local state management
  const [selectedImage, setSelectedImage] = React.useState<number>(0);
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
  const [editedProduct, setEditedProduct] = React.useState<Partial<Product>>({});
  const [activeTab, setActiveTab] = React.useState<string>('overview');

  // Initialize edited product when product data changes
  React.useEffect(() => {
    if (product) {
      setEditedProduct(product);
    }
  }, [product]);

  /**
   * Handles saving product changes
   */
  const handleSave = () => {
    if (onSave && editedProduct) {
      onSave(editedProduct as Product);
    }
    setIsEditing(false);
    toast.success(t('dashboard.product_detail.saved_successfully'));
  };

  /**
   * Cancels editing and reverts to original product data
   */
  const handleCancelEdit = () => {
    if (product) {
      setEditedProduct(product);
    }
    setIsEditing(false);
  };

  /**
   * Updates a specific field in the edited product
   * 
   * @param field - Field name to update
   * @param value - New value for the field
   */
  const handleFieldChange = (field: keyof Product, value: any) => {
    setEditedProduct((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Updates a specific variant field
   * 
   * @param variantIndex - Index of the variant to update
   * @param field - Field name to update
   * @param value - New value for the field
   */
  const handleVariantChange = (
    variantIndex: number, 
    field: keyof ProductVariant, 
    value: any
  ) => {
    const updatedVariants = [...(editedProduct.variants || [])];
    updatedVariants[variantIndex] = {
      ...updatedVariants[variantIndex],
      [field]: value,
    };

    handleFieldChange('variants', updatedVariants);
  };

  /**
   * Handles image upload and adds to product images
   * 
   * @param e - File input change event
   */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newImages = [...(editedProduct.images || [])];
      for (let i = 0; i < files.length; i++) {
        const url = URL.createObjectURL(files[i]);
        newImages.push({ url, id: `new-${Date.now()}-${i}` });
      }
      handleFieldChange('images', newImages);
    }
  };

  /**
   * Removes an image from the product gallery
   * 
   * @param index - Index of the image to remove
   */
  const handleImageRemove = (index: number) => {
    const newImages = (editedProduct.images || []).filter((_, i) => i !== index);
    handleFieldChange('images', newImages);
    if (selectedImage >= newImages.length) {
      setSelectedImage(Math.max(0, newImages.length - 1));
    }
  };

  // ===== STATUS BADGE COMPONENT =====

  /**
   * StatusBadge Component
   * 
   * Displays product status with appropriate styling
   * 
   * @param status - Product status to display
   */
  const StatusBadge = ({ status }: { status: ProductStatus }) => {
    const statusConfig: Record<ProductStatus, StatusBadgeConfig> = {
      active: {
        label: t('dashboard.product.status_active'),
        variant: 'success',
        className: 'bg-green-100 text-green-800 hover:bg-green-100',
      },
      inactive: {
        label: t('dashboard.product.status_inactive'),
        variant: 'secondary',
        className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
      },
      archived: {
        label: t('dashboard.product.status_archived'),
        variant: 'outline',
        className: 'border-gray-300 text-gray-600',
      },
      low_stock: {
        label: t('dashboard.product.status_low_stock'),
        variant: 'warning',
        className: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
      },
      out_of_stock: {
        label: t('dashboard.product.status_out_of_stock'),
        variant: 'destructive',
        className: 'bg-red-100 text-red-800 hover:bg-red-100',
      },
    };

    const config = statusConfig[status] || {
      label: status,
      variant: 'outline',
      className: '',
    };

    return (
      <Badge variant={config.variant as any} className={`ml-2 ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  // ===== LOADING STATE =====

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Skeleton className="h-80 w-full rounded-lg" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-20 rounded-md" />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== ERROR/EMPTY STATE =====

  if (!product && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <IconAlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          {t('dashboard.product_detail.product_not_found')}
        </h2>
        <Button onClick={() => navigate(-1)}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  // ===== MAIN RENDER =====

  return (
    <div className="flex flex-col p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9"
          >
            <IconArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center">
              {isEditing ? (
                <Input
                  value={editedProduct.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="text-2xl font-bold h-9 border-0 shadow-none focus-visible:ring-1"
                />
              ) : (
                <h1 className="text-2xl font-semibold">{product?.name}</h1>
              )}
              {product?.status && <StatusBadge status={product.status} />}
            </div>
            <p className="text-muted-foreground mt-1">
              {product?.id} • {t('dashboard.product_detail.last_updated')}:{' '}
              {product ? new Date(product.updatedAt).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave}>{t('common.save')}</Button>
            </>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onDuplicate?.(product!)}
                    className="h-9 w-9"
                  >
                    <IconCopy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('dashboard.product_detail.duplicate')}</p>
                </TooltipContent>
              </Tooltip>
              <Button
                variant="outline"
                onClick={() =>
                  product && onArchive?.(product.id, product.status !== 'archived')
                }
                className="h-9"
              >
                <IconArchive className="h-4 w-4 mr-2" />
                {product?.status === 'archived'
                  ? t('dashboard.product_detail.unarchive')
                  : t('dashboard.product_detail.archive')}
              </Button>
              <Button
                variant="default"
                onClick={() => setIsEditing(true)}
                className="h-9"
              >
                <IconEdit className="h-4 w-4 mr-2" />
                {t('common.edit')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <div className="mb-4">
          <TabsList className="w-full justify-start h-11 bg-muted/50">
            <TabsTrigger
              value="overview"
              className="flex-1 data-[state=active]:bg-background"
            >
              {t('dashboard.product_detail.overview')}
            </TabsTrigger>
            <TabsTrigger
              value="inventory"
              className="flex-1 data-[state=active]:bg-background"
            >
              {t('dashboard.product_detail.inventory')}
            </TabsTrigger>
            <TabsTrigger
              value="pricing"
              className="flex-1 data-[state=active]:bg-background"
            >
              {t('dashboard.product_detail.pricing')}
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="flex-1 data-[state=active]:bg-background"
            >
              {t('dashboard.product_detail.analytics')}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 data-[state=active]:bg-background"
            >
              {t('dashboard.product_detail.history')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab Content */}
        <TabsContent value="overview" className="flex-1 overflow-y-auto mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Gallery Section */}
            <div className="space-y-4">
              <Card className="overflow-hidden">
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={
                      editedProduct.images?.[selectedImage]?.url ||
                      product?.images?.[selectedImage]?.url ||
                      '/placeholder-product.jpg'
                    }
                    alt={editedProduct.name || product?.name}
                    className="h-full w-full object-cover"
                  />
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Label htmlFor="image-upload" className="cursor-pointer">
                        <Input
                          id="image-upload"
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                        <Button variant="secondary">
                          {t('dashboard.product_detail.change_image')}
                        </Button>
                      </Label>
                    </div>
                  )}
                </div>
              </Card>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {((editedProduct.images || product?.images || []) as any[]).map((image: any, index: number) => (
                  <div key={image.id} className="relative group flex-shrink-0">
                    <button
                      onClick={() => setSelectedImage(index)}
                      className={`h-16 w-16 rounded-md border-2 overflow-hidden transition-all ${
                        selectedImage === index
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-muted'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={`${editedProduct.name || product?.name} ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                    {isEditing && (
                      <button
                        onClick={() => handleImageRemove(index)}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <IconX className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <Label
                    htmlFor="image-add"
                    className="cursor-pointer flex-shrink-0"
                  >
                    <Input
                      id="image-add"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <div className="h-16 w-16 rounded-md border-2 border-dashed flex items-center justify-center text-muted-foreground bg-muted/30 hover:bg-muted/50 transition-colors">
                      <IconPlus className="h-5 w-5" />
                    </div>
                  </Label>
                )}
              </div>
            </div>

            {/* Basic Information Section */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {t('dashboard.product_detail.basic_info')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm">
                        {t('dashboard.product_detail.name')}
                      </Label>
                      {isEditing ? (
                        <Input
                          id="name"
                          value={editedProduct.name || ''}
                          onChange={(e) =>
                            handleFieldChange('name', e.target.value)
                          }
                          className="h-9"
                        />
                      ) : (
                        <div className="text-sm font-medium">
                          {product?.name}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm">
                        {t('dashboard.product_detail.description')}
                      </Label>
                      {isEditing ? (
                        <Textarea
                          id="description"
                          value={editedProduct.description || ''}
                          onChange={(e) =>
                            handleFieldChange('description', e.target.value)
                          }
                          rows={3}
                          className="resize-none"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {product?.description ||
                            t('dashboard.product_detail.no_description')}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sku" className="text-sm">
                          {t('dashboard.product_detail.sku')}
                        </Label>
                        {isEditing ? (
                          <Input
                            id="sku"
                            value={editedProduct.sku || ''}
                            onChange={(e) =>
                              handleFieldChange('sku', e.target.value)
                            }
                            className="h-9"
                          />
                        ) : (
                          <div className="text-sm font-medium">
                            {product?.sku || 'N/A'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm">
                          {t('dashboard.product_detail.category')}
                        </Label>
                        {isEditing ? (
                          <Select
                            value={editedProduct.category?.id || ''}
                            onValueChange={(value) =>
                              handleFieldChange('category', {
                                id: value,
                                name: value,
                              })
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue
                                placeholder={t('dashboard.product_detail.select_category')}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="electronics">
                                Electronics
                              </SelectItem>
                              <SelectItem value="clothing">Clothing</SelectItem>
                              <SelectItem value="home">
                                Home & Kitchen
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm font-medium">
                            {product?.category?.name ||
                              t('dashboard.product.uncategorized')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Label htmlFor="status" className="text-sm">
                        {t('dashboard.product_detail.status')}
                      </Label>
                      {isEditing ? (
                        <Select
                          value={editedProduct.status}
                          onValueChange={(value) =>
                            handleFieldChange('status', value)
                          }
                        >
                          <SelectTrigger className="w-40 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">
                              {t('dashboard.product.status_active')}
                            </SelectItem>
                            <SelectItem value="inactive">
                              {t('dashboard.product.status_inactive')}
                            </SelectItem>
                            <SelectItem value="archived">
                              {t('dashboard.product.status_archived')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        product?.status && <StatusBadge status={product.status} />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Availability Section */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {t('dashboard.product_detail.availability')}
                    </CardTitle>
                    {isEditing && (
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="visibility"
                          checked={editedProduct.isVisible || false}
                          onCheckedChange={(checked) =>
                            handleFieldChange('isVisible', checked)
                          }
                        />
                        <Label htmlFor="visibility" className="text-sm">
                          {editedProduct.isVisible
                            ? t('dashboard.product_detail.visible')
                            : t('dashboard.product_detail.hidden')}
                        </Label>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center p-3 rounded-lg bg-muted/30">
                      <IconPackage className="h-5 w-5 mr-3 text-muted-foreground" />
                      <div>
                        <div className="text-lg font-semibold">
                          {product?.stockQuantity || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('dashboard.product_detail.in_stock')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center p-3 rounded-lg bg-muted/30">
                      <IconShoppingCart className="h-5 w-5 mr-3 text-muted-foreground" />
                      <div>
                        <div className="text-lg font-semibold">
                          {product?.soldCount || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('dashboard.product_detail.sold')}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Inventory Tab Content */}
        <TabsContent value="inventory" className="flex-1 overflow-y-auto mt-0">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t('dashboard.product_detail.inventory_management')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">
                    {t('dashboard.product_detail.current_inventory')}
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="stockQuantity" className="text-sm">
                      {t('dashboard.product_detail.quantity')}
                    </Label>
                    {isEditing ? (
                      <Input
                        id="stockQuantity"
                        type="number"
                        min="0"
                        value={editedProduct.stockQuantity || 0}
                        onChange={(e) =>
                          handleFieldChange(
                            'stockQuantity',
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="h-9"
                      />
                    ) : (
                      <div className="text-2xl font-bold">
                        {product?.stockQuantity || 0}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lowStockThreshold" className="text-sm">
                      {t('dashboard.product_detail.low_stock_threshold')}
                    </Label>
                    {isEditing ? (
                      <Input
                        id="lowStockThreshold"
                        type="number"
                        min="0"
                        value={editedProduct.lowStockThreshold || 5}
                        onChange={(e) =>
                          handleFieldChange(
                            'lowStockThreshold',
                            parseInt(e.target.value) || 5
                          )
                        }
                        className="h-9"
                      />
                    ) : (
                      <div className="text-lg font-medium">
                        {product?.lowStockThreshold || 5}
                      </div>
                    )}
                  </div>

                  {(product?.stockQuantity || 0) <= (product?.lowStockThreshold || 5) && (
                    <div className="flex items-center p-3 rounded-lg bg-amber-100 text-amber-800">
                      <IconAlertCircle className="h-4 w-4 mr-2" />
                      <span className="text-sm">
                        {t('dashboard.product_detail.low_stock_warning')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-sm">
                    {t('dashboard.product_detail.inventory_actions')}
                  </h3>

                  <Button
                    variant="outline"
                    className="w-full justify-start h-10"
                  >
                    <IconPlus className="mr-2 h-4 w-4" />
                    {t('dashboard.product_detail.add_stock')}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start h-10"
                  >
                    <IconX className="mr-2 h-4 w-4" />
                    {t('dashboard.product_detail.remove_stock')}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start h-10"
                  >
                    <IconHistory className="mr-2 h-4 w-4" />
                    {t('dashboard.product_detail.view_stock_history')}
                  </Button>
                </div>
              </div>

              {editedProduct.variants && editedProduct.variants.length > 0 && (
                <div className="pt-4">
                  <h3 className="font-medium mb-4 text-sm">
                    {t('dashboard.product_detail.variant_inventory')}
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('dashboard.product_detail.variant')}</TableHead>
                          <TableHead>{t('dashboard.product_detail.sku')}</TableHead>
                          <TableHead className="text-right">
                            {t('dashboard.product_detail.quantity')}
                          </TableHead>
                          {isEditing && (
                            <TableHead className="text-right">
                              {t('dashboard.product_detail.actions')}
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editedProduct.variants.map((variant, index) => (
                          <TableRow key={variant.id}>
                            <TableCell className="py-3">
                              {isEditing ? (
                                <Input
                                  value={variant.name}
                                  onChange={(e) =>
                                    handleVariantChange(
                                      index,
                                      'name',
                                      e.target.value
                                    )
                                  }
                                  className="h-8"
                                />
                              ) : (
                                variant.name
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              {isEditing ? (
                                <Input
                                  value={variant.sku}
                                  onChange={(e) =>
                                    handleVariantChange(
                                      index,
                                      'sku',
                                      e.target.value
                                    )
                                  }
                                  className="h-8"
                                />
                              ) : (
                                variant.sku
                              )}
                            </TableCell>
                            <TableCell className="py-3 text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="0"
                                  value={variant.stock}
                                  onChange={(e) =>
                                    handleVariantChange(
                                      index,
                                      'stock',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 h-8"
                                />
                              ) : (
                                variant.stock
                              )}
                            </TableCell>
                            {isEditing && (
                              <TableCell className="py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const newVariants = editedProduct.variants?.filter(
                                      (_, i) => i !== index
                                    ) || [];
                                    handleFieldChange('variants', newVariants);
                                  }}
                                  className="h-8 w-8"
                                >
                                  <IconTrash className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {isEditing && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        const newVariant: ProductVariant = {
                          id: `new-${Date.now()}`,
                          name: 'New Variant',
                          sku: '',
                          stock: 0,
                          price: 0,
                        };
                        handleFieldChange('variants', [
                          ...(editedProduct.variants || []),
                          newVariant,
                        ]);
                      }}
                    >
                      <IconPlus className="mr-2 h-4 w-4" />
                      {t('dashboard.product_detail.add_variant')}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab Content */}
        <TabsContent value="pricing" className="flex-1 overflow-y-auto mt-0">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t('dashboard.product_detail.pricing')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm">
                      {t('dashboard.product_detail.price')}
                    </Label>
                    {isEditing ? (
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editedProduct.price || 0}
                        onChange={(e) =>
                          handleFieldChange('price', parseFloat(e.target.value) || 0)
                        }
                        className="h-9"
                      />
                    ) : (
                      <div className="text-2xl font-bold">${product?.price || 0}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cost" className="text-sm">
                      {t('dashboard.product_detail.cost')}
                    </Label>
                    {isEditing ? (
                      <Input
                        id="cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editedProduct.cost || 0}
                        onChange={(e) =>
                          handleFieldChange('cost', parseFloat(e.target.value) || 0)
                        }
                        className="h-9"
                      />
                    ) : (
                      <div className="text-lg font-medium">
                        ${product?.cost || 0}
                      </div>
                    )}
                  </div>

                  {product?.price && product.price > 0 && product.cost && product.cost > 0 && (
                    <div>
                      <Label className="text-sm">
                        {t('dashboard.product_detail.profit_margin')}
                      </Label>
                      <div className="text-lg font-medium text-green-600">
                        {(
                          ((product.price - product.cost) / product.price) *
                          100
                        ).toFixed(2)}
                        %
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="compareAtPrice" className="text-sm">
                      {t('dashboard.product_detail.compare_at_price')}
                    </Label>
                    {isEditing ? (
                      <Input
                        id="compareAtPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editedProduct.compareAtPrice || 0}
                        onChange={(e) =>
                          handleFieldChange(
                            'compareAtPrice',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="h-9"
                      />
                    ) : (
                      <div className="text-lg font-medium">
                        ${product?.compareAtPrice || 0}
                      </div>
                    )}
                  </div>

                  {product?.compareAtPrice && product.compareAtPrice > 0 && product.price && product.price > 0 && (
                    <div>
                      <Label className="text-sm">
                        {t('dashboard.product_detail.discount')}
                      </Label>
                      <div className="text-lg font-medium text-red-600">
                        {(
                          ((product.compareAtPrice - product.price) /
                            product.compareAtPrice) *
                          100
                        ).toFixed(2)}
                        %
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {editedProduct.variants && editedProduct.variants.length > 0 && (
                <div className="pt-4">
                  <h3 className="font-medium mb-4 text-sm">
                    {t('dashboard.product_detail.variant_pricing')}
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('dashboard.product_detail.variant')}</TableHead>
                          <TableHead className="text-right">
                            {t('dashboard.product_detail.price')}
                          </TableHead>
                          <TableHead className="text-right">
                            {t('dashboard.product_detail.cost')}
                          </TableHead>
                          {isEditing && (
                            <TableHead className="text-right">
                              {t('dashboard.product_detail.actions')}
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editedProduct.variants.map((variant, index) => (
                          <TableRow key={variant.id}>
                            <TableCell className="py-3">
                              {variant.name}
                            </TableCell>
                            <TableCell className="py-3 text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={variant.price}
                                  onChange={(e) =>
                                    handleVariantChange(
                                      index,
                                      'price',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 h-8"
                                />
                              ) : (
                                `$${variant.price}`
                              )}
                            </TableCell>
                            <TableCell className="py-3 text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={variant.cost || 0}
                                  onChange={(e) =>
                                    handleVariantChange(
                                      index,
                                      'cost',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 h-8"
                                />
                              ) : (
                                `$${variant.cost || 0}`
                              )}
                            </TableCell>
                            {isEditing && (
                              <TableCell className="py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const newVariants = editedProduct.variants?.filter(
                                      (_, i) => i !== index
                                    ) || [];
                                    handleFieldChange('variants', newVariants);
                                  }}
                                  className="h-8 w-8"
                                >
                                  <IconTrash className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab Content */}
        <TabsContent value="analytics" className="flex-1 overflow-y-auto mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.product_detail.views')}
                </CardTitle>
                <IconEye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{product?.views || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.product_detail.conversion_rate')}
                </CardTitle>
                <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(product?.conversionRate || 0).toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  +2.5% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.product_detail.total_sales')}
                </CardTitle>
                <IconShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${product?.totalSales || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  +$1,250 from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.product_detail.avg_order_value')}
                </CardTitle>
                <IconCurrencyDollar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(product?.aov || 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  +$5.25 from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t('dashboard.product_detail.sales_over_time')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center border rounded-lg">
                <div className="text-center text-muted-foreground">
                  <IconChartBar className="h-12 w-12 mx-auto mb-2" />
                  <p>{t('dashboard.product_detail.sales_chart_placeholder')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab Content */}
        <TabsContent value="history" className="flex-1 overflow-y-auto mt-0">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t('dashboard.product_detail.activity_log')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {product?.activityLog && product.activityLog.length > 0 ? (
                  product.activityLog.map((log: any, index: number) => (
                    <div key={index} className="flex items-start gap-4">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback>
                          <IconUser className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{log.user}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm">{log.action}</p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground">
                            {log.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <IconHistory className="h-12 w-12 mx-auto mb-2" />
                    <p>{t('dashboard.product_detail.no_activity')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t">
        <Button variant="outline" onClick={() => navigate(-1)}>
          {t('common.back')}
        </Button>
        <Button variant="destructive" onClick={() => product && onDelete?.(product.id)}>
          <IconTrash className="mr-2 h-4 w-4" />
          {t('common.delete')}
        </Button>
      </div>
    </div>
  );
}

export default ProductDetailView;
