import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from '@rentify/utils';
import { useOrderManagement, ORDER_STATUS, ORDER_TYPE } from '../../hooks/useOrderManagement'
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import {
  IconReceipt,
  IconAlertTriangle,
  IconLoader,
  IconEye,
  IconCurrencyDollar,
} from '@tabler/icons-react';

// Reusable components and hooks
import { useResponsive } from '@rentify/shared/hooks/useResponsive';
import { useSnackbar } from '@rentify/shared/hooks/useSnackbar';
import { useRowExpansion } from '@rentify/shared/hooks/useRowExpansion';
import { FilterBar } from '@rentify/shared/ui/components/FilterBar';
import { BulkActionsBar } from '@rentify/shared/ui/components/BulkActionsBar';
import { DetailDrawer } from '@rentify/shared/ui/components/DetailDrawer';
import { ReusableTable } from '@rentify/shared/ui/components/ReusableTable';
import { StatusTabs } from '@rentify/shared/ui/components/StatusTabs';
import { PageHeader } from '@rentify/shared/layouts/dashboard/PageHeader';

import { OrderRowDetail } from './components/OrderRowDetail';
import { QuickActionsDropdown } from './components/OrderQuickActions';

// Shadcn components
import { Badge } from '@rentify/shared/ui/badge';
import { Button } from '@rentify/shared/ui/button';
import { Card } from '@rentify/shared/ui/card';
import { Download, Plus, Upload, Receipt } from 'lucide-react';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';

const STATUS_FILTERS = {
  [ORDER_STATUS.ALL]: {
    label: 'dashboard.order.all_orders',
    icon: <IconReceipt className="h-4 w-4" />,
    color: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  },
  [ORDER_STATUS.PENDING]: {
    label: 'dashboard.order.pending',
    color: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
  },
  [ORDER_STATUS.CONFIRMED]: {
    label: 'dashboard.order.confirmed',
    color: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  },
  [ORDER_STATUS.COMPLETED]: {
    label: 'dashboard.order.completed',
    color: 'bg-green-100 text-green-700 hover:bg-green-200',
  },
  [ORDER_STATUS.FULFILLED]: {
    label: 'dashboard.order.fulfilled',
    color: 'bg-green-100 text-green-700 hover:bg-green-200',
  },
  [ORDER_STATUS.CANCELLED]: {
    label: 'dashboard.order.cancelled',
    color: 'bg-red-100 text-red-700 hover:bg-red-200',
  },
};

export function OrderManagement() {
  const { t } = useTranslation();
  const { websiteData } = useThemeService();
  const websiteId = websiteData.websiteId;
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const showSnackbar = useSnackbar();

  const {
    orders,
    filteredOrders,
    totalOrders,
    isLoading,
    isError,
    refetch,
    tabValue,
    setTabValue,
    orderTypeFilter,
    setOrderTypeFilter,
    searchTerm,
    setSearchTerm,
    statusCounts,
    page,
    rowsPerPage,
    handleChangePage,
    handleChangeRowsPerPage,
    // Add these if available in your hook
    selected = [],
    setSelected,
    handleBulkOperation,
    actionLoading,
  } = useOrderManagement(websiteId);

  const [selectedOrders, setSelectedOrders] = useState([]);
  const {
    expandedRows,
    selectedItem,
    detailDrawerOpen,
    toggleRowExpand,
    closeDetailDrawer,
  } = useRowExpansion(isMobile);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setOrderTypeFilter(ORDER_TYPE.ALL);
    setTabValue(ORDER_STATUS.ALL);
  }, [setSearchTerm, setOrderTypeFilter, setTabValue]);

  const handleQuickAction = useCallback((action, order) => {
    showSnackbar(`${action} action for order #${order.id.slice(0, 8)}`, 'info');
    
    if (!isMobile) {
      toggleRowExpand(order.id, order);
    }
  }, [showSnackbar, isMobile, toggleRowExpand]);

  const handleBulkExport = useCallback(() => {
    if (selectedOrders.length === 0) {
      showSnackbar(t('dashboard.order.no_orders_selected'), 'warning');
      return;
    }
    showSnackbar(`Exported ${selectedOrders.length} orders`, 'success');
  }, [selectedOrders, showSnackbar, t]);

  const handleImport = useCallback(() => {
    showSnackbar('Import functionality coming soon', 'info');
  }, [showSnackbar]);

  const handleCreate = useCallback(() => {
    navigate('/orders/create');
  }, [navigate]);

  const handleBulkDelete = useCallback(() => {
    if (selectedOrders.length === 0) {
      showSnackbar(t('dashboard.order.no_orders_selected'), 'warning');
      return;
    }
    showSnackbar(`Deleted ${selectedOrders.length} orders`, 'success');
    setSelectedOrders([]);
  }, [selectedOrders, showSnackbar, t]);

  const handleBulkStatusChange = useCallback((newStatus) => {
    if (selectedOrders.length === 0) {
      showSnackbar(t('dashboard.order.no_orders_selected'), 'warning');
      return;
    }
    showSnackbar(`Updated status for ${selectedOrders.length} orders to ${newStatus}`, 'success');
  }, [selectedOrders, showSnackbar, t]);

  // Mobile Order Card Component
  const MobileOrderCard = ({ order }) => {
    const statusConfig = {
      [ORDER_STATUS.PENDING]: { label: t('dashboard.order.pending'), variant: 'warning', color: 'bg-amber-500' },
      [ORDER_STATUS.CONFIRMED]: { label: t('dashboard.order.confirmed'), variant: 'default', color: 'bg-blue-500' },
      [ORDER_STATUS.COMPLETED]: { label: t('dashboard.order.completed'), variant: 'success', color: 'bg-green-500' },
      [ORDER_STATUS.FULFILLED]: { label: t('dashboard.order.fulfilled'), variant: 'success', color: 'bg-green-500' },
      [ORDER_STATUS.CANCELLED]: { label: t('dashboard.order.cancelled'), variant: 'destructive', color: 'bg-red-500' },
    };

    const typeConfig = {
      [ORDER_TYPE.ONLINE]: { label: t('dashboard.order.online'), color: 'bg-blue-100 text-blue-700' },
      [ORDER_TYPE.POS]: { label: t('dashboard.order.pos'), color: 'bg-green-100 text-green-700' },
      [ORDER_TYPE.MANUAL]: { label: t('dashboard.order.manual'), color: 'bg-purple-100 text-purple-700' },
    };

    const paymentConfig = {
      paid: { label: t('dashboard.order.paid'), color: 'bg-green-100 text-green-700' },
      pending: { label: t('dashboard.order.pending'), color: 'bg-amber-100 text-amber-700' },
      failed: { label: t('dashboard.order.failed'), color: 'bg-red-100 text-red-700' },
      refunded: { label: t('dashboard.order.refunded'), color: 'bg-gray-100 text-gray-700' },
    };

    const status = statusConfig[order.status] || statusConfig[ORDER_STATUS.PENDING];
    const type = typeConfig[order.orderType] || typeConfig[ORDER_TYPE.ONLINE];
    const payment = paymentConfig[order.paymentStatus] || paymentConfig.pending;

    return (
      <Card className="group relative p-4 mb-4 cursor-pointer transition-all duration-300 hover:shadow-lg border border-gray-300 hover:border-primary/20 rounded-xl bg-gradient-to-br from-white to-gray-50/50">
        <div className="flex items-start justify-between gap-3">
          {/* Order Icon and Status */}
          <div className="relative flex-shrink-0">
            <div className="relative h-14 w-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-sm">
              <IconReceipt className="h-6 w-6 text-primary" />
            </div>
            
            {/* Status Indicator Dot */}
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${status.color}`} />
          </div>

          {/* Order Info */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-gray-900 truncate leading-tight">
                  #{order.id.slice(0, 8).toUpperCase()}
                </h4>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {order.shippingDetails?.name || t('dashboard.order.walk_in_customer')}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 bg-gradient-to-r from-primary/10 to-primary/5 px-2 py-1 rounded-lg">
                  <IconCurrencyDollar className="h-3 w-3 text-primary" />
                  <span className="font-bold text-sm text-primary">${order.totalAmount}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(order.orderDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </div>
              </div>
            </div>

            {/* Badges Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant={status.variant} 
                className="text-xs px-2 py-1 capitalize"
              >
                {status.label}
              </Badge>
              
              <span className={`text-xs px-2 py-1 rounded-full ${type.color}`}>
                {type.label}
              </span>
              
              <span className={`text-xs px-2 py-1 rounded-full ${payment.color}`}>
                {payment.label}
              </span>
            </div>

            {/* Items Summary */}
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{order.items?.length || 0} items</span>
              <span className="font-medium">{order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} units</span>
            </div>
          </div>

          {/* Action Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="flex-shrink-0 h-8 w-8 rounded-lg bg-white/50 backdrop-blur-sm border border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              toggleRowExpand(order.id, order);
            }}
          >
            <IconEye className="h-4 w-4 text-gray-600" />
          </Button>
        </div>

        {/* Hover Effect Border */}
        <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-primary/10 transition-all duration-300 pointer-events-none" />
      </Card>
    );
  };

  // Order columns definition
  const orderColumns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => {
              e.stopPropagation();
              table.getToggleAllPageRowsSelectedHandler()(e);
            }}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>
      ),
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div 
            className="flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              if (!expandedRows.has(order.id)) {
                toggleRowExpand(order.id, order, e);
              }
            }}
          >
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={(e) => {
                e.stopPropagation();
                row.getToggleSelectedHandler()(e);
                if (!expandedRows.has(order.id)) {
                  toggleRowExpand(order.id, order, e);
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
      accessorKey: 'id',
      header: t('dashboard.order.order_id'),
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div 
            className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
            onClick={(e) => toggleRowExpand(order.id, order, e)}
          >
            <span className="text-primary">#{order.id.slice(0, 8).toUpperCase()}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'customer',
      header: t('dashboard.order.customer'),
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div 
            className="flex flex-col min-w-[140px] cursor-pointer"
            onClick={(e) => toggleRowExpand(order.id, order, e)}
          >
            <span className="font-medium text-sm truncate">
              {order.shippingDetails?.name || t('dashboard.order.walk_in_customer')}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {order.shippingDetails?.email || 'No email'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'date',
      header: t('dashboard.order.date'),
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div 
            className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            onClick={(e) => toggleRowExpand(order.id, order, e)}
          >
            {new Date(order.orderDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">{t('dashboard.order.amount')}</div>,
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div 
            className="text-right cursor-pointer"
            onClick={(e) => toggleRowExpand(order.id, order, e)}
          >
            <div className="flex items-center justify-end gap-1">
              <IconCurrencyDollar className="h-3 w-3 text-primary" />
              <span className="font-medium text-sm">${order.totalAmount}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: t('dashboard.order.type'),
      cell: ({ row }) => {
        const order = row.original;
        const typeConfig = {
          [ORDER_TYPE.ONLINE]: { label: t('dashboard.order.online'), variant: 'default' },
          [ORDER_TYPE.POS]: { label: t('dashboard.order.pos'), variant: 'secondary' },
          [ORDER_TYPE.MANUAL]: { label: t('dashboard.order.manual'), variant: 'outline' },
        };

        const config = typeConfig[order.orderType] || {
          label: order.orderType,
          variant: 'outline',
        };

        return (
          <Badge 
            variant={config.variant} 
            className="text-xs capitalize cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => toggleRowExpand(order.id, order, e)}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">{t('dashboard.order.status')}</div>,
      cell: ({ row }) => {
        const order = row.original;
        const statusConfig = {
          [ORDER_STATUS.PENDING]: { label: t('dashboard.order.pending'), variant: 'warning' },
          [ORDER_STATUS.CONFIRMED]: { label: t('dashboard.order.confirmed'), variant: 'default' },
          [ORDER_STATUS.COMPLETED]: { label: t('dashboard.order.completed'), variant: 'success' },
          [ORDER_STATUS.FULFILLED]: { label: t('dashboard.order.fulfilled'), variant: 'success' },
          [ORDER_STATUS.CANCELLED]: { label: t('dashboard.order.cancelled'), variant: 'destructive' },
        };

        const config = statusConfig[order.status] || {
          label: order.status,
          variant: 'outline',
        };

        return (
          <div 
            className="text-center cursor-pointer"
            onClick={(e) => toggleRowExpand(order.id, order, e)}
          >
            <Badge variant={config.variant} className="text-xs capitalize hover:opacity-80 transition-opacity">
              {config.label}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'payment',
      header: () => <div className="text-center">{t('dashboard.order.payment')}</div>,
      cell: ({ row }) => {
        const order = row.original;
        const paymentConfig = {
          paid: { label: t('dashboard.order.paid'), variant: 'success' },
          pending: { label: t('dashboard.order.pending'), variant: 'warning' },
          failed: { label: t('dashboard.order.failed'), variant: 'destructive' },
          refunded: { label: t('dashboard.order.refunded'), variant: 'outline' },
        };

        const config = paymentConfig[order.paymentStatus] || {
          label: order.paymentStatus,
          variant: 'outline',
        };

        return (
          <div 
            className="text-center cursor-pointer"
            onClick={(e) => toggleRowExpand(order.id, order, e)}
          >
            <Badge variant={config.variant} className="text-xs capitalize hover:opacity-80 transition-opacity">
              {config.label}
            </Badge>
          </div>
        );
      },
    },
    {
      id: 'quick_actions',
      header: () => <div className="text-center">{t('dashboard.order.actions')}</div>,
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex justify-center">
            <QuickActionsDropdown 
              order={order} 
              onAction={handleQuickAction}
              onViewDetails={() => navigate(`/orders/${order.id}`)}
            />
          </div>
        );
      },
    },
  ], [t, expandedRows, toggleRowExpand, handleQuickAction, navigate]);

  const renderSubComponent = useCallback(
    ({ row }) => {
      const order = row.original;
      return (
        <OrderRowDetail 
          order={order} 
          onShowMessage={showSnackbar}
          onActionComplete={() => {
            setTimeout(() => {
              // Clear expanded rows after action
              // This would need to be implemented in your useRowExpansion hook
            }, 1000);
          }}
        />
      );
    },
    [showSnackbar]
  );

  const filterOptions = [
    {
      key: 'type',
      value: orderTypeFilter,
      onChange: setOrderTypeFilter,
      placeholder: t('dashboard.order.order_type'),
      options: [
        { value: ORDER_TYPE.ALL, label: t('dashboard.order.all_types') },
        { value: ORDER_TYPE.ONLINE, label: t('dashboard.order.online') },
        { value: ORDER_TYPE.POS, label: t('dashboard.order.pos') },
        { value: ORDER_TYPE.MANUAL, label: t('dashboard.order.manual') },
      ],
      className: 'lg:col-span-3'
    },
    {
      key: 'status',
      value: tabValue,
      onChange: setTabValue,
      placeholder: t('dashboard.order.status'),
      options: Object.entries(STATUS_FILTERS).map(([key, { label }]) => ({
        value: key,
        label: t(label)
      })),
      className: 'lg:col-span-3'
    }
  ];

  // Header Actions Component
  const HeaderActions = () => (
    <div className="flex flex-col sm:flex-row gap-3">
      <Button
        variant="outline"
        onClick={handleImport}
        className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-gray-200"
      >
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">{t('dashboard.order.import')}</span>
      </Button>
      
      <Button
        variant="outline"
        onClick={handleBulkExport}
        disabled={selectedOrders.length === 0}
        className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-gray-200"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">{t('dashboard.order.export')}</span>
      </Button>
      
      <Button
        onClick={handleCreate}
        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
      >
        <Plus className="h-4 w-4" />
        <span>{t('dashboard.order.create_order')}</span>
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-full">
        <PageHeader
          title={t('dashboard.order.title')}
          description={t('dashboard.order.manage_your_orders')}
          icon={Receipt}
          actions={<HeaderActions />}
          breadcrumb={[
            { label: 'Dashboard', href: '/overview' },
            { label: t('dashboard.order.title') }
          ]}
        />
        <div className="p-6 md:p-8">
          <ReusableTable
            data={[]}
            columns={orderColumns}
            isLoading={true}
            loadingSkeletonRows={8}
          />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-full">
        <PageHeader
          title={t('dashboard.order.title')}
          description={t('dashboard.order.manage_your_orders')}
          icon={Receipt}
          actions={<HeaderActions />}
          breadcrumb={[
            { label: 'Dashboard', href: '/overview' },
            { label: t('dashboard.order.title') }
          ]}
        />
        <div className="p-6 md:p-8">
          <Card className="p-6 max-w-md w-full text-center">
            <IconAlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {t('dashboard.order.error_loading')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('dashboard.order.error_loading_description')}
            </p>
            <Button onClick={refetch}>
              <IconLoader className="mr-2 h-4 w-4" />
              {t('dashboard.order.retry')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Consistent Header */}
      <PageHeader
        title={t('dashboard.order.title')}
        description={t('dashboard.order.manage_your_orders')}
        icon={Receipt}
        actions={<HeaderActions />}
        breadcrumb={[
          { label: 'Dashboard', href: '/overview' },
          { label: t('dashboard.order.title') }
        ]}
      />

      <div className="p-6 md:p-8 space-y-6">
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
            searchPlaceholder={t('dashboard.order.search_placeholder')}
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
            currentStatus={tabValue}
            onStatusChange={setTabValue}
            isMobile={isMobile}
          />
        </motion.div>

        {/* Selected Orders Bar */}
        {selectedOrders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <BulkActionsBar
              selectedCount={selectedOrders.length}
              onDelete={handleBulkDelete}
              onExport={handleBulkExport}
              onMoreActions={() => handleBulkStatusChange(ORDER_STATUS.CONFIRMED)}
              deleteLabel={t('dashboard.order.delete_selected')}
              exportLabel={t('dashboard.order.export_selected')}
              moreActionsLabel={t('dashboard.order.more_actions')}
            />
          </motion.div>
        )}

        {/* Orders Table/Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {isMobile ? (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <MobileOrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <ReusableTable
              data={filteredOrders}
              columns={orderColumns}
              isLoading={isLoading}
              isError={isError}
              totalItems={totalOrders}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              selected={selectedOrders}
              onSelectionChange={setSelectedOrders}
              emptyStateIcon={IconReceipt}
              emptyStateTitle={t('dashboard.order.no_orders_found')}
              emptyStateDescription={t('dashboard.order.adjust_filters')}
              loadingSkeletonRows={8}
              renderSubComponent={isMobile ? undefined : renderSubComponent}
              getRowCanExpand={isMobile ? undefined : () => true}
              expandedRows={expandedRows}
              onRowClick={(order) => toggleRowExpand(order.id, order)}
              isMobile={isMobile}
              isTablet={isTablet}
            />
          )}
        </motion.div>
      </div>

      <DetailDrawer
        open={detailDrawerOpen}
        onOpenChange={closeDetailDrawer}
        selectedItem={selectedItem}
        title={t('dashboard.order.order_details')}
        description={t('dashboard.order.complete_order_information')}
        renderDetail={(order) => (
          <OrderRowDetail 
            order={order} 
            onShowMessage={showSnackbar}
            isMobile={true}
            onActionComplete={closeDetailDrawer}
          />
        )}
        isMobile={isMobile}
      />
    </div>
  );
}

export default OrderManagement;
