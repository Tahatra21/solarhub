// Performance optimization utilities

// Debounce function untuk search inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function untuk scroll events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Cache untuk menyimpan hasil API calls
class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 300000) { // default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  delete(key: string) {
    this.cache.delete(key);
  }
}

export const apiCache = new SimpleCache();

// Function untuk membuat cache key
export function createCacheKey(endpoint: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {} as Record<string, any>);
  
  return `${endpoint}?${new URLSearchParams(sortedParams).toString()}`;
}

// Optimized fetch function dengan caching
export async function cachedFetch(
  url: string,
  options: RequestInit = {},
  cacheTTL: number = 300000 // 5 minutes default
): Promise<any> {
  const cacheKey = createCacheKey(url, {});
  
  // Check cache first
  const cachedData = apiCache.get(cacheKey);
  if (cachedData && options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
    return cachedData;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache successful GET requests
    if (!options.method || options.method === 'GET') {
      apiCache.set(cacheKey, data, cacheTTL);
    }

    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>();

  static start(label: string): string {
    const id = `${label}-${Date.now()}-${Math.random()}`;
    performance.mark(`${id}-start`);
    return id;
  }

  static end(id: string): number {
    performance.mark(`${id}-end`);
    performance.measure(id, `${id}-start`, `${id}-end`);
    
    const measure = performance.getEntriesByName(id)[0];
    const duration = measure.duration;
    
    // Store measurement
    const label = id.split('-')[0];
    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }
    this.measurements.get(label)!.push(duration);
    
    // Clean up
    performance.clearMarks(`${id}-start`);
    performance.clearMarks(`${id}-end`);
    performance.clearMeasures(id);
    
    return duration;
  }

  static getStats(label: string): { avg: number; min: number; max: number; count: number } | null {
    const measurements = this.measurements.get(label);
    if (!measurements || measurements.length === 0) return null;

    const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);
    
    return { avg, min, max, count: measurements.length };
  }

  static clearStats(label?: string) {
    if (label) {
      this.measurements.delete(label);
    } else {
      this.measurements.clear();
    }
  }
}

// React hook untuk performance monitoring
export function usePerformanceMonitor(label: string) {
  const start = () => PerformanceMonitor.start(label);
  const end = (id: string) => PerformanceMonitor.end(id);
  const getStats = () => PerformanceMonitor.getStats(label);
  
  return { start, end, getStats };
}