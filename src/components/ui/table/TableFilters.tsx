// src/components/ui/table/TableFilters.tsx
import React from 'react';
import Button from '@/components/ui/button/Button'; // Assuming Button is a default export

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date';
  options?: FilterOption[];
  placeholder?: string;
}

interface TableFiltersProps {
  filters: Record<string, string>;
  filterConfigs: FilterConfig[];
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
}

const TableFilters: React.FC<TableFiltersProps> = ({
  filters,
  filterConfigs,
  onFilterChange,
  onClearFilters,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border p-6 mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h2>
        <Button onClick={onClearFilters} variant="outline" className="mt-3 md:mt-0">
          Clear All Filters
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filterConfigs.map((config) => (
          <div key={config.key}>
            <label htmlFor={config.key} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {config.label}
            </label>
            {config.type === 'select' && config.options ? (
              <select
                id={config.key}
                value={filters[config.key] || ''}
                onChange={(e) => onFilterChange(config.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="">{config.placeholder || `All ${config.label}`}</option>
                {config.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={config.key}
                type={config.type}
                value={filters[config.key] || ''}
                onChange={(e) => onFilterChange(config.key, e.target.value)}
                placeholder={config.placeholder || `Enter ${config.label}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableFilters;