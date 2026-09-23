// useProductActions.js
import { useState } from 'react';

export const useProductActions = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentProductId, setCurrentProductId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const handleMenuOpen = (event, productId) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setCurrentProductId(productId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // setCurrentProductId(null);
  };

  const handleDeleteConfirmation = () => {
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setCurrentProductId(null);
    setCurrentProductId(null);
  };

  return {
    anchorEl,
    currentProductId,
    deleteConfirmOpen,
    editingProduct,
    setEditingProduct,
    handleMenuOpen,
    handleMenuClose,
    handleDeleteConfirmation,
    handleDeleteCancel,
    setDeleteConfirmOpen,
    setCurrentProductId,
  };
};

export default useProductActions;