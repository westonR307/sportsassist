import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
// Create a memory cache to avoid excessive API calls
const localMemoryCache = new Map<string, {data: any, timestamp: number}>();

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const cacheKey = Array.isArray(queryKey) ? queryKey.join('|') : String(queryKey[0]);
    const url = queryKey[0] as string;
    
    // Check if we have a valid memory cache entry (not expired)
    const cachedEntry = localMemoryCache.get(cacheKey);
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < 10000)) { // 10 second memory cache
      return cachedEntry.data;
    }

    try {
      // Use AbortController to set timeout for fetch requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const res = await fetch(url, {
        credentials: "include",
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache', // Tell CDN/browser not to cache
        }
      });
      
      clearTimeout(timeoutId);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      
      // Store in memory cache
      localMemoryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      // Clean up memory cache if it gets too large (prevent memory leaks)
      if (localMemoryCache.size > 100) {
        // Get all entries, convert to array
        const entries = Array.from(localMemoryCache.entries());
        
        // Sort by timestamp and get the oldest 20 to delete
        const keysToDelete = entries
          .sort((a, b) => a[1].timestamp - b[1].timestamp)
          .slice(0, 20)
          .map(entry => entry[0]);
          
        // Delete old entries
        keysToDelete.forEach(key => localMemoryCache.delete(key));
      }
      
      return data;
    } catch (error) {
      // If fetch fails and we have a cached entry (even if expired), return it as fallback
      if (cachedEntry) {
        console.warn('Using stale cached data due to fetch error');
        return cachedEntry.data;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false, // Don't auto-refetch by default - component specific when needed
      refetchOnWindowFocus: false, // Disable refetch on window focus for better performance
      staleTime: 60000, // Increased stale time to 1 minute (less network requests)
      retry: 1, // Reduced retry count
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000), // Faster retry with lower max
      gcTime: 600000, // Increased cache time to 10 minutes (renamed from cacheTime in React Query v5)
      placeholderData: 'previousData', // Keep previous data while fetching new data (v5 way)
    },
    mutations: {
      retry: 1, // Reduced retry count
    },
  },
});
