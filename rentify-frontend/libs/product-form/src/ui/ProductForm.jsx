import { useState, useRef, useEffect } from 'react';
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
  CheckCircle2,
  Settings,
  Layers,
} from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import {
  useCreateProductMutation,
  useUpdateProductMutation,
  useGetRecommendedOptionsQuery,
} from '@rentify/apis';
import { useShopCategories } from '@rentify/utils';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import { ProductVariantsManager } from './components/ProductVariantsManager';
import { ProductOptionsManager } from './components/ProductOptionsManager';
import { ProductFormSkeleton } from './components/ProductFormSkeleton';
import { ImageUploader } from './components/ImageUploader';
// Shadcn Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
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
import { Alert, AlertTitle, AlertDescription } from '@rentify/shared/ui/alert';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@rentify/shared/ui/tabs';
import { Badge } from '@rentify/shared/ui/badge';
import { Separator } from '@rentify/shared/ui/separator';
import { Progress } from '@rentify/shared/ui/progress';
import {
  TooltipProvider,
} from '@rentify/shared/ui/tooltip';

import { useGetProductQuery } from '@rentify/apis';

// Niche-specific product type mappings
const NICHE_PRODUCT_TYPES = {
  restaurant: [
    { value: 'food', label: 'Food Item' },
    { value: 'beverage', label: 'Beverage' },
    { value: 'combo', label: 'Combo Meal' },
    { value: 'alcohol', label: 'Alcoholic Drink' },
  ],
  ecommerce: [
    { value: 'physical', label: 'Physical Product' },
    { value: 'digital', label: 'Digital Product' },
    { value: 'service', label: 'Service' },
    { value: 'subscription', label: 'Subscription' },
  ],
  cafe: [
    { value: 'beverage', label: 'Beverage' },
    { value: 'food', label: 'Food Item' },
    { value: 'combo', label: 'Combo' },
    { value: 'merchandise', label: 'Merchandise' },
  ],
  fashion: [
    { value: 'clothing', label: 'Clothing' },
    { value: 'shoes', label: 'Shoes' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'jewelry', label: 'Jewelry' },
  ],
  skincare: [
    { value: 'cleanser', label: 'Cleanser' },
    { value: 'moisturizer', label: 'Moisturizer' },
    { value: 'treatment', label: 'Treatment' },
    { value: 'mask', label: 'Mask' },
    { value: 'sunscreen', label: 'Sunscreen' },
  ],
};

export const ProductForm = ({ onClose, category }) => {
  const { websiteId, niche } = useWebsiteData();
  const websiteNiche = niche || 'skincare';
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showRecommendedOptions, setShowRecommendedOptions] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { categories, isLoading: categoriesLoading } = useShopCategories();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  // Get recommended options based on niche
  const { data: recommendedOptions, isLoading: loadingRecommended } =
    useGetRecommendedOptionsQuery(
      { websiteId: websiteId, productType: '' },
      { skip: !websiteId }
    );

  const {
    data: product,
    isLoading: productLoading,
    isError: createError,
  } = useGetProductQuery(
    { websiteId: websiteId, productId: id },
    { skip: !id }
  );

  const [createProduct, { isLoading: createLoading, error: createErrorMutation }] =
    useCreateProductMutation();
  const [
    updateProduct,
    { isLoading: updateLoading, isError: updateError, error: updateErrorMutation, isSuccess: updateSuccess },
  ] = useUpdateProductMutation();

  // Enhanced validation schema with niche support
  const validationSchema = Yup.object({
    name: Yup.string().required('Product name is required').max(255),
    description: Yup.string().required('Description is required').max(1000),
    price: Yup.number()
      .required('Price is required')
      .min(0.01, 'Price must be at least $0.01')
      .test('decimal', 'Invalid price format (max 2 decimal places)', (value) =>
        /^\d+(\.\d{1,2})?$/.test(String(value))
      ),
    compareAtPrice: Yup.number()
      .nullable()
      .min(0, 'Compare price must be positive')
      .test(
        'compare-price',
        'Compare price must be greater than price',
        function (value) {
          if (!value) return true;
          return value > this.parent.price;
        }
      ),
    stockQuantity: Yup.number()
      .required('Stock quantity is required')
      .integer('Must be a whole number')
      .min(0, 'Stock cannot be negative'),
    categoryId: Yup.string().nullable(),
    productType: Yup.string()
      .oneOf(
        NICHE_PRODUCT_TYPES[websiteNiche]?.map((t) => t.value) || ['physical']
      )
      .default('physical'),
    websiteNiche: Yup.string().default(websiteNiche),
    nicheAttributes: Yup.object().default({}),
    options: Yup.array().of(
      Yup.object({
        name: Yup.string().required('Option name is required'),
        type: Yup.string()
          .oneOf([
            'select',
            'color',
            'image',
            'text',
            'size',
            'radio',
            'checkbox',
          ])
          .required('Option type is required'),
        values: Yup.array()
          .of(
            Yup.object({
              value: Yup.string().required('Value is required'),
              label: Yup.string(),
              hexCode: Yup.string().when('../type', {
                is: 'color',
                then: (schema) =>
                  schema.required('Hex code is required for color options'),
                otherwise: (schema) => schema.notRequired(),
              }),
              imageUrl: Yup.string().when('../type', {
                is: 'image',
                then: (schema) =>
                  schema.required('Image URL is required for image options'),
                otherwise: (schema) => schema.notRequired(),
              }),
            })
          )
          .min(1, 'At least one value is required'),
        required: Yup.boolean().default(false),
      })
    ),
    variants: Yup.array().of(
      Yup.object({
        sku: Yup.string(),
        price: Yup.number().required('Variant price is required').min(0.01),
        compareAtPrice: Yup.number().nullable().min(0),
        costPrice: Yup.number().nullable().min(0),
        stockQuantity: Yup.number()
          .required('Variant stock is required')
          .min(0)
          .integer(),
        weight: Yup.number().nullable().min(0),
        optionValues: Yup.object().required('Variant options are required'),
        status: Yup.string().oneOf(['active', 'disabled']).default('active'),
      })
    ),
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

const getDefaultNicheAttributes = () => {
  const defaults = {
    restaurant: {
      preparationTime: null,
      spicyLevel: null,
      dietaryInfo: [],
      ingredients: [],
    },
    fashion: {
      sizeGuide: null,
      fabric: null,
      careInstructions: null,
      origin: null,
    },
    skincare: {
      skinType: [],
      ingredients: [],
      usageInstructions: null,
      volume: null,
      spf: null,
      crueltyFree: false,
      vegan: false
    },
    cafe: {
      preparationTime: null,
      temperature: 'hot',
      size: 'regular',
    },
  };
  return defaults[websiteNiche] || {};
};
  const generateVariants = (options, basePrice, baseStock) => {
    if (!options || options.length === 0) return [];

    const generateCombinations = (arrays, index = 0, current = {}) => {
      if (index === arrays.length) {
        return [current];
      }

      const results = [];
      const option = arrays[index];

      for (const value of option.values) {
        results.push(
          ...generateCombinations(arrays, index + 1, {
            ...current,
            [option.name]: value.value,
          })
        );
      }

      return results;
    };

    const combinations = generateCombinations(options);

    return combinations.map((optionValues, index) => {
      const variantSku = Object.values(optionValues)
        .map((val) => val?.toString().substring(0, 3).toUpperCase())
        .join('-');

      return {
        sku: `VAR-${Date.now()}-${variantSku || index}`,
        price: basePrice,
        compareAtPrice: null,
        costPrice: null,
        stockQuantity: baseStock,
        weight: null,
        optionValues,
        status: 'active',
        images: [],
      };
    });
  };

  const uploadImage = async (websiteId, imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await axios.post(
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

    return {
      url: response.data.url,
      publicId: response.data.publicId,
    };
  };

  const handleImageUploads = async () => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadedImagesData = [];
      const totalImages = uploadedImages.length;
      
      for (let i = 0; i < totalImages; i++) {
        const file = uploadedImages[i];
        const uploadedImage = await uploadImage(websiteId, file);
        uploadedImagesData.push(uploadedImage);
        
        setUploadProgress(Math.round(((i + 1) / totalImages) * 100));
      }
      
      return uploadedImagesData;
    } catch (error) {
      console.error('Image upload failed:', error);
      throw new Error(`Failed to upload images: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (values) => {
    if (websiteNiche === 'skincare') {
  if (!values.nicheAttributes?.skinType?.length) {
    setSubmitError('Skin type information is required for skincare products');
    return;
  }
  
  if (!values.nicheAttributes?.ingredients?.length) {
    setSubmitError('Ingredients list is required for skincare products');
    return;
  }
}
    console.log('Form submission started with values:', values);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await formik.validateForm(values);
      
      if (Object.keys(formik.errors).length > 0) {
        console.log('Form validation errors:', formik.errors);
        setSubmitError('Please fix the form errors before submitting.');
        return;
      }

      setIsUploading(true);

      let uploadedImagesData = [];
      if (uploadedImages.length > 0) {
        console.log('Uploading images...');
        uploadedImagesData = await handleImageUploads();
        console.log('Images uploaded:', uploadedImagesData);
      }

      const productData = {
        ...values,
        price: parseFloat(values.price),
        stockQuantity: parseInt(values.stockQuantity),
        compareAtPrice: values.compareAtPrice
          ? parseFloat(values.compareAtPrice)
          : null,
        images: [
          ...(isEditMode && product?.images ? product.images : []),
          ...uploadedImagesData,
        ],
        expectedVersion: values.version,
        websiteId: websiteId,
        variants: values.variants.map((variant) => ({
          ...variant,
          price: parseFloat(variant.price),
          stockQuantity: parseInt(variant.stockQuantity),
          compareAtPrice: variant.compareAtPrice
            ? parseFloat(variant.compareAtPrice)
            : null,
          costPrice: variant.costPrice ? parseFloat(variant.costPrice) : null,
          weight: variant.weight ? parseFloat(variant.weight) : null,
        })),
      };

      console.log('Submitting product data:', productData);

      let result;
      if (isEditMode) {
        console.log('Updating product...');
        result = await updateProduct({
          websiteId: websiteId,
          productId: product.id,
          product: productData,
        }).unwrap();
        console.log('Update result:', result);
      } else {
        console.log('Creating product...');
        result = await createProduct({
          websiteId: websiteId,
          product: productData,
        }).unwrap();
        console.log('Create result:', result);
      }

      setSubmitSuccess(true);
      
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Submission failed:', error);
      setSubmitError(
        error?.data?.error || 
        error?.message || 
        `Failed to ${isEditMode ? 'update' : 'create'} product. Please try again.`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const formik = useFormik({
    enableReinitialize: true,
    validateOnMount: true,
    initialValues: {
      name: product?.name || '',
      description: product?.description || '',
      price: product?.price || '',
      stockQuantity: product?.stockQuantity || 0,
      status: product?.status || 'active',
      images: product?.images || [],
      categoryId: getInitialCategoryId(),
      version: product?.version || 0,
      compareAtPrice: product?.compareAtPrice || null,
      sku: product?.sku || '',
      tags: product?.tags || [],
      productType:
        product?.productType ||
        NICHE_PRODUCT_TYPES[websiteNiche]?.[0]?.value ||
        'physical',
      websiteNiche: product?.websiteNiche || websiteNiche,
      nicheAttributes: product?.nicheAttributes || getDefaultNicheAttributes(),
      options: product?.options || [],
      variants: product?.variants || [],
    },
    validationSchema,
    onSubmit: handleSubmit,
  });

  const handleAddOption = (template = null) => {
    const newOptions = [...formik.values.options];

    if (template) {
      newOptions.push({
        name: template.name,
        type: template.type,
        values: template.values.map((val) => ({
          value: val,
          label: val,
          ...(template.type === 'color' && { hexCode: '#000000' }),
          ...(template.type === 'image' && { imageUrl: '' }),
        })),
        required: template.required || false,
      });
    } else {
      newOptions.push({
        name: '',
        type: 'select',
        values: [{ value: '', label: '' }],
        required: false,
      });
    }

    formik.setFieldValue('options', newOptions);
  };

  const handleRemoveOption = (optionIndex) => {
    const newOptions = formik.values.options.filter(
      (_, index) => index !== optionIndex
    );
    formik.setFieldValue('options', newOptions);

    if (newOptions.length > 0) {
      const newVariants = generateVariants(
        newOptions,
        formik.values.price,
        formik.values.stockQuantity
      );
      formik.setFieldValue('variants', newVariants);
    } else {
      formik.setFieldValue('variants', []);
    }
  };

  const handleOptionChange = (optionIndex, field, value) => {
    const newOptions = [...formik.values.options];
    newOptions[optionIndex][field] = value;
    formik.setFieldValue('options', newOptions);
  };

  const handleOptionValueChange = (optionIndex, valueIndex, field, value) => {
    const newOptions = [...formik.values.options];
    newOptions[optionIndex].values[valueIndex][field] = value;
    formik.setFieldValue('options', newOptions);
  };

  const handleAddOptionValue = (optionIndex) => {
    const newOptions = [...formik.values.options];
    newOptions[optionIndex].values.push({ value: '', label: '' });
    formik.setFieldValue('options', newOptions);
  };

  const handleRemoveOptionValue = (optionIndex, valueIndex) => {
    const newOptions = [...formik.values.options];
    newOptions[optionIndex].values = newOptions[optionIndex].values.filter(
      (_, index) => index !== valueIndex
    );
    formik.setFieldValue('options', newOptions);
  };

  const handleVariantChange = (variantIndex, field, value) => {
    const newVariants = [...formik.values.variants];
    newVariants[variantIndex][field] = value;
    formik.setFieldValue('variants', newVariants);
  };

  const handleGenerateVariants = () => {
    if (formik.values.options.length === 0) {
      alert('Please add options first');
      return;
    }

    const newVariants = generateVariants(
      formik.values.options,
      formik.values.price,
      formik.values.stockQuantity
    );
    formik.setFieldValue('variants', newVariants);
    setActiveTab('variants');
  };

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

const renderNicheSpecificFields = () => {
  switch (websiteNiche) {
    case 'restaurant':
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground/80">Restaurant Specific</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="preparationTime">
                Preparation Time (minutes)
              </Label>
              <Input
                id="preparationTime"
                type="number"
                value={formik.values.nicheAttributes.preparationTime || ''}
                onChange={(e) =>
                  formik.setFieldValue(
                    'nicheAttributes.preparationTime',
                    e.target.value
                  )
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="spicyLevel">Spicy Level</Label>
              <Select
                value={formik.values.nicheAttributes.spicyLevel || ''}
                onValueChange={(value) =>
                  formik.setFieldValue('nicheAttributes.spicyLevel', value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select spicy level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="extra-hot">Extra Hot</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      );

    case 'fashion':
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground/80">Fashion Specific</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fabric">Fabric Material</Label>
              <Input
                id="fabric"
                value={formik.values.nicheAttributes.fabric || ''}
                onChange={(e) =>
                  formik.setFieldValue('nicheAttributes.fabric', e.target.value)
                }
                placeholder="e.g., Cotton, Silk, Polyester"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="careInstructions">Care Instructions</Label>
              <Input
                id="careInstructions"
                value={formik.values.nicheAttributes.careInstructions || ''}
                onChange={(e) =>
                  formik.setFieldValue(
                    'nicheAttributes.careInstructions',
                    e.target.value
                  )
                }
                placeholder="e.g., Machine wash cold"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      );

    case 'skincare':
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground/80">Skincare Specific</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="skinType">Skin Type (comma separated) *</Label>
              <Input
                id="skinType"
                value={formik.values.nicheAttributes.skinType?.join(', ') || ''}
                onChange={(e) =>
                  formik.setFieldValue(
                    'nicheAttributes.skinType',
                    e.target.value.split(',').map(item => item.trim()).filter(item => item)
                  )
                }
                placeholder="e.g., oily, combination, sensitive"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Required for skincare products
              </p>
            </div>
            <div>
              <Label htmlFor="ingredients">Ingredients (comma separated) *</Label>
              <Input
                id="ingredients"
                value={formik.values.nicheAttributes.ingredients?.join(', ') || ''}
                onChange={(e) =>
                  formik.setFieldValue(
                    'nicheAttributes.ingredients',
                    e.target.value.split(',').map(item => item.trim()).filter(item => item)
                  )
                }
                placeholder="e.g., water, glycerin, hyaluronic acid"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Required for skincare products
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="usageInstructions">Usage Instructions</Label>
              <Textarea
                id="usageInstructions"
                value={formik.values.nicheAttributes.usageInstructions || ''}
                onChange={(e) =>
                  formik.setFieldValue('nicheAttributes.usageInstructions', e.target.value)
                }
                placeholder="e.g., Apply to damp face and rinse"
                rows={2}
                className="mt-1 resize-none"
              />
            </div>
            <div>
              <Label htmlFor="volume">Volume (ml)</Label>
              <Input
                id="volume"
                type="number"
                value={formik.values.nicheAttributes.volume || ''}
                onChange={(e) =>
                  formik.setFieldValue('nicheAttributes.volume', e.target.value)
                }
                placeholder="e.g., 100"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      );

    case 'cafe':
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground/80">Cafe Specific</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="preparationTime">Preparation Time (minutes)</Label>
              <Input
                id="preparationTime"
                type="number"
                value={formik.values.nicheAttributes.preparationTime || ''}
                onChange={(e) =>
                  formik.setFieldValue(
                    'nicheAttributes.preparationTime',
                    e.target.value
                  )
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="temperature">Default Temperature</Label>
              <Select
                value={formik.values.nicheAttributes.temperature || 'hot'}
                onValueChange={(value) =>
                  formik.setFieldValue('nicheAttributes.temperature', value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select temperature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="iced">Iced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};

  if (productLoading && isEditMode) {
    return <ProductFormSkeleton />;
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen  to-muted/20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Enhanced Header */}
          <div className="bg-card border-b   shadow-lg shadow-black/5 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-3">
        
                  <div>
                    <h1 className="text-2xl font-bold  ">
                      {isEditMode ? 'Edit Product' : 'Create New Product'}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
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
                      <div className="text-sm font-medium text-foreground/80">
                        {completionPercentage}% Complete
                      </div>
                      <Progress value={completionPercentage} className="w-24 h-1.5" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
                    <div className={`h-2 w-2 rounded-full ${
                      formik.values.status === 'draft' ? 'bg-amber-500' : 'bg-green-500'
                    }`} />
                    <span className="text-sm font-medium">
                      {formik.values.status === 'draft' ? 'Draft' : 'Active'}
                    </span>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      disabled={createLoading || updateLoading || isUploading}
                      type="button"
                      className="min-w-[90px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => formik.handleSubmit()}
                      disabled={
                        createLoading ||
                        updateLoading ||
                        isUploading ||
                        !formik.isValid
                      }
                      className="min-w-[140px] shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
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

              <TabsList className="grid w-full grid-cols-5 bg-muted/50 p-2 rounded-lg ">
                <TabsTrigger value="basic" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Package className="h-4 w-4 mr-2" />
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="media" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Media
                </TabsTrigger>
                <TabsTrigger value="pricing" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pricing
                </TabsTrigger>
                <TabsTrigger value="options" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Options
                </TabsTrigger>
                <TabsTrigger value="variants" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Layers className="h-4 w-4 mr-2" />
                  Variants
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Main Content */}
          <div >
            {/* Status Alerts */}
            <div className="mb-6 space-y-3">
              {submitError && (
                <Alert variant="destructive" className="border-l-4 border-l-error">
                  <div className="flex items-start gap-3">
                    <X className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{submitError}</AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}

              {submitSuccess && (
                <Alert variant="default" className="border-l-4 border-l-success bg-success/10">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <AlertTitle className="text-success">Success</AlertTitle>
                      <AlertDescription className="text-success/80">
                        Product {isEditMode ? 'updated' : 'created'} successfully!
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main Form Content */}
              <div className="lg:col-span-3 space-y-6">
                <TabsContent value="basic" className="space-y-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-4 border-b">
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold">Product Information</h2>
                          <p className="text-sm text-muted-foreground mt-1">
                            Basic details about your product
                          </p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name" className="text-sm font-medium">Product Name *</Label>
                          <Input
                            id="name"
                            name="name"
                            value={formik.values.name}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            placeholder="e.g., Professional Camera Lens"
                            className="mt-1.5"
                          />
                          {formik.touched.name && formik.errors.name && (
                            <p className="text-error text-sm mt-1.5">
                              {formik.errors.name}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="description" className="text-sm font-medium">Description *</Label>
                          <Textarea
                            id="description"
                            name="description"
                            value={formik.values.description}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            rows={4}
                            placeholder="Describe your product features, benefits, and specifications..."
                            className="mt-1.5 resize-none"
                          />
                          {formik.touched.description &&
                            formik.errors.description && (
                              <p className="text-error text-sm mt-1.5">
                                {formik.errors.description}
                              </p>
                            )}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-foreground/80">Product Classification</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <Label htmlFor="productType" className="text-sm">Product Type</Label>
                            <Select
                              value={formik.values.productType}
                              onValueChange={(value) =>
                                formik.setFieldValue('productType', value)
                              }
                            >
                              <SelectTrigger className="mt-1.5">
                                <SelectValue placeholder="Select product type" />
                              </SelectTrigger>
                              <SelectContent>
                                {NICHE_PRODUCT_TYPES[websiteNiche]?.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="categoryId" className="text-sm">Category</Label>
                            <Select
                              value={formik.values.categoryId}
                              onValueChange={(value) =>
                                formik.setFieldValue('categoryId', value)
                              }
                            >
                              <SelectTrigger className="mt-1.5">
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
                        </div>
                      </div>

                      {renderNicheSpecificFields()}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Media Tab */}
                <TabsContent value="media">
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-4 border-b">
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <ImageIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold">Product Images</h2>
                          <p className="text-sm text-muted-foreground mt-1">
                            Upload high-quality images for your product
                          </p>
                        </div>
                      </CardTitle>
                    </CardHeader>
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
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Pricing & Inventory Tab */}
                <TabsContent value="pricing">
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-4 border-b">
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <DollarSign className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold">Pricing & Inventory</h2>
                          <p className="text-sm text-muted-foreground mt-1">
                            Set pricing, inventory, and other financial details
                          </p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="price" className="text-sm font-medium">Price *</Label>
                          <div className="relative mt-1.5">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-muted-foreground">$</span>
                            </div>
                            <Input
                              id="price"
                              name="price"
                              type="number"
                              step="0.01"
                              value={formik.values.price}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              className="pl-7"
                            />
                          </div>
                          {formik.touched.price && formik.errors.price && (
                            <p className="text-error text-sm mt-1.5">
                              {formik.errors.price}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="stockQuantity" className="text-sm font-medium">Stock Quantity *</Label>
                          <Input
                            id="stockQuantity"
                            name="stockQuantity"
                            type="number"
                            value={formik.values.stockQuantity}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            className="mt-1.5"
                          />
                          {formik.touched.stockQuantity &&
                            formik.errors.stockQuantity && (
                              <p className="text-error text-sm mt-1.5">
                                {formik.errors.stockQuantity}
                              </p>
                            )}
                        </div>

                        <div>
                          <Label htmlFor="compareAtPrice" className="text-sm">Compare At Price</Label>
                          <div className="relative mt-1.5">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-muted-foreground">$</span>
                            </div>
                            <Input
                              id="compareAtPrice"
                              name="compareAtPrice"
                              type="number"
                              step="0.01"
                              value={formik.values.compareAtPrice || ''}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              placeholder="Optional sale price"
                              className="pl-7"
                            />
                          </div>
                          {formik.touched.compareAtPrice &&
                            formik.errors.compareAtPrice && (
                              <p className="text-error text-sm mt-1.5">
                                {formik.errors.compareAtPrice}
                              </p>
                            )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Options Tab */}
                <TabsContent value="options">
                  <ProductOptionsManager
                    options={formik.values.options}
                    onAddOption={handleAddOption}
                    onRemoveOption={handleRemoveOption}
                    onOptionChange={handleOptionChange}
                    onOptionValueChange={handleOptionValueChange}
                    onAddOptionValue={handleAddOptionValue}
                    onRemoveOptionValue={handleRemoveOptionValue}
                    onGenerateVariants={handleGenerateVariants}
                    errors={formik.errors.options}
                    recommendedOptions={recommendedOptions}
                    showRecommended={showRecommendedOptions}
                    onToggleRecommended={() =>
                      setShowRecommendedOptions(!showRecommendedOptions)
                    }
                    niche={websiteNiche}
                    loadingRecommended={loadingRecommended}
                  />
                </TabsContent>

                {/* Variants Tab */}
                <TabsContent value="variants">
                  <ProductVariantsManager
                    variants={formik.values.variants}
                    options={formik.values.options}
                    onVariantChange={handleVariantChange}
                    onGenerateVariants={handleGenerateVariants}
                    errors={formik.errors.variants}
                  />
                </TabsContent>
              </div>

              {/* Right Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="sticky top-24 border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Product Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                      <div className="space-y-0.5">
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
                  </CardContent>
                </Card>

                {/* Completion Card */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Completion
                          </span>
                          <span className="text-lg font-bold text-primary">
                            {completionPercentage}%
                          </span>
                        </div>
                        <Progress value={completionPercentage} className="h-2" />
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        {[
                          { label: 'Product Name', completed: !!formik.values.name },
                          { label: 'Description', completed: !!formik.values.description },
                          { label: 'Price', completed: !!formik.values.price },
                          { label: 'Images', completed: allImages.length > 0 },
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${item.completed ? 'bg-success' : 'bg-muted'}`} />
                              <span className={`text-sm ${item.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {item.label}
                              </span>
                            </div>
                            {item.completed && (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};


export default ProductForm;