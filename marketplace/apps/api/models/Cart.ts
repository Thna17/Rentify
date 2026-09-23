import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * A cart line stores only the product reference and quantity.
 *
 * Price is deliberately NOT copied here: it is read from the product on every
 * response, so a cart cannot lock in a stale price, and a client cannot talk
 * the server into a cheaper total by replaying an old payload.
 */
export interface ICartItem {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
}

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  items: mongoose.Types.DocumentArray<ICartItem & mongoose.Types.Subdocument>;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: true },
);

const CartSchema = new Schema<ICart>(
  {
    // One cart per user. Guests keep their basket in localStorage on the
    // client and it is merged here on sign-in.
    // TODO(guest-cart): add an optional guestId + partial unique index if
    // server-side guest carts are ever needed.
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true },
);

const CartModel: Model<ICart> =
  (mongoose.models.Cart as Model<ICart>) ||
  mongoose.model<ICart>('Cart', CartSchema);

export default CartModel;
