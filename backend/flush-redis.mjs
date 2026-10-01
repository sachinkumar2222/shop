import IORedis from 'ioredis';

const redis = new IORedis('redis://localhost:6379');
await redis.flushdb();
console.log('✅ Redis DB flushed — all stale WhatsApp jobs cleared');
redis.disconnect();
