// src/services/categoryService.js
import { useUpdateWebsiteContentMutation } from '@rentify/apis';

export const useCategoryManager = (websiteId, contentId) => {
  const [updateContent] = useUpdateWebsiteContentMutation();

  const addCategory = async (category) => {
    return updateContent({
      contentId,
      body: {
        operation: 'add',
        category
      }
    }).unwrap();
  };

  const updateCategory = async (category) => {
    return updateContent({
      contentId,
      body: {
        operation: 'update',
        category
      }
    }).unwrap();
  };

  const deleteCategory = async (categoryId) => {
    return updateContent({
      contentId,
      body: {
        operation: 'delete',
        category: { id: categoryId }
      }
    }).unwrap();
  };

  return { addCategory, updateCategory, deleteCategory };
};