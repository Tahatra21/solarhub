'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardPage from '@/components/dashboard/DashboardPage';
import DashboardNavigation from '@/components/dashboard/DashboardNavigation';
import { useUser } from '@/context/UsersContext';

export default function AdminDashboard() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }
      setIsLoading(false);
    }
  }, [user, loading, router]);

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard Admin
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Selamat datang di dashboard admin Product Lifecycle Management
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-6">
          <DashboardNavigation onNavigate={() => {}} />
        </div>

        {/* Main Dashboard Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <DashboardPage />
        </div>
      </div>
    </div>
  );
}