import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AUTH_URL,
  DASHBOARD_URL,
  ECOMMERCE_API_ROOT,
  HOSTED_STOREFRONT_DOMAIN,
  MARKETPLACE_URL,
  RENTIFY_API_BASE,
} from '@rentify/shared/config/urls';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe,
  ImagePlus,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Sparkles,
  Store,
  UserCheck,
  Wallet,
} from 'lucide-react';

const storeUrl = `${RENTIFY_API_BASE}/api/stores`;
const authMeUrl = `${RENTIFY_API_BASE}/api/auth/me`;
const STORAGE_KEY = 'rentify-unified-onboarding-draft';

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'your-store';

const STEPS = [
  { id: 1, title: 'Register', subtitle: 'One Rentify account', icon: UserCheck },
  { id: 2, title: 'Create store', subtitle: 'Name + main category', icon: Store },
  { id: 3, title: 'Add first product', subtitle: 'One shared catalog', icon: Package },
  { id: 4, title: 'Live on Marketplace', subtitle: 'Upgrade when ready', icon: Sparkles },
];

export default function StartSelling() {
  const [searchParams] = useSearchParams();
  const requestedPlan = searchParams.get('plan') || 'starter';
  const fileInputRef = useRef(null);

  const [loadingInit, setLoadingInit] = useState(true);
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [existingStore, setExistingStore] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Step 2: Store state
  const [name, setName] = useState('');
  const [primaryCategory, setPrimaryCategory] = useState('');
  const [submittingStore, setSubmittingStore] = useState(false);

  // Step 3: First product state
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('10');
  const [productDescription, setProductDescription] = useState('');
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState('');
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [createdProduct, setCreatedProduct] = useState(null);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');

  // Restore saved draft if returning from Auth
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setName(parsed.name);
        if (parsed.primaryCategory) setPrimaryCategory(parsed.primaryCategory);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`${storeUrl}/categories`)
        .then((res) => (res.ok ? res.json() : { data: [] }))
        .catch(() => ({ data: [] })),
      fetch(authMeUrl, { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
      fetch(`${storeUrl}/mine`, { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ])
      .then(([categoryResult, authResult, storeResult]) => {
        if (!active) return;
        const cats = categoryResult?.data || [];
        setCategories(cats);

        const resolvedUser = authResult?.user || authResult?.data || null;
        const resolvedStore = storeResult?.data || null;

        setUser(resolvedUser);
        setExistingStore(resolvedStore);

        if (resolvedStore) {
          setName(resolvedStore.name || '');
          setPrimaryCategory(resolvedStore.primaryCategory || cats[0] || '');
          setCurrentStep(3);
        } else if (resolvedUser) {
          setCurrentStep(2);
        } else {
          setCurrentStep(1);
        }
      })
      .finally(() => {
        if (active) setLoadingInit(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const saveDraftForAuth = () => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ name, primaryCategory })
      );
    } catch {
      // ignore
    }
  };

  const buildAuthRedirectUrl = (mode = 'register') => {
    const returnUrl = typeof window !== 'undefined' ? window.location.href : '/start';
    const path = mode === 'login' ? 'login' : 'register';
    return `${AUTH_URL}/${path}?returnUrl=${encodeURIComponent(returnUrl)}`;
  };

  async function handleCreateStore(event) {
    event.preventDefault();
    setSubmittingStore(true);
    setMessage('');

    try {
      const response = await fetch(storeUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          primaryCategory,
          marketplaceEnabled: true,
        }),
      });

      if (response.status === 401) {
        saveDraftForAuth();
        setMessageType('info');
        setMessage('Please register or sign in to create your store. Redirecting you now…');
        window.location.assign(buildAuthRedirectUrl('register'));
        return;
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Could not create your Store');
      }

      const createdStore = result.data || result;
      setExistingStore(createdStore);
      sessionStorage.removeItem(STORAGE_KEY);
      setCurrentStep(3);
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Could not create your Store');
    } finally {
      setSubmittingStore(false);
    }
  }

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProductImageFile(file);
    setProductImagePreview(URL.createObjectURL(file));
  };

  async function handleCreateFirstProduct(event) {
    event.preventDefault();
    if (!existingStore?.id) return;

    setSubmittingProduct(true);
    setMessage('');

    try {
      let uploadedImages = [];
      if (productImageFile) {
        const formData = new FormData();
        formData.append('images', productImageFile);
        const uploadRes = await fetch(`${storeUrl}/${existingStore.id}/product-images`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (Array.isArray(uploadData.images)) {
            uploadedImages = uploadData.images
              .filter((img) => img?.url)
              .map((img) => ({ url: img.url }));
          }
        }
      }

      const productRes = await fetch(
        `${ECOMMERCE_API_ROOT}/api/stores/${existingStore.id}/products`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: productName.trim(),
            price: Number(productPrice),
            stockQuantity: Math.max(1, parseInt(productStock, 10) || 1),
            marketplaceCategory:
              existingStore.primaryCategory || primaryCategory || categories[0] || 'Other',
            description:
              productDescription.trim() ||
              `${productName.trim()} from ${existingStore.name}`,
            images: uploadedImages,
            status: 'active',
            marketplaceVisibility: true,
          }),
        }
      );

      const productData = await productRes.json();
      if (!productRes.ok) {
        throw new Error(
          productData.error || productData.message || 'Could not create product'
        );
      }

      setCreatedProduct(productData);
      setCurrentStep(4);
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Could not add product. You can also skip and add products in your dashboard.');
    } finally {
      setSubmittingProduct(false);
    }
  }

  const rawStoreSlug = String(existingStore?.slug || '').trim();
  const isAutoUuidSlug = /^store-[0-9a-f-]{20,}$/i.test(rawStoreSlug);
  const storeSlug = slugify(
    (!isAutoUuidSlug && rawStoreSlug) || existingStore?.name || name
  );
  const storefrontDomain =
    existingStore?.websiteDomain ||
    `${storeSlug}.${HOSTED_STOREFRONT_DOMAIN || 'mekhla.digital'}`;
  const posUrl = DASHBOARD_URL.includes('mekhla.digital')
    ? 'https://rentify-pos.mekhla.digital'
    : 'http://localhost:4401';

  const marketplaceBase = (MARKETPLACE_URL || 'https://rentify-market.mekhla.digital').replace(/\/+$/, '');
  const marketplaceStoreSlug = existingStore?.id || (!isAutoUuidSlug && rawStoreSlug) || storeSlug;
  const marketplaceStoreUrl = `${marketplaceBase}/stores/${marketplaceStoreSlug}`;
  const marketplaceDisplayUrl = `${marketplaceBase.replace(/^https?:\/\//, '')}/stores/${marketplaceStoreSlug}`;

  const [selectedChannel, setSelectedChannel] = useState('marketplace');
  const [copiedMarketplace, setCopiedMarketplace] = useState(false);

  const handleCopyMarketplaceUrl = (e) => {
    e.stopPropagation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(marketplaceStoreUrl);
      setCopiedMarketplace(true);
      setTimeout(() => setCopiedMarketplace(false), 2000);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#eff6ff_55%,#f0fdfa_100%)] text-slate-900">
      {/* Top Bar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow-sm">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Rentify
            </span>
          </Link>

          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {user.email || user.username || 'Signed in'}
              </span>
            ) : (
              <a
                href={buildAuthRedirectUrl('login')}
                onClick={saveDraftForAuth}
                className="inline-flex min-h-[44px] items-center px-2 font-medium text-slate-600 hover:text-blue-600"
              >
                Sign in
              </a>
            )}
            {existingStore && (
              <a
                href={`${DASHBOARD_URL}/overview`}
                className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Dashboard
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-14">
        {/* Hero Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
            One unified path for every seller
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Start selling in minutes
          </h1>
          <p className="mt-2.5 text-base text-slate-600">
            One Rentify account and one catalog. Start free on Rentify Marketplace, then unlock your own website and POS whenever you’re ready.
          </p>
        </div>

        {/* 4-Step Unified Stepper */}
        <nav aria-label="Onboarding progress" className="mt-8">
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isCompleted =
                step.id < currentStep ||
                (step.id === 1 && Boolean(user || existingStore)) ||
                (step.id === 2 && Boolean(existingStore));
              const isCurrent = step.id === currentStep;

              return (
                <li
                  key={step.id}
                  onClick={() => {
                    if (step.id === 1 && !user && !existingStore) setCurrentStep(1);
                    if (step.id === 2 && !existingStore) setCurrentStep(2);
                    if (step.id === 3 && existingStore) setCurrentStep(3);
                    if (step.id === 4 && existingStore) setCurrentStep(4);
                  }}
                  className={`flex min-h-[64px] cursor-pointer items-center gap-2.5 rounded-2xl border p-3 transition-all sm:gap-3 sm:p-3.5 ${
                    isCurrent
                      ? 'border-blue-600 bg-white shadow-md ring-2 ring-blue-600/15'
                      : isCompleted
                      ? 'border-emerald-200 bg-emerald-50/60'
                      : 'border-slate-200 bg-white/70 opacity-75'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold uppercase tracking-wider text-slate-400">
                      Step {step.id}
                    </p>
                    <p className="text-sm font-semibold leading-snug text-slate-900 sm:truncate">
                      {step.title}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>

        {message && (
          <div
            role="alert"
            className={`mt-6 rounded-2xl border p-4 text-sm font-medium ${
              messageType === 'info'
                ? 'border-blue-200 bg-blue-50 text-blue-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            {message}
          </div>
        )}

        {/* Main Step Card */}
        <div className="mt-8">
          {loadingInit ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-500">Preparing your onboarding workspace…</p>
            </div>
          ) : currentStep === 1 && !user && !existingStore ? (
            /* STEP 1: REGISTER & STORE DETAILS */
            <div className="grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Step 1 & 2 • Quick Setup
                </div>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">
                  Create your account & store
                </h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  Tell us your store name and main category, then register or sign in to continue.
                </p>

                <form onSubmit={handleCreateStore} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800">
                      Store name
                      <input
                        required
                        maxLength={120}
                        placeholder="e.g. BKK Coffee & Roastery"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 hover:border-slate-400"
                      />
                    </label>
                    {name.trim() && (
                      <p className="mt-1.5 text-xs text-slate-500">
                        Reserved storefront address:{' '}
                        <span className="font-mono font-medium text-blue-600">
                          {slugify(name)}.{HOSTED_STOREFRONT_DOMAIN || 'mekhla.digital'}
                        </span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800">
                      Main store category
                      <select
                        required
                        value={primaryCategory}
                        onChange={(e) => setPrimaryCategory(e.target.value)}
                        className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base sm:text-sm text-slate-900 transition-all duration-200 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 hover:border-slate-400 cursor-pointer"
                      >
                        <option value="">Choose your main category</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="pt-2 flex flex-col gap-3 sm:flex-row">
                    <a
                      href={buildAuthRedirectUrl('register')}
                      onClick={saveDraftForAuth}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                    >
                      1. Register Free Account
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <a
                      href={buildAuthRedirectUrl('login')}
                      onClick={saveDraftForAuth}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Sign In
                    </a>
                  </div>
                </form>
              </section>

              <aside className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm sm:p-8 flex flex-col justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-300">
                    How it works
                  </span>
                  <h3 className="mt-3 text-xl font-bold">
                    No need to choose between Storefront or Marketplace at signup
                  </h3>
                  <ul className="mt-5 space-y-3.5 text-sm text-slate-300">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                      <span>
                        <strong className="text-white">1. Register</strong> — one account for Marketplace, Storefront, and POS.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                      <span>
                        <strong className="text-white">2. Create store</strong> — just your store name and main category.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                      <span>
                        <strong className="text-white">3. Add first product</strong> — one shared catalog and inventory.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                      <span>
                        <strong className="text-white">4. Live on Rentify Marketplace 🎉</strong> — start selling for $0/mo.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 rounded-2xl bg-white/10 p-4 text-xs text-slate-200">
                  <p className="font-semibold text-white">5. Upgrade from your dashboard when ready:</p>
                  <p className="mt-1">
                    Pick a website template or open POS at your counter anytime — both unlock Starter with a 14-day free trial.
                  </p>
                </div>
              </aside>
            </div>
          ) : currentStep <= 2 && !existingStore ? (
            /* STEP 2: CREATE STORE (AUTHENTICATED) */
            <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Step 2 of 4 • Create Store
              </div>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">
                Name your store & pick a main category
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Your store starts on the Free plan ($0/mo) with one unified catalog.
              </p>

              <form onSubmit={handleCreateStore} className="mt-6 space-y-5">
                <label className="block text-sm font-semibold text-slate-800">
                  Store name
                  <input
                    required
                    maxLength={120}
                    placeholder="e.g. Khmer Artisan Market"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 hover:border-slate-400"
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-800">
                  Primary category
                  <div className="relative mt-1.5">
                    <select
                    required
                    value={primaryCategory}
                    onChange={(event) => setPrimaryCategory(event.target.value)}
                    className={`h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-4 pr-11 text-base font-normal sm:text-sm transition-all duration-200 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 hover:border-slate-400 cursor-pointer ${primaryCategory ? 'text-slate-900' : 'text-slate-400'}`}
                  >
                    <option value="">Choose a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category} className="text-slate-900">
                        {category}
                      </option>
                    ))}
                  </select>
                    <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={submittingStore || !categories.length}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingStore ? 'Creating your Store…' : 'Create Store & Continue'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </section>
          ) : currentStep === 3 && existingStore ? (
            /* STEP 3: ADD FIRST PRODUCT */
            <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Step 3 of 4 • Add First Product
                </span>
                <span className="text-xs font-medium text-slate-500">
                  Store: <strong className="text-slate-800">{existingStore.name}</strong>
                </span>
              </div>

              <h2 className="mt-3 text-2xl font-bold text-slate-900">
                Add your first product
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Products belong to your store catalog and automatically sync across Rentify Marketplace, your future storefront, and POS.
              </p>

              <form onSubmit={handleCreateFirstProduct} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Product name
                    <input
                      required
                      maxLength={200}
                      placeholder="e.g. Handwoven Silk Scarf"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 hover:border-slate-400"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    Price (USD)
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="15.00"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 hover:border-slate-400"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-800">
                    Available stock
                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={productStock}
                      onChange={(e) => setProductStock(e.target.value)}
                      className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 hover:border-slate-400"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Short description (optional)
                    <textarea
                      rows={2}
                      placeholder="Describe your item for shoppers…"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 hover:border-slate-400"
                    />
                  </label>
                </div>

                <div>
                  <span className="block text-sm font-semibold text-slate-800">
                    Product photo (optional)
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1.5 flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 p-3 text-left hover:border-blue-500 hover:bg-blue-50/40"
                  >
                    {productImagePreview ? (
                      <img
                        src={productImagePreview}
                        alt="Product preview"
                        className="h-12 w-12 rounded-lg object-cover border"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <ImagePlus className="h-5 w-5" />
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {productImagePreview ? 'Change product photo' : 'Upload a product photo'}
                      </p>
                      <p className="text-xs text-slate-500">PNG, JPG, or WebP</p>
                    </div>
                  </button>
                </div>

                <div className="pt-3 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={submittingProduct}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submittingProduct ? 'Publishing product…' : 'Save Product & Go Live'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Skip for now
                  </button>
                </div>
              </form>
            </section>
          ) : (
            /* STEP 4: YOU'RE LIVE ON RENTIFY MARKETPLACE + STEP 5 DASHBOARD CHECKLIST */
            <div className="space-y-6">
              <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    Step 4 Complete
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Current Plan: Free ($0/mo)
                  </span>
                </div>

                <h2 className="mt-4 text-2xl font-extrabold text-slate-950 sm:text-3xl">
                  You’re live on Rentify Marketplace 🎉{' '}
                  <span className="text-base font-medium text-slate-500">
                    (after seller approval)
                  </span>
                </h2>
                <p className="mt-2 text-slate-600">
                  Your store <strong>{existingStore?.name}</strong> ({existingStore?.primaryCategory}) is set up with one unified catalog
                  {createdProduct ? ` and your first product "${createdProduct.name}" is saved` : ''}.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={`${DASHBOARD_URL}/overview`}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Open Merchant Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <a
                    href={marketplaceStoreUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-400 px-5 py-3.5 text-sm font-bold text-amber-950 shadow-sm hover:bg-amber-300"
                  >
                    <ShoppingBag className="h-4 w-4 text-amber-950" />
                    View Shop on Marketplace
                    <ArrowUpRight className="h-4 w-4 text-amber-950" />
                  </a>
                  <Link
                    to={`/onboarding/${requestedPlan}?step=template`}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-5 py-3.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <Globe className="h-4 w-4" />
                    Get Your Own Website (14-Day Free Trial)
                  </Link>
                </div>
              </section>

              {/* Step 5: Dashboard Checklist Preview */}
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      Step 5 • Dashboard Checklist
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">
                      Upgrade when ready
                    </h3>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                    Both unlock Starter (≈$5/mo) • 14-day free trial
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  <div
                    onClick={() => setSelectedChannel('marketplace')}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                      selectedChannel === 'marketplace'
                        ? 'border-emerald-300 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70'
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white">
                          <Check className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              Store and one catalog ({existingStore?.name})
                            </p>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                              <ShoppingBag className="h-3 w-3 text-emerald-700" />
                              Active Channel
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">
                            Sell on Rentify Marketplace • Commission only on marketplace orders
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-semibold text-emerald-700">Included in Free</span>
                        <a
                          href={marketplaceStoreUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-400 px-3.5 py-2 text-xs font-bold text-amber-950 shadow-sm transition-all hover:bg-amber-300"
                        >
                          <ShoppingBag className="h-3.5 w-3.5 text-amber-950" />
                          View on Marketplace
                          <ArrowUpRight className="h-3.5 w-3.5 text-amber-950" />
                        </a>
                      </div>
                    </div>

                    {/* Dedicated shop link box when selected */}
                    {selectedChannel === 'marketplace' && (
                      <div className="mt-3.5 rounded-xl border border-amber-200/90 bg-white/95 p-3.5 shadow-xs">
                        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                              <ShoppingBag className="h-3 w-3 text-amber-600" />
                              Your Shop on Rentify Marketplace
                            </span>
                            <a
                              href={marketplaceStoreUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5 block truncate font-mono text-xs font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
                            >
                              {marketplaceDisplayUrl}
                            </a>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCopyMarketplaceUrl}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              {copiedMarketplace ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  <span className="font-semibold text-emerald-700">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                                  <span>Copy Link</span>
                                </>
                              )}
                            </button>
                            <a
                              href={marketplaceStoreUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                            >
                              <span>Open Shop Page</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 bg-white text-transparent">
                        <Check className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Get your own website → pick template → live on{' '}
                          <span className="font-mono text-blue-600">{storefrontDomain}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          Unlocks Starter (14-day free trial) • Uses your same store catalog
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/onboarding/${requestedPlan}?step=template`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Pick Template
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 bg-white text-transparent">
                        <Check className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Sell at your counter → open POS
                        </p>
                        <p className="text-xs text-slate-500">
                          Unlocks Starter (14-day free trial) • Instant KHQR & cash checkout synced with your inventory
                        </p>
                      </div>
                    </div>
                    <a
                      href={posUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      Open POS
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

