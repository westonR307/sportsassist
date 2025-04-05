
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function cacheGet(key: string) {
  return await redis.get(key);
}

export async function cacheSet(key: string, value: string, expireSeconds = 3600) {
  await redis.set(key, value, 'EX', expireSeconds);
}

export async function cacheDelete(key: string) {
  await redis.del(key);
}
