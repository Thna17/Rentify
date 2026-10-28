import { useState, useCallback } from 'react';
import {
  useConfirmOrderMutation,
  useCancelOrderMutation,
  useMarkAsCompleteMutation,
} from '@rentify/apis';
import { useTranslation } from '@rentify/utils';

export const ORDER_PROGRESS = {
  ONLINE: [
    { label: 'dashboard.order.order_placed', status: 'pending' },
    { label: 'dashboard.order.confirmed', status: 'confirmed' },
    { label: 'dashboard.order.processing', status: 'processing' },
    { label: 'dashboard.order.completed', status: 'completed' },
  ],
  POS: [
    { label: 'dashboard.order.order_placed', status: 'pending' },
    { label: 'dashboard.order.fulfilled', status: 'fulfilled' },
    { label: 'dashboard.order.completed', status: 'completed' },
  ],
  MANUAL: [
    { label: 'dashboard.order.created', status: 'pending' },
    { label: 'dashboard.order.processing', status: 'processing' },
    { label: 'dashboard.order.completed', status: 'completed' },
  ],
};

export const useOrderRow = (order, onShowMessage) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const [confirmOrder, { isLoading: isConfirming }] = useConfirmOrderMutation();
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();
  const [markAsCompleted, { isLoading: isCompleting }] = useMarkAsCompleteMutation();

  const getCustomStatusSteps = (order) => {
    const baseSteps =
      ORDER_PROGRESS[
        order.orderType === 'pos'
          ? 'POS'
          : order.orderType === 'manual'
          ? 'MANUAL'
          : 'ONLINE'
      ];

    // Clone steps to avoid mutation
    const steps = JSON.parse(JSON.stringify(baseSteps)).map(step => ({
      ...step,
      label: t(step.label),
    }));

    // Special handling for ONLINE orders with KHQR
    if (order.orderType === 'online') {
      // Only keep pending, processing, and completed
      const allowedStatuses = ['pending', 'processing', 'completed'];
      const filteredSteps = steps.filter((step) =>
        allowedStatuses.includes(step.status)
      );

      // Handle KHQR special case
      if (order.paymentMethod === 'KHQR') {
        if (order.status === 'pending' && order.paymentStatus === 'pending') {
          filteredSteps[0].label = t('dashboard.order.waiting_for_payment');
        } else if (
          order.status === 'processing' &&
          order.paymentStatus === 'paid'
        ) {
          filteredSteps[0].label = t('dashboard.order.payment_received');
        }
      }

      return filteredSteps;
    }

    // COD orders (still type 'online' but payment method COD)
    if (order.orderType === 'online' && order.paymentMethod === 'COD') {
      if (order.status === 'confirmed') {
        steps[0].label = t('dashboard.order.confirmed');
      }
    }

    return steps;
  };

  const getActiveStep = (order, steps) => {
    if (order.orderType === 'online') {
      if (order.paymentMethod === 'KHQR') {
        if (order.status === 'pending' && order.paymentStatus === 'pending') {
          return 0; // Waiting for Payment
        }
        if (order.status === 'processing' && order.paymentStatus === 'paid') {
          return 1; // Processing step
        }
      } else if (order.paymentMethod === 'COD') {
        if (order.status === 'confirmed') {
          return 1; // Confirmed
        }
      }
    }

    return steps.findIndex((step) => step.status === order.status);
  };

  const statusSteps = getCustomStatusSteps(order);
  const activeStep = getActiveStep(order, statusSteps);

  const handleConfirm = useCallback(async () => {
    try {
      await confirmOrder(order.id).unwrap();
      onShowMessage(t('dashboard.order.order_confirmed'), 'success');
    } catch (error) {
      onShowMessage(t('dashboard.order.confirm_failed'), 'error');
    }
  }, [confirmOrder, order.id, onShowMessage, t]);

  const handleComplete = useCallback(async () => {
    try {
      await markAsCompleted(order.id).unwrap();
      onShowMessage(t('dashboard.order.order_completed'), 'success');
    } catch (error) {
      onShowMessage(t('dashboard.order.complete_failed'), 'error');
    }
  }, [markAsCompleted, order.id, onShowMessage, t]);

  const handleCancel = useCallback(async () => {
    const reason = prompt(t('dashboard.order.enter_cancellation_reason'));
    if (reason) {
      try {
        await cancelOrder({ orderId: order.id, reason }).unwrap();
        onShowMessage(t('dashboard.order.order_cancelled'), 'success');
      } catch (error) {
        onShowMessage(t('dashboard.order.cancel_failed'), 'error');
      }
    }
  }, [cancelOrder, order.id, onShowMessage, t]);

  return {
    isExpanded,
    toggleExpand: () => setIsExpanded((prev) => !prev),
    showPayment,
    openPayment: () => setShowPayment(true),
    closePayment: () => setShowPayment(false),
    statusSteps,
    activeStep,
    isConfirming,
    isCancelling,
    isCompleting,
    handleConfirm,
    handleComplete,
    handleCancel,
  };
};