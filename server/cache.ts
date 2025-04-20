
import { Redis } from 'ioredis';

// Track Redis availability
let redisAvailable = false;
let redis: Redis | null = null;

// Function to create Redis client with better error handling
function createRedisClient() {
  try {
    // Use Upstash Redis configuration
    const client = new Redis({
      host: process.env.REDIS_HOST || 'improved-urchin-24369.upstash.io',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || 'AV8xAAIjcDE2MjY1YTgwZjdkNDA0MjBiYWUxNGUxMWE5NzllY2ZlNXAxMA',
      tls: { rejectUnauthorized: false }, // Required for secure connections
      maxRetriesPerRequest: 2,
      connectTimeout: 2000, // Allow more time for cloud-based Redis
      enableOfflineQueue: false, // Don't queue commands when disconnected
      retryStrategy(times) {
        if (times > 5) {
          console.log(`Redis retry limit reached after ${times} attempts, using fallback storage`);
          return null; // Stop retrying after 5 attempts
        }
        const delay = Math.min(times * 300, 3000);
        return delay;
      },
      reconnectOnError(err) {
        // Only reconnect for specific errors
        const targetErrors = ['READONLY', 'CONNECTION', 'TIMEOUT'];
        for (const errorType of targetErrors) {
          if (err.message.includes(errorType)) {
            return true;
          }
        }
        return false;
      }
    });

    // Handle Redis connection errors
    client.on('error', (error) => {
      console.error('Redis connection error:', error);
      redisAvailable = false;
    });

    // Log when Redis reconnects
    client.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });

    // Mark Redis as available when connected
    client.on('connect', () => {
      console.log('Redis connected successfully');
      redisAvailable = true;
    });

    // Handle Redis connection close
    client.on('close', () => {
      console.log('Redis connection closed');
      redisAvailable = false;
    });

    return client;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    redisAvailable = false;
    return null;
  }
}

// Create Redis client
try {
  redis = createRedisClient();
} catch (error) {
  console.error('Error initializing Redis:', error);
  redis = null;
  redisAvailable = false;
}

// Helper function to check if Redis is available
export function isRedisAvailable() {
  return redisAvailable;
}

// Basic cache operations
export async function cacheGet(key: string) {
  if (!redis || !redisAvailable) return null;
  
  try {
    return await redis?.get(key) || null;
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

export async function cacheSet(key: string, value: string, expireSeconds = 3600) {
  if (!redis || !redisAvailable) return;
  
  try {
    await redis?.set(key, value, 'EX', expireSeconds);
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
  }
}

export async function cacheDelete(key: string) {
  if (!redis || !redisAvailable) return;
  
  try {
    await redis?.del(key);
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
  }
}

// Advanced caching operations
export async function cacheGetJson<T>(key: string): Promise<T | null> {
  if (!redis || !redisAvailable) return null;
  
  try {
    const data = await redis?.get(key) || null;
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Cache get JSON error for key ${key}:`, error);
    return null;
  }
}

export async function cacheSetJson<T>(key: string, value: T, expireSeconds = 3600) {
  if (!redis || !redisAvailable) return;
  
  try {
    const serialized = JSON.stringify(value);
    await redis?.set(key, serialized, 'EX', expireSeconds);
  } catch (error) {
    console.error(`Cache set JSON error for key ${key}:`, error);
  }
}

// Pattern-based cache operations
export async function cacheDeletePattern(pattern: string) {
  if (!redis || !redisAvailable) return;
  
  try {
    const keys = await redis?.keys(pattern) || [];
    if (keys.length > 0) {
      await redis?.del(...keys);
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
