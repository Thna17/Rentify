import { useState } from 'react';
import { Check, Eye, ShoppingBag, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Badge } from '@rentify/shared/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@rentify/shared/ui/dialog';
import { trackStorefrontEvent, useStorefrontWebsite, useAuth, DASHBOARD_URL } from '@rentify/storefront';
import { useDeleteProductMutation } from '@rentify/storefront/api';

const imageUrl = (product) => product?.images?.[0]?.url || product?.images?.[0] || null;
const isUnavailable = (product) => product?.trackInventory && !product?.allowBackorders && Number(product?.stockQuantity || 0) <= 0;

/** Product card supporting customer shopping and store owner quick actions. */
export function ProductCard({ product, onAddToCart, viewMode = 'grid', isOwner: propIsOwner }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { websiteId } = useStorefrontWebsite();
  let authIsOwner = false;
  if (typeof useAuth === 'function') {
    try {
      authIsOwner = Boolean(useAuth()?.isOwner);
    } catch {
      authIsOwner = false;
    }
  }
  const isOwner = propIsOwner !== undefined ? propIsOwner : authIsOwner;

  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  const unavailable = isUnavailable(product);
  const image = imageUrl(product);
  const price = Number(product?.price || 0).toFixed(2);

  const add = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (unavailable || adding || !onAddToCart) return;
    setAdding(true);
    try {
      await onAddToCart();
      setAdded(true);
      trackStorefrontEvent({ name: 'add_to_cart', websiteId, productId: product.id, quantity: 1 });
      window.setTimeout(() => setAdded(false), 1800);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteProduct({ websiteId, productId: product.id }).unwrap();
      setDeleteOpen(false);
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  return (
    <>
      <Card className={`group relative overflow-hidden border-border/70 bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${viewMode === 'list' ? 'flex' : ''}`}>
        {/* Owner management action buttons */}
        {isOwner && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 opacity-90 transition-opacity group-hover:opacity-100">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full bg-white/95 shadow-md backdrop-blur hover:bg-white text-foreground"
              title="Edit in Merchant Dashboard"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(`${DASHBOARD_URL}/products`, '_blank');
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full bg-white/95 shadow-md backdrop-blur hover:bg-rose-50 text-rose-600 hover:text-rose-700"
              title="Delete Product"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <Link to={`/product/${product.id}`} className={viewMode === 'list' ? 'w-36 shrink-0' : ''} aria-label={`View ${product.name}`}>
          <div className="relative aspect-square overflow-hidden bg-muted">
            {image ? <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <ShoppingBag className="m-auto h-full w-10 text-muted-foreground" />}
            <div className="absolute left-3 top-3 flex gap-2">
              {product?.compareAtPrice > product?.price && <Badge className="bg-rose-600 text-white">Offer</Badge>}
              {unavailable && <Badge variant="secondary">Out of stock</Badge>}
            </div>
          </div>
        </Link>
        <CardContent className="flex flex-1 flex-col gap-3 p-4">
          <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-primary">{product?.Category?.name || 'Featured'}</p><Link to={`/product/${product.id}`} className="mt-1 block line-clamp-2 font-semibold leading-snug hover:text-primary">{product?.name}</Link></div>
          <p className="line-clamp-2 text-sm text-muted-foreground">{product?.description || 'Quality products, ready for delivery.'}</p>
          <div className="mt-auto flex items-center justify-between gap-3"><div><span className="text-lg font-bold">${price}</span>{product?.compareAtPrice > product?.price && <span className="ml-2 text-sm text-muted-foreground line-through">${Number(product.compareAtPrice).toFixed(2)}</span>}</div><Button size="sm" disabled={unavailable || adding} onClick={add} aria-label={`Add ${product.name} to cart`}>{added ? <><Check className="mr-1 h-4 w-4" />Added</> : <><ShoppingBag className="mr-1 h-4 w-4" />{unavailable ? 'Unavailable' : 'Add'}</>}</Button></div>
          <Link to={`/product/${product.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"><Eye className="h-4 w-4" />Quick view</Link>
        </CardContent>
      </Card>

      {/* Delete Product Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong className="text-foreground">{product.name}</strong>? This will remove the product from your store catalog.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
