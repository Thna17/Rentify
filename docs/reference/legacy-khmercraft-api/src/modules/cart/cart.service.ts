import mongoose from 'mongoose';
import Cart, { ICart } from '../../../models/Cart';
import Product, { IProduct } from '../../../models/Product';
import { AppError } from '../../errors/app-error';

export const FREE_DELIVERY_THRESHOLD = 50;
export const DELIVERY_FEE = 3.5;

/** Money in JS drifts; keep every derived amount at two decimals. */
export const round = (value: number) => Math.round(value * 100) / 100;

export const deliveryFeeFor = (subtotal: number) =>
  subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;

/**
 * Build the response for a cart, pricing every line from the product document.
 *
 * Prices are never read from the cart itself — see the note in models/Cart.ts.
 * Lines whose product has since been deleted are dropped rather than crashing
 * the response.
 */
export const toCartResponse = async (cart: ICart) => {
  const productIds = cart.items.map((item) => item.productId);
  const products = await Product.find({
    _id: mongoose.trusted({ $in: productIds }),
  });
  const byId = new Map<string, IProduct>(
    products.map((product) => [String(product._id), product]),
  );

  const items = cart.items.flatMap((item) => {
    const product = byId.get(String(item.productId));
    if (!product) {
      return [];
    }
    return [
      {
        id: String(item._id),
        productId: String(product._id),
        productName: product.name,
        productSlug: product.slug,
        productImage: product.image ?? product.images[0] ?? null,
        // TODO(seller-branch): replace with populated Seller data.
        sellerId: product.sellerId ? String(product.sellerId) : null,
        sellerName: product.sellerName,
        storeName: product.storeName ?? null,
        price: product.price,
        quantity: item.quantity,
        subtotal: round(product.price * item.quantity),
        stock: product.stock,
        status: product.status,
      },
    ];
  });

  const subtotal = round(items.reduce((sum, item) => sum + item.subtotal, 0));
  const deliveryFee = deliveryFeeFor(subtotal);

  return {
    id: String(cart._id),
    userId: String(cart.userId),
    items,
    subtotal,
    deliveryFee,
    total: round(subtotal + deliveryFee),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
};

/** Every cart route needs the user's cart; create an empty one on first use. */
export const getOrCreateCart = async (userId: string): Promise<ICart> => {
  const existing = await Cart.findOne({ userId });
  if (existing) {
    return existing;
  }
  return Cart.create({ userId, items: [] });
};

const loadPurchasableProduct = async (productId: string): Promise<IProduct> => {
  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  }

  const product = await Product.findById(productId);
  if (!product || product.status !== 'ACTIVE') {
    throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  }
  if (product.stock <= 0) {
    throw new AppError(409, 'This product is out of stock', 'OUT_OF_STOCK');
  }
  return product;
};

export const addItem = async (
  userId: string,
  productId: string,
  quantity: number,
) => {
  const product = await loadPurchasableProduct(productId);
  const cart = await getOrCreateCart(userId);

  const existing = cart.items.find(
    (item) => String(item.productId) === String(product._id),
  );
  const requested = (existing?.quantity ?? 0) + quantity;

  if (requested > product.stock) {
    throw new AppError(
      409,
      `Only ${product.stock} left in stock`,
      'INSUFFICIENT_STOCK',
      { available: product.stock, requested },
    );
  }

  if (existing) {
    existing.quantity = requested;
  } else {
    cart.items.push({ productId: product._id, quantity } as never);
  }

  await cart.save();
  return toCartResponse(cart);
};

export const updateItem = async (
  userId: string,
  itemId: string,
  quantity: number,
) => {
  const cart = await getOrCreateCart(userId);
  const item = mongoose.isValidObjectId(itemId)
    ? cart.items.id(itemId)
    : null;

  if (!item) {
    throw new AppError(404, 'Cart item not found', 'CART_ITEM_NOT_FOUND');
  }

  const product = await Product.findById(item.productId);
  if (!product) {
    throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  }
  if (quantity > product.stock) {
    throw new AppError(
      409,
      `Only ${product.stock} left in stock`,
      'INSUFFICIENT_STOCK',
      { available: product.stock, requested: quantity },
    );
  }

  item.quantity = quantity;
  await cart.save();
  return toCartResponse(cart);
};

export const removeItem = async (userId: string, itemId: string) => {
  const cart = await getOrCreateCart(userId);
  const item = mongoose.isValidObjectId(itemId) ? cart.items.id(itemId) : null;

  if (!item) {
    throw new AppError(404, 'Cart item not found', 'CART_ITEM_NOT_FOUND');
  }

  item.deleteOne();
  await cart.save();
  return toCartResponse(cart);
};

export const clearCart = async (userId: string) => {
  const cart = await getOrCreateCart(userId);
  cart.items.splice(0, cart.items.length);
  await cart.save();
  return toCartResponse(cart);
};

export const getCart = async (userId: string) =>
  toCartResponse(await getOrCreateCart(userId));
