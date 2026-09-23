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
  SelectValue,
} from "@rentify/shared/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@rentify/shared/ui/Tabs";
import { Skeleton } from "@rentify/shared/ui/skeleton";
import { ScrollArea } from "@rentify/shared/ui/scroll-area";
import { 
  Search,
  X,
  Grid3X3,
  List,
  Filter,
  SortAsc,
  Package,
  Plus,
  Tag,
  SlidersHorizontal,
  Sparkles,
  Zap,
  TrendingUp,
  Clock,
  Star,
  Eye
} from 'lucide-react';
import { cn } from '@rentify/utils';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';

export function ProductGrid({ onAddToCart }) {
  const { t } = useTranslation();
  const { categories, loading: categoriesLoading } = useShopCategories();
  const containerRef = useRef(null);
  
  // Modern state management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid');
  const [cardSize, setCardSize] = useState('medium');
  const [isMobile, setIsMobile] = useState(false);

  // Data fetching
  const { websiteData } = useThemeService();
  const websiteId = websiteData.websiteId;
  const {
    data: productsData,
    isLoading,
    isError,
    refetch,
  } = useGetAllProductsQuery({ websiteId, page: 1, limit: 100, status: 'active' });

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Enhanced product filtering and sorting
  const filteredProducts = useMemo(() => {
    if (!productsData?.products) return [];
    
    return productsData.products
      .filter(product => {
        const matchesSearch = 
          product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
        
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

  // Modern card configurations
  const cardConfigs = {
    small: {
      imageHeight: 'h-32',
      contentPadding: 'p-3',
      textSize: 'text-xs',
      buttonSize: 'sm',
      priceSize: 'text-sm font-semibold'
    },
    medium: {
      imageHeight: 'h-44',
      contentPadding: 'p-4',
      textSize: 'text-sm',
      buttonSize: 'default',
      priceSize: 'text-lg font-bold'
    },
    large: {
      imageHeight: 'h-56',
      contentPadding: 'p-5',
      textSize: 'text-base',
      buttonSize: 'lg',
      priceSize: 'text-xl font-bold'
    }
  };

  const currentConfig = cardConfigs[cardSize];

  // Enhanced Product Card with modern design
  const ProductCard = ({ product }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const isLowStock = (product.stockQuantity || 0) <= 5;
    const isOutOfStock = (product.stockQuantity || 0) === 0;

    return (
      <Card 
        onClick={() => !isOutOfStock && onAddToCart(product)}
        className={cn(
          "group relative overflow-hidden border-border bg-background shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer",
          "transform hover:-translate-y-1 active:scale-95",
          isOutOfStock && "opacity-60 cursor-not-allowed",
          viewMode === 'list' ? "flex-row items-center p-4 h-28" : "flex-col h-full min-h-[300px]",
          currentConfig.contentPadding
        )}
      >
        {/* Premium gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-muted to-muted opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Image Container */}
        <div className={cn(
          "relative overflow-hidden rounded-xl bg-gradient-to-br from-muted to-muted-foreground",
          viewMode === 'list' ? "w-20 h-20 flex-shrink-0" : `w-full ${currentConfig.imageHeight}`,
          !imageLoaded && "animate-pulse"
        )}>
          <img
            src={product.images?.[0]?.url || '/api/placeholder/300/300'}
            alt={product.name}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-all duration-500",
              imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
              "group-hover:scale-110"
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
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isOutOfStock && (
              <Badge className="bg-destructive/95 text-destructive-foreground text-xs px-2 py-1 border-0 shadow-sm">
                Out of Stock
              </Badge>
            )}
            {isLowStock && !isOutOfStock && (
              <Badge className="bg-warning/95 text-warning-foreground text-xs px-2 py-1 border-0 shadow-sm">
                {product.stockQuantity} left
              </Badge>
            )}
            {product.salesCount > 100 && (
              <Badge className="bg-success/95 text-success-foreground text-xs px-2 py-1 border-0 shadow-sm">
                <TrendingUp className="h-3 w-3 mr-1" />
                Popular
              </Badge>
            )}
          </div>

          {/* Quick Add Button */}
          {!isOutOfStock && (
            <Button
              size="sm"
              className={cn(
                "absolute bottom-2 right-2 rounded-full bg-background/90 backdrop-blur-sm text-foreground",
                "shadow-lg border-0 hover:bg-background hover:scale-110 transform transition-all duration-200",
                "opacity-0 group-hover:opacity-100"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Content */}
        <CardContent className={cn(
          "relative flex-1 z-10",
          viewMode === 'list' ? "p-0 pl-4" : "p-0 pt-4",
          "flex flex-col justify-between"
        )}>
          <div className="space-y-2">
            {/* Product Name */}
            <h3 className={cn(
              "font-semibold text-foreground leading-tight line-clamp-2",
              "group-hover:text-muted-foreground transition-colors",
              currentConfig.textSize
            )}>
              {product.name}
            </h3>
            
            {/* Description (List view only) */}
            {viewMode === 'list' && product.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {product.description}
              </p>
            )}

            {/* Category & SKU */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Tag className="h-3 w-3" />
              <span className="truncate">
                {product.Category?.name || 'Uncategorized'}
              </span>
              {product.sku && (
                <>
                  <span>•</span>
                  <span>SKU: {product.sku}</span>
                </>
              )}
            </div>

            {/* Stats (Grid view only) */}
            {viewMode !== 'list' && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {product.salesCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{product.salesCount} sold</span>
                  </div>
                )}
                {product.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{product.rating}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price and Add Button */}
          <div className={cn(
            "flex justify-between items-center",
            viewMode === 'list' ? "mt-2" : "mt-4"
          )}>
            <div className="flex flex-col">
              <span className={cn(
                "text-foreground",
                currentConfig.priceSize
              )}>
                ${parseFloat(product.price || 0).toFixed(2)}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-xs text-muted-foreground line-through">
                  ${parseFloat(product.originalPrice || 0).toFixed(2)}
                </span>
              )}
            </div>
            
            <Button
              size={currentConfig.buttonSize}
              disabled={isOutOfStock}
              className={cn(
                "rounded-full bg-primary text-primary-foreground",
                "shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200",
                "border-0 hover:bg-primary/90",
                isOutOfStock && "bg-muted cursor-not-allowed"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {isOutOfStock ? 'Out of Stock' : 'Add'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Modern Loading Skeleton
  const ProductSkeleton = () => (
    <Card className={cn(
      "border-border bg-background shadow-sm overflow-hidden",
      currentConfig.contentPadding
    )}>
      <div className={cn(
        "relative w-full overflow-hidden bg-gradient-to-br from-muted to-muted-foreground rounded-xl",
        currentConfig.imageHeight,
        "animate-pulse"
      )} />
      <CardContent className="p-0 pt-4 space-y-3">
        <div className="h-4 bg-muted rounded animate-pulse" />
        <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
        <div className="flex justify-between items-center">
          <div className="h-4 bg-muted rounded animate-pulse w-16" />
          <div className="h-9 w-20 bg-muted rounded-full animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );

  // Enhanced Grid Layout
  const GridView = ({ products }) => (
    <div className="p-6">
      <div 
        className="gap-5 grid"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${
            cardSize === 'small' ? '180px' : cardSize === 'medium' ? '240px' : '300px'
          }, 1fr))`
        }}
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );

  // Enhanced List View
  const ListView = ({ products }) => (
    <div className="p-6 space-y-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );

  // Clear search function
  const handleClearSearch = () => setSearchTerm('');

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Premium Header Section */}
      <div className="sticky top-0 z-40 p-6 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm">
        {/* Enhanced Search Bar */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <Input
            placeholder="Search products, SKU, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-12 h-14 text-lg rounded-2xl bg-background border-2 border-border focus:border-input focus:ring-4 focus:ring-muted shadow-sm"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Enhanced Control Bar */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          {/* Left Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* View Mode Tabs */}
            <Tabs value={viewMode} onValueChange={setViewMode} className="w-auto">
              <TabsList className="bg-muted/80 p-1.5 rounded-2xl backdrop-blur-sm">
                <TabsTrigger value="grid" className="flex items-center gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Grid3X3 className="h-4 w-4" />
                  <span className="text-sm font-medium">Grid</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <List className="h-4 w-4" />
                  <span className="text-sm font-medium">List</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Card Size Selector */}
            <Select value={cardSize} onValueChange={setCardSize}>
              <SelectTrigger className="w-48 h-10 rounded-xl bg-background border-2 border-border shadow-sm">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="View Size" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small" className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-muted rounded"></div>
                  Compact
                </SelectItem>
                <SelectItem value="medium" className="flex items-center gap-2">
                  <div className="w-6 h-4 bg-muted-foreground rounded"></div>
                  Standard
                </SelectItem>
                <SelectItem value="large" className="flex items-center gap-2">
                  <div className="w-8 h-4 bg-foreground rounded"></div>
                  Large
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-52 h-10 rounded-xl bg-background border-2 border-border shadow-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  All Categories
                </SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id} className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 h-10 rounded-xl bg-background border-2 border-border shadow-sm">
                <div className="flex items-center gap-2">
                  <SortAsc className="h-4 w-4 text-muted-foreground" />
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
        </div>

        {/* Active Filters */}
        {(searchTerm || selectedCategory !== 'all') && (
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <span className="text-sm text-muted-foreground font-medium">Active filters:</span>
            {searchTerm && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary border-primary/20">
                Search: "{searchTerm}"
                <X className="h-3 w-3 cursor-pointer ml-1 hover:text-primary/80" onClick={handleClearSearch} />
              </Badge>
            )}
            {selectedCategory !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-success/10 text-success border-success/20">
                Category: {categories?.find(c => c.id === selectedCategory)?.name}
                <X className="h-3 w-3 cursor-pointer ml-1 hover:text-success/80" onClick={() => setSelectedCategory('all')} />
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="text-muted-foreground hover:text-foreground ml-auto"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Products Display */}
      <ScrollArea className="flex-1" ref={containerRef}>
        {isLoading ? (
          <div className="p-6">
            <div 
              className="gap-5 grid"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${
                  cardSize === 'small' ? '180px' : cardSize === 'medium' ? '240px' : '300px'
                }, 1fr))`
              }}
            >
              {[...Array(12)].map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-96 text-center p-8">
            <div className="p-4 bg-destructive/10 rounded-2xl mb-4">
              <Package className="h-16 w-16 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Failed to Load Products</h3>
            <p className="text-muted-foreground mb-6 max-w-md">There was an issue loading the product catalog. Please check your connection.</p>
            <Button 
              variant="outline" 
              onClick={refetch}
              className="rounded-xl border-border hover:border-input"
            >
              <Zap className="h-4 w-4 mr-2" />
              Retry Loading
            </Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center p-8">
            <div className="p-4 bg-primary/10 rounded-2xl mb-4">
              <Search className="h-16 w-16 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Products Found</h3>
            <p className="text-muted-foreground mb-6 max-w-md">Try adjusting your search terms or filters to find what you're looking for.</p>
            <Button 
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="rounded-xl border-border hover:border-input"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Clear All Filters
            </Button>
          </div>
        ) : (
          viewMode === 'grid' ? (
            <GridView products={filteredProducts} />
          ) : (
            <ListView products={filteredProducts} />
          )
        )}

        {/* Results Count */}
        {!isLoading && !isError && filteredProducts.length > 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground border-t border-border bg-background/50">
            <div className="inline-flex items-center gap-2 bg-background px-4 py-2 rounded-full shadow-sm border border-border">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              {searchTerm && (
                <span className="text-foreground font-medium"> for "{searchTerm}"</span>
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}