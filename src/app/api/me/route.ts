import { verifyToken } from "@/utils/auth";
import { NextRequest, NextResponse } from "next/server";
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });

  const decoded = await verifyToken(token);
  if (!decoded) return NextResponse.json({ authenticated: false }, { status: 401 });
  
  try {
    // Get user data from database
    const result = await pool.query(`
      SELECT id, username, fullname, email, role, jabatan, photo 
      FROM tbl_user 
      WHERE id = $1
    `, [decoded.id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    const user = result.rows[0];
    
    return NextResponse.json({ 
      authenticated: true, 
      user: {
        id: user.id,
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        jabatan: user.jabatan,
        photo: user.photo
      }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}