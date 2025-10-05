"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Users, Settings, Save, RefreshCcw } from 'lucide-react';

interface MenuItem {
  id: number;
  menu_key: string;
  menu_label: string;
  menu_path: string;
  icon_name: string;
  parent_menu_id: number | null;
  sort_order: number;
  is_active: boolean;
  parent_label?: string;
}

interface Permission {
  role_id: number;
  role_name: string;
  menu_item_id: number;
  menu_key: string;
  menu_label: string;
  menu_path: string;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

const RolePermissionManager = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchPermissions(selectedRole);
    }
  }, [selectedRole]);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles/master');
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchPermissions = async (roleId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/role-permissions?roleId=${roleId}`);
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (menuItemId: number, permissionType: string, value: boolean) => {
    setPermissions(prev => 
      prev.map(p => 
        p.menu_item_id === menuItemId 
          ? { ...p, [permissionType]: value }
          : p
      )
    );
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/role-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleId: selectedRole,
          permissions: permissions.map(p => ({
            menu_item_id: p.menu_item_id,
            can_view: p.can_view,
            can_create: p.can_create,
            can_update: p.can_update,
            can_delete: p.can_delete
          }))
        })
      });

      if (response.ok) {
        alert('Permissions saved successfully!');
      } else {
        alert('Failed to save permissions');
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Error saving permissions');
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    const parentKey = permission.parent_label || 'Main Menu';
    if (!acc[parentKey]) {
      acc[parentKey] = [];
    }
    acc[parentKey].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Role Permission Manager
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage menu access permissions for each role
              </p>
            </div>
          </div>
        </div>

        {/* Role Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Role:
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">Choose a role...</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.role}
                </option>
              ))}
            </select>
            {selectedRole && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Permissions'}
              </button>
            )}
          </div>
        </div>

        {/* Permissions Table */}
        {selectedRole && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading permissions...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Menu Item
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        View
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Create
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Update
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Delete
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {Object.entries(groupedPermissions).map(([groupName, groupPermissions]) => (
                      <React.Fragment key={groupName}>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <td colSpan={5} className="px-6 py-3 font-semibold text-gray-900 dark:text-white">
                            {groupName}
                          </td>
                        </tr>
                        {groupPermissions.map((permission) => (
                          <tr key={permission.menu_item_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              <div className="flex items-center">
                                <div className="ml-4">
                                  <div className="text-sm font-medium">{permission.menu_label}</div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">{permission.menu_path}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={permission.can_view}
                                onChange={(e) => handlePermissionChange(permission.menu_item_id, 'can_view', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={permission.can_create}
                                onChange={(e) => handlePermissionChange(permission.menu_item_id, 'can_create', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={permission.can_update}
                                onChange={(e) => handlePermissionChange(permission.menu_item_id, 'can_update', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={permission.can_delete}
                                onChange={(e) => handlePermissionChange(permission.menu_item_id, 'can_delete', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RolePermissionManager;
