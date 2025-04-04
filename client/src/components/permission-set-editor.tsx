import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PermissionSet, Permission, availableResources, availableActions, availableScopes, updatePermissionSet, addPermission, updatePermission, deletePermission } from '@/lib/permissions';
import { Pencil, Trash2, Plus, Save, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Role } from '@shared/types';

interface PermissionSetEditorProps {
  permissionSet: PermissionSet;
  onSave?: (updatedSet: PermissionSet) => void;
  readOnly?: boolean;
}

export function PermissionSetEditor({ permissionSet, onSave, readOnly = false }: PermissionSetEditorProps) {
  const { toast } = useToast();
  const [editedSet, setEditedSet] = useState<PermissionSet>({ ...permissionSet });
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingPermission, setIsAddingPermission] = useState(false);
  const [newPermission, setNewPermission] = useState<Partial<Permission>>({
    resource: availableResources[0].value,
    action: availableActions[0].value, 
    scope: 'organization',
    allowed: true
  });
  
  useEffect(() => {
    // Update component state when the prop changes
    setEditedSet({ ...permissionSet });
  }, [permissionSet]);
  
  const handleSaveSet = async () => {
    try {
      const updated = await updatePermissionSet(editedSet.id, {
        name: editedSet.name,
        description: editedSet.description,
        isDefault: editedSet.isDefault,
        defaultForRole: editedSet.defaultForRole
      });
      
      setIsEditing(false);
      
      toast({
        title: "Permission Set Updated",
        description: "The permission set has been updated successfully."
      });
      
      if (onSave) {
        onSave(updated);
      }
    } catch (error) {
      console.error("Error updating permission set:", error);
      toast({
        title: "Error",
        description: "Failed to update permission set.",
        variant: "destructive"
      });
    }
  };
  
  const handleAddPermission = async () => {
    try {
      await addPermission(permissionSet.id, newPermission);
      
      // Reset form and close dialog
      setNewPermission({
        resource: availableResources[0].value,
        action: availableActions[0].value,
        scope: 'organization',
        allowed: true
      });
      setIsAddingPermission(false);
      
      toast({
        title: "Permission Added",
        description: "The permission has been added to the set."
      });
      
      // Refresh the parent component
      if (onSave) {
        // Get the updated permission set after adding a permission
        const updated = await updatePermissionSet(editedSet.id, {});
        onSave(updated);
      }
    } catch (error) {
      console.error("Error adding permission:", error);
      toast({
        title: "Error",
        description: "Failed to add permission.",
        variant: "destructive"
      });
    }
  };
  
  const handleTogglePermission = async (permission: Permission) => {
    if (readOnly) return;
    
    try {
      await updatePermission(permission.id, permission.permissionSetId, {
        ...permission,
        allowed: !permission.allowed
      });
      
      toast({
        title: "Permission Updated",
        description: "The permission has been updated."
      });
      
      // Refresh the parent component
      if (onSave) {
        // Get the updated permission set after updating a permission
        const updated = await updatePermissionSet(editedSet.id, {});
        onSave(updated);
      }
    } catch (error) {
      console.error("Error updating permission:", error);
      toast({
        title: "Error",
        description: "Failed to update permission.",
        variant: "destructive"
      });
    }
  };
  
  const handleDeletePermission = async (permission: Permission) => {
    if (readOnly) return;
    
    try {
      await deletePermission(permission.id, permission.permissionSetId);
      
      toast({
        title: "Permission Removed",
        description: "The permission has been removed from the set."
      });
      
      // Refresh the parent component
      if (onSave) {
        // Get the updated permission set after deleting a permission
        const updated = await updatePermissionSet(editedSet.id, {});
        onSave(updated);
      }
    } catch (error) {
      console.error("Error deleting permission:", error);
      toast({
        title: "Error",
        description: "Failed to delete permission.",
        variant: "destructive"
      });
    }
  };
  
  // Group permissions by resource for easier management
  const permissionsByResource: Record<string, Permission[]> = {};
  editedSet.permissions?.forEach(permission => {
    if (!permissionsByResource[permission.resource]) {
      permissionsByResource[permission.resource] = [];
    }
    permissionsByResource[permission.resource].push(permission);
  });
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{isEditing ? 'Edit Permission Set' : editedSet.name}</CardTitle>
          <CardDescription>
            {isEditing ? 'Modify the permission set details' : editedSet.description || 'No description provided'}
          </CardDescription>
        </div>
        {!readOnly && !isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Details
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={editedSet.name}
                onChange={(e) => setEditedSet({ ...editedSet, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                value={editedSet.description || ''}
                onChange={(e) => setEditedSet({ ...editedSet, description: e.target.value })}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isDefault" 
                checked={editedSet.isDefault}
                onCheckedChange={(checked) => setEditedSet({ ...editedSet, isDefault: checked as boolean })}
              />
              <Label htmlFor="isDefault">Default for role:</Label>
            </div>
            
            {editedSet.isDefault && (
              <div className="space-y-2">
                <Label htmlFor="defaultRole">Default role</Label>
                <Select 
                  value={editedSet.defaultForRole || undefined} 
                  onValueChange={(value) => setEditedSet({ ...editedSet, defaultForRole: value as Role })}
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
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {editedSet.isDefault && editedSet.defaultForRole && (
                <Badge variant="outline">
                  Default for: {editedSet.defaultForRole.replace('_', ' ')}
                </Badge>
              )}
            </div>
            
            <Tabs defaultValue="permissions">
              <TabsList className="mb-4">
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="permissions" className="space-y-4">
                {editedSet.isDefault && editedSet.defaultForRole && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Default Role Permissions</AlertTitle>
                    <AlertDescription>
                      This is the default permission set for the {editedSet.defaultForRole.replace('_', ' ')} role.
                      Changes made here will affect all users with this role.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Permissions</h3>
                  {!readOnly && (
                    <Dialog open={isAddingPermission} onOpenChange={setIsAddingPermission}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Permission
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Permission</DialogTitle>
                          <DialogDescription>
                            Define what actions can be performed on which resources.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="resource">Resource</Label>
                            <Select 
                              value={newPermission.resource} 
                              onValueChange={(value) => setNewPermission({ ...newPermission, resource: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select resource" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableResources.map(resource => (
                                  <SelectItem key={resource.value} value={resource.value}>{resource.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="action">Action</Label>
                            <Select 
                              value={newPermission.action} 
                              onValueChange={(value) => setNewPermission({ ...newPermission, action: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select action" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableActions.map(action => (
                                  <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="scope">Scope</Label>
                            <Select 
                              value={newPermission.scope} 
                              onValueChange={(value) => setNewPermission({ ...newPermission, scope: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select scope" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableScopes.map(scope => (
                                  <SelectItem key={scope.value} value={scope.value}>{scope.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="allowed" 
                              checked={newPermission.allowed}
                              onCheckedChange={(checked) => setNewPermission({ ...newPermission, allowed: checked as boolean })}
                            />
                            <Label htmlFor="allowed">Permission is allowed</Label>
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddingPermission(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddPermission}>
                            Add Permission
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                
                <ScrollArea className="h-[400px] pr-4">
                  {Object.keys(permissionsByResource).length > 0 ? (
                    Object.entries(permissionsByResource).map(([resource, permissions]) => (
                      <div key={resource} className="mb-6">
                        <h4 className="text-md font-medium mb-2 capitalize">
                          {resource.replace('_', ' ')}
                        </h4>
                        <div className="space-y-2">
                          {permissions.map(permission => (
                            <div key={permission.id} 
                              className={`flex items-center justify-between p-3 rounded-md
                                ${permission.allowed 
                                  ? 'bg-green-50 dark:bg-green-950' 
                                  : 'bg-red-50 dark:bg-red-950'}`
                              }
                            >
                              <div className="flex flex-col">
                                <span className="font-medium capitalize">{permission.action}</span>
                                <span className="text-sm text-muted-foreground">
                                  Scope: {permission.scope}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {!readOnly && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant={permission.allowed ? "default" : "outline"}
                                      onClick={() => handleTogglePermission(permission)}
                                    >
                                      {permission.allowed ? "Allowed" : "Denied"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeletePermission(permission)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {readOnly && (
                                  <Badge variant={permission.allowed ? "default" : "outline"}>
                                    {permission.allowed ? "Allowed" : "Denied"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No permissions defined for this set.
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="details">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Created</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(editedSet.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Last Updated</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(editedSet.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Organization ID</h4>
                    <p className="text-sm text-muted-foreground">
                      {editedSet.organizationId}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
      
      {isEditing && (
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveSet}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}