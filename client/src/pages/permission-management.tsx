import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { PermissionSetEditor } from '@/components/permission-set-editor';
import { UserPermissionAssignment } from '@/components/user-permission-assignment';
import { PermissionSummary } from '@/components/permission-summary';
import { getPermissionSets, createPermissionSet, getUserPermissions, getAllUserPermissions, PermissionSet, UserPermission } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Users, Settings, Loader2, PieChart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Role } from '@shared/types';

export function PermissionManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [organizationId, setOrganizationId] = useState<number | undefined>(undefined);
  const [isAddingSet, setIsAddingSet] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [newSetData, setNewSetData] = useState<Partial<PermissionSet>>({
    name: '',
    description: '',
    isDefault: false,
    defaultForRole: null
  });
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  
  // Fetch current user
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const response = await fetch('/api/user');
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      return response.json();
    }
  });
  
  // Set current user and organization ID when data is loaded
  useEffect(() => {
    if (userData) {
      setCurrentUser(userData);
      if (userData.organizationId) {
        setOrganizationId(userData.organizationId);
      }
    }
  }, [userData]);
  
  // Fetch organization users (team members)
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: [`/api/organizations/${organizationId}/users`],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${organizationId}/users`);
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      return response.json();
    },
    enabled: !!organizationId && currentUser?.role === 'camp_creator'
  });
  
  // Set team members when data is loaded
  useEffect(() => {
    if (teamData) {
      setTeamMembers(teamData);
      
      // Select the first team member by default if none is selected
      if (!selectedMemberId && teamData.length > 0) {
        setSelectedMemberId(teamData[0].id);
      }
    }
  }, [teamData, selectedMemberId]);
  
  // Fetch all user permissions for the organization
  const { data: allUserPermissions = [], isLoading: userPermsLoading } = useQuery({
    queryKey: [`/api/organizations/${organizationId}/permissions/users`],
    queryFn: () => getAllUserPermissions(organizationId as number),
    enabled: !!organizationId && currentUser?.role === 'camp_creator'
  });
  
  // Set user permissions when data is loaded (only once when first loaded)
  useEffect(() => {
    if (allUserPermissions && allUserPermissions.length > 0 && userPermissions.length === 0) {
      setUserPermissions(allUserPermissions);
    }
  }, [allUserPermissions, userPermissions.length]);
  
  // Fetch permission sets
  const { data: permissionSets = [], isLoading: setsLoading } = useQuery({
    queryKey: [`/api/organizations/${organizationId}/permissions/sets`],
    queryFn: () => getPermissionSets(organizationId as number),
    enabled: !!organizationId && currentUser?.role === 'camp_creator'
  });
  
  // When permission sets are loaded, select the first one by default
  useEffect(() => {
    if (permissionSets.length > 0 && !selectedSetId) {
      setSelectedSetId(permissionSets[0].id);
    }
  }, [permissionSets, selectedSetId]);
  
  // Create new permission set mutation
  const createSetMutation = useMutation({
    mutationFn: (data: Partial<PermissionSet>) => createPermissionSet(organizationId as number, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${organizationId}/permissions/sets`] });
      setIsAddingSet(false);
      setNewSetData({
        name: '',
        description: '',
        isDefault: false,
        defaultForRole: null
      });
      toast({
        title: "Permission Set Created",
        description: "The new permission set has been created successfully."
      });
    },
    onError: (error) => {
      console.error("Error creating permission set:", error);
      toast({
        title: "Error",
        description: "Failed to create permission set.",
        variant: "destructive"
      });
    }
  });
  
  const handleCreateSet = () => {
    if (!newSetData.name) {
      toast({
        title: "Validation Error",
        description: "Permission set name is required.",
        variant: "destructive"
      });
      return;
    }
    
    createSetMutation.mutate(newSetData);
  };
  
  // Check if user is authorized to view this page
  const isAuthorized = currentUser?.role === 'camp_creator';
  
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!isAuthorized) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access the permission management system.
            Only organization owners (Camp Creators) can manage permissions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Get the selected permission set
  const selectedSet = selectedSetId 
    ? permissionSets.find(set => set.id === selectedSetId)
    : undefined;
    
  // Get the selected team member
  const selectedMember = selectedMemberId
    ? teamMembers.find(member => member.id === selectedMemberId)
    : undefined;
  
  return (
    <>
      <DashboardHeader
        title="Permission Management"
        description="Manage custom permission sets and user permissions for your organization"
      />
      
      <Tabs defaultValue="summary" className="mt-6">
        <TabsList className="mb-4">
          <TabsTrigger value="summary">
            <PieChart className="h-4 w-4 mr-2" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="sets">
            <Settings className="h-4 w-4 mr-2" />
            Permission Sets
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            User Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          {setsLoading || userPermsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2">Loading permission data...</span>
            </div>
          ) : (
            <PermissionSummary 
              permissionSets={permissionSets}
              userPermissions={userPermissions} 
              teamMembers={teamMembers}
              organizationId={organizationId as number}
              loading={setsLoading || userPermsLoading}
            />
          )}
        </TabsContent>
        
        <TabsContent value="sets">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Permission Sets</CardTitle>
                <CardDescription>
                  Manage your organization's permission sets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => setIsAddingSet(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Set
                  </Button>
                  
                  <Separator />
                  
                  {setsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : permissionSets.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No permission sets defined yet.
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-1">
                        {permissionSets.map(set => (
                          <Button
                            key={set.id}
                            variant={selectedSetId === set.id ? "default" : "ghost"}
                            className="w-full justify-start mb-1"
                            onClick={() => setSelectedSetId(set.id)}
                          >
                            <div className="truncate text-left">
                              <div className="font-medium">{set.name}</div>
                              {set.isDefault && set.defaultForRole && (
                                <div className="text-xs text-muted-foreground">
                                  Default for {set.defaultForRole.replace('_', ' ')}
                                </div>
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-3">
              {selectedSet ? (
                <PermissionSetEditor 
                  permissionSet={selectedSet} 
                  onSave={(updated) => {
                    // Invalidate and refetch the query to get the updated data
                    queryClient.invalidateQueries({ 
                      queryKey: [`/api/organizations/${organizationId}/permissions/sets`] 
                    });
                  }}
                />
              ) : (
                <CardContent className="flex items-center justify-center min-h-[400px] text-center">
                  <div>
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No Permission Set Selected</h3>
                    <p className="text-sm text-muted-foreground max-w-md mt-2">
                      Select a permission set from the sidebar or create a new one.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="users">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage permissions for team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No team members found.
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-1">
                      {teamMembers.map(member => (
                        <Button
                          key={member.id}
                          variant={selectedMemberId === member.id ? "default" : "ghost"}
                          className="w-full justify-start mb-1"
                          onClick={() => setSelectedMemberId(member.id)}
                        >
                          <div className="truncate text-left">
                            <div className="font-medium">
                              {member.first_name} {member.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {member.role.replace('_', ' ')}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
            
            <Card className="md:col-span-3">
              {selectedMember ? (
                <UserPermissionAssignment
                  userId={selectedMember.id}
                  organizationId={organizationId as number}
                  userName={`${selectedMember.first_name} ${selectedMember.last_name}`}
                  userRole={selectedMember.role}
                />
              ) : (
                <CardContent className="flex items-center justify-center min-h-[400px] text-center">
                  <div>
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No Team Member Selected</h3>
                    <p className="text-sm text-muted-foreground max-w-md mt-2">
                      Select a team member from the sidebar to manage their permissions.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Dialog for creating a new permission set */}
      <Dialog open={isAddingSet} onOpenChange={setIsAddingSet}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Permission Set</DialogTitle>
            <DialogDescription>
              Define a new permission set that can be assigned to users.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input 
                id="name" 
                value={newSetData.name}
                onChange={(e) => setNewSetData({ ...newSetData, name: e.target.value })}
                placeholder="e.g., Camp Manager"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                value={newSetData.description || ''}
                onChange={(e) => setNewSetData({ ...newSetData, description: e.target.value })}
                placeholder="Describe what this permission set is for"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="isDefault" 
                checked={newSetData.isDefault}
                onChange={(e) => setNewSetData({ ...newSetData, isDefault: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isDefault">Set as default for role</Label>
            </div>
            
            {newSetData.isDefault && (
              <div className="space-y-2">
                <Label htmlFor="defaultRole">Default role</Label>
                <Select 
                  value={newSetData.defaultForRole || undefined} 
                  onValueChange={(value) => setNewSetData({ ...newSetData, defaultForRole: value as Role })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="camp_creator">Camp Creator</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingSet(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSet} disabled={!newSetData.name}>
              Create Permission Set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}