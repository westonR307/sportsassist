import { db } from './db';
import { Camp, Organization, Registration } from '@shared/schema';
import { cacheGetJson, cacheSetJson, getCacheKey, cacheDeletePattern, getListCacheKey, isRedisAvailable } from './cache';
import { eq, and, isNull, SQL, sql } from 'drizzle-orm';
import { camps, organizations, registrations, campSports, sports } from '@shared/tables';

// Optimized Cache TTL values (in seconds) to reduce database load
const CACHE_TTL = {
  SHORT: 120,       // 2 minutes (was 1 minute)
  MEDIUM: 600,      // 10 minutes (was 5 minutes)
  LONG: 3600,       // 1 hour (was 30 minutes)
  VERY_LONG: 14400, // 4 hours (was 2 hours)
  // Add specialized TTLs for different content types
  STATIC: 86400,    // 24 hours for truly static content
  USER: 300,        // 5 minutes for user data
  CONFIG: 3600,     // 1 hour for configuration data
};

/**
 * Gets a camp by ID with caching
 * Uses a 5-minute cache timeout for non-changing camp data
 * Gracefully falls back to database query if Redis is unavailable
 */
export async function getCachedCamp(campId: number): Promise<Camp | null> {
  const cacheKey = getCacheKey('camp', campId);
  
  console.log(`Redis availability status: ${isRedisAvailable()}`);
  
  // Only try to get from cache if Redis is available
  if (isRedisAvailable()) {
    try {
      console.log(`Attempting to get camp ${campId} from Redis cache with key: ${cacheKey}`);
      const cachedCamp = await cacheGetJson<Camp>(cacheKey);
      if (cachedCamp) {
        console.log(`Redis cache hit for camp ${campId}`);
        return cachedCamp;
      }
      console.log(`Redis cache miss for camp ${campId}`);
    } catch (error: any) {
      // Log error but continue to fallback database query
      console.warn(`Error retrieving camp from cache: ${error.message}`);
    }
  } else {
    console.log(`Redis not available, skipping cache lookup for camp ${campId}`);
  }
  
  // If not in cache or Redis unavailable, fetch from database
  const campResult = await db.select()
    .from(camps)
    .where(eq(camps.id, campId))
    .limit(1);
  
  const camp = campResult[0];
  if (!camp) {
    return null;
  }
  
  // Only try to cache if Redis is available
  if (isRedisAvailable()) {
    try {
      // Cache the result for 5 minutes
      await cacheSetJson(cacheKey, camp, CACHE_TTL.MEDIUM);
    } catch (error: any) {
      console.warn(`Failed to cache camp: ${error.message}`);
    }
  }
  
  return camp;
}

/**
 * Gets all camps with caching and filtering options
 * Uses an efficient cache structure with appropriate timeouts
 * Gracefully falls back to database query if Redis is unavailable
 */
export async function getCachedCamps(filters: {
  organizationId?: number;
  includeDeleted?: boolean;
  status?: string;
  type?: string;
  search?: string;
} = {}): Promise<any[]> {
  // Generate a cache key based on the filters
  const cacheKey = getListCacheKey('camps', filters);
  
  // Only try to get from cache if Redis is available
  if (isRedisAvailable()) {
    try {
      const cachedCamps = await cacheGetJson<any[]>(cacheKey);
      if (cachedCamps) {
        return cachedCamps;
      }
    } catch (error: any) {
      // Log error but continue to fallback database query
      console.warn(`Error retrieving camps from cache: ${error.message}`);
    }
  }
  
  // If not in cache or Redis unavailable, fetch from database with filters
  let query = db.select().from(camps);
  
  // Build conditions array
  const conditions = [];
  
  // Filter by organization if specified
  if (filters.organizationId) {
    conditions.push(eq(camps.organizationId, filters.organizationId));
  }
  
  // Filter deleted camps
  if (!filters.includeDeleted) {
    conditions.push(isNull(camps.deletedAt));
  }
  
  // Add status filter if provided
  if (filters.status) {
    if (filters.status === 'active') {
      const now = new Date();
      conditions.push(
        and(
          sql`${camps.startDate} <= ${now}`,
          sql`${camps.endDate} >= ${now}`
        )
      );
    } else if (filters.status === 'upcoming') {
      const now = new Date();
      conditions.push(sql`${camps.startDate} > ${now}`);
    } else if (filters.status === 'past') {
      const now = new Date();
      conditions.push(sql`${camps.endDate} < ${now}`);
    } else if (filters.status === 'cancelled') {
      conditions.push(sql`${camps.status} = 'cancelled'`);
    }
  }
  
  // Add type filter if provided
  if (filters.type) {
    conditions.push(sql`${camps.type} = ${filters.type}`);
  }
  
  // Apply search filter if provided
  if (filters.search) {
    conditions.push(
      sql`(${camps.name} ILIKE ${'%' + filters.search + '%'} OR 
           ${camps.description} ILIKE ${'%' + filters.search + '%'} OR
           ${camps.city} ILIKE ${'%' + filters.search + '%'} OR
           ${camps.state} ILIKE ${'%' + filters.search + '%'})`
    );
  }
  
  // Apply all conditions
  if (conditions.length > 0) {
    if (conditions.length === 1) {
      query = query.where(conditions[0]);
    } else {
      query = query.where(and(...conditions));
    }
  }
  
  // Execute the query
  const campsList = await query;
  
  // Enrich camps with sports info (basic info only for listing)
  const enrichedCamps = await Promise.all(campsList.map(async (camp) => {
    // Get basic sports info for this camp
    const campSportsList = await db.select()
      .from(campSports)
      .where(eq(campSports.campId, camp.id));
    
    return {
      ...camp,
      campSports: campSportsList
    };
  }));
  
  // Only try to cache if Redis is available
  if (isRedisAvailable()) {
    try {
      // Cache the result with appropriate TTL
      // Use shorter cache time for filtered queries that might change more often
      const cacheTtl = filters.status || filters.search 
        ? CACHE_TTL.SHORT   // 1 minute for filtered queries
        : CACHE_TTL.MEDIUM; // 5 minutes for basic organization queries
      
      await cacheSetJson(cacheKey, enrichedCamps, cacheTtl);
    } catch (error: any) {
      console.warn(`Failed to cache camps: ${error.message}`);
    }
  }
  
  return enrichedCamps;
}

/**
 * Gets camps by organization ID with caching
 * Uses a 5-minute cache timeout for camp lists
 * Gracefully falls back to database query if Redis is unavailable
 */
export async function getCachedOrgCamps(organizationId: number, includeDeleted: boolean = false): Promise<Camp[]> {
  return getCachedCamps({
    organizationId,
    includeDeleted
  });
}

/**
 * Gets an organization by ID with caching
 * Uses a 1-hour cache timeout for organization data which changes less frequently
 * Gracefully falls back to database query if Redis is unavailable
 */
export async function getCachedOrganization(organizationId: number): Promise<Organization | null> {
  const cacheKey = getCacheKey('organization', organizationId);
  
  // Only try to get from cache if Redis is available
  if (isRedisAvailable()) {
    try {
      const cachedOrg = await cacheGetJson<Organization>(cacheKey);
      if (cachedOrg) {
        console.log(`Cache hit for organization ${organizationId}`);
        return cachedOrg;
      }
    } catch (error: any) {
      // Log error but continue to fallback database query
      console.warn(`Error retrieving organization from cache: ${error.message}`);
    }
  }
  
  console.log(`Cache miss or Redis unavailable for organization ${organizationId}, fetching from database`);
  
  // Fetch from database (fallback)
  const orgResult = await db.select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  
  const org = orgResult[0];
  if (!org) {
    return null;
  }
  
  // Only try to cache if Redis is available
  if (isRedisAvailable()) {
    try {
      // Cache the result for 1 hour - organization data is fairly static
      await cacheSetJson(cacheKey, org, CACHE_TTL.LONG);
      console.log(`Cached organization ${organizationId} for ${CACHE_TTL.LONG} seconds`);
    } catch (error: any) {
      console.warn(`Failed to cache organization: ${error.message}`);
    }
  }
  
  return org;
}

/**
 * Gets all organizations with caching
 * This is called frequently from the UI and benefits from longer caching
 * Gracefully falls back to database query if Redis is unavailable
 */
export async function getCachedOrganizations(): Promise<Organization[]> {
  const cacheKey = 'organizations:all';
  
  // Only try to get from cache if Redis is available
  if (isRedisAvailable()) {
    try {
      const cachedOrgs = await cacheGetJson<Organization[]>(cacheKey);
      if (cachedOrgs) {
        console.log('Cache hit for all organizations');
        return cachedOrgs;
      }
    } catch (error: any) {
      // Log error but continue to fallback database query
      console.warn(`Error retrieving organizations from cache: ${error.message}`);
    }
  }
  
  console.log('Cache miss or Redis unavailable for all organizations, fetching from database');
  
  // Fetch from database (fallback)
  const orgs = await db.select().from(organizations);
  
  // Only try to cache if Redis is available
  if (isRedisAvailable()) {
    try {
      // Cache the result for 1 hour - organization lists change infrequently
      await cacheSetJson(cacheKey, orgs, CACHE_TTL.LONG);
      console.log(`Cached all organizations for ${CACHE_TTL.LONG} seconds`);
    } catch (error: any) {
      console.warn(`Failed to cache organizations: ${error.message}`);
    }
  }
  
  return orgs;
}

/**
 * Gets registrations for a camp with caching
 * Uses a 1-minute cache timeout as registration data changes more frequently
 * Gracefully falls back to database query if Redis is unavailable
 */
export async function getCachedCampRegistrations(campId: number): Promise<Registration[]> {
  const cacheKey = getCacheKey('camp', campId, 'registrations');
  
  // Only try to get from cache if Redis is available
  if (isRedisAvailable()) {
    try {
      const cachedRegistrations = await cacheGetJson<Registration[]>(cacheKey);
      if (cachedRegistrations) {
        return cachedRegistrations;
      }
    } catch (error: any) {
      // Log error but continue to fallback database query
      console.warn(`Error retrieving camp registrations from cache: ${error.message}`);
    }
  }
  
  // If not in cache or Redis unavailable, fetch from database
  const registrationsList = await db.select()
    .from(registrations)
    .where(eq(registrations.campId, campId));
  
  // Only try to cache if Redis is available
  if (isRedisAvailable()) {
    try {
      // Cache the result for 1 minute
      await cacheSetJson(cacheKey, registrationsList, CACHE_TTL.SHORT);
    } catch (error: any) {
      console.warn(`Failed to cache camp registrations: ${error.message}`);
    }
  }
  
  return registrationsList;
}

/**
 * Invalidates all related camp caches when a camp is updated
 * Gracefully handles Redis unavailability
 */
export async function invalidateCampCaches(campId: number) {
  // Only attempt to invalidate cache if Redis is available
  if (!isRedisAvailable()) {
    console.log(`Redis unavailable, skipping cache invalidation for camp ${campId}`);
    return;
  }

  try {
    // Delete the specific camp cache
    await cacheDeletePattern(getCacheKey('camp', campId));
    
    // Delete any cache entries containing this camp's registrations
    await cacheDeletePattern(getCacheKey('camp', campId, 'registrations'));
    
    // Also delete any organization camps lists that might include this camp
    await cacheDeletePattern('organization:camps:list:*');
    await cacheDeletePattern('camps:list:*');
    
    console.log(`Successfully invalidated caches for camp ${campId}`);
  } catch (error: any) {
    console.warn(`Error invalidating cache for camp ${campId}: ${error.message}`);
    // Continue execution, allowing the application to function without cache invalidation
  }
}

/**
 * Invalidates all related organization caches when an organization is updated
 * Gracefully handles Redis unavailability
 */
export async function invalidateOrganizationCaches(organizationId: number) {
  // Only attempt to invalidate cache if Redis is available
  if (!isRedisAvailable()) {
    console.log(`Redis unavailable, skipping cache invalidation for organization ${organizationId}`);
    return;
  }

  try {
    // Delete the specific organization cache
    await cacheDeletePattern(getCacheKey('organization', organizationId));
    
    // Delete any cache entries containing this organization's camps
    await cacheDeletePattern(getListCacheKey('organization:camps', { orgId: organizationId }));
    await cacheDeletePattern(getListCacheKey('organization:camps', { orgId: organizationId, includeDeleted: true }));
    await cacheDeletePattern(getListCacheKey('camps', { organizationId }));
    await cacheDeletePattern(getListCacheKey('camps', { organizationId, includeDeleted: true }));
    
    // Delete the all organizations cache too
    await cacheDeletePattern('organizations:all');
    
    console.log(`Successfully invalidated caches for organization ${organizationId}`);
  } catch (error: any) {
    console.warn(`Error invalidating cache for organization ${organizationId}: ${error.message}`);
    // Continue execution, allowing the application to function without cache invalidation
  }
}