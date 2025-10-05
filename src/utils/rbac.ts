/**
 * Role-Based Access Control (RBAC) Utilities
 * Solution Architect HUB - PLN Icon Plus
 */

export enum UserRole {
  USER = 'User',           // Read-Only access
  CONTRIBUTOR = 'Contributor', // Read & Write access
  ADMIN = 'Admin'          // Full access including Administrator menu
}

// Helper function to normalize role (handle both string and number)
export function normalizeRole(role: string | number): string {
  if (typeof role === 'number') {
    switch (role) {
      case 1: return UserRole.ADMIN;
      case 2: return UserRole.CONTRIBUTOR;
      case 3: return UserRole.USER;
      default: return UserRole.USER;
    }
  }
  return role;
}

export enum Permission {
  // Read permissions
  READ_DASHBOARD = 'read:dashboard',
  READ_PRODUCTS = 'read:products',
  READ_LIFECYCLE = 'read:lifecycle',
  READ_MONITORING = 'read:monitoring',
  READ_REPORTS = 'read:reports',
  
  // Write permissions
  CREATE_PRODUCTS = 'create:products',
  UPDATE_PRODUCTS = 'update:products',
  DELETE_PRODUCTS = 'delete:products',
  CREATE_LIFECYCLE = 'create:lifecycle',
  UPDATE_LIFECYCLE = 'update:lifecycle',
  DELETE_LIFECYCLE = 'delete:lifecycle',
  
  // Admin permissions
  READ_ADMIN = 'read:admin',
  MANAGE_USERS = 'manage:users',
  MANAGE_ROLES = 'manage:roles',
  MANAGE_SETTINGS = 'manage:settings',
  VIEW_AUDIT_LOGS = 'view:audit_logs'
}

// Role-Permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    Permission.READ_DASHBOARD,
    Permission.READ_PRODUCTS,
    Permission.READ_LIFECYCLE,
    Permission.READ_MONITORING,
    Permission.READ_REPORTS
  ],
  
  [UserRole.CONTRIBUTOR]: [
    Permission.READ_DASHBOARD,
    Permission.READ_PRODUCTS,
    Permission.READ_LIFECYCLE,
    Permission.READ_MONITORING,
    Permission.READ_REPORTS,
    Permission.CREATE_PRODUCTS,
    Permission.UPDATE_PRODUCTS,
    Permission.DELETE_PRODUCTS,
    Permission.CREATE_LIFECYCLE,
    Permission.UPDATE_LIFECYCLE,
    Permission.DELETE_LIFECYCLE
  ],
  
  [UserRole.ADMIN]: [
    Permission.READ_DASHBOARD,
    Permission.READ_PRODUCTS,
    Permission.READ_LIFECYCLE,
    Permission.READ_MONITORING,
    Permission.READ_REPORTS,
    Permission.CREATE_PRODUCTS,
    Permission.UPDATE_PRODUCTS,
    Permission.DELETE_PRODUCTS,
    Permission.CREATE_LIFECYCLE,
    Permission.UPDATE_LIFECYCLE,
    Permission.DELETE_LIFECYCLE,
    Permission.READ_ADMIN,
    Permission.MANAGE_USERS,
    Permission.MANAGE_ROLES,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_AUDIT_LOGS
  ]
};

/**
 * Check if user has specific permission
 */
export function hasPermission(userRole: string, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole as UserRole];
  return rolePermissions ? rolePermissions.includes(permission) : false;
}

/**
 * Check if user can access admin menu
 */
export function canAccessAdmin(userRole: string): boolean {
  return hasPermission(userRole, Permission.READ_ADMIN);
}

/**
 * Check if user can perform CRUD operations
 */
export function canPerformCRUD(userRole: string): boolean {
  return userRole === UserRole.CONTRIBUTOR || userRole === UserRole.ADMIN;
}

/**
 * Check if user can manage users
 */
export function canManageUsers(userRole: string): boolean {
  return hasPermission(userRole, Permission.MANAGE_USERS);
}

/**
 * Check if user can manage roles
 */
export function canManageRoles(userRole: string): boolean {
  return hasPermission(userRole, Permission.MANAGE_ROLES);
}

/**
 * Check if user can manage system settings
 */
export function canManageSettings(userRole: string): boolean {
  return hasPermission(userRole, Permission.MANAGE_SETTINGS);
}

/**
 * Check if user can view audit logs
 */
export function canViewAuditLogs(userRole: string): boolean {
  return hasPermission(userRole, Permission.VIEW_AUDIT_LOGS);
}

/**
 * Get user role level (1=User, 2=Contributor, 3=Admin)
 */
export function getRoleLevel(userRole: string): number {
  switch (userRole) {
    case UserRole.USER:
      return 1;
    case UserRole.CONTRIBUTOR:
      return 2;
    case UserRole.ADMIN:
      return 3;
    default:
      return 0;
  }
}

/**
 * Check if user role level is sufficient
 */
export function hasMinimumRoleLevel(userRole: string, requiredLevel: number): boolean {
  return getRoleLevel(userRole) >= requiredLevel;
}

/**
 * Get role display name
 */
export function getRoleDisplayName(userRole: string): string {
  switch (userRole) {
    case UserRole.USER:
      return 'User (Read-Only)';
    case UserRole.CONTRIBUTOR:
      return 'Contributor (Read & Write)';
    case UserRole.ADMIN:
      return 'Admin (Full Access)';
    default:
      return 'Unknown Role';
  }
}

/**
 * Get role description
 */
export function getRoleDescription(userRole: string): string {
  switch (userRole) {
    case UserRole.USER:
      return 'Can view all data and reports. Cannot create, update, or delete data.';
    case UserRole.CONTRIBUTOR:
      return 'Can view and manage all data. Cannot access Administrator menu.';
    case UserRole.ADMIN:
      return 'Full access to all features including user management and system settings.';
    default:
      return 'Unknown role permissions.';
  }
}

/**
 * Check if user can access specific menu
 */
export function canAccessMenu(userRole: string, menuPath: string): boolean {
  // Admin menu access
  if (menuPath.startsWith('/admin/users') || 
      menuPath.startsWith('/admin/settings') || 
      menuPath.startsWith('/admin/roles') ||
      menuPath.startsWith('/admin/audit')) {
    return canAccessAdmin(userRole);
  }
  
  // All other menus are accessible by all roles
  return true;
}

/**
 * Get available menus for user role
 */
export function getAvailableMenus(userRole: string): Array<{path: string, label: string, icon: string}> {
  const baseMenus = [
    { path: '/admin', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/product', label: 'Product Catalog', icon: 'box' },
    { path: '/admin/lifecycle', label: 'Lifecycle Analyst', icon: 'cycle' },
    { 
      path: '/admin/cusol-hub', 
      label: 'Solar HUB', 
      icon: 'monitor',
      subItems: [
        { path: '/admin/cusol-hub/monitoring-crjr', label: 'Monitoring CR/JR' },
        { path: '/admin/cusol-hub/monitoring-license', label: 'Monitoring License' },
        { path: '/admin/cusol-hub/monitoring-run-program', label: 'Monitoring Run Inisiatif' }
      ]
    }
  ];

  // Add admin menus for ADMIN role
  if (canAccessAdmin(userRole)) {
    baseMenus.push(
      { path: '/admin/users', label: 'User Management', icon: 'users' },
      { path: '/admin/roles', label: 'Role Management', icon: 'shield' },
      { path: '/admin/settings', label: 'System Settings', icon: 'settings' },
      { path: '/admin/audit', label: 'Audit Logs', icon: 'file-text' }
    );
  }

  return baseMenus;
}
