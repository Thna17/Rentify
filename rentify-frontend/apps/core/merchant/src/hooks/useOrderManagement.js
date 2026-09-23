import { useState, useMemo, useCallback } from 'react';
import { useGetOrderHistoryQuery } from '@rentify/apis';
import { useTranslation } from '@rentify/utils';

export const ORDER_STATUS = {
  ALL: 'all',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
};

export const ORDER_TYPE = {
  ALL: 'all',
  ONLINE: 'online',
  POS: 'pos',
  MANUAL: 'manual',
};

export const useOrderManagement = (websiteId) => {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(ORDER_STATUS.ALL);
  const [orderTypeFilter, setOrderTypeFilter] = useState(ORDER_TYPE.ALL);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data, isLoading, isError, refetch } = useGetOrderHistoryQuery({
    websiteId,
    page,
    limit: rowsPerPage,
  });

  const handleShowSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message: t(message), severity });
  }, [t]);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage + 1);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1);
  }, []);

  const filteredOrders = useMemo(() => {
    if (!data?.orders) return [];

    return data.orders.filter((order) => {
      const statusMatch =
        tabValue === ORDER_STATUS.ALL || order.status === tabValue;

      const typeMatch =
        orderTypeFilter === ORDER_TYPE.ALL ||
        order.orderType === orderTypeFilter;

      const searchMatch =
        searchTerm === '' ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.shippingDetails?.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      return statusMatch && typeMatch && searchMatch;
    });
  }, [data, tabValue, orderTypeFilter, searchTerm]);

  const statusCounts = useMemo(() => {
    const counts = {
      [ORDER_STATUS.ALL]: data?.orders?.length || 0,
      [ORDER_STATUS.PENDING]: 0,
      [ORDER_STATUS.CONFIRMED]: 0,
      [ORDER_STATUS.COMPLETED]: 0,
      [ORDER_STATUS.FULFILLED]: 0,
      [ORDER_STATUS.CANCELLED]: 0,
    };

    data?.orders?.forEach((order) => {
      if (order.status in counts) counts[order.status]++;
    });

    return counts;
  }, [data]);

  return {
    orders: data?.orders || [],
    page,
    filteredOrders,
    totalOrders: data?.totalOrders || 0,
    isLoading,
    isError,
    refetch,
    tabValue,
    setTabValue,
    orderTypeFilter,
    setOrderTypeFilter,
    searchTerm,
    setSearchTerm,
    snackbar,
    handleShowSnackbar,
    handleCloseSnackbar,
    statusCounts,
    rowsPerPage,
    setRowsPerPage,
    handleChangePage,
    handleChangeRowsPerPage,
  };
};