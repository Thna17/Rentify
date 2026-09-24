import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@rentify/utils';
import { ProductGrid } from './components/ProductGrid';
import { Cart } from './components/Cart';
import { PaymentModal } from './components/PaymentModal';
import { OrderHistory } from './components/OrderHistory';
import { CustomerDisplay } from './components/CustomerDisplay';
import { ReceiptModal } from './components/ReceiptModal';
import usePOS from '../../hooks/usePOS';
import { Badge } from "@rentify/shared/ui/badge";
import { Button } from "@rentify/shared/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@rentify/shared/ui/Tabs";
import { 
  ShoppingCart, 
  Clock, 
  Monitor, 
  Maximize2,
  LayoutDashboard,
  SplitSquareVertical,
  Phone
} from 'lucide-react';
import { PageHeader } from '@rentify/shared/layouts/dashboard/PageHeader';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';

export const POSInterface = () => {
  const { t } = useTranslation();
  // const { getFilteredContent } = useThemeService();
  // const globalSettingContent = getFilteredContent('global setting');
  const websiteName = "brathna"
  
  const {
    activeTab,
    setActiveTab,
    paymentStatus,
    cart,
    cartTotal,
    showPayment,
    setShowPayment,
    showReceipt,
    setShowReceipt,
    currentOrder,
    orders,
    isDualScreen,
    setIsDualScreen,
    isFullscreen,
    showKHQR,
    khqrAmount,
    khqrData,
    posRef,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    handleKHQRPayment,
    handleKHQRComplete,
    handleKHQRCancel,
    handlePaymentComplete,
    handleToggleFullscreen,
  } = usePOS();
  
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  useEffect(() => {
    if (isMobile) {
      setIsDualScreen(false);
    }
  }, [isMobile]);

  // Header Actions Component
  const HeaderActions = () => (
    <div className="flex items-center gap-3">
      {!isMobile && (
        <Button
          variant={isDualScreen ? "default" : "outline"}
          onClick={() => setIsDualScreen(!isDualScreen)}
          size="sm"
          className="flex items-center gap-2 border-border hover:border-input bg-background/80 backdrop-blur-sm"
        >
          <SplitSquareVertical className="h-4 w-4" />
          {isDualScreen ? 'Single View' : 'Dual View'}
        </Button>
      )}

      <Button 
        variant="outline" 
        size="sm"
        onClick={handleToggleFullscreen}
        className="border-border hover:border-input bg-background/80 backdrop-blur-sm"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const tabs = [
    {
      id: 'pos',
      label: t('dashboard.pos.title'),
      icon: ShoppingCart,
      badge: cart.length,
    },
    {
      id: 'orders',
      label: t('dashboard.pos.orders'),
      icon: Clock,
      badge: orders.length,
    },
    {
      id: 'customer-display',
      label: t('dashboard.pos.customer_display'),
      icon: Monitor,
    },
  ];

  return (
    <div className="min-h-full">
      {/* Consistent Page Header */}
      <PageHeader
        title={t('dashboard.pos.pos_system')}
        description={`POS system for ${websiteName}`}
        icon={LayoutDashboard}
        actions={<HeaderActions />}
        breadcrumb={[
          { label: 'Dashboard', href: '/overview' },
          { label: t('dashboard.pos.pos_system') }
        ]}
      />

      {/* Main Content Area */}
      <div className="p-4 md:p-6">
        <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden h-[calc(100vh-200px)]">
          {/* Dual Screen Mode */}
          {isDualScreen ? (
            <div className="flex flex-col md:flex-row h-full">
              {/* Products Panel - Left */}
              <div className="flex-1 flex flex-col border-r border-border">
                <div className="p-4 border-b border-border bg-background/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Products</h3>
                      <p className="text-sm text-muted-foreground">Browse and add items to cart</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <ProductGrid onAddToCart={addToCart} />
                </div>
              </div>

              {/* Cart Panel - Middle */}
              <div className={`${isMobile ? 'w-full' : 'w-96'} border-r border-border bg-background/50`}>
                <Cart
                  items={cart}
                  total={cartTotal}
                  onUpdateItem={updateCartItem}
                  onRemoveItem={removeFromCart}
                  onClearCart={clearCart}
                  onCheckout={() => setShowPayment(true)}
                  isMobile={isMobile}
                  isFullscreen={isFullscreen}
                />
              </div>

              {/* Customer Display Panel - Right */}
              <div className={`${isMobile ? 'w-full' : 'w-1/3'} bg-background/50`}>
                <CustomerDisplay
                  cart={cart}
                  total={cartTotal}
                  showKHQR={showKHQR}
                  khqrAmount={khqrAmount}
                  onKHQRComplete={handleKHQRComplete}
                  onKHQRCancel={handleKHQRCancel}
                  khqrData={khqrData}
                  isMobile={isMobile}
                  paymentStatus={paymentStatus}
                  name={websiteName}
                />
              </div>
            </div>
          ) : (
            /* Single Screen Mode */
            <div className="flex flex-col h-full">
              {/* Tabs Navigation */}
              {isMobile ? (
                <div className="border-b border-border bg-background/60">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3 p-1 bg-muted/50 h-14">
                      {tabs.map((tab) => (
                        <TabsTrigger 
                          key={tab.id}
                          value={tab.id}
                          className="flex flex-col h-full py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary"
                        >
                          <div className="relative">
                            <tab.icon className="h-4 w-4 mx-auto" />
                            {tab.badge > 0 && (
                              <Badge className="absolute -top-2 -right-3 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
                                {tab.badge}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs mt-1 font-medium">{tab.label}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              ) : (
                <div className="border-b border-border bg-background/60">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="flex w-full p-2 bg-muted/50 h-16">
                      {tabs.map((tab) => (
                        <TabsTrigger 
                          key={tab.id}
                          value={tab.id}
                          className="flex items-center gap-3 flex-1 h-full data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary px-4"
                        >
                          <div className="relative">
                            <tab.icon className="h-5 w-5" />
                            {tab.badge > 0 && (
                              <Badge className="absolute -top-2 -right-3 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
                                {tab.badge}
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm font-medium">{tab.label}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              )}

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden bg-background/50">
                {activeTab === 'pos' && (
                  <div className="flex flex-col md:flex-row h-full">
                    <div className="flex-1 p-4 overflow-auto">
                      <ProductGrid onAddToCart={addToCart} />
                    </div>
                    <div className={`${isMobile ? 'w-full border-t' : 'w-96 border-l'} border-border`}>
                      <Cart
                        items={cart}
                        total={cartTotal}
                        onUpdateItem={updateCartItem}
                        onRemoveItem={removeFromCart}
                        onClearCart={clearCart}
                        onCheckout={() => setShowPayment(true)}
                        isMobile={isMobile}
                        isFullscreen={isFullscreen}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div className="p-4 h-full overflow-auto">
                    <OrderHistory orders={orders} />
                  </div>
                )}

                {activeTab === 'customer-display' && (
                  <div className="h-full">
                    <CustomerDisplay
                      cart={cart}
                      total={cartTotal}
                      showKHQR={showKHQR}
                      khqrAmount={khqrAmount}
                      onKHQRComplete={handleKHQRComplete}
                      onKHQRCancel={handleKHQRCancel}
                      khqrData={khqrData}
                      isMobile={isMobile}
                      isOverlay={false}
                      name={websiteName}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile KHQR Overlay */}
      {isMobile && showKHQR && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl">
          <CustomerDisplay
            cart={cart}
            total={cartTotal}
            showKHQR={showKHQR}
            khqrAmount={khqrAmount}
            onKHQRComplete={handleKHQRComplete}
            onKHQRCancel={handleKHQRCancel}
            khqrData={khqrData}
            isMobile={isMobile}
            isOverlay={true}
            name={websiteName}
          />
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          total={cartTotal}
          items={cart}
          onClose={() => setShowPayment(false)}
          onPaymentComplete={handlePaymentComplete}
          isDualScreen={isDualScreen}
          onKHQRPayment={handleKHQRPayment}
          container={posRef.current}
          isFullscreen={isFullscreen}
        />
      )}

      {/* Receipt Modal */}
      {showReceipt && currentOrder && (
        <ReceiptModal
          open={showReceipt}
          onClose={() => setShowReceipt(false)}
          order={currentOrder}
          container={posRef.current}
          name={websiteName}
        />
      )}

      {/* Mobile Indicator */}
      {isMobile && (
        <div className="fixed bottom-4 right-4 z-40 md:hidden">
          <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-full shadow-lg">
            <Phone className="h-4 w-4" />
            <span className="text-sm font-medium">Mobile View</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSInterface;
