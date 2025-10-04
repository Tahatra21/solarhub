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
    const corp = searchParams.get('corp') || '';
    const tahapan = searchParams.get('tahapan') || '';
    const organisasi = searchParams.get('organisasi') || '';
    const tahun = searchParams.get('tahun') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (search) {
      whereConditions.push(`(
        nama_aplikasi ILIKE $${paramIndex} OR 
        judul_change_request ILIKE $${paramIndex + 1} OR
        manager_pic ILIKE $${paramIndex + 2}
      )`);
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      paramIndex += 3;
    }
    
    if (jenis) {
      whereConditions.push(`jenis = $${paramIndex}`);
      queryParams.push(jenis);
      paramIndex++;
    }
    
    if (corp) {
      whereConditions.push(`corp = $${paramIndex}`);
      queryParams.push(corp);
      paramIndex++;
    }
    
    if (tahapan) {
      whereConditions.push(`tahapan = $${paramIndex}`);
      queryParams.push(tahapan);
      paramIndex++;
    }
    
    if (organisasi) {
      whereConditions.push(`organisasi = $${paramIndex}`);
      queryParams.push(organisasi);
      paramIndex++;
    }
    
    if (tahun) {
      whereConditions.push(`tahun = $${paramIndex}`);
      queryParams.push(parseInt(tahun));
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM tbl_crjr ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get data with pagination
    const dataQuery = `
      SELECT * FROM tbl_crjr 
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
    console.error('Error fetching CR/JR data:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch CR/JR data',
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
    const requiredFields = ['jenis', 'nama_aplikasi', 'judul_change_request'];
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
      INSERT INTO tbl_crjr (
        no, jenis, corp, sub_bidang, nama_aplikasi, judul_change_request,
        nomor_surat_penugasan, manager_pic, tanggal_surat_sti, tahapan,
        organisasi, tahun, january, february, march, april, may, june,
        july, august, september, october, november, december,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW()
      ) RETURNING *
    `;

    const values = [
      body.no || null,
      body.jenis,
      body.corp || null,
      body.sub_bidang || null,
      body.nama_aplikasi,
      body.judul_change_request,
      body.nomor_surat_penugasan || null,
      body.manager_pic || null,
      body.tanggal_surat_sti || null,
      body.tahapan || null,
      body.organisasi || null,
      body.tahun || new Date().getFullYear(),
      body.january || 0,
      body.february || 0,
      body.march || 0,
      body.april || 0,
      body.may || 0,
      body.june || 0,
      body.july || 0,
      body.august || 0,
      body.september || 0,
      body.october || 0,
      body.november || 0,
      body.december || 0
    ];

    const result = await pool.query(insertQuery, values);

    return NextResponse.json({
      success: true,
      message: 'CR/JR created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating CR/JR:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create CR/JR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
