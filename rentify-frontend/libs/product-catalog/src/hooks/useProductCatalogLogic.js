import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  useGetAllProductsQuery,
  useDeleteProductMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
} from '@rentify/apis';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import { useSelector } from 'react-redux';
import { useShopCategories } from '@rentify/utils';

export const useProductCatalogLogic = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const categoryParam = queryParams.get('category');
  const searchParam = queryParams.get('search');

  const { websiteId, userId, preview } = useWebsiteData();
  const userAuth = useSelector((state) => state.auth.user);
  const owner = userId === userAuth?.id;

  
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortOption, setSortOption] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const { categories, loading } = useShopCategories();
  const { data, isLoading, isError, refetch } = useGetAllProductsQuery({
    websiteId,
    page: currentPage,
    limit: 12,
    sort: sortOption !== 'featured' ? sortOption : undefined,
    isFeatured: sortOption === 'featured' ? true : undefined,
    search: searchQuery || undefined,
    category:
      selectedCategories.length > 0
        ? selectedCategories
        : categoryParam
        ? [categoryParam]
        : undefined,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
  });

  const [deleteProduct] = useDeleteProductMutation();
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const search = queryParams.get('search');
    const categoryParams = queryParams.getAll('category');

    if (search) setSearchQuery(search);
    if (categoryParams.length > 0) setSelectedCategories(categoryParams);

    setCurrentPage(1);
  }, [location.search]);

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      navigate(
        `/products?search=${encodeURIComponent(searchQuery)}${selectedCategories
          .map((cat) => `&products=${encodeURIComponent(cat)}`)
          .join('')}`
      );
    }
  };

  const handleCategoryToggle = (category) => {
    const newSelected = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];

    setSelectedCategories(newSelected);
    setCurrentPage(1);

    const params = new URLSearchParams(location.search);
    params.delete('category');
    newSelected.forEach((cat) => params.append('category', cat));
    if (searchQuery) params.set('search', searchQuery);

    navigate(`/products?${params.toString()}`);
  };

const handleSortChange = (e, newSort) => {
  const newValue = newSort === sortOption ? null : newSort;
  setSortOption(newValue);
  setCurrentPage(1);
};

  const handlePageChange = (e, page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setIsCreateModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setIsCreateModalOpen(true);
  };

  const handleFormSuccess = () => {
    refetch();
    setIsCreateModalOpen(false);
    setEditingProduct(null);
  };

  return {
    websiteId,
    userAuth,
    owner,
    preview,
    categories,
    loading,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    priceRange,
    setPriceRange,
    selectedCategories,
    setSelectedCategories,
    sortOption,
    setSortOption,
    currentPage,
    setCurrentPage,
    data,
    isLoading,
    isError,
    refetch,
    deleteProduct,
    createProduct,
    updateProduct,
    isCreateModalOpen,
    setIsCreateModalOpen,
    editingProduct,
    setEditingProduct,
    handleSearch,
    handleCategoryToggle,
    handleSortChange,
    handlePageChange,
    handleCreateProduct,
    handleEditProduct,
    handleFormSuccess,
  };
}

export default useProductCatalogLogic;