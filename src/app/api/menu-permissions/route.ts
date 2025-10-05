import { NextRequest, NextResponse } from "next/server";
import { getPool } from '@/lib/database';
import { verifyToken } from '@/utils/auth';

// GET - Fetch user's menu permissions
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      // Get user's role
      const roleQuery = await client.query(`
        SELECT r.id, r.role 
        FROM tbl_user u 
        JOIN tbl_role r ON u.role = r.id 
        WHERE u.id = $1
      `, [decoded.id]);

      if (roleQuery.rows.length === 0) {
        return NextResponse.json({ error: 'User role not found' }, { status: 404 });
      }

      const userRole = roleQuery.rows[0];

      // Get menu permissions based on role
      const permissionsQuery = await client.query(`
        SELECT 
          m.menu_key,
          m.menu_label,
          m.menu_path,
          m.icon_name,
          m.parent_menu_id,
          COALESCE(p.can_view, false) as can_view,
          COALESCE(p.can_create, false) as can_create,
          COALESCE(p.can_update, false) as can_update,
          COALESCE(p.can_delete, false) as can_delete
        FROM tbl_menu_items m
        LEFT JOIN tbl_role_menu_permissions p ON m.id = p.menu_item_id AND p.role_id = $1
        WHERE m.is_active = true
        ORDER BY m.sort_order
      `, [userRole.id]);

      // If no dynamic permissions exist, fallback to static permissions
      if (permissionsQuery.rows.length === 0 || permissionsQuery.rows.every(row => !row.can_view)) {
        return NextResponse.json({
          permissions: getStaticPermissions(userRole.role),
          isDynamic: false
        });
      }

      // Build hierarchical menu structure
      const menuMap = new Map();
      const rootMenus = [];

      permissionsQuery.rows.forEach(row => {
        menuMap.set(row.menu_key, {
          key: row.menu_key,
          label: row.menu_label,
          path: row.menu_path,
          icon: row.icon_name,
          parentId: row.parent_menu_id,
          permissions: {
            canView: row.can_view,
            canCreate: row.can_create,
            canUpdate: row.can_update,
            canDelete: row.can_delete
          },
          children: []
        });
      });

      // Build hierarchy
      permissionsQuery.rows.forEach(row => {
        const menu = menuMap.get(row.menu_key);
        if (row.parent_menu_id) {
          const parent = Array.from(menuMap.values()).find(m => m.parentId === row.parent_menu_id);
          if (parent) {
            parent.children.push(menu);
          }
        } else {
          rootMenus.push(menu);
        }
      });

      return NextResponse.json({
        permissions: rootMenus,
        isDynamic: true
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Menu permissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Fallback static permissions
function getStaticPermissions(role: string) {
  const staticMenus = [
    { key: 'dashboard', label: 'Dashboard', path: '/admin', icon: 'dashboard', permissions: { canView: true, canCreate: false, canUpdate: false, canDelete: false } },
    { key: 'product_catalog', label: 'Product Catalog', path: '/admin/product', icon: 'box', permissions: { canView: true, canCreate: role !== 'User', canUpdate: role !== 'User', canDelete: role !== 'User' } },
    { key: 'lifecycle_analyst', label: 'Lifecycle Analyst', path: '/admin/lifecycle', icon: 'cycle', permissions: { canView: true, canCreate: false, canUpdate: false, canDelete: false } },
    { 
      key: 'solar_hub', 
      label: 'Solar HUB', 
      path: '/admin/cusol-hub', 
      icon: 'monitor',
      permissions: { canView: true, canCreate: false, canUpdate: false, canDelete: false },
      children: [
        { key: 'monitoring_crjr', label: 'Monitoring CR/JR', path: '/admin/cusol-hub/monitoring-crjr', icon: 'monitor', permissions: { canView: true, canCreate: false, canUpdate: false, canDelete: false } },
        { key: 'monitoring_license', label: 'Monitoring License', path: '/admin/cusol-hub/monitoring-license', icon: 'monitor', permissions: { canView: true, canCreate: false, canUpdate: false, canDelete: false } },
        { key: 'monitoring_run_program', label: 'Monitoring Run Inisiatif', path: '/admin/cusol-hub/monitoring-run-program', icon: 'monitor', permissions: { canView: true, canCreate: false, canUpdate: false, canDelete: false } }
      ]
    }
  ];

  // Add Administrator menu for Admin role only
  if (role === 'Admin') {
    staticMenus.push({
      key: 'administrator',
      label: 'Administrator',
      path: '/admin/users',
      icon: 'shield',
      permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
      children: [
        { key: 'user_management', label: 'User Management', path: '/admin/users', icon: 'users', permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true } },
        { key: 'role_management', label: 'Role Management', path: '/admin/roles', icon: 'file-text', permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true } },
        { key: 'system_settings', label: 'System Settings', path: '/admin/settings', icon: 'settings', permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true } },
        { key: 'audit_logs', label: 'Audit Logs', path: '/admin/audit', icon: 'file-text', permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true } }
      ]
    });
  }

  return staticMenus;
}
