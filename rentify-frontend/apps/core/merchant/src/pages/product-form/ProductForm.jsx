import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, Loader2, Plus, X } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  useCreateProductMutation,
  useUpdateProductMutation,
  useGetProductFormConfigQuery,
  useGetManagedProductQuery,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
} from '@rentify/apis';
import { Card, CardContent, CardHeader, CardTitle } from '@rentify/shared/ui/card';
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
import { useThemeService } from '@rentify/shared/hooks/useThemeService';
import { ECOMMERCE_API_ROOT, RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { useChannels } from '../../context/ChannelContext';
import { ImageUploader as ProductImageUploader } from './components/ImageUploader';
import { uploadProductImages } from '../../services/productImages';
import { PageTitle } from '../../components/page/PagePrimitives';
import { useTranslation } from '@rentify/utils';

const SKIN_TYPES = [
  { value: 'all', label: 'All skin types' },
  { value: 'normal', label: 'Normal' },
  { value: 'dry', label: 'Dry' },
  { value: 'oily', label: 'Oily' },
  { value: 'combination', label: 'Combination' },
  { value: 'sensitive', label: 'Sensitive' },
];

// Option names a merchant picks most; any other name can be typed.
const OPTION_PRESETS = ['Color', 'Size', 'Material', 'Style'];
const MAX_OPTIONS = 3;
const NO_CATEGORY = 'none';

const toStringList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
};

// Swatch data for common colour names; an unknown name keeps the option a plain list.
const COLOR_HEX = {
  black: '#000000', white: '#FFFFFF', red: '#E53935', blue: '#1E88E5', green: '#43A047',
  yellow: '#FDD835', orange: '#FB8C00', pink: '#EC407A', purple: '#8E24AA', brown: '#6D4C41',
  grey: '#9E9E9E', gray: '#9E9E9E', navy: '#1A237E', beige: '#E8D9B5', gold: '#D4AF37', silver: '#C0C0C0',
};
const isColorName = (name) => ['color', 'colour'].includes(name.trim().toLowerCase());
const optionType = (name) => {
  if (isColorName(name)) return 'color';
  if (name.trim().toLowerCase() === 'size') return 'size';
  return 'select';
};
const optionPayload = (option, position) => {
  const name = option.name.trim();
  const swatches = isColorName(name) && option.values.every((value) => COLOR_HEX[value.toLowerCase()]);
  return {
    name,
    type: swatches ? 'color' : optionType(name) === 'size' ? 'size' : 'select',
    values: option.values.map((value) => ({
      value,
      label: value,
      ...(swatches ? { hexCode: COLOR_HEX[value.toLowerCase()] } : {}),
    })),
    position,
  };
};

/** Every combination of the option values, e.g. Red/S, Red/M, Blue/S, Blue/M. */
const combinations = (options) => {
  const usable = options.filter((option) => option.name.trim() && option.values.length);
  if (!usable.length) return [];
  return usable.reduce(
    (combos, option) => combos.flatMap((combo) =>
      option.values.map((value) => ({ ...combo, [option.name.trim()]: value }))),
    [{}]
  );
};
// Order-independent: the API may return {Size, Color} for a variant built as {Color, Size}.
const comboKey = (optionValues) =>
  Object.entries(optionValues)
    .map(([name, value]) => `${name.trim().toLowerCase()}:${String(value).trim().toLowerCase()}`)
    .sort()
    .join('|');

const Field = ({ label, htmlFor, required, hint, error, children }) => (
  <div className="space-y-1.5">
    <Label htmlFor={htmlFor} className="text-sm font-medium">
      {label}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </Label>
    {children}
    {error ? (
      <p className="text-xs text-destructive">{error}</p>
    ) : hint ? (
      <p className="text-xs text-muted-foreground">{hint}</p>
    ) : null}
  </div>
);

/** Type a value and press Enter (or comma) to add it as a chip. */
const ValueChips = ({ id, values, onChange, placeholder }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const add = (raw) => {
    const next = toStringList(raw).filter((value) => !values.includes(value));
    if (next.length) onChange([...values, ...next]);
    setDraft('');
  };
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5">
      {values.map((value) => (
        <span key={value} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm">
          {value}
          <button
            type="button"
            aria-label={`Remove ${value}`}
            className="grid h-5 w-5 place-items-center rounded-full hover:bg-background"
            onClick={() => onChange(values.filter((item) => item !== value))}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        placeholder={values.length ? 'Add another…' : placeholder}
        className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
        onChange={(event) => {
          const text = event.target.value;
          if (text.includes(',')) add(text);
          else setDraft(text);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            if (draft.trim()) add(draft);
          } else if (event.key === 'Backspace' && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
      />
    </div>
  );
};

export const ProductForm = ({ onClose, category }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { websiteData } = useThemeService();
  const { store: channelStore, hasMarketplace } = useChannels();
  const websiteId = websiteData?.websiteId;
  const [fallbackStore, setFallbackStore] = useState(null);
  const activeStore = channelStore || fallbackStore;
  const activeStoreId = activeStore?.id || null;
  const { id } = useParams();
  const isEditMode = Boolean(id);

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
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`${ECOMMERCE_API_ROOT}/api/marketplace/categories`)
      .then((response) => {
        if (!response.ok) throw new Error('Could not load categories');
        return response.json();
      })
      .then((result) => { if (active) setMarketplaceCategories(result.categories || []); })
      .catch(() => { if (active) setMarketplaceCategoriesError(true); });

    if (!websiteId && !channelStore?.id) {
      fetch(`${RENTIFY_API_BASE}/api/stores/mine`, { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : null))
        .then((res) => { if (active && res?.data) setFallbackStore(res.data); })
        .catch(() => null);
    }
    return () => { active = false; };
  }, [websiteId, channelStore?.id]);

  // Store categories, with inline creation so nobody has to leave the form
  const categoriesQuery = useGetCategoriesQuery(websiteId, { skip: !websiteId });
  const storeCategories = (categoriesQuery.data || []).filter((item) => item.status !== 'deleted');
  const [createCategory, { isLoading: creatingCategory }] = useCreateCategoryMutation();
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryError, setNewCategoryError] = useState('');

  const {
    data: websiteProduct,
    isLoading: websiteProductLoading,
  } = useGetManagedProductQuery({ websiteId, productId: id }, { skip: !id || !websiteId });

  // Stores without a website edit through the Store catalog API instead
  const [storeProduct, setStoreProduct] = useState(null);
  const [storeProductLoading, setStoreProductLoading] = useState(false);
  useEffect(() => {
    if (!id || websiteId || !activeStoreId) return undefined;
    let active = true;
    setStoreProductLoading(true);
    fetch(`${ECOMMERCE_API_ROOT}/api/stores/${activeStoreId}/products/${id}`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => { if (active) setStoreProduct(result?.product || result?.data || result); })
      .catch(() => { if (active) setSubmitError('Could not load this product. Refresh to try again.'); })
      .finally(() => { if (active) setStoreProductLoading(false); });
    return () => { active = false; };
  }, [id, websiteId, activeStoreId]);
  const product = websiteId ? websiteProduct : storeProduct;
  const productLoading = websiteId ? websiteProductLoading : storeProductLoading;

  const {
    data: productFormConfig,
    isLoading: productFormConfigLoading,
    isError: productFormConfigError,
  } = useGetProductFormConfigQuery({ websiteId }, { skip: !websiteId });

  const websiteNiche = String(
    productFormConfig?.niche || product?.websiteNiche || websiteData?.niche || 'ecommerce'
  ).toLowerCase();
  const isSkincare = websiteNiche === 'skincare';

  const [createProduct, { isLoading: createLoading }] = useCreateProductMutation();
  const [updateProduct, { isLoading: updateLoading }] = useUpdateProductMutation();

  // ---- Variants: options (Color: Red, Blue) generate one row per combination
  const existingVariants = useMemo(
    () => (product?.ProductVariants || product?.variants || [])
      .filter((variant) => variant.optionValues && Object.keys(variant.optionValues).length),
    [product]
  );
  const existingOptions = product?.ProductOptions || product?.options || [];
  const [hasVariants, setHasVariants] = useState(false);
  const [options, setOptions] = useState([{ name: 'Color', values: [] }]);
  const [variantRows, setVariantRows] = useState({});

  useEffect(() => {
    if (!isEditMode || !existingVariants.length) return;
    setHasVariants(true);
    setOptions(
      existingOptions.length
        ? existingOptions.map((option) => ({
            name: option.name,
            values: (option.values || [])
              .map((value) => (value && typeof value === 'object' ? value.value : value))
              .filter(Boolean)
              .map(String),
          }))
        : Object.keys(existingVariants[0].optionValues).map((name) => ({
            name,
            values: [...new Set(existingVariants.map((variant) => variant.optionValues[name]).filter(Boolean))],
          }))
    );
    setVariantRows(Object.fromEntries(existingVariants.map((variant) => [
      comboKey(variant.optionValues),
      { id: variant.id, sku: variant.sku, price: String(variant.price ?? ''), stock: String(variant.stockQuantity ?? 0) },
    ])));
  }, [isEditMode, existingVariants, existingOptions]);

  const combos = useMemo(() => combinations(options), [options]);

  const validationSchema = Yup.object({
    name: Yup.string().trim().required('Add a product name').max(255),
    description: Yup.string().max(1000),
    price: hasVariants
      ? Yup.mixed()
      : Yup.number()
          .transform((value, original) => (original === '' ? undefined : Number(original)))
          .required('Add a price')
          .min(0.01, 'Price must be at least $0.01')
          .test('decimal', 'Use at most 2 decimals', (value) => /^\d+(\.\d{1,2})?$/.test(String(value))),
    stockQuantity: hasVariants
      ? Yup.mixed()
      : Yup.number()
          .transform((value, original) => (original === '' ? undefined : Number(original)))
          .required('Add how many you have')
          .integer('Use a whole number')
          .min(0, 'Stock cannot be negative'),
    marketplaceCategory: Yup.string().when('marketplaceVisibility', {
      is: (visibility) => hasMarketplace && visibility !== false,
      then: (schema) => schema.required('Pick where buyers find it on the marketplace'),
      otherwise: (schema) => schema.nullable(),
    }),
    nicheAttributes: Yup.object({
      skinType: isSkincare
        ? Yup.array().of(Yup.string()).min(1, 'Select at least one skin type')
        : Yup.array().of(Yup.string()),
    }),
    ingredientsText: isSkincare
      ? Yup.string().trim().test('has-ingredients', 'Add at least one ingredient',
          (value) => toStringList(value).length > 0)
      : Yup.string(),
  });

  const defaultMarketplaceCategory =
    product?.marketplaceCategory ||
    (activeStore?.primaryCategory && marketplaceCategories.includes(activeStore.primaryCategory)
      ? activeStore.primaryCategory
      : '');

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: product?.name || '',
      description: product?.description || '',
      price: product?.price || '',
      stockQuantity: product?.stockQuantity ?? 10,
      status: product?.status || 'active',
      images: product?.images || [],
      categoryId: product?.categoryId || category?.id || NO_CATEGORY,
      marketplaceCategory: defaultMarketplaceCategory,
      // null = follow the Store's marketplace default, false = hidden from the marketplace
      marketplaceVisibility: product?.marketplaceVisibility ?? null,
      storefrontVisibility: product?.storefrontVisibility !== false,
      version: product?.version || 0,
      comparePrice: product?.comparePrice || '',
      sku: product?.sku || '',
      nicheAttributes: {
        ...(product?.nicheAttributes || {}),
        skinType: toStringList(product?.nicheAttributes?.skinType),
        usageInstructions: product?.nicheAttributes?.usageInstructions || '',
        volume: product?.nicheAttributes?.volume || '',
        spf: product?.nicheAttributes?.spf || '',
      },
      ingredientsText: toStringList(product?.nicheAttributes?.ingredients).join(', '),
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!websiteId && !activeStoreId) {
        setSubmitError('Your store is not ready yet. Refresh the page or finish store setup first.');
        return;
      }
      if (websiteId && !productFormConfig?.niche) {
        setSubmitError('Could not load your store settings. Refresh the page and try again.');
        return;
      }

      let variantPayload = null;
      if (hasVariants) {
        const problem = variantProblem();
        if (problem) {
          setSubmitError(problem);
          return;
        }
        variantPayload = combos.map((optionValues, index) => {
          const row = variantRows[comboKey(optionValues)] || {};
          return {
            ...(row.id ? { id: row.id } : {}),
            ...(row.sku ? { sku: row.sku } : {}),
            optionValues,
            price: parseFloat(row.price),
            stockQuantity: parseInt(row.stock, 10),
            isDefault: index === 0,
          };
        });
      }

      setIsUploading(true);
      setSubmitError('');
      setUploadErrors([]);
      try {
        const uploadedImagesData = await uploadProductImages({
          files: uploadedImages,
          ...(websiteId ? { websiteId } : { storeId: activeStoreId }),
          onProgress: setUploadProgress,
        });
        const { ingredientsText, categoryId, ...productValues } = values;
        const productData = {
          ...productValues,
          categoryId: categoryId === NO_CATEGORY ? null : categoryId,
          comparePrice: values.comparePrice === '' ? null : values.comparePrice,
          price: variantPayload
            ? Math.min(...variantPayload.map((variant) => variant.price))
            : parseFloat(values.price),
          stockQuantity: variantPayload
            ? variantPayload.reduce((sum, variant) => sum + variant.stockQuantity, 0)
            : parseInt(values.stockQuantity, 10),
          images: [...(values.images || []), ...uploadedImagesData],
          expectedVersion: values.version,
          nicheAttributes: {
            ...values.nicheAttributes,
            ingredients: toStringList(ingredientsText),
          },
          ...(variantPayload
            ? {
                options: options
                  .filter((option) => option.name.trim() && option.values.length)
                  .map(optionPayload),
                variants: variantPayload,
              }
            : {}),
        };

        if (websiteId) {
          if (isEditMode) {
            await updateProduct({ websiteId, productId: product.id, product: productData }).unwrap();
          } else {
            await createProduct({ websiteId, product: productData }).unwrap();
          }
        } else {
          const endpoint = isEditMode
            ? `${ECOMMERCE_API_ROOT}/api/stores/${activeStoreId}/products/${product?.id || id}`
            : `${ECOMMERCE_API_ROOT}/api/stores/${activeStoreId}/products`;
          const response = await fetch(endpoint, {
            method: isEditMode ? 'PATCH' : 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result?.error || result?.message || 'Could not save the product');
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

  const variantProblem = () => {
    if (options.some((option) => option.values.length && !option.name.trim())) {
      return 'Give every option a name, like Color or Size.';
    }
    const names = options.map((option) => option.name.trim().toLowerCase()).filter(Boolean);
    if (new Set(names).size !== names.length) return 'Each option needs a different name.';
    if (!combos.length) return 'Add at least one value, like Red or Small.';
    for (const optionValues of combos) {
      const row = variantRows[comboKey(optionValues)] || {};
      const label = Object.values(optionValues).join(' / ');
      if (!(parseFloat(row.price) > 0)) return `Add a price for ${label}.`;
      if (row.stock === '' || row.stock === undefined || !(parseInt(row.stock, 10) >= 0)) {
        return `Add the stock for ${label}.`;
      }
    }
    return null;
  };

  // New combinations start from the main price and stock so the table is never blank
  useEffect(() => {
    if (!hasVariants) return;
    setVariantRows((rows) => {
      let changed = false;
      const next = { ...rows };
      combos.forEach((optionValues) => {
        const key = comboKey(optionValues);
        if (!next[key]) {
          next[key] = { price: String(formik.values.price || ''), stock: '0' };
          changed = true;
        }
      });
      return changed ? next : rows;
    });
  }, [combos, hasVariants]);

  const updateRow = (key, field, value) =>
    setVariantRows((rows) => ({ ...rows, [key]: { ...rows[key], [field]: value } }));
  const applyToAll = (field, value) =>
    setVariantRows((rows) => Object.fromEntries(
      combos.map((optionValues) => {
        const key = comboKey(optionValues);
        return [key, { ...rows[key], [field]: value }];
      })
    ));
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return setNewCategoryError('Type a category name');
    try {
      const created = await createCategory({ websiteId, name }).unwrap();
      const createdId = created?.id || created?.data?.id || created?.category?.id;
      if (createdId) formik.setFieldValue('categoryId', createdId);
      setNewCategoryName('');
      setNewCategoryError('');
      setNewCategoryOpen(false);
    } catch (error) {
      setNewCategoryError(error?.data?.error || 'Could not add the category. Try again.');
    }
  };

  const allImages = [...(formik.values.images || []), ...uploadedImages];
  const saving = createLoading || updateLoading || isUploading;
  const fieldError = (name) => (formik.touched[name] || formik.submitCount > 0) && formik.errors[name];
  // Description sits under More options: open it when that is the field in error
  useEffect(() => {
    if (formik.submitCount > 0 && formik.errors.description) setShowMore(true);
  }, [formik.submitCount, formik.errors.description]);

  if (productLoading && isEditMode) return <ProductFormSkeleton />;

  return (
    <div className="min-h-full pb-28">
      {/* Header: back link and title, like every other page (redesign M9) */}
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <PageTitle
          back={{ to: '/products', label: t('merchant.p.products') }}
          title={isEditMode ? t('merchant.p.editProduct') : t('merchant.p.addProduct')}
          description={t('merchant.p2.fillInTheBasics')}
        />
      </div>

      <form
        noValidate
        onSubmit={formik.handleSubmit}
        className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6"
      >
        {(submitError || productFormConfigError) && (
          <Alert variant="destructive">
            <AlertTitle>{t('merchant.p2.couldNotSave')}</AlertTitle>
            <AlertDescription>
              {submitError || t('merchant.products.settingsLoadError')}
            </AlertDescription>
          </Alert>
        )}

        {/* Photos */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('merchant.p2.photos')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductImageUploader
              images={allImages}
              onImagesChange={(files) => setUploadedImages((prev) => [...prev, ...files])}
              maxImages={10}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              onValidationError={setUploadErrors}
              onRemoveImage={(index) => {
                if (index < formik.values.images.length) {
                  formik.setFieldValue('images', formik.values.images.filter((_, i) => i !== index));
                } else {
                  const local = index - formik.values.images.length;
                  setUploadedImages((prev) => prev.filter((_, i) => i !== local));
                }
              }}
            />
            {uploadErrors.length > 0 && (
              <Alert variant="destructive" className="mt-3">
                <AlertTitle>{t('merchant.p2.somePhotosWereNot')}</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5">
                    {uploadErrors.map((message) => <li key={message}>{message}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Basics */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('merchant.p.product')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label={t('merchant.p2.name')} htmlFor="name" required error={fieldError('name')}>
              <Input
                id="name"
                name="name"
                placeholder={t('merchant.p2.eGCottonT')}
                className="h-11"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              {websiteId && (
                <Field label={t('merchant.p.category')} htmlFor="categoryId" error={newCategoryError}>
                  {newCategoryOpen ? (
                    <div className="flex gap-2">
                      <Input
                        id="categoryId"
                        autoFocus
                        className="h-11"
                        placeholder={t('merchant.p2.newCategoryName')}
                        value={newCategoryName}
                        onChange={(event) => setNewCategoryName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addCategory();
                          }
                        }}
                      />
                      <Button type="button" className="h-11" onClick={addCategory} disabled={creatingCategory}>
                        {creatingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11"
                        aria-label={t('merchant.p2.cancelNewCategory')}
                        onClick={() => { setNewCategoryOpen(false); setNewCategoryError(''); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Select
                        value={formik.values.categoryId}
                        onValueChange={(value) => formik.setFieldValue('categoryId', value)}
                      >
                        <SelectTrigger id="categoryId" className="h-11 flex-1">
                          <SelectValue placeholder={t('merchant.p2.noCategory')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_CATEGORY}>{t('merchant.p2.noCategory')}</SelectItem>
                          {storeCategories.map((item) => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 shrink-0"
                        onClick={() => setNewCategoryOpen(true)}
                      >
                        <Plus className="mr-1 h-4 w-4" /> {t('merchant.p2.new')}
                      </Button>
                    </div>
                  )}
                </Field>
              )}

              {hasMarketplace && (
                <Field
                  label={t('merchant.p2.marketplaceCategory')}
                  htmlFor="marketplaceCategory"
                  required={formik.values.marketplaceVisibility !== false}
                  error={
                    marketplaceCategoriesError
                      ? 'Could not load marketplace categories. Refresh to try again.'
                      : fieldError('marketplaceCategory')
                  }
                >
                  <Select
                    value={formik.values.marketplaceCategory || undefined}
                    onValueChange={(value) => formik.setFieldValue('marketplaceCategory', value)}
                  >
                    <SelectTrigger id="marketplaceCategory" className="h-11 w-full">
                      <SelectValue placeholder={t('merchant.p2.chooseOne')} />
                    </SelectTrigger>
                    <SelectContent>
                      {marketplaceCategories.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Price & stock */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('merchant.p2.priceAndStock')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={hasVariants ? 'Default price (USD)' : 'Price (USD)'}
                htmlFor="price"
                required={!hasVariants}
                hint={hasVariants ? 'New variants start at this price.' : undefined}
                error={fieldError('price')}
              >
                <Input
                  id="price"
                  name="price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="h-11"
                  value={formik.values.price}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </Field>
              {!hasVariants && (
                <Field label={t('merchant.p.stock')} htmlFor="stockQuantity" required error={fieldError('stockQuantity')}>
                  <Input
                    id="stockQuantity"
                    name="stockQuantity"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    className="h-11"
                    value={formik.values.stockQuantity}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                </Field>
              )}
            </div>

            {/* Variants */}
            <div className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{t('merchant.p.variants')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('merchant.p2.sellItInDifferent')}
                  </p>
                </div>
                <Switch
                  aria-label={t('merchant.p2.thisProductHasVariants')}
                  checked={hasVariants}
                  onCheckedChange={setHasVariants}
                />
              </div>

              {hasVariants && (
                <div className="mt-4 space-y-4">
                  {options.map((option, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-start">
                      <Input
                        aria-label={`Option ${index + 1} name`}
                        list="variant-option-presets"
                        placeholder={t('merchant.p2.optionEGColor')}
                        className="h-11"
                        value={option.name}
                        onChange={(event) => setOptions((list) =>
                          list.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))}
                      />
                      <ValueChips
                        id={`option-values-${index}`}
                        values={option.values}
                        placeholder={optionType(option.name) === 'size' ? 'S, M, L' : 'Red, Blue — press Enter'}
                        onChange={(values) => setOptions((list) =>
                          list.map((item, i) => (i === index ? { ...item, values } : item)))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11"
                        aria-label={`Remove option ${option.name || index + 1}`}
                        onClick={() => setOptions((list) => list.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <datalist id="variant-option-presets">
                    {OPTION_PRESETS.map((preset) => <option key={preset} value={preset} />)}
                  </datalist>
                  {options.length < MAX_OPTIONS && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const used = options.map((option) => option.name.trim().toLowerCase());
                        const next = OPTION_PRESETS.find((preset) => !used.includes(preset.toLowerCase())) || '';
                        setOptions((list) => [...list, { name: next, values: [] }]);
                      }}
                    >
                      <Plus className="mr-1 h-4 w-4" /> {t('merchant.p2.addOption')}
                    </Button>
                  )}

                  {combos.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-end gap-2 rounded-lg bg-muted/50 p-2">
                        <span className="w-full text-xs text-muted-foreground sm:w-auto sm:self-center">{t('merchant.p2.setAll')}</span>
                        <Input
                          aria-label={t('merchant.p2.priceForAllVariants')}
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          placeholder={t('merchant.p.price')}
                          className="h-11 w-28"
                          value={bulkPrice}
                          onChange={(event) => setBulkPrice(event.target.value)}
                        />
                        <Input
                          aria-label={t('merchant.p2.stockForAllVariants')}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          placeholder={t('merchant.p.stock')}
                          className="h-11 w-24"
                          value={bulkStock}
                          onChange={(event) => setBulkStock(event.target.value)}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-11"
                          onClick={() => {
                            if (bulkPrice !== '') applyToAll('price', bulkPrice);
                            if (bulkStock !== '') applyToAll('stock', bulkStock);
                          }}
                        >
                          {t('merchant.p2.apply')}
                        </Button>
                      </div>

                      <div className="divide-y rounded-lg border">
                        <div className="hidden grid-cols-[1fr_110px_90px] gap-3 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid">
                          <span>{t('merchant.p2.variant')}</span><span>{t('merchant.p2.priceUsd')}</span><span>{t('merchant.p.stock')}</span>
                        </div>
                        {combos.map((optionValues) => {
                          const key = comboKey(optionValues);
                          const row = variantRows[key] || { price: '', stock: '' };
                          const label = Object.values(optionValues).join(' / ');
                          return (
                            <div key={key} className="grid grid-cols-2 gap-2 px-3 py-2 sm:grid-cols-[1fr_110px_90px] sm:items-center sm:gap-3">
                              <span className="col-span-2 text-sm font-medium sm:col-span-1">{label}</span>
                              <Input
                                aria-label={`Price for ${label}`}
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                placeholder={t('merchant.p.price')}
                                className="h-11"
                                value={row.price}
                                onChange={(event) => updateRow(key, 'price', event.target.value)}
                              />
                              <Input
                                aria-label={`Stock for ${label}`}
                                type="number"
                                inputMode="numeric"
                                min="0"
                                placeholder={t('merchant.p.stock')}
                                className="h-11"
                                value={row.stock}
                                onChange={(event) => updateRow(key, 'stock', event.target.value)}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {combos.length} variant{combos.length === 1 ? '' : 's'} · total stock{' '}
                        {combos.reduce((sum, optionValues) =>
                          sum + (parseInt(variantRows[comboKey(optionValues)]?.stock, 10) || 0), 0)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skincare stores must describe skin type and ingredients */}
        {isSkincare && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('merchant.p2.skincareDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={t('merchant.p2.suitableSkinType')} required error={formik.submitCount > 0 && formik.errors.nicheAttributes?.skinType}>
                <div className="flex flex-wrap gap-2">
                  {SKIN_TYPES.map((type) => {
                    const selected = formik.values.nicheAttributes.skinType.includes(type.value);
                    return (
                      <Button
                        key={type.value}
                        type="button"
                        size="sm"
                        variant={selected ? 'default' : 'outline'}
                        className="h-11"
                        aria-pressed={selected}
                        onClick={() => formik.setFieldValue(
                          'nicheAttributes.skinType',
                          selected
                            ? formik.values.nicheAttributes.skinType.filter((value) => value !== type.value)
                            : [...formik.values.nicheAttributes.skinType, type.value]
                        )}
                      >
                        {type.label}
                      </Button>
                    );
                  })}
                </div>
              </Field>
              <Field
                label={t('merchant.p2.ingredients')}
                htmlFor="ingredientsText"
                required
                hint="Separate with commas"
                error={(formik.touched.ingredientsText || formik.submitCount > 0) && formik.errors.ingredientsText}
              >
                <Textarea
                  id="ingredientsText"
                  name="ingredientsText"
                  rows={2}
                  value={formik.values.ingredientsText}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </Field>
            </CardContent>
          </Card>
        )}

        {/* Everything optional lives here, closed by default */}
        <Card className="border-0 shadow-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between px-6 py-4 text-left"
            aria-expanded={showMore}
            onClick={() => setShowMore((open) => !open)}
          >
            <span>
              <span className="block font-semibold">{t('merchant.p2.moreOptions')}</span>
              <span className="block text-sm text-muted-foreground">{t('merchant.p2.salePriceSkuWhere')}</span>
            </span>
            <ChevronDown className={`h-5 w-5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </button>
          {showMore && (
            <CardContent className="space-y-4 border-t pt-4">
              <Field
                label={t('merchant.p2.description')}
                htmlFor="description"
                hint={`${formik.values.description.length}/1000`}
                error={fieldError('description')}
              >
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder={t('merchant.p2.whatIsItAnd')}
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('merchant.p2.compareAtPriceUsd')} htmlFor="comparePrice" hint={t('merchant.products.compareHint')}>
                  <Input
                    id="comparePrice"
                    name="comparePrice"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    className="h-11"
                    value={formik.values.comparePrice}
                    onChange={formik.handleChange}
                  />
                </Field>
                <Field label="SKU" htmlFor="sku" hint="Leave empty and we make one">
                  <Input
                    id="sku"
                    name="sku"
                    className="h-11"
                    value={formik.values.sku}
                    onChange={formik.handleChange}
                  />
                </Field>
              </div>
              {isSkincare && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('merchant.p2.sizeVolume')} htmlFor="volume">
                    <Input
                      id="volume"
                      name="nicheAttributes.volume"
                      placeholder={t('merchant.p2.eG50ml')}
                      className="h-11"
                      value={formik.values.nicheAttributes.volume}
                      onChange={formik.handleChange}
                    />
                  </Field>
                  <Field label={t('merchant.p2.spf')} htmlFor="spf">
                    <Input
                      id="spf"
                      name="nicheAttributes.spf"
                      className="h-11"
                      value={formik.values.nicheAttributes.spf}
                      onChange={formik.handleChange}
                    />
                  </Field>
                </div>
              )}

              <div className="space-y-2">
                <ToggleRow
                  title={t('merchant.p2.visible')}
                  description={formik.values.status === 'active' ? 'Customers can see and buy it' : 'Saved as a draft, hidden'}
                  checked={formik.values.status === 'active'}
                  onChange={(checked) => formik.setFieldValue('status', checked ? 'active' : 'draft')}
                />
                {hasMarketplace && (
                  <ToggleRow
                    title={t('merchant.p.rentifyMarketplace2')}
                    description={formik.values.marketplaceVisibility === false ? 'Not listed on the marketplace' : 'Listed once your store is approved'}
                    checked={formik.values.marketplaceVisibility !== false}
                    onChange={(checked) => formik.setFieldValue('marketplaceVisibility', checked ? null : false)}
                  />
                )}
                {websiteId && (
                  <ToggleRow
                    title={t('merchant.p2.yourOnlineStore')}
                    description={formik.values.storefrontVisibility ? 'Shown on your website' : 'Hidden from your website'}
                    checked={formik.values.storefrontVisibility}
                    onChange={(checked) => formik.setFieldValue('storefrontVisibility', checked)}
                  />
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Save bar stays in reach on long forms and on phones */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-end gap-2 px-4 py-3 sm:px-6">
            <Button type="button" variant="ghost" className="h-11" onClick={closeForm} disabled={saving}>
              {t('merchant.p.cancel')}
            </Button>
            <Button
              type="submit"
              className="h-11 min-w-[140px]"
              disabled={saving || productFormConfigLoading || productFormConfigError}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading && uploadProgress > 0 ? `Uploading ${uploadProgress}%` : 'Saving…'}
                </>
              ) : isEditMode ? 'Save changes' : 'Add product'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

const ToggleRow = ({ title, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-3">
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch aria-label={title} checked={checked} onCheckedChange={onChange} />
  </div>
);

const ProductFormSkeleton = () => (
  <div className="min-h-screen bg-muted/30">
    <div className="border-b bg-background">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    </div>
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  </div>
);

export default ProductForm;
