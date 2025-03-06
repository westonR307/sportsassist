import { createContext, useContext, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "./use-toast";

// Define the User type based on your schema
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  organizationId?: number;
  organizationName?: string;
}

// Define the context shape
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  loginMutation: any;
  registerMutation: any;
  logout: () => Promise<void>;
  logoutMutation: any; // Added logoutMutation
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
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/user");
        return response as User;
      } catch (error) {
        // Don't throw on 401 - it's an expected state
        if (error instanceof Response && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
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
      try {
        const response = await apiRequest("POST", "/api/login", credentials);
        return response as User;
      } catch (error) {
        console.error("Login error:", error);
        throw new Error(
          "Login failed. Please check your credentials and try again."
        );
      }
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
      try {
        const response = await apiRequest("POST", "/api/register", data);
        return response as User;
      } catch (error) {
        console.error("Registration error:", error);
        throw new Error(
          "Registration failed. Please check your information and try again."
        );
      }
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
        user: user || null,
        isLoading,
        isInitialized,
        loginMutation,
        registerMutation,
        logout,
        logoutMutation, // Added logoutMutation to the return value
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}