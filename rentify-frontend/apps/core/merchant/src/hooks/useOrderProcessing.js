// hooks/useOrderProcessing.ts
import { useState, useCallback } from 'react';
import {
  useConfirmOrderMutation,
  useCancelOrderMutation,
  useProcessOrderMutation,
  useMarkAsCompleteMutation,
} from '@rentify/apis';
import { useTranslation } from '@rentify/utils';

export const ORDER_ACTIONS = {
  CONFIRM: 'confirm',
  PROCESS: 'process',
  COMPLETE: 'complete',
  CANCEL: 'cancel',
};

export const useOrderProcessing = (order, onShowMessage) => {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(null);
  
  const [confirmOrder] = useConfirmOrderMutation();
  const [processOrder] = useProcessOrderMutation();
  const [completeOrder] = useMarkAsCompleteMutation();
  const [cancelOrder] = useCancelOrderMutation();

  const handleAction = useCallback(async (action, reason) => {
    setIsProcessing(action);
    try {
      switch (action) {
        case ORDER_ACTIONS.CONFIRM:
          await confirmOrder(order.id).unwrap();
          onShowMessage(t('dashboard.order.order_confirmed'), 'success');
          break;
        case ORDER_ACTIONS.PROCESS:
          await processOrder(order.id).unwrap();
          onShowMessage(t('dashboard.order.order_processing'), 'success');
          break;
        case ORDER_ACTIONS.COMPLETE:
          await completeOrder(order.id).unwrap();
          onShowMessage(t('dashboard.order.order_completed'), 'success');
          break;
        case ORDER_ACTIONS.CANCEL:
          if (!reason) {
            reason = prompt(t('dashboard.order.enter_cancellation_reason'));
            if (!reason) {
              setIsProcessing(null);
              return;
            }
          }
          await cancelOrder({ orderId: order.id, reason }).unwrap();
          onShowMessage(t('dashboard.order.order_cancelled'), 'success');
          break;
      }
    } catch (error) {
      onShowMessage(
        t(`dashboard.order.${action}_failed`), 
        'error'
      );
    } finally {
      setIsProcessing(null);
    }
  }, [confirmOrder, processOrder, completeOrder, cancelOrder, order.id, onShowMessage, t]);

  const getAvailableActions = useCallback((order) => {
    const actions = [];
    
    if (!order || !order.status) return actions;
    
    switch (order.status) {
      case 'pending':
        actions.push(ORDER_ACTIONS.CONFIRM);
        actions.push(ORDER_ACTIONS.CANCEL);
        break;
      case 'confirmed':
        actions.push(ORDER_ACTIONS.PROCESS);
        actions.push(ORDER_ACTIONS.CANCEL);
        break;
      case 'processing':
        actions.push(ORDER_ACTIONS.COMPLETE);
        break;
      case 'completed':
      case 'cancelled':
      case 'fulfilled':
        // No actions for final states
        break;
      default:
        // Handle unknown status
        break;
    }
    
    return actions;
  }, []);

  return {
    isProcessing,
    handleAction,
    getAvailableActions,
    ORDER_ACTIONS,
  };
};