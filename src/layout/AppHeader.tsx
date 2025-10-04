"use client";
// import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import UserDropdown from "@/components/header/UserDropdown";
import NotificationBell from "@/components/NotificationBell";
import RoleBasedNavigation from "@/components/navigation/RoleBasedNavigation";
import Image from "next/image";
import Link from "next/link";
import React, { useState ,useEffect,useRef} from "react";
import { usePathname } from "next/navigation";
import { useNavigateWithLoading } from "@/hooks/useNavigateWithLoading";
import {
  DashboardIcon,
  ProductIcon,
  LifecycleIcon,
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
    name: "Solar HUB",
    path: "/admin/cusol-hub",
    subItems: [
      { name: "Monitoring CR/JR", path: "/admin/cusol-hub/monitoring-crjr", pro: false },
      { name: "Monitoring License", path: "/admin/cusol-hub/monitoring-license", pro: false },
      { name: "Monitoring Run Inisiatif", path: "/admin/cusol-hub/monitoring-run-program", pro: false },
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
];

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const pathname = usePathname();
  const { navigateTo } = useNavigateWithLoading();
  const navRef = useRef<HTMLDivElement>(null);

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Click outside handler for dropdowns
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
    <header ref={navRef} className="sticky top-0 flex w-full bg-white/90 backdrop-blur-xl border-b border-gray-200/30 shadow-lg z-[1005]">
      <div className="max-w-full mx-auto px-6 w-full">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/admin" className="flex items-center hover:opacity-80 transition-opacity duration-200">
              <Image
                src="/images/admin/plniconplus.png"
                alt="PLN Logo"
                width={32}
                height={32}
                className="h-8"
                style={{ width: 'auto' }}
                priority
              />
            </Link>
          </div>

          {/* Role-Based Navigation */}
          <RoleBasedNavigation />

          {/* User Functions - Always Visible */}
          <div className="flex items-center gap-1 2xsm:gap-2 sm:gap-3">
            {/* <!-- Notification Bell --> */}
            <NotificationBell />
            {/* <!-- User Area --> */}
            <UserDropdown />
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
    </header>
  );
};

export default AppHeader;