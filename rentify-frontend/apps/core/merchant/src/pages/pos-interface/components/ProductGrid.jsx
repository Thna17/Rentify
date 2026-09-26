import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGetAllProductsQuery } from '@rentify/apis';
import { useShopCategories } from '../../../hooks/useShopCategories';
import { Button } from "@rentify/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rentify/shared/ui/select";
import {
  Search,
  X,
  ScanBarcode,
  Package,
  ShoppingCart,
  Star,
  RotateCw,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { cn } from '@rentify/utils';

const money = (value) => `$${parseFloat(value || 0).toFixed(2)}`;

const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#f1f5f9"/><rect x="110" y="120" width="80" height="60" rx="8" fill="#e2e8f0"/><circle cx="150" cy="100" r="16" fill="#e2e8f0"/></svg>'
)}`;

const categoryKeyOf = (product) => {
  const cat = product.Category || product.category;
  if (cat && typeof cat === 'object' && cat.id != null) return String(cat.id);
  if (product.categoryId != null) return String(product.categoryId);
  return typeof cat === 'string' ? cat : null;
};

const matchesCategory = (product, selected) =>
  selected === 'all' ||
  categoryKeyOf(product) === selected ||
  product.Category?.name === selected;

// Exact identifiers a scanner or cashier may type: SKU, barcode, or product ID.
const matchesCode = (product, code) =>
  [product.sku, product.barcode, product.id]
    .filter((value) => value != null && value !== '')
    .some((value) => String(value).toLowerCase() === code);

function ProductCard({ product, storeName, onAdd }) {
  const stock = product.stockQuantity || 0;
  const isOutOfStock = stock === 0;
  const isLowStock = !isOutOfStock && stock <= 5;
  const price = parseFloat(product.price || 0);
  const originalPrice = parseFloat(product.originalPrice || 0);
  const onSale = originalPrice > price;
  const salePercent = onSale ? Math.round((1 - price / originalPrice) * 100) : 0;
  const rating = parseFloat(product.rating ?? product.averageRating ?? 0);
  const reviewCount = product.reviewCount ?? product.reviewsCount;

  const [justAdded, setJustAdded] = useState(false);
  useEffect(() => {
    if (!justAdded) return undefined;
    const timer = setTimeout(() => setJustAdded(false), 700);
    return () => clearTimeout(timer);
  }, [justAdded]);

  const add = () => {
    if (isOutOfStock) return;
    onAdd(product);
    setJustAdded(true);
  };

  return (
    <div
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      onClick={add}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), add())}
      aria-disabled={isOutOfStock}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl bg-card p-2 text-left shadow-[var(--shadow-soft)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        justAdded && 'ring-2 ring-primary/40',
        isOutOfStock ? 'cursor-not-allowed opacity-60' : 'lift cursor-pointer'
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        <img
          src={product.images?.[0]?.url || PLACEHOLDER_IMAGE}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = PLACEHOLDER_IMAGE;
          }}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute bottom-2 left-2 flex gap-1">
          {onSale && (
            <span className="rounded-md bg-red-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
              -{salePercent}%
            </span>
          )}
          {isOutOfStock && (
            <span className="rounded-md bg-foreground/85 px-1.5 py-0.5 text-[11px] font-semibold text-background">
              Sold out
            </span>
          )}
          {isLowStock && (
            <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {stock} left
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-1.5 pt-2.5 pb-1">
        <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-1">
          {product.name}
        </h3>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {product.Store?.name || storeName}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-foreground tabular-nums">{money(price)}</span>
              {onSale && (
                <span className="text-xs text-muted-foreground line-through tabular-nums">
                  {money(originalPrice)}
                </span>
              )}
            </div>
            {rating > 0 ? (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {rating.toFixed(1)}
                {reviewCount != null && <span>({reviewCount})</span>}
              </div>
            ) : (
              product.sku && (
                <p className="mt-0.5 text-xs text-muted-foreground truncate">SKU {product.sku}</p>
              )
            )}
          </div>
          <button
            type="button"
            aria-label={`Add ${product.name} to sale`}
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              add();
            }}
            className={cn(
              'h-9 w-9 shrink-0 flex items-center justify-center rounded-full text-background hover:bg-primary disabled:bg-muted disabled:text-muted-foreground',
              justAdded ? 'bg-emerald-500 ds-bump' : 'bg-foreground'
            )}
          >
            {justAdded ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="rounded-2xl bg-card p-2 shadow-[var(--shadow-soft)]">
      <div className="aspect-[4/3] rounded-xl bg-muted animate-pulse" />
      <div className="px-1.5 pt-3 pb-1 space-y-2">
        <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-4 w-16 rounded bg-muted animate-pulse" />
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}

const GRID_CLASS = 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(170px,1fr))]';

export function ProductGrid({ onAddToCart, isFullscreen = false, websiteId, storeId, storeName = 'Store' }) {
  const { categories } = useShopCategories();
  const searchRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [scanNotice, setScanNotice] = useState('');

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
    status: 'active',
  }, {
    skip: !websiteId && !storeId,
  });

  const products = productsData?.products || [];

  const availableCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories.map((c) => ({ id: String(c.id), name: c.name }));
    }
    const catMap = new Map();
    products.forEach((p) => {
      const cat = p.Category || p.category;
      if (cat && typeof cat === 'object' && cat.id && cat.name) {
        catMap.set(String(cat.id), { id: String(cat.id), name: cat.name });
      } else if (typeof cat === 'string' && cat.trim()) {
        catMap.set(cat, { id: cat, name: cat });
      }
    });
    return Array.from(catMap.values());
  }, [categories, products]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    availableCategories.forEach((c) => {
      counts[c.id] = products.filter((p) => matchesCategory(p, c.id)).length;
    });
    return counts;
  }, [availableCategories, products]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products
      .filter((product) => {
        const matchesSearch =
          !term ||
          product.name?.toLowerCase().includes(term) ||
          product.sku?.toLowerCase().includes(term) ||
          product.barcode?.toLowerCase?.().includes(term) ||
          String(product.id).toLowerCase() === term ||
          product.description?.toLowerCase().includes(term);
        return matchesSearch && matchesCategory(product, selectedCategory);
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
  }, [products, searchTerm, selectedCategory, sortBy]);

  // Barcode scanners type the code and press Enter: add an exact match
  // straight to the sale and clear the field for the next scan.
  const handleSearchKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    const code = searchTerm.trim().toLowerCase();
    if (!code) return;
    const exact = products.find((p) => matchesCode(p, code));
    const target = exact || (filteredProducts.length === 1 ? filteredProducts[0] : null);
    if (!target) {
      setScanNotice(`No product matches “${searchTerm.trim()}”`);
      return;
    }
    if ((target.stockQuantity || 0) === 0) {
      setScanNotice(`${target.name} is out of stock`);
      return;
    }
    onAddToCart(target);
    setScanNotice(`Added ${target.name}`);
    setSearchTerm('');
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setScanNotice('');
  };

  const tabs = [
    { id: 'all', name: 'All', count: products.length },
    ...availableCategories.map((c) => ({ ...c, count: categoryCounts[c.id] || 0 })),
  ];

  return (
    <div className="flex flex-col w-full bg-background min-h-full">
      <div
        className={cn(
          'px-4 sm:px-5 pt-4 pb-3 bg-background/90 backdrop-blur-md space-y-3 z-20 sticky',
          isFullscreen ? 'top-13' : 'top-0'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              autoFocus
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setScanNotice('');
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search products or enter product ID…"
              aria-label="Search products or enter product ID"
              className="h-12 w-full rounded-xl border border-transparent bg-card shadow-[var(--shadow-soft)] pl-11 pr-10 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchTerm('');
                  searchRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => searchRef.current?.focus()}
            title="Scan barcode: focus the field, then scan"
            className="h-12 rounded-xl px-3.5 gap-2 border-transparent bg-card shadow-[var(--shadow-soft)] hover:bg-primary/5 hover:text-primary"
          >
            <ScanBarcode className="h-5 w-5" />
            <span className="hidden md:inline text-sm font-medium">Scan</span>
          </Button>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger
              aria-label="Sort products"
              className="h-12 w-12 md:w-40 rounded-xl border-transparent bg-card shadow-[var(--shadow-soft)] justify-center md:justify-between"
            >
              <ArrowUpDown className="h-4 w-4 text-muted-foreground md:hidden" />
              <span className="hidden md:inline"><SelectValue placeholder="Sort by" /></span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name A–Z</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="stock">Stock Quantity</SelectItem>
              <SelectItem value="popular">Popularity</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {scanNotice && (
          <p className="text-xs font-medium text-muted-foreground" role="status">{scanNotice}</p>
        )}

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
          {tabs.map((tab) => {
            const active = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={cn(
                  'shrink-0 h-9 inline-flex items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
                  active
                    ? 'border-transparent bg-primary text-primary-foreground shadow-sm'
                    : 'border-transparent bg-card text-foreground shadow-[var(--shadow-soft)] hover:bg-primary/5 hover:text-primary'
                )}
              >
                {tab.name}
                {tab.id !== 'all' && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-xs tabular-nums',
                      active ? 'bg-background/20' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {isLoading ? (
          <div className={GRID_CLASS}>
            {[...Array(12)].map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-80 text-center">
            <div className="p-3 bg-destructive/10 rounded-2xl mb-3 text-destructive">
              <Package className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Couldn’t load products</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">Check your connection and try again.</p>
            <Button variant="outline" onClick={refetch} size="sm" className="rounded-lg gap-1.5">
              <RotateCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-center">
            <div className="p-3 bg-muted rounded-2xl mb-3 text-muted-foreground">
              <Search className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No products found</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">Try another name, SKU, or category.</p>
            <Button variant="outline" size="sm" onClick={resetFilters} className="rounded-lg">
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <div className={GRID_CLASS}>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  storeName={storeName}
                  onAdd={onAddToCart}
                />
              ))}
            </div>
            <p className="pt-4 text-center text-xs text-muted-foreground">
              Showing {filteredProducts.length} of {products.length} products
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default ProductGrid;
