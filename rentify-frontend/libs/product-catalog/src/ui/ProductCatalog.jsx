
import { ProductCRUDDialogs } from './components/ProductCRUDDialogs';
import { ProductControlsBar } from './components/ProductControlsBar';
import { ProductGrid } from './components/ProductGrid';
import { ProductCatalogLayout } from './components/ProductCatalogLayout';
import { CategoryFilterBar } from './components/CategoryFilterBar';

import React, { cloneElement, isValidElement } from 'react';
import { useProductActions } from '@rentify/shared/hooks/useProductActions';
import useProductCatalogLogic from '../hooks/useProductCatalogLogic';
import { useCart } from '@rentify/cart/hooks/useCart';

// Main Product Catalog Component
export function ProductCatalog({ children }) {
  const { handleAddToCart } = useCart();
  const productActions = useProductActions();
  const productLogic = useProductCatalogLogic();

  return (
    <ProductCatalogLayout>
      <div className="flex flex-col gap-6">
        <CategoryFilterBar {...productLogic} />
        
        <div className="flex flex-col gap-6">
          <ProductControlsBar {...productLogic} />
          
          <ProductGrid
            {...productActions}
            {...productLogic}
            renderProductCard={(product, index) => {
              const cardElement = React.Children.toArray(children).find(
                (child) => isValidElement(child)
              );

              if (!isValidElement(cardElement)) return null;

              return cloneElement(cardElement, {
                product,
                viewMode: productLogic.viewMode,
                userAuth: productLogic.userAuth,
                owner: productLogic.owner,
                preview: productLogic.preview,
                onAddToCart: () => handleAddToCart(product.id, 1),
                onMenuOpen: (e) => productActions.handleMenuOpen(e, product.id),
                onEdit: () => productActions.handleEditProduct(product),
                onDelete: () => {
                  productActions.setCurrentProductId(product.id);
                  productActions.setDeleteConfirmOpen(true);
                },
                key: product.id,
                index,
              });
            }}
          />
        </div>
      </div>

      <ProductCRUDDialogs {...productActions} {...productLogic} />
    </ProductCatalogLayout>
  );
}
