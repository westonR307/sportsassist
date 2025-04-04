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
  first_name: string | null;
  last_name: string | null;
  role: string;
  organizationId?: number;
}

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useState } from "react";

function InviteMemberDialog() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("coach");

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

      return await apiRequest(
        "POST",
        `/api/organizations/${user.organizationId}/invitations`,
        formattedData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${user?.organizationId}/invitations`] });
      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });
      setOpen(false);
      setEmail("");
      setRole("coach");
    },
    onError: (error: Error) => {
      // Extract the error message from the API response if available
      let errorMessage = error.message;
      try {
        // Check if the error message is a JSON string containing more detailed error info
        const errorData = JSON.parse(errorMessage);
        if (errorData.errors?.fieldErrors?.email) {
          errorMessage = `Email error: ${errorData.errors.fieldErrors.email.join(", ")}`;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If parsing fails, use the original error message
      }
      
      toast({
        title: "Error sending invitation",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate({ email, role });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Invite Team Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="team.member@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="volunteer">Volunteer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send invitation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResendButton({ invitation, organizationId }: { invitation: Invitation; organizationId: number }) {
  const { toast } = useToast();

  const resendMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(
        "POST",
        `/api/organizations/${organizationId}/invitations`,
        {
          email: invitation.email,
          role: invitation.role,
          organizationId: organizationId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${organizationId}/invitations`] });
      toast({
        title: "Success",
        description: "Invitation resent successfully",
      });
    },
    onError: (error: Error) => {
      // Extract the error message from the API response if available
      let errorMessage = error.message;
      try {
        // Check if the error message is a JSON string containing more detailed error info
        const errorData = JSON.parse(errorMessage);
        if (errorData.errors?.fieldErrors?.email) {
          errorMessage = `Email error: ${errorData.errors.fieldErrors.email.join(", ")}`;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If parsing fails, use the original error message
      }
      
      toast({
        title: "Error resending invitation",
        description: errorMessage,
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

function DeleteButton({ invitation, organizationId }: { invitation: Invitation; organizationId: number }) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "DELETE",
        `/api/organizations/${organizationId}/invitations/${invitation.id}`
      );
      
      // The apiRequest function will handle the response parsing
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${organizationId}/invitations`] });
      toast({
        title: "Success",
        description: "Invitation deleted successfully",
      });
    },
    onError: (error: Error) => {
      // Extract the error message from the API response if available
      let errorMessage = error.message;
      try {
        // Check if the error message is a JSON string containing more detailed error info
        const errorData = JSON.parse(errorMessage);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If parsing fails, use the original error message
      }
      
      toast({
        title: "Error deleting invitation",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => deleteMutation.mutate()}
      disabled={deleteMutation.isPending}
    >
      {deleteMutation.isPending ? (
        <>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Deleting...
        </>
      ) : (
        'Delete'
      )}
    </Button>
  );
}

function EditRoleDialog({ member, organizationId }: { member: StaffMember; organizationId: number }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(member.role);
  const { user } = useAuth();

  const updateRoleMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(
        "PATCH",
        `/api/organizations/${organizationId}/staff/${member.id}/role`,
        { role }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${organizationId}/staff`] });
      toast({
        title: "Success",
        description: "Team member role updated successfully",
      });
      setOpen(false);
    },
    onError: (error: Error) => {
      let errorMessage = error.message;
      try {
        const errorData = JSON.parse(errorMessage);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If parsing fails, use the original error message
      }
      
      toast({
        title: "Error updating role",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Edit Role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Team Member Role</DialogTitle>
          <DialogDescription>
            Update the role for {member.first_name && member.last_name 
              ? `${member.first_name} ${member.last_name}` 
              : member.username}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="volunteer">Volunteer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => updateRoleMutation.mutate()}
              disabled={updateRoleMutation.isPending || role === member.role}
            >
              {updateRoleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Role"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
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
                        <p className="font-medium">
                          {member.first_name && member.last_name 
                            ? `${member.first_name} ${member.last_name}` 
                            : member.username}
                        </p>
                        <p className="text-sm text-gray-500">{member.role}</p>
                      </div>
                      {user?.role === "camp_creator" && member.role !== "camp_creator" && (
                        <EditRoleDialog 
                          member={member} 
                          organizationId={user.organizationId || 0} 
                        />
                      )}
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
                      <div className="flex space-x-2">
                        <ResendButton 
                          invitation={invitation} 
                          organizationId={user?.organizationId || 0} 
                        />
                        <DeleteButton
                          invitation={invitation}
                          organizationId={user?.organizationId || 0}
                        />
                      </div>
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