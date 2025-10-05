"use client";

import React, { useState, useEffect } from 'react';
import { Eye, Edit, Trash2, Shield, Calendar, Plus, Search, RefreshCcw } from 'lucide-react';

interface Role {
  id: number;
  nama_role: string;
  created_at: string;
  updated_at: string | null;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ nama_role: '', description: '' });

  // Fetch roles data
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/roles/master?page=${currentPage}&limit=10&search=${searchQuery}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const data = await response.json();
      
      if (data.success) {
        setRoles(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.totalItems || 0);
      } else {
        console.error('Failed to fetch roles:', data);
        setRoles([]);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [currentPage, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRoles();
  };

  const handleViewDetails = (role: Role) => {
    setSelectedRole(role);
    setModalType('view');
    setFormData({ nama_role: role.nama_role, description: '' });
    setShowModal(true);
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setModalType('edit');
    setFormData({ nama_role: role.nama_role, description: '' });
    setShowModal(true);
  };

  const handleDelete = async (role: Role) => {
    if (confirm(`Are you sure you want to delete ${role.nama_role}?`)) {
      try {
        const response = await fetch(`/api/roles/${role.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          alert('Role deleted successfully!');
          fetchRoles(); // Refresh the list
        } else {
          alert('Failed to delete role');
        }
      } catch (error) {
        console.error('Error deleting role:', error);
        alert('Error deleting role');
      }
    }
  };

  const handleAdd = () => {
    setSelectedRole(null);
    setModalType('add');
    setFormData({ nama_role: '', description: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = modalType === 'add' ? '/api/roles' : `/api/roles/${selectedRole?.id}`;
      const method = modalType === 'add' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(`${modalType === 'add' ? 'Role created' : 'Role updated'} successfully!`);
        setShowModal(false);
        fetchRoles(); // Refresh the list
      } else {
        alert(`Failed to ${modalType === 'add' ? 'create' : 'update'} role`);
      }
    } catch (error) {
      console.error(`Error ${modalType === 'add' ? 'creating' : 'updating'} role:`, error);
      alert(`Error ${modalType === 'add' ? 'creating' : 'updating'} role`);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRole(null);
    setFormData({ nama_role: '', description: '' });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Roles</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage user roles and permissions</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
            <button
              onClick={handleAdd}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" /> Add New
            </button>
            <button
              onClick={fetchRoles}
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
            </button>
          </div>
        </div>
        
        {/* Search */}
        <form onSubmit={handleSearch} className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        </form>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 px-6 text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2">Loading roles...</span>
                    </div>
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 px-6 text-gray-500">
                    No roles found
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-4 h-4 text-blue-500" />
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {role.nama_role || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {role.created_at ? new Date(role.created_at).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {role.updated_at ? new Date(role.updated_at).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(role)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(role)}
                          className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(role)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && roles.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalItems)} of {totalItems} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {modalType === 'add' ? 'Add New Role' : 
                   modalType === 'edit' ? 'Edit Role' : 'View Role'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {modalType === 'view' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role Name
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-900 dark:text-gray-100">
                      {formData.nama_role}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-900 dark:text-gray-100">
                      {formData.description || 'No description'}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role Name *
                    </label>
                    <input
                      type="text"
                      value={formData.nama_role}
                      onChange={(e) => setFormData({ ...formData, nama_role: e.target.value })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                      placeholder="Enter role name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                      placeholder="Enter role description"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {modalType === 'add' ? 'Create Role' : 'Update Role'}
                    </button>
                    {modalType === 'edit' && (
                      <button
                        type="button"
                        onClick={() => {
                          setModalType('permissions');
                          // Navigate to permissions page
                          window.location.href = `/admin/role-permissions?roleId=${selectedRole?.id}&roleName=${selectedRole?.nama_role}`;
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Manage Permissions
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
