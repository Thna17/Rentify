import mongoose, { Document, Model, Schema, Types } from 'mongoose';

/**
 * A seller's own category tree, separate from the marketplace-wide taxonomy
 * (see `Product.category`/`subcategory`, matched against the fixed tree in
 * apps/web/src/app/core/data/categories.data.ts). A product can carry both
 * at once — this is the seller's own organization of their storefront, not
 * a replacement for where the product is discovered marketplace-wide.
 *
 * Subcategories are embedded rather than a separate collection: counts per
 * store are small (tens, not thousands), always edited in the context of
 * "this store's categories" (never queried independently across stores),
 * and a Mongoose subdocument still gets its own stable `_id` for
 * add/rename/delete without a second ownership check. If that ever stops
 * holding, splitting to a real collection later is a straightforward
 * migration — not a reason to over-build this now.
 */
export interface IStoreSubcategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  visible: boolean;
  sortOrder: number;
}

export interface IStoreCategory extends Document {
  storeId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  visible: boolean;
  sortOrder: number;
  subcategories: Types.DocumentArray<IStoreSubcategory>;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSubcategorySchema = new Schema<IStoreSubcategory>({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, trim: true },
  visible: { type: Boolean, default: true },
  sortOrder: { type: Number, required: true, default: 0 },
});

const StoreCategorySchema = new Schema<IStoreCategory>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 500 },
    imageUrl: { type: String },
    visible: { type: Boolean, default: true },
    sortOrder: { type: Number, required: true, default: 0 },
    subcategories: { type: [StoreSubcategorySchema], default: [] },
  },
  { timestamps: true },
);

// A slug only has to be unique within one store's own category list.
StoreCategorySchema.index({ storeId: 1, slug: 1 }, { unique: true });
StoreCategorySchema.index({ storeId: 1, sortOrder: 1 });

const StoreCategoryModel: Model<IStoreCategory> =
  (mongoose.models.StoreCategory as Model<IStoreCategory>) ||
  mongoose.model<IStoreCategory>('StoreCategory', StoreCategorySchema);

export default StoreCategoryModel;
