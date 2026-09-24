import { Express } from 'express';
import Product, { slugify } from '../../models/Product';
import User from '../../models/User';
import { AUTH_COOKIE_NAME, signAccessToken } from '../../src/utils/jwt';
import { hashPassword } from '../../src/utils/password';

export const strongPassword = 'CraftPass123';

interface ProductOverrides {
  name?: string;
  price?: number;
  category?: string;
  sellerName?: string;
  location?: string;
  stock?: number;
  soldCount?: number;
  rating?: number;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  createdAt?: Date;
}

/** Create a product directly, bypassing the API, for arranging test state. */
export const makeProduct = async (overrides: ProductOverrides = {}) => {
  const name = overrides.name ?? 'Test Silk Scarf';
  return Product.create({
    name,
    slug: slugify(name),
    description: overrides.name ? `${name} description` : 'A woven test item',
    price: overrides.price ?? 10,
    category: overrides.category ?? 'Weaving',
    sellerName: overrides.sellerName ?? 'Test Seller',
    storeName: 'Test Store',
    location: overrides.location ?? 'Siem Reap',
    images: [],
    rating: overrides.rating ?? 4.5,
    reviewCount: 10,
    stock: overrides.stock ?? 10,
    soldCount: overrides.soldCount ?? 0,
    status: overrides.status ?? 'ACTIVE',
    ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
  });
};

/**
 * Create a buyer and return a session cookie for authenticated calls.
 *
 * The user is inserted and the token signed directly rather than going through
 * POST /auth/register, because registration is rate limited to 10 per hour per
 * IP — every request in the suite shares one IP, so a helper that registered
 * would start returning 429 partway through the run. These specs are exercising
 * the commerce routes; the auth flow has its own tests.
 */
export const signInBuyer = async (
  _app: Express,
  email = 'buyer@khmercraft.test',
) => {
  const user = await User.create({
    name: 'Sophea Chan',
    email,
    password_hash: await hashPassword(strongPassword),
    phone: '012345678',
    role: 'BUYER',
    status: 'ACTIVE',
  });

  const token = signAccessToken(
    String(user._id),
    user.role,
    user.token_version,
  );

  return {
    cookie: [`${AUTH_COOKIE_NAME}=${token}`],
    userId: String(user._id),
  };
};

export const deliveryInfo = {
  fullName: 'Sophea Chan',
  phone: '012345678',
  province: 'Phnom Penh',
  city: 'Chamkarmon',
  address: '12 Street 240',
};
