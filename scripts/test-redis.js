// Test script to verify Redis connection to Upstash
import Redis from 'ioredis';

// Define Redis connection details
const redisHost = process.env.REDIS_HOST || 'improved-urchin-24369.upstash.io';
const redisPort = process.env.REDIS_PORT || 6379;
const redisPassword = process.env.REDIS_PASSWORD || 'AV8xAAIjcDE2MjY1YTgwZjdkNDA0MjBiYWUxNGUxMWE5NzllY2ZlNXAxMA';

console.log('Connecting to Redis at:', redisHost, redisPort);

// Create Redis client
const redis = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  tls: { rejectUnauthorized: false }, // Required for secure connections
  connectTimeout: 10000,
});

// Set up event handlers
redis.on('connect', () => {
  console.log('Successfully connected to Redis!');
  testRedis();
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
  process.exit(1);
});

// Test Redis operations
async function testRedis() {
  try {
    // Set a test value
    const testKey = 'test:connection:' + Date.now();
    const testValue = 'Redis connection successful at ' + new Date().toISOString();
    
    console.log(`Setting test value: ${testKey} = ${testValue}`);
    await redis.set(testKey, testValue, 'EX', 60); // Expire in 60 seconds
    
    // Get the value back
    const retrievedValue = await redis.get(testKey);
    console.log(`Retrieved value: ${retrievedValue}`);
    
    if (retrievedValue === testValue) {
      console.log('Redis connection test PASSED! ✅');
    } else {
      console.log('Redis connection test FAILED! ❌');
    }
    
    // List all keys with test: prefix (optional)
    const keys = await redis.keys('test:*');
    console.log('Current test keys:', keys);
    
    // Cleanup and exit
    process.exit(0);
  } catch (error) {
    console.error('Error during Redis test:', error);
    process.exit(1);
  }
}