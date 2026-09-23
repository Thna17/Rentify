import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader, Plus, Sparkles } from 'lucide-react';
import { useGetProductsByCategoryQuery } from '@rentify/storefront/api';
import { useCart } from '@rentify/cart/hooks/useCart';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { ProductCard } from './ProductCard';
import { useAuth, DASHBOARD_URL } from '@rentify/storefront';

export default function CategoryProductSection({ category, websiteId, isOwner: propIsOwner, onProductsFound }) {
  const [page, setPage] = useState(1);
  const { handleAddToCart } = useCart();
  const { isOwner: authIsOwner } = useAuth();
  const isOwner = propIsOwner !== undefined ? propIsOwner : authIsOwner;

  const { data, isLoading, isFetching } = useGetProductsByCategoryQuery(
    { websiteId, categoryId: category.id, page, limit: 8 },
    { skip: !websiteId }
  );
  const products = data?.products || [];

  useEffect(() => {
    if (products.length > 0 && onProductsFound) {
      onProductsFound(true);
    }
  }, [products.length, onProductsFound]);

  return (
    <section className="py-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{category.name}</h2>
          <p className="mt-1 text-muted-foreground">Explore our curated collection</p>
        </div>
        <Button variant="ghost" asChild>
          <Link to={`/products?category=${encodeURIComponent(category.name)}`}>View all</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <p className="mb-3">No products in this category yet.</p>
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open(`${DASHBOARD_URL}/products`, '_blank')}
              >
                <Plus className="h-4 w-4" /> Add Product to {category.name}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isOwner={isOwner}
              onAddToCart={() => handleAddToCart({ productId: product.id, quantity: 1 })}
            />
          ))}

          {/* Owner Add Product Card */}
          {isOwner && (
            <Card
              onClick={() => window.open(`${DASHBOARD_URL}/products`, '_blank')}
              className="group flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-muted/20 p-6 text-center transition-all hover:border-primary hover:bg-primary/5"
            >
              <div className="mb-3 rounded-full bg-primary/10 p-4 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <Plus className="h-6 w-6" />
              </div>
              <h4 className="font-semibold text-foreground">Add Product</h4>
              <p className="mt-1 text-xs text-muted-foreground">Add new product to {category.name}</p>
            </Card>
          )}
        </div>
      )}

      {data?.totalPages > page && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" disabled={isFetching} onClick={() => setPage((current) => current + 1)}>
            {isFetching && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Load more
          </Button>
        </div>
      )}
    </section>
  );
}
