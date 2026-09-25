const { merchantRedis, customerRedis } = require('../config/redis');

class CacheService {
  constructor(redisInstance, prefix = '') {
    this.redisInstance = redisInstance;
    this.prefix = prefix;
    this.client = null;
  }

  async getClient() {
    if (!this.client) {
      this.client = await this.redisInstance.getClient();
    }
    return this.client;
  }

  async get(key) {
    try {
      const client = await this.getClient();
      const data = await client.get(`${this.prefix}:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      const client = await this.getClient();
      await client.set(
        `${this.prefix}:${key}`,
        JSON.stringify(value),
        'EX',
        ttl
      );
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key) {
    try {
      const client = await this.getClient();
      await client.del(`${this.prefix}:${key}`);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async deletePattern(pattern) {
    try {
      const client = await this.getClient();
      const keys = await client.keys(`${this.prefix}:${pattern}`);
      
      if (keys.length > 0) {
        await client.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  async invalidateWebsiteCache(websiteId) {
    try {
      // Invalidate all cache patterns for this website
      const patterns = [
        `website:*${websiteId}*`,
        `*domain*${websiteId}*`,
        `*user*${websiteId}*`,
        `website:public:domain:*`,
        `website:dashboard:user:*`
      ];
      
      let totalDeleted = 0;
      const client = await this.getClient();
      
      for (const pattern of patterns) {
        const keys = await client.keys(`${this.prefix}:${pattern}`);
        if (keys.length > 0) {
          await client.del(...keys);
          totalDeleted += keys.length;
        }
      }
      
      // Also delete by checking all keys for websiteId
      const allKeys = await client.keys(`${this.prefix}:*`);
      for (const key of allKeys) {
        const value = await client.get(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (parsed.id === websiteId || parsed.websiteId === websiteId || 
                (parsed.userId && parsed.userId === websiteId)) {
              await client.del(key);
              totalDeleted++;
            }
          } catch (e) {
            // Not JSON, skip
          }
        }
      }
      
      console.log(`🗑️ Deleted ${totalDeleted} cache entries for website: ${websiteId}`);
      return totalDeleted;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return 0;
    }
  }

  async invalidateUserCache(userId) {
    return this.deletePattern(`*:${userId}`);
  }

  async getStats() {
    try {
      const client = await this.getClient();
      const stats = {
        total: await client.dbsize(),
        memory: await client.info('memory')
      };
      
      return stats;
    } catch (error) {
      console.error('Stats error:', error);
      return null;
    }
  }
    async setWithIndex(websiteId, key, value, ttl = 3600) {
    try {
      const client = await this.getClient();
      
      // Set the cache value
      await client.set(
        `${this.prefix}:${key}`,
        JSON.stringify(value),
        'EX',
        ttl
      );
      
      // Add to website's index (SET data structure)
      const indexKey = `website:keys:${websiteId}`;
      // ioredis uses lower-case command method names. `sAdd` belongs to the
      // node-redis client and fails at runtime with the client configured here.
      await client.sadd(indexKey, `${this.prefix}:${key}`);
      
      // Set TTL on index (slightly longer than cache TTLs)
      await client.expire(indexKey, ttl + 60);
      
      return true;
    } catch (error) {
      console.error('Cache setWithIndex error:', error);
      return false;
    }
  }
}

// Create cache services for both APIs
let merchantCache = null;
let customerCache = null;

const getMerchantCache = () => {
  if (!merchantCache) {
    merchantCache = new CacheService(merchantRedis, 'merchant');
  }
  return merchantCache;
};

const getCustomerCache = () => {
  if (!customerCache) {
    customerCache = new CacheService(customerRedis, 'customer');
  }
  return customerCache;
};


module.exports = {
  CacheService,
  getMerchantCache,
  getCustomerCache,
};
