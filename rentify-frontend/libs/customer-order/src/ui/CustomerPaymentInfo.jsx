import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';
import { Badge } from '@rentify/shared/ui/badge';
import { Button } from '@rentify/shared/ui/button';
import { Separator } from '@rentify/shared/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@rentify/shared/ui/avatar';
import {
  CreditCard,
  QrCode,
  Banknote,
  Calendar,
  Copy,
  Download,
  ExternalLink,
} from 'lucide-react';
import { useGetMyOrderPaymentQuery } from '@rentify/storefront/api';
import { useTranslation } from '@rentify/utils/contexts/TranslationContext';

const getStatusColor = (status) => {
  switch (status) {
    case 'paid':
      return 'bg-success/10 text-success border-success/20';
    case 'pending':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'failed':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-muted/10 text-muted-foreground border-muted/20';
  }
};

export const CustomerPaymentInfo = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  const {
    data: paymentData,
    isLoading,
    isError,
  } = useGetMyOrderPaymentQuery(id);

  const payment = paymentData?.payment;
  const order = paymentData?.order;

  const copyToClipboard = (text) => {
    if (text) {
      navigator.clipboard.writeText(text);
      alert(t('payment.copied'));
    }
  };

  // Translation for payment status
  const translateStatus = (status) => {
    const statusMap = {
      paid: t('payment.status_paid'),
      pending: t('payment.status_pending'),
      failed: t('payment.status_failed'),
    };
    return statusMap[status] || status;
  };

  // Translation for order type
  const translateOrderType = (type) => {
    const typeMap = {
      booking: t('payment.order_type_booking'),
      purchase: t('payment.order_type_purchase'),
    };
    return typeMap[type] || type;
  };

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <CreditCard className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">
            {t('payment.error_loading_payment')}
          </h2>
          <p className="text-muted-foreground">
            {t('payment.try_again_later')}
          </p>
          <Button onClick={() => window.location.reload()}>
            {t('payment.retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 shadow-elegant animate-pulse">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto animate-spin">
              <CreditCard className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="text-muted-foreground">
              {t('payment.loading_payment_details')}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!payment || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <CreditCard className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">
            {t('payment.no_payment_data')}
          </h2>
          <p className="text-muted-foreground">
            {t('payment.no_payment_details')}
          </p>
          <Button onClick={() => navigate(-1)}>{t('payment.go_back')}</Button>
        </div>
      </div>
    );
  }

  const isKHQR = payment.method === 'KHQR';
  const transactionData = payment.transactionData || {};

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="border-b border-border/50">
        <div className=" mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-primary-foreground" />
                  </div>
                  {t('payment.payment_information')}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {t('payment.secure_payment')}
                </p>
              </div>
            </div>
            <Badge
              className={`${getStatusColor(
                payment.status
              )} border font-medium capitalize px-4 py-2`}
            >
              {translateStatus(payment.status)}
            </Badge>
          </div>
        </div>
      </div>

      <div className=" mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Overview */}
            <Card className="hover:shadow-elegant transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Banknote className="w-4 h-4 text-primary" />
                  </div>
                  {t('payment.payment_overview')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Amount Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        {t('payment.total_amount')}
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        ${payment.amount}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-warning/5 to-warning/10 rounded-xl p-6 border border-warning/20">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        {t('payment.currency')}
                      </p>
                      <p className="text-3xl font-bold text-warning">
                        {payment.currency}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-success/5 to-success/10 rounded-xl p-6 border border-success/20">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        {t('payment.order_type')}
                      </p>
                      <p className="text-3xl font-bold text-success capitalize">
                        {translateOrderType(order.orderType)}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Payment Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label className="text-sm text-muted-foreground">
                        {t('payment.payment_id')}
                      </label>
                      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                        <code className="flex-1 text-sm font-mono text-foreground">
                          {payment.id}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(payment.id)}
                          className="h-8 w-8 hover:bg-background"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm text-muted-foreground">
                        {t('payment.transaction_id')}
                      </label>
                      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                        <code className="flex-1 text-sm font-mono text-foreground">
                          {payment.transactionId || t('payment.na')}
                        </code>
                        {payment.transactionId && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              copyToClipboard(payment.transactionId)
                            }
                            className="h-8 w-8 hover:bg-background"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {isKHQR && (
                      <div className="space-y-3">
                        <label className="text-sm text-muted-foreground">
                          {t('payment.md5_hash')}
                        </label>
                        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                          <code className="flex-1 text-sm font-mono text-foreground">
                            {transactionData.md5Hash || t('payment.na')}
                          </code>
                          {transactionData.md5Hash && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                copyToClipboard(transactionData.md5Hash)
                              }
                              className="h-8 w-8 hover:bg-background"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label className="text-sm text-muted-foreground">
                        {t('payment.payment_method')}
                      </label>
                      <div className="p-4 bg-muted/30 rounded-lg border">
                        <p className="font-semibold text-foreground">
                          {payment.method}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm text-muted-foreground">
                        {t('payment.transaction_date')}
                      </label>
                      <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <p className="font-semibold text-foreground">
                          {new Date(payment.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {isKHQR && (
                      <div className="space-y-3">
                        <label className="text-sm text-muted-foreground">
                          {t('payment.raw_qr_data')}
                        </label>
                        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                          <code className="flex-1 text-sm font-mono text-foreground truncate">
                            {transactionData.rawQR || t('payment.na')}
                          </code>
                          {transactionData.rawQR && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                copyToClipboard(transactionData.rawQR)
                              }
                              className="h-8 w-8 hover:bg-background"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Reference */}
            <Card className="hover:shadow-elegant transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-primary" />
                  {t('payment.order_reference')}
                </h3>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/20 to-muted/40 rounded-xl border">
                  <div>
                    <p className="font-semibold text-foreground text-lg">
                      {t('payment.order_number', { number: order.orderNumber })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('payment.click_to_view')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/order/${order.id}`)}
                    className="hover:bg-primary hover:text-primary-foreground"
                  >
                    {t('payment.view_order')}
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* QR Code */}
            {isKHQR && (
              <Card className="hover:shadow-elegant transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <QrCode className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">
                      {t('payment.payment_qr_code')}
                    </h3>
                  </div>

                  <div className="mb-6">
                    <Avatar className="w-48 h-48 mx-auto bg-gradient-to-br from-muted/20 to-muted/40 border-4 border-primary/20">
                      {transactionData.qrCodeUrl ? (
                        <AvatarImage
                          src={transactionData.qrCodeUrl}
                          alt={t('payment.payment_qr_code')}
                        />
                      ) : (
                        <AvatarFallback className="bg-transparent">
                          <QrCode className="w-24 h-24 text-muted-foreground" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {t('payment.scan_qr')}
                  </p>

                  {transactionData.qrCodeUrl && (
                    <Button
                      variant="outline"
                      className="w-full"
                      as="a"
                      href={transactionData.qrCodeUrl}
                      download
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('payment.download_qr')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Breakdown */}
            <Card className="hover:shadow-elegant transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-primary" />
                  {t('payment.order_breakdown')}
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t('payment.subtotal')}
                    </span>
                    <span className="font-medium">${order.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t('payment.discount')}
                    </span>
                    <span className="text-amber-600 font-medium">
                      -${order.discount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t('payment.tax')}
                    </span>
                    <span className="font-medium">${order.tax}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t('payment.shipping_fee')}
                    </span>
                    <span className="font-medium">${order.shippingFee}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base">
                    <span className="font-semibold">{t('payment.total')}</span>
                    <span className="font-bold text-primary">
                      ${order.totalAmount}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPaymentInfo;
