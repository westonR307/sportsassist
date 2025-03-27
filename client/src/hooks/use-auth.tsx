import { createContext, useContext, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "./use-toast";
import { User as SelectUser } from "@shared/schema";

// Define the context shape
interface AuthContextType {
  user: SelectUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  loginMutation: any;
  registerMutation: any;
  logout: () => Promise<void>;
  logoutMutation: any;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  // Query to get the current user
  const { data: user, isLoading } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Set initialized after the first user query completes
  useEffect(() => {
    if (!isLoading) {
      setIsInitialized(true);
    }
  }, [isLoading]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json() as SelectUser;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/register", data);
      return await res.json() as SelectUser;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data);
      toast({
        title: "Registration successful",
        description: `Welcome, ${data.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout function
  const logout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out",
        variant: "destructive",
      });
    }
  };

  // Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({ title: "Logged out", description: "You have been logged out successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Logout failed", description: error.message, variant: "destructive" });
    }
  });

  // Provide the auth context
  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isInitialized,
        loginMutation,
        registerMutation,
        logout,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Helper function for handling 401 responses
type UnauthorizedBehavior = "returnNull" | "throw";
function getQueryFn<T>({ on401 }: { on401: UnauthorizedBehavior }): () => Promise<T | null> {
  return async () => {
    try {
      const res = await fetch("/api/user", {
        credentials: "include",
      });

      if (on401 === "returnNull" && res.status === 401) {
        return null;
      }

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      return await res.json();
    } catch (error) {
      console.error("User query error:", error);
      if (on401 === "returnNull") {
        return null;
      }
      throw error;
    }
  };
}