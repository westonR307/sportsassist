import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PermissionSet, UserPermission, getPermissionSets, getUserPermissions, assignPermissionSetToUser, removeUserPermission } from '@/lib/permissions';
import { AlertCircle, Plus, Trash2, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface UserPermissionAssignmentProps {
  userId: number;
  organizationId: number;
  userName?: string;
  userRole?: string;
  readOnly?: boolean;
}

export function UserPermissionAssignment({ 
  userId, 
  organizationId, 
  userName, 
  userRole,
  readOnly = false 
}: UserPermissionAssignmentProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingPermission, setIsAddingPermission] = useState(false);
  const [selectedPermissionSetId, setSelectedPermissionSetId] = useState<number | null>(null);
  
  // Fetch user permissions
  const { 
    data: userPermissions = [], 
    isLoading: isLoadingPermissions, 
    isError: permissionsError 
  } = useQuery({
    queryKey: [`/api/users/${userId}/permissions`],
    queryFn: () => getUserPermissions(userId),
    enabled: !!userId
  });
  
  // Fetch all available permission sets for the organization
  const { 
    data: permissionSets = [], 
    isLoading: isLoadingSets,
    isError: setsError
  } = useQuery({
    queryKey: [`/api/organizations/${organizationId}/permissions/sets`],
    queryFn: () => getPermissionSets(organizationId),
    enabled: !!organizationId
  });
  
  // Filter out permission sets that are already assigned to the user
  const availablePermissionSets = permissionSets.filter(set => 
    !userPermissions.some(up => up.permissionSetId === set.id)
  );
  
  // Select the first available permission set by default
  useEffect(() => {
    if (availablePermissionSets.length > 0 && !selectedPermissionSetId) {
      setSelectedPermissionSetId(availablePermissionSets[0].id);
    }
  }, [availablePermissionSets, selectedPermissionSetId]);
  
  // Group permissions by permission set for easier display
  const permissionsBySet: Record<number, UserPermission> = {};
  userPermissions.forEach(permission => {
    permissionsBySet[permission.permissionSetId] = permission;
  });
  
  // Assign permission set mutation
  const assignPermissionMutation = useMutation({
    mutationFn: ({ userId, permissionSetId }: { userId: number, permissionSetId: number }) => 
      assignPermissionSetToUser(userId, permissionSetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/permissions`] });
      setIsAddingPermission(false);
      setSelectedPermissionSetId(null);
      toast({
        title: "Permission Set Assigned",
        description: "The permission set has been assigned to the user."
      });
    },
    onError: (error) => {
      console.error("Error assigning permission set:", error);
      toast({
        title: "Error",
        description: "Failed to assign permission set to user.",
        variant: "destructive"
      });
    }
  });
  
  // Remove permission mutation
  const removePermissionMutation = useMutation({
    mutationFn: ({ userId, permissionId }: { userId: number, permissionId: number }) => 
      removeUserPermission(userId, permissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/permissions`] });
      toast({
        title: "Permission Set Removed",
        description: "The permission set has been removed from the user."
      });
    },
    onError: (error) => {
      console.error("Error removing permission set:", error);
      toast({
        title: "Error",
        description: "Failed to remove permission set from user.",
        variant: "destructive"
      });
    }
  });
  
  const handleAssignPermission = () => {
    if (!selectedPermissionSetId) {
      toast({
        title: "Error",
        description: "Please select a permission set to assign.",
        variant: "destructive"
      });
      return;
    }
    
    assignPermissionMutation.mutate({ userId, permissionSetId: selectedPermissionSetId });
  };
  
  const handleRemovePermission = (permissionId: number) => {
    removePermissionMutation.mutate({ userId, permissionId });
  };
  
  // Find the role's default permission set if any
  const defaultRolePermissionSet = userRole 
    ? permissionSets.find(set => set.isDefault && set.defaultForRole === userRole)
    : null;
  
  // Check if user has the default role permission set
  const hasDefaultRolePermission = defaultRolePermissionSet
    ? userPermissions.some(up => up.permissionSetId === defaultRolePermissionSet.id)
    : false;
  
  if (isLoadingPermissions || isLoadingSets) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Permissions</CardTitle>
          <CardDescription>Loading permissions...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (permissionsError || setsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Permissions</CardTitle>
          <CardDescription>Error loading permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              There was an error loading the user permissions. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>User Permissions</CardTitle>
          <CardDescription>
            {userName ? `Manage permissions for ${userName}` : `Manage permissions for User #${userId}`}
          </CardDescription>
        </div>
        {!readOnly && (
          <Dialog open={isAddingPermission} onOpenChange={setIsAddingPermission}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Assign Permission Set
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Permission Set</DialogTitle>
                <DialogDescription>
                  Select a permission set to assign to this user.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {availablePermissionSets.length > 0 ? (
                  <div className="space-y-2">
                    <Label htmlFor="permissionSet">Permission Set</Label>
                    <Select 
                      value={selectedPermissionSetId?.toString() || ""}
                      onValueChange={(value) => setSelectedPermissionSetId(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select permission set" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePermissionSets.map(set => (
                          <SelectItem key={set.id} value={set.id.toString()}>
                            {set.name} {set.isDefault && set.defaultForRole && `(Default for ${set.defaultForRole})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Available Permission Sets</AlertTitle>
                    <AlertDescription>
                      All permission sets have been assigned to this user.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingPermission(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignPermission}
                  disabled={!selectedPermissionSetId || availablePermissionSets.length === 0}
                >
                  Assign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      
      <CardContent>
        {userPermissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Custom Permissions</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-2">
              This user doesn't have any custom permission sets assigned. 
              {userRole && (
                <> They will use the default permissions for their role ({userRole}).</>
              )}
            </p>
            {userRole && defaultRolePermissionSet && (
              <div className="mt-4">
                <Badge variant="outline" className="text-xs">
                  Default role permission: {defaultRolePermissionSet.name}
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <Tabs defaultValue="assigned">
            <TabsList className="mb-4">
              <TabsTrigger value="assigned">Assigned Permission Sets</TabsTrigger>
              {userRole && defaultRolePermissionSet && (
                <TabsTrigger value="role">Role Permissions</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="assigned">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {userPermissions.map((userPermission) => {
                    // Find the full permission set with name
                    const permissionSet = permissionSets.find(ps => ps.id === userPermission.permissionSetId);
                    if (!permissionSet) return null;
                    
                    const isDefaultForRole = permissionSet.isDefault && 
                      permissionSet.defaultForRole === userRole;
                      
                    return (
                      <div 
                        key={userPermission.id}
                        className={`border rounded-lg p-4 ${isDefaultForRole ? 'border-primary/50' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-medium">{permissionSet.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {permissionSet.description || 'No description provided'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isDefaultForRole && (
                              <Badge>Role Default</Badge>
                            )}
                            {!readOnly && !isDefaultForRole && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemovePermission(userPermission.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {userPermission.permissions && userPermission.permissions.length > 0 ? (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium mb-2">Permissions</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {userPermission.permissions.map(permission => (
                                <div 
                                  key={permission.id}
                                  className={`p-2 rounded text-sm
                                    ${permission.allowed 
                                      ? 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-200' 
                                      : 'bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200'}`
                                  }
                                >
                                  <span className="capitalize font-medium">
                                    {permission.resource.replace('_', ' ')} - {permission.action}
                                  </span>
                                  <span className="block text-xs opacity-70">
                                    Scope: {permission.scope}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No specific permissions defined in this set.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
            
            {userRole && defaultRolePermissionSet && (
              <TabsContent value="role">
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Role-Based Permissions</AlertTitle>
                  <AlertDescription>
                    As a {userRole}, this user inherits the default permissions for that role.
                    {hasDefaultRolePermission 
                      ? " These permissions have been explicitly assigned to this user."
                      : " These permissions are applied automatically and not explicitly assigned to the user."
                    }
                  </AlertDescription>
                </Alert>
                
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium">{defaultRolePermissionSet.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {defaultRolePermissionSet.description || 'No description provided'}
                  </p>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium mb-2">Default Permissions</h4>
                    {defaultRolePermissionSet.permissions && defaultRolePermissionSet.permissions.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {defaultRolePermissionSet.permissions.map(permission => (
                          <div 
                            key={permission.id}
                            className={`p-2 rounded text-sm
                              ${permission.allowed 
                                ? 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-200' 
                                : 'bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200'}`
                            }
                          >
                            <span className="capitalize font-medium">
                              {permission.resource.replace('_', ' ')} - {permission.action}
                            </span>
                            <span className="block text-xs opacity-70">
                              Scope: {permission.scope}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No specific permissions defined for this role.
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}