"use client";

import React, { useState, useEffect } from 'react';
import ModernTable, { Column } from '@/components/ui/table/ModernTable';
import ModernPagination, { PaginationInfo } from '@/components/ui/table/ModernPagination';
import TableHeader from '@/components/ui/table/TableHeader';
import TableFilters, { FilterConfig } from '@/components/ui/table/TableFilters';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';
import { Eye, Edit, Trash2, Tag, Calendar, FileText } from 'lucide-react';

interface Category {
  id: number;
  nama_kategori: string;
  icon_light: string | null;
  icon_dark: string | null;
  created_at: string;
  updated_at: string | null;
}

interface ApiResponse {
  success: boolean;
  data: Category[];
  pagination: PaginationInfo;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<keyof Category | string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    startItem: 1,
    endItem: 10
  });

  // Filter configurations
  const filterConfigs: FilterConfig[] = [
    // No filters available for categories at the moment
  ];

  // Table columns configuration
  const columns: Column<Category>[] = [
    {
      key: 'nama_kategori',
      title: 'Category Name',
      sortable: true,
      render: (category) => (
        <div className="flex items-center space-x-3">
          <Tag className="w-4 h-4 text-blue-500" />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {category && category.nama_kategori ? category.nama_kategori : '-'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'icon_light',
      title: 'Icons',
      render: (category) => (
        <div className="flex items-center space-x-2">
          {category && category.icon_light ? (
            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
              Has Icons
            </span>
          ) : (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              No Icons
            </span>
          )}
        </div>
      )
    },
    {
      key: 'created_at',
      title: 'Created',
      sortable: true,
      render: (category) => (
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {category && category.created_at ? new Date(category.created_at).toLocaleDateString() : '-'}
          </span>
        </div>
      )
    },
    {
      key: 'updated_at',
      title: 'Updated',
      sortable: true,
      render: (category) => (
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {category && category.updated_at ? new Date(category.updated_at).toLocaleDateString() : '-'}
          </span>
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (category) => (
        <div className="flex items-center space-x-2">
          {category ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewDetails(category)}
                className="p-2"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(category)}
                className="p-2"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(category)}
                className="p-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      )
    }
  ];

  // Fetch categories data
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.itemsPerPage.toString(),
        search: searchQuery,
        sortBy: sortBy.toString(),
        sortOrder,
        ...filters
      });

      const response = await fetch(`/api/kategoris/master?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ApiResponse = await response.json();

      if (data.success) {
        setCategories(data.data);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch categories:', data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Event handlers
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleSort = (key: keyof Category | string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleAddNew = () => {
    // TODO: Implement add new category modal
    console.log('Add new category');
  };

  const handleRefresh = () => {
    fetchCategories();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export categories');
  };

  const handleViewDetails = (category: Category) => {
    // TODO: Implement view details modal
    console.log('View details:', category);
  };

  const handleEdit = (category: Category) => {
    // TODO: Implement edit category modal
    console.log('Edit category:', category);
  };

  const handleDelete = (category: Category) => {
    // TODO: Implement delete confirmation
    console.log('Delete category:', category);
  };

  // Effects
  useEffect(() => {
    fetchCategories();
  }, [pagination.currentPage, searchQuery, filters, sortBy, sortOrder]);

  return (
    <div className="space-y-6">
      <TableHeader
        title="Categories Management"
        subtitle="Manage product categories and classifications"
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
        onAdd={handleAddNew}
        onRefresh={handleRefresh}
        onExport={handleExport}
        addButtonText="Add Category"
      />

      <TableFilters
        filters={filters}
        filterConfigs={filterConfigs}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      <ModernTable
        data={categories}
        columns={columns}
        loading={loading}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
        emptyText="No categories found"
      />

      <ModernPagination
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
