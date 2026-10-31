import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@rentify/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  IconPackage,
  IconAlertTriangle,
  IconCurrencyDollar,
  IconRefresh,
  IconEye,
} from '@tabler/icons-react';

import { useResponsive } from '@rentify/shared/hooks/useResponsive';
import { useSnackbar } from '@rentify/shared/hooks/useSnackbar';
import { useRowExpansion } from '@rentify/shared/hooks/useRowExpansion';
import { useProductManagementState } from '../../hooks/useProductManagementState';
import { FilterBar } from '@rentify/shared/ui/components/FilterBar';
import { BulkActionsBar } from '@rentify/shared/ui/components/BulkActionsBar';
import { PageHeader } from '@rentify/shared/layouts/dashboard/PageHeader';

import { DetailDrawer } from '@rentify/shared/ui/components/DetailDrawer';
import { ProductQuickActions } from './components/ProductQuickActions';
import { ProductStatusBadge } from './components/ProductStatusBadge';
import { ProductRowDetail } from './components/ProductRowDetail';

// Product-specific components
import { ReusableTable } from '@rentify/shared/ui/components/ReusableTable';
import { StatusTabs } from '@rentify/shared/ui/components/StatusTabs';

// @ts-expect-error Legacy JavaScript component has no declaration file yet.
import { BulkPriceUpdateModal } from './components/BulkPriceUpdateModal';
// @ts-expect-error Legacy JavaScript component has no declaration file yet.
import { BulkStatusChangeModal } from './components/BulkStatusChangeModal';

// @ts-expect-error Legacy JavaScript component has no declaration file yet.
import { BulkCreateProductsModal } from './components/BulkCreateProductsModal';

import { ConfirmDeleteDialog } from '@rentify/shared/ui/components/ConfirmDeleteDialog';
import { InventoryDialog } from '@rentify/shared/ui/components/InventoryDialog';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';

// Hooks and types
import {
  useProductManagement,
  PRODUCT_SORT,
  PRODUCT_STATUS,
} from '../../hooks/useProductManagement';

// Shadcn components
import { Badge } from '@rentify/shared/ui/badge';
import { Button } from '@rentify/shared/ui/button';
import { Card } from '@rentify/shared/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@rentify/shared/ui/alert';
import { Download, Package, Plus, Upload } from 'lucide-react';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';
import { useCreateBulkProductsMutation } from '@rentify/apis';
// @ts-expect-error JavaScript helper has no declaration file yet.
import { uploadProductImages } from '../../services/productImages';
// @ts-expect-error Legacy JavaScript hook has no declaration file yet.
import { useShopCategories } from '../../hooks/useShopCategories';
// @ts-expect-error Legacy JavaScript page has no declaration file yet.
import StoreCatalogPage from './StoreCatalogPage';
import CategoriesPage from '../categories/CategoriesPage';
import {
  ProductFilterChip,
  filterProductsByChip,
  computeChannelBadges,
} from './productUtils';

// Type definitions for product data
interface ProductImage {
  url: string;
  id?: string;
}

interface ProductCategory {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  price: number;
  stockQuantity: number;
  status: string;
  images?: ProductImage[];
  Category?: ProductCategory;
  description?: string;
  costPrice?: number;
  variants?: ProductVariant[];
  marketplaceVisibility?: boolean;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost?: number;
  stock: number;
}

interface StatusFilterConfig {
  label: string;
  icon?: React.ReactNode;
  color: string;
}

interface SortOption {
  value: string;
  label: string;
}

interface FilterOption {
  key: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
}

// Status filter configuration
const STATUS_FILTERS: Record<string, StatusFilterConfig> = {
  [PRODUCT_STATUS.ALL]: {
    label: 'dashboard.product.all_products',
    icon: <IconPackage className="h-4 w-4" />,
    color: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  },
  [PRODUCT_STATUS.ACTIVE]: {
    label: 'dashboard.product.active',
    color: 'bg-green-100 text-green-700 hover:bg-green-200',
  },
  [PRODUCT_STATUS.INACTIVE]: {
    label: 'dashboard.product.inactive',
    color: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  },
  [PRODUCT_STATUS.LOW_STOCK]: {
    label: 'dashboard.product.low_stock',
    color: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
  },
  [PRODUCT_STATUS.OUT_OF_STOCK]: {
    label: 'dashboard.product.out_of_stock',
    color: 'bg-red-100 text-red-700 hover:bg-red-200',
  },
  [PRODUCT_STATUS.ARCHIVED]: {
    label: 'dashboard.product.archived',
    color: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  },
};

// Sort options configuration
const SORT_OPTIONS: SortOption[] = [
  { value: PRODUCT_SORT.NEWEST, label: 'dashboard.product.sort_newest' },
  { value: PRODUCT_SORT.PRICE_ASC, label: 'dashboard.product.sort_price_asc' },
  { value: PRODUCT_SORT.PRICE_DESC, label: 'dashboard.product.sort_price_desc' },
  { value: PRODUCT_SORT.STOCK_ASC, label: 'dashboard.product.sort_stock_asc' },
  { value: PRODUCT_SORT.STOCK_DESC, label: 'dashboard.product.sort_stock_desc' },
  { value: PRODUCT_SORT.NAME_ASC, label: 'dashboard.product.sort_name_asc' },
  { value: PRODUCT_SORT.NAME_DESC, label: 'dashboard.product.sort_name_desc' },
];

/**
 * Storefront product management content component
 * Handles product listing, filtering, sorting, and bulk operations
 */
function ProductManagementContent({ websiteId }: { websiteId: string }): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const showSnackbar = useSnackbar();
  const [createBulkProducts, { isLoading: isBulkCreating }] = useCreateBulkProductsMutation();
  const { categories: shopCategories } = useShopCategories();

  // State management hooks
  const state = useProductManagementState();
  const {
    expandedRows,
    selectedItem,
    detailDrawerOpen,
    toggleRowExpand,
    closeDetailDrawer,
  } = useRowExpansion(isMobile);

  // Product data management hook
  const {
    products,
    totalItems,
    isLoading,
    isError,
    refetch,
    page,
    rowsPerPage,
    handleChangePage,
    handleChangeRowsPerPage,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    filterStatus,
    setFilterStatus,
    selected,
    handleSelectAll,
    handleSelect,
    statusCounts,
    deleteProduct,
    handleBulkOperation,
    handleBulkDelete,
    setSelected,
    optimisticLockData,
    productVersions,
    actionLoading,
    updateInventory,
  } = useProductManagement(websiteId || '');

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'categories' ? 'categories' : 'products';
  const [activeChip, setActiveChip] = React.useState<ProductFilterChip>('all');

  const handleTabChange = (tab: 'products' | 'categories') => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'categories') {
      next.set('tab', 'categories');
    } else {
      next.delete('tab');
    }
    setSearchParams(next, { replace: true });
  };

  const displayProducts = useMemo(() => {
    return filterProductsByChip((products as any) || [], activeChip);
  }, [products, activeChip]);

  const chipCounts = useMemo(() => {
    const list = (products as any) || [];
    return {
      all: list.length,
      on_sale: list.filter((p: any) => typeof p.salePrice === 'number' && p.salePrice < p.price).length,
      out_of_stock: list.filter((p: any) => p.stockQuantity <= 0).length,
      hidden: list.filter((p: any) => p.marketplaceVisibility === false).length,
      drafts: list.filter((p: any) => p.status === 'draft' || p.status === 'inactive').length,
    };
  }, [products]);

  const [entitlements, setEntitlements] = React.useState<any>(null);

  React.useEffect(() => {
    fetch(`${RENTIFY_API_BASE}/api/stores/mine/entitlements`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (res?.data) setEntitlements(res.data);
      })
      .catch((err) => {
        console.warn('Failed to load store entitlements', err);
      });
  }, []);

  const isGracePeriod = entitlements?.isGracePeriod;
  const isSuspended = entitlements?.isSuspended;
  const productLimit = entitlements?.capabilities?.productLimit ?? 500;
  const totalProducts = products?.length || 0;
  const isLimitReached = totalProducts >= productLimit;
  const canAddProduct = entitlements ? entitlements.mutationsAllowed && !isLimitReached : true;

  const disabledReason = !canAddProduct
    ? isGracePeriod
      ? 'Product creation is locked during your subscription grace period. Renew to restore full editing access.'
      : isSuspended
      ? 'Product creation is locked because the store subscription is suspended.'
      : isLimitReached
      ? `Product limit of ${productLimit} reached for the ${entitlements?.displayName || 'current'} plan. Upgrade to add more products.`
      : 'Product creation is unavailable.'
    : null;

  // Clear all filters and reset to default state
  const handleClearFilters = useCallback((): void => {
    setSearchTerm('');
    setFilterStatus(PRODUCT_STATUS.ALL);
    setSortBy(PRODUCT_SORT.NEWEST);
    state.setIsFiltersOpen(false);
  }, [setSearchTerm, setFilterStatus, setSortBy, state]);

  // Handle bulk deletion of selected products
  const handleBulkDeletes = useCallback(async (): Promise<void> => {
    const success = await handleBulkDelete(selected);
    if (success) {
      setSelected([]);
      refetch();
      showSnackbar(t('dashboard.product.bulk_delete_success'), 'success');
    }
  }, [handleBulkDelete, selected, refetch, showSnackbar, t, setSelected]);

  // Handle bulk status change for selected products
  const handleBulkStatusChange = useCallback(
    (newStatus: string): void => {
      handleBulkOperation('status-change', { newStatus });
    },
    [handleBulkOperation]
  );

  // Handle bulk price update for selected products
  const handleBulkPriceUpdate = useCallback(
    (newPrice: number): void => {
      handleBulkOperation('price-update', { newPrice });
    },
    [handleBulkOperation]
  );

  // Handle export of selected products
  const handleBulkExport = useCallback((): void => {
    const selectedProducts = products.filter((p: any) => selected.includes(p.id));
    if (selectedProducts.length === 0) {
      showSnackbar(t('dashboard.product.no_products_selected'), 'warning');
      return;
    }
    showSnackbar(`Exported ${selectedProducts.length} products`, 'success');
  }, [selected, products, showSnackbar, t]);

  // Handle inventory quantity updates
  const handleInventoryUpdate = useCallback(async (): Promise<void> => {
    if (!state.actionProduct) return;

    try {
      await updateInventory({
        websiteId,
        productId: state.actionProduct.id,
        adjustment: state.inventoryQty,
        note: state.inventoryNote,
        expectedVersion: productVersions[state.actionProduct.id],
      });

      showSnackbar(t('dashboard.product.inventory_updated'), 'success');
      state.setIsInventoryDialogOpen(false);
      refetch();
    } catch (error) {
      showSnackbar(t('dashboard.product.inventory_update_failed'), 'error');
    }
  }, [
    state,
    updateInventory,
    websiteId,
    productVersions,
    refetch,
    showSnackbar,
    t,
  ]);

  // Handle product actions (view, edit, delete, etc.)
  const handleProductAction = useCallback(
    (action: string, product: any): void => {
      if (action === 'view') {
        if (isMobile || isTablet) {
          state.setSelectedProductDetail(product);
          state.setIsProductDetailOpen(true);
        } else {
          navigate(`/products/${product.id}`);
        }
      } else {
        state.handleRowAction(action, product);
      }
    },
    [state, navigate, isMobile, isTablet]
  );

  // Handle individual product status changes
  const handleStatusChange = useCallback(
    async (newStatus: string, productId: string): Promise<void> => {
      try {
        await handleBulkOperation('status-change', { newStatus }, [productId]);
        showSnackbar(t('dashboard.product.status_updated'), 'success');
      } catch (error) {
        showSnackbar(t('dashboard.product.status_update_failed'), 'error');
      }
    },
    [handleBulkOperation, showSnackbar, t]
  );

  // Define table columns for product data
  const productColumns = useMemo(() => {
    const baseColumns = [
      {
        id: 'select',
        header: ({ table }: { table: any }) => (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={table.getIsAllPageRowsSelected()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                e.stopPropagation();
                table.getToggleAllPageRowsSelectedHandler()(e);
              }}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>
        ),
        cell: ({ row }: { row: any }) => {
          const product: Product = row.original;
          return (
            <div
              className="flex items-center justify-center"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (!expandedRows.has(product.id)) {
                  toggleRowExpand(product.id, product, e);
                }
              }}
            >
              <input
                type="checkbox"
                checked={row.getIsSelected()}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  e.stopPropagation();
                  row.getToggleSelectedHandler()(e);
                  if (!expandedRows.has(product.id)) {
                    toggleRowExpand(product.id, product, e as any);
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'name',
        header: t('dashboard.product.product'),
        cell: ({ row }: { row: any }) => {
          const product: Product = row.original;
          return (
            <div
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e: React.MouseEvent) => toggleRowExpand(product.id, product, e)}
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                {product.images?.[0]?.url ? (
                  <img
                    src={product.images[0].url}
                    alt={product.name}
                    className="h-10 w-10 rounded-md object-cover"
                  />
                ) : (
                  <IconPackage className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-medium text-sm truncate">
                  {product.name}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {product.sku || 'No SKU'}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'category',
        header: t('dashboard.product.category'),
        cell: ({ row }: { row: any }) => {
          const product: Product = row.original;
          return (
            <div
              onClick={(e: React.MouseEvent) => toggleRowExpand(product.id, product, e)}
              className="hidden lg:block"
            >
              <Badge
                variant="outline"
                className="text-muted-foreground px-1.5 py-0.5 text-xs cursor-pointer hover:bg-muted transition-colors"
              >
                {product.Category?.name || t('dashboard.product.uncategorized')}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: 'price',
        header: () => (
          <div className="text-right">{t('dashboard.product.price')}</div>
        ),
        cell: ({ row }: { row: any }) => {
          const product: Product = row.original;
          return (
            <div
              className="text-right font-medium text-sm cursor-pointer hover:text-primary transition-colors hidden md:block"
              onClick={(e: React.MouseEvent) => toggleRowExpand(product.id, product, e)}
            >
              ${product.price}
            </div>
          );
        },
      },
      {
        accessorKey: 'stock',
        header: () => (
          <div className="text-center">{t('dashboard.product.stock')}</div>
        ),
        cell: ({ row }: { row: any }) => {
          const product: Product = row.original;
          let variant: 'default' | 'destructive' | 'warning' = 'default';
          if (product.stockQuantity === 0) variant = 'destructive';
          else if (product.stockQuantity < 10) variant = 'warning';

          return (
            <div
              className="text-center cursor-pointer"
              onClick={(e: React.MouseEvent) => toggleRowExpand(product.id, product, e)}
            >
              <Badge
                variant={variant as any}
                className="text-xs hover:opacity-80 transition-opacity"
              >
                {product.stockQuantity}
              </Badge>
            </div>
          );
        },
      },
      {
        id: 'channels',
        header: () => <div className="text-center">{t('merchant.p.channels')}</div>,
        cell: ({ row }: { row: any }) => {
          const product: Product = row.original;
          const badges = computeChannelBadges(product as any, Boolean(websiteId));
          return (
            <div className="flex flex-wrap justify-center gap-1.5">
              {badges.onMarketplace && (
                <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Market ✓
                </Badge>
              )}
              {badges.onStorefront && (
                <Badge variant="outline" className="text-xs">
                  Store ✓
                </Badge>
              )}
              {badges.isOutOfStock && (
                <Badge variant="destructive" className="text-xs">
                  Out of stock
                </Badge>
              )}
              {badges.isHidden && (
                <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
                  Hidden
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: () => (
          <div className="text-center">{t('dashboard.product.status')}</div>
        ),
        cell: ({ row }: { row: any }) => {
          const product: Product = row.original;
          return (
            <div className="text-center flex justify-center">
              <ProductStatusBadge
                product={product}
                onStatusChange={handleStatusChange}
                isMobile={isMobile}
              />
            </div>
          );
        },
      },
      {
        id: 'actions',
        cell: ({ row }: { row: any }) => {
          const product: Product = row.original;
          return (
            <div className="flex justify-end">
              <ProductQuickActions
                product={product}
                onAction={handleProductAction}
                onViewDetails={(product: any) => {
                  if (isMobile || isTablet) {
                    state.setSelectedProductDetail(product);
                    state.setIsProductDetailOpen(true);
                  } else {
                    navigate(`/products/${product.id}`);
                  }
                }}
              />
            </div>
          );
        },
      },
    ];

    return baseColumns;
  }, [
    t,
    expandedRows,
    toggleRowExpand,
    handleProductAction,
    handleStatusChange,
    isMobile,
    state,
    navigate,
    isTablet,
  ]);

  // Render expanded row details
  const renderSubComponent = useCallback(
    ({ row }: { row: any }) => {
      const product: Product = row.original;
      return (
        <ProductRowDetail
          product={product as any}
          onShowMessage={showSnackbar as any}
          onActionComplete={handleProductAction}
        />
      );
    },
    [showSnackbar, handleProductAction]
  );

  // Filter options configuration
  const filterOptions: FilterOption[] = [
    {
      key: 'sort',
      value: sortBy,
      onChange: setSortBy,
      placeholder: t('dashboard.product.sort_by'),
      options: SORT_OPTIONS.map((option: SortOption) => ({
        value: option.value,
        label: t(option.label),
      })),
      className: 'lg:col-span-3',
    },
    {
      key: 'status',
      value: filterStatus,
      onChange: setFilterStatus,
      placeholder: t('dashboard.product.status'),
      options: Object.entries(STATUS_FILTERS).map(([key, { label }]) => ({
        value: key,
        label: t(label),
      })),
      className: 'lg:col-span-3',
    },
  ];

  // Mobile product card component
  const MobileProductCard = ({ product }: { product: Product }) => {
    const badges = computeChannelBadges(product as any, Boolean(websiteId));
    return (
    <Card className="group relative p-4 mb-3 cursor-pointer transition-all duration-200 hover:shadow-md border border-[var(--rentify-color-border-subtle,#ece8e1)] rounded-2xl bg-card">
      <div className="flex items-start justify-between gap-3">
        {/* Product Image */}
        <div className="relative flex-shrink-0">
          <div className="relative h-16 w-16 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden shadow-sm">
            {product.images?.[0]?.url ? (
              <img
                src={product.images[0].url}
                alt={product.name}
                className="h-16 w-16 rounded-xl object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center justify-center">
                <IconPackage className="h-6 w-6 text-gray-400" />
                <span className="text-[10px] text-gray-400 mt-1">{t('merchant.p.noImage')}</span>
              </div>
            )}
          </div>

          {/* Status Indicator Dot */}
          <div
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
              product.status === PRODUCT_STATUS.ACTIVE
                ? 'bg-green-500'
                : product.status === PRODUCT_STATUS.LOW_STOCK
                ? 'bg-amber-500'
                : product.status === PRODUCT_STATUS.OUT_OF_STOCK
                ? 'bg-red-500'
                : 'bg-gray-400'
            }`}
          />
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h4 className="font-semibold text-sm text-gray-900 truncate leading-tight">
              {product.name}
            </h4>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {product.sku || 'No SKU'}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Price */}
              <div className="flex items-center gap-1 bg-gradient-to-r from-primary/10 to-primary/5 px-2 py-1 rounded-lg">
                <IconCurrencyDollar className="h-3 w-3 text-primary" />
                <span className="font-bold text-sm text-primary">
                  ${product.price}
                </span>
              </div>

              {/* Stock */}
              <div
                className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  product.stockQuantity === 0
                    ? 'bg-red-50 text-red-700'
                    : product.stockQuantity < 10
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-green-50 text-green-700'
                }`}
              >
                {product.stockQuantity} in stock
              </div>
            </div>
          </div>

          {/* Category & Status */}
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className="text-xs px-2 py-1 bg-white/80 backdrop-blur-sm border-gray-200 text-gray-600"
            >
              {product.Category?.name || t('dashboard.product.uncategorized')}
            </Badge>

            <ProductStatusBadge
              product={product}
              onStatusChange={handleStatusChange}
              isMobile={true}
            />
          </div>
        </div>

        {/* Action Button */}
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-8 w-8 rounded-lg bg-white/50 backdrop-blur-sm border border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            handleProductAction('view', product);
          }}
        >
          <IconEye className="h-4 w-4 text-gray-600" />
        </Button>
      </div>

      {/* Channel tags */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40">
        {badges.onMarketplace && <Badge variant="secondary" className="text-[11px] bg-emerald-50 text-emerald-800 border-emerald-200">Market ✓</Badge>}
        {badges.onStorefront && <Badge variant="outline" className="text-[11px]">Store ✓</Badge>}
        {badges.isOutOfStock && <Badge variant="destructive" className="text-[11px]">Out of stock</Badge>}
        {badges.isHidden && <Badge variant="outline" className="text-[11px] text-muted-foreground border-dashed">Hidden</Badge>}
      </div>
    </Card>
  );
  };

  // Loading state
  
  const HeaderActions = () => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={() => {
          if (!canAddProduct) {
            showSnackbar(disabledReason || 'Action locked', 'error');
            return;
          }
          state.setIsBulkCreateOpen(true);
        }}
        disabled={!canAddProduct}
        title={disabledReason || undefined}
        className="hidden sm:inline-flex items-center gap-2 h-10 border-[var(--rentify-color-border-subtle,#ece8e1)]"
      >
        <Upload className="h-4 w-4" />
        <span>Import</span>
      </Button>

      {selected.length > 0 && (
        <Button
          variant="outline"
          onClick={handleBulkExport}
          className="hidden sm:inline-flex items-center gap-2 h-10 border-[var(--rentify-color-border-subtle,#ece8e1)]"
        >
          <Download className="h-4 w-4" />
          <span>Export ({selected.length})</span>
        </Button>
      )}

      <Button
        onClick={() => {
          if (!canAddProduct) {
            showSnackbar(disabledReason || 'Action locked', 'error');
            return;
          }
          navigate('/products/create');
        }}
        disabled={!canAddProduct}
        title={disabledReason || undefined}
        className="flex items-center gap-2 h-10 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        <span>Add product</span>
      </Button>
    </div>
  );
  
  
  if (isLoading) {
    return (
      <div className="min-h-full">
        <PageHeader
          title={t('dashboard.product.title')}
          description={t('dashboard.product.manage_your_products')}
          icon={Package}
          actions={<HeaderActions />}
          breadcrumb={[
            { label: 'Dashboard', href: '/overview' },
            { label: t('dashboard.product.title') }
          ]}
        />
        <div className="p-6 md:p-8">
          <ReusableTable
            data={[]}
            columns={productColumns}
            isLoading={true}
            loadingSkeletonRows={8}
          />
        </div>
      </div>
    );
  }
  // Error state
  if (isError) {
    return (
      <div className="min-h-full">
        <PageHeader
          title={t('dashboard.product.title')}
          description={t('dashboard.product.manage_your_products')}
          icon={Package}
          actions={<HeaderActions />}
          breadcrumb={[
            { label: 'Dashboard', href: '/overview' },
            { label: t('dashboard.product.title') }
          ]}
        />
        <div className="p-6 md:p-8">
          <Card className="p-6 max-w-md w-full text-center">
            <IconAlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {t('dashboard.product.error_loading')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('dashboard.product.error_loading_description')}
            </p>
            <Button onClick={refetch}>
              <IconRefresh className="mr-2 h-4 w-4" />
              {t('dashboard.product.retry')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-full">
      {/* Consistent Header */}
      <PageHeader
        title={t('dashboard.product.title')}
        description={t('dashboard.product.manage_your_products')}
        icon={Package}
        actions={<HeaderActions />}
        breadcrumb={[
          { label: 'Dashboard', href: '/overview' },
          { label: t('dashboard.product.title') }
        ]}
      />

      {/* Wireframe M8/M10 Top Tabs: All products & Categories */}
      <div className="border-b border-border/60 bg-background px-4 sm:px-6">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('products')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'products'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{t('dashboard.product.all_products') || 'All products'}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {totalItems}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('categories')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'categories'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{t('dashboard.product.categories') || 'Categories'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'categories' ? (
        <div className="p-4 sm:p-6 md:p-8 space-y-4">
          <div className="rounded-xl border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-muted/30 p-3 text-xs sm:text-sm text-muted-foreground">
            Your own categories appear as menus on your online store. On Rentify Market every product also has one Rentify category.
          </div>
          <CategoriesPage />
        </div>
      ) : (
     <div className="p-4 sm:p-6 md:p-8 space-y-5">
        {/* Wireframe M8 Filter Chips: All · On sale · Out of stock · Hidden from marketplace · Drafts */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: 'all', label: 'All', count: chipCounts.all },
              { key: 'on_sale', label: `On sale (${chipCounts.on_sale})`, count: chipCounts.on_sale },
              { key: 'out_of_stock', label: `Out of stock (${chipCounts.out_of_stock})`, count: chipCounts.out_of_stock },
              { key: 'hidden', label: 'Hidden from marketplace', count: chipCounts.hidden },
              { key: 'drafts', label: 'Drafts', count: chipCounts.drafts },
            ] as const
          ).map((chip) => {
            const isActive = activeChip === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setActiveChip(chip.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Select several to change price, stock or visibility together.
        </p>
        {disabledReason && !isGracePeriod && !isSuspended && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs sm:text-sm text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <IconAlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <span>{disabledReason}</span>
            </div>
            <Button asChild size="sm" variant="outline" className="border-amber-400 bg-white hover:bg-amber-100 text-amber-900">
              <a href="/settings/billing">{t('merchant.p.upgradePlan')}</a>
            </Button>
          </div>
        )}
        {/* Optimistic Lock Alert */}
        {optimisticLockData && (
          <Alert variant="default" className="mb-4 border-amber-500/50 bg-amber-500/10 text-amber-600 dark:border-amber-500 [&>svg]:text-amber-600">
            <IconAlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {t('dashboard.product.optimistic_lock_title')}
            </AlertTitle>
            <AlertDescription>
              {optimisticLockData.error}.{' '}
              {t('dashboard.product.refresh_and_retry_message')}
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() => refetch()}
              >
                {t('dashboard.product.refresh_and_retry')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <FilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterOptions={filterOptions}
            onClearFilters={handleClearFilters}
            searchPlaceholder={t('dashboard.product.search_placeholder')}
          />
        </motion.div>

        {/* Status Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <StatusTabs
            statusFilters={STATUS_FILTERS}
            statusCounts={statusCounts}
            currentStatus={filterStatus}
            onStatusChange={setFilterStatus}
            isMobile={isMobile}
          />
        </motion.div>

        {/* Selected Products Bar */}
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <BulkActionsBar
              selectedCount={selected.length}
              onDelete={handleBulkDeletes}
              onExport={handleBulkExport}
              onMoreActions={() => state.setIsBulkStatusModalOpen(true)}
              deleteLabel={t('dashboard.product.delete_selected', {
                count: selected.length,
              })}
              exportLabel={t('dashboard.product.export_selected')}
              moreActionsLabel={t('dashboard.product.more_actions')}
              disabled={actionLoading.type === 'bulk-delete'}
            />
          </motion.div>
        )}

        {/* Products Table/Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {isMobile ? (
            <div className="space-y-3">
              {displayProducts.map((product: any) => (
                <MobileProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <ReusableTable
              data={displayProducts}
              columns={productColumns}
              isLoading={isLoading}
              isError={isError}
              totalItems={totalItems}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              selected={selected}
              onSelectionChange={setSelected}
              emptyStateIcon={IconPackage}
              // No search or filter means the store truly has no products yet: say what the page is for.
              emptyStateTitle={!searchTerm && filterStatus === PRODUCT_STATUS.ALL ? t('merchant.setup.productsEmptyTitle') : t('dashboard.product.no_products_found')}
              emptyStateDescription={!searchTerm && filterStatus === PRODUCT_STATUS.ALL ? t('merchant.setup.productsEmptyBody') : t('dashboard.product.adjust_filters')}
              emptyStateAction={!searchTerm && filterStatus === PRODUCT_STATUS.ALL ? (
                <Button className="h-11" onClick={() => navigate('/products/create')}>{t('merchant.setup.actionAddProduct')}</Button>
              ) : null}
              loadingSkeletonRows={8}
              renderSubComponent={renderSubComponent}
              expandedRows={expandedRows}
              onRowClick={(product: Product) => toggleRowExpand(product.id, product)}
              isMobile={isMobile}
              isTablet={isTablet}
            />
          )}
        </motion.div>
      </div>
      )}

      {/* Product Detail Drawer */}
      <DetailDrawer
        open={state.isProductDetailOpen}
        onOpenChange={state.setIsProductDetailOpen}
        selectedItem={(state.selectedProductDetail as any) || undefined}
        title={t('merchant.p.productDetails')}
        description="Complete product information and actions"
        renderDetail={(product: Product) => (
          <ProductRowDetail
            product={product as any}
            onShowMessage={showSnackbar as any}
            onActionComplete={(action: string) => {
              handleProductAction(action, product);
              if (action !== 'view') {
                state.setIsProductDetailOpen(false);
              }
            }}
            isMobile={true}
          />
        )}
        isMobile={isMobile}
      />

      {/* Modals and Dialogs */}
      <BulkCreateProductsModal
        open={state.isBulkCreateOpen}
        onOpenChange={state.setIsBulkCreateOpen}
        onSubmit={async (products: Product[]) => {
          const preparedProducts = [];
          for (const rawProduct of products as any[]) {
            const files = (rawProduct.images || [])
              .map((image: any) => image.file)
              .filter(Boolean);
            const images = await uploadProductImages({ files, websiteId });
            const product = { ...rawProduct };
            delete product.id;
            delete product.images;
            preparedProducts.push({
              ...product,
              price: Number(product.price),
              stockQuantity: Number(product.stockQuantity || 0),
              images,
            });
          }
          await createBulkProducts({ websiteId, products: preparedProducts }).unwrap();
          await refetch();
          showSnackbar(
            `Successfully created ${products.length} products`,
            'success'
          );
        }}
        categories={shopCategories}
        isLoading={isBulkCreating}
      />

      <ConfirmDeleteDialog
        open={state.openDeleteDialog}
        onClose={() => state.setOpenDeleteDialog(false)}
        onConfirm={async () => {
          if (!state.actionProduct) return;
          try {
            await deleteProduct({
              websiteId,
              productId: state.actionProduct.id,
              expectedVersion: productVersions[state.actionProduct.id],
            });
            showSnackbar(t('dashboard.product.product_deleted'), 'success');
            refetch();
          } catch (error) {
            showSnackbar(t('dashboard.product.delete_failed'), 'error');
          }
          state.setOpenDeleteDialog(false);
        }}
        productName={state.actionProduct?.name}
      />

      <InventoryDialog
        open={state.isInventoryDialogOpen}
        onClose={() => state.setIsInventoryDialogOpen(false)}
        product={state.actionProduct as any}
        inventoryQty={state.inventoryQty}
        setInventoryQty={state.setInventoryQty}
        inventoryNote={state.inventoryNote}
        setInventoryNote={state.setInventoryNote}
        onSubmit={handleInventoryUpdate}
        isLoading={actionLoading.type === 'inventory-update'}
      />

      {state.isBulkStatusModalOpen && (
        <BulkStatusChangeModal
          open={state.isBulkStatusModalOpen}
          onClose={() => state.setIsBulkStatusModalOpen(false)}
          onConfirm={handleBulkStatusChange}
          selectedCount={selected.length}
          isLoading={actionLoading.type === 'bulk-status-change'}
        />
      )}

      {state.isBulkPriceModalOpen && (
        <BulkPriceUpdateModal
          open={state.isBulkPriceModalOpen}
          onClose={() => state.setIsBulkPriceModalOpen(false)}
          onConfirm={handleBulkPriceUpdate}
          selectedCount={selected.length}
          isLoading={actionLoading.type === 'bulk-price-update'}
        />
      )}
    </div>
  );
}

// Every Store gets the same simple product list; the older table with bulk
// create/export stays one link away at /products/manage for website stores.
export function ProductManagement(): JSX.Element {
  return <StoreCatalogPage />;
}

export function BulkProductManagement(): JSX.Element {
  const { websiteData } = useThemeService();
  const websiteId = websiteData?.websiteId;
  if (!websiteId) return <StoreCatalogPage />;
  return <ProductManagementContent websiteId={websiteId} />;
}

export default ProductManagement;
