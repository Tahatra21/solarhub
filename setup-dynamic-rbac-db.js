#!/usr/bin/env node

/**
 * Quick Database Setup for Dynamic RBAC
 * Creates tables and populates initial data
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function setupDatabase() {
  console.log('🔧 Setting up Dynamic RBAC database tables...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const client = await pool.connect();
    
    // Create menu items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tbl_menu_items (
        id SERIAL PRIMARY KEY,
        menu_key VARCHAR(50) UNIQUE NOT NULL,
        menu_label VARCHAR(100) NOT NULL,
        menu_path VARCHAR(200) NOT NULL,
        parent_menu_id INTEGER REFERENCES tbl_menu_items(id),
        icon_name VARCHAR(50),
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created tbl_menu_items table');

    // Create role menu permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tbl_role_menu_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES tbl_role(id) ON DELETE CASCADE,
        menu_item_id INTEGER REFERENCES tbl_menu_items(id) ON DELETE CASCADE,
        can_view BOOLEAN DEFAULT false,
        can_create BOOLEAN DEFAULT false,
        can_update BOOLEAN DEFAULT false,
        can_delete BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, menu_item_id)
      )
    `);
    console.log('✅ Created tbl_role_menu_permissions table');

    // Insert default menu items
    const menuItems = [
      { key: 'dashboard', label: 'Dashboard', path: '/admin', icon: 'dashboard', sort: 1 },
      { key: 'product_catalog', label: 'Product Catalog', path: '/admin/product', icon: 'box', sort: 2 },
      { key: 'lifecycle_analyst', label: 'Lifecycle Analyst', path: '/admin/lifecycle', icon: 'cycle', sort: 3 },
      { key: 'solar_hub', label: 'Solar HUB', path: '/admin/cusol-hub', icon: 'monitor', sort: 4 },
      { key: 'monitoring_crjr', label: 'Monitoring CR/JR', path: '/admin/cusol-hub/monitoring-crjr', icon: 'monitor', sort: 5, parent: 'solar_hub' },
      { key: 'monitoring_license', label: 'Monitoring License', path: '/admin/cusol-hub/monitoring-license', icon: 'monitor', sort: 6, parent: 'solar_hub' },
      { key: 'monitoring_run_program', label: 'Monitoring Run Inisiatif', path: '/admin/cusol-hub/monitoring-run-program', icon: 'monitor', sort: 7, parent: 'solar_hub' },
      { key: 'administrator', label: 'Administrator', path: '/admin/users', icon: 'shield', sort: 8 },
      { key: 'user_management', label: 'User Management', path: '/admin/users', icon: 'users', sort: 9, parent: 'administrator' },
      { key: 'role_management', label: 'Role Management', path: '/admin/roles', icon: 'file-text', sort: 10, parent: 'administrator' },
      { key: 'system_settings', label: 'System Settings', path: '/admin/settings', icon: 'settings', sort: 11, parent: 'administrator' },
      { key: 'audit_logs', label: 'Audit Logs', path: '/admin/audit', icon: 'file-text', sort: 12, parent: 'administrator' }
    ];

    // Clear existing menu items
    await client.query('DELETE FROM tbl_menu_items');
    console.log('🧹 Cleared existing menu items');

    // Insert menu items
    for (const item of menuItems) {
      let parentId = null;
      if (item.parent) {
        const parentResult = await client.query('SELECT id FROM tbl_menu_items WHERE menu_key = $1', [item.parent]);
        if (parentResult.rows.length > 0) {
          parentId = parentResult.rows[0].id;
        }
      }

      await client.query(`
        INSERT INTO tbl_menu_items (menu_key, menu_label, menu_path, icon_name, parent_menu_id, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [item.key, item.label, item.path, item.icon, parentId, item.sort]);
    }
    console.log(`✅ Inserted ${menuItems.length} menu items`);

    // Set up default permissions for roles
    const roles = await client.query('SELECT id, role FROM tbl_role');
    const menuItemsResult = await client.query('SELECT id FROM tbl_menu_items');

    for (const role of roles.rows) {
      for (const menuItem of menuItemsResult.rows) {
        let canView = true;
        let canCreate = false;
        let canUpdate = false;
        let canDelete = false;

        // Admin gets full access
        if (role.role === 'Admin') {
          canCreate = canUpdate = canDelete = true;
        }
        // Contributor gets CRUD on non-admin menus
        else if (role.role === 'Contributor') {
          const menuKeyResult = await client.query('SELECT menu_key FROM tbl_menu_items WHERE id = $1', [menuItem.id]);
          const menuKey = menuKeyResult.rows[0]?.menu_key;
          if (menuKey && !menuKey.includes('administrator') && !menuKey.includes('user_management') && !menuKey.includes('role_management')) {
            canCreate = canUpdate = canDelete = true;
          }
        }
        // User gets read-only access
        else if (role.role === 'User') {
          canView = true;
          canCreate = canUpdate = canDelete = false;
        }

        await client.query(`
          INSERT INTO tbl_role_menu_permissions (role_id, menu_item_id, can_view, can_create, can_update, can_delete)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
            can_view = EXCLUDED.can_view,
            can_create = EXCLUDED.can_create,
            can_update = EXCLUDED.can_update,
            can_delete = EXCLUDED.can_delete
        `, [role.id, menuItem.id, canView, canCreate, canUpdate, canDelete]);
      }
    }
    console.log('✅ Set up default role permissions');

    client.release();
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: node test-dynamic-rbac.js');
    console.log('2. Test the application at http://localhost:3000');
    console.log('3. Visit /admin/role-permissions to manage permissions');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = setupDatabase;
