"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavigateWithLoading } from "@/hooks/useNavigateWithLoading";
import {
  DashboardIcon,
  ProductIcon,
  LifecycleIcon,
  ReportsIcon,
  UsersIcon,
  BoxCubeIcon,
  PlugInIcon,
  ChevronDownIcon,
} from "@/icons/index";

type NavItem = {
  name: string;
  lightIcon: React.ReactNode;
  darkIcon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    lightIcon: <DashboardIcon />,
    darkIcon: <DashboardIcon />,
    name: "Dashboard",
    path: "/admin",
  },
  {
    lightIcon: <ProductIcon />,
    darkIcon: <ProductIcon />,
    name: "Product Catalog",
    path: "/admin/product",
  },
  {
    lightIcon: <LifecycleIcon />,
    darkIcon: <LifecycleIcon />,
    name: "Lifecycle Analyst",
    path: "/admin/lifecycle",
  },
  {
    lightIcon: <BoxCubeIcon />,
    darkIcon: <BoxCubeIcon />,
    name: "Cusol HUB",
    path: "/admin/cusol-hub",
    subItems: [
      { name: "Monitoring CR/JR", path: "/admin/cusol-hub/monitoring-crjr", pro: false },
      { name: "Monitoring License", path: "/admin/cusol-hub/monitoring-license", pro: false },
    ],
  },
  {
    lightIcon: <UsersIcon />,
    darkIcon: <UsersIcon />,
    name: "Administrator",
    subItems: [
      { name: "Kategori Management", path: "/admin/kategori", pro: false },
      { name: "Segment Management", path: "/admin/segmen", pro: false },
      { name: "Stage Management", path: "/admin/stage", pro: false },
      { name: "Interval Management", path: "/admin/interval", pro: false },
      { name: "Dev Management", path: "/admin/devhistori", pro: false },
      { name: "User Management", path: "/admin/users", pro: false },
    ],
  },
  {
    lightIcon: <ReportsIcon />,
    darkIcon: <ReportsIcon />,
    name: "Monitoring",
    path: "/admin/monitoring",
  },
];

const HorizontalNav: React.FC = () => {
  const pathname = usePathname();
  const { navigateTo } = useNavigateWithLoading();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    if (path === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    navigateTo(path);
    setActiveDropdown(null);
  };

  const handleDropdownToggle = (itemName: string) => {
    setActiveDropdown(activeDropdown === itemName ? null : itemName);
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav ref={navRef} className="bg-white/90 backdrop-blur-xl border-b border-gray-200/30 shadow-sm relative z-50 sticky top-0">
      <div className="max-w-full mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <img
                className="h-8 w-auto"
                src="/images/admin/plniconplus.png"
                alt="PLN Logo"
              />
            </Link>
          </div>

          {/* Main Navigation */}
          <div className="hidden md:block flex-1">
            <div className="ml-8 flex items-center space-x-2">
              {navItems.map((item) => (
                <div key={item.name} className="relative">
                  {item.subItems ? (
                    <div className="relative">
                      <button
                        onClick={() => handleDropdownToggle(item.name)}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive(item.path || '') || activeDropdown === item.name
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="mr-1.5">{item.lightIcon}</span>
                        {item.name}
                        <ChevronDownIcon className={`ml-1 h-4 w-4 transition-transform duration-200 ${
                          activeDropdown === item.name ? 'rotate-180' : ''
                        }`} />
                      </button>

                      {/* Dropdown Menu */}
                      {activeDropdown === item.name && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/30 z-[9999]">
                          <div className="py-2">
                            {item.subItems.map((subItem) => (
                              <button
                                key={subItem.name}
                                onClick={() => handleNavigation(subItem.path)}
                                className={`w-full text-left px-4 py-2 text-sm transition-all duration-200 ${
                                  isActive(subItem.path)
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                              >
                                {subItem.name}
                                {subItem.new && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    New
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleNavigation(item.path!)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive(item.path!)
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="mr-1.5">{item.lightIcon}</span>
                      {item.name}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Profile and Bell Icons */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Bell Icon */}
            <button className="p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-all duration-200 relative">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            </button>
            
            {/* Profile Icon */}
            <button className="p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-all duration-200">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setActiveDropdown(activeDropdown ? null : 'mobile')}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {activeDropdown === 'mobile' && (
          <div className="md:hidden relative z-[9999]">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white/95 backdrop-blur-xl rounded-lg mt-2 shadow-xl border border-gray-200/30">
              {navItems.map((item) => (
                <div key={item.name}>
                  {item.subItems ? (
                    <div>
                      <button
                        onClick={() => handleDropdownToggle(`mobile-${item.name}`)}
                        className={`flex items-center w-full px-3 py-2 rounded-md text-sm font-medium ${
                          isActive(item.path || '')
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <span className="mr-2">{item.lightIcon}</span>
                        {item.name}
                        <ChevronDownIcon className={`ml-auto h-4 w-4 transition-transform duration-200 ${
                          activeDropdown === `mobile-${item.name}` ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {activeDropdown === `mobile-${item.name}` && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.subItems.map((subItem) => (
                            <button
                              key={subItem.name}
                              onClick={() => handleNavigation(subItem.path)}
                              className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                                isActive(subItem.path)
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              {subItem.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleNavigation(item.path!)}
                      className={`flex items-center w-full px-3 py-2 rounded-md text-sm font-medium ${
                        isActive(item.path!)
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <span className="mr-2">{item.lightIcon}</span>
                      {item.name}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default HorizontalNav;
