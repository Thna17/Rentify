import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  useGetProductByIdQuery 
} from '@rentify/storefront/api';
import { trackStorefrontEvent, useStorefrontWebsite as useWebsiteData } from '@rentify/storefront';
import { useTranslation } from '@rentify/storefront';
import useCart from '@rentify/cart/hooks/useCart';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Heart,
  Share2,
  Star,
  ShoppingCart,
  Zap,
  ChevronDown,
  CheckCircle,
  Leaf,
  Sparkles,
  Shield,
  Truck,
  RotateCcw,
  Minus,
  Plus,
  Package,
  Ruler,
  Palette,
  MoveDiagonal,
  AlertCircle,
} from 'lucide-react';

// Shadcn Components
import { Button } from '@rentify/shared/ui/button';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@rentify/shared/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@rentify/shared/ui/dialog';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Badge } from '@rentify/shared/ui/badge';
import { Separator } from '@rentify/shared/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@rentify/shared/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rentify/shared/ui/select';

const ProductDetail = () => {
  const { id, slug } = useParams();
  const { handleAddToCart } = useCart();
  const { websiteId } = useWebsiteData();
  const { t } = useTranslation();
  const [shareSnackbarOpen, setShareSnackbarOpen] = useState(false);

  const productIdentifier = id || slug;

  const {
    data: product,
    isLoading,
    isError,
    error
  } = useGetProductByIdQuery({ 
    websiteId, 
    productId: id,
    slug: slug 
  }, {
    refetchOnMountOrArgChange: true,
    skip: !websiteId || !productIdentifier
  });

  useEffect(() => {
    if (websiteId && product?.id) trackStorefrontEvent({ name: 'product_view', websiteId, productId: product.id });
  }, [websiteId, product?.id]);

  // Local states
  const [isFavorite, setIsFavorite] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  
  // Variant selection state
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);

  // Get active variants
  const activeVariants = useMemo(() => {
    return product?.ProductVariants?.filter(v => v.status === 'active') || [];
  }, [product]);

  // Get product options
  const productOptions = useMemo(() => {
    return product?.ProductOptions?.sort((a, b) => (a.position || 0) - (b.position || 0)) || [];
  }, [product]);

  // Check if product has variants
  const hasVariants = useMemo(() => {
    return activeVariants.length > 0;
  }, [activeVariants]);

  // Initialize selected options when product loads
  useEffect(() => {
    if (productOptions.length > 0) {
      const initialOptions = {};
      
      productOptions.forEach(option => {
        if (option.values && option.values.length > 0) {
          // Find first available value for this option
          const availableValue = option.values.find(value => 
            isOptionAvailable(option.name, value.value)
          );
          
          if (availableValue) {
            initialOptions[option.name] = availableValue.value;
          } else if (option.values[0]) {
            // Fallback to first value even if not available (will show as disabled)
            initialOptions[option.name] = option.values[0].value;
          }
        }
      });
      
      setSelectedOptions(initialOptions);
    }
  }, [productOptions]);

  // Find matching variant when options change
  useEffect(() => {
    if (hasVariants && Object.keys(selectedOptions).length > 0) {
      const matchingVariant = activeVariants.find(variant => {
        return Object.keys(selectedOptions).every(optionName => {
          return variant.optionValues[optionName] === selectedOptions[optionName];
        });
      });
      
      setSelectedVariant(matchingVariant || null);
    } else if (!hasVariants && product) {
      // If no variants, use base product as the "variant"
      setSelectedVariant({
        id: product.id,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        stockQuantity: product.stockQuantity,
        trackInventory: product.trackInventory,
        allowBackorders: product.allowBackorders,
        optionValues: {},
        images: product.images || []
      });
    }
  }, [selectedOptions, hasVariants, activeVariants, product]);

  // Check if an option value is available
  const isOptionAvailable = (optionName, value) => {
    if (!hasVariants) return true;
    
    const tempOptions = { ...selectedOptions, [optionName]: value };
    
    return activeVariants.some(variant => {
      const matchesOptions = Object.keys(tempOptions).every(key => 
        variant.optionValues[key] === tempOptions[key]
      );
      
      const isInStock = !variant.trackInventory || variant.allowBackorders || variant.stockQuantity > 0;
      
      return matchesOptions && isInStock;
    });
  };

  // Handle option selection
  const handleOptionChange = (optionName, value) => {
    if (!isOptionAvailable(optionName, value)) return;
    
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value
    }));
  };

  // Get current price, stock, etc. based on selected variant
  const currentPrice = selectedVariant?.price || product?.price || 0;
  const comparePrice = selectedVariant?.compareAtPrice || product?.compareAtPrice;
  const stockQuantity = selectedVariant?.stockQuantity ?? product?.stockQuantity ?? 0;
  const trackInventory = selectedVariant?.trackInventory ?? product?.trackInventory ?? true;
  const allowBackorders = selectedVariant?.allowBackorders ?? product?.allowBackorders ?? false;

  const isOutOfStock = trackInventory && stockQuantity <= 0 && !allowBackorders;
  const isLowStock = trackInventory && stockQuantity > 0 && stockQuantity <= 5;

  // Get current images
  const currentImages = useMemo(() => {
    if (selectedVariant?.images?.length > 0) {
      return selectedVariant.images;
    }
    return product?.images || [];
  }, [selectedVariant, product]);

  const imageUrls = currentImages.length > 0 
    ? currentImages.map(img => (typeof img === 'string' ? img : img.url))
    : ['/images/placeholder-product.jpg'];

  // Add to cart handler
  const handleAddToCartClick = async () => {
    if (!product) return;

    try {
      await handleAddToCart({
        productId: product.id,
        variantId: hasVariants ? selectedVariant?.id : undefined,
        quantity: quantity,
        selectedOptions: selectedOptions,
        customizations: {}
      });
      
      setSnackbarOpen(true);
      setTimeout(() => setSnackbarOpen(false), 3000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      // You might want to show an error toast here
    }
  };

  // Buy now handler
  const handleBuyNow = async () => {
    await handleAddToCartClick();
    setDialogOpen(true);
  };

  const handleCloseDialog = () => setDialogOpen(false);
  const handleCloseSnackbar = () => setSnackbarOpen(false);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: t('product_detail.share_text'),
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareSnackbarOpen(true);
        setTimeout(() => setShareSnackbarOpen(false), 3000);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const incrementQuantity = () => {
    if (isOutOfStock) return;
    if (trackInventory && !allowBackorders && quantity >= stockQuantity) return;
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  // Helper functions
  const getOptionIcon = (type) => {
    switch (type) {
      case 'color': return Palette;
      case 'size': return MoveDiagonal;
      case 'text': return Ruler;
      default: return Package;
    }
  };

  const renderOptionValue = (option, valueObj) => {
    switch (option.type) {
      case 'color':
        return (
          <div 
            className="w-6 h-6 rounded-full border border-gray-300"
            style={{ backgroundColor: valueObj.value }}
            title={valueObj.label || valueObj.value}
          />
        );
      case 'image':
        return valueObj.imageUrl ? (
          <img 
            src={valueObj.imageUrl} 
            alt={valueObj.label || valueObj.value}
            className="w-8 h-8 object-cover rounded"
          />
        ) : (
          <span>{valueObj.label || valueObj.value}</span>
        );
      case 'size':
        return (
          <span className="text-xs font-medium">{valueObj.label || valueObj.value}</span>
        );
      default:
        return <span>{valueObj.label || valueObj.value}</span>;
    }
  };

  // Get product features based on type
  const getProductFeatures = () => {
    const baseFeatures = [
      { icon: Shield, text: 'Quality Guaranteed' },
      { icon: RotateCcw, text: '30-Day Return Policy' },
    ];

    const businessType = product?.productType || 'physical';
    
    switch (businessType) {
      case 'physical':
        return [
          ...baseFeatures,
          { icon: Truck, text: 'Free Shipping' },
          { icon: Package, text: 'In Stock' },
        ];
      case 'digital':
        return [
          ...baseFeatures,
          { icon: Zap, text: 'Instant Download' },
          { icon: Sparkles, text: 'Lifetime Updates' },
        ];
      case 'food':
        return [
          ...baseFeatures,
          { icon: Leaf, text: 'Fresh Ingredients' },
          { icon: Sparkles, text: 'Premium Quality' },
        ];
      case 'service':
        return [
          ...baseFeatures,
          { icon: CheckCircle, text: 'Professional Service' },
          { icon: Zap, text: 'Quick Delivery' },
        ];
      case 'subscription':
        return [
          ...baseFeatures,
          { icon: CheckCircle, text: 'Auto-Renewal' },
          { icon: Sparkles, text: 'Cancel Anytime' },
        ];
      default:
        return baseFeatures;
    }
  };

  const productFeatures = getProductFeatures();

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (isError || !product) {
    return (
      <div className="container max-w-6xl py-8 text-center">
        <h2 className="text-2xl font-bold text-[hsl(var(--error))] mb-4">
          {t('product_detail.not_found')}
        </h2>
        <p className="text-lg mb-6 text-muted-foreground">
          {t('product_detail.not_found_message')}
        </p>
        <Button 
          variant="default" 
          onClick={() => window.history.back()}
          className="rounded-[var(--radius)]"
        >
          {t('product_detail.back_to_products')}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container max-w-7xl py-8 px-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-8 rounded-[var(--radius)] flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-6">
            <Card className="overflow-hidden border-0 shadow-[var(--shadow-lg)] rounded-2xl">
              <CardContent className="p-0">
                <div className="w-full h-[500px] flex items-center justify-center bg-[hsl(var(--muted))] relative">
                  <motion.img
                    key={selectedImage}
                    src={imageUrls[selectedImage]}
                    alt={product.name}
                    className="max-w-[80%] max-h-[80%] object-contain"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {comparePrice && comparePrice > currentPrice && (
                      <Badge variant="destructive" className="py-1 px-3 font-bold text-sm rounded-[var(--radius)]">
                        {Math.round((1 - currentPrice / comparePrice) * 100)}% OFF
                      </Badge>
                    )}
                    {isOutOfStock && (
                      <Badge variant="secondary" className="py-1 px-3 font-bold text-sm rounded-[var(--radius)]">
                        Out of Stock
                      </Badge>
                    )}
                    {product.feature && (
                      <Badge variant="default" className="py-1 px-3 font-bold text-sm rounded-[var(--radius)] bg-primary text-primary-foreground">
                        Featured
                      </Badge>
                    )}
                    {product.productType === 'digital' && (
                      <Badge variant="outline" className="py-1 px-3 font-bold text-sm rounded-[var(--radius)]">
                        Digital
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Thumbnail Images */}
            {imageUrls.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {imageUrls.map((img, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="cursor-pointer"
                  >
                    <img
                      src={img}
                      alt={`${t('product_detail.thumbnail')} ${index + 1}`}
                      onClick={() => setSelectedImage(index)}
                      className={`w-full aspect-square object-cover rounded-xl transition-[var(--transition-smooth)] ${
                        selectedImage === index
                          ? 'ring-2 ring-primary ring-offset-2'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              {product.Category && (
                <Badge variant="secondary" className="font-semibold text-sm py-1 px-3 rounded-[var(--radius)]">
                  {product.Category.name}
                </Badge>
              )}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsFavorite(!isFavorite)}
                >
                  {isFavorite ? (
                    <Heart className="h-5 w-5 fill-[hsl(var(--error))] text-[hsl(var(--error))]" />
                  ) : (
                    <Heart className="h-5 w-5" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground"
                  onClick={handleShare}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {product.name}
            </h1>

            {/* Price Display */}
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <h3 className="text-3xl font-bold text-foreground mr-3">
                  ${currentPrice}
                </h3>
                {comparePrice && comparePrice > currentPrice && (
                  <span className="text-muted-foreground line-through text-lg">
                    ${comparePrice}
                  </span>
                )}
              </div>
              {hasVariants && selectedVariant && (
                <div className="text-sm text-muted-foreground">
                  SKU: {selectedVariant.sku || 'N/A'}
                </div>
              )}
            </div>

            {/* Product Options */}
            {productOptions.length > 0 && (
              <div className="space-y-4 mb-6">
                {productOptions.map((option, index) => {
                  const OptionIcon = getOptionIcon(option.type);
                  return (
                    <div key={option.id || index} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <OptionIcon className="h-4 w-4 text-muted-foreground" />
                        <label className="text-sm font-medium text-foreground">
                          {option.name}
                          {option.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((valueObj, valueIndex) => {
                          const isSelected = selectedOptions[option.name] === valueObj.value;
                          const isAvailable = isOptionAvailable(option.name, valueObj.value);
                          
                          return (
                            <motion.button
                              key={valueIndex}
                              whileHover={{ scale: isAvailable ? 1.05 : 1 }}
                              whileTap={{ scale: isAvailable ? 0.95 : 1 }}
                              onClick={() => handleOptionChange(option.name, valueObj.value)}
                              disabled={!isAvailable}
                              className={`
                                px-3 py-2 text-sm rounded-[var(--radius)] border transition-[var(--transition-smooth)]
                                ${isSelected 
                                  ? 'border-primary bg-primary text-primary-foreground' 
                                  : 'border-border bg-background hover:border-primary'
                                }
                                ${!isAvailable 
                                  ? 'opacity-50 cursor-not-allowed grayscale' 
                                  : 'cursor-pointer'
                                }
                                ${option.type === 'color' ? 'w-10 h-10 rounded-full p-0 flex items-center justify-center' : ''}
                                ${option.type === 'image' ? 'p-1' : ''}
                              `}
                              style={option.type === 'color' ? {
                                backgroundColor: valueObj.value,
                                border: isSelected ? '2px solid hsl(var(--primary))' : '2px solid transparent'
                              } : {}}
                              title={!isAvailable ? 'Out of stock' : valueObj.label || valueObj.value}
                            >
                              {renderOptionValue(option, valueObj)}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Variant Selection Info */}
            {hasVariants && selectedVariant && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Selected Variant:</span>
                  <span className="text-sm text-muted-foreground">
                    {Object.entries(selectedVariant.optionValues || {})
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* Stock Information */}
            <div className="mb-6">
              {isOutOfStock ? (
                <Alert variant="destructive" className="rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Out of Stock</AlertTitle>
                  <AlertDescription>
                    This product is currently unavailable.
                  </AlertDescription>
                </Alert>
              ) : isLowStock ? (
                <Alert className="bg-amber-50 border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Low Stock</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Only {stockQuantity} left in stock - order soon!
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="text-[hsl(var(--success))] font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {!trackInventory ? 'In Stock' : stockQuantity > 10 ? 'In Stock' : `Only ${stockQuantity} left`}
                </div>
              )}
            </div>

            {/* Product Features */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {productFeatures.map((feature, index) => (
                <div key={index} className="flex items-center text-sm text-muted-foreground">
                  <feature.icon className="h-4 w-4 mr-2 text-primary" />
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>

            <Separator className="my-6" />

            {/* Quantity Selector and Actions */}
            <div className="space-y-6">
              {/* Quantity Selector */}
              {product.productType !== 'subscription' && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Quantity</p>
                  <div className="flex items-center w-32">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-r-none rounded-l-[var(--radius)]"
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="h-10 w-12 flex items-center justify-center border-y border-border">
                      <span className="font-medium">{quantity}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-l-none rounded-r-[var(--radius)]"
                      onClick={incrementQuantity}
                      disabled={isOutOfStock || (trackInventory && !allowBackorders && quantity >= stockQuantity)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {trackInventory && !allowBackorders && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Maximum: {stockQuantity} units
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="outline"
                  className="flex-1 py-6 text-base font-semibold border-2 rounded-[var(--radius)]"
                  onClick={handleAddToCartClick}
                  disabled={isOutOfStock || (hasVariants && !selectedVariant)}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {t('product_detail.add_to_cart')}
                </Button>

                <Button
                  className="flex-1 py-6 text-base font-semibold bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary text-primary-foreground rounded-[var(--radius)] transition-[var(--transition-smooth)]"
                  onClick={handleBuyNow}
                  disabled={isOutOfStock || (hasVariants && !selectedVariant)}
                >
                  <Zap className="mr-2 h-5 w-5" />
                  {t('product_detail.buy_now')}
                </Button>
              </div>

              {/* Warning if variant not selected */}
              {hasVariants && !selectedVariant && (
                <Alert className="bg-amber-50 border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Please select options</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Choose your preferred variant to continue.
                  </AlertDescription>
                </Alert>
              )}

              {/* Subscription Notice */}
              {product.productType === 'subscription' && (
                <div className="text-sm text-muted-foreground text-center">
                  This is a subscription product that will auto-renew
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Information Tabs */}
        <div className="mt-16">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-14">
              <TabsTrigger 
                value="description" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full px-6 transition-[var(--transition-smooth)]"
              >
                Description
              </TabsTrigger>
              <TabsTrigger 
                value="specifications" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full px-6 transition-[var(--transition-smooth)]"
              >
                Specifications
              </TabsTrigger>
              {product.productType === 'physical' && (
                <TabsTrigger 
                  value="shipping" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full px-6 transition-[var(--transition-smooth)]"
                >
                  Shipping & Returns
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="description" className="pt-8 focus:outline-none">
              <div className="prose max-w-none">
                <h3 className="text-xl font-semibold mb-4 text-foreground">Product Details</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.description || 'No description available.'}
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="specifications" className="pt-8 focus:outline-none">
              <div className="prose max-w-none">
                <h3 className="text-xl font-semibold mb-4 text-foreground">Specifications</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Product Information</h4>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">SKU</dt>
                          <dd className="text-foreground font-medium">{selectedVariant?.sku || product.sku || 'N/A'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Type</dt>
                          <dd className="text-foreground font-medium capitalize">{product.productType}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Status</dt>
                          <dd className="text-foreground font-medium capitalize">{product.status}</dd>
                        </div>
                        {product.tags && product.tags.length > 0 && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Tags</dt>
                            <dd className="text-foreground font-medium">
                              {product.tags.join(', ')}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>
                  
                  {/* Niche-specific attributes */}
                  {product.nicheAttributes && Object.keys(product.nicheAttributes).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Additional Details</h4>
                      <dl className="space-y-2">
                        {Object.entries(product.nicheAttributes).map(([key, value]) => (
                          value && (
                            <div key={key} className="flex justify-between">
                              <dt className="text-muted-foreground capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </dt>
                              <dd className="text-foreground font-medium">
                                {Array.isArray(value) ? value.join(', ') : value}
                              </dd>
                            </div>
                          )
                        ))}
                      </dl>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            {product.productType === 'physical' && (
              <TabsContent value="shipping" className="pt-8 focus:outline-none">
                <div className="prose max-w-none">
                  <h3 className="text-xl font-semibold mb-4 text-foreground">Shipping & Returns</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Shipping Information</h4>
                      <p className="text-muted-foreground">
                        Free standard shipping on all orders. Express shipping available at checkout.
                        Orders are typically processed within 1-2 business days.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Return Policy</h4>
                      <p className="text-muted-foreground">
                        We offer a 30-day return policy for all unused items in original packaging.
                        Return shipping is free for defective items.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Snackbar for Add to Cart */}
      <AnimatePresence>
        {snackbarOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Alert className="bg-green-50 border-green-200 w-auto shadow-[var(--shadow-lg)] rounded-xl">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-800">Added to Cart</AlertTitle>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snackbar for Share */}
      <AnimatePresence>
        {shareSnackbarOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Alert className="bg-green-50 border-green-200 w-auto shadow-[var(--shadow-lg)] rounded-xl">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-800">Link Copied</AlertTitle>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl text-foreground">
              Added to Cart
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Your item has been added to the cart. Would you like to proceed to checkout?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4 sm:justify-center">
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              className="px-8 rounded-[var(--radius)]"
            >
              Continue Shopping
            </Button>
            <Button
              onClick={() => window.location.href = '/checkout'}
              className="px-8 rounded-[var(--radius)] bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary text-primary-foreground"
            >
              Checkout Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Skeleton Loader (keep your existing one)
const ProductDetailSkeleton = () => {
  return (
    <div className="container max-w-7xl py-8 px-4">
      <Skeleton className="w-24 h-10 mb-8 rounded-[var(--radius)]" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-4">
          <Skeleton className="w-full h-[500px] rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="w-1/3 h-8 rounded-[var(--radius)]" />
          <Skeleton className="w-2/3 h-10 rounded-[var(--radius)]" />
          <Skeleton className="w-1/2 h-6 rounded-[var(--radius)]" />
          
          {/* Options Skeletons */}
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-32 h-5 rounded-[var(--radius)]" />
              <div className="flex gap-2">
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className="w-16 h-8 rounded-[var(--radius)]" />
                ))}
              </div>
            </div>
          ))}
          
          <Skeleton className="w-full h-32 rounded-[var(--radius)]" />
          <Skeleton className="w-1/4 h-12 rounded-[var(--radius)]" />
          <div className="pt-6 space-y-4">
            <Skeleton className="w-full h-14 rounded-full" />
            <div className="flex gap-4 justify-center">
              <Skeleton className="w-14 h-14 rounded-full" />
              <Skeleton className="w-14 h-14 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
