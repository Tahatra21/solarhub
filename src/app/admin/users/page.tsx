"use client";

import React, { useState, useEffect } from 'react';
import { Eye, Edit, Trash2, User, Mail, Calendar, Plus, Search, RefreshCcw, X, Save } from 'lucide-react';

interface User {
  id: number;
  fullname: string;
  username: string;
  email: string;
  photo?: string;
  role?: string;
  jabatan?: string;
  created_at?: string;
  updated_at?: string | null;
}

interface Role {
  id: number;
  role: string;
}

interface Jabatan {
  id: number;
  jabatan: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    fullname: '',
    email: '',
    password: '',
    role: '',
    jabatan: ''
  });
  
  // Options
  const [roles, setRoles] = useState<Role[]>([]);
  const [jabatan, setJabatan] = useState<Jabatan[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Fetch users data
  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching users from API...');
      console.log('🔍 Current page:', currentPage);
      console.log('🔍 Search query:', searchQuery);
      
      const url = `/api/users/master?page=${currentPage}&limit=10&search=${searchQuery}`;
      console.log('🔍 API URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      });
      
      console.log('🔍 API Response status:', response.status);
      console.log('🔍 API Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`Failed to fetch users: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🔍 API Response data:', data);
      
      if (data.users) {
        // API master mengembalikan struktur yang berbeda
        setUsers(data.users || []);
        setTotalPages(Math.ceil(data.total / 10) || 1);
        setTotalItems(data.total || 0);
        console.log('✅ Users loaded:', data.users.length);
        console.log('✅ Total users:', data.total);
        console.log('✅ Total pages:', Math.ceil(data.total / 10));
      } else {
        console.error('❌ Invalid API response structure:', data);
        setUsers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch options (roles and jabatan)
  const fetchOptions = async () => {
    try {
      setLoadingOptions(true);
      const response = await fetch('/api/users/options', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
        setJabatan(data.jabatan || []);
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchOptions();
  }, [currentPage, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  // Reset form data
  const resetFormData = () => {
    setFormData({
      username: '',
      fullname: '',
      email: '',
      password: '',
      role: '',
      jabatan: ''
    });
  };

  // Open modal
  const openModal = (mode: 'add' | 'edit' | 'view', user?: User) => {
    setModalMode(mode);
    setSelectedUser(user || null);
    
    if (mode === 'add') {
      resetFormData();
    } else if (user) {
      setFormData({
        username: user.username || '',
        fullname: user.fullname || '',
        email: user.email || '',
        password: '',
        role: user.role || '',
        jabatan: user.jabatan || ''
      });
    }
    
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    resetFormData();
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = modalMode === 'add' ? '/api/users' : `/api/users?id=${selectedUser?.id}`;
      const method = modalMode === 'add' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...(modalMode === 'edit' && { id: selectedUser?.id }),
          username: formData.username,
          fullname: formData.fullname,
          email: formData.email,
          password: formData.password,
          role: parseInt(formData.role),
          jabatan: parseInt(formData.jabatan)
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(data.message || `${modalMode === 'add' ? 'User created' : 'User updated'} successfully`);
        closeModal();
        fetchUsers(); // Refresh the list
      } else {
        alert(data.error || 'An error occurred');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred while saving');
    }
  };

  const handleViewDetails = (user: User) => {
    openModal('view', user);
  };

  const handleEdit = (user: User) => {
    openModal('edit', user);
  };

  const handleDelete = async (user: User) => {
    if (confirm(`Are you sure you want to delete ${user.fullname}?`)) {
      try {
        const response = await fetch(`/api/users?id=${user.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        const data = await response.json();
        
        if (response.ok) {
          alert(data.message || 'User deleted successfully');
          fetchUsers(); // Refresh the list
        } else {
          alert(data.error || 'An error occurred');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('An error occurred while deleting');
      }
    }
  };

  const handleAdd = () => {
    openModal('add');
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Users</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage system users</p>
            <p className="text-xs text-gray-400 mt-1">Debug: {users.length} users loaded</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
            <button
              onClick={handleAdd}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" /> Add New
            </button>
            <button
              onClick={fetchUsers}
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
            placeholder="Search users..."
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
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 px-6 text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 px-6 text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-8 w-8">
                          {user.photo ? (
                            <img className="h-8 w-8 rounded-full" src={user.photo} alt={user.fullname} />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {user.fullname || '-'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            @{user.username || '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {user.email || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {user.role || 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(user)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
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
        {!loading && users.length > 0 && (
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {modalMode === 'add' ? 'Add New User' : 
                 modalMode === 'edit' ? 'Edit User' : 
                 'User Details'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    required
                    disabled={modalMode === 'view'}
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullname}
                    onChange={(e) => setFormData({...formData, fullname: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    required
                    disabled={modalMode === 'view'}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    required
                    disabled={modalMode === 'view'}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password {modalMode === 'edit' && '(leave empty to keep current)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    required={modalMode === 'add'}
                    disabled={modalMode === 'view'}
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    required
                    disabled={modalMode === 'view'}
                  >
                    <option value="">Select Role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jabatan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Jabatan
                  </label>
                  <select
                    value={formData.jabatan}
                    onChange={(e) => setFormData({...formData, jabatan: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    required
                    disabled={modalMode === 'view'}
                  >
                    <option value="">Select Jabatan</option>
                    {jabatan.map((jab) => (
                      <option key={jab.id} value={jab.id}>
                        {jab.jabatan}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                {modalMode !== 'view' && (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {modalMode === 'add' ? 'Create User' : 'Update User'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
