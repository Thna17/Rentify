import mongoose, { Document, Model, Schema } from 'mongoose';

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  'COD',
  'ABA_PAYWAY',
  'ABA_DEMO',
  'STRIPE_SANDBOX',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Order lines DO copy the price and product details, unlike cart lines.
 *
 * An order is a historical record: if the seller later changes the price or
 * renames the product, what the buyer actually agreed to must not change with
 * it. The values are written from the database at order time, never from the
 * request body.
 */
export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  productImage?: string;
  sellerId?: mongoose.Types.ObjectId;
  /** Copied from Product.sellerUserId so orders can be routed to a seller. */
  sellerUserId?: mongoose.Types.ObjectId;
  sellerName: string;
  storeName?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

/** One entry per status change, so an order can explain its own history. */
export interface IStatusEvent {
  status: OrderStatus;
  at: Date;
  /** Who moved it: the buyer, a seller, or the system. */
  by: 'BUYER' | 'SELLER' | 'ADMIN' | 'SYSTEM';
  byUserId?: mongoose.Types.ObjectId;
  note?: string;
}

export interface IDeliveryInfo {
  fullName: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  note?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  buyerId: mongoose.Types.ObjectId;
  buyerName: string;
  buyerPhone: string;
  items: IOrderItem[];
  deliveryInfo: IDeliveryInfo;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  /**
   * The transaction id handed to the payment provider at checkout — how its
   * webhook callback is matched back to this order. Not the same field as
   * `orderNumber`: a buyer could in principle retry payment on the same
   * order, so this is regenerated per attempt rather than reusing the order
   * number directly against the gateway.
   */
  paymentTranId?: string;
  orderStatus: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  statusHistory: IStatusEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    productImage: { type: String },
    sellerId: { type: Schema.Types.ObjectId, ref: 'Store' },
    sellerUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    sellerName: { type: String, required: true },
    storeName: { type: String },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const DeliveryInfoSchema = new Schema<IDeliveryInfo>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
  },
  { _id: false },
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    buyerName: { type: String, required: true },
    buyerPhone: { type: String, required: true },

    items: { type: [OrderItemSchema], required: true },
    deliveryInfo: { type: DeliveryInfoSchema, required: true },

    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'PENDING',
      required: true,
    },
    paymentTranId: { type: String, index: true, sparse: true },
    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'PENDING',
      required: true,
    },

    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    statusHistory: {
      type: [
        new Schema<IStatusEvent>(
          {
            status: { type: String, enum: ORDER_STATUSES, required: true },
            at: { type: Date, required: true },
            by: {
              type: String,
              enum: ['BUYER', 'SELLER', 'ADMIN', 'SYSTEM'],
              required: true,
            },
            byUserId: { type: Schema.Types.ObjectId, ref: 'User' },
            note: { type: String, maxlength: 500 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

// "My orders", newest first.
OrderSchema.index({ buyerId: 1, createdAt: -1 });
// The seller order desk: orders containing one of my products, newest first.
OrderSchema.index({ 'items.sellerUserId': 1, createdAt: -1 });

const OrderModel: Model<IOrder> =
  (mongoose.models.Order as Model<IOrder>) ||
  mongoose.model<IOrder>('Order', OrderSchema);

export default OrderModel;
