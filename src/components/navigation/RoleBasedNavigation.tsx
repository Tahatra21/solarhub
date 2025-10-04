"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  RotateCcw, 
  Monitor, 
  BarChart3, 
  Users, 
  Shield, 
  Settings, 
  FileText,
  ChevronDown
} from 'lucide-react';
import { getAvailableMenus, canAccessAdmin, UserRole } from '@/utils/rbac';

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<any>;
  children?: NavigationItem[];
}

interface User {
  role: string;
  username: string;
}

export default function RoleBasedNavigation() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/me', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  if (isLoading) {
    return (
      <div className="hidden md:block flex-1">
        <div className="ml-8 flex items-center space-x-2">
          <div className="animate-pulse flex items-center space-x-2">
            <div className="h-8 w-20 bg-gray-300 rounded"></div>
            <div className="h-8 w-24 bg-gray-300 rounded"></div>
            <div className="h-8 w-20 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      dashboard: LayoutDashboard,
      box: Package,
      cycle: RotateCcw,
      monitor: Monitor,
      chart: BarChart3,
      users: Users,
      shield: Shield,
      settings: Settings,
      'file-text': FileText,
    };
    return icons[iconName] || LayoutDashboard;
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(path);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-50 text-red-700 border-red-200';
      case UserRole.CONTRIBUTOR:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case UserRole.USER:
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return '🔴 Admin';
      case UserRole.CONTRIBUTOR:
        return '🔵 Contributor';
      case UserRole.USER:
        return '🟢 User';
      default:
        return '⚪ Unknown';
    }
  };

  return (
    <div className="hidden md:block flex-1">
      <div className="ml-8 flex items-center space-x-2">
        {/* Main Navigation */}
        <Link href="/admin">
          <button className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isActive('/admin') 
              ? 'bg-blue-50 text-blue-700' 
              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
          }`}>
            <LayoutDashboard className="w-4 h-4 mr-1.5" />
            Dashboard
          </button>
        </Link>

        <Link href="/admin/products">
          <button className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isActive('/admin/products') 
              ? 'bg-blue-50 text-blue-700' 
              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
          }`}>
            <Package className="w-4 h-4 mr-1.5" />
            Product Catalog
          </button>
        </Link>

        <Link href="/admin/lifecycle">
          <button className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isActive('/admin/lifecycle') 
              ? 'bg-blue-50 text-blue-700' 
              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
          }`}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Lifecycle Analyst
          </button>
        </Link>

        <Link href="/admin/monitoring">
          <button className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isActive('/admin/monitoring') 
              ? 'bg-blue-50 text-blue-700' 
              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
          }`}>
            <Monitor className="w-4 h-4 mr-1.5" />
            Monitoring
          </button>
        </Link>

        <Link href="/admin/reports">
          <button className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isActive('/admin/reports') 
              ? 'bg-blue-50 text-blue-700' 
              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
          }`}>
            <BarChart3 className="w-4 h-4 mr-1.5" />
            Reports
          </button>
        </Link>

        {/* Administrator Menu - Only for ADMIN role */}
        {canAccessAdmin(user.role) && (
          <div className="relative group">
            <button className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              pathname.startsWith('/admin/users') || 
              pathname.startsWith('/admin/roles') || 
              pathname.startsWith('/admin/settings') || 
              pathname.startsWith('/admin/audit')
                ? 'bg-red-50 text-red-700' 
                : 'text-gray-700 hover:text-red-600 hover:bg-gray-50'
            }`}>
              <Shield className="w-4 h-4 mr-1.5" />
              Administrator
              <ChevronDown className="w-4 h-4 ml-1" />
            </button>

            {/* Dropdown Menu */}
            <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="py-1">
                <Link href="/admin/users">
                  <div className={`flex items-center px-4 py-2 text-sm hover:bg-gray-50 ${
                    isActive('/admin/users') ? 'text-red-600 bg-red-50' : 'text-gray-700'
                  }`}>
                    <Users className="w-4 h-4 mr-3" />
                    User Management
                  </div>
                </Link>
                <Link href="/admin/roles">
                  <div className={`flex items-center px-4 py-2 text-sm hover:bg-gray-50 ${
                    isActive('/admin/roles') ? 'text-red-600 bg-red-50' : 'text-gray-700'
                  }`}>
                    <Shield className="w-4 h-4 mr-3" />
                    Role Management
                  </div>
                </Link>
                <Link href="/admin/settings">
                  <div className={`flex items-center px-4 py-2 text-sm hover:bg-gray-50 ${
                    isActive('/admin/settings') ? 'text-red-600 bg-red-50' : 'text-gray-700'
                  }`}>
                    <Settings className="w-4 h-4 mr-3" />
                    System Settings
                  </div>
                </Link>
                <Link href="/admin/audit">
                  <div className={`flex items-center px-4 py-2 text-sm hover:bg-gray-50 ${
                    isActive('/admin/audit') ? 'text-red-600 bg-red-50' : 'text-gray-700'
                  }`}>
                    <FileText className="w-4 h-4 mr-3" />
                    Audit Logs
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* User Role Badge */}
        <div className={`ml-4 px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
          {getRoleBadge(user.role)}
        </div>
      </div>
    </div>
  );
}
