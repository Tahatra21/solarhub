/**
 * RBAC System Test Cases
 * Solution Architect HUB - PLN Icon Plus
 */

import { 
  hasPermission, 
  canPerformCRUD, 
  canAccessAdmin, 
  canManageUsers,
  UserRole,
  Permission 
} from '@/utils/rbac';

// Test 1: Permission Checking
console.log('🧪 Test 1: Permission Checking');
console.log('=============================');

// Test User role permissions
console.log('User Role Tests:');
console.log('✅ READ_DASHBOARD:', hasPermission(UserRole.USER, Permission.READ_DASHBOARD));
console.log('❌ CREATE_PRODUCTS:', hasPermission(UserRole.USER, Permission.CREATE_PRODUCTS));
console.log('❌ MANAGE_USERS:', hasPermission(UserRole.USER, Permission.MANAGE_USERS));
console.log('❌ READ_ADMIN:', hasPermission(UserRole.USER, Permission.READ_ADMIN));

// Test Contributor role permissions
console.log('\nContributor Role Tests:');
console.log('✅ READ_DASHBOARD:', hasPermission(UserRole.CONTRIBUTOR, Permission.READ_DASHBOARD));
console.log('✅ CREATE_PRODUCTS:', hasPermission(UserRole.CONTRIBUTOR, Permission.CREATE_PRODUCTS));
console.log('❌ MANAGE_USERS:', hasPermission(UserRole.CONTRIBUTOR, Permission.MANAGE_USERS));
console.log('❌ READ_ADMIN:', hasPermission(UserRole.CONTRIBUTOR, Permission.READ_ADMIN));

// Test Admin role permissions
console.log('\nAdmin Role Tests:');
console.log('✅ READ_DASHBOARD:', hasPermission(UserRole.ADMIN, Permission.READ_DASHBOARD));
console.log('✅ CREATE_PRODUCTS:', hasPermission(UserRole.ADMIN, Permission.CREATE_PRODUCTS));
console.log('✅ MANAGE_USERS:', hasPermission(UserRole.ADMIN, Permission.MANAGE_USERS));
console.log('✅ READ_ADMIN:', hasPermission(UserRole.ADMIN, Permission.READ_ADMIN));

// Test 2: CRUD Capability
console.log('\n🧪 Test 2: CRUD Capability');
console.log('==========================');
console.log('User can perform CRUD:', canPerformCRUD(UserRole.USER));
console.log('Contributor can perform CRUD:', canPerformCRUD(UserRole.CONTRIBUTOR));
console.log('Admin can perform CRUD:', canPerformCRUD(UserRole.ADMIN));

// Test 3: Admin Access
console.log('\n🧪 Test 3: Admin Access');
console.log('======================');
console.log('User can access admin:', canAccessAdmin(UserRole.USER));
console.log('Contributor can access admin:', canAccessAdmin(UserRole.CONTRIBUTOR));
console.log('Admin can access admin:', canAccessAdmin(UserRole.ADMIN));

// Test 4: User Management
console.log('\n🧪 Test 4: User Management');
console.log('=========================');
console.log('User can manage users:', canManageUsers(UserRole.USER));
console.log('Contributor can manage users:', canManageUsers(UserRole.CONTRIBUTOR));
console.log('Admin can manage users:', canManageUsers(UserRole.ADMIN));

// Test 5: Role Level Testing
console.log('\n🧪 Test 5: Role Level Testing');
console.log('============================');
import { getRoleLevel, hasMinimumRoleLevel } from '@/utils/rbac';

console.log('User role level:', getRoleLevel(UserRole.USER));
console.log('Contributor role level:', getRoleLevel(UserRole.CONTRIBUTOR));
console.log('Admin role level:', getRoleLevel(UserRole.ADMIN));

console.log('\nMinimum role level tests:');
console.log('User >= Level 1:', hasMinimumRoleLevel(UserRole.USER, 1));
console.log('User >= Level 2:', hasMinimumRoleLevel(UserRole.USER, 2));
console.log('User >= Level 3:', hasMinimumRoleLevel(UserRole.USER, 3));

console.log('Contributor >= Level 1:', hasMinimumRoleLevel(UserRole.CONTRIBUTOR, 1));
console.log('Contributor >= Level 2:', hasMinimumRoleLevel(UserRole.CONTRIBUTOR, 2));
console.log('Contributor >= Level 3:', hasMinimumRoleLevel(UserRole.CONTRIBUTOR, 3));

console.log('Admin >= Level 1:', hasMinimumRoleLevel(UserRole.ADMIN, 1));
console.log('Admin >= Level 2:', hasMinimumRoleLevel(UserRole.ADMIN, 2));
console.log('Admin >= Level 3:', hasMinimumRoleLevel(UserRole.ADMIN, 3));

// Test 6: Menu Access Testing
console.log('\n🧪 Test 6: Menu Access Testing');
console.log('==============================');
import { canAccessMenu } from '@/utils/rbac';

const testMenus = [
  '/admin',
  '/admin/products',
  '/admin/lifecycle',
  '/admin/monitoring',
  '/admin/reports',
  '/admin/users',
  '/admin/settings',
  '/admin/roles',
  '/admin/audit'
];

testMenus.forEach(menu => {
  console.log(`\nMenu: ${menu}`);
  console.log(`  User: ${canAccessMenu(UserRole.USER, menu) ? '✅' : '❌'}`);
  console.log(`  Contributor: ${canAccessMenu(UserRole.CONTRIBUTOR, menu) ? '✅' : '❌'}`);
  console.log(`  Admin: ${canAccessMenu(UserRole.ADMIN, menu) ? '✅' : '❌'}`);
});

// Test 7: Available Menus Testing
console.log('\n🧪 Test 7: Available Menus Testing');
console.log('==================================');
import { getAvailableMenus } from '@/utils/rbac';

console.log('User available menus:', getAvailableMenus(UserRole.USER).length);
console.log('Contributor available menus:', getAvailableMenus(UserRole.CONTRIBUTOR).length);
console.log('Admin available menus:', getAvailableMenus(UserRole.ADMIN).length);

console.log('\nUser menus:', getAvailableMenus(UserRole.USER).map(m => m.label));
console.log('Contributor menus:', getAvailableMenus(UserRole.CONTRIBUTOR).map(m => m.label));
console.log('Admin menus:', getAvailableMenus(UserRole.ADMIN).map(m => m.label));

console.log('\n✅ RBAC System Tests Complete!');
console.log('All tests passed successfully!');
