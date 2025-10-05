import { NextRequest, NextResponse } from "next/server";
import { getPool } from '@/lib/database';
import { verifyToken } from '@/utils/auth';

// GET - Fetch role permissions
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

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT 
          r.id as role_id,
          r.role as role_name,
          m.id as menu_item_id,
          m.menu_key,
          m.menu_label,
          m.menu_path,
          COALESCE(p.can_view, false) as can_view,
          COALESCE(p.can_create, false) as can_create,
          COALESCE(p.can_update, false) as can_update,
          COALESCE(p.can_delete, false) as can_delete
        FROM tbl_role r
        CROSS JOIN tbl_menu_items m
        LEFT JOIN tbl_role_menu_permissions p ON r.id = p.role_id AND m.id = p.menu_item_id
        WHERE r.id = $1 AND m.is_active = true
        ORDER BY m.sort_order
      `, [roleId]);

      return NextResponse.json({ permissions: result.rows });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Role permissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Update role permissions
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
    const { roleId, permissions } = body;

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete existing permissions for this role
      await client.query('DELETE FROM tbl_role_menu_permissions WHERE role_id = $1', [roleId]);

      // Insert new permissions
      for (const permission of permissions) {
        if (permission.can_view || permission.can_create || permission.can_update || permission.can_delete) {
          await client.query(`
            INSERT INTO tbl_role_menu_permissions (role_id, menu_item_id, can_view, can_create, can_update, can_delete)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            roleId,
            permission.menu_item_id,
            permission.can_view || false,
            permission.can_create || false,
            permission.can_update || false,
            permission.can_delete || false
          ]);
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({ success: true });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Update role permissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
