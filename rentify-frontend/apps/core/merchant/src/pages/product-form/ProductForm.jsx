import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
  X,
  Trash,
  Upload,
  Plus,
  Loader2,
  DollarSign,
  Package,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import {
  useCreateProductMutation,
  useUpdateProductMutation,
} from '@rentify/apis';
import { useShopCategories } from '../../hooks/useShopCategories';
// Shadcn Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Textarea } from '@rentify/shared/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select';
import { Switch } from '@rentify/shared/ui/switch';
import { Badge } from '@rentify/shared/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@rentify/shared/ui/alert';
import { Progress } from '@rentify/shared/ui/Progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@rentify/shared/ui/Tooltip';
import { Separator } from '@rentify/shared/ui/separator';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@rentify/shared/ui/collapsible';
import { useGetManagedProductQuery } from '@rentify/apis';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';
import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';

export const ProductForm = ({ onClose, category }) => {
  const { websiteData } = useThemeService();
  const websiteId = websiteData.websiteId;

  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [marketplaceCategories, setMarketplaceCategories] = useState([]);
  const [marketplaceCategoriesError, setMarketplaceCategoriesError] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`${ECOMMERCE_API_ROOT}/api/marketplace/categories`)
      .then((response) => {
        if (!response.ok) throw new Error('Could not load categories');
        return response.json();
      })
      .then((result) => { if (active) setMarketplaceCategories(result.categories || []); })
      .catch(() => { if (active) setMarketplaceCategoriesError(true); });
    return () => { active = false; };
  }, []);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    media: true,
    pricing: true,
    organization: true,
  });

  const { categories, isLoading: categoriesLoading } = useShopCategories();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const {
    data: product,
    isLoading: productLoading,
    isError: createError,
  } = useGetManagedProductQuery({ websiteId, productId: id }, { skip: !id });

  // Upload function remains the same
  const uploadImage = (websiteId, imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return axios.post(
      `${__API_URL__}/api/websites/uploadImage/${websiteId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        },
      }
    );
  };

  const [createProduct, { isLoading: createLoading }] =
    useCreateProductMutation();
  const [
    updateProduct,
    { isLoading: updateLoading, isError: updateError, error, isSuccess },
  ] = useUpdateProductMutation();

  // Validation schema remains the same
  const validationSchema = Yup.object({
    name: Yup.string().required('Product name is required').max(255),
    description: Yup.string().required('Description is required').max(1000),
    price: Yup.number()
      .transform((value, originalValue) =>
        originalValue === '' ? undefined : Number(originalValue)
      )
      .required('Price is required')
      .min(0.01, 'Price must be at least $0.01')
      .test('decimal', 'Invalid price format (max 2 decimal places)', (value) =>
        /^\d+(\.\d{1,2})?$/.test(String(value))
      ),
    stockQuantity: Yup.number()
      .transform((value, originalValue) =>
        originalValue === '' ? undefined : Number(originalValue)
      )
      .required('Stock quantity is required')
      .integer('Must be a whole number')
      .min(0, 'Stock cannot be negative'),
    images: Yup.array().test(
      'at-least-one-image',
      'At least one image is required',
      (value) => !isEditMode || (value && value.length > 0)
    ),
    categoryId: Yup.string().nullable(),
    marketplaceCategory: Yup.string().required('Marketplace category is required'),
  });

  const getInitialCategoryId = () => {
    if (isEditMode && product?.categoryId) {
      return product.categoryId;
    }
    if (category) {
      return category.id;
    }
    return null;
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: product?.name || '',
      description: product?.description || '',
      price: product?.price || '',
      stockQuantity: product?.stockQuantity || '',
      status: product?.status || 'draft',
      images: product?.images || [],
      categoryId: getInitialCategoryId(),
      marketplaceCategory: product?.marketplaceCategory || '',
      version: product?.version || 0,
      comparePrice: product?.comparePrice || '',
      sku: product?.sku || '',
      tags: product?.tags || '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsUploading(true);

      const uploadedImagesData = [];
      if (uploadedImages.length > 0) {
        const uploadPromises = uploadedImages.map((file) =>
          uploadImage(websiteId, file)
            .then((res) => res.data)
            .catch((err) => {
              console.error('Image upload failed:', err);
              throw err;
            })
        );
        uploadedImagesData.push(...(await Promise.all(uploadPromises)));
      }

      const productData = {
        ...values,
        price: parseFloat(values.price),
        stockQuantity: parseInt(values.stockQuantity),
        images: [
          ...(isEditMode && product?.images ? product.images : []),
          ...uploadedImagesData.map((img) => ({
            url: img.url,
            publicId: img.publicId,
          })),
        ],
        expectedVersion: values.version,
      };

      try {
        if (isEditMode) {
          await updateProduct({
            websiteId,
            productId: product.id,
            product: productData,
          }).unwrap();
        } else {
          await createProduct({
            websiteId,
            product: productData,
          }).unwrap();
        }

        onClose();
      } catch (error) {
        console.error('Submission failed:', error);
      } finally {
        setIsUploading(false);
      }
    },
  });

  const handleImageUpload = (files) => {
    setUploadedImages((prev) => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (index) => {
    formik.setFieldValue(
      'images',
      formik.values.images.filter((_, i) => i !== index)
    );
  };

  const allImages = [...(formik.values.images || []), ...uploadedImages];

  // Calculate completion percentage
  const completionPercentage = Math.round(
    ([
      formik.values.name,
      formik.values.description,
      formik.values.price,
      formik.values.stockQuantity,
      allImages.length,
    ].filter(Boolean).length /
      5) *
      100
  );

  if (productLoading && isEditMode) {
    return <ProductFormSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Enhanced Header */}
      <div className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {isEditMode ? 'Edit Product' : 'Create New Product'}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isEditMode
                    ? 'Update your product details and inventory'
                    : 'Add a new product to your store catalog'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Progress Indicator */}
              <div className="hidden md:flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">
                    {completionPercentage}% Complete
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  formik.values.status === 'draft'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {formik.values.status === 'draft' ? 'Draft' : 'Active'}
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={createLoading || updateLoading || isUploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={formik.handleSubmit}
                  disabled={
                    createLoading ||
                    updateLoading ||
                    isUploading ||
                    !formik.isValid
                  }
                  className="min-w-[120px] shadow-sm"
                >
                  {createLoading || updateLoading || isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isEditMode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : isEditMode ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Product
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Product
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Single Scroll Layout */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Status Alerts */}
        <div className="mb-6 space-y-3">
          {(createError || updateError) && (
            <Alert
              variant="destructive"
              className="border-l-4 border-l-red-500"
            >
              <AlertTitle className="flex items-center">
                <X className="h-4 w-4 mr-2" />
                Error
              </AlertTitle>
              <AlertDescription>
                {error?.data?.error ||
                  `Failed to ${
                    isEditMode ? 'update' : 'create'
                  } product. Please try again.`}
              </AlertDescription>
            </Alert>
          )}

          {isSuccess && (
            <Alert
              variant="default"
              className="border-l-4 border-l-green-500 bg-green-50"
            >
              <AlertTitle className="flex items-center text-green-900">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Success
              </AlertTitle>
              <AlertDescription className="text-green-800">
                Product {isEditMode ? 'updated' : 'created'} successfully!
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Form Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Basic Information Section */}
            <Card className="shadow-sm border-0 hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4 border-b bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                      Product Information
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Enter the basic details that customers will see
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedSections((prev) => ({
                        ...prev,
                        basic: !prev.basic,
                      }))
                    }
                  >
                    {expandedSections.basic ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              <Collapsible open={expandedSections.basic}>
                <CollapsibleContent>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="marketplaceCategory" className="text-base font-medium mb-2 block">
                          Marketplace category
                        </Label>
                        <Select value={formik.values.marketplaceCategory}
                          onValueChange={(value) => formik.setFieldValue('marketplaceCategory', value)}>
                          <SelectTrigger id="marketplaceCategory" className="h-11">
                            <SelectValue placeholder="Choose a marketplace category" />
                          </SelectTrigger>
                          <SelectContent>
                            {marketplaceCategories.map((item) =>
                              <SelectItem key={item} value={item}>{item}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {formik.touched.marketplaceCategory && formik.errors.marketplaceCategory &&
                          <p className="mt-1 text-sm text-red-600">{formik.errors.marketplaceCategory}</p>}
                        {marketplaceCategoriesError &&
                          <p className="mt-1 text-sm text-red-600">Could not load marketplace categories. Reload this page to try again.</p>}
                      </div>

                      <div>
                        <Label
                          htmlFor="name"
                          className="flex items-center space-x-2 mb-2"
                        >
                          <span className="text-base font-medium">
                            Product Name
                          </span>
                          <span className="text-red-500">*</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Use a descriptive name that customers will
                                  search for
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formik.values.name}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          placeholder="e.g., Professional Camera Lens"
                          className={`text-lg py-6 transition-colors ${
                            formik.touched.name && formik.errors.name
                              ? 'border-red-500 focus:border-red-500'
                              : ''
                          }`}
                        />
                        {formik.touched.name && formik.errors.name && (
                          <p className="text-red-600 text-sm mt-1 flex items-center">
                            <X className="h-3 w-3 mr-1" />
                            {formik.errors.name}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label
                          htmlFor="description"
                          className="flex items-center space-x-2 mb-2"
                        >
                          <span className="text-base font-medium">
                            Description
                          </span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={formik.values.description}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          rows={5}
                          placeholder="Describe your product features, benefits, and specifications..."
                          className={`resize-none text-base transition-colors ${
                            formik.touched.description &&
                            formik.errors.description
                              ? 'border-red-500 focus:border-red-500'
                              : ''
                          }`}
                        />
                        <div className="flex justify-between mt-2">
                          {formik.touched.description &&
                          formik.errors.description ? (
                            <p className="text-red-600 text-sm flex items-center">
                              <X className="h-3 w-3 mr-1" />
                              {formik.errors.description}
                            </p>
                          ) : (
                            <p className="text-muted-foreground text-sm">
                              Write a detailed description to help customers
                              understand your product
                            </p>
                          )}
                          <span
                            className={`text-sm font-medium ${
                              formik.values.description.length > 800
                                ? 'text-amber-600'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {formik.values.description.length}/1000
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label
                          htmlFor="categoryId"
                          className="text-base font-medium mb-2 block"
                        >
                          Category
                        </Label>
                        <Select
                          value={formik.values.categoryId}
                          onValueChange={(value) =>
                            formik.setFieldValue('categoryId', value)
                          }
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no-category">
                              No Category
                            </SelectItem>
                            {categoriesLoading ? (
                              <div className="space-y-2 p-2">
                                {[1, 2, 3].map((i) => (
                                  <Skeleton key={i} className="h-6 w-full" />
                                ))}
                              </div>
                            ) : (
                              categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label
                          htmlFor="sku"
                          className="text-base font-medium mb-2 block"
                        >
                          SKU (Stock Keeping Unit)
                        </Label>
                        <Input
                          id="sku"
                          name="sku"
                          value={formik.values.sku}
                          onChange={formik.handleChange}
                          placeholder="e.g., CAM-LENS-001"
                          className="h-11"
                        />
                        <p className="text-muted-foreground text-sm mt-2">
                          Unique identifier for inventory tracking
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Images Section */}
            <Card className="shadow-sm border-0 hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4 border-b bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <ImageIcon className="h-5 w-5 text-purple-600" />
                      </div>
                      Product Images
                      {allImages.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {allImages.length} uploaded
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Add high-quality images to showcase your product
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedSections((prev) => ({
                        ...prev,
                        media: !prev.media,
                      }))
                    }
                  >
                    {expandedSections.media ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              <Collapsible open={expandedSections.media}>
                <CollapsibleContent>
                  <CardContent className="pt-6">
                    <ImageUploader
                      images={allImages}
                      onImagesChange={handleImageUpload}
                      maxImages={10}
                      isUploading={isUploading}
                      uploadProgress={uploadProgress}
                      onRemoveImage={(index) => {
                        if (index < formik.values.images.length) {
                          handleRemoveExistingImage(index);
                        } else {
                          removeImage(index - formik.values.images.length);
                        }
                      }}
                    />
                    {formik.touched.images && formik.errors.images && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertTitle>Image Required</AlertTitle>
                        <AlertDescription>
                          {formik.errors.images}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Pricing & Inventory Section */}
            <Card className="shadow-sm border-0 hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4 border-b bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      Pricing & Inventory
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Set your pricing and manage stock levels
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedSections((prev) => ({
                        ...prev,
                        pricing: !prev.pricing,
                      }))
                    }
                  >
                    {expandedSections.pricing ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              <Collapsible open={expandedSections.pricing}>
                <CollapsibleContent>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label
                          htmlFor="price"
                          className="flex items-center space-x-2 mb-2 text-base font-medium"
                        >
                          <span>Price</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <Input
                            id="price"
                            name="price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formik.values.price}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            placeholder="0.00"
                            className={`pl-10 h-11 text-base transition-colors ${
                              formik.touched.price && formik.errors.price
                                ? 'border-red-500 focus:border-red-500'
                                : ''
                            }`}
                          />
                        </div>
                        {formik.touched.price && formik.errors.price && (
                          <p className="text-red-600 text-sm mt-1 flex items-center">
                            <X className="h-3 w-3 mr-1" />
                            {formik.errors.price}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label
                          htmlFor="comparePrice"
                          className="text-base font-medium mb-2 block"
                        >
                          Compare at Price
                        </Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <Input
                            id="comparePrice"
                            name="comparePrice"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formik.values.comparePrice}
                            onChange={formik.handleChange}
                            placeholder="0.00"
                            className="pl-10 h-11"
                          />
                        </div>
                        <p className="text-muted-foreground text-sm mt-2">
                          Original price for showing discounts
                        </p>
                      </div>
                    </div>

                    <div className="max-w-md">
                      <Label
                        htmlFor="stockQuantity"
                        className="flex items-center space-x-2 mb-2 text-base font-medium"
                      >
                        <span>Stock Quantity</span>
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Input
                          id="stockQuantity"
                          name="stockQuantity"
                          type="number"
                          min="0"
                          value={formik.values.stockQuantity}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          placeholder="0"
                          className={`pl-10 h-11 text-base transition-colors ${
                            formik.touched.stockQuantity &&
                            formik.errors.stockQuantity
                              ? 'border-red-500 focus:border-red-500'
                              : ''
                          }`}
                        />
                      </div>
                      {formik.touched.stockQuantity &&
                        formik.errors.stockQuantity && (
                          <p className="text-red-600 text-sm mt-1 flex items-center">
                            <X className="h-3 w-3 mr-1" />
                            {formik.errors.stockQuantity}
                          </p>
                        )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status Card */}
            <Card className="shadow-sm border-0 sticky top-24">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">
                  Product Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium">Visibility</p>
                    <p className="text-sm text-muted-foreground">
                      {formik.values.status === 'draft'
                        ? 'Hidden from store'
                        : 'Visible to customers'}
                    </p>
                  </div>
                  <Switch
                    checked={formik.values.status === 'active'}
                    onCheckedChange={(checked) =>
                      formik.setFieldValue(
                        'status',
                        checked ? 'active' : 'draft'
                      )
                    }
                  />
                </div>

                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Quick Save
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Your progress is saved automatically as you work.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Completion Card */}
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">
                  Completion Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Overall Progress
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {completionPercentage}%
                    </span>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        condition: !!formik.values.name,
                        label: 'Product name',
                        required: true,
                      },
                      {
                        condition: !!formik.values.description,
                        label: 'Description',
                        required: true,
                      },
                      {
                        condition: !!formik.values.price,
                        label: 'Price',
                        required: true,
                      },
                      {
                        condition: !!formik.values.stockQuantity,
                        label: 'Inventory quantity',
                        required: true,
                      },
                      {
                        condition: allImages.length > 0,
                        label: 'Product images',
                        required: true,
                      },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div
                          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                            item.condition
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {item.condition ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-current" />
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            item.condition ? 'text-gray-900' : 'text-gray-500'
                          }`}
                        >
                          {item.label}
                          {item.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    setExpandedSections({
                      basic: true,
                      media: true,
                      pricing: true,
                      organization: true,
                    })
                  }
                >
                  Expand All Sections
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    setExpandedSections({
                      basic: false,
                      media: false,
                      pricing: false,
                      organization: false,
                    })
                  }
                >
                  Collapse All Sections
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={onClose}
                >
                  Save as Draft
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced ImageUploader Component (same as before)
export const ImageUploader = ({
  images = [],
  onImagesChange,
  maxImages = 10,
  isUploading,
  uploadProgress,
  onRemoveImage,
}) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleFiles = (files) => {
    const fileList = Array.from(files);
    const imageFiles = fileList
      .filter((file) => file.type.startsWith('image/'))
      .filter((file) => file.size <= 10 * 1024 * 1024); // 10MB limit

    const remainingSlots = maxImages - images.length;
    const filesToProcess = imageFiles.slice(0, remainingSlots);

    if (filesToProcess.length > 0) {
      onImagesChange(filesToProcess);
    }
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-4">
      {/* Image Grid */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base">
              Uploaded Images ({images.length}/{maxImages})
            </Label>
            <Badge
              variant={images.length >= maxImages ? 'destructive' : 'outline'}
            >
              {images.length >= maxImages
                ? 'Maximum reached'
                : `${maxImages - images.length} slots left`}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((image, index) => (
              <div
                key={index}
                className="relative group rounded-lg overflow-hidden border-2 transition-all duration-200 hover:shadow-md"
              >
                <div className="aspect-square bg-gray-100">
                  {typeof image === 'string' || image?.url ? (
                    <img
                      src={typeof image === 'string' ? image : image.url}
                      alt={`Product preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : image instanceof File ? (
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Upload preview ${index + 1}`}
                      className={`w-full h-full object-cover ${
                        isUploading ? 'opacity-50' : ''
                      }`}
                    />
                  ) : null}
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => onRemoveImage(index)}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Badges */}
                {index === 0 && (
                  <Badge className="absolute top-2 left-2 bg-blue-600 text-white text-xs">
                    Cover
                  </Badge>
                )}

                {/* Upload Progress */}
                {isUploading && uploadProgress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-50">
                    <Progress
                      value={uploadProgress}
                      className="h-1 bg-white/20"
                    />
                    <p className="text-white text-xs text-center mt-1">
                      {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Area */}
      {canAddMore && (
        <div
          className={`border-2 border-dashed rounded-xl transition-all duration-200 ${
            dragActive
              ? 'border-blue-500 bg-blue-50 border-blue-500'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />

          <div
            className="p-8 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="max-w-md mx-auto">
              <div
                className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                  dragActive
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Upload className="h-8 w-8" />
              </div>

              <h4 className="font-semibold text-lg mb-2">
                {dragActive ? 'Drop to upload' : 'Upload images'}
              </h4>

              <p className="text-muted-foreground mb-4">
                Drag & drop your images here or click to browse
              </p>

              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Choose Files
              </Button>

              <p className="text-xs text-muted-foreground mt-4">
                Supports JPG, PNG, GIF • Max 10MB per file •{' '}
                {maxImages - images.length} remaining
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-900 text-sm">Image Tips</p>
            <ul className="text-amber-800 text-sm mt-1 space-y-1">
              <li>• Use high-quality images with at least 1024×1024 pixels</li>
              <li>• The first image will be used as the product cover</li>
              <li>• Supported formats: JPG, PNG, GIF</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Skeleton Loading Component (same as before)
const ProductFormSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-7 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-12 w-full" />
            <Card className="shadow-sm border-0">
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
