import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LogOut, UserCircle, Shield, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

export const UserSwitcher = () => {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logoutMutation.mutateAsync();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const loginAsAdmin = async () => {
    try {
      setIsLoggingIn(true);
      
      // First logout the current user
      await logoutMutation.mutateAsync();
      
      // Then login as admin
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@sportsassist.io',
          password: 'adminpass123'
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to login as admin');
      }
      
      // Redirect to admin dashboard
      window.location.href = '/admin';
      
      toast({
        title: 'Logged in as Admin',
        description: 'Successfully switched to admin account',
      });
    } catch (error: any) {
      console.error('Admin login error:', error);
      toast({
        title: 'Login Failed',
        description: error.message || 'Failed to login as admin',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loginAsOrgOwner = async () => {
    try {
      setIsLoggingIn(true);
      
      // First logout the current user
      await logoutMutation.mutateAsync();
      
      // Then login as organization owner (camp creator)
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'wrosenau@outlook.com',
          password: 'password123'
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to login as organization owner');
      }
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
      
      toast({
        title: 'Logged in as Organization Owner',
        description: 'Successfully switched to organization owner account',
      });
    } catch (error: any) {
      console.error('Org owner login error:', error);
      toast({
        title: 'Login Failed',
        description: error.message || 'Failed to login as organization owner',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <Card className="shadow-md max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Account Switcher</CardTitle>
        <CardDescription>
          Switch between different user accounts or log out
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
          <p className="font-medium">Currently logged in as:</p>
          <div className="flex items-center mt-2">
            <UserCircle className="h-5 w-5 mr-2 text-primary" />
            <span>{user?.first_name} {user?.last_name}</span>
            <span className="ml-2 text-sm text-gray-500">({user?.role})</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={loginAsAdmin}
            disabled={isLoggingIn || isLoggingOut || user?.role === 'platform_admin'}
            className="flex items-center"
          >
            {isLoggingIn ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Login as Admin
          </Button>

          <Button
            variant="outline"
            onClick={loginAsOrgOwner}
            disabled={isLoggingIn || isLoggingOut || user?.role === 'camp_creator'}
            className="flex items-center"
          >
            {isLoggingIn ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserCircle className="h-4 w-4 mr-2" />
            )}
            Login as Org Owner
          </Button>

          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={isLoggingOut || isLoggingIn}
            className="flex items-center md:col-span-2"
          >
            {isLoggingOut ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            Logout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserSwitcher;