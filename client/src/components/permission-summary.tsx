import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import {
  getAllUserPermissions,
  PermissionSet,
  UserPermission,
  availableResources,
  availableActions,
  availableScopes
} from '@/lib/permissions';

interface PermissionSummaryProps {
  permissionSets: PermissionSet[];
  userPermissions?: UserPermission[];
  teamMembers?: any[];
  organizationId: number;
  loading?: boolean;
}

export function PermissionSummary({ 
  permissionSets,
  userPermissions,
  teamMembers,
  organizationId,
  loading = false
}: PermissionSummaryProps) {
  const [viewMode, setViewMode] = useState<'resource' | 'role' | 'user'>('resource');
  const [allUserPerms, setAllUserPerms] = useState<UserPerm[]>([]);
  const [userPermsLoading, setUserPermsLoading] = useState(false);
  
  // Fetch all user permissions for the organization
  useEffect(() => {
    const fetchAllUserPermissions = async () => {
      if (organizationId && viewMode === 'user') {
        try {
          setUserPermsLoading(true);
          const data = await getAllUserPermissions(organizationId);
          setAllUserPerms(data);
        } catch (error) {
          console.error('Failed to fetch all user permissions:', error);
        } finally {
          setUserPermsLoading(false);
        }
      }
    };
    
    fetchAllUserPermissions();
  }, [organizationId, viewMode]);

  // Get resource label from value
  const getResourceLabel = (value: string) => {
    const resource = availableResources.find(r => r.value === value);
    return resource ? resource.label : value;
  };

  // Get action label from value
  const getActionLabel = (value: string) => {
    const action = availableActions.find(a => a.value === value);
    return action ? action.label : value;
  };

  // Get scope label from value
  const getScopeLabel = (value: string) => {
    const scope = availableScopes.find(s => s.value === value);
    return scope ? scope.label : value;
  };

  // Format role display
  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
  };

  // Define interfaces for permission data
  interface PermData {
    resource: string;
    action: string;
    allowed: boolean;
    scope: string;
  }

  interface PermissionSetData {
    id: number;
    name: string;
    permissions: PermData[];
  }

  // Define the user permission type
  type UserPerm = {
    userId: number;
    username: string;
    name: string;
    email: string;
    role: string;
    permissionSets: PermissionSetData[];
  };
  
  // Group permissions by resource
  const permissionsByResource: Record<string, {
    resource: string,
    permissions: {
      action: string,
      roles: {
        role: string,
        allowed: boolean,
        scope: string
      }[]
    }[]
  }> = {};

  // Build the resource-centric permissions structure
  permissionSets.forEach(set => {
    const isDefaultSet = set.isDefault && set.defaultForRole;
    const role = set.defaultForRole || 'custom';

    set.permissions?.forEach(permission => {
      if (!permissionsByResource[permission.resource]) {
        permissionsByResource[permission.resource] = {
          resource: permission.resource,
          permissions: []
        };
      }

      // Find existing action or add new one
      let actionEntry = permissionsByResource[permission.resource].permissions
        .find(p => p.action === permission.action);

      if (!actionEntry) {
        actionEntry = {
          action: permission.action,
          roles: []
        };
        permissionsByResource[permission.resource].permissions.push(actionEntry);
      }

      // Add role permission
      actionEntry.roles.push({
        role,
        allowed: permission.allowed,
        scope: permission.scope
      });
    });
  });

  // Get role-based view data
  const getRoleBasedPermissions = () => {
    const roles: Record<string, {
      role: string,
      resources: Record<string, {
        actions: Record<string, {
          allowed: boolean,
          scope: string
        }>
      }>
    }> = {};

    permissionSets.forEach(set => {
      const role = set.defaultForRole || 'custom';
      
      if (!roles[role]) {
        roles[role] = {
          role,
          resources: {}
        };
      }

      set.permissions?.forEach(permission => {
        if (!roles[role].resources[permission.resource]) {
          roles[role].resources[permission.resource] = {
            actions: {}
          };
        }

        roles[role].resources[permission.resource].actions[permission.action] = {
          allowed: permission.allowed,
          scope: permission.scope
        };
      });
    });

    return Object.values(roles);
  };

  // Get user-based permissions if user data is provided
  const getUserBasedPermissions = () => {
    if (!userPermissions || !teamMembers) return [];

    const userPerms: UserPerm[] = [];

    teamMembers.forEach(member => {
      const memberPermissions = userPermissions.filter(up => up.userId === member.id);
      
      if (memberPermissions.length > 0) {
        const userPerm: UserPerm = {
          userId: member.id,
          username: member.username,
          name: `${member.first_name} ${member.last_name}`,
          email: member.email,
          role: member.role,
          permissionSets: []
        };

        memberPermissions.forEach(up => {
          // Find the full permission set info
          const fullSet = permissionSets.find(ps => ps.id === up.permissionSetId);
          if (fullSet) {
            userPerm.permissionSets.push({
              id: fullSet.id,
              name: fullSet.name,
              permissions: fullSet.permissions?.map(p => ({
                resource: p.resource,
                action: p.action,
                allowed: p.allowed,
                scope: p.scope
              })) || []
            });
          }
        });

        userPerms.push(userPerm);
      }
    });

    return userPerms;
  };

  // Function to export permissions to CSV
  const exportToCSV = () => {
    let csvContent = 'Resource,Action,Role,Allowed,Scope\n';
    
    Object.values(permissionsByResource).forEach(resourceData => {
      resourceData.permissions.forEach(actionData => {
        actionData.roles.forEach(roleData => {
          csvContent += `"${getResourceLabel(resourceData.resource)}","${getActionLabel(actionData.action)}","${formatRole(roleData.role)}","${roleData.allowed}","${getScopeLabel(roleData.scope)}"\n`;
        });
      });
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'permissions_summary.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Permissions Summary</CardTitle>
          <CardDescription>
            Overview of all permissions in the system
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="resource" onValueChange={(value) => setViewMode(value as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="resource">By Resource</TabsTrigger>
            <TabsTrigger value="role">By Role</TabsTrigger>
            {userPermissions && teamMembers && (
              <TabsTrigger value="user">By User</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="resource">
            <ScrollArea className="h-[600px]">
              {Object.values(permissionsByResource).map(resourceData => (
                <div key={resourceData.resource} className="mb-8">
                  <h3 className="text-xl font-semibold mb-2">{getResourceLabel(resourceData.resource)}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Role / Permission Set</TableHead>
                        <TableHead>Access</TableHead>
                        <TableHead>Scope</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resourceData.permissions.map(actionPerm => (
                        actionPerm.roles.map((rolePerm, idx: number) => (
                          <TableRow key={`${actionPerm.action}-${rolePerm.role}-${idx}`}>
                            {idx === 0 && (
                              <TableCell rowSpan={actionPerm.roles.length} className="font-medium">
                                {getActionLabel(actionPerm.action)}
                              </TableCell>
                            )}
                            <TableCell>{formatRole(rolePerm.role)}</TableCell>
                            <TableCell>
                              <Badge variant={rolePerm.allowed ? "default" : "destructive"}>
                                {rolePerm.allowed ? "Allowed" : "Denied"}
                              </Badge>
                            </TableCell>
                            <TableCell>{getScopeLabel(rolePerm.scope)}</TableCell>
                          </TableRow>
                        ))
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="role">
            <ScrollArea className="h-[600px]">
              {getRoleBasedPermissions().map(roleData => (
                <div key={roleData.role} className="mb-8">
                  <h3 className="text-xl font-semibold mb-2">{formatRole(roleData.role)}</h3>
                  
                  {Object.entries(roleData.resources).map(([resource, resourceData]) => (
                    <div key={`${roleData.role}-${resource}`} className="mb-4">
                      <h4 className="text-lg font-medium mb-2">{getResourceLabel(resource)}</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Action</TableHead>
                            <TableHead>Access</TableHead>
                            <TableHead>Scope</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(resourceData.actions).map(([action, actionData]) => (
                            <TableRow key={`${roleData.role}-${resource}-${action}`}>
                              <TableCell className="font-medium">{getActionLabel(action)}</TableCell>
                              <TableCell>
                                <Badge variant={actionData.allowed ? "default" : "destructive"}>
                                  {actionData.allowed ? "Allowed" : "Denied"}
                                </Badge>
                              </TableCell>
                              <TableCell>{getScopeLabel(actionData.scope)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              ))}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="user">
            <ScrollArea className="h-[600px]">
              {loading || userPermsLoading ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-lg text-muted-foreground">Loading user permissions...</p>
                </div>
              ) : allUserPerms.length > 0 ? (
                // Use the centralized API response data
                allUserPerms.map((userPerm: UserPerm) => (
                  <div key={userPerm.userId} className="mb-8">
                    <h3 className="text-xl font-semibold mb-2">
                      {userPerm.name || userPerm.username}
                      <Badge className="ml-2" variant="outline">{formatRole(userPerm.role)}</Badge>
                      <Badge className="ml-2" variant="secondary">{userPerm.email}</Badge>
                    </h3>
                    
                    {userPerm.permissionSets.length > 0 ? (
                      userPerm.permissionSets.map((permSet: PermissionSetData) => (
                        <div key={`${userPerm.userId}-${permSet.id}`} className="mb-4">
                          <h4 className="text-lg font-medium mb-2">{permSet.name}</h4>
                          
                          {permSet.permissions.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Resource</TableHead>
                                  <TableHead>Action</TableHead>
                                  <TableHead>Access</TableHead>
                                  <TableHead>Scope</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {permSet.permissions.map((perm: PermData, idx: number) => (
                                  <TableRow key={`${userPerm.userId}-${permSet.id}-${idx}`}>
                                    <TableCell>{getResourceLabel(perm.resource)}</TableCell>
                                    <TableCell>{getActionLabel(perm.action)}</TableCell>
                                    <TableCell>
                                      <Badge variant={perm.allowed ? "default" : "destructive"}>
                                        {perm.allowed ? "Allowed" : "Denied"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{getScopeLabel(perm.scope)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-sm text-muted-foreground">No permissions defined in this set.</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Uses default permissions for {formatRole(userPerm.role)} role.
                      </p>
                    )}
                  </div>
                ))
              ) : userPermissions && teamMembers ? (
                // Fallback to old method if the API call failed
                getUserBasedPermissions().map((userPerm: UserPerm) => (
                  <div key={userPerm.userId} className="mb-8">
                    <h3 className="text-xl font-semibold mb-2">
                      {userPerm.name}
                      <Badge className="ml-2" variant="outline">{formatRole(userPerm.role)}</Badge>
                      <Badge className="ml-2" variant="secondary">{userPerm.email}</Badge>
                    </h3>
                    
                    {userPerm.permissionSets.length > 0 ? (
                      userPerm.permissionSets.map((permSet: PermissionSetData) => (
                        <div key={`${userPerm.userId}-${permSet.id}`} className="mb-4">
                          <h4 className="text-lg font-medium mb-2">{permSet.name}</h4>
                          
                          {permSet.permissions.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Resource</TableHead>
                                  <TableHead>Action</TableHead>
                                  <TableHead>Access</TableHead>
                                  <TableHead>Scope</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {permSet.permissions.map((perm: PermData, idx: number) => (
                                  <TableRow key={`${userPerm.userId}-${permSet.id}-${idx}`}>
                                    <TableCell>{getResourceLabel(perm.resource)}</TableCell>
                                    <TableCell>{getActionLabel(perm.action)}</TableCell>
                                    <TableCell>
                                      <Badge variant={perm.allowed ? "default" : "destructive"}>
                                        {perm.allowed ? "Allowed" : "Denied"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{getScopeLabel(perm.scope)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-sm text-muted-foreground">No permissions defined in this set.</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No custom permission sets assigned.</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-48">
                  <p className="text-lg text-muted-foreground">No user data available</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
