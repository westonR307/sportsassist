import { queryClient } from "@/lib/queryClient";

// Types
export interface PermissionSet {
  id: number;
  name: string;
  description: string | null;
  organizationId: number;
  isDefault: boolean;
  defaultForRole: string | null;
  createdAt: Date;
  updatedAt: Date;
  permissions?: Permission[];
}

export interface Permission {
  id: number;
  permissionSetId: number;
  resource: string;
  action: string;
  scope: string;
  allowed: boolean;
}

export interface UserPermission {
  id: number;
  userId: number;
  permissionSetId: number;
  createdAt: Date;
  updatedAt: Date;
  permissionSet?: PermissionSet;
  permissions?: Permission[];
}

// Get all permission sets for an organization
export const getPermissionSets = async (organizationId: number): Promise<PermissionSet[]> => {
  const response = await fetch(`/api/organizations/${organizationId}/permissions/sets`, {
    method: 'GET',
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch permission sets');
  }
  
  return await response.json();
};

// Get a specific permission set with its permissions
export const getPermissionSet = async (id: number): Promise<PermissionSet> => {
  const response = await fetch(`/api/permissions/sets/${id}`, {
    method: 'GET',
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch permission set');
  }
  
  return await response.json();
};

// Create a new permission set
export const createPermissionSet = async (organizationId: number, data: Partial<PermissionSet>): Promise<PermissionSet> => {
  const response = await fetch(`/api/organizations/${organizationId}/permissions/sets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to create permission set');
  }
  
  // Invalidate cache
  queryClient.invalidateQueries({ queryKey: [`/api/organizations/${organizationId}/permissions/sets`] });
  
  return await response.json();
};

// Update a permission set
export const updatePermissionSet = async (id: number, data: Partial<PermissionSet>): Promise<PermissionSet> => {
  const response = await fetch(`/api/permissions/sets/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to update permission set');
  }
  
  // Invalidate cache
  queryClient.invalidateQueries({ queryKey: [`/api/permissions/sets/${id}`] });
  
  return await response.json();
};

// Delete a permission set
export const deletePermissionSet = async (id: number, organizationId: number): Promise<void> => {
  const response = await fetch(`/api/permissions/sets/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to delete permission set');
  }
  
  // Invalidate cache
  queryClient.invalidateQueries({ queryKey: [`/api/organizations/${organizationId}/permissions/sets`] });
};

// Add a permission to a permission set
export const addPermission = async (permissionSetId: number, data: Partial<Permission>): Promise<Permission> => {
  const response = await fetch(`/api/permissions/sets/${permissionSetId}/permissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to add permission');
  }
  
  // Invalidate cache
  queryClient.invalidateQueries({ queryKey: [`/api/permissions/sets/${permissionSetId}`] });
  
  return await response.json();
};

// Update a permission
export const updatePermission = async (id: number, permissionSetId: number, data: Partial<Permission>): Promise<Permission> => {
  const response = await fetch(`/api/permissions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...data,
      permissionSetId
    }),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to update permission');
  }
  
  // Invalidate cache
  queryClient.invalidateQueries({ queryKey: [`/api/permissions/sets/${permissionSetId}`] });
  
  return await response.json();
};

// Delete a permission
export const deletePermission = async (id: number, permissionSetId: number): Promise<void> => {
  const response = await fetch(`/api/permissions/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to delete permission');
  }
  
  // Invalidate cache
  queryClient.invalidateQueries({ queryKey: [`/api/permissions/sets/${permissionSetId}`] });
};

// Get user permissions
export const getUserPermissions = async (userId: number): Promise<UserPermission[]> => {
  const response = await fetch(`/api/users/${userId}/permissions`, {
    method: 'GET',
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to get user permissions');
  }
  
  return await response.json();
};

// Assign a permission set to a user
export const assignPermissionSetToUser = async (userId: number, permissionSetId: number): Promise<UserPermission> => {
  const response = await fetch(`/api/users/${userId}/permissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ permissionSetId }),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to assign permission set to user');
  }
  
  // Invalidate cache
  queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/permissions`] });
  
  return await response.json();
};

// Remove a permission set from a user
export const removeUserPermission = async (userId: number, permissionId: number): Promise<void> => {
  const response = await fetch(`/api/users/${userId}/permissions/${permissionId}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to remove user permission');
  }
  
  // Invalidate cache
  queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/permissions`] });
};

// Check if user has a specific permission
export const checkPermission = async (resource: string, action: string, scope: string = 'organization'): Promise<boolean> => {
  const response = await fetch(`/api/permissions/check?resource=${resource}&action=${action}&scope=${scope}`, {
    method: 'GET',
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to check permission');
  }
  
  const data = await response.json();
  return data.hasPermission;
};

// Available resources
export const availableResources = [
  { value: 'camps', label: 'Camps' },
  { value: 'athletes', label: 'Athletes' },
  { value: 'team', label: 'Team' },
  { value: 'documents', label: 'Documents' },
  { value: 'settings', label: 'Settings' },
  { value: 'reports', label: 'Reports' },
  { value: 'communications', label: 'Communications' },
  { value: 'registrations', label: 'Registrations' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'schedules', label: 'Schedules' },
  { value: 'custom_fields', label: 'Custom Fields' }
];

// Available actions
export const availableActions = [
  { value: 'view', label: 'View' },
  { value: 'create', label: 'Create' },
  { value: 'edit', label: 'Edit' },
  { value: 'delete', label: 'Delete' },
  { value: 'approve', label: 'Approve' },
  { value: 'assign', label: 'Assign' },
  { value: 'message', label: 'Message' }
];

// Available scopes
export const availableScopes = [
  { value: 'organization', label: 'Organization-wide' },
  { value: 'camp', label: 'Camp-specific' },
  { value: 'self', label: 'Self only' }
];