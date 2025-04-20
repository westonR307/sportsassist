# Redis Configuration with Upstash

This document outlines the Redis configuration used in the application and how it's set up to use Upstash.io Redis service.

## Configuration Details

The application is configured to use Upstash.io Redis service with the following details:

- **Endpoint**: improved-urchin-24369.upstash.io
- **Port**: 6379
- **TLS**: Enabled (required for secure connections)

## Environment Variables

The Redis connection is configured using the following environment variables that are set in the `.env` file:

```
REDIS_HOST=improved-urchin-24369.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=AV8xAAIjcDE2MjY1YTgwZjdkNDA0MjBiYWUxNGUxMWE5NzllY2ZlNXAxMA
REDIS_TLS=true
```

## Fallback Mechanism

The application is designed to gracefully handle Redis connection issues by falling back to direct database queries when Redis is unavailable. This ensures that the application continues to function even if there are temporary issues with the Redis connection.

## Caching Strategy

The caching system uses different TTL (Time-To-Live) values for different types of data:

- **SHORT**: 120 seconds (2 minutes) - For frequently changing data
- **MEDIUM**: 600 seconds (10 minutes) - For data that changes occasionally
- **LONG**: 3600 seconds (1 hour) - For relatively static data
- **VERY_LONG**: 14400 seconds (4 hours) - For very static data
- **STATIC**: 86400 seconds (24 hours) - For truly static content
- **USER**: 300 seconds (5 minutes) - For user-related data
- **CONFIG**: 3600 seconds (1 hour) - For configuration data

## Testing Redis Connection

You can test the Redis connection by running:

```
node scripts/test-redis.js
```

This script will attempt to connect to Redis, set a test value, read it back, and verify the connection is working properly.

## Troubleshooting

If you experience Redis connection issues, check the following:

1. Ensure the Upstash Redis service is running
2. Verify that the credentials in the `.env` file are correct
3. Check if your network allows outbound connections to the Redis server
4. Look for any error messages in the application logs that might indicate the cause of the issue

Remember that the application will continue to function even without Redis, but performance may be affected as all queries will go directly to the database.