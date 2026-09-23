const Redis = require('ioredis');

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    retryStrategy: (times) => Math.min(times * 50, 2000),
};

const redisClient = new Redis(redisConfig);
const redisSubscriber = new Redis(redisConfig); // Separate connection for subs

redisClient.on('connect', () => console.log('Redis Client Connected'));
redisClient.on('error', (err) => console.error('Redis Client Error', err));

redisSubscriber.on('connect', () => console.log('Redis Subscriber Connected'));
redisSubscriber.on('error', (err) => console.error('Redis Subscriber Error', err));

module.exports = {
    redisClient,
    redisSubscriber
};
