import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/auth';
import { sanitizeString, validateFile } from '@/utils/validation';

/**
 * Security wrapper untuk API routes
 */
export function withSecurity(
  handler: (req: NextRequest, user?: any) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    allowedMethods?: string[];
    maxFileSize?: number;
  } = {}
) {
  return async (req: NextRequest) => {
    try {
      // Method validation
      if (options.allowedMethods && !options.allowedMethods.includes(req.method)) {
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        );
      }

      // Authentication check
      let user = null;
      if (options.requireAuth !== false) {
        const token = req.cookies.get('token')?.value;
        
        if (!token) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }

        user = await verifyToken(token);
        if (!user) {
          return NextResponse.json(
            { error: 'Invalid token' },
            { status: 401 }
          );
        }
      }

      // File validation untuk multipart requests
      if (req.headers.get('content-type')?.includes('multipart/form-data')) {
        const formData = await req.formData();
        const files = formData.getAll('file') as File[];
        
        for (const file of files) {
          if (file.size > 0) {
            const validation = validateFile(file);
            if (!validation.valid) {
              return NextResponse.json(
                { error: validation.error },
                { status: 400 }
              );
            }
          }
        }
      }

      // Call original handler
      return await handler(req, user);

    } catch (error) {
      console.error('Security wrapper error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Input sanitization middleware
 */
export function sanitizeRequestBody(req: NextRequest) {
  const contentType = req.headers.get('content-type');
  
  if (contentType?.includes('application/json')) {
    return req.json().then(body => {
      // Sanitize string fields
      const sanitized = JSON.parse(JSON.stringify(body), (key, value) => {
        if (typeof value === 'string') {
          return sanitizeString(value);
        }
        return value;
      });
      
      return sanitized;
    });
  }
  
  return Promise.resolve(null);
}

/**
 * CSRF protection
 */
export function validateCSRF(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  
  // Allow same-origin requests
  if (!origin && !referer) {
    return true; // Same-origin request
  }
  
  const allowedOrigins = [
    'http://localhost:3000',
    'https://yourdomain.com' // Replace with your domain
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    return true;
  }
  
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (allowedOrigins.includes(refererUrl.origin)) {
        return true;
      }
    } catch (e) {
      // Invalid referer URL
    }
  }
  
  return false;
}
