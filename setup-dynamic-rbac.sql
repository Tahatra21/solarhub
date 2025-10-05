-- Dynamic RBAC Database Setup
-- Quick implementation for menu-based permissions

-- 1. Menu Items Table
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
);

-- 2. Role-Menu Permissions Table
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
);

-- 3. Populate Menu Items (Current Menu Structure)
INSERT INTO tbl_menu_items (menu_key, menu_label, menu_path, icon_name, sort_order) VALUES
('dashboard', 'Dashboard', '/admin', 'dashboard', 1),
('product_catalog', 'Product Catalog', '/admin/product', 'box', 2),
('lifecycle_analyst', 'Lifecycle Analyst', '/admin/lifecycle', 'cycle', 3),
('solar_hub', 'Solar HUB', '/admin/cusol-hub', 'monitor', 4),
('monitoring_crjr', 'Monitoring CR/JR', '/admin/cusol-hub/monitoring-crjr', 'monitor', 5),
('monitoring_license', 'Monitoring License', '/admin/cusol-hub/monitoring-license', 'monitor', 6),
('monitoring_run_program', 'Monitoring Run Inisiatif', '/admin/cusol-hub/monitoring-run-program', 'monitor', 7),
('administrator', 'Administrator', '/admin/users', 'shield', 8),
('user_management', 'User Management', '/admin/users', 'users', 9),
('role_management', 'Role Management', '/admin/roles', 'file-text', 10),
('system_settings', 'System Settings', '/admin/settings', 'settings', 11),
('audit_logs', 'Audit Logs', '/admin/audit', 'file-text', 12)
ON CONFLICT (menu_key) DO NOTHING;

-- 4. Set Parent-Child Relationships
UPDATE tbl_menu_items SET parent_menu_id = (SELECT id FROM tbl_menu_items WHERE menu_key = 'solar_hub') 
WHERE menu_key IN ('monitoring_crjr', 'monitoring_license', 'monitoring_run_program');

UPDATE tbl_menu_items SET parent_menu_id = (SELECT id FROM tbl_menu_items WHERE menu_key = 'administrator') 
WHERE menu_key IN ('user_management', 'role_management', 'system_settings', 'audit_logs');

-- 5. Create Default Permissions for Existing Roles
-- Admin Role - Full Access
INSERT INTO tbl_role_menu_permissions (role_id, menu_item_id, can_view, can_create, can_update, can_delete)
SELECT 
    r.id,
    m.id,
    true, true, true, true
FROM tbl_role r
CROSS JOIN tbl_menu_items m
WHERE r.role = 'Admin'
ON CONFLICT (role_id, menu_item_id) DO NOTHING;

-- User Role - View Only
INSERT INTO tbl_role_menu_permissions (role_id, menu_item_id, can_view, can_create, can_update, can_delete)
SELECT 
    r.id,
    m.id,
    true, false, false, false
FROM tbl_role r
CROSS JOIN tbl_menu_items m
WHERE r.role = 'User' AND m.menu_key != 'administrator'
ON CONFLICT (role_id, menu_item_id) DO NOTHING;

-- Contributor Role - View + CRUD (no admin access)
INSERT INTO tbl_role_menu_permissions (role_id, menu_item_id, can_view, can_create, can_update, can_delete)
SELECT 
    r.id,
    m.id,
    true, true, true, true
FROM tbl_role r
CROSS JOIN tbl_menu_items m
WHERE r.role = 'Contributor' AND m.menu_key != 'administrator'
ON CONFLICT (role_id, menu_item_id) DO NOTHING;

-- 6. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_role_menu_permissions_role_id ON tbl_role_menu_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_menu_permissions_menu_id ON tbl_role_menu_permissions(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_parent ON tbl_menu_items(parent_menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_key ON tbl_menu_items(menu_key);
