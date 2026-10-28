import * as React from 'react';
import {
  IconX,
  IconEdit,
  IconTrash,
  IconEye,
  IconPackage,
  IconTruck,
  IconTrendingUp,
  IconHistory,
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconUser,
  IconShoppingCart,
  IconArrowLeft,
  IconReceipt,
  IconCreditCard,
  IconMapPin,
  IconDownload,
  IconPrinter,
  IconMessage,
  IconRefresh,
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';
import {
  Tooltip,
  TooltipContent,
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
import { Progress } from '@rentify/shared/ui/progress';

import { ORDER_STATUS, ORDER_TYPE } from '../../hooks/useOrderManagement';
import { useGetOrderByIdQuery } from '@rentify/apis';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';

export function OrderDetailView() {
  const { t } = useTranslation();
  const { websiteData } = useThemeService();
  const websiteId = websiteData.websiteId;
  
  const navigate = useNavigate();
  const { id } = useParams();

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useGetOrderByIdQuery( id );

//   const [updateOrder] = useUpdateOrderMutation();

  const [isEditing, setIsEditing] = React.useState(false);
  const [editedOrder, setEditedOrder] = React.useState({});
  const [activeTab, setActiveTab] = React.useState('overview');

  // Initialize edited order when order changes
  React.useEffect(() => {
    if (order) {
      setEditedOrder(order);
    }
  }, [order]);

  const handleSave = async () => {
    try {
      await updateOrder({
        websiteId,
        orderId: order.id,
        updates: editedOrder,
      }).unwrap();
      setIsEditing(false);
      toast.success(t('dashboard.order_detail.saved_successfully'));
    } catch (error) {
      toast.error(t('dashboard.order_detail.save_failed'));
    }
  };

  const handleCancelEdit = () => {
    setEditedOrder(order);
    setIsEditing(false);
  };

  const handleFieldChange = (field, value) => {
    setEditedOrder((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateOrder({
        websiteId,
        orderId: order.id,
        updates: { status: newStatus },
      }).unwrap();
      toast.success(t('dashboard.order_detail.status_updated'));
    } catch (error) {
      toast.error(t('dashboard.order_detail.status_update_failed'));
    }
  };

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      [ORDER_STATUS.PENDING]: {
        label: t('dashboard.order.pending'),
        variant: 'warning',
        className: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
      },
      [ORDER_STATUS.CONFIRMED]: {
        label: t('dashboard.order.confirmed'),
        variant: 'default',
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
      },
      [ORDER_STATUS.PROCESSING]: {
        label: t('dashboard.order.processing'),
        variant: 'default',
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
      },
      [ORDER_STATUS.COMPLETED]: {
        label: t('dashboard.order.completed'),
        variant: 'success',
        className: 'bg-green-100 text-green-800 hover:bg-green-100',
      },
      [ORDER_STATUS.FULFILLED]: {
        label: t('dashboard.order.fulfilled'),
        variant: 'success',
        className: 'bg-green-100 text-green-800 hover:bg-green-100',
      },
      [ORDER_STATUS.CANCELLED]: {
        label: t('dashboard.order.cancelled'),
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
      <Badge variant={config.variant} className={`ml-2 ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  const PaymentStatusBadge = ({ status }) => {
    const paymentConfig = {
      paid: {
        label: t('dashboard.order.paid'),
        variant: 'success',
        className: 'bg-green-100 text-green-800',
      },
      pending: {
        label: t('dashboard.order.pending'),
        variant: 'warning',
        className: 'bg-amber-100 text-amber-800',
      },
      failed: {
        label: t('dashboard.order.failed'),
        variant: 'destructive',
        className: 'bg-red-100 text-red-800',
      },
      refunded: {
        label: t('dashboard.order.refunded'),
        variant: 'outline',
        className: 'border-gray-300 text-gray-600',
      },
    };

    const config = paymentConfig[status] || {
      label: status,
      variant: 'outline',
      className: '',
    };

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const OrderProgress = ({ order }) => {
    const statusSteps = [
      { status: ORDER_STATUS.PENDING, label: t('dashboard.order.pending'), icon: IconClock },
      { status: ORDER_STATUS.CONFIRMED, label: t('dashboard.order.confirmed'), icon: IconCheck },
      { status: ORDER_STATUS.PROCESSING, label: t('dashboard.order.processing'), icon: IconPackage },
      { status: ORDER_STATUS.FULFILLED, label: t('dashboard.order.fulfilled'), icon: IconTruck },
      { status: ORDER_STATUS.COMPLETED, label: t('dashboard.order.completed'), icon: IconCheck },
    ];

    const currentStepIndex = statusSteps.findIndex(step => step.status === order.status);
    const progressValue = ((currentStepIndex + 1) / statusSteps.length) * 100;

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <IconReceipt className="h-4 w-4" />
            {t('dashboard.order_detail.order_progress')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressValue} className="h-2" />
          <div className="flex justify-between relative">
            {statusSteps.map((step, index) => {
              const IconComponent = step.icon;
              const isCompleted = index <= currentStepIndex;
              const isActive = index === currentStepIndex;
              
              return (
                <div key={step.status} className="flex flex-col items-center z-10 flex-1">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                    border-2 transition-all duration-300
                    ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
                      'bg-muted border-muted text-muted-foreground'}
                    ${isActive ? 'ring-2 ring-primary ring-offset-2' : ''}
                  `}>
                    {isCompleted ? (
                      <IconCheck className="h-4 w-4" />
                    ) : (
                      <IconComponent className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`
                    text-xs mt-2 text-center max-w-16 leading-tight font-medium
                    ${isCompleted ? 'text-primary' : 'text-muted-foreground'}
                  `}>
                    {step.label}
                  </span>
                </div>
              );
            })}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-10" />
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-60 w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex items-center justify-center p-12">
        <Card className="p-6 max-w-md w-full text-center">
          <IconAlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {t('dashboard.order_detail.error_loading')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t('dashboard.order_detail.error_loading_description')}
          </p>
          <Button onClick={refetch}>
            <IconRefresh className="mr-2 h-4 w-4" />
            {t('common.retry')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header */}
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
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">Order</span>
                  <Input
                    value={editedOrder.id || ''}
                    onChange={(e) => handleFieldChange('id', e.target.value)}
                    className="text-2xl font-bold h-9 border-0 shadow-none focus-visible:ring-1 w-32"
                  />
                </div>
              ) : (
                <h1 className="text-2xl font-semibold">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
              )}
              <StatusBadge status={order.status} />
            </div>
            <p className="text-muted-foreground mt-1">
              {t('dashboard.order_detail.placed_on')}: {new Date(order.orderDate).toLocaleString()} • 
              {t('dashboard.order_detail.type')}: {t(`dashboard.order.${order.orderType}`)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <IconPrinter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('dashboard.order_detail.print_invoice')}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <IconDownload className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('dashboard.order_detail.export')}</p>
            </TooltipContent>
          </Tooltip>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave}>{t('common.save')}</Button>
            </>
          ) : (
            <Button variant="default" onClick={() => setIsEditing(true)} className="h-9">
              <IconEdit className="h-4 w-4 mr-2" />
              {t('common.edit')}
            </Button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        {order.status === ORDER_STATUS.PENDING && (
          <Button onClick={() => handleStatusChange(ORDER_STATUS.CONFIRMED)}>
            <IconCheck className="h-4 w-4 mr-2" />
            {t('dashboard.order_detail.confirm_order')}
          </Button>
        )}
        {order.status === ORDER_STATUS.CONFIRMED && (
          <Button onClick={() => handleStatusChange(ORDER_STATUS.PROCESSING)}>
            <IconPackage className="h-4 w-4 mr-2" />
            {t('dashboard.order_detail.start_processing')}
          </Button>
        )}
        {order.status === ORDER_STATUS.PROCESSING && (
          <Button onClick={() => handleStatusChange(ORDER_STATUS.FULFILLED)}>
            <IconTruck className="h-4 w-4 mr-2" />
            {t('dashboard.order_detail.mark_fulfilled')}
          </Button>
        )}
        {order.status === ORDER_STATUS.FULFILLED && (
          <Button onClick={() => handleStatusChange(ORDER_STATUS.COMPLETED)}>
            <IconCheck className="h-4 w-4 mr-2" />
            {t('dashboard.order_detail.complete_order')}
          </Button>
        )}
        {order.status !== ORDER_STATUS.CANCELLED && order.status !== ORDER_STATUS.COMPLETED && (
          <Button variant="destructive" onClick={() => handleStatusChange(ORDER_STATUS.CANCELLED)}>
            <IconX className="h-4 w-4 mr-2" />
            {t('dashboard.order_detail.cancel_order')}
          </Button>
        )}
        <Button variant="outline">
          <IconMessage className="h-4 w-4 mr-2" />
          {t('dashboard.order_detail.contact_customer')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="mb-4">
          <TabsList className="w-full justify-start h-11 bg-muted/50">
            <TabsTrigger value="overview" className="flex-1 data-[state=active]:bg-background">
              {t('dashboard.order_detail.overview')}
            </TabsTrigger>
            <TabsTrigger value="items" className="flex-1 data-[state=active]:bg-background">
              {t('dashboard.order_detail.items')}
            </TabsTrigger>
            <TabsTrigger value="customer" className="flex-1 data-[state=active]:bg-background">
              {t('dashboard.order_detail.customer')}
            </TabsTrigger>
            <TabsTrigger value="shipping" className="flex-1 data-[state=active]:bg-background">
              {t('dashboard.order_detail.shipping')}
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-1 data-[state=active]:bg-background">
              {t('dashboard.order_detail.payments')}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 data-[state=active]:bg-background">
              {t('dashboard.order_detail.activity')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="flex-1 overflow-y-auto mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <OrderProgress order={order} />
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <IconTrendingUp className="h-4 w-4" />
                    {t('dashboard.order_detail.order_summary')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        {t('dashboard.order_detail.order_value')}
                      </Label>
                      <div className="text-2xl font-bold text-primary">${order.totalAmount}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        {t('dashboard.order_detail.items')}
                      </Label>
                      <div className="text-2xl font-bold">{order.items?.length || 0}</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold">{order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}</div>
                      <div className="text-xs text-muted-foreground">{t('dashboard.order_detail.total_quantity')}</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">${order.subtotal || order.totalAmount}</div>
                      <div className="text-xs text-muted-foreground">{t('dashboard.order_detail.subtotal')}</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">${order.taxAmount || 0}</div>
                      <div className="text-xs text-muted-foreground">{t('dashboard.order_detail.tax')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <IconUser className="h-4 w-4" />
                    {t('dashboard.order_detail.customer_info')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {order.shippingDetails?.name?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{order.shippingDetails?.name || t('dashboard.order.walk_in_customer')}</div>
                      <div className="text-sm text-muted-foreground">{order.shippingDetails?.email || 'No email'}</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('dashboard.order_detail.phone')}</span>
                      <span>{order.shippingDetails?.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('dashboard.order_detail.order_type')}</span>
                      <Badge variant="outline">{t(`dashboard.order.${order.orderType}`)}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <IconCreditCard className="h-4 w-4" />
                    {t('dashboard.order_detail.payment_info')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t('dashboard.order_detail.status')}</span>
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.order_detail.amount')}</span>
                    <span>${order.totalAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.order_detail.method')}</span>
                    <span>{order.paymentMethod || 'Credit Card'}</span>
                  </div>
                  {order.paymentDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('dashboard.order_detail.paid_on')}</span>
                      <span>{new Date(order.paymentDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="flex-1 overflow-y-auto mt-0">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t('dashboard.order_detail.order_items')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('dashboard.order_detail.product')}</TableHead>
                    <TableHead>{t('dashboard.order_detail.sku')}</TableHead>
                    <TableHead className="text-right">{t('dashboard.order_detail.quantity')}</TableHead>
                    <TableHead className="text-right">{t('dashboard.order_detail.price')}</TableHead>
                    <TableHead className="text-right">{t('dashboard.order_detail.total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                            <IconPackage className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            {item.variant && (
                              <div className="text-sm text-muted-foreground">{item.variant}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="text-xs">
                          {item.sku || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-right">{item.quantity}</TableCell>
                      <TableCell className="py-3 text-right">${item.price}</TableCell>
                      <TableCell className="py-3 text-right font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 space-y-2 max-w-md ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('dashboard.order_detail.subtotal')}</span>
                  <span>${order.subtotal || order.totalAmount}</span>
                </div>
                {order.shippingCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.order_detail.shipping')}</span>
                    <span>${order.shippingCost}</span>
                  </div>
                )}
                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.order_detail.tax')}</span>
                    <span>${order.taxAmount}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>{t('dashboard.order_detail.total')}</span>
                  <span className="text-primary">${order.totalAmount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Tab */}
        <TabsContent value="customer" className="flex-1 overflow-y-auto mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconUser className="h-5 w-5" />
                  {t('dashboard.order_detail.customer_information')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg">
                      {order.shippingDetails?.name?.charAt(0) || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{order.shippingDetails?.name || t('dashboard.order.walk_in_customer')}</h3>
                    <p className="text-muted-foreground">{order.shippingDetails?.email || 'No email'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">{t('dashboard.order_detail.phone')}</Label>
                    <div className="font-medium">{order.shippingDetails?.phone || 'N/A'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">{t('dashboard.order_detail.customer_since')}</Label>
                    <div className="font-medium">
                      {order.customerSince ? new Date(order.customerSince).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t('dashboard.order_detail.notes')}</Label>
                  <Textarea 
                    placeholder={t('dashboard.order_detail.customer_notes_placeholder')}
                    className="min-h-[100px]"
                    value={order.customerNotes || ''}
                    onChange={(e) => handleFieldChange('customerNotes', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconShoppingCart className="h-5 w-5" />
                  {t('dashboard.order_detail.order_history')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.customerOrderHistory?.map((history, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <div className="font-medium">Order #{history.orderId.slice(0, 8)}</div>
                        <div className="text-sm text-muted-foreground">{new Date(history.date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${history.amount}</div>
                        <Badge variant={history.status === 'completed' ? 'success' : 'outline'} className="text-xs">
                          {history.status}
                        </Badge>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      <IconShoppingCart className="h-12 w-12 mx-auto mb-2" />
                      <p>{t('dashboard.order_detail.no_order_history')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Shipping Tab */}
        <TabsContent value="shipping" className="flex-1 overflow-y-auto mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconMapPin className="h-5 w-5" />
                  {t('dashboard.order_detail.shipping_address')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="font-medium">{order.shippingDetails?.name}</div>
                  <div className="text-muted-foreground">
                    {order.shippingDetails?.address}<br />
                    {order.shippingDetails?.city}, {order.shippingDetails?.state} {order.shippingDetails?.zipCode}<br />
                    {order.shippingDetails?.country}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t('dashboard.order_detail.shipping_method')}</Label>
                  <div className="font-medium">{order.shippingMethod || 'Standard Shipping'}</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t('dashboard.order_detail.tracking_number')}</Label>
                  {isEditing ? (
                    <Input 
                      value={order.trackingNumber || ''} 
                      onChange={(e) => handleFieldChange('trackingNumber', e.target.value)}
                      placeholder="Enter tracking number"
                    />
                  ) : (
                    <div className="font-medium">{order.trackingNumber || 'Not provided'}</div>
                  )}
                </div>

                {order.estimatedDelivery && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">{t('dashboard.order_detail.estimated_delivery')}</Label>
                    <div className="font-medium">{new Date(order.estimatedDelivery).toLocaleDateString()}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconTruck className="h-5 w-5" />
                  {t('dashboard.order_detail.shipping_status')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t('dashboard.order_detail.status')}</span>
                    <Badge variant={
                      order.shippingStatus === 'delivered' ? 'success' :
                      order.shippingStatus === 'shipped' ? 'default' :
                      order.shippingStatus === 'in_transit' ? 'warning' : 'outline'
                    }>
                      {order.shippingStatus || 'pending'}
                    </Badge>
                  </div>

                  {order.trackingNumber && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">{t('dashboard.order_detail.tracking_link')}</Label>
                      <Button variant="outline" className="w-full justify-start">
                        <IconEye className="h-4 w-4 mr-2" />
                        {t('dashboard.order_detail.view_tracking')}
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">{t('dashboard.order_detail.shipping_notes')}</Label>
                    <Textarea 
                      placeholder={t('dashboard.order_detail.shipping_notes_placeholder')}
                      className="min-h-[100px]"
                      value={order.shippingNotes || ''}
                      onChange={(e) => handleFieldChange('shippingNotes', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="flex-1 overflow-y-auto mt-0">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t('dashboard.order_detail.payment_details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('dashboard.order_detail.payment_summary')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('dashboard.order_detail.subtotal')}</span>
                      <span>${order.subtotal || order.totalAmount}</span>
                    </div>
                    {order.shippingCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('dashboard.order_detail.shipping')}</span>
                        <span>${order.shippingCost}</span>
                      </div>
                    )}
                    {order.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('dashboard.order_detail.tax')}</span>
                        <span>${order.taxAmount}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>{t('dashboard.order_detail.total')}</span>
                      <span className="text-primary">${order.totalAmount}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('dashboard.order_detail.payment_status')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t('dashboard.order_detail.status')}</span>
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">{t('dashboard.order_detail.payment_method')}</Label>
                      <div className="font-medium">{order.paymentMethod || 'Credit Card'}</div>
                    </div>

                    {order.paymentDate && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">{t('dashboard.order_detail.paid_on')}</Label>
                        <div className="font-medium">{new Date(order.paymentDate).toLocaleString()}</div>
                      </div>
                    )}

                    {order.transactionId && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">{t('dashboard.order_detail.transaction_id')}</Label>
                        <div className="font-mono text-sm">{order.transactionId}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Payment History */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('dashboard.order_detail.payment_history')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('dashboard.order_detail.date')}</TableHead>
                        <TableHead>{t('dashboard.order_detail.description')}</TableHead>
                        <TableHead>{t('dashboard.order_detail.method')}</TableHead>
                        <TableHead className="text-right">{t('dashboard.order_detail.amount')}</TableHead>
                        <TableHead>{t('dashboard.order_detail.status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.paymentHistory?.map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                          <TableCell>{payment.description}</TableCell>
                          <TableCell>{payment.method}</TableCell>
                          <TableCell className="text-right">${payment.amount}</TableCell>
                          <TableCell>
                            <Badge variant={
                              payment.status === 'completed' ? 'success' :
                              payment.status === 'pending' ? 'warning' : 'destructive'
                            }>
                              {payment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {t('dashboard.order_detail.no_payment_history')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="flex-1 overflow-y-auto mt-0">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t('dashboard.order_detail.activity_log')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.activityLog && order.activityLog.length > 0 ? (
                  order.activityLog.map((log, index) => (
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
                    <p>{t('dashboard.order_detail.no_activity')}</p>
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch}>
            <IconRefresh className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button variant="destructive">
            <IconTrash className="mr-2 h-4 w-4" />
            {t('common.delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailView;