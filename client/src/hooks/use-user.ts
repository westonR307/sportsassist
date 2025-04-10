import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export function useUser() {
  const { user, isAuthenticated } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      
      const response = await fetch('/api/user');
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  return {
    user: data || user,
    isLoading,
    error,
  };
}