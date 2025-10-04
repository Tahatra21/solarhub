"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from '@/lib/performance';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  cache?: boolean;
  debounceMs?: number;
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Simple cache untuk menyimpan hasil fetch
const fetchCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

const getCacheKey = (url: string, options: FetchOptions): string => {
  return `${url}_${JSON.stringify(options)}`;
};

const getCachedData = (key: string): any | null => {
  const cached = fetchCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > cached.ttl) {
    fetchCache.delete(key);
    return null;
  }
  
  return cached.data;
};

const setCachedData = (key: string, data: any, ttl: number = 300000): void => {
  fetchCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
};

export function useOptimizedFetch<T = any>(
  url: string | null,
  options: FetchOptions = {}
): FetchState<T> & { refetch: () => void; clearCache: () => void } {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const cacheKey = useMemo(() => {
    return url ? getCacheKey(url, options) : null;
  }, [url, options]);

  const fetchData = useCallback(async () => {
    if (!url) return;

    // Check cache first
    if (options.cache !== false && cacheKey) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        setState({ data: cachedData, loading: false, error: null });
        return;
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          ...options.headers
        }
      };

      if (options.body && options.method !== 'GET') {
        fetchOptions.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the result if caching is enabled
      if (options.cache !== false && cacheKey) {
        setCachedData(cacheKey, data);
      }

      setState({ data, loading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({ data: null, loading: false, error: errorMessage });
    }
  }, [url, options, cacheKey]);

  // Debounced fetch function
  const debouncedFetch = useMemo(() => {
    return options.debounceMs ? debounce(fetchData, options.debounceMs) : fetchData;
  }, [fetchData, options.debounceMs]);

  const refetch = useCallback(() => {
    if (cacheKey) {
      fetchCache.delete(cacheKey);
    }
    fetchData();
  }, [fetchData, cacheKey]);

  const clearCache = useCallback(() => {
    if (cacheKey) {
      fetchCache.delete(cacheKey);
    }
  }, [cacheKey]);

  useEffect(() => {
    if (url) {
      debouncedFetch();
    }
  }, [url, debouncedFetch]);

  return {
    ...state,
    refetch,
    clearCache
  };
}

// Hook untuk optimasi pagination
export function useOptimizedPagination(initialPage: number = 1, initialLimit: number = 10) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);
  const offset = useMemo(() => (page - 1) * limit, [page, limit]);

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(page + 1);
  }, [page, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(page - 1);
  }, [page, goToPage]);

  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  }, []);

  return {
    page,
    limit,
    total,
    totalPages,
    offset,
    setTotal,
    goToPage,
    nextPage,
    prevPage,
    changeLimit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
}

// Hook untuk optimasi search dengan debouncing
export function useOptimizedSearch(initialValue: string = '', debounceMs: number = 500) {
  const [searchValue, setSearchValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  const debouncedSetValue = useMemo(
    () => debounce((value: string) => setDebouncedValue(value), debounceMs),
    [debounceMs]
  );

  useEffect(() => {
    debouncedSetValue(searchValue);
  }, [searchValue, debouncedSetValue]);

  const clearSearch = useCallback(() => {
    setSearchValue('');
    setDebouncedValue('');
  }, []);

  return {
    searchValue,
    debouncedValue,
    setSearchValue,
    clearSearch,
    isSearching: searchValue !== debouncedValue
  };
}