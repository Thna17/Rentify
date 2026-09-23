// hooks/useCart.ts - Enhanced with niche support
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useStorefrontWebsite as useWebsiteData } from '@rentify/storefront/website';
import {
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useMergeCartsMutation,
  useGetCartSummaryQuery,
  useUpdateCartItemVariantMutation
} from '@rentify/storefront/api';
import { useAppSelector, useAppDispatch } from '@rentify/storefront/api';
import {
  cartSelectors,
  cartItemsLoaded,
  cartItemUpdated,
  cartItemRemoved,
  selectAllCartItems,
  selectCartSummary,
  selectCartStatus,
  cartUpdated,
  setError,
  clearCartError,
} from '@rentify/apis/slice/cartSlice';
import { useSelector } from 'react-redux';

// Enhanced cart item type
export interface CartItemWithVariant {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  compareAtPrice?: number;
  selectedOptions: Record<string, any>;
  customizations: Record<string, any>;
  Product: {
    id: string;
    name: string;
    slug: string;
    images: Array<{ url: string; alt?: string }>;
    price: number;
    compareAtPrice?: number;
    trackInventory: boolean;
    allowBackorders: boolean;
    stockQuantity: number;
    productType: 'physical' | 'digital' | 'service' | 'food' | 'subscription';
    websiteNiche: string;
    nicheAttributes: Record<string, any>;
    Category?: {
      id: string;
      name: string;
    };
    ProductVariants?: Array<{
      id: string;
      optionValues: Record<string, any>;
      images: Array<{ url: string; alt?: string }>;
      price: number;
      compareAtPrice?: number;
      stockQuantity: number;
      trackInventory: boolean;
      sku: string;
    }>;
  };
  ProductVariant?: {
    id: string;
    optionValues: Record<string, any>;
    images: Array<{ url: string; alt?: string }>;
    price: number;
    compareAtPrice?: number;
    stockQuantity: number;
    trackInventory: boolean;
    sku: string;
  };
  isDemo?: boolean;
}

export interface AddToCartParams {
  productId: string;
  variantId?: string;
  quantity: number;
  selectedOptions?: Record<string, any>;
  customizations?: Record<string, any>;
  price?: number;
}

// Niche-specific cart rules
const NICHE_CART_CONFIG = {
  restaurant: {
    maxQuantity: 20,
    allowQuantityChanges: true,
    showPreparationTime: true,
    customizationsEnabled: true
  },
  fashion: {
    maxQuantity: 10,
    allowQuantityChanges: true,
    showSizeGuide: true,
    customizationsEnabled: false
  },
  skincare: {
    maxQuantity: 5,
    allowQuantityChanges: true,
    showUsageInstructions: true,
    customizationsEnabled: false
  },
  cafe: {
    maxQuantity: 15,
    allowQuantityChanges: true,
    showTemperatureOptions: true,
    customizationsEnabled: true
  },
  ecommerce: {
    maxQuantity: 99,
    allowQuantityChanges: true,
    customizationsEnabled: false
  }
};

export const useCart = () => {
  const { websiteData, websiteId, preview } = useWebsiteData();
  const websiteNiche = websiteData?.niche || 'ecommerce';
  const dispatch = useAppDispatch();

  // Select cart state from Redux
  const cartItems = useAppSelector(cartSelectors.selectAll) as CartItemWithVariant[];
  const updatingItems = useAppSelector((state) => state.cart.updatingItems);
  const removingItems = useAppSelector((state) => state.cart.removingItems);
  const errors = useAppSelector((state) => state.cart.errors);
  const versionConflict = useAppSelector((state) => state.cart.versionConflict);
  const lastFetched = useAppSelector((state) => state.cart.lastFetched);
  const items = useSelector(selectAllCartItems);
  const summary = useSelector(selectCartSummary);
  const status = useSelector(selectCartStatus);

  // API hooks
  const { data, error, isLoading, isSuccess, refetch } = useGetCartQuery(websiteId, {
    skip: !websiteId,
    refetchOnMountOrArgChange: true,
  });

  const { data: cartSummary } = useGetCartSummaryQuery(websiteId, {
    skip: !websiteId,
    pollingInterval: 30000, // Refresh every 30 seconds
  });
  
  const [addToCartMutation] = useAddToCartMutation();
  const [updateCartMutation] = useUpdateCartItemMutation();
  const [removeFromCartMutation] = useRemoveFromCartMutation();
  const [mergeCartsMutation] = useMergeCartsMutation();
  const [updateCartItemVariantMutation] = useUpdateCartItemVariantMutation();

  // Get niche-specific configuration
  const nicheConfig = useMemo(() => 
    NICHE_CART_CONFIG[websiteNiche] || NICHE_CART_CONFIG.ecommerce,
    [websiteNiche]
  );

  // Update cart when data loads
  useEffect(() => {
    if (isSuccess && data) {
      dispatch(
        cartUpdated({
          items: data.items || data.CartItems || [],
          version: data.version || 0,
          totals: data.totals,
          niche: data.niche
        })
      );
    }
  }, [data, isSuccess, dispatch]);

  // Memoized calculations
  const totalQuantity = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );

  const cartCount = useMemo(() => totalQuantity, [totalQuantity]);

    const handleUpdateVariant = useCallback(
    async (itemId: string, variantId: string, selectedOptions: Record<string, any>) => {
      dispatch(clearCartError());

      if (preview) {
        // Handle preview mode variant updates
        const updatedItems = cartItems.map(item => 
          item.id === itemId 
            ? {
                ...item,
                variantId,
                selectedOptions,
                ProductVariant: item.Product.ProductVariants?.find(v => v.id === variantId)
              }
            : item
        );
        dispatch(cartItemsLoaded(updatedItems));
      } else {
        try {
          await updateCartItemVariantMutation({
            websiteId,
            itemId,
            variantId,
            selectedOptions
          }).unwrap();
          
          refetch();
        } catch (error: any) {
          dispatch(setError({ 
            [itemId]: error?.data?.error || 'Failed to update variant' 
          }));
        }
      }
    },
    [preview, updateCartItemVariantMutation, websiteId, cartItems, dispatch, refetch]
  );

  // Enhanced add to cart with niche validation
  const handleAddToCart = useCallback(
    async (params: AddToCartParams) => {
      const { productId, variantId, quantity, selectedOptions = {}, customizations = {} } = params;
      
      dispatch(clearCartError());

      // Validate against niche rules
      if (quantity > nicheConfig.maxQuantity) {
        dispatch(setError({ 
          global: `Maximum quantity per product is ${nicheConfig.maxQuantity}` 
        }));
        return;
      }

      if (Object.keys(customizations).length > 0 && !nicheConfig.customizationsEnabled) {
        dispatch(setError({ 
          global: 'Customizations are not available for this store' 
        }));
        return;
      }

      if (preview) {
        // Handle preview mode with enhanced items
        const staticItem = {
          id: `temp_${Date.now()}`,
          productId,
          variantId,
          quantity,
          unitPrice: params.price || 0,
          selectedOptions,
          customizations,
          Product: {
            id: productId,
            name: 'Demo Product',
            slug: 'demo-product',
            images: [{ url: 'https://via.placeholder.com/150' }],
            price: params.price || 0,
            trackInventory: false,
            allowBackorders: true,
            stockQuantity: 10,
            productType: 'physical',
            websiteNiche,
            nicheAttributes: {},
            Category: { id: '1', name: 'Demo' }
          },
          isDemo: true
        } as CartItemWithVariant;

        dispatch(cartItemsLoaded([...cartItems, staticItem]));
      } else {
        try {
          await addToCartMutation({
            websiteId,
            productId,
            variantId,
            quantity,
            selectedOptions,
            customizations,
          }).unwrap();
          
          refetch();
        } catch (error: any) {
          dispatch(setError({ 
            global: error?.data?.error || 'Failed to add item to cart' 
          }));
          throw error;
        }
      }
    },
    [preview, addToCartMutation, websiteId, cartItems, dispatch, refetch, nicheConfig, websiteNiche]
  );

    const handleRemoveItem = useCallback(
    async (itemId: string) => {
      dispatch(clearCartError());

      if (preview) {
        dispatch(cartItemRemoved(itemId));
      } else {
        try {
          await removeFromCartMutation({ itemId, websiteId }).unwrap();
          refetch();
        } catch (error: any) {
          dispatch(setError({ 
            global: error?.data?.error || 'Failed to remove item from cart' 
          }));
        }
      }
    },
    [preview, removeFromCartMutation, websiteId, dispatch, refetch]
  );
  
  // Enhanced quantity change with niche validation
  const handleQuantityChange = useCallback(
    async (itemId: string, delta: number) => {
      dispatch(clearCartError());

      const item = cartItems.find((i) => i.id === itemId);
      if (!item) return;

      const newQuantity = item.quantity + delta;

      // Validate against niche rules
      if (newQuantity > nicheConfig.maxQuantity) {
        dispatch(setError({ 
          [itemId]: `Maximum quantity is ${nicheConfig.maxQuantity}` 
        }));
        return;
      }

      if (!nicheConfig.allowQuantityChanges) {
        dispatch(setError({ 
          [itemId]: 'Quantity changes are not allowed for this store' 
        }));
        return;
      }

      if (preview) {
        // Handle preview mode
        if (newQuantity < 1) {
          handleRemoveItem(itemId);
          return;
        }

        dispatch(
          cartItemUpdated({ id: itemId, changes: { quantity: newQuantity } })
        );
      } else {
        if (newQuantity < 1) {
          handleRemoveItem(itemId);
          return;
        }

        try {
          await updateCartMutation({
            websiteId,
            itemId,
            quantity: newQuantity,
          }).unwrap();
          
          refetch();
        } catch (error: any) {
          console.error('Update cart error:', error);
          dispatch(setError({ 
            [itemId]: error?.data?.error || 'Failed to update quantity' 
          }));
        }
      }
    },
    [cartItems, preview, updateCartMutation, websiteId, dispatch, refetch, nicheConfig, handleRemoveItem]
  );



  // Enhanced summary calculation with niche considerations
  const calculateSummary = useCallback(() => {
    const subtotal = cartItems.reduce(
      (acc, item) => acc + (item.unitPrice || item.Product.price) * item.quantity,
      0
    );

    // Niche-specific shipping rules
    let shipping = 0;
    const hasPhysicalProducts = cartItems.some(
      item => item.Product.productType === 'physical'
    );

    if (hasPhysicalProducts) {
      switch (websiteNiche) {
        case 'restaurant':
        case 'cafe':
          shipping = 2.99; // Lower shipping for food
          break;
        case 'fashion':
          shipping = 4.99; // Standard shipping
          break;
        default:
          shipping = subtotal > 50 ? 0 : 3.99;
      }
    }

    // Niche-specific tax calculation
    let taxRate = 0.08;
    switch (websiteNiche) {
      case 'restaurant':
      case 'cafe':
        taxRate = 0.05; // Lower tax for food
        break;
      case 'digital':
        taxRate = 0.10; // Higher tax for digital
        break;
    }

    const tax = Number((subtotal * taxRate).toFixed(2));
    const total = (subtotal + shipping + tax).toFixed(2);

    return {
      subtotal: subtotal.toFixed(2),
      shipping: shipping.toFixed(2),
      tax: tax.toFixed(2),
      total,
      itemCount: cartItems.length,
    };
  }, [cartItems, websiteNiche]);

  // Enhanced item helpers
  const isItemInStock = useCallback((item: CartItemWithVariant) => {
    const stockItem = item.ProductVariant || item.Product;
    
    if (!stockItem.trackInventory) return true;
    if (stockItem.allowBackorders) return true;
    
    return stockItem.stockQuantity >= item.quantity;
  }, []);

  const getItemPrice = useCallback((item: CartItemWithVariant) => {
    return item.unitPrice || item.Product.price;
  }, []);

  const getItemImage = useCallback((item: CartItemWithVariant) => {
    const variantImages = item.ProductVariant?.images;
    if (variantImages && variantImages.length > 0) {
      return variantImages[0];
    }
    return item.Product.images[0] || { url: 'https://via.placeholder.com/150' };
  }, []);

  // Enhanced display name with options
  const getItemDisplayName = useCallback((item: CartItemWithVariant) => {
    const baseName = item.Product.name;
    
    if (Object.keys(item.selectedOptions).length > 0) {
      const optionsText = Object.entries(item.selectedOptions)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      return `${baseName} (${optionsText})`;
    }
    
    return baseName;
  }, []);

  // Get item options for display
  const getItemOptions = useCallback((item: CartItemWithVariant) => {
    return Object.entries(item.selectedOptions).map(([key, value]) => ({
      name: key,
      value: value
    }));
  }, []);

  // Get item customizations for display
  const getItemCustomizations = useCallback((item: CartItemWithVariant) => {
    return Object.entries(item.customizations).map(([key, value]) => ({
      name: key,
      value: value
    }));
  }, []);

  // Check if item has discount
  const hasItemDiscount = useCallback((item: CartItemWithVariant) => {
    return item.compareAtPrice && item.compareAtPrice > getItemPrice(item);
  }, [getItemPrice]);

  // Get item discount percentage
  const getItemDiscountPercentage = useCallback((item: CartItemWithVariant) => {
    if (!hasItemDiscount(item) || !item.compareAtPrice) return 0;
    const price = getItemPrice(item);
    return Math.round((1 - price / item.compareAtPrice) * 100);
  }, [hasItemDiscount, getItemPrice]);

  return {
    // Cart data
    cartItems,
    cartCount,
    items,
    summary: calculateSummary(),
    totalQuantity,
    cartSummary,
    
    // Niche information
    websiteNiche,
    nicheConfig,
    
    // Status
    isLoading: isLoading || status === 'loading',
    isError: !!error,
    updatingItems,
    removingItems,
    errors,
    versionConflict,
    
    // Actions
    handleAddToCart,
    handleQuantityChange,
    handleRemoveItem,
    handleUpdateVariant,
    
    // Calculations
    calculateSummary,
    
    // Enhanced helpers
    isItemInStock,
    getItemPrice,
    getItemImage,
    getItemDisplayName,
    getItemOptions,
    getItemCustomizations,
    hasItemDiscount,
    getItemDiscountPercentage,
    
    // Refetch function
    refetchCart: refetch,
  };
};

export default useCart;
