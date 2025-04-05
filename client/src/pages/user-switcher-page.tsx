import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { UserSwitcher } from '@/components/user-switcher';

const UserSwitcherPage = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">User Account Management</h1>
      <UserSwitcher />
    </div>
  );
};

export default UserSwitcherPage;