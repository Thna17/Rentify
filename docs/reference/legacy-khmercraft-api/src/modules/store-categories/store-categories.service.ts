import mongoose from 'mongoose';
import Product from '../../../models/Product';
import Store from '../../../models/Store';
import StoreCategory, { IStoreCategory, IStoreSubcategory } from '../../../models/StoreCategory';
import { AppError } from '../../errors/app-error';
import { findOwnedStore } from '../sellers/sellers.service';
import { slugify } from '../../utils/slugify';
import {
  CreateStoreCategoryInput,
  CreateSubcategoryInput,
  ReorderInput,
  UpdateStoreCategoryInput,
  UpdateSubcategoryInput,
} from './store-categories.validation';

const toSubcategoryResponse = (sub: IStoreSubcategory) => ({
  id: String(sub._id),
  name: sub.name,
  slug: sub.slug,
  visible: sub.visible,
  sortOrder: sub.sortOrder,
});

const toOwnerCategory = (category: IStoreCategory) => ({
  id: String(category._id),
  storeId: String(category.storeId),
  name: category.name,
  slug: category.slug,
  description: category.description ?? null,
  imageUrl: category.imageUrl ?? null,
  visible: category.visible,
  sortOrder: category.sortOrder,
  subcategories: [...category.subcategories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toSubcategoryResponse),
});

/** Hides anything a shopper has no reason to see: hidden categories, hidden subcategories. */
const toPublicCategory = (category: IStoreCategory) => ({
  id: String(category._id),
  name: category.name,
  slug: category.slug,
  description: category.description ?? null,
  imageUrl: category.imageUrl ?? null,
  subcategories: category.subcategories
    .filter((sub) => sub.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toSubcategoryResponse),
});

export type OwnerStoreCategory = ReturnType<typeof toOwnerCategory>;
export type PublicStoreCategory = ReturnType<typeof toPublicCategory>;

/** Unique within one store's own list; suffix on collision, same pattern as product/store slugs. */
const uniqueCategorySlug = async (storeId: mongoose.Types.ObjectId, name: string): Promise<string> => {
  const base = slugify(name);
  let slug = base;
  for (let attempt = 2; await StoreCategory.exists({ storeId, slug }); attempt += 1) {
    slug = `${base}-${attempt}`;
  }
  return slug;
};

const uniqueSubcategorySlug = (category: IStoreCategory, name: string): string => {
  const base = slugify(name);
  const taken = new Set(category.subcategories.map((sub) => sub.slug));
  let slug = base;
  for (let attempt = 2; taken.has(slug); attempt += 1) {
    slug = `${base}-${attempt}`;
  }
  return slug;
};

/** Resolves id-or-slug the same way `sellers.service.ts#getPublicStore` does. */
const resolveStoreId = async (idOrSlug: string): Promise<mongoose.Types.ObjectId> => {
  const store = mongoose.isValidObjectId(idOrSlug)
    ? await Store.findById(idOrSlug)
    : await Store.findOne({ slug: idOrSlug });
  if (!store || store.onboardingStatus !== 'COMPLETED') {
    throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND');
  }
  return store._id as mongoose.Types.ObjectId;
};

export const listPublicCategories = async (storeIdOrSlug: string) => {
  const storeId = await resolveStoreId(storeIdOrSlug);
  const categories = await StoreCategory.find({ storeId, visible: true }).sort({ sortOrder: 1 });
  return categories.map(toPublicCategory);
};

export const listOwnerCategories = async (storeId: string, userId: string) => {
  const store = await findOwnedStore(storeId, userId);
  const categories = await StoreCategory.find({ storeId: store._id }).sort({ sortOrder: 1 });
  return categories.map(toOwnerCategory);
};

const findOwnedCategory = async (
  storeId: string,
  userId: string,
  categoryId: string,
): Promise<IStoreCategory> => {
  const store = await findOwnedStore(storeId, userId);
  if (!mongoose.isValidObjectId(categoryId)) {
    throw new AppError(404, 'Category not found', 'STORE_CATEGORY_NOT_FOUND');
  }
  const category = await StoreCategory.findOne({ _id: categoryId, storeId: store._id });
  if (!category) {
    throw new AppError(404, 'Category not found', 'STORE_CATEGORY_NOT_FOUND');
  }
  return category;
};

export const createCategory = async (
  storeId: string,
  userId: string,
  input: CreateStoreCategoryInput,
) => {
  const store = await findOwnedStore(storeId, userId);
  const count = await StoreCategory.countDocuments({ storeId: store._id });

  const category = await StoreCategory.create({
    storeId: store._id,
    name: input.name,
    slug: await uniqueCategorySlug(store._id as mongoose.Types.ObjectId, input.name),
    description: input.description,
    imageUrl: input.imageUrl,
    sortOrder: count,
  });

  return toOwnerCategory(category);
};

export const updateCategory = async (
  storeId: string,
  userId: string,
  categoryId: string,
  input: UpdateStoreCategoryInput,
) => {
  const category = await findOwnedCategory(storeId, userId, categoryId);

  if (input.name !== undefined && input.name !== category.name) {
    category.name = input.name;
    category.slug = await uniqueCategorySlug(category.storeId, input.name);
  }
  if (input.description !== undefined) category.description = input.description ?? undefined;
  if (input.imageUrl !== undefined) category.imageUrl = input.imageUrl ?? undefined;
  if (input.visible !== undefined) category.visible = input.visible;
  if (input.sortOrder !== undefined) category.sortOrder = input.sortOrder;

  await category.save();
  return toOwnerCategory(category);
};

export const reorderCategories = async (storeId: string, userId: string, input: ReorderInput) => {
  const store = await findOwnedStore(storeId, userId);
  const owned = await StoreCategory.countDocuments({
    _id: { $in: input.orderedIds },
    storeId: store._id,
  });
  if (owned !== input.orderedIds.length) {
    throw new AppError(422, 'One or more categories do not belong to this store', 'INVALID_CATEGORY_IDS');
  }

  await Promise.all(
    input.orderedIds.map((id, index) =>
      StoreCategory.updateOne({ _id: id }, { $set: { sortOrder: index } }),
    ),
  );

  const categories = await StoreCategory.find({ storeId: store._id }).sort({ sortOrder: 1 });
  return categories.map(toOwnerCategory);
};

/**
 * Delete rather than orphan: any product pointed at this category (or one of
 * its subcategories) gets its reference cleared first, the same
 * denormalization-sync approach `sellers.service.ts#updateStoreProfile`
 * already uses when a store's name/location changes.
 */
export const deleteCategory = async (storeId: string, userId: string, categoryId: string) => {
  const category = await findOwnedCategory(storeId, userId, categoryId);

  await Product.updateMany(
    { storeCategoryId: category._id },
    { $unset: { storeCategoryId: '', storeSubcategoryId: '' } },
  );
  await StoreCategory.deleteOne({ _id: category._id });
};

export const addSubcategory = async (
  storeId: string,
  userId: string,
  categoryId: string,
  input: CreateSubcategoryInput,
) => {
  const category = await findOwnedCategory(storeId, userId, categoryId);

  category.subcategories.push({
    _id: new mongoose.Types.ObjectId(),
    name: input.name,
    slug: uniqueSubcategorySlug(category, input.name),
    visible: true,
    sortOrder: category.subcategories.length,
  } as IStoreSubcategory);

  await category.save();
  return toOwnerCategory(category);
};

const findOwnedSubcategory = async (
  storeId: string,
  userId: string,
  categoryId: string,
  subcategoryId: string,
) => {
  const category = await findOwnedCategory(storeId, userId, categoryId);
  const subcategory = category.subcategories.id(subcategoryId);
  if (!subcategory) {
    throw new AppError(404, 'Subcategory not found', 'STORE_SUBCATEGORY_NOT_FOUND');
  }
  return { category, subcategory };
};

export const updateSubcategory = async (
  storeId: string,
  userId: string,
  categoryId: string,
  subcategoryId: string,
  input: UpdateSubcategoryInput,
) => {
  const { category, subcategory } = await findOwnedSubcategory(storeId, userId, categoryId, subcategoryId);

  if (input.name !== undefined && input.name !== subcategory.name) {
    subcategory.name = input.name;
    subcategory.slug = uniqueSubcategorySlug(category, input.name);
  }
  if (input.visible !== undefined) subcategory.visible = input.visible;
  if (input.sortOrder !== undefined) subcategory.sortOrder = input.sortOrder;

  await category.save();
  return toOwnerCategory(category);
};

export const reorderSubcategories = async (
  storeId: string,
  userId: string,
  categoryId: string,
  input: ReorderInput,
) => {
  const category = await findOwnedCategory(storeId, userId, categoryId);
  const ownedIds = new Set(category.subcategories.map((sub) => String(sub._id)));
  if (!input.orderedIds.every((id) => ownedIds.has(id)) || input.orderedIds.length !== category.subcategories.length) {
    throw new AppError(
      422,
      'The ordered list must contain exactly this category\'s subcategories',
      'INVALID_SUBCATEGORY_IDS',
    );
  }

  input.orderedIds.forEach((id, index) => {
    const sub = category.subcategories.id(id);
    if (sub) sub.sortOrder = index;
  });

  await category.save();
  return toOwnerCategory(category);
};

export const deleteSubcategory = async (
  storeId: string,
  userId: string,
  categoryId: string,
  subcategoryId: string,
) => {
  const { category, subcategory } = await findOwnedSubcategory(storeId, userId, categoryId, subcategoryId);

  await Product.updateMany(
    { storeSubcategoryId: subcategory._id },
    { $unset: { storeSubcategoryId: '' } },
  );
  category.subcategories.pull(subcategoryId);
  await category.save();
  return toOwnerCategory(category);
};
