"use client";

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/button/Button';
import Badge from '@/components/ui/badge/Badge';
import ModernTable, { Column } from '@/components/ui/table/ModernTable';
import ModernPagination, { PaginationInfo } from '@/components/ui/table/ModernPagination';
import CRJRModal from '@/components/monitoring/CRJRModal';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface CRJRData {
  id: number;
  no: string | null;
  jenis: string;
  corp: string | null;
  sub_bidang: string | null;
  nama_aplikasi: string | null;
  judul_change_request: string | null;
  nomor_surat_penugasan: string | null;
  manager_pic: string | null;
  tanggal_surat_sti: string | null;
  tahapan: string | null;
  organisasi: string | null;
  tahun: number | null;
  january: number | null;
  february: number | null;
  march: number | null;
  april: number | null;
  may: number | null;
  june: number | null;
  july: number | null;
  august: number | null;
  september: number | null;
  october: number | null;
  november: number | null;
  december: number | null;
  created_at: string;
  updated_at: string;
}

interface FilterOptions {
  jenis: string[];
  corp: string[];
  tahapan: string[];
  organisasi: string[];
  tahun: string[];
}

interface Statistics {
  total: number;
  byJenis: Array<{ jenis: string; count: number }>;
  byTahapan: Array<{ tahapan: string; count: number }>;
  byYear: Array<{ tahun: number; count: number }>;
}

const MonitoringCRJRPage: React.FC = () => {
  const [data, setData] = useState<CRJRData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CRJRData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CRJRData | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    jenis: '',
    corp: '',
    tahapan: '',
    organisasi: '',
    tahun: ''
  });
  
  // Sorting
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Filter options
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    jenis: [],
    corp: [],
    tahapan: [],
    organisasi: [],
    tahun: []
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
        corp: filters.corp,
        tahapan: filters.tahapan,
        organisasi: filters.organisasi,
        tahun: filters.tahun,
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/monitoring-crjr?${params}`);
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
      const response = await fetch('/api/monitoring-crjr/filters');
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
      const response = await fetch('/api/monitoring-crjr/statistics');
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
      corp: '',
      tahapan: '',
      organisasi: '',
      tahun: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: CRJRData) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDelete = async (item: CRJRData) => {
    if (confirm(`Are you sure you want to delete "${item.judul_change_request}"?`)) {
      try {
        const response = await fetch(`/api/monitoring-crjr/${item.id}`, {
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

  const handleDeleteById = async (id: number) => {
    try {
      const response = await fetch(`/api/monitoring-crjr/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error menghapus data');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleModalSuccess = () => {
    fetchData();
    handleModalClose();
  };

  const getJenisColor = (jenis: string) => {
    switch (jenis?.toLowerCase()) {
      case 'change request': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'job request': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTahapanColor = (tahapan: string) => {
    switch (tahapan?.toLowerCase()) {
      case 'planning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'development': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'testing': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'deployment': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Define table columns
  const columns: Column<CRJRData>[] = [
    {
      key: 'no',
      title: 'No',
      width: '80px',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900">{value || '-'}</span>
      )
    },
    {
      key: 'jenis',
      title: 'Jenis',
      width: '120px',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getJenisColor(value)}`}>
          {value}
        </span>
      )
    },
    {
      key: 'nama_aplikasi',
      title: 'Aplikasi',
      width: '200px',
      sortable: true,
      render: (value) => (
        <div className="max-w-xs">
          <div className="font-medium text-gray-900 truncate" title={value}>
            {value || '-'}
          </div>
        </div>
      )
    },
    {
      key: 'judul_change_request',
      title: 'Judul CR/JR',
      width: '300px',
      sortable: true,
      render: (value) => (
        <div className="max-w-xs">
          <div className="text-gray-900 truncate" title={value}>
            {value || '-'}
          </div>
        </div>
      )
    },
    {
      key: 'corp',
      title: 'Corp',
      width: '120px',
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'manager_pic',
      title: 'Manager PIC',
      width: '150px',
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'tahapan',
      title: 'Tahapan',
      width: '120px',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getTahapanColor(value)}`}>
          {value || '-'}
        </span>
      )
    },
    {
      key: 'tahun',
      title: 'Tahun',
      width: '80px',
      sortable: true,
      align: 'center',
      render: (value) => value || '-'
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
  const filterConfigs = [
    {
      key: 'jenis',
      label: 'Jenis',
      type: 'select',
      placeholder: 'All Types',
      options: filterOptions.jenis.map(jenis => ({ label: jenis, value: jenis }))
    },
    {
      key: 'corp',
      label: 'Corp',
      type: 'select',
      placeholder: 'All Corp',
      options: filterOptions.corp.map(corp => ({ label: corp, value: corp }))
    },
    {
      key: 'tahapan',
      label: 'Tahapan',
      type: 'select',
      placeholder: 'All Stages',
      options: filterOptions.tahapan.map(tahapan => ({ label: tahapan, value: tahapan }))
    },
    {
      key: 'organisasi',
      label: 'Organisasi',
      type: 'select',
      placeholder: 'All Organizations',
      options: filterOptions.organisasi.map(org => ({ label: org, value: org }))
    },
    {
      key: 'tahun',
      label: 'Tahun',
      type: 'select',
      placeholder: 'All Years',
      options: Array.from({ length: 5 }, (_, i) => {
        const year = new Date().getFullYear() - i;
        return { label: year.toString(), value: year.toString() };
      })
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
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total CR/JR</p>
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
                <p className="text-sm font-medium text-gray-600">Change Request</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics.byJenis.find(j => j.jenis === 'Change Request')?.count || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Activity className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Job Request</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics.byJenis.find(j => j.jenis === 'Job Request')?.count || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Year</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics.byYear.find(y => y.tahun === new Date().getFullYear())?.count || 0}
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Monitoring CR/JR</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Kelola dan pantau Change Request dan Job Request</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
            <Button onClick={handleAdd} variant="primary" className="flex items-center">
              <Plus className="w-4 h-4 mr-2" /> Add CR/JR
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
                placeholder="Search CR/JR..."
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
              {filterOptions.jenis?.map((option: string) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Tahapan Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tahapan</label>
            <select
              value={filters.tahapan || ''}
              onChange={(e) => handleFilterChange('tahapan', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">All Stages</option>
              {filterOptions.tahapan?.map((option: string) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Tahun Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tahun</label>
            <select
              value={filters.tahun || ''}
              onChange={(e) => handleFilterChange('tahun', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">All Years</option>
              {filterOptions.tahun?.map((option: string) => (
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
        emptyText="No CR/JR found"
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
                <h2 className="text-xl font-bold text-gray-900">CR/JR Details</h2>
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
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">No</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.no || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Jenis</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getJenisColor(selectedItem.jenis)}`}>
                        {selectedItem.jenis}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nama Aplikasi</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.nama_aplikasi || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Judul Change Request</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.judul_change_request || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Corp</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.corp || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Sub Bidang</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.sub_bidang || '-'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Management & Status</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Manager PIC</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.manager_pic || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nomor Surat Penugasan</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.nomor_surat_penugasan || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tanggal Surat STI</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.tanggal_surat_sti || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tahapan</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getTahapanColor(selectedItem.tahapan || '')}`}>
                        {selectedItem.tahapan || '-'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Organisasi</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.organisasi || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tahun</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.tahun || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Progress */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Progress</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[
                    { key: 'january', label: 'Jan' },
                    { key: 'february', label: 'Feb' },
                    { key: 'march', label: 'Mar' },
                    { key: 'april', label: 'Apr' },
                    { key: 'may', label: 'May' },
                    { key: 'june', label: 'Jun' },
                    { key: 'july', label: 'Jul' },
                    { key: 'august', label: 'Aug' },
                    { key: 'september', label: 'Sep' },
                    { key: 'october', label: 'Oct' },
                    { key: 'november', label: 'Nov' },
                    { key: 'december', label: 'Dec' }
                  ].map(month => (
                    <div key={month.key} className="text-center">
                      <label className="block text-xs font-medium text-gray-700 mb-1">{month.label}</label>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <span className="text-sm font-medium text-gray-900">
                          {selectedItem[month.key as keyof CRJRData] || 0}
                        </span>
                      </div>
                    </div>
                  ))}
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
                    if (confirm(`Are you sure you want to delete "${selectedItem?.judul_change_request}"?`)) {
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

      {/* Add/Edit Modal */}
      {showModal && (
        <CRJRModal
          isOpen={showModal}
          onClose={handleModalClose}
          data={editingItem}
          mode={editingItem ? 'edit' : 'create'}
          onSave={handleModalSuccess}
          onDelete={handleDeleteById}
        />
      )}
    </div>
  );
};

export default MonitoringCRJRPage;
