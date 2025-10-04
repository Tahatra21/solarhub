import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/utils/auth";
import { securityMiddleware, corsMiddleware, rateLimit } from "@/middleware/security";
// Import env validator untuk memastikan environment variables valid
import "@/lib/env";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Apply security middleware untuk semua request
  let response = securityMiddleware(req);
  
  // Apply CORS untuk API routes
  if (pathname.startsWith("/api")) {
    response = corsMiddleware(req);
    
    // Rate limiting untuk API routes
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
    
    const rateLimitResult = rateLimit(clientIP, 100, 60000); // 100 requests per minute
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000) },
        { status: 429 }
      );
    }
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString());
  }

  const token = req.cookies.get("token")?.value;
  let user = null;

  if (token) {
    try {
      user = await verifyToken(token);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Token verification failed:', err);
      }
      user = null;
    }
  }

  // Jika mengakses halaman admin tanpa login, redirect ke login
  if (pathname.startsWith("/admin") && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Jika mengakses login dan sudah login, redirect ke halaman terakhir atau admin
  if (pathname.startsWith("/login") && user) {
    // Ambil halaman terakhir dari cookie atau header referer
    const lastPage = req.cookies.get("lastAdminPage")?.value;
    const referer = req.headers.get("referer");
    
    let redirectUrl = "/admin"; // default
    
    // Prioritas: cookie lastAdminPage > referer yang valid
    if (lastPage && lastPage.startsWith("/admin")) {
      redirectUrl = lastPage;
    } else if (referer) {
      const refererUrl = new URL(referer);
      if (refererUrl.pathname.startsWith("/admin")) {
        redirectUrl = refererUrl.pathname;
      }
    }
    
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  // Simpan halaman admin yang diakses ke cookie untuk referensi nanti
  if (pathname.startsWith("/admin") && user) {
    response.cookies.set("lastAdminPage", pathname, {
      maxAge: 60 * 60 * 24, // 24 jam
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" // Changed to strict for better security
    });
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*", 
    "/login",
    "/api/:path*"
  ],
};