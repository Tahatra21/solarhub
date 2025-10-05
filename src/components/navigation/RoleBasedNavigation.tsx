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
import { getAvailableMenus, canAccessAdmin, UserRole, normalizeRole } from '@/utils/rbac';

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
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownTimer, setDropdownTimer] = useState<NodeJS.Timeout | null>(null);
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

  const getRoleColor = (role: string | number) => {
    const normalizedRole = normalizeRole(role);
    switch (normalizedRole) {
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

  const getRoleBadge = (role: string | number) => {
    const normalizedRole = normalizeRole(role);
    switch (normalizedRole) {
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

        <Link href="/admin/product">
          <button className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isActive('/admin/product') 
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

        {/* Solar HUB Dropdown */}
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(activeDropdown === 'solar-hub' ? null : 'solar-hub')}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive('/admin/cusol-hub') || activeDropdown === 'solar-hub'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            <Monitor className="w-4 h-4 mr-1.5" />
            Solar HUB
            <ChevronDown className={`ml-1 h-4 w-4 transition-transform duration-200 ${
              activeDropdown === 'solar-hub' ? 'rotate-180' : ''
            }`} />
          </button>

          {activeDropdown === 'solar-hub' && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/30 z-[9999]">
              <div className="py-2">
                <Link href="/admin/cusol-hub/monitoring-crjr" passHref>
                  <button
                    onClick={() => setActiveDropdown(null)}
                    className={`w-full text-left px-4 py-2 text-sm transition-all duration-200 ${
                      isActive('/admin/cusol-hub/monitoring-crjr')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    Monitoring CR/JR
                  </button>
                </Link>
                <Link href="/admin/cusol-hub/monitoring-license" passHref>
                  <button
                    onClick={() => setActiveDropdown(null)}
                    className={`w-full text-left px-4 py-2 text-sm transition-all duration-200 ${
                      isActive('/admin/cusol-hub/monitoring-license')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    Monitoring License
                  </button>
                </Link>
                <Link href="/admin/cusol-hub/monitoring-run-program" passHref>
                  <button
                    onClick={() => setActiveDropdown(null)}
                    className={`w-full text-left px-4 py-2 text-sm transition-all duration-200 ${
                      isActive('/admin/cusol-hub/monitoring-run-program')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    Monitoring Run Inisiatif
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>


        {/* Administrator Menu - Only for ADMIN role */}
        {normalizeRole(user.role) === UserRole.ADMIN && (
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'administrator' ? null : 'administrator')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                pathname.startsWith('/admin/kategori') ||
                pathname.startsWith('/admin/segmen') ||
                pathname.startsWith('/admin/stage') ||
                pathname.startsWith('/admin/interval') ||
                pathname.startsWith('/admin/devhistori') ||
                pathname.startsWith('/admin/users') || 
                pathname.startsWith('/admin/roles') || 
                pathname.startsWith('/admin/role-permissions') ||
                pathname.startsWith('/admin/settings') || 
                pathname.startsWith('/admin/audit') ||
                activeDropdown === 'administrator'
                  ? 'bg-red-50 text-red-700' 
                  : 'text-gray-700 hover:text-red-600 hover:bg-gray-50'
              }`}
            >
              <Shield className="w-4 h-4 mr-1.5" />
              Administrator
              <ChevronDown className={`ml-1 h-4 w-4 transition-transform duration-200 ${
                activeDropdown === 'administrator' ? 'rotate-180' : ''
              }`} />
            </button>

            {activeDropdown === 'administrator' && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/30 z-[9999]">
                <div className="py-2">
                  {/* Management Functions */}
                  <div className="px-3 py-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Management Functions
                    </div>
                    <div className="space-y-1">
                      <Link href="/admin/kategori">
                        <button
                          onClick={() => setActiveDropdown(null)}
                          className={`w-full text-left px-3 py-2 text-sm transition-all duration-200 rounded-lg ${
                            isActive('/admin/kategori')
                              ? 'bg-red-50 text-red-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          Kategori Management
                        </button>
                      </Link>
                      <Link href="/admin/segmen">
                        <button
                          onClick={() => setActiveDropdown(null)}
                          className={`w-full text-left px-3 py-2 text-sm transition-all duration-200 rounded-lg ${
                            isActive('/admin/segmen')
                              ? 'bg-red-50 text-red-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          Segment Management
                        </button>
                      </Link>
                      <Link href="/admin/stage">
                        <button
                          onClick={() => setActiveDropdown(null)}
                          className={`w-full text-left px-3 py-2 text-sm transition-all duration-200 rounded-lg ${
                            isActive('/admin/stage')
                              ? 'bg-red-50 text-red-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          Stage Management
                        </button>
                      </Link>
                      <Link href="/admin/interval">
                        <button
                          onClick={() => setActiveDropdown(null)}
                          className={`w-full text-left px-3 py-2 text-sm transition-all duration-200 rounded-lg ${
                            isActive('/admin/interval')
                              ? 'bg-red-50 text-red-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          Interval Management
                        </button>
                      </Link>
                      <Link href="/admin/devhistori">
                        <button
                          onClick={() => setActiveDropdown(null)}
                          className={`w-full text-left px-3 py-2 text-sm transition-all duration-200 rounded-lg ${
                            isActive('/admin/devhistori')
                              ? 'bg-red-50 text-red-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          Dev Management
                        </button>
                      </Link>
                      <Link href="/admin/users">
                        <button
                          onClick={() => setActiveDropdown(null)}
                          className={`w-full text-left px-3 py-2 text-sm transition-all duration-200 rounded-lg ${
                            isActive('/admin/users')
                              ? 'bg-red-50 text-red-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          User Management
                        </button>
                      </Link>
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div className="border-t border-gray-200 mx-3 my-2"></div>
                  
                  {/* System Settings */}
                  <div className="px-3 py-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      System Settings
                    </div>
                    <div className="space-y-1">
                      <Link href="/admin/roles">
                        <button
                          onClick={() => setActiveDropdown(null)}
                          className={`w-full text-left px-3 py-2 text-sm transition-all duration-200 rounded-lg ${
                            isActive('/admin/roles')
                              ? 'bg-red-50 text-red-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          Role Management
                        </button>
                      </Link>
                      <Link href="/admin/role-permissions">
                        <button
                          onClick={() => setActiveDropdown(null)}
                          className={`w-full text-left px-3 py-2 text-sm transition-all duration-200 rounded-lg ${
                            isActive('/admin/role-permissions')
                              ? 'bg-red-50 text-red-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          Role Permissions
                        </button>
                      </Link>
                      <Link href="/admin/audit">
                        <button
                          onClick={() => setActiveDropdown(null)}
                          className={`w-full text-left px-3 py-2 text-sm transition-all duration-200 rounded-lg ${
                            isActive('/admin/audit')
                              ? 'bg-red-50 text-red-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          Audit Logs
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
