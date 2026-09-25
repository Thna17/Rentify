import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
  X,
  Plus,
  Loader2,
  DollarSign,
  Package,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  useCreateProductMutation,
  useUpdateProductMutation,
  useGetProductFormConfigQuery,
} from '@rentify/apis';
import { useShopCategories } from '../../hooks/useShopCategories';
// Shadcn Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Textarea } from '@rentify/shared/ui/textarea';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@rentify/shared/ui/tooltip';
import { Separator } from '@rentify/shared/ui/separator';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
} from '@rentify/shared/ui/collapsible';
import { useGetManagedProductQuery } from '@rentify/apis';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';
import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';
import { ImageUploader as ProductImageUploader } from './components/ImageUploader';
import { uploadProductImages } from '../../services/productImages';

const SKIN_TYPES = [
  { value: 'all', label: 'All skin types' },
  { value: 'normal', label: 'Normal' },
  { value: 'dry', label: 'Dry' },
  { value: 'oily', label: 'Oily' },
  { value: 'combination', label: 'Combination' },
  { value: 'sensitive', label: 'Sensitive' },
];

const toStringList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value !== 'string') return [];

  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const ProductForm = ({ onClose, category }) => {
  const navigate = useNavigate();
  const { websiteData } = useThemeService();
  const websiteId = websiteData?.websiteId;
  const closeForm = () => {
    if (onClose) onClose();
    else navigate('/products');
  };

  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [submitError, setSubmitError] = useState('');
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
    niche: true,
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

  const {
    data: productFormConfig,
    isLoading: productFormConfigLoading,
    isError: productFormConfigError,
  } = useGetProductFormConfigQuery({ websiteId }, { skip: !websiteId });

  const websiteNiche = String(
    productFormConfig?.niche ||
      product?.websiteNiche ||
      websiteData?.niche ||
      'ecommerce'
  ).toLowerCase();
  const isSkincare = websiteNiche === 'skincare';

  const [createProduct, { isLoading: createLoading }] =
    useCreateProductMutation();
  const [
    updateProduct,
    { isLoading: updateLoading, isError: updateError, error, isSuccess },
  ] = useUpdateProductMutation();

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
    nicheAttributes: Yup.object({
      skinType: isSkincare
        ? Yup.array()
            .of(Yup.string())
            .min(1, 'Select at least one suitable skin type')
        : Yup.array().of(Yup.string()),
    }),
    ingredientsText: isSkincare
      ? Yup.string()
          .trim()
          .required('Add at least one ingredient')
          .test(
            'has-ingredients',
            'Add at least one ingredient',
            (value) => toStringList(value).length > 0
          )
      : Yup.string(),
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
      status: product?.status || 'active',
      images: product?.images || [],
      categoryId: getInitialCategoryId(),
      marketplaceCategory: product?.marketplaceCategory || '',
      version: product?.version || 0,
      comparePrice: product?.comparePrice || '',
      sku: product?.sku || '',
      tags: product?.tags || '',
      nicheAttributes: {
        ...(product?.nicheAttributes || {}),
        skinType: toStringList(product?.nicheAttributes?.skinType),
        usageInstructions: product?.nicheAttributes?.usageInstructions || '',
        volume: product?.nicheAttributes?.volume || '',
        spf: product?.nicheAttributes?.spf || '',
        crueltyFree: Boolean(product?.nicheAttributes?.crueltyFree),
        vegan: Boolean(product?.nicheAttributes?.vegan),
      },
      ingredientsText: toStringList(
        product?.nicheAttributes?.ingredients
      ).join(', '),
    },
    validationSchema,
    validateOnMount: true,
    onSubmit: async (values) => {
      if (!websiteId) {
        setSubmitError('Your website is not ready yet. Refresh the page or finish store setup first.');
        return;
      }
      if (!productFormConfig?.niche) {
        setSubmitError(
          'Could not verify your store product requirements. Refresh the page and try again.'
        );
        return;
      }
      setIsUploading(true);
      setSubmitError('');
      setUploadErrors([]);
      try {
        const uploadedImagesData = await uploadProductImages({
          files: uploadedImages,
          websiteId,
          onProgress: setUploadProgress,
        });
        const { ingredientsText, ...productValues } = values;
        const productData = {
          ...productValues,
          price: parseFloat(values.price),
          stockQuantity: parseInt(values.stockQuantity, 10),
          images: [...(values.images || []), ...uploadedImagesData],
          expectedVersion: values.version,
          nicheAttributes: {
            ...values.nicheAttributes,
            ingredients: toStringList(ingredientsText),
          },
        };

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

        setUploadedImages([]);
        closeForm();
      } catch (error) {
        setSubmitError(
          error?.data?.error || error?.message ||
          `Could not ${isEditMode ? 'update' : 'create'} the product. Please try again.`
        );
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
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

  const completionItems = [
    { condition: Boolean(formik.values.marketplaceCategory), label: 'Marketplace category' },
    { condition: Boolean(formik.values.name.trim()), label: 'Product name' },
    { condition: Boolean(formik.values.description.trim()), label: 'Description' },
    { condition: Number(formik.values.price) > 0, label: 'Price' },
    {
      condition:
        formik.values.stockQuantity !== '' &&
        Number(formik.values.stockQuantity) >= 0,
      label: 'Inventory quantity',
    },
    { condition: allImages.length > 0, label: 'Product images' },
    ...(isSkincare
      ? [
          {
            condition: formik.values.nicheAttributes.skinType.length > 0,
            label: 'Suitable skin type',
          },
          {
            condition: toStringList(formik.values.ingredientsText).length > 0,
            label: 'Ingredients',
          },
        ]
      : []),
  ];

  const completionPercentage = Math.round(
    (completionItems.filter((item) => item.condition).length /
      completionItems.length) *
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
                onClick={closeForm}
                aria-label="Back to products"
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
                    {productFormConfigLoading
                      ? 'Checking requirements…'
                      : `${completionPercentage}% Complete`}
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
                  onClick={closeForm}
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
                    productFormConfigLoading ||
                    productFormConfigError ||
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

          {submitError && (
            <Alert variant="destructive" className="border-l-4 border-l-red-500">
              <AlertTitle>Product was not saved</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {productFormConfigError && (
            <Alert variant="destructive" className="border-l-4 border-l-red-500">
              <AlertTitle>Store requirements could not be loaded</AlertTitle>
              <AlertDescription>
                Refresh the page before creating a product. This prevents the
                product from being submitted without required store-specific details.
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

            {isSkincare && (
              <Card className="shadow-sm border-0 hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-4 border-b bg-gradient-to-r from-rose-50 to-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-semibold flex items-center gap-3">
                        <div className="p-2 bg-rose-100 rounded-lg">
                          <Sparkles className="h-5 w-5 text-rose-600" />
                        </div>
                        Skincare Details
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Help customers choose a product that suits their skin
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedSections((prev) => ({
                          ...prev,
                          niche: !prev.niche,
                        }))
                      }
                      aria-label={`${expandedSections.niche ? 'Collapse' : 'Expand'} skincare details`}
                    >
                      {expandedSections.niche ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>

                <Collapsible open={expandedSections.niche}>
                  <CollapsibleContent>
                    <CardContent className="pt-6 space-y-6">
                      <div>
                        <Label className="text-base font-medium">
                          Suitable Skin Types <span className="text-red-500">*</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1 mb-3">
                          Select every skin type this product is designed for.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {SKIN_TYPES.map((skinType) => {
                            const selected = formik.values.nicheAttributes.skinType.includes(
                              skinType.value
                            );

                            return (
                              <Button
                                key={skinType.value}
                                type="button"
                                variant={selected ? 'default' : 'outline'}
                                size="sm"
                                aria-pressed={selected}
                                onClick={() => {
                                  const current = formik.values.nicheAttributes.skinType;
                                  const next = selected
                                    ? current.filter((item) => item !== skinType.value)
                                    : [...current, skinType.value];
                                  formik.setFieldValue('nicheAttributes.skinType', next);
                                  formik.setFieldTouched('nicheAttributes.skinType', true, false);
                                  setSubmitError('');
                                }}
                                className="rounded-full"
                              >
                                {skinType.label}
                              </Button>
                            );
                          })}
                        </div>
                        {formik.touched.nicheAttributes?.skinType &&
                          formik.errors.nicheAttributes?.skinType && (
                            <p className="text-red-600 text-sm mt-2 flex items-center">
                              <X className="h-3 w-3 mr-1" />
                              {formik.errors.nicheAttributes.skinType}
                            </p>
                          )}
                      </div>

                      <div>
                        <Label
                          htmlFor="ingredientsText"
                          className="text-base font-medium"
                        >
                          Ingredients <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="ingredientsText"
                          name="ingredientsText"
                          value={formik.values.ingredientsText}
                          onChange={(event) => {
                            formik.handleChange(event);
                            setSubmitError('');
                          }}
                          onBlur={formik.handleBlur}
                          rows={3}
                          placeholder="e.g., Water, glycerin, hyaluronic acid"
                          className={`mt-2 resize-none ${
                            formik.touched.ingredientsText &&
                            formik.errors.ingredientsText
                              ? 'border-red-500 focus:border-red-500'
                              : ''
                          }`}
                        />
                        {formik.touched.ingredientsText &&
                        formik.errors.ingredientsText ? (
                          <p className="text-red-600 text-sm mt-1 flex items-center">
                            <X className="h-3 w-3 mr-1" />
                            {formik.errors.ingredientsText}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">
                            Separate ingredients with commas or new lines.
                          </p>
                        )}
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <Label htmlFor="usageInstructions" className="text-base font-medium">
                            Usage Instructions
                          </Label>
                          <Textarea
                            id="usageInstructions"
                            value={formik.values.nicheAttributes.usageInstructions}
                            onChange={(event) =>
                              formik.setFieldValue(
                                'nicheAttributes.usageInstructions',
                                event.target.value
                              )
                            }
                            rows={3}
                            placeholder="Explain how and when customers should use this product"
                            className="mt-2 resize-none"
                          />
                        </div>
                        <div>
                          <Label htmlFor="volume" className="text-base font-medium">
                            Volume (ml)
                          </Label>
                          <Input
                            id="volume"
                            type="number"
                            min="0"
                            value={formik.values.nicheAttributes.volume}
                            onChange={(event) =>
                              formik.setFieldValue(
                                'nicheAttributes.volume',
                                event.target.value
                              )
                            }
                            placeholder="e.g., 100"
                            className="mt-2 h-11"
                          />
                        </div>
                        <div>
                          <Label htmlFor="spf" className="text-base font-medium">
                            SPF
                          </Label>
                          <Input
                            id="spf"
                            type="number"
                            min="0"
                            value={formik.values.nicheAttributes.spf}
                            onChange={(event) =>
                              formik.setFieldValue(
                                'nicheAttributes.spf',
                                event.target.value
                              )
                            }
                            placeholder="e.g., 50"
                            className="mt-2 h-11"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <p className="font-medium">Cruelty-free</p>
                            <p className="text-xs text-muted-foreground">
                              Not tested on animals
                            </p>
                          </div>
                          <Switch
                            checked={formik.values.nicheAttributes.crueltyFree}
                            onCheckedChange={(checked) =>
                              formik.setFieldValue(
                                'nicheAttributes.crueltyFree',
                                checked
                              )
                            }
                            aria-label="Cruelty-free product"
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <p className="font-medium">Vegan</p>
                            <p className="text-xs text-muted-foreground">
                              Contains no animal-derived ingredients
                            </p>
                          </div>
                          <Switch
                            checked={formik.values.nicheAttributes.vegan}
                            onCheckedChange={(checked) =>
                              formik.setFieldValue('nicheAttributes.vegan', checked)
                            }
                            aria-label="Vegan product"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}

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
                    <ProductImageUploader
                      images={allImages}
                      onImagesChange={handleImageUpload}
                      maxImages={10}
                      isUploading={isUploading}
                      uploadProgress={uploadProgress}
                      onValidationError={setUploadErrors}
                      onRemoveImage={(index) => {
                        if (index < formik.values.images.length) {
                          handleRemoveExistingImage(index);
                        } else {
                          removeImage(index - formik.values.images.length);
                        }
                      }}
                    />
                    {uploadErrors.length > 0 && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertTitle>Some images were not added</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc pl-5">
                            {uploadErrors.map((message) => <li key={message}>{message}</li>)}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
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
                        Images upload when you create or update the product.
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
                      {productFormConfigLoading ? '—' : `${completionPercentage}%`}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {completionItems.map((item) => (
                      <div key={item.label} className="flex items-center space-x-3">
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
                          <span className="text-red-500 ml-1">*</span>
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
                      niche: true,
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
                      niche: false,
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
                  onClick={async () => {
                    await formik.setFieldValue('status', 'draft');
                    await formik.submitForm();
                  }}
                  disabled={
                    createLoading ||
                    updateLoading ||
                    isUploading ||
                    productFormConfigLoading ||
                    productFormConfigError
                  }
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
