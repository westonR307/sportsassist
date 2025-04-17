import { db } from './db';
import { Camp, Organization, Registration } from '@shared/schema';
import { cacheGetJson, cacheSetJson, getCacheKey, cacheDeletePattern, getListCacheKey } from './cache';
import { eq, and, isNull, SQL, sql } from 'drizzle-orm';
import { camps, organizations, registrations, campSports, sports } from '@shared/tables';

// Cache TTL values (in seconds)
const CACHE_TTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 1800,       // 30 minutes
  VERY_LONG: 7200,  // 2 hours
};

/**
 * Gets a camp by ID with caching
 * Uses a 5-minute cache timeout for non-changing camp data
 */
export async function getCachedCamp(campId: number): Promise<Camp | null> {
  const cacheKey = getCacheKey('camp', campId);
  
  // Try to get from cache first
  const cachedCamp = await cacheGetJson<Camp>(cacheKey);
  if (cachedCamp) {
    return cachedCamp;
  }
  
  // If not in cache, fetch from database
  const campResult = await db.select()
    .from(camps)
    .where(eq(camps.id, campId))
    .limit(1);
  
  const camp = campResult[0];
  if (!camp) {
    return null;
  }
  
  // Cache the result for 5 minutes
  await cacheSetJson(cacheKey, camp, CACHE_TTL.MEDIUM);
  
  return camp;
}

/**
 * Gets all camps with caching and filtering options
 * Uses an efficient cache structure with appropriate timeouts
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
  
  // Try to get from cache first
  const cachedCamps = await cacheGetJson<any[]>(cacheKey);
  if (cachedCamps) {
    return cachedCamps;
  }
  
  // If not in cache, fetch from database with filters
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
  
  // Cache the result with appropriate TTL
  // Use shorter cache time for filtered queries that might change more often
  const cacheTtl = filters.status || filters.search 
    ? CACHE_TTL.SHORT   // 1 minute for filtered queries
    : CACHE_TTL.MEDIUM; // 5 minutes for basic organization queries
  
  await cacheSetJson(cacheKey, enrichedCamps, cacheTtl);
  
  return enrichedCamps;
}

/**
 * Gets camps by organization ID with caching
 * Uses a 5-minute cache timeout for camp lists
 */
export async function getCachedOrgCamps(organizationId: number, includeDeleted: boolean = false): Promise<Camp[]> {
  return getCachedCamps({
    organizationId,
    includeDeleted
  });
}

/**
 * Gets an organization by ID with caching
 * Uses a 30-minute cache timeout for organization data which changes less frequently
 */
export async function getCachedOrganization(organizationId: number): Promise<Organization | null> {
  const cacheKey = getCacheKey('organization', organizationId);
  
  // Try to get from cache first
  const cachedOrg = await cacheGetJson<Organization>(cacheKey);
  if (cachedOrg) {
    return cachedOrg;
  }
  
  // If not in cache, fetch from database
  const orgResult = await db.select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  
  const org = orgResult[0];
  if (!org) {
    return null;
  }
  
  // Cache the result for 30 minutes
  await cacheSetJson(cacheKey, org, CACHE_TTL.LONG);
  
  return org;
}

/**
 * Gets registrations for a camp with caching
 * Uses a 1-minute cache timeout as registration data changes more frequently
 */
export async function getCachedCampRegistrations(campId: number): Promise<Registration[]> {
  const cacheKey = getCacheKey('camp', campId, 'registrations');
  
  // Try to get from cache first
  const cachedRegistrations = await cacheGetJson<Registration[]>(cacheKey);
  if (cachedRegistrations) {
    return cachedRegistrations;
  }
  
  // If not in cache, fetch from database
  const registrationsList = await db.select()
    .from(registrations)
    .where(eq(registrations.campId, campId));
  
  // Cache the result for 1 minute
  await cacheSetJson(cacheKey, registrationsList, CACHE_TTL.SHORT);
  
  return registrationsList;
}

/**
 * Invalidates all related camp caches when a camp is updated
 */
export async function invalidateCampCaches(campId: number) {
  // Delete the specific camp cache
  await cacheDeletePattern(getCacheKey('camp', campId));
  
  // Delete any cache entries containing this camp's registrations
  await cacheDeletePattern(getCacheKey('camp', campId, 'registrations'));
  
  // Also delete any organization camps lists that might include this camp
  await cacheDeletePattern('organization:camps:list:*');
  await cacheDeletePattern('camps:list:*');
}

/**
 * Invalidates all related organization caches when an organization is updated
 */
export async function invalidateOrganizationCaches(organizationId: number) {
  // Delete the specific organization cache
  await cacheDeletePattern(getCacheKey('organization', organizationId));
  
  // Delete any cache entries containing this organization's camps
  await cacheDeletePattern(getListCacheKey('organization:camps', { orgId: organizationId }));
  await cacheDeletePattern(getListCacheKey('organization:camps', { orgId: organizationId, includeDeleted: true }));
  await cacheDeletePattern(getListCacheKey('camps', { organizationId }));
  await cacheDeletePattern(getListCacheKey('camps', { organizationId, includeDeleted: true }));
}