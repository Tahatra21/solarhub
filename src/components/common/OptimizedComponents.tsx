"use client";

import React, { memo, useMemo, useCallback } from 'react';
import { Pencil, Trash, Search, X, ChevronUp, ChevronDown } from 'lucide-react';

// Optimized Search Input Component
export const OptimizedSearchInput = memo(({ 
  value, 
  onChange, 
  onClear, 
  placeholder = "Cari data...",
  inputRef,
  disabled = false 
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  disabled?: boolean;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onClear();
  }, [onClear]);
  return (
    <div className="relative flex-1 max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});

OptimizedSearchInput.displayName = 'OptimizedSearchInput';

// Optimized Sort Button Component
export const OptimizedSortButton = memo(({ 
  column, 
  currentSortBy, 
  currentSortOrder, 
  onSort, 
  children,
  className = "" 
}: {
  column: string;
  currentSortBy: string;
  currentSortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
  children: React.ReactNode;
  className?: string;
}) => {
  const isActive = useMemo(() => currentSortBy === column, [currentSortBy, column]);
  
  const getSortIcon = useMemo(() => {
    if (!isActive) {
      return <ChevronUp className="h-4 w-4 text-gray-400" />;
    }
    return currentSortOrder === "asc" ? 
      <ChevronUp className="h-4 w-4 text-blue-600" /> : 
      <ChevronDown className="h-4 w-4 text-blue-600" />;
  }, [isActive, currentSortOrder]);

  const handleClick = useCallback(() => {
    onSort(column);
  }, [onSort, column]);

  return (
    <button
      onClick={handleClick}
      className={`flex items-center space-x-1 text-left font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${className}`}
    >
      <span>{children}</span>
      {getSortIcon}
    </button>
  );
});

OptimizedSortButton.displayName = 'OptimizedSortButton';

// Optimized Action Buttons Component
export const OptimizedActionButtons = memo(({ 
  onEdit, 
  onDelete, 
  canEdit = true, 
  canDelete = true 
}: {
  onEdit: () => void;
  onDelete: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}) => {
  return (
    <div className="flex items-center space-x-2">
      {canEdit && (
        <button
          onClick={onEdit}
          className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {canDelete && (
        <button
          onClick={onDelete}
          className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});

OptimizedActionButtons.displayName = 'OptimizedActionButtons';

// Optimized Loading Skeleton Row
export const OptimizedSkeletonRow = memo(({ columns }: { columns: number }) => {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }, (_, index) => (
        <td key={index} className="px-6 py-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </td>
      ))}
    </tr>
  );
});

OptimizedSkeletonRow.displayName = 'OptimizedSkeletonRow';

// Optimized Badge Component
export const OptimizedBadge = memo(({ 
  text, 
  variant = 'default' 
}: {
  text: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'warning':
        return 'bg-warm-honey/10 text-warm-honey dark:bg-warm-honey/20 dark:text-warm-honey';
      case 'danger':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVariantClasses()}`}>
      {text}
    </span>
  );
});

OptimizedBadge.displayName = 'OptimizedBadge';