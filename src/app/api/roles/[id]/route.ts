import { NextRequest, NextResponse } from "next/server";
import { getPool } from '@/lib/database';
import { verifyToken } from '@/utils/auth';

// GET - Fetch single role
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const roleId = parseInt(params.id);
    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT id, role as nama_role, created_at, updated_at
        FROM tbl_role
        WHERE id = $1
      `, [roleId]);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Role not found' }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true,
        role: result.rows[0] 
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Role GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update role
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const roleId = parseInt(params.id);
    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const body = await request.json();
    const { nama_role, description } = body;

    if (!nama_role || nama_role.trim() === '') {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      // Check if role exists
      const existingRole = await client.query(
        'SELECT id FROM tbl_role WHERE id = $1',
        [roleId]
      );

      if (existingRole.rows.length === 0) {
        return NextResponse.json({ error: 'Role not found' }, { status: 404 });
      }

      // Check if new name already exists (excluding current role)
      const duplicateRole = await client.query(
        'SELECT id FROM tbl_role WHERE role = $1 AND id != $2',
        [nama_role.trim(), roleId]
      );

      if (duplicateRole.rows.length > 0) {
        return NextResponse.json({ error: 'Role name already exists' }, { status: 400 });
      }

      // Update role
      const result = await client.query(`
        UPDATE tbl_role 
        SET role = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, role as nama_role, created_at, updated_at
      `, [nama_role.trim(), roleId]);

      return NextResponse.json({ 
        success: true,
        role: result.rows[0],
        message: 'Role updated successfully'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Role PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete role
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const roleId = parseInt(params.id);
    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      // Check if role exists
      const existingRole = await client.query(
        'SELECT id, role FROM tbl_role WHERE id = $1',
        [roleId]
      );

      if (existingRole.rows.length === 0) {
        return NextResponse.json({ error: 'Role not found' }, { status: 404 });
      }

      // Check if role is being used by any users
      const usersWithRole = await client.query(
        'SELECT COUNT(*) as count FROM tbl_user WHERE role = $1',
        [roleId]
      );

      if (parseInt(usersWithRole.rows[0].count) > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete role that is assigned to users' 
        }, { status: 400 });
      }

      // Delete role
      await client.query('DELETE FROM tbl_role WHERE id = $1', [roleId]);

      return NextResponse.json({ 
        success: true,
        message: 'Role deleted successfully'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Role DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
