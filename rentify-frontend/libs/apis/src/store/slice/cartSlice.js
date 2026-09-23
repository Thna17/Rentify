// cartSlice.js - Fixed exports
import { createSlice, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { cartApi } from '../apis/cartApi';

const cartAdapter = createEntityAdapter({
  selectId: (item) => item.id,
});

export const cartSlice = createSlice({
  name: 'cart',
  initialState: cartAdapter.getInitialState({
    updatingItems: {},
    removingItems: {},
    errors: {},
    versionConflict: false,
    lastFetched: 0,
    status: 'idle',
    version: 0,
  }),
  reducers: {
    cartItemUpdated: cartAdapter.updateOne,
    cartItemRemoved: cartAdapter.removeOne,
    cartItemsLoaded: cartAdapter.setAll,
    setUpdating: (state, action) => {
      const { itemId, updating } = action.payload;
      state.updatingItems[itemId] = updating;
    },
    setRemoving: (state, action) => {
      const { itemId, removing } = action.payload;
      state.removingItems[itemId] = removing;
    },
    setError: (state, action) => {
      const { itemId, error } = action.payload;
      if (error) {
        state.errors[itemId] = error;
      } else {
        delete state.errors[itemId];
      }
    },
    // ADD THIS MISSING EXPORT
    clearCartError: (state) => {
      state.errors = {};
    },
    cartApiResultReceived: (state, action) => {
      cartAdapter.setAll(state, action.payload);
    },
    setVersionConflict: (state, action) => {
      state.versionConflict = action.payload;
    },
    setLastFetched: (state) => {
      state.lastFetched = Date.now();
    },
    cartItemAdded: cartAdapter.addOne,
    cartUpdated: (state, { payload }) => {
      cartAdapter.setAll(state, payload.items);
      state.version = payload.version;
      state.lastFetched = Date.now();
      state.status = 'succeeded';
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      cartApi.endpoints.getCart.matchFulfilled,
      (state, { payload }) => {
        cartAdapter.setAll(state, payload.CartItems || []);
      }
    );
  },
});

export const {
  cartItemUpdated,
  cartItemRemoved,
  cartItemsLoaded,
  setUpdating,
  setRemoving,
  setError,
  clearCartError, // NOW EXPORTED
  setVersionConflict,
  setLastFetched,
  cartItemAdded,
  cartUpdated
} = cartSlice.actions;

export const cartSelectors = cartAdapter.getSelectors((state) => state.cart);

export const {
  selectAll: selectAllCartItems,
  selectById: selectCartItemById,
  selectIds: selectCartItemIds
} = cartAdapter.getSelectors(state => state.cart);

export const selectCartSummary = createSelector(
  [selectAllCartItems],
  (items) => {
    const subtotal = items.reduce(
      (total, item) => total + (item.unitPrice || item.Product.price) * item.quantity,
      0
    );
    const shipping = subtotal > 50 ? 0 : 0;
    return {
      subtotal,
      shipping,
      discount: 0,
      total: subtotal + shipping
    };
  }
);

export const selectCartStatus = state => state.cart.status;
export const selectCartVersion = state => state.cart.version;
export const selectCartLastFetched = state => state.cart.lastFetched;

export default cartSlice.reducer;