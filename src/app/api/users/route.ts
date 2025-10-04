import { NextRequest, NextResponse } from "next/server";
import { getPool } from '@/lib/database';
import { verifyToken } from '@/utils/auth';
import bcrypt from 'bcryptjs';

// GET - Fetch single user
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const client = await getPool().connect();
    try {
      const result = await client.query(`
        SELECT 
          a.id, a.username, a.fullname, a.email, a.photo, a.password,
          b.role, c.jabatan 
        FROM public.tbl_user as a
        JOIN public.tbl_role as b ON a.role = b.id
        JOIN public.tbl_jabatan as c ON a.jabatan = c.id
        WHERE a.id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const user = result.rows[0];
      // Remove password from response
      delete user.password;

      return NextResponse.json({ user });
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

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { username, fullname, email, password, role, jabatan } = body;

    // Validation
    if (!username || !fullname || !email || !password) {
      return NextResponse.json({ error: 'Username, fullname, email, and password are required' }, { status: 400 });
    }

    const client = await getPool().connect();
    try {
      // Check if username already exists
      const existingUser = await client.query('SELECT id FROM public.tbl_user WHERE username = $1', [username]);
      if (existingUser.rows.length > 0) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
      }

      // Check if email already exists
      const existingEmail = await client.query('SELECT id FROM public.tbl_user WHERE email = $1', [email]);
      if (existingEmail.rows.length > 0) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      const result = await client.query(`
        INSERT INTO public.tbl_user (username, fullname, email, password, role, jabatan)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, username, fullname, email, role, jabatan
      `, [username, fullname, email, hashedPassword, role || 2, jabatan || 1]);

      return NextResponse.json({ 
        success: true, 
        message: 'User created successfully',
        user: result.rows[0]
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

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const token = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, username, fullname, email, password, role, jabatan } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const client = await getPool().connect();
    try {
      // Check if user exists
      const existingUser = await client.query('SELECT id FROM public.tbl_user WHERE id = $1', [id]);
      if (existingUser.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check if username already exists (excluding current user)
      if (username) {
        const existingUsername = await client.query('SELECT id FROM public.tbl_user WHERE username = $1 AND id != $2', [username, id]);
        if (existingUsername.rows.length > 0) {
          return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
        }
      }

      // Check if email already exists (excluding current user)
      if (email) {
        const existingEmail = await client.query('SELECT id FROM public.tbl_user WHERE email = $1 AND id != $2', [email, id]);
        if (existingEmail.rows.length > 0) {
          return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (username) {
        updateFields.push(`username = $${paramCount++}`);
        updateValues.push(username);
      }
      if (fullname) {
        updateFields.push(`fullname = $${paramCount++}`);
        updateValues.push(fullname);
      }
      if (email) {
        updateFields.push(`email = $${paramCount++}`);
        updateValues.push(email);
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push(`password = $${paramCount++}`);
        updateValues.push(hashedPassword);
      }
      if (role) {
        updateFields.push(`role = $${paramCount++}`);
        updateValues.push(role);
      }
      if (jabatan) {
        updateFields.push(`jabatan = $${paramCount++}`);
        updateValues.push(jabatan);
      }

      if (updateFields.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      const query = `
        UPDATE public.tbl_user 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, username, fullname, email, role, jabatan
      `;

      const result = await client.query(query, updateValues);

      return NextResponse.json({ 
        success: true, 
        message: 'User updated successfully',
        user: result.rows[0]
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

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const token = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent deleting admin user
    if (userId === '1') {
      return NextResponse.json({ error: 'Cannot delete admin user' }, { status: 400 });
    }

    const client = await getPool().connect();
    try {
      // Check if user exists
      const existingUser = await client.query('SELECT id, username FROM public.tbl_user WHERE id = $1', [userId]);
      if (existingUser.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Delete user
      await client.query('DELETE FROM public.tbl_user WHERE id = $1', [userId]);

      return NextResponse.json({ 
        success: true, 
        message: 'User deleted successfully'
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