# 🔐 Role-Based Access Control (RBAC) System

## Overview
Sistem RBAC untuk Solution Architect HUB PLN Icon Plus dengan 3 level akses yang berbeda sesuai requirement.

## 🎯 Role Structure

### 1. USER (Read-Only)
**Hak Akses:**
- ✅ Dapat VIEW/READ semua menu aplikasi (kecuali menu Administrator)
- ❌ TIDAK dapat melakukan CREATE, UPDATE, DELETE (semua button CRUD disembunyikan)
- ✅ Hanya bisa melihat data, reports, dan dashboard
- ❌ Menu "Administrator" TIDAK TAMPIL sama sekali

**Use Case:** Staff operasional yang hanya perlu melihat informasi

### 2. CONTRIBUTOR (Read & Write)
**Hak Akses:**
- ✅ Dapat VIEW/READ semua menu aplikasi (kecuali menu Administrator)
- ✅ Dapat melakukan CREATE, UPDATE, DELETE pada semua data
- ✅ Semua button dan form CRUD TAMPIL dan berfungsi
- ❌ Menu "Administrator" TIDAK TAMPIL sama sekali

**Use Case:** Team member yang mengelola data dan konten

### 3. ADMIN (Full Access)
**Hak Akses:**
- ✅ Dapat VIEW/READ SEMUA menu termasuk menu Administrator
- ✅ Dapat melakukan CREATE, UPDATE, DELETE pada SEMUA data
- ✅ Akses penuh ke menu "Administrator" untuk:
  * User Management (CRUD users)
  * Role Management
  * System Settings
  * Access Control Configuration
  * Audit Logs

**Use Case:** System Administrator dengan kontrol penuh

## 🏗️ Technical Implementation

### Core Files
- `src/utils/rbac.ts` - RBAC utility functions dan permission mapping
- `src/middleware/rbac.ts` - RBAC middleware untuk route protection
- `src/components/navigation/RoleBasedNavigation.tsx` - Role-based navigation menu
- `src/components/common/CRUDButtons.tsx` - Role-based CRUD buttons

### Permission System
```typescript
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
  
  // Admin permissions
  READ_ADMIN = 'read:admin',
  MANAGE_USERS = 'manage:users',
  MANAGE_ROLES = 'manage:roles',
  MANAGE_SETTINGS = 'manage:settings',
  VIEW_AUDIT_LOGS = 'view:audit_logs'
}
```

### Role-Permission Mapping
```typescript
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    Permission.READ_DASHBOARD,
    Permission.READ_PRODUCTS,
    Permission.READ_LIFECYCLE,
    Permission.READ_MONITORING,
    Permission.READ_REPORTS
  ],
  
  [UserRole.CONTRIBUTOR]: [
    // All read permissions +
    Permission.CREATE_PRODUCTS,
    Permission.UPDATE_PRODUCTS,
    Permission.DELETE_PRODUCTS,
    // ... other CRUD permissions
  ],
  
  [UserRole.ADMIN]: [
    // All permissions including admin ones
    Permission.READ_ADMIN,
    Permission.MANAGE_USERS,
    Permission.MANAGE_ROLES,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_AUDIT_LOGS
  ]
};
```

## 🔧 Usage Examples

### Check User Permissions
```typescript
import { hasPermission, canPerformCRUD, canAccessAdmin } from '@/utils/rbac';

// Check specific permission
if (hasPermission(userRole, Permission.MANAGE_USERS)) {
  // Show user management features
}

// Check CRUD capability
if (canPerformCRUD(userRole)) {
  // Show CRUD buttons
}

// Check admin access
if (canAccessAdmin(userRole)) {
  // Show administrator menu
}
```

### Component Usage
```tsx
import CRUDButtons, { RoleBadge, PermissionGate } from '@/components/common/CRUDButtons';

// Role-based CRUD buttons
<CRUDButtons
  userRole={currentUser.role}
  onAdd={handleAdd}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onView={handleView}
/>

// Role badge
<RoleBadge userRole={user.role} />

// Permission gate
<PermissionGate userRole={user.role} permission={Permission.MANAGE_USERS}>
  <AdminPanel />
</PermissionGate>
```

### API Protection
```typescript
// In API routes
import { canManageUsers } from '@/utils/rbac';

export async function POST(req: NextRequest) {
  const decoded = verifyToken(token);
  
  // Check RBAC permission
  if (!canManageUsers(decoded.role)) {
    return NextResponse.json({ 
      error: 'Insufficient permissions. Only Admin can manage users.',
      required: 'Admin role',
      current: decoded.role 
    }, { status: 403 });
  }
  
  // Continue with operation...
}
```

## 🛡️ Security Features

### Middleware Protection
- Route-level access control
- Automatic redirect for unauthorized access
- Token validation dengan role checking

### API Security
- All API endpoints protected dengan role validation
- User Management hanya untuk Admin
- Permission-based operation control

### Frontend Security
- Role-based component rendering
- Hidden CRUD buttons untuk User role
- Dynamic menu visibility

## 📊 Database Integration

### Required Tables
```sql
-- User roles table
CREATE TABLE tbl_role (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) UNIQUE NOT NULL
);

-- Insert default roles
INSERT INTO tbl_role (role) VALUES 
('User'),
('Contributor'), 
('Admin');

-- User table with role reference
ALTER TABLE tbl_user 
ADD COLUMN role INTEGER REFERENCES tbl_role(id);
```

### Role Assignment
- Users assigned roles melalui User Management (Admin only)
- Role validation pada setiap API call
- Permission checking berdasarkan role

## 🚀 Testing

### Test Scenarios
1. **User Role Testing**
   - Login dengan User role
   - Verify hanya bisa view data
   - Verify CRUD buttons hidden
   - Verify Administrator menu hidden

2. **Contributor Role Testing**
   - Login dengan Contributor role
   - Verify bisa CRUD data
   - Verify Administrator menu hidden

3. **Admin Role Testing**
   - Login dengan Admin role
   - Verify full access
   - Verify Administrator menu visible
   - Verify User Management access

### Test Commands
```bash
# Test API permissions
curl -X POST http://localhost:3003/api/users \
  -H "Cookie: token=USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","fullname":"Test User","email":"test@test.com","password":"test123","role":1,"jabatan":1}'

# Expected: 403 Forbidden for non-Admin users
```

## 🔄 Migration Guide

### From Existing System
1. Update user roles di database
2. Assign appropriate roles ke existing users
3. Deploy RBAC components
4. Test role-based access

### Role Assignment
```sql
-- Assign Admin role to existing admin user
UPDATE tbl_user SET role = 3 WHERE username = 'admin';

-- Assign Contributor role to team members
UPDATE tbl_user SET role = 2 WHERE username IN ('user1', 'user2');

-- Assign User role to read-only users
UPDATE tbl_user SET role = 1 WHERE username IN ('viewer1', 'viewer2');
```

## 📝 Notes

- RBAC system fully integrated dengan existing authentication
- Backward compatible dengan existing user data
- Scalable untuk future role additions
- Comprehensive security dengan multiple layers
- User-friendly dengan clear role indicators

## 🎯 Benefits

1. **Security**: Multi-layer access control
2. **Scalability**: Easy to add new roles/permissions
3. **User Experience**: Clear role-based interface
4. **Maintenance**: Centralized permission management
5. **Compliance**: Audit trail untuk access control
