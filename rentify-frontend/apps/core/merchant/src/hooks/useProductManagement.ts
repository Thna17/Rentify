import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  useGetManagedProductsQuery,
  useUpdateInventoryMutation,
  useDeleteProductMutation,
  useBulkUpdateProductsMutation,
} from '@rentify/apis';

/**
 * Product status constants
 */
export const PRODUCT_STATUS = {
  ALL: 'all',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  ARCHIVED: 'archived',
} as const;

/**
 * Product sort options
 */
export const PRODUCT_SORT = {
  NEWEST: 'newest',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  STOCK_ASC: 'stock_asc',
  STOCK_DESC: 'stock_desc',
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
} as const;

/**
 * Product type definition
 */
export interface Product {
  id: string;
  version: number;
  status: string;
  stockQuantity: number;
  [key: string]: any;
}

/**
 * Snackbar state type
 */
interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

/**
 * Hook return type
 */
interface UseProductManagementReturn {
  products: Product[];
  totalItems: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  page: number;
  rowsPerPage: number;
  handleChangePage: (event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (
    event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  selected: string[];
  handleSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelect: (id: string) => void;
  snackbar: SnackbarState;
  handleShowSnackbar: (
    message: string,
    severity?: SnackbarState['severity']
  ) => void;
  handleCloseSnackbar: () => void;
  statusCounts: Record<string, number>;
  productVersions: Record<string, number>;
  handleBulkDelete: (selectedIds: string[]) => Promise<boolean>;
  optimisticLockData: any;
  retryBulkAction: () => Promise<void>;
  actionLoading: { type: string | null; id: string | number | null };
  setActionLoading: React.Dispatch<
    React.SetStateAction<{ type: string | null; id: string | number | null }>
  >;
  handleBulkOperation: (
    operation: string,
    updateData?: Record<string, any>,
    productIds?: string[]
  ) => Promise<boolean>;
  deleteProductHandle: (params: {
    websiteId: string;
    productId: string;
    expectedVersion: number;
  }) => Promise<any>;
  deleteProduct: any;
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
}

/**
 * Custom hook for product management
 * Handles fetching, selection, bulk actions, snackbar notifications, and optimistic updates
 */
export const useProductManagement = (
  websiteId: string
): UseProductManagementReturn => {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(PRODUCT_SORT.NEWEST);
  const [filterStatus, setFilterStatus] = useState(PRODUCT_STATUS.ALL);
  const [selected, setSelected] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [productVersions, setProductVersions] = useState<
    Record<string, number>
  >({});
  const [optimisticLockData, setOptimisticLockData] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<{
    type: string | null;
    id: string | number | null;
  }>({ type: null, id: null });

  // Fetch products with query
  const { data, isLoading, isError, refetch } = useGetManagedProductsQuery({
    websiteId,
    page,
    limit: rowsPerPage,
    sort: sortBy,
    search: searchTerm,
    status: filterStatus,
  });

  // Store product versions for optimistic updates
  useEffect(() => {
    if (data?.products) {
      const versions: Record<string, number> = {};
      data.products.forEach((product: Product) => {
        versions[product.id] = product.version;
      });
      setProductVersions(versions);
    }
  }, [data]);

  const [deleteProduct] = useDeleteProductMutation();
  const [bulkUpdateMutation] = useBulkUpdateProductsMutation();

  const deleteProductHandle = useCallback(
    async ({
      websiteId,
      productId,
      expectedVersion,
    }: {
      websiteId: string;
      productId: string;
      expectedVersion: number;
    }) => {
      return deleteProduct({ websiteId, productId, expectedVersion }).unwrap();
    },
    [deleteProduct]
  );

  const handleShowSnackbar = useCallback(
    (message: string, severity: SnackbarState['severity'] = 'success') => {
      setSnackbar({ open: true, message, severity });
    },
    []
  );

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const handleChangePage = useCallback((_: unknown, newPage: number) => {
    setPage(newPage + 1);
  }, []);

  const handleChangeRowsPerPage = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      setPage(1);
    },
    []
  );

  const statusCounts = useMemo(() => {
    if (!data?.products) return {};

    return data.products.reduce(
      (counts: Record<string, number>, product: Product) => {
        counts[product.status] = (counts[product.status] || 0) + 1;
        counts[PRODUCT_STATUS.ALL] = (counts[PRODUCT_STATUS.ALL] || 0) + 1;

        if (product.stockQuantity === 0) {
          counts[PRODUCT_STATUS.OUT_OF_STOCK] =
            (counts[PRODUCT_STATUS.OUT_OF_STOCK] || 0) + 1;
        } else if (product.stockQuantity < 10) {
          counts[PRODUCT_STATUS.LOW_STOCK] =
            (counts[PRODUCT_STATUS.LOW_STOCK] || 0) + 1;
        }

        return counts;
      },
      {}
    );
  }, [data]);

  const handleSelectAll = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSelected(
        event.target.checked ? data.products.map((p: Product) => p.id) : []
      );
    },
    [data]
  );

  const handleSelect = useCallback((id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const handleBulkDelete = useCallback(
    async (selectedIds: string[]) => {
      setActionLoading({ type: 'bulk-delete', id: 'bulk' });

      try {
        await Promise.all(
          selectedIds.map((id) =>
            deleteProduct({
              websiteId,
              productId: id,
              expectedVersion: productVersions[id],
            })
          )
        );

        handleShowSnackbar(
          `${selectedIds.length} products deleted!`,
          'success'
        );
        return true;
      } catch (error: any) {
        if (error.status === 409) {
          setOptimisticLockData({
            action: 'bulk-delete',
            error: 'Some products were updated by another user',
            selected: selectedIds,
          });
          handleShowSnackbar(
            'Conflict: Some products were modified',
            'warning'
          );
        } else {
          handleShowSnackbar('Deletion failed', 'error');
        }
        return false;
      } finally {
        setActionLoading({ type: null, id: null });
      }
    },
    [deleteProduct, websiteId, productVersions, handleShowSnackbar]
  );

  const handleBulkOperation = useCallback(
    async (
      operation: string,
      updateData: Record<string, any> = {},
      productIds: string[] | null = null
    ) => {
      const productIdsToUpdate = productIds || selected;
      setActionLoading({
        type: operation,
        id: productIdsToUpdate.length === 1 ? productIdsToUpdate[0] : 'bulk',
      });

      try {
        await bulkUpdateMutation({
          websiteId,
          operation,
          productIds: productIdsToUpdate,
          expectedVersions: productIdsToUpdate.map((id) => productVersions[id]),
          ...updateData,
        }).unwrap();

        handleShowSnackbar(
          productIdsToUpdate.length === 1
            ? `Product ${operation} successful!`
            : `Bulk ${operation} successful!`,
          'success'
        );

        if (!productIds) setSelected([]);
        refetch();
        return true;
      } catch (error: any) {
        if (error.status === 409) {
          setOptimisticLockData({
            action: operation,
            error: 'Some products were updated by another user',
            selected: productIdsToUpdate,
            updateData,
          });
          handleShowSnackbar('Conflict: Refresh and retry', 'warning');
        } else {
          handleShowSnackbar(
            productIdsToUpdate.length === 1
              ? `${operation} failed: ${error.data?.error || error.message}`
              : `Bulk ${operation} failed: ${
                  error.data?.error || error.message
                }`,
            'error'
          );
        }
        return false;
      } finally {
        setActionLoading({ type: null, id: null });
      }
    },
    [
      bulkUpdateMutation,
      websiteId,
      selected,
      productVersions,
      handleShowSnackbar,
      refetch,
    ]
  );

  const retryBulkAction = useCallback(async () => {
    if (!optimisticLockData) return;

    const success = await handleBulkDelete(optimisticLockData.selected);
    if (success) {
      setOptimisticLockData(null);
      refetch();
    }
  }, [optimisticLockData, handleBulkDelete, refetch]);

  return {
    products: data?.products || [],
    totalItems: data?.totalItems || 0,
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
    snackbar,
    handleShowSnackbar,
    handleCloseSnackbar,
    statusCounts,
    productVersions,
    handleBulkDelete,
    optimisticLockData,
    retryBulkAction,
    actionLoading,
    setActionLoading,
    handleBulkOperation,
    deleteProductHandle,
    deleteProduct,
    setSelected,
  };
};

export default useProductManagement;
