import mongoose from 'mongoose';
import Cart from '../../../models/Cart';
import Order, {
  IOrder,
  IOrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../models/Order';
import Product from '../../../models/Product';
import { IUser } from '../../../models/User';
import { AppError } from '../../errors/app-error';
import { deliveryFeeFor, round } from '../cart/cart.service';
import {
  Actor,
  RELEASES_STOCK,
  allowedTransitions,
  canTransition,
} from './order-lifecycle';
import { CreateOrderInput } from './orders.validation';

/**
 * Cash on delivery is unpaid until the courier collects, and ABA PayWay is
 * unpaid until its webhook confirms the transaction — see
 * `modules/payments/payments.service.ts`. The two demo gateways settle
 * immediately because they were never wired to a real provider; they are not
 * offered as a checkout option in the web app any more, but existing test
 * fixtures still reference them.
 */
const initialPaymentStatus = (method: PaymentMethod): PaymentStatus =>
  method === 'COD' || method === 'ABA_PAYWAY' ? 'PENDING' : 'PAID';

/** KC-YYMMDD-XXXXXX — sortable by day, random enough not to be guessable. */
const generateOrderNumber = (): string => {
  const now = new Date();
  const date = [
    String(now.getUTCFullYear()).slice(2),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
  ].join('');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `KC-${date}-${random}`;
};

export const toOrderResponse = (order: IOrder) => ({
  id: String(order._id),
  orderNumber: order.orderNumber,
  buyerId: String(order.buyerId),
  buyerName: order.buyerName,
  buyerPhone: order.buyerPhone,
  items: order.items.map((item) => ({
    productId: String(item.productId),
    productName: item.productName,
    productImage: item.productImage ?? null,
    sellerId: item.sellerId ? String(item.sellerId) : null,
    sellerUserId: item.sellerUserId ? String(item.sellerUserId) : null,
    sellerName: item.sellerName,
    storeName: item.storeName ?? null,
    price: item.price,
    quantity: item.quantity,
    subtotal: item.subtotal,
  })),
  deliveryInfo: order.deliveryInfo,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  // Only meaningful for a live gateway order; the web app uses it to decide
  // whether an already-created order still needs a checkout redirect.
  hasPaymentTranId: Boolean(order.paymentTranId),
  subtotal: order.subtotal,
  deliveryFee: order.deliveryFee,
  totalAmount: order.totalAmount,
  statusHistory: order.statusHistory.map((event) => ({
    status: event.status,
    at: event.at,
    by: event.by,
    note: event.note ?? null,
  })),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

interface RequestedLine {
  productId: string;
  quantity: number;
}

/**
 * Atomically reserve stock for one product.
 *
 * The stock check lives inside the update filter, so two buyers racing for the
 * last item cannot both succeed — one of them gets no document back. Checking
 * stock with a separate read first would leave exactly that gap.
 */
const reserveStock = async (productId: string, quantity: number) =>
  Product.findOneAndUpdate(
    {
      _id: productId,
      status: 'ACTIVE',
      stock: mongoose.trusted({ $gte: quantity }),
    },
    { $inc: { stock: -quantity, soldCount: quantity } },
    { returnDocument: 'after' },
  );

const releaseStock = (productId: mongoose.Types.ObjectId, quantity: number) =>
  Product.updateOne(
    { _id: productId },
    { $inc: { stock: quantity, soldCount: -quantity } },
  );

export const createOrder = async (user: IUser, input: CreateOrderInput) => {
  const userId = String(user._id);

  // Either the caller supplied lines, or we check out their server-side cart.
  let requested: RequestedLine[];
  const usingServerCart = !input.items;

  if (input.items) {
    requested = input.items;
  } else {
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      throw new AppError(400, 'Your cart is empty', 'CART_EMPTY');
    }
    requested = cart.items.map((item) => ({
      productId: String(item.productId),
      quantity: item.quantity,
    }));
  }

  // Collapse duplicate lines so the same product cannot be reserved twice.
  const merged = new Map<string, number>();
  for (const line of requested) {
    if (!mongoose.isValidObjectId(line.productId)) {
      throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }
    merged.set(
      line.productId,
      (merged.get(line.productId) ?? 0) + line.quantity,
    );
  }

  const items: IOrderItem[] = [];
  const reserved: { productId: mongoose.Types.ObjectId; quantity: number }[] = [];

  try {
    for (const [productId, quantity] of merged) {
      const product = await reserveStock(productId, quantity);

      if (!product) {
        // Distinguish "gone" from "not enough left" for a useful message.
        const existing = await Product.findById(productId);
        if (!existing || existing.status !== 'ACTIVE') {
          throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
        }
        throw new AppError(
          409,
          `${existing.name} only has ${existing.stock} left in stock`,
          'INSUFFICIENT_STOCK',
          { productId, available: existing.stock, requested: quantity },
        );
      }

      reserved.push({ productId: product._id as mongoose.Types.ObjectId, quantity });

      // Priced from the database, never from the request.
      items.push({
        productId: product._id as mongoose.Types.ObjectId,
        productName: product.name,
        productImage: product.image ?? product.images[0],
        sellerId: product.sellerId,
        sellerUserId: product.sellerUserId,
        sellerName: product.sellerName,
        storeName: product.storeName,
        price: product.price,
        quantity,
        subtotal: round(product.price * quantity),
      });
    }

    const subtotal = round(items.reduce((sum, item) => sum + item.subtotal, 0));
    const deliveryFee = deliveryFeeFor(subtotal);

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      buyerId: user._id,
      buyerName: user.name,
      buyerPhone: input.deliveryInfo.phone,
      items,
      deliveryInfo: input.deliveryInfo,
      paymentMethod: input.paymentMethod,
      paymentStatus: initialPaymentStatus(input.paymentMethod),
      orderStatus: 'PENDING',
      subtotal,
      deliveryFee,
      totalAmount: round(subtotal + deliveryFee),
      statusHistory: [
        { status: 'PENDING', at: new Date(), by: 'BUYER', byUserId: user._id },
      ],
    });

    if (usingServerCart) {
      await Cart.updateOne({ userId }, { $set: { items: [] } });
    }

    return toOrderResponse(order);
  } catch (error) {
    // Compensating rollback: this deployment has no multi-document
    // transaction, so anything already reserved is handed back before the
    // error propagates. Otherwise a failure halfway through would quietly
    // consume stock for an order that never existed.
    await Promise.all(
      reserved.map(({ productId, quantity }) =>
        releaseStock(productId, quantity),
      ),
    );
    throw error;
  }
};

export const listMyOrders = async (
  userId: string,
  page: number,
  limit: number,
) => {
  const filter = { buyerId: userId };
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  return {
    orders: orders.map(toOrderResponse),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

/**
 * Orders containing at least one product belonging to this seller.
 *
 * An order can span several sellers, so this returns the whole order but marks
 * which lines are the caller's — a seller must be able to see the delivery
 * address and total, but should not be misled about which items are theirs.
 */
export const listSellerOrders = async (
  sellerUserId: string,
  page: number,
  limit: number,
  status?: OrderStatus,
) => {
  const filter: Record<string, unknown> = { 'items.sellerUserId': sellerUserId };
  if (status) {
    filter.orderStatus = status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  return {
    orders: orders.map((order) => ({
      ...toOrderResponse(order),
      myItems: order.items
        .filter((item) => String(item.sellerUserId) === String(sellerUserId))
        .map((item) => ({
          productId: String(item.productId),
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        })),
      myTotal: round(
        order.items
          .filter((item) => String(item.sellerUserId) === String(sellerUserId))
          .reduce((sum, item) => sum + item.subtotal, 0),
      ),
      availableActions: allowedTransitions(order.orderStatus, 'SELLER'),
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

/**
 * Move an order to a new status.
 *
 * The caller's relationship to the order decides what they may do: a buyer can
 * only touch their own order, a seller only an order containing their product.
 * Anything else is a 404 rather than a 403, so neither can probe for the
 * existence of the other's orders.
 */
export const transitionOrder = async (
  actor: Actor,
  actorUserId: string,
  orderId: string,
  next: OrderStatus,
  note?: string,
) => {
  const order = mongoose.isValidObjectId(orderId)
    ? await Order.findById(orderId)
    : await Order.findOne({ orderNumber: orderId.toUpperCase() });

  if (!order) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  const isBuyer = String(order.buyerId) === String(actorUserId);
  const isSeller = order.items.some(
    (item) => String(item.sellerUserId) === String(actorUserId),
  );

  if (actor === 'BUYER' && !isBuyer) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }
  if (actor === 'SELLER' && !isSeller) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  if (order.orderStatus === next) {
    throw new AppError(
      409,
      `This order is already ${next.toLowerCase()}`,
      'ALREADY_IN_STATUS',
    );
  }

  if (!canTransition(order.orderStatus, next, actor)) {
    throw new AppError(
      409,
      `Cannot move an order from ${order.orderStatus} to ${next}`,
      'ILLEGAL_TRANSITION',
      { from: order.orderStatus, to: next, allowed: allowedTransitions(order.orderStatus, actor) },
    );
  }

  // Cancelling puts the stock back. Done before the save so a failure here
  // does not leave an order marked cancelled with its stock still consumed.
  if (RELEASES_STOCK.includes(next)) {
    await Promise.all(
      order.items.map((item) =>
        releaseStock(item.productId, item.quantity),
      ),
    );
  }

  // Cash on delivery settles when it is delivered; nothing else changes here.
  if (next === 'DELIVERED' && order.paymentMethod === 'COD') {
    order.paymentStatus = 'PAID';
  }
  if (next === 'CANCELLED' && order.paymentStatus === 'PAID') {
    order.paymentStatus = 'REFUNDED';
  }

  order.orderStatus = next;
  order.statusHistory.push({
    status: next,
    at: new Date(),
    by: actor,
    byUserId: new mongoose.Types.ObjectId(actorUserId),
    note,
  });

  await order.save();
  return toOrderResponse(order);
};

export const getOrder = async (userId: string, orderId: string) => {
  const order = mongoose.isValidObjectId(orderId)
    ? await Order.findById(orderId)
    : await Order.findOne({ orderNumber: orderId.toUpperCase() });

  // A missing order and someone else's order return the same 404 on purpose:
  // a distinct 403 would confirm that an order id exists.
  if (!order || String(order.buyerId) !== String(userId)) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  return toOrderResponse(order);
};
