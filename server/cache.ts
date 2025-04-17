
import { Redis } from 'ioredis';

// Configure Redis client with better error handling and reconnection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true;
    }
    return false;
  }
});

// Handle Redis connection errors
redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

// Log when Redis reconnects
redis.on('reconnecting', () => {
  console.log('Redis reconnecting...');
});

// Basic cache operations
export async function cacheGet(key: string) {
  try {
    return await redis.get(key);
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

export async function cacheSet(key: string, value: string, expireSeconds = 3600) {
  try {
    await redis.set(key, value, 'EX', expireSeconds);
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
  }
}

export async function cacheDelete(key: string) {
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
  }
}

// Advanced caching operations
export async function cacheGetJson<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Cache get JSON error for key ${key}:`, error);
    return null;
  }
}

export async function cacheSetJson<T>(key: string, value: T, expireSeconds = 3600) {
  try {
    const serialized = JSON.stringify(value);
    await redis.set(key, serialized, 'EX', expireSeconds);
  } catch (error) {
    console.error(`Cache set JSON error for key ${key}:`, error);
  }
}

// Pattern-based cache operations
export async function cacheDeletePattern(pattern: string) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error(`Cache delete pattern error for pattern ${pattern}:`, error);
  }
}

// Cache with automatic invalidation helpers
export function getCacheKey(entity: string, id?: number | string, subEntity?: string) {
  if (id && subEntity) {
    return `${entity}:${id}:${subEntity}`;
  } else if (id) {
    return `${entity}:${id}`;
  }
  return entity;
}

// For lists that might be paginated
export function getListCacheKey(entity: string, filters: Record<string, any> = {}, page = 1, pageSize = 20) {
  // Create consistent string from filters
  const filterString = Object.entries(filters)
    .filter(([_, value]) => value !== undefined && value !== null)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  const paginationString = `page=${page}&pageSize=${pageSize}`;
  
  if (filterString) {
    return `${entity}:list:${filterString}:${paginationString}`;
  }
  
  return `${entity}:list:${paginationString}`;
}
