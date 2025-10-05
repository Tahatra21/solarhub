import { NextRequest, NextResponse } from "next/server";
import { getPool } from '@/lib/database';
import { verifyToken } from '@/utils/auth';

// GET - Fetch all roles
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT id, role as nama_role, created_at, updated_at
        FROM tbl_role
        ORDER BY id
      `);

      return NextResponse.json({ 
        success: true,
        roles: result.rows 
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Roles GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new role
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { nama_role, description } = body;

    if (!nama_role || nama_role.trim() === '') {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      // Check if role already exists
      const existingRole = await client.query(
        'SELECT id FROM tbl_role WHERE role = $1',
        [nama_role.trim()]
      );

      if (existingRole.rows.length > 0) {
        return NextResponse.json({ error: 'Role already exists' }, { status: 400 });
      }

      // Create new role
      const result = await client.query(`
        INSERT INTO tbl_role (role, created_at, updated_at)
        VALUES ($1, NOW(), NOW())
        RETURNING id, role as nama_role, created_at, updated_at
      `, [nama_role.trim()]);

      return NextResponse.json({ 
        success: true,
        role: result.rows[0],
        message: 'Role created successfully'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Role POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
