import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useGetProductByIdQuery } from '@rentify/storefront/api';
import { useStorefrontWebsite as useWebsiteData } from '@rentify/storefront';
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
  Info,
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
          const availableValue = option.values.find(value => 
            isOptionAvailable(option.name, value.value)
          );
          
          if (availableValue) {
            initialOptions[option.name] = availableValue.value;
          } else if (option.values[0]) {
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

  // Get current price, stock, etc.
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
            className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: valueObj.value }}
            title={valueObj.label || valueObj.value}
          />
        );
      case 'image':
        return valueObj.imageUrl ? (
          <img 
            src={valueObj.imageUrl} 
            alt={valueObj.label || valueObj.value}
            className="w-8 h-8 object-cover rounded-lg"
          />
        ) : (
          <span className="text-sm font-medium">{valueObj.label || valueObj.value}</span>
        );
      case 'size':
        return (
          <span className="text-sm font-medium">{valueObj.label || valueObj.value}</span>
        );
      default:
        return <span className="text-sm font-medium">{valueObj.label || valueObj.value}</span>;
    }
  };

  // Get product features
  const getProductFeatures = () => {
    const baseFeatures = [
      { icon: Shield, text: 'Quality Guaranteed', color: 'text-blue-500' },
      { icon: RotateCcw, text: '30-Day Returns', color: 'text-emerald-500' },
    ];

    const businessType = product?.productType || 'physical';
    
    switch (businessType) {
      case 'physical':
        return [
          ...baseFeatures,
          { icon: Truck, text: 'Free Shipping', color: 'text-orange-500' },
          { icon: Package, text: 'In Stock', color: 'text-primary' },
        ];
      case 'digital':
        return [
          ...baseFeatures,
          { icon: Zap, text: 'Instant Download', color: 'text-purple-500' },
          { icon: Sparkles, text: 'Lifetime Updates', color: 'text-yellow-500' },
        ];
      case 'food':
        return [
          ...baseFeatures,
          { icon: Leaf, text: 'Fresh Ingredients', color: 'text-green-500' },
          { icon: Sparkles, text: 'Premium Quality', color: 'text-yellow-500' },
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
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center shadow-lg">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            {t('product_detail.not_found')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('product_detail.not_found_message')}
          </p>
          <Button 
            variant="default" 
            onClick={() => window.history.back()}
            className="w-full"
          >
            {t('product_detail.back_to_products')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Product Images */}
          <div className="space-y-6">
            {/* Main Image */}
            <Card className="overflow-hidden border bg-card rounded-2xl shadow-lg">
              <CardContent className="p-0">
                <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-background flex items-center justify-center p-4">
                  <motion.img
                    key={selectedImage}
                    src={imageUrls[selectedImage]}
                    alt={product.name}
                    className="max-w-[90%] max-h-[90%] object-contain"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {comparePrice && comparePrice > currentPrice && (
                      <Badge className="bg-red-500 hover:bg-red-600 text-white border-0 shadow-md">
                        Save {Math.round((1 - currentPrice / comparePrice) * 100)}%
                      </Badge>
                    )}
                    {isOutOfStock ? (
                      <Badge variant="secondary" className="border-0 shadow-md">
                        Out of Stock
                      </Badge>
                    ) : isLowStock ? (
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-md">
                        Low Stock
                      </Badge>
                    ) : product.featured ? (
                      <Badge className="bg-primary text-primary-foreground border-0 shadow-md">
                        Featured
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Thumbnails */}
            {imageUrls.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {imageUrls.map((img, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                      selectedImage === index
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${t('product_detail.thumbnail')} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-4">
                {product.Category && (
                  <Badge variant="outline" className="font-medium">
                    {product.Category.name}
                  </Badge>
                )}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => setIsFavorite(!isFavorite)}
                  >
                    <Heart className={`h-4 w-4 transition-colors ${
                      isFavorite ? 'fill-red-500 text-red-500' : ''
                    }`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 leading-tight">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < 4 ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  4.2 • 128 reviews
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-foreground">
                  ${currentPrice}
                </span>
                {comparePrice && comparePrice > currentPrice && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">
                      ${comparePrice}
                    </span>
                    <Badge variant="outline" className="text-red-500 border-red-200">
                      Save ${(comparePrice - currentPrice).toFixed(2)}
                    </Badge>
                  </>
                )}
              </div>
              {hasVariants && selectedVariant && (
                <p className="text-sm text-muted-foreground">
                  SKU: {selectedVariant.sku || 'N/A'}
                </p>
              )}
            </div>

            {/* Options */}
            {productOptions.length > 0 && (
              <div className="space-y-6">
                {productOptions.map((option, index) => {
                  const OptionIcon = getOptionIcon(option.type);
                  return (
                    <div key={option.id || index} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <OptionIcon className="h-4 w-4 text-muted-foreground" />
                          <label className="text-sm font-semibold text-foreground">
                            {option.name}
                          </label>
                        </div>
                        {option.required && (
                          <span className="text-xs text-muted-foreground">Required</span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((valueObj, valueIndex) => {
                          const isSelected = selectedOptions[option.name] === valueObj.value;
                          const isAvailable = isOptionAvailable(option.name, valueObj.value);
                          
                          return (
                            <motion.button
                              key={valueIndex}
                              whileHover={{ scale: isAvailable ? 1.02 : 1 }}
                              whileTap={{ scale: isAvailable ? 0.98 : 1 }}
                              onClick={() => handleOptionChange(option.name, valueObj.value)}
                              disabled={!isAvailable}
                              className={`
                                relative px-4 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200
                                ${isSelected 
                                  ? 'border-primary bg-primary/10 text-primary' 
                                  : 'border-border hover:border-primary/50 hover:bg-primary/5'
                                }
                                ${!isAvailable 
                                  ? 'opacity-40 cursor-not-allowed' 
                                  : 'cursor-pointer'
                                }
                                ${option.type === 'color' ? 'p-0 w-10 h-10 rounded-full' : ''}
                              `}
                              title={!isAvailable ? 'Out of stock' : valueObj.label || valueObj.value}
                            >
                              {renderOptionValue(option, valueObj)}
                              {isSelected && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                </div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stock Status */}
            <div className="space-y-4">
              {isOutOfStock ? (
                <Alert variant="destructive" className="rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Out of Stock</AlertTitle>
                  <AlertDescription>
                    This product is currently unavailable.
                  </AlertDescription>
                </Alert>
              ) : isLowStock ? (
                <Alert className="bg-amber-50 border-amber-200 text-amber-800 rounded-lg">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Low Stock Alert</AlertTitle>
                  <AlertDescription>
                    Only {stockQuantity} left in stock — order soon!
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">
                    {!trackInventory ? 'In Stock' : stockQuantity > 10 ? 'In Stock' : `Only ${stockQuantity} left`}
                  </span>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              {productFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={`p-2 rounded-lg bg-white ${feature.color}`}>
                    <feature.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Actions */}
            <div className="space-y-6">
              {/* Quantity */}
              {product.productType !== 'subscription' && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Quantity</p>
                  <div className="flex items-center w-fit rounded-lg border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-r-none border-r"
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="h-11 w-14 flex items-center justify-center">
                      <span className="font-semibold">{quantity}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-l-none border-l"
                      onClick={incrementQuantity}
                      disabled={isOutOfStock || (trackInventory && !allowBackorders && quantity >= stockQuantity)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 h-12 text-base font-semibold"
                  onClick={handleAddToCartClick}
                  disabled={isOutOfStock || (hasVariants && !selectedVariant)}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add to Cart
                </Button>
                <Button
                  size="lg"
                  className="flex-1 h-12 text-base font-semibold from-primary to-primary-light"
                  onClick={handleBuyNow}
                  disabled={isOutOfStock || (hasVariants && !selectedVariant)}
                >
                  <Zap className="mr-2 h-5 w-5" />
                  Buy Now
                </Button>
              </div>

              {product.productType === 'subscription' && (
                <div className="text-center text-sm text-muted-foreground">
                  This is a subscription product that will auto-renew
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Information Tabs */}
        <div className="mt-16">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full bg-transparent border-b rounded-none p-0 h-14 gap-8">
              <TabsTrigger 
                value="description" 
                className="relative px-1 h-full data-[state=active]:text-primary data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:w-full data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary"
              >
                Description
              </TabsTrigger>
              <TabsTrigger 
                value="specifications" 
                className="relative px-1 h-full data-[state=active]:text-primary data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:w-full data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary"
              >
                Specifications
              </TabsTrigger>
              {product.productType === 'physical' && (
                <TabsTrigger 
                  value="shipping" 
                  className="relative px-1 h-full data-[state=active]:text-primary data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:w-full data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary"
                >
                  Shipping & Returns
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="description" className="pt-8">
              <div className="max-w-3xl">
                <h3 className="text-xl font-semibold text-foreground mb-4">Product Details</h3>
                <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
                  {product.description || 'No description available.'}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="specifications" className="pt-8">
              <div className="max-w-3xl">
                <h3 className="text-xl font-semibold text-foreground mb-6">Specifications</h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground mb-3">Product Information</h4>
                    <dl className="space-y-3">
                      {[
                        { label: 'SKU', value: selectedVariant?.sku || product.sku || 'N/A' },
                        { label: 'Type', value: product.productType },
                        { label: 'Status', value: product.status },
                        ...(product.tags?.length > 0 ? [{ label: 'Tags', value: product.tags.join(', ') }] : [])
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between py-2 border-b">
                          <dt className="text-muted-foreground">{item.label}</dt>
                          <dd className="font-medium text-foreground">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  
                  {product.nicheAttributes && Object.keys(product.nicheAttributes).length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-foreground mb-3">Additional Details</h4>
                      <dl className="space-y-3">
                        {Object.entries(product.nicheAttributes).map(([key, value]) => (
                          value && (
                            <div key={key} className="flex justify-between py-2 border-b">
                              <dt className="text-muted-foreground capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </dt>
                              <dd className="font-medium text-foreground">
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
              <TabsContent value="shipping" className="pt-8">
                <div className="max-w-3xl">
                  <h3 className="text-xl font-semibold text-foreground mb-6">Shipping & Returns</h3>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-foreground mb-3">Shipping Information</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-muted-foreground">Standard Shipping</span>
                          <span className="font-medium text-foreground">Free</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-muted-foreground">Express Shipping</span>
                          <span className="font-medium text-foreground">$9.99</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-muted-foreground">Processing Time</span>
                          <span className="font-medium text-foreground">1-2 business days</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold text-foreground mb-3">Return Policy</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>30-day return policy</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>Free returns for defective items</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>Original packaging required</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Snackbars */}
      <AnimatePresence>
        {snackbarOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl shadow-xl p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-900">Added to Cart</p>
                <p className="text-sm text-emerald-700">Item successfully added to your cart</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shareSnackbarOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-xl p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <p className="font-medium text-blue-900">Link copied to clipboard</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <DialogTitle className="text-center text-xl text-foreground">
              Added to Cart
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Your item has been added to the cart. Would you like to proceed to checkout?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              className="h-11"
            >
              Continue Shopping
            </Button>
            <Button
              onClick={() => window.location.href = '/checkout'}
              className="h-11 bg-gradient-to-r from-primary to-primary-light"
            >
              Checkout Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ProductDetailSkeleton = () => {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <Skeleton className="w-24 h-10 mb-8 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Images Skeleton */}
        <div className="space-y-6">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        </div>
        
        {/* Details Skeleton */}
        <div className="space-y-8">
          <div className="space-y-4">
            <Skeleton className="w-24 h-6 rounded" />
            <Skeleton className="w-full h-10 rounded" />
            <div className="flex gap-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="w-16 h-4 rounded" />
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Skeleton className="w-32 h-8 rounded" />
            <Skeleton className="w-24 h-4 rounded" />
          </div>
          
          {/* Options Skeleton */}
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="w-32 h-5 rounded" />
              <div className="flex gap-2">
                {[...Array(4)].map((_, j) => (
                  <Skeleton key={j} className="w-20 h-10 rounded" />
                ))}
              </div>
            </div>
          ))}
          
          <Skeleton className="w-full h-24 rounded-lg" />
          
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          
          <Separator />
          
          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="w-24 h-5 rounded" />
              <div className="flex w-fit rounded-lg border">
                <Skeleton className="h-11 w-11 rounded-l-lg" />
                <Skeleton className="h-11 w-14" />
                <Skeleton className="h-11 w-11 rounded-r-lg" />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Skeleton className="flex-1 h-12 rounded-lg" />
              <Skeleton className="flex-1 h-12 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs Skeleton */}
      <div className="mt-16 space-y-8">
        <div className="flex gap-8">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="w-32 h-4 rounded" />
          ))}
        </div>
        <Skeleton className="w-full h-64 rounded-lg" />
      </div>
    </div>
  );
};

export default ProductDetail;
