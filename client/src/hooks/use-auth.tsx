import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  refreshUser: () => void;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "email" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Function to refresh user data
  const refreshUser = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      // Clear all cached queries first to prevent data leakage between users
      queryClient.clear();
      // Then set the user data
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.first_name || user.email}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: any) => {
      console.log("Register mutation sending data:", {
        ...credentials,
        password: "[REDACTED]"
      });
      
      try {
        const res = await apiRequest("POST", "/api/register", credentials);
        const data = await res.json();
        console.log("Registration API response:", {
          status: res.status,
          data: { ...data, password: data.password ? "[REDACTED]" : undefined }
        });
        return data;
      } catch (error) {
        console.error("Registration API error:", error);
        throw error;
      }
    },
    onSuccess: (user: SelectUser) => {
      // Clear all cached queries first to prevent data leakage between users
      queryClient.clear();
      // Then set the user data
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome to SportsAssist, ${user.email}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout", undefined);
      return true;
    },
    onSuccess: () => {
      // Clear all cached queries first to prevent data leakage between users
      queryClient.clear();
      // Then set the user data to null
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        refreshUser,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}