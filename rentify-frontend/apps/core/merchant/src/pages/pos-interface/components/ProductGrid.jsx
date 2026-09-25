import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGetAllProductsQuery } from '@rentify/apis';
import { useShopCategories } from '../../../hooks/useShopCategories';
import { useTranslation } from '@rentify/utils';
import { 
  Card,
  CardContent,
} from "@rentify/shared/ui/card";
import { Input } from "@rentify/shared/ui/input";
import { Button } from "@rentify/shared/ui/button";
import { Badge } from "@rentify/shared/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@rentify/shared/ui/select";
import { 
  Search,
  X,
  Grid3X3,
  List,
  SortAsc,
  Package,
  Plus,
  Tag,
  SlidersHorizontal,
  Sparkles,
  Zap,
  TrendingUp,
  Star,
  Eye
} from 'lucide-react';
import { cn } from '@rentify/utils';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';

export function ProductGrid({ onAddToCart, isFullscreen = false, websiteId, storeId }) {
  const { t } = useTranslation();
  const { categories, loading: categoriesLoading } = useShopCategories();
  const containerRef = useRef(null);
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid');
  const [cardSize, setCardSize] = useState('medium');
  const [isMobile, setIsMobile] = useState(false);

  // Data fetching — must be declared before availableCategories useMemo
  const {
    data: productsData,
    isLoading,
    isError,
    refetch,
  } = useGetAllProductsQuery({ 
    websiteId: websiteId || undefined, 
    storeId: websiteId ? undefined : storeId, 
    page: 1, 
    limit: 100, 
    status: 'active' 
  }, {
    skip: !websiteId && !storeId
  });

  const availableCategories = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    const catMap = new Map();
    productsData?.products?.forEach(p => {
      const cat = p.Category || p.category;
      if (cat && typeof cat === 'object' && cat.id && cat.name) {
        catMap.set(String(cat.id), { id: String(cat.id), name: cat.name });
      } else if (typeof cat === 'string' && cat.trim()) {
        catMap.set(cat, { id: cat, name: cat });
      }
    });
    return Array.from(catMap.values());
  }, [categories, productsData?.products]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    if (!productsData?.products) return [];
    
    return productsData.products
      .filter(product => {
        const matchesSearch = 
          product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory =
          selectedCategory === 'all' ||
          product.categoryId === selectedCategory ||
          product.category === selectedCategory ||
          (product.Category && String(product.Category.id) === selectedCategory) ||
          (product.Category && product.Category.name === selectedCategory);
        
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'price-low': return parseFloat(a.price || 0) - parseFloat(b.price || 0);
          case 'price-high': return parseFloat(b.price || 0) - parseFloat(a.price || 0);
          case 'stock': return (b.stockQuantity || 0) - (a.stockQuantity || 0);
          case 'popular': return (b.salesCount || 0) - (a.salesCount || 0);
          case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
          default: return (a.name || '').localeCompare(b.name || '');
        }
      });
  }, [productsData?.products, searchTerm, selectedCategory, sortBy]);

  // Card configurations
  const cardConfigs = {
    small: {
      imageHeight: 'h-28',
      contentPadding: 'p-2.5',
      textSize: 'text-xs',
      buttonSize: 'sm',
      priceSize: 'text-sm font-bold'
    },
    medium: {
      imageHeight: 'h-36',
      contentPadding: 'p-3',
      textSize: 'text-sm',
      buttonSize: 'default',
      priceSize: 'text-base font-bold'
    },
    large: {
      imageHeight: 'h-48',
      contentPadding: 'p-4',
      textSize: 'text-base',
      buttonSize: 'lg',
      priceSize: 'text-lg font-bold'
    }
  };

  const currentConfig = cardConfigs[cardSize];

  // Enhanced Product Card
  const ProductCard = ({ product }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const isLowStock = (product.stockQuantity || 0) <= 5;
    const isOutOfStock = (product.stockQuantity || 0) === 0;

    return (
      <Card 
        onClick={() => !isOutOfStock && onAddToCart(product)}
        className={cn(
          "group relative overflow-hidden border border-border/70 bg-card hover:bg-card/90 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all duration-200 cursor-pointer rounded-xl flex flex-col justify-between",
          isOutOfStock && "opacity-60 cursor-not-allowed hover:border-border/70 hover:shadow-none",
          viewMode === 'list' ? "flex-row items-center p-3 h-24" : "h-full",
          currentConfig.contentPadding
        )}
      >
        {/* Image Container */}
        <div className={cn(
          "relative overflow-hidden rounded-lg bg-muted/60 shrink-0",
          viewMode === 'list' ? "w-18 h-18" : `w-full ${currentConfig.imageHeight}`,
          !imageLoaded && "animate-pulse"
        )}>
          <img
            src={product.images?.[0]?.url || '/api/placeholder/300/300'}
            alt={product.name}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-all duration-300",
              imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
              "group-hover:scale-105"
            )}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.target.src = `data:image/svg+xml;base64,${btoa(`
                <svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="300" height="300" fill="#f8fafc"/>
                  <rect x="100" y="120" width="100" height="60" fill="#e2e8f0"/>
                  <circle cx="150" cy="100" r="20" fill="#e2e8f0"/>
                </svg>
              `)}`;
              setImageLoaded(true);
            }}
          />
          
          {/* Status Badges */}
          <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10">
            {isOutOfStock && (
              <Badge className="bg-destructive text-destructive-foreground text-3xs px-1.5 py-0.5 border-0 shadow-2xs">
                Out of Stock
              </Badge>
            )}
            {isLowStock && !isOutOfStock && (
              <Badge className="bg-amber-500 text-white text-3xs px-1.5 py-0.5 border-0 shadow-2xs">
                {product.stockQuantity} left
              </Badge>
            )}
            {product.salesCount > 100 && (
              <Badge className="bg-emerald-600 text-white text-3xs px-1.5 py-0.5 border-0 shadow-2xs flex items-center gap-0.5">
                <TrendingUp className="h-2.5 w-2.5" />
                Popular
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <CardContent className={cn(
          "relative flex-1 z-10",
          viewMode === 'list' ? "p-0 pl-3" : "p-0 pt-2.5",
          "flex flex-col justify-between"
        )}>
          <div className="space-y-1">
            <h3 className={cn(
              "font-semibold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors",
              currentConfig.textSize
            )}>
              {product.name}
            </h3>
            
            {viewMode === 'list' && product.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {product.description}
              </p>
            )}

            <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
              <span className="truncate">
                {product.Category?.name || 'General'}
              </span>
              {product.sku && (
                <>
                  <span>•</span>
                  <span>SKU: {product.sku}</span>
                </>
              )}
            </div>
          </div>

          {/* Price and Add Button */}
          <div className={cn(
            "flex justify-between items-center pt-2",
            viewMode === 'list' ? "mt-1" : "mt-2 border-t border-border/40"
          )}>
            <div className="flex items-baseline gap-1.5">
              <span className={cn(
                "text-foreground font-mono",
                currentConfig.priceSize
              )}>
                ${parseFloat(product.price || 0).toFixed(2)}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-2xs text-muted-foreground line-through font-mono">
                  ${parseFloat(product.originalPrice || 0).toFixed(2)}
                </span>
              )}
            </div>
            
            <Button
              size="sm"
              disabled={isOutOfStock}
              className={cn(
                "h-7 px-2.5 rounded-lg text-xs font-semibold gap-1",
                isOutOfStock ? "bg-muted text-muted-foreground" : "bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-all"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (!isOutOfStock) onAddToCart(product);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isOutOfStock ? 'Sold Out' : 'Add'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Modern Loading Skeleton
  const ProductSkeleton = () => (
    <Card className={cn(
      "border border-border/70 bg-card shadow-2xs overflow-hidden rounded-xl",
      currentConfig.contentPadding
    )}>
      <div className={cn(
        "relative w-full overflow-hidden bg-muted/60 rounded-lg animate-pulse",
        currentConfig.imageHeight
      )} />
      <CardContent className="p-0 pt-3 space-y-2">
        <div className="h-3.5 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-4 bg-muted rounded animate-pulse w-16" />
          <div className="h-7 w-16 bg-muted rounded-lg animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );

  // Grid Layout
  const GridView = ({ products }) => (
    <div className="p-4 sm:p-5">
      <div 
        className="gap-3.5 grid"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${
            cardSize === 'small' ? '150px' : cardSize === 'medium' ? '190px' : '240px'
          }, 1fr))`
        }}
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );

  // List View
  const ListView = ({ products }) => (
    <div className="p-4 sm:p-5 space-y-2.5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );

  const handleClearSearch = () => setSearchTerm('');

  return (
    <div className="flex flex-col w-full bg-background">
      {/* Search & Control Header Section */}
      <div className={cn(
        "p-4 sm:p-5 bg-background/95 backdrop-blur-xl border-b border-border/80 shadow-2xs space-y-3",
        isFullscreen ? "sticky top-13 z-20" : "sticky top-0 z-20"
      )}>
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            placeholder="Search products by name, SKU, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 h-10 text-sm rounded-xl bg-muted/40 hover:bg-muted/60 focus:bg-background border border-border/80 focus:border-primary transition-all shadow-2xs"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearSearch}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Unified Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Category & Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Dropdown */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-38 sm:w-44 h-8.5 rounded-lg bg-background border border-border/80 text-xs shadow-2xs font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <SelectValue placeholder="All Categories" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    All Categories
                  </div>
                </SelectItem>
                {availableCategories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5" />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-34 sm:w-40 h-8.5 rounded-lg bg-background border border-border/80 text-xs shadow-2xs font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <SortAsc className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Sort by" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="stock">Stock Quantity</SelectItem>
                <SelectItem value="popular">Popularity</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Right: Card Density & View Mode */}
          <div className="flex items-center gap-2">
            <Select value={cardSize} onValueChange={setCardSize}>
              <SelectTrigger className="w-34 sm:w-36 h-8.5 rounded-lg bg-background border border-border/80 text-xs shadow-2xs font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Density" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Compact</SelectItem>
                <SelectItem value="medium">Standard</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/60">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-md text-xs font-medium flex items-center justify-center transition-colors",
                  viewMode === 'grid' ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                )}
                title="Grid View"
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 rounded-md text-xs font-medium flex items-center justify-center transition-colors",
                  viewMode === 'list' ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                )}
                title="List View"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Row */}
        {(searchTerm || selectedCategory !== 'all') && (
          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            <span className="text-2xs text-muted-foreground font-semibold uppercase tracking-wider">Filtered:</span>
            {searchTerm && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-primary/10 text-primary border-primary/20">
                "{searchTerm}"
                <X className="h-3 w-3 cursor-pointer ml-1 hover:text-primary/80" onClick={handleClearSearch} />
              </Badge>
            )}
            {selectedCategory !== 'all' && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                {categories?.find(c => c.id === selectedCategory)?.name || 'Category'}
                <X className="h-3 w-3 cursor-pointer ml-1" onClick={() => setSelectedCategory('all')} />
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground ml-auto"
            >
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* Products Display Area */}
      <div className="w-full" ref={containerRef}>
        {isLoading ? (
          <div className="p-4 sm:p-5">
            <div 
              className="gap-3.5 grid"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${
                  cardSize === 'small' ? '150px' : cardSize === 'medium' ? '190px' : '240px'
                }, 1fr))`
              }}
            >
              {[...Array(12)].map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-80 text-center p-6">
            <div className="p-3 bg-destructive/10 rounded-xl mb-3 text-destructive">
              <Package className="h-10 w-10" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Failed to Load Products</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm">There was an issue loading the product catalog. Please check your connection.</p>
            <Button 
              variant="outline" 
              onClick={refetch}
              size="sm"
              className="rounded-lg border-border"
            >
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Retry Loading
            </Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-center p-6">
            <div className="p-3 bg-muted rounded-xl mb-3 text-muted-foreground">
              <Search className="h-10 w-10" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No Products Found</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm">Try adjusting your search terms or filters to find what you're looking for.</p>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="rounded-lg border-border"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Clear Filters
            </Button>
          </div>
        ) : (
          viewMode === 'grid' ? (
            <GridView products={filteredProducts} />
          ) : (
            <ListView products={filteredProducts} />
          )
        )}

        {/* Results Count Footer */}
        {!isLoading && !isError && filteredProducts.length > 0 && (
          <div className="p-3 text-center text-xs text-muted-foreground border-t border-border/80 bg-background/50">
            <span>Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}</span>
            {searchTerm && <span className="font-medium text-foreground"> for "{searchTerm}"</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductGrid;