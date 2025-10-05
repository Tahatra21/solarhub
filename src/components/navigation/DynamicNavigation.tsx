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
import { normalizeRole } from '@/utils/rbac';

const DynamicNavigation = () => {
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: number; username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [menuPermissions, setMenuPermissions] = useState<any[]>([]);
  const [dropdownTimer, setDropdownTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/me', {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Fetch dynamic menu permissions
  useEffect(() => {
    const fetchMenuPermissions = async () => {
      if (!user) return;
      
      try {
        const res = await fetch('/api/menu-permissions', {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.permissions) {
            setMenuPermissions(data.permissions);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to fetch menu permissions:', error);
      }
      
      // Always fallback to static permissions for now
      console.log('Using static menu fallback for role:', user.role);
      setMenuPermissions(getStaticMenus(user.role));
    };
    
    fetchMenuPermissions();
  }, [user]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (dropdownTimer) {
        clearTimeout(dropdownTimer);
      }
    };
  }, [dropdownTimer]);

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

  const handleDropdownToggle = (itemName: string) => {
    // Clear existing timer
    if (dropdownTimer) {
      clearTimeout(dropdownTimer);
      setDropdownTimer(null);
    }

    if (activeDropdown === itemName) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(itemName);
      // Set timer to close dropdown after 3 seconds
      const timer = setTimeout(() => {
        setActiveDropdown(null);
        setDropdownTimer(null);
      }, 3000);
      setDropdownTimer(timer);
    }
  };

  const handleDropdownMouseEnter = () => {
    // Clear timer when mouse enters dropdown
    if (dropdownTimer) {
      clearTimeout(dropdownTimer);
      setDropdownTimer(null);
    }
  };

  const handleDropdownMouseLeave = () => {
    // Set timer when mouse leaves dropdown
    if (activeDropdown) {
      const timer = setTimeout(() => {
        setActiveDropdown(null);
        setDropdownTimer(null);
      }, 3000);
      setDropdownTimer(timer);
    }
  };

  const handleMenuItemClick = () => {
    // Clear timer and close dropdown when menu item is clicked
    if (dropdownTimer) {
      clearTimeout(dropdownTimer);
      setDropdownTimer(null);
    }
    setActiveDropdown(null);
  };

  const renderMenuItem = (item: any) => {
    const IconComponent = getIcon(item.icon);
    
    if (item.children && item.children.length > 0) {
      return (
        <div key={item.key} className="relative">
          <button
            onClick={() => handleDropdownToggle(item.key)}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive(item.path) || activeDropdown === item.key
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            <IconComponent className="w-4 h-4 mr-1.5" />
            {item.label}
            <ChevronDown className={`ml-1 h-4 w-4 transition-transform duration-200 ${
              activeDropdown === item.key ? 'rotate-180' : ''
            }`} />
          </button>

          {activeDropdown === item.key && (
            <div 
              className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/30 z-[9999]"
              onMouseEnter={handleDropdownMouseEnter}
              onMouseLeave={handleDropdownMouseLeave}
            >
              <div className="py-2">
                {item.key === 'administrator' ? (
                  // Special handling for Administrator menu with categories
                  <>
                    {/* Management Functions */}
                    <div className="px-3 py-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Management Functions
                      </div>
                      <div className="space-y-1">
                        {item.children.slice(0, 6).map((subItem: any) => (
                          <Link key={subItem.key} href={subItem.path} passHref>
                            <button
                              onClick={handleMenuItemClick}
                              className={`w-full text-left px-3 py-2 text-sm transition-all duration-200 rounded-lg ${
                                isActive(subItem.path)
                                  ? 'bg-red-50 text-red-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              {subItem.label}
                            </button>
                          </Link>
                        ))}
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
                        {item.children.slice(6).map((subItem: any) => (
                          <Link key={subItem.key} href={subItem.path} passHref>
                            <button
                              onClick={handleMenuItemClick}
                              className={`w-full text-left px-3 py-2 text-sm transition-all duration-200 rounded-lg ${
                                isActive(subItem.path)
                                  ? 'bg-red-50 text-red-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              {subItem.label}
                            </button>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  // Regular menu items
                  item.children.map((subItem: any) => (
                    <Link key={subItem.key} href={subItem.path} passHref>
                      <button
                        onClick={handleMenuItemClick}
                        className={`w-full text-left px-4 py-2 text-sm transition-all duration-200 ${
                          isActive(subItem.path)
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {subItem.label}
                      </button>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <Link key={item.key} href={item.path} passHref>
        <button className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive(item.path)
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
        }`}>
          <IconComponent className="w-4 h-4 mr-1.5" />
          {item.label}
        </button>
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="hidden md:block flex-1">
        <div className="ml-8 flex items-center space-x-2">
          <div className="animate-pulse h-8 w-24 bg-gray-200 rounded-lg"></div>
          <div className="animate-pulse h-8 w-32 bg-gray-200 rounded-lg"></div>
          <div className="animate-pulse h-8 w-28 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="hidden md:block flex-1">
      <div className="ml-8 flex items-center space-x-2">
        {menuPermissions.map(renderMenuItem)}
      </div>
    </div>
  );
};

// Fallback static menus
function getStaticMenus(role: string) {
  const staticMenus = [
    { key: 'dashboard', label: 'Dashboard', path: '/admin', icon: 'dashboard' },
    { key: 'product_catalog', label: 'Product Catalog', path: '/admin/product', icon: 'box' },
    { key: 'lifecycle_analyst', label: 'Lifecycle Analyst', path: '/admin/lifecycle', icon: 'cycle' },
    { 
      key: 'solar_hub', 
      label: 'Solar HUB', 
      path: '/admin/cusol-hub', 
      icon: 'monitor',
      children: [
        { key: 'monitoring_crjr', label: 'Monitoring CR/JR', path: '/admin/cusol-hub/monitoring-crjr', icon: 'monitor' },
        { key: 'monitoring_license', label: 'Monitoring License', path: '/admin/cusol-hub/monitoring-license', icon: 'monitor' },
        { key: 'monitoring_run_program', label: 'Monitoring Run Inisiatif', path: '/admin/cusol-hub/monitoring-run-program', icon: 'monitor' }
      ]
    }
  ];

  // Add Administrator menu for Admin role only
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'Admin') {
    staticMenus.push({
      key: 'administrator',
      label: 'Administrator',
      path: '/admin/users',
      icon: 'shield',
      children: [
        // Management Functions
        { key: 'kategori_management', label: 'Kategori Management', path: '/admin/kategori', icon: 'box' },
        { key: 'segment_management', label: 'Segment Management', path: '/admin/segmen', icon: 'box' },
        { key: 'stage_management', label: 'Stage Management', path: '/admin/stage', icon: 'box' },
        { key: 'interval_management', label: 'Interval Management', path: '/admin/interval', icon: 'box' },
        { key: 'dev_management', label: 'Dev Management', path: '/admin/devhistori', icon: 'box' },
        { key: 'user_management', label: 'User Management', path: '/admin/users', icon: 'users' },
        // System Settings
        { key: 'role_management', label: 'Role Management', path: '/admin/roles', icon: 'file-text' },
        { key: 'role_permissions', label: 'Role Permissions', path: '/admin/role-permissions', icon: 'shield' },
        { key: 'audit_logs', label: 'Audit Logs', path: '/admin/audit', icon: 'file-text' }
      ]
    });
  }


  return staticMenus;
}

export default DynamicNavigation;
