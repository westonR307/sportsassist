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
 * Enhanced with better error handling for Redis unavailability
 */
export async function getCachedCamp(campId: number): Promise<Camp | null> {
  const cacheKey = getCacheKey('camp', campId);
  
  try {
    // Try to get from cache first
    const cachedCamp = await cacheGetJson<Camp>(cacheKey);
    if (cachedCamp && typeof cachedCamp === 'object') {
      console.log(`Cache hit for camp (id: ${campId})`);
      return cachedCamp;
    }
  } catch (error) {
    console.error(`Error retrieving camp from cache (id: ${campId}):`, error);
    // Continue to fetch from database
  }
  
  console.log(`Cache miss for camp (id: ${campId}), fetching from database`);
  
  try {
    // If not in cache, fetch from database
    const campResult = await db.select()
      .from(camps)
      .where(eq(camps.id, campId))
      .limit(1);
    
    const camp = campResult?.[0];
    if (!camp) {
      console.log(`Camp not found in database (id: ${campId})`);
      return null;
    }
    
    console.log(`Retrieved camp from database (id: ${campId})`);
    
    try {
      // Cache the result for 5 minutes
      await cacheSetJson(cacheKey, camp, CACHE_TTL.MEDIUM);
    } catch (error) {
      console.error(`Error caching camp (id: ${campId}):`, error);
      // Continue even if caching fails
    }
    
    return camp;
  } catch (error) {
    console.error(`Error fetching camp from database (id: ${campId}):`, error);
    return null; // Return null on error
  }
}

/**
 * Gets all camps with caching and filtering options
 * Uses an efficient cache structure with appropriate timeouts
 * Enhanced with better error handling for Redis unavailability
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
  
  try {
    // Try to get from cache first
    const cachedCamps = await cacheGetJson<any[]>(cacheKey);
    if (cachedCamps && Array.isArray(cachedCamps) && cachedCamps.length > 0) {
      console.log(`Cache hit for camps with filters: ${JSON.stringify(filters)}, found ${cachedCamps.length} camps`);
      return cachedCamps;
    }
  } catch (error) {
    // Log cache retrieval error but continue to fetch from DB
    console.error(`Error retrieving camps from cache:`, error);
  }
  
  console.log(`Cache miss for camps with filters: ${JSON.stringify(filters)}, fetching from database`);
  
  // If not in cache or cache error, fetch from database with filters
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
  
  try {
    // Execute the query with better error handling
    const campsList = await query;
    
    // Ensure we got a valid array from the database
    if (!Array.isArray(campsList)) {
      console.error("Database returned non-array result for camps query:", campsList);
      return [];
    }
    
    console.log(`Retrieved ${campsList.length} camps from database`);
    
    // Enrich camps with sports info (basic info only for listing)
    const enrichedCamps = await Promise.all(campsList.map(async (camp) => {
      try {
        // Get basic sports info for this camp
        const campSportsList = await db.select()
          .from(campSports)
          .where(eq(campSports.campId, camp.id));
        
        return {
          ...camp,
          campSports: Array.isArray(campSportsList) ? campSportsList : []
        };
      } catch (error) {
        console.error(`Error fetching sports for camp ${camp.id}:`, error);
        return {
          ...camp,
          campSports: [] // Default to empty array if there's an error
        };
      }
    }));
    
    // Only try to cache if we got valid results
    if (Array.isArray(enrichedCamps) && enrichedCamps.length > 0) {
      try {
        // Cache the result with appropriate TTL
        // Use shorter cache time for filtered queries that might change more often
        const cacheTtl = filters.status || filters.search 
          ? CACHE_TTL.SHORT   // 1 minute for filtered queries
          : CACHE_TTL.MEDIUM; // 5 minutes for basic organization queries
        
        await cacheSetJson(cacheKey, enrichedCamps, cacheTtl);
      } catch (error) {
        console.error(`Error caching enriched camps:`, error);
        // Continue even if caching fails
      }
    }
    
    return enrichedCamps;
  } catch (error) {
    console.error(`Error fetching camps from database:`, error);
    return []; // Return empty array on error
  }
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
 * Enhanced with better error handling for Redis unavailability
 */
export async function getCachedOrganization(organizationId: number): Promise<Organization | null> {
  const cacheKey = getCacheKey('organization', organizationId);
  
  try {
    // Try to get from cache first
    const cachedOrg = await cacheGetJson<Organization>(cacheKey);
    if (cachedOrg && typeof cachedOrg === 'object') {
      console.log(`Cache hit for organization (id: ${organizationId})`);
      return cachedOrg;
    }
  } catch (error) {
    console.error(`Error retrieving organization from cache (id: ${organizationId}):`, error);
    // Continue to fetch from database
  }
  
  console.log(`Cache miss for organization (id: ${organizationId}), fetching from database`);
  
  try {
    // If not in cache, fetch from database
    const orgResult = await db.select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    
    const org = orgResult?.[0];
    if (!org) {
      console.log(`Organization not found in database (id: ${organizationId})`);
      return null;
    }
    
    console.log(`Retrieved organization from database (id: ${organizationId})`);
    
    try {
      // Cache the result for 30 minutes
      await cacheSetJson(cacheKey, org, CACHE_TTL.LONG);
    } catch (error) {
      console.error(`Error caching organization (id: ${organizationId}):`, error);
      // Continue even if caching fails
    }
    
    return org;
  } catch (error) {
    console.error(`Error fetching organization from database (id: ${organizationId}):`, error);
    return null; // Return null on error
  }
}

/**
 * Gets registrations for a camp with caching
 * Uses a 1-minute cache timeout as registration data changes more frequently
 * Enhanced with better error handling for Redis unavailability
 */
export async function getCachedCampRegistrations(campId: number): Promise<Registration[]> {
  const cacheKey = getCacheKey('camp', campId, 'registrations');
  
  try {
    // Try to get from cache first
    const cachedRegistrations = await cacheGetJson<Registration[]>(cacheKey);
    if (cachedRegistrations && Array.isArray(cachedRegistrations)) {
      console.log(`Cache hit for camp registrations (campId: ${campId}), found ${cachedRegistrations.length} registrations`);
      return cachedRegistrations;
    }
  } catch (error) {
    console.error(`Error retrieving camp registrations from cache for camp ${campId}:`, error);
    // Continue to fetch from database
  }
  
  console.log(`Cache miss for camp registrations (campId: ${campId}), fetching from database`);
  
  try {
    // If not in cache, fetch from database
    const registrationsList = await db.select()
      .from(registrations)
      .where(eq(registrations.campId, campId));
    
    // Ensure we got a valid array
    if (!Array.isArray(registrationsList)) {
      console.error(`Database returned non-array result for camp ${campId} registrations:`, registrationsList);
      return [];
    }
    
    console.log(`Retrieved ${registrationsList.length} registrations for camp ${campId} from database`);
    
    try {
      // Cache the result for 1 minute
      await cacheSetJson(cacheKey, registrationsList, CACHE_TTL.SHORT);
    } catch (error) {
      console.error(`Error caching registrations for camp ${campId}:`, error);
      // Continue even if caching fails
    }
    
    return registrationsList;
  } catch (error) {
    console.error(`Error fetching registrations for camp ${campId} from database:`, error);
    return []; // Return empty array on error
  }
}

/**
 * Invalidates all related camp caches when a camp is updated
 * Enhanced with better error handling for Redis unavailability
 */
export async function invalidateCampCaches(campId: number) {
  try {
    // Delete the specific camp cache
    await cacheDeletePattern(getCacheKey('camp', campId));
    
    // Delete any cache entries containing this camp's registrations
    await cacheDeletePattern(getCacheKey('camp', campId, 'registrations'));
    
    // Also delete any organization camps lists that might include this camp
    await cacheDeletePattern('organization:camps:list:*');
    await cacheDeletePattern('camps:list:*');
    
    console.log(`Successfully invalidated cache for camp ${campId}`);
  } catch (error) {
    console.error(`Error invalidating cache for camp ${campId}:`, error);
    // Continue execution even if cache invalidation fails
  }
}

/**
 * Invalidates all related organization caches when an organization is updated
 * Enhanced with better error handling for Redis unavailability
 */
export async function invalidateOrganizationCaches(organizationId: number) {
  try {
    // Delete the specific organization cache
    await cacheDeletePattern(getCacheKey('organization', organizationId));
    
    // Delete any cache entries containing this organization's camps
    await cacheDeletePattern(getListCacheKey('organization:camps', { orgId: organizationId }));
    await cacheDeletePattern(getListCacheKey('organization:camps', { orgId: organizationId, includeDeleted: true }));
    await cacheDeletePattern(getListCacheKey('camps', { organizationId }));
    await cacheDeletePattern(getListCacheKey('camps', { organizationId, includeDeleted: true }));
    
    console.log(`Successfully invalidated cache for organization ${organizationId}`);
  } catch (error) {
    console.error(`Error invalidating cache for organization ${organizationId}:`, error);
    // Continue execution even if cache invalidation fails
  }
}