import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User, { UserRole } from '../models/User';
import { hashPassword } from '../src/utils/password';

dotenv.config({ path: '.env.local' });

const TEST_PASSWORD = process.env.AUTH_TEST_PASSWORD ?? 'KhmerCraft123';

const testUsers: Array<{
  name: string;
  email: string;
  phone: string;
  role: UserRole;
}> = [
  {
    name: 'KhmerCraft Test Buyer',
    email: 'buyer.test@khmercraft.local',
    phone: '012000001',
    role: 'BUYER',
  },
  {
    name: 'KhmerCraft Test Seller',
    email: 'seller.test@khmercraft.local',
    phone: '012000002',
    role: 'SELLER',
  },
  {
    name: 'KhmerCraft Test Admin',
    email: 'admin.test@khmercraft.local',
    phone: '012000003',
    role: 'ADMIN',
  },
];

const seed = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured in .env.local');
  }

  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  const passwordHash = await hashPassword(TEST_PASSWORD);

  for (const testUser of testUsers) {
    await User.updateOne(
      { email: testUser.email },
      {
        $set: {
          ...testUser,
          password_hash: passwordHash,
          status: 'ACTIVE',
        },
      },
      { upsert: true },
    );
  }

  console.log(`Seeded ${testUsers.length} authentication test users.`);
};

seed()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
