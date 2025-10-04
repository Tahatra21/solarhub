"use client";

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  startItem: number;
  endItem: number;
}

export interface ModernPaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  className?: string;
}

const ModernPagination: React.FC<ModernPaginationProps> = ({
  pagination,
  onPageChange,
  className = ''
}) => {
  const { currentPage, totalPages, totalItems, startItem, endItem } = pagination;
  
  // Ensure all values are valid numbers
  const safeCurrentPage = Number.isNaN(currentPage) ? 1 : currentPage;
  const safeTotalPages = Number.isNaN(totalPages) ? 1 : totalPages;
  const safeTotalItems = Number.isNaN(totalItems) ? 0 : totalItems;
  const safeStartItem = Number.isNaN(startItem) ? 0 : startItem;
  const safeEndItem = Number.isNaN(endItem) ? 0 : endItem;

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, safeCurrentPage - delta);
      i <= Math.min(safeTotalPages - 1, safeCurrentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (safeCurrentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (safeCurrentPage + delta < safeTotalPages - 1) {
      rangeWithDots.push('...', safeTotalPages);
    } else if (safeTotalPages > 1) {
      rangeWithDots.push(safeTotalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  if (totalPages <= 1) {
    return (
      <div className={`flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200 ${className}`}>
        <div className="text-sm text-gray-700">
          Menampilkan <span className="font-medium">{totalItems}</span> dari{' '}
          <span className="font-medium">{totalItems}</span> data
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200 ${className}`}>
      {/* Info */}
      <div className="text-sm text-gray-700">
        Menampilkan <span className="font-medium">{safeStartItem}</span> sampai{' '}
        <span className="font-medium">{safeEndItem}</span> dari{' '}
        <span className="font-medium">{safeTotalItems}</span> data
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center space-x-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          className={`
            inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
            ${safeCurrentPage === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
            }
          `}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </button>

        {/* Page Numbers */}
        <div className="flex items-center space-x-1">
          {visiblePages.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`dots-${index}`}
                  className="px-3 py-2 text-sm text-gray-500"
                >
                  ...
                </span>
              );
            }

            const pageNumber = page as number;
            const isActive = pageNumber === safeCurrentPage;

            return (
              <button
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                className={`
                  px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                  ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }
                `}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === safeTotalPages}
          className={`
            inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
            ${safeCurrentPage === safeTotalPages
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
            }
          `}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

export default ModernPagination;
