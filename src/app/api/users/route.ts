import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/utils/auth";
import { getPool } from '@/lib/database';
import { QueryResult } from 'pg';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const token = req.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ success: false, message: "Token tidak ditemukan" }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: "Token tidak valid" }, { status: 401 });
    }

    const pool = getPool();
    
    // Optimized query with index hints
    const queryPromise = pool.query(
      `SELECT a.username, a.fullname, a.email, a.photo, b.role, c.jabatan 
      FROM public.tbl_user a
      INNER JOIN public.tbl_role b ON a.role = b.id
      INNER JOIN public.tbl_jabatan c ON a.jabatan = c.id
      WHERE a.username = $1 LIMIT 1`,
      [decoded.username]
    );
    
    // Reduce timeout to 1 second
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout after 1s')), 1000)
    );
    
    const result = await Promise.race([queryPromise, timeoutPromise]) as QueryResult<any>;
    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ success: false, message: "User tidak ditemukan" }, { status: 404 });
    }

    const duration = Date.now() - startTime;
    console.log(`✅ GET /api/users: ${duration}ms`);

    const response = NextResponse.json({ 
      success: true, 
      user: {
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        photo: user.photo,
        role: user.role,
        jabatan: user.jabatan
      }
    });

    // Add caching headers for user data
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    
    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Fix: Type assertion untuk error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ GET /api/users error (${duration}ms):`, errorMessage);
    
    return NextResponse.json(
      { success: false, message: "Database timeout atau connection error" }, 
      { status: 500 }
    );
  }
}