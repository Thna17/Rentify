import { useCallback } from 'react';
import { useStorefrontCart } from '@rentify/storefront/cart';
import { trackStorefrontEvent } from '@rentify/storefront/analytics';
import { getApiErrorMessage } from '@rentify/storefront/commerce';
import { useI18n } from '../i18n';
import { useCartFeedback } from '../components/CartFeedback';

/**
 * Adds a product (or selected variant) to the server cart, emits the
 * add_to_cart analytics event and shows feedback. Rejects on failure so
 * callers can reset their own pending state.
 */
export function useAddToCart() {
  const { t } = useI18n();
  const { addItem, websiteId } = useStorefrontCart();
  const { notify } = useCartFeedback();

  return useCallback(
    async ({ product, variantId, quantity = 1, selectedOptions = {} }) => {
      try {
        await addItem({ productId: product.id, variantId, quantity, selectedOptions });
        trackStorefrontEvent({ name: 'add_to_cart', websiteId, productId: product.id, quantity });
        notify({ tone: 'success', text: t('cart.addedToast', { name: product.name }) });
      } catch (error) {
        notify({ tone: 'error', text: getApiErrorMessage(error, t('cart.updateFailed')) });
        throw error;
      }
    },
    [addItem, notify, t, websiteId]
  );
}
