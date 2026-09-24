import React, { useState, useEffect, useRef } from 'react';
import { useTranslation, cn } from '@rentify/utils';
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
  Minimize2,
  LayoutDashboard,
  SplitSquareVertical,
  Phone,
  Store
} from 'lucide-react';
import { PageHeader } from '@rentify/shared/layouts/dashboard/PageHeader';

export const POSInterface = () => {
  const { t } = useTranslation();
  const websiteName = "brathna";
  
  const {
    websiteId,
    storeId,
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
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);
  
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

  // Header Actions Component for Normal View
  const HeaderActions = () => (
    <div className="flex items-center gap-2.5">
      {!isMobile && (
        <Button
          variant={isDualScreen ? "default" : "outline"}
          onClick={() => setIsDualScreen(!isDualScreen)}
          size="sm"
          className="flex items-center gap-2 h-9 text-xs font-medium rounded-lg shadow-2xs"
        >
          <SplitSquareVertical className="h-4 w-4" />
          {isDualScreen ? 'Single View' : 'Dual View'}
        </Button>
      )}

      <Button 
        variant="outline" 
        size="icon"
        onClick={handleToggleFullscreen}
        className="h-9 w-9 rounded-lg shadow-2xs"
        title="Enter Fullscreen"
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
    <div 
      className={cn(
        "flex flex-col bg-background w-full",
        isFullscreen 
          ? "fixed inset-0 z-50 h-screen overflow-y-auto" 
          : "min-h-full"
      )} 
      ref={posRef}
    >
      {/* Fullscreen Mode Top Bar */}
      {isFullscreen ? (
        <div className="h-13 px-4 md:px-6 bg-card border-b border-border/80 flex items-center justify-between shrink-0 shadow-2xs select-none sticky top-0 z-30">
          {/* Left: Store identity & Status */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-2xs">
              <Store className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground tracking-tight">
                {websiteName} POS
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-3xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Register
              </span>
              <span className="hidden md:inline text-xs text-muted-foreground ml-1">
                • {currentTime}
              </span>
            </div>
          </div>

          {/* Center: Tabs Navigation */}
          {!isDualScreen && (
            <div className="flex items-center">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-muted/50 border border-border/60 h-9 p-0.5 rounded-lg flex gap-1">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground text-xs font-medium transition-all"
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                      {tab.badge > 0 && (
                        <Badge className="ml-1 h-4 min-w-4 px-1 flex items-center justify-center text-3xs bg-primary/15 text-primary border-0">
                          {tab.badge}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {!isMobile && (
              <Button
                variant={isDualScreen ? "default" : "outline"}
                onClick={() => setIsDualScreen(!isDualScreen)}
                size="sm"
                className="h-8 text-xs font-medium gap-1.5 rounded-lg"
              >
                <SplitSquareVertical className="h-3.5 w-3.5" />
                <span>{isDualScreen ? 'Single View' : 'Dual View'}</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleFullscreen}
              className="h-8 text-xs font-medium gap-1.5 rounded-lg border-border hover:bg-muted"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exit Fullscreen</span>
            </Button>
          </div>
        </div>
      ) : (
        /* Regular Dashboard Mode */
        <>
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

          {!isDualScreen && (
            <div className="border-b border-border/80 bg-background/95 backdrop-blur-sm px-4 md:px-6 shrink-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-transparent border-0 h-11 p-0 flex gap-6 md:gap-8 justify-start">
                  {tabs.map((tab) => (
                    <TabsTrigger 
                      key={tab.id}
                      value={tab.id}
                      className="relative flex items-center gap-2 h-11 px-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none bg-transparent hover:text-foreground text-muted-foreground font-medium text-sm transition-all"
                    >
                      <tab.icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                      {tab.badge > 0 && (
                        <Badge className="ml-1 h-5 min-w-5 px-1.5 flex items-center justify-center text-2xs bg-primary/10 text-primary border-primary/20">
                          {tab.badge}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}
        </>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col w-full">
        {isDualScreen ? (
          /* Dual Screen Mode */
          <div className="flex-1 flex flex-col xl:flex-row items-start w-full">
            {/* Products Panel - Left */}
            <div className="flex-1 min-w-0 w-full border-r border-border/80">
              <ProductGrid onAddToCart={addToCart} isFullscreen={isFullscreen} />
            </div>

            {/* Cart Panel - Middle */}
            <div className={cn(
              "border-r border-border/80 shrink-0 flex flex-col bg-card/40",
              isMobile ? "w-full border-b" : "w-[340px]",
              !isMobile && (isFullscreen ? "sticky top-13 self-start h-[calc(100vh-3.25rem)] max-h-[calc(100vh-3.25rem)]" : "sticky top-0 self-start h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]")
            )}>
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

            {/* Customer Display - Right */}
            <div className={cn(
              "shrink-0 overflow-y-auto bg-muted/20 p-4",
              isMobile ? "w-full" : "w-[360px] lg:w-[420px]",
              !isMobile && (isFullscreen ? "sticky top-13 self-start h-[calc(100vh-3.25rem)] max-h-[calc(100vh-3.25rem)]" : "sticky top-0 self-start h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]")
            )}>
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
          <div className="flex-1 flex flex-col w-full">
            {activeTab === 'pos' && (
              <div className="flex-1 flex flex-col lg:flex-row items-start w-full">
                {/* Product Catalog Column */}
                <div className="flex-1 min-w-0 w-full">
                  <ProductGrid onAddToCart={addToCart} isFullscreen={isFullscreen} />
                </div>

                {/* Cart Column */}
                <div className={cn(
                  "border-border/80 shrink-0 flex flex-col bg-card/30",
                  isMobile ? "w-full border-t" : "w-[360px] lg:w-[400px] border-l",
                  !isMobile && (isFullscreen ? "sticky top-13 self-start h-[calc(100vh-3.25rem)] max-h-[calc(100vh-3.25rem)]" : "sticky top-0 self-start h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]")
                )}>
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
              <div className="flex-1 w-full p-4 md:p-6 bg-background">
                <OrderHistory orders={orders} />
              </div>
            )}

            {activeTab === 'customer-display' && (
              <div className="flex-1 w-full p-4 md:p-6 bg-background flex items-center justify-center min-h-[500px]">
                <div className="max-w-2xl w-full">
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
              </div>
            )}
          </div>
        )}
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
