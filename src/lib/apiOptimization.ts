// Hapus baris pertama ini:
// "use client";

// Mulai langsung dengan:
import { NextRequest, NextResponse } from 'next/server';

// Interface untuk response caching
interface CacheConfig {
  maxAge?: number; // dalam detik
  staleWhileRevalidate?: number; // dalam detik
  mustRevalidate?: boolean;
}

// Default cache configuration
const DEFAULT_CACHE: CacheConfig = {
  maxAge: 300, // 5 menit
  staleWhileRevalidate: 60, // 1 menit
  mustRevalidate: false
};

// Fungsi untuk membuat cache headers
export function createCacheHeaders(config: CacheConfig = DEFAULT_CACHE): Record<string, string> {
  const headers: Record<string, string> = {};
  
  if (config.maxAge) {
    let cacheControl = `max-age=${config.maxAge}`;
    
    if (config.staleWhileRevalidate) {
      cacheControl += `, stale-while-revalidate=${config.staleWhileRevalidate}`;
    }
    
    if (config.mustRevalidate) {
      cacheControl += ', must-revalidate';
    }
    
    headers['Cache-Control'] = cacheControl;
  }
  
  return headers;
}

// Fungsi untuk membuat optimized response
export function createOptimizedResponse(
  data: any,
  options: {
    status?: number;
    cache?: CacheConfig;
    compress?: boolean;
  } = {}
): NextResponse {
  const { status = 200, cache, compress = true } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...createCacheHeaders(cache)
  };
  
  // Add compression headers if enabled
  if (compress) {
    headers['Vary'] = 'Accept-Encoding';
  }
  
  // Add security headers
  headers['X-Content-Type-Options'] = 'nosniff';
  headers['X-Frame-Options'] = 'DENY';
  headers['X-XSS-Protection'] = '1; mode=block';
  
  return NextResponse.json(data, {
    status,
    headers
  });
}

// Fungsi untuk error response yang dioptimalkan
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  const errorData = {
    success: false,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };
  
  return createOptimizedResponse(errorData, {
    status,
    cache: { maxAge: 0 } // Don't cache errors
  });
}

// Middleware untuk logging performance
export function withPerformanceLogging<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  name: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    
    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      
      // Log slow queries (> 1000ms)
      if (duration > 1000) {
        console.warn(`Slow ${name}: ${duration}ms`);
      } else {
        console.log(`${name}: ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Error in ${name} after ${duration}ms:`, error);
      throw error;
    }
  };
}

// Fungsi untuk validasi request
export function validateRequest(
  req: NextRequest,
  requiredFields: string[] = [],
  maxBodySize: number = 1024 * 1024 // 1MB default
): { isValid: boolean; error?: string } {
  // Check content length
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > maxBodySize) {
    return {
      isValid: false,
      error: `Request body too large. Maximum size: ${maxBodySize} bytes`
    };
  }
  
  // Check content type for POST/PUT requests
  const method = req.method;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {
        isValid: false,
        error: 'Content-Type must be application/json'
      };
    }
  }
  
  return { isValid: true };
}

// Fungsi untuk rate limiting sederhana
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean up old entries
  for (const [key, data] of requestCounts.entries()) {
    if (data.resetTime < now) {
      requestCounts.delete(key);
    }
  }
  
  const current = requestCounts.get(identifier);
  
  if (!current || current.resetTime < now) {
    // New window
    const resetTime = now + windowMs;
    requestCounts.set(identifier, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime
    };
  }
  
  if (current.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime
    };
  }
  
  current.count++;
  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetTime: current.resetTime
  };
}

// Wrapper untuk API routes dengan optimasi
export function withApiOptimization(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    rateLimit?: { maxRequests: number; windowMs: number };
    cache?: CacheConfig;
    validateBody?: string[];
    maxBodySize?: number;
  } = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    
    try {
      // Rate limiting
      if (options.rateLimit) {
        const forwarded = req.headers.get('x-forwarded-for');
        const clientIP = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
        const rateCheck = checkRateLimit(
          clientIP,
          options.rateLimit.maxRequests,
          options.rateLimit.windowMs
        );
        
        if (!rateCheck.allowed) {
          return createErrorResponse(
            'Too many requests',
            429,
            { resetTime: rateCheck.resetTime }
          );
        }
      }
      
      // Request validation
      const validation = validateRequest(req, options.validateBody, options.maxBodySize);
      if (!validation.isValid) {
        return createErrorResponse(validation.error!, 400);
      }
      
      // Execute handler with performance logging
      const result = await withPerformanceLogging(
        () => handler(req),
        `${req.method} ${req.nextUrl.pathname}`
      )();
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`API Error after ${duration}ms:`, error);
      
      return createErrorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        500
      );
    }
  };
}

// Fungsi untuk mengoptimalkan database queries
export function optimizeQuery(query: string): string {
  // Remove extra whitespace
  let optimized = query.replace(/\s+/g, ' ').trim();
  
  // Add LIMIT if not present for SELECT queries
  if (optimized.toUpperCase().startsWith('SELECT') && 
      !optimized.toUpperCase().includes('LIMIT') &&
      !optimized.toUpperCase().includes('COUNT(')) {
    optimized += ' LIMIT 1000'; // Default limit
  }
  
  return optimized;
}

// Fungsi untuk batch processing
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  delayMs: number = 0
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    // Add delay between batches if specified
    if (delayMs > 0 && i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}