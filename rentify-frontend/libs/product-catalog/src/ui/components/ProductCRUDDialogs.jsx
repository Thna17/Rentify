import { ConfirmDeleteDialog } from '@rentify/shared/ui/components/ConfirmDeleteDialog';
import { ProductMenu} from './ProductMenu';
export const ProductCRUDDialogs = ({
  anchorEl,
  currentProductId,
  deleteConfirmOpen,
  handleMenuClose,
  handleDeleteConfirmation,
  handleDeleteCancel,
  isCreateModalOpen,
  setIsCreateModalOpen,
  editingProduct,
  websiteId,
  handleFormSuccess,
  createProduct,
  updateProduct,
  data,
  handleEditProduct,
  deleteProduct,
  refetch,
  preview,
  setDeleteConfirmOpen,
  setCurrentProductId,
}) => {
    
  const handleDeleteProduct = async () => {
    try {
      if (!preview) {
        await deleteProduct({ websiteId, productId: currentProductId }).unwrap();
        refetch();
      }
      setDeleteConfirmOpen(false);
      setCurrentProductId(null);
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  return (
    <>
      <ProductMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onEdit={() => {
          const product = data.products.find((p) => p.id === currentProductId);
          handleEditProduct(product);
        }}
        onDelete={handleDeleteConfirmation}
      />

      <ConfirmDeleteDialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteProduct}
      />

    </>
  );
};

