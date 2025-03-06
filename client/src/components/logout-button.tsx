
import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function LogoutButton() {
  const { logoutMutation } = useAuth();
  const { toast } = useToast();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logged out",
          description: "You have been successfully logged out",
        });
        // Force page reload to clear any state
        window.location.href = "/";
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: "Failed to log out: " + error.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Button onClick={handleLogout} variant="outline">
      Logout
    </Button>
  );
}
