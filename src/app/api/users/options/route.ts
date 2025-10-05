import { NextRequest, NextResponse } from "next/server";
import { getPool } from '@/lib/database';
import { verifyToken } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await getPool().connect();
    try {
      // Get roles
      const rolesResult = await client.query('SELECT id, role FROM public.tbl_role ORDER BY role');
      
      // Get jabatan
      const jabatanResult = await client.query('SELECT id, jabatan FROM public.tbl_jabatan ORDER BY jabatan');

      return NextResponse.json({
        roles: rolesResult.rows,
        jabatan: jabatanResult.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
