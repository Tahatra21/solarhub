import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { generateToken } from "@/utils/auth";
import { getDbClient, isDbConnected, testConnection } from '@/lib/database';
import { logActivity } from '@/utils/activityLogger';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ 
        success: false, 
        message: "Username dan password harus diisi" 
      }, { status: 400 });
    }

    // Check database connection first
    if (!isDbConnected()) {
      const connectionTest = await testConnection();
      if (!connectionTest) {
        return NextResponse.json({ 
          success: false, 
          message: "Database tidak tersedia. Silakan coba lagi nanti." 
        }, { status: 503 });
      }
    }

    const client = await getDbClient();
    
    try {
      const result = await client.query(
        `SELECT a.id, a.username, a.password, a.fullname, a.email, a.photo, b.role, c.jabatan 
         FROM public.tbl_user as a
         JOIN public.tbl_role as b ON a.role = b.id
         JOIN public.tbl_jabatan as c ON a.jabatan = c.id
         WHERE a.username = $1 LIMIT 1`,
        [username]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: "Username atau password salah" 
        }, { status: 401 });
      }

      const user = result.rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return NextResponse.json({ 
          success: false, 
          message: "Username atau password salah" 
        }, { status: 401 });
      }

      // Generate JWT token
      const token = await generateToken({ 
        username: user.username, 
        role: user.role 
      });

      // Log login activity - disabled due to missing tbl_activity_log table
      // await logActivity({
      //   userId: user.id,
      //   username: user.username,
      //   activityType: 'login',
      //   activityDescription: 'User berhasil login',
      //   ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      //   userAgent: req.headers.get('user-agent') || 'unknown'
      // });

      const response = NextResponse.json({ 
        success: true, 
        message: "Login berhasil",
        user: {
          username: user.username,
          fullname: user.fullname,
          email: user.email,
          photo: user.photo,
          role: user.role,
          jabatan: user.jabatan
        }
      });

      // Set cookie
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 // 24 hours
      });

      return response;

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Login error:', error);
    
    // Handle specific database connection errors
    if (error.message?.includes('Database connection unavailable') || 
        error.code === 'ECONNREFUSED' || 
        error.code === 'ECONNRESET') {
      return NextResponse.json({ 
        success: false, 
        message: "Database tidak tersedia. Silakan coba lagi nanti." 
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: "Terjadi kesalahan server" 
    }, { status: 500 });
  }
}