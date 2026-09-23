import { useState, useCallback } from 'react';
// Define a basic Product type (adjust fields as needed)
interface Product {
  id: string;
  name?: string;
  [key: string]: any;
}

/**
 * Custom hook to manage product management state
 * Handles modal visibility, selected product actions, inventory, and filters.
 */
export function useProductManagementState() {
  // Modal visibility states
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isInventoryDialogOpen, setIsInventoryDialogOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);

  // Action-related states
  const [actionProduct, setActionProduct] = useState<Product | null>(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [inventoryQty, setInventoryQty] = useState(0);
  const [inventoryNote, setInventoryNote] = useState('');

  /**
   * Handle row actions triggered by quick action buttons or table actions
   * Opens the corresponding modal based on the action type
   */
  const handleRowAction = useCallback((action: string, product: Product) => {
    setActionProduct(product);

    switch (action) {
      case 'inventory':
        setInventoryQty(0);
        setInventoryNote('');
        setIsInventoryDialogOpen(true);
        break;
      case 'delete':
        setOpenDeleteDialog(true);
        break;
      default:
        break;
    }
  }, []);

  /**
   * Reset all modals and clear action states
   */
  const resetModals = useCallback(() => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsBulkStatusModalOpen(false);
    setIsBulkPriceModalOpen(false);
    setIsBulkCreateOpen(false);
    setOpenDeleteDialog(false);
    setIsInventoryDialogOpen(false);
    setIsProductDetailOpen(false);
    setActionProduct(null);
  }, []);

  return {
    // Modal states
    isBulkStatusModalOpen,
    setIsBulkStatusModalOpen,
    isBulkPriceModalOpen,
    setIsBulkPriceModalOpen,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isBulkCreateOpen,
    setIsBulkCreateOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    openDeleteDialog,
    setOpenDeleteDialog,
    isInventoryDialogOpen,
    setIsInventoryDialogOpen,
    isFiltersOpen,
    setIsFiltersOpen,
    isProductDetailOpen,
    setIsProductDetailOpen,
    

    // Action states
    actionProduct,
    setActionProduct,
    selectedProductDetail,
    setSelectedProductDetail,
    inventoryQty,
    setInventoryQty,
    inventoryNote,
    setInventoryNote,

    // Handlers
    handleRowAction,
    resetModals,
  };
}
