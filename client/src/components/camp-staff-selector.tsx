import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface User {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo: string | null;
  role: string;
  staffRole?: StaffRole;
}

interface CampStaffSelectorProps {
  campId: number;
  organizationId: number;
}

type StaffRole = 'manager' | 'coach' | 'volunteer';

const roleLabels: Record<StaffRole, string> = {
  manager: "Manager",
  coach: "Coach",
  volunteer: "Volunteer"
};

export default function CampStaffSelector({ campId, organizationId }: CampStaffSelectorProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<StaffRole>("coach");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch organization staff
  const { data: organizationStaff, isLoading: staffLoading } = useQuery<User[]>({
    queryKey: ['/api/organizations', organizationId, 'staff'],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${organizationId}/staff`);
      if (!response.ok) {
        throw new Error("Failed to fetch organization staff");
      }
      return response.json();
    },
    enabled: Boolean(organizationId),
  });

  // Fetch current camp staff
  const { data: campStaff, isLoading: campStaffLoading } = useQuery<User[]>({
    queryKey: ['/api/camps', campId, 'staff'],
    queryFn: async () => {
      const response = await fetch(`/api/camps/${campId}/staff`);
      if (!response.ok) {
        throw new Error("Failed to fetch camp staff");
      }
      return response.json();
    },
    enabled: Boolean(campId),
  });

  // Add staff mutation
  const addStaffMutation = useMutation({
    mutationFn: async (data: { userId: number; role: string }) => {
      const response = await fetch(`/api/camps/${campId}/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add staff member");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Staff member added to camp",
      });
      setSelectedUserId(null);
      // Invalidate camp staff query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'staff'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add staff member",
        variant: "destructive",
      });
    },
  });

  // Remove staff mutation
  const removeStaffMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/camps/${campId}/staff/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to remove staff member");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Staff member removed from camp",
      });
      // Invalidate camp staff query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'staff'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove staff member",
        variant: "destructive",
      });
    },
  });

  // Filter out users who are already staff members
  const availableUsers = organizationStaff 
    ? organizationStaff.filter(
        (user) => !(campStaff || []).some((staffMember) => staffMember.id === user.id)
      ) 
    : [];

  const handleAddStaff = () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a team member",
        variant: "destructive",
      });
      return;
    }

    addStaffMutation.mutate({
      userId: selectedUserId,
      role: selectedRole,
    });
  };

  const handleRemoveStaff = (userId: number) => {
    removeStaffMutation.mutate(userId);
  };

  // Get user initials for avatar fallback
  const getUserInitials = (user: User) => {
    const firstName = user.first_name || user.username.charAt(0);
    const lastName = user.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Get user full name or username
  const getUserName = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username;
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Camp Staff</CardTitle>
        <CardDescription>
          Assign coaches and other staff members to this camp
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <Select 
              disabled={availableUsers.length === 0 || addStaffMutation.isPending}
              onValueChange={(value) => setSelectedUserId(Number(value))}
            >
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user: User) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {getUserName(user)}
                  </SelectItem>
                ))}
                {availableUsers.length === 0 && (
                  <SelectItem value="none" disabled>
                    No available team members
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            <Select 
              disabled={addStaffMutation.isPending}
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as StaffRole)}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="volunteer">Volunteer</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={handleAddStaff}
              disabled={!selectedUserId || addStaffMutation.isPending}
              className="ml-auto"
            >
              Add Staff
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Current Staff</h3>
          
          {campStaffLoading ? (
            <div className="text-sm text-muted-foreground">Loading staff...</div>
          ) : campStaff && campStaff.length === 0 ? (
            <div className="text-sm text-muted-foreground">No staff members assigned to this camp yet</div>
          ) : (
            <div className="space-y-2">
              {campStaff && campStaff.map((staffMember: User) => (
                <div key={staffMember.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      {staffMember.profile_photo && (
                        <AvatarImage src={staffMember.profile_photo} />
                      )}
                      <AvatarFallback>{getUserInitials(staffMember)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{getUserName(staffMember)}</div>
                      <div className="text-sm text-muted-foreground">{staffMember.username}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="text-xs">
                      {staffMember.staffRole && roleLabels[staffMember.staffRole as StaffRole] 
                        ? roleLabels[staffMember.staffRole as StaffRole] 
                        : staffMember.staffRole}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStaff(staffMember.id)}
                      disabled={removeStaffMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}