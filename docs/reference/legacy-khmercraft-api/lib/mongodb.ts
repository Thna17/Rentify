import mongoose from 'mongoose';

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  // In Express, we can just connect once at startup
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  // Force IPv4, which often fixes ECONNREFUSED DNS issues on Windows
  return mongoose.connect(MONGODB_URI, { family: 4 });
}

export default dbConnect;
