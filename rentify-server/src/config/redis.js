const Redis = require('ioredis');

class RedisClient {
  constructor() {
    this.client = null;
  }

  async connect() {
    if (this.client) return this.client;

    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: 0, // Default DB for API 3001 (merchant)
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    };

    this.client = new Redis(redisConfig);

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully');
    });

    await this.client.ping();
    return this.client;
  }

  getClient() {
    if (!this.client) {
      throw new Error('Redis not connected');
    }
    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}

// Create separate instances for different servers
const merchantRedis = new RedisClient();
const customerRedis = new RedisClient();

// For server 3001 (merchant API) - DB 0
const getMerchantRedis = async () => {
  return merchantRedis.connect();
};

// For server 4000 (customer API) - DB 1
const getCustomerRedis = async () => {
  await customerRedis.connect();
  // Switch to DB 1 for customer API
  await customerRedis.client.select(1);
  return customerRedis;
};

module.exports = {
  getMerchantRedis,
  getCustomerRedis,
  merchantRedis,
  customerRedis,
};