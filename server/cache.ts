
import { Redis } from 'ioredis';

// Track Redis availability to avoid excessive log noise
let redisAvailable = true;
let redisConnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Configure Redis client with better error handling and reconnection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 1, // Reduce retries to prevent hanging operations
  connectTimeout: 2000, // Connect timeout after 2 seconds
  retryStrategy(times) {
    // Only retry a limited number of times to avoid spam
    if (times > MAX_RECONNECT_ATTEMPTS) {
      console.log(`Redis unavailable after ${MAX_RECONNECT_ATTEMPTS} attempts. Cache operations will use fallback mechanisms.`);
      // Return null stops future reconnect attempts until application restart
      return null;
    }
    
    redisConnectAttempts = times;
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
  reconnectOnError(err) {
    return false; // Don't auto-reconnect on error to avoid continuous failed attempts
  }
});

// Handle Redis connection errors
redis.on('error', (error) => {
  if (redisAvailable) {
    console.error('Redis connection error:', error);
    redisAvailable = false;
  } else if (redisConnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
    console.log('Redis reconnecting...');
  }
});

// Log on successful connection
redis.on('connect', () => {
  redisAvailable = true;
  redisConnectAttempts = 0;
  console.log('Redis connected successfully');
});

// Log when Redis reconnects
redis.on('reconnecting', () => {
  if (redisConnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
    console.log('Redis reconnecting...');
  }
});

// Basic cache operations
export async function cacheGet(key: string) {
  if (!redisAvailable) return null;
  
  try {
    return await redis.get(key);
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

export async function cacheSet(key: string, value: string, expireSeconds = 3600) {
  if (!redisAvailable) return;
  
  try {
    await redis.set(key, value, 'EX', expireSeconds);
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
    redisAvailable = false; // Mark as unavailable on error
  }
}

export async function cacheDelete(key: string) {
  if (!redisAvailable) return;
  
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
    redisAvailable = false; // Mark as unavailable on error
  }
}

// Advanced caching operations
export async function cacheGetJson<T>(key: string): Promise<T | null> {
  if (!redisAvailable) return null;
  
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Cache get JSON error for key ${key}:`, error);
    redisAvailable = false; // Mark as unavailable on error
    return null;
  }
}

export async function cacheSetJson<T>(key: string, value: T, expireSeconds = 3600) {
  if (!redisAvailable) return;
  
  try {
    const serialized = JSON.stringify(value);
    await redis.set(key, serialized, 'EX', expireSeconds);
  } catch (error) {
    console.error(`Cache set JSON error for key ${key}:`, error);
    redisAvailable = false; // Mark as unavailable on error
  }
}

// Pattern-based cache operations
export async function cacheDeletePattern(pattern: string) {
  if (!redisAvailable) return;
  
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error(`Cache delete pattern error for pattern ${pattern}:`, error);
    redisAvailable = false; // Mark as unavailable on error
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
