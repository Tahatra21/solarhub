"use client";

import React, { ReactNode } from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

export interface Column<T = any> {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, record: T, index: number) => ReactNode;
}

export interface ModernTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  className?: string;
  emptyText?: string;
  showHeader?: boolean;
}

const ModernTable = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  sortBy,
  sortOrder,
  onSort,
  className = '',
  emptyText = 'Tidak ada data',
  showHeader = true
}: ModernTableProps<T>) => {
  const handleSort = (key: string, sortable?: boolean) => {
    if (sortable && onSort) {
      onSort(key);
    }
  };

  const getSortIcon = (key: string, sortable?: boolean) => {
    if (!sortable) return null;
    
    if (sortBy === key) {
      return sortOrder === 'asc' ? (
        <ChevronUp className="w-4 h-4 text-blue-600" />
      ) : (
        <ChevronDown className="w-4 h-4 text-blue-600" />
      );
    }
    
    return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
  };

  const getAlignmentClass = (align?: string) => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
        <div className="p-8 text-center">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Memuat data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {showHeader && (
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {columns.map((column, index) => (
                  <th
                    key={column.key}
                    className={`px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider ${getAlignmentClass(column.align)} ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100 transition-colors duration-200' : ''
                    }`}
                    style={{ width: column.width }}
                    onClick={() => handleSort(column.key, column.sortable)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.title}</span>
                      {getSortIcon(column.key, column.sortable)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium">{emptyText}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 transition-colors duration-200"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 whitespace-nowrap text-sm ${getAlignmentClass(column.align)}`}
                    >
                      {column.render
                        ? column.render(record[column.key], record, index)
                        : record[column.key] || '-'
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ModernTable;
