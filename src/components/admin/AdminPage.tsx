"use client";
import { useEffect, useState } from "react";
import React from "react";
import { useRouter } from 'next/navigation';
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DashboardPage from "@/components/dashboard/DashboardPage";
import DashboardNavigation from "@/components/dashboard/DashboardNavigation";

export default function AdminPage() {
  const [user, setUser] = useState<unknown>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();

        if (!data.authenticated) {
          router.push("/login");
        } else {
          setUser(data.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push("/login");
      } finally {
        setIsAuthChecked(true);
      }
    };

    checkAuth();
  }, [router]);

  if (!isAuthChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Main Dashboard Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <DashboardPage />
        </div>
      </div>
  );
}