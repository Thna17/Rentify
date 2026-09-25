import { useCallback, useMemo } from 'react';
import {
  useAddToCartMutation,
  useGetCartQuery,
  useRemoveFromCartMutation,
  useUpdateCartItemMutation,
} from './api';
import { useGetHostedCartQuery, useSetHostedCartItemMutation } from './hostedCartApi';
import { isHostedStorefrontBuyer } from './hostedBuyer';
import { useStorefrontWebsite } from './website';
import { getCartTotals, toAmount } from './commerce';

const EMPTY_LINES = [];

/** Maps a hosted checkout quote line onto the storefront cart-line shape. */
const hostedLine = (line) => ({
  id: line.productId,
  productId: line.productId,
  quantity: line.quantity,
  unitPrice: line.currentPrice ?? line.unitPrice,
  selectedOptions: {},
  available: line.available,
  Product: { ...(line.product || {}), images: line.product?.images || [] },
});

/**
 * Storefront cart.
 *
 * Standard mode: the e-commerce cart keyed to the store customer or, for guests,
 * the storefront session cookie; the API clears it only after an order exists.
 *
 * Hosted buyer mode (`isHostedStorefrontBuyer()`): the Rentify buyer cart from
 * `/api/storefront/:websiteId`, whose quote includes the merchant's delivery
 * fee, the payable total and any issues blocking checkout.
 */
export function useStorefrontCart() {
  const { websiteId } = useStorefrontWebsite();
  const hosted = isHostedStorefrontBuyer();

  const standard = useGetCartQuery(websiteId, { skip: !websiteId || hosted });
  const [addMutation, addState] = useAddToCartMutation();
  const [updateMutation, updateState] = useUpdateCartItemMutation();
  const [removeMutation, removeState] = useRemoveFromCartMutation();

  const hostedQuery = useGetHostedCartQuery(websiteId, { skip: !websiteId || !hosted });
  const [setHostedItem, hostedState] = useSetHostedCartItemMutation();
  const quote = hosted ? hostedQuery.data?.quote || null : null;

  const lines = useMemo(() => {
    if (hosted) return quote?.items?.length ? quote.items.map(hostedLine) : EMPTY_LINES;
    return Array.isArray(standard.data?.CartItems) ? standard.data.CartItems : EMPTY_LINES;
  }, [hosted, quote, standard.data]);
  const totals = useMemo(() => getCartTotals(lines), [lines]);

  const setHostedQuantity = useCallback(
    (productId, quantity) => setHostedItem({ websiteId, productId, quantity }).unwrap(),
    [setHostedItem, websiteId]
  );

  const addItem = useCallback(
    async ({ productId, variantId, quantity = 1, selectedOptions = {} }) => {
      if (!hosted) {
        return addMutation({ websiteId, productId, variantId, quantity, selectedOptions }).unwrap();
      }
      if (variantId || Object.keys(selectedOptions).length) {
        throw { data: { error: 'Products with options are not available for this checkout yet.' } };
      }
      const current = lines.find((line) => line.productId === productId)?.quantity || 0;
      return setHostedQuantity(productId, current + quantity);
    },
    [hosted, addMutation, websiteId, lines, setHostedQuantity]
  );

  const updateQuantity = useCallback(
    (itemId, quantity) =>
      hosted ? setHostedQuantity(itemId, quantity) : updateMutation({ websiteId, itemId, quantity }).unwrap(),
    [hosted, setHostedQuantity, updateMutation, websiteId]
  );

  const removeItem = useCallback(
    (itemId) => (hosted ? setHostedQuantity(itemId, 0) : removeMutation({ websiteId, itemId }).unwrap()),
    [hosted, setHostedQuantity, removeMutation, websiteId]
  );

  const active = hosted ? hostedQuery : standard;
  return {
    websiteId,
    hosted,
    /** Hosted mode only: delivery fee, payable total, readiness and blocking issues. */
    quote: quote
      ? {
          subtotal: toAmount(quote.subtotal),
          deliveryFee: quote.deliveryFee === null ? null : toAmount(quote.deliveryFee),
          totalAmount: quote.totalAmount === null ? null : toAmount(quote.totalAmount),
          rawTotalAmount: quote.totalAmount,
          checkoutReady: Boolean(quote.checkoutReady),
          issues: Array.isArray(quote.issues) ? quote.issues : [],
        }
      : null,
    signedIn: hosted ? hostedQuery.data?.signedIn !== false : true,
    lines,
    totals,
    currency: (hosted ? quote?.currency : standard.data?.currency) || 'USD',
    isLoading: !websiteId || active.isLoading,
    isFetching: active.isFetching,
    isError: active.isError,
    refetch: active.refetch,
    isMutating: addState.isLoading || updateState.isLoading || removeState.isLoading || hostedState.isLoading,
    addItem,
    updateQuantity,
    removeItem,
  };
}
