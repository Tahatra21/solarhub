import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/database';

export async function GET(request: NextRequest) {
  let client;
  
  try {
    client = await getDbClient();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (search) {
      whereConditions.push(`(c.nama_produk ILIKE $${paramIndex} OR c.deskripsi ILIKE $${paramIndex + 1})`);
      queryParams.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }
    
    if (status && status !== 'all') {
      whereConditions.push(`c.status ILIKE $${paramIndex}`);
      queryParams.push(`%${status}%`);
      paramIndex++;
    }
    
    if (type && type !== 'all') {
      whereConditions.push(`c.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    console.log('CRJR Query conditions:', { search, status, type, whereClause });
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM tbl_mon_crjr c
      LEFT JOIN tbl_produk p ON c.produk_id = p.id
      ${whereClause}
    `;
    const countResult = await client.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get data with pagination
    const dataQuery = `
      SELECT 
        c.*,
        p.nama_produk as produk_nama,
        p.deskripsi as produk_deskripsi
      FROM tbl_mon_crjr c
      LEFT JOIN tbl_produk p ON c.produk_id = p.id
      ${whereClause}
      ORDER BY c.created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    
    console.log('CRJR Data query:', dataQuery);
    console.log('CRJR Query params:', queryParams);
    
    const result = await client.query(dataQuery, queryParams);
    
    return NextResponse.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching CRJR data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CRJR data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function POST(request: NextRequest) {
  let client;
  
  try {
    client = await getDbClient();
    const body = await request.json();
    
    const {
      id_produk,
      tipe_pekerjaan,
      tanggal_mulai,
      tanggal_akhir,
      version,
      deskripsi,
      status,
      progress,
      pic,
      priority
    } = body;
    
    // Validate required fields
    if (!tipe_pekerjaan || !deskripsi || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: tipe_pekerjaan, deskripsi, status' },
        { status: 400 }
      );
    }
    
    const query = `
      INSERT INTO tbl_mon_crjr (
        id_produk, tipe_pekerjaan, tanggal_mulai, tanggal_akhir,
        version, deskripsi, status, progress, pic, priority,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      id_produk || null,
      tipe_pekerjaan,
      tanggal_mulai || null,
      tanggal_akhir || null,
      version || null,
      deskripsi,
      status,
      progress || 0,
      pic || null,
      priority || 'Medium'
    ];
    
    const result = await client.query(query, values);
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'CR/JR created successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Database error in POST CR/JR:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create CR/JR', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function PUT(request: NextRequest) {
  let client;
  
  try {
    client = await getDbClient();
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'CR/JR ID is required' },
        { status: 400 }
      );
    }
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    updateFields.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE tbl_mon_crjr 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'CR/JR not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'CR/JR updated successfully'
    });
    
  } catch (error) {
    console.error('Database error in PUT CR/JR:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update CR/JR', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function DELETE(request: NextRequest) {
  let client;
  
  try {
    client = await getDbClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'CR/JR ID is required' },
        { status: 400 }
      );
    }
    
    const query = 'DELETE FROM tbl_mon_crjr WHERE id = $1 RETURNING *';
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'CR/JR not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'CR/JR deleted successfully'
    });
    
  } catch (error) {
    console.error('Database error in DELETE CR/JR:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete CR/JR', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}