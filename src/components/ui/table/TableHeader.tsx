"use client";

import React, { ReactNode } from 'react';
import { Search, Filter, Download, Plus, RefreshCw } from 'lucide-react';

export interface TableHeaderProps {
  title?: string;
  subtitle?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  onAdd?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  addButtonText?: string;
  showAddButton?: boolean;
  showRefreshButton?: boolean;
  showExportButton?: boolean;
  children?: ReactNode;
  className?: string;
}

const TableHeader: React.FC<TableHeaderProps> = ({
  title,
  subtitle,
  searchValue = '',
  searchPlaceholder = 'Cari data...',
  onSearchChange,
  onAdd,
  onRefresh,
  onExport,
  addButtonText = 'Tambah Data',
  showAddButton = true,
  showRefreshButton = true,
  showExportButton = true,
  children,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Title Section */}
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {/* Custom Children */}
          {children}

          {/* Refresh Button */}
          {showRefreshButton && onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          )}

          {/* Export Button */}
          {showExportButton && onExport && (
            <button
              onClick={onExport}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          )}

          {/* Add Button */}
          {showAddButton && onAdd && (
            <button
              onClick={onAdd}
              className="inline-flex items-center px-4 py-2.5 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              {addButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableHeader;
