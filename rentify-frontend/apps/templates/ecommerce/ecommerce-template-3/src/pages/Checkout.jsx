import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cartApi, useCreateOrderMutation, useHostedCheckoutMutation } from '@rentify/storefront/api';
import { useStorefrontCart } from '@rentify/storefront/cart';
import { useCustomerSession } from '@rentify/storefront/customer';
import { trackStorefrontEvent } from '@rentify/storefront/analytics';
import { buildOrderRequest, emptyCheckoutDetails, normalizeCambodianPhone } from '@rentify/storefront/checkout';
import { formatMoney, getApiErrorMessage, getLineTotal, getProductImages } from '@rentify/storefront/commerce';
import { useI18n } from '../i18n';
import { PATHS, orderPath } from '../paths';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { buildReceiptSnapshot } from '../receipt';
import { CheckoutForm } from '../components/CheckoutForm';
import { CartSummary } from '../components/CartView';
import { ProductImage } from '../components/ProductImage';
import { ErrorState } from '../components/StatusMessage';

function SummaryLines({ lines, currency }) {
  return (
    <ul className="divide-y divide-border">
      {lines.map((line) => {
        const name = line.Product?.name || '';
        const image = getProductImages(line.ProductVariant, name)[0] || getProductImages(line.Product, name)[0];
        return (
          <li key={line.id} className="flex items-center gap-3 py-3">
            <div className="relative shrink-0">
              <ProductImage src={image?.url} alt="" className="h-14 w-14 rounded-lg" />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[0.6875rem] font-semibold text-secondary-foreground">
                {line.quantity}
              </span>
            </div>
            <p className="min-w-0 flex-1 truncate text-sm text-foreground">{name}</p>
            <p className="text-sm font-medium tabular-nums text-foreground">{formatMoney(getLineTotal(line), currency)}</p>
          </li>
        );
      })}
    </ul>
  );
}

const prefillFromCustomer = (details, customer) => {
  if (!customer) return details;
  const address = customer.shippingAddress && typeof customer.shippingAddress === 'object' ? customer.shippingAddress : {};
  const pick = (current, ...candidates) => current || candidates.find((value) => typeof value === 'string' && value) || '';
  return {
    ...details,
    name: pick(details.name, address.name, customer.name),
    email: pick(details.email, customer.email),
    phone: pick(details.phone, address.phone),
    province: pick(details.province, address.province),
    district: pick(details.district, address.district),
    commune: pick(details.commune, address.commune),
    street: pick(details.street, address.street),
  };
};

export default function Checkout() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useStorefrontCart();
  const { customer } = useCustomerSession();
  const [createOrder, createState] = useCreateOrderMutation();
  const [hostedCheckout, hostedState] = useHostedCheckoutMutation();
  const submitting = createState.isLoading || hostedState.isLoading;
  // Hosted checkout is idempotent per attempt: retries of the same details reuse the key.
  const hostedAttempt = useRef(null);
  const [details, setDetails] = useState(emptyCheckoutDetails);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [submitError, setSubmitError] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const placed = useRef(false);
  const started = useRef(false);
  useDocumentTitle(t('checkout.title'));

  useEffect(() => {
    if (customer) setDetails((current) => prefillFromCustomer(current, customer));
  }, [customer]);

  useEffect(() => {
    if (!started.current && cart.websiteId && cart.lines.length) {
      started.current = true;
      trackStorefrontEvent({ name: 'checkout_started', websiteId: cart.websiteId });
    }
  }, [cart.websiteId, cart.lines.length]);

  const submitHosted = async () => {
    const quote = cart.quote;
    if (!quote?.checkoutReady || !quote.rawTotalAmount) {
      setSubmitError(quote?.issues?.length ? `${t('checkout.failed')} (${quote.issues.join('; ')})` : t('checkout.failed'));
      return;
    }
    const address = [details.street, details.commune, details.district, details.province]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ');
    const body = {
      expectedTotalAmount: quote.rawTotalAmount,
      customerInfo: { name: details.name.trim(), phone: normalizeCambodianPhone(details.phone) || details.phone.trim() },
      shippingInfo: { address },
    };
    const signature = JSON.stringify(body);
    if (hostedAttempt.current?.signature !== signature) {
      hostedAttempt.current = { signature, key: crypto.randomUUID() };
    }
    const result = await hostedCheckout({ websiteId: cart.websiteId, idempotencyKey: hostedAttempt.current.key, ...body }).unwrap();
    const order = result?.order;
    if (!order?.id) throw new Error('missing order');
    placed.current = true;
    trackStorefrontEvent({ name: 'order_completed', websiteId: cart.websiteId, orderId: order.id });
    navigate(orderPath(order.id), { replace: true, state: { placed: true } });
  };

  const submit = async () => {
    setSubmitError('');
    if (cart.hosted) {
      try {
        await submitHosted();
      } catch (error) {
        const detail = getApiErrorMessage(error, '');
        setSubmitError(detail ? `${t('checkout.failed')} (${detail})` : t('checkout.failed'));
      }
      return;
    }
    try {
      const request = buildOrderRequest(cart.websiteId, details, paymentMethod);
      const result = await createOrder(request).unwrap();
      const order = result?.order;
      if (!order?.id) throw new Error('missing order');
      placed.current = true;
      trackStorefrontEvent({ name: 'order_completed', websiteId: cart.websiteId, orderId: order.id });
      navigate(orderPath(order.id), {
        replace: true,
        state: {
          placed: true,
          receipt: buildReceiptSnapshot(result, cart.lines, request.shippingDetails),
          totals: {
            subtotal: order.subtotal,
            taxTotal: order.taxTotal,
            shippingFee: order.shippingFee,
            totalAmount: order.totalAmount,
          },
        },
      });
      // The API empties the cart only after the order is created.
      dispatch(cartApi.util.invalidateTags(['Cart']));
    } catch (error) {
      const detail = getApiErrorMessage(error, '');
      if (paymentMethod === 'KHQR' && /khqr|merchant configuration/i.test(detail)) {
        setSubmitError(t('checkout.khqrUnavailable'));
      } else {
        setSubmitError(detail ? `${t('checkout.failed')} (${detail})` : t('checkout.failed'));
      }
    }
  };

  if (cart.isLoading) {
    return (
      <div className="store-container py-10" role="status" aria-label={t('common.loading')}>
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }
  if (cart.isError) {
    return (
      <div className="store-container py-10">
        <ErrorState onRetry={cart.refetch} />
      </div>
    );
  }
  if (!cart.lines.length && !placed.current && !submitting) return <Navigate to={PATHS.CART} replace />;

  const summary = (
    <CartSummary totals={cart.totals} quote={cart.quote} currency={cart.currency} leading={<SummaryLines lines={cart.lines} currency={cart.currency} />}>
      <Link to={PATHS.CART} className="inline-block text-sm font-medium text-primary hover:underline">
        {t('checkout.editCart')}
      </Link>
    </CartSummary>
  );

  return (
    <div className="store-container py-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t('checkout.title')}</h1>

      <div className="mt-4 lg:hidden">
        <button
          type="button"
          onClick={() => setSummaryOpen((open) => !open)}
          aria-expanded={summaryOpen}
          aria-controls="mobile-summary"
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm"
        >
          <span className="font-medium text-foreground">
            {summaryOpen ? t('checkout.hideSummary') : t('checkout.showSummary')}
          </span>
          <span className="flex items-center gap-2 font-semibold tabular-nums text-foreground">
            {formatMoney(cart.quote?.totalAmount ?? cart.totals.subtotal, cart.currency)}
            <ChevronDown className={`h-4 w-4 transition-transform ${summaryOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </span>
        </button>
        {summaryOpen && (
          <div id="mobile-summary" className="mt-3">
            {summary}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-start">
        <CheckoutForm
          details={details}
          paymentMethod={paymentMethod}
          paymentMethods={cart.hosted ? ['COD'] : undefined}
          onDetailsChange={setDetails}
          onPaymentMethodChange={(method) => {
            setPaymentMethod(method);
            setSubmitError('');
          }}
          onSubmit={submit}
          submitting={submitting}
          submitError={submitError}
        />
        <aside className="hidden lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:block">{summary}</aside>
      </div>
    </div>
  );
}
