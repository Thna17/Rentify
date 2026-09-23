import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@rentify/shared/ui/avatar';
import { Separator } from '@rentify/shared/ui/separator';
import { useGetMyOrderDetailsQuery } from '@rentify/storefront/api';
import {
  ArrowLeft,
  Download,
  CreditCard,
  MapPin,
  Package,
  CheckCircle,
  Clock,
  Truck,
  X,
  Calendar,
  DollarSign,
  Phone,
  FileText,
  Copy,
  ExternalLink,
  Star,
} from 'lucide-react';
import { useTranslation } from '@rentify/utils/contexts/TranslationContext'; 

const getStatusConfig = (status, t) => {
  switch (status) {
    case 'completed':
      return {
        color: 'bg-success/10 text-success border-success/20',
        icon: CheckCircle,
        label: t('order_status.completed'),
        description: t('order_status.completed_description'),
      };
    case 'pending':
      return {
        color: 'bg-warning/10 text-warning border-warning/20',
        icon: Clock,
        label: t('order_status.pending'),
        description: t('order_status.pending_description'),
      };
    case 'processing':
      return {
        color: 'bg-info/10 text-info border-info/20',
        icon: Truck,
        label: t('order_status.processing'),
        description: t('order_status.processing_description'),
      };
    case 'canceled':
      return {
        color: 'bg-destructive/10 text-destructive border-destructive/20',
        icon: X,
        label: t('order_status.canceled'),
        description: t('order_status.canceled_description'),
      };
    default:
      return {
        color: 'bg-muted/10 text-muted-foreground border-muted/20',
        icon: Package,
        label: t('order_status.unknown'),
        description: t('order_status.unknown_description'),
      };
  }
};

export const CustomerOrderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: order, isLoading, isError } = useGetMyOrderDetailsQuery(id);
  const { t } = useTranslation(); // Get translation functions
  const currentLang = t;

  // Date formatting based on current language
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };

    return date.toLocaleDateString(currentLang, options);
  };

  // Currency formatting
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(currentLang, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 shadow-elegant animate-pulse">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto animate-spin">
              <Package className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">
              {t('order_details.loading')}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 shadow-elegant text-center">
          <CardContent className="space-y-4">
            <X className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">
              {t('order_details.error_loading')}
            </h2>
            <p className="text-muted-foreground">
              {t('common.try_again_later')}
            </p>
            <Button onClick={() => window.location.reload()}>
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status, t);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className=" mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="p-0 h-auto"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t('common.back')}
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                {t('order_details.title')}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className=" mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-8">
            {/* Order Overview */}
            <Card className="hover:shadow-elegant transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-bold flex items-center gap-3">
                      {t('order_details.order_number', {
                        number: order.orderNumber,
                      })}
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                  <Badge
                    className={`${statusConfig.color} border px-4 py-2 flex items-center gap-2 font-medium`}
                  >
                    <StatusIcon className="w-4 h-4" />
                    {statusConfig.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                      <DollarSign className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      {formatCurrency(order.totalAmount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('order_details.total_amount')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center mx-auto">
                      <Package className="w-6 h-6 text-info" />
                    </div>
                    <p className="text-3xl font-bold text-info">
                      {order.items.length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('order_details.items')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto ${
                        order.payment.status === 'paid'
                          ? 'bg-success/10'
                          : 'bg-warning/10'
                      }`}
                    >
                      <CheckCircle
                        className={`w-6 h-6 ${
                          order.payment.status === 'paid'
                            ? 'text-success'
                            : 'text-warning'
                        }`}
                      />
                    </div>
                    <p
                      className={`text-3xl font-bold capitalize ${
                        order.payment.status === 'paid'
                          ? 'text-success'
                          : 'text-warning'
                      }`}
                    >
                      {t(`payment_status.${order.payment.status}`)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('order_details.payment_status')}
                    </p>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('order_details.status_description')}
                  </p>
                  <p className="text-foreground font-medium">
                    {statusConfig.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Products */}
            <Card className="hover:shadow-elegant transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  {t('order_details.products')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {order.items.map((product, index) => (
                  <div key={product.id}>
                    <div className="flex items-center gap-4">
                      <Avatar className="w-20 h-20 border-2 border-background shadow-sm">
                        <AvatarImage
                          src={product.image}
                          alt={product.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {product.name
                            .split(' ')
                            .map((word) => word[0])
                            .join('')
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-semibold text-lg text-foreground">
                          {product.name}
                        </h4>
                        {product.sku && (
                          <p className="text-sm text-muted-foreground">
                            {t('order_details.sku')}: {product.sku}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {t('order_details.quantity')}: {product.quantity}
                        </p>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-warning fill-warning" />
                          <span className="text-sm text-muted-foreground">
                            {t('order_details.rate_product')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-xl font-bold text-foreground">
                          {formatCurrency(product.total)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(product.price)}{' '}
                          {t('order_details.each')}
                        </p>
                      </div>
                    </div>
                    {index < order.items.length - 1 && (
                      <Separator className="mt-6" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card className="hover:shadow-elegant transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  {t('order_details.payment_information')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {t('order_details.payment_method')}
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {order.payment.method}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {t('order_details.amount')}
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {formatCurrency(order.payment.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {t('order_details.payment_id')}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted/50 px-2 py-1 rounded font-mono">
                          {order.payment.id}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full hover:bg-primary/5 transition-colors"
                  onClick={() => navigate(`/payment/${order.id}`)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t('order_details.view_payment_details')}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Shipping Information */}
            <Card className="hover:shadow-elegant transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  {t('order_details.shipping_details')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {t('order_details.customer_name')}
                  </p>
                  <p className="font-semibold text-foreground">
                    {order.shippingDetails.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {t('order_details.contact')}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {order.shippingDetails.phone}
                      </span>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {t('order_details.delivery_address')}
                  </p>
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                    <p className="text-sm text-foreground leading-relaxed">
                      {order.shippingDetails.street}
                      <br />
                      {order.shippingDetails.commune &&
                        `${order.shippingDetails.commune}, `}
                      {order.shippingDetails.district},{' '}
                      {order.shippingDetails.province}
                    </p>
                  </div>
                </div>
                {order.shippingDetails.note && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {t('order_details.delivery_note')}
                    </p>
                    <div className="bg-info/10 border border-info/20 rounded-lg p-3">
                      <p className="text-sm text-info italic">
                        {order.shippingDetails.note}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoice Information */}
            <Card className="hover:shadow-elegant transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {t('order_details.invoice')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {t('order_details.invoice_number')}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted/50 px-2 py-1 rounded font-mono">
                      {order.invoice.number}
                    </code>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {t('common.status')}
                  </p>
                  <Badge className="bg-success/10 text-success border-success/20 capitalize">
                    {order.invoice.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {t('order_details.total')}
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(order.totalAmount)}
                  </p>
                </div>

                <Separator />

                <Button
                  variant="outline"
                  className="w-full hover:bg-primary/5 transition-colors"
                  disabled={!order.invoice.pdfUrl}
                  onClick={() =>
                    order.invoice.pdfUrl &&
                    window.open(order.invoice.pdfUrl, '_blank')
                  }
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('order_details.download_pdf')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerOrderDetail;
