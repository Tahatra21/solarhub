"use client";

import React, { useState, useEffect } from 'react';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';
import ModernTable, { Column } from '@/components/ui/table/ModernTable';
import ModernPagination, { PaginationInfo } from '@/components/ui/table/ModernPagination';
import RunProgramForm from '@/components/monitoring/RunProgramForm';
import { 
  Search, 
  Eye,
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus
} from 'lucide-react';

interface MonitoringRunProgram {
  id: number;
  no_task: number;
  task_name: string;
  type: string;
  bpo: string;
  holding_sh_ap: string;
  potensi_revenue: string;
  pic_team_cusol: string;
  priority: string;
  percent_complete: string;
  surat: string;
  tanggal_surat: string | null;
  perihal_surat: string;
  start_date: string | null;
  end_date: string | null;
  pic_icon: string;
  progress_agst_w1: string;
  next_action_agst_w1: string;
  status_agst_w1: string;
  progress_agst_w2: string;
  next_action_agst_w2: string;
  status_agst_w2: string;
  progress_agst_w3: string;
  next_action_agst_w3: string;
  status_agst_w3: string;
  progress_agst_w4: string;
  next_action_agst_w4: string;
  status_agst_w4: string;
  progress_sept_w1: string;
  next_action_sept_w1: string;
  status_sept_w1: string;
  progress_sept_w2: string;
  next_action_sept_w2: string;
  status_sept_w2: string;
  progress_sept_w3: string;
  next_action_sept_w3: string;
  status_sept_w3: string;
  progress_sept_w4: string;
  next_action_sept_w4: string;
  status_sept_w4: string;
  overall_status: string;
  created_at: string;
  updated_at: string;
}

interface FilterConfig {
  key: string;
  label: string;
  type: string;
  placeholder: string;
  options?: Array<{ value: string; label: string }>;
}

interface FilterOptions {
  types: string[];
  bpos: string[];
  priorities: string[];
  statuses: string[];
}

interface Statistics {
  total: number;
  avgCompletion: string;
  totalRevenue: number;
  byStatus: Array<{ overall_status: string; count: string }>;
}

const MonitoringRunProgramPage: React.FC = () => {
  const [data, setData] = useState<MonitoringRunProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MonitoringRunProgram | null>(null);
  const [editingItem, setEditingItem] = useState<MonitoringRunProgram | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MonitoringRunProgram | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    bpo: '',
    priority: '',
    status: ''
  });
  
  // Sorting
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Filter options
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    types: [],
    bpos: [],
    priorities: [],
    statuses: []
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
        type: filters.type,
        bpo: filters.bpo,
        priority: filters.priority,
        status: filters.status,
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/monitoring-run-program?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
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
      const response = await fetch('/api/monitoring-run-program/filters');
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
      const response = await fetch('/api/monitoring-run-program/statistics');
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
      type: '',
      bpo: '',
      priority: '',
      status: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleUpdate = (item: MonitoringRunProgram | null) => {
    if (!item) return;
    console.log('handleUpdate called with:', item);
    setEditingItem(item);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleDelete = (item: MonitoringRunProgram) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleFormClose = () => {
    console.log('handleFormClose called');
    setShowForm(false);
    setEditingItem(null);
  };

  const handleFormSubmit = async (formData: any) => {
    setFormLoading(true);
    try {
      if (editingItem) {
        // Update existing program
        const response = await fetch(`/api/monitoring-run-program/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error('Failed to update program');
      } else {
        // Create new program
        const response = await fetch('/api/monitoring-run-program', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error('Failed to create program');
      }
      
      handleFormClose();
      fetchData();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error saving program');
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormDelete = async (id: number) => {
    setFormLoading(true);
    try {
      const response = await fetch(`/api/monitoring-run-program/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete program');
      
      handleFormClose();
      fetchData();
    } catch (error) {
      console.error('Error deleting program:', error);
      alert('Error deleting program');
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const response = await fetch(`/api/monitoring-run-program/${itemToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchData();
        setShowDeleteModal(false);
        setItemToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting program:', error);
      alert('Error menghapus program');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON TRACK': return 'bg-green-100 text-green-800 border-green-200';
      case 'LAGGING': return 'bg-red-100 text-red-800 border-red-200';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Define table columns
  const columns: Column<MonitoringRunProgram>[] = [
    {
      key: 'no_task',
      title: 'No',
      width: '80px',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      )
    },
    {
      key: 'task_name',
      title: 'Task Name',
      width: '300px',
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
      key: 'type',
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
      key: 'bpo',
      title: 'BPO',
      width: '150px',
      sortable: true
    },
    {
      key: 'pic_team_cusol',
      title: 'PIC',
      width: '150px',
      sortable: true
    },
    {
      key: 'priority',
      title: 'Priority',
      width: '100px',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(value)}`}>
          {value}
        </span>
      )
    },
    {
      key: 'percent_complete',
      title: 'Progress',
      width: '150px',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${value}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium">{value}%</span>
        </div>
      )
    },
    {
      key: 'potensi_revenue',
      title: 'Revenue',
      width: '120px',
      sortable: true,
      align: 'right',
      render: (value) => (
        <div className="text-sm">
          {value ? 
            `Rp ${(parseInt(value) / 1000000).toFixed(0)}M` : 
            'N/A'
          }
        </div>
      )
    },
    {
      key: 'overall_status',
      title: 'Status',
      width: '120px',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(value)}`}>
          {value}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      width: '100px',
      align: 'center',
      render: (_, record) => (
        <button 
          onClick={() => setSelectedItem(record)}
          className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
          title="View Details"
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </button>
      )
    }
  ];

  // Define filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      placeholder: 'All Types',
      options: filterOptions.types.map(type => ({ label: type, value: type }))
    },
    {
      key: 'bpo',
      label: 'BPO',
      type: 'select',
      placeholder: 'All BPO',
      options: filterOptions.bpos.map(bpo => ({ label: bpo, value: bpo }))
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      placeholder: 'All Priority',
      options: filterOptions.priorities.map(priority => ({ label: priority, value: priority }))
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'All Status',
      options: filterOptions.statuses.map(status => ({ label: status, value: status }))
    }
  ];

  // Prepare pagination info
  const paginationInfo: PaginationInfo = {
    currentPage: currentPage || 1,
    totalPages: totalPages || 1,
    totalItems: totalItems || 0,
    itemsPerPage: 10,
    startItem: Math.max((currentPage - 1) * 10 + 1, 0),
    endItem: Math.min(currentPage * 10, totalItems || 0)
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
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Programs</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Progress</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.avgCompletion}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  Rp {(statistics.totalRevenue / 1000000000).toFixed(1)}B
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">At Risk</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics.byStatus.find(s => s.overall_status === 'LAGGING')?.count || 0}
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Monitoring Run Inisiatif</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Kelola dan pantau progress inisiatif yang sedang berjalan</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
            <Button onClick={handleAdd} variant="primary" className="flex items-center">
              <Plus className="w-4 h-4 mr-2" /> Add Program
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mt-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search programs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select
              value={filters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">All Types</option>
              {filterOptions.types?.map((option) => (
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
              {filterOptions.bpos?.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">All Status</option>
              {filterOptions.statuses?.map((option) => (
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
        data={data}
        loading={loading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyText="No programs found"
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
                <h2 className="text-xl font-bold text-gray-900">Program Details</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      console.log('Update button clicked, selectedItem:', selectedItem);
                      handleUpdate(selectedItem);
                    }}
                    className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Update
                  </button>
                  <button
                    onClick={() => handleDelete(selectedItem)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </button>
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
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Task Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.task_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.type}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">BPO</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.bpo}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">PIC Team Cusol</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.pic_team_cusol || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(selectedItem.priority)}`}>
                        {selectedItem.priority}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(selectedItem.overall_status)}`}>
                        {selectedItem.overall_status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Progress & Revenue</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Progress</label>
                      <div className="mt-1 flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${selectedItem.percent_complete}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{selectedItem.percent_complete}%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Potential Revenue</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedItem.potensi_revenue ? 
                          `Rp ${(parseInt(selectedItem.potensi_revenue) / 1000000).toFixed(0)}M` : 
                          'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Date</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.start_date || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Date</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.end_date || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">Delete Program</h3>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-700">
                  Are you sure you want to delete "{itemToDelete.task_name}"? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <RunProgramForm
          isOpen={showForm}
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
          onDelete={handleFormDelete}
          editData={editingItem}
          loading={formLoading}
        />
      )}
      
      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 text-xs rounded">
          <div>showForm: {showForm ? 'true' : 'false'}</div>
          <div>editingItem: {editingItem ? editingItem.task_name : 'null'}</div>
          <div>selectedItem: {selectedItem ? selectedItem.task_name : 'null'}</div>
        </div>
      )}
    </div>
  );
};

export default MonitoringRunProgramPage;
