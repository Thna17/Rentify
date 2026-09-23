import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useThemeService } from '@rentify/shared/hooks/useThemeService';
import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';

export function useShopCategories() {
  const { websiteData, isLoading } = useThemeService();
  const websiteId = websiteData.websiteId;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${ECOMMERCE_API_ROOT}/api/categories/${websiteId}`
      );
      setCategories(response.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    if (websiteId) fetchCategories();
  }, [websiteId, fetchCategories]);

  const handleAddCategory = useCallback(async (newCategory) => {
    try {
      const response = await axios.post(
        `${ECOMMERCE_API_ROOT}/api/categories`,
        {
          websiteId,
          name: newCategory.name
        }
      );
      setCategories(prev => [...prev, response.data]);
    } catch (err) {
      console.error("Failed to add category:", err);
      throw err;
    }
  }, [websiteId]);

  const handleDeleteCategory = useCallback(async (categoryId) => {
    try {
      await axios.delete(`${ECOMMERCE_API_ROOT}/api/categories/${categoryId}`);
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    } catch (err) {
      console.error("Failed to delete category:", err);
      throw err;
    }
  }, []);

  return {
    categories,
    loading,
    error,
    handleAddCategory,
    handleDeleteCategory,
    refetchCategories: fetchCategories
  };
}
