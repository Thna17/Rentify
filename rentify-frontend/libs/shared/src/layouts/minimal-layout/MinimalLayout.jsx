// layout/PageLayout.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@rentify/shared/ui/button';
import { Check, ChevronLeft, Circle, ShoppingCart, Shield, Truck, CreditCard } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@rentify/utils/utils'
const MinimalLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [navigationInProgress, setNavigationInProgress] = useState(false);
  
  // Determine if we should show back button
  const showBack = !['/'].includes(location.pathname);
  // Check if we're on cart/checkout pages
  const isCartFlow = ['/cart', '/checkout'].includes(location.pathname);
  
  // Steps configuration
  const steps = [
    { id: 'cart', label: 'Cart', icon: ShoppingCart },
    { id: 'delivery', label: 'Delivery', icon: Truck },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'review', label: 'Review', icon: Check }
  ];


  // Get active step name for label highlighting
  const getActiveStep = () => {
    if (location.pathname === '/cart') return 'cart';
    
    const queryParams = new URLSearchParams(location.search);
    const step = queryParams.get('step');
    
    return step || 'delivery';
  };

  const activeStepIndex = steps.findIndex(step => step.id === getActiveStep());
  const progressPercentage = (activeStepIndex / (steps.length - 1)) * 100;

    const progressState =
  activeStepIndex === steps.length - 1
    ? 'complete'
    : 'active';

  // Custom back navigation handler
  const handleBackNavigation = () => {
    if (navigationInProgress) return;
    
    setNavigationInProgress(true);
    const activeStep = getActiveStep();
    
    // Handle cart flow navigation
    if (isCartFlow) {
      switch(activeStep) {
        case 'delivery':
          navigate('/cart');
          break;
        case 'payment':
          navigate('/checkout?step=delivery');
          break;
        case 'review':
          navigate('/checkout?step=payment');
          break;
        case 'cart':
        default:
          navigate(-1); // Default back behavior for cart
      }
    } 
    // Handle non-cart flow navigation
    else {
      navigate('/'); // Navigate to home for all other pages
    }
    
    // Reset navigation state after a short delay
    setTimeout(() => setNavigationInProgress(false), 300);
  };

  // Reset navigation state when location changes
  useEffect(() => {
    setNavigationInProgress(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with subtle elevation */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full px-4 sm:px-6 py-4 bg-card sticky top-0 z-50 border-b border-border shadow-sm"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackNavigation}
                disabled={navigationInProgress}
                className="rounded-full hover:bg-accent transition-colors group"
                aria-label="Go back"
              >
                <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Button>
            )}
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xl font-bold text-foreground tracking-tight"
            >
              Rentify
            </motion.h1>
          </div>
          
          {isCartFlow && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center bg-muted rounded-lg px-3 py-2 border border-border"
            >
          <div className="bg-primary/15 p-1.5 rounded-full">
  <ShoppingCart className="w-4 h-4 text-primary" />
</div>
              <div className="ml-2">
                <p className="text-sm font-medium text-foreground">Secure Checkout</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Shield className="w-3 h-3 mr-1 text-success" />
                  <span>100% protected transaction</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.header>

      {/* Main content area with subtle background contrast */}
      <main className={`flex-1  py-8 max-w-6xl w-full mx-auto transition-all duration-300 container ${
        isCartFlow ? 'max-w-2xl' : ''
      }`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname} // Include search params in key
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={isCartFlow ? "bg-card rounded-xl shadow-sm p-6 border border-border" : ""}
          >
            {children || <Outlet />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Progress indicator for checkout flow */}
      {isCartFlow && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="px-4 sm:px-6 py-5 bg-card border-t border-border shadow-lg fixed bottom-0 w-full"
        >
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              {/* Progress bar */}
              <div className="overflow-hidden h-2 rounded-full bg-gray-300 mb-4">
   <motion.div
    className={cn(
      "h-full rounded-full transition-colors",
      progressState === 'inactive' && "bg-muted",
      progressState === 'active' &&
        "bg-gradient-to-r from-primary to-primary-light",
      progressState === 'complete' && "bg-primary"
    )}
    initial={{ width: 0 }}
    animate={{ width: `${progressPercentage}%` }}
    transition={{ duration: 0.8, ease: "easeOut" }}
  />

              </div>
              
              {/* Steps indicator */}
              <div className="flex justify-between">
                {steps.map((step, index) => {
                  const isCompleted = index < activeStepIndex;
                  const isActive = index === activeStepIndex;
                  
                  return (
                    <motion.div 
                      key={step.id} 
                      className="flex flex-col items-center relative"
                      whileHover={isCompleted || isActive ? { y: -2 } : {}}
                    >
          
                      {/* Step indicator */}
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
                          isActive 
                            ? 'bg-primary shadow-sm ring-2 ring-primary/20 scale-105' 
                            : isCompleted 
                              ? 'bg-primary shadow-sm' 
                              : 'bg-muted'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4 text-primary-foreground stroke-[3px]" />
                        ) : isActive ? (
                          <step.icon className="w-4 h-4 text-primary-foreground" />
                        ) : (
                          <Circle className="w-2 h-2 text-muted-foreground" fill="currentColor" />
                        )}
                      </div>
                      
                      {/* Step label */}
                      <span 
                        className={`text-xs mt-2 font-medium transition-colors whitespace-nowrap ${
                          isActive 
                            ? 'text-primary font-semibold' 
                            : isCompleted 
                              ? 'text-foreground' 
                              : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Mobile safe area */}
      <div className={`${isCartFlow ? 'h-24' : 'h-4'}`} />
    </div>
  );
};

export default MinimalLayout;
