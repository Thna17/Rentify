import { motion } from 'framer-motion';
import { useCart } from '@rentify/cart/hooks/useCart';
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@rentify/shared/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@rentify/shared/ui/Pagination";
import { Skeleton } from "@rentify/shared/ui/skeleton";
import { ProductCard } from './ProductCard';

// Product Grid Component
export const ProductGrid = ({
  data,
  isLoading,
  isError,
  currentPage,
  viewMode,
  userAuth,
  owner,
  preview,
  handleMenuOpen,
  setCurrentProductId,
  setDeleteConfirmOpen,
  handleEditProduct,
  setSearchQuery,
  setSelectedCategories,
  setPriceRange,
  handlePageChange,
  renderProductCard,
}) => {
  const { handleAddToCart } = useCart();
  
  if (isLoading) {
    return (
      <div className={`grid gap-6 ${viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="p-0">
              <Skeleton className="h-48 w-full rounded-none" />
            </CardHeader>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-6 w-1/3" />
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-between">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-medium text-destructive mb-4">Failed to load products</h3>
        <Button>Retry</Button>
      </div>
    );
  }

  if (data?.products.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-medium mb-4">No products found</h3>
        <Button
          onClick={() => {
            setSearchQuery('');
            setSelectedCategories([]);
            setPriceRange([0, 1000]);
          }}
        >
          Clear Filters
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className={`grid gap-6 ${viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {data.products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {renderProductCard ? (
              renderProductCard(product, index)
            ) : (
              <ProductCard
                product={product}
                viewMode={viewMode}
                userAuth={userAuth}
                onAddToCart={() => handleAddToCart(product.id, 1)}
                owner={owner}
                preview={preview}
                onMenuOpen={(e) => handleMenuOpen(e, product.id)}
                onEdit={() => handleEditProduct(product)}
                onDelete={() => {
                  setCurrentProductId(product.id);
                  setDeleteConfirmOpen(true);
                }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {data.totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) handlePageChange(null, currentPage - 1);
                  }} 
                />
              </PaginationItem>
              
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={currentPage === page}
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(null, page);
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < data.totalPages) handlePageChange(null, currentPage + 1);
                  }} 
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
};