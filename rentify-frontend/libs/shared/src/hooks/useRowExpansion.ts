import { useState, useCallback } from 'react';

/**
 * Custom hook for managing row expansion state in data tables
 * Supports both desktop (inline expansion) and mobile (drawer) patterns
 * 
 * @template T - The type of items being managed in the rows
 * @param isMobile - Determines if mobile drawer pattern should be used
 * @returns Object containing expansion state and control methods
 */
export function useRowExpansion<T>(isMobile: boolean = false) {
  // Track which rows are expanded (desktop pattern)
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
  
  // Currently selected item for mobile drawer
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  
  // Mobile drawer visibility state
  const [detailDrawerOpen, setDetailDrawerOpen] = useState<boolean>(false);

  /**
   * Toggles row expansion state
   * - Mobile: Opens detail drawer with selected item
   * - Desktop: Toggles inline expansion (single row at a time)
   * 
   * @param itemId - Unique identifier for the row/item
   * @param item - The complete item data
   * @param event - Optional event for preventing propagation
   */
  const toggleRowExpand = useCallback((
    itemId: string | number, 
    item: T, 
    event?: React.MouseEvent
  ) => {
    // Prevent event bubbling if event is provided
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (isMobile) {
      // Mobile: Open drawer with selected item
      setSelectedItem(item);
      setDetailDrawerOpen(true);
    } else {
      // Desktop: Toggle inline expansion (single row at a time)
      setExpandedRows((prev) => {
        const newSet = new Set(prev);
        
        if (newSet.has(itemId)) {
          // Collapse if already expanded
          newSet.delete(itemId);
        } else {
          // Expand new row (collapse others)
          const singleSet = new Set<string | number>();
          singleSet.add(itemId);
          return singleSet;
        }
        return newSet;
      });
    }
  }, [isMobile]);

  /**
   * Closes the mobile detail drawer and clears selection
   */
  const closeDetailDrawer = useCallback(() => {
    setDetailDrawerOpen(false);
    setSelectedItem(null);
  }, []);

  return {
    expandedRows,
    selectedItem,
    detailDrawerOpen,
    toggleRowExpand,
    closeDetailDrawer,
    setDetailDrawerOpen
  };
}