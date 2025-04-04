import React, { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function InvitationAcceptPage() {
  const [, params] = useRoute("/invitations/:token/accept");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Extract the invitation token from the URL
  const token = params?.token;
  
  // Validate the token on page load
  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid invitation link.");
      return;
    }
    
    // Check if the invitation is valid but don't accept it yet
    const checkInvitation = async () => {
      try {
        const res = await fetch(`/api/invitations/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          setStatus("error");
          setMessage(data.message || "This invitation is invalid or has expired.");
        } else {
          setStatus("success");
          setMessage("Your invitation is valid. Click the button below to accept it and create your account.");
        }
      } catch (error) {
        console.error("Error checking invitation:", error);
        setStatus("error");
        setMessage("An error occurred while checking the invitation. Please try again later.");
      }
    };
    
    checkInvitation();
  }, [token]);
  
  // Handle the acceptance of the invitation
  const handleAcceptInvitation = async () => {
    if (!token || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const res = await apiRequest(
        "POST",
        `/api/invitations/${token}/accept`
      );
      
      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: "Success",
          description: "You have successfully accepted the invitation. You can now create your account or log in.",
        });
        
        // Redirect to the login page
        setTimeout(() => {
          navigate("/auth", { replace: true });
        }, 2000);
      } else {
        setStatus("error");
        setMessage(data.message || "Failed to accept the invitation. It may have expired or already been used.");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      setStatus("error");
      setMessage("An error occurred while accepting the invitation. Please try again later.");
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Team Invitation</CardTitle>
          <CardDescription>Join your organization's team</CardDescription>
        </CardHeader>
        
        <CardContent>
          {status === "loading" ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-center text-muted-foreground">Checking invitation...</p>
            </div>
          ) : status === "success" ? (
            <div className="flex flex-col items-center justify-center py-6">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-center">{message}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-center text-red-500">{message}</p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center gap-4">
          {status === "success" && (
            <Button 
              onClick={handleAcceptInvitation}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                "Accept & Create Account"
              )}
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className={status === "success" ? "w-1/3" : "w-full"}
          >
            {status === "success" ? "Cancel" : "Go to Home"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}