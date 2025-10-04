/**
 * Security Configuration untuk aplikasi SolarHub
 */
export const securityConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: '24h',
    algorithm: 'HS256'
  },

  // CORS Configuration
  cors: {
    allowedOrigins: [
      'http://localhost:3000',
      'https://yourdomain.com', // Replace with your production domain
      'https://www.yourdomain.com'
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // File Upload Security
  fileUpload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/svg+xml',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ],
    uploadDirectory: process.env.UPLOAD_DIRECTORY || '/tmp/uploads'
  },

  // Security Headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  },

  // Content Security Policy
  csp: {
    'default-src': "'self'",
    'script-src': "'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires this
    'style-src': "'self' 'unsafe-inline'", // Tailwind requires this
    'img-src': "'self' data: blob:",
    'font-src': "'self'",
    'connect-src': "'self'",
    'frame-ancestors': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'"
  },

  // Password Requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    maxLength: 100
  },

  // Session Configuration
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  },

  // Database Security
  database: {
    connectionTimeout: 10000, // 10 seconds
    queryTimeout: 30000, // 30 seconds
    maxConnections: 20,
    ssl: process.env.NODE_ENV === 'production'
  },

  // Logging Configuration
  logging: {
    logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
    logFile: process.env.LOG_FILE || 'logs/app.log',
    maxLogSize: 10 * 1024 * 1024, // 10MB
    maxLogFiles: 5
  }
};

/**
 * Validate security configuration
 */
export function validateSecurityConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check JWT secret
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  // Check database URL
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  // Check allowed origins
  if (securityConfig.cors.allowedOrigins.length === 0) {
    errors.push('At least one allowed origin must be configured');
  }

  // Check file upload directory
  if (!securityConfig.fileUpload.uploadDirectory) {
    errors.push('Upload directory must be configured');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get security headers as object
 */
export function getSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...securityConfig.headers };
  
  // Add CSP header
  const cspString = Object.entries(securityConfig.csp)
    .map(([key, value]) => `${key} ${value}`)
    .join('; ');
  
  headers['Content-Security-Policy'] = cspString;
  
  return headers;
}
