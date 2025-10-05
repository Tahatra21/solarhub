import { NextRequest, NextResponse } from "next/server";
import { getPool } from '@/lib/database';
import { verifyToken } from '@/utils/auth';

// GET - Fetch all menu items for management
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
        SELECT 
          m.id,
          m.menu_key,
          m.menu_label,
          m.menu_path,
          m.icon_name,
          m.parent_menu_id,
          m.sort_order,
          m.is_active,
          parent.menu_label as parent_label
        FROM tbl_menu_items m
        LEFT JOIN tbl_menu_items parent ON m.parent_menu_id = parent.id
        ORDER BY m.sort_order
      `);

      return NextResponse.json({ menuItems: result.rows });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Menu items error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new menu item
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
    const { menu_key, menu_label, menu_path, icon_name, parent_menu_id, sort_order } = body;

    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query(`
        INSERT INTO tbl_menu_items (menu_key, menu_label, menu_path, icon_name, parent_menu_id, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [menu_key, menu_label, menu_path, icon_name, parent_menu_id || null, sort_order || 0]);

      return NextResponse.json({ menuItem: result.rows[0] });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create menu item error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
