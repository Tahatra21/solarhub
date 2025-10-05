"use client";

import React, { useState, useEffect } from 'react';
import { FileText, User, Calendar, Shield, Search, Filter, Download, Eye } from 'lucide-react';

interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  ipAddress: string;
  status: 'success' | 'failed' | 'warning';
  details: string;
}

const AuditLogsPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockLogs: AuditLog[] = [
      {
        id: 1,
        timestamp: '2024-01-15 10:30:25',
        user: 'admin',
        action: 'LOGIN',
        resource: 'Authentication',
        ipAddress: '192.168.1.100',
        status: 'success',
        details: 'User logged in successfully'
      },
      {
        id: 2,
        timestamp: '2024-01-15 10:25:12',
        user: 'testing.itu',
        action: 'CREATE',
        resource: 'User Management',
        ipAddress: '192.168.1.101',
        status: 'success',
        details: 'Created new user: john.doe'
      },
      {
        id: 3,
        timestamp: '2024-01-15 10:20:45',
        user: 'admin',
        action: 'UPDATE',
        resource: 'System Settings',
        ipAddress: '192.168.1.100',
        status: 'success',
        details: 'Updated security policies'
      },
      {
        id: 4,
        timestamp: '2024-01-15 10:15:30',
        user: 'testing.itu',
        action: 'DELETE',
        resource: 'Product Catalog',
        ipAddress: '192.168.1.101',
        status: 'failed',
        details: 'Failed to delete product: insufficient permissions'
      },
      {
        id: 5,
        timestamp: '2024-01-15 10:10:15',
        user: 'admin',
        action: 'EXPORT',
        resource: 'Reports',
        ipAddress: '192.168.1.100',
        status: 'success',
        details: 'Exported license report to PDF'
      },
      {
        id: 6,
        timestamp: '2024-01-15 10:05:22',
        user: 'testing.itu',
        action: 'VIEW',
        resource: 'Dashboard',
        ipAddress: '192.168.1.101',
        status: 'success',
        details: 'Accessed dashboard overview'
      },
      {
        id: 7,
        timestamp: '2024-01-15 10:00:10',
        user: 'admin',
        action: 'LOGOUT',
        resource: 'Authentication',
        ipAddress: '192.168.1.100',
        status: 'success',
        details: 'User logged out'
      }
    ];
    
    setLogs(mockLogs);
    setFilteredLogs(mockLogs);
  }, []);

  // Filter logs based on search and filters
  useEffect(() => {
    let filtered = logs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter(log => log.timestamp.startsWith(dateFilter));
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, statusFilter, dateFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
      case 'LOGOUT':
        return <User className="w-4 h-4" />;
      case 'CREATE':
      case 'UPDATE':
      case 'DELETE':
        return <FileText className="w-4 h-4" />;
      case 'VIEW':
        return <Eye className="w-4 h-4" />;
      case 'EXPORT':
        return <Download className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Audit Logs
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Monitor system activities and user actions
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="warning">Warning</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />

            {/* Export Button */}
            <button className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {log.timestamp}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        {log.user}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <div className="flex items-center">
                        {getActionIcon(log.action)}
                        <span className="ml-2">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {log.resource}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {log.ipAddress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* No Results */}
          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No logs found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your search criteria or filters.
              </p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {logs.length}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Total Logs
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                {logs.filter(log => log.status === 'success').length}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Successful Actions
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                {logs.filter(log => log.status === 'failed').length}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Failed Actions
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {new Set(logs.map(log => log.user)).size}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Active Users
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPage;
