import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/utils/auth";
import { canAccessMenu, UserRole } from "@/utils/rbac";

/**
 * RBAC Middleware untuk Solution Architect HUB
 * Memvalidasi akses berdasarkan role user
 */
export function rbacMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Skip RBAC untuk public routes dan static files
  if (pathname.startsWith('/login') || 
      pathname.startsWith('/api/login') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon.ico') ||
      pathname.startsWith('/api/me') ||
      pathname.startsWith('/images') ||
      pathname.startsWith('/icons') ||
      pathname.startsWith('/fonts') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }

  // Get token dari cookie
  const token = req.cookies.get("token")?.value;
  
  if (!token) {
    // Redirect ke login jika tidak ada token
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  try {
    // Verify token dan get user info
    const decoded = verifyToken(token);
    
    if (!decoded) {
      console.log('❌ Invalid token');
      if (pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      return NextResponse.next();
    }

    // Check if role exists, if not, allow access but log warning
    if (!decoded.role) {
      console.log('⚠️ User has no role assigned, allowing access');
      return NextResponse.next();
    }

    // Check role-based access only for admin routes
    if (pathname.startsWith('/admin')) {
      const userRole = decoded.role;
      const hasAccess = canAccessMenu(userRole, pathname);

      if (!hasAccess) {
        console.log(`❌ Access denied for role ${userRole} to ${pathname}`);
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }

    // Add user role to headers for use in components
    const response = NextResponse.next();
    response.headers.set('x-user-role', decoded.role || '');
    response.headers.set('x-user-id', decoded.id?.toString() || '');
    response.headers.set('x-user-username', decoded.username || '');

    return response;

  } catch (error) {
    console.error('RBAC Middleware Error:', error);
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }
}

/**
 * API RBAC Middleware untuk melindungi API endpoints
 */
export function apiRbacMiddleware(req: NextRequest, requiredPermission?: string) {
  const token = req.cookies.get("token")?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.role) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check specific permission if required
    if (requiredPermission) {
      const { hasPermission } = require('@/utils/rbac');
      if (!hasPermission(decoded.role, requiredPermission)) {
        return NextResponse.json({ 
          error: 'Insufficient permissions',
          required: requiredPermission,
          current: decoded.role 
        }, { status: 403 });
      }
    }

    // Add user info to request headers
    const response = NextResponse.next();
    response.headers.set('x-user-role', decoded.role);
    response.headers.set('x-user-id', decoded.id?.toString() || '');
    response.headers.set('x-user-username', decoded.username || '');

    return response;

  } catch (error) {
    console.error('API RBAC Middleware Error:', error);
    return NextResponse.json({ error: 'Token verification failed' }, { status: 401 });
  }
}
