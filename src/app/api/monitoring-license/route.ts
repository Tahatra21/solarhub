import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

export async function GET(request: NextRequest) {
  const pool = getPool();
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const jenis = searchParams.get('jenis') || '';
    const comp = searchParams.get('comp') || '';
    const bpo = searchParams.get('bpo') || '';
    const period = searchParams.get('period') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (search) {
      whereConditions.push(`(
        nama ILIKE $${paramIndex} OR 
        comp ILIKE $${paramIndex + 1} OR
        bpo ILIKE $${paramIndex + 2}
      )`);
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      paramIndex += 3;
    }
    
    if (jenis) {
      whereConditions.push(`jenis = $${paramIndex}`);
      queryParams.push(jenis);
      paramIndex++;
    }
    
    if (comp) {
      whereConditions.push(`comp = $${paramIndex}`);
      queryParams.push(comp);
      paramIndex++;
    }
    
    if (bpo) {
      whereConditions.push(`bpo = $${paramIndex}`);
      queryParams.push(bpo);
      paramIndex++;
    }
    
    if (period) {
      whereConditions.push(`period = $${paramIndex}`);
      queryParams.push(period);
      paramIndex++;
    }
    
    // Handle status filter based on end_date
    if (status && status !== 'All') {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysFromNowStr = thirtyDaysFromNow.toISOString().split('T')[0];
      
      if (status === 'Active') {
        whereConditions.push(`end_date > $${paramIndex}`);
        queryParams.push(today);
        paramIndex++;
      } else if (status === 'Expiring') {
        whereConditions.push(`end_date > $${paramIndex} AND end_date <= $${paramIndex + 1}`);
        queryParams.push(today, thirtyDaysFromNowStr);
        paramIndex += 2;
      } else if (status === 'Expired') {
        whereConditions.push(`end_date < $${paramIndex}`);
        queryParams.push(today);
        paramIndex++;
      }
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM tbl_mon_licenses ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get data with pagination
    const dataQuery = `
      SELECT * FROM tbl_mon_licenses 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const dataParams = [...queryParams, limit, offset];
    const dataResult = await pool.query(dataQuery, dataParams);
    
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Error fetching license data:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch license data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const pool = getPool();
  
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['nama', 'comp', 'bpo', 'jenis', 'period', 'qty', 'unit_price'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields',
          details: `Required fields: ${missingFields.join(', ')}`
        },
        { status: 400 }
      );
    }

    const insertQuery = `
      INSERT INTO tbl_mon_licenses (
        nama, comp, bpo, jenis, period, qty, symbol, unit_price, 
        total_price, selling_price, cont_serv_month, cont_period, start_date, end_date, met_puch, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      ) RETURNING *
    `;

    const values = [
      body.nama,
      body.comp,
      body.bpo,
      body.jenis,
      body.period,
      parseInt(body.qty),
      body.symbol || 'Rp',
      parseFloat(body.unit_price),
      parseFloat(body.total_price) || (parseInt(body.qty) * parseFloat(body.unit_price)),
      parseFloat(body.selling_price) || 0,
      parseInt(body.cont_serv_month) || 0,
      body.cont_period || '',
      body.start_date || null,
      body.end_date || null,
      body.met_puch || ''
    ];

    const result = await pool.query(insertQuery, values);

    return NextResponse.json({
      success: true,
      message: 'License created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating license:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create license',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
