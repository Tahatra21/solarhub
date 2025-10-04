"use client";

import React, { useState, useEffect } from "react";
import ModernTable, { Column } from '@/components/ui/table/ModernTable';
import ModernPagination, { PaginationInfo } from '@/components/ui/table/ModernPagination';
import LicenseForm from "@/components/monitoring/LicenseForm";
import Button from '@/components/ui/button/Button';
import Badge from '@/components/ui/badge/Badge';
import {
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  Shield,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Search
} from 'lucide-react';

interface LicenseData {
  id: number;
  nama: string;
  comp: string;
  bpo: string;
  jenis: string;
  period: string;
  qty: number;
  symbol: string;
  unit_price: number;
  total_price: number;
  selling_price: number;
  cont_serv_month: number;
  cont_period: string;
  start_date: string;
  end_date: string;
  met_puch: string;
  license_status?: string;
  created_at?: string;
  updated_at?: string;
}

interface FilterConfig {
  key: string;
  label: string;
  type: string;
  placeholder: string;
  options?: Array<{ value: string; label: string }>;
}

interface FilterOptions {
  jenis: string[];
  comp: string[];
  bpo: string[];
  period: string[];
}

interface Statistics {
  total: number;
  active: number;
  expiring: number;
  expired: number;
  totalValue: number;
}

const MonitoringLicensePage: React.FC = () => {
  const [licenses, setLicenses] = useState<LicenseData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedItem, setSelectedItem] = useState<LicenseData | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<LicenseData | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filters, setFilters] = useState({
    jenis: '',
    comp: '',
    bpo: '',
    period: '',
    status: 'All'
  });
  
  // Sorting
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Filter options
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    jenis: [],
    comp: [],
    bpo: [],
    period: []
  });
  
  // Statistics
  const [statistics, setStatistics] = useState<Statistics | null>(null);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [currentPage, searchTerm, filters, sortBy, sortOrder]);

  useEffect(() => {
    fetchFilterOptions();
    fetchStatistics();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        jenis: filters.jenis,
        comp: filters.comp,
        bpo: filters.bpo,
        period: filters.period,
        status: filters.status,
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/monitoring-license?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setLicenses(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotalItems(result.pagination.totalItems);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/monitoring-license/filters');
      const result = await response.json();
      if (result.success) {
        setFilterOptions(result.data);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/monitoring-license/statistics');
      const result = await response.json();
      if (result.success) {
        setStatistics(result.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      jenis: '',
      comp: '',
      bpo: '',
      period: '',
      status: 'All'
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: LicenseData) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = async (item: LicenseData) => {
    if (confirm(`Are you sure you want to delete "${item.nama}"?`)) {
      try {
        const response = await fetch(`/api/monitoring-license/${item.id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          fetchData();
        }
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error menghapus data');
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleFormSuccess = () => {
    fetchData();
    handleFormClose();
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingItem) {
        // Update existing license
        const response = await fetch(`/api/monitoring-license/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Failed to update license');
      } else {
        // Create new license
        const response = await fetch('/api/monitoring-license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Failed to create license');
      }
      
      handleFormSuccess();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const getStatusColor = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const daysUntilExpiry = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (daysUntilExpiry < 0) {
      return 'bg-red-100 text-red-800 border-red-200'; // Expired
    } else if (daysUntilExpiry <= 30) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Expiring soon
    } else {
      return 'bg-green-100 text-green-800 border-green-200'; // Active
    }
  };

  const getStatusText = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const daysUntilExpiry = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (daysUntilExpiry < 0) {
      return 'Expired';
    } else if (daysUntilExpiry <= 30) {
      return `Expires in ${daysUntilExpiry} days`;
    } else {
      return 'Active';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Define table columns
  const columns: Column<LicenseData>[] = [
    {
      key: 'nama',
      title: 'License Name',
      width: '250px',
      sortable: true,
      render: (value) => (
        <div className="max-w-xs">
          <div className="font-medium text-gray-900 truncate" title={value}>
            {value}
          </div>
        </div>
      )
    },
    {
      key: 'comp',
      title: 'Company',
      width: '150px',
      sortable: true,
      render: (value) => (
        <div className="max-w-xs">
          <div className="text-gray-900 truncate" title={value}>
            {value}
          </div>
        </div>
      )
    },
    {
      key: 'bpo',
      title: 'BPO',
      width: '120px',
      sortable: true
    },
    {
      key: 'jenis',
      title: 'Type',
      width: '120px',
      sortable: true,
      render: (value) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
          {value}
        </span>
      )
    },
    {
      key: 'period',
      title: 'Period',
      width: '120px',
      sortable: true
    },
    {
      key: 'qty',
      title: 'Qty',
      width: '80px',
      sortable: true,
      align: 'center'
    },
    {
      key: 'total_price',
      title: 'Total Price',
      width: '150px',
      sortable: true,
      align: 'right',
      render: (value) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(value)}
        </span>
      )
    },
    {
      key: 'end_date',
      title: 'Status',
      width: '150px',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(value)}`}>
          {getStatusText(value)}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      width: '100px',
      align: 'center',
      render: (_, record) => (
        <div className="flex items-center justify-center">
          <button 
            onClick={() => setSelectedItem(record)}
            className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
            title="View Details"
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </button>
        </div>
      )
    }
  ];

  // Define filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      key: 'jenis',
      label: 'Type',
      type: 'select',
      placeholder: 'All Types',
      options: filterOptions.jenis.map(jenis => ({ label: jenis, value: jenis }))
    },
    {
      key: 'comp',
      label: 'Company',
      type: 'select',
      placeholder: 'All Companies',
      options: filterOptions.comp.map(comp => ({ label: comp, value: comp }))
    },
    {
      key: 'bpo',
      label: 'BPO',
      type: 'select',
      placeholder: 'All BPO',
      options: filterOptions.bpo.map(bpo => ({ label: bpo, value: bpo }))
    },
    {
      key: 'period',
      label: 'Period',
      type: 'select',
      placeholder: 'All Periods',
      options: filterOptions.period.map(period => ({ label: period, value: period }))
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'All Status',
      options: [
        { label: 'All', value: 'All' },
        { label: 'Active', value: 'Active' },
        { label: 'Expiring Soon', value: 'Expiring' },
        { label: 'Expired', value: 'Expired' }
      ]
    }
  ];

  // Prepare pagination info
  const paginationInfo: PaginationInfo = {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage: 10,
    startItem: (currentPage - 1) * 10 + 1,
    endItem: Math.min(currentPage * 10, totalItems)
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Licenses</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.expiring}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(statistics.totalValue)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Monitoring License</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Kelola dan pantau lisensi software dan aplikasi</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
            <Button onClick={handleAdd} variant="primary" className="flex items-center">
              <Plus className="w-4 h-4 mr-2" /> Add License
            </Button>
            <Button onClick={() => {/* TODO: Implement export */}} variant="outline" className="flex items-center">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button onClick={fetchData} variant="outline" className="flex items-center">
              <Search className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>
        
        {/* Search and Filters in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search licenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Jenis Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jenis</label>
            <select
              value={filters.jenis || ''}
              onChange={(e) => handleFilterChange('jenis', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">All Types</option>
              {filterOptions.jenis?.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* BPO Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">BPO</label>
            <select
              value={filters.bpo || ''}
              onChange={(e) => handleFilterChange('bpo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">All BPO</option>
              {filterOptions.bpo?.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <Button 
              onClick={clearFilters} 
              variant="outline" 
              className="w-full"
              disabled={!Object.values(filters).some(value => value !== '' && value !== null)}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <ModernTable
        columns={columns}
        data={licenses}
        loading={loading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyText="No licenses found"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <ModernPagination
          pagination={paginationInfo}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">License Details</h2>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">License Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">License Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.nama}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.comp}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">BPO</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.bpo}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        {selectedItem.jenis}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Period</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.period}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.qty}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing & Dates</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                      <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedItem.unit_price)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Price</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">{formatCurrency(selectedItem.total_price)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Selling Price</label>
                      <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedItem.selling_price)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contract Service (Months)</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.cont_serv_month}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Date</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.start_date}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Date</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.end_date}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(selectedItem.end_date)}`}>
                        {getStatusText(selectedItem.end_date)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Purchase Method</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.met_puch}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    handleEdit(selectedItem);
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-300 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${selectedItem?.nama}"?`)) {
                      setSelectedItem(null);
                      handleDelete(selectedItem!);
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {isFormOpen && (
        <LicenseForm
          isOpen={isFormOpen}
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
          editData={editingItem}
        />
      )}
    </div>
  );
};

export default MonitoringLicensePage;
