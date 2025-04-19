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
  data?: any
): Promise<Response> {
  const headers: Record<string, string> = {};
  let body: string | undefined = undefined;
  
  if (data) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(data);
  }
  
  console.log(`API Request: ${method} ${url}`);
  console.log('Request Headers:', headers);
  console.log('Request Body:', body ? body.substring(0, 200) + (body.length > 200 ? '...' : '') : 'none');
  
  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      credentials: "include",
    });
    
    console.log(`Response Status: ${res.status} ${res.statusText}`);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`API Error: ${res.status} ${res.statusText}`, errorText);
      throw new Error(`${res.status}: ${errorText || res.statusText}`);
    }
    
    return res;
  } catch (error) {
    console.error(`API Request Failed: ${method} ${url}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log(`Query Request: GET ${url}`);
    
    try {
      const res = await fetch(url, {
        credentials: "include",
      });
      
      console.log(`Query Response Status: ${res.status} ${res.statusText}`);
      
      if (res.status === 401) {
        console.warn(`Unauthorized response for: ${url}`);
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        throw new Error("Unauthorized: You need to log in to access this resource");
      }
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Query Error: ${res.status} ${res.statusText}`, errorText);
        throw new Error(`${res.status}: ${errorText || res.statusText}`);
      }
      
      const data = await res.json();
      console.log(`Query Data: ${url}`, data);
      return data;
    } catch (error) {
      console.error(`Query Request Failed: ${url}`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 30000, // Automatically refetch every 30 seconds
      refetchOnWindowFocus: true,
      staleTime: 5000, // Very short stale time - 5 seconds
      retry: 3, // Retry failed requests up to 3 times
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      cacheTime: 300000, // Cache for 5 minutes
    },
    mutations: {
      retry: 2,
    },
  },
});
