"use client";

import React from "react";
import { UserProvider } from "@/context/UsersContext";
import ToastProvider from '@/components/toast/ToastProvider';
import AppHeader from "@/layout/AppHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <UserProvider>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
          {/* Header with integrated navigation */}
          <AppHeader />
          {/* Page Content */}
          <div className="p-4 md:p-6">{children}</div>
        </div>
      </UserProvider>   
    </ToastProvider>
  );
}