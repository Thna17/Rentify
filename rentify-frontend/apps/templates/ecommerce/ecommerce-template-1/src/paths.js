/** Customer-facing routes. Paths match the shared storefront route contract. */
export const PATHS = {
  HOME: '/',
  PRODUCTS: '/products',
  PRODUCT_DETAIL: '/product/:id',
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDER_CONFIRMATION: '/confirmation/:orderId',
  ACCOUNT: '/account',
};

export const productPath = (id) => `/product/${encodeURIComponent(id)}`;
export const orderPath = (id) => `/confirmation/${encodeURIComponent(id)}`;

export const catalogPath = ({ search, category, sort } = {}) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (sort) params.set('sort', sort);
  const query = params.toString();
  return query ? `${PATHS.PRODUCTS}?${query}` : PATHS.PRODUCTS;
};
