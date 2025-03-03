import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "./dashboard";
import { apiRequest } from "@/lib/api";
import { type Invitation } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface StaffMember {
  id: number;
  username: string;
  role: string;
}

function InviteMemberDialog() {
  const { toast } = useToast();
  const { user } = useAuth();

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      if (!user?.organizationId) {
        throw new Error("No organization ID found");
      }

      const formattedData = {
        ...data,
        organizationId: user.organizationId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      const res = await apiRequest(
        "POST",
        `/api/organizations/${user.organizationId}/invitations`,
        formattedData
      );

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${user?.organizationId}/invitations`] });
      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Button variant="outline" onClick={() => inviteMutation.mutate({ email: "", role: "coach" })}>
      Invite Team Member
    </Button>
  );
}

function ResendButton({ invitation, organizationId }: { invitation: Invitation; organizationId: number }) {
  const { toast } = useToast();

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/organizations/${organizationId}/invitations`,
        {
          email: invitation.email,
          role: invitation.role,
          organizationId: organizationId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      );

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${organizationId}/invitations`] });
      toast({
        title: "Success",
        description: "Invitation resent successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => resendMutation.mutate()}
      disabled={resendMutation.isPending}
    >
      {resendMutation.isPending ? (
        <>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Resending...
        </>
      ) : (
        'Resend'
      )}
    </Button>
  );
}

function TeamPage() {
  const { user } = useAuth();

  const { data: invitations } = useQuery<Invitation[]>({
    queryKey: [`/api/organizations/${user?.organizationId}/invitations`],
    enabled: !!user?.organizationId,
  });

  const { data: staff } = useQuery<StaffMember[]>({
    queryKey: [`/api/organizations/${user?.organizationId}/staff`],
    enabled: !!user?.organizationId,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Team Management</h1>
          <InviteMemberDialog />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Staff Members */}
          <Card>
            <CardHeader>
              <CardTitle>Active Staff</CardTitle>
            </CardHeader>
            <CardContent>
              {!staff || staff.length === 0 ? (
                <p className="text-gray-500">No active staff members</p>
              ) : (
                <div className="space-y-4">
                  {staff.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium">{member.username}</p>
                        <p className="text-sm text-gray-500">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              {!invitations || invitations.length === 0 ? (
                <p className="text-gray-500">No pending invitations</p>
              ) : (
                <div className="space-y-2">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-gray-500">{invitation.role}</p>
                      </div>
                      <ResendButton 
                        invitation={invitation} 
                        organizationId={user?.organizationId || 0} 
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default TeamPage;