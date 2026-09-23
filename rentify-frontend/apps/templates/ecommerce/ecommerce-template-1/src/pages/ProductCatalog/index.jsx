import { useMemo } from 'react';
import { SearchX } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useGetAllProductsQuery, useSearchProductsQuery } from '@rentify/storefront/api';
import { useStorefrontWebsite } from '@rentify/storefront';
import { useCart } from '@rentify/cart/hooks/useCart';
import { ProductCard } from '../../components/ProductCard';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { Button } from '@rentify/shared/ui/button';

export default function ProductCatalogPage() {
  const [params, setParams] = useSearchParams();
  const { websiteId } = useStorefrontWebsite();
  const { handleAddToCart } = useCart();
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const catalog = useGetAllProductsQuery({ websiteId, page: 1, limit: 24, category }, { skip: !websiteId || Boolean(search) });
  const searched = useSearchProductsQuery({ websiteId, q: search, limit: 24 }, { skip: !websiteId || !search });
  const activeQuery = search ? searched : catalog;
  const products = useMemo(() => activeQuery.data?.products || activeQuery.data || [], [activeQuery.data]);

  return <section className="py-8 sm:py-12">
    <div className="mb-8 rounded-3xl bg-gradient-to-br from-primary/15 via-background to-secondary/10 p-6 sm:p-10"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Rentify marketplace</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Find something made for your day.</h1><div className="mt-5 flex max-w-xl items-center rounded-2xl border bg-background p-2 shadow-sm"><input value={search} onChange={(event) => { const value = event.target.value; setParams((current) => { if (value) current.set('search', value); else current.delete('search'); return current; }, { replace: true }); }} placeholder="Search products…" aria-label="Search products" className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none" /></div>{category && <p className="mt-4 text-sm text-muted-foreground">Browsing {category}</p>}</div>
    {activeQuery.isLoading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{[...Array(8)].map((_, index) => <Skeleton key={index} className="h-80 rounded-2xl" />)}</div> : activeQuery.isError ? <div className="rounded-2xl border p-10 text-center"><SearchX className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h2 className="font-semibold">We could not load products</h2><Button className="mt-4" variant="outline" onClick={activeQuery.refetch}>Try again</Button></div> : products.length === 0 ? <div className="rounded-2xl border p-10 text-center"><SearchX className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h2 className="font-semibold">No products found</h2><p className="mt-2 text-sm text-muted-foreground">Try another search or browse all products.</p><Button className="mt-4" variant="outline" onClick={() => setParams({})}>Clear filters</Button></div> : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} onAddToCart={() => handleAddToCart({ productId: product.id, quantity: 1 })} />)}</div>}
  </section>;
}
