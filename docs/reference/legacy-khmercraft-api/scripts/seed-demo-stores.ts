import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

/**
 * Recreates the three demo storefronts — LyLy Snack Store, Cloth Store and
 * Skincare Store — with their products and logos.
 *
 * These were originally uploaded by hand, which meant losing an afternoon's
 * work every time the shared Atlas database was reset. This drives the same
 * public HTTP API a seller would use, so it stays correct as the schema
 * changes and needs no direct database access.
 *
 * Safe to re-run: an account that already exists is signed into rather than
 * recreated, and a product whose name is already listed is skipped.
 *
 * The API must be running.  Run with:  npm run seed:demo
 */

interface DemoStore {
  email: string;
  password: string;
  storeName: string;
  phone: string;
  category: string;
  description: string;
  tagline: string;
  theme: string;
  assets: string;
  logo: string;
  /**
   * [image, subcategory, name, price, stock, description, variants?]
   * where each variant is [label, imageFile] — a colour swatch on the
   * detail page, not a separately sellable SKU.
   */
  products: [
    string,
    string,
    string,
    number,
    number,
    string,
    [string, string][]?,
  ][];
}

const API = process.env.SEED_API_URL ?? (process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:3002');
const ASSETS = path.resolve(__dirname, 'demo-assets');

const dataUri = (folder: string, file: string): string => {
  const buffer = fs.readFileSync(path.join(ASSETS, folder, file));
  return `data:image/webp;base64,${buffer.toString('base64')}`;
};

/** fetch's json() is `unknown` under this tsconfig; narrow it at the call site. */
const json = async <T>(response: Response): Promise<T> =>
  (await response.json()) as T;

interface ApiError {
  error?: { message?: string };
}

/** Collects the session cookie the API sets, so later calls are authenticated. */
const cookieFrom = (response: Response): string =>
  (response.headers.getSetCookie?.() ?? [])
    .map((value) => value.split(';')[0])
    .join('; ');

const seedStore = async (store: DemoStore): Promise<void> => {
  process.stdout.write(`\n${store.storeName}\n`);

  // --- account + store -------------------------------------------------
  let cookie = '';

  const register = await fetch(`${API}/auth/register-seller`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: store.storeName,
      email: store.email,
      password: store.password,
      confirmPassword: store.password,
      phone: store.phone,
      storeName: store.storeName,
      category: store.category,
      description: store.description,
    }),
  });

  if (register.ok) {
    cookie = cookieFrom(register);
    console.log('  account created');
  } else {
    // Already a seller — sign in and top up whatever is missing.
    const login = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: store.email,
        password: store.password,
        expectedRole: 'SELLER',
      }),
    });
    if (!login.ok) {
      const body = await json<ApiError>(login);
      console.error(`  cannot sign in: ${body.error?.message}`);
      return;
    }
    cookie = cookieFrom(login);
    console.log('  account already existed, signed in');
  }

  // --- which store is this seller's? -----------------------------------
  const storesResponse = await fetch(`${API}/api/sellers/my-stores`, {
    headers: { cookie },
  });
  // this endpoint returns a bare array; tolerate a wrapped shape too
  type StoreRef = { id?: string; _id?: string };
  const payload = await json<StoreRef[] | { stores?: StoreRef[] }>(storesResponse);
  const list = Array.isArray(payload) ? payload : (payload.stores ?? []);
  const first = list[0];
  const storeId = first?.id ?? first?._id;
  if (!storeId) {
    console.error('  no store found for this seller');
    return;
  }

  // --- logo + profile ---------------------------------------------------
  // Applied on every run, not just on creation: a half-seeded store (account
  // present, logo missing) should be repaired by running this again.
  {
    await fetch(`${API}/api/sellers/my-stores/${storeId}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({
        logoUrl: dataUri(store.assets, store.logo),
        storeTagline: store.tagline,
        location: 'Phnom Penh',
        phoneNumber: store.phone,
        theme: store.theme,
        showContact: true,
      }),
    });
    console.log('  logo and profile set');
  }

  // --- products ---------------------------------------------------------
  const existingResponse = await fetch(`${API}/api/products/mine?limit=60`, {
    headers: { cookie },
  });
  const listed = await json<{ products?: { name: string }[] }>(existingResponse);
  const existing = new Set<string>(
    (listed.products ?? []).map((product) => product.name),
  );

  let added = 0;
  let skipped = 0;
  for (const [
    image,
    subcategory,
    name,
    price,
    stock,
    description,
    variants,
  ] of store.products) {
    if (existing.has(name)) {
      skipped += 1;
      continue;
    }
    const response = await fetch(`${API}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({
        name,
        description,
        price,
        category: store.category,
        subcategory,
        stock,
        status: 'ACTIVE',
        storeId,
        location: 'Phnom Penh',
        image: dataUri(store.assets, image),
        variants: (variants ?? []).map(([label, file]) => ({
          label,
          image: dataUri(store.assets, file),
        })),
      }),
    });
    if (response.ok) added += 1;
    else {
      const body = await json<ApiError>(response);
      console.error(`  failed: ${name} - ${body.error?.message}`);
    }
  }
  console.log(`  products: ${added} added, ${skipped} already listed`);
};

const run = async () => {
  const health = await fetch(`${API}/health`).catch(() => null);
  if (!health?.ok) {
    console.error(`API is not responding at ${API}. Start it with: npm run dev`);
    process.exit(1);
  }

  const stores: DemoStore[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'demo-stores.json'), 'utf8'),
  );

  for (const store of stores) {
    await seedStore(store);
  }

  console.log('\nDone. Sign in at /seller/login with any of:');
  for (const store of stores) {
    console.log(`  ${store.email}  ${store.password}`);
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
