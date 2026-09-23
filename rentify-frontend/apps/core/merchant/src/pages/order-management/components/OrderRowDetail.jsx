import { useState } from 'react';
import { useTranslation } from '@rentify/utils';
import { useOrderProcessing } from '../../../hooks/useOrderProcessing';
import { ORDER_PROGRESS } from '../../../hooks/useOrderRow';
import {
  IconCheck,
  IconClock,
  IconTruck,
  IconPackage,
  IconX,
  IconLoader,
  IconUser,
  IconMail,
  IconPhone,
  IconMapPin,
  IconReceipt2,
  IconChevronDown,
  IconChevronUp,
  IconCalendar,
  IconCreditCard,
  IconTrendingUp,
  IconBox,
  IconSparkles,
} from "@tabler/icons-react";
import { Badge } from "@rentify/shared/ui/badge";
import { Button } from "@rentify/shared/ui/button";
import { Card } from "@rentify/shared/ui/card";
import { Progress } from "@rentify/shared/ui/progress";
import { Separator } from "@rentify/shared/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@rentify/shared/ui/collapsible";

export function OrderRowDetail({ order, onShowMessage, isMobile = false, onActionComplete }) {
  const { t } = useTranslation();
  const { isProcessing, handleAction, getAvailableActions, ORDER_ACTIONS } = 
    useOrderProcessing(order, onShowMessage);
  const [isItemsExpanded, setIsItemsExpanded] = useState(!isMobile);

  const isStepCompleted = (stepStatus, currentStatus) => {
    const statusHierarchy = ['pending', 'confirmed', 'processing', 'completed', 'fulfilled'];
    const currentIndex = statusHierarchy.indexOf(currentStatus);
    const stepIndex = statusHierarchy.indexOf(stepStatus);
    return stepIndex < currentIndex;
  };

  const getStatusSteps = () => {
    const baseSteps = ORDER_PROGRESS[
      order.orderType === 'pos' ? 'POS' : 
      order.orderType === 'manual' ? 'MANUAL' : 'ONLINE'
    ];

    return baseSteps.map(step => ({
      ...step,
      label: t(step.label),
      active: step.status === order.status,
      completed: isStepCompleted(step.status, order.status),
    }));
  };

  const getActionButton = (action) => {
    const config = {
      [ORDER_ACTIONS.CONFIRM]: {
        label: t('dashboard.order.confirm_order'),
        variant: 'default',
        icon: IconCheck,
        gradient: 'from-blue-500 to-blue-600',
      },
      [ORDER_ACTIONS.PROCESS]: {
        label: t('dashboard.order.start_processing'),
        variant: 'default',
        icon: IconTruck,
        gradient: 'from-purple-500 to-purple-600',
      },
      [ORDER_ACTIONS.COMPLETE]: {
        label: t('dashboard.order.mark_complete'),
        variant: 'success',
        icon: IconPackage,
        gradient: 'from-green-500 to-green-600',
      },
      [ORDER_ACTIONS.CANCEL]: {
        label: t('dashboard.order.cancel_order'),
        variant: 'destructive',
        icon: IconX,
        gradient: 'from-red-500 to-red-600',
      },
    };

    const { label, variant, icon: Icon, gradient } = config[action];
    const isLoading = isProcessing === action;

    const handleClick = async () => {
      await handleAction(action);
      onActionComplete?.();
    };

    return (
      <Button
        variant={variant}
        size={isMobile ? "default" : "sm"}
        onClick={handleClick}
        disabled={isLoading}
        className={`whitespace-nowrap flex-1 min-w-[140px] transition-all duration-200 hover:scale-105 ${
          variant === 'default' ? `bg-gradient-to-r ${gradient} text-white border-0 shadow-lg` : ''
        }`}
      >
        {isLoading ? (
          <IconLoader className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Icon className="h-4 w-4 mr-2" />
        )}
        {label}
      </Button>
    );
  };

  const statusSteps = getStatusSteps();
  const availableActions = getAvailableActions(order);
  const progressValue = (statusSteps.findIndex(step => step.active) + 1) / statusSteps.length * 100;
  const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <div className={`space-y-4 ${isMobile ? 'p-1' : 'p-4'}`}>
      {/* Order Overview Stats */}
      <div className="grid grid-cols-3 gap-3 mb-2">
        <div className="text-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mx-auto mb-2">
            <IconTrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">${order.totalAmount}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        
        <div className="text-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg mx-auto mb-2">
            <IconBox className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">{totalItems}</p>
          <p className="text-xs text-gray-500">Units</p>
        </div>
        
        <div className="text-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg mx-auto mb-2">
            <IconReceipt2 className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">
            {order.items?.length || 0}
          </p>
          <p className="text-xs text-gray-500">Items</p>
        </div>
      </div>

      {/* Order Progress with Modern Design */}
      <Card className="p-4 bg-gradient-to-br from-background to-muted/5 border-l-4 border-l-primary rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 bg-primary rounded-lg">
              <IconSparkles className="h-3 w-3 text-white" />
            </div>
            <h4 className="font-semibold text-sm">{t('dashboard.order.order_progress')}</h4>
          </div>
          <Badge variant="outline" className="text-xs bg-white/80 backdrop-blur-sm">
            Step {statusSteps.findIndex(step => step.active) + 1} of {statusSteps.length}
          </Badge>
        </div>
        
        {/* Progress Bar */}
        <Progress value={progressValue} className="h-2 mb-4 bg-gray-200" />
        
        {/* Modern Stepper */}
        <div className="flex justify-between relative">
          {statusSteps.map((step, index) => (
            <div key={step.status} className="flex flex-col items-center z-10 flex-1">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                border-2 transition-all duration-300 shadow-sm
                ${step.completed ? 'bg-green-500 border-green-500 text-white shadow-green-200' : 
                  step.active ? 'bg-primary border-primary text-white shadow-primary-200' : 
                  'bg-white border-gray-300 text-gray-400'}
              `}>
                {step.completed ? (
                  <IconCheck className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className={`
                text-xs mt-2 text-center max-w-16 leading-tight font-medium
                ${step.active ? 'text-primary' : 
                  step.completed ? 'text-green-600' : 'text-gray-500'}
              `}>
                {step.label}
              </span>
            </div>
          ))}
          {/* Connecting line */}
          <div 
            className="absolute top-4 left-0 right-0 h-0.5 bg-gray-300 -z-10 transition-all duration-300"
            style={{ 
              background: `linear-gradient(to right, #10b981 ${progressValue}%, #e5e7eb ${progressValue}%)`
            }}
          />
        </div>
      </Card>

      {/* Order Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Order Items */}
        <Card className="p-4 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm">
          <Collapsible open={isItemsExpanded} onOpenChange={setIsItemsExpanded}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                <h4 className="font-semibold text-sm text-gray-900">
                  {t('dashboard.order.order_items')}
                </h4>
                <Badge variant="secondary" className="ml-2 bg-blue-50 text-blue-700">
                  {order.items?.length || 0}
                </Badge>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg border border-gray-200">
                  {isItemsExpanded ? <IconChevronUp className="h-4 w-4" /> : <IconChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
            
            <CollapsibleContent className="space-y-3">
              {order.items?.map((item, index) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{item.name}</span>
                      <Badge variant="outline" className="text-xs bg-gray-50">× {item.quantity}</Badge>
                    </div>
                    {item.variant && (
                      <span className="text-xs text-gray-500">{item.variant}</span>
                    )}
                  </div>
                  <span className="font-medium text-sm text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              
              <Separator className="my-2" />
              
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('dashboard.order.subtotal')}</span>
                  <span className="font-medium">${order.subtotal || order.totalAmount}</span>
                </div>
                {order.shippingCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('dashboard.order.shipping')}</span>
                    <span className="font-medium">${order.shippingCost}</span>
                  </div>
                )}
                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('dashboard.order.tax')}</span>
                    <span className="font-medium">${order.taxAmount}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold text-base">
                  <span className="text-gray-900">{t('dashboard.order.total')}</span>
                  <span className="text-primary">${order.totalAmount}</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Customer & Shipping Info */}
        <Card className="p-4 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-green-500 rounded-full"></div>
            <h4 className="font-semibold text-sm text-gray-900">
              {t('dashboard.order.customer_info')}
            </h4>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium flex items-center gap-1">
                  <IconUser className="h-3 w-3" />
                  {t('dashboard.order.customer_name')}
                </label>
                <p className="font-medium text-sm text-gray-900">
                  {order.shippingDetails?.name || t('dashboard.order.walk_in_customer')}
                </p>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium flex items-center gap-1">
                  <IconMail className="h-3 w-3" />
                  {t('dashboard.order.email')}
                </label>
                <p className="font-medium text-sm text-gray-900 truncate">
                  {order.shippingDetails?.email || 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium flex items-center gap-1">
                <IconPhone className="h-3 w-3" />
                {t('dashboard.order.phone')}
              </label>
              <p className="font-medium text-sm text-gray-900">
                {order.shippingDetails?.phone || 'N/A'}
              </p>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium flex items-center gap-1">
                <IconMapPin className="h-3 w-3" />
                {t('dashboard.order.shipping_address')}
              </label>
              <div className="font-medium text-sm text-gray-900 space-y-1">
                <p>{order.shippingDetails?.address || 'N/A'}</p>
                {order.shippingDetails?.city && (
                  <p className="text-gray-600 text-xs">
                    {order.shippingDetails.city}, {order.shippingDetails.state} {order.shippingDetails.zipCode}
                  </p>
                )}
                {order.shippingDetails?.country && (
                  <p className="text-gray-600 text-xs">{order.shippingDetails.country}</p>
                )}
              </div>
            </div>

            {/* Order Meta */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium flex items-center gap-1">
                  <IconCalendar className="h-3 w-3" />
                  Order Date
                </label>
                <p className="font-medium text-sm text-gray-900">
                  {new Date(order.orderDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium flex items-center gap-1">
                  <IconCreditCard className="h-3 w-3" />
                  Payment
                </label>
                <Badge variant={
                  order.paymentStatus === 'paid' ? 'success' :
                  order.paymentStatus === 'pending' ? 'warning' :
                  order.paymentStatus === 'failed' ? 'destructive' : 'outline'
                } className="text-xs capitalize">
                  {order.paymentStatus}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      {availableActions.length > 0 && (
        <Card className="p-4 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
            <h4 className="font-semibold text-sm text-gray-900">
              {t('dashboard.order.order_actions')}
            </h4>
          </div>
          
          <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-wrap'}`}>
            {availableActions.map(action => (
              <div key={action} className={isMobile ? 'w-full' : ''}>
                {getActionButton(action)}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}