import { NextRequest, NextResponse } from 'next/server';

/**
 * Security middleware untuk menambahkan security headers
 * dan proteksi terhadap berbagai serangan
 */
export function securityMiddleware(req: NextRequest) {
  const response = NextResponse.next();
  
  // Security Headers
  const securityHeaders = {
    // Prevent XSS attacks
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline/eval
      "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    
    // Strict Transport Security (HTTPS only)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()'
    ].join(', '),
    
    // Remove server information
    'Server': '',
    
    // Cache control untuk sensitive data
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Rate limiting headers
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', '99');
  response.headers.set('X-RateLimit-Reset', Math.floor(Date.now() / 1000 + 60).toString());

  return response;
}

/**
 * CORS configuration untuk API routes
 */
export function corsMiddleware(req: NextRequest) {
  const response = NextResponse.next();
  
  const origin = req.headers.get('origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'https://yourdomain.com', // Replace with your production domain
  ];

  // CORS headers
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

/**
 * Input sanitization untuk mencegah injection attacks
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;]/g, '') // Remove semicolons
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * File upload validation
 */
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  // File size validation (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }

  // File type validation
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/svg+xml',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }

  // File name validation
  const dangerousPatterns = [
    /\.\./, // Path traversal
    /[<>:"|?*]/, // Invalid characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i // Reserved names
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(file.name)) {
      return { valid: false, error: 'Invalid file name' };
    }
  }

  return { valid: true };
}

/**
 * SQL injection prevention
 */
export function sanitizeSqlInput(input: string): string {
  // Remove SQL injection patterns
  return input
    .replace(/[';-]/g, '') // Remove quotes, semicolons, comments
    .replace(/union\s+select/gi, '') // Remove UNION SELECT
    .replace(/drop\s+table/gi, '') // Remove DROP TABLE
    .replace(/delete\s+from/gi, '') // Remove DELETE FROM
    .replace(/insert\s+into/gi, '') // Remove INSERT INTO
    .replace(/update\s+set/gi, '') // Remove UPDATE SET
    .trim();
}

/**
 * Rate limiting implementation
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean old entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < windowStart) {
      rateLimitMap.delete(key);
    }
  }
  
  const current = rateLimitMap.get(identifier);
  
  if (!current || current.resetTime < windowStart) {
    // New window
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs
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
